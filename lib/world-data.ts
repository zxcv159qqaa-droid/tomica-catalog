import worldData from '@/data/tomica-world.json';

// A Tomica World / Tomica Town building or playset, scraped from the official lineup page
export interface WorldItem {
  id: string;
  name: string;
  line: string;
  price?: number;
  image: string;
  note?: string;
}

const items = worldData as WorldItem[];
const byId = new Map(items.map((i) => [i.id, i]));

export function getAllWorldItems(): WorldItem[] {
  return items;
}

export function getWorldItem(id: string): WorldItem | undefined {
  return byId.get(id);
}

// Series groups, biggest first, with the catch-all group last
export function getWorldLines(): string[] {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.line, (counts.get(i.line) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => (a[0] === 'その他' ? 1 : b[0] === 'その他' ? -1 : b[1] - a[1]))
    .map(([line]) => line);
}
