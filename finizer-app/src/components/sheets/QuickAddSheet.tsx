"use client";
import React, { useState, useEffect, useRef } from "react";
import { CameraIcon, CloseIcon, CheckIcon } from "../icons";

export interface TransactionData {
  type: "EXPENSE" | "INCOME";
  amount: number;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  date: string;
  note: string;
  receiptFile: File | null;
}

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionData) => void;
}

const ACCOUNTS = [
  { id: "acc-1", name: "Cash Drawer", balance: 18500 },
  { id: "acc-2", name: "Shop UPI", balance: 42000 },
  { id: "acc-3", name: "HDFC Bank", balance: 150000 },
];

const CATEGORIES = {
  EXPENSE: [
    { id: "cat-1", name: "Tea & Snacks" },
    { id: "cat-2", name: "Petrol / Fuel" },
    { id: "cat-3", name: "Inventory Stock" },
    { id: "cat-4", name: "Staff Advance" },
    { id: "cat-5", name: "Shop Maintenance" },
  ],
  INCOME: [
    { id: "cat-6", name: "Daily Counter Sales" },
    { id: "cat-7", name: "Store UPI QR" },
    { id: "cat-8", name: "Wholesale Order" },
    { id: "cat-9", name: "Scrap / Packaging" },
  ],
};

export default function QuickAddSheet({
  isOpen,
  onClose,
  onSubmit,
}: QuickAddSheetProps) {
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [accountId, setAccountId] = useState<string>(ACCOUNTS[0].id);
  const [categoryId, setCategoryId] = useState<string>(CATEGORIES.EXPENSE[0].id);
  const [note, setNote] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const amountRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FIX #5: iOS Safari AutoFocus Micro-Delay
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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setAmount(val);
    }
  };

  const handleTypeChange = (newType: "EXPENSE" | "INCOME") => {
    setType(newType);
    // Reset to first category of selected type to avoid corrupt category mapping
    setCategoryId(CATEGORIES[newType][0].id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0 || !categoryId) return;

    const currentAcc = ACCOUNTS.find((a) => a.id === accountId) || ACCOUNTS[0];
    const currentCat = CATEGORIES[type].find((c) => c.id === categoryId) || CATEGORIES[type][0];

    onSubmit({
      amount: parsedAmount,
      type,
      accountId: currentAcc.id,
      accountName: currentAcc.name,
      categoryId: currentCat.id,
      categoryName: currentCat.name,
      date: new Date().toISOString().split("T")[0],
      note,
      receiptFile,
    });

    // Reset State
    setAmount("");
    setNote("");
    setReceiptFile(null);
    onClose();
  };

  if (!isOpen) return null;

  const activeCategories = CATEGORIES[type];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
      {/* FIX #3: 100dvh (Dynamic Viewport Height) prevents virtual keyboard collision */}
      <div
        className="fixed inset-0 h-[100dvh] bg-black/45 backdrop-blur-[2px] transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet Container: Flex column ensures header/footer stay visible while middle scrolls */}
      <div className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl animate-slide-up max-h-[100dvh] flex flex-col z-10 overflow-hidden">
        
        {/* 1. HEADER (Fixed Top) */}
        <div className="flex flex-col items-center pt-3 pb-3 px-5 border-b border-[#F2F0F5] shrink-0 bg-white">
          <div
            onClick={onClose}
            className="w-12 h-1.5 bg-gray-200 rounded-full mb-3 cursor-pointer hover:bg-gray-300 transition-colors"
          />
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#99969E] uppercase">
                Quick Action
              </span>
              <h2 className="text-lg font-black text-[#120D26]">Record Entry</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. SCROLLABLE BODY (Absorbs virtual keyboard shrink) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
          
          {/* A. MASSIVE AMOUNT INPUT */}
          <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#F2F0F5] transition-all focus-within:border-[#5F33E1]">
            <label className="block text-[11px] font-bold text-[#99969E] uppercase tracking-wider mb-1">
              Amount ({type === "EXPENSE" ? "Spent" : "Received"})
            </label>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-extrabold select-none ${
                  type === "INCOME" ? "text-[#5F33E1]" : "text-[#120D26]"
                }`}
              >
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
                className={`w-full text-4xl sm:text-5xl font-black bg-transparent outline-none tracking-tight ${
                  type === "INCOME" ? "text-[#5F33E1]" : "text-[#120D26]"
                }`}
              />
            </div>
          </div>

          {/* B. TYPE TOGGLE */}
          <div className="flex bg-[#F5F2FF] p-1.5 rounded-2xl border border-[#EDE8FB]">
            <button
              type="button"
              onClick={() => handleTypeChange("EXPENSE")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                type === "EXPENSE"
                  ? "bg-[#120D26] text-white shadow-sm"
                  : "text-[#99969E] hover:text-[#120D26]"
              }`}
            >
              − Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("INCOME")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                type === "INCOME"
                  ? "bg-[#5F33E1] text-white shadow-sm shadow-[#5F33E1]/25"
                  : "text-[#99969E] hover:text-[#5F33E1]"
              }`}
            >
              + Income
            </button>
          </div>

          {/* C. FIX #1: ACCOUNT CHIPS (1-Tap Selection + Live Balance Context) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#120D26]">
              From / To Account
            </label>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountId(acc.id)}
                  className={`flex flex-col items-start min-w-[115px] p-3 rounded-2xl border transition-all shrink-0 text-left ${
                    accountId === acc.id
                      ? "border-[#5F33E1] bg-[#EDE8FB]/60 shadow-sm"
                      : "border-[#F2F0F5] bg-[#F8F9FA] hover:bg-gray-100"
                  }`}
                >
                  <span
                    className={`text-xs font-bold truncate ${
                      accountId === acc.id ? "text-[#5F33E1]" : "text-[#120D26]"
                    }`}
                  >
                    {acc.name}
                  </span>
                  <span className="text-[10px] text-[#99969E] mt-0.5 font-medium">
                    ₹{acc.balance.toLocaleString("en-IN")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* D. FIX #2: DYNAMIC CATEGORY CHIPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#120D26]">
                Category
              </label>
              <span className="text-[10px] text-[#99969E]">
                {type === "EXPENSE" ? "Expense Buckets" : "Revenue Streams"}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {activeCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    categoryId === cat.id
                      ? "bg-[#5F33E1] text-white shadow-md shadow-[#5F33E1]/20"
                      : "bg-[#F8F9FA] text-[#120D26] border border-[#F2F0F5] hover:border-gray-300"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              <button
                type="button"
                className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap bg-[#F8F9FA] text-[#99969E] border border-dashed border-[#F2F0F5] shrink-0 hover:text-[#5F33E1]"
              >
                More +
              </button>
            </div>
          </div>

          {/* E. NOTE & FIX #4: STATEFUL CAMERA PILL (capture="environment") */}
          <div className="space-y-3 pt-1">
            <div className="bg-[#F8F9FA] rounded-2xl p-3 border border-[#F2F0F5] focus-within:border-[#5F33E1]">
              <input
                type="text"
                placeholder="Add a note (Optional, e.g., Stickers for packing)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs text-[#120D26] font-medium bg-transparent outline-none"
              />
            </div>

            {/* Hidden Native File Input with capture="environment" for rear camera */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Stateful Camera Button */}
            <button
              type="button"
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
              <CameraIcon className="w-4 h-4 shrink-0" />
              <span className="flex items-center gap-1">
                {receiptFile ? <><CheckIcon className="w-3.5 h-3.5 text-[#16A34A]" /> Receipt Added (Tap to remove)</> : <><CameraIcon className="w-3.5 h-3.5" /> Snap Receipt (Optional)</>}
              </span>
            </button>
          </div>

        </form>

        {/* 3. STICKY FOOTER (Always visible above keyboard via dvh flex architecture) */}
        <div className="p-5 pt-3 pb-8 border-t border-[#F2F0F5] bg-white shrink-0">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || !categoryId}
            className="w-full py-4 rounded-2xl text-base font-extrabold text-white bg-[#5F33E1] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform shadow-lg shadow-[#5F33E1]/25 hover:bg-[#5029C9]"
          >
            Save {type === "INCOME" ? "Income" : "Expense"} Entry
          </button>
        </div>

      </div>
    </div>
  );
}
