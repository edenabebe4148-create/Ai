import { Plus, MessageSquare, Trash2, Edit3, Settings, Menu, X, Check, LogOut, ShieldAlert, Sun, Moon } from "lucide-react";
import { ChatSession, AssistantPersona, UserSettings, UserAccount } from "../types";
import { ASSISTANTS } from "../constants";
import { motion, AnimatePresence } from "motion/react";
import React, { useState } from "react";
import logoWhite from "../assets/images/logowhite.png";
import logoBlack from "../assets/images/logoblack.png";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: (assistantId: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  onSaveSettings?: (settings: UserSettings) => void;
  settings: UserSettings;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
  user: UserAccount | null;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onOpenSettings,
  onSaveSettings,
  settings,
  isOpenMobile,
  onToggleMobile,
  user,
}: SidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showAssistantPicker, setShowAssistantPicker] = useState(false);

  const startRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setRenameValue(session.title);
  };

  const handleRenameSubmit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim()) {
      onRenameSession(id, renameValue.trim());
    }
    setEditingSessionId(null);
  };

  const selectNewChatAssistant = (id: string) => {
    // If not logged in and choosing another assistant, let them play or prompt log in? Let's let them select, but guide them beautifully.
    onNewChat(id);
    setShowAssistantPicker(false);
    if (isOpenMobile) onToggleMobile();
  };

  const getAssistantDetails = (assistantId: string): AssistantPersona | undefined => {
    return ASSISTANTS.find((a) => a.id === assistantId);
  };

  const logoSrc = settings.theme === "dark" ? logoBlack : logoWhite;

  const SidebarContent = (
    <div className="flex flex-col h-full bg-slate-50/80 dark:bg-[#030308]/80 backdrop-blur-xl border-r border-slate-200/80 dark:border-neutral-800/80 text-slate-800 dark:text-slate-100 z-10">
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-5 pb-5 pt-[max(env(safe-area-inset-top),48px)] sm:p-5 border-b border-slate-200/60 dark:border-neutral-800/80 bg-white/70 dark:bg-[#09090d]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img
            src={logoSrc}
            alt="Wes Ai Studio Logo"
            className="w-9 h-9 rounded-xl object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-[#FF4D4D] via-rose-400 to-indigo-400 bg-clip-text text-transparent font-display">Wes Ai Studio</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onSaveSettings && (
            <button
              onClick={() => onSaveSettings({ ...settings, theme: settings.theme === "dark" ? "light" : "dark" })}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-[#1c1c22]"
              title={settings.theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
              id="sidebar-quick-theme-toggle"
            >
              {settings.theme === "dark" ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-indigo-500" />}
            </button>
          )}
          {isOpenMobile && (
            <button
              onClick={onToggleMobile}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100 md:hidden"
              id="mobile-close-sidebar-btn"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* New Chat Button Area */}
      <div className="p-4 space-y-2 bg-white/50 dark:bg-[#09090d]/60 border-b border-slate-100 dark:border-neutral-800/80">
        {!showAssistantPicker ? (
          <button
            onClick={() => setShowAssistantPicker(true)}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-[#FF4D4D] via-rose-500 to-pink-600 hover:opacity-95 active:scale-[0.98] rounded-2xl transition-all shadow-lg shadow-[#FF4D4D]/25 cursor-pointer hover:shadow-[#FF4D4D]/40"
            id="new-chat-btn"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Thread
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2 border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl space-y-1.5 shadow-sm"
            id="assistant-picker-pane"
          >
            <div className="flex justify-between items-center px-1 pb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Choose Persona</span>
              <button
                onClick={() => setShowAssistantPicker(false)}
                className="text-[10px] text-slate-500 hover:text-[#FF4D4D] font-semibold transition-colors"
                id="cancel-persona-picker-btn"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar">
              {ASSISTANTS.map((assistant) => (
                <button
                  key={assistant.id}
                  onClick={() => selectNewChatAssistant(assistant.id)}
                  className="flex items-center gap-2.5 w-full p-2 text-left text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl group transition-colors cursor-pointer"
                  id={`select-persona-${assistant.id}`}
                >
                  <span className="text-base">{assistant.avatar}</span>
                  <div className="truncate">
                    <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#FF4D4D] transition-colors">
                      {assistant.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{assistant.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Chat Sessions Feed */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
        <div className="px-2 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Conversations</span>
          {sessions.length > 0 && (
            <span className="text-[9px] bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-full font-bold font-mono">
              {sessions.length}
            </span>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 stroke-1 mb-2" />
            <p className="text-xs text-slate-400">No active sessions. Start a thread above!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {sessions.map((session) => {
              const assistant = getAssistantDetails(session.assistantId);
              const isActive = session.id === activeSessionId;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    if (isOpenMobile) onToggleMobile();
                  }}
                  className={`group relative flex items-center gap-3 w-full p-3 rounded-2xl cursor-pointer transition-all border ${
                    isActive
                      ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-[#FF4D4D] shadow-sm"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  id={`chat-session-${session.id}`}
                >
                  {/* Left Accent indicator for active session */}
                  {isActive && (
                    <span className="absolute left-0 top-3 bottom-3 w-1 bg-[#FF4D4D] rounded-r-md"></span>
                  )}

                  {/* Persona Avatar */}
                  <div className="flex items-center justify-center w-7.5 h-7.5 rounded-xl bg-white border border-slate-150 font-bold text-sm shadow-xs">
                    {assistant?.avatar || "💬"}
                  </div>

                  {/* Title / Form */}
                  <div className="flex-1 min-w-0 pr-12">
                    {editingSessionId === session.id ? (
                      <form
                        onSubmit={(e) => handleRenameSubmit(session.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          onBlur={() => setEditingSessionId(null)}
                          className="w-full px-1.5 py-0.5 text-xs text-slate-800 bg-white border border-[#FF4D4D] rounded-md focus:outline-none focus:ring-1 focus:ring-[#FF4D4D]/20 font-medium"
                          id={`rename-input-${session.id}`}
                        />
                        <button
                          type="submit"
                          className="p-0.5 text-emerald-500 hover:text-emerald-600 rounded"
                          id={`save-rename-btn-${session.id}`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </form>
                    ) : (
                      <div className="truncate">
                        <div className={`text-xs font-bold truncate leading-tight ${isActive ? "text-slate-900 dark:text-[#FF4D4D]" : "text-slate-700 dark:text-slate-300"}`}>
                          {session.title}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate mt-0.5 font-mono">
                          {assistant?.name || "General"} • {session.messages.length} messages
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions (Hover visible on Desktop) */}
                  {editingSessionId !== session.id && (
                    <div className="absolute right-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(session, e)}
                        className="p-1 text-slate-400 hover:text-[#FF4D4D] rounded-lg hover:bg-slate-100 transition-colors"
                        title="Rename Thread"
                        id={`action-rename-btn-${session.id}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Delete Thread"
                        id={`action-delete-btn-${session.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Profile Settings Card */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-8 h-8 rounded-xl object-cover border border-[#FF4D4D]/10 shadow-xs" />
            ) : (
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/10 text-[#FF4D4D] font-extrabold border border-[#FF4D4D]/10 text-xs shadow-xs">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="truncate">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">{user?.name || "User"}</div>
              <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate font-mono leading-none mt-0.5">Local Profile</div>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenSettings();
              }}
              className="p-1.5 text-slate-400 transition-colors rounded-lg hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer active:scale-95 touch-manipulation"
              title="Settings"
              id="sidebar-settings-btn"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      {isOpenMobile && (
        <div key="mobile-sidebar-container" className="absolute inset-0 z-40 flex" id="mobile-sidebar-root">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggleMobile}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-72 max-w-[80vw] h-full z-10"
          >
            {SidebarContent}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
