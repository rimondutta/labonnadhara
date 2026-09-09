"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, Plus, Edit, Trash2, Filter, MoreHorizontal, ChevronRight } from "lucide-react"

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.products) setProducts(data.products)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }
    
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete product");
      
      setProducts(products.filter(p => p._id !== id));
    } catch(err) {
      console.error("Delete error:", err);
      alert("Failed to delete product.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <div className="flex flex-wrap gap-3">
          <button className="bg-white border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 shadow-sm transition-colors">
            Export
          </button>
          <button className="bg-white border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 shadow-sm transition-colors">
            Import
          </button>
          <Link 
            href="/admin/products/new"
            className="bg-gray-900 text-white px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-800 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Add product
          </Link>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex items-center px-4 pt-2 border-b border-gray-200 gap-4">
          <button className="text-sm font-medium text-gray-900 border-b-2 border-gray-900 pb-3 px-1">All</button>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent pb-3 px-1 transition-colors">Active</button>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent pb-3 px-1 transition-colors">Draft</button>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent pb-3 px-1 transition-colors">Archived</button>
        </div>

        {/* Search Bar */}
        <div className="p-4 flex flex-col md:flex-row items-center gap-3 border-b border-gray-200 bg-white">
          <div className="relative flex-1 w-full max-w-2xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
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
                <th className="px-5 py-3 font-medium text-gray-500">Product</th>
                <th className="px-5 py-3 font-medium text-gray-500">Price</th>
                <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 font-medium text-gray-500">Inventory</th>
                <th className="px-5 py-3 font-medium text-gray-500">Category</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                    <p>Loading products...</p>
                  </div>
                </td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No products found</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 group transition-colors">
                    <td className="px-5 py-4">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-md border border-gray-200 overflow-hidden flex-shrink-0 relative bg-gray-50">
                          <Image 
                            src={(product.images?.[0]?.url && (product.images[0].url.startsWith('http') || product.images[0].url.startsWith('/'))) ? product.images[0].url : "/placeholder.png"} 
                            alt={product.title} 
                            fill 
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer">
                            {product.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        {product.compareAtPrice && (
                          <span className="text-xs text-gray-400 line-through">৳{product.compareAtPrice?.toLocaleString()}</span>
                        )}
                        <span className={`text-sm font-semibold ${product.compareAtPrice ? 'text-green-600' : 'text-gray-900'}`}>
                          ৳{product.price?.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {product.isPublished ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`text-sm ${product.inventory <= 5 ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {product.inventory || 0} in stock
                      </div>
                      {product.inventory <= 5 && <div className="text-xs text-red-500 mt-0.5">Low stock</div>}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {product.category?.name || "Uncategorized"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        <Link 
                          href={`/admin/products/${product._id}/edit`} 
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Edit size={16} />
                        </Link>
                        <button 
                          onClick={() => handleDelete(product._id, product.title)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
