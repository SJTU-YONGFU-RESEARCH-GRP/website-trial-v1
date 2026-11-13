export function benchmarkToolVersionLabel(version: string | null | undefined): string {
  const normalized = version?.trim();
  if (!normalized || /^usage\s*:/i.test(normalized)) return "Available";
  return `Available: ${normalized}`;
}
