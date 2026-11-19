import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { Pagination, StatusBadge } from "../../components/ui";
import { timeAgo } from "../../lib/format";
import { markAllNotificationsRead, markNotificationRead, useDb } from "../../store/db";
import { currentUser } from "../../store/selectors";
import type { Notification } from "../../types";
import { PAGE_SIZE, studentApi } from "../../student-api/api";
import type { LiveContext } from "../../student-api/StudentRoutes";

function message(notification: Notification, title: string): string {
  switch (notification.status) {
    case "approved":
      return `‘${title}’ 신청이 승인되었어요.`;
    case "purchased":
      return `‘${title}’ 구매가 완료되어 대출할 수 있어요.`;
    case "rejected":
      return `‘${title}’ 신청이 반려되었어요.${notification.reason ? ` (사유: ${notification.reason})` : ""}`;
  }
}

export function Notifications({ live = false }: { live?: boolean }) {
  const db = useDb();
  const session = useOutletContext<LiveContext | null>();
  const user = currentUser(db);
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [remote, setRemote] = useState<Awaited<ReturnType<typeof studentApi.notifications>> | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!live) return;
    let active = true;
    studentApi.notifications(page, unreadOnly).then((result) => {
      if (active) setRemote(result);
    }).catch((failure: Error) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [live, page, unreadOnly, revision]);

  const mine = live ? [] : db.notifications.filter((n) => n.userId === user?.id).sort((a, b) => b.createdAt - a.createdAt);
  const unread = live ? remote?.unread_count ?? 0 : mine.filter((n) => !n.read).length;
  const entries = unreadOnly ? mine.filter((n) => !n.read) : mine;
  const pageSize = live ? remote?.page_size ?? PAGE_SIZE : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil((live ? remote?.total ?? 0 : entries.length) / pageSize));
  const current = live ? remote?.page ?? 1 : Math.min(page, pageCount);
  const visible = live
    ? (remote?.items ?? []).map((n) => ({ id: n.id, bookId: n.bookId, status: n.type, read: n.is_read, createdAt: n.created_at, text: n.message }))
    : entries.slice((current - 1) * pageSize, current * pageSize).map((n) => ({
        ...n, text: message(n, db.books.find((b) => b.id === n.bookId)?.title ?? "삭제된 도서"),
      }));

  function select(unreadOnly: boolean) {
    setError("");
    setPage(1);
    setUnreadOnly(unreadOnly);
  }

  async function open(notification: typeof visible[number]) {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (live && !notification.read) await studentApi.read(notification.id);
      if (!live) markNotificationRead(notification.id);
      void session?.refreshUnread();
      navigate(`/books/${encodeURIComponent(notification.bookId)}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "알림을 읽음 처리하지 못했어요.");
    } finally { setBusy(false); }
  }

  async function markAll() {
    if (busy) return;
    if (!live) { markAllNotificationsRead(); return; }
    setError("");
    setBusy(true);
    try {
      await studentApi.readAll();
      await session?.refreshUnread();
      setPage(1);
      setRevision((n) => n + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "알림을 읽음 처리하지 못했어요.");
    } finally { setBusy(false); }
  }

  return (
    <main className="main main--narrow">
      <div className="row row--end">
        <div>
          <h1 className="page-title">알림</h1>
          <p className="page-desc">신청한 도서의 처리 상태가 바뀌면 여기로 알려드려요.</p>
        </div>
        <div className="spacer" />
        <button type="button" className="btn btn--sm" disabled={busy || unread === 0} onClick={markAll}>
          모두 읽음 처리
        </button>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button type="button" className={unreadOnly ? "btn btn--sm" : "btn btn--sm btn--dark"} aria-pressed={!unreadOnly} onClick={() => select(false)}>
          전체
        </button>
        <button type="button" className={unreadOnly ? "btn btn--sm btn--dark" : "btn btn--sm"} aria-pressed={unreadOnly} onClick={() => select(true)}>
          읽지 않음 {unread}
        </button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="card card--flush">
        {visible.length === 0 && (
          <p className="empty" style={{ borderTop: 0 }}>
            {unreadOnly ? "읽지 않은 알림이 없어요." : "아직 받은 알림이 없어요."}
          </p>
        )}
        {visible.map((notification) => {
          return (
            <button key={notification.id} type="button" className={notification.read ? "notice" : "notice notice--unread"} onClick={() => open(notification)}>
              <span className="notice__dot" />
              <StatusBadge status={notification.status} />
              <span className="notice__text">
                {!notification.read && <span className="sr-only">읽지 않음: </span>}
                {notification.text}
              </span>
              <span className="notice__time">{timeAgo(notification.createdAt)}</span>
            </button>
          );
        })}
      </div>
      <Pagination page={current} pageCount={pageCount} showTotal onChange={setPage} />
    </main>
  );
}
