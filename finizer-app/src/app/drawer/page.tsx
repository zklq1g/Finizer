"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/services/api";
import { formatINR } from "@/utils/format";
import type { Account, Category, Transaction } from "@/types";

// ── Inline icons (keep this page self-contained for kiosk mode) ──────────

const CashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17 3.5H7c-3 0-5 1.5-5 5v7c0 3.5 2 5 5 5h10c3 0 5-1.5 5-5v-7c0-3.5-2-5-5-5zm-5 12.75c-2.07 0-3.75-1.68-3.75-3.75S9.93 8.75 12 8.75s3.75 1.68 3.75 3.75-1.68 3.75-3.75 3.75z" opacity="0.4"/>
    <path d="M12 10.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5zM5.5 9.75c-.41 0-.75-.34-.75-.75V8c0-.41.34-.75.75-.75s.75.34.75.75v1c0 .41-.34.75-.75.75zM5.5 17c-.41 0-.75-.34-.75-.75V15.5c0-.41.34-.75.75-.75s.75.34.75.75v.75c0 .41-.34.75-.75.75zM18.5 9.75c-.41 0-.75-.34-.75-.75V8c0-.41.34-.75.75-.75s.75.34.75.75v1c0 .41-.34.75-.75.75zM18.5 17c-.41 0-.75-.34-.75-.75V15.5c0-.41.34-.75.75-.75s.75.34.75.75v.75c0 .41-.34.75-.75.75z"/>
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm4.78 7.7l-5.67 5.67a.75.75 0 0 1-1.06 0l-2.83-2.83a.754.754 0 0 1 0-1.06c.29-.29.77-.29 1.06 0l2.3 2.3 5.14-5.14c.29-.29.77-.29 1.06 0 .29.29.29.76 0 1.06z"/>
  </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.07 9.57L12 3.5 5.93 9.57a.75.75 0 0 0 1.06 1.06L11.25 6.38V20a.75.75 0 0 0 1.5 0V6.38l4.26 4.25a.75.75 0 0 0 1.06-1.06z"/>
  </svg>
);

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

      // Reload entries
      loadTodayEntries();

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
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-[family-name:var(--font-manrope)]">
      {/* Header */}
      <div className="bg-[#5F33E1] px-5 pt-12 pb-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <CashIcon className="w-7 h-7 text-white/90" />
          <h1 className="text-xl font-black tracking-tight">Cash Drawer</h1>
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
        <div className="mx-5 mt-4 bg-[#DCFCE7] text-[#16A34A] text-sm font-bold p-3.5 rounded-2xl border border-[#BBF7D0] animate-fade-in flex items-center gap-2 shadow-sm">
          <CheckIcon className="w-5 h-5 text-[#16A34A] shrink-0" />
          <span>{successFlash}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 pt-5 space-y-4 flex-shrink-0">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Amount */}
        <div className="bg-white rounded-3xl p-5 border border-[#F2F0F5] shadow-sm focus-within:border-[#5F33E1] transition-all">
          <label className="block text-[11px] font-bold text-[#99969E] uppercase tracking-wider mb-1">
            Amount Taken Out
          </label>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#120D26] select-none">₹</span>
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
              className="w-full text-4xl font-black bg-transparent outline-none tracking-tight text-[#120D26] placeholder-[#D1D5DB]"
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
            className="w-full px-4 py-3.5 rounded-2xl border border-[#F2F0F5] bg-white text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] transition-colors shadow-sm"
          />
          <input
            type="text"
            placeholder="Your name *"
            value={whoTook}
            onChange={(e) => setWhoTook(e.target.value)}
            disabled={isSubmitting}
            required
            className="w-full px-4 py-3.5 rounded-2xl border border-[#F2F0F5] bg-white text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] transition-colors shadow-sm"
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
        <h2 className="text-xs font-black text-[#120D26] uppercase tracking-wider">
          Today&apos;s Cash Out
        </h2>
        {todayEntries.length > 0 && (
          <span className="text-xs font-extrabold text-[#EF4444]">
            Total: {formatINR(totalOut)}
          </span>
        )}
      </div>

      {/* Today's entries list */}
      <div className="px-5 pb-10 flex-1 overflow-y-auto space-y-2.5">
        {todayEntries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#F2F0F5]">
            <CashIcon className="w-7 h-7 text-[#5F33E1] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-[#99969E]">No cash taken out today</p>
            <p className="text-[11px] text-[#C4C1CC] mt-1">Entries will appear here as they&apos;re logged</p>
          </div>
        ) : (
          todayEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-2xl px-4 py-3.5 border border-[#F2F0F5] flex items-center gap-3 shadow-sm"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <ArrowUpIcon className="w-4 h-4 text-[#EF4444] rotate-180" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#120D26] truncate">
                  {entry.description || "Cash withdrawal"}
                </p>
                <p className="text-[10px] text-[#99969E] mt-0.5 font-medium">
                  {formatTime(entry.created_at)}
                </p>
              </div>
              <span className="text-sm font-extrabold text-[#EF4444] shrink-0">
                −{formatINR(Number(entry.amount))}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
