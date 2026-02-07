/**
 * SeaSalt Pickles - Wallet UI v7
 * ==============================
 * FIXED: Continuously monitors for wallet changes
 * FIXED: Immediately updates when walletUpdated event fires
 */

(function() {
    'use strict';
    
    var timerInterval = null;
    var checkInterval = null;
    
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
            return false;
        }
        
        if (!wallet) {
            balanceEl.innerHTML = '₹0';
            return true;
        }
        
        // Update with amount and timer on two lines
        balanceEl.innerHTML = '₹' + wallet.amount + '<br><span style="font-size:8px;color:#c9a227;font-family:monospace;letter-spacing:-0.5px;">' + formatTime(wallet.timeLeft) + '</span>';
        
        return true;
    }
    
    function startTimer() {
        console.log('[WalletUI] Starting live timer');
        
        // Clear any existing intervals
        if (timerInterval) clearInterval(timerInterval);
        if (checkInterval) clearInterval(checkInterval);
        
        // Update immediately
        updateDisplay();
        
        // Update every second
        timerInterval = setInterval(function() {
            var wallet = getWallet();
            if (!wallet) {
                console.log('[WalletUI] Wallet expired, stopping timer');
                clearInterval(timerInterval);
                timerInterval = null;
                updateDisplay();
                // Restart the check interval to wait for new wallet
                startCheckingForWallet();
                return;
            }
            updateDisplay();
        }, 1000);
    }
    
    function startCheckingForWallet() {
        console.log('[WalletUI] Checking for wallet every 500ms...');
        
        if (checkInterval) clearInterval(checkInterval);
        
        checkInterval = setInterval(function() {
            var wallet = getWallet();
            if (wallet) {
                console.log('[WalletUI] Wallet found! ₹' + wallet.amount);
                clearInterval(checkInterval);
                checkInterval = null;
                startTimer();
            }
        }, 500);
    }
    
    function init() {
        console.log('[WalletUI] v7 Initializing...');
        
        var wallet = getWallet();
        
        if (wallet) {
            console.log('[WalletUI] Wallet exists: ₹' + wallet.amount);
            startTimer();
        } else {
            console.log('[WalletUI] No wallet yet, will check periodically');
            updateDisplay(); // Show ₹0
            startCheckingForWallet();
        }
    }
    
    // Listen for wallet updates from spin wheel - THIS IS KEY!
    window.addEventListener('walletUpdated', function(e) {
        console.log('[WalletUI] 🎉 walletUpdated event received!', e.detail);
        
        // Clear check interval since we got the wallet
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
        
        // Update display immediately
        updateDisplay();
        
        // Start the timer
        startTimer();
    });
    
    // Also listen for storage changes (in case updated from another tab)
    window.addEventListener('storage', function(e) {
        if (e.key === 'seasalt_wallet') {
            console.log('[WalletUI] localStorage changed');
            var wallet = getWallet();
            if (wallet && !timerInterval) {
                startTimer();
            } else {
                updateDisplay();
            }
        }
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
    
    console.log('[WalletUI] v7 Script loaded');
    
})();
