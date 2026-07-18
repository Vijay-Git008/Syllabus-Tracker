import React, { useState, useEffect } from "react";
import { db, generateId } from "../lib/db";
import { DailyTask, Subject, Topic, ExamType } from "../types";
import { Check, Trash2, Calendar, Plus, Link as LinkIcon, Sparkles, AlertCircle, Bookmark, CheckSquare, Target } from "lucide-react";

interface DailyPlannerProps {
  selectedDateStr?: string; // e.g. YYYY-MM-DD
  onTasksChanged?: () => void;
}

export default function DailyPlanner({ selectedDateStr, onTasksChanged }: DailyPlannerProps) {
  // Date configuration
  const todayStr = new Date().toISOString().split("T")[0];
  const [currentDate, setCurrentDate] = useState(selectedDateStr || todayStr);

  // States
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [streakCount, setStreakCount] = useState(0);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Sync prompts overlay
  const [syncPromptTask, setSyncPromptTask] = useState<DailyTask | null>(null);

  useEffect(() => {
    loadData();
  }, [currentDate, selectedDateStr]);

  const loadData = () => {
    // Sync current date if parent passed one
    if (selectedDateStr && selectedDateStr !== currentDate) {
      setCurrentDate(selectedDateStr);
    }
    
    const loadedTasks = db.getDailyTasksForDate(currentDate);
    setTasks(loadedTasks);

    const loadedSubjects = db.getSubjects();
    setSubjects(loadedSubjects);

    if (loadedSubjects.length > 0) {
      setSelectedSubjectId(loadedSubjects[0].id);
      loadTopicsForSubject(loadedSubjects[0].id);
    }

    calculateStreaks();
  };

  const loadTopicsForSubject = (subId: string) => {
    if (!subId) {
      setTopics([]);
      return;
    }
    const units = db.getUnitsForSubject(subId);
    const uIds = units.map(u => u.id);
    const allTopics = db.getTopics().filter(t => uIds.includes(t.unitId));
    setTopics(allTopics);
    if (allTopics.length > 0) {
      setSelectedTopicId(allTopics[0].id);
    } else {
      setSelectedTopicId("");
    }
  };

  const calculateStreaks = () => {
    const allTasks = db.getDailyTasks();
    if (allTasks.length === 0) {
      setStreakCount(0);
      return;
    }

    // Find unique dates where tasks were actually completed
    const doneDates = Array.from(
      new Set(
        allTasks
          .filter(t => t.isDone)
          .map(t => t.date)
      )
    ).sort();

    if (doneDates.length === 0) {
      setStreakCount(0);
      return;
    }

    let streak = 0;
    let checkDate = new Date(todayStr);

    // Run backward from today to count continuous daily completions
    while (true) {
      const dateString = checkDate.toISOString().split("T")[0];
      if (doneDates.includes(dateString)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If yesterday was skipped, but today is already checked, keep streak.
        // Otherwise break.
        if (dateString === todayStr && doneDates.includes(new Date(Date.now() - 3600000 * 24).toISOString().split("T")[0])) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    setStreakCount(streak);
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subId = e.target.value;
    setSelectedSubjectId(subId);
    loadTopicsForSubject(subId);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: DailyTask = {
      id: generateId(),
      date: currentDate,
      subjectId: selectedSubjectId || null,
      topicId: selectedTopicId || null,
      title: newTitle,
      isDone: false,
    };

    db.saveDailyTask(newTask);
    setNewTitle("");
    setIsFormOpen(false);
    loadData();
    if (onTasksChanged) onTasksChanged();
  };

  const handleToggleTask = (task: DailyTask) => {
    const updated = db.toggleDailyTask(task.id);
    if (updated) {
      // Two-way sync: If task is completed and has a linked topic, offer to auto-check in Syllabus
      if (updated.isDone && updated.topicId) {
        setSyncPromptTask(updated);
      } else {
        loadData();
        if (onTasksChanged) onTasksChanged();
      }
    }
  };

  const handleConfirmSyllabusSync = (examType: ExamType) => {
    if (syncPromptTask && syncPromptTask.topicId) {
      // Update checkbox in syllabus progress tracker
      db.setTopicProgress(syncPromptTask.topicId, examType, true);

      // Optionally check all subtopics of this topic too!
      const subtopics = db.getTopics().filter(t => t.parentTopicId === syncPromptTask.topicId);
      subtopics.forEach(st => {
        db.setTopicProgress(st.id, examType, true);
      });
    }

    setSyncPromptTask(null);
    loadData();
    if (onTasksChanged) onTasksChanged();
  };

  const handleDeleteTask = (taskId: string) => {
    db.deleteDailyTask(taskId);
    loadData();
    if (onTasksChanged) onTasksChanged();
  };

  // Helper date slider navigation
  const getDayOffset = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split("T")[0];
  };

  const getDayLetter = (dateString: string): string => {
    const d = new Date(dateString);
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    return days[d.getDay()];
  };

  const getDayNumber = (dateString: string): number => {
    const d = new Date(dateString);
    return d.getDate();
  };

  return (
    <div id="daily_planner_wrapper" className="space-y-6">
      
      {/* TWO-WAY SYNC MODAL */}
      {syncPromptTask && (
        <div id="sync_modal" className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <Target className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-md font-bold text-gray-900">Synchronize Tracker Completion?</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                You studied "<strong className="text-gray-800">{syncPromptTask.title}</strong>", which is linked to a course topic. Would you like to mark it as completed in your tracker?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleConfirmSyllabusSync("MIDSEM")}
                className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800 transition-colors"
              >
                Sync with Mid-Sem
              </button>
              <button
                onClick={() => handleConfirmSyllabusSync("ENDSEM")}
                className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-800 transition-colors"
              >
                Sync with End-Sem
              </button>
            </div>
            
            <button
              onClick={() => {
                setSyncPromptTask(null);
                loadData();
                if (onTasksChanged) onTasksChanged();
              }}
              className="text-xs text-gray-400 hover:text-gray-600 block mx-auto pt-2 focus:outline-hidden"
            >
              Skip, keep tasks separate
            </button>
          </div>
        </div>
      )}

      {/* HORIZONTAL DATE STRIP */}
      <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Date Selection</h3>
          </div>
          <input
            type="date"
            value={currentDate}
            onChange={e => setCurrentDate(e.target.value)}
            className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-indigo-300 transition-colors cursor-pointer"
          />
        </div>

        {/* 7-Day Slider centered on Today */}
        <div className="grid grid-cols-7 gap-1 pt-1">
          {[-3, -2, -1, 0, 1, 2, 3].map(offset => {
            const dStr = getDayOffset(offset);
            const isSelected = currentDate === dStr;
            const isToday = todayStr === dStr;

            return (
              <button
                key={offset}
                onClick={() => setCurrentDate(dStr)}
                className={`py-3 rounded-xl flex flex-col items-center justify-center transition-all focus:outline-hidden relative ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs scale-105"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                }`}
              >
                <span className={`text-[10px] font-semibold opacity-80 ${isSelected ? "text-white" : "text-gray-400"}`}>
                  {getDayLetter(dStr)}
                </span>
                <span className="text-sm font-bold mt-1">
                  {getDayNumber(dStr)}
                </span>
                {isToday && (
                  <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-indigo-600"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TODAY'S PLANNER PANEL */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {currentDate === todayStr ? "Today's Study Plan" : `Study Plan for ${currentDate}`}
            </h3>
            <p className="text-xs text-gray-400 mt-1">Map topics studied dynamically</p>
          </div>
          
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Plan Task
          </button>
        </div>

        {/* Quick Add Form */}
        {isFormOpen && (
          <form onSubmit={handleAddTask} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Task Description</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Revise circular convolution theorems"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-800 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {subjects.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Link Course Subject</label>
                  <select
                    value={selectedSubjectId}
                    onChange={handleSubjectChange}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code || "No Code"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Link Syllabus Topic</label>
                  <select
                    value={selectedTopicId}
                    onChange={e => setSelectedTopicId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 disabled:opacity-50"
                    disabled={topics.length === 0}
                  >
                    {topics.length === 0 ? (
                      <option value="">No topics available</option>
                    ) : (
                      topics.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-500 bg-transparent hover:bg-gray-150 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
              >
                Add Study Task
              </button>
            </div>
          </form>
        )}

        {/* Tasks Checklist */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <CheckSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No study plans scheduled for this day.</p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="text-indigo-600 hover:text-indigo-700 text-xs font-bold mt-1 inline-flex items-center gap-1 focus:outline-hidden"
            >
              Add first task +
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map(task => {
              const matchedSub = subjects.find(s => s.id === task.subjectId);
              const matchedTopic = db.getTopics().find(t => t.id === task.topicId);

              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                    task.isDone
                      ? "bg-gray-50/60 border-gray-150 opacity-70"
                      : "bg-white border-gray-150 hover:border-gray-200 hover:shadow-xs"
                  }`}
                >
                  
                  {/* Done checkbox */}
                  <button
                    onClick={() => handleToggleTask(task)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                      task.isDone
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {task.isDone && <Check className="w-3.5 h-3.5 stroke-3 animate-in zoom-in-50 duration-150" />}
                  </button>

                  {/* Task Content */}
                  <div className="w-full min-w-0 space-y-1.5">
                    <p className={`text-xs sm:text-sm font-semibold text-gray-800 ${task.isDone ? "line-through text-gray-400" : ""}`}>
                      {task.title}
                    </p>

                    {/* Metadata indicators */}
                    <div className="flex flex-wrap items-center gap-2">
                      {matchedSub && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700">
                          {matchedSub.name.substring(0, 15)}...
                        </span>
                      )}
                      {matchedTopic && (
                        <span className="text-[10px] inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                          <LinkIcon className="w-2.5 h-2.5" /> Topic: {matchedTopic.title.substring(0, 20)}...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 align-self-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
