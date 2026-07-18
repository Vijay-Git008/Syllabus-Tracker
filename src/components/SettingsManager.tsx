import React, { useState } from "react";
import { db } from "../lib/db";
import { Copy, Check, Download, Upload, Trash2, RefreshCw, AlertTriangle, Sparkles, Sliders } from "lucide-react";

interface SettingsManagerProps {
  onRefreshData?: () => void;
  deferredPrompt?: any;
  onTriggerInstall?: () => void;
}

export default function SettingsManager({ 
  onRefreshData,
  deferredPrompt,
  onTriggerInstall,
}: SettingsManagerProps) {
  const [copied, setCopied] = useState(false);
  const [backupJson, setBackupJson] = useState("");
  const [importText, setImportText] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleExport = () => {
    const backupString = db.exportBackup();
    setBackupJson(backupString);
    navigator.clipboard.writeText(backupString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!importText.trim()) {
      setErrorMsg("Please paste a valid JSON backup string first.");
      return;
    }

    const ok = db.importBackup(importText);
    if (ok) {
      setSuccessMsg("Database backup imported successfully! Syncing views...");
      setImportText("");
      if (onRefreshData) onRefreshData();
    } else {
      setErrorMsg("Failed to import. The pasted backup is invalid or does not match our syllabus dataset schema.");
    }
  };

  const handleResetToDefault = () => {
    if (confirm("Are you sure you want to reset the database to default states? This will reload the Digital Signal Processing (DSP) subject and clean up custom inputs.")) {
      localStorage.clear();
      // Trigger default initializer
      window.location.reload();
    }
  };

  const handleWipeDatabase = () => {
    if (confirm("DANGER: This will wipe out all courses, tracker records, and planners! Your storage will be completely empty. This is irreversible. Proceed?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div id="settings_view_container" className="space-y-6">
      
      {/* MOBILE PWA & APK COMPILE PANEL */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-6">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </span>
          <div>
            <h3 className="text-sm font-bold">Mobile Installation & Android APK</h3>
            <p className="text-[11px] text-indigo-300">Run SyllabusTrack natively on your Android device</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs text-indigo-100">
          
          {/* Method A: PWA install (No compilations needed, instant) */}
          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4.5 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md inline-block">
                Option A: Instant Android App (PWA)
              </span>
              <p className="leading-relaxed text-indigo-200">
                You can install SyllabusTrack directly to your phone as a Progressive Web App (PWA). It creates an icon on your home screen, loads instantly, and runs completely offline!
              </p>
              
              <ul className="space-y-1.5 text-[11px] text-indigo-300">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Open this app in <strong>Google Chrome</strong> on your phone.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Tap the Chrome menu (3 dots) & select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.</span>
                </li>
              </ul>
            </div>

            {deferredPrompt ? (
              <button
                onClick={onTriggerInstall}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 fill-emerald-100/10" /> Install Now on Mobile
              </button>
            ) : (
              <div className="py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-center rounded-xl text-[10px] text-indigo-300">
                Open in mobile Chrome to enable instant installation trigger.
              </div>
            )}
          </div>

          {/* Method B: USB Debugging & ADB Reverse (Instant Live APK Testing) */}
          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4.5 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md inline-block">
                Option B: USB Debugging & ADB Run
              </span>
              <p className="leading-relaxed text-indigo-200">
                Test and run this exact live application directly inside your Android phone over a physical USB cable using standard developer bridge options!
              </p>

              <ul className="space-y-1.5 text-[11px] text-indigo-300">
                <li className="flex items-start gap-1">
                  <span className="text-amber-400 font-bold">1.</span>
                  <span>Enable <strong>USB Debugging</strong> on your Android phone (Tap Build Number 7 times in Settings).</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-amber-400 font-bold">2.</span>
                  <span>Connect your phone to your PC via USB and run this ADB command:</span>
                </li>
              </ul>

              <div className="bg-black/40 rounded-lg p-2 font-mono text-[9px] text-amber-300 border border-indigo-950 select-all text-center">
                adb reverse tcp:3000 tcp:3000
              </div>

              <p className="leading-relaxed text-[10px] text-indigo-300">
                Now type <code className="text-white font-mono bg-indigo-950 px-1 py-0.5 rounded">localhost:3000</code> in your phone's Chrome browser. It maps directly to your developer server, and you can tap "Install" instantly!
              </p>
            </div>
          </div>

          {/* Method C: Native Android APK Compilation */}
          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4.5 space-y-3.5">
            <div className="space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-md inline-block">
                Option C: Compile standalone APK file
              </span>
              <p className="leading-relaxed text-indigo-200">
                To build a standalone, sideloadable Android <strong>.apk file</strong> from this source code, you can bundle it using <strong>Capacitor</strong> in 3 quick terminal commands!
              </p>

              <div className="bg-black/40 rounded-lg p-2.5 font-mono text-[9px] text-indigo-300 border border-indigo-950 space-y-2 overflow-x-auto select-all">
                <div># 1. Export zip of this project & extract it</div>
                <div># 2. Build and install Android Capacitor dependencies:</div>
                <div className="text-white">npm run build</div>
                <div className="text-white">npm i @capacitor/core @capacitor/cli @capacitor/android</div>
                <div className="text-white">npx cap init "SyllabusTrack" "com.syllabustrack.app" --web-dir=dist</div>
                <div className="text-white">npx cap add android</div>
                <div className="text-white">npx cap open android</div>
                <div># 3. Android Studio will open! Just hit "Build APK" to compile.</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 1: SYSTEM & THEME SUMMARY */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-indigo-600" /> SyllabusTrack Visual Themes
        </h3>
        
        <p className="text-xs text-gray-500 leading-relaxed">
          SyllabusTrack is crafted in an <strong>Indigo & Slate minimal design layout</strong>. It utilizes high-contrast text badges, responsive flex-grids, typography-led weights, and smooth micro-transitions. It defaults to an eye-safe light theme following professional productivity tool standards.
        </p>

        <div className="flex gap-2.5 pt-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md">
            • Indigo Accent
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-3 py-1 rounded-md">
            • Amber Accent
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md">
            • Emerald Accent
          </span>
        </div>
      </div>

      {/* SECTION 2: EXPORT & BACKUPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Backups */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Download className="w-4 h-4 text-indigo-500" /> Export Database Records
          </h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Download or copy your complete study logs, syllabus checkbox progress states, exam distributions, and study planner items as a single JSON text file.
          </p>

          <button
            onClick={handleExport}
            className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-150 text-xs font-bold rounded-xl text-gray-700 transition-all inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 stroke-3" /> Backup Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy JSON Backup Text
              </>
            )}
          </button>

          {backupJson && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-150 max-h-32 overflow-y-auto mt-2">
              <pre className="text-[10px] text-gray-500 font-mono whitespace-pre">{backupJson}</pre>
            </div>
          )}
        </div>

        {/* Import Backups */}
        <div className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-indigo-500" /> Import Database Backup
          </h4>
          
          <form onSubmit={handleImport} className="space-y-3">
            <textarea
              required
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="Paste backup JSON code text here..."
              rows={3}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-xs font-mono text-gray-700"
            />

            {successMsg && <p className="text-xs text-emerald-600 font-medium">{successMsg}</p>}
            {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded-xl text-white transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              Upload & Merge Backup
            </button>
          </form>
        </div>

      </div>

      {/* SECTION 3: SYSTEM HARDENING & RESET ACTIONS */}
      <div className="bg-white border border-red-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-red-950 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-red-600" /> Administrative Controls
        </h3>
        
        <p className="text-xs text-gray-500 leading-relaxed">
          Clean up local storage or restore initial test states to try out PDF parsing from scratch.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleResetToDefault}
            className="py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl border border-gray-150 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" /> Restore DSP Test Sample
          </button>
          <button
            onClick={handleWipeDatabase}
            className="py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-150 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Trash2 className="w-4 h-4 text-red-500 animate-bounce" /> Wipe All Database Records
          </button>
        </div>
      </div>

    </div>
  );
}
