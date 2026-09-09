"use client";

import { useState, useEffect } from "react";

interface ShippingConfig {
  insideDhakaRate: number;
  outsideDhakaRate: number;
  freeShippingEnabled: boolean;
  freeShippingMinOrder: number;
  freeShippingZone: "all" | "inside_dhaka" | "outside_dhaka";
}

const ZONE_OPTIONS = [
  { value: "all", label: "All zones (Inside & Outside Dhaka)" },
  { value: "inside_dhaka", label: "Inside Dhaka only" },
  { value: "outside_dhaka", label: "Outside Dhaka only" },
];

export default function ShippingSettingsPage() {
  const [config, setConfig] = useState<ShippingConfig>({
    insideDhakaRate: 120,
    outsideDhakaRate: 150,
    freeShippingEnabled: false,
    freeShippingMinOrder: 0,
    freeShippingZone: "all",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/shipping")
      .then((r) => r.json())
      .then((data) => {
        if (data.shipping) setConfig(data.shipping);
      })
      .catch(() => setStatus({ type: "error", message: "Failed to load settings." }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        ...config,
        freeShippingZone: "all",
        freeShippingMinOrder: 0,
      };
      
      const res = await fetch("/api/admin/settings/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.shipping) setConfig(data.shipping);
      setStatus({ type: "success", message: "Shipping settings saved!" });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save." });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const preview = (zone: "inside_dhaka" | "outside_dhaka") => {
    const base = zone === "inside_dhaka" ? config.insideDhakaRate : config.outsideDhakaRate;
    if (!config.freeShippingEnabled) return `৳${base}`;
    const qualifies =
      config.freeShippingZone === "all" || config.freeShippingZone === zone;
    if (qualifies && config.freeShippingMinOrder === 0) return "Free 🎉";
    if (qualifies) return `Free when order ≥ ৳${config.freeShippingMinOrder}`;
    return `৳${base}`;
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Shipping Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure delivery rates and free shipping offers for the checkout
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">

          {/* Delivery Rates */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900">Delivery Rates</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">
                  Inside Dhaka (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.insideDhakaRate}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, insideDhakaRate: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">
                  Outside Dhaka (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={config.outsideDhakaRate}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, outsideDhakaRate: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Free Shipping Toggle */}
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Free Shipping Offer</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Show a free shipping promo to customers at checkout
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.freeShippingEnabled}
              onClick={() =>
                setConfig((p) => ({ ...p, freeShippingEnabled: !p.freeShippingEnabled }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
                config.freeShippingEnabled ? "bg-gray-900" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  config.freeShippingEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>


          {/* Live Preview */}
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Live Preview (what customers see)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["inside_dhaka", "outside_dhaka"] as const).map((zone) => (
                <div
                  key={zone}
                  className="flex flex-col gap-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl"
                >
                  <span className="text-xs text-gray-500">
                    {zone === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {preview(zone)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="px-6 py-4 flex items-center gap-4">
            <button
              id="save-shipping-settings"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Settings"
              )}
            </button>

            {status && (
              <p
                className={`text-sm font-medium ${
                  status.type === "success" ? "text-green-600" : "text-red-500"
                }`}
              >
                {status.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
