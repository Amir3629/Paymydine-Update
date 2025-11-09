<div class="container-fluid pt-4">
    @foreach ($settings as $item => $categories)
        @continue(!count($categories))
        @unless($item == 'core')<h5 class="mb-2 px-3">{{ ucwords($item) }}</h5>@endunless

        <div class="row no-gutters mb-3">
            @foreach ($categories as $key => $category)
                @php
                    $isAboutCard = $category->code === 'about';
                @endphp
                <div class="col-lg-4">
                    <a
                        class="text-reset d-block p-3 h-100 settings-card-link {{ $isAboutCard ? 'settings-card-link--about' : '' }}"
                        href="{{ $category->url }}"
                        role="button"
                    >
                        <div class="card shadow-sm h-100 {{ $isAboutCard ? 'settings-card settings-card--about' : 'bg-light' }}">
                            <div class="card-body d-flex align-items-center {{ $isAboutCard ? 'text-white' : '' }}">
                                <div class="pr-3 flex-shrink-0">
                                    <h5 class="mb-0">
                                        <div class="rounded-circle {{ $isAboutCard ? 'bg-transparent border border-white' : 'bg-light' }} d-flex align-items-center justify-content-center about-card__icon">
                                            @if ($item == 'core' && count(array_get($settingItemErrors, $category->code, [])))
                                                <i
                                                    class="text-danger fa fa-exclamation-triangle fa-fw"
                                                    title="@lang('system::lang.settings.alert_settings_errors')"
                                                ></i>
                                            @elseif ($category->icon)
                                                <i class="{{ $isAboutCard ? 'text-white' : 'text-muted' }} {{ $category->icon }} fa-fw"></i>
                                            @else
                                                <i class="{{ $isAboutCard ? 'text-white' : 'text-muted' }} fa fa-puzzle-piece fa-fw"></i>
                                            @endif
                                        </div>
                                    </h5>
                                </div>
                                <div class="">
                                    <h5 class="mb-1 {{ $isAboutCard ? 'text-white' : '' }}">@lang($category->label)</h5>
                                    <p class="no-margin {{ $isAboutCard ? 'text-white-50' : 'text-muted' }}">{!! $category->description ? lang($category->description) : '' !!}</p>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            @endforeach
        </div>
    @endforeach
</div>

