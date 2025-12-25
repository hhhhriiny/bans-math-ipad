import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle, Clock, MessageCircle, AlertCircle } from 'lucide-react';

const BRAND_COLOR = '#262e6f';

type ReportData = {
  score: number;
  homework: string;
  attitude: string;
  teacher_comment: string;
  created_at: string;
  student: { name: string; };
  class: { name: string; target_grade: string; };
  topic_ids: any[]; 
};

export default function Report() {
  const { uuid } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_logs')
        .select(`
          score, homework, attitude, teacher_comment, created_at, topic_ids,
          student:students(name),
          class:classes(name, target_grade)
        `)
        .eq('share_uuid', uuid)
        .single();

      if (error || !data) throw error;
      setData(data as any);
    } catch (err) {
      console.error(err); // 에러 내용을 콘솔에 출력
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  
  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <AlertCircle size={48} className="text-gray-300 mb-4"/>
      <h1 className="text-xl font-bold text-gray-800">리포트를 불러올 수 없습니다</h1>
      <p className="text-gray-500 mt-2 text-sm">삭제되었거나 유효하지 않은 주소입니다.</p>
    </div>
  );

  const date = new Date(data.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  const topics = Array.isArray(data.topic_ids) ? data.topic_ids : [];

  // [안전장치] 데이터가 없으면 기본값 표시
  const studentName = data.student?.name || '학생';
  const className = data.class?.name || '수업 정보 없음';
  const classGrade = data.class?.target_grade || '';

  return (
    <div className="min-h-screen bg-[#F2F4F6] font-sans pb-10">
      <div className="bg-[#262e6f] px-6 pt-10 pb-20 rounded-b-[2.5rem] shadow-lg text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <p className="text-indigo-200 text-sm font-bold mb-1">{date} 리포트</p>
        <h1 className="text-3xl font-extrabold mb-2">{studentName}</h1>
        <p className="opacity-80 text-sm">{classGrade} | {className}</p>
      </div>

      <div className="px-5 -mt-12 space-y-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm text-center">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Daily Test</p>
            <div className="flex items-end justify-center">
                <span className="text-6xl font-extrabold text-[#262e6f]">{data.score}</span>
                <span className="text-gray-400 font-bold mb-2 ml-1">점</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-[#262e6f] h-2 rounded-full transition-all duration-1000" style={{ width: `${data.score}%` }}></div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center">
                <div className={`p-3 rounded-full mb-2 ${data.homework === '완료' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500'}`}>
                    <CheckCircle size={24} />
                </div>
                <p className="text-xs text-gray-400 font-bold">과제 수행</p>
                <p className="text-lg font-bold text-gray-800">{data.homework}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center">
                <div className="p-3 rounded-full mb-2 bg-purple-50 text-purple-600">
                    <Clock size={24} />
                </div>
                <p className="text-xs text-gray-400 font-bold">수업 태도</p>
                <p className="text-lg font-bold text-gray-800">{data.attitude}</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                <span className="w-1 h-4 bg-[#262e6f] rounded-full mr-2"></span>오늘 나간 진도
            </h3>
            {topics.length > 0 ? (
                <ul className="space-y-2">
                    {topics.map((t: any, i: number) => (
                        <li key={i} className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-xl text-sm font-medium">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-3"></span>
                            {t.topic}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-400 text-sm">별도 진도 기록 없음</p>
            )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><MessageCircle size={100}/></div>
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                 <span className="w-1 h-4 bg-[#262e6f] rounded-full mr-2"></span>선생님 코멘트
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl">
                "{data.teacher_comment || '특이사항 없습니다.'}"
            </p>
        </div>

        <div className="text-center pb-8 pt-4">
            <p className="text-xs text-gray-400 font-bold">Ban's Math Academy</p>
        </div>
      </div>
    </div>
  );
}