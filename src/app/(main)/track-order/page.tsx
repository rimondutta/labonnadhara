"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  FaSearch,
  FaBox,
  FaTruck,
  FaCheckCircle,
  FaShippingFast,
  FaExternalLinkAlt,
  FaCopy,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";

interface TrackingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  timestamp?: string;
}

interface OrderData {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    addressLine1?: string;
    city?: string;
    postcode?: string;
    phone?: string;
  };
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentStatus: string;
  courierStatus: string;
  courier: {
    name: string;
    code: string;
    trackingId?: string;
    trackingUrl?: string;
  };
  estimatedDeliveryDate?: string;
  steps: TrackingStep[];
  timeline: Array<{
    status: string;
    title: string;
    description: string;
    location?: string;
    timestamp: string;
  }>;
  items: Array<{
    productId: string;
    title: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  createdAt: string;
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || searchParams.get("orderId") || "";

  const [orderIdInput, setOrderIdInput] = useState(initialId);
  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTracking = async (idToSearch: string, phoneToSearch?: string) => {
    if (!idToSearch.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let url = `/api/orders/track?orderId=${encodeURIComponent(idToSearch.trim())}`;
      if (phoneToSearch?.trim()) {
        url += `&phone=${encodeURIComponent(phoneToSearch.trim())}`;
      }
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Order not found");
        setOrderData(null);
      } else {
        setOrderData(json.data);
      }
    } catch (err: any) {
      setError("Failed to fetch tracking details. Please try again.");
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      fetchTracking(initialId);
    }
  }, [initialId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(orderIdInput, phoneInput);
  };

  const copyTrackingId = () => {
    if (orderData?.courier?.trackingId) {
      navigator.clipboard.writeText(orderData.courier.trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-32 pb-24 px-4 sm:px-8 lg:px-16 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 bg-violet-100 border border-violet-300 px-4 py-1.5 rounded-full">
          <FaShippingFast className="w-4 h-4 text-violet-700" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-violet-800">
            Live Package Tracking
          </span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-slate-900">
          Track Your Order
        </h1>
        <p className="font-body text-slate-600 text-base font-medium">
          Enter your Order ID or Invoice Number below to view real-time courier status and step-by-step progress.
        </p>
      </div>

      {/* Search Card */}
      <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto mb-12">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Order ID / Invoice # <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="e.g. TH-8921A4 or MongoDB ID"
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-violet-600 focus:bg-white text-slate-900 px-5 py-4 pl-12 rounded-2xl font-mono text-sm font-semibold transition-all outline-none"
              />
              <FaBox className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Shipping Phone Number <span className="text-slate-400 font-normal">(Optional validation)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. 01712345678"
                className="w-full bg-slate-50 border border-slate-300 focus:border-violet-600 focus:bg-white text-slate-900 px-5 py-4 pl-12 rounded-2xl font-mono text-sm font-semibold transition-all outline-none"
              />
              <FaPhoneAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-body font-bold text-base uppercase tracking-wider px-8 py-4 rounded-2xl transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-3"
          >
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <FaSearch className="w-4 h-4" />
                Track Package
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm font-medium text-center">
            {error}
          </div>
        )}
      </div>

      {/* Tracking Results */}
      {orderData && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header Status Card */}
          <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xl font-bold text-slate-900">
                  {orderData.invoiceNumber}
                </span>
                <span className="bg-violet-100 text-violet-800 text-xs font-bold font-mono px-3 py-1 rounded-full uppercase">
                  {orderData.courierStatus.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-600">
                Customer: <strong className="text-slate-900">{orderData.customerName || 'Customer'}</strong>
              </p>
              {orderData.shippingAddress?.addressLine1 && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <FaMapMarkerAlt className="text-violet-600 w-3.5 h-3.5 shrink-0" />
                  {orderData.shippingAddress.addressLine1}, {orderData.shippingAddress.city || 'Dhaka'}
                </p>
              )}
            </div>

            {/* Courier Info Badge */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl w-full md:w-auto min-w-[260px] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold uppercase text-slate-500">Partner Courier</span>
                <span className="font-bold text-sm text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg">
                  {orderData.courier.name}
                </span>
              </div>

              {orderData.courier.trackingId && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                  <span className="font-mono text-xs text-slate-600">Tracking Code:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-sm text-violet-700 bg-violet-50 px-2 py-0.5 rounded">
                      {orderData.courier.trackingId}
                    </span>
                    <button
                      onClick={copyTrackingId}
                      className="text-slate-400 hover:text-slate-700 p-1 transition-colors"
                      title="Copy Tracking ID"
                    >
                      <FaCopy className="w-3.5 h-3.5" />
                    </button>
                    {copied && <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>}
                  </div>
                </div>
              )}

              {orderData.courier.trackingUrl && (
                <a
                  href={orderData.courier.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  Track on {orderData.courier.name}
                  <FaExternalLinkAlt className="w-3 h-3 text-white/70" />
                </a>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-6 sm:p-10">
            <h3 className="font-display font-bold text-lg uppercase text-slate-900 mb-8 border-b border-slate-100 pb-4">
              Delivery Progress
            </h3>

            <div className="relative flex flex-col md:flex-row justify-between gap-8 md:gap-2">
              {orderData.steps.map((step, idx) => (
                <div key={step.key} className="flex-1 relative flex md:flex-col items-start md:items-center gap-4 md:gap-3 text-left md:text-center group">
                  {/* Connecting Line (Desktop) */}
                  {idx < orderData.steps.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-[50%] right-[-50%] h-1 z-0 bg-slate-200">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: step.completed ? "100%" : "0%" }}
                      />
                    </div>
                  )}

                  {/* Icon Circle */}
                  <div
                    className={`relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-bold text-sm transition-all duration-300 ${
                      step.completed
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                        : step.active
                        ? "bg-violet-600 text-white ring-4 ring-violet-100 animate-pulse"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {step.completed ? (
                      <FaCheckCircle className="w-5 h-5" />
                    ) : idx === 1 ? (
                      <FaBox className="w-4 h-4" />
                    ) : idx === 2 ? (
                      <FaTruck className="w-4 h-4" />
                    ) : idx === 3 ? (
                      <FaShippingFast className="w-4 h-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="space-y-1">
                    <p className={`font-display text-sm font-bold uppercase tracking-tight ${step.completed || step.active ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-500 font-medium max-w-[180px] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline & Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Timeline */}
            <div className="lg:col-span-2 bg-white border border-slate-200 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
              <h3 className="font-display font-bold text-lg uppercase text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
                <FaClock className="text-violet-600 w-4 h-4" />
                Live Checkpoint History
              </h3>

              {orderData.timeline && orderData.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-6 border-l-2 border-violet-200">
                  {orderData.timeline.map((item, index) => (
                    <div key={index} className="relative group">
                      <span className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-violet-600 ring-4 ring-white" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                          <span className="font-mono text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                            <FaCalendarAlt className="w-3 h-3 text-slate-400" />
                            {new Date(item.timestamp).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{item.description}</p>
                        {item.location && (
                          <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded mt-1">
                            📍 {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic py-4">
                  Package has been prepared and is waiting for initial courier scanning updates.
                </p>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
              <h3 className="font-display font-bold text-lg uppercase text-slate-900 border-b border-slate-100 pb-4">
                Package Contents
              </h3>

              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {orderData.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-none">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 relative overflow-hidden shrink-0 border border-slate-200">
                      {item.image ? (
                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                          TOY
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        Qty: {item.quantity} × ৳{item.price}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      ৳{item.quantity * item.price}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between items-center font-mono">
                <span className="text-xs uppercase font-bold text-slate-500">Total Amount:</span>
                <span className="text-lg font-extrabold text-violet-700">৳{orderData.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-32 text-center font-mono">Loading tracking dashboard...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
