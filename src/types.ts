export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'local' | 'custom';

export type ModelType = 
  | 'gemini-3.5-flash' 
  | 'gemini-3.1-pro-preview' 
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gpt-4o' 
  | 'gpt-4o-mini' 
  | 'claude-3-5-sonnet' 
  | 'llama-3.3-70b' 
  | 'deepseek-chat' 
  | 'deepseek-reasoner'
  | 'local' 
  | 'custom';

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
  fileName?: string; // name of the attached file
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
  activeProvider: AiProvider;
  
  // API Keys for Providers
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  groqApiKey?: string;
  deepseekApiKey?: string;
  customApiKey?: string;

  // Custom Endpoint & Model
  customBaseUrl?: string;
  customModelName?: string;

  // Local LLM
  localLlmProvider: 'ollama' | 'lm-studio' | 'llama-cpp' | 'openai-compatible';
  localLlmUrl: string;
  localLlmModel: string;
  theme?: 'light' | 'dark';
}

export interface UserAccount {
  name: string;
  email: string;
  isAuthenticated: boolean;
  profilePicture?: string;
}

declare global {
  interface Window {
    AndroidNetwork?: {
      getDeviceIp: () => string;
    };
  }
}

