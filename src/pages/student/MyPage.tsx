import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { Modal } from "../../components/Modal";
import { Pagination, StatCard, StatusBadge, Table } from "../../components/ui";
import { formatDate, STATUS_LABEL } from "../../lib/format";
import { cancelRequest, updateProfile, useDb } from "../../store/db";
import { currentUser } from "../../store/selectors";
import type { Status, User } from "../../types";
import { parseStudentNumber } from "../../lib/studentNumber";
import { PAGE_SIZE, studentApi, type StudentStatus } from "../../student-api/api";
import type { LiveContext } from "../../student-api/StudentRoutes";

const STATUSES: Status[] = ["pending", "approved", "rejected", "purchased"];

type ProfileInfo = Pick<User, "name" | "classNo" | "studentNo">;
function ProfileModal({ user, onClose, onSave }: { user: ProfileInfo; onClose: () => void; onSave?: (name: string, studentNo: string) => Promise<void> }) {
  const [name, setName] = useState(user.name);
  const [classNo, setClassNo] = useState(user.classNo ?? "");
  const [studentNo, setStudentNo] = useState(user.studentNo ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = parseStudentNumber(studentNo);

  const handleSubmit = async () => {
    if (busy) return;
    if (onSave) {
      setBusy(true);
      setError("");
      try { await onSave(name.trim(), studentNo.trim()); onClose(); }
      catch (failure) { setError(failure instanceof Error ? failure.message : "회원 정보를 저장하지 못했어요."); }
      finally { setBusy(false); }
      return;
    }
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
          <input id="pf-class" className="input" placeholder="예: 2-3" value={onSave ? parsed?.classNo ?? (studentNo === user.studentNo ? classNo : "") : classNo} readOnly={!!onSave} onChange={(e) => setClassNo(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pf-no" className="field__label">학번</label>
          <input id="pf-no" className="input" placeholder="예: 1407" inputMode="numeric" maxLength={onSave ? user.studentNo?.length === 5 ? 5 : 4 : undefined} value={studentNo} onChange={(e) => setStudentNo(e.target.value)} />
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}

export function StudentMyPage({ live = false }: { live?: boolean }) {
  const db = useDb();
  const session = useOutletContext<LiveContext | null>();
  const local = currentUser(db);
  const user = live && session
    ? { name: session.user.name, classNo: session.user.grade_class, studentNo: session.user.student_no,
        loginId: session.user.login_id, joinedAt: session.user.joinedAt }
    : local;
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(1);
  const [remote, setRemote] = useState<Awaited<ReturnType<typeof studentApi.requests>> | null>(null);
  const [counts, setCounts] = useState<Record<StudentStatus, number> | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!live) return;
    let active = true;
    Promise.all([studentApi.requests(page), studentApi.requestCounts()]).then(([result, totals]) => {
      if (active) { setRemote(result); setCounts(totals); }
    }).catch((failure: Error) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [live, page, revision]);

  const mine = live ? [] : db.requests
    .filter((r) => r.userId === local?.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .flatMap((request) => {
      const book = db.books.find((b) => b.id === request.bookId);
      const review = db.reviews[request.bookId];
      return book && review ? [{ request, book, status: review.status, reason: review.reason }] : [];
    });
  const pageCount = Math.max(1, Math.ceil((live ? remote?.total ?? 0 : mine.length) / PAGE_SIZE));
  const current = live ? remote?.page ?? 1 : Math.min(page, pageCount);
  const visible = live ? (remote?.items ?? []).map((item) => ({
    request: { id: item.id, createdAt: item.requested_at },
    book: { id: item.bookId, title: item.title, author: item.author },
    status: item.status.toLowerCase() as Status, reason: item.reject_reason,
  })) : mine.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  async function cancel(id: string) {
    if (!live) { cancelRequest(id); return; }
    if (busy) return;
    setBusy(true);
    setError("");
    try { await studentApi.cancel(id); setRevision((n) => n + 1); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "신청을 취소하지 못했어요."); }
    finally { setBusy(false); }
  }

  if (!user) return null;

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
            <StatCard key={status} label={STATUS_LABEL[status]} value={live ? counts?.[status.toUpperCase() as StudentStatus] ?? 0 : mine.filter((m) => m.status === status).length} />
          ))}
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <Table columns="2fr 1fr 1fr 100px 90px" minWidth={600} head={["도서명", "저자", "신청일", "상태", <span className="sr-only">조치</span>]}>
          {visible.length === 0 && (
            <p className="empty">
              {live && !remote && !error ? "불러오는 중…" : <>아직 신청한 도서가 없어요. <Link to="/books">도서 검색하러 가기</Link></>}
            </p>
          )}
          {visible.map(({ request, book, status, reason }) => (
            <div key={request.id} className="table__row" role="row">
              <div role="cell">
                <Link to={`/books/${encodeURIComponent(book.id)}`} style={{ color: "inherit", textDecoration: "none" }}>{book.title}</Link>
                {status === "rejected" && reason && <div className="cell-sub">사유: {reason}</div>}
              </div>
              <div role="cell" className="ellipsis">{book.author}</div>
              <div role="cell">{formatDate(request.createdAt)}</div>
              <div role="cell"><StatusBadge status={status} /></div>
              <div role="cell">
                {status === "pending" ? (
                  <button type="button" className="link-button" disabled={busy} onClick={() => void cancel(request.id)}>
                    신청 취소
                  </button>
                ) : (
                  <span className="muted cell-sm">—</span>
                )}
              </div>
            </div>
          ))}
        </Table>
        <Pagination page={current} pageCount={pageCount} showTotal onChange={setPage} />
      </div>

      {editing && <ProfileModal user={user} onClose={() => setEditing(false)} onSave={live && session ? async (name, studentNo) => {
        session.updateUser(await studentApi.updateProfile({ name, studentNo }));
      } : undefined} />}
    </main>
  );
}
