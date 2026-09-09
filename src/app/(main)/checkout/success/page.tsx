"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Package, Truck, Calendar, ShoppingBag, Star } from "lucide-react";
import { Suspense } from "react";
import { m } from "framer-motion";
import Button from "@/components/ui/Button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  return (
    <div className="max-w-5xl mx-auto px-8 py-24 lg:py-40 flex flex-col items-center text-center relative z-10">
      <m.div 
        initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="w-32 h-32 mb-10 bg-ink text-paper border-4 border-ink cartoon-shadow flex items-center justify-center rotate-[-5deg]"
      >
         <CheckCircle2 size={64} />
      </m.div>

      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        <h1 className="font-bangers text-7xl lg:text-9xl text-ink uppercase tracking-tight leading-none drop-shadow-[8px_8px_0px_#000]">
            MISSION ACCOMPLISHED
        </h1>
        <p className="font-comic font-bold italic text-2xl text-secondary max-w-2xl mx-auto leading-tight">
            Your gear request <span className="text-ink">#{orderId?.slice(-8).toUpperCase() || "ALPHA-01"}</span> has been successfully logged. The extraction is underway.
        </p>
      </m.div>

      <m.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-20 mb-20"
      >
         {[
           { icon: Package, title: "PROCESSING", desc: "2-4 HOURS", rotate: "-2deg" },
           { icon: Truck, title: "EXTRACTION", desc: "48-72 HOURS", rotate: "3deg" },
           { icon: Calendar, title: "ETA", desc: "INCOMING SOON", rotate: "-1deg" },
         ].map((item, idx) => (
           <div key={idx} className="bg-white p-10 border-4 border-ink cartoon-shadow flex flex-col items-center gap-6 group hover:translate-y-[-8px] transition-all" style={{ transform: `rotate(${item.rotate})` }}>
              <div className="w-16 h-16 bg-surface border-3 border-ink flex items-center justify-center text-ink group-hover:bg-ink group-hover:text-paper transition-colors">
                  <item.icon size={32} />
              </div>
              <div className="space-y-1">
                  <h3 className="font-bebas text-2xl tracking-widest text-ink uppercase">{item.title}</h3>
                  <p className="font-bangers text-3xl text-secondary tracking-tight uppercase leading-none">{item.desc}</p>
              </div>
           </div>
         ))}
      </m.div>

      <m.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap justify-center gap-6 mt-8"
      >
         {orderId && (
           <Link href={`/invoice/${orderId}`} target="_blank">
              <Button variant="outline" size="lg" className="border-stamp-red text-stamp-red hover:bg-stamp-red hover:text-paper">
                DOWNLOAD INVOICE
              </Button>
           </Link>
         )}
         <Link href="/products">
            <Button size="lg">CONTINUE SCOUTING</Button>
         </Link>
         <Link href="/account">
            <Button variant="outline" size="lg">VIEW DOSSIER</Button>
         </Link>
      </m.div>
      
      {/* Decorative Stars */}
      <div className="absolute top-1/4 left-10 text-6xl text-ink/5 animate-float"><Star size={64} fill="currentColor" /></div>
      <div className="absolute bottom-1/4 right-10 text-6xl text-ink/5 animate-float" style={{ animationDelay: '1s' }}><Star size={64} fill="currentColor" /></div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-paper relative overflow-hidden">
      <div className="absolute inset-0 bg-halftone opacity-5 pointer-events-none" />
      <Suspense fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 bg-ink animate-float border-4 border-ink cartoon-shadow" />
          <h2 className="font-bangers text-4xl text-ink">LOGGING MISSION...</h2>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
