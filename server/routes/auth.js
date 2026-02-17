import express from "express"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import axios from "axios"
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

const sendOtpSms = async (toPhone, code, purpose = "login") => {
  const env = globalThis.process && globalThis.process.env ? globalThis.process.env : undefined
  const secretKey = env ? env.DREAMS_SECRET_KEY : undefined
  if (!secretKey) {
    console.error("Skipping OTP SMS: DREAMS_SECRET_KEY is not configured in environment variables")
    return
  }
  const baseURL = "https://www.dreams.sa/index.php/api/sendsms"
  const user = "Eva_RealEstate"
  const sender = "Eva%20Aqar"
  const message =
    purpose === "approval"
      ? `رمز التحقق لتأكيد الإجراء على طلب العهدة: ${code}`
      : `رمز التحقق للدخول إلى نظام العهدة: ${code}`
  const encodedMessage = encodeURIComponent(message)
  const smsURL = `${baseURL}/?user=${user}&secret_key=${secretKey}&sender=${sender}&to=${toPhone}&message=${encodedMessage}`
  try {
    await axios.get(smsURL)
    console.log("OTP SMS sent", { toPhone })
  } catch (error) {
    console.error("Failed to send OTP SMS", {
      toPhone,
      error: error?.response?.data || error?.message || error,
    })
  }
}

router.post("/register", async (req, res) => {
  res.status(403).json({ message: "تم إلغاء التسجيل بالبريد وكلمة المرور. يرجى إنشاء المستخدمين من لوحة الإدارة فقط" })
})

router.post("/login", async (req, res) => {
  res.status(403).json({ message: "تم إلغاء تسجيل الدخول بكلمة المرور. استخدم رمز التحقق عبر الجوال" })
})

router.post("/send-code", async (req, res) => {
  try {
    const { phoneNumber, purpose } = req.body
    const trimmed = String(phoneNumber || "").trim()
    if (!trimmed) {
      res.status(400).json({ message: "رقم الجوال مطلوب" })
      return
    }
    const user = await User.findOne({ phoneNumber: trimmed })
    if (!user) {
      res.status(404).json({ message: "لا يوجد مستخدم بهذا الرقم" })
      return
    }
    const code = String(crypto.randomInt(100000, 999999))
    const otpHash = await createPasswordHash(code)
    const expires = new Date(Date.now() + 10 * 60 * 1000)
    await User.updateOne(
      { _id: user._id },
      { $set: { otpHash, otpExpiresAt: expires } },
      { runValidators: false },
    )
    await sendOtpSms(trimmed, code, String(purpose || "login"))
    res.json({ message: "تم إرسال رمز التحقق" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "فشل إرسال رمز التحقق" })
  }
})

router.options("/send-code", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.status(204).end()
})

router.all("/send-code", (req, res) => {
  if (req.method !== "POST" && req.method !== "OPTIONS") {
    res.setHeader("Allow", "POST,OPTIONS")
    res.status(405).json({ message: "Method Not Allowed" })
    return
  }
})

router.post("/login-code", async (req, res) => {
  try {
    const { phoneNumber, code } = req.body
    if (!phoneNumber || !code) {
      res.status(400).json({ message: "رقم الجوال ورمز التحقق مطلوبان" })
      return
    }
    const user = await User.findOne({ phoneNumber: String(phoneNumber).trim() })
    if (!user || !user.otpHash || !user.otpExpiresAt) {
      res.status(401).json({ message: "رمز التحقق غير صالح" })
      return
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
      res.status(401).json({ message: "انتهت صلاحية رمز التحقق" })
      return
    }
    const ok = await verifyPassword(String(code), user.otpHash)
    if (!ok) {
      res.status(401).json({ message: "رمز التحقق غير صحيح" })
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
        email: user.email,
      },
      secret,
      { expiresIn: "8h" },
    )
    user.otpHash = ""
    user.otpExpiresAt = undefined
    await user.save()
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName || "",
        phoneNumber: user.phoneNumber || "",
        role: user.role || "employee",
        roleLabel: user.roleLabel || "",
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "فشل تسجيل الدخول برمز التحقق" })
  }
})

router.options("/login-code", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.status(204).end()
})

router.all("/login-code", (req, res) => {
  if (req.method !== "POST" && req.method !== "OPTIONS") {
    res.setHeader("Allow", "POST,OPTIONS")
    res.status(405).json({ message: "Method Not Allowed" })
    return
  }
})

router.post("/reset-password", async (req, res) => {
  res.status(403).json({ message: "تم إلغاء استرجاع كلمة المرور. تسجيل الدخول يعتمد على رمز التحقق فقط" })
})

export default router
