import { useState } from "react";
import { Link, useParams } from "react-router";
import { BookCover, HoldingTag, StatusBadge } from "../../components/ui";
import { won } from "../../lib/format";
import { requestBook, useDb } from "../../store/db";
import { currentUser, requestCount, requestStateFor } from "../../store/selectors";

const BUTTON_LABEL = {
  available: "이 책 신청하기",
  owned: "소장 중",
  requested: "신청 완료",
  rejected: "반려된 도서",
} as const;

export function BookDetail() {
  const db = useDb();
  const user = currentUser(db)!;
  const { bookId } = useParams();
  const [error, setError] = useState("");
  const book = db.books.find((b) => b.id === bookId);

  if (!book) {
    return (
      <main className="main">
        <p className="card empty" style={{ borderTop: undefined }}>
          도서를 찾을 수 없어요. <Link to="/books">도서 검색으로 돌아가기</Link>
        </p>
      </main>
    );
  }

  const state = requestStateFor(db, book, user.id);
  const review = db.reviews[book.id];
  const count = requestCount(db, book.id);

  const handleRequest = () => {
    const result = requestBook(book.id);
    setError(result.ok ? "" : result.error);
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
            <HoldingTag owned={book.owned} />
            {review && !book.owned && <StatusBadge status={review.status} />}
          </div>
          <h1 className="detail__title">{book.title}</h1>
          <div>
            <div className="info-row"><span>저자</span><span>{book.author}</span></div>
            <div className="info-row"><span>출판사</span><span>{book.publisher}</span></div>
            <div className="info-row"><span>ISBN</span><span>{book.isbn}</span></div>
            <div className="info-row"><span>가격</span><span>{won(book.price)}</span></div>
            <div className="info-row"><span>출간일</span><span>{book.pubDate}</span></div>
          </div>
          <h2 style={{ marginTop: 8, fontSize: 16 }}>책 소개</h2>
          <p className="detail__desc">{book.description}</p>
        </div>

        <aside className="card request-card">
          <span className="stat__label">현재 신청 현황</span>
          <div className="request-card__count">
            {count}명<span> 신청 중</span>
          </div>
          <button type="button" className="btn btn--primary btn--block" style={{ height: 50 }} disabled={state !== "available"} onClick={handleRequest}>
            {BUTTON_LABEL[state]}
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {state === "rejected" && review?.reason && <p className="form-error">반려 사유: {review.reason}</p>}
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
