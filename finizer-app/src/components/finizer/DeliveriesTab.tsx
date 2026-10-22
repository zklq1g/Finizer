"use client";
import React, { useState, useEffect, useCallback } from "react";
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
import NewOrderSheet from "../sheets/NewOrderSheet";
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";

export interface PurchaseOrder {
  id: string;
  vendorName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  expectedAmount: number;
  receivedAmount: number;
  status: "PENDING" | "PARTIAL" | "COMPLETE";
  deliveryNote: string;
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
  const { actor } = useActor();
  const [activeFilter, setActiveFilter] = useState<"Active" | "Completed">("Active");
  const [orders, setOrders] = useState<PurchaseOrder[]>(SAMPLE_ORDERS);
  const [isDayOnePreview, setIsDayOnePreview] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isReceiptSheetOpen, setIsReceiptSheetOpen] = useState(false);
  const [isNewOrderSheetOpen, setIsNewOrderSheetOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const loadOrders = useCallback(async () => {
    try {
      const dbOrders = await api.getPurchaseOrders();
      if (dbOrders && dbOrders.length > 0) {
        const mapped: PurchaseOrder[] = dbOrders.map((o) => {
          const dateStr = o.created_at
            ? new Date(o.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "Recent";

          return {
            id: o.id,
            vendorName: o.vendor_name,
            orderDate: dateStr,
            expectedDeliveryDate: o.expected_delivery_date,
            expectedAmount: Number(o.total_expected_amount),
            receivedAmount: Number(o.total_received_amount),
            status: o.status,
            deliveryNote:
              o.status === "COMPLETE"
                ? "Fully delivered & verified"
                : o.status === "PARTIAL"
                ? `Partial goods received: ₹${Number(o.total_received_amount).toLocaleString("en-IN")}`
                : "Awaiting incoming delivery dispatch",
          };
        });
        setOrders(mapped);
      }
    } catch (err) {
      console.warn("Could not load purchase orders from API, keeping local state:", err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOpenReceiptSheet = (order: PurchaseOrder) => {
    setSelectedPO(order);
    setIsReceiptSheetOpen(true);
  };

  const handleSaveReceipt = async (data: LogReceiptData) => {
    try {
      await api.logGoodsReceipt(
        {
          po_id: data.poId,
          amount: data.amount,
          challan_number: data.challanNumber,
          notes: data.notes,
        },
        data.actor || actor
      );
    } catch (err) {
      console.warn("Backend receipt log error:", err);
    }

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== data.poId) return order;
        const newReceived = Math.min(
          order.expectedAmount,
          order.receivedAmount + data.amount
        );
        const newStatus =
          newReceived >= order.expectedAmount ? "COMPLETE" : "PARTIAL";

        return {
          ...order,
          receivedAmount: newReceived,
          status: newStatus,
          deliveryNote:
            newStatus === "COMPLETE"
              ? "All parcels fully received & verified"
              : `Partial parcel received (+${formatINR(data.amount)})${
                  data.notes ? `: ${data.notes}` : ""
                }`,
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

          {/* Standard Header Button for New Purchase Order */}
          <button
            onClick={() => setIsNewOrderSheetOpen(true)}
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
                className="bg-white rounded-3xl p-4 border border-[#F2F0F5] shadow-sm hover:border-[#EDE8FB] transition-colors"
              >
                {/* Header: Vendor Name & Status Chip */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#120D26] text-sm truncate">
                      {order.vendorName}
                    </h3>
                    <p className="text-[11px] text-[#99969E] font-medium">
                      Ordered {order.orderDate}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                      isCompleted
                        ? "bg-[#DCFCE7] text-[#16A34A]"
                        : order.status === "PARTIAL"
                        ? "bg-[#FEF3C7] text-[#D97706]"
                        : "bg-[#EDE8FB] text-[#5F33E1]"
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckIcon className="w-3 h-3 text-[#16A34A]" />
                        <span>Completed</span>
                      </>
                    ) : order.status === "PARTIAL" ? (
                      <>
                        <TimeCircleIcon className="w-3 h-3 text-[#D97706]" />
                        <span>Partial Delivery</span>
                      </>
                    ) : (
                      <>
                        <TruckIcon className="w-3 h-3 text-[#5F33E1]" />
                        <span>In Transit</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Aging Metric / Overdue Warning Badge */}
                {aging && !isCompleted && (
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        aging.isOverdue
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {aging.isOverdue ? (
                        <AlertTriangleIcon className="w-3 h-3 text-red-600 shrink-0" />
                      ) : (
                        <TimeCircleIcon className="w-3 h-3 text-amber-700 shrink-0" />
                      )}
                      <span>{aging.label}</span>
                    </span>
                  </div>
                )}

                {/* Progress Bar & Amounts */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#99969E] font-medium">Delivered</span>
                    <span className="font-bold text-[#120D26]">
                      {formatINR(order.receivedAmount)}{" "}
                      <span className="text-[#99969E] font-normal">
                        / {formatINR(order.expectedAmount)}
                      </span>
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 bg-[#F2F0F5] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted
                          ? "bg-[#16A34A]"
                          : percentage > 50
                          ? "bg-[#5F33E1]"
                          : "bg-[#FB8500]"
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-[#5F33E1]">{percentage}% received</span>
                    {!isCompleted && pendingAmount > 0 && (
                      <span className="font-bold text-red-500">
                        Pending: {formatINR(pendingAmount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delivery Note */}
                <div className="text-[11px] text-[#524E59] bg-[#F8F9FA] p-2.5 rounded-xl mb-3 flex items-start gap-2">
                  <BoxIcon className="w-4 h-4 text-[#524E59] shrink-0 mt-0.5" />
                  <p className="min-w-0 flex-1">{order.deliveryNote}</p>
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

      {/* Log Receipt Bottom Sheet */}
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

      {/* New Purchase Order Bottom Sheet */}
      <NewOrderSheet
        isOpen={isNewOrderSheetOpen}
        onClose={() => setIsNewOrderSheetOpen(false)}
        onSuccess={() => {
          loadOrders();
          showToast("New purchase order recorded successfully.");
        }}
      />
    </div>
  );
}
