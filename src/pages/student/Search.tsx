import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { BookCover, HoldingTag, Pagination, Segmented } from "../../components/ui";
import { won } from "../../lib/format";
import { useDb } from "../../store/db";
import { currentUser, popularBooks, requestCount, requestStateFor } from "../../store/selectors";
import type { Book } from "../../types";

type Scope = "all" | "owned";
type Sort = "relevance" | "popular";

const PAGE_SIZE = 5;

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "all", label: "전체 도서" },
  { value: "owned", label: "교내 소장" },
];

const DISABLED_LABEL = { owned: "소장 중", requested: "신청 완료", rejected: "반려된 도서" } as const;

/** 검색어의 모든 단어가 들어 있어야 하고, 제목 > 저자 > 그 외 순으로 점수를 준다. 0이면 불일치. */
function relevance(book: Book, words: string[]): number {
  let score = 0;
  for (const word of words) {
    if (book.title.toLowerCase().includes(word)) score += 3;
    else if (book.author.toLowerCase().includes(word)) score += 2;
    else if (`${book.publisher} ${book.isbn} ${book.description}`.toLowerCase().includes(word)) score += 1;
    else return 0;
  }
  return score;
}

export function Search() {
  const db = useDb();
  const user = currentUser(db)!;
  const [params, setParams] = useSearchParams();

  // 검색 조건을 주소에 두어, 상세 화면에서 뒤로 왔을 때 그대로 남게 한다
  const query = params.get("q") ?? "";
  const scope: Scope = params.get("scope") === "owned" ? "owned" : "all";
  const sort: Sort = params.get("sort") === "popular" ? "popular" : "relevance";
  const [input, setInput] = useState(query);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: input.trim() });
  };

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = db.books
    .filter((book) => scope === "all" || book.owned)
    .map((book) => ({ book, score: words.length ? relevance(book, words) : 1, count: requestCount(db, book.id) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => (sort === "popular" ? b.count - a.count : 0) || b.score - a.score);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.get("page")) || 1), pageCount);
  const visible = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const popular = popularBooks(db, 5);

  return (
    <main className="main">
      <div>
        <h1 className="page-title">도서 검색 / 신청</h1>
        <p className="page-desc">찾는 책이 교내에 없으면 바로 신청할 수 있어요.</p>
      </div>

      <form className="searchbar" role="search" onSubmit={handleSubmit}>
        <Segmented large label="검색 범위" options={SCOPE_OPTIONS} value={scope} onChange={(value) => update({ scope: value === "all" ? "" : value })} />
        <label htmlFor="q" className="sr-only">
          검색어
        </label>
        <div className="searchbox">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input id="q" type="search" placeholder="제목, 저자, 키워드로 검색" value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        <button type="submit" className="btn btn--dark btn--tall">
          검색
        </button>
      </form>

      <div className="search-layout">
        <section className="card card--flush results" aria-label="검색 결과">
          <div className="results__head">
            <span>
              검색 결과 <b>{results.length}</b>건
            </span>
            <div className="spacer" />
            <span>정렬:</span>
            <button type="button" className="sort-option" aria-pressed={sort === "relevance"} onClick={() => update({ sort: "" })}>
              정확도순
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" className="sort-option" aria-pressed={sort === "popular"} onClick={() => update({ sort: "popular" })}>
              신청 많은 순
            </button>
          </div>

          {visible.length === 0 && (
            <p className="empty">
              {query ? `‘${query}’에 맞는 도서를 찾지 못했어요.` : "표시할 도서가 없어요."}
              {scope === "owned" && " 전체 도서에서 다시 검색해 보세요."}
            </p>
          )}

          {visible.map(({ book, count }) => {
            const state = requestStateFor(db, book, user.id);
            return (
              <article key={book.id} className="result">
                <BookCover src={book.cover} title={book.title} />
                <div className="result__body">
                  <div className="result__title">
                    <Link to={`/books/${book.id}`} className="ellipsis">
                      {book.title}
                    </Link>
                    <HoldingTag owned={book.owned} />
                  </div>
                  <span>
                    {book.author} · {book.publisher} · {book.year}
                  </span>
                  <span>{won(book.price)}</span>
                </div>
                <div className="result__side">
                  <span>
                    신청 <b>{count}</b>명
                  </span>
                  {state === "available" ? (
                    <Link to={`/books/${book.id}`} className="btn btn--primary btn--sm">
                      신청하기
                    </Link>
                  ) : (
                    <button type="button" className="btn btn--sm" disabled>
                      {DISABLED_LABEL[state]}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <aside className="sidebar">
          <div className="card card--pad">
            <h2 style={{ fontSize: 16 }}>많이 신청된 도서</h2>
            {popular.length === 0 ? (
              <p className="page-desc">아직 신청된 도서가 없어요.</p>
            ) : (
              <ol className="rank">
                {popular.map(({ book, count }, i) => (
                  <li key={book.id}>
                    <span className="rank__no">{i + 1}</span>
                    <Link to={`/books/${book.id}`} className="ellipsis">
                      {book.title}
                    </Link>
                    <span className="rank__count">{count}명</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p className="card card--note">
            교내 소장 목록을 먼저 확인하고, 없는 책은 전체 도서에서 찾아 신청할 수 있어요.
          </p>
        </aside>
      </div>

      <Pagination page={page} pageCount={pageCount} onChange={(n) => setParams({ ...Object.fromEntries(params), page: String(n) })} />
    </main>
  );
}
