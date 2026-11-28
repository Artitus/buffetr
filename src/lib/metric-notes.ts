import type { ReceiptSlug } from "@/lib/verdict";

/** One or two sticker lines: what it is, and why it is on the board. */
export const METRIC_NOTES: Record<ReceiptSlug, string> = {
  buffett:
    "Market cap over the economy. The sticker is this number: cheap, fine, hot, or cooked.",
  btc: "Bitcoin in dollars. On the board because it's the bet people stack next to the stock market.",
  houses:
    "US home prices. On the board because a house is the other pile people call their wealth.",
  debt: "What Washington owes. On the board because the tab sits under the whole party.",
  gold: "An ounce of gold in dollars. On the board because it's the old exit when stocks look cooked.",
  fear: "Crypto mood, 0 to 100. On the board because the room's scream is its own number.",
  yield:
    "Ten-year yield minus the two-year. On the board because the bond market flinches first.",
  rates: "The 30-year mortgage. On the board because this is what a house costs to borrow.",
};
