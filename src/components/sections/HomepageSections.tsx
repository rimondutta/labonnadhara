"use client";

import React from "react";
import Link from "next/link";
import { Truck, Headphones, ShieldCheck } from "lucide-react";

function UnderlineLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`relative inline-block text-current no-underline group ${className}`}>
      {children}
      <span className="absolute left-0 -bottom-1 w-3/4 h-[2px] bg-current transition-[width] duration-200 ease-in-out group-hover:w-full" />
    </Link>
  );
}

export function ServicesStrip() {
  return (
    <section className="px-4 sm:px-10 lg:px-40 py-16 md:py-20 border-t border-neutral-200">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
        {[
          {
            Icon: Truck,
            title: "Fast And Free Delivery",
            desc: "Free delivery for all orders over Tk. 1,500",
          },
          {
            Icon: Headphones,
            title: "24/7 Customer Support",
            desc: "Friendly 24/7 customer support",
          },
          {
            Icon: ShieldCheck,
            title: "Money Back Guarantee",
            desc: "We return money within 30 days",
          },
        ].map(({ Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-center gap-4">
            <Icon size={50} strokeWidth={1} className="text-black" />
            <h3 className="uppercase font-medium text-black text-base tracking-wide">{title}</h3>
            <p className="text-[#767676] text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
