import { useEffect, useMemo, useRef, useState } from 'react'
import '../App.css'

export default function VerifyCodePage({
  phoneNumber,
  onResend,
  onConfirm,
  onBack,
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [isError, setIsError] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const inputsRef = useRef([])
  const isSubmittingRef = useRef(false)
  const code = useMemo(() => digits.join(''), [digits])
  const isReady = code.length === 6 && /^\d{6}$/.test(code)
  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus()
    }
  }, [])
  useEffect(() => {
    if (resendCountdown <= 0) {
      return
    }
    const id = setTimeout(() => {
      setResendCountdown((v) => (v > 0 ? v - 1 : 0))
    }, 1000)
    return () => clearTimeout(id)
  }, [resendCountdown])

  const focusFirstEmpty = () => {
    const idx = digits.findIndex((d) => !d)
    if (idx >= 0 && inputsRef.current[idx]) {
      inputsRef.current[idx].focus()
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
      if (nextCode.length === 6 && onConfirm && phoneNumber && !isSubmittingRef.current) {
        isSubmittingRef.current = true
        Promise.resolve(onConfirm(phoneNumber, nextCode))
          .then((result) => {
            if (!result || !result.ok) {
              setIsError(true)
            }
          })
          .catch(() => {
            setIsError(true)
          })
          .finally(() => {
            isSubmittingRef.current = false
          })
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
      inputsRef.current[lastIndex].focus()
    }
    const nextCode = next.join('')
    if (nextCode.length === 6 && onConfirm && phoneNumber && !isSubmittingRef.current) {
      isSubmittingRef.current = true
      Promise.resolve(onConfirm(phoneNumber, nextCode))
        .then((result) => {
          if (!result || !result.ok) {
            setIsError(true)
          }
        })
        .catch(() => {
          setIsError(true)
        })
        .finally(() => {
          isSubmittingRef.current = false
        })
    }
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
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
      }
    }
    if (event.key === 'ArrowLeft' && index > 0 && inputsRef.current[index - 1]) {
      inputsRef.current[index - 1].focus()
    }
    if (event.key === 'ArrowRight' && index < 5 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1].focus()
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" dir="rtl">
        <div className="login-header verify-header">
          <button
            type="button"
            className="back-icon-button"
            aria-label="الرجوع"
            onClick={() => {
              if (onBack) onBack()
            }}
          >
            ←
          </button>
          <h1>التحقق من الرمز</h1>
        </div>
        <div className="otp-inputs">
          {digits.map((d, idx) => (
            <input
              key={idx}
              type="text"
              inputMode="numeric"
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              enterKeyHint="done"
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
        <div className="verify-actions-column">
          <button
            type="button"
            className="primary-button verify-confirm"
            disabled={!isReady}
            onClick={async () => {
              if (onConfirm && phoneNumber) {
                const result = await onConfirm(phoneNumber, code)
                if (!result || !result.ok) {
                  setIsError(true)
                  return
                }
              }
            }}
          >
            تأكيد
          </button>
          <button
            type="button"
            className="secondary-button verify-resend"
            disabled={resendCountdown > 0}
            onClick={async () => {
              if (onResend && phoneNumber) {
                await onResend(phoneNumber)
              }
              setResendCountdown(30)
            }}
          >
            {resendCountdown > 0 ? `إعادة إرسال (${resendCountdown})` : 'إعادة إرسال'}
          </button>
        </div>
      </div>
    </div>
  )
}
