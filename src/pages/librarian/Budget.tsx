import { useState } from "react";
import { DownloadIcon, StatCard, StatusBadge, Table } from "../../components/ui";
import { downloadCsv } from "../../lib/export";
import { fileStamp, STATUS_LABEL, won } from "../../lib/format";
import { setPrice, setQuantity, useDb } from "../../store/db";
import { bookRows, type BookRow } from "../../store/selectors";
import type { Status } from "../../types";

type Period = "semester" | "year" | "all";

const STATUSES: Status[] = ["pending", "approved", "purchased", "rejected"];
const PERIOD_LABEL: Record<Period, string> = { semester: "이번 학기", year: "올해", all: "전체 기간" };
const CHART_MONTHS = 6;

/** 1학기는 3월, 2학기는 9월에 시작한다 (1~2월은 전년도 2학기). */
function periodStart(period: Period, now: Date): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === "all") return -Infinity;
  if (period === "year") return new Date(year, 0, 1).getTime();
  if (month >= 8) return new Date(year, 8, 1).getTime();
  if (month >= 2) return new Date(year, 2, 1).getTime();
  return new Date(year - 1, 8, 1).getTime();
}

const subtotal = (row: BookRow) => (row.book.price ?? 0) * row.review.quantity;
const sum = (rows: BookRow[]) => rows.reduce((total, row) => total + subtotal(row), 0);

/** 최근 6개월의 월별 금액. 도서는 첫 신청이 들어온 달에 속한다. */
function monthlyAmounts(rows: BookRow[], now: Date) {
  return Array.from({ length: CHART_MONTHS }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (CHART_MONTHS - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const inMonth = rows.filter((row) => row.firstAt >= start.getTime() && row.firstAt < end.getTime());
    return { label: `${start.getMonth() + 1}월`, amount: sum(inMonth), books: inMonth.length };
  });
}

function MonthlyChart({ rows }: { rows: BookRow[] }) {
  const months = monthlyAmounts(rows, new Date());
  // 가리킨 달이 없으면 6개월 전체 합계를 보여 준다
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...months.map((m) => m.amount), 1);
  const readout =
    active === null
      ? { label: `최근 ${CHART_MONTHS}개월`, amount: months.reduce((t, m) => t + m.amount, 0), books: months.reduce((t, m) => t + m.books, 0) }
      : months[active];

  return (
    <div className="card card--pad">
      <h2 style={{ fontSize: 16 }}>월별 신청 금액</h2>
      <p className="page-desc" aria-live="polite">
        {readout.label} · <b style={{ color: "var(--text)" }}>{won(readout.amount)}</b> · {readout.books}권
      </p>
      <div className="chart" role="list" aria-label={`최근 ${CHART_MONTHS}개월 신청 금액`} onMouseLeave={() => setActive(null)}>
        {months.map((month, i) => (
          <div
            key={month.label}
            role="listitem"
            tabIndex={0}
            className="chart__col"
            aria-label={`${month.label} ${won(month.amount)}, ${month.books}권`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <div className="chart__track">
              <div className="chart__bar" style={{ height: `${(month.amount / max) * 100}%`, opacity: active === null || active === i ? 1 : 0.45 }} />
            </div>
            <span className="chart__label">{month.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Budget() {
  const db = useDb();
  const [included, setIncluded] = useState<ReadonlySet<Status>>(new Set<Status>(["pending", "approved", "purchased"]));
  const [period, setPeriod] = useState<Period>("semester");

  const allRows = bookRows(db);
  const start = periodStart(period, new Date());
  const inPeriod = allRows.filter((row) => row.latestAt >= start);
  const rows = inPeriod.filter((row) => included.has(row.review.status));
  const missingPrice = rows.filter((row) => row.book.price === null).length;
  const sumOf = (status: Status) => sum(inPeriod.filter((row) => row.review.status === status));

  const toggleStatus = (status: Status) => {
    const next = new Set(included);
    if (!next.delete(status)) next.add(status);
    setIncluded(next);
  };

  const handleExport = () => {
    downloadCsv(`예상예산_${fileStamp()}.csv`, [
      ["도서명", "상태", "단가", "구매 수량", "소계"],
      ...rows.map((row) => [row.book.title, STATUS_LABEL[row.review.status], row.book.price, row.review.quantity, subtotal(row)]),
      ["합계", "", "", "", sum(rows)],
    ]);
  };

  return (
    <main className="main" style={{ paddingTop: 28 }}>
      <div className="row row--end">
        <div>
          <h1 className="page-title">총 예상 예산</h1>
          <p className="page-desc">신청된 도서 가격을 기준으로 계산한 예상 구매 비용이에요.</p>
        </div>
        <div className="spacer" />
        <button type="button" className="btn btn--primary" disabled={rows.length === 0} onClick={handleExport}>
          <DownloadIcon />
          엑셀 내보내기
        </button>
      </div>

      <div className="card checks">
        <span className="checks__title">계산에 포함할 상태</span>
        {STATUSES.map((status) => (
          <label key={status} className="check">
            <input type="checkbox" className="checkbox" checked={included.has(status)} onChange={() => toggleStatus(status)} />
            {STATUS_LABEL[status]}
          </label>
        ))}
        <div className="spacer" />
        <div className="field">
          <label htmlFor="b-period" className="field__label field__label--sm">기간</label>
          <select id="b-period" className="input input--sm" style={{ minWidth: 140 }} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {(Object.keys(PERIOD_LABEL) as Period[]).map((value) => (
              <option key={value} value={value}>{PERIOD_LABEL[value]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats" style={{ gap: 16 }}>
        <StatCard variant="hero" label="총 예상 예산" value={won(sum(rows))} />
        <StatCard variant="lg" label="대기 합계" value={won(sumOf("pending"))} />
        <StatCard variant="lg" label="승인 합계" value={won(sumOf("approved"))} />
        <StatCard variant="lg" label="구매완료 합계" value={won(sumOf("purchased"))} />
      </div>

      <div className="budget-layout">
        <div className="budget-layout__table">
          <Table columns="2fr 100px 1fr 110px 1fr" minWidth={560} head={["도서명", "상태", "단가", "구매 수량", "소계"]}>
            {rows.length === 0 && <p className="empty">선택한 조건에 해당하는 도서가 없어요.</p>}
            {rows.map((row) => (
              <div key={row.book.id} className="table__row" role="row">
                <div role="cell">{row.book.title}</div>
                <div role="cell"><StatusBadge status={row.review.status} /></div>
                <div role="cell">
                  {row.book.price === null ? (
                    <input
                      type="number"
                      className="qty qty--price"
                      min={0}
                      step={100}
                      placeholder="가격 입력"
                      aria-label={`${row.book.title} 단가`}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      onBlur={(e) => {
                        const price = Number(e.target.value);
                        if (e.target.value && price > 0) setPrice(row.book.id, Math.round(price));
                      }}
                    />
                  ) : (
                    won(row.book.price)
                  )}
                </div>
                <div role="cell">
                  <input
                    type="number"
                    className="qty"
                    min={0}
                    aria-label={`${row.book.title} 구매 수량`}
                    value={row.review.quantity}
                    onChange={(e) => setQuantity(row.book.id, Number(e.target.value))}
                  />
                </div>
                <div role="cell">{row.book.price === null ? <span className="muted">—</span> : won(subtotal(row))}</div>
              </div>
            ))}
          </Table>
        </div>

        <div className="budget-layout__side">
          <MonthlyChart rows={allRows.filter((row) => included.has(row.review.status))} />
          <div className="card card--note" style={{ padding: "18px 20px" }}>
            <div className="between">
              <span>가격 정보 없는 도서</span>
              <b style={{ color: "var(--text)" }}>{missingPrice}권</b>
            </div>
            <p style={{ marginTop: 8, fontSize: 12 }}>
              가격이 비어 있으면 예산 합계에서 빠져요. 목록에서 직접 입력할 수 있어요.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
