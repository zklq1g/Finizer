"use client";
import React, { useState } from "react";
import { ShieldTickIcon, FilterIcon, TrashIcon, LockIcon, CloseIcon, AlertTriangleIcon, UserOctagonIcon, ArrowRightIcon } from "../icons";

export interface AuditSnapshot {
  amount: number;
  account_name: string;
  category_name: string;
  date?: string;
  description?: string;
}

export interface ForensicLog {
  id: string;
  action: "CREATED" | "EDITED" | "SOFT_DELETED";
  timestamp: string; // ISO string
  actor: string;
  old_data: AuditSnapshot | null;
  new_data: AuditSnapshot | null;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// MOCK DATA: Simulating real forensic theft & edit scenarios
const FORENSIC_LOGS: ForensicLog[] = [
  {
    id: "log-1",
    action: "EDITED",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18m ago
    actor: "Rahul (Partner)",
    old_data: { amount: 500, account_name: "Cash Drawer", category_name: "Petrol / Fuel", date: "2026-10-19" },
    new_data: { amount: 350, account_name: "Cash Drawer", category_name: "Petrol / Fuel", date: "2026-10-19" },
  },
  {
    // SNEAKY ACCOUNT SWAP: Amount identical, but money redirected
    id: "log-2",
    action: "EDITED",
    timestamp: new Date(Date.now() - 1000 * 60 * 105).toISOString(), // ~1.7h ago
    actor: "Amit (Cashier)",
    old_data: { amount: 5000, account_name: "Cash Drawer", category_name: "Inventory Purchase", date: "2026-10-19" },
    new_data: { amount: 5000, account_name: "HDFC Bank", category_name: "Partner Withdrawal", date: "2026-10-19" },
  },
  {
    // SNEAKY BACKDATING: Date changed to yesterday to mask today's cash shortage
    id: "log-3",
    action: "EDITED",
    timestamp: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
    actor: "Amit (Cashier)",
    old_data: { amount: 1500, account_name: "Cash Drawer", category_name: "Staff Advance", date: "2026-10-19" },
    new_data: { amount: 1500, account_name: "Cash Drawer", category_name: "Staff Advance", date: "2026-10-15" },
  },
  {
    id: "log-4",
    action: "SOFT_DELETED",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    actor: "Rahul (Partner)",
    old_data: { amount: 1200, account_name: "Shop UPI", category_name: "Tea & Snacks", date: "2026-10-18" },
    new_data: null,
  },
  {
    id: "log-5",
    action: "CREATED",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    actor: "System / POS",
    old_data: null,
    new_data: { amount: 15400, account_name: "Cash Drawer", category_name: "Counter Sales", date: "2026-10-18" },
  },
];

export default function ActivityLogModal({ isOpen, onClose }: ActivityLogModalProps) {
  const [filter, setFilter] = useState<"ALL" | "SUSPICIOUS">("ALL");

  if (!isOpen) return null;

  const suspiciousLogs = FORENSIC_LOGS.filter(
    (log) => log.action === "EDITED" || log.action === "SOFT_DELETED"
  );
  const displayedLogs = filter === "SUSPICIOUS" ? suspiciousLogs : FORENSIC_LOGS;

  // ROBUST DIFF ENGINE: Analyzes JSON snapshots directly (Amount, Account, Category, Date)
  const getDiffs = (oldData: AuditSnapshot | null, newData: AuditSnapshot | null) => {
    if (!oldData || !newData) return [];
    const diffs: { field: string; old: string; new: string }[] = [];

    if (oldData.amount !== newData.amount) {
      diffs.push({
        field: "Amount",
        old: `₹${oldData.amount.toLocaleString("en-IN")}`,
        new: `₹${newData.amount.toLocaleString("en-IN")}`,
      });
    }
    if (oldData.account_name !== newData.account_name) {
      diffs.push({
        field: "Account",
        old: oldData.account_name,
        new: newData.account_name,
      });
    }
    if (oldData.category_name !== newData.category_name) {
      diffs.push({
        field: "Category",
        old: oldData.category_name,
        new: newData.category_name,
      });
    }
    if (oldData.date && newData.date && oldData.date !== newData.date) {
      diffs.push({
        field: "Date (Backdated)",
        old: oldData.date,
        new: newData.date,
      });
    }

    return diffs;
  };

  // Human-readable exact and relative timestamps without heavy dependencies
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    const exact = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const diffMinutes = Math.round((Date.now() - d.getTime()) / (1000 * 60));
    let relative = `${diffMinutes}m ago`;
    if (diffMinutes >= 60 && diffMinutes < 1440) {
      relative = `${Math.round(diffMinutes / 60)}h ago`;
    } else if (diffMinutes >= 1440) {
      relative = `${Math.round(diffMinutes / 1440)}d ago`;
    }

    return { exact, relative };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 h-[100dvh] bg-black/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Security Drawer Container */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl animate-slide-up max-h-[92dvh] flex flex-col z-10 overflow-hidden">
        {/* Drag handle */}
        <div className="pt-3 pb-2 px-5 shrink-0 flex flex-col items-center bg-white border-b border-[#F2F0F5]">
          <div
            onClick={onClose}
            className="w-12 h-1.5 bg-gray-200 rounded-full mb-3 cursor-pointer hover:bg-gray-300 transition-colors"
          />

          {/* Header */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
                <ShieldTickIcon className="w-5 h-5 text-[#5F33E1]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#120D26]">Partner Trust Audit</h2>
                <div className="flex items-center gap-1.5 text-[11px] text-[#16A34A] font-bold">
                  <LockIcon className="w-3.5 h-3.5 text-[#16A34A]" /> Immutable Record
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STICKY FILTER: Signal-to-Noise Separator */}
        <div className="px-5 py-3 bg-[#F8F9FA] border-b border-[#F2F0F5] flex items-center gap-2 shrink-0">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === "ALL"
                ? "bg-[#120D26] text-white shadow-sm"
                : "bg-white text-[#99969E] border border-[#F2F0F5] hover:text-[#120D26]"
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5" />
            <span>All Activity ({FORENSIC_LOGS.length})</span>
          </button>

          <button
            onClick={() => setFilter("SUSPICIOUS")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === "SUSPICIOUS"
                ? "bg-[#D97706] text-white shadow-sm shadow-[#D97706]/30"
                : "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] hover:bg-[#FDE68A]"
            }`}
          >
            <AlertTriangleIcon className="w-3.5 h-3.5" />
            <span>Edits & Deletes</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                filter === "SUSPICIOUS" ? "bg-white/20 text-white" : "bg-[#FDE68A] text-[#92400E]"
              }`}
            >
              {suspiciousLogs.length}
            </span>
          </button>
        </div>

        {/* LOG LIST BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-hide">
          {displayedLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-bold text-[#120D26]">No suspicious activity found</p>
              <p className="text-xs text-[#99969E] mt-1">All financial records remain unaltered.</p>
            </div>
          ) : (
            displayedLogs.map((log) => {
              const diffs = getDiffs(log.old_data, log.new_data);
              const time = formatTime(log.timestamp);
              const snapshot = log.action === "SOFT_DELETED" ? log.old_data : log.new_data;

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-2xl border border-[#F2F0F5] shadow-sm overflow-hidden hover:border-gray-300 transition-colors"
                >
                  {/* Card Header: Actor Attribution + Timestamp */}
                  <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-[#F2F0F5] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          log.action === "CREATED"
                            ? "bg-[#EDE8FB] text-[#5F33E1]"
                            : log.action === "EDITED"
                            ? "bg-[#FEF3C7] text-[#D97706]"
                            : "bg-[#FEE2E2] text-[#DC2626]"
                        }`}
                      >
                        {log.action.replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-[#120D26]">
                        <UserOctagonIcon className="w-3.5 h-3.5 text-[#120D26]" />
                        <span>{log.actor}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-bold text-[#120D26] leading-tight">
                        {time.exact}
                      </p>
                      <p className="text-[10px] text-[#99969E]">{time.relative}</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-[#120D26]">
                      {log.action === "CREATED" && (
                        <span>Added ₹{snapshot?.amount.toLocaleString("en-IN")} to {snapshot?.category_name}</span>
                      )}
                      {log.action === "SOFT_DELETED" && (
                        <span>Deleted ₹{snapshot?.amount.toLocaleString("en-IN")} from {snapshot?.category_name}</span>
                      )}
                      {log.action === "EDITED" && (
                        <span>Modified entry for {snapshot?.category_name}</span>
                      )}
                    </p>

                    {/* FORENSIC DIFF TABLE (Catches sneaky account, category, amount, or date switches) */}
                    {log.action === "EDITED" && diffs.length > 0 && (
                      <div className="bg-[#F8F9FA] rounded-xl p-3 border border-[#F2F0F5] space-y-2">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-[#99969E]">
                          Audit Changes Detected
                        </p>
                        {diffs.map((diff, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs font-medium"
                          >
                            <span className="text-gray-500 font-semibold">{diff.field}:</span>
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-[#DC2626] line-through opacity-75">
                                {diff.old}
                              </span>
                              <ArrowRightIcon className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="text-[#120D26] font-bold">
                                {diff.new}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Deletion Context */}
                    {log.action === "SOFT_DELETED" && (
                      <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl p-2.5 text-xs text-[#DC2626] flex items-center justify-between">
                        <span>
                          <strong>Soft-deleted:</strong> ₹{snapshot?.amount.toLocaleString("en-IN")} via {snapshot?.account_name}
                        </span>
                        <TrashIcon className="w-4 h-4 text-[#DC2626] shrink-0" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER: Export Audit Proof */}
        <div className="p-4 border-t border-[#F2F0F5] bg-white shrink-0">
          <button
            onClick={() => alert("Generating Signed Partner Audit Report (PDF)...")}
            className="w-full py-3.5 rounded-2xl border border-[#EDE8FB] hover:border-[#5F33E1] bg-[#F5F2FF] text-xs font-bold text-[#5F33E1] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <ShieldTickIcon className="w-4 h-4 text-[#5F33E1]" />
            <span>Export Signed Audit Report for Partners (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
