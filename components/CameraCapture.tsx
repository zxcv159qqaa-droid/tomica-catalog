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
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
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
        className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-xl">🖼️</span>
        從相簿選擇
      </button>
    </div>
  );
}
