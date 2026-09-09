import React from "react"
import { Metadata } from "next"
import { UserPlus } from "lucide-react"

export const metadata: Metadata = {
  title: "Add User | Toy Hourse Admin",
}

export default function AddUserPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-md flex items-center justify-center border border-gray-200">
          <UserPlus size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Add New User</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new admin or customer account</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <form className="space-y-5">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 block">First Name</label>
              <input type="text" className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" placeholder="John" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 block">Last Name</label>
              <input type="text" className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" placeholder="Doe" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Email Address</label>
            <input type="email" className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" placeholder="john@example.com" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Role</label>
            <select className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none cursor-pointer">
              <option value="customer">Customer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block">Password</label>
            <input type="password" className="w-full !bg-white !text-black border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-gray-400" placeholder="••••••••" />
          </div>

          <div className="pt-2">
            <button type="button" className="w-full bg-gray-900 text-white text-sm font-medium py-2 rounded-md hover:bg-gray-800 transition-colors shadow-sm">
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
