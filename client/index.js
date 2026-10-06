  const loginBtn = document.getElementById("btn");

loginBtn.addEventListener("click", login);

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errMsg = document.getElementById("errMsg");
  fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem("token", data.token);
        errMsg.innerHTML = "";
        alert("Successfully LoggedIn!");
        window.location.href = "/dashboard.html";
      }
      else {
        errMsg.innerHTML = data.message;
      }
    })
    .catch(err => {
      alert("Error connecting to server " + err);
    });
}
