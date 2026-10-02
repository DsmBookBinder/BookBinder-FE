// 백엔드 대신 쓰는 localStorage 기반 목(mock) 저장소.
// 실제 API가 생기면 이 파일의 함수들을 fetch 호출로 바꾸면 된다.
import { useSyncExternalStore } from "react";
import { createSeed } from "../data/seed";
import type { Db, LogEntry, Notification, Role, Status, User } from "../types";

const STORAGE_KEY = "bookbinder:v1";

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: string): Result<never> => ({ ok: false, error });
const newId = () => crypto.randomUUID();

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    // 저장소를 읽을 수 없으면 샘플 데이터로 시작한다
  }
  return createSeed();
}

let state: Db = load();
const listeners = new Set<() => void>();

function commit(next: Db): void {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장에 실패해도 현재 탭에서는 계속 동작한다
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDb(): Db {
  return useSyncExternalStore(subscribe, () => state);
}

const sessionUser = (): User | null => state.users.find((u) => u.id === state.sessionUserId) ?? null;

/* ── 계정 ─────────────────────────────────────────────── */

export function login(loginId: string, password: string): Result<User> {
  const user = state.users.find((u) => u.loginId === loginId.trim());
  if (!user || user.password !== password) return fail("아이디 또는 비밀번호가 맞지 않아요.");
  commit({ ...state, sessionUserId: user.id });
  return ok(user);
}

export function logout(): void {
  commit({ ...state, sessionUserId: null });
}

export interface SignupInput {
  role: Role;
  name: string;
  loginId: string;
  password: string;
  classNo?: string;
  studentNo?: string;
}

export function signup(input: SignupInput): Result {
  const loginId = input.loginId.trim();
  if (state.users.some((u) => u.loginId === loginId)) return fail("이미 사용 중인 아이디예요.");
  const user: User = {
    id: newId(),
    loginId,
    password: input.password,
    name: input.name.trim(),
    role: input.role,
    joinedAt: Date.now(),
    ...(input.role === "student" ? { classNo: input.classNo?.trim(), studentNo: input.studentNo?.trim() } : {}),
  };
  commit({ ...state, users: [...state.users, user] });
  return ok(undefined);
}

export function updateProfile(patch: Pick<User, "name" | "classNo" | "studentNo">): void {
  const me = sessionUser();
  if (!me) return;
  commit({ ...state, users: state.users.map((u) => (u.id === me.id ? { ...u, ...patch } : u)) });
}

export function changePassword(current: string, next: string): Result {
  const me = sessionUser();
  if (!me) return fail("로그인이 필요해요.");
  if (me.password !== current) return fail("현재 비밀번호가 맞지 않아요.");
  commit({ ...state, users: state.users.map((u) => (u.id === me.id ? { ...u, password: next } : u)) });
  return ok(undefined);
}

/* ── 학생: 신청 ───────────────────────────────────────── */

export function requestBook(bookId: string): Result {
  const me = sessionUser();
  const book = state.books.find((b) => b.id === bookId);
  if (!me || me.role !== "student") return fail("학생 계정으로 로그인해야 신청할 수 있어요.");
  if (!book) return fail("도서를 찾을 수 없어요.");
  if (book.owned) return fail("이미 교내에 소장 중인 도서예요.");
  if (state.requests.some((r) => r.bookId === bookId && r.userId === me.id)) return fail("이미 신청한 도서예요.");
  if (state.reviews[bookId]?.status === "rejected") return fail("반려된 도서는 다시 신청할 수 없어요.");

  const now = Date.now();
  commit({
    ...state,
    requests: [...state.requests, { id: newId(), bookId, userId: me.id, createdAt: now }],
    reviews: {
      ...state.reviews,
      [bookId]: state.reviews[bookId] ?? { bookId, status: "pending", quantity: 1, updatedAt: now },
    },
  });
  return ok(undefined);
}

/** 대기 상태일 때만 취소할 수 있다. 마지막 신청자가 취소하면 목록에서도 빠진다. */
export function cancelRequest(requestId: string): void {
  const target = state.requests.find((r) => r.id === requestId);
  if (!target || target.userId !== state.sessionUserId) return;
  if (state.reviews[target.bookId]?.status !== "pending") return;

  const requests = state.requests.filter((r) => r.id !== requestId);
  const reviews = { ...state.reviews };
  if (!requests.some((r) => r.bookId === target.bookId)) delete reviews[target.bookId];
  commit({ ...state, requests, reviews });
}

/* ── 학생: 알림 ───────────────────────────────────────── */

export function markNotificationRead(id: string): void {
  commit({ ...state, notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) });
}

export function markAllNotificationsRead(): void {
  const userId = state.sessionUserId;
  commit({
    ...state,
    notifications: state.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
  });
}

/* ── 사서: 조치 ───────────────────────────────────────── */

/** 각 조치를 적용할 수 있는 직전 상태 */
const ALLOWED_FROM: Record<Exclude<Status, "pending">, Status> = {
  approved: "pending",
  rejected: "pending",
  purchased: "approved",
};

export function canTransition(from: Status, to: Exclude<Status, "pending">): boolean {
  return ALLOWED_FROM[to] === from;
}

/** 조치할 수 없는 상태의 도서는 건너뛰고, 실제로 바뀐 건수를 돌려준다. */
export function setStatus(bookIds: string[], status: Exclude<Status, "pending">, reason?: string): number {
  if (sessionUser()?.role !== "librarian") return 0;
  const targets = bookIds.filter((id) => {
    const review = state.reviews[id];
    return review && canTransition(review.status, status);
  });
  if (targets.length === 0) return 0;

  const now = Date.now();
  const trimmedReason = status === "rejected" ? reason?.trim() || undefined : undefined;
  const reviews = { ...state.reviews };
  const logs: LogEntry[] = [];
  const notifications: Notification[] = [];

  for (const bookId of targets) {
    reviews[bookId] = { ...reviews[bookId], status, reason: trimmedReason, updatedAt: now };
    logs.push({ id: newId(), at: now, bookId, status });
    for (const request of state.requests.filter((r) => r.bookId === bookId)) {
      notifications.push({
        id: newId(),
        userId: request.userId,
        bookId,
        status,
        reason: trimmedReason,
        createdAt: now,
        read: false,
      });
    }
  }

  commit({
    ...state,
    reviews,
    logs: [...state.logs, ...logs],
    notifications: [...state.notifications, ...notifications],
    // 구매가 끝난 도서는 교내 소장 도서가 된다
    books:
      status === "purchased"
        ? state.books.map((b) => (targets.includes(b.id) ? { ...b, owned: true } : b))
        : state.books,
  });
  return targets.length;
}

export function setQuantity(bookId: string, quantity: number): void {
  const review = state.reviews[bookId];
  if (!review) return;
  const safe = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
  commit({ ...state, reviews: { ...state.reviews, [bookId]: { ...review, quantity: safe } } });
}

export function setPrice(bookId: string, price: number | null): void {
  commit({ ...state, books: state.books.map((b) => (b.id === bookId ? { ...b, price } : b)) });
}

/** 샘플 데이터로 되돌린다 (로그인 상태도 초기화). */
export function resetDemoData(): void {
  commit(createSeed());
}
