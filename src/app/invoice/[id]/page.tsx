import { notFound } from "next/navigation";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import Order from "@/models/Order";
import PrintButton from "./PrintButton";
import { verifyInvoiceToken } from "@/lib/invoice-token";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; token?: string }>;
}) {
  const { id } = await params;
  const { t, token } = await searchParams;
  const submittedToken = t || token;

  await connectToDatabase();

  let order: any;
  try {
    order = await Order.findById(id).select('+guestAccessTokenHash').lean();
  } catch {
    return notFound();
  }

  if (!order) return notFound();

  // ── Strict Authorization Verification ──
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  let isAuthorized = false;

  if (session && isAdmin) {
    isAuthorized = true;
  } else if (session && session.user?.email && order.customerEmail) {
    if (session.user.email.toLowerCase().trim() === order.customerEmail.toLowerCase().trim()) {
      isAuthorized = true;
    }
  } else if (submittedToken) {
    // 1. Verify HMAC-SHA256 signed token
    if (verifyInvoiceToken(id, submittedToken)) {
      isAuthorized = true;
    }
    // 2. Also check legacy random guest token hash if present
    else if (order.guestAccessTokenHash) {
      const submittedHash = crypto.createHash('sha256').update(submittedToken.trim()).digest('hex');
      if (
        submittedHash.length === order.guestAccessTokenHash.length &&
        crypto.timingSafeEqual(Buffer.from(submittedHash, 'utf-8'), Buffer.from(order.guestAccessTokenHash, 'utf-8'))
      ) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return notFound();
  }

  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const shortId = order._id.toString().slice(-8).toUpperCase();
  const subtotal = (order.items || []).reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FFF1F6] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Actions Bar (hidden on print) */}
        <div className="flex items-center justify-between print:hidden">
          <a
            href="/"
            className="text-sm font-medium text-[#7D6B75] hover:text-[#2D1B2D] transition-colors"
          >
            ← Back to Store
          </a>
          <PrintButton orderId={order._id.toString()} token={submittedToken} />
        </div>

        {/* Invoice Card */}
        <div
          id="invoice-printable"
          className="bg-white rounded-2xl shadow-sm border border-[#F3D6E2] p-8 sm:p-12 space-y-8"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-[#F3D6E2]">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#2D1B2D]">
                LABONNADHARA
              </h1>
              <p className="text-xs text-[#7D6B75] mt-1 font-mono tracking-widest uppercase">
                Premium Jewelry & Lifestyle
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF1F6] text-[#D62B72] border border-[#F3D6E2]">
                INVOICE #{order.invoiceNumber || `INV-${shortId}`}
              </span>
              <p className="text-xs text-[#7D6B75] mt-1.5">{orderDate}</p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7D6B75] mb-2 font-mono">
                Billed To
              </p>
              <p className="font-semibold text-[#2D1B2D]">{order.customerName}</p>
              {order.customerEmail && (
                <p className="text-[#7D6B75] text-xs">{order.customerEmail}</p>
              )}
              {order.shippingAddress?.phone && (
                <p className="text-[#7D6B75] text-xs mt-1">{order.shippingAddress.phone}</p>
              )}
              {order.shippingAddress?.addressLine1 && (
                <p className="text-[#7D6B75] text-xs mt-0.5">
                  {order.shippingAddress.addressLine1}, {order.shippingAddress.city}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#7D6B75] mb-2 font-mono">
                Order Details
              </p>
              <p className="text-xs text-[#7D6B75]">
                Status:{" "}
                <span className="font-semibold uppercase text-[#2D1B2D]">
                  {order.fulfillmentStatus}
                </span>
              </p>
              <p className="text-xs text-[#7D6B75] mt-1">
                Payment:{" "}
                <span className="font-semibold uppercase text-[#2D1B2D]">
                  {order.paymentMethod} ({order.paymentStatus})
                </span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F3D6E2] text-xs uppercase tracking-wider text-[#7D6B75] font-mono">
                  <th className="py-3 text-left font-medium">Item</th>
                  <th className="py-3 text-center font-medium">Qty</th>
                  <th className="py-3 text-right font-medium">Unit Price</th>
                  <th className="py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3D6E2]/50">
                {(order.items || []).map((item: any, idx: number) => {
                  const lineTotal = item.price * item.quantity;
                  return (
                    <tr key={idx} className="text-[#2D1B2D]">
                      <td className="py-3.5 pr-4">
                        <span className="font-medium">{item.title}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#7D6B75]">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        ৳{item.price.toLocaleString("en-BD")}
                      </td>
                      <td className="py-3.5 pl-4 text-right font-semibold font-mono text-xs">
                        ৳{lineTotal.toLocaleString("en-BD")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-[#F3D6E2] pt-6 space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-[#7D6B75]">
              <span>Subtotal</span>
              <span className="font-mono">৳{subtotal.toLocaleString("en-BD")}</span>
            </div>
            <div className="flex justify-between text-[#7D6B75]">
              <span>Shipping</span>
              <span className="font-mono">৳{order.shippingCost?.toLocaleString("en-BD") || 0}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#2D1B2D] pt-2 border-t border-[#F3D6E2]">
              <span>Grand Total</span>
              <span className="font-mono text-[#D62B72]">
                ৳{order.totalAmount.toLocaleString("en-BD")}
              </span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-[#F3D6E2] pt-6 text-center text-xs text-[#7D6B75] space-y-1">
            <p className="font-medium text-[#2D1B2D]">Thank you for your business!</p>
            <p>
              For any queries regarding this order, contact us at{" "}
              <span className="font-mono text-[#D62B72]">support@labonnadhara.shop</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
