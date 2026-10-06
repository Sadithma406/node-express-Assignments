# User Profile Management with JWT Authentication Guide

This guide details the complete step-by-step implementation for managing user profiles in Node.js, Express, and MongoDB using **JSON Web Tokens (JWT)**.

---

## 💡 How JWT Data Flow Works

Instead of passing user identifiers manually or relying on insecure client data, the server issues a signed **JWT Token** upon successful login or registration. The client uses this token in HTTP request headers to securely access and update profile data stored in MongoDB.

```
┌─────────────────┐                                  ┌─────────────────┐
│                 │  1. POST /api/login or register  │                 │
│                 ├─────────────────────────────────►│                 │
│                 │                                  │                 │
│                 │  2. Returns JWT Token            │                 │
│                 │◄─────────────────────────────────┤                 │
│                 │     (Stored in localStorage)     │                 │
│                 │                                  │                 │
│  Client Browser │  3. GET /api/user-profile        │ Express Server  │
│ (editProfile)   │     Header: Authorization Bearer │   + MongoDB     │
│                 ├─────────────────────────────────►│                 │
│                 │                                  │                 │
│                 │  4. Server verifies Token &      │                 │
│                 │     queries MongoDB for User     │                 │
│                 │                                  │                 │
│                 │  5. Returns User Profile JSON    │                 │
│                 │◄─────────────────────────────────┤                 │
└─────────────────┘                                  └─────────────────┘
```

---

## 🛠️ Step-by-Step Implementation

### Step 1: Install `jsonwebtoken`

Run the following command in your project terminal:

```bash
npm install jsonwebtoken
```

---

### Step 2: Update `server.js`

Add JWT support, authentication middleware, and update the login, register, profile fetch, and edit profile endpoints in `server.js`.

```javascript
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import User from "./models/user.js";

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_12345";

app.use(express.static("client"));
app.use(express.json());

// ----------------------------------------------------
// JWT Authentication Middleware
// ----------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).send({ success: false, message: "Access denied. Please log in." });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).send({ success: false, message: "Invalid or expired session. Please log in again." });
    }
    req.user = decodedUser; // Contains payload e.g. { email: "user@example.com" }
    next();
  });
}

// ----------------------------------------------------
// 1. LOGIN API (Generates JWT)
// ----------------------------------------------------
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.send({ success: false, message: "Email and password are required" });
    }
    const user = await User.findOne({ email });
    if (user && user.password === password) {
      // Issue JWT token containing user's email
      const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "24h" });
      res.send({ success: true, token, name: user.name, email: user.email });
    } else {
      res.send({ success: false, message: "Invalid email or password" });
    }
  } catch (err) {
    res.send({ success: false, message: "Server error during login" });
  }
});

// ----------------------------------------------------
// 2. REGISTER API (Generates JWT)
// ----------------------------------------------------
app.post("/api/register", upload.single("profilePicture"), async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.send({ success: false, message: "Name, email and password are required" });
    }

    const user = new User({ name, email, password });
    await user.save();

    // Issue JWT token upon registration
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "24h" });
    res.send({ success: true, message: "Registration successful", token, name, email });
  } catch (err) {
    res.send({ success: false, message: "Registration failed" });
  }
});

// ----------------------------------------------------
// 3. GET USER PROFILE (Protected via JWT)
// ----------------------------------------------------
app.get("/api/user-profile", authenticateToken, async (req, res) => {
  try {
    // req.user.email is safely obtained from the verified JWT
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.send({ success: false, message: "User not found" });
    }
    res.send({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    res.send({ success: false, message: "Error loading profile data" });
  }
});

// ----------------------------------------------------
// 4. EDIT PROFILE API (Protected via JWT)
// ----------------------------------------------------
app.post("/api/edit-profile", authenticateToken, upload.single("profilePicture"), async (req, res) => {
  const { email, name, password } = req.body;
  const currentEmail = req.user.email; // From verified JWT

  try {
    const user = await User.findOne({ email: currentEmail });
    if (!user) {
      return res.send({ success: false, message: "User not found" });
    }

    if (name) user.name = name;

    if (email && email !== currentEmail) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.send({ success: false, message: "Email is already in use by another account" });
      }
      user.email = email;
    }

    if (password) {
      user.password = password;
    }

    await user.save();

    // Re-issue a new JWT token if email address was updated
    const newToken = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "24h" });

    res.send({ success: true, message: "Profile updated successfully", token: newToken });
  } catch (err) {
    res.send({ success: false, message: "Error updating profile" });
  }
});
```

---

### Step 3: Update Client Login & Register Scripts

Store the `authToken` returned from the server upon successful login or registration.

#### `client/index.js`
```javascript
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errMsg = document.getElementById("errMsg");

  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Save the JWT Token in localStorage
        localStorage.setItem("authToken", data.token);
        alert("Successfully Logged In!");
        window.location.href = "/dashboard.html";
      } else {
        errMsg.innerHTML = data.message;
      }
    })
    .catch(err => {
      alert("Error connecting to server: " + err);
    });
}
```

#### `client/register.js`
```javascript
function register() {
  const form = document.getElementById("register-form");
  const formData = new FormData(form);
  const errorMsg = document.getElementById("errMsg");

  fetch("/api/register", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Save the JWT Token in localStorage
        localStorage.setItem("authToken", data.token);
        alert("Registration successful!");
        window.location.href = "/dashboard.html";
      } else {
        errorMsg.innerHTML = data.message || "Registration failed";
      }
    })
    .catch(err => {
      errorMsg.innerHTML = "Network error: " + err.message;
    });
}
```

---

### Step 4: Update `client/editProfile.html`

In `editProfile.html`, fetch the user details using the JWT token and populate the `name` and `email` input fields.

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="editProfile-body">
    <h2>Edit Profile</h2>
    <form id="editProfileForm">
      <label>Name:
        <input type="text" id="name" name="name">
      </label>
      <label>Email:
        <input type="email" id="email" name="email" required>
      </label>
      <label>Password:
        <input type="password" id="password" name="password">
      </label>
      <label>Confirm Password:
        <input type="password" id="confirmPassword" name="confirmPassword">
      </label>
      <label>Profile Picture:
        <input type="file" id="profilePicture" name="profilePicture" accept="image/*">
      </label>
      <button type="submit">Save Changes</button>
      <p id="errMsg"></p>
    </form>
  </div>

  <script>
    const form = document.getElementById('editProfileForm');
    const errMsg = document.getElementById("errMsg");
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");

    // Retrieve JWT Token from localStorage
    const token = localStorage.getItem("authToken");

    // Redirect to login if token is missing
    if (!token) {
      alert("Session expired or not logged in. Please log in again.");
      window.location.href = "/";
    } else {
      // 1. Fetch live user details from MongoDB using JWT Token in Authorization header
      fetch('/api/user-profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Populate form inputs with fresh data from database
            nameInput.value = data.user.name || "";
            emailInput.value = data.user.email || "";
          } else {
            alert(data.message);
            localStorage.removeItem("authToken");
            window.location.href = "/";
          }
        })
        .catch(err => {
          console.error("Error fetching user profile:", err);
          errMsg.innerHTML = "Error loading user profile from server.";
        });
    }

    // 2. Handle Form Submission to Update Profile
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (password && password !== confirmPassword) {
        errMsg.innerHTML = "Passwords do not match!";
        return;
      }

      const formData = new FormData(form);

      fetch('/api/edit-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // Update stored token if new token was issued (e.g. when email changes)
            if (data.token) {
              localStorage.setItem("authToken", data.token);
            }
            errMsg.innerHTML = "";
            alert('Profile updated successfully!');
            window.location.href = '/dashboard.html';
          } else {
            errMsg.innerHTML = data.message;
          }
        })
        .catch(err => {
          console.error('Error updating profile:', err);
          errMsg.innerHTML = "Server error while updating profile.";
        });
    });
  </script>
</body>
</html>
```

---

## 🎯 Verification & Testing Checklist

1. **Install JWT Package:** `npm install jsonwebtoken`
2. **Login/Register Test:** Perform login or registration and check DevTools -> Application -> Local Storage for `authToken`.
3. **Edit Profile Load Test:** Open `editProfile.html` and verify that the `name` and `email` input fields are populated directly from MongoDB.
4. **Update Profile Test:** Edit the user's name/password/profile picture and submit. Confirm MongoDB is updated and user is redirected back to `/dashboard.html`.
