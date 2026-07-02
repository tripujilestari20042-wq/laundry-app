'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { validateImageFile } from '@/lib/storage';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  onFileSelect,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(value);
  const [hasLocalPreview, setHasLocalPreview] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLocalPreview) {
      setPreview(value);
    }
  }, [value, hasLocalPreview]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLocalError(null);

    if (!file) {
      onFileSelect(null);
      setHasLocalPreview(false);
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      setLocalError(validationError);
      e.target.value = '';
      return;
    }

    onFileSelect(file);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setHasLocalPreview(true);
    onChange(null);
  }

  function handleRemove() {
    onFileSelect(null);
    onChange(null);
    setPreview(null);
    setHasLocalPreview(false);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const displayUrl = preview || value;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Foto Layanan
      </label>

      {displayUrl ? (
        <div className="relative w-full h-48 rounded-xl overflow-hidden border bg-gray-50">
          <Image
            src={displayUrl}
            alt="Preview layanan"
            fill
            className="object-cover"
            unoptimized={displayUrl.startsWith('blob:')}
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg hover:bg-red-600"
            >
              Hapus
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors disabled:opacity-50"
        >
          <span className="text-3xl mb-2">📷</span>
          <span className="text-sm font-medium">Klik untuk upload gambar</span>
          <span className="text-xs mt-1">JPG, PNG, WebP, GIF — maks. 5MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {localError && (
        <p className="text-sm text-red-600 mt-2">{localError}</p>
      )}
    </div>
  );
}
