/**
 * FIX FORM FIELD FOCUS COLORS - Remove green, use dark blue IMMEDIATELY
 * This script ensures all form fields use dark blue focus colors instead of green
 * No delays, no smooth transitions - instant fix
 */

(function() {
    'use strict';
    
    const DARK_BLUE = '#364a63';
    const DARK_BLUE_RGB = 'rgb(54, 74, 99)';
    const DARK_BLUE_RGBA = 'rgba(54, 74, 99, 0.1)';
    
    function fixFormFieldFocusColors() {
        // Find all form controls
        const formControls = document.querySelectorAll(
            '.form-control, input, textarea, select, .form-select'
        );
        
        formControls.forEach(control => {
            const isFocused = document.activeElement === control;
            const computedStyle = window.getComputedStyle(control);
            
            // If focused, force dark blue immediately - NO DELAY
            if (isFocused) {
                // Remove transition to prevent smooth change
                control.style.setProperty('transition', 'none', 'important');
                // Force dark blue border immediately
                control.style.setProperty('border-color', DARK_BLUE_RGB, 'important');
                control.style.setProperty('box-shadow', `0 0 0 4px ${DARK_BLUE_RGBA}`, 'important');
            } else {
                // If not focused, remove focus styles
                // Check if it has dark blue that should be removed
                if (computedStyle.borderColor === DARK_BLUE_RGB || 
                    computedStyle.borderColor.includes('rgb(54, 74, 99)')) {
                    // Remove the dark blue - let CSS handle default
                    control.style.removeProperty('border-color');
                    control.style.removeProperty('box-shadow');
                    control.style.removeProperty('transition');
                }
            }
            
            // Always check and remove green colors - IMMEDIATELY
            if (computedStyle.borderColor.includes('rgb(8, 129, 94)') || 
                computedStyle.borderColor.includes('#08815e') ||
                computedStyle.borderColor.includes('rgb(11, 184, 122)') ||
                computedStyle.borderColor.includes('#0bb87a')) {
                if (isFocused) {
                    control.style.setProperty('transition', 'none', 'important');
                    control.style.setProperty('border-color', DARK_BLUE_RGB, 'important');
                }
            }
            
            if (computedStyle.boxShadow.includes('rgba(8, 129, 94') || 
                computedStyle.boxShadow.includes('rgba(11, 184, 122') ||
                computedStyle.boxShadow.includes('#08815e') ||
                computedStyle.boxShadow.includes('#0bb87a')) {
                if (isFocused) {
                    control.style.setProperty('transition', 'none', 'important');
                    control.style.setProperty('box-shadow', `0 0 0 4px ${DARK_BLUE_RGBA}`, 'important');
                }
            }
        });
        
        // Also fix input-group focus-within
        const inputGroups = document.querySelectorAll('.input-group');
        inputGroups.forEach(group => {
            const hasFocus = group.matches(':focus-within');
            const computedStyle = window.getComputedStyle(group);
            
            if (hasFocus) {
                group.style.setProperty('transition', 'none', 'important');
                group.style.setProperty('box-shadow', `0 0 0 4px ${DARK_BLUE_RGBA}`, 'important');
            } else {
                if (computedStyle.boxShadow.includes('rgba(54, 74, 99')) {
                    group.style.removeProperty('box-shadow');
                    group.style.removeProperty('transition');
                }
            }
            
            if (computedStyle.boxShadow.includes('rgba(8, 129, 94') || 
                computedStyle.boxShadow.includes('rgba(11, 184, 122')) {
                if (hasFocus) {
                    group.style.setProperty('transition', 'none', 'important');
                    group.style.setProperty('box-shadow', `0 0 0 4px ${DARK_BLUE_RGBA}`, 'important');
                }
            }
        });
    }
    
    // Fix on focus events - IMMEDIATELY, no delay
    document.addEventListener('focusin', function(e) {
        if (e.target.matches('.form-control, input, textarea, select, .form-select')) {
            // Remove transition immediately to prevent smooth change
            e.target.style.setProperty('transition', 'none', 'important');
            // Force dark blue immediately
            e.target.style.setProperty('border-color', DARK_BLUE_RGB, 'important');
            e.target.style.setProperty('box-shadow', `0 0 0 4px ${DARK_BLUE_RGBA}`, 'important');
            // Fix all fields
            fixFormFieldFocusColors();
        }
    });
    
    // Fix on blur events - remove focus styles from unfocused fields
    document.addEventListener('focusout', function(e) {
        if (e.target.matches('.form-control, input, textarea, select, .form-select')) {
            // Remove focus styles when field loses focus
            e.target.style.removeProperty('border-color');
            e.target.style.removeProperty('box-shadow');
            e.target.style.removeProperty('transition');
            // Fix all fields to ensure only focused field has dark blue
            setTimeout(fixFormFieldFocusColors, 10);
        }
    });
    
    // Fix on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixFormFieldFocusColors);
    } else {
        fixFormFieldFocusColors();
    }
    
    // Run more frequently to catch green colors immediately
    setInterval(fixFormFieldFocusColors, 100);
    
    // Watch for new form fields
    const observer = new MutationObserver(function(mutations) {
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.matches && node.matches('.form-control, input, textarea, select') ||
                            node.querySelector && node.querySelector('.form-control, input, textarea, select')) {
                            shouldFix = true;
                        }
                    }
                });
            }
        });
        if (shouldFix) {
            fixFormFieldFocusColors();
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Form field focus color fix initialized - using dark blue instead of green (instant, no delay)');
})();
