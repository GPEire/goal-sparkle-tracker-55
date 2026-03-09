import type { Goal } from "@/types/goal";
import { WEEK_LABELS } from "@/types/goal";

interface ProgressViewProps {
  goals: Goal[];
  history: Record<number, number[]>;
  counts: Record<number, number>;
  todayIndex: number;
  completedCount: number;
}

export function ProgressView({ goals, history, counts, todayIndex, completedCount }: ProgressViewProps) {
  const totalGoals = goals.length;
  const weekPercent = totalGoals > 0 ? Math.round((completedCount / totalGoals) * 100) : 0;
  const bestStreak = goals.reduce((max, g) => Math.max(max, g.streak), 0);

  // Find first count goal for summary
  const countGoal = goals.find(g => g.type === "count");

  const stats = [
    { label: "Best streak", value: `${bestStreak}d` },
    { label: "This week", value: `${weekPercent}%` },
    { label: "This month", value: `${Math.round(weekPercent * 0.93)}%` },
  ];

  return (
    <div className="slide-in">
      <div className="label-uppercase tracking-[0.16em] mb-5">This week</div>

      {/* Week header */}
      <div className="flex gap-0 mb-1" style={{ paddingLeft: 180 }}>
        {WEEK_LABELS.map((d, i) => (
          <div
            key={i}
            className="w-7 text-center text-[9px] tracking-[0.1em]"
            style={{
              color: i === todayIndex ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              fontWeight: i === todayIndex ? 500 : 300,
            }}
          >{d}</div>
        ))}
      </div>

      {/* Goal rows */}
      {goals.map((g, gi) => (
        <div
          key={g.id}
          className="flex items-center py-3"
          style={{ borderBottom: gi < goals.length - 1 ? "1px solid hsl(var(--border) / 0.6)" : "none" }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs text-foreground tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: 168 }}>
              {g.title}
            </div>
            <div className="flex gap-1.5 items-center mt-0.5">
              <span className="freq-tag">{g.frequency}</span>
              {g.type === "count" && <span className="text-[9px] text-muted-foreground">goal: {g.target} {g.label}</span>}
              {g.type === "binary" && <span className="text-[10px] text-muted-foreground">{g.streak}d streak</span>}
            </div>
          </div>
          <div className="flex gap-0">
            {WEEK_LABELS.map((_, i) => {
              const val = history[g.id]?.[i] ?? 0;
              let cls = "dot-empty";
              if (g.type === "binary" && val === 1) cls = "dot-filled";
              if (g.type === "count" && val > 0) cls = val >= (g.target ?? 0) ? "dot-filled" : "dot-partial";
              return (
                <div key={i} className="w-7 flex items-center justify-center">
                  <div className={`dot ${cls}`} style={{ opacity: i > todayIndex ? 0.25 : 1 }} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Count goal summary */}
      {countGoal && (
        <div className="mt-7 p-4 rounded-sm" style={{ background: "hsl(var(--surface-inset))" }}>
          <div className="label-uppercase mb-2.5">{countGoal.title} this week</div>
          <div className="flex gap-1.5 mb-2">
            {Array.from({ length: countGoal.target ?? 0 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[3px] rounded-sm transition-colors duration-200"
                style={{ background: i < (counts[countGoal.id] ?? 0) ? "hsl(var(--foreground))" : "hsl(var(--border))" }}
              />
            ))}
          </div>
          <div className="text-[13px] text-foreground">
            {counts[countGoal.id] ?? 0} of {countGoal.target} {countGoal.label || "done"}
            <span className="text-muted-foreground text-[11px] ml-2">
              — {(countGoal.target ?? 0) - (counts[countGoal.id] ?? 0)} remaining
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-7 grid grid-cols-3">
        {stats.map(s => (
          <div key={s.label} className="py-4 border-t border-border">
            <div className="text-xl font-display text-foreground mb-1">{s.value}</div>
            <div className="label-uppercase">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
