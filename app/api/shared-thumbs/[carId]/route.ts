import { storeConfigured } from '@/lib/sync-store';
import { sharedImage } from '@/lib/shared-thumbs';

// Serves one shared thumbnail as an image. Clients add ?v=<version>, so each version caches forever.
export async function GET(_req: Request, { params }: { params: Promise<{ carId: string }> }) {
  const { carId } = await params;
  if (!storeConfigured()) return new Response(null, { status: 404 });

  const src = await sharedImage(carId).catch(() => null);
  const m = src ? /^data:(image\/jpeg);base64,(.+)$/.exec(src) : null;
  if (!m) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  return new Response(Buffer.from(m[2], 'base64'), {
    headers: {
      'Content-Type': m[1],
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
