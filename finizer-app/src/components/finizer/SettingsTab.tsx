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



export default function SettingsTab({ onOpenActivityLog, onOpenMonthEnd }: SettingsTabProps) {
  const { actor, setActor, availableActors, addActor, removeActor } = useActor();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [newActorName, setNewActorName] = useState<string>("");

  // Accounts & Categories CRUD States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCrud, setLoadingCrud] = useState<boolean>(true);

  // Sheet States
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
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

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleDeleteAccount = async (id: string, name: string) => {
    setConfirmDialog({
      message: `Archive account "${name}"? It will be hidden from new transaction selection.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await saveAccount("delete", { id });
          showToast(`Archived account: ${name}`);
          fetchCrudData();
        } catch {
          showToast("Failed to archive account.", "error");
        }
      },
    });
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    setConfirmDialog({
      message: `Archive category "${name}"? Existing transactions will retain their historical links.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await saveCategory("delete", { id });
          showToast(`Archived category: ${name}`);
          fetchCrudData();
        } catch {
          showToast("Failed to archive category.", "error");
        }
      },
    });
  };

  const handleExportCA = async () => {
    try {
      setIsExporting(true);
      showToast("Fetching transactions and generating CA CSV...");

      let transactions: Transaction[] = [];
      try {
        transactions = await api.getTransactions(500);
      } catch (err) {
        console.warn("Could not fetch remote transactions:", err);
      }

      if (!transactions || transactions.length === 0) {
        showToast("No transactions found to export.", "error");
        return;
      }

      exportTransactionsToCSV(transactions, "Finizer_CA_Ledger");
      showToast(`Exported ${transactions.length} entries for CA with UTF-8 BOM.`);
    } catch (err: unknown) {
      console.error("Export failed:", err);
      showToast("Failed to generate CA export.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const [isPrintingLedger, setIsPrintingLedger] = useState(false);

  const handlePrintDaily = async () => {
    setIsPrintingLedger(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const all = await api.getTransactions(500);
      const todayTxns = all.filter((t) => (t.date || "").startsWith(today));

      const totalIncome = todayTxns
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + t.amount, 0);
      const totalExpense = todayTxns
        .filter((t) => t.type === "EXPENSE")
        .reduce((s, t) => s + t.amount, 0);

      const fmt = (n: number) =>
        "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

      const rows = todayTxns
        .map(
          (t) => `
        <tr>
          <td>${t.date ?? ""}</td>
          <td>${(t.categories as { name: string } | undefined)?.name ?? t.category_id ?? "—"}</td>
          <td>${t.description ?? "—"}</td>
          <td style="color:${t.type === "INCOME" ? "#16A34A" : "#DC2626"}">
            ${t.type === "INCOME" ? "+" : "-"}${fmt(t.amount)}
          </td>
        </tr>`
        )
        .join("");

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Daily Ledger — ${today}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; font-size: 12px; color: #120D26; padding: 24px; }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 2px; }
    .sub { color: #99969E; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #99969E; border-bottom: 2px solid #F2F0F5; padding: 6px 8px; }
    td { padding: 8px 8px; border-bottom: 1px solid #F8F9FA; vertical-align: top; }
    .summary { margin-top: 20px; display: flex; gap: 24px; }
    .card { flex: 1; border: 1px solid #F2F0F5; border-radius: 10px; padding: 10px 14px; }
    .card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #99969E; }
    .card .val { font-size: 16px; font-weight: 800; margin-top: 2px; }
    .income { color: #16A34A; }
    .expense { color: #DC2626; }
    .net-positive { color: #16A34A; }
    .net-negative { color: #DC2626; }
    .empty { text-align: center; color: #99969E; padding: 32px 0; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Daily Ledger</h1>
  <p class="sub">Finizer · ${today} · Printed ${new Date().toLocaleTimeString("en-IN")}</p>
  ${
    todayTxns.length === 0
      ? `<p class="empty">No transactions recorded today.</p>`
      : `<table>
      <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary">
      <div class="card"><div class="label">Total Income</div><div class="val income">${fmt(totalIncome)}</div></div>
      <div class="card"><div class="label">Total Expense</div><div class="val expense">${fmt(totalExpense)}</div></div>
      <div class="card"><div class="label">Net</div><div class="val ${totalIncome - totalExpense >= 0 ? "net-positive" : "net-negative"}">${fmt(totalIncome - totalExpense)}</div></div>
    </div>`
  }
</body>
</html>`;

      const win = window.open("", "_blank", "width=800,height=600");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 400);
      }
    } catch (err) {
      console.error("Print daily ledger failed:", err);
      showToast("Could not load today's transactions for printing.", "error");
    } finally {
      setIsPrintingLedger(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-black text-[#120D26]">Settings</h1>
        <p className="text-xs text-[#99969E] font-medium">Store Operations & Accounting</p>
      </div>

      {toastMessage && (
        <div className={`text-xs font-bold p-3.5 rounded-2xl border animate-fade-in shadow-xs ${
          toastType === "error"
            ? "bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]"
            : "bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]"
        }`}>
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
            <div key={a} className="relative group">
              <button
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
              {availableActors.length > 1 && actor !== a && (
                <button
                  onClick={() => {
                    removeActor(a);
                    showToast(`Removed profile: ${a}`);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full text-[8px] font-black hidden group-hover:flex items-center justify-center transition-colors"
                  title={`Remove ${a}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add new partner */}
        <div className="flex gap-2 pt-1">
          <input
            value={newActorName}
            onChange={(e) => setNewActorName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newActorName.trim()) {
                addActor(newActorName.trim());
                showToast(`Added profile: ${newActorName.trim()}`);
                setNewActorName("");
              }
            }}
            className="flex-1 px-3 py-1.5 rounded-xl border border-[#F2F0F5] bg-[#F9F9FB] text-xs font-semibold text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] transition-colors"
            placeholder="Add partner name..."
          />
          <button
            onClick={() => {
              if (newActorName.trim()) {
                addActor(newActorName.trim());
                showToast(`Added profile: ${newActorName.trim()}`);
                setNewActorName("");
              }
            }}
            disabled={!newActorName.trim()}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#5F33E1] bg-[#EDE8FB] hover:bg-[#DDD6F5] disabled:opacity-40 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* 2. Primary Section: Accounting & Monthly Rituals */}
      <div className="space-y-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E]">
          Accounting & Reports
        </span>

        {/* Month-End Profit Allocator */}
        <button
          onClick={() => onOpenMonthEnd?.()}
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
          disabled={isPrintingLedger}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] hover:border-gray-300 transition-all text-left shadow-xs group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F5F2FF] flex items-center justify-center text-[#5F33E1]">
              {isPrintingLedger ? (
                <SpinnerIcon className="w-5 h-5 text-[#5F33E1] animate-spin" />
              ) : (
                <PrinterIcon className="w-5 h-5 text-[#5F33E1]" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] group-hover:text-[#5F33E1] transition-colors">
                {isPrintingLedger ? "Loading today's entries..." : "Print Daily Ledger Sheet"}
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
            <div className="p-5 flex flex-col items-center gap-3 text-center">
              <p className="text-xs text-[#99969E]">No payment accounts configured yet</p>
              <button
                onClick={() => {
                  setEditingAccount(null);
                  setAccountSheetOpen(true);
                }}
                className="text-xs font-bold text-white bg-[#5F33E1] px-4 py-2 rounded-xl hover:bg-[#5029C9] transition-colors"
              >
                + Create your first account
              </button>
            </div>
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

      {/* 6. About & Version */}
      <section className="space-y-1 pt-2 border-t border-[#F2F0F5]">
        <div className="flex flex-col items-center gap-1 py-4 text-center">
          <p className="text-[13px] font-black text-[#120D26] tracking-tight">Finizer</p>
          <p className="text-[11px] text-[#99969E] font-medium">
            Retail Finance Manager · v0.1.0
          </p>
          <p className="text-[10px] text-[#C5C2CC] mt-1">
            Built for Indian store owners · Data stays in your Supabase
          </p>
        </div>
      </section>

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

      {/* Custom Confirmation Dialog (replaces native confirm()) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setConfirmDialog(null)}
          />
          <div className="relative bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-slide-up z-10">
            <p className="text-sm font-semibold text-[#120D26] mb-4">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 rounded-xl border border-[#F2F0F5] text-sm font-bold text-[#99969E] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-3 rounded-xl bg-[#DC2626] text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
