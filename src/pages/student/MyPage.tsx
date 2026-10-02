import { useState } from "react";
import { Link } from "react-router";
import { Modal } from "../../components/Modal";
import { StatCard, StatusBadge, Table } from "../../components/ui";
import { formatDate, STATUS_LABEL } from "../../lib/format";
import { cancelRequest, updateProfile, useDb } from "../../store/db";
import { currentUser } from "../../store/selectors";
import type { Status, User } from "../../types";

const STATUSES: Status[] = ["pending", "approved", "rejected", "purchased"];

function ProfileModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [name, setName] = useState(user.name);
  const [classNo, setClassNo] = useState(user.classNo ?? "");
  const [studentNo, setStudentNo] = useState(user.studentNo ?? "");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !/^[1-3]-\d{1,2}$/.test(classNo.trim()) || !/^\d{4,6}$/.test(studentNo.trim())) {
      setError("이름, 학년/반(예: 2-3), 학번(숫자)을 확인해 주세요.");
      return;
    }
    updateProfile({ name: name.trim(), classNo: classNo.trim(), studentNo: studentNo.trim() });
    onClose();
  };

  return (
    <Modal title="회원 정보 수정" submitLabel="저장" onSubmit={handleSubmit} onClose={onClose}>
      <div className="field">
        <label htmlFor="pf-name" className="field__label">이름</label>
        <input id="pf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="pf-class" className="field__label">학년/반</label>
          <input id="pf-class" className="input" placeholder="예: 2-3" value={classNo} onChange={(e) => setClassNo(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-no" className="field__label">학번</label>
          <input id="pf-no" className="input" placeholder="예: 20315" value={studentNo} onChange={(e) => setStudentNo(e.target.value)} />
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}

export function StudentMyPage() {
  const db = useDb();
  const user = currentUser(db)!;
  const [editing, setEditing] = useState(false);

  const mine = db.requests
    .filter((r) => r.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .flatMap((request) => {
      const book = db.books.find((b) => b.id === request.bookId);
      const review = db.reviews[request.bookId];
      return book && review ? [{ request, book, status: review.status, reason: review.reason }] : [];
    });

  return (
    <main className="main main--split">
      <aside className="card profile">
        <div className="profile__avatar" aria-hidden="true">{user.name.slice(0, 1)}</div>
        <div className="profile__name">{user.name}</div>
        <div>
          <div className="info-row"><span>학년/반</span><span>{user.classNo ?? "-"}</span></div>
          <div className="info-row"><span>학번</span><span>{user.studentNo ?? "-"}</span></div>
          <div className="info-row"><span>아이디</span><span>{user.loginId}</span></div>
          <div className="info-row"><span>가입일</span><span>{formatDate(user.joinedAt)}</span></div>
        </div>
        <button type="button" className="btn btn--block" onClick={() => setEditing(true)}>
          회원 정보 수정
        </button>
      </aside>

      <div className="stack grow">
        <h1 className="page-title">내 신청 도서</h1>
        <div className="stats">
          {STATUSES.map((status) => (
            <StatCard key={status} label={STATUS_LABEL[status]} value={mine.filter((m) => m.status === status).length} />
          ))}
        </div>

        <Table columns="2fr 1fr 1fr 100px 90px" minWidth={600} head={["도서명", "저자", "신청일", "상태", <span className="sr-only">조치</span>]}>
          {mine.length === 0 && (
            <p className="empty">
              아직 신청한 도서가 없어요. <Link to="/books">도서 검색하러 가기</Link>
            </p>
          )}
          {mine.map(({ request, book, status, reason }) => (
            <div key={request.id} className="table__row" role="row">
              <div role="cell">
                <Link to={`/books/${book.id}`} style={{ color: "inherit", textDecoration: "none" }}>{book.title}</Link>
                {status === "rejected" && reason && <div className="cell-sub">사유: {reason}</div>}
              </div>
              <div role="cell" className="ellipsis">{book.author}</div>
              <div role="cell">{formatDate(request.createdAt)}</div>
              <div role="cell"><StatusBadge status={status} /></div>
              <div role="cell">
                {status === "pending" ? (
                  <button type="button" className="link-button" onClick={() => cancelRequest(request.id)}>
                    신청 취소
                  </button>
                ) : (
                  <span className="muted cell-sm">—</span>
                )}
              </div>
            </div>
          ))}
        </Table>
      </div>

      {editing && <ProfileModal user={user} onClose={() => setEditing(false)} />}
    </main>
  );
}
