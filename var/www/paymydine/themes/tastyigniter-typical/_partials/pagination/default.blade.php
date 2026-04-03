@if ($paginator->hasPages())
    <ul class="pagination-numbers">
        @if ($paginator->onFirstPage())
            <li><span class="pagination-numbers d-none">«</span></li>
        @else
            <li><a class="prev pagination-numbers" href="{{ $paginator->previousPageUrl() }}" rel="prev">
                <i class="poco-icon poco-icon-angle-left"></i>
                <span>PREVIOUS</span>
                </a>
            </li>
        @endif

        @for ($page = 1; $page <= $paginator->lastPage(); $page++)
            @if (is_string($page))
                <li><span class="pagination-numbers disabled">{!! $page !!}</span></li>
            @endif

            @if ($page == $paginator->currentPage())
                <li><span class="pagination-numbers active">{{ $page }}</span></li>
            @else
                <li><a class="pagination-numbers" href="{{ current_url().'?page='.$page }}">{{ $page }}</a>
                </li>
            @endif
        @endfor

        @if ($paginator->hasMorePages())
            <li><a class="next pagination-numbers" href="{{ $paginator->nextPageUrl() }}" rel="next">
            <span>NEXT</span>
            <i class="poco-icon poco-icon-angle-right"></i></a></li>
        @else
            <li><span class="pagination-numbers d-none">NEXT</span></li>
        @endif
    </ul>
@endif