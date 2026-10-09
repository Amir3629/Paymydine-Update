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
  var reportSequence = 0;

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

  function account(){
    var node=dialog('Business account');node.appendChild(el('p',context.group.name+' · '+context.owner.username));
    var inputs=[];
    ['Current password','New password','Confirm new password'].forEach(function(label,index){var input=el('input');input.type='password';input.maxLength=128;input.autocomplete=index?'new-password':'current-password';node.appendChild(field(label,input));inputs.push(input);});
    var message=el('p',null,'pmd-group-status');message.setAttribute('role','status');
    var save=button('Change shared password',function(){if(inputs[1].value.length<14||inputs[1].value!==inputs[2].value){status(message,'Use matching new passwords of at least 14 characters.',true);return;}save.disabled=true;request('password',{current_password:inputs[0].value,new_password:inputs[1].value,new_password_confirmation:inputs[2].value}).then(function(){inputs.forEach(function(i){i.value='';});window.location.assign('/admin/login');}).catch(function(e){status(message,e.message,true);save.disabled=false;});});
    node.appendChild(save);node.appendChild(el('p','This changes the Owner password for every restaurant in this Business Account.'));node.appendChild(message);
  }

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
    var root=document.querySelector('#pmd-ownerboard, #pmd-dashboard-lab, [data-pmd-ownerboard-v2]');
    if(!root)return;
    var header=root.querySelector('.pmd-ownerboard-v2__header, #pmd-r2-clean-header, header');
    var actions=header&&header.querySelector('.pmd-ownerboard-v2__header-actions, .pmd-owner-header__actions, [data-pmd-dashboard-header-actions]');
    if(!header||!actions)return;

    var control=scopeControl();actions.prepend(control.wrap);
    var accountButton=button('Account',account,'pmd-group-header-button');actions.prepend(accountButton);

    var panel=el('section',null,'pmd-group-dashboard-panel');panel.hidden=true;header.after(panel);
    var period=el('select');period.setAttribute('aria-label','Reporting period');
    [['today','Today'],['week','This week'],['month','This month'],['last30','Last 30 days']].forEach(function(row){var option=el('option',row[1]);option.value=row[0];period.appendChild(option);});

    function metric(label,value,meta){var card=el('article',null,'pmd-group-report-card');card.appendChild(el('span',label));card.appendChild(el('strong',value));if(meta)card.appendChild(el('small',meta));return card;}
    function money(value,currency){return String(value)+' '+String(currency||'');}

    function render(data){
      panel.replaceChildren();
      var head=el('div',null,'pmd-group-dashboard-panel__head');
      var copy=el('div');copy.appendChild(el('span',context.group.name,'pmd-group-eyebrow'));copy.appendChild(el('h2',data.scope_label||'Business dashboard'));head.appendChild(copy);
      var periodField=field('Period',period);periodField.classList.add('pmd-group-period');head.appendChild(periodField);panel.appendChild(head);

      var totals=data.totals||[];
      var total=totals.length===1?totals[0]:null;
      var dash=data.dashboard||{};
      var cards=el('div',null,'pmd-group-report-cards');
      cards.appendChild(metric('Revenue',total?money(total.revenue,total.currency):(totals.length?'Multiple currencies':'0'),'settled'));
      cards.appendChild(metric('Guests served',String(dash.guests||0),'recorded covers'));
      cards.appendChild(metric('Table turnover',dash.turnover_minutes==null?'—':String(dash.turnover_minutes)+' min',String(dash.turnover_samples||0)+' visits'));
      cards.appendChild(metric('Dine in / Take away',String((dash.channels||{}).dine_in||0)+' / '+String((dash.channels||{}).takeaway||0),'orders'));
      panel.appendChild(cards);

      var grid=el('div',null,'pmd-group-report-grid');
      var sales=el('section',null,'pmd-group-report-section');sales.appendChild(el('h3','Sales over time'));
      var series=dash.sales_series||{};var hasSeries=false;
      Object.keys(series).forEach(function(currency){var list=el('div',null,'pmd-group-series');Object.keys(series[currency]||{}).forEach(function(bucket){hasSeries=true;var row=el('div',null,'pmd-group-series-row');row.appendChild(el('span',bucket));row.appendChild(el('strong',money(series[currency][bucket],currency)));list.appendChild(row);});sales.appendChild(list);});
      if(!hasSeries)sales.appendChild(el('p','No settled sales in this period.','pmd-group-muted'));
      grid.appendChild(sales);

      var payment=el('section',null,'pmd-group-report-section');payment.appendChild(el('h3','Payment methods'));var methods=dash.payment_methods||{};var methodKeys=Object.keys(methods);
      if(!methodKeys.length)payment.appendChild(el('p','No payment method data in this period.','pmd-group-muted'));
      methodKeys.forEach(function(name){var row=el('div',null,'pmd-group-series-row');row.appendChild(el('span',name));row.appendChild(el('strong',methods[name]));payment.appendChild(row);});
      grid.appendChild(payment);panel.appendChild(grid);

      var detailGrid=el('div',null,'pmd-group-report-grid');
      var hourly=el('section',null,'pmd-group-report-section');hourly.appendChild(el('h3','Sales by hour'));var hourlyData=dash.sales_by_hour||{};var hourlyAny=false;
      Object.keys(hourlyData).forEach(function(currency){Object.keys(hourlyData[currency]||{}).forEach(function(bucket){hourlyAny=true;var row=el('div',null,'pmd-group-series-row');row.appendChild(el('span',bucket));row.appendChild(el('strong',money(hourlyData[currency][bucket],currency)));hourly.appendChild(row);});});
      if(!hourlyAny)hourly.appendChild(el('p','No hourly sales data in this period.','pmd-group-muted'));detailGrid.appendChild(hourly);

      var category=el('section',null,'pmd-group-report-section');category.appendChild(el('h3','Sales by category'));var categoryData=dash.category_sales||{};var categoryAny=false;
      Object.keys(categoryData).forEach(function(currency){Object.keys(categoryData[currency]||{}).slice(0,12).forEach(function(name){categoryAny=true;var row=el('div',null,'pmd-group-series-row');row.appendChild(el('span',name));row.appendChild(el('strong',money(categoryData[currency][name],currency)));category.appendChild(row);});});
      if(!categoryAny)category.appendChild(el('p','No category sales data in this period.','pmd-group-muted'));detailGrid.appendChild(category);panel.appendChild(detailGrid);

      var restaurants=el('section',null,'pmd-group-report-section');restaurants.appendChild(el('h3','Restaurants'));
      (data.locations||[]).forEach(function(row){var line=el('div',null,'pmd-group-location-result'+(row.available?'':' is-error'));line.appendChild(el('strong',row.label));line.appendChild(el('span',row.available?(row.revenue+' '+row.currency+' · '+row.orders+' orders'):row.message));restaurants.appendChild(line);});
      panel.appendChild(restaurants);
      panel.appendChild(el('p','Reporting changes in-place. The URL and signed-in restaurant do not change; Floor and live operational controls stay isolated to the current restaurant.','pmd-group-note'));
    }

    function load(){
      var local=control.select.value===String(context.current_tenant_id);
      root.classList.toggle('pmd-group-dashboard-scope-active',!local);
      panel.hidden=local;
      if(local){++reportSequence;panel.replaceChildren();return;}
      var seq=++reportSequence;panel.hidden=false;panel.replaceChildren(el('div','Loading restaurant reports…','pmd-group-loading'));
      request('dashboard?scope='+encodeURIComponent(control.select.value)+'&period='+encodeURIComponent(period.value)).then(function(data){if(seq===reportSequence)render(data);}).catch(function(error){if(seq===reportSequence)panel.replaceChildren(el('p',error.message,'is-error'));});
    }
    control.select.addEventListener('change',load);period.addEventListener('change',function(){if(control.select.value!==String(context.current_tenant_id))load();});
  }

  function renderMenuPanel(panel,data){
    panel.replaceChildren();
    var head=el('div',null,'pmd-group-menu-panel__head');var copy=el('div');copy.appendChild(el('span',context.group.name,'pmd-group-eyebrow'));copy.appendChild(el('h2',data.scope_label||'Menu'));head.appendChild(copy);panel.appendChild(head);
    panel.appendChild(el('p','This cross-restaurant view is read-only. Edit the current restaurant normally, then use “Apply to locations” to publish saved changes to selected restaurants.','pmd-group-note'));
    (data.locations||[]).forEach(function(location){
      var section=el('section',null,'pmd-group-menu-location');var title=el('div',null,'pmd-group-menu-location__title');title.appendChild(el('h3',location.label));title.appendChild(el('span',String((location.items||[]).length)+' items'));section.appendChild(title);
      if(!location.available){section.appendChild(el('p',location.message||'Menu unavailable.','is-error'));panel.appendChild(section);return;}
      var list=el('div',null,'pmd-group-menu-items');
      (location.items||[]).forEach(function(item){var row=el('article',null,'pmd-group-menu-item');var copy2=el('div');copy2.appendChild(el('strong',item.name));var meta=[];if(item.categories&&item.categories.length)meta.push(item.categories.join(', '));meta.push(item.published?'Published':'Hidden');if(item.stock_out)meta.push('Stock out');copy2.appendChild(el('span',meta.join(' · ')));row.appendChild(copy2);row.appendChild(el('b',item.price==null?'—':item.price));list.appendChild(row);});
      if(!(location.items||[]).length)list.appendChild(el('p','No menu items.','pmd-group-muted'));
      section.appendChild(list);panel.appendChild(section);
    });
  }

  function menuMount(){
    var root=document.querySelector('[data-pmd-menu-manager]');if(!root)return;
    var header=root.querySelector('#pmd-r2-clean-header, .pmd-menu-manager__topbar, header');
    var actions=header&&header.querySelector('[data-pmd-menu-header-actions], .pmd-owner-header__actions');if(!header||!actions)return;
    var control=scopeControl();actions.prepend(control.wrap);
    var applyButton=null;
    if(context.capabilities.publish){applyButton=button('Apply to locations',share,'pmd-group-header-button');actions.prepend(applyButton);}
    var panel=el('section',null,'pmd-group-menu-panel');panel.hidden=true;header.after(panel);

    function load(){
      var local=control.select.value===String(context.current_tenant_id);
      root.classList.toggle('pmd-group-menu-scope-active',!local);
      panel.hidden=local;
      if(applyButton)applyButton.hidden=!local;
      if(local){panel.replaceChildren();return;}
      panel.hidden=false;panel.replaceChildren(el('div','Loading restaurant menus…','pmd-group-loading'));
      request('menu?scope='+encodeURIComponent(control.select.value)).then(function(data){renderMenuPanel(panel,data);}).catch(function(error){panel.replaceChildren(el('p',error.message,'is-error'));});
    }
    control.select.addEventListener('change',load);
  }

  function genericMount(){
    var root=document.querySelector('.page-content, main');if(!root)return;
    var bar=el('div',null,'pmd-group-toolbar');bar.appendChild(el('strong',context.group.name));bar.appendChild(button('Business account',account));if(type&&context.capabilities.publish)bar.appendChild(button('Apply to locations',share));root.prepend(bar);
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

  request('context').then(function(data){
    if(!data.enabled)return;
    context=data;
    if(dashboard){dashboardMount();return;}
    if(menuPage){menuMount();return;}
    genericMount();
  }).catch(contextFailure);
})();
