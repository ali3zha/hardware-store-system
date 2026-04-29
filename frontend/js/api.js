const API_BASE = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function buildHeaders(extra = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.headers || {}),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

window.API = {
  get: (path) => apiFetch(path, { method: "GET" }),
  post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
  clearAuth,
};