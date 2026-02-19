import express from "express"
import jwt from "jsonwebtoken"
import multer from "multer"
import fs from "fs"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import Invoice from "../models/Invoice.js"
import Replacement from "../models/Replacement.js"
import Oda from "../models/Oda.js"
import User from "../models/User.js"
import { isR2Configured, uploadBufferToR2, buildSafeObjectKey } from "../storage/r2.js"
 

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

const storage = isR2Configured
  ? multer.memoryStorage()
  : multer.diskStorage({
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
    const invoices = await Invoice.find(filter).sort({ id: 1 }).lean()
    const replacements = await Replacement.find(filter).sort({ id: 1 }).lean()
    const withKinds = [
      ...invoices.map((d) => ({ ...d, kind: "invoice" })),
      ...replacements.map((d) => ({ ...d, kind: "replacement" })),
    ].sort((a, b) => {
      if (a.id < b.id) return -1
      if (a.id > b.id) return 1
      return 0
    })
    res.json(withKinds)
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

    let invoice = await Invoice.findOne({ id })
    if (!invoice) {
      invoice = await Replacement.findOne({ id })
    }
    if (!invoice || (!invoice.fileName && !invoice.fileUrl)) {
      res.status(404).json({ message: "Invoice file not found" })
      return
    }

    if (invoice.fileUrl) {
      res.redirect(invoice.fileUrl)
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

router.get("/view/:id", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ message: "Invalid invoice id" })
      return
    }

    let invoice = await Invoice.findOne({ id })
    if (!invoice) {
      invoice = await Replacement.findOne({ id })
    }
    if (!invoice || (!invoice.fileName && !invoice.fileUrl)) {
      res.status(404).json({ message: "Invoice file not found" })
      return
    }

    if (invoice.fileUrl) {
      res.redirect(invoice.fileUrl)
      return
    }

    const filePath = path.join(uploadsRoot, invoice.fileName)

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: "Invoice file not found" })
      return
    }

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "inline")
    res.sendFile(filePath, (error) => {
      if (error) {
        console.error(error)
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to view invoice file" })
        }
      }
    })
  } catch (error) {
    console.error(error)
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to view invoice file" })
    }
  }
})

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const secret = globalThis.process && globalThis.process.env ? globalThis.process.env.JWT_SECRET : undefined
    if (!token || !secret) {
      res.status(401).json({ message: "غير مصرح" })
      return
    }
    let payload
    try {
      payload = jwt.verify(token, secret)
    } catch (error) {
      console.error("JWT verification failed", error?.message || error)
      res.status(401).json({ message: "رمز الدخول غير صالح" })
      return
    }
    const userId = String(payload?.sub || "")
    const email = String(payload?.email || "")
    const user = userId ? await User.findById(userId) : await User.findOne({ email })
    const role = String(user?.role || "")
    if (role === "doctor" || role === "accountant") {
      res.status(403).json({ message: "لا يحق للدكتور أو المحاسب إضافة فواتير" })
      return
    }

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

    let createdInvoice

    if (req.file && isR2Configured) {
      const nameHasExt = /\.[a-zA-Z0-9]+$/.test(String(req.file.originalname || ""))
      const inferredExt =
        req.file.mimetype === "image/png"
          ? ".png"
          : req.file.mimetype === "image/jpeg"
          ? ".jpg"
          : req.file.mimetype === "image/webp"
          ? ".webp"
          : req.file.mimetype === "application/pdf"
          ? ".pdf"
          : ""
      const nameWithExt = nameHasExt ? req.file.originalname : `${req.file.originalname || "file"}${inferredExt}`
      const key = buildSafeObjectKey(nameWithExt, { odaId: parsedOdaId, invoiceId: nextId })
      const url = await uploadBufferToR2(req.file.buffer, key, req.file.mimetype || "application/octet-stream")
      createdInvoice = await Invoice.create({
        id: nextId,
        odaId: parsedOdaId,
        date: invoiceDate,
        name,
        description,
        projectName,
        amount: parsedAmount,
        fileName: key,
        originalFileName: nameWithExt,
        fileUrl: url,
      })
    } else {
      createdInvoice = await Invoice.create({
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
    }

    oda.currentBalance -= parsedAmount
    await oda.save()

    res.status(201).json({ invoice: createdInvoice, oda })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to create invoice" })
  }
})

router.post("/replacement", upload.single("file"), async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const secret = globalThis.process && globalThis.process.env ? globalThis.process.env.JWT_SECRET : undefined
    if (!token || !secret) {
      res.status(401).json({ message: "غير مصرح" })
      return
    }
    let payload
    try {
      payload = jwt.verify(token, secret)
    } catch {
      res.status(401).json({ message: "رمز الدخول غير صالح" })
      return
    }
    const userId = String(payload?.sub || "")
    const email = String(payload?.email || "")
    const user = userId ? await User.findById(userId) : await User.findOne({ email })
    const role = String(user?.role || "")
    if (role === "doctor" || role === "accountant") {
      res.status(403).json({ message: "لا يحق للدكتور أو المحاسب إضافة استعاضة" })
      return
    }
    const { odaId, date, name, description, projectName, amount } = req.body
    const parsedOdaId = Number(odaId)
    const parsedAmount = Number(amount)
    if (!parsedOdaId || !name || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ message: "Invalid replacement data" })
      return
    }
    const oda = await Oda.findOne({ id: parsedOdaId })
    if (!oda) {
      res.status(404).json({ message: "Oda not found" })
      return
    }
    if (oda.status !== "مفتوحة") {
      res.status(400).json({ message: "لا يمكن إضافة استعاضة لعهدة غير مفتوحة" })
      return
    }
    const lastInvoice = await Invoice.findOne({ odaId: parsedOdaId }).sort({ id: -1 })
    const lastReplacement = await Replacement.findOne({ odaId: parsedOdaId }).sort({ id: -1 })
    const lastId = Math.max(lastInvoice ? lastInvoice.id : 0, lastReplacement ? lastReplacement.id : 0)
    const nextId = lastId + 1
    const replacementDate = date || new Date().toISOString().slice(0, 10)
    let createdReplacement
    if (req.file && isR2Configured) {
      const nameHasExt = /\.[a-zA-Z0-9]+$/.test(String(req.file.originalname || ""))
      const inferredExt =
        req.file.mimetype === "image/png"
          ? ".png"
          : req.file.mimetype === "image/jpeg"
          ? ".jpg"
          : req.file.mimetype === "image/webp"
          ? ".webp"
          : req.file.mimetype === "application/pdf"
          ? ".pdf"
          : ""
      const nameWithExt = nameHasExt ? req.file.originalname : `${req.file.originalname || "file"}${inferredExt}`
      const key = buildSafeObjectKey(nameWithExt, { odaId: parsedOdaId, invoiceId: nextId })
      const url = await uploadBufferToR2(req.file.buffer, key, req.file.mimetype || "application/octet-stream")
      createdReplacement = await Replacement.create({
        id: nextId,
        odaId: parsedOdaId,
        date: replacementDate,
        name,
        description,
        projectName,
        amount: parsedAmount,
        fileName: key,
        originalFileName: nameWithExt,
        fileUrl: url,
      })
    } else {
      createdReplacement = await Replacement.create({
        id: nextId,
        odaId: parsedOdaId,
        date: replacementDate,
        name,
        description,
        projectName,
        amount: parsedAmount,
        fileName: req.file ? req.file.filename : undefined,
        originalFileName: req.file ? req.file.originalname : undefined,
      })
    }
    oda.currentBalance += parsedAmount
    await oda.save()
    res.status(201).json({ replacement: createdReplacement, oda })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to create replacement" })
  }
})

router.put("/:id", upload.single("file"), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ message: "Invalid invoice id" })
      return
    }
    const authHeader = req.headers.authorization || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const secret = globalThis.process && globalThis.process.env ? globalThis.process.env.JWT_SECRET : undefined
    if (!token || !secret) {
      res.status(401).json({ message: "غير مصرح" })
      return
    }
    let payload
    try {
      payload = jwt.verify(token, secret)
    } catch {
      res.status(401).json({ message: "رمز الدخول غير صالح" })
      return
    }
    const userId = String(payload?.sub || "")
    const email = String(payload?.email || "")
    const user = userId ? await User.findById(userId) : await User.findOne({ email })
    const role = String(user?.role || "")
    if (role === "doctor" || role === "accountant") {
      res.status(403).json({ message: "لا يحق للدكتور أو المحاسب تعديل الفواتير" })
      return
    }
    let doc = await Invoice.findOne({ id })
    let isReplacement = false
    if (!doc) {
      doc = await Replacement.findOne({ id })
      isReplacement = !!doc
    }
    if (!doc) {
      res.status(404).json({ message: "Invoice not found" })
      return
    }
    const oda = await Oda.findOne({ id: doc.odaId })
    if (!oda) {
      res.status(404).json({ message: "Oda not found" })
      return
    }
    if (oda.status !== "مفتوحة") {
      res.status(400).json({ message: "لا يمكن تعديل فواتير لعهدة غير مفتوحة" })
      return
    }
    const { date, name, description, projectName, amount } = req.body
    const parsedAmount = Number(amount)
    if (!name || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ message: "Invalid invoice data" })
      return
    }
    const oldAmount = Number(doc.amount || 0)
    const delta = parsedAmount - oldAmount
    doc.date = date || doc.date
    doc.name = name
    doc.description = description
    doc.projectName = projectName
    doc.amount = parsedAmount
    if (req.file) {
      if (isR2Configured) {
        const nameHasExt = /\.[a-zA-Z0-9]+$/.test(String(req.file.originalname || ""))
        const inferredExt =
          req.file.mimetype === "image/png"
            ? ".png"
            : req.file.mimetype === "image/jpeg"
            ? ".jpg"
            : req.file.mimetype === "image/webp"
            ? ".webp"
            : req.file.mimetype === "application/pdf"
            ? ".pdf"
            : ""
        const nameWithExt = nameHasExt ? req.file.originalname : `${req.file.originalname || "file"}${inferredExt}`
        const key = buildSafeObjectKey(nameWithExt, { odaId: doc.odaId, invoiceId: doc.id })
        const url = await uploadBufferToR2(req.file.buffer, key, req.file.mimetype || "application/octet-stream")
        doc.fileName = key
        doc.originalFileName = nameWithExt
        doc.fileUrl = url
      } else {
        doc.fileName = req.file.filename
        doc.originalFileName = req.file.originalname
      }
    }
    await doc.save()
    if (isReplacement) {
      oda.currentBalance += delta
    } else {
      oda.currentBalance -= delta
    }
    await oda.save()
    if (isReplacement) {
      res.json({ replacement: doc, oda })
    } else {
      res.json({ invoice: doc, oda })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to update invoice" })
  }
})

export default router
