import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth, homeRouteFor } from "@/hooks/useAuth";
import { FlaskConical, QrCode, ShieldCheck, Truck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, roles } = useAuth();
  const dest = user ? homeRouteFor(roles) : "/auth";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <FlaskConical className="h-5 w-5" />
            CD Agrovet
          </div>
          <nav className="flex items-center gap-3">
            <Link to={dest as "/portal"}>
              <Button variant="ghost">{user ? "Open dashboard" : "Sign in"}</Button>
            </Link>
            <Link to="/auth">
              <Button>Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Fertilizer & raw material lab testing
        </span>
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground">
          From order to released report — <span className="text-primary">tracked end to end.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          A single source of truth for your lab samples. QR-coded chain of custody from
          packing through testing to release, with logistics and payments built in.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth">
            <Button size="lg">Place an order</Button>
          </Link>
          <Link to={dest as "/portal"}>
            <Button size="lg" variant="outline">
              {user ? "Open portal" : "Sign in"}
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-4">
        {[
          { icon: Truck, title: "Same-day or standard", body: "Lalamove pickup booked at checkout." },
          { icon: QrCode, title: "QR chain of custody", body: "One QR per order, one per sample." },
          { icon: FlaskConical, title: "Structured testing", body: "Templates with thresholds & pass/fail." },
          { icon: ShieldCheck, title: "QA-gated release", body: "Two-person verification before release." },
        ].map((f) => (
          <Card key={f.title} className="p-6">
            <f.icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
