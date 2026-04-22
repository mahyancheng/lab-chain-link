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
import { STAGE_LABEL } from "@/lib/stages";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";

export const Route = createFileRoute("/lab/samples/$sampleId")({
  component: () => <RoleGuard allow={["lab", "admin"]}><SampleDetail /></RoleGuard>,
});

const NAV = [
  { to: "/lab", label: "Queue" },
  { to: "/lab/scan", label: "Scan QR" },
];

const NEXT_STAGE: Record<string, string> = {
  pending: "received",
  received: "in_testing",
  in_testing: "qa_review",
  qa_review: "ready_for_release",
  ready_for_release: "released",
};

function SampleDetail() {
  const { sampleId } = Route.useParams();
  const { user } = useAuth();
  const [sample, setSample] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, { value: string; passed: boolean | null }>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: s } = await supabase.from("order_samples").select("*").eq("id", sampleId).single();
    setSample(s);
    if (s) {
      const { data: o } = await supabase.from("orders").select("*").eq("id", s.order_id).single();
      setOrder(o);
      if (s.template_id) {
        const { data: p } = await supabase
          .from("test_parameters")
          .select("*")
          .eq("template_id", s.template_id)
          .order("sort_order");
        setParameters(p ?? []);
      }
      const { data: r } = await supabase.from("test_results").select("*").eq("sample_id", s.id);
      const map: Record<string, { value: string; passed: boolean | null }> = {};
      (r ?? []).forEach((row) => {
        map[row.parameter_id] = { value: String(row.value ?? ""), passed: row.passed };
      });
      setResults(map);
    }
  }

  useEffect(() => {
    load();
  }, [sampleId]);

  async function advance() {
    if (!sample || !user) return;
    const next = NEXT_STAGE[sample.stage];
    if (!next) return;
    if (next === "released" && sample.qa_verified_by === user.id) {
      return toast.error("A different lab member must verify before release.");
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

    // Mirror to order stage when meaningful
    const orderStageMap: Record<string, "received_at_lab" | "in_testing" | "qa_review" | "released"> = {
      received: "received_at_lab",
      in_testing: "in_testing",
      qa_review: "qa_review",
      released: "released",
    };
    const mapped = orderStageMap[next];
    if (mapped) {
      await supabase.from("orders").update({ stage: mapped }).eq("id", sample.order_id);
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
      {
        sample_id: sampleId,
        parameter_id: paramId,
        value: isNaN(num) ? null : num,
        passed,
        entered_by: user.id,
      },
      { onConflict: "sample_id,parameter_id" } as any,
    );
    setResults((p) => ({ ...p, [paramId]: { ...r, passed } }));
    toast.success("Saved");
  }

  if (!sample) return <PortalShell title="Lab Workspace" nav={NAV} requireRole="lab">Loading…</PortalShell>;

  return (
    <PortalShell title="Lab Workspace" nav={NAV} requireRole="lab">
      <Link to="/lab" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />Back to queue
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{sample.sample_label}</h1>
          <p className="text-sm text-muted-foreground">
            Order {order?.order_number} · QR <span className="font-mono">{sample.qr_code}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{STAGE_LABEL[sample.stage]}</Badge>
          {NEXT_STAGE[sample.stage] && (
            <Button onClick={advance} disabled={busy}>
              {sample.stage === "qa_review" && <ShieldCheck className="mr-2 h-4 w-4" />}
              Advance → {STAGE_LABEL[NEXT_STAGE[sample.stage]]}
            </Button>
          )}
        </div>
      </div>

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
                  />
                  <div className="col-span-2">
                    {r.passed === true && <Badge>Pass</Badge>}
                    {r.passed === false && <Badge variant="destructive">Fail</Badge>}
                  </div>
                  <Button className="col-span-2" variant="outline" onClick={() => saveResult(p.id)}>
                    Save
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </PortalShell>
  );
}
