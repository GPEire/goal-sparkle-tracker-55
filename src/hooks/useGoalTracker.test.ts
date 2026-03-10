import { describe, expect, it } from "vitest";
import { getLocalDateKey, getMonthId, getWeekId } from "@/hooks/goalDateUtils";

describe("goal tracker date helpers", () => {
  it("builds a local YYYY-MM-DD date key", () => {
    const date = new Date(2026, 0, 5, 23, 59, 59);
    expect(getLocalDateKey(date)).toBe("2026-01-05");
  });

  it("changes week id across Sunday to Monday", () => {
    const sunday = new Date(2026, 2, 8, 12, 0, 0);
    const monday = new Date(2026, 2, 9, 12, 0, 0);

    expect(getWeekId(sunday)).not.toBe(getWeekId(monday));
  });

  it("changes month id across month-end", () => {
    const monthEnd = new Date(2026, 0, 31, 12, 0, 0);
    const nextMonth = new Date(2026, 1, 1, 12, 0, 0);

    expect(getMonthId(monthEnd)).toBe("2026-01");
    expect(getMonthId(nextMonth)).toBe("2026-02");
  });

  it("computes date ids consistently for timezone-offset timestamps", () => {
    const offsetDate = new Date("2026-03-01T00:30:00+14:00");

    const expectedDateKey = `${offsetDate.getFullYear()}-${String(offsetDate.getMonth() + 1).padStart(2, "0")}-${String(offsetDate.getDate()).padStart(2, "0")}`;
    const expectedMonthKey = `${offsetDate.getFullYear()}-${String(offsetDate.getMonth() + 1).padStart(2, "0")}`;

    expect(getLocalDateKey(offsetDate)).toBe(expectedDateKey);
    expect(getMonthId(offsetDate)).toBe(expectedMonthKey);
  });
});
