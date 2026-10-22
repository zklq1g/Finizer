"use client";

import React, { useState, useEffect } from "react";
import { saveCategory, type Category } from "@/services/api";
import { CloseIcon, SpinnerIcon, ReceiptIcon } from "@/components/icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  onSuccess: () => void;
}

export default function CategorySheet({ isOpen, onClose, category, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.type === "INCOME" ? "income" : "expense");
    } else {
      setName("");
      setType("expense");
    }
    setErrorMsg(null);
  }, [category, isOpen]);

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
      setErrorMsg("Please enter a category name");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const action = category ? "update" : "create";
      await saveCategory(action, { id: category?.id, name: name.trim(), type });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save category:", err);
      setErrorMsg("Failed to save category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 h-[100dvh] bg-black/45 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Sheet Container */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl animate-slide-up flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center pt-3 pb-3 px-5 border-b border-[#F2F0F5] shrink-0 bg-white">
          <div className="w-10 h-1 bg-[#F2F0F5] rounded-full mb-2" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EDE8FB] flex items-center justify-center text-[#5F33E1]">
                <ReceiptIcon className="w-4 h-4 text-[#5F33E1]" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#99969E] uppercase">
                  Category Master
                </span>
                <h2 className="text-base font-black text-[#120D26]">
                  {category ? "Edit Category" : "New Category"}
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
        </div>

        {/* Form Body */}
        <form id="category-form" onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 font-bold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">
              Category Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm font-semibold text-[#120D26] placeholder-[#99969E] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
              placeholder="e.g., Tea & Refreshments, Packaging Boxes"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#120D26] mb-1.5">
              Financial Bucket
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "income" | "expense")}
              className="w-full px-4 py-3 rounded-2xl border border-[#F2F0F5] bg-[#F9F9FB] text-sm font-semibold text-[#120D26] focus:outline-hidden focus:border-[#5F33E1] focus:bg-white transition-colors"
            >
              <option value="expense">Expense (Operating / CapEx / Withdrawals)</option>
              <option value="income">Income (Counter Revenue / Wholesale Collections)</option>
            </select>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="p-5 pt-3 pb-8 border-t border-[#F2F0F5] bg-white shrink-0">
          <button
            type="submit"
            form="category-form"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg shadow-[#5F33E1]/25 hover:bg-[#5029C9] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="w-5 h-5 text-white animate-spin" />
                <span>Saving Category...</span>
              </>
            ) : (
              <span>{category ? "Update Category" : "Create Category"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
