/**
 * Access token CHỈ nằm trong bộ nhớ của tab (không localStorage/sessionStorage: XSS đọc được và tồn tại mãi).
 * F5 làm mất token → app gọi /refresh (cookie HttpOnly) để lấy lại.
 * `expiresAt` tính theo đồng hồ MÁY NÀY từ `expiresIn` server trả, không so `exp` trong token (tránh lệch giờ).
 */
export interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

type Listener = (token: StoredToken | null) => void;

let current: StoredToken | null = null;
const listeners = new Set<Listener>();

export const tokenStore = {
  get(): StoredToken | null {
    return current;
  },

  set(accessToken: string, expiresInSeconds: number, now = Date.now()): StoredToken {
    current = { accessToken, expiresAt: now + expiresInSeconds * 1000 };
    listeners.forEach((l) => l(current));
    return current;
  },

  clear(): void {
    if (current === null) return;
    current = null;
    listeners.forEach((l) => l(null));
  },

  /** Còn hạn ít nhất `marginMs` nữa. */
  isFresh(marginMs = 0, now = Date.now()): boolean {
    return current !== null && current.expiresAt - now > marginMs;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
