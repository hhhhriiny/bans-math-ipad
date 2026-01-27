import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout';
import { 
  User, Phone, School, ArrowLeft, 
  TrendingUp, Plus, Trash2, GraduationCap, 
  FileText, Calendar, Clock, CreditCard, 
  CheckCircle2, XCircle, BookOpen 
} from 'lucide-react';

// --- Types ---
interface Student {
  id: number;
  name: string;
  school_name: string;
  grade: string;
  enrollment_date: string;
  parent: { id: number; name: string; phone_number: string };
  tuition_fee: number;
  payment_day: number;
}

interface ExamScore {
  id: number;
  category: string;
  exam_name: string;
  score: number;
  exam_date: string;
}

interface StudentStats {
  attendance_rate: number;      // %
  homework_rate: number;        // %
  avg_understanding: number;    // 5.0 만점
  avg_attitude: number;         // 5.0 만점
  recent_comments: { date: string; text: string; }[];
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const studentId = parseInt(id || '0');

  // --- State ---
  const [student, setStudent] = useState<Student | null>(null);
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<StudentStats>({ 
    attendance_rate: 0, homework_rate: 0, avg_understanding: 0, avg_attitude: 0, recent_comments: [] 
  });
  const [loading, setLoading] = useState(true);

  // Edit Mode State
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: '', school_name: '', grade: '', parent_phone: '', enrollment_date: '' 
  });

  // Score Tab State
  const [activeTab, setActiveTab] = useState('내신'); 
  
  // Score Modal State
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [newScore, setNewScore] = useState({ exam_name: '', score: '', exam_date: new Date().toISOString().split('T')[0] });

  // --- Effects ---
  useEffect(() => {
    if (studentId) fetchData();
  }, [studentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. 학생 기본 정보
      const { data: sData } = await supabase
        .from('students')
        .select('*, parent:parents(*)')
        .eq('id', studentId)
        .single();
      
      if (sData) {
        setStudent(sData);
        setEditForm({
          name: sData.name,
          school_name: sData.school_name,
          grade: sData.grade,
          parent_phone: sData.parent?.phone_number || '',
          enrollment_date: sData.enrollment_date || new Date().toISOString().split('T')[0]
        });
      }

      // 2. 성적 데이터
      const { data: eData } = await supabase
        .from('exam_scores')
        .select('*')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: true });
      setScores(eData || []);

      // 3. 수납 내역
      const { data: pData } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });
      setPaymentHistory(pData || []);

      // 4. [NEW] 수업 평가 데이터 기반 통계 (수정됨)
      const { data: evalData } = await supabase
        .from('student_evaluations')
        .select(`
          attendance_status, homework_status, understanding_score, attitude_score, comment, created_at,
          class_log:class_logs ( class_date )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (evalData && evalData.length > 0) {
        const total = evalData.length;
        const attended = evalData.filter(e => ['present', 'late'].includes(e.attendance_status)).length;
        const homeworkDone = evalData.filter(e => e.homework_status === 'complete').length;
        
        const sumUnd = evalData.reduce((acc, cur) => acc + (cur.understanding_score || 0), 0);
        const sumAtt = evalData.reduce((acc, cur) => acc + (cur.attitude_score || 0), 0);
        
        // ★ [수정 포인트] e를 any로 지정하여 TS 에러 방지 및 안전한 접근
        const comments = evalData
          .filter(e => e.comment)
          .slice(0, 3)
          .map((e: any) => ({
            // class_log가 객체인지, 배열인지, 혹은 null인지 모를 때를 대비해 안전하게 접근
            date: e.class_log?.class_date || e.created_at?.split('T')[0] || '-',
            text: e.comment
          }));

        setStats({
          attendance_rate: Math.round((attended / total) * 100),
          homework_rate: Math.round((homeworkDone / total) * 100),
          avg_understanding: parseFloat((sumUnd / total).toFixed(1)),
          avg_attitude: parseFloat((sumAtt / total).toFixed(1)),
          recent_comments: comments
        });
      } else {
        setStats({ 
          attendance_rate: 0, 
          homework_rate: 0, 
          avg_understanding: 0, 
          avg_attitude: 0, 
          recent_comments: [] 
        });
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleSaveInfo = async () => {
    if (!student) return;
    const day = new Date(editForm.enrollment_date).getDate();

    await supabase.from('students').update({
      name: editForm.name,
      school_name: editForm.school_name,
      grade: editForm.grade,
      enrollment_date: editForm.enrollment_date,
      payment_day: day
    }).eq('id', studentId);
    
    if (student.parent) {
      await supabase.from('parents').update({ phone_number: editForm.parent_phone }).eq('id', student.parent.id);
    }
    
    alert('정보가 수정되었습니다.');
    setIsEditingInfo(false);
    fetchData();
  };

  const handleAddScore = async () => {
    if (!newScore.exam_name || !newScore.score) return alert('시험명과 점수를 입력해주세요.');
    await supabase.from('exam_scores').insert({
      student_id: studentId,
      category: activeTab,
      exam_name: newScore.exam_name,
      score: parseInt(newScore.score),
      exam_date: newScore.exam_date
    });
    setIsScoreModalOpen(false);
    setNewScore({ ...newScore, exam_name: '', score: '' });
    fetchData();
  };

  const handleDeleteScore = async (scoreId: number) => {
    if(!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('exam_scores').delete().eq('id', scoreId);
    fetchData();
  };
  
  const currentScores = scores.filter(s => s.category === activeTab);

  if (loading) return <MainLayout><div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div></MainLayout>;
  if (!student) return <MainLayout><div className="p-10 text-center text-gray-500">학생 정보를 찾을 수 없습니다.</div></MainLayout>;

  return (
    <MainLayout>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{student.name}</h1>
          <p className="text-xs text-gray-500">{student.school_name} {student.grade}</p>
        </div>
      </div>

      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* [Left] Basic Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
              <User size={20} className="text-indigo-600" /> 기본 정보
            </h2>
            <button 
              onClick={() => isEditingInfo ? handleSaveInfo() : setIsEditingInfo(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                isEditingInfo ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isEditingInfo ? '저장 완료' : '정보 수정'}
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">이름</label>
              {isEditingInfo ? (
                <input type="text" value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} className="w-full border p-2 rounded text-sm" />
              ) : (
                <p className="font-bold text-gray-800">{student.name}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">학교</label>
                {isEditingInfo ? (
                  <input type="text" value={editForm.school_name} onChange={e=>setEditForm({...editForm, school_name: e.target.value})} className="w-full border p-2 rounded text-sm" />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                    <School size={16} /> {student.school_name}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">학년</label>
                {isEditingInfo ? (
                  <input type="text" value={editForm.grade} onChange={e=>setEditForm({...editForm, grade: e.target.value})} className="w-full border p-2 rounded text-sm" />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                    <GraduationCap size={16} /> {student.grade}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">등록일</label>
              {isEditingInfo ? (
                <input type="date" value={editForm.enrollment_date} onChange={e=>setEditForm({...editForm, enrollment_date: e.target.value})} className="w-full border p-2 rounded text-sm" />
              ) : (
                <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                  <Calendar size={16} /> {student.enrollment_date}
                </div>
              )}
            </div>

            <hr className="border-gray-100" />
            
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">학부모 연락처</label>
              {isEditingInfo ? (
                <input type="text" value={editForm.parent_phone} onChange={e=>setEditForm({...editForm, parent_phone: e.target.value})} className="w-full border p-2 rounded text-sm" />
              ) : (
                <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                  <Phone size={16} /> {student.parent?.phone_number || '-'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* [Middle] School Exam Scores */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[420px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
              <TrendingUp size={20} className="text-indigo-600" /> 성적 추이
            </h2>
            <button 
              onClick={() => setIsScoreModalOpen(true)}
              className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1.5 rounded-lg font-bold hover:bg-indigo-100 flex items-center gap-1 transition-colors"
            >
              <Plus size={14} /> 기록 추가
            </button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            {['내신', '모의', '학원'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Graph Visualization */}
          <div className="h-40 w-full bg-white rounded-xl mb-4 relative flex items-end justify-between px-2 pb-2 border-b border-gray-100">
             {currentScores.length > 1 ? (
              <svg className="absolute inset-0 w-full h-full pointer-events-none p-2" viewBox={`0 0 100 100`} preserveAspectRatio="none">
                <polyline
                   fill="none"
                   stroke="#818cf8"
                   strokeWidth="3"
                   strokeLinecap="round"
                   strokeLinejoin="round"
                   points={currentScores.map((s, i) => {
                     const x = (i / (currentScores.length - 1)) * 100;
                     const y = 100 - Math.min(Math.max(s.score, 0), 100); 
                     return `${x},${y}`;
                   }).join(' ')}
                />
              </svg>
            ) : null}
            
            {currentScores.length > 0 ? (
               currentScores.map((s) => (
                 <div key={s.id} className="relative z-10 flex flex-col items-center group cursor-pointer">
                   <div 
                    className="w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm group-hover:scale-125 transition-transform"
                    title={`${s.exam_name}: ${s.score}점`}
                   ></div>
                 </div>
               ))
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                등록된 성적 데이터가 없습니다.
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {currentScores.map((s) => (
              <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-colors group">
                <div>
                  <p className="text-sm font-bold text-gray-700">{s.exam_name}</p>
                  <p className="text-[10px] text-gray-400">{s.exam_date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${s.score>=90?'text-indigo-600':s.score>=80?'text-green-600':'text-gray-600'}`}>{s.score}점</span>
                  <button onClick={() => handleDeleteScore(s.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* [Right] Class Stats (Based on Evaluation) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[420px]">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 mb-6">
            <FileText size={20} className="text-indigo-600" /> 수업 활동 분석
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-center">
              <div className="text-xs text-indigo-400 font-bold mb-1">평균 이해도</div>
              <div className="text-2xl font-extrabold text-indigo-600 flex items-end justify-center gap-1">
                {stats.avg_understanding} <span className="text-sm font-medium text-indigo-300 mb-1">/ 5.0</span>
              </div>
            </div>
            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 text-center">
              <div className="text-xs text-purple-400 font-bold mb-1">수업 태도</div>
              <div className="text-2xl font-extrabold text-purple-600 flex items-end justify-center gap-1">
                {stats.avg_attitude} <span className="text-sm font-medium text-purple-300 mb-1">/ 5.0</span>
              </div>
            </div>
            <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 flex justify-between items-center px-4">
               <span className="text-xs font-bold text-green-600">출석률</span>
               <span className="text-lg font-extrabold text-green-700">{stats.attendance_rate}%</span>
            </div>
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex justify-between items-center px-4">
               <span className="text-xs font-bold text-blue-600">과제 완료</span>
               <span className="text-lg font-extrabold text-blue-700">{stats.homework_rate}%</span>
            </div>
          </div>

          <h3 className="text-xs font-bold text-gray-400 mb-3 flex items-center gap-1 uppercase tracking-wider">
            Recent Feedback
          </h3>
          <div className="space-y-3">
            {stats.recent_comments.length > 0 ? (
              stats.recent_comments.map((c, idx) => (
                <div key={idx} className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                    <span className="text-[10px] font-bold text-gray-400">{c.date}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{c.text}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                <BookOpen className="mx-auto text-gray-300 mb-2" size={24}/>
                <p className="text-xs text-gray-400">아직 수업 코멘트가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

      </div> 
      {/* End Grid */}

      {/* Payment History */}
      <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-gray-800">
          <CreditCard size={20} className="text-indigo-600" /> 수납 내역
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 text-gray-500 font-bold">납부일</th>
                <th className="p-4 text-gray-500 font-bold">내용</th>
                <th className="p-4 text-gray-500 font-bold">결제수단</th>
                <th className="p-4 text-gray-500 font-bold text-right">금액</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.length > 0 ? paymentHistory.map(p => (
                <tr key={p.id} className="border-b last:border-0 border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-700">{p.payment_date}</td>
                  <td className="p-4 text-gray-600">{p.memo}</td>
                  <td className="p-4 text-gray-500">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${p.method==='card'?'bg-blue-50 text-blue-600':'bg-green-50 text-green-600'}`}>
                      {p.method === 'card' ? '카드' : '현금'}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-gray-800">{p.amount.toLocaleString()}원</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">납부 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Score */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100">
            <h3 className="font-bold text-lg mb-6 text-gray-800">[{activeTab}] 성적 기록 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">시험명</label>
                <input 
                  type="text" placeholder="예: 1학기 중간고사" 
                  value={newScore.exam_name} onChange={e=>setNewScore({...newScore, exam_name: e.target.value})}
                  className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">점수</label>
                <input 
                  type="number" placeholder="0 ~ 100" 
                  value={newScore.score} onChange={e=>setNewScore({...newScore, score: e.target.value})}
                  className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">날짜</label>
                <input 
                  type="date" 
                  value={newScore.exam_date} onChange={e=>setNewScore({...newScore, exam_date: e.target.value})}
                  className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setIsScoreModalOpen(false)} 
                className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleAddScore} 
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
}