import { useEffect, useMemo, useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCircleCheck, faCircleXmark, faXmark } from "@fortawesome/free-solid-svg-icons"
const byPrefixAndName = {
  fas: {
    'circle-check': faCircleCheck,
    'circle-xmark': faCircleXmark,
    'xmark': faXmark,
  },
}
	export default function OdaRequestsPage({
		odaRequests,
		isDoctorSaud,
		isAccountant,
		isSameh,
		isMishaal,
		onApprove,
		onReject,
		onSendCode,
		onVerifyCode,
		accountantPhone,
		onBack,
    onLogout,
	}) {
		const filteredOdaRequests = odaRequests.filter((request) => {
		if (isDoctorSaud || isAccountant) {
			return true
		}
		if (isSameh) {
			return request.employee === 'مهندس سامح حافظ'
		}
		if (isMishaal) {
			return request.employee === 'استاذ مشعل العصيمي'
		}
		return true
	})

	const [otpOpen, setOtpOpen] = useState(false)
	const [otpAction, setOtpAction] = useState(null)
	const [targetOdaId, setTargetOdaId] = useState(null)
	const [digits, setDigits] = useState(['', '', '', '', '', ''])
	const [isError, setIsError] = useState(false)
	const [resendCountdown, setResendCountdown] = useState(0)
	const inputsRef = useRef([])
	const isSubmittingRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
	const code = useMemo(() => digits.join(''), [digits])
	const isReady = code.length === 6 && /^\d{6}$/.test(code)

	useEffect(() => {
		if (otpOpen && inputsRef.current[0]) {
			inputsRef.current[0].focus()
		}
	}, [otpOpen])
	useEffect(() => {
		if (resendCountdown <= 0) {
			return
		}
		const id = setTimeout(() => {
			setResendCountdown((v) => (v > 0 ? v - 1 : 0))
		}, 1000)
		return () => clearTimeout(id)
	}, [resendCountdown])

	const openOtp = async (action, odaId) => {
		setOtpAction(action)
		setTargetOdaId(odaId)
		setDigits(['', '', '', '', '', ''])
		setIsError(false)
		setOtpOpen(true)
    if (onSendCode && accountantPhone) {
      await onSendCode(accountantPhone, 'approval')
		}
	}

	const closeOtp = () => {
		setOtpOpen(false)
		setOtpAction(null)
		setTargetOdaId(null)
		setDigits(['', '', '', '', '', ''])
		setIsError(false)
	}

	const tryVerifyAndExecute = async (currentCode) => {
		if (!isReady || !onVerifyCode || !accountantPhone || isSubmittingRef.current) {
			return
		}
		isSubmittingRef.current = true
    setIsSubmitting(true)
		const result = await onVerifyCode(accountantPhone, currentCode)
		if (!result || !result.ok) {
			setIsError(true)
			isSubmittingRef.current = false
      setIsSubmitting(false)
			return
		}
		if (otpAction === 'approve' && onApprove && targetOdaId != null) {
			await onApprove(targetOdaId)
		} else if (otpAction === 'reject' && onReject && targetOdaId != null) {
			await onReject(targetOdaId)
		}
		isSubmittingRef.current = false
    setIsSubmitting(false)
		closeOtp()
	}

	const focusFirstEmpty = () => {
		const idx = digits.findIndex((d) => !d)
		if (idx >= 0 && inputsRef.current[idx]) {
			(inputsRef.current[idx]).focus()
		}
	}
	const handleFocus = (index) => {
		if (!digits[index]) {
			focusFirstEmpty()
		}
	}

	const handleChange = (index, value) => {
		const v = String(value || '').replace(/\D/g, '')
		if (isError) {
			setIsError(false)
		}
		if (!v) {
			const next = [...digits]
			next[index] = ''
			setDigits(next)
			return
		}
		if (v.length === 1) {
			const next = [...digits]
			next[index] = v
			setDigits(next)
			if (index < 5 && inputsRef.current[index + 1]) {
				inputsRef.current[index + 1].focus()
			}
			const nextCode = next.join('')
			if (nextCode.length === 6) {
				tryVerifyAndExecute(nextCode)
			}
			return
		}
		const chars = v.slice(0, 6).split('')
		const next = [...digits]
		for (let i = 0; i < chars.length && i + index < 6; i++) {
			next[index + i] = chars[i]
		}
		setDigits(next)
		const lastIndex = Math.min(index + chars.length - 1, 5)
		if (inputsRef.current[lastIndex]) {
			(inputsRef.current[lastIndex]).focus()
		}
		const nextCode = next.join('')
		if (nextCode.length === 6) {
			tryVerifyAndExecute(nextCode)
		}
	}

	const handleKeyDown = (index, event) => {
		const key = event.key
		if (key === 'Backspace' || key === 'Delete') {
			event.preventDefault()
			const next = [...digits]
			if (next[index]) {
				next[index] = ''
				setDigits(next)
				return
			}
			if (index > 0 && inputsRef.current[index - 1]) {
				inputsRef.current[index - 1].focus()
				const prev = [...digits]
				prev[index - 1] = ''
				setDigits(prev)
				return
			}
			return
		}
		if (key === 'ArrowLeft' && index > 0 && inputsRef.current[index - 1]) {
			event.preventDefault()
			inputsRef.current[index - 1].focus()
			return
		}
		if (key === 'ArrowRight' && index < 5 && inputsRef.current[index + 1]) {
			event.preventDefault()
			inputsRef.current[index + 1].focus()
			return
		}
	}

	return (
		<div className="dashboard">
			<div className="page-logo">
				<img src="/لوجو فقط png.png" alt="شعار الشركة" className="app-logo" />
        <button type="button" className="secondary-button logout-button" onClick={onLogout}>
          تسجيل الخروج
        </button>
			</div>
			<header className="dashboard-header">
				<div className="oda-header-title">
					<button
						type="button"
						onClick={onBack}
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
        <div className="oda-table-wrapper">
				  <table className="oda-table">
					<thead>
						<tr>
							<th>رقم العهدة</th>
							<th>الموظف</th>
							<th>تاريخ الطلب</th>
							<th>مبلغ العهدة الجديدة </th>
							<th>رصيد الإقفال السابق </th>
							<th>المبلغ المراد تحويله </th>
							<th>حالة الطلب</th>
							{(isDoctorSaud || isAccountant) && <th>إجراءات</th>}
						</tr>
					</thead>
					<tbody>
						{filteredOdaRequests.length === 0 && (
							<tr>
								<td colSpan={isDoctorSaud || isAccountant ? 8 : 7}>
									لا توجد طلبات عهدة مسجلة حالياً
								</td>
							</tr>
						)}
						{filteredOdaRequests.length > 0 &&
							filteredOdaRequests.map((request) => (
								<tr key={request._id || request.odaId}>
									<td>{request.employeeOdaNumber || request.odaId}</td>
									<td>{request.employee}</td>
									<td>{request.requestDate}</td>
									<td>{request.newAmount.toLocaleString('ar-SA')}</td>
									<td>{request.previousClosingBalance.toLocaleString('ar-SA')}</td>
									<td>{request.transferAmount.toLocaleString('ar-SA')}</td>
									<td>{request.status || 'معلقة'}</td>
									{(isDoctorSaud || isAccountant) && (
										<td>
											{isAccountant &&
												request.status === 'بانتظار مراجعة المحاسب' && (
													<div className="invoice-actions-cell">
														<button
															type="button"
															className="icon-button icon-button-approve"
															onClick={() => openOtp('approve', request.odaId)}
															aria-label="قبول الطلب"
														>
															<FontAwesomeIcon icon={byPrefixAndName.fas['circle-check']} />
														</button>
														<button
															type="button"
															className="icon-button icon-button-reject"
															onClick={() => openOtp('reject', request.odaId)}
															aria-label="رفض الطلب"
														>
															<FontAwesomeIcon icon={byPrefixAndName.fas['circle-xmark']} />
														</button>
														</div>
												)}
											{isDoctorSaud &&
												request.status === 'مقبولة من المحاسب' && (
													<div className="invoice-actions-cell">
														<button
															type="button"
															className="icon-button icon-button-approve"
															onClick={() => openOtp('approve', request.odaId)}
															aria-label="قبول الطلب"
														>
															<FontAwesomeIcon icon={byPrefixAndName.fas['circle-check']} />
														</button>
														<button
															type="button"
															className="icon-button icon-button-reject"
															onClick={() => openOtp('reject', request.odaId)}
															aria-label="رفض الطلب"
														>
															<FontAwesomeIcon icon={byPrefixAndName.fas['circle-xmark']} />
														</button>
														</div>
												)}
											{!isAccountant && !isDoctorSaud && '-'}
											{(isAccountant || isDoctorSaud) &&
												!((isAccountant && request.status === 'بانتظار مراجعة المحاسب') ||
													(isDoctorSaud && request.status === 'مقبولة من المحاسب')) &&
												'-'}
										</td>
									)}
								</tr>
							))}
					</tbody>
				  </table>
        </div>
			</section>
			{otpOpen && (
				<div className="modal-backdrop">
					<div className="modal" dir="rtl">
            <div className="otp-modal-header">
              <h3 className="otp-modal-title">التحقق من الرمز</h3>
              <button
                type="button"
                className="modal-close-button"
                aria-label="إغلاق"
                onClick={closeOtp}
              >
                <FontAwesomeIcon icon={byPrefixAndName.fas['xmark']} />
              </button>
            </div>
						<div className="otp-inputs">
							{digits.map((d, idx) => (
								<input
									key={idx}
									type="text"
									inputMode="numeric"
									className={`otp-box${isError ? ' otp-box-error' : ''}`}
									value={d}
									onChange={(e) => handleChange(idx, e.target.value)}
									onKeyDown={(e) => handleKeyDown(idx, e)}
									onFocus={() => handleFocus(idx)}
									ref={(el) => (inputsRef.current[idx] = el)}
									placeholder="•"
								/>
							))}
						</div>
						<div className="otp-modal-actions">
							<button
								type="button"
								className="secondary-button"
                disabled={resendCountdown > 0 || isResending}
								onClick={async () => {
                  if (onSendCode && accountantPhone && !isResending) {
                    setIsResending(true)
                    try {
                      await onSendCode(accountantPhone)
                      setResendCountdown(30)
                    } finally {
                      setIsResending(false)
                    }
                  }
								}}
							>
								{resendCountdown > 0 ? `إعادة إرسال (${resendCountdown})` : 'إعادة إرسال'}
							</button>
							<button
								type="button"
								className="primary-button"
                disabled={!isReady || isSubmitting}
								onClick={() => tryVerifyAndExecute(code)}
							>
								تأكيد
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
