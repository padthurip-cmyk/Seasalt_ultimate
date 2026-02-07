/**
 * SeaSalt Pickles - Wallet UI Component v3
 * =========================================
 * Shows wallet balance with LIVE TIMER in header
 * Targets: #wallet-btn and #wallet-balance
 */

const WalletUI = (function() {
    'use strict';
    
    let timerInterval = null;
    let timerElement = null;
    
    // ============================================
    // GET WALLET DATA
    // ============================================
    function getWalletData() {
        try {
            const data = JSON.parse(localStorage.getItem('seasalt_wallet') || '{}');
            if (!data.amount || data.amount <= 0) return null;
            
            const expiresAt = new Date(data.expiresAt);
            const now = new Date();
            const isExpired = now > expiresAt;
            
            if (isExpired) {
                // Clear expired wallet
                localStorage.removeItem('seasalt_wallet');
                return null;
            }
            
            return {
                amount: data.amount,
                expiresAt: expiresAt,
                isExpired: false,
                timeLeft: expiresAt - now
            };
        } catch (e) {
            return null;
        }
    }
    
    // ============================================
    // FORMAT TIME
    // ============================================
    function formatTime(ms) {
        if (ms <= 0) return '00:00:00';
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }
    
    // ============================================
    // UPDATE WALLET DISPLAY
    // ============================================
    function updateWalletDisplay() {
        const wallet = getWalletData();
        
        // Target the exact elements from SeaSalt's HTML
        const walletBtn = document.getElementById('wallet-btn');
        const walletBalance = document.getElementById('wallet-balance');
        
        if (!walletBtn || !walletBalance) {
            console.log('[WalletUI] Wallet elements not found, retrying...');
            setTimeout(updateWalletDisplay, 1000);
            return;
        }
        
        if (!wallet) {
            // No wallet - show ₹0
            walletBalance.textContent = '₹0';
            // Remove timer if exists
            if (timerElement && timerElement.parentElement) {
                timerElement.remove();
                timerElement = null;
            }
            return;
        }
        
        // Update balance amount
        walletBalance.textContent = '₹' + wallet.amount;
        
        // Add or update timer below the balance
        if (!timerElement) {
            // Create timer element
            timerElement = document.createElement('div');
            timerElement.id = 'wallet-timer';
            timerElement.style.cssText = `
                font-size: 8px;
                font-family: 'Courier New', monospace;
                color: #b45309;
                background: #fef3c7;
                padding: 1px 4px;
                border-radius: 4px;
                margin-top: 2px;
                font-weight: 600;
                line-height: 1;
            `;
            
            // Insert timer after the balance span
            walletBalance.parentElement.appendChild(timerElement);
            
            // Adjust button to stack vertically
            walletBtn.style.flexDirection = 'column';
            walletBtn.style.alignItems = 'center';
            walletBtn.style.paddingTop = '4px';
            walletBtn.style.paddingBottom = '4px';
            walletBtn.style.height = 'auto';
            walletBtn.style.minHeight = '44px';
        }
        
        // Update timer text
        timerElement.textContent = '⏱ ' + formatTime(wallet.timeLeft);
        
        // Make wallet button clickable to show popup
        walletBtn.onclick = showWalletPopup;
        walletBtn.style.cursor = 'pointer';
    }
    
    // ============================================
    // SHOW WALLET POPUP
    // ============================================
    function showWalletPopup(e) {
        if (e) e.preventDefault();
        
        const wallet = getWalletData();
        if (!wallet) return;
        
        // Remove existing popup
        const existing = document.getElementById('wallet-popup-modal');
        if (existing) existing.remove();
        
        const popup = document.createElement('div');
        popup.id = 'wallet-popup-modal';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        popup.innerHTML = `
            <div style="background:white;border-radius:20px;padding:28px;max-width:320px;width:100%;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:walletPopIn 0.3s ease;">
                <button onclick="document.getElementById('wallet-popup-modal').remove()" style="position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:#f3f4f6;border:none;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                <div style="font-size:50px;margin-bottom:12px;">💰</div>
                <h3 style="font-size:20px;font-weight:700;color:#1f2937;margin-bottom:4px;">Your Wallet</h3>
                <p style="color:#6b7280;font-size:14px;margin-bottom:20px;">Spin wheel reward</p>
                <div style="font-size:48px;font-weight:900;color:#10b981;margin-bottom:16px;">₹${wallet.amount}</div>
                <div style="background:#fef3c7;border-radius:12px;padding:14px;margin-bottom:20px;">
                    <div style="font-size:12px;color:#92400e;margin-bottom:4px;">⏰ Time remaining</div>
                    <div id="wallet-popup-timer" style="font-size:28px;font-weight:800;color:#d97706;font-family:'Courier New',monospace;">${formatTime(wallet.timeLeft)}</div>
                    <div style="font-size:11px;color:#b45309;margin-top:4px;">Use before it expires!</div>
                </div>
                <button onclick="document.getElementById('wallet-popup-modal').remove()" style="width:100%;padding:14px;background:linear-gradient(135deg,#ea580c,#dc2626);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">
                    🛒 Shop Now
                </button>
            </div>
        `;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = '@keyframes walletPopIn{from{transform:scale(0.9);opacity:0;}to{transform:scale(1);opacity:1;}}';
        popup.appendChild(style);
        
        document.body.appendChild(popup);
        
        // Close on background click
        popup.addEventListener('click', function(e) {
            if (e.target === popup) popup.remove();
        });
        
        // Update timer in popup every second
        const popupTimerInterval = setInterval(() => {
            const w = getWalletData();
            const timerEl = document.getElementById('wallet-popup-timer');
            if (!timerEl || !document.getElementById('wallet-popup-modal')) {
                clearInterval(popupTimerInterval);
                return;
            }
            if (w) {
                timerEl.textContent = formatTime(w.timeLeft);
            } else {
                timerEl.textContent = 'EXPIRED';
                clearInterval(popupTimerInterval);
            }
        }, 1000);
    }
    
    // ============================================
    // START LIVE TIMER
    // ============================================
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        
        // Update every second
        timerInterval = setInterval(() => {
            const wallet = getWalletData();
            
            if (!wallet) {
                // Wallet expired or doesn't exist
                clearInterval(timerInterval);
                timerInterval = null;
                updateWalletDisplay();
                return;
            }
            
            // Update timer element
            if (timerElement) {
                timerElement.textContent = '⏱ ' + formatTime(wallet.timeLeft);
            }
            
        }, 1000);
    }
    
    // ============================================
    // INIT
    // ============================================
    function init() {
        console.log('[WalletUI v3] Initializing...');
        
        const wallet = getWalletData();
        console.log('[WalletUI v3] Wallet data:', wallet);
        
        // Wait for DOM to be ready
        function tryInit() {
            const walletBtn = document.getElementById('wallet-btn');
            if (!walletBtn) {
                console.log('[WalletUI v3] Waiting for wallet-btn...');
                setTimeout(tryInit, 500);
                return;
            }
            
            console.log('[WalletUI v3] Found wallet-btn, updating display...');
            updateWalletDisplay();
            
            if (wallet && !wallet.isExpired) {
                startTimer();
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 300));
        } else {
            setTimeout(tryInit, 300);
        }
        
        // Listen for wallet updates (from spin wheel)
        window.addEventListener('walletUpdated', (e) => {
            console.log('[WalletUI v3] Wallet updated event:', e.detail);
            setTimeout(() => {
                updateWalletDisplay();
                const wallet = getWalletData();
                if (wallet && !timerInterval) {
                    startTimer();
                }
            }, 100);
        });
        
        // Update when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                updateWalletDisplay();
            }
        });
    }
    
    // ============================================
    // PUBLIC API
    // ============================================
    return {
        init: init,
        getWalletData: getWalletData,
        showPopup: showWalletPopup,
        update: updateWalletDisplay
    };
})();

// Auto-init
WalletUI.init();

// Expose globally
window.WalletUI = WalletUI;

console.log('[WalletUI v3] Script loaded');
