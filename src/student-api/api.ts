/** Adapts the current backend contract to the existing student screens. */
export type StudentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PURCHASED';
export type StudentUser = { id: string; name: string; role: 'STUDENT' | 'LIBRARIAN'; login_id?: string; grade_class?: string; student_no?: string; joinedAt: number };
export type StudentBook = { id: string; isbn: string | null; title: string; author: string; publisher: string; price: number | null; cover_url?: string; description: string; ownership: 'OWNED' | 'NOT_OWNED' | 'UNKNOWN'; requestable: boolean; request_count: number; libraryStatus?: string };
export type StudentRequest = { id: string; bookId: string; isbn: string | null; title: string; author: string; status: StudentStatus; reject_reason: string | null; requested_at: number };
export type StudentNotification = { id: string; bookId: string; type: Exclude<Lowercase<StudentStatus>, 'pending'>; message: string; is_read: boolean; created_at: number };
export type Page<T> = { items: T[]; page: number; page_size: number; total: number };
export type SearchPage = Page<StudentBook> & { has_next?: boolean };

type User = { id: string; name: string; role: 'student' | 'librarian'; loginId: string; classNo?: string; studentNo?: string; joinedAt: number };
type BookState = 'owned' | 'requested' | 'rejected' | 'available';
export type ServerBook = { id: string; isbn: string | null; title: string; author: string; publisher: string; price: number | null; cover?: string; description: string; owned: boolean; ownership?: StudentBook['ownership']; requestCount?: number; requestState?: BookState; libraryStatus?: string; year?: number | null; pubDate?: string | null; review?: { status: Lowercase<StudentStatus>; reason?: string } | null };
type RequestEntry = { request: { id: string; createdAt: number }; book: ServerBook; status: Lowercase<StudentStatus>; reason?: string };
type Notification = { id: string; bookId: string; status: StudentNotification['type']; message: string; read: boolean; createdAt: number };
type Signup = { name: string; loginId: string; password: string; password2: string; studentNo: string };
export const PAGE_SIZE = 20;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try { response = await fetch(`/api${path}`, { ...init, credentials: 'include' }); }
  catch { throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'); }
  if (!response.ok) {
    let error: { error?: { code?: string; message?: string; fields?: Record<string, string> } } = {};
    try { error = await response.json(); } catch { /* Non-JSON server or proxy error. */ }
    throw new ApiError(response.status, error.error?.code ?? 'UNKNOWN', error.error?.message ?? '요청을 처리하지 못했어요.', error.error?.fields);
  }
  return response;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchApi(path, init);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function writeOptions(method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<RequestInit> {
  const { csrfToken } = await call<{ csrfToken: string }>('/auth/csrf', { cache: 'no-store' });
  return { method, headers: { 'X-CSRF-Token': csrfToken, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) };
}

async function write<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  return call<T>(path, await writeOptions(method, body));
}

function userOut(user: User): StudentUser {
  return { id: user.id, name: user.name, role: user.role === 'student' ? 'STUDENT' : 'LIBRARIAN', login_id: user.loginId, grade_class: user.classNo, student_no: user.studentNo, joinedAt: user.joinedAt };
}

function bookOut(book: ServerBook): StudentBook {
  const ownership = book.ownership ?? (book.owned ? 'OWNED' : 'UNKNOWN');
  return {
    id: book.id, isbn: book.isbn, title: book.title, author: book.author, publisher: book.publisher,
    cover_url: book.cover, description: book.description, price: book.price, ownership,
    requestable: Boolean(book.isbn) && ownership === 'NOT_OWNED' && book.requestState === 'available',
    request_count: book.requestCount ?? 0, libraryStatus: book.libraryStatus,
  };
}

function paginate<T>(items: T[], page: number): Page<T> {
  const current = Math.min(Math.max(1, page), Math.max(1, Math.ceil(items.length / PAGE_SIZE)));
  return { items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), page: current, page_size: PAGE_SIZE, total: items.length };
}

async function requestEntries() {
  return (await call<{ items: RequestEntry[] }>('/me/requests')).items;
}

export const studentApi = {
  session: async () => {
    const response = await fetchApi('/me', { cache: 'no-store' });
    return { user: userOut(await response.json() as User), demo: response.headers.get('X-BookBinder-Data') === 'demo' };
  },
  login: async (loginId: string, password: string) => userOut((await write<{ user: User }>('/auth/login', 'POST', { loginId, password })).user),
  adminLogin: async (loginId: string, password: string) => userOut((await write<{ user: User }>('/auth/admin/login', 'POST', { loginId, password })).user),
  signup: (input: Signup) => write<User>('/auth/signup', 'POST', input),
  logout: () => write<void>('/auth/logout', 'POST'),
  updateProfile: async (input: { name: string; studentNo?: string }) => userOut(await write<User>('/me', 'PATCH', input)),
  searchPage: (query: string, scope: 'all' | 'owned', page: number, pageSize: number, sort: 'relevance' | 'popular' = 'relevance') => {
    const params = new URLSearchParams({ q: query, scope, sort, page: String(page), pageSize: String(pageSize) });
    return call<{ items: ServerBook[]; page: number; pageSize: number; total: number }>(`/books?${params}`);
  },
  search: async (query: string, scope: 'all' | 'owned', page = 1): Promise<SearchPage> => {
    const result = await studentApi.searchPage(query, scope, page, PAGE_SIZE);
    return { items: result.items.map(bookOut), page: result.page, page_size: result.pageSize, total: result.total };
  },
  popular: async () => {
    const result = await studentApi.popularEntries();
    return { items: result.items.map(({ book, count }) => bookOut({ ...book, requestCount: count })) };
  },
  popularEntries: () => call<{ items: { book: ServerBook; count: number }[] }>('/books/popular'),
  bookDetail: (id: string) => call<ServerBook>(`/books/${encodeURIComponent(id)}`),
  detail: async (id: string) => bookOut(await studentApi.bookDetail(id)),
  request: (id: string) => write<{ request: { id: string } }>('/requests', 'POST', { bookId: id }),
  cancel: (id: string) => write<void>(`/me/requests/${encodeURIComponent(id)}`, 'DELETE'),
  requests: async (page = 1) => paginate((await requestEntries()).map(({ request, book, status, reason }): StudentRequest => ({
    id: request.id, bookId: book.id, isbn: book.isbn, title: book.title, author: book.author, status: status.toUpperCase() as StudentStatus,
    reject_reason: reason ?? null, requested_at: request.createdAt,
  })), page),
  requestCounts: async (): Promise<Record<StudentStatus, number>> => {
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, PURCHASED: 0 };
    for (const { status } of await requestEntries()) counts[status.toUpperCase() as StudentStatus] += 1;
    return counts;
  },
  notifications: async (page = 1, unreadOnly = false) => {
    const result = await call<{ items: Notification[]; unreadCount: number }>(`/me/notifications?unreadOnly=${unreadOnly}`);
    const items = result.items.map((item): StudentNotification => ({ id: item.id, bookId: item.bookId, type: item.status, message: item.message, is_read: item.read, created_at: item.createdAt }));
    return { ...paginate(items, page), unread_count: result.unreadCount };
  },
  readAll: () => write<{ updated: number }>('/me/notifications/read-all', 'PATCH'),
  read: (id: string) => write<{ id: string; read: boolean }>(`/me/notifications/${encodeURIComponent(id)}/read`, 'PATCH'),
  changePassword: (currentPassword: string, newPassword: string, newPasswordConfirm: string) =>
    write<void>('/me/password', 'PATCH', { currentPassword, newPassword, newPasswordConfirm }),
};

export type LibrarianEntry = {
  book: ServerBook;
  review: { status: Lowercase<StudentStatus>; quantity: number; reason?: string };
  requests: { id: string; createdAt: number }[];
  requesters: { id: string; name: string; classNo?: string; studentNo?: string }[];
  latestAt: number;
};

export type BudgetFilter = 'semester' | 'year' | 'all';
export type BudgetStatus = 'pending' | 'approved' | 'rejected';
export type BudgetRow = Pick<LibrarianEntry, 'book' | 'review'> & { subtotal: number | null };
export type LiveBudgetData = {
  expected: BudgetRow[];
  purchased: BudgetRow[];
  expectedTotal: number;
  purchasedTotal: number;
  missingPriceCount: number;
  statusTotals: Record<Lowercase<StudentStatus>, number>;
  monthly: { label: string; amount: number; books: number }[];
};

export type AdminBooks = { items: LibrarianEntry[]; total: number; page: number; pageSize: number; classOptions: string[]; summary: Record<Lowercase<StudentStatus> | 'total', number> };
type AdminSummary = {
  pending: number; weekApproved: number; weekRejected: number; purchasedTotal: number;
  recentLogs: { id: string; at: number; bookTitle: string; status: Lowercase<StudentStatus> }[];
};

export const librarianApi = {
  books: (params: URLSearchParams) => call<AdminBooks>(`/admin/books?${params}`),
  changeStatus: (bookIds: string | string[], status: string, reason?: string) =>
    write<{ changed: number }>('/admin/books/status', 'POST', { bookIds: typeof bookIds === 'string' ? [bookIds] : bookIds, status, reason }),
  revert: (bookIds: string[]) => write<{ changed: number }>('/admin/books/revert', 'POST', { bookIds }),
  summary: () => call<AdminSummary>('/admin/summary'),
  updatePrice: (bookId: string, price: number | null) =>
    write<ServerBook>(`/admin/books/${encodeURIComponent(bookId)}/price`, 'PATCH', { price }),
  updateQuantity: (bookId: string, quantity: number) =>
    write<LibrarianEntry['review']>(`/admin/books/${encodeURIComponent(bookId)}/quantity`, 'PATCH', { quantity }),
  schoolExport: async (filters: Record<string, string>) =>
    (await fetchApi('/admin/books/export', await writeOptions('POST', { ...filters, format: 'school' }))).blob(),
  budget: (period: BudgetFilter, include: BudgetStatus[]) =>
    call<LiveBudgetData>(`/admin/budget?${new URLSearchParams({ period, include: include.join(',') })}`),
  budgetExport: async (period: BudgetFilter, include: BudgetStatus[]) =>
    (await fetchApi('/admin/budget/export', await writeOptions('POST', { period, include }))).blob(),
};

export function downloadBlob(data: Blob, name: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
