const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api';
const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 5000);

type ApiFetchOptions = RequestInit & { next?: { revalidate?: number } };

const getCookieValue = (name: string): string | null => {
  if (typeof window !== 'undefined') {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split('=')[1]) : null;
  }
  return null;
};

async function getServerToken(): Promise<string | null> {
  const mod = await import('next/headers');
  const store = await mod.cookies();
  return store.get('auction_token')?.value || null;
}

async function authHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const token = typeof window === 'undefined' ? await getServerToken() : null;
  const csrf = getCookieValue('auction_csrf');

  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrf ? { 'x-csrf-token': csrf } : {}),
  };
}

const baseOptions = { credentials: 'include' as RequestCredentials };

async function fetchWithTimeout(input: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`คำขอไปยัง API ใช้เวลานานเกิน ${REQUEST_TIMEOUT_MS / 1000} วินาที`);
    }
    if (error instanceof Error && error.message.toLowerCase().includes('fetch failed')) {
      throw new Error(`ไม่สามารถเชื่อมต่อ API ได้ที่ ${API_BASE}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonResponse(res: Response, path: string) {
  const raw = await res.text();
  const contentType = res.headers.get('content-type') || '';

  if (!raw) return null;

  if (!contentType.includes('application/json')) {
    throw new Error(`รูปแบบข้อมูลจาก ${path} ไม่ถูกต้อง`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`ข้อมูลที่ได้รับจาก ${path} ไม่สามารถอ่านได้`);
  }
}

async function ensureCsrfOnClient() {
  if (typeof window === 'undefined') return;
  if (getCookieValue('auction_csrf')) return;
  await fetch(`${API_BASE}/auth/csrf`, {
    ...baseOptions,
    method: 'GET',
    cache: 'no-store',
  });
}

export async function apiGet(path: string, options?: ApiFetchOptions) {
  const hasRevalidate = options?.next?.revalidate !== undefined;
  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...baseOptions,
    ...(hasRevalidate ? {} : { cache: 'no-store' as RequestCache }),
    ...(options || {}),
    headers: await authHeaders(),
  });
  const data = await readJsonResponse(res, path);
  if (!res.ok) throw new Error(data.error || `ดึงข้อมูลจาก ${path} ไม่สำเร็จ`);
  return data;
}

export async function apiPost(path: string, body: unknown) {
  await ensureCsrfOnClient();

  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...baseOptions,
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  const data = await readJsonResponse(res, path);
  if (!res.ok) throw new Error(data.error || `ส่งข้อมูลไปที่ ${path} ไม่สำเร็จ`);
  return data;
}

export async function apiPut(path: string, body: unknown) {
  await ensureCsrfOnClient();

  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...baseOptions,
    method: 'PUT',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  const data = await readJsonResponse(res, path);
  if (!res.ok) throw new Error(data.error || `อัปเดตข้อมูลที่ ${path} ไม่สำเร็จ`);
  return data;
}

export async function apiPatch(path: string, body: unknown) {
  await ensureCsrfOnClient();

  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...baseOptions,
    method: 'PATCH',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  const data = await readJsonResponse(res, path);
  if (!res.ok) throw new Error(data.error || `อัปเดตข้อมูลที่ ${path} ไม่สำเร็จ`);
  return data;
}

export async function apiUpload(path: string, files: File[]): Promise<{ urls: string[] }> {
  await ensureCsrfOnClient();
  const formData = new FormData();
  for (const file of files) formData.append('images', file);

  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...baseOptions,
    method: 'POST',
    headers: await authHeaders(), // no Content-Type — browser sets multipart boundary
    body: formData,
  });

  const data = await readJsonResponse(res, path);
  if (!res.ok) throw new Error(data.error || `อัปโหลดไฟล์ไปที่ ${path} ไม่สำเร็จ`);
  return data as { urls: string[] };
}
