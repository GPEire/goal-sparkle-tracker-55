import { useState } from "react";
import { format } from "date-fns";
import { useGoalTracker } from "@/hooks/useGoalTracker";
import { AddGoalForm } from "@/components/AddGoalForm";
import { TodayView } from "@/components/TodayView";
import { ProgressView } from "@/components/ProgressView";
import type { ViewTab } from "@/types/goal";

const TABS: ViewTab[] = ["today", "progress"];

const Index = () => {
  const [view, setView] = useState<ViewTab>("today");
  const [showAdd, setShowAdd] = useState(false);
  const tracker = useGoalTracker();

  const { goals, completedCount } = tracker;
  const totalGoals = goals.length;
  const allDone = completedCount === totalGoals && totalGoals > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4">
      <div className="w-full max-w-[420px] pt-12">
        {/* Header */}
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="label-uppercase tracking-[0.15em] mb-1.5">
              {format(new Date(), "EEEE, MMM d")}
            </div>
            <div className="font-display text-[26px] text-foreground tracking-tight">
              {allDone ? "All done." : `${completedCount} of ${totalGoals}`}
            </div>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="check-circle text-lg"
            style={{ width: 32, height: 32 }}
          >
            {showAdd ? "×" : "+"}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: totalGoals > 0 ? `${(completedCount / totalGoals) * 100}%` : "0%" }}
            />
          </div>
        </div>

        {/* Add goal form */}
        {showAdd && (
          <AddGoalForm onAdd={tracker.addGoal} onClose={() => setShowAdd(false)} />
        )}

        {/* Navigation */}
        <div className="flex gap-6 mb-7 border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`nav-tab ${view === tab ? "nav-tab-active" : ""}`}
              onClick={() => setView(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Views */}
        {view === "today" && (
          <TodayView
            goals={tracker.goals}
            isComplete={tracker.isComplete}
            counts={tracker.counts}
            toggleBinary={tracker.toggleBinary}
            increment={tracker.increment}
            decrement={tracker.decrement}
          />
        )}

        {view === "progress" && (
          <ProgressView
            goals={tracker.goals}
            history={tracker.history}
            counts={tracker.counts}
            todayIndex={tracker.todayIndex}
            completedCount={tracker.completedCount}
          />
        )}

        <div className="h-16" />
      </div>
    </div>
  );
};

export default Index;
