@foreach ($records ?? [] as $theme)
    @unless ($theme->getTheme())
        {!! $this->makePartial('lists/not_found', ['theme' => $theme]) !!}
    @else
        <div class="row mb-3">
            <div class="d-flex align-items-center bg-light p-4 w-100">
                @if ($theme->getTheme()->hasParent())
                    {!! $this->makePartial('lists/child_theme', ['theme' => $theme]) !!}
                @else
                    <a
                        class="media-left mr-4 preview-thumb"
                        data-bs-toggle="modal"
                        data-bs-target="#theme-preview-{{ $theme->code }}"
                        data-img-src="{{ URL::asset($theme->screenshot) }}"
                        style="width:200px;">
                        <img
                            class="img-responsive img-rounded"
                            alt=""
                            src="{{ URL::asset($theme->screenshot) }}"
                        />
                    </a>
                    <div class="media-body">
                        <span class="h5 media-heading">{{ $theme->name }}</span>&nbsp;&nbsp;
                        @if ($theme->code === 'frontend-theme')
                            <span class="small text-dark">
                                PayMyDine guest experience theme · Version {{ $theme->version }} · Crafted by the PayMyDine web team
                            </span>
                        @else
                            <span class="small text-muted">
                                {{ $theme->code }}&nbsp;-&nbsp;
                                {{ $theme->version }}
                                @lang('system::lang.themes.text_author')
                                <b>{{ $theme->author }}</b>
                            </span>
                        @endif
                        @unless ($theme->getTheme()->hasParent())
                            @if ($theme->code === 'frontend-theme')
                                <p class="description text-dark mt-3">
                                    A polished PayMyDine storefront that’s ready for launch. Personalise the colours, imagery, and layout directly from the admin panel—no extra setup required.
                                </p>
                            @else
                                <p class="description text-muted mt-3">{{ $theme->description }}</p>
                            @endif
                        @endunless
                        <div class="list-action list-action--flex align-self-end my-3">
                            {!! $this->makePartial('lists/list_buttons', ['theme' => $theme]) !!}
                        </div>
                    </div>
                @endif
            </div>
            @if (strlen($theme->screenshot))
                {!! $this->makePartial('lists/screenshot', ['theme' => $theme]) !!}
            @endif
        </div>
    @endunless
@endforeach
