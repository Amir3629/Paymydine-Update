<div style="font-size: 13px; line-height: 1.4;">
    <p style="font-weight: 600; color: #364a63; margin-bottom: 6px; font-size: 13px;">{{ $formModel->location->location_name }}</p>
    <div style="font-size: 12px; color: #8094ae; line-height: 1.4;">
        {{ format_address($formModel->location->getAddress()) }}
    </div>
</div>
