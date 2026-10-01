const registerBtn = document.getElementById("registerBtn");
registerBtn.addEventListener("click", register);
function register() {
    const form = document.getElementById("register-form");
    const formData = new FormData(form);
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const errorMsg = document.getElementById("errMsg");

    if (password !== confirmPassword) {
      errorMsg.innerHTML = "Passwords do not match";
      return;
    }

    fetch("/api/register", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          errorMsg.innerHTML = "";
          alert("Registration successful");
          window.location.href = "/";
        } else {
          errorMsg.innerHTML =  data.message || "Registration failed";
        }
      })
      .catch(err => {
        errorMsg.innerHTML = "Network error: " + err.message;
      });
  }