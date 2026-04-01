<div class="media-finder">
    <div class="grid">
        @if ($this->previewMode)
            <a>
                <div class="img-cover">
                    <img src="{{ $this->getMediaThumb($mediaItem) }}" class="img-responsive">
                </div>
            </a>
        @else
            @if (is_null($mediaItem))
                <a class="find-button blank-cover">
                    <i class="fa fa-plus"></i>
                </a>
            @else
                <i class="find-remove-button fa fa-times-circle" title="@lang('admin::lang.text_remove')"></i>
                <a class="{{ $useAttachment ? 'find-config-button' : '' }}" data-media-finder-cover>
                    <div class="img-cover">
                        {{-- Always include both img and media-icon: server populates src when we have media, JS populates when selecting new --}}
                        @php $mediaFileType = $this->getMediaFileType($mediaItem); @endphp
                        <img
                            data-find-image
                            src="{{ $mediaFileType === 'image' ? $this->getMediaThumb($mediaItem) : '' }}"
                            class="img-responsive"
                            alt=""
                            style="display: {{ $mediaFileType === 'image' ? 'block' : 'none' }};"
                        />
                        <div class="media-icon" style="display: {{ $mediaFileType === 'image' ? 'none' : 'block' }};">
                            <i
                                data-find-file
                                class="fa fa-{{ $mediaFileType }} fa-3x text-muted mb-2"
                            ></i>
                        </div>
                    </div>
                </a>
            @endif
            <input
                type="hidden"
                {!! (!is_null($mediaItem) && !$useAttachment) ? 'name="'.$fieldName.'"' : '' !!}
                value="{{ $this->getMediaPath($mediaItem) }}"
                data-find-value
            />
            <input
                type="hidden"
                value="{{ $this->getMediaIdentifier($mediaItem) }}"
                data-find-identifier
            />
        @endif
    </div>
    @if (!is_null($mediaItem))
        <div class="icon-container icon-container-below">
            <span data-find-name data-no-tooltip>{{ $this->getMediaName($mediaItem) }}</span>
        </div>
    @endif
</div>
{{-- PMD FIX: disabled custom dash/loader/session/querystring hooks because they corrupt mediafinder values across logo fields. --}}



