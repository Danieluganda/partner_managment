/**
 * External Partner Form JavaScript
 * Handles form validation, dynamic behaviors, and submission
 */

class ExternalPartnerFormManager {
    constructor() {
        this.form = document.getElementById('externalPartnerForm');
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
            this.updateDynamicFields();
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
            keyContact: {
                required: true,
                minLength: 2,
                maxLength: 100
            },
            contactEmail: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            },
            contactPhone: {
                pattern: /^[\+]?[1-9][\d\s\-\(\)]{0,20}$/
            },
            dateInitiated: {
                required: true,
                validateDate: true
            },
            currentStage: {
                required: true
            },
            status: {
                required: true
            },
            responsible: {
                required: true
            },
            deadline: {
                validateDate: true,
                validateAfter: 'dateInitiated'
            },
            keyObjectives: {
                required: true,
                minLength: 10,
                maxLength: 1000
            },
            estimatedValue: {
                pattern: /^\d+(\.\d{1,2})?$/
            }
        };
    }

    setupDynamicBehaviors() {
        // Status and stage correlation
        const stageSelect = document.getElementById('currentStage');
        const statusSelect = document.getElementById('status');
        
        if (stageSelect && statusSelect) {
            stageSelect.addEventListener('change', () => {
                this.updateStatusOptions();
            });
        }
        
        // Auto-update deadline based on stage
        if (stageSelect) {
            stageSelect.addEventListener('change', () => {
                this.suggestDeadline();
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
        
        // Tag formatting
        const tagInput = document.getElementById('tags');
        if (tagInput) {
            tagInput.addEventListener('blur', (e) => this.formatTags(e.target));
        }
        
        // Priority-based styling
        const prioritySelect = document.getElementById('priority');
        if (prioritySelect) {
            prioritySelect.addEventListener('change', () => {
                this.updatePriorityIndicator();
            });
        }
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
        if (rules.validateDate && value) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                errors.push('Please enter a valid date');
            }
        }
        
        // Date range validation
        if (rules.validateAfter && value) {
            const afterField = document.getElementById(rules.validateAfter);
            if (afterField && afterField.value) {
                const currentDate = new Date(value);
                const afterDate = new Date(afterField.value);
                
                if (currentDate <= afterDate) {
                    errors.push('Deadline must be after initiation date');
                }
            }
        }
        
        this.displayFieldErrors(field, errors);
        return errors.length === 0;
    }

    getPatternErrorMessage(fieldName) {
        const messages = {
            contactEmail: 'Please enter a valid email address',
            contactPhone: 'Please enter a valid phone number',
            estimatedValue: 'Please enter a valid amount'
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

    updateDynamicFields() {
        this.updateStatusOptions();
        this.suggestDeadline();
        this.updatePriorityIndicator();
    }

    updateStatusOptions() {
        const stage = document.getElementById('currentStage').value;
        const statusSelect = document.getElementById('status');
        
        // Reset status options based on stage
        const stageStatusMap = {
            'initiation': ['on-track', 'at-risk', 'blocked'],
            'negotiation': ['on-track', 'at-risk', 'delayed', 'blocked'],
            'due-diligence': ['on-track', 'at-risk', 'delayed', 'blocked'],
            'contract-review': ['on-track', 'at-risk', 'delayed', 'blocked'],
            'approval': ['on-track', 'at-risk', 'delayed', 'blocked'],
            'execution': ['on-track', 'at-risk', 'delayed', 'blocked'],
            'ongoing': ['on-track', 'at-risk', 'delayed'],
            'review': ['on-track', 'completed'],
        };
        
        if (stage && stageStatusMap[stage]) {
            const allowedStatuses = stageStatusMap[stage];
            const currentStatus = statusSelect.value;
            
            // Enable/disable options based on stage
            Array.from(statusSelect.options).forEach(option => {
                if (option.value && !allowedStatuses.includes(option.value)) {
                    option.disabled = true;
                    option.style.display = 'none';
                } else {
                    option.disabled = false;
                    option.style.display = 'block';
                }
            });
            
            // Reset status if current selection is not valid for stage
            if (currentStatus && !allowedStatuses.includes(currentStatus)) {
                statusSelect.value = '';
            }
        }
    }

    suggestDeadline() {
        const stage = document.getElementById('currentStage').value;
        const dateInitiated = document.getElementById('dateInitiated').value;
        const deadlineField = document.getElementById('deadline');
        
        if (stage && dateInitiated && !deadlineField.value) {
            const initiatedDate = new Date(dateInitiated);
            let suggestedDays = 30; // Default
            
            const stageDurations = {
                'initiation': 14,
                'negotiation': 30,
                'due-diligence': 21,
                'contract-review': 14,
                'approval': 7,
                'execution': 30,
                'ongoing': 90,
                'review': 14
            };
            
            if (stageDurations[stage]) {
                suggestedDays = stageDurations[stage];
            }
            
            const suggestedDate = new Date(initiatedDate);
            suggestedDate.setDate(suggestedDate.getDate() + suggestedDays);
            
            deadlineField.value = suggestedDate.toISOString().split('T')[0];
        }
    }

    updatePriorityIndicator() {
        const priority = document.getElementById('priority').value;
        const formGroup = document.getElementById('priority').closest('.form-group');
        
        // Remove existing priority classes
        formGroup.classList.remove('priority-low', 'priority-medium', 'priority-high', 'priority-critical');
        
        if (priority) {
            formGroup.classList.add(`priority-${priority}`);
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
        
        input.value = value;
    }

    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        // Format as (XXX) XXX-XXXX for US numbers
        if (value.length >= 6) {
            value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        } else if (value.length >= 3) {
            value = value.replace(/(\d{3})(\d+)/, '($1) $2');
        }
        
        input.value = value;
    }

    formatTags(input) {
        if (input.value) {
            // Clean up tags: remove extra spaces, normalize separators
            const tags = input.value
                .split(/[,;]/)
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
                .join(', ');
            
            input.value = tags;
        }
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
                ? `/api/external-partners/${this.partnerId}` 
                : '/api/external-partners';
            
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
                        ? 'External partner updated successfully!' 
                        : 'External partner created successfully!', 
                    'success'
                );
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = '/external-partners';
                }, 1500);
            } else {
                throw new Error('Failed to save external partner');
            }
        } catch (error) {
            console.error('Error saving external partner:', error);
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
            
            const response = await fetch('/api/external-partners/draft', {
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
                window.location.href = '/external-partners';
            }
        } else {
            window.location.href = '/external-partners';
        }
    }

    async loadPartnerData() {
        try {
            const response = await fetch(`/api/external-partners/${this.partnerId}`);
            if (response.ok) {
                const partner = await response.json();
                this.populateForm(partner);
            }
        } catch (error) {
            console.error('Error loading external partner data:', error);
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
        this.updateDynamicFields();
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
    if (document.getElementById('externalPartnerForm')) {
        new ExternalPartnerFormManager();
    }
});

// Export for use in other modules
window.ExternalPartnerFormManager = ExternalPartnerFormManager;