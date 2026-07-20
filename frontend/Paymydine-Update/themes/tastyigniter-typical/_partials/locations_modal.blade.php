<!-- Modal locations-->
<div class="modal fade" id="locationsModal" tabindex="-1" aria-labelledby="locationsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-fullscreen-md-down">
        <div class="modal-content">
            <div class="modal-header border-bottom-0 d-flex align-items-end">
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-5">
                <h2 class="modal-title text-center">@lang('admin::lang.text_all_locations'):</h2>
                @partial('localList::checkoutlist')
            </div>
        </div>
    </div>
</div>