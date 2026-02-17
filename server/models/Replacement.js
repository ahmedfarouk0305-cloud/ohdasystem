import mongoose from "mongoose"

const replacementSchema = new mongoose.Schema(
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
    fileUrl: { type: String },
  },
  { timestamps: true },
)

export default mongoose.model("Replacement", replacementSchema)
