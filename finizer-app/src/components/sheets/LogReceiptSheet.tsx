"use client";
import React, { useState, useEffect, useRef } from "react";
import { TruckIcon, CloseIcon, CameraIcon, CheckIcon, SpinnerIcon } from "../icons";
import { formatINR } from "../../utils/format";

export interface LogReceiptData {
  poId: string;
  amount: number;
  challanNumber?: string;
  receiptFile: File | null;
  notes: string;
  actor: string;
}

interface PurchaseOrderSummary {
  id: string;
  vendorName: string;
  expectedAmount: number;
  receivedAmount: number;
}

interface LogReceiptSheetProps {
  po: PurchaseOrderSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LogReceiptData) => Promise<void> | void;
}

export default function LogReceiptSheet({
  po,
  isOpen,
  onClose,
  onSave,
}: LogReceiptSheetProps) {
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingAmount = po
    ? Math.max(0, po.expectedAmount - po.receivedAmount)
    : 0;

  // iOS Safari auto-focus micro-delay
  useEffect(() => {
    if (isOpen && amountRef.current) {
      const timer = setTimeout(() => {
        amountRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent background scrolling
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

  if (!isOpen || !po) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setAmount(val);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        poId: po.id,
        amount: parsedAmount,
        receiptFile,
        notes: notes.trim(),
        actor: "Owner (Main Counter)", // Attribution for forensic audit log
      });

      // Reset & Close
      setAmount("");
      setNotes("");
      setReceiptFile(null);
      onClose();
    } catch (err) {
      console.error("Failed to log goods receipt", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* 100dvh Backdrop */}
      <div
        className="fixed inset-0 h-[100dvh] bg-black/45 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Sheet Container */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl animate-slide-up max-h-[100dvh] flex flex-col z-10 overflow-hidden">
        
        {/* 1. Header (Fixed Top) */}
        <div className="flex flex-col items-center pt-3 pb-3 px-5 border-b border-[#F2F0F5] shrink-0 bg-white">
          <div
            onClick={!isSubmitting ? onClose : undefined}
            className="w-12 h-1.5 bg-gray-200 rounded-full mb-3 cursor-pointer hover:bg-gray-300 transition-colors"
          />
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#99969E] uppercase">
                Stock Verification
              </span>
              <h2 className="text-lg font-black text-[#120D26]">Receive Parcel</h2>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 disabled:opacity-50"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
          
          {/* A. Context Banner */}
          <div className="bg-[#FEF3C7] border border-[#FDE68A] p-4 rounded-2xl flex items-start gap-3">
            <TruckIcon className="w-5 h-5 text-[#92400E] mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-[#92400E] truncate">
                {po.vendorName}
              </p>
              <p className="text-xs text-[#B45309] mt-0.5">
                Expected: {formatINR(po.expectedAmount)} · Still Pending:{" "}
                <span className="font-black text-[#92400E]">{formatINR(pendingAmount)}</span>
              </p>
            </div>
          </div>

          {/* B. Amount Input */}
          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#F2F0F5] focus-within:border-[#5F33E1] transition-all">
            <label className="block text-[11px] font-bold text-[#99969E] uppercase tracking-wider mb-1">
              Amount of Stock Received Today
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#120D26] select-none">
                ₹
              </span>
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                disabled={isSubmitting}
                className="w-full text-4xl sm:text-5xl font-black bg-transparent outline-none tracking-tight text-[#120D26]"
              />
            </div>

            {/* Quick Fill Button: 1-Tap Convenience */}
            {pendingAmount > 0 && (
              <button
                type="button"
                onClick={() => setAmount(pendingAmount.toString())}
                disabled={isSubmitting}
                className="mt-2 text-xs font-bold text-[#5F33E1] hover:underline flex items-center gap-1 active:scale-95 transition-transform"
              >
                <span>⚡ Fill pending amount ({formatINR(pendingAmount)})</span>
              </button>
            )}
          </div>

          {/* C. Delivery Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#120D26]">
              Notes / Condition of Goods (Optional)
            </label>
            <div className="bg-[#F8F9FA] rounded-2xl p-3 border border-[#F2F0F5] focus-within:border-[#5F33E1] transition-all">
              <input
                type="text"
                placeholder="e.g. 2 boxes damaged, batch verified"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                className="w-full text-xs text-[#120D26] font-medium bg-transparent outline-none placeholder:text-[#99969E]"
              />
            </div>
          </div>

          {/* D. Receipt Photo Snap (capture="environment") */}
          <div className="pt-1">
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
              disabled={isSubmitting}
              onClick={() => {
                if (receiptFile) {
                  setReceiptFile(null);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className={`w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border transition-all text-xs font-bold ${
                receiptFile
                  ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#16A34A]"
                  : "bg-[#F8F9FA] border-[#F2F0F5] text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {receiptFile ? (
                <>
                  <CheckIcon className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>Receipt Photo Attached (Tap to remove)</span>
                </>
              ) : (
                <>
                  <CameraIcon className="w-4 h-4 shrink-0" />
                  <span>Snap Delivery Receipt / Photo</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 3. Sticky Footer with Submit Lock */}
        <div className="p-5 pt-3 pb-8 border-t border-[#F2F0F5] bg-white shrink-0">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 hover:bg-[#5029C9] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-5 h-5 text-white" />
                <span>Saving Receipt & Updating Stock...</span>
              </>
            ) : (
              <span>Confirm Goods Receipt</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
