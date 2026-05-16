@php
$details = is_array($record->details) ? $record->details : ['preview' => $record->details, 'is_truncated' => false];
@endphp
<div class="details-cell">
  <div class="details-preview">{{ $details['preview'] }}</div>
  @if(!empty($details['is_truncated']))
  <button type="button" class="btn btn-link btn-sm see-more-btn" onclick="event.preventDefault(); event.stopPropagation(); var modal = document.getElementById('detailsModal{{ $record->id }}'); modal.classList.add('show'); modal.style.display='block'; document.body.classList.add('modal-open'); var backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop fade show'; backdrop.id = 'backdrop{{ $record->id }}'; backdrop.onclick = function() { modal.classList.remove('show'); modal.style.display='none'; document.body.classList.remove('modal-open'); backdrop.remove(); }; document.body.appendChild(backdrop); return false;">See more</button>
  @endif
</div>

<div class="modal fade" id="detailsModal{{ $record->id }}" tabindex="-1" onclick="if(event.target === this) { this.classList.remove('show'); this.style.display='none'; document.body.classList.remove('modal-open'); var backdrop = document.getElementById('backdrop{{ $record->id }}'); if(backdrop) backdrop.remove(); }" style="background: rgba(0,0,0,0.5) !important;">
  <div class="modal-dialog modal-xl" style="max-width: 90% !important; margin: 1.75rem auto !important;">
    <div class="modal-content" style="background: white !important; border: none !important;">
      <div class="modal-header" style="background: #202938 !important; background-color: #202938 !important; color: #ffffff !important; border-bottom: none !important; padding: 1rem 1.5rem !important;">
        <h5 class="modal-title" style="color: #ffffff !important;">{{ ucfirst($details['metadata']['type'] ?? 'Notification') }} — {{ $details['metadata']['table'] ?? 'N/A' }}</h5>
        <button type="button" class="btn-close btn-close-white" style="filter: invert(1) brightness(2) !important;" onclick="var modal = document.getElementById('detailsModal{{ $record->id }}'); modal.classList.remove('show'); modal.style.display='none'; document.body.classList.remove('modal-open'); var backdrop = document.getElementById('backdrop{{ $record->id }}'); if(backdrop) backdrop.remove();"></button>
      </div>
      <div class="modal-body" style="padding: 2rem; font-size: 1rem; line-height: 1.6;">
        <pre class="details-full-text" style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; background: none; border: none; padding: 0; margin: 0;">{{ $details['full'] }}</pre>
      </div>
    </div>
  </div>
</div>