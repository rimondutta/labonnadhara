"use client";

import { useState, useEffect } from "react";


interface PixelConfig {
  pixelId: string;
  enabled: boolean;
  testEventCode: string;
}

export default function PixelSettingsPage() {
  const [config, setConfig] = useState<PixelConfig>({
    pixelId: "",
    enabled: false,
    testEventCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pixelIdError, setPixelIdError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/pixel")
      .then((r) => r.json())
      .then((data) => {
        if (data.facebookPixel) setConfig(data.facebookPixel);
      })
      .catch(() => setStatus({ type: "error", message: "Failed to load pixel settings." }))
      .finally(() => setLoading(false));
  }, []);

  const validatePixelId = (id: string) => {
    if (!id) return "";
    if (!/^\d+$/.test(id)) return "Pixel ID must contain only numbers.";
    if (id.length < 10 || id.length > 20) return "Pixel ID is typically 15–16 digits.";
    return "";
  };

  const handlePixelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfig((prev) => ({ ...prev, pixelId: val }));
    setPixelIdError(validatePixelId(val));
  };

  const handleSave = async () => {
    const err = validatePixelId(config.pixelId);
    if (err) { setPixelIdError(err); return; }

    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.facebookPixel) setConfig(data.facebookPixel);
      setStatus({ type: "success", message: "Pixel settings saved successfully!" });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Facebook Pixel</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track storefront events in Meta Events Manager
          </p>
        </div>
        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            config.enabled && config.pixelId
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-100 text-gray-500 border-gray-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              config.enabled && config.pixelId ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          {config.enabled && config.pixelId ? "Pixel Active" : "Pixel Disabled"}
        </span>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {/* Enable toggle */}
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Facebook Pixel</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When disabled, the pixel script will not be loaded on any page.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.enabled}
              onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
                config.enabled ? "bg-gray-900" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  config.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Pixel ID */}
          <div className="px-6 py-5 space-y-2">
            <label htmlFor="pixelId" className="block text-sm font-medium text-gray-900">
              Pixel ID
            </label>
            <input
              id="pixelId"
              type="text"
              value={config.pixelId}
              onChange={handlePixelIdChange}
              placeholder="e.g. 1234567890123456"
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition ${
                pixelIdError ? "border-red-400 focus:ring-red-400" : "border-gray-300"
              }`}
            />
            {pixelIdError ? (
              <p className="text-xs text-red-500">{pixelIdError}</p>
            ) : (
              <p className="text-xs text-gray-400">
                Find your Pixel ID in{" "}
                <a
                  href="https://business.facebook.com/events_manager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Meta Events Manager → Data Sources
                </a>
              </p>
            )}
          </div>

          {/* Test Event Code */}
          <div className="px-6 py-5 space-y-2">
            <label htmlFor="testEventCode" className="block text-sm font-medium text-gray-900">
              Test Event Code{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="testEventCode"
              type="text"
              value={config.testEventCode}
              onChange={(e) =>
                setConfig((p) => ({ ...p, testEventCode: e.target.value }))
              }
              placeholder="e.g. TEST12345"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition"
            />
            <p className="text-xs text-gray-400">
              Used to verify events in the Meta Events Manager Test Events tool. Leave empty for
              production.
            </p>
          </div>



          {/* Save button + toast */}
          <div className="px-6 py-4 flex items-center gap-4">
            <button
              id="save-pixel-settings"
              onClick={handleSave}
              disabled={saving || !!pixelIdError}
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

            <button
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).fbq) {
                  (window as any).fbq("trackCustom", "AdminTestEvent", {
                    verified_at: new Date().toISOString(),
                  });
                  setStatus({ type: "success", message: "Test event sent! Check Meta Events Manager." });
                } else {
                  setStatus({ type: "error", message: "Pixel not loaded. Save settings and refresh first." });
                }
                setTimeout(() => setStatus(null), 4000);
              }}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Verify Pixel
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
