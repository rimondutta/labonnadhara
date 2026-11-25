"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import Image from "next/image";
import { Upload, X, AlertCircle, CheckCircle2, ShieldCheck, Image as ImageIcon } from "lucide-react";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface CustomerPhotoUploadProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  isRequired?: boolean;
}

export default function CustomerPhotoUpload({
  selectedFile,
  onFileSelect,
  isRequired = false,
}: CustomerPhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Manage object URL lifecycle: create on file change, revoke on change/unmount
  useEffect(() => {
    if (!selectedFile) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);

    // 1. File size check
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Selected image is too large (${sizeMB} MB). Maximum allowed size is 15 MB.`);
      return;
    }

    // 2. MIME type check
    const normalizedType = file.type?.toLowerCase()?.trim();
    if (!ALLOWED_MIME_TYPES.includes(normalizedType)) {
      setErrorMessage("Unsupported format. Please select a JPG, PNG, or WebP image.");
      return;
    }

    // 3. Extension check
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage("Invalid file extension. Please select a JPG, PNG, or WebP image.");
      return;
    }

    onFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
    // Reset file input value so selecting the same file again triggers onChange
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleRemove = () => {
    setErrorMessage(null);
    onFileSelect(null);
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FFF1F6] flex items-center justify-center text-[#D62B72]">
            <ImageIcon size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              Upload Your Photo
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
                ? "Please upload the photo for your custom photo frame order."
                : "Add a personal photo for custom photo frames or personalized gift items."}
            </p>
          </div>
        </div>
        {selectedFile && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} />
            Photo Selected
          </span>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* File Dropzone or Preview */}
      {!selectedFile || !previewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 ${
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
              <span className="text-[#D62B72] hover:underline">Click to browse</span> or drag & drop your photo
            </p>
            <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG, WebP (Max 15 MB)</p>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
          <div className="flex items-center gap-4">
            {/* Thumbnail Preview */}
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 relative bg-white shrink-0">
              <Image
                src={previewUrl}
                alt="Selected custom photo preview"
                fill
                unoptimized
                className="object-cover"
              />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatFileSize(selectedFile.size)} • {selectedFile.type.replace("image/", "").toUpperCase()}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-[#D62B72] hover:text-[#C51F63] underline"
                >
                  Replace photo
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <X size={12} />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security & Privacy Notice */}
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#FFF1F6]/50 p-2.5 rounded-lg border border-[#F3D6E2]/50">
        <ShieldCheck size={14} className="text-[#D62B72] shrink-0" />
        <span>Your photo stays safely on your device and is only uploaded securely after you place your order.</span>
      </div>
    </div>
  );
}
