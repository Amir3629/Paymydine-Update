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



  function share(preset){
    // Called either from the header or directly from a saved food/category.
    // A header click event is NOT a publish preset.
    preset=preset&&['menu','category'].indexOf(preset.type)!==-1?preset:null;
    var publishType=preset?preset.type:type;
    var node=dialog(preset?'Apply to other locations':'Apply saved changes to restaurants');
    node.appendChild(el('p',preset&&publishType==='category'
      ? 'Publish this category definition only. Foods and stock stay local. Choose the receiving restaurants, preview, then confirm.'
      : 'Save in the current restaurant first. Choose exactly which other restaurants receive this saved item.'));
    var item=el('select');
    if(preset){
      var option=el('option',preset.label||'Saved item');
      option.value=String(preset.id);
      item.appendChild(option);
      node.appendChild(el('p',(publishType==='category'?'Category: ':'Food: ')+(preset.label||'Saved item'),'pmd-group-selected-entity'));
    }else node.appendChild(field('Saved item',item));
    var box=el('div');node.appendChild(box);var inputs=locations(box,false);
    var message=el('p',null,'pmd-group-status');message.setAttribute('role','status');node.appendChild(message);
    var details=el('div',null,'pmd-group-results');node.appendChild(details);
    var operation=null,busy=false,version=0;
    var apply=button('Apply to selected restaurants',function(){if(!operation||busy)return;busy=true;apply.disabled=true;preview.disabled=true;request('publish/apply',{operation:operation,overwrite:false}).then(function(data){details.replaceChildren();var failed=false;(data.results||[]).forEach(function(row){var label=row.label||siteLabel(row.tenant_id);details.appendChild(el('p',label+': '+(row.ok?(row.state==='already_applied'?'Already applied':'Applied'):row.message),row.ok?'':'is-error'));failed=failed||!row.ok;});status(message,failed?'Some restaurants were not confirmed. Retry the unfinished operation.':'Selected restaurants were updated.',failed);if(!failed)operation=null;apply.textContent=failed?'Retry unfinished restaurants':'Apply to selected restaurants';}).catch(function(e){status(message,e.message,true);}).finally(function(){busy=false;preview.disabled=false;apply.disabled=!operation;});});apply.disabled=true;
    var preview=button('Preview restaurants',function(){var ids=selected(inputs);if(!ids.length||!item.value){status(message,'Choose a saved item and at least one other restaurant.',true);return;}busy=true;preview.disabled=true;apply.disabled=true;operation=null;details.replaceChildren();var currentVersion=++version;request('publish/preview',{type:publishType,entity_id:item.value,targets:ids}).then(function(data){if(currentVersion!==version)return;operation=data.operation;(data.targets||[]).forEach(function(row){details.appendChild(el('p',row.label+': '+(row.existing?'Update published copy':'Create copy')));});status(message,'Review the target restaurants before applying.');}).catch(function(e){status(message,e.message,true);}).finally(function(){busy=false;preview.disabled=false;apply.disabled=!operation;});});
    function invalidate(){version++;operation=null;apply.disabled=true;details.replaceChildren();}
    item.addEventListener('change',invalidate);inputs.forEach(function(i){i.addEventListener('change',invalidate);});
    node.appendChild(preview);node.appendChild(apply);preview.disabled=!preset;
    if(!preset){
      request('catalog?type='+encodeURIComponent(publishType)).then(function(data){
        (data.items||[]).forEach(function(row){
          var option=el('option',row.label);option.value=String(row.id);item.appendChild(option);
        });
        preview.disabled=!item.options.length;
        status(message,item.options.length?'':'No eligible saved items are available.');
      }).catch(function(e){status(message,e.message,true);});
    }
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
    var root=document.getElementById('pmd-dashboard-lab');
    // The canonical Owner Dashboard is Dashboard Lab. An old/alternate
    // Ownerboard renderer has a different data contract; do not offer a
    // nonfunctional selector there.
    if(!root)return;
    var header=root.querySelector('#pmd-r2-clean-header, .pmd-ownerboard-v2__header, header');
    var actions=header&&header.querySelector('[data-pmd-dashboard-lab-header-actions], .pmd-ownerboard-v2__header-actions, .pmd-owner-header__actions');
    if(!header||!actions)return;
    var control=scopeControl();if(!control.wrap.isConnected)actions.prepend(control.wrap);
    var current=String(context.current_tenant_id), selectedScope=current, sequence=0;
    var reportCache=Object.create(null);
    var floor=root.querySelector('#pmd-r2-shared-floor-canvas-v310, [data-pmd-floor]');
    var floorCanvas=floor&&floor.querySelector('[data-floor-canvas]');
    var floorScroll=floor&&floor.querySelector('[data-floor-scroll]');
    var originalFloorNodes=document.createDocumentFragment();
    var originalCanvasStyle=floorCanvas?floorCanvas.getAttribute('style'):null;
    var originalScrollStyle=floorScroll?floorScroll.getAttribute('style'):null;
    var floorBorrowed=false;
    function stashNativeFloor(){
      if(!floorCanvas||floorBorrowed)return;
      while(floorCanvas.firstChild)originalFloorNodes.appendChild(floorCanvas.firstChild);
      floorBorrowed=true;
    }
    function restoreNativeFloor(){
      if(!floorCanvas||!floorBorrowed)return;
      floorCanvas.replaceChildren(originalFloorNodes);
      if(originalCanvasStyle===null)floorCanvas.removeAttribute('style');
      else floorCanvas.setAttribute('style',originalCanvasStyle);
      if(floorScroll){
        if(originalScrollStyle===null)floorScroll.removeAttribute('style');
        else floorScroll.setAttribute('style',originalScrollStyle);
      }
      floorCanvas.classList.remove('pmd-group-floor-readonly-canvas');
      floorBorrowed=false;
    }
    function showFloorNotice(text){
      if(!floorCanvas)return;
      stashNativeFloor();floorCanvas.replaceChildren();
      floorCanvas.classList.add('pmd-group-floor-readonly-canvas');
      var strip=!!(floor&&floor.classList.contains('is-strip-mode'));
      var height=strip?146:560;
      floorCanvas.style.width=strip?'100%':'1000px';
      floorCanvas.style.minWidth=strip?'100%':'1000px';
      floorCanvas.style.height=height+'px';
      floorCanvas.style.minHeight=height+'px';
      floorCanvas.style.transform='none';
      if(floorScroll){
        floorScroll.style.height=height+'px';
        floorScroll.style.minHeight=height+'px';
        floorScroll.style.maxHeight=height+'px';
      }
      if(text==='Select one restaurant to view its Floor.'){
        // R26: a clear paused Floor state, grounded in the current Group view;
        // not a generic empty paragraph or a second dashboard widget.
        var panel=el('div',null,'pmd-group-floor-paused');
        var symbol=el('span',null,'pmd-group-floor-paused__symbol');
        symbol.setAttribute('aria-hidden','true');
        for(var n=0;n<4;n++)symbol.appendChild(el('i'));
        panel.appendChild(symbol);
        var copy=el('div',null,'pmd-group-floor-paused__copy');
        copy.appendChild(el('strong','Floor view paused'));
        copy.appendChild(el('span','All restaurants combines sales. Select one restaurant above to see its table layout.'));
        panel.appendChild(copy);
        panel.setAttribute('role','status');
        floorCanvas.appendChild(panel);
      }else{
        var message=el('p',text,'pmd-group-floor-readonly-message');
        message.setAttribute('role','status');
        floorCanvas.appendChild(message);
      }
    }
    function displayGroupFloor(data){
      if(!floorCanvas)return;
      if(selectedScope==='all'||(data&&data.floor&&data.floor.disabled)){
        // R24: One financial scope for all sites, but NO mixed restaurant Floor.
        showFloorNotice('Select one restaurant to view its Floor.');
        return;
      }
      var siteList=data&&data.floor&&data.floor.restaurants;
      var sites=Array.isArray(siteList)?siteList:[];
      if(sites.length!==1){
        showFloorNotice('Restaurant Floor is not available for this selection.');
        return;
      }
      var site=sites[0];
      if(site.available!==true){
        showFloorNotice((site.label||'Restaurant')+': '+(site.message||'Floor is unavailable.'));
        return;
      }
      var tables=Array.isArray(site.tables)?site.tables.slice(0,250):[];
      if(!tables.length){
        showFloorNotice('No tables have been created in this restaurant.');
        return;
      }
      // Use EXACTLY the existing native Floor's button, status colors and
      // single-row calibration. The previous custom grey cards and artificial
      // grid are not part of the PayMyDine Floor design.
      stashNativeFloor();floorCanvas.replaceChildren();
      floorCanvas.classList.add('pmd-group-floor-readonly-canvas');
      var strip=!!(floor&&floor.classList.contains('is-strip-mode'));
      tables.sort(function(a,b){
        var na=Number(a.number),nb=Number(b.number);
        if(Number.isFinite(na)&&Number.isFinite(nb)&&na!==nb)return na-nb;
        return String(a.number||'').localeCompare(String(b.number||''),undefined,{numeric:true});
      });
      var cursor=24;
      var height=strip?146:560;
      var width=strip?Math.max(1000,24+tables.length*(108+18)):1000;
      floorCanvas.style.width=width+'px';
      floorCanvas.style.minWidth=width+'px';
      floorCanvas.style.height=height+'px';
      floorCanvas.style.minHeight=height+'px';
      floorCanvas.style.transform='none';
      if(floorScroll){
        floorScroll.style.height=height+'px';
        floorScroll.style.minHeight=height+'px';
        floorScroll.style.maxHeight=height+'px';
      }
      tables.forEach(function(table,index){
        var status=String(table.status||'unknown');
        if(['available','occupied','reserved','cleaning','attention','disabled','unknown'].indexOf(status)<0)status='unknown';
        var w=108,h=88;
        var x=strip?cursor+w/2:Number(table.x);
        var y=strip?22+h/2:Number(table.y);
        if(!Number.isFinite(x))x=80+(index%6)*150;
        if(!Number.isFinite(y))y=60+Math.floor(index/6)*110;
        if(strip)cursor+=w+18;
        var node=el('button',null,'pmd-floor-v1__table pmd-group-floor-readonly-table');
        node.type='button';
        node.dataset.status=status;
        // Parent Floor is inert for remote sites; do not apply a disabled
        // button style that would change the native table appearance.
        node.setAttribute('aria-label',(table.name||'Table '+table.number)+' · '+site.label+' · Read only');
        node.title=(table.name||'Table '+table.number)+' · '+site.label+' (read only)';
        if(status==='available')node.setAttribute('data-pmd-range-color','free');
        else if(status==='occupied')node.setAttribute('data-pmd-range-color','busy');
        else if(status==='reserved')node.setAttribute('data-pmd-range-color','rangeReservation');
        node.style.left=x+'px';node.style.top=y+'px';
        node.style.width=w+'px';node.style.height=h+'px';
        node.appendChild(el('strong',table.number||table.name||'—','pmd-floor-v1__table-number'));
        if(status!=='available'&&status!=='occupied'&&status!=='unknown'){
          node.appendChild(el('span',status.replace(/-/g,' '),'pmd-floor-v1__table-meta'));
        }
        floorCanvas.appendChild(node);
      });
      if(site.truncated){
        var more=el('p','Showing the first 250 tables.','pmd-group-floor-readonly-limit');
        floorCanvas.appendChild(more);
      }
    }
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
      var saved={at:Date.now(),promise:promise,data:null};
      reportCache[key]=saved;
      promise.then(function(data){saved.data=data;}).catch(function(){});
      return promise;
    }
    // R26: warm a bounded number of explicitly authorized, read-only scopes
    // only when the browser is idle. Scope requests are shared for 30 seconds
    // and remain protected by the server's owner/MFA/tenant checks.
    function prewarmScopes(){
      if(document.visibilityState==='hidden'||context.sites.length>5)return;
      var candidates=context.sites.filter(function(site){
        return Number(site.tenant_id)!==Number(context.current_tenant_id);
      }).map(function(site){return String(site.tenant_id);});
      if(context.sites.length>1)candidates.unshift('all');
      candidates.slice(0,4).forEach(function(scope,index){
        window.setTimeout(function(){
          if(document.visibilityState==='hidden')return;
          report(scope,'today').catch(function(){});
          report(scope,'month').catch(function(){});
        },index*180);
      });
    }
    if(window.requestIdleCallback)window.requestIdleCallback(prewarmScopes,{timeout:1600});
    else window.setTimeout(prewarmScopes,1000);
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
    function scopedAnalytics(data,todayForHour){
      var problem=issue(data),dash=data&&data.dashboard||{};
      var hourData=todayForHour||data, hourProblem=issue(hourData),hourDash=hourData&&hourData.dashboard||{};
      var totals=Array.isArray(data&&data.totals)?data.totals:[];
      var financial=!problem&&!data.mixed_currency&&totals.length===1;
      var currency=financial?totals[0].currency:'EUR';
      var orderTotal=Array.isArray(data&&data.locations)
        ?data.locations.reduce(function(sum,row){return sum+Number(row&&row.orders||0);},0):null;
      var reason=problem||(data&&data.mixed_currency?'Multiple currencies cannot be combined.':'This metric is not available for group reporting.');
      function missing(why){return {available:false,reason:why||reason};}
      function moneySeries(source){var rows=(source||{})[currency]||{};return Object.keys(rows).sort().map(function(key){return {bucket:key,sales:Number(rows[key]),orders:0};});}
      var series=financial?moneySeries(dash.sales_series):[];
      var hourlyValid=financial&&!hourProblem&&!hourData.mixed_currency;
      var hours=hourlyValid?Object.keys((hourDash.sales_by_hour||{})[currency]||{}).sort().map(function(key){
        return {hour:Number(String(key).split(':')[0]),sales:Number(hourDash.sales_by_hour[currency][key]),orders:0};
      }):[];
      var cat=financial?Object.keys((dash.category_sales||{})[currency]||{}).map(function(name){
        return {category:name,revenue:Number(dash.category_sales[currency][name])};
      }):[];
      return {
        success:true,pmd_group_scoped:true,period:data&&data.period||'today',
        currency:currency,currency_symbol:currency==='EUR'?'€':currency==='GBP'?'£':currency==='USD'?'$':currency,
        sales_over_time:financial?{available:true,empty:!series.length,buckets:series}:missing(reason),
        sales_by_hour:hourlyValid?{available:true,empty:!hours.length,hours:hours}:missing(hourProblem||reason),
        sales_by_category:financial?{available:true,empty:!cat.length,categories:cat}:missing(reason),
        // The current Group API has payment counts but not monetary totals.
        // It would be incorrect to feed counts into the native sales donut.
        payment_methods:(!problem&&orderTotal===0)
          ? {available:true,empty:true,methods:[],reason:'No settled payments in this period.'}
          :missing('Group payment amounts by method are not verified.'),
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
      if(floor){
        floor.classList.toggle('pmd-group-floor-all-disabled',scope==='all');
        floor.inert=remote;
        floor.setAttribute('aria-disabled',remote?'true':'false');
        floor.title=scope==='all'
          ? 'Floor is disabled for All restaurants. Select one restaurant.'
          : (remote
            ? 'Restaurant Floor preview is read-only. Select the signed-in restaurant for operations.'
            : '');
      }
      control.select.setAttribute('aria-busy',remote?'true':'false');
      var analytics=window.PMDDashboardLabAnalyticsV1;
      if(!remote){
        restoreNativeFloor();
        control.select.removeAttribute('aria-busy');
        if(floor)floor.removeAttribute('aria-busy');
        control.select.title=context.group.name;
        if(window.PMDDashboardLabKpisV1)window.PMDDashboardLabKpisV1.restoreLocal();
        if(analytics){analytics.setScopeProvider(null);analytics.refresh().catch(function(){});}
        if(window.PMDDashboardLiveRefreshV1&&window.PMDDashboardLiveRefreshV1.refresh){
          window.PMDDashboardLiveRefreshV1.refresh().catch(function(){});
        }
        return;
      }
      // R25: Never clear the existing KPI and chart values to
      // "Loading" during a scope change. Mark the selector busy, keep the
      // last verified snapshot, and apply the new scope when its data is ready.
      if(scope==='all')showFloorNotice('Select one restaurant to view its Floor.');
      // A previously fetched, still-fresh site opens immediately in the
      // native widgets, without waiting for a new microtask or network roundtrip.
      var instantToday=reportCache[scope+'|today'];
      var instantMonth=reportCache[scope+'|month'];
      var warm=instantToday&&instantMonth&&instantToday.data&&instantMonth.data
        &&Date.now()-instantToday.at<30000&&Date.now()-instantMonth.at<30000;
      if(warm){
        if(scope!=='all')displayGroupFloor(instantToday.data);
        applyKpis(instantToday.data,instantMonth.data,false);
      }
      if(floor)floor.setAttribute('aria-busy',warm?'false':'true');
      if(analytics){
        analytics.setScopeProvider(function(period){
          return Promise.all([
            report(scope,period),
            period==='last30'?report(scope,'today'):Promise.resolve(null)
          ]).then(function(results){return scopedAnalytics(results[0],results[1]);});
        });
      }
      // Don't let a slower 30-day chart block the current KPI snapshot.
      // It loads independently into the unchanged, already visible chart.
      report(scope,'last30').catch(function(){});
      Promise.allSettled([
        report(scope,'today'),
        report(scope,'month')
      ]).then(function(rows){
        if(version!==sequence||selectedScope!==scope)return;
        var today=rows[0].status==='fulfilled'?rows[0].value:null;
        var month=rows[1].status==='fulfilled'?rows[1].value:null;
        if(!warm||today!==instantToday.data||month!==instantMonth.data){
          if(scope!=='all')displayGroupFloor(today);
          applyKpis(today,month,false);
        }
        if(floor)floor.removeAttribute('aria-busy');
        control.select.removeAttribute('aria-busy');
        var problem=issue(today)||issue(month);
        control.select.title=problem||context.group.name+' · read-only reporting';
        // Cached report promises allow the native chart renderer to replace
        // a complete chart in place without flashing loading placeholders.
        if(analytics){
          analytics.refresh().catch(function(error){
            if(version===sequence)control.select.title=String(error&&error.message||'Restaurant reports unavailable');
          });
        }
      });
    }
    control.select.addEventListener('change',load);
  }

  function menuMount(){
    var root=document.querySelector('[data-pmd-menu-manager]');if(!root)return;
    var header=root.querySelector('#pmd-r2-clean-header, .pmd-menu-manager__topbar, header');
    var actions=header&&header.querySelector('[data-pmd-menu-header-actions], .pmd-owner-header__actions');
    var grid=root.querySelector('[data-pmd-menu-grid]');
    var menuPanel=root.querySelector('[data-pmd-unified-menu-panel]');
    var menuWasHidden=menuPanel?menuPanel.hidden:false;
    var emptyResults=root.querySelector('[data-pmd-menu-no-results]');
    var emptyWasHidden=emptyResults?emptyResults.hidden:true;
    if(!header||!actions||!grid)return;
    var control=scopeControl();if(!control.wrap.isConnected)actions.prepend(control.wrap);
    var applyButton=null;
    if(context.capabilities.publish){applyButton=button('Apply to locations',share,'pmd-group-header-button');actions.prepend(applyButton);}
    // R26: keep native food card controls and category-filter buttons intact.
    // Add an adjacent (never nested) action to saved categories and each
    // persisted food card. Native menu CRUD can redraw these elements.
    var sourceSite=context.sites.find(function(site){
      return Number(site.tenant_id)===Number(context.current_tenant_id);
    });
    var canShare=!!(context.capabilities.publish&&sourceSite&&sourceSite.can_publish);
    var categoryRail=root.querySelector('[data-pmd-food-categories]');
    if(canShare){
      var enhancementPending=false;
      function enhanceCards(){
        enhancementPending=false;
        root.querySelectorAll('[data-pmd-menu-grid] [data-pmd-menu-card][data-item-type="food"][data-menu-id]').forEach(function(card){
          var actions=card.querySelector('.pmd-menu-card__actions');
          if(!actions||card.hasAttribute('data-pmd-group-card-enhanced'))return;
          var menuId=Number(card.getAttribute('data-menu-id'));
          if(!Number.isSafeInteger(menuId)||menuId<1)return;
          card.setAttribute('data-pmd-group-card-enhanced','1');
          var label=(card.querySelector('.pmd-menu-card__title-row h2')||{}).textContent||'Saved food';
          var target=button('Other locations',function(event){
            event.preventDefault();event.stopPropagation();
            share({type:'menu',id:menuId,label:label.trim()});
          },'pmd-group-card-publish-btn');
          target.setAttribute('aria-label','Apply '+label.trim()+' to other restaurants');
          actions.appendChild(target);
        });
        if(categoryRail)categoryRail.querySelectorAll('button[data-pmd-category-id]').forEach(function(filter){
          if(filter.hasAttribute('data-pmd-group-category-enhanced'))return;
          if(String(filter.getAttribute('data-pmd-category-kind')||'regular')!=='regular')return;
          var categoryId=Number(filter.getAttribute('data-pmd-category-id'));
          if(!Number.isSafeInteger(categoryId)||categoryId<1)return;
          filter.setAttribute('data-pmd-group-category-enhanced','1');
          var label=(filter.querySelector('.pmd-menu-manager__category-label')||{}).textContent||'Saved category';
          var action=button('Other locations',function(event){
            event.preventDefault();event.stopPropagation();
            share({type:'category',id:categoryId,label:label.trim()});
          },'pmd-group-category-publish-btn');
          action.setAttribute('aria-label','Apply category '+label.trim()+' to other restaurants');
          filter.insertAdjacentElement('afterend',action);
        });
      }
      function queueEnhance(){
        if(enhancementPending)return;
        enhancementPending=true;
        Promise.resolve().then(enhanceCards);
      }
      enhanceCards();
      // One bounded observer per manager section; the native product editor
      // can add food/category nodes without a full navigation.
      if(window.MutationObserver){
        var cardObserver=new MutationObserver(queueEnhance);
        cardObserver.observe(grid,{childList:true,subtree:true});
        if(categoryRail)cardObserver.observe(categoryRail,{childList:true});
      }
    }
    var menuScopeCache=Object.create(null);
    function menuReport(scope){
      var entry=menuScopeCache[scope];
      if(entry&&Date.now()-entry.at<20000)return entry.promise;
      var promise=request('menu?scope='+encodeURIComponent(scope)).catch(function(error){
        if(menuScopeCache[scope]&&menuScopeCache[scope].promise===promise)delete menuScopeCache[scope];
        throw error;
      });
      var saved={at:Date.now(),promise:promise,data:null};
      menuScopeCache[scope]=saved;
      promise.then(function(data){saved.data=data;}).catch(function(){});
      return promise;
    }
    if(context.sites.length<=5){
      var warmMenus=function(){
        if(document.visibilityState==='hidden')return;
        context.sites.filter(function(site){return Number(site.tenant_id)!==Number(context.current_tenant_id);}).slice(0,3)
          .forEach(function(site,index){
            setTimeout(function(){if(document.visibilityState!=='hidden')menuReport(String(site.tenant_id)).catch(function(){});},index*200);
          });
      };
      if(window.requestIdleCallback)window.requestIdleCallback(warmMenus,{timeout:1700});
      else window.setTimeout(warmMenus,1100);
    }
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
      if(local){
        restore();
        if(menuPanel)menuPanel.hidden=menuWasHidden;
        if(emptyResults)emptyResults.hidden=emptyWasHidden;
        control.select.removeAttribute('aria-busy');
        return;
      }
      if(menuPanel)menuPanel.hidden=false;
      if(emptyResults)emptyResults.hidden=true;
      // R26: a warmed location opens instantly; never issue duplicate GETs.
      var cached=menuScopeCache[scope];
      var hasWarm=cached&&cached.data&&Date.now()-cached.at<20000;
      if(hasWarm){
        render(cached.data);
        control.select.removeAttribute('aria-busy');
        return;
      }
      if(!borrowed)showMessage('Loading restaurant menu…');
      control.select.setAttribute('aria-busy','true');
      menuReport(scope).then(function(data){
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
