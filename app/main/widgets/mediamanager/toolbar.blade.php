<div class="btn-toolbar" role="toolbar">
    <div class="toolbar-action flex-fill d-lg-flex justify-content-between">
        <div class="toolbar-item pb-3 pb-lg-0">
            <div class="btn-group">
                <span title="@lang('main::lang.media_manager.text_folders')" class="media-toolbar-tooltip-wrap">
                <div
                    class="dropdown mr-2"
                    data-control="folder-tree-dropdown"
                >
                    <button
                        type="button"
                        class="btn btn-default dropdown-toggle"
                        data-bs-toggle="dropdown"
                        aria-label="@lang('main::lang.media_manager.text_folders')"
                    ><i class="fa fa-ellipsis-h"></i></button>
                    <div
                        id="{{ $this->getId('folder-tree') }}"
                        data-control="folder-tree"
                        class="dropdown-menu"
                    >{!! $this->makePartial('mediamanager/folder_tree') !!}</div>
                </div>
                </span>
                <button
                    class="btn btn-default" type="button"
                    data-media-control="refresh"
                    title="@lang('main::lang.media_manager.button_refresh')"
                    aria-label="@lang('main::lang.media_manager.button_refresh')">
                    <i class="fa fa-refresh"></i>
                </button>
            </div>

            <div class="btn-group">
                @if ($this->getSetting('uploads'))
                    <button
                        type="button" class="btn btn-primary media-upload-trigger"
                        data-media-control="upload"
                        title="@lang('main::lang.media_manager.button_upload')"
                        aria-label="@lang('main::lang.media_manager.button_upload')"
                        style="position:relative; overflow:visible;">
                        <i class="fa fa-upload"></i>
                        <input type="file"
                               class="dz-hidden-input media-upload-input"
                               data-media-upload-input="true"
                               multiple="multiple"
                               tabindex="-1"
                               style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0;margin:0;padding:0;border:0;z-index:2;pointer-events:auto;">
                    </button>
                @endif
            </div>

            <div class="btn-group">
                @if ($this->getSetting('new_folder'))
                    <button
                        class="btn btn-default"
                        title="@lang('main::lang.media_manager.text_new_folder')"
                        aria-label="@lang('main::lang.media_manager.text_new_folder')"
                        data-media-control="new-folder"
                        data-swal-title="@lang('main::lang.media_manager.text_folder_name')"
                    ><i class="fa fa-folder"></i></button>
                @endif
                @if ($this->getSetting('rename'))
                    <button
                        class="btn btn-default"
                        title="@lang('main::lang.media_manager.text_rename_folder')"
                        aria-label="@lang('main::lang.media_manager.text_rename_folder')"
                        data-media-control="rename-folder"
                        data-swal-title="@lang('main::lang.media_manager.text_folder_name')"
                    ><i class="fa fa-pencil"></i></button>
                @endif
                @if ($this->getSetting('delete'))
                    <button
                        class="btn btn-danger"
                        title="@lang('main::lang.media_manager.text_delete_folder')"
                        aria-label="@lang('main::lang.media_manager.text_delete_folder')"
                        data-media-control="delete-folder"
                        data-swal-confirm="@lang('admin::lang.alert_warning_confirm')"
                    ><i class="fa fa-trash"></i></button>
                @endif
            </div>

            <div class="input-group">
                <span title="@lang('main::lang.media_manager.text_filter_by')" class="media-toolbar-tooltip-wrap">
                <div class="dropdown mr-2">
                    <a class="btn btn-default dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-label="@lang('main::lang.media_manager.text_filter_by')">
                        <i class="fa fa-filter"></i> <i class="caret"></i>
                    </a>
                    {!! $this->makePartial('mediamanager/filters', ['filterBy', $filterBy]) !!}
                </div>
                </span>

                <span title="@lang('main::lang.media_manager.text_sort_by')" class="media-toolbar-tooltip-wrap">
                <div class="dropdown mr-2">
                    <a class="btn btn-default dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-label="@lang('main::lang.media_manager.text_sort_by')">
                        @if (isset($sortBy[1]) && $sortBy[1] === 'ascending')
                            <i class="fa fa-sort-amount-asc"></i> <i class="caret"></i>
                        @else
                            <i class="fa fa-sort-amount-desc"></i> <i class="caret"></i>
                        @endif
                    </a>
                    {!! $this->makePartial('mediamanager/sorting', ['sortBy', $sortBy]) !!}
                </div>
                </span>

                <span title="@lang('main::lang.media_manager.button_search')" class="media-toolbar-tooltip-wrap">
                {!! $this->makePartial('mediamanager/search') !!}
                </span>
            </div>
        </div>

        <!-- Spacer for 10px gap -->
        <div class="toolbar-spacer" style="width: 10px; flex-shrink: 0;"></div>

        <div class="toolbar-item">
            @if ($isPopup)
                <button
                    type="button"
                    class="btn btn-default"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                    title="Close">
                    <i class="fa fa-times"></i>
                </button>
            @else
                <a
                    class="btn btn-default btn-options"
                    href="{{ admin_url('settings/edit/media') }}"
                    title="@lang('main::lang.media_manager.text_media_settings')"
                    aria-label="@lang('main::lang.media_manager.text_media_settings')">
                    <i class="fa fa-gear"></i>
                </a>
            @endif
        </div>
    </div>
</div>
