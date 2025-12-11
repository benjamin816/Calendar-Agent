import { GoogleGenAI, Type } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCalendarEvent, createTask, listUpcomingEvents } from "@/lib/google-client";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { text, userTimezone } = await req.json();

  if (!text) {
    return NextResponse.json({ success: false, message: "No text provided" }, { status: 400 });
  }

  // 1. Identify Intent using Gemini 2.5 Flash
  try {
    const today = new Date().toISOString();
    
    const systemInstruction = `
      You are a helpful calendar assistant. 
      Current Date/Time: ${today}.
      User Timezone: ${userTimezone}.
      
      Analyze the user's request and map it to one of the following schemas.
      Calculated times must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss) corrected to the user's timezone context.
      If the user says "tomorrow at 3pm", calculate the actual date string.
      
      For 'create_event', duration defaults to 1 hour if not specified.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              enum: ["create_event", "create_task", "list_events", "unknown"],
              description: "The action to perform"
            },
            summary: {
              type: Type.STRING,
              description: "Title of event or task"
            },
            description: {
              type: Type.STRING,
              description: "Details or notes"
            },
            startTime: {
              type: Type.STRING,
              description: "ISO 8601 Start DateTime"
            },
            endTime: {
              type: Type.STRING,
              description: "ISO 8601 End DateTime"
            }
          },
          required: ["action"]
        }
      }
    });

    const intent = JSON.parse(response.text || "{}");

    // 2. Execute Backend Action
    let result;
    let message = "";

    switch (intent.action) {
      case "create_event":
        if (!intent.startTime) throw new Error("Could not determine start time");
        result = await createCalendarEvent(session.accessToken, intent);
        message = `Event "${intent.summary}" created for ${new Date(intent.startTime).toLocaleString()}.`;
        break;

      case "create_task":
        result = await createTask(session.accessToken, intent);
        message = `Task "${intent.summary}" added to your list.`;
        break;

      case "list_events":
        result = await listUpcomingEvents(session.accessToken);
        message = `You have ${result.length} upcoming events.`;
        break;

      default:
        return NextResponse.json({ success: false, message: "I didn't understand that request." });
    }

    return NextResponse.json({ success: true, message, data: result });

  } catch (error: any) {
    console.error("Agent Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to process request" }, { status: 500 });
  }
}