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
import { BarcodeIcon, CheckIcon, PlusIcon } from '@/components/icons';

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
    <div className="space-y-5">
      <section className="space-y-3">
        <p className="text-sm text-muted">
          掃盒底的 JAN 條碼（4904810 開頭的 13 碼）。第一次掃到的條碼要選一次是哪台車，之後就能秒查。
        </p>
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#14161a]">
          <video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${scanning ? '' : 'hidden'}`} />
          {scanning ? (
            <div className="absolute left-[8%] right-[8%] top-1/2 h-0.5 bg-[#e50012] shadow-[0_0_12px_#e50012] motion-safe:animate-pulse" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-[#aeb4be] text-sm">
              <BarcodeIcon size={36} className="mb-2" />
              將盒底條碼對準鏡頭
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {scanning ? (
            <button onClick={stop} className="press h-11 flex-1 rounded-[10px] bg-[#24272c] text-sm font-medium text-white dark:bg-[#eef0f3] dark:text-[#14161a]">
              停止相機
            </button>
          ) : (
            <button onClick={start} className="press h-11 flex-1 rounded-[10px] bg-[#e50012] text-sm font-medium text-white">
              啟動相機掃描
            </button>
          )}
          <label className="press flex h-11 cursor-pointer items-center rounded-[10px] border border-line bg-surface px-4 text-sm font-medium">
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
            className="tnum h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-3 text-[15px] focus:border-[#e50012] focus:outline-none focus:ring-2 focus:ring-[#e50012]/30"
          />
          <button className="press h-11 rounded-[10px] bg-[#24272c] px-4 text-sm font-medium text-white dark:bg-[#eef0f3] dark:text-[#14161a]">
            查詢
          </button>
        </form>
        {error && <p className="text-sm text-brand-text">{error}</p>}
      </section>

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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="tnum flex justify-between gap-3 border-b border-line px-4 py-2 text-sm text-muted">
        <span>JAN {jan}</span>
        {!isTakaraTomyJan(jan) && <span className="text-[#9a5b00] dark:text-[#ffc400]">不像 Tomica 的條碼</span>}
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
              <p className="font-medium">{car.name_ja}</p>
              <p className="text-[13px] text-muted">{car.manufacturer}</p>
            </Link>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={async () => {
                await addCopy(car);
                setAdded(true);
              }}
              className="press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[#e50012] text-sm font-medium text-white"
            >
              {added ? <CheckIcon size={16} className="stamp-in" /> : <PlusIcon size={16} />}
              {added ? '已加入 1 台' : '買了，加入收藏 +1'}
            </button>
            <button onClick={() => setRelinking(true)} className="press h-11 rounded-[10px] border border-line px-3 text-sm">
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
            <p className="flex-1 font-medium">{scanned.name}</p>
            <button onClick={() => setRelinking(true)} className="press h-11 rounded-[10px] border border-line px-3 text-sm">
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
    <div className={`p-4 ${qty > 0 ? 'bg-[#e50012] text-white' : 'border-b border-line'}`}>
      <p className="flex items-center gap-2 text-xl font-medium">
        {qty > 0 && <CheckIcon size={22} />}
        {qty > 0 ? `已經有了（${qty} 台）` : '車庫裡還沒有'}
      </p>
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
      <p className="text-base font-medium">這個條碼還沒對應到車款，是哪一台？</p>
      <SearchBar value={query} onChange={setQuery} placeholder="輸入編號或車名，例如 46 或 キャスト" />
      <ul className="divide-y divide-line max-h-80 overflow-y-auto">
        {results.map((car) => (
          <li key={car.id}>
            <button onClick={() => onPick({ carId: car.id })} className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
              <CarThumb
                src={car.image}
                series={car.series}
                number={car.number}
                code={car.retired && car.series === 'regular' ? genLabel(car) : car.code}
              />
              <span className="text-sm">
                {car.retired && <span className="mr-1.5 rounded bg-line px-1.5 py-0.5 text-xs text-muted">舊款</span>}
                {car.name_ja}
              </span>
            </button>
          </li>
        ))}
        {!query &&
          scannedItems.map((s) => (
            <li key={s.id}>
              <button onClick={() => onPick({ variantId: s.variantId })} className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
                <CarThumb src={s.thumb} series={s.series} number={s.tomicaNumber} code={s.code} />
                <span className="text-sm">{s.name}（掃描加入）</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
