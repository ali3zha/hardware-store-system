(() => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const status = document.getElementById("status");
  const btn = document.getElementById("loginBtn");

  if (!form) return;

  // If already logged in, skip login page
  if (window.Auth) {
    window.Auth.redirectIfLoggedIn();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    setLoading(true);
    setStatus("");

    if (!username || !password) {
      setStatus("Please fill all fields", true);
      setLoading(false);
      return;
    }

    // Demo credentials
    const valid =
      (username === "admin" && password === "password123") ||
      (username === "staff" && password === "hihihi01") ||
      (username === "inventory" && password === "hahaha02") ||
      (username === "staff1" && password === "huhuhu03");

    if (!valid) {
      setStatus("Invalid username or password", true);
      setLoading(false);
      return;
    }

    // Save auth consistently in localStorage (token + user)
    const fakeToken = `demo-token-${Date.now()}`;
    const user = { username };

    window.Auth.setAuth(fakeToken, user);

    setStatus("Login successful. Redirecting...", false);

    setTimeout(() => {
      window.location.href = "./index.html";
    }, 500);
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