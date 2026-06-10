export function buildPromptName(
  tenantSlug: string,
  systemSlug: string,
  agentSlug: string,
  promptName: string
): string {
  return `${tenantSlug}/${systemSlug}/${agentSlug}/${promptName}`;
}

export function buildScoreConfigName(
  tenantSlug: string,
  metricName: string
): string {
  return `${tenantSlug}/${metricName}`;
}
