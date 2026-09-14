"use client";

import { useState, useEffect } from "react";

interface SizeGuideConfig {
  enabled: boolean;
  content: string;
}

export default function SizeGuideSettingsPage() {
  const [config, setConfig] = useState<SizeGuideConfig>({
    enabled: false,
    content: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/size-guide")
      .then((r) => r.json())
      .then((data) => {
        if (data.sizeGuide) setConfig(data.sizeGuide);
      })
      .catch(() => setStatus({ type: "error", message: "Failed to load size guide settings." }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/settings/size-guide", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (data.sizeGuide) setConfig(data.sizeGuide);
      setStatus({ type: "success", message: "Size Guide settings saved successfully!" });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Global Size Guide</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage the size guide popup displayed on product pages.
          </p>
        </div>
        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            config.enabled
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-100 text-gray-500 border-gray-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              config.enabled ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          {config.enabled ? "Size Guide Enabled" : "Size Guide Disabled"}
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
              <p className="text-sm font-medium text-gray-900">Enable Size Guide</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When disabled, the size guide button will not be shown on product pages.
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

          {/* Size Guide Content */}
          <div className="px-6 py-5 space-y-2">
            <label htmlFor="content" className="block text-sm font-medium text-gray-900">
              Size Guide Content (HTML)
            </label>
            <textarea
              id="content"
              value={config.content}
              onChange={(e) => setConfig((p) => ({ ...p, content: e.target.value }))}
              placeholder="<p>Enter size guide content here. You can use HTML tables for dimensions.</p>"
              className="w-full h-64 px-4 py-3 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 transition font-mono"
            />
            <p className="text-xs text-gray-400">
              You can insert simple HTML elements like tables, paragraphs, and headings.
            </p>
          </div>

          {/* Save button + toast */}
          <div className="px-6 py-4 flex items-center gap-4">
            <button
              id="save-sizeguide-settings"
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
