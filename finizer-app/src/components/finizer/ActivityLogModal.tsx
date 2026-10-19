"use client";
import React from "react";
import { ShieldTickIcon } from "../icons";

interface ActivityLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: "EDITED" | "DELETED" | "CREATED";
  details: string;
  badgeColor: string;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_LOGS: ActivityLogItem[] = [
  {
    id: "log-1",
    timestamp: "Today, 03:14 PM",
    actor: "Partner Rahul",
    action: "EDITED",
    details: "Petrol expense changed from ₹500 to ₹350 (Receipt attached)",
    badgeColor: "bg-[#EDE8FB] text-[#5F33E1]",
  },
  {
    id: "log-2",
    timestamp: "Today, 11:20 AM",
    actor: "Cashier Amit",
    action: "DELETED",
    details: "Duplicate cash entry of ₹1,200 soft-deleted. Balance restored automatically.",
    badgeColor: "bg-[#FEE2E2] text-[#DC2626]",
  },
  {
    id: "log-3",
    timestamp: "Yesterday, 07:45 PM",
    actor: "Store Manager",
    action: "CREATED",
    details: "New Purchase Order PO-1049 for ₹15,00,000 created with Vendor RK Wholesalers.",
    badgeColor: "bg-[#DCFCE7] text-[#16A34A]",
  },
  {
    id: "log-4",
    timestamp: "22 Oct, 09:10 AM",
    actor: "Partner Rahul",
    action: "EDITED",
    details: "Corrected GST number to 27AABCU9603R1ZM on Stock Supplier invoice.",
    badgeColor: "bg-[#EDE8FB] text-[#5F33E1]",
  },
];

export default function ActivityLogModal({ isOpen, onClose }: ActivityLogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] p-6 shadow-2xl z-10 animate-slide-up max-h-[85vh] flex flex-col">
        {/* Drag handle */}
        <div
          onClick={onClose}
          className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 cursor-pointer hover:bg-gray-300"
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F2F0F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
              <ShieldTickIcon className="w-5 h-5 text-[#5F33E1]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#120D26]">Activity Log</h2>
              <p className="text-[11px] text-[#99969E]">Partner Trust & Audit Trail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Partner Trust Policy Notice */}
        <div className="my-4 bg-[#F5F2FF] border border-[#EDE8FB] rounded-2xl p-3.5 flex items-start gap-3">
          <span className="text-base">🔒</span>
          <div>
            <p className="text-xs font-bold text-[#5F33E1]">Permanent Immutable Record</p>
            <p className="text-[11px] text-[#5F33E1]/80 leading-relaxed mt-0.5">
              Every edit, soft-delete, or reconciliation in this store is automatically recorded with actor and timestamp. This record cannot be altered or cleared by anyone.
            </p>
          </div>
        </div>

        {/* Timeline Entries */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {SAMPLE_LOGS.map((log) => (
            <div
              key={log.id}
              className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#F2F0F5] hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${log.badgeColor}`}>
                  {log.action}
                </span>
                <span className="text-[10px] text-[#99969E] font-medium">{log.timestamp}</span>
              </div>
              <p className="text-xs font-bold text-[#120D26] mb-1">{log.actor}</p>
              <p className="text-xs text-[#524E59] leading-relaxed">{log.details}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
