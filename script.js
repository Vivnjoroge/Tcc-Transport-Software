// Storage keys for users, active session, and consignments.
const USERS_STORAGE_KEY = 'tcc_users';
const CURRENT_USER_STORAGE_KEY = 'tcc_current_user';
const CONSIGNMENTS_STORAGE_KEY = 'tcc_consignments';
const NOTIFICATIONS_STORAGE_KEY = 'tcc_notifications';
const TRUCKS_STORAGE_KEY = 'tcc_trucks';
const TRUCK_LOGS_STORAGE_KEY = 'tcc_truck_logs';

const MANAGED_ROLES = ['Clerk', 'Driver', 'Customer', 'Manager'];

// Default Trucks config
const DEFAULT_TRUCKS = [
	{ id: 1, truckNumber: 'T-101', status: 'Available', currentLocation: 'Nairobi', lastAssignedAt: null },
	{ id: 2, truckNumber: 'T-102', status: 'Available', currentLocation: 'Mombasa', lastAssignedAt: null },
	{ id: 3, truckNumber: 'T-103', status: 'Available', currentLocation: 'Kisumu', lastAssignedAt: null }
];

// Default Manager account required by the system.
const DEFAULT_MANAGER_ACCOUNT = {
	fullName: 'System Manager',
	email: 'admin@tcc.com',
	password: 'admin123',
	role: 'Manager'
};

// Billing rates per destination (simple setup).
const DESTINATION_RATES = {
	nairobi: 12,
	mombasa: 18,
	kwale: 20,
	kilifi: 20,
	'tana river': 25,
	lamu: 28,
	taita_taveta: 22,
	garissa: 30,
	wajir: 35,
	mandera: 40,
	marsabit: 35,
	isicolo: 28,
	meru: 15,
	tharaka_nithi: 18,
	embu: 15,
	kitui: 20,
	machakos: 12,
	makueni: 18,
	nyandarua: 15,
	nyeri: 15,
	kirinyaga: 15,
	muranga: 14,
	kiambu: 10,
	turkana: 45,
	'west pokot': 35,
	samburu: 32,
	'trans nzoia': 22,
	'uasin gishu': 20,
	'elgeyo marakwet': 22,
	nandi: 20,
	baringo: 25,
	laikipia: 22,
	nakuru: 14,
	narok: 20,
	kajiado: 12,
	kericho: 18,
	bomet: 20,
	kakamega: 22,
	vihiga: 22,
	bungoma: 24,
	busia: 25,
	siaya: 24,
	kisumu: 20,
	'homa bay': 25,
	migori: 26,
	kisii: 22,
	nyamira: 22
};

const DEFAULT_RATE = 10;

// Volume threshold for truck assignment
const VOLUME_THRESHOLD = 500;

// Run page-specific setup once the HTML is loaded.
document.addEventListener('DOMContentLoaded', () => {
	ensureDefaultManagerAccount();
	ensureDefaultTrucks();
	initLoginPage();
	initSignupPage();
	initDashboardPage();
});

// helper to ensure trucks exist
function ensureDefaultTrucks() {
	// For testing/UI updates, we always reset the trucks if they contain old data
	const currentTrucks = JSON.parse(localStorage.getItem(TRUCKS_STORAGE_KEY) || '[]');
	const hasOldData = currentTrucks.some(t => t.currentLocation === 'Accra');
	
	if (!localStorage.getItem(TRUCKS_STORAGE_KEY) || hasOldData) {
		localStorage.setItem(TRUCKS_STORAGE_KEY, JSON.stringify(DEFAULT_TRUCKS));
	}
}

// truck log helpers
function getTruckLogs() {
	const raw = localStorage.getItem(TRUCK_LOGS_STORAGE_KEY);
	return raw ? JSON.parse(raw) : [];
}

function saveTruckLogs(logs) {
	localStorage.setItem(TRUCK_LOGS_STORAGE_KEY, JSON.stringify(logs));
}

// Notification helpers
function getNotifications() {
	const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
	return raw ? JSON.parse(raw) : [];
}

function saveNotifications(notifications) {
	localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

function addNotification(userId, title, message) {
	const notifications = getNotifications();
	notifications.push({
		id: Date.now(),
		userId: userId,
		title: title,
		message: message,
		timestamp: new Date().toISOString(),
		read: false
	});
	saveNotifications(notifications);
}

function getTrucks() {
	const raw = localStorage.getItem(TRUCKS_STORAGE_KEY);
	return raw ? JSON.parse(raw) : [];
}

function saveTrucks(trucks) {
	localStorage.setItem(TRUCKS_STORAGE_KEY, JSON.stringify(trucks));
}

// helper to update UI elements with state
function setButtonLoading(button, isLoading, originalText = 'Sign In') {
	if (!button) return;
	if (isLoading) {
		button.disabled = true;
		button.innerHTML = '<span class="loading-spinner"></span> Please wait...';
	} else {
		button.disabled = false;
		button.innerHTML = originalText;
	}
}

// Redirect to login if user is not authorized or has wrong role
function checkAccess(allowedRoles = []) {
	const currentUser = getCurrentUser();
	if (!currentUser) {
		window.location.href = 'index.html';
		return null;
	}
	if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
		alert('Unauthorized access. Redirecting...');
		window.location.href = 'index.html';
		return null;
	}
	return currentUser;
}

// Initialize login behavior.
function initLoginPage() {
	const loginForm = document.getElementById('loginForm');

	if (!loginForm) {
		return;
	}

	const messageBox = document.getElementById('loginMessage');
	const submitBtn = loginForm.querySelector('button[type="submit"]');

	loginForm.addEventListener('submit', (event) => {
		event.preventDefault();
		clearInlineErrors(loginForm);

		const email = document.getElementById('loginEmail').value.trim().toLowerCase();
		const password = document.getElementById('loginPassword').value;

		if (!email || !password) {
			if (!email) {
				setInlineError(document.getElementById('loginEmail'), 'Email is required.');
			}

			if (!password) {
				setInlineError(document.getElementById('loginPassword'), 'Password is required.');
			}

			showMessage(messageBox, 'Please enter email and password.', 'error');
			return;
		}

		if (!isValidEmail(email)) {
			setInlineError(document.getElementById('loginEmail'), 'Enter a valid email address.');
			showMessage(messageBox, 'Please enter a valid email address.', 'error');
			return;
		}

		// Loading state
		setButtonLoading(submitBtn, true, 'Sign In');

		setTimeout(() => {
			const users = getUsers();
			const matchedUser = users.find((user) => user.email === email && user.password === password);

			if (!matchedUser) {
				setButtonLoading(submitBtn, false, 'Sign In');
				showMessage(messageBox, 'Invalid email or password.', 'error');
				return;
			}

			localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify({
				id: matchedUser.id,
				fullName: matchedUser.fullName,
				email: matchedUser.email,
				role: matchedUser.role
			}));

			showMessage(messageBox, 'Login successful. Redirecting...', 'success');

			setTimeout(() => {
				window.location.href = 'dashboard.html';
			}, 800);
		}, 600);
	});
}

/**
 * Initialize signup behavior.
 */
function initSignupPage() {
	const signupForm = document.getElementById('signupForm');

	if (!signupForm) {
		return;
	}

	const messageBox = document.getElementById('signupMessage');
	const submitBtn = signupForm.querySelector('button[type="submit"]');

	signupForm.addEventListener('submit', (event) => {
		event.preventDefault();
		clearInlineErrors(signupForm);

		const fullName = document.getElementById('signupFullName').value.trim();
		const email = document.getElementById('signupEmail').value.trim().toLowerCase();
		const password = document.getElementById('signupPassword').value;
		const confirmPassword = document.getElementById('signupConfirmPassword').value;

		let hasError = false;

		if (!fullName) {
			setInlineError(document.getElementById('signupFullName'), 'Full Name is required.');
			hasError = true;
		} else if (!isValidName(fullName)) {
			setInlineError(document.getElementById('signupFullName'), 'Full Name should only contain letters and be at least 2 characters long.');
			hasError = true;
		}
		if (!email) {
			setInlineError(document.getElementById('signupEmail'), 'Email is required.');
			hasError = true;
		} else if (!isValidEmail(email)) {
			setInlineError(document.getElementById('signupEmail'), 'Enter a valid email address.');
			hasError = true;
		}
		if (!password) {
			setInlineError(document.getElementById('signupPassword'), 'Password is required.');
			hasError = true;
		} else if (password.length < 6) {
			setInlineError(document.getElementById('signupPassword'), 'Password must be at least 6 characters.');
			hasError = true;
		}
		if (password !== confirmPassword) {
			setInlineError(document.getElementById('signupConfirmPassword'), 'Passwords do not match.');
			hasError = true;
		}

		if (hasError) {
			showMessage(messageBox, 'Please correct the errors above.', 'error');
			return;
		}

		const users = getUsers();
		if (users.some((u) => u.email === email)) {
			showMessage(messageBox, 'An account with this email already exists.', 'error');
			return;
		}

		setButtonLoading(submitBtn, true, 'Create Account');

		setTimeout(() => {
			const newUser = {
				id: 'u' + Date.now(),
				fullName,
				email,
				password,
				role: 'Customer' // Default role for manual signup
			};

			users.push(newUser);
			saveUsers(users);

			showMessage(messageBox, 'Account created! Redirecting to sign in...', 'success');

			setTimeout(() => {
				window.location.href = 'index.html';
			}, 1500);
		}, 800);
	});
}

// Initialize dashboard and route user to role-specific view.
function initDashboardPage() {
	const dashboardLayout = document.querySelector('.dashboard-layout');

	if (!dashboardLayout) {
		return;
	}

	const currentUser = checkAccess();
	if (!currentUser) return;

	initProfileManagement(currentUser);

	const welcomeText = document.getElementById('welcomeText');
	const roleLabel = document.getElementById('sidebarRoleLabel');
	const roleNotice = document.getElementById('roleNotice');
	const logoutBtn = document.getElementById('logoutBtn');

	if (welcomeText) {
		welcomeText.textContent = `Welcome, ${currentUser.fullName} (${currentUser.role})`;
	}

	if (roleLabel) {
		roleLabel.textContent = `${currentUser.role} Panel`;
	}

	if (logoutBtn) {
		logoutBtn.addEventListener('click', () => {
			localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
			window.location.href = 'index.html';
		});
	}

	// Real-time updates simulation - check for new consignments every 10 seconds
	setInterval(() => {
		if (currentUser.role === 'Clerk') {
			renderClerkConsignmentsTable();
		} else if (currentUser.role === 'Manager') {
			renderManagerDashboard();
		} else if (currentUser.role === 'Driver') {
			renderDriverAssignments(currentUser.id);
		} else if (currentUser.role === 'Customer') {
			renderCustomerConsignments(currentUser.id);
			renderCustomerNotifications(currentUser.id);
		}
	}, 10000);

	applyRoleVisibility(currentUser.role);

	if (currentUser.role === 'Manager') {
		setRoleNotice(roleNotice, 'Manager dashboard active: manage users, reports, truck status, and consignment tracking.', 'success');
		initManagerUserManagement();
		initManagerTrackingControls();
		initManagerReportExports();
		initManagerSectionNavigation();
		renderManagerDashboard();
		return;
	}

	if (currentUser.role === 'Clerk') {
		setRoleNotice(roleNotice, 'Clerk dashboard active: add consignments, billing, and view consignments.', 'info');
		initClerkDashboard(currentUser);
		initClerkSectionNavigation();
		renderClerkConsignmentsTable();
		return;
	}

	if (currentUser.role === 'Driver') {
		setRoleNotice(roleNotice, 'Driver dashboard active: view assigned deliveries and update status.', 'info');
		initDriverDashboard(currentUser);
		return;
	}

	if (currentUser.role === 'Customer') {
		setRoleNotice(roleNotice, 'Customer dashboard active: submit consignments and track your items.', 'success');
		initCustomerDashboard(currentUser);
		return;
	}

	setRoleNotice(roleNotice, 'Unknown role. Please contact the Manager.', 'warning');
}

// Initialize Clerk sidebar navigation so add/view consignments are displayed one at a time.
function initClerkSectionNavigation() {
	const clerkNavItems = Array.from(document.querySelectorAll('.nav-item[data-nav-role="Clerk"][data-clerk-nav]'));
	const clerkPanels = Array.from(document.querySelectorAll('#clerkSection .clerk-panel[data-clerk-view]'));

	if (clerkNavItems.length === 0 || clerkPanels.length === 0) {
		return;
	}

	const showClerkView = (viewName) => {
		clerkPanels.forEach((panel) => {
			const panelView = panel.dataset.clerkView;
			panel.classList.toggle('hidden', panelView !== viewName);
		});

		clerkNavItems.forEach((item) => {
			item.classList.toggle('active', item.dataset.clerkNav === viewName);
		});
	};

	clerkNavItems.forEach((item) => {
		item.addEventListener('click', (event) => {
			event.preventDefault();
			const viewName = item.dataset.clerkNav;
			if (!viewName) {
				return;
			}

			showClerkView(viewName);
			window.location.hash = item.getAttribute('href') || '';
		});
	});

	const hashToView = {
		'#addConsignment': 'add-consignment',
		'#clerkConsignments': 'view-consignments'
	};

	const initialView = hashToView[window.location.hash] || 'add-consignment';
	showClerkView(initialView);
}

// Initialize Manager sidebar navigation so each manager feature is shown on its own view.
function initManagerSectionNavigation() {
	const managerNavItems = Array.from(document.querySelectorAll('.nav-item[data-nav-role="Manager"][data-manager-nav]'));
	const managerPanels = Array.from(document.querySelectorAll('#managerSection .manager-panel[data-manager-view]'));

	if (managerNavItems.length === 0 || managerPanels.length === 0) {
		return;
	}

	const showManagerView = (viewName) => {
		managerPanels.forEach((panel) => {
			const panelView = panel.dataset.managerView;
			panel.classList.toggle('hidden', panelView !== viewName);
		});

		managerNavItems.forEach((item) => {
			item.classList.toggle('active', item.dataset.managerNav === viewName);
		});
	};

	managerNavItems.forEach((item) => {
		item.addEventListener('click', (event) => {
			event.preventDefault();
			const viewName = item.dataset.managerNav;
			if (!viewName) {
				return;
			}

			showManagerView(viewName);
			window.location.hash = item.getAttribute('href') || '';
		});
	});

	const hashToView = {
		'#manageUsers': 'manage-users',
		'#managerReports': 'reports',
		'#truckStatus': 'truck-status',
		'#consignmentTracking': 'consignments'
	};

	const initialView = hashToView[window.location.hash] || 'manage-users';
	showManagerView(initialView);
}

// Show only the section and menu items for the logged-in role.
function applyRoleVisibility(role) {
	const roleSections = {
		Manager: document.getElementById('managerSection'),
		Clerk: document.getElementById('clerkSection'),
		Driver: document.getElementById('driverSection'),
		Customer: document.getElementById('customerSection')
	};

	Object.entries(roleSections).forEach(([sectionRole, sectionElement]) => {
		if (!sectionElement) {
			return;
		}

		sectionElement.classList.toggle('hidden', sectionRole !== role);
	});

	const navItems = Array.from(document.querySelectorAll('.nav-item[data-nav-role]'));
	navItems.forEach((navItem) => {
		const isRoleItem = navItem.dataset.navRole === role;
		navItem.classList.toggle('hidden', !isRoleItem);
		navItem.classList.remove('active');
	});

	const firstVisibleNav = navItems.find((navItem) => !navItem.classList.contains('hidden'));
	if (firstVisibleNav) {
		firstVisibleNav.classList.add('active');
	}
}

/**
 * Initialize profile management for the logged-in user.
 */
function initProfileManagement(currentUser) {
	const profileForm = document.getElementById('profileForm');
	if (!profileForm) return;

	const fullNameInput = document.getElementById('profileFullName');
	const emailInput = document.getElementById('profileEmail');
	const passwordInput = document.getElementById('profilePassword');
	const confirmPasswordInput = document.getElementById('profileConfirmPassword');
	const messageBox = document.getElementById('profileMessage');

	// Nav items for profile
	const profileNavItems = document.querySelectorAll('.nav-item[href="#profileSection"]');
	const sections = document.querySelectorAll('.dashboard-section');

	// Pre-fill
	if (fullNameInput) fullNameInput.value = currentUser.fullName;
	if (emailInput) emailInput.value = currentUser.email;

	profileNavItems.forEach(item => {
		item.addEventListener('click', (e) => {
			e.preventDefault();
			
			// Hide all top-level sections
			sections.forEach(s => s.classList.add('hidden'));
			
			// Show profile section
			const profileSection = document.getElementById('profileSection');
			if (profileSection) profileSection.classList.remove('hidden');

			// Update active class on nav items
			document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
			item.classList.add('active');
		});
	});

	profileForm.addEventListener('submit', (e) => {
		e.preventDefault();
		clearInlineErrors(profileForm);

		const newFullName = fullNameInput.value.trim();
		const newPassword = passwordInput.value;
		const confirmPassword = confirmPasswordInput.value;

		let hasError = false;

		if (!newFullName) {
			setInlineError(fullNameInput, 'Full Name is required.');
			hasError = true;
		} else if (!isValidName(newFullName)) {
			setInlineError(fullNameInput, 'Full Name must be at least 2 characters and contain only letters.');
			hasError = true;
		}

		if (newPassword) {
			if (newPassword.length < 6) {
				setInlineError(passwordInput, 'New password must be at least 6 characters.');
				hasError = true;
			}
			if (newPassword !== confirmPassword) {
				setInlineError(confirmPasswordInput, 'Passwords do not match.');
				hasError = true;
			}
		} else if (confirmPassword) {
			setInlineError(confirmPasswordInput, 'Please enter a new password first.');
			hasError = true;
		}

		if (hasError) {
			showMessage(messageBox, 'Please fix the errors below.', 'error');
			return;
		}

		const users = getUsers();
		const userIndex = users.findIndex(u => u.email === currentUser.email);

		if (userIndex !== -1) {
			users[userIndex].fullName = newFullName;
			if (newPassword) {
				users[userIndex].password = newPassword;
			}
			saveUsers(users);

			// Update session
			currentUser.fullName = newFullName;
			localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser));

			showMessage(messageBox, 'Profile updated successfully.', 'success');
			
			// Update welcome text if it exists
			const welcomeText = document.getElementById('welcomeText');
			if (welcomeText) {
				welcomeText.textContent = `Welcome, ${currentUser.fullName} (${currentUser.role})`;
			}

			// Clear password fields
			passwordInput.value = '';
			confirmPasswordInput.value = '';
		} else {
			showMessage(messageBox, 'User not found.', 'error');
		}
	});
}

// Initialize Manager tracking controls for consignment filtering.
function initManagerTrackingControls() {
	const applyBtn = document.getElementById('managerTrackApply');
	const resetBtn = document.getElementById('managerTrackReset');
	const searchInput = document.getElementById('managerTrackSearch');
	const statusSelect = document.getElementById('managerTrackStatus');

	if (!applyBtn || !resetBtn || !searchInput || !statusSelect) {
		return;
	}

	applyBtn.addEventListener('click', () => {
		renderManagerDashboard();
	});

	resetBtn.addEventListener('click', () => {
		searchInput.value = '';
		statusSelect.value = '';
		renderManagerDashboard();
	});

	searchInput.addEventListener('keydown', (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			renderManagerDashboard();
		}
	});

	statusSelect.addEventListener('change', () => {
		renderManagerDashboard();
	});
}

// Initialize Manager reports export actions.
function initManagerReportExports() {
	const exportCsvBtn = document.getElementById('managerExportCsv');
	const exportPdfBtn = document.getElementById('managerExportPdf');

	if (exportCsvBtn) {
		exportCsvBtn.addEventListener('click', () => {
			exportManagerReportCsv();
		});
	}

	if (exportPdfBtn) {
		exportPdfBtn.addEventListener('click', () => {
			exportManagerReportPdf();
		});
	}
}

// Get manager tracking filters from UI.
function getManagerTrackingFilters() {
	const searchInput = document.getElementById('managerTrackSearch');
	const statusSelect = document.getElementById('managerTrackStatus');

	return {
		searchTerm: searchInput ? searchInput.value.trim().toLowerCase() : '',
		selectedStatus: statusSelect ? statusSelect.value : ''
	};
}

// Filter consignments using current manager tracking controls.
function getFilteredManagerConsignments(consignments) {
	const { searchTerm, selectedStatus } = getManagerTrackingFilters();

	return consignments.filter((consignment) => {
		const statusMatch = !selectedStatus || consignment.status === selectedStatus;
		if (!statusMatch) {
			return false;
		}

		if (!searchTerm) {
			return true;
		}

		const searchableText = [
			consignment.id,
			consignment.destination,
			consignment.receiverName,
			consignment.senderName,
			consignment.assignedDriverName
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();

		return searchableText.includes(searchTerm);
	});
}

// Build destination-based status rows for manager tables and exports.
function getDestinationStatusRows(consignments) {
	const destinationMap = new Map();

	consignments.forEach((consignment) => {
		const destination = consignment.destination || 'Unknown';
		const volume = Number(consignment.volume) || 0;

		if (!destinationMap.has(destination)) {
			destinationMap.set(destination, {
				totalVolume: 0,
				assignedDriverName: null
			});
		}

		const entry = destinationMap.get(destination);
		entry.totalVolume += volume;
		if (consignment.status === 'Ready for Dispatch') {
			entry.assignedDriverName = consignment.assignedDriverName || entry.assignedDriverName;
		}
	});

	return Array.from(destinationMap.entries()).map(([destination, details]) => ({
		destination,
		totalVolume: details.totalVolume,
		isReady: details.totalVolume >= 500,
		assignedDriverName: details.assignedDriverName || '-'
	}));
}

// Export manager dashboard data as CSV.
function exportManagerReportCsv() {
	const consignments = getConsignments();
	const destinationRows = getDestinationStatusRows(consignments);
	const filteredConsignments = getFilteredManagerConsignments(consignments);

	const totalRevenue = consignments.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
	const pendingCount = consignments.filter((item) => (item.status || 'Pending') === 'Pending').length;
	const readyCount = consignments.filter((item) => item.status === 'Ready for Dispatch').length;
	const deliveredCount = consignments.filter((item) => item.status === 'Delivered').length;

	const lines = [
		'"TCC Manager Report"',
		`"Generated At","${new Date().toLocaleString()}"`,
		'',
		'"Summary"',
		'"Metric","Value"',
		`"Total Revenue","${formatCurrency(totalRevenue)}"`,
		`"Total Consignments","${consignments.length}"`,
		`"Destinations","${destinationRows.length}"`,
		`"Pending","${pendingCount}"`,
		`"Ready for Dispatch","${readyCount}"`,
		`"Delivered","${deliveredCount}"`,
		'',
		'"Truck Status by Destination"',
		'"Destination","Total Volume","Status","Assigned Driver"'
	];

	destinationRows.forEach((row) => {
		lines.push(`"${escapeCsv(row.destination)}","${row.totalVolume.toFixed(2)} m³","${row.isReady ? 'Ready for Dispatch' : 'Pending'}","${escapeCsv(row.assignedDriverName)}"`);
	});

	lines.push('', '"Tracked Consignments (Current Filters)"', '"ID","Destination","Receiver","Volume","Status","Driver"');

	filteredConsignments.forEach((consignment) => {
		lines.push(`"${escapeCsv(consignment.id)}","${escapeCsv(consignment.destination || '-')}","${escapeCsv(consignment.receiverName || '-')}","${Number(consignment.volume || 0).toFixed(2)} m³","${escapeCsv(consignment.status || 'Pending')}","${escapeCsv(consignment.assignedDriverName || '-')}"`);
	});

	const csvBlob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
	const downloadUrl = URL.createObjectURL(csvBlob);
	const link = document.createElement('a');
	link.href = downloadUrl;
	link.download = `tcc-manager-report-${new Date().toISOString().slice(0, 10)}.csv`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(downloadUrl);
}

// Export manager dashboard as printable PDF document.
function exportManagerReportPdf() {
	const consignments = getConsignments();
	const destinationRows = getDestinationStatusRows(consignments);
	const filteredConsignments = getFilteredManagerConsignments(consignments);

	const totalRevenue = consignments.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
	const pendingCount = consignments.filter((item) => (item.status || 'Pending') === 'Pending').length;
	const readyCount = consignments.filter((item) => item.status === 'Ready for Dispatch').length;
	const deliveredCount = consignments.filter((item) => item.status === 'Delivered').length;

	const summaryRows = `
		<tr><td>Total Revenue</td><td>${escapeHtml(formatCurrency(totalRevenue))}</td></tr>
		<tr><td>Total Consignments</td><td>${consignments.length}</td></tr>
		<tr><td>Destinations</td><td>${destinationRows.length}</td></tr>
		<tr><td>Pending</td><td>${pendingCount}</td></tr>
		<tr><td>Ready for Dispatch</td><td>${readyCount}</td></tr>
		<tr><td>Delivered</td><td>${deliveredCount}</td></tr>
	`;

	const truckRows = destinationRows.length
		? destinationRows
			.map((row) => `
				<tr>
					<td>${escapeHtml(row.destination)}</td>
					<td>${row.totalVolume.toFixed(2)} m³</td>
					<td>${row.isReady ? 'Ready for Dispatch' : 'Pending'}</td>
					<td>${escapeHtml(row.assignedDriverName)}</td>
				</tr>
			`)
			.join('')
		: '<tr><td colspan="4">No truck status data available.</td></tr>';

	const trackedRows = filteredConsignments.length
		? filteredConsignments
			.map((consignment) => `
				<tr>
					<td>${escapeHtml(consignment.id)}</td>
					<td>${escapeHtml(consignment.destination || '-')}</td>
					<td>${escapeHtml(consignment.receiverName || '-')}</td>
					<td>${Number(consignment.volume || 0).toFixed(2)} m³</td>
					<td>${escapeHtml(consignment.status || 'Pending')}</td>
					<td>${escapeHtml(consignment.assignedDriverName || '-')}</td>
				</tr>
			`)
			.join('')
		: '<tr><td colspan="6">No consignments matched current filters.</td></tr>';

	const reportWindow = window.open('', '_blank', 'width=1000,height=700');
	if (!reportWindow) {
		return;
	}

	reportWindow.document.write(`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<title>TCC Manager Report</title>
			<style>
				body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111827; }
				h1 { margin: 0 0 6px; }
				p { margin: 0 0 16px; color: #4b5563; font-size: 14px; }
				h2 { margin: 22px 0 8px; font-size: 18px; }
				table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
				th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 13px; }
				th { background: #f9fafb; }
			</style>
		</head>
		<body>
			<h1>TCC Manager Report</h1>
			<p>Generated on ${escapeHtml(new Date().toLocaleString())}</p>

			<h2>Summary</h2>
			<table>
				<thead><tr><th>Metric</th><th>Value</th></tr></thead>
				<tbody>${summaryRows}</tbody>
			</table>

			<h2>Truck Status by Destination</h2>
			<table>
				<thead><tr><th>Destination</th><th>Total Volume</th><th>Status</th><th>Assigned Driver</th></tr></thead>
				<tbody>${truckRows}</tbody>
			</table>

			<h2>Tracked Consignments (Current Filters)</h2>
			<table>
				<thead><tr><th>ID</th><th>Destination</th><th>Receiver</th><th>Volume</th><th>Status</th><th>Driver</th></tr></thead>
				<tbody>${trackedRows}</tbody>
			</table>
		</body>
		</html>
	`);

	reportWindow.document.close();
	reportWindow.focus();
	reportWindow.print();
}

// Initialize Manager-only user management features.
function initManagerUserManagement() {
	if (!checkAccess(['Manager'])) return;
	const manageUserForm = document.getElementById('manageUserForm');
	const managedUsersBody = document.getElementById('managedUsersBody');
	const roleInput = document.getElementById('managedRole');

	if (!manageUserForm || !managedUsersBody) {
		return;
	}

	// Update roles dropdown if needed
	if (roleInput && roleInput.options.length <= 3) {
		const customerOpt = document.createElement('option');
		customerOpt.value = 'Customer';
		customerOpt.textContent = 'Customer';
		roleInput.appendChild(customerOpt);
	}

	const messageBox = document.getElementById('manageUserMessage');
	const managedUserId = document.getElementById('managedUserId');
	const fullNameInput = document.getElementById('managedFullName');
	const emailInput = document.getElementById('managedEmail');
	const passwordInput = document.getElementById('managedPassword');
	const addUserBtn = document.getElementById('addUserBtn');
	const cancelEditBtn = document.getElementById('cancelEditUserBtn');

	renderManagedUsersTable();

	manageUserForm.addEventListener('submit', (event) => {
		event.preventDefault();
		clearInlineErrors(manageUserForm);

		const fullName = fullNameInput.value.trim();
		const email = emailInput.value.trim().toLowerCase();
		const password = passwordInput.value;
		const role = roleInput.value;

		if (!fullName || !email || !password || !role) {
			if (!fullName) {
				setInlineError(fullNameInput, 'Full name is required.');
			}

			if (!email) {
				setInlineError(emailInput, 'Email is required.');
			}

			if (!password) {
				setInlineError(passwordInput, 'Password is required.');
			}

			if (!role) {
				setInlineError(roleInput, 'Role is required.');
			}

			showMessage(messageBox, 'Please fill in all fields.', 'error');
			return;
		}

		if (!isValidName(fullName)) {
			setInlineError(fullNameInput, 'Enter at least 2 letters for name.');
			showMessage(messageBox, 'Please enter a valid full name (at least 2 letters).', 'error');
			return;
		}

		if (!isValidEmail(email)) {
			setInlineError(emailInput, 'Enter a valid email address.');
			showMessage(messageBox, 'Please enter a valid email address.', 'error');
			return;
		}

		if (password.length < 6) {
			setInlineError(passwordInput, 'Password must be at least 6 characters.');
			showMessage(messageBox, 'Password must be at least 6 characters.', 'error');
			return;
		}

		if (!MANAGED_ROLES.includes(role)) {
			setInlineError(roleInput, 'Role must be Clerk or Driver.');
			showMessage(messageBox, 'Role must be Clerk or Driver.', 'error');
			return;
		}

		const users = getUsers();
		const duplicateUser = users.find((user) => user.email === email && String(user.id) !== String(managedUserId.value));
		if (duplicateUser) {
			setInlineError(emailInput, 'This email is already in use.');
			showMessage(messageBox, 'This email is already used by another account.', 'error');
			return;
		}

		if (managedUserId.value) {
			const targetUser = users.find((user) => String(user.id) === String(managedUserId.value));
			if (!targetUser) {
				showMessage(messageBox, 'Selected user was not found.', 'error');
				return;
			}

			targetUser.fullName = fullName;
			targetUser.email = email;
			targetUser.password = password;
			targetUser.role = role;
			showMessage(messageBox, 'User updated successfully.', 'success');
		} else {
			users.push({
				id: Date.now(),
				fullName,
				email,
				password,
				role,
				createdAt: new Date().toISOString()
			});

			showMessage(messageBox, `${role} account created successfully.`, 'success');
		}

		saveUsers(users);
		manageUserForm.reset();
		clearInlineErrors(manageUserForm);
		managedUserId.value = '';
		addUserBtn.textContent = 'Add User';
		cancelEditBtn.hidden = true;

		refreshDispatchAssignments();
		renderManagedUsersTable();
		renderManagerDashboard();
	});

	cancelEditBtn.addEventListener('click', () => {
		manageUserForm.reset();
		managedUserId.value = '';
		addUserBtn.textContent = 'Add User';
		cancelEditBtn.hidden = true;
		clearInlineErrors(manageUserForm);
		showMessage(messageBox, 'Edit cancelled.', 'info');
	});

	managedUsersBody.addEventListener('click', (event) => {
		const clickedElement = event.target;
		if (!(clickedElement instanceof HTMLElement)) {
			return;
		}

		// Find elements with dataset attributes, could be the button or a child if any.
		const actionBtn = clickedElement.closest('[data-action]');
		if (!actionBtn) {
			return;
		}

		const action = actionBtn.dataset.action;
		const userId = actionBtn.dataset.userId;

		if (!userId || !action) {
			return;
		}

		if (action === 'delete') {
			if (!confirm('Are you sure you want to delete this user?')) return;
			deleteManagedUser(userId, messageBox);
			refreshDispatchAssignments();
			renderManagedUsersTable();
			renderManagerDashboard();
			return;
		}

		if (action === 'edit') {
			const users = getUsers();
			const targetUser = users.find((user) => String(user.id) === String(userId));

			if (!targetUser || targetUser.role === 'Manager') {
				showMessage(messageBox, 'This user cannot be edited here.', 'error');
				return;
			}

			fullNameInput.value = targetUser.fullName;
			emailInput.value = targetUser.email;
			passwordInput.value = targetUser.password;
			roleInput.value = targetUser.role;
			managedUserId.value = String(targetUser.id);
			addUserBtn.textContent = 'Update User';
			cancelEditBtn.hidden = false;
			showMessage(messageBox, `Editing user: ${targetUser.fullName}`, 'success');

			// Scroll the form into view if necessary
			manageUserForm.scrollIntoView({ behavior: 'smooth' });
		}
	});

	cancelEditBtn.addEventListener('click', () => {
		manageUserForm.reset();
		clearInlineErrors(manageUserForm);
		managedUserId.value = '';
		addUserBtn.textContent = 'Add User';
		cancelEditBtn.hidden = true;
		clearMessage(messageBox);
	});
}

// Render users in Manager -> Manage Users section.
function renderManagedUsersTable() {
	const managedUsersBody = document.getElementById('managedUsersBody');
	if (!managedUsersBody) {
		return;
	}

	const users = getUsers();
	managedUsersBody.innerHTML = '';

	if (users.length === 0) {
		managedUsersBody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
		return;
	}

	users.forEach((user) => {
		const isManager = user.role === 'Manager';
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${user.fullName}</td>
			<td>${user.email}</td>
			<td>${user.role}</td>
			<td>
				<div class="table-actions">
					<button class="btn-small" data-action="edit" data-user-id="${user.id}" ${isManager ? 'disabled' : ''}>Edit</button>
					<button class="btn-small btn-danger" data-action="delete" data-user-id="${user.id}" ${isManager ? 'disabled' : ''}>Delete</button>
				</div>
			</td>
		`;

		managedUsersBody.appendChild(row);
	});
}

// Delete a Clerk/Driver account.
function deleteManagedUser(userId, messageBox) {
	const users = getUsers();
	const targetUser = users.find((user) => String(user.id) === String(userId));

	if (!targetUser) {
		showMessage(messageBox, 'User not found.', 'error');
		return;
	}

	if (targetUser.role === 'Manager') {
		showMessage(messageBox, 'Manager account cannot be deleted from this section.', 'error');
		return;
	}

	const filteredUsers = users.filter((user) => String(user.id) !== String(userId));
	saveUsers(filteredUsers);
	showMessage(messageBox, 'User deleted successfully.', 'success');
}

// Initialize Clerk dashboard features.
function initClerkDashboard(currentUser) {
	if (!checkAccess(['Clerk', 'Manager'])) return;
	const form = document.getElementById('clerkConsignmentForm');
	if (!form) {
		return;
	}

	const messageBox = document.getElementById('clerkMessage');
	const billingResult = document.getElementById('clerkBillingResult');
	const applyFiltersBtn = document.getElementById('clerkApplyFilters');
	const resetFiltersBtn = document.getElementById('clerkResetFilters');
	const searchInput = document.getElementById('clerkConsignmentSearch');
	const statusSelect = document.getElementById('clerkConsignmentStatus');
	const assignedDriverSelect = document.getElementById('assignedDriverId');
	const saveButton = form.querySelector('button[type="submit"]');

	// Note: Auto-assignment is removed, Clerk manually reviews.
	if (assignedDriverSelect) {
		assignedDriverSelect.closest('.form-group').style.display = 'none';
	}

	if (applyFiltersBtn) {
		applyFiltersBtn.addEventListener('click', () => {
			renderClerkConsignmentsTable();
		});
	}

	if (resetFiltersBtn) {
		resetFiltersBtn.addEventListener('click', () => {
			if (searchInput) {
				searchInput.value = '';
			}

			if (statusSelect) {
				statusSelect.value = '';
			}

			renderClerkConsignmentsTable();
		});
	}

	if (statusSelect) {
		statusSelect.addEventListener('change', () => {
			renderClerkConsignmentsTable();
		});
	}

	if (searchInput) {
		searchInput.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				renderClerkConsignmentsTable();
			}
		});
	}

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		clearInlineErrors(form);

		const senderNameInput = document.getElementById('senderName');
		const senderAddressInput = document.getElementById('senderAddress');
		const receiverNameInput = document.getElementById('receiverName');
		const receiverAddressInput = document.getElementById('receiverAddress');
		const destinationSelect = document.getElementById('destination');
		const volumeInput = document.getElementById('volume');

		const senderName = senderNameInput.value.trim();
		const senderAddress = senderAddressInput.value.trim();
		const receiverName = receiverNameInput.value.trim();
		const receiverAddress = receiverAddressInput.value.trim();
		const destination = destinationSelect.value.trim();
		const volume = Number(volumeInput.value);

		let hasError = false;

		if (!senderName) {
			setInlineError(senderNameInput, 'Sender name is required.');
			hasError = true;
		} else if (senderName.length < 2) {
			setInlineError(senderNameInput, 'Name must be at least 2 characters.');
			hasError = true;
		}

		if (!senderAddress) {
			setInlineError(senderAddressInput, 'Sender address is required.');
			hasError = true;
		} else if (senderAddress.length < 5) {
			setInlineError(senderAddressInput, 'Address must be at last 5 characters.');
			hasError = true;
		}

		if (!receiverName) {
			setInlineError(receiverNameInput, 'Receiver name is required.');
			hasError = true;
		} else if (receiverName.length < 2) {
			setInlineError(receiverNameInput, 'Name must be at least 2 characters.');
			hasError = true;
		}

		if (!receiverAddress) {
			setInlineError(receiverAddressInput, 'Receiver address is required.');
			hasError = true;
		} else if (receiverAddress.length < 5) {
			setInlineError(receiverAddressInput, 'Address must be at least 5 characters.');
			hasError = true;
		}

		if (!destination) {
			setInlineError(destinationSelect, 'Destination is required.');
			hasError = true;
		}

		if (volumeInput.value === '') {
			setInlineError(volumeInput, 'Volume is required.');
			hasError = true;
		} else if (isNaN(volume) || volume <= 0) {
			setInlineError(volumeInput, 'Volume must be greater than 0.');
			hasError = true;
		}

		if (hasError) {
			showMessage(messageBox, 'Please fix the errors below.', 'error');
			return;
		}

		const rate = getRateForDestination(destination);
		const cost = volume * rate;

		const consignments = getConsignments();
		consignments.push({
			id: generateConsignmentId(),
			senderName,
			senderAddress,
			receiverName,
			receiverAddress,
			destination,
			volume,
			cost,
			status: 'Pending',
			createdByUserId: currentUser.id,
			createdAt: new Date().toISOString()
		});

		saveConsignments(consignments);

		showMessage(messageBox, 'Consignment saved successfully.', 'success');
		if (billingResult) {
			billingResult.textContent = `Billing: ${volume.toFixed(2)} m³ × KSh ${rate.toFixed(2)} = ${formatCurrency(cost)}`;
		}

		form.reset();
		clearInlineErrors(form);
		renderClerkConsignmentsTable();
	});
}

// Populate Clerk driver dropdown with available Driver accounts.
function populateClerkDriverSelect() {
	const assignedDriverSelect = document.getElementById('assignedDriverId');
	if (!assignedDriverSelect) {
		return;
	}

	const drivers = getUsers().filter((user) => user.role === 'Driver');
	assignedDriverSelect.innerHTML = '<option value="">Select driver</option>';

	drivers.forEach((driver) => {
		const option = document.createElement('option');
		option.value = String(driver.id);
		option.textContent = `${driver.fullName} (${driver.email})`;
		assignedDriverSelect.appendChild(option);
	});
}

// Enable/disable clerk save action and show warning when no drivers exist.
function updateClerkDriverAvailabilityState(assignedDriverSelect, saveButton) {
	const hint = document.getElementById('clerkDriverHint');
	if (!assignedDriverSelect) {
		return;
	}

	const hasDriverOptions = assignedDriverSelect.options.length > 1;

	if (saveButton) {
		saveButton.disabled = !hasDriverOptions;
	}

	if (!hint) {
		return;
	}

	if (!hasDriverOptions) {
		hint.textContent = 'No drivers available. Ask the Manager/Admin to add at least one driver before creating consignments.';
		return;
	}

	hint.textContent = '';
}

// Filter consignments by Clerk view controls.
function getClerkFilteredConsignments(consignments) {
	const searchInput = document.getElementById('clerkConsignmentSearch');
	const statusSelect = document.getElementById('clerkConsignmentStatus');
	const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
	const selectedStatus = statusSelect ? statusSelect.value : '';

	return consignments.filter((consignment) => {
		if (selectedStatus && consignment.status !== selectedStatus) {
			return false;
		}

		if (!searchTerm) {
			return true;
		}

		const searchableText = [
			consignment.id,
			consignment.senderName,
			consignment.receiverName,
			consignment.destination,
			consignment.assignedDriverName
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();

		return searchableText.includes(searchTerm);
	});
}

// Render consignments table for Clerk view.
function handleClerkAction(action, id) {
	const consignments = getConsignments();
	const item = consignments.find(c => c.id === id);
	const trucks = getTrucks();
	const users = getUsers();
	
	if (!item) return;

	if (action === 'approve') {
		item.status = 'Approved';
	} else if (action === 'reject') {
		item.status = 'Rejected';
	} else if (action === 'dispatch') {
		const destination = item.destination;
		const availableTruck = trucks.find(t => t.status === 'Available');
		const drivers = users.filter(u => u.role === 'Driver');
		const availableDriver = drivers.find(u => !consignments.some(c => c.assignedDriverId === u.id && c.status === 'In Transit'));

		if (!availableTruck || !availableDriver) {
			item.status = 'Ready for Dispatch';
			const reason = !availableTruck ? 'No available truck' : 'No available driver';

			// Notification for customer
			if (item.createdByUserId) {
				addNotification(
					item.createdByUserId,
					'Consignment Ready for Dispatch',
					`Your consignment ${item.id} to ${item.destination} is now ready and waiting for an available truck or driver.`
				);
			}

			alert(`${reason}. Consignment marked as "Ready for Dispatch".`);
		} else {
			const dispatchTime = new Date().toISOString();
			item.status = 'In Transit';
			item.assignedDriverId = availableDriver.id;
			item.assignedDriverName = availableDriver.fullName;
			item.assignedTruckId = availableTruck.id;
			item.assignedTruckNumber = availableTruck.truckNumber;
			item.dispatchedAt = dispatchTime;

			availableTruck.status = 'Busy';
			availableTruck.lastAssignedAt = dispatchTime;
			
			const logs = getTruckLogs();
			logs.push({
				id: Date.now(),
				truckId: availableTruck.id,
				truckNumber: availableTruck.truckNumber,
				destination: destination,
				consignmentIds: [item.id],
				dispatchedAt: dispatchTime,
				totalVolume: item.volume
			});

			if (item.createdByUserId) {
				addNotification(
					item.createdByUserId,
					'Consignment In Transit',
					`Your consignment ${item.id} is now in transit with truck ${availableTruck.truckNumber}.`
				);
			}

			saveTruckLogs(logs);
			saveTrucks(trucks);
		}
	}

	saveConsignments(consignments);
	renderClerkConsignmentsTable();
}

function renderClerkConsignmentsTable() {
	const tbody = document.getElementById('clerkConsignmentsBody');
	const dispatchSummary = document.getElementById('clerkDispatchSummary');
	const totalConsignmentsElement = document.getElementById('clerkTotalConsignments');
	const readyConsignmentsElement = document.getElementById('clerkReadyConsignments');
	const deliveredConsignmentsElement = document.getElementById('clerkDeliveredConsignments');

	if (!tbody) {
		return;
	}

	const consignments = getConsignments();
	const filteredConsignments = getClerkFilteredConsignments(consignments);
	tbody.innerHTML = '';

	if (totalConsignmentsElement) {
		totalConsignmentsElement.textContent = String(consignments.length);
	}

	if (readyConsignmentsElement) {
		readyConsignmentsElement.textContent = String(consignments.filter((item) => item.status === 'Ready for Dispatch').length);
	}

	if (deliveredConsignmentsElement) {
		deliveredConsignmentsElement.textContent = String(consignments.filter((item) => item.status === 'Delivered').length);
	}

	if (consignments.length === 0) {
		tbody.innerHTML = '<tr><td colspan="8">No consignments found.</td></tr>';
		if (dispatchSummary) {
			dispatchSummary.textContent = 'Dispatch summary: no consignments yet.';
		}
		return;
	}

	if (filteredConsignments.length === 0) {
		tbody.innerHTML = '<tr><td colspan="8">No consignments matched your filters.</td></tr>';
		if (dispatchSummary) {
			dispatchSummary.textContent = `Dispatch summary: showing 0 of ${consignments.length} consignment(s).`;
		}
		return;
	}

	filteredConsignments.forEach((consignment) => {
		const row = document.createElement('tr');
		
		let actionBtns = '';
		if (consignment.status === 'Pending') {
			actionBtns = `
				<button class="btn-small success" data-action="approve" data-id="${consignment.id}">Approve</button>
				<button class="btn-small error" data-action="reject" data-id="${consignment.id}">Reject</button>
			`;
		} else if (consignment.status === 'Approved') {
			actionBtns = `<button class="btn-small" data-action="dispatch" data-id="${consignment.id}">Dispatch</button>`;
		}

		row.innerHTML = `
			<td>${consignment.id}</td>
			<td>${consignment.createdAt ? new Date(consignment.createdAt).toLocaleDateString() : '-'}</td>
			<td>${consignment.senderName}</td>
			<td>${consignment.destination}</td>
			<td>${Number(consignment.volume).toFixed(2)} m³</td>
			<td>${formatCurrency(Number(consignment.cost) || 0)}</td>
			<td><span class="status-pill ${statusClass(consignment.status)}">${consignment.status}</span></td>
			<td>${consignment.assignedDriverName || '-'}</td>
			<td class="table-actions">${actionBtns}</td>
		`;

		tbody.appendChild(row);
	});

	// Attach action listeners
	tbody.querySelectorAll('button[data-action]').forEach(btn => {
		btn.onclick = () => handleClerkAction(btn.dataset.action, btn.dataset.id);
	});

	if (dispatchSummary) {
		const activeConsignments = consignments.filter((item) => item.status !== 'Delivered');
		const readyCount = activeConsignments.filter((item) => item.status === 'Ready for Dispatch').length;
		dispatchSummary.textContent = `Dispatch summary: ${readyCount} consignment(s) ready for dispatch out of ${activeConsignments.length} active. Showing ${filteredConsignments.length} result(s).`;
	}
}

// Initialize Driver dashboard features.
function initDriverDashboard(currentUser) {
	if (!checkAccess(['Driver', 'Manager'])) return;
	renderDriverAssignments(currentUser.id);

	const assignmentsBody = document.getElementById('driverAssignmentsBody');
	if (!assignmentsBody) {
		return;
	}

	assignmentsBody.addEventListener('click', (event) => {
		const clickedElement = event.target;
		if (!(clickedElement instanceof HTMLElement)) {
			return;
		}

		if (clickedElement.dataset.action !== 'deliver') {
			return;
		}

		const consignmentId = clickedElement.dataset.consignmentId;
		if (!consignmentId) {
			return;
		}

		markConsignmentAsDelivered(consignmentId, currentUser.id);
		refreshDispatchAssignments();
		renderDriverAssignments(currentUser.id);
	});
}

// Render consignments assigned to the logged-in driver.
function renderDriverAssignments(driverId) {
	const assignmentsBody = document.getElementById('driverAssignmentsBody');
	if (!assignmentsBody) {
		return;
	}

	const consignments = getConsignments();
	const assignedConsignments = consignments.filter((item) => Number(item.assignedDriverId) === Number(driverId));

	assignmentsBody.innerHTML = '';

	if (assignedConsignments.length === 0) {
		assignmentsBody.innerHTML = '<tr><td colspan="8">No deliveries assigned yet.</td></tr>';
		return;
	}

	assignedConsignments.forEach((consignment) => {
		const isDelivered = consignment.status === 'Delivered';
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${consignment.id}</td>
			<td>${consignment.createdAt ? new Date(consignment.createdAt).toLocaleDateString() : '-'}</td>
			<td>${consignment.senderName}</td>
			<td>${consignment.receiverName}</td>
			<td>${consignment.destination}</td>
			<td>${Number(consignment.volume).toFixed(2)} m³</td>
			<td><span class="status-pill ${statusClass(consignment.status)}">${consignment.status}</span></td>
			<td>
				${isDelivered
					? '<span class="muted-text">Completed</span>'
					: `<button class="btn-small" data-action="deliver" data-consignment-id="${consignment.id}">Mark as Delivered</button>`}
			</td>
		`;

		assignmentsBody.appendChild(row);
	});
}

// Mark one assigned consignment as delivered.
function markConsignmentAsDelivered(consignmentId, driverId) {
	const consignments = getConsignments();
	const consignment = consignments.find((item) => item.id === consignmentId);

	if (!consignment) {
		return;
	}

	if (Number(consignment.assignedDriverId) !== Number(driverId)) {
		return;
	}

	const currentTime = new Date().toISOString();
	consignment.status = 'Delivered';
	consignment.deliveredAt = currentTime;

	// Notification for customer
	if (consignment.createdByUserId) {
		addNotification(
			consignment.createdByUserId,
			'Consignment Arrived/Delivered',
			`Your consignment ${consignment.id} has reached its destination ${consignment.destination} and is marked as Delivered.`
		);
	}

	// check if all consignments on that truck are delivered
	if (consignment.assignedTruckId) {
		const truckId = consignment.assignedTruckId;
		const otherConsignments = consignments.filter(c => 
			c.assignedTruckId === truckId && 
			c.status !== 'Delivered'
		);

		if (otherConsignments.length === 0) {
			const trucks = getTrucks();
			const truck = trucks.find(t => t.id === truckId);
			if (truck) {
				truck.status = 'Available';
				truck.currentLocation = consignment.destination;
				truck.idleStartAt = currentTime;
				saveTrucks(trucks);
			}

			// update log if exists
			const logs = getTruckLogs();
			const log = logs.find(l => l.truckId === truckId && !l.arrivedAt);
			if (log) {
				log.arrivedAt = currentTime;
				log.idleStartAt = currentTime;
				saveTruckLogs(logs);
			}
		}
	}

	saveConsignments(consignments);
}

// Recalculate dispatch readiness and simulated driver assignments.
function refreshDispatchAssignments() {
	const consignments = getConsignments();
	if (consignments.length === 0) {
		return;
	}

	const trucks = getTrucks();
	const logs = getTruckLogs();
	const drivers = getUsers().filter((user) => user.role === 'Driver');

	const readyConsignments = consignments.filter((item) => item.status === 'Ready for Dispatch');
	const destinationGroups = new Map();

	readyConsignments.forEach((consignment) => {
		const destination = (consignment.destination || 'Unknown').trim();
		const destinationKey = destination.toLowerCase();

		if (!destinationGroups.has(destinationKey)) {
			destinationGroups.set(destinationKey, {
				destination,
				items: [],
				totalVolume: 0
			});
		}

		const group = destinationGroups.get(destinationKey);
		group.items.push(consignment);
		group.totalVolume += Number(consignment.volume) || 0;
	});

	let changed = false;

	destinationGroups.forEach((group) => {
		// Auto-allotment if destination reaches volume threshold
		const availableTruck = trucks.find(t => t.status === 'Available');
		const availableDriver = drivers.find(u => !consignments.some(c => c.assignedDriverId === u.id && c.status === 'In Transit'));

		if (availableTruck && availableDriver && group.totalVolume >= VOLUME_THRESHOLD) {
			const dispatchTime = new Date().toISOString();
			const consignmentNumbers = [];

			group.items.forEach((consignment) => {
				consignment.status = 'In Transit';
				consignment.assignedTruckId = availableTruck.id;
				consignment.assignedTruckNumber = availableTruck.truckNumber;
				consignment.assignedDriverId = availableDriver.id;
				consignment.assignedDriverName = availableDriver.fullName;
				consignment.dispatchedAt = dispatchTime;
				consignmentNumbers.push(consignment.id);
			});

			availableTruck.status = 'Busy';
			availableTruck.lastAssignedAt = dispatchTime;
			
			logs.push({
				id: Date.now(),
				truckId: availableTruck.id,
				truckNumber: availableTruck.truckNumber,
				destination: group.destination,
				consignmentIds: consignmentNumbers,
				dispatchedAt: dispatchTime,
				totalVolume: group.totalVolume
			});

			changed = true;
		}
	});

	if (changed) {
		saveConsignments(consignments);
		saveTrucks(trucks);
		saveTruckLogs(logs);
	}
}

// Populate manager report cards and destination summary table.
function renderManagerDashboard() {
	const consignments = getConsignments();
	const trucks = getTrucks();
	const logs = getTruckLogs();

	const totalRevenueElement = document.getElementById('totalRevenue');
	const totalConsignmentsElement = document.getElementById('totalConsignments');
	const totalDestinationsElement = document.getElementById('totalDestinations');
	const totalPendingElement = document.getElementById('totalPending');
	const totalReadyElement = document.getElementById('totalReady');
	const totalDeliveredElement = document.getElementById('totalDelivered');
	const truckStatusSummaryElement = document.getElementById('truckStatusSummary');
	const truckStatusBody = document.getElementById('truckStatusBody');
	const consignmentTrackingBody = document.getElementById('consignmentTrackingBody');

	const stats = computeTccStats(consignments, logs);

	if (totalRevenueElement) {
		totalRevenueElement.textContent = formatCurrency(stats.totalRevenue);
	}

	if (totalConsignmentsElement) {
		totalConsignmentsElement.textContent = String(consignments.length);
	}

	if (totalDestinationsElement) {
		totalDestinationsElement.textContent = String(stats.destinations.size);
	}

	if (totalPendingElement) {
		totalPendingElement.textContent = String(stats.pendingCount);
	}

	if (totalReadyElement) {
		totalReadyElement.textContent = String(stats.readyCount);
	}

	if (totalDeliveredElement) {
		totalDeliveredElement.textContent = String(stats.deliveredCount);
	}

	// Average stats (requirement)
	const avgWaitingElement = document.getElementById('avgWaitingPeriod');
	const avgIdleElement = document.getElementById('avgIdleTime');
	if (avgWaitingElement) avgWaitingElement.textContent = stats.avgWaitingTimeText;
	if (avgIdleElement) avgIdleElement.textContent = stats.avgIdleTimeText;

	if (truckStatusSummaryElement) {
		const readyCount = trucks.filter(t => t.status === 'Available').length;
		truckStatusSummaryElement.textContent = `${readyCount} truck(s) available. Allotment threshold: ${VOLUME_THRESHOLD} m³ per destination.`;
	}

	if (truckStatusBody) {
		truckStatusBody.innerHTML = '';
		trucks.forEach(truck => {
			const row = document.createElement('tr');
			row.innerHTML = `
				<td>${truck.truckNumber}</td>
				<td>${truck.currentLocation}</td>
				<td>${truck.status}</td>
				<td>${truck.lastAssignedAt ? new Date(truck.lastAssignedAt).toLocaleString() : '-'}</td>
			`;
			truckStatusBody.appendChild(row);
		});
	}

	if (consignmentTrackingBody) {
		const filteredConsignments = getFilteredManagerConsignments(consignments);
		consignmentTrackingBody.innerHTML = '';

		if (filteredConsignments.length === 0) {
			consignmentTrackingBody.innerHTML = '<tr><td colspan="7">No consignments matched your filters.</td></tr>';
		} else {
			filteredConsignments.forEach((consignment) => {
				const row = document.createElement('tr');
				row.innerHTML = `
					<td>${consignment.id}</td>
					<td>${consignment.createdAt ? new Date(consignment.createdAt).toLocaleDateString() : '-'}</td>
					<td>${consignment.destination || '-'}</td>
					<td>${consignment.receiverName || '-'}</td>
					<td>${Number(consignment.volume || 0).toFixed(2)} m³</td>
					<td><span class="status-pill ${statusClass(consignment.status)}">${consignment.status || 'Pending'}</span></td>
					<td>${consignment.assignedDriverName || '-'}</td>
				`;
				consignmentTrackingBody.appendChild(row);
			});
		}
	}

	renderCharts(consignments);
}

// Chart.js instances - track globally to destroy before re-render
let statusChartInstance = null;
let revenueChartInstance = null;

function renderCharts(consignments) {
	const statusCanvas = document.getElementById('statusChart');
	const revenueCanvas = document.getElementById('revenueChart');
	
	if (!statusCanvas || !revenueCanvas || typeof Chart === 'undefined') return;

	// 1. Prepare Data for Status Donut Chart
	const statusCounts = {
		'Pending': 0,
		'Ready for Dispatch': 0,
		'In Transit': 0,
		'Delivered': 0,
		'Rejected': 0
	};
	consignments.forEach(c => {
		if (statusCounts.hasOwnProperty(c.status)) statusCounts[c.status]++;
	});

	if (statusChartInstance) statusChartInstance.destroy();
	statusChartInstance = new Chart(statusCanvas, {
		type: 'doughnut',
		data: {
			labels: Object.keys(statusCounts),
			datasets: [{
				data: Object.values(statusCounts),
				backgroundColor: ['#fdba74', '#86efac', '#60a5fa', '#7dd3fc', '#f87171'],
				borderWidth: 1
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { position: 'bottom' }
			}
		}
	});

	// 2. Prepare Data for Revenue Bar Chart (by County)
	const revenueByCounty = {};
	consignments.forEach(c => {
		if (c.status !== 'Rejected') {
			const county = c.destination || 'Other';
			const cost = Number(c.cost) || 0;
			revenueByCounty[county] = (revenueByCounty[county] || 0) + cost;
		}
	});

	const counties = Object.keys(revenueByCounty);
	const revenues = Object.values(revenueByCounty);

	if (revenueChartInstance) revenueChartInstance.destroy();
	revenueChartInstance = new Chart(revenueCanvas, {
		type: 'bar',
		data: {
			labels: counties,
			datasets: [{
				label: 'Revenue (KSh)',
				data: revenues,
				backgroundColor: '#2563eb',
				borderRadius: 6
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			scales: {
				y: { beginAtZero: true }
			},
			plugins: {
				legend: { display: false }
			}
		}
	});
}

// Requirement logic helper
function computeTccStats(consignments, logs) {
	let totalRevenue = 0;
	let pendingCount = 0;
	let readyCount = 0;
	let deliveredCount = 0;
	const destinations = new Set();
	let totalWaitTime = 0;
	let deliveredCounter = 0;

	consignments.forEach(c => {
		totalRevenue += c.cost;
		destinations.add(c.destination);
		if (c.status === 'Pending') pendingCount++;
		else if (c.status === 'Ready for Dispatch') readyCount++;
		else if (c.status === 'Delivered') {
			deliveredCount++;
			if (c.created_at && c.deliveredAt) {
				const wait = new Date(c.deliveredAt) - new Date(c.created_at);
				totalWaitTime += wait;
				deliveredCounter++;
			}
		}
	});

	let totalIdleTime = 0;
	let logCounter = 0;
	logs.forEach(l => {
		if (l.idleStartAt && l.arrivedAt) {
			const idle = new Date(l.arrivedAt) - new Date(l.idleStartAt);
			totalIdleTime += idle;
			logCounter++;
		}
	});

	return {
		totalRevenue,
		pendingCount,
		readyCount,
		deliveredCount,
		destinations,
		avgWaitingTimeText: deliveredCounter ? `${(totalWaitTime / deliveredCounter / 3600000).toFixed(1)} hrs` : 'N/A',
		avgIdleTimeText: logCounter ? `${(totalIdleTime / logCounter / 3600000).toFixed(1)} hrs` : 'N/A'
	};
}

// Ensure a default Manager account exists in localStorage.
function ensureDefaultManagerAccount() {
	const users = getUsers();
	const managerEmail = DEFAULT_MANAGER_ACCOUNT.email.toLowerCase();

	const managerExists = users.some((user) => user.email === managerEmail);
	if (managerExists) {
		return;
	}

	const managerUser = {
		id: Date.now(),
		fullName: DEFAULT_MANAGER_ACCOUNT.fullName,
		email: managerEmail,
		password: DEFAULT_MANAGER_ACCOUNT.password,
		role: DEFAULT_MANAGER_ACCOUNT.role,
		createdAt: new Date().toISOString()
	};

	users.push(managerUser);
	saveUsers(users);
}

// Read users safely from localStorage.
function getUsers() {
	const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);

	if (!rawUsers) {
		return [];
	}

	try {
		const parsedUsers = JSON.parse(rawUsers);
		return Array.isArray(parsedUsers) ? parsedUsers : [];
	} catch (error) {
		return [];
	}
}

// Save users to localStorage.
function saveUsers(users) {
	localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Read current user session safely from localStorage.
function getCurrentUser() {
	const rawCurrentUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);

	if (!rawCurrentUser) {
		return null;
	}

	try {
		return JSON.parse(rawCurrentUser);
	} catch (error) {
		return null;
	}
}

// Read consignments list safely from localStorage.
function getConsignments() {
	const rawConsignments = localStorage.getItem(CONSIGNMENTS_STORAGE_KEY);

	if (!rawConsignments) {
		return [];
	}

	try {
		const parsedConsignments = JSON.parse(rawConsignments);
		return Array.isArray(parsedConsignments) ? parsedConsignments : [];
	} catch (error) {
		return [];
	}
}

// Save consignments to localStorage.
function saveConsignments(consignments) {
	localStorage.setItem(CONSIGNMENTS_STORAGE_KEY, JSON.stringify(consignments));
}

// Get destination rate with fallback value.
function getRateForDestination(destination) {
	const key = destination.trim().toLowerCase();
	return DESTINATION_RATES[key] || DEFAULT_RATE;
}

// Create a simple unique consignment ID.
function generateConsignmentId() {
	const randomPart = Math.floor(Math.random() * 900 + 100);
	return `CNS-${Date.now()}-${randomPart}`;
}

function initCustomerDashboard(currentUser) {
	if (!checkAccess(['Customer', 'Manager'])) return;
	const form = document.getElementById('customerConsignmentForm');
	if (!form) return;

	const messageBox = document.getElementById('customerMessage');
	const billingResult = document.getElementById('customerBillingResult');

	renderCustomerConsignments(currentUser.id);
	renderCustomerNotifications(currentUser.id);

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		clearInlineErrors(form);

		const receiverNameInput = document.getElementById('customerReceiverName');
		const receiverAddressInput = document.getElementById('customerReceiverAddress');
		const destinationSelect = document.getElementById('customerDestination');
		const volumeInput = document.getElementById('customerVolume');

		const receiverName = receiverNameInput.value.trim();
		const receiverAddress = receiverAddressInput.value.trim();
		const destination = destinationSelect.value.trim();
		const volume = Number(volumeInput.value);

		let hasError = false;

		if (!receiverName) {
			setInlineError(receiverNameInput, 'Receiver Name is required.');
			hasError = true;
		} else if (receiverName.length < 2) {
			setInlineError(receiverNameInput, 'Receiver Name must be at least 2 characters.');
			hasError = true;
		}

		if (!receiverAddress) {
			setInlineError(receiverAddressInput, 'Receiver Address is required.');
			hasError = true;
		} else if (receiverAddress.length < 5) {
			setInlineError(receiverAddressInput, 'Receiver Address must be at least 5 characters.');
			hasError = true;
		}

		if (!destination) {
			setInlineError(destinationSelect, 'Please select a destination county.');
			hasError = true;
		}

		if (volumeInput.value === '') {
			setInlineError(volumeInput, 'Volume is required.');
			hasError = true;
		} else if (isNaN(volume) || volume <= 0) {
			setInlineError(volumeInput, 'Volume must be greater than 0.');
			hasError = true;
		}

		if (hasError) {
			showMessage(messageBox, 'Please fix the errors below.', 'error');
			return;
		}

		const rate = getRateForDestination(destination);
		const cost = volume * rate;

		const consignments = getConsignments();
		consignments.push({
			id: generateConsignmentId(),
			senderName: currentUser.fullName,
			senderAddress: 'Customer Provided',
			receiverName,
			receiverAddress,
			destination,
			volume,
			cost,
			status: 'Pending',
			createdByUserId: currentUser.id,
			createdAt: new Date().toISOString()
		});

		saveConsignments(consignments);
		// Update dispatch assignments logic removed from here as Clerk now handles assignment
		// refreshDispatchAssignments(); 

		showMessage(messageBox, 'Consignment submitted successfully. A Clerk will review and assign a driver shortly.', 'success');
		if (billingResult) {
			billingResult.textContent = `Estimated Billing: ${volume.toFixed(2)} m³ × KSh ${rate.toFixed(2)} = ${formatCurrency(cost)}`;
		}

		form.reset();
		renderCustomerConsignments(currentUser.id);
		renderCustomerNotifications(currentUser.id);
	});
}

function renderCustomerNotifications(userId) {
	const notificationsList = document.getElementById('notificationsList');
	if (!notificationsList) return;

	const allNotifications = getNotifications();
	const userNotifications = allNotifications
		.filter(n => n.userId === userId)
		.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

	if (userNotifications.length === 0) {
		notificationsList.innerHTML = '<p class="muted-text">No new notifications.</p>';
		return;
	}

	notificationsList.innerHTML = userNotifications.map(n => `
		<div class="notification-item ${n.read ? 'read' : 'unread'}">
			<div class="notification-header">
				<strong>${n.title}</strong>
				<span class="notification-time">${new Date(n.timestamp).toLocaleString()}</span>
			</div>
			<div class="notification-body">${n.message}</div>
		</div>
	`).join('');

	// Automatically mark all as read after display for simplicity
	const updatedNotifications = allNotifications.map(n => {
		if (n.userId === userId) {
			return { ...n, read: true };
		}
		return n;
	});
	saveNotifications(updatedNotifications);
}

function renderCustomerConsignments(userId) {
	const tbody = document.getElementById('customerConsignmentsBody');
	if (!tbody) return;

	const consignments = getConsignments().filter(c => c.createdByUserId === userId);
	tbody.innerHTML = '';

	if (consignments.length === 0) {
		tbody.innerHTML = '<tr><td colspan="6">You have no consignments yet.</td></tr>';
		return;
	}

	consignments.forEach(c => {
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${c.id}</td>
			<td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
			<td>${c.receiverName}</td>
			<td>${c.destination}</td>
			<td>${c.volume.toFixed(2)} m³</td>
			<td><span class="status-pill ${statusClass(c.status)}">${c.status}</span></td>
		`;
		tbody.appendChild(row);
	});
}

// Map status value to status badge class.
function statusClass(status) {
	if (status === 'Delivered') {
		return 'status-delivered';
	}

	if (status === 'Ready for Dispatch') {
		return 'status-ready';
	}

	return 'status-pending';
}

// Format currency values.
function formatCurrency(amount) {
	return `KSh ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Validate email format.
function isValidEmail(email) {
	return /^[a-zA-Z0-0._%+-]+@[a-zA-Z0-0.-]+\.[a-zA-Z]{2,}$/.test(String(email || '').trim().toLowerCase());
}

// Validate full name.
function isValidName(name) {
	return /^[A-Za-z][A-Za-z\s'.-]{1,}$/.test(String(name || '').trim());
}

// Validate address text.
function isValidAddress(address) {
	return String(address || '').trim().length >= 5;
}

// Validate destination text.
function isValidDestination(destination) {
	return String(destination || '').trim().length >= 2;
}

// Remove all inline field errors inside a form.
function clearInlineErrors(formElement) {
	if (!formElement) {
		return;
	}

	const invalidFields = formElement.querySelectorAll('.input-invalid');
	invalidFields.forEach((field) => {
		field.classList.remove('input-invalid');
	});

	const errorElements = formElement.querySelectorAll('.field-error');
	errorElements.forEach((errorElement) => {
		errorElement.remove();
	});
}

// Show inline field error text for an input/select.
function setInlineError(fieldElement, message) {
	if (!fieldElement || !message) {
		return;
	}

	fieldElement.classList.add('input-invalid');

	const parentGroup = fieldElement.closest('.form-group');
	if (!parentGroup) {
		return;
	}

	const existingError = parentGroup.querySelector('.field-error');
	if (existingError) {
		existingError.textContent = message;
		return;
	}

	const errorText = document.createElement('p');
	errorText.className = 'field-error';
	errorText.textContent = message;
	parentGroup.appendChild(errorText);
}

// Escape values for CSV columns.
function escapeCsv(value) {
	return String(value ?? '').replace(/"/g, '""');
}

// Escape values for generated HTML report.
function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// Show a success or error message in the UI.
function showMessage(element, message, type) {
	if (!element) {
		return;
	}

	element.textContent = message;
	element.className = `message ${type}`;
}

// Clear a message box.
function clearMessage(element) {
	if (!element) {
		return;
	}

	element.className = 'message';
	element.textContent = '';
}

// Set role notice style and text.
function setRoleNotice(element, message, type) {
	if (!element) {
		return;
	}

	element.className = `card role-notice ${type}`;
	element.textContent = message;
}

