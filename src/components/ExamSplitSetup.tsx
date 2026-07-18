import React, { useState, useEffect } from "react";
import { db, generateId } from "../lib/db";
import { Unit, ExamAssignment, ExamType } from "../types";
import { Check, Info, Award, Calendar, ToggleLeft, ToggleRight } from "lucide-react";

interface ExamSplitSetupProps {
  subjectId: string;
  onSaved?: () => void;
}

export default function ExamSplitSetup({ subjectId, onSaved }: ExamSplitSetupProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [midSemUnits, setMidSemUnits] = useState<string[]>([]);
  const [endSemUnits, setEndSemUnits] = useState<string[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const subjects = db.getSubjects();
    const currentSub = subjects.find(s => s.id === subjectId);
    if (currentSub) {
      setSubjectName(currentSub.name);
    }

    const currentUnits = db.getUnitsForSubject(subjectId);
    setUnits(currentUnits);

    const assignments = db.getExamAssignmentsForSubject(subjectId);
    const mid = assignments.filter(a => a.examType === "MIDSEM").map(a => a.unitId);
    const end = assignments.filter(a => a.examType === "ENDSEM").map(a => a.unitId);
    
    setMidSemUnits(mid);
    setEndSemUnits(end);
  }, [subjectId]);

  // Handle mid-sem toggle and auto-balance remaining to end-sem
  const toggleMidSem = (unitId: string) => {
    setMidSemUnits(prev => {
      const isCurrentlySelected = prev.includes(unitId);
      let nextMid: string[];
      
      if (isCurrentlySelected) {
        nextMid = prev.filter(id => id !== unitId);
      } else {
        nextMid = [...prev, unitId];
      }

      // Auto-balancing: units not in Mid-Sem should automatically be suggested for End-Sem!
      setEndSemUnits(endPrev => {
        const remaining = units.filter(u => !nextMid.includes(u.id)).map(u => u.id);
        
        // Return End-Sem including all remaining units + retaining any manual end-sem overrides
        const nextEnd = Array.from(new Set([...endPrev, ...remaining]));
        return nextEnd;
      });

      return nextMid;
    });
  };

  const toggleEndSem = (unitId: string) => {
    setEndSemUnits(prev => {
      if (prev.includes(unitId)) {
        return prev.filter(id => id !== unitId);
      } else {
        return [...prev, unitId];
      }
    });
  };

  const handleSaveAssignments = () => {
    const assignments: ExamAssignment[] = [];
    
    midSemUnits.forEach(unitId => {
      assignments.push({
        id: generateId(),
        unitId,
        examType: "MIDSEM",
      });
    });

    endSemUnits.forEach(unitId => {
      assignments.push({
        id: generateId(),
        unitId,
        examType: "ENDSEM",
      });
    });

    db.saveExamAssignments(subjectId, assignments);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onSaved) onSaved();
    }, 1500);
  };

  return (
    <div id="exam_split_setup" className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Define Syllabus Coverage Scope</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Assign units to Mid-Sem and End-Sem exams for <strong className="text-indigo-600 font-semibold">{subjectName}</strong>. 
          </p>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3 mb-6">
        <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-600 leading-relaxed">
          <strong>Auto-preset helper active:</strong> When you select units for Mid-Sem (e.g. Unit I & II), the remaining units (e.g. Unit III) automatically default to End-Sem. You are free to overlap or customize assignments as per your specific syllabus.
        </p>
      </div>

      {/* Grid Matrix */}
      <div className="border border-gray-150 rounded-xl overflow-hidden divide-y divide-gray-100">
        
        {/* Table Header */}
        <div className="grid grid-cols-12 bg-gray-50/70 p-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <div className="col-span-6 flex items-center">Course Unit</div>
          <div className="col-span-3 text-center flex items-center justify-center text-amber-700">Mid-Sem</div>
          <div className="col-span-3 text-center flex items-center justify-center text-indigo-700">End-Sem</div>
        </div>

        {/* Units rows */}
        {units.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">No units defined. Setup master syllabus list first.</div>
        ) : (
          units.map(unit => {
            const isMid = midSemUnits.includes(unit.id);
            const isEnd = endSemUnits.includes(unit.id);

            return (
              <div key={unit.id} className="grid grid-cols-12 p-3 hover:bg-gray-50/40 transition-colors items-center text-sm">
                
                {/* Unit info */}
                <div className="col-span-6">
                  <h4 className="font-semibold text-gray-800 text-xs sm:text-sm">{unit.title}</h4>
                </div>

                {/* Mid-Sem Toggle */}
                <div className="col-span-3 flex justify-center">
                  <button
                    onClick={() => toggleMidSem(unit.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isMid
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${isMid ? "opacity-100" : "opacity-0"}`} />
                    Assigned
                  </button>
                </div>

                {/* End-Sem Toggle */}
                <div className="col-span-3 flex justify-center">
                  <button
                    onClick={() => toggleEndSem(unit.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isEnd
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                        : "bg-white border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${isEnd ? "opacity-100" : "opacity-0"}`} />
                    Assigned
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Save action bar */}
      <div className="mt-6 pt-5 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleSaveAssignments}
          disabled={savedSuccess}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer ${
            savedSuccess
              ? "bg-emerald-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-3" /> Scope Settings Saved!
            </>
          ) : (
            "Save Exam Configurations"
          )}
        </button>
      </div>

    </div>
  );
}
