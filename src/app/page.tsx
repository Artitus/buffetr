import { headers } from "next/headers";
import { Board } from "@/components/Board";
import { loadBoardSeed } from "@/lib/seed/board-seed";
import { parseSlug } from "@/lib/verdict";

export default async function Page() {
  const seedPromise = loadBoardSeed();
  const headerList = await headers();
  const initialSlug = parseSlug(headerList.get("x-buffetr-m"));
  const initialSeries = await seedPromise;
  return <Board initialSeries={initialSeries} initialSlug={initialSlug} />;
}
