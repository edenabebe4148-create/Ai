import { GoogleGenAI } from "@google/genai";
import { UserSettings } from "./types";

export interface ChatRequest {
  message?: string;
  history?: any[];
  assistantId?: string;
  systemInstruction?: string;
  preferredModel?: string;
  image?: string;
  temperature?: number;
  settings?: UserSettings;
}

export interface ChatResponse {
  role: "model";
  content: string;
  timestamp: string;
}

export function getGeminiApiKey(settings?: UserSettings): string {
  const keyFromSettings = settings?.geminiApiKey?.trim();
  if (keyFromSettings) return keyFromSettings;

  const keyFromEnv = import.meta.env.VITE_GEMINI_API_KEY;
  if (keyFromEnv) return keyFromEnv;

  throw new Error(
    "Gemini API key is missing. Please configure your API key in Settings or set VITE_GEMINI_API_KEY."
  );
}

/**
 * Call Google Gemini via @google/genai SDK
 */
async function callGemini(params: ChatRequest): Promise<string> {
  const { message, history, systemInstruction, preferredModel, image, temperature, settings } = params;
  const apiKey = getGeminiApiKey(settings);

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const model = preferredModel && preferredModel.startsWith("gemini") ? preferredModel : "gemini-3.5-flash";

  const formattedContents: any[] = [];
  if (history && Array.isArray(history)) {
    history.forEach((msg: any) => {
      const parts: any[] = [];
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

  const response = await ai.models.generateContent({
    model: model,
    contents: formattedContents,
    config: {
      systemInstruction: systemInstruction || "You are a helpful assistant.",
      temperature: temperature !== undefined ? Number(temperature) : 0.7,
    },
  });

  return response.text || "I was unable to generate a text response.";
}

/**
 * Call OpenAI-compatible REST endpoint (OpenAI, Groq, DeepSeek, Custom, Local)
 */
async function callOpenAiCompatible(params: ChatRequest, options: {
  endpoint: string;
  apiKey?: string;
  model: string;
}): Promise<string> {
  const { message, history, systemInstruction, image, temperature } = params;
  const { endpoint, apiKey, model } = options;

  const messages: any[] = [];

  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }

  if (history && Array.isArray(history)) {
    history.forEach((msg: any) => {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    });
  }

  // Handle current message with optional vision
  if (image) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: message || "Analyze this image." },
        { type: "image_url", image_url: { url: image } },
      ],
    });
  } else {
    messages.push({ role: "user", content: message || "" });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: temperature !== undefined ? Number(temperature) : 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Received empty or unexpected response format from API.");
  }
  return text;
}

/**
 * Call Anthropic Claude REST API
 */
async function callAnthropic(params: ChatRequest, apiKey: string, model: string): Promise<string> {
  const { message, history, systemInstruction, temperature } = params;

  if (!apiKey) {
    throw new Error("Anthropic API key is required. Please set it in Settings.");
  }

  const messages: any[] = [];
  if (history && Array.isArray(history)) {
    history.forEach((msg: any) => {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    });
  }

  messages.push({ role: "user", content: message || "" });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "dangerously-allow-browser": "true",
    },
    body: JSON.stringify({
      model: model || "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemInstruction || undefined,
      messages,
      temperature: temperature !== undefined ? Number(temperature) : 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Empty response from Anthropic Claude API.");
  return text;
}

/**
 * Unified Chat Generator for All Providers
 */
export async function generateChatResponse(params: ChatRequest): Promise<ChatResponse> {
  const { message, image, settings } = params;

  if (!message && !image) {
    throw new Error("Message or image is required");
  }

  const provider = settings?.activeProvider || (settings?.preferredModel === "local" ? "local" : "gemini");
  let content = "";

  try {
    switch (provider) {
      case "gemini":
        content = await callGemini(params);
        break;

      case "openai": {
        const apiKey = settings?.openaiApiKey?.trim();
        if (!apiKey) throw new Error("OpenAI API key is missing. Please set it in Settings.");
        const model = settings?.preferredModel === "gpt-4o-mini" ? "gpt-4o-mini" : "gpt-4o";
        content = await callOpenAiCompatible(params, {
          endpoint: "https://api.openai.com/v1/chat/completions",
          apiKey,
          model,
        });
        break;
      }

      case "anthropic": {
        const apiKey = settings?.anthropicApiKey?.trim();
        content = await callAnthropic(params, apiKey || "", "claude-3-5-sonnet-20241022");
        break;
      }

      case "groq": {
        const apiKey = settings?.groqApiKey?.trim();
        if (!apiKey) throw new Error("Groq API key is missing. Please set it in Settings.");
        content = await callOpenAiCompatible(params, {
          endpoint: "https://api.groq.com/openai/v1/chat/completions",
          apiKey,
          model: "llama-3.3-70b-versatile",
        });
        break;
      }

      case "deepseek": {
        const apiKey = settings?.deepseekApiKey?.trim();
        if (!apiKey) throw new Error("DeepSeek API key is missing. Please set it in Settings.");
        const model = settings?.preferredModel === "deepseek-reasoner" ? "deepseek-reasoner" : "deepseek-chat";
        content = await callOpenAiCompatible(params, {
          endpoint: "https://api.deepseek.com/v1/chat/completions",
          apiKey,
          model,
        });
        break;
      }

      case "custom": {
        const baseUrl = (settings?.customBaseUrl?.trim() || "http://localhost:11434/v1").replace(/\/$/, "");
        const endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
        content = await callOpenAiCompatible(params, {
          endpoint,
          apiKey: settings?.customApiKey?.trim(),
          model: settings?.customModelName?.trim() || "default",
        });
        break;
      }

      case "local": {
        const baseUrl = (settings?.localLlmUrl?.trim() || "http://localhost:11434").replace(/\/$/, "");
        if (settings?.localLlmProvider === "ollama") {
          // Direct Ollama API call
          const res = await fetch(`${baseUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: settings?.localLlmModel || "llama3",
              prompt: message,
              system: params.systemInstruction,
              stream: false,
            }),
          });
          if (!res.ok) throw new Error(`Ollama local server error: ${res.statusText}`);
          const data = await res.json();
          content = data.response || "No response received from local Ollama model.";
        } else {
          // Generic OpenAI-compatible local server (LM Studio / vLLM)
          content = await callOpenAiCompatible(params, {
            endpoint: `${baseUrl}/v1/chat/completions`,
            model: settings?.localLlmModel || "local-model",
          });
        }
        break;
      }

      default:
        content = await callGemini(params);
        break;
    }

    const cleanedContent = content
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<think>[\s\S]*/gi, "")
      .trim();

    return {
      role: "model",
      content: cleanedContent || content,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("AI Dispatcher Error:", err);
    throw new Error(err.message || "Failed to generate AI response.");
  }
}

/**
 * Live test provider connection for Settings Modal
 */
export async function testProviderConnection(settings: UserSettings): Promise<{ success: boolean; message: string }> {
  try {
    const res = await generateChatResponse({
      message: "Hello! Reply with 'OK' if you can read this.",
      settings,
    });
    if (res.content) {
      return { success: true, message: `Connected! Response: "${res.content.slice(0, 40)}..."` };
    }
    return { success: false, message: "Connected but received empty response." };
  } catch (err: any) {
    return { success: false, message: err.message || "Connection failed." };
  }
}

/**
 * Enhance prompt utility
 */
export async function enhancePrompt(prompt: string, settings?: UserSettings): Promise<string> {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("A valid prompt is required");
  }

  const systemInstruction = `You are an expert Prompt Engineer. Your task is to polish, refine, and expand the user's brief input query into an engaging, clear, and rich prompt for an AI. 
Keep the user's core intent but add details, structural requests, or output constraints to make the result extremely effective. 
Respond ONLY with the final expanded prompt. Do not write any preamble, intro, or explanation.`;

  try {
    const res = await generateChatResponse({
      message: prompt,
      systemInstruction,
      temperature: 0.8,
      settings,
    });
    return res.content.trim();
  } catch (err) {
    console.warn("Enhance prompt error, falling back to original prompt:", err);
    return prompt;
  }
}

/**
 * Fetch available models dynamically from local Ollama or OpenAI-compatible server
 */
export async function fetchLocalModels(settings?: UserSettings): Promise<Array<{ id: string; name: string; size?: string }>> {
  const url = settings?.localLlmUrl || "http://localhost:11434";
  const provider = settings?.localLlmProvider || "ollama";

  try {
    if (provider === "ollama") {
      const res = await fetch(`${url}/api/tags`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        return data.models.map((m: any) => ({
          id: m.name || m.model,
          name: m.name || m.model,
          size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)}GB` : undefined,
        }));
      }
    } else {
      // LM Studio / OpenAI compatible /v1/models
      const res = await fetch(`${url}/v1/models`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((m: any) => ({
          id: m.id,
          name: m.id,
        }));
      }
    }
    return [];
  } catch (err) {
    console.warn("Failed to fetch local models dynamically:", err);
    return [];
  }
}
