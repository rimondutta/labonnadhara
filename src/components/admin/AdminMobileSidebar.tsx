"use client"

import { Fragment } from "react"
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react"
import { X, Home, ShoppingCart, Tag, Users, Ticket, UserPlus, Image as ImageIcon, Settings, LogOut, Store, Layers, MessageSquare, Sliders, Megaphone, BarChart2, Truck, FileText, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

interface AdminMobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminMobileSidebar({ isOpen, onClose }: AdminMobileSidebarProps) {
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
  ]

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[999]">
        <TransitionChild
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        <TransitionChild
          as={Fragment}
          enter="transform transition ease-in-out duration-300"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition ease-in-out duration-200"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <DialogPanel className="fixed inset-y-0 left-0 w-[280px] bg-white text-gray-700 flex flex-col shadow-2xl border-r border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded overflow-hidden">
                  <img src="/logo/toyhourse-logo.png" alt="Toy Hourse" className="w-full h-full object-contain" />
                </div>
                <span className="text-base font-semibold text-gray-900 leading-none">Toy Hourse</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
              {links.map((link) => {
                const active = isActive(link.href)
                const Icon = link.icon
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={onClose}
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
            </nav>

            {/* User Info / Logout */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-4">
              <div className="flex items-center gap-3">
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
              
              <button
                onClick={() => {
                   onClose();
                   signOut();
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors w-full text-left"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </Dialog>
    </Transition>
  )
}
