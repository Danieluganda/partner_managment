// Quick test for master register view/edit functionality
// Run this in browser console

console.log('🔍 Testing Master Register View/Edit Functionality');

// Check if data is loaded
console.log('1. Checking data availability...');
if (window.masterRegisterData) {
    console.log('✅ masterRegisterData found:', Object.keys(window.masterRegisterData));
    if (window.masterRegisterData.masterRegister) {
        console.log('✅ masterRegister array found:', window.masterRegisterData.masterRegister.length, 'items');
        console.log('Sample partner:', window.masterRegisterData.masterRegister[0]);
    }
} else {
    console.log('❌ masterRegisterData not found');
}

// Check if table exists and has data
console.log('\n2. Checking table...');
const table = document.getElementById('master-register-table');
if (table) {
    const rows = table.querySelectorAll('tbody tr');
    console.log('✅ Table found with', rows.length, 'rows');
    
    if (rows.length > 0) {
        const firstRow = rows[0];
        const partnerId = firstRow.cells[0].textContent.trim();
        console.log('First partner ID in table:', partnerId);
        
        // Test view function
        console.log('\n3. Testing view function...');
        try {
            if (typeof window.viewPartner === 'function') {
                console.log('✅ viewPartner function exists');
                // Don't actually call it in this test script
                console.log('Ready to test viewPartner("' + partnerId + '")');
            } else {
                console.log('❌ viewPartner function not found');
            }
        } catch (error) {
            console.log('❌ Error testing view function:', error);
        }
        
        // Test edit link
        console.log('\n4. Testing edit links...');
        const editLink = firstRow.querySelector('a[href*="/edit"]');
        if (editLink) {
            console.log('✅ Edit link found:', editLink.href);
        } else {
            console.log('❌ Edit link not found');
        }
    }
} else {
    console.log('❌ Table not found');
}

console.log('\n✨ Test complete!');