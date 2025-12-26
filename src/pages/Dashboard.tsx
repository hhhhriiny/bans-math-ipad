import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout';
// 분리한 컴포넌트들 불러오기
import WeeklySchedule from '../components/dashboard/WeeklySchedule';
import ClassEvaluation from '../components/dashboard/ClassEvaluation';

import { Plus } from 'lucide-react';

const BRAND_COLOR = '#262e6f';

export default function Dashboard() {
  const [userName, setUserName] = useState('원장님');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  
  useEffect(() => {
    fetchUserData();
    fetchClasses();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserName(user.email.split('@')[0]);
  };

  const fetchClasses = async () => {
    // classes 테이블에서 시간표(weekly_schedule) 정보를 포함해서 가져옴
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name');
    
    if (error) console.error('Error fetching classes:', error);
    else setClasses(data || []);
  };

  return (
    <MainLayout>
      {/* 1. 수업이 선택되었을 때 -> 평가 모드 화면 표시 */}
      {selectedClass ? (
        <ClassEvaluation 
          classInfo={selectedClass} 
          onBack={() => setSelectedClass(null)} 
        />
      ) : (
        /* 2. 평소 화면 -> 대시보드 (환영 메시지 + 시간표) */
        <div className="animate-fade-in-up">
          {/* 상단 헤더 영역 */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                반갑습니다, <span style={{ color: BRAND_COLOR }}>{userName}</span>님 👋
              </h2>
              <p className="text-gray-500 mt-2">
                오늘의 수업 일정을 한눈에 확인하고 학생들을 관리하세요.
              </p>
            </div>
            <div>
              <button 
                className="text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:opacity-90 flex items-center transition-all active:scale-95" 
                style={{ backgroundColor: BRAND_COLOR }}
                onClick={() => alert('수업 추가 기능은 설정 페이지에서 가능합니다.')}
              >
                <Plus size={18} className="mr-2"/> 수업 추가
              </button>
            </div>
          </div>

          {/* 주간 시간표 컴포넌트 */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                📅 주간 시간표
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                수업을 클릭하여 출석/평가를 진행하세요
              </span>
            </div>
            
            {/* ★ 여기서 WeeklySchedule 컴포넌트를 사용합니다! */}
            <WeeklySchedule 
              classes={classes} 
              onSelectClass={(cls) => setSelectedClass(cls)} 
            />
          </section>
        </div>
      )}
    </MainLayout>
  );
}