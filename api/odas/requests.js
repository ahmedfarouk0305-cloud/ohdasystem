import app, { initDatabase } from "../../../server/index.js"

let dbPromise

const ensureDatabase = () => {
  if (!dbPromise) {
    dbPromise = initDatabase().catch((error) => {
      console.error("Failed to initialize database in Vercel odas/requests function", error)
      throw error
    })
  }
  return dbPromise
}

export default async function handler(req, res) {
  try {
    await ensureDatabase()
    req.url = "/api/odas/requests"
    return app(req, res)
  } catch (error) {
    console.error("Unhandled error in /api/odas/requests handler", error)
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: "Server error", details: error && error.message ? error.message : "Unknown error" })
    }
  }
}

