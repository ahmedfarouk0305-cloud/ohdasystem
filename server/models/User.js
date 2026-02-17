import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String },
    phoneNumber: { type: String, default: "" },
    role: { type: String, default: "employee" },
    roleLabel: { type: String },
    otpHash: { type: String, default: "" },
    otpExpiresAt: { type: Date },
  },
  { timestamps: true },
)

export default mongoose.model("User", userSchema)
