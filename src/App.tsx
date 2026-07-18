import React, { useState, useEffect } from "react";
import { initializeDb, db } from "./lib/db";
import Dashboard from "./components/Dashboard";
import SubjectDetail from "./components/SubjectDetail";
import SyllabusUpload from "./components/SyllabusUpload";
import DailyPlanner from "./components/DailyPlanner";
import SettingsManager from "./components/SettingsManager";
import { BookOpen, Calendar, Settings, Sparkles, LayoutGrid, Clock, ListTodo } from "lucide-react";

export default function App() {
  // Navigation State: 'dashboard' | 'planner' | 'settings' | 'subject' | 'add-subject'
  const [activeView, setActiveView] = useState<"dashboard" | "planner" | "settings" | "subject" | "add-subject">("dashboard");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [currentTime, setCurrentTime] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Boot database schema and sample DSP course if storage is empty
    initializeDb();

    // 2. Setup standard UTC ticker matching modern system requirements
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleTriggerInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        }
        setDeferredPrompt(null);
      });
    }
  };

  return (
    <div id="syllabustrack_root_shell" className="min-h-screen bg-slate-50/50 text-gray-850 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-12">
      
      {/* GLOBAL BRAND HEADER */}
      <header className="bg-white border-b border-gray-150 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo brand */}
          <div
            onClick={() => setActiveView("dashboard")}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 fill-indigo-200/20" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-gray-900">SyllabusTrack</h1>
              <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Exam Coverage Engine</p>
            </div>
          </div>

          {/* Center: Global Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-gray-50/50 border border-gray-150 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveView("dashboard")}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === "dashboard" || activeView === "subject" || activeView === "add-subject"
                  ? "bg-white text-indigo-700 shadow-xs border border-gray-100"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
            </button>
            <button
              onClick={() => setActiveView("planner")}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === "planner"
                  ? "bg-white text-indigo-700 shadow-xs border border-gray-100"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Study Planner
            </button>
            <button
              onClick={() => setActiveView("settings")}
              className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === "settings"
                  ? "bg-white text-indigo-700 shadow-xs border border-gray-100"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
          </nav>

          {/* Right Panel: Digital clock indicator */}
          <div className="flex items-center gap-3">
            <div className="bg-gray-50 border border-gray-150 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono text-gray-500">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>{currentTime || "00:00:00"}</span>
            </div>
          </div>

        </div>
      </header>

      {/* MOBILE COMPACT BOTTOM NAVIGATION RAIL */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-150 h-16 flex items-center justify-around z-40 shadow-lg px-4">
        <button
          onClick={() => setActiveView("dashboard")}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all focus:outline-hidden ${
            activeView === "dashboard" || activeView === "subject" || activeView === "add-subject"
              ? "text-indigo-600 scale-105"
              : "text-gray-400"
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">Dashboard</span>
        </button>
        <button
          onClick={() => setActiveView("planner")}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all focus:outline-hidden ${
            activeView === "planner" ? "text-indigo-600 scale-105" : "text-gray-400"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">Planner</span>
        </button>
        <button
          onClick={() => setActiveView("settings")}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all focus:outline-hidden ${
            activeView === "settings" ? "text-indigo-600 scale-105" : "text-gray-400"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">Settings</span>
        </button>
      </div>

      {/* MASTER CENTRAL CANVAS GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        
        {/* ROUTING CONTROLLER VIEW SWITCH */}
        {activeView === "dashboard" && (
          <Dashboard
            onAddSubject={() => setActiveView("add-subject")}
            onSelectSubject={id => {
              setSelectedSubjectId(id);
              setActiveView("subject");
            }}
            onNavigateToPlanner={() => setActiveView("planner")}
            onNavigateToSettings={() => setActiveView("settings")}
          />
        )}

        {activeView === "subject" && (
          <SubjectDetail
            subjectId={selectedSubjectId}
            onBack={() => setActiveView("dashboard")}
            onDeleted={() => setActiveView("dashboard")}
          />
        )}

        {activeView === "add-subject" && (
          <SyllabusUpload
            onSuccess={id => {
              setSelectedSubjectId(id);
              setActiveView("subject");
            }}
            onCancel={() => setActiveView("dashboard")}
          />
        )}

        {activeView === "planner" && (
          <DailyPlanner onTasksChanged={() => {}} />
        )}

        {activeView === "settings" && (
          <SettingsManager 
            onRefreshData={() => {}} 
            deferredPrompt={deferredPrompt}
            onTriggerInstall={handleTriggerInstall}
          />
        )}

      </main>

    </div>
  );
}
