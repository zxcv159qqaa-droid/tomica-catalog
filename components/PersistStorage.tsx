'use client';

import { useEffect } from 'react';

export default function PersistStorage() {
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
  }, []);
  return null;
}
