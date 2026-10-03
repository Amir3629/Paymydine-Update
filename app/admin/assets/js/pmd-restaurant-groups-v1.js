/* PMD restaurant groups R3: reporting scope never changes the local editor. */
(function () {
  'use strict';
  var path = location.pathname.replace(/\/+$/, '');
  var dashboard = ['/admin/ownerdashboard', '/admin/dashboardlab', '/admin/ownerboard'].indexOf(path) !== -1;
  var type = /^\/admin\/menus(?:\/|$)/.test(path) ? 'menu' :
    (/^\/admin\/(?:discounts|coupons)(?:\/|$)/.test(path) ? 'coupon' :
    (/^\/admin\/(?:settings|pmdsettings)(?:\/|$)/.test(path) ? 'setting' : null));
  if (!dashboard && !type) return;
  var context, reportSequence = 0;

  function el(tag, text, className) {
    var node = document.createElement(tag);
    if (text != null) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }
  function button(text, handler) {
    var node = el('button', text, 'pmd-group-btn'); node.type = 'button';
    node.addEventListener('click', handler); return node;
  }
  function request(endpoint, body) {
    var meta = document.querySelector('meta[name="csrf-token"]');
    var token = window.PMD_RESTAURANT_GROUPS_CSRF || (meta && meta.content) || '';
    var options = {credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest'}};
    if (body !== undefined) {
      options.method='POST'; options.headers['Content-Type']='application/json';
      options.headers['X-CSRF-TOKEN']=token; options.body=JSON.stringify(body);
    }
    return fetch('/admin/group/'+endpoint, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok || data.ok === false) throw new Error(data.message || 'The request could not be completed.');
        return data;
      });
    });
  }
  function dialog(title) {
    var node = el('dialog', null, 'pmd-group-dialog');
    var header = el('header'); header.appendChild(el('h2',title));
    header.appendChild(button('Close',function(){ node.close(); })); node.appendChild(header);
    document.body.appendChild(node);
    node.addEventListener('close',function(){ node.remove(); }); node.showModal(); return node;
  }
  function field(label, input) {
    var wrap=el('label',null,'pmd-group-field');wrap.appendChild(el('span',label));wrap.appendChild(input);return wrap;
  }
  function status(node,message,error) { node.textContent=message;node.classList.toggle('is-error',!!error); }
  function locations(container,includeCurrent) {
    var inputs=[];
    context.sites.forEach(function(site){
      if(!includeCurrent && (Number(site.tenant_id)===Number(context.current_tenant_id)||!site.can_publish)) return;
      var input=el('input');input.type='checkbox';input.value=String(site.tenant_id);
      var label=el('label',null,'pmd-group-location');label.appendChild(input);label.appendChild(el('span',site.label));container.appendChild(label);inputs.push(input);
    });
    return inputs;
  }
  function selected(inputs) { return inputs.filter(function(i){return i.checked;}).map(function(i){return Number(i.value);}); }

  function account() {
    var node=dialog('Business account');node.appendChild(el('p',context.group.name+' - '+context.owner.username));
    var inputs=[];
    ['Current password','New password','Confirm new password'].forEach(function(label,index){
      var input=el('input');input.type='password';input.maxLength=128;input.autocomplete=index?'new-password':'current-password';
      node.appendChild(field(label,input));inputs.push(input);
    });
    var message=el('p',null,'pmd-group-status');message.setAttribute('role','status');
    var save=button('Change shared password',function(){
      if(inputs[1].value.length<14 || inputs[1].value!==inputs[2].value) {status(message,'Use matching new passwords of at least 14 characters.',true);return;}
      save.disabled=true;
      request('password',{current_password:inputs[0].value,new_password:inputs[1].value,new_password_confirmation:inputs[2].value})
        .then(function(){inputs.forEach(function(i){i.value='';});location.assign('/admin/login');})
        .catch(function(e){status(message,e.message,true);save.disabled=false;});
    });
    node.appendChild(save);node.appendChild(el('p','This changes the Owner password for every location and ends existing Owner sessions.'));node.appendChild(message);
    if(context.group.type==='food_court') {
      node.appendChild(el('h3','Pickup display'));var targetBox=el('div');node.appendChild(targetBox);
      var inputs2=locations(targetBox,true);var output=el('input');output.readOnly=true;output.hidden=true;
      var create=button('Create display link',function(){
        var ids=selected(inputs2);if(!ids.length){status(message,'Choose at least one location.',true);return;}
        create.disabled=true;
        request('foodcourt/display',{targets:ids}).then(function(data){output.hidden=false;output.value=data.url;status(message,'Keep this display link private.');})
          .catch(function(e){status(message,e.message,true);}).finally(function(){create.disabled=false;});
      });
      node.appendChild(create);node.appendChild(output);
    }
  }

  function share() {
    var node=dialog('Publish saved changes');
    node.appendChild(el('p','Save in this location first. Publishing changes only the target locations selected below.'));
    var item=el('select');node.appendChild(field('Saved item',item));
    var box=el('div');node.appendChild(box);var inputs=locations(box,false);
    var message=el('p',null,'pmd-group-status');message.setAttribute('role','status');node.appendChild(message);
    var details=el('div',null,'pmd-group-results');node.appendChild(details);
    var operation=null,busy=false,version=0;
    var apply=button('Apply to selected locations',function(){
      if(!operation||busy)return;busy=true;apply.disabled=true;preview.disabled=true;
      status(message,'Applying the reviewed changes...');var current=operation;
      request('publish/apply',{operation:current,overwrite:false}).then(function(data){
        details.replaceChildren();var failed=false;
        (data.results||[]).forEach(function(row){
          var site=context.sites.find(function(s){return Number(s.tenant_id)===Number(row.tenant_id);});
          var label=row.label||(site&&site.label)||('Location '+row.tenant_id);
          details.appendChild(el('p',label+': '+(row.ok?(row.state==='already_applied'?'Already applied':'Applied'):row.message),row.ok?'':'is-error'));
          failed=failed||!row.ok;
        });
        status(message,failed?'Some locations were not confirmed. Retry this operation, or create a new preview after resolving conflicts.':'All selected locations were updated.',failed);
        if(!failed)operation=null;
        apply.textContent=failed?'Retry unfinished locations':'Apply to selected locations';
      }).catch(function(e){status(message,e.message+' A retry uses the same operation identifier.',true);})
        .finally(function(){busy=false;preview.disabled=false;apply.disabled=!operation;});
    });apply.disabled=true;
    var preview=button('Preview locations',function(){
      var ids=selected(inputs);if(!ids.length||!item.value){status(message,'Choose a saved item and at least one other location.',true);return;}
      if(busy)return;busy=true;preview.disabled=true;apply.disabled=true;operation=null;details.replaceChildren();
      var currentVersion=++version;status(message,'Checking selected locations...');
      request('publish/preview',{type:type,entity_id:item.value,targets:ids}).then(function(data){
        if(currentVersion!==version)return;operation=data.operation;
        (data.targets||[]).forEach(function(row){details.appendChild(el('p',row.label+': '+(row.existing?'Update published copy':'Create copy')));});
        status(message,'Review the target list before applying. A later conflict will stop that location.');
      }).catch(function(e){status(message,e.message,true);})
        .finally(function(){busy=false;preview.disabled=false;apply.disabled=!operation;});
    });
    function invalidate(){version++;operation=null;apply.disabled=true;details.replaceChildren();status(message,'Selection changed. Create a new preview.');}
    item.addEventListener('change',invalidate);inputs.forEach(function(i){i.addEventListener('change',invalidate);});
    node.appendChild(preview);node.appendChild(apply);
    preview.disabled=true;
    request('catalog?type='+encodeURIComponent(type)).then(function(data){
      (data.items||[]).forEach(function(row){var option=el('option',row.label);option.value=String(row.id);item.appendChild(option);});
      var match=path.match(/\/menus\/edit\/(\d+)$/);if(match&&Array.from(item.options).some(function(o){return o.value===match[1];}))item.value=match[1];
      preview.disabled=!item.options.length;status(message,item.options.length?'':'No eligible saved items are available.');
    }).catch(function(e){status(message,e.message,true);});
  }

  function overview(bar) {
    if(!context.capabilities.aggregate_dashboard)return;
    var scope=el('select');scope.setAttribute('aria-label','Report location');
    var all=el('option','All locations');all.value='all';scope.appendChild(all);
    context.sites.forEach(function(site){var option=el('option',site.label);option.value=String(site.tenant_id);scope.appendChild(option);});
    var period=el('select');period.setAttribute('aria-label','Reporting period');
    [['today','Today'],['week','This week'],['month','This month'],['last30','Last 30 days']].forEach(function(row){var option=el('option',row[1]);option.value=row[0];period.appendChild(option);});
    bar.appendChild(scope);bar.appendChild(period);
    var panel=el('section',null,'pmd-group-overview');panel.setAttribute('aria-live','polite');bar.after(panel);
    var native=Array.from(document.querySelectorAll('#pmd-r2-reservation-kpis-v307, #pmd-dashboard-lab-analytics-v1'))
      .map(function(node){return {node:node,display:node.style.getPropertyValue('display'),priority:node.style.getPropertyPriority('display')};});
    function render(data){
      panel.replaceChildren();panel.appendChild(el('h3',scope.options[scope.selectedIndex].text+' - settlement overview'));
      if(data.partial)panel.appendChild(el('p','Incomplete overview: one or more locations could not be included.','is-error'));
      (data.totals||[]).forEach(function(total){
        panel.appendChild(el('p',total.currency+' | Recorded settled amount: '+total.revenue+' | Orders: '+total.orders+' | Average settled order: '+(total.average_order===null?'Not available':total.average_order)+' | Tips: '+total.tips));
      });
      (data.locations||[]).forEach(function(site){
        panel.appendChild(el('p',site.label+': '+(site.available?site.revenue+' '+site.currency+' | '+site.orders+' orders | '+site.timezone:site.message),site.available?'':'is-error'));
      });
      panel.appendChild(el('p','Each location uses its own calendar-day boundary. Settled amounts are not a tax, profit, refund or currency-conversion report.'));
      panel.appendChild(el('p','Orders, floor, kitchen, menus and settings still belong to the current subdomain.'));
    }
    function load(){
      var seq=++reportSequence;var local=scope.value===String(context.current_tenant_id);
      native.forEach(function(entry){if(local){entry.node.style.setProperty('display',entry.display,entry.priority);}else{entry.node.style.setProperty('display','none','important');}});
      panel.replaceChildren(el('p','Loading the selected locations...'));
      request('snapshot?scope='+encodeURIComponent(scope.value)+'&period='+encodeURIComponent(period.value))
        .then(function(data){if(seq===reportSequence)render(data);})
        .catch(function(e){if(seq===reportSequence)panel.replaceChildren(el('p',e.message,'is-error'));});
    }
    scope.addEventListener('change',load);period.addEventListener('change',load);bar.appendChild(button('Refresh report',load));load();
  }

  request('context').then(function(data){
    if(!data.enabled)return;context=data;
    var root=document.querySelector('#pmd-dashboard-lab, [data-pmd-ownerboard-v2], .page-content, main');
    if(!root)return;
    var bar=el('div',null,'pmd-group-toolbar');bar.appendChild(el('strong',context.group.name));bar.appendChild(button('Business account',account));
    root.prepend(bar);
    if(dashboard)overview(bar);
    if(type&&context.capabilities.publish)bar.appendChild(button('Apply to locations',share));
  }).catch(function(){ /* Normal login/MFA gates remain the authority. */ });
})();
