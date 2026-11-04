"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  hasRegisteredPasskey,
  registerPasskey,
  authenticatePasskey,
  removePasskey,
  ADMIN_PASSKEY_KEY,
  ADMIN_BIOMETRIC_PROMPTED_KEY,
  hasPromptedBiometric,
  markBiometricPrompted,
} from "@/lib/webauthn";
import {
  BackspaceIcon,
  LockIcon,
  FingerprintIcon,
  SpinnerIcon,
} from "@/components/icons";

interface AdminLockScreenProps {
  onUnlock: () => void;
}

const PASSCODE_LENGTH = 6;

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

  // References for active biometric requests & auto-fallback timeout
  const authAbortControllerRef = useRef<AbortController | null>(null);
  const autoAuthTimerRef = useRef<NodeJS.Timeout | null>(null);

  const passcode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE ?? "";

  // ── Biometric authentication (with 15s timeout & manual PIN fallback) ─
  const handleBiometricAuth = useCallback(
    async (isAuto = false) => {
      // Clear any pending in-flight authentication
      if (authAbortControllerRef.current) {
        authAbortControllerRef.current.abort();
        authAbortControllerRef.current = null;
      }
      if (autoAuthTimerRef.current) {
        clearTimeout(autoAuthTimerRef.current);
        autoAuthTimerRef.current = null;
      }

      const controller = new AbortController();
      authAbortControllerRef.current = controller;

      // Fall back to manual PIN entry after 15 seconds
      const timeoutMs = 15_000;
      autoAuthTimerRef.current = setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // ignore
        }
      }, timeoutMs);

      setBiometricError(false);
      setIsBiometricLoading(true);

      try {
        const ok = await authenticatePasskey(
          ADMIN_PASSKEY_KEY,
          timeoutMs,
          controller.signal
        );

        if (ok) {
          setFlash("green");
          setTimeout(() => onUnlock(), 450);
        } else {
          // If manually triggered, show a brief "Try again" cue.
          // If auto-launch failed or timed out, cleanly fall back to manual PIN.
          if (!isAuto) {
            setBiometricError(true);
            setTimeout(() => setBiometricError(false), 2000);
          }
        }
      } catch {
        if (!isAuto) {
          setBiometricError(true);
          setTimeout(() => setBiometricError(false), 2000);
        }
      } finally {
        if (autoAuthTimerRef.current) {
          clearTimeout(autoAuthTimerRef.current);
          autoAuthTimerRef.current = null;
        }
        if (authAbortControllerRef.current === controller) {
          authAbortControllerRef.current = null;
        }
        setIsBiometricLoading(false);
      }
    },
    [onUnlock]
  );

  // ── On mount: check support & auto-launch biometric unlock ─────────
  useEffect(() => {
    const registered = hasRegisteredPasskey(ADMIN_PASSKEY_KEY);
    setHasPasskey(registered);

    if (isWebAuthnSupported()) {
      isPlatformAuthenticatorAvailable().then((available) => {
        setBiometricSupported(available);
        // Auto-launch biometric verification immediately if configured
        if (available && registered) {
          handleBiometricAuth(true);
        }
      });
    }

    return () => {
      if (authAbortControllerRef.current) {
        authAbortControllerRef.current.abort();
        authAbortControllerRef.current = null;
      }
      if (autoAuthTimerRef.current) {
        clearTimeout(autoAuthTimerRef.current);
        autoAuthTimerRef.current = null;
      }
    };
  }, [handleBiometricAuth]);

  // ── Passcode key handler ──────────────────────────────────────────
  const handleKey = useCallback(
    (digit: string) => {
      // Abort any in-flight auto biometric request if user starts typing PIN
      if (authAbortControllerRef.current) {
        authAbortControllerRef.current.abort();
        authAbortControllerRef.current = null;
      }
      if (autoAuthTimerRef.current) {
        clearTimeout(autoAuthTimerRef.current);
        autoAuthTimerRef.current = null;
      }
      setIsBiometricLoading(false);

      if (flash !== "none" || phase !== "pin") return;
      if (input.length >= PASSCODE_LENGTH) return;
      const next = input + digit;
      setInput(next);

      if (next.length === PASSCODE_LENGTH) {
        if (next === passcode) {
          // Correct — only offer biometric prompt for the very first time
          const alreadyPrompted = hasPromptedBiometric(ADMIN_BIOMETRIC_PROMPTED_KEY);
          if (biometricSupported && !hasPasskey && !alreadyPrompted) {
            markBiometricPrompted(ADMIN_BIOMETRIC_PROMPTED_KEY);
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
    if (authAbortControllerRef.current) {
      authAbortControllerRef.current.abort();
      authAbortControllerRef.current = null;
    }
    if (autoAuthTimerRef.current) {
      clearTimeout(autoAuthTimerRef.current);
      autoAuthTimerRef.current = null;
    }
    setIsBiometricLoading(false);

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
    const ok = await registerPasskey(ADMIN_PASSKEY_KEY, "finizer-admin");
    if (ok) {
      setHasPasskey(true);
    }
    markBiometricPrompted(ADMIN_BIOMETRIC_PROMPTED_KEY);
    // Unlock now
    setFlash("green");
    setTimeout(() => onUnlock(), 450);
  };

  const handleSkipBiometric = () => {
    markBiometricPrompted(ADMIN_BIOMETRIC_PROMPTED_KEY);
    setFlash("green");
    setTimeout(() => onUnlock(), 450);
  };

  // ── Remove passkey (small helper shown when passkey is registered) ─
  const handleRemovePasskey = () => {
    removePasskey(ADMIN_PASSKEY_KEY);
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
            onClick={() => handleBiometricAuth(false)}
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
            <span>{biometricError ? "Try again" : isBiometricLoading ? "Verifying..." : "Use Biometric"}</span>
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
