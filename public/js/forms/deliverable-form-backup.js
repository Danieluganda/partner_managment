// Enhanced Deliverable Form JavaScript
console.log('=== DELIVERABLE FORM SCRIPT LOADING ===');

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CONTENT LOADED ===');
    
    // Form elements
    const form = document.getElementById('deliverableForm');
    const submitBtn = document.getElementById('submitBtn');
    const completionRange = document.getElementById('completionRange');
    const completionInput = document.getElementById('completionPercentage');
    const progressFill = document.getElementById('progressFill');
    
    // Partner selection elements
    const partnerSelectWrapper = document.getElementById('partnerSelectWrapper');
    const partnerSearch = document.getElementById('partnerSearch');
    const partnerDropdown = document.getElementById('partnerDropdown');
    const partnerFilterInput = document.getElementById('partnerFilterInput');
    const partnerOptions = document.getElementById('partnerOptions');
    const partnerIdInput = document.getElementById('partnerId');
    const partnerNameInput = document.getElementById('partnerName');
    
    console.log('=== ELEMENTS CHECK ===');
    console.log('form:', !!form);
    console.log('partnerSelectWrapper:', !!partnerSelectWrapper);
    console.log('partnerSearch:', !!partnerSearch);
    console.log('partnerDropdown:', !!partnerDropdown);
    console.log('partnerOptions:', !!partnerOptions);
    
    let isDropdownOpen = false;
    let selectedPartner = null;
    let isEditMode = false;
    let isSubmitting = false;
    
    // Initialize the form
    init();
    
    function init() {
        console.log('=== DELIVERABLE FORM DEBUGGING ===');
        console.log('Form element:', form);
        console.log('Partner elements found:');
        console.log('- partnerSelectWrapper:', partnerSelectWrapper);
        console.log('- partnerSearch:', partnerSearch);
        console.log('- partnerDropdown:', partnerDropdown);
        console.log('- partnerOptions:', partnerOptions);
        
        // Check if we're in edit mode
        if (form) {
            isEditMode = form.querySelector('input[name="_method"]') !== null;
        }
        
        // Check for partner data
        console.log('Partner data available:');
        console.log('- window.partnersData:', window.partnersData);
        console.log('- window.externalPartnersData:', window.externalPartnersData);
        
        setupPartnerSelection();
        setupProgressSync();
        setupFormValidation();
        bindEvents();
        
        // Load existing deliverable data if editing
        if (window.deliverableData) {
            loadDeliverableData(window.deliverableData);
        }
        
        console.log('Enhanced deliverable form initialized', { isEditMode });
        console.log('=== END DEBUGGING ===');
    }
    
    function setupPartnerSelection() {
        console.log('Setting up partner selection...');
        console.log('partnerSelectWrapper:', partnerSelectWrapper);
        console.log('partnerSearch:', partnerSearch);
        console.log('partnerDropdown:', partnerDropdown);
        
        if (!partnerSelectWrapper || !partnerSearch || !partnerDropdown) {
            console.error('Partner selection elements not found');
            console.error('Missing elements:', {
                partnerSelectWrapper: !partnerSelectWrapper,
                partnerSearch: !partnerSearch,
                partnerDropdown: !partnerDropdown
            });
            return;
        }
        
        console.log('All partner selection elements found');
        
        // Set initial selected partner if editing
        if (partnerIdInput && partnerIdInput.value && partnerNameInput && partnerNameInput.value) {
            selectedPartner = {
                id: partnerIdInput.value,
                name: partnerNameInput.value
            };
            partnerSearch.value = partnerNameInput.value;
            updateSelectedPartner();
        }
        
        // Partner search click handler
        partnerSearch.addEventListener('click', function(e) {
            console.log('Partner search clicked');
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown();
        });
        
        // Partner search focus handler
        partnerSearch.addEventListener('focus', function(e) {
            console.log('Partner search focused');
            openDropdown();
        });
        
        // Prevent typing in the search field - make it behave like a select
        partnerSearch.addEventListener('keydown', function(e) {
            // Allow tab, escape, and arrow keys
            if (!['Tab', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDropdown();
            }
        });
        
        // Filter input for searching partners
        if (partnerFilterInput) {
            partnerFilterInput.addEventListener('input', function() {
                filterPartners(this.value);
            });
        }
        
        // Partner option click handlers
        if (partnerOptions) {
            const options = partnerOptions.querySelectorAll('.partner-option');
            console.log('Found partner options:', options.length);
            options.forEach(option => {
                option.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Partner option clicked:', this.dataset);
                    selectPartner({
                        id: this.dataset.value,
                        name: this.dataset.name,
                        partnerId: this.dataset.partnerId,
                        type: this.dataset.type
                    });
                    closeDropdown();
                });
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!partnerSelectWrapper.contains(event.target)) {
                closeDropdown();
            }
        });
        
        // Keyboard navigation
        if (partnerFilterInput) {
            partnerFilterInput.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    closeDropdown();
                    partnerSearch.focus();
                }
            });
        }
    }
    
    function toggleDropdown() {
        console.log('toggleDropdown called, isDropdownOpen:', isDropdownOpen);
        if (isDropdownOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }
    
    function openDropdown() {
        console.log('openDropdown called');
        isDropdownOpen = true;
        
        console.log('Adding open class to:', partnerSelectWrapper);
        partnerSelectWrapper.classList.add('open');
        
        console.log('Setting dropdown display to block:', partnerDropdown);
        partnerDropdown.style.display = 'block';
        
        console.log('Dropdown should now be visible');
        console.log('partnerSelectWrapper classes:', partnerSelectWrapper.className);
        console.log('partnerDropdown style.display:', partnerDropdown.style.display);
        
        // Focus on filter input and clear it
        setTimeout(() => {
            if (partnerFilterInput) {
                console.log('Focusing filter input');
                partnerFilterInput.focus();
                partnerFilterInput.value = '';
                filterPartners('');
            }
        }, 100);
    }
    
    function closeDropdown() {
        console.log('closeDropdown called');
        isDropdownOpen = false;
        partnerSelectWrapper.classList.remove('open');
        partnerDropdown.style.display = 'none';
        console.log('Dropdown closed');
    }
    
    function filterPartners(searchTerm) {
        if (!partnerOptions) return;
        
        const term = searchTerm.toLowerCase();
        const options = partnerOptions.querySelectorAll('.partner-option');
        let hasVisibleOptions = false;
        
        options.forEach(option => {
            const name = option.dataset.name.toLowerCase();
            const type = option.dataset.type.toLowerCase();
            const isMatch = name.includes(term) || type.includes(term);
            
            if (isMatch) {
                option.classList.remove('hidden');
                hasVisibleOptions = true;
            } else {
                option.classList.add('hidden');
            }
        });
        
        // Show/hide option groups based on visible options
        const groups = partnerOptions.querySelectorAll('.option-group');
        groups.forEach(group => {
            const visibleOptions = group.querySelectorAll('.partner-option:not(.hidden)');
            if (visibleOptions.length === 0) {
                group.style.display = 'none';
            } else {
                group.style.display = 'block';
            }
        });
    }
    
    function selectPartner(partner) {
        selectedPartner = partner;
        partnerSearch.value = partner.name;
        
        if (partnerIdInput) partnerIdInput.value = partner.id;
        if (partnerNameInput) partnerNameInput.value = partner.name;
        
        // Clear any previous validation errors
        partnerSearch.classList.remove('error');
        
        updateSelectedPartner();
        
        console.log('Selected partner:', partner);
    }
    
    function updateSelectedPartner() {
        if (!partnerOptions || !selectedPartner) return;
        
        // Update visual state of selected option
        const options = partnerOptions.querySelectorAll('.partner-option');
        options.forEach(option => {
            if (option.dataset.value === selectedPartner.id) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }
    
    function setupProgressSync() {
        if (!completionRange || !completionInput || !progressFill) return;
        
        // Sync range slider with number input
        completionRange.addEventListener('input', function() {
            const value = this.value;
            completionInput.value = value;
            updateProgressBar(value);
        });
        
        // Sync number input with range slider
        completionInput.addEventListener('input', function() {
            let value = parseInt(this.value) || 0;
            value = Math.max(0, Math.min(100, value)); // Clamp between 0-100
            this.value = value;
            completionRange.value = value;
            updateProgressBar(value);
        });
        
        // Initial progress bar update
        updateProgressBar(completionInput.value || 0);
    }
    
    function updateProgressBar(percentage) {
        if (!progressFill) return;
        progressFill.style.width = percentage + '%';
    }
    
    function setupFormValidation() {
        if (!form) return;
        
        // Real-time validation
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', function() {
                validateField(this);
            });
            
            field.addEventListener('input', function() {
                if (this.classList.contains('error')) {
                    validateField(this);
                }
            });
        });
    }
    
    function validateField(field) {
        const isValid = field.checkValidity() && field.value.trim() !== '';
        
        if (isValid) {
            field.classList.remove('error');
            field.classList.add('success');
            removeFieldError(field);
        } else {
            field.classList.remove('success');
            field.classList.add('error');
            showFieldError(field, getFieldErrorMessage(field));
        }
        
        return isValid;
    }
    
    function getFieldErrorMessage(field) {
        if (field.validity.valueMissing) {
            return `${getFieldLabel(field)} is required`;
        }
        if (field.validity.typeMismatch) {
            return `Please enter a valid ${field.type}`;
        }
        if (field.validity.patternMismatch) {
            return `Please enter a valid format for ${getFieldLabel(field)}`;
        }
        return `Please check the ${getFieldLabel(field)} field`;
    }
    
    function getFieldLabel(field) {
        const label = form.querySelector(`label[for="${field.id}"]`);
        return label ? label.textContent.replace('*', '').trim() : field.name;
    }
    
    function showFieldError(field, message) {
        removeFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    }
    
    function removeFieldError(field) {
        const existingError = field.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
    }
    
    function bindEvents() {
        if (!form) return;
        
        form.addEventListener('submit', handleSubmit);
    }
    
    function handleSubmit(event) {
        event.preventDefault();
        
        if (isSubmitting) return;
        
        // Validate form
        if (!validateForm()) {
            showAlert('Please correct the errors in the form', 'error');
            return;
        }
        
        // Validate partner selection
        if (!selectedPartner || !partnerIdInput.value) {
            partnerSearch.classList.add('error');
            showFieldError(partnerSearch, 'Please select a partner');
            showAlert('Please select a partner', 'error');
            return;
        }
        
        submitForm();
    }
    
    function validateForm() {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    function submitForm() {
        isSubmitting = true;
        updateSubmitButton(true);
        
        const formData = new FormData(form);
        const url = isEditMode ? `/api/deliverables/${formData.get('id')}` : '/api/deliverables';
        const method = isEditMode ? 'PUT' : 'POST';
        
        // Convert FormData to JSON
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showAlert(
                    isEditMode ? 'Deliverable updated successfully!' : 'Deliverable created successfully!',
                    'success'
                );
                
                // Redirect after success
                setTimeout(() => {
                    window.location.href = '/deliverables-tracker';
                }, 1500);
            } else {
                throw new Error(result.message || 'Failed to save deliverable');
            }
        })
        .catch(error => {
            console.error('Error saving deliverable:', error);
            showAlert(error.message || 'Failed to save deliverable. Please try again.', 'error');
        })
        .finally(() => {
            isSubmitting = false;
            updateSubmitButton(false);
        });
    }
    
    function updateSubmitButton(loading) {
        if (!submitBtn) return;
        
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = `
                <span class="icon">⏳</span>
                <span>${isEditMode ? 'Updating...' : 'Creating...'}</span>
            `;
        } else {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            submitBtn.innerHTML = `
                <span class="icon">💾</span>
                <span>${isEditMode ? 'Update Deliverable' : 'Create Deliverable'}</span>
            `;
        }
    }
    
    function loadDeliverableData(data) {
        // Fill form fields with existing data
        Object.keys(data).forEach(key => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                field.value = data[key];
            }
        });
        
        // Update progress bar
        if (data.completionPercentage) {
            updateProgressBar(data.completionPercentage);
        }
        
        // Set selected partner
        if (data.partnerId && data.partnerName) {
            selectedPartner = {
                id: data.partnerId,
                name: data.partnerName
            };
            if (partnerSearch) {
                partnerSearch.value = data.partnerName;
            }
            updateSelectedPartner();
        }
    }
    
    function showAlert(message, type = 'info') {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span class="alert-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="alert-message">${message}</span>
        `;
        
        // Insert at top of form
        form.insertBefore(alert, form.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
        
        // Scroll to top
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    console.log('Enhanced deliverable form script loaded successfully');
});