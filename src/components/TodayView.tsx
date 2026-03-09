import type { Goal } from "@/types/goal";
import { GROUP_ORDER } from "@/types/goal";
import { CheckCircle } from "./CheckCircle";

interface TodayViewProps {
  goals: Goal[];
  isComplete: (g: Goal) => boolean;
  counts: Record<number, number>;
  toggleBinary: (id: number) => void;
  increment: (id: number, target: number) => void;
  decrement: (id: number) => void;
}

export function TodayView({
  goals, isComplete, counts,
  toggleBinary, increment, decrement,
}: TodayViewProps) {
  return (
    <div className="slide-in">
      {GROUP_ORDER.map(freq => {
        const group = goals.filter(g => g.frequency === freq);
        if (!group.length) return null;
        return (
          <div key={freq} className="mb-8">
            <div className="label-uppercase mb-3.5 tracking-[0.16em]">{freq}</div>
            {group.map((g, i) => {
              const done = isComplete(g);
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-3.5 py-3.5 transition-opacity hover:opacity-80"
                  style={{ borderBottom: i < group.length - 1 ? "1px solid hsl(var(--border) / 0.6)" : "none" }}
                >
                  {g.type === "binary" && (
                    <CheckCircle done={done} onClick={() => toggleBinary(g.id)} />
                  )}

                  {g.type === "count" && (
                    <CheckCircle done={done} showCount={done ? undefined : (counts[g.id] ?? 0)} onClick={done ? undefined : () => increment(g.id, g.target ?? 0)} />
                  )}

                  <span
                    className="text-sm flex-1 tracking-tight transition-all duration-200"
                    style={{
                      color: done ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                      textDecoration: done ? "line-through" : "none",
                    }}
                  >
                    {g.title}
                  </span>

                  {g.type === "binary" && (
                    <span className="text-[10px] text-muted-foreground">{g.streak}d</span>
                  )}

                  {g.type === "count" && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1 items-center">
                        {Array.from({ length: g.target ?? 0 }).map((_, pi) => (
                          <div key={pi} className={`pip ${pi < (counts[g.id] ?? 0) ? "pip-filled" : "pip-empty"}`} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <button className="step-btn" onClick={() => decrement(g.id)} disabled={(counts[g.id] ?? 0) === 0} style={{ fontSize: 16, paddingBottom: 1 }}>−</button>
                        <span className="text-[11px] min-w-[28px] text-center" style={{ color: done ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}>
                          {counts[g.id] ?? 0}/{g.target}
                          {g.label && <span className="text-[9px] text-muted-foreground ml-0.5">{g.label}</span>}
                        </span>
                        <button className="step-btn" onClick={() => increment(g.id, g.target ?? 0)} disabled={(counts[g.id] ?? 0) >= (g.target ?? 0)}>+</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
