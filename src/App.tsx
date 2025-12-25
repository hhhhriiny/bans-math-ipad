import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// [중요] 여기서 Report 파일을 불러와야 합니다!
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report'; 

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription }, } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="p-10">로딩 중...</div>;

  return (
    <Router>
      <Routes>
        {/* 1. 로그인 페이지 */}
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to="/" />} 
        />
        
        {/* [범인 검거] 이 줄이 없어서 에러가 났던 겁니다! */}
        {/* 학부모용 리포트 페이지 연결 */}
        <Route 
          path="/report/:uuid" 
          element={<Report />} 
        />
        
        {/* 3. 대시보드 (로그인 필수) */}
        <Route 
          path="/" 
          element={session ? <Dashboard /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;