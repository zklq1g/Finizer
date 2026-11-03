"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface AdminLockScreenProps {
  onUnlock: () => void;
}

const PASSCODE_LENGTH = 6;

// Backspace SVG icon
const BackspaceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21 6.5H9.83a2 2 0 0 0-1.42.59l-5.3 5.3a.99.99 0 0 0 0 1.41l5.3 5.3A2 2 0 0 0 9.83 19.7H21a2 2 0 0 0 2-2v-9.2a2 2 0 0 0-2-2zm-3.29 8.79a.75.75 0 0 1-1.06 0L14.5 13.14l-2.15 2.15a.75.75 0 1 1-1.06-1.06l2.15-2.15-2.15-2.15a.75.75 0 1 1 1.06-1.06l2.15 2.15 2.15-2.15a.75.75 0 1 1 1.06 1.06L15.56 12l2.15 2.15a.75.75 0 0 1 0 1.14z" />
  </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </svg>
);

export default function AdminLockScreen({ onUnlock }: AdminLockScreenProps) {
  const [input, setInput] = useState<string>("");
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<"none" | "green" | "red">("none");

  const passcode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE ?? "";

  const handleKey = useCallback(
    (digit: string) => {
      if (flash !== "none") return;
      if (input.length >= PASSCODE_LENGTH) return;
      const next = input + digit;
      setInput(next);

      if (next.length === PASSCODE_LENGTH) {
        if (next === passcode) {
          // Correct
          setFlash("green");
          setTimeout(() => {
            onUnlock();
          }, 450);
        } else {
          // Wrong
          setFlash("red");
          setShake(true);
          setTimeout(() => {
            setInput("");
            setFlash("none");
            setShake(false);
          }, 600);
        }
      }
    },
    [input, flash, passcode, onUnlock]
  );

  const handleBackspace = useCallback(() => {
    if (flash !== "none") return;
    setInput((prev) => prev.slice(0, -1));
  }, [flash]);

  // Keyboard support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleKey(e.key);
      else if (e.key === "Backspace") handleBackspace();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, handleBackspace]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  const bgClass =
    flash === "green"
      ? "bg-[#16A34A]"
      : flash === "red"
      ? "bg-[#DC2626]"
      : "bg-[#5F33E1]";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-300 ${bgClass}`}
    >
      {/* Logo + Title */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Image
            src="/icon.png"
            alt="Finizer"
            width={40}
            height={40}
            className="w-10 h-10 rounded-xl object-contain"
            priority
          />
        </div>
        <h1 className="text-white text-2xl font-black tracking-tight mb-1">Finizer Admin</h1>
        <div className="flex items-center gap-1.5 text-white/70 text-sm font-medium">
          <LockIcon className="w-3.5 h-3.5" />
          <span>Enter Admin Passcode</span>
        </div>
      </div>

      {/* Dot indicators */}
      <div className={`flex items-center gap-4 mb-10 ${shake ? "animate-shake" : ""}`}>
        {Array.from({ length: PASSCODE_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < input.length
                ? "bg-white border-white scale-110"
                : "bg-transparent border-white/50"
            }`}
          />
        ))}
      </div>

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-[260px]">
        {keys.map((key, idx) => {
          if (key === "") {
            return <div key={idx} />;
          }
          if (key === "⌫") {
            return (
              <button
                key={idx}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleBackspace();
                }}
                className="h-16 rounded-2xl bg-white/15 active:bg-white/30 flex items-center justify-center text-white transition-colors select-none"
                aria-label="Backspace"
              >
                <BackspaceIcon className="w-6 h-6" />
              </button>
            );
          }
          return (
            <button
              key={idx}
              onPointerDown={(e) => {
                e.preventDefault();
                handleKey(key);
              }}
              className="h-16 rounded-2xl bg-white/20 active:bg-white/40 flex items-center justify-center text-white text-2xl font-bold transition-colors select-none"
            >
              {key}
            </button>
          );
        })}
      </div>

      <p className="mt-10 text-white/40 text-xs font-medium">Finizer · Retail Finance</p>
    </div>
  );
}
