(function () {
  function getToken() {
    return localStorage.getItem("token");
  }

  function setAuth(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user || {}));
  }

  function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  function requireAuth() {
    if (!getToken()) {
      window.location.href = "./login.html";
    }
  }

  function redirectIfLoggedIn() {
    if (getToken()) {
      window.location.href = "./index.html";
    }
  }

  function attachLogout(id = "logoutLink") {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", function (e) {
      e.preventDefault();
      clearAuth();
      window.location.href = "./login.html";
    });
  }

  window.Auth = {
    getToken,
    setAuth,
    clearAuth,
    requireAuth,
    redirectIfLoggedIn,
    attachLogout,
  };
})();