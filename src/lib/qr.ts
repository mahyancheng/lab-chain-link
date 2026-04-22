import QRCode from "qrcode";

export async function qrDataUrl(value: string, size = 200): Promise<string> {
  return QRCode.toDataURL(value, { width: size, margin: 1 });
}
