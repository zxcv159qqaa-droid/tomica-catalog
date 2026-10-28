'use client';

import { useMemo, useRef, useState } from 'react';

// Crop box in fractions (0..1) of the displayed image
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Drag = 'move' | 'nw' | 'ne' | 'sw' | 'se';

const MIN = 0.1;
const MAX_SIDE = 1600;
const FULL: Box = { x: 0, y: 0, w: 1, h: 1 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Lets the user trim a photo before it is sent for recognition
export default function CropDialog({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (base64: string, mimeType: string) => void;
  onCancel: () => void;
}) {
  // Freed with the page; revoking in an effect breaks under StrictMode remounts
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [box, setBox] = useState<Box>(FULL);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ kind: Drag; px: number; py: number; start: Box } | null>(null);

  const begin = (kind: Drag, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind, px: e.clientX, py: e.clientY, start: box };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const img = imgRef.current;
    if (!d || !img) return;
    const r = img.getBoundingClientRect();
    const dx = (e.clientX - d.px) / r.width;
    const dy = (e.clientY - d.py) / r.height;
    const s = d.start;
    if (d.kind === 'move') {
      setBox({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) });
      return;
    }
    let { x, y, w, h } = s;
    if (d.kind === 'nw' || d.kind === 'sw') {
      const nx = clamp(s.x + dx, 0, s.x + s.w - MIN);
      w = s.x + s.w - nx;
      x = nx;
    } else {
      w = clamp(s.w + dx, MIN, 1 - s.x);
    }
    if (d.kind === 'nw' || d.kind === 'ne') {
      const ny = clamp(s.y + dy, 0, s.y + s.h - MIN);
      h = s.y + s.h - ny;
      y = ny;
    } else {
      h = clamp(s.h + dy, MIN, 1 - s.y);
    }
    setBox({ x, y, w, h });
  };

  const end = () => {
    drag.current = null;
  };

  const confirm = (crop: Box) => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const sw = Math.round(crop.w * img.naturalWidth);
    const sh = Math.round(crop.h * img.naturalHeight);
    const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    canvas
      .getContext('2d')
      ?.drawImage(
        img,
        Math.round(crop.x * img.naturalWidth),
        Math.round(crop.y * img.naturalHeight),
        sw,
        sh,
        0,
        0,
        canvas.width,
        canvas.height
      );
    onDone(canvas.toDataURL('image/jpeg', 0.9).split(',')[1], 'image/jpeg');
  };

  const handle = (kind: Drag, pos: string) => (
    <div
      onPointerDown={(e) => begin(kind, e)}
      className={`absolute ${pos} w-8 h-8 flex items-center justify-center touch-none`}
    >
      <div className="w-4 h-4 rounded-full bg-white border-2 border-red-600 shadow" />
    </div>
  );

  const pct = (v: number) => `${v * 100}%`;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <p className="text-center text-white/80 text-sm py-3">拖曳方框或四個角，框住要辨識的車或包裝</p>
      <div className="flex-1 min-h-0 flex items-center justify-center px-4">
        {url && (
          <div
            className="relative inline-block max-w-full max-h-full select-none"
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img
              ref={imgRef}
              src={url}
              alt="要裁剪的照片"
              draggable={false}
              className="block max-w-full max-h-[70vh] object-contain"
            />
            <div
              onPointerDown={(e) => begin('move', e)}
              className="absolute border-2 border-white touch-none cursor-move"
              style={{
                left: pct(box.x),
                top: pct(box.y),
                width: pct(box.w),
                height: pct(box.h),
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              }}
            >
              {handle('nw', '-left-4 -top-4')}
              {handle('ne', '-right-4 -top-4')}
              {handle('sw', '-left-4 -bottom-4')}
              {handle('se', '-right-4 -bottom-4')}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 p-4">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-medium">
          取消
        </button>
        <button onClick={() => confirm(FULL)} className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-800 font-medium">
          用整張
        </button>
        <button onClick={() => confirm(box)} className="flex-[1.5] py-3 rounded-xl tomica-red text-white font-bold">
          裁剪並辨識
        </button>
      </div>
    </div>
  );
}
