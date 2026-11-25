"use client";

import React, { useState, useEffect, useRef, useId, useMemo } from "react";
import Image from "next/image";
import {
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Image as ImageIcon,
  Plus,
} from "lucide-react";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB per file
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const DEFAULT_MAX_FILES = 10;

interface CustomerPhotoUploadProps {
  // Multiple files interface
  selectedFiles?: File[];
  onFilesChange?: (files: File[]) => void;
  // Backward-compatibility single file interface
  selectedFile?: File | null;
  onFileSelect?: (file: File | null) => void;
  isRequired?: boolean;
  maxFiles?: number;
}

export default function CustomerPhotoUpload({
  selectedFiles: propFiles,
  onFilesChange,
  selectedFile,
  onFileSelect,
  isRequired = false,
  maxFiles = DEFAULT_MAX_FILES,
}: CustomerPhotoUploadProps) {
  // Normalize between multiple files and legacy single file prop
  const currentFiles: File[] = useMemo(() => {
    if (propFiles !== undefined) return propFiles;
    if (selectedFile) return [selectedFile];
    return [];
  }, [propFiles, selectedFile]);

  const [previews, setPreviews] = useState<{ id: string; file: File; url: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Keep object URLs synchronized with currentFiles
  useEffect(() => {
    // Generate object URLs for any new files and keep existing ones
    const newPreviews = currentFiles.map((file) => {
      const existing = previews.find((p) => p.file === file || (p.file.name === file.name && p.file.size === file.size && p.file.lastModified === file.lastModified));
      if (existing) return existing;
      return {
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        url: URL.createObjectURL(file),
      };
    });

    // Revoke URLs for removed files
    previews.forEach((p) => {
      if (!newPreviews.some((np) => np.url === p.url)) {
        URL.revokeObjectURL(p.url);
      }
    });

    setPreviews(newPreviews);

    return () => {
      // Cleanup all object URLs on unmount
      newPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFiles]);

  const updateFiles = (newFiles: File[]) => {
    if (onFilesChange) {
      onFilesChange(newFiles);
    }
    if (onFileSelect) {
      onFileSelect(newFiles.length > 0 ? newFiles[0] : null);
    }
  };

  const handleIncomingFiles = (incomingFiles: FileList | File[]) => {
    setErrorMessage(null);
    const validNewFiles: File[] = [];
    const errors: string[] = [];

    const fileArray = Array.from(incomingFiles);

    if (currentFiles.length + fileArray.length > maxFiles) {
      setErrorMessage(`You can upload a maximum of ${maxFiles} photos per order.`);
      return;
    }

    fileArray.forEach((file) => {
      // Check size
      if (file.size > MAX_SIZE_BYTES) {
        errors.push(`"${file.name}" exceeds 15 MB limit.`);
        return;
      }

      // Check mime type
      const normalizedType = file.type?.toLowerCase()?.trim();
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(normalizedType) && !ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`"${file.name}" is not a supported image format (JPG, PNG, WebP).`);
        return;
      }

      // Prevent exact duplicates
      const isDuplicate = currentFiles.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified
      );
      if (!isDuplicate) {
        validNewFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setErrorMessage(errors.join(" "));
    }

    if (validNewFiles.length > 0) {
      updateFiles([...currentFiles, ...validNewFiles]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIncomingFiles(e.target.files);
    }
    // Reset file input value so selecting the same files again triggers onChange
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (indexToRemove: number) => {
    setErrorMessage(null);
    const updated = currentFiles.filter((_, idx) => idx !== indexToRemove);
    updateFiles(updated);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearAll = () => {
    setErrorMessage(null);
    updateFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 border border-[#F3D6E2] shadow-sm space-y-4">
      {/* Title & Badge */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FFF1F6] flex items-center justify-center text-[#D62B72] shrink-0">
            <ImageIcon size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
              Upload Your Photos
              {isRequired ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  Required
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  Optional
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500">
              {isRequired
                ? "Please upload the photos for your custom photo frame order."
                : "Add personal photos for custom photo frames or personalized gift items."}
            </p>
          </div>
        </div>

        {/* Selected Counter & Clear All */}
        {currentFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={13} />
              {currentFiles.length} {currentFiles.length === 1 ? "Photo" : "Photos"} Selected
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-red-600 hover:text-red-700 hover:underline"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hidden Multiple File Input */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Empty State Dropzone */}
      {currentFiles.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? "border-[#D62B72] bg-[#FFF1F6]/70 scale-[0.99]"
              : "border-gray-200 hover:border-[#D62B72]/50 hover:bg-[#FFF1F6]/30 bg-gray-50/50"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-[#D62B72]">
            <Upload size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              <span className="text-[#D62B72] hover:underline">Click to browse</span> or drag & drop your photos
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports multiple JPG, PNG, WebP files (Max 15 MB each, up to {maxFiles} photos)
            </p>
          </div>
        </div>
      ) : (
        /* Multi-Image Gallery Previews */
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {previews.map((item, idx) => (
              <div
                key={item.id}
                className="relative group rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex flex-col aspect-[4/5] shadow-xs"
              >
                {/* Image Thumbnail */}
                <div className="relative flex-1 w-full overflow-hidden bg-white">
                  <Image
                    src={item.url}
                    alt={item.file.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  {/* Remove Button Overlay */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(idx);
                    }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-sm"
                    title="Remove photo"
                  >
                    <X size={13} />
                  </button>
                  {/* Index badge */}
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                    #{idx + 1}
                  </span>
                </div>

                {/* File details footer */}
                <div className="p-2 bg-white border-t border-gray-100 text-[11px] leading-tight">
                  <p className="font-medium text-gray-900 truncate" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-gray-400 text-[10px] mt-0.5">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>
              </div>
            ))}

            {/* "+ Add More" Drop Card */}
            {currentFiles.length < maxFiles && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all aspect-[4/5] ${
                  isDragging
                    ? "border-[#D62B72] bg-[#FFF1F6]"
                    : "border-gray-200 hover:border-[#D62B72]/50 hover:bg-[#FFF1F6]/20 bg-gray-50/50"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-[#D62B72]">
                  <Plus size={16} />
                </div>
                <span className="text-xs font-semibold text-gray-700">Add More</span>
                <span className="text-[10px] text-gray-400">
                  {currentFiles.length}/{maxFiles}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security & Privacy Notice */}
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#FFF1F6]/50 p-2.5 rounded-lg border border-[#F3D6E2]/50">
        <ShieldCheck size={14} className="text-[#D62B72] shrink-0" />
        <span>Your photos stay safely on your device and are only uploaded securely after you place your order.</span>
      </div>
    </div>
  );
}
