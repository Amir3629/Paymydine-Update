<style>
/* ============================================
   ADMIN SETTINGS PAGE - INLINE STYLES FOR IMMEDIATE EFFECT
   ============================================ */

/* Media Finder Image Cards - LARGE & BEAUTIFUL */
.media-finder .grid {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%) !important;
  border-radius: 16px !important;
  border: 2px solid #e5e9f2 !important;
  width: 160px !important;
  height: 160px !important;
  min-width: 160px !important;
  min-height: 160px !important;
  max-width: 160px !important;
  max-height: 160px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.media-finder .grid:hover {
  border-color: #08815e !important;
  box-shadow: 0 8px 24px rgba(8, 129, 94, 0.15) !important;
  transform: translateY(-2px) !important;
}

/* Plus Button - LARGE */
.media-finder .grid .blank-cover i {
  font-size: 48px !important;
  color: #08815e !important;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
}

.media-finder .grid .blank-cover:hover i {
  color: #066b52 !important;
  transform: translate(-50%, -50%) scale(1.1) !important;
}

/* Cross/Remove Button - LARGE */
.grid:hover .find-remove-button,
.grid .find-remove-button:hover {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  max-width: 40px !important;
  max-height: 40px !important;
  font-size: 20px !important;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  border-radius: 50% !important;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.25) !important;
  border: 2px solid rgba(220, 53, 69, 0.1) !important;
}

.grid .find-remove-button:hover {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
  color: #ffffff !important;
  transform: scale(1.1) rotate(90deg) !important;
}

/* Form Fields - Modern */
#edit-form .form-control,
#edit-form input[type="text"],
#edit-form input[type="email"],
#edit-form input[type="number"],
#edit-form textarea,
#edit-form select {
  border-radius: 12px !important;
  border: 2px solid #e5e9f2 !important;
  padding: 12px 16px !important;
  font-size: 15px !important;
  min-height: 48px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

#edit-form .form-control:focus,
#edit-form input:focus,
#edit-form textarea:focus,
#edit-form select:focus {
  border-color: #08815e !important;
  box-shadow: 0 0 0 4px rgba(8, 129, 94, 0.1), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  outline: none !important;
}

/* Labels */
#edit-form .form-group label,
#edit-form .form-label {
  font-size: 15px !important;
  font-weight: 600 !important;
  color: #1f2937 !important;
  margin-bottom: 10px !important;
}

/* Buttons */
#edit-form .btn,
#edit-form .toolbar .btn {
  border-radius: 12px !important;
  padding: 12px 24px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  min-height: 48px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

#edit-form .btn-primary {
  background: linear-gradient(135deg, #08815e 0%, #066b52 100%) !important;
  border: none !important;
  color: #ffffff !important;
}

#edit-form .btn-primary:hover {
  background: linear-gradient(135deg, #066b52 0%, #055a45 100%) !important;
  box-shadow: 0 4px 12px rgba(8, 129, 94, 0.25) !important;
  transform: translateY(-1px) !important;
}

/* Form Groups */
#edit-form .form-group {
  margin-bottom: 28px !important;
}

/* Tabs */
#edit-form .form-nav.nav-tabs .nav-link {
  border-radius: 12px 12px 0 0 !important;
  padding: 14px 20px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
}

#edit-form .form-nav.nav-tabs .nav-link.active {
  color: #08815e !important;
  border-bottom-color: #08815e !important;
}
</style>

<script>
// Force apply styles after DOM loads and on any dynamic updates
(function() {
  function applyModernStyles() {
    // Force media finder grid sizes
    document.querySelectorAll('.media-finder .grid').forEach(function(grid) {
      grid.style.width = '160px';
      grid.style.height = '160px';
      grid.style.minWidth = '160px';
      grid.style.minHeight = '160px';
      grid.style.maxWidth = '160px';
      grid.style.maxHeight = '160px';
      grid.style.borderRadius = '16px';
      grid.style.border = '2px solid #e5e9f2';
      grid.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
    });
    
    // Force plus icon size
    document.querySelectorAll('.media-finder .grid .blank-cover i').forEach(function(icon) {
      icon.style.fontSize = '48px';
      icon.style.color = '#08815e';
    });
    
    // Force remove button size
    document.querySelectorAll('.grid .find-remove-button').forEach(function(btn) {
      btn.style.width = '40px';
      btn.style.height = '40px';
      btn.style.minWidth = '40px';
      btn.style.minHeight = '40px';
      btn.style.maxWidth = '40px';
      btn.style.maxHeight = '40px';
      btn.style.fontSize = '20px';
    });
  }
  
  // Apply immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyModernStyles);
  } else {
    applyModernStyles();
  }
  
  // Re-apply on AJAX updates
  if (typeof jQuery !== 'undefined') {
    jQuery(document).on('ajaxUpdateComplete', applyModernStyles);
    jQuery(document).on('render', applyModernStyles);
  }
  
  // Also apply after a short delay to catch any late-loading elements
  setTimeout(applyModernStyles, 500);
  setTimeout(applyModernStyles, 1000);
})();
</script>

<div class="row-fluid">
    {!! form_open(current_url(),
        [
            'id'     => 'edit-form',
            'role'   => 'form',
            'method' => 'PATCH',
        ]
    ) !!}

    {!! $this->toolbarWidget->render() !!}
    {!! $this->formWidget->render() !!}

    {!! form_close() !!}
</div>
