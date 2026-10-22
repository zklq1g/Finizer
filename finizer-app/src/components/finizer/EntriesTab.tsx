"use client";
import React, { useState, useEffect } from "react";
import EmptyState from "./EmptyState";
import { DocumentIcon, PrinterIcon, CheckIcon } from "../icons";
import { api } from "@/services/api";

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

const INITIAL_ENTRIES: EntryRecord[] = [
  { id: "e1", title: "Daily Store Counter Sales", category: "Sales Revenue", account: "Main Cash Drawer", amount: 18400, type: "INCOME", time: "05:15 PM", dateGroup: "Today" },
  { id: "e2", title: "Staff Evening Samosa & Tea", category: "Staff Welfare", account: "Main Cash Drawer", amount: 320, type: "EXPENSE", time: "04:30 PM", dateGroup: "Today" },
  { id: "e3", title: "Packaging Tape & Stickers", category: "Supplies", account: "PhonePe UPI", amount: 650, type: "EXPENSE", time: "02:10 PM", dateGroup: "Today" },
  { id: "e4", title: "QR Code Merchant Payout", category: "Sales Revenue", account: "PhonePe UPI", amount: 9200, type: "INCOME", time: "11:20 AM", dateGroup: "Today" },
  { id: "e5", title: "Counter Change Dispense", category: "Operations", account: "Main Cash Drawer", amount: 500, type: "EXPENSE", time: "09:40 AM", dateGroup: "Today" },

  { id: "e6", title: "Wholesale Grocery Order #412", category: "Wholesale", account: "HDFC Bank Account", amount: 45000, type: "INCOME", time: "07:30 PM", dateGroup: "Yesterday" },
  { id: "e7", title: "Delivery Van Diesel Fuel", category: "Transportation", account: "Main Cash Drawer", amount: 2100, type: "EXPENSE", time: "03:15 PM", dateGroup: "Yesterday" },
  { id: "e8", title: "Electrician Shop Fan Repair", category: "Repairs", account: "Main Cash Drawer", amount: 450, type: "EXPENSE", time: "01:00 PM", dateGroup: "Yesterday" },
];

export default function EntriesTab() {
  const [filter, setFilter] = useState<"All" | "Income" | "Expenses">("All");
  const [entries, setEntries] = useState<EntryRecord[]>(INITIAL_ENTRIES);
  const [isDayOnePreview, setIsDayOnePreview] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  useEffect(() => {
    async function loadEntries() {
      try {
        const dbTxs = await api.getTransactions(100);
        if (dbTxs && dbTxs.length > 0) {
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
        console.warn("Could not load entries from API, using fallback:", err);
      }
    }
    loadEntries();
  }, []);

  const handlePrint = () => {
    setPrintSuccess(true);
    setTimeout(() => {
      setPrintSuccess(false);
      window.print();
    }, 500);
  };

  const filteredEntries = entries.filter((e) => {
    if (filter === "Income") return e.type === "INCOME";
    if (filter === "Expenses") return e.type === "EXPENSE";
    return true;
  });

  const todayEntries = filteredEntries.filter((e) => e.dateGroup === "Today");
  const yesterdayEntries = filteredEntries.filter((e) => e.dateGroup === "Yesterday");
  const earlierEntries = filteredEntries.filter((e) => e.dateGroup === "Earlier");

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header with Print Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#120D26]">Entries</h1>
          <p className="text-xs text-[#99969E] font-medium">Digital Store Diary</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Day 1 state toggle for previewing */}
          <button
            onClick={() => setIsDayOnePreview(!isDayOnePreview)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
              isDayOnePreview
                ? "bg-[#5F33E1] text-white border-[#5F33E1]"
                : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            {isDayOnePreview ? "Viewing Day 1" : "Preview Day 1"}
          </button>

          {/* Print Daily Ledger Button */}
          <button
            onClick={handlePrint}
            title="Print Daily Ledger"
            className="w-10 h-10 rounded-2xl bg-white border border-[#F2F0F5] hover:bg-gray-50 shadow-sm flex items-center justify-center text-[#120D26] hover:text-[#5F33E1] transition-colors"
          >
            <PrinterIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {printSuccess && (
        <div className="bg-[#DCFCE7] text-[#16A34A] text-xs font-bold p-3 rounded-2xl flex items-center justify-between border border-[#BBF7D0] animate-fade-in">
          <span className="flex items-center gap-1.5"><CheckIcon className="w-4 h-4 text-[#16A34A]" /> Daily ledger ready. Opening print dialog...</span>
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
                ? "bg-[#120D26] text-white shadow-sm"
                : "bg-white text-[#99969E] border border-[#F2F0F5] hover:border-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content: Day 1 Empty State OR Grouped List */}
      {isDayOnePreview ? (
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
                <span className="text-xs font-extrabold text-[#120D26] uppercase tracking-wider">
                  Today
                </span>
                <span className="text-[11px] text-[#99969E] font-medium">
                  {todayEntries.length} entries
                </span>
              </div>
              <div className="space-y-2.5">
                {todayEntries.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-[#F2F0F5] hover:border-gray-200 transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-[#120D26] truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[#99969E] mt-0.5">
                        {item.category} · {item.account} · {item.time}
                      </p>
                    </div>

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
          )}

          {/* Yesterday Group */}
          {yesterdayEntries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-extrabold text-[#120D26] uppercase tracking-wider">
                  Yesterday
                </span>
                <span className="text-[11px] text-[#99969E] font-medium">
                  {yesterdayEntries.length} entries
                </span>
              </div>
              <div className="space-y-2.5">
                {yesterdayEntries.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-[#F2F0F5]"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-[#120D26] truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[#99969E] mt-0.5">
                        {item.category} · {item.account} · {item.time}
                      </p>
                    </div>

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
          )}

          {/* Earlier Group */}
          {earlierEntries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-extrabold text-[#120D26] uppercase tracking-wider">
                  Earlier Records
                </span>
                <span className="text-[11px] text-[#99969E] font-medium">
                  {earlierEntries.length} entries
                </span>
              </div>
              <div className="space-y-2.5">
                {earlierEntries.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-[#F2F0F5]"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-[#120D26] truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[#99969E] mt-0.5">
                        {item.category} · {item.account} · {item.time}
                      </p>
                    </div>

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
          )}
        </div>
      )}
    </div>
  );
}
