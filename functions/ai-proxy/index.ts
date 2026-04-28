/// <reference types="bun" />

export async function main(input: string): Promise<string> {
  try {
    const payload = JSON.parse(input);
    const { input: userInput, system } = payload;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Bun.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: userInput },
        ],
      }),
    });

    const data = await res.json();

    return JSON.stringify({
      output: data?.choices?.[0]?.message?.content ?? "AI response error",
    });
  } catch (error) {
    return JSON.stringify({
      output: `Error: ${String(error)}`,
    });
  }
}
