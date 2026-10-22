"use client";

import React, { useState, useEffect, useRef } from "react";
import { TruckIcon, CloseIcon, CheckIcon, SpinnerIcon, CalendarIcon } from "../icons";
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";

interface NewOrderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewOrderSheet({
  isOpen,
  onClose,
  onSuccess,
}: NewOrderSheetProps) {
  const { actor } = useActor();
  const [vendorName, setVendorName] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const vendorInputRef = useRef<HTMLInputElement>(null);

  // Set default expected date to today + 3 days
  useEffect(() => {
    if (isOpen) {
      const target = new Date();
      target.setDate(target.getDate() + 3);
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, "0");
      const dd = String(target.getDate()).padStart(2, "0");
      setExpectedDate(`${yyyy}-${mm}-${dd}`);
      setVendorName("");
      setExpectedAmount("");
      setErrorMessage(null);

      const timer = setTimeout(() => {
        vendorInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock background scroll when open
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

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanVendor = vendorName.trim();
    const parsedAmount = parseFloat(expectedAmount);

    if (!cleanVendor) {
      setErrorMessage("Please enter vendor name");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Please enter a valid order amount");
      return;
    }
    if (!expectedDate) {
      setErrorMessage("Please select an expected delivery date");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createPurchaseOrder(
        {
          vendor_name: cleanVendor,
          expected_amount: parsedAmount,
          expected_date: expectedDate,
        },
        actor
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to create order:", err);
      const msg = err instanceof Error ? err.message : "Failed to record purchase order.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F2F0F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#120D26]">New Purchase Order</h2>
              <p className="text-xs text-[#99969E]">Track incoming inventory shipment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-[#99969E] hover:text-[#120D26] hover:bg-[#F5F2FF] rounded-full transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Vendor Name */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">
              Vendor / Supplier Name
            </label>
            <input
              ref={vendorInputRef}
              type="text"
              placeholder="e.g. Surat Wholesale Sarees"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
              required
            />
          </div>

          {/* Expected Amount */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">
              Expected Order Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#99969E]">
                ₹
              </span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="0.00"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm font-semibold text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
                required
              />
            </div>
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">
              Expected Arrival Date
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F33E1]">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <input
                type="date"
                min={todayStr}
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
                required
              />
            </div>
          </div>

          {/* Actor Notice */}
          <div className="p-3 bg-[#F5F2FF] rounded-2xl flex items-center justify-between text-xs">
            <span className="text-[#99969E]">Logged by</span>
            <span className="font-semibold text-[#5F33E1]">{actor}</span>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#5F33E1] hover:bg-[#4E29BA] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#5F33E1]/25 disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon className="w-5 h-5 animate-spin" />
                  <span>Saving Order...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  <span>Create Purchase Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
