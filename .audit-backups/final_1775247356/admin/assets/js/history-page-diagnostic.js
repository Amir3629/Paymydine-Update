/**
 * HISTORY PAGE DIAGNOSTIC SCRIPT
 * Run this in the browser console on the history page to see all positioning information
 * 
 * Usage: Copy and paste this entire script into the browser console at:
 * http://127.0.0.1:8002/admin/history
 */

(function() {
    console.clear();
    console.log('%c🔍 HISTORY PAGE DIAGNOSTIC REPORT', 'font-size: 20px; font-weight: bold; color: #08815e;');
    console.log('='.repeat(80));
    
    // Helper function to get element info
    function getElementInfo(selector, label) {
        const el = document.querySelector(selector);
        if (!el) {
            console.log(`❌ ${label}: NOT FOUND`);
            return null;
        }
        
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        
        return {
            element: el,
            label: label,
            selector: selector,
            position: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                bottom: Math.round(rect.bottom),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            },
            styles: {
                position: styles.position,
                display: styles.display,
                visibility: styles.visibility,
                zIndex: styles.zIndex,
                marginTop: styles.marginTop,
                marginBottom: styles.marginBottom,
                paddingTop: styles.paddingTop,
                paddingBottom: styles.paddingBottom,
                backgroundColor: styles.backgroundColor,
                border: styles.border
            },
            visible: rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden'
        };
    }
    
    // Collect all important elements
    const elements = {
        // Header elements
        navbar: getElementInfo('.navbar-top', 'Top Navbar'),
        pageTitle: getElementInfo('.page-title', 'Page Title (in header)'),
        
        // Content wrapper
        nkWrap: getElementInfo('.nk-wrap', 'Content Wrapper (.nk-wrap)'),
        nkContent: getElementInfo('.nk-content', 'Content Area (.nk-content)'),
        containerFluid: getElementInfo('.nk-content .container-fluid', 'Container Fluid'),
        
        // Toolbar (top buttons)
        toolbar: getElementInfo('.toolbar', 'Toolbar Container'),
        toolbarAction: getElementInfo('.toolbar-action', 'Toolbar Action (buttons container)'),
        toolbarButtons: document.querySelectorAll('.toolbar-action .btn'),
        
        // List elements
        listContainer: getElementInfo('.list-container', 'List Container'),
        listTable: getElementInfo('.list-table', 'List Table'),
        listTableHead: getElementInfo('.list-table thead', 'Table Header'),
        listTableBody: getElementInfo('.list-table tbody', 'Table Body'),
        firstTableRow: getElementInfo('.list-table tbody tr:first-child', 'First Table Row'),
        
        // Bulk actions (appears when rows selected)
        bulkActions: getElementInfo('[data-control="bulk-actions"]', 'Bulk Actions Row'),
        bulkActionButtons: document.querySelectorAll('[data-control="bulk-actions"] button, [data-control="bulk-actions"] .btn'),
        btnCounter: getElementInfo('.btn-counter', 'Button Counter'),
        
        // History page specific
        historyPageContent: getElementInfo('.history-page-content', 'History Page Content'),
        
        // Block head (title section)
        nkBlockHead: getElementInfo('.nk-block-head', 'Block Head'),
        
        // Cards
        cards: document.querySelectorAll('.card'),
    };
    
    // Print header section
    console.log('\n%c📐 HEADER & NAVIGATION', 'font-size: 16px; font-weight: bold; color: #0bb87a;');
    console.log('-'.repeat(80));
    if (elements.navbar) {
        console.log(`✅ Navbar:`, elements.navbar.position);
        console.log(`   Styles: position=${elements.navbar.styles.position}, z-index=${elements.navbar.styles.zIndex}`);
    }
    if (elements.pageTitle) {
        console.log(`✅ Page Title:`, elements.pageTitle.position);
    }
    
    // Print content wrapper section
    console.log('\n%c📦 CONTENT WRAPPER', 'font-size: 16px; font-weight: bold; color: #0bb87a;');
    console.log('-'.repeat(80));
    if (elements.nkWrap) {
        console.log(`✅ .nk-wrap:`, elements.nkWrap.position);
        console.log(`   Styles: position=${elements.nkWrap.styles.position}, margin-top=${elements.nkWrap.styles.marginTop}, padding-top=${elements.nkWrap.styles.paddingTop}`);
    }
    if (elements.nkContent) {
        console.log(`✅ .nk-content:`, elements.nkContent.position);
        console.log(`   Styles: margin-top=${elements.nkContent.styles.marginTop}, padding-top=${elements.nkContent.styles.paddingTop}`);
    }
    if (elements.containerFluid) {
        console.log(`✅ .container-fluid:`, elements.containerFluid.position);
        console.log(`   Styles: margin-top=${elements.containerFluid.styles.marginTop}, padding-top=${elements.containerFluid.styles.paddingTop}, padding-bottom=${elements.containerFluid.styles.paddingBottom}`);
    }
    
    // Print toolbar section
    console.log('\n%c🔘 TOOLBAR & BUTTONS (Top of Page)', 'font-size: 16px; font-weight: bold; color: #0bb87a;');
    console.log('-'.repeat(80));
    if (elements.toolbar) {
        console.log(`✅ Toolbar Container:`, elements.toolbar.position);
        console.log(`   Visible: ${elements.toolbar.visible}`);
    }
    if (elements.toolbarAction) {
        console.log(`✅ Toolbar Action:`, elements.toolbarAction.position);
        console.log(`   Styles: background=${elements.toolbarAction.styles.backgroundColor}, padding-top=${elements.toolbarAction.styles.paddingTop}`);
    }
    if (elements.toolbarButtons && elements.toolbarButtons.length > 0) {
        console.log(`✅ Toolbar Buttons Found: ${elements.toolbarButtons.length}`);
        elements.toolbarButtons.forEach((btn, idx) => {
            const rect = btn.getBoundingClientRect();
            const styles = window.getComputedStyle(btn);
            console.log(`   Button ${idx + 1}:`, {
                text: btn.textContent.trim().substring(0, 30),
                position: { top: Math.round(rect.top), left: Math.round(rect.left) },
                size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                background: styles.backgroundColor,
                color: styles.color
            });
        });
    } else {
        console.log(`⚠️  No toolbar buttons found`);
    }
    
    // Print list section
    console.log('\n%c📋 LIST & TABLE', 'font-size: 16px; font-weight: bold; color: #0bb87a;');
    console.log('-'.repeat(80));
    if (elements.listContainer) {
        console.log(`✅ List Container:`, elements.listContainer.position);
        console.log(`   Styles: margin-top=${elements.listContainer.styles.marginTop}, padding-top=${elements.listContainer.styles.paddingTop}`);
    }
    if (elements.listTable) {
        console.log(`✅ List Table:`, elements.listTable.position);
    }
    if (elements.listTableHead) {
        console.log(`✅ Table Header:`, elements.listTableHead.position);
    }
    if (elements.firstTableRow) {
        console.log(`✅ First Table Row:`, elements.firstTableRow.position);
        console.log(`   Distance from top of viewport: ${Math.round(elements.firstTableRow.position.top)}px`);
    }
    
    // Print bulk actions section
    console.log('\n%c⚡ BULK ACTIONS (Shows when rows selected)', 'font-size: 16px; font-weight: bold; color: #0bb87a;');
    console.log('-'.repeat(80));
    if (elements.bulkActions) {
        console.log(`✅ Bulk Actions Row:`, elements.bulkActions.position);
        console.log(`   Visible: ${elements.bulkActions.visible}`);
        console.log(`   Styles: display=${elements.bulkActions.styles.display}, position=${elements.bulkActions.styles.position}`);
        console.log(`   Distance from top of viewport: ${Math.round(elements.bulkActions.position.top)}px`);
        console.log(`   Distance from top of table: ${elements.listTable ? Math.round(elements.bulkActions.position.top - elements.listTable.position.top) : 'N/A'}px`);
    } else {
        console.log(`⚠️  Bulk Actions Row: NOT FOUND (might be hidden or not rendered)`);
    }
    if (elements.bulkActionButtons && elements.bulkActionButtons.length > 0) {
        console.log(`✅ Bulk Action Buttons Found: ${elements.bulkActionButtons.length}`);
        elements.bulkActionButtons.forEach((btn, idx) => {
            const rect = btn.getBoundingClientRect();
            const styles = window.getComputedStyle(btn);
            console.log(`   Button ${idx + 1}:`, {
                text: btn.textContent.trim().substring(0, 30),
                position: { top: Math.round(rect.top), left: Math.round(rect.left) },
                size: { width: Math.round(rect.width), height: Math.round(rect.height) },
                background: styles.backgroundColor,
                color: styles.color
            });
        });
    }
    if (elements.btnCounter) {
        console.log(`✅ Button Counter:`, elements.btnCounter.position);
    }
    
    // Print spacing analysis
    console.log('\n%c📏 SPACING ANALYSIS', 'font-size: 16px; font-weight: bold; color: #0bb87a;');
    console.log('-'.repeat(80));
    
    if (elements.navbar && elements.containerFluid) {
        const gap = elements.containerFluid.position.top - elements.navbar.position.bottom;
        console.log(`📐 Gap between Navbar and Container: ${Math.round(gap)}px`);
        if (gap < 0) {
            console.log(`   ⚠️  OVERLAP DETECTED! Container is overlapping navbar`);
        } else if (gap < 10) {
            console.log(`   ⚠️  Very small gap - might need more spacing`);
        }
    }
    
    if (elements.toolbarAction && elements.listTable) {
        const gap = elements.listTable.position.top - elements.toolbarAction.position.bottom;
        console.log(`📐 Gap between Toolbar and Table: ${Math.round(gap)}px`);
        if (gap < 0) {
            console.log(`   ⚠️  OVERLAP DETECTED! Table is overlapping toolbar`);
        } else if (gap < 20) {
            console.log(`   ⚠️  Small gap - might need more spacing`);
        }
    }
    
    if (elements.bulkActions && elements.listTable) {
        const gap = elements.bulkActions.position.top - elements.listTable.position.top;
        console.log(`📐 Bulk Actions Row position relative to Table: ${Math.round(gap)}px`);
        if (gap < 0) {
            console.log(`   ⚠️  Bulk actions are above table (unexpected)`);
        }
    }
    
    if (elements.firstTableRow) {
        const distanceFromTop = elements.firstTableRow.position.top;
        console.log(`📐 First Table Row distance from viewport top: ${Math.round(distanceFromTop)}px`);
        if (distanceFromTop < 100) {
            console.log(`   ⚠️  Very close to top - might need more spacing`);
        }
    }
    
    // Print overlap detection
    console.log('\n%c🔍 OVERLAP DETECTION', 'font-size: 16px; font-weight: bold; color: #dc3545;');
    console.log('-'.repeat(80));
    
    const overlaps = [];
    
    // Check if bulk actions overlap with table header
    if (elements.bulkActions && elements.listTableHead && elements.bulkActions.visible) {
        const bulkTop = elements.bulkActions.position.top;
        const bulkBottom = elements.bulkActions.position.bottom;
        const headerTop = elements.listTableHead.position.top;
        const headerBottom = elements.listTableHead.position.bottom;
        
        if ((bulkTop < headerBottom && bulkBottom > headerTop)) {
            overlaps.push({
                element1: 'Bulk Actions Row',
                element2: 'Table Header',
                overlap: Math.min(bulkBottom - headerTop, headerBottom - bulkTop)
            });
        }
    }
    
    // Check if toolbar overlaps with content
    if (elements.toolbarAction && elements.listTable) {
        const toolbarBottom = elements.toolbarAction.position.bottom;
        const tableTop = elements.listTable.position.top;
        
        if (toolbarBottom > tableTop) {
            overlaps.push({
                element1: 'Toolbar',
                element2: 'Table',
                overlap: toolbarBottom - tableTop
            });
        }
    }
    
    if (overlaps.length > 0) {
        overlaps.forEach(overlap => {
            console.log(`❌ OVERLAP: ${overlap.element1} overlaps ${overlap.element2} by ${Math.round(overlap.overlap)}px`);
        });
    } else {
        console.log(`✅ No overlaps detected`);
    }
    
    // Print Z-index analysis
    console.log('\n%c🎯 Z-INDEX ANALYSIS', 'font-size: 16px; font-weight: bold; color: #0bb87a;');
    console.log('-'.repeat(80));
    const zIndexElements = [
        { name: 'Navbar', el: elements.navbar },
        { name: 'Toolbar', el: elements.toolbarAction },
        { name: 'Bulk Actions', el: elements.bulkActions },
        { name: 'Table', el: elements.listTable }
    ];
    zIndexElements.forEach(item => {
        if (item.el) {
            console.log(`   ${item.name}: z-index=${item.el.styles.zIndex || 'auto'}`);
        }
    });
    
    // Visual overlay (optional - creates colored boxes)
    console.log('\n%c💡 TIP: Check the page for colored diagnostic overlays', 'font-size: 14px; font-style: italic; color: #08815e;');
    
    // Create visual overlays
    function createOverlay(element, color, label) {
        if (!element || !element.visible) return;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: ${element.position.top}px;
            left: ${element.position.left}px;
            width: ${element.position.width}px;
            height: ${element.position.height}px;
            border: 2px solid ${color};
            background: ${color}22;
            pointer-events: none;
            z-index: 999999;
            box-sizing: border-box;
        `;
        
        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            position: absolute;
            top: -20px;
            left: 0;
            background: ${color};
            color: white;
            padding: 2px 6px;
            font-size: 11px;
            font-weight: bold;
            white-space: nowrap;
        `;
        overlay.appendChild(labelEl);
        document.body.appendChild(overlay);
        
        return overlay;
    }
    
    const overlays = [];
    if (elements.navbar) overlays.push(createOverlay(elements.navbar, '#dc3545', 'Navbar'));
    if (elements.toolbarAction) overlays.push(createOverlay(elements.toolbarAction, '#08815e', 'Toolbar'));
    if (elements.bulkActions && elements.bulkActions.visible) overlays.push(createOverlay(elements.bulkActions, '#ffc107', 'Bulk Actions'));
    if (elements.listTable) overlays.push(createOverlay(elements.listTable, '#17a2b8', 'Table'));
    if (elements.firstTableRow) overlays.push(createOverlay(elements.firstTableRow, '#28a745', 'First Row'));
    
    // Store overlays for cleanup
    window._historyDiagnosticOverlays = overlays;
    
    console.log('\n%c✅ Diagnostic complete!', 'font-size: 16px; font-weight: bold; color: #28a745;');
    console.log('%c💡 To remove overlays, run: window._historyDiagnosticOverlays.forEach(o => o.remove())', 'font-size: 12px; color: #6c757d;');
    console.log('='.repeat(80));
    
    // Return data for programmatic access
    return {
        elements: elements,
        overlaps: overlaps,
        clearOverlays: function() {
            if (window._historyDiagnosticOverlays) {
                window._historyDiagnosticOverlays.forEach(o => o.remove());
                window._historyDiagnosticOverlays = [];
            }
        }
    };
})();

