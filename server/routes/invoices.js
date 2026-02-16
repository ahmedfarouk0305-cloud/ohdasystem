import express from "express"
import multer from "multer"
import fs from "fs"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import Invoice from "../models/Invoice.js"
import Oda from "../models/Oda.js"

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isVercel = !!(globalThis.process && globalThis.process.env && globalThis.process.env.VERCEL)
const uploadsRoot = isVercel ? path.join(os.tmpdir(), "ohda-uploads") : path.join(__dirname, "../uploads")

try {
  if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true })
  }
} catch (error) {
  console.error("Failed to ensure uploads directory", uploadsRoot, error?.message || error)
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsRoot)
  },
  filename(req, file, cb) {
    const timestamp = Date.now()
    const safeOriginalName = String(file.originalname).replace(/[^a-zA-Z0-9_.-]/g, "_")
    cb(null, `${timestamp}_${safeOriginalName}`)
  },
})

const upload = multer({ storage })

router.get("/", async (req, res) => {
  try {
    const { odaId } = req.query
    const filter = {}
    if (odaId) {
      filter.odaId = Number(odaId)
    }
    const invoices = await Invoice.find(filter).sort({ id: 1 })
    res.json(invoices)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to fetch invoices" })
  }
})

router.get("/:id/download", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ message: "Invalid invoice id" })
      return
    }

    const invoice = await Invoice.findOne({ id })
    if (!invoice || !invoice.fileName) {
      res.status(404).json({ message: "Invoice file not found" })
      return
    }

    const filePath = path.join(uploadsRoot, invoice.fileName)

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: "Invoice file not found" })
      return
    }

    const downloadName = invoice.originalFileName || invoice.fileName
    res.download(filePath, downloadName, (error) => {
      if (error) {
        console.error(error)
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to download invoice file" })
        }
      }
    })
  } catch (error) {
    console.error(error)
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to download invoice file" })
    }
  }
})

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { odaId, date, name, description, projectName, amount } = req.body

    const parsedOdaId = Number(odaId)
    const parsedAmount = Number(amount)

    if (!parsedOdaId || !name || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ message: "Invalid invoice data" })
      return
    }

    const oda = await Oda.findOne({ id: parsedOdaId })
    if (!oda) {
      res.status(404).json({ message: "Oda not found" })
      return
    }

    if (oda.status !== "مفتوحة") {
      res.status(400).json({ message: "لا يمكن إضافة فواتير لعهدة غير مفتوحة" })
      return
    }

    const lastInvoice = await Invoice.findOne({ odaId: parsedOdaId }).sort({ id: -1 })
    const nextId = lastInvoice ? lastInvoice.id + 1 : 1
    const invoiceDate = date || new Date().toISOString().slice(0, 10)

    const invoice = await Invoice.create({
      id: nextId,
      odaId: parsedOdaId,
      date: invoiceDate,
      name,
      description,
      projectName,
      amount: parsedAmount,
      fileName: req.file ? req.file.filename : undefined,
      originalFileName: req.file ? req.file.originalname : undefined,
    })

    oda.currentBalance -= parsedAmount
    await oda.save()

    res.status(201).json({ invoice, oda })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to create invoice" })
  }
})

export default router
