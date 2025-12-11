// FORCE COLOR FIX - EMERGENCY OVERRIDE
// This script will force override any remaining old colors

function restyleEditButtons() {
    const editButtons = document.querySelectorAll('.btn-edit, .btn-outline-warning.bg-transparent, .btn-star');
    if (!editButtons.length) {
        return;
    }

    editButtons.forEach(button => {
        button.classList.remove('btn-secondary', 'btn-primary', 'btn-dark', 'text-white');
        if (button.classList.contains('btn-outline-warning')) {
            button.classList.remove('btn-outline-warning', 'bg-transparent');
        }
        button.style.setProperty('background', '#f1f4fb', 'important');
        button.style.setProperty('background-color', '#f1f4fb', 'important');
        button.style.setProperty('color', '#202938', 'important');
        button.style.setProperty('border', '1px solid #c9d2e3', 'important');
        button.style.setProperty('border-radius', '20px', 'important');
        button.style.setProperty('min-height', '48px', 'important');
        button.style.setProperty('min-width', '48px', 'important');
        button.style.setProperty('height', '48px', 'important');
        button.style.setProperty('width', '48px', 'important');
        button.style.setProperty('padding', '12px 16px', 'important');
        button.style.setProperty('display', 'inline-flex', 'important');
        button.style.setProperty('align-items', 'center', 'important');
        button.style.setProperty('justify-content', 'center', 'important');
        button.style.setProperty('box-shadow', 'none', 'important');

        const icons = button.querySelectorAll('i, svg, span.fa');
        icons.forEach(icon => {
            icon.style.setProperty('color', '#202938', 'important');
            icon.style.setProperty('font-size', '20px', 'important');
            icon.style.setProperty('margin', '0', 'important');
        });

        button.addEventListener('mouseenter', () => {
            button.style.setProperty('background', '#e5ebf7', 'important');
            button.style.setProperty('background-color', '#e5ebf7', 'important');
            button.style.setProperty('border-color', '#b8c6dd', 'important');
            button.style.setProperty('color', '#202938', 'important');
        });

        button.addEventListener('mouseleave', () => {
            button.style.setProperty('background', '#f1f4fb', 'important');
            button.style.setProperty('background-color', '#f1f4fb', 'important');
            button.style.setProperty('border-color', '#c9d2e3', 'important');
            button.style.setProperty('color', '#202938', 'important');
        });
    });
}

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
                button.style.background = 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)';
                button.style.backgroundColor = '#1f2b3a';
                button.style.borderColor = '#364a63';
                button.style.color = '#ffffff';
                button.style.boxShadow = '0 4px 15px rgba(31, 43, 58, 0.3)';
            }
        });

        restyleEditButtons();
        
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
    restyleEditButtons();
    
    // Run again after a short delay
    setTimeout(forceColorFix, 1000);
    setTimeout(restyleEditButtons, 1000);

    // Keep enforcing periodically in case other scripts restyle later
    setInterval(restyleEditButtons, 3000);
    
    // Run when new elements are added
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                setTimeout(forceColorFix, 100);
                setTimeout(restyleEditButtons, 150);
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    document.addEventListener('pageContentLoaded', () => {
        forceColorFix();
        restyleEditButtons();
    });

    document.addEventListener('ajaxUpdate', () => {
        setTimeout(restyleEditButtons, 50);
    });
    
    console.log('🎨 FORCE COLOR FIX: Emergency override active!');
});
