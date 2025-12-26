import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentManager from './pages/StudentManager';
import Report from './pages/Report';
import ClassManager from './pages/ClassManager';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<StudentManager />} /> 
        <Route path="/Classes" element={<ClassManager />} />
        {/* 추후 추가될 페이지들 */}
        {/* <Route path="/classes" element={<ClassManager />} /> */}
        {/* <Route path="/settings" element={<Settings />} /> */}
        <Route path="/report/:id" element={<Report />} />
      </Routes>
    </Router>
  );
}

export default App;