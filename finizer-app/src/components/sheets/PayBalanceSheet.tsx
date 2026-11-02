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

const DEFAULT_ACCOUNTS: AccountItem[] = [
  { id: "acc-1", name: "Main Cash Drawer", balance: 18500 },
  { id: "acc-2", name: "PhonePe UPI", balance: 42000 },
  { id: "acc-3", name: "HDFC Bank Account", balance: 150000 },
];

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
  const [accounts, setAccounts] = useState<AccountItem[]>(DEFAULT_ACCOUNTS);
  const [accountId, setAccountId] = useState<string>(DEFAULT_ACCOUNTS[0].id);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const remaining = order ? order.totalAmount - order.amountPaid : 0;

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

    if (parsedPayment <= 0) { setErrorMessage("Enter a valid amount"); return; }
    if (parsedPayment > remaining) { setErrorMessage(`Amount cannot exceed remaining ₹${remaining.toLocaleString("en-IN")}`); return; }
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
            <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
              <BanknoteIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#99969E] uppercase">
                Vendor Payment
              </span>
              <h2 className="text-base font-black text-[#120D26]">Pay Remaining Balance</h2>
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Context Banner */}
          <div className="bg-[#FEF3C7] border border-[#FDE68A] p-4 rounded-2xl">
            <p className="text-sm font-extrabold text-[#92400E] truncate">{order.vendorName}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-[#B45309]">
              <span>Total Bill: <strong className="text-[#92400E]">{formatINR(order.totalAmount)}</strong></span>
              <span>·</span>
              <span>Paid: <strong className="text-[#16A34A]">{formatINR(order.amountPaid)}</strong></span>
            </div>
            <div className="mt-2 bg-[#92400E]/10 rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-bold text-[#92400E]">Remaining Due</span>
              <span className="text-lg font-black text-[#92400E]">{formatINR(remaining)}</span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#F2F0F5] focus-within:border-[#D97706] transition-all">
            <label className="block text-[11px] font-bold text-[#99969E] uppercase tracking-wider mb-1">
              Amount Paying Now
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#120D26] select-none">₹</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                placeholder="0"
                value={paymentAmount}
                onChange={handleAmountChange}
                disabled={isSubmitting}
                className="w-full text-3xl font-black bg-transparent outline-none tracking-tight text-[#120D26]"
              />
            </div>
            {/* Quick fill */}
            {remaining > 0 && parsedPayment !== remaining && (
              <button
                type="button"
                onClick={() => setPaymentAmount(remaining.toString())}
                className="mt-2 text-xs font-bold text-[#D97706] hover:underline flex items-center gap-1"
              >
                ⚡ Fill full remaining ({formatINR(remaining)})
              </button>
            )}
          </div>

          {/* Paid From Account */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#120D26]">Paying From *</label>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  disabled={isSubmitting}
                  className={`flex flex-col items-start min-w-[115px] p-2.5 rounded-2xl border transition-all shrink-0 text-left ${
                    accountId === acc.id
                      ? "border-[#D97706] bg-[#FEF3C7]/60 shadow-sm"
                      : "border-[#F2F0F5] bg-[#F8F9FA] hover:bg-gray-100"
                  }`}
                >
                  <span className={`text-xs font-bold truncate max-w-[100px] ${accountId === acc.id ? "text-[#D97706]" : "text-[#120D26]"}`}>
                    {acc.name}
                  </span>
                  <span className="text-[10px] text-[#99969E] mt-0.5 font-medium">
                    {formatINR(acc.balance)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Final payment via PhonePe"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#D97706] focus:bg-white transition-colors"
            />
          </div>

          {/* Actor */}
          <div className="p-3 bg-[#F5F2FF] rounded-2xl flex items-center justify-between text-xs">
            <span className="text-[#99969E]">Logged by</span>
            <span className="font-semibold text-[#5F33E1]">{actor}</span>
          </div>

          {/* Auto-expense notice */}
          {parsedPayment > 0 && (
            <div className="p-3 bg-[#FEF3C7]/60 border border-[#D97706]/20 rounded-2xl text-xs text-[#92400E]">
              ⚡ This will auto-record an expense of{" "}
              <strong className="text-[#D97706]">{formatINR(parsedPayment)}</strong> from{" "}
              <strong>{accounts.find((a) => a.id === accountId)?.name}</strong>
              {willFullyClear && (
                <span> · <strong className="text-[#16A34A]">Vendor fully paid!</strong></span>
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
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#D97706]/25 hover:bg-[#B45309] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><SpinnerIcon className="w-5 h-5 animate-spin" /><span>Processing Payment...</span></>
            ) : willFullyClear ? (
              <><CheckIcon className="w-5 h-5" /><span>Clear Full Balance</span></>
            ) : (
              <><BanknoteIcon className="w-5 h-5" /><span>Pay {formatINR(parsedPayment)}</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
