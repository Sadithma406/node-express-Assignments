const registerBtn = document.getElementById("registerBtn");
registerBtn.addEventListener("click", register);
function register() {
    const form = document.getElementById("register-form");
    const formData = new FormData(form);
    const errorMsg = document.getElementById("errMsg");

    if (formData.get("password") !== formData.get("confirmPassword")) {
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
          localStorage.setItem("userEmail", data.email);
          localStorage.setItem("userName", data.name);
          window.location.href = "/dashboard.html";
        } else {
          errorMsg.innerHTML =  data.message || "Registration failed";
        }
      })
      .catch(err => {
        errorMsg.innerHTML = "Network error: " + err.message;
      });
  }