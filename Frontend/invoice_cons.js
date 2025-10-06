// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Attach event listeners to amount fields for auto-calculation
    const amountFields = document.querySelectorAll('.amount-field');
    amountFields.forEach(field => {
        field.addEventListener('input', calculateTotal);
    });

    // Form submission handler
    document.getElementById('invoiceForm').addEventListener('submit', handleFormSubmit);
});

// Calculate total amount
function calculateTotal() {
    const spFee = parseFloat(document.querySelector('[name="Service_Provider_Fee"]').value) || 0;
    const spTax = parseFloat(document.querySelector('[name="Service_Provider_Fee_Tax"]').value) || 0;
    const govtFee = parseFloat(document.querySelector('[name="Govt_Fee"]').value) || 0;
    const vfsFee = parseFloat(document.querySelector('[name="VFS_Fee"]').value) || 0;
    const miscExp = parseFloat(document.querySelector('[name="Misc_Other_Exp"]').value) || 0;
    const tax = parseFloat(document.querySelector('[name="Tax"]').value) || 0;

    const total = spFee + spTax + govtFee + vfsFee + miscExp + tax;
    document.querySelector('[name="Total_Invoice_Amount"]').value = total.toFixed(2);
}

// Fetch GIS list based on SAP ID
async function fetchGISList() {
    const sapId = document.getElementById('search_sap_id').value.trim();
    const gisSelect = document.getElementById('search_gis_id');
    
    if (!sapId) {
        showAlert('Please enter SAP ID', 'error');
        return;
    }

    console.log('Fetching GIS IDs for SAP_ID:', sapId);

    try {
        const response = await fetch(`/api/invoice-cons/gis-list?sap_id=${encodeURIComponent(sapId)}`, {
            credentials: 'include'
        });

        const data = await response.json();
        console.log('GIS list response:', data);

        if (data.success && data.gisList) {
            gisSelect.innerHTML = '<option value="">-- Select GIS ID --</option>';
            
            if (data.gisList.length === 0) {
                showAlert('No GIS IDs found for this SAP ID', 'error');
            } else {
                data.gisList.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.GIS_ID;
                    option.textContent = item.GIS_ID;
                    gisSelect.appendChild(option);
                });
                showAlert(`Found ${data.gisList.length} GIS ID(s)`, 'success');
            }
        } else {
            showAlert(data.message || 'Failed to fetch GIS IDs', 'error');
        }
    } catch (error) {
        console.error('Error fetching GIS list:', error);
        showAlert('Error connecting to server', 'error');
    }
}

// Fetch invoice details
async function fetchInvoiceDetails() {
    const sapId = document.getElementById('search_sap_id').value.trim();
    const gisId = document.getElementById('search_gis_id').value;

    if (!gisId) {
        return;
    }

    console.log('Fetching invoice for SAP_ID:', sapId, 'GIS_ID:', gisId);

    try {
        const response = await fetch(`/api/invoice-cons/details?sap_id=${encodeURIComponent(sapId)}&gis_id=${encodeURIComponent(gisId)}`, {
            credentials: 'include'
        });

        const data = await response.json();
        console.log('Invoice details response:', data);

        if (data.success && data.invoice) {
            populateForm(data.invoice);
            showAlert('Invoice loaded successfully', 'success');
        } else {
            showAlert(data.message || 'Invoice not found', 'error');
        }
    } catch (error) {
        console.error('Error fetching invoice:', error);
        showAlert('Error connecting to server', 'error');
    }
}

// Populate form with invoice data
function populateForm(invoice) {
    const form = document.getElementById('invoiceForm');
    
    Object.keys(invoice).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
            if (input.type === 'date' && invoice[key]) {
                const date = new Date(invoice[key]);
                if (!isNaN(date.getTime())) {
                    input.value = date.toISOString().split('T')[0];
                }
            } else {
                input.value = invoice[key] !== null && invoice[key] !== undefined ? invoice[key] : '';
            }

            // Make all fields read-only when data is loaded
            input.setAttribute('readonly', true);
            input.setAttribute('disabled', true);
            input.style.backgroundColor = '#e9eef3'; // light grey to show it's locked
        }
    });

    calculateTotal();
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('invoiceForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Validate required fields
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = 'var(--danger)';
            isValid = false;
        } else {
            field.style.borderColor = 'var(--gray-300)';
        }
    });

    if (!isValid) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    // Disable submit button
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const formData = new FormData(form);
        const invoiceData = {};
        
        formData.forEach((value, key) => {
            invoiceData[key] = value || '';
        });

        console.log('Submitting invoice:', invoiceData);

        const response = await fetch('/api/invoice-cons/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(invoiceData)
        });

        const data = await response.json();
        console.log('Save response:', data);

        if (data.success) {
            showAlert('Invoice saved successfully', 'success');
            setTimeout(() => {
                clearForm();
            }, 2000);
        } else {
            showAlert(data.message || 'Failed to save invoice', 'error');
        }
    } catch (error) {
        console.error('Error saving invoice:', error);
        showAlert('Error connecting to server', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

// Clear search
function clearSearch() {
    document.getElementById('search_sap_id').value = '';
    document.getElementById('search_gis_id').innerHTML = '<option value="">-- Select GIS ID --</option>';
    clearForm();
    hideAlert();
}

// Clear form
function clearForm() {
    const form = document.getElementById('invoiceForm');
    form.reset();
    
    // Reset border colors
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.style.borderColor = 'var(--gray-300)';
    });

    // Reset defaults
    document.querySelector('[name="Total_Invoice_Amount"]').value = '0.00';
    document.querySelector('[name="Currency"]').value = '';
}

// Show alert message
function showAlert(message, type = 'success') {
    const alert = document.getElementById('alertMessage');
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';

    setTimeout(() => {
        hideAlert();
    }, 5000);
}

// Hide alert
function hideAlert() {
    const alert = document.getElementById('alertMessage');
    alert.style.display = 'none';
}

// Enable edit mode
function enableEditMode() {
    const confirmEdit = confirm("Are you sure you want to edit this information?");
    if (!confirmEdit) return;

    const form = document.getElementById('invoiceForm');
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        input.removeAttribute('readonly');
        input.removeAttribute('disabled');
        input.style.backgroundColor = '#fff'; // visually show editable
    });

    showAlert('Edit mode activated. You can now update the fields.', 'success');
}

function enableEditMode() {
    const confirmEdit = confirm("Enable edit mode?");
    if (!confirmEdit) return;

    const form = document.getElementById('invoiceForm');
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        input.removeAttribute('readonly');
        input.removeAttribute('disabled');
        input.style.backgroundColor = '#fff';
    });

    showAlert('Edit mode activated — fields are now editable.', 'success');
}

function cancelEditMode() {
    const confirmCancel = confirm("Cancel edit mode and revert fields?");
    if (!confirmCancel) return;

    const form = document.getElementById('invoiceForm');
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        input.setAttribute('readonly', true);
        input.setAttribute('disabled', true);
        input.style.backgroundColor = '#e9eef3';
    });

    showAlert('Edit mode canceled — fields locked again.', 'warning');
}

