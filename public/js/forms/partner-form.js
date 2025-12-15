/**
 * Partner Form JavaScript
 * Handles form validation, dynamic behaviors, and submission
 */

class PartnerFormManager {
    constructor() {
        this.form = document.getElementById('partnerForm');
        this.isEditMode = this.form.dataset.mode === 'edit';
        this.partnerId = this.form.dataset.partnerId;
        this.isDirty = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupValidation();
        this.setupDynamicBehaviors();
        this.setupUnsavedChangesWarning();
        
        // If edit mode, populate form with existing data
        if (this.isEditMode && this.partnerId) {
            this.loadPartnerData();
        }
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => this.handleCancel(e));
        }
        
        // Draft saving
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', (e) => this.handleSaveDraft(e));
        }
        
        // Form field changes
        this.form.addEventListener('input', () => {
            this.isDirty = true;
            this.validateField(event.target);
        });
        
        this.form.addEventListener('change', () => {
            this.isDirty = true;
            this.validateField(event.target);
        });
        
        // Real-time validation
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
        });
    }

    setupValidation() {
        this.validationRules = {
            partnerName: {
                required: true,
                minLength: 2,
                maxLength: 100
            },
            partnerType: {
                required: true
            },
            contactEmail: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            },
            contactPhone: {
                required: true,
                pattern: /^[\+]?[\d\s\-\(\)]{7,20}$/
            },
            contractValue: {
                pattern: /^\d{1,15}(\.\d{1,2})?$/
            },
            contractStartDate: {
                required: true
            },
            contractEndDate: {
                required: true,
                validateAfter: 'contractStartDate'
            }
        };
    }

    setupDynamicBehaviors() {
        // Contract type specific fields
        const contractTypeSelect = document.getElementById('contractType');
        if (contractTypeSelect) {
            contractTypeSelect.addEventListener('change', () => {
                this.toggleContractSpecificFields();
            });
        }
        
        // Auto-calculate contract duration
        const startDate = document.getElementById('contractStartDate');
        const endDate = document.getElementById('contractEndDate');
        
        if (startDate && endDate) {
            [startDate, endDate].forEach(field => {
                field.addEventListener('change', () => {
                    this.calculateContractDuration();
                });
            });
        }
        
        // Format currency inputs
        const currencyInputs = document.querySelectorAll('input[data-currency]');
        currencyInputs.forEach(input => {
            input.addEventListener('input', (e) => this.formatCurrency(e.target));
        });
        
        // Phone number formatting
        const phoneInputs = document.querySelectorAll('input[type="tel"]');
        phoneInputs.forEach(input => {
            input.addEventListener('input', (e) => this.formatPhoneNumber(e.target));
        });
    }

    setupUnsavedChangesWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    validateField(field) {
        const fieldName = field.name;
        const value = field.value.trim();
        const rules = this.validationRules[fieldName];
        
        if (!rules) return true;
        
        const errors = [];
        
        // Required validation
        if (rules.required && !value) {
            errors.push('This field is required');
        }
        
        // Pattern validation
        if (value && rules.pattern && !rules.pattern.test(value)) {
            errors.push(this.getPatternErrorMessage(fieldName));
        }
        
        // Length validation
        if (value && rules.minLength && value.length < rules.minLength) {
            errors.push(`Minimum ${rules.minLength} characters required`);
        }
        
        if (value && rules.maxLength && value.length > rules.maxLength) {
            errors.push(`Maximum ${rules.maxLength} characters allowed`);
        }
        
        // Date validation
        if (rules.validateAfter) {
            const afterField = document.getElementById(rules.validateAfter);
            if (afterField && value && afterField.value) {
                const currentDate = new Date(value);
                const afterDate = new Date(afterField.value);
                
                if (currentDate <= afterDate) {
                    errors.push('End date must be after start date');
                }
            }
        }
        
        this.displayFieldErrors(field, errors);
        return errors.length === 0;
    }

    getPatternErrorMessage(fieldName) {
        const messages = {
            contactEmail: 'Please enter a valid email address',
            contactPhone: 'Please enter a valid phone number (7-20 characters)',
            contractValue: 'Please enter a valid amount (up to 15 digits)'
        };
        
        return messages[fieldName] || 'Invalid format';
    }

    displayFieldErrors(field, errors) {
        const formGroup = field.closest('.form-group');
        const helpElement = formGroup.querySelector('.form-help');
        
        // Remove existing error states
        formGroup.classList.remove('error', 'success');
        
        if (errors.length > 0) {
            formGroup.classList.add('error');
            if (helpElement) {
                helpElement.textContent = errors[0];
                helpElement.style.color = 'var(--danger-color)';
            }
        } else if (field.value.trim()) {
            formGroup.classList.add('success');
            if (helpElement && !helpElement.dataset.originalText) {
                helpElement.dataset.originalText = helpElement.textContent;
            }
            if (helpElement && helpElement.dataset.originalText) {
                helpElement.textContent = helpElement.dataset.originalText;
                helpElement.style.color = '';
            }
        }
    }

    validateForm() {
        let isValid = true;
        const inputs = this.form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    toggleContractSpecificFields() {
        const contractType = document.getElementById('contractType').value;
        const serviceFields = document.querySelectorAll('.service-contract-fields');
        const supplierFields = document.querySelectorAll('.supplier-contract-fields');
        
        serviceFields.forEach(field => {
            field.style.display = contractType === 'service' ? 'block' : 'none';
        });
        
        supplierFields.forEach(field => {
            field.style.display = contractType === 'supplier' ? 'block' : 'none';
        });
    }

    calculateContractDuration() {
        const startDate = document.getElementById('contractStartDate').value;
        const endDate = document.getElementById('contractEndDate').value;
        const durationField = document.getElementById('contractDuration');
        
        if (startDate && endDate && durationField) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const diffMonths = Math.round(diffDays / 30.44);
            
            durationField.value = `${diffMonths} months (${diffDays} days)`;
        }
    }

    formatCurrency(input) {
        let value = input.value.replace(/[^\d.]/g, '');
        
        // Ensure only one decimal point
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limit decimal places to 2
        if (parts[1] && parts[1].length > 2) {
            value = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        // Don't limit the number of digits before decimal point
        input.value = value;
    }

    formatPhoneNumber(input) {
        let value = input.value;
        
        // Allow international phone number formats
        // Remove multiple spaces and normalize formatting
        value = value.replace(/\s+/g, ' ').trim();
        
        // Don't impose strict formatting, just clean up
        input.value = value;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            this.showMessage('Please correct the errors before submitting.', 'error');
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.setButtonLoading(submitBtn, true);
        
        try {
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());
            
            const url = this.isEditMode 
                ? `/api/partners/${this.partnerId}` 
                : '/api/partners';
            
            const method = this.isEditMode ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                this.isDirty = false;
                this.showMessage(
                    this.isEditMode 
                        ? 'Partner updated successfully!' 
                        : 'Partner created successfully!', 
                    'success'
                );
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = '/master-register';
                }, 1500);
            } else {
                throw new Error('Failed to save partner');
            }
        } catch (error) {
            console.error('Error saving partner:', error);
            this.showMessage('An error occurred while saving. Please try again.', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleSaveDraft(e) {
        e.preventDefault();
        
        const saveDraftBtn = e.target;
        this.setButtonLoading(saveDraftBtn, true);
        
        try {
            const formData = new FormData(this.form);
            const data = Object.fromEntries(formData.entries());
            data.isDraft = true;
            
            const response = await fetch('/api/partners/draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                this.isDirty = false;
                this.showMessage('Draft saved successfully!', 'success');
            } else {
                throw new Error('Failed to save draft');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            this.showMessage('Failed to save draft. Please try again.', 'error');
        } finally {
            this.setButtonLoading(saveDraftBtn, false);
        }
    }

    handleCancel(e) {
        e.preventDefault();
        
        if (this.isDirty) {
            if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                window.location.href = '/master-register';
            }
        } else {
            window.location.href = '/master-register';
        }
    }

    async loadPartnerData() {
        try {
            const response = await fetch(`/api/partners/${this.partnerId}`);
            if (response.ok) {
                const partner = await response.json();
                this.populateForm(partner);
            }
        } catch (error) {
            console.error('Error loading partner data:', error);
            this.showMessage('Failed to load partner data.', 'error');
        }
    }

    populateForm(data) {
        Object.keys(data).forEach(key => {
            const field = this.form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = !!data[key];
                } else {
                    field.value = data[key] || '';
                }
            }
        });
        
        this.isDirty = false;
    }

    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showMessage(message, type = 'success') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message-container');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-container ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">${message}</div>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('partnerForm')) {
        new PartnerFormManager();
    }
});

// Utility functions for other forms
window.FormUtils = {
    formatCurrency: function(input) {
        let value = input.value.replace(/[^\d.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        if (parts[1] && parts[1].length > 2) {
            value = parts[0] + '.' + parts[1].substring(0, 2);
        }
        // Don't limit the number of digits before decimal point
        input.value = value;
    },
    
    formatPhoneNumber: function(input) {
        let value = input.value;
        
        // Allow international phone number formats
        // Remove multiple spaces and normalize formatting
        value = value.replace(/\s+/g, ' ').trim();
        
        // Don't impose strict formatting, just clean up
        input.value = value;
    },
    
    validateEmail: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    showMessage: function(message, type = 'success') {
        const existingMessages = document.querySelectorAll('.message-container');
        existingMessages.forEach(msg => msg.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-container ${type}`;
        messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
};