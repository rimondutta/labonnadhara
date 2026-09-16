"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { PageLoader } from "@/components/ui/Loader";
import ProductCardNike from "@/components/ui/product-card-rimon";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Heart, 
  Settings, 
  LogOut, 
  User,
  Package,
  ChevronRight,
  Clock,
  Download,
  Truck,
} from "lucide-react";


export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const { items: wishlistIds, count: wishlistCount } = useWishlist();
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/account");
    if (status === "authenticated") fetchOrders();
  }, [status]);

  useEffect(() => {
    if (activeTab === "wishlist" && wishlistIds.length > 0) fetchWishlistProducts();
  }, [activeTab, wishlistIds]);

  const fetchWishlistProducts = async () => {
    setWishlistLoading(true);
    try {
      const res = await fetch(`/api/store/products?ids=${wishlistIds.join(",")}`);
      const data = await res.json();
      if (data.products) setWishlistProducts(data.products);
    } catch (err) { console.error(err); }
    finally { setWishlistLoading(false); }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/store/orders/user");
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (status === "loading") return <PageLoader />;
  if (!session) return null;

  const tabs = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ShoppingBag, count: orders.length },
    { id: "wishlist", label: "Wishlist", icon: Heart, count: wishlistCount },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FFF1F6] font-body pb-24">
      {/* Header */}
      <div className="bg-[#FFF8FB] border-b border-[#F3D6E2]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold font-serif text-[#252B3A] tracking-tight">My Account</h1>
          <p className="text-[#4B5563] mt-2">Welcome back, {session.user?.name || "Customer"}</p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-8 md:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <nav className="flex flex-col gap-1 sticky top-24">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    activeTab === tab.id
                      ? "bg-[#D62B72]/10 text-[#D62B72]"
                      : "text-[#4B5563] hover:bg-[#FFF8FB] hover:text-[#D62B72]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={activeTab === tab.id ? "text-[#D62B72]" : "text-[#9CA3AF]"} />
                    {tab.label}
                  </div>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-[#D62B72] text-white py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
            
            <hr className="my-4 border-[#F3D6E2]" />
            
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <m.div 
                key="overview" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                  {[
                    { label: "Total Orders", value: orders.length, icon: Package },
                    { label: "Wishlisted Items", value: wishlistCount, icon: Heart },
                    { label: "Account Status", value: "Active", icon: User },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="bg-white rounded-xl border border-[#F3D6E2] p-6 flex flex-col shadow-sm shadow-pink-500/5">
                        <div className="flex items-center gap-3 text-[#4B5563] mb-4">
                          <Icon size={20} className="text-[#C9A24D]" />
                          <span className="text-sm font-medium">{stat.label}</span>
                        </div>
                        <div className="text-2xl font-bold text-[#252B3A] mt-auto">
                          {stat.value}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recent Order Panel */}
                {orders.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#F3D6E2] shadow-sm shadow-pink-500/5 overflow-hidden">
                    <div className="border-b border-[#F3D6E2] p-6 flex items-center justify-between">
                       <h3 className="text-lg font-bold text-[#252B3A] flex items-center gap-2">
                         <Clock size={20} className="text-[#9CA3AF]" /> Recent Order
                       </h3>
                       <button onClick={() => setActiveTab("orders")} className="text-sm font-medium text-[#D62B72] hover:text-[#C51F63] transition-colors flex items-center gap-1">
                         View all <ChevronRight size={16} />
                       </button>
                    </div>
                    <div className="p-6">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                          ["Order ID", `#${orders[0]._id.slice(-8).toUpperCase()}`],
                          ["Status", orders[0].paymentStatus?.charAt(0).toUpperCase() + orders[0].paymentStatus?.slice(1) || "Pending"],
                          ["Total", `Tk. ${orders[0].totalAmount?.toLocaleString()}`],
                          ["Items", `${orders[0].items?.length || 0}`],
                        ].map(([label, value]) => (
                          <div key={label} className="space-y-1">
                            <span className="text-sm font-medium text-[#4B5563]">{label}</span>
                            <span className="block font-medium text-[#252B3A]">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </m.div>
            )}

            {/* ── ORDERS ── */}
            {activeTab === "orders" && (
              <m.div 
                key="orders" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold font-serif text-[#252B3A] tracking-tight">Order History</h2>
                </div>

                {loading ? <PageLoader /> : orders.length === 0 ? (
                  <div className="bg-white rounded-xl border border-[#F3D6E2] p-12 text-center shadow-sm">
                    <Package className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#252B3A] mb-2">No orders yet</h3>
                    <p className="text-[#4B5563] mb-6 max-w-sm mx-auto">When you place an order, it will appear here so you can track its status.</p>
                    <Link href="/products" className="inline-flex items-center justify-center rounded-lg bg-[#D62B72] hover:bg-[#C51F63] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-pink-500/20 transition-colors">
                      Start shopping
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order._id} className="bg-white rounded-xl border border-[#F3D6E2] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md hover:border-[#D62B72]/30 transition-all">
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-3">
                             <span className="font-bold text-[#252B3A]">#{order._id.slice(-8).toUpperCase()}</span>
                             <span className="w-1.5 h-1.5 rounded-full bg-[#F3D6E2]" />
                             <span className="text-sm text-[#4B5563]">{new Date(order.createdAt).toLocaleDateString()}</span>
                           </div>
                           <div className="flex items-center gap-2 mt-1">
                             <span className={cn(
                               "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                               order.paymentStatus === "paid" ? "bg-[#C9A24D]/10 text-[#C9A24D]" : "bg-yellow-100 text-yellow-800"
                             )}>
                               {order.paymentStatus?.charAt(0).toUpperCase() + order.paymentStatus?.slice(1)}
                             </span>
                           </div>
                        </div>
                        
                        <div className="flex flex-col md:items-end gap-3">
                           <span className="font-bold text-[#252B3A]">Tk. {order.totalAmount?.toLocaleString()}</span>
                           <div className="flex -space-x-2 overflow-hidden">
                             {order.items?.slice(0, 4).map((item: any, i: number) => (
                               <img key={i} src={item.image || "/placeholder-product.jpg"} alt={item.title || ""} onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.jpg"; }} className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover bg-[#FFF8FB]" />
                             ))}
                             {order.items?.length > 4 && (
                               <div className="inline-flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-[#FFF8FB] text-xs font-medium text-[#D62B72]">
                                 +{order.items.length - 4}
                               </div>
                             )}
                           </div>
                           <div className="flex items-center gap-2">
                             <Link
                               href={`/track-order?id=${order.invoiceNumber || order._id}`}
                               className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#D62B72] bg-[#D62B72]/10 hover:bg-[#D62B72] hover:text-white rounded-lg transition-colors border border-[#F3D6E2]"
                               title="Live Track Package"
                             >
                               <Truck size={12} />
                               Track Live
                             </Link>
                             <a
                               href={`/api/orders/${order._id}/invoice`}
                               target="_blank"
                               rel="noopener noreferrer"
                               download={`Invoice-${order.invoiceNumber || order._id}.pdf`}
                               className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4B5563] bg-[#FFF8FB] hover:bg-[#F3D6E2] rounded-lg transition-colors border border-[#F3D6E2]"
                               title="Download Invoice PDF"
                             >
                               <Download size={12} />
                               Invoice PDF
                             </a>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </m.div>
            )}

            {/* ── WISHLIST ── */}
            {activeTab === "wishlist" && (
              <m.div 
                key="wishlist" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold font-serif text-[#252B3A] tracking-tight">Wishlist</h2>
                </div>

                {wishlistLoading ? <PageLoader /> : wishlistProducts.length === 0 ? (
                  <div className="bg-white rounded-xl border border-[#F3D6E2] p-12 text-center shadow-sm">
                    <Heart className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#252B3A] mb-2">Your wishlist is empty</h3>
                    <p className="text-[#4B5563] mb-6 max-w-sm mx-auto">Save items you love to your wishlist to buy them later.</p>
                    <Link href="/products" className="inline-flex items-center justify-center rounded-lg bg-[#D62B72] hover:bg-[#C51F63] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-pink-500/20 transition-colors">
                      Explore products
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {wishlistProducts.map((product) => (
                      <div key={product._id} className="h-[400px]">
                        <ProductCardNike product={product} />
                      </div>
                    ))}
                  </div>
                )}
              </m.div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === "settings" && (
              <m.div 
                key="settings" 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold font-serif text-[#252B3A] tracking-tight">Account Settings</h2>
                </div>

                <div className="bg-white rounded-xl border border-[#F3D6E2] shadow-sm overflow-hidden">
                  <div className="p-6 md:p-8 space-y-8">
                     
                     <div className="space-y-4">
                       <h3 className="text-lg font-medium text-[#252B3A]">Profile Information</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-1.5">
                           <label className="block text-sm font-medium text-[#4B5563]">Name</label>
                           <input type="text" disabled value={session.user?.name || ""} className="w-full bg-[#FFF8FB] text-[#9CA3AF] rounded-lg border border-[#F3D6E2] px-3 py-2.5 text-sm cursor-not-allowed" />
                         </div>
                         <div className="space-y-1.5">
                           <label className="block text-sm font-medium text-[#4B5563]">Email address</label>
                           <input type="email" disabled value={session.user?.email || ""} className="w-full bg-[#FFF8FB] text-[#9CA3AF] rounded-lg border border-[#F3D6E2] px-3 py-2.5 text-sm cursor-not-allowed" />
                         </div>
                       </div>
                     </div>

                     <hr className="border-[#F3D6E2]" />

                     <div className="space-y-4">
                       <h3 className="text-lg font-medium text-[#252B3A]">Security</h3>
                       <p className="text-sm text-[#4B5563] max-w-xl">
                         To update your password or change other security settings, please contact support.
                       </p>
                       <button disabled className="inline-flex items-center justify-center rounded-lg bg-[#FFF8FB] border border-[#F3D6E2] px-4 py-2.5 text-sm font-medium text-[#9CA3AF] shadow-sm cursor-not-allowed">
                         Update password
                       </button>
                     </div>

                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
