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
  { id: "acc-1", name: "Cash Drawer", balance: 120000 },
  { id: "acc-2", name: "HDFC Bank", balance: 650000 },
  { id: "acc-3", name: "Shop UPI", balance: 42000 },
];

export default function MonthEndAllocator({ onBack, onSuccess }: MonthEndAllocatorProps) {
  const today = new Date();
  const currentMonth = today.toLocaleString("en-IN", { month: "long" });
  const currentYear = today.getFullYear();

  // Simulated Net Profit: Defaults to profitable month, with interactive test toggle
  const [isTestLossMonth, setIsTestLossMonth] = useState<boolean>(false);
  const netProfit = isTestLossMonth ? -40000 : 500000;
  const isLossMonth = netProfit < 0;

  const [accounts] = useState<AccountItem[]>(DEFAULT_ACCOUNTS);
  const [mode, setMode] = useState<"AMOUNT" | "PERCENT">("AMOUNT");

  // Allocation input states
  const [opex, setOpex] = useState<string>("");
  const [salaries, setSalaries] = useState<string>("");
  const [reinvestment, setReinvestment] = useState<string>("");
  const [payout, setPayout] = useState<string>("");
  const [payoutAccountId, setPayoutAccountId] = useState<string>(DEFAULT_ACCOUNTS[1].id); // HDFC Bank default
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  const isOverAllocated = unallocated < 0;
  const isOverdraft = amtPayout > (selectedAccount?.balance || 0);

  const canSubmit =
    !isSubmitting &&
    !isOverAllocated &&
    !isOverdraft &&
    (isLossMonth || totalAllocated > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      // Simulate RPC execution delay
      await new Promise((resolve) => setTimeout(resolve, 1400));

      if (onSuccess) {
        onSuccess({
          month: `${currentMonth} ${currentYear}`,
          netProfit,
          payout: amtPayout,
        });
      } else {
        alert(
          isLossMonth
            ? `Loss of ${formatINR(Math.abs(netProfit))} acknowledged. Month-end snapshot recorded.`
            : `Month-end closed successfully! Partner payout of ${formatINR(amtPayout)} recorded.`
        );
      }
      onBack();
    } catch (error) {
      console.error("Failed to close month", error);
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

          <div className="bg-white rounded-2xl p-4 border border-[#F2F0F5] w-full mb-4 shadow-sm">
            <p className="text-xs text-[#99969E] uppercase tracking-wider font-bold mb-1">
              Net Loss for {currentMonth}
            </p>
            <p className="text-3xl font-black text-[#DC2626]">
              - {formatINR(Math.abs(netProfit))}
            </p>
          </div>

          <p className="text-xs text-[#524E59] mb-8 leading-relaxed">
            Profit allocations and partner payouts are disabled for this month. 
            Closing the month will record this dip in your historical business valuation 
            and absorb the loss into your existing cash reserves.
          </p>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#120D26] hover:bg-black disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-5 h-5 text-white" />
                <span>Closing Month...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5 text-white" />
                <span>Acknowledge & Close Month</span>
              </>
            )}
          </button>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // PROFITABLE MONTH VIEW (3-Bucket + Payout Flow)
  // ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-white px-5 py-3.5 border-b border-[#F2F0F5] flex items-center justify-between shrink-0">
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

        {/* Demo Toggle to test Loss Month */}
        <button
          onClick={() => setIsTestLossMonth(true)}
          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]"
        >
          Test Loss State
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
        {/* Hero Card: Net Profit */}
        <div className="bg-[#5F33E1] text-white p-6 rounded-3xl shadow-lg shadow-[#5F33E1]/25 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10">
            <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-1">
              Available Net Profit
            </p>
            <p className="text-4xl sm:text-[40px] font-black tracking-tight">
              {formatINR(netProfit)}
            </p>
            <p className="text-xs text-white/70 mt-2 font-medium">
              Calculated from all verified ledger inflows and operational outflows this month.
            </p>
          </div>
        </div>

        {/* Mode Toggle: Rupees vs Percentage */}
        <div className="flex bg-white p-1 rounded-2xl border border-[#F2F0F5] shadow-xs">
          <button
            type="button"
            onClick={() => setMode("AMOUNT")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === "AMOUNT"
                ? "bg-[#EDE8FB] text-[#5F33E1] shadow-xs"
                : "text-[#99969E] hover:text-[#120D26]"
            }`}
          >
            <WalletIcon className="w-4 h-4" />
            <span>Rupees (₹)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("PERCENT")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === "PERCENT"
                ? "bg-[#EDE8FB] text-[#5F33E1] shadow-xs"
                : "text-[#99969E] hover:text-[#120D26]"
            }`}
          >
            <PercentageSquareIcon className="w-4 h-4" />
            <span>Percentage (%)</span>
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#99969E]">
            Designate Retained Profit
          </h3>
          <p className="text-[11px] text-[#99969E]">
            Reserve funds stay safely in your accounts; only partner withdrawals move money.
          </p>
        </div>

        {/* 4 Allocation Buckets */}
        <div className="space-y-3">
          {[
            {
              label: "Store OpEx Reserve",
              desc: "Buffer for rent, bills & maintenance",
              icon: BriefcaseIcon,
              val: opex,
              set: setOpex,
            },
            {
              label: "Salaries Reserve",
              desc: "Ring-fenced payroll for next month",
              icon: UserOctagonIcon,
              val: salaries,
              set: setSalaries,
            },
            {
              label: "Reinvestment (CapEx)",
              desc: "New inventory, equipment & store growth",
              icon: TrendUpIcon,
              val: reinvestment,
              set: setReinvestment,
            },
            {
              label: "Partner Payout",
              desc: "Physical withdrawal taken by partners",
              icon: WalletIcon,
              val: payout,
              set: setPayout,
            },
          ].map((bucket, i) => {
            const Icon = bucket.icon;
            const computedAmt = getAmount(bucket.val);

            return (
              <div
                key={i}
                className="bg-white p-4 rounded-2xl border border-[#F2F0F5] shadow-xs space-y-2 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#F5F2FF] flex items-center justify-center text-[#5F33E1]">
                      <Icon className="w-5 h-5 text-[#5F33E1]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#120D26]">{bucket.label}</p>
                      <p className="text-[10px] text-[#99969E]">{bucket.desc}</p>
                    </div>
                  </div>

                  {mode === "PERCENT" && (
                    <span className="text-xs font-black text-[#5F33E1]">
                      {formatINR(computedAmt)}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 border-b border-[#F2F0F5] pb-1 pt-1">
                  <span className="text-xl font-black text-[#99969E] select-none">
                    {mode === "AMOUNT" ? "₹" : "%"}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={bucket.val}
                    onChange={handleInput(bucket.set, mode === "PERCENT")}
                    disabled={isSubmitting}
                    className="w-full text-2xl font-black bg-transparent outline-none text-[#120D26]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Payout Account Selector (Only shown if Partner Payout > 0) */}
        {amtPayout > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-[#F2F0F5] shadow-xs space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#120D26]">
                Withdraw Payout From:
              </label>
              <span className="text-[10px] font-bold text-[#5F33E1]">
                Account-Level Balance Check
              </span>
            </div>

            <select
              value={payoutAccountId}
              onChange={(e) => setPayoutAccountId(e.target.value)}
              className="w-full p-3 bg-[#F8F9FA] rounded-xl border border-[#F2F0F5] text-xs font-bold text-[#120D26] outline-none"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatINR(acc.balance)})
                </option>
              ))}
            </select>

            {isOverdraft && (
              <p className="text-[11px] font-bold text-[#DC2626] flex items-center gap-1 mt-1">
                <AlertTriangleIcon className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                <span>
                  Payout of {formatINR(amtPayout)} exceeds {selectedAccount.name} balance (
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
              <SpinnerIcon className="w-5 h-5 text-white" />
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
