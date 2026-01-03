import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import MainLayout from '../layout/MainLayout';
import { 
  CreditCard, ChevronLeft, ChevronRight, CheckCircle, 
  MessageCircle, Settings, Search, AlertTriangle, RefreshCw 
} from 'lucide-react';

interface Student {
  id: number;
  name: string;
  grade: string;
  school_name: string;
  parent?: { phone_number: string; name: string };
  tuition_fee: number;
  payment_day: number;
  enrollment_date: string;
}

interface Payment {
  student_id: number;
  payment_date: string;
  amount: number;
}

export default function PaymentManager() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ★ 기본 수강료 설정값 상태
  const [defaultFees, setDefaultFees] = useState({ elem: 0, mid: 0, high: 0 });

  // 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ fee: 0, day: 1 });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. 학생 정보
      const { data: sData } = await supabase.from('students').select('*, parent:parents(*)').order('name');
      
      // 2. 전체 납부 기록
      const { data: pData } = await supabase.from('payments').select('*');

      // 3. ★ 설정된 기본 수강료 가져오기
      const { data: settingData } = await supabase.from('academy_settings').select('*');
      const fees = { elem: 0, mid: 0, high: 0 };
      
      if (settingData) {
        settingData.forEach(item => {
          if(item.key === 'fee_elementary') fees.elem = parseInt(item.value);
          if(item.key === 'fee_middle') fees.mid = parseInt(item.value);
          if(item.key === 'fee_high') fees.high = parseInt(item.value);
        });
      }

      setStudents(sData || []);
      setAllPayments(pData || []);
      setDefaultFees(fees); // 설정값 저장

    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  const moveMonth = (offset: number) => {
    setCurrentDate(new Date(year, month - 1 + offset, 1));
  };

  const calculateTotalUnpaid = (student: Student) => {
    if (!student.enrollment_date) return 0;
    let unpaidSum = 0;
    const today = new Date();
    let checkDate = new Date(student.enrollment_date);
    checkDate.setDate(1); 

    while (checkDate <= new Date(year, month, 0)) { 
      const checkYear = checkDate.getFullYear();
      const checkMonth = checkDate.getMonth() + 1;
      const lastDayOfMonth = new Date(checkYear, checkMonth, 0).getDate();
      const targetDay = Math.min(student.payment_day || 1, lastDayOfMonth);
      const paymentDeadline = new Date(checkYear, checkMonth - 1, targetDay);

      if (paymentDeadline > today) {
        checkDate.setMonth(checkDate.getMonth() + 1);
        continue;
      }

      const isPaid = allPayments.some(p => {
        const pDate = new Date(p.payment_date);
        return p.student_id === student.id && 
               pDate.getFullYear() === checkYear && 
               pDate.getMonth() + 1 === checkMonth;
      });

      if (!isPaid) unpaidSum += student.tuition_fee;
      checkDate.setMonth(checkDate.getMonth() + 1);
    }
    return unpaidSum;
  };

  const handlePayment = async (student: Student) => {
    if (!confirm(`${student.name} 학생의 ${month}월분 수강료(${student.tuition_fee.toLocaleString()}원)를 납부 처리하시겠습니까?`)) return;

    const { error } = await supabase.from('payments').insert({
      student_id: student.id,
      amount: student.tuition_fee,
      payment_date: new Date().toISOString().split('T')[0],
      method: 'card',
      memo: `${month}월분 수강료`
    });

    if (error) alert('실패: ' + error.message);
    else { alert('처리되었습니다.'); fetchData(); }
  };

  // ★ 학년에 따른 기본료 찾기 함수
  const getStandardFee = (grade: string) => {
    if (grade.includes('초')) return defaultFees.elem;
    if (grade.includes('중')) return defaultFees.mid;
    if (grade.includes('고')) return defaultFees.high;
    return 0;
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    
    // ★ 만약 현재 설정된 금액이 0원이면 -> 기본료를 자동으로 채워줌!
    let initialFee = student.tuition_fee;
    if (initialFee === 0) {
      initialFee = getStandardFee(student.grade);
    }

    setEditForm({ fee: initialFee, day: student.payment_day || 1 });
    setIsEditModalOpen(true);
  };

  const handleUpdateInfo = async () => {
    if (!editingStudent) return;
    const { error } = await supabase.from('students').update({
        tuition_fee: editForm.fee,
        payment_day: editForm.day
      }).eq('id', editingStudent.id);

    if (error) alert('수정 실패');
    else { setIsEditModalOpen(false); fetchData(); }
  };

  const sendSMS = (student: Student, totalUnpaid: number) => {
    if (!student.parent?.phone_number) return alert('연락처 없음');
    const message = `[Ban's Math] ${student.parent.name} 학부모님, 현재 총 미납 수강료는 ${totalUnpaid.toLocaleString()}원입니다. 확인 부탁드립니다.`;
    window.location.href = `sms:${student.parent.phone_number}?body=${encodeURIComponent(message)}`;
  };

  const processedData = students.filter(s => s.name.includes(searchTerm)).map(student => {
      const thisMonthPaid = allPayments.find(p => {
        const d = new Date(p.payment_date);
        return p.student_id === student.id && d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      const totalUnpaid = calculateTotalUnpaid(student);
      return { ...student, isPaid: !!thisMonthPaid, paidDate: thisMonthPaid?.payment_date, totalUnpaid };
    });

  const totalAmount = processedData.filter(s=>s.isPaid).reduce((sum, s) => sum + s.tuition_fee, 0);
  const unpaidCount = processedData.filter(s => !s.isPaid).length;

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border">
          <button onClick={() => moveMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft /></button>
          <h2 className="text-xl font-bold text-gray-800 w-32 text-center">{year}년 {month}월</h2>
          <button onClick={() => moveMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight /></button>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-md text-center">
            <p className="text-xs opacity-80 mb-1">이번 달 수납</p>
            <p className="text-xl font-bold">{totalAmount.toLocaleString()}원</p>
          </div>
          <div className="bg-white text-red-500 border border-red-100 px-5 py-3 rounded-xl shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1 font-bold">이번 달 미납</p>
            <p className="text-xl font-bold">{unpaidCount}명</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <Search size={18} className="text-gray-400" />
          <input type="text" placeholder="이름 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="outline-none text-sm w-full"/>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase font-bold">
              <tr>
                <th className="p-4">학생 정보</th>
                <th className="p-4">결제 설정</th>
                <th className="p-4 text-center">총 미납액 (누적)</th>
                <th className="p-4 text-center">이번 달 상태</th>
                <th className="p-4 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedData.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-gray-800">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.school_name} {student.grade}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div>
                        {/* 금액이 0원이면 빨간색으로 경고 */}
                        {student.tuition_fee > 0 ? (
                          <p className="font-bold text-gray-700">{student.tuition_fee.toLocaleString()}원</p>
                        ) : (
                          <p className="font-bold text-red-500 text-xs">금액 미설정</p>
                        )}
                        <p className="text-xs text-gray-400">매월 {student.payment_day}일</p>
                      </div>
                      <button onClick={() => openEditModal(student)} className="text-gray-300 hover:text-indigo-600"><Settings size={14} /></button>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {student.totalUnpaid > 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full">
                        <AlertTriangle size={14} /> {student.totalUnpaid.toLocaleString()}원
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {student.isPaid ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                        <CheckCircle size={12} /> 납부 완료
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">
                        미납
                      </span>
                    )}
                  </td>
                  <td className="p-4 flex justify-center gap-2">
                    {!student.isPaid ? (
                      <>
                        <button onClick={() => handlePayment(student)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">납부</button>
                        <button onClick={() => sendSMS(student, student.totalUnpaid)} className="bg-yellow-400 text-white px-2 py-1.5 rounded-lg hover:bg-yellow-500 shadow-sm"><MessageCircle size={16} /></button>
                      </>
                    ) : (
                      <button disabled className="text-gray-300 text-xs font-bold border px-3 py-1.5 rounded-lg">완료됨</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수정 모달 */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-4">{editingStudent.name} 납부 정보 수정</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">월 수강료</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={editForm.fee} 
                    onChange={e => setEditForm({...editForm, fee: parseInt(e.target.value)})}
                    className="w-full border p-2 rounded"
                  />
                  {/* ★ 기본 요금 적용 버튼 추가 */}
                  <button 
                    onClick={() => setEditForm({...editForm, fee: getStandardFee(editingStudent.grade)})}
                    className="whitespace-nowrap bg-gray-100 px-3 py-2 rounded text-xs font-bold text-gray-600 hover:bg-gray-200 flex items-center gap-1"
                    title="설정된 기본 수강료 적용"
                  >
                    <RefreshCw size={12} /> 초기화
                  </button>
                </div>
                {getStandardFee(editingStudent.grade) > 0 && (
                   <p className="text-[10px] text-indigo-500 mt-1">
                     * {editingStudent.grade}학년 기본 수강료: {getStandardFee(editingStudent.grade).toLocaleString()}원
                   </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">결제일 (매월)</label>
                <input 
                  type="number" 
                  value={editForm.day} 
                  onChange={e => setEditForm({...editForm, day: parseInt(e.target.value)})}
                  className="w-full border p-2 rounded"
                  max={31} min={1}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-500 text-sm">취소</button>
              <button onClick={handleUpdateInfo} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold">저장</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}