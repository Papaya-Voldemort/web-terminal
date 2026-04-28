import { client } from "./appwrite.ts";
import { Functions } from "appwrite";

export async function callAI(input: string, system?: string): Promise<string> {
  try {
    const functions = new Functions(client);
    const response = await functions.createExecution(
      "ai-proxy",
      JSON.stringify({ input, system }),
      false
    );
    const result = JSON.parse(response.responseBody);
    return result.output;
  } catch (error) {
    return `Error calling AI function: ${String(error)}`;
  }
}
