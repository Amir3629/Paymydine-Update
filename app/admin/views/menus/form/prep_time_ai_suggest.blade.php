<div class="help-block" style="margin-top:6px;">
  <button type="button" class="btn btn-xs btn-default" id="pmd-ai-prep-btn">AI suggest prep time</button>
  <span id="pmd-ai-prep-msg" style="margin-left:8px;"></span>
</div>
<script>
(function(){var b=document.getElementById('pmd-ai-prep-btn'); if(!b||b.dataset.wired)return; b.dataset.wired='1';
b.addEventListener('click',function(){var n=document.querySelector('[name="Menu[menu_name]"]')?.value||'';var d=document.querySelector('[name="Menu[menu_description]"]')?.value||'';var c='';
window.jQuery.request('onSuggestPrepTimeAi',{data:{menu_name:n,category:c,description:d},success:function(r){var m=document.getElementById('pmd-ai-prep-msg'); if(r&&r.prep_time_minutes){var f=document.querySelector('[name="Menu[prep_time_minutes]"]'); if(f){f.value=r.prep_time_minutes; window.jQuery(f).trigger('change');} m.textContent='Suggested: '+r.prep_time_minutes+' min';}else{m.textContent=(r&&r.message)||'Unavailable';}}});});})();
</script>