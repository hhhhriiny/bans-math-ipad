import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentManager from './pages/StudentManager';
import Report from './pages/Report';
import ClassManager from './pages/ClassManager';
import StudentDetail from './pages/StudentDetail';
import PaymentManager from './pages/PaymentManager';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        <Route path="/classes" element={<ClassManager />} />
        
        <Route path="/students" element={<StudentManager />} /> 
        <Route path="/students/:id" element={<StudentDetail />} />
        
        {/* [추가] 사이드바 '레포트 관리' 클릭 시 이동할 경로 */}
        <Route path="/reports" element={<Report />} />
        
        {/* [유지] 학부모 공유용 등 특정 ID로 접근할 때 (필요시 사용) */}
        <Route path="/report/:id" element={<Report />} />

        <Route path="/payments" element={<PaymentManager />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;