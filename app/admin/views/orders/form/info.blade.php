<style>
/* Override parent container constraints - make it full width */
.form-group.span-left.partial-field,
.form-group[data-field-name="_info"],
.form-group.span-left[data-field-name="_info"],
#{{ $field->getId('group') ?? 'order-info-container' }},
.form-group.span-left {
    width: 100% !important;
    max-width: 100% !important;
    flex: 0 0 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
}

/* Ensure form-fields container doesn't constrain */
.form-fields,
.form-fields > div,
[class*="form-field"],
[class*="field-"] {
    overflow: visible !important;
    max-width: 100% !important;
}

/* Make the header break out of any column constraints */
.order-info-header {
    display: flex !important;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 22px;
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    border-radius: 14px;
    border: 2px solid #e5e9f2;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    margin-top: -32px !important;
    margin-bottom: 24px;
    margin-left: 0 !important;
    margin-right: 0 !important;
    flex-wrap: nowrap !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 100% !important;
    box-sizing: border-box;
    min-height: 72px;
    overflow: visible !important;
    position: relative;
    clear: both;
}

/* Ensure all items fit within the frame - align from top */
.order-info-item {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 5px;
    min-width: 0;
    flex-shrink: 0;
    flex-grow: 0;
    text-align: center;
    margin-top: 0;
    padding-top: 0;
}

/* Ensure all labels align on the same baseline at the top */
.order-info-item > .order-info-label {
    flex: 0 0 auto;
    height: 15px;
    min-height: 15px;
    max-height: 15px;
    line-height: 15px;
    margin: 0 0 3px 0;
    margin-top: 0 !important;
    padding-top: 0 !important;
    align-self: center;
}

.order-info-item.table-number {
    min-width: 130px;
}

.order-info-item.order-id {
    min-width: 120px;
}

.order-info-item.date-time {
    min-width: 220px;
}

.order-info-item.status {
    min-width: 170px;
}

.order-info-item.assignee {
    min-width: 120px;
    flex-grow: 0;
    flex-shrink: 0;
}

.order-info-item.invoice-combined {
    min-width: 120px;
    flex-shrink: 0;
    align-items: stretch;
    gap: 3px;
    margin-top: 0;
    padding-top: 0;
    justify-content: flex-start;
}

.order-info-item.note {
    min-width: 90px;
    flex-shrink: 0;
    align-items: stretch;
    gap: 3px;
    margin-top: 0;
    padding-top: 0;
    justify-content: flex-start;
}

/* Container for both invoice buttons */
.invoice-buttons-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 2px;
}

/* Container for note button - centers it under the label */
.note-button-container {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
}

/* Keep old classes for backward compatibility */
.order-info-item.send-invoice {
    min-width: 110px;
    flex-shrink: 0;
    align-items: stretch;
    gap: 3px;
    margin-top: 0;
    padding-top: 0;
    justify-content: flex-start;
}

.order-info-item.invoice {
    min-width: 110px;
    flex-shrink: 0;
    align-items: stretch;
    gap: 3px;
    margin-top: 0;
    padding-top: 0;
    justify-content: flex-start;
}

.order-info-item.invoice .invoice-icon-btn {
    margin-top: 2px !important;
    transform: translateY(0) !important;
    position: relative !important;
    top: 0 !important;
}

/* Invoice Icon Button - Perfect Square - Same size for both buttons */
.order-info-header .invoice-icon-btn,
.order-info-item.invoice .invoice-icon-btn,
.order-info-item.invoice-combined .invoice-icon-btn,
.invoice-buttons-container .invoice-icon-btn,
a.invoice-icon-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    max-width: 40px !important;
    max-height: 40px !important;
    aspect-ratio: 1 / 1 !important;
    box-sizing: border-box !important;
    background: #f1f4fb !important;
    background-color: #f1f4fb !important;
    border: 1px solid #c9d2e3 !important;
    border-radius: 10px !important;
    color: #364a63 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    text-decoration: none !important;
    padding: 0 !important;
    margin: 0 !important;
    margin-top: 0 !important;
    transform: translateY(0) !important;
    flex-shrink: 0 !important;
}

.order-info-header .invoice-icon-btn:hover,
.order-info-header .invoice-icon-btn:focus,
.order-info-item.invoice .invoice-icon-btn:hover,
.order-info-item.invoice .invoice-icon-btn:focus,
.order-info-item.invoice-combined .invoice-icon-btn:hover,
.invoice-buttons-container .invoice-icon-btn:hover {
    background: #e5ebf7 !important;
    background-color: #e5ebf7 !important;
    border-color: #b8c6dd !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

/* Invoice Icon - Centered in button frame (both buttons same style) */
.order-info-header .invoice-icon-btn i,
.order-info-header .invoice-icon-btn i.fa,
.order-info-header .invoice-icon-btn i.fa-file-text,
.order-info-header .invoice-icon-btn i.fa-file-invoice,
.order-info-item.invoice .invoice-icon-btn i,
.order-info-item.invoice .invoice-icon-btn i.fa,
.order-info-item.invoice .invoice-icon-btn i.fa-file-text,
.order-info-item.invoice .invoice-icon-btn i.fa-file-invoice,
.order-info-item.invoice-combined .invoice-icon-btn i,
.invoice-buttons-container .invoice-icon-btn i,
a.invoice-icon-btn i,
a.invoice-icon-btn i.fa,
a.invoice-icon-btn i.fa-file-text,
a.invoice-icon-btn i.fa-file-invoice,
a[class*="invoice-icon-btn"] i,
a[class*="invoice-icon-btn"] i.fa,
.invoice-icon-btn i,
.invoice-icon-btn i.fa {
    font-size: 18px !important;
    color: #364a63 !important;
    margin: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
    position: relative !important;
    top: 0 !important;
}

.order-info-header .invoice-icon-btn:hover i,
.order-info-header .invoice-icon-btn:focus i,
.order-info-item.invoice .invoice-icon-btn:hover i,
.order-info-item.invoice .invoice-icon-btn:focus i {
    color: #364a63 !important;
}

.order-info-item.send-invoice .send-invoice-icon-btn {
    margin-top: 2px !important;
    transform: translateY(0) !important;
    position: relative !important;
    top: 0 !important;
}

/* Send Invoice Icon Button - Perfect Square - Same size as invoice button */
.order-info-header .send-invoice-icon-btn,
.order-info-item.send-invoice .send-invoice-icon-btn,
.order-info-item.invoice-combined .send-invoice-icon-btn,
.invoice-buttons-container .send-invoice-icon-btn,
a.send-invoice-icon-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    max-width: 40px !important;
    max-height: 40px !important;
    aspect-ratio: 1 / 1 !important;
    box-sizing: border-box !important;
    background: #f1f4fb !important;
    background-color: #f1f4fb !important;
    border: 1px solid #c9d2e3 !important;
    border-radius: 10px !important;
    color: #364a63 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    text-decoration: none !important;
    padding: 0 !important;
    margin: 0 !important;
    margin-top: 0 !important;
    transform: translateY(0) !important;
    flex-shrink: 0 !important;
}

/* Note Icon Button - Perfect Square - Same size as invoice button */
.order-info-header .note-icon-btn,
.order-info-item.note .note-icon-btn,
a.note-icon-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    max-width: 40px !important;
    max-height: 40px !important;
    aspect-ratio: 1 / 1 !important;
    box-sizing: border-box !important;
    background: #f1f4fb !important;
    background-color: #f1f4fb !important;
    border: 1px solid #c9d2e3 !important;
    border-radius: 10px !important;
    color: #364a63 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    text-decoration: none !important;
    padding: 0 !important;
    margin: 0 !important;
    margin-top: 0 !important;
    transform: translateY(0) !important;
    flex-shrink: 0 !important;
}

.order-info-header .send-invoice-icon-btn:hover,
.order-info-header .send-invoice-icon-btn:focus,
.order-info-item.send-invoice .send-invoice-icon-btn:hover,
.order-info-item.send-invoice .send-invoice-icon-btn:focus,
.order-info-item.invoice-combined .send-invoice-icon-btn:hover,
.invoice-buttons-container .send-invoice-icon-btn:hover {
    background: #e5ebf7 !important;
    background-color: #e5ebf7 !important;
    border-color: #b8c6dd !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.order-info-header .note-icon-btn:hover,
.order-info-header .note-icon-btn:focus,
.order-info-item.note .note-icon-btn:hover,
.order-info-item.note .note-icon-btn:focus {
    background: #e5ebf7 !important;
    background-color: #e5ebf7 !important;
    border-color: #b8c6dd !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

/* Icon - Centered in button frame (both buttons same style) */
.order-info-header .send-invoice-icon-btn i,
.order-info-header .send-invoice-icon-btn i.fa,
.order-info-header .send-invoice-icon-btn i.fa-envelope,
.order-info-item.send-invoice .send-invoice-icon-btn i,
.order-info-item.send-invoice .send-invoice-icon-btn i.fa,
.order-info-item.send-invoice .send-invoice-icon-btn i.fa-envelope,
.order-info-item.invoice-combined .send-invoice-icon-btn i,
.invoice-buttons-container .send-invoice-icon-btn i,
a.send-invoice-icon-btn i,
a.send-invoice-icon-btn i.fa,
a.send-invoice-icon-btn i.fa-envelope,
a[class*="send-invoice-icon-btn"] i,
a[class*="send-invoice-icon-btn"] i.fa,
.send-invoice-icon-btn i,
.send-invoice-icon-btn i.fa {
    font-size: 18px !important;
    color: #364a63 !important;
    margin: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
    position: relative !important;
    top: 0 !important;
}

/* Override inline styles - Maximum specificity - Ensure icon is centered */
a.send-invoice-icon-btn i[style*="margin"],
a.send-invoice-icon-btn i[style*="margin-right"],
a.send-invoice-icon-btn i[style*="margin-top"],
.send-invoice-icon-btn i[style*="margin"],
.send-invoice-icon-btn i[style*="margin-right"],
.send-invoice-icon-btn i[style*="margin-top"],
.invoice-buttons-container .send-invoice-icon-btn i[style*="margin"],
.invoice-buttons-container .send-invoice-icon-btn i[style*="margin-top"] {
    margin-right: 0 !important;
    margin-left: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    margin: 0 !important;
    position: relative !important;
    top: 0 !important;
    vertical-align: middle !important;
}

/* Specific fix for envelope icon centering - Font Awesome icons sometimes need adjustment */
.invoice-buttons-container .send-invoice-icon-btn i.fa-envelope,
.order-info-item.invoice-combined .send-invoice-icon-btn i.fa-envelope,
.send-invoice-icon-btn i.fa-envelope {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 0 !important;
    top: 0 !important;
    line-height: 1 !important;
    vertical-align: middle !important;
    height: 100% !important;
    width: 100% !important;
}

/* Ensure the send invoice button itself properly centers its content */
.invoice-buttons-container .send-invoice-icon-btn,
.order-info-item.invoice-combined .send-invoice-icon-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    vertical-align: middle !important;
}

.order-info-header .send-invoice-icon-btn:hover i,
.order-info-header .send-invoice-icon-btn:focus i,
.order-info-item.send-invoice .send-invoice-icon-btn:hover i,
.order-info-item.send-invoice .send-invoice-icon-btn:focus i {
    color: #364a63 !important;
}

/* Note Icon - Centered in button frame (matching send-invoice button) */
.order-info-header .note-icon-btn i,
.order-info-header .note-icon-btn i.fa,
.order-info-header .note-icon-btn i.fa-sticky-note,
.order-info-item.note .note-icon-btn i,
.order-info-item.note .note-icon-btn i.fa,
.order-info-item.note .note-icon-btn i.fa-sticky-note,
a.note-icon-btn i,
a.note-icon-btn i.fa,
a.note-icon-btn i.fa-sticky-note,
a[class*="note-icon-btn"] i,
a[class*="note-icon-btn"] i.fa,
.note-icon-btn i,
.note-icon-btn i.fa {
    font-size: 18px !important;
    color: #364a63 !important;
    margin: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
    position: relative !important;
    top: 0 !important;
}

/* Override inline styles - Maximum specificity - Ensure icon is centered */
a.note-icon-btn i[style*="margin"],
a.note-icon-btn i[style*="margin-right"],
a.note-icon-btn i[style*="margin-top"],
.note-icon-btn i[style*="margin"],
.note-icon-btn i[style*="margin-right"],
.note-icon-btn i[style*="margin-top"] {
    margin-right: 0 !important;
    margin-left: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    margin: 0 !important;
    position: relative !important;
    top: 0 !important;
    vertical-align: middle !important;
}

/* Specific fix for sticky-note icon centering - Font Awesome icons sometimes need adjustment */
.order-info-item.note .note-icon-btn i.fa-sticky-note,
.note-icon-btn i.fa-sticky-note {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin: 0 !important;
    padding: 0 !important;
    top: 0 !important;
    line-height: 1 !important;
    vertical-align: middle !important;
    height: 100% !important;
    width: 100% !important;
}

/* Ensure the note button itself properly centers its content */
.order-info-item.note .note-icon-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    vertical-align: middle !important;
}

.order-info-header .note-icon-btn:hover i,
.order-info-header .note-icon-btn:focus i,
.order-info-item.note .note-icon-btn:hover i,
.order-info-item.note .note-icon-btn:focus i {
    color: #364a63 !important;
}

.order-info-label {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #8094ae;
    margin: 0 0 3px 0 !important;
    margin-top: 0 !important;
    padding: 0 !important;
    padding-top: 0 !important;
    line-height: 15px;
    height: 15px;
    min-height: 15px;
    max-height: 15px;
    text-align: center;
    width: 100%;
    display: block;
    vertical-align: top;
    box-sizing: border-box;
}

.order-info-value {
    font-size: 19px;
    font-weight: 700;
    color: #364a63;
    margin: 5px 0 0 0;
    margin-top: 5px;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    width: 100%;
}

.order-info-value.order-id-value {
    color: #08815e;
    font-size: 22px;
    margin-top: 5px;
}

.order-info-value.status-value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 4px;
    background: #f1f4fb !important;
    background-color: #f1f4fb !important;
    border-radius: 10px !important;
    border: 1px solid #c9d2e3 !important;
    border-bottom: 1px solid #c9d2e3 !important;
    color: #364a63 !important;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin: 0 auto;
}

.order-info-value.status-value:hover {
    background: #e5ebf7 !important;
    background-color: #e5ebf7 !important;
    border-color: #b8c6dd !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.order-info-value.assignee-value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 14px;
    background: #f1f4fb !important;
    background-color: #f1f4fb !important;
    border-radius: 10px !important;
    border: 1px solid #c9d2e3 !important;
    color: #364a63 !important;
    font-style: italic;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 16px;
    text-align: center;
    margin: 0 auto;
}

.order-info-value.assignee-value:hover {
    background: #e5ebf7 !important;
    background-color: #e5ebf7 !important;
    border-color: #b8c6dd !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Status dot icon - preserve status color */
.order-info-value.status-value i.fa-circle,
.status-value.header-status-clickable i.fa-circle,
.status-dot-icon,
.order-info-header .status-value i.fa-circle {
    /* Status color will be set inline from PHP - don't override it */
}

/* Override inline styles for STATUS and ASSIGNEE - Ice White - Match Invoice Buttons Exactly */
.order-info-header .order-info-value.status-value,
.order-info-header .status-value.header-status-clickable,
.order-info-item.status .order-info-value.status-value,
a.order-info-value.status-value.header-status-clickable,
.order-info-header a.order-info-value.status-value,
.order-info-header a.status-value {
    background: #f1f4fb !important;
    background-color: #f1f4fb !important;
    border: 1px solid #c9d2e3 !important;
    border-radius: 10px !important;
    color: #364a63 !important;
    border-bottom: 1px solid #c9d2e3 !important;
    border-bottom-style: solid !important;
}

.order-info-header .order-info-value.status-value:hover,
.order-info-header .status-value.header-status-clickable:hover,
.order-info-item.status .order-info-value.status-value:hover,
a.order-info-value.status-value.header-status-clickable:hover,
.order-info-header a.order-info-value.status-value:hover,
.order-info-header a.status-value:hover {
    background: #e5ebf7 !important;
    background-color: #e5ebf7 !important;
    border-color: #b8c6dd !important;
    border-bottom-color: #b8c6dd !important;
}

.order-info-header .order-info-value.status-value,
.order-info-header .status-value.header-status-clickable,
.order-info-item.status .order-info-value.status-value,
a.order-info-value.status-value.header-status-clickable,
.order-info-header a.order-info-value.status-value,
.order-info-header a.status-value {
    padding: 6px 4px !important;
}

.order-info-header .order-info-value.assignee-value,
.order-info-header .assignee-value.header-assignee-clickable,
.order-info-item.assignee .order-info-value.assignee-value,
a.order-info-value.assignee-value.header-assignee-clickable,
.order-info-header a.order-info-value.assignee-value,
.order-info-header a.assignee-value {
    background: #f1f4fb !important;
    background-color: #f1f4fb !important;
    border: 1px solid #c9d2e3 !important;
    border-radius: 10px !important;
    color: #364a63 !important;
    padding: 6px 14px !important;
    border-bottom: 1px solid #c9d2e3 !important;
    border-bottom-style: solid !important;
}

.order-info-header .order-info-value.assignee-value:hover,
.order-info-header .assignee-value.header-assignee-clickable:hover,
.order-info-item.assignee .order-info-value.assignee-value:hover,
a.order-info-value.assignee-value.header-assignee-clickable:hover,
.order-info-header a.order-info-value.assignee-value:hover,
.order-info-header a.assignee-value:hover {
    background: #e5ebf7 !important;
    background-color: #e5ebf7 !important;
    border-color: #b8c6dd !important;
    border-bottom-color: #b8c6dd !important;
}

/* Override all inline style attributes that might change colors */
.order-info-header a[style*="background"]:has(.fa-circle),
.order-info-header a[style*="rgb(240, 249, 247)"] {
    background: #f1f4fb !important;
    background-color: #f1f4fb !important;
}

.order-info-header a[style*="rgb(0, 192, 239)"] {
    color: #364a63 !important;
}

.order-info-separator {
    width: 1px;
    height: 48px;
    background: #e5e9f2;
    flex-shrink: 0;
    margin: 0 1px;
    align-self: center;
}

/* Hide duplicate statuseditor info section display, but keep the container for functionality */
.control-statuseditor .d-flex {
    display: none !important;
}

/* Hide Send Invoice button from toolbar ONLY - be very specific */
.toolbar .btn-send-invoice,
.toolbar a.btn-send-invoice,
.toolbar-action .btn-send-invoice,
.toolbar-action a.btn-send-invoice,
.toolbar .toolbar-action .btn-send-invoice,
.toolbar .toolbar-action a.btn-send-invoice,
body .toolbar .btn-send-invoice,
body .toolbar a.btn-send-invoice,
body .toolbar-action .btn-send-invoice,
body .toolbar-action a.btn-send-invoice,
div.toolbar .btn-send-invoice,
div.toolbar a.btn-send-invoice,
div.toolbar-action .btn-send-invoice,
div.toolbar-action a.btn-send-invoice {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    left: -9999px !important;
}


/* Responsive Design for Header - All Device Sizes */

/* Large tablets and smaller desktops */
@media (max-width: 1400px) {
    .order-info-header {
        gap: 12px;
        padding: 10px 16px;
    }
    
    .order-info-item {
        min-width: auto;
    }
    
    .order-info-value {
        font-size: 15px;
    }
    
    .order-info-label {
        font-size: 12px;
    }
}

/* Medium tablets */
@media (max-width: 1200px) {
    .order-info-header {
        gap: 10px;
        padding: 10px 14px;
        flex-wrap: wrap;
    }
    
    .order-info-item {
        min-width: auto;
        flex: 0 0 calc(33.333% - 10px);
    }
    
    .order-info-item.invoice,
    .order-info-item.send-invoice,
    .order-info-item.note {
        flex: 0 0 calc(33.333% - 10px);
        min-width: 100px;
    }
    
    .order-info-value {
        font-size: 14px;
    }
    
    .order-info-label {
        font-size: 11px;
    }
    
    .order-info-separator {
        display: none;
    }
}

/* Small tablets */
@media (max-width: 992px) {
    .order-info-header {
        gap: 8px;
        padding: 10px 12px;
        min-height: auto;
    }
    
    .order-info-item {
        flex: 0 0 calc(50% - 6px);
        min-width: 0;
    }
    
    .order-info-item.table-number,
    .order-info-item.order-id {
        flex: 0 0 calc(50% - 6px);
    }
    
    .order-info-item.date-time {
        flex: 0 0 calc(50% - 6px);
    }
    
    .order-info-item.status,
    .order-info-item.assignee {
        flex: 0 0 calc(50% - 6px);
    }
    
    .order-info-item.invoice-combined {
        flex: 0 0 calc(50% - 6px);
        min-width: 120px;
    }
    
    .order-info-item.invoice,
    .order-info-item.send-invoice,
    .order-info-item.note {
        flex: 0 0 calc(50% - 6px);
        min-width: 90px;
    }
    
    .order-info-value {
        font-size: 13px;
    }
    
    .order-info-label {
        font-size: 10px;
    }
    
    .send-invoice-icon-btn,
    .invoice-icon-btn,
    .note-icon-btn {
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        min-height: 36px !important;
        max-width: 36px !important;
        max-height: 36px !important;
    }
    
    .invoice-buttons-container {
        gap: 12px;
    }
}

/* Mobile devices */
@media (max-width: 768px) {
    .order-info-header {
        gap: 6px;
        padding: 8px 10px;
        margin-top: -20px !important;
        flex-wrap: wrap !important;
        display: flex !important;
    }
    
    /* Show all items in a compact grid - 2 items per row */
    .order-info-item {
        flex: 0 0 calc(50% - 3px) !important;
        min-width: 0;
        margin-bottom: 6px;
        padding: 4px 0;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: flex-start !important;
    }
    
    /* Combined invoice item */
    .order-info-item.invoice-combined {
        flex: 0 0 calc(50% - 3px) !important;
        min-width: 120px;
    }
    
    /* Smaller items (invoice, send invoice, note) - 2 per row */
    .order-info-item.invoice,
    .order-info-item.send-invoice,
    .order-info-item.note {
        flex: 0 0 calc(50% - 3px) !important;
        min-width: 0;
    }
    
    /* Table, Order ID - first row */
    .order-info-item.table-number,
    .order-info-item.order-id {
        flex: 0 0 calc(50% - 3px) !important;
    }
    
    /* Date/Time, Status - second row */
    .order-info-item.date-time,
    .order-info-item.status {
        flex: 0 0 calc(50% - 3px) !important;
    }
    
    /* Assignee, Invoice - third row */
    .order-info-item.assignee,
    .order-info-item.invoice-combined {
        flex: 0 0 calc(50% - 3px) !important;
    }
    
    .order-info-item:last-child {
        margin-bottom: 6px;
    }
    
    .order-info-separator {
        display: none !important;
    }
    
    .order-info-value {
        font-size: 12px !important;
        text-align: center !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
    }
    
    .order-info-label {
        font-size: 9px !important;
        margin-bottom: 3px !important;
        text-align: center !important;
        white-space: nowrap !important;
    }
    
    .send-invoice-icon-btn,
    .invoice-icon-btn,
    .note-icon-btn {
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        min-height: 36px !important;
        max-width: 36px !important;
        max-height: 36px !important;
        margin-top: 0 !important;
    }
    
    .invoice-buttons-container {
        gap: 12px;
    }
    
    .send-invoice-icon-btn i,
    .invoice-icon-btn i,
    .note-icon-btn i {
        font-size: 16px !important;
    }
    
    /* Remove borders - cleaner look */
    .order-info-item {
        border-bottom: none !important;
        padding-bottom: 4px !important;
    }
    
    /* Make status badge smaller on mobile */
    .order-info-item.status .order-info-value {
        font-size: 11px !important;
        padding: 3px 8px !important;
    }
    
    /* Make assignee smaller on mobile */
    .order-info-item.assignee .order-info-value {
        font-size: 11px !important;
    }
}

/* Small mobile devices */
@media (max-width: 480px) {
    .order-info-header {
        padding: 6px 8px;
        margin-top: -15px !important;
        gap: 4px !important;
    }
    
    /* Ensure all items are visible - 2 per row */
    .order-info-item {
        flex: 0 0 calc(50% - 2px) !important;
        margin-bottom: 4px;
        padding: 3px 0;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
    }
    
    .order-info-value {
        font-size: 11px !important;
        text-align: center !important;
    }
    
    .order-info-label {
        font-size: 8px !important;
        margin-bottom: 2px !important;
    }
    
    .send-invoice-icon-btn,
    .invoice-icon-btn,
    .note-icon-btn {
        width: 32px !important;
        height: 32px !important;
        min-width: 32px !important;
        min-height: 32px !important;
        max-width: 32px !important;
        max-height: 32px !important;
        margin-top: 0 !important;
    }
    
    .invoice-buttons-container {
        gap: 12px;
    }
    
    .send-invoice-icon-btn i,
    .invoice-icon-btn i,
    .note-icon-btn i {
        font-size: 14px !important;
    }
    
    /* Smaller status badge */
    .order-info-item.status .order-info-value {
        font-size: 10px !important;
        padding: 2px 6px !important;
    }
    
    /* Smaller assignee text */
    .order-info-item.assignee .order-info-value {
        font-size: 10px !important;
    }
}
</style>

<div class="order-info-header">
    <!-- Table Number -->
    <div class="order-info-item table-number">
        <label class="order-info-label">Table</label>
        <div class="order-info-value">{{ $formModel->order_type_name ?: 'N/A' }}</div>
    </div>
    
    <div class="order-info-separator"></div>
    
    <!-- Order ID -->
    <div class="order-info-item order-id">
        <label class="order-info-label">Order ID</label>
        <div class="order-info-value order-id-value">#{{ $formModel->order_id }}</div>
    </div>
    
    <div class="order-info-separator"></div>
    
    <!-- Date/Time -->
    <div class="order-info-item date-time">
        <label class="order-info-label">Date & Time</label>
        <div class="order-info-value">
            {{ $formModel->order_date_time->isoFormat(lang('system::lang.moment.date_time_format_short')) }}
            @if ($formModel->order_time_is_asap)
                <span style="font-size: 12px; color: #08815e; font-weight: 600;">(ASAP)</span>
            @endif
        </div>
    </div>
    
    <div class="order-info-separator"></div>
    
    <!-- Status - Clickable -->
    <div class="order-info-item status">
        <label class="order-info-label">Status</label>
        <a
            class="order-info-value status-value header-status-clickable"
            role="button"
            data-editor-control="load-status"
            data-status-color="{{ $formModel->status && $formModel->status->status_color ? $formModel->status->status_color : '#364a63' }}"
            style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 6px 4px; background: #f1f4fb; border-radius: 10px; border: 1px solid #c9d2e3; color: #364a63; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;"
        >
            @if($formModel->status)
                <i class="fa fa-circle status-dot-icon" style="font-size: 8px; color: {{ $formModel->status->status_color ?? '#364a63' }} !important;"></i>
                {{ $formModel->status->status_name }}
            @else
                <span style="color: #8094ae;">--</span>
            @endif
        </a>
    </div>
    
    <div class="order-info-separator"></div>
    
    <!-- Assignee - Clickable -->
    <div class="order-info-item assignee">
        <label class="order-info-label">Assignee</label>
        <a
            class="order-info-value assignee-value header-assignee-clickable"
            role="button"
            data-editor-control="load-assignee"
            style="text-decoration: none; color: #526484; font-style: italic; cursor: pointer; transition: all 0.2s ease; border-bottom: 2px dashed transparent; padding: 4px 0; display: block;"
        >
            @if($formModel->assignee)
                {{ $formModel->assignee->staff_name }}
            @else
                <span style="color: #8094ae;">--</span>
            @endif
        </a>
    </div>
    
    @if($formModel->hasInvoice())
        <div class="order-info-separator"></div>
        
        <!-- Invoice - Combined card with both buttons -->
        <div class="order-info-item invoice-combined">
            <label class="order-info-label">Invoice</label>
            <div class="invoice-buttons-container">
            <a
                class="invoice-icon-btn"
                href="{{ admin_url('orders/invoice/'.$formModel->order_id) }}"
                target="_blank"
                title="View Invoice"
            >
                <i class="fa fa-file-text"></i>
            </a>
            <a
                class="send-invoice-icon-btn"
                role="button"
                data-request="onSendInvoiceEmail"
                data-request-confirm="Send invoice to customer email?"
                data-progress-indicator="Sending invoice..."
                title="Send Invoice via Email"
            >
                <i class="fa fa-envelope"></i>
            </a>
            </div>
        </div>
    @endif
    
    <div class="order-info-separator"></div>
    
    <!-- Note - Add staff note button -->
    <div class="order-info-item note">
        <label class="order-info-label">Note</label>
        <div class="note-button-container">
            <a
                class="note-icon-btn"
                role="button"
                href="#addOrderNoteModal"
                data-bs-toggle="modal"
                data-bs-target="#addOrderNoteModal"
                title="Add Staff Note"
                onclick="event.preventDefault(); $('#addOrderNoteModal').modal('show'); return false;"
            >
                <i class="fa fa-sticky-note"></i>
            </a>
        </div>
    </div>
</div>

<script>
// Wire up click handlers for Status and Assignee in the header
(function() {
    function initHeaderClickHandlers() {
        var $ = window.jQuery || window.$;
        if (!$) {
            setTimeout(initHeaderClickHandlers, 100);
            return;
        }
        
        // Find the statuseditor widget
        var $statusEditor = $('[data-control="status-editor"]');
        if (!$statusEditor.length) {
            setTimeout(initHeaderClickHandlers, 200);
            return;
        }
        
        // Get the statuseditor instance
        var statusEditorInstance = $statusEditor.data('ti.statusEditor');
        if (!statusEditorInstance) {
            setTimeout(initHeaderClickHandlers, 200);
            return;
        }
        
        // Handle Status click
        $('.header-status-clickable').off('click.header-status').on('click.header-status', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Create a fake event object that mimics what statuseditor expects
            var fakeEvent = {
                currentTarget: this,
                preventDefault: function() {},
                stopPropagation: function() {}
            };
            
            // Trigger the statuseditor's onControlClick method
            statusEditorInstance.onControlClick(fakeEvent);
        });
        
        // Handle Assignee click
        $('.header-assignee-clickable').off('click.header-assignee').on('click.header-assignee', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Create a fake event object that mimics what statuseditor expects
            var fakeEvent = {
                currentTarget: this,
                preventDefault: function() {},
                stopPropagation: function() {}
            };
            
            // Trigger the statuseditor's onControlClick method
            statusEditorInstance.onControlClick(fakeEvent);
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeaderClickHandlers);
    } else {
        initHeaderClickHandlers();
    }
    
    // Also try after delays to ensure statuseditor is initialized
    setTimeout(initHeaderClickHandlers, 500);
    setTimeout(initHeaderClickHandlers, 1000);
    
    // Re-initialize after AJAX updates
    $(document).on('ajaxUpdateComplete', function() {
        setTimeout(initHeaderClickHandlers, 200);
    });
    
    // Fix Invoice buttons icon centering - Remove inline styles that interfere
    function fixInvoiceButtonsIconCentering() {
        var $ = window.jQuery || window.$;
        if (!$) {
            setTimeout(fixInvoiceButtonsIconCentering, 100);
            return;
        }
        
        // Fix both invoice and send invoice icon buttons, plus note button
        $('.invoice-icon-btn i, .send-invoice-icon-btn i, .note-icon-btn i').each(function() {
            var $icon = $(this);
            var currentStyle = $icon.attr('style') || '';
            
            // Remove margin-related styles from inline style attribute
            currentStyle = currentStyle.replace(/margin[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-right[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-left[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-top[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-bottom[^;]*;?/gi, '');
            
            // Clean up any double semicolons
            currentStyle = currentStyle.replace(/;;+/g, ';').replace(/^;|;$/g, '');
            
            // Update or remove style attribute
            if (currentStyle.trim()) {
                $icon.attr('style', currentStyle);
            } else {
                $icon.removeAttr('style');
            }
            
            // Force our CSS values - Center icon in button
            $icon.css({
                'margin': '0',
                'margin-left': '0',
                'margin-right': '0',
                'margin-top': '0',
                'margin-bottom': '0',
                'position': 'relative',
                'top': '0'
            });
        });
        
        // Ensure both buttons are centered and perfect square (same size), plus note button
        $('.invoice-icon-btn, .send-invoice-icon-btn, .note-icon-btn').css({
            'display': 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            'width': '40px',
            'height': '40px',
            'min-width': '40px',
            'min-height': '40px',
            'max-width': '40px',
            'max-height': '40px',
            'aspect-ratio': '1 / 1',
            'box-sizing': 'border-box',
            'margin': '0',
            'margin-top': '0',
            'transform': 'translateY(0)',
            'padding': '0',
            'vertical-align': 'middle'
        });
        
        // Specifically ensure send invoice icon and note icon are centered
        $('.send-invoice-icon-btn, .note-icon-btn').each(function() {
            var $btn = $(this);
            var $icon = $btn.find('i');
            if ($icon.length) {
                // Force center alignment - ensure icon fills button and is centered
                $icon.css({
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'margin': '0',
                    'top': '0',
                    'vertical-align': 'middle',
                    'line-height': '1',
                    'height': '100%',
                    'width': '100%'
                });
                
                // Ensure button itself is properly set up for centering
                $btn.css({
                    'display': 'inline-flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'vertical-align': 'middle'
                });
            }
        });
    }
    
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixInvoiceButtonsIconCentering);
    } else {
        fixInvoiceButtonsIconCentering();
    }
    
    // Also run after delays to catch dynamically added elements
    setTimeout(fixInvoiceButtonsIconCentering, 300);
    setTimeout(fixInvoiceButtonsIconCentering, 800);
    
    // Re-run after AJAX updates
    $(document).on('ajaxUpdateComplete', function() {
        setTimeout(fixInvoiceButtonsIconCentering, 200);
    });
    
    // Fix Invoice icon centering - Remove inline styles that interfere
    function fixInvoiceIconCentering() {
        var $ = window.jQuery || window.$;
        if (!$) {
            setTimeout(fixInvoiceIconCentering, 100);
            return;
        }
        
        $('.invoice-icon-btn i').each(function() {
            var $icon = $(this);
            var currentStyle = $icon.attr('style') || '';
            
            // Remove margin-related styles from inline style attribute
            currentStyle = currentStyle.replace(/margin[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-right[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-left[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-top[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-bottom[^;]*;?/gi, '');
            
            // Clean up any double semicolons
            currentStyle = currentStyle.replace(/;;+/g, ';').replace(/^;|;$/g, '');
            
            // Update or remove style attribute
            if (currentStyle.trim()) {
                $icon.attr('style', currentStyle);
            } else {
                $icon.removeAttr('style');
            }
            
            // Force our CSS values - Center icon in button
            $icon.css({
                'margin': '0',
                'margin-left': '0',
                'margin-right': '0',
                'margin-top': '0',
                'margin-bottom': '0',
                'position': 'relative',
                'top': '0'
            });
        });
        
        // Ensure button is centered and perfect square
        $('.invoice-icon-btn').css({
            'display': 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            'width': '40px',
            'height': '40px',
            'min-width': '40px',
            'min-height': '40px',
            'max-width': '40px',
            'max-height': '40px',
            'aspect-ratio': '1 / 1',
            'box-sizing': 'border-box',
            'margin': '2px auto 0 auto',
            'margin-top': '2px',
            'transform': 'translateY(0)',
            'padding': '0'
        });
    }
    
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixInvoiceIconCentering);
    } else {
        fixInvoiceIconCentering();
    }
    
    // Also run after delays to catch dynamically added elements
    setTimeout(fixInvoiceIconCentering, 300);
    setTimeout(fixInvoiceIconCentering, 800);
    
    // Re-run after AJAX updates
    $(document).on('ajaxUpdateComplete', function() {
        setTimeout(fixInvoiceIconCentering, 200);
    });
    
    // Force STATUS and ASSIGNEE buttons to match invoice button colors exactly
    function forceStatusAssigneeIceWhite() {
        var $ = window.jQuery || window.$;
        if (!$) {
            setTimeout(forceStatusAssigneeIceWhite, 100);
            return;
        }
        
        // Fix STATUS button colors
        $('.order-info-value.status-value, .status-value.header-status-clickable, a.status-value').each(function() {
            var $btn = $(this);
            $btn.css({
                'background': '#f1f4fb',
                'background-color': '#f1f4fb',
                'border': '1px solid #c9d2e3',
                'border-bottom': '1px solid #c9d2e3',
                'border-radius': '10px',
                'color': '#364a63',
                'padding': '6px 4px'
            });
            
            // Remove any inline styles that override colors
            var currentStyle = $btn.attr('style') || '';
            currentStyle = currentStyle.replace(/background[^;]*rgb\([^)]*\)[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/background-color[^;]*rgb\([^)]*\)[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/border[^;]*rgb\([^)]*\)[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/color[^;]*rgb\([^)]*\)[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/border-bottom[^;]*dashed[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/;;+/g, ';').replace(/^;|;$/g, '');
            
            if (currentStyle.trim()) {
                $btn.attr('style', currentStyle);
            }
            
            // Force colors with setProperty
            if ($btn[0]) {
                $btn[0].style.setProperty('background', '#f1f4fb', 'important');
                $btn[0].style.setProperty('background-color', '#f1f4fb', 'important');
                $btn[0].style.setProperty('border', '1px solid #c9d2e3', 'important');
                $btn[0].style.setProperty('border-bottom', '1px solid #c9d2e3', 'important');
                $btn[0].style.setProperty('border-radius', '10px', 'important');
                $btn[0].style.setProperty('color', '#364a63', 'important');
                // Set smaller horizontal padding for STATUS button
                if ($btn.hasClass('status-value')) {
                    $btn[0].style.setProperty('padding', '6px 4px', 'important');
                }
            }
            
            // Apply status color to dot icon
            var $dotIcon = $btn.find('i.fa-circle, i.status-dot-icon');
            if ($dotIcon.length) {
                // Get status color from data attribute
                var statusColor = $btn.data('status-color') || $btn.attr('data-status-color');
                if (statusColor) {
                    // Apply status color to dot icon with !important
                    $dotIcon[0].style.setProperty('color', statusColor, 'important');
                    $dotIcon.css('color', statusColor + ' !important');
                }
            }
        });
        
        // Fix ASSIGNEE button colors
        $('.order-info-value.assignee-value, .assignee-value.header-assignee-clickable, a.assignee-value').each(function() {
            var $btn = $(this);
            $btn.css({
                'background': '#f1f4fb',
                'background-color': '#f1f4fb',
                'border': '1px solid #c9d2e3',
                'border-bottom': '1px solid #c9d2e3',
                'border-radius': '10px',
                'color': '#364a63'
            });
            
            // Remove any inline styles that override colors
            var currentStyle = $btn.attr('style') || '';
            currentStyle = currentStyle.replace(/background[^;]*rgb\([^)]*\)[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/background-color[^;]*rgb\([^)]*\)[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/border[^;]*rgb\([^)]*\)[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/color[^;]*rgb\([^)]*\)[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/border-bottom[^;]*dashed[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/;;+/g, ';').replace(/^;|;$/g, '');
            
            if (currentStyle.trim()) {
                $btn.attr('style', currentStyle);
            }
            
            // Force colors with setProperty
            if ($btn[0]) {
                $btn[0].style.setProperty('background', '#f1f4fb', 'important');
                $btn[0].style.setProperty('background-color', '#f1f4fb', 'important');
                $btn[0].style.setProperty('border', '1px solid #c9d2e3', 'important');
                $btn[0].style.setProperty('border-bottom', '1px solid #c9d2e3', 'important');
                $btn[0].style.setProperty('border-radius', '10px', 'important');
                $btn[0].style.setProperty('color', '#364a63', 'important');
            }
        });
    }
    
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceStatusAssigneeIceWhite);
    } else {
        forceStatusAssigneeIceWhite();
    }
    
    // Also run after delays
    setTimeout(forceStatusAssigneeIceWhite, 100);
    setTimeout(forceStatusAssigneeIceWhite, 500);
    setTimeout(forceStatusAssigneeIceWhite, 1000);
    
    // Re-run after AJAX updates
    $(document).on('ajaxUpdateComplete', function() {
        setTimeout(forceStatusAssigneeIceWhite, 200);
    });
})();
</script>

<!-- Add Order Note Modal -->
<div class="modal fade" id="addOrderNoteModal" tabindex="-1" role="dialog" aria-labelledby="addOrderNoteModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="addOrderNoteModalLabel">
                    <i class="fa fa-sticky-note"></i> Add Staff Note
                </h5>
                <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close" onclick="$('#addOrderNoteModal').modal('hide');">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <form id="addOrderNoteForm" onsubmit="return false;">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="orderNoteText">Note <span class="text-danger">*</span></label>
                        <textarea 
                            class="form-control" 
                            id="orderNoteText" 
                            name="note" 
                            rows="4" 
                            required 
                            placeholder="Enter your note here..."
                        ></textarea>
                        <small class="form-text text-muted">
                            This note will be visible in the Note History tab and in push notifications.
                        </small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="$('#addOrderNoteModal').modal('hide');">Cancel</button>
                    <button 
                        type="button" 
                        id="orderNoteSubmitBtn"
                        class="btn btn-primary"
                        data-request="onAddOrderNote"
                        data-request-success="onOrderNoteAdded()"
                        data-progress-indicator="Saving note..."
                    >
                        <i class="fa fa-save"></i> Save Note
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
// Initialize note button click handler
(function() {
    function initNoteButton() {
        var $ = window.jQuery || window.$;
        if (!$) {
            setTimeout(initNoteButton, 100);
            return;
        }
        
        // Handle note button click
        $(document).off('click', '.note-icon-btn').on('click', '.note-icon-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            var $modal = $('#addOrderNoteModal');
            if ($modal.length) {
                $modal.modal('show');
            } else {
                console.error('Note modal not found!');
            }
        });
        
        // Initialize modal properly
        $('#addOrderNoteModal').on('shown.bs.modal', function() {
            $('#orderNoteText').focus();
        });
        
        // Clear form when modal is hidden
        $('#addOrderNoteModal').on('hidden.bs.modal', function() {
            $('#orderNoteText').val('');
        });
        
        // Handle save note button click - ensure it works with data-request
        $('#orderNoteSubmitBtn').off('click.saveNote').on('click.saveNote', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            var $btn = $(this);
            var noteText = $('#orderNoteText').val().trim();
            
            if (!noteText) {
                alert('Please enter a note');
                $('#orderNoteText').focus();
                return false;
            }
            
            // Set the note value in the form so it gets submitted
            $('#addOrderNoteForm').append('<input type="hidden" name="note" value="' + noteText.replace(/"/g, '&quot;') + '">');
            
            // Trigger the AJAX request using TastyIgniter's system
            if (window.$ && $.request) {
                $.request('onAddOrderNote', {
                    form: '#addOrderNoteForm',
                    data: {note: noteText},
                    success: function(data) {
                        // Remove the temporary hidden input
                        $('#addOrderNoteForm input[name="note"][type="hidden"]').remove();
                        onOrderNoteAdded();
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        // Remove the temporary hidden input
                        $('#addOrderNoteForm input[name="note"][type="hidden"]').remove();
                        console.error('Error saving note:', errorThrown);
                        alert('Failed to save note. Please try again.');
                    }
                });
            } else {
                alert('AJAX request system not available');
            }
            
            return false;
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNoteButton);
    } else {
        initNoteButton();
    }
    
    // Also try after delays
    setTimeout(initNoteButton, 500);
    setTimeout(initNoteButton, 1000);
    
    // Re-initialize after AJAX updates
    $(document).on('ajaxUpdateComplete', function() {
        setTimeout(initNoteButton, 200);
    });
})();

// Handle order note added successfully
function onOrderNoteAdded() {
    var $ = window.jQuery || window.$;
    if ($) {
        // Close modal
        $('#addOrderNoteModal').modal('hide');
        
        // Clear form
        $('#orderNoteText').val('');
        
        // Show success message
        if (window.oc && window.oc.flashMsg) {
            window.oc.flashMsg({
                text: 'Note added successfully!',
                class: 'success',
                interval: 3
            });
        }
        
        // Reload the page to show updated note count
        setTimeout(function() {
            window.location.reload();
        }, 500);
    }
}
</script>

<style>
/* Modal styling */
#addOrderNoteModal .modal-dialog {
    max-width: 600px;
}

#addOrderNoteModal .modal-header {
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    border-bottom: 2px solid #e5e9f2;
}

#addOrderNoteModal .modal-title {
    color: #364a63;
    font-weight: 600;
}

#addOrderNoteModal .modal-title i {
    color: #08815e;
    margin-right: 8px;
}

#addOrderNoteModal textarea {
    border: 2px solid #e5e9f2;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s ease;
}

#addOrderNoteModal textarea:focus {
    border-color: #08815e;
    box-shadow: 0 0 0 0.2rem rgba(8, 129, 94, 0.1);
}

#addOrderNoteModal .btn-primary {
    background: #08815e;
    border-color: #08815e;
}

#addOrderNoteModal .btn-primary:hover {
    background: #06654a;
    border-color: #06654a;
}
</style>
