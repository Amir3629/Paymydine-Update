#!/usr/bin/env node
/* PMD_PLATFORM_BUTTON_AUDIT_R32
 * Read-only Playwright audit of SAME-ORIGIN GET pages and computed button styles.
 * Sign in manually with your Authenticator in the opened Chromium window.
 * NEVER paste credentials, TOTP codes or storageState into the script/repo.
 *
 * Usage: NODE_PATH="$HOME/.pmd-audit-node/node_modules" node this-file.cjs
 * Options: --max-pages=180 --barcode-debug --base=https://tomo.paymydine.com/admin
 * Browser profile and output remain in the user's local HOME (chmod 0700).
 */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const readline=require('node:readline'),{URL}=require('node:url');
const {chromium}=require('playwright');
const args=process.argv.slice(2);
function arg(name,fallback) {
  const a=args.find(x=>x===name||x.startsWith(name+'='));
  return a?a.slice(name.length+1)||'true':fallback;
}
const base=new URL(arg('--base','https://tomo.paymydine.com/admin'));
if(base.protocol!=='https:'||!base.pathname.startsWith('/admin'))
  throw new Error('Audit is restricted to an HTTPS /admin path.');
const MAX_PAGES=Math.min(500,Math.max(1,Number(arg('--max-pages','180'))||180));
const DEBUG=args.includes('--barcode-debug');
const MANUAL=args.includes('--manual');
const SCREENSHOTS=args.includes('--screenshots');
const PROFILE=path.resolve(arg('--profile',path.join(os.homedir(),'.pmd-button-audit-chromium')));
const REPORT=path.resolve(arg('--output',path.join(os.homedir(),'pmd-button-audit-reports',
  new Date().toISOString().replace(/[:.]/g,'-'))));
for(const dir of [PROFILE,REPORT])fs.mkdirSync(dir,{recursive:true,mode:0o700});
let readme='PayMyDine button style audit. Reports are PRIVATE local files. No passwords, tokens, cookies or HTML are exported. Do not share reports without review.\n';
fs.writeFileSync(path.join(REPORT,'README-PRIVATE.txt'),readme,{mode:0o600});
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const ask=question=>new Promise(resolve=>rl.question(question,resolve));
function canonical(href) {
  try{
    const u=new URL(href,base);
    if(u.origin!==base.origin||!u.pathname.startsWith('/admin'))return null;
    if(/(?:^|\/)(?:logout|signout|delete|destroy|remove|reset|clear|refund|void|process|execute|pay|capture|download|export|print|impersonate)(?:\/|$)/i.test(u.pathname))return null;
    if(/\.(?:pdf|csv|xlsx?|zip|png|jpe?g|webp|svg|mp4|ics)$/i.test(u.pathname))return null;
    const query=new URLSearchParams();
    for(const k of ['workspace','tab','view','section']){
      const v=u.searchParams.get(k);
      if(v&&/^[\w-]{1,35}$/.test(v))query.set(k,v);
    }
    return u.origin+u.pathname.replace(/\/+$/,'')+(query.size?'?'+query.toString():'');
  }catch{return null;}
}
function safePath(href) {
  const u=new URL(href);
  return u.pathname+u.search; // only known non-sensitive query keys from canonical()
}
function csv(rows,fields) {
  return [fields.join(','),...rows.map(r=>fields.map(field=>{
    const value=r[field]==null?'':String(r[field]);
    return '"'+value.replace(/"/g,'""').replace(/[\r\n\t]+/g,' ')+'"';
  }).join(','))].join('\n')+'\n';
}
function save(file,content) {
  fs.writeFileSync(path.join(REPORT,file),content,{mode:0o600});
}
async function capture(page) {
  return await page.evaluate(() => {
    const all=Array.from(document.querySelectorAll(
      'button,input[type="button"],input[type="submit"],input[type="reset"],a.btn,a[role="button"],label.btn,[role="tab"]'
    ));
    const buttons=all.slice(0,4000).map((node,index)=>{
      const style=getComputedStyle(node),rect=node.getBoundingClientRect();
      const accessible=String(node.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim();
      // Do not read regular input values or element HTML. Button captions
      // can still contain business data: reports are local/private.
      const label=(node.matches('input[type="button"],input[type="submit"],input[type="reset"]')
        ?String(node.value||''):String(node.textContent||accessible))
        .replace(/\s+/g,' ').trim().slice(0,110);
      const visible=rect.width>0&&rect.height>0&&style.display!=='none'&&
        style.visibility!=='hidden'&&!node.closest('[hidden],[inert]');
      const role=node.getAttribute('data-pmd-admin-action-r29')||'';
      const selected=node.classList.contains('is-active')||
        node.classList.contains('active')||
        node.getAttribute('aria-selected')==='true'||
        node.getAttribute('aria-pressed')==='true';
      const classes=typeof node.className==='string'?node.className.trim().slice(0,220):'';
      const ids=Array.from(node.attributes).filter(x=>x.name.startsWith('data-'))
        .map(x=>x.name).slice(0,12).join('|');
      const kind=node.closest('#pmd-inventory-v1')?'inventory':
        node.closest('#pmd-r2-shared-floor-canvas-v310')?'floor':
        node.closest('[data-pmd-pos-root],.pmd-pos-grid,.pmd-pos-keypad')?'pos':
        node.closest('.order-status-buttons,#orders-grid')?'kds':
        node.closest('#pmd-side-menu2,.pmd-side-menu2')?'sidebar':'general';
      const radius=parseFloat(style.borderTopLeftRadius)||0;
      const lowRadius=visible&&kind==='general'&&role&&radius<10;
      const missingRole=visible&&kind==='general'&&!role&&node.matches('button,input[type="button"],input[type="submit"],a.btn,a[role="button"]');
      const primaryPlain=visible&&role==='primary'&&
        style.backgroundImage==='none'&&!style.backgroundColor.includes('7, 92, 71');
      return {
        index,tag:node.localName,type:node.getAttribute('type')||'',
        label:label||accessible.slice(0,110),classes,selectorId:node.id||'',
        dataNames:ids,kind,role,visible,selected,
        height:Math.round(rect.height),width:Math.round(rect.width),
        borderRadius:style.borderRadius,borderColor:style.borderColor,
        borderWidth:style.borderWidth,background:style.backgroundColor,
        gradient:style.backgroundImage.slice(0,190),color:style.color,
        shadow:style.boxShadow.slice(0,170),fontSize:style.fontSize,
        fontWeight:style.fontWeight,cursor:style.cursor,
        anomaly:lowRadius?'tagged-small-radius':missingRole?'untagged-general':primaryPlain?'primary-no-gradient':''
      };
    });
    const summary={
      title:String(document.title||'').slice(0,120),
      totalButtons:all.length,captured:buttons.length,
      visible:buttons.filter(b=>b.visible).length,
      tagged:buttons.filter(b=>b.visible&&b.role).length,
      untaggedGeneral:buttons.filter(b=>b.anomaly==='untagged-general').length,
      smallRadius:buttons.filter(b=>b.anomaly==='tagged-small-radius').length,
      primaryNoGradient:buttons.filter(b=>b.anomaly==='primary-no-gradient').length,
      r29Ready:!!window.PMDAdminControlLanguageR29,
      r31CSS:!!document.querySelector('link[data-pmd-inventory-barcode-floor-r31="css"]'),
      auditDate:new Date().toISOString()
    };
    const nav=Array.from(document.querySelectorAll('a[href]')).slice(0,3500)
      .map(a=>a.href).filter(Boolean);
    return {summary,buttons,nav};
  });
}
async function barcodeDiagnostic(page) {
  return await page.evaluate(()=>{
    const input=document.querySelector('input[data-r19-barcode-input]');
    if(!input)return {found:false};
    const frame=input.closest('.pmd-inv-r23-barcode__input');
    function snapshot(el){
      if(!el)return null;
      const c=getComputedStyle(el),r=el.getBoundingClientRect();
      return {
        name:el.localName,className:el.className,
        active:document.activeElement===el,rect:{x:r.x,y:r.y,width:r.width,height:r.height},
        border:c.border,borderRadius:c.borderRadius,outline:c.outline,
        boxShadow:c.boxShadow,background:c.backgroundColor,
        appearance:c.appearance,webkitAppearance:c.webkitAppearance,
        inline:{borderColor:el.style.getPropertyValue('border-color'),
          borderPriority:el.style.getPropertyPriority('border-color'),
          shadow:el.style.getPropertyValue('box-shadow'),
          shadowPriority:el.style.getPropertyPriority('box-shadow')}
      };
    }
    const modal=input.closest('[data-pmd-inv-r25-dialog]');
    return {
      found:true,modalOpen:!!modal&&!modal.hidden,activeElement:document.activeElement?.getAttribute('data-r19-barcode-input')!==null,
      globalFocusFix:!!Array.from(document.scripts).find(s=>s.src.includes('fix-form-field-focus-colors.js')),
      field:snapshot(input),frame:snapshot(frame),
      wrapper:snapshot(input.closest('.pmd-inv-r23-barcode'))
    };
  });
}
(async()=>{
  let context;
  try{
    console.log('Read-only button audit. Browser profile:',PROFILE);
    console.log('Local report directory:',REPORT);
    console.log('No credentials or one-time codes are read by the script.');
    context=await chromium.launchPersistentContext(PROFILE,{
      headless:false,viewport:{width:1512,height:950},
      acceptDownloads:false,
      locale:'en-US'
    });
    const page=context.pages()[0]||await context.newPage();
    page.on('dialog',dialog=>dialog.dismiss().catch(()=>{}));
    await page.goto(base.href,{waitUntil:'domcontentloaded',timeout:30000});
    await ask('\nSign in in Chromium, complete Authenticator if prompted, then press ENTER here to start the READ-ONLY audit: ');
    if(!page.url().startsWith(base.origin+'/admin')||/\/login\b/i.test(new URL(page.url()).pathname)){
      throw new Error('Not on a logged-in /admin page. Login must be completed manually.');
    }

    const queue=[],known=new Set(),seen=new Set(),pages=[],rows=[];
    function enqueue(url) {
      const u=canonical(url);
      if(!u||seen.has(u)||known.has(u)||queue.length>1500)return;
      known.add(u);queue.push(u);
    }
    // Known safe GET workspace entry points, then discover actual authorized links.
    [
      '/admin','/admin/dashboardlab','/admin/managerlab',
      '/admin/pmdmenus','/admin/menu?workspace=inventory',
      '/admin/reservations','/admin/reservations2','/admin/shifts',
      '/admin/discounts','/admin/settings','/admin/reports',
      '/admin/accountantdashboard','/admin/pmdintelligence','/admin/pos'
    ].forEach(enqueue);
    enqueue(page.url());
    while(queue.length&&pages.length<MAX_PAGES){
      const href=queue.shift();if(seen.has(href))continue;
      seen.add(href);
      const name=safePath(href);
      try{
        const response=await page.goto(href,{waitUntil:'domcontentloaded',timeout:25000});
        await page.waitForTimeout(800);
        const actual=canonical(page.url());
        if(!actual||/\/login\b/i.test(new URL(page.url()).pathname)){
          pages.push({path:name,status:0,error:'authentication required / redirected out of /admin'});
          console.log('AUTH STOP',name);
          break;
        }
        const record=await capture(page);
        if(SCREENSHOTS) {
          const folder=path.join(REPORT,'screenshots');
          fs.mkdirSync(folder,{recursive:true,mode:0o700});
          const number=String(pages.length+1).padStart(3,'0');
          const slug=encodeURIComponent(safePath(actual)).replace(/%/g,'_').slice(0,95);
          await page.screenshot({path:path.join(folder,number+'-'+slug+'.png'),
            fullPage:false,animations:'disabled'}).catch(err=>{
            console.warn('Screenshot unavailable for',safePath(actual),String(err.message||err).slice(0,80));
          });
        }
        const sum={path:safePath(actual),requested:name,status:response?.status()||0,...record.summary};
        pages.push(sum);
        for(const b of record.buttons)rows.push({page:sum.path,...b});
        for(const link of record.nav)enqueue(link);
        console.log('['+pages.length+'/'+MAX_PAGES+']',sum.path,'buttons',sum.totalButtons,
          'visible',sum.visible,'untagged general',sum.untaggedGeneral,'status',sum.status);
      }catch(err){
        pages.push({path:name,status:0,error:String(err.message||err).slice(0,240)});
        console.warn('SKIP:',name,String(err.message||err).slice(0,120));
      }
    }
    save('pages.json',JSON.stringify(pages,null,2));
    save('buttons.json',JSON.stringify(rows,null,2));
    save('overview.csv',csv(pages,['path','status','title','totalButtons','visible','tagged','untaggedGeneral','smallRadius','primaryNoGradient','r29Ready','r31CSS','error']));
    const fields=['page','index','kind','tag','label','role','visible','selected','height','width','borderRadius','borderColor','background','gradient','color','fontSize','fontWeight','classes','dataNames','anomaly'];
    save('buttons.csv',csv(rows,fields));
    save('possible-inconsistencies.csv',csv(rows.filter(b=>!!b.anomaly),fields));
    const overview={
      pagesAttempted:pages.length,buttonsRecorded:rows.length,
      pagesWithIssues:pages.filter(p=>(p.untaggedGeneral||0)+(p.smallRadius||0)+(p.primaryNoGradient||0)>0).length,
      untaggedGeneral:rows.filter(b=>b.anomaly==='untagged-general').length,
      taggedSmallRadius:rows.filter(b=>b.anomaly==='tagged-small-radius').length,
      missingPrimaryGradient:rows.filter(b=>b.anomaly==='primary-no-gradient').length,
      otherPathsInQueue:queue.length,notes:[
        'Read-only GET navigation only; never clicks Save/Delete/Order/Payment buttons.',
        'Only role-accessible discovered GET pages were inspected; this is not proof of every possible role/tenant/modal.',
        'Open dialogs and custom SPA routes require guided --barcode-debug or an additional manual capture.',
        'Reports and persistent browser session are PRIVATE on this computer; never commit or publish them.',
        'Add --screenshots for local viewport images of each visited page, with possible business-sensitive content.'
      ]
    };
    save('summary.json',JSON.stringify(overview,null,2));
    console.log('\nAUDIT COMPLETE',JSON.stringify(overview,null,2));
    if(DEBUG){
      const inventory=canonical('/admin/menu?workspace=inventory');
      await page.goto(inventory,{waitUntil:'domcontentloaded',timeout:30000});
      await ask('\nIn Chromium open "Scan barcode / QR", click INSIDE the scan field, then press ENTER here: ');
      const diagnosis=await barcodeDiagnostic(page);
      save('barcode-diagnostic.json',JSON.stringify(diagnosis,null,2));
      const barcodeCapture=await capture(page);
      save('barcode-open-buttons.json',JSON.stringify(barcodeCapture.buttons.filter(x=>x.visible),null,2));
      console.log('Barcode detail saved:',path.join(REPORT,'barcode-diagnostic.json'));
      console.log('Visible scanner-modal controls saved:',path.join(REPORT,'barcode-open-buttons.json'));
      console.log('Scanner inline focus styles:',diagnosis.field?.inline||'not found');
    }
    if(MANUAL) {
      const manual=[];
      console.log('\nManual dialog capture: browse to ANY safe Admin page, open cards or tabs WITHOUT saving changes.');
      for(let i=0;i<25;i++){
        const reply=(await ask('Open any card in Chromium, press ENTER to capture; type "done" to finish: ')).trim().toLowerCase();
        if(reply==='done'||reply==='exit')break;
        const current=canonical(page.url());
        if(!current){console.warn('Skipping a page outside this tenant /admin');continue;}
        const snapshot=await capture(page);
        manual.push({path:safePath(current),title:snapshot.summary.title,buttons:snapshot.buttons});
        console.log('Captured',manual.length,'manual views; visible buttons',snapshot.summary.visible);
      }
      save('manual-dialog-captures.json',JSON.stringify(manual,null,2));
    }
    console.log('\nFiles saved LOCALLY at',REPORT);
    console.log('If sharing, review the local CSV/JSON first for business-sensitive text.');
  }catch(error){
    console.error('AUDIT STOP:',error&&error.stack||error);
    process.exitCode=1;
  }finally{
    rl.close();
    if(context)await context.close().catch(()=>{});
  }
})();
