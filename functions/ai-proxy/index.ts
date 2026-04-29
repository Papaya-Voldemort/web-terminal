interface RequestPayload {
  input: string;
  system?: string;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash-lite";
const TIMEOUT_MS = 30000;
const MAX_TOKENS = 2048;
const TEMPERATURE = 0.7;

function validateInput(payload: unknown): RequestPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid request: payload must be a JSON object");
  }

  const { input, system } = payload as Record<string, unknown>;

  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("Invalid request: 'input' field must be a non-empty string");
  }

  if (system !== undefined && typeof system !== "string") {
    throw new Error("Invalid request: 'system' field must be a string if provided");
  }

  return {
    input: input.trim(),
    system: system?.trim(),
  };
}

function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

async function callOpenRouter(
  userInput: string,
  system?: string
): Promise<string> {
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
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user" as const, content: userInput },
    ],
  };

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://web-terminal.example.com",
      "X-Title": "Web Terminal AI Proxy",
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
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

export default async (context: any) => {
  try {
    // Handle both string and object body formats
    let payload: any = context.req.body;
    
    context.log("📥 Raw body:", JSON.stringify(payload));
    
    if (typeof payload === "string") {
      context.log("Parsing string body...");
      payload = JSON.parse(payload);
    }
    
    context.log("📦 Parsed payload:", JSON.stringify(payload));
    
    const { input: userInput, system } = validateInput(payload);
    context.log("✓ Validated input:", userInput);
    context.log("✓ System prompt provided:", !!system);
    
    const output = await callOpenRouter(userInput, system);
    context.log("📤 AI Output:", output);
    
    const response = { output };
    context.log("🎯 Sending response:", JSON.stringify(response));
    
    // Use context.res.json() to properly send response for Appwrite
    // Return the result of context.res.json()
    return context.res.json(response, 200);
  } catch (error) {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.name === "AbortError"
        ? "Request timeout: AI service took too long to respond"
        : error.message;
    } else {
      errorMessage = `Unexpected error: ${String(error)}`;
    }

    context.error("❌ AI Proxy Error:", errorMessage);
    context.error("Stack:", error instanceof Error ? error.stack : "N/A");
    
    return context.res.json({ output: `Error: ${errorMessage}` }, 500);
  }
};
