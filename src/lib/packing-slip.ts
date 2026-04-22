import { qrDataUrl } from "./qr";

// jspdf is heavy; only load when a PDF is actually requested.
async function loadJsPdf() {
  const mod = await import("jspdf");
  return mod.jsPDF ?? mod.default;
}

export interface PackingSlipInput {
  orderNumber: string;
  orderQr: string;
  customerName: string;
  customerCompany?: string | null;
  pickupAddress?: string | null;
  deliveryType: string;
  samples: { label: string; product: string; qrCode: string }[];
}

export async function generatePackingSlipPdf(input: PackingSlipInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(34, 99, 60);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("CD Agrovet — Packing Slip", 40, 45);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text(`Order: ${input.orderNumber}`, 40, 100);
  doc.text(`Customer: ${input.customerName}${input.customerCompany ? " — " + input.customerCompany : ""}`, 40, 118);
  doc.text(`Delivery: ${input.deliveryType.replace("_", " ")}`, 40, 136);
  if (input.pickupAddress) doc.text(`Pickup: ${input.pickupAddress}`, 40, 154);

  const masterQr = await qrDataUrl(input.orderQr, 220);
  doc.addImage(masterQr, "PNG", pageW - 180, 90, 140, 140);
  doc.setFontSize(9);
  doc.text("Master Order QR", pageW - 160, 240);

  doc.setFontSize(13);
  doc.text("Packing & Sealing Instructions", 40, 280);
  doc.setFontSize(10);
  const instructions = [
    "1. Place each sample (min 250g) in a sealed, labeled container.",
    "2. Apply tamper-evident seal to each container.",
    "3. Affix the matching sample QR label to each container.",
    "4. Place all containers inside one outer box; tape the master Order QR on top.",
    "5. Hand the box to the Lalamove rider on pickup or drop at courier counter.",
  ];
  instructions.forEach((line, i) => doc.text(line, 40, 300 + i * 16));

  doc.setFontSize(13);
  doc.text("Sample Labels", 40, 410);

  let y = 430;
  for (let i = 0; i < input.samples.length; i++) {
    const s = input.samples[i];
    if (y > 720) { doc.addPage(); y = 60; }
    const qr = await qrDataUrl(s.qrCode, 160);
    doc.setDrawColor(200);
    doc.rect(40, y, pageW - 80, 110);
    doc.addImage(qr, "PNG", 50, y + 10, 90, 90);
    doc.setFontSize(12);
    doc.text(s.label, 160, y + 30);
    doc.setFontSize(10);
    doc.text(s.product, 160, y + 50);
    doc.setFontSize(8);
    doc.text(`Code: ${s.qrCode}`, 160, y + 70);
    y += 130;
  }

  return doc.output("blob");
}

// =================== Compliance Pack (Step 5) ===================

export interface ComplianceSampleResult {
  label: string;
  product: string;
  batch?: string | null;
  origin?: string | null;
  qrCode: string;
  results: { name: string; unit?: string | null; value: string; passed: boolean | null; range?: string }[];
}

export interface ComplianceInput {
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerCompany?: string | null;
  releasedAt: string;
  samples: ComplianceSampleResult[];
  verificationUrl: string; // public verification URL
}

export async function generateCompliancePackPdf(input: ComplianceInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ---- Cover page
  doc.setFillColor(34, 99, 60);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text("CD Agrovet Lab", 40, 55);
  doc.setFontSize(14);
  doc.text("Compliance Report & Certificate of Analysis", 40, 80);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.text(`Order: ${input.orderNumber}`, 40, 150);
  doc.text(`Customer: ${input.customerName}${input.customerCompany ? " — " + input.customerCompany : ""}`, 40, 168);
  doc.text(`Released: ${new Date(input.releasedAt).toLocaleString()}`, 40, 186);
  doc.text(`Samples: ${input.samples.length}`, 40, 204);

  // verification QR
  const vQr = await qrDataUrl(input.verificationUrl, 200);
  doc.addImage(vQr, "PNG", pageW - 170, 140, 130, 130);
  doc.setFontSize(8);
  doc.text("Scan to verify authenticity", pageW - 165, 280);
  doc.setFontSize(7);
  doc.text(input.verificationUrl, pageW - 165, 292, { maxWidth: 130 });

  doc.setFontSize(10);
  doc.text(
    "This document certifies the test results for the samples listed below. " +
    "Each sample was received under chain-of-custody and tested per accredited methods. " +
    "Verification QR confirms integrity of this document.",
    40, 330, { maxWidth: pageW - 80 },
  );

  // ---- Per-sample pages
  for (const s of input.samples) {
    doc.addPage();
    doc.setFillColor(245, 247, 245);
    doc.rect(0, 0, pageW, 70, "F");
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(16);
    doc.text(`${s.label} — ${s.product}`, 40, 45);

    let y = 100;
    doc.setFontSize(10);
    if (s.batch) { doc.text(`Batch: ${s.batch}`, 40, y); y += 14; }
    if (s.origin) { doc.text(`Origin: ${s.origin}`, 40, y); y += 14; }
    doc.text(`Sample QR: ${s.qrCode}`, 40, y); y += 20;

    // Results table
    doc.setFontSize(11);
    doc.text("Test Parameters", 40, y); y += 10;
    doc.setDrawColor(180);
    doc.line(40, y, pageW - 40, y); y += 14;
    doc.setFontSize(9);
    doc.text("Parameter", 40, y);
    doc.text("Result", 280, y);
    doc.text("Range", 380, y);
    doc.text("Status", 480, y);
    y += 6;
    doc.line(40, y, pageW - 40, y); y += 14;

    if (s.results.length === 0) {
      doc.text("No structured results recorded.", 40, y); y += 14;
    } else {
      for (const r of s.results) {
        if (y > pageH - 60) { doc.addPage(); y = 60; }
        doc.text(r.name + (r.unit ? ` (${r.unit})` : ""), 40, y);
        doc.text(r.value || "—", 280, y);
        doc.text(r.range || "—", 380, y);
        const status = r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "—";
        if (r.passed === false) doc.setTextColor(180, 30, 30);
        else if (r.passed === true) doc.setTextColor(34, 99, 60);
        doc.text(status, 480, y);
        doc.setTextColor(20, 20, 20);
        y += 16;
      }
    }
  }

  // Footer on all pages
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`CD Agrovet Lab · ${input.orderNumber} · Page ${p}/${total}`, 40, pageH - 20);
  }

  return doc.output("blob");
}
