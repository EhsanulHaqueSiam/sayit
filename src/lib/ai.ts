import type { Provider } from "@/types";

interface CallArgs {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
  systemPrompt: string;
  userText: string;
}

export async function callAI(args: CallArgs): Promise<string> {
  const { provider, apiKey, userText } = args;
  if (!apiKey && provider !== "openai-compat") {
    throw new Error("Missing API key. Open Settings.");
  }
  if (!userText.trim()) throw new Error("Nothing to run.");

  switch (provider) {
    case "anthropic":
      return callAnthropic(args);
    case "openai":
      return callOpenAILike({
        ...args,
        url: "https://api.openai.com/v1/chat/completions",
      });
    case "google":
      return callGemini(args);
    case "openai-compat": {
      const base = (args.baseUrl || "").replace(/\/+$/, "");
      if (!base) {
        throw new Error(
          "Set a base URL in Settings (e.g. https://api.groq.com/openai/v1).",
        );
      }
      return callOpenAILike({
        ...args,
        url: `${base}/chat/completions`,
      });
    }
  }
}

async function callAnthropic({
  apiKey,
  model,
  systemPrompt,
  userText,
}: CallArgs): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { content?: Array<{ text: string }> };
  return j.content?.map((b) => b.text).join("") ?? "";
}

async function callOpenAILike({
  apiKey,
  model,
  systemPrompt,
  userText,
  url,
}: CallArgs & { url: string }): Promise<string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
      temperature: 0.2,
    }),
  });
  if (!r.ok) {
    const host = new URL(url).host;
    throw new Error(`${host} ${r.status}: ${await r.text()}`);
  }
  const j = (await r.json()) as {
    choices?: Array<{ message: { content: string } }>;
  };
  return j.choices?.[0]?.message?.content ?? "";
}

/**
 * Validate an API key without running a full preset. Hits each provider's
 * cheapest authenticated endpoint (usually /models listing). Returns a
 * structured result so the UI can distinguish "invalid key" from "network
 * blew up" from "OK".
 */
export interface TestKeyArgs {
  provider: Provider;
  apiKey: string;
  baseUrl: string;
}
export interface TestKeyResult {
  ok: boolean;
  message: string;
}

export async function testAIKey({
  provider,
  apiKey,
  baseUrl,
}: TestKeyArgs): Promise<TestKeyResult> {
  if (!apiKey && provider !== "openai-compat") {
    return { ok: false, message: "Add a key first" };
  }

  try {
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });
      if (r.ok) return { ok: true, message: "Key works" };
      if (r.status === 401 || r.status === 403)
        return { ok: false, message: "Key rejected" };
      return { ok: false, message: `Anthropic returned ${r.status}` };
    }
    if (provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.ok) return { ok: true, message: "Key works" };
      if (r.status === 401 || r.status === 403)
        return { ok: false, message: "Key rejected" };
      return { ok: false, message: `OpenAI returned ${r.status}` };
    }
    if (provider === "google") {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      );
      if (r.ok) return { ok: true, message: "Key works" };
      if (r.status === 400 || r.status === 401 || r.status === 403)
        return { ok: false, message: "Key rejected" };
      return { ok: false, message: `Gemini returned ${r.status}` };
    }
    if (provider === "openai-compat") {
      const base = (baseUrl || "").replace(/\/+$/, "");
      if (!base) return { ok: false, message: "Set a base URL first" };
      const headers: Record<string, string> = {};
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const r = await fetch(`${base}/models`, { headers });
      if (r.ok) return { ok: true, message: "Key works" };
      if (r.status === 401 || r.status === 403)
        return { ok: false, message: "Key rejected" };
      return { ok: false, message: `${new URL(base).host} ${r.status}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Network error — ${msg}` };
  }

  return { ok: false, message: "Unknown provider" };
}

async function callGemini({
  apiKey,
  model,
  systemPrompt,
  userText,
}: CallArgs): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as {
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
}
