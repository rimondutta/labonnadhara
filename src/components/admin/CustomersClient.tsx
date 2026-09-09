"use client"

import { useState, useEffect } from "react"
import { Users, Mail, ShoppingBag, Calendar, ArrowUpRight } from "lucide-react"

interface Customer {
  _id: string
  name: string
  email: string
  ordersCount: number
  totalSpent: number
  createdAt: string
  lastOrderDate?: string
}

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/customers")
      if (!res.ok) throw new Error("Failed to fetch customers")
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Error loading customers: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your registered users and view their purchase history.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Registered On</th>
                <th className="px-6 py-4 text-center">Total Orders</th>
                <th className="px-6 py-4 text-right">Total Spent</th>
                <th className="px-6 py-4 text-right">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.email} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold shrink-0">
                          {customer.name?.charAt(0).toUpperCase() || customer.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-gray-900 truncate">{customer.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                            <Mail size={12} />
                            {customer.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          <ShoppingBag size={12} />
                          {customer.ordersCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ৳{customer.totalSpent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 text-xs">
                      {customer.lastOrderDate ? (
                        <div className="flex items-center justify-end gap-1">
                          <Calendar size={12} />
                          {new Date(customer.lastOrderDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
