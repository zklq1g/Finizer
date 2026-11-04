"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  TruckIcon,
  BoxIcon,
  CheckIcon,
  AlertTriangleIcon,
  PhoneIcon,
  MapPinIcon,
  PackageCheckIcon,
  BanknoteIcon,
  AddIcon,
} from "../icons";
import { formatINR, calculateDeliveryAging } from "../../utils/format";
import LogArrivalSheet, { type LogArrivalData } from "../sheets/LogArrivalSheet";
import NewOrderSheet from "../sheets/NewOrderSheet";
import PayBalanceSheet, { type PayBalanceResult } from "../sheets/PayBalanceSheet";
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";

interface VendorOrder {
  id: string;
  vendorName: string;
  vendorMobile?: string | null;
  vendorLocation?: string | null;
  orderDate: string;
  expectedDeliveryDate?: string;
  totalOrderAmount: number;
  amountPaid: number;
  transportCharges: number;
  purchaseDetails?: string | null;
  arrivalDate?: string | null;
  status: "PENDING" | "PARTIAL" | "COMPLETE";
}

const getRelativeDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

const SAMPLE_ORDERS: VendorOrder[] = [
  {
    id: "po-1",
    vendorName: "Shree Ganesh Textiles",
    vendorMobile: "+91 98765 43210",
    vendorLocation: "Surat, Gujarat",
    orderDate: "15 Oct 2026",
    totalOrderAmount: 320000,
    amountPaid: 320000,
    transportCharges: 3500,
    purchaseDetails: "Cotton Kurtis 120 pcs, Rayon tops 50 pcs",
    arrivalDate: getRelativeDate(-5),
    status: "COMPLETE",
  },
  {
    id: "po-2",
    vendorName: "Apex FMCG Distributors",
    vendorMobile: "+91 87654 32109",
    vendorLocation: "Bhiwandi, Maharashtra",
    orderDate: "18 Oct 2026",
    expectedDeliveryDate: getRelativeDate(-2),
    totalOrderAmount: 185000,
    amountPaid: 100000,
    transportCharges: 2200,
    purchaseDetails: "FMCG batch — soaps, shampoo, detergent",
    status: "PARTIAL",
  },
  {
    id: "po-3",
    vendorName: "Surat Box & Packaging",
    vendorLocation: "Surat, Gujarat",
    orderDate: "22 Oct 2026",
    expectedDeliveryDate: getRelativeDate(3),
    totalOrderAmount: 42000,
    amountPaid: 42000,
    transportCharges: 0,
    status: "PENDING",
  },
];

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

export default function DeliveriesTab() {
  const { actor } = useActor();
  const [activeFilter, setActiveFilter] = useState<"Waiting" | "Due" | "Arrived">("Waiting");
  const [orders, setOrders] = useState<VendorOrder[]>(SAMPLE_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [isArrivalSheetOpen, setIsArrivalSheetOpen] = useState(false);
  const [isNewOrderSheetOpen, setIsNewOrderSheetOpen] = useState(false);
  const [isPayBalanceOpen, setIsPayBalanceOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const loadOrders = useCallback(async () => {
    try {
      const dbOrders = await api.getPurchaseOrders();
      if (dbOrders && dbOrders.length > 0) {
        const mapped: VendorOrder[] = dbOrders.map((o) => ({
          id: o.id,
          vendorName: o.vendor_name,
          vendorMobile: o.vendor_mobile,
          vendorLocation: o.vendor_location,
          orderDate: formatDate(o.created_at),
          expectedDeliveryDate: o.expected_delivery_date,
          totalOrderAmount: Number(o.total_order_amount || o.total_expected_amount),
          amountPaid: Number(o.amount_paid ?? o.total_expected_amount),
          transportCharges: Number(o.transport_charges || 0),
          purchaseDetails: o.purchase_details,
          arrivalDate: o.arrival_date,
          status: o.status,
        }));
        setOrders(mapped);
      }
    } catch (err) {
      console.warn("Could not load orders from API, keeping sample data:", err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOpenArrivalSheet = (order: VendorOrder) => {
    setSelectedOrder(order);
    setIsArrivalSheetOpen(true);
  };

  const handleOpenPayBalance = (order: VendorOrder) => {
    setSelectedOrder(order);
    setIsPayBalanceOpen(true);
  };

  const handleSaveArrival = async (data: LogArrivalData) => {
    try {
      await api.logParcelArrival(
        {
          order_id: data.orderId,
          arrival_date: data.arrivalDate,
          transport_charges: data.transportCharges,
          transport_account_id: data.transportAccountId || undefined,
          notes: data.notes,
          receipt_image_url: data.receiptUrl || undefined,
          is_last_parcel: data.isLastParcel,
        },
        data.actor || actor
      );
    } catch (err) {
      console.warn("Backend arrival log error:", err);
    }

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== data.orderId) return order;
        return {
          ...order,
          status: data.isLastParcel ? "COMPLETE" : "PARTIAL",
          arrivalDate: data.isLastParcel ? data.arrivalDate : order.arrivalDate,
          transportCharges: order.transportCharges + data.transportCharges,
        };
      })
    );

    loadOrders();
    showToast(
      data.isLastParcel
        ? `Order marked as delivered. Transport ${data.transportCharges > 0 ? formatINR(data.transportCharges) : "₹0"} recorded.`
        : `Partial parcel logged. Transport ${data.transportCharges > 0 ? formatINR(data.transportCharges) : "₹0"} recorded.`
    );
  };

  const handlePayBalanceSuccess = (result: PayBalanceResult) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== result.orderId) return order;
        return {
          ...order,
          amountPaid: order.amountPaid + result.amountPaid,
        };
      })
    );

    loadOrders();
    showToast(
      result.fullyPaid
        ? `Vendor balance cleared: ${formatINR(result.amountPaid)} recorded.`
        : `Payment of ${formatINR(result.amountPaid)} recorded. Remaining due: ${formatINR(result.remaining)}.`
    );
  };

  // Filter counts
  const waitingCount = orders.filter((o) => o.status !== "COMPLETE").length;
  const dueCount = orders.filter((o) => o.amountPaid < o.totalOrderAmount).length;
  const arrivedCount = orders.filter((o) => o.status === "COMPLETE").length;

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "Waiting") return o.status === "PENDING" || o.status === "PARTIAL";
    if (activeFilter === "Due") return o.amountPaid < o.totalOrderAmount;
    return o.status === "COMPLETE";
  });

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="lg:hidden">
          <h1 className="text-xl font-bold tracking-tight text-[#120D26] dark:text-[#F4F3F8]">Deliveries</h1>
          <p className="text-xs text-[#7B7882] dark:text-[#8C879B] font-medium">Vendor orders, payments & arrivals</p>
        </div>
        <button
          onClick={() => setIsNewOrderSheetOpen(true)}
          className="bg-[#5F33E1] hover:bg-[#5029C9] text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
        >
          <AddIcon className="w-4 h-4 text-white" />
          <span>New Order</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-xs font-medium p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 animate-fade-in flex items-center gap-2 shadow-xs">
          <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Segmented Filter Control */}
      <div className="flex bg-[#F2F0F7] dark:bg-[#161324] p-1 rounded-xl border border-[#E6E3ED] dark:border-[#28233D] text-xs transition-colors">
        <button
          onClick={() => setActiveFilter("Waiting")}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeFilter === "Waiting"
              ? "bg-white dark:bg-[#221C38] text-[#120D26] dark:text-[#F4F3F8] shadow-xs"
              : "text-[#7B7882] dark:text-[#8C879B] hover:text-[#120D26] dark:hover:text-[#F4F3F8]"
          }`}
        >
          <span>In Transit</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeFilter === "Waiting" ? "bg-[#EDE8FB] dark:bg-[#29204E] text-[#5F33E1] dark:text-[#9F87EF]" : "bg-[#E6E3ED] dark:bg-[#28233D] text-[#7B7882] dark:text-[#8C879B]"
          }`}>
            {waitingCount}
          </span>
        </button>
        <button
          onClick={() => setActiveFilter("Due")}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeFilter === "Due"
              ? "bg-white dark:bg-[#221C38] text-[#120D26] dark:text-[#F4F3F8] shadow-xs"
              : "text-[#7B7882] dark:text-[#8C879B] hover:text-[#120D26] dark:hover:text-[#F4F3F8]"
          }`}
        >
          <span>Payment Due</span>
          {dueCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeFilter === "Due" ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300" : "bg-[#E6E3ED] dark:bg-[#28233D] text-[#7B7882] dark:text-[#8C879B]"
            }`}>
              {dueCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveFilter("Arrived")}
          className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeFilter === "Arrived"
              ? "bg-white dark:bg-[#221C38] text-[#120D26] dark:text-[#F4F3F8] shadow-xs"
              : "text-[#7B7882] dark:text-[#8C879B] hover:text-[#120D26] dark:hover:text-[#F4F3F8]"
          }`}
        >
          <span>Delivered</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeFilter === "Arrived" ? "bg-[#EDE8FB] dark:bg-[#29204E] text-[#5F33E1] dark:text-[#9F87EF]" : "bg-[#E6E3ED] dark:bg-[#28233D] text-[#7B7882] dark:text-[#8C879B]"
          }`}>
            {arrivedCount}
          </span>
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#161324] rounded-2xl p-8 text-center border border-[#ECE9F1] dark:border-[#28233D] transition-colors">
          <TruckIcon className="w-8 h-8 text-[#9E9BA5] dark:text-gray-600 mx-auto mb-2.5 opacity-60" />
          <p className="text-sm font-semibold text-[#120D26] dark:text-[#F4F3F8]">
            {activeFilter === "Waiting"
              ? "No orders currently in transit"
              : activeFilter === "Due"
              ? "All vendor balances are fully settled"
              : "No delivered orders in this period"}
          </p>
          <p className="text-xs text-[#7B7882] dark:text-[#8C879B] mt-1">
            {activeFilter === "Waiting"
              ? "Use + New Order above to record a vendor purchase"
              : "Orders will automatically appear here as status updates"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filteredOrders.map((order) => {
            const isComplete = order.status === "COMPLETE";
            const isPartial = order.status === "PARTIAL";
            const aging = calculateDeliveryAging(order.expectedDeliveryDate);
            const isFullyPaid = order.amountPaid >= order.totalOrderAmount;
            const vendorDue = Math.max(0, order.totalOrderAmount - order.amountPaid);

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-[#161324] rounded-2xl p-4 border border-[#ECE9F1] dark:border-[#28233D] shadow-xs hover:border-[#D8D4E2] dark:hover:border-[#3D3759] transition-colors"
              >
                {/* Header: Vendor Name + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#120D26] dark:text-[#F4F3F8] text-sm tracking-tight truncate">
                        {order.vendorName}
                      </h3>
                      <span className={`text-[11px] font-semibold shrink-0 ${
                        isComplete
                          ? "text-[#7B7882] dark:text-[#8C879B]"
                          : isPartial
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-[#5F33E1] dark:text-[#9F87EF]"
                      }`}>
                        · {isComplete ? "Delivered" : isPartial ? "Partial" : "In Transit"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-[#7B7882] dark:text-[#8C879B]">
                      {order.vendorLocation && (
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="w-3 h-3 text-[#9E9BA5] dark:text-gray-500" />
                          <span>{order.vendorLocation}</span>
                        </span>
                      )}
                      {order.vendorMobile && (
                        <a
                          href={`tel:${order.vendorMobile.replace(/\s/g, "")}`}
                          className="flex items-center gap-1 text-[#5F33E1] dark:text-[#9F87EF] hover:underline font-medium"
                        >
                          <PhoneIcon className="w-3 h-3" />
                          <span>{order.vendorMobile}</span>
                        </a>
                      )}
                      <span>Ordered {order.orderDate}</span>
                    </div>
                  </div>

                  {/* Payment status — single subtle indicator */}
                  <span className={`text-xs font-semibold shrink-0 mt-0.5 ${
                    isFullyPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                  }`}>
                  {isFullyPaid ? <span className="flex items-center gap-0.5"><CheckIcon className="w-3 h-3" /> Paid</span> : `${formatINR(vendorDue)} due`}
                  </span>
                </div>

                {/* Overdue Alert */}
                {aging && !isComplete && aging.isOverdue && (
                  <p className="mt-2 text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangleIcon className="w-3 h-3 shrink-0" />
                    <span>{aging.label}</span>
                  </p>
                )}

                {/* Items Description */}
                {order.purchaseDetails && (
                  <div className="mt-3 text-xs text-[#4A4752] dark:text-gray-300 bg-[#F9F8FB] dark:bg-[#1F1B30] border border-[#F0EDF5] dark:border-[#28233D] rounded-xl px-3 py-2 flex items-start gap-2">
                    <BoxIcon className="w-3.5 h-3.5 text-[#7B7882] dark:text-gray-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{order.purchaseDetails}</span>
                  </div>
                )}

                {/* Financial Ledger Details */}
                <div className="mt-3 pt-3 border-t border-[#F2F0F5] dark:border-[#28233D] grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#7B7882] dark:text-[#8C879B] font-medium block">Total Bill</span>
                    <span className="font-bold text-[#120D26] dark:text-[#F4F3F8]">{formatINR(order.totalOrderAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7B7882] dark:text-[#8C879B] font-medium block">Amount Paid</span>
                    <span className="font-semibold text-emerald-700 dark:text-[#4ADE80]">{formatINR(order.amountPaid)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7B7882] dark:text-[#8C879B] font-medium block">
                      {isFullyPaid ? "Transport Freight" : "Balance Due"}
                    </span>
                    {isFullyPaid ? (
                      <span className="font-medium text-[#4A4752] dark:text-gray-300">
                        {order.transportCharges > 0 ? formatINR(order.transportCharges) : "—"}
                      </span>
                    ) : (
                      <span className="font-bold text-amber-800 dark:text-[#FBBF24]">{formatINR(vendorDue)}</span>
                    )}
                  </div>
                </div>

                {/* Delivery Date note if delivered */}
                {order.arrivalDate && (
                  <p className="mt-2 text-[11px] text-[#7B7882] dark:text-[#8C879B]">
                    Delivered on <strong className="text-[#120D26] dark:text-[#F4F3F8]">{formatDate(order.arrivalDate)}</strong>
                    {order.transportCharges > 0 && ` · Transport freight ${formatINR(order.transportCharges)}`}
                  </p>
                )}

                {/* Action Bar */}
                {(!isFullyPaid || !isComplete) && (
                  <div className="mt-3.5 pt-3 border-t border-[#F2F0F5] dark:border-[#28233D] flex gap-2">
                    {!isFullyPaid && (
                      <button
                        onClick={() => handleOpenPayBalance(order)}
                        className="flex-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60 font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-[0.99]"
                      >
                        <BanknoteIcon className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
                        <span>Pay {formatINR(vendorDue)}</span>
                      </button>
                    )}
                    {!isComplete && (
                      <button
                        onClick={() => handleOpenArrivalSheet(order)}
                        className="flex-1 bg-[#5F33E1] hover:bg-[#5029C9] text-white font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-[0.99] shadow-xs"
                      >
                        <PackageCheckIcon className="w-3.5 h-3.5" />
                        <span>Log Arrival</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sheets */}
      <LogArrivalSheet
        order={
          selectedOrder
            ? {
                id: selectedOrder.id,
                vendorName: selectedOrder.vendorName,
                amountPaid: selectedOrder.totalOrderAmount,
              }
            : null
        }
        isOpen={isArrivalSheetOpen}
        onClose={() => setIsArrivalSheetOpen(false)}
        onSave={handleSaveArrival}
      />

      <PayBalanceSheet
        order={
          selectedOrder
            ? {
                id: selectedOrder.id,
                vendorName: selectedOrder.vendorName,
                totalAmount: selectedOrder.totalOrderAmount,
                amountPaid: selectedOrder.amountPaid,
              }
            : null
        }
        isOpen={isPayBalanceOpen}
        onClose={() => setIsPayBalanceOpen(false)}
        onSuccess={handlePayBalanceSuccess}
      />

      <NewOrderSheet
        isOpen={isNewOrderSheetOpen}
        onClose={() => setIsNewOrderSheetOpen(false)}
        onSuccess={() => {
          loadOrders();
          showToast("Vendor order recorded.");
        }}
      />
    </div>
  );
}
