import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  ArrowLeft, Calendar, BookOpen, CheckCircle2, 
  User, AlertCircle, Save, Check, ChevronRight, ChevronDown 
} from 'lucide-react';

// --- Types ---
interface Curriculum {
  id: number;
  grade_level: string;
  semester: string;
  chapter_name: string;
  display_order: number;
}

interface StudentEvaluationState {
  student_id: number;
  attendance_status: 'present' | 'absent' | 'late';
  homework_status: 'complete' | 'partial' | 'incomplete';
  understanding_score: number;
  attitude_score: number;
  comment: string;
  is_completed: boolean; 
}

interface Props {
  classInfo: any;
  onBack: () => void;
}

// 고등 과정 정렬 순서 정의
const HIGH_SCHOOL_ORDER = ['공통수학', '미적분I', '미적분II', '기하', '확통'];

export default function ClassEvaluation({ classInfo, onBack }: Props) {
  // --- Data State ---
  const [students, setStudents] = useState<any[]>([]);
  const [curriculumList, setCurriculumList] = useState<Curriculum[]>([]);
  
  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  
  // --- Toggle State ---
  const [expandedGrades, setExpandedGrades] = useState<string[]>([]);

  // --- Selection State ---
  const [selectedProgressIds, setSelectedProgressIds] = useState<number[]>([]);
  const [selectedReviewIds, setSelectedReviewIds] = useState<number[]>([]);
  const [evaluations, setEvaluations] = useState<Record<number, StudentEvaluationState>>({});

  // --- Initial Fetch ---
  useEffect(() => {
    fetchBasicData();
  }, [classInfo]);

  useEffect(() => {
    if (students.length > 0) {
      fetchDailyLog(reportDate);
    }
  }, [reportDate, students]);

  // 학년에 따른 필터링 목록 결정 함수
  const getTargetGrades = (targetGrade: string): string[] => {
    if (!targetGrade) return [];
    if (['고1', '고2', '고3'].includes(targetGrade)) {
      return HIGH_SCHOOL_ORDER;
    }
    return [targetGrade];
  };

  const fetchBasicData = async () => {
    setLoading(true);
    
    // 1. 학생 목록
    const { data: stuData } = await supabase
      .from('class_enrollments')
      .select('student:students(*)')
      .eq('class_id', classInfo.id);
    
    const studentList = stuData 
      ? stuData.map((d: any) => d.student).sort((a: any, b: any) => a.name.localeCompare(b.name)) 
      : [];
    setStudents(studentList);

    // 2. 커리큘럼 (필터링 적용)
    const targetGrades = getTargetGrades(classInfo.target_grade);
    
    let query = supabase
      .from('curriculum')
      .select('*');

    if (targetGrades.length > 0) {
      query = query.in('grade_level', targetGrades);
    }

    const { data: currData } = await query
      .order('grade_level')
      .order('display_order');
    
    if (currData) {
      setCurriculumList(currData);
      // 자동 펼침 로직
      if (targetGrades.length === 1) {
        setExpandedGrades(targetGrades);
      } else if (targetGrades.length > 1) {
        setExpandedGrades([targetGrades[0]]);
      }
    }
    
    // 초기 평가 상태 생성
    const initialEvals: Record<number, StudentEvaluationState> = {};
    studentList.forEach((s: any) => {
      initialEvals[s.id] = createEmptyEvaluation(s.id);
    });
    setEvaluations(initialEvals);

    setLoading(false);
  };

  const createEmptyEvaluation = (studentId: number): StudentEvaluationState => ({
    student_id: studentId,
    attendance_status: 'present',
    homework_status: 'complete',
    understanding_score: 3,
    attitude_score: 3,
    comment: '',
    is_completed: false
  });

  const fetchDailyLog = async (date: string) => {
    setLoading(true);
    try {
      const { data: logData } = await supabase
        .from('class_logs')
        .select('*')
        .eq('class_id', classInfo.id)
        .eq('class_date', date)
        .maybeSingle();

      if (logData) {
        setSelectedProgressIds(logData.progress_curriculum_ids || []);
        setSelectedReviewIds(logData.review_curriculum_ids || []);

        const { data: evalData } = await supabase
          .from('student_evaluations')
          .select('*')
          .eq('class_log_id', logData.id);

        if (evalData) {
          const loadedEvals = { ...evaluations };
          evalData.forEach((e: any) => {
            loadedEvals[e.student_id] = { ...e, is_completed: true };
          });
          setEvaluations(loadedEvals);
        }
      } else {
        setSelectedProgressIds([]);
        setSelectedReviewIds([]);
        const resetEvals: Record<number, StudentEvaluationState> = {};
        students.forEach(s => resetEvals[s.id] = createEmptyEvaluation(s.id));
        setEvaluations(resetEvals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Computed Data ---
  const groupedCurriculum = useMemo(() => {
    const groups: Record<string, Curriculum[]> = {};
    curriculumList.forEach(curr => {
      if (!groups[curr.grade_level]) groups[curr.grade_level] = [];
      groups[curr.grade_level].push(curr);
    });
    return groups;
  }, [curriculumList]);

  const sortedGrades = useMemo(() => {
    const keys = Object.keys(groupedCurriculum);
    if (['고1', '고2', '고3'].includes(classInfo.target_grade)) {
      return keys.sort((a, b) => {
        const idxA = HIGH_SCHOOL_ORDER.indexOf(a);
        const idxB = HIGH_SCHOOL_ORDER.indexOf(b);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
    return keys.sort();
  }, [groupedCurriculum, classInfo.target_grade]);

  // --- Handlers ---
  const toggleGrade = (grade: string) => {
    setExpandedGrades(prev => 
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const toggleCurriculum = (id: number, type: 'progress' | 'review') => {
    if (type === 'progress') {
      setSelectedProgressIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelectedReviewIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  const updateEvaluation = (field: keyof StudentEvaluationState, value: any) => {
    if (!selectedStudentId) return;
    setEvaluations(prev => ({
      ...prev,
      [selectedStudentId]: { ...prev[selectedStudentId], [field]: value }
    }));
  };

  // [평가 완료 및 다음 학생] 버튼 핸들러
  const completeCurrentStudent = () => {
    if (!selectedStudentId) return;
    setEvaluations(prev => ({
      ...prev,
      [selectedStudentId]: { ...prev[selectedStudentId], is_completed: true }
    }));

    const currentIndex = students.findIndex(s => s.id === selectedStudentId);
    if (currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
    } else {
      alert(`${students[currentIndex].name} 학생 평가가 완료되었습니다.\n모든 학생 평가 후 상단의 [전체 저장] 버튼을 눌러주세요.`);
      setSelectedStudentId(null);
    }
  };

  const handleSaveAllToDB = async () => {
    const uncompleted = students.filter(s => !evaluations[s.id].is_completed);
    if (uncompleted.length > 0) {
      if (!confirm(`${uncompleted.length}명의 평가가 미완료 상태입니다.\n미완료 학생은 '결석' 처리하고 저장하시겠습니까?`)) {
        return;
      }
      const updatedEvals = { ...evaluations };
      uncompleted.forEach(s => {
        updatedEvals[s.id] = {
          ...updatedEvals[s.id],
          attendance_status: 'absent',
          comment: '미입력 자동 결석 처리',
          is_completed: true
        };
      });
      setEvaluations(updatedEvals);
    }

    try {
      setLoading(true);
      const { data: logData, error: logError } = await supabase
        .from('class_logs')
        .upsert({
          class_id: classInfo.id,
          class_date: reportDate,
          progress_curriculum_ids: selectedProgressIds,
          review_curriculum_ids: selectedReviewIds
        }, { onConflict: 'class_id, class_date' })
        .select()
        .single();

      if (logError) throw logError;

      const evalPayload = students.map(s => {
        const e = evaluations[s.id];
        return {
          class_log_id: logData.id,
          student_id: s.id,
          attendance_status: e.attendance_status,
          homework_status: e.homework_status,
          understanding_score: e.understanding_score,
          attitude_score: e.attitude_score,
          comment: e.comment
        };
      });

      const { error: evalError } = await supabase
        .from('student_evaluations')
        .upsert(evalPayload, { onConflict: 'class_log_id, student_id' });

      if (evalError) throw evalError;

      alert('모든 평가 데이터가 저장되었습니다!');
      onBack();
      
    } catch (err: any) {
      alert('저장 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCurriculumSection = (type: 'progress' | 'review') => (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2 px-1">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {type === 'progress' ? '오늘의 진도 (Progress)' : '복습 단원 (Review)'}
        </label>
        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          {type === 'progress' ? selectedProgressIds.length : selectedReviewIds.length}개 선택됨
        </span>
      </div>
      <div className="space-y-1">
        {sortedGrades.map(grade => {
          const isExpanded = expandedGrades.includes(grade);
          return (
            <div key={grade} className="border border-gray-100 rounded-lg overflow-hidden bg-white">
              <button 
                onClick={() => toggleGrade(grade)}
                className="w-full flex items-center justify-between p-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
                  <span>{grade}</span>
                </div>
              </button>
              {isExpanded && (
                <div className="bg-gray-50/50 p-2 space-y-1 animate-fade-in border-t border-gray-50">
                  {groupedCurriculum[grade].map(curr => {
                    const selectedList = type === 'progress' ? selectedProgressIds : selectedReviewIds;
                    const isChecked = selectedList.includes(curr.id);
                    return (
                      <label 
                        key={`${type}-${curr.id}`} 
                        className={`flex items-start gap-2 p-2 rounded-md cursor-pointer text-sm transition-all ${
                          isChecked 
                          ? 'bg-indigo-100 text-indigo-900 font-bold' 
                          : 'hover:bg-white text-gray-600'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => toggleCurriculum(curr.id, type)} 
                          className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="leading-tight">{curr.chapter_name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {sortedGrades.length === 0 && (
          <div className="text-xs text-gray-400 p-2 text-center border border-dashed rounded-lg">
            해당 학년의 커리큘럼 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );

  const currentEval = selectedStudentId ? evaluations[selectedStudentId] : null;

  return (
    // ★ [수정됨] 화면 전체 높이에서 Header 공간(약 6rem)을 뺀 만큼 높이 고정
    // overflow-hidden을 주어 내부 스크롤을 활성화함
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-gray-50 -m-4 p-4 md:-m-8 md:p-6 overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-1 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white rounded-full border shadow-sm hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{classInfo.name} 수업 평가</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
               <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">{classInfo.target_grade}</span>
               <span>{students.length}명 수강 중</span>
            </div>
          </div>
        </div>
        <button 
          onClick={handleSaveAllToDB}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
        >
          <Save size={18} /> 전체 저장 (DB)
        </button>
      </div>

      {/* Main Layout (3-Column) */}
      <div className="flex-1 flex gap-4 min-h-0">
        
        {/* [1] Left: Class Context */}
        <div className="w-1/4 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 bg-gray-50 border-b shrink-0">
            <h3 className="font-bold flex items-center gap-2 text-gray-700"><Calendar size={18}/> 수업 설정</h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">수업 일자</label>
              <input 
                type="date" 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full p-2 bg-gray-50 border rounded-lg font-bold text-gray-700 outline-none"
              />
            </div>
            <hr className="border-gray-100"/>
            {renderCurriculumSection('progress')}
            <hr className="border-gray-100"/>
            {renderCurriculumSection('review')}
          </div>
        </div>

        {/* [2] Center: Student List */}
        <div className="w-1/4 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
           <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
            <h3 className="font-bold flex items-center gap-2 text-gray-700"><User size={18}/> 학생 명단</h3>
            <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-md">
              {Object.values(evaluations).filter(e => e.is_completed).length} / {students.length}
            </span>
          </div>
          <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
            {students.map(student => {
              const isSelected = selectedStudentId === student.id;
              const isCompleted = evaluations[student.id]?.is_completed;
              return (
                <div 
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between
                    ${isSelected 
                      ? 'bg-indigo-600 text-white shadow-md border-indigo-600 ring-2 ring-indigo-200' 
                      : 'bg-white hover:bg-gray-50 border-gray-100'
                    }
                  `}
                >
                  <div>
                    <div className={`font-bold ${isSelected ? 'text-white' : 'text-gray-800'}`}>{student.name}</div>
                    <div className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>{student.school_name}</div>
                  </div>
                  {isCompleted ? (
                    <CheckCircle2 size={20} className={isSelected ? 'text-indigo-200' : 'text-green-500'} />
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'border-indigo-300' : 'border-gray-200'}`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* [3] Right: Evaluation Form */}
        <div className="w-1/2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          {!selectedStudentId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <BookOpen size={48} className="mb-4 text-gray-200" />
              <p className="font-medium">좌측 목록에서 학생을 선택해주세요.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-fade-in">
               {/* Toolbar (Fixed) */}
               <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                 <div>
                   <span className="text-xs font-bold text-gray-400 uppercase">Evaluating</span>
                   <h2 className="text-2xl font-bold text-gray-800 leading-tight">{students.find(s => s.id === selectedStudentId)?.name}</h2>
                 </div>
                 <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                    {[
                      { v: 'present', l: '출석', c: 'text-green-600 bg-green-50 ring-1 ring-green-200' },
                      { v: 'late', l: '지각', c: 'text-yellow-600 bg-yellow-50 ring-1 ring-yellow-200' },
                      { v: 'absent', l: '결석', c: 'text-red-600 bg-red-50 ring-1 ring-red-200' }
                    ].map(opt => (
                      <button 
                        key={opt.v}
                        onClick={() => updateEvaluation('attendance_status', opt.v)}
                        className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                          currentEval?.attendance_status === opt.v ? opt.c : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
               </div>

               {/* Scrollable Form Content (Flex-1) */}
               {/* ★ [핵심] 여기에 overflow-y-auto를 주어 내부 컨텐츠만 스크롤되게 함 */}
               <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                 {currentEval?.attendance_status === 'absent' ? (
                   <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center animate-fade-in">
                     <AlertCircle className="mx-auto text-red-400 mb-2" size={32}/>
                     <h3 className="font-bold text-red-700 mb-4">결석한 학생입니다.</h3>
                     <textarea 
                        className="w-full border p-4 rounded-xl text-sm focus:ring-2 focus:ring-red-200 outline-none" 
                        rows={3}
                        placeholder="결석 사유를 입력하세요 (예: 병결, 가족 행사)"
                        value={currentEval.comment}
                        onChange={(e) => updateEvaluation('comment', e.target.value)}
                      />
                   </div>
                 ) : (
                   <>
                     {/* Score Sliders */}
                     <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <div className="flex justify-between items-end">
                           <label className="font-bold text-gray-700">이해도</label>
                           <span className="text-2xl font-bold text-indigo-600">{currentEval?.understanding_score}</span>
                         </div>
                         <input 
                            type="range" min="1" max="5" 
                            value={currentEval?.understanding_score}
                            onChange={(e) => updateEvaluation('understanding_score', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                         <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
                            <span>부족함</span><span>탁월함</span>
                          </div>
                       </div>
                       <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <div className="flex justify-between items-end">
                           <label className="font-bold text-gray-700">태도/집중</label>
                           <span className="text-2xl font-bold text-indigo-600">{currentEval?.attitude_score}</span>
                         </div>
                         <input 
                            type="range" min="1" max="5" 
                            value={currentEval?.attitude_score}
                            onChange={(e) => updateEvaluation('attitude_score', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                         <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
                            <span>산만함</span><span>집중함</span>
                          </div>
                       </div>
                     </div>

                     {/* Homework Check */}
                     <div className="space-y-3">
                        <label className="font-bold text-gray-700 block">과제 수행 여부</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {v: 'complete', l: '완료', d: '모두 해옴'}, 
                            {v: 'partial', l: '부분 완료', d: '일부 누락'}, 
                            {v: 'incomplete', l: '미완료', d: '안 해옴'}
                          ].map(opt => (
                            <button 
                              key={opt.v}
                              onClick={() => updateEvaluation('homework_status', opt.v)}
                              className={`py-3 px-2 rounded-xl border text-left transition-all group ${
                                currentEval?.homework_status === opt.v 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                : 'bg-white hover:bg-gray-50 text-gray-600'
                              }`}
                            >
                              <div className="text-sm font-bold">{opt.l}</div>
                              <div className={`text-xs ${currentEval?.homework_status === opt.v ? 'text-indigo-200' : 'text-gray-400'}`}>{opt.d}</div>
                            </button>
                          ))}
                        </div>
                     </div>

                     {/* Comment */}
                     <div className="space-y-2">
                        <label className="font-bold text-gray-700 block">선생님 코멘트</label>
                        <textarea 
                          className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
                          rows={3}
                          placeholder="학생의 오늘 수업 태도나 특이사항을 적어주세요."
                          value={currentEval?.comment}
                          onChange={(e) => updateEvaluation('comment', e.target.value)}
                        />
                     </div>
                     {/* Bottom Spacer for safe scrolling */}
                     <div className="h-4"></div>
                   </>
                 )}
               </div>

               {/* Footer Action (Fixed Bottom) */}
               <div className="p-4 border-t bg-white flex justify-end shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10 shrink-0">
                 <button 
                   onClick={completeCurrentStudent}
                   className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl transform active:scale-95"
                 >
                   <Check size={20}/>
                   {evaluations[selectedStudentId!]?.is_completed ? '수정 완료 (다음)' : '평가 완료 및 다음 학생'}
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}