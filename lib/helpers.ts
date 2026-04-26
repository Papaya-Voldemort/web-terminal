export async function callAI(input: string, system?: string): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, system }),
  });

  if (!res.ok) throw new Error(await res.text());

  const data = await res.json();
  return data.output ?? "";
}