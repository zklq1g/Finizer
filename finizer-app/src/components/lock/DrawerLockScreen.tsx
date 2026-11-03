"use client";

import React, { useState, useEffect, useCallback } from "react";

interface DrawerLockScreenProps {
  onUnlock: () => void;
}

const PIN_LENGTH = 4;

// Backspace icon (inline, kiosk-mode self-contained)
const BackspaceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M21 6.5H9.83a2 2 0 0 0-1.42.59l-5.3 5.3a.99.99 0 0 0 0 1.41l5.3 5.3A2 2 0 0 0 9.83 19.7H21a2 2 0 0 0 2-2v-9.2a2 2 0 0 0-2-2zm-3.29 8.79a.75.75 0 0 1-1.06 0L14.5 13.14l-2.15 2.15a.75.75 0 1 1-1.06-1.06l2.15-2.15-2.15-2.15a.75.75 0 1 1 1.06-1.06l2.15 2.15 2.15-2.15a.75.75 0 1 1 1.06 1.06L15.56 12l2.15 2.15a.75.75 0 0 1 0 1.14z" />
  </svg>
);

const CashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17 3.5H7c-3 0-5 1.5-5 5v7c0 3.5 2 5 5 5h10c3 0 5-1.5 5-5v-7c0-3.5-2-5-5-5zm-5 12.75c-2.07 0-3.75-1.68-3.75-3.75S9.93 8.75 12 8.75s3.75 1.68 3.75 3.75-1.68 3.75-3.75 3.75z" opacity="0.4" />
    <path d="M12 10.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5zM5.5 9.75c-.41 0-.75-.34-.75-.75V8c0-.41.34-.75.75-.75s.75.34.75.75v1c0 .41-.34.75-.75.75zM5.5 17c-.41 0-.75-.34-.75-.75V15.5c0-.41.34-.75.75-.75s.75.34.75.75v.75c0 .41-.34.75-.75.75zM18.5 9.75c-.41 0-.75-.34-.75-.75V8c0-.41.34-.75.75-.75s.75.34.75.75v1c0 .41-.34.75-.75.75zM18.5 17c-.41 0-.75-.34-.75-.75V15.5c0-.41.34-.75.75-.75s.75.34.75.75v.75c0 .41-.34.75-.75.75z" />
  </svg>
);

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function DrawerLockScreen({ onUnlock }: DrawerLockScreenProps) {
  const [input, setInput] = useState<string>("");
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<"none" | "green" | "red">("none");
  const now = useClock();

  const pin = process.env.NEXT_PUBLIC_DRAWER_PIN ?? "";

  const handleKey = useCallback(
    (digit: string) => {
      if (flash !== "none") return;
      if (input.length >= PIN_LENGTH) return;
      const next = input + digit;
      setInput(next);

      if (next.length === PIN_LENGTH) {
        if (next === pin) {
          setFlash("green");
          setTimeout(() => {
            onUnlock();
          }, 450);
        } else {
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
    [input, flash, pin, onUnlock]
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

  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const bgClass =
    flash === "green"
      ? "bg-[#15803D]"
      : flash === "red"
      ? "bg-[#991B1B]"
      : "bg-[#120D26]";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-300 ${bgClass}`}
    >
      {/* Clock + Title */}
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="flex items-center gap-2 mb-5 text-[#9F87EF]">
          <CashIcon className="w-6 h-6" />
          <span className="text-base font-bold uppercase tracking-widest">Cash Drawer</span>
        </div>
        <p className="text-white text-6xl font-black tracking-tighter leading-none mb-1">
          {timeStr}
        </p>
        <p className="text-white/50 text-sm font-medium mt-2">{dateStr}</p>
        <p className="text-white/40 text-xs font-medium mt-4">Enter PIN to unlock kiosk</p>
      </div>

      {/* PIN dots */}
      <div className={`flex items-center gap-5 mb-10 ${shake ? "animate-shake" : ""}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
              i < input.length
                ? "bg-[#9F87EF] border-[#9F87EF] scale-110"
                : "bg-transparent border-white/30"
            }`}
          />
        ))}
      </div>

      {/* Numeric keypad — large for tablet/kiosk use */}
      <div className="grid grid-cols-3 gap-3 w-[288px]">
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
                className="h-[72px] rounded-2xl bg-white/10 active:bg-white/25 flex items-center justify-center text-white/70 transition-colors select-none"
                aria-label="Backspace"
              >
                <BackspaceIcon className="w-7 h-7" />
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
              className="h-[72px] rounded-2xl bg-white/10 active:bg-[#5F33E1]/60 flex items-center justify-center text-white text-3xl font-bold transition-colors select-none"
            >
              {key}
            </button>
          );
        })}
      </div>

      <p className="mt-10 text-white/20 text-xs font-medium">Finizer Kiosk Mode</p>
    </div>
  );
}
