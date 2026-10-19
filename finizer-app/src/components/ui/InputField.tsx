"use client";
import React from "react";

interface InputFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
  className = "",
}) => {
  return (
    <div
      className={`bg-white rounded-[20px] px-5 py-4 shadow-sm shadow-black/[0.03] ${className}`}
    >
      <label className="block text-[12px] text-[#99969E] mb-1.5 font-normal">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={5}
          className="w-full text-[#120D26] text-[15px] font-medium bg-transparent outline-none resize-none leading-[1.7]"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full text-[#120D26] text-[15px] font-medium bg-transparent outline-none"
        />
      )}
    </div>
  );
};

export default InputField;
