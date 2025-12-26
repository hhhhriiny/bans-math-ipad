import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  CheckCircle, XCircle, Clock, BookOpen, 
  TrendingUp, Calendar, Quote, Phone 
} from 'lucide-react';

// 데이터 타입 정의
interface ReportData {
  id: number;
  report_date: string;
  homework: string;
  score: number;
  topic_ids: string; // JSON string
  teacher_comment: string;
  class_info: { name: string };
}

interface StudentData {
  name: string;
  school_name: string;
  grade: string;
}

export default function Report() {
  const { id } = useParams(); // URL에서 학생 ID 가져오기
  const [student, setStudent] = useState<StudentData | null>(null);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchReportData(parseInt(id));
  }, [id]);

  const fetchReportData = async (studentId: number) => {
    try {
      setLoading(true);
      
      // 1. 학생 정보 가져오기
      const { data: studentData, error: sError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();
      
      if (sError) throw sError;
      setStudent(studentData);

      // 2. 최근 수업 리포트 가져오기 (최근 5건)
      // classes 테이블과 조인하여 수업 이름도 가져옵니다.
      const { data: reportData, error: rError } = await supabase
        .from('class_reports')
        .select(`
          *,
          class_info:classes (name)
        `)
        .eq('student_id', studentId)
        .order('report_date', { ascending: false })
        .limit(5); // 최근 5개만 표시

      if (rError) throw rError;
      setReports(reportData || []);

    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 점수에 따른 그래프 색상 결정
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-indigo-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 70) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  // 날짜 포맷팅 (YYYY.MM.DD)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">리포트를 불러오는 중...</div>;
  if (!student) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">학생 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      
      {/* 1. 상단 헤더 카드 */}
      <div className="bg-indigo-600 text-white p-8 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BookOpen size={120} />
        </div>
        <div className="relative z-10 text-center">
          <p className="text-indigo-200 text-sm font-bold tracking-widest mb-1">BAN'S MATH REPORT</p>
          <h1 className="text-3xl font-bold mb-2">{student.name} 학생</h1>
          <p className="opacity-90">{student.school_name} {student.grade}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-8 space-y-6">
        
        {/* 2. 최근 성적 요약 (그래프) */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6">
            <TrendingUp className="text-indigo-500" /> 최근 성적 추이
          </h3>
          
          {reports.length > 0 ? (
            <div className="flex items-end justify-between h-32 px-2 gap-2">
              {/* 최근 5개 데이터를 시간 역순으로 정렬해서 그래프 그림 */}
              {[...reports].reverse().map((report) => (
                <div key={report.id} className="flex flex-col items-center w-full group">
                  <div className="text-xs font-bold text-indigo-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {report.score}점
                  </div>
                  <div className="w-full bg-gray-100 rounded-t-lg relative h-24 flex items-end overflow-hidden">
                    <div 
                      className={`w-full ${getScoreColor(report.score)} transition-all duration-1000 ease-out rounded-t-lg`} 
                      style={{ height: `${report.score}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-2 font-medium">
                    {formatDate(report.report_date)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-8 text-gray-400 text-sm">아직 등록된 성적 데이터가 없습니다.</div>
          )}
        </div>

        {/* 3. 일별 상세 리포트 (타임라인) */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 px-2">
            <Calendar className="text-indigo-500" /> 학습 상세 기록
          </h3>
          
          {reports.map((report) => (
            <div key={report.id} className="bg-white p-5 rounded-2xl shadow-md border border-gray-100">
              
              {/* 날짜 & 수업명 */}
              <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-3">
                <div>
                  <div className="text-xs font-bold text-indigo-500 mb-0.5">{formatDate(report.report_date)}</div>
                  <h4 className="font-bold text-gray-800 text-lg">{report.class_info?.name || '수업'}</h4>
                </div>
                <div className="bg-gray-50 px-3 py-1.5 rounded-lg text-center">
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">Test Score</span>
                  <span className={`text-xl font-bold ${report.score >= 80 ? 'text-indigo-600' : 'text-gray-700'}`}>
                    {report.score}
                  </span>
                </div>
              </div>

              {/* 진도, 과제 */}
              <div className="space-y-3 mb-4">
                <div className="flex gap-3 text-sm">
                  <span className="text-gray-400 font-bold min-w-[3rem]">진도</span>
                  <span className="text-gray-700 font-medium">
                    {/* JSON 파싱 안전 처리 */}
                    {(() => {
                      try {
                        const topics = JSON.parse(report.topic_ids);
                        return Array.isArray(topics) ? topics.join(', ') : report.topic_ids;
                      } catch {
                        return report.topic_ids;
                      }
                    })()}
                  </span>
                </div>
                <div className="flex gap-3 text-sm items-center">
                  <span className="text-gray-400 font-bold min-w-[3rem]">과제</span>
                  <span className={`
                    px-2 py-0.5 rounded text-xs font-bold
                    ${report.homework === '완료' ? 'bg-green-100 text-green-700' : 
                      report.homework === '미제출' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}
                  `}>
                    {report.homework}
                  </span>
                </div>
              </div>

              {/* 선생님 코멘트 */}
              {report.teacher_comment && (
                <div className="bg-gray-50 p-4 rounded-xl relative mt-2">
                  <Quote size={16} className="text-gray-300 absolute top-2 left-2" />
                  <p className="text-gray-600 text-sm pl-4 leading-relaxed">
                    {report.teacher_comment}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* 4. 하단 학원 정보 */}
        <div className="text-center py-8 text-gray-400">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm mb-3">
            <Phone size={20} className="text-indigo-300" />
          </div>
          <p className="font-bold text-gray-500">Ban's Math Academy</p>
          <p className="text-xs mt-1">문의사항: 010-1234-5678</p>
        </div>

      </div>
    </div>
  );
}