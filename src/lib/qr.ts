// Lazy-load qrcode so it stays out of the initial bundle.
type QrcodeMod = typeof import("qrcode");
let qrcodeModPromise: Promise<QrcodeMod> | null = null;
function loadQrcode(): Promise<QrcodeMod> {
  if (!qrcodeModPromise) qrcodeModPromise = import("qrcode");
  return qrcodeModPromise;
}

export async function qrDataUrl(value: string, size = 200): Promise<string> {
  const QRCode = await loadQrcode();
  return QRCode.toDataURL(value, { width: size, margin: 1 });
}

export async function qrDataUrls(
  values: { id: string; value: string }[],
  size = 200,
): Promise<Record<string, string>> {
  const QRCode = await loadQrcode();
  const entries = await Promise.all(
    values.map(async ({ id, value }) =>
      [id, await QRCode.toDataURL(value, { width: size, margin: 1 })] as const,
    ),
  );
  return Object.fromEntries(entries);
}
