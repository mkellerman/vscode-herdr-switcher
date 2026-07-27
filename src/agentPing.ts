import type { AgentStatus, HerdrAgent } from "./types";

/** States that warrant a ping when an agent first transitions into them. */
export type PingStatus = "blocked" | "done";

const PING_STATUSES: ReadonlySet<AgentStatus> = new Set<AgentStatus>(["blocked", "done"]);

export interface AgentPing {
  paneId: string;
  name: string;
  status: PingStatus;
}

export interface AgentPingResult {
  pings: AgentPing[];
  statuses: Map<string, AgentStatus>;
}

/**
 * Detects agents that just moved into a ping-worthy state. Pure: the caller
 * passes the statuses seen on the previous snapshot and receives the pings plus
 * the next status map to remember. Agents missing from `previous` are treated as
 * freshly seen and never ping, so agents already blocked or done when a window
 * connects stay quiet until they change again. The returned map contains only
 * the given agents, so stale panes are pruned automatically.
 */
export function detectAgentPings(
  previous: ReadonlyMap<string, AgentStatus>,
  agents: readonly HerdrAgent[],
  displayName: (agent: HerdrAgent) => string,
): AgentPingResult {
  const statuses = new Map<string, AgentStatus>();
  const pings: AgentPing[] = [];
  for (const agent of agents) {
    statuses.set(agent.pane_id, agent.agent_status);
    const before = previous.get(agent.pane_id);
    if (before !== undefined && before !== agent.agent_status && PING_STATUSES.has(agent.agent_status)) {
      pings.push({ paneId: agent.pane_id, name: displayName(agent), status: agent.agent_status as PingStatus });
    }
  }
  return { pings, statuses };
}
