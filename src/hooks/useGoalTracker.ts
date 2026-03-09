import { useState, useCallback, useEffect } from "react";
import type { Goal, GoalFrequency, GoalType, GoalReminder, ReminderTime } from "@/types/goal";

const ENABLE_REMINDERS = false;

const STORAGE_KEY = "goal-tracker";

interface StoredState {
  goals: Goal[];
  binary: Record<number, boolean>;
  counts: Record<number, number>;
  history: Record<number, number[]>;
  reminders: GoalReminder[];
  email: string;
  lastResetDate: string;
  lastWeekResetDate: string;
  lastMonthResetDate: string;
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
  return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
}

const DEFAULT_GOALS: Goal[] = [
  { id: 1, title: "Morning meditation", frequency: "daily", type: "binary", streak: 12, createdAt: getToday() },
  { id: 2, title: "Read 20 pages", frequency: "daily", type: "binary", streak: 4, createdAt: getToday() },
  { id: 3, title: "Meal prep", frequency: "weekly", type: "count", target: 3, streak: 6, label: "meals", createdAt: getToday() },
  { id: 4, title: "Deep work session", frequency: "daily", type: "binary", streak: 8, createdAt: getToday() },
  { id: 5, title: "Weekly review", frequency: "weekly", type: "binary", streak: 6, createdAt: getToday() },
  { id: 6, title: "Monthly planning", frequency: "monthly", type: "binary", streak: 3, createdAt: getToday() },
];

const DEFAULT_HISTORY: Record<number, number[]> = {
  1: [1, 1, 1, 1, 1, 0, 1],
  2: [1, 0, 1, 1, 0, 0, 1],
  3: [0, 1, 0, 1, 0, 0, 0],
  4: [1, 1, 0, 1, 1, 0, 0],
  5: [0, 0, 0, 0, 1, 0, 0],
  6: [0, 0, 0, 0, 0, 0, 0],
};

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    goals: DEFAULT_GOALS,
    binary: { 1: false, 2: true, 4: true, 5: false, 6: false },
    counts: { 3: 1 },
    history: DEFAULT_HISTORY,
    reminders: [],
    email: "",
    lastResetDate: getToday(),
    lastWeekResetDate: getWeekId(new Date()),
    lastMonthResetDate: getMonthId(new Date()),
  };
}

export function useGoalTracker() {
  const [state, setState] = useState<StoredState>(loadState);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Period rollover check
  useEffect(() => {
    const today = getToday();
    const currentWeek = getWeekId(new Date());
    const currentMonth = getMonthId(new Date());

    setState(prev => {
      let updated = { ...prev };
      let needsUpdate = false;

      // Daily reset
      if (prev.lastResetDate !== today) {
        const dailyGoals = prev.goals.filter(g => g.frequency === "daily");
        const newBinary = { ...prev.binary };
        const newHistory = { ...prev.history };

        dailyGoals.forEach(g => {
          if (g.type === "binary") {
            // Save yesterday's status to history
            const hist = [...(newHistory[g.id] || new Array(7).fill(0))];
            const yesterdayIdx = (getDayOfWeekIndex() - 1 + 7) % 7;
            hist[yesterdayIdx] = newBinary[g.id] ? 1 : 0;
            newHistory[g.id] = hist;
            newBinary[g.id] = false;
          }
        });

        updated = { ...updated, binary: newBinary, history: newHistory, lastResetDate: today };
        needsUpdate = true;
      }

      // Weekly reset
      if (prev.lastWeekResetDate !== currentWeek) {
        const weeklyGoals = prev.goals.filter(g => g.frequency === "weekly");
        const newBinary = { ...updated.binary };
        const newCounts = { ...updated.counts };
        const newHistory = { ...updated.history };

        weeklyGoals.forEach(g => {
          if (g.type === "binary") newBinary[g.id] = false;
          if (g.type === "count") newCounts[g.id] = 0;
          newHistory[g.id] = new Array(7).fill(0);
        });

        // Also reset daily histories for new week
        prev.goals.filter(g => g.frequency === "daily").forEach(g => {
          newHistory[g.id] = new Array(7).fill(0);
        });

        updated = { ...updated, binary: newBinary, counts: newCounts, history: newHistory, lastWeekResetDate: currentWeek };
        needsUpdate = true;
      }

      // Monthly reset
      if (prev.lastMonthResetDate !== currentMonth) {
        const monthlyGoals = prev.goals.filter(g => g.frequency === "monthly");
        const newBinary = { ...updated.binary };

        monthlyGoals.forEach(g => {
          if (g.type === "binary") newBinary[g.id] = false;
        });

        updated = { ...updated, binary: newBinary, lastMonthResetDate: currentMonth };
        needsUpdate = true;
      }

      return needsUpdate ? updated : prev;
    });
  }, []);

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

  const toggleBinary = useCallback((id: number) => {
    setState(p => ({ ...p, binary: { ...p.binary, [id]: !p.binary[id] } }));
  }, []);

  const increment = useCallback((id: number, target: number) => {
    setState(p => ({ ...p, counts: { ...p.counts, [id]: Math.min((p.counts[id] ?? 0) + 1, target) } }));
  }, []);

  const decrement = useCallback((id: number) => {
    setState(p => ({ ...p, counts: { ...p.counts, [id]: Math.max((p.counts[id] ?? 0) - 1, 0) } }));
  }, []);

  const addGoal = useCallback((title: string, frequency: GoalFrequency, type: GoalType, target?: number, label?: string) => {
    const id = Date.now();
    setState(p => ({
      ...p,
      goals: [...p.goals, { id, title, frequency, type, target, label, streak: 0, createdAt: getToday() }],
      ...(type === "count" ? { counts: { ...p.counts, [id]: 0 } } : {}),
      history: { ...p.history, [id]: new Array(7).fill(0) },
    }));
  }, []);

  const deleteGoal = useCallback((id: number) => {
    setState(p => {
      const newGoals = p.goals.filter(g => g.id !== id);
      const newBinary = { ...p.binary };
      const newCounts = { ...p.counts };
      const newHistory = { ...p.history };
      const newReminders = ENABLE_REMINDERS ? p.reminders.filter(r => r.goalId !== id) : p.reminders;
      delete newBinary[id];
      delete newCounts[id];
      delete newHistory[id];
      return { ...p, goals: newGoals, binary: newBinary, counts: newCounts, history: newHistory, reminders: newReminders };
    });
  }, []);

  const setEmail = useCallback((nextEmail: string) => {
    if (!ENABLE_REMINDERS) return;
    setState(p => ({ ...p, email: nextEmail }));
  }, []);

  const setReminder = useCallback((goalId: number, time: ReminderTime) => {
    if (!ENABLE_REMINDERS) return;
    setState(p => {
      const filtered = p.reminders.filter(r => r.goalId !== goalId);
      if (time === "none") return { ...p, reminders: filtered };
      return { ...p, reminders: [...filtered, { goalId, time }] };
    });
  }, []);

  const getReminder = useCallback((goalId: number): ReminderTime => {
    if (!ENABLE_REMINDERS) return "none";
    return reminders.find(r => r.goalId === goalId)?.time ?? "none";
  }, [reminders]);

  const completedCount = goals.filter(isComplete).length;
  const todayIndex = getDayOfWeekIndex();

  return {
    goals, binary, counts, history, email, completedCount,
    todayIndex, isComplete, toggleBinary, increment, decrement,
    addGoal, deleteGoal, setEmail, setReminder, getReminder, reminderEnabled: ENABLE_REMINDERS,
  };
}
