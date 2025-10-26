// FORCE COLOR FIX - EMERGENCY OVERRIDE
// This script will force override any remaining old colors

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 FORCE COLOR FIX: Starting emergency color override...');
    
    // Function to force override colors
    function forceColorFix() {
        // Get all form elements
        const formElements = document.querySelectorAll('input, textarea, select, .form-control');
        
        formElements.forEach(element => {
            // Force white background
            element.style.backgroundColor = '#ffffff';
            element.style.borderColor = '#d1d5db';
            element.style.color = '#111827';
            
            // Remove any old color classes
            element.classList.remove('bg-warning', 'bg-yellow', 'bg-amber', 'bg-orange');
            
            // Add clean classes
            element.classList.add('bg-white');
        });
        
        // Get all buttons
        const buttons = document.querySelectorAll('button, .btn');
        buttons.forEach(button => {
            if (button.classList.contains('btn-primary')) {
                button.style.backgroundColor = '#08815e';
                button.style.borderColor = '#08815e';
                button.style.color = '#ffffff';
            }
        });
        
        // Get all labels
        const labels = document.querySelectorAll('label, .form-label');
        labels.forEach(label => {
            label.style.color = '#4b5563';
        });
        
        // Get all help blocks
        const helpBlocks = document.querySelectorAll('.help-block, .form-text');
        helpBlocks.forEach(block => {
            block.style.color = '#6b7280';
        });
        
        // FORCE SIDEBAR NAVIGATION COLORS - Use brighter version of sidebar color
        const sidebarNavs = document.querySelectorAll('.nav-sidebar .nav .nav, #side-nav-menu');
        sidebarNavs.forEach(nav => {
            nav.style.backgroundColor = '#2a3447';
        });
        
        // Force sidebar nav links to stay white with brighter sidebar color
        const sidebarLinks = document.querySelectorAll('.nav-sidebar .nav-link, #side-nav-menu .nav-link');
        sidebarLinks.forEach(link => {
            // Remove any brown color classes
            link.classList.remove('bg-warning', 'bg-yellow', 'bg-amber', 'bg-orange');
            
            // Force white text
            link.style.color = '#ffffff';
            
            // On hover, keep white
            link.addEventListener('mouseenter', function() {
                this.style.color = '#ffffff';
                this.style.backgroundColor = 'transparent';
            });
            
            // On click/active, keep white
            link.addEventListener('click', function() {
                this.style.color = '#ffffff';
                this.style.backgroundColor = 'transparent';
            });
        });
        
        console.log('🎨 FORCE COLOR FIX: Applied to', formElements.length, 'form elements and', sidebarLinks.length, 'sidebar links');
    }
    
    // Run immediately
    forceColorFix();
    
    // Run again after a short delay
    setTimeout(forceColorFix, 1000);
    
    // Run when new elements are added
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                setTimeout(forceColorFix, 100);
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('🎨 FORCE COLOR FIX: Emergency override active!');
});
