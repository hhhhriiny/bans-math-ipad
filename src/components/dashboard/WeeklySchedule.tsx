import { Clock } from 'lucide-react';

interface TimeSlot {
  day: string;
  start: string;
  end: string;
}

interface ClassItem {
  id: number;
  name: string;
  target_grade: string;
  weekly_schedule: TimeSlot[];
}

interface Props {
  classes: ClassItem[];
  onSelectClass: (cls: ClassItem) => void;
}

// 2행으로 나누기 위한 설정
const ROW1 = ['월', '화', '수'];
const ROW2 = ['목', '금', '토'];

export default function WeeklySchedule({ classes, onSelectClass }: Props) {
  
  const getClassesForDay = (day: string) => {
    return classes
      .filter(cls => Array.isArray(cls.weekly_schedule) && cls.weekly_schedule.some((s: any) => s.day === day))
      .sort((a, b) => {
        const timeA = a.weekly_schedule.find((s: any) => s.day === day)?.start || '';
        const timeB = b.weekly_schedule.find((s: any) => s.day === day)?.start || '';
        return timeA.localeCompare(timeB);
      });
  };

  // 요일 행을 그려주는 공통 함수
  const renderRow = (days: string[]) => (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {days.map((day) => {
        const todaysClasses = getClassesForDay(day);
        return (
          <div key={day} className="min-w-0">
            {/* 요일 헤더 */}
            <div className="bg-indigo-600 text-white text-center py-2 rounded-t-lg font-bold text-sm shadow-sm">
              {day}
            </div>
            {/* 수업 카드 영역 */}
            <div className="bg-white border border-t-0 border-gray-200 min-h-[180px] rounded-b-lg p-2 space-y-2 shadow-sm">
              {todaysClasses.length > 0 ? (
                todaysClasses.map((cls) => {
                  const schedule = cls.weekly_schedule.find((s: any) => s.day === day);
                  return (
                    <div 
                      key={cls.id}
                      onClick={() => onSelectClass(cls)}
                      className="group p-2 rounded-lg cursor-pointer border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-1.5 py-0.5 rounded">
                          {cls.target_grade}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-800 text-sm mb-1 truncate leading-tight">
                        {cls.name}
                      </h4>
                      <div className="flex items-center text-gray-500 text-xs">
                        <Clock size={12} className="mr-1" />
                        {schedule?.start}~{schedule?.end}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 text-xs py-10 opacity-60">
                  <div className="w-1 h-1 bg-gray-300 rounded-full mb-1"></div>
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="pb-4">
      {renderRow(ROW1)}
      {renderRow(ROW2)}
    </div>
  );
}