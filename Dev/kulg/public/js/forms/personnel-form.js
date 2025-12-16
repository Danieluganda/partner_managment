// Personnel Form JavaScript
class PersonnelForm {
    constructor() {
        this.form = document.getElementById('personnelForm');
        this.partnerTypeSelect = document.getElementById('partnerType');
        this.partnerSelect = document.getElementById('partnerId');
        this.partnerNameInput = document.getElementById('partnerName');
        this.partnerStatusInput = document.getElementById('partnerStatus');
        this.phoneInputs = document.querySelectorAll('input[type="tel"]');
        
        this.partnersData = window.partnersData || [];
        this.externalPartnersData = window.externalPartnersData || [];
        this.editMode = window.editMode || false;
        this.personnelData = window.personnelData || null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPhoneFormatting();
        this.setupFormValidation();
        
        if (this.editMode && this.personnelData) {
            this.populateEditForm();
        }
        
        console.log('Personnel Form initialized', {
            partnersCount: this.partnersData.length,
            externalPartnersCount: this.externalPartnersData.length,
            editMode: this.editMode
        });
    }

    setupEventListeners() {
        // Partner type change handler
        this.partnerTypeSelect.addEventListener('change', (e) => {
            this.handlePartnerTypeChange(e.target.value);
        });

        // Partner selection change handler
        this.partnerSelect.addEventListener('change', (e) => {
            this.handlePartnerSelectionChange(e.target.value);
        });

        // Form submission handler
        this.form.addEventListener('submit', (e) => {
            this.handleFormSubmission(e);
        });

        // Auto-save draft functionality (optional)
        this.setupAutoSave();
    }

    handlePartnerTypeChange(partnerType) {
        console.log('Partner type changed:', partnerType);
        
        // Clear current partner selection
        this.partnerSelect.innerHTML = '<option value="">Select a partner</option>';
        this.clearPartnerInfo();
        
        if (!partnerType) {
            this.partnerSelect.disabled = true;
            this.partnerSelect.innerHTML = '<option value="">Select a partner type first</option>';
            return;
        }

        // Enable partner selection
        this.partnerSelect.disabled = false;
        
        // Populate partners based on type
        const partnersToShow = partnerType === 'internal' ? this.partnersData : this.externalPartnersData;
        
        if (partnersToShow.length === 0) {
            this.partnerSelect.innerHTML = `<option value="">No ${partnerType} partners found</option>`;
            this.partnerSelect.disabled = true;
            return;
        }

        partnersToShow.forEach(partner => {
            const option = document.createElement('option');
            option.value = partner.id;
            option.textContent = `${partner.name || partner.companyName} (${partner.status})`;
            option.dataset.partnerData = JSON.stringify(partner);
            this.partnerSelect.appendChild(option);
        });

        console.log(`Loaded ${partnersToShow.length} ${partnerType} partners`);
    }

    handlePartnerSelectionChange(partnerId) {
        console.log('Partner selected:', partnerId);
        
        if (!partnerId) {
            this.clearPartnerInfo();
            return;
        }

        const selectedOption = this.partnerSelect.querySelector(`option[value="${partnerId}"]`);
        if (!selectedOption || !selectedOption.dataset.partnerData) {
            console.error('Partner data not found for selected option');
            return;
        }

        try {
            const partnerData = JSON.parse(selectedOption.dataset.partnerData);
            this.populatePartnerInfo(partnerData);
        } catch (error) {
            console.error('Error parsing partner data:', error);
        }
    }

    populatePartnerInfo(partner) {
        // Fill in partner name and status
        this.partnerNameInput.value = partner.name || partner.companyName || '';
        this.partnerStatusInput.value = partner.status || '';

        console.log('Partner info populated:', {
            name: this.partnerNameInput.value,
            status: this.partnerStatusInput.value
        });
    }

    clearPartnerInfo() {
        this.partnerNameInput.value = '';
        this.partnerStatusInput.value = '';
    }

    setupPhoneFormatting() {
        this.phoneInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = this.formatPhoneNumber(e.target.value);
            });

            input.addEventListener('blur', (e) => {
                this.validatePhoneNumber(e.target);
            });
        });
    }

    formatPhoneNumber(value) {
        // Remove all non-digit characters except + at the start
        let cleaned = value.replace(/[^\d+]/g, '');
        
        // Ensure + is only at the start
        if (cleaned.includes('+')) {
            cleaned = '+' + cleaned.replace(/\+/g, '');
        }
        
        // Limit to reasonable phone number length
        if (cleaned.length > 20) {
            cleaned = cleaned.substring(0, 20);
        }
        
        return cleaned;
    }

    validatePhoneNumber(input) {
        const value = input.value.trim();
        const phonePattern = /^(\+\d{1,3}[\s-]?)?\d{10,15}$/;
        
        if (value && !phonePattern.test(value.replace(/[\s-]/g, ''))) {
            this.showFieldError(input, 'Please enter a valid phone number');
            return false;
        } else {
            this.clearFieldError(input);
            return true;
        }
    }

    setupFormValidation() {
        // Email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                this.validateEmail(e.target);
            });
        });

        // Required field validation
        const requiredInputs = document.querySelectorAll('[required]');
        requiredInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                this.validateRequired(e.target);
            });
        });
    }

    validateEmail(input) {
        const value = input.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (value && !emailPattern.test(value)) {
            this.showFieldError(input, 'Please enter a valid email address');
            return false;
        } else {
            this.clearFieldError(input);
            return true;
        }
    }

    validateRequired(input) {
        const value = input.value.trim();
        
        if (!value) {
            this.showFieldError(input, 'This field is required');
            return false;
        } else {
            this.clearFieldError(input);
            return true;
        }
    }

    showFieldError(input, message) {
        input.classList.add('error');
        input.classList.remove('success');
        
        // Remove existing error message
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<span>⚠️</span> ${message}`;
        input.parentNode.appendChild(errorDiv);
    }

    clearFieldError(input) {
        input.classList.remove('error');
        const errorMessage = input.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    showFieldSuccess(input) {
        input.classList.add('success');
        input.classList.remove('error');
        this.clearFieldError(input);
    }

    validateForm() {
        let isValid = true;
        const errors = [];

        // Validate required fields
        const requiredFields = this.form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!this.validateRequired(field)) {
                isValid = false;
                errors.push(`${field.name || field.id} is required`);
            }
        });

        // Validate email fields
        const emailFields = this.form.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            if (field.value && !this.validateEmail(field)) {
                isValid = false;
                errors.push(`${field.name || field.id} must be a valid email`);
            }
        });

        // Validate phone fields
        this.phoneInputs.forEach(field => {
            if (field.value && !this.validatePhoneNumber(field)) {
                isValid = false;
                errors.push(`${field.name || field.id} must be a valid phone number`);
            }
        });

        // Partner selection validation
        if (!this.partnerTypeSelect.value) {
            this.showFieldError(this.partnerTypeSelect, 'Please select a partner type');
            isValid = false;
            errors.push('Partner type is required');
        }

        if (!this.partnerSelect.value) {
            this.showFieldError(this.partnerSelect, 'Please select a partner');
            isValid = false;
            errors.push('Partner selection is required');
        }

        console.log('Form validation result:', { isValid, errors });
        return { isValid, errors };
    }

    handleFormSubmission(e) {
        e.preventDefault();
        
        console.log('Form submission started');
        
        // Validate form
        const validation = this.validateForm();
        if (!validation.isValid) {
            this.showFormErrors(validation.errors);
            return;
        }

        // Show loading state
        this.setFormLoading(true);

        // Collect form data
        const formData = this.collectFormData();
        
        console.log('Form data collected:', formData);

        // Submit form
        this.submitForm(formData);
    }

    collectFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Add additional metadata
        data.submittedAt = new Date().toISOString();
        data.formVersion = '1.0';
        
        return data;
    }

    async submitForm(data) {
        try {
            const response = await fetch(this.form.action, {
                method: this.form.method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Form submitted successfully:', result);
                this.showSuccessMessage('Personnel saved successfully!');
                
                // Redirect after success
                setTimeout(() => {
                    window.location.href = '/key-personnel';
                }, 1500);
            } else {
                const error = await response.json();
                console.error('Form submission failed:', error);
                this.showFormErrors([error.message || 'Failed to save personnel']);
            }
        } catch (error) {
            console.error('Form submission error:', error);
            this.showFormErrors(['Network error. Please try again.']);
        } finally {
            this.setFormLoading(false);
        }
    }

    setFormLoading(loading) {
        const submitButton = this.form.querySelector('button[type="submit"]');
        const form = this.form;
        
        if (loading) {
            form.classList.add('form-loading');
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="icon">⏳</span><span>Saving...</span>';
        } else {
            form.classList.remove('form-loading');
            submitButton.disabled = false;
            submitButton.innerHTML = `<span class="icon">💾</span><span>${this.editMode ? 'Update Personnel' : 'Add Personnel'}</span>`;
        }
    }

    showFormErrors(errors) {
        // Remove existing error display
        const existingAlert = document.querySelector('.form-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create error alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'form-alert error';
        alertDiv.innerHTML = `
            <div class="alert-content">
                <span class="alert-icon">⚠️</span>
                <div class="alert-message">
                    <strong>Please fix the following errors:</strong>
                    <ul>${errors.map(error => `<li>${error}</li>`).join('')}</ul>
                </div>
            </div>
        `;

        // Insert at top of form
        this.form.insertBefore(alertDiv, this.form.firstChild);
        
        // Scroll to top
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showSuccessMessage(message) {
        // Remove existing alerts
        const existingAlert = document.querySelector('.form-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create success alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'form-alert success';
        alertDiv.innerHTML = `
            <div class="alert-content">
                <span class="alert-icon">✅</span>
                <div class="alert-message">
                    <strong>${message}</strong>
                </div>
            </div>
        `;

        // Insert at top of form
        this.form.insertBefore(alertDiv, this.form.firstChild);
        
        // Scroll to top
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    populateEditForm() {
        if (!this.personnelData) return;

        console.log('Populating edit form with data:', this.personnelData);

        // Set partner type first
        if (this.personnelData.partnerType) {
            this.partnerTypeSelect.value = this.personnelData.partnerType;
            this.handlePartnerTypeChange(this.personnelData.partnerType);
            
            // Set partner selection after partner type is loaded
            setTimeout(() => {
                if (this.personnelData.partnerId) {
                    this.partnerSelect.value = this.personnelData.partnerId;
                    this.handlePartnerSelectionChange(this.personnelData.partnerId);
                }
            }, 100);
        }
    }

    setupAutoSave() {
        // Auto-save draft every 30 seconds
        setInterval(() => {
            this.saveDraft();
        }, 30000);

        // Save draft when user leaves page
        window.addEventListener('beforeunload', (e) => {
            this.saveDraft();
        });
    }

    saveDraft() {
        if (this.editMode) return; // Don't auto-save in edit mode

        const formData = this.collectFormData();
        const draftKey = `personnel_form_draft_${Date.now()}`;
        
        try {
            localStorage.setItem(draftKey, JSON.stringify(formData));
            console.log('Draft saved:', draftKey);
            
            // Keep only the latest 3 drafts
            const allDrafts = Object.keys(localStorage).filter(key => key.startsWith('personnel_form_draft_'));
            if (allDrafts.length > 3) {
                allDrafts.sort();
                localStorage.removeItem(allDrafts[0]);
            }
        } catch (error) {
            console.warn('Could not save draft:', error);
        }
    }

    loadDraft() {
        if (this.editMode) return; // Don't load draft in edit mode

        const allDrafts = Object.keys(localStorage).filter(key => key.startsWith('personnel_form_draft_'));
        if (allDrafts.length === 0) return;

        const latestDraft = allDrafts.sort().pop();
        try {
            const draftData = JSON.parse(localStorage.getItem(latestDraft));
            
            if (confirm('A draft was found. Would you like to restore it?')) {
                this.restoreFormData(draftData);
                localStorage.removeItem(latestDraft);
            }
        } catch (error) {
            console.warn('Could not load draft:', error);
        }
    }

    restoreFormData(data) {
        Object.keys(data).forEach(key => {
            const field = this.form.querySelector(`[name="${key}"]`);
            if (field) {
                field.value = data[key];
                
                // Trigger change events for dropdowns
                if (field.tagName === 'SELECT') {
                    field.dispatchEvent(new Event('change'));
                }
            }
        });
    }
}

// Form Alert Styles (add to CSS if not present)
const alertStyles = `
.form-alert {
    margin-bottom: 20px;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid;
    animation: slideIn 0.3s ease-out;
}

.form-alert.error {
    background: #fef2f2;
    border-color: #fecaca;
    color: #991b1b;
}

.form-alert.success {
    background: #f0fdf4;
    border-color: #bbf7d0;
    color: #166534;
}

.alert-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.alert-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
}

.alert-message {
    flex: 1;
}

.alert-message strong {
    display: block;
    margin-bottom: 8px;
}

.alert-message ul {
    margin: 0;
    padding-left: 20px;
}

.alert-message li {
    margin-bottom: 4px;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

// Inject alert styles if not present
if (!document.querySelector('#personnel-form-alert-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'personnel-form-alert-styles';
    styleSheet.textContent = alertStyles;
    document.head.appendChild(styleSheet);
}

// Initialize form when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PersonnelForm();
});