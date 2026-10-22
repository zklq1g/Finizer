// src/utils/exportCSV.ts
import type { Transaction } from '@/types';

/**
 * Exports transactions to a Chartered Accountant-ready CSV file.
 * Includes UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility,
 * explicit Debit/Credit splitting, and native DD/MM/YYYY date formatting.
 */
export function exportTransactionsToCSV(transactions: Transaction[], filenamePrefix = 'Finizer_Ledger') {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to export.');
    return;
  }

  const headers = [
    'Date',
    'Particulars / Description',
    'Category',
    'Account / Mode',
    'Debit (Expenses ₹)',
    'Credit (Income ₹)',
    'Vendor GSTIN',
    'Transaction ID',
  ];

  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const rows = transactions.map((tx) => {
    // Format Date to DD/MM/YYYY
    let formattedDate = tx.date;
    try {
      const parts = tx.date.split('-');
      if (parts.length === 3) {
        // Assume YYYY-MM-DD
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        const d = new Date(tx.date);
        formattedDate = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    } catch {
      formattedDate = tx.date;
    }

    const description = tx.description || (tx.type === 'INCOME' ? 'Sales Inflow' : 'Store Expense');
    const categoryName = (tx.categories as { name?: string })?.name || 'General';
    const accountName = (tx.accounts as { name?: string })?.name || 'Cash';
    const debit = tx.type === 'EXPENSE' ? Number(tx.amount).toFixed(2) : '';
    const credit = tx.type === 'INCOME' ? Number(tx.amount).toFixed(2) : '';
    const gstin = tx.vendor_gst_number || '-';

    return [
      escapeCSV(formattedDate),
      escapeCSV(description),
      escapeCSV(categoryName),
      escapeCSV(accountName),
      escapeCSV(debit),
      escapeCSV(credit),
      escapeCSV(gstin),
      escapeCSV(tx.id),
    ].join(',');
  });

  // Prepend UTF-8 BOM \uFEFF so Excel automatically parses UTF-8 correctly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  const todayStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
