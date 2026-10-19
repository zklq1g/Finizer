"use client";
import React from "react";
import { WalletIcon, BoxIcon, TrendUpIcon } from "../icons";

interface TransactionItem {
  id: string;
  title: string;
  account: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  time: string;
}

interface HomeTabProps {
  onNavigateToDeliveries: () => void;
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
  // Take only top 5 recent entries as per UX rule
  const recentItems = transactions.slice(0, 5);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* 1. Hero Card: Top-Left Aligned, F-Pattern Scan */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#F2F0F5] relative overflow-hidden">
        {/* Subtle purple glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#EDE8FB]/60 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10">
          <p className="text-xs uppercase font-bold tracking-wider text-[#99969E] mb-1">
            Total Business Value
          </p>
          <h1 className="text-4xl sm:text-[40px] font-black text-[#120D26] tracking-tight">
            ₹32,00,000
          </h1>

          {/* Dopamine Pill: Growth metric */}
          <div className="mt-3 inline-flex items-center gap-1.5 bg-[#EDE8FB] text-[#5F33E1] px-3 py-1.5 rounded-full text-xs font-bold">
            <TrendUpIcon className="w-3.5 h-3.5 text-[#5F33E1]" />
            <span>↑ ₹2,00,000 vs last month</span>
          </div>

          {/* Sub-breakdown: Cash + Stock */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[#F2F0F5]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F5F2FF] flex items-center justify-center text-[#5F33E1]">
                <WalletIcon className="w-4 h-4 text-[#5F33E1]" />
              </div>
              <div>
                <p className="text-[10px] text-[#99969E] font-medium">Total Cash</p>
                <p className="text-xs font-extrabold text-[#120D26]">₹7,00,000</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F5F2FF] flex items-center justify-center text-[#7C5CE8]">
                <BoxIcon className="w-4 h-4 text-[#7C5CE8]" />
              </div>
              <div>
                <p className="text-[10px] text-[#99969E] font-medium">Stock Value</p>
                <p className="text-xs font-extrabold text-[#120D26]">₹25,00,000</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Alert Banner (Actionable & Conditional) */}
      <button
        onClick={onNavigateToDeliveries}
        className="w-full bg-[#FEF3C7] border border-[#FDE68A] hover:bg-[#FDE68A]/70 text-[#92400E] rounded-2xl p-4 flex items-center justify-between text-left transition-all active:scale-[0.99] shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-xs font-extrabold text-[#92400E]">
              ₹5,00,000 Delivery Pending
            </p>
            <p className="text-[11px] text-[#B45309] mt-0.5">
              Overdue from Vendor RK Wholesalers · Tap to verify
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-[#B45309]">View →</span>
      </button>

      {/* 3. Recent Entries: Just the last 5 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-[#120D26]">Recent Entries</h2>
          <span className="text-xs font-semibold text-[#99969E]">Last 5</span>
        </div>

        <div className="space-y-2.5">
          {recentItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-[#F2F0F5]"
            >
              <div className="min-w-0 pr-3">
                <p className="text-xs font-bold text-[#120D26] truncate">
                  {item.title}
                </p>
                <p className="text-[10px] text-[#99969E] mt-0.5">
                  {item.account} · {item.time}
                </p>
              </div>

              {/* No Wall of Red: Income is bold Purple, Expense is Zinc-900 */}
              <div className="text-right shrink-0">
                {item.type === "INCOME" ? (
                  <p className="text-sm font-black text-[#5F33E1]">
                    + ₹{item.amount.toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-[#120D26]">
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
