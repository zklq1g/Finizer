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
      .neq('is_active', false)
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
      .neq('is_active', false)
      .order('is_system_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    }
    return data || [];
  },

  async saveAccount(
    action: 'create' | 'update' | 'delete',
    payload: { id?: string; name?: string; type?: string; is_active?: boolean }
  ): Promise<string> {
    return saveAccount(action, payload);
  },

  async saveCategory(
    action: 'create' | 'update' | 'delete',
    payload: { id?: string; name?: string; type?: string; is_active?: boolean }
  ): Promise<string> {
    return saveCategory(action, payload);
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
      p_receipt_image_url: dto.receipt_url || dto.receipt_image_url || null,
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
      p_receipt_image_url: dto.receipt_url || dto.receipt_image_url || null,
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

  // --- FINANCIAL METRICS & P&L ---
  async getFinancialMetrics(startDate: string, endDate: string): Promise<FinancialMetrics> {
    return getFinancialMetrics(startDate, endDate);
  },

  // --- STORAGE & RECEIPTS ---
  async uploadReceipt(file: File): Promise<string> {
    return uploadReceipt(file);
  },

  // --- FORENSIC AUDIT TRAIL ---
  async getAuditLog(startDate: string, endDate: string): Promise<AuditLogEntry[]> {
    return getAuditLog(startDate, endDate);
  },
};

export async function uploadReceipt(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('Upload failed:', uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Generate a signed URL valid for 10 years (315,360,000 seconds)
  const { data, error: urlError } = await supabase.storage
    .from('receipts')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);

  if (urlError || !data?.signedUrl) {
    console.error('URL generation failed:', urlError);
    throw new Error(`URL generation failed: ${urlError?.message || 'Unknown error'}`);
  }

  return data.signedUrl;
}

export async function createFinancialTransaction(payload: {
  p_type: 'income' | 'expense' | 'INCOME' | 'EXPENSE';
  p_amount: number;
  p_account_id: string;
  p_category_id: string;
  p_description?: string;
  p_transaction_date?: string;
  p_date?: string;
  p_actor: string;
  p_receipt_url?: string;
  p_vendor_gst_number?: string;
}) {
  const dto: CreateTransactionDTO = {
    account_id: payload.p_account_id,
    category_id: payload.p_category_id,
    amount: payload.p_amount,
    type: (payload.p_type.toUpperCase() as 'INCOME' | 'EXPENSE'),
    date: payload.p_transaction_date || payload.p_date || new Date().toISOString().split('T')[0],
    description: payload.p_description,
    vendor_gst_number: payload.p_vendor_gst_number,
    receipt_url: payload.p_receipt_url,
  };
  return api.createTransaction(dto, payload.p_actor);
}

export interface FinancialMetrics {
  total_cash: number;
  inventory_value: number;
  monthly_income: number;
  monthly_expense: number;
}

export async function getFinancialMetrics(startDate: string, endDate: string): Promise<FinancialMetrics> {
  const { data, error } = await supabase.rpc('get_financial_metrics', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error('Failed to fetch metrics:', error);
    throw new Error(`Failed to fetch metrics: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return { total_cash: 0, inventory_value: 0, monthly_income: 0, monthly_expense: 0 };
  }

  const row = data[0];
  return {
    total_cash: Number(row.total_cash) || 0,
    inventory_value: Number(row.inventory_value) || 0,
    monthly_income: Number(row.monthly_income) || 0,
    monthly_expense: Number(row.monthly_expense) || 0,
  };
}

export async function getAccounts(): Promise<Account[]> {
  return api.getAccounts();
}

export async function getCategories(): Promise<Category[]> {
  return api.getCategories();
}

export async function saveAccount(
  action: 'create' | 'update' | 'delete',
  payload: { id?: string; name?: string; type?: string; is_active?: boolean }
): Promise<string> {
  const { data, error } = await supabase.rpc('manage_account', {
    p_action: action,
    p_id: payload.id || null,
    p_name: payload.name || null,
    p_type: payload.type || null,
    p_is_active: payload.is_active ?? null,
  });

  if (error) {
    console.error('Failed to manage account:', error);
    throw new Error(error.message);
  }
  return data as string;
}

export async function saveCategory(
  action: 'create' | 'update' | 'delete',
  payload: { id?: string; name?: string; type?: string; is_active?: boolean }
): Promise<string> {
  const { data, error } = await supabase.rpc('manage_category', {
    p_action: action,
    p_id: payload.id || null,
    p_name: payload.name || null,
    p_type: payload.type || null,
    p_is_active: payload.is_active ?? null,
  });

  if (error) {
    console.error('Failed to manage category:', error);
    throw new Error(error.message);
  }
  return data as string;
}

export interface AuditLogEntry {
  id: string;
  transaction_date: string;
  type: 'income' | 'expense' | 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  category_name: string;
  account_name: string;
  is_deleted: boolean;
  created_at: string;
}

export async function getAuditLog(startDate: string, endDate: string): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      date,
      type,
      amount,
      description,
      is_deleted,
      created_at,
      categories ( name ),
      accounts ( name )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch audit log:', error);
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    transaction_date: row.date,
    type: row.type,
    amount: Number(row.amount) || 0,
    description: row.description || 'Transaction',
    is_deleted: Boolean(row.is_deleted),
    created_at: row.created_at,
    category_name: row.categories?.name || 'Uncategorized',
    account_name: row.accounts?.name || 'Unknown Account',
  }));
}

export type { Account, Category } from '@/types';
