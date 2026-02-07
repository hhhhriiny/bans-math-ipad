import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  ArrowLeft, Calendar, BookOpen, CheckCircle2, 
  User, AlertCircle, Save, Check, X,
  Wand2, Copy, Sparkles, PenTool, Plus, GraduationCap
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
  attitude_tags: string[];
  report_message: string;
  is_completed: boolean; 
}

interface ExamInfo {
  active: boolean;
  type: 'daily' | 'weekly' | 'monthly' | 'mock';
  name: string; // 모의고사 이름 등
  range_ids: number[]; // 시험 범위 커리큘럼 ID
}

interface Props {
  classInfo: any;
  onBack: () => void;
}

const HIGH_SCHOOL_ORDER = ['공통수학1', '공통수학2', '대수', '미적분I', '확률과통계', '미적분II', '기하']; // 교육과정에 맞게 수정 가능
const ATTITUDE_TAGS = ['집중력 최고🔥', '질문왕🙋‍♂️', '숙제 퍼펙트💯', '노트필기 깔끔✍️', '적극적 참여🙌', '오답노트 완료📓', '계산실수 줄임📉', '조금 피곤해함💤'];
const HOMEWORK_OPTS = [
    {v: 'complete', l: '완료', d: '모두 해옴'}, 
    {v: 'partial', l: '부분 완료', d: '일부 누락'}, 
    {v: 'incomplete', l: '미완료', d: '안 해옴'}
];

export default function ClassEvaluation({ classInfo, onBack }: Props) {
  // --- Data State ---
  const [students, setStudents] = useState<any[]>([]);
  const [curriculumList, setCurriculumList] = useState<Curriculum[]>([]);
  
  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  
  // AI Prompt State
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [showPromptArea, setShowPromptArea] = useState(false);
  
  // --- Class Context State ---
  // 1. Progress (진도)
  const [progressGrade, setProgressGrade] = useState<string>(classInfo.target_grade); // 선택된 학년 탭
  const [selectedProgressIds, setSelectedProgressIds] = useState<number[]>([]);
  const [topicDetail, setTopicDetail] = useState(''); // [New] 세부 내용 직접 입력

  // 2. Review (복습)
  const [reviewGrade, setReviewGrade] = useState<string>(classInfo.target_grade);
  const [selectedReviewIds, setSelectedReviewIds] = useState<number[]>([]);

  // 3. Exam (시험) [New]
  const [examInfo, setExamInfo] = useState<ExamInfo>({ active: false, type: 'daily', name: '', range_ids: [] });
  const [examGrade, setExamGrade] = useState<string>(classInfo.target_grade);

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

  const fetchBasicData = async () => {
    setLoading(true);
    try {
      // 1. 학생 목록
      const { data: stuData } = await supabase
        .from('class_enrollments')
        .select('student:students(*)')
        .eq('class_id', classInfo.id);
      
      const studentList = stuData 
        ? stuData.map((d: any) => d.student).sort((a: any, b: any) => a.name.localeCompare(b.name)) 
        : [];
      setStudents(studentList);

      // 2. 전체 커리큘럼 가져오기 (자유로운 선택을 위해 전체 로드)
      const { data: currData } = await supabase
        .from('curriculum')
        .select('*')
        .order('grade_level')
        .order('display_order');
      
      if (currData) {
        setCurriculumList(currData);
      }
      
      // 초기 평가 상태 생성
      const initialEvals: Record<number, StudentEvaluationState> = {};
      studentList.forEach((s: any) => initialEvals[s.id] = createEmptyEvaluation(s.id));
      setEvaluations(initialEvals);

    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const createEmptyEvaluation = (studentId: number): StudentEvaluationState => ({
    student_id: studentId,
    attendance_status: 'present',
    homework_status: 'complete',
    understanding_score: 3,
    attitude_score: 3,
    comment: '',
    attitude_tags: [],
    report_message: '',
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
        setTopicDetail(logData.topic_detail || '');
        
        // 시험 정보 로드
        if (logData.exam_info) {
             // JSON 파싱 (타입 안전성 확보)
             const info = typeof logData.exam_info === 'string' ? JSON.parse(logData.exam_info) : logData.exam_info;
             setExamInfo({
                 active: true,
                 type: info.type || 'daily',
                 name: info.name || '',
                 range_ids: info.range_ids || []
             });
        } else {
            setExamInfo({ active: false, type: 'daily', name: '', range_ids: [] });
        }

        const { data: evalData } = await supabase
          .from('student_evaluations')
          .select('*')
          .eq('class_log_id', logData.id);

        if (evalData) {
          const loadedEvals = { ...evaluations };
          students.forEach(s => {
             const found = evalData.find((e:any) => e.student_id === s.id);
             if (found) {
                loadedEvals[s.id] = { 
                    ...found, 
                    attitude_tags: found.attitude_tags || [],
                    report_message: found.report_message || '',
                    is_completed: true 
                };
             }
          });
          setEvaluations(loadedEvals);
        }
      } else {
        // Reset
        setSelectedProgressIds([]);
        setSelectedReviewIds([]);
        setTopicDetail('');
        setExamInfo({ active: false, type: 'daily', name: '', range_ids: [] });
        const resetEvals: Record<number, StudentEvaluationState> = {};
        students.forEach(s => resetEvals[s.id] = createEmptyEvaluation(s.id));
        setEvaluations(resetEvals);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- Helpers ---
  // 학년 목록 (중복제거 및 정렬)
  const availableGrades = useMemo(() => {
    const grades = Array.from(new Set(curriculumList.map(c => c.grade_level)));
    // 현재 학년을 맨 앞으로, 나머지는 순서대로
    const target = classInfo.target_grade;
    return [target, ...grades.filter(g => g !== target).sort()];
  }, [curriculumList, classInfo.target_grade]);

  const getChaptersByGrade = (grade: string) => {
    return curriculumList.filter(c => c.grade_level === grade);
  };

  const getCurriculumName = (id: number) => curriculumList.find(c => c.id === id)?.chapter_name || '';

  // --- Handlers ---
  const toggleSelection = (id: number, type: 'progress' | 'review' | 'exam') => {
    if (type === 'progress') {
        setSelectedProgressIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else if (type === 'review') {
        setSelectedReviewIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
        setExamInfo(prev => ({
            ...prev,
            range_ids: prev.range_ids.includes(id) ? prev.range_ids.filter(x => x !== id) : [...prev.range_ids, id]
        }));
    }
  };

  const updateEvaluation = (field: keyof StudentEvaluationState, value: any) => {
    if (!selectedStudentId) return;
    setEvaluations(prev => ({
      ...prev,
      [selectedStudentId]: { ...prev[selectedStudentId], [field]: value }
    }));
  };

  const toggleAttitudeTag = (tag: string) => {
    if (!selectedStudentId) return;
    const currentTags = evaluations[selectedStudentId].attitude_tags || [];
    const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
    updateEvaluation('attitude_tags', newTags);
  };

  // ★ AI Prompt Generator (Polishing Persona)
  const generateAIPrompt = () => {
    if (!selectedStudentId) return;
    const currentStudent = students.find(s => s.id === selectedStudentId);
    const ev = evaluations[selectedStudentId];

    // Data Summary
    const progressNames = selectedProgressIds.map(getCurriculumName).join(', ');
    const examRangeNames = examInfo.active ? examInfo.range_ids.map(getCurriculumName).join(', ') : '';
    const examText = examInfo.active 
        ? `[시험 진행] 종류: ${examInfo.type === 'mock' ? `모의고사(${examInfo.name})` : examInfo.type}, 범위: ${examRangeNames || '전범위'}` 
        : '';
    
    const moodMap: Record<number, string> = { 5: '최상', 4: '좋음', 3: '보통', 2: '조금 지침', 1: '나쁨' };
    const hwMap: Record<string, string> = { 'complete': '완벽함', 'partial': '일부 부족', 'incomplete': '미이행' };

    const prompt = `
[역할]
당신은 수학 학원의 친절하고 전문적인 선생님입니다. 학부모님께 보낼 "수업 리포트"를 작성하려 합니다.
아래 **[입력 데이터]**를 바탕으로, 학부모님이 읽기 편하고 기분 좋게 받아들일 수 있도록 **문장을 매끄럽게 다듬어주세요.** (없는 내용을 지어내지 마세요.)

[입력 데이터]
- 날짜: ${reportDate}
- 학생: ${currentStudent?.name}
- 수업 주제: ${progressNames} ${topicDetail ? `(상세: ${topicDetail})` : ''}
- ${examText ? examText : '시험 없음 (진도 위주 수업)'}
- 이해도: ${ev.understanding_score}/5 (${moodMap[ev.understanding_score]})
- 과제: ${hwMap[ev.homework_status]}
- 태도 키워드: ${(ev.attitude_tags || []).join(', ')}
- 선생님 메모: "${ev.comment || ''}"

[작성 가이드]
1. 말투: 정중하고 따뜻한 "해요체" (예: 했습니다 -> 했어요).
2. 구조:
   - 첫 문단: 오늘 배운 내용(및 시험)과 아이의 성취/이해도 언급.
   - 두 번째 문단: 수업 태도와 과제 수행에 대한 구체적 칭찬 또는 격려.
   - 선생님 메모가 있다면 자연스럽게 녹여낼 것.
3. 주의: "AI가 작성한 느낌"이 나지 않도록 양산형으로 만들지 말것. 이모지는 2~3개만 적절히 사용.
`.trim();

    setGeneratedPrompt(prompt);
    setShowPromptArea(true);
  };

  const handleSaveAllToDB = async () => {
    // ... (저장 로직 기존과 동일하되 exam_info, topic_detail 추가)
    try {
      setLoading(true);
      const { data: logData, error: logError } = await supabase
        .from('class_logs')
        .upsert({
          class_id: classInfo.id,
          class_date: reportDate,
          progress_curriculum_ids: selectedProgressIds,
          review_curriculum_ids: selectedReviewIds,
          topic_detail: topicDetail, // [New]
          exam_info: examInfo.active ? examInfo : null // [New]
        }, { onConflict: 'class_id, class_date' })
        .select()
        .single();

      if (logError) throw logError;

      const evalPayload = students.map(s => ({
          class_log_id: logData.id,
          student_id: s.id,
          attendance_status: evaluations[s.id].attendance_status,
          homework_status: evaluations[s.id].homework_status,
          understanding_score: evaluations[s.id].understanding_score,
          attitude_score: evaluations[s.id].attitude_score,
          comment: evaluations[s.id].comment,
          attitude_tags: evaluations[s.id].attitude_tags,
          report_message: evaluations[s.id].report_message
      }));

      const { error: evalError } = await supabase
        .from('student_evaluations')
        .upsert(evalPayload, { onConflict: 'class_log_id, student_id' });

      if (evalError) throw evalError;

      alert('저장 완료되었습니다!');
      onBack();
    } catch (err: any) { alert('저장 실패: ' + err.message); } finally { setLoading(false); }
  };

  // --- Sub Components ---
  // 재사용 가능한 커리큘럼 선택기 (학년 드롭다운 + 리스트)
  const CurriculumSelector = ({ 
    type, currentGrade, setGrade, selectedIds, toggle 
  }: { 
    type: 'progress'|'review'|'exam', currentGrade: string, setGrade: (g:string)=>void, selectedIds: number[], toggle: (id:number, t:any)=>void 
  }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* 1. Header & Grade Dropdown */}
        <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {type === 'progress' ? '진도 선택' : type === 'review' ? '복습 선택' : '시험 범위'}
            </span>
            <select 
                value={currentGrade} 
                onChange={(e) => setGrade(e.target.value)}
                className="text-xs font-bold bg-white border border-gray-300 rounded-lg px-2 py-1 outline-none focus:border-indigo-500"
            >
                {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
        </div>
        
        {/* 2. Chapter List (Scrollable) */}
        <div className="h-40 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {getChaptersByGrade(currentGrade).map(curr => {
                const isChecked = selectedIds.includes(curr.id);
                return (
                    <label key={curr.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-all ${isChecked ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggle(curr.id, type)} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                        <span className="truncate">{curr.chapter_name}</span>
                    </label>
                )
            })}
            {getChaptersByGrade(currentGrade).length === 0 && <div className="text-xs text-gray-400 text-center py-4">해당 학년 데이터 없음</div>}
        </div>
        
        {/* 3. Selected Tags Summary */}
        {selectedIds.length > 0 && (
            <div className="p-2 border-t bg-gray-50/50 flex flex-wrap gap-1">
                {selectedIds.map(id => (
                    <span key={id} onClick={() => toggle(id, type)} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded cursor-pointer hover:bg-red-100 hover:text-red-600 transition-colors">
                        {getCurriculumName(id)} <X size={10}/>
                    </span>
                ))}
            </div>
        )}
    </div>
  );

  const currentEval = selectedStudentId ? evaluations[selectedStudentId] : null;

  return (
    <div className="flex flex-col h-[85vh] bg-gray-50 -m-6 p-6">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white rounded-full border shadow-sm hover:bg-gray-50"><ArrowLeft size={20} /></button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{classInfo.name} 평가</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
               <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">{classInfo.target_grade}</span>
               <span>{students.length}명 수강</span>
            </div>
          </div>
        </div>
        <button onClick={handleSaveAllToDB} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg"><Save size={18} /> 전체 저장</button>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        
        {/* [Left] Class Context - Tab & Scroll UI */}
        <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 bg-gray-50 border-b shrink-0 flex justify-between items-center">
             <h3 className="font-bold flex items-center gap-2 text-gray-700"><Calendar size={18}/> 수업 설정</h3>
             <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="text-sm bg-white border border-gray-300 rounded px-2 py-1 font-bold text-gray-700" />
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
            {/* 1. Progress Section */}
            <section>
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={16} className="text-indigo-600"/>
                    <h4 className="font-bold text-gray-800 text-sm">진도 학습</h4>
                </div>
                <div className="space-y-3">
                    <CurriculumSelector type="progress" currentGrade={progressGrade} setGrade={setProgressGrade} selectedIds={selectedProgressIds} toggle={toggleSelection} />
                    <input 
                        type="text" 
                        placeholder="예: 인수정리를 이용한 심화 문제 풀이 (상세 내용)" 
                        value={topicDetail}
                        onChange={(e) => setTopicDetail(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                </div>
            </section>

            <hr className="border-gray-100"/>

            {/* 2. Review Section */}
            <section>
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-green-600"/>
                    <h4 className="font-bold text-gray-800 text-sm">복습</h4>
                </div>
                <CurriculumSelector type="review" currentGrade={reviewGrade} setGrade={setReviewGrade} selectedIds={selectedReviewIds} toggle={toggleSelection} />
            </section>

            <hr className="border-gray-100"/>

            {/* 3. Exam Section (Toggleable) */}
            <section>
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExamInfo(prev => ({...prev, active: !prev.active}))}>
                    <div className="flex items-center gap-2">
                        <GraduationCap size={16} className={examInfo.active ? "text-red-500" : "text-gray-400"}/>
                        <h4 className={`font-bold text-sm ${examInfo.active ? "text-gray-800" : "text-gray-400"}`}>시험/테스트</h4>
                    </div>
                    <div className={`w-10 h-5 rounded-full p-1 transition-colors ${examInfo.active ? 'bg-red-500' : 'bg-gray-200'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${examInfo.active ? 'translate-x-5' : ''}`}></div>
                    </div>
                </div>

                {examInfo.active && (
                    <div className="space-y-3 animate-fade-in bg-red-50/50 p-3 rounded-xl border border-red-100">
                        <div className="grid grid-cols-2 gap-2">
                            <select 
                                value={examInfo.type}
                                onChange={(e) => setExamInfo({...examInfo, type: e.target.value as any})}
                                className="text-xs font-bold border rounded p-2"
                            >
                                <option value="daily">일일 테스트</option>
                                <option value="weekly">주간 테스트</option>
                                <option value="monthly">월말 평가</option>
                                <option value="mock">모의고사</option>
                            </select>
                            {examInfo.type === 'mock' && (
                                <input 
                                    type="text" placeholder="시험명 (예: 3월 학평)" 
                                    value={examInfo.name} 
                                    onChange={(e) => setExamInfo({...examInfo, name: e.target.value})}
                                    className="text-xs border rounded p-2"
                                />
                            )}
                        </div>
                        <CurriculumSelector type="exam" currentGrade={examGrade} setGrade={setExamGrade} selectedIds={examInfo.range_ids} toggle={toggleSelection} />
                    </div>
                )}
            </section>
          </div>
        </div>

        {/* [Center] Student List */}
        <div className="w-1/4 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
           <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
            <h3 className="font-bold flex items-center gap-2 text-gray-700"><User size={18}/> 학생 명단</h3>
            <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-md">{Object.values(evaluations).filter(e => e.is_completed).length} / {students.length}</span>
          </div>
          <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
            {students.map(student => {
              const isSelected = selectedStudentId === student.id;
              const isCompleted = evaluations[student.id]?.is_completed;
              return (
                <div key={student.id} onClick={() => setSelectedStudentId(student.id)} className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${isSelected ? 'bg-indigo-600 text-white shadow-md border-indigo-600' : 'bg-white hover:bg-gray-50 border-gray-100'}`}>
                  <div><div className={`font-bold ${isSelected ? 'text-white' : 'text-gray-800'}`}>{student.name}</div></div>
                  {isCompleted ? <CheckCircle2 size={20} className={isSelected ? 'text-indigo-200' : 'text-green-500'} /> : <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'border-indigo-300' : 'border-gray-200'}`}></div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* [Right] Evaluation Form */}
        <div className="w-5/12 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          {!selectedStudentId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
              <BookOpen size={48} className="mb-4 text-gray-200" />
              <p className="font-medium">좌측 목록에서 학생을 선택해주세요.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-fade-in">
               <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                 <h2 className="text-2xl font-bold text-gray-800">{students.find(s => s.id === selectedStudentId)?.name}</h2>
                 <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                    {[{ v: 'present', l: '출석', c: 'text-green-600 bg-green-50' }, { v: 'late', l: '지각', c: 'text-yellow-600 bg-yellow-50' }, { v: 'absent', l: '결석', c: 'text-red-600 bg-red-50' }].map(opt => (
                      <button key={opt.v} onClick={() => updateEvaluation('attendance_status', opt.v)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${currentEval?.attendance_status === opt.v ? opt.c : 'text-gray-400 hover:text-gray-600'}`}>{opt.l}</button>
                    ))}
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                 {currentEval?.attendance_status === 'absent' ? (
                   <div className="bg-red-50 p-6 rounded-xl border border-red-100 text-center"><AlertCircle className="mx-auto text-red-400 mb-2" size={32}/><h3 className="font-bold text-red-700 mb-4">결석한 학생입니다.</h3><textarea className="w-full border p-4 rounded-xl text-sm" rows={3} placeholder="사유 입력" value={currentEval.comment} onChange={(e) => updateEvaluation('comment', e.target.value)}/></div>
                 ) : (
                   <>
                     {/* Scores */}
                     <div className="grid grid-cols-2 gap-4">
                       <div className="bg-gray-50 p-3 rounded-xl border">
                         <div className="flex justify-between items-end mb-2"><label className="text-xs font-bold text-gray-700">이해도</label><span className="text-xl font-bold text-indigo-600">{currentEval?.understanding_score}</span></div>
                         <input type="range" min="1" max="5" value={currentEval?.understanding_score} onChange={(e) => updateEvaluation('understanding_score', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                       </div>
                       <div className="bg-gray-50 p-3 rounded-xl border">
                         <div className="flex justify-between items-end mb-2"><label className="text-xs font-bold text-gray-700">태도</label><span className="text-xl font-bold text-indigo-600">{currentEval?.attitude_score}</span></div>
                         <input type="range" min="1" max="5" value={currentEval?.attitude_score} onChange={(e) => updateEvaluation('attitude_score', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                       </div>
                     </div>

                     {/* Homework */}
                     <div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">과제 수행</label>
                        <div className="grid grid-cols-3 gap-2">
                          {HOMEWORK_OPTS.map(opt => (
                            <button key={opt.v} onClick={() => updateEvaluation('homework_status', opt.v)} className={`py-2 rounded-lg border font-bold text-xs ${currentEval?.homework_status === opt.v ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>{opt.l}</button>
                          ))}
                        </div>
                     </div>

                     {/* Tags & Comment */}
                     <div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">태도 태그</label>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {ATTITUDE_TAGS.map(tag => (
                                <button key={tag} onClick={() => toggleAttitudeTag(tag)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${currentEval?.attitude_tags.includes(tag) ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-500 border-gray-200'}`}>{tag}</button>
                            ))}
                        </div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">선생님 메모 (AI 참고용)</label>
                        <textarea className="w-full border p-3 rounded-xl text-sm mb-3 focus:ring-2 focus:ring-indigo-100 outline-none" rows={2} placeholder="학생의 특이사항이나 전달할 내용" value={currentEval?.comment} onChange={(e) => updateEvaluation('comment', e.target.value)}/>
                     </div>

                     {/* AI Polishing */}
                     <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-indigo-800 flex items-center gap-2 text-sm"><Sparkles size={14} className="text-purple-500"/> AI 매직 리포트</h3>
                            <button onClick={generateAIPrompt} className="bg-white text-indigo-600 border border-indigo-200 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-indigo-50 flex items-center gap-1"><Wand2 size={10}/> 프롬프트 생성</button>
                        </div>
                        {showPromptArea && (
                            <div className="space-y-3 animate-fade-in">
                                <div className="bg-white p-2 rounded-lg border border-indigo-100 relative group">
                                    <div className="text-[10px] text-gray-600 font-mono h-16 overflow-y-auto whitespace-pre-wrap leading-tight">{generatedPrompt}</div>
                                    <button onClick={() => {navigator.clipboard.writeText(generatedPrompt); alert('복사됨!');}} className="absolute top-1 right-1 bg-gray-800 text-white p-1 rounded opacity-70 hover:opacity-100"><Copy size={10}/></button>
                                </div>
                                <textarea className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" rows={4} placeholder="AI 결과를 여기에 붙여넣으세요..." value={currentEval?.report_message || ''} onChange={(e) => updateEvaluation('report_message', e.target.value)}/>
                            </div>
                        )}
                     </div>
                     <div className="h-4"></div>
                   </>
                 )}
               </div>

               <div className="p-4 border-t bg-white flex justify-end shrink-0">
                 <button onClick={() => {
                     // 다음 학생 자동 선택 로직
                     if (!selectedStudentId) return;
                     setEvaluations(prev => ({...prev, [selectedStudentId]: { ...prev[selectedStudentId], is_completed: true }}));
                     const idx = students.findIndex(s => s.id === selectedStudentId);
                     if (idx < students.length - 1) setSelectedStudentId(students[idx + 1].id);
                     else alert('평가가 완료되었습니다. [전체 저장]을 눌러주세요.');
                 }} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg text-sm">
                   <Check size={16}/> {evaluations[selectedStudentId!]?.is_completed ? '수정 완료' : '완료 및 다음'}
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}