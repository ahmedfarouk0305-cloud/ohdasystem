import app, { initDatabase } from "../../../../server/index.js"

let dbPromise

const ensureDatabase = () => {
  if (!dbPromise) {
    dbPromise = initDatabase().catch((error) => {
      console.error("Failed to initialize database in Vercel odas/[id]/accountant-approve function", error)
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
    if (req.method === "OPTIONS") {
      res.status(204).end()
      return
    }
    return app(req, res)
  } catch (error) {
    console.error("Unhandled error in /api/odas/[id]/accountant-approve handler", error)
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
