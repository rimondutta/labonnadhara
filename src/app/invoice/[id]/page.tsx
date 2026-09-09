import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/db";
import Order from "@/models/Order";
import PrintButton from "./PrintButton";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectToDatabase();

  let order: any;
  try {
    order = await Order.findById(id).lean();
  } catch {
    return notFound();
  }
  if (!order) return notFound();

  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const shortId = order._id.toString().slice(-8).toUpperCase();
  const subtotal = order.totalAmount - ((order.shippingCost as number) || 0);
  const addr = order.shippingAddress as any;
  
  const paymentLabel =
    order.paymentMethod === "cod" ? "Cash on Delivery"
      : order.paymentMethod === "bkash" ? "bKash"
        : order.paymentMethod === "card" ? "Credit / Debit Card"
          : order.paymentMethod?.toUpperCase();

  const isPaid = order.paymentStatus === "paid";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans print:bg-white print:py-0 print:px-0">
      
      {/* ── Toolbar (Hidden in Print) ── */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-end print:hidden">
        <div>
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">Toy Hourse</p>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoice #{order.invoiceNumber || shortId}</h1>
        </div>
        <PrintButton orderId={order._id.toString()} invoiceNumber={order.invoiceNumber} />
      </div>

      {/* ── Invoice Card ── */}
      <div className="max-w-4xl mx-auto bg-white shadow-2xl shadow-slate-200/50 rounded-2xl overflow-hidden border border-slate-100 print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Accent */}
        <div className="h-3 w-full bg-slate-900 print:hidden" />

        <div className="p-8 sm:p-12">
          
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-100 pb-10 mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Toy Hourse</h2>
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mt-2">Professional Toys & Gear</p>
            </div>
            
            <div className="mt-8 sm:mt-0 text-left sm:text-right">
              <h3 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">Invoice</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:block sm:space-y-1 text-sm">
                <div className="flex justify-between sm:justify-end gap-4">
                  <span className="font-semibold text-slate-400 uppercase text-xs tracking-wider">Invoice No.</span>
                  <span className="font-bold text-slate-900">{order.invoiceNumber || shortId}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-4">
                  <span className="font-semibold text-slate-400 uppercase text-xs tracking-wider">Date</span>
                  <span className="font-medium text-slate-700">{orderDate}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-4">
                  <span className="font-semibold text-slate-400 uppercase text-xs tracking-wider">Order Ref</span>
                  <span className="font-medium text-slate-700">#{shortId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bill To & Ship To ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Billed To</p>
              <p className="text-lg font-bold text-slate-900 mb-1">{order.customerName || "Customer"}</p>
              {order.customerEmail && <p className="text-sm text-slate-600 mb-1">{order.customerEmail}</p>}
              {addr?.phone && <p className="text-sm text-slate-600">{addr.phone}</p>}
            </div>
            
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Shipped To</p>
              {addr?.addressLine1 ? (
                <>
                  <p className="text-sm font-medium text-slate-900 mb-1">{addr.addressLine1}</p>
                  {(addr.city || addr.postcode) && (
                    <p className="text-sm text-slate-600 mb-1">
                      {addr.city}{addr.postcode ? `, ${addr.postcode}` : ""}
                    </p>
                  )}
                  {addr.country && <p className="text-sm text-slate-600">{addr.country}</p>}
                </>
              ) : (
                <p className="text-sm text-slate-500 italic">No shipping address provided</p>
              )}
            </div>
          </div>

          {/* ── Items Table ── */}
          <div className="mb-12 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="py-4 px-4 rounded-l-lg">Description</th>
                  <th className="py-4 px-4 text-center">Qty</th>
                  <th className="py-4 px-4 text-right">Unit Price</th>
                  <th className="py-4 px-4 text-right rounded-r-lg">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(order.items as any[]).map((item: any, i: number) => {
                  const variants = item.variantOptions
                    ? Object.values(item.variantOptions).join(" · ")
                    : [
                        item.color && item.color !== "Default" ? item.color : null,
                        item.size && item.size !== "Default" ? item.size : null,
                      ].filter(Boolean).join(" · ");
                  
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 px-4">
                        <p className="text-sm font-bold text-slate-900">{item.title}</p>
                        {variants && <p className="text-xs text-slate-500 mt-1">{variants}</p>}
                      </td>
                      <td className="py-5 px-4 text-center text-sm font-medium text-slate-700">{item.quantity}</td>
                      <td className="py-5 px-4 text-right text-sm text-slate-600 font-mono">৳{item.price.toLocaleString()}</td>
                      <td className="py-5 px-4 text-right text-sm font-bold text-slate-900 font-mono">
                        ৳{(item.price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Summary & Totals ── */}
          <div className="flex flex-col sm:flex-row justify-between items-end sm:items-start gap-12">
            
            {/* Payment Info */}
            <div className="w-full sm:w-1/2 order-2 sm:order-1">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Payment Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {isPaid ? "Paid" : "Pending"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">Payment Method</p>
                  <p className="text-sm font-medium text-slate-700">{paymentLabel}</p>
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">Fulfillment</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                    {order.fulfillmentStatus || "Processing"}
                  </span>
                </div>
              </div>
            </div>

            {/* Totals Box */}
            <div className="w-full sm:w-1/2 md:w-2/5 order-1 sm:order-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-700 font-mono">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-semibold text-slate-700 font-mono">৳{((order.shippingCost as number) || 0).toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center">
                  <span className="text-base font-black text-slate-900 uppercase tracking-widest">Total Due</span>
                  <span className="text-2xl font-black text-blue-600 font-mono">৳{order.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>Thank you for shopping with Toy Hourse 🧸</p>
          <p className="font-mono tracking-wider">REF: {order._id.toString()}</p>
        </div>

      </div>

      <div className="max-w-4xl mx-auto mt-8 text-center print:hidden">
        <a href="/products" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          ← Continue Shopping
        </a>
      </div>

    </div>
  );
}
