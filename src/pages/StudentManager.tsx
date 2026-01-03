import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout';
import { 
  UserPlus, Search, Trash2, Phone, School, 
  GraduationCap, MoreHorizontal, Calendar 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Student {
  id: number;
  name: string;
  school_name: string;
  grade: string;
  parent_phone: string;
  enrollment_date: string;
}

export default function StudentManager() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    school_name: '',
    grade: '초1', // 기본값
    parent_name: '',
    parent_phone: '',
    enrollment_date: new Date().toISOString().split('T')[0] // ★ 기본값: 오늘 날짜
  });

  // ★ 자동 수강료 설정을 위한 기준표
  const [defaultFees, setDefaultFees] = useState({ elem: 0, mid: 0, high: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // 1. 학생 목록 가져오기
    const { data: sData } = await supabase
      .from('students')
      .select('*, parent:parents(name, phone_number)')
      .order('enrollment_date', { ascending: false }); // 최신 등록순

    if (sData) {
      const formatted = sData.map(s => ({
        ...s,
        parent_phone: s.parent?.phone_number || '',
        parent_name: s.parent?.name || ''
      }));
      setStudents(formatted);
    }

    // 2. ★ 설정된 기본 수강료 미리 가져오기 (등록 시 자동 입력을 위해)
    const { data: settingData } = await supabase.from('academy_settings').select('*');
    if (settingData) {
      const fees = { elem: 0, mid: 0, high: 0 };
      settingData.forEach(item => {
        if(item.key === 'fee_elementary') fees.elem = parseInt(item.value);
        if(item.key === 'fee_middle') fees.mid = parseInt(item.value);
        if(item.key === 'fee_high') fees.high = parseInt(item.value);
      });
      setDefaultFees(fees);
    }
    
    setLoading(false);
  };

  // 학년에 따른 수강료 자동 계산 함수
  const getAutoFee = (grade: string) => {
    if (grade.includes('초')) return defaultFees.elem;
    if (grade.includes('중')) return defaultFees.mid;
    if (grade.includes('고')) return defaultFees.high;
    return 0;
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.parent_phone) return alert('이름과 부모님 연락처는 필수입니다.');

    // 1. 부모님 정보 먼저 등록 (또는 찾기) -> 로직 간소화를 위해 무조건 신규 생성 가정 (실무에선 검색 필요)
    // 여기서는 간단하게 부모님 정보를 먼저 넣고 ID를 가져옵니다.
    const { data: parentData, error: pError } = await supabase
      .from('parents')
      .insert({ 
        name: newStudent.parent_name || `${newStudent.name} 학부모`, 
        phone_number: newStudent.parent_phone 
      })
      .select()
      .single();

    if (pError) {
      alert('학부모 등록 실패: ' + pError.message);
      return;
    }

    // 2. ★ 학생 등록 (여기가 핵심!)
    // 가입일에 맞춰서 -> 결제일(payment_day) 자동 설정
    // 학년에 맞춰서 -> 수강료(tuition_fee) 자동 설정
    const payDay = new Date(newStudent.enrollment_date).getDate();
    const autoFee = getAutoFee(newStudent.grade);

    const { error: sError } = await supabase.from('students').insert({
      name: newStudent.name,
      school_name: newStudent.school_name,
      grade: newStudent.grade,
      parent_id: parentData.id,
      enrollment_date: newStudent.enrollment_date, // 입력받은 날짜
      payment_day: payDay,   // 날짜의 '일'을 결제일로
      tuition_fee: autoFee   // ★ 학년에 맞는 금액 자동 입력!
    });

    if (sError) alert('학생 등록 실패: ' + sError.message);
    else {
      alert(`${newStudent.name} 학생이 등록되었습니다.\n수강료(${autoFee.toLocaleString()}원)가 자동 설정되었습니다.`);
      setIsModalOpen(false);
      setNewStudent({ // 폼 초기화
        name: '', school_name: '', grade: '초1', parent_name: '', parent_phone: '',
        enrollment_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm('정말 삭제하시겠습니까? 관련 데이터가 모두 삭제될 수 있습니다.')) return;
    await supabase.from('students').delete().eq('id', id);
    fetchData();
  };

  // 검색 필터링
  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || s.school_name.includes(searchTerm)
  );

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">원생 관리</h1>
          <p className="text-gray-500 text-sm">현재 총 {students.length}명의 학생이 수강 중입니다.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
        >
          <UserPlus size={20} /> 신규 원생 등록
        </button>
      </div>

      {/* 검색창 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex items-center gap-3">
        <Search className="text-gray-400" />
        <input 
          type="text" 
          placeholder="이름 또는 학교명으로 검색..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full outline-none text-gray-700"
        />
      </div>

      {/* 학생 목록 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => (
          <div 
            key={student.id} 
            onClick={() => navigate(`/students/${student.id}`)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group relative"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl">
                {student.name[0]}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{student.name}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar size={12}/> {student.enrollment_date} 등록
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <School size={16} className="text-gray-400"/> {student.school_name}
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap size={16} className="text-gray-400"/> {student.grade}
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400"/> {student.parent_phone || '연락처 없음'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 신규 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-indigo-600 p-6 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserPlus size={24} /> 신규 원생 등록
              </h2>
              <p className="text-indigo-100 text-sm mt-1">학생의 기본 정보를 입력해주세요.</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* 이름 & 등록일 (한 줄에 배치) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">학생 이름 *</label>
                  <input 
                    type="text" value={newStudent.name} 
                    onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                    className="w-full border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-2 transition-colors"
                    placeholder="예: 홍길동"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">가입일 (등록일) *</label>
                  <input 
                    type="date" value={newStudent.enrollment_date} 
                    onChange={e => setNewStudent({...newStudent, enrollment_date: e.target.value})}
                    className="w-full border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-2 transition-colors"
                  />
                </div>
              </div>

              {/* 학교 & 학년 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">학교명</label>
                  <input 
                    type="text" value={newStudent.school_name} 
                    onChange={e => setNewStudent({...newStudent, school_name: e.target.value})}
                    className="w-full border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-2"
                    placeholder="예: 반스중"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">학년</label>
                  <select 
                    value={newStudent.grade}
                    onChange={e => setNewStudent({...newStudent, grade: e.target.value})}
                    className="w-full border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-2 bg-white"
                  >
                    <option value="초1">초1</option><option value="초2">초2</option><option value="초3">초3</option>
                    <option value="초4">초4</option><option value="초5">초5</option><option value="초6">초6</option>
                    <option value="중1">중1</option><option value="중2">중2</option><option value="중3">중3</option>
                    <option value="고1">고1</option><option value="고2">고2</option><option value="고3">고3</option>
                  </select>
                </div>
              </div>

              {/* 학부모 정보 */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">학부모 연락처 *</label>
                <input 
                  type="tel" value={newStudent.parent_phone} 
                  onChange={e => setNewStudent({...newStudent, parent_phone: e.target.value})}
                  className="w-full border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-2"
                  placeholder="010-1234-5678"
                />
              </div>

            </div>

            <div className="p-4 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleAddStudent}
                className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all hover:-translate-y-0.5"
              >
                등록 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}