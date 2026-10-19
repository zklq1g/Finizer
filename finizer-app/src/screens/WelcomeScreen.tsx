"use client";
import React from "react";
import Image from "next/image";
import { ArrowRightIcon } from "../components/icons";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Full-screen gradient background matching Figma */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 85% 0%, rgba(255, 249, 196, 0.5) 0%, transparent 50%),
            radial-gradient(ellipse at 0% 15%, rgba(200, 230, 201, 0.4) 0%, transparent 40%),
            radial-gradient(ellipse at 0% 75%, rgba(210, 196, 250, 0.35) 0%, transparent 45%),
            radial-gradient(ellipse at 100% 60%, rgba(210, 220, 255, 0.3) 0%, transparent 40%),
            radial-gradient(ellipse at 60% 100%, rgba(255, 249, 196, 0.4) 0%, transparent 35%),
            linear-gradient(180deg, #FFFFFF 0%, #F8F6FF 60%, #EDE8FB 100%)
          `,
        }}
      />

      {/* Hero Illustration Area */}
      <div className="relative flex-1 flex items-center justify-center pt-8 px-6">
        <div className="relative w-[300px] h-[340px]">
          <Image
            src="/images/hero-illustration.png"
            alt="Task Management Illustration"
            fill
            sizes="300px"
            className="object-contain"
            priority
          />
          {/* Decorative dots — positioned to match Figma */}
          <div className="absolute top-[56%] left-[12%] w-[7px] h-[7px] rounded-full bg-[#F48FB1] opacity-70" />
          <div className="absolute top-[8%] left-[42%] w-[5px] h-[5px] rounded-full bg-[#CE93D8] opacity-50" />
          <div className="absolute top-[5%] right-[18%] w-[7px] h-[7px] rounded-full bg-[#64B5F6] opacity-60" />
          <div className="absolute top-[57%] right-[22%] w-[9px] h-[9px] rounded-full bg-[#FFD54F] opacity-80" />
          <div className="absolute top-[55%] right-[10%] w-[6px] h-[6px] rounded-full bg-[#66BB6A] opacity-60" />
          <div className="absolute top-[52%] left-[32%] w-[5px] h-[5px] rounded-full bg-[#90CAF9] opacity-50" />
        </div>
      </div>

      {/* Text Content */}
      <div className="relative z-10 px-8 text-center">
        <h1 className="text-[28px] font-extrabold text-[#120D26] leading-[1.2] tracking-[-0.02em]">
          Task Management &<br />
          To-Do List
        </h1>
        <p className="mt-5 text-[15px] text-[#99969E] leading-[1.7] max-w-[280px] mx-auto">
          This productive tool is designed to help
          you better manage your task
          project-wise conveniently!
        </p>
      </div>

      {/* CTA Button */}
      <div className="relative z-10 px-6 pt-10 pb-12">
        <button
          onClick={onGetStarted}
          className="relative w-full bg-[#5F33E1] text-white rounded-full py-[18px] text-[16px] font-semibold shadow-xl shadow-[#5F33E1]/25 flex items-center justify-center active:scale-[0.98] transition-transform"
        >
          <span className="tracking-wide">Let{"\u2019"}s Start</span>
          <div className="absolute right-5 w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <ArrowRightIcon className="w-[18px] h-[18px] text-white" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
