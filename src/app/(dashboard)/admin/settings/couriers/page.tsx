"use client"

import { useEffect, useState } from "react"
import { Plus, Truck, Key, Link2, Trash2, Pencil, CheckCircle2, XCircle, AlertCircle, Save, X, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react"

// ── Known couriers (pre-filled templates) ───────────────────────────────────
const COURIER_TEMPLATES = [
  { name: "Steadfast", code: "steadfast", trackingUrlPattern: "https://steadfast.com.bd/tracking/{trackingId}" },
  { name: "Pathao Courier", code: "pathao", trackingUrlPattern: "https://pathao.com/courier/tracking/?consignment_id={trackingId}" },
  { name: "RedX", code: "redx", trackingUrlPattern: "https://redx.com.bd/track-order?trackingId={trackingId}" },
  { name: "Paperfly", code: "paperfly", trackingUrlPattern: "https://www.paperfly.com.bd/tracking.php?tracking_id={trackingId}" },
  { name: "Sundarban Courier", code: "sundarban", trackingUrlPattern: "https://www.sundarban-courier.com/tracking?cn={trackingId}" },
  { name: "Custom Courier", code: "", trackingUrlPattern: "" },
]

interface CourierConfig {
  _id?: string
  name: string
  code: string
  apiKey: string
  apiSecret: string
  webhookSecret: string
  trackingUrlPattern: string
  enabled: boolean
  notes: string
}

const EMPTY_FORM: CourierConfig = {
  name: "", code: "", apiKey: "", apiSecret: "", webhookSecret: "",
  trackingUrlPattern: "", enabled: false, notes: "",
}

export default function CourierSettingsPage() {
  const [couriers, setCouriers] = useState<CourierConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Add / Edit form
  const [showForm, setShowForm] = useState(false)
  const [editCode, setEditCode] = useState<string | null>(null)   // null = new
  const [form, setForm] = useState<CourierConfig>(EMPTY_FORM)

  // Visibility toggles for secret fields
  const [showApiKey, setShowApiKey] = useState(false)
  const [showApiSecret, setShowApiSecret] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)

  // Expanded row details
  const [expandedCode, setExpandedCode] = useState<string | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchCouriers = async () => {
    try {
      const res = await fetch("/api/admin/settings/couriers")
      const data = await res.json()
      if (res.ok) setCouriers(data.couriers ?? [])
    } catch {
      setError("Failed to load couriers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCouriers() }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const notify = (msg: string, isErr = false) => {
    if (isErr) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(""); setSuccess("") }, 4000)
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditCode(null)
    setShowForm(true)
  }

  const openEdit = (c: CourierConfig) => {
    setForm({ ...c })
    setEditCode(c.code)
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM); setEditCode(null) }

  const applyTemplate = (tpl: typeof COURIER_TEMPLATES[0]) => {
    setForm(prev => ({ ...prev, name: tpl.name, code: tpl.code, trackingUrlPattern: tpl.trackingUrlPattern }))
  }

  const handleField = (key: keyof CourierConfig, value: string | boolean) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      // Auto-generate code from name if creating new
      if (key === "name" && !editCode) {
        next.code = (value as string).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      }
      return next
    })
  }

  // ── Save (POST / PUT) ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name || !form.code) { notify("Name and code are required", true); return }
    setSaving(true)
    try {
      const isEdit = editCode !== null
      const res = await fetch("/api/admin/settings/couriers", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { notify(data.error || "Save failed", true); return }
      setCouriers(data.couriers)
      closeForm()
      notify(isEdit ? "Courier updated!" : "Courier added!")
    } catch {
      notify("Network error", true)
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle enabled ────────────────────────────────────────────────────────
  const toggleEnabled = async (c: CourierConfig) => {
    try {
      const res = await fetch("/api/admin/settings/couriers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c.code, enabled: !c.enabled }),
      })
      const data = await res.json()
      if (res.ok) setCouriers(data.couriers)
    } catch { /* noop */ }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (code: string) => {
    if (!confirm("Delete this courier configuration? This action is irreversible.")) return
    try {
      const res = await fetch(`/api/admin/settings/couriers?code=${code}`, { method: "DELETE" })
      const data = await res.json()
      if (res.ok) { setCouriers(data.couriers); notify("Courier removed") }
      else notify(data.error || "Delete failed", true)
    } catch { notify("Network error", true) }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="text-indigo-500" size={26} /> Courier APIs
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage courier service integrations and API credentials.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Courier
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-2xl shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-indigo-50">
            <h2 className="text-base font-semibold text-indigo-800 flex items-center gap-2">
              <Truck size={18} /> {editCode ? "Edit Courier" : "Add New Courier"}
            </h2>
            <button onClick={closeForm} className="p-1.5 text-gray-500 hover:bg-white rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Quick templates — only for new */}
            {!editCode && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Quick-fill template</p>
                <div className="flex flex-wrap gap-2">
                  {COURIER_TEMPLATES.map(t => (
                    <button
                      key={t.code || "custom"}
                      onClick={() => applyTemplate(t)}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Courier Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => handleField("name", e.target.value)}
                  placeholder="e.g. Steadfast"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Code / Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code / Slug <span className="text-red-500">*</span></label>
                <input
                  value={form.code}
                  onChange={e => handleField("code", e.target.value)}
                  placeholder="e.g. steadfast"
                  disabled={!!editCode}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-100 disabled:text-gray-500"
                />
                {!editCode && <p className="text-xs text-gray-400 mt-1">Auto-generated. Unique identifier used in code.</p>}
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Key size={13} /> API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={form.apiKey}
                    onChange={e => handleField("apiKey", e.target.value)}
                    placeholder="Paste your API key…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button type="button" onClick={() => setShowApiKey(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Key size={13} /> API Secret</label>
                <div className="relative">
                  <input
                    type={showApiSecret ? "text" : "password"}
                    value={form.apiSecret}
                    onChange={e => handleField("apiSecret", e.target.value)}
                    placeholder="Paste your API secret…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button type="button" onClick={() => setShowApiSecret(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showApiSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Key size={13} /> Webhook Secret</label>
                <div className="relative">
                  <input
                    type={showWebhook ? "text" : "password"}
                    value={form.webhookSecret}
                    onChange={e => handleField("webhookSecret", e.target.value)}
                    placeholder="Optional webhook verification secret"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button type="button" onClick={() => setShowWebhook(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showWebhook ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Tracking URL Pattern */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Link2 size={13} /> Tracking URL Pattern</label>
                <input
                  value={form.trackingUrlPattern}
                  onChange={e => handleField("trackingUrlPattern", e.target.value)}
                  placeholder="https://courier.com/track/{trackingId}"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-xs text-gray-400 mt-1">Use <code className="bg-gray-100 px-1 rounded">{'{trackingId}'}</code> as placeholder.</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea
                value={form.notes}
                onChange={e => handleField("notes", e.target.value)}
                placeholder="Optional notes visible only to admins…"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>

            {/* Enabled */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => handleField("enabled", !form.enabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.enabled ? "bg-indigo-500" : "bg-gray-300"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.enabled ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">Active (enable for order assignment)</span>
            </label>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                <Save size={15} /> {saving ? "Saving…" : editCode ? "Update Courier" : "Add Courier"}
              </button>
              <button onClick={closeForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Courier List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : couriers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Truck size={42} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No courier services configured</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add Courier" to connect your first delivery partner.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {couriers.map(c => (
            <div key={c.code} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Row summary */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Truck size={20} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{c.code}</code>
                    {c.enabled
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={11} /> Active</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><XCircle size={11} /> Inactive</span>
                    }
                  </div>
                  {c.trackingUrlPattern && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{c.trackingUrlPattern}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleEnabled(c)}
                    title={c.enabled ? "Disable" : "Enable"}
                    className={`w-9 h-5 rounded-full flex items-center transition-colors ${c.enabled ? "bg-indigo-500" : "bg-gray-300"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow mx-0.5 transition-transform ${c.enabled ? "translate-x-4" : ""}`} />
                  </button>

                  <button onClick={() => openEdit(c)} title="Edit" className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(c.code)} title="Delete" className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setExpandedCode(expandedCode === c.code ? null : c.code)}
                    title="Details"
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {expandedCode === c.code ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedCode === c.code && (
                <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50 space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-0.5">API Key</p>
                      <p className="font-mono bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 text-xs break-all">
                        {c.apiKey ? "●".repeat(Math.min(c.apiKey.length, 20)) : <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-0.5">API Secret</p>
                      <p className="font-mono bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 text-xs break-all">
                        {c.apiSecret ? "●".repeat(Math.min(c.apiSecret.length, 20)) : <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-0.5">Webhook Secret</p>
                      <p className="font-mono bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 text-xs break-all">
                        {c.webhookSecret ? "●".repeat(Math.min(c.webhookSecret.length, 20)) : <span className="text-gray-400 italic">Not set</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-0.5">Tracking URL Pattern</p>
                      <p className="font-mono bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-500 text-xs break-all">
                        {c.trackingUrlPattern || <span className="italic">Not set</span>}
                      </p>
                    </div>
                  </div>
                  {c.notes && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-0.5">Notes</p>
                      <p className="text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs">{c.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
        <p className="font-semibold mb-1 flex items-center gap-2"><AlertCircle size={15} /> Security Note</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          API credentials are stored encrypted in your database and are never exposed to the browser.
          Only the last 20 characters are masked in this view for verification. Treat these keys like passwords.
        </p>
      </div>
    </div>
  )
}
