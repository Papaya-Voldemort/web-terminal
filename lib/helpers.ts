import { client } from "./appwrite.ts";
import { Functions } from "appwrite";

export async function callAI(input: string, system?: string): Promise<string> {
  try {
    const functions = new Functions(client);
    const execution = await functions.createExecution(
      "69f13b9e000b205ab9f9",
      JSON.stringify({ input, system }),
      true  // wait for execution to complete
    );

    // Get the response body from the execution
    const responseBody = execution.responseBody;
    
    if (!responseBody) {
      return `No response: ${execution.response || "unknown error"}`;
    }

    // Try to parse as JSON
    try {
      const result = JSON.parse(responseBody);
      return result.output || String(result);
    } catch {
      return responseBody;
    }
  } catch (error) {
    return `Error: ${String(error)}`;
  }
}
