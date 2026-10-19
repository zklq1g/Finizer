"use client";
import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  cueText?: string;
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  cueText = "Tap + below to start",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6 animate-fade-in">
      {/* Icon Bubble */}
      <div className="w-20 h-20 bg-[#EDE8FB] rounded-full flex items-center justify-center mb-6 shadow-sm shadow-[#5F33E1]/10">
        <div className="text-[#5F33E1] scale-125">{icon}</div>
      </div>

      <h2 className="text-xl font-extrabold text-[#120D26] mb-2">{title}</h2>
      <p className="text-[#99969E] text-sm leading-relaxed mb-8 max-w-[260px]">
        {subtitle}
      </p>

      {/* Visual cue pointing down to the FAB */}
      <div className="flex flex-col items-center text-[#5F33E1] animate-bounce">
        <span className="text-xs font-bold tracking-wide mb-1.5">{cueText}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="19 12 12 19 5 12"></polyline>
        </svg>
      </div>
    </div>
  );
}
