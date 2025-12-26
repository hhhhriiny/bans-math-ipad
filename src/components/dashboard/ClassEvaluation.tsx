import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, Users } from 'lucide-react';

interface Props {
  classInfo: any;
  onBack: () => void;
}

export default function ClassEvaluation({ classInfo, onBack }: Props) {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    fetchClassStudents();
  }, [classInfo]);

  const fetchClassStudents = async () => {
    // class_enrollments를 통해 해당 반 학생만 가져옴
    const { data } = await supabase
      .from('class_enrollments')
      .select('student:students(*)')
      .eq('class_id', classInfo.id);
      
    if (data) {
      setStudents(data.map((d: any) => d.student));
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {classInfo.name} <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">평가 모드</span>
          </h2>
          <p className="text-gray-500 text-sm">학생을 선택하여 수업 리포트를 작성하세요.</p>
        </div>
      </div>

      {/* 학생 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <div key={student.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-500 transition-all cursor-pointer">
             <div className="flex justify-between items-center mb-3">
               <h3 className="font-bold text-lg">{student.name}</h3>
               <span className="text-xs bg-gray-100 px-2 py-1 rounded">{student.school_name}</span>
             </div>
             <button className="w-full bg-indigo-50 text-indigo-700 font-bold py-2 rounded-lg hover:bg-indigo-100">
               평가하기
             </button>
          </div>
        ))}
        {students.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed">
            <Users size={32} className="mx-auto mb-2 opacity-50"/>
            등록된 학생이 없습니다.
          </div>
        )}
      </div>
      
      {/* 여기에 평가 모달(EvaluationModal) 코드 포함 가능 */}
    </div>
  );
}