/**
 * SeaSalt Pickles - Admin Panel
 * ==============================
 * Admin dashboard for managing products, orders, and settings.
 */

// ============================================
// CONFIGURATION
// ============================================
const API_BASE = '/.netlify/functions';

// Simple admin credentials (in production, use proper authentication)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'seasalt@2024'
};

// ============================================
// STATE
// ============================================
let isLoggedIn = false;
let products = [];
let orders = [];
let users = [];
let siteConfig = {};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (token === 'authenticated') {
        showDashboard();
    }
}

function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => showTab(link.dataset.tab));
    });
    
    // Product form
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    
    // Search inputs
    document.getElementById('product-search')?.addEventListener('input', filterProducts);
}

// ============================================
// AUTHENTICATION
// ============================================
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem('admin_token', 'authenticated');
        showDashboard();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
}

function handleLogout() {
    localStorage.removeItem('admin_token');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    isLoggedIn = true;
    loadDashboardData();
}

// ============================================
// TAB NAVIGATION
// ============================================
function showTab(tabName) {
    // Update sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.tab === tabName) {
            link.classList.add('active');
        }
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Load tab-specific data
    switch (tabName) {
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// ============================================
// DATA LOADING
// ============================================
async function loadDashboardData() {
    try {
        // Load products
        await loadProducts();
        
        // Update stats
        document.getElementById('stat-products').textContent = products.length;
        document.getElementById('stat-orders').textContent = orders.length;
        document.getElementById('stat-users').textContent = users.length;
        
        // Calculate revenue
        const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        document.getElementById('stat-revenue').textContent = `₹${revenue.toLocaleString('en-IN')}`;
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadProducts() {
    try {
        // Try API first
        const response = await fetch(`${API_BASE}/products?includeInactive=true`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            products = data.data;
        } else {
            // Fallback to seed data
            const seedResponse = await fetch('/data/products-seed.json');
            const seedData = await seedResponse.json();
            products = seedData.products;
        }
        
        renderProductsTable();
        
    } catch (error) {
        console.error('Error loading products:', error);
        // Try seed data
        try {
            const seedResponse = await fetch('/data/products-seed.json');
            const seedData = await seedResponse.json();
            products = seedData.products;
            renderProductsTable();
        } catch (e) {
            console.error('Could not load seed data:', e);
        }
    }
}

async function loadOrders() {
    const tbody = document.getElementById('orders-table');
    tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No orders yet. Orders will appear here when customers place them.</td></tr>';
}

async function loadUsers() {
    const tbody = document.getElementById('users-table');
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No users yet. Users will appear here after they register via spin wheel.</td></tr>';
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/config`);
        const data = await response.json();
        
        if (data.success) {
            siteConfig = data.data;
            
            // Populate settings form
            document.getElementById('spin-enabled').checked = siteConfig.spinWheelEnabled !== false;
            document.getElementById('spin-odds').value = siteConfig.spinWheelOdds || 30;
            document.getElementById('spin-rewards').value = (siteConfig.rewards || [99, 299, 599]).join(', ');
            document.getElementById('delivery-charge').value = siteConfig.deliveryCharges?.standard || 50;
            document.getElementById('free-delivery-above').value = siteConfig.deliveryCharges?.freeAbove || 500;
            document.getElementById('min-order').value = siteConfig.minOrderValue || 199;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// ============================================
// PRODUCTS TABLE
// ============================================
function renderProductsTable() {
    const tbody = document.getElementById('products-table');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No products. Click "Import from Seed" to add products.</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-pickle-50 rounded-lg overflow-hidden">
                        <img src="https://static.wixstatic.com/media/${product.images?.[0] || ''}/v1/fill/w_100,h_100/image.jpg" 
                             alt="${product.name}" class="w-full h-full object-cover"
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23f5f5f5%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3E🫙%3C/text%3E%3C/svg%3E'">
                    </div>
                    <div>
                        <p class="font-medium text-gray-800">${product.name}</p>
                        <p class="text-xs text-gray-500">${product.id}</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-gray-600">${product.primaryCategory}</td>
            <td class="px-6 py-4 text-gray-800 font-medium">
                ₹${Math.min(...product.variants.map(v => v.price)).toLocaleString('en-IN')}
                ${product.variants.length > 1 ? ` - ₹${Math.max(...product.variants.map(v => v.price)).toLocaleString('en-IN')}` : ''}
            </td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-medium ${product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                    ${product.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button onclick="editProduct('${product.id}')" class="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-sm hover:bg-blue-200 transition-colors">
                        Edit
                    </button>
                    <button onclick="toggleProductStatus('${product.id}')" class="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                        ${product.active ? 'Disable' : 'Enable'}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterProducts() {
    const query = document.getElementById('product-search').value.toLowerCase();
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.primaryCategory.toLowerCase().includes(query)
    );
    
    // Temporarily replace products for rendering
    const originalProducts = products;
    products = filtered;
    renderProductsTable();
    products = originalProducts;
}

// ============================================
// PRODUCT MODAL
// ============================================
function openProductModal(productId = null) {
    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('product-modal-title').textContent = productId ? 'Edit Product' : 'Add Product';
    
    if (productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
            document.getElementById('edit-product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.primaryCategory;
            document.getElementById('product-subcategory').value = product.subCategory || '';
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-ribbon').value = product.ribbon || '';
            document.getElementById('product-image').value = product.images?.[0] || '';
            document.getElementById('product-variants').value = JSON.stringify(product.variants, null, 2);
            document.getElementById('product-active').checked = product.active;
        }
    } else {
        document.getElementById('product-form').reset();
        document.getElementById('edit-product-id').value = '';
        document.getElementById('product-active').checked = true;
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
}

function editProduct(productId) {
    openProductModal(productId);
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const productId = document.getElementById('edit-product-id').value;
    const productData = {
        id: productId || `prod_${Date.now()}`,
        name: document.getElementById('product-name').value,
        primaryCategory: document.getElementById('product-category').value,
        subCategory: document.getElementById('product-subcategory').value,
        description: document.getElementById('product-description').value,
        ribbon: document.getElementById('product-ribbon').value,
        images: [document.getElementById('product-image').value].filter(Boolean),
        variants: JSON.parse(document.getElementById('product-variants').value),
        active: document.getElementById('product-active').checked,
        brand: 'Sea Salt Pickles'
    };
    
    try {
        const method = productId ? 'PUT' : 'POST';
        const response = await fetch(`${API_BASE}/products`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(productId ? 'Product updated!' : 'Product created!');
            closeProductModal();
            loadProducts();
        } else {
            showToast('Error saving product', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        
        // Update local array for demo
        const index = products.findIndex(p => p.id === productId);
        if (index > -1) {
            products[index] = productData;
        } else {
            products.push(productData);
        }
        
        showToast(productId ? 'Product updated locally!' : 'Product added locally!');
        closeProductModal();
        renderProductsTable();
    }
}

async function toggleProductStatus(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    product.active = !product.active;
    
    try {
        await fetch(`${API_BASE}/products`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: productId, active: product.active })
        });
    } catch (error) {
        console.error('Error updating product:', error);
    }
    
    renderProductsTable();
    showToast(`Product ${product.active ? 'enabled' : 'disabled'}`);
}

// ============================================
// IMPORT PRODUCTS
// ============================================
async function importProducts() {
    try {
        showToast('Importing products...');
        
        // Load seed data
        const response = await fetch('/data/products-seed.json');
        const seedData = await response.json();
        
        // Try to save to API
        let savedCount = 0;
        for (const product of seedData.products) {
            try {
                await fetch(`${API_BASE}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(product)
                });
                savedCount++;
            } catch (e) {
                // Continue even if API fails
            }
        }
        
        // Update local products
        products = seedData.products;
        renderProductsTable();
        
        showToast(`Imported ${products.length} products!`);
        document.getElementById('stat-products').textContent = products.length;
        
    } catch (error) {
        console.error('Error importing products:', error);
        showToast('Error importing products', 'error');
    }
}

// ============================================
// SETTINGS
// ============================================
async function saveSettings() {
    const config = {
        spinWheelEnabled: document.getElementById('spin-enabled').checked,
        spinWheelOdds: parseInt(document.getElementById('spin-odds').value),
        rewards: document.getElementById('spin-rewards').value.split(',').map(r => parseInt(r.trim())),
        deliveryCharges: {
            standard: parseInt(document.getElementById('delivery-charge').value),
            freeAbove: parseInt(document.getElementById('free-delivery-above').value)
        },
        minOrderValue: parseInt(document.getElementById('min-order').value)
    };
    
    try {
        await fetch(`${API_BASE}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        showToast('Settings saved!');
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Settings saved locally!');
    }
    
    siteConfig = config;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('admin-toast');
    const inner = toast.querySelector('div');
    
    inner.textContent = message;
    inner.className = `px-6 py-3 rounded-xl shadow-lg ${type === 'error' ? 'bg-red-500' : 'bg-gray-800'} text-white`;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Make functions globally available
window.showTab = showTab;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.editProduct = editProduct;
window.toggleProductStatus = toggleProductStatus;
window.importProducts = importProducts;
window.saveSettings = saveSettings;
