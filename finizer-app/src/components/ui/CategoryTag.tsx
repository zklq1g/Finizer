import React from "react";
import { ArrowDownIcon } from "../icons";

interface CategoryTagProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  iconBg?: string;
  onClick?: () => void;
  className?: string;
}

const CategoryTag: React.FC<CategoryTagProps> = ({
  label,
  value,
  icon,
  iconBg = "bg-[#FFE4F2]",
  onClick,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full bg-white rounded-[20px] px-5 py-4 flex items-center text-left shadow-sm shadow-black/[0.03] ${className}`}
    >
      {icon && (
        <div
          className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
        >
          {icon}
        </div>
      )}
      <div className={`flex-1 ${icon ? "ml-3" : ""}`}>
        <p className="text-[12px] text-[#99969E] font-normal">{label}</p>
        <p className="text-[15px] font-semibold text-[#120D26] mt-0.5">{value}</p>
      </div>
      <ArrowDownIcon className="w-4 h-4 text-[#120D26] shrink-0" />
    </button>
  );
};

export default CategoryTag;
