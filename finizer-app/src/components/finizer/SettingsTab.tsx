"use client";
import React, { useState } from "react";
import { WalletIcon, ReceiptIcon, TrendUpIcon, CardSendIcon, PrinterIcon, ShieldTickIcon, ChevronRightIcon } from "../icons";

interface SettingsTabProps {
  onOpenActivityLog: () => void;
}

export default function SettingsTab({ onOpenActivityLog }: SettingsTabProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-[#120D26]">Settings</h1>
        <p className="text-xs text-[#99969E] font-medium">Store Operations & Accounting</p>
      </div>

      {toastMessage && (
        <div className="bg-[#DCFCE7] text-[#16A34A] text-xs font-bold p-3.5 rounded-2xl border border-[#BBF7D0] animate-fade-in shadow-sm">
          {toastMessage}
        </div>
      )}

      {/* Primary Section: Accounting & Monthly Rituals */}
      <div className="space-y-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E]">
          Accounting & Reports
        </span>

        {/* 1. Month-End Profit Allocator */}
        <button
          onClick={() => showToast("Opening Profit Allocator: 3-Bucket system (Expenses, Salaries, Reinvestment)")}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-sm group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
              <TrendUpIcon className="w-5 h-5 text-[#5F33E1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] group-hover:text-[#5F33E1] transition-colors">
                Month-End Profit Allocator
              </p>
              <p className="text-[11px] text-[#99969E]">
                Split net margins: Reinvestment, Reserve & Withdrawals
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5F33E1] transition-colors shrink-0" />
        </button>

        {/* 2. Export for CA */}
        <button
          onClick={() => showToast("Exporting CA Excel sheet with Vendor GST numbers...")}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-sm group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F5F2FF] flex items-center justify-center text-[#5F33E1]">
              <CardSendIcon className="w-5 h-5 text-[#5F33E1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] group-hover:text-[#5F33E1] transition-colors">
                Export for CA (Chartered Accountant)
              </p>
              <p className="text-[11px] text-[#99969E]">
                Generates Excel/CSV ledger formatted with GST numbers
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5F33E1] transition-colors shrink-0" />
        </button>

        {/* 3. Print Daily Ledger */}
        <button
          onClick={() => showToast("Generating Daily PDF print sheet for physical binder...")}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-sm group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F5F2FF] flex items-center justify-center text-[#5F33E1]">
              <PrinterIcon className="w-5 h-5 text-[#5F33E1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] group-hover:text-[#5F33E1] transition-colors">
                Print Daily Ledger Sheet
              </p>
              <p className="text-[11px] text-[#99969E]">
                Clean B&W PDF ready to staple into physical shop diary
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5F33E1] transition-colors shrink-0" />
        </button>
      </div>

      {/* Secondary Section: Store Setup */}
      <div className="space-y-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E]">
          Store Configuration
        </span>

        {/* Manage Accounts */}
        <button
          onClick={() => showToast("Manage Accounts: Cash Drawer (₹18.4k), HDFC Bank (₹5.2L), Shop UPI (₹42.8k)")}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-sm group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
              <WalletIcon className="w-5 h-5 text-[#5F33E1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] group-hover:text-[#5F33E1] transition-colors">
                Manage Accounts
              </p>
              <p className="text-[11px] text-[#99969E]">
                Cash Drawer, Bank Accounts, Store QR UPI
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5F33E1] transition-colors shrink-0" />
        </button>

        {/* Manage Categories */}
        <button
          onClick={() => showToast("Categories: Operating Expenses, Capital Investment, Inventory")}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-sm group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
              <ReceiptIcon className="w-5 h-5 text-[#5F33E1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] group-hover:text-[#5F33E1] transition-colors">
                Manage Expense Categories
              </p>
              <p className="text-[11px] text-[#99969E]">
                Add or customize store ledger bucket tags
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5F33E1] transition-colors shrink-0" />
        </button>

        {/* Partner Trust Quick Access */}
        <button
          onClick={onOpenActivityLog}
          className="w-full bg-[#F5F2FF] rounded-2xl p-4 flex items-center justify-between border border-[#EDE8FB] hover:border-[#5F33E1] transition-all text-left shadow-sm group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
              <ShieldTickIcon className="w-5 h-5 text-[#5F33E1]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#5F33E1]">
                Partner Audit Log (Trust System)
              </p>
              <p className="text-[11px] text-[#7C5CE8]">
                View immutable edit & deletion history
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-[#5F33E1] shrink-0" />
        </button>
      </div>
    </div>
  );
}
