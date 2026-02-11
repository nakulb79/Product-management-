// Global state
let currentProductId = null;
let allProducts = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadProducts();
    setupTabs();
    setupForms();
});

// Setup tabs
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    
    // Load data for the tab
    switch(tabName) {
        case 'products':
            loadProducts();
            break;
        case 'stock':
            loadStock();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'deliveries':
            loadDeliveries();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();
        
        document.getElementById('dashboard').innerHTML = `
            <div class="card">
                <h3>Total Products</h3>
                <div class="value">${data.products}</div>
            </div>
            <div class="card">
                <h3>Low Stock Items</h3>
                <div class="value" style="color: ${data.low_stock_items > 0 ? '#e53e3e' : '#48bb78'}">${data.low_stock_items}</div>
            </div>
            <div class="card">
                <h3>Pending Payments</h3>
                <div class="value">${data.pending_payments}</div>
                <div style="color: #718096; font-size: 0.9rem; margin-top: 0.5rem;">₹${data.pending_payments_amount.toFixed(2)}</div>
            </div>
            <div class="card">
                <h3>Pending Deliveries</h3>
                <div class="value">${data.pending_deliveries}</div>
            </div>
            <div class="card">
                <h3>Total Revenue</h3>
                <div class="value" style="color: #48bb78;">₹${data.total_revenue.toFixed(2)}</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Products
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
        
        if (allProducts.length === 0) {
            document.getElementById('products-list').innerHTML = `
                <div class="empty-state">
                    <p>No products yet. Add your first product to get started!</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Cost</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allProducts.map(product => `
                        <tr>
                            <td><strong>${product.name}</strong><br><small style="color: #718096;">${product.description || ''}</small></td>
                            <td>${product.category || '-'}</td>
                            <td>₹${product.price.toFixed(2)}</td>
                            <td>₹${product.cost.toFixed(2)}</td>
                            <td ${product.stock_quantity <= product.min_quantity ? 'class="low-stock"' : ''}>
                                ${product.stock_quantity || 0}
                                ${product.stock_quantity <= product.min_quantity ? '⚠️' : ''}
                            </td>
                            <td>
                                <div class="actions">
                                    <button class="btn btn-secondary" onclick="editProduct('${product.id}')">Edit</button>
                                    <button class="btn btn-danger" onclick="deleteProduct('${product.id}', '${product.name}')">Delete</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('products-list').innerHTML = html;
        loadDashboard();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Stock Management
async function loadStock() {
    try {
        const response = await fetch('/api/stock');
        const stock = await response.json();
        
        if (stock.length === 0) {
            document.getElementById('stock-list').innerHTML = `
                <div class="empty-state">
                    <p>No stock items found. Add products first!</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Current Stock</th>
                        <th>Min. Stock</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${stock.map(item => {
                        const isLow = item.quantity <= item.min_quantity;
                        return `
                            <tr>
                                <td><strong>${item.product_name}</strong></td>
                                <td>${item.category || '-'}</td>
                                <td ${isLow ? 'class="low-stock"' : ''}>${item.quantity}</td>
                                <td>${item.min_quantity}</td>
                                <td>${item.location || '-'}</td>
                                <td>
                                    <span class="badge ${isLow ? 'badge-danger' : 'badge-success'}">
                                        ${isLow ? 'Low Stock' : 'In Stock'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-secondary" onclick="updateStock('${item.product_id}', '${item.product_name}', ${item.quantity}, ${item.min_quantity}, ${item.max_quantity}, '${item.location || ''}')">Update</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('stock-list').innerHTML = html;
    } catch (error) {
        console.error('Error loading stock:', error);
    }
}

// Payments
async function loadPayments() {
    try {
        const response = await fetch('/api/payments');
        const payments = await response.json();
        
        if (payments.length === 0) {
            document.getElementById('payments-list').innerHTML = `
                <div class="empty-state">
                    <p>No payments recorded yet.</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(payment => `
                        <tr>
                            <td>${payment.order_id || '-'}</td>
                            <td>${payment.customer_name || '-'}<br><small style="color: #718096;">${payment.customer_email || ''}</small></td>
                            <td><strong>₹${payment.amount.toFixed(2)}</strong></td>
                            <td>${payment.payment_method.toUpperCase()}</td>
                            <td>
                                <span class="badge ${
                                    payment.payment_status === 'completed' ? 'badge-success' :
                                    payment.payment_status === 'pending' ? 'badge-warning' :
                                    'badge-danger'
                                }">
                                    ${payment.payment_status}
                                </span>
                            </td>
                            <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                            <td>
                                ${payment.payment_status === 'pending' ? `
                                    <button class="btn btn-success" onclick="updatePaymentStatus('${payment.id}', 'completed')">Mark Completed</button>
                                ` : '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('payments-list').innerHTML = html;
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// Deliveries
async function loadDeliveries() {
    try {
        const response = await fetch('/api/deliveries');
        const deliveries = await response.json();
        
        if (deliveries.length === 0) {
            document.getElementById('deliveries-list').innerHTML = `
                <div class="empty-state">
                    <p>No deliveries scheduled yet.</p>
                </div>
            `;
            return;
        }
        
        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Address</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Tracking</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${deliveries.map(delivery => `
                        <tr>
                            <td>${delivery.order_id || '-'}</td>
                            <td><strong>${delivery.customer_name}</strong><br><small style="color: #718096;">${delivery.customer_phone || ''}</small></td>
                            <td>${delivery.customer_address}</td>
                            <td><small>${delivery.items || 'N/A'}</small></td>
                            <td>
                                <span class="badge ${
                                    delivery.delivery_status === 'delivered' ? 'badge-success' :
                                    delivery.delivery_status === 'in_transit' ? 'badge-info' :
                                    'badge-warning'
                                }">
                                    ${delivery.delivery_status}
                                </span>
                            </td>
                            <td>${delivery.tracking_number || '-'}</td>
                            <td>
                                ${delivery.delivery_status === 'pending' ? `
                                    <button class="btn btn-secondary" onclick="updateDeliveryStatus('${delivery.id}', 'in_transit')">Ship</button>
                                ` : delivery.delivery_status === 'in_transit' ? `
                                    <button class="btn btn-success" onclick="updateDeliveryStatus('${delivery.id}', 'delivered')">Delivered</button>
                                ` : '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        document.getElementById('deliveries-list').innerHTML = html;
    } catch (error) {
        console.error('Error loading deliveries:', error);
    }
}

// Product Modal Functions
function openProductModal(productId = null) {
    currentProductId = productId;
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    
    if (productId) {
        document.getElementById('productModalTitle').textContent = 'Edit Product';
        // Load product data
        fetch(`/api/products/${productId}`)
            .then(res => res.json())
            .then(product => {
                document.getElementById('productId').value = product.id;
                document.getElementById('productName').value = product.name;
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productPrice').value = product.price;
                document.getElementById('productCost').value = product.cost;
                document.getElementById('productCategory').value = product.category || '';
                document.getElementById('initialStock').value = product.stock_quantity || 0;
                document.getElementById('minQuantity').value = product.min_quantity || 10;
            });
    } else {
        document.getElementById('productModalTitle').textContent = 'Add Product';
        form.reset();
        document.getElementById('productId').value = '';
    }
    
    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    currentProductId = null;
}

function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        loadProducts();
    } catch (error) {
        alert('Error deleting product: ' + error.message);
    }
}

// Stock Modal Functions
function updateStock(productId, productName, quantity, minQuantity, maxQuantity, location) {
    document.getElementById('stockProductId').value = productId;
    document.getElementById('stockProductName').textContent = productName;
    document.getElementById('stockQuantity').value = quantity;
    document.getElementById('stockMinQuantity').value = minQuantity;
    document.getElementById('stockMaxQuantity').value = maxQuantity;
    document.getElementById('stockLocation').value = location;
    document.getElementById('stockModal').classList.add('active');
}

function closeStockModal() {
    document.getElementById('stockModal').classList.remove('active');
}

// Payment Modal Functions
function openPaymentModal() {
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

async function updatePaymentStatus(paymentId, status) {
    try {
        const response = await fetch(`/api/payments/${paymentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_status: status })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update payment');
        }
        
        loadPayments();
        loadDashboard();
    } catch (error) {
        alert('Error updating payment: ' + error.message);
    }
}

// Delivery Modal Functions
async function openDeliveryModal() {
    document.getElementById('deliveryForm').reset();
    
    // Load products for selection
    const response = await fetch('/api/products');
    const products = await response.json();
    
    const productsHtml = products.map(product => `
        <div style="margin: 0.5rem 0; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 5px;">
            <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" name="product_${product.id}" value="${product.id}">
                ${product.name} (Stock: ${product.stock_quantity || 0})
                <input type="number" name="quantity_${product.id}" min="1" max="${product.stock_quantity || 0}" placeholder="Qty" style="width: 80px; margin-left: auto;" disabled>
            </label>
        </div>
    `).join('');
    
    document.getElementById('deliveryProducts').innerHTML = productsHtml;
    
    // Enable quantity input when checkbox is checked
    products.forEach(product => {
        const checkbox = document.querySelector(`input[name="product_${product.id}"]`);
        const quantityInput = document.querySelector(`input[name="quantity_${product.id}"]`);
        checkbox.addEventListener('change', (e) => {
            quantityInput.disabled = !e.target.checked;
            if (!e.target.checked) quantityInput.value = '';
        });
    });
    
    document.getElementById('deliveryModal').classList.add('active');
}

function closeDeliveryModal() {
    document.getElementById('deliveryModal').classList.remove('active');
}

async function updateDeliveryStatus(deliveryId, status) {
    try {
        const response = await fetch(`/api/deliveries/${deliveryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivery_status: status })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update delivery');
        }
        
        loadDeliveries();
        loadDashboard();
    } catch (error) {
        alert('Error updating delivery: ' + error.message);
    }
}

// Setup Forms
function setupForms() {
    // Product Form
    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            cost: parseFloat(document.getElementById('productCost').value),
            category: document.getElementById('productCategory').value,
            initial_stock: parseInt(document.getElementById('initialStock').value),
            min_quantity: parseInt(document.getElementById('minQuantity').value)
        };
        
        try {
            const productId = document.getElementById('productId').value;
            if (productId) {
                await fetch(`/api/products/${productId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            closeProductModal();
            loadProducts();
        } catch (error) {
            alert('Error saving product: ' + error.message);
        }
    });
    
    // Stock Form
    document.getElementById('stockForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productId = document.getElementById('stockProductId').value;
        const data = {
            quantity: parseInt(document.getElementById('stockQuantity').value),
            min_quantity: parseInt(document.getElementById('stockMinQuantity').value),
            max_quantity: parseInt(document.getElementById('stockMaxQuantity').value),
            location: document.getElementById('stockLocation').value
        };
        
        try {
            await fetch(`/api/stock/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            closeStockModal();
            loadStock();
            loadProducts();
        } catch (error) {
            alert('Error updating stock: ' + error.message);
        }
    });
    
    // Payment Form
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            order_id: document.getElementById('paymentOrderId').value,
            amount: parseFloat(document.getElementById('paymentAmount').value),
            payment_method: document.getElementById('paymentMethod').value,
            payment_status: document.getElementById('paymentStatus').value,
            customer_name: document.getElementById('paymentCustomerName').value,
            customer_email: document.getElementById('paymentCustomerEmail').value,
            notes: document.getElementById('paymentNotes').value
        };
        
        try {
            await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            closePaymentModal();
            loadPayments();
            loadDashboard();
        } catch (error) {
            alert('Error creating payment: ' + error.message);
        }
    });
    
    // Delivery Form
    document.getElementById('deliveryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Collect selected products
        const items = [];
        const checkboxes = document.querySelectorAll('#deliveryProducts input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            const productId = checkbox.value;
            const quantity = parseInt(document.querySelector(`input[name="quantity_${productId}"]`).value);
            if (quantity > 0) {
                items.push({ product_id: productId, quantity });
            }
        });
        
        if (items.length === 0) {
            alert('Please select at least one product with quantity');
            return;
        }
        
        const data = {
            order_id: document.getElementById('deliveryOrderId').value,
            customer_name: document.getElementById('deliveryCustomerName').value,
            customer_address: document.getElementById('deliveryCustomerAddress').value,
            customer_phone: document.getElementById('deliveryCustomerPhone').value,
            delivery_date: document.getElementById('deliveryDate').value,
            tracking_number: document.getElementById('deliveryTracking').value,
            notes: document.getElementById('deliveryNotes').value,
            items: items
        };
        
        try {
            const response = await fetch('/api/deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create delivery');
            }
            
            closeDeliveryModal();
            loadDeliveries();
            loadDashboard();
        } catch (error) {
            alert('Error creating delivery: ' + error.message);
        }
    });
}
