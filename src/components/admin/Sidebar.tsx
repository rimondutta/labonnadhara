"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { 
  Home, ShoppingCart, Tag, Users, Inbox, BarChart2, 
  Megaphone, Ticket, Settings, Store, Search, Bell,
  LogOut, Plus, ChevronRight, UserPlus, Image as ImageIcon, Layers, Sliders, Truck, MessageSquare, FileText, Package
} from "lucide-react"

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const links = [
    { name: "Dashboard", href: "/admin", icon: Home },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Products", href: "/admin/products", icon: Tag },
    { name: "Variations", href: "/admin/variations", icon: Sliders },
    { name: "Categories", href: "/admin/categories", icon: Layers },
    { name: "Customers", href: "/admin/customers", icon: Users },
    { name: "Reviews", href: "/admin/reviews", icon: MessageSquare },
    { name: "Blog Posts", href: "/admin/blog", icon: FileText },
    { name: "Blog Upload", href: "/admin/blog/add", icon: Plus },
    { name: "Media Library", href: "/admin/media", icon: ImageIcon },
    { name: "Discounts", href: "/admin/coupons", icon: Ticket },
    { name: "Add User", href: "/admin/users/add", icon: UserPlus },
    { name: "Pixel Settings", href: "/admin/settings/pixel", icon: BarChart2 },
    { name: "Shipping Settings", href: "/admin/settings/shipping", icon: Truck },
    { name: "Courier APIs", href: "/admin/settings/couriers", icon: Package },
  ]

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-[260px] bg-white text-gray-700 min-h-screen flex flex-col hidden md:flex border-r border-gray-200">
      {/* Logo Area */}
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <div className="w-8 h-8 rounded overflow-hidden">
          <img src="/logo/toyhourse-logo.png" alt="Toy Hourse" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-semibold text-gray-900 leading-tight">Toy Hourse</span>
          <span className="text-xs text-gray-500 font-medium">Store Admin</span>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {links.map((link) => {
          const active = isActive(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium group relative ${
                active 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {active && <div className="absolute left-0 top-2 bottom-2 w-1 bg-gray-900 rounded-r-full" />}
              <Icon size={18} className={active ? "text-gray-900" : "text-gray-500 group-hover:text-gray-900"} />
              <span>{link.name}</span>
            </Link>
          )
        })}

        <div className="pt-6 mt-6 border-t border-gray-100">
           <p className="text-xs font-semibold text-gray-400 mb-2 px-3">Sales Channels</p>
           <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md cursor-pointer transition-colors">
              <Store size={18} className="text-gray-500" />
              <span>Online Store</span>
           </div>
        </div>
      </nav>

      {/* Footer Nav */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors w-full text-left"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 overflow-hidden shrink-0">
          {(session?.user as any)?.image ? (
            <img src={(session?.user as any).image} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            session?.user?.name?.charAt(0) || "A"
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-gray-900 truncate">{session?.user?.name || "Admin"}</span>
          <span className="text-xs text-gray-500 truncate">{session?.user?.email || "admin@example.com"}</span>
        </div>
      </div>
    </aside>
  )
}
