import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout';
import { 
  User, Phone, School, Save, ArrowLeft, 
  TrendingUp, Plus, Trash2, GraduationCap, 
  FileText, Calendar, Clock, CreditCard 
} from 'lucide-react';

// --- 데이터 타입 ---
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

interface ReportStats {
  attendance_rate: number;
  avg_homework: number;
  avg_test_score: number;
  recent_comments: { date: string; text: string; }[];
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const studentId = parseInt(id || '0');

  // 상태 관리
  const [student, setStudent] = useState<Student | null>(null);
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [stats, setStats] = useState<ReportStats>({ attendance_rate: 0, avg_homework: 0, avg_test_score: 0, recent_comments: [] });
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]); // 수납 내역 (중복 제거됨)
  const [loading, setLoading] = useState(true);

  // 정보 수정 모드
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: '', school_name: '', grade: '', parent_phone: '', enrollment_date: '' 
  });

  // 성적 탭 상태
  const [activeTab, setActiveTab] = useState('내신'); 
  
  // 성적 입력 모달
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [newScore, setNewScore] = useState({ exam_name: '', score: '', exam_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (studentId) fetchData();
  }, [studentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. 학생 정보 (+학부모)
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

      // 4. 리포트 통계
      const { data: attData } = await supabase.from('attendance_logs').select('status').eq('student_id', studentId);
      const totalAtt = attData?.length || 0;
      const presentCount = attData?.filter(a => a.status !== 'absent').length || 0;
      const attRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;

      const { data: rData } = await supabase
        .from('class_reports')
        .select('*')
        .eq('student_id', studentId)
        .order('report_date', { ascending: false });
      
      const reports = rData || [];
      const avgScore = reports.length > 0 
        ? Math.round(reports.reduce((acc, cur) => acc + (cur.score || 0), 0) / reports.length) 
        : 0;
      
      const comments = reports
        .filter(r => r.teacher_comment)
        .slice(0, 3)
        .map(r => ({ date: r.report_date, text: r.teacher_comment }));

      setStats({
        attendance_rate: attRate,
        avg_homework: 0,
        avg_test_score: avgScore,
        recent_comments: comments
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
      await supabase.from('parents').update({
        phone_number: editForm.parent_phone
      }).eq('id', student.parent.id);
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
    if(!confirm('삭제하시겠습니까?')) return;
    await supabase.from('exam_scores').delete().eq('id', scoreId);
    fetchData();
  };
  
  const currentScores = scores.filter(s => s.category === activeTab);

  if (loading) return <MainLayout><div className="p-10 text-center">로딩 중...</div></MainLayout>;
  if (!student) return <MainLayout><div className="p-10 text-center">학생 정보를 찾을 수 없습니다.</div></MainLayout>;

  return (
    <MainLayout>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">{student.name} 학생 상세 정보</h1>
      </div>

      {/* 3단 그리드 시작 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* [섹션 1] 기본 정보 (좌측) - 수정됨: 내부 구조 정리 완료 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <User size={20} className="text-indigo-600" /> 기본 정보
            </h2>
            <button 
              onClick={() => isEditingInfo ? handleSaveInfo() : setIsEditingInfo(true)}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors ${
                isEditingInfo ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isEditingInfo ? '저장' : '수정'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">이름</label>
              {isEditingInfo ? (
                <input type="text" value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} className="w-full border p-2 rounded" />
              ) : (
                <p className="font-bold text-gray-800 text-lg">{student.name}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">학교</label>
                {isEditingInfo ? (
                  <input type="text" value={editForm.school_name} onChange={e=>setEditForm({...editForm, school_name: e.target.value})} className="w-full border p-2 rounded" />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700">
                    <School size={16} /> {student.school_name}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold block mb-1">학년</label>
                {isEditingInfo ? (
                  <input type="text" value={editForm.grade} onChange={e=>setEditForm({...editForm, grade: e.target.value})} className="w-full border p-2 rounded" />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700">
                    <GraduationCap size={16} /> {student.grade}
                  </div>
                )}
              </div>
            </div>

            {/* 최초 등록일 필드 (여기에 위치해야 함) */}
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">최초 등록일</label>
              {isEditingInfo ? (
                <input type="date" value={editForm.enrollment_date} onChange={e=>setEditForm({...editForm, enrollment_date: e.target.value})} className="w-full border p-2 rounded" />
              ) : (
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={16} /> {student.enrollment_date}
                </div>
              )}
            </div>

            <hr className="border-gray-100 my-2" />
            
            <div>
              <label className="text-xs text-gray-400 font-bold block mb-1">학부모 연락처</label>
              {isEditingInfo ? (
                <input type="text" value={editForm.parent_phone} onChange={e=>setEditForm({...editForm, parent_phone: e.target.value})} className="w-full border p-2 rounded" />
              ) : (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone size={16} /> {student.parent?.phone_number || '-'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* [섹션 2] 성적 관리 (중앙) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" /> 성적 관리
            </h2>
            <button 
              onClick={() => setIsScoreModalOpen(true)}
              className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-bold hover:bg-indigo-100 flex items-center gap-1"
            >
              <Plus size={14} /> 점수 추가
            </button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            {['내신', '모의', '학원'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${
                  activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="h-48 w-full bg-gray-50 rounded-xl mb-6 relative flex items-end justify-between px-4 pb-2 pt-8 border border-gray-100">
            {currentScores.length > 1 ? (
              <svg className="absolute inset-0 w-full h-full pointer-events-none p-4" viewBox={`0 0 100 100`} preserveAspectRatio="none">
                <polyline
                   fill="none"
                   stroke="#6366f1"
                   strokeWidth="2"
                   points={currentScores.map((s, i) => {
                     const x = (i / (currentScores.length - 1)) * 100;
                     const y = 100 - s.score; 
                     return `${x},${y}`;
                   }).join(' ')}
                />
              </svg>
            ) : null}
            
            {currentScores.length > 0 ? (
               currentScores.map((s) => (
                 <div key={s.id} className="relative z-10 flex flex-col items-center group">
                   <div className="mb-2 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm"></div>
                   <span className="text-xs font-bold text-gray-700 absolute -top-8 bg-white px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                     {s.exam_name}: {s.score}점
                   </span>
                 </div>
               ))
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                데이터가 없습니다.
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {currentScores.map((s) => (
              <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group">
                <div>
                  <p className="text-sm font-bold text-gray-800">{s.exam_name}</p>
                  <p className="text-xs text-gray-400">{s.exam_date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-indigo-600 font-bold">{s.score}점</span>
                  <button onClick={() => handleDeleteScore(s.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* [섹션 3] 종합 평가 (우측) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
            <FileText size={20} className="text-indigo-600" /> 수업 종합 평가
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-xl text-center">
              <p className="text-xs text-indigo-400 font-bold mb-1 uppercase">출석률</p>
              <p className="text-2xl font-bold text-indigo-700">{stats.attendance_rate}%</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl text-center">
              <p className="text-xs text-green-500 font-bold mb-1 uppercase">일일 테스트 평균</p>
              <p className="text-2xl font-bold text-green-700">{stats.avg_test_score}점</p>
            </div>
          </div>

          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Clock size={14} /> 최근 선생님 코멘트
          </h3>
          <div className="space-y-3">
            {stats.recent_comments.length > 0 ? (
              stats.recent_comments.map((c, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-400">{c.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-snug">{c.text}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">아직 작성된 코멘트가 없습니다.</p>
            )}
          </div>
        </div>

      </div> 
      {/* ▲ 3단 그리드 끝 (grid 닫는 태그) */}

      {/* ★ [결제 내역 섹션] - 그리드 밖, 모달 전에 위치 */}
      <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <CreditCard size={20} className="text-indigo-600" /> 수납 내역
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3">납부일</th>
                <th className="p-3">내용</th>
                <th className="p-3">결제수단</th>
                <th className="p-3 text-right">금액</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.length > 0 ? paymentHistory.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">{p.payment_date}</td>
                  <td className="p-3">{p.memo}</td>
                  <td className="p-3 text-gray-500">{p.method === 'card' ? '카드' : '현금'}</td>
                  <td className="p-3 text-right font-bold">{p.amount.toLocaleString()}원</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-4 text-center text-gray-400">납부 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 성적 추가 모달 */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 animate-fade-in-up">
            <h3 className="font-bold text-lg mb-4">[{activeTab}] 성적 추가</h3>
            <div className="space-y-3">
              <input 
                type="text" placeholder="시험명 (예: 중간고사)" 
                value={newScore.exam_name} onChange={e=>setNewScore({...newScore, exam_name: e.target.value})}
                className="w-full border p-2 rounded"
              />
              <input 
                type="number" placeholder="점수" 
                value={newScore.score} onChange={e=>setNewScore({...newScore, score: e.target.value})}
                className="w-full border p-2 rounded"
              />
              <input 
                type="date" 
                value={newScore.exam_date} onChange={e=>setNewScore({...newScore, exam_date: e.target.value})}
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsScoreModalOpen(false)} className="px-4 py-2 text-gray-500 text-sm">취소</button>
              <button onClick={handleAddScore} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold">저장</button>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
}