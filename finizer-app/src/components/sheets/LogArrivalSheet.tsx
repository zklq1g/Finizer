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
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
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
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Sheet Container */}
      <div className="relative w-full max-w-md lg:max-w-lg bg-white dark:bg-[#161324] rounded-t-[32px] lg:rounded-[24px] shadow-2xl animate-slide-up lg:animate-fade-in max-h-[92%] lg:max-h-[85vh] flex flex-col z-10 overflow-hidden border border-transparent dark:border-[#28233D] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F2F0F5] dark:border-[#28233D] shrink-0 bg-white dark:bg-[#161324] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] dark:bg-emerald-950/40 flex items-center justify-center text-[#16A34A] dark:text-emerald-400">
              <PackageCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#99969E] dark:text-[#8C879B] uppercase">
                Parcel Arrival
              </span>
              <h2 className="text-base font-black text-[#120D26] dark:text-[#F4F3F8]">
                Log Arrival
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#28233D] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 transition-colors"
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
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-600 dark:text-red-400 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Context Banner — which order */}
          <div className="bg-[#EDE8FB] dark:bg-[#29204E] border border-[#5F33E1]/20 dark:border-[#7C5CE8]/30 p-4 rounded-2xl flex items-start gap-3 transition-colors">
            <PackageCheckIcon className="w-5 h-5 text-[#5F33E1] dark:text-[#9F87EF] mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-[#5F33E1] dark:text-[#9F87EF] truncate">
                {order.vendorName}
              </p>
              <p className="text-xs text-[#524E59] dark:text-[#ABA7B5] mt-0.5">
                Order total: <span className="font-bold text-[#120D26] dark:text-[#F4F3F8]">{formatINR(order.amountPaid)}</span>
              </p>
            </div>
          </div>

          {/* Arrival Date */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-1.5">
              Arrival Date *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F33E1] dark:text-[#9F87EF]">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#F2F0F5] dark:border-[#28233D] bg-[#F9F9FB] dark:bg-[#1F1B30] text-sm text-[#120D26] dark:text-[#F4F3F8] focus:outline-hidden focus:border-[#5F33E1] dark:focus:border-[#7C5CE8] focus:bg-white dark:focus:bg-[#1F1B30] transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Transport Charges */}
          <div className="bg-[#F8F9FA] dark:bg-[#1F1B30] rounded-2xl p-4 border border-[#F2F0F5] dark:border-[#28233D] focus-within:border-[#5F33E1] dark:focus-within:border-[#7C5CE8] transition-all">
            <label className="block text-[11px] font-bold text-[#99969E] dark:text-[#8C879B] uppercase tracking-wider mb-1">
              Transport / Truck Charges
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#120D26] dark:text-[#F4F3F8] select-none">₹</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                placeholder="0"
                value={transportCharges}
                onChange={handleTransportChange}
                disabled={isSubmitting}
                className="w-full text-3xl font-black bg-transparent outline-none tracking-tight text-[#120D26] dark:text-[#F4F3F8]"
              />
            </div>
            <p className="text-[10px] text-[#99969E] dark:text-[#8C879B] mt-1 font-medium">
              Amount paid to truck driver / transporter on arrival (leave 0 if none)
            </p>
          </div>

          {/* Transport Account Selector — only show if transport > 0 */}
          {parsedTransport > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#120D26] dark:text-[#F4F3F8]">
                <span className="flex items-center gap-1">
                  <BanknoteIcon className="w-3.5 h-3.5 text-[#5F33E1] dark:text-[#9F87EF]" />
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
                        ? "border-[#5F33E1] dark:border-[#7C5CE8] bg-[#EDE8FB]/60 dark:bg-[#29204E] shadow-sm"
                        : "border-[#F2F0F5] dark:border-[#28233D] bg-[#F8F9FA] dark:bg-[#1F1B30] hover:bg-gray-100 dark:hover:bg-[#28233D]"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold truncate max-w-[100px] ${
                        transportAccountId === acc.id ? "text-[#5F33E1] dark:text-[#9F87EF]" : "text-[#120D26] dark:text-[#F4F3F8]"
                      }`}
                    >
                      {acc.name}
                    </span>
                    <span className="text-[10px] text-[#99969E] dark:text-[#8C879B] mt-0.5 font-medium">
                      {formatINR(acc.balance)}
                    </span>
                  </button>
                ))}
              </div>
              {/* Auto-expense notice */}
              <div className="p-2.5 bg-[#F5F3FA] dark:bg-[#1F1B30] border border-[#E8E4F3] dark:border-[#28233D] rounded-xl text-[11px] text-[#555260] dark:text-[#ABA7B5] transition-colors">
                Transport charges of <strong className="text-[#120D26] dark:text-[#F4F3F8]">{formatINR(parsedTransport)}</strong>{" "}
                will be recorded as an expense from{" "}
                <strong className="text-[#120D26] dark:text-[#F4F3F8]">{accounts.find((a) => a.id === transportAccountId)?.name || "selected account"}</strong>.
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-1.5">
              Notes / Condition (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., 2 boxes damaged, all items verified"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] dark:border-[#28233D] bg-[#F9F9FB] dark:bg-[#1F1B30] text-sm text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] focus:outline-hidden focus:border-[#5F33E1] dark:focus:border-[#7C5CE8] focus:bg-white dark:focus:bg-[#1F1B30] transition-colors"
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
                  ? "bg-[#EDE8FB] dark:bg-[#29204E] border-[#5F33E1]/30 dark:border-[#7C5CE8]/40 text-[#5F33E1] dark:text-[#9F87EF]"
                  : receiptFile
                  ? "bg-[#DCFCE7] dark:bg-emerald-950/40 border-[#BBF7D0] dark:border-emerald-800 text-[#16A34A] dark:text-emerald-400"
                  : "bg-[#F8F9FA] dark:bg-[#1F1B30] border-[#F2F0F5] dark:border-[#28233D] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-[#3D3759] hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {isUploading ? (
                <>
                  <SpinnerIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF] animate-spin shrink-0" />
                  <span>Uploading Bilty to vault...</span>
                </>
              ) : receiptFile ? (
                <>
                  <CheckIcon className="w-4 h-4 text-[#16A34A] dark:text-emerald-400 shrink-0" />
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
                ? "bg-[#DCFCE7] dark:bg-emerald-950/30 border-[#BBF7D0] dark:border-emerald-900/50"
                : "bg-[#F8F9FA] dark:bg-[#1F1B30] border-[#F2F0F5] dark:border-[#28233D]"
            }`}
            onClick={() => !isSubmitting && setIsLastParcel(!isLastParcel)}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  isLastParcel
                    ? "bg-[#16A34A] dark:bg-emerald-500 border-[#16A34A] dark:border-emerald-500"
                    : "bg-white dark:bg-[#1F1B30] border-[#D1D5DB] dark:border-[#3D3759]"
                }`}
              >
                {isLastParcel && <CheckIcon className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${isLastParcel ? "text-[#16A34A] dark:text-emerald-400" : "text-[#120D26] dark:text-[#F4F3F8]"}`}>
                  This is the last parcel
                </p>
                <p className="text-[10px] text-[#99969E] dark:text-[#8C879B] mt-0.5">
                  {isLastParcel
                    ? "Order will be marked as fully arrived"
                    : "Order will stay in 'Waiting' until the last parcel arrives"}
                </p>
              </div>
            </div>
          </div>

          {/* Actor Notice */}
          <div className="p-3 bg-[#F5F2FF] dark:bg-[#1F1B30] border border-transparent dark:border-[#28233D] rounded-2xl flex items-center justify-between text-xs transition-colors">
            <span className="text-[#99969E] dark:text-[#8C879B]">Logged by</span>
            <span className="font-semibold text-[#5F33E1] dark:text-[#9F87EF]">{actor}</span>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="p-5 pt-3 border-t border-[#F2F0F5] dark:border-[#28233D] bg-white dark:bg-[#161324] shrink-0 transition-colors" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}>
          <button
            type="submit"
            form="log-arrival-form"
            onClick={handleSubmit}
            disabled={!arrivalDate || isSubmitting || isUploading}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] dark:bg-[#7C5CE8] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 dark:shadow-[#7C5CE8]/20 hover:bg-[#5029C9] dark:hover:bg-[#6A48D7] flex items-center justify-center gap-2"
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
