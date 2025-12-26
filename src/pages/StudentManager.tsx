import { useEffect, useState } from 'react';
import MainLayout from '../layout/MainLayout';
import { supabase } from '../supabaseClient';

// 데이터 타입 정의
interface Student {
  id: number;
  name: string;
  school_name: string;
  grade: string;
  parent_phone?: string;
}

// ★ 아래 줄에 'export default'가 꼭 있어야 합니다!
export default function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('grade', { ascending: true }) // 학년순 정렬
      .order('name', { ascending: true }); // 이름순 정렬
    
    if (error) {
      console.error('Error loading students:', error);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👨‍🎓 원생 관리</h1>
        <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-bold shadow-md transition-all">
          + 학생 등록
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">데이터를 불러오는 중입니다...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-500 uppercase">이름</th>
                <th className="p-4 text-sm font-semibold text-gray-500 uppercase">학교 / 학년</th>
                <th className="p-4 text-sm font-semibold text-gray-500 uppercase">상태</th>
                <th className="p-4 text-sm font-semibold text-gray-500 uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-4 font-bold text-gray-800">{student.name}</td>
                  <td className="p-4 text-gray-600">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs mr-2">{student.grade}</span>
                    {student.school_name}
                  </td>
                  <td className="p-4">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                      재원중
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
                      상세보기 &rarr;
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">등록된 학생이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}