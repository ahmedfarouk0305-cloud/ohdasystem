import { useEffect, useState } from 'react'
import './App.css'

const initialOdas = []

const initialInvoices = []

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '')
const SAMAH_EMPLOYEE_NAME = 'مهندس سامح حافظ'
const MISHAAL_EMPLOYEE_NAME = 'استاذ مشعل العصيمي'

function App() {
  const [odas, setOdas] = useState(initialOdas)
  const [view, setView] = useState('login')
  const [authToken, setAuthToken] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newOdaError, setNewOdaError] = useState('')
  const [selectedOdaId, setSelectedOdaId] = useState(null)
  const [invoices, setInvoices] = useState(initialInvoices)
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceName, setInvoiceName] = useState('')
  const [invoiceDescription, setInvoiceDescription] = useState('')
  const [invoiceProjectName, setInvoiceProjectName] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceFile, setInvoiceFile] = useState(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [odaEmployeeFilter, setOdaEmployeeFilter] = useState('all')
  const [odaRequests, setOdaRequests] = useState([])

  const currentUsername = currentUser ? currentUser.username || '' : ''
  const currentFullName = currentUser ? currentUser.fullName || '' : ''

  const isDoctorSaud =
    currentUsername === 'dr.saud' || currentFullName === 'دكتور سعود العصيمي'
  const isSameh =
    currentUsername === 'Eng.Sameh' || currentFullName === SAMAH_EMPLOYEE_NAME
  const isMishaal =
    currentUsername === 'Mr.Misheal' || currentFullName === MISHAAL_EMPLOYEE_NAME

  const hasPendingOdaRequestForCurrentUser = (() => {
    if (!currentUser) {
      return false
    }
    const employeeName = currentUser.fullName || currentUser.username
    return odaRequests.some(
      (request) =>
        request.employee === employeeName &&
        (request.status === 'معلقة' || !request.status),
    )
  })()

  const getAuthHeaders = () => {
    const headers = {}
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }
    return headers
  }

  const lastId = odas.length ? odas[odas.length - 1].id : 0
  const nextId = lastId + 1

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [odasResponse, invoicesResponse, odaRequestsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/odas`),
        fetch(`${API_BASE_URL}/invoices`),
        fetch(`${API_BASE_URL}/odas/requests`),
      ])

      if (odasResponse.ok) {
        const odasData = await odasResponse.json()
        setOdas(odasData)
      }

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        setInvoices(invoicesData)
      }

      if (odaRequestsResponse.ok) {
        const odaRequestsData = await odaRequestsResponse.json()
        setOdaRequests(odaRequestsData)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    try {
      const storedToken = window.localStorage.getItem('authToken')
      const storedUser = window.localStorage.getItem('authUser')

      if (storedToken) {
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser)
            setAuthToken(storedToken)
            setCurrentUser(parsedUser)
            setView('dashboard')
            loadData()
            return
          } catch (parseError) {
            console.error(parseError)
          }
        }

        window.localStorage.removeItem('authToken')
        window.localStorage.removeItem('authUser')
      }
    } catch (error) {
      console.error(error)
    }
  }, [])

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthError('')

    if (!loginUsername || !loginPassword) {
      setAuthError('الرجاء إدخال اسم المستخدم وكلمة المرور')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setAuthError('بيانات الدخول غير صحيحة')
        } else {
          setAuthError('تعذر تسجيل الدخول، حاول مرة أخرى')
        }
        return
      }

      const data = await response.json()

      setAuthToken(data.token)
      setCurrentUser(data.user)
      try {
        window.localStorage.setItem('authToken', data.token)
        window.localStorage.setItem('authUser', JSON.stringify(data.user))
      } catch (error) {
        console.error(error)
      }

      setView('dashboard')
      await loadData()
      setLoginUsername('')
      setLoginPassword('')
    } catch (error) {
      console.error(error)
      setAuthError('حدث خطأ أثناء الاتصال بالخادم')
    }
  }

  const handleOpenOdaDetails = (id) => {
    setSelectedOdaId(id)
    setView('odaDetails')
  }

  const handleCreateOda = async (event) => {
    event.preventDefault()

    setNewOdaError('')

    if (!newAmount) {
      setNewOdaError('الرجاء إدخال مبلغ العهدة')
      return
    }

    const amountNumber = Number(newAmount)
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setNewOdaError('مبلغ العهدة يجب أن يكون أكبر من صفر')
      return
    }

    if (!currentUser) {
      setNewOdaError('انتهت جلسة الدخول، الرجاء إعادة تسجيل الدخول')
      setView('login')
      return
    }

    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    }

    const employeeName = currentUser.fullName || currentUser.username

    try {
      const response = await fetch(`${API_BASE_URL}/odas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          employee: employeeName,
          amount: amountNumber,
        }),
      })

      if (!response.ok) {
        let message = 'تعذر حفظ العهدة، تأكد من الاتصال وحاول مرة أخرى'
        try {
          const data = await response.json()
          if (data && typeof data.message === 'string' && data.message) {
            message = data.message
          }
        } catch (parseError) {
          console.error(parseError)
        }
        setNewOdaError(message)
        return
      }
      const data = await response.json()

      if (!data || !data.oda) {
        await loadData()
        setNewAmount('')
        setView('dashboard')
        return
      }

      await loadData()
      setNewAmount('')
      setView('odaRequests')
    } catch (error) {
      console.error(error)
      setNewOdaError('حدث خطأ أثناء الاتصال بالخادم عند حفظ العهدة')
    }
  }

  const handleLogout = () => {
    setAuthToken('')
    setCurrentUser(null)
    setSelectedOdaId(null)
    setView('login')
    try {
      window.localStorage.removeItem('authToken')
      window.localStorage.removeItem('authUser')
    } catch (error) {
      console.error(error)
    }
  }

  const handleApproveOdaRequest = async (odaId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/odas/${odaId}/accept`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        return
      }

      await loadData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleRejectOdaRequest = async (odaId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/odas/${odaId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        return
      }

      await loadData()
    } catch (error) {
      console.error(error)
    }
  }

  const handleAddInvoice = async (event) => {
    event.preventDefault()

    if (!selectedOdaId || !invoiceAmount || !invoiceName || !invoiceFile) {
      return
    }

    const amountNumber = Number(invoiceAmount)
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      return
    }

    const dateValue = invoiceDate || new Date().toISOString().slice(0, 10)

    const formData = new FormData()
    formData.append('odaId', String(selectedOdaId))
    formData.append('date', dateValue)
    formData.append('name', invoiceName)
    formData.append('description', invoiceDescription)
    formData.append('projectName', invoiceProjectName)
    formData.append('amount', String(amountNumber))
    formData.append('file', invoiceFile)

    const headers = {}

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      return
    }

    await loadData()

    setInvoiceAmount('')
    setInvoiceName('')
    setInvoiceDescription('')
    setInvoiceProjectName('')
    setInvoiceDate('')
    setInvoiceFile(null)
    setIsInvoiceModalOpen(false)
  }

  if (view === 'login') {
    return (
      <div className="dashboard">
        <div className="page-logo">
          <img src="/لوجو فقط png.png" alt="شعار الشركة" className="app-logo" />
        </div>
        <section className="card login-card">
          <h2>تسجيل الدخول للنظام</h2>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-row">
              <label>اسم المستخدم</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
              />
            </div>
            <div className="form-row">
              <label>كلمة المرور</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
              />
            </div>
            {authError && <p className="login-error">{authError}</p>}
            <div className="form-actions login-actions">
              <button type="submit" className="primary-button">
                دخول
              </button>
            </div>
          </form>
        </section>
      </div>
    )
  }

  if (view === 'odaDetails' && selectedOdaId != null) {
    const currentOda = odas.find((oda) => oda.id === selectedOdaId)
    const odaInvoices = invoices.filter(
      (invoice) => invoice.odaId === selectedOdaId,
    )

    if (!currentOda) {
      return null
    }

    const spentAmount = currentOda.amount - currentOda.currentBalance

    const canAddInvoice =
      currentOda.status === 'مفتوحة' &&
      ((isSameh && currentOda.employee === SAMAH_EMPLOYEE_NAME) ||
        (isMishaal && currentOda.employee === MISHAAL_EMPLOYEE_NAME) ||
        (!isDoctorSaud && !isSameh && !isMishaal))

    const lastInvoiceForOdaId = odaInvoices.length
      ? odaInvoices[odaInvoices.length - 1].id
      : 0
    const nextInvoiceId = lastInvoiceForOdaId + 1

    return (
      <div className="dashboard">
        <div className="page-logo">
          <img
            src="/لوجو فقط png.png"
            alt="شعار الشركة"
            className="app-logo"
          />

        </div>
        <header className="dashboard-header">
          <div className="oda-header-title">
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="back-icon-button"
              aria-label="رجوع لقائمة العهد"
            >
              ←
            </button>
            <h1>تفاصيل العهدة رقم {currentOda.id}</h1>
          </div>
        </header>

        <section className="card oda-summary">
          <div className="oda-summary-grid">
            <div className="summary-item">
              <div className="summary-label">الموظف</div>
              <div className="summary-value">{currentOda.employee}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">الرصيد الافتتاحي</div>
              <div className="summary-value">
                {currentOda.amount.toLocaleString('ar-SA')} ريال
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">المصروف حتى الآن</div>
              <div className="summary-value">
                {spentAmount.toLocaleString('ar-SA')} ريال
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">الرصيد الحالي</div>
              <div className="summary-value">
                {currentOda.currentBalance.toLocaleString('ar-SA')} ريال
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">رصيد الإقفال</div>
              <div className="summary-value">
                {currentOda.closingBalance.toLocaleString('ar-SA')} ريال
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">الحالة</div>
              <div className="summary-value">{currentOda.status}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">تاريخ البداية</div>
              <div className="summary-value">{currentOda.startDate}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">تاريخ الإغلاق</div>
              <div className="summary-value">
                {currentOda.closingDate || '-'}
              </div>
            </div>
          </div>
        </section>

        <section className="card oda-invoices">
          <div className="oda-invoices-header">
            <h2>فواتير العهدة</h2>
            {canAddInvoice && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10)
                  if (!invoiceDate) {
                    setInvoiceDate(today)
                  }
                  setIsInvoiceModalOpen(true)
                }}
              >
                إضافة فاتورة
              </button>
            )}
          </div>

          <table className="oda-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>اسم الفاتورة</th>
                <th>تاريخ الفاتورة</th>
                <th>المبلغ (ريال)</th>
                <th>الوصف</th>
                <th>اسم المشروع</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {odaInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7">لا توجد فواتير مسجلة لهذه العهدة بعد</td>
                </tr>
              ) : (
                odaInvoices.map((invoice) => {
                  const hasFile = Boolean(invoice.fileName)
                  const fileUrl = hasFile
                    ? `${SERVER_BASE_URL}/uploads/${invoice.fileName}`
                    : ''
                  const downloadUrl = `${API_BASE_URL}/invoices/${invoice.id}/download`

                  const handleView = () => {
                    if (!hasFile) {
                      return
                    }
                    window.open(fileUrl, '_blank', 'noopener,noreferrer')
                  }

                  const handleShare = () => {
                    if (!hasFile) {
                      return
                    }
                    const shareUrl = fileUrl
                    if (navigator.share) {
                      navigator
                        .share({
                          title: invoice.name,
                          text: 'رابط مستند الفاتورة',
                          url: shareUrl,
                        })
                        .catch((error) => {
                          console.error(error)
                        })
                    } else if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(shareUrl).catch((error) => {
                        console.error(error)
                      })
                    }
                  }

                  return (
                    <tr key={invoice.id}>
                      <td>{invoice.id}</td>
                      <td>{invoice.name}</td>
                      <td>{invoice.date}</td>
                      <td>{invoice.amount.toLocaleString('ar-SA')}</td>
                      <td>{invoice.description}</td>
                      <td>{invoice.projectName || '-'}</td>
                      <td className="invoice-actions-cell">
                        <button
                          type="button"
                          className="icon-button icon-button-view"
                          onClick={handleView}
                          disabled={!hasFile}
                          aria-label="عرض الفاتورة"
                        >
                          🧾
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button-share"
                          onClick={handleShare}
                          disabled={!hasFile}
                          aria-label="مشاركة الفاتورة"
                        >
                          🔗
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button-download"
                          onClick={() => {
                            if (!hasFile) {
                              return
                            }
                            window.location.href = downloadUrl
                          }}
                          disabled={!hasFile}
                          aria-label="تنزيل الفاتورة"
                        >
                          ⬇
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </section>

        {isInvoiceModalOpen && (
          <div className="modal-backdrop">
            <div className="modal oda-invoices">
              <h3>إضافة فاتورة جديدة</h3>
              <form onSubmit={handleAddInvoice} className="invoice-form">
                <div className="form-row">
                  <label>رقم الفاتورة</label>
                  <input type="text" value={nextInvoiceId} readOnly />
                </div>
                <div className="form-row">
                  <label>اسم الفاتورة</label>
                  <input
                    type="text"
                    value={invoiceName}
                    onChange={(event) => setInvoiceName(event.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>الوصف</label>
                  <input
                    type="text"
                    value={invoiceDescription}
                    onChange={(event) =>
                      setInvoiceDescription(event.target.value)
                    }
                  />
                </div>
                <div className="form-row">
                  <label>المبلغ (ريال)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceAmount}
                    onChange={(event) =>
                      setInvoiceAmount(event.target.value)
                    }
                    required
                  />
                </div>
                <div className="form-row">
                  <label>اسم المشروع</label>
                  <input
                    type="text"
                    value={invoiceProjectName}
                    onChange={(event) =>
                      setInvoiceProjectName(event.target.value)
                    }
                  />
                </div>
                <div className="form-row">
                  <label>تاريخ الفاتورة</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) =>
                      setInvoiceDate(event.target.value)
                    }
                  />
                </div>
                <div className="form-row form-row-full">
                  <label>مستند الفاتورة (PDF أو صورة)</label>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(event) => {
                      const file =
                        event.target.files && event.target.files[0]
                      setInvoiceFile(file || null)
                    }}
                    required
                  />
                </div>
                <div className="modal-actions modal-actions-cancel">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setIsInvoiceModalOpen(false)}
                  >
                    إلغاء
                  </button>
                </div>
                <div className="modal-actions modal-actions-save">
                  <button type="submit" className="primary-button">
                    حفظ الفاتورة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (view === 'newOda') {
    return (
      <div className="dashboard">
        <div className="page-logo">
          <img src="/لوجو فقط png.png" alt="شعار الشركة" className="app-logo" />

        </div>
        <header className="dashboard-header">
          <h1>طلب عهدة جديدة</h1>
        </header>

        <section className="card new-oda-form">
          <form onSubmit={handleCreateOda}>
            <div className="form-row">
              <label>رقم العهدة</label>
              <input type="text" value={nextId} readOnly />
            </div>

            <div className="form-row">
              <label>مبلغ العهدة (ريال)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newAmount}
                onChange={(event) => setNewAmount(event.target.value)}
                required
              />
            </div>

            {newOdaError && <p className="oda-error">{newOdaError}</p>}

            <div className="form-actions">
              <button type="button" onClick={() => setView('dashboard')}>
                رجوع للقائمة
              </button>
              <button type="submit" className="primary-button">
                حفظ العهدة
              </button>
            </div>
          </form>
        </section>
      </div>
    )
  }

  if (view === 'odaRequests') {
    const filteredOdaRequests = odaRequests.filter((request) => {
      if (isDoctorSaud) {
        return true
      }
      if (isSameh) {
        return request.employee === SAMAH_EMPLOYEE_NAME
      }
      if (isMishaal) {
        return request.employee === MISHAAL_EMPLOYEE_NAME
      }
      return true
    })
    return (
      <div className="dashboard">
        <div className="page-logo">
          <img src="/لوجو فقط png.png" alt="شعار الشركة" className="app-logo" />

        </div>
        <header className="dashboard-header">
          <div className="oda-header-title">
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="back-icon-button"
              aria-label="رجوع لقائمة العهد"
            >
              ←
            </button>
            <h1>طلبات العهدة</h1>
          </div>
        </header>

        <section className="card oda-requests">
          <h2>طلبات العهدة الجديدة</h2>
          <table className="oda-table">
            <thead>
              <tr>
                <th>رقم العهدة</th>
                <th>الموظف</th>
                <th>تاريخ الطلب</th>
                <th>مبلغ العهدة الجديدة (ريال)</th>
                <th>رصيد الإقفال السابق (ريال)</th>
                <th>المبلغ المراد تحويله (ريال)</th>
                <th>حالة الطلب</th>
                {isDoctorSaud && <th>إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {filteredOdaRequests.length === 0 ? (
                <tr>
                  <td colSpan={isDoctorSaud ? 8 : 7}>لا توجد طلبات عهدة مسجلة حالياً</td>
                </tr>
              ) : (
                filteredOdaRequests.map((request) => (
                  <tr key={request._id || request.odaId}>
                    <td>{request.odaId}</td>
                    <td>{request.employee}</td>
                    <td>{request.requestDate}</td>
                    <td>{request.newAmount.toLocaleString('ar-SA')}</td>
                    <td>{request.previousClosingBalance.toLocaleString('ar-SA')}</td>
                    <td>{request.transferAmount.toLocaleString('ar-SA')}</td>
                    <td>{request.status || 'معلقة'}</td>
                    {isDoctorSaud && (
                      <td>
                        {request.status === 'معلقة' ? (
                          <div className="invoice-actions-cell">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleApproveOdaRequest(request.odaId)}
                            >
                              قبول
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleRejectOdaRequest(request.odaId)}
                            >
                              رفض
                            </button>
                          </div>
                        ) : (
                          '-' 
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    )
  }

  const filteredOdas = odas.filter((oda) => {
    if (oda.status === 'معلقة' || oda.status === 'مرفوضة') {
      return false
    }

    if (isMishaal) {
      return oda.employee === MISHAAL_EMPLOYEE_NAME
    }

    if (odaEmployeeFilter === 'sameh') {
      return oda.employee === SAMAH_EMPLOYEE_NAME
    }
    if (odaEmployeeFilter === 'mishaal') {
      return oda.employee === MISHAAL_EMPLOYEE_NAME
    }
    return true
  })

  const displayedOdas = [...filteredOdas].sort((first, second) => {
    if (first.id < second.id) {
      return -1
    }
    if (first.id > second.id) {
      return 1
    }
    return 0
  })

  return (
    <div className="dashboard">
      <div className="page-logo">
        <img src="/لوجو فقط png.png" alt="شعار الشركة" className="app-logo" />
        <button
          type="button"
          className="secondary-button"
          onClick={handleLogout}
        >
          تسجيل الخروج
        </button>
      </div>
      <header className="dashboard-header">
        <h1>عهد الموظفين</h1>
        <div className="dashboard-header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setView('odaRequests')}
          >
            طلبات العهدة
          </button>
          {!isDoctorSaud && !hasPendingOdaRequestForCurrentUser && (
            <button
              type="button"
              className="primary-button"
              onClick={() => setView('newOda')}
            >
              طلب عهدة جديدة
            </button>
          )}
        </div>
      </header>

      <section className="card oda-list-card">
        <div className="oda-list-header">
          <h2>قائمة العهد الحالية</h2>
          {!isMishaal && (
            <div className="oda-filter-buttons">
              <button
                type="button"
                className={`secondary-button ${odaEmployeeFilter === 'all' ? 'oda-filter-button-active' : ''}`}
                onClick={() => setOdaEmployeeFilter('all')}
              >
                كل العهد
              </button>
              <button
                type="button"
                className={`secondary-button ${odaEmployeeFilter === 'sameh' ? 'oda-filter-button-active' : ''}`}
                onClick={() => setOdaEmployeeFilter('sameh')}
              >
                عهدة المهندس سامح
              </button>
              <button
                type="button"
                className={`secondary-button ${odaEmployeeFilter === 'mishaal' ? 'oda-filter-button-active' : ''}`}
                onClick={() => setOdaEmployeeFilter('mishaal')}
              >
                عهدة الأستاذ مشعل
              </button>
            </div>
          )}
        </div>
        {isLoading && <p>جاري تحميل البيانات من الخادم...</p>}
        <table className="oda-table">
          <thead>
            <tr>
              <th>رقم العهدة</th>
              <th>الموظف</th>
              <th>تاريخ بداية العهدة</th>
              <th>القيمة (ريال)</th>
              <th>الرصيد الحالي (ريال)</th>
              <th>رصيد الإقفال (ريال)</th>
              <th>الحالة</th>
              <th>تاريخ إغلاق العهدة</th>
            </tr>
          </thead>
          <tbody>
            {displayedOdas.map((oda, index) => {
              const displayId =
                odaEmployeeFilter === 'all' ? oda.id : index + 1

              return (
                <tr
                  key={oda.id}
                  className="clickable-row"
                  onClick={() => handleOpenOdaDetails(oda.id)}
                >
                  <td>{displayId}</td>
                  <td>{oda.employee}</td>
                  <td>{oda.startDate}</td>
                  <td>{oda.amount.toLocaleString('ar-SA')}</td>
                  <td>{oda.currentBalance.toLocaleString('ar-SA')}</td>
                  <td>{oda.closingBalance.toLocaleString('ar-SA')}</td>
                  <td>{oda.status}</td>
                  <td>{oda.closingDate || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export default App
