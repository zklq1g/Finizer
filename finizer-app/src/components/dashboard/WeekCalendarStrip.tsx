"use client";
import React from "react";

interface DayItem {
  month: string;
  day: number;
  dayName: string;
  isActive?: boolean;
}

interface WeekCalendarStripProps {
  days: DayItem[];
  onDaySelect?: (index: number) => void;
}

const WeekCalendarStrip: React.FC<WeekCalendarStripProps> = ({
  days,
  onDaySelect,
}) => {
  return (
    <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
      {days.map((day, index) => (
        <button
          key={index}
          onClick={() => onDaySelect?.(index)}
          className={`flex flex-col items-center min-w-[62px] rounded-[18px] py-3.5 px-3 transition-all duration-200 ${
            day.isActive
              ? "bg-[#5F33E1] text-white shadow-lg shadow-[#5F33E1]/30 scale-105"
              : "bg-white text-[#120D26] shadow-sm shadow-black/[0.04]"
          }`}
        >
          <span
            className={`text-[11px] font-medium ${
              day.isActive ? "text-white/80" : "text-[#99969E]"
            }`}
          >
            {day.month}
          </span>
          <span className="text-[24px] font-bold leading-tight mt-1">
            {day.day}
          </span>
          <span
            className={`text-[11px] font-medium mt-0.5 ${
              day.isActive ? "text-white" : "text-[#99969E]"
            }`}
          >
            {day.dayName}
          </span>
        </button>
      ))}
    </div>
  );
};

export default WeekCalendarStrip;
