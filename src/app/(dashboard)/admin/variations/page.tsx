"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Tag, Palette, X, Check, Loader2 } from "lucide-react";

interface VariationType {
  _id: string;
  name: string;
  slug: string;
  displayType: "swatch" | "button" | "dropdown";
  valueCount: number;
}

interface VariationValue {
  _id: string;
  value: string;
  slug: string;
  colorHex?: string | null;
  sortOrder: number;
}

type DisplayType = "swatch" | "button" | "dropdown";

export default function VariationsPage() {
  const [types, setTypes] = useState<VariationType[]>([]);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [typeValues, setTypeValues] = useState<Record<string, VariationValue[]>>({});
  const [loading, setLoading] = useState(true);

  // Add Type Modal
  const [showAddType, setShowAddType] = useState(false);
  const [addTypeName, setAddTypeName] = useState("");
  const [addTypeDisplay, setAddTypeDisplay] = useState<DisplayType>("button");
  const [addTypeLoading, setAddTypeLoading] = useState(false);
  const [addTypeError, setAddTypeError] = useState("");

  // Edit Type Modal
  const [editingType, setEditingType] = useState<VariationType | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeDisplay, setEditTypeDisplay] = useState<DisplayType>("button");
  const [editTypeLoading, setEditTypeLoading] = useState(false);

  // Add Value
  const [addValueTypeId, setAddValueTypeId] = useState<string | null>(null);
  const [addValueText, setAddValueText] = useState("");
  const [addValueHex, setAddValueHex] = useState("#000000");
  const [addValueLoading, setAddValueLoading] = useState(false);
  const [addValueError, setAddValueError] = useState("");

  // Edit Value
  const [editingValue, setEditingValue] = useState<VariationValue | null>(null);
  const [editValueText, setEditValueText] = useState("");
  const [editValueHex, setEditValueHex] = useState("#000000");
  const [editValueLoading, setEditValueLoading] = useState(false);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/variation-types");
    const data = await res.json();
    if (data.variationTypes) setTypes(data.variationTypes);
    setLoading(false);
  }, []);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  const loadValues = async (typeId: string) => {
    if (typeValues[typeId]) return; // already loaded
    const res = await fetch(`/api/admin/variation-types/${typeId}/values`);
    const data = await res.json();
    if (data.values) setTypeValues((prev) => ({ ...prev, [typeId]: data.values }));
  };

  const toggleExpand = async (typeId: string) => {
    if (expandedType === typeId) {
      setExpandedType(null);
    } else {
      setExpandedType(typeId);
      await loadValues(typeId);
    }
  };

  const handleAddType = async () => {
    if (!addTypeName.trim()) { setAddTypeError("Name is required"); return; }
    setAddTypeLoading(true); setAddTypeError("");
    const res = await fetch("/api/admin/variation-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addTypeName.trim(), displayType: addTypeDisplay }),
    });
    const data = await res.json();
    if (!res.ok) { setAddTypeError(data.error || "Error"); setAddTypeLoading(false); return; }
    setAddTypeName(""); setAddTypeDisplay("button"); setShowAddType(false); setAddTypeLoading(false);
    loadTypes();
  };

  const handleEditType = async () => {
    if (!editingType) return;
    setEditTypeLoading(true);
    await fetch(`/api/admin/variation-types/${editingType._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editTypeName, displayType: editTypeDisplay }),
    });
    setEditingType(null); setEditTypeLoading(false); loadTypes();
  };

  const handleDeleteType = async (type: VariationType) => {
    if (!confirm(`Delete "${type.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/variation-types/${type._id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    loadTypes();
  };

  const handleAddValue = async (typeId: string, displayType: DisplayType) => {
    if (!addValueText.trim()) { setAddValueError("Value is required"); return; }
    setAddValueLoading(true); setAddValueError("");
    const body: any = { value: addValueText.trim() };
    if (displayType === "swatch") body.colorHex = addValueHex;
    const res = await fetch(`/api/admin/variation-types/${typeId}/values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setAddValueError(data.error || "Error"); setAddValueLoading(false); return; }
    // Refresh values for this type
    const res2 = await fetch(`/api/admin/variation-types/${typeId}/values`);
    const data2 = await res2.json();
    setTypeValues((prev) => ({ ...prev, [typeId]: data2.values || [] }));
    setAddValueText(""); setAddValueHex("#000000"); setAddValueTypeId(null); setAddValueLoading(false);
    // Update count
    setTypes((prev) => prev.map((t) => t._id === typeId ? { ...t, valueCount: (t.valueCount || 0) + 1 } : t));
  };

  const handleEditValue = async (typeId: string) => {
    if (!editingValue) return;
    setEditValueLoading(true);
    await fetch(`/api/admin/variation-values/${editingValue._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editValueText, colorHex: editValueHex }),
    });
    const res2 = await fetch(`/api/admin/variation-types/${typeId}/values`);
    const data2 = await res2.json();
    setTypeValues((prev) => ({ ...prev, [typeId]: data2.values || [] }));
    setEditingValue(null); setEditValueLoading(false);
  };

  const handleDeleteValue = async (typeId: string, valueId: string) => {
    if (!confirm("Delete this value?")) return;
    const res = await fetch(`/api/admin/variation-values/${valueId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setTypeValues((prev) => ({ ...prev, [typeId]: (prev[typeId] || []).filter((v) => v._id !== valueId) }));
    setTypes((prev) => prev.map((t) => t._id === typeId ? { ...t, valueCount: Math.max(0, t.valueCount - 1) } : t));
  };

  const displayTypeLabel = (d: string) => ({ swatch: "Color Swatch", button: "Button", dropdown: "Dropdown" }[d] || d);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Variations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage variation types (Color, Size, Pieces) and their available values.</p>
        </div>
        <button
          onClick={() => { setShowAddType(true); setAddTypeName(""); setAddTypeError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} /> Add Variation Type
        </button>
      </div>

      {/* Add Type Modal */}
      {showAddType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">New Variation Type</h2>
              <button onClick={() => setShowAddType(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            {addTypeError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{addTypeError}</p>}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Name</label>
              <input
                type="text" value={addTypeName} onChange={(e) => setAddTypeName(e.target.value)}
                placeholder="e.g. Color, Size, Pieces"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500 text-gray-900 bg-white"
                onKeyDown={(e) => e.key === "Enter" && handleAddType()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Display Type</label>
              <select
                value={addTypeDisplay} onChange={(e) => setAddTypeDisplay(e.target.value as DisplayType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500 text-gray-900 bg-white"
              >
                <option value="button">Button (pill-style, good for Size/Pieces)</option>
                <option value="swatch">Color Swatch (circles with hex color, good for Color)</option>
                <option value="dropdown">Dropdown (select menu)</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAddType(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddType} disabled={addTypeLoading} className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
                {addTypeLoading && <Loader2 size={14} className="animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Type Modal */}
      {editingType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Edit Variation Type</h2>
              <button onClick={() => setEditingType(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Name</label>
              <input type="text" value={editTypeName} onChange={(e) => setEditTypeName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500 text-gray-900 bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-900">Display Type</label>
              <select value={editTypeDisplay} onChange={(e) => setEditTypeDisplay(e.target.value as DisplayType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-500 text-gray-900 bg-white">
                <option value="button">Button</option>
                <option value="swatch">Color Swatch</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditingType(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleEditType} disabled={editTypeLoading} className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
                {editTypeLoading && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Types List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No variation types yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {types.map((type) => (
            <div key={type._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Type Row */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button onClick={() => toggleExpand(type._id)} className="flex items-center gap-2 flex-1 text-left">
                  {expandedType === type._id ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                  {type.displayType === "swatch" && <Palette size={16} className="text-purple-500" />}
                  <span className="font-semibold text-gray-900 text-sm">{type.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{displayTypeLabel(type.displayType)}</span>
                  <span className="text-xs text-gray-400">{type.valueCount} value{type.valueCount !== 1 ? "s" : ""}</span>
                </button>
                <button onClick={() => { setEditingType(type); setEditTypeName(type.name); setEditTypeDisplay(type.displayType); }} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDeleteType(type)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Expanded Values */}
              {expandedType === type._id && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(typeValues[type._id] || []).map((val) => (
                      <div key={val._id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                        {type.displayType === "swatch" && val.colorHex && (
                          <span className="w-4 h-4 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: val.colorHex }} />
                        )}
                        {editingValue?._id === val._id ? (
                          <>
                            <input type="text" value={editValueText} onChange={(e) => setEditValueText(e.target.value)}
                              className="text-sm border-b border-gray-300 outline-none w-24 bg-transparent text-gray-900" />
                            {type.displayType === "swatch" && (
                              <input type="color" value={editValueHex} onChange={(e) => setEditValueHex(e.target.value)} className="w-6 h-5 cursor-pointer rounded" />
                            )}
                            <button onClick={() => handleEditValue(type._id)} disabled={editValueLoading} className="text-green-600 hover:text-green-700">
                              {editValueLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                            </button>
                            <button onClick={() => setEditingValue(null)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-800">{val.value}</span>
                            <button onClick={() => { setEditingValue(val); setEditValueText(val.value); setEditValueHex(val.colorHex || "#000000"); }} className="text-gray-300 hover:text-gray-600 ml-1">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => handleDeleteValue(type._id, val._id)} className="text-gray-300 hover:text-red-500">
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Value Inline */}
                  {addValueTypeId === type._id ? (
                    <div className="flex items-center gap-2 pt-1">
                      {type.displayType === "swatch" && (
                        <div className="h-8 w-8 rounded-lg border border-gray-300 relative overflow-hidden shrink-0">
                          <input type="color" value={addValueHex} onChange={(e) => setAddValueHex(e.target.value)}
                            className="absolute -top-1 -left-1 w-12 h-12 cursor-pointer" />
                        </div>
                      )}
                      <input
                        type="text" value={addValueText} onChange={(e) => setAddValueText(e.target.value)}
                        placeholder={type.displayType === "swatch" ? "Color name (e.g. Red)" : "Value (e.g. 10 Pieces)"}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-500 text-gray-900 bg-white"
                        onKeyDown={(e) => e.key === "Enter" && handleAddValue(type._id, type.displayType)}
                        autoFocus
                      />
                      {addValueError && <p className="text-xs text-red-500">{addValueError}</p>}
                      <button onClick={() => handleAddValue(type._id, type.displayType)} disabled={addValueLoading}
                        className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5">
                        {addValueLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add
                      </button>
                      <button onClick={() => { setAddValueTypeId(null); setAddValueText(""); setAddValueError(""); }} className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setAddValueTypeId(type._id); setAddValueText(""); setAddValueHex("#000000"); setAddValueError(""); }}
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      <Plus size={14} /> Add {type.name} value
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
