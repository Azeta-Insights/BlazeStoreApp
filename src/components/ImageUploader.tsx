import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Link as LinkIcon,
  Sparkles,
  Eye,
  FileImage
} from 'lucide-react';
import { api } from '../services/api';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  isDarkMode?: boolean;
  required?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  folder = 'blazestore_catalog',
  label = 'Product Image',
  isDarkMode = false,
  required = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadDetails, setUploadDetails] = useState<{
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    isCloudinary?: boolean;
  } | null>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(value);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    // Limit size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Image size is too large (max 15MB). Please choose a smaller file.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(20);

    try {
      // 1. Read file as base64 Data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      setUploadProgress(50);

      // 2. Upload to Cloudinary backend API
      const result = await api.uploadImage(dataUrl, {
        folder,
        tags: ['blazestore', 'upload', file.name.split('.')[0]],
      });

      setUploadProgress(100);

      if (result.success && result.url) {
        onChange(result.url);
        setUrlInput(result.url);
        setUploadDetails({
          format: result.format || file.type.split('/')[1],
          bytes: result.bytes || file.size,
          width: result.width,
          height: result.height,
          isCloudinary: result.isCloudinary,
        });
      } else {
        // Fallback to local data URL if server didn't provide remote url
        onChange(dataUrl);
        setUrlInput(dataUrl);
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setErrorMessage(err?.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    onChange('');
    setUrlInput('');
    setUploadDetails(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlApply = () => {
    if (!urlInput.trim()) {
      setErrorMessage('Please enter a valid image URL');
      return;
    }
    onChange(urlInput.trim());
    setErrorMessage(null);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isCloudinaryUrl = value.includes('cloudinary.com') || uploadDetails?.isCloudinary;

  return (
    <div className="space-y-2">
      {/* Header with Mode Switch */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-[#8A8A94] flex items-center gap-1.5">
          <span>{label} {required && '*'}</span>
          {isCloudinaryUrl && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#00A4EF] bg-[#00A4EF]/10 px-1.5 py-0.5 rounded-md">
              <UploadCloud className="h-3 w-3" /> Cloudinary CDN
            </span>
          )}
        </label>

        <div className="flex items-center gap-1 bg-[#FAF9FC] dark:bg-[#202024] p-0.5 rounded-lg border border-[#EDEDF2] dark:border-[#27272A] text-[10px]">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-0.5 rounded-md font-medium transition ${
              mode === 'upload'
                ? 'bg-white dark:bg-[#27272A] text-[#7C6FE0] shadow-xs'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
            }`}
          >
            File Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2 py-0.5 rounded-md font-medium transition ${
              mode === 'url'
                ? 'bg-white dark:bg-[#27272A] text-[#7C6FE0] shadow-xs'
                : 'text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
            }`}
          >
            Image URL
          </button>
        </div>
      </div>

      {/* Mode 1: File Upload / Drag & Drop */}
      {mode === 'upload' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
            onChange={handleFileInputChange}
            className="hidden"
            id="cloudinary-image-input"
          />

          {!value ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#7C6FE0] bg-[#7C6FE0]/10 scale-[1.01]'
                  : isDarkMode
                  ? 'border-[#3F3F46] bg-[#202024] hover:border-[#7C6FE0] hover:bg-[#27272A]'
                  : 'border-[#D4D4D8] bg-[#FAF9FC] hover:border-[#7C6FE0] hover:bg-[#F4F2FF]'
              }`}
            >
              {isUploading ? (
                <div className="py-4 space-y-3">
                  <div className="flex justify-center">
                    <RefreshCw className="h-8 w-8 text-[#7C6FE0] animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#7C6FE0]">Uploading to Cloudinary...</p>
                    <div className="w-48 mx-auto bg-[#E4E4E7] dark:bg-[#3F3F46] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#7C6FE0] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#7C6FE0]/15 flex items-center justify-center text-[#7C6FE0]">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#1F1F23] dark:text-white">
                      Click to upload or drag & drop image
                    </p>
                    <p className="text-[11px] text-[#8A8A94]">
                      PNG, JPG, WEBP or GIF (Stored directly on Cloudinary CDN)
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] text-[#7C6FE0] font-semibold bg-[#7C6FE0]/10 px-2 py-0.5 rounded-full">
                    <Sparkles className="h-3 w-3" /> Auto-optimized Cloudinary delivery
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`relative rounded-xl border p-3 ${
              isDarkMode ? 'border-[#27272A] bg-[#202024]' : 'border-[#EDEDF2] bg-[#FAF9FC]'
            }`}>
              <div className="flex items-center gap-3">
                {/* Thumbnail Preview */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#EDEDF2] dark:border-[#3F3F46] bg-white shrink-0">
                  <img
                    src={value}
                    alt="Uploaded preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
                    }}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1F1F23] dark:text-white truncate">
                      {isCloudinaryUrl ? 'Cloudinary Hosted Image' : 'Image Ready'}
                    </span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                  </div>

                  <p className="text-[10px] text-[#8A8A94] truncate font-mono mt-0.5">
                    {value.startsWith('data:') ? 'Local Data URI' : value}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    {uploadDetails?.bytes && (
                      <span className="text-[10px] text-[#8A8A94] bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                        {formatFileSize(uploadDetails.bytes)}
                      </span>
                    )}
                    {uploadDetails?.format && (
                      <span className="text-[10px] uppercase font-bold text-[#7C6FE0] bg-[#7C6FE0]/10 px-1.5 py-0.5 rounded">
                        {uploadDetails.format}
                      </span>
                    )}
                    <span className="text-[10px] text-[#10B981] font-medium">Ready for store</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-1.5 rounded-lg border border-[#EDEDF2] dark:border-[#3F3F46] text-[#7C6FE0] hover:bg-[#7C6FE0]/10 transition text-xs font-medium"
                    title="Replace with another image"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-xs"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Direct URL Input */}
      {mode === 'url' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8A8A94]" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                className={`w-full rounded-xl border pl-8 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#7C6FE0] ${
                  isDarkMode
                    ? 'border-[#27272A] bg-[#202024] text-white'
                    : 'border-[#EDEDF2] bg-[#FAF9FC] text-[#1F1F23]'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={handleUrlApply}
              className="px-3 py-2 rounded-xl bg-[#7C6FE0] text-white text-xs font-bold hover:bg-[#6D60D6] transition"
            >
              Apply
            </button>
          </div>

          {value && (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024]">
              <img
                src={value}
                alt="Preview"
                className="w-8 h-8 rounded object-cover border"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] text-[#8A8A94] truncate font-mono flex-1">{value}</span>
              <button
                type="button"
                onClick={handleClear}
                className="text-red-500 hover:text-red-700 text-xs p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-200 dark:border-red-900/30">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
