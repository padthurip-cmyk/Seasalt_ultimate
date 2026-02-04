/**
 * SeaSalt Pickles - Spin Wheel Style Fix
 * =======================================
 * Add this AFTER spinwheel.js in your index.html
 * <script src="/js/spinwheel.js"></script>
 * <script src="/js/spinwheel-fix.js"></script>
 */

(function() {
    'use strict';
    
    console.log('🎰 Spin Wheel Fix: Loading...');
    
    // Inject CSS fixes
    const css = `
        /* ====================================
           SPIN WHEEL FIXES
           ==================================== */
        
        /* Fix wheel container */
        #spin-modal .wheel-container,
        .wheel-container {
            position: relative;
            width: 280px;
            height: 280px;
            margin: 0 auto;
        }
        
        @media (min-width: 400px) {
            #spin-modal .wheel-container,
            .wheel-container {
                width: 320px;
                height: 320px;
            }
        }
        
        /* Fix wheel SVG */
        #spin-wheel,
        .spin-wheel {
            width: 100%;
            height: 100%;
            transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
        }
        
        /* Fix segment text */
        #spin-wheel text,
        .spin-wheel text {
            font-family: 'Arial Black', 'Helvetica Neue', sans-serif;
            font-weight: 900;
            fill: white;
            text-anchor: middle;
            dominant-baseline: middle;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        
        /* Pointer/Arrow */
        .wheel-pointer {
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 15px solid transparent;
            border-right: 15px solid transparent;
            border-top: 25px solid white;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            z-index: 10;
        }
        
        /* Center button */
        .wheel-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 5;
        }
        
        /* ====================================
           PHONE INPUT SECTION FIXES (MOBILE)
           ==================================== */
        
        #phone-section {
            width: 100%;
            padding: 0 16px;
            box-sizing: border-box;
        }
        
        #phone-section .flex {
            display: flex;
            gap: 8px;
            width: 100%;
        }
        
        /* Country code dropdown */
        #country-code {
            width: 100px !important;
            min-width: 100px !important;
            flex-shrink: 0;
            padding: 12px 8px !important;
            font-size: 14px !important;
            border-radius: 12px;
            border: 2px solid rgba(255,255,255,0.3);
            background: white;
            appearance: none;
            -webkit-appearance: none;
        }
        
        /* Phone input */
        #phone-input {
            flex: 1;
            min-width: 0;
            padding: 12px 16px !important;
            font-size: 16px !important;
            border-radius: 12px;
            border: 2px solid rgba(255,255,255,0.3);
            background: white;
        }
        
        #phone-input::placeholder {
            font-size: 14px;
            color: #9CA3AF;
        }
        
        /* Send OTP button */
        #send-otp-btn {
            width: 100%;
            padding: 14px 20px;
            margin-top: 12px;
            font-size: 16px;
            font-weight: 700;
            border-radius: 12px;
            border: none;
            cursor: pointer;
        }
        
        /* OTP Section */
        #otp-section {
            width: 100%;
            padding: 0 16px;
        }
        
        .otp-input {
            width: 45px !important;
            height: 50px !important;
            text-align: center;
            font-size: 20px !important;
            font-weight: 700;
            border-radius: 10px;
            border: 2px solid rgba(255,255,255,0.3);
            background: white;
        }
        
        /* Mobile specific fixes */
        @media (max-width: 380px) {
            #country-code {
                width: 85px !important;
                min-width: 85px !important;
                padding: 10px 6px !important;
                font-size: 13px !important;
            }
            
            #phone-input {
                padding: 10px 12px !important;
                font-size: 15px !important;
            }
            
            #phone-input::placeholder {
                font-size: 13px;
            }
            
            .otp-input {
                width: 40px !important;
                height: 45px !important;
                font-size: 18px !important;
            }
            
            #spin-modal .wheel-container,
            .wheel-container {
                width: 250px;
                height: 250px;
            }
        }
        
        /* Fix modal content padding */
        #spin-modal > div:last-child,
        .spin-modal-content {
            padding: 20px 16px;
            max-width: 100%;
            overflow-x: hidden;
        }
        
        /* Ensure inputs don't overflow */
        #spin-modal input,
        #spin-modal select,
        #spin-modal button {
            max-width: 100%;
            box-sizing: border-box;
        }
    `;
    
    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.id = 'spinwheel-fix-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    
    // ========================================
    // IMPROVED WHEEL SVG
    // ========================================
    
    function createImprovedWheel() {
        const wheelContainer = document.querySelector('.wheel-container') || 
                               document.querySelector('#spin-wheel')?.parentElement;
        
        if (!wheelContainer) {
            console.log('🎰 Spin Wheel Fix: Wheel container not found, retrying...');
            setTimeout(createImprovedWheel, 500);
            return;
        }
        
        // Check if wheel already exists and is properly formatted
        const existingWheel = document.getElementById('spin-wheel');
        if (existingWheel) {
            // Just fix the text positioning
            fixWheelText(existingWheel);
            return;
        }
    }
    
    function fixWheelText(wheelSvg) {
        // Find all text elements and fix their positioning
        const texts = wheelSvg.querySelectorAll('text');
        texts.forEach(text => {
            // Ensure proper text anchor
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            
            // Add shadow for better readability
            text.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            text.style.fontWeight = '900';
        });
    }
    
    // ========================================
    // FIX PHONE INPUT ON MODAL OPEN
    // ========================================
    
    function fixPhoneSection() {
        const phoneSection = document.getElementById('phone-section');
        if (!phoneSection) return;
        
        // Find the flex container
        const flexContainer = phoneSection.querySelector('.flex') || 
                              phoneSection.querySelector('[class*="flex"]');
        
        if (flexContainer) {
            flexContainer.style.display = 'flex';
            flexContainer.style.gap = '8px';
            flexContainer.style.width = '100%';
            flexContainer.style.flexWrap = 'nowrap';
        }
        
        // Fix country code
        const countryCode = document.getElementById('country-code');
        if (countryCode) {
            countryCode.style.width = '100px';
            countryCode.style.minWidth = '100px';
            countryCode.style.flexShrink = '0';
        }
        
        // Fix phone input
        const phoneInput = document.getElementById('phone-input');
        if (phoneInput) {
            phoneInput.style.flex = '1';
            phoneInput.style.minWidth = '0';
        }
    }
    
    // Watch for spin modal opening
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    // Check if spin modal was added or shown
                    if (node.id === 'spin-modal' || node.querySelector?.('#spin-modal')) {
                        console.log('🎰 Spin Wheel Fix: Modal opened, applying fixes...');
                        setTimeout(fixPhoneSection, 100);
                        setTimeout(createImprovedWheel, 100);
                    }
                }
            });
            
            // Also check for class changes (modal becoming visible)
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.id === 'spin-modal' && !target.classList.contains('hidden')) {
                    setTimeout(fixPhoneSection, 100);
                }
            }
        });
    });
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    
    // Also run on page load in case modal is already visible
    setTimeout(fixPhoneSection, 1000);
    setTimeout(createImprovedWheel, 1000);
    
    console.log('🎰 Spin Wheel Fix: Ready!');
    
})();
