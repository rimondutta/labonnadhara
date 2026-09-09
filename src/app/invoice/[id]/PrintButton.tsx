"use client";

import { Printer, Download } from "lucide-react";

export default function PrintButton({ orderId, invoiceNumber }: { orderId?: string, invoiceNumber?: string }) {
  if (orderId) {
    return (
      <a
        href={`/api/orders/${orderId}/invoice`}
        download={`Invoice-${invoiceNumber || orderId}.pdf`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold tracking-wide hover:bg-slate-700 active:scale-95 transition-all duration-150 shadow-sm"
      >
        <Download size={14} />
        Download PDF
      </a>
    );
  }

  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold tracking-wide hover:bg-slate-700 active:scale-95 transition-all duration-150 shadow-sm"
    >
      <Printer size={14} />
      Print Invoice
    </button>
  );
}
