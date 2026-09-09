"use client";

import React, { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Send, Mail, Phone, MapPin, Globe, CheckCircle, Loader2 } from "lucide-react";
import { trackContact } from "@/lib/fbPixel";

const contactInfo = [
  {
    icon: Mail,
    label: "Email Us",
    value: "hello@toyhourse.com",
    detail: "Response within 24 hours",
    href: "mailto:hello@toyhourse.com",
    color: "#FFC93C",
  },
  {
    icon: Phone,
    label: "Call Us",
    value: "+1 800 TOY HOURSE",
    detail: "Mon – Fri, 9am – 6pm EST",
    href: "tel:+18008694678",
    color: "#4ECDC4",
  },
  {
    icon: MapPin,
    label: "Visit Us",
    value: "Dhaka, Bangladesh",
    detail: "Global shipping available",
    href: "#",
    color: "#FF6B5D",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    orderId: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1400));
    setSubmitting(false);
    setSubmitted(true);
    try { trackContact(); } catch { /* noop */ }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Subtle ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #FFC93C 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #4ECDC4 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-32">
        {/* ── Header ── */}
        <div className="mb-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-100 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ECDC4] animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.15em] text-neutral-500 uppercase">
              Support Center
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-black leading-[1.05] tracking-tight mb-6">
            Let&apos;s{" "}
            <span className="relative inline-block">
              <span
                className="relative z-10"
                style={{
                  backgroundImage: "linear-gradient(135deg, #FFC93C 0%, #FF6B5D 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                talk
              </span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="6"
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,4 Q25,0 50,4 Q75,8 100,4"
                  stroke="#FFC93C"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.6"
                />
              </svg>
            </span>
          </h1>
          <p className="text-lg text-neutral-500 leading-relaxed max-w-lg">
            Whether you have a question about an order, a product, or just want
            to say hi — we&apos;re here and ready to help.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* ── Contact Form ── */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-sm p-8 md:p-10">
              {/* top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: "linear-gradient(90deg, #FFC93C, #FF6B5D)" }}
              />

              <AnimatePresence mode="wait">
                {!submitted ? (
                  <m.form
                    key="form"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-xl font-bold text-black mb-1">
                        Send us a message
                      </h2>
                      <p className="text-sm text-neutral-500">
                        Fill in the form below and we&apos;ll get back to you promptly.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        label="First Name"
                        placeholder="Bruce"
                        value={form.firstName}
                        onChange={(v) => update("firstName", v)}
                        required
                      />
                      <FormField
                        label="Last Name"
                        placeholder="Wayne"
                        value={form.lastName}
                        onChange={(v) => update("lastName", v)}
                        required
                      />
                    </div>

                    <FormField
                      label="Email Address"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(v) => update("email", v)}
                      required
                    />

                    <FormField
                      label="Order ID (optional)"
                      placeholder="#ORD-XXXXXXXX"
                      value={form.orderId}
                      onChange={(v) => update("orderId", v)}
                    />

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                        Message
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Tell us how we can help you…"
                        value={form.message}
                        onChange={(e) => update("message", e.target.value)}
                        required
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 text-sm text-black placeholder:text-neutral-400 outline-none focus:border-[#FFC93C] focus:ring-1 focus:ring-[#FFC93C]/30 transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-black transition-all duration-200 disabled:opacity-70 hover:shadow-md"
                      style={{ background: "linear-gradient(135deg, #FFC93C 0%, #F5A623 100%)" }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send
                            size={16}
                            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </>
                      )}
                    </button>
                  </m.form>
                ) : (
                  <m.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center text-center py-16 gap-6"
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center bg-[#4ECDC4]/10 border border-[#4ECDC4]/30"
                    >
                      <CheckCircle size={36} className="text-[#4ECDC4]" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-black mb-2">
                        Message received!
                      </h3>
                      <p className="text-neutral-500 max-w-xs text-sm leading-relaxed">
                        Thanks for reaching out. We&apos;ll respond to{" "}
                        <span className="text-black font-medium">{form.email}</span>{" "}
                        within 24 hours.
                      </p>
                    </div>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-sm text-neutral-400 hover:text-black transition-colors underline underline-offset-4"
                    >
                      Send another message
                    </button>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Right Side Info ── */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Contact cards */}
            {contactInfo.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="group flex items-start gap-4 p-5 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 hover:shadow-sm transition-all duration-200"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                    style={{
                      background: `${item.color}18`,
                      border: `1px solid ${item.color}30`,
                    }}
                  >
                    <Icon size={20} style={{ color: item.color }} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-base font-semibold text-black truncate">
                      {item.value}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5">{item.detail}</p>
                  </div>
                </a>
              );
            })}

            {/* Global network card */}
            <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50 p-6 mt-2">
              <div className="flex items-center gap-3 mb-4">
                <Globe size={22} className="text-[#FFC93C]" strokeWidth={1.8} />
                <h3 className="text-base font-bold text-black">
                  Worldwide Shipping
                </h3>
              </div>
              <p className="text-sm text-neutral-500 leading-relaxed mb-5">
                We ship to 50+ countries. Orders above ৳8,000 qualify for
                free shipping anywhere in Bangladesh.
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4ECDC4] animate-pulse" />
                <span className="text-xs font-semibold text-[#4ECDC4] uppercase tracking-widest">
                  Shipping Active
                </span>
              </div>
            </div>

            {/* FAQ shortcut */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 bg-white group hover:border-neutral-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-black">
                  Check our FAQ
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Quick answers to common questions
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center transition-all duration-200">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-neutral-500 group-hover:text-black transition-colors"
                >
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  required,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-widest">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 text-sm text-black placeholder:text-neutral-400 outline-none focus:border-[#FFC93C] focus:ring-1 focus:ring-[#FFC93C]/30 transition-all"
      />
    </div>
  );
}
