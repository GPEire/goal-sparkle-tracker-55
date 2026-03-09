import { describe, it, expect } from "vitest";
import type { Goal, GoalEvent } from "@/types/goal";
import { derivePeriodCompletionRate, deriveWeeklyHistory, rebuildGoalProgress } from "@/lib/progressAnalytics";

const goals: Goal[] = [
  { id: 1, title: "A", frequency: "daily", type: "binary", streak: 0, createdAt: "2026-01-01" },
  { id: 2, title: "B", frequency: "weekly", type: "count", target: 2, streak: 0, createdAt: "2026-01-01" },
];

const events: GoalEvent[] = [
  { id: 1, user_id: "u", goal_id: 1, event_type: "completion", delta: 0, effective_date: "2026-02-02", created_at: "2026-02-02T08:00:00.000Z" },
  { id: 2, user_id: "u", goal_id: 2, event_type: "count_increment", delta: 1, effective_date: "2026-02-03", created_at: "2026-02-03T08:00:00.000Z" },
  { id: 3, user_id: "u", goal_id: 2, event_type: "count_increment", delta: 1, effective_date: "2026-02-04", created_at: "2026-02-04T08:00:00.000Z" },
];

describe("progress analytics", () => {
  it("rebuilds snapshot table from events", () => {
    const snapshot = rebuildGoalProgress(goals, events, new Date("2026-02-05T12:00:00.000Z"));
    expect(snapshot[1].binary_value).toBe(false);
    expect(snapshot[2].count_value).toBe(2);
  });

  it("derives weekly history", () => {
    const history = deriveWeeklyHistory(goals, events, new Date("2026-02-05T12:00:00.000Z"));
    expect(history[1].reduce((a, b) => a + b, 0)).toBe(1);
    expect(history[2].reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("computes completion rates by period", () => {
    const daily = derivePeriodCompletionRate(goals, events, "daily", new Date("2026-02-02T12:00:00.000Z"));
    const weekly = derivePeriodCompletionRate(goals, events, "weekly", new Date("2026-02-05T12:00:00.000Z"));
    expect(daily).toBe(100);
    expect(weekly).toBe(100);
  });
});
