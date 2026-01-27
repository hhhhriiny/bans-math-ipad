// src/types/db_types.ts (새로 생성 권장)

// 1. 커리큘럼
export interface Curriculum {
    id: number;
    grade_level: string;
    semester: string;
    chapter_name: string; // 예: "이차방정식"
    display_order: number;
  }
  
  // 2. 수업 일지 (Class Log - Master)
  export interface ClassLog {
    id: number;
    class_id: number;
    class_date: string; // 'YYYY-MM-DD'
    progress_curriculum_ids: number[]; // 저장된 단원 ID들
    review_curriculum_ids: number[];
    teacher_note?: string;
    created_at: string;
  }
  
  // 3. 학생 평가 (Student Evaluation - Detail)
  export interface StudentEvaluation {
    id?: number; // DB insert 전에는 없을 수 있음
    class_log_id: number;
    student_id: number;
    attendance_status: 'present' | 'absent' | 'late';
    homework_status: 'complete' | 'partial' | 'incomplete';
    understanding_score: number; // 1 ~ 5
    attitude_score: number;      // 1 ~ 5
    comment: string;
    
    // UI 표시를 위한 Join 필드 (Supabase select 시 가져올 정보)
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