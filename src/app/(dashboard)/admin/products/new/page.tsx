"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ProductForm from "@/components/admin/ProductForm"

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/admin/categories")
      .then(res => res.json())
      .then(data => {
        if (data.categories) setCategories(data.categories)
      })
      .catch(console.error)
  }, [])

  const handleSubmit = async (formData: any) => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create product")
      }

      router.push("/admin/products")
      router.refresh()
    } catch (err: any) {
      setLoading(false)
      throw err
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Add Product</h1>
      </div>

      <ProductForm 
        categories={categories}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  )
}
