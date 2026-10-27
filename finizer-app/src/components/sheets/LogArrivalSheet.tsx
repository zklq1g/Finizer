"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PackageCheckIcon,
  CloseIcon,
  CameraIcon,
  CheckIcon,
  SpinnerIcon,
  CalendarIcon,
  BanknoteIcon,
} from "../icons";
import { formatINR } from "../../utils/format";
import { api } from "@/services/api";
import { uploadReceipt } from "@/services/api";
import { useActor } from "@/context/ActorContext";

export interface LogArrivalData {
  orderId: string;
  arrivalDate: string;
  transportCharges: number;
  transportAccountId?: string;
  notes: string;
  receiptUrl?: string | null;
  isLastParcel: boolean;
  actor: string;
}

interface AccountItem {
  id: string;
  name: string;
  balance: number;
}

const DEFAULT_ACCOUNTS: AccountItem[] = [
  { id: "acc-1", name: "Main Cash Drawer", balance: 18500 },
  { id: "acc-2", name: "PhonePe UPI", balance: 42000 },
  { id: "acc-3", name: "HDFC Bank Account", balance: 150000 },
];

interface LogArrivalSheetProps {
  order: { id: string; vendorName: string; amountPaid: number } | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LogArrivalData) => Promise<void> | void;
}

export default function LogArrivalSheet({
  order,
  isOpen,
  onClose,
  onSave,
}: LogArrivalSheetProps) {
  const { actor } = useActor();
  const [arrivalDate, setArrivalDate] = useState("");
  const [transportCharges, setTransportCharges] = useState("");
  const [transportAccountId, setTransportAccountId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isLastParcel, setIsLastParcel] = useState(true);
  const [accounts, setAccounts] = useState<AccountItem[]>(DEFAULT_ACCOUNTS);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when sheet opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setArrivalDate(today);
      setTransportCharges("");
      setTransportAccountId(accounts[0]?.id || "");
      setNotes("");
      setReceiptFile(null);
      setReceiptUrl(null);
      setIsLastParcel(true);
      setErrorMessage(null);
    }
  }, [isOpen, accounts]);

  // Load accounts from API
  useEffect(() => {
    async function loadAccounts() {
      try {
        const accs = await api.getAccounts();
        if (accs && accs.length > 0) {
          const mapped = accs.map((a) => ({
            id: a.id,
            name: a.name,
            balance: Number(a.current_balance),
          }));
          setAccounts(mapped);
          setTransportAccountId(mapped[0].id);
        }
      } catch {
        // use defaults
      }
    }
    loadAccounts();
  }, []);

  // Lock background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const parsedTransport = parseFloat(transportCharges) || 0;

  const handleTransportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setTransportCharges(val);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setIsUploading(true);
    try {
      const url = await uploadReceipt(file);
      setReceiptUrl(url);
    } catch (err) {
      console.error("Failed to upload receipt:", err);
      setReceiptFile(null);
      setReceiptUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading || isSubmitting) return;
    setErrorMessage(null);

    if (!arrivalDate) {
      setErrorMessage("Please select an arrival date");
      return;
    }

    if (parsedTransport > 0 && !transportAccountId) {
      setErrorMessage("Please select which account paid for transport");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        orderId: order.id,
        arrivalDate,
        transportCharges: parsedTransport,
        transportAccountId: parsedTransport > 0 ? transportAccountId : undefined,
        notes: notes.trim(),
        receiptUrl,
        isLastParcel,
        actor,
      });

      // Reset & close
      setTransportCharges("");
      setNotes("");
      setReceiptFile(null);
      setReceiptUrl(null);
      onClose();
    } catch (err) {
      console.error("Failed to log parcel arrival:", err);
      const msg = err instanceof Error ? err.message : "Failed to log arrival.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Sheet Container */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl animate-slide-up max-h-[92%] flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F2F0F5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
              <PackageCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#99969E] uppercase">
                Parcel Arrival
              </span>
              <h2 className="text-base font-black text-[#120D26]">
                Log Arrival
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form
          id="log-arrival-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide"
        >
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Context Banner — which order */}
          <div className="bg-[#EDE8FB] border border-[#5F33E1]/20 p-4 rounded-2xl flex items-start gap-3">
            <PackageCheckIcon className="w-5 h-5 text-[#5F33E1] mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-[#5F33E1] truncate">
                {order.vendorName}
              </p>
              <p className="text-xs text-[#524E59] mt-0.5">
                Order total: <span className="font-bold text-[#120D26]">{formatINR(order.amountPaid)}</span>
              </p>
            </div>
          </div>

          {/* Arrival Date */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">
              Arrival Date *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F33E1]">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Transport Charges */}
          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#F2F0F5] focus-within:border-[#5F33E1] transition-all">
            <label className="block text-[11px] font-bold text-[#99969E] uppercase tracking-wider mb-1">
              Transport / Truck Charges
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#120D26] select-none">₹</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                placeholder="0"
                value={transportCharges}
                onChange={handleTransportChange}
                disabled={isSubmitting}
                className="w-full text-3xl font-black bg-transparent outline-none tracking-tight text-[#120D26]"
              />
            </div>
            <p className="text-[10px] text-[#99969E] mt-1 font-medium">
              Amount paid to truck driver / transporter on arrival (leave 0 if none)
            </p>
          </div>

          {/* Transport Account Selector — only show if transport > 0 */}
          {parsedTransport > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#120D26]">
                <span className="flex items-center gap-1">
                  <BanknoteIcon className="w-3.5 h-3.5 text-[#5F33E1]" />
                  Transport Paid From *
                </span>
              </label>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setTransportAccountId(acc.id)}
                    disabled={isSubmitting}
                    className={`flex flex-col items-start min-w-[115px] p-2.5 rounded-2xl border transition-all shrink-0 text-left ${
                      transportAccountId === acc.id
                        ? "border-[#5F33E1] bg-[#EDE8FB]/60 shadow-sm"
                        : "border-[#F2F0F5] bg-[#F8F9FA] hover:bg-gray-100"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold truncate max-w-[100px] ${
                        transportAccountId === acc.id ? "text-[#5F33E1]" : "text-[#120D26]"
                      }`}
                    >
                      {acc.name}
                    </span>
                    <span className="text-[10px] text-[#99969E] mt-0.5 font-medium">
                      {formatINR(acc.balance)}
                    </span>
                  </button>
                ))}
              </div>
              {/* Auto-expense notice */}
              <div className="p-2.5 bg-[#EDE8FB]/60 border border-[#5F33E1]/20 rounded-xl text-[11px] text-[#524E59]">
                ⚡ Transport expense of <strong className="text-[#5F33E1]">{formatINR(parsedTransport)}</strong>{" "}
                will be auto-recorded from{" "}
                <strong>{accounts.find((a) => a.id === transportAccountId)?.name || "selected account"}</strong>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">
              Notes / Condition (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., 2 boxes damaged, all items verified"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
            />
          </div>

          {/* Receipt / Bilty Photo */}
          <div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isSubmitting || isUploading}
              onClick={() => {
                if (receiptFile) {
                  setReceiptFile(null);
                  setReceiptUrl(null);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className={`w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border transition-all text-xs font-bold ${
                isUploading
                  ? "bg-[#EDE8FB] border-[#5F33E1]/30 text-[#5F33E1]"
                  : receiptFile
                  ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#16A34A]"
                  : "bg-[#F8F9FA] border-[#F2F0F5] text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {isUploading ? (
                <>
                  <SpinnerIcon className="w-4 h-4 text-[#5F33E1] animate-spin shrink-0" />
                  <span>Uploading Bilty to vault...</span>
                </>
              ) : receiptFile ? (
                <>
                  <CheckIcon className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>Receipt Photo Attached (Tap to remove)</span>
                </>
              ) : (
                <>
                  <CameraIcon className="w-4 h-4 shrink-0" />
                  <span>Snap Delivery Receipt / Bilty</span>
                </>
              )}
            </button>
          </div>

          {/* "This is the last parcel" checkbox */}
          <div
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
              isLastParcel
                ? "bg-[#DCFCE7] border-[#BBF7D0]"
                : "bg-[#F8F9FA] border-[#F2F0F5]"
            }`}
            onClick={() => !isSubmitting && setIsLastParcel(!isLastParcel)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  isLastParcel
                    ? "bg-[#16A34A] border-[#16A34A]"
                    : "bg-white border-[#D1D5DB]"
                }`}
              >
                {isLastParcel && <CheckIcon className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${isLastParcel ? "text-[#16A34A]" : "text-[#120D26]"}`}>
                  This is the last parcel
                </p>
                <p className="text-[10px] text-[#99969E] mt-0.5">
                  {isLastParcel
                    ? "Order will be marked as fully arrived"
                    : "Order will stay in 'Waiting' until the last parcel arrives"}
                </p>
              </div>
            </div>
          </div>

          {/* Actor Notice */}
          <div className="p-3 bg-[#F5F2FF] rounded-2xl flex items-center justify-between text-xs">
            <span className="text-[#99969E]">Logged by</span>
            <span className="font-semibold text-[#5F33E1]">{actor}</span>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="p-5 pt-3 pb-8 border-t border-[#F2F0F5] bg-white shrink-0">
          <button
            type="submit"
            form="log-arrival-form"
            onClick={handleSubmit}
            disabled={!arrivalDate || isSubmitting || isUploading}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 hover:bg-[#5029C9] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-5 h-5 animate-spin" />
                <span>Logging Arrival...</span>
              </>
            ) : (
              <>
                <PackageCheckIcon className="w-5 h-5" />
                <span>{isLastParcel ? "Confirm Final Arrival" : "Log Parcel Arrival"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
