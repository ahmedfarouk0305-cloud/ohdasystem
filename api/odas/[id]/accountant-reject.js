import app, { initDatabase } from "../../../../server/index.js"

let dbPromise

const ensureDatabase = () => {
  if (!dbPromise) {
    dbPromise = initDatabase().catch((error) => {
      console.error("Failed to initialize database in Vercel odas/[id]/accountant-reject function", error)
      throw error
    })
  }
  return dbPromise
}

export default async function handler(req, res) {
  try {
    await ensureDatabase()
    const originalUrl = req.url || "/"
    req.url = originalUrl.startsWith("/api") ? originalUrl : `/api${originalUrl}`
    const origin = req.headers.origin || "*"
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", origin)
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
      res.setHeader("Access-Control-Allow-Credentials", "true")
      res.status(204).end()
      return
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST,OPTIONS")
      res.status(405).json({ message: "Method Not Allowed" })
      return
    }
    return app(req, res)
  } catch (error) {
    console.error("Unhandled error in /api/odas/[id]/accountant-reject handler", error)
    if (!res.headersSent) {
      res
        .status(500)
        .json({
          message: "Server error",
          details: error && error.message ? error.message : "Unknown error",
        })
    }
  }
}
