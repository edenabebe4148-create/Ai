import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Settings, User, Bot, Sliders, Heart, Sun, Moon, Key, Eye, EyeOff, CheckCircle, AlertTriangle, RefreshCw, Globe, Server } from "lucide-react";
import { UserSettings, AiProvider, ModelType, UserAccount } from "../types";
import { motion, AnimatePresence } from "motion/react";
import LocalLlmHub from "./LocalLlmHub";
import { testProviderConnection } from "../geminiClient";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (settings: UserSettings) => void;
  settings: UserSettings;
  user: UserAccount;
  onSaveProfile: (user: UserAccount) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  user,
  onSaveProfile,
}: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const openTimeRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
    }
  }, [isOpen]);

  const currentTheme = settings.theme || "light";
  const activeProvider = settings.activeProvider || "gemini";

  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [testingStatus, setTestingStatus] = useState<{ testing: boolean; result?: { success: boolean; message: string } }>({ testing: false });

  if (!mounted) return null;

  const toggleShowKey = (provider: string) => {
    setShowKeyMap((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleTestConnection = async () => {
    setTestingStatus({ testing: true });
    const res = await testProviderConnection(settings);
    setTestingStatus({ testing: false, result: res });
  };

  const handleProviderSelect = (provider: AiProvider) => {
    let defaultModel: ModelType = "gemini-3.5-flash";
    if (provider === "openai") defaultModel = "gpt-4o";
    if (provider === "anthropic") defaultModel = "claude-3-5-sonnet";
    if (provider === "groq") defaultModel = "llama-3.3-70b";
    if (provider === "deepseek") defaultModel = "deepseek-chat";
    if (provider === "local") defaultModel = "local";
    if (provider === "custom") defaultModel = "custom";

    onSaveSettings({
      ...settings,
      activeProvider: provider,
      preferredModel: defaultModel,
    });
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      key="settings-overlay"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 pt-8 sm:p-4 bg-black/75 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          if (Date.now() - openTimeRef.current > 400) {
            onClose();
          }
        }
      }}
    >
      <div
        key="settings-modal-card"
        className="w-full max-w-[92vw] sm:max-w-xl h-[96vh] min-h-[600px] max-h-[900px] flex flex-col bg-white dark:bg-[#0c0c12] border border-slate-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 z-[1000000]"
        id="settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF4D4D] animate-spin-slow" />
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight font-display bg-gradient-to-r from-[#FF4D4D] via-rose-400 to-indigo-400 bg-clip-text text-transparent">AI Studio Preferences</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 transition-colors rounded-lg hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a1a24] cursor-pointer"
                id="close-settings-btn"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              
              {/* User Profile */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                  <User className="w-4 h-4 text-[#FF4D4D]" />
                  Local Profile
                </label>
                
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="Profile" className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm" />
                    ) : (
                      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400 font-bold text-xl shadow-sm">
                        {(user.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FF4D4D] text-white rounded-lg flex items-center justify-center cursor-pointer shadow-md hover:bg-[#FF3333] transition-colors" title="Upload Picture">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              onSaveProfile({ ...user, profilePicture: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                      />
                    </label>
                  </div>
                  
                  <div className="flex-1">
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => {
                        onSaveProfile({ ...user, name: e.target.value });
                        onSaveSettings({ ...settings, userName: e.target.value });
                      }}
                      placeholder="Enter your name"
                      className="w-full px-4 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF4D4D] focus:ring-1 focus:ring-[#FF4D4D]/20 transition-all text-sm font-medium"
                      id="user-name-input"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                  {currentTheme === "dark" ? <Moon className="w-4 h-4 text-[#FF4D4D]" /> : <Sun className="w-4 h-4 text-[#FF4D4D]" />}
                  Visual Appearance
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSaveSettings({ ...settings, theme: "light" })}
                    className={`flex items-center justify-center gap-2 p-3 text-xs font-bold border rounded-2xl transition-all ${
                      currentTheme === "light"
                        ? "border-[#FF4D4D] bg-red-50/40 text-[#FF4D4D]"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                    id="theme-light-btn"
                  >
                    <Sun className="w-4 h-4" />
                    Light Theme
                  </button>

                  <button
                    type="button"
                    onClick={() => onSaveSettings({ ...settings, theme: "dark" })}
                    className={`flex items-center justify-center gap-2 p-3 text-xs font-bold border rounded-2xl transition-all ${
                      currentTheme === "dark"
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                    id="theme-dark-btn"
                  >
                    <Moon className="w-4 h-4" />
                    Dark Theme
                  </button>
                </div>
              </div>

              {/* AI PROVIDER SELECTOR */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                  <Bot className="w-4 h-4 text-[#FF4D4D]" />
                  Active AI Engine Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "gemini", label: "Google Gemini", icon: "✨" },
                    { id: "openai", label: "OpenAI", icon: "🤖" },
                    { id: "anthropic", label: "Anthropic", icon: "🧠" },
                    { id: "groq", label: "Groq", icon: "⚡" },
                    { id: "deepseek", label: "DeepSeek", icon: "🌌" },
                    { id: "local", label: "Local LLM", icon: "🏠" },
                    { id: "custom", label: "Custom API", icon: "🌐" },
                  ].map((p) => {
                    const isSelected = activeProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProviderSelect(p.id as AiProvider)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#FF4D4D] bg-red-50/50 dark:bg-red-500/10 text-[#FF4D4D]"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                        id={`provider-${p.id}-btn`}
                      >
                        <span className="text-sm">{p.icon}</span>
                        <span className="truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC PROVIDER CONFIGURATION FIELDS */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-4">
                
                {/* GEMINI KEY */}
                {activeProvider === "gemini" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-[#FF4D4D]" />
                        Gemini API Key
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">Optional if set in .env</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showKeyMap["gemini"] ? "text" : "password"}
                        value={settings.geminiApiKey || ""}
                        onChange={(e) => onSaveSettings({ ...settings, geminiApiKey: e.target.value })}
                        placeholder="AIzaSy..."
                        className="w-full pl-3 pr-10 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF4D4D]"
                        id="gemini-key-input"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey("gemini")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showKeyMap["gemini"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* OPENAI KEY */}
                {activeProvider === "openai" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#FF4D4D]" />
                      OpenAI API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKeyMap["openai"] ? "text" : "password"}
                        value={settings.openaiApiKey || ""}
                        onChange={(e) => onSaveSettings({ ...settings, openaiApiKey: e.target.value })}
                        placeholder="sk-proj-..."
                        className="w-full pl-3 pr-10 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF4D4D]"
                        id="openai-key-input"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey("openai")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showKeyMap["openai"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* ANTHROPIC KEY */}
                {activeProvider === "anthropic" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#FF4D4D]" />
                      Anthropic API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKeyMap["anthropic"] ? "text" : "password"}
                        value={settings.anthropicApiKey || ""}
                        onChange={(e) => onSaveSettings({ ...settings, anthropicApiKey: e.target.value })}
                        placeholder="sk-ant-..."
                        className="w-full pl-3 pr-10 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF4D4D]"
                        id="anthropic-key-input"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey("anthropic")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showKeyMap["anthropic"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* GROQ KEY */}
                {activeProvider === "groq" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#FF4D4D]" />
                      Groq API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKeyMap["groq"] ? "text" : "password"}
                        value={settings.groqApiKey || ""}
                        onChange={(e) => onSaveSettings({ ...settings, groqApiKey: e.target.value })}
                        placeholder="gsk_..."
                        className="w-full pl-3 pr-10 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF4D4D]"
                        id="groq-key-input"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey("groq")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showKeyMap["groq"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* DEEPSEEK KEY */}
                {activeProvider === "deepseek" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#FF4D4D]" />
                      DeepSeek API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKeyMap["deepseek"] ? "text" : "password"}
                        value={settings.deepseekApiKey || ""}
                        onChange={(e) => onSaveSettings({ ...settings, deepseekApiKey: e.target.value })}
                        placeholder="sk-..."
                        className="w-full pl-3 pr-10 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF4D4D]"
                        id="deepseek-key-input"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey("deepseek")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showKeyMap["deepseek"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* CUSTOM API ENDPOINT & KEY */}
                {activeProvider === "custom" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#FF4D4D]" />
                        Base API Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={settings.customBaseUrl || ""}
                        onChange={(e) => onSaveSettings({ ...settings, customBaseUrl: e.target.value })}
                        placeholder="https://api.openai.com/v1"
                        className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF4D4D]"
                        id="custom-url-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Model Name</label>
                        <input
                          type="text"
                          value={settings.customModelName || ""}
                          onChange={(e) => onSaveSettings({ ...settings, customModelName: e.target.value })}
                          placeholder="gpt-4o-mini"
                          className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF4D4D]"
                          id="custom-model-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">API Key (Optional)</label>
                        <input
                          type="password"
                          value={settings.customApiKey || ""}
                          onChange={(e) => onSaveSettings({ ...settings, customApiKey: e.target.value })}
                          placeholder="sk-..."
                          className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#FF4D4D]"
                          id="custom-key-input"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TEST CONNECTION ACTION BUTTON */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingStatus.testing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#FF4D4D] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    id="test-connection-btn"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingStatus.testing ? "animate-spin text-[#FF4D4D]" : ""}`} />
                    {testingStatus.testing ? "Testing..." : "Test Connection"}
                  </button>

                  {testingStatus.result && (
                    <span className={`text-[11px] font-bold flex items-center gap-1 ${testingStatus.result.success ? "text-emerald-500" : "text-rose-500"}`}>
                      {testingStatus.result.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {testingStatus.result.message}
                    </span>
                  )}
                </div>
              </div>

              {/* Local LLM Hub Settings & WiFi Scanner (shows dynamically if 'local' is selected) */}
              {activeProvider === "local" && (
                <LocalLlmHub settings={settings} onSaveSettings={onSaveSettings} />
              )}

              {/* Temperature Slider */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#FF4D4D]" />
                    Temperature: <span className="font-mono text-[#FF4D4D] font-bold">{settings.temperature}</span>
                  </span>
                  <span>
                    {settings.temperature <= 0.3
                      ? "Precise"
                      : settings.temperature <= 0.8
                      ? "Balanced"
                      : "Creative"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => onSaveSettings({ ...settings, temperature: Number(e.target.value) })}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FF4D4D]"
                  id="temperature-slider"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-slate-50/80 dark:bg-[#09090e] border-t border-slate-100 dark:border-neutral-800 shrink-0">
              <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                <span>v1.0.0</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  Wes Ai Studio Core <Heart className="w-2.5 h-2.5 text-[#FF4D4D] fill-[#FF4D4D]" />
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-[#FF4D4D] via-rose-500 to-indigo-600 hover:opacity-95 active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-lg shadow-[#FF4D4D]/20 hover:shadow-[#FF4D4D]/35"
                id="save-settings-btn"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>,
    document.body
  );
}
