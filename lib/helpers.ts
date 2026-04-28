export async function callAI(input: string, system?: string): Promise<string> {
  const key = localStorage.getItem("openrouter_key");
  if (!key) {
    return "No API key. Run: set-key sk-or-v1-your-openrouter-key-here";
  }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: input },
      ],
    }),
  });
  if (!res.ok) {
    return `OpenRouter error: ${res.status} - Check key with set-key`;
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "No response";
}
