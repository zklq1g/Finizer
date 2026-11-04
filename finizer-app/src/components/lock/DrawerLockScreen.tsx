"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  hasRegisteredPasskey,
  registerPasskey,
  authenticatePasskey,
  removePasskey,
  DRAWER_PASSKEY_KEY,
  DRAWER_BIOMETRIC_PROMPTED_KEY,
  hasPromptedBiometric,
  markBiometricPrompted,
} from "@/lib/webauthn";
import {
  BackspaceIcon,
  CashIcon,
  FingerprintIcon,
  SpinnerIcon,
} from "@/components/icons";

interface DrawerLockScreenProps {
  onUnlock: () => void;
}

const PIN_LENGTH = 4;

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

  // References for active biometric requests & auto-fallback timeout
  const authAbortControllerRef = useRef<AbortController | null>(null);
  const autoAuthTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pin = process.env.NEXT_PUBLIC_DRAWER_PIN ?? "";

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
          DRAWER_PASSKEY_KEY,
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
    const registered = hasRegisteredPasskey(DRAWER_PASSKEY_KEY);
    setHasPasskey(registered);

    if (isWebAuthnSupported()) {
      isPlatformAuthenticatorAvailable().then((available) => {
        setBiometricSupported(available);
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

  // ── PIN key handler ────────────────────────────────────────────────
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
      if (input.length >= PIN_LENGTH) return;
      const next = input + digit;
      setInput(next);

      if (next.length === PIN_LENGTH) {
        if (next === pin) {
          // Only offer biometric registration for the very first time
          const alreadyPrompted = hasPromptedBiometric(DRAWER_BIOMETRIC_PROMPTED_KEY);
          if (biometricSupported && !hasPasskey && !alreadyPrompted) {
            markBiometricPrompted(DRAWER_BIOMETRIC_PROMPTED_KEY);
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
    const ok = await registerPasskey(DRAWER_PASSKEY_KEY, "finizer-drawer");
    if (ok) setHasPasskey(true);
    markBiometricPrompted(DRAWER_BIOMETRIC_PROMPTED_KEY);
    setFlash("green");
    setTimeout(() => onUnlock(), 450);
  };

  const handleSkipBiometric = () => {
    markBiometricPrompted(DRAWER_BIOMETRIC_PROMPTED_KEY);
    setFlash("green");
    setTimeout(() => onUnlock(), 450);
  };

  const handleRemovePasskey = () => {
    removePasskey(DRAWER_PASSKEY_KEY);
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
            onClick={() => handleBiometricAuth(false)}
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
            <span>{biometricError ? "Try again" : isBiometricLoading ? "Verifying..." : "Use Biometric"}</span>
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
