export const AgentStatus = {
  UNKNOWN: "unknown",
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNHEALTHY: "unhealthy"
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];
