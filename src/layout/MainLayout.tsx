import React from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';

interface MainLayoutProps {
  // [수정 전] children: ReactNode;
  // [수정 후] 아래처럼 변경
  children: React.ReactNode; 
}

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: '대시보드', path: '/dashboard', icon: '📅' },
    { name: '수업 관리', path: '/classes', icon: '📚' },
    { name: '원생 관리', path: '/students', icon: '👨‍🎓' },
    { name: '설정', path: '/settings', icon: '⚙️' },
  ];

  const handleLogout = () => {
    // 로그아웃 로직 (나중에 Supabase auth.signOut 추가)
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* 1. 사이드바 (왼쪽 고정) */}
      <aside className="w-64 bg-white shadow-lg flex flex-col z-20">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">B</div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Bans Math</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t bg-gray-50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            🚪 로그아웃
          </button>
        </div>
      </aside>

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white h-16 shadow-sm flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-700">
            {menuItems.find(item => item.path === location.pathname)?.name || '학원 관리'}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">원장님, 환영합니다 👋</span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200"></div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}