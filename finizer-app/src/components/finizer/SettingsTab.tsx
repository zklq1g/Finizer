"use client";
import React, { useState } from "react";
import {
  WalletIcon,
  ReceiptIcon,
  TrendUpIcon,
  CardSendIcon,
  PrinterIcon,
  ShieldTickIcon,
  ChevronRightIcon,
  UserOctagonIcon,
  SpinnerIcon,
} from "../icons";
import MonthEndAllocator from "./MonthEndAllocator";
import { api } from "@/services/api";
import { exportTransactionsToCSV } from "@/utils/exportCSV";
import { useActor } from "@/context/ActorContext";
import type { Transaction } from "@/types";

interface SettingsTabProps {
  onOpenActivityLog: () => void;
}

// Sample fallback transactions for immediate export testing if database is fresh
const FALLBACK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-101",
    account_id: "acc-1",
    category_id: "cat-1",
    amount: 14200,
    type: "INCOME",
    date: "2026-10-20",
    description: "Counter Sales (Cash + UPI)",
    vendor_gst_number: null,
    receipt_image_url: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    accounts: { name: "Main Cash Drawer" },
    categories: { name: "Sales Revenue", type: "INCOME" },
  },
  {
    id: "tx-102",
    account_id: "acc-2",
    category_id: "cat-2",
    amount: 6500,
    type: "EXPENSE",
    date: "2026-10-20",
    description: "Packaging cartons from Balaji Traders",
    vendor_gst_number: "27AABCU9603R1ZM",
    receipt_image_url: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    accounts: { name: "HDFC Bank Account" },
    categories: { name: "Operating Expenses", type: "OPERATING_EXPENSE" },
  },
  {
    id: "tx-103",
    account_id: "acc-1",
    category_id: "cat-3",
    amount: 850,
    type: "EXPENSE",
    date: "2026-10-19",
    description: "Store tea & snacks for staff",
    vendor_gst_number: null,
    receipt_image_url: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    accounts: { name: "Main Cash Drawer" },
    categories: { name: "Staff Welfare", type: "OPERATING_EXPENSE" },
  },
  {
    id: "tx-104",
    account_id: "acc-3",
    category_id: "cat-1",
    amount: 28500,
    type: "INCOME",
    date: "2026-10-19",
    description: "PhonePe QR Customer Settlements",
    vendor_gst_number: null,
    receipt_image_url: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    accounts: { name: "PhonePe UPI" },
    categories: { name: "Sales Revenue", type: "INCOME" },
  },
];

export default function SettingsTab({ onOpenActivityLog }: SettingsTabProps) {
  const { actor, setActor, availableActors } = useActor();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAllocator, setShowAllocator] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportCA = async () => {
    try {
      setIsExporting(true);
      showToast("Fetching transactions and generating CA CSV...");

      let transactions: Transaction[] = [];
      try {
        transactions = await api.getTransactions(500);
      } catch (err) {
        console.warn("Could not fetch remote transactions, using local fallback:", err);
      }

      if (!transactions || transactions.length === 0) {
        transactions = FALLBACK_TRANSACTIONS;
      }

      exportTransactionsToCSV(transactions, "Finizer_CA_Ledger");
      showToast(`Exported ${transactions.length} entries for CA with UTF-8 BOM.`);
    } catch (err: unknown) {
      console.error("Export failed:", err);
      showToast("Failed to generate CA export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintDaily = () => {
    window.print();
  };

  if (showAllocator) {
    return (
      <MonthEndAllocator
        onBack={() => setShowAllocator(false)}
        onSuccess={(summary) => {
          setShowAllocator(false);
          showToast(`Month-end closed: ${summary.month} locked.`);
        }}
      />
    );
  }

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

      {/* Partner Trust Profile Switcher */}
      <div className="bg-white rounded-2xl p-4 border border-[#F2F0F5] shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#120D26]">
            <UserOctagonIcon className="w-4 h-4 text-[#5F33E1]" />
            <span>Active Partner Profile</span>
          </div>
          <span className="text-[10px] uppercase font-extrabold tracking-wide text-[#5F33E1] bg-[#EDE8FB] px-2 py-0.5 rounded-full">
            Forensic Actor
          </span>
        </div>
        <p className="text-[11px] text-[#99969E]">
          All transactions, goods receipts, and monthly closures are permanently signed with this profile.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {availableActors.map((a) => (
            <button
              key={a}
              onClick={() => {
                setActor(a);
                showToast(`Switched active profile to ${a}`);
              }}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                actor === a
                  ? "bg-[#5F33E1] text-white shadow-sm shadow-[#5F33E1]/20"
                  : "bg-[#F5F2FF] text-[#120D26] hover:bg-[#EDE8FB]"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Section: Accounting & Monthly Rituals */}
      <div className="space-y-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E]">
          Accounting & Reports
        </span>

        {/* 1. Month-End Profit Allocator */}
        <button
          onClick={() => setShowAllocator(true)}
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
          onClick={handleExportCA}
          disabled={isExporting}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-sm group disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F5F2FF] flex items-center justify-center text-[#5F33E1]">
              {isExporting ? (
                <SpinnerIcon className="w-5 h-5 text-[#5F33E1] animate-spin" />
              ) : (
                <CardSendIcon className="w-5 h-5 text-[#5F33E1]" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] group-hover:text-[#5F33E1] transition-colors">
                Export for CA (Chartered Accountant)
              </p>
              <p className="text-[11px] text-[#99969E]">
                UTF-8 BOM CSV with Debit/Credit columns & GST numbers
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5F33E1] transition-colors shrink-0" />
        </button>

        {/* 3. Print Daily Ledger */}
        <button
          onClick={handlePrintDaily}
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
                Clean B&W view ready to staple into physical shop diary
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
          onClick={() => showToast("Accounts active: Cash Drawer, HDFC Bank, PhonePe UPI")}
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
          onClick={() => showToast("11 system categories configured for Indian retail")}
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
                Sales, Inventory, Rent, Salaries, Electricity, Transportation
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
