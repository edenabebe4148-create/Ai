export type ModelType = 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'local';

export interface AssistantPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstruction: string;
  avatar: string;
  color: string; // Tailwind class color for accent (e.g. 'violet', 'indigo', 'emerald')
  examplePrompts: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  image?: string; // base64 encoded image data if attached
  isEnhanced?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  assistantId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userName: string;
  preferredModel: ModelType;
  temperature: number;
  localLlmProvider: 'ollama' | 'lm-studio' | 'llama-cpp' | 'openai-compatible';
  localLlmUrl: string;
  localLlmModel: string;
  theme?: 'light' | 'dark';
}

export interface UserAccount {
  name: string;
  email: string;
  isAuthenticated: boolean;
}

declare global {
  interface Window {
    AndroidNetwork?: {
      getDeviceIp: () => string;
    };
  }
}

