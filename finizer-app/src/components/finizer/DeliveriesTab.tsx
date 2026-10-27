"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  TruckIcon,
  BoxIcon,
  CheckIcon,
  AlertTriangleIcon,
  TimeCircleIcon,
  PhoneIcon,
  MapPinIcon,
  PackageCheckIcon,
} from "../icons";
import { formatINR, calculateDeliveryAging } from "../../utils/format";
import LogArrivalSheet, { type LogArrivalData } from "../sheets/LogArrivalSheet";
import NewOrderSheet from "../sheets/NewOrderSheet";
import { api } from "@/services/api";
import { useActor } from "@/context/ActorContext";

interface VendorOrder {
  id: string;
  vendorName: string;
  vendorMobile?: string | null;
  vendorLocation?: string | null;
  orderDate: string;
  expectedDeliveryDate?: string;
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
    vendorName: "RK Dryfruit Wholesalers",
    vendorMobile: "+91 98765 43210",
    vendorLocation: "Khari Baoli, Delhi",
    orderDate: "15 Oct 2026",
    amountPaid: 320000,
    transportCharges: 3500,
    purchaseDetails: "Almonds 120kg, Cashews 85kg, Walnuts 50kg",
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
    amountPaid: 185000,
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
  const [activeFilter, setActiveFilter] = useState<"Waiting" | "Arrived">("Waiting");
  const [orders, setOrders] = useState<VendorOrder[]>(SAMPLE_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [isArrivalSheetOpen, setIsArrivalSheetOpen] = useState(false);
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
        const mapped: VendorOrder[] = dbOrders.map((o) => ({
          id: o.id,
          vendorName: o.vendor_name,
          vendorMobile: o.vendor_mobile,
          vendorLocation: o.vendor_location,
          orderDate: formatDate(o.created_at),
          expectedDeliveryDate: o.expected_delivery_date,
          amountPaid: Number(o.total_expected_amount),
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

    // Optimistic local update
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
        ? `Order fully arrived! ${data.transportCharges > 0 ? `Transport ₹${data.transportCharges.toLocaleString("en-IN")} recorded.` : ""}`
        : `Parcel arrival logged. ${data.transportCharges > 0 ? `Transport ₹${data.transportCharges.toLocaleString("en-IN")} recorded.` : ""}`
    );
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "Waiting") return o.status === "PENDING" || o.status === "PARTIAL";
    return o.status === "COMPLETE";
  });

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#120D26]">Deliveries</h1>
          <p className="text-xs text-[#99969E] font-medium">Vendor Orders & Parcels</p>
        </div>
        <button
          onClick={() => setIsNewOrderSheetOpen(true)}
          className="bg-[#5F33E1] hover:bg-[#5029C9] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1 active:scale-95"
        >
          <span>+ New Order</span>
        </button>
      </div>

      {feedbackToast && (
        <div className="bg-[#DCFCE7] text-[#16A34A] text-xs font-bold p-3.5 rounded-2xl border border-[#BBF7D0] animate-fade-in flex items-center gap-2 shadow-sm">
          <CheckIcon className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex bg-[#F5F2FF] p-1 rounded-full border border-[#EDE8FB]">
        <button
          onClick={() => setActiveFilter("Waiting")}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === "Waiting"
              ? "bg-[#120D26] text-white shadow-sm"
              : "text-[#99969E] hover:text-[#120D26]"
          }`}
        >
          Waiting ({orders.filter((o) => o.status !== "COMPLETE").length})
        </button>
        <button
          onClick={() => setActiveFilter("Arrived")}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeFilter === "Arrived"
              ? "bg-[#5F33E1] text-white shadow-sm"
              : "text-[#99969E] hover:text-[#5F33E1]"
          }`}
        >
          Arrived ({orders.filter((o) => o.status === "COMPLETE").length})
        </button>
      </div>

      {/* Order Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-[#F2F0F5]">
          <TruckIcon className="w-8 h-8 text-[#5F33E1] mx-auto mb-3" />
          <p className="text-sm font-bold text-[#120D26]">
            {activeFilter === "Waiting" ? "No orders waiting" : "No arrived orders yet"}
          </p>
          <p className="text-xs text-[#99969E] mt-1">
            {activeFilter === "Waiting"
              ? "Tap + New Order to record a vendor purchase"
              : "Orders will appear here once parcels arrive"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isComplete = order.status === "COMPLETE";
            const isPartial = order.status === "PARTIAL";
            const aging = calculateDeliveryAging(order.expectedDeliveryDate);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-4 border border-[#F2F0F5] shadow-sm hover:border-[#EDE8FB] transition-colors"
              >
                {/* Row 1: Vendor Name + Status */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <h3 className="font-bold text-[#120D26] text-sm truncate min-w-0">
                    {order.vendorName}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                      isComplete
                        ? "bg-[#DCFCE7] text-[#16A34A]"
                        : isPartial
                        ? "bg-[#FEF3C7] text-[#D97706]"
                        : "bg-[#EDE8FB] text-[#5F33E1]"
                    }`}
                  >
                    {isComplete ? (
                      <><CheckIcon className="w-3 h-3" /><span>Arrived</span></>
                    ) : isPartial ? (
                      <><TimeCircleIcon className="w-3 h-3" /><span>Partial</span></>
                    ) : (
                      <><TruckIcon className="w-3 h-3" /><span>Ordered</span></>
                    )}
                  </span>
                </div>

                {/* Row 2: Location + Phone */}
                {(order.vendorLocation || order.vendorMobile) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2.5 text-[11px] text-[#524E59]">
                    {order.vendorLocation && (
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="w-3.5 h-3.5 text-[#5F33E1]" />
                        {order.vendorLocation}
                      </span>
                    )}
                    {order.vendorMobile && (
                      <a
                        href={`tel:${order.vendorMobile.replace(/\s/g, "")}`}
                        className="flex items-center gap-1 text-[#5F33E1] font-semibold hover:underline"
                      >
                        <PhoneIcon className="w-3.5 h-3.5" />
                        {order.vendorMobile}
                      </a>
                    )}
                  </div>
                )}

                {/* Row 3: Dates */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2.5 text-[11px] text-[#99969E]">
                  <span>Ordered: <strong className="text-[#120D26]">{order.orderDate}</strong></span>
                  {order.arrivalDate && (
                    <span>Arrived: <strong className="text-[#16A34A]">{formatDate(order.arrivalDate)}</strong></span>
                  )}
                </div>

                {/* Overdue warning */}
                {aging && !isComplete && aging.isOverdue && (
                  <div className="mb-2.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                      <AlertTriangleIcon className="w-3 h-3 text-red-600 shrink-0" />
                      <span>{aging.label}</span>
                    </span>
                  </div>
                )}

                {/* Row 4: Amount + Transport */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2.5 text-xs">
                  <span className="text-[#99969E]">
                    Amount Paid: <strong className="text-[#120D26] font-extrabold">{formatINR(order.amountPaid)}</strong>
                  </span>
                  {order.transportCharges > 0 && (
                    <span className="text-[#99969E]">
                      Transport: <strong className="text-[#120D26]">₹{order.transportCharges.toLocaleString("en-IN")}</strong>
                    </span>
                  )}
                </div>

                {/* Row 5: Purchase Details */}
                {order.purchaseDetails && (
                  <div className="text-[11px] text-[#524E59] bg-[#F8F9FA] p-2.5 rounded-xl mb-3 flex items-start gap-2">
                    <BoxIcon className="w-4 h-4 text-[#524E59] shrink-0 mt-0.5" />
                    <p className="min-w-0 flex-1">{order.purchaseDetails}</p>
                  </div>
                )}

                {/* Action: Log Arrival */}
                {!isComplete && (
                  <button
                    onClick={() => handleOpenArrivalSheet(order)}
                    className="w-full bg-[#EDE8FB] hover:bg-[#E1D7FA] text-[#5F33E1] font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-[0.99]"
                  >
                    <PackageCheckIcon className="w-4 h-4 text-[#5F33E1]" />
                    <span>Log Arrival</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Log Arrival Bottom Sheet */}
      <LogArrivalSheet
        order={
          selectedOrder
            ? {
                id: selectedOrder.id,
                vendorName: selectedOrder.vendorName,
                amountPaid: selectedOrder.amountPaid,
              }
            : null
        }
        isOpen={isArrivalSheetOpen}
        onClose={() => setIsArrivalSheetOpen(false)}
        onSave={handleSaveArrival}
      />

      {/* New Vendor Order Bottom Sheet */}
      <NewOrderSheet
        isOpen={isNewOrderSheetOpen}
        onClose={() => setIsNewOrderSheetOpen(false)}
        onSuccess={() => {
          loadOrders();
          showToast("New vendor order recorded. Expense auto-logged.");
        }}
      />
    </div>
  );
}
