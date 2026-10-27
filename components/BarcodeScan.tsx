'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, itemQty } from '@/lib/db';
import { genLabel, getAllCars, getCarById, searchCars, type TomicaCar } from '@/lib/tomica-data';
import { addCopy } from '@/lib/collection-actions';
import { useCollection } from '@/lib/useCollection';
import CarThumb from '@/components/CarThumb';
import SearchBar from '@/components/SearchBar';

interface Detector {
  detect(source: CanvasImageSource | ImageBitmap): Promise<{ rawValue: string }[]>;
}

// Native BarcodeDetector where the browser has it (Android Chrome), the WASM ponyfill elsewhere (iOS, desktop)
async function createDetector(): Promise<Detector> {
  const formats = ['ean_13', 'ean_8', 'upc_a'];
  const Native = (globalThis as { BarcodeDetector?: new (o: object) => Detector }).BarcodeDetector;
  if (Native) return new Native({ formats });
  const { BarcodeDetector } = await import('barcode-detector/ponyfill');
  return new BarcodeDetector({ formats: formats as never[] });
}

function isTakaraTomyJan(jan: string) {
  return /^4904810\d{6}$/.test(jan);
}

export default function BarcodeScan() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [jan, setJan] = useState('');
  const [manual, setManual] = useState('');

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => stop, []);

  const start = async () => {
    setError('');
    setJan('');
    try {
      const detector = await createDetector();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setScanning(true);

      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          const hit = codes.find((c) => /^\d{8,13}$/.test(c.rawValue));
          if (hit) {
            setJan(hit.rawValue);
            stop();
            navigator.vibrate?.(80);
            return;
          }
        } catch {
          // Frame not ready yet
        }
        setTimeout(tick, 250);
      };
      tick();
    } catch (e) {
      stop();
      setError(e instanceof Error && e.name === 'NotAllowedError' ? '請允許使用相機' : '無法啟動相機，可以改用上傳照片或手動輸入');
    }
  };

  const fromImage = async (file: File) => {
    setError('');
    try {
      const detector = await createDetector();
      const codes = await detector.detect(await createImageBitmap(file));
      if (codes[0]) setJan(codes[0].rawValue);
      else setError('照片裡找不到條碼，請拍清楚一點');
    } catch {
      setError('無法讀取這張照片');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <p className="text-xs text-slate-500">
          掃盒底的 JAN 條碼（4904810 開頭的 13 碼）。第一次掃到的條碼要選一次是哪台車，之後就能秒查。
        </p>
        <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video">
          <video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${scanning ? '' : 'hidden'}`} />
          {scanning ? (
            <div className="absolute left-[8%] right-[8%] top-1/2 h-0.5 bg-red-600 shadow-[0_0_12px_#e60012] animate-pulse" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-300 text-sm">
              <span className="text-3xl mb-2">▦</span>
              將盒底條碼對準鏡頭
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {scanning ? (
            <button onClick={stop} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold">
              停止相機
            </button>
          ) : (
            <button onClick={start} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold">
              啟動相機掃描
            </button>
          )}
          <label className="cursor-pointer py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold">
            上傳照片
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && fromImage(e.target.files[0])}
            />
          </label>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d{8,13}$/.test(manual)) setJan(manual);
          }}
          className="flex gap-2"
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/\D/g, '').slice(0, 13))}
            inputMode="numeric"
            placeholder="或手動輸入 13 碼條碼"
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
          />
          <button className="px-4 rounded-xl bg-slate-800 text-white text-sm font-bold">查詢</button>
        </form>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>

      {jan && <JanResult key={jan} jan={jan} />}
    </div>
  );
}

function JanResult({ jan }: { jan: string }) {
  // Wrapped so "still loading" (undefined) differs from "no link yet"
  const lookup = useLiveQuery(async () => ({ link: await db.janCodes.get(jan) }), [jan]);
  const loaded = lookup !== undefined;
  const link = lookup?.link;
  const { qtyByCar, scannedItems, imageByCar } = useCollection();
  const [relinking, setRelinking] = useState(false);
  const [added, setAdded] = useState(false);

  const car = link?.carId ? getCarById(link.carId) : undefined;
  const scanned = link?.variantId ? scannedItems.find((s) => s.variantId === link.variantId) : undefined;
  const linked = !relinking && (car || scanned);

  const linkTo = async (target: { carId?: string; variantId?: string }) => {
    await db.janCodes.put({ jan, ...target, addedAt: new Date() });
    setRelinking(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-4 py-2 text-xs font-mono text-slate-500 border-b border-slate-100 dark:border-slate-800 flex justify-between">
        <span>JAN {jan}</span>
        {!isTakaraTomyJan(jan) && <span className="text-amber-600 font-sans">不像 Tomica 的條碼</span>}
      </div>

      {linked && car && (
        <>
          <OwnedBanner qty={qtyByCar.get(car.id) ?? 0} />
          <div className="p-4 flex items-center gap-3">
            <CarThumb
              src={car.image ?? imageByCar.get(car.id)}
              series={car.series}
              number={car.number}
              code={car.retired && car.series === 'regular' ? genLabel(car) : car.code}
              size="lg"
            />
            <Link href={`/catalog/${car.id}`} className="flex-1 min-w-0">
              <p className="font-bold">{car.name_ja}</p>
              <p className="text-xs text-slate-400">{car.manufacturer}</p>
            </Link>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={async () => {
                await addCopy(car);
                setAdded(true);
              }}
              className="flex-1 py-2 rounded-xl tomica-red text-white text-sm font-bold"
            >
              {added ? '✓ 已加入 1 台' : '買了，加入收藏 +1'}
            </button>
            <button onClick={() => setRelinking(true)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              對錯車？
            </button>
          </div>
        </>
      )}

      {linked && scanned && (
        <>
          <OwnedBanner qty={itemQty(scanned)} />
          <div className="p-4 flex items-center gap-3">
            <CarThumb src={scanned.thumb} series={scanned.series} number={scanned.tomicaNumber} code={scanned.code} size="lg" />
            <p className="flex-1 font-bold">{scanned.name}</p>
            <button onClick={() => setRelinking(true)} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              對錯車？
            </button>
          </div>
        </>
      )}

      {loaded && !linked && <LinkPicker onPick={linkTo} />}
    </div>
  );
}

function OwnedBanner({ qty }: { qty: number }) {
  return (
    <div className={`p-4 text-white ${qty > 0 ? 'bg-emerald-600' : 'tomica-red'}`}>
      <p className="text-lg font-black">{qty > 0 ? `✓ 已經有了（${qty} 台）` : '✗ 車庫裡還沒有'}</p>
    </div>
  );
}

// First time a barcode is seen: let the user say which car it belongs to
function LinkPicker({ onPick }: { onPick: (t: { carId?: string; variantId?: string }) => void }) {
  const [query, setQuery] = useState('');
  const { scannedItems } = useCollection();
  const results = useMemo<TomicaCar[]>(
    () => (query.trim() ? searchCars(query, getAllCars()).slice(0, 20) : []),
    [query]
  );

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm font-bold">這個條碼還沒對應到車款，是哪一台？</p>
      <SearchBar value={query} onChange={setQuery} placeholder="輸入編號或車名，例如 46 或 キャスト" />
      <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
        {results.map((car) => (
          <li key={car.id}>
            <button onClick={() => onPick({ carId: car.id })} className="w-full flex items-center gap-3 py-2 text-left">
              <CarThumb
                src={car.image}
                series={car.series}
                number={car.number}
                code={car.retired && car.series === 'regular' ? genLabel(car) : car.code}
              />
              <span className="text-sm">
                {car.retired && <span className="text-[10px] mr-1 px-1 rounded bg-slate-200 dark:bg-slate-700">舊款</span>}
                {car.name_ja}
              </span>
            </button>
          </li>
        ))}
        {!query &&
          scannedItems.map((s) => (
            <li key={s.id}>
              <button onClick={() => onPick({ variantId: s.variantId })} className="w-full flex items-center gap-3 py-2 text-left">
                <CarThumb src={s.thumb} series={s.series} number={s.tomicaNumber} code={s.code} />
                <span className="text-sm">{s.name}（掃描加入）</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
