const POLLINATIONS = "https://text.pollinations.ai/openai";

export async function sendChat({ messages, provider, apiKey }) {
  if (provider === "groq") return viaOpenAI("https://api.groq.com/openai/v1/chat/completions", apiKey, "llama-3.1-8b-instant", messages);
  if (provider === "openrouter") return viaOpenAI("https://openrouter.ai/api/v1/chat/completions", apiKey, "openrouter/auto", messages);
  return viaPollinations(messages);
}

async function viaPollinations(messages) {
  const res = await fetch(POLLINATIONS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages,
      referrer: "autocharracter-mvs"
    })
  });
  if (!res.ok) {
    const fallback = messages[messages.length - 1]?.content || "";
    const plain = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fallback)}`);
    if (!plain.ok) throw new Error("Online chat API unavailable");
    return await plain.text();
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "No reply.";
}

async function viaOpenAI(url, apiKey, model, messages) {
  if (!apiKey) throw new Error("Paste an API key for this provider. Keys stay in this browser only.");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages })
  });
  if (!res.ok) throw new Error("Provider rejected the request. Check the key and model access.");
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "No reply.";
}

export const SYSTEM = `You are AutoCharracter MV's, a public-web frontend assistant for adult and SFW anime/manga character lookup.
Rules:
- Only discuss fictional adult characters. Refuse sexual content involving minors.
- Prefer facts from well-known series, then say when you are unsure.
- You run in the user's browser against an online API. You cannot browse files on their PC.
- Keep answers compact and plain.`;
