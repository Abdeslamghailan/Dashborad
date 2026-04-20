
// CMHW API Service
//
// Routes: Browser → /api/cmhw/* → Vite proxy → Express:3002/api/cmhw/* → Flask:5002
//
// Express handles Flask session management server-to-server (no CORS, no browser cookie issues).
// Dashboard JWT is sent via credentials:'include' (cookie), satisfying Express authenticateToken.
// X-Requested-With header satisfies the Express CSRF protection middleware.

const BASE_URL = '/api/cmhw';

async function request(path: string, options: any = {}) {
  const res = await fetch(BASE_URL + path, {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error || data?.detail || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const cmhwApi = {
  // Auth
  me: () => request('/me'),

  // Entities
  getEntities: () => request('/entities').catch(() => [] as any[]),
  createEntity: (name: string) => request('/entities', { method: 'POST', body: { name } }),
  deleteEntity: (id: string | number) => request(`/entities/${id}`, { method: 'DELETE' }),

  // Plans
  createPlan: (entity_id: number, name: string) =>
    request('/plans', { method: 'POST', body: { entity_id, name, timing_rows: [] } }),
  updatePlan: (id: number, name: string, timing_rows: any[]) =>
    request(`/plans/${id}`, { method: 'PUT', body: { name, timing_rows } }),
  deletePlan: (id: number) => request(`/plans/${id}`, { method: 'DELETE' }),

  // Reporting Types
  getReportingTypes: (entity_id: number) => request(`/reporting-types?entity_id=${entity_id}`),
  createReportingType: (entity_id: number, name: string) =>
    request('/reporting-types', { method: 'POST', body: { entity_id, name, is_v2: false, extra_entities: [], replace_from: 1 } }),
  updateReportingType: (id: number, data: any) =>
    request(`/reporting-types/${id}`, { method: 'PUT', body: data }),
  deleteReportingType: (id: number) => request(`/reporting-types/${id}`, { method: 'DELETE' }),

  // Session Tokens
  createSessionToken: (data: any) => request('/session-token', { method: 'POST', body: data }),

  // Admin
  getUsers: () => request('/admin/users'),
  createUser: (data: any) => request('/admin/users', { method: 'POST', body: data }),
  updateUser: (id: number, data: any) => request(`/admin/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id: number) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  getUserAccess: (userId: number) => request(`/admin/users/${userId}/access`),
  setUserAccess: (userId: number, entity_ids: number[]) =>
    request(`/admin/users/${userId}/access`, { method: 'POST', body: { entity_ids } }),
};
