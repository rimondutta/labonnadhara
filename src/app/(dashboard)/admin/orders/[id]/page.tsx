"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Package, CreditCard, Truck, User, MapPin, Mail, Phone, Calendar, Trash2, Download, RefreshCw, Link2, Save, Clock } from "lucide-react"

export default function AdminOrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Courier assignment state
  const [configuredCouriers, setConfiguredCouriers] = useState<{name:string;code:string}[]>([])
  const [courierForm, setCourierForm] = useState({
    courierName: '', trackingId: '', courierStatus: '', estimatedDeliveryDate: '', timelineNote: '', timelineLocation: ''
  })
  const [savingCourier, setSavingCourier] = useState(false)

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`)
      const data = await res.json()
      if (data.order) setOrder(data.order)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchOrder()
    }
    // Load configured couriers for picker
    fetch('/api/admin/settings/couriers')
      .then(r => r.json())
      .then(d => setConfiguredCouriers((d.couriers ?? []).filter((c:any) => c.enabled)))
      .catch(() => {})
  }, [params.id])

  // Sync courier form when order loads
  useEffect(() => {
    if (order) {
      setCourierForm(prev => ({
        ...prev,
        courierName: order.courier?.name || '',
        trackingId: order.courier?.trackingId || '',
        courierStatus: order.courierStatus || '',
        estimatedDeliveryDate: order.estimatedDeliveryDate
          ? new Date(order.estimatedDeliveryDate).toISOString().slice(0,10)
          : '',
      }))
    }
  }, [order?._id])

  const updateStatus = async (type: 'fulfillment' | 'payment', status: string) => {
    setUpdating(true)
    try {
      const payload = type === 'fulfillment' 
        ? { fulfillmentStatus: status } 
        : { paymentStatus: status }

      const res = await fetch(`/api/admin/orders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        await fetchOrder()
      } else {
        alert("Failed to update status")
      }
    } catch (err) {
      console.error(err)
      alert("Error updating status")
    } finally {
      setUpdating(false)
    }
  }

  const saveCourierInfo = async () => {
    setSavingCourier(true)
    try {
      const payload: any = {}
      if (courierForm.courierName)          payload.courierName          = courierForm.courierName
      if (courierForm.trackingId)           payload.trackingId           = courierForm.trackingId
      if (courierForm.courierStatus)        payload.courierStatus        = courierForm.courierStatus
      if (courierForm.estimatedDeliveryDate) payload.estimatedDeliveryDate = courierForm.estimatedDeliveryDate
      if (courierForm.timelineNote)         payload.timelineNote         = courierForm.timelineNote
      if (courierForm.timelineLocation)     payload.timelineLocation     = courierForm.timelineLocation

      const res = await fetch(`/api/admin/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        await fetchOrder()
        setCourierForm(prev => ({ ...prev, timelineNote: '', timelineLocation: '' }))
      } else {
        alert('Failed to update courier info')
      }
    } catch {
      alert('Error saving courier info')
    } finally {
      setSavingCourier(false)
    }
  }

  const deleteOrder = async () => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        router.push("/admin/orders");
      } else {
        alert("Failed to delete order");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting order");
    } finally {
      setUpdating(false);
    }
  }

  const handleRegenerateInvoice = async () => {
    setRegenerating(true)
    try {
      const res = await fetch(`/api/admin/orders/${params.id}/invoice/regenerate`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok && data.invoiceUrl) {
        window.open(data.invoiceUrl, "_blank")
      } else {
        alert("Failed to regenerate invoice: " + (data.error || "Unknown error"))
      }
    } catch (err) {
      console.error(err)
      alert("Error regenerating invoice")
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Order not found</h2>
        <Link href="/admin/orders" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Orders
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order._id.slice(-8).toUpperCase()}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Calendar size={14} />
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            order.fulfillmentStatus === 'delivered' ? 'bg-green-100 text-green-800' : 
            order.fulfillmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
            order.fulfillmentStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {order.fulfillmentStatus || 'Unfulfilled'}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {order.paymentStatus || 'Pending'}
          </span>
          {/* ── Invoice Actions ── */}
          <a
            href={`/api/orders/${order._id}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            download={`Invoice-${order.invoiceNumber || order._id}.pdf`}
            className="inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            title="Download Invoice PDF"
          >
            <Download size={14} />
            Invoice
          </a>
          <button
            onClick={handleRegenerateInvoice}
            disabled={regenerating || updating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Regenerate Invoice PDF"
          >
            <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Regenerating...' : 'Regen'}
          </button>
          <button 
            onClick={deleteOrder}
            disabled={updating}
            className="ml-2 p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
            title="Delete Order"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Items & Status */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Updates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700 block">Fulfillment Status</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-50"
                  value={order.fulfillmentStatus || 'unfulfilled'}
                  onChange={(e) => updateStatus('fulfillment', e.target.value)}
                  disabled={updating}
                >
                  <option value="unfulfilled">Unfulfilled</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700 block">Payment Status</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 disabled:opacity-50"
                  value={order.paymentStatus || 'pending'}
                  onChange={(e) => updateStatus('payment', e.target.value)}
                  disabled={updating}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Courier Assignment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="text-indigo-400" size={20} /> Courier Assignment
            </h2>

            {/* Current courier badge */}
            {order.courier?.name && (
              <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
                <Truck size={16} className="text-indigo-500" />
                <span className="font-medium text-indigo-800">{order.courier.name}</span>
                {order.courier.trackingId && (
                  <>
                    <span className="text-indigo-300">·</span>
                    <code className="text-indigo-700">{order.courier.trackingId}</code>
                  </>
                )}
                {order.courier.trackingUrl && (
                  <a href={order.courier.trackingUrl} target="_blank" rel="noopener noreferrer"
                     className="ml-auto flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    <Link2 size={12} /> Track Live
                  </a>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Courier Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Courier Service</label>
                {configuredCouriers.length > 0 ? (
                  <select
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                    value={courierForm.courierName}
                    onChange={e => setCourierForm(p => ({ ...p, courierName: e.target.value }))}
                  >
                    <option value="">Select courier…</option>
                    {configuredCouriers.map(c => (
                      <option key={c.code} value={c.name}>{c.name}</option>
                    ))}
                    <option value="__manual">Other (type below)</option>
                  </select>
                ) : (
                  <input
                    value={courierForm.courierName}
                    onChange={e => setCourierForm(p => ({ ...p, courierName: e.target.value }))}
                    placeholder="e.g. Steadfast"
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                )}
                {courierForm.courierName === '__manual' && (
                  <input
                    value=""
                    onChange={e => setCourierForm(p => ({ ...p, courierName: e.target.value }))}
                    placeholder="Enter courier name…"
                    className="mt-2 w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                )}
              </div>

              {/* Tracking ID */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tracking ID</label>
                <input
                  value={courierForm.trackingId}
                  onChange={e => setCourierForm(p => ({ ...p, trackingId: e.target.value }))}
                  placeholder="Consignment / tracking number"
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Courier Status */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Courier Status</label>
                <select
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                  value={courierForm.courierStatus}
                  onChange={e => setCourierForm(p => ({ ...p, courierStatus: e.target.value }))}
                >
                  <option value="">Select status…</option>
                  <option value="pending">Pending</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                  <option value="returned">Returned</option>
                </select>
              </div>

              {/* Estimated Delivery */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Clock size={11}/> Estimated Delivery</label>
                <input
                  type="date"
                  value={courierForm.estimatedDeliveryDate}
                  onChange={e => setCourierForm(p => ({ ...p, estimatedDeliveryDate: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Timeline Note */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Add Timeline Note <span className="text-gray-400">(optional)</span></label>
                <input
                  value={courierForm.timelineNote}
                  onChange={e => setCourierForm(p => ({ ...p, timelineNote: e.target.value }))}
                  placeholder="e.g. Package arrived at Dhaka hub"
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Timeline Location */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location <span className="text-gray-400">(optional)</span></label>
                <input
                  value={courierForm.timelineLocation}
                  onChange={e => setCourierForm(p => ({ ...p, timelineLocation: e.target.value }))}
                  placeholder="e.g. Dhaka Hub, Chittagong Branch"
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                {order.estimatedDeliveryDate && (
                  <p className="text-xs text-gray-500">
                    Current EDD: <span className="font-medium text-gray-700">{new Date(order.estimatedDeliveryDate).toLocaleDateString()}</span>
                  </p>
                )}
                {order.courierStatus && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Courier status: <span className="font-medium text-gray-700 capitalize">{order.courierStatus.replace('_', ' ')}</span>
                  </p>
                )}
              </div>
              <button
                onClick={saveCourierInfo}
                disabled={savingCourier || updating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Save size={14} /> {savingCourier ? 'Saving…' : 'Save Courier Info'}
              </button>
            </div>

            {/* Timeline history */}
            {order.trackingTimeline?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Timeline History</p>
                <div className="space-y-2">
                  {[...order.trackingTimeline].reverse().map((t: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-800">{t.title || t.status}</p>
                        <p className="text-gray-500">{t.description}</p>
                        {t.location && <p className="text-gray-400">{t.location}</p>}
                        <p className="text-gray-400">{new Date(t.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center gap-2">
              <Package className="text-gray-400" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Items Ordered</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.items?.map((item: any, i: number) => (
                <div key={i} className="p-6 flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-200 relative overflow-hidden flex-shrink-0">
                    <Image src={item.image || "/placeholder.jpg"} alt={item.title} fill className="object-cover" sizes="64px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{item.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.variantOptions 
                        ? Object.values(item.variantOptions).join(" | ")
                        : [item.color !== "Default" ? item.color : null, item.size !== "Default" ? item.size : null].filter(Boolean).join(" | ")
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">৳{item.price?.toLocaleString()} × {item.quantity}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">৳{(item.price * item.quantity)?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 p-6 space-y-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">৳{(order.totalAmount - (order.shippingCost || 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium text-gray-900">৳{(order.shippingCost || 0).toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-lg text-gray-900">৳{order.totalAmount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="text-gray-400" size={20} /> Customer
            </h2>
            <div className="space-y-3 text-sm">
              <p className="font-medium text-gray-900">{order.customerName}</p>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="text-gray-400" />
                <a href={`mailto:${order.customerEmail}`} className="hover:text-blue-600 transition-colors">
                  {order.customerEmail}
                </a>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400" />
                <a href={order.shippingAddress?.phone ? `tel:${order.shippingAddress?.phone}` : '#'} className="hover:text-blue-600 transition-colors">
                  {order.shippingAddress?.phone || 'No phone saved'}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="text-gray-400" size={20} /> Shipping Address
            </h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-900">{order.customerName}</p>
              <p>{order.shippingAddress?.addressLine1}</p>
              <p>{order.shippingAddress?.city}{order.shippingAddress?.postcode ? `, ${order.shippingAddress?.postcode}` : ''}</p>
              <p>{order.shippingAddress?.country}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="text-gray-400" size={20} /> Payment Method
            </h2>
            <p className="text-sm text-gray-900 capitalize font-medium">
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
               order.paymentMethod === 'bkash' ? 'bKash' : 
               order.paymentMethod === 'card' ? 'Credit/Debit Card' : 
               order.paymentMethod}
            </p>
          </div>
          
          {order.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Order Notes</h2>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
