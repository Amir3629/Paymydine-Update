/**
 * FIX SUGGESTION SENTENCES LABEL - Remove underline
 * Remove shadow from Add Item button
 */

(function() {
    'use strict';
    
    function fixSuggestionSentencesLabel() {
        // Hide "Suggestion Sentences" label completely
        const labels = document.querySelectorAll(
            '#form-field-setting-note-suggestion-sentences-group label, ' +
            '#form-field-setting-note-suggestion-sentences-group .form-label, ' +
            '.form-group[data-field-name="note_suggestion_sentences"] label, ' +
            '.form-group[data-field-name="note_suggestion_sentences"] .form-label'
        );
        
        labels.forEach(label => {
            label.style.setProperty('display', 'none', 'important');
            label.style.setProperty('visibility', 'hidden', 'important');
            label.style.setProperty('height', '0', 'important');
            label.style.setProperty('margin', '0', 'important');
            label.style.setProperty('padding', '0', 'important');
        });
        
        // Remove shadow from "Add new suggestion" button
        const addButtons = document.querySelectorAll(
            'button[data-control="add-item"], ' +
            '.btn[data-control="add-item"], ' +
            '.btn-primary[data-control="add-item"]'
        );
        
        addButtons.forEach(btn => {
            btn.style.setProperty('box-shadow', 'none', 'important');
            btn.style.setProperty('-webkit-box-shadow', 'none', 'important');
            btn.style.setProperty('-moz-box-shadow', 'none', 'important');
        });
    }
    
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixSuggestionSentencesLabel);
    } else {
        fixSuggestionSentencesLabel();
    }
    
    // Run after delays to catch dynamically loaded content
    setTimeout(fixSuggestionSentencesLabel, 100);
    setTimeout(fixSuggestionSentencesLabel, 500);
    setTimeout(fixSuggestionSentencesLabel, 1000);
    
    // Watch for new elements
    const observer = new MutationObserver(function(mutations) {
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.id && node.id.includes('note-suggestion-sentences') ||
                            node.querySelector && node.querySelector('[data-control="add-item"]')) {
                            shouldFix = true;
                        }
                    }
                });
            }
        });
        if (shouldFix) {
            setTimeout(fixSuggestionSentencesLabel, 50);
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Suggestion Sentences label fix initialized - removing underline and button shadow');
})();
