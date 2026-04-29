(() => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const rememberMeInput = document.getElementById("rememberMe");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const statusText = document.getElementById("status");
  const loginBtn = document.getElementById("loginBtn");

  // Stop if elements missing
  if (!loginForm || !emailInput || !passwordInput || !loginBtn) return;

  const DEMO_USER_1 = "admin@hardware.com";
  const DEMO_USER_2 = "staff1";
  const DEMO_PASSWORD = "admin123";

  const REMEMBER_KEY = "hardwareStoreRememberedEmail";
  const SESSION_KEY = "hardwareStoreAuthUser";

  // Load remembered username
  const remembered = localStorage.getItem(REMEMBER_KEY);
  if (remembered) {
    emailInput.value = remembered;
    if (rememberMeInput) rememberMeInput.checked = true;
  }

  // Toggle password
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      togglePasswordBtn.textContent = isHidden ? "HIDE" : "SHOW";
    });
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in...";

    const username = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!username || !password) {
      showStatus("Please enter username and password.", true);
      resetBtn();
      return;
    }

    // Demo login check
    if (
      (username !== DEMO_USER_1 && username !== DEMO_USER_2) ||
      password !== DEMO_PASSWORD
    ) {
      showStatus("Invalid username or password.", true);
      resetBtn();
      return;
    }

    // Save session
    const user = {
      username,
      loginAt: new Date().toISOString(),
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));

    // Remember me
    if (rememberMeInput && rememberMeInput.checked) {
      localStorage.setItem(REMEMBER_KEY, username);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    showStatus("Login successful. Redirecting...", false);

    // 🔥 FIX: direct redirect to index
    setTimeout(() => {
      window.location.href = "./index.html";
    }, 500);
  });

  function showStatus(msg, isError) {
    if (!statusText) return;
    statusText.textContent = msg;
    statusText.style.color = isError ? "red" : "green";
  }

  function resetBtn() {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
})();