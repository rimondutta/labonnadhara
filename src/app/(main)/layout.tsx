import TopNavbar from "@/components/layout/TopNavbar";
import Footer from "@/components/layout/Footer";
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-transparent" suppressHydrationWarning>
      <div className="flex flex-col min-h-screen" suppressHydrationWarning>
        <TopNavbar />
        <main className="flex-1 flex flex-col" suppressHydrationWarning>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
