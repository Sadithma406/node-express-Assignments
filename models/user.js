import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  description: { type: String },
  password: { type: String, required: true },
  profilePicture: { type: String }
})
const User = mongoose.model("users", userSchema);

export default User;