"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  hasRegisteredPasskey,
  registerPasskey,
  authenticatePasskey,
  removePasskey,
} from "@/lib/webauthn";

interface AdminLockScreenProps {
  onUnlock: () => void;
}

const PASSCODE_LENGTH = 6;
const PASSKEY_STORAGE_KEY = "finizer_admin_passkey";

// ── Icons ─────────────────────────────────────────────────────────────────────

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

// Generic fingerprint / biometric icon
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

// ── Phase types ───────────────────────────────────────────────────────────────

type Phase = "pin" | "offer-biometric" | "registering";

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminLockScreen({ onUnlock }: AdminLockScreenProps) {
  const [input, setInput] = useState<string>("");
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<"none" | "green" | "red">("none");
  const [phase, setPhase] = useState<Phase>("pin");

  // Biometric state
  const [hasPasskey, setHasPasskey] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState(false);

  const passcode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE ?? "";

  // ── On mount: check passkey registration & device support ──────────
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

  // ── Passcode key handler ──────────────────────────────────────────
  const handleKey = useCallback(
    (digit: string) => {
      if (flash !== "none" || phase !== "pin") return;
      if (input.length >= PASSCODE_LENGTH) return;
      const next = input + digit;
      setInput(next);

      if (next.length === PASSCODE_LENGTH) {
        if (next === passcode) {
          // Correct — decide next phase
          if (biometricSupported && !hasPasskey) {
            // Offer to register biometric
            setInput("");
            setPhase("offer-biometric");
          } else {
            setFlash("green");
            setTimeout(() => onUnlock(), 450);
          }
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
    [input, flash, phase, passcode, biometricSupported, hasPasskey, onUnlock]
  );

  const handleBackspace = useCallback(() => {
    if (flash !== "none" || phase !== "pin") return;
    setInput((prev) => prev.slice(0, -1));
  }, [flash, phase]);

  // ── Keyboard support ──────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleKey(e.key);
      else if (e.key === "Backspace") handleBackspace();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, handleBackspace]);

  // ── Biometric registration ────────────────────────────────────────
  const handleEnableBiometric = async () => {
    setPhase("registering");
    const ok = await registerPasskey(PASSKEY_STORAGE_KEY, "finizer-admin");
    if (ok) {
      setHasPasskey(true);
    }
    // Either way — unlock now
    setFlash("green");
    setTimeout(() => onUnlock(), 450);
  };

  const handleSkipBiometric = () => {
    setFlash("green");
    setTimeout(() => onUnlock(), 450);
  };

  // ── Remove passkey (small helper shown when passkey is registered) ─
  const handleRemovePasskey = () => {
    removePasskey(PASSKEY_STORAGE_KEY);
    setHasPasskey(false);
  };

  // ── Derived styles ────────────────────────────────────────────────
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  const bgClass =
    flash === "green"
      ? "bg-[#16A34A]"
      : flash === "red"
      ? "bg-[#DC2626]"
      : "bg-[#5F33E1]";

  // ── Render: offer biometric registration ─────────────────────────
  if (phase === "offer-biometric" || phase === "registering") {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-300 ${flash === "green" ? "bg-[#16A34A]" : "bg-[#5F33E1]"}`}>
        <div className="w-full max-w-xs px-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
            <FingerprintIcon className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-white text-xl font-black mb-2">Enable Biometric Login?</h2>
          <p className="text-white/70 text-sm font-medium leading-relaxed mb-8">
            Use your fingerprint or Face ID to unlock Finizer Admin next time — no passcode needed.
          </p>

          {phase === "registering" ? (
            <div className="flex items-center gap-2 text-white/80">
              <SpinnerIcon className="w-5 h-5 animate-spin" />
              <span className="text-sm font-bold">Registering biometric...</span>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleEnableBiometric}
                className="w-full py-4 bg-white text-[#5F33E1] text-sm font-black rounded-2xl active:opacity-80 transition-opacity"
              >
                Enable Fingerprint / Face ID
              </button>
              <button
                onClick={handleSkipBiometric}
                className="w-full py-3.5 bg-white/15 text-white text-sm font-bold rounded-2xl active:bg-white/25 transition-colors"
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

      {/* Logo + Title */}
      <div className="flex flex-col items-center mb-8">
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
      <div className={`flex items-center gap-4 mb-8 ${shake ? "animate-shake" : ""}`}>
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
          if (key === "") return <div key={idx} />;
          if (key === "⌫") {
            return (
              <button
                key={idx}
                onPointerDown={(e) => { e.preventDefault(); handleBackspace(); }}
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
              onPointerDown={(e) => { e.preventDefault(); handleKey(key); }}
              className="h-16 rounded-2xl bg-white/20 active:bg-white/40 flex items-center justify-center text-white text-2xl font-bold transition-colors select-none"
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Biometric button — shown only if a passkey is registered */}
      {hasPasskey && biometricSupported && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={handleBiometricAuth}
            disabled={isBiometricLoading}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all select-none ${
              biometricError
                ? "bg-red-500/30 text-red-200"
                : "bg-white/20 active:bg-white/35 text-white"
            }`}
          >
            {isBiometricLoading ? (
              <SpinnerIcon className="w-5 h-5 animate-spin" />
            ) : (
              <FingerprintIcon className="w-5 h-5" />
            )}
            <span>{biometricError ? "Try again" : "Use Biometric"}</span>
          </button>

          {/* Small "remove passkey" escape hatch */}
          <button
            onClick={handleRemovePasskey}
            className="text-white/30 text-[10px] font-medium hover:text-white/60 transition-colors"
          >
            Remove saved biometric
          </button>
        </div>
      )}

      <p className="mt-8 text-white/40 text-xs font-medium">Finizer · Retail Finance</p>
    </div>
  );
}
