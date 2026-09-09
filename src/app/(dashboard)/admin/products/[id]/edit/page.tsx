"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ProductForm from "@/components/admin/ProductForm"

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, categoriesRes] = await Promise.all([
          fetch(`/api/admin/products/${id}`),
          fetch("/api/admin/categories")
        ])

        const productData = await productRes.json()
        const categoriesData = await categoriesRes.json()

        if (productData.product) setProduct(productData.product)
        if (categoriesData.categories) setCategories(categoriesData.categories)
      } catch (err) {
        console.error("Error fetching data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleSubmit = async (formData: any) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update product")
      }

      router.push("/admin/products")
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      throw err
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold uppercase">Product not found</h2>
        <Link href="/admin/products" className="text-blue-600 hover:underline mt-4 inline-block">Back to products</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Edit Product</h1>
      </div>

      <ProductForm 
        initialData={product}
        categories={categories}
        onSubmit={handleSubmit}
        loading={saving}
      />
    </div>
  )
}
