"use client"

import { useState, useEffect, useCallback } from "react"
import { Trash, Save, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────

interface ProductFormProps {
  initialData?: any
  categories: any[]
  onSubmit: (data: any) => Promise<void>
  loading: boolean
}

interface CombinationItem {
  variationType: string   // VariationType ObjectId string
  variationValue: string  // VariationValue ObjectId string
}

interface VariantRow {
  combination: CombinationItem[]
  combinationLabel: string
  sku: string
  price: number | string
  comparePrice: number | string
  stock: number | string
  isActive: boolean
}

// ─── Generic typed cartesian product ──────────────────────────────────────
function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]]
  const [first, ...rest] = arrays
  const restCombos = cartesian(rest)
  return first.flatMap(item => restCombos.map(combo => [item, ...combo]))
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ProductForm({ initialData, categories, onSubmit, loading }: ProductFormProps) {

  // ── Form data ──
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    price: "",
    compareAtPrice: "",
    category: "",
    description: "",
    longDescription: "",
    inventory: 0,
    isPublished: true,
    ageRange: "",
    images: [] as { url: string; alt: string }[],
  })
  const [tags, setTags] = useState("")
  const [attributes, setAttributes] = useState<{ name: string; value: string }[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState("")

  // ── Variation system ──
  const [hasVariations, setHasVariations] = useState(false)
  const [typesLoading, setTypesLoading] = useState(false)
  const [availableTypes, setAvailableTypes] = useState<any[]>([])
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])
  // typeValues[typeId] = VariationValue[] | undefined (undefined = not yet fetched)
  const [typeValues, setTypeValues] = useState<Record<string, any[]>>({})
  const [valuesLoading, setValuesLoading] = useState<Record<string, boolean>>({})
  // selectedValues[typeId] = array of selected VariationValue._id strings
  const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>({})
  const [variantRows, setVariantRows] = useState<VariantRow[]>([])
  const [expandedVariant, setExpandedVariant] = useState<number | null>(null)

  // ── Fetch all available variation types once ──
  useEffect(() => {
    setTypesLoading(true)
    fetch('/api/admin/variation-types')
      .then(res => res.json())
      .then(data => { if (data.variationTypes) setAvailableTypes(data.variationTypes) })
      .catch(() => { /* silent — user will see empty state */ })
      .finally(() => setTypesLoading(false))
  }, [])

  // ── Fetch values for newly selected types (once per type) ──
  useEffect(() => {
    selectedTypeIds.forEach(typeId => {
      // Skip if already loaded or currently loading
      if (typeValues[typeId] !== undefined || valuesLoading[typeId]) return
      setValuesLoading(prev => ({ ...prev, [typeId]: true }))
      fetch(`/api/admin/variation-types/${typeId}/values`)
        .then(res => res.json())
        .then(data => {
          setTypeValues(prev => ({ ...prev, [typeId]: data.values || [] }))
        })
        .catch(() => setTypeValues(prev => ({ ...prev, [typeId]: [] })))
        .finally(() => setValuesLoading(prev => ({ ...prev, [typeId]: false })))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypeIds])

  // ── Load initial data (edit mode) ──
  useEffect(() => {
    if (!initialData) return

    setFormData({
      title: initialData.title || "",
      slug: initialData.slug || "",
      price: initialData.price?.toString() || "",
      compareAtPrice: initialData.compareAtPrice?.toString() || "",
      category: initialData.category?._id || initialData.category || "",
      description: initialData.description || "",
      longDescription: initialData.longDescription || "",
      inventory: initialData.inventory || 0,
      isPublished: initialData.isPublished !== undefined ? initialData.isPublished : true,
      ageRange: initialData.ageRange || "",
      images: initialData.images || [],
    })
    if (initialData.tags) setTags(initialData.tags.join(", "))
    if (initialData.attributes) setAttributes(initialData.attributes)

    if (initialData.hasVariations) {
      setHasVariations(true)

      // Handle both populated objects and raw string ObjectIds
      const typeIds: string[] = (initialData.variationTypes || [])
        .map((t: any) => (typeof t === 'string' ? t : t?._id?.toString()))
        .filter(Boolean)
      setSelectedTypeIds(typeIds)

      if (initialData.variants?.length > 0) {
        // Rebuild selectedValues from existing variant combinations
        const selVals: Record<string, string[]> = {}
        typeIds.forEach(tId => { selVals[tId] = [] })

        const rows: VariantRow[] = initialData.variants.map((v: any) => {
          const combo: CombinationItem[] = (v.combination || [])
            .map((c: any) => {
              // Handles both: plain ObjectId string OR populated {_id, name, ...} object
              const tId = (typeof c.variationType === 'string'
                ? c.variationType
                : c.variationType?._id)?.toString()
              const vId = (typeof c.variationValue === 'string'
                ? c.variationValue
                : c.variationValue?._id)?.toString()

              // Accumulate unique values per type for the checkboxes
              if (tId && vId) {
                if (!selVals[tId]) selVals[tId] = []
                if (!selVals[tId].includes(vId)) selVals[tId].push(vId)
              }
              return { variationType: tId || '', variationValue: vId || '' }
            })
            .filter((c: CombinationItem) => c.variationType && c.variationValue)

          return {
            combination: combo,
            combinationLabel: v.combinationLabel || '',
            sku: v.sku || '',
            price: v.price ?? 0,
            comparePrice: v.comparePrice ?? '',
            stock: v.stock ?? 0,
            isActive: v.isActive !== false,
          }
        })

        setSelectedValues(selVals)
        setVariantRows(rows)
      }
    }
  }, [initialData])

  // ── Regenerate variant rows via cartesian product ──
  useEffect(() => {
    if (!hasVariations || selectedTypeIds.length === 0) {
      setVariantRows([])
      return
    }

    // Only include types that are fully resolved: type object found + values loaded + at least one value selected
    const validTypes = selectedTypeIds.filter(tId =>
      availableTypes.some(t => t._id === tId) &&
      Array.isArray(typeValues[tId]) &&
      (selectedValues[tId]?.length ?? 0) > 0
    )

    if (validTypes.length === 0) {
      setVariantRows([])
      return
    }

    // Build the per-type arrays of {typeObj, valueObj} for cartesian product
    const valueArrays = validTypes.map(tId => {
      const typeObj = availableTypes.find(t => t._id === tId)!
      const selIds = selectedValues[tId]
      return (typeValues[tId] || [])
        .filter((v: any) => selIds.includes(v._id))
        .map((v: any) => ({ typeObj, valueObj: v }))
    })

    // Guard: drop empty arrays before computing cartesian (prevents [[], ...] giving [])
    const nonEmpty = valueArrays.filter(arr => arr.length > 0)
    if (nonEmpty.length === 0) { setVariantRows([]); return }

    const combos = cartesian(nonEmpty)

    const prefix = (formData.title || "PRD").substring(0, 3).toUpperCase()
    const basePrice = Number(formData.price) || 0

    setVariantRows(prevRows => combos.map(combo => {
      const label = combo.map(c => c.valueObj.value).join(" / ")
      const existing = prevRows.find(r => r.combinationLabel === label)

      // Safe SKU: fall back to first 4 chars of value string if slug missing
      const skuParts = combo.map(c =>
        ((c.valueObj.slug as string | undefined) || c.valueObj.value || 'X').substring(0, 4).toUpperCase()
      )

      return {
        combination: combo.map(c => ({
          variationType: c.typeObj._id as string,
          variationValue: c.valueObj._id as string,
        })),
        combinationLabel: label,
        sku: existing?.sku || [prefix, ...skuParts].join("-"),
        price: existing?.price ?? basePrice,
        comparePrice: existing?.comparePrice ?? "",
        stock: existing?.stock ?? 0,
        isActive: existing?.isActive ?? true,
      }
    }))
  }, [selectedValues, selectedTypeIds, availableTypes, typeValues, hasVariations, formData.title, formData.price])

  // ── Toggle helpers ──
  const toggleType = useCallback((typeId: string) => {
    setSelectedTypeIds(prev =>
      prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]
    )
  }, [])

  const toggleValue = useCallback((typeId: string, valueId: string) => {
    setSelectedValues(prev => {
      const current = prev[typeId] || []
      return {
        ...prev,
        [typeId]: current.includes(valueId)
          ? current.filter(id => id !== valueId)
          : [...current, valueId],
      }
    })
  }, [])

  const updateVariantRow = useCallback((idx: number, field: keyof VariantRow, value: any) => {
    setVariantRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }, [])

  // ── Image handlers ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImage(true)
    try {
      const newUrls = [...formData.images]
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData()
        fd.append("file", files[i])
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || `Failed to upload image ${i + 1}`)
        }
        const data = await res.json()
        newUrls.push({ url: data.url, alt: formData.title })
      }
      setFormData(prev => ({ ...prev, images: newUrls }))
    } catch (err: any) {
      setError(err.message || "Failed to upload images")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = async (index: number) => {
    const img = formData.images[index]
    if (!img) return
    if (img.url.includes("cloudinary.com")) {
      setUploadingImage(true)
      try {
        await fetch("/api/admin/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: img.url }),
        })
      } catch (err) {
        console.error("Cloudinary delete error:", err)
      } finally {
        setUploadingImage(false)
      }
    }
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  // ── Submit ──
  const handleSubmitInternal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (hasVariations && variantRows.length === 0) {
      setError("Please select at least one variation value before saving, or turn off Variations.")
      return
    }

    const submissionData: any = {
      ...formData,
      price: Number(formData.price),
      compareAtPrice: formData.compareAtPrice !== "" ? Number(formData.compareAtPrice) : null,
      images: formData.images || [],
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      attributes: attributes.filter(a => a.name.trim() !== ""),
      hasVariations,
    }

    if (hasVariations) {
      submissionData.variationTypes = selectedTypeIds
      submissionData.variants = variantRows.map(row => ({
        combination: row.combination,
        combinationLabel: row.combinationLabel,
        sku: row.sku,
        price: Number(row.price),
        comparePrice: row.comparePrice !== "" && row.comparePrice !== null
          ? Number(row.comparePrice)
          : null,
        stock: Number(row.stock),
        isActive: row.isActive,
      }))
    } else {
      submissionData.variationTypes = []
      submissionData.variants = []
    }

    try {
      await onSubmit(submissionData)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmitInternal} className="space-y-6 pb-20">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main Content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Title</label>
              <input
                type="text" required
                value={formData.title}
                onChange={e => {
                  const newTitle = e.target.value
                  setFormData(prev => ({
                    ...prev,
                    title: newTitle,
                    // Auto-generate slug only for new products
                    slug: !initialData ? newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") : prev.slug,
                  }))
                }}
                className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
                placeholder="Awesome toy name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Description</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Long Description</label>
              <textarea
                rows={8}
                value={formData.longDescription}
                onChange={e => setFormData(prev => ({ ...prev, longDescription: e.target.value }))}
                className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
              />
            </div>
          </div>

          {/* Media */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Media</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {formData.images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                  <img src={img.url} alt={img.alt || ""} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-white/90 text-gray-700 rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                {uploadingImage
                  ? <Loader2 size={20} className="animate-spin text-gray-400" />
                  : (
                    <>
                      <span className="text-xl text-gray-400 font-light">+</span>
                      <span className="text-xs text-gray-400 mt-1">Add media</span>
                    </>
                  )}
                <input
                  type="file" accept="image/*" multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Regular Price (৳) [Optional]</label>
                <input
                  type="number" min="0" step="0.01"
                  value={formData.compareAtPrice}
                  onChange={e => setFormData(prev => ({ ...prev, compareAtPrice: e.target.value }))}
                  className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Discount Price (৳)</label>
                <input
                  type="number" required min="0" step="0.01"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
                />
              </div>
            </div>
            {hasVariations && (
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                ℹ️ Each variant has its own price. The base price above is used as the default when generating variants.
              </p>
            )}
          </div>

          {/* Other Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Other Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Age Range</label>
                <input
                  type="text"
                  value={formData.ageRange}
                  onChange={e => setFormData(prev => ({ ...prev, ageRange: e.target.value }))}
                  className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
                  placeholder="e.g. 3-5, 8+, 12-14"
                />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Inventory</h3>
            {!hasVariations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-900">Quantity</label>
                  <input
                    type="number" required min="0"
                    value={formData.inventory}
                    onChange={e => setFormData(prev => ({ ...prev, inventory: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Stock is tracked per-variant. Set stock in the Variants table below.</p>
            )}
          </div>

          {/* ══ Variations Section ══ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Variants</h3>
                <p className="text-sm text-gray-500 mt-0.5">Add options like size or color</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hasVariations}
                onClick={() => {
                  setHasVariations(v => {
                    if (v) {
                      setSelectedTypeIds([])
                      setSelectedValues({})
                      setVariantRows([])
                    }
                    return !v
                  })
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${hasVariations ? "bg-gray-900" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${hasVariations ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {hasVariations && (
              <div className="space-y-6">

                {/* STEP 1 – Select Types */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Step 1 — Select variation types
                  </p>
                  {typesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 size={14} className="animate-spin" /> Loading types…
                    </div>
                  ) : availableTypes.length === 0 ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      No variation types found.{" "}
                      <a href="/admin/variations" target="_blank" className="underline font-semibold">
                        Create them in Variations →
                      </a>
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableTypes.map(type => (
                        <button
                          key={type._id}
                          type="button"
                          onClick={() => toggleType(type._id)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                            selectedTypeIds.includes(type._id)
                              ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                              : "bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                          }`}
                        >
                          {type.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* STEP 2 – Select Values */}
                {selectedTypeIds.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Step 2 — Select values for each type
                    </p>
                    <div className="space-y-3">
                      {selectedTypeIds.map(typeId => {
                        const typeObj = availableTypes.find(t => t._id === typeId)
                        const values = typeValues[typeId]
                        const isLoading = valuesLoading[typeId]

                        return (
                          <div key={typeId} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-3">{typeObj?.name}</h4>
                            {isLoading ? (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Loader2 size={12} className="animate-spin" /> Loading values…
                              </div>
                            ) : !values || values.length === 0 ? (
                              <p className="text-xs text-gray-400">
                                No values yet.{" "}
                                <a href="/admin/variations" target="_blank" className="underline text-indigo-500">Add values →</a>
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {values.map((val: any) => {
                                  const isSelected = (selectedValues[typeId] || []).includes(val._id)
                                  return (
                                    <button
                                      key={val._id}
                                      type="button"
                                      onClick={() => toggleValue(typeId, val._id)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                                        isSelected
                                          ? "bg-gray-900 border-gray-900 text-white shadow-sm"
                                          : "bg-white border-gray-200 text-gray-700 hover:border-gray-400"
                                      }`}
                                    >
                                      {typeObj?.displayType === 'swatch' && (
                                        <span
                                          className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-inner shrink-0"
                                          style={{ backgroundColor: val.colorHex || '#ccc' }}
                                        />
                                      )}
                                      {val.value}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3 – Variant Table */}
                {variantRows.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Step 3 — Configure each variant ({variantRows.length} variants)
                    </p>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Header */}
                      <div
                        className="grid bg-gray-50 border-b border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        style={{ gridTemplateColumns: "1fr 100px 110px 80px 120px 36px" }}
                      >
                        <div>Variant</div>
                        <div>Price (৳)</div>
                        <div>Compare (৳)</div>
                        <div>Stock</div>
                        <div>SKU</div>
                        <div />
                      </div>

                      <div className="divide-y divide-gray-100">
                        {variantRows.map((row, i) => (
                          <div key={i}>
                            {/* Summary row */}
                            <div
                              className={`grid items-center px-4 py-2.5 gap-2 cursor-pointer hover:bg-gray-50 transition-colors ${!row.isActive ? "opacity-50" : ""} ${expandedVariant === i ? "bg-gray-50" : "bg-white"}`}
                              style={{ gridTemplateColumns: "1fr 100px 110px 80px 120px 36px" }}
                              onClick={() => setExpandedVariant(expandedVariant === i ? null : i)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-gray-900 truncate">{row.combinationLabel}</span>
                                {!row.isActive && (
                                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0">Off</span>
                                )}
                              </div>
                              <input
                                type="number" min="0"
                                value={row.price}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateVariantRow(i, "price", e.target.value)}
                                className="w-full bg-gray-100 hover:bg-white focus:bg-white text-gray-900 rounded-md border border-transparent hover:border-gray-300 focus:border-gray-400 px-2 py-1.5 text-sm outline-none transition-all"
                              />
                              <input
                                type="number" min="0"
                                value={row.comparePrice}
                                placeholder="—"
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateVariantRow(i, "comparePrice", e.target.value)}
                                className="w-full bg-gray-100 hover:bg-white focus:bg-white text-gray-900 rounded-md border border-transparent hover:border-gray-300 focus:border-gray-400 px-2 py-1.5 text-sm outline-none transition-all"
                              />
                              <input
                                type="number" min="0"
                                value={row.stock}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateVariantRow(i, "stock", e.target.value)}
                                className="w-full bg-gray-100 hover:bg-white focus:bg-white text-gray-900 rounded-md border border-transparent hover:border-gray-300 focus:border-gray-400 px-2 py-1.5 text-sm outline-none transition-all"
                              />
                              <input
                                type="text"
                                value={row.sku}
                                onClick={e => e.stopPropagation()}
                                onChange={e => updateVariantRow(i, "sku", e.target.value)}
                                className="w-full bg-gray-100 hover:bg-white focus:bg-white text-gray-900 rounded-md border border-transparent hover:border-gray-300 focus:border-gray-400 px-2 py-1.5 text-sm font-mono outline-none transition-all"
                              />
                              <div className="flex justify-center text-gray-400">
                                {expandedVariant === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>

                            {/* Expanded panel */}
                            {expandedVariant === i && (
                              <div className="px-4 pb-4 pt-3 border-t border-dashed border-gray-100 bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2.5 cursor-pointer">
                                    <div
                                      onClick={() => updateVariantRow(i, "isActive", !row.isActive)}
                                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${row.isActive ? "bg-gray-900" : "bg-gray-200"}`}
                                    >
                                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${row.isActive ? "translate-x-4" : "translate-x-0"}`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">
                                      {row.isActive ? "Available for sale" : "Not available"}
                                    </span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVariantRows(prev => prev.filter((_, idx) => idx !== i))
                                      setExpandedVariant(null)
                                    }}
                                    className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                                  >
                                    <Trash size={14} /> Delete variant
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Attributes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Custom Attributes</h3>
              <button
                type="button"
                onClick={() => setAttributes(prev => [...prev, { name: "", value: "" }])}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1 transition-colors"
              >
                + Add
              </button>
            </div>
            {attributes.length === 0 && (
              <p className="text-sm text-gray-400">No custom attributes. Click Add to create one.</p>
            )}
            {attributes.map((attr, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text" placeholder="Name"
                  value={attr.name}
                  onChange={e => setAttributes(prev => prev.map((a, i) => i === idx ? { ...a, name: e.target.value } : a))}
                  className="flex-1 bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 outline-none"
                />
                <input
                  type="text" placeholder="Value"
                  value={attr.value}
                  onChange={e => setAttributes(prev => prev.map((a, i) => i === idx ? { ...a, value: e.target.value } : a))}
                  className="flex-1 bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAttributes(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash size={15} />
                </button>
              </div>
            ))}
          </div>

        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">

          {/* Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Status</h3>
            <select
              value={formData.isPublished ? "active" : "draft"}
              onChange={e => setFormData(prev => ({ ...prev, isPublished: e.target.value === "active" }))}
              className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none transition-shadow"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            <p className="text-xs text-gray-500">
              {formData.isPublished
                ? "This product will be visible to all sales channels."
                : "This product will be hidden from all sales channels."}
            </p>
          </div>

          {/* Organization */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Organization</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 outline-none transition-shadow"
                >
                  <option value="">None</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">Tags</label>
                <input
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                  className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 outline-none transition-shadow"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-900">URL Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") }))}
                  className="w-full bg-white text-gray-900 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-gray-500 outline-none transition-shadow"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-black bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(255,201,60,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? "Saving..." : "Save product"}
          </button>

        </div>
      </div>
    </form>
  )
}
