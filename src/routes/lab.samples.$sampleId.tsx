import { SplitText } from "@/components/ui/split-text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STAGE_LABEL, nextSampleStage, orderStageForSample } from "@/lib/stages";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Camera, AlertTriangle, CheckCircle2, XCircle, History } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";

export const Route = createFileRoute("/lab/samples/$sampleId")({
  component: () => <RoleGuard allow={["lab", "admin"]}><SampleDetail /></RoleGuard>,
});

const NAV = [
  { to: "/lab", label: "Queue" },
  { to: "/lab/scan", label: "Scan QR" },
];

function SampleDetail() {
  const { sampleId } = Route.useParams();
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [sample, setSample] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, { value: string; passed: boolean | null }>>({});
  const [evidence, setEvidence] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportKind, setReportKind] = useState<"report" | "external_cert">("report");
  const [uploadingReport, setUploadingReport] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  // Intake form state
  const [weight, setWeight] = useState("");
  const [condition, setCondition] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  async function load() {
    const { data: s } = await supabase.from("order_samples").select("*").eq("id", sampleId).single();
    setSample(s);
    if (s) {
      const { data: o } = await supabase.from("orders").select("*").eq("id", s.order_id).single();
      setOrder(o);
      if (s.template_id) {
        const { data: p } = await supabase
          .from("test_parameters").select("*").eq("template_id", s.template_id).order("sort_order");
        setParameters(p ?? []);
      }
      const { data: r } = await supabase.from("test_results").select("*").eq("sample_id", s.id);
      const map: Record<string, { value: string; passed: boolean | null }> = {};
      (r ?? []).forEach((row) => {
        map[row.parameter_id] = { value: String(row.value ?? ""), passed: row.passed };
      });
      setResults(map);
      const { data: ev } = await supabase
        .from("attachments").select("*").eq("sample_id", s.id).eq("kind", "evidence");
      setEvidence(ev ?? []);
      const { data: rep } = await supabase
        .from("attachments").select("*").eq("sample_id", s.id).in("kind", ["report", "external_cert"]).order("created_at", { ascending: false });
      setReports(rep ?? []);
      const { data: coc } = await supabase
        .from("chain_of_custody_events").select("*")
        .or(`sample_id.eq.${s.id},and(order_id.eq.${s.order_id},sample_id.is.null)`)
        .order("created_at");
      setEvents(coc ?? []);
      setWeight(s.intake_weight_g ? String(s.intake_weight_g) : "");
      setCondition(s.intake_condition ?? "");
      setIntakeNotes(s.intake_notes ?? "");
    }
  }

  useEffect(() => { load(); }, [sampleId]);

  async function uploadEvidencePhoto(): Promise<string | null> {
    if (!photo || !sample || !user) return null;
    const path = `${sample.order_id}/${sample.id}/intake-${Date.now()}-${photo.name}`;
    const { error } = await supabase.storage.from("evidence").upload(path, photo);
    if (error) {
      toast.error("Photo upload failed: " + error.message);
      return null;
    }
    await supabase.from("attachments").insert({
      kind: "evidence",
      bucket: "evidence",
      path,
      filename: photo.name,
      uploaded_by: user.id,
      order_id: sample.order_id,
      sample_id: sample.id,
    });
    return path;
  }

  async function performIntake(disposition: "accepted" | "on_hold" | "rejected") {
    if (!sample || !user) return;
    if (sample.stage !== "pending") return toast.error("Intake already completed");
    if (!weight || !condition) return toast.error("Weight and condition required");
    setBusy(true);
    try {
      await uploadEvidencePhoto();
      const newStage =
        disposition === "accepted" ? "received" : disposition === "rejected" ? "rejected" : "pending";
      await supabase.from("order_samples").update({
        stage: newStage,
        intake_weight_g: parseFloat(weight) || null,
        intake_condition: condition,
        intake_notes: intakeNotes || null,
        intake_disposition: disposition,
        intake_by: user.id,
        intake_at: new Date().toISOString(),
      }).eq("id", sample.id);

      await supabase.from("chain_of_custody_events").insert({
        order_id: sample.order_id,
        sample_id: sample.id,
        actor_id: user.id,
        event_type: "intake",
        description: `Intake ${disposition} · ${weight}g · ${condition}`,
        metadata: { weight_g: weight, condition, notes: intakeNotes, disposition },
      });

      if (disposition === "on_hold" || disposition === "rejected") {
        await supabase.from("exceptions").insert({
          order_id: sample.order_id,
          sample_id: sample.id,
          raised_by: user.id,
          reason: `Intake ${disposition}: ${condition}${intakeNotes ? " — " + intakeNotes : ""}`,
        });
      }

      if (disposition === "accepted") {
        await supabase.from("orders").update({ stage: "received_at_lab" }).eq("id", sample.order_id);
      }

      toast.success(`Intake ${disposition}`);
      setPhoto(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function advance() {
    if (!sample || !user) return;
    const next = nextSampleStage(sample.stage);
    if (!next) return;

    // Step 5 spec: release is admin-controlled
    if (next === "released" && !isAdmin) {
      return toast.error("Only an Admin can release reports.");
    }
    // QA verification: prevent same person from QA-verifying their own work
    if (sample.stage === "qa_review" && sample.intake_by === user.id && !isAdmin) {
      return toast.error("Separation of duties: another lab member must verify.");
    }

    setBusy(true);
    const updates: any = { stage: next };
    if (next === "ready_for_release") {
      updates.qa_verified_by = user.id;
      updates.qa_verified_at = new Date().toISOString();
    }
    await supabase.from("order_samples").update(updates).eq("id", sample.id);
    await supabase.from("chain_of_custody_events").insert({
      order_id: sample.order_id,
      sample_id: sample.id,
      actor_id: user.id,
      event_type: "stage_change",
      description: `${STAGE_LABEL[sample.stage]} → ${STAGE_LABEL[next]}`,
    });

    const mapped = orderStageForSample(next);
    if (mapped) {
      const orderUpdate: any = { stage: mapped };
      if (next === "released") {
        orderUpdate.released_by = user.id;
        orderUpdate.released_at = new Date().toISOString();
      }
      await supabase.from("orders").update(orderUpdate).eq("id", sample.order_id);
    }
    setBusy(false);
    toast.success(`Stage → ${STAGE_LABEL[next]}`);
    load();
  }

  async function saveResult(paramId: string) {
    const r = results[paramId];
    if (!r || !user) return;
    const param = parameters.find((p) => p.id === paramId);
    const num = parseFloat(r.value);
    let passed: boolean | null = null;
    if (!isNaN(num) && param) {
      const okMin = param.min_value == null || num >= Number(param.min_value);
      const okMax = param.max_value == null || num <= Number(param.max_value);
      passed = okMin && okMax;
    }
    await supabase.from("test_results").upsert(
      { sample_id: sampleId, parameter_id: paramId, value: isNaN(num) ? null : num, passed, entered_by: user.id },
      { onConflict: "sample_id,parameter_id" } as any,
    );
    setResults((p) => ({ ...p, [paramId]: { ...r, passed } }));
    toast.success("Saved");
  }

  async function uploadReport() {
    if (!reportFile || !sample || !user) return;
    setUploadingReport(true);
    try {
      const path = `${sample.order_id}/${sample.id}/${reportKind}-${Date.now()}-${reportFile.name}`;
      const { error } = await supabase.storage.from("reports").upload(path, reportFile);
      if (error) { toast.error("Upload failed: " + error.message); return; }
      const { error: insErr } = await supabase.from("attachments").insert({
        kind: reportKind, bucket: "reports", path, filename: reportFile.name,
        uploaded_by: user.id, order_id: sample.order_id, sample_id: sample.id,
      });
      if (insErr) { toast.error("Save failed: " + insErr.message); return; }
      await supabase.from("chain_of_custody_events").insert({
        order_id: sample.order_id, sample_id: sample.id, actor_id: user.id,
        event_type: "report_uploaded",
        description: `${reportKind === "report" ? "Lab report" : "External certificate"} uploaded: ${reportFile.name}`,
      });
      toast.success("Uploaded");
      setReportFile(null);
      load();
    } finally { setUploadingReport(false); }
  }

  async function downloadReport(att: any) {
    const { data, error } = await supabase.storage.from(att.bucket).createSignedUrl(att.path, 60);
    if (error || !data) return toast.error("Could not generate link");
    window.open(data.signedUrl, "_blank");
  }

  async function deleteReport(att: any) {
    if (!confirm("Delete this file?")) return;
    await supabase.storage.from(att.bucket).remove([att.path]);
    await supabase.from("attachments").delete().eq("id", att.id);
    toast.success("Deleted");
    load();
  }

  if (!sample) return <PortalShell title="Lab Workspace" nav={NAV} requireRole="lab">Loading…</PortalShell>;

  const next = nextSampleStage(sample.stage);
  const showIntake = sample.stage === "pending";

  return (
    <PortalShell title="Lab Workspace" nav={NAV} requireRole="lab">
      <Link to="/lab" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />Back to queue
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold"><SplitText>{sample.sample_label}</SplitText></h1>
          <p className="text-sm text-muted-foreground">
            Order {order?.order_number} · QR <span className="font-mono">{sample.qr_code}</span>
          </p>
          {(sample.batch_no || sample.origin || sample.composition) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {sample.batch_no && <>Batch: <b>{sample.batch_no}</b> · </>}
              {sample.origin && <>Origin: <b>{sample.origin}</b> · </>}
              {sample.composition && <>Composition: <b>{sample.composition}</b></>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge>{STAGE_LABEL[sample.stage]}</Badge>
          {next && !showIntake && (
            <Button onClick={advance} disabled={busy}>
              {sample.stage === "qa_review" && <ShieldCheck className="mr-2 h-4 w-4" />}
              Advance → {STAGE_LABEL[next]}
              {next === "released" && !isAdmin && " (Admin only)"}
            </Button>
          )}
        </div>
      </div>

      {showIntake && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Lab intake — chain-of-custody
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Verify identity (QR scan), record weight & packaging condition, capture an evidence photo, and choose a disposition.
            Required before testing can begin.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Weight (grams) *</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 250" />
            </div>
            <div>
              <Label>Packaging condition *</Label>
              <Input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Sealed / leaking / damaged / tampered" />
            </div>
            <div className="md:col-span-2">
              <Label>Notes (optional)</Label>
              <Textarea value={intakeNotes} onChange={(e) => setIntakeNotes(e.target.value)} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> Evidence photo (recommended)</Label>
              <Input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => performIntake("accepted")} disabled={busy}>
              <CheckCircle2 className="mr-2 h-4 w-4" />Accept
            </Button>
            <Button variant="outline" onClick={() => performIntake("on_hold")} disabled={busy}>
              <AlertTriangle className="mr-2 h-4 w-4" />On hold
            </Button>
            <Button variant="destructive" onClick={() => performIntake("rejected")} disabled={busy}>
              <XCircle className="mr-2 h-4 w-4" />Reject
            </Button>
          </div>
        </Card>
      )}

      {sample.intake_at && (
        <Card className="mb-6 p-4 text-sm">
          <h3 className="mb-2 font-semibold">Intake record</h3>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground md:grid-cols-4">
            <div>Disposition: <b className="text-foreground">{sample.intake_disposition}</b></div>
            <div>Weight: <b className="text-foreground">{sample.intake_weight_g}g</b></div>
            <div>Condition: <b className="text-foreground">{sample.intake_condition}</b></div>
            <div>At: <b className="text-foreground">{new Date(sample.intake_at).toLocaleString()}</b></div>
          </div>
          {sample.intake_notes && <p className="mt-2 text-xs">{sample.intake_notes}</p>}
          {evidence.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              Evidence: {evidence.length} file(s) attached
            </div>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Test results</h2>
        {parameters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No structured template assigned. Attach an external certificate via the order page.</p>
        ) : (
          <div className="space-y-3">
            {parameters.map((p) => {
              const r = results[p.id] ?? { value: "", passed: null };
              return (
                <div key={p.id} className="grid grid-cols-12 items-end gap-2">
                  <div className="col-span-5">
                    <Label>{p.name}{p.unit ? ` (${p.unit})` : ""}</Label>
                    <p className="text-xs text-muted-foreground">
                      Range: {p.min_value ?? "—"} to {p.max_value ?? "—"}
                    </p>
                  </div>
                  <Input
                    className="col-span-3"
                    value={r.value}
                    onChange={(e) => setResults((s) => ({ ...s, [p.id]: { ...r, value: e.target.value } }))}
                    disabled={sample.stage === "released" || sample.stage === "ready_for_release"}
                  />
                  <div className="col-span-2">
                    {r.passed === true && <Badge>Pass</Badge>}
                    {r.passed === false && <Badge variant="destructive">Fail</Badge>}
                  </div>
                  <Button className="col-span-2" variant="outline" onClick={() => saveResult(p.id)}
                    disabled={sample.stage === "released" || sample.stage === "ready_for_release"}>
                    Save
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="mb-1 font-semibold">Test result files</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Upload the official lab report (PDF) or an external certificate (CoA, MSDS, third-party report). Files are stored securely and visible to the customer once the report is released.
        </p>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
          <div>
            <Label>File</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
              disabled={uploadingReport}
            />
          </div>
          <div>
            <Label>Type</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={reportKind}
              onChange={(e) => setReportKind(e.target.value as "report" | "external_cert")}
              disabled={uploadingReport}
            >
              <option value="report">Lab report</option>
              <option value="external_cert">External certificate</option>
            </select>
          </div>
          <Button onClick={uploadReport} disabled={!reportFile || uploadingReport}>
            {uploadingReport ? "Uploading…" : "Upload"}
          </Button>
        </div>

        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {reports.map((att) => (
              <div key={att.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{att.filename ?? att.path.split("/").pop()}</div>
                  <div className="text-xs text-muted-foreground">
                    {att.kind === "report" ? "Lab report" : "External certificate"} · {new Date(att.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadReport(att)}>Open</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteReport(att)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PortalShell>
  );
}
