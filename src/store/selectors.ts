import type { Book, BookRequest, Db, Review, User } from "../types";

export function currentUser(db: Db): User | null {
  return db.users.find((u) => u.id === db.sessionUserId) ?? null;
}

export function homePathFor(user: User | null): string {
  if (!user) return "/login";
  return user.role === "librarian" ? "/librarian/requests" : "/books";
}

export function requestCount(db: Db, bookId: string): number {
  return db.requests.reduce((count, r) => count + (r.bookId === bookId ? 1 : 0), 0);
}

export function unreadCount(db: Db, userId: string): number {
  return db.notifications.reduce((count, n) => count + (n.userId === userId && !n.read ? 1 : 0), 0);
}

/** 학생 입장에서 본 도서의 신청 가능 여부 */
export type RequestState = "available" | "owned" | "requested" | "rejected";

export function requestStateFor(db: Db, book: Book, userId: string): RequestState {
  if (book.owned) return "owned";
  if (db.requests.some((r) => r.bookId === book.id && r.userId === userId)) return "requested";
  if (db.reviews[book.id]?.status === "rejected") return "rejected";
  return "available";
}

/** 신청이 들어온 도서 한 권 = 사서 화면의 한 줄 */
export interface BookRow {
  book: Book;
  review: Review;
  /** 최근 신청 순 */
  requests: BookRequest[];
  /** requests와 같은 순서의 신청 학생 */
  requesters: User[];
  latestAt: number;
  firstAt: number;
}

export function bookRows(db: Db): BookRow[] {
  const usersById = new Map(db.users.map((u) => [u.id, u]));
  const rows: BookRow[] = [];
  for (const book of db.books) {
    const review = db.reviews[book.id];
    if (!review) continue;
    const requests = db.requests.filter((r) => r.bookId === book.id).sort((a, b) => b.createdAt - a.createdAt);
    if (requests.length === 0) continue;
    rows.push({
      book,
      review,
      requests,
      requesters: requests.flatMap((r) => usersById.get(r.userId) ?? []),
      latestAt: requests[0].createdAt,
      firstAt: requests[requests.length - 1].createdAt,
    });
  }
  return rows.sort((a, b) => b.latestAt - a.latestAt);
}

/** 아직 소장하지 않은 도서 중 신청이 많은 순 */
export function popularBooks(db: Db, limit: number): { book: Book; count: number }[] {
  return db.books
    .filter((book) => !book.owned)
    .map((book) => ({ book, count: requestCount(db, book.id) }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
