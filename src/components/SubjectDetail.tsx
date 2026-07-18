import React, { useState, useEffect } from "react";
import { db } from "../lib/db";
import { Subject, Unit, Topic, ExamType, TopicProgress, ExamAssignment } from "../types";
import { Check, Info, Trash2, Calendar, LayoutGrid, CheckSquare, Settings, ArrowLeft, ChevronDown, ChevronRight, Award, Plus, Layers, Target, Clock } from "lucide-react";
import ExamSplitSetup from "./ExamSplitSetup";

interface SubjectDetailProps {
  subjectId: string;
  onBack: () => void;
  onDeleted: () => void;
}

export default function SubjectDetail({ subjectId, onBack, onDeleted }: SubjectDetailProps) {
  // Database states
  const [subject, setSubject] = useState<Subject | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topicsByUnit, setTopicsByUnit] = useState<Record<string, Topic[]>>({});
  const [assignments, setAssignments] = useState<ExamAssignment[]>([]);
  const [progress, setProgress] = useState<TopicProgress[]>([]);

  // Page layouts
  const [activeTab, setActiveTab] = useState<"overview" | "midsem" | "endsem" | "master">("overview");
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSubjectData();
  }, [subjectId, isSetupOpen]);

  const loadSubjectData = () => {
    const subs = db.getSubjects();
    const currentSub = subs.find(s => s.id === subjectId) || null;
    setSubject(currentSub);

    if (currentSub) {
      const currentUnits = db.getUnitsForSubject(subjectId);
      setUnits(currentUnits);

      const topicMap: Record<string, Topic[]> = {};
      currentUnits.forEach(u => {
        topicMap[u.id] = db.getTopicsForUnit(u.id);
      });
      setTopicsByUnit(topicMap);

      const currentAssignments = db.getExamAssignmentsForSubject(subjectId);
      setAssignments(currentAssignments);

      const currentProgress = db.getTopicProgress();
      setProgress(currentProgress);
    }
  };

  const handleDeleteSubject = () => {
    if (confirm("Are you absolutely sure you want to delete this course? This will wipe out all syllabus trackers, assignments, planner logs, and checklist progress! This action is irreversible.")) {
      db.deleteSubject(subjectId);
      onDeleted();
    }
  };

  const toggleUnitCollapse = (unitId: string) => {
    setCollapsedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  // Checkbox interactions
  const handleCheckboxChange = (topic: Topic, examType: ExamType, isChecked: boolean) => {
    // 1. Set progress on the clicked topic
    db.setTopicProgress(topic.id, examType, isChecked);

    // 2. Cascade down: If it's a parent topic, optionally auto-check all its subtopics
    if (topic.parentTopicId === null) {
      const allSubtopics = db.getTopics().filter(t => t.parentTopicId === topic.id);
      
      if (isChecked) {
        // Automatically check subtopics
        allSubtopics.forEach(st => {
          db.setTopicProgress(st.id, examType, true);
        });
      } else {
        // Automatically uncheck subtopics
        allSubtopics.forEach(st => {
          db.setTopicProgress(st.id, examType, false);
        });
      }
    } else {
      // 3. Cascade up: If it's a subtopic and is being UNCHECKED, ensure parent is unchecked.
      // If it's checked, let's see if all sister subtopics are checked - if yes, check parent!
      if (!isChecked) {
        db.setTopicProgress(topic.parentTopicId, examType, false);
      } else {
        const parentId = topic.parentTopicId;
        const sisterSubtopics = db.getTopics().filter(t => t.parentTopicId === parentId);
        
        const allProgress = db.getTopicProgress();
        const checkedSistersCount = allProgress.filter(p => 
          p.examType === examType && 
          p.isChecked && 
          sisterSubtopics.map(st => st.id).includes(p.topicId) &&
          p.topicId !== topic.id // exclude self to calculate with current checked
        ).length + 1; // plus current self

        if (checkedSistersCount === sisterSubtopics.length) {
          db.setTopicProgress(parentId, examType, true);
        }
      }
    }

    // Refresh database
    loadSubjectData();
  };

  // Calculations for display percentages
  const calculateProgressForUnits = (assignedUnitIds: string[], examType: ExamType) => {
    const assignedUnits = units.filter(u => assignedUnitIds.includes(u.id));
    let totalTopicsCount = 0;
    let checkedTopicsCount = 0;

    assignedUnits.forEach(u => {
      const unitTopics = topicsByUnit[u.id] || [];
      totalTopicsCount += unitTopics.length;

      const checked = progress.filter(p => 
        p.examType === examType && 
        p.isChecked && 
        unitTopics.map(t => t.id).includes(p.topicId)
      );
      checkedTopicsCount += checked.length;
    });

    return {
      percent: totalTopicsCount > 0 ? Math.round((checkedTopicsCount / totalTopicsCount) * 100) : 0,
      checked: checkedTopicsCount,
      total: totalTopicsCount,
    };
  };

  const calculateUnitProgressMetric = (unitId: string, examType: ExamType) => {
    const unitTopics = topicsByUnit[unitId] || [];
    const total = unitTopics.length;
    const checked = progress.filter(p => 
      p.examType === examType && 
      p.isChecked && 
      unitTopics.map(t => t.id).includes(p.topicId)
    ).length;

    return {
      percent: total > 0 ? Math.round((checked / total) * 100) : 0,
      checked,
      total,
    };
  };

  if (!subject) {
    return (
      <div className="p-8 text-center text-gray-500">
        Subject not found.
        <button onClick={onBack} className="text-indigo-600 block mx-auto mt-2 font-bold text-xs focus:outline-hidden">
          Go Back
        </button>
      </div>
    );
  }

  // Identify assigned units
  const midSemUnitIds = assignments.filter(a => a.examType === "MIDSEM").map(a => a.unitId);
  const endSemUnitIds = assignments.filter(a => a.examType === "ENDSEM").map(a => a.unitId);

  const midMetrics = calculateProgressForUnits(midSemUnitIds, "MIDSEM");
  const endMetrics = calculateProgressForUnits(endSemUnitIds, "ENDSEM");

  return (
    <div id="subject_detail_container" className="space-y-6">
      
      {/* Top action header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-gray-150">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-150 text-gray-600 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                {subject.code || "Course ID"}
              </span>
              <span className="text-xs text-gray-400 font-medium">{subject.semester}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{subject.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsSetupOpen(!isSetupOpen)}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Settings className="w-4 h-4" /> Scope Configurations
          </button>
          <button
            onClick={handleDeleteSubject}
            className="p-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-xl transition-all cursor-pointer"
            title="Delete Course Subject"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RENDER DUAL-SCOPE CONFIGURATION MATRIX */}
      {isSetupOpen && (
        <div className="animate-in fade-in-50 zoom-in-95 duration-200">
          <ExamSplitSetup subjectId={subjectId} onSaved={() => setIsSetupOpen(false)} />
        </div>
      )}

      {/* CORE MODULAR TAB NAVIGATION */}
      <div className="grid grid-cols-4 gap-1 sm:gap-2 bg-gray-50/70 p-1 rounded-xl border border-gray-150">
        <button
          onClick={() => { setActiveTab("overview"); setIsSetupOpen(false); }}
          className={`py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === "overview" ? "bg-white text-gray-900 shadow-xs border border-gray-100" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => { setActiveTab("midsem"); setIsSetupOpen(false); }}
          className={`py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === "midsem" ? "bg-white text-amber-700 shadow-xs border border-gray-100" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Mid-Sem
        </button>
        <button
          onClick={() => { setActiveTab("endsem"); setIsSetupOpen(false); }}
          className={`py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === "endsem" ? "bg-white text-indigo-700 shadow-xs border border-gray-100" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          End-Sem
        </button>
        <button
          onClick={() => { setActiveTab("master"); setIsSetupOpen(false); }}
          className={`py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === "master" ? "bg-white text-gray-700 shadow-xs border border-gray-100" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          All Topics
        </button>
      </div>

      {/* OVERVIEW MODULE */}
      {activeTab === "overview" && (
        <div id="overview_tab" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in-50 duration-200">
          
          {/* Left panel: Exam Progress Rings */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-indigo-600" /> Exam Progress Indices
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Mid-Sem Gauge Card */}
              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Mid-Sem Coverage</span>
                <div className="text-3xl font-black text-amber-950">{midMetrics.percent}%</div>
                <p className="text-[10px] text-amber-700">
                  {midMetrics.checked} of {midMetrics.total} topics studied
                </p>
                <div className="w-full bg-amber-200/40 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-amber-500 h-full" style={{ width: `${midMetrics.percent}%` }}></div>
                </div>
              </div>

              {/* End-Sem Gauge Card */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">End-Sem Coverage</span>
                <div className="text-3xl font-black text-indigo-950">{endMetrics.percent}%</div>
                <p className="text-[10px] text-indigo-700">
                  {endMetrics.checked} of {endMetrics.total} topics studied
                </p>
                <div className="w-full bg-indigo-200/40 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-indigo-500 h-full" style={{ width: `${endMetrics.percent}%` }}></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Exam progress trackers are kept 100% separate. Marking a topic studied in Mid-Sem allows you to monitor completion independently without skewing your comprehensive End-Sem review indexes.
              </p>
            </div>
          </div>

          {/* Right panel: Unit assignment distribution review */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" /> Syllabus Distributions
              </h3>
              <button
                onClick={() => setIsSetupOpen(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 focus:outline-hidden"
              >
                Re-assign Units
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {units.map((unit) => {
                const belongsToMid = midSemUnitIds.includes(unit.id);
                const belongsToEnd = endSemUnitIds.includes(unit.id);

                return (
                  <div key={unit.id} className="p-3 bg-gray-50/40 border border-gray-150 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-xs sm:text-sm">{unit.title}</h4>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                        {topicsByUnit[unit.id]?.length || 0} topics in this block
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {belongsToMid && (
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md">
                          Mid-Sem
                        </span>
                      )}
                      {belongsToEnd && (
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md">
                          End-Sem
                        </span>
                      )}
                      {!belongsToMid && !belongsToEnd && (
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-gray-100 text-gray-400 px-2 py-0.5 rounded-md">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TRACKER SUB-TABS: MIDSEM OR ENDSEM CHECKLIST */}
      {(activeTab === "midsem" || activeTab === "endsem") && (
        <div id="exam_tracker_tab" className="space-y-4 animate-in fade-in-50 duration-200">
          
          {/* Tracker Header details */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-gray-150 rounded-2xl shadow-sm">
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block ${
                activeTab === "midsem" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"
              }`}>
                {activeTab === "midsem" ? "Mid-Sem Study tracker" : "End-Sem Study tracker"}
              </span>
              <p className="text-xs text-gray-400 mt-1">Check off study items as you progress</p>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-gray-800">
                {activeTab === "midsem" ? midMetrics.percent : endMetrics.percent}%
              </span>
              <p className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">
                Mastery indicator
              </p>
            </div>
          </div>

          {/* Collapsible checklist blocks */}
          <div className="space-y-3">
            {units
              .filter(u => activeTab === "midsem" ? midSemUnitIds.includes(u.id) : endSemUnitIds.includes(u.id))
              .map(unit => {
                const isCollapsed = collapsedUnits[unit.id];
                const unitTopics = topicsByUnit[unit.id] || [];
                const parentTopics = unitTopics.filter(t => t.parentTopicId === null);
                
                const unitMetrics = calculateUnitProgressMetric(unit.id, activeTab === "midsem" ? "MIDSEM" : "ENDSEM");

                return (
                  <div key={unit.id} className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-xs">
                    
                    {/* Collapsible Header block */}
                    <div
                      onClick={() => toggleUnitCollapse(unit.id)}
                      className="p-4 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        <div>
                          <h3 className="font-bold text-gray-800 text-xs sm:text-sm">{unit.title}</h3>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            {unitMetrics.checked} of {unitMetrics.total} study objects checked
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-gray-800 bg-white border border-gray-150 px-2 py-0.5 rounded-lg">
                          {unitMetrics.percent}% Done
                        </span>
                      </div>
                    </div>

                    {/* Collapsible content (Topics + Sub-topics lists) */}
                    {!isCollapsed && (
                      <div className="p-4 border-t border-gray-100 divide-y divide-gray-100/70">
                        {parentTopics.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-400">No topics configured in this unit yet.</div>
                        ) : (
                          parentTopics.map(t => {
                            const isTopicChecked = progress.some(p => p.topicId === t.id && p.examType === (activeTab === "midsem" ? "MIDSEM" : "ENDSEM") && p.isChecked);
                            const childSubtopics = unitTopics.filter(st => st.parentTopicId === t.id);

                            return (
                              <div key={t.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                                
                                {/* Topic item row */}
                                <div className="flex items-start gap-2.5">
                                  <button
                                    onClick={() => handleCheckboxChange(t, activeTab === "midsem" ? "MIDSEM" : "ENDSEM", !isTopicChecked)}
                                    className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                                      isTopicChecked
                                        ? activeTab === "midsem"
                                          ? "bg-amber-600 border-amber-600 text-white"
                                          : "bg-indigo-600 border-indigo-600 text-white"
                                        : "bg-white border-gray-300 hover:border-gray-400"
                                    }`}
                                  >
                                    {isTopicChecked && <Check className="w-3.5 h-3.5 stroke-3 animate-in zoom-in-50 duration-150" />}
                                  </button>

                                  <div className="w-full min-w-0">
                                    <h4 className={`text-xs sm:text-sm font-semibold text-gray-800 ${isTopicChecked ? "line-through text-gray-400 font-medium" : ""}`}>
                                      {t.title}
                                    </h4>
                                  </div>
                                </div>

                                {/* Cascaded Subtopic list items */}
                                {childSubtopics.length > 0 && (
                                  <div className="pl-7 space-y-2.5 border-l border-gray-100">
                                    {childSubtopics.map(st => {
                                      const isSubChecked = progress.some(p => p.topicId === st.id && p.examType === (activeTab === "midsem" ? "MIDSEM" : "ENDSEM") && p.isChecked);

                                      return (
                                        <div key={st.id} className="flex items-start gap-2.5">
                                          <button
                                            onClick={() => handleCheckboxChange(st, activeTab === "midsem" ? "MIDSEM" : "ENDSEM", !isSubChecked)}
                                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                                              isSubChecked
                                                ? activeTab === "midsem"
                                                  ? "bg-amber-500 border-amber-500 text-white"
                                                  : "bg-indigo-500 border-indigo-500 text-white"
                                                : "bg-white border-gray-200 hover:border-gray-300"
                                            }`}
                                          >
                                            {isSubChecked && <Check className="w-3 h-3 stroke-3" />}
                                          </button>

                                          <span className={`text-xs text-gray-600 ${isSubChecked ? "line-through text-gray-400" : ""}`}>
                                            {st.title}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
          </div>

        </div>
      )}

      {/* ALL TOPICS MASTER SKELETON TREE */}
      {activeTab === "master" && (
        <div id="master_syllabus_tab" className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in-50 duration-200">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" /> Syllabus Master List
            </h3>
            <p className="text-xs text-gray-400 mt-1">Comprehensive structured hierarchy of course contents</p>
          </div>

          <div className="divide-y divide-gray-150">
            {units.map((unit, uIdx) => {
              const unitTopics = topicsByUnit[unit.id] || [];
              const parentTopics = unitTopics.filter(t => t.parentTopicId === null);

              return (
                <div key={unit.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">{unit.title}</h4>

                  <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                    {parentTopics.map((t, tIdx) => {
                      const childSubtopics = unitTopics.filter(st => st.parentTopicId === t.id);

                      return (
                        <div key={t.id} className="space-y-1.5">
                          <h5 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {t.title}
                          </h5>

                          {childSubtopics.length > 0 && (
                            <div className="pl-5 space-y-1">
                              {childSubtopics.map(st => (
                                <p key={st.id} className="text-xs text-gray-500 leading-relaxed flex items-center gap-1.5">
                                  <span className="text-gray-300">•</span> {st.title}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
