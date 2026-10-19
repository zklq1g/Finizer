import React from "react";
import { CalendarIcon, ArrowDownIcon } from "../icons";

interface DateFieldProps {
  label: string;
  value: string;
  onClick?: () => void;
  className?: string;
}

const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full bg-white rounded-[20px] px-5 py-4 flex items-center text-left shadow-sm shadow-black/[0.03] ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-[#EDE8FB] flex items-center justify-center shrink-0">
        <CalendarIcon className="w-5 h-5 text-[#5F33E1]" />
      </div>
      <div className="flex-1 ml-3">
        <p className="text-[12px] text-[#99969E] font-normal">{label}</p>
        <p className="text-[15px] font-medium text-[#120D26] mt-0.5">{value}</p>
      </div>
      <ArrowDownIcon className="w-4 h-4 text-[#120D26] shrink-0" />
    </button>
  );
};

export default DateField;
