export type GoalEventType =
  | "goal_created"
  | "goal_deleted"
  | "binary_toggled"
  | "count_incremented"
  | "count_decremented"
  | "goal_reset_daily"
  | "goal_reset_weekly"
  | "goal_reset_monthly";

export interface GoalEvent {
  id: string;
  userId: string;
  goalId: string;
  eventType: GoalEventType;
  eventDate: string;
  binaryDone: boolean | null;
  countValue: number | null;
  delta: number | null;
  createdAt: string;
}

interface GoalEventRow {
  id: string;
  user_id: string;
  goal_id: string;
  event_type: GoalEventType;
  event_date: string;
  binary_done: boolean | null;
  count_value: number | null;
  delta: number | null;
  created_at: string;
}

interface SupabaseLike {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (column: string, opts: { ascending: boolean }) => {
            limit: (count: number) => Promise<{ data: GoalEventRow[] | null; error: { message: string } | null }>;
          };
        };
        order: (column: string, opts: { ascending: boolean }) => {
          order: (column: string, opts: { ascending: boolean }) => Promise<{ data: GoalEventRow[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
}


async function getDefaultClient(): Promise<SupabaseLike> {
  const mod = await import("@/lib/supabase");
  return mod.supabase as unknown as SupabaseLike;
}

function formatLocalDay(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function mapEventRow(row: GoalEventRow): GoalEvent {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    eventType: row.event_type,
    eventDate: row.event_date,
    binaryDone: row.binary_done,
    countValue: row.count_value,
    delta: row.delta,
    createdAt: row.created_at,
  };
}

export async function listRecentEvents(userId: string, limit = 50, client?: SupabaseLike) {
  const effectiveClient = client ?? (await getDefaultClient());

  const { data, error } = await effectiveClient
    .from("goal_events")
    .select("id,user_id,goal_id,event_type,event_date,binary_done,count_value,delta,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list recent events: ${error.message}`);
  return (data ?? []).map(mapEventRow);
}

export interface DailyCompletionPoint {
  date: string;
  completed: boolean;
  eventCount: number;
}

export function buildDailyCompletionSeries(events: GoalEvent[], days: number, today = new Date()): DailyCompletionPoint[] {
  const eventMap = new Map<string, GoalEvent[]>();
  for (const event of events) {
    const list = eventMap.get(event.eventDate) ?? [];
    list.push(event);
    eventMap.set(event.eventDate, list);
  }

  const points: DailyCompletionPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const dayKey = formatLocalDay(date);
    const dayEvents = eventMap.get(dayKey) ?? [];

    const completed = dayEvents.some((event) => {
      if (typeof event.binaryDone === "boolean") return event.binaryDone;
      if (typeof event.countValue === "number") return event.countValue > 0;
      return false;
    });

    points.push({
      date: dayKey,
      completed,
      eventCount: dayEvents.length,
    });
  }

  return points;
}

export async function getDailyCompletionSeries(
  userId: string,
  goalId: string,
  days = 30,
  client?: SupabaseLike,
) {
  const effectiveClient = client ?? (await getDefaultClient());

  const { data, error } = await effectiveClient
    .from("goal_events")
    .select("id,user_id,goal_id,event_type,event_date,binary_done,count_value,delta,created_at")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load daily completion series: ${error.message}`);

  const events = (data ?? []).map(mapEventRow);
  return buildDailyCompletionSeries(events, days);
}
