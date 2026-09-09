"use client"

import Link from "next/link"
import Image from "next/image"
import {
  ArrowUpRight,
  MoreHorizontal,
  Download,
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  Calendar,
  ChevronRight,
  Info,
  Plus,
  FileText
} from "lucide-react"

interface DashboardClientProps {
  totalRevenue: number;
  totalOrdersCount: number;
  totalCustomersCount: number;
  totalProductsCount: number;
  recentOrders: any[];
  topProducts: any[];
}

function StatCard({ title, value, change, icon: Icon, colorClass }: any) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`p-2 rounded-md ${colorClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mt-auto">
        <span className="text-2xl font-semibold text-gray-900">{value}</span>
        {change !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  )
}

export default function DashboardClient({
  totalRevenue,
  totalOrdersCount,
  totalCustomersCount,
  totalProductsCount,
  recentOrders,
  topProducts,
}: DashboardClientProps) {

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time store performance insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/blog" className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            <FileText size={16} />
            Blog Posts
          </Link>
          <Link href="/admin/categories" className="flex items-center gap-2 bg-gray-900 text-white border border-transparent px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-800 shadow-sm transition-colors">
            <Plus size={16} />
            Add Category
          </Link>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total revenue"
          value={`৳${Math.round(totalRevenue).toLocaleString()}`}
          change={12.5}
          icon={TrendingUp}
          colorClass="bg-green-50 text-green-600"
        />
        <StatCard
          title="Orders"
          value={totalOrdersCount.toLocaleString()}
          change={8.2}
          icon={ShoppingCart}
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Customers"
          value={totalCustomersCount.toLocaleString()}
          change={-2.4}
          icon={Users}
          colorClass="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="Products"
          value={totalProductsCount.toLocaleString()}
          icon={Package}
          colorClass="bg-orange-50 text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
            <h2 className="text-base font-semibold text-gray-900">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500">Order</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Customer</th>
                  <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <ShoppingCart size={32} className="text-gray-300" />
                        <p>No orders recorded yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-medium text-gray-900">
                          #{order._id.toString().slice(-5).toUpperCase()}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{order.customerName || "Guest User"}</div>
                        <p className="text-xs text-gray-500 truncate max-w-[140px] mt-0.5">{order.customerEmail}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        ৳{Math.round(order.totalAmount).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products / Insights */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Top products</h2>
              <Link href="/admin/products" className="text-sm font-medium text-gray-600 hover:text-gray-900">View all</Link>
            </div>
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <div key={product._id || i} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md border border-gray-200 overflow-hidden flex-shrink-0 relative bg-gray-50">
                    <Image
                      src={(product.images?.[0]?.url && (product.images[0].url.startsWith('http') || product.images[0].url.startsWith('/'))) ? product.images[0].url : "/placeholder.png"}
                      alt={product.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{product.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{Math.floor(Math.random() * 50) + 10} units sold</div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ৳{product.price.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
               <Info size={16} className="text-indigo-600" />
              <h3 className="text-sm font-semibold text-indigo-900">Tip</h3>
            </div>
            <p className="text-sm text-indigo-800 leading-relaxed">
              Customers are 20% more likely to buy when you offer free shipping on orders over ৳5000.
            </p>
            <button className="mt-4 w-full py-2 bg-white text-indigo-700 border border-indigo-200 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm">
              Setup shipping rule
            </button>
          </div> */}
        </div>
      </div>
    </div>
  )
}
