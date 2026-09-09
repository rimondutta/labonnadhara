'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home, Star } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-8 text-center bg-paper relative overflow-hidden">
      {/* Background Patterns */}
      <div className="absolute inset-0 bg-halftone opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 -right-10 text-[15rem] font-bangers text-secondary/5 rotate-12 pointer-events-none select-none">BOOM!</div>
      
      <div className="space-y-12 max-w-2xl relative z-10">
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-ink text-paper border-4 border-ink cartoon-shadow flex items-center justify-center mx-auto rotate-[-8deg] mb-8">
            <AlertTriangle size={64} />
          </div>
          <h1 className="text-8xl md:text-[10rem] font-bangers leading-none text-ink tracking-tight drop-shadow-[10px_10px_0px_#000]">ERROR</h1>
        </div>

        <div className="space-y-6">
          <h2 className="font-bangers text-5xl md:text-6xl text-ink uppercase tracking-tight">SYSTEM INTERFERENCE</h2>
          <p className="font-comic font-bold italic text-2xl text-secondary max-w-lg mx-auto leading-tight">
            An unexpected glitch has disrupted the transmission. Our agents are investigating the breach.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 pt-8">
          <Button size="lg" onClick={() => reset()}>
            <RefreshCw className="mr-3" size={24} /> RETRY SIGNAL
          </Button>
          <Link href="/products">
            <Button variant="outline" size="lg">
              <Home className="mr-3" size={24} /> BASE COMMAND
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 font-bebas text-2xl text-ink/20 tracking-widest uppercase">
         <Star size={24} /> CODE: {error.digest || 'UNKNOWN_X'} <Star size={24} />
      </div>
    </div>
  );
}
