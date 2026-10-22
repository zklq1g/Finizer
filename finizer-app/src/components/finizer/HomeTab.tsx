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
  transactions?: TransactionItem[];
}

const DEFAULT_RECENT: TransactionItem[] = [
  { id: "1", title: "Daily Counter Sales (Cash)", account: "Cash Drawer", amount: 15400, type: "INCOME", time: "Today, 02:40 PM" },
  { id: "2", title: "Staff Tea & Evening Snacks", account: "Cash Drawer", amount: 350, type: "EXPENSE", time: "Today, 01:15 PM" },
  { id: "3", title: "Packaging Boxes Wholesale", account: "Shop UPI", amount: 4800, type: "EXPENSE", time: "Today, 11:30 AM" },
  { id: "4", title: "UPI Store QR Collections", account: "Shop UPI", amount: 26800, type: "INCOME", time: "Yesterday, 09:10 PM" },
  { id: "5", title: "Delivery Van Petrol Fuel", account: "Cash Drawer", amount: 1200, type: "EXPENSE", time: "Yesterday, 04:00 PM" },
];

export default function HomeTab({
  onNavigateToDeliveries,
  transactions = DEFAULT_RECENT,
}: HomeTabProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

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
      <div className="bg-white border border-[#F2F0F5] rounded-3xl p-5 shadow-xs">
        <h2 className="text-[#120D26] font-extrabold mb-4 flex items-center gap-2 text-sm">
          <TrendUpIcon className="w-4 h-4 text-[#5F33E1]" /> This Month's P&L
        </h2>
        <div className="space-y-3.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#99969E] font-semibold">Total Income</span>
            <span className="font-extrabold text-[#5F33E1] text-sm">{formatINR(monthlyIncome)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#99969E] font-semibold">Total Expenses</span>
            <span className="font-extrabold text-[#120D26] text-sm">{formatINR(monthlyExpense)}</span>
          </div>
          <div className="border-t border-[#F2F0F5] pt-3 flex justify-between items-center">
            <span className="text-[#120D26] font-bold text-xs">Net Profit</span>
            <span className="font-black text-[#120D26] text-sm">
              {formatINR(netProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Deliveries Alert Banner (if handler passed) */}
      {onNavigateToDeliveries && (
        <button
          onClick={onNavigateToDeliveries}
          className="w-full bg-[#FEF3C7] border border-[#FDE68A] hover:bg-[#FDE68A]/70 text-[#92400E] rounded-2xl p-4 flex items-center justify-between text-left transition-all active:scale-[0.99] shadow-xs"
        >
          <div className="flex items-center gap-3">
            <AlertTriangleIcon className="w-5 h-5 text-[#92400E] shrink-0" />
            <div>
              <p className="text-xs font-extrabold text-[#92400E]">
                Pending Deliveries & Parcels
              </p>
              <p className="text-[11px] text-[#B45309] mt-0.5">
                Check vendor orders and log arrivals
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-[#B45309]">
            View <ChevronRightIcon className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      {/* 4. Recent Entries: Top 5 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-[#120D26]">Recent Entries</h2>
          <span className="text-[11px] font-semibold text-[#99969E]">Last 5</span>
        </div>

        <div className="space-y-2">
          {recentItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-3.5 flex items-center justify-between shadow-xs border border-[#F2F0F5]"
            >
              <div className="min-w-0 pr-3">
                <p className="text-xs font-bold text-[#120D26] truncate">
                  {item.title}
                </p>
                <p className="text-[10px] text-[#99969E] mt-0.5">
                  {item.account} · {item.time}
                </p>
              </div>

              <div className="text-right shrink-0">
                {item.type === "INCOME" ? (
                  <p className="text-xs font-black text-[#5F33E1]">
                    + ₹{item.amount.toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-[#120D26]">
                    − ₹{item.amount.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
