(() => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const status = document.getElementById("status");
  const btn = document.getElementById("loginBtn");

  if (!form) return;
  if (window.Auth) window.Auth.redirectIfLoggedIn();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    setLoading(true);
    setStatus("");

    if (!username || !password) {
      setStatus("Please fill all fields", true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || "Invalid username or password");

      const token = data?.data?.token;
      const user = data?.data?.user || { username };
      if (!token) throw new Error("No token returned by server");

      window.Auth.setAuth(token, user);

      setStatus("Login successful. Redirecting...", false);
      setTimeout(() => (window.location.href = "./index.html"), 400);
    } catch (err) {
      setStatus(err.message || "Login failed", true);
      setLoading(false);
    }
  });

  function setStatus(msg, err) {
    status.textContent = msg;
    status.className = err ? "status err" : "status ok";
  }

  function setLoading(loading) {
    btn.disabled = loading;
    btn.textContent = loading ? "Signing in..." : "Login";
  }
})();