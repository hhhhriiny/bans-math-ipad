// src/types/db.ts

export interface Curriculum {
  id: number;
  grade_level: string;
  semester: string;
  chapter_name: string;
  display_order: number;
}

export interface ClassLog {
  id: number;
  class_id: number;
  class_date: string;
  progress_curriculum_ids: number[];
  review_curriculum_ids: number[];
  teacher_note?: string;
  created_at: string;
}

export interface StudentEvaluation {
  id?: number;
  class_log_id: number;
  student_id: number;
  attendance_status: 'present' | 'absent' | 'late';
  homework_status: 'complete' | 'partial' | 'incomplete';
  understanding_score: number;
  attitude_score: number;
  
  // [New] 새로 추가된 필드
  attitude_tags?: string[];
  teacher_note?: string;
  report_message?: string; // AI 멘트 저장용

  students?: {
    name: string;
    school_name: string;
  };
}
  
  // 4. UI 상태 관리를 위한 확장 인터페이스
  export interface ClassEvaluationUIState {
    selectedDate: Date;
    selectedProgress: number[]; // 선택된 커리큘럼 ID 리스트
    selectedReview: number[];   // 선택된 복습 커리큘럼 ID 리스트
    evaluations: Record<number, StudentEvaluation>; // key: student_id
    currentStudentId: number | null; // 현재 우측 패널에서 작성 중인 학생
  }