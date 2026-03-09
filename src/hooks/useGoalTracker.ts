import { useState, useCallback, useEffect } from "react";
import type {
  Goal,
  GoalFrequency,
  GoalType,
  GoalReminder,
  ReminderTime,
  GoalEvent,
  GoalEventType,
  GoalProgressRow,
} from "@/types/goal";
import {
  derivePeriodCompletionRate,
  deriveWeeklyHistory,
  getDayOfWeekIndex,
  getToday,
  rebuildGoalProgress,
} from "@/lib/progressAnalytics";

const ENABLE_REMINDERS = false;
const STORAGE_KEY = "goal-tracker";

interface StoredState {
  goals: Goal[];
  events: GoalEvent[];
  goal_progress: Record<number, GoalProgressRow>;
  reminders: GoalReminder[];
  email: string;
}

const DEFAULT_GOALS: Goal[] = [
  { id: 1, title: "Morning meditation", frequency: "daily", type: "binary", streak: 12, createdAt: getToday() },
  { id: 2, title: "Read 20 pages", frequency: "daily", type: "binary", streak: 4, createdAt: getToday() },
  { id: 3, title: "Meal prep", frequency: "weekly", type: "count", target: 3, streak: 6, label: "meals", createdAt: getToday() },
  { id: 4, title: "Deep work session", frequency: "daily", type: "binary", streak: 8, createdAt: getToday() },
  { id: 5, title: "Weekly review", frequency: "weekly", type: "binary", streak: 6, createdAt: getToday() },
  { id: 6, title: "Monthly planning", frequency: "monthly", type: "binary", streak: 3, createdAt: getToday() },
];

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      if (parsed.goals) {
        return {
          goals: parsed.goals,
          events: parsed.events ?? [],
          goal_progress: parsed.goal_progress ?? {},
          reminders: parsed.reminders ?? [],
          email: parsed.email ?? "",
        };
      }
    }
  } catch {
    // no-op
  }

  return {
    goals: DEFAULT_GOALS,
    events: [],
    goal_progress: {},
    reminders: [],
    email: "",
  };
}

export function useGoalTracker() {
  const [state, setState] = useState<StoredState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const goals = state.goals;
  const events = state.events;
  const history = deriveWeeklyHistory(goals, events);
  const todayIndex = getDayOfWeekIndex();

  const goalProgress = Object.keys(state.goal_progress).length
    ? state.goal_progress
    : rebuildGoalProgress(goals, events);

  const binary = Object.fromEntries(
    Object.values(goalProgress).map((row) => [row.goal_id, row.binary_value]),
  ) as Record<number, boolean>;

  const counts = Object.fromEntries(
    Object.values(goalProgress).map((row) => [row.goal_id, row.count_value]),
  ) as Record<number, number>;

  const appendEvent = useCallback((goalId: number, eventType: GoalEventType, delta: number) => {
    setState((prev) => {
      const event: GoalEvent = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        user_id: "local-user",
        goal_id: goalId,
        event_type: eventType,
        delta,
        effective_date: getToday(),
        created_at: new Date().toISOString(),
      };
      const nextEvents = [...prev.events, event];
      return {
        ...prev,
        events: nextEvents,
        goal_progress: rebuildGoalProgress(prev.goals, nextEvents),
      };
    });
  }, []);

  const isComplete = useCallback((g: Goal) => {
    if (g.type === "binary") return !!binary[g.id];
    if (g.type === "count") return (counts[g.id] ?? 0) >= (g.target ?? 0);
    return false;
  }, [binary, counts]);

  const toggleBinary = useCallback((id: number) => {
    appendEvent(id, binary[id] ? "uncompletion" : "completion", 0);
  }, [appendEvent, binary]);

  const increment = useCallback((id: number, target: number) => {
    if ((counts[id] ?? 0) >= target) return;
    appendEvent(id, "count_increment", 1);
  }, [appendEvent, counts]);

  const decrement = useCallback((id: number) => {
    if ((counts[id] ?? 0) <= 0) return;
    appendEvent(id, "count_decrement", -1);
  }, [appendEvent, counts]);

  const addGoal = useCallback((title: string, frequency: GoalFrequency, type: GoalType, target?: number, label?: string) => {
    const id = Date.now();
    setState((p) => ({
      ...p,
      goals: [...p.goals, { id, title, frequency, type, target, label, streak: 0, createdAt: getToday() }],
      goal_progress: {
        ...p.goal_progress,
        [id]: {
          id,
          user_id: "local-user",
          goal_id: id,
          binary_value: false,
          count_value: 0,
          updated_at: new Date().toISOString(),
        },
      },
    }));
  }, []);

  const deleteGoal = useCallback((id: number) => {
    setState((p) => {
      const newGoals = p.goals.filter((g) => g.id !== id);
      const newProgress = { ...p.goal_progress };
      delete newProgress[id];

      return {
        ...p,
        goals: newGoals,
        goal_progress: newProgress,
        events: p.events.filter((e) => e.goal_id !== id),
        reminders: ENABLE_REMINDERS ? p.reminders.filter((r) => r.goalId !== id) : p.reminders,
      };
    });
  }, []);

  const setEmail = useCallback((nextEmail: string) => {
    if (!ENABLE_REMINDERS) return;
    setState((p) => ({ ...p, email: nextEmail }));
  }, []);

  const setReminder = useCallback((goalId: number, time: ReminderTime) => {
    if (!ENABLE_REMINDERS) return;
    setState((p) => {
      const filtered = p.reminders.filter((r) => r.goalId !== goalId);
      if (time === "none") return { ...p, reminders: filtered };
      return { ...p, reminders: [...filtered, { goalId, time }] };
    });
  }, []);

  const getReminder = useCallback((goalId: number): ReminderTime => {
    if (!ENABLE_REMINDERS) return "none";
    return state.reminders.find((r) => r.goalId === goalId)?.time ?? "none";
  }, [state.reminders]);

  const completedCount = goals.filter(isComplete).length;
  const dailyPercent = derivePeriodCompletionRate(goals, events, "daily");
  const weeklyPercent = derivePeriodCompletionRate(goals, events, "weekly");
  const monthlyPercent = derivePeriodCompletionRate(goals, events, "monthly");

  return {
    goals,
    binary,
    counts,
    history,
    email: state.email,
    completedCount,
    todayIndex,
    dailyPercent,
    weeklyPercent,
    monthlyPercent,
    events,
    goalProgress,
    isComplete,
    toggleBinary,
    increment,
    decrement,
    addGoal,
    deleteGoal,
    setEmail,
    setReminder,
    getReminder,
    reminderEnabled: ENABLE_REMINDERS,
  };
}
