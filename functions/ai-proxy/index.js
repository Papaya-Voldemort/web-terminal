// index.ts
var OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
var MODEL = "google/gemini-2.5-flash-lite";
var TIMEOUT_MS = 3e4;
var MAX_TOKENS = 2048;
var TEMPERATURE = 0.7;
function validateInput(payload) {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid request: payload must be a JSON object");
  }
  const { input, system } = payload;
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("Invalid request: 'input' field must be a non-empty string");
  }
  if (system !== void 0 && typeof system !== "string") {
    throw new Error("Invalid request: 'system' field must be a string if provided");
  }
  return {
    input: input.trim(),
    system: system?.trim()
  };
}
function createTimeoutController(timeoutMs) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}
async function callOpenRouter(userInput, system) {
  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    throw new Error(
      "Server configuration error: OPENROUTER_KEY environment variable is not set"
    );
  }
  const controller = createTimeoutController(TIMEOUT_MS);
  const requestBody = {
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    messages: [
      ...system ? [{ role: "system", content: system }] : [],
      { role: "user", content: userInput }
    ]
  };
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://web-terminal.example.com",
      "X-Title": "Web Terminal AI Proxy"
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Open Router API error (${response.status}): ${errorText || response.statusText}`
    );
  }
  const data = await response.json();
  if (!data.choices?.length) {
    throw new Error("Invalid API response: no choices returned");
  }
  const content = data.choices[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Invalid API response: choice does not contain content");
  }
  if (content.trim().length === 0) {
    throw new Error("API returned an empty response");
  }
  return content.trim();
}
var index_default = async (context) => {
  try {
    let payload = context.req.body;
    context.log("\u{1F4E5} Raw body:", JSON.stringify(payload));
    if (typeof payload === "string") {
      context.log("Parsing string body...");
      payload = JSON.parse(payload);
    }
    context.log("\u{1F4E6} Parsed payload:", JSON.stringify(payload));
    const { input: userInput, system } = validateInput(payload);
    context.log("\u2713 Validated input:", userInput);
    context.log("\u2713 System prompt provided:", !!system);
    const output = await callOpenRouter(userInput, system);
    context.log("\u{1F4E4} AI Output:", output);
    const response = { output };
    context.log("\u{1F3AF} Sending response:", JSON.stringify(response));
    return context.res.json(response);
  } catch (error) {
    let errorMessage;
    if (error instanceof Error) {
      errorMessage = error.name === "AbortError" ? "Request timeout: AI service took too long to respond" : error.message;
    } else {
      errorMessage = `Unexpected error: ${String(error)}`;
    }
    context.error("\u274C AI Proxy Error:", errorMessage);
    context.error("Stack:", error instanceof Error ? error.stack : "N/A");
    return context.res.json({ output: `Error: ${errorMessage}` }, 500);
  }
};
export {
  index_default as default
};
