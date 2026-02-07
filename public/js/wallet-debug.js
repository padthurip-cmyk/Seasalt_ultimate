/**
 * WALLET DEBUG SCRIPT
 * ====================
 * Add this to your index.html AFTER all other scripts
 * It will log every time #wallet-balance is changed
 * 
 * <script src="js/wallet-debug.js"></script>
 */

(function() {
    'use strict';
    
    console.log('=== WALLET DEBUG LOADED ===');
    
    // Wait for DOM
    function init() {
        var walletEl = document.getElementById('wallet-balance');
        
        if (!walletEl) {
            console.log('[DEBUG] #wallet-balance NOT FOUND!');
            // List all elements that might be wallet-related
            var allEls = document.querySelectorAll('[id*="wallet"], [class*="wallet"]');
            console.log('[DEBUG] Found wallet-related elements:', allEls.length);
            allEls.forEach(function(el) {
                console.log('  -', el.tagName, el.id || el.className);
            });
            return;
        }
        
        console.log('[DEBUG] #wallet-balance found:', walletEl);
        console.log('[DEBUG] Current innerHTML:', walletEl.innerHTML);
        console.log('[DEBUG] Parent element:', walletEl.parentElement);
        
        // Intercept ALL changes to innerHTML
        var originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        
        Object.defineProperty(walletEl, 'innerHTML', {
            get: function() {
                return originalDescriptor.get.call(this);
            },
            set: function(value) {
                console.log('%c[WALLET CHANGE]', 'background: red; color: white; padding: 2px 6px;', value);
                console.trace('Stack trace:');
                return originalDescriptor.set.call(this, value);
            }
        });
        
        // Also intercept textContent
        var textDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
        
        Object.defineProperty(walletEl, 'textContent', {
            get: function() {
                return textDescriptor.get.call(this);
            },
            set: function(value) {
                console.log('%c[WALLET TEXT CHANGE]', 'background: orange; color: white; padding: 2px 6px;', value);
                console.trace('Stack trace:');
                return textDescriptor.set.call(this, value);
            }
        });
        
        console.log('[DEBUG] Wallet change interceptors installed!');
        console.log('[DEBUG] Now add a product to cart and check the console logs');
        
        // Also log localStorage wallet
        var walletData = localStorage.getItem('seasalt_wallet');
        console.log('[DEBUG] localStorage seasalt_wallet:', walletData);
        
        if (walletData) {
            try {
                var parsed = JSON.parse(walletData);
                console.log('[DEBUG] Wallet amount:', parsed.amount);
                console.log('[DEBUG] Wallet expires:', parsed.expiresAt);
                var exp = new Date(parsed.expiresAt);
                var now = new Date();
                console.log('[DEBUG] Time left:', Math.floor((exp - now) / 1000 / 60), 'minutes');
            } catch(e) {
                console.log('[DEBUG] Failed to parse wallet data');
            }
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
    
})();
