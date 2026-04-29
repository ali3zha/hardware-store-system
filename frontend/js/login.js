(() => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const rememberMeInput = document.getElementById("rememberMe");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const statusText = document.getElementById("status");
  const loginBtn = document.getElementById("loginBtn");

  // Exit quietly if not on login page.
  if (
    !loginForm ||
    !emailInput ||
    !passwordInput ||
    !rememberMeInput ||
    !togglePasswordBtn ||
    !statusText ||
    !loginBtn
  ) {
    return;
  }

  // Treat the login field as a "username" (NOT an email).
  // You can change these demo usernames/passwords anytime.
  const DEMO_USER_1 = "admin@hardware.com";
  const DEMO_USER_2 = "staff1";
  const DEMO_PASSWORD = "admin123";
  const REMEMBER_KEY = "hardwareStoreRememberedEmail";
  const SESSION_KEY = "hardwareStoreAuthUser";

  const params = new URLSearchParams(window.location.search);
  const redirectTo = sanitizeRedirect(params.get("redirect")) || "./index.html";

  initRememberedEmail();
  emailInput.focus();

  togglePasswordBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePasswordBtn.textContent = isHidden ? "HIDE" : "SHOW";
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus("", false);

    const username = String(emailInput.value || "").trim();
    const password = passwordInput.value;

    if (!username || !password) {
      setStatus("Please enter both username and password.", true);
      setLoading(false);
      return;
    }

    // Demo auth. Replace this block with API auth if backend login is ready.
    const u = username.toLowerCase();
    if ((u !== DEMO_USER_1.toLowerCase() && u !== DEMO_USER_2.toLowerCase()) || password !== DEMO_PASSWORD) {
      setStatus("Invalid email or password.", true);
      setLoading(false);
      return;
    }

    const authUser = {
      username: u,
      loginAt: new Date().toISOString()
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));

    if (rememberMeInput.checked) {
      localStorage.setItem(REMEMBER_KEY, u);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    setStatus("Login successful. Redirecting...", false);

    setTimeout(() => {
      window.location.href = redirectTo;
    }, 700);
  });

  function initRememberedEmail() {
    const rememberedEmail = localStorage.getItem(REMEMBER_KEY);
    if (!rememberedEmail) return;
    emailInput.value = rememberedEmail;
    rememberMeInput.checked = true;
  }

  function setStatus(message, isError) {
    statusText.textContent = message;
    statusText.className = `status ${isError ? "err" : "ok"}`;
  }

  function setLoading(loading) {
    loginBtn.disabled = loading;
    loginBtn.textContent = loading ? "Signing in..." : "Login";
  }

  function sanitizeRedirect(path) {
    if (!path) return "";
    if (path.includes("://") || path.startsWith("//")) return "";

    const normalized = path.replace(/^\.\//, "");
    const allowed = new Set([
      "index.html",
      "customer.html",
      "pos.html",
      "discount.html",
      "receipt.html",
      "transactions.html"
    ]);

    return allowed.has(normalized) ? `./${normalized}` : "";
  }
})();
