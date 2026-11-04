"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeftIcon,
  WalletIcon,
  BriefcaseIcon,
  UserOctagonIcon,
  TrendUpIcon,
  CheckIcon,
  SpinnerIcon,
  AlertTriangleIcon,
  PercentageSquareIcon,
} from "../icons";
import { formatINR } from "../../utils/format";
import { api, getFinancialMetrics, type FinancialMetrics } from "@/services/api";
import { useActor } from "@/context/ActorContext";

interface AccountItem {
  id: string;
  name: string;
  balance: number;
}

interface MonthEndAllocatorProps {
  onBack: () => void;
  onSuccess?: (summary: { month: string; netProfit: number; payout: number }) => void;
  targetMonth?: Date;
}

export default function MonthEndAllocator({ onBack, onSuccess, targetMonth }: MonthEndAllocatorProps) {
  const { actor } = useActor();
  const targetYear = targetMonth ? targetMonth.getFullYear() : new Date().getFullYear();
  const targetMonthIndex = targetMonth ? targetMonth.getMonth() : new Date().getMonth();

  const targetDate = useMemo(() => new Date(targetYear, targetMonthIndex, 1), [targetYear, targetMonthIndex]);
  const currentMonth = targetDate.toLocaleString("en-IN", { month: "long" });
  const currentYear = targetDate.getFullYear();

  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  // Close on Escape key for desktop experience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoadingMetrics(true);
        const y = targetYear;
        const m = targetMonthIndex;
        const startStr = `${y}-${String(m + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const endStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const data = await getFinancialMetrics(startStr, endStr);
        setMetrics(data);

        // Check if this month is already closed
        try {
          const closures = await api.getMonthlyClosures();
          const alreadyClosed = closures.some(
            (c) => c.month === m + 1 && c.year === y && c.status === "LOCKED"
          );
          setMonthAlreadyClosed(alreadyClosed);
        } catch {
          // Non-critical — proceed without guard
        }
      } catch (err) {
        console.error("Failed to load metrics for month closure:", err);
      } finally {
        setLoadingMetrics(false);
      }
    }
    loadMetrics();
  }, [targetYear, targetMonthIndex]);

  const monthlyIncome = metrics?.monthly_income || 0;
  const monthlyExpense = metrics?.monthly_expense || 0;
  const netProfit = monthlyIncome - monthlyExpense;
  const isLossMonth = netProfit < 0;

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
  const [mode, setMode] = useState<"AMOUNT" | "PERCENT">("AMOUNT");

  // Allocation input states
  const [opex, setOpex] = useState<string>("");
  const [salaries, setSalaries] = useState<string>("");
  const [reinvestment, setReinvestment] = useState<string>("");
  const [payout, setPayout] = useState<string>("");
  const [payoutAccountId, setPayoutAccountId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [monthAlreadyClosed, setMonthAlreadyClosed] = useState<boolean>(false);

  // Load real accounts from Supabase
  useEffect(() => {
    async function loadAccounts() {
      try {
        setLoadingAccounts(true);
        const liveAccounts = await api.getAccounts();
        if (liveAccounts && liveAccounts.length > 0) {
          const mapped = liveAccounts.map((a) => ({
            id: a.id,
            name: a.name,
            balance: Number(a.current_balance),
          }));
          setAccounts(mapped);
          setPayoutAccountId(mapped[0].id);
        }
      } catch (err) {
        console.warn("Could not fetch remote accounts:", err);
      } finally {
        setLoadingAccounts(false);
      }
    }
    loadAccounts();
  }, []);

  const selectedAccount = accounts.find((a) => a.id === payoutAccountId) || accounts[0];

  // Reset inputs when switching between INR and %
  useEffect(() => {
    setOpex("");
    setSalaries("");
    setReinvestment("");
    setPayout("");
  }, [mode]);

  // Strict regex input handling: numbers and up to 2 decimal places
  const handleInput =
    (setter: (val: string) => void, isPercent: boolean) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (val === "") {
        setter("");
        return;
      }
      if (/^\d*\.?\d{0,2}$/.test(val)) {
        if (isPercent && parseFloat(val) > 100) return;
        setter(val);
      }
    };

  const parseVal = (val: string) => parseFloat(val) || 0;

  // Live Math Engine
  const getAmount = (val: string) =>
    mode === "PERCENT" ? (netProfit * parseVal(val)) / 100 : parseVal(val);

  const amtOpex = getAmount(opex);
  const amtSalaries = getAmount(salaries);
  const amtReinvestment = getAmount(reinvestment);
  const amtPayout = getAmount(payout);

  const totalAllocated = amtOpex + amtSalaries + amtReinvestment + amtPayout;
  const unallocated = netProfit - totalAllocated;

  // Validations
  const isOverAllocated = !isLossMonth && totalAllocated > netProfit;
  const isOverdraft = !isLossMonth && amtPayout > (selectedAccount?.balance || 0);

  const canSubmit =
    !isSubmitting &&
    !isOverAllocated &&
    !isOverdraft &&
    !monthAlreadyClosed &&
    !loadingAccounts &&
    accounts.length > 0 &&
    (isLossMonth || totalAllocated > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await api.closeMonth(
        {
          month: targetDate.getMonth() + 1,
          year: targetDate.getFullYear(),
          net_profit: netProfit,
          alloc_opex: amtOpex,
          alloc_salaries: amtSalaries,
          alloc_reinvestment: amtReinvestment,
          alloc_partner_payout: amtPayout,
          payout_account_id: amtPayout > 0 ? selectedAccount.id : null,
        },
        actor
      );

      if (onSuccess) {
        onSuccess({
          month: `${currentMonth} ${currentYear}`,
          netProfit,
          payout: amtPayout,
        });
      }
      onBack();
    } catch (error: unknown) {
      console.error("Failed to close month", error);
      const msg = error instanceof Error ? error.message : "Failed to record monthly closure.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────
  if (loadingMetrics) {
    return (
      <div className="absolute inset-0 z-50 bg-[#F8F9FA] dark:bg-[#0D0B14] flex flex-col items-center justify-center p-6 text-[#99969E] dark:text-[#8C879B] animate-fade-in transition-colors">
        <SpinnerIcon className="w-8 h-8 animate-spin mb-3 text-[#5F33E1] dark:text-[#9F87EF]" />
        <p className="text-xs font-semibold">Calculating live finances for closure...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // LOSS MONTH VIEW (Acknowledge & Absorb Protocol)
  // ─────────────────────────────────────────────
  if (isLossMonth) {
    return (
      <div className="absolute inset-0 z-50 bg-[#F8F9FA] dark:bg-[#0D0B14] flex flex-col animate-fade-in transition-colors overflow-y-auto">
        {/* Header */}
        <header className="bg-white dark:bg-[#161324] px-5 lg:px-8 py-4 border-b border-[#F2F0F5] dark:border-[#28233D] shrink-0 transition-colors">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                disabled={isSubmitting}
                className="p-2 -ml-2 rounded-xl text-[#99969E] dark:text-[#8C879B] hover:text-[#120D26] dark:hover:text-[#F4F3F8] hover:bg-gray-100 dark:hover:bg-[#1F1B30] transition-colors flex items-center gap-1.5 text-xs font-bold"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div>
                <h2 className="text-lg font-black text-[#120D26] dark:text-[#F4F3F8]">Month-End Closure</h2>
                <p className="text-xs text-[#99969E] dark:text-[#8C879B] font-medium">{currentMonth} {currentYear}</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-extrabold tracking-wide text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900/50">
              Operational Deficit
            </span>
          </div>
        </header>

        {/* Loss Protocol Body */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto w-full my-auto">
          <div className="w-16 h-16 rounded-full bg-[#EDE8FB] dark:bg-[#29204E] border border-[#5F33E1]/20 dark:border-[#7C5CE8]/30 flex items-center justify-center mb-4">
            <AlertTriangleIcon className="w-8 h-8 text-[#5F33E1] dark:text-[#9F87EF]" />
          </div>

          <h2 className="text-2xl font-black text-[#120D26] dark:text-[#F4F3F8] mb-1">
            Operational Loss Detected
          </h2>

          <p className="text-3xl font-black text-red-600 dark:text-red-400 mb-4">
            - {formatINR(Math.abs(netProfit))}
          </p>

          {/* Income vs Expense breakdown */}
          <div className="w-full bg-white dark:bg-[#161324] border border-[#F2F0F5] dark:border-[#28233D] p-4 rounded-2xl mb-4 text-xs shadow-xs transition-colors">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#524E59] dark:text-[#8C879B] font-medium">Month Income</span>
              <span className="font-extrabold text-[#16A34A] dark:text-emerald-400">{formatINR(monthlyIncome)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#524E59] dark:text-[#8C879B] font-medium">Month Expenses</span>
              <span className="font-extrabold text-[#DC2626] dark:text-red-400">{formatINR(monthlyExpense)}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161324] p-4 rounded-2xl border border-[#F2F0F5] dark:border-[#28233D] text-left text-xs text-[#524E59] dark:text-[#ABA7B5] space-y-2 mb-6 shadow-xs transition-colors">
            <p className="font-bold text-[#120D26] dark:text-[#F4F3F8]">Proper Accounting Protocol:</p>
            <p>
              • Profit distributions and withdrawals are locked during negative cash flow.
            </p>
            <p>
              • Closing the month will record this operational loss into your balance sheet
              and adjust total business valuation.
            </p>
            <p>
              • If capital was injected from personal funds, log it as an Income entry in the
              ledger.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 mb-4 w-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-600 dark:text-red-400 font-bold">
              {errorMessage}
            </div>
          )}

          {monthAlreadyClosed && (
            <div className="p-3 mb-4 w-full bg-[#FEF3C7] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-900/50 rounded-2xl text-xs text-[#92400E] dark:text-amber-400 font-bold">
              This month has already been closed and locked.
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || monthAlreadyClosed}
            className="w-full py-4 rounded-2xl bg-[#5F33E1] dark:bg-[#7C5CE8] text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-[#5029C9] dark:hover:bg-[#6A48D7] disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-5 h-5 text-white animate-spin" />
                <span>Recording Loss Snapshot...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5 text-white" />
                <span>Acknowledge Loss & Lock Month</span>
              </>
            )}
          </button>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // PROFIT MONTH VIEW (Responsive 2-Column Desktop Grid)
  // ─────────────────────────────────────────────
  return (
    <div className="absolute inset-0 z-50 bg-[#F8F9FA] dark:bg-[#0D0B14] flex flex-col animate-fade-in text-[#120D26] dark:text-[#F4F3F8] transition-colors overflow-hidden">
      {/* 1. Header */}
      <header className="bg-white dark:bg-[#161324] px-5 lg:px-8 py-4 border-b border-[#F2F0F5] dark:border-[#28233D] shrink-0 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="p-2 -ml-2 rounded-xl text-[#99969E] dark:text-[#8C879B] hover:text-[#120D26] dark:hover:text-[#F4F3F8] hover:bg-gray-100 dark:hover:bg-[#1F1B30] transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <div>
              <h2 className="text-lg font-black text-[#120D26] dark:text-[#F4F3F8]">Month-End Profit Allocator</h2>
              <p className="text-xs text-[#99969E] dark:text-[#8C879B] font-medium">{currentMonth} {currentYear}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex text-[10px] uppercase font-extrabold tracking-wide text-[#5F33E1] dark:text-[#9F87EF] bg-[#EDE8FB] dark:bg-[#29204E] px-2.5 py-1 rounded-full">
              Accounting Ritual
            </span>
          </div>
        </div>
      </header>

      {/* 2. Scrollable Allocation Body: 2-Column Desktop Layout */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 scrollbar-hide">
        <div className="max-w-5xl mx-auto">
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {monthAlreadyClosed && (
            <div className="mb-4 p-3.5 bg-[#FEF3C7] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-900/50 rounded-2xl text-xs text-[#92400E] dark:text-amber-400 font-bold flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 shrink-0 text-[#D97706]" />
              <span>{currentMonth} {currentYear} has already been closed and locked. You cannot close it again.</span>
            </div>
          )}

          {/* 2-Column Responsive Grid on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start pb-8">
            
            {/* LEFT COLUMN: Summary Hero, Income Breakdown, Live Unallocated & Desktop Action (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0">
              
              {/* Hero Card: Net Profit & Mode Toggle */}
              <div className="bg-white dark:bg-[#161324] rounded-3xl p-5 border border-[#F2F0F5] dark:border-[#28233D] shadow-xs transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E] dark:text-[#8C879B]">
                      Net Profit Earned
                    </span>
                    <h1 className="text-3xl font-black text-[#120D26] dark:text-[#F4F3F8] tracking-tight mt-0.5">
                      {formatINR(netProfit)}
                    </h1>
                  </div>

                  {/* Mode Switcher: Rupees vs Percentage */}
                  <div className="flex bg-[#F5F2FF] dark:bg-[#1F1B30] p-1 rounded-xl border border-[#EDE8FB] dark:border-[#28233D] transition-colors">
                    <button
                      type="button"
                      onClick={() => setMode("AMOUNT")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        mode === "AMOUNT"
                          ? "bg-[#5F33E1] dark:bg-[#7C5CE8] text-white shadow-xs"
                          : "text-[#99969E] dark:text-[#8C879B] hover:text-[#5F33E1] dark:hover:text-[#9F87EF]"
                      }`}
                    >
                      ₹ INR
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("PERCENT")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                        mode === "PERCENT"
                          ? "bg-[#5F33E1] dark:bg-[#7C5CE8] text-white shadow-xs"
                          : "text-[#99969E] dark:text-[#8C879B] hover:text-[#5F33E1] dark:hover:text-[#9F87EF]"
                      }`}
                    >
                      <PercentageSquareIcon className="w-3.5 h-3.5" />
                      <span>%</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Income vs Expenses breakdown */}
              <div className="bg-white dark:bg-[#161324] rounded-2xl p-4 border border-[#F2F0F5] dark:border-[#28233D] shadow-xs space-y-2 transition-colors">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#99969E] dark:text-[#8C879B] font-semibold">Total Revenue / Income</span>
                  <span className="font-extrabold text-[#16A34A] dark:text-emerald-400 text-sm">{formatINR(monthlyIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#99969E] dark:text-[#8C879B] font-semibold">Total Store Expenses</span>
                  <span className="font-extrabold text-[#DC2626] dark:text-red-400 text-sm">{formatINR(monthlyExpense)}</span>
                </div>
              </div>

              {/* Live Unallocated Retained Earnings Status Card */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isOverAllocated || isOverdraft
                    ? "bg-[#FEF2F2] dark:bg-red-950/30 border-[#FEE2E2] dark:border-red-900/50"
                    : "bg-white dark:bg-[#161324] border-[#F2F0F5] dark:border-[#28233D] shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-[#120D26] dark:text-[#F4F3F8]">
                    Unallocated Retained Earnings
                  </span>
                  <span className="text-[10px] text-[#99969E] dark:text-[#8C879B] font-medium">
                    Stays in Business
                  </span>
                </div>

                <p
                  className={`text-3xl font-black ${
                    isOverAllocated || isOverdraft
                      ? "text-[#DC2626] dark:text-red-400"
                      : "text-[#5F33E1] dark:text-[#9F87EF]"
                  }`}
                >
                  {formatINR(Math.abs(unallocated))}
                </p>

                {isOverAllocated && (
                  <p className="text-xs text-[#DC2626] dark:text-red-400 mt-2 font-bold flex items-center gap-1">
                    <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Total allocations exceed net profit by {formatINR(Math.abs(unallocated))}.
                    </span>
                  </p>
                )}

                {!isOverAllocated && !isOverdraft && unallocated > 0 && (
                  <p className="text-[11px] text-[#99969E] dark:text-[#8C879B] mt-2 font-medium">
                    This amount is not withdrawn or ring-fenced; it naturally remains as working capital across your payment accounts.
                  </p>
                )}
              </div>

              {/* Desktop Submit Button (visible on desktop) */}
              <div className="hidden lg:block pt-1">
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] dark:bg-[#7C5CE8] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 dark:shadow-[#7C5CE8]/20 hover:bg-[#5029C9] dark:hover:bg-[#6A48D7] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerIcon className="w-5 h-5 text-white animate-spin" />
                      <span>Closing Month & Saving Snapshot...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5 text-white" />
                      <span>Lock Month & Confirm Closure</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: Allocation Buckets & Cash Payout (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Allocation Buckets */}
              <div className="space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E] dark:text-[#8C879B]">
                  Retained Earnings Designations
                </span>

                {/* 1. Operating Expense Reserve */}
                <div className="bg-white dark:bg-[#161324] rounded-2xl p-4 border border-[#F2F0F5] dark:border-[#28233D] focus-within:border-[#5F33E1] dark:focus-within:border-[#7C5CE8] transition-all shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EDE8FB] dark:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
                        <WalletIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">Next Month OpEx Reserve</h4>
                        <p className="text-[10px] text-[#99969E] dark:text-[#8C879B]">Rent, electricity & utilities</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#5F33E1] dark:text-[#9F87EF]">
                      {formatINR(amtOpex)}
                    </span>
                  </div>
                  <div className="flex items-center border border-[#F2F0F5] dark:border-[#28233D] rounded-xl px-3 py-2 bg-[#F8F9FA] dark:bg-[#1F1B30] transition-colors">
                    <span className="text-xs font-bold text-[#99969E] dark:text-[#8C879B] mr-2">
                      {mode === "PERCENT" ? "%" : "₹"}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={mode === "PERCENT" ? "0.00 %" : "0.00"}
                      value={opex}
                      onChange={handleInput(setOpex, mode === "PERCENT")}
                      className="w-full bg-transparent text-sm font-bold text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] outline-none"
                    />
                  </div>
                </div>

                {/* 2. Salary Reserve */}
                <div className="bg-white dark:bg-[#161324] rounded-2xl p-4 border border-[#F2F0F5] dark:border-[#28233D] focus-within:border-[#5F33E1] dark:focus-within:border-[#7C5CE8] transition-all shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EDE8FB] dark:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
                        <UserOctagonIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">Staff Salaries Reserve</h4>
                        <p className="text-[10px] text-[#99969E] dark:text-[#8C879B]">Retained in bank for payroll</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#5F33E1] dark:text-[#9F87EF]">
                      {formatINR(amtSalaries)}
                    </span>
                  </div>
                  <div className="flex items-center border border-[#F2F0F5] dark:border-[#28233D] rounded-xl px-3 py-2 bg-[#F8F9FA] dark:bg-[#1F1B30] transition-colors">
                    <span className="text-xs font-bold text-[#99969E] dark:text-[#8C879B] mr-2">
                      {mode === "PERCENT" ? "%" : "₹"}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={mode === "PERCENT" ? "0.00 %" : "0.00"}
                      value={salaries}
                      onChange={handleInput(setSalaries, mode === "PERCENT")}
                      className="w-full bg-transparent text-sm font-bold text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] outline-none"
                    />
                  </div>
                </div>

                {/* 3. Business Reinvestment */}
                <div className="bg-white dark:bg-[#161324] rounded-2xl p-4 border border-[#F2F0F5] dark:border-[#28233D] focus-within:border-[#5F33E1] dark:focus-within:border-[#7C5CE8] transition-all shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EDE8FB] dark:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
                        <TrendUpIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">Store Expansion & CapEx</h4>
                        <p className="text-[10px] text-[#99969E] dark:text-[#8C879B]">Shelving, deep freezers, interiors</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#5F33E1] dark:text-[#9F87EF]">
                      {formatINR(amtReinvestment)}
                    </span>
                  </div>
                  <div className="flex items-center border border-[#F2F0F5] dark:border-[#28233D] rounded-xl px-3 py-2 bg-[#F8F9FA] dark:bg-[#1F1B30] transition-colors">
                    <span className="text-xs font-bold text-[#99969E] dark:text-[#8C879B] mr-2">
                      {mode === "PERCENT" ? "%" : "₹"}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={mode === "PERCENT" ? "0.00 %" : "0.00"}
                      value={reinvestment}
                      onChange={handleInput(setReinvestment, mode === "PERCENT")}
                      className="w-full bg-transparent text-sm font-bold text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Physical Cash Movement: Partner Payout */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5F33E1] dark:text-[#9F87EF]">
                    Physical Cash Movement (Leaves Store)
                  </span>
                  <span className="text-[10px] bg-[#EDE8FB] dark:bg-[#29204E] text-[#5F33E1] dark:text-[#9F87EF] font-bold px-2 py-0.5 rounded-full">
                    Triggers Ledger Entry
                  </span>
                </div>

                <div className="bg-white dark:bg-[#161324] rounded-2xl p-4 border-2 border-[#5F33E1] dark:border-[#7C5CE8] shadow-xs transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#5F33E1] dark:bg-[#7C5CE8] flex items-center justify-center text-white">
                        <BriefcaseIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">Partner Profit Payout</h4>
                        <p className="text-[10px] text-[#99969E] dark:text-[#8C879B]">Withdrawal to personal account</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-[#5F33E1] dark:text-[#9F87EF]">
                      {formatINR(amtPayout)}
                    </span>
                  </div>

                  <div className="flex items-center border border-[#F2F0F5] dark:border-[#28233D] rounded-xl px-3 py-2 bg-[#F8F9FA] dark:bg-[#1F1B30] focus-within:border-[#5F33E1] dark:focus-within:border-[#7C5CE8] transition-colors">
                    <span className="text-xs font-bold text-[#99969E] dark:text-[#8C879B] mr-2">
                      {mode === "PERCENT" ? "%" : "₹"}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={mode === "PERCENT" ? "0.00 %" : "0.00"}
                      value={payout}
                      onChange={handleInput(setPayout, mode === "PERCENT")}
                      className="w-full bg-transparent text-sm font-bold text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Account-Level Overdraft Protection */}
              {amtPayout > 0 && (
                <div className="bg-white dark:bg-[#161324] rounded-2xl p-4 border border-[#F2F0F5] dark:border-[#28233D] space-y-2 shadow-xs transition-colors">
                  <label className="block text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">
                    Withdraw Payout From Account
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setPayoutAccountId(acc.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          payoutAccountId === acc.id
                            ? "border-[#5F33E1] dark:border-[#7C5CE8] bg-[#EDE8FB]/60 dark:bg-[#29204E]/60 text-[#120D26] dark:text-[#F4F3F8]"
                            : "border-[#F2F0F5] dark:border-[#28233D] bg-[#F8F9FA] dark:bg-[#1F1B30] text-[#120D26] dark:text-[#F4F3F8] hover:bg-gray-100 dark:hover:bg-[#29204E]"
                        }`}
                      >
                        <p className="text-[11px] font-bold truncate">{acc.name}</p>
                        <p className="text-[10px] text-[#99969E] dark:text-[#8C879B] mt-0.5">
                          {formatINR(acc.balance)}
                        </p>
                      </button>
                    ))}
                  </div>

                  {isOverdraft && (
                    <p className="text-xs text-[#DC2626] dark:text-red-400 font-bold mt-2 flex items-center gap-1">
                      <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Payout ({formatINR(amtPayout)}) exceeds {selectedAccount.name} balance (
                        {formatINR(selectedAccount.balance)}). Overdraft prevented.
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer for Mobile (Hidden on Desktop because desktop has the button in the sticky left summary column) */}
      <footer className="lg:hidden p-4 border-t border-[#F2F0F5] dark:border-[#28233D] bg-white dark:bg-[#161324] shrink-0 transition-colors">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] dark:bg-[#7C5CE8] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 dark:shadow-[#7C5CE8]/20 hover:bg-[#5029C9] dark:hover:bg-[#6A48D7] flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <SpinnerIcon className="w-5 h-5 text-white animate-spin" />
              <span>Closing Month...</span>
            </>
          ) : (
            <>
              <CheckIcon className="w-5 h-5 text-white" />
              <span>Lock Month & Confirm Closure</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
