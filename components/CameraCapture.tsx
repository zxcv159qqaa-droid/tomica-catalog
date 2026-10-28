'use client';

import { useRef, useState } from 'react';
import CropDialog from '@/components/CropDialog';
import { ImageIcon, ScanIcon } from '@/components/icons';

interface CameraCaptureProps {
  onCapture: (base64: string, mimeType: string) => void;
  disabled?: boolean;
}

export default function CameraCapture({
  onCapture,
  disabled,
}: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPicked(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      {picked && (
        <CropDialog
          file={picked}
          onCancel={() => setPicked(null)}
          onDone={(base64, mimeType) => {
            setPicked(null);
            onCapture(base64, mimeType);
          }}
        />
      )}
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
        className="press flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-[#e50012] text-lg font-medium text-white disabled:opacity-50"
      >
        <ScanIcon size={24} />
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
        className="press flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-line bg-surface font-medium disabled:opacity-50"
      >
        <ImageIcon size={20} />
        從相簿選擇
      </button>
    </div>
  );
}
