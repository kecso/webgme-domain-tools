import type { CardinalityString } from "./types.js";

export function cardinalityFromMinMax(
  min: number | undefined | null,
  max: number | undefined | null,
): CardinalityString | undefined {
  const lo = min ?? -1;
  const hi = max ?? -1;

  if (lo === -1 && hi === -1) return undefined;
  if (lo === 0 && hi === -1) return "*";
  if (lo === 1 && hi === -1) return "+";
  if ((lo === 0 || lo === -1) && hi === 1) return "0..1";
  if (lo >= 0 && hi >= 0 && lo === hi) return String(lo);
  if (lo >= 0 && hi >= 0 && lo <= hi) return `${lo}..${hi}`;
  if (lo === -1 && hi >= 0) return `0..${hi}`;
  return undefined;
}

export function formatMemberCardinality(card: CardinalityString | undefined): string {
  if (!card || card === "*") return "*";
  if (card === "+") return "+";
  if (card === "0..1" || card === "?") return "?";
  if (/^\d+$/.test(card)) return `:${card}`;
  return `:${card}`;
}

export function formatGlobalCardinality(card: CardinalityString): string {
  if (card === "*") return "0..*";
  if (card === "+") return "1..*";
  if (card === "0..1" || card === "?") return "0..1";
  return card;
}
