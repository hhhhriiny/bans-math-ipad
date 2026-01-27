import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard,
  BookOpen, 
  Users, 
  Settings, 
  LogOut,
  Menu, 
  X,
  FileText // [추가] 레포트 아이콘
} from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // [수정] 레포트 관리 메뉴 추가
  const menuItems = [
    { name: '홈', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: '수업 관리', path: '/classes', icon: <BookOpen size={20} /> },
    { name: '원생 관리', path: '/students', icon: <Users size={20} /> },
    { name: '레포트 관리', path: '/reports', icon: <FileText size={20} /> }, // 새로 추가됨
    { name: '수납 관리', path: '/payments', icon: <CreditCard size={20} /> },
    { name: '설정', path: '/settings', icon: <Settings size={20} /> },
  ];

  const handleLogout = async () => {
    navigate('/');
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* 1. 모바일 오버레이 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 2. 사이드바 */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg flex flex-col border-r border-gray-200 transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 h-16 md:h-20 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">B</div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Ban's Math</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleMenuClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={`transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'}`}>
                  {item.icon}
                </span>
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t bg-gray-50 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 3. 메인 컨텐츠 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white h-16 shadow-sm flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            
            <h2 className="text-lg font-bold text-gray-800 truncate">
              {menuItems.find(item => item.path === location.pathname)?.name || '학원 관리'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium hidden md:block">원장님, 환영합니다 👋</span>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-bold text-sm">
              T
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto w-full pb-20">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}