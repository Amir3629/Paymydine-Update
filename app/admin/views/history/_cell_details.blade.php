@php
$details = is_array($record->details) ? $record->details : ['preview' => $record->details, 'is_truncated' => false];
@endphp
<div class="details-cell">
  <div class="details-preview">{{ $details['preview'] }}</div>
  @if(!empty($details['is_truncated']))
  <button class="btn btn-link btn-sm see-more-btn" data-bs-toggle="modal" data-bs-target="#detailsModal{{ $record->id }}">See more</button>
  @endif
</div>

<div class="modal fade" id="detailsModal{{ $record->id }}" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">{{ ucfirst($details['metadata']['type'] ?? 'Notification') }} — {{ $details['metadata']['table'] ?? 'N/A' }}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <pre class="details-full-text">{{ $details['full'] }}</pre>
      </div>
    </div>
  </div>
</div>