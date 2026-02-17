export default function DashboardPage({
	displayedOdas,
	isSameh,
	isMishaal,
	isLoading,
	hasPendingOdaRequestForCurrentUser,
	odaEmployeeFilter,
	onChangeFilter,
	onOpenOdaDetails,
	onLogout,
	onOpenRequests,
	onOpenNewOda,
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
				<h1>عهد الموظفين</h1>
				<div className="dashboard-header-actions">
					<button
						type="button"
						className="secondary-button"
						onClick={onOpenRequests}
					>
						طلبات العهدة
					</button>
					{(isSameh || isMishaal) && !hasPendingOdaRequestForCurrentUser && (
						<button
							type="button"
							className="primary-button"
							onClick={onOpenNewOda}
						>
							طلب عهدة جديدة
						</button>
					)}
				</div>
			</header>

			<section className="card oda-list-card">
				<div className="oda-list-header">
					<h2>قائمة العهدة</h2>
					{!isMishaal && (
						<div className="oda-filter-buttons">
							<button
								type="button"
								className={`secondary-button ${
									odaEmployeeFilter === 'all' ? 'oda-filter-button-active' : ''
								}`}
								onClick={() => onChangeFilter('all')}
							>
								كل العهد
							</button>
							<button
								type="button"
								className={`secondary-button ${
									odaEmployeeFilter === 'sameh' ? 'oda-filter-button-active' : ''
								}`}
								onClick={() => onChangeFilter('sameh')}
							>
								عهدة المهندس سامح
							</button>
							<button
								type="button"
								className={`secondary-button ${
									odaEmployeeFilter === 'mishaal' ? 'oda-filter-button-active' : ''
								}`}
								onClick={() => onChangeFilter('mishaal')}
							>
								عهدة الأستاذ مشعل
							</button>
						</div>
					)}
				</div>
				{isLoading && <p>جاري تحميل البيانات من الخادم...</p>}
        <div className="oda-table-wrapper">
				  <table className="oda-table">
					  <thead>
						  <tr>
							  <th>رقم العهدة</th>
							  <th>الموظف</th>
							  <th>تاريخ بداية العهدة</th>
							  <th>القيمة </th>
							  <th>الرصيد الحالي </th>
							  <th>رصيد الإقفال </th>
							  <th>الحالة</th>
							  <th>تاريخ إغلاق العهدة</th>
						  </tr>
					  </thead>
					  <tbody>
						  {displayedOdas.map((oda) => {
							  const displayId = oda.employeeOdaNumber || oda.id

							  return (
								  <tr
									  key={oda.id}
									  className="clickable-row"
									  onClick={() => onOpenOdaDetails(oda.id)}
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
        </div>
			</section>
		</div>
	)
}
