import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Invoice | Toy Hourse",
  description: "Your order receipt from Toy Hourse.",
};

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
