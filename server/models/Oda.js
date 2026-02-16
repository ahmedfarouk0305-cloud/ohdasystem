import mongoose from "mongoose"

const odaSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    employee: { type: String, required: true },
    startDate: { type: String, required: true },
    amount: { type: Number, required: true },
    currentBalance: { type: Number, required: true },
    closingBalance: { type: Number, default: 0 },
    status: { type: String, default: "مفتوحة" },
    closingDate: { type: String, default: "" },
  },
  { timestamps: true },
)

export default mongoose.model("Oda", odaSchema)

