import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoalInfo {
  id: string;
  title: string;
  type: "binary" | "count";
  target?: number;
  label?: string;
  frequency: string;
  currentCount: number;
  currentBinary: boolean;
}

interface VoiceUpdate {
  goalId: string;
  action: "toggle_complete" | "increment";
  amount?: number; // for increment actions
}

interface RequestBody {
  transcript: string;
  goals: GoalInfo[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { transcript, goals } = body;

    if (!transcript || !goals?.length) {
      return new Response(JSON.stringify({ updates: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new Anthropic({ apiKey });

    const goalsJson = JSON.stringify(
      goals.map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        target: g.target,
        label: g.label,
        frequency: g.frequency,
        currentCount: g.currentCount,
        currentBinary: g.currentBinary,
      })),
      null,
      2
    );

    const systemPrompt = `You are a goal tracking assistant. The user will describe what they did today in natural language. Your job is to match their activities to the goals listed below and return a JSON array of updates.

GOALS:
${goalsJson}

Rules:
- Only include goals that are clearly mentioned or strongly implied by the user's message.
- For binary goals: use action "toggle_complete" to mark as done.
- For count goals: use action "increment" with an "amount" field (how many to add). Never exceed the goal's target.
- If a goal is already complete (currentBinary=true or currentCount>=target), skip it unless the user says they did it more.
- Be conservative — only update goals you are confident apply.

Respond with ONLY a valid JSON object in this exact shape, no markdown, no explanation:
{"updates": [{"goalId": "...", "action": "toggle_complete"}, {"goalId": "...", "action": "increment", "amount": 2}]}

If no goals match, respond with: {"updates": []}`;

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `I just did the following: ${transcript}`,
        },
      ],
      system: systemPrompt,
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

    let parsed: { updates: VoiceUpdate[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("LLM returned non-JSON:", rawText);
      parsed = { updates: [] };
    }

    if (!Array.isArray(parsed.updates)) parsed.updates = [];

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("voice-update error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
