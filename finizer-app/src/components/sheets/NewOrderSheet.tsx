"use client";

import React, { useState, useEffect, useRef } from "react";
import { TruckIcon, CloseIcon, CheckIcon, SpinnerIcon, CalendarIcon, PhoneIcon, MapPinIcon } from "../icons";
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";
import { formatINR } from "@/utils/format";

interface AccountItem {
  id: string;
  name: string;
  balance: number;
}

interface NewOrderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewOrderSheet({ isOpen, onClose, onSuccess }: NewOrderSheetProps) {
  const { actor } = useActor();
  const [vendorName, setVendorName] = useState("");
  const [vendorMobile, setVendorMobile] = useState("");
  const [vendorLocation, setVendorLocation] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [purchaseDetails, setPurchaseDetails] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment split state
  const [paymentMode, setPaymentMode] = useState<"full" | "advance">("full");
  const [advanceAmount, setAdvanceAmount] = useState("");

  const vendorInputRef = useRef<HTMLInputElement>(null);

  // Load accounts + reset form when sheet opens
  useEffect(() => {
    if (isOpen) {
      const target = new Date();
      target.setDate(target.getDate() + 5);
      setExpectedDate(target.toISOString().split("T")[0]);
      setVendorName("");
      setVendorMobile("");
      setVendorLocation("");
      setTotalAmount("");
      setAdvanceAmount("");
      setPurchaseDetails("");
      setPaymentMode("full");
      setErrorMessage(null);

      const timer = setTimeout(() => vendorInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const accs = await api.getAccounts();
        if (accs && accs.length > 0) {
          const mapped = accs.map((a) => ({ id: a.id, name: a.name, balance: Number(a.current_balance) }));
          setAccounts(mapped);
          setAccountId(mapped[0].id);
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
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedAdvance = parseFloat(advanceAmount) || 0;
  const effectivePayment = paymentMode === "full" ? parsedTotal : parsedAdvance;
  const remainingDue = paymentMode === "advance" ? Math.max(0, parsedTotal - parsedAdvance) : 0;
  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];

  const handleAmountChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setter(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!vendorName.trim()) { setErrorMessage("Please enter vendor name"); return; }
    if (parsedTotal <= 0) { setErrorMessage("Please enter the total order amount"); return; }
    if (paymentMode === "advance" && parsedAdvance <= 0) { setErrorMessage("Please enter the advance amount"); return; }
    if (paymentMode === "advance" && parsedAdvance > parsedTotal) { setErrorMessage("Advance payment cannot exceed the total order amount"); return; }
    if (effectivePayment > 0 && !accountId) { setErrorMessage("Please select a payment account"); return; }

    try {
      setIsSubmitting(true);
      await api.createVendorOrder(
        {
          vendor_name: vendorName.trim(),
          vendor_mobile: vendorMobile.trim() || undefined,
          vendor_location: vendorLocation.trim() || undefined,
          total_order_amount: parsedTotal,
          amount_paid: effectivePayment,
          payment_account_id: accountId,
          purchase_details: purchaseDetails.trim() || undefined,
          expected_date: expectedDate || undefined,
        },
        actor
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Failed to create vendor order:", err);
      const msg = err instanceof Error ? err.message : "Failed to record vendor order.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center pointer-events-auto">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={!isSubmitting ? onClose : undefined}
      />

      <div className="relative w-full max-w-md lg:max-w-lg bg-white dark:bg-[#161324] rounded-t-[32px] lg:rounded-[24px] shadow-2xl animate-slide-up lg:animate-fade-in max-h-[92%] lg:max-h-[85vh] flex flex-col z-10 overflow-hidden border border-transparent dark:border-[#28233D] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F2F0F5] dark:border-[#28233D] shrink-0 bg-white dark:bg-[#161324] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDE8FB] dark:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#99969E] dark:text-[#8C879B] uppercase">Vendor Purchase</span>
              <h2 className="text-base font-bold text-[#120D26] dark:text-[#F4F3F8]">New Vendor Order</h2>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-700 dark:text-red-400 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Vendor Name */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-1.5">Vendor / Supplier Name *</label>
            <input
              ref={vendorInputRef}
              type="text"
              placeholder="e.g. Shree Ganesh Textiles"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-xl border border-[#E6E3ED] dark:border-[#28233D] bg-[#FAF9FD] dark:bg-[#1F1B30] text-sm text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] focus:outline-hidden focus:border-[#5F33E1] dark:focus:border-[#7C5CE8] focus:bg-white dark:focus:bg-[#1F1B30] transition-colors"
              required
            />
          </div>

          {/* Mobile + Location row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-1.5">
                <span className="flex items-center gap-1"><PhoneIcon className="w-3 h-3 text-[#5F33E1] dark:text-[#9F87EF]" /> Mobile Number</span>
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={vendorMobile}
                onChange={(e) => setVendorMobile(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E6E3ED] dark:border-[#28233D] bg-[#FAF9FD] dark:bg-[#1F1B30] text-sm text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] focus:outline-hidden focus:border-[#5F33E1] dark:focus:border-[#7C5CE8] focus:bg-white dark:focus:bg-[#1F1B30] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-1.5">
                <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3 text-[#5F33E1] dark:text-[#9F87EF]" /> City / Market</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Surat, Gujarat"
                value={vendorLocation}
                onChange={(e) => setVendorLocation(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E6E3ED] dark:border-[#28233D] bg-[#FAF9FD] dark:bg-[#1F1B30] text-sm text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] focus:outline-hidden focus:border-[#5F33E1] dark:focus:border-[#7C5CE8] focus:bg-white dark:focus:bg-[#1F1B30] transition-colors"
              />
            </div>
          </div>

          {/* Total Order Amount */}
          <div className="bg-[#FAF9FD] dark:bg-[#1F1B30] rounded-2xl p-4 border border-[#E6E3ED] dark:border-[#28233D] focus-within:border-[#5F33E1] dark:focus-within:border-[#7C5CE8] transition-all">
            <label className="block text-[11px] font-bold text-[#7B7882] dark:text-[#8C879B] uppercase tracking-wider mb-1">
              Total Order Amount (Full Bill) *
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#120D26] dark:text-[#F4F3F8] select-none">₹</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                placeholder="0"
                value={totalAmount}
                onChange={handleAmountChange(setTotalAmount)}
                disabled={isSubmitting}
                className="w-full text-3xl font-bold bg-transparent outline-none tracking-tight text-[#120D26] dark:text-[#F4F3F8]"
              />
            </div>
          </div>

          {/* Payment Mode Segmented Control */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8]">Payment Method *</label>
            <div className="flex bg-[#F2F0F7] dark:bg-[#1F1B30] p-1 rounded-xl border border-[#E6E3ED] dark:border-[#28233D] text-xs transition-colors">
              <button
                type="button"
                onClick={() => setPaymentMode("full")}
                disabled={isSubmitting}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                  paymentMode === "full"
                    ? "bg-white dark:bg-[#28233D] text-[#120D26] dark:text-[#F4F3F8] shadow-xs"
                    : "text-[#7B7882] dark:text-[#8C879B] hover:text-[#120D26] dark:hover:text-[#F4F3F8]"
                }`}
              >
                Full Payment (100%)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("advance")}
                disabled={isSubmitting}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                  paymentMode === "advance"
                    ? "bg-white dark:bg-[#28233D] text-[#120D26] dark:text-[#F4F3F8] shadow-xs"
                    : "text-[#7B7882] dark:text-[#8C879B] hover:text-[#120D26] dark:hover:text-[#F4F3F8]"
                }`}
              >
                Advance Payment
              </button>
            </div>
          </div>

          {/* Advance Amount (only if advance mode) */}
          {paymentMode === "advance" && (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-200/80 dark:border-amber-900/50 focus-within:border-amber-400 dark:focus-within:border-amber-500 transition-all">
              <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                Advance Paid Today *
              </label>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-900 dark:text-amber-300 select-none">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  placeholder="0"
                  value={advanceAmount}
                  onChange={handleAmountChange(setAdvanceAmount)}
                  disabled={isSubmitting}
                  autoFocus
                  className="w-full text-2xl font-bold bg-transparent outline-none tracking-tight text-amber-950 dark:text-amber-100"
                />
              </div>
              {parsedTotal > 0 && parsedAdvance > 0 && parsedAdvance <= parsedTotal && (
                <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-2 font-medium">
                  Remaining balance of <strong>{formatINR(remainingDue)}</strong> will be tracked as outstanding due.
                </p>
              )}
            </div>
          )}

          {/* Paid From Account */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8]">Paid From Account *</label>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  disabled={isSubmitting}
                  className={`flex flex-col items-start min-w-[125px] p-2.5 rounded-xl border transition-all shrink-0 text-left ${
                    accountId === acc.id
                      ? "border-[#5F33E1] dark:border-[#7C5CE8] bg-[#EDE8FB]/60 dark:bg-[#29204E] shadow-xs"
                      : "border-[#E6E3ED] dark:border-[#28233D] bg-[#FAF9FD] dark:bg-[#1F1B30] hover:bg-gray-100 dark:hover:bg-[#28233D]"
                  }`}
                >
                  <span className={`text-xs font-bold truncate max-w-[110px] ${accountId === acc.id ? "text-[#5F33E1] dark:text-[#9F87EF]" : "text-[#120D26] dark:text-[#F4F3F8]"}`}>
                    {acc.name}
                  </span>
                  <span className="text-[10px] text-[#7B7882] dark:text-[#8C879B] mt-0.5 font-medium">
                    {formatINR(acc.balance)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Details */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-1.5">Goods / Item Details (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cotton Kurtis 120 pcs, Rayon tops 50 pcs"
              value={purchaseDetails}
              onChange={(e) => setPurchaseDetails(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-xl border border-[#E6E3ED] dark:border-[#28233D] bg-[#FAF9FD] dark:bg-[#1F1B30] text-sm text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] focus:outline-hidden focus:border-[#5F33E1] dark:focus:border-[#7C5CE8] focus:bg-white dark:focus:bg-[#1F1B30] transition-colors"
            />
          </div>

          {/* Expected Arrival Date */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-1.5">Expected Delivery Date</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7B7882] dark:text-[#8C879B]">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[#E6E3ED] dark:border-[#28233D] bg-[#FAF9FD] dark:bg-[#1F1B30] text-sm text-[#120D26] dark:text-[#F4F3F8] focus:outline-hidden focus:border-[#5F33E1] dark:focus:border-[#7C5CE8] focus:bg-white dark:focus:bg-[#1F1B30] transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Logged by */}
          <div className="p-2.5 bg-[#FAF9FD] dark:bg-[#1F1B30] border border-transparent dark:border-[#28233D] rounded-xl flex items-center justify-between text-xs text-[#7B7882] dark:text-[#8C879B] transition-colors">
            <span>Recorded by</span>
            <span className="font-semibold text-[#120D26] dark:text-[#F4F3F8]">{actor}</span>
          </div>

          {/* Auto-expense statement */}
          {effectivePayment > 0 && (
            <div className="p-3 rounded-xl text-xs bg-[#F5F3FA] dark:bg-[#1F1B30] border border-[#E8E4F3] dark:border-[#28233D] text-[#555260] dark:text-[#ABA7B5] transition-colors">
              Recorded as an inventory expense of <strong className="text-[#120D26] dark:text-[#F4F3F8]">{formatINR(effectivePayment)}</strong> from <strong className="text-[#120D26] dark:text-[#F4F3F8]">{selectedAccount?.name}</strong>
              {paymentMode === "advance" && remainingDue > 0 && (
                <span> · <strong className="text-amber-800 dark:text-amber-400">{formatINR(remainingDue)}</strong> balance remaining</span>
              )}
            </div>
          )}
        </form>

        {/* Sticky Footer */}
        <div className="p-5 pt-3 border-t border-[#F2F0F5] dark:border-[#28233D] bg-white dark:bg-[#161324] shrink-0 transition-colors" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !vendorName.trim() || parsedTotal <= 0 || (paymentMode === "advance" && parsedAdvance <= 0)}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#5F33E1] dark:bg-[#7C5CE8] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-xs hover:bg-[#5029C9] dark:hover:bg-[#6A48D7] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><SpinnerIcon className="w-4 h-4 animate-spin" /><span>Recording Order...</span></>
            ) : (
              <><CheckIcon className="w-4 h-4" /><span>Record Order & Payment</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
