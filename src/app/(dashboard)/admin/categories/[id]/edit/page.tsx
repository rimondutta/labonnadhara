"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import CategoryForm from "@/components/admin/CategoryForm"

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/categories/${id}`)
        const data = await res.json()
        if (data.category) setCategory(data.category)
      } catch (err) {
        console.error("Error fetching category:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleSubmit = async (formData: any) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to update category")
      }

      router.push("/admin/categories")
      router.refresh()
    } catch (err: any) {
      setSaving(false)
      throw err
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center text-gray-500">
        Loading category data...
      </div>
    )
  }

  if (!category) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center text-red-500">
        Category not found.
        <Link href="/admin/categories" className="text-blue-600 hover:underline mt-4 block">Back to categories</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/categories" className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Edit Category</h1>
      </div>

      <CategoryForm 
        initialData={category}
        onSubmit={handleSubmit}
        loading={saving}
      />
    </div>
  )
}
