<div class="d-inline-block mb-4 justify-content-center col-sm-6">
    @foreach ($listSorting as $key => $sorting)
        <a
            class="btn bg-white rounded-pill text-primary shadow-sm px-3 me-3 mb-2 text-decoration-none{{ $key == $activeSortBy ? ' border-primary active' : '' }}"
            href="{{ $sorting['href'] }}"
        >{{ $sorting['name'] }}</a>
    @endforeach
</div>
