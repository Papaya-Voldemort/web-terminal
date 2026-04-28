import { client } from "./appwrite.ts";
import { Functions } from "appwrite";

export async function callAI(input: string, system?: string): Promise<string> {
  try {
    const functions = new Functions(client);
    const response = await functions.createExecution(
      "69f13b9e000b205ab9f9",
      JSON.stringify({ input, system }),
      false
    );
    
    let body = response.responseBody || response.response || "";
    if (!body) {
      return "No response from function";
    }
    
    const result = typeof body === "string" ? JSON.parse(body) : body;
    return result.output || JSON.stringify(result);
  } catch (error) {
    return `Error calling AI function: ${String(error)}`;
  }
}
