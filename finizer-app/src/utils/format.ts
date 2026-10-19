/**
 * Finizer Smart Indian Currency & Date Utilities
 */

/**
 * Formats a numeric value into the standard Indian numbering system:
 * - >= ₹1 Crore: "₹X.XX Cr"
 * - >= ₹1 Lakh: "₹X.XX L"
 * - Below ₹1 Lakh: "₹15,000" (proper comma separation without awkward "0.15L")
 */
export const formatINR = (val: number): string => {
  if (isNaN(val) || val === null || val === undefined) return "₹0";
  
  if (Math.abs(val) >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(val) >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
};

export interface DeliveryAging {
  isOverdue: boolean;
  days: number;
  label: string;
}

/**
 * Calculates delivery aging without external dependencies:
 * Compares expected delivery date with current date.
 */
export const calculateDeliveryAging = (expectedDateStr?: string): DeliveryAging | null => {
  if (!expectedDateStr) return null;
  
  const expected = new Date(expectedDateStr);
  if (isNaN(expected.getTime())) return null;

  const now = new Date();
  // Strip hours for exact day-boundary comparison
  expected.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffMs = expected.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      isOverdue: true,
      days: overdueDays,
      label: `Overdue by ${overdueDays} day${overdueDays > 1 ? "s" : ""}`,
    };
  } else if (diffDays === 0) {
    return {
      isOverdue: false,
      days: 0,
      label: "Expected today",
    };
  } else {
    return {
      isOverdue: false,
      days: diffDays,
      label: `Expected in ${diffDays} day${diffDays > 1 ? "s" : ""}`,
    };
  }
};
