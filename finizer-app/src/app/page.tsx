"use client";
import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  HomeIcon,
  DocumentIcon,
  TruckIcon,
  ProfileIcon,
  ShieldTickIcon,
  AddIcon,
  ArrowDownIcon,
  LockIcon,
} from "../components/icons";

// Finizer Core Tabs
import HomeTab from "../components/finizer/HomeTab";
import EntriesTab from "../components/finizer/EntriesTab";
import DeliveriesTab from "../components/finizer/DeliveriesTab";
import SettingsTab from "../components/finizer/SettingsTab";

// Modals & Bottom Sheets
import QuickAddSheet, { TransactionData } from "../components/sheets/QuickAddSheet";
import ActivityLogModal from "../components/finizer/ActivityLogModal";
import MonthEndAllocator from "../components/finizer/MonthEndAllocator";
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";

// Auth
import AdminLockScreen from "../components/lock/AdminLockScreen";

type TabId = "home" | "entries" | "deliveries" | "settings";

interface TransactionItem {
  id: string;
  title: string;
  account: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  time: string;
}

const DEFAULT_TRANSACTIONS: TransactionItem[] = [];

export default function FinizerApp() {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState<boolean>(false);
  const [isMonthEndOpen, setIsMonthEndOpen] = useState<boolean>(false);
  const [hasRecentEditBadge, setHasRecentEditBadge] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Saved just now");

  // ── Admin auth ─────────────────────────────────────────────────────
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(false);

  useEffect(() => {
    if (sessionStorage.getItem("finizer_admin_session") === "1") {
      setAdminUnlocked(true);
    }
  }, []);

  const handleAdminUnlock = useCallback(() => {
    sessionStorage.setItem("finizer_admin_session", "1");
    setAdminUnlocked(true);
  }, []);

  const handleAdminLock = useCallback(() => {
    sessionStorage.removeItem("finizer_admin_session");
    setAdminUnlocked(false);
  }, []);

  // Live in-memory transactions feed
  const [transactions, setTransactions] = useState<TransactionItem[]>(DEFAULT_TRANSACTIONS);

  const loadData = useCallback(async () => {
    try {
      const dbTx = await api.getTransactions(10);
      if (dbTx) {
        const mapped: TransactionItem[] = dbTx.map((tx) => {
          const catName = (tx.categories as { name?: string })?.name || "Entry";
          const desc = tx.description ? ` - ${tx.description}` : "";
          const accName = (tx.accounts as { name?: string })?.name || "Account";
          return {
            id: tx.id,
            title: `${catName}${desc}`,
            account: accName,
            amount: Number(tx.amount),
            type: tx.type,
            time: tx.date || "Recent",
          };
        });
        setTransactions(mapped);
        setLastSyncTime("Live Synced");
      }
    } catch (err) {
      console.warn("Could not fetch remote transactions, running in offline mode:", err);
      setLastSyncTime("Offline Mode");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNewTransaction = async (data: TransactionData) => {
    // 1. Optimistic UI update
    const newEntry: TransactionItem = {
      id: Date.now().toString(),
      title: data.categoryName + (data.note ? ` - ${data.note}` : ""),
      account: data.accountName,
      amount: data.amount,
      type: data.type,
      time: "Just now",
    };
    setTransactions((prev) => [newEntry, ...prev]);

    // 2. Persist to live Supabase database with actor attribution
    try {
      await api.createTransaction(
        {
          account_id: data.accountId,
          category_id: data.categoryId,
          amount: data.amount,
          type: data.type,
          date: data.date,
          description: data.note,
          receipt_url: data.receiptUrl || undefined,
        },
        actor
      );
      loadData();
      setHasRecentEditBadge(true);
    } catch (err) {
      console.warn("Could not save to remote database, retained local optimistic state:", err);
    }
  };

  const navItems = [
    { id: "home" as TabId, label: "Home", icon: HomeIcon },
    { id: "entries" as TabId, label: "Entries", icon: DocumentIcon },
    { id: "deliveries" as TabId, label: "Deliveries", icon: TruckIcon },
    { id: "settings" as TabId, label: "Settings", icon: ProfileIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#0C0A14] flex flex-col items-center justify-start lg:justify-start p-0 overflow-y-auto lg:overflow-hidden transition-colors duration-200">
      {/* Admin Lock Screen */}
      {!adminUnlocked && <AdminLockScreen onUnlock={handleAdminUnlock} />}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT (lg+): sidebar + full-width content       */}
      {/* MOBILE  LAYOUT (<lg): original phone-style single column */}
      {/* ══════════════════════════════════════════════════════════ */}

      <div className="relative w-full h-[100dvh] lg:h-screen bg-[#F8F9FA] dark:bg-[#0C0A14] flex flex-col lg:flex-row overflow-hidden transition-colors duration-200">

        {/* ── DESKTOP SIDEBAR (hidden on mobile) ─────────── */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[240px] xl:w-[260px] bg-white dark:bg-[#161324] border-r border-[#F2F0F5] dark:border-[#28233D] shrink-0 h-full transition-colors duration-200">
          {/* Sidebar Header / Brand */}
          <div className="px-5 py-5 border-b border-[#F2F0F5] dark:border-[#28233D]">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <Image
                src="/icon.png"
                alt="Finizer"
                width={32}
                height={32}
                className="w-8 h-8 rounded-xl shadow-xs object-contain"
                priority
              />
              <div>
                <h1 className="text-sm font-black text-[#120D26] dark:text-[#F4F3F8] tracking-tight leading-tight">Main Store</h1>
                <span className="text-[10px] font-medium text-gray-400 dark:text-[#8C879B]">{lastSyncTime}</span>
              </div>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#EDE8FB] dark:bg-[#29204E] text-[#5F33E1] dark:text-[#9F87EF]"
                      : "text-[#99969E] dark:text-[#8C879B] hover:bg-[#F8F9FA] dark:hover:bg-[#1F1B30] hover:text-[#120D26] dark:hover:text-[#F4F3F8]"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-[#5F33E1] dark:text-[#9F87EF]" : "text-[#99969E] dark:text-[#8C879B]"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Quick Add Button */}
          <div className="px-3 pb-4">
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#5F33E1] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#5F33E1]/25 hover:bg-[#5029C9] active:scale-[0.98] transition-all"
            >
              <AddIcon className="w-5 h-5 text-white" />
              <span>Quick Add</span>
            </button>
          </div>

          {/* Sidebar Footer Actions */}
          <div className="px-3 pb-5 border-t border-[#F2F0F5] dark:border-[#28233D] pt-3 flex items-center justify-between">
            <button
              onClick={handleAdminLock}
              title="Lock Admin"
              className="w-9 h-9 rounded-xl bg-[#F5F2FF] dark:bg-[#1F1B30] hover:bg-[#EDE8FB] dark:hover:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF] transition-colors"
            >
              <LockIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsActivityLogOpen(true);
                setHasRecentEditBadge(false);
              }}
              title="Partner Trust Activity Log"
              className="relative w-9 h-9 rounded-xl bg-[#F5F2FF] dark:bg-[#1F1B30] hover:bg-[#EDE8FB] dark:hover:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF] transition-colors"
            >
              <ShieldTickIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF]" />
              {hasRecentEditBadge && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#5F33E1] rounded-full ring-2 ring-white dark:ring-[#161324]" />
              )}
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT AREA ────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 h-full">

          {/* ── 1. MOBILE TOP BAR (hidden on desktop) ────── */}
          <header className="lg:hidden bg-white dark:bg-[#161324] px-5 py-3.5 flex items-center justify-between border-b border-[#F2F0F5] dark:border-[#28233D] sticky top-0 z-30 shrink-0 transition-colors duration-200">
            {/* Left: Store Selector with App Icon */}
            <div className="flex items-center gap-2 cursor-pointer">
              <Image
                src="/icon.png"
                alt="Finizer"
                width={26}
                height={26}
                className="w-[26px] h-[26px] rounded-lg shadow-xs object-contain"
                priority
              />
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-[#120D26] dark:text-[#F4F3F8] tracking-tight">Main Store</h1>
                <ArrowDownIcon className="w-3.5 h-3.5 text-gray-400 dark:text-[#8C879B]" />
              </div>
            </div>

            {/* Center: Human Sync Status */}
            <span className="text-[11px] font-medium text-gray-400 dark:text-[#8C879B]">
              {lastSyncTime}
            </span>

            {/* Right: Lock + Partner Trust Shield */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAdminLock}
                title="Lock Admin"
                className="w-9 h-9 rounded-xl bg-[#F5F2FF] dark:bg-[#1F1B30] hover:bg-[#EDE8FB] dark:hover:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF] transition-colors"
              >
                <LockIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsActivityLogOpen(true);
                  setHasRecentEditBadge(false);
                }}
                title="Partner Trust Activity Log"
                className="relative w-9 h-9 rounded-xl bg-[#F5F2FF] dark:bg-[#1F1B30] hover:bg-[#EDE8FB] dark:hover:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF] transition-colors"
              >
                <ShieldTickIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF]" />
                {hasRecentEditBadge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#5F33E1] rounded-full ring-2 ring-white dark:ring-[#161324]" />
                )}
              </button>
            </div>
          </header>

          {/* ── DESKTOP TOP BAR (hidden on mobile) ────────── */}
          <header className="hidden lg:flex bg-white dark:bg-[#161324] px-8 py-4 items-center justify-between border-b border-[#F2F0F5] dark:border-[#28233D] shrink-0 transition-colors duration-200">
            <div>
              <h2 className="text-xl font-black text-[#120D26] dark:text-[#F4F3F8] tracking-tight capitalize">{activeTab}</h2>
              <p className="text-xs text-[#99969E] dark:text-[#8C879B] font-medium">
                {activeTab === "home" && "Business overview & recent activity"}
                {activeTab === "entries" && "Digital store diary"}
                {activeTab === "deliveries" && "Vendor orders, payments & arrivals"}
                {activeTab === "settings" && "Store operations & accounting"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#5F33E1] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#5F33E1]/25 hover:bg-[#5029C9] active:scale-[0.98] transition-all"
              >
                <AddIcon className="w-4 h-4 text-white" />
                <span>Quick Add</span>
              </button>
            </div>
          </header>

          {/* ── 2. SCROLLABLE TAB CONTENT ─────────────────── */}
          <main className="flex-1 overflow-y-auto px-5 lg:px-8 xl:px-12 pt-5 lg:pt-6 pb-28 lg:pb-8 scrollbar-hide">
            <div className="max-w-4xl mx-auto">
              {activeTab === "home" && (
                <HomeTab
                  transactions={transactions}
                  onNavigateToDeliveries={() => setActiveTab("deliveries")}
                  onOpenMonthEnd={() => setIsMonthEndOpen(true)}
                />
              )}

              {activeTab === "entries" && <EntriesTab />}

              {activeTab === "deliveries" && <DeliveriesTab />}

              {activeTab === "settings" && (
                <SettingsTab
                  onOpenActivityLog={() => setIsActivityLogOpen(true)}
                  onOpenMonthEnd={() => setIsMonthEndOpen(true)}
                />
              )}
            </div>
          </main>
        </div>

        {/* ── 3. MOBILE FAB (hidden on desktop) ──────────── */}
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="lg:hidden absolute bottom-5 left-1/2 -translate-x-1/2 w-14 h-14 bg-[#5F33E1] text-white rounded-full shadow-lg shadow-[#5F33E1]/40 border-4 border-white dark:border-[#161324] flex items-center justify-center z-40 active:scale-95 transition-transform"
          aria-label="Quick Add Transaction"
        >
          <AddIcon className="w-7 h-7 text-white" />
        </button>

        {/* ── 4. MOBILE BOTTOM NAVIGATION (hidden on desktop) ── */}
        <nav className="lg:hidden absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-[#161324]/95 backdrop-blur-md border-t border-[#F2F0F5] dark:border-[#28233D] px-4 py-2.5 flex items-center justify-around z-30 shrink-0 transition-colors duration-200">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            // Gap for center floating FAB
            const isCenterOffset = idx === 1;

            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
                    isActive ? "text-[#5F33E1] dark:text-[#9F87EF]" : "text-[#99969E] dark:text-[#8C879B] hover:text-[#120D26] dark:hover:text-[#F4F3F8]"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-[#5F33E1] dark:text-[#9F87EF]" : "text-[#99969E] dark:text-[#8C879B]"}`} />
                  <span className={`text-[10px] mt-1 font-semibold ${isActive ? "text-[#5F33E1] dark:text-[#9F87EF]" : "text-[#99969E] dark:text-[#8C879B]"}`}>
                    {item.label}
                  </span>
                </button>

                {/* Center spacing spacer for FAB */}
                {isCenterOffset && <div className="w-10" />}
              </React.Fragment>
            );
          })}
        </nav>

        {/* ── 5. QUICK ADD BOTTOM SHEET ─────────────────── */}
        <QuickAddSheet
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onSubmit={handleNewTransaction}
        />

        {/* ── 6. PARTNER TRUST ACTIVITY LOG MODAL ───────── */}
        <ActivityLogModal
          isOpen={isActivityLogOpen}
          onClose={() => setIsActivityLogOpen(false)}
        />

        {/* ── 7. MONTH-END PROFIT ALLOCATOR FULL-FRAME VIEW ── */}
        {isMonthEndOpen && (
          <MonthEndAllocator
            onBack={() => setIsMonthEndOpen(false)}
            onSuccess={() => {
              setIsMonthEndOpen(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
}
