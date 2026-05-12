import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, default: null },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
    verified: { type: Boolean, default: false },
    provider: { type: String, default: "local" },
    phone:   { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
