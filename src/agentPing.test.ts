import assert from "node:assert/strict";
import test from "node:test";
import { detectAgentPings } from "./agentPing";
import type { AgentStatus, HerdrAgent } from "./types";

function agent(paneId: string, status: AgentStatus, name = paneId): HerdrAgent {
  return {
    terminal_id: `term-${paneId}`,
    name,
    agent_status: status,
    workspace_id: "w1",
    tab_id: "w1:t1",
    pane_id: paneId,
    focused: false,
  };
}

const displayName = (candidate: HerdrAgent) => candidate.name ?? candidate.pane_id;

test("pings an agent that transitions into a waiting or finished state", () => {
  const previous = new Map<string, AgentStatus>([["w1:p1", "working"], ["w1:p2", "working"]]);
  const { pings, statuses } = detectAgentPings(
    previous,
    [agent("w1:p1", "blocked", "Claude"), agent("w1:p2", "done", "Codex")],
    displayName,
  );
  assert.deepEqual(pings, [
    { paneId: "w1:p1", name: "Claude", status: "blocked" },
    { paneId: "w1:p2", name: "Codex", status: "done" },
  ]);
  assert.deepEqual([...statuses], [["w1:p1", "blocked"], ["w1:p2", "done"]]);
});

test("agents seen for the first time never ping, even when already blocked or done", () => {
  const { pings, statuses } = detectAgentPings(
    new Map(),
    [agent("w1:p1", "blocked"), agent("w1:p2", "done")],
    displayName,
  );
  assert.deepEqual(pings, []);
  assert.equal(statuses.size, 2);
});

test("holding a ping state across snapshots does not re-ping", () => {
  const { pings } = detectAgentPings(
    new Map<string, AgentStatus>([["w1:p1", "done"]]),
    [agent("w1:p1", "done")],
    displayName,
  );
  assert.deepEqual(pings, []);
});

test("transitions into working or idle stay quiet", () => {
  const { pings } = detectAgentPings(
    new Map<string, AgentStatus>([["w1:p1", "done"], ["w1:p2", "blocked"]]),
    [agent("w1:p1", "working"), agent("w1:p2", "idle")],
    displayName,
  );
  assert.deepEqual(pings, []);
});

test("panes absent from the new snapshot are pruned from the tracked statuses", () => {
  const { statuses } = detectAgentPings(
    new Map<string, AgentStatus>([["w1:p1", "working"], ["gone", "done"]]),
    [agent("w1:p1", "idle")],
    displayName,
  );
  assert.deepEqual([...statuses], [["w1:p1", "idle"]]);
});
