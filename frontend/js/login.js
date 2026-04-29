(() => {
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const status = document.getElementById("status");
  const btn = document.getElementById("loginBtn");

  if (!form) return;

  const USERS = [
    { username: "admin", password: "password123" },
    { username: "staff", password: "hihihi01" },
    { username: "inventory", password: "hahaha02" },
    { username: "staff1", password: "huhuhu03" }
  ];

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    btn.disabled = true;
    btn.textContent = "Signing in...";

    if (!username || !password) {
      show("Fill all fields", true);
      reset();
      return;
    }

    const user = USERS.find(u => u.username === username && u.password === password);

    if (!user) {
      show("Invalid login", true);
      reset();
      return;
    }

    show("Success! Redirecting...", false);

    setTimeout(() => {
      window.location.href = "./index.html";
    }, 500);
  });

  function show(msg, err) {
    status.textContent = msg;
    status.style.color = err ? "red" : "lime";
  }

  function reset() {
    btn.disabled = false;
    btn.textContent = "Login";
  }
})();