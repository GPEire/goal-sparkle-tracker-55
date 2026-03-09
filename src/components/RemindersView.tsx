import type { Goal, ReminderTime } from "@/types/goal";
import { REMINDER_OPTIONS } from "@/types/goal";
import { toast } from "sonner";

interface RemindersViewProps {
  goals: Goal[];
  email: string;
  setEmail: (e: string) => void;
  getReminder: (goalId: string) => ReminderTime;
  setReminder: (goalId: string, time: ReminderTime) => void;
}

export function RemindersView({ goals, email, setEmail, getReminder, setReminder }: RemindersViewProps) {
  const handleSave = () => {
    toast.success("Reminder preferences saved");
  };

  return (
    <div className="slide-in">
      <div className="label-uppercase tracking-[0.16em] mb-6">Email reminders</div>

      <div className="mb-6">
        <div className="label-uppercase mb-2">Address</div>
        <input
          type="email"
          className="goal-input"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      {goals.map((g, gi) => (
        <div
          key={g.id}
          className="py-3.5"
          style={{ borderBottom: gi < goals.length - 1 ? "1px solid hsl(var(--border) / 0.6)" : "none" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[13px] text-foreground">{g.title}</span>
              {g.type === "count" && (
                <span className="text-[10px] text-muted-foreground ml-2">{g.target} {g.label}</span>
              )}
            </div>
            <span className="freq-tag">{g.frequency}</span>
          </div>
          <select
            className="goal-select text-[11px] w-auto"
            value={getReminder(g.id)}
            onChange={e => setReminder(g.id, e.target.value as ReminderTime)}
          >
            {REMINDER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}

      <button className="btn-save mt-8" onClick={handleSave}>
        Save preferences
      </button>
    </div>
  );
}
