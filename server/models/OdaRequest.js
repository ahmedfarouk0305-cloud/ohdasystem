import mongoose from "mongoose"

const odaRequestSchema = new mongoose.Schema(
  {
    odaId: { type: Number, required: true },
    employee: { type: String, required: true },
    requestDate: { type: String, required: true },
    newAmount: { type: Number, required: true },
    previousClosingBalance: { type: Number, required: true },
    transferAmount: { type: Number, required: true },
    status: { type: String, default: "معلقة" },
  },
  { timestamps: true },
)

export default mongoose.model("OdaRequest", odaRequestSchema)

