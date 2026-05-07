/**
 * Medical X-ray Analysis API Client
 * Handles authentication and secured backend requests.
 */

const API_BASE = '/api';
const ACCESS_TOKEN_KEY = 'medvision_access_token';
const REFRESH_TOKEN_KEY = 'medvision_refresh_token';

class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'APIError';
  }
}

function flattenErrorPayload(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data.map((item) => flattenErrorPayload(item)).filter(Boolean).join(' | ');
  }
  if (typeof data === 'object') {
    return Object.entries(data)
      .map(([key, value]) => {
        const normalized = flattenErrorPayload(value);
        if (!normalized) return '';
        return `${key}: ${normalized}`;
      })
      .filter(Boolean)
      .join(' | ');
  }
  return '';
}

function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUserTokens() {
  return {
    access: localStorage.getItem(ACCESS_TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function setAuthTokens(access, refresh) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new APIError('Session expired. Please sign in again.', 401, { detail: 'No refresh token' });
  }

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok || !data?.access) {
    const validationMessage = flattenErrorPayload(data);
    const message = data?.detail || validationMessage || 'Session expired. Please sign in again.';
    throw new APIError(message, response.status || 401, data);
  }

  setAuthTokens(data.access, refresh);
  return data.access;
}

async function apiFetch(path, options = {}) {
  const skipAuth = options.skipAuth === true || path.startsWith('/auth/token/') || path.startsWith('/auth/register/doctor/');
  const { skipAuth: _skipAuth, ...fetchOptions } = options;

  const doRequest = async (overrideToken = null) => {
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    const token = overrideToken || getToken();
    if (token && !skipAuth) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
    });

    if (response.status === 204) return { response, data: null };

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    return { response, data };
  };

  let { response, data } = await doRequest();

  if (response.status === 401 && !skipAuth) {
    try {
      const newAccess = await refreshAccessToken();
      ({ response, data } = await doRequest(newAccess));
    } catch (_refreshErr) {
      clearAuthTokens();
      throw new APIError('Session expired. Please sign in again.', 401, { detail: 'Refresh token invalid' });
    }
  }

  if (!response.ok) {
    const validationMessage = flattenErrorPayload(data);
    const message = data?.error || data?.detail || validationMessage || `Erreur serveur (${response.status})`;
    if (response.status === 401 && !skipAuth) {
      clearAuthTokens();
    }
    throw new APIError(message, response.status, data);
  }

  return data;
}

export async function loginDoctor(username, password) {
  const data = await apiFetch('/auth/token/', {
    method: 'POST',
    skipAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: (username || '').trim(), password: password || '' }),
  });
  setAuthTokens(data.access, data.refresh);
  return data;
}

export async function registerDoctor(payload) {
  const normalizedPayload = {
    username: (payload?.username || '').trim(),
    email: (payload?.email || '').trim(),
    password: payload?.password || '',
    first_name: (payload?.first_name || '').trim(),
    last_name: (payload?.last_name || '').trim(),
    specialty: (payload?.specialty || '').trim(),
    license_number: (payload?.license_number || '').trim(),
    hospital: (payload?.hospital || '').trim(),
    phone: (payload?.phone || '').trim(),
  };

  const data = await apiFetch('/auth/register/doctor/', {
    method: 'POST',
    skipAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizedPayload),
  });
  setAuthTokens(data.access, data.refresh);
  return data;
}

export async function getCurrentUser() {
  return apiFetch('/auth/me/', { method: 'GET' });
}

export async function createPatient(payload) {
  return apiFetch('/auth/patients/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getPatients() {
  return apiFetch('/auth/patients/', { method: 'GET' });
}

export async function analyzeXray(imageFile, patientId = null, patientContext = '') {
  if (!imageFile) {
    throw new APIError('Aucune image fournie', 400, { error: 'Aucune image fournie' });
  }

  const formData = new FormData();
  formData.append('image', imageFile);
  if (patientId) formData.append('patient_id', String(patientId));
  if (patientContext) formData.append('patient_context', patientContext);

  return apiFetch('/analyze/', {
    method: 'POST',
    body: formData,
  });
}

export async function getHistory() {
  return apiFetch('/history/', { method: 'GET' });
}

export async function deleteAnalysis(id) {
  if (!id) {
    throw new APIError('ID d\'analyse manquant', 400, { error: 'ID manquant' });
  }

  return apiFetch(`/history/${id}/`, { method: 'DELETE' });
}

export function getAPIBaseURL() {
  return API_BASE;
}


// ════════════════════════════════════════════════
// ADMIN endpoints
// ════════════════════════════════════════════════

export async function adminGetDoctors() {
  return apiFetch('/admin/doctors/', { method: 'GET' });
}

export async function adminGetPatients(doctorId) {
  return apiFetch(`/admin/doctors/${doctorId}/patients/`, { method: 'GET' });
}

export async function adminDeleteUser(userId) {
  return apiFetch(`/admin/users/${userId}/delete/`, { method: 'DELETE' });
}

export async function adminCreateDoctor(payload) {
  return apiFetch('/admin/doctors/create/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateDoctor(doctorId, payload) {
  return apiFetch(`/admin/doctors/${doctorId}/update/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function adminAssignPatient(patientId, doctorId) {
  return apiFetch(`/admin/patients/${patientId}/assign/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctor_id: doctorId }),
  });
}

export async function adminCreatePatient(payload) {
  return apiFetch('/admin/patients/create/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function adminUpdatePatient(patientId, payload) {
  return apiFetch(`/admin/patients/${patientId}/update/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}




// ════════════════════════════════════════════════
// PATIENT endpoints
// ════════════════════════════════════════════════

export async function patientAnalyze(imageFile) {
  if (!imageFile) {
    throw new APIError('No image provided', 400, { error: 'No image' });
  }
  const formData = new FormData();
  formData.append('image', imageFile);
  return apiFetch('/patient/analyze/', {
    method: 'POST',
    body: formData,
  });
}

// ════════════════════════════════════════════════
// AUTH — login générique (doctor + patient + admin)
// ════════════════════════════════════════════════

export async function loginUser(username, password) {
  const data = await apiFetch('/auth/token/', {
    method: 'POST',
    skipAuth: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: (username || '').trim(), password: password || '' }),
  });
  setAuthTokens(data.access, data.refresh);
  return data;
}


export { APIError };