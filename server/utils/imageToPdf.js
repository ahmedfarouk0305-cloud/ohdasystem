import { Buffer } from "node:buffer"
import PDFDocument from "pdfkit"

export async function convertImageBufferToPdf(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ autoFirstPage: false })
      const chunks = []
      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => resolve(Buffer.concat(chunks)))
      doc.addPage({ size: "A4", margin: 36 })
      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const margin = doc.page.margins.left
      doc.image(buffer, margin, margin, { fit: [pageWidth - margin * 2, pageHeight - margin * 2], align: "center", valign: "center" })
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
