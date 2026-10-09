/* PMD Restaurant Groups R13 — in-place business scope switcher. */
(function () {
  'use strict';

  var rawPath = window.PMDAdminCanonicalURLR81E && typeof window.PMDAdminCanonicalURLR81E.logicalPath === 'function'
    ? window.PMDAdminCanonicalURLR81E.logicalPath()
    : window.location.pathname;
  var path = String(rawPath || '').replace(/\/+$/, '');
  var dashboard = ['/admin/ownerdashboard','/admin/ownerboard','/admin/dashboardlab'].indexOf(path) !== -1;
  var menuPage = ['/admin/menu','/admin/pmdmenus','/admin/menus'].indexOf(path) !== -1;
  var type = menuPage ? 'menu' :
    (/^\/admin\/(?:discounts|coupons)(?:\/|$)/.test(path) ? 'coupon' :
    (/^\/admin\/(?:settings|pmdsettings)(?:\/|$)/.test(path) ? 'setting' : null));
  if (!dashboard && !type) return;

  var context = null;

  function el(tag,text,className){var n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(className)n.className=className;return n;}
  function button(text,handler,className){var n=el('button',text,className||'pmd-group-btn');n.type='button';n.addEventListener('click',handler);return n;}
  function request(endpoint,body){
    var meta=document.querySelector('meta[name="csrf-token"]');
    var token=window.PMD_RESTAURANT_GROUPS_CSRF||(meta&&meta.content)||'';
    var options={credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest'}};
    if(body!==undefined){options.method='POST';options.headers['Content-Type']='application/json';options.headers['X-CSRF-TOKEN']=token;options.body=JSON.stringify(body);}
    return fetch('/admin/group/'+endpoint,options).then(function(response){
      return response.json().catch(function(){return {};}).then(function(data){
        if(!response.ok||data.ok===false){
          var error=new Error(data.message||'The request could not be completed.');
          error.pmdData=data;error.pmdStatus=response.status;throw error;
        }
        return data;
      });
    });
  }
  function dialog(title){var n=el('dialog',null,'pmd-group-dialog');var h=el('header');h.appendChild(el('h2',title));h.appendChild(button('Close',function(){n.close();}));n.appendChild(h);document.body.appendChild(n);n.addEventListener('close',function(){n.remove();});n.showModal();return n;}
  function field(label,input){var w=el('label',null,'pmd-group-field');w.appendChild(el('span',label));w.appendChild(input);return w;}
  function status(node,message,error){node.textContent=message;node.classList.toggle('is-error',!!error);}
  function locations(container,includeCurrent){var inputs=[];context.sites.forEach(function(site){if(!includeCurrent&&(Number(site.tenant_id)===Number(context.current_tenant_id)||!site.can_publish))return;var input=el('input');input.type='checkbox';input.value=String(site.tenant_id);var label=el('label',null,'pmd-group-location');label.appendChild(input);label.appendChild(el('span',site.label));container.appendChild(label);inputs.push(input);});return inputs;}
  function selected(inputs){return inputs.filter(function(i){return i.checked;}).map(function(i){return Number(i.value);});}
  function siteLabel(id){var site=context.sites.find(function(row){return Number(row.tenant_id)===Number(id);});return site?site.label:'Restaurant '+id;}



    function share(){
    var node=dialog('Apply saved changes to restaurants');
    node.appendChild(el('p','Save in the current restaurant first. Then choose exactly which other restaurants receive this saved item.'));
    var item=el('select');node.appendChild(field('Saved item',item));
    var box=el('div');node.appendChild(box);var inputs=locations(box,false);
    var message=el('p',null,'pmd-group-status');message.setAttribute('role','status');node.appendChild(message);
    var details=el('div',null,'pmd-group-results');node.appendChild(details);
    var operation=null,busy=false,version=0;
    var apply=button('Apply to selected restaurants',function(){if(!operation||busy)return;busy=true;apply.disabled=true;preview.disabled=true;request('publish/apply',{operation:operation,overwrite:false}).then(function(data){details.replaceChildren();var failed=false;(data.results||[]).forEach(function(row){var label=row.label||siteLabel(row.tenant_id);details.appendChild(el('p',label+': '+(row.ok?(row.state==='already_applied'?'Already applied':'Applied'):row.message),row.ok?'':'is-error'));failed=failed||!row.ok;});status(message,failed?'Some restaurants were not confirmed. Retry the unfinished operation.':'Selected restaurants were updated.',failed);if(!failed)operation=null;apply.textContent=failed?'Retry unfinished restaurants':'Apply to selected restaurants';}).catch(function(e){status(message,e.message,true);}).finally(function(){busy=false;preview.disabled=false;apply.disabled=!operation;});});apply.disabled=true;
    var preview=button('Preview restaurants',function(){var ids=selected(inputs);if(!ids.length||!item.value){status(message,'Choose a saved item and at least one other restaurant.',true);return;}busy=true;preview.disabled=true;apply.disabled=true;operation=null;details.replaceChildren();var currentVersion=++version;request('publish/preview',{type:type,entity_id:item.value,targets:ids}).then(function(data){if(currentVersion!==version)return;operation=data.operation;(data.targets||[]).forEach(function(row){details.appendChild(el('p',row.label+': '+(row.existing?'Update published copy':'Create copy')));});status(message,'Review the target restaurants before applying.');}).catch(function(e){status(message,e.message,true);}).finally(function(){busy=false;preview.disabled=false;apply.disabled=!operation;});});
    function invalidate(){version++;operation=null;apply.disabled=true;details.replaceChildren();}
    item.addEventListener('change',invalidate);inputs.forEach(function(i){i.addEventListener('change',invalidate);});
    node.appendChild(preview);node.appendChild(apply);preview.disabled=true;
    request('catalog?type='+encodeURIComponent(type)).then(function(data){(data.items||[]).forEach(function(row){var option=el('option',row.label);option.value=String(row.id);item.appendChild(option);});preview.disabled=!item.options.length;status(message,item.options.length?'':'No eligible saved items are available.');}).catch(function(e){status(message,e.message,true);});
  }

  function scopeControl(){
    // Server-first-paint controls are already present in Dashboard Lab and Menu.
    // Never append a second copy after the async context request.
    var preloaded=document.querySelector('[data-pmd-group-firstpaint] select');
    if(preloaded)return {wrap:preloaded.closest('.pmd-group-scope-switch'),select:preloaded};
    var wrap=el('label',null,'pmd-group-scope-switch');
    var caption=el('span','Restaurant','pmd-group-scope-caption');
    var select=el('select');select.setAttribute('aria-label','Restaurant scope');
    var current=el('option',siteLabel(context.current_tenant_id));current.value=String(context.current_tenant_id);select.appendChild(current);
    if(context.sites.length>1){var all=el('option','All restaurants');all.value='all';select.appendChild(all);}
    context.sites.forEach(function(site){if(Number(site.tenant_id)===Number(context.current_tenant_id))return;var option=el('option',site.label);option.value=String(site.tenant_id);select.appendChild(option);});
    wrap.appendChild(caption);wrap.appendChild(select);wrap.title=context.group.name;
    return {wrap:wrap,select:select};
  }

    function dashboardMount(){
    var root=document.querySelector('#pmd-dashboard-lab, #pmd-ownerboard, [data-pmd-ownerboard-v2]');
    if(!root)return;
    var header=root.querySelector('#pmd-r2-clean-header, .pmd-ownerboard-v2__header, header');
    var actions=header&&header.querySelector('[data-pmd-dashboard-lab-header-actions], .pmd-ownerboard-v2__header-actions, .pmd-owner-header__actions');
    if(!header||!actions)return;
    var control=scopeControl();if(!control.wrap.isConnected)actions.prepend(control.wrap);
    var current=String(context.current_tenant_id), selectedScope=current, sequence=0;
    var reportCache=Object.create(null);
    var nativeLab=root.id==='pmd-dashboard-lab';
    var kpiTemplate={};
    try{
      var kpiData=document.getElementById('pmd-dashboard-lab-kpi-data');
      if(kpiData)kpiTemplate=JSON.parse(kpiData.textContent||'{}')||{};
    }catch(ignored){}
    window.PMDRestaurantGroupsV1={
      isRemoteScope:function(){return selectedScope!==current;},
      selectedScope:function(){return selectedScope;},
      currentTenantId:Number(context.current_tenant_id)
    };
    function report(scope,period){
      var key=scope+'|'+period, entry=reportCache[key];
      if(entry&&Date.now()-entry.at<30000)return entry.promise;
      var promise=request('dashboard?scope='+encodeURIComponent(scope)+'&period='+encodeURIComponent(period)).catch(function(error){
        if(reportCache[key]&&reportCache[key].promise===promise)delete reportCache[key];
        throw error;
      });
      reportCache[key]={at:Date.now(),promise:promise};
      return promise;
    }
    function issue(data){
      if(!data||data.ok!==true)return 'Group reporting is unavailable.';
      var rows=Array.isArray(data.locations)?data.locations:[];
      if(!rows.length)return 'No authorized restaurant reporting data.';
      var failed=rows.find(function(row){return row.available!==true;});
      if(failed)return failed.message||'Restaurant reporting settings need attention.';
      var detail=(data.dashboard&&data.dashboard.restaurants)||[];
      failed=detail.find(function(row){return row.available!==true;});
      if(failed)return failed.message||'Restaurant dashboard data is unavailable.';
      return null;
    }
    function currencyValue(value,code){
      if(!/^[A-Z]{3}$/.test(String(code||'')))return '—';
      try{return new Intl.NumberFormat(document.documentElement.lang||'en',{style:'currency',currency:code}).format(Number(value));}
      catch(ignored){return String(value)+' '+code;}
    }
    function kpisFor(today,month,loading){
      var result={};
      Object.keys(kpiTemplate).forEach(function(key){
        var sample=kpiTemplate[key]||{};
        var period=sample.period==='month'?'month':'today';
        var data=period==='month'?month:today, problem=loading?'Loading restaurant data…':issue(data);
        var groupData=data&&data.dashboard||{};
        var totals=Array.isArray(data&&data.totals)?data.totals:[];
        var financial=!!data&&!problem&&!data.mixed_currency&&totals.length===1;
        var row=financial?totals[0]:null;
        var value='—', available=false;
        if(!problem){
          if(key==='revenue'&&financial){value=currencyValue(row.revenue,row.currency);available=true;}
          else if(key==='tips'&&financial){value=currencyValue(row.tips,row.currency);available=true;}
          else if(key==='guests'){value=String(groupData.guests||0);available=true;}
          else if(key==='turnover'&&groupData.turnover_minutes!=null){value=String(groupData.turnover_minutes)+' min';available=true;}
          else if(key==='channels'){var channels=groupData.channels||{};value=String(channels.dine_in||0)+' / '+String(channels.takeaway||0);available=true;}
        }
        var reason=problem||(!available?(data&&data.mixed_currency?'Currencies cannot be combined.':'Not available in group reporting.'):((period==='month'?'This month':'Today')+' · '+(data.scope_label||'Restaurant')));
        result[key]=Object.assign({},sample,{
          value:value,connected:available,description:reason,
          source:'PayMyDine Restaurant Groups · read only',
          pmd_group_unavailable:!available
        });
      });
      return result;
    }
    function scopedAnalytics(data){
      var problem=issue(data),dash=data&&data.dashboard||{};
      var totals=Array.isArray(data&&data.totals)?data.totals:[];
      var financial=!problem&&!data.mixed_currency&&totals.length===1;
      var currency=financial?totals[0].currency:'EUR';
      var reason=problem||(data&&data.mixed_currency?'Multiple currencies cannot be combined.':'This metric is not available for group reporting.');
      function missing(why){return {available:false,reason:why||reason};}
      function moneySeries(source){var rows=(source||{})[currency]||{};return Object.keys(rows).sort().map(function(key){return {bucket:key,sales:Number(rows[key]),orders:0};});}
      var series=financial?moneySeries(dash.sales_series):[];
      var hours=financial?Object.keys((dash.sales_by_hour||{})[currency]||{}).sort().map(function(key){
        return {hour:Number(String(key).split(':')[0]),sales:Number(dash.sales_by_hour[currency][key]),orders:0};
      }):[];
      var cat=financial?Object.keys((dash.category_sales||{})[currency]||{}).map(function(name){
        return {category:name,revenue:Number(dash.category_sales[currency][name])};
      }):[];
      return {
        success:true,pmd_group_scoped:true,period:data&&data.period||'today',
        currency:currency,currency_symbol:currency==='EUR'?'€':currency==='GBP'?'£':currency==='USD'?'$':currency,
        sales_over_time:financial?{available:true,empty:!series.length,buckets:series}:missing(reason),
        sales_by_hour:financial?{available:true,empty:!hours.length,hours:hours}:missing(reason),
        sales_by_category:financial?{available:true,empty:!cat.length,categories:cat}:missing(reason),
        // The current Group API has payment counts but not monetary totals.
        // It would be incorrect to feed counts into the native sales donut.
        payment_methods:missing('Group payment amounts are not available.'),
        channels:missing('Group channel revenue is not available.'),
        top_items:missing('Group top items are not available.'),
        live_operations:missing('Live orders remain in the signed-in restaurant.'),
        recent_transactions:missing('Cross-restaurant transactions are not available.'),
        alerts:missing('Alerts remain in the signed-in restaurant.'),
        reviews:missing('Group reviews are not available.'),
        tips:missing('Group tip breakdown is not available.'),
        calendar_events:missing('Reservations remain in the signed-in restaurant.')
      };
    }
    function applyKpis(today,month,loading){
      if(!window.PMDDashboardLabKpisV1)return;
      window.PMDDashboardLabKpisV1.applyLivePayload({
        pmd_group_scoped:true,kpis:kpisFor(today,month,loading)
      });
    }
    function load(){
      var scope=String(control.select.value), version=++sequence;
      selectedScope=scope;
      var remote=scope!==current;
      root.classList.toggle('pmd-group-dashboard-scope-active',remote);
      control.select.setAttribute('aria-busy',remote?'true':'false');
      if(!nativeLab){
        // Never render a duplicate panel or replace native local data on an
        // unsupported legacy Dashboard route.
        if(remote){control.select.value=current;selectedScope=current;root.classList.remove('pmd-group-dashboard-scope-active');}
        control.select.removeAttribute('aria-busy');
        return;
      }
      var analytics=window.PMDDashboardLabAnalyticsV1;
      if(!remote){
        control.select.removeAttribute('aria-busy');
        control.select.title=context.group.name;
        if(window.PMDDashboardLabKpisV1)window.PMDDashboardLabKpisV1.restoreLocal();
        if(analytics){analytics.setScopeProvider(null);analytics.refresh().catch(function(){});}
        if(window.PMDDashboardLiveRefreshV1&&window.PMDDashboardLiveRefreshV1.refresh){
          window.PMDDashboardLiveRefreshV1.refresh().catch(function(){});
        }
        return;
      }
      applyKpis(null,null,true);
      if(analytics){
        analytics.setScopeProvider(function(period){
          return report(scope,period).then(scopedAnalytics);
        });
        analytics.refresh().catch(function(error){
          if(version===sequence)control.select.title=String(error&&error.message||'Restaurant reports unavailable');
        });
      }
      Promise.allSettled([report(scope,'today'),report(scope,'month')]).then(function(rows){
        if(version!==sequence||selectedScope!==scope)return;
        var today=rows[0].status==='fulfilled'?rows[0].value:null;
        var month=rows[1].status==='fulfilled'?rows[1].value:null;
        applyKpis(today,month,false);
        control.select.removeAttribute('aria-busy');
        var problem=issue(today)||issue(month);
        control.select.title=problem||context.group.name+' · read-only reporting';
      });
    }
    control.select.addEventListener('change',load);
  }

    function menuMount(){
    var root=document.querySelector('[data-pmd-menu-manager]');if(!root)return;
    var header=root.querySelector('#pmd-r2-clean-header, .pmd-menu-manager__topbar, header');
    var actions=header&&header.querySelector('[data-pmd-menu-header-actions], .pmd-owner-header__actions');
    var grid=root.querySelector('[data-pmd-menu-grid]');
    if(!header||!actions||!grid)return;
    var control=scopeControl();if(!control.wrap.isConnected)actions.prepend(control.wrap);
    var applyButton=null;
    if(context.capabilities.publish){applyButton=button('Apply to locations',share,'pmd-group-header-button');actions.prepend(applyButton);}
    var savedGrid=document.createDocumentFragment(),borrowed=false,version=0;
    var savedKpis=Array.from(root.querySelectorAll('[data-pmd-menu-r22-kpi-value]')).map(function(node){return {node:node,value:node.textContent};});
    function stash(){
      if(borrowed)return;
      while(grid.firstChild)savedGrid.appendChild(grid.firstChild);
      borrowed=true;
    }
    function restore(){
      if(borrowed){grid.replaceChildren(savedGrid);borrowed=false;}
      savedKpis.forEach(function(row){row.node.textContent=row.value;});
    }
    function showMessage(message){
      stash();grid.replaceChildren();
      var node=el('div',message,'pmd-menu-card pmd-group-menu-message');
      node.setAttribute('role','status');grid.appendChild(node);
    }
    function render(data){
      stash();grid.replaceChildren();
      if(!data||data.ok!==true){showMessage('Restaurant menu is unavailable.');return;}
      var rows=data.locations||[],total=0,unavailable=rows.find(function(row){return row.available!==true;});
      if(unavailable){showMessage(unavailable.message||'Restaurant menu is unavailable.');return;}
      var items=[],categoryNames={};var stockOut=0,hidden=0;
      rows.forEach(function(row){
        (row.items||[]).forEach(function(item){
          total++;
          if(item.stock_out)stockOut++;
          if(!item.published)hidden++;
          (item.categories||[]).forEach(function(name){categoryNames[name]=true;});
          if(items.length<500)items.push({item:item,location:row.label});
        });
      });
      savedKpis.forEach(function(row){
        var card=row.node.closest('[data-pmd-menu-r22-kpi-key]');
        var key=card&&card.getAttribute('data-pmd-menu-r22-kpi-key');
        var values={menu_items:total,categories:Object.keys(categoryNames).length,stock_out:stockOut,disabled:hidden,enabled:total-hidden};
        if(Object.prototype.hasOwnProperty.call(values,key))row.node.textContent=String(values[key]);
        else row.node.textContent='—';
      });
      items.forEach(function(entry){
        var item=entry.item;
        // The original menu card grid is reused, with no remote edit/delete
        // actions and no ids bound to native write handlers.
        var card=el('article',null,'pmd-menu-card pmd-group-menu-readonly-item');
        card.setAttribute('aria-readonly','true');
        var media=el('div',null,'pmd-menu-card__media');media.appendChild(el('div',null,'pmd-menu-card__placeholder'));card.appendChild(media);
        var body=el('div',null,'pmd-menu-card__body');
        var title=el('div',null,'pmd-menu-card__title-row');
        title.appendChild(el('h2',item.name));title.appendChild(el('strong',item.price===null?'—':String(item.price)));
        body.appendChild(title);
        var category=el('p',(item.categories||[]).join(', ')||'Uncategorized','pmd-menu-card__description');
        body.appendChild(category);
        var statusText=(data.scope==='all'?entry.location+' · ':'')+(item.published?'Published':'Hidden')+' · '+(item.stock_out?'Out of stock':'In stock');
        body.appendChild(el('div',statusText,'pmd-menu-card__availability'));card.appendChild(body);
        grid.appendChild(card);
      });
      if(!items.length)showMessage('No menu items in this restaurant.');
      else if(total>items.length)grid.appendChild(el('p','Showing the first '+items.length+' of '+total+' items.','pmd-group-muted'));
    }
    function load(){
      var scope=String(control.select.value),local=scope===String(context.current_tenant_id),seq=++version;
      root.classList.toggle('pmd-group-menu-scope-active',!local);
      if(applyButton)applyButton.hidden=!local;
      if(local){restore();control.select.removeAttribute('aria-busy');return;}
      showMessage('Loading restaurant menu…');control.select.setAttribute('aria-busy','true');
      request('menu?scope='+encodeURIComponent(scope)).then(function(data){
        if(seq===version)render(data);
      }).catch(function(error){
        if(seq===version)showMessage(error.message||'Restaurant menu is unavailable.');
      }).finally(function(){
        if(seq===version)control.select.removeAttribute('aria-busy');
      });
    }
    control.select.addEventListener('change',load);
  }

    function genericMount(){
    var root=document.querySelector('.page-content, main');if(!root)return;
    if(type&&context.capabilities.publish){var bar=el('div',null,'pmd-group-toolbar');bar.appendChild(button('Apply to locations',share));root.prepend(bar);}
  }

  function contextFailure(error){
    try{console.error('[PMD Restaurant Groups] context failed:',error&&error.message?error.message:error);}catch(ignored){}
    if(!(error&&error.pmdData&&error.pmdData.enabled))return;
    var root=document.querySelector('#pmd-dashboard-lab,#pmd-ownerboard,[data-pmd-ownerboard-v2],[data-pmd-menu-manager],.page-content,main');
    var header=root&&root.querySelector('#pmd-r2-clean-header,.pmd-ownerboard-v2__header,.pmd-menu-manager__topbar,header');
    var actions=header&&header.querySelector('.pmd-owner-header__actions,.pmd-ownerboard-v2__header-actions,[data-pmd-dashboard-lab-header-actions],[data-pmd-menu-header-actions]');
    if(!actions||actions.querySelector('[data-pmd-group-reauth]'))return;
    var notice=button('Reconnect business account',function(){window.location.assign('/admin/logout');},'pmd-group-header-button pmd-group-reauth');
    notice.setAttribute('data-pmd-group-reauth','1');
    notice.title=error.message||'Sign in again with the shared Owner account.';
    actions.prepend(notice);
  }

  function mount(data){
    if(!data||!data.enabled)return;
    context=data;
    if(dashboard){dashboardMount();return;}
    if(menuPage){menuMount();return;}
    genericMount();
  }
  // First-paint server context makes the selector interactive without an
  // additional async context roundtrip on the canonical Dashboard/Menu.
  var preloaded=document.getElementById('pmd-group-initial-context'),first=null;
  if(preloaded){try{first=JSON.parse(preloaded.textContent||'null');}catch(ignored){}}
  if(first&&first.enabled)mount(first);
  else request('context').then(mount).catch(contextFailure);
})();
