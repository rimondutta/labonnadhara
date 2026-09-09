"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash, Save, Loader2, ArrowLeft } from "lucide-react"

interface CategoryFormProps {
  initialData?: any
  onSubmit: (data: any) => Promise<void>
  loading?: boolean
}

export default function CategoryForm({ initialData, onSubmit, loading = false }: CategoryFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    image: initialData?.image || "",
    isActive: initialData?.isActive ?? true,
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState("")

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError("")

    try {
      const data = new FormData()
      data.append("file", file)
      
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: data
      })

      if (!res.ok) throw new Error("Upload failed")

      const result = await res.json()
      setFormData(prev => ({ ...prev, image: result.url }))
    } catch (err: any) {
      setError(err.message || "Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = async () => {
    // In a full implementation we would also delete from Cloudinary using public_id
    // But for now, just clear from state
    setFormData(prev => ({ ...prev, image: "" }))
  }

  const handleSubmitInternal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!formData.name) {
      setError("Please add a category name")
      return
    }

    try {
      await onSubmit(formData)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    }
  }

  return (
    <form onSubmit={handleSubmitInternal} className="space-y-6 pb-20">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Basic Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Name</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  setFormData(prev => ({
                    ...prev, 
                    name: newName,
                    slug: !initialData ? newName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : prev.slug
                  }));
                }}
                className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
                placeholder="e.g. Building Blocks"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Description</label>
              <textarea 
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
                placeholder="Optional description"
              />
            </div>
          </div>

          {/* Media Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <label className="block text-sm font-medium text-gray-900">Category Image</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {formData.image && (
                <div className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden group bg-gray-50">
                  <img 
                    src={formData.image} 
                    alt="Category image" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={handleRemoveImage}
                      className="bg-white rounded-md p-1.5 text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
                      title="Delete image"
                    >
                      {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Trash size={16} />}
                    </button>
                  </div>
                </div>
              )}
              
              {!formData.image && (
                <div className="relative aspect-square flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer group">
                  {uploadingImage ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700">
                      <Plus size={20} className="group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs font-medium">Add image</span>
                      <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar - Right Column (1/3) */}
        <div className="space-y-6">
          
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Status</h3>
            <div className="space-y-3">
              <select
                value={formData.isActive ? "active" : "draft"}
                onChange={(e) => setFormData(prev => ({...prev, isActive: e.target.value === "active"}))}
                className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
              <p className="text-xs text-gray-500">
                {formData.isActive ? "This category will be visible to all sales channels." : "This category will be hidden from all sales channels."}
              </p>
            </div>
          </div>

          {/* Organization Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <h3 className="text-base font-semibold text-gray-900">Search engine optimization</h3>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Category handle (URL)</label>
              <input 
                type="text" 
                required
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({...prev, slug: e.target.value.toLowerCase().replace(/ /g, '-')}))}
                className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Save Action Bar */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button 
          type="button" 
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {initialData ? 'Save changes' : 'Save category'}
        </button>
      </div>
    </form>
  )
}
