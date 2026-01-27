import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout';
import { 
  FileText, Calendar, ChevronLeft, ChevronRight, 
  Send, Save, CheckCircle, X, PieChart 
} from 'lucide-react';

// --- Types ---
interface Student {
  id: number;
  name: string;
  school_name: string;
  grade: string;
}

interface ExamScore {
  id: number;
  exam_name: string;
  score: number;
  exam_date: string;
}

interface ReportStats {
  attendance_rate: number;
  homework_rate: number;
  avg_understanding: number;
  avg_attitude: number;
  covered_chapters: string[];
  review_chapters: string[];
  exams: ExamScore[];
  // 월간 전용 데이터
  prev_month_understanding?: number; 
  prev_month_attitude?: number;      
}

interface ReportData {
  id?: number; 
  student_id: number;
  type: 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  content: {
    general_comment: string;
    focus_points: string[];
  };
  status: 'draft' | 'sent';
}

export default function Report() {
  // --- UI State ---
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // --- Data State ---
  const [currentDate, setCurrentDate] = useState(new Date()); // 기준일
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);

  // --- ★ [수정됨] Date Helpers (Local Time 기준) ---
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getRange = (date: Date, type: 'weekly' | 'monthly') => {
    // 원본 날짜 복사 (Mutation 방지)
    const d = new Date(date);
    
    if (type === 'weekly') {
      const day = d.getDay(); // 0(일) ~ 6(토)
      // 월요일 계산 (일요일이면 -6, 그 외엔 1을 기준으로 보정)
      const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
      
      const monday = new Date(d);
      monday.setDate(diffToMon);
      monday.setHours(0, 0, 0, 0);

      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);
      saturday.setHours(23, 59, 59, 999);
      
      return {
        start: formatDate(monday),
        end: formatDate(saturday),
        label: `${monday.getMonth()+1}월 ${monday.getDate()}일 ~ ${saturday.getMonth()+1}월 ${saturday.getDate()}일`
      };
    } else {
      // 월간: 해당 월 1일 ~ 말일
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return {
        start: formatDate(firstDay),
        end: formatDate(lastDay),
        label: `${d.getFullYear()}년 ${d.getMonth()+1}월`
      };
    }
  };

  const { start, end, label } = getRange(currentDate, reportType);

  // --- Effects ---
  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchData(selectedStudent.id);
    }
  }, [selectedStudent, start, reportType]); 

  // --- Actions ---
  const moveDate = (dir: -1 | 1) => {
    const newDate = new Date(currentDate);
    if (reportType === 'weekly') {
      newDate.setDate(newDate.getDate() + (dir * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + dir);
    }
    setCurrentDate(newDate);
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').eq('status', 'enrolled').order('name');
    if (data) {
      setStudents(data);
      if (data.length > 0 && !selectedStudent) setSelectedStudent(data[0]);
    }
  };

  const fetchData = async (studentId: number) => {
    setLoading(true);
    setStats(null);
    setReport(null);

    try {
      // 1. 기존 레포트 조회
      let existingReport = null;
      if (reportType === 'weekly') {
        const { data } = await supabase
          .from('weekly_reports')
          .select('*')
          .eq('student_id', studentId)
          .eq('start_date', start)
          .maybeSingle();
        existingReport = data;
      } else {
        const { data } = await supabase
          .from('monthly_reports')
          .select('*')
          .eq('student_id', studentId)
          .eq('year', new Date(start).getFullYear())
          .eq('month', new Date(start).getMonth() + 1)
          .maybeSingle();
        existingReport = data;
      }

      // 2. 데이터 집계
      const { data: evaluations } = await supabase
        .from('student_evaluations')
        .select(`*, class_log:class_logs!inner(class_date, progress_curriculum_ids, review_curriculum_ids)`)
        .eq('student_id', studentId)
        .gte('class_log.class_date', start)
        .lte('class_log.class_date', end);

      const { data: exams } = await supabase
        .from('exam_scores')
        .select('*')
        .eq('student_id', studentId)
        .gte('exam_date', start)
        .lte('exam_date', end)
        .order('exam_date');

      // 3. 커리큘럼 이름 매핑
      let pNames: string[] = [];
      let rNames: string[] = [];
      
      if (evaluations && evaluations.length > 0) {
        const allIds = new Set<number>();
        evaluations.forEach((e: any) => {
          e.class_log.progress_curriculum_ids?.forEach((id: number) => allIds.add(id));
          e.class_log.review_curriculum_ids?.forEach((id: number) => allIds.add(id));
        });
        
        if (allIds.size > 0) {
          const { data: curr } = await supabase
            .from('curriculum')
            .select('id, chapter_name')
            .in('id', Array.from(allIds));
            
          if (curr) {
            const map = new Map(curr.map(c => [c.id, c.chapter_name]));
            evaluations.forEach((e: any) => {
              e.class_log.progress_curriculum_ids?.forEach((id: number) => { 
                const name = map.get(id);
                if(name) pNames.push(name); 
              });
              e.class_log.review_curriculum_ids?.forEach((id: number) => { 
                const name = map.get(id);
                if(name) rNames.push(name); 
              });
            });
          }
        }
      }
      
      pNames = [...new Set(pNames)];
      rNames = [...new Set(rNames)];

      // 4. 통계 계산
      const calculatedStats = calculateStats(evaluations || [], exams || [], pNames, rNames);

      // (월간) 지난달 데이터 비교
      if (reportType === 'monthly') {
        const prevD = new Date(new Date(start).setMonth(new Date(start).getMonth() - 1));
        const prevStart = formatDate(new Date(prevD.getFullYear(), prevD.getMonth(), 1));
        const prevEnd = formatDate(new Date(prevD.getFullYear(), prevD.getMonth() + 1, 0));
        
        const { data: prevEvals } = await supabase
           .from('student_evaluations')
           .select('understanding_score, attitude_score, class_log!inner(class_date)')
           .eq('student_id', studentId)
           .gte('class_log.class_date', prevStart)
           .lte('class_log.class_date', prevEnd);

        if (prevEvals && prevEvals.length > 0) {
           const sumU = prevEvals.reduce((a,c) => a + c.understanding_score, 0);
           const sumA = prevEvals.reduce((a,c) => a + c.attitude_score, 0);
           calculatedStats.prev_month_understanding = parseFloat((sumU / prevEvals.length).toFixed(1));
           calculatedStats.prev_month_attitude = parseFloat((sumA / prevEvals.length).toFixed(1));
        } else {
           calculatedStats.prev_month_understanding = 0;
           calculatedStats.prev_month_attitude = 0;
        }
      }

      setStats(calculatedStats);

      // 5. 레포트 상태 매핑
      if (existingReport) {
        setReport({
          id: existingReport.id,
          student_id: studentId, // [수정됨] 명시적으로 studentId 할당
          type: reportType,
          start_date: start,
          end_date: end,
          content: (existingReport.report_content as { general_comment: string; focus_points: string[] }) 
            || { general_comment: '', focus_points: [] },
          status: (existingReport.status as 'draft' | 'sent') || 'draft'
        });
      } else {
        const autoComment = generateAutoComment(calculatedStats, selectedStudent?.name || '', reportType);
        setReport({
          student_id: studentId, // [수정됨] 명시적으로 studentId 할당
          type: reportType,
          start_date: start,
          end_date: end,
          content: { general_comment: autoComment, focus_points: [] },
          status: 'draft'
        });
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (evals: any[], exams: any[], pNames: string[], rNames: string[]): ReportStats => {
    const total = evals.length;
    const attended = evals.filter((e:any) => ['present','late'].includes(e.attendance_status)).length;
    const homework = evals.filter((e:any) => e.homework_status === 'complete').length;
    const sumU = evals.reduce((a:number, c:any) => a + (c.understanding_score||0), 0);
    const sumA = evals.reduce((a:number, c:any) => a + (c.attitude_score||0), 0);

    return {
      attendance_rate: total ? Math.round((attended/total)*100) : 0,
      homework_rate: total ? Math.round((homework/total)*100) : 0,
      avg_understanding: total ? parseFloat((sumU/total).toFixed(1)) : 0,
      avg_attitude: total ? parseFloat((sumA/total).toFixed(1)) : 0,
      covered_chapters: pNames,
      review_chapters: rNames,
      exams
    };
  };

  const generateAutoComment = (stats: ReportStats, name: string, type: 'weekly'|'monthly') => {
    if (stats.avg_understanding === 0 && stats.exams.length === 0) return `${name} 학생의 해당 기간 학습 데이터가 부족합니다.`;
    
    const term = type === 'weekly' ? '이번 주' : '이번 달';
    let text = `${name} 학생은 ${term} 총 ${stats.attendance_rate}%의 출석률을 보였으며, `;
    
    if (stats.avg_understanding >= 4) text += `전반적으로 학습 내용을 우수하게 이해하고 있습니다. `;
    else if (stats.avg_understanding >= 3) text += `학습 내용을 성실하게 따라가고 있습니다. `;
    else text += `기초 개념에 대한 반복 학습이 조금 더 필요해 보입니다. `;

    if (type === 'monthly' && stats.prev_month_understanding) {
      const diff = stats.avg_understanding - stats.prev_month_understanding;
      if (diff > 0.5) text += `지난달에 비해 이해도가 눈에 띄게 향상되었습니다! `;
    }

    return text + `다음 ${type === 'weekly' ? '주' : '달'}에도 꾸준한 성장을 돕겠습니다.`;
  };

  const handleSave = async () => {
    if (!report || !stats) return;
    try {
      const payload = {
        student_id: report.student_id,
        report_content: report.content,
        status: report.status,
        attendance_rate: stats.attendance_rate,
        homework_avg: stats.homework_rate,
        teacher_comment: report.content.general_comment
      };

      if (reportType === 'weekly') {
        await supabase.from('weekly_reports').upsert({
          ...payload,
          id: report.id,
          start_date: report.start_date,
          end_date: report.end_date,
          title: `${report.start_date} 주간 리포트`
        }, { onConflict: 'student_id, start_date' });
      } else {
        await supabase.from('monthly_reports').upsert({
          ...payload,
          id: report.id,
          year: new Date(report.start_date).getFullYear(),
          month: new Date(report.start_date).getMonth() + 1,
          title: `${new Date(report.start_date).getMonth()+1}월 월간 리포트`
        }, { onConflict: 'student_id, year, month' as any });
      }
      alert('저장되었습니다.');
      fetchData(report.student_id);
    } catch (e: any) {
      alert('저장 실패: ' + e.message);
    }
  };

  // --- Render Components ---

  const BarChart = ({ label, current, prev }: { label: string, current: number, prev?: number }) => (
    <div className="mb-4">
      <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
        <span>{label}</span>
        {prev !== undefined && <span>Last Month: {prev} → This Month: {current}</span>}
      </div>
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex relative">
        {prev !== undefined && (
          <div className="absolute top-0 left-0 h-full bg-gray-300 opacity-50" style={{ width: `${(prev / 5) * 100}%` }}></div>
        )}
        <div 
          className={`h-full rounded-full transition-all duration-500 ${current >= 4 ? 'bg-indigo-500' : current >= 3 ? 'bg-green-500' : 'bg-yellow-500'}`} 
          style={{ width: `${(current / 5) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-100px)] -m-6 bg-gray-50">
        
        {/* Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col z-10 shadow-sm">
          <div className="p-6 border-b bg-white">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 mb-4">
              <FileText className="text-indigo-600"/> 레포트 관리
            </h2>
            
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
              <button 
                onClick={() => setReportType('weekly')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${reportType==='weekly'?'bg-white text-indigo-600 shadow-sm':'text-gray-500'}`}
              >
                주간 (Weekly)
              </button>
              <button 
                onClick={() => setReportType('monthly')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${reportType==='monthly'?'bg-white text-indigo-600 shadow-sm':'text-gray-500'}`}
              >
                월간 (Monthly)
              </button>
            </div>

            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
              <button onClick={() => moveDate(-1)} className="p-1 hover:bg-white rounded"><ChevronLeft size={18}/></button>
              <span className="text-sm font-bold text-gray-700">{label}</span>
              <button onClick={() => moveDate(1)} className="p-1 hover:bg-white rounded"><ChevronRight size={18}/></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {students.map(student => (
              <div 
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`p-3.5 rounded-xl cursor-pointer transition-all flex justify-between items-center ${selectedStudent?.id === student.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <div className="font-bold">{student.name}</div>
                {selectedStudent?.id === student.id && report?.id && <CheckCircle size={16} className="text-indigo-300"/>}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-gray-50/50">
          {!selectedStudent || !stats ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
               <p>데이터 분석 중...</p>
             </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in-up">
              {/* Header */}
              <div className={`p-8 text-white relative overflow-hidden ${reportType==='weekly' ? 'bg-gradient-to-r from-indigo-700 to-indigo-600' : 'bg-gradient-to-r from-purple-700 to-purple-600'}`}>
                 <div className="relative z-10 flex justify-between items-start">
                   <div>
                     <h3 className="text-white/80 font-bold uppercase tracking-widest text-xs mb-2">{reportType} REPORT</h3>
                     <h1 className="text-3xl font-extrabold mb-1">{selectedStudent.name} 학생 {reportType === 'weekly' ? '주간' : '월간'} 분석</h1>
                     <p className="text-white/90 text-sm flex items-center gap-2"><Calendar size={14}/> {label}</p>
                   </div>
                   <div className="bg-white/10 p-3 rounded-xl text-center backdrop-blur-md border border-white/10">
                     <div className="text-[10px] text-white/80 font-bold uppercase mb-1">Total Score</div>
                     <div className="text-3xl font-extrabold tracking-tight">{((stats.avg_understanding + stats.avg_attitude)*10).toFixed(0)}</div>
                   </div>
                 </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Editor */}
                <section>
                  <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><FileText size={20} className="text-gray-500"/> 종합 평가</h4>
                  <textarea 
                    className="w-full p-5 bg-yellow-50/50 border border-yellow-100 rounded-xl text-gray-700 leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    rows={5}
                    value={report?.content.general_comment}
                    onChange={(e) => setReport(prev => prev ? {...prev, content: {...prev.content, general_comment: e.target.value}} : null)}
                  />
                </section>

                {/* Monthly Charts */}
                {reportType === 'monthly' && (
                  <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><PieChart size={20} className="text-purple-600"/> 성취도 변화 (지난달 vs 이번달)</h4>
                    <BarChart label="평균 이해도 (Understanding)" current={stats.avg_understanding} prev={stats.prev_month_understanding || 0} />
                    <BarChart label="수업 태도 (Attitude)" current={stats.avg_attitude} prev={stats.prev_month_attitude || 0} />
                    <div className="mt-4 text-xs text-gray-400 text-right">* 회색 막대는 지난달, 컬러 막대는 이번달 수치입니다.</div>
                  </section>
                )}

                {/* Stats Grid */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { l: '출석률', v: `${stats.attendance_rate}%`, c: 'text-green-700 bg-green-50' },
                    { l: '과제 수행', v: `${stats.homework_rate}%`, c: 'text-blue-700 bg-blue-50' },
                    { l: '이해도', v: stats.avg_understanding, c: 'text-purple-700 bg-purple-50' },
                    { l: '태도', v: stats.avg_attitude, c: 'text-orange-700 bg-orange-50' },
                  ].map((i,idx) => (
                    <div key={idx} className={`p-4 rounded-xl text-center border border-transparent ${i.c}`}>
                      <div className="text-xs font-bold opacity-70 mb-1">{i.l}</div>
                      <div className="text-2xl font-extrabold">{i.v}</div>
                    </div>
                  ))}
                </section>

                {/* Curriculum & Exams */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                     <h4 className="font-bold border-b pb-2 mb-3">학습 진도</h4>
                     <ul className="space-y-2">
                       {stats.covered_chapters.length>0 ? stats.covered_chapters.map((c,i)=><li key={i} className="text-sm flex gap-2"><div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-500"></div>{c}</li>) : <li className="text-gray-400 text-sm">기록 없음</li>}
                     </ul>
                  </div>
                  <div>
                    <h4 className="font-bold border-b pb-2 mb-3">평가 및 테스트</h4>
                    {stats.exams.length > 0 ? (
                      <div className="space-y-2">
                        {stats.exams.map(e => (
                          <div key={e.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                            <span className="font-medium">{e.exam_name}</span>
                            <span className={`font-bold ${e.score>=90?'text-blue-600':e.score>=80?'text-green-600':'text-red-500'}`}>{e.score}점</span>
                          </div>
                        ))}
                      </div>
                    ) : <div className="text-gray-400 text-sm">테스트 기록 없음</div>}
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 p-6 border-t flex justify-end gap-3">
                <button 
                  onClick={() => setIsPreviewOpen(true)}
                  className="px-6 py-2.5 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-100 transition-all"
                >
                  미리보기
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-all"
                >
                  <Save size={18} className="inline mr-2"/> 저장하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && selectedStudent && stats && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setIsPreviewOpen(false)} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                <X size={20}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className={`p-8 text-center text-white ${reportType==='weekly'?'bg-indigo-600':'bg-purple-600'}`}>
                <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold">
                  {selectedStudent.name[0]}
                </div>
                <h2 className="text-2xl font-bold mb-1">{selectedStudent.name} 학생</h2>
                <p className="opacity-80 text-sm">{label} {reportType === 'weekly' ? '주간' : '월간'} 리포트</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex justify-between text-center bg-gray-50 p-4 rounded-2xl">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">출석률</div>
                    <div className="font-bold text-lg text-gray-800">{stats.attendance_rate}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">과제완료</div>
                    <div className="font-bold text-lg text-gray-800">{stats.homework_rate}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">이해도</div>
                    <div className="font-bold text-lg text-indigo-600">{stats.avg_understanding}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">
                    <span className="w-1 h-4 bg-indigo-500 rounded-full"></span> 선생님 총평
                  </h3>
                  <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl">
                    {report.content.general_comment}
                  </div>
                </div>
                <div>
                   <h3 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">
                    <span className="w-1 h-4 bg-green-500 rounded-full"></span> 이번 {reportType==='weekly'?'주':'달'} 학습 내용
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.covered_chapters.map((c,i) => (
                      <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                        {c}
                      </span>
                    ))}
                    {stats.covered_chapters.length===0 && <span className="text-xs text-gray-400">학습 기록 없음</span>}
                  </div>
                </div>
                <div className="text-center pt-8 pb-4">
                  <p className="text-xs text-gray-400">Ban's Math Academy Report System</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-white">
              <button 
                onClick={() => alert('이미지를 저장하거나 카카오톡으로 전송합니다. (구현 예정)')}
                className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
              >
                <Send size={18}/> 리포트 학부모 전송
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}