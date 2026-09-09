"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Filter, Eye, Trash2, Download } from "lucide-react"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = () => {
    fetch("/api/admin/orders")
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const deleteOrder = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchOrders();
      } else {
        alert("Failed to delete order");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting order");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <div className="flex flex-wrap gap-3">
          <button className="bg-white border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 shadow-sm transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex items-center px-4 pt-2 border-b border-gray-200 gap-4">
          <button className="text-sm font-medium text-gray-900 border-b-2 border-gray-900 pb-3 px-1">All</button>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent pb-3 px-1 transition-colors">Pending</button>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent pb-3 px-1 transition-colors">Shipped</button>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent pb-3 px-1 transition-colors">Delivered</button>
        </div>

        {/* Search Bar */}
        <div className="p-4 flex flex-col md:flex-row items-center gap-3 border-b border-gray-200 bg-white">
          <div className="relative flex-1 w-full max-w-2xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search orders..." 
              className="w-full !bg-white border border-gray-300 rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow placeholder:text-gray-400 !text-black"
            />
          </div>
          <button className="flex items-center gap-2 bg-white border border-gray-300 rounded-md p-1.5 hover:bg-gray-50 text-gray-500 shadow-sm transition-colors">
            <Filter size={16} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 w-12">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                </th>
                <th className="px-5 py-3 font-medium text-gray-500">Order ID</th>
                <th className="px-5 py-3 font-medium text-gray-500">Customer</th>
                <th className="px-5 py-3 font-medium text-gray-500">Date</th>
                <th className="px-5 py-3 font-medium text-gray-500">Total</th>
                <th className="px-5 py-3 font-medium text-gray-500">Fulfillment</th>
                <th className="px-5 py-3 font-medium text-gray-500">Payment</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                    <p>Loading orders...</p>
                  </div>
                </td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No orders found</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 group transition-colors">
                    <td className="px-5 py-4">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{order.customerEmail || 'No Email'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{order.shippingAddress?.phone || 'No phone saved'}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">
                      ৳{order.totalAmount?.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.fulfillmentStatus === 'delivered' ? 'bg-green-100 text-green-800' : 
                        order.fulfillmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.fulfillmentStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.fulfillmentStatus ? order.fulfillmentStatus.charAt(0).toUpperCase() + order.fulfillmentStatus.slice(1) : 'Unfulfilled'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.paymentStatus ? order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1) : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        <Link 
                          href={`/admin/orders/${order._id}`} 
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          title="View Order"
                        >
                          <Eye size={16} />
                        </Link>
                        <a
                          href={`/api/orders/${order._id}/invoice`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={`Invoice-${order.invoiceNumber || order._id}.pdf`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Download Invoice PDF"
                        >
                          <Download size={16} />
                        </a>
                        <button 
                          onClick={() => deleteOrder(order._id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
