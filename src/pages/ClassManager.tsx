import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout';
import { 
  Plus, Trash2, X, Clock, Users, CheckSquare, 
  Square, UserPlus, MoreVertical, Edit 
} from 'lucide-react';

interface TimeSlot { day: string; start: string; end: string; }
interface ClassItem { id: number; name: string; target_grade: string; weekly_schedule: TimeSlot[]; }
interface Student { 
  id: number; 
  name: string; 
  grade: string; 
  school_name: string; 
  class_enrollments?: { id: number }[]; 
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function ClassManager() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  
  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Set<number>>(new Set());

  // 수정/삭제 메뉴 상태 (어떤 카드의 메뉴가 열렸는지 ID 저장)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false); // 수정 모드 여부

  // 폼 상태
  const [className, setClassName] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('중');
  const [gradeLevel, setGradeLevel] = useState('1');
  const [schedules, setSchedules] = useState<TimeSlot[]>([{ day: '월', start: '18:00', end: '20:00' }]);

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, []);

  // 화면 아무데나 클릭하면 열린 메뉴 닫기
  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const fetchClasses = async () => {
    const { data, error } = await supabase.from('classes').select('*').order('id');
    if (!error) setClasses(data || []);
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*, class_enrollments(id)') 
      .order('name');
    if (!error) setAllStudents(data || []);
  };

  // --- [기능 1] 수업 등록/수정 모달 열기 ---
  
  // 신규 등록 모드
  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedClass(null);
    setClassName('');
    setSchoolLevel('중');
    setGradeLevel('1');
    setSchedules([{ day: '월', start: '18:00', end: '20:00' }]);
    setIsCreateModalOpen(true);
  };

  // 수정 모드
  const openEditModal = (cls: ClassItem) => {
    setIsEditing(true);
    setSelectedClass(cls);
    setClassName(cls.name);
    
    // 학년 파싱 (예: "중2" -> "중", "2")
    const level = cls.target_grade.charAt(0); // 첫 글자 (초, 중, 고)
    const grade = cls.target_grade.slice(1);  // 나머지 (1, 2, 3...)
    
    setSchoolLevel(level);
    setGradeLevel(grade);
    
    // 시간표가 있으면 불러오고, 없으면 기본값
    if (Array.isArray(cls.weekly_schedule) && cls.weekly_schedule.length > 0) {
      setSchedules(cls.weekly_schedule);
    } else {
      setSchedules([{ day: '월', start: '18:00', end: '20:00' }]);
    }
    
    setIsCreateModalOpen(true);
  };

  // 저장 (Create + Update)
  const handleSaveClass = async () => {
    if (!className) return alert('반 이름을 입력해주세요.');
    const finalTargetGrade = `${schoolLevel}${gradeLevel}`;
    const payload = {
      name: className,
      target_grade: finalTargetGrade,
      weekly_schedule: schedules,
    };

    let error;
    if (isEditing && selectedClass) {
      // 수정 (Update)
      const { error: updateError } = await supabase
        .from('classes')
        .update(payload)
        .eq('id', selectedClass.id);
      error = updateError;
    } else {
      // 생성 (Insert)
      const { error: insertError } = await supabase
        .from('classes')
        .insert(payload);
      error = insertError;
    }

    if (error) alert('실패: ' + error.message);
    else {
      alert(isEditing ? '수정되었습니다!' : '등록되었습니다!');
      setIsCreateModalOpen(false);
      fetchClasses();
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까? \n(연결된 수업 기록은 보존되지 않을 수 있습니다)')) return;
    await supabase.from('classes').delete().eq('id', id);
    fetchClasses();
  };

  // --- [기능 2] 학생 배정 ---
  const openStudentModal = async (cls: ClassItem) => {
    setSelectedClass(cls);
    const { data } = await supabase.from('class_enrollments').select('student_id').eq('class_id', cls.id);
    const ids = new Set((data || []).map((d: any) => d.student_id));
    setEnrolledStudentIds(ids);
    setIsStudentModalOpen(true);
  };

  const toggleStudentEnrollment = (studentId: number) => {
    const newSet = new Set(enrolledStudentIds);
    if (newSet.has(studentId)) newSet.delete(studentId);
    else newSet.add(studentId);
    setEnrolledStudentIds(newSet);
  };

  const saveEnrollments = async () => {
    if (!selectedClass) return;
    await supabase.from('class_enrollments').delete().eq('class_id', selectedClass.id);
    if (enrolledStudentIds.size > 0) {
      const rows = Array.from(enrolledStudentIds).map(sid => ({ class_id: selectedClass.id, student_id: sid }));
      const { error } = await supabase.from('class_enrollments').insert(rows);
      if (error) return alert('저장 실패: ' + error.message);
    }
    alert('학생 배정이 완료되었습니다!');
    setIsStudentModalOpen(false);
    fetchStudents();
  };

  // 헬퍼 함수
  const addScheduleSlot = () => setSchedules([...schedules, { day: '월', start: '18:00', end: '20:00' }]);
  const removeScheduleSlot = (idx: number) => setSchedules(schedules.filter((_, i) => i !== idx));
  const updateSchedule = (idx: number, key: keyof TimeSlot, val: string) => {
    const newSch = [...schedules]; newSch[idx][key] = val; setSchedules(newSch);
  };
  const getGradeOptions = () => Array.from({ length: schoolLevel === '초' ? 6 : 3 }, (_, i) => (i + 1).toString());

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📚 수업 관리</h1>
        <button 
          onClick={openCreateModal}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-bold shadow-md flex items-center gap-2 transition-all"
        >
          <Plus size={18} /> 수업 등록
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative group hover:border-indigo-300 transition-all">
            
            {/* 상단: 학년 배지 & 케밥 메뉴 */}
            <div className="flex justify-between items-start mb-4">
              <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                {cls.target_grade}
              </span>
              
              {/* 케밥 메뉴 컨테이너 */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // 이벤트 버블링 방지
                    setOpenMenuId(openMenuId === cls.id ? null : cls.id);
                  }}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <MoreVertical size={20} />
                </button>

                {/* 드롭다운 메뉴 (조건부 렌더링) */}
                {openMenuId === cls.id && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-10 overflow-hidden animate-fade-in">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(cls); setOpenMenuId(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit size={14} /> 수정
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); setOpenMenuId(null); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> 삭제
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">{cls.name}</h3>
            
            <div className="space-y-1 mb-4">
              {Array.isArray(cls.weekly_schedule) && cls.weekly_schedule.map((sch, idx) => (
                <div key={idx} className="flex items-center text-xs text-gray-600">
                  <Clock size={12} className="mr-1.5 text-indigo-400" />
                  <span className="font-bold mr-1">{sch.day}</span> 
                  {sch.start}~{sch.end}
                </div>
              ))}
            </div>

            <button 
              onClick={() => openStudentModal(cls)}
              className="w-full mt-2 bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 border border-gray-200 flex items-center justify-center gap-2 transition-colors"
            >
              <Users size={16} /> 학생 관리 / 배정
            </button>
          </div>
        ))}
      </div>

      {/* 수업 생성/수정 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg">{isEditing ? '수업 정보 수정' : '새 수업 등록'}</h3>
              <button onClick={() => setIsCreateModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold mb-1">반 이름</label>
                <input type="text" value={className} onChange={(e)=>setClassName(e.target.value)} className="w-full border p-2 rounded" placeholder="예: 중2 A반"/>
              </div>
              <div className="flex gap-2">
                 <select value={schoolLevel} onChange={(e)=>setSchoolLevel(e.target.value)} className="border p-2 rounded w-1/2"><option value="초">초</option><option value="중">중</option><option value="고">고</option></select>
                 <select value={gradeLevel} onChange={(e)=>setGradeLevel(e.target.value)} className="border p-2 rounded w-1/2">{getGradeOptions().map(g=><option key={g} value={g}>{g}학년</option>)}</select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">시간표</label>
                {schedules.map((sch, i) => (
                  <div key={i} className="flex gap-1 mb-2">
                    <select value={sch.day} onChange={(e)=>updateSchedule(i,'day',e.target.value)} className="border p-2 rounded">{DAYS.map(d=><option key={d} value={d}>{d}</option>)}</select>
                    <input type="time" value={sch.start} onChange={(e)=>updateSchedule(i,'start',e.target.value)} className="border p-2 rounded"/>
                    <input type="time" value={sch.end} onChange={(e)=>updateSchedule(i,'end',e.target.value)} className="border p-2 rounded"/>
                    <button onClick={()=>removeScheduleSlot(i)} className="text-red-500"><Trash2 size={16}/></button>
                  </div>
                ))}
                <button onClick={addScheduleSlot} className="text-indigo-600 text-sm font-bold">+ 시간 추가</button>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-2">
              <button onClick={()=>setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600">취소</button>
              <button onClick={handleSaveClass} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold">
                {isEditing ? '수정 완료' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 학생 배정 모달 (기존과 동일, 생략 없이 유지) */}
      {isStudentModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="bg-gray-800 p-4 flex justify-between items-center text-white">
              <div><h3 className="font-bold text-lg">{selectedClass.name}</h3><p className="text-xs text-gray-400">수강생을 선택해주세요</p></div>
              <button onClick={() => setIsStudentModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto bg-gray-50">
              {allStudents.length === 0 ? <div className="p-8 text-center text-gray-500">원생을 먼저 등록해주세요.</div> : (
                <div className="divide-y divide-gray-100">
                  {allStudents.sort((a, b) => {
                    const isTargetA = a.grade === selectedClass.target_grade;
                    const isTargetB = b.grade === selectedClass.target_grade;
                    const isUnassignedA = !a.class_enrollments || a.class_enrollments.length === 0;
                    const isUnassignedB = !b.class_enrollments || b.class_enrollments.length === 0;
                    if (isTargetA && isUnassignedA && (!isTargetB || !isUnassignedB)) return -1;
                    if (isTargetB && isUnassignedB && (!isTargetA || !isUnassignedA)) return 1;
                    if (isTargetA && !isTargetB) return -1;
                    if (isTargetB && !isTargetA) return 1;
                    return a.name.localeCompare(b.name);
                  }).map((student) => {
                    const isChecked = enrolledStudentIds.has(student.id);
                    const isTargetGrade = student.grade === selectedClass.target_grade;
                    const isUnassigned = !student.class_enrollments || student.class_enrollments.length === 0;
                    return (
                      <div key={student.id} onClick={() => toggleStudentEnrollment(student.id)} className={`flex items-center p-4 cursor-pointer hover:bg-indigo-50 transition-colors bg-white ${isChecked ? 'bg-indigo-50' : ''}`}>
                        <div className={`mr-4 ${isChecked ? 'text-indigo-600' : 'text-gray-300'}`}>{isChecked ? <CheckSquare size={24} /> : <Square size={24} />}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold ${isChecked ? 'text-indigo-900' : 'text-gray-700'}`}>{student.name}</p>
                            {isTargetGrade && isUnassigned && !isChecked && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><UserPlus size={10} /> 추천</span>}
                          </div>
                          <p className="text-xs text-gray-500">{student.school_name} ({student.grade})</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-white flex justify-end shadow-inner">
              <button onClick={saveEnrollments} className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">배정 완료 ({enrolledStudentIds.size}명)</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}