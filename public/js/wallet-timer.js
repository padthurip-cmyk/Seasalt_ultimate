/**
 * SeaSalt Pickles - Wallet Timer Standalone v1
 * =============================================
 * Creates a SEPARATE wallet timer badge that won't be overwritten
 * by ui.js or any other script.
 * 
 * Add this AFTER spinwheel.js in your index.html
 */

(function() {
    'use strict';
    
    console.log('[WalletTimer] Standalone v1 loaded');
    
    var BADGE_ID = 'sw-wallet-badge';
    var timerInterval = null;
    
    // Get wallet data from localStorage
    function getWallet() {
        try {
            var data = JSON.parse(localStorage.getItem('seasalt_wallet') || '{}');
            if (!data.amount || data.amount <= 0) return null;
            
            var expiresAt = new Date(data.expiresAt);
            var now = new Date();
            
            if (now >= expiresAt) {
                // Expired - clean up
                localStorage.removeItem('seasalt_wallet');
                return null;
            }
            
            return {
                amount: data.amount,
                expiresAt: expiresAt,
                timeLeft: expiresAt - now
            };
        } catch (e) {
            return null;
        }
    }
    
    // Format milliseconds to HH:MM:SS
    function formatTime(ms) {
        if (ms <= 0) return '00:00:00';
        var h = Math.floor(ms / 3600000);
        var m = Math.floor((ms % 3600000) / 60000);
        var s = Math.floor((ms % 60000) / 1000);
        return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    
    // Create or update the floating badge
    function updateBadge() {
        var wallet = getWallet();
        var badge = document.getElementById(BADGE_ID);
        
        if (!wallet) {
            // No wallet - remove badge if exists
            if (badge) badge.remove();
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            return;
        }
        
        if (!badge) {
            // Create badge
            badge = document.createElement('div');
            badge.id = BADGE_ID;
            badge.innerHTML = '<div class="swb-amount"></div><div class="swb-timer"></div>';
            document.body.appendChild(badge);
            
            // Add styles
            if (!document.getElementById('swb-styles')) {
                var style = document.createElement('style');
                style.id = 'swb-styles';
                style.textContent = [
                    '#' + BADGE_ID + ' {',
                    '  position: fixed;',
                    '  top: 12px;',
                    '  right: 60px;',
                    '  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);',
                    '  color: white;',
                    '  padding: 8px 14px;',
                    '  border-radius: 16px;',
                    '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
                    '  z-index: 9990;',
                    '  display: flex;',
                    '  flex-direction: column;',
                    '  align-items: center;',
                    '  gap: 2px;',
                    '  box-shadow: 0 4px 15px rgba(249, 115, 22, 0.5);',
                    '  cursor: pointer;',
                    '  animation: swbPulse 2s ease-in-out infinite;',
                    '  transition: transform 0.2s;',
                    '}',
                    '#' + BADGE_ID + ':hover {',
                    '  transform: scale(1.05);',
                    '}',
                    '#' + BADGE_ID + ' .swb-amount {',
                    '  font-size: 16px;',
                    '  font-weight: 800;',
                    '  display: flex;',
                    '  align-items: center;',
                    '  gap: 4px;',
                    '}',
                    '#' + BADGE_ID + ' .swb-timer {',
                    '  font-size: 11px;',
                    '  font-weight: 600;',
                    '  font-family: "SF Mono", Monaco, monospace;',
                    '  background: rgba(0,0,0,0.2);',
                    '  padding: 2px 8px;',
                    '  border-radius: 8px;',
                    '}',
                    '@keyframes swbPulse {',
                    '  0%, 100% { box-shadow: 0 4px 15px rgba(249, 115, 22, 0.5); }',
                    '  50% { box-shadow: 0 4px 25px rgba(249, 115, 22, 0.7); }',
                    '}',
                    '@media (max-width: 400px) {',
                    '  #' + BADGE_ID + ' { right: 50px; padding: 6px 10px; }',
                    '  #' + BADGE_ID + ' .swb-amount { font-size: 14px; }',
                    '  #' + BADGE_ID + ' .swb-timer { font-size: 10px; }',
                    '}'
                ].join('\n');
                document.head.appendChild(style);
            }
            
            // Click to show details
            badge.onclick = showWalletPopup;
        }
        
        // Update content
        badge.querySelector('.swb-amount').innerHTML = '💰 ₹' + wallet.amount;
        badge.querySelector('.swb-timer').textContent = '⏱ ' + formatTime(wallet.timeLeft);
    }
    
    // Show wallet popup with details
    function showWalletPopup() {
        var wallet = getWallet();
        if (!wallet) return;
        
        // Remove existing popup
        var existing = document.getElementById('swb-popup');
        if (existing) existing.remove();
        
        var popup = document.createElement('div');
        popup.id = 'swb-popup';
        popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
        
        popup.innerHTML = [
            '<div style="background:white;border-radius:20px;padding:28px;max-width:320px;width:100%;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);">',
            '  <button onclick="this.closest(\'#swb-popup\').remove()" style="position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:#f3f4f6;border:none;font-size:18px;cursor:pointer;">✕</button>',
            '  <div style="font-size:50px;margin-bottom:12px;">💰</div>',
            '  <h3 style="font-size:20px;font-weight:700;color:#1f2937;margin:0 0 4px 0;">Your Wallet</h3>',
            '  <p style="color:#6b7280;font-size:14px;margin:0 0 20px 0;">Spin wheel reward</p>',
            '  <div style="font-size:48px;font-weight:900;color:#10b981;margin-bottom:16px;">₹' + wallet.amount + '</div>',
            '  <div style="background:#fef3c7;border-radius:12px;padding:14px;margin-bottom:20px;">',
            '    <div style="font-size:12px;color:#92400e;margin-bottom:4px;">⏰ Time remaining</div>',
            '    <div id="swb-popup-timer" style="font-size:24px;font-weight:800;color:#d97706;font-family:monospace;">' + formatTime(wallet.timeLeft) + '</div>',
            '    <div style="font-size:11px;color:#b45309;margin-top:4px;">Use before it expires!</div>',
            '  </div>',
            '  <button onclick="this.closest(\'#swb-popup\').remove()" style="width:100%;padding:14px;background:linear-gradient(135deg,#ea580c,#dc2626);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">',
            '    🛒 Shop Now',
            '  </button>',
            '</div>'
        ].join('');
        
        document.body.appendChild(popup);
        
        // Close on background click
        popup.onclick = function(e) {
            if (e.target === popup) popup.remove();
        };
        
        // Update timer in popup
        var popupInterval = setInterval(function() {
            var w = getWallet();
            var timerEl = document.getElementById('swb-popup-timer');
            if (!timerEl || !w) {
                clearInterval(popupInterval);
                return;
            }
            timerEl.textContent = formatTime(w.timeLeft);
        }, 1000);
    }
    
    // Start the timer
    function startTimer() {
        console.log('[WalletTimer] Starting timer...');
        
        // Initial update
        updateBadge();
        
        // Clear any existing interval
        if (timerInterval) clearInterval(timerInterval);
        
        // Update every second
        timerInterval = setInterval(function() {
            var wallet = getWallet();
            
            if (!wallet) {
                console.log('[WalletTimer] Wallet expired or not found, stopping timer');
                clearInterval(timerInterval);
                timerInterval = null;
                var badge = document.getElementById(BADGE_ID);
                if (badge) badge.remove();
                return;
            }
            
            // Update badge timer
            var badge = document.getElementById(BADGE_ID);
            if (badge) {
                var timerEl = badge.querySelector('.swb-timer');
                if (timerEl) {
                    timerEl.textContent = '⏱ ' + formatTime(wallet.timeLeft);
                }
            } else {
                // Badge was removed, recreate it
                updateBadge();
            }
        }, 1000);
    }
    
    // Initialize
    function init() {
        console.log('[WalletTimer] Initializing...');
        
        var wallet = getWallet();
        console.log('[WalletTimer] Current wallet:', wallet);
        
        if (wallet) {
            startTimer();
        }
        
        // Listen for wallet updates from spin wheel
        window.addEventListener('walletUpdated', function(e) {
            console.log('[WalletTimer] Wallet updated event received:', e.detail);
            startTimer();
        });
        
        // Also check when storage changes (in case of another tab)
        window.addEventListener('storage', function(e) {
            if (e.key === 'seasalt_wallet') {
                console.log('[WalletTimer] Storage changed');
                if (e.newValue) {
                    startTimer();
                } else {
                    var badge = document.getElementById(BADGE_ID);
                    if (badge) badge.remove();
                }
            }
        });
    }
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose for manual control
    window.WalletTimer = {
        start: startTimer,
        update: updateBadge,
        getWallet: getWallet
    };
    
})();
