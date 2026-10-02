import { useState } from "react";
import { Link } from "react-router";
import { Modal } from "../../components/Modal";
import { StatCard, StatusBadge, Table } from "../../components/ui";
import { formatDate, formatDateTime } from "../../lib/format";
import { changePassword, useDb } from "../../store/db";
import { currentUser } from "../../store/selectors";

const RECENT_LIMIT = 8;

/** 이번 주 월요일 0시 */
function weekStart(now = new Date()): number {
  const daysSinceMonday = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday).getTime();
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (next.length < 8) return setError("새 비밀번호는 8자 이상이어야 해요.");
    if (next !== confirm) return setError("새 비밀번호가 서로 달라요.");
    const result = changePassword(current, next);
    if (!result.ok) return setError(result.error);
    onClose();
  };

  return (
    <Modal title="비밀번호 변경" submitLabel="변경" onSubmit={handleSubmit} onClose={onClose}>
      <div className="field">
        <label htmlFor="pw-current" className="field__label">현재 비밀번호</label>
        <input id="pw-current" className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label htmlFor="pw-next" className="field__label">새 비밀번호</label>
        <input id="pw-next" className="input" type="password" autoComplete="new-password" placeholder="8자 이상" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pw-confirm" className="field__label">새 비밀번호 확인</label>
        <input id="pw-confirm" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}

export function LibrarianMyPage() {
  const db = useDb();
  const user = currentUser(db)!;
  const [changing, setChanging] = useState(false);

  const reviews = Object.values(db.reviews);
  const since = weekStart();
  const thisWeek = db.logs.filter((log) => log.at >= since);
  const recent = [...db.logs].sort((a, b) => b.at - a.at).slice(0, RECENT_LIMIT);

  return (
    <main className="main main--split">
      <aside className="card profile">
        <div className="profile__avatar" aria-hidden="true">{user.name.slice(0, 1)}</div>
        <div className="profile__name">{user.name} 선생님</div>
        <div>
          <div className="info-row"><span>역할</span><span>사서</span></div>
          <div className="info-row"><span>아이디</span><span>{user.loginId}</span></div>
          <div className="info-row"><span>가입일</span><span>{formatDate(user.joinedAt)}</span></div>
        </div>
        <button type="button" className="btn btn--block" onClick={() => setChanging(true)}>
          비밀번호 변경
        </button>
      </aside>

      <div className="stack grow">
        <h1 className="page-title">처리 현황</h1>
        <div className="stats">
          <StatCard label="처리 대기" value={reviews.filter((r) => r.status === "pending").length} />
          <StatCard label="이번 주 승인" value={thisWeek.filter((log) => log.status === "approved").length} />
          <StatCard label="이번 주 반려" value={thisWeek.filter((log) => log.status === "rejected").length} />
          <StatCard label="구매완료 누적" value={reviews.filter((r) => r.status === "purchased").length} />
        </div>

        <div className="row">
          <h2 className="section-title">최근 처리 내역</h2>
          <div className="spacer" />
          <Link to="/librarian/requests">신청 목록으로 이동</Link>
        </div>

        <Table columns="160px 2fr 120px" minWidth={480} head={["처리 일시", "도서명", "변경 상태"]}>
          {recent.length === 0 && <p className="empty">아직 처리한 내역이 없어요.</p>}
          {recent.map((log) => (
            <div key={log.id} className="table__row" role="row">
              <div role="cell" className="cell-sm muted">{formatDateTime(log.at)}</div>
              <div role="cell">{db.books.find((b) => b.id === log.bookId)?.title ?? "삭제된 도서"}</div>
              <div role="cell"><StatusBadge status={log.status} /></div>
            </div>
          ))}
        </Table>
      </div>

      {changing && <PasswordModal onClose={() => setChanging(false)} />}
    </main>
  );
}
