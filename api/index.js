import app, { initDatabase } from "../server/index.js"

let dbPromise

const ensureDatabase = () => {
  if (!dbPromise) {
    dbPromise = initDatabase().catch((error) => {
      console.error("Failed to initialize database in Vercel function", error)
      throw error
    })
  }
  return dbPromise
}

export default async function handler(req, res) {
  await ensureDatabase()
  try {
    const originalUrl = req.url || "/"
    req.url = originalUrl.startsWith("/api") ? originalUrl : `/api${originalUrl}`
    return app(req, res)
  } catch (error) {
    console.error("Unhandled error in /api index handler", error)
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error", details: error?.message || "Unknown error" })
    }
  }
}
