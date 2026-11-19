import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
const { studentApi, ApiError } = await import('../src/student-api/api.ts');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

test('search uses the correct backend and encodes the query', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({ url, options }); return json({ items: [], page: 1, pageSize: 20, total: 0 }); };
  await studentApi.search('어린 왕자', 'owned');
  const target = new URL(requests[0].url, 'http://example.test');
  assert.equal(target.pathname, '/api/books');
  assert.equal(target.searchParams.get('q'), '어린 왕자');
  assert.equal(target.searchParams.get('scope'), 'owned');
  assert.equal(requests[0].options.credentials, 'include');
});

test('request gets a CSRF token and sends bookId in the body', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return url === '/api/auth/csrf' ? json({ csrfToken: 'token-for-test' }) : json({ request: { id: '42' } }, 201);
  };
  assert.equal((await studentApi.request('9780306406157')).request.id, '42');
  assert.equal(calls[1].url, '/api/requests');
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'token-for-test');
  assert.deepEqual(JSON.parse(calls[1].options.body), { bookId: '9780306406157' });
});

test('server and network errors are surfaced without inventing success', async () => {
  globalThis.fetch = async () => json({ error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' } }, 401);
  await assert.rejects(studentApi.session(), (e) => e instanceof ApiError && e.status === 401 && e.code === 'AUTH_REQUIRED');
  globalThis.fetch = async () => { throw new Error('disconnected'); };
  await assert.rejects(studentApi.requests(), (e) => e instanceof ApiError && e.code === 'NETWORK_ERROR');
});

test('ISBN-less DLS entries keep their detail ID; unknown titles remain blocked', async () => {
  globalThis.fetch = async (url) => {
    if (url.endsWith('/books/dls-opaque')) return json({ id: 'dls-opaque', isbn: null, owned: true, ownership: 'OWNED' });
    return json({ id: '9780306406157', isbn: '9780306406157', owned: false, ownership: 'UNKNOWN', requestState: 'available' });
  };
  const book = await studentApi.detail('dls-opaque');
  assert.equal(book.id, 'dls-opaque');
  assert.equal(book.isbn, null);
  assert.equal(book.ownership, 'OWNED');
  assert.equal((await studentApi.detail('9780306406157')).requestable, false);
});


test('read all sends a CSRF-protected PATCH request', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return url === '/api/auth/csrf' ? json({ csrfToken: 'token-for-test' }) : json({ updated: 2 });
  };
  assert.equal((await studentApi.readAll()).updated, 2);
  assert.equal(calls[1].url, '/api/me/notifications/read-all');
  assert.equal(calls[1].options.method, 'PATCH');
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'token-for-test');
});


test('cancelling a request uses CSRF and does not parse an empty response', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return url === '/api/auth/csrf' ? json({ csrfToken: 'token-for-test' }) : new Response(null, { status: 204 });
  };
  assert.equal(await studentApi.cancel('42'), undefined);
  assert.equal(calls[1].url, '/api/me/requests/42');
  assert.equal(calls[1].options.method, 'DELETE');
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'token-for-test');
});


test('request counts use all requests, including unseen local pages', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/me/requests');
    return json({ items: ['pending', 'approved', 'rejected', 'purchased'].flatMap((status, index) =>
      Array.from({ length: index === 0 ? 22 : index }, () => ({ status }))) });
  };
  assert.deepEqual(await studentApi.requestCounts(), { PENDING: 22, APPROVED: 1, REJECTED: 2, PURCHASED: 3 });
});

test('popular books uses the server endpoint with session cookies', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return json({ items: [{ book: { id: '9780306406157', isbn: '9780306406157', title: '도서' }, count: 3 }] });
  };
  const response = await studentApi.popular();
  assert.equal(calls[0].url, '/api/books/popular');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(response.items[0].request_count, 3);
});

test('four-digit student numbers derive grade, class, and roster number', async () => {
  const { parseStudentNumber } = await import('../src/lib/studentNumber.ts');
  assert.deepEqual(parseStudentNumber('1407'), { studentNo: '1407', classNo: '1-4', grade: 1, classroom: 4, number: 7 });
  for (const value of ['10407', '1400', '1007', '4407']) assert.equal(parseStudentNumber(value), null);
});

test('admin bulk actions pass every selected book to the server', async () => {
  const { librarianApi } = await import('../src/student-api/api.ts');
  const calls = [];
  const ids = ['9780306406157', '9788936434120'];
  globalThis.fetch = async (url, options) => {
    if (url === '/api/auth/csrf') return json({ csrfToken: 'token-for-test' });
    calls.push({ url, body: JSON.parse(options.body) });
    return json({ changed: 2 });
  };
  await librarianApi.changeStatus(ids, 'rejected', '테스트 반려');
  await librarianApi.revert(ids);
  assert.deepEqual(calls, [
    { url: '/api/admin/books/status', body: { bookIds: ids, status: 'rejected', reason: '테스트 반려' } },
    { url: '/api/admin/books/revert', body: { bookIds: ids } },
  ]);
});

test('notification keeps its book link and relative-time timestamp', async () => {
  globalThis.fetch = async () => json({
    items: [{ id: '1', bookId: '9780306406157', status: 'approved', message: '승인’,', read: false, createdAt: 1760000000000 }],
    unreadCount: 1,
  });
  const { items } = await studentApi.notifications();
  assert.equal(items[0].bookId, '9780306406157');
  assert.equal(items[0].created_at, 1760000000000);
});
