import mongoose from "mongoose"
import axios from "axios"

const isVercel = !!(globalThis.process && globalThis.process.env && globalThis.process.env.VERCEL)

export const connection = async () => {
  try {
    let uri = globalThis.process && globalThis.process.env ? globalThis.process.env.MONGO_URI : undefined

    const needsSrvResolve = typeof uri === "string" && uri.startsWith("mongodb+srv://")
    if (needsSrvResolve) {
      try {
        const m = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(\/[^?]*)?(?:\?(.*))?$/)
        if (m) {
          const user = m[1]
          const pass = m[2]
          const host = m[3]
          const path = m[4] || ""
          const originalQueryStr = m[5] || ""
          const dnsName = `_mongodb._tcp.${host}`
          const srvRes = await axios.get("https://dns.google/resolve", { params: { name: dnsName, type: "SRV" } })
          const answers = Array.isArray(srvRes.data?.Answer) ? srvRes.data.Answer : []
          const hostPorts = answers
            .map((a) => {
              const parts = String(a.data).split(" ")
              const port = parts[2]
              const target = parts[3]?.replace(/\.$/, "")
              return target && port ? `${target}:${port}` : null
            })
            .filter(Boolean)
          const params = {}
          if (originalQueryStr) {
            originalQueryStr.split("&").forEach((kv) => {
              const [k, v = ""] = kv.split("=")
              if (k) {
                const key = decodeURIComponent(k)
                if (!(key in params)) params[key] = decodeURIComponent(v)
              }
            })
          }
          if (!("tls" in params)) params.tls = "true"
          if (!("retryWrites" in params)) params.retryWrites = "true"
          if (!("w" in params)) params.w = "majority"
          try {
            const txtRes = await axios.get("https://dns.google/resolve", { params: { name: dnsName, type: "TXT" } })
            const txtAns = Array.isArray(txtRes.data?.Answer) ? txtRes.data.Answer : []
            const txt = txtAns.map((t) => String(t.data).replace(/^"|"$/g, "")).join("&")
            if (txt) {
              txt.split("&").forEach((kv) => {
                const [k, v = ""] = kv.split("=")
                if (k && !(k in params)) params[k] = v
              })
            }
          } catch (error) {
            console.error(error)
          }
          if (hostPorts.length) {
            const query = Object.entries(params)
              .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
              .join("&")
            uri = query
              ? `mongodb://${user}:${pass}@${hostPorts.join(",")}${path}?${query}`
              : `mongodb://${user}:${pass}@${hostPorts.join(",")}${path}`
          }
        }
      } catch (error) {
        console.error(error)
      }
    }

    if (!uri) {
      console.error("Mongo URI is missing")
      if (isVercel) {
        throw new Error("Mongo URI is missing")
      }
      if (globalThis.process && typeof globalThis.process.exit === "function") {
        globalThis.process.exit(1)
      } else {
        throw new Error("Mongo URI is missing")
      }
    }

    await mongoose.connect(uri, {
      dbName: "Ohda",
      serverSelectionTimeoutMS: 30000,
    })

    await mongoose.connection.db.admin().ping()
    console.log("Connected to MongoDB (Ohda)")
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message)
    if (isVercel) {
      throw error
    }
    if (globalThis.process && typeof globalThis.process.exit === "function") {
      globalThis.process.exit(1)
    } else {
      throw error
    }
  }
}
