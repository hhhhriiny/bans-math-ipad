import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout'; // ★ 공통 레이아웃 적용
import ClassEvaluation from '../components/dashboard/ClassEvaluation'; // (아래에서 만들 컴포넌트)

import { 
  Plus, GraduationCap, Clock, 
  // 필요한 아이콘들만 남김
} from 'lucide-react';

const BRAND_COLOR = '#262e6f';

// 타입 정의
type TimeSlot = { day: string; start_time: string; end_time: string; };
type ClassItem = { 
  id: number; 
  name: string; 
  target_grade: string; 
  weekly_schedule: TimeSlot[]; 
};

export default function Dashboard() {
  const [userName, setUserName] = useState('원장님');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  
  // 모달 상태
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchClasses();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserName(user.email.split('@')[0]);
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('id');
    setClasses(data || []);
  };

  const formatSchedule = (schedules: TimeSlot[]) => {
    if (!schedules || schedules.length === 0) return '시간 미정';
    // 예시: 월/수/금 18:00~
    const days = schedules.map(s => s.day).join('/');
    return `${days} ${schedules[0].start_time}~`;
  };

  return (
    // ★ 모든 내용을 MainLayout으로 감쌉니다. (사이드바 자동 생성)
    <MainLayout>
      
      {/* 1. 수업 선택 모드 (평가 화면) */}
      {selectedClass ? (
        <ClassEvaluation 
          classInfo={selectedClass} 
          onBack={() => setSelectedClass(null)} 
        />
      ) : (
        /* 2. 대시보드 메인 (시간표/리스트) */
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                반갑습니다, <span style={{ color: BRAND_COLOR }}>{userName} 원장님</span> 👋
              </h2>
              <p className="text-gray-500 mt-1">오늘의 수업 일정을 관리해보세요.</p>
            </div>
            <div>
              <button 
                onClick={() => setIsClassModalOpen(true)} 
                className="text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:opacity-90 flex items-center transition-all active:scale-95" 
                style={{ backgroundColor: BRAND_COLOR }}
              >
                <Plus size={18} className="mr-2"/> 수업 추가
              </button>
            </div>
          </div>

          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4">내 수업 목록</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <div 
                    key={cls.id} 
                    onClick={() => setSelectedClass(cls)} 
                    className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <GraduationCap size={64} color={BRAND_COLOR} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">
                          {cls.target_grade}
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-800 transition-colors">
                        {cls.name}
                      </h4>
                      <div className="flex items-center text-gray-500 text-sm font-medium">
                        <Clock size={14} className="mr-1.5" />
                        {formatSchedule(cls.weekly_schedule)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div 
                  onClick={() => setIsClassModalOpen(true)} 
                  className="col-span-full py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50"
                >
                  <Plus size={32} className="text-gray-400 mb-4" />
                  <p className="text-gray-500 font-bold">수업이 없습니다</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* 수업 추가 모달 (별도 컴포넌트로 분리 추천) */}
      {isClassModalOpen && (
        // <AddClassModal ... /> 여기에 모달 컴포넌트 사용
        <div>모달은 나중에 컴포넌트로 분리합시다</div>
      )}

    </MainLayout>
  );
}