import express from "express"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import User from "../models/User.js"

const router = express.Router()

const hashPasswordInternal = (password, salt) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }
      resolve(derivedKey.toString("hex"))
    })
  })

const createPasswordHash = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = await hashPasswordInternal(password, salt)
  return `${salt}:${hash}`
}

const verifyPassword = async (password, storedHash) => {
  const parts = String(storedHash).split(":")
  if (parts.length !== 2) {
    return false
  }
  const [salt, hash] = parts
  const hashToCompare = await hashPasswordInternal(password, salt)
  return hash === hashToCompare
}

const getJwtSecret = () => {
  if (globalThis.process && globalThis.process.env) {
    return globalThis.process.env.JWT_SECRET
  }
  return undefined
}

router.post("/register", async (req, res) => {
  try {
    const { username, password, fullName } = req.body

    if (!username || !password) {
      res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبة" })
      return
    }

    const existingUser = await User.findOne({ username })
    if (existingUser) {
      res.status(409).json({ message: "اسم المستخدم مستخدم بالفعل" })
      return
    }

    const passwordHash = await createPasswordHash(password)

    const user = await User.create({
      username,
      passwordHash,
      fullName,
    })

    res.status(201).json({
      id: user._id,
      username: user.username,
      fullName: user.fullName || "",
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "فشل إنشاء المستخدم" })
  }
})

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبة" })
      return
    }

    const user = await User.findOne({ username })
    if (!user) {
      res.status(401).json({ message: "بيانات الدخول غير صحيحة" })
      return
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      res.status(401).json({ message: "بيانات الدخول غير صحيحة" })
      return
    }

    const secret = getJwtSecret()
    if (!secret) {
      console.error("JWT secret is missing")
      res.status(500).json({ message: "خطأ في إعدادات الخادم" })
      return
    }

    const token = jwt.sign(
      {
        sub: String(user._id),
        username: user.username,
      },
      secret,
      { expiresIn: "8h" },
    )

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName || "",
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "فشل تسجيل الدخول" })
  }
})

export default router
