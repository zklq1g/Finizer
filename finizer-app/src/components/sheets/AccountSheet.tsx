"use client";

import React, { useState, useEffect } from "react";
import { saveAccount, type Account } from "@/services/api";
import { CloseIcon, SpinnerIcon, WalletIcon } from "@/components/icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  account?: Account | null; // Null for create, Object for edit
  onSuccess: () => void;
}

export default function AccountSheet({ isOpen, onClose, account, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"cash" | "bank" | "upi">("cash");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType((account.type as "cash" | "bank" | "upi") || "cash");
    } else {
      setName("");
      setType("cash");
    }
    setErrorMsg(null);
  }, [account, isOpen]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter an account name");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const action = account ? "update" : "create";
      await saveAccount(action, { id: account?.id, name: name.trim(), type });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save account:", err);
      setErrorMsg("Failed to save account. Please try again.");
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
        <div className="flex flex-col items-center pt-3 pb-3 px-5 border-b border-[#F2F0F5] dark:border-[#28233D] shrink-0 bg-white dark:bg-[#161324] transition-colors">
          <div className="w-10 h-1 bg-[#F2F0F5] dark:bg-[#28233D] rounded-full mb-2" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EDE8FB] dark:bg-[#29204E] flex items-center justify-center text-[#5F33E1] dark:text-[#9F87EF]">
                <WalletIcon className="w-4 h-4 text-[#5F33E1] dark:text-[#9F87EF]" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#99969E] dark:text-[#8C879B] uppercase">
                  Account Master
                </span>
                <h2 className="text-base font-black text-[#120D26] dark:text-[#F4F3F8]">
                  {account ? "Edit Payment Account" : "New Payment Account"}
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
        </div>

        {/* Form Body */}
        <form id="account-form" onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-600 dark:text-red-400 font-bold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-1.5">
              Account Display Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] dark:border-[#28233D] bg-[#F9F9FB] dark:bg-[#1F1B30] text-sm font-semibold text-[#120D26] dark:text-[#F4F3F8] placeholder-[#99969E] dark:placeholder-[#8C879B] focus:outline-hidden focus:border-[#5F33E1] dark:focus:border-[#7C5CE8] focus:bg-white dark:focus:bg-[#1F1B30] transition-colors"
              placeholder="e.g., Main Cash Drawer, Shop PhonePe UPI"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#120D26] dark:text-[#F4F3F8] mb-1.5">
              Account Channel / Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "cash" | "bank" | "upi")}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] dark:border-[#28233D] bg-[#F9F9FB] dark:bg-[#1F1B30] text-sm font-semibold text-[#120D26] dark:text-[#F4F3F8] focus:outline-hidden focus:border-[#5F33E1] dark:focus:border-[#7C5CE8] focus:bg-white dark:focus:bg-[#1F1B30] transition-colors"
            >
              <option value="cash" className="dark:bg-[#1F1B30] dark:text-[#F4F3F8]">Cash (Physical Counter Drawer)</option>
              <option value="bank" className="dark:bg-[#1F1B30] dark:text-[#F4F3F8]">Bank Account (Current / Savings)</option>
              <option value="upi" className="dark:bg-[#1F1B30] dark:text-[#F4F3F8]">UPI (Store Counter QR / Settlements)</option>
            </select>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="p-5 pt-3 pb-8 border-t border-[#F2F0F5] dark:border-[#28233D] bg-white dark:bg-[#161324] shrink-0 transition-colors">
          <button
            type="submit"
            form="account-form"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] dark:bg-[#7C5CE8] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 dark:shadow-[#7C5CE8]/20 hover:bg-[#5029C9] dark:hover:bg-[#6A48D7] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-5 h-5 text-white animate-spin" />
                <span>Saving Account...</span>
              </>
            ) : (
              <span>{account ? "Update Account" : "Create Account"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
