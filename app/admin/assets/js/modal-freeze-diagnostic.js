// Modal Freeze Diagnostic Script
// Run this in the browser console to diagnose what's causing the modal to freeze

(function() {
    console.log('🔍 MODAL FREEZE DIAGNOSTIC STARTING...\n');
    
    const results = {
        mutationObservers: [],
        eventListeners: [],
        performanceIssues: [],
        cssIssues: [],
        blockingScripts: []
    };
    
    // 1. Check all MutationObservers
    console.log('1️⃣ Checking MutationObservers...');
    const observerCount = document.querySelectorAll('*').length;
    console.log(`   Total DOM nodes: ${observerCount}`);
    
    // Try to detect active observers (this is tricky since they're not directly accessible)
    console.log('   ⚠️  Note: MutationObservers are not directly enumerable, but we can check for common patterns');
    
    // 2. Check event listeners on modal elements
    console.log('\n2️⃣ Checking event listeners...');
    const modal = document.querySelector('#media-manager, .media-modal');
    if (modal) {
        console.log('   Modal found:', modal.id || modal.className);
        // Note: getEventListeners is Chrome DevTools only
        if (typeof getEventListeners === 'function') {
            const listeners = getEventListeners(modal);
            console.log('   Event listeners on modal:', Object.keys(listeners).length);
            Object.keys(listeners).forEach(type => {
                console.log(`     - ${type}: ${listeners[type].length} listener(s)`);
            });
        } else {
            console.log('   ⚠️  getEventListeners not available (use Chrome DevTools)');
        }
    } else {
        console.log('   ⚠️  Modal not found - open the modal first');
    }
    
    // 3. Check for CSS that might block interactions
    console.log('\n3️⃣ Checking CSS issues...');
    if (modal) {
        const computedStyle = window.getComputedStyle(modal);
        const issues = [];
        
        if (computedStyle.pointerEvents === 'none') {
            issues.push('pointer-events: none');
        }
        if (computedStyle.display === 'none') {
            issues.push('display: none');
        }
        if (computedStyle.visibility === 'hidden') {
            issues.push('visibility: hidden');
        }
        if (computedStyle.opacity === '0') {
            issues.push('opacity: 0');
        }
        if (computedStyle.filter && computedStyle.filter !== 'none') {
            issues.push(`filter: ${computedStyle.filter}`);
        }
        if (computedStyle.backdropFilter && computedStyle.backdropFilter !== 'none') {
            issues.push(`backdrop-filter: ${computedStyle.backdropFilter}`);
        }
        
        if (issues.length > 0) {
            console.log('   ❌ CSS issues found:');
            issues.forEach(issue => console.log(`     - ${issue}`));
        } else {
            console.log('   ✅ No obvious CSS issues');
        }
    }
    
    // 4. Performance monitoring
    console.log('\n4️⃣ Performance check...');
    const startTime = performance.now();
    
    // Count scripts
    const scripts = document.querySelectorAll('script[src]');
    console.log(`   Total external scripts: ${scripts.length}`);
    
    // Check for inline scripts
    const inlineScripts = document.querySelectorAll('script:not([src])');
    console.log(`   Total inline scripts: ${inlineScripts.length}`);
    
    // 5. Check for setInterval/setTimeout that might be running
    console.log('\n5️⃣ Checking for active timers...');
    let intervalCount = 0;
    let timeoutCount = 0;
    
    // This is approximate - we can't directly count them
    console.log('   ⚠️  Note: Cannot directly count active timers, but check Network tab for excessive requests');
    
    // 6. Monitor when modal opens
    console.log('\n6️⃣ Setting up modal open monitor...');
    
    const originalShow = bootstrap.Modal.prototype.show;
    bootstrap.Modal.prototype.show = function() {
        console.log('🚨 MODAL OPENING - Starting performance monitoring...');
        const modalId = this._element.id || this._element.className;
        console.log(`   Modal: ${modalId}`);
        
        const perfStart = performance.now();
        const memStart = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        const result = originalShow.call(this);
        
        // Monitor after a short delay
        setTimeout(() => {
            const perfEnd = performance.now();
            const memEnd = performance.memory ? performance.memory.usedJSHeapSize : 0;
            const duration = perfEnd - perfStart;
            const memUsed = memEnd - memStart;
            
            console.log(`\n⏱️  PERFORMANCE METRICS:`);
            console.log(`   Time to open: ${duration.toFixed(2)}ms`);
            if (memUsed > 0) {
                console.log(`   Memory used: ${(memUsed / 1024 / 1024).toFixed(2)}MB`);
            }
            
            if (duration > 500) {
                console.log('   ⚠️  WARNING: Modal took more than 500ms to open - possible freeze!');
            }
            
            // Check if modal is interactive
            const modal = document.querySelector('.modal.show');
            if (modal) {
                const style = window.getComputedStyle(modal);
                console.log(`\n📊 MODAL STATE:`);
                console.log(`   pointer-events: ${style.pointerEvents}`);
                console.log(`   opacity: ${style.opacity}`);
                console.log(`   visibility: ${style.visibility}`);
                console.log(`   filter: ${style.filter}`);
                console.log(`   backdrop-filter: ${style.backdropFilter}`);
                
                // Check child count
                const childCount = modal.querySelectorAll('*').length;
                console.log(`   Child elements: ${childCount}`);
                if (childCount > 1000) {
                    console.log('   ⚠️  WARNING: Many child elements - might cause performance issues');
                }
            }
        }, 100);
        
        return result;
    };
    
    console.log('   ✅ Monitor installed - open the modal to see metrics');
    
    // 7. Check for blocking operations
    console.log('\n7️⃣ Checking for potential blocking operations...');
    
    // Check for synchronous XHR (deprecated but might exist)
    const xhrProto = XMLHttpRequest.prototype;
    const originalOpen = xhrProto.open;
    xhrProto.open = function(method, url, async) {
        if (async === false) {
            console.warn('   ⚠️  WARNING: Synchronous XHR detected:', url);
        }
        return originalOpen.apply(this, arguments);
    };
    
    // 8. List all scripts that might be interfering
    console.log('\n8️⃣ Scripts loaded:');
    Array.from(scripts).forEach((script, index) => {
        const src = script.src;
        if (src.includes('modal') || src.includes('blur') || src.includes('observer')) {
            console.log(`   ${index + 1}. ${src} ⚠️  (might be related)`);
        }
    });
    
    // 9. Check console for errors
    console.log('\n9️⃣ Check the Console tab for any errors when opening the modal');
    
    // 10. Provide actionable steps
    console.log('\n📋 DIAGNOSTIC COMPLETE');
    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Open the media manager modal');
    console.log('   2. Check the performance metrics above');
    console.log('   3. Open Chrome DevTools Performance tab');
    console.log('   4. Record a performance profile while opening the modal');
    console.log('   5. Look for:');
    console.log('      - Long tasks (>50ms)');
    console.log('      - Layout shifts');
    console.log('      - Excessive DOM queries');
    console.log('      - JavaScript execution time');
    console.log('\n💡 TIP: Use Chrome DevTools Performance tab for detailed analysis');
    
    // Return diagnostic object
    window.modalDiagnostic = {
        results: results,
        checkModal: function() {
            const modal = document.querySelector('.modal.show');
            if (!modal) {
                console.log('❌ No modal is currently open');
                return;
            }
            
            console.log('\n🔍 CURRENT MODAL STATE:');
            console.log('   ID:', modal.id);
            console.log('   Classes:', modal.className);
            console.log('   Parent:', modal.parentElement.tagName);
            console.log('   Child count:', modal.querySelectorAll('*').length);
            
            const style = window.getComputedStyle(modal);
            console.log('\n📊 COMPUTED STYLES:');
            console.log('   pointer-events:', style.pointerEvents);
            console.log('   opacity:', style.opacity);
            console.log('   visibility:', style.visibility);
            console.log('   filter:', style.filter);
            console.log('   backdrop-filter:', style.backdropFilter);
            console.log('   z-index:', style.zIndex);
        },
        testInteraction: function() {
            const modal = document.querySelector('.modal.show');
            if (!modal) {
                console.log('❌ No modal is currently open');
                return;
            }
            
            console.log('\n🧪 TESTING INTERACTION...');
            const testElement = modal.querySelector('img, .media-item, button');
            if (testElement) {
                console.log('   Test element:', testElement.tagName, testElement.className);
                const style = window.getComputedStyle(testElement);
                console.log('   pointer-events:', style.pointerEvents);
                console.log('   cursor:', style.cursor);
                
                // Try to trigger a click
                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                testElement.dispatchEvent(event);
                console.log('   ✅ Click event dispatched');
            } else {
                console.log('   ⚠️  No test element found');
            }
        }
    };
    
    console.log('\n✅ Diagnostic script loaded!');
    console.log('   Use window.modalDiagnostic.checkModal() to check current modal state');
    console.log('   Use window.modalDiagnostic.testInteraction() to test if modal is interactive');
    
})();
