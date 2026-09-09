import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-8 text-center relative overflow-hidden bg-paper">
      {/* Background Patterns */}
      <div className="absolute inset-0 bg-halftone opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 -left-20 text-[20rem] font-bangers text-ink/5 rotate-[-15deg] pointer-events-none select-none">?</div>
      <div className="absolute bottom-1/4 -right-20 text-[20rem] font-bangers text-ink/5 rotate-[15deg] pointer-events-none select-none">!</div>

      <div className="space-y-12 max-w-2xl relative z-10">
        <div className="relative inline-block">
          <h1 className="text-[12rem] md:text-[16rem] font-bangers leading-none text-ink tracking-tight drop-shadow-[12px_12px_0px_#000] animate-float">404</h1>
          <div className="absolute -top-4 -right-4 bg-white border-4 border-ink px-6 py-2 cartoon-shadow-sm rotate-12">
            <span className="font-bangers text-4xl text-ink">WHOOPS!</span>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="font-bangers text-5xl md:text-6xl text-ink uppercase tracking-tight">COORDINATES LOST</h2>
          <p className="font-comic font-bold italic text-2xl text-secondary max-w-lg mx-auto leading-tight">
            The transmission you're looking for has been intercepted or never existed in the archives.
          </p>
        </div>

        <div className="pt-8 flex flex-wrap justify-center gap-6">
          <Link href="/products">
            <Button size="lg">RETURN TO SHOP</Button>
          </Link>
          <Link href="/">
             <Button variant="outline" size="lg">BASE COMMAND</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
