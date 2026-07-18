import { Subject, Unit, Topic, ExamAssignment, TopicProgress, DailyTask, ExamType } from "../types";

// Helper for generating safe, simple unique IDs
export function generateId(): string {
  return "id_" + Math.random().toString(36).substring(2, 11);
}

// Storage keys
const KEYS = {
  SUBJECTS: "syllabustrack_subjects",
  UNITS: "syllabustrack_units",
  TOPICS: "syllabustrack_topics",
  EXAM_ASSIGNMENTS: "syllabustrack_exam_assignments",
  TOPIC_PROGRESS: "syllabustrack_topic_progress",
  DAILY_TASKS: "syllabustrack_daily_tasks",
  THEME: "syllabustrack_theme",
};

// Initial test fixture dataset as required by the brief
export const SAMPLE_DSP_SYLLABUS = {
  name: "Digital Signal Processing",
  code: "EC8501",
  semester: "5th Semester",
  color: "indigo",
  units: [
    {
      title: "Unit-I",
      topics: [
        {
          title: "Sampling",
          subtopics: [
            "Effects of sampling in time domain",
            "Effects of sampling in frequency domain",
          ],
        },
        {
          title: "Aliasing and reconstruction",
          subtopics: ["In time domain", "In frequency domain"],
        },
        {
          title: "Discrete Fourier Transform (DFT)",
          subtopics: [
            "Definition",
            "Inverse DFT",
            "Properties of DFT (periodicity, multiplication of two DFTs, circular convolution)",
          ],
        },
        {
          title: "Fast Fourier Transform (FFT)",
          subtopics: [
            "Decimation in Time FFT",
            "Decimation in Frequency FFT",
            "Inverse DFT using FFT",
          ],
        },
        {
          title: "Linear filtering methods based on DFT",
          subtopics: ["Overlap-add method", "Overlap-save method"],
        },
      ],
    },
    {
      title: "Unit-II",
      topics: [
        {
          title: "Introduction to Filters",
          subtopics: [
            "Types of filters: low pass, band pass, high pass, band reject",
          ],
        },
        {
          title: "Finite Impulse Response (FIR) filters",
          subtopics: [
            "Symmetric and anti-symmetric FIR filters",
            "Design of linear phase FIR filter using Windowing method",
            "FIR differentiators",
            "Hilbert transformer",
          ],
        },
        {
          title: "Structures for FIR systems",
          subtopics: ["Direct form structures", "Linear phase and cascade form structures"],
        },
        {
          title: "Applications of FIR filters",
          subtopics: [],
        },
      ],
    },
    {
      title: "Unit-III",
      topics: [
        {
          title: "Introduction to IIR filters",
          subtopics: [
            "Characteristics of commonly used analog filters",
            "Butterworth filter",
            "Chebyshev filters",
          ],
        },
        {
          title: "IIR filter design methods",
          subtopics: [
            "Impulse invariance method",
            "Bilinear transformation",
            "Frequency transformations for analog and digital filters",
          ],
        },
        {
          title: "Structures for IIR systems",
          subtopics: [
            "Direct form structures",
            "Cascade form structures",
            "Parallel form structures",
          ],
        },
        {
          title: "Applications of IIR filters",
          subtopics: [],
        },
      ],
    },
  ],
};

// Populate default data if the DB is empty
export function initializeDb() {
  const existingSubjects = localStorage.getItem(KEYS.SUBJECTS);
  if (!existingSubjects) {
    const subjects: Subject[] = [];
    const units: Unit[] = [];
    const topics: Topic[] = [];
    const examAssignments: ExamAssignment[] = [];
    const topicProgress: TopicProgress[] = [];
    const dailyTasks: DailyTask[] = [];

    // Create Sample DSP Subject
    const subId = "dsp_sub_default";
    subjects.push({
      id: subId,
      name: SAMPLE_DSP_SYLLABUS.name,
      code: SAMPLE_DSP_SYLLABUS.code,
      semester: SAMPLE_DSP_SYLLABUS.semester,
      color: SAMPLE_DSP_SYLLABUS.color,
    });

    SAMPLE_DSP_SYLLABUS.units.forEach((u, uIdx) => {
      const unitId = `dsp_unit_${uIdx}`;
      units.push({
        id: unitId,
        subjectId: subId,
        title: u.title,
        orderIndex: uIdx,
      });

      // Default Exam Assignments: Unit I & II go to Mid-Sem (and End-Sem, or just Mid-Sem). 
      // Typically: Unit I & II are Mid-Sem, Unit III is End-Sem. Let's assign:
      if (u.title === "Unit-I" || u.title === "Unit-II") {
        examAssignments.push({
          id: generateId(),
          unitId: unitId,
          examType: "MIDSEM",
        });
      }
      // Everything goes into End-Sem (Unit I, II, and III are often tested in End-Sem)
      examAssignments.push({
        id: generateId(),
        unitId: unitId,
        examType: "ENDSEM",
      });

      u.topics.forEach((t, tIdx) => {
        const parentTopicId = `dsp_topic_${uIdx}_${tIdx}`;
        topics.push({
          id: parentTopicId,
          unitId: unitId,
          parentTopicId: null,
          title: t.title,
          orderIndex: tIdx,
        });

        // Add some completed checks for nice initial state visual
        if (u.title === "Unit-I" && tIdx < 2) {
          topicProgress.push({
            id: generateId(),
            topicId: parentTopicId,
            examType: "MIDSEM",
            isChecked: true,
            checkedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          });
          topicProgress.push({
            id: generateId(),
            topicId: parentTopicId,
            examType: "ENDSEM",
            isChecked: true,
            checkedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          });
        }

        t.subtopics.forEach((st, stIdx) => {
          const subtopicId = `dsp_subtopic_${uIdx}_${tIdx}_${stIdx}`;
          topics.push({
            id: subtopicId,
            unitId: unitId,
            parentTopicId: parentTopicId,
            title: st,
            orderIndex: stIdx,
          });

          if (u.title === "Unit-I" && tIdx < 2) {
            topicProgress.push({
              id: generateId(),
              topicId: subtopicId,
              examType: "MIDSEM",
              isChecked: true,
              checkedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            });
            topicProgress.push({
              id: generateId(),
              topicId: subtopicId,
              examType: "ENDSEM",
              isChecked: true,
              checkedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            });
          }
        });
      });
    });

    // Add some sample tasks for today
    const todayStr = new Date().toISOString().split("T")[0];
    dailyTasks.push({
      id: generateId(),
      date: todayStr,
      subjectId: subId,
      topicId: "dsp_topic_0_2", // DFT
      title: "Revise Discrete Fourier Transform properties",
      isDone: false,
    });
    dailyTasks.push({
      id: generateId(),
      date: todayStr,
      subjectId: subId,
      topicId: null,
      title: "Read DSP syllabus overview and set exam goals",
      isDone: true,
    });

    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(subjects));
    localStorage.setItem(KEYS.UNITS, JSON.stringify(units));
    localStorage.setItem(KEYS.TOPICS, JSON.stringify(topics));
    localStorage.setItem(KEYS.EXAM_ASSIGNMENTS, JSON.stringify(examAssignments));
    localStorage.setItem(KEYS.TOPIC_PROGRESS, JSON.stringify(topicProgress));
    localStorage.setItem(KEYS.DAILY_TASKS, JSON.stringify(dailyTasks));
  }
}

// Low-level database get/set helpers
function getData<T>(key: string): T[] {
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : [];
}

function saveData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Public API
export const db = {
  // Subjects
  getSubjects(): Subject[] {
    return getData<Subject>(KEYS.SUBJECTS);
  },

  saveSubject(subject: Subject) {
    const list = this.getSubjects();
    const idx = list.findIndex((s) => s.id === subject.id);
    if (idx >= 0) list[idx] = subject;
    else list.push(subject);
    saveData(KEYS.SUBJECTS, list);
    return subject;
  },

  deleteSubject(subjectId: string) {
    // Cascade delete units, topics, assignments, progress, and tasks
    const subjects = this.getSubjects().filter((s) => s.id !== subjectId);
    saveData(KEYS.SUBJECTS, subjects);

    const allUnits = this.getUnits();
    const unitsToDelete = allUnits.filter((u) => u.subjectId === subjectId);
    const unitIdsToDelete = unitsToDelete.map((u) => u.id);
    const remainingUnits = allUnits.filter((u) => u.subjectId !== subjectId);
    saveData(KEYS.UNITS, remainingUnits);

    const allTopics = this.getTopics();
    const topicsToDelete = allTopics.filter((t) => unitIdsToDelete.includes(t.unitId));
    const topicIdsToDelete = topicsToDelete.map((t) => t.id);
    const remainingTopics = allTopics.filter((t) => !unitIdsToDelete.includes(t.unitId));
    saveData(KEYS.TOPICS, remainingTopics);

    const allAssignments = this.getExamAssignments();
    const remainingAssignments = allAssignments.filter((a) => !unitIdsToDelete.includes(a.unitId));
    saveData(KEYS.EXAM_ASSIGNMENTS, remainingAssignments);

    const allProgress = this.getTopicProgress();
    const remainingProgress = allProgress.filter((p) => !topicIdsToDelete.includes(p.topicId));
    saveData(KEYS.TOPIC_PROGRESS, remainingProgress);

    const allTasks = this.getDailyTasks();
    const remainingTasks = allTasks.filter((t) => t.subjectId !== subjectId);
    saveData(KEYS.DAILY_TASKS, remainingTasks);
  },

  // Units
  getUnits(): Unit[] {
    return getData<Unit>(KEYS.UNITS);
  },

  getUnitsForSubject(subjectId: string): Unit[] {
    return this.getUnits().filter((u) => u.subjectId === subjectId).sort((a, b) => a.orderIndex - b.orderIndex);
  },

  saveUnits(units: Unit[]) {
    const all = this.getUnits();
    units.forEach((unit) => {
      const idx = all.findIndex((u) => u.id === unit.id);
      if (idx >= 0) all[idx] = unit;
      else all.push(unit);
    });
    saveData(KEYS.UNITS, all);
  },

  // Topics
  getTopics(): Topic[] {
    return getData<Topic>(KEYS.TOPICS);
  },

  getTopicsForUnit(unitId: string): Topic[] {
    return this.getTopics().filter((t) => t.unitId === unitId).sort((a, b) => a.orderIndex - b.orderIndex);
  },

  saveTopics(topics: Topic[]) {
    const all = this.getTopics();
    topics.forEach((topic) => {
      const idx = all.findIndex((t) => t.id === topic.id);
      if (idx >= 0) all[idx] = topic;
      else all.push(topic);
    });
    saveData(KEYS.TOPICS, all);
  },

  // Exam Assignments (Mid-Sem / End-Sem units)
  getExamAssignments(): ExamAssignment[] {
    return getData<ExamAssignment>(KEYS.EXAM_ASSIGNMENTS);
  },

  getExamAssignmentsForSubject(subjectId: string): ExamAssignment[] {
    const units = this.getUnitsForSubject(subjectId);
    const unitIds = units.map((u) => u.id);
    return this.getExamAssignments().filter((a) => unitIds.includes(a.unitId));
  },

  saveExamAssignments(subjectId: string, assignments: ExamAssignment[]) {
    const units = this.getUnitsForSubject(subjectId);
    const unitIds = units.map((u) => u.id);

    // Remove existing assignments for this subject's units
    const otherAssignments = this.getExamAssignments().filter((a) => !unitIds.includes(a.unitId));
    
    const newList = [...otherAssignments, ...assignments];
    saveData(KEYS.EXAM_ASSIGNMENTS, newList);
  },

  // Topic Progress Completion
  getTopicProgress(): TopicProgress[] {
    return getData<TopicProgress>(KEYS.TOPIC_PROGRESS);
  },

  setTopicProgress(topicId: string, examType: ExamType, isChecked: boolean) {
    const all = this.getTopicProgress();
    const idx = all.findIndex((p) => p.topicId === topicId && p.examType === examType);

    if (idx >= 0) {
      if (isChecked) {
        all[idx].isChecked = true;
        all[idx].checkedAt = new Date().toISOString();
      } else {
        // Remove check
        all.splice(idx, 1);
      }
    } else if (isChecked) {
      all.push({
        id: generateId(),
        topicId,
        examType,
        isChecked: true,
        checkedAt: new Date().toISOString(),
      });
    }

    saveData(KEYS.TOPIC_PROGRESS, all);
  },

  // Daily Tasks
  getDailyTasks(): DailyTask[] {
    return getData<DailyTask>(KEYS.DAILY_TASKS);
  },

  getDailyTasksForDate(dateStr: string): DailyTask[] {
    return this.getDailyTasks().filter((t) => t.date === dateStr);
  },

  saveDailyTask(task: DailyTask) {
    const all = this.getDailyTasks();
    const idx = all.findIndex((t) => t.id === task.id);
    if (idx >= 0) all[idx] = task;
    else all.push(task);
    saveData(KEYS.DAILY_TASKS, all);
    return task;
  },

  deleteDailyTask(taskId: string) {
    const all = this.getDailyTasks().filter((t) => t.id !== taskId);
    saveData(KEYS.DAILY_TASKS, all);
  },

  toggleDailyTask(taskId: string): DailyTask | null {
    const all = this.getDailyTasks();
    const idx = all.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      all[idx].isDone = !all[idx].isDone;
      saveData(KEYS.DAILY_TASKS, all);
      return all[idx];
    }
    return null;
  },

  // Database Export & Import
  exportBackup(): string {
    const data = {
      subjects: this.getSubjects(),
      units: this.getUnits(),
      topics: this.getTopics(),
      examAssignments: this.getExamAssignments(),
      topicProgress: this.getTopicProgress(),
      dailyTasks: this.getDailyTasks(),
    };
    return JSON.stringify(data, null, 2);
  },

  importBackup(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (
        data.subjects && Array.isArray(data.subjects) &&
        data.units && Array.isArray(data.units) &&
        data.topics && Array.isArray(data.topics)
      ) {
        saveData(KEYS.SUBJECTS, data.subjects);
        saveData(KEYS.UNITS, data.units || []);
        saveData(KEYS.TOPICS, data.topics || []);
        saveData(KEYS.EXAM_ASSIGNMENTS, data.examAssignments || []);
        saveData(KEYS.TOPIC_PROGRESS, data.topicProgress || []);
        saveData(KEYS.DAILY_TASKS, data.dailyTasks || []);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to import database backup:", e);
      return false;
    }
  },

  // Bulk creation helper
  createSubjectWithSyllabus(
    subjectData: { name: string; code: string; semester: string; color: string },
    unitsData: Array<{ title: string; topics: Array<{ title: string; subtopics: string[] }> }>
  ): string {
    const subId = generateId();
    
    // 1. Create Subject
    const subjectObj: Subject = {
      id: subId,
      name: subjectData.name || "Unnamed Course",
      code: subjectData.code || "Course Code",
      semester: subjectData.semester || "Semester",
      color: subjectData.color || "indigo",
    };
    this.saveSubject(subjectObj);

    // 2. Create Units & Topics
    const unitsList: Unit[] = [];
    const topicsList: Topic[] = [];
    const examAssignmentsList: ExamAssignment[] = [];

    unitsData.forEach((u, uIdx) => {
      const unitId = generateId();
      unitsList.push({
        id: unitId,
        subjectId: subId,
        title: u.title || `Unit ${uIdx + 1}`,
        orderIndex: uIdx,
      });

      // Default Mid-Sem assignments (e.g. Unit-I and Unit-II are Mid-Sem)
      if (u.title.toLowerCase().includes("unit-i") || u.title.toLowerCase().includes("unit-ii") || uIdx < 2) {
        examAssignmentsList.push({
          id: generateId(),
          unitId: unitId,
          examType: "MIDSEM",
        });
      }
      // Everything belongs to End-Sem by default
      examAssignmentsList.push({
        id: generateId(),
        unitId: unitId,
        examType: "ENDSEM",
      });

      if (u.topics && Array.isArray(u.topics)) {
        u.topics.forEach((t, tIdx) => {
          const parentTopicId = generateId();
          topicsList.push({
            id: parentTopicId,
            unitId: unitId,
            parentTopicId: null,
            title: t.title || "Topic",
            orderIndex: tIdx,
          });

          if (t.subtopics && Array.isArray(t.subtopics)) {
            t.subtopics.forEach((st, stIdx) => {
              topicsList.push({
                id: generateId(),
                unitId: unitId,
                parentTopicId: parentTopicId,
                title: st || "Sub-topic",
                orderIndex: stIdx,
              });
            });
          }
        });
      }
    });

    this.saveUnits(unitsList);
    this.saveTopics(topicsList);
    this.saveExamAssignments(subId, examAssignmentsList);

    return subId;
  },
};
