// Lazy-load qrcode so it stays out of the initial bundle.
let qrcodeModPromise: Promise<typeof import("qrcode")> | null = null;
function loadQrcode() {
  if (!qrcodeModPromise) qrcodeModPromise = import("qrcode");
  return qrcodeModPromise;
}

export async function qrDataUrl(value: string, size = 200): Promise<string> {
  const QRCode = (await loadQrcode()).default;
  return QRCode.toDataURL(value, { width: size, margin: 1 });
}

export async function qrDataUrls(
  values: { id: string; value: string }[],
  size = 200,
): Promise<Record<string, string>> {
  const QRCode = (await loadQrcode()).default;
  const entries = await Promise.all(
    values.map(async ({ id, value }) => [id, await QRCode.toDataURL(value, { width: size, margin: 1 })] as const),
  );
  return Object.fromEntries(entries);
}
