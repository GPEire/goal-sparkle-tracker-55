import { describe, expect, it } from "vitest";
import { buildDailyCompletionSeries, type GoalEvent } from "@/lib/history";

describe("buildDailyCompletionSeries", () => {
  it("marks a day complete for binary done events", () => {
    const events: GoalEvent[] = [
      {
        id: "1",
        userId: "u1",
        goalId: "g1",
        eventType: "binary_toggled",
        eventDate: "2026-03-07",
        binaryDone: true,
        countValue: null,
        delta: null,
        createdAt: "2026-03-07T09:00:00.000Z",
      },
    ];

    const series = buildDailyCompletionSeries(events, 3, new Date("2026-03-08T12:00:00.000Z"));

    expect(series).toEqual([
      { date: "2026-03-06", completed: false, eventCount: 0 },
      { date: "2026-03-07", completed: true, eventCount: 1 },
      { date: "2026-03-08", completed: false, eventCount: 0 },
    ]);
  });

  it("marks a day complete for count events with positive count", () => {
    const events: GoalEvent[] = [
      {
        id: "2",
        userId: "u1",
        goalId: "g1",
        eventType: "count_incremented",
        eventDate: "2026-03-08",
        binaryDone: null,
        countValue: 2,
        delta: 1,
        createdAt: "2026-03-08T10:00:00.000Z",
      },
    ];

    const series = buildDailyCompletionSeries(events, 1, new Date("2026-03-08T12:00:00.000Z"));

    expect(series).toEqual([{ date: "2026-03-08", completed: true, eventCount: 1 }]);
  });

  it("keeps a day incomplete when all events have false/zero completion", () => {
    const events: GoalEvent[] = [
      {
        id: "3",
        userId: "u1",
        goalId: "g1",
        eventType: "goal_reset_daily",
        eventDate: "2026-03-08",
        binaryDone: false,
        countValue: 0,
        delta: null,
        createdAt: "2026-03-08T00:01:00.000Z",
      },
    ];

    const series = buildDailyCompletionSeries(events, 1, new Date("2026-03-08T12:00:00.000Z"));

    expect(series).toEqual([{ date: "2026-03-08", completed: false, eventCount: 1 }]);
  });
});
