"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  hasRegisteredPasskey,
  registerPasskey,
  authenticatePasskey,
  removePasskey,
} from "@/lib/webauthn";

interface DrawerLockScreenProps {
  onUnlock: () => void;
}

const PIN_LENGTH = 4;
const PASSKEY_STORAGE_KEY = "finizer_drawer_passkey";

// ── Inline icons (keep drawer page self-contained for kiosk mode) ─────────────

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

const FingerprintIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M2 17c1 .5 2.2 1 3 1" />
    <path d="M20 12a8 8 0 0 0-3.54-6.61" />
    <path d="M5 15.5A15.48 15.48 0 0 0 8 22" />
    <path d="M8.5 9A6 6 0 0 1 18 12c0 .47-.05.93-.14 1.38" />
  </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

// ── Clock hook ────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ── Phase type ────────────────────────────────────────────────────────────────

type Phase = "pin" | "offer-biometric" | "registering";

// ── Component ─────────────────────────────────────────────────────────────────

export default function DrawerLockScreen({ onUnlock }: DrawerLockScreenProps) {
  const [input, setInput] = useState<string>("");
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<"none" | "green" | "red">("none");
  const [phase, setPhase] = useState<Phase>("pin");
  const now = useClock();

  // Biometric state
  const [hasPasskey, setHasPasskey] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState(false);

  const pin = process.env.NEXT_PUBLIC_DRAWER_PIN ?? "";

  // ── On mount ───────────────────────────────────────────────────────
  useEffect(() => {
    const registered = hasRegisteredPasskey(PASSKEY_STORAGE_KEY);
    setHasPasskey(registered);

    if (isWebAuthnSupported()) {
      isPlatformAuthenticatorAvailable().then((available) => {
        setBiometricSupported(available);
      });
    }
  }, []);

  // ── Biometric authentication ───────────────────────────────────────
  const handleBiometricAuth = useCallback(async () => {
    setBiometricError(false);
    setIsBiometricLoading(true);
    try {
      const ok = await authenticatePasskey(PASSKEY_STORAGE_KEY);
      if (ok) {
        setFlash("green");
        setTimeout(() => onUnlock(), 450);
      } else {
        setBiometricError(true);
        setTimeout(() => setBiometricError(false), 2000);
      }
    } catch {
      setBiometricError(true);
      setTimeout(() => setBiometricError(false), 2000);
    } finally {
      setIsBiometricLoading(false);
    }
  }, [onUnlock]);

  // ── PIN key handler ────────────────────────────────────────────────
  const handleKey = useCallback(
    (digit: string) => {
      if (flash !== "none" || phase !== "pin") return;
      if (input.length >= PIN_LENGTH) return;
      const next = input + digit;
      setInput(next);

      if (next.length === PIN_LENGTH) {
        if (next === pin) {
          if (biometricSupported && !hasPasskey) {
            setInput("");
            setPhase("offer-biometric");
          } else {
            setFlash("green");
            setTimeout(() => onUnlock(), 450);
          }
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
    [input, flash, phase, pin, biometricSupported, hasPasskey, onUnlock]
  );

  const handleBackspace = useCallback(() => {
    if (flash !== "none" || phase !== "pin") return;
    setInput((prev) => prev.slice(0, -1));
  }, [flash, phase]);

  // ── Keyboard support ───────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleKey(e.key);
      else if (e.key === "Backspace") handleBackspace();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, handleBackspace]);

  // ── Biometric registration ─────────────────────────────────────────
  const handleEnableBiometric = async () => {
    setPhase("registering");
    const ok = await registerPasskey(PASSKEY_STORAGE_KEY, "finizer-drawer");
    if (ok) setHasPasskey(true);
    setFlash("green");
    setTimeout(() => onUnlock(), 450);
  };

  const handleSkipBiometric = () => {
    setFlash("green");
    setTimeout(() => onUnlock(), 450);
  };

  const handleRemovePasskey = () => {
    removePasskey(PASSKEY_STORAGE_KEY);
    setHasPasskey(false);
  };

  // ── Derived ────────────────────────────────────────────────────────
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

  // ── Render: offer biometric registration ──────────────────────────
  if (phase === "offer-biometric" || phase === "registering") {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-300 ${flash === "green" ? "bg-[#15803D]" : "bg-[#120D26]"}`}>
        <div className="w-full max-w-xs px-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6 border border-white/10">
            <FingerprintIcon className="w-10 h-10 text-[#9F87EF]" />
          </div>

          <h2 className="text-white text-xl font-black mb-2">Enable Biometric Login?</h2>
          <p className="text-white/60 text-sm font-medium leading-relaxed mb-8">
            Use your fingerprint or Face ID to unlock the kiosk next time — no PIN needed.
          </p>

          {phase === "registering" ? (
            <div className="flex items-center gap-2 text-white/70">
              <SpinnerIcon className="w-5 h-5 animate-spin" />
              <span className="text-sm font-bold">Registering biometric...</span>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleEnableBiometric}
                className="w-full py-4 bg-[#5F33E1] text-white text-sm font-black rounded-2xl active:opacity-80 transition-opacity flex items-center justify-center gap-2"
              >
                <FingerprintIcon className="w-5 h-5" />
                Enable Fingerprint / Face ID
              </button>
              <button
                onClick={handleSkipBiometric}
                className="w-full py-3.5 bg-white/10 text-white/70 text-sm font-bold rounded-2xl active:bg-white/20 transition-colors"
              >
                Not now
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: PIN screen ────────────────────────────────────────────
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-300 ${bgClass}`}>

      {/* Clock + Title */}
      <div className="flex flex-col items-center mb-8 text-center">
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
      <div className={`flex items-center gap-5 mb-8 ${shake ? "animate-shake" : ""}`}>
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

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-[288px]">
        {keys.map((key, idx) => {
          if (key === "") return <div key={idx} />;
          if (key === "⌫") {
            return (
              <button
                key={idx}
                onPointerDown={(e) => { e.preventDefault(); handleBackspace(); }}
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
              onPointerDown={(e) => { e.preventDefault(); handleKey(key); }}
              className="h-[72px] rounded-2xl bg-white/10 active:bg-[#5F33E1]/60 flex items-center justify-center text-white text-3xl font-bold transition-colors select-none"
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Biometric button */}
      {hasPasskey && biometricSupported && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={handleBiometricAuth}
            disabled={isBiometricLoading}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all select-none ${
              biometricError
                ? "bg-red-500/30 text-red-300"
                : "bg-white/10 active:bg-white/20 text-[#9F87EF]"
            }`}
          >
            {isBiometricLoading ? (
              <SpinnerIcon className="w-6 h-6 animate-spin" />
            ) : (
              <FingerprintIcon className="w-6 h-6" />
            )}
            <span>{biometricError ? "Try again" : "Use Biometric"}</span>
          </button>

          <button
            onClick={handleRemovePasskey}
            className="text-white/20 text-[10px] font-medium hover:text-white/50 transition-colors"
          >
            Remove saved biometric
          </button>
        </div>
      )}

      <p className="mt-8 text-white/20 text-xs font-medium">Finizer Kiosk Mode</p>
    </div>
  );
}
