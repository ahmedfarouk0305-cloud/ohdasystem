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
  return app(req, res)
}

