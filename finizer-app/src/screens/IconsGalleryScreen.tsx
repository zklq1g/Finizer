"use client";
import React, { useState } from "react";
import * as Icons from "../components/icons";

// ── Purple shade system ──────────────────────────
// 900 #2D1A7A   700 #4A27B3   500 #5F33E1 (primary)
// 400 #7C5CE8   300 #9F87EF   200 #C5B8F6
// 100 #EDE8FB   50  #F5F2FF

interface IconItem {
  name: string;
  component: React.FC<{ className?: string }>;
  tag: string;
  iconColor: string;
  bgColor: string;
}

const figmaIcons: IconItem[] = [
  { name: "BriefcaseIcon",    component: Icons.BriefcaseIcon,    tag: "Office Task",     iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "BookIcon",         component: Icons.BookIcon,          tag: "Daily Study",     iconColor: "text-[#9F87EF]", bgColor: "bg-[#F5F2FF]" },
  { name: "UserOctagonIcon",  component: Icons.UserOctagonIcon,   tag: "Personal Task",   iconColor: "text-[#7C5CE8]", bgColor: "bg-[#EDE8FB]" },
  { name: "NotificationIcon", component: Icons.NotificationIcon,  tag: "Alerts",          iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "HomeIcon",         component: Icons.HomeIcon,          tag: "Dashboard",       iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "CalendarIcon",     component: Icons.CalendarIcon,      tag: "Schedule",        iconColor: "text-[#7C5CE8]", bgColor: "bg-[#EDE8FB]" },
  { name: "DocumentIcon",     component: Icons.DocumentIcon,      tag: "Reports",         iconColor: "text-[#4A27B3]", bgColor: "bg-[#EDE8FB]" },
  { name: "ProfileIcon",      component: Icons.ProfileIcon,       tag: "User Profile",    iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "TimeCircleIcon",   component: Icons.TimeCircleIcon,    tag: "Timestamp",       iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "AddIcon",          component: Icons.AddIcon,           tag: "Quick Add",       iconColor: "text-white",     bgColor: "bg-[#5F33E1]" },
  { name: "MoreIcon",         component: Icons.MoreIcon,          tag: "Overflow Menu",   iconColor: "text-[#7C5CE8]", bgColor: "bg-[#EDE8FB]" },
  { name: "ArrowLeftIcon",    component: Icons.ArrowLeftIcon,     tag: "Back Navigation", iconColor: "text-[#120D26]", bgColor: "bg-[#F5F2FF]" },
  { name: "ArrowDownIcon",    component: Icons.ArrowDownIcon,     tag: "Dropdown",        iconColor: "text-[#120D26]", bgColor: "bg-[#F5F2FF]" },
  { name: "ArrowRightIcon",   component: Icons.ArrowRightIcon,    tag: "CTA Arrow",       iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
];

const financeIcons: IconItem[] = [
  { name: "WalletIcon",           component: Icons.WalletIcon,           tag: "Accounts / Cash",  iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "CardReceiveIcon",      component: Icons.CardReceiveIcon,      tag: "Income / Sales",   iconColor: "text-[#4A27B3]", bgColor: "bg-[#EDE8FB]" },
  { name: "CardSendIcon",         component: Icons.CardSendIcon,         tag: "Expense / Vendor", iconColor: "text-[#7C5CE8]", bgColor: "bg-[#F5F2FF]" },
  { name: "ReceiptIcon",          component: Icons.ReceiptIcon,          tag: "Bill / Tax",       iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "BoxIcon",              component: Icons.BoxIcon,              tag: "Purchase Order",   iconColor: "text-[#9F87EF]", bgColor: "bg-[#F5F2FF]" },
  { name: "TruckIcon",            component: Icons.TruckIcon,            tag: "Goods Delivery",   iconColor: "text-[#7C5CE8]", bgColor: "bg-[#EDE8FB]" },
  { name: "ShieldTickIcon",       component: Icons.ShieldTickIcon,       tag: "Partner Audit",    iconColor: "text-[#4A27B3]", bgColor: "bg-[#EDE8FB]" },
  { name: "CameraIcon",           component: Icons.CameraIcon,           tag: "Receipt Snap",     iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "TrendUpIcon",          component: Icons.TrendUpIcon,          tag: "Monthly Snapshot", iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "PercentageSquareIcon", component: Icons.PercentageSquareIcon, tag: "GST / Discounts",  iconColor: "text-[#9F87EF]", bgColor: "bg-[#F5F2FF]" },
  { name: "FilterIcon",           component: Icons.FilterIcon,           tag: "Ledger Filters",   iconColor: "text-[#7C5CE8]", bgColor: "bg-[#EDE8FB]" },
  { name: "SearchIcon",           component: Icons.SearchIcon,           tag: "Ledger Search",    iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "TrashIcon",            component: Icons.TrashIcon,            tag: "Soft Delete",      iconColor: "text-[#2D1A7A]", bgColor: "bg-[#EDE8FB]" },
  { name: "PrinterIcon",          component: Icons.PrinterIcon,          tag: "Print Ledger",     iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
  { name: "LockIcon",             component: Icons.LockIcon,             tag: "Security / Audit", iconColor: "text-[#4A27B3]", bgColor: "bg-[#EDE8FB]" },
  { name: "AlertTriangleIcon",    component: Icons.AlertTriangleIcon,    tag: "Alerts / Warnings",iconColor: "text-[#7C5CE8]", bgColor: "bg-[#F5F2FF]" },
  { name: "CheckIcon",            component: Icons.CheckIcon,            tag: "Verified / Success",iconColor: "text-[#5F33E1]",bgColor: "bg-[#EDE8FB]" },
  { name: "CloseIcon",            component: Icons.CloseIcon,            tag: "Dismiss Modal",    iconColor: "text-[#120D26]", bgColor: "bg-[#F5F2FF]" },
  { name: "ChevronRightIcon",     component: Icons.ChevronRightIcon,     tag: "Menu Action",      iconColor: "text-[#5F33E1]", bgColor: "bg-[#EDE8FB]" },
];

type FilterTab = "all" | "figma" | "finance";

export default function IconsGalleryScreen() {
  const [filter, setFilter] = useState<FilterTab>("all");

  const renderGrid = (items: IconItem[]) => (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((item) => {
        const IconComponent = item.component;
        return (
          <div
            key={item.name}
            className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm shadow-black/[0.02] border border-[#F2F0F5]"
          >
            <div
              className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center shrink-0`}
            >
              <IconComponent className={`w-5 h-5 ${item.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#120D26] truncate">
                {item.name}
              </p>
              <p className="text-[10px] text-[#99969E] truncate">{item.tag}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#F9F9FB] p-5 pb-20">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 90% 0%, rgba(197,184,246,0.25) 0%, transparent 45%),
            radial-gradient(ellipse at 0% 10%, rgba(197,184,246,0.15) 0%, transparent 35%),
            radial-gradient(ellipse at 0% 80%, rgba(225,213,250,0.2) 0%, transparent 40%),
            #F9F9FB
          `,
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-5">
          <p className="text-[10px] uppercase tracking-widest text-[#9F87EF] font-bold">
            Vuesax Bold/Bulk · Purple System
          </p>
          <h1 className="text-xl font-extrabold text-[#120D26] mt-0.5">
            Finizer Icons
          </h1>

          {/* Shade Swatch Row */}
          <div className="flex gap-1.5 mt-3">
            {[
              { shade: "900", hex: "#2D1A7A" },
              { shade: "700", hex: "#4A27B3" },
              { shade: "500", hex: "#5F33E1" },
              { shade: "400", hex: "#7C5CE8" },
              { shade: "300", hex: "#9F87EF" },
              { shade: "200", hex: "#C5B8F6" },
              { shade: "100", hex: "#EDE8FB" },
              { shade: "50",  hex: "#F5F2FF" },
            ].map(({ shade, hex }) => (
              <div key={shade} className="flex flex-col items-center gap-1">
                <div
                  className="w-6 h-6 rounded-lg border border-white/50 shadow-sm"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[8px] text-[#99969E] font-medium">
                  {shade}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "all",     label: "All (33)" },
            { id: "figma",   label: "Figma UI (14)" },
            { id: "finance", label: "Financial & Ops (19)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as FilterTab)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                filter === tab.id
                  ? "bg-[#5F33E1] text-white shadow-sm shadow-[#5F33E1]/25"
                  : "bg-white text-[#5F33E1] border border-[#EDE8FB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Figma UI Section */}
        {(filter === "all" || filter === "figma") && (
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#5F33E1]" />
              <h2 className="text-[11px] font-bold text-[#5F33E1] uppercase tracking-wider">
                Figma UI Icons
              </h2>
            </div>
            {renderGrid(figmaIcons)}
          </div>
        )}

        {/* Financial & Ops Section */}
        {(filter === "all" || filter === "finance") && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#7C5CE8]" />
              <h2 className="text-[11px] font-bold text-[#7C5CE8] uppercase tracking-wider">
                Financial & Ledger Icons
              </h2>
            </div>
            {renderGrid(financeIcons)}
          </div>
        )}
      </div>
    </div>
  );
}
