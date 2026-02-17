import express from "express"
import axios from "axios"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import Oda from "../models/Oda.js"
import OdaRequest from "../models/OdaRequest.js"

const router = express.Router()

const sendSms = async (toPhone, message) => {
  const env = globalThis.process && globalThis.process.env ? globalThis.process.env : undefined
  const secretKey = env ? env.DREAMS_SECRET_KEY : undefined
  if (!secretKey || !toPhone) {
    console.error("Skipping SMS: missing secret or phone", { hasSecret: !!secretKey, toPhone })
    return
  }
  const baseURL = "https://www.dreams.sa/index.php/api/sendsms"
  const user = "Eva_RealEstate"
  const sender = "Eva%20Aqar"
  const encodedMessage = encodeURIComponent(message)
  const smsURL = `${baseURL}/?user=${user}&secret_key=${secretKey}&sender=${sender}&to=${toPhone}&message=${encodedMessage}`
  try {
    await axios.get(smsURL)
    console.log("SMS sent", { toPhone })
  } catch (error) {
    console.error("Failed to send SMS", { toPhone, error: error?.response?.data || error?.message || error })
  }
}

const getPhonesByRole = async (role) => {
  const orQuery = [{ role }]
  if (role === "doctor") {
    orQuery.push({ roleLabel: { $regex: /doctor/i } })
  }
  if (role === "accountant") {
    orQuery.push({ roleLabel: { $regex: /accountant/i } })
  }
  const users = await User.find({ $or: orQuery }).select("phoneNumber")
  const phones = users
    .map((u) => String(u.phoneNumber || "").trim())
    .filter((p) => !!p)
  if (!phones.length) {
    console.error("No recipient phones found for role", role)
  }
  return phones
}

const sendOdaSmsNotification = async (employee, transferAmount) => {
  const phones = await getPhonesByRole("accountant")
  const message = `طلب ${employee} استعاضة عهدة. المبلغ المراد تحويله ${transferAmount}. يرجى المراجعة من خلال الرابط التالي : https://ohdasystem.vercel.app`
  for (const phone of phones) {
    await sendSms(phone, message)
  }
}

const sendDoctorSmsNotification = async (employee, odaId, employeeOdaNumber) => {
  const phones = await getPhonesByRole("doctor")
  const num = employeeOdaNumber || odaId
  const message = `طلب عهدة للموظف ${employee} رقم ${num} تم اعتماده من المحاسب وهو بانتظار موافقة الدكتور. يرجى المراجعة من خلال الرابط التالي : https://ohdasystem.vercel.app`
  for (const phone of phones) {
    await sendSms(phone, message)
  }
}

const sendEmployeeSmsByName = async (employeeFullName, message) => {
  if (!employeeFullName) return
  const user = await User.findOne({ fullName: employeeFullName }).select("phoneNumber fullName")
  const phone = user ? String(user.phoneNumber || "").trim() : ""
  if (phone) {
    await sendSms(phone, message)
  } else {
    console.error("Skipping Employee SMS: phone not found for", { employeeFullName })
  }
}

router.get("/", async (req, res) => {
  try {
    const odas = await Oda.find().sort({ id: 1 })
    res.json(odas)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to fetch odas" })
  }
})

router.get("/requests", async (req, res) => {
  try {
    const requests = await OdaRequest.find().sort({ createdAt: -1 })
    res.json(requests)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to fetch oda requests" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id)
    const oda = await Oda.findOne({ id })
    if (!oda) {
      res.status(404).json({ message: "Oda not found" })
      return
    }
    res.json(oda)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to fetch oda" })
  }
})

router.post("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const secret = globalThis.process && globalThis.process.env ? globalThis.process.env.JWT_SECRET : undefined
    if (!token || !secret) {
      res.status(401).json({ message: "غير مصرح" })
      return
    }
    let payload
    try {
      payload = jwt.verify(token, secret)
    } catch {
      res.status(401).json({ message: "رمز الدخول غير صالح" })
      return
    }
    const userId = String(payload?.sub || "")
    const email = String(payload?.email || "")
    const user = userId ? await User.findById(userId) : await User.findOne({ email })
    const role = String(user?.role || "")
    if (role === "doctor" || role === "accountant") {
      res.status(403).json({ message: "لا يحق للدكتور أو المحاسب طلب عهدة" })
      return
    }
    const employeeName = user ? (user.fullName || user.email) : ""
    const allowedEmployees = ["مهندس سامح حافظ", "استاذ مشعل العصيمي"]
    if (!allowedEmployees.includes(String(user?.fullName || ""))) {
      res.status(403).json({ message: "صلاحية طلب العهدة محصورة على المهندس سامح والأستاذ مشعل" })
      return
    }
    const { amount } = req.body
    const parsedAmount = Number(amount)

    if (!employeeName || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ message: "Invalid oda data" })
      return
    }

    const existingPendingRequest = await OdaRequest.findOne({
      employee: employeeName,
      status: { $in: [
        "معلقة",
        "بانتظار مراجعة المحاسب",
        "مقبولة من المحاسب",
      ] },
    })

    if (existingPendingRequest) {
      res.status(400).json({
        message:
          "لا يمكن طلب عهدة جديدة، يوجد طلب عهدة معلق لنفس الموظف يجب حسمه أولاً",
      })
      return
    }

    const previousOda = await Oda.findOne({ employee: employeeName, status: { $in: ["مفتوحة", "مغلقة جزئياً"] } }).sort({ id: -1 })

    if (previousOda && previousOda.currentBalance > 0 && parsedAmount < previousOda.currentBalance) {
      res.status(400).json({
        message: "لا يمكن طلب عهدة جديدة بمبلغ أقل من الرصيد الحالي في العهدة السابقة",
      })
      return
    }

    const previousClosingBalance = previousOda ? previousOda.currentBalance : 0
    const transferAmount = parsedAmount - previousClosingBalance

    const lastOda = await Oda.findOne().sort({ id: -1 })
    const nextId = lastOda ? lastOda.id + 1 : 1
    const employeeOdas = await Oda.find({ employee: employeeName }).select("employeeOdaNumber status").sort({ employeeOdaNumber: 1 })
    const usedNumbers = new Set()
    for (const o of employeeOdas) {
      const n = Number(o.employeeOdaNumber || 0)
      const s = String(o.status || "")
      if (!n || s.startsWith("مرفوضة")) {
        continue
      }
      usedNumbers.add(n)
    }
    let nextEmployeeOdaNumber = 1
    while (usedNumbers.has(nextEmployeeOdaNumber)) {
      nextEmployeeOdaNumber += 1
    }
    const today = new Date().toISOString().slice(0, 10)

    if (previousOda) {
      previousOda.closingBalance = previousOda.currentBalance
      previousOda.status = "مغلقة جزئياً"
      previousOda.closingDate = today
      await previousOda.save()
    }

    const oda = await Oda.create({
      id: nextId,
      employee: employeeName,
      employeeOdaNumber: nextEmployeeOdaNumber,
      startDate: today,
      amount: parsedAmount,
      currentBalance: parsedAmount,
      closingBalance: 0,
      status: "بانتظار مراجعة المحاسب",
      closingDate: "",
    })

    await OdaRequest.create({
      odaId: oda.id,
      employee: employeeName,
      employeeOdaNumber: nextEmployeeOdaNumber,
      requestDate: today,
      newAmount: parsedAmount,
      previousClosingBalance,
      transferAmount,
      status: "بانتظار مراجعة المحاسب",
    })

    await sendOdaSmsNotification(employeeName, transferAmount)

    res.status(201).json({
      oda,
      previousClosingBalance,
      transferAmount,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to create oda" })
  }
})

router.post("/:id/accountant-approve", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ message: "Invalid oda id" })
      return
    }

    const oda = await Oda.findOne({ id })
    if (!oda) {
      res.status(404).json({ message: "Oda not found" })
      return
    }

    oda.status = "بانتظار موافقة الدكتور"
    await oda.save()

    await OdaRequest.findOneAndUpdate({ odaId: id }, { status: "مقبولة من المحاسب" })

    try {
      await sendDoctorSmsNotification(oda.employee, id, oda.employeeOdaNumber)
    } catch (notifyError) {
      console.error("Doctor notification failed", notifyError?.message || notifyError)
    }
    try {
      const num = oda.employeeOdaNumber || id
      await sendEmployeeSmsByName(
        oda.employee,
        `تم قبول طلب العهدة رقم ${num} الخاصة بك من المحاسب وهي الآن بانتظار موافقة الدكتور`,
      )
    } catch (employeeNotifyError) {
      console.error("Employee notify after accountant approve failed", employeeNotifyError?.message || employeeNotifyError)
    }

    res.json({ oda })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to accept oda" })
  }
})

router.post("/:id/accountant-reject", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ message: "Invalid oda id" })
      return
    }

    const oda = await Oda.findOne({ id })
    if (!oda) {
      res.status(404).json({ message: "Oda not found" })
      return
    }

    oda.status = "مرفوضة من المحاسب"
    await oda.save()

    await OdaRequest.findOneAndUpdate({ odaId: id }, { status: "مرفوضة من المحاسب" })

    res.json({ oda })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to reject oda" })
  }
})

router.post("/:id/reject", async (req, res) => {
	try {
		const id = Number(req.params.id)
		if (!id) {
			res.status(400).json({ message: "Invalid oda id" })
			return
		}

		const oda = await Oda.findOne({ id })
		if (!oda) {
			res.status(404).json({ message: "Oda not found" })
			return
		}

		oda.status = "مرفوضة من الدكتور"
		await oda.save()

		await OdaRequest.findOneAndUpdate(
			{ odaId: id },
			{ status: "مرفوضة من الدكتور" },
		)

		res.json({ oda })
	} catch (error) {
		console.error("Failed to reject oda by doctor", error)
		res.status(500).json({ message: "Failed to reject oda" })
	}
})

router.post("/:id/accept", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ message: "Invalid oda id" })
      return
    }

    const oda = await Oda.findOne({ id })
    if (!oda) {
      res.status(404).json({ message: "Oda not found" })
      return
    }

    const employee = oda.employee

    oda.status = "مفتوحة"
    await oda.save()

    if (employee) {
      const previousOda = await Oda.findOne({
        employee,
        status: "مغلقة جزئياً",
        id: { $lt: id },
      }).sort({ id: -1 })

      if (previousOda) {
        previousOda.status = "مغلقة"
        await previousOda.save()
      }
    }

    await OdaRequest.findOneAndUpdate({ odaId: id }, { status: "مقبولة نهائياً" })

    try {
      const num = oda.employeeOdaNumber || id
      await sendEmployeeSmsByName(
        employee,
        `تم قبول الدكتور طلب عهدتك رقم ${num}. بالتوفيق`,
      )
    } catch (employeeNotifyError) {
      console.error("Employee notify after doctor approve failed", employeeNotifyError?.message || employeeNotifyError)
    }

    res.json({ oda })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to accept oda" })
  }
})


export default router
