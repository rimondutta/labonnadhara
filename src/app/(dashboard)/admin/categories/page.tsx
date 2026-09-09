"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, Plus, Edit, Trash2, Filter } from "lucide-react"

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }
    
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete category");
      
      setCategories(categories.filter(c => c._id !== id));
    } catch(err) {
      console.error("Delete error:", err);
      alert("Failed to delete category.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/admin/categories/new"
            className="bg-gray-900 text-white px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-800 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Add category
          </Link>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="p-4 flex flex-col md:flex-row items-center gap-3 border-b border-gray-200 bg-white">
          <div className="relative flex-1 w-full max-w-2xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search categories..." 
              className="w-full bg-white border border-gray-300 rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-shadow placeholder:text-gray-400 text-gray-900"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 w-12">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                </th>
                <th className="px-5 py-3 font-medium text-gray-500">Image</th>
                <th className="px-5 py-3 font-medium text-gray-500">Name</th>
                <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-500">Loading categories...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-500">No categories found.</td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-5 py-3 align-middle">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <div className="w-12 h-12 rounded-md bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center shrink-0">
                        {category.image ? (
                          <img 
                            src={category.image} 
                            alt={category.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">No img</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle font-medium text-gray-900">
                      {category.name}
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        category.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.isActive !== false ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-3 align-middle text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link 
                          href={`/admin/categories/${category._id}/edit`}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </Link>
                        <button 
                          onClick={() => handleDelete(category._id, category.name)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
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
        
        {/* Pagination placeholder */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing {categories.length} categories
          </span>
        </div>
      </div>
    </div>
  )
}
