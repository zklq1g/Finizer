// src/services/api.ts
import { supabase } from '@/lib/supabase';
import type {
  Account,
  Category,
  Transaction,
  PurchaseOrder,
  AuditLog,
  MonthlyClosure,
  CreateTransactionDTO,
  CreatePurchaseOrderDTO,
  LogGoodsReceiptDTO,
  CloseMonthDTO,
} from '@/types';

export const api = {
  // --- ACCOUNTS & CATEGORIES ---
  async getAccounts(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch accounts:', error);
      throw error;
    }
    return data || [];
  },

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('is_system_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    }
    return data || [];
  },

  // --- TRANSACTIONS ---
  async getTransactions(limit = 100): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts (name),
        categories (name, type)
      `)
      .eq('is_deleted', false)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch transactions:', error);
      throw error;
    }
    return data || [];
  },

  async createTransaction(dto: CreateTransactionDTO, actor: string): Promise<Transaction> {
    const { data, error } = await supabase.rpc('create_financial_transaction', {
      p_account_id: dto.account_id,
      p_category_id: dto.category_id,
      p_amount: dto.amount,
      p_type: dto.type,
      p_date: dto.date,
      p_actor: actor,
      p_description: dto.description || null,
      p_vendor_gst_number: dto.vendor_gst_number || null,
      p_receipt_image_url: dto.receipt_image_url || null,
    });

    if (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
    return data as Transaction;
  },

  async softDeleteTransaction(transactionId: string, actor: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_transaction', {
      p_transaction_id: transactionId,
      p_actor: actor,
    });

    if (error) {
      console.error('Failed to soft delete transaction:', error);
      throw error;
    }
  },

  // --- LOGISTICS & PURCHASE ORDERS ---
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('expected_delivery_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch purchase orders:', error);
      throw error;
    }
    return data || [];
  },

  async createPurchaseOrder(dto: CreatePurchaseOrderDTO, actor: string): Promise<PurchaseOrder> {
    const { data, error } = await supabase.rpc('create_purchase_order', {
      p_vendor_name: dto.vendor_name,
      p_expected_amount: dto.expected_amount,
      p_expected_date: dto.expected_date,
      p_actor: actor,
    });

    if (error) {
      console.error('Failed to create purchase order:', error);
      throw error;
    }
    return data as PurchaseOrder;
  },

  async logGoodsReceipt(dto: LogGoodsReceiptDTO, actor: string): Promise<{ success: boolean; new_status: string; new_total: number }> {
    const { data, error } = await supabase.rpc('log_goods_receipt', {
      p_po_id: dto.po_id,
      p_received_amount: dto.amount,
      p_actor: actor,
      p_challan_number: dto.challan_number || null,
      p_receipt_image_url: dto.receipt_image_url || null,
      p_notes: dto.notes || null,
    });

    if (error) {
      console.error('Failed to log goods receipt:', error);
      throw error;
    }
    return data;
  },

  // --- MONTH-END FINANCIAL CLOSURE ---
  async closeMonth(dto: CloseMonthDTO, actor: string): Promise<{ success: boolean; closure_id: string }> {
    const { data, error } = await supabase.rpc('close_month', {
      p_month: dto.month,
      p_year: dto.year,
      p_net_profit: dto.net_profit,
      p_alloc_opex: dto.alloc_opex,
      p_alloc_salaries: dto.alloc_salaries,
      p_alloc_reinvestment: dto.alloc_reinvestment,
      p_alloc_partner_payout: dto.alloc_partner_payout,
      p_payout_account_id: dto.payout_account_id || null,
      p_actor: actor,
    });

    if (error) {
      console.error('Failed to close month:', error);
      throw error;
    }
    return data;
  },

  async getMonthlyClosures(): Promise<MonthlyClosure[]> {
    const { data, error } = await supabase
      .from('monthly_closures')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      console.error('Failed to fetch monthly closures:', error);
      throw error;
    }
    return data || [];
  },

  // --- AUDIT LOGS ---
  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      throw error;
    }
    return data || [];
  },
};
