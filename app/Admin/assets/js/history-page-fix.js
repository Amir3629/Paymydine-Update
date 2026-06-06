/**
 * HISTORY PAGE FIX - JavaScript to force apply styles
 * This ensures the CSS is applied even if body classes don't match
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    function applyHistoryPageFixes() {
        // Check if we're on history page by URL
        const isHistoryPage = window.location.pathname.includes('/admin/history') || 
                              window.location.href.includes('/admin/history');
        
        if (!isHistoryPage) return;
        
        // Find bulk actions row
        const bulkActionsRow = document.querySelector('tr.bulk-actions[data-control="bulk-actions"]');
        if (!bulkActionsRow || bulkActionsRow.classList.contains('hide')) {
            return; // Silently return if not visible
        }
        
        // Find the content cell
        const bulkActionsCell = bulkActionsRow.querySelector('td.w-100');
        if (!bulkActionsCell) {
            return;
        }
        
        // Check current position
        const currentRect = bulkActionsCell.getBoundingClientRect();
        const targetTop = 64; // Match toolbar-action container position (navbar bottom)
        const targetButtonTop = 88; // Match button position inside toolbar (64px + 24px padding/height)
        
        // Only apply if position is wrong
        if (Math.abs(currentRect.top - targetTop) > 5) {
            console.log(`🔧 Fixing bulk actions position: ${Math.round(currentRect.top)}px → ${targetTop}px`);
        
        // Force position bulk actions to match toolbar-action position (64px = navbar bottom)
        // Use setProperty for maximum specificity - FORCE IT!
        bulkActionsCell.style.setProperty('position', 'fixed', 'important');
        bulkActionsCell.style.setProperty('top', '64px', 'important'); // Match toolbar-action position
        bulkActionsCell.style.setProperty('right', '20px', 'important');
        bulkActionsCell.style.setProperty('left', 'auto', 'important');
        bulkActionsCell.style.setProperty('width', 'auto', 'important');
        bulkActionsCell.style.setProperty('background', 'transparent', 'important');
        bulkActionsCell.style.setProperty('border', 'none', 'important');
        bulkActionsCell.style.setProperty('padding', '0', 'important');
        bulkActionsCell.style.setProperty('margin', '0', 'important');
        bulkActionsCell.style.setProperty('margin-top', '0', 'important');
        bulkActionsCell.style.setProperty('margin-bottom', '0', 'important');
        bulkActionsCell.style.setProperty('pointer-events', 'auto', 'important');
        bulkActionsCell.style.setProperty('z-index', '1040', 'important');
        bulkActionsCell.style.setProperty('transform', 'none', 'important');
        bulkActionsCell.style.setProperty('bottom', 'auto', 'important');
        bulkActionsCell.style.setProperty('inset', 'auto', 'important');
        
        // Also force the row to not interfere
        if (bulkActionsRow) {
            bulkActionsRow.style.setProperty('position', 'absolute', 'important');
            bulkActionsRow.style.setProperty('top', '0', 'important');
            bulkActionsRow.style.setProperty('height', '0', 'important');
            bulkActionsRow.style.setProperty('overflow', 'visible', 'important');
            bulkActionsRow.style.setProperty('pointer-events', 'none', 'important');
        }
        
            // Verify position after setting
            setTimeout(() => {
                const rect = bulkActionsCell.getBoundingClientRect();
                if (Math.abs(rect.top - targetTop) > 5) {
                    console.warn(`⚠️ Position still wrong: ${Math.round(rect.top)}px. Using nuclear option...`);
                    // Nuclear option: Move element to body level
                    const containerDiv = bulkActionsCell.querySelector('div');
                    if (containerDiv) {
                        // Check if clone already exists
                        let clone = document.getElementById('history-bulk-actions-fixed');
                        
                        if (!clone) {
                            // Clone and move to body - but only clone the buttons, not the entire container
                            clone = document.createElement('div');
                            clone.id = 'history-bulk-actions-fixed';
                            
                            // Only clone visible buttons (not hidden ones)
                            const buttons = containerDiv.querySelectorAll('[data-control="bulk-action"]:not([style*="display: none"]), button[data-control="bulk-action"]:not([style*="display: none"])');
                            buttons.forEach(btn => {
                                // Check if button is actually visible
                                const btnStyle = window.getComputedStyle(btn);
                                if (btnStyle.display !== 'none' && btnStyle.visibility !== 'hidden' && btnStyle.opacity !== '0') {
                                    const btnClone = btn.cloneNode(true);
                                    clone.appendChild(btnClone);
                                }
                            });
                            
                            // If no buttons found, clone the whole container as fallback
                            if (clone.children.length === 0) {
                                clone = containerDiv.cloneNode(true);
                                clone.id = 'history-bulk-actions-fixed';
                            }
                            
                            document.body.appendChild(clone);
                        }
                        
                        // Force position with setProperty for maximum specificity
                        // Match toolbar-action container: top=64px, but buttons inside are at 88px
                        clone.style.setProperty('position', 'fixed', 'important');
                        clone.style.setProperty('top', '64px', 'important'); // Toolbar container position
                        clone.style.setProperty('right', '20px', 'important');
                        clone.style.setProperty('left', 'auto', 'important');
                        clone.style.setProperty('z-index', '1040', 'important');
                        clone.style.setProperty('display', 'flex', 'important');
                        clone.style.setProperty('flex-direction', 'row', 'important');
                        clone.style.setProperty('align-items', 'center', 'important');
                        clone.style.setProperty('justify-content', 'flex-end', 'important');
                        clone.style.setProperty('gap', '12px', 'important');
                        clone.style.setProperty('background', 'transparent', 'important');
                        clone.style.setProperty('padding', '24px 0 0 0', 'important'); // Add top padding to push buttons to 88px
                        clone.style.setProperty('margin', '0', 'important');
                        
                        // Style buttons inside to match toolbar buttons (88px from top)
                        const buttonsInClone = clone.querySelectorAll('[data-control="bulk-action"], button');
                        buttonsInClone.forEach(btn => {
                            btn.style.setProperty('margin-top', '0', 'important');
                            btn.style.setProperty('margin-bottom', '0', 'important');
                        });
                        
                        // Hide original
                        bulkActionsCell.style.setProperty('display', 'none', 'important');
                        
                        // Verify clone position
                        setTimeout(() => {
                            const cloneRect = clone.getBoundingClientRect();
                            if (Math.abs(cloneRect.top - targetTop) > 5) {
                                // Force again with direct assignment as fallback
                                clone.style.top = '64px';
                                clone.style.position = 'fixed';
                                clone.style.right = '20px';
                                clone.style.left = 'auto';
                                clone.style.paddingTop = '24px'; // Push buttons to 88px
                                console.log(`🔧 Forced clone position again - was ${Math.round(cloneRect.top)}px`);
                            }
                            
                            // Verify button position (should be at 88px)
                            const firstButton = clone.querySelector('[data-control="bulk-action"], button');
                            if (firstButton) {
                                const btnRect = firstButton.getBoundingClientRect();
                                if (Math.abs(btnRect.top - targetButtonTop) > 5) {
                                    clone.style.paddingTop = `${targetButtonTop - targetTop}px`; // 88 - 64 = 24px
                                    console.log(`🔧 Adjusted padding to position button at ${targetButtonTop}px`);
                                }
                            }
                            
                            const finalRect = clone.getBoundingClientRect();
                            const finalButton = clone.querySelector('[data-control="bulk-action"], button');
                            const finalButtonTop = finalButton ? Math.round(finalButton.getBoundingClientRect().top) : 0;
                            console.log(`✅ Bulk actions moved to body - Container: ${Math.round(finalRect.top)}px, Button: ${finalButtonTop}px (target: ${targetButtonTop}px)`);
                        }, 50);
                    }
                } else {
                    console.log(`✅ Bulk actions positioned correctly at ${Math.round(rect.top)}px`);
                }
            }, 100);
        }
        
        // Style the container div
        const containerDiv = bulkActionsCell.querySelector('div');
        if (containerDiv) {
            containerDiv.style.cssText = `
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: flex-end !important;
                gap: 12px !important;
                flex-wrap: wrap !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
            `;
        }
        
        // Style all bulk action buttons
        const bulkActionButtons = document.querySelectorAll('[data-control="bulk-action"]');
        bulkActionButtons.forEach(btn => {
            const isDelete = btn.classList.contains('text-danger') || btn.classList.contains('btn-light');
            
            if (isDelete) {
                // Secondary button style (ice white)
                btn.style.cssText = `
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 0.55rem 1.75rem !important;
                    border-radius: 12px !important;
                    min-height: 40px !important;
                    height: 40px !important;
                    font-weight: 600 !important;
                    background: #f1f4fb !important;
                    border: 1px solid #c9d2e3 !important;
                    color: #202938 !important;
                    box-shadow: none !important;
                    transition: all 0.3s ease !important;
                `;
            } else {
                // Primary button style (green gradient)
                btn.style.cssText = `
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 0.55rem 1.75rem !important;
                    border-radius: 12px !important;
                    min-height: 40px !important;
                    height: 40px !important;
                    font-weight: 600 !important;
                    background: linear-gradient(135deg, #1f2b3a 0%, #364a63 100%) !important;
                    border: 2px solid #364a63 !important;
                    color: #ffffff !important;
                    box-shadow: 0 4px 15px rgba(31, 43, 58, 0.3) !important;
                    transition: all 0.3s ease !important;
                `;
            }
        });
        
        // Hide counter button
        const counterBtn = document.querySelector('.btn-counter');
        if (counterBtn) {
            counterBtn.style.cssText = `
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                width: 0 !important;
                height: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
            `;
        }
        
        // Hide select-all button
        const selectAllBtn = document.querySelector('[data-control="check-total-records"]');
        if (selectAllBtn) {
            selectAllBtn.style.cssText = `
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                width: 0 !important;
                height: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
            `;
        }
        
        // Also hide the counter text span
        const counterSpan = document.querySelector('[data-action-counter]');
        if (counterSpan) {
            counterSpan.style.cssText = `
                display: none !important;
                visibility: hidden !important;
            `;
        }
        
        // Hide the rightmost button (if there are multiple buttons)
        // Keep the left button, remove the right one
        // Also apply to the clone if it exists
        const buttonContainerDiv = bulkActionsCell.querySelector('div');
        const clone = document.getElementById('history-bulk-actions-fixed');
        const containers = [];
        if (buttonContainerDiv) containers.push(buttonContainerDiv);
        if (clone) containers.push(clone);
        
        containers.forEach(container => {
            const allButtons = Array.from(container.querySelectorAll('button, a, [data-control="bulk-action"], .btn'));
            if (allButtons.length > 1) {
                // Filter to only visible buttons
                const visibleButtons = allButtons.filter(btn => {
                    const style = window.getComputedStyle(btn);
                    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && 
                           style.width !== '0px' && style.height !== '0px';
                });
                
                if (visibleButtons.length > 1) {
                    // Get the actual visual position of buttons
                    const buttonsWithPosition = visibleButtons.map(btn => {
                        const rect = btn.getBoundingClientRect();
                        return { button: btn, left: rect.left, right: rect.right };
                    });
                    
                    // Sort by left position (leftmost first)
                    buttonsWithPosition.sort((a, b) => a.left - b.left);
                    
                    // Hide the rightmost button (last in sorted array = rightmost visually)
                    const rightmostButton = buttonsWithPosition[buttonsWithPosition.length - 1].button;
                    rightmostButton.style.cssText = `
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        width: 0 !important;
                        height: 0 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    `;
                    console.log('✅ Hidden rightmost button:', rightmostButton.textContent.trim());
                }
            }
        });
        
        // Add spacing to table
        const listTable = document.querySelector('.list-table');
        if (listTable) {
            listTable.style.marginTop = '20px !important';
        }
        
        // Add spacing to history page content
        const historyContent = document.querySelector('.history-page-content');
        if (historyContent) {
            historyContent.style.marginTop = '30px !important';
            historyContent.style.paddingTop = '15px !important';
        }
        
        console.log('✅ History Page Fixes Applied!');
    }
    
    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyHistoryPageFixes);
    } else {
        applyHistoryPageFixes();
    }
    
    // Also run after delays to catch dynamically loaded content
    setTimeout(applyHistoryPageFixes, 100);
    setTimeout(applyHistoryPageFixes, 500);
    setTimeout(applyHistoryPageFixes, 1000);
    setTimeout(applyHistoryPageFixes, 2000);
    
    // Run continuously when bulk actions are visible
    setInterval(() => {
        const bulkActionsRow = document.querySelector('tr.bulk-actions');
        if (bulkActionsRow && !bulkActionsRow.classList.contains('hide')) {
            // Check if nuclear option clone exists
            const clone = document.getElementById('history-bulk-actions-fixed');
            if (clone) {
                // Verify clone is at correct position
                const rect = clone.getBoundingClientRect();
                if (Math.abs(rect.top - 64) > 5) {
                    clone.style.setProperty('top', '64px', 'important');
                    clone.style.setProperty('position', 'fixed', 'important');
                    clone.style.setProperty('right', '20px', 'important');
                }
            } else {
                applyHistoryPageFixes();
            }
        }
    }, 500);
    
    // Watch for bulk actions visibility changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('bulk-actions') && !target.classList.contains('hide')) {
                    setTimeout(applyHistoryPageFixes, 100);
                }
            }
        });
    });
    
    // Start observing when bulk actions row is found
    setTimeout(() => {
        const bulkActionsRow = document.querySelector('tr.bulk-actions');
        if (bulkActionsRow) {
            observer.observe(bulkActionsRow, { attributes: true, attributeFilter: ['class'] });
        }
    }, 1000);
})();

