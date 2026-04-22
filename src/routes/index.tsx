import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import {
  FlaskConical,
  QrCode,
  ShieldCheck,
  Truck,
  Search,
  ClipboardList,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "CD Agrovet Lab — End-to-end sample tracking" },
      {
        name: "description",
        content:
          "QR-coded chain of custody for fertilizer and raw material lab testing. From pickup to released report, tracked end to end.",
      },
      { property: "og:title", content: "CD Agrovet Lab — End-to-end sample tracking" },
      {
        property: "og:description",
        content:
          "QR-coded chain of custody for fertilizer and raw material lab testing.",
      },
    ],
  }),
});

const DEMO_QUEUE = [
  {
    id: "s1",
    label: "NPK Compound — Lot A24-117",
    order: "ORD-20260422-9f4a21",
    stage: "in_testing",
    stageLabel: "In testing",
    tone: "default" as const,
  },
  {
    id: "s2",
    label: "Urea Granular — Batch 88",
    order: "ORD-20260422-1b6c03",
    stage: "received_at_lab",
    stageLabel: "Received at lab",
    tone: "secondary" as const,
  },
  {
    id: "s3",
    label: "Organic Mix — Field 12",
    order: "ORD-20260421-7d9e44",
    stage: "qa_review",
    stageLabel: "QA review",
    tone: "outline" as const,
  },
  {
    id: "s4",
    label: "Foliar Liquid — Sample 02",
    order: "ORD-20260421-2a8f10",
    stage: "in_transit",
    stageLabel: "In transit",
    tone: "secondary" as const,
  },
];

const STATS = [
  { label: "In transit", value: 4, icon: Truck },
  { label: "Received", value: 7, icon: ClipboardList },
  { label: "In testing", value: 11, icon: FlaskConical },
  { label: "Released today", value: 3, icon: CheckCircle2 },
];

function Landing() {
  const { user, roles } = useAuth();
  const dest = user ? homeRouteFor(roles) : "/auth";

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — mimics PortalShell header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <FlaskConical className="h-5 w-5" />
            CD Agrovet
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <span className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
              Queue
            </span>
            <span className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground">
              Scan QR
            </span>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Lab Workspace
            </span>
            <Link to="/auth">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Hero */}
        <section className="mb-10">
          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Lab operations platform
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            From order to released report —{" "}
            <span className="text-primary">tracked end to end.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            QR-coded chain of custody for every fertilizer and raw material sample.
            Below is a live preview of how your lab queue will look.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg">Place an order</Button>
            </Link>
              </Button>
            </Link>
          </div>
        </section>

        {/* Mock workspace preview */}
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Active queue</h2>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Live preview
            </Badge>
          </div>

          {/* Stat cards */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {STATS.map((s) => (
              <Card key={s.label} className="p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {s.label}
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="mt-1 text-2xl font-bold">{s.value}</div>
              </Card>
            ))}
          </div>

          {/* Scan bar */}
          <Card className="mb-4 p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter or scan a QR code"
                  className="pl-9"
                  disabled
                />
              </div>
              <Link to="/auth">
                <Button>Open</Button>
              </Link>
            </div>
          </Card>

          {/* Mock queue list */}
          <div className="space-y-2">
            {DEMO_QUEUE.map((s) => (
              <Card
                key={s.id}
                className="flex items-center justify-between p-4 transition hover:border-primary"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.label}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <QrCode className="h-3 w-3" />
                    {s.order}
                  </div>
                </div>
                <Badge variant={s.tone}>{s.stageLabel}</Badge>
              </Card>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Sample data shown.{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to see your real queue.
          </p>
        </section>

        {/* Feature grid */}
        <section className="grid gap-4 pb-12 md:grid-cols-4">
          {[
            {
              icon: Truck,
              title: "Same-day or standard",
              body: "Lalamove pickup booked at checkout.",
            },
            {
              icon: QrCode,
              title: "QR chain of custody",
              body: "One QR per order, one per sample.",
            },
            {
              icon: FlaskConical,
              title: "Structured testing",
              body: "Templates with thresholds & pass/fail.",
            },
            {
              icon: ShieldCheck,
              title: "QA-gated release",
              body: "Two-person verification before release.",
            },
          ].map((f) => (
            <Card key={f.title} className="p-5">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
