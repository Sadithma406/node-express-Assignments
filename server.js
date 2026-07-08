import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
await mongoose.connect(process.env.MongoDB_String)
  .then(() => console.log("Database connection successful"))
  .catch(err => { console.log(err) });
const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
})
const User = new mongoose.model("users", userSchema);
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
    const user = await User.findOne({ email: email })
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
    const user = new User({ name: name, email: email, password: password })
    await user.save();
    res.send({ success: true })
  }
  catch (err) {
    res.send({ success: false, error: getErrorMessage(err) });
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
// start server 
app.listen(3000, () => {
  console.log("Server started! http://localhost:3000")
})
