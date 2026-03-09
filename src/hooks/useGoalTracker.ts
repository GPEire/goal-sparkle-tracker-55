import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Goal, GoalFrequency, GoalType, GoalReminder, ReminderTime } from "@/types/goal";

const ENABLE_REMINDERS = false;

interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  frequency: GoalFrequency;
  type: GoalType;
  target: number | null;
  label: string | null;
  streak: number;
  created_at: string;
}

interface GoalProgressRow {
  goal_id: string;
  user_id: string;
  binary_done: boolean;
  count_value: number;
  history: number[];
  last_reset_date: string;
  last_week_reset_date: string;
  last_month_reset_date: string;
}

type GoalEventType =
  | "goal_created"
  | "goal_deleted"
  | "binary_toggled"
  | "count_incremented"
  | "count_decremented"
  | "goal_reset_daily"
  | "goal_reset_weekly"
  | "goal_reset_monthly";

interface GoalEventInsert {
  user_id: string;
  goal_id: string;
  event_type: GoalEventType;
  event_date: string;
  binary_done?: boolean | null;
  count_value?: number | null;
  delta?: number | null;
}

interface StoredState {
  goals: Goal[];
  binary: Record<string, boolean>;
  counts: Record<string, number>;
  history: Record<string, number[]>;
  reminders: GoalReminder[];
  email: string;
  lastResetDateByGoal: Record<string, string>;
  lastWeekResetDateByGoal: Record<string, string>;
  lastMonthResetDateByGoal: Record<string, string>;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getWeekId(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return `${d.getFullYear()}-W${Math.ceil(((d.getTime() - week1.getTime()) / 86400000 + week1.getDay() + 1) / 7)}`;
}

function getMonthId(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function getDayOfWeekIndex() {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

const EMPTY_STATE: StoredState = {
  goals: [],
  binary: {},
  counts: {},
  history: {},
  reminders: [],
  email: "",
  lastResetDateByGoal: {},
  lastWeekResetDateByGoal: {},
  lastMonthResetDateByGoal: {},
};

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    frequency: row.frequency,
    type: row.type,
    target: row.target ?? undefined,
    label: row.label ?? undefined,
    streak: row.streak,
    createdAt: row.created_at,
  };
}

export function useGoalTracker(userId?: string) {
  const [state, setState] = useState<StoredState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromSupabase = useCallback(async () => {
    if (!userId) {
      setState(EMPTY_STATE);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [{ data: goalsData, error: goalsError }, { data: progressData, error: progressError }] = await Promise.all([
      supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("goal_progress").select("*").eq("user_id", userId),
    ]);

    if (goalsError || progressError) {
      console.error("Failed to load goals", goalsError ?? progressError);
      setIsLoading(false);
      return;
    }

    const binary: Record<string, boolean> = {};
    const counts: Record<string, number> = {};
    const history: Record<string, number[]> = {};
    const lastResetDateByGoal: Record<string, string> = {};
    const lastWeekResetDateByGoal: Record<string, string> = {};
    const lastMonthResetDateByGoal: Record<string, string> = {};

    (progressData as GoalProgressRow[]).forEach((row) => {
      binary[row.goal_id] = row.binary_done;
      counts[row.goal_id] = row.count_value;
      history[row.goal_id] = row.history ?? new Array(7).fill(0);
      lastResetDateByGoal[row.goal_id] = row.last_reset_date;
      lastWeekResetDateByGoal[row.goal_id] = row.last_week_reset_date;
      lastMonthResetDateByGoal[row.goal_id] = row.last_month_reset_date;
    });

    setState({
      goals: (goalsData as GoalRow[]).map(toGoal),
      binary,
      counts,
      history,
      reminders: [],
      email: "",
      lastResetDateByGoal,
      lastWeekResetDateByGoal,
      lastMonthResetDateByGoal,
    });
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);

  useEffect(() => {
    if (!userId || state.goals.length === 0) return;

    const today = getToday();
    const currentWeek = getWeekId(new Date());
    const currentMonth = getMonthId(new Date());

    setState((prev) => {
      const next = { ...prev };
      const updates: GoalProgressRow[] = [];

      const resetEvents: GoalEventInsert[] = [];

      for (const g of prev.goals) {
        const goalId = g.id;
        let binaryDone = prev.binary[goalId] ?? false;
        let countValue = prev.counts[goalId] ?? 0;
        let hist = [...(prev.history[goalId] || new Array(7).fill(0))];
        let lastResetDate = prev.lastResetDateByGoal[goalId] ?? today;
        let lastWeekResetDate = prev.lastWeekResetDateByGoal[goalId] ?? currentWeek;
        let lastMonthResetDate = prev.lastMonthResetDateByGoal[goalId] ?? currentMonth;
        let changed = false;

        if (lastResetDate !== today && g.frequency === "daily") {
          if (g.type === "binary") {
            const yesterdayIdx = (getDayOfWeekIndex() - 1 + 7) % 7;
            hist[yesterdayIdx] = binaryDone ? 1 : 0;
            binaryDone = false;
          }
          if (g.type === "count") countValue = 0;
          lastResetDate = today;
          resetEvents.push({
            user_id: userId,
            goal_id: goalId,
            event_type: "goal_reset_daily",
            event_date: today,
            binary_done: binaryDone,
            count_value: countValue,
            delta: null,
          });
          changed = true;
        }

        if (lastWeekResetDate !== currentWeek && g.frequency === "weekly") {
          if (g.type === "binary") binaryDone = false;
          if (g.type === "count") countValue = 0;
          hist = new Array(7).fill(0);
          lastWeekResetDate = currentWeek;
          resetEvents.push({
            user_id: userId,
            goal_id: goalId,
            event_type: "goal_reset_weekly",
            event_date: today,
            binary_done: binaryDone,
            count_value: countValue,
            delta: null,
          });
          changed = true;
        }

        if (lastMonthResetDate !== currentMonth && g.frequency === "monthly") {
          if (g.type === "binary") binaryDone = false;
          if (g.type === "count") countValue = 0;
          lastMonthResetDate = currentMonth;
          resetEvents.push({
            user_id: userId,
            goal_id: goalId,
            event_type: "goal_reset_monthly",
            event_date: today,
            binary_done: binaryDone,
            count_value: countValue,
            delta: null,
          });
          changed = true;
        }

        if (changed) {
          next.binary = { ...next.binary, [goalId]: binaryDone };
          next.counts = { ...next.counts, [goalId]: countValue };
          next.history = { ...next.history, [goalId]: hist };
          next.lastResetDateByGoal = { ...next.lastResetDateByGoal, [goalId]: lastResetDate };
          next.lastWeekResetDateByGoal = { ...next.lastWeekResetDateByGoal, [goalId]: lastWeekResetDate };
          next.lastMonthResetDateByGoal = { ...next.lastMonthResetDateByGoal, [goalId]: lastMonthResetDate };

          updates.push({
            goal_id: goalId,
            user_id: userId,
            binary_done: binaryDone,
            count_value: countValue,
            history: hist,
            last_reset_date: lastResetDate,
            last_week_reset_date: lastWeekResetDate,
            last_month_reset_date: lastMonthResetDate,
          });
        }
      }

      if (updates.length > 0) {
        supabase.from("goal_progress").upsert(updates).then(({ error }) => {
          if (error) console.error("Failed to persist reset updates", error);
        });

        if (resetEvents.length > 0) {
          supabase.from("goal_events").insert(resetEvents).then(({ error }) => {
            if (error) console.error("Failed to persist goal reset events", error);
          });
        }
      }

      return updates.length > 0 ? next : prev;
    });
  }, [state.goals, userId]);

  const goals = state.goals;
  const binary = state.binary;
  const counts = state.counts;
  const history = state.history;
  const email = state.email;
  const reminders = state.reminders;

  const isComplete = useCallback((g: Goal) => {
    if (g.type === "binary") return !!binary[g.id];
    if (g.type === "count") return (counts[g.id] ?? 0) >= (g.target ?? 0);
    return false;
  }, [binary, counts]);

  const persistProgress = useCallback(async (goalId: string, nextBinary: boolean, nextCount: number, nextHistory: number[]) => {
    if (!userId) return;
    const payload: GoalProgressRow = {
      goal_id: goalId,
      user_id: userId,
      binary_done: nextBinary,
      count_value: nextCount,
      history: nextHistory,
      last_reset_date: state.lastResetDateByGoal[goalId] ?? getToday(),
      last_week_reset_date: state.lastWeekResetDateByGoal[goalId] ?? getWeekId(new Date()),
      last_month_reset_date: state.lastMonthResetDateByGoal[goalId] ?? getMonthId(new Date()),
    };
    const { error } = await supabase.from("goal_progress").upsert(payload);
    if (error) console.error("Failed to sync goal progress", error);
  }, [state.lastMonthResetDateByGoal, state.lastResetDateByGoal, state.lastWeekResetDateByGoal, userId]);

  const persistGoalEvent = useCallback(async (event: Omit<GoalEventInsert, "user_id" | "event_date"> & { event_date?: string }) => {
    if (!userId) return;
    const payload: GoalEventInsert = {
      user_id: userId,
      goal_id: event.goal_id,
      event_type: event.event_type,
      event_date: event.event_date ?? getToday(),
      binary_done: event.binary_done ?? null,
      count_value: event.count_value ?? null,
      delta: event.delta ?? null,
    };

    const { error } = await supabase.from("goal_events").insert(payload);
    if (error) console.error("Failed to persist goal event", error);
  }, [userId]);

  const toggleBinary = useCallback((id: string) => {
    const nextValue = !binary[id];
    setState((p) => ({ ...p, binary: { ...p.binary, [id]: nextValue } }));
    void persistProgress(id, nextValue, counts[id] ?? 0, history[id] ?? new Array(7).fill(0));
    void persistGoalEvent({
      goal_id: id,
      event_type: "binary_toggled",
      binary_done: nextValue,
      count_value: counts[id] ?? 0,
      delta: null,
    });
  }, [binary, counts, history, persistGoalEvent, persistProgress]);

  const increment = useCallback((id: string, target: number) => {
    const current = counts[id] ?? 0;
    const nextCount = Math.min((counts[id] ?? 0) + 1, target);
    setState((p) => ({ ...p, counts: { ...p.counts, [id]: nextCount } }));
    void persistProgress(id, binary[id] ?? false, nextCount, history[id] ?? new Array(7).fill(0));
    if (nextCount !== current) {
      void persistGoalEvent({
        goal_id: id,
        event_type: "count_incremented",
        binary_done: binary[id] ?? false,
        count_value: nextCount,
        delta: nextCount - current,
      });
    }
  }, [binary, counts, history, persistGoalEvent, persistProgress]);

  const decrement = useCallback((id: string) => {
    const current = counts[id] ?? 0;
    const nextCount = Math.max((counts[id] ?? 0) - 1, 0);
    setState((p) => ({ ...p, counts: { ...p.counts, [id]: nextCount } }));
    void persistProgress(id, binary[id] ?? false, nextCount, history[id] ?? new Array(7).fill(0));
    if (nextCount !== current) {
      void persistGoalEvent({
        goal_id: id,
        event_type: "count_decremented",
        binary_done: binary[id] ?? false,
        count_value: nextCount,
        delta: nextCount - current,
      });
    }
  }, [binary, counts, history, persistGoalEvent, persistProgress]);

  const addGoal = useCallback(async (title: string, frequency: GoalFrequency, type: GoalType, target?: number, label?: string) => {
    if (!userId) return;

    const tempId = `tmp-${Date.now()}`;
    const today = getToday();
    const week = getWeekId(new Date());
    const month = getMonthId(new Date());

    setState((p) => ({
      ...p,
      goals: [...p.goals, { id: tempId, title, frequency, type, target, label, streak: 0, createdAt: new Date().toISOString() }],
      binary: { ...p.binary, [tempId]: false },
      counts: { ...p.counts, [tempId]: 0 },
      history: { ...p.history, [tempId]: new Array(7).fill(0) },
      lastResetDateByGoal: { ...p.lastResetDateByGoal, [tempId]: today },
      lastWeekResetDateByGoal: { ...p.lastWeekResetDateByGoal, [tempId]: week },
      lastMonthResetDateByGoal: { ...p.lastMonthResetDateByGoal, [tempId]: month },
    }));

    const { data, error } = await supabase.from("goals").insert({
      user_id: userId,
      title,
      frequency,
      type,
      target: target ?? null,
      label: label ?? null,
      streak: 0,
    }).select("id, created_at").single();

    if (error || !data) {
      console.error("Failed to add goal", error);
      setState((p) => ({ ...p, goals: p.goals.filter((g) => g.id !== tempId) }));
      return;
    }

    const realId = data.id as string;
    await supabase.from("goal_progress").insert({
      goal_id: realId,
      user_id: userId,
      binary_done: false,
      count_value: 0,
      history: new Array(7).fill(0),
      last_reset_date: today,
      last_week_reset_date: week,
      last_month_reset_date: month,
    });

    void persistGoalEvent({
      goal_id: realId,
      event_type: "goal_created",
      binary_done: false,
      count_value: 0,
      delta: null,
      event_date: today,
    });

    setState((p) => {
      const goals = p.goals.map((g) => g.id === tempId ? { ...g, id: realId, createdAt: data.created_at as string } : g);
      const { [tempId]: tempBinary, ...restBinary } = p.binary;
      const { [tempId]: tempCount, ...restCounts } = p.counts;
      const { [tempId]: tempHistory, ...restHistory } = p.history;
      const { [tempId]: tempDaily, ...restDaily } = p.lastResetDateByGoal;
      const { [tempId]: tempWeekly, ...restWeekly } = p.lastWeekResetDateByGoal;
      const { [tempId]: tempMonthly, ...restMonthly } = p.lastMonthResetDateByGoal;
      return {
        ...p,
        goals,
        binary: { ...restBinary, [realId]: tempBinary ?? false },
        counts: { ...restCounts, [realId]: tempCount ?? 0 },
        history: { ...restHistory, [realId]: tempHistory ?? new Array(7).fill(0) },
        lastResetDateByGoal: { ...restDaily, [realId]: tempDaily ?? today },
        lastWeekResetDateByGoal: { ...restWeekly, [realId]: tempWeekly ?? week },
        lastMonthResetDateByGoal: { ...restMonthly, [realId]: tempMonthly ?? month },
      };
    });
  }, [persistGoalEvent, userId]);

  const deleteGoal = useCallback(async (id: string) => {
    const snapshot = state;
    const deletedBinary = state.binary[id] ?? false;
    const deletedCount = state.counts[id] ?? 0;
    setState((p) => {
      const newGoals = p.goals.filter((g) => g.id !== id);
      const newBinary = { ...p.binary };
      const newCounts = { ...p.counts };
      const newHistory = { ...p.history };
      const newReminders = ENABLE_REMINDERS ? p.reminders.filter((r) => r.goalId !== id) : p.reminders;
      delete newBinary[id];
      delete newCounts[id];
      delete newHistory[id];
      return { ...p, goals: newGoals, binary: newBinary, counts: newCounts, history: newHistory, reminders: newReminders };
    });

    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete goal", error);
      setState(snapshot);
      return;
    }

    void persistGoalEvent({
      goal_id: id,
      event_type: "goal_deleted",
      binary_done: deletedBinary,
      count_value: deletedCount,
      delta: null,
    });
  }, [persistGoalEvent, state]);

  const setEmail = useCallback((nextEmail: string) => {
    if (!ENABLE_REMINDERS) return;
    setState((p) => ({ ...p, email: nextEmail }));
  }, []);

  const setReminder = useCallback((goalId: string, time: ReminderTime) => {
    if (!ENABLE_REMINDERS) return;
    setState((p) => {
      const filtered = p.reminders.filter((r) => r.goalId !== goalId);
      if (time === "none") return { ...p, reminders: filtered };
      return { ...p, reminders: [...filtered, { goalId, time }] };
    });
  }, []);

  const getReminder = useCallback((goalId: string): ReminderTime => {
    if (!ENABLE_REMINDERS) return "none";
    return reminders.find((r) => r.goalId === goalId)?.time ?? "none";
  }, [reminders]);

  const completedCount = goals.filter(isComplete).length;
  const todayIndex = getDayOfWeekIndex();

  return {
    goals, binary, counts, history, email, completedCount, isLoading,
    todayIndex, isComplete, toggleBinary, increment, decrement,
    addGoal, deleteGoal, setEmail, setReminder, getReminder, reminderEnabled: ENABLE_REMINDERS,
  };
}
