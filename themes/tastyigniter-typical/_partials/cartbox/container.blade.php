<div class="{{ $pageIsCart ?: 'affix-cart d-none d-lg-block' }}">
    <div class="panel panel-cart">
        <div class="panel-body">
            @partial($__SELF__.'::default')
        </div>
    </div>
</div>
@partial($__SELF__.'::mobile')
