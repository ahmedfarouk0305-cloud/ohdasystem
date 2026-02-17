import { useState } from 'react'

export default function LoginPage({ onSendCode, onOpenVerify }) {
  const [phone, setPhone] = useState('')
  const [localError, setLocalError] = useState('')
  const canSendCode = /^05\d{8}$/.test(phone.trim())

  return (
    <div className="login-page">
      <div className="login-card" dir="rtl">
        <div className="login-brand">
          <img src="/لوجو فقط png.png" alt="شعار الشركة" className="login-logo" />
        </div>
        <div className="login-header">
          <h1>تسجيل الدخول</h1>
          <p className="login-subtitle">أدخل رقم الجوال لإرسال رمز التحقق</p>
        </div>
        <form className="login-form">
          <div className="form-row">
            <label>رقم الجوال</label>
            <input
              type="tel"
              className="login-phone-input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="05XXXXXXXX"
            />
          </div>
          <div className="login-phone-actions">
            <button
              type="button"
              className="primary-button login-send-code-button"
              disabled={!canSendCode}
              onClick={async () => {
                setLocalError('')
                const result = await (onSendCode ? onSendCode(phone) : Promise.resolve({ ok: false }))
                if (result && result.ok) {
                  if (onOpenVerify) {
                    onOpenVerify(phone)
                  }
                } else {
                  setLocalError('تعذر إرسال رمز التحقق، حاول مرة أخرى')
                }
              }}
            >
              إرسال رمز التحقق
            </button>
            {localError && <p className="login-error">{localError}</p>}
          </div>
        </form>
      </div>
    </div>
  )
}
