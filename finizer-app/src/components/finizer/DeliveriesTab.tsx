"use client";
import React, { useState } from "react";
import EmptyState from "./EmptyState";
import {
  TruckIcon,
  BoxIcon,
  CardReceiveIcon,
  AlertTriangleIcon,
  TimeCircleIcon,
  CheckIcon,
} from "../icons";
import { formatINR, calculateDeliveryAging } from "../../utils/format";
import LogReceiptSheet, { LogReceiptData } from "../sheets/LogReceiptSheet";

export interface PurchaseOrder {
  id: string;
  vendorName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  expectedAmount: number;
  receivedAmount: number;
  status: "PENDING" | "PARTIAL" | "COMPLETE";
  deliveryNote: string;
  challanNumber?: string;
}

// Generate realistic date strings relative to today
const getRelativeDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

const SAMPLE_ORDERS: PurchaseOrder[] = [
  {
    id: "po-1",
    vendorName: "RK Wholesalers Ltd",
    orderDate: "15 Oct 2026",
    expectedDeliveryDate: getRelativeDate(-3), // 3 days overdue
    expectedAmount: 2000000,
    receivedAmount: 1500000,
    status: "PARTIAL",
    deliveryNote: "₹5,00,000 pending parcel in transit from Surat warehouse",
    challanNumber: "LR-88291-SRT",
  },
  {
    id: "po-2",
    vendorName: "Sunrise FMCG Distributors",
    orderDate: "12 Oct 2026",
    expectedDeliveryDate: getRelativeDate(-5),
    expectedAmount: 650000,
    receivedAmount: 650000,
    status: "COMPLETE",
    deliveryNote: "Fully delivered & verified on 19 Oct",
    challanNumber: "CH-1092-FMCG",
  },
  {
    id: "po-3",
    vendorName: "Apex Beverage Suppliers",
    orderDate: "19 Oct 2026",
    expectedDeliveryDate: getRelativeDate(2), // Expected in 2 days
    expectedAmount: 340000,
    receivedAmount: 0,
    status: "PENDING",
    deliveryNote: "Dispatched from Delhi depot. Expected in 2 days.",
  },
];

export default function DeliveriesTab() {
  const [activeFilter, setActiveFilter] = useState<"Active" | "Completed">("Active");
  const [orders, setOrders] = useState<PurchaseOrder[]>(SAMPLE_ORDERS);
  const [isDayOnePreview, setIsDayOnePreview] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isReceiptSheetOpen, setIsReceiptSheetOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleOpenReceiptSheet = (order: PurchaseOrder) => {
    setSelectedPO(order);
    setIsReceiptSheetOpen(true);
  };

  const handleSaveReceipt = (data: LogReceiptData) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== data.poId) return order;
        const newReceived = Math.min(
          order.expectedAmount,
          order.receivedAmount + data.amount
        );
        const newStatus =
          newReceived >= order.expectedAmount ? "COMPLETE" : "PARTIAL";

        const noteSnippet = data.challanNumber
          ? `Bilty #${data.challanNumber}`
          : "Parcel logged";

        return {
          ...order,
          receivedAmount: newReceived,
          status: newStatus,
          challanNumber: data.challanNumber || order.challanNumber,
          deliveryNote:
            newStatus === "COMPLETE"
              ? `Fully received & verified (${noteSnippet})`
              : `Partial parcel received (+${formatINR(data.amount)}) via ${noteSnippet}`,
        };
      })
    );

    showToast(
      `Receipt of ${formatINR(data.amount)} logged successfully. Audit record created.`
    );
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "Active") return o.status === "PENDING" || o.status === "PARTIAL";
    return o.status === "COMPLETE";
  });

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* 1. Header with Contextual Non-FAB [ + New Order ] Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#120D26]">Deliveries</h1>
          <p className="text-xs text-[#99969E] font-medium">Vendor Stock & Delayed Parcels</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Day 1 preview toggle */}
          <button
            onClick={() => setIsDayOnePreview(!isDayOnePreview)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
              isDayOnePreview
                ? "bg-[#5F33E1] text-white border-[#5F33E1]"
                : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            {isDayOnePreview ? "Viewing Day 1" : "Day 1"}
          </button>

          {/* Standard Header Button for New Purchase Order (Preserves FAB muscle memory) */}
          <button
            onClick={() => showToast("Opening New Purchase Order form...")}
            className="bg-[#5F33E1] hover:bg-[#5029C9] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1 active:scale-95"
          >
            <span>+ New Order</span>
          </button>
        </div>
      </div>

      {feedbackToast && (
        <div className="bg-[#DCFCE7] text-[#16A34A] text-xs font-bold p-3.5 rounded-2xl border border-[#BBF7D0] animate-fade-in flex items-center gap-2 shadow-sm">
          <CheckIcon className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* 2. Segmented Filter */}
      <div className="flex bg-[#F5F2FF] p-1 rounded-full border border-[#EDE8FB]">
        <button
          onClick={() => setActiveFilter("Active")}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === "Active"
              ? "bg-[#120D26] text-white shadow-sm"
              : "text-[#99969E] hover:text-[#120D26]"
          }`}
        >
          Active Deliveries
        </button>
        <button
          onClick={() => setActiveFilter("Completed")}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === "Completed"
              ? "bg-[#5F33E1] text-white shadow-sm"
              : "text-[#99969E] hover:text-[#5F33E1]"
          }`}
        >
          Completed
        </button>
      </div>

      {/* 3. Content */}
      {isDayOnePreview ? (
        <EmptyState
          icon={<TruckIcon className="w-8 h-8 text-[#5F33E1]" />}
          title="No active deliveries"
          subtitle="When you order stock from suppliers, log it here to catch missing or delayed parcels."
          cueText="Use [ + New Order ] above"
        />
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-[#F2F0F5]">
          <p className="text-sm font-bold text-[#120D26]">No {activeFilter.toLowerCase()} orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const percentage = Math.round((order.receivedAmount / order.expectedAmount) * 100);
            const isCompleted = order.status === "COMPLETE";
            const pendingAmount = order.expectedAmount - order.receivedAmount;
            const aging = calculateDeliveryAging(order.expectedDeliveryDate);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-[#F2F0F5] relative overflow-hidden"
              >
                {/* Top Row: Vendor & Status Badge */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-base font-extrabold text-[#120D26] leading-tight">
                      {order.vendorName}
                    </h3>
                    <p className="text-[11px] text-[#99969E] mt-0.5">
                      Ordered on {order.orderDate}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      isCompleted
                        ? "bg-[#DCFCE7] text-[#16A34A]"
                        : order.status === "PARTIAL"
                        ? "bg-[#FEF3C7] text-[#D97706]"
                        : "bg-[#F3F4F6] text-gray-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Aging Metric Badge (Overdue vs Expected) */}
                {!isCompleted && aging && (
                  <div className="mb-3">
                    {aging.isOverdue ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FEF2F2] border border-[#FEE2E2] text-[#DC2626]">
                        <AlertTriangleIcon className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                        <span>{aging.label}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#F0FDF4] border border-[#DCFCE7] text-[#16A34A]">
                        <TimeCircleIcon className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                        <span>{aging.label}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Bar & Amounts (Smart INR Formatter) */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#99969E] font-medium">
                      Received:{" "}
                      <strong className="text-[#120D26]">
                        {formatINR(order.receivedAmount)}
                      </strong>
                    </span>
                    <span className="font-extrabold text-[#120D26]">
                      {percentage}%
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2.5 bg-[#F2F0F5] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? "bg-[#16A34A]" : "bg-[#5F33E1]"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#99969E]">
                    <span>Expected Total: {formatINR(order.expectedAmount)}</span>
                    {!isCompleted && (
                      <span className="text-[#D97706] font-semibold">
                        Pending: {formatINR(pendingAmount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delivery Note & Challan Tag */}
                <div className="text-[11px] text-[#524E59] bg-[#F8F9FA] p-2.5 rounded-xl mb-3 flex items-start gap-2">
                  <BoxIcon className="w-4 h-4 text-[#524E59] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p>{order.deliveryNote}</p>
                    {order.challanNumber && (
                      <p className="text-[10px] text-[#99969E] font-mono mt-0.5 font-bold">
                        Bilty/LR: {order.challanNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action: 1-Tap Trigger for LogReceiptSheet */}
                {!isCompleted && (
                  <button
                    onClick={() => handleOpenReceiptSheet(order)}
                    className="w-full bg-[#EDE8FB] hover:bg-[#E1D7FA] text-[#5F33E1] font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-[0.99]"
                  >
                    <CardReceiveIcon className="w-4 h-4 text-[#5F33E1]" />
                    <span>Log Received Parcel</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 10/10 Log Receipt Bottom Sheet */}
      <LogReceiptSheet
        po={
          selectedPO
            ? {
                id: selectedPO.id,
                vendorName: selectedPO.vendorName,
                expectedAmount: selectedPO.expectedAmount,
                receivedAmount: selectedPO.receivedAmount,
              }
            : null
        }
        isOpen={isReceiptSheetOpen}
        onClose={() => setIsReceiptSheetOpen(false)}
        onSave={handleSaveReceipt}
      />
    </div>
  );
}
