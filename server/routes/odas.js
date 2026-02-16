import express from "express"
import axios from "axios"
import Oda from "../models/Oda.js"
import OdaRequest from "../models/OdaRequest.js"

const router = express.Router()

const sendOdaSmsNotification = async (employee, transferAmount) => {
  const secretKey = globalThis.process && globalThis.process.env ? globalThis.process.env.DREAMS_SECRET_KEY : undefined
  if (!secretKey) {
    return
  }

  const phoneFromEnv = globalThis.process && globalThis.process.env ? globalThis.process.env.ODA_SMS_PHONE : undefined
  const phone = phoneFromEnv || "0582010465"
  const message = `طلب ${employee} استعاضة عهدة المبلغ المراد تحويلة ${transferAmount}`
  const encodedMessage = encodeURIComponent(message)

  const baseURL = "https://www.dreams.sa/index.php/api/sendsms"
  const user = "Eva_RealEstate"
  const sender = "Eva%20Aqar"

  const smsURL = `${baseURL}/?user=${user}&secret_key=${secretKey}&sender=${sender}&to=${phone}&message=${encodedMessage}`

  try {
    await axios.get(smsURL)
  } catch (error) {
    console.error("Failed to send oda SMS notification", error?.response?.data || error?.message || error)
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
    const { employee, amount } = req.body
    const parsedAmount = Number(amount)

    if (!employee || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ message: "Invalid oda data" })
      return
    }

    const existingPendingRequest = await OdaRequest.findOne({
      employee,
      status: "معلقة",
    })

    if (existingPendingRequest) {
      res.status(400).json({
        message:
          "لا يمكن طلب عهدة جديدة، يوجد طلب عهدة معلق لنفس الموظف يجب حسمه أولاً",
      })
      return
    }

    const previousOda = await Oda.findOne({ employee, status: { $in: ["مفتوحة", "مغلقة جزئياً"] } }).sort({ id: -1 })

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
    const today = new Date().toISOString().slice(0, 10)

    if (previousOda) {
      previousOda.closingBalance = previousOda.currentBalance
      previousOda.status = "مغلقة جزئياً"
      previousOda.closingDate = today
      await previousOda.save()
    }

    const oda = await Oda.create({
      id: nextId,
      employee,
      startDate: today,
      amount: parsedAmount,
      currentBalance: parsedAmount,
      closingBalance: 0,
      status: "معلقة",
      closingDate: "",
    })

    await OdaRequest.create({
      odaId: oda.id,
      employee,
      requestDate: today,
      newAmount: parsedAmount,
      previousClosingBalance,
      transferAmount,
      status: "معلقة",
    })

    await sendOdaSmsNotification(employee, transferAmount)

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

    await OdaRequest.findOneAndUpdate({ odaId: id }, { status: "مقبولة" })

    res.json({ oda })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to accept oda" })
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

    oda.status = "مرفوضة"
    await oda.save()

    await OdaRequest.findOneAndUpdate({ odaId: id }, { status: "مرفوضة" })

    res.json({ oda })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to reject oda" })
  }
})

export default router
