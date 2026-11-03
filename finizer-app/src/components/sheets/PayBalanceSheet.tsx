"use client";

import React, { useState, useEffect } from "react";
import { CloseIcon, CheckIcon, SpinnerIcon, BanknoteIcon } from "../icons";
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";
import { formatINR } from "@/utils/format";

interface AccountItem {
  id: string;
  name: string;
  balance: number;
}


export interface PayBalanceResult {
  orderId: string;
  amountPaid: number;
  remaining: number;
  fullyPaid: boolean;
}

interface PayBalanceSheetProps {
  order: {
    id: string;
    vendorName: string;
    totalAmount: number;
    amountPaid: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: PayBalanceResult) => void;
}

export default function PayBalanceSheet({
  order,
  isOpen,
  onClose,
  onSuccess,
}: PayBalanceSheetProps) {
  const { actor } = useActor();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const remaining = order ? Math.max(0, order.totalAmount - order.amountPaid) : 0;

  // Reset on open
  useEffect(() => {
    if (isOpen && order) {
      setPaymentAmount(remaining.toString());
      setNotes("");
      setErrorMessage(null);
    }
  }, [isOpen, order, remaining]);

  // Load accounts
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
          setAccountId(mapped[0].id);
        }
      } catch {
        // use defaults
      }
    }
    loadAccounts();
  }, []);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const parsedPayment = parseFloat(paymentAmount) || 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setPaymentAmount(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (parsedPayment <= 0) { setErrorMessage("Enter a valid payment amount"); return; }
    if (parsedPayment > remaining) { setErrorMessage(`Amount cannot exceed the remaining balance of ${formatINR(remaining)}`); return; }
    if (!accountId) { setErrorMessage("Select a payment account"); return; }

    setIsSubmitting(true);
    try {
      const result = await api.payVendorBalance(
        {
          order_id: order.id,
          payment_amount: parsedPayment,
          payment_account_id: accountId,
          notes: notes.trim() || undefined,
        },
        actor
      );

      if (onSuccess) {
        onSuccess({
          orderId: order.id,
          amountPaid: parsedPayment,
          remaining: result.remaining,
          fullyPaid: result.fully_paid,
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to pay vendor balance:", err);
      const msg = err instanceof Error ? err.message : "Payment failed.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const willFullyClear = parsedPayment >= remaining && parsedPayment > 0;

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
              <BanknoteIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#7B7882] uppercase">
                Vendor Settlement
              </span>
              <h2 className="text-base font-bold text-[#120D26]">Pay Vendor Balance</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Context Card */}
          <div className="bg-[#FAF9FD] border border-[#E6E3ED] p-4 rounded-2xl">
            <p className="text-sm font-bold text-[#120D26] truncate">{order.vendorName}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-[#7B7882]">
              <span>Total Bill: <strong className="text-[#120D26]">{formatINR(order.totalAmount)}</strong></span>
              <span>·</span>
              <span>Paid: <strong className="text-emerald-700">{formatINR(order.amountPaid)}</strong></span>
            </div>
            <div className="mt-3 bg-white border border-[#E6E3ED] rounded-xl px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7B7882]">Outstanding Balance</span>
              <span className="text-base font-bold text-amber-800">{formatINR(remaining)}</span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="bg-[#FAF9FD] rounded-2xl p-4 border border-[#E6E3ED] focus-within:border-[#5F33E1] transition-all">
            <label className="block text-[11px] font-bold text-[#7B7882] uppercase tracking-wider mb-1">
              Payment Amount
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#120D26] select-none">₹</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                placeholder="0"
                value={paymentAmount}
                onChange={handleAmountChange}
                disabled={isSubmitting}
                className="w-full text-2xl font-bold bg-transparent outline-none tracking-tight text-[#120D26]"
              />
            </div>
            {remaining > 0 && parsedPayment !== remaining && (
              <button
                type="button"
                onClick={() => setPaymentAmount(remaining.toString())}
                className="mt-2 text-xs font-semibold text-[#5F33E1] hover:underline"
              >
                Set full balance ({formatINR(remaining)})
              </button>
            )}
          </div>

          {/* Paid From Account */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#120D26]">Pay From Account *</label>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  disabled={isSubmitting}
                  className={`flex flex-col items-start min-w-[125px] p-2.5 rounded-xl border transition-all shrink-0 text-left ${
                    accountId === acc.id
                      ? "border-[#5F33E1] bg-[#EDE8FB]/60 shadow-xs"
                      : "border-[#E6E3ED] bg-[#FAF9FD] hover:bg-gray-100"
                  }`}
                >
                  <span className={`text-xs font-bold truncate max-w-[110px] ${accountId === acc.id ? "text-[#5F33E1]" : "text-[#120D26]"}`}>
                    {acc.name}
                  </span>
                  <span className="text-[10px] text-[#7B7882] mt-0.5 font-medium">
                    {formatINR(acc.balance)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">Payment Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cleared balance via PhonePe"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E6E3ED] bg-[#FAF9FD] text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
            />
          </div>

          {/* Notice */}
          {parsedPayment > 0 && (
            <div className="p-3 bg-[#F5F3FA] border border-[#E8E4F3] rounded-xl text-xs text-[#555260]">
              Recorded as an expense of <strong className="text-[#120D26]">{formatINR(parsedPayment)}</strong> from{" "}
              <strong>{accounts.find((a) => a.id === accountId)?.name}</strong>
              {willFullyClear && (
                <span> · Fully settles this vendor account</span>
              )}
            </div>
          )}
        </form>

        {/* Sticky Footer */}
        <div className="p-5 pt-3 pb-8 border-t border-[#F2F0F5] bg-white shrink-0">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || parsedPayment <= 0}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#5F33E1] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-xs hover:bg-[#5029C9] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><SpinnerIcon className="w-4 h-4 animate-spin" /><span>Processing Payment...</span></>
            ) : willFullyClear ? (
              <><CheckIcon className="w-4 h-4" /><span>Clear Full Balance ({formatINR(parsedPayment)})</span></>
            ) : (
              <><CheckIcon className="w-4 h-4" /><span>Record Payment ({formatINR(parsedPayment)})</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
