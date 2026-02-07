import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout';
import { 
  FileText, Calendar, ChevronLeft, ChevronRight, 
  Save, CheckCircle, X, PieChart, Download, BookOpen
} from 'lucide-react';
import html2canvas from 'html2canvas';

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

interface DailyReportData {
  understanding_score: number;
  homework_status: string;
  attitude_tags: string[];
  report_message: string;
  // [New] 객관적 학습 정보
  study_topics: string[]; // 오늘 나간 진도
  review_topics: string[]; // 오늘 한 복습
}

export default function Report() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [dailyData, setDailyData] = useState<DailyReportData | null>(null);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getRange = (date: Date, type: 'daily' | 'weekly' | 'monthly') => {
    const d = new Date(date);
    if (type === 'daily') {
        const dateStr = formatDate(d);
        return { start: dateStr, end: dateStr, label: `${d.getMonth()+1}월 ${d.getDate()}일` };
    } else if (type === 'weekly') {
      const day = d.getDay(); 
      const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diffToMon);
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);
      return {
        start: formatDate(monday),
        end: formatDate(saturday),
        label: `${monday.getMonth()+1}월 ${monday.getDate()}일 ~ ${saturday.getMonth()+1}월 ${saturday.getDate()}일`
      };
    } else {
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

  useEffect(() => { fetchStudents(); }, []);

  useEffect(() => {
    if (selectedStudent) {
      if (reportType === 'daily') fetchDailyData(selectedStudent.id);
      else fetchWeeklyMonthlyData(selectedStudent.id);
    }
  }, [selectedStudent, start, reportType]);

  const moveDate = (dir: -1 | 1) => {
    const newDate = new Date(currentDate);
    if (reportType === 'daily') newDate.setDate(newDate.getDate() + dir);
    else if (reportType === 'weekly') newDate.setDate(newDate.getDate() + (dir * 7));
    else newDate.setMonth(newDate.getMonth() + dir);
    setCurrentDate(newDate);
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').eq('status', 'enrolled').order('name');
    if (data) {
      setStudents(data);
      if (data.length > 0 && !selectedStudent) setSelectedStudent(data[0]);
    }
  };

  // [Update] 진도 내용까지 가져오도록 수정된 fetchDailyData
  const fetchDailyData = async (studentId: number) => {
    setLoading(true);
    setDailyData(null);
    try {
        // 1. 오늘 날짜의 수업 로그들 가져오기 (진도 ID 포함)
        const { data: logs } = await supabase
            .from('class_logs')
            .select('id, progress_curriculum_ids, review_curriculum_ids')
            .eq('class_date', start);

        if (logs && logs.length > 0) {
            // 2. 해당 학생의 평가 데이터 찾기
            const { data: evalData } = await supabase
                .from('student_evaluations')
                .select('*')
                .in('class_log_id', logs.map(l => l.id))
                .eq('student_id', studentId)
                .maybeSingle();

            if (evalData) {
                // 3. 평가 데이터와 연결된 수업 로그 찾기
                const relevantLog = logs.find(l => l.id === evalData.class_log_id);
                
                let studyList: string[] = [];
                let reviewList: string[] = [];

                if (relevantLog) {
                    const allIds = [
                        ...(relevantLog.progress_curriculum_ids || []),
                        ...(relevantLog.review_curriculum_ids || [])
                    ];
                    
                    if (allIds.length > 0) {
                        const { data: currData } = await supabase
                            .from('curriculum')
                            .select('id, chapter_name')
                            .in('id', allIds);
                        
                        if (currData) {
                            const map = new Map(currData.map(c => [c.id, c.chapter_name]));
                            studyList = (relevantLog.progress_curriculum_ids || []).map((id: number) => map.get(id)).filter((n : any): n is string => !!n);
                            reviewList = (relevantLog.review_curriculum_ids || []).map((id: number) => map.get(id)).filter((n : any): n is string => !!n);
                        }
                    }
                }

                setDailyData({
                    understanding_score: evalData.understanding_score,
                    homework_status: evalData.homework_status,
                    attitude_tags: evalData.attitude_tags || [],
                    report_message: evalData.report_message || '',
                    study_topics: studyList,
                    review_topics: reviewList
                });
            }
        }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchWeeklyMonthlyData = async (studentId: number) => {
    setLoading(true); setStats(null); setReport(null);
    try {
      let existingReport = null;
      if (reportType === 'weekly') {
        const { data } = await supabase.from('weekly_reports').select('*').eq('student_id', studentId).eq('start_date', start).maybeSingle();
        existingReport = data;
      } else if (reportType === 'monthly') {
        const { data } = await supabase.from('monthly_reports').select('*').eq('student_id', studentId).eq('year', new Date(start).getFullYear()).eq('month', new Date(start).getMonth() + 1).maybeSingle();
        existingReport = data;
      }
      const { data: evaluations } = await supabase.from('student_evaluations').select(`*, class_log:class_logs!inner(class_date, progress_curriculum_ids, review_curriculum_ids)`).eq('student_id', studentId).gte('class_log.class_date', start).lte('class_log.class_date', end);
      const { data: exams } = await supabase.from('exam_scores').select('*').eq('student_id', studentId).gte('exam_date', start).lte('exam_date', end).order('exam_date');

      let pNames: string[] = [];
      let rNames: string[] = [];
      if (evaluations && evaluations.length > 0) {
        const allIds = new Set<number>();
        evaluations.forEach((e: any) => {
          e.class_log.progress_curriculum_ids?.forEach((id: number) => allIds.add(id));
          e.class_log.review_curriculum_ids?.forEach((id: number) => allIds.add(id));
        });
        if (allIds.size > 0) {
          const { data: curr } = await supabase.from('curriculum').select('id, chapter_name').in('id', Array.from(allIds));
          if (curr) {
            const map = new Map(curr.map(c => [c.id, c.chapter_name]));
            evaluations.forEach((e: any) => {
              e.class_log.progress_curriculum_ids?.forEach((id: number) => { const name = map.get(id); if(name) pNames.push(name); });
              e.class_log.review_curriculum_ids?.forEach((id: number) => { const name = map.get(id); if(name) rNames.push(name); });
            });
          }
        }
      }
      pNames = [...new Set(pNames)]; rNames = [...new Set(rNames)];
      const calculatedStats = calculateStats(evaluations || [], exams || [], pNames, rNames);
      setStats(calculatedStats);
      if (existingReport) {
        setReport({ id: existingReport.id, student_id: studentId, type: reportType as 'weekly' | 'monthly', start_date: start, end_date: end, content: (existingReport.report_content as any) || { general_comment: '', focus_points: [] }, status: (existingReport.status as any) || 'draft' });
      } else {
        const autoComment = generateAutoComment(calculatedStats, selectedStudent?.name || '', reportType as 'weekly'|'monthly');
        setReport({ student_id: studentId, type: reportType as 'weekly' | 'monthly', start_date: start, end_date: end, content: { general_comment: autoComment, focus_points: [] }, status: 'draft' });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const calculateStats = (evals: any[], exams: any[], pNames: string[], rNames: string[]): ReportStats => {
    const total = evals.length;
    const attended = evals.filter((e:any) => ['present','late'].includes(e.attendance_status)).length;
    const homework = evals.filter((e:any) => e.homework_status === 'complete').length;
    const sumU = evals.reduce((a:number, c:any) => a + (c.understanding_score||0), 0);
    const sumA = evals.reduce((a:number, c:any) => a + (c.attitude_score||0), 0);
    return { attendance_rate: total ? Math.round((attended/total)*100) : 0, homework_rate: total ? Math.round((homework/total)*100) : 0, avg_understanding: total ? parseFloat((sumU/total).toFixed(1)) : 0, avg_attitude: total ? parseFloat((sumA/total).toFixed(1)) : 0, covered_chapters: pNames, review_chapters: rNames, exams };
  };

  const generateAutoComment = (stats: ReportStats, name: string, type: 'weekly'|'monthly') => {
    if (stats.avg_understanding === 0 && stats.exams.length === 0) return `${name} 학생의 해당 기간 학습 데이터가 부족합니다.`;
    return `${name} 학생은 이번 ${type==='weekly'?'주':'달'} 성실히 학습했습니다.`;
  };

  const handleSave = async () => {
      if (!report || !stats || reportType === 'daily') return;
      try {
        const payload = { student_id: report.student_id, report_content: report.content, status: report.status, attendance_rate: stats.attendance_rate, homework_avg: stats.homework_rate, teacher_comment: report.content.general_comment };
        const table = reportType === 'weekly' ? 'weekly_reports' : 'monthly_reports';
        const conflict = reportType === 'weekly' ? 'student_id, start_date' : 'student_id, year, month';
        await supabase.from(table).upsert({ ...payload, id: report.id, ...(reportType === 'weekly' ? { start_date: report.start_date, end_date: report.end_date, title: `${report.start_date} 주간` } : { year: new Date(report.start_date).getFullYear(), month: new Date(report.start_date).getMonth() + 1, title: `${new Date(report.start_date).getMonth()+1}월` }) } as any, { onConflict: conflict as any });
        alert('리포트가 저장되었습니다.');
      } catch (e:any) { alert(e.message); }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('daily-report-card');
    if (!element) return;
    try {
        const canvas = await html2canvas(element, { 
            scale: 3, 
            backgroundColor: '#ffffff',
            useCORS: true,
        });
        const data = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = data;
        link.download = `${selectedStudent?.name}_DailyReport_${start}.png`;
        link.click();
    } catch (e) { alert('이미지 저장 중 오류가 발생했습니다.'); }
  };

  const BarChart = ({ label, current, prev }: { label: string, current: number, prev?: number }) => (
    <div className="mb-4">
      <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
        <span>{label}</span>
        {prev !== undefined && <span>Last Month: {prev} → This Month: {current}</span>}
      </div>
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex relative">
        {prev !== undefined && <div className="absolute top-0 left-0 h-full bg-gray-300 opacity-50" style={{ width: `${(prev / 5) * 100}%` }}></div>}
        <div className={`h-full rounded-full transition-all duration-500 ${current >= 4 ? 'bg-indigo-500' : current >= 3 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${(current / 5) * 100}%` }}></div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-100px)] -m-6 bg-gray-50">
        <div className="w-80 bg-white border-r flex flex-col z-10 shadow-sm">
          <div className="p-6 border-b bg-white">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 mb-4"><FileText className="text-indigo-600"/> 레포트 관리</h2>
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
               {['daily', 'weekly', 'monthly'].map((t) => (
                  <button key={t} onClick={() => setReportType(t as any)} className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase transition-all ${reportType===t ? 'bg-white text-indigo-600 shadow-sm':'text-gray-500'}`}>{t}</button>
               ))}
            </div>
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
              <button onClick={() => moveDate(-1)} className="p-1 hover:bg-white rounded"><ChevronLeft size={18}/></button>
              <span className="text-xs font-bold text-gray-700">{label}</span>
              <button onClick={() => moveDate(1)} className="p-1 hover:bg-white rounded"><ChevronRight size={18}/></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {students.map(student => (
              <div key={student.id} onClick={() => setSelectedStudent(student)} className={`p-3.5 rounded-xl cursor-pointer transition-all flex justify-between items-center ${selectedStudent?.id === student.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-700'}`}>
                <div className="font-bold">{student.name}</div>
                {selectedStudent?.id === student.id && (reportType !== 'daily' ? (report?.id && <CheckCircle size={16} className="text-indigo-300"/>) : (dailyData && <CheckCircle size={16} className="text-indigo-300"/>))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-gray-50/50 flex flex-col items-center">
            {reportType === 'daily' && (
                selectedStudent ? (
                    dailyData ? (
                        <div className="animate-fade-in-up flex flex-col items-center gap-6">
                            {/* ★ 수정된 카드 디자인 (학습 내용 추가) */}
                            <div id="daily-report-card" className="w-[375px] bg-white rounded-3xl overflow-hidden shadow-2xl">
                                <div className="h-32 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-300 p-6 flex items-end relative">
                                    <div className="text-white z-10">
                                        <h2 className="text-2xl font-extrabold flex items-center gap-2">{selectedStudent.name} <span className="text-lg font-medium opacity-80">학생</span></h2>
                                        <p className="text-white/90 text-sm font-medium flex items-center gap-1 mt-1"><Calendar size={12}/> {label}</p>
                                    </div>
                                    <div className="absolute right-4 bottom-4 w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-2xl border border-white/30 pt-1">😊</div>
                                </div>
                                <div className="p-6 bg-white space-y-5">
                                    {/* 태그 영역 */}
                                    <div className="flex flex-wrap gap-2">
                                      {(dailyData.attitude_tags || []).map((t, i) => (
                                        <span key={i} className="px-3 py-1.5 inline-flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold border border-indigo-100 leading-none">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                    
                                    {/* [New] 학습 내용 섹션 */}
                                    {(dailyData.study_topics.length > 0 || dailyData.review_topics.length > 0) && (
                                        <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <BookOpen size={14} className="text-orange-500"/>
                                                <span className="text-xs font-bold text-orange-600 uppercase">Today's Study</span>
                                            </div>
                                            <div className="space-y-2">
                                                {dailyData.study_topics.length > 0 && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded shrink-0 mt-0.5">진도</span>
                                                        <span className="text-xs text-gray-700 font-medium leading-tight">{dailyData.study_topics.join(', ')}</span>
                                                    </div>
                                                )}
                                                {dailyData.review_topics.length > 0 && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded shrink-0 mt-0.5">복습</span>
                                                        <span className="text-xs text-gray-700 font-medium leading-tight">{dailyData.review_topics.join(', ')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Teacher's Note */}
                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 relative min-h-[100px]">
                                        <div className="absolute -top-3 left-4 bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold text-gray-400 uppercase">Teacher's Note</div>
                                        <p className="text-gray-700 text-sm leading-6 whitespace-pre-wrap font-medium">{dailyData.report_message || "작성된 코멘트가 없습니다."}</p>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-blue-50 rounded-xl p-3 flex flex-col items-center justify-center">
                                            <span className="text-[10px] text-blue-400 font-bold uppercase mb-1.5 block">Understanding</span>
                                            <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-2 rounded-full ${i <= dailyData.understanding_score ? 'bg-blue-500' : 'bg-blue-200'}`}></div>)}</div>
                                        </div>
                                        <div className="flex-1 bg-purple-50 rounded-xl p-3 flex flex-col items-center justify-center">
                                            <span className="text-[10px] text-purple-400 font-bold uppercase mb-1 block">Homework</span>
                                            <span className="text-xs font-bold text-purple-600 uppercase inline-block leading-none mt-0.5">{dailyData.homework_status}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 text-center border-t border-gray-100"><p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Ban's Math Academy</p></div>
                            </div>
                            <button onClick={handleDownloadImage} className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-800 flex items-center gap-2 transition-transform hover:scale-105"><Download size={18}/> 이미지 저장하기</button>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 mt-20"><FileText size={48} className="mx-auto mb-4 opacity-20"/><p>오늘 작성된 리포트가 없습니다.<br/>'대시보드'에서 수업 평가를 먼저 진행해주세요.</p></div>
                    )
                ) : <div className="text-gray-400 mt-20">학생을 선택해주세요.</div>
            )}

            {/* Weekly/Monthly View (생략 없이 유지) */}
            {reportType !== 'daily' && (
                selectedStudent && stats ? (
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in-up">
                        <div className={`p-8 text-white relative overflow-hidden ${reportType==='weekly' ? 'bg-gradient-to-r from-indigo-700 to-indigo-600' : 'bg-gradient-to-r from-purple-700 to-purple-600'}`}>
                             <div className="relative z-10 flex justify-between items-start">
                               <div>
                                 <h3 className="text-white/80 font-bold uppercase tracking-widest text-xs mb-2">{reportType} REPORT</h3>
                                 <h1 className="text-3xl font-extrabold mb-1">{selectedStudent.name} 학생 {reportType} 분석</h1>
                                 <p className="text-white/90 text-sm flex items-center gap-2"><Calendar size={14}/> {label}</p>
                               </div>
                               <div className="bg-white/10 p-3 rounded-xl text-center backdrop-blur-md border border-white/10">
                                 <div className="text-[10px] text-white/80 font-bold uppercase mb-1">Total Score</div>
                                 <div className="text-3xl font-extrabold tracking-tight">{((stats.avg_understanding + stats.avg_attitude)*10).toFixed(0)}</div>
                               </div>
                             </div>
                        </div>
                        <div className="p-8 space-y-8">
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
                            <section>
                              <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><FileText size={20} className="text-gray-500"/> 종합 평가</h4>
                              <textarea className="w-full p-5 bg-yellow-50/50 border border-yellow-100 rounded-xl text-gray-700 leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={5} value={report?.content.general_comment} onChange={(e) => setReport(prev => prev ? {...prev, content: {...prev.content, general_comment: e.target.value}} : null)} />
                            </section>
                             <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setIsPreviewOpen(true)} className="px-6 py-2.5 border rounded-xl font-bold hover:bg-gray-50">미리보기</button>
                                <button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2"><Save size={18}/> 리포트 저장</button>
                             </div>
                        </div>
                    </div>
                ) : <div className="text-center text-gray-400 mt-20">{loading ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div> : '학생을 선택하거나 데이터가 없습니다.'}</div>
            )}
        </div>
      </div>

      {isPreviewOpen && selectedStudent && stats && report && reportType !== 'daily' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
            <div className="absolute top-4 right-4 z-10"><button onClick={() => setIsPreviewOpen(false)} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70"><X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className={`p-8 text-center text-white ${reportType==='weekly'?'bg-indigo-600':'bg-purple-600'}`}>
                <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold">{selectedStudent.name[0]}</div>
                <h2 className="text-2xl font-bold mb-1">{selectedStudent.name} 학생</h2>
                <p className="opacity-80 text-sm">{label} {reportType} 리포트</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex justify-between text-center bg-gray-50 p-4 rounded-2xl">
                  <div><div className="text-xs text-gray-500 mb-1">출석률</div><div className="font-bold text-lg text-gray-800">{stats.attendance_rate}%</div></div>
                  <div><div className="text-xs text-gray-500 mb-1">과제완료</div><div className="font-bold text-lg text-gray-800">{stats.homework_rate}%</div></div>
                  <div><div className="text-xs text-gray-500 mb-1">이해도</div><div className="font-bold text-lg text-indigo-600">{stats.avg_understanding}</div></div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2"><span className="w-1 h-4 bg-indigo-500 rounded-full"></span> 선생님 총평</h3>
                  <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl">{report.content.general_comment}</div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-white"><button onClick={() => setIsPreviewOpen(false)} className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"><CheckCircle size={18}/> 확인</button></div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}