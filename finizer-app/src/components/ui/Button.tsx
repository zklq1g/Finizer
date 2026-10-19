import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline";
  className?: string;
  type?: "button" | "submit";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
}) => {
  if (variant === "outline") {
    return (
      <button
        type={type}
        onClick={onClick}
        className={`border border-[#5F33E1] text-[#5F33E1] rounded-full px-5 py-2.5 text-[13px] font-medium transition-all hover:bg-[#EDE8FB] active:scale-95 ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`w-full bg-[#5F33E1] text-white rounded-full py-[18px] text-[16px] font-semibold shadow-xl shadow-[#5F33E1]/25 transition-all hover:bg-[#5029C9] active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
