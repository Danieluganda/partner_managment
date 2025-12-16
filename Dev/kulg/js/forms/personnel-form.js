document.addEventListener('DOMContentLoaded', function() {
    const partnerTypeSelect = document.getElementById('partnerType');
    const partnerSelect = document.getElementById('partnerId');
    const partnerNameInput = document.getElementById('partnerName');
    const partnerStatusInput = document.getElementById('partnerStatus');

    // Get partners data from window (populated by EJS)
    const internalPartners = window.partnersData || [];
    const externalPartners = window.externalPartnersData || [];

    function populatePartnerDropdown(type) {
        partnerSelect.innerHTML = '<option value="">Select Partner</option>';
        let partners = [];
        if (type === 'internal') {
            partners = internalPartners;
        } else if (type === 'external') {
            partners = externalPartners;
        }
        partners.forEach(partner => {
            const name = partner.partnerName || partner.name || 'Unnamed Partner';
            const id = partner.partnerId || partner.id || 'No ID';
            partnerSelect.innerHTML += `<option value="${partner.id}">${name} (${id})</option>`;
        });
        partnerSelect.disabled = partners.length === 0;
        partnerNameInput.value = '';
        partnerStatusInput.value = '';
    }

    partnerTypeSelect.addEventListener('change', function() {
        populatePartnerDropdown(this.value);
    });

    partnerSelect.addEventListener('change', function() {
        const type = partnerTypeSelect.value;
        let partners = type === 'internal' ? internalPartners : externalPartners;
        const selected = partners.find(p => String(p.id) === String(this.value));
        if (selected) {
            partnerNameInput.value = selected.partnerName || selected.name || '';
            partnerStatusInput.value = selected.contractStatus || selected.status || '';
        } else {
            partnerNameInput.value = '';
            partnerStatusInput.value = '';
        }
    });

    // If editing, pre-populate the dropdown and fields
    if (window.editMode === 'true' && window.personnelData) {
        populatePartnerDropdown(window.personnelData.partnerType);
        partnerSelect.value = window.personnelData.partnerId;
        partnerNameInput.value = window.personnelData.partnerName || '';
        partnerStatusInput.value = window.personnelData.partnerStatus || '';
        partnerSelect.disabled = false;
    }
});