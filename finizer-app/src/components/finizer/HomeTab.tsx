"use client";

import React, { useEffect, useState } from "react";
import { getFinancialMetrics, type FinancialMetrics } from "@/services/api";
import { formatINR } from "@/utils/format";
import {
  WalletIcon,
  BriefcaseIcon,
  TrendUpIcon,
  SpinnerIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
} from "../icons";

interface TransactionItem {
  id: string;
  title: string;
  account: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  time: string;
}

interface HomeTabProps {
  onNavigateToDeliveries?: () => void;
  onOpenMonthEnd?: () => void;
  transactions?: TransactionItem[];
}

const DEFAULT_RECENT: TransactionItem[] = [];

export default function HomeTab({
  onNavigateToDeliveries,
  onOpenMonthEnd,
  transactions = DEFAULT_RECENT,
}: HomeTabProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const startDate = `${y}-${String(m + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const endDate = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const data = await getFinancialMetrics(startDate, endDate);
        setMetrics(data);
      } catch (err) {
        console.error("Failed to load financial metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] p-6 text-[#99969E] animate-fade-in">
        <SpinnerIcon className="w-8 h-8 animate-spin mb-3 text-[#5F33E1]" />
        <p className="text-xs font-semibold">Calculating live finances...</p>
      </div>
    );
  }

  const totalCash = metrics?.total_cash || 0;
  const inventoryValue = metrics?.inventory_value || 0;
  const totalBusinessValue = totalCash + inventoryValue;
  const monthlyIncome = metrics?.monthly_income || 0;
  const monthlyExpense = metrics?.monthly_expense || 0;
  const netProfit = monthlyIncome - monthlyExpense;
  const recentItems = transactions.slice(0, 5);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* 1 + 2: Hero + P&L side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* 1. Total Business Value Hero Card */}
      <div className="bg-[#5F33E1] text-white rounded-3xl p-6 shadow-lg shadow-[#5F33E1]/25 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10">
          <p className="text-[11px] uppercase font-bold tracking-wider text-white/75 mb-1">
            Total Business Value
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            {formatINR(totalBusinessValue)}
          </h1>

          <div className="flex flex-wrap gap-2.5 mt-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white">
              <WalletIcon className="w-3.5 h-3.5" /> Cash: {formatINR(totalCash)}
            </span>
            <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-white">
              <BriefcaseIcon className="w-3.5 h-3.5" /> Stock: {formatINR(inventoryValue)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Monthly P&L Card */}
      <div className="bg-white dark:bg-[#161324] border border-[#F2F0F5] dark:border-[#28233D] rounded-3xl p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#120D26] dark:text-[#F4F3F8] font-extrabold flex items-center gap-2 text-sm">
            <TrendUpIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF]" /> This Month's P&L
          </h2>
          {onOpenMonthEnd && (
            <button
              onClick={onOpenMonthEnd}
              className="text-[11px] font-bold text-[#5F33E1] dark:text-[#9F87EF] hover:underline flex items-center gap-1 active:scale-95 transition-transform"
            >
              Allocate Profit <ChevronRightIcon className="w-3 h-3 inline" />
            </button>
          )}
        </div>
        <div className="space-y-3.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#99969E] dark:text-[#8C879B] font-semibold">Total Income</span>
            <span className="font-extrabold text-[#5F33E1] dark:text-[#4ADE80] text-sm">{formatINR(monthlyIncome)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#99969E] dark:text-[#8C879B] font-semibold">Total Expenses</span>
            <span className="font-extrabold text-[#120D26] dark:text-[#F87171] text-sm">{formatINR(monthlyExpense)}</span>
          </div>
          <div
            onClick={onOpenMonthEnd}
            className={`border-t border-[#F2F0F5] dark:border-[#28233D] pt-3 flex justify-between items-center ${onOpenMonthEnd ? "cursor-pointer hover:bg-gray-50/60 dark:hover:bg-[#1F1B30] -mx-2 px-2 rounded-xl transition-colors" : ""}`}
            title="Click to allocate profit"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[#120D26] dark:text-[#F4F3F8] font-bold text-xs">Net Profit</span>
              {onOpenMonthEnd && (
                <span className="text-[10px] bg-[#EDE8FB] dark:bg-[#29204E] text-[#5F33E1] dark:text-[#9F87EF] font-bold px-1.5 py-0.5 rounded-md">
                  Allocate
                </span>
              )}
            </div>
            <span className="font-black text-[#120D26] dark:text-[#F4F3F8] text-sm">
              {formatINR(netProfit)}
            </span>
          </div>
        </div>
      </div>
      </div>{/* end grid */}

      {/* 3. Deliveries Alert Banner (if handler passed) */}
      {onNavigateToDeliveries && (
        <button
          onClick={onNavigateToDeliveries}
          className="w-full bg-[#FEF3C7] dark:bg-amber-950/30 border border-[#FDE68A] dark:border-amber-900/40 hover:bg-[#FDE68A]/70 dark:hover:bg-amber-950/50 text-[#92400E] dark:text-amber-300 rounded-2xl p-4 flex items-center justify-between text-left transition-all active:scale-[0.99] shadow-xs"
        >
          <div className="flex items-center gap-3">
            <AlertTriangleIcon className="w-5 h-5 text-[#92400E] dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-extrabold text-[#92400E] dark:text-amber-300">
                Pending Deliveries & Parcels
              </p>
              <p className="text-[11px] text-[#B45309] dark:text-amber-400/80 mt-0.5">
                Check vendor orders and log arrivals
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-[#B45309] dark:text-amber-400">
            View <ChevronRightIcon className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      {/* 4. Recent Entries: Top 5 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-[#120D26] dark:text-[#F4F3F8]">Recent Entries</h2>
          <span className="text-[11px] font-semibold text-[#99969E] dark:text-[#8C879B]">Last 5</span>
        </div>

        <div className="space-y-2">
          {recentItems.length === 0 ? (
            <div className="bg-white dark:bg-[#161324] rounded-2xl p-6 text-center border border-[#F2F0F5] dark:border-[#28233D]">
              <p className="text-xs text-[#99969E] dark:text-[#8C879B] font-medium">No recent entries recorded yet</p>
            </div>
          ) : (
            recentItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#161324] rounded-2xl p-3.5 flex items-center justify-between shadow-xs border border-[#F2F0F5] dark:border-[#28233D] transition-colors"
            >
              <div className="min-w-0 pr-3">
                <p className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8] truncate">
                  {item.title}
                </p>
                <p className="text-[10px] text-[#99969E] dark:text-[#8C879B] mt-0.5">
                  {item.account} · {item.time}
                </p>
              </div>

              <div className="text-right shrink-0">
                {item.type === "INCOME" ? (
                  <p className="text-xs font-black text-[#5F33E1] dark:text-[#4ADE80]">
                    + ₹{item.amount.toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-[#120D26] dark:text-[#F87171]">
                    − ₹{item.amount.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
