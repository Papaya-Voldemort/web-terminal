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
    
    // Appwrite returns the output in the 'response' field as a string
    let output = response.response || response.responseBody || "";
    
    if (!output) {
      return "Function executed but returned no data";
    }
    
    // Parse if it's JSON, otherwise return as-is
    try {
      const parsed = JSON.parse(output);
      return parsed.output || JSON.stringify(parsed);
    } catch {
      return output;
    }
  } catch (error) {
    return `Error calling AI function: ${String(error)}`;
  }
}
