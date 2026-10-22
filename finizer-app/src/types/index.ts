// src/types/index.ts

export type TransactionType = 'INCOME' | 'EXPENSE';
export type CategoryType = 'OPERATING_EXPENSE' | 'CAPITAL_EXPENSE' | 'WITHDRAWAL' | 'INCOME';
export type POStatus = 'PENDING' | 'PARTIAL' | 'COMPLETE';
export type AuditAction = 'CREATED' | 'EDITED' | 'SOFT_DELETED';

export interface Account {
  id: string;
  name: string;
  current_balance: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  is_system_default: boolean;
}

export interface Transaction {
  id: string;
  account_id: string;
  category_id: string;
  amount: number;
  type: TransactionType;
  date: string;
  description?: string | null;
  vendor_gst_number?: string | null;
  receipt_image_url?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  accounts?: Account | { name: string };
  categories?: Category | { name: string; type: CategoryType };
}

export interface PurchaseOrder {
  id: string;
  vendor_name: string;
  total_expected_amount: number;
  total_received_amount: number;
  status: POStatus;
  expected_delivery_date: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface GoodsReceipt {
  id: string;
  purchase_order_id: string;
  received_amount: number;
  received_date: string;
  challan_number?: string | null;
  receipt_image_url?: string | null;
  notes?: string | null;
  received_by?: string;
}

export interface AuditLog {
  id: string;
  transaction_id?: string | null;
  action: AuditAction;
  actor: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  timestamp: string;
}

export interface MonthlyClosure {
  id: string;
  month: number;
  year: number;
  status: 'DRAFT' | 'LOCKED';
  net_profit: number;
  alloc_opex: number;
  alloc_salaries: number;
  alloc_reinvestment: number;
  alloc_partner_payout: number;
  payout_account_id?: string | null;
  locked_at?: string | null;
  locked_by?: string | null;
  created_at: string;
}

export interface MonthlySnapshot {
  id: string;
  month: number;
  year: number;
  cash_balance: number;
  inventory_value: number;
  total_business_value: number;
  snapshot_date: string;
}

export interface CreateTransactionDTO {
  account_id: string;
  category_id: string;
  amount: number;
  type: TransactionType;
  date: string;
  description?: string;
  vendor_gst_number?: string;
  receipt_image_url?: string;
}

export interface CreatePurchaseOrderDTO {
  vendor_name: string;
  expected_amount: number;
  expected_date: string;
}

export interface LogGoodsReceiptDTO {
  po_id: string;
  amount: number;
  challan_number?: string;
  receipt_image_url?: string;
  notes?: string;
}

export interface CloseMonthDTO {
  month: number;
  year: number;
  net_profit: number;
  alloc_opex: number;
  alloc_salaries: number;
  alloc_reinvestment: number;
  alloc_partner_payout: number;
  payout_account_id?: string | null;
}
