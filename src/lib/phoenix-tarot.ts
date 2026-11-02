/** Identity and persisted choices for the Phoenix Tarot experience. */
export const PHOENIX_TAROT_TITLE = "O Tarô da Fênix";
export const PHOENIX_TAROT_SUBTITLE = "Quatro cartas. Quatro destinos. Uma chama à sua espera.";
export const PHOENIX_TAROT_INSTRUCTION = "Escolha uma carta e descubra o que a Fênix reservou para você.";

export type PhoenixTarotReward = {
  type?: string;
  title?: string;
  description?: string;
  coupon_code?: string | null;
};
export type PhoenixTarotClaim = {
  already_claimed?: boolean;
  candle_index: number;
  reward: PhoenixTarotReward;
};

const VISITOR_KEY = "hiraeth-secret-flames-visitor-v1";
const CHOICE_PREFIX = "hiraeth-phoenix-tarot-choice-v1:";

export function getPhoenixTarotVisitorKey(): string {
  try {
    let value = window.localStorage.getItem(VISITOR_KEY);
    if (!value) {
      value = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(VISITOR_KEY, value);
    }
    return value;
  } catch {
    return "anonymous";
  }
}

export function phoenixTarotScope(userId: string | null): string {
  return userId ? `user:${userId}` : `visitor:${getPhoenixTarotVisitorKey()}`;
}

function validClaim(value: unknown): value is PhoenixTarotClaim {
  if (!value || typeof value !== "object") return false;
  const claim = value as Partial<PhoenixTarotClaim>;
  return Number.isInteger(claim.candle_index)
    && Number(claim.candle_index) >= 0 && Number(claim.candle_index) < 4
    && !!claim.reward && typeof claim.reward === "object";
}

export function savePhoenixTarotClaim(scope: string, claim: PhoenixTarotClaim): void {
  if (!validClaim(claim)) return;
  try {
    window.localStorage.setItem(CHOICE_PREFIX + scope, JSON.stringify(claim));
  } catch {
    // A disabled storage must not interrupt a successful prize reveal.
  }
}

export function readPhoenixTarotClaim(scope: string): PhoenixTarotClaim | null {
  try {
    const serialized = window.localStorage.getItem(CHOICE_PREFIX + scope);
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    return validClaim(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Make a new revealed page possible without exposing the reward in its URL. */
export const PHOENIX_TAROT_ROUTE = "/taro-da-fenix" as const;
