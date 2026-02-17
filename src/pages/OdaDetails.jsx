export default function OdaDetailsPage({
	currentOda,
	odaInvoices,
	spentAmount,
	canAddInvoice,
	nextInvoiceId,
	invoiceName,
	invoiceDescription,
	invoiceAmount,
	invoiceProjectName,
	invoiceDate,
	isInvoiceModalOpen,
	onChangeInvoiceName,
	onChangeInvoiceDescription,
	onChangeInvoiceAmount,
	onChangeInvoiceProjectName,
	onChangeInvoiceDate,
	onChangeInvoiceFile,
	onToggleInvoiceModal,
	onAddInvoice,
	onBack,
	serverBaseUrl,
	apiBaseUrl,
  onLogout,
}) {
	if (!currentOda) {
		return null
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
						<button
							type="button"
							className="primary-button"
							onClick={onToggleInvoiceModal}
						>
							إضافة فاتورة
						</button>
					)}
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
								const hasFile = Boolean(invoice.fileName)
								const fileUrl = hasFile
									? `${serverBaseUrl}/uploads/${invoice.fileName}`
									: ''
								const downloadUrl = `${apiBaseUrl}/invoices/${invoice.id}/download`

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
										accept="image/*"
										capture="environment"
										className="hidden-file-input"
										id="camera-file-input"
										onChange={async (event) => {
											const file = event.target.files && event.target.files[0]
											if (!file) {
												return
											}
											const imageBitmap = await createImageBitmap(file)
											const cropped = await autoCropImage(imageBitmap)
											const jpegBlob = await canvasToJpegBlob(cropped, 0.92)
											const pdfBlob = generatePdfFromJpegBlob(jpegBlob, cropped.width, cropped.height)
											const pdfFile = new File([pdfBlob], `invoice_${Date.now()}.pdf`, { type: 'application/pdf' })
											onChangeInvoiceFile(pdfFile)
										}}
									/>
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
											if (file.type === 'application/pdf') {
												onChangeInvoiceFile(file)
												return
											}
											const imageBitmap = await createImageBitmap(file)
											const cropped = await autoCropImage(imageBitmap)
											const jpegBlob = await canvasToJpegBlob(cropped, 0.92)
											const pdfBlob = generatePdfFromJpegBlob(jpegBlob, cropped.width, cropped.height)
											const pdfFile = new File([pdfBlob], `invoice_${Date.now()}.pdf`, { type: 'application/pdf' })
											onChangeInvoiceFile(pdfFile)
										}}
									/>
									<button
										type="button"
										className="secondary-button mobile-only"
										onClick={() => {
											const el = document.getElementById('camera-file-input')
											if (el) {
												el.click()
											}
										}}
									>
										التقاط بالكاميرا
									</button>
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

function autoCropImage(imageBitmap) {
	const maxSide = Math.max(imageBitmap.width, imageBitmap.height)
	const scale = maxSide > 1280 ? 1280 / maxSide : 1
	const targetW = Math.round(imageBitmap.width * scale)
	const targetH = Math.round(imageBitmap.height * scale)
	const work = document.createElement('canvas')
	work.width = targetW
	work.height = targetH
	const ctx = work.getContext('2d')
	ctx.drawImage(imageBitmap, 0, 0, targetW, targetH)
	const data = ctx.getImageData(0, 0, targetW, targetH)
	const buf = data.data
	let minX = targetW, minY = targetH, maxX = 0, maxY = 0, count = 0
	for (let y = 1; y < targetH - 1; y++) {
		for (let x = 1; x < targetW - 1; x++) {
			const iL = (y * targetW + (x - 1)) * 4
			const iR = (y * targetW + (x + 1)) * 4
			const iT = ((y - 1) * targetW + x) * 4
			const iB = ((y + 1) * targetW + x) * 4
			const gL = (buf[iL] * 0.299 + buf[iL + 1] * 0.587 + buf[iL + 2] * 0.114)
			const gR = (buf[iR] * 0.299 + buf[iR + 1] * 0.587 + buf[iR + 2] * 0.114)
			const gT = (buf[iT] * 0.299 + buf[iT + 1] * 0.587 + buf[iT + 2] * 0.114)
			const gB = (buf[iB] * 0.299 + buf[iB + 1] * 0.587 + buf[iB + 2] * 0.114)
			const gx = Math.abs(gR - gL)
			const gy = Math.abs(gB - gT)
			const mag = gx + gy
			if (mag > 24) {
				if (x < minX) minX = x
				if (x > maxX) maxX = x
				if (y < minY) minY = y
				if (y > maxY) maxY = y
				count++
			}
		}
	}
	if (count < (targetW * targetH * 0.002)) {
		const pad = Math.round(Math.min(targetW, targetH) * 0.05)
		minX = pad
		minY = pad
		maxX = targetW - pad
		maxY = targetH - pad
	}
	const cropW = Math.max(1, maxX - minX)
	const cropH = Math.max(1, maxY - minY)
	const out = document.createElement('canvas')
	out.width = cropW
	out.height = cropH
	const outCtx = out.getContext('2d')
	outCtx.drawImage(work, minX, minY, cropW, cropH, 0, 0, cropW, cropH)
	return out
}

function canvasToJpegBlob(canvas, quality) {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
	})
}

function generatePdfFromJpegBlob(jpegBlob, width, height) {
	const reader = new FileReader()
	return new Promise((resolve) => {
		reader.onload = () => {
			const bytes = new Uint8Array(reader.result)
			const w = width
			const h = height
			const header = []
			header.push('%PDF-1.4\n')
			const objects = []
			let offset = 0
			function push(str) {
				const enc = new TextEncoder().encode(str)
				objects.push(enc)
				offset += enc.length
			}
			function pushBin(bin) {
				objects.push(bin)
				offset += bin.length
			}
			const offsets = []
			offsets.push(offset)
			push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
			offsets.push(offset)
			push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
			offsets.push(offset)
			push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`)
			offsets.push(offset)
			push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`)
			pushBin(bytes)
			push('\nendstream\nendobj\n')
			offsets.push(offset)
			const contentStream = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`
			push(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`)
			const xrefStart = offset
			let xrefTable = 'xref\n0 6\n0000000000 65535 f \n'
			for (let i = 0; i < offsets.length; i++) {
				const n = String(offsets[i]).padStart(10, '0')
				xrefTable += `${n} 00000 n \n`
			}
			const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
			const allParts = []
			allParts.push(new TextEncoder().encode(header.join('')))
			for (const part of objects) {
				allParts.push(part)
			}
			allParts.push(new TextEncoder().encode(xrefTable))
			allParts.push(new TextEncoder().encode(trailer))
			let total = 0
			for (const part of allParts) total += part.length
			const pdfBytes = new Uint8Array(total)
			let p = 0
			for (const part of allParts) {
				pdfBytes.set(part, p)
				p += part.length
			}
			resolve(new Blob([pdfBytes], { type: 'application/pdf' }))
		}
		reader.readAsArrayBuffer(jpegBlob)
	})
}
