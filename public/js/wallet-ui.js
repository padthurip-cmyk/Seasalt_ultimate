/**
 * SeaSalt Pickles - Wallet UI Component
 * =====================================
 * Shows wallet balance in header with 48hr countdown timer
 * 
 * ADD THIS TO: public/js/wallet-ui.js
 * THEN ADD: <script src="js/wallet-ui.js"></script> after spinwheel.js
 */

const WalletUI = (function() {
    'use strict';
    
    let walletWidget = null;
    let timerInterval = null;
    
    // ============================================
    // STYLES
    // ============================================
    const STYLES = `
        /* Wallet Badge in Header */
        .wallet-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            padding: 8px 14px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(16,185,129,0.3);
            transition: all 0.3s ease;
            position: relative;
        }
        .wallet-badge:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(16,185,129,0.4);
        }
        .wallet-badge-icon {
            font-size: 16px;
        }
        .wallet-badge-amount {
            font-weight: 800;
        }
        .wallet-badge-timer {
            font-size: 11px;
            opacity: 0.9;
            font-family: 'Courier New', monospace;
        }
        .wallet-badge.expired {
            background: linear-gradient(135deg, #6B7280, #4B5563);
            box-shadow: 0 2px 8px rgba(107,114,128,0.3);
        }
        
        /* Wallet Popup */
        .wallet-popup {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9998;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .wallet-popup.show {
            display: flex;
        }
        .wallet-popup-box {
            background: white;
            border-radius: 20px;
            padding: 28px;
            max-width: 340px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: walletPopIn 0.3s ease;
        }
        @keyframes walletPopIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .wallet-popup-icon {
            font-size: 50px;
            margin-bottom: 12px;
        }
        .wallet-popup-title {
            font-size: 20px;
            font-weight: 700;
            color: #1F2937;
            margin-bottom: 4px;
        }
        .wallet-popup-subtitle {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 20px;
        }
        .wallet-popup-amount {
            font-size: 48px;
            font-weight: 900;
            color: #10B981;
            margin-bottom: 8px;
        }
        .wallet-popup-timer-box {
            background: #FEF3C7;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 20px;
        }
        .wallet-popup-timer-label {
            font-size: 12px;
            color: #92400E;
            margin-bottom: 4px;
        }
        .wallet-popup-timer-value {
            font-size: 24px;
            font-weight: 800;
            color: #D97706;
            font-family: 'Courier New', monospace;
        }
        .wallet-popup-timer-warning {
            font-size: 11px;
            color: #B45309;
            margin-top: 4px;
        }
        .wallet-popup-expired {
            background: #FEE2E2;
        }
        .wallet-popup-expired .wallet-popup-timer-label,
        .wallet-popup-expired .wallet-popup-timer-warning {
            color: #991B1B;
        }
        .wallet-popup-expired .wallet-popup-timer-value {
            color: #DC2626;
        }
        .wallet-popup-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #EA580C, #DC2626);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .wallet-popup-btn:hover {
            transform: translateY(-2px);
        }
        .wallet-popup-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #F3F4F6;
            border: none;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .wallet-popup-close:hover {
            background: #E5E7EB;
        }
        
        /* Cart Wallet Display */
        .cart-wallet-box {
            background: linear-gradient(135deg, #ECFDF5, #D1FAE5);
            border: 2px solid #10B981;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .cart-wallet-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .cart-wallet-icon {
            font-size: 24px;
        }
        .cart-wallet-text {
            font-size: 14px;
            color: #065F46;
        }
        .cart-wallet-amount {
            font-weight: 700;
            color: #059669;
        }
        .cart-wallet-timer {
            font-size: 11px;
            color: #047857;
            font-family: 'Courier New', monospace;
        }
        .cart-wallet-apply {
            background: #10B981;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
        }
        .cart-wallet-apply:hover {
            background: #059669;
        }
        .cart-wallet-apply.applied {
            background: #6B7280;
            cursor: default;
        }
    `;
    
    // ============================================
    // INJECT STYLES
    // ============================================
    function injectStyles() {
        if (document.getElementById('wallet-ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'wallet-ui-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }
    
    // ============================================
    // GET WALLET DATA
    // ============================================
    function getWalletData() {
        try {
            const data = JSON.parse(localStorage.getItem('seasalt_wallet') || '{}');
            if (!data.amount) return null;
            
            const expiresAt = new Date(data.expiresAt);
            const now = new Date();
            const isExpired = now > expiresAt;
            
            return {
                amount: data.amount,
                expiresAt: expiresAt,
                isExpired: isExpired,
                timeLeft: isExpired ? 0 : expiresAt - now
            };
        } catch (e) {
            return null;
        }
    }
    
    // ============================================
    // FORMAT TIME
    // ============================================
    function formatTime(ms) {
        if (ms <= 0) return 'EXPIRED';
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }
    
    // ============================================
    // CREATE WALLET BADGE (for header)
    // ============================================
    function createWalletBadge() {
        const wallet = getWalletData();
        if (!wallet || wallet.isExpired) return null;
        
        const badge = document.createElement('div');
        badge.className = 'wallet-badge';
        badge.id = 'wallet-badge';
        badge.innerHTML = `
            <span class="wallet-badge-icon">💰</span>
            <span class="wallet-badge-amount">₹${wallet.amount}</span>
            <span class="wallet-badge-timer">${formatTime(wallet.timeLeft)}</span>
        `;
        badge.onclick = showWalletPopup;
        
        return badge;
    }
    
    // ============================================
    // UPDATE WALLET BADGE
    // ============================================
    function updateWalletBadge() {
        const badge = document.getElementById('wallet-badge');
        if (!badge) return;
        
        const wallet = getWalletData();
        if (!wallet) {
            badge.remove();
            return;
        }
        
        if (wallet.isExpired) {
            badge.classList.add('expired');
            badge.querySelector('.wallet-badge-amount').textContent = '₹0';
            badge.querySelector('.wallet-badge-timer').textContent = 'EXPIRED';
            // Remove from localStorage
            localStorage.removeItem('seasalt_wallet');
        } else {
            badge.querySelector('.wallet-badge-amount').textContent = '₹' + wallet.amount;
            badge.querySelector('.wallet-badge-timer').textContent = formatTime(wallet.timeLeft);
        }
    }
    
    // ============================================
    // SHOW WALLET POPUP
    // ============================================
    function showWalletPopup() {
        const wallet = getWalletData();
        if (!wallet) return;
        
        // Remove existing popup
        const existing = document.getElementById('wallet-popup');
        if (existing) existing.remove();
        
        const popup = document.createElement('div');
        popup.className = 'wallet-popup show';
        popup.id = 'wallet-popup';
        popup.innerHTML = `
            <div class="wallet-popup-box" style="position:relative;">
                <button class="wallet-popup-close" onclick="WalletUI.hidePopup()">✕</button>
                <div class="wallet-popup-icon">${wallet.isExpired ? '😢' : '💰'}</div>
                <h3 class="wallet-popup-title">${wallet.isExpired ? 'Wallet Expired' : 'Your Wallet'}</h3>
                <p class="wallet-popup-subtitle">${wallet.isExpired ? 'Your reward has expired' : 'Spin wheel reward'}</p>
                <div class="wallet-popup-amount">₹${wallet.isExpired ? 0 : wallet.amount}</div>
                <div class="wallet-popup-timer-box ${wallet.isExpired ? 'wallet-popup-expired' : ''}">
                    <div class="wallet-popup-timer-label">${wallet.isExpired ? '⏰ Expired' : '⏰ Time remaining'}</div>
                    <div class="wallet-popup-timer-value" id="wallet-popup-timer">${formatTime(wallet.timeLeft)}</div>
                    <div class="wallet-popup-timer-warning">${wallet.isExpired ? 'Spin the wheel again next month!' : 'Use before it expires!'}</div>
                </div>
                <button class="wallet-popup-btn" onclick="WalletUI.hidePopup()">
                    ${wallet.isExpired ? 'Got it' : '🛒 Shop Now'}
                </button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Close on background click
        popup.onclick = function(e) {
            if (e.target === popup) hideWalletPopup();
        };
    }
    
    function hideWalletPopup() {
        const popup = document.getElementById('wallet-popup');
        if (popup) popup.remove();
    }
    
    // ============================================
    // ADD WALLET TO HEADER
    // ============================================
    function addToHeader() {
        const wallet = getWalletData();
        if (!wallet || wallet.isExpired) return;
        
        // Try common header selectors
        const headerSelectors = [
            '.header-right',
            '.header-icons',
            '.nav-icons',
            '.header-actions',
            'header nav',
            'header .container',
            '.navbar-right',
            '#header-right'
        ];
        
        let headerTarget = null;
        for (const sel of headerSelectors) {
            headerTarget = document.querySelector(sel);
            if (headerTarget) break;
        }
        
        // If no header found, create floating badge
        if (!headerTarget) {
            createFloatingBadge();
            return;
        }
        
        // Remove existing badge
        const existing = document.getElementById('wallet-badge');
        if (existing) existing.remove();
        
        const badge = createWalletBadge();
        if (badge) {
            headerTarget.insertBefore(badge, headerTarget.firstChild);
        }
    }
    
    // ============================================
    // CREATE FLOATING BADGE (fallback)
    // ============================================
    function createFloatingBadge() {
        const wallet = getWalletData();
        if (!wallet || wallet.isExpired) return;
        
        const existing = document.getElementById('wallet-badge');
        if (existing) existing.remove();
        
        const badge = createWalletBadge();
        if (!badge) return;
        
        badge.style.cssText = `
            position: fixed;
            top: 80px;
            right: 16px;
            z-index: 1000;
        `;
        
        document.body.appendChild(badge);
    }
    
    // ============================================
    // CREATE CART WALLET BOX
    // ============================================
    function createCartWalletBox(onApply) {
        const wallet = getWalletData();
        if (!wallet || wallet.isExpired) return null;
        
        const box = document.createElement('div');
        box.className = 'cart-wallet-box';
        box.id = 'cart-wallet-box';
        box.innerHTML = `
            <div class="cart-wallet-left">
                <span class="cart-wallet-icon">💰</span>
                <div>
                    <div class="cart-wallet-text">
                        Wallet Balance: <span class="cart-wallet-amount">₹${wallet.amount}</span>
                    </div>
                    <div class="cart-wallet-timer">Expires in ${formatTime(wallet.timeLeft)}</div>
                </div>
            </div>
            <button class="cart-wallet-apply" id="cart-wallet-apply">Apply</button>
        `;
        
        const applyBtn = box.querySelector('#cart-wallet-apply');
        applyBtn.onclick = function() {
            if (this.classList.contains('applied')) return;
            this.textContent = '✓ Applied';
            this.classList.add('applied');
            if (onApply) onApply(wallet.amount);
        };
        
        return box;
    }
    
    // ============================================
    // ADD TO CART PAGE
    // ============================================
    function addToCartPage(onApply) {
        const wallet = getWalletData();
        if (!wallet || wallet.isExpired) return;
        
        // Try to find cart summary section
        const cartSelectors = [
            '.cart-summary',
            '.cart-totals',
            '.order-summary',
            '#cart-summary',
            '.checkout-summary',
            '.cart-sidebar'
        ];
        
        let cartTarget = null;
        for (const sel of cartSelectors) {
            cartTarget = document.querySelector(sel);
            if (cartTarget) break;
        }
        
        if (!cartTarget) return;
        
        // Remove existing
        const existing = document.getElementById('cart-wallet-box');
        if (existing) existing.remove();
        
        const box = createCartWalletBox(onApply);
        if (box) {
            cartTarget.insertBefore(box, cartTarget.firstChild);
        }
    }
    
    // ============================================
    // START TIMER
    // ============================================
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        
        timerInterval = setInterval(function() {
            updateWalletBadge();
            
            // Update popup timer if open
            const popupTimer = document.getElementById('wallet-popup-timer');
            if (popupTimer) {
                const wallet = getWalletData();
                popupTimer.textContent = wallet ? formatTime(wallet.timeLeft) : 'EXPIRED';
            }
            
            // Update cart timer if visible
            const cartTimer = document.querySelector('.cart-wallet-timer');
            if (cartTimer) {
                const wallet = getWalletData();
                if (wallet && !wallet.isExpired) {
                    cartTimer.textContent = 'Expires in ' + formatTime(wallet.timeLeft);
                } else {
                    const cartBox = document.getElementById('cart-wallet-box');
                    if (cartBox) cartBox.remove();
                }
            }
        }, 1000);
    }
    
    // ============================================
    // INIT
    // ============================================
    function init() {
        injectStyles();
        
        const wallet = getWalletData();
        if (wallet && !wallet.isExpired) {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    addToHeader();
                    startTimer();
                });
            } else {
                addToHeader();
                startTimer();
            }
        }
        
        // Listen for wallet updates
        window.addEventListener('walletUpdated', function() {
            const existing = document.getElementById('wallet-badge');
            if (existing) existing.remove();
            addToHeader();
        });
        
        console.log('[WalletUI] Initialized');
    }
    
    return {
        init: init,
        getWalletData: getWalletData,
        addToHeader: addToHeader,
        addToCartPage: addToCartPage,
        showPopup: showWalletPopup,
        hidePopup: hideWalletPopup,
        createCartWalletBox: createCartWalletBox
    };
})();

// Auto-init
WalletUI.init();

window.WalletUI = WalletUI;
