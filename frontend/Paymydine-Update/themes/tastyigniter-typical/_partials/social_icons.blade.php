<ul class="social-icons list-inline">
    @foreach ($socialIcons = $this->theme->social ?? [] as $icon)
        <li>
            <a
                class="p-2 fs-3 text-decoration-none {{ array_get($icon, 'class') }}"
                target="_blank"
                data-bs-tooltip="tooltip"
                title="{{ array_get($icon, 'title') }}"
                href="{{ array_get($icon, 'url') }}">
            </a>
        </li>
    @endforeach
</ul>
