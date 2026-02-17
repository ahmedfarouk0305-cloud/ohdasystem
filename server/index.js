import "dotenv/config"
import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { connection } from "./dbConnection.js"
import odasRouter from "./routes/odas.js"
import invoicesRouter from "./routes/invoices.js"
import authRouter from "./routes/auth.js"
import User from "./models/User.js"
import Oda from "./models/Oda.js"
import Invoice from "./models/Invoice.js"
import Replacement from "./models/Replacement.js"

const app = express()
 
app.use(cors())
app.options(/.*/, cors())
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, "uploads")

app.use("/uploads", express.static(uploadsDir))

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

const sseClients = new Set()
function sendSseEvent(event) {
  const payload = typeof event === "string" ? event : JSON.stringify(event)
  for (const res of sseClients) {
    try {
      res.write(`data: ${payload}\n\n`)
    } catch (e) {
      void e
    }
  }
}
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders && res.flushHeaders()
  res.write("data: connected\n\n")
  sseClients.add(res)
  req.on("close", () => {
    sseClients.delete(res)
  })
})

app.use("/api/auth", authRouter)
app.use("/api/odas", odasRouter)
app.use("/api/invoices", invoicesRouter)

const portFromEnv = globalThis.process && globalThis.process.env ? globalThis.process.env.PORT : undefined
const PORT = portFromEnv || 4001

export const initDatabase = async () => {
	await connection()
  try {
    const mappingByRole = {
      accountant: "finance@evasaudi.com",
      engineer: "hafez@evasaudi.com",
      manager: "meashal@evasaudi.com",
      doctor: "dr.saud@evasaudi.com",
    }
    for (const [role, email] of Object.entries(mappingByRole)) {
      const user = await User.findOne({ role })
      if (user && user.email !== email) {
        user.email = email
        await user.save()
      }
    }
    await User.updateMany({}, { $unset: { username: 1 } })
  } catch (error) {
    console.error("User migration failed", error)
  }
  try {
    const odaStream = Oda.watch()
    odaStream.on("change", () => {
      sendSseEvent({ type: "odas" })
    })
    const invoiceStream = Invoice.watch()
    invoiceStream.on("change", () => {
      sendSseEvent({ type: "invoices" })
    })
    const replacementStream = Replacement.watch()
    replacementStream.on("change", () => {
      sendSseEvent({ type: "replacements" })
    })
  } catch (error) {
    console.error("Change streams init failed", error)
  }
}

const isVercel = !!(globalThis.process && globalThis.process.env && globalThis.process.env.VERCEL)

if (!isVercel) {
  initDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`)
      })
    })
    .catch((error) => {
      console.error("Failed to start server:", error)
      if (globalThis.process && typeof globalThis.process.exit === "function") {
        globalThis.process.exit(1)
      }
    })
}

export default app
