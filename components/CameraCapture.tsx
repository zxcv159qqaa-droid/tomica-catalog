'use client';

import { useRef } from 'react';

interface CameraCaptureProps {
  onCapture: (base64: string, mimeType: string) => void;
  disabled?: boolean;
}

export default function CameraCapture({
  onCapture,
  disabled,
}: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      onCapture(base64, file.type);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id="camera-input"
        disabled={disabled}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-2xl">📷</span>
        拍照辨識
      </button>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="gallery-input"
        disabled={disabled}
      />

      <button
        onClick={() => document.getElementById('gallery-input')?.click()}
        disabled={disabled}
        className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-xl">🖼️</span>
        從相簿選擇
      </button>
    </div>
  );
}
