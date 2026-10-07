const registerBtn = document.getElementById("registerBtn");
registerBtn.addEventListener("click", register);
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
verifyOtpBtn.addEventListener("click", verifyOtp);
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
        // Show OTP section, hide registration form
        document.getElementById("register-container").style.display = "none";
        document.getElementById("otp-section").style.display = "block";
      } else {
        errorMsg.innerHTML = data.message || "Registration failed";
      }
    })
    .catch(err => {
      errorMsg.innerHTML = "Network error: " + err.message;
    });
}

function verifyOtp() {
  const email = document.getElementById("email").value;
  const otp = document.getElementById("otp").value;
  const errMsg = document.getElementById("errMsg");

  fetch("/api/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, otp })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        errMsg.innerHTML = "";
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        alert("Registration successful! Email verified.");
        window.location.href = "/dashboard.html";
      } else {
        errMsg.innerHTML = data.message || "OTP verification failed";
      }
    })
    .catch(err => {
      errMsg.innerHTML = "Network error: " + err.message;
    });
}
