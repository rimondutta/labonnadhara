"use client";

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Search, Bell, HelpCircle, Menu } from "lucide-react"
import AdminMobileSidebar from "./AdminMobileSidebar"

export default function TopBar() {
  const { data: session } = useSession()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <>
      <AdminMobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex-1 max-w-[600px] hidden sm:block">
          <div className="relative group">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full !bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-2 pl-10 pr-4 text-sm rounded-md transition-all outline-none placeholder:text-gray-500 !text-black"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-gray-900 text-base">Toy Hourse</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center gap-1">
              <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                <HelpCircle size={20} />
              </button>
          </div>
          
          <div className="w-px h-6 bg-gray-200 mx-2 hidden md:block" />
          
          <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-md hover:bg-gray-50 transition-colors group">
            <div className="flex flex-col items-end hidden lg:flex">
              <span className="text-sm font-medium text-gray-900">{session?.user?.name || "Admin User"}</span>
              <span className="text-xs text-gray-500">Store Manager</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 overflow-hidden shrink-0">
              {(session?.user as any)?.image ? (
                <img src={(session?.user as any).image} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                session?.user?.name?.charAt(0) || "A"
              )}
            </div>
          </button>
        </div>
      </header>
    </>
  )
}
