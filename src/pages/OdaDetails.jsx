export default function OdaDetailsPage({
	currentOda,
	odaInvoices,
	spentAmount,
  replacementTotal,
	canAddInvoice,
	nextInvoiceId,
	invoiceName,
	invoiceDescription,
	invoiceAmount,
	invoiceProjectName,
	invoiceDate,
  invoiceFile,
	isInvoiceModalOpen,
	onChangeInvoiceName,
	onChangeInvoiceDescription,
	onChangeInvoiceAmount,
	onChangeInvoiceProjectName,
	onChangeInvoiceDate,
	onChangeInvoiceFile,
	onToggleInvoiceModal,
	onAddInvoice,
  onToggleReplacementModal,
  isReplacementModalOpen,
  replacementName,
  replacementDescription,
  replacementAmount,
  replacementProjectName,
  replacementDate,
  replacementFile,
  onChangeReplacementName,
  onChangeReplacementDescription,
  onChangeReplacementAmount,
  onChangeReplacementProjectName,
  onChangeReplacementDate,
  onChangeReplacementFile,
  onAddReplacement,
  isEditInvoiceModalOpen,
  editingInvoice,
  editInvoiceName,
  editInvoiceDescription,
  editInvoiceAmount,
  editInvoiceProjectName,
  editInvoiceDate,
  editInvoiceFile,
  onOpenEditInvoice,
  onChangeEditInvoiceName,
  onChangeEditInvoiceDescription,
  onChangeEditInvoiceAmount,
  onChangeEditInvoiceProjectName,
  onChangeEditInvoiceDate,
  onChangeEditInvoiceFile,
  onUpdateInvoice,
  onCloseEditInvoice,
	onBack,
	apiBaseUrl,
  onLogout,
  isInvoiceSubmitting,
  isReplacementSubmitting,
  isUpdatingInvoice,
  editInvoiceError,
  invoiceFilter,
  onChangeInvoiceFilter,
}) {
	if (!currentOda) {
		return null
	}

	const totalWithReplacements = Number(currentOda.amount || 0) + Number(replacementTotal || 0)

	return (
		<div className="dashboard">
			<div className="page-logo">
				<img src="/لوجو فقط png.png" alt="شعار الشركة" className="app-logo" />
        {!isInvoiceModalOpen && !isReplacementModalOpen && !isEditInvoiceModalOpen && (
          <button type="button" className="secondary-button logout-button" onClick={onLogout}>
            تسجيل الخروج
          </button>
        )}
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
					<h1>تفاصيل العهدة رقم {currentOda.employeeOdaNumber || currentOda.id}</h1>
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
            <div className="summary-label">استعاضة نقدية</div>
            <div className="summary-value">
              {Number(replacementTotal || 0).toLocaleString('ar-SA')} ريال
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-label">الرصيد الإجمالي</div>
            <div className="summary-value">
              {totalWithReplacements.toLocaleString('ar-SA')} ريال
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
						<div className="summary-value">{currentOda.closingDate || '-'}</div>
					</div>
				</div>
			</section>

			<section className="card oda-invoices">
				<div className="oda-invoices-header">
					<h2>فواتير العهدة</h2>
          {canAddInvoice && (
            <div className="oda-actions">
              <button
                type="button"
                className="primary-button"
                onClick={onToggleInvoiceModal}
              >
                إضافة فاتورة
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onToggleReplacementModal}
              >
                استعاضة نقدية
              </button>
            </div>
          )}
				</div>
        <div className="oda-filter-buttons" style={{ marginBottom: '0.5rem' }}>
          <button
            type="button"
            className={`secondary-button ${invoiceFilter === 'all' ? 'oda-filter-button-active' : ''}`}
            onClick={() => onChangeInvoiceFilter('all')}
          >
            الكل
          </button>
          <button
            type="button"
            className={`secondary-button ${invoiceFilter === 'invoice' ? 'oda-filter-button-active' : ''}`}
            onClick={() => onChangeInvoiceFilter('invoice')}
          >
            الفواتير
          </button>
          <button
            type="button"
            className={`secondary-button ${invoiceFilter === 'replacement' ? 'oda-filter-button-active' : ''}`}
            onClick={() => onChangeInvoiceFilter('replacement')}
          >
            الاستعاضة
          </button>
        </div>

        <div className="oda-table-wrapper">
  				<table className="oda-table">
					<thead>
						<tr>
							<th>رقم الفاتورة</th>
							<th>اسم الفاتورة</th>
							<th>تاريخ الفاتورة</th>
							<th>المبلغ </th>
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
								const hasFile = Boolean(invoice.fileName || invoice.fileUrl)
								const viewUrl = hasFile
									? `${apiBaseUrl}/invoices/view/${invoice.odaId}/${invoice.id}`
									: ''
                

								const handleView = (event) => {
									event.stopPropagation()
									if (!hasFile) {
										return
									}
									window.open(viewUrl, '_blank', 'noopener,noreferrer')
								}

                

								return (
									<tr
                    key={`${invoice.odaId}-${invoice.kind}-${invoice.id}`}
                    onClick={() => {
                      if (canAddInvoice) {
                        onOpenEditInvoice(invoice)
                      }
                    }}
                    style={{ cursor: canAddInvoice ? 'pointer' : 'default' }}
                  >
										<td>{invoice.id}</td>
										<td>
                      {invoice.name}
                      {invoice.kind === 'replacement' && (
                        <span className="type-badge type-badge-replacement">استعاضة</span>
                      )}
                    </td>
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
												👁
											</button>
                      
										</td>
									</tr>
								)
							})
						)}
					</tbody>
  				</table>
        </div>
			</section>

			{isInvoiceModalOpen && (
				<div className="modal-backdrop">
					<div className="modal oda-invoices">
						<h3>إضافة فاتورة جديدة</h3>
						<form onSubmit={onAddInvoice} className="invoice-form">
							<div className="form-row">
								<label>رقم الفاتورة</label>
								<input type="text" value={nextInvoiceId} readOnly />
							</div>
							<div className="form-row">
								<label>اسم الفاتورة</label>
								<input
									type="text"
									value={invoiceName}
									onChange={(event) => onChangeInvoiceName(event.target.value)}
									required
								/>
							</div>
							<div className="form-row">
								<label>الوصف</label>
								<input
									type="text"
									value={invoiceDescription}
									onChange={(event) => onChangeInvoiceDescription(event.target.value)}
								/>
							</div>
							<div className="form-row">
								<label>المبلغ </label>
								<input
									type="number"
									min="0"
									step="0.01"
									value={invoiceAmount}
									onChange={(event) => onChangeInvoiceAmount(event.target.value)}
									required
								/>
							</div>
							<div className="form-row">
								<label>اسم المشروع</label>
								<input
									type="text"
									value={invoiceProjectName}
									onChange={(event) => onChangeInvoiceProjectName(event.target.value)}
								/>
							</div>
							<div className="form-row">
								<label>تاريخ الفاتورة</label>
								<input
									type="date"
									value={invoiceDate}
									onChange={(event) => onChangeInvoiceDate(event.target.value)}
								/>
							</div>
							<div className="form-row form-row-full">
								<label>مستند الفاتورة (PDF أو صورة)</label>
								<div className="document-actions">
									<input
										type="file"
										accept="application/pdf,image/*"
										className="hidden-file-input"
										id="file-picker-input"
										onChange={async (event) => {
											const file = event.target.files && event.target.files[0]
											if (!file) {
												return
											}
											onChangeInvoiceFile(file)
										}}
									/>
									
									<button
										type="button"
										className="secondary-button"
										onClick={() => {
											const el = document.getElementById('file-picker-input')
											if (el) {
												el.click()
											}
										}}
									>
										اختيار ملف
									</button>
                  <span className="file-name-indicator">
                    {invoiceFile ? `الملف المختار: ${invoiceFile.name}` : 'لم يتم اختيار ملف بعد'}
                  </span>
								</div>
							</div>
							<div className="modal-actions modal-actions-cancel">
								<button
									type="button"
									className="secondary-button"
									onClick={onToggleInvoiceModal}
								>
									إلغاء
								</button>
							</div>
							<div className="modal-actions modal-actions-save">
								<button type="submit" className="primary-button" disabled={isInvoiceSubmitting}>
									حفظ الفاتورة
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
      {isEditInvoiceModalOpen && editingInvoice && (
        <div className="modal-backdrop">
          <div className="modal oda-invoices">
            <h3>تعديل الفاتورة</h3>
            <form onSubmit={onUpdateInvoice} className="invoice-form">
              <div className="form-row">
                <label>رقم الفاتورة</label>
                <input type="text" value={editingInvoice.id} readOnly />
              </div>
              <div className="form-row">
                <label>اسم الفاتورة</label>
                <input
                  type="text"
                  value={editInvoiceName}
                  onChange={(event) => onChangeEditInvoiceName(event.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label>الوصف</label>
                <input
                  type="text"
                  value={editInvoiceDescription}
                  onChange={(event) => onChangeEditInvoiceDescription(event.target.value)}
                />
              </div>
              <div className="form-row">
                <label>المبلغ </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editInvoiceAmount}
                  onChange={(event) => onChangeEditInvoiceAmount(event.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label>اسم المشروع</label>
                <input
                  type="text"
                  value={editInvoiceProjectName}
                  onChange={(event) => onChangeEditInvoiceProjectName(event.target.value)}
                />
              </div>
              <div className="form-row">
                <label>تاريخ الفاتورة</label>
                <input
                  type="date"
                  value={editInvoiceDate}
                  onChange={(event) => onChangeEditInvoiceDate(event.target.value)}
                />
              </div>
              <div className="form-row form-row-full">
                <label>مستند الفاتورة (اختياري)</label>
                <div className="document-actions">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden-file-input"
                    id="edit-file-input"
                    onChange={async (event) => {
                      const file = event.target.files && event.target.files[0]
                      if (!file) {
                        return
                      }
                      onChangeEditInvoiceFile(file)
                    }}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      const el = document.getElementById('edit-file-input')
                      if (el) {
                        el.click()
                      }
                    }}
                  >
                    اختيار ملف جديد
                  </button>
                  <span className="file-name-indicator">
                    {editInvoiceFile ? `الملف المختار: ${editInvoiceFile.name}` : 'اختياري'}
                  </span>
                </div>
              </div>
              {editInvoiceError && (
                <div className="oda-error">{editInvoiceError}</div>
              )}
              <div className="modal-actions modal-actions-cancel">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onCloseEditInvoice}
                >
                  إلغاء
                </button>
              </div>
              <div className="modal-actions modal-actions-save">
                <button type="submit" className="primary-button" disabled={isUpdatingInvoice}>
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isReplacementModalOpen && (
        <div className="modal-backdrop">
          <div className="modal oda-invoices">
            <h3>استعاضة نقدية</h3>
            <form onSubmit={onAddReplacement} className="invoice-form">
              <div className="form-row">
                <label>رقم الاستعاضة</label>
                <input type="text" value={nextInvoiceId} readOnly />
              </div>
              <div className="form-row">
                <label>اسم الاستعاضة</label>
                <input
                  type="text"
                  value={replacementName}
                  onChange={(event) => onChangeReplacementName(event.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label>الوصف</label>
                <input
                  type="text"
                  value={replacementDescription}
                  onChange={(event) => onChangeReplacementDescription(event.target.value)}
                />
              </div>
              <div className="form-row">
                <label>المبلغ </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={replacementAmount}
                  onChange={(event) => onChangeReplacementAmount(event.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label>اسم المشروع</label>
                <input
                  type="text"
                  value={replacementProjectName}
                  onChange={(event) => onChangeReplacementProjectName(event.target.value)}
                />
              </div>
              <div className="form-row">
                <label>تاريخ العملية</label>
                <input
                  type="date"
                  value={replacementDate}
                  onChange={(event) => onChangeReplacementDate(event.target.value)}
                />
              </div>
              <div className="form-row form-row-full">
                <label>مستند العملية (اختياري)</label>
                <div className="document-actions">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden-file-input"
                    id="replacement-file-input"
                    onChange={async (event) => {
                      const file = event.target.files && event.target.files[0]
                      if (!file) {
                        return
                      }
                      onChangeReplacementFile(file)
                    }}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      const el = document.getElementById('replacement-file-input')
                      if (el) {
                        el.click()
                      }
                    }}
                  >
                    اختيار ملف
                  </button>
                  <span className="file-name-indicator">
                    {replacementFile ? `الملف المختار: ${replacementFile.name}` : 'اختياري'}
                  </span>
                </div>
              </div>
              <div className="modal-actions modal-actions-cancel">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onToggleReplacementModal}
                >
                  إلغاء
                </button>
              </div>
              <div className="modal-actions modal-actions-save">
                <button type="submit" className="primary-button" disabled={isReplacementSubmitting}>
                  حفظ الاستعاضة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
		</div>
	)
}

 
