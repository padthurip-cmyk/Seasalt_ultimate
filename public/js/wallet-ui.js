/**
 * SeaSalt Pickles - Wallet UI v6
 * ==============================
 * Fixed: Always initializes and checks wallet on every update
 */

(function() {
    'use strict';
    
    var timerInterval = null;
    
    function getWallet() {
        try {
            var data = JSON.parse(localStorage.getItem('seasalt_wallet') || '{}');
            if (!data.amount || data.amount <= 0) return null;
            var expiresAt = new Date(data.expiresAt);
            var now = new Date();
            if (now > expiresAt) {
                localStorage.removeItem('seasalt_wallet');
                return null;
            }
            return { amount: data.amount, timeLeft: expiresAt - now };
        } catch (e) { 
            return null; 
        }
    }
    
    function formatTime(ms) {
        if (ms <= 0) return '00:00:00';
        var h = Math.floor(ms / 3600000);
        var m = Math.floor((ms % 3600000) / 60000);
        var s = Math.floor((ms % 60000) / 1000);
        return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    
    function updateDisplay() {
        var wallet = getWallet();
        var balanceEl = document.getElementById('wallet-balance');
        
        if (!balanceEl) {
            console.log('[WalletUI] wallet-balance element not found');
            return false;
        }
        
        if (!wallet) {
            balanceEl.innerHTML = '₹0';
            console.log('[WalletUI] No wallet, showing ₹0');
            return true;
        }
        
        // Update with amount and timer
        balanceEl.innerHTML = '₹' + wallet.amount + '<br><span style="font-size:8px;color:#c9a227;font-family:monospace;letter-spacing:-0.5px;">' + formatTime(wallet.timeLeft) + '</span>';
        
        console.log('[WalletUI] Updated: ₹' + wallet.amount + ' - ' + formatTime(wallet.timeLeft));
        return true;
    }
    
    function startTimer() {
        console.log('[WalletUI] Starting timer...');
        
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Update immediately
        updateDisplay();
        
        // Update every second
        timerInterval = setInterval(function() {
            var wallet = getWallet();
            if (!wallet) {
                console.log('[WalletUI] Wallet empty/expired, stopping timer');
                clearInterval(timerInterval);
                timerInterval = null;
                updateDisplay();
                return;
            }
            updateDisplay();
        }, 1000);
    }
    
    function init() {
        console.log('[WalletUI] v6 Initializing...');
        
        // Try to update immediately
        var success = updateDisplay();
        console.log('[WalletUI] Initial update:', success ? 'success' : 'waiting for DOM');
        
        // If wallet exists, start timer
        if (getWallet()) {
            startTimer();
        }
        
        // Also try after delays in case DOM isn't ready
        setTimeout(function() {
            if (getWallet() && !timerInterval) {
                console.log('[WalletUI] Delayed start');
                startTimer();
            }
        }, 1000);
        
        setTimeout(function() {
            if (getWallet() && !timerInterval) {
                console.log('[WalletUI] Second delayed start');
                startTimer();
            }
        }, 2000);
    }
    
    // Listen for wallet updates from spin wheel
    window.addEventListener('walletUpdated', function(e) {
        console.log('[WalletUI] walletUpdated event received', e.detail);
        setTimeout(function() {
            startTimer();
        }, 100);
    });
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose globally for debugging
    window.WalletUI = {
        update: updateDisplay,
        start: startTimer,
        getWallet: getWallet
    };
    
    console.log('[WalletUI] v6 Script loaded');
    
})();
