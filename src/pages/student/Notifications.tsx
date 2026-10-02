import { useState } from "react";
import { useNavigate } from "react-router";
import { StatusBadge } from "../../components/ui";
import { timeAgo } from "../../lib/format";
import { markAllNotificationsRead, markNotificationRead, useDb } from "../../store/db";
import { currentUser } from "../../store/selectors";
import type { Notification } from "../../types";

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

export function Notifications() {
  const db = useDb();
  const user = currentUser(db)!;
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const mine = db.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
  const unread = mine.filter((n) => !n.read).length;
  const visible = unreadOnly ? mine.filter((n) => !n.read) : mine;

  const open = (notification: Notification) => {
    markNotificationRead(notification.id);
    navigate(`/books/${notification.bookId}`);
  };

  return (
    <main className="main main--narrow">
      <div className="row row--end">
        <div>
          <h1 className="page-title">알림</h1>
          <p className="page-desc">신청한 도서의 처리 상태가 바뀌면 여기로 알려드려요.</p>
        </div>
        <div className="spacer" />
        <button type="button" className="btn btn--sm" disabled={unread === 0} onClick={markAllNotificationsRead}>
          모두 읽음 처리
        </button>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button type="button" className={unreadOnly ? "btn btn--sm" : "btn btn--sm btn--dark"} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>
          전체
        </button>
        <button type="button" className={unreadOnly ? "btn btn--sm btn--dark" : "btn btn--sm"} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>
          읽지 않음 {unread}
        </button>
      </div>

      <div className="card card--flush">
        {visible.length === 0 && (
          <p className="empty" style={{ borderTop: 0 }}>
            {unreadOnly ? "읽지 않은 알림이 없어요." : "아직 받은 알림이 없어요."}
          </p>
        )}
        {visible.map((notification) => {
          const title = db.books.find((b) => b.id === notification.bookId)?.title ?? "삭제된 도서";
          return (
            <button key={notification.id} type="button" className={notification.read ? "notice" : "notice notice--unread"} onClick={() => open(notification)}>
              <span className="notice__dot" />
              <StatusBadge status={notification.status} />
              <span className="notice__text">
                {!notification.read && <span className="sr-only">읽지 않음: </span>}
                {message(notification, title)}
              </span>
              <span className="notice__time">{timeAgo(notification.createdAt)}</span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
