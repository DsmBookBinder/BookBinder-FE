import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import { BookCover, HoldingTag, StatusBadge } from "../../components/ui";
import { won } from "../../lib/format";
import { requestBook, useDb } from "../../store/db";
import { currentUser, requestCount, requestStateFor } from "../../store/selectors";
import { studentApi, type ServerBook } from "../../student-api/api";
import type { LiveContext } from "../../student-api/StudentRoutes";

const BUTTON_LABEL = {
  available: "이 책 신청하기",
  owned: "소장 중",
  requested: "신청 완료",
  rejected: "반려된 도서",
  unknown: "소장 여부 확인 불가",
} as const;

export function BookDetail({ live = false }: { live?: boolean }) {
  const session = useOutletContext<LiveContext | null>();
  const db = useDb();
  const user = currentUser(db);
  const { bookId } = useParams();
  const [error, setError] = useState("");
  const [remote, setRemote] = useState<ServerBook | null>(null);
  const [loading, setLoading] = useState(live);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!live || !bookId) return;
    let active = true;
    setRemote(null);
    setLoading(true);
    setError("");
    studentApi.bookDetail(bookId).then((result) => {
      if (active) setRemote(result);
    }).catch((failure: Error) => {
      if (active) setError(failure.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [live, bookId]);

  const book = live ? remote : db.books.find((b) => b.id === bookId);

  if (!book) {
    return (
      <main className="main">
        <p className="card empty" style={{ borderTop: undefined }}>
          {loading ? "도서 정보를 불러오고 있어요." : error || "도서를 찾을 수 없어요."} <Link to="/books">도서 검색으로 돌아가기</Link>
        </p>
      </main>
    );
  }

  const localBook = live ? undefined : db.books.find((item) => item.id === book.id);
  const state = live
    ? remote?.ownership === "UNKNOWN" ? "unknown" : remote?.requestState ?? "unknown"
    : localBook && user ? requestStateFor(db, localBook, user.id) : "unknown";
  const review = live ? remote?.review : db.reviews[book.id];
  const count = live ? remote?.requestCount ?? 0 : requestCount(db, book.id);

  const handleRequest = async () => {
    if (state !== "available" || saving) return;
    if (!live) {
      const result = requestBook(book.id);
      setError(result.ok ? "" : result.error);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await studentApi.request(book.id);
      setRemote((current) => current?.id === book.id
        ? { ...current, requestState: "requested", requestCount: (current.requestCount ?? 0) + 1 }
        : current);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "신청을 처리하지 못했어요.");
    } finally { setSaving(false); }
  };

  return (
    <main className="main" style={{ gap: 24, paddingTop: 28 }}>
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/books">도서 검색</Link> / {book.title}
      </nav>

      <div className="detail">
        <BookCover large src={book.cover} title={book.title} />

        <div className="detail__body">
          <div className="row" style={{ gap: 8 }}>
            {state === "unknown" ? <span className="tag">소장 미확인</span> : <HoldingTag owned={book.owned} />}
            {review && !book.owned && <StatusBadge status={review.status} />}
          </div>
          <h1 className="detail__title">{book.title}</h1>
          <div>
            <div className="info-row"><span>저자</span><span>{book.author || "-"}</span></div>
            <div className="info-row"><span>출판사</span><span>{book.publisher || "-"}</span></div>
            <div className="info-row"><span>ISBN</span><span>{book.isbn ?? "-"}</span></div>
            <div className="info-row"><span>가격</span><span>{won(book.price)}</span></div>
            <div className="info-row"><span>출간일</span><span>{book.pubDate ?? book.year ?? "-"}</span></div>
          </div>
          <h2 style={{ marginTop: 8, fontSize: 16 }}>책 소개</h2>
          <p className="detail__desc">{book.description || "도서 소개가 없어요."}</p>
        </div>

        <aside className="card request-card">
          <span className="stat__label">현재 신청 현황</span>
          <div className="request-card__count">
            {count}명<span> 신청 중</span>
          </div>
          <button type="button" className="btn btn--primary btn--block" style={{ height: 50 }} disabled={saving || state !== "available"} onClick={handleRequest}>
            {BUTTON_LABEL[state]}
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {state === "rejected" && review?.reason && <p className="form-error">반려 사유: {review.reason}</p>}
          {session?.demo && state === "available" && <p className="request-card__note">이 책은 시연용으로 신청할 수 있어요.</p>}
          <p className="request-card__note">
            {state === "requested" ? (
              <>
                신청이 접수됐어요. <Link to="/mypage">마이페이지</Link>에서 처리 상태를 확인할 수 있어요.
              </>
            ) : (
              "신청 후 마이페이지에서 처리 상태를 확인할 수 있어요. 이미 신청한 책은 ‘신청 완료’로 표시돼요."
            )}
          </p>
        </aside>
      </div>
    </main>
  );
}
