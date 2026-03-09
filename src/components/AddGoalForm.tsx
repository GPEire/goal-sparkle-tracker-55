import { useState } from "react";
import type { GoalFrequency, GoalType } from "@/types/goal";

interface AddGoalFormProps {
  onAdd: (title: string, frequency: GoalFrequency, type: GoalType, target?: number, label?: string) => void;
  onClose: () => void;
}

export function AddGoalForm({ onAdd, onClose }: AddGoalFormProps) {
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<GoalFrequency>("weekly");
  const [type, setType] = useState<GoalType>("binary");
  const [target, setTarget] = useState(3);
  const [label, setLabel] = useState("");

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), frequency, type, type === "count" ? target : undefined, label || undefined);
    onClose();
  };

  return (
    <div className="slide-in mb-7 py-4 border-t border-b border-border">
      <div className="mb-3.5">
        <input
          type="text"
          className="goal-input"
          placeholder="Goal title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          autoFocus
        />
      </div>
      <div className="flex gap-4 mb-3.5 flex-wrap">
        <div className="flex-1">
          <div className="label-uppercase mb-1.5">Frequency</div>
          <select className="goal-select text-xs" value={frequency} onChange={e => setFrequency(e.target.value as GoalFrequency)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex-1">
          <div className="label-uppercase mb-1.5">Type</div>
          <select className="goal-select text-xs" value={type} onChange={e => setType(e.target.value as GoalType)}>
            <option value="binary">Once (done/not done)</option>
            <option value="count">Count-based</option>
          </select>
        </div>
      </div>

      {type === "count" && (
        <div className="slide-in flex gap-4 mb-3.5">
          <div className="flex-1">
            <div className="label-uppercase mb-1.5">Target</div>
            <input type="number" className="goal-input w-12" min={2} max={99} value={target} onChange={e => setTarget(Number(e.target.value))} />
          </div>
          <div className="flex-[2]">
            <div className="label-uppercase mb-1.5">Unit (optional)</div>
            <input type="text" className="goal-input" placeholder="e.g. meals, pages, km" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
        </div>
      )}

      <button onClick={handleAdd} className="text-[10px] tracking-[0.12em] uppercase text-foreground border-b border-foreground pb-px">
        Add goal
      </button>
    </div>
  );
}
