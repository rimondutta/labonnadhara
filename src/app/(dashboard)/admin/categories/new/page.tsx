"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import CategoryForm from "@/components/admin/CategoryForm"

export default function AddCategoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: any) => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to create category")
      }

      router.push("/admin/categories")
      router.refresh()
    } catch (err: any) {
      setLoading(false)
      throw err
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/categories" className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Add Category</h1>
      </div>

      <CategoryForm 
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  )
}
