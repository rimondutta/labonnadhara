"use client"

import { useEffect, useState } from "react"
import { Ticket, Plus, Trash2, CheckCircle2, XCircle, Loader2, Calendar, Percent, DollarSign } from "lucide-react"

interface CouponItem {
  _id: string
  code: string
  discountType: "percentage" | "fixed"
  discountValue: number
  minOrderAmount?: number
  maxUses?: number
  usedCount: number
  isActive: boolean
  expiresAt?: string | null
  createdAt?: string
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [code, setCode] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState<number | "">("")
  const [minOrderAmount, setMinOrderAmount] = useState<number | "">("")
  const [maxUses, setMaxUses] = useState<number | "">("")
  const [expiresAt, setExpiresAt] = useState("")
  const [formError, setFormError] = useState("")

  const fetchCoupons = async () => {
    try {
      setError(null)
      const res = await fetch("/api/admin/coupons")
      if (!res.ok) throw new Error("Failed to load coupons")
      const data = await res.json()
      setCoupons(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching coupons")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const handleToggleStatus = async (coupon: CouponItem) => {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon._id, isActive: !coupon.isActive }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      setCoupons((prev) =>
        prev.map((c) => (c._id === coupon._id ? { ...c, isActive: !c.isActive } : c))
      )
    } catch (err) {
      alert("Error updating coupon status")
    }
  }

  const handleDelete = async (id: string, couponCode: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${couponCode}"?`)) return
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete coupon")
      setCoupons((prev) => prev.filter((c) => c._id !== id))
    } catch (err) {
      alert("Error deleting coupon")
    }
  }

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!code.trim()) {
      setFormError("Coupon code is required")
      return
    }

    if (discountValue === "" || Number(discountValue) <= 0) {
      setFormError("Valid discount value is required")
      return
    }

    if (discountType === "percentage" && Number(discountValue) > 100) {
      setFormError("Percentage discount cannot exceed 100%")
      return
    }

    setSubmitting(true)

    try {
      const payload: Record<string, any> = {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: minOrderAmount !== "" ? Number(minOrderAmount) : 0,
        maxUses: maxUses !== "" ? Number(maxUses) : 0,
        isActive: true,
      }

      if (expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString()
      }

      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create coupon")
      }

      // Reset form
      setCode("")
      setDiscountType("percentage")
      setDiscountValue("")
      setMinOrderAmount("")
      setMaxUses("")
      setExpiresAt("")
      setIsModalOpen(false)
      fetchCoupons()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error creating coupon")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Discounts & Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">Manage promotional discount codes for your store</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 text-white px-3 py-1.5 text-sm font-medium rounded-md hover:bg-gray-800 shadow-sm transition-colors flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500">Code</th>
                <th className="px-5 py-3 font-medium text-gray-500">Discount</th>
                <th className="px-5 py-3 font-medium text-gray-500">Min. Order</th>
                <th className="px-5 py-3 font-medium text-gray-500">Usage</th>
                <th className="px-5 py-3 font-medium text-gray-500">Expires</th>
                <th className="px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={24} className="animate-spin text-gray-400" />
                      <p>Loading coupons...</p>
                    </div>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Ticket size={32} className="text-gray-300" />
                      <p>No coupons found. Create your first discount code!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date()
                  return (
                    <tr key={coupon._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <span className="font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs tracking-wider border border-gray-200">
                          {coupon.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}% OFF`
                          : `৳${coupon.discountValue.toLocaleString()} OFF`}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {coupon.minOrderAmount && coupon.minOrderAmount > 0
                          ? `৳${coupon.minOrderAmount.toLocaleString()}`
                          : "None"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {coupon.usedCount || 0}
                        {coupon.maxUses ? ` / ${coupon.maxUses}` : " (unlimited)"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {coupon.expiresAt ? (
                          <span className={isExpired ? "text-red-500 font-medium" : ""}>
                            {new Date(coupon.expiresAt).toLocaleDateString()}
                            {isExpired && " (Expired)"}
                          </span>
                        ) : (
                          "Never"
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(coupon)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            coupon.isActive
                              ? "bg-green-50 text-green-700 hover:bg-green-100"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {coupon.isActive ? (
                            <>
                              <CheckCircle2 size={12} /> Active
                            </>
                          ) : (
                            <>
                              <XCircle size={12} /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(coupon._id, coupon.code)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Coupon"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Coupon</h2>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. SUMMER20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-wider font-mono focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {discountType === "percentage" ? "Percentage (%)" : "Amount (৳)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={discountType === "percentage" ? "100" : undefined}
                    placeholder={discountType === "percentage" ? "20" : "500"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. Order (৳)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (no limit)"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (unlimited)"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
