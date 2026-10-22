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
} from "../components/icons";

// Finizer Core Tabs
import HomeTab from "../components/finizer/HomeTab";
import EntriesTab from "../components/finizer/EntriesTab";
import DeliveriesTab from "../components/finizer/DeliveriesTab";
import SettingsTab from "../components/finizer/SettingsTab";

// Modals & Bottom Sheets
import QuickAddSheet, { TransactionData } from "../components/sheets/QuickAddSheet";
import ActivityLogModal from "../components/finizer/ActivityLogModal";
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";

type TabId = "home" | "entries" | "deliveries" | "settings";

interface TransactionItem {
  id: string;
  title: string;
  account: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  time: string;
}

const DEFAULT_TRANSACTIONS: TransactionItem[] = [
  { id: "1", title: "Daily Counter Sales (Cash)", account: "Main Cash Drawer", amount: 15400, type: "INCOME", time: "Today, 02:40 PM" },
  { id: "2", title: "Staff Tea & Evening Snacks", account: "Main Cash Drawer", amount: 350, type: "EXPENSE", time: "Today, 01:15 PM" },
  { id: "3", title: "Packaging Boxes Wholesale", account: "PhonePe UPI", amount: 4800, type: "EXPENSE", time: "Today, 11:30 AM" },
  { id: "4", title: "UPI Store QR Collections", account: "PhonePe UPI", amount: 26800, type: "INCOME", time: "Yesterday, 09:10 PM" },
  { id: "5", title: "Delivery Van Petrol Fuel", account: "Main Cash Drawer", amount: 1200, type: "EXPENSE", time: "Yesterday, 04:00 PM" },
];

export default function FinizerApp() {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState<boolean>(false);
  const [hasRecentEditBadge, setHasRecentEditBadge] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Saved just now");

  // Live in-memory transactions feed
  const [transactions, setTransactions] = useState<TransactionItem[]>(DEFAULT_TRANSACTIONS);

  const loadData = useCallback(async () => {
    try {
      const dbTx = await api.getTransactions(10);
      if (dbTx && dbTx.length > 0) {
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
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-start sm:justify-center p-0 sm:py-4 sm:px-2 overflow-y-auto">
      {/* Main Mobile App Frame */}
      <div className="relative w-full max-w-md h-[100dvh] sm:h-[min(844px,calc(100vh-2rem))] bg-[#F8F9FA] sm:rounded-[40px] shadow-2xl sm:border-4 sm:border-gray-800 flex flex-col overflow-hidden">
        
        {/* ── 1. GLOBAL TOP BAR ─────────────────────────── */}
        <header className="bg-white px-5 py-3.5 flex items-center justify-between border-b border-[#F2F0F5] sticky top-0 z-30 shrink-0">
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
              <h1 className="text-base font-black text-[#120D26] tracking-tight">Main Store</h1>
              <ArrowDownIcon className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>

          {/* Center: Human Sync Status */}
          <span className="text-[11px] font-medium text-gray-400">
            {lastSyncTime}
          </span>

          {/* Right: Partner Trust Shield */}
          <button
            onClick={() => {
              setIsActivityLogOpen(true);
              setHasRecentEditBadge(false);
            }}
            title="Partner Trust Activity Log"
            className="relative w-9 h-9 rounded-xl bg-[#F5F2FF] hover:bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1] transition-colors"
          >
            <ShieldTickIcon className="w-5 h-5 text-[#5F33E1]" />
            {hasRecentEditBadge && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#5F33E1] rounded-full ring-2 ring-white" />
            )}
          </button>
        </header>

        {/* ── 2. SCROLLABLE TAB CONTENT ─────────────────── */}
        <main className="flex-1 overflow-y-auto px-5 pt-5 pb-28 scrollbar-hide">
          {activeTab === "home" && (
            <HomeTab
              transactions={transactions}
              onNavigateToDeliveries={() => setActiveTab("deliveries")}
            />
          )}

          {activeTab === "entries" && <EntriesTab />}

          {activeTab === "deliveries" && <DeliveriesTab />}

          {activeTab === "settings" && (
            <SettingsTab onOpenActivityLog={() => setIsActivityLogOpen(true)} />
          )}
        </main>

        {/* ── 3. THE IMMUTABLE FAB (Always Quick Add) ────── */}
        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 w-14 h-14 bg-[#5F33E1] text-white rounded-full shadow-lg shadow-[#5F33E1]/40 border-4 border-white flex items-center justify-center z-40 active:scale-95 transition-transform"
          aria-label="Quick Add Transaction"
        >
          <AddIcon className="w-7 h-7 text-white" />
        </button>

        {/* ── 4. GLOBAL BOTTOM NAVIGATION ───────────────── */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#F2F0F5] px-4 py-2.5 flex items-center justify-around z-30 shrink-0">
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
                    isActive ? "text-[#5F33E1]" : "text-[#99969E] hover:text-[#120D26]"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-[#5F33E1]" : "text-[#99969E]"}`} />
                  <span className={`text-[10px] mt-1 font-semibold ${isActive ? "text-[#5F33E1]" : "text-[#99969E]"}`}>
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
      </div>
    </div>
  );
}
