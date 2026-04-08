// Function to perform a clean reset of the database for troubleshooting
function dbForceReset() {
    const defaultTrucks = [
        { id: 1, truckNumber: "TCC-001", status: "Available", currentLocation: "Nairobi", lastAssignedAt: null },
        { id: 2, truckNumber: "TCC-002", status: "Available", currentLocation: "Nairobi", lastAssignedAt: null },
        { id: 3, truckNumber: "TCC-003", status: "Available", currentLocation: "Nairobi", lastAssignedAt: null },
        { id: 4, truckNumber: "TCC-004", status: "Available", currentLocation: "Nairobi", lastAssignedAt: null },
        { id: 5, truckNumber: "TCC-005", status: "Available", currentLocation: "Nairobi", lastAssignedAt: null }
    ];
    
    const adminUser = [
        { id: 100, fullName: "System Admin", email: "admin@tcc.com", password: "admin", role: "Manager" }
    ];

    localStorage.setItem('tcc_trucks', JSON.stringify(defaultTrucks));
    localStorage.setItem('tcc_users', JSON.stringify(adminUser));
    localStorage.setItem('tcc_consignments', JSON.stringify([]));
    localStorage.setItem('tcc_truck_logs', JSON.stringify([]));
    
    console.log("Database reset completed successfully.");
    alert("Database has been reset. Logging out...");
    localStorage.removeItem('tcc_current_user');
    window.location.href = 'index.html';
}
