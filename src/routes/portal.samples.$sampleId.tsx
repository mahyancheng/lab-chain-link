import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, FlaskConical, ShieldCheck } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { RoleGuard } from "@/components/RoleGuard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SplitText } from "@/components/ui/split-text";
import { STAGE_LABEL } from "@/lib/stages";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/samples/$sampleId")({
  component: () => <RoleGuard allow={["customer"]}><SampleReportPage /></RoleGuard>,
});

const CUSTOMER_NAV = [
  { to: "/portal", label: "My orders" },
  { to: "/portal/new", label: "New order" },
];

function SampleReportPage() {
  const { sampleId } = Route.useParams();
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isLab = roles.includes("lab");
  // /portal route → always show the customer shell, even if user has staff roles.
  const nav = CUSTOMER_NAV;
  const shellTitle = "Customer Portal";
  const backTo = "/portal";

  const [sample, setSample] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("order_samples").select("*").eq("id", sampleId).single();
      setSample(s);
      if (!s) return;

      const [{ data: o }, { data: p }, { data: r }, { data: a }] = await Promise.all([
        supabase.from("orders").select("id, order_number, created_at").eq("id", s.order_id).single(),
        supabase.from("products").select("*").eq("id", s.product_id).single(),
        supabase.from("test_results").select("*").eq("sample_id", s.id),
        supabase.from("attachments").select("*").eq("sample_id", s.id).in("kind", ["report", "external_cert"]).order("created_at", { ascending: false }),
      ]);

      setOrder(o);
      setProduct(p);
      setResults(r ?? []);
      setReports(a ?? []);

      const paramIds = Array.from(new Set((r ?? []).map((row) => row.parameter_id)));
      if (paramIds.length) {
        const { data: ps } = await supabase.from("test_parameters").select("*").in("id", paramIds);
        setParameters(Object.fromEntries((ps ?? []).map((row) => [row.id, row])));
      }
    })();
  }, [sampleId]);

  async function openAttachment(att: any) {
    const { data, error } = await supabase.storage.from(att.bucket).createSignedUrl(att.path, 60);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!sample) {
    return <PortalShell title={shellTitle} nav={nav}>Loading…</PortalShell>;
  }

  const isReleased = sample.stage === "released";

  return (
    <PortalShell title={shellTitle} nav={nav}>
      <Link to={backTo as "/portal"} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        <SplitText stagger={0.015}>Back</SplitText>
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5 text-primary" />
            <SplitText stagger={0.01}>Sample report access</SplitText>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <SplitText>{sample.sample_label}</SplitText>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <SplitText stagger={0.012}>{product?.name ?? "Sample details"}</SplitText>
          </p>
          {order && (
            <p className="mt-1 text-xs text-muted-foreground">
              Order {order.order_number} · {new Date(order.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <Badge variant={isReleased ? "default" : "outline"}>{STAGE_LABEL[sample.stage] ?? sample.stage}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold"><SplitText>Sample information</SplitText></h2>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <Info label="Sample ID" value={sample.id} mono />
              <Info label="Sample QR" value={sample.qr_code} mono />
              <Info label="Product" value={product?.name ?? "—"} />
              <Info label="Category" value={product?.category ?? "—"} />
              <Info label="Batch" value={sample.batch_no ?? "—"} />
              <Info label="Origin" value={sample.origin ?? "—"} />
              <Info label="Composition" value={sample.composition ?? "—"} />
              <Info label="Packaging" value={product?.packaging_instructions ?? "—"} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold"><SplitText>Results overview</SplitText></h2>
            </div>
            {!isReleased ? (
              <p className="text-sm text-muted-foreground">
                <SplitText stagger={0.012}>This sample is still in progress. Results and downloadable reports appear here once the report is issued.</SplitText>
              </p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                <SplitText stagger={0.012}>No structured test values were attached to this sample.</SplitText>
              </p>
            ) : (
              <div className="space-y-2">
                {results.map((row) => {
                  const parameter = parameters[row.parameter_id];
                  const display = row.value != null ? String(row.value) : (row.text_value ?? "—");
                  return (
                    <div key={row.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium">{parameter?.name ?? "Result"}</div>
                        <div className="text-xs text-muted-foreground">{parameter?.unit ?? ""}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{display}</span>
                        {row.passed === true && <Badge>Pass</Badge>}
                        {row.passed === false && <Badge variant="destructive">Fail</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold"><SplitText>Issued files</SplitText></h2>
            </div>
            {!isReleased ? (
              <p className="text-sm text-muted-foreground">
                <SplitText stagger={0.012}>Report files will unlock here after release.</SplitText>
              </p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                <SplitText stagger={0.012}>No report file is attached yet.</SplitText>
              </p>
            ) : (
              <div className="space-y-2">
                {reports.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => openAttachment(att)}
                    className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/10"
                  >
                    <div>
                      <div className="font-medium">{att.filename ?? att.kind}</div>
                      <div className="text-xs text-muted-foreground">{att.kind.replace("_", " ")}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {order && (
            <Card className="p-5 text-sm">
              <h3 className="mb-2 font-semibold"><SplitText>Order link</SplitText></h3>
              <Link to="/portal/orders/$orderId" params={{ orderId: order.id }}>
                <Button variant="outline" className="w-full">Open related order</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </PortalShell>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? "break-all font-mono text-xs text-foreground" : "text-foreground"}>{value}</div>
    </div>
  );
}
