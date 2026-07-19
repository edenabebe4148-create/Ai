import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "VITE_GEMINI_API_KEY is not configured. Please define it in your .env.local file or set it in your environment."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export interface ChatRequest {
  message?: string;
  history?: any[];
  assistantId?: string;
  systemInstruction?: string;
  preferredModel?: string;
  image?: string;
  temperature?: number;
}

export interface ChatResponse {
  role: "model";
  content: string;
  timestamp: string;
}

/**
 * Executes a direct Gemini API call in the browser mimicking the /api/chat endpoint
 */
export async function generateChatResponse(params: ChatRequest): Promise<ChatResponse> {
  const { message, history, systemInstruction, preferredModel, image, temperature } = params;

  if (!message && !image) {
    throw new Error("Message or image is required");
  }

  const ai = getAiClient();
  const model = preferredModel || "gemini-3.5-flash";

  // Format historical messages into Gemini format
  const formattedContents: any[] = [];

  if (history && Array.isArray(history)) {
    history.forEach((msg: any) => {
      const parts: any[] = [];
      
      // Handle images in history if they exist
      if (msg.image) {
        const imgMatch = msg.image.match(/^data:([^;]+);base64,(.+)$/);
        if (imgMatch) {
          parts.push({
            inlineData: {
              mimeType: imgMatch[1],
              data: imgMatch[2],
            },
          });
        }
      }
      
      parts.push({ text: msg.content });
      formattedContents.push({
        role: msg.role === "user" ? "user" : "model",
        parts,
      });
    });
  }

  // Append the active current message
  const currentParts: any[] = [];
  if (image) {
    const imgMatch = image.match(/^data:([^;]+);base64,(.+)$/);
    if (imgMatch) {
      currentParts.push({
        inlineData: {
          mimeType: imgMatch[1],
          data: imgMatch[2],
        },
      });
    }
  }
  currentParts.push({ text: message || "Analyze this attached image." });

  formattedContents.push({
    role: "user",
    parts: currentParts,
  });

  // Call Gemini API
  const response = await ai.models.generateContent({
    model: model,
    contents: formattedContents,
    config: {
      systemInstruction: systemInstruction || "You are a helpful assistant.",
      temperature: temperature !== undefined ? Number(temperature) : 0.7,
    },
  });

  const aiText = response.text || "I was unable to generate a text response.";

  return {
    role: "model",
    content: aiText,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Executes a direct Gemini API call in the browser mimicking the /api/enhance-prompt endpoint
 */
export async function enhancePrompt(prompt: string): Promise<string> {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("A valid prompt is required");
  }

  const ai = getAiClient();

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config: {
      systemInstruction: `You are an expert Prompt Engineer. Your task is to polish, refine, and expand the user's brief input query into an engaging, clear, and rich prompt for an AI. 
Keep the user's core intent but add details, structural requests, or output constraints to make the result extremely effective. 
Respond ONLY with the final expanded prompt. Do not write any preamble, intro, or explanation.`,
      temperature: 0.8,
    },
  });

  return response.text?.trim() || prompt;
}
