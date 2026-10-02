import type { Status } from "../types";

export const STATUS_LABEL: Record<Status, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  purchased: "구매완료",
};

const pad = (n: number) => String(n).padStart(2, "0");

export function won(price: number | null): string {
  return price === null ? "가격 미정" : `₩${price.toLocaleString("ko-KR")}`;
}

/** 2026.10.02 */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 10.02 */
export function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 10.02 14:30 */
export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${formatShortDate(ts)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const min = Math.floor((now - ts) / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatDate(ts);
}

/** yyyymmdd — 내보내기 파일 이름용 */
export function fileStamp(ts = Date.now()): string {
  return formatDate(ts).replaceAll(".", "");
}
