// Storage keys for users, active session, and consignments.
const USERS_STORAGE_KEY = 'tcc_users';
const CURRENT_USER_STORAGE_KEY = 'tcc_current_user';
const CONSIGNMENTS_STORAGE_KEY = 'tcc_consignments';

const MANAGED_ROLES = ['Clerk', 'Driver'];

// Default Manager account required by the system.
const DEFAULT_MANAGER_ACCOUNT = {
	fullName: 'System Manager',
	email: 'admin@tcc.com',
	password: 'admin123',
	role: 'Manager'
};

// Billing rates per destination (simple setup).
const DESTINATION_RATES = {
	accra: 12,
	kumasi: 14,
	takoradi: 16,
	tamale: 18,
	koforidua: 13,
	sunyani: 15
};

const DEFAULT_RATE = 10;

// Run page-specific setup once the HTML is loaded.
document.addEventListener('DOMContentLoaded', () => {
	ensureDefaultManagerAccount();
	initLoginPage();
	initDashboardPage();
});

// Initialize login behavior.
function initLoginPage() {
	const loginForm = document.getElementById('loginForm');

	if (!loginForm) {
		return;
	}

	const messageBox = document.getElementById('loginMessage');

	loginForm.addEventListener('submit', (event) => {
		event.preventDefault();

		const email = document.getElementById('loginEmail').value.trim().toLowerCase();
		const password = document.getElementById('loginPassword').value;

		if (!email || !password) {
			showMessage(messageBox, 'Please enter email and password.', 'error');
			return;
		}

		const users = getUsers();
		const matchedUser = users.find((user) => user.email === email && user.password === password);

		if (!matchedUser) {
			showMessage(messageBox, 'Invalid email or password.', 'error');
			return;
		}

		localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify({
			id: matchedUser.id,
			fullName: matchedUser.fullName,
			email: matchedUser.email,
			role: matchedUser.role
		}));

		showMessage(messageBox, 'Login successful. Redirecting to dashboard...', 'success');

		setTimeout(() => {
			window.location.href = 'dashboard.html';
		}, 600);
	});
}

// Initialize dashboard and route user to role-specific view.
function initDashboardPage() {
	const dashboardLayout = document.querySelector('.dashboard-layout');

	if (!dashboardLayout) {
		return;
	}

	const currentUser = getCurrentUser();
	if (!currentUser) {
		window.location.href = 'index.html';
		return;
	}

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

	// Recalculate dispatch status and assignment each time dashboard loads.
	refreshDispatchAssignments();
	applyRoleVisibility(currentUser.role);

	if (currentUser.role === 'Manager') {
		setRoleNotice(roleNotice, 'Manager dashboard active: users, reports, truck status, and consignment tracking.', 'success');
		initManagerUserManagement();
		initManagerTrackingControls();
		renderManagerDashboard();
		return;
	}

	if (currentUser.role === 'Clerk') {
		setRoleNotice(roleNotice, 'Clerk dashboard active: add consignments, billing, and view consignments.', 'info');
		initClerkDashboard(currentUser);
		renderClerkConsignmentsTable();
		return;
	}

	if (currentUser.role === 'Driver') {
		setRoleNotice(roleNotice, 'Driver dashboard active: view assigned deliveries and update status.', 'info');
		initDriverDashboard(currentUser);
		return;
	}

	setRoleNotice(roleNotice, 'Unknown role. Please contact the Manager.', 'warning');
}

// Show only the section and menu items for the logged-in role.
function applyRoleVisibility(role) {
	const roleSections = {
		Manager: document.getElementById('managerSection'),
		Clerk: document.getElementById('clerkSection'),
		Driver: document.getElementById('driverSection')
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

// Initialize Manager-only user management features.
function initManagerUserManagement() {
	const manageUserForm = document.getElementById('manageUserForm');
	const managedUsersBody = document.getElementById('managedUsersBody');

	if (!manageUserForm || !managedUsersBody) {
		return;
	}

	const messageBox = document.getElementById('manageUserMessage');
	const managedUserId = document.getElementById('managedUserId');
	const fullNameInput = document.getElementById('managedFullName');
	const emailInput = document.getElementById('managedEmail');
	const passwordInput = document.getElementById('managedPassword');
	const roleInput = document.getElementById('managedRole');
	const addUserBtn = document.getElementById('addUserBtn');
	const cancelEditBtn = document.getElementById('cancelEditUserBtn');

	renderManagedUsersTable();

	manageUserForm.addEventListener('submit', (event) => {
		event.preventDefault();

		const fullName = fullNameInput.value.trim();
		const email = emailInput.value.trim().toLowerCase();
		const password = passwordInput.value;
		const role = roleInput.value;
		const editingId = Number(managedUserId.value || 0);

		if (!fullName || !email || !password || !role) {
			showMessage(messageBox, 'Please fill in all fields.', 'error');
			return;
		}

		if (!MANAGED_ROLES.includes(role)) {
			showMessage(messageBox, 'Role must be Clerk or Driver.', 'error');
			return;
		}

		const users = getUsers();
		const duplicateUser = users.find((user) => user.email === email && user.id !== editingId);
		if (duplicateUser) {
			showMessage(messageBox, 'This email is already used by another account.', 'error');
			return;
		}

		if (editingId) {
			const targetUser = users.find((user) => user.id === editingId);
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

			showMessage(messageBox, 'User added successfully.', 'success');
		}

		saveUsers(users);
		manageUserForm.reset();
		managedUserId.value = '';
		addUserBtn.textContent = 'Add User';
		cancelEditBtn.hidden = true;

		refreshDispatchAssignments();
		renderManagedUsersTable();
		renderManagerDashboard();
	});

	managedUsersBody.addEventListener('click', (event) => {
		const clickedElement = event.target;
		if (!(clickedElement instanceof HTMLElement)) {
			return;
		}

		const userIdValue = clickedElement.dataset.userId;
		if (!userIdValue) {
			return;
		}

		const userId = Number(userIdValue);
		if (!userId) {
			return;
		}

		if (clickedElement.dataset.action === 'delete') {
			deleteManagedUser(userId, messageBox);
			refreshDispatchAssignments();
			renderManagedUsersTable();
			renderManagerDashboard();
			return;
		}

		if (clickedElement.dataset.action === 'edit') {
			const users = getUsers();
			const targetUser = users.find((user) => user.id === userId);

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
		}
	});

	cancelEditBtn.addEventListener('click', () => {
		manageUserForm.reset();
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
	const targetUser = users.find((user) => user.id === userId);

	if (!targetUser) {
		showMessage(messageBox, 'User not found.', 'error');
		return;
	}

	if (targetUser.role === 'Manager') {
		showMessage(messageBox, 'Manager account cannot be deleted from this section.', 'error');
		return;
	}

	const filteredUsers = users.filter((user) => user.id !== userId);
	saveUsers(filteredUsers);
	showMessage(messageBox, 'User deleted successfully.', 'success');
}

// Initialize Clerk dashboard features.
function initClerkDashboard(currentUser) {
	const form = document.getElementById('clerkConsignmentForm');
	if (!form) {
		return;
	}

	const messageBox = document.getElementById('clerkMessage');
	const billingResult = document.getElementById('clerkBillingResult');

	form.addEventListener('submit', (event) => {
		event.preventDefault();

		const senderName = document.getElementById('senderName').value.trim();
		const senderAddress = document.getElementById('senderAddress').value.trim();
		const receiverName = document.getElementById('receiverName').value.trim();
		const receiverAddress = document.getElementById('receiverAddress').value.trim();
		const destination = document.getElementById('destination').value.trim();
		const volume = Number(document.getElementById('volume').value);

		if (!senderName || !senderAddress || !receiverName || !receiverAddress || !destination || !volume) {
			showMessage(messageBox, 'Please fill in all fields.', 'error');
			return;
		}

		if (volume <= 0) {
			showMessage(messageBox, 'Volume must be greater than 0.', 'error');
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
			assignedDriverId: null,
			assignedDriverName: null,
			createdByUserId: currentUser.id,
			createdAt: new Date().toISOString()
		});

		saveConsignments(consignments);
		refreshDispatchAssignments();

		showMessage(messageBox, 'Consignment saved successfully.', 'success');
		if (billingResult) {
			billingResult.textContent = `Billing: ${volume.toFixed(2)} m³ × GHS ${rate.toFixed(2)} = ${formatCurrency(cost)}`;
		}

		form.reset();
		renderClerkConsignmentsTable();
	});
}

// Render consignments table for Clerk view.
function renderClerkConsignmentsTable() {
	const tbody = document.getElementById('clerkConsignmentsBody');
	const dispatchSummary = document.getElementById('clerkDispatchSummary');

	if (!tbody) {
		return;
	}

	const consignments = getConsignments();
	tbody.innerHTML = '';

	if (consignments.length === 0) {
		tbody.innerHTML = '<tr><td colspan="7">No consignments found.</td></tr>';
		if (dispatchSummary) {
			dispatchSummary.textContent = 'Dispatch summary: no consignments yet.';
		}
		return;
	}

	consignments.forEach((consignment) => {
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${consignment.id}</td>
			<td>${consignment.senderName}</td>
			<td>${consignment.receiverName}</td>
			<td>${consignment.destination}</td>
			<td>${Number(consignment.volume).toFixed(2)} m³</td>
			<td>${formatCurrency(Number(consignment.cost) || 0)}</td>
			<td><span class="status-pill ${statusClass(consignment.status)}">${consignment.status}</span></td>
		`;

		tbody.appendChild(row);
	});

	if (dispatchSummary) {
		const activeConsignments = consignments.filter((item) => item.status !== 'Delivered');
		const readyCount = activeConsignments.filter((item) => item.status === 'Ready for Dispatch').length;
		dispatchSummary.textContent = `Dispatch summary: ${readyCount} consignment(s) ready for dispatch out of ${activeConsignments.length} active.`;
	}
}

// Initialize Driver dashboard features.
function initDriverDashboard(currentUser) {
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
		assignmentsBody.innerHTML = '<tr><td colspan="7">No deliveries assigned yet.</td></tr>';
		return;
	}

	assignedConsignments.forEach((consignment) => {
		const isDelivered = consignment.status === 'Delivered';
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${consignment.id}</td>
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

	consignment.status = 'Delivered';
	saveConsignments(consignments);
}

// Recalculate dispatch readiness and simulated driver assignments.
function refreshDispatchAssignments() {
	const consignments = getConsignments();
	if (consignments.length === 0) {
		return;
	}

	const drivers = getUsers().filter((user) => user.role === 'Driver');
	const activeConsignments = consignments.filter((item) => item.status !== 'Delivered');
	const destinationGroups = new Map();

	activeConsignments.forEach((consignment) => {
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

	const sortedGroups = Array.from(destinationGroups.values()).sort((a, b) =>
		a.destination.localeCompare(b.destination)
	);

	sortedGroups.forEach((group, index) => {
		const readyForDispatch = group.totalVolume >= 500;
		const assignedDriver = readyForDispatch && drivers.length > 0 ? drivers[index % drivers.length] : null;

		group.items.forEach((consignment) => {
			consignment.status = readyForDispatch ? 'Ready for Dispatch' : 'Pending';
			consignment.assignedDriverId = assignedDriver ? assignedDriver.id : null;
			consignment.assignedDriverName = assignedDriver ? assignedDriver.fullName : null;
		});
	});

	saveConsignments(consignments);
}

// Populate manager report cards and destination summary table.
function renderManagerDashboard() {
	const consignments = getConsignments();
	const totalRevenueElement = document.getElementById('totalRevenue');
	const totalConsignmentsElement = document.getElementById('totalConsignments');
	const totalDestinationsElement = document.getElementById('totalDestinations');
	const totalPendingElement = document.getElementById('totalPending');
	const totalReadyElement = document.getElementById('totalReady');
	const totalDeliveredElement = document.getElementById('totalDelivered');
	const truckStatusSummaryElement = document.getElementById('truckStatusSummary');
	const truckStatusBody = document.getElementById('truckStatusBody');
	const consignmentTrackingBody = document.getElementById('consignmentTrackingBody');
	const searchInput = document.getElementById('managerTrackSearch');
	const statusSelect = document.getElementById('managerTrackStatus');

	const destinationMap = new Map();
	let totalRevenue = 0;
	let pendingCount = 0;
	let readyCount = 0;
	let deliveredCount = 0;

	consignments.forEach((consignment) => {
		const status = consignment.status || 'Pending';
		totalRevenue += Number(consignment.cost) || 0;

		if (status === 'Delivered') {
			deliveredCount += 1;
		} else if (status === 'Ready for Dispatch') {
			readyCount += 1;
		} else {
			pendingCount += 1;
		}

		const destination = consignment.destination || 'Unknown';
		const volume = Number(consignment.volume) || 0;

		if (!destinationMap.has(destination)) {
			destinationMap.set(destination, {
				totalVolume: 0,
				hasReady: false,
				assignedDriverName: null
			});
		}

		const entry = destinationMap.get(destination);
		entry.totalVolume += volume;
		if (status === 'Ready for Dispatch') {
			entry.hasReady = true;
			entry.assignedDriverName = consignment.assignedDriverName || entry.assignedDriverName;
		}
	});

	if (totalRevenueElement) {
		totalRevenueElement.textContent = formatCurrency(totalRevenue);
	}

	if (totalConsignmentsElement) {
		totalConsignmentsElement.textContent = String(consignments.length);
	}

	if (totalDestinationsElement) {
		totalDestinationsElement.textContent = String(destinationMap.size);
	}

	if (totalPendingElement) {
		totalPendingElement.textContent = String(pendingCount);
	}

	if (totalReadyElement) {
		totalReadyElement.textContent = String(readyCount);
	}

	if (totalDeliveredElement) {
		totalDeliveredElement.textContent = String(deliveredCount);
	}

	const readyTruckCount = Array.from(destinationMap.values()).filter((details) => details.totalVolume >= 500).length;
	if (truckStatusSummaryElement) {
		if (destinationMap.size === 0) {
			truckStatusSummaryElement.textContent = 'No active consignments yet. Truck status will appear when consignments are added.';
		} else {
			const driverCount = getUsers().filter((user) => user.role === 'Driver').length;
			truckStatusSummaryElement.textContent = `${readyTruckCount} destination(s) ready for dispatch (volume ≥ 500). Drivers available: ${driverCount}.`;
		}
	}

	if (truckStatusBody) {
		truckStatusBody.innerHTML = '';

		if (destinationMap.size === 0) {
			truckStatusBody.innerHTML = '<tr><td colspan="4">No truck status data available yet.</td></tr>';
		} else {
			for (const [destination, details] of destinationMap.entries()) {
				const isReady = details.totalVolume >= 500;
				const row = document.createElement('tr');
				if (isReady) {
					row.classList.add('row-ready');
				}

				row.innerHTML = `
					<td>${destination}</td>
					<td>${details.totalVolume.toFixed(2)} m³</td>
					<td>${isReady ? 'Ready for Dispatch' : 'Pending'}</td>
					<td>${details.assignedDriverName || '-'}</td>
				`;

				truckStatusBody.appendChild(row);
			}
		}
	}

	if (!consignmentTrackingBody) {
		return;
	}

	const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
	const selectedStatus = statusSelect ? statusSelect.value : '';

	const filteredConsignments = consignments.filter((consignment) => {
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

	consignmentTrackingBody.innerHTML = '';

	if (filteredConsignments.length === 0) {
		consignmentTrackingBody.innerHTML = '<tr><td colspan="6">No consignments matched your filters.</td></tr>';
		return;
	}

	filteredConsignments.forEach((consignment) => {
		const row = document.createElement('tr');
		row.innerHTML = `
			<td>${consignment.id}</td>
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
	return `GHS ${Number(amount).toFixed(2)}`;
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

