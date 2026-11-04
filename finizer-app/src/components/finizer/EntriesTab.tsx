"use client";
import React, { useState, useEffect } from "react";
import EmptyState from "./EmptyState";
import { DocumentIcon, PrinterIcon, CheckIcon, TrashIcon, SpinnerIcon } from "../icons";
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";

interface EntryRecord {
  id: string;
  title: string;
  category: string;
  account: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  time: string;
  dateGroup: "Today" | "Yesterday" | "Earlier";
}

export default function EntriesTab() {
  const { actor } = useActor();
  const [filter, setFilter] = useState<"All" | "Income" | "Expenses">("All");
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDayOnePreview, setIsDayOnePreview] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [cancelingItem, setCancelingItem] = useState<EntryRecord | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadEntries = async () => {
    try {
      const dbTxs = await api.getTransactions(100);
      if (dbTxs) {
        const now = new Date();
        const todayISO = now.toISOString().split("T")[0];
        const yDate = new Date();
        yDate.setDate(now.getDate() - 1);
        const yesterdayISO = yDate.toISOString().split("T")[0];

        const mapped: EntryRecord[] = dbTxs.map((tx) => {
          const catName = (tx.categories as { name?: string })?.name || "General";
          const accName = (tx.accounts as { name?: string })?.name || "Cash Drawer";
          const desc = tx.description ? ` - ${tx.description}` : "";

          let dateGroup: "Today" | "Yesterday" | "Earlier" = "Earlier";
          if (tx.date === todayISO) {
            dateGroup = "Today";
          } else if (tx.date === yesterdayISO) {
            dateGroup = "Yesterday";
          }

          return {
            id: tx.id,
            title: `${catName}${desc}`,
            category: catName,
            account: accName,
            amount: Number(tx.amount),
            type: tx.type,
            time: tx.date || "Recent",
            dateGroup,
          };
        });
        setEntries(mapped);
      }
    } catch (err) {
      console.warn("Could not load entries from API:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handlePrint = () => {
    setPrintSuccess(true);
    setTimeout(() => {
      setPrintSuccess(false);
      window.print();
    }, 500);
  };

  const handleConfirmVoid = async (item: EntryRecord) => {
    setIsCanceling(true);
    try {
      await api.softDeleteTransaction(item.id, actor);
      setEntries((prev) => prev.filter((e) => e.id !== item.id));
      setToast({
        message: `Voided ${item.title} (₹${item.amount.toLocaleString("en-IN")}). Balance reversed in ${item.account}.`,
        type: "success",
      });
      setCancelingItem(null);
    } catch (err) {
      console.error("Failed to void transaction:", err);
      setToast({
        message: "Failed to void transaction. Please try again.",
        type: "error",
      });
    } finally {
      setIsCanceling(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (filter === "Income") return e.type === "INCOME";
    if (filter === "Expenses") return e.type === "EXPENSE";
    return true;
  });

  const todayEntries = filteredEntries.filter((e) => e.dateGroup === "Today");
  const yesterdayEntries = filteredEntries.filter((e) => e.dateGroup === "Yesterday");
  const earlierEntries = filteredEntries.filter((e) => e.dateGroup === "Earlier");

  const renderEntryRow = (item: EntryRecord) => (
    <div
      key={item.id}
      className="bg-white dark:bg-[#161324] rounded-2xl p-4 flex items-center justify-between shadow-xs border border-[#F2F0F5] dark:border-[#28233D] hover:border-gray-200 dark:hover:border-[#3D3759] transition-colors group"
    >
      <div className="min-w-0 pr-3">
        <p className="text-xs font-bold text-[#120D26] dark:text-[#F4F3F8] truncate">
          {item.title}
        </p>
        <p className="text-[10px] text-[#99969E] dark:text-[#8C879B] mt-0.5 font-medium">
          {item.category} · {item.account} · {item.time}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          {item.type === "INCOME" ? (
            <p className="text-sm font-black text-[#5F33E1] dark:text-[#4ADE80]">
              + ₹{item.amount.toLocaleString("en-IN")}
            </p>
          ) : (
            <p className="text-sm font-semibold text-[#120D26] dark:text-[#F87171]">
              − ₹{item.amount.toLocaleString("en-IN")}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCancelingItem(item)}
          title="Void this transaction"
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-[#DC2626] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors opacity-70 group-hover:opacity-100"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header with Print Action */}
      <div className="flex items-center justify-between">
        <div className="lg:hidden">
          <h1 className="text-2xl font-black text-[#120D26] dark:text-[#F4F3F8]">Entries</h1>
          <p className="text-xs text-[#99969E] dark:text-[#8C879B] font-medium">Digital Store Diary</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Day 1 state toggle for previewing */}
          <button
            onClick={() => setIsDayOnePreview(!isDayOnePreview)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
              isDayOnePreview
                ? "bg-[#5F33E1] dark:bg-[#7C5CE8] text-white border-[#5F33E1] dark:border-[#7C5CE8]"
                : "bg-white dark:bg-[#161324] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#28233D]"
            }`}
          >
            {isDayOnePreview ? "Viewing Day 1" : "Preview Day 1"}
          </button>

          {/* Print Daily Ledger Button */}
          <button
            onClick={handlePrint}
            title="Print Daily Ledger"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#161324] border border-[#F2F0F5] dark:border-[#28233D] hover:bg-gray-50 dark:hover:bg-[#1F1B30] shadow-sm flex items-center justify-center text-[#120D26] dark:text-[#F4F3F8] hover:text-[#5F33E1] dark:hover:text-[#9F87EF] transition-colors"
          >
            <PrinterIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {toast && (
        <div
          className={`text-xs font-bold p-3.5 rounded-2xl border animate-fade-in shadow-xs flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-[#FEF2F2] dark:bg-red-950/40 text-[#DC2626] dark:text-red-400 border-[#FEE2E2] dark:border-red-900/50"
              : "bg-[#DCFCE7] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border-[#BBF7D0] dark:border-emerald-900/50"
          }`}
        >
          {toast.type === "success" && <CheckIcon className="w-4 h-4 text-[#16A34A] dark:text-emerald-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {printSuccess && (
        <div className="bg-[#DCFCE7] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 text-xs font-bold p-3 rounded-2xl flex items-center justify-between border border-[#BBF7D0] dark:border-emerald-900/50 animate-fade-in">
          <span className="flex items-center gap-1.5"><CheckIcon className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" /> Daily ledger ready. Opening print dialog...</span>
        </div>
      )}

      {/* Sticky Filters (Thumb Zone) */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(["All", "Income", "Expenses"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filter === tab
                ? "bg-[#120D26] dark:bg-[#7C5CE8] text-white shadow-sm"
                : "bg-white dark:bg-[#161324] text-[#99969E] dark:text-[#8C879B] border border-[#F2F0F5] dark:border-[#28233D] hover:border-gray-300 dark:hover:border-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content: Loading OR Day 1 Preview / Empty State OR Grouped List */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <SpinnerIcon className="w-6 h-6 animate-spin text-[#5F33E1] dark:text-[#9F87EF] mb-2" />
          <p className="text-xs font-bold text-gray-400 dark:text-[#8C879B]">Loading ledger entries...</p>
        </div>
      ) : isDayOnePreview || filteredEntries.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon className="w-8 h-8 text-[#5F33E1]" />}
          title="Your digital ledger is empty"
          subtitle="Tap the + button below to record your first entry and leave the notebook behind."
        />
      ) : (
        <div className="space-y-6">
          {/* Today Group */}
          {todayEntries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-extrabold text-[#120D26] dark:text-[#F4F3F8] uppercase tracking-wider">
                  Today
                </span>
                <span className="text-[11px] text-[#99969E] dark:text-[#8C879B] font-medium">
                  {todayEntries.length} {todayEntries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="space-y-2.5">
                {todayEntries.map(renderEntryRow)}
              </div>
            </div>
          )}

          {/* Yesterday Group */}
          {yesterdayEntries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-extrabold text-[#120D26] dark:text-[#F4F3F8] uppercase tracking-wider">
                  Yesterday
                </span>
                <span className="text-[11px] text-[#99969E] dark:text-[#8C879B] font-medium">
                  {yesterdayEntries.length} {yesterdayEntries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="space-y-2.5">
                {yesterdayEntries.map(renderEntryRow)}
              </div>
            </div>
          )}

          {/* Earlier Group */}
          {earlierEntries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-extrabold text-[#120D26] dark:text-[#F4F3F8] uppercase tracking-wider">
                  Earlier Records
                </span>
                <span className="text-[11px] text-[#99969E] dark:text-[#8C879B] font-medium">
                  {earlierEntries.length} {earlierEntries.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="space-y-2.5">
                {earlierEntries.map(renderEntryRow)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Confirmation Modal for Voiding */}
      {cancelingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fade-in"
            onClick={() => !isCanceling && setCancelingItem(null)}
          />
          <div className="relative bg-white dark:bg-[#1F1B30] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-slide-up z-10 border border-[#F2F0F5] dark:border-[#28233D]">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#DC2626] dark:text-red-400 flex items-center justify-center mb-3 mx-auto">
              <TrashIcon className="w-5 h-5 text-[#DC2626] dark:text-red-400" />
            </div>
            <h3 className="text-sm font-extrabold text-[#120D26] dark:text-[#F4F3F8] text-center mb-1">
              Void Transaction?
            </h3>
            <p className="text-xs text-[#99969E] dark:text-[#8C879B] text-center mb-4 leading-relaxed">
              Are you sure you want to void{" "}
              <span className="font-bold text-[#120D26] dark:text-[#F4F3F8]">&ldquo;{cancelingItem.title}&rdquo;</span> (
              <span className="font-extrabold text-[#120D26] dark:text-[#F4F3F8]">
                ₹{cancelingItem.amount.toLocaleString("en-IN")}
              </span>
              )? This will reverse the balance in{" "}
              <span className="font-bold text-[#120D26] dark:text-[#F4F3F8]">{cancelingItem.account}</span> and log the event in the Partner Audit Trail.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => setCancelingItem(null)}
                className="flex-1 py-3 rounded-xl border border-[#F2F0F5] dark:border-[#28233D] text-xs font-bold text-[#99969E] dark:text-[#8C879B] hover:bg-gray-50 dark:hover:bg-[#28233D] transition-colors disabled:opacity-50"
              >
                Keep Entry
              </button>
              <button
                type="button"
                disabled={isCanceling}
                onClick={() => handleConfirmVoid(cancelingItem)}
                className="flex-1 py-3 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/20"
              >
                {isCanceling ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 animate-spin text-white" />
                    <span>Voiding...</span>
                  </>
                ) : (
                  <span>Void Transaction</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
