// frontend/js/api.js
const API_BASE = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function buildHeaders(extra = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extra,
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.headers || {}),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    const errMsg = data.message || `Request failed (${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}

// helper methods
async function apiGet(path) {
  return apiFetch(path, { method: "GET" });
}

async function apiPost(path, body) {
  return apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function apiPut(path, body) {
  return apiFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// expose globally for plain script usage
window.API = {
  API_BASE,
  getToken,
  clearAuth,
  apiFetch,
  get: apiGet,
  post: apiPost,
  put: apiPut,
};