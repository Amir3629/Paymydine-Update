(function () {
  'use strict';

  if (window.PMDSumupSelfServiceV1) return;

  var state = {root:null,data:null,environment:'test',busy:false,message:'',error:false};

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }
  function csrf() { var meta=document.querySelector('meta[name="csrf-token"]'); return meta ? meta.content : ''; }
  function jsonHeaders() { return {'Accept':'application/json','Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':csrf()}; }

  async function request(url, options) {
    var opts=Object.assign({credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':csrf()}},options||{});
    var response=await fetch(url,opts); var json=await response.json().catch(function(){return {};});
    if(!response.ok||json.success===false) throw new Error(String(json.message||json.error||('HTTP '+response.status)));
    return json;
  }

  function current() {
    var environments=state.data&&state.data.environments?state.data.environments:{};
    return environments[state.environment]||{environment:state.environment,configured:false,connection_status:'not_configured',terminals:[]};
  }
  function statusLabel(snapshot) {
    if(snapshot.connection_status==='connected') return 'Connected';
    if(snapshot.connection_status==='error') return 'Needs attention';
    if(snapshot.configured) return 'Not tested';
    return 'Not connected';
  }
  function tab(key,label) {
    var cfg=state.data.environments&&state.data.environments[key]?state.data.environments[key]:{};
    return '<button type="button" data-sumup-env="'+key+'" class="'+(state.environment===key?'is-active':'')+'">'+(cfg.connection_status==='connected'?'<i></i>':'')+esc(label)+'</button>';
  }
  function field(label,key,type,value,placeholder,readonly) {
    return '<label class="pmd-sumup-field"><span>'+esc(label)+'</span><input data-sumup-field="'+esc(key)+'" type="'+esc(type)+'" value="'+esc(value)+'" placeholder="'+esc(placeholder||'')+'" '+(readonly?'readonly':'')+' autocomplete="off"></label>';
  }
  function pairPanel() {
    return '<section class="pmd-sumup-panel"><div class="pmd-sumup-panel-head"><div><b>Add terminal</b><span>On the Solo open Cloud API and enter the temporary pairing code here.</span></div></div><div class="pmd-sumup-pair"><label><span>Pairing code</span><input data-sumup-pair-code maxlength="9" placeholder="XXXXXXXXX" autocomplete="off"></label><label><span>Terminal name</span><input data-sumup-pair-label maxlength="191" placeholder="Front Desk, Bar, Terrace…" autocomplete="off"></label><button type="button" class="is-primary" data-sumup-pair '+(state.busy?'disabled':'')+'>Pair terminal</button></div><small class="pmd-sumup-pair-note">The pairing code is temporary. PayMyDine stores the real Reader ID automatically after pairing.</small></section>';
  }
  function terminalRow(terminal) {
    var online=!!terminal.online;
    return '<article class="pmd-sumup-terminal"><div class="pmd-sumup-terminal-icon">▣</div><div class="pmd-sumup-terminal-copy"><b>'+esc(terminal.label||'SumUp terminal')+'</b><span class="'+(online?'is-online':'is-offline')+'"><i></i>'+(online?'Online':esc(String(terminal.status||'Offline').toLowerCase()))+'</span></div><div class="pmd-sumup-terminal-actions"><button type="button" data-sumup-terminal-test="'+esc(terminal.terminal_device_id)+'" '+(state.busy?'disabled':'')+'>Test</button><button type="button" class="is-danger" data-sumup-terminal-remove="'+esc(terminal.terminal_device_id)+'" '+(state.busy?'disabled':'')+'>Remove</button></div></article>';
  }
  function terminalList(terminals) {
    return '<section class="pmd-sumup-panel"><div class="pmd-sumup-panel-head"><div><b>Terminals</b><span>Cashiers can choose between these terminals when more than one is available.</span></div></div>'+(terminals.length?'<div class="pmd-sumup-terminals">'+terminals.map(terminalRow).join('')+'</div>':'<div class="pmd-sumup-empty">No terminal paired in this environment yet.</div>')+'</section>';
  }

  function render() {
    if(!state.root) return;
    if(!state.data){state.root.innerHTML='<div class="pmd-sumup-loading">Loading SumUp settings…</div>';return;}
    var cfg=current(); var connected=cfg.connection_status==='connected'; var terminals=Array.isArray(cfg.terminals)?cfg.terminals:[]; var activeEnvironment=state.data.active_environment||null; var appId=state.data.app_id||'com.paymydine.cloud';
    state.root.innerHTML=[
      '<div class="pmd-sumup-head"><div><span class="pmd-sumup-kicker">CARD TERMINALS</span><h2>SumUp</h2><p>Connect this restaurant’s own SumUp account, then pair one or more Solo terminals.</p></div><div class="pmd-sumup-state ',connected?'is-good':'','"><span></span>',esc(statusLabel(cfg)),'</div></div>',
      '<div class="pmd-sumup-tabs" role="tablist">',tab('test','Test'),tab('production','Production'),'</div>',
      state.message?'<div class="pmd-sumup-message '+(state.error?'is-error':'is-success')+'">'+esc(state.message)+'</div>':'',
      '<section class="pmd-sumup-panel"><div class="pmd-sumup-panel-head"><div><b>Connection</b><span>',state.environment==='test'?'Use your SumUp sandbox credentials.':'Use the restaurant’s live SumUp credentials.','</span></div>',activeEnvironment===state.environment?'<em>Used for payments</em>':'','</div>',
      '<div class="pmd-sumup-fields">',field('Secret API Key','api-key','password','',cfg.api_key_present?'Saved — leave blank to keep it':'sup_sk_…'),field('Affiliate Key','affiliate-key','password','',cfg.affiliate_key_present?'Saved — leave blank to keep it':'sup_afk_…'),field('Merchant Code','merchant-code','text',cfg.merchant_code||'','Shown in the SumUp account / sandbox'),field('PayMyDine App ID','app-id','text',appId,'',true),'</div>',
      '<div class="pmd-sumup-help">Keys are stored only inside this restaurant tenant. Saved secrets are never shown back in the browser.</div><div class="pmd-sumup-actions"><button type="button" class="is-primary" data-sumup-save ',state.busy?'disabled':'','>Save &amp; test connection</button>',cfg.configured?'<button type="button" data-sumup-test '+(state.busy?'disabled':'')+'>Test saved connection</button>':'',connected&&activeEnvironment!==state.environment?'<button type="button" data-sumup-activate '+(state.busy?'disabled':'')+'>Use '+esc(state.environment)+' for payments</button>':'','</div>',cfg.last_error?'<p class="pmd-sumup-error-text">'+esc(cfg.last_error)+'</p>':'','</section>',
      connected?pairPanel():'<section class="pmd-sumup-panel is-muted"><b>Terminals</b><p>Save and test the connection first. Then PayMyDine can pair the restaurant’s Solo terminals.</p></section>',
      connected?terminalList(terminals):''
    ].join('');
    bind();
  }

  function bind() {
    state.root.querySelectorAll('[data-sumup-env]').forEach(function(button){button.onclick=function(){state.environment=button.dataset.sumupEnv;state.message='';state.error=false;render();};});
    var save=state.root.querySelector('[data-sumup-save]'); if(save) save.onclick=saveConnection;
    var test=state.root.querySelector('[data-sumup-test]'); if(test) test.onclick=testConnection;
    var activate=state.root.querySelector('[data-sumup-activate]'); if(activate) activate.onclick=activateEnvironment;
    var pair=state.root.querySelector('[data-sumup-pair]'); if(pair) pair.onclick=pairTerminal;
    state.root.querySelectorAll('[data-sumup-terminal-test]').forEach(function(button){button.onclick=function(){testTerminal(Number(button.dataset.sumupTerminalTest));};});
    state.root.querySelectorAll('[data-sumup-terminal-remove]').forEach(function(button){button.onclick=function(){removeTerminal(Number(button.dataset.sumupTerminalRemove));};});
  }
  function input(name){var el=state.root.querySelector('[data-sumup-field="'+name+'"]');return el?String(el.value||'').trim():'';}

  async function act(fn){if(state.busy)return;state.busy=true;state.message='';state.error=false;render();try{await fn();}catch(error){state.message=error.message||'SumUp request failed.';state.error=true;}finally{state.busy=false;render();}}
  async function saveConnection(){await act(async function(){var json=await request('/admin/pmddevices/sumup/connection',{method:'POST',headers:jsonHeaders(),body:JSON.stringify({environment:state.environment,api_key:input('api-key'),affiliate_key:input('affiliate-key'),merchant_code:input('merchant-code')})});state.data=json.state;state.message=json.message||'Connected to SumUp.';});}
  async function testConnection(){await act(async function(){var json=await request('/admin/pmddevices/sumup/connection/test',{method:'POST',headers:jsonHeaders(),body:JSON.stringify({environment:state.environment})});state.data=json.state;state.message=json.message||'Connection is working.';});}
  async function activateEnvironment(){await act(async function(){var json=await request('/admin/pmddevices/sumup/environment',{method:'POST',headers:jsonHeaders(),body:JSON.stringify({environment:state.environment})});state.data=json.state;state.message=json.message||'Environment activated.';});}
  async function pairTerminal(){var code=state.root.querySelector('[data-sumup-pair-code]');var label=state.root.querySelector('[data-sumup-pair-label]');await act(async function(){var json=await request('/admin/pmddevices/sumup/readers/pair',{method:'POST',headers:jsonHeaders(),body:JSON.stringify({environment:state.environment,pairing_code:code?String(code.value||'').trim().toUpperCase():'',label:label?String(label.value||'').trim():''})});state.data=json.state;state.message=json.message||'Terminal paired.';});}
  async function testTerminal(id){await act(async function(){var json=await request('/admin/pmddevices/sumup/readers/'+encodeURIComponent(String(id))+'/test',{method:'POST',headers:jsonHeaders(),body:'{}'});state.data=json.state;state.message=json.message||'Terminal tested.';});}
  async function removeTerminal(id){if(!window.confirm('Remove this SumUp terminal from PayMyDine?'))return;await act(async function(){var json=await request('/admin/pmddevices/sumup/readers/'+encodeURIComponent(String(id)),{method:'DELETE',headers:jsonHeaders(),body:'{}'});state.data=json.state;state.message=json.message||'Terminal removed.';});}

  async function load(){try{var json=await request('/admin/pmddevices/sumup/state');state.data=json.state;if(state.data.active_environment)state.environment=state.data.active_environment;else if(state.data.environments&&state.data.environments.test&&state.data.environments.test.configured)state.environment='test';render();}catch(error){state.root.innerHTML='<div class="pmd-sumup-message is-error">'+esc(error.message||'Could not load SumUp settings.')+'</div>';}}
  function mount(){if(!/^\/admin\/pmddevices(?:\/|$)/.test(location.pathname))return;var section=document.getElementById('payment-terminals');if(!section)return;var card=section.querySelector('.pmd-owner-card');if(!card||card.dataset.pmdSumupSelfService==='1')return;card.dataset.pmdSumupSelfService='1';card.classList.add('pmd-sumup-self-service');card.innerHTML='<div class="pmd-sumup-app" data-pmd-sumup-app></div>';state.root=card.querySelector('[data-pmd-sumup-app]');load();}

  window.PMDSumupSelfServiceV1={mount:mount,reload:load};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
