"use client";

import React, { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Send, Mail, Phone, MapPin, CheckCircle, Loader2, MessageCircleHeart } from "lucide-react";
import { trackContact } from "@/lib/fbPixel";

const contactInfo = [
  {
    icon: Phone,
    label: "WhatsApp / Call",
    value: "+880 1863-230150",
    detail: "Sat – Thu, 10am – 8pm",
    href: "https://wa.me/8801863230150",
  },
  {
    icon: Mail,
    label: "Email Us",
    value: "hello@labonnadhara.com",
    detail: "Response within 24 hours",
    href: "mailto:hello@labonnadhara.com",
  },
  {
    icon: MapPin,
    label: "Find Us",
    value: "Chattogram, Bangladesh",
    detail: "Nationwide delivery available",
    href: "#",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
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
    <div className="min-h-screen bg-[#FFF1F6] relative overflow-hidden">

      {/* Ambient decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, #FDDDE6 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #FDD5E5 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #C9A24D20 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-32 md:pt-40 pb-32">

        {/* ── Header ── */}
        <m.div
          className="mb-14 max-w-3xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#F3D6E2] bg-white/80 mb-6 shadow-sm">
            <MessageCircleHeart size={14} className="text-[#D62B72]" />
            <span className="text-[11px] font-sans font-bold tracking-[0.15em] text-[#D62B72] uppercase">
              We&apos;d love to hear from you
            </span>
          </div>

          <h1 className="font-serif font-bold text-5xl md:text-6xl lg:text-7xl text-[#252B3A] leading-[1.05] tracking-tight mb-5">
            Get in{" "}
            <span className="relative inline-block">
              <span
                style={{
                  backgroundImage: "linear-gradient(135deg, #D62B72 0%, #C51F63 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Touch
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 100 6" preserveAspectRatio="none">
                <path d="M0,4 Q25,0 50,4 Q75,8 100,4" stroke="#D62B72" strokeWidth="2" fill="none" opacity="0.5" />
              </svg>
            </span>
          </h1>
          <p className="font-sans text-lg text-[#4B5563] leading-relaxed max-w-lg">
            Have a question about an order, need help finding the perfect piece, or just want to say hello? We&apos;re here and happy to help.
          </p>
        </m.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          {/* ── Contact Form ── */}
          <m.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          >
            <div className="relative rounded-[28px] overflow-hidden border border-[#F3D6E2] bg-white shadow-sm shadow-pink-100 p-8 md:p-10">
              {/* top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: "linear-gradient(90deg, #D62B72, #C9A24D)" }} />

              <AnimatePresence mode="wait">
                {!submitted ? (
                  <m.form
                    key="form"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="font-serif font-bold text-2xl text-[#252B3A] mb-1">
                        Send us a message
                      </h2>
                      <p className="font-sans text-sm text-[#4B5563]">
                        Fill in the form below and we&apos;ll get back to you promptly.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="First Name" placeholder="Your first name" value={form.firstName} onChange={(v) => update("firstName", v)} required />
                      <FormField label="Last Name" placeholder="Your last name" value={form.lastName} onChange={(v) => update("lastName", v)} required />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={(v) => update("email", v)} required />
                      <FormField label="Phone Number" type="tel" placeholder="+880 1XXXXXXXXX" value={form.phone} onChange={(v) => update("phone", v)} />
                    </div>

                    <FormField label="Order ID (optional)" placeholder="#ORD-XXXXXXXX" value={form.orderId} onChange={(v) => update("orderId", v)} />

                    <div className="space-y-2">
                      <label className="block text-xs font-sans font-semibold text-[#4B5563] uppercase tracking-widest">
                        Message
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Tell us how we can help you…"
                        value={form.message}
                        onChange={(e) => update("message", e.target.value)}
                        required
                        className="w-full bg-[#FFF8FB] border border-[#F3D6E2] rounded-xl px-4 py-3.5 text-sm font-sans text-[#252B3A] placeholder:text-[#9CA3AF] outline-none focus:border-[#D62B72] focus:ring-1 focus:ring-[#D62B72]/20 transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="group flex items-center gap-2.5 px-8 py-3.5 rounded-full font-sans font-bold text-[15px] text-[#D62B72] bg-white border-2 border-[#D62B72] transition-all duration-200 disabled:opacity-70 hover:bg-[#D62B72] hover:text-white hover:shadow-lg hover:shadow-pink-500/25 hover:-translate-y-0.5"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send size={16} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[#D62B72]/10 border border-[#D62B72]/20">
                      <CheckCircle size={36} className="text-[#D62B72]" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-2xl text-[#252B3A] mb-2">
                        Message received! 💌
                      </h3>
                      <p className="font-sans text-[#4B5563] max-w-xs text-sm leading-relaxed">
                        Thanks for reaching out. We&apos;ll respond to{" "}
                        <span className="text-[#D62B72] font-semibold">{form.email}</span>{" "}
                        within 24 hours.
                      </p>
                    </div>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="font-sans text-sm text-[#D62B72] hover:text-[#C51F63] transition-colors underline underline-offset-4"
                    >
                      Send another message
                    </button>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>

          {/* ── Right Side Info ── */}
          <m.div
            className="lg:col-span-5 flex flex-col gap-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            {/* Contact info cards */}
            {contactInfo.map((item, i) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 p-5 rounded-2xl border border-[#F3D6E2] bg-white hover:bg-[#FFF0F5] hover:border-[#D62B72]/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#FFF0F5] border border-[#F3D6E2] group-hover:bg-[#D62B72]/10 group-hover:border-[#D62B72]/20 transition-all duration-200">
                    <Icon size={20} className="text-[#D62B72]" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans text-xs font-semibold text-[#4B5563] uppercase tracking-widest mb-0.5">
                      {item.label}
                    </p>
                    <p className="font-sans text-base font-semibold text-[#252B3A] truncate">
                      {item.value}
                    </p>
                    <p className="font-sans text-xs text-[#9CA3AF] mt-0.5">{item.detail}</p>
                  </div>
                </a>
              );
            })}

            {/* Social quick links */}
            <div className="rounded-2xl border border-[#F3D6E2] bg-white p-6 mt-1">
              <p className="font-serif font-bold text-lg text-[#252B3A] mb-1">Follow Us</p>
              <p className="font-sans text-sm text-[#4B5563] mb-5">
                Stay connected for the latest designs, offers, and updates.
              </p>
              <div className="flex gap-3 flex-wrap">
                <a
                  href="https://www.facebook.com/labonnadhara"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#F3D6E2] bg-[#FFF0F5] hover:bg-[#D62B72] hover:border-[#D62B72] hover:text-white text-[#D62B72] text-[13px] font-sans font-bold transition-all duration-200 group"
                >
                  <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                  Facebook
                </a>
                <a
                  href="https://www.instagram.com/labonnadhara"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#F3D6E2] bg-[#FFF0F5] hover:bg-[#D62B72] hover:border-[#D62B72] hover:text-white text-[#D62B72] text-[13px] font-sans font-bold transition-all duration-200"
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                  Instagram
                </a>
                <a
                  href="https://wa.me/8801863230150"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#F3D6E2] bg-[#FFF0F5] hover:bg-[#D62B72] hover:border-[#D62B72] hover:text-white text-[#D62B72] text-[13px] font-sans font-bold transition-all duration-200"
                >
                  <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Delivery info card */}
            <div className="relative rounded-2xl overflow-hidden border border-[#F3D6E2] bg-white p-6"
              style={{ background: "linear-gradient(135deg, #D62B72 0%, #C51F63 100%)" }}
            >
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-3">
                <svg width="20" height="20" viewBox="0 0 50 50" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M33 8H5a2 2 0 0 0-2 2v22h2" /><path d="M3 32h30V10" /><path d="M33 18h8l6 8v6h-4" />
                  <path d="M33 32h10" /><circle cx="13" cy="35" r="4" /><circle cx="39" cy="35" r="4" />
                  <path d="M9 32H3" />
                </svg>
                <h3 className="font-serif font-bold text-lg text-white">Fast Nationwide Delivery</h3>
              </div>
              <p className="font-sans text-sm text-white/80 leading-relaxed mb-4">
                We deliver across Bangladesh. Chattogram & Chattogram orders get same-day or next-day shipping!
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="font-sans text-xs font-bold text-white uppercase tracking-widest">
                  Delivery Active
                </span>
              </div>
            </div>
          </m.div>
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
      <label className="block font-sans text-xs font-semibold text-[#4B5563] uppercase tracking-widest">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-[#FFF8FB] border border-[#F3D6E2] rounded-xl px-4 py-3.5 font-sans text-sm text-[#252B3A] placeholder:text-[#9CA3AF] outline-none focus:border-[#D62B72] focus:ring-1 focus:ring-[#D62B72]/20 transition-all"
      />
    </div>
  );
}
