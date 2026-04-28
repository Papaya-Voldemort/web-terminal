import { client } from "./appwrite.ts";
import { Functions } from "appwrite";

export async function callAI(input: string, system?: string): Promise<string> {
  try {
    const functions = new Functions(client);
    console.log("📤 Calling Appwrite function with:", { input, system });
    
    const execution = await functions.createExecution(
      "69f13b9e000b205ab9f9",
      JSON.stringify({ input, system }),
      true  // wait for execution to complete
    );

    console.log("📥 Execution response:", {
      status: execution.status,
      responseBody: execution.responseBody,
      response: execution.response,
    });

    // Get the response body from the execution
    const responseBody = execution.responseBody;
    
    if (!responseBody) {
      console.error("❌ No response body. Full execution:", execution);
      return `No response: ${execution.response || "unknown error"}`;
    }

    // Try to parse as JSON
    try {
      const result = JSON.parse(responseBody);
      console.log("✓ Parsed response:", result);
      return result.output || String(result);
    } catch (parseError) {
      console.error("⚠️ Failed to parse JSON:", parseError);
      console.log("Raw response body:", responseBody);
      return responseBody;
    }
  } catch (error) {
    console.error("❌ callAI error:", error);
    return `Error: ${String(error)}`;
  }
}

