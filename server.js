import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
mongoose.connect(process.env.MongoDB_String)
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
    const user = await User.findOne({ email: email, password: password })
    if (user) {
      res.send({ success: true })
    }
    else {
      res.send({ success: false })
    }
  } catch (err) {
    console.log(err)
    res.send({ success: false })
  }
})

// start server 
app.listen(3000, () => {
  // started callback
  console.log("Server started! http://localhost:3000")
})
