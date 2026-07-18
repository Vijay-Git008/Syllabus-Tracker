export interface Subject {
  id: string;
  name: string;
  code: string;
  semester: string;
  color: string; // Tailwind class background prefix or color hex
}

export interface Unit {
  id: string;
  subjectId: string;
  title: string;
  orderIndex: number;
}

export interface Topic {
  id: string;
  unitId: string;
  parentTopicId: string | null; // null for topics, set to parent id for subtopics
  title: string;
  orderIndex: number;
}

export type ExamType = "MIDSEM" | "ENDSEM";

export interface ExamAssignment {
  id: string;
  unitId: string;
  examType: ExamType;
}

export interface TopicProgress {
  id: string;
  topicId: string;
  examType: ExamType;
  isChecked: boolean;
  checkedAt: string;
}

export interface DailyTask {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string | null;
  topicId: string | null; // linked syllabus topic
  title: string;
  isDone: boolean;
}
