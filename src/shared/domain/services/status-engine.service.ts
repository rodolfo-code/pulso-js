import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";

export interface ComputeStatusInput {
  lastHeartbeatAt: Date | null;
  now: Date;
  timeoutSeconds: number;
  errorCount?: number | null;
}

export function computeStatus(input: ComputeStatusInput): AgentStatus {
  const { lastHeartbeatAt, now, timeoutSeconds, errorCount } = input;

  if (lastHeartbeatAt === null) {
    return AgentStatus.UNKNOWN;
  }

  const ageSeconds = (now.getTime() - lastHeartbeatAt.getTime()) / 1000;

  if (ageSeconds > timeoutSeconds) {
    return AgentStatus.UNHEALTHY;
  }

  if (errorCount !== undefined && errorCount !== null && errorCount > 0) {
    return AgentStatus.DEGRADED;
  }

  return AgentStatus.HEALTHY;
}
