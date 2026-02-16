import mongoose from "mongoose"

const invoiceSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    odaId: { type: Number, required: true },
    date: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    projectName: { type: String },
    amount: { type: Number, required: true },
    fileName: { type: String },
    originalFileName: { type: String },
  },
  { timestamps: true },
)

export default mongoose.model("Invoice", invoiceSchema)
