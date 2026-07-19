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
  List
} from "lucide-react";
import { ChatMessage, ChatSession, AssistantPersona, ModelType, UserAccount } from "../types";
import { ASSISTANTS } from "../constants";
import { motion, AnimatePresence } from "motion/react";
import React, { useState, useRef, useEffect } from "react";

interface ChatAreaProps {
  session: ChatSession | null;
  onSendMessage: (text: string, image?: string) => void;
  onClearSession: () => void;
  onExportSession: () => void;
  isGenerating: boolean;
  onToggleSidebarMobile: () => void;
  preferredModel: ModelType;
  user: UserAccount | null;
  onTriggerAuth: (sc?: "signin" | "signup" | "verify" | "created" | "forgot") => void;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onStopGenerating: () => void;
  onNewChat: (assistantId: string) => void;
}

export default function ChatArea({
  session,
  onSendMessage,
  onClearSession,
  onExportSession,
  isGenerating,
  onToggleSidebarMobile,
  preferredModel,
  user,
  onTriggerAuth,
  sessions,
  onSelectSession,
  onDeleteSession,
  onStopGenerating,
  onNewChat,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
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
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setSpeechError("Microphone permission blocked or disabled inside the sandboxed preview.");
        } else {
          setSpeechError(`Voice input error: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError("Speech recognition is not natively supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        setSpeechError(null);
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
        setSpeechError("Failed to initiate voice recording. Please retry.");
      }
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
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  // Text-To-Speech Toggle
  const handleToggleSpeak = (msgId: string, content: string) => {
    if (!window.speechSynthesis) return;

    if (isSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = content.replace(/[#*`>_\-]/g, ""); // Strip markdown tags for natural speech
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `You are an expert prompt engineer. Rewrite the following user prompt to be highly detailed, clear, and context-rich so it gets an optimal response from an LLM. Return ONLY the enhanced prompt itself, without any introduction, comments, or quotes:\n\n"${inputText}"`,
          preferredModel: "gemini-3.5-flash",
          temperature: 0.5,
        }),
      });

      if (!response.ok) throw new Error("Failed to optimize prompt");
      const data = await response.json();
      if (data.content) {
        setInputText(data.content.trim());
      }
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

    // If user is unauthenticated, intercept sending and prompt login to simulate full mockup workflow
    if (!user) {
      onTriggerAuth("signin");
      return;
    }

    onSendMessage(trimmedText, attachedImage || undefined);
    setInputText("");
    setAttachedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Customized Markdown parsing logic tailored to clean output inside our message bubbles
  const renderMarkdown = (text: string) => {
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
            <ul key={pIdx} className="my-2 pl-6 list-disc space-y-1 text-slate-700">
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
            <ol key={pIdx} className="my-2 pl-6 list-decimal space-y-1 text-slate-700">
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
            <h4 key={pIdx} className="mt-4 mb-2 text-sm font-bold text-slate-900 font-display">
              {parseInlineFormatting(p.replace("### ", ""))}
            </h4>
          );
        }
        if (p.startsWith("## ")) {
          return (
            <h3 key={pIdx} className="mt-5 mb-2 text-base font-bold text-slate-900 font-display">
              {parseInlineFormatting(p.replace("## ", ""))}
            </h3>
          );
        }
        if (p.startsWith("# ")) {
          return (
            <h2 key={pIdx} className="mt-6 mb-3 text-lg font-bold text-slate-900 font-display">
              {parseInlineFormatting(p.replace("# ", ""))}
            </h2>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed text-slate-700 mb-2">
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
        return <strong key={index} className="font-bold text-slate-900">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith("`") && token.endsWith("`")) {
        return (
          <code key={index} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 border border-slate-200 text-[#FF4D4D] font-mono text-[11px]">
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
      className="relative flex flex-col h-full bg-white flex-1 text-slate-800"
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Trigger */}
          <button
            onClick={onToggleSidebarMobile}
            className="p-1.5 text-slate-500 transition-colors rounded-lg hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            id="mobile-sidebar-toggle-btn"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Top Brand Dropdown / Assistant Header */}
          {currentView === "chat" ? (
            session && user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-slate-50 border border-slate-150 text-lg shadow-xs">
                  {assistant?.avatar || "🤖"}
                </div>
                <div>
                  <h2 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    {assistant?.name || "Assistant"}
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{assistant?.role || "Companion"}</p>
                </div>
              </div>
            ) : (
              /* BRAND SELECTOR (Mimics Figma Design Image 1/3) */
              <div className="flex items-center gap-1">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-display">WesAiChat v1.0</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            )
          ) : currentView === "history" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView("chat")}
                className="flex items-center gap-1 text-xs font-bold text-[#FF4D4D] hover:underline cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <span className="text-sm font-extrabold text-slate-900 font-display">Recent</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView("history")}
                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:underline cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-extrabold text-slate-900 font-display">Search Threads</span>
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          {currentView === "chat" && session && user && (
            <>
              {/* History button to access Recent list */}
              <button
                onClick={() => setCurrentView("history")}
                className="p-1.5 text-slate-400 transition-colors rounded-lg hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                title="View Recent History"
                id="header-history-view-btn"
              >
                <Clock className="w-4 h-4" />
              </button>

              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-slate-500 bg-slate-50 border border-[#E2E8F0] rounded-lg">
                {preferredModel}
              </span>

              {/* Clear Button */}
              <button
                onClick={onClearSession}
                className="p-1.5 text-slate-400 transition-colors rounded-lg hover:text-rose-500 hover:bg-slate-100 cursor-pointer"
                title="Clear Thread"
                id="header-clear-chat-btn"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Export Button */}
              <button
                onClick={onExportSession}
                className="p-1.5 text-slate-400 transition-colors rounded-lg hover:text-[#FF4D4D] hover:bg-slate-100 cursor-pointer"
                title="Export to File"
                id="header-export-chat-btn"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}

          {currentView === "history" && (
            <button
              onClick={() => setCurrentView("search")}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Search Conversations"
            >
              <Search className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Unauthenticated Info Indicator */}
          {currentView === "chat" && (!user || !session) && (
            <button 
              onClick={() => onTriggerAuth("signin")}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
              title="Authentication Status"
            >
              <Info className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* CANVAS MAIN BODY */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar bg-slate-50/50">
        
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

                {/* Empty State: Oops, nothing matched (Image 10) */}
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
            ) : (!session?.messages || session.messages.length === 0) ? (
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
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
                        Hey {(user?.name || "User").split(" ")[0]}👋
                      </h2>
                      <p className="text-slate-900 font-extrabold text-base mt-1">
                        What would you like to do today?
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Explore what I can help with
                      </p>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Writing */}
                      <div
                        onClick={() => {
                          setInputText("Write an engaging, clear email requesting a proposal review...");
                        }}
                        className="p-4 bg-white border border-slate-150 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-md transition-all cursor-pointer flex flex-col justify-between aspect-square"
                      >
                        <div>
                          <span className="text-2xl">✍️</span>
                          <h4 className="text-sm font-bold text-slate-800 mt-2">Writing</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                            Craft emails, blog posts, descriptions, and articles.
                          </p>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 group-hover:text-[#FF4D4D] self-end mt-2">
                          Start Writing
                        </span>
                      </div>

                      {/* Creative (Rose pink border!) */}
                      <div
                        onClick={() => {
                          setInputText("Brainstorm 5 creative ideas for a sustainable clothing brand campaign");
                        }}
                        className="p-4 bg-rose-50/10 border-2 border-rose-300 hover:border-rose-400 rounded-2xl hover:shadow-md transition-all cursor-pointer flex flex-col justify-between aspect-square"
                      >
                        <div>
                          <span className="text-2xl">💡</span>
                          <h4 className="text-sm font-bold text-rose-500 mt-2">Creative</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                            Brainstorm ideas, write poems, captions or stories.
                          </p>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#FF4D4D] self-end mt-2">
                          Get Creative →
                        </span>
                      </div>

                      {/* Conversation */}
                      <div
                        onClick={() => {
                          setInputText("I want to practice my Spanish vocabulary for travel. Let's roleplay a restaurant interaction!");
                        }}
                        className="p-4 bg-white border border-slate-150 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-md transition-all cursor-pointer flex flex-col justify-between aspect-square"
                      >
                        <div>
                          <span className="text-2xl">🗣️</span>
                          <h4 className="text-sm font-bold text-slate-800 mt-2">Conversation</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                            Chat casually, learn new languages, or practice interviews.
                          </p>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 self-end mt-2">
                          Let's Talk
                        </span>
                      </div>

                      {/* Personal */}
                      <div
                        onClick={() => {
                          setInputText("Help me structure a morning routine for deep focus and high productivity.");
                        }}
                        className="p-4 bg-white border border-slate-150 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-md transition-all cursor-pointer flex flex-col justify-between aspect-square"
                      >
                        <div>
                          <span className="text-2xl">🌿</span>
                          <h4 className="text-sm font-bold text-slate-800 mt-2">Personal</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                            Get life advice, journaling prompts, or routine planners.
                          </p>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 self-end mt-2">
                          My Assistant
                        </span>
                      </div>

                      {/* Developer (Spans full width) */}
                      <div
                        onClick={() => {
                          setInputText("Write a TypeScript function to recursively search nodes in a binary tree...");
                        }}
                        className="col-span-2 p-4 bg-white border border-slate-150 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex gap-3 text-left">
                          <span className="text-2xl mt-0.5">💻</span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Developer Tools</h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                              Generate robust code, debug errors, or explain algorithms.
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 whitespace-nowrap ml-3">
                          Dev Tools
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
                      {/* Writing row */}
                      <div
                        onClick={() => {
                          setInputText("Write an engaging, clear email requesting a proposal review...");
                        }}
                        className="p-4 bg-white border border-slate-100 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">✍️</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Writing</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Emails, blogs, articles.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Start Writing</span>
                      </div>

                      {/* Creative row */}
                      <div
                        onClick={() => {
                          setInputText("Brainstorm 5 creative ideas for a sustainable clothing brand campaign");
                        }}
                        className="p-4 bg-rose-50/15 border border-rose-200 hover:border-rose-300 rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">💡</span>
                          <div>
                            <h4 className="text-xs font-bold text-rose-500">Creative</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Ideas, poems, copywriting.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#FF4D4D]">Get Creative →</span>
                      </div>

                      {/* Conversation row */}
                      <div
                        onClick={() => {
                          setInputText("I want to practice my Spanish vocabulary for travel. Let's roleplay a restaurant interaction!");
                        }}
                        className="p-4 bg-white border border-slate-100 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🗣️</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Conversation</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">casual talk, roleplays.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Let's Talk</span>
                      </div>

                      {/* Personal row */}
                      <div
                        onClick={() => {
                          setInputText("Help me structure a morning routine for deep focus and high productivity.");
                        }}
                        className="p-4 bg-white border border-slate-100 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🌿</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Personal</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">advice, routines, planning.</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Personal Assistant</span>
                      </div>

                      {/* Developer row */}
                      <div
                        onClick={() => {
                          setInputText("Write a TypeScript function to recursively search nodes in a binary tree...");
                        }}
                        className="p-4 bg-white border border-slate-100 hover:border-[#FF4D4D]/20 rounded-2xl hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">💻</span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Developer</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">Generate code, debug.</p>
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
                        <div className="flex-shrink-0 w-8.5 h-8.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-base shadow-xs">
                          {assistant?.avatar || "🤖"}
                        </div>
                      )}

                      {/* Bubble Box */}
                      <div className={`relative flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                        {/* Optional Image attachment block */}
                        {msg.image && (
                          <div className="mb-2 overflow-hidden border border-slate-200 rounded-2xl max-w-sm shadow-xs bg-white p-1">
                            <img
                              src={msg.image}
                              alt="User attached file"
                              className="w-full h-auto max-h-48 object-cover rounded-xl"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Content pill */}
                        <div
                          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                            isUser
                              ? "bg-[#FF4D4D] text-white rounded-tr-none shadow-md shadow-[#FF4D4D]/10 font-medium"
                              : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-none shadow-xs"
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="prose max-w-none prose-slate text-slate-800 prose-sm">
                              {renderMarkdown(msg.content)}
                            </div>
                          )}
                        </div>

                        {/* Meta bar: timestamp & speech/copy actions */}
                        <div className="flex items-center gap-2 mt-1.5 px-1 text-[10px] text-slate-400 font-mono">
                          <span>{formattedTime(msg.timestamp)}</span>
                          <span>•</span>
                          
                          {/* Copy action */}
                          <button
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            className="hover:text-slate-600 transition-colors cursor-pointer"
                            title="Copy message text"
                            id={`copy-action-${msg.id}`}
                          >
                            {copiedMessageId === msg.id ? (
                              <span className="text-emerald-500 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Copied
                              </span>
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>

                          {/* Read Aloud action (only for model responses) */}
                          {!isUser && (
                            <>
                              <span>•</span>
                              <button
                                onClick={() => handleToggleSpeak(msg.id, msg.content)}
                                className={`hover:text-slate-600 transition-colors flex items-center gap-0.5 cursor-pointer ${
                                  isSpeakingId === msg.id ? "text-[#FF4D4D] font-bold" : ""
                                }}`}
                                title="Speak response text"
                                id={`speak-action-${msg.id}`}
                              >
                                {isSpeakingId === msg.id ? (
                                  <>
                                    <VolumeX className="w-2.5 h-2.5 animate-pulse" /> Stop Voice
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-2.5 h-2.5" /> Read Aloud
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right Avatar for User */}
                      {isUser && (
                        <div className="flex-shrink-0 w-8.5 h-8.5 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center font-extrabold text-[10px] text-[#FF4D4D] shadow-xs uppercase font-mono">
                          {(user?.name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Shimmer typing indicator when loading */}
                {isGenerating && (
                  <div className="flex gap-4 justify-start" id="typing-indicator">
                    <div className="flex-shrink-0 w-8.5 h-8.5 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-base">
                      {assistant?.avatar || "🤖"}
                    </div>
                    <div className="flex flex-col items-start max-w-[75%]">
                      <div className="px-4 py-3 bg-white border border-slate-200/80 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-1.5 animate-pulse">
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

      {/* FLOAT STICKY SIGN-IN NOTICE AT BOTTOM OF FEED (Figma Design Image 3) */}
      {currentView === "chat" && (!user || !session) && (
        <div className="px-4 py-1 bg-transparent">
          <div className="max-w-3xl mx-auto p-4 bg-white border border-slate-200 rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-left">
              <h5 className="text-xs font-extrabold text-slate-800">Sign in to unlock advanced features</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">Access chat history, smart replies, voice input, and more.</p>
            </div>
            <button
              onClick={() => onTriggerAuth("signin")}
              className="py-2.5 px-6 bg-slate-950 hover:bg-slate-900 active:bg-black text-white text-xs font-bold rounded-2xl transition-all shadow-sm cursor-pointer whitespace-nowrap self-end sm:self-auto"
            >
              Sign in
            </button>
          </div>
        </div>
      )}

      {/* MESSAGE INPUT CONTROL DECK */}
      <div className="p-4 border-t border-slate-200 bg-white">
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
                <img
                  src={attachedImage}
                  alt="Selected attachment preview"
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                />
                <div className="text-left">
                  <div className="text-[10px] font-bold text-slate-700">attached_file.png</div>
                  <div className="text-[9px] text-[#FF4D4D] font-bold uppercase">Multimodal Input</div>
                </div>
                <button
                  onClick={() => setAttachedImage(null)}
                  className="p-1 ml-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  id="remove-image-preview-btn"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Input Row */}
          <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 focus-within:border-[#FF4D4D]/50 focus-within:ring-1 focus-within:ring-[#FF4D4D]/25 transition-all">
            
            {/* Attachment Picker button */}
            <button
              onClick={() => {
                if (!user) {
                  onTriggerAuth("signin");
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all shrink-0 cursor-pointer"
              title="Attach photo/image file"
              id="image-attachment-trigger"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              id="hidden-file-input"
            />

            {/* Textarea field */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening... Speak naturally" : user ? `Message ${assistant?.name || "Ava"}...` : "Ask anything"}
              rows={1}
              className="flex-1 max-h-32 min-h-[36px] bg-transparent text-sm text-slate-800 placeholder-slate-400 border-none outline-none focus:ring-0 resize-none py-1.5 px-1 font-sans custom-scrollbar"
              id="message-text-area"
            />

            {/* Accessory Action Set */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Voice Dictation Toggler */}
              <button
                onClick={toggleListening}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isListening
                    ? "bg-red-50 border border-red-100 text-[#FF4D4D] animate-pulse"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                }`}
                title={isListening ? "Stop voice listening" : "Dictate message"}
                id="voice-dictation-btn"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Prompt Polishing Wand */}
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !inputText.trim()}
                className={`p-2 text-slate-400 hover:text-[#FF4D4D] hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer ${
                  isEnhancing ? "text-[#FF4D4D] animate-pulse" : ""
                } disabled:opacity-30 disabled:pointer-events-none`}
                title="Optimize/Enhance Prompt with AI"
                id="enhance-prompt-btn"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* Send action */}
              <button
                onClick={handleSend}
                disabled={isGenerating || (!inputText.trim() && !attachedImage)}
                className="p-2.5 bg-[#FF4D4D] hover:bg-[#FF3333] active:bg-[#E63939] disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl transition-all shadow-md shadow-[#FF4D4D]/15 hover:shadow-[#FF4D4D]/25 cursor-pointer flex items-center justify-center shrink-0"
                id="send-message-btn"
              >
                <Send className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Hint guidelines */}
          <div className="flex justify-between items-center px-1 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
              {user ? "Press Enter to send, Shift+Enter for new line" : "Sign in above to activate thread history"}
            </span>
            {user && <span>{inputText.length} chars</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
