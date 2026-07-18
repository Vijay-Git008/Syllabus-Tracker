import React, { useState, useEffect } from "react";
import { db } from "../lib/db";
import { Subject, DailyTask, ExamType } from "../types";
import { Plus, BookOpen, Calendar, CheckSquare, Sparkles, Trophy, Award, TrendingUp, ChevronRight, Check } from "lucide-react";

interface DashboardProps {
  onAddSubject: () => void;
  onSelectSubject: (subjectId: string) => void;
  onNavigateToPlanner: () => void;
  onNavigateToSettings: () => void;
}

export default function Dashboard({
  onAddSubject,
  onSelectSubject,
  onNavigateToPlanner,
  onNavigateToSettings,
}: DashboardProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);
  const [streakCount, setStreakCount] = useState(0);

  // Subject statistics structure
  interface SubjectStat {
    subject: Subject;
    overallProgress: number;
    midProgress: number;
    endProgress: number;
    midCount: { checked: number; total: number };
    endCount: { checked: number; total: number };
  }

  const [stats, setStats] = useState<SubjectStat[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    const loadedSubjects = db.getSubjects();
    setSubjects(loadedSubjects);

    const todayStr = new Date().toISOString().split("T")[0];
    const loadedTasks = db.getDailyTasksForDate(todayStr);
    setTodayTasks(loadedTasks);

    // Calculate detailed stats per subject
    const computedStats: SubjectStat[] = loadedSubjects.map(sub => {
      const units = db.getUnitsForSubject(sub.id);
      const unitIds = units.map(u => u.id);

      // Get all topics for these units
      const allTopics = db.getTopics().filter(t => unitIds.includes(t.unitId));
      const totalMasterCount = allTopics.length;

      // Get assignment details
      const assignments = db.getExamAssignmentsForSubject(sub.id);
      const midSemUnitIds = assignments.filter(a => a.examType === "MIDSEM").map(a => a.unitId);
      const endSemUnitIds = assignments.filter(a => a.examType === "ENDSEM").map(a => a.unitId);

      // Topics in Mid-Sem Units
      const midTopics = allTopics.filter(t => midSemUnitIds.includes(t.unitId));
      // Topics in End-Sem Units
      const endTopics = allTopics.filter(t => endSemUnitIds.includes(t.unitId));

      // Progress checks
      const allProgress = db.getTopicProgress();
      const topicIds = allTopics.map(t => t.id);
      const checkedMaster = allProgress.filter(p => topicIds.includes(p.topicId) && p.isChecked);

      // We calculate overall progress based on unique topics completed in EITHER context, 
      // or simple average. Let's make it overall master progress check:
      const uniqueCheckedMasterIds = Array.from(new Set(checkedMaster.map(p => p.topicId)));
      const overallProgress = totalMasterCount > 0 
        ? Math.round((uniqueCheckedMasterIds.length / totalMasterCount) * 100)
        : 0;

      // Mid Progress
      const midChecked = allProgress.filter(p => 
        p.examType === "MIDSEM" && 
        p.isChecked && 
        midTopics.map(t => t.id).includes(p.topicId)
      );
      const midProgress = midTopics.length > 0
        ? Math.round((midChecked.length / midTopics.length) * 100)
        : 0;

      // End Progress
      const endChecked = allProgress.filter(p => 
        p.examType === "ENDSEM" && 
        p.isChecked && 
        endTopics.map(t => t.id).includes(p.topicId)
      );
      const endProgress = endTopics.length > 0
        ? Math.round((endChecked.length / endTopics.length) * 100)
        : 0;

      return {
        subject: sub,
        overallProgress,
        midProgress,
        endProgress,
        midCount: { checked: midChecked.length, total: midTopics.length },
        endCount: { checked: endChecked.length, total: endTopics.length },
      };
    });

    setStats(computedStats);

    // Calculate Continuous Streak
    calculateStreaks();
  };

  const calculateStreaks = () => {
    const allTasks = db.getDailyTasks();
    if (allTasks.length === 0) {
      setStreakCount(0);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const doneDates = Array.from(
      new Set(allTasks.filter(t => t.isDone).map(t => t.date))
    ).sort();

    if (doneDates.length === 0) {
      setStreakCount(0);
      return;
    }

    let streak = 0;
    let checkDate = new Date(todayStr);

    while (true) {
      const dateString = checkDate.toISOString().split("T")[0];
      if (doneDates.includes(dateString)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (dateString === todayStr && doneDates.includes(new Date(Date.now() - 3600000 * 24).toISOString().split("T")[0])) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    setStreakCount(streak);
  };

  const handleToggleTaskInline = (taskId: string) => {
    db.toggleDailyTask(taskId);
    loadDashboardData();
  };

  // Helper colors mapping
  const getColorClasses = (col: string) => {
    const defaults = {
      bg: "bg-indigo-600",
      lightBg: "bg-indigo-50/70",
      text: "text-indigo-600",
      darkText: "text-indigo-950",
      border: "border-indigo-100",
    };

    switch (col) {
      case "indigo":
        return defaults;
      case "teal":
        return { bg: "bg-teal-600", lightBg: "bg-teal-50/70", text: "text-teal-600", darkText: "text-teal-950", border: "border-teal-100" };
      case "emerald":
        return { bg: "bg-emerald-600", lightBg: "bg-emerald-50/70", text: "text-emerald-600", darkText: "text-emerald-950", border: "border-emerald-100" };
      case "rose":
        return { bg: "bg-rose-600", lightBg: "bg-rose-50/70", text: "text-rose-600", darkText: "text-rose-950", border: "border-rose-100" };
      case "amber":
        return { bg: "bg-amber-600", lightBg: "bg-amber-50/70", text: "text-amber-600", darkText: "text-amber-950", border: "border-amber-100" };
      default:
        return defaults;
    }
  };

  return (
    <div id="dashboard_view_wrapper" className="space-y-6">
      
      {/* HERO ACHIEVEMENTS STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Streak Panel */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-100 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-600 fill-amber-100" /> Active study streak
            </span>
            <h3 className="text-2xl font-bold text-amber-950">
              {streakCount} {streakCount === 1 ? "Day" : "Days"} Continuous
            </h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              {streakCount > 0 ? "Outstanding progress! Keep the flame burning today." : "Log a completed task today to start your streak!"}
            </p>
          </div>
          <div className="text-4xl">🔥</div>
        </div>

        {/* Global completion tracking count */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50/60 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> Syllabus mastery index
            </span>
            <h3 className="text-2xl font-bold text-indigo-950">
              {stats.length > 0 
                ? Math.round(stats.reduce((acc, curr) => acc + curr.overallProgress, 0) / stats.length)
                : 0}% Complete
            </h3>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Average mastery metric across {stats.length} subject {stats.length === 1 ? "syllabus" : "syllabi"}
            </p>
          </div>
          <div className="text-4xl">🎯</div>
        </div>

        {/* Quick calendar planner launcher */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Today's Action Checklist
            </span>
            <h3 className="text-2xl font-bold text-emerald-950">
              {todayTasks.filter(t => t.isDone).length}/{todayTasks.length} Done
            </h3>
            <p className="text-xs text-emerald-700 leading-relaxed">
              {todayTasks.length > 0 
                ? "Plan tasks, check off, sync tracker." 
                : "No plans set for today. Plan study targets."}
            </p>
          </div>
          <div className="text-4xl">📝</div>
        </div>

      </div>

      {/* PRIMARY TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE SUBJECT CARD GRID */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center pb-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Syllabus Trackers
              </h3>
              <p className="text-xs text-gray-400">Master tracker and exam-split metrics</p>
            </div>
            
            <button
              onClick={onAddSubject}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </button>
          </div>

          {stats.length === 0 ? (
            <div className="bg-white border border-gray-150 rounded-2xl p-8 text-center space-y-3">
              <div className="text-4xl">📚</div>
              <h4 className="font-bold text-gray-800 text-sm">No Subjects Configured</h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                Add your first course subject to start tracking completion. Use our AI syllabus parser or load the test sample.
              </p>
              <button
                onClick={onAddSubject}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Add First Subject +
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stats.map(stat => {
                const colors = getColorClasses(stat.subject.color);

                return (
                  <div
                    key={stat.subject.id}
                    onClick={() => onSelectSubject(stat.subject.id)}
                    className="bg-white border border-gray-150 hover:border-gray-200 active:scale-97 hover:scale-[1.01] rounded-2xl p-5 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between h-56"
                  >
                    {/* Card Top: Subject details */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${colors.lightBg} ${colors.text}`}>
                          {stat.subject.code || "Course ID"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">{stat.subject.semester}</span>
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm sm:text-base group-hover:text-indigo-600 transition-colors line-clamp-1 mt-1.5">
                        {stat.subject.name}
                      </h4>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-3.5">
                      {/* Overall Progress slide */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-500">Overall Mastery</span>
                          <span className="text-gray-800">{stat.overallProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${colors.bg}`} style={{ width: `${stat.overallProgress}%` }}></div>
                        </div>
                      </div>

                      {/* Side-by-Side Exam Coverage Progress Metrics */}
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-50">
                        {/* Mid-Sem tracker info */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-amber-800 block">Mid-Sem Progress</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold text-amber-950">{stat.midProgress}%</span>
                            <span className="text-[9px] text-gray-400 font-medium">({stat.midCount.checked}/{stat.midCount.total})</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${stat.midProgress}%` }}></div>
                          </div>
                        </div>

                        {/* End-Sem tracker info */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-indigo-800 block">End-Sem Progress</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold text-indigo-950">{stat.endProgress}%</span>
                            <span className="text-[9px] text-gray-400 font-medium">({stat.endCount.checked}/{stat.endCount.total})</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${stat.endProgress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACTION STUDY CHECKLIST */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex justify-between items-center pb-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" /> Study Checklist
              </h3>
              <p className="text-xs text-gray-400">Target daily completion plans</p>
            </div>
            
            <button
              onClick={onNavigateToPlanner}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
            >
              Planner <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
            
            {todayTasks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-xs text-gray-400">No study tasks planned for today.</p>
                <button
                  onClick={onNavigateToPlanner}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Set Daily Targets +
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {todayTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                      task.isDone
                        ? "bg-gray-50/50 border-gray-150 opacity-60"
                        : "bg-white border-gray-150 hover:border-gray-200"
                    }`}
                  >
                    {/* Toggle box */}
                    <button
                      onClick={() => handleToggleTaskInline(task.id)}
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                        task.isDone
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-white border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {task.isDone && <Check className="w-3 h-3 stroke-3" />}
                    </button>
                    
                    <span className={`text-xs text-gray-700 font-semibold line-clamp-2 ${task.isDone ? "line-through text-gray-400" : ""}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
              <span className="font-semibold">Today studied:</span>
              <span className="font-bold text-gray-700">
                {todayTasks.filter(t => t.isDone).length} of {todayTasks.length} tasks done
              </span>
            </div>

          </div>

          {/* TIPS & AI INSIGHTS PANEL */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-3xl opacity-10 font-bold">DSP</div>
            <div className="space-y-2">
              <span className="text-[9px] font-bold uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md inline-block">
                AI Productivity Coach
              </span>
              <h4 className="text-xs font-bold">Track Mid-Sem vs End-Sem</h4>
              <p className="text-[11px] text-indigo-200 leading-relaxed">
                Exam syllabi often overlap. Keep completion checks completely independent in each context so you can monitor Mid-Sem prep without resetting your final semester progress!
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
