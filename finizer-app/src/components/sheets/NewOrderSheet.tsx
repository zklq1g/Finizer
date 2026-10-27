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

const DEFAULT_ACCOUNTS: AccountItem[] = [
  { id: "acc-1", name: "Main Cash Drawer", balance: 18500 },
  { id: "acc-2", name: "PhonePe UPI", balance: 42000 },
  { id: "acc-3", name: "HDFC Bank Account", balance: 150000 },
];

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
  const [amountPaid, setAmountPaid] = useState("");
  const [purchaseDetails, setPurchaseDetails] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [accounts, setAccounts] = useState<AccountItem[]>(DEFAULT_ACCOUNTS);
  const [accountId, setAccountId] = useState<string>(DEFAULT_ACCOUNTS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const vendorInputRef = useRef<HTMLInputElement>(null);

  // Load accounts + set defaults when sheet opens
  useEffect(() => {
    if (isOpen) {
      const target = new Date();
      target.setDate(target.getDate() + 5);
      setExpectedDate(target.toISOString().split("T")[0]);
      setVendorName("");
      setVendorMobile("");
      setVendorLocation("");
      setAmountPaid("");
      setPurchaseDetails("");
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

  const parsedAmount = parseFloat(amountPaid) || 0;
  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setAmountPaid(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!vendorName.trim()) { setErrorMessage("Please enter vendor name"); return; }
    if (parsedAmount <= 0) { setErrorMessage("Please enter a valid amount"); return; }
    if (!accountId) { setErrorMessage("Please select a payment account"); return; }

    try {
      setIsSubmitting(true);
      await api.createVendorOrder(
        {
          vendor_name: vendorName.trim(),
          vendor_mobile: vendorMobile.trim() || undefined,
          vendor_location: vendorLocation.trim() || undefined,
          amount_paid: parsedAmount,
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
    <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-auto">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={!isSubmitting ? onClose : undefined}
      />

      <div className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl animate-slide-up max-h-[92%] flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#F2F0F5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#99969E] uppercase">Vendor Purchase</span>
              <h2 className="text-base font-black text-[#120D26]">New Vendor Order</h2>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Vendor Name */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">Vendor / Supplier Name *</label>
            <input
              ref={vendorInputRef}
              type="text"
              placeholder="e.g., RK Wholesalers"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
              required
            />
          </div>

          {/* Mobile + Location row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#120D26] mb-1.5">
                <span className="flex items-center gap-1"><PhoneIcon className="w-3 h-3 text-[#5F33E1]" /> Mobile</span>
              </label>
              <input
                type="tel"
                placeholder="+91 98765..."
                value={vendorMobile}
                onChange={(e) => setVendorMobile(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#120D26] mb-1.5">
                <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3 text-[#5F33E1]" /> Location</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Surat"
                value={vendorLocation}
                onChange={(e) => setVendorLocation(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Amount Paid */}
          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#F2F0F5] focus-within:border-[#5F33E1] transition-all">
            <label className="block text-[11px] font-bold text-[#99969E] uppercase tracking-wider mb-1">Amount Paid to Vendor *</label>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#120D26] select-none">₹</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                placeholder="0.00"
                value={amountPaid}
                onChange={handleAmountChange}
                disabled={isSubmitting}
                className="w-full text-4xl sm:text-5xl font-black bg-transparent outline-none tracking-tight text-[#120D26]"
              />
            </div>
          </div>

          {/* Paid From Account */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#120D26]">Paid From Account *</label>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  disabled={isSubmitting}
                  className={`flex flex-col items-start min-w-[125px] p-3 rounded-2xl border transition-all shrink-0 text-left ${
                    accountId === acc.id
                      ? "border-[#5F33E1] bg-[#EDE8FB]/60 shadow-sm"
                      : "border-[#F2F0F5] bg-[#F8F9FA] hover:bg-gray-100"
                  }`}
                >
                  <span className={`text-xs font-bold truncate max-w-[110px] ${accountId === acc.id ? "text-[#5F33E1]" : "text-[#120D26]"}`}>
                    {acc.name}
                  </span>
                  <span className="text-[10px] text-[#99969E] mt-0.5 font-medium">
                    {formatINR(acc.balance)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Details */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">What was ordered? (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Almonds 120kg, Cashews 85kg"
              value={purchaseDetails}
              onChange={(e) => setPurchaseDetails(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
            />
          </div>

          {/* Expected Arrival Date */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">Expected Arrival Date</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F33E1]">
                <CalendarIcon className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Actor Notice */}
          <div className="p-3 bg-[#F5F2FF] rounded-2xl flex items-center justify-between text-xs">
            <span className="text-[#99969E]">Logged by</span>
            <span className="font-semibold text-[#5F33E1]">{actor}</span>
          </div>

          {/* Auto-expense notice */}
          {parsedAmount > 0 && (
            <div className="p-3 bg-[#EDE8FB]/60 border border-[#5F33E1]/20 rounded-2xl text-xs text-[#524E59]">
              ⚡ This will auto-record an expense of <strong className="text-[#5F33E1]">{formatINR(parsedAmount)}</strong> from <strong>{selectedAccount?.name}</strong>
            </div>
          )}
        </form>

        {/* Sticky Footer */}
        <div className="p-5 pt-3 pb-8 border-t border-[#F2F0F5] bg-white shrink-0">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !vendorName.trim() || parsedAmount <= 0}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 hover:bg-[#5029C9] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><SpinnerIcon className="w-5 h-5 animate-spin" /><span>Creating Order...</span></>
            ) : (
              <><CheckIcon className="w-5 h-5" /><span>Create Order & Log Payment</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
