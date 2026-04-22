
# CD Agrovet — Lab Testing Operations Platform

A full chain-of-custody platform connecting Customers, Lab Team, and Admin around fertilizer & raw material lab testing — from order placement through QR-tagged intake to released report.

## Roles & Portals

- **Customer Portal** — order, pay, track, download reports
- **Lab Workspace** (inside Admin Portal) — QR scan intake, structured testing, QA, release
- **Admin Portal** — operations oversight, finance view, configuration, capacity rules, user management

Auth via Lovable Cloud email/password. Roles stored in a separate `user_roles` table (customer / lab / admin) using a security-definer `has_role()` function — no client-side role checks.

## Customer Journey

1. **Browse & Order** — pick product/test type, add multiple samples per order, choose delivery (Same-day / Standard).
2. **Logistics** — Lalamove destination + quote (mocked Phase 1: simulated quote, ETA, tracking ID).
3. **Payment** — Razorpay checkout (mocked Phase 1: simulated payment confirmation + invoice generated).
4. **Packing instructions** — auto-generated PDF packing slip with:
   - 1 master Order QR
   - 1 QR per sample line item
   - Packing/labeling guidelines
5. **Track timeline** — live chain-of-custody view: Ordered → Paid → Picked up → In Transit → Received at Lab → Sample Verified → In Testing → QA Review → Released.
6. **Document downloads** — invoice, packing slip, final test report (PDF), any external certificates.

## Lab Team Workspace

- **QR Scan Intake** — camera-based scan (or manual code entry) opens the order/sample, lab confirms condition, uploads intake photos as evidence.
- **Per-sample stage progression** — Received → In Testing → QA → Ready for Release.
- **Structured test entry** — admin-defined test templates per product type (parameter, unit, threshold min/max, pass/fail). Lab enters values, system flags out-of-spec.
- **External certificate attachment** — upload scanned/3rd-party PDFs alongside structured results.
- **Auto-generated report PDF** — system compiles structured results + attached PDFs into a branded final report.
- **QA verification gate** — second lab member must verify before release.
- **Exception handling** — flag issues (damaged sample, contamination), notify admin.

## Admin Portal

- **Operations dashboard** — orders by stage, SLA breaches, today's intake, capacity utilization.
- **Finance view** — invoices, payments, refunds, exportable transaction log (CSV).
- **Capacity gating** — default unlimited; admin can optionally set daily caps (per delivery type and/or per test type) and same-day cutoff time.
- **Test template configuration** — define parameters, units, thresholds per product/test type.
- **User & role management** — invite lab members, assign roles.
- **Privileged QR lookup** — scan/enter any code to jump to the full order context.
- **Exception approvals** — review lab-flagged issues, approve overrides.

## Traceability & Notifications

- **Chain of custody log** — every stage transition, scan, upload, and verification is timestamped with actor, visible to customer and internal teams.
- **Email notifications** (via Lovable Cloud / Resend) — order confirmation, payment received, sample received at lab, report released.

## Data Model (high level)

`profiles`, `user_roles`, `products`, `test_templates`, `test_parameters`, `orders`, `order_samples` (each with unique QR code), `payments`, `shipments`, `chain_of_custody_events`, `test_results`, `attachments`, `capacity_rules`, `exceptions`.

Storage buckets: `evidence` (lab photos), `reports` (final PDFs), `attachments` (external certificates), `packing-slips`.

## Phase 1 Mocks (swap-ready)

- **Lalamove** — service module with simulated quote/booking/tracking; real API wired later behind same interface.
- **Razorpay** — simulated checkout returning success; real keys added later.
- PDF generation (packing slips, invoices, reports) and QR code generation are real from day one.

## Tech

TanStack Start + Lovable Cloud (auth, Postgres, storage), TanStack Query, Tailwind + shadcn/ui, server functions for all privileged actions with RLS-backed access.
