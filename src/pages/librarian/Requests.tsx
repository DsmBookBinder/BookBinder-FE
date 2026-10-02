import { useState } from "react";
import { Modal } from "../../components/Modal";
import { DownloadIcon, Pagination, StatusBadge, Table } from "../../components/ui";
import { downloadCsv } from "../../lib/export";
import { fileStamp, formatDate, formatShortDate, STATUS_LABEL, won } from "../../lib/format";
import { canTransition, setStatus, useDb } from "../../store/db";
import { bookRows, type BookRow } from "../../store/selectors";
import type { Status } from "../../types";

type Action = Exclude<Status, "pending">;

interface Filters {
  status: Status | "all";
  from: string;
  to: string;
  classNo: string;
  q: string;
}

const PAGE_SIZE = 6;
const STATUSES: Status[] = ["pending", "approved", "rejected", "purchased"];
const NO_FILTERS: Filters = { status: "all", from: "", to: "", classNo: "all", q: "" };

function matches(row: BookRow, filters: Filters): boolean {
  if (filters.status !== "all" && row.review.status !== filters.status) return false;
  if (filters.classNo !== "all" && !row.requesters.some((u) => u.classNo === filters.classNo)) return false;
  if (filters.from || filters.to) {
    const from = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : -Infinity;
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : Infinity;
    if (!row.requests.some((r) => r.createdAt >= from && r.createdAt <= to)) return false;
  }
  const q = filters.q.trim().toLowerCase();
  if (!q) return true;
  const haystack = [row.book.title, row.book.author, ...row.requesters.flatMap((u) => [u.name, u.studentNo ?? ""])];
  return haystack.join(" ").toLowerCase().includes(q);
}

function requesterSummary(row: BookRow): string {
  const [first, ...rest] = row.requesters;
  if (!first) return "-";
  return rest.length ? `${first.name} 외 ${rest.length}명` : first.name;
}

function RejectModal({ count, onConfirm, onClose }: { count: number; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("신청한 학생에게 전달할 반려 사유를 입력해 주세요.");
      return;
    }
    onConfirm(reason);
  };

  return (
    <Modal title={`${count}건 반려`} submitLabel="반려" onSubmit={handleSubmit} onClose={onClose}>
      <div className="field">
        <label htmlFor="reject-reason" className="field__label">반려 사유</label>
        <textarea id="reject-reason" className="input" rows={3} placeholder="예: 이미 비슷한 도서를 소장하고 있어요" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        <span className="cell-sub">신청한 학생의 알림에 그대로 표시돼요.</span>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}

export function Requests() {
  const db = useDb();
  const [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [rejecting, setRejecting] = useState<string[] | null>(null);

  const rows = bookRows(db);
  const filtered = rows.filter((row) => matches(row, filters));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  // 필터가 바뀌어 보이지 않게 된 줄은 선택에서 제외한다
  const selectedRows = filtered.filter((row) => selected.has(row.book.id));
  const allVisibleSelected = visible.length > 0 && visible.every((row) => selected.has(row.book.id));

  const classOptions = [...new Set(db.users.flatMap((u) => u.classNo ?? []))].sort();
  const countOf = (status: Status) => rows.filter((row) => row.review.status === status).length;
  const selectedIdsFor = (action: Action) =>
    selectedRows.filter((row) => canTransition(row.review.status, action)).map((row) => row.book.id);

  const applyFilters = (next: Filters) => {
    setFilters(next);
    setDraft(next);
    setPage(1);
  };

  const toggle = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    setSelected(next);
  };

  const act = (ids: string[], action: Action, reason?: string) => {
    if (action === "rejected" && reason === undefined) {
      setRejecting(ids);
      return;
    }
    setStatus(ids, action, reason);
    toggle(ids, false);
    setRejecting(null);
  };

  const handleExport = () => {
    downloadCsv(`신청도서목록_${fileStamp()}.csv`, [
      ["도서명", "저자", "출판사", "ISBN", "가격", "신청 수", "신청 학생", "최근 신청일", "상태", "반려 사유"],
      ...filtered.map((row) => [
        row.book.title,
        row.book.author,
        row.book.publisher,
        row.book.isbn,
        row.book.price,
        row.requests.length,
        row.requesters.map((u) => `${u.name}(${u.classNo ?? "-"})`).join(", "),
        formatDate(row.latestAt),
        STATUS_LABEL[row.review.status],
        row.review.reason ?? "",
      ]),
    ]);
  };

  const bulkButton = (action: Action, label: string) => {
    const ids = selectedIdsFor(action);
    return (
      <button type="button" className="btn btn--sm" disabled={ids.length === 0} onClick={() => act(ids, action)}>
        {label}
      </button>
    );
  };

  return (
    <main className="main" style={{ gap: 18, paddingTop: 28 }}>
      <div className="row row--end">
        <div>
          <h1 className="page-title">신청 도서 목록</h1>
          <p className="page-desc">학생들이 신청한 도서를 검토하고 조치하세요.</p>
        </div>
        <div className="spacer" />
        <button type="button" className="btn btn--primary" disabled={filtered.length === 0} onClick={handleExport}>
          <DownloadIcon />
          엑셀 내보내기
        </button>
      </div>

      <div className="card summary">
        <span>전체 <b>{rows.length}</b>건</span>
        {STATUSES.map((status) => (
          <div key={status} className="summary__item">
            <StatusBadge status={status} />
            <span><b>{countOf(status)}</b>건</span>
          </div>
        ))}
      </div>

      <form
        className="card filters"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters(draft);
        }}
      >
        <div className="field">
          <label htmlFor="f-status" className="field__label field__label--sm">상태</label>
          <select id="f-status" className="input input--sm" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Filters["status"] })}>
            <option value="all">전체</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABEL[status]}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-from" className="field__label field__label--sm">신청 기간</label>
          <div className="row" style={{ gap: 6 }}>
            <input id="f-from" className="input input--sm" type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
            <span>~</span>
            <input aria-label="종료일" className="input input--sm" type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-class" className="field__label field__label--sm">학년/반</label>
          <select id="f-class" className="input input--sm" value={draft.classNo} onChange={(e) => setDraft({ ...draft, classNo: e.target.value })}>
            <option value="all">전체</option>
            {classOptions.map((classNo) => (
              <option key={classNo} value={classNo}>{classNo}</option>
            ))}
          </select>
        </div>
        <div className="field grow" style={{ minWidth: 200 }}>
          <label htmlFor="f-q" className="field__label field__label--sm">검색</label>
          <input id="f-q" className="input input--sm" type="text" placeholder="도서명, 저자, 학생 이름/학번" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
        </div>
        <button type="submit" className="btn btn--dark">적용</button>
        <button type="button" className="btn" onClick={() => applyFilters(NO_FILTERS)}>초기화</button>
      </form>

      <div className="bulkbar" aria-live="polite">
        <span><b>{selectedRows.length}</b>건 선택됨</span>
        <div className="spacer" />
        {bulkButton("approved", "일괄 승인")}
        {bulkButton("rejected", "일괄 반려")}
        {bulkButton("purchased", "구매완료 처리")}
      </div>

      <Table
        columns="44px 2.2fr 1fr 0.8fr 0.7fr 1.1fr 0.8fr 100px 1.2fr"
        minWidth={1040}
        head={[
          <input type="checkbox" className="checkbox" aria-label="이 페이지 전체 선택" checked={allVisibleSelected} onChange={(e) => toggle(visible.map((row) => row.book.id), e.target.checked)} />,
          "도서", "ISBN", "가격", "신청 수", "신청 학생", "최근 신청", "상태", "조치",
        ]}
      >
        {visible.length === 0 && <p className="empty">조건에 맞는 신청 도서가 없어요.</p>}
        {visible.map((row) => {
          const { book, review } = row;
          const isSelected = selected.has(book.id);
          return (
            <div key={book.id} className={isSelected ? "table__row table__row--selected" : "table__row"} role="row">
              <div role="cell">
                <input type="checkbox" className="checkbox" aria-label={`${book.title} 선택`} checked={isSelected} onChange={(e) => toggle([book.id], e.target.checked)} />
              </div>
              <div role="cell">
                <div style={{ fontWeight: 600 }}>{book.title}</div>
                <div className="cell-sub">{book.author} · {book.publisher}</div>
                {review.status === "rejected" && review.reason && <div className="cell-sub">사유: {review.reason}</div>}
              </div>
              <div role="cell" className="cell-sm">{book.isbn}</div>
              <div role="cell">{won(book.price)}</div>
              <div role="cell"><b>{row.requests.length}</b>명</div>
              <div role="cell" className="cell-sm" title={row.requesters.map((u) => `${u.name} (${u.classNo ?? "-"})`).join(", ")}>
                {requesterSummary(row)}
              </div>
              <div role="cell" className="cell-sm">{formatShortDate(row.latestAt)}</div>
              <div role="cell"><StatusBadge status={review.status} /></div>
              <div role="cell">
                {review.status === "pending" ? (
                  <div className="cell-actions">
                    <button type="button" className="btn btn--xs" onClick={() => act([book.id], "approved")}>승인</button>
                    <button type="button" className="btn btn--xs" onClick={() => act([book.id], "rejected")}>반려</button>
                  </div>
                ) : review.status === "approved" ? (
                  <button type="button" className="btn btn--xs" onClick={() => act([book.id], "purchased")}>구매완료 처리</button>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
            </div>
          );
        })}
      </Table>

      <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />

      {rejecting && <RejectModal count={rejecting.length} onConfirm={(reason) => act(rejecting, "rejected", reason)} onClose={() => setRejecting(null)} />}
    </main>
  );
}
