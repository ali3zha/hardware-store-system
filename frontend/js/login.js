(() => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const status = document.getElementById("status");
  const btn = document.getElementById("loginBtn");

  if (!form) return;

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

    // 🔥 MULTIPLE USERS
    if (
      (username === "admin" && password === "password123") ||
      (username === "staff" && password === "hihihi01") ||
      (username === "inventory" && password === "hahaha02") ||
      (username === "staff1" && password === "huhuhu03")
    ) {
      sessionStorage.setItem("hardwareStoreAuthUser", JSON.stringify({ username }));

      setStatus("Login successful. Redirecting...", false);

      setTimeout(() => {
        window.location.href = "./index.html";
      }, 500);

    } else {
      setStatus("Invalid username or password", true);
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