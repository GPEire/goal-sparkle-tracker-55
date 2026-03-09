import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useGoalTracker } from "@/hooks/useGoalTracker";
import { AddGoalForm } from "@/components/AddGoalForm";
import { TodayView } from "@/components/TodayView";
import { ProgressView } from "@/components/ProgressView";
import type { ViewTab } from "@/types/goal";

const TABS: ViewTab[] = ["today", "progress"];

const Index = () => {
  const [view, setView] = useState<ViewTab>("today");
  const [showAdd, setShowAdd] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const tracker = useGoalTracker(session?.user.id);
  const { goals, completedCount } = tracker;

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleMagicLinkSignIn = async () => {
    const email = window.prompt("Enter your email for a magic link:");
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      window.alert("Unable to send magic link. Please try again.");
      return;
    }

    window.alert("Magic link sent. Check your email to continue.");
  };

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading session…</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-[420px] border border-border rounded-md p-6 space-y-4">
          <h1 className="font-display text-2xl text-foreground tracking-tight">Goal Sparkle Tracker</h1>
          <p className="text-sm text-muted-foreground">Sign in to sync your goals across devices.</p>
          <button onClick={handleGoogleSignIn} className="w-full py-2.5 rounded-sm bg-foreground text-background text-sm">
            Continue with Google
          </button>
          <button onClick={handleMagicLinkSignIn} className="w-full py-2.5 rounded-sm border border-border text-sm">
            Continue with magic link
          </button>
        </div>
      </div>
    );
  }

  const totalGoals = goals.length;
  const allDone = completedCount === totalGoals && totalGoals > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4">
      <div className="w-full max-w-[420px] pt-12">
        <div className="flex justify-between items-center mb-6">
          <div className="text-xs text-muted-foreground">{session.user.email}</div>
          <button className="text-xs underline" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>

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

        <div className="mb-8">
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: totalGoals > 0 ? `${(completedCount / totalGoals) * 100}%` : "0%" }}
            />
          </div>
        </div>

        {showAdd && (
          <AddGoalForm onAdd={tracker.addGoal} onClose={() => setShowAdd(false)} />
        )}

        <div className="flex gap-6 mb-7 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`nav-tab ${view === tab ? "nav-tab-active" : ""}`}
              onClick={() => setView(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {tracker.isLoading ? (
          <div className="text-sm text-muted-foreground py-8">Loading goals…</div>
        ) : (
          <>
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
          </>
        )}

        <div className="h-16" />
      </div>
    </div>
  );
};

export default Index;
