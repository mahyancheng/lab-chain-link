import jsPDF from "jspdf";
import { qrDataUrl } from "./qr";

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

  // Master order QR
  const masterQr = await qrDataUrl(input.orderQr, 220);
  doc.addImage(masterQr, "PNG", pageW - 180, 90, 140, 140);
  doc.setFontSize(9);
  doc.text("Master Order QR", pageW - 160, 240);

  doc.setFontSize(13);
  doc.text("Packing Instructions", 40, 280);
  doc.setFontSize(10);
  const instructions = [
    "1. Place each sample (min 250g) in a sealed, labeled container.",
    "2. Affix the matching sample QR label to each container.",
    "3. Place all containers inside one outer box; tape the master Order QR on top.",
    "4. Hand the box to the Lalamove rider on pickup.",
  ];
  instructions.forEach((line, i) => doc.text(line, 40, 300 + i * 16));

  doc.setFontSize(13);
  doc.text("Sample Labels", 40, 390);

  let y = 410;
  for (let i = 0; i < input.samples.length; i++) {
    const s = input.samples[i];
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
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
