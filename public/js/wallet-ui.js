/**
 * SeaSalt Pickles - Wallet UI v4
 * ==============================
 * Targets: #wallet-btn button and #wallet-balance span
 * Shows live countdown timer below the balance
 */

const WalletUI = (function() {
    'use strict';
    
    let timerInterval = null;
    
    function getWalletData() {
        try {
            const data = JSON.parse(localStorage.getItem('seasalt_wallet') || '{}');
            if (!data.amount || data.amount <= 0) return null;
            
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
    
    function formatTime(ms) {
        if (ms <= 0) return '00:00:00';
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }
    
    function updateWalletDisplay() {
        const wallet = getWalletData();
        
        // Target the exact elements from your HTML
        const walletBtn = document.getElementById('wallet-btn');
        const balanceSpan = document.getElementById('wallet-balance');
        
        if (!walletBtn || !balanceSpan) {
            console.log('[WalletUI] Elements not found, retrying...');
            return false;
        }
        
        if (!wallet || wallet.isExpired) {
            // No wallet or expired - show ₹0
            balanceSpan.textContent = '₹0';
            // Remove timer if exists
            const timerEl = walletBtn.querySelector('.wallet-timer');
            if (timerEl) timerEl.remove();
            // Reset button style
            walletBtn.style.flexDirection = '';
            return true;
        }
        
        // Update balance
        balanceSpan.textContent = '₹' + wallet.amount;
        
        // Add or update timer element
        let timerEl = walletBtn.querySelector('.wallet-timer');
        
        if (!timerEl) {
            // Create timer element
            timerEl = document.createElement('span');
            timerEl.className = 'wallet-timer';
            timerEl.style.cssText = 'font-size:9px;opacity:0.85;font-family:monospace;display:block;line-height:1;margin-top:1px;';
            
            // Wrap balance and timer in a container
            const wrapper = document.createElement('div');
            wrapper.className = 'wallet-content';
            wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;line-height:1.1;';
            
            // Move balance span into wrapper
            balanceSpan.parentNode.insertBefore(wrapper, balanceSpan);
            wrapper.appendChild(balanceSpan);
            wrapper.appendChild(timerEl);
            
            // Adjust button styling
            walletBtn.style.cssText += 'padding:6px 10px;min-height:44px;';
        }
        
        // Update timer text
        timerEl.textContent = formatTime(wallet.timeLeft);
        
        // Add click handler for popup (once)
        if (!walletBtn.hasAttribute('data-wallet-popup')) {
            walletBtn.setAttribute('data-wallet-popup', 'true');
            walletBtn.addEventListener('click', (e) => {
                const w = getWalletData();
                if (w && w.amount > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    showWalletPopup();
                }
            });
        }
        
        return true;
    }
    
    function showWalletPopup() {
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
                <button onclick="this.closest('#wallet-popup-modal').remove()" style="position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:#f3f4f6;border:none;font-size:18px;cursor:pointer;line-height:1;">✕</button>
                <div style="font-size:50px;margin-bottom:12px;">💰</div>
                <h3 style="font-size:20px;font-weight:700;color:#1f2937;margin:0 0 4px 0;">Your Wallet</h3>
                <p style="color:#6b7280;font-size:14px;margin:0 0 16px 0;">Spin wheel reward</p>
                <div style="font-size:48px;font-weight:900;color:#10b981;margin-bottom:12px;">₹${wallet.amount}</div>
                <div style="background:#fef3c7;border-radius:12px;padding:14px;margin-bottom:20px;">
                    <div style="font-size:12px;color:#92400e;margin-bottom:4px;">⏰ Expires in</div>
                    <div id="wallet-popup-timer" style="font-size:28px;font-weight:800;color:#d97706;font-family:'Courier New',monospace;">${formatTime(wallet.timeLeft)}</div>
                    <div style="font-size:11px;color:#b45309;margin-top:4px;">Use before it expires!</div>
                </div>
                <button onclick="this.closest('#wallet-popup-modal').remove()" style="width:100%;padding:14px;background:linear-gradient(135deg,#ea580c,#dc2626);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">
                    🛒 Shop Now
                </button>
            </div>
            <style>@keyframes walletPopIn{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}</style>
        `;
        
        document.body.appendChild(popup);
        
        // Close on background click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) popup.remove();
        });
        
        // Live update popup timer
        const popupTimerInterval = setInterval(() => {
            const w = getWalletData();
            const timerEl = document.getElementById('wallet-popup-timer');
            if (!timerEl || !popup.parentElement) {
                clearInterval(popupTimerInterval);
                return;
            }
            if (w) timerEl.textContent = formatTime(w.timeLeft);
        }, 1000);
    }
    
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        
        // Update immediately
        updateWalletDisplay();
        
        // Then every second
        timerInterval = setInterval(() => {
            const wallet = getWalletData();
            
            if (!wallet || wallet.isExpired) {
                if (wallet && wallet.isExpired) {
                    localStorage.removeItem('seasalt_wallet');
                    console.log('[WalletUI] Wallet expired, cleared');
                }
                clearInterval(timerInterval);
                timerInterval = null;
                updateWalletDisplay();
                return;
            }
            
            updateWalletDisplay();
        }, 1000);
    }
    
    function init() {
        console.log('[WalletUI] Initializing v4...');
        
        const wallet = getWalletData();
        console.log('[WalletUI] Current wallet:', wallet);
        
        const startWallet = () => {
            if (wallet && !wallet.isExpired) {
                // Try multiple times in case DOM loads late
                const tryUpdate = () => {
                    if (updateWalletDisplay()) {
                        console.log('[WalletUI] ✅ Wallet display updated');
                        startTimer();
                    } else {
                        console.log('[WalletUI] Waiting for DOM...');
                    }
                };
                
                tryUpdate();
                setTimeout(tryUpdate, 300);
                setTimeout(tryUpdate, 600);
                setTimeout(tryUpdate, 1000);
                setTimeout(tryUpdate, 2000);
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startWallet);
        } else {
            startWallet();
        }
        
        // Listen for wallet updates (from spin wheel)
        window.addEventListener('walletUpdated', (e) => {
            console.log('[WalletUI] walletUpdated event:', e.detail);
            setTimeout(() => {
                updateWalletDisplay();
                if (!timerInterval) startTimer();
            }, 100);
        });
        
        // Re-check when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && getWalletData()) {
                updateWalletDisplay();
            }
        });
    }
    
    return {
        init,
        getWalletData,
        showPopup: showWalletPopup,
        update: updateWalletDisplay
    };
})();

// Auto-init
WalletUI.init();
window.WalletUI = WalletUI;

console.log('[WalletUI] v4 loaded - Targets #wallet-btn');
