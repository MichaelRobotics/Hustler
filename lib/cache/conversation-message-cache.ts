/**
 * Client-side cache for conversation messages.
 * Persists in sessionStorage (per-tab) with in-memory layer; LRU eviction.
 * Used by UserChat page and LiveChat so returning to a conversation shows messages immediately.
 */

const CACHE_KEY_PREFIX = "hustler:conv:";
const LRU_KEY = "hustler:conv:lru";
const MAX_ENTRIES = 40;

export type CachedMessage = {
  id: string;
  type: "user" | "bot" | "system" | "admin";
  content?: string;
  text?: string;
  metadata?: unknown;
  createdAt?: string | Date;
  timestamp?: string | Date;
};

export type CachedConversation = {
  messages: CachedMessage[];
  updatedAt?: string;
  /** Admin avatar URL for this experience (from users table); restored when loading from cache */
  adminAvatar?: string;
  /** Who controls the conversation (bot vs admin); used so "Pass to Merchant" shows when restoring from cache */
  controlledBy?: "bot" | "admin";
  meta?: {
    currentBlockId?: string;
    currentStage?: string;
  };
  /** Optional full payload for UserChat page: restore conversation + funnelFlow + stageInfo for instant display */
  funnelFlow?: unknown;
  stageInfo?: unknown;
  conversationSnapshot?: {
    id: string;
    funnelId: string;
    status: "active" | "closed" | "abandoned" | "archived";
    currentBlockId?: string;
    funnel: { id: string; name: string; isDeployed: boolean };
    interactions?: Array<{ id: string; blockId: string; optionText: string; nextBlockId?: string; createdAt: Date }>;
    createdAt?: string;
    updatedAt?: string;
  };
};

const memory = new Map<string, CachedConversation>();

function storageKey(experienceId: string, conversationId: string): string {
  return `${CACHE_KEY_PREFIX}${experienceId}:${conversationId}`;
}

function compositeKey(experienceId: string, conversationId: string): string {
  return `${experienceId}:${conversationId}`;
}

function getLru(): string[] {
  if (typeof window === "undefined" || !window.sessionStorage) return [];
  try {
    const raw = window.sessionStorage.getItem(LRU_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function setLru(keys: string[]): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(LRU_KEY, JSON.stringify(keys.slice(-MAX_ENTRIES)));
  } catch {
    // ignore
  }
}

function removeFromStorage(experienceId: string, conversationId: string): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(storageKey(experienceId, conversationId));
  } catch {
    // ignore
  }
}

/**
 * Get cached conversation messages for a given experience and conversation.
 * Reads from in-memory first, then sessionStorage. Returns null if missing or on parse error.
 */
export function get(experienceId: string, conversationId: string): CachedConversation | null {
  const key = compositeKey(experienceId, conversationId);
  const fromMemory = memory.get(key);
  if (fromMemory) return fromMemory;

  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(experienceId, conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as CachedConversation).messages)) return null;
    const data = parsed as CachedConversation;
    memory.set(key, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Store conversation messages in cache. Updates LRU and evicts oldest entries if over limit.
 */
export function set(experienceId: string, conversationId: string, data: CachedConversation): void {
  const key = compositeKey(experienceId, conversationId);
  const entry: CachedConversation = {
    messages: data.messages ?? [],
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    adminAvatar: data.adminAvatar,
    controlledBy: data.controlledBy,
    meta: data.meta,
    funnelFlow: data.funnelFlow,
    stageInfo: data.stageInfo,
    conversationSnapshot: data.conversationSnapshot,
  };
  memory.set(key, entry);

  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    const lru = getLru();
    const keyStr = key;
    const without = lru.filter((k) => k !== keyStr);
    without.push(keyStr);
    const toEvict = without.length > MAX_ENTRIES ? without.slice(0, without.length - MAX_ENTRIES) : [];
    toEvict.forEach((k) => {
      const idx = k.indexOf(":");
      if (idx === -1) return;
      const eid = k.slice(0, idx);
      const cid = k.slice(idx + 1);
      if (eid && cid) {
        removeFromStorage(eid, cid);
        memory.delete(k);
      }
    });
    setLru(without.slice(-MAX_ENTRIES));
    const toStore = { ...entry };
    window.sessionStorage.setItem(storageKey(experienceId, conversationId), JSON.stringify(toStore));
  } catch {
    // ignore
  }
}
