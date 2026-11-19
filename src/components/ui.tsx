import type { CSSProperties, ReactNode } from "react";
import { STATUS_LABEL } from "../lib/format";
import type { Status } from "../types";

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>;
}

export function HoldingTag({ owned }: { owned: boolean }) {
  return <span className={owned ? "tag tag--owned" : "tag"}>{owned ? "교내 소장" : "미소장"}</span>;
}

/** 표지 이미지가 없으면 X자 자리표시를 그린다. */
export function BookCover({ src, title, large }: { src?: string; title: string; large?: boolean }) {
  return (
    <div className={large ? "cover cover--lg" : "cover"}>
      {src ? (
        <img src={src} alt={`${title} 표지`} />
      ) : (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0 100 100M100 0 0 100" stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: ReactNode;
  variant?: "lg" | "hero";
}) {
  const modifier = variant === "hero" ? " stat--lg stat--hero" : variant === "lg" ? " stat--lg" : "";
  return (
    <div className={`card stat${modifier}`}>
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  large,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  large?: boolean;
}) {
  return (
    <div className={large ? "segmented segmented--lg" : "segmented"} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented__option"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  onChange,
  showTotal = false,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  showTotal?: boolean;
}) {
  if (pageCount <= 1 && !showTotal) return null;
  const pages = showTotal && pageCount > 9
    ? [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pageCount])].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b)
    : Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <nav className="pagination" aria-label="페이지">
      {showTotal && <span className="page-desc">{page.toLocaleString("ko-KR")} / {pageCount.toLocaleString("ko-KR")} 페이지</span>}
      {pages.map((n, i) => (
        <span key={n} className="pagination__item">
        {i > 0 && n > pages[i - 1] + 1 && <span className="page-desc" aria-hidden="true">…</span>}
        <button
          type="button"
          className="pagination__page"
          aria-current={n === page ? "page" : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
        </span>
      ))}
    </nav>
  );
}

/** grid 기반 표. columns는 grid-template-columns 값. */
export function Table({
  columns,
  minWidth,
  head,
  children,
}: {
  columns: string;
  minWidth?: number;
  head: ReactNode[];
  children: ReactNode;
}) {
  const style = { "--cols": columns, "--table-min": minWidth ? `${minWidth}px` : undefined } as CSSProperties;
  return (
    <div className="card card--flush table-wrap">
      <div className="table" role="table" style={style}>
        <div className="table__head" role="row">
          {head.map((cell, i) => (
            <div key={i} role="columnheader">
              {cell}
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
