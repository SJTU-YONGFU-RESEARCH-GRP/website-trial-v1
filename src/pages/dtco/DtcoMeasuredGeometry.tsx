import type { JsonObject } from "../../../shared/contracts/v1";
export function jsonObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}
export function extractedDevices(provenance: unknown): { model: string; widthUm: number; lengthUm: number }[] {
  const extraction = jsonObject(jsonObject(provenance)?.extraction);
  if (!Array.isArray(extraction?.devices)) return [];
  return extraction.devices.flatMap(value => {
    const device = jsonObject(value);
    if (typeof device?.model !== "string" || typeof device.w !== "number" || typeof device.l !== "number"
      || !Number.isFinite(device.w) || !Number.isFinite(device.l) || device.w <= 0 || device.l <= 0) return [];
    return [{ model: device.model, widthUm: device.w * 1e6, lengthUm: device.l * 1e6 }];
  });
}
export function DtcoMeasuredGeometry({ provenance }: { provenance: unknown }): JSX.Element {
  const devices = extractedDevices(provenance);
  return devices.length ? <>{devices.map((device,index) => <small key={`${device.model}-${index}`}>Measured {device.model}: W {Number(device.widthUm.toPrecision(6))} µm / L {Number(device.lengthUm.toPrecision(6))} µm</small>)}</> : <small>Measured device geometry not published yet.</small>;
}
