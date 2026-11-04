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
  CloseIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  FingerprintIcon,
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
import { useTheme } from "@/context/ThemeContext";
import { formatINR } from "@/utils/format";
import type { Transaction } from "@/types";
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  hasRegisteredPasskey,
  registerPasskey,
  removePasskey,
  ADMIN_PASSKEY_KEY,
  DRAWER_PASSKEY_KEY,
  ADMIN_BIOMETRIC_PROMPTED_KEY,
  DRAWER_BIOMETRIC_PROMPTED_KEY,
  markBiometricPrompted,
} from "@/lib/webauthn";

interface SettingsTabProps {
  onOpenActivityLog: () => void;
  onOpenMonthEnd?: () => void;
}

export default function SettingsTab({ onOpenActivityLog, onOpenMonthEnd }: SettingsTabProps) {
  const { actor, setActor, availableActors, addActor, removeActor } = useActor();
  const { theme, setTheme, resolvedTheme } = useTheme();
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

  // Biometric Security States
  const [biometricSupported, setBiometricSupported] = useState<boolean>(false);
  const [adminPasskeyRegistered, setAdminPasskeyRegistered] = useState<boolean>(false);
  const [drawerPasskeyRegistered, setDrawerPasskeyRegistered] = useState<boolean>(false);
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState<"none" | "admin" | "drawer">("none");

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

    setAdminPasskeyRegistered(hasRegisteredPasskey(ADMIN_PASSKEY_KEY));
    setDrawerPasskeyRegistered(hasRegisteredPasskey(DRAWER_PASSKEY_KEY));

    if (isWebAuthnSupported()) {
      isPlatformAuthenticatorAvailable().then((supported) => {
        setBiometricSupported(supported);
      });
    }
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

  const handleRegisterAdminBiometric = async () => {
    setIsRegisteringBiometric("admin");
    try {
      const ok = await registerPasskey(ADMIN_PASSKEY_KEY, "finizer-admin");
      if (ok) {
        setAdminPasskeyRegistered(true);
        markBiometricPrompted(ADMIN_BIOMETRIC_PROMPTED_KEY);
        showToast("Admin biometric (Fingerprint / Face ID) registered successfully!");
      } else {
        showToast("Biometric registration was cancelled.", "error");
      }
    } catch {
      showToast("Failed to register biometric.", "error");
    } finally {
      setIsRegisteringBiometric("none");
    }
  };

  const handleRemoveAdminBiometric = () => {
    setConfirmDialog({
      message: "Remove registered biometric for Finizer Admin? You will need your 6-digit passcode to sign in.",
      onConfirm: () => {
        setConfirmDialog(null);
        removePasskey(ADMIN_PASSKEY_KEY);
        setAdminPasskeyRegistered(false);
        showToast("Admin biometric removed.");
      },
    });
  };

  const handleRegisterDrawerBiometric = async () => {
    setIsRegisteringBiometric("drawer");
    try {
      const ok = await registerPasskey(DRAWER_PASSKEY_KEY, "finizer-drawer");
      if (ok) {
        setDrawerPasskeyRegistered(true);
        markBiometricPrompted(DRAWER_BIOMETRIC_PROMPTED_KEY);
        showToast("Kiosk biometric registered successfully!");
      } else {
        showToast("Biometric registration was cancelled.", "error");
      }
    } catch {
      showToast("Failed to register kiosk biometric.", "error");
    } finally {
      setIsRegisteringBiometric("none");
    }
  };

  const handleRemoveDrawerBiometric = () => {
    setConfirmDialog({
      message: "Remove registered biometric for Cash Drawer Kiosk? You will need your 4-digit PIN to unlock.",
      onConfirm: () => {
        setConfirmDialog(null);
        removePasskey(DRAWER_PASSKEY_KEY);
        setDrawerPasskeyRegistered(false);
        showToast("Kiosk biometric removed.");
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
      <div className="lg:hidden">
        <h1 className="text-2xl font-black text-[#120D26]">Settings</h1>
        <p className="text-xs text-[#99969E] font-medium">Store Operations & Accounting</p>
      </div>

      {toastMessage && (
        <div className={`text-xs font-bold p-3.5 rounded-2xl border animate-fade-in shadow-xs ${
          toastType === "error"
            ? "bg-[#FEF2F2] dark:bg-red-950/40 text-[#DC2626] dark:text-red-400 border-[#FEE2E2] dark:border-red-900/50"
            : "bg-[#DCFCE7] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border-[#BBF7D0] dark:border-emerald-900/50"
        }`}>
          {toastMessage}
        </div>
      )}

      {/* 0. Display Appearance Theme Switcher */}
      <div className="bg-white dark:bg-[#161324] rounded-2xl p-4 border border-[#F2F0F5] dark:border-[#28233D] shadow-xs space-y-2.5 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">
            <SunIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF]" />
            <span>Display Appearance</span>
          </div>
          <span className="text-[10px] uppercase font-extrabold tracking-wide text-[#5F33E1] dark:text-[#9F87EF] bg-[#EDE8FB] dark:bg-[#29204E] px-2 py-0.5 rounded-full">
            {theme === "system" ? `Auto (${resolvedTheme})` : theme}
          </span>
        </div>
        <p className="text-[11px] text-[#99969E] dark:text-[#8C879B]">
          Choose dark mode to reduce eye glare during late-night cash reconciliations and protect counter kiosk screens from OLED burn-in.
        </p>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => {
              setTheme("light");
              showToast("Light mode activated");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
              theme === "light"
                ? "bg-[#5F33E1] text-white border-[#5F33E1] shadow-xs shadow-[#5F33E1]/20"
                : "bg-[#F9F9FB] dark:bg-[#1F1B30] text-[#120D26] dark:text-[#F4F3F8] border-[#F2F0F5] dark:border-[#28233D] hover:bg-[#F2F0F5] dark:hover:bg-[#29204E]"
            }`}
          >
            <SunIcon className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            onClick={() => {
              setTheme("dark");
              showToast("Dark mode activated");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
              theme === "dark"
                ? "bg-[#7C5CE8] text-white border-[#7C5CE8] shadow-xs shadow-[#7C5CE8]/20"
                : "bg-[#F9F9FB] dark:bg-[#1F1B30] text-[#120D26] dark:text-[#F4F3F8] border-[#F2F0F5] dark:border-[#28233D] hover:bg-[#F2F0F5] dark:hover:bg-[#29204E]"
            }`}
          >
            <MoonIcon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
          <button
            onClick={() => {
              setTheme("system");
              showToast("System auto-sync activated");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
              theme === "system"
                ? "bg-[#5F33E1] dark:bg-[#7C5CE8] text-white border-transparent shadow-xs"
                : "bg-[#F9F9FB] dark:bg-[#1F1B30] text-[#120D26] dark:text-[#F4F3F8] border-[#F2F0F5] dark:border-[#28233D] hover:bg-[#F2F0F5] dark:hover:bg-[#29204E]"
            }`}
          >
            <MonitorIcon className="w-3.5 h-3.5" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* 1. Partner Trust Profile Switcher */}
      <div className="bg-white dark:bg-[#161324] rounded-2xl p-4 border border-[#F2F0F5] dark:border-[#28233D] shadow-xs space-y-2 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">
            <UserOctagonIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF]" />
            <span>Active Partner Profile</span>
          </div>
          <span className="text-[10px] uppercase font-extrabold tracking-wide text-[#5F33E1] dark:text-[#9F87EF] bg-[#EDE8FB] dark:bg-[#29204E] px-2 py-0.5 rounded-full">
            Forensic Actor
          </span>
        </div>
        <p className="text-[11px] text-[#99969E] dark:text-[#8C879B]">
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
                    ? "bg-[#5F33E1] dark:bg-[#7C5CE8] text-white shadow-xs shadow-[#5F33E1]/20"
                    : "bg-[#F5F2FF] dark:bg-[#1F1B30] text-[#120D26] dark:text-[#F4F3F8] hover:bg-[#EDE8FB] dark:hover:bg-[#29204E]"
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
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-500 dark:text-gray-300 hover:text-red-600 rounded-full hidden group-hover:flex items-center justify-center transition-colors"
                  title={`Remove ${a}`}
                >
                  <CloseIcon className="w-3 h-3" />
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
            className="flex-1 px-3 py-1.5 rounded-xl border border-[#F2F0F5] dark:border-[#28233D] bg-[#F9F9FB] dark:bg-[#1F1B30] text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] focus:outline-hidden focus:border-[#5F33E1] transition-colors"
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
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#5F33E1] dark:text-[#9F87EF] bg-[#EDE8FB] dark:bg-[#29204E] hover:bg-[#DDD6F5] disabled:opacity-40 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* 2. Security & Biometric Unlock */}
      <div className="bg-white dark:bg-[#161324] rounded-2xl p-4 border border-[#F2F0F5] dark:border-[#28233D] shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">
            <FingerprintIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF]" />
            <span>Security & Biometric Unlock</span>
          </div>
          <span className={`text-[10px] uppercase font-extrabold tracking-wide px-2 py-0.5 rounded-full ${
            adminPasskeyRegistered || drawerPasskeyRegistered
              ? "bg-[#DCFCE7] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          }`}>
            {adminPasskeyRegistered || drawerPasskeyRegistered ? "Biometrics Active" : "Passcode Only"}
          </span>
        </div>
        <p className="text-[11px] text-[#99969E] dark:text-[#8C879B]">
          Unlock Finizer instantly with Fingerprint, Face ID, or Windows Hello. Finizer auto-attempts biometric verification for 15 seconds on open, then falls back to your manual code.
        </p>

        {!biometricSupported ? (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            Biometric sensor (Touch ID, Face ID, or Windows Hello) is not detected or supported on this device/browser.
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {/* Admin Biometric */}
            <div className="p-3 rounded-xl bg-[#F9F9FB] dark:bg-[#1F1B30] border border-[#F2F0F5] dark:border-[#28233D] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">Admin Dashboard</p>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                    adminPasskeyRegistered
                      ? "bg-[#DCFCE7] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}>
                    {adminPasskeyRegistered ? "Active" : "Not configured"}
                  </span>
                </div>
                <p className="text-[10px] text-[#99969E] dark:text-[#8C879B] mt-0.5">
                  {adminPasskeyRegistered
                    ? "Passkey registered · Auto-verifies on launch with 15s timeout"
                    : "Replaces 6-digit passcode with fast biometric sign-in"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {adminPasskeyRegistered ? (
                  <button
                    onClick={handleRemoveAdminBiometric}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={handleRegisterAdminBiometric}
                    disabled={isRegisteringBiometric !== "none"}
                    className="text-xs font-bold text-white bg-[#5F33E1] dark:bg-[#7C5CE8] hover:bg-[#5029C9] px-3 py-1.5 rounded-xl shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {isRegisteringBiometric === "admin" ? (
                      <>
                        <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <FingerprintIcon className="w-3.5 h-3.5" />
                        <span>+ Add Biometric</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Kiosk Biometric */}
            <div className="p-3 rounded-xl bg-[#F9F9FB] dark:bg-[#1F1B30] border border-[#F2F0F5] dark:border-[#28233D] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">Cash Drawer Kiosk</p>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                    drawerPasskeyRegistered
                      ? "bg-[#DCFCE7] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}>
                    {drawerPasskeyRegistered ? "Active" : "Not configured"}
                  </span>
                </div>
                <p className="text-[10px] text-[#99969E] dark:text-[#8C879B] mt-0.5">
                  {drawerPasskeyRegistered
                    ? "Passkey registered · Instant counter unlock"
                    : "Replaces 4-digit PIN for shop cash drawer access"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {drawerPasskeyRegistered ? (
                  <button
                    onClick={handleRemoveDrawerBiometric}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={handleRegisterDrawerBiometric}
                    disabled={isRegisteringBiometric !== "none"}
                    className="text-xs font-bold text-[#5F33E1] dark:text-[#9F87EF] bg-[#EDE8FB] dark:bg-[#29204E] hover:bg-[#DDD6F5] px-3 py-1.5 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {isRegisteringBiometric === "drawer" ? (
                      <>
                        <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <FingerprintIcon className="w-3.5 h-3.5" />
                        <span>+ Add Biometric</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Primary Section: Accounting & Monthly Rituals */}
      <div className="space-y-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E] dark:text-[#8C879B]">
          Accounting & Reports
        </span>

        {/* Month-End Profit Allocator */}
        <button
          onClick={() => onOpenMonthEnd?.()}
          className="w-full bg-white dark:bg-[#161324] rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] dark:border-[#28233D] hover:border-gray-300 dark:hover:border-[#3D3759] transition-all text-left shadow-xs group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EDE8FB] dark:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
              <TrendUpIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8] group-hover:text-[#5F33E1] dark:group-hover:text-[#9F87EF] transition-colors">
                Month-End Profit Allocator
              </p>
              <p className="text-[11px] text-[#99969E] dark:text-[#8C879B]">
                Split net margins: Reinvestment, Reserve & Withdrawals
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-[#8C879B] group-hover:text-[#5F33E1] dark:group-hover:text-[#9F87EF] transition-colors shrink-0" />
        </button>

        {/* Export for CA */}
        <button
          onClick={handleExportCA}
          disabled={isExporting}
          className="w-full bg-white dark:bg-[#161324] rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] dark:border-[#28233D] hover:border-gray-300 dark:hover:border-[#3D3759] transition-all text-left shadow-xs group disabled:opacity-50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F5F2FF] dark:bg-[#1F1B30] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
              {isExporting ? (
                <SpinnerIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF] animate-spin" />
              ) : (
                <CardSendIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF]" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8] group-hover:text-[#5F33E1] dark:group-hover:text-[#9F87EF] transition-colors">
                Export for CA (Chartered Accountant)
              </p>
              <p className="text-[11px] text-[#99969E] dark:text-[#8C879B]">
                UTF-8 BOM CSV with Debit/Credit columns & GST numbers
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-[#8C879B] group-hover:text-[#5F33E1] dark:group-hover:text-[#9F87EF] transition-colors shrink-0" />
        </button>

        {/* Print Daily Ledger */}
        <button
          onClick={handlePrintDaily}
          disabled={isPrintingLedger}
          className="w-full bg-white dark:bg-[#161324] rounded-2xl p-4 flex items-center justify-between border border-[#F2F0F5] dark:border-[#28233D] hover:border-gray-300 dark:hover:border-[#3D3759] transition-all text-left shadow-xs group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F5F2FF] dark:bg-[#1F1B30] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
              {isPrintingLedger ? (
                <SpinnerIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF] animate-spin" />
              ) : (
                <PrinterIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF]" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8] group-hover:text-[#5F33E1] dark:group-hover:text-[#9F87EF] transition-colors">
                {isPrintingLedger ? "Loading today's entries..." : "Print Daily Ledger Sheet"}
              </p>
              <p className="text-[11px] text-[#99969E] dark:text-[#8C879B]">
                Clean B&W view ready to staple into physical shop diary
              </p>
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-[#8C879B] group-hover:text-[#5F33E1] dark:group-hover:text-[#9F87EF] transition-colors shrink-0" />
        </button>
      </div>

      {/* 3 & 4. Accounts + Categories side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 3. Manage Accounts CRUD */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E] dark:text-[#8C879B] flex items-center gap-1.5">
            <WalletIcon className="w-3.5 h-3.5 text-[#5F33E1] dark:text-[#9F87EF]" /> Payment Accounts
          </span>
          <button
            onClick={() => {
              setEditingAccount(null);
              setAccountSheetOpen(true);
            }}
            className="text-xs font-bold text-[#5F33E1] dark:text-[#9F87EF] hover:underline bg-[#EDE8FB] dark:bg-[#29204E] px-3 py-1 rounded-full"
          >
            + Add Account
          </button>
        </div>

        <div className="bg-white dark:bg-[#161324] border border-[#F2F0F5] dark:border-[#28233D] rounded-2xl divide-y divide-[#F2F0F5] dark:divide-[#28233D] overflow-hidden shadow-xs">
          {loadingCrud ? (
            <div className="p-4 flex items-center justify-center text-gray-400">
              <SpinnerIcon className="w-5 h-5 animate-spin text-[#5F33E1] dark:text-[#9F87EF]" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="p-5 flex flex-col items-center gap-3 text-center">
              <p className="text-xs text-[#99969E] dark:text-[#8C879B]">No payment accounts configured yet</p>
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
              <div key={acc.id} className="p-3.5 flex justify-between items-center hover:bg-[#F9F9FB] dark:hover:bg-[#1F1B30] transition-colors">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8] truncate">{acc.name}</p>
                  <p className="text-[10px] text-[#99969E] dark:text-[#8C879B] uppercase font-semibold mt-0.5">
                    {acc.type || "channel"} · <span className="text-[#120D26] dark:text-[#F4F3F8] font-bold">{formatINR(acc.current_balance)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 shrink-0">
                  <button
                    onClick={() => {
                      setEditingAccount(acc);
                      setAccountSheetOpen(true);
                    }}
                    title="Edit Account"
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#28233D] hover:text-[#5F33E1] dark:hover:text-[#9F87EF] transition-colors"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                    title="Archive Account"
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#99969E] dark:text-[#8C879B] flex items-center gap-1.5">
            <ReceiptIcon className="w-3.5 h-3.5 text-[#5F33E1] dark:text-[#9F87EF]" /> Categories
          </span>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategorySheetOpen(true);
            }}
            className="text-xs font-bold text-[#5F33E1] dark:text-[#9F87EF] hover:underline bg-[#EDE8FB] dark:bg-[#29204E] px-3 py-1 rounded-full"
          >
            + Add Category
          </button>
        </div>

        <div className="bg-white dark:bg-[#161324] border border-[#F2F0F5] dark:border-[#28233D] rounded-2xl divide-y divide-[#F2F0F5] dark:divide-[#28233D] overflow-hidden shadow-xs max-h-80 overflow-y-auto scrollbar-hide">
          {loadingCrud ? (
            <div className="p-4 flex items-center justify-center text-gray-400">
              <SpinnerIcon className="w-5 h-5 animate-spin text-[#5F33E1] dark:text-[#9F87EF]" />
            </div>
          ) : categories.length === 0 ? (
            <p className="p-4 text-xs text-[#99969E] dark:text-[#8C879B] text-center">No categories configured</p>
          ) : (
            categories.map((cat) => {
              const isIncome = cat.type === "INCOME";
              return (
                <div key={cat.id} className="p-3.5 flex justify-between items-center hover:bg-[#F9F9FB] dark:hover:bg-[#1F1B30] transition-colors">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8] truncate">{cat.name}</p>
                    <span
                      className={`inline-block text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full mt-0.5 ${
                        isIncome
                          ? "bg-[#EDE8FB] dark:bg-[#29204E] text-[#5F33E1] dark:text-[#9F87EF]"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {cat.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 shrink-0">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategorySheetOpen(true);
                      }}
                      title="Edit Category"
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#28233D] hover:text-[#5F33E1] dark:hover:text-[#9F87EF] transition-colors"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      title="Archive Category"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
      </div>{/* end accounts+categories grid */}

      {/* 5. Partner Trust Quick Access */}
      <button
        onClick={onOpenActivityLog}
        className="w-full bg-[#F5F2FF] dark:bg-[#1F1B30] rounded-2xl p-4 flex items-center justify-between border border-[#EDE8FB] dark:border-[#28233D] hover:border-[#5F33E1] dark:hover:border-[#7C5CE8] transition-all text-left shadow-xs group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#EDE8FB] dark:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
            <ShieldTickIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5F33E1] dark:text-[#9F87EF]">
              Partner Audit Log (Trust System)
            </p>
            <p className="text-[11px] text-[#7C5CE8] dark:text-[#C5B8F6]">
              View immutable edit & deletion history
            </p>
          </div>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF] shrink-0" />
      </button>

      {/* 6. About & Version */}
      <section className="space-y-1 pt-2 border-t border-[#F2F0F5] dark:border-[#28233D]">
        <div className="flex flex-col items-center gap-1 py-4 text-center">
          <p className="text-[13px] font-black text-[#120D26] dark:text-[#F4F3F8] tracking-tight">Finizer</p>
          <p className="text-[11px] text-[#99969E] dark:text-[#8C879B] font-medium">
            Retail Finance Manager · v0.1.0
          </p>
          <p className="text-[10px] text-[#C5C2CC] dark:text-gray-600 mt-1">
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
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setConfirmDialog(null)}
          />
          <div className="relative bg-white dark:bg-[#1F1B30] border border-[#F2F0F5] dark:border-[#28233D] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-slide-up z-10 transition-colors">
            <p className="text-sm font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-4">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 rounded-xl border border-[#F2F0F5] dark:border-[#28233D] text-sm font-bold text-[#99969E] dark:text-[#8C879B] hover:bg-gray-50 dark:hover:bg-[#28233D] transition-colors"
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
