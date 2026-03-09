export type GoalFrequency = "daily" | "weekly" | "monthly";
export type GoalType = "binary" | "count";
export type ReminderTime = "none" | "morning" | "evening" | "weekly-digest";

export interface Goal {
  id: number;
  title: string;
  frequency: GoalFrequency;
  type: GoalType;
  target?: number;
  label?: string;
  streak: number;
  createdAt: string;
}

export interface GoalReminder {
  goalId: number;
  time: ReminderTime;
}

export type ViewTab = "today" | "progress" | "reminders";

export const GROUP_ORDER: GoalFrequency[] = ["daily", "weekly", "monthly"];
export const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export const REMINDER_OPTIONS: { value: ReminderTime; label: string }[] = [
  { value: "none", label: "No reminder" },
  { value: "morning", label: "Morning (9am)" },
  { value: "evening", label: "Evening (6pm)" },
  { value: "weekly-digest", label: "Weekly digest" },
];
