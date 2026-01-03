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
        <Route path="/students" element={<StudentManager />} /> 
        <Route path="/Classes" element={<ClassManager />} />
        <Route path="/students/:id" element={<StudentDetail />} />
        <Route path="/payments" element={<PaymentManager />} />
        <Route path="/Settings" element={<Settings />} />
        {/* <Route path="/classes" element={<ClassManager />} /> */}
        {/* <Route path="/settings" element={<Settings />} /> */}
        <Route path="/report/:id" element={<Report />} />
      </Routes>
    </Router>
  );
}

export default App;