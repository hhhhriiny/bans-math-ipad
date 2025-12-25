import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  LogOut, Plus, Search, Bell, 
  LayoutDashboard, Users, Settings, 
  Calendar, BookOpen, ChevronRight, GraduationCap, 
  X, Save, Phone, Clock, Trash2, ArrowLeft, CheckSquare, Square, MessageCircle
} from 'lucide-react';

const BRAND_COLOR = '#262e6f';

// --- [타입 정의] ---
type TimeSlot = { day: string; start_time: string; end_time: string; };
type ClassItem = { id: number; name: string; target_grade: string; weekly_schedule: TimeSlot[]; };
type StudentItem = { id: number; name: string; school_name: string; grade: string; parent?: { name: string; phone_number: string; } };

export default function Dashboard() {
  const [userName, setUserName] = useState('원장님');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]); // 전체 학생 마스터 리스트
  
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchClasses();
    fetchStudents();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserName(user.email.split('@')[0]);
  };
  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('id');
    setClasses(data || []);
  };
  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select(`*, parent:parents(*)`).order('name');
    setStudents(data || []);
  };

  const formatSchedule = (schedules: TimeSlot[]) => {
    if (!schedules || schedules.length === 0) return '시간 미정';
    const days = schedules.map(s => s.day).join('/');
    return `${days} ${schedules[0].start_time}~`;
  };

  return (
    <div className="flex h-screen bg-[#F5F7FA] font-sans text-gray-900 overflow-hidden">
      
      {/* 1. 사이드바 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex z-20 shadow-sm shrink-0">
        <div className="p-6 h-20 flex items-center border-b border-gray-50 cursor-pointer" onClick={() => { setActiveTab('dashboard'); setSelectedClass(null); }}>
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg mr-3 bg-indigo-50 p-1" onError={(e) => { e.currentTarget.style.display='none'; }} />
          <div><h1 className="text-xl font-extrabold tracking-tight" style={{ color: BRAND_COLOR }}>BAN'S MATH</h1><p className="text-[10px] text-gray-400 font-bold tracking-widest">ADMIN SYSTEM</p></div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="대시보드" active={activeTab === 'dashboard' && !selectedClass} onClick={() => { setActiveTab('dashboard'); setSelectedClass(null); }} />
          <SidebarItem icon={<Users size={20} />} label="원생 관리" active={activeTab === 'students'} onClick={() => { setActiveTab('students'); setSelectedClass(null); }} />
        </nav>
        <div className="p-4 border-t border-gray-100"><div className="flex items-center p-3 bg-gray-50 rounded-xl"><div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3">{userName[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-900 truncate">{userName}</p><button onClick={() => supabase.auth.signOut()} className="text-xs text-gray-500 hover:text-red-500 flex items-center mt-0.5">로그아웃</button></div></div></div>
      </aside>

      {/* 2. 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-6 shrink-0 md:hidden"><span className="font-extrabold text-lg" style={{ color: BRAND_COLOR }}>BAN'S MATH</span><button onClick={() => supabase.auth.signOut()}><LogOut className="text-gray-400"/></button></header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {/* [View 1] 수업 평가 모드 */}
            {selectedClass ? (
                <EvaluationView 
                    classInfo={selectedClass} 
                    allStudents={students} // 전체 학생 명단 전달 (추가 모달용)
                    onBack={() => setSelectedClass(null)} 
                />
            ) : (
                <>
                    {/* [View 2] 대시보드 */}
                    {activeTab === 'dashboard' && (
                        <>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div><h2 className="text-2xl md:text-3xl font-bold text-gray-900">반갑습니다, <span style={{ color: BRAND_COLOR }}>{userName} 원장님</span> 👋</h2></div>
                                <div className="flex gap-3"><button onClick={() => setIsClassModalOpen(true)} className="text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:opacity-90 flex items-center transition-all active:scale-95" style={{ backgroundColor: BRAND_COLOR }}><Plus size={18} className="mr-2"/> 수업 추가</button></div>
                            </div>
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-4">내 수업 목록</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {classes.length > 0 ? (
                                        classes.map((cls) => (
                                            <div key={cls.id} onClick={() => setSelectedClass(cls)} className="group bg-white p-6 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><GraduationCap size={64} color={BRAND_COLOR} /></div>
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">{cls.target_grade}</span></div>
                                                    <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-800 transition-colors">{cls.name}</h4>
                                                    <div className="flex items-center text-gray-500 text-sm font-medium"><Clock size={14} className="mr-1.5" />{formatSchedule(cls.weekly_schedule)}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : <div onClick={() => setIsClassModalOpen(true)} className="col-span-full py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50"><Plus size={32} className="text-gray-400 mb-4" /><p className="text-gray-500 font-bold">수업이 없습니다</p></div>}
                                </div>
                            </section>
                        </>
                    )}

                    {/* [View 3] 원생 관리 */}
                    {activeTab === 'students' && (
                        <div className="max-w-5xl mx-auto">
                            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-900">원생 관리</h2><button onClick={() => setIsStudentModalOpen(true)} className="text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:opacity-90 flex items-center" style={{ backgroundColor: BRAND_COLOR }}><Plus size={18} className="mr-2"/> 원생 등록</button></div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                {students.length > 0 ? (
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="p-4 text-xs font-bold text-gray-500 uppercase">이름</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">정보</th><th className="p-4 text-xs font-bold text-gray-500 uppercase">연락처</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">{students.map((s) => (<tr key={s.id}><td className="p-4 font-bold">{s.name}</td><td className="p-4 text-sm">{s.school_name}</td><td className="p-4 text-sm">{s.parent?.phone_number}</td></tr>))}</tbody>
                                    </table>
                                ) : <div className="p-10 text-center text-gray-400">학생이 없습니다.</div>}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </main>

      {/* 모달 */}
      {isStudentModalOpen && <AddStudentModal onClose={() => setIsStudentModalOpen(false)} onSuccess={() => { setIsStudentModalOpen(false); fetchStudents(); }} />}
      {isClassModalOpen && <AddClassModal onClose={() => setIsClassModalOpen(false)} onSuccess={() => { setIsClassModalOpen(false); fetchClasses(); }} />}
    </div>
  );
}

// ----------------------------------------------------------------------
// [핵심] 수업 평가 화면 (수강생 관리 포함)
// ----------------------------------------------------------------------
function EvaluationView({ classInfo, allStudents, onBack }: { classInfo: ClassItem, allStudents: StudentItem[], onBack: () => void }) {
    const [enrolledStudents, setEnrolledStudents] = useState<StudentItem[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    
    // 평가 폼 상태
    const [loading, setLoading] = useState(false);
    const [score, setScore] = useState(80);
    const [homework, setHomework] = useState('완료');
    const [attitude, setAttitude] = useState('우수');
    const [comment, setComment] = useState('');
    const [topic, setTopic] = useState('');

    // [NEW] 공유용 상태
    const [savedReportUrl, setSavedReportUrl] = useState<string | null>(null);

    useEffect(() => { fetchEnrolledStudents(); }, [classInfo.id]);
    useEffect(() => { 
        // 학생 바뀌면 입력창 & 공유버튼 초기화
        setSavedReportUrl(null); 
        setScore(80); setHomework('완료'); setAttitude('우수'); setComment('');
    }, [selectedStudentId]);

    const fetchEnrolledStudents = async () => {
        const { data } = await supabase.from('class_enrollments').select(`student_id, student:students(*)`).eq('class_id', classInfo.id);
        const students = data?.map((item: any) => item.student) || [];
        // 부모 정보 매핑
        const enriched = students.map(s => allStudents.find(as => as.id === s.id) || s);
        setEnrolledStudents(enriched);
    };

    const handleSave = async () => {
        if (!selectedStudentId) return;
        setLoading(true);
        try {
            const topicJson = topic ? [{ topic: topic }] : [];
            
            // [중요] insert 후 select()를 붙여서 생성된 share_uuid를 받아옵니다.
            const { data, error } = await supabase.from('daily_logs').insert({
                student_id: selectedStudentId,
                class_id: classInfo.id,
                score, homework, attitude, teacher_comment: comment, topic_ids: topicJson
            }).select().single();

            if (error) throw error;
            
            // 공유 링크 생성
            const reportLink = `${window.location.origin}/report/${data.share_uuid}`;
            setSavedReportUrl(reportLink);
            
            alert('평가가 저장되었습니다! 📝\n이제 하단 버튼을 눌러 부모님께 전송하세요.');
        } catch (error: any) { alert(error.message); } finally { setLoading(false); }
    };

    const handleShare = async () => {
        if (!savedReportUrl) return;
        
        const studentName = enrolledStudents.find(s => s.id === selectedStudentId)?.name;
        const messageData = {
            title: `[Ban's Math] ${studentName} 학생 일일 리포트`,
            text: `${studentName} 학생의 오늘 수업 리포트가 도착했습니다. 링크를 눌러 확인해주세요.`,
            url: savedReportUrl
        };

        // 1. 모바일/태블릿: 시스템 공유창 열기 (카톡 선택 가능)
        if (navigator.share) {
            try {
                await navigator.share(messageData);
            } catch (err) {
                console.log('공유 취소됨');
            }
        } else {
            // 2. PC: 클립보드 복사
            await navigator.clipboard.writeText(savedReportUrl);
            alert('리포트 주소가 복사되었습니다! \n카카오톡에 붙여넣기(Ctrl+V) 하세요.');
        }
    };

    const selectedStudent = enrolledStudents.find(s => s.id === selectedStudentId);

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col">
            <div className="flex items-center mb-6 shrink-0">
                <button onClick={onBack} className="bg-white p-2 rounded-xl border border-gray-200 hover:bg-gray-50 mr-4"><ArrowLeft size={20}/></button>
                <div><h2 className="text-2xl font-bold text-gray-900 flex items-center">{classInfo.name} <span className="ml-2 text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">{classInfo.target_grade}</span></h2><p className="text-gray-500 text-sm">수강생 관리 및 평가</p></div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* 좌측: 학생 목록 */}
                <div className="w-1/3 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><span className="font-bold text-gray-500 text-xs uppercase">수강생 ({enrolledStudents.length}명)</span><button onClick={() => setIsEnrollModalOpen(true)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 flex items-center"><Plus size={12} className="mr-1"/> 추가</button></div>
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                        {enrolledStudents.map(student => (
                            <div key={student.id} onClick={() => setSelectedStudentId(student.id)} className={`p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 ${selectedStudentId === student.id ? 'bg-indigo-50 border-l-4 border-[#262e6f]' : ''}`}>
                                <div><p className="font-bold text-gray-900">{student.name}</p><p className="text-xs text-gray-500">{student.school_name}</p></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 우측: 평가 폼 */}
                <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm overflow-y-auto">
                    {selectedStudent ? (
                        <div className="space-y-8 animate-[fadeIn_0.3s]">
                            <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-gray-900"><span className="text-[#262e6f]">{selectedStudent.name}</span> 학생 평가</h3><span className="text-xs font-bold text-gray-400">연락처: {selectedStudent.parent?.phone_number || '-'}</span></div>
                            
                            <div><label className="block text-sm font-bold text-gray-700 mb-2">점수: <span className="text-[#262e6f]">{score}점</span></label><input type="range" min="0" max="100" step="5" value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#262e6f]" /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-2">과제</label><div className="flex gap-2">{['완료', '미흡', '미제출'].map(opt => (<button key={opt} onClick={() => setHomework(opt)} className={`flex-1 py-3 rounded-xl font-bold border ${homework === opt ? 'bg-[#262e6f] text-white' : 'bg-white text-gray-500'}`}>{opt}</button>))}</div></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-2">진도</label><input value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none font-bold text-sm"/></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-2">태도</label><select value={attitude} onChange={e => setAttitude(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none font-bold text-sm"><option>최상</option><option>우수</option><option>보통</option><option>노력요함</option></select></div>
                            </div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-2">코멘트</label><textarea value={comment} onChange={e => setComment(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none resize-none font-medium text-sm" rows={3}></textarea></div>

                            {/* [버튼 영역] 저장 전 vs 저장 후 */}
                            {!savedReportUrl ? (
                                <button onClick={handleSave} disabled={loading} className="w-full py-4 rounded-xl font-bold text-white shadow-lg" style={{ backgroundColor: BRAND_COLOR }}>
                                    {loading ? '저장 중...' : '평가 저장하기'}
                                </button>
                            ) : (
                                <div className="space-y-3 animate-[fadeIn_0.5s]">
                                    <div className="p-4 bg-green-50 text-green-700 rounded-xl text-center font-bold border border-green-200">
                                        ✅ 평가가 저장되었습니다!
                                    </div>
                                    <button onClick={handleShare} className="w-full py-4 rounded-xl font-bold text-[#391B1B] bg-[#FAE100] shadow-lg flex items-center justify-center hover:bg-[#FCE620] transition-colors">
                                        <MessageCircle size={20} className="mr-2"/> 카카오톡으로 전송하기
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : <div className="h-full flex flex-col items-center justify-center text-gray-400"><Users size={48} className="mb-4 text-gray-300"/><p className="font-bold text-lg">학생을 선택해주세요</p></div>}
                </div>
            </div>
            {isEnrollModalOpen && <EnrollStudentModal classId={classInfo.id} allStudents={allStudents} enrolledIds={enrolledStudents.map(s => s.id)} onClose={() => setIsEnrollModalOpen(false)} onSuccess={() => { setIsEnrollModalOpen(false); fetchEnrolledStudents(); }} />}
        </div>
    );
}
// ----------------------------------------------------------------------
// [NEW] 수강생 등록 모달
// ----------------------------------------------------------------------
function EnrollStudentModal({ classId, allStudents, enrolledIds, onClose, onSuccess }: { classId: number, allStudents: StudentItem[], enrolledIds: number[], onClose: () => void, onSuccess: () => void }) {
    // 아직 등록되지 않은 학생만 필터링
    const availableStudents = allStudents.filter(s => !enrolledIds.includes(s.id));
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    const handleEnroll = async () => {
        if (selectedIds.length === 0) return;
        
        // 일괄 등록 (Bulk Insert)
        const rows = selectedIds.map(sid => ({ class_id: classId, student_id: sid }));
        const { error } = await supabase.from('class_enrollments').insert(rows);
        
        if (error) alert(error.message);
        else onSuccess();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">수강생 추가</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {availableStudents.length > 0 ? availableStudents.map(s => (
                        <div key={s.id} onClick={() => toggleSelect(s.id)} className="p-3 flex items-center cursor-pointer hover:bg-gray-50 rounded-xl">
                            <div className={`mr-3 ${selectedIds.includes(s.id) ? 'text-indigo-600' : 'text-gray-300'}`}>
                                {selectedIds.includes(s.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">{s.name}</p>
                                <p className="text-xs text-gray-500">{s.school_name} ({s.grade})</p>
                            </div>
                        </div>
                    )) : <p className="text-center text-gray-400 py-10">추가할 수 있는 원생이 없습니다.</p>}
                </div>
                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleEnroll} disabled={selectedIds.length === 0} className="w-full py-3 rounded-xl font-bold text-white disabled:bg-gray-300" style={{ backgroundColor: selectedIds.length > 0 ? BRAND_COLOR : undefined }}>
                        {selectedIds.length}명 등록하기
                    </button>
                </div>
            </div>
        </div>
    );
}
function AddClassModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    
    // 입력 상태
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('중2'); // 기본값
    
    // 시간표 관리 상태 (JSON 구조용)
    const [schedules, setSchedules] = useState<TimeSlot[]>([]); // TimeSlot 타입은 상단에 정의되어 있어야 함
    const [tempDay, setTempDay] = useState('월');
    const [tempStart, setTempStart] = useState('18:00');
    const [tempEnd, setTempEnd] = useState('20:00');

    // 시간표 추가 버튼 핸들러
    const addSchedule = () => {
        setSchedules([...schedules, { day: tempDay, start_time: tempStart, end_time: tempEnd }]);
    };

    // 시간표 삭제 버튼 핸들러
    const removeSchedule = (index: number) => {
        setSchedules(schedules.filter((_, i) => i !== index));
    };

    // 저장 버튼 핸들러
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (schedules.length === 0) {
            alert('최소 1개 이상의 수업 시간을 추가해주세요!');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('classes').insert({
                name,
                target_grade: grade,    // 상세 학년 (예: "중2")
                weekly_schedule: schedules // JSON 데이터로 저장 (예: [{"day":"월",...}])
            });

            if (error) throw error;

            alert('수업이 개설되었습니다! 🎉');
            onSuccess(); // 모달 닫기 및 목록 새로고침
        } catch (error: any) {
            alert('오류 발생: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s]">
                
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">새 수업 개설</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20}/>
                    </button>
                </div>
                
                {/* 폼 */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    {/* 1. 수업명 입력 */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">수업명</label>
                        <input 
                            required 
                            placeholder="예: 서울대반 A" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#262e6f] font-bold" 
                        />
                    </div>

                    {/* 2. 대상 학년 선택 (버튼형) */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">대상 학년</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['중1','중2','중3','고1','고2','고3'].map((g) => (
                                <button 
                                    key={g} 
                                    type="button" 
                                    onClick={() => setGrade(g)}
                                    className={`p-2 rounded-lg text-sm font-bold border transition-colors
                                        ${grade === g 
                                            ? 'bg-[#262e6f] text-white border-[#262e6f]' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. 시간표 입력기 */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">수업 시간표</label>
                        
                        {/* 입력 컨트롤 */}
                        <div className="flex gap-2 mb-3">
                            <select 
                                value={tempDay} 
                                onChange={e => setTempDay(e.target.value)} 
                                className="bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold text-sm outline-none"
                            >
                                {['월','화','수','목','금','토','일'].map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            
                            <input 
                                type="time" 
                                value={tempStart} 
                                onChange={e => setTempStart(e.target.value)} 
                                className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none" 
                            />
                            <span className="self-center text-gray-400">~</span>
                            <input 
                                type="time" 
                                value={tempEnd} 
                                onChange={e => setTempEnd(e.target.value)} 
                                className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm outline-none" 
                            />
                            
                            <button 
                                type="button" 
                                onClick={addSchedule} 
                                className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg px-3 py-1 text-sm font-bold"
                            >
                                +
                            </button>
                        </div>

                        {/* 추가된 목록 보여주기 */}
                        <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[80px]">
                            {schedules.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-4">시간을 추가해주세요</p>
                            ) : (
                                schedules.map((sch, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="flex items-center text-sm font-bold text-gray-700">
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded mr-2 text-xs">{sch.day}요일</span>
                                            {sch.start_time} - {sch.end_time}
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeSchedule(idx)} 
                                            className="text-red-400 hover:text-red-600"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 저장 버튼 */}
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full py-4 mt-2 rounded-xl font-bold text-white shadow-lg flex items-center justify-center transition-transform active:scale-95" 
                        style={{ backgroundColor: BRAND_COLOR }}
                    >
                        {loading ? '저장 중...' : '수업 만들기'}
                    </button>
                </form>
            </div>
        </div>
    );
}
function AddStudentModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [school, setSchool] = useState('');
    const [grade, setGrade] = useState('중1');
    const [parentName, setParentName] = useState('');
    const [parentPhone, setParentPhone] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let parentId = null;
            const { data: existingParent } = await supabase.from('parents').select('id').eq('phone_number', parentPhone).single();
            if (existingParent) {
                parentId = existingParent.id;
            } else {
                const { data: newParent, error: parentError } = await supabase.from('parents').insert({ name: parentName, phone_number: parentPhone }).select().single();
                if (parentError) throw parentError;
                parentId = newParent.id;
            }
            const { error: studentError } = await supabase.from('students').insert({ name, school_name: school, grade, parent_id: parentId });
            if (studentError) throw studentError;
            alert('원생이 등록되었습니다!');
            onSuccess();
        } catch (error: any) { alert('등록 실패: ' + error.message); } finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">새 원생 등록</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">학생 정보</label>
                        <div className="grid grid-cols-2 gap-3">
                            <input required placeholder="이름" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#262e6f] font-bold" />
                            <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none font-medium">{['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3'].map(g => <option key={g} value={g}>{g}</option>)}</select>
                        </div>
                        <input required placeholder="학교명" value={school} onChange={e => setSchool(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#262e6f] font-medium" />
                    </div>
                    <hr className="border-gray-100"/>
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">학부모 정보</label>
                        <div className="grid grid-cols-2 gap-3">
                            <input required placeholder="학부모 성함" value={parentName} onChange={e => setParentName(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#262e6f] font-medium" />
                            <input required type="tel" placeholder="전화번호 (-없이)" value={parentPhone} onChange={e => setParentPhone(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-[#262e6f] font-medium" />
                        </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-4 mt-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center transition-transform active:scale-95" style={{ backgroundColor: BRAND_COLOR }}>{loading ? '저장 중...' : '저장하기'}</button>
                </form>
            </div>
        </div>
    )
}

function SidebarItem({ icon, label, active, onClick }: any) {
    return <div onClick={onClick} className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all font-bold ${active ? `bg-[#262e6f]/10 text-[#262e6f]` : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>{icon} <span>{label}</span></div>;
}
function StatCard({ icon, label, value, color }: any) {
    return <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4"><div className={`p-3 rounded-xl ${color}`}>{icon}</div><div><p className="text-xs text-gray-500 font-bold mb-0.5">{label}</p><p className="text-xl font-extrabold text-gray-900">{value}</p></div></div>;
}