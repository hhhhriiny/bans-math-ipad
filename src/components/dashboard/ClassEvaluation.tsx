import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  ArrowLeft, Users, Calendar, CheckCircle, 
  XCircle, AlertCircle, Save, Share2 
} from 'lucide-react';

interface Props {
  classInfo: any;
  onBack: () => void;
}

export default function ClassEvaluation({ classInfo, onBack }: Props) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 평가 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // 입력 폼 상태
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('present'); 
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('완료');
  const [score, setScore] = useState<string>('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchClassStudents();
  }, [classInfo]);

  const fetchClassStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('class_enrollments')
      .select('student:students(*)')
      .eq('class_id', classInfo.id);
      
    if (data) {
      const studentList = data.map((d: any) => d.student).sort((a: any, b: any) => a.name.localeCompare(b.name));
      setStudents(studentList);
    }
    setLoading(false);
  };

  const openEvaluationModal = (student: any) => {
    setSelectedStudent(student);
    setStatus('present');
    setTopic('');
    setHomework('완료');
    setScore('');
    setComment('');
    setIsModalOpen(true);
  };

  // ★ [수정됨] 심플 공유 기능 (Web Share API)
  const handleShare = async (student: any) => {
    const reportUrl = `${window.location.origin}/report/${student.id}`;
    const shareData = {
      title: `[Ban's Math] ${student.name} 학생 리포트`,
      text: `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 수업 리포트가 도착했습니다.`,
      url: reportUrl,
    };

    // 1. 모바일 공유하기 (카톡, 문자 등 시스템 창 열기)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return; // 공유 성공 시 종료
      } catch (err) {
        console.log('공유 취소됨');
      }
    }

    // 2. PC거나 공유 기능 미지원 시 -> 클립보드 복사
    try {
      await navigator.clipboard.writeText(reportUrl);
      alert('성적표 링크가 복사되었습니다!\n학부모님께 전달해주세요.');
    } catch (err) {
      alert('링크 복사에 실패했습니다. 수동으로 복사해주세요.\n' + reportUrl);
    }
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    try {
      setLoading(true);
      const { error: attError } = await supabase.from('attendance_logs').upsert({
        student_id: selectedStudent.id,
        class_id: classInfo.id,
        status: status,
        created_date: reportDate,
        check_in_at: new Date().toISOString(), 
      }, { onConflict: 'student_id, created_date' });

      if (attError) throw attError;

      const finalScore = (status === 'absent' || !score) ? 0 : parseInt(score);
      const finalHomework = status === 'absent' ? '해당없음' : homework;
      const finalComment = status === 'absent' ? `[결석] ${comment}` : comment;

      const { error: repError } = await supabase.from('class_reports').insert({
        student_id: selectedStudent.id,
        class_id: classInfo.id,
        report_date: reportDate,
        topic_ids: JSON.stringify([topic]),
        homework: finalHomework,
        score: finalScore,
        teacher_comment: finalComment,
      });

      if (repError) throw repError;

      // 저장 후 바로 공유할지 묻기
      if (confirm('저장 완료! 학부모님께 바로 리포트를 보내시겠습니까?')) {
        handleShare(selectedStudent);
      }
      
      setIsModalOpen(false);
    } catch (error: any) {
      alert('오류 발생: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-10">
      <div className="flex items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {classInfo.name} 
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">평가 모드</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">학생을 선택하여 리포트를 작성하고 공유하세요.</p>
        </div>
      </div>

      {loading && !isModalOpen ? (
        <div className="text-center py-20 text-gray-400">데이터 로딩 중...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <div key={student.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <h3 className="font-bold text-xl text-gray-800">{student.name}</h3>
                   <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                     {student.school_name} {student.grade}
                   </span>
                 </div>
                 {/* 공유 버튼 (하나로 통합) */}
                 <button 
                  onClick={() => handleShare(student)}
                  className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 font-bold transition-colors"
                  title="리포트 공유하기"
                 >
                   <Share2 size={20} />
                 </button>
               </div>
               
               <button 
                onClick={() => openEvaluationModal(student)}
                className="w-full bg-gray-50 text-gray-600 font-bold py-3 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center gap-2"
               >
                 ✏️ 평가하기
               </button>
            </div>
          ))}
          
          {students.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
              <Users size={48} className="mx-auto mb-4 text-gray-300"/>
              <p className="text-gray-500 font-bold">학생이 없습니다.</p>
            </div>
          )}
        </div>
      )}
      
      {/* 평가 모달 */}
      {isModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="bg-indigo-600 p-5 flex justify-between items-center text-white">
              <div><h3 className="font-bold text-xl">{selectedStudent.name} 학생 평가</h3></div>
              <button onClick={() => setIsModalOpen(false)}><XCircle size={28} /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* 날짜 및 상태 선택 */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400"/>
                  <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="bg-transparent font-bold text-gray-700 outline-none"/>
                </div>
                <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                  {[{v:'present',l:'출석'},{v:'late',l:'지각'},{v:'absent',l:'결석'}].map(o=>(
                    <button key={o.v} onClick={()=>setStatus(o.v)} className={`px-3 py-1.5 text-xs font-bold rounded ${status===o.v?'bg-indigo-100 text-indigo-700':'text-gray-400'}`}>{o.l}</button>
                  ))}
                </div>
              </div>
              
              {status === 'absent' ? (
                <div><label className="block text-sm font-bold mb-2">결석 사유</label><textarea rows={3} value={comment} onChange={(e)=>setComment(e.target.value)} className="w-full border p-3 rounded-xl" placeholder="예: 병결"/></div>
              ) : (
                <div className="space-y-4">
                  <div><label className="block text-sm font-bold mb-1">진도</label><input type="text" value={topic} onChange={(e)=>setTopic(e.target.value)} className="w-full border p-3 rounded-xl" placeholder="진도 내용"/></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1">과제</label><select value={homework} onChange={(e)=>setHomework(e.target.value)} className="w-full border p-3 rounded-xl"><option value="완료">완료</option><option value="미흡">미흡</option><option value="미제출">미제출</option></select></div>
                    <div><label className="block text-sm font-bold mb-1">점수</label><input type="number" value={score} onChange={(e)=>setScore(e.target.value)} className="w-full border p-3 rounded-xl" placeholder="0"/></div>
                  </div>
                  <div><label className="block text-sm font-bold mb-1">코멘트</label><textarea rows={3} value={comment} onChange={(e)=>setComment(e.target.value)} className="w-full border p-3 rounded-xl" placeholder="특이사항"/></div>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-bold">취소</button>
              <button onClick={handleSave} className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2">
                <CheckCircle size={18} /> {loading ? '저장 중...' : '평가 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}