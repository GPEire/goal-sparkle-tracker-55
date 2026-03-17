import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Goal } from "@/types/goal";

interface VoiceUpdate {
  goalId: string;
  action: "toggle_complete" | "increment";
  amount?: number;
}

interface VoiceInputProps {
  goals: Goal[];
  counts: Record<string, number>;
  binary: Record<string, boolean>;
  onToggleBinary: (id: string) => void;
  onIncrement: (id: string, target: number) => void;
}

type Status = "idle" | "recording" | "processing" | "done" | "error";

// Narrow the Web Speech API types since lib.dom.d.ts may not include them
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => WebSpeechRecognition;
    webkitSpeechRecognition?: new () => WebSpeechRecognition;
  }
}

function getSpeechRecognition(): WebSpeechRecognition | null {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

export function VoiceInput({ goals, counts, binary, onToggleBinary, onIncrement }: VoiceInputProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [appliedCount, setAppliedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const applyUpdates = useCallback(
    async (text: string) => {
      setStatus("processing");

      const goalPayload = goals.map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        target: g.target,
        label: g.label,
        frequency: g.frequency,
        currentCount: counts[g.id] ?? 0,
        currentBinary: binary[g.id] ?? false,
      }));

      try {
        const { data, error } = await supabase.functions.invoke("voice-update", {
          body: { transcript: text, goals: goalPayload },
        });

        if (error) throw error;

        const updates: VoiceUpdate[] = data?.updates ?? [];
        let applied = 0;

        for (const update of updates) {
          const goal = goals.find((g) => g.id === update.goalId);
          if (!goal) continue;

          if (update.action === "toggle_complete" && goal.type === "binary") {
            if (!(binary[goal.id] ?? false)) {
              onToggleBinary(goal.id);
              applied++;
            }
          } else if (update.action === "increment" && goal.type === "count") {
            const amount = Math.max(1, update.amount ?? 1);
            const remaining = (goal.target ?? 0) - (counts[goal.id] ?? 0);
            const toAdd = Math.min(amount, remaining);
            for (let i = 0; i < toAdd; i++) {
              onIncrement(goal.id, goal.target ?? 0);
            }
            if (toAdd > 0) applied++;
          }
        }

        setAppliedCount(applied);
        setStatus("done");
      } catch (err) {
        console.error("voice-update failed:", err);
        setErrorMsg("Could not reach the update service. Please try again.");
        setStatus("error");
      }
    },
    [goals, counts, binary, onToggleBinary, onIncrement]
  );

  const startRecording = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setErrorMsg("Speech recognition is not supported in this browser. Try Chrome or Safari.");
      setStatus("error");
      return;
    }

    setTranscript("");
    setAppliedCount(0);
    setErrorMsg("");
    setStatus("recording");

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      setTranscript(text);
    };

    recognition.onerror = () => {
      setErrorMsg("Microphone error. Check permissions and try again.");
      setStatus("error");
    };

    recognition.onend = () => {
      if (status !== "error") {
        // transcript captured via onresult; apply once recognition ends
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [status]);

  // Trigger applyUpdates once transcript is set after recording ends
  const handleStopAndProcess = useCallback(() => {
    stopRecording();
    // Give onresult a tick to fire before we read transcript
    setTimeout(() => {
      setTranscript((current) => {
        if (current) {
          applyUpdates(current);
        } else {
          setStatus("idle");
        }
        return current;
      });
    }, 300);
  }, [stopRecording, applyUpdates]);

  const reset = () => {
    setStatus("idle");
    setTranscript("");
    setAppliedCount(0);
    setErrorMsg("");
  };

  if (goals.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-6">
      {status === "idle" && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-sm px-3 py-2 hover:border-foreground transition-colors w-full"
        >
          <MicIcon />
          <span>Speak an update…</span>
        </button>
      )}

      {status === "recording" && (
        <div className="flex items-center gap-3 border border-foreground rounded-sm px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-foreground animate-pulse flex-shrink-0" />
          <span className="text-xs text-foreground flex-1">Listening…</span>
          <button onClick={handleStopAndProcess} className="text-[10px] uppercase tracking-widest underline">
            Done
          </button>
        </div>
      )}

      {status === "processing" && (
        <div className="flex items-center gap-2 border border-border rounded-sm px-3 py-2">
          <span className="w-2 h-2 rounded-full border border-muted-foreground animate-spin flex-shrink-0" />
          <span className="text-xs text-muted-foreground">Parsing "{transcript}"…</span>
        </div>
      )}

      {status === "done" && (
        <div className="flex items-center justify-between border border-border rounded-sm px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {appliedCount > 0
              ? `Updated ${appliedCount} goal${appliedCount === 1 ? "" : "s"} — "${transcript}"`
              : `No matching goals found for "${transcript}"`}
          </span>
          <button onClick={reset} className="text-[10px] uppercase tracking-widest underline flex-shrink-0 ml-3">
            OK
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center justify-between border border-border rounded-sm px-3 py-2">
          <span className="text-xs text-muted-foreground">{errorMsg}</span>
          <button onClick={reset} className="text-[10px] uppercase tracking-widest underline flex-shrink-0 ml-3">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
