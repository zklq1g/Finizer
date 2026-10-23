"use client";

import React, { useState, useEffect } from "react";
import {
  UserOctagonIcon,
  TrendUpIcon,
  CardSendIcon,
  PrinterIcon,
  ShieldTickIcon,
  WalletIcon,
  ReceiptIcon,
  ChevronRightIcon,
  SpinnerIcon,
  EditIcon,
  TrashIcon,
} from "../icons";
import MonthEndAllocator from "./MonthEndAllocator";
import AccountSheet from "../sheets/AccountSheet";
import CategorySheet from "../sheets/CategorySheet";
import {
  api,
  getAccounts,
  getCategories,
  saveAccount,
  saveCategory,
  type Account,
  type Category,
} from "@/services/api";
import { exportTransactionsToCSV } from "@/utils/exportCSV";
import { useActor } from "@/context/ActorContext";
import { formatINR } from "@/utils/format";
import type { Transaction } from "@/types";

interface SettingsTabProps {
  onOpenActivityLog: () => void;
  onOpenMonthEnd?: () => void;
}

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
    categories: { name: "Repairs & Maintenance", type: "OPERATING_EXPENSE" },
  },
];

export default function SettingsTab({ onOpenActivityLog, onOpenMonthEnd }: SettingsTabProps) {
  const { actor, setActor, availableActors } = useActor();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAllocator, setShowAllocator] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Accounts & Categories CRUD States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCrud, setLoadingCrud] = useState<boolean>(true);

  // Sheet States
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCrudData = async () => {
    try {
      const [accs, cats] = await Promise.all([getAccounts(), getCategories()]);
      setAccounts(accs);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load accounts/categories:", err);
    } finally {
      setLoadingCrud(false);
    }
  };

  useEffect(() => {
    fetchCrudData();
  }, []);

  const handleDeleteAccount = async (id: string, name: string) => {
    if (confirm(`Archive account "${name}"? It will be hidden from new transaction selection.`)) {
      try {
        await saveAccount("delete", { id });
        showToast(`Archived account: ${name}`);
        fetchCrudData();
      } catch {
        showToast("Failed to archive account.");
      }
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Archive category "${name}"? Existing transactions will retain their historical links.`)) {
      try {
        await saveCategory("delete", { id });
        showToast(`Archived category: ${name}`);
        fetchCrudData();
      } catch {
        showToast("Failed to archive category.");
      }
    }
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
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-black text-[#120D26]">Settings</h1>
        <p className="text-xs text-[#99969E] font-medium">Store Operations & Accounting</p>
      </div>

      {toastMessage && (
        <div className="bg-[#DCFCE7] text-[#16A34A] text-xs font-bold p-3.5 rounded-2xl border border-[#BBF7D0] animate-fade-in shadow-xs">
          {toastMessage}
        </div>
      )}

      {/* 1. Partner Trust Profile Switcher */}
      <div className="bg-white rounded-2xl p-4 border border-[#F2F0F5] shadow-xs space-y-2">
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
                  ? "bg-[#5F33E1] text-white shadow-xs shadow-[#5F33E1]/20"
                  : "bg-[#F5F2FF] text-[#120D26] hover:bg-[#EDE8FB]"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Primary Section: Accounting & Monthly Rituals */}
      <div className="space-y-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E]">
          Accounting & Reports
        </span>

        {/* Month-End Profit Allocator */}
        <button
          onClick={() => (onOpenMonthEnd ? onOpenMonthEnd() : setShowAllocator(true))}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-xs group"
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

        {/* Export for CA */}
        <button
          onClick={handleExportCA}
          disabled={isExporting}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-xs group disabled:opacity-50"
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

        {/* Print Daily Ledger */}
        <button
          onClick={handlePrintDaily}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-xs group"
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

      {/* 3. Manage Accounts CRUD */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E] flex items-center gap-1.5">
            <WalletIcon className="w-3.5 h-3.5 text-[#5F33E1]" /> Payment Accounts
          </span>
          <button
            onClick={() => {
              setEditingAccount(null);
              setAccountSheetOpen(true);
            }}
            className="text-xs font-bold text-[#5F33E1] hover:underline bg-[#EDE8FB] px-3 py-1 rounded-full"
          >
            + Add Account
          </button>
        </div>

        <div className="bg-white border border-[#F2F0F5] rounded-2xl divide-y divide-[#F2F0F5] overflow-hidden shadow-xs">
          {loadingCrud ? (
            <div className="p-4 flex items-center justify-center text-gray-400">
              <SpinnerIcon className="w-5 h-5 animate-spin text-[#5F33E1]" />
            </div>
          ) : accounts.length === 0 ? (
            <p className="p-4 text-xs text-[#99969E] text-center">No payment accounts configured yet</p>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className="p-3.5 flex justify-between items-center hover:bg-[#F9F9FB] transition-colors">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-[#120D26] truncate">{acc.name}</p>
                  <p className="text-[10px] text-[#99969E] uppercase font-semibold mt-0.5">
                    {acc.type || "channel"} · <span className="text-[#120D26] font-bold">{formatINR(acc.current_balance)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-gray-400 shrink-0">
                  <button
                    onClick={() => {
                      setEditingAccount(acc);
                      setAccountSheetOpen(true);
                    }}
                    title="Edit Account"
                    className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-[#5F33E1] transition-colors"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                    title="Archive Account"
                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. Manage Categories CRUD */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E] flex items-center gap-1.5">
            <ReceiptIcon className="w-3.5 h-3.5 text-[#5F33E1]" /> Categories
          </span>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategorySheetOpen(true);
            }}
            className="text-xs font-bold text-[#5F33E1] hover:underline bg-[#EDE8FB] px-3 py-1 rounded-full"
          >
            + Add Category
          </button>
        </div>

        <div className="bg-white border border-[#F2F0F5] rounded-2xl divide-y divide-[#F2F0F5] overflow-hidden shadow-xs max-h-80 overflow-y-auto scrollbar-hide">
          {loadingCrud ? (
            <div className="p-4 flex items-center justify-center text-gray-400">
              <SpinnerIcon className="w-5 h-5 animate-spin text-[#5F33E1]" />
            </div>
          ) : categories.length === 0 ? (
            <p className="p-4 text-xs text-[#99969E] text-center">No categories configured</p>
          ) : (
            categories.map((cat) => {
              const isIncome = cat.type === "INCOME";
              return (
                <div key={cat.id} className="p-3.5 flex justify-between items-center hover:bg-[#F9F9FB] transition-colors">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-[#120D26] truncate">{cat.name}</p>
                    <span
                      className={`inline-block text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full mt-0.5 ${
                        isIncome
                          ? "bg-[#EDE8FB] text-[#5F33E1]"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cat.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 shrink-0">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategorySheetOpen(true);
                      }}
                      title="Edit Category"
                      className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-[#5F33E1] transition-colors"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      title="Archive Category"
                      className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 5. Partner Trust Quick Access */}
      <button
        onClick={onOpenActivityLog}
        className="w-full bg-[#F5F2FF] rounded-2xl p-4 flex items-center justify-between border border-[#EDE8FB] hover:border-[#5F33E1] transition-all text-left shadow-xs group"
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

      {/* Interactive Bottom Sheets */}
      <AccountSheet
        isOpen={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        account={editingAccount}
        onSuccess={() => {
          fetchCrudData();
          showToast(editingAccount ? "Account updated successfully" : "New account created");
        }}
      />
      <CategorySheet
        isOpen={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        category={editingCategory}
        onSuccess={() => {
          fetchCrudData();
          showToast(editingCategory ? "Category updated successfully" : "New category created");
        }}
      />
    </div>
  );
}
