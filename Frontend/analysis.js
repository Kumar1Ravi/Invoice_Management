// Load duplicate analysis data
// Load duplicate analysis data
async function loadDuplicateData() {
    const loadingState = document.getElementById('loadingState');
    const tableWrapper = document.getElementById('tableWrapper');
    const tableBody = document.getElementById('tableBody');

    try {
        loadingState.style.display = 'block';
        tableWrapper.style.display = 'none';

        const response = await fetch('/api/duplicates', {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch data');
        }

        const records = data.records || [];

        if (records.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="16" style="text-align:center; padding:40px;">
                        <i class="fas fa-inbox" style="font-size:48px; color:#ccc;"></i>
                        <p style="margin-top:10px; color:#666;">No duplicate records found</p>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = records.map(row => {
                const isDuplicate = row.DUP_True_Duplicate === 1 || row.DUP_True_Duplicate === true;
                const dupSG = row.DUP_SG_Status === 1 || row.DUP_SG_Status === true ? 1 : 0;
                const dupSGLT = row.DUP_SGLT_Status === 1 || row.DUP_SGLT_Status === true ? 1 : 0;
                const dupSGG = row.DUP_SGG_Status === 1 || row.DUP_SGG_Status === true ? 1 : 0;
                const dupSGV = row.DUP_SGV_Status === 1 || row.DUP_SGV_Status === true ? 1 : 0;
                const dupSGM = row.DUP_SGM_Status === 1 || row.DUP_SGM_Status === true ? 1 : 0;
                const dupSGT = row.DUP_SGT_Status === 1 || row.DUP_SGT_Status === true ? 1 : 0;
                const dupSGTA = row.DUP_SGTA_Status === 1 || row.DUP_SGTA_Status === true ? 1 : 0;

                return `
                    <tr
                        data-dup-sg="${dupSG}"
                        data-dup-sglt="${dupSGLT}"
                        data-dup-sgg="${dupSGG}"
                        data-dup-sgv="${dupSGV}"
                        data-dup-sgm="${dupSGM}"
                        data-dup-sgt="${dupSGT}"
                        data-dup-sgta="${dupSGTA}"
                        data-dup-true="${isDuplicate ? 1 : 0}"
                    >
                        <td>${escapeHtml(row.SNo || '-')}</td>
                        <td>${escapeHtml(row.SAP_ID || '-')}</td>
                        <td>${escapeHtml(row.GIS_ID || '-')}</td>
                        <td style="text-align:left;">${escapeHtml(row.Employee_Name || '-')}</td>
                        <td>${escapeHtml(row.Source_Country || '-')}</td>
                        <td>${escapeHtml(row.Destination_Country || '-')}</td>
                        <td class="${dupSG ? 'highlight-dup' : ''}">$${formatNumber(row.Service_Provider_Fee || 0)}</td>
                        <td class="${dupSGLT ? 'highlight-dup' : ''}">$${formatNumber(row.Service_Provider_Fee_Tax || 0)}</td>
                        <td class="${dupSGG ? 'highlight-dup' : ''}">$${formatNumber(row.Govt_Fee || 0)}</td>
                        <td class="${dupSGV ? 'highlight-dup' : ''}">$${formatNumber(row.VFS_Fee || 0)}</td>
                        <td class="${dupSGM ? 'highlight-dup' : ''}">$${formatNumber(row.Misc_Other_Exp || 0)}</td>
                        <td class="${dupSGT ? 'highlight-dup' : ''}">$${formatNumber(row.Tax || 0)}</td>
                        <td class="${dupSGTA ? 'highlight-dup' : ''}">$${formatNumber(row.Total_Invoice_Amount || 0)}</td>
                        <td class="${isDuplicate ? 'highlight-dup' : ''}">${escapeHtml(row.Duplicate_Status || '-')}</td>
                        <td>${escapeHtml(row.SourceTable || '-')}</td>
                        <td>
                            ${row.SourceTable === 'Vend' ? `
                                <select onchange="updateUserStatus('${row.SAP_ID}', this.value)">
                                    <option value="" ${!row.User_Status ? 'selected' : ''}></option>
                                    <option value="Unique" ${row.User_Status === 'Unique' ? 'selected' : ''}>Unique</option>
                                    <option value="Duplicate" ${row.User_Status === 'Duplicate' ? 'selected' : ''}>Duplicate</option>
                                    <option value="Refer Back" ${row.User_Status === 'Refer Back' ? 'selected' : ''}>Refer Back</option>
                                    <option value="Rejected" ${row.User_Status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                                </select>
                            ` : '-'}
                        </td>
                    </tr>
                `;
            }).join('');
        }

        loadingState.style.display = 'none';
        tableWrapper.style.display = 'block';

    } catch (error) {
        console.error('Error loading duplicate data:', error);
        loadingState.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color:#dc3545;"></i>
            <p style="color:#dc3545;">Failed to load data. Please try again.</p>
            <button class="btn btn-primary" onclick="loadDuplicateData()" style="margin-top:15px;">
                <i class="fas fa-redo"></i> Retry
            </button>
        `;
    }
}

// Highlight duplicate cells
function highlightDuplicates() {
    document.querySelectorAll("tbody tr").forEach(row => {
        const mapping = [
            { attr: 'dupSg', index: 6 },
            { attr: 'dupSglt', index: 7 },
            { attr: 'dupSgg', index: 8 },
            { attr: 'dupSgv', index: 9 },
            { attr: 'dupSgm', index: 10 },
            { attr: 'dupSgt', index: 11 },
            { attr: 'dupSgta', index: 12 }
        ];

        mapping.forEach(item => {
            if (row.dataset[item.attr] === "1") {
                const cell = row.cells[item.index];
                if (cell) cell.classList.add("highlight-dup");
            }
        });

        // Highlight Duplicate Status if true duplicate
        if (row.dataset.dupTrue === "1") {
            const cell = row.cells[13];
            if (cell) cell.classList.add("highlight-dup");
        }
    });
}

// Update User Status
async function updateUserStatus(sapId, status) {
    if (!status || !sapId) return;

    try {
        const response = await fetch('/api/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ sapId, status })
        });

        const data = await response.json();
        if (data.success) {
            console.log('Status updated successfully');
        } else {
            showNotification('Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error updating status', 'error');
    }
}

// Run Duplicate Check
async function runDuplicateCheck() {
    if (!confirm('This will execute the duplicate check procedures. Continue?')) return;

    const btn = event.target.closest('.btn-primary');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        const response = await fetch('/api/run-duplicate-check', {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Duplicate check completed successfully');
            setTimeout(() => loadDuplicateData(), 1000);
        } else {
            showNotification(data.message || 'Duplicate check failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error running duplicate check', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-play"></i> Execute Duplicate Check';
    }
}

// Clear All User Status
async function clearAllUserStatus() {
    if (!confirm('Are you sure you want to clear all User Status values?')) return;

    try {
        const response = await fetch('/api/clear-user-status', {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('All User Status values cleared');
            loadDuplicateData();
        } else {
            showNotification(data.message || 'Failed to clear status', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error clearing status', 'error');
    }
}

// Clear Duplicate Validation
async function clearDuplicateValidation() {
    if (!confirm('Are you sure you want to clear all duplicate validation values?')) return;

    try {
        const response = await fetch('/api/clear-duplicate-validation', {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Duplicate validation cleared');
            loadDuplicateData();
        } else {
            showNotification(data.message || 'Failed to clear validation', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error clearing validation', 'error');
    }
}

// Show Notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notificationMessage');
    const timeSpan = document.getElementById('notification-time');

    messageEl.textContent = message;
    timeSpan.textContent = new Date().toLocaleTimeString();
    
    notification.className = type === 'error' ? 'error' : '';
    notification.style.display = 'block';

    setTimeout(hideNotification, 3000);
}

function hideNotification() {
    document.getElementById('notification').style.display = 'none';
}

// Format number
function formatNumber(num) {
    if (num === null || num === undefined) return '0.00';
    return parseFloat(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Load data on page load
document.addEventListener('DOMContentLoaded', loadDuplicateData);