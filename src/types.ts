export type Role = "student" | "librarian";

/** 신청 도서의 처리 상태 (도서 단위로 관리) */
export type Status = "pending" | "approved" | "rejected" | "purchased";

export interface User {
  id: string;
  loginId: string;
  password: string;
  name: string;
  role: Role;
  /** 학생만: "2-3" 형식의 학년-반 */
  classNo?: string;
  /** 학생만: 학번 */
  studentNo?: string;
  joinedAt: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  pubDate: string;
  isbn: string;
  /** 가격 정보가 없으면 null — 예산 합계에서 빠진다 */
  price: number | null;
  description: string;
  /** 교내 소장 여부 */
  owned: boolean;
  cover?: string;
}

/** 학생 한 명의 신청 1건 */
export interface BookRequest {
  id: string;
  bookId: string;
  userId: string;
  createdAt: number;
}

/** 신청이 들어온 도서에 대한 사서의 처리 상태 */
export interface Review {
  bookId: string;
  status: Status;
  reason?: string;
  quantity: number;
  updatedAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  bookId: string;
  status: Exclude<Status, "pending">;
  reason?: string;
  createdAt: number;
  read: boolean;
}

/** 사서의 처리 내역 */
export interface LogEntry {
  id: string;
  at: number;
  bookId: string;
  status: Exclude<Status, "pending">;
}

export interface Db {
  users: User[];
  books: Book[];
  requests: BookRequest[];
  reviews: Record<string, Review>;
  notifications: Notification[];
  logs: LogEntry[];
  sessionUserId: string | null;
}
