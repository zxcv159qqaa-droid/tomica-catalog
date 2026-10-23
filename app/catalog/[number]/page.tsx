import { Suspense } from 'react';
import CarDetail from '@/components/CarDetail';

export const instant = false;

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const carNumber = parseInt(number, 10);

  return (
    <Suspense fallback={<div className="px-4 pt-6 text-center">載入中...</div>}>
      <CarDetail carNumber={carNumber} />
    </Suspense>
  );
}
