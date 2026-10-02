import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import User from "./models/user.js";

dotenv.config();

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);
const uploadDir = path.join(dirName, "client", "uploads");
const upload = multer({ dest: uploadDir });
// create express server app
const app = express();

// serve static files on client folder
app.use(express.static("client"));

// setup json middleware
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

function validatePassword(password) {
  if (password.length < 8) {
    const msg = "Password must be at least 8 characters long";
    return msg
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    const msg = "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
    return msg
  }
  else { return null }
}


// define api
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.send({ success: false, message: "Email and password are required" })
    }
    const user = await User.findOne({ email })
    if (user) {
      if (user.password === password) {
        const name = user.name;
        const email = user.email;
        res.send({ success: true, name, email })
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

app.post("/api/register", upload.single("profilePicture"), async (req, res) => {
  const { name, email, password } = req.body;
  const profilePicture = req.file;

  try {
    if (!name || !email || !password) {
      return res.send({ success: false, message: "Name, email and password are required" })
    }
    const msg = validatePassword(password);
    if (msg) {
      return res.send({ success: false, message: msg })
    }
    if (!email.includes("@") || !email.includes(".")) {
      return res.send({ success: false, message: "Invalid email format" })
    }
    let index = null;
    if (profilePicture) {
      const count = await User.countDocuments();
      index = count + 1;
      const extension = path.extname(profilePicture.originalname);
      const newFilename = `${index}${extension}`;
      fs.renameSync(profilePicture.path, path.join(uploadDir, newFilename));
    }

    const user = new User({ name, email, password, profilePicture: index });

    await user.save();
    res.send({ success: true, message: "Registration successful", name, email });
  } catch (err) {
    res.send({ success: false, message: getErrorMessage(err) });
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
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP is ${otp}. Please verify it to reset your password`,
      });
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
  const msg = validatePassword(newPassword);
  if (msg) {
    return res.send({ success: false, message: msg })
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
app.post("/api/edit-profile", upload.single("profilePicture"), async (req, res) => {
  const { currentEmail, email, name, password } = req.body;
  const profilePicture = req.file;

  try {
    const user = await User.findOne({ email: currentEmail });
    if (!user) {
      return res.send({ success: false, message: "User not found" });
    }
    if (!email) {
      return res.send({ success: false, message: "Email cannot be empty!" });
    }
    user.name = name;

    if (email !== currentEmail) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.send({ success: false, message: "The new email is already registered by another account" });
      }
      if (!email.includes("@") || !email.includes(".")) {
        return res.send({ success: false, message: "Invalid email format" })
      }
      user.email = email;
    }

    if (password) {
      const msg = validatePassword(password);
      if (msg) {
        return res.send({ success: false, message: msg })
      }
      user.password = password;
    }

    if (profilePicture) {
      let index = user.profilePicture;
      if (!index) {
        const count = await User.countDocuments();
        index = count + 1;
        user.profilePicture = index;
      }

      const extension = path.extname(profilePicture.originalname);
      const newFilename = `${index}${extension}`;
      fs.renameSync(profilePicture.path, path.join(uploadDir, newFilename));
    }

    await user.save();
    res.send({ success: true, message: "Profile updated successfully", newEmail: user.email });
  } catch (err) {
    res.send({ success: false, message: getErrorMessage(err) });
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

