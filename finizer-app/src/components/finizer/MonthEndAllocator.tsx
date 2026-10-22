"use client";
import React, { useState, useEffect } from "react";
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
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";

interface AccountItem {
  id: string;
  name: string;
  balance: number;
}

interface MonthEndAllocatorProps {
  onBack: () => void;
  onSuccess?: (summary: { month: string; netProfit: number; payout: number }) => void;
}

const DEFAULT_ACCOUNTS: AccountItem[] = [
  { id: "acc-1", name: "Main Cash Drawer", balance: 120000 },
  { id: "acc-2", name: "HDFC Bank Account", balance: 650000 },
  { id: "acc-3", name: "PhonePe UPI", balance: 42000 },
];

export default function MonthEndAllocator({ onBack, onSuccess }: MonthEndAllocatorProps) {
  const { actor } = useActor();
  const today = new Date();
  const currentMonth = today.toLocaleString("en-IN", { month: "long" });
  const currentYear = today.getFullYear();

  // Simulated Net Profit: Defaults to profitable month, with interactive test toggle
  const [isTestLossMonth, setIsTestLossMonth] = useState<boolean>(false);
  const netProfit = isTestLossMonth ? -40000 : 500000;
  const isLossMonth = netProfit < 0;

  const [accounts, setAccounts] = useState<AccountItem[]>(DEFAULT_ACCOUNTS);
  const [mode, setMode] = useState<"AMOUNT" | "PERCENT">("AMOUNT");

  // Allocation input states
  const [opex, setOpex] = useState<string>("");
  const [salaries, setSalaries] = useState<string>("");
  const [reinvestment, setReinvestment] = useState<string>("");
  const [payout, setPayout] = useState<string>("");
  const [payoutAccountId, setPayoutAccountId] = useState<string>(DEFAULT_ACCOUNTS[1].id);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load real accounts from Supabase if available
  useEffect(() => {
    async function loadAccounts() {
      try {
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
        console.warn("Could not fetch remote accounts, using defaults:", err);
      }
    }
    loadAccounts();
  }, []);

  const selectedAccount = accounts.find((a) => a.id === payoutAccountId) || accounts[0];

  // FIX #3: Mode-Switch Reset to prevent 100,000% calculation explosion
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
    (isLossMonth || totalAllocated > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await api.closeMonth(
        {
          month: today.getMonth() + 1,
          year: today.getFullYear(),
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
  // LOSS MONTH VIEW (Acknowledge & Absorb Protocol)
  // ─────────────────────────────────────────────
  if (isLossMonth) {
    return (
      <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col animate-fade-in">
        {/* Header */}
        <header className="bg-white px-5 py-4 border-b border-[#F2F0F5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="p-1 -ml-1 text-[#99969E] hover:text-[#120D26]"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-black text-[#120D26]">Month-End Closure</h2>
              <p className="text-xs text-[#99969E] font-medium">{currentMonth} {currentYear}</p>
            </div>
          </div>

          {/* Test toggle */}
          <button
            onClick={() => setIsTestLossMonth(false)}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#EDE8FB] text-[#5F33E1]"
          >
            Switch to Profit Mode
          </button>
        </header>

        {/* Loss Protocol Body */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#FEF2F2] border border-[#FEE2E2] flex items-center justify-center mb-4">
            <AlertTriangleIcon className="w-8 h-8 text-[#DC2626]" />
          </div>

          <h2 className="text-2xl font-black text-[#120D26] mb-2">
            Operational Loss Detected
          </h2>

          <p className="text-3xl font-black text-[#DC2626] mb-4">
            - {formatINR(Math.abs(netProfit))}
          </p>

          <div className="bg-white p-4 rounded-2xl border border-[#F2F0F5] text-left text-xs text-[#524E59] space-y-2 mb-6">
            <p className="font-bold text-[#120D26]">Proper Accounting Protocol:</p>
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
            <div className="p-3 mb-4 w-full bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-bold">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-[#120D26] text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-5 h-5 text-white" />
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
  // PROFIT MONTH VIEW (Dual-Mode Allocation Engine)
  // ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col animate-fade-in">
      {/* 1. Header */}
      <header className="bg-white px-5 py-4 border-b border-[#F2F0F5] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="p-1 -ml-1 text-[#99969E] hover:text-[#120D26]"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-black text-[#120D26]">Month-End Profit Allocator</h2>
            <p className="text-xs text-[#99969E] font-medium">{currentMonth} {currentYear}</p>
          </div>
        </div>

        {/* Test toggle */}
        <button
          onClick={() => setIsTestLossMonth(true)}
          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]"
        >
          Test Loss Mode
        </button>
      </header>

      {/* 2. Scrollable Allocation Body */}
      <main className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide max-w-lg mx-auto w-full">
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-bold flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hero Card: Net Profit & Mode Toggle */}
        <div className="bg-white rounded-3xl p-5 border border-[#F2F0F5] shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E]">
                Net Profit Earned
              </span>
              <h1 className="text-3xl font-black text-[#120D26] tracking-tight mt-0.5">
                {formatINR(netProfit)}
              </h1>
            </div>

            {/* Mode Switcher: Rupees vs Percentage */}
            <div className="flex bg-[#F5F2FF] p-1 rounded-xl border border-[#EDE8FB]">
              <button
                type="button"
                onClick={() => setMode("AMOUNT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  mode === "AMOUNT"
                    ? "bg-[#5F33E1] text-white shadow-xs"
                    : "text-[#99969E] hover:text-[#5F33E1]"
                }`}
              >
                ₹ INR
              </button>
              <button
                type="button"
                onClick={() => setMode("PERCENT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  mode === "PERCENT"
                    ? "bg-[#5F33E1] text-white shadow-xs"
                    : "text-[#99969E] hover:text-[#5F33E1]"
                }`}
              >
                <PercentageSquareIcon className="w-3.5 h-3.5" />
                <span>%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Allocation Buckets */}
        <div className="space-y-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E]">
            Retained Earnings Designations
          </span>

          {/* 1. Operating Expense Reserve */}
          <div className="bg-white rounded-2xl p-4 border border-[#F2F0F5] focus-within:border-[#5F33E1] transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
                  <WalletIcon className="w-4 h-4 text-[#5F33E1]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#120D26]">Next Month OpEx Reserve</h4>
                  <p className="text-[10px] text-[#99969E]">Rent, electricity & utilities</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#5F33E1]">
                {formatINR(amtOpex)}
              </span>
            </div>
            <div className="flex items-center border border-[#F2F0F5] rounded-xl px-3 py-2 bg-[#F8F9FA]">
              <span className="text-xs font-bold text-[#99969E] mr-2">
                {mode === "PERCENT" ? "%" : "₹"}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={mode === "PERCENT" ? "0.00 %" : "0.00"}
                value={opex}
                onChange={handleInput(setOpex, mode === "PERCENT")}
                className="w-full bg-transparent text-sm font-bold text-[#120D26] outline-none"
              />
            </div>
          </div>

          {/* 2. Salary Reserve */}
          <div className="bg-white rounded-2xl p-4 border border-[#F2F0F5] focus-within:border-[#5F33E1] transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
                  <UserOctagonIcon className="w-4 h-4 text-[#5F33E1]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#120D26]">Staff Salaries Reserve</h4>
                  <p className="text-[10px] text-[#99969E]">Retained in bank for payroll</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#5F33E1]">
                {formatINR(amtSalaries)}
              </span>
            </div>
            <div className="flex items-center border border-[#F2F0F5] rounded-xl px-3 py-2 bg-[#F8F9FA]">
              <span className="text-xs font-bold text-[#99969E] mr-2">
                {mode === "PERCENT" ? "%" : "₹"}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={mode === "PERCENT" ? "0.00 %" : "0.00"}
                value={salaries}
                onChange={handleInput(setSalaries, mode === "PERCENT")}
                className="w-full bg-transparent text-sm font-bold text-[#120D26] outline-none"
              />
            </div>
          </div>

          {/* 3. Business Reinvestment */}
          <div className="bg-white rounded-2xl p-4 border border-[#F2F0F5] focus-within:border-[#5F33E1] transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
                  <TrendUpIcon className="w-4 h-4 text-[#5F33E1]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#120D26]">Store Expansion & CapEx</h4>
                  <p className="text-[10px] text-[#99969E]">Shelving, deep freezers, interiors</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#5F33E1]">
                {formatINR(amtReinvestment)}
              </span>
            </div>
            <div className="flex items-center border border-[#F2F0F5] rounded-xl px-3 py-2 bg-[#F8F9FA]">
              <span className="text-xs font-bold text-[#99969E] mr-2">
                {mode === "PERCENT" ? "%" : "₹"}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={mode === "PERCENT" ? "0.00 %" : "0.00"}
                value={reinvestment}
                onChange={handleInput(setReinvestment, mode === "PERCENT")}
                className="w-full bg-transparent text-sm font-bold text-[#120D26] outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. Physical Cash Movement: Partner Payout */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5F33E1]">
              Physical Cash Movement (Leaves Store)
            </span>
            <span className="text-[10px] bg-[#EDE8FB] text-[#5F33E1] font-bold px-2 py-0.5 rounded-full">
              Triggers Ledger Entry
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border-2 border-[#5F33E1] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#5F33E1] flex items-center justify-center text-white">
                  <BriefcaseIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#120D26]">Partner Profit Payout</h4>
                  <p className="text-[10px] text-[#99969E]">Withdrawal to personal account</p>
                </div>
              </div>
              <span className="text-xs font-black text-[#5F33E1]">
                {formatINR(amtPayout)}
              </span>
            </div>

            <div className="flex items-center border border-[#F2F0F5] rounded-xl px-3 py-2 bg-[#F8F9FA] focus-within:border-[#5F33E1]">
              <span className="text-xs font-bold text-[#99969E] mr-2">
                {mode === "PERCENT" ? "%" : "₹"}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={mode === "PERCENT" ? "0.00 %" : "0.00"}
                value={payout}
                onChange={handleInput(setPayout, mode === "PERCENT")}
                className="w-full bg-transparent text-sm font-bold text-[#120D26] outline-none"
              />
            </div>
          </div>
        </div>

        {/* FIX #1: Account-Level Overdraft Protection */}
        {amtPayout > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-[#F2F0F5] space-y-2">
            <label className="block text-xs font-bold text-[#120D26]">
              Withdraw Payout From Account
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setPayoutAccountId(acc.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    payoutAccountId === acc.id
                      ? "border-[#5F33E1] bg-[#EDE8FB]/60"
                      : "border-[#F2F0F5] bg-[#F8F9FA] hover:bg-gray-100"
                  }`}
                >
                  <p className="text-[11px] font-bold text-[#120D26] truncate">{acc.name}</p>
                  <p className="text-[10px] text-[#99969E] mt-0.5">
                    {formatINR(acc.balance)}
                  </p>
                </button>
              ))}
            </div>

            {isOverdraft && (
              <p className="text-xs text-[#DC2626] font-bold mt-2 flex items-center gap-1">
                <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Payout ({formatINR(amtPayout)}) exceeds {selectedAccount.name} balance (
                  {formatINR(selectedAccount.balance)}). Overdraft prevented.
                </span>
              </p>
            )}
          </div>
        )}

        {/* Unallocated Retained Earnings Status Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isOverAllocated || isOverdraft
              ? "bg-[#FEF2F2] border-[#FEE2E2]"
              : "bg-white border-[#F2F0F5] shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-extrabold text-[#120D26]">
              Unallocated Retained Earnings
            </span>
            <span className="text-[10px] text-[#99969E] font-medium">
              Stays in Business Accounts
            </span>
          </div>

          <p
            className={`text-3xl font-black ${
              isOverAllocated || isOverdraft ? "text-[#DC2626]" : "text-[#5F33E1]"
            }`}
          >
            {formatINR(Math.abs(unallocated))}
          </p>

          {isOverAllocated && (
            <p className="text-xs text-[#DC2626] mt-2 font-bold flex items-center gap-1">
              <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
              <span>
                Total allocations exceed net profit by {formatINR(Math.abs(unallocated))}.
              </span>
            </p>
          )}

          {!isOverAllocated && !isOverdraft && unallocated > 0 && (
            <p className="text-[11px] text-[#99969E] mt-2 font-medium">
              This amount is not withdrawn or ring-fenced; it naturally remains as working
              capital in your business.
            </p>
          )}
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="p-5 pt-3 pb-8 border-t border-[#F2F0F5] bg-white shrink-0">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 hover:bg-[#5029C9] flex items-center justify-center gap-2"
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
      </footer>
    </div>
  );
}
