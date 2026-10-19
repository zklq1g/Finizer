"use client";
import React, { useState } from "react";
import EmptyState from "./EmptyState";
import { TruckIcon, BoxIcon, CardReceiveIcon } from "../icons";

interface PurchaseOrder {
  id: string;
  vendorName: string;
  orderDate: string;
  expectedAmount: number;
  receivedAmount: number;
  status: "PENDING" | "PARTIAL" | "COMPLETE";
  deliveryNote: string;
}

const SAMPLE_ORDERS: PurchaseOrder[] = [
  {
    id: "po-1",
    vendorName: "RK Wholesalers Ltd",
    orderDate: "18 Oct 2026",
    expectedAmount: 2000000,
    receivedAmount: 1500000,
    status: "PARTIAL",
    deliveryNote: "₹5,00,000 pending parcel in transit from warehouse",
  },
  {
    id: "po-2",
    vendorName: "Sunrise FMCG Distributors",
    orderDate: "15 Oct 2026",
    expectedAmount: 650000,
    receivedAmount: 650000,
    status: "COMPLETE",
    deliveryNote: "Fully delivered & verified on 19 Oct",
  },
  {
    id: "po-3",
    vendorName: "Apex Beverage Suppliers",
    orderDate: "19 Oct 2026",
    expectedAmount: 340000,
    receivedAmount: 0,
    status: "PENDING",
    deliveryNote: "Expected arrival tomorrow morning 10 AM",
  },
];

export default function DeliveriesTab() {
  const [activeFilter, setActiveFilter] = useState<"Active" | "Completed">("Active");
  const [orders, setOrders] = useState<PurchaseOrder[]>(SAMPLE_ORDERS);
  const [isDayOnePreview, setIsDayOnePreview] = useState(false);
  const [selectedOrderForLog, setSelectedOrderForLog] = useState<PurchaseOrder | null>(null);
  const [receiveInput, setReceiveInput] = useState<string>("");

  const handleLogParcel = (orderId: string) => {
    const amount = parseFloat(receiveInput);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid received amount");
      return;
    }

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const newReceived = Math.min(order.expectedAmount, order.receivedAmount + amount);
        const newStatus = newReceived >= order.expectedAmount ? "COMPLETE" : "PARTIAL";
        return {
          ...order,
          receivedAmount: newReceived,
          status: newStatus,
          deliveryNote: newStatus === "COMPLETE" ? "All parcels received & verified" : `Partial parcel logged (+₹${amount.toLocaleString("en-IN")})`,
        };
      })
    );

    setSelectedOrderForLog(null);
    setReceiveInput("");
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "Active") return o.status === "PENDING" || o.status === "PARTIAL";
    return o.status === "COMPLETE";
  });

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header with Contextual Non-FAB [ + New Order ] Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#120D26]">Deliveries</h1>
          <p className="text-xs text-[#99969E] font-medium">Vendor Stock & Delayed Parcels</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Day 1 toggle */}
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
            onClick={() => alert("Open New Purchase Order Modal")}
            className="bg-[#5F33E1] hover:bg-[#5029C9] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1 active:scale-95"
          >
            <span>+ New Order</span>
          </button>
        </div>
      </div>

      {/* Segmented Filter */}
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

      {/* Content */}
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

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-[#F2F0F5] relative overflow-hidden"
              >
                {/* Top Row: Vendor & Status Badge */}
                <div className="flex items-start justify-between mb-3">
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

                {/* Progress Bar & Amounts */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#99969E] font-medium">
                      Received:{" "}
                      <strong className="text-[#120D26]">
                        ₹{order.receivedAmount.toLocaleString("en-IN")}
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
                    <span>Expected Total: ₹{order.expectedAmount.toLocaleString("en-IN")}</span>
                    {!isCompleted && (
                      <span className="text-[#D97706] font-semibold">
                        Pending: ₹{(order.expectedAmount - order.receivedAmount).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delivery Note */}
                <p className="text-[11px] text-[#524E59] bg-[#F8F9FA] p-2.5 rounded-xl mb-3 flex items-center gap-1.5">
                  <BoxIcon className="w-4 h-4 text-[#524E59] shrink-0" /> {order.deliveryNote}
                </p>

                {/* Action: Log Received Parcel */}
                {!isCompleted && (
                  <div>
                    {selectedOrderForLog?.id === order.id ? (
                      <div className="bg-[#EDE8FB]/60 p-3 rounded-2xl border border-[#EDE8FB] space-y-2 animate-fade-in">
                        <label className="block text-[11px] font-bold text-[#5F33E1]">
                          Enter amount of stock received today:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="e.g. 500000"
                            value={receiveInput}
                            onChange={(e) => setReceiveInput(e.target.value)}
                            className="flex-1 bg-white px-3 py-2 rounded-xl text-xs font-bold text-[#120D26] border border-gray-200 outline-none"
                          />
                          <button
                            onClick={() => handleLogParcel(order.id)}
                            className="bg-[#5F33E1] text-white text-xs font-bold px-3 py-2 rounded-xl"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setSelectedOrderForLog(null)}
                            className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-2 rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedOrderForLog(order);
                          setReceiveInput("");
                        }}
                        className="w-full bg-[#EDE8FB] hover:bg-[#E1D7FA] text-[#5F33E1] font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="flex items-center gap-1.5"><CardReceiveIcon className="w-4 h-4" /> Log Received Parcel</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
