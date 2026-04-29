import { client } from "./appwrite.ts";
import { Functions } from "appwrite";

export async function callAI(input: string, system?: string): Promise<string> {
  try {
    const functions = new Functions(client);
    console.log("📤 Calling Appwrite function with:", { input, system });
    
    const execution = await functions.createExecution(
      "69f13b9e000b205ab9f9",
      JSON.stringify({ input, system }),
      false  // don't wait initially
    );

    console.log("📥 Initial execution:", {
      id: execution.$id,
      status: execution.status,
    });

    // Poll for completion with timeout
    const maxAttempts = 30;
    let attempt = 0;
    let completed = false;
    let finalExecution = execution;

    while (attempt < maxAttempts && !completed) {
      if (finalExecution.status === "completed") {
        completed = true;
        break;
      }

      // Wait 500ms before polling again
      await new Promise(resolve => setTimeout(resolve, 500));
      
      finalExecution = await functions.getExecution(
        "69f13b9e000b205ab9f9",
        execution.$id
      );

      console.log(`⏳ Poll attempt ${attempt + 1}:`, {
        status: finalExecution.status,
        responseBodyLength: finalExecution.responseBody?.length || 0,
      });

      attempt++;
    }

    console.log("📥 Final execution response:", {
      status: finalExecution.status,
      responseBodyLength: finalExecution.responseBody?.length || 0,
      responseBody: finalExecution.responseBody,
      response: finalExecution.response,
    });

    // Get the response body from the execution
    const responseBody = finalExecution.responseBody;
    
    if (!responseBody) {
      console.error("❌ No response body after polling. Final execution:", finalExecution);
      return `No response: ${finalExecution.response || "unknown error (status: " + finalExecution.status + ")"}`;
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

