import { useEffect, useState } from 'react';
import MainLayout from '../layout/MainLayout';
import { supabase } from '../supabaseClient';
import { Plus, Search, User, Phone, GraduationCap, X, Save } from 'lucide-react';

// 데이터 타입 정의
interface Student {
  id: number;
  name: string;
  school_name: string;
  grade: string;
  // 부모님 정보는 Join으로 가져옵니다
  parent?: {
    name: string;
    phone_number: string;
  };
}

export default function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 입력 폼 상태
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('중');
  const [gradeLevel, setGradeLevel] = useState('1');
  
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    // parents 테이블과 조인해서 부모님 전화번호도 가져옵니다.
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        parent:parents (name, phone_number)
      `)
      .order('name', { ascending: true });
    
    if (error) console.error('Error loading students:', error);
    else setStudents(data || []);
    setLoading(false);
  };

  // 학생 등록 로직 (핵심)
  const handleAddStudent = async () => {
    if (!name || !parentPhone) return alert('학생 이름과 부모님 연락처는 필수입니다.');

    try {
      // 1. 부모님 존재 여부 확인 (전화번호 기준)
      let parentId: number;
      
      const { data: existingParent } = await supabase
        .from('parents')
        .select('id')
        .eq('phone_number', parentPhone)
        .single();

      if (existingParent) {
        // 이미 계신 부모님이면 그 ID 사용
        parentId = existingParent.id;
      } else {
        // 새로운 부모님이면 등록 후 ID 생성
        const { data: newParent, error: parentError } = await supabase
          .from('parents')
          .insert({
            name: parentName || `${name} 학부모님`, // 이름 없으면 자동 생성
            phone_number: parentPhone
          })
          .select()
          .single();

        if (parentError) throw parentError;
        parentId = newParent.id;
      }

      // 2. 학생 등록 (부모님 ID 연결)
      const finalGrade = `${schoolLevel}${gradeLevel}`; // 예: "중2"
      
      const { error: studentError } = await supabase.from('students').insert({
        name,
        school_name: schoolName,
        grade: finalGrade,
        parent_id: parentId
      });

      if (studentError) throw studentError;

      alert('학생이 성공적으로 등록되었습니다!');
      setIsModalOpen(false);
      fetchStudents(); // 목록 새로고침
      
      // 폼 초기화
      setName('');
      setSchoolName('');
      setParentName('');
      setParentPhone('');

    } catch (error: any) {
      alert('등록 중 오류 발생: ' + error.message);
    }
  };

  // 검색 필터링
  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || 
    s.school_name?.includes(searchTerm) ||
    s.parent?.phone_number.includes(searchTerm)
  );

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">👨‍🎓 원생 관리</h1>
        
        <div className="flex gap-3 w-full md:w-auto">
          {/* 검색창 */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="이름, 학교, 번호 검색" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-md flex items-center gap-2 whitespace-nowrap transition-transform active:scale-95"
          >
            <Plus size={18} /> 학생 등록
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">데이터를 불러오는 중입니다...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">이름 / 학교</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">학년</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase">학부모 연락처</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          {student.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.school_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-bold">
                        {student.grade}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-600">
                        <p className="font-medium">{student.parent?.name}</p>
                        <p className="text-gray-400 text-xs">{student.parent?.phone_number}</p>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                        재원중
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-gray-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 학생 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="bg-indigo-600 p-5 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <User size={20} /> 원생 등록
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-indigo-700 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* 섹션 1: 학생 정보 */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                  <GraduationCap size={16} className="text-indigo-600" /> 학생 정보
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">이름 <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="예: 홍길동"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">학교명</label>
                    <input 
                      type="text" 
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="예: 서울중"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">학교급</label>
                    <select 
                      value={schoolLevel}
                      onChange={(e) => { setSchoolLevel(e.target.value); setGradeLevel('1'); }}
                      className="w-full border p-2.5 rounded-lg bg-white"
                    >
                      <option value="초">초등학교</option>
                      <option value="중">중학교</option>
                      <option value="고">고등학교</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">학년</label>
                    <select 
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full border p-2.5 rounded-lg bg-white"
                    >
                      {Array.from({ length: schoolLevel === '초' ? 6 : 3 }, (_, i) => (
                        <option key={i+1} value={i+1}>{i+1}학년</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 섹션 2: 학부모 정보 */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                  <Phone size={16} className="text-indigo-600" /> 학부모 정보
                </h4>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">연락처 (필수) <span className="text-red-500">*</span></label>
                  <input 
                    type="tel" 
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value.replace(/[^0-9-]/g, ''))}
                    className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                    placeholder="010-1234-5678"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    * 이미 등록된 번호라면 기존 학부모 정보와 자동 연결됩니다.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">학부모 성함 (선택)</label>
                  <input 
                    type="text" 
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="입력하지 않으면 'OOO 학부모님'으로 저장됩니다."
                  />
                </div>
              </div>

            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleAddStudent}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg flex items-center gap-2 transform active:scale-95 transition-all"
              >
                <Save size={18} /> 저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}