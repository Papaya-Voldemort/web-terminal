export async function callAI(input: string, system?: string): Promise<string> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, system }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `Error: ${response.status} - ${errorText}`;
    }

    const data = await response.json();
    return data.output || "No response";
  } catch (error) {
    return `Error: ${String(error)}`;
  }
}
