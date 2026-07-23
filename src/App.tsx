import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import SettingsModal from "./components/SettingsModal";
import OnboardingScreen from "./components/OnboardingScreen";
import AuthWorkflow from "./components/AuthScreens";
import { ChatSession, ChatMessage, UserSettings, ModelType, UserAccount } from "./types";
import { ASSISTANTS } from "./constants";
import { generateChatResponse } from "./geminiClient";

const LOCAL_STORAGE_SESSIONS_KEY = "wes_ai_sessions_v1";
const LOCAL_STORAGE_SETTINGS_KEY = "wes_ai_settings_v1";
const LOCAL_STORAGE_USER_KEY = "wes_ai_user_v1";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key) || localStorage.getItem(key.replace("wes_ai_", "gemini_studio_")) || localStorage.getItem(key.replace("wes_ai_", "chatterly_"));
    } catch (e) {
      console.warn("localStorage.getItem blocked/failed:", e);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage.setItem blocked/failed:", e);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage.removeItem blocked/failed:", e);
    }
  }
};

const DEFAULT_SETTINGS: UserSettings = {
  userName: "User Guest",
  preferredModel: "gemini-3.5-flash",
  temperature: 0.7,
  activeProvider: "gemini",
  localLlmProvider: "ollama",
  localLlmUrl: "http://localhost:11434",
  localLlmModel: "",
  theme: "dark",
};

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const storedSessions = safeLocalStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
    if (storedSessions) {
      try {
        const parsedSessions = JSON.parse(storedSessions);
        if (Array.isArray(parsedSessions) && parsedSessions.length > 0) {
          return parsedSessions;
        }
      } catch (e) {
        console.error("Error parsing sessions synchronously", e);
      }
    }
    const defaultSession: ChatSession = {
      id: "session_default_initial",
      title: "Introduction Thread",
      assistantId: "ava",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    safeLocalStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify([defaultSession]));
    return [defaultSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const storedSessions = safeLocalStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
    if (storedSessions) {
      try {
        const parsedSessions = JSON.parse(storedSessions);
        if (Array.isArray(parsedSessions) && parsedSessions.length > 0) {
          return parsedSessions[0].id;
        }
      } catch (e) { }
    }
    return "session_default_initial";
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [statusBarTime, setStatusBarTime] = useState("09:41");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      setStatusBarTime(`${hours}:${minutes} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  const [settings, setSettings] = useState<UserSettings>(() => {
    const storedSettings = safeLocalStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (storedSettings) {
      try {
        return JSON.parse(storedSettings);
      } catch (e) {
        console.error("Error parsing settings synchronously", e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Sync theme to document body
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.theme]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return safeLocalStorage.getItem("gemini_studio_onboarding_completed_v1") !== "true";
  });

  useEffect(() => {
    (window as any).onAndroidBackPressed = () => {
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true; // Consumed
      }
      if (isSidebarMobileOpen) {
        setIsSidebarMobileOpen(false);
        return true; // Consumed
      }
      return false; // Not consumed, will exit app
    };
  }, [isSettingsOpen, isSidebarMobileOpen]);

  // Local Profile State
  const [user, setUser] = useState<UserAccount>(() => {
    const stored = safeLocalStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return { ...parsed, isAuthenticated: true };
        }
      } catch {
        // fall through
      }
    }
    return {
      name: "User",
      email: "local@wes.ai",
      isAuthenticated: true,
      profilePicture: ""
    };
  });

  const handleSaveProfile = (updatedUser: UserAccount) => {
    setUser(updatedUser);
    safeLocalStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updatedUser));
  };

  const handleOnboardingComplete = () => {
    safeLocalStorage.setItem("gemini_studio_onboarding_completed_v1", "true");
    setShowOnboarding(false);
  };

  const handleLogout = () => {
    setUser(null);
    safeLocalStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    // Switch to first thread or default
    if (sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  };




  // Sync sessions to LocalStorage on change
  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    safeLocalStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(updatedSessions));
  };

  // Sync settings to LocalStorage on change
  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    safeLocalStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
  };

  // Create a New Chat Thread
  const handleNewChat = (assistantId: string) => {
    const assistant = ASSISTANTS.find((a) => a.id === assistantId);

    // Check if the current active session is untouched (0 messages or 1 model welcome message)
    const activeSession = sessions.find(s => s.id === activeSessionId);
    const isUntouched = activeSession && (
      activeSession.messages.length === 0 ||
      (activeSession.messages.length === 1 && activeSession.messages[0].role === "model")
    );

    if (isUntouched) {
      const updatedSessions = sessions.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            assistantId: assistantId,
            title: `New Session (${assistant?.name || "General"})`,
            messages: [], // Clear any previous welcome message to show the Grid!
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
      saveSessions(updatedSessions);
      setIsSidebarMobileOpen(false);
      return;
    }

    // Otherwise, create a brand new session
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: `New Session (${assistant?.name || "General"})`,
      assistantId: assistantId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedSessions = [newSession, ...sessions];
    saveSessions(updatedSessions);
    setActiveSessionId(newSession.id);
    setIsSidebarMobileOpen(false);
  };

  // Delete Chat Thread
  const handleDeleteSession = (id: string) => {
    const updatedSessions = sessions.filter((s) => s.id !== id);
    saveSessions(updatedSessions);

    if (activeSessionId === id) {
      if (updatedSessions.length > 0) {
        setActiveSessionId(updatedSessions[0].id);
      } else {
        setActiveSessionId(null);
      }
    }
  };

  // Rename Chat Thread Title
  const handleRenameSession = (id: string, newTitle: string) => {
    const updatedSessions = sessions.map((s) => {
      if (s.id === id) {
        return { ...s, title: newTitle, updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSessions(updatedSessions);
  };

  // Clear All Messages in Session
  const handleClearSession = () => {
    if (!activeSessionId) return;
    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return { ...s, messages: [], updatedAt: new Date().toISOString() };
      }
      return s;
    });
    saveSessions(updatedSessions);
  };

  // Export Session to Markdown File
  const handleExportSession = () => {
    if (!activeSessionId) return;
    const activeSession = sessions.find((s) => s.id === activeSessionId);
    if (!activeSession) return;

    const assistant = ASSISTANTS.find((a) => a.id === activeSession.assistantId);

    let markdown = `# Wes Ai Studio Chat Export\n`;
    markdown += `**Thread Title**: ${activeSession.title}\n`;
    markdown += `**Assistant Persona**: ${assistant?.name} (${assistant?.role})\n`;
    markdown += `**Export Date**: ${new Date().toLocaleString()}\n`;
    markdown += `**Configured Model**: ${settings.preferredModel}\n`;
    markdown += `========================================================\n\n`;

    activeSession.messages.forEach((msg) => {
      const sender = msg.role === "user" ? settings.userName : `${assistant?.name} (AI)`;
      markdown += `### ${sender} [${new Date(msg.timestamp).toLocaleString()}]\n`;
      if (msg.image) {
        markdown += `*(Attached Multimodal Image File: data:image/png;base64...)*\n\n`;
      }
      markdown += `${msg.content}\n\n`;
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeSession.title.toLowerCase().replace(/\s+/g, "-")}-export.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Core Send Message pipeline
  const handleSendMessage = async (text: string, image?: string, fileName?: string) => {
    if (!activeSessionId) return;

    const activeSession = sessions.find((s) => s.id === activeSessionId);
    if (!activeSession) return;

    const assistant = ASSISTANTS.find((a) => a.id === activeSession.assistantId);

    // Create User Message
    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: text,
      image: image,
      fileName: fileName,
      timestamp: new Date().toISOString(),
    };

    // Auto-rename session title based on first query
    let newTitle = activeSession.title;
    if (activeSession.messages.length === 0 && text.trim()) {
      const firstLine = text.split("\n")[0].trim();
      newTitle = firstLine.substring(0, 26) + (firstLine.length > 26 ? "..." : "");
    }

    const updatedMessages = [...activeSession.messages, userMessage];
    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: newTitle,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    saveSessions(updatedSessions);
    setIsGenerating(true);

    try {
      // Gather relevant history. Keep context window healthy (e.g., last 15 messages)
      const contextHistory = updatedMessages.slice(-15, -1);
      let aiContent = "";
      let aiTimestamp = new Date().toISOString();

      // Call Multi-Provider AI Dispatcher
      const data = await generateChatResponse({
        message: text,
        history: contextHistory,
        assistantId: activeSession.assistantId,
        systemInstruction: assistant?.systemInstruction,
        preferredModel: settings.preferredModel,
        image: image,
        temperature: settings.temperature,
        settings: settings,
      });
      aiContent = data.content;
      aiTimestamp = data.timestamp;

      // Create AI Response Message
      const aiMessage: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: "model",
        content: aiContent,
        timestamp: aiTimestamp,
      };

      const finalSessions = sessions.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, userMessage, aiMessage], // append again to make sure syncing works perfectly
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
      saveSessions(finalSessions);

    } catch (error: any) {
      console.error(error);

      let errorPromptMsg = "";
      if (settings.preferredModel === "local") {
        errorPromptMsg = `⚠️ **Local LLM Connection Failure**: Could not establish communication with your local LLM server at \`${settings.localLlmUrl}\`.

**Troubleshooting Checklist**:
1. **Is the LLM Server Running?** Ensure your local service (Ollama, LM Studio, or Llama.cpp) is running on your computer.
2. **CORS Permission Check**: Browsers block connections unless CORS is enabled:
   * **Ollama**: On macOS/Linux, run \`OLLAMA_ORIGINS="*" ollama serve\` in your terminal before launching the model. On Windows, set an environment variable \`OLLAMA_ORIGINS=*\` in System Properties, then restart Ollama.
   * **LM Studio**: Open the "Local Server" tab and check the "Enable CORS" box.
   * **Llama.cpp**: Start with the \`--cors\` command line argument.
3. **Wi-Fi Scanner**: Open **Settings** and use our built-in **Local Network Wi-Fi Scanner** to automatically find running LLM instances on your home Wi-Fi network!`;
      } else {
        errorPromptMsg = `⚠️ **Connection Failure**: I encountered an error communicating with the Gemini API server.\n\n**Details**: \`${error.message || "Unknown Connection Error"}\`\n\n*Please ensure that your Gemini API key is properly declared in the **Secrets** panel (Settings > Secrets) of your Google AI Studio workspace and try re-submitting your query.*`;
      }

      // Create Error message in chat feed so user gets clear troubleshooting instructions
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "model",
        content: errorPromptMsg,
        timestamp: new Date().toISOString(),
      };

      const finalSessions = sessions.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, userMessage, errorMessage],
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
      saveSessions(finalSessions);
    } finally {
      setIsGenerating(false);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const isAndroidWebView = typeof navigator !== 'undefined' && (
    /wv/i.test(navigator.userAgent) ||
    /Android.*Version\/[0-9.]+/i.test(navigator.userAgent)
  );

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div
      className={isAndroidWebView ? "fixed inset-0 overflow-hidden flex flex-col w-full h-full bg-white dark:bg-slate-950" : "fixed inset-0 overflow-hidden flex flex-col flex-1 h-full w-full sm:items-center sm:justify-center bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 p-0 sm:p-4 md:p-6"}
      id="app-universe"
    >
      {/* Centered Android Phone Mockup Wrapper */}
      <div
        className={isAndroidWebView ? "w-full h-full flex flex-col relative overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300" : "w-full h-full flex-1 sm:flex-initial sm:max-w-[412px] sm:max-h-[846px] sm:aspect-[9/18.5] sm:rounded-[44px] sm:border-[10px] sm:border-slate-800 sm:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] sm:relative sm:overflow-hidden bg-white dark:bg-slate-950 flex flex-col transition-colors duration-300"}
        id="phone-device-frame"
      >
        {/* PHYSICAL CAMERA NOTCH / PUNCH HOLE (Only on desktop simulator layout) */}
        {!isAndroidWebView && (
          <div className="hidden sm:block absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-900 border border-slate-700/40 z-50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-900/80"></div>
          </div>
        )}

        {/* ANDROID STATUS BAR (high-fidelity mockup) */}
        {!isAndroidWebView && (
          <div className="w-full h-7 bg-white dark:bg-[#000000] border-b border-slate-50 dark:border-neutral-900 flex items-center justify-between px-6 text-xs font-bold text-slate-700 dark:text-slate-300 select-none shrink-0 z-30 transition-colors duration-300" id="android-status-bar">
            <span className="font-sans font-semibold tracking-tight">{statusBarTime}</span>
            <div className="flex items-center gap-1.5">
              {/* Small dynamic status indicators */}
              <svg className="w-3.5 h-3.5 fill-slate-700 dark:fill-slate-300 transition-colors duration-300" viewBox="0 0 24 24">
                <title>LTE Signal</title>
                <path d="M2 22h20V2z" />
              </svg>
              <svg className="w-3.5 h-3.5 fill-slate-700 dark:fill-slate-300 transition-colors duration-300" viewBox="0 0 24 24">
                <title>Wifi Connected</title>
                <path d="M12 21l-12-18h24z" />
              </svg>
              <div className="flex items-center gap-0.5" title="Battery 84%">
                <span className="text-[9px] font-mono font-extrabold mr-0.5">84%</span>
                <svg className="w-4 h-4 fill-slate-700 dark:fill-slate-300 transition-colors duration-300" viewBox="0 0 24 24">
                  <path d="M17 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm1 9h-1V9h1v5z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* CORE APPLICATION BODY */}
        <div className="flex-1 relative flex flex-col overflow-hidden w-full bg-white/95 dark:bg-[#030308]/95 transition-colors duration-300" id="android-app-viewport">

          {/* FLOWING AURORA COLOR MESH BACKGROUND BLOBS */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-30 dark:opacity-25">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-[#FF4D4D] via-rose-600 to-pink-500 blur-3xl animate-aurora-1"></div>
            <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 blur-3xl animate-aurora-2"></div>
            <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-500 blur-3xl animate-aurora-3"></div>
          </div>
          {/* Sidebar - Sessions & Navigation */}
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            onOpenSettings={() => {
              setIsSettingsOpen(true);
              setIsSidebarMobileOpen(false);
            }}
            onSaveSettings={handleSaveSettings}
            settings={settings}
            isOpenMobile={isSidebarMobileOpen}
            onToggleMobile={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
            user={user}
          />

          {/* Main Chat Workstation */}
          <ChatArea
            session={activeSession}
            onSendMessage={handleSendMessage}
            onClearSession={handleClearSession}
            isGenerating={isGenerating}
            onToggleSidebarMobile={() => setIsSidebarMobileOpen(true)}
            preferredModel={settings.preferredModel}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            user={user}
            sessions={sessions}
            onSelectSession={setActiveSessionId}
            onDeleteSession={handleDeleteSession}
            onNewChat={handleNewChat}
            onStopGenerating={() => setIsGenerating(false)}
            onOpenSettings={() => {
              setIsSettingsOpen(true);
              setIsSidebarMobileOpen(false);
            }}
          />

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            user={user}
            onSaveProfile={handleSaveProfile}
          />
        </div>

        {/* ANDROID BOTTOM NAVIGATION GESTURE PILL BAR */}
        {!isAndroidWebView && (
          <div className="w-full h-6 bg-white dark:bg-[#000000] flex items-center justify-center select-none shrink-0 border-t border-slate-50 dark:border-neutral-900 z-30" id="android-gesture-navigation">
            <div className="w-24 h-1 bg-slate-400 dark:bg-neutral-600 rounded-full opacity-60 hover:opacity-80 transition-opacity"></div>
          </div>
        )}
      </div>
    </div>
  );
}
