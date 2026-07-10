import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./models/user.js";

dotenv.config();
// create express server app
const app = express()

// serve static files on client folder
app.use(express.static("client"))

// setup json middleware
app.use(express.json())

// define api
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email })
    if (user) {
      if (user.password === password) {
        res.send({ success: true })
      }
      else {
        res.send({ success: false, message: "Incorrect password" })
      }
    }
    else {
      res.send({ success: false, message: "User not found! Register to login" })
    }
  } catch (err) {
    console.log(err)
    res.send({ success: false })
  }
})
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = new User({ name, email, password })
    await user.save();
    res.send({ success: true })
  }
  catch (err) {
    res.send({ success: false, error: getErrorMessage(err) });
  }
})

const otpStore = new Map();

app.post("/api/forgot-password", async (req, res) => {
  const email = req.body.email;
  try {
    const user = await User.findOne({ email });
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000);
      console.log("OTP for", email, ":", otp);
      otpStore.set(email, { otp: String(otp), verified: false });
      res.send({ success: true });
    } else {
      res.send({ success: false, message: "User not found" });
    }
  } catch (err) {
    res.send({ success: false, message: "Server error. Please try again." });
  }
})

app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const entry = otpStore.get(email);
    if (!entry) {
      return res.send({ success: false, message: "OTP expired. Please start again." });
    }
    if (entry.otp !== String(otp)) {
      return res.send({ success: false, message: "Incorrect OTP. Please try again." });
    }
    otpStore.set(email, { ...entry, verified: true });
    res.send({ success: true });
  }
  catch (err) {
    res.send({ success: false, message: "Server error. Please try again." });
  }
})

app.post("/api/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  const entry = otpStore.get(email);
  if (!entry || !entry.verified) {
    return res.send({ success: false, message: "OTP not verified. Please start again." });
  }

  try {
    const user = await User.findOneAndUpdate({ email }, { password: newPassword })
    if (user) {
      otpStore.delete(email);
      res.send({ success: true, message: "Password reset successful" })
    }
    else {
      res.send({ success: false, message: "User not found" })
    }
  } catch (err) {
    res.send({ success: false, message: "Server error. Please try again." });
  }
})

function getErrorMessage(err) {
  // Duplicate key error
  if (err.code === 11000) {
    return "Email entered is already registered. Please use a different one.";
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return "Email or password cannot be empty";
  }

  // Database connection / network error
  if (err.name === "MongoNetworkError") {
    return "Cannot connect to the database. Please try again later."
  }

  // Fallback for any other unexpected error
  return "Something went wrong. Please try again."
}

try {
  await mongoose.connect(process.env.MongoDB_String);
  console.log("Database connection successful");
  // start server 
  app.listen(3000, () => {
    console.log("Server started! http://localhost:3000")
  })
}
catch (err) {
  console.log("Database connection failed:", err.message);
}

