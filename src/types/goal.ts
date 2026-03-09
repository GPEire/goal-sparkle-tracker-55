export type GoalFrequency = "daily" | "weekly" | "monthly";
export type GoalType = "binary" | "count";

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

export type GoalEventType = "completion" | "uncompletion" | "count_increment" | "count_decrement";

export interface GoalEvent {
  id: number;
  user_id: string;
  goal_id: number;
  event_type: GoalEventType;
  delta: number;
  effective_date: string;
  created_at: string;
}

export interface GoalProgressRow {
  id: number;
  user_id: string;
  goal_id: number;
  binary_value: boolean;
  count_value: number;
  updated_at: string;
}

export type ViewTab = "today" | "progress";

export const GROUP_ORDER: GoalFrequency[] = ["daily", "weekly", "monthly"];
export const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
