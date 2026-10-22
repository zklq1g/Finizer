// src/utils/generateAuditPDF.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatINR } from "./format";
import type { AuditLogEntry } from "@/services/api";

// Generate SHA-256 hash for the Forensic Seal using native Web Crypto API
async function generateHash(data: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function generateAuditPDF(
  entries: AuditLogEntry[],
  startDate: string,
  endDate: string
) {
  const doc = new jsPDF();

  // 1. Header
  doc.setFontSize(20);
  doc.setTextColor(95, 51, 225); // Primary #5F33E1
  doc.text("Finizer Forensic Audit Log", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(153, 150, 158); // Muted #99969E
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 28);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 34);

  // 2. Table Data Preparation
  const tableData = entries.map((entry) => {
    const dateStr = new Date(entry.transaction_date).toLocaleDateString("en-IN");
    const status = entry.is_deleted ? "[VOIDED]" : "";
    const desc = `${entry.description} ${status}`.trim();
    const category = entry.category_name;
    const account = entry.account_name;

    // Strict constraint: No red/green. Purple for income, Dark for expense.
    const isIncome = entry.type === "income" || entry.type === "INCOME";
    const income = isIncome ? formatINR(entry.amount) : "";
    const expense = !isIncome ? formatINR(entry.amount) : "";

    return [dateStr, desc, category, account, income, expense];
  });

  // 3. Render Table
  autoTable(doc, {
    head: [["Date", "Description", "Category", "Account", "Income (₹)", "Expense (₹)"]],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [18, 13, 38] }, // Text #120D26
    headStyles: {
      fillColor: [237, 232, 251], // Light #EDE8FB
      textColor: [95, 51, 225], // Primary #5F33E1
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [248, 249, 250] }, // Background #F8F9FA
    columnStyles: {
      4: { cellWidth: 26, halign: "right", textColor: [95, 51, 225] }, // Income Purple
      5: { cellWidth: 26, halign: "right", textColor: [18, 13, 38] }, // Expense Dark
    },
    margin: { left: 14, right: 14 },
    didParseCell: function (data) {
      // Italicize & mute voided transactions
      if (data.section === "body") {
        const rawRow = data.row.raw as string[];
        if (rawRow && rawRow[1] && rawRow[1].includes("[VOIDED]")) {
          data.cell.styles.textColor = [153, 150, 158]; // Muted
          data.cell.styles.fontStyle = "italic";
        }
      }
    },
  });

  // 4. Cryptographic Forensic Seal
  const finalY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120) + 12;
  const jsonString = JSON.stringify(entries);
  const hash = await generateHash(jsonString);

  doc.setFontSize(8);
  doc.setTextColor(153, 150, 158);
  doc.text("FORENSIC SEAL (SHA-256):", 14, finalY);
  doc.setFont("courier", "bold");
  doc.setTextColor(95, 51, 225);
  doc.text(hash.toUpperCase(), 14, finalY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(153, 150, 158);
  doc.text(
    "This cryptographic hash verifies that the ledger data has not been altered or doctored since export.",
    14,
    finalY + 10
  );

  // 5. Save PDF to client
  doc.save(`Finizer_Audit_${startDate}_${endDate}.pdf`);
}
