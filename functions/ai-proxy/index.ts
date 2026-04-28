/// <reference types="bun" />

interface RequestPayload {
  input: string;
  system?: string;
}

interface ResponsePayload {
  output: string;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash-lite";
const TIMEOUT_MS = 30000; // 30 second timeout
const MAX_TOKENS = 2048;
const TEMPERATURE = 0.7;

/**
 * Validates the input payload
 */
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

/**
 * Creates a controller with timeout support
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

/**
 * Calls the Open Router API with the provided messages
 */
async function callOpenRouter(
  userInput: string,
  system?: string
): Promise<string> {
  const apiKey = Bun.env.OPENROUTER_KEY;

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

  // Validate response structure
  if (
    !data.choices ||
    !Array.isArray(data.choices) ||
    data.choices.length === 0
  ) {
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

/**
 * Main function exported for Appwrite
 */
export async function main(input: string): Promise<string> {
  try {
    // Parse and validate input
    let payload: unknown;
    try {
      payload = JSON.parse(input);
    } catch (parseError) {
      throw new Error(`Invalid JSON input: ${String(parseError)}`);
    }

    const { input: userInput, system } = validateInput(payload);

    // Call Open Router API
    const output = await callOpenRouter(userInput, system);

    // Return successful response
    const response: ResponsePayload = { output };
    return JSON.stringify(response);
  } catch (error) {
    // Handle specific error types
    let errorMessage: string;

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Request timeout: AI service took too long to respond";
      } else {
        errorMessage = error.message;
      }
    } else {
      errorMessage = `Unexpected error: ${String(error)}`;
    }

    // Log error for debugging (Appwrite will capture this)
    console.error("AI Proxy Error:", errorMessage);

    // Return error response
    const response: ResponsePayload = { output: `Error: ${errorMessage}` };
    return JSON.stringify(response);
  }
}
