import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout';
import { 
  Save, Lock, Building, DollarSign, RefreshCw, 
  ChevronRight, ArrowLeft, ShieldCheck 
} from 'lucide-react';

// 설정 섹션 타입 정의
type SettingSection = 'menu' | 'info' | 'fees' | 'security';

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingSection>('menu');
  const [loading, setLoading] = useState(false);
  
  // 데이터 상태
  const [academyName, setAcademyName] = useState('');
  const [academyPhone, setAcademyPhone] = useState('');
  const [feeElem, setFeeElem] = useState('');
  const [feeMid, setFeeMid] = useState('');
  const [feeHigh, setFeeHigh] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('academy_settings').select('*');
    if (data) {
      const settingsMap: any = {};
      data.forEach(item => settingsMap[item.key] = item.value);

      setAcademyName(settingsMap['academy_name'] || '');
      setAcademyPhone(settingsMap['academy_phone'] || '');
      setFeeElem(settingsMap['fee_elementary'] || '0');
      setFeeMid(settingsMap['fee_middle'] || '0');
      setFeeHigh(settingsMap['fee_high'] || '0');
    }
  };

  const handleSaveInfo = async () => {
    setLoading(true);
    const updates = [
      { key: 'academy_name', value: academyName },
      { key: 'academy_phone', value: academyPhone },
    ];
    const { error } = await supabase.from('academy_settings').upsert(updates);
    setLoading(false);
    
    if (error) alert('저장 실패: ' + error.message);
    else {
      alert('학원 정보가 저장되었습니다.');
      setActiveSection('menu');
    }
  };

  const handleSaveFees = async () => {
    if(!confirm('기본 수강료를 변경하시겠습니까?\n기존 학생들의 수강료는 변하지 않고, 신규 등록 시 기본값으로 사용됩니다.')) return;

    setLoading(true);
    const updates = [
      { key: 'fee_elementary', value: feeElem },
      { key: 'fee_middle', value: feeMid },
      { key: 'fee_high', value: feeHigh },
    ];
    const { error } = await supabase.from('academy_settings').upsert(updates);
    setLoading(false);
    
    if (error) alert('저장 실패: ' + error.message);
    else {
      alert('수강료 기준이 변경되었습니다.');
      setActiveSection('menu');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) return alert('비밀번호는 6자리 이상이어야 합니다.');
    if (newPassword !== confirmPassword) return alert('비밀번호가 일치하지 않습니다.');
    if (!confirm('정말 비밀번호를 변경하시겠습니까?')) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    
    if (error) alert('변경 실패: ' + error.message);
    else {
      alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
      setNewPassword('');
      setConfirmPassword('');
      setActiveSection('menu');
    }
  };

  // --- 화면 렌더링 함수들 ---

  // 1. 메인 메뉴 화면
  const renderMenu = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
      {/* 메뉴 카드 1 */}
      <button 
        onClick={() => setActiveSection('info')}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group"
      >
        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <Building size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">학원 정보 설정</h3>
        <p className="text-sm text-gray-500 mb-4">학원명, 대표 전화번호 등 기본 정보를 수정합니다.</p>
        <div className="flex items-center text-indigo-600 text-sm font-bold">
          설정하기 <ChevronRight size={16} />
        </div>
      </button>

      {/* 메뉴 카드 2 */}
      <button 
        onClick={() => setActiveSection('fees')}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-green-500 hover:shadow-md transition-all text-left group"
      >
        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
          <DollarSign size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">수강료 기준 관리</h3>
        <p className="text-sm text-gray-500 mb-4">학년별 기본 수강료를 설정합니다. (초/중/고)</p>
        <div className="flex items-center text-green-600 text-sm font-bold">
          관리하기 <ChevronRight size={16} />
        </div>
      </button>

      {/* 메뉴 카드 3 */}
      <button 
        onClick={() => setActiveSection('security')}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-red-500 hover:shadow-md transition-all text-left group"
      >
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
          <ShieldCheck size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">계정 보안 설정</h3>
        <p className="text-sm text-gray-500 mb-4">로그인 비밀번호를 변경하여 보안을 강화합니다.</p>
        <div className="flex items-center text-red-600 text-sm font-bold">
          변경하기 <ChevronRight size={16} />
        </div>
      </button>
    </div>
  );

  // 2. 학원 정보 입력 화면
  const renderInfoForm = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <Building size={24} className="text-indigo-600" /> 학원 정보 설정
        </h2>
        <p className="text-gray-500 text-sm mt-1">리포트 및 문자 발송 시 표시될 정보입니다.</p>
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">학원명</label>
          <input type="text" value={academyName} onChange={e => setAcademyName(e.target.value)} className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">대표 전화번호</label>
          <input type="text" value={academyPhone} onChange={e => setAcademyPhone(e.target.value)} className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={() => setActiveSection('menu')} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSaveInfo} disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex justify-center gap-2">
            <Save size={18} /> {loading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );

  // 3. 수강료 입력 화면
  const renderFeeForm = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <DollarSign size={24} className="text-green-600" /> 수강료 기준 관리
        </h2>
        <p className="text-gray-500 text-sm mt-1">신규 원생 등록 시 적용될 기본 금액을 설정합니다.</p>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">초등부</label>
            <input type="number" value={feeElem} onChange={e => setFeeElem(e.target.value)} className="w-full border p-3 rounded-xl text-right font-bold" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">중등부</label>
            <input type="number" value={feeMid} onChange={e => setFeeMid(e.target.value)} className="w-full border p-3 rounded-xl text-right font-bold" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">고등부</label>
            <input type="number" value={feeHigh} onChange={e => setFeeHigh(e.target.value)} className="w-full border p-3 rounded-xl text-right font-bold" />
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl text-sm text-yellow-800 border border-yellow-100 flex items-start gap-2">
          <div className="mt-0.5">⚠️</div>
          <p>이 설정은 <b>신규 등록 학생</b>의 기본값에만 영향을 줍니다.<br/>이미 등록된 학생의 수강료는 '수납 관리' 메뉴에서 개별 수정해야 합니다.</p>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setActiveSection('menu')} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSaveFees} disabled={loading} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex justify-center gap-2">
            <Save size={18} /> {loading ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </div>
    </div>
  );

  // 4. 보안 설정 화면
  const renderSecurityForm = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <ShieldCheck size={24} className="text-red-600" /> 계정 보안 설정
        </h2>
        <p className="text-gray-500 text-sm mt-1">안전한 학원 운영을 위해 비밀번호를 관리하세요.</p>
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">새 비밀번호</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="6자리 이상 입력" className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-red-200" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">새 비밀번호 확인</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-red-200" />
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={() => setActiveSection('menu')} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleChangePassword} disabled={loading} className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black flex justify-center gap-2">
            <RefreshCw size={18} /> {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="mb-6 flex items-center gap-3">
        {activeSection !== 'menu' && (
          <button onClick={() => setActiveSection('menu')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-800">
          {activeSection === 'menu' ? '환경 설정' : '설정 수정'}
        </h1>
      </div>

      {activeSection === 'menu' && renderMenu()}
      {activeSection === 'info' && renderInfoForm()}
      {activeSection === 'fees' && renderFeeForm()}
      {activeSection === 'security' && renderSecurityForm()}
    </MainLayout>
  );
}