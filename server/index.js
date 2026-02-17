import "dotenv/config"
import express from "express"
import cors from "cors"
import crypto from "crypto"
import path from "path"
import { fileURLToPath } from "url"
import { connection } from "./dbConnection.js"
import odasRouter from "./routes/odas.js"
import invoicesRouter from "./routes/invoices.js"
import authRouter from "./routes/auth.js"
import User from "./models/User.js"

const app = express()

app.use(cors())
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, "uploads")

app.use("/uploads", express.static(uploadsDir))

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

app.use("/api/auth", authRouter)
app.use("/api/odas", odasRouter)
app.use("/api/invoices", invoicesRouter)

const portFromEnv = globalThis.process && globalThis.process.env ? globalThis.process.env.PORT : undefined
const PORT = portFromEnv || 4001

const createPasswordHashForSeed = (password) =>
  new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex")
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }
      const hash = derivedKey.toString("hex")
      resolve(`${salt}:${hash}`)
    })
  })

const ensureUser = async (username, password, fullName, role, phoneNumber) => {
  const existing = await User.findOne({ username })
  if (existing) {
    return
  }
  const passwordHash = await createPasswordHashForSeed(password)
  await User.create({
    username,
    passwordHash,
    fullName,
    role: role || "employee",
    phoneNumber: phoneNumber || "",
  })
}

const seedUsers = async () => {
  await ensureUser("dr.saud", "Aa@112233", "دكتور سعود العصيمي", "doctor", "")
  await ensureUser("Eng.Sameh", "Aa@112233", "مهندس سامح حافظ", "engineer", "")
  await ensureUser("Mr.Misheal", "Aa@112233", "استاذ مشعل العصيمي", "manager", "")
  await ensureUser("accountant", "Aa@112233", "محاسب", "accountant", "")
}

export const initDatabase = async () => {
  await connection()
  await seedUsers()
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
