export default function NewOdaPage({
	nextId,
	newAmount,
	newOdaError,
	onChangeAmount,
	onSubmit,
	onBack,
  onLogout,
  isSubmitting,
}) {
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
            aria-label="رجوع"
          >
            ←
          </button>
				  <h1>طلب عهدة جديدة</h1>
        </div>
			</header>

			<section className="card new-oda-form">
				<form onSubmit={onSubmit}>
					<div className="form-row">
						<label>رقم العهدة</label>
						<input type="text" value={nextId} readOnly />
					</div>

					<div className="form-row">
						<label>مبلغ العهدة </label>
						<input
							type="number"
							min="0"
							step="0.01"
							value={newAmount}
							onChange={(event) => onChangeAmount(event.target.value)}
							required
						/>
					</div>

					{newOdaError && <p className="oda-error">{newOdaError}</p>}

					<div className="form-actions">
						<button type="submit" className="primary-button" disabled={isSubmitting}>
							حفظ العهدة
						</button>
					</div>
				</form>
			</section>
		</div>
	)
}
