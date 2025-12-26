import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock } from 'lucide-react';
// 1. [추가] 페이지 이동을 위한 훅(Hook)을 가져옵니다.
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 2. [추가] 이동 함수 생성
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('로그인 실패: ' + error.message);
      setLoading(false); // 실패했을 때만 로딩 끄기
    } else {
      // 3. [핵심 수정] 성공 시 강제로 대시보드('/')로 이동시킵니다.
      navigate('/dashboard'); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* 아래 UI 코드는 기존과 동일합니다 */}
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Lock className="text-blue-600" size={32} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Ban's Math OS</h1>
        <p className="text-center text-gray-500 mb-8">원장님 로그인이 필요합니다</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            {loading ? '접속 중...' : '시스템 접속'}
          </button>
        </form>
      </div>
    </div>
  );
}