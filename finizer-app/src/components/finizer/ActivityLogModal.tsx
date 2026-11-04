"use client";
import React, { useState, useEffect } from "react";
import {
  ShieldTickIcon,
  FilterIcon,
  TrashIcon,
  LockIcon,
  CloseIcon,
  AlertTriangleIcon,
  UserOctagonIcon,
  ArrowRightIcon,
  SpinnerIcon,
} from "../icons";
import { api, getAuditLog } from "@/services/api";
import { generateAuditPDF } from "@/utils/generateAuditPDF";

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

export default function ActivityLogModal({ isOpen, onClose }: ActivityLogModalProps) {
  const [filter, setFilter] = useState<"ALL" | "SUSPICIOUS">("ALL");
  const [logs, setLogs] = useState<ForensicLog[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportAuditPDF = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const entries = await getAuditLog(startStr, endStr);
      await generateAuditPDF(entries, startStr, endStr);
    } catch (err) {
      console.error("Failed to generate audit PDF:", err);
      setExportError("Failed to generate forensic audit PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Load real audit records from Supabase
  useEffect(() => {
    if (!isOpen) return;
    async function loadAuditLogs() {
      try {
        const rawLogs = await api.getAuditLogs(50);
        if (rawLogs && rawLogs.length > 0) {
          const mapped: ForensicLog[] = rawLogs.map((l) => {
            const oldObj = (l.old_data as Record<string, unknown>) || null;
            const newObj = (l.new_data as Record<string, unknown>) || null;

            return {
              id: l.id,
              action: l.action,
              timestamp: l.timestamp,
              actor: l.actor || "Store Owner",
              old_data: oldObj
                ? {
                    amount: Number(oldObj.amount || oldObj.received || 0),
                    account_name: String(oldObj.account_name || oldObj.account_id || "Account"),
                    category_name: String(oldObj.category_name || oldObj.vendor || "Category"),
                    date: oldObj.date ? String(oldObj.date) : "",
                    description: oldObj.description ? String(oldObj.description) : "",
                  }
                : null,
              new_data: newObj
                ? {
                    amount: Number(newObj.amount || newObj.received || newObj.expected_amount || 0),
                    account_name: String(newObj.account_name || newObj.account_id || "Account"),
                    category_name: String(newObj.category_name || newObj.vendor || newObj.vendor_name || "Category"),
                    date: newObj.date ? String(newObj.date) : newObj.expected_date ? String(newObj.expected_date) : "",
                    description: newObj.description ? String(newObj.description) : "",
                  }
                : null,
            };
          });
          setLogs(mapped);
        }
      } catch (err) {
        console.warn("Could not fetch remote audit logs, using simulated dataset:", err);
      }
    }
    loadAuditLogs();
  }, [isOpen]);

  if (!isOpen) return null;

  const suspiciousLogs = logs.filter(
    (log) => log.action === "EDITED" || log.action === "SOFT_DELETED"
  );
  const displayedLogs = filter === "SUSPICIOUS" ? suspiciousLogs : logs;

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
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center pointer-events-auto">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Security Drawer Container */}
      <div className="relative w-full max-w-md lg:max-w-2xl bg-white dark:bg-[#161324] rounded-t-[32px] lg:rounded-[24px] shadow-2xl animate-slide-up lg:animate-fade-in max-h-[92%] lg:max-h-[85vh] flex flex-col z-10 overflow-hidden border border-transparent dark:border-[#28233D] transition-colors">
        {/* Drag handle & Header */}
        <div className="pt-3 pb-2 px-5 shrink-0 flex flex-col items-center bg-white dark:bg-[#161324] border-b border-[#F2F0F5] dark:border-[#28233D] transition-colors">
          <div
            onClick={onClose}
            className="w-12 h-1.5 bg-gray-200 dark:bg-[#28233D] rounded-full mb-3 cursor-pointer hover:bg-gray-300 dark:hover:bg-[#3D3759] transition-colors"
          />

          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EDE8FB] dark:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
                <ShieldTickIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#120D26] dark:text-[#F4F3F8]">Partner Trust Audit</h2>
                <div className="flex items-center gap-1.5 text-[11px] text-[#16A34A] dark:text-emerald-400 font-bold">
                  <LockIcon className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400" /> Immutable Record
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#28233D] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STICKY FILTER: Signal-to-Noise Separator */}
        <div className="px-5 py-3 bg-[#F8F9FA] dark:bg-[#1F1B30] border-b border-[#F2F0F5] dark:border-[#28233D] flex items-center gap-2 shrink-0 transition-colors">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === "ALL"
                ? "bg-[#120D26] dark:bg-[#28233D] text-white shadow-sm"
                : "bg-white dark:bg-[#161324] text-[#99969E] dark:text-[#8C879B] border border-[#F2F0F5] dark:border-[#28233D] hover:text-[#120D26] dark:hover:text-[#F4F3F8]"
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5" />
            <span>All Activity ({logs.length})</span>
          </button>

          <button
            onClick={() => setFilter("SUSPICIOUS")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === "SUSPICIOUS"
                ? "bg-[#D97706] text-white shadow-sm shadow-[#D97706]/30"
                : "bg-[#FEF3C7] dark:bg-amber-950/40 text-[#92400E] dark:text-amber-400 border border-[#FDE68A] dark:border-amber-900/50 hover:bg-[#FDE68A] dark:hover:bg-amber-900/60"
            }`}
          >
            <AlertTriangleIcon className="w-3.5 h-3.5" />
            <span>Edits & Deletes</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                filter === "SUSPICIOUS" ? "bg-white/20 text-white" : "bg-[#FDE68A] dark:bg-amber-900/80 text-[#92400E] dark:text-amber-300"
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
              <p className="text-sm font-bold text-[#120D26] dark:text-[#F4F3F8]">No suspicious activity found</p>
              <p className="text-xs text-[#99969E] dark:text-[#8C879B] mt-1">All financial records remain unaltered.</p>
            </div>
          ) : (
            displayedLogs.map((log) => {
              const diffs = getDiffs(log.old_data, log.new_data);
              const time = formatTime(log.timestamp);
              const snapshot = log.action === "SOFT_DELETED" ? log.old_data : log.new_data;

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-[#161324] rounded-2xl border border-[#F2F0F5] dark:border-[#28233D] shadow-sm overflow-hidden hover:border-gray-300 dark:hover:border-[#3D3759] transition-colors"
                >
                  {/* Card Header: Actor Attribution + Timestamp */}
                  <div className="px-4 py-2.5 bg-[#F8F9FA] dark:bg-[#1F1B30] border-b border-[#F2F0F5] dark:border-[#28233D] flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          log.action === "CREATED"
                            ? "bg-[#EDE8FB] dark:bg-[#29204E] text-[#5F33E1] dark:text-[#9F87EF]"
                            : log.action === "EDITED"
                            ? "bg-[#FEF3C7] dark:bg-amber-950/40 text-[#D97706] dark:text-amber-400"
                            : "bg-[#FEE2E2] dark:bg-red-950/40 text-[#DC2626] dark:text-red-400"
                        }`}
                      >
                        {log.action.replace("_", " ")}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">
                        <UserOctagonIcon className="w-3.5 h-3.5 text-[#120D26] dark:text-[#F4F3F8]" />
                        <span>{log.actor}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-bold text-[#120D26] dark:text-[#F4F3F8] leading-tight">
                        {time.exact}
                      </p>
                      <p className="text-[10px] text-[#99969E] dark:text-[#8C879B]">{time.relative}</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8]">
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
                      <div className="bg-[#F8F9FA] dark:bg-[#1F1B30] rounded-xl p-3 border border-[#F2F0F5] dark:border-[#28233D] space-y-2 transition-colors">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-[#99969E] dark:text-[#8C879B]">
                          Audit Changes Detected
                        </p>
                        {diffs.map((diff, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs font-medium"
                          >
                            <span className="text-gray-500 dark:text-[#8C879B] font-semibold">{diff.field}:</span>
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-[#DC2626] dark:text-red-400 line-through opacity-75">
                                {diff.old}
                              </span>
                              <ArrowRightIcon className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="text-[#120D26] dark:text-[#F4F3F8] font-bold">
                                {diff.new}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Deletion Context */}
                    {log.action === "SOFT_DELETED" && (
                      <div className="bg-[#FEF2F2] dark:bg-red-950/40 border border-[#FEE2E2] dark:border-red-900/50 rounded-xl p-2.5 text-xs text-[#DC2626] dark:text-red-400 flex items-center justify-between transition-colors">
                        <span>
                          <strong>Soft-deleted:</strong> ₹{snapshot?.amount.toLocaleString("en-IN")} via {snapshot?.account_name}
                        </span>
                        <TrashIcon className="w-4 h-4 text-[#DC2626] dark:text-red-400 shrink-0" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER: Export Audit Proof */}
        <div className="p-4 border-t border-[#F2F0F5] dark:border-[#28233D] bg-white dark:bg-[#161324] shrink-0 space-y-2 transition-colors">
          {exportError && (
            <div className="p-3 bg-[#FEF2F2] dark:bg-red-950/40 border border-[#FEE2E2] dark:border-red-900/50 rounded-2xl text-xs text-[#DC2626] dark:text-red-400 font-bold">
              {exportError}
            </div>
          )}
          <button
            onClick={handleExportAuditPDF}
            disabled={isExporting}
            className="w-full py-3.5 rounded-2xl border border-[#EDE8FB] dark:border-[#28233D] hover:border-[#5F33E1] dark:hover:border-[#7C5CE8] bg-[#F5F2FF] dark:bg-[#1F1B30] text-xs font-bold text-[#5F33E1] dark:text-[#9F87EF] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <SpinnerIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF] animate-spin" />
                <span>Generating Cryptographic SHA-256 PDF...</span>
              </>
            ) : (
              <>
                <ShieldTickIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF]" />
                <span>Export Signed Audit Report for Partners (PDF)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
