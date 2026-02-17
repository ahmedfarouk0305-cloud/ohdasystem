import { useEffect, useState } from 'react'
import './App.css'
import LoginPage from './pages/Login'
import VerifyCodePage from './pages/VerifyCode'
import OdaDetailsPage from './pages/OdaDetails'
import NewOdaPage from './pages/NewOda'
import OdaRequestsPage from './pages/OdaRequests'
import DashboardPage from './pages/Dashboard'

const initialOdas = []

const initialInvoices = []

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '')
const SAMAH_EMPLOYEE_NAME = 'مهندس سامح حافظ'
const MISHAAL_EMPLOYEE_NAME = 'استاذ مشعل العصيمي'

function App() {
	const [odas, setOdas] = useState(initialOdas)
	const [view, setView] = useState('login')
	const [currentPath, setCurrentPath] = useState(typeof window !== 'undefined' ? window.location.pathname || '/' : '/')
  const [authToken, setAuthToken] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
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
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState('')
  const [newOdaSubmitting, setNewOdaSubmitting] = useState(false)
  const [isAddingInvoice, setIsAddingInvoice] = useState(false)

  const currentRole = currentUser ? currentUser.role || '' : ''

  const isDoctorSaud = currentRole === 'doctor'
  const isSameh = currentRole === 'engineer'
  const isMishaal = currentRole === 'manager'
  const isAccountant = currentRole === 'accountant'

	const hasPendingOdaRequestForCurrentUser = (() => {
		if (!currentUser) {
			return false
		}
		const employeeName = currentUser.fullName || currentUser.email
		return odaRequests.some((request) => {
			if (request.employee !== employeeName) {
				return false
			}
			const status = request.status || 'معلقة'
			return (
				status === 'معلقة' ||
				status === 'بانتظار مراجعة المحاسب' ||
				status === 'مقبولة من المحاسب'
			)
		})
	})()

  const getAuthHeaders = () => {
    const headers = {}
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }
    return headers
  }

  const employeeNameForNumber = currentUser ? (currentUser.fullName || currentUser.email) : ''
  const employeeOdas = employeeNameForNumber ? odas.filter((o) => o.employee === employeeNameForNumber) : []
  const usedNumbers = new Set(employeeOdas
    .filter((o) => String(o.status || '').startsWith('مرفوضة') === false)
    .map((o) => Number(o.employeeOdaNumber || 0))
    .filter((n) => n > 0))
  let nextId = 1
  while (usedNumbers.has(nextId)) {
    nextId += 1
  }

	const loadData = async () => {
    setIsLoading(true)
    try {
      const [odasResponse, invoicesResponse, odaRequestsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/odas`, { headers: { Accept: 'application/json' } }),
        fetch(`${API_BASE_URL}/invoices`, { headers: { Accept: 'application/json' } }),
        fetch(`${API_BASE_URL}/odas/requests`, { headers: { Accept: 'application/json' } }),
      ])

      if (odasResponse.ok) {
        const ct = odasResponse.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const odasData = await odasResponse.json()
          setOdas(odasData)
        }
      }

      if (invoicesResponse.ok) {
        const ct = invoicesResponse.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const invoicesData = await invoicesResponse.json()
          setInvoices(invoicesData)
        }
      }

      if (odaRequestsResponse.ok) {
        const ct = odaRequestsResponse.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const odaRequestsData = await odaRequestsResponse.json()
          setOdaRequests(odaRequestsData)
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

	const navigate = (path) => {
		if (typeof window !== 'undefined' && window.location.pathname !== path) {
			window.history.pushState({}, '', path)
		}
		setCurrentPath(path)
		if (path === '/login') {
			setView('login')
			return
		}
		if (path === '/verify-code') {
			setView('verifyCode')
			return
		}
		if (path === '/oda-requests') {
			setView('odaRequests')
			return
		}
		if (path === '/new-oda') {
      if (!(isSameh || isMishaal) || isDoctorSaud || isAccountant || hasPendingOdaRequestForCurrentUser) {
        setView('dashboard')
        return
      }
      setView('newOda')
      return
		}
		if (path.startsWith('/odas/')) {
			const idPart = path.slice('/odas/'.length)
			const parsedId = Number(idPart)
			if (!Number.isNaN(parsedId)) {
				setSelectedOdaId(parsedId)
				setView('odaDetails')
				return
			}
		}
		setView('dashboard')
	}

	useEffect(() => {
		try {
			const storedToken = window.localStorage.getItem('authToken')
			const storedUser = window.localStorage.getItem('authUser')

			if (storedToken && storedUser) {
				try {
					const parsedUser = JSON.parse(storedUser)
					setAuthToken(storedToken)
					setCurrentUser(parsedUser)
					loadData()
				} catch (parseError) {
					console.error(parseError)
					window.localStorage.removeItem('authToken')
					window.localStorage.removeItem('authUser')
				}
			}
			if (!storedToken || !storedUser) {
				navigate('/login')
			} else {
				navigate(currentPath || '/')
			}
		} catch (error) {
			console.error(error)
		}
	}, [])

	useEffect(() => {
		if (!globalThis.window) {
			return
		}
		const handlePopState = () => {
			const path = window.location.pathname || '/'
			setCurrentPath(path)
			if (!authToken || !currentUser) {
				setView('login')
				return
			}
			if (path === '/login') {
				setView('login')
				return
			}
			if (path === '/verify-code') {
				setView('verifyCode')
				return
			}
			if (path === '/oda-requests') {
				setView('odaRequests')
				return
			}
			if (path === '/new-oda') {
        if (!(isSameh || isMishaal) || isDoctorSaud || isAccountant || hasPendingOdaRequestForCurrentUser) {
          setView('dashboard')
          return
        }
        setView('newOda')
        return
			}
			if (path.startsWith('/odas/')) {
				const idPart = path.slice('/odas/'.length)
				const parsedId = Number(idPart)
				if (!Number.isNaN(parsedId)) {
					setSelectedOdaId(parsedId)
					setView('odaDetails')
					return
				}
			}
			setView('dashboard')
		}
		window.addEventListener('popstate', handlePopState)
		return () => {
			window.removeEventListener('popstate', handlePopState)
		}
	}, [authToken, currentUser])

  const safeJsonFetch = async (url, options = {}) => {
    const headers = { Accept: 'application/json', ...(options.headers || {}) }
    const res = await fetch(url, { ...options, headers })
    const ct = res.headers.get('content-type') || ''
    let data = null
    if (ct.includes('application/json')) {
      data = await res.json()
    }
    return { ok: res.ok, status: res.status, headers: res.headers, data, response: res }
  }

  const handleSendLoginCode = async (phoneNumber, purpose = 'login') => {
    try {
      const result = await safeJsonFetch(`${API_BASE_URL}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ phoneNumber, purpose }),
      })
      if (!result.ok) {
        return { ok: false }
      }
      setPendingPhoneNumber(String(phoneNumber))
      return { ok: true }
    } catch (error) {
      console.error(error)
      return { ok: false }
    }
  }

  const handleLoginWithCode = async (phoneNumber, code) => {
    try {
      const result = await safeJsonFetch(`${API_BASE_URL}/auth/login-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ phoneNumber, code }),
      })
      if (!result.ok) {
        return { ok: false }
      }
      const data = result.data || {}
      setAuthToken(data.token)
      setCurrentUser(data.user)
      try {
        window.localStorage.setItem('authToken', data.token)
        window.localStorage.setItem('authUser', JSON.stringify(data.user))
      } catch (error) {
        console.error(error)
      }
      navigate('/dashboard')
      await loadData()
      return { ok: true }
    } catch (error) {
      console.error(error)
      return { ok: false }
    }
  }

  const handleVerifyCodeSilent = async (phoneNumber, code) => {
    try {
      const result = await safeJsonFetch(`${API_BASE_URL}/auth/login-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ phoneNumber, code }),
      })
      if (!result.ok) {
        return { ok: false }
      }
      return { ok: true }
    } catch (error) {
      console.error(error)
      return { ok: false }
    }
  }

	const handleOpenOdaDetails = (id) => {
		setSelectedOdaId(id)
		navigate(`/odas/${id}`)
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
				navigate('/login')
      return
    }

    if (newOdaSubmitting) {
      return
    }

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
    }

    const employeeName = currentUser.fullName || currentUser.email

    try {
      setNewOdaSubmitting(true)
      const result = await safeJsonFetch(`${API_BASE_URL}/odas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          employee: employeeName,
          amount: amountNumber,
        }),
      })

      if (!result.ok) {
        let message = 'تعذر حفظ العهدة، تأكد من الاتصال وحاول مرة أخرى'
        const data = result.data
        if (data && typeof data.message === 'string' && data.message) {
          message = data.message
        }
        setNewOdaError(message)
        setNewOdaSubmitting(false)
        return
      }
      const data = result.data

      if (!data || !data.oda) {
				await loadData()
				setNewAmount('')
				navigate('/dashboard')
        setNewOdaSubmitting(false)
        return
      }

			await loadData()
			setNewAmount('')
			navigate('/oda-requests')
    } catch (error) {
      console.error(error)
      setNewOdaError('حدث خطأ أثناء الاتصال بالخادم عند حفظ العهدة')
    } finally {
      setNewOdaSubmitting(false)
    }
  }

	const handleLogout = () => {
    setAuthToken('')
    setCurrentUser(null)
    setSelectedOdaId(null)
		navigate('/login')
    try {
      window.localStorage.removeItem('authToken')
      window.localStorage.removeItem('authUser')
    } catch (error) {
      console.error(error)
    }
  }

	const handleApproveOdaRequest = async (odaId) => {
    try {
      const actionPath = isAccountant
        ? `${API_BASE_URL}/odas/${odaId}/accountant-approve`
        : `${API_BASE_URL}/odas/${odaId}/accept`

      const result = await safeJsonFetch(actionPath, {
        method: 'POST',
        headers: { Accept: 'application/json', ...getAuthHeaders() },
      })

      if (!result.ok) {
        return
      }

      await loadData()
    } catch (error) {
      console.error(error)
    }
  }

	const handleRejectOdaRequest = async (odaId) => {
    try {
      const actionPath = isAccountant
        ? `${API_BASE_URL}/odas/${odaId}/accountant-reject`
        : `${API_BASE_URL}/odas/${odaId}/reject`

      const result = await safeJsonFetch(actionPath, {
        method: 'POST',
        headers: { Accept: 'application/json', ...getAuthHeaders() },
      })

      if (!result.ok) {
        return
      }

      await loadData()
    } catch (error) {
      console.error(error)
    }
  }

	const handleAddInvoice = async (event) => {
    event.preventDefault()

    if (isDoctorSaud || isAccountant) {
      return
    }

    if (!selectedOdaId || !invoiceAmount || !invoiceName || !invoiceFile) {
      return
    }

    const amountNumber = Number(invoiceAmount)
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      return
    }

    if (isAddingInvoice) {
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

    setIsAddingInvoice(true)
    const result = await safeJsonFetch(`${API_BASE_URL}/invoices`, {
      method: 'POST',
      headers: { Accept: 'application/json', ...headers },
      body: formData,
    })

    if (!result.ok) {
      setIsAddingInvoice(false)
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
    setIsAddingInvoice(false)
  }

	if (view === 'login') {
		return (
			<LoginPage
        onSendCode={handleSendLoginCode}
        onOpenVerify={(phone) => {
          setPendingPhoneNumber(String(phone))
          navigate('/verify-code')
        }}
			/>
		)
	}

  if (view === 'verifyCode') {
    return (
      <VerifyCodePage
        phoneNumber={pendingPhoneNumber}
        onResend={(phone) => handleSendLoginCode(phone, 'login')}
        onConfirm={handleLoginWithCode}
        onBack={() => navigate('/login')}
      />
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
      !isDoctorSaud &&
      !isAccountant &&
			((isSameh && currentOda.employee === SAMAH_EMPLOYEE_NAME) ||
				(isMishaal && currentOda.employee === MISHAAL_EMPLOYEE_NAME) ||
				(!isSameh && !isMishaal))

		const lastInvoiceForOdaId = odaInvoices.length
			? odaInvoices[odaInvoices.length - 1].id
			: 0
		const nextInvoiceId = lastInvoiceForOdaId + 1

		const handleBack = () => {
			navigate('/dashboard')
		}

    const handleToggleInvoiceModal = () => {
      if (isDoctorSaud || isAccountant) {
        return
      }
			if (!isInvoiceModalOpen) {
				const today = new Date().toISOString().slice(0, 10)
				if (!invoiceDate) {
					setInvoiceDate(today)
				}
				setIsInvoiceModalOpen(true)
			} else {
				setIsInvoiceModalOpen(false)
			}
		}

		return (
			<OdaDetailsPage
				currentOda={currentOda}
				odaInvoices={odaInvoices}
				spentAmount={spentAmount}
				canAddInvoice={canAddInvoice}
				nextInvoiceId={nextInvoiceId}
				invoiceName={invoiceName}
				invoiceDescription={invoiceDescription}
				invoiceAmount={invoiceAmount}
				invoiceProjectName={invoiceProjectName}
				invoiceDate={invoiceDate}
				invoiceFile={invoiceFile}
				isInvoiceModalOpen={isInvoiceModalOpen}
				onChangeInvoiceName={setInvoiceName}
				onChangeInvoiceDescription={setInvoiceDescription}
				onChangeInvoiceAmount={setInvoiceAmount}
				onChangeInvoiceProjectName={setInvoiceProjectName}
				onChangeInvoiceDate={setInvoiceDate}
				onChangeInvoiceFile={setInvoiceFile}
				onToggleInvoiceModal={handleToggleInvoiceModal}
				onAddInvoice={handleAddInvoice}
				onBack={handleBack}
				serverBaseUrl={SERVER_BASE_URL}
				apiBaseUrl={API_BASE_URL}
        isInvoiceSubmitting={isAddingInvoice}
        onLogout={handleLogout}
			/>
		)
	}

	if (view === 'newOda') {
		const handleBack = () => {
			navigate('/dashboard')
		}

		return (
			<NewOdaPage
				nextId={nextId}
				newAmount={newAmount}
				newOdaError={newOdaError}
				onChangeAmount={setNewAmount}
				onSubmit={handleCreateOda}
				onBack={handleBack}
        isSubmitting={newOdaSubmitting}
        onLogout={handleLogout}
			/>
		)
	}

	if (view === 'odaRequests') {
		return (
			<OdaRequestsPage
				odaRequests={odaRequests}
				isDoctorSaud={isDoctorSaud}
				isAccountant={isAccountant}

				isSameh={isSameh}
				isMishaal={isMishaal}
				onApprove={handleApproveOdaRequest}
				onReject={handleRejectOdaRequest}
				onBack={() => navigate('/dashboard')}
        onSendCode={(phone) => handleSendLoginCode(phone, 'approval')}
        onVerifyCode={handleVerifyCodeSilent}
        accountantPhone={currentUser && currentUser.phoneNumber ? String(currentUser.phoneNumber) : ''}
        onLogout={handleLogout}
			/>
		)
	}

  const filteredOdas = odas.filter((oda) => {
    const status = String(oda.status || '')
    if (status === 'معلقة' || status.startsWith('مرفوضة')) {
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
		<DashboardPage
			displayedOdas={displayedOdas}
			isDoctorSaud={isDoctorSaud}
      isSameh={isSameh}
			isMishaal={isMishaal}
			isLoading={isLoading}
			hasPendingOdaRequestForCurrentUser={hasPendingOdaRequestForCurrentUser}
			odaEmployeeFilter={odaEmployeeFilter}
			onChangeFilter={setOdaEmployeeFilter}
			onOpenOdaDetails={handleOpenOdaDetails}
			onLogout={handleLogout}
			onOpenRequests={() => navigate('/oda-requests')}
			onOpenNewOda={() => navigate('/new-oda')}
		/>
	)
}

export default App
