import type { jsPDF as JsPdfType } from "jspdf";
import { STAGE_LABEL } from "@/lib/stages";

async function loadJsPdf() {
  const mod = await import("jspdf");
  return mod.jsPDF ?? (mod as unknown as { default: typeof mod.jsPDF }).default;
}

export interface SampleReportPdfInput {
  label: string;
  stage: string;
  sampleId: string;
  qrDataUrl?: string;
  productName?: string;
  itemCode?: string | null;
  category?: string | null;
  batchNo?: string | null;
  origin?: string | null;
  composition?: string | null;
  packagingInstructions?: string | null;
  tatDays?: number | null;
  orderNumber?: string | null;
  results?: Array<{
    name: string;
    unit?: string | null;
    value?: string | number | null;
    passed?: boolean | null;
  }>;
}

async function buildPdf(data: SampleReportPdfInput): Promise<JsPdfType> {
  const JsPdfCtor = await loadJsPdf();
  const doc = new JsPdfCtor({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CD Agrovet — Sample Report", margin, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
  doc.setTextColor(0);
  y += 22;

  // QR
  if (data.qrDataUrl) {
    try {
      doc.addImage(data.qrDataUrl, "PNG", pageW - margin - 110, margin, 110, 110);
    } catch {
      /* ignore image errors */
    }
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.label, margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  if (data.productName) {
    doc.text(data.productName, margin, y);
    y += 14;
  }
  doc.setTextColor(110);
  doc.text(
    `Stage: ${STAGE_LABEL[data.stage as keyof typeof STAGE_LABEL] ?? data.stage}`,
    margin,
    y,
  );
  y += 14;
  if (data.orderNumber) {
    doc.text(`Order: ${data.orderNumber}`, margin, y);
    y += 14;
  }
  doc.setTextColor(0);
  y += 8;

  // Info table
  const rows: Array<[string, string]> = [
    ["Sample ID", data.sampleId],
    ["Item code", data.itemCode ?? "—"],
    ["Category", data.category ?? "—"],
    ["Batch", data.batchNo ?? "—"],
    ["Origin", data.origin ?? "—"],
    ["Composition", data.composition ?? "—"],
    ["TAT (days)", data.tatDays != null ? String(data.tatDays) : "—"],
  ];
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Sample information", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  rows.forEach(([k, v]) => {
    doc.setTextColor(110);
    doc.text(k, margin, y);
    doc.setTextColor(0);
    const wrapped = doc.splitTextToSize(v, pageW - margin * 2 - 110);
    doc.text(wrapped, margin + 110, y);
    y += 14 * Math.max(1, wrapped.length);
  });
  y += 8;

  // Packaging
  if (data.packagingInstructions) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Packaging instructions", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(data.packagingInstructions, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += 14 * lines.length + 6;
  }

  // Results
  if (data.results && data.results.length) {
    if (y > 700) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Results", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    data.results.forEach((r) => {
      if (y > 780) {
        doc.addPage();
        y = margin;
      }
      const value = r.value != null ? String(r.value) : "—";
      const status =
        r.passed === true ? "PASS" : r.passed === false ? "FAIL" : "";
      doc.setTextColor(110);
      doc.text(r.name, margin, y);
      doc.setTextColor(0);
      doc.text(`${value}${r.unit ? ` ${r.unit}` : ""}`, margin + 240, y);
      if (status) doc.text(status, pageW - margin - 40, y);
      y += 14;
    });
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text("CD Agrovet · This report is generated from the lab platform.", margin, pageH - 24);

  return doc;
}

export async function downloadSampleReportPdf(data: SampleReportPdfInput) {
  const doc = await buildPdf(data);
  const safe = data.label.replace(/[^a-z0-9-_]+/gi, "_");
  doc.save(`${safe}_report.pdf`);
}

export async function openSampleReportPdf(data: SampleReportPdfInput) {
  const doc = await buildPdf(data);
  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener,noreferrer");
}
