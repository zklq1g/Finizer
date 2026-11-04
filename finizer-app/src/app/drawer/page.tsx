"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/services/api";
import { formatINR } from "@/utils/format";
import type { Account, Category, Transaction } from "@/types";
import DrawerLockScreen from "@/components/lock/DrawerLockScreen";
import {
  CashIcon,
  CheckIcon,
  SpinnerIcon,
  ArrowUpIcon,
  TrashIcon,
  LockIcon,
} from "@/components/icons";

// ── Helpers ───────────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

// ── Component ────────────────────────────────────────────────────────────

export default function CashDrawerPage() {
  // ── Drawer auth ────────────────────────────────────────────────────
  const [drawerUnlocked, setDrawerUnlocked] = useState<boolean>(false);
  const [isSessionChecking, setIsSessionChecking] = useState<boolean>(true);

  const handleDrawerUnlock = useCallback(() => {
    sessionStorage.setItem("finizer_drawer_session", "1");
    setDrawerUnlocked(true);
  }, []);

  const handleDrawerLock = useCallback(() => {
    sessionStorage.removeItem("finizer_drawer_session");
    setDrawerUnlocked(false);
  }, []);

  useEffect(() => {
    // 1. Initial session check on mount (persists across page reloads in this tab)
    if (sessionStorage.getItem("finizer_drawer_session") === "1") {
      setDrawerUnlocked(true);
    }
    setIsSessionChecking(false);

    // 2. Track page unload to distinguish between refreshing the page vs leaving the tab
    let isUnloading = false;
    const markUnloading = () => {
      isUnloading = true;
    };
    window.addEventListener("beforeunload", markUnloading);
    window.addEventListener("pagehide", markUnloading);

    // 3. Auto-lock only when the user actually leaves the tab (switches tab, minimizes, switches apps)
    let hideTimer: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (isUnloading) return; // Refreshing or navigating, do not lock
        hideTimer = setTimeout(() => {
          if (!isUnloading && document.visibilityState === "hidden") {
            sessionStorage.removeItem("finizer_drawer_session");
            setDrawerUnlocked(false);
          }
        }, 500);
      } else if (document.visibilityState === "visible") {
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", markUnloading);
      window.removeEventListener("pagehide", markUnloading);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  // Form state
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [whoTook, setWhoTook] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successFlash, setSuccessFlash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data state
  const [drawerAccount, setDrawerAccount] = useState<Account | null>(null);
  const [miscCategory, setMiscCategory] = useState<Category | null>(null);
  const [todayEntries, setTodayEntries] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Void / Cancel state
  const [cancelingEntry, setCancelingEntry] = useState<Transaction | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  // ── Bootstrap: find Cash Drawer account + Miscellaneous category ──
  useEffect(() => {
    async function bootstrap() {
      setIsLoading(true);
      try {
        const [accounts, categories] = await Promise.all([
          api.getAccounts(),
          api.getCategories(),
        ]);

        // Find "Cash Drawer" account (case-insensitive partial match)
        const drawer = accounts.find(
          (a) => a.name.toLowerCase().includes("cash drawer") || a.name.toLowerCase().includes("cash box")
        ) || accounts.find((a) => a.type === "cash") || accounts[0];

        // Find withdrawal/miscellaneous category
        const cat =
          categories.find((c) => c.name.toLowerCase().includes("cash drawer withdrawal")) ||
          categories.find((c) => c.name.toLowerCase().includes("miscellaneous")) ||
          categories.find((c) => c.type === "WITHDRAWAL") ||
          categories.find((c) => c.type === "OPERATING_EXPENSE") ||
          categories[0];

        setDrawerAccount(drawer || null);
        setMiscCategory(cat || null);
      } catch (err) {
        console.error("Cash Drawer bootstrap failed:", err);
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap();
  }, []);

  // ── Load today's entries ──────────────────────────────────────────
  const loadTodayEntries = useCallback(async () => {
    if (!drawerAccount) return;
    try {
      const txns = await api.getTransactions(200);
      const today = getTodayStr();
      const filtered = txns.filter(
        (t) =>
          t.account_id === drawerAccount.id &&
          t.type === "EXPENSE" &&
          t.date === today &&
          !t.is_deleted
      );
      setTodayEntries(filtered);
    } catch (err) {
      console.error("Failed to load today's drawer entries:", err);
    }
  }, [drawerAccount]);

  useEffect(() => {
    if (drawerAccount) {
      loadTodayEntries();
    }
  }, [drawerAccount, loadTodayEntries]);

  // ── Refresh drawer account balance ─────────────────────────────────
  const refreshDrawerBalance = useCallback(async () => {
    try {
      const accounts = await api.getAccounts();
      const updatedDrawer =
        accounts.find((a) => a.id === drawerAccount?.id) ||
        accounts.find((a) => a.name.toLowerCase().includes("cash drawer") || a.name.toLowerCase().includes("cash box")) ||
        accounts.find((a) => a.type === "cash");
      if (updatedDrawer) {
        setDrawerAccount(updatedDrawer);
      }
    } catch (err) {
      console.warn("Failed to refresh drawer balance:", err);
    }
  }, [drawerAccount?.id]);

  // ── Void / Cancel withdrawal handler ───────────────────────────────
  const handleConfirmVoid = async (entry: Transaction) => {
    setIsCanceling(true);
    try {
      const actorName = whoTook.trim() || "Cash Drawer Staff";
      await api.softDeleteTransaction(entry.id, actorName);

      // Refresh today's entries & balance
      await loadTodayEntries();
      await refreshDrawerBalance();

      setSuccessFlash(`₹${Number(entry.amount).toLocaleString("en-IN")} withdrawal voided & restored`);
      setTimeout(() => setSuccessFlash(null), 3500);
      setCancelingEntry(null);
    } catch (err) {
      console.error("Failed to void cash drawer withdrawal:", err);
      setErrorMessage("Failed to void withdrawal. Please try again.");
    } finally {
      setIsCanceling(false);
    }
  };

  // ── Submit handler ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Enter a valid amount");
      return;
    }
    if (!whoTook.trim()) {
      setErrorMessage("Enter who is taking the money");
      return;
    }
    if (!drawerAccount || !miscCategory) {
      setErrorMessage("Cash Drawer account or category not found. Please set up in Settings.");
      return;
    }

    setIsSubmitting(true);
    try {
      const description = reason.trim()
        ? `${reason.trim()} — taken by ${whoTook.trim()}`
        : `Cash taken by ${whoTook.trim()}`;

      await api.createTransaction(
        {
          account_id: drawerAccount.id,
          category_id: miscCategory.id,
          amount: parsedAmount,
          type: "EXPENSE",
          date: getTodayStr(),
          description,
        },
        whoTook.trim()
      );

      // Success flash
      setSuccessFlash(`₹${parsedAmount.toLocaleString("en-IN")} logged`);
      setTimeout(() => setSuccessFlash(null), 3000);

      // Reset form
      setAmount("");
      setReason("");
      // Keep whoTook for repeated entries by the same person

      // Reload entries and balance
      loadTodayEntries();
      refreshDrawerBalance();

      // Re-focus amount for next entry
      setTimeout(() => amountRef.current?.focus(), 150);
    } catch (err) {
      console.error("Cash drawer entry failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to record withdrawal.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setAmount(val);
    }
  };

  const totalOut = todayEntries.reduce((sum, t) => sum + Number(t.amount), 0);

  // ── Session check state ───────────────────────────────────────────
  if (isSessionChecking) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0C0A14] flex items-center justify-center transition-colors duration-200" />
    );
  }

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F2FF] flex items-center justify-center">
        <div className="text-center">
          <SpinnerIcon className="w-8 h-8 text-[#5F33E1] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#5F33E1]">Loading Cash Drawer...</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0C0A14] flex flex-col font-[family-name:var(--font-manrope)] text-[#120D26] dark:text-[#F4F3F8] transition-colors duration-200">
      {/* Drawer Lock Screen */}
      {!drawerUnlocked && <DrawerLockScreen onUnlock={handleDrawerUnlock} />}

      {/* Header */}
      <div className="bg-[#5F33E1] px-5 pt-12 pb-6 text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <CashIcon className="w-7 h-7 text-white/90" />
            <h1 className="text-xl font-black tracking-tight">Cash Drawer</h1>
          </div>
          {/* Lock Kiosk button */}
          <button
            onClick={handleDrawerLock}
            title="Lock Kiosk"
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
          >
            <LockIcon className="w-3.5 h-3.5" />
            Lock
          </button>
        </div>
        <p className="text-xs text-white/70 font-medium">
          Record cash going out · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
        </p>
        {drawerAccount && (
          <div className="mt-3 bg-white/15 rounded-2xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-white/80 font-medium">Drawer Balance</span>
            <span className="text-lg font-black">{formatINR(drawerAccount.current_balance)}</span>
          </div>
        )}
      </div>

      {/* Success Flash */}
      {successFlash && (
        <div className="mx-5 mt-4 bg-[#DCFCE7] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 text-sm font-bold p-3.5 rounded-2xl border border-[#BBF7D0] dark:border-emerald-800 animate-fade-in flex items-center gap-2 shadow-sm">
          <CheckIcon className="w-5 h-5 text-[#16A34A] dark:text-emerald-400 shrink-0" />
          <span>{successFlash}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 pt-5 space-y-4 flex-shrink-0">
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-600 dark:text-red-400 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Amount */}
        <div className="bg-white dark:bg-[#161324] rounded-3xl p-5 border border-[#F2F0F5] dark:border-[#28233D] shadow-sm focus-within:border-[#5F33E1] transition-all">
          <label className="block text-[11px] font-bold text-[#99969E] dark:text-[#8C879B] uppercase tracking-wider mb-1">
            Amount Taken Out
          </label>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#120D26] dark:text-[#F4F3F8] select-none">₹</span>
            <input
              ref={amountRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.]?[0-9]*"
              placeholder="0"
              value={amount}
              onChange={handleAmountChange}
              disabled={isSubmitting}
              autoFocus
              className="w-full text-4xl font-black bg-transparent outline-none tracking-tight text-[#120D26] dark:text-[#F4F3F8] placeholder-[#D1D5DB] dark:placeholder-[#4A4560]"
            />
          </div>
        </div>

        {/* What for + Who */}
        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            placeholder="What for? (e.g., chai, change, supplies)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-3.5 rounded-2xl border border-[#F2F0F5] dark:border-[#28233D] bg-white dark:bg-[#161324] text-sm text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] focus:outline-hidden focus:border-[#5F33E1] transition-colors shadow-sm"
          />
          <input
            type="text"
            placeholder="Your name *"
            value={whoTook}
            onChange={(e) => setWhoTook(e.target.value)}
            disabled={isSubmitting}
            required
            className="w-full px-4 py-3.5 rounded-2xl border border-[#F2F0F5] dark:border-[#28233D] bg-white dark:bg-[#161324] text-sm text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] focus:outline-hidden focus:border-[#5F33E1] transition-colors shadow-sm"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || !whoTook.trim()}
          className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 hover:bg-[#5029C9] flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <SpinnerIcon className="w-5 h-5 animate-spin" />
              <span>Recording...</span>
            </>
          ) : (
            <>
              <ArrowUpIcon className="w-5 h-5 rotate-180" />
              <span>Record Cash Out</span>
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h2 className="text-xs font-black text-[#120D26] dark:text-[#F4F3F8] uppercase tracking-wider">
          Today&apos;s Cash Out
        </h2>
        {todayEntries.length > 0 && (
          <span className="text-xs font-extrabold text-[#EF4444] dark:text-[#F87171]">
            Total: {formatINR(totalOut)}
          </span>
        )}
      </div>

      {/* Today's entries list */}
      <div className="px-5 pb-10 flex-1 overflow-y-auto space-y-2.5">
        {todayEntries.length === 0 ? (
          <div className="bg-white dark:bg-[#161324] rounded-2xl p-8 text-center border border-[#F2F0F5] dark:border-[#28233D] transition-colors">
            <CashIcon className="w-7 h-7 text-[#5F33E1] dark:text-[#9F87EF] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-[#99969E] dark:text-[#8C879B]">No cash taken out today</p>
            <p className="text-[11px] text-[#C4C1CC] dark:text-gray-600 mt-1">Entries will appear here as they&apos;re logged</p>
          </div>
        ) : (
          todayEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-[#161324] rounded-2xl px-4 py-3.5 border border-[#F2F0F5] dark:border-[#28233D] flex items-center gap-3 shadow-sm transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                <ArrowUpIcon className="w-4 h-4 text-[#EF4444] dark:text-red-400 rotate-180" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#120D26] dark:text-[#F4F3F8] truncate">
                  {entry.description || "Cash withdrawal"}
                </p>
                <p className="text-[10px] text-[#99969E] dark:text-[#8C879B] mt-0.5 font-medium">
                  {formatTime(entry.created_at)}
                </p>
              </div>
              <span className="text-sm font-extrabold text-[#EF4444] dark:text-[#F87171] shrink-0">
                −{formatINR(Number(entry.amount))}
              </span>
              <button
                type="button"
                onClick={() => setCancelingEntry(entry)}
                title="Void this withdrawal"
                className="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-[#DC2626] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 active:scale-95"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Void Confirmation Modal */}
      {cancelingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in"
            onClick={() => !isCanceling && setCancelingEntry(null)}
          />
          <div className="relative bg-white dark:bg-[#1F1B30] rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-slide-up z-10 border border-[#F2F0F5] dark:border-[#28233D]">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#DC2626] dark:text-red-400 flex items-center justify-center mb-4 mx-auto">
              <TrashIcon className="w-6 h-6 text-[#DC2626] dark:text-red-400" />
            </div>
            <h3 className="text-base font-black text-[#120D26] dark:text-[#F4F3F8] text-center mb-1">
              Void Cash Withdrawal?
            </h3>
            <p className="text-xs text-[#99969E] dark:text-[#8C879B] text-center mb-5 leading-relaxed">
              Cancel withdrawal of{" "}
              <span className="font-extrabold text-[#120D26] dark:text-[#F4F3F8]">
                {formatINR(Number(cancelingEntry.amount))}
              </span>
              {cancelingEntry.description ? ` (${cancelingEntry.description})` : ""}? The cash will be returned to the drawer balance.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => setCancelingEntry(null)}
                className="flex-1 py-3.5 rounded-2xl border border-[#F2F0F5] dark:border-[#28233D] text-xs font-bold text-[#99969E] dark:text-[#8C879B] hover:bg-gray-50 dark:hover:bg-[#28233D] transition-colors disabled:opacity-50"
              >
                Keep Entry
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => handleConfirmVoid(cancelingEntry)}
                className="flex-1 py-3.5 rounded-2xl bg-[#DC2626] text-white text-xs font-extrabold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
              >
                {isCanceling ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 animate-spin text-white" />
                    <span>Voiding...</span>
                  </>
                ) : (
                  <span>Void Withdrawal</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
