import {
  Send,
  Sparkles,
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  Download,
  Menu,
  AlertCircle,
  HelpCircle,
  Clock,
  Settings,
  ChevronDown,
  Info,
  ShieldAlert,
  User,
  ArrowRight,
  MessageSquare,
  ChevronLeft,
  Search,
  Trash2,
  LayoutGrid,
  List,
  RefreshCw,
  Pencil,
  Video
} from "lucide-react";
import { ChatMessage, ChatSession, AssistantPersona, ModelType, UserAccount, UserSettings, AiProvider } from "../types";
import { ASSISTANTS } from "../constants";
import { motion, AnimatePresence } from "motion/react";
import React, { useState, useRef, useEffect } from "react";
import { enhancePrompt, fetchLocalModels, getGeminiApiKey } from "../geminiClient";
import { LiveMode } from "./LiveMode";

export const MODEL_OPTIONS: Array<{
  id: ModelType;
  provider: AiProvider;
  name: string;
  badge: string;
  icon: string;
  description: string;
}> = [
    // Google Gemini Sub-models
    { id: "gemini-3.5-flash", provider: "gemini", name: "Gemini 3.5 Flash", badge: "Google", icon: "✨", description: "Next-gen ultra fast multimodal model" },
    { id: "gemini-3.1-pro-preview", provider: "gemini", name: "Gemini 3.1 Pro", badge: "Google", icon: "💎", description: "Deep reasoning & complex tasks" },
    { id: "gemini-2.5-flash", provider: "gemini", name: "Gemini 2.5 Flash", badge: "Google", icon: "⚡", description: "High efficiency & low latency" },
    { id: "gemini-2.5-pro", provider: "gemini", name: "Gemini 2.5 Pro", badge: "Google", icon: "🔬", description: "Advanced analytical coding & math" },

    // OpenAI Sub-models
    { id: "gpt-4o", provider: "openai", name: "GPT-4o Omni", badge: "OpenAI", icon: "🤖", description: "High-intelligence flagship model" },
    { id: "gpt-4o-mini", provider: "openai", name: "GPT-4o Mini", badge: "OpenAI", icon: "⚡", description: "Fast & cost-efficient" },

    // Anthropic Sub-models
    { id: "claude-3-5-sonnet", provider: "anthropic", name: "Claude 3.5 Sonnet", badge: "Anthropic", icon: "🧠", description: "Superior coding & nuanced writing" },

    // Groq Sub-models
    { id: "llama-3.3-70b", provider: "groq", name: "Llama 3.3 70B", badge: "Groq", icon: "🚀", description: "Ultra low-latency Llama inference" },

    // DeepSeek Sub-models
    { id: "deepseek-chat", provider: "deepseek", name: "DeepSeek V3", badge: "DeepSeek", icon: "🐋", description: "State-of-the-art open weights chat" },
    { id: "deepseek-reasoner", provider: "deepseek", name: "DeepSeek R1", badge: "DeepSeek", icon: "🧬", description: "Chain-of-thought mathematical reasoning" },

    // Local Sub-models
    { id: "local", provider: "local", name: "Local LLM", badge: "Ollama / Local", icon: "💻", description: "Offline local model via Ollama server" },
  ];

interface ChatAreaProps {
  session: ChatSession | null;
  onSendMessage: (text: string, image?: string, fileName?: string) => void;
  onClearSession: () => void;
  isGenerating: boolean;
  onToggleSidebarMobile: () => void;
  preferredModel: ModelType;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  user: UserAccount | null;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onStopGenerating: () => void;
  onNewChat: (assistantId: string) => void;
  onOpenSettings?: () => void;
}

const formatShortModelName = (rawName: string): string => {
  if (!rawName) return "Local LLM";
  let clean = rawName.includes("/") ? rawName.split("/")[1] : rawName;
  clean = clean.split(":")[0];
  const parts = clean.split("-");
  if (parts.length > 2 && (parts[0] + parts[1]).length < 15) {
    return `${parts[0]}-${parts[1]}`;
  }
  return clean;
};

export default function ChatArea({
  session,
  onSendMessage,
  onClearSession,
  isGenerating,
  onToggleSidebarMobile,
  preferredModel,
  settings,
  onSaveSettings,
  user,
  sessions,
  onSelectSession,
  onDeleteSession,
  onStopGenerating,
  onNewChat,
  onOpenSettings,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [dynamicLocalModels, setDynamicLocalModels] = useState<Array<{ id: string; name: string; size?: string }>>([]);
  const [isFetchingLocalModels, setIsFetchingLocalModels] = useState(false);

  const loadLocalModels = async () => {
    setIsFetchingLocalModels(true);
    try {
      const models = await fetchLocalModels(settings);
      setDynamicLocalModels(models);
      if (models.length > 0 && !settings.localLlmModel) {
        onSaveSettings({
          ...settings,
          localLlmModel: models[0].id,
        });
      }
    } catch (e) {
      console.error("Failed loading local models:", e);
    } finally {
      setIsFetchingLocalModels(false);
    }
  };

  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const previousTextRef = useRef<string>("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        isModelSelectorOpen &&
        modelSelectorRef.current &&
        !modelSelectorRef.current.contains(event.target as Node)
      ) {
        setIsModelSelectorOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isModelSelectorOpen]);

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [showLiveMode, setShowLiveMode] = useState(false);

  // Register Android TTS completion hook
  useEffect(() => {
    (window as any).onAndroidSpeakEnd = (msgId: string) => {
      setIsSpeakingId((currentId) => {
        if (currentId === msgId) return null;
        return currentId;
      });
    };
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const [isLiveModeOpen, setIsLiveModeOpen] = useState(false);
  const [liveModeError, setLiveModeError] = useState<string | null>(null);

  const [speechError, setSpeechError] = useState<string | null>(null);

  // High-fidelity search and history subviews
  const [currentView, setCurrentView] = useState<"chat" | "history" | "search">("chat");
  const [capabilitiesLayout, setCapabilitiesLayout] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [previousSearches, setPreviousSearches] = useState<string[]>(() => {
    let stored = null;
    try {
      stored = localStorage.getItem("chatterly_prev_searches_v1");
    } catch (e) {
      console.warn("localStorage.getItem blocked/failed:", e);
    }
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fallback default list
      }
    }
    return [
      "Write a birthday message for my best friend",
      "Name ideas for a minimalist fashion brand",
      "Give me 10 YouTube video title ideas about coding",
      "Write a short romantic poem",
      "Suggest Instagram captions for food photos",
      "Help me describe a luxury leather backpack"
    ];
  });

  const savePreviousSearches = (searches: string[]) => {
    setPreviousSearches(searches);
    try {
      localStorage.setItem("chatterly_prev_searches_v1", JSON.stringify(searches));
    } catch (e) {
      console.warn("localStorage.setItem blocked/failed:", e);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const assistant = session ? ASSISTANTS.find((a) => a.id === session.assistantId) : null;

  // Auto-scroll to bottom of feed on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, isGenerating]);

  // Clean speech synthesis on component unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Web Speech API Initialization with robust error capturing for iframe blocks
  useEffect(() => {
    // Add event listeners for Native Voice Integration
    const handleNativeResult = (e: any) => {
      setInputText((prev) => (prev ? prev + " " + e.detail : e.detail));
    };
    const handleNativeEnd = () => {
      setIsListening(false);
    };
    const handleNativeError = () => {
      setIsListening(false);
      setSpeechError("Native voice recognition failed.");
    };

    window.addEventListener("nativeVoiceResult", handleNativeResult);
    window.addEventListener("nativeVoiceEnd", handleNativeEnd);
    window.addEventListener("nativeVoiceError", handleNativeError);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        // Save what was already in the input box so we can append to it
        previousTextRef.current = document.getElementById('message-text-area')?.getAttribute('data-value') || "";
      };

      rec.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputText(previousTextRef.current ? previousTextRef.current + " " + currentTranscript : currentTranscript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      window.removeEventListener("nativeVoiceResult", handleNativeResult);
      window.removeEventListener("nativeVoiceEnd", handleNativeEnd);
      window.removeEventListener("nativeVoiceError", handleNativeError);
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    if ((window as any).AndroidApp) {
      setIsListening(true);
      setSpeechError(null);
      (window as any).AndroidApp.startVoiceRecognition();
      return;
    }

    if (recognitionRef.current) {
      try {
        setSpeechError(null);
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
        setSpeechError("Failed to initiate voice recording. Please retry.");
      }
    } else {
      setSpeechError("Speech recognition is not supported in this browser.");
    }
  };

  // Drag-and-drop mechanics
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        processImageFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachedFileName(files[0].name);
      processImageFile(files[0]);
    }
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Copy-to-clipboard function
  const handleCopyText = (msgId: string, content: string) => {
    if ((window as any).AndroidApp && (window as any).AndroidApp.copyToClipboard) {
      (window as any).AndroidApp.copyToClipboard(content);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      return;
    }

    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }).catch(err => {
      console.error("Failed to copy", err);
    });
  };

  // Text-To-Speech Toggle
  const handleToggleSpeak = (msgId: string, content: string) => {
    const cleanText = content.replace(/[#*`>_\-]/g, ""); // Strip markdown tags for natural speech

    if ((window as any).AndroidApp && (window as any).AndroidApp.speakText) {
      if (isSpeakingId === msgId) {
        (window as any).AndroidApp.stopSpeaking();
        setIsSpeakingId(null);
      } else {
        (window as any).AndroidApp.stopSpeaking();
        setIsSpeakingId(msgId);
        (window as any).AndroidApp.speakText(cleanText, msgId);
      }
      return;
    }

    if (!window.speechSynthesis) return;

    if (isSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => {
        setIsSpeakingId(null);
      };
      utterance.onerror = () => {
        setIsSpeakingId(null);
      };
      setIsSpeakingId(msgId);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Automated prompt-optimizing wizard (simulated using heuristics or general API proxy)
  const handleEnhancePrompt = async () => {
    if (!inputText.trim()) return;
    setIsEnhancing(true);
    setSpeechError(null);

    try {
      const enhanced = await enhancePrompt(inputText);
      setInputText(enhanced);
    } catch (err) {
      console.error(err);
      // Fallback local heuristic enhancer
      setInputText((prev) => `Act as an expert. Please provide a detailed, well-structured, and comprehensive response analyzing: ${prev}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Handler for sending message
  const handleSend = () => {
    const trimmedText = inputText.trim();
    if (!trimmedText && !attachedImage) return;

    if (isListening) {
      toggleListening();
    }

    onSendMessage(trimmedText, attachedImage || undefined, attachedFileName || undefined);
    setInputText("");
    setAttachedImage(null);
    setAttachedFileName(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Customized Markdown parsing logic tailored to clean output inside our message bubbles
  const renderMarkdown = (rawText: string) => {
    // Strip internal reasoning <think>...</think> blocks to show response only
    const text = rawText
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<think>[\s\S]*/gi, "")
      .trim();

    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.split("\n");
        const lang = lines[0].slice(3).trim() || "code";
        const code = lines.slice(1, -1).join("\n");

        return (
          <div key={index} className="my-3 overflow-hidden rounded-xl border border-slate-200 shadow-xs bg-slate-900" id={`code-block-${index}`}>
            {/* Code Header */}
            <div className="flex justify-between items-center px-4 py-2 bg-slate-950 text-[10px] font-mono text-slate-400 border-b border-slate-800">
              <span>{lang.toUpperCase()}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-slate-200 transition-colors cursor-pointer"
                id={`copy-code-${index}`}
              >
                Copy
              </button>
            </div>
            {/* Code Content */}
            <pre className="p-4 overflow-x-auto max-w-full custom-scrollbar text-[#E2E8F0] font-mono text-xs leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Format plain text block: blockquotes, lists, bold, inline code
      const paragraphs = part.split("\n\n");

      return paragraphs.map((p, pIdx) => {
        if (!p.trim()) return null;

        // Blockquotes
        if (p.startsWith(">")) {
          return (
            <blockquote key={pIdx} className="pl-4 my-2 italic border-l-4 border-[#FF4D4D] text-slate-500">
              {p.slice(1).trim()}
            </blockquote>
          );
        }

        // Bullet list
        if (p.startsWith("- ") || p.startsWith("* ")) {
          const listItems = p.split(/\n[*-] /);
          return (
            <ul key={pIdx} className="my-2 pl-6 list-disc space-y-1 text-slate-700 dark:text-white">
              {listItems.map((item, itemIdx) => {
                const cleaned = itemIdx === 0 ? item.replace(/^[*-] /, "") : item;
                return <li key={itemIdx}>{parseInlineFormatting(cleaned)}</li>;
              })}
            </ul>
          );
        }

        // Numbered list
        if (/^\d+\.\s/.test(p)) {
          const listItems = p.split(/\n\d+\.\s/);
          return (
            <ol key={pIdx} className="my-2 pl-6 list-decimal space-y-1 text-slate-700 dark:text-white">
              {listItems.map((item, itemIdx) => {
                const cleaned = itemIdx === 0 ? item.replace(/^\d+\.\s/, "") : item;
                return <li key={itemIdx}>{parseInlineFormatting(cleaned)}</li>;
              })}
            </ol>
          );
        }

        // Headers (H1, H2, H3)
        if (p.startsWith("### ")) {
          return (
            <h4 key={pIdx} className="mt-4 mb-2 text-sm font-bold text-slate-900 dark:text-white font-display">
              {parseInlineFormatting(p.replace("### ", ""))}
            </h4>
          );
        }
        if (p.startsWith("## ")) {
          return (
            <h3 key={pIdx} className="mt-5 mb-2 text-base font-bold text-slate-900 dark:text-white font-display">
              {parseInlineFormatting(p.replace("## ", ""))}
            </h3>
          );
        }
        if (p.startsWith("# ")) {
          return (
            <h2 key={pIdx} className="mt-6 mb-3 text-lg font-bold text-slate-900 dark:text-white font-display">
              {parseInlineFormatting(p.replace("# ", ""))}
            </h2>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed text-slate-700 dark:text-white mb-2 break-all sm:break-words">
            {parseInlineFormatting(p)}
          </p>
        );
      });
    });
  };

  const parseInlineFormatting = (text: string) => {
    const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return tokens.map((token, index) => {
      if (token.startsWith("**") && token.endsWith("**")) {
        return <strong key={index} className="font-bold text-slate-900 dark:text-white">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith("`") && token.endsWith("`")) {
        return (
          <code key={index} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-red-950/50 border border-slate-200 dark:border-red-900/50 text-[#FF4D4D] dark:text-red-400 font-mono text-[11px]">
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  const formattedTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      className="relative flex flex-col h-full bg-white dark:bg-[#030308] flex-1 text-slate-800 dark:text-slate-100"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      id="chat-area-container"
    >
      {/* Drag & Drop Visual overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-[#FF4D4D]/10 backdrop-blur-md border-4 border-dashed border-[#FF4D4D] rounded-3xl m-4"
            id="drag-upload-overlay"
          >
            <div className="flex flex-col items-center gap-4 bg-white border border-slate-200 p-8 rounded-2xl shadow-xl max-w-sm text-center">
              <div className="w-16 h-16 rounded-full bg-[#FF4D4D]/10 flex items-center justify-center border border-[#FF4D4D]/20 text-[#FF4D4D]">
                <ImageIcon className="w-8 h-8 animate-bounce" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base font-display">Drop Your Image</h3>
                <p className="text-xs text-slate-500 mt-1">Upload this image to send along with your message to Gemini.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER PANEL */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3.5 sm:py-4 pt-[max(env(safe-area-inset-top),48px)] sm:pt-4 border-b border-slate-200/80 dark:border-neutral-900 bg-white dark:bg-[#09090b] shadow-xs shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Menu Trigger */}
          <button
            onClick={onToggleSidebarMobile}
            className="p-2 text-slate-500 dark:text-slate-400 transition-colors rounded-lg hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1c1c22] cursor-pointer shrink-0"
            id="mobile-sidebar-toggle-btn"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Top Brand Dropdown / Assistant Header */}
          {currentView === "chat" ? (
            session && user ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 dark:bg-[#121216] border border-slate-150 dark:border-neutral-800 text-lg sm:text-xl shadow-xs shrink-0">
                  {assistant?.avatar || "🤖"}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-[#FF4D4D] flex items-center gap-1.5 truncate">
                    <span className="truncate">{assistant?.name || "Assistant"}</span>
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">{assistant?.role || "Companion"}</p>
                </div>
              </div>
            ) : (
              /* BRAND SELECTOR */
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-sm font-extrabold text-slate-900 dark:text-[#FF4D4D] font-display truncate">Wes Ai Studio v1.0</span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            )
          ) : currentView === "history" ? (
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setCurrentView("chat")}
                className="flex items-center gap-1 text-xs font-bold text-[#FF4D4D] hover:underline cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <span className="text-sm font-extrabold text-slate-900 dark:text-[#FF4D4D] font-display truncate">Recent</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setCurrentView("history")}
                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:underline cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-extrabold text-slate-900 dark:text-[#FF4D4D] font-display truncate">Search Threads</span>
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">


          {currentView === "chat" && session && user && (
            <>
              <button
                onClick={() => setCurrentView("history")}
                className="p-2 text-slate-400 transition-colors rounded-lg hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1c1c22] cursor-pointer shrink-0"
                title="View Recent History"
                id="header-history-view-btn"
              >
                <Clock className="w-5 h-5" />
              </button>

              {/* IN-CHAT MODEL SELECTOR DROPDOWN TRIGGER */}
              <div ref={modelSelectorRef} className="relative">
                <button
                  onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-[#121216]/90 border border-slate-200 dark:border-neutral-800 rounded-xl hover:border-[#FF4D4D]/50 hover:bg-slate-50 dark:hover:bg-[#18181f] transition-all shadow-xs cursor-pointer max-w-[160px] xs:max-w-[200px] sm:max-w-none"
                  title="Switch Active AI Model"
                  id="chat-header-model-selector-btn"
                >
                  <span className="text-sm sm:text-base shrink-0">
                    {settings.activeProvider === "local" ? "💻" : (MODEL_OPTIONS.find((m) => m.id === preferredModel)?.icon || "🤖")}
                  </span>
                  <span className="max-w-[80px] xs:max-w-[120px] sm:max-w-[150px] truncate font-medium text-[12px] sm:text-sm">
                    {settings.activeProvider === "local"
                      ? formatShortModelName(settings.localLlmModel || "Local LLM")
                      : (MODEL_OPTIONS.find((m) => m.id === preferredModel)?.name || preferredModel)}
                  </span>
                  <ChevronDown className={`w-4 h-4 sm:w-4 sm:h-4 text-slate-400 transition-transform shrink-0 ${isModelSelectorOpen ? "rotate-180" : ""}`} />
                </button>

                {/* MODEL SELECTOR DROPDOWN POPOVER */}
                <AnimatePresence>
                  {isModelSelectorOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-[#0c0c12]/95 backdrop-blur-xl border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden p-2 text-slate-800 dark:text-slate-100"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800/80 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono">Select AI Engine / Sub-Model</span>
                        <button
                          onClick={loadLocalModels}
                          className="flex items-center gap-1 text-[10px] font-bold text-[#FF4D4D] hover:underline cursor-pointer"
                          title="Re-scan local Ollama models"
                        >
                          <RefreshCw className={`w-3 h-3 ${isFetchingLocalModels ? "animate-spin" : ""}`} /> Refresh
                        </button>
                      </div>

                      <div className="max-h-80 overflow-y-auto custom-scrollbar py-1 space-y-3">
                        {/* 1. CLOUD SUB-MODELS (Filtered by active provider selected in Settings) */}
                        {settings.activeProvider !== "local" && (
                          <div>
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                              <span>Active Provider Sub-Models ({settings.activeProvider})</span>
                              <span className="text-[9px] text-[#FF4D4D] font-mono">From Settings</span>
                            </div>
                            <div className="space-y-1 mt-0.5">
                              {MODEL_OPTIONS.filter((m) => m.provider === settings.activeProvider).map((m) => {
                                const isSelected = preferredModel === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    onClick={() => {
                                      onSaveSettings({
                                        ...settings,
                                        preferredModel: m.id,
                                      });
                                      setIsModelSelectorOpen(false);
                                    }}
                                    className={`w-full flex items-start gap-2.5 p-2 rounded-xl transition-all text-left cursor-pointer ${isSelected
                                        ? "bg-[#FF4D4D]/10 border border-[#FF4D4D]/40 text-slate-900 dark:text-[#FF4D4D] font-bold"
                                        : "hover:bg-slate-100 dark:hover:bg-[#16161e] border border-transparent text-slate-700 dark:text-slate-300"
                                      }`}
                                  >
                                    <span className="text-base shrink-0 mt-0.5">{m.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-bold truncate">{m.name}</span>
                                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400">{m.badge}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate mt-0.5">{m.description}</p>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-[#FF4D4D] shrink-0 mt-1" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 2. DYNAMIC LOCAL OLLAMA SUB-MODELS */}
                        <div className="border-t border-slate-100 dark:border-neutral-800/80 pt-2">
                          <div className="px-2 py-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Local LLM Models (Ollama API)
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {dynamicLocalModels.length > 0 ? `${dynamicLocalModels.length} models loaded` : "No models"}
                            </span>
                          </div>

                          {dynamicLocalModels.length > 0 ? (
                            <div className="space-y-1 mt-1">
                              {dynamicLocalModels.map((lm) => {
                                const isSelected = settings.activeProvider === "local" && settings.localLlmModel === lm.id;
                                return (
                                  <button
                                    key={lm.id}
                                    onClick={() => {
                                      onSaveSettings({
                                        ...settings,
                                        activeProvider: "local",
                                        preferredModel: "local",
                                        localLlmModel: lm.id,
                                      });
                                      setIsModelSelectorOpen(false);
                                    }}
                                    className={`w-full flex items-start gap-2.5 p-2 rounded-xl transition-all text-left cursor-pointer ${isSelected
                                        ? "bg-emerald-500/10 border border-emerald-500/40 text-slate-900 dark:text-emerald-400 font-bold"
                                        : "hover:bg-slate-100 dark:hover:bg-[#16161e] border border-transparent text-slate-700 dark:text-slate-300"
                                      }`}
                                  >
                                    <span className="text-base shrink-0 mt-0.5">💻</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-bold truncate">{lm.name}</span>
                                        {lm.size && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{lm.size}</span>}
                                      </div>
                                      <p className="text-[10px] text-slate-400 truncate mt-0.5">Local model on {settings.localLlmUrl || "http://localhost:11434"}</p>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-2.5 bg-slate-50 dark:bg-[#121218] rounded-xl border border-slate-200 dark:border-neutral-800 text-center space-y-1.5 mt-1">
                              <p className="text-[11px] text-slate-400">
                                {isFetchingLocalModels ? "Scanning local Ollama models..." : "No local models detected on Ollama server."}
                              </p>
                              <button
                                onClick={loadLocalModels}
                                className="px-3 py-1 bg-[#FF4D4D] text-white text-[10px] font-bold rounded-lg hover:bg-[#FF3333] transition-colors cursor-pointer"
                              >
                                Scan Server Again 🔄
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={onClearSession}
                className="p-1.5 text-slate-400 transition-colors rounded-lg hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-[#1c1c22] cursor-pointer"
                title="Clear Thread"
                id="header-clear-chat-btn"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* CANVAS MAIN BODY */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-[#000000]">

        {/* SPEECH RECORDING ERRORS */}
        {speechError && (
          <div className="max-w-2xl mx-auto p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs">
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold">System Status Warning</h5>
              <p className="mt-0.5 leading-relaxed">{speechError}</p>
            </div>
          </div>
        )}

        {/* 1. HISTORY VIEW */}
        {currentView === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto space-y-4"
          >
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversations ({sessions.length})</span>
              {sessions.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete all threads?")) {
                      sessions.forEach((s) => onDeleteSession(s.id));
                    }
                  }}
                  className="text-xs font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
                <p className="text-slate-400 text-sm">No recent conversations yet.</p>
                <button
                  onClick={() => {
                    onNewChat("ava");
                    setCurrentView("chat");
                  }}
                  className="mt-4 px-4 py-2 bg-[#FF4D4D] text-white font-bold text-xs rounded-xl hover:bg-[#FF3333] transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => {
                  const sAssistant = ASSISTANTS.find((a) => a.id === s.assistantId);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        onSelectSession(s.id);
                        setCurrentView("chat");
                      }}
                      className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#FF4D4D]/20 hover:shadow-md transition-all cursor-pointer relative"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                          {sAssistant?.avatar || "🤖"}
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-[#FF4D4D] transition-colors">
                            {s.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(s.updatedAt).toLocaleDateString()} {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(s.id);
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-slate-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Thread"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* 2. SEARCH VIEW */}
        {currentView === "search" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto space-y-6"
          >
            {/* Search Input Bar with Pink/Red Border (Image 9) */}
            <div className="relative flex items-center bg-white border-2 border-[#FF4D4D] rounded-2xl p-3 shadow-xs">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search threads..."
                className="w-full bg-transparent border-none outline-none text-slate-800 text-xs font-medium placeholder:text-slate-400"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* If Search query is empty, show "Previous Search" terms (Image 9) */}
            {!searchQuery ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800 tracking-tight font-display">Previous Search</span>
                  <button
                    onClick={() => savePreviousSearches([])}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Clear All
                  </button>
                </div>
                {previousSearches.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No past search entries.</p>
                ) : (
                  <div className="space-y-1.5">
                    {previousSearches.map((term, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors cursor-pointer"
                        onClick={() => setSearchQuery(term)}
                      >
                        <span className="text-xs text-slate-600 truncate pr-4 text-left font-medium">{term}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            savePreviousSearches(previousSearches.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded-md"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* If search query exists, render filtered threads */
              (() => {
                const queryLower = searchQuery.toLowerCase();
                const filtered = sessions.filter((s) => {
                  const titleMatch = s.title.toLowerCase().includes(queryLower);
                  const msgMatch = s.messages?.some((m) => m.content.toLowerCase().includes(queryLower)) || false;
                  return titleMatch || msgMatch;
                });

                if (filtered.length > 0) {
                  return (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Results ({filtered.length})</span>
                      {filtered.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            // Add to previous searches to simulate figma flow
                            if (!previousSearches.includes(searchQuery)) {
                              savePreviousSearches([searchQuery, ...previousSearches.slice(0, 5)]);
                            }
                            onSelectSession(s.id);
                            setCurrentView("chat");
                          }}
                          className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#FF4D4D]/20 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <span className="text-xl">🤖</span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{s.title}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(s.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                        </div>
                      ))}
                    </div>
                  );
                }

                {/* Empty State: Oops, nothing matched (Image 10) */ }
                return (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6 text-slate-300">
                      <rect x="25" y="35" width="70" height="55" rx="16" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="3" />
                      <rect x="42" y="90" width="36" height="12" rx="4" fill="#CBD5E1" />
                      <line x1="60" y1="20" x2="60" y2="35" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="60" cy="18" r="4" fill="#FF4D4D" />
                      {/* Sad Crying Eyes */}
                      <path d="M42 55Q47 50 52 55" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                      <path d="M68 55Q73 50 78 55" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                      {/* Tears */}
                      <path d="M47 58V68" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M73 58V68" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                      {/* Sad Mouth */}
                      <path d="M52 76Q60 70 68 76" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                    </svg>
                    <h3 className="text-lg font-extrabold text-slate-800 font-display">Oops, nothing matched</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                      Try checking your spelling or using different keywords.
                    </p>
                  </div>
                );
              })()
            )}
          </motion.div>
        )}

        {/* 3. CORE CHAT VIEW */}
        {currentView === "chat" && (
          <>
            {(!user || !session) ? (
              /* ========================================================
                 GORGEOUS MOCKUP LANDING PAGE (Mimicking Image 1 and 2)
                 ======================================================== */
              <div className="flex flex-col items-center justify-center min-h-[80%] text-center max-w-md mx-auto py-12 px-4">

                {/* Soft, pulsing coral circle background */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-[#FF4D4D]/10 blur-2xl rounded-full scale-125 animate-pulse"></div>
                  <div className="relative w-20 h-20 rounded-3xl bg-[#FF4D4D] shadow-xl shadow-[#FF4D4D]/25 flex items-center justify-center text-white text-3xl font-black font-display">
                    👋
                  </div>
                </div>

                {/* Core Mockup Text */}
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                  Hey there 👋
                </h1>

                <p className="text-sm font-semibold text-slate-700 mt-4 leading-relaxed">
                  I'm your AI buddy — ready to chat, answer, and assist.
                </p>

                <p className="text-xs text-slate-400 mt-2 font-medium">
                  Just say the word.
                </p>

                {/* Simulated Feature Grid */}
                <div className="grid grid-cols-2 gap-2.5 w-full mt-8 text-left">
                  <div className="p-3 bg-white border border-slate-150 rounded-2xl shadow-xs">
                    <span className="text-xs font-bold text-[#FF4D4D] block mb-1">Interactive Avatars</span>
                    <span className="text-[10px] text-slate-500 leading-normal">Choose between expert roles such as Ava, Devo, and Lyra.</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-150 rounded-2xl shadow-xs">
                    <span className="text-xs font-bold text-[#FF4D4D] block mb-1">Voice Recorder</span>
                    <span className="text-[10px] text-slate-500 leading-normal">Fast, high-accuracy dictation built natively in-app.</span>
                  </div>
                </div>
              </div>
            ) : (!session?.messages || session.messages.length === 0 || (session.messages.length === 1 && session.messages[0].id === "msg_welcome_initial")) ? (
              /* ========================================================
                 CAPABILITIES DASHBOARD TOGGLE VIEW (Image 4 and Image 5)
                 ======================================================== */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto py-4"
                id="capabilities-dashboard"
              >
                {/* Top Toolbar inside Dashboard to switch Layout style & view recent history */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={() => setCapabilitiesLayout(capabilitiesLayout === "grid" ? "list" : "grid")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                    title="Toggle Dashboard layout (Grid vs List)"
                  >
                    {capabilitiesLayout === "grid" ? (
                      <>
                        <List className="w-3.5 h-3.5" /> List View
                      </>
                    ) : (
                      <>
                        <LayoutGrid className="w-3.5 h-3.5" /> Grid View
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setCurrentView("history")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-150 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                    title="View Recent Conversations"
                  >
                    <Clock className="w-3.5 h-3.5" /> Recent
                  </button>
                </div>

                {capabilitiesLayout === "grid" ? (
                  /* ==========================================
                     LAYOUT A: GRID VIEW (Figma Design Image 4)
                     ========================================== */
                  <div className="text-left space-y-6">
                    {/* Header */}
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight font-display bg-gradient-to-r from-[#FF4D4D] via-pink-500 to-indigo-400 bg-clip-text text-transparent">
                        Hey {(user?.name || "User").split(" ")[0]} 👋
                      </h2>
                      <p className="text-slate-800 dark:text-slate-200 font-extrabold text-base mt-1">
                        What would you like to do today?
                      </p>
                      <p className="text-slate-400 dark:text-slate-400 text-xs mt-0.5">
                        Explore what I can help with
                      </p>
                    </div>

                    {/* Cards Grid with Color-Bleeding Glassmorphism */}
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Ava (General Assistant) */}
                      <div
                        onClick={() => onNewChat("ava")}
                        className="group p-4 bg-white/70 dark:bg-[#0c0c12]/80 backdrop-blur-md border border-red-500/20 dark:border-red-500/30 hover:border-[#FF4D4D] rounded-2xl hover:shadow-lg hover:shadow-[#FF4D4D]/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between aspect-square"
                      >
                        <div>
                          <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">🤖</span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#FF4D4D] transition-colors">Ava</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                            General Assistant. Get answers, plan routines, and brainstorm.
                          </p>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#FF4D4D] self-end mt-2 flex items-center gap-0.5">
                          Chat with Ava →
                        </span>
                      </div>

                      {/* Lyra (Creative Copywriter) */}
                      <div
                        onClick={() => onNewChat("lyra")}
                        className="group p-4 bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-violet-500/10 dark:from-amber-950/20 dark:via-rose-950/20 dark:to-violet-950/20 backdrop-blur-md border border-violet-500/30 dark:border-violet-500/40 hover:border-violet-400 rounded-2xl hover:shadow-lg hover:shadow-violet-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between aspect-square"
                      >
                        <div>
                          <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">✨</span>
                          <h4 className="text-sm font-bold text-violet-600 dark:text-violet-400 mt-2">Lyra</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                            Creative Copywriter. Craft emails, blog posts, and stories.
                          </p>
                        </div>
                        <span className="text-[10px] font-extrabold text-violet-500 dark:text-violet-400 self-end mt-2">
                          Get Creative →
                        </span>
                      </div>

                      {/* Kai (Language Tutor) */}
                      <div
                        onClick={() => onNewChat("kai")}
                        className="group p-4 bg-white/70 dark:bg-[#0c0c12]/80 backdrop-blur-md border border-indigo-500/20 dark:border-indigo-500/30 hover:border-indigo-400 rounded-2xl hover:shadow-lg hover:shadow-indigo-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between aspect-square"
                      >
                        <div>
                          <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">🗣️</span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-400 transition-colors">Kai</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                            Language Tutor. Learn new languages or practice interviews.
                          </p>
                        </div>
                        <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 self-end mt-2">
                          Let's Talk →
                        </span>
                      </div>

                      {/* Devo (Elite Coder) */}
                      <div
                        onClick={() => onNewChat("devo")}
                        className="group p-4 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 dark:from-emerald-950/30 dark:via-cyan-950/30 dark:to-indigo-950/30 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-500/40 hover:border-emerald-400 rounded-2xl hover:shadow-lg hover:shadow-emerald-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between aspect-square"
                      >
                        <div>
                          <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">💻</span>
                          <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 transition-colors mt-2">Devo</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                            Elite Coder. Generate robust code, debug errors, or explain algorithms.
                          </p>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 self-end mt-2">
                          Dev Tools →
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ==========================================
                     LAYOUT B: LIST VIEW (Figma Design Image 5)
                     ========================================== */
                  <div className="text-left space-y-4">
                    {/* Header */}
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                        Capabilities
                      </h2>
                      <p className="text-slate-400 text-xs mt-1">
                        Explore what I can help with
                      </p>
                    </div>

                    {/* Vertical rows */}
                    <div className="space-y-2.5">
                      {/* Ava row */}
                      <div
                        onClick={() => onNewChat("ava")}
                        className="p-4 bg-white border border-slate-100 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🤖</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Ava</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">General Assistant. Get answers, plan routines.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#FF4D4D]">Chat with Ava →</span>
                      </div>

                      {/* Lyra row */}
                      <div
                        onClick={() => onNewChat("lyra")}
                        className="p-4 bg-rose-50/15 border border-rose-200 hover:border-rose-300 rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">✨</span>
                          <div>
                            <h4 className="text-xs font-bold text-rose-500">Lyra</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Creative Copywriter. Craft emails, stories.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#FF4D4D]">Get Creative →</span>
                      </div>

                      {/* Kai row */}
                      <div
                        onClick={() => onNewChat("kai")}
                        className="p-4 bg-white border border-slate-100 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🗣️</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Kai</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Language Tutor. Learn new languages.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Let's Talk</span>
                      </div>

                      {/* Devo row */}
                      <div
                        onClick={() => onNewChat("devo")}
                        className="p-4 bg-white border border-slate-100 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">💻</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Devo</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Elite Coder. Generate code, debug.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Dev Tools</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* ========================================================
                 MAIN CHAT MESSAGE FEED (List of bubbles)
                 ======================================================== */
              <div className="space-y-6 max-w-3xl mx-auto" id="message-feed-list">
                {(session?.messages || []).map((msg) => {
                  const isUser = msg.role === "user";

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                      id={`chat-bubble-${msg.id}`}
                    >
                      {/* Left Avatar for Model */}
                      {!isUser && (
                        <div className="flex-shrink-0 w-8.5 h-8.5 rounded-xl bg-white dark:bg-[#121218] border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-base shadow-xs">
                          {assistant?.avatar || "🤖"}
                        </div>
                      )}

                      {/* Bubble Box */}
                      <div className={`relative flex flex-col min-w-0 max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                        {/* Optional Image/Document attachment block */}
                        {msg.image && (
                          <div className="mb-2 overflow-hidden border border-slate-200 rounded-2xl max-w-sm shadow-xs bg-white p-1">
                            <a
                              href={msg.image}
                              target="_blank"
                              rel="noopener noreferrer"
                              download="attachment"
                              className="block cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={(e) => {
                                if ((window as any).AndroidApp) {
                                  e.preventDefault();
                                  const parts = msg.image!.split(',');
                                  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
                                  const bstr = parts[1];
                                  const fileName = msg.fileName || "attached_document.file";
                                  (window as any).AndroidApp.openDocument(bstr, mime, fileName);
                                }
                              }}
                            >
                              {msg.image.startsWith("data:image/") ? (
                                <img
                                  src={msg.image}
                                  alt="User attached file"
                                  className="w-full h-auto max-h-48 object-cover rounded-xl"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500 shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                  </div>
                                  <div className="text-xs font-bold text-slate-700 truncate">
                                    {msg.fileName ? msg.fileName : "Attached Document"}
                                    <span className="block text-[9px] font-normal text-slate-400">Click to open</span>
                                  </div>
                                </div>
                              )}
                            </a>
                          </div>
                        )}

                        {/* Content pill */}
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed overflow-hidden break-words ${isUser
                              ? "bg-[#FF4D4D] text-white rounded-tr-none shadow-md shadow-[#FF4D4D]/10 font-medium"
                              : "bg-white dark:bg-[#0e0e14] border border-slate-200/80 dark:border-neutral-800 text-slate-800 dark:text-rose-100 rounded-tl-none shadow-xs"
                            }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          ) : (
                            <div className="prose max-w-none prose-slate dark:prose-invert text-slate-800 dark:text-rose-100 prose-sm break-words">
                              {renderMarkdown(msg.content)}
                            </div>
                          )}
                        </div>

                        {/* Meta bar: timestamp & speech/copy actions */}
                        <div className="flex items-center gap-3 mt-2 px-1 text-xs text-slate-400 font-mono flex-wrap">
                          <span>{formattedTime(msg.timestamp)}</span>
                          <span>•</span>

                          {/* Copy action */}
                          <button
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer py-1.5 px-1 flex items-center gap-1 min-h-[36px]"
                            title="Copy message text"
                            id={`copy-action-${msg.id}`}
                          >
                            {copiedMessageId === msg.id ? (
                              <span className="text-emerald-500 flex items-center gap-1 font-bold">
                                <Check className="w-4 h-4" /> Copied
                              </span>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" /> <span className="font-medium">Copy</span>
                              </>
                            )}
                          </button>

                          {/* Edit Chat action (for user messages) */}
                          {isUser && (
                            <>
                              <span>•</span>
                              <button
                                onClick={() => {
                                  setInputText(msg.content);
                                  if (msg.image) setAttachedImage(msg.image);
                                  const area = document.getElementById("message-text-area");
                                  if (area) area.focus();
                                }}
                                className="hover:text-[#FF4D4D] dark:hover:text-[#FF4D4D] transition-colors flex items-center gap-1 cursor-pointer font-bold py-1.5 px-1 min-h-[36px]"
                                title="Edit Chat Message"
                                id={`edit-action-${msg.id}`}
                              >
                                <Pencil className="w-4 h-4" /> Edit
                              </button>
                            </>
                          )}

                          {/* Read Aloud action (only for model responses) */}
                          {!isUser && (
                            <>
                              <span>•</span>
                              <button
                                onClick={() => handleToggleSpeak(msg.id, msg.content)}
                                className={`hover:text-slate-600 transition-colors flex items-center gap-1 cursor-pointer py-1.5 px-1 font-medium min-h-[36px] ${isSpeakingId === msg.id ? "text-[#FF4D4D] font-bold" : ""
                                  }}`}
                                title="Speak response text"
                                id={`speak-action-${msg.id}`}
                              >
                                {isSpeakingId === msg.id ? (
                                  <>
                                    <VolumeX className="w-4 h-4 animate-pulse" /> Stop Voice
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-4 h-4" /> Read Aloud
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right Avatar for User */}
                      {isUser && (
                        <div className="flex-shrink-0 w-8.5 h-8.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 flex items-center justify-center font-extrabold text-[10px] text-[#FF4D4D] shadow-xs uppercase font-mono">
                          {(user?.name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Shimmer typing indicator when loading */}
                {isGenerating && (
                  <div className="flex gap-4 justify-start" id="typing-indicator">
                    <div className="flex-shrink-0 w-8.5 h-8.5 rounded-xl bg-white dark:bg-[#121218] border border-slate-200 dark:border-neutral-800 flex items-center justify-center text-base">
                      {assistant?.avatar || "🤖"}
                    </div>
                    <div className="flex flex-col items-start max-w-[75%]">
                      <div className="px-4 py-3 bg-white dark:bg-[#0e0e14] border border-slate-200/80 dark:border-neutral-800 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-[#FF4D4D] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2 h-2 rounded-full bg-[#FF4D4D] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2 h-2 rounded-full bg-[#FF4D4D] animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono mt-1 px-1 font-bold">Thinking...</span>
                    </div>
                  </div>
                )}

                {/* 4. CANCEL GENERATION (Stop Generating) (Image 7) */}
                {isGenerating && (
                  <div className="flex items-center justify-center py-2" id="stop-generating-container">
                    <button
                      onClick={onStopGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 shadow-sm rounded-full text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 bg-[#FF4D4D] rounded-xs shrink-0 block"></span>
                      Stop generating...
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </>
        )}
      </div>



      {/* MESSAGE INPUT CONTROL DECK */}
      <div className="p-4 border-t border-slate-200 dark:border-neutral-800/80 bg-white dark:bg-[#030308]">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Attachment Preview area */}
          <AnimatePresence>
            {attachedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="relative inline-flex items-center gap-2.5 p-1.5 pr-3 bg-slate-50 border border-slate-200 rounded-xl"
                id="image-preview-panel"
              >
                {attachedImage.startsWith("data:image/") ? (
                  <img
                    src={attachedImage}
                    alt="Selected attachment preview"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                  </div>
                )}
                <div className="text-left overflow-hidden">
                  <div className="text-[10px] font-bold text-slate-700 truncate">
                    {attachedFileName ? attachedFileName : (attachedImage.startsWith("data:image/") ? "attached_image.jpg" : "attached_document.file")}
                  </div>
                  <div className="text-[9px] text-[#FF4D4D] font-bold uppercase truncate">Multimodal Input</div>
                </div>
                <button
                  onClick={() => {
                    setAttachedImage(null);
                    setAttachedFileName(null);
                  }}
                  className="p-1 ml-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  id="remove-image-preview-btn"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Input Row */}
          <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-[#09090e] border border-slate-200 dark:border-neutral-800 rounded-2xl p-2.5 focus-within:border-[#FF4D4D]/50 focus-within:ring-1 focus-within:ring-[#FF4D4D]/25 transition-all">

            {/* Attachment Picker button */}
            <button
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0 cursor-pointer"
              title="Attach photo/image file"
              id="image-attachment-trigger"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*, application/pdf, text/plain, .doc, .docx, .md, .csv"
              className="hidden"
              id="hidden-file-input"
            />

            {/* Textarea field */}
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                const input = e.target;
                input.setAttribute('data-value', input.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening... Speak naturally" : `Message ${assistant?.name || "Ava"}...`}
              rows={1}
              className="flex-1 max-h-32 min-h-[36px] bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-none outline-none focus:ring-0 resize-none py-1.5 px-1 font-sans custom-scrollbar"
              id="message-text-area"
            />

            {/* Accessory Action Set */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Voice Dictation Toggler */}
              <button
                onClick={toggleListening}
                className={`p-2 rounded-xl transition-all cursor-pointer ${isListening
                    ? "bg-red-50 border border-red-100 text-[#FF4D4D] animate-pulse"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                  }`}
                title={isListening ? "Stop voice listening" : "Dictate message"}
                id="voice-dictation-btn"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Live Mode Toggler */}
              <button
                onClick={() => {
                  try {
                    getGeminiApiKey(settings); // check if key exists
                    setIsLiveModeOpen(true);
                    setLiveModeError(null);
                  } catch (e: any) {
                    setLiveModeError(e.message);
                  }
                }}
                className="p-2 text-cyan-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-xl transition-all cursor-pointer relative group"
                title="Gemini Live Video & Voice"
              >
                <div className="absolute inset-0 bg-cyan-400/20 rounded-xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                <Video className="w-5 h-5 relative z-10" />
              </button>

              {/* Prompt Polishing Wand */}
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !inputText.trim()}
                className={`p-2 text-slate-400 hover:text-[#FF4D4D] hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer ${isEnhancing ? "text-[#FF4D4D] animate-pulse" : ""
                  } disabled:opacity-30 disabled:pointer-events-none`}
                title="Optimize/Enhance Prompt with AI"
                id="enhance-prompt-btn"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* Send action */}
              {isListening ? (
                <button
                  onClick={handleSend}
                  className="px-3 py-2 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#FF4D4D]/25 transition-all cursor-pointer animate-pulse shrink-0"
                  id="stop-and-send-voice-btn"
                >
                  <span className="w-2.5 h-2.5 bg-white rounded-[2px] block shrink-0" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={isGenerating || (!inputText.trim() && !attachedImage)}
                  className="p-2.5 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl transition-all shadow-md shadow-[#FF4D4D]/15 hover:shadow-[#FF4D4D]/25 cursor-pointer flex items-center justify-center shrink-0"
                  id="send-message-btn"
                >
                  <Send className="w-4.5 h-4.5 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>

          {/* Hint guidelines removed as requested */}
        </div>
      </div>

      {/* Live Mode Overlay */}
      {isLiveModeOpen && (
        <LiveMode
          apiKey={getGeminiApiKey(settings)}
          onClose={() => setIsLiveModeOpen(false)}
        />
      )}

      {/* Live Mode Error */}
      {liveModeError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle className="w-4 h-4" />
          {liveModeError}
          <button onClick={() => setLiveModeError(null)} className="ml-2 bg-black/20 p-1 rounded-md hover:bg-black/30">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
