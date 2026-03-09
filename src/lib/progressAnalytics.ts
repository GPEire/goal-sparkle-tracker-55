import type { Goal } from "@/types/goal";
import type { GoalEvent, GoalProgressRow } from "@/types/goal";

export function getToday() {
  return new Date().toISOString().split("T")[0];
}

export function getDayOfWeekIndex(date = new Date()) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function toDay(date: Date) {
  return date.toISOString().split("T")[0];
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = getDayOfWeekIndex(d);
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isInCurrentPeriod(goal: Goal, effectiveDate: string, now = new Date()) {
  if (goal.frequency === "daily") return effectiveDate === toDay(now);
  if (goal.frequency === "weekly") return effectiveDate >= toDay(startOfWeek(now));
  return effectiveDate >= toDay(startOfMonth(now));
}

export function rebuildGoalProgress(goals: Goal[], events: GoalEvent[], now = new Date()) {
  const progress: Record<number, GoalProgressRow> = {};
  goals.forEach((goal) => {
    progress[goal.id] = {
      id: goal.id,
      user_id: "local-user",
      goal_id: goal.id,
      binary_value: false,
      count_value: 0,
      updated_at: new Date().toISOString(),
    };
  });

  const byDate = [...events].sort((a, b) => {
    if (a.effective_date === b.effective_date) return a.created_at.localeCompare(b.created_at);
    return a.effective_date.localeCompare(b.effective_date);
  });

  byDate.forEach((event) => {
    const goal = goals.find((g) => g.id === event.goal_id);
    if (!goal || !isInCurrentPeriod(goal, event.effective_date, now)) return;
    const row = progress[event.goal_id];
    if (!row) return;

    if (event.event_type === "completion") row.binary_value = true;
    if (event.event_type === "uncompletion") row.binary_value = false;
    if (event.event_type === "count_increment" || event.event_type === "count_decrement") {
      row.count_value = Math.max(0, row.count_value + event.delta);
      if (goal.type === "count" && goal.target != null) {
        row.count_value = Math.min(row.count_value, goal.target);
      }
    }

    row.updated_at = event.created_at;
  });

  return progress;
}

export function deriveWeeklyHistory(goals: Goal[], events: GoalEvent[], today = new Date()) {
  const weekStart = startOfWeek(today);
  const dates = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    return toDay(d);
  });

  const history: Record<number, number[]> = {};
  goals.forEach((g) => {
    history[g.id] = new Array(7).fill(0);
  });

  goals.forEach((goal) => {
    dates.forEach((date, idx) => {
      const dayEvents = events
        .filter((e) => e.goal_id === goal.id && e.effective_date === date)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

      if (!dayEvents.length) return;

      if (goal.type === "binary") {
        const lastState = dayEvents.reduce<boolean>((acc, e) => {
          if (e.event_type === "completion") return true;
          if (e.event_type === "uncompletion") return false;
          return acc;
        }, false);
        history[goal.id][idx] = lastState ? 1 : 0;
        return;
      }

      const count = dayEvents.reduce((sum, e) => sum + e.delta, 0);
      history[goal.id][idx] = Math.max(0, count);
    });
  });

  return history;
}

export function derivePeriodCompletionRate(goals: Goal[], events: GoalEvent[], period: "daily" | "weekly" | "monthly", now = new Date()) {
  const relevantGoals = goals.filter((g) => g.frequency === period);
  if (!relevantGoals.length) return 0;

  const marker =
    period === "daily" ? toDay(now) : period === "weekly" ? toDay(startOfWeek(now)) : toDay(startOfMonth(now));

  const complete = relevantGoals.filter((goal) => {
    const scoped = events
      .filter((e) => e.goal_id === goal.id && e.effective_date >= marker)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    if (goal.type === "binary") {
      const binaryEvents = scoped.filter((e) => e.event_type === "completion" || e.event_type === "uncompletion");
      const last = binaryEvents.at(-1);
      return last?.event_type === "completion";
    }

    const total = Math.max(0, scoped.reduce((sum, e) => sum + e.delta, 0));
    return total >= (goal.target ?? 0);
  }).length;

  return Math.round((complete / relevantGoals.length) * 100);
}
