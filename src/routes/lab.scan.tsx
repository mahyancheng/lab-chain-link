import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/lab/scan")({
  component: ScanPage,
});

const NAV = [
  { to: "/lab", label: "Queue" },
  { to: "/lab/scan", label: "Scan QR" },
];

function ScanPage() {
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      try {
        scannerRef.current?.stop();
      } catch {}
    };
  }, []);

  async function startCamera() {
    setScanning(true);
    const mod = await import("html5-qrcode");
    const Html5Qrcode = mod.Html5Qrcode;
    if (!ref.current) return;
    const scanner = new Html5Qrcode(ref.current.id);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decoded: string) => {
          await scanner.stop();
          setScanning(false);
          await go(decoded);
        },
        () => {},
      );
    } catch (e: any) {
      toast.error(e.message ?? "Camera unavailable");
      setScanning(false);
    }
  }

  async function go(value: string) {
    const v = value.trim();
    const { data: s } = await supabase.from("order_samples").select("id").eq("qr_code", v).maybeSingle();
    if (s) {
      window.location.href = `/lab/samples/${s.id}`;
      return;
    }
    const { data: o } = await supabase.from("orders").select("id").eq("qr_code", v).maybeSingle();
    if (o) {
      window.location.href = `/lab/orders/${o.id}`;
      return;
    }
    toast.error("No match");
  }

  return (
    <PortalShell title="Lab Workspace" nav={NAV} requireRole="lab">
      <h1 className="mb-6 text-2xl font-bold">Scan QR</h1>
      <Card className="space-y-4 p-5">
        <div>
          <label className="text-sm">Manual entry</label>
          <div className="flex gap-2 pt-1">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste QR code" />
            <Button onClick={() => go(code)}>Open</Button>
          </div>
        </div>
        <div>
          <Button variant="outline" onClick={startCamera} disabled={scanning}>
            {scanning ? "Scanning…" : "Use camera"}
          </Button>
          <div id="qr-reader" ref={ref} className="mt-3 w-full max-w-sm" />
        </div>
      </Card>
    </PortalShell>
  );
}
