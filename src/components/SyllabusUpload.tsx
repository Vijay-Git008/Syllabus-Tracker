import React, { useState, useRef } from "react";
import { generateId, SAMPLE_DSP_SYLLABUS, db } from "../lib/db";
import { Plus, Upload, FileText, Check, AlertCircle, Edit, Trash2, ArrowRight, Loader2, Sparkles } from "lucide-react";

// Accent colors
const COLORS = [
  { name: "Indigo", value: "indigo", bg: "bg-indigo-600", border: "border-indigo-600", text: "text-indigo-600", preview: "bg-indigo-50 border-indigo-200" },
  { name: "Teal", value: "teal", bg: "bg-teal-600", border: "border-teal-600", text: "text-teal-600", preview: "bg-teal-50 border-teal-200" },
  { name: "Emerald", value: "emerald", bg: "bg-emerald-600", border: "border-emerald-600", text: "text-emerald-600", preview: "bg-emerald-50 border-emerald-200" },
  { name: "Rose", value: "rose", bg: "bg-rose-600", border: "border-rose-600", text: "text-rose-600", preview: "bg-rose-50 border-rose-200" },
  { name: "Amber", value: "amber", bg: "bg-amber-600", border: "border-amber-600", text: "text-amber-600", preview: "bg-amber-50 border-amber-200" },
];

interface SyllabusUploadProps {
  onSuccess: (subjectId: string) => void;
  onCancel?: () => void;
}

// Interfaces for editable review tree
interface EditSubtopic {
  id: string;
  title: string;
}

interface EditTopic {
  id: string;
  title: string;
  subtopics: EditSubtopic[];
}

interface EditUnit {
  id: string;
  title: string;
  topics: EditTopic[];
}

export default function SyllabusUpload({ onSuccess, onCancel }: SyllabusUploadProps) {
  // Course details
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("Odd Semester");
  const [color, setColor] = useState("indigo");

  // Flow states
  const [step, setStep] = useState<"details" | "parse" | "review">("details");
  const [inputMethod, setInputMethod] = useState<"pdf" | "text" | "sample">("pdf");
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");

  // Syllabus review tree state
  const [parsedUnits, setParsedUnits] = useState<EditUnit[]>([]);

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic loader for pdfjs from CDN (robust browser PDF reading)
  const loadPdfScript = () => {
    return new Promise<void>((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve();
      };
      script.onerror = () => {
        reject(new Error("Failed to load PDF processing library. Please check your internet connection."));
      };
      document.body.appendChild(script);
    });
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    await loadPdfScript();
    const pdfjsLib = (window as any).pdfjsLib;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let extractedText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items.map((item: any) => item.str);
      extractedText += pageStrings.join(" ") + "\n";
    }
    
    return extractedText;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        await processPdfFile(file);
      } else {
        setError("Only PDF files are supported for file parsing.");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processPdfFile(file);
    }
  };

  const processPdfFile = async (file: File) => {
    setFileName(file.name);
    setError("");
    setLoading(true);
    setLoadingMessage("Reading PDF text in your browser...");
    
    try {
      const text = await extractTextFromPdf(file);
      if (!text.trim()) {
        throw new Error("The PDF appears to be empty or contains scanned images with no selectable text. Please try pasting the text instead.");
      }
      setPastedText(text);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to extract text from PDF.");
      setFileName("");
    } finally {
      setLoading(false);
    }
  };

  // Triggers Gemini parsing API
  const handleStartParsing = async () => {
    setError("");
    setLoading(true);
    setLoadingMessage("Gemini AI is structured-parsing your syllabus into Units, Topics, and Sub-topics...");

    try {
      const response = await fetch("/api/parse-syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to parse syllabus. Please verify your API key is correct.");
      }

      if (!data.units || !Array.isArray(data.units)) {
        throw new Error("Invalid format returned by AI parsing model.");
      }

      // Map parsed JSON to our editable tree format
      const mappedUnits: EditUnit[] = data.units.map((u: any, uIdx: number) => ({
        id: `unit_${uIdx}_${Date.now()}`,
        title: u.title || `Unit ${uIdx + 1}`,
        topics: (u.topics || []).map((t: any, tIdx: number) => ({
          id: `topic_${uIdx}_${tIdx}_${Date.now()}`,
          title: t.title || `Topic ${tIdx + 1}`,
          subtopics: (t.subtopics || []).map((st: string, stIdx: number) => ({
            id: `sub_${uIdx}_${tIdx}_${stIdx}_${Date.now()}`,
            title: st,
          })),
        })),
      }));

      setParsedUnits(mappedUnits);
      setStep("review");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while contacting the AI server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    setError("");
    // Autofill subject info with DSP metadata
    setName(SAMPLE_DSP_SYLLABUS.name);
    setCode(SAMPLE_DSP_SYLLABUS.code);
    setSemester(SAMPLE_DSP_SYLLABUS.semester);
    setColor(SAMPLE_DSP_SYLLABUS.color);

    // Map sample to review state directly, no AI call needed
    const mappedUnits: EditUnit[] = SAMPLE_DSP_SYLLABUS.units.map((u, uIdx) => ({
      id: `unit_${uIdx}_${Date.now()}`,
      title: u.title,
      topics: u.topics.map((t, tIdx) => ({
        id: `topic_${uIdx}_${tIdx}_${Date.now()}`,
        title: t.title,
        subtopics: t.subtopics.map((st, stIdx) => ({
          id: `sub_${uIdx}_${tIdx}_${stIdx}_${Date.now()}`,
          title: st,
        })),
      })),
    }));

    setParsedUnits(mappedUnits);
    setStep("review");
  };

  // Editable tree modification helpers
  const updateUnitTitle = (unitId: string, newTitle: string) => {
    setParsedUnits(prev =>
      prev.map(u => (u.id === unitId ? { ...u, title: newTitle } : u))
    );
  };

  const addUnit = () => {
    const newUnit: EditUnit = {
      id: `unit_new_${Date.now()}`,
      title: `Unit-${parsedUnits.length + 1}`,
      topics: [],
    };
    setParsedUnits(prev => [...prev, newUnit]);
  };

  const removeUnit = (unitId: string) => {
    setParsedUnits(prev => prev.filter(u => u.id !== unitId));
  };

  const updateTopicTitle = (unitId: string, topicId: string, newTitle: string) => {
    setParsedUnits(prev =>
      prev.map(u => {
        if (u.id !== unitId) return u;
        return {
          ...u,
          topics: u.topics.map(t => (t.id === topicId ? { ...t, title: newTitle } : t)),
        };
      })
    );
  };

  const addTopic = (unitId: string) => {
    setParsedUnits(prev =>
      prev.map(u => {
        if (u.id !== unitId) return u;
        const newTopic: EditTopic = {
          id: `topic_new_${Date.now()}`,
          title: "New Topic Name",
          subtopics: [],
        };
        return { ...u, topics: [...u.topics, newTopic] };
      })
    );
  };

  const removeTopic = (unitId: string, topicId: string) => {
    setParsedUnits(prev =>
      prev.map(u => {
        if (u.id !== unitId) return u;
        return { ...u, topics: u.topics.filter(t => t.id !== topicId) };
      })
    );
  };

  const updateSubtopicTitle = (unitId: string, topicId: string, subId: string, newTitle: string) => {
    setParsedUnits(prev =>
      prev.map(u => {
        if (u.id !== unitId) return u;
        return {
          ...u,
          topics: u.topics.map(t => {
            if (t.id !== topicId) return t;
            return {
              ...t,
              subtopics: t.subtopics.map(st => (st.id === subId ? { ...st, title: newTitle } : st)),
            };
          }),
        };
      })
    );
  };

  const addSubtopic = (unitId: string, topicId: string) => {
    setParsedUnits(prev =>
      prev.map(u => {
        if (u.id !== unitId) return u;
        return {
          ...u,
          topics: u.topics.map(t => {
            if (t.id !== topicId) return t;
            const newSub: EditSubtopic = {
              id: `sub_new_${Date.now()}`,
              title: "New subtopic detail",
            };
            return { ...t, subtopics: [...t.subtopics, newSub] };
          }),
        };
      })
    );
  };

  const removeSubtopic = (unitId: string, topicId: string, subId: string) => {
    setParsedUnits(prev =>
      prev.map(u => {
        if (u.id !== unitId) return u;
        return {
          ...u,
          topics: u.topics.map(t => {
            if (t.id !== topicId) return t;
            return { ...t, subtopics: t.subtopics.filter(st => st.id !== subId) };
          }),
        };
      })
    );
  };

  // Submits final review tree to DB
  const handleSaveToDb = () => {
    if (!name.trim()) {
      setError("Please specify a course/subject name.");
      setStep("details");
      return;
    }

    setLoading(true);
    try {
      // Structure of units mapping
      const finalUnitsData = parsedUnits.map(u => ({
        title: u.title,
        topics: u.topics.map(t => ({
          title: t.title,
          subtopics: t.subtopics.map(st => st.title),
        })),
      }));

      const newSubjectId = db.createSubjectWithSyllabus(
        { name, code, semester, color },
        finalUnitsData
      );

      onSuccess(newSubjectId);
    } catch (err: any) {
      console.error(err);
      setError("Failed to save syllabus master list.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="syllabus_upload_container" className="max-w-4xl mx-auto p-4 sm:p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
      
      {/* Loading Overlay */}
      {loading && (
        <div id="upload_loader" className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Your Syllabus</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center pb-5 mb-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Add New Subject & Syllabus</h2>
          <p className="text-sm text-gray-500">Structured course compilation & AI syllabus parser</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm px-4 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-900">An Error Occurred</h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* STEP 1: SUBJECT DETAILS */}
      {step === "details" && (
        <div id="step_details_view" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Subject Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Digital Signal Processing"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Subject Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. EC8501 (Optional)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Academic Term</label>
              <select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-gray-800"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                <option value="4th Semester">4th Semester</option>
                <option value="5th Semester">5th Semester</option>
                <option value="6th Semester">6th Semester</option>
                <option value="7th Semester">7th Semester</option>
                <option value="8th Semester">8th Semester</option>
                <option value="Odd Semester">Odd Semester</option>
                <option value="Even Semester">Even Semester</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">App Icon / Accent Accent</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {COLORS.map(col => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setColor(col.value)}
                    className={`w-9 h-9 rounded-full ${col.bg} relative transition-transform hover:scale-110 focus:outline-hidden`}
                  >
                    {color === col.value && (
                      <span className="absolute inset-0 flex items-center justify-center text-white">
                        <Check className="w-4 h-4 stroke-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => setStep("parse")}
              disabled={!name.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              Configure Syllabus Source <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SYLLABUS EXTRACTION METHOD */}
      {step === "parse" && (
        <div id="step_parse_view" className="space-y-6 animate-in fade-in-50 duration-200">
          
          {/* Back button */}
          <button
            onClick={() => setStep("details")}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1.5 focus:outline-hidden"
          >
            ← Back to subject details
          </button>

          {/* Methods Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
            <button
              onClick={() => setInputMethod("pdf")}
              className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                inputMethod === "pdf" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Upload PDF
            </button>
            <button
              onClick={() => setInputMethod("text")}
              className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                inputMethod === "text" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Paste Text
            </button>
            <button
              onClick={() => setInputMethod("sample")}
              className={`py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                inputMethod === "sample" ? "bg-white text-indigo-700 shadow-xs" : "text-indigo-600/80 hover:text-indigo-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 fill-indigo-100" /> Use Test Sample
            </button>
          </div>

          {/* Tab Contents: PDF Upload */}
          {inputMethod === "pdf" && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-indigo-600" />
                </div>
                
                {fileName ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-800 flex items-center justify-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" /> {fileName}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium">Text extracted successfully!</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Drag & drop your syllabus PDF here</p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse your local files</p>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-6 uppercase tracking-wider">Supports course schedule or syllabus PDFs</p>
              </div>

              {pastedText && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 max-h-40 overflow-y-auto">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Extracted PDF Text Preview</h4>
                  <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">{pastedText.substring(0, 1000)}...</pre>
                </div>
              )}
            </div>
          )}

          {/* Tab Contents: Text Paste */}
          {inputMethod === "text" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">Paste Course Syllabus Text</label>
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Paste units, chapters, topics, or course outline text here..."
                rows={8}
                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono text-gray-700 leading-relaxed"
              />
            </div>
          )}

          {/* Tab Contents: Sample Loading */}
          {inputMethod === "sample" && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 space-y-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-indigo-950">Pre-Loaded DSP Test Syllabus</h3>
                  <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                    Instantly create the "Digital Signal Processing (DSP)" syllabus specified in the brief. This is ideal for testing the circular trackers, mid-sem vs end-sem exam split, checklists, and planners without making live API calls!
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-indigo-100 divide-y divide-gray-50 text-xs">
                <div className="pb-2 flex justify-between">
                  <span className="font-semibold text-gray-700">Unit-I: Sampling & DFT</span>
                  <span className="text-gray-400">5 key topics</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="font-semibold text-gray-700">Unit-II: FIR Filters Design</span>
                  <span className="text-gray-400">4 key topics</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="font-semibold text-gray-700">Unit-III: IIR Filters Design</span>
                  <span className="text-gray-400">4 key topics</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLoadSample}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                Instantly Load Test Fixture Subject <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Start Parsing Button */}
          {inputMethod !== "sample" && (
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={handleStartParsing}
                disabled={!pastedText.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                Start AI Parser <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              </button>
            </div>
          )}

        </div>
      )}

      {/* STEP 3: SYLLABUS EDIT & REVIEW TREE */}
      {step === "review" && (
        <div id="step_review_view" className="space-y-6 animate-in fade-in-50 duration-200">
          
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            <p className="text-xs text-indigo-950 font-medium leading-relaxed">
              <strong>Syllabus Review Mode:</strong> Review the extracted tree of Units, Topics, and Sub-topics. AI is not perfect — you can add, rename, or delete items before committing to the Master database.
            </p>
          </div>

          {/* Tree Builder */}
          <div className="space-y-6">
            {parsedUnits.map((u, uIdx) => (
              <div key={u.id} className="p-4 border border-gray-200 rounded-xl space-y-4 bg-gray-50/30">
                {/* Unit Header */}
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2 w-full max-w-md">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Unit</span>
                    <input
                      type="text"
                      value={u.title}
                      onChange={e => updateUnitTitle(u.id, e.target.value)}
                      className="px-2 py-1 font-bold text-gray-800 bg-white border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:border-indigo-500 w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUnit(u.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Unit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Topics of Unit */}
                <div className="pl-6 border-l-2 border-gray-100 space-y-3">
                  {u.topics.map((t, tIdx) => (
                    <div key={t.id} className="p-3 bg-white border border-gray-200 rounded-xl space-y-3">
                      {/* Topic title edit */}
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-xs font-semibold text-gray-400 shrink-0">Topic {tIdx + 1}:</span>
                          <input
                            type="text"
                            value={t.title}
                            onChange={e => updateTopicTitle(u.id, t.id, e.target.value)}
                            className="px-2 py-0.5 font-medium text-gray-800 bg-gray-50 border border-gray-150 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 w-full"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => addSubtopic(u.id, t.id)}
                            className="px-2 py-1 text-[10px] font-medium bg-gray-50 hover:bg-indigo-50 text-indigo-600 rounded-md transition-colors border border-gray-150"
                          >
                            + Sub-topic
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTopic(u.id, t.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Sub-topics of Topic */}
                      {t.subtopics.length > 0 && (
                        <div className="pl-6 space-y-2 border-l border-gray-100">
                          {t.subtopics.map((st) => (
                            <div key={st.id} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"></span>
                              <input
                                type="text"
                                value={st.title}
                                onChange={e => updateSubtopicTitle(u.id, t.id, st.id, e.target.value)}
                                className="px-2 py-0.5 text-gray-700 bg-transparent hover:bg-gray-50 border border-transparent hover:border-gray-150 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 focus:bg-white w-full"
                              />
                              <button
                                type="button"
                                onClick={() => removeSubtopic(u.id, t.id, st.id)}
                                className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addTopic(u.id)}
                    className="w-full py-1.5 border border-dashed border-gray-300 hover:border-gray-400 hover:bg-white text-[11px] font-semibold text-gray-500 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Topic to {u.title}
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addUnit}
              className="w-full py-3 border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-xs font-semibold text-gray-600 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Unit Block
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-5 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={() => setStep("parse")}
              className="px-4 py-2.5 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors font-semibold border border-gray-150"
            >
              ← Back to Source
            </button>
            <button
              type="button"
              onClick={handleSaveToDb}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-3" /> Commit & Save Syllabus
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
