// Global variables for pagination
let allInvoices = [];
let filteredInvoices = [];
let currentPage = 1;
let recordsPerPage = 20;

// Fetch and display invoice data
async function loadInvoiceData() {
    const loadingState = document.getElementById('loadingState');
    const dataTable = document.getElementById('dataTable');
    const pagination = document.getElementById('pagination');

    try {
        // Show loading state
        loadingState.style.display = 'block';
        dataTable.style.display = 'none';
        pagination.style.display = 'none';

        // Fetch data from backend API
        const response = await fetch('/api/invoices', {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch data');
        }

        allInvoices = data.invoices || [];
        filteredInvoices = [...allInvoices];

        // Update stats with actual calculations
        updateStats(allInvoices);

        // Reset to first page
        currentPage = 1;

        // Display data
        displayPage();

        // Hide loading, show table
        loadingState.style.display = 'none';
        dataTable.style.display = 'table';  // Make table display as table
        dataTable.classList.add('loaded');   // Add loaded class for opacity
        pagination.style.display = 'flex';

    } catch (error) {
        console.error('Error loading invoice data:', error);
        loadingState.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color:#dc3545;"></i>
            <p style="color:#dc3545;">Failed to load invoice data. Please try again.</p>
            <button class="filter-btn" onclick="loadInvoiceData()" style="margin-top:15px;">
                <i class="fas fa-redo"></i> Retry
            </button>
        `;
    }
}

// Display current page
function displayPage() {
    const tableBody = document.getElementById('tableBody');
    
    if (filteredInvoices.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="13" class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>No Records Found</h3>
                    <p>No invoice records match your search.</p>
                </td>
            </tr>
        `;
        document.getElementById('pagination').style.display = 'none';
        return;
    }

    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const pageData = filteredInvoices.slice(startIndex, endIndex);

    tableBody.innerHTML = pageData.map(row => `
        <tr>
            <td style="text-align: center;">${escapeHtml(String(row.SNo || '-'))}</td>
            <td style="text-align: center;">${escapeHtml(String(row.SAP_ID || '-'))}</td>
            <td style="text-align: center;">${escapeHtml(String(row.GIS_ID || '-'))}</td>
            <td style="text-align: left;">${escapeHtml(String(row.Employee_Name || '-'))}</td>
            <td style="text-align: center;">${escapeHtml(String(row.Source_Country || '-'))}</td>
            <td style="text-align: center;">${escapeHtml(String(row.Destination_Country || '-'))}</td>
            <td style="text-align: center;" class="amount-column">$${formatNumber(row.Service_Provider_Fee || 0)}</td>
            <td style="text-align: center;" class="amount-column">$${formatNumber(row.Service_Provider_Fee_Tax || 0)}</td>
            <td style="text-align: center;" class="amount-column">$${formatNumber(row.Govt_Fee || 0)}</td>
            <td style="text-align: center;" class="amount-column">$${formatNumber(row.VFS_Fee || 0)}</td>
            <td style="text-align: center;" class="amount-column">$${formatNumber(row.Misc_Other_Exp || 0)}</td>
            <td style="text-align: center;" class="amount-column">$${formatNumber(row.Tax || 0)}</td>
            <td style="text-align: center;" class="amount-column">$${formatNumber(row.Total_Invoice_Amount || 0)}</td>
        </tr>
    `).join('');

    updatePaginationControls();
}

// Update pagination controls
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredInvoices.length / recordsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    
    // Update button states
    document.getElementById('firstBtn').disabled = currentPage === 1;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
    document.getElementById('lastBtn').disabled = currentPage === totalPages;

    // Generate page numbers
    let pages = [];
    
    if (totalPages <= 7) {
        // Show all pages if 7 or fewer
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        // Show first, last, current and surrounding pages
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
    }

    pageNumbers.innerHTML = pages.map(page => {
        if (page === '...') {
            return '<span class="page-ellipsis">...</span>';
        }
        return `<span class="page-number ${page === currentPage ? 'active' : ''}" 
                      onclick="goToPage(${page})">${page}</span>`;
    }).join('');
}

// Pagination functions
function goToPage(page) {
    currentPage = page;
    displayPage();
}

function nextPage() {
    const totalPages = Math.ceil(filteredInvoices.length / recordsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayPage();
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayPage();
    }
}

function goToFirstPage() {
    currentPage = 1;
    displayPage();
}

function goToLastPage() {
    currentPage = Math.ceil(filteredInvoices.length / recordsPerPage);
    displayPage();
}

function changeRecordsPerPage() {
    recordsPerPage = parseInt(document.getElementById('recordsPerPage').value);
    currentPage = 1;
    displayPage();
}

// Update statistics with real calculations
function updateStats(invoices) {
    const totalRecords = invoices.length;
    
    // Calculate total amount
    const totalAmount = invoices.reduce((sum, invoice) => {
        return sum + (parseFloat(invoice.Total_Invoice_Amount) || 0);
    }, 0);
    
    // Calculate average invoice amount
    const avgAmount = totalRecords > 0 ? totalAmount / totalRecords : 0;
    
    // Count unique employees
    const uniqueEmployees = new Set(
        invoices
            .map(inv => inv.Employee_Name)
            .filter(name => name && name !== '-')
    ).size;
    
    // Update DOM
    document.getElementById('totalRecords').textContent = totalRecords.toLocaleString();
    document.getElementById('totalAmount').textContent = '$' + totalAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    document.getElementById('avgInvoiceAmount').textContent = '$' + avgAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    document.getElementById('uniqueEmployees').textContent = uniqueEmployees.toLocaleString();
}

// Format number with commas
function formatNumber(num) {
    if (num === null || num === undefined) return '0.00';
    return parseFloat(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Search functionality
document.getElementById('searchInput').addEventListener('keyup', function() {
    const searchTerm = this.value.toLowerCase();
    
    filteredInvoices = allInvoices.filter(invoice => {
        return Object.values(invoice).some(value => 
            String(value).toLowerCase().includes(searchTerm)
        );
    });
    
    currentPage = 1;
    displayPage();
});

// Refresh data
function refreshData() {
    loadInvoiceData();
}

// Load data on page load
document.addEventListener('DOMContentLoaded', loadInvoiceData);