// Enhanced Deliverable Form JavaScript

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('deliverableForm');
    if (!form) return;

    // populate select if server didn't render options
    (function populatePartners() {
        const sel = document.getElementById('partnerId');
        if (!sel) return;
        if (sel.options.length <= 1 && Array.isArray(window.partnersData)) {
            window.partnersData.forEach(p => {
                const id = p.id || p.partnerId || '';
                const name = p.partnerName || p.name || id;
                if (!id) return;
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = name;
                sel.appendChild(opt);
            });
        }
    })();

    async function submitForm(ev) {
        ev.preventDefault();
        const data = {
            partnerId: form.partnerId.value || null,
            deliverableNumber: form.deliverableNumber.value || null,
            description: form.description.value || null,
            milestoneDate: form.milestoneDate.value || null,
            status: form.status.value || 'pending',
            paymentPercentage: form.paymentPercentage.value || null,
            paymentAmount: form.paymentAmount.value || null,
            assignedTo: form.assignedTo.value || null
        };

        if (!data.partnerId) { alert('Select a partner'); return; }
        if (!data.deliverableNumber) { alert('Enter a deliverable number'); return; }

        try {
            const res = await fetch(form.action || '/forms/deliverable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (!res.ok || !json || !json.success) {
                throw new Error((json && json.error) || 'Failed to save deliverable');
            }
            window.location.href = '/deliverables-tracker';
        } catch (err) {
            console.error('Deliverable save error', err);
            alert('Save failed: ' + (err.message || err));
        }
    }

    form.addEventListener('submit', submitForm);

    // Form elements
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
    
    let isDropdownOpen = false;
    let selectedPartner = null;
    let isEditMode = false;
    let isSubmitting = false;
    
    // Initialize the form
    init();
    
    function init() {
        // Check if we're in edit mode
        if (form) {
            isEditMode = form.querySelector('input[name="_method"]') !== null;
        }

        // populate partner UI from injected data BEFORE wiring events
        populatePartnersFromData();

        setupPartnerSelection();
        setupProgressSync();
        setupFormValidation();
        bindEvents();

        // Load existing deliverable data if editing
        if (window.deliverableData) {
            loadDeliverableData(window.deliverableData);
        }
    }

    // populate partner <select> and custom partner-options list from server-injected window.partnersData
    function populatePartnersFromData() {
        const partners = Array.isArray(window.partnersData) ? window.partnersData : [];
        if (!partners.length) return;

        // populate plain <select id="partnerId"> fallback
        const select = document.getElementById('partnerId');
        if (select) {
            // preserve first placeholder option if present
            const placeholder = select.querySelector('option[value=""]');
            select.innerHTML = '';
            if (placeholder) select.appendChild(placeholder);
            partners.forEach(p => {
                const id = p.id || p.partnerId || p.uuid || '';
                const name = p.partnerName || p.name || p.displayName || id;
                if (!id) return;
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = name;
                select.appendChild(opt);
            });
        }

        // populate custom dropdown container (.partner-option)
        if (partnerOptions) {
            partnerOptions.innerHTML = '';
            partners.forEach(p => {
                const id = p.id || p.partnerId || p.uuid || '';
                const name = p.partnerName || p.name || p.displayName || id;
                if (!id) return;
                const item = document.createElement('div');
                item.className = 'partner-option';
                item.dataset.value = id;
                item.dataset.name = name;
                item.dataset.partnerId = id;
                item.dataset.type = p.partnerType || p.type || '';
                
                const nameDiv = document.createElement('div');
                nameDiv.className = 'partner-name';
                nameDiv.textContent = name;
                item.appendChild(nameDiv);
                
                const metaDiv = document.createElement('div');
                metaDiv.className = 'partner-meta';
                metaDiv.textContent = p.partnerType || p.type || '';
                item.appendChild(metaDiv);

                // attach click handler so dynamically added items behave the same
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    selectPartner({
                        id: this.dataset.value,
                        name: this.dataset.name,
                        partnerId: this.dataset.partnerId,
                        type: this.dataset.type
                    });
                    closeDropdown();
                });
                partnerOptions.appendChild(item);
            });
        }
    }

    function setupPartnerSelection() {
        if (!partnerSelectWrapper || !partnerSearch || !partnerDropdown) {
            console.error('Partner selection elements not found');
            return;
        }
        
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
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown();
        });
        
        // Partner search focus handler
        partnerSearch.addEventListener('focus', function(e) {
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
            options.forEach(option => {
                option.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
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
        document.addEventListener('click', function(e) {
            if (!partnerSelectWrapper.contains(e.target)) {
                closeDropdown();
            }
        });
        
        // Handle escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isDropdownOpen) {
                closeDropdown();
            }
        });
    }
    
    function toggleDropdown() {
        if (isDropdownOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }
    
    function openDropdown() {
        if (!partnerDropdown || isDropdownOpen) return;
        
        isDropdownOpen = true;
        partnerDropdown.classList.add('show');
        partnerSelectWrapper.classList.add('open');
        
        // Focus on filter input if it exists
        if (partnerFilterInput) {
            setTimeout(() => {
                partnerFilterInput.focus();
            }, 100);
        }
    }
    
    function closeDropdown() {
        if (!partnerDropdown || !isDropdownOpen) return;
        
        isDropdownOpen = false;
        partnerDropdown.classList.remove('show');
        partnerSelectWrapper.classList.remove('open');
        
        // Clear filter
        if (partnerFilterInput) {
            partnerFilterInput.value = '';
            filterPartners('');
        }
    }
    
    function selectPartner(partner) {
        selectedPartner = partner;
        partnerSearch.value = partner.name;
        
        // Update hidden fields
        if (partnerIdInput) {
            partnerIdInput.value = partner.id;
        }
        if (partnerNameInput) {
            partnerNameInput.value = partner.name;
        }
        
        updateSelectedPartner();
    }
    
    function updateSelectedPartner() {
        if (selectedPartner) {
            partnerSelectWrapper.classList.add('has-selection');
        } else {
            partnerSelectWrapper.classList.remove('has-selection');
        }
    }
    
    function filterPartners(searchTerm) {
        if (!partnerOptions) return;
        
        const options = partnerOptions.querySelectorAll('.partner-option');
        const term = searchTerm.toLowerCase();
        
        options.forEach(option => {
            const name = option.dataset.name.toLowerCase();
            const partnerId = option.dataset.partnerId ? option.dataset.partnerId.toLowerCase() : '';
            
            if (name.includes(term) || partnerId.includes(term)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
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
        
        // Initialize progress bar
        updateProgressBar(completionInput.value || 0);
    }
    
    function updateProgressBar(percentage) {
        if (progressFill) {
            progressFill.style.width = percentage + '%';
            
            // Update color based on percentage
            if (percentage < 30) {
                progressFill.style.backgroundColor = '#ef4444'; // red
            } else if (percentage < 70) {
                progressFill.style.backgroundColor = '#f59e0b'; // amber
            } else {
                progressFill.style.backgroundColor = '#10b981'; // emerald
            }
        }
    }
    
    function setupFormValidation() {
        if (!form) return;
        
        // Real-time validation for required fields
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            field.addEventListener('blur', validateField);
            field.addEventListener('input', clearFieldError);
        });
        
        // Form submission validation
        form.addEventListener('submit', function(e) {
            if (isSubmitting) {
                e.preventDefault();
                return false;
            }
            
            if (!validateForm()) {
                e.preventDefault();
                return false;
            }
            
            isSubmitting = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isEditMode ? 'Updating...' : 'Creating...';
            }
        });
    }
    
    function validateField(e) {
        const field = e.target;
        const fieldGroup = field.closest('.field-group') || field.parentElement;
        const errorElement = fieldGroup.querySelector('.field-error');
        
        clearFieldError(e);
        
        if (field.hasAttribute('required') && !field.value.trim()) {
            showFieldError(field, 'This field is required');
            return false;
        }
        
        // Custom validation rules
        if (field.type === 'email' && field.value && !isValidEmail(field.value)) {
            showFieldError(field, 'Please enter a valid email address');
            return false;
        }
        
        if (field.type === 'number') {
            const min = field.getAttribute('min');
            const max = field.getAttribute('max');
            const value = parseFloat(field.value);
            
            if (min !== null && value < parseFloat(min)) {
                showFieldError(field, `Minimum value is ${min}`);
                return false;
            }
            
            if (max !== null && value > parseFloat(max)) {
                showFieldError(field, `Maximum value is ${max}`);
                return false;
            }
        }
        
        return true;
    }
    
    function clearFieldError(e) {
        const field = e.target;
        const fieldGroup = field.closest('.field-group') || field.parentElement;
        const errorElement = fieldGroup.querySelector('.field-error');
        
        field.classList.remove('error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }
    
    function showFieldError(field, message) {
        const fieldGroup = field.closest('.field-group') || field.parentElement;
        let errorElement = fieldGroup.querySelector('.field-error');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            fieldGroup.appendChild(errorElement);
        }
        
        field.classList.add('error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Focus on the field with error
        field.focus();
    }
    
    function validateForm() {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        // Clear all previous errors
        form.querySelectorAll('.field-error').forEach(error => {
            error.style.display = 'none';
        });
        form.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });
        
        // Validate each required field
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                showFieldError(field, 'This field is required');
                isValid = false;
            }
        });
        
        // Validate partner selection
        if (!selectedPartner || !partnerIdInput.value) {
            const partnerError = partnerSelectWrapper.querySelector('.field-error') || 
                               document.createElement('div');
            partnerError.className = 'field-error';
            partnerError.textContent = 'Please select an associated partner';
            partnerError.style.display = 'block';
            
            if (!partnerSelectWrapper.querySelector('.field-error')) {
                partnerSelectWrapper.appendChild(partnerError);
            }
            
            partnerSearch.classList.add('error');
            isValid = false;
        }
        
        return isValid;
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function bindEvents() {
        // Handle dynamic form behaviors here
        
        // Auto-resize textareas
        const textareas = form.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = this.scrollHeight + 'px';
            });
            
            // Initial resize
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });
        
        // Handle file upload preview if needed
        const fileInputs = form.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', handleFileUpload);
        });
    }
    
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const fieldGroup = e.target.closest('.field-group');
        const preview = fieldGroup.querySelector('.file-preview') || 
                       createFilePreview(fieldGroup);
        
        preview.innerHTML = `
            <div class="file-info">
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${formatFileSize(file.size)})</span>
                <button type="button" class="remove-file" onclick="removeFile(this)">×</button>
            </div>
        `;
    }
    
    function createFilePreview(fieldGroup) {
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        fieldGroup.appendChild(preview);
        return preview;
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Global function for removing files
    window.removeFile = function(button) {
        const preview = button.closest('.file-preview');
        const fieldGroup = button.closest('.field-group');
        const fileInput = fieldGroup.querySelector('input[type="file"]');
        
        if (fileInput) fileInput.value = '';
        if (preview) preview.innerHTML = '';
    };
    
    function loadDeliverableData(data) {
        // Populate form fields with existing data
        Object.keys(data).forEach(key => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field && data[key] !== null) {
                if (field.type === 'checkbox') {
                    field.checked = data[key];
                } else if (field.type === 'radio') {
                    const radio = form.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    field.value = data[key];
                }
            }
        });
        
        // Handle progress bar update
        if (data.completionPercentage) {
            updateProgressBar(data.completionPercentage);
        }
        
        // Handle partner selection
        if (data.partnerId && data.partnerName) {
            selectedPartner = {
                id: data.partnerId,
                name: data.partnerName
            };
            partnerSearch.value = data.partnerName;
            updateSelectedPartner();
        }
    }
});