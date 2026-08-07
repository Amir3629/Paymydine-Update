(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,74669,e=>{"use strict";var t=e.i(48277),a=e.i(30668),r=e.i(94576),n=e.i(44420),o=e.i(57012),i=e.i(98052),l=e.i(94677),d=e.i(76053),s=e.i(22368),m=e.i(3333),c=e.i(90294),p=e.i(87635);function k({title:e,eyebrow:a,onClose:r,children:n}){return(0,t.jsx)("div",{className:"kazen-solid-modal-overlay pmd-kazen-action-overlay",role:"dialog","aria-modal":"true","aria-label":e,onClick:r,children:(0,t.jsxs)("article",{className:"kazen-solid-modal-panel pmd-kazen-action-card","data-kazen-solid-panel":"1",onClick:e=>e.stopPropagation(),children:[(0,t.jsx)("div",{className:"kazen-solid-modal-sheet pmd-kazen-action-sheet","aria-hidden":"true"}),(0,t.jsxs)("div",{className:"kazen-solid-modal-content pmd-kazen-action-content",children:[(0,t.jsxs)("header",{className:"kazen-solid-modal-head pmd-kazen-action-head",children:[(0,t.jsxs)("div",{className:"pmd-kazen-action-title-block",children:[a?(0,t.jsx)("div",{className:"kazen-solid-eyebrow pmd-kazen-action-eyebrow",children:a}):null,(0,t.jsx)("h2",{children:e})]}),(0,t.jsx)("button",{type:"button",className:"kazen-solid-close pmd-kazen-action-close",onClick:r,"aria-label":"Close",children:(0,t.jsx)(p.X,{"aria-hidden":"true"})})]}),(0,t.jsx)("div",{className:"pmd-kazen-action-body",children:n})]})]})})}function u({item:e,images:r,price:n,quantity:o,onClose:i,onDecrease:l,onIncrease:d,onAdd:s}){let[m,c]=(0,a.useState)(0),k=r.filter(Boolean),h=k[m]||k[0]||"",b=k.length>1;(0,a.useEffect)(()=>{c(0)},[e.id]),(0,a.useEffect)(()=>{if(!b)return;let e=window.setInterval(()=>{c(e=>(e+1)%k.length)},4800);return()=>window.clearInterval(e)},[b,k.length]),(0,a.useEffect)(()=>{let e=e=>{"Escape"===e.key&&i()};return window.addEventListener("keydown",e),()=>window.removeEventListener("keydown",e)},[i]),(0,a.useEffect)(()=>{if("u"<typeof document)return;let e=!1,t=(e,t)=>{e&&Object.entries(t).forEach(([t,a])=>e.style.setProperty(t,a,"important"))},a=()=>{e||(t(document.querySelector(".pmd-kazen-detail-card"),{"border-radius":"0",width:"min(92vw, 460px)","max-height":"min(92dvh, 760px)"}),t(document.querySelector(".pmd-kazen-detail-header h2"),{"font-size":"clamp(1.75rem, 5.8vw, 2.55rem)","line-height":"1","letter-spacing":".075em","overflow-wrap":"normal","word-break":"normal"}),t(document.querySelector(".pmd-kazen-detail-close"),{"border-radius":"0"}),t(document.querySelector(".pmd-kazen-detail-media"),{"border-radius":"0",width:"fit-content","max-width":"calc(100% - 44px)",background:"transparent"}),t(document.querySelector(".pmd-kazen-detail-image"),{display:"block",width:"auto","max-width":"100%",height:"auto","max-height":"min(35dvh, 310px)","object-fit":"contain","border-radius":"0"}),document.querySelectorAll(".pmd-kazen-detail-stepper-action").forEach((e,a)=>{t(e,{display:"inline-flex","align-items":"center","justify-content":"center",width:"34px",height:"34px","min-width":"34px","min-height":"34px","border-radius":"0",background:"transparent","background-color":"transparent",color:"#242320","box-shadow":"none","font-family":"Inter, ui-sans-serif, system-ui, sans-serif","font-size":"1.38rem","font-weight":"800","line-height":"1",cursor:"pointer","user-select":"none","touch-action":"manipulation"}),t(e,0===a?{"border-right":"1px solid rgba(36, 35, 32, .16)","border-left":"0","border-top":"0","border-bottom":"0"}:{"border-left":"1px solid rgba(36, 35, 32, .16)","border-right":"0","border-top":"0","border-bottom":"0"})}),t(document.querySelector(".pmd-kazen-detail-stepper"),{display:"inline-grid","grid-template-columns":"34px 38px 34px",height:"36px",width:"106px","border-radius":"0",overflow:"hidden",background:"rgba(255, 252, 246, .68)"}),t(document.querySelector(".pmd-kazen-detail-stepper strong"),{height:"34px","min-height":"34px","font-size":".95rem",color:"#242320",background:"rgba(255,255,255,.32)"}),t(document.querySelector(".pmd-kazen-detail-add"),{background:"#b85d59",color:"#fffaf3","border-color":"rgba(184, 93, 89, .62)","border-radius":"0"}))};a();let r=window.requestAnimationFrame(a),n=[window.setTimeout(a,80),window.setTimeout(a,300),window.setTimeout(a,900)];return()=>{e=!0,window.cancelAnimationFrame(r),n.forEach(e=>window.clearTimeout(e))}},[e.id,o,m]),(0,a.useEffect)(()=>{if("u"<typeof document||"dark"!==(document.documentElement.getAttribute("data-pmd-kazen-mode")||document.body?.getAttribute("data-pmd-kazen-mode")))return;let e=!1,t=(e,t)=>{e&&Object.entries(t).forEach(([t,a])=>e.style.setProperty(t,a,"important"))},a=()=>{e||(t(document.querySelector(".pmd-kazen-detail-overlay"),{background:"rgba(0, 0, 0, .78)","backdrop-filter":"blur(12px) saturate(1.02)","-webkit-backdrop-filter":"blur(12px) saturate(1.02)"}),t(document.querySelector(".pmd-kazen-detail-card"),{background:"linear-gradient(180deg, #17120d 0%, #090705 100%)","background-color":"#090705",color:"#f6e8c8",border:"1px solid rgba(198, 164, 93, .50)","box-shadow":"0 34px 90px rgba(0,0,0,.82), inset 0 1px 0 rgba(255,238,196,.08)"}),t(document.querySelector(".pmd-kazen-detail-eyebrow"),{color:"#df685d","-webkit-text-fill-color":"#df685d"}),t(document.querySelector(".pmd-kazen-detail-header h2"),{color:"#f6e8c8","-webkit-text-fill-color":"#f6e8c8"}),t(document.querySelector(".pmd-kazen-detail-close"),{background:"rgba(246, 232, 200, .06)","background-color":"rgba(246, 232, 200, .06)",border:"1px solid rgba(198, 164, 93, .38)",color:"#f6e8c8","-webkit-text-fill-color":"#f6e8c8"}),document.querySelectorAll(".pmd-kazen-detail-close svg, .pmd-kazen-detail-close svg *").forEach(e=>{t(e,{color:"#f6e8c8",stroke:"#f6e8c8",fill:"none"})}),t(document.querySelector(".pmd-kazen-detail-image"),{border:"1px solid rgba(198, 164, 93, .28)","box-shadow":"0 16px 38px rgba(0,0,0,.36)",background:"#11100d"}),t(document.querySelector(".pmd-kazen-detail-description"),{color:"rgba(246, 232, 200, .78)","-webkit-text-fill-color":"rgba(246, 232, 200, .78)"}),t(document.querySelector(".pmd-kazen-detail-purchase-row"),{"border-top":"1px solid rgba(198, 164, 93, .24)","border-bottom":"1px solid rgba(198, 164, 93, .24)"}),t(document.querySelector(".pmd-kazen-detail-price span"),{color:"rgba(246, 232, 200, .58)","-webkit-text-fill-color":"rgba(246, 232, 200, .58)"}),t(document.querySelector(".pmd-kazen-detail-price strong"),{color:"#f6e8c8","-webkit-text-fill-color":"#f6e8c8"}),t(document.querySelector(".pmd-kazen-detail-stepper"),{background:"rgba(246, 232, 200, .055)","background-color":"rgba(246, 232, 200, .055)",border:"1px solid rgba(198, 164, 93, .34)"}),document.querySelectorAll(".pmd-kazen-detail-stepper-action").forEach((e,a)=>{t(e,{background:"transparent","background-color":"transparent",color:"#f6e8c8","-webkit-text-fill-color":"#f6e8c8"}),t(e,0===a?{"border-right":"1px solid rgba(198, 164, 93, .28)","border-left":"0","border-top":"0","border-bottom":"0"}:{"border-left":"1px solid rgba(198, 164, 93, .28)","border-right":"0","border-top":"0","border-bottom":"0"})}),t(document.querySelector(".pmd-kazen-detail-stepper strong"),{background:"rgba(255,255,255,.035)","background-color":"rgba(255,255,255,.035)",color:"#f6e8c8","-webkit-text-fill-color":"#f6e8c8"}),t(document.querySelector(".pmd-kazen-detail-cancel"),{background:"rgba(246, 232, 200, .055)","background-color":"rgba(246, 232, 200, .055)",border:"1px solid rgba(198, 164, 93, .30)",color:"#f6e8c8","-webkit-text-fill-color":"#f6e8c8"}),t(document.querySelector(".pmd-kazen-detail-add"),{background:"#b85d59","background-color":"#b85d59",border:"1px solid rgba(223, 104, 93, .74)",color:"#fffaf3","-webkit-text-fill-color":"#fffaf3","box-shadow":"0 14px 34px rgba(184, 93, 89, .24)"}))};a();let r=window.requestAnimationFrame(a),n=[window.setTimeout(a,80),window.setTimeout(a,300),window.setTimeout(a,900)];return()=>{e=!0,window.cancelAnimationFrame(r),n.forEach(e=>window.clearTimeout(e))}},[e.id,o,m]);let g=(e,t)=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),t())};return(0,t.jsx)("div",{className:"pmd-kazen-detail-overlay",role:"dialog","aria-modal":"true","aria-label":`${e.name} details`,onClick:i,children:(0,t.jsxs)("article",{className:"pmd-kazen-detail-card",onClick:e=>e.stopPropagation(),children:[(0,t.jsxs)("header",{className:"pmd-kazen-detail-header",children:[(0,t.jsxs)("div",{className:"pmd-kazen-detail-title-block",children:[(0,t.jsx)("span",{className:"pmd-kazen-detail-eyebrow",children:"Item detail"}),(0,t.jsx)("h2",{children:e.name})]}),(0,t.jsx)("button",{type:"button",className:"pmd-kazen-detail-close",onClick:i,"aria-label":"Close item detail",children:(0,t.jsx)(p.X,{"aria-hidden":"true"})})]}),h?(0,t.jsxs)("figure",{className:"pmd-kazen-detail-media","aria-label":`${e.name} image gallery`,children:[(0,t.jsx)("img",{src:h,alt:e.name,className:"pmd-kazen-detail-image"},h),b?(0,t.jsx)("div",{className:"pmd-kazen-detail-dots","aria-label":"Item images",children:k.map((e,a)=>(0,t.jsx)("button",{type:"button",className:a===m?"is-active":"","aria-label":`Show image ${a+1}`,onClick:()=>c(a)},`${e}-${a}`))}):null]}):null,(0,t.jsxs)("section",{className:"pmd-kazen-detail-body",children:[(0,t.jsx)("p",{className:"pmd-kazen-detail-description",children:e.description||"Prepared with seasonal intention."}),(0,t.jsxs)("div",{className:"pmd-kazen-detail-purchase-row",children:[(0,t.jsxs)("div",{className:"pmd-kazen-detail-price",children:[(0,t.jsx)("span",{children:"Price"}),(0,t.jsx)("strong",{children:n})]}),(0,t.jsxs)("div",{className:"pmd-kazen-detail-stepper","aria-label":"Quantity",children:[(0,t.jsx)("span",{role:"button",tabIndex:0,className:"pmd-kazen-detail-stepper-action pmd-kazen-detail-stepper-minus","aria-label":"Decrease quantity",onClick:l,onKeyDown:e=>g(e,l),children:"−"}),(0,t.jsx)("strong",{children:o}),(0,t.jsx)("span",{role:"button",tabIndex:0,className:"pmd-kazen-detail-stepper-action pmd-kazen-detail-stepper-plus","aria-label":"Increase quantity",onClick:d,onKeyDown:e=>g(e,d),children:"+"})]})]}),(0,t.jsxs)("div",{className:"pmd-kazen-detail-actions",children:[(0,t.jsx)("button",{type:"button",className:"pmd-kazen-detail-cancel",onClick:i,children:"Close"}),(0,t.jsx)("button",{type:"button",className:"pmd-kazen-detail-add",onClick:s,children:"Add to order"})]})]})]})})}let h=["/themes/kazen-japanese/category-icons/kazen-category-01.png","/themes/kazen-japanese/category-icons/kazen-category-02.png","/themes/kazen-japanese/category-icons/kazen-category-03.png","/themes/kazen-japanese/category-icons/kazen-category-04.png","/themes/kazen-japanese/category-icons/kazen-category-05.png","/themes/kazen-japanese/category-icons/kazen-category-06.png","/themes/kazen-japanese/category-icons/kazen-category-07.png","/themes/kazen-japanese/category-icons/kazen-category-08.png"],b={restaurantName:"Kazen",tableNumber:null,menuLayout:"accordion",categories:["ALL"],items:[],cart:{count:0,total:0,lines:[]}};function g(e){try{return new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format(Number(e||0))}catch{return`€${Number(e||0).toFixed(2)}`}}function y(e,t={}){window.parent?.postMessage({type:e,...t},window.location.origin)}let z=[];function f(e){return String(e||"").trim().replace(/\s+/g," ").toLowerCase()}function x(e){let t=Array.isArray(e)?e.map(e=>String(e||"").trim()).filter(Boolean):[],a=new Set(["omakase","sushi","grill"]),r=t.some(e=>{let t=f(e);return t&&"all"!==t&&!a.has(t)}),n=new Set,o=[];return t.forEach(e=>{let t=String(e||"").trim(),i=f(t);!i||n.has(i)||r&&a.has(i)||(n.add(i),o.push(t))}),o}function w(...e){let t=function(e,t){let a=e.map(e=>e.category).filter(Boolean),r=new Set,n=[];return["ALL",...t||[],...a].forEach(e=>{let t=String(e||"").trim();if(!t)return;let a=t.toLowerCase();if("all"===a&&!r.has("all")){r.add("all"),n.push("ALL");return}r.has(a)||(r.add(a),n.push(t))}),n.length?n:b.categories}(...e),a=Array.isArray(e[0])?e[0]:[],r=Array.isArray(e[1])?e[1]:[],n=a.map(e=>String(e?.category||e?.category_name||e?.menu_category||"").trim()).filter(Boolean),o=[...t,...r.map(e=>String(e||"").trim()).filter(Boolean),...n],i=new Set(["omakase","sushi","grill"]),l=[...o.some(e=>{let t=f(e);return t&&"all"!==t&&!i.has(t)})?z.filter(e=>{let t=f(e);return"all"===t||!i.has(t)}):z,...o],d=new Set,s=[];return l.forEach(e=>{let t=String(e||"").trim(),a=f(t);!a||d.has(a)||(d.add(a),s.push(t))}),s.length>=z.length&&(z=x(s)),x(z.length?z:s)}function v(e){let t=e;Array.isArray(t)&&(t=t[0]),t&&"object"==typeof t&&(t=t.url??t.path??t.image_path??t.image??t.thumb??t.thumbnail??t.src??"");let a=String(t||"").trim();if(!a||"undefined"===a||"null"===a)return"";if(/^https?:\/\//i.test(a)||a.startsWith("/"))return a;let r=a.replace(/^\/+/,""),n=r.split("/").filter(Boolean).pop()||r;return r.startsWith("assets/media/uploads/")||r.startsWith("assets/media/attachments/")?`/${r}`:r.startsWith("uploads/")||r.startsWith("attachments/public/")?`/assets/media/${r}`:r.startsWith("storage/")||r.includes("/")?`/${r}`:`/assets/media/uploads/${n}`}function N(e){return e?v(e.image||e.image_url||e.thumb||e.thumbnail||e.images):""}let j={website:{enabled:!1,url:""},social:{enabled:!1,platform:"instagram",url:""}};function A(e){return"boolean"==typeof e?e:["1","true","yes","on","enabled"].includes(String(e||"").trim().toLowerCase())}function P(e){let t=String(e||"").trim();return t?/^https?:\/\//i.test(t)?t:`https://${t.replace(/^\/+/,"")}`:""}e.s(["default",0,function(){(0,a.useEffect)(()=>(function(){if("u"<typeof document)return()=>{};let e="pmd-kazen-premium-motion-style";if(!document.getElementById(e)){let t=document.createElement("style");t.id=e,t.textContent=`
      :root {
        --pmd-kazen-ease-out: cubic-bezier(.16, 1, .3, 1);
        --pmd-kazen-ease-soft: cubic-bezier(.22, .68, 0, 1);
        --pmd-kazen-ease-inout: cubic-bezier(.65, 0, .35, 1);
      }

      @keyframes pmdKazenFadeUp {
        from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.985); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }

      @keyframes pmdKazenModalIn {
        from { opacity: 0; transform: translate3d(0, 18px, 0) scale(.965); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }

      @keyframes pmdKazenOverlayIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes pmdKazenCartPulse {
        0% { transform: translateX(-50%) scale(1); }
        35% { transform: translateX(-50%) scale(1.025); }
        100% { transform: translateX(-50%) scale(1); }
      }

      @keyframes pmdKazenAddPop {
        0% { transform: scale(1); }
        42% { transform: scale(.88); }
        72% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }

      .kazen-page {
        scroll-behavior: smooth;
      }

      .kazen-page * {
        -webkit-tap-highlight-color: transparent;
      }

      .kazen-shell,
      .kazen-hero,
      .kazen-call,
      .kazen-category,
      .kazen-category-btn,
      .kazen-category-label,
      .kazen-category-icon,
      .kazen-category-icon-shell,
      .kazen-category-title,
      .kazen-item,
      .kazen-item-image,
      .kazen-item-image-empty,
      .kazen-item-name,
      .kazen-item-description,
      .kazen-item-price,
      .kazen-add,
      .kazen-dock,
      .kazen-dock button,
      .kazen-clean-header-button,
      .kazen-primary,
      .kazen-secondary,
      .kazen-field,
      .kazen-qty button,
      .kazen-solid-close {
        transition-property: transform, opacity, color, background-color, border-color, box-shadow, filter, max-height, padding, margin;
        transition-duration: 260ms;
        transition-timing-function: var(--pmd-kazen-ease-out);
      }

      .kazen-shell {
        animation: pmdKazenFadeUp 520ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-hero {
        transition-duration: 420ms;
      }

      .kazen-hero:hover {
        filter: brightness(1.035) saturate(1.03);
      }

      .kazen-call,
      .kazen-category-btn,
      .kazen-add,
      .kazen-dock button,
      .kazen-clean-header-button,
      .kazen-primary,
      .kazen-secondary,
      .kazen-qty button,
      .kazen-solid-close {
        will-change: transform;
      }

      .kazen-call:hover,
      .kazen-category-btn:hover,
      .kazen-dock button:hover,
      .kazen-clean-header-button:hover,
      .kazen-primary:hover,
      .kazen-secondary:hover,
      .kazen-solid-close:hover {
        transform: translate3d(0, -2px, 0);
        box-shadow: 0 14px 34px rgba(0,0,0,.10);
      }

      .kazen-call:active,
      .kazen-category-btn:active,
      .kazen-add:active,
      .kazen-dock button:active,
      .kazen-clean-header-button:active,
      .kazen-primary:active,
      .kazen-secondary:active,
      .kazen-qty button:active,
      .kazen-solid-close:active,
      .pmd-kazen-tap-active {
        transform: scale(.965) !important;
      }

      .kazen-category {
        overflow: visible;
      }

      .kazen-category.is-open {
        background: linear-gradient(180deg, rgba(255,255,255,.025), transparent);
      }

      .kazen-category.is-open .kazen-category-icon-shell,
      .kazen-category-btn:hover .kazen-category-icon-shell {
        transform: translate3d(2px, 0, 0) scale(1.06);
      }

      .kazen-category.is-open .kazen-category-title {
        letter-spacing: .50em;
      }

      .kazen-category.is-open .kazen-category-btn svg {
        transform: rotate(180deg) scale(.92);
      }

      .kazen-category-btn svg {
        transition: transform 300ms var(--pmd-kazen-ease-out), color 260ms var(--pmd-kazen-ease-out), stroke 260ms var(--pmd-kazen-ease-out);
        transform-origin: 50% 50%;
      }

      .kazen-accordion {
        overflow: hidden;
        max-height: 0;
        opacity: 0;
        transform: translate3d(0, -8px, 0);
        transition:
          max-height 520ms var(--pmd-kazen-ease-soft),
          opacity 280ms ease,
          transform 420ms var(--pmd-kazen-ease-out),
          padding 420ms var(--pmd-kazen-ease-out);
        will-change: max-height, opacity, transform;
        pointer-events: none;
      }

      .kazen-accordion.is-open {
        /* PMD_FIX_KAZEN_IFRAME_ACCORDION_ALL_ITEMS_20260612 */
        max-height: none !important;
        height: auto !important;
        overflow: visible !important;
        opacity: 1;
        transform: translate3d(0, 0, 0);
        pointer-events: auto;
      }

      .kazen-accordion.is-closed .kazen-items {
        transform: translate3d(0, -10px, 0);
      }

      .kazen-accordion.is-open .kazen-items {
        animation: pmdKazenFadeUp 380ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-accordion.is-open .kazen-item {
        animation: pmdKazenFadeUp 420ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-accordion.is-open .kazen-item:nth-child(1) { animation-delay: 25ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(2) { animation-delay: 55ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(3) { animation-delay: 85ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(4) { animation-delay: 115ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(5) { animation-delay: 145ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(n+6) { animation-delay: 175ms; }

      .kazen-item:hover {
        transform: translate3d(0, -3px, 0);
        box-shadow: 0 18px 42px rgba(0,0,0,.16) !important;
      }

      .kazen-item:hover .kazen-item-image,
      .kazen-item:hover .kazen-item-image-empty {
        transform: scale(1.035);
      }

      .kazen-add:hover {
        transform: scale(1.06) rotate(3deg);
        box-shadow: 0 12px 26px rgba(0,0,0,.14) !important;
      }

      .kazen-add.pmd-kazen-added {
        animation: pmdKazenAddPop 420ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-dock {
        transition-duration: 320ms;
      }

      .kazen-dock:hover {
        transform: translateX(-50%) translateY(-2px);
        box-shadow: 0 24px 58px rgba(0,0,0,.22) !important;
      }

      .kazen-dock.pmd-kazen-cart-pulse {
        animation: pmdKazenCartPulse 450ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-solid-modal-overlay {
        animation: pmdKazenOverlayIn 220ms ease both;
      }

      html body .kazen-solid-modal-panel {
        animation: pmdKazenModalIn 380ms var(--pmd-kazen-ease-out) both;
        transform-origin: 50% 54% !important;
      }

      html body .kazen-solid-modal-panel .kazen-modal-image {
        animation: pmdKazenFadeUp 420ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-field:focus {
        border-color: rgba(184,93,89,.58) !important;
        box-shadow: 0 0 0 3px rgba(184,93,89,.10) !important;
      }

      html[data-pmd-kazen-mode="dark"] .kazen-call:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-category-btn:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-dock button:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-clean-header-button:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-primary:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-secondary:hover {
        box-shadow: 0 14px 34px rgba(0,0,0,.32) !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .kazen-page *,
        .kazen-page *::before,
        .kazen-page *::after {
          animation: none !important;
          transition-duration: 1ms !important;
          scroll-behavior: auto !important;
        }
      }
    `,document.body.appendChild(t)}let t=(e,t,a=430)=>{e instanceof HTMLElement&&(e.classList.remove(t),e.offsetWidth,e.classList.add(t),window.setTimeout(()=>e.classList.remove(t),a))},a=e=>{let t=e.target,a=t?.closest?.("button, .kazen-item, .kazen-clean-header-button");a&&(a.classList.add("pmd-kazen-tap-active"),window.setTimeout(()=>a.classList.remove("pmd-kazen-tap-active"),180))},r=e=>{let a=e.target,r=a?.closest?.(".kazen-add");r&&(t(r,"pmd-kazen-added",440),t(document.querySelector(".kazen-dock"),"pmd-kazen-cart-pulse",470))};return document.addEventListener("pointerdown",a,!0),document.addEventListener("click",r,!0),()=>{document.removeEventListener("pointerdown",a,!0),document.removeEventListener("click",r,!0)}})(),[]),(0,a.useEffect)(()=>(function(){if("u"<typeof document)return()=>{};let e="pmd-kazen-clean-header-buttons-style";if(!document.getElementById(e)){let t=document.createElement("style");t.id=e,t.textContent=`
      .kazen-shell {
        position: relative !important;
      }

      [data-pmd-kazen-old-header-control="1"],
      [data-pmd-kazen-dark-toggle]:not([data-pmd-kazen-clean-mode-proxy="1"]) {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      [data-pmd-kazen-clean-header-actions="1"] {
        position: absolute !important;
        top: 2.05rem !important;
        right: 1.35rem !important;
        z-index: 80 !important;
        display: grid !important;
        grid-template-columns: repeat(3, 2.62rem) !important;
        gap: .48rem !important;
        align-items: center !important;
        justify-content: end !important;
      }

      .kazen-clean-header-button {
        width: 2.62rem !important;
        height: 2.62rem !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1px solid rgba(35,34,31,.22) !important;
        background: rgba(255,255,255,.26) !important;
        color: var(--kazen-ink, #242320) !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        cursor: pointer !important;
        font-family: Georgia, "Times New Roman", serif !important;
        font-size: .82rem !important;
        line-height: 1 !important;
      }

      .kazen-clean-header-button svg,
      .kazen-clean-header-button path,
      .kazen-clean-header-button line,
      .kazen-clean-header-button circle,
      .kazen-clean-header-button polyline {
        stroke: currentColor !important;
        color: currentColor !important;
        fill: none !important;
      }

      .kazen-clean-header-button:hover {
        border-color: rgba(184,93,89,.48) !important;
        color: var(--kazen-red, #b85d59) !important;
      }

      html[data-pmd-kazen-mode="dark"] .kazen-clean-header-button {
        background: rgba(8,7,5,.62) !important;
        border-color: rgba(198,164,93,.52) !important;
        color: #f4e7c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] .kazen-clean-header-button:hover {
        border-color: rgba(223,104,93,.65) !important;
        color: #df685d !important;
      }

      @media (max-width: 520px) {
        [data-pmd-kazen-clean-header-actions="1"] {
          top: 1.55rem !important;
          right: 1rem !important;
          grid-template-columns: repeat(3, 2.42rem) !important;
          gap: .38rem !important;
        }

        .kazen-clean-header-button {
          width: 2.42rem !important;
          height: 2.42rem !important;
        }
      }
    `,document.head.appendChild(t)}let t=e=>e.replace(/\s+/g," ").trim().toUpperCase(),a=e=>Array.from(document.querySelectorAll("button")).find(a=>{if(a.closest('[data-pmd-kazen-clean-header-actions="1"]'))return!1;let r=t(a.textContent||"");return e.test(r)})||null,r=()=>{Array.from(document.querySelectorAll("button")).forEach(e=>{if(e.closest('[data-pmd-kazen-clean-header-actions="1"]')||e.hasAttribute("data-pmd-kazen-dark-toggle"))return;let a=e.getBoundingClientRect(),r=t(e.textContent||""),n=String(e.className||"");a.top>=-20&&a.top<290&&(/TABLE|VALET|EN|DE|FA|AR|LANG/.test(r)||n.includes("kazen-icon-button")||n.includes("kazen-pill"))&&e.setAttribute("data-pmd-kazen-old-header-control","1")})},n=()=>"dark"===document.documentElement.getAttribute("data-pmd-kazen-mode")?"dark":"light",o=e=>{document.documentElement.setAttribute("data-pmd-kazen-mode",e),document.body?.setAttribute("data-pmd-kazen-mode",e);try{window.localStorage.setItem("pmd-kazen-japanese-mode",e)}catch{}let t=document.querySelector("[data-pmd-kazen-dark-toggle]");t&&(t.textContent="dark"===e?"☀ LIGHT":"☾ DARK");let a=document.querySelector('[data-pmd-kazen-clean-action="mode"]');a&&(a.innerHTML="dark"===e?'<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>':'<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"/></svg>')},i=(e,t,a,r)=>{let n=document.createElement("button");return n.type="button",n.className="kazen-clean-header-button",n.setAttribute("data-pmd-kazen-clean-action",e),n.setAttribute("aria-label",t),n.title=t,n.innerHTML=a,n.addEventListener("click",r),n},l=()=>{let e=document.querySelector(".kazen-shell")||document.body,t=document.querySelector('[data-pmd-kazen-clean-header-actions="1"]');if(!t){(t=document.createElement("div")).setAttribute("data-pmd-kazen-clean-header-actions","1");let r=i("language","Language",'<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h9M9 3v2M6 9c1.1 2.4 3.1 4.5 6 6M12 9c-.9 2.3-2.8 4.5-6 6"/><path d="M14 20l4-9 4 9M15.3 17h5.4"/></svg>',()=>{let e=a(/EN|DE|FA|AR|LANG/);e&&e.click()}),l=i("mode","Mode","",()=>o("dark"===n()?"light":"dark")),d=i("valet","Valet",'<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14l-1.4-5.1A3 3 0 0 0 14.7 9H9.3a3 3 0 0 0-2.9 1.9L5 16Z"/><path d="M7 16v2M17 16v2M8 13h.01M16 13h.01"/></svg>',()=>{let e=a(/VALET/);e&&e.click()});t.appendChild(r),t.appendChild(l),t.appendChild(d),e.appendChild(t)}o(n())};r(),l();let d=window.setInterval(()=>{r(),l()},500);return()=>window.clearInterval(d)})(),[]),(0,a.useEffect)(()=>(function(){let e;if("u"<typeof document)return()=>{};let t="pmd-kazen-japanese-mode",a="pmd-kazen-final-dark-style",r=e=>{document.documentElement.setAttribute("data-pmd-kazen-mode",e),document.body?.setAttribute("data-pmd-kazen-mode",e);try{window.localStorage.setItem(t,e)}catch{}let a=document.querySelector("[data-pmd-kazen-dark-toggle]");a&&(a.textContent="dark"===e?"☀ LIGHT":"☾ DARK")};(()=>{if(document.getElementById(a))return;let e=document.createElement("style");e.id=a,e.textContent=`
      html[data-pmd-kazen-mode="dark"],
      html[data-pmd-kazen-mode="dark"] body {
        background:
          radial-gradient(circle at 80% 0%, rgba(111, 34, 26, .28), transparent 26%),
          linear-gradient(180deg, #0c0907 0%, #050403 52%, #020202 100%) !important;
        color: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page {
        --kazen-paper: #080705;
        --kazen-paper-soft: #0f0c09;
        --kazen-paper-deep: #15110d;
        --kazen-ink: #f6e8c8;
        --kazen-muted: #d7c298;
        --kazen-line: rgba(198, 164, 93, .26);
        --kazen-line-strong: rgba(198, 164, 93, .46);
        --kazen-red: #df685d;
        background:
          radial-gradient(circle at 82% 1%, rgba(118, 38, 29, .20), transparent 28%),
          linear-gradient(180deg, #090806 0%, #050403 100%) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: initial !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-brand,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-brand * {
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        opacity: 1 !important;
        filter: none !important;
        text-shadow: 0 2px 18px rgba(0,0,0,.78) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-subtitle,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-subtitle * {
        color: #d7c298 !important;
        -webkit-text-fill-color: #d7c298 !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-hero {
        background-image:
          linear-gradient(90deg, rgba(5, 5, 6, .60), rgba(5, 5, 6, .07)),
          url("/themes/kazen-japanese/TokyoNight.png") !important;
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        border-top: 1px solid rgba(198, 164, 93, .28) !important;
        border-bottom: 1px solid rgba(198, 164, 93, .28) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-motto,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-motto * {
        color: #fff0cc !important;
        -webkit-text-fill-color: #fff0cc !important;
        opacity: 1 !important;
        background: transparent !important;
        text-shadow: 0 2px 18px rgba(0,0,0,.96) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-call {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
        background: rgba(7, 6, 5, .52) !important;
        border-color: rgba(223, 104, 93, .58) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category:last-child {
        border-color: rgba(198, 164, 93, .25) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn * {
        color: #e9d8ae !important;
        -webkit-text-fill-color: #e9d8ae !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-title,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-title * {
        color: #e9d8ae !important;
        -webkit-text-fill-color: #e9d8ae !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn line {
        color: #e9d8ae !important;
        stroke: #e9d8ae !important;
        -webkit-text-fill-color: #e9d8ae !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item {
        background: rgba(15, 12, 9, .82) !important;
        border-color: rgba(198, 164, 93, .31) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-name,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-name * {
        color: #f5e7c5 !important;
        -webkit-text-fill-color: #f5e7c5 !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-description,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-description * {
        color: #d9c79d !important;
        -webkit-text-fill-color: #d9c79d !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-price,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-price * {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add {
        background: rgba(246, 232, 200, .95) !important;
        color: #080705 !important;
        -webkit-text-fill-color: #080705 !important;
        border-color: rgba(198, 164, 93, .48) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add line {
        color: #080705 !important;
        stroke: #080705 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill {
        background: rgba(8, 7, 5, .76) !important;
        border-color: rgba(198, 164, 93, .39) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button line,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill line {
        color: #f6e8c8 !important;
        stroke: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock {
        background: rgba(7, 6, 5, .94) !important;
        border-color: rgba(198, 164, 93, .32) !important;
        box-shadow: 0 18px 48px rgba(0,0,0,.52) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button * {
        background: rgba(11, 9, 7, .84) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        border-color: rgba(198, 164, 93, .36) !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"],
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"] * {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
        border-color: rgba(223, 104, 93, .58) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-paymydine-footer-logo-text {
        display: none !important;
      }



      /* PMD_FIX_KAZEN_WAITER_NOTE_CHECKOUT_DARK_CARDS_20260612
         Force waiter, note and checkout action cards/modals to follow Kazen dark mode. */

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock {
        background:
          linear-gradient(180deg, rgba(13, 10, 7, .98), rgba(4, 3, 2, .98)) !important;
        border-color: rgba(198, 164, 93, .42) !important;
        box-shadow:
          0 -18px 54px rgba(0, 0, 0, .72),
          inset 0 1px 0 rgba(255, 240, 204, .08) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button {
        background:
          linear-gradient(180deg, rgba(22, 17, 11, .96), rgba(8, 6, 4, .96)) !important;
        border: 1px solid rgba(198, 164, 93, .38) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 240, 204, .08),
          0 10px 26px rgba(0,0,0,.34) !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button *,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button line,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button rect,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button circle {
        color: #f6e8c8 !important;
        stroke: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"],
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"] * {
        background:
          linear-gradient(180deg, rgba(223, 104, 93, .16), rgba(72, 23, 18, .24)) !important;
        border-color: rgba(223, 104, 93, .64) !important;
        color: #df685d !important;
        stroke: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-overlay {
        background: rgba(2, 2, 2, .76) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-panel,
      html[data-pmd-kazen-mode="dark"] body [data-kazen-solid-panel="1"] {
        background:
          radial-gradient(circle at 85% 0%, rgba(111, 34, 26, .20), transparent 28%),
          linear-gradient(180deg, #14100b 0%, #090705 100%) !important;
        background-color: #090705 !important;
        border: 1px solid rgba(198, 164, 93, .42) !important;
        color: #f6e8c8 !important;
        box-shadow:
          0 32px 90px rgba(0,0,0,.78),
          inset 0 1px 0 rgba(255, 240, 204, .08) !important;
        opacity: 1 !important;
        filter: none !important;
        mix-blend-mode: normal !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-sheet {
        background:
          linear-gradient(180deg, rgba(255, 240, 204, .05), rgba(198, 164, 93, .03)) !important;
        border-color: rgba(198, 164, 93, .24) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-head {
        color: #f6e8c8 !important;
        -webkit-text-fill-color: initial !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-head h2,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-head h3,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content label,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content p,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content span {
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-eyebrow {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button,
      html[data-pmd-kazen-mode="dark"] body .kazen-primary,
      html[data-pmd-kazen-mode="dark"] body .kazen-secondary {
        background: rgba(12, 9, 6, .92) !important;
        border: 1px solid rgba(198, 164, 93, .40) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close path,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close line,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button path,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button line {
        color: #f6e8c8 !important;
        stroke: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content input,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content textarea,
      html[data-pmd-kazen-mode="dark"] body .kazen-field {
        background: rgba(5, 4, 3, .88) !important;
        border: 1px solid rgba(198, 164, 93, .34) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        caret-color: #df685d !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content input::placeholder,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content textarea::placeholder {
        color: rgba(246, 232, 200, .56) !important;
        -webkit-text-fill-color: rgba(246, 232, 200, .56) !important;
      }

      [data-pmd-kazen-dark-toggle] {
        position: fixed !important;
        top: 24px !important;
        right: max(18px, calc(50vw - 315px)) !important;
        z-index: 999999 !important;
        border: 1px solid rgba(198, 164, 93, .68) !important;
        background: rgba(8, 7, 5, .92) !important;
        color: #f4d58d !important;
        -webkit-text-fill-color: #f4d58d !important;
        padding: 10px 14px !important;
        font-size: 11px !important;
        letter-spacing: .18em !important;
        font-family: Georgia, "Times New Roman", serif !important;
        cursor: pointer !important;
      }
    `,document.body.appendChild(e)})(),(e=document.querySelector("[data-pmd-kazen-dark-toggle]"))||((e=document.createElement("button")).type="button",e.setAttribute("data-pmd-kazen-dark-toggle","1"),e.addEventListener("click",()=>{r("dark"==("dark"===document.documentElement.getAttribute("data-pmd-kazen-mode")?"dark":"light")?"light":"dark")}),document.body.appendChild(e));let n="light";try{n=window.localStorage.getItem(t)||"light"}catch{}return r("dark"===new URLSearchParams(window.location.search).get("mode")||"dark"===n?"dark":"light"),()=>{}})(),[]);let[e,p]=(0,a.useState)(b),[z,x]=(0,a.useState)(""),[E,S]=(0,a.useState)(null),[_,C]=(0,a.useState)(1),[L,T]=(0,a.useState)("Request sent");(0,a.useEffect)(()=>{if(!E||"u"<typeof document)return;let e=!1,t=()=>{if(e)return;let t=document.querySelector('.kazen-solid-modal-overlay .kazen-qty[data-pmd-kazen-qty-polished="1"]');if(!t)return;t.style.setProperty("display","grid","important"),t.style.setProperty("grid-template-columns","58px minmax(0, 1fr) 58px","important"),t.style.setProperty("align-items","stretch","important"),t.style.setProperty("height","58px","important"),t.style.setProperty("min-height","58px","important"),t.style.setProperty("margin-top","26px","important"),t.style.setProperty("border","1px solid rgba(36, 35, 32, .18)","important"),t.style.setProperty("background","rgba(255, 252, 246, .64)","important"),t.style.setProperty("box-shadow","inset 0 1px 0 rgba(255,255,255,.82)","important"),t.style.setProperty("overflow","hidden","important"),Array.from(t.querySelectorAll("button.kazen-qty-btn")).forEach((e,t)=>{e.style.setProperty("all","unset","important"),e.style.setProperty("box-sizing","border-box","important"),e.style.setProperty("width","58px","important"),e.style.setProperty("height","58px","important"),e.style.setProperty("min-width","58px","important"),e.style.setProperty("min-height","58px","important"),e.style.setProperty("display","flex","important"),e.style.setProperty("align-items","center","important"),e.style.setProperty("justify-content","center","important"),e.style.setProperty("cursor","pointer","important"),e.style.setProperty("background","transparent","important"),e.style.setProperty("background-color","transparent","important"),e.style.setProperty("color","#242320","important"),e.style.setProperty("border-radius","0","important"),e.style.setProperty("box-shadow","none","important"),e.style.setProperty("overflow","visible","important"),e.style.setProperty("appearance","none","important"),e.style.setProperty("-webkit-appearance","none","important"),e.style.setProperty("touch-action","manipulation","important"),0===t&&e.style.setProperty("border-right","1px solid rgba(36, 35, 32, .14)","important"),1===t&&e.style.setProperty("border-left","1px solid rgba(36, 35, 32, .14)","important");let a=e.querySelector("svg");a&&(a.style.setProperty("width","22px","important"),a.style.setProperty("height","22px","important"),a.style.setProperty("color","currentColor","important"),a.style.setProperty("stroke","currentColor","important"),a.style.setProperty("fill","none","important")),e.querySelectorAll("svg *").forEach(e=>{e.style.setProperty("stroke","currentColor","important"),e.style.setProperty("fill","none","important")});let r=e.querySelector(".kazen-qty-symbol");r&&(r.style.setProperty("display","inline-flex","important"),r.style.setProperty("align-items","center","important"),r.style.setProperty("justify-content","center","important"),r.style.setProperty("width","100%","important"),r.style.setProperty("height","100%","important"),r.style.setProperty("font-family","Georgia, 'Times New Roman', serif","important"),r.style.setProperty("font-size","2rem","important"),r.style.setProperty("font-weight","600","important"),r.style.setProperty("line-height","1","important"),r.style.setProperty("color","#242320","important"),r.style.setProperty("transform","translateY(-1px)","important"))});let a=t.querySelector(".kazen-qty-value");a&&(a.style.setProperty("display","flex","important"),a.style.setProperty("align-items","center","important"),a.style.setProperty("justify-content","center","important"),a.style.setProperty("height","58px","important"),a.style.setProperty("min-height","58px","important"),a.style.setProperty("background","rgba(255, 255, 255, .22)","important"),a.style.setProperty("color","#242320","important"),a.style.setProperty("font-size","1.25rem","important"),a.style.setProperty("font-weight","700","important"),a.style.setProperty("letter-spacing",".08em","important"))};t();let a=window.requestAnimationFrame(t),r=[window.setTimeout(t,50),window.setTimeout(t,250),window.setTimeout(t,700)];return()=>{e=!0,window.cancelAnimationFrame(a),r.forEach(e=>window.clearTimeout(e))}},[E,_]);let[q,M]=(0,a.useState)(!1),[I,D]=(0,a.useState)(!1),[K,R]=(0,a.useState)(!1),[O,F]=(0,a.useState)(!1),[B,U]=(0,a.useState)(!1),[$,Z]=(0,a.useState)(j);(0,a.useEffect)(()=>{let e=!1;return(async()=>{try{var t;let a,r,n,o,i,l=await fetch(`/simple-theme?ts=${Date.now()}`,{cache:"no-store",headers:{Accept:"application/json"}});if(!l.ok)return;let d=(t=await l.json(),a=t?.data&&"object"==typeof t.data?t.data:{},r=t?.kazen_header_links||t?.headerLinks||a?.kazen_header_links||a?.headerLinks||{},n=P(r?.website?.url||t?.pmd_kazen_website_url||a?.pmd_kazen_website_url||t?.website_url||a?.website_url),o=P(r?.social?.url||t?.pmd_kazen_social_url||a?.pmd_kazen_social_url||t?.pmd_social_url||a?.pmd_social_url),i=String(r?.social?.platform||t?.pmd_kazen_social_platform||a?.pmd_kazen_social_platform||"instagram").trim().toLowerCase()||"instagram",{website:{enabled:!!n&&A(r?.website?.enabled??t?.pmd_kazen_website_enabled??a?.pmd_kazen_website_enabled),url:n},social:{enabled:!!o&&A(r?.social?.enabled??t?.pmd_kazen_social_enabled??a?.pmd_kazen_social_enabled),platform:i,url:o}});console.info("PMD_KAZEN_HEADER_LINKS_V1",d),e||Z(d)}catch{}})(),()=>{e=!0}},[]),(0,a.useEffect)(()=>{let e=0,t=[],a=(e,t,a,r,n,o)=>{let i=e.querySelector(`a[data-pmd-kazen-clean-action="${t}"]`);a&&r?(i||(i=document.createElement("a"),e.appendChild(i)),i.className="kazen-clean-header-button",i.setAttribute("data-pmd-kazen-clean-action",t),i.href=r,i.target="_blank",i.rel="noopener noreferrer",i.title=n,i.setAttribute("aria-label","website"===t?"Open restaurant website":`Open ${n}`),i.innerHTML!==o&&(i.innerHTML=o)):i?.remove()},r=()=>{e&&window.cancelAnimationFrame(e),e=window.requestAnimationFrame(()=>{let e,t,r=document.querySelector('[data-pmd-kazen-clean-header-actions="1"]');if(!r)return;a(r,"website",$.website.enabled,$.website.url,"Website",'<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"></circle><path d="M3.75 12h16.5"></path><path d="M12 3.75c2 2.25 3.05 5.05 3.05 8.25S14 18 12 20.25"></path><path d="M12 3.75C10 6 8.95 8.8 8.95 12S10 18 12 20.25"></path></svg>');let n="facebook"===(e=String($.social.platform||"").trim().toLowerCase())?"Facebook":"trustpilot"===e?"Trustpilot":"reviews"===e?"Reviews":"website"===e?"Social":"Instagram";a(r,"social",$.social.enabled,$.social.url,n,"facebook"===(t=String($.social.platform||"").trim().toLowerCase())?'<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.35 5.2h-1.9c-2.15 0-3.45 1.35-3.45 3.7v2.15H6.8v3H9V20h3.05v-5.95h2.35l.38-3h-2.73V9.15c0-.72.28-1.08 1.08-1.08h1.22V5.2Z"></path></svg>':"trustpilot"===t?'<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4.75 2.2 4.45 4.9.72-3.55 3.45.84 4.88L12 15.95l-4.39 2.3.84-4.88L4.9 9.92l4.9-.72L12 4.75Z"></path></svg>':"reviews"===t?'<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.7 5.9h12.6a2 2 0 0 1 2 2v7.05a2 2 0 0 1-2 2H9.35L5 20.1v-3.15h-.6a2 2 0 0 1-2-2V7.9a2 2 0 0 1 2-2h1.3Z"></path><path d="m12 8.95.82 1.65 1.82.26-1.32 1.28.31 1.82L12 13.1l-1.63.86.31-1.82-1.32-1.28 1.82-.26L12 8.95Z"></path></svg>':"website"===t?'<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.1 13.25a4.45 4.45 0 0 0 6.3 0l2-2a4.45 4.45 0 0 0-6.3-6.3L11 6.05"></path><path d="M13.9 10.75a4.45 4.45 0 0 0-6.3 0l-2 2a4.45 4.45 0 0 0 6.3 6.3L13 17.95"></path></svg>':'<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.1" y="5.1" width="13.8" height="13.8" rx="3.5"></rect><circle cx="12" cy="12" r="2.95"></circle><path d="M16.45 7.65h.01"></path></svg>'),r.setAttribute("data-pmd-kazen-clean-header-links-v21","1"),window.__PMD_KAZEN_HEADER_LINKS_V21={website:!!r.querySelector('[data-pmd-kazen-clean-action="website"]'),social:!!r.querySelector('[data-pmd-kazen-clean-action="social"]'),platform:$.social.platform,childCount:r.children.length}})};return r(),t.push(window.setTimeout(r,50)),t.push(window.setTimeout(r,160)),t.push(window.setTimeout(r,420)),t.push(window.setInterval(r,2400)),window.addEventListener("resize",r),()=>{e&&window.cancelAnimationFrame(e),t.forEach(e=>window.clearTimeout(e)),window.removeEventListener("resize",r)}},[$.website.enabled,$.website.url,$.social.enabled,$.social.url,$.social.platform]);let[H,V]=(0,a.useState)(!1),[W,Y]=(0,a.useState)(!1),[G,X]=(0,a.useState)(""),[Q,J]=(0,a.useState)({showTableOrder:!1,tableOrderCount:0}),[ee,et]=(0,a.useState)(""),[ea,er]=(0,a.useState)(""),[en,eo]=(0,a.useState)("");(0,a.useEffect)(()=>{if("u">typeof document)return document.documentElement.setAttribute("data-pmd-kazen-active","1"),document.body.setAttribute("data-pmd-kazen-active","1"),()=>{document.documentElement.removeAttribute("data-pmd-kazen-active"),document.body.removeAttribute("data-pmd-kazen-active")}},[]),(0,a.useEffect)(()=>{let t=t=>{if(t.origin!==window.location.origin)return;let a=t.data;if(!a||"object"!=typeof a||"PMD_KAZEN_SYNC"!==String(a.type||""))return;J({showTableOrder:!!a.showTableOrder,tableOrderCount:Number(a.tableOrderCount||0)});let r=(Array.isArray(a.items)?a.items:[]).map(e=>({...e,id:String(e?.id??e?.menu_id??e?.slug??e?.name??""),name:String(e?.name??e?.menu_name??"Menu item"),description:String(e?.description??e?.short_description??e?.menu_description??""),price:Number(e?.price??e?.menu_price??0),category:String(e?.category??e?.category_name??"Menu"),image:e?.image??e?.image_url??e?.imageUrl??e?.image_path??e?.imagePath??e?.thumb??e?.thumbnail??e?.media_url??e?.mediaUrl??e?.photo_url??e?.photoUrl??e?.photo??e?.primary_image??e?.primaryImage??e?.images??e?.additional_images??e?.gallery??"",images:[...Array.isArray(e?.images)?e.images:[],...Array.isArray(e?.gallery)?e.gallery:[],...Array.isArray(e?.additional_images)?e.additional_images:[],...Array.isArray(e?.additionalImages)?e.additionalImages:[],...Array.isArray(e?.media)?e.media:[]],gallery:Array.isArray(e?.gallery)?e.gallery:[],additional_images:Array.isArray(e?.additional_images)?e.additional_images:[]})),n=w(r,Array.isArray(a.categories)?a.categories:[]);p({restaurantName:String(a.restaurantName||a.businessName||a.merchantName||a.restaurant?.name||a.merchant?.businessName||"Kazen"),logoUrl:v(a.logoUrl||a.effectiveLogoUrl||a.restaurantLogoUrl||a.merchantLogoUrl||a.logo||a.logo_url||a.settings?.logoUrl||a.merchant?.logoUrl||"")||e.logoUrl||"",tableNumber:a.displayTableNumber??a.tableNumber??a.table_id??a.tableId??a.table?.number??null,menuLayout:["tabs","tab","tabbed","classic","normal","list","flat","category-tabs","categories-top","top-categories","category-tabs-full-item-list"].includes(String((a.menuLayout??a.kazen_menu_layout??a.settings?.kazen_menu_layout??a.data?.kazen_menu_layout)||"").trim().toLowerCase().replace(/[_\s-]+/g,"-"))?"tabs":"accordion",categories:n,items:r,cart:{count:Number(a.cart?.count||0),total:Number(a.cart?.total||0),lastItemName:String(a.cart?.lastItemName||""),lastItemPrice:Number(a.cart?.lastItemPrice||0),lines:Array.isArray(a.cart?.lines)?a.cart.lines:[]}}),z&&!n.some(e=>f(e)===f(z))&&x("")};window.addEventListener("message",t),y("PMD_KAZEN_READY");let a=window.setTimeout(()=>y("PMD_KAZEN_READY"),250),r=window.setTimeout(()=>y("PMD_KAZEN_READY"),900);return()=>{window.removeEventListener("message",t),window.clearTimeout(a),window.clearTimeout(r)}},[z]);let ei=(0,a.useMemo)(()=>w(e.items,e.categories),[e.items,e.categories]),el=(0,a.useMemo)(()=>{let t=new Map;return ei.forEach(e=>t.set(f(e),[])),e.items.forEach(e=>{let a=f(e.category||"Menu");t.has(a)||t.set(a,[]),t.get(a)?.push(e)}),t.set(f("ALL"),e.items),t},[ei,e.items]),ed="tabs"===e.menuLayout?"tabs":"accordion",es=f("tabs"===ed?z||"ALL":z),em=(0,a.useMemo)(()=>es===f("ALL")?e.items:el.get(es)||[],[el,es,e.items]),ec=e.tableNumber&&/\d/.test(String(e.tableNumber))?`Table ${String(e.tableNumber).match(/\d+/)?.[0]}`:"Table";Array.isArray(e.cart.lines)&&e.cart.lines,(0,a.useEffect)(()=>{if("u"<typeof document)return;let e=!1,t=0,a=()=>{e||document.querySelectorAll(".kazen-category").forEach(e=>{let t=e.querySelector(".kazen-category-btn"),a=e.querySelector(".kazen-category-title"),r=e.querySelector(".kazen-category-icon-shell"),n=e.querySelector(".kazen-accordion");e.style.setProperty("display","block","important"),e.style.setProperty("visibility","visible","important"),e.style.setProperty("opacity","1","important"),e.style.setProperty("height","auto","important"),e.style.setProperty("min-height","4.55rem","important"),e.style.setProperty("max-height","none","important"),e.style.setProperty("overflow","visible","important"),e.style.setProperty("position","relative","important"),e.style.setProperty("clip","auto","important"),e.style.setProperty("clip-path","none","important"),e.removeAttribute("hidden"),e.removeAttribute("aria-hidden"),t&&(t.style.setProperty("display","grid","important"),t.style.setProperty("grid-template-columns","1fr auto","important"),t.style.setProperty("align-items","center","important"),t.style.setProperty("visibility","visible","important"),t.style.setProperty("opacity","1","important"),t.style.setProperty("height","auto","important"),t.style.setProperty("min-height","4.55rem","important"),t.style.setProperty("max-height","none","important"),t.style.setProperty("overflow","visible","important"),t.style.setProperty("pointer-events","auto","important"),t.style.setProperty("clip","auto","important"),t.style.setProperty("clip-path","none","important"),t.removeAttribute("hidden"),t.removeAttribute("aria-hidden")),a&&(a.style.setProperty("display","inline","important"),a.style.setProperty("visibility","visible","important"),a.style.setProperty("opacity","1","important"),a.style.setProperty("overflow","visible","important"),a.style.setProperty("clip","auto","important"),a.style.setProperty("clip-path","none","important"),a.style.setProperty("white-space","normal","important"),a.removeAttribute("hidden"),a.removeAttribute("aria-hidden")),r&&(r.style.setProperty("display","inline-flex","important"),r.style.setProperty("visibility","visible","important"),r.style.setProperty("opacity","1","important")),n&&!e.classList.contains("is-open")&&(n.style.setProperty("max-height","0","important"),n.style.setProperty("overflow","hidden","important"),n.style.setProperty("opacity","0","important"),n.style.setProperty("pointer-events","none","important")),n&&e.classList.contains("is-open")&&(n.style.setProperty("max-height","none","important"),n.style.setProperty("height","auto","important"),n.style.setProperty("overflow","visible","important"),n.style.setProperty("opacity","1","important"),n.style.setProperty("pointer-events","auto","important"))})},r=()=>{window.cancelAnimationFrame(t),t=window.requestAnimationFrame(a)};a();let n=[0,50,150,350,700,1200,2e3].map(e=>window.setTimeout(a,e));window.addEventListener("scroll",r,!0),window.addEventListener("resize",r);let o=new MutationObserver(r);return o.observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["class","style","hidden","aria-hidden","aria-expanded"]}),()=>{e=!0,window.cancelAnimationFrame(t),n.forEach(e=>window.clearTimeout(e)),window.removeEventListener("scroll",r,!0),window.removeEventListener("resize",r),o.disconnect()}},[ei.length,z]);let ep=e=>{S(e),C(1)},ek=(e,t=1)=>{y("PMD_KAZEN_ADD_ITEM",{itemId:e.id,quantity:t})},eu=()=>{D(!1),V(!1)},eh=()=>{R(!1),Y(!1)};(0,a.useEffect)(()=>{if(!I||!H)return;let e=window.setTimeout(eu,2200);return()=>window.clearTimeout(e)},[I,H]),(0,a.useEffect)(()=>{if(!K||!W)return;let e=window.setTimeout(eh,2200);return()=>window.clearTimeout(e)},[K,W]);let eb=()=>{F(!1),U(!1)};return(0,a.useEffect)(()=>{if(!O||!B)return;let e=window.setTimeout(eb,2200);return()=>window.clearTimeout(e)},[O,B]),(0,a.useEffect)(()=>{let e=document.querySelector(".velvet-page");if(!e)return;let t=/€\s*\d|EUR|\$\s*\d|\d+[,.]\d{2}/i,a=["ITEM DETAIL","CALL WAITER","GUEST NOTE","MY ORDER","PAYMENT","READY TO PAY","ADD TIP","PAYMENT METHODS"],r=()=>{let r;e.querySelectorAll('[data-pmd-velvet-food-card="1"]').forEach(e=>{e.removeAttribute("data-pmd-velvet-food-card")}),Array.from(e.querySelectorAll("button")).forEach(a=>{let r=(a.textContent||"").trim().toLowerCase();if(!("+"===r||"add"===r||r.includes("add")||a.getAttribute("aria-label")?.toLowerCase().includes("add")))return;let n=a.parentElement,o=null;for(let a=0;n&&a<8&&n!==e;a+=1){let e=n.getBoundingClientRect(),a=n.textContent||"",r=!!n.querySelector("img"),i=t.test(a);if(r&&i&&e.width>=240&&e.width<=760&&e.height>=60&&e.height<=240){o=n;break}n=n.parentElement}o&&o.setAttribute("data-pmd-velvet-food-card","1")}),e.querySelectorAll('[data-pmd-velvet-modal-panel="1"]').forEach(e=>{e.removeAttribute("data-pmd-velvet-modal-panel")}),r=Array.from(e.querySelectorAll("div, section, article")).filter(e=>{let t;return(t=e.getBoundingClientRect()).width>20&&t.height>20}).map(e=>{let t=e.getBoundingClientRect(),r=(e.textContent||"").toUpperCase().slice(0,900),n=a.some(e=>r.includes(e)),o=Array.from(e.querySelectorAll("button")).some(e=>{let t=(e.textContent||"").trim().toLowerCase(),a=(e.getAttribute("aria-label")||"").toLowerCase();return"×"===t||"x"===t||a.includes("close")}),i=t.width>=280&&t.width<=760&&t.height>=120&&t.height<=900;return{el:e,area:t.width*t.height,ok:n&&o&&i}}).filter(e=>e.ok).sort((e,t)=>e.area-t.area),r[0]?.el&&r[0].el.setAttribute("data-pmd-velvet-modal-panel","1")};r();let n=new MutationObserver(()=>{window.requestAnimationFrame(r)});return n.observe(e,{childList:!0,subtree:!0,attributes:!1}),window.addEventListener("resize",r),()=>{n.disconnect(),window.removeEventListener("resize",r)}},[]),(0,t.jsxs)("main",{className:"kazen-page velvet-page","data-pmd-theme-page":"velvet-terracotta",children:[(0,t.jsxs)("div",{className:"kazen-shell",children:[(0,t.jsxs)("header",{className:"flex items-start justify-between gap-4",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:"flex items-end gap-3",children:[e.logoUrl?(0,t.jsx)("img",{src:e.logoUrl,alt:e.restaurantName,className:"kazen-logo"}):null,(0,t.jsx)("span",{className:"kazen-stamp",children:"VT"})]}),(0,t.jsx)("div",{className:"kazen-brand",children:e.restaurantName||"KAZEN"}),(0,t.jsx)("div",{className:"kazen-subtitle",children:"Velvet Terracotta"})]}),(0,t.jsxs)("div",{className:"flex flex-col items-end gap-2",children:[(0,t.jsx)("button",{className:"kazen-icon-button h-11 w-11","aria-label":"Menu",type:"button",children:(0,t.jsx)(l.Menu,{className:"h-7 w-7"})}),(0,t.jsxs)("div",{className:"flex gap-2",children:[(0,t.jsx)("button",{className:"kazen-pill",type:"button",children:ec}),(0,t.jsxs)("button",{className:"kazen-pill",type:"button","aria-label":"Language",children:[(0,t.jsx)(i.Languages,{className:"mr-1 inline h-3.5 w-3.5"})," EN"]})]}),(0,t.jsxs)("button",{className:"kazen-pill",type:"button",onClick:()=>{U(!1),F(!0)},children:[(0,t.jsx)(n.Car,{className:"mr-1 inline h-3.5 w-3.5"})," Valet"]})]})]}),(0,t.jsx)("section",{className:"kazen-hero","aria-label":"Velvet Terracotta atmosphere",children:(0,t.jsxs)("div",{className:"kazen-motto",children:[(0,t.jsx)("div",{children:"Warmth."}),(0,t.jsx)("div",{children:"Texture."}),(0,t.jsx)("div",{children:"Ritual."}),(0,t.jsx)("div",{className:"kazen-red-line"}),(0,t.jsx)("div",{style:{letterSpacing:".55em"},children:"風　然"})]})}),(0,t.jsxs)("button",{type:"button",className:"kazen-call",onClick:()=>y("PMD_KAZEN_CHECKOUT"),children:["Call to order ",(0,t.jsx)("span",{"aria-hidden":"true",children:"→"})]}),(0,t.jsx)("section",{className:`mt-9 kazen-menu-layout kazen-menu-layout-${ed}`,"data-kazen-menu-layout":ed,"aria-label":"Menu categories",children:"tabs"===ed?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("div",{className:"kazen-category-tabs",role:"tablist","aria-label":"Food categories",children:ei.map(e=>{let a=f(e),r=es===a||!z&&a===f("ALL");return(0,t.jsx)("button",{type:"button",role:"tab","aria-selected":r,className:`kazen-category-tab ${r?"is-active":""}`,onClick:()=>x(a),children:"ALL"===e?"All":e},a||e)})}),(0,t.jsx)("div",{className:"kazen-flat-items",style:{"--kazen-item-count":Math.min(em.length||1,8)},children:(0,t.jsx)("div",{className:"kazen-items kazen-items-flat",children:em.length?em.map(e=>{let a=N(e);return(0,t.jsxs)("div",{className:"kazen-item",role:"button",tabIndex:0,onClick:()=>ep(e),onKeyDown:t=>{("Enter"===t.key||" "===t.key)&&(t.preventDefault(),ep(e))},children:[(0,t.jsxs)("button",{type:"button",className:"kazen-item-main min-w-0 text-left",onClick:()=>ep(e),children:[a?(0,t.jsx)("img",{src:a,alt:e.name,className:"kazen-item-image"}):(0,t.jsx)("span",{className:"kazen-item-image-empty",children:"No image"}),(0,t.jsxs)("span",{className:"min-w-0",children:[(0,t.jsx)("span",{className:"kazen-item-name block truncate",children:e.name}),(0,t.jsx)("span",{className:"kazen-item-description block line-clamp-2",children:e.description||"Prepared with seasonal intention."}),(0,t.jsx)("span",{className:"kazen-item-price block",children:g(e.price)})]})]}),(0,t.jsx)("button",{type:"button",className:"kazen-add","aria-label":`Add ${e.name}`,onClick:t=>{t.stopPropagation(),ek(e,1)},children:(0,t.jsx)(m.Plus,{className:"h-5 w-5"})})]},e.id)}):(0,t.jsx)("div",{className:"py-5 text-center text-sm",style:{color:"var(--kazen-muted)"},children:"No visible items in this category."})})})]}):ei.map((a,r)=>{let n=f(a),o=f(z)===n,i=n===f("ALL")?e.items:el.get(n)||[];return(0,t.jsxs)("article",{className:`kazen-category ${o?"is-open":"is-closed"}`,children:[(0,t.jsxs)("button",{type:"button",className:"kazen-category-btn","aria-expanded":o,onClick:()=>x(o?"":n),children:[(0,t.jsxs)("span",{className:"kazen-category-label",children:[(0,t.jsx)("span",{className:"kazen-category-icon-shell","aria-hidden":"true",children:(0,t.jsx)("img",{src:h[r%h.length],alt:"",className:"kazen-category-icon"})}),(0,t.jsx)("span",{className:"kazen-category-title",children:a})]}),o?(0,t.jsx)(s.Minus,{className:"h-7 w-7",style:{color:"#242320",stroke:"#242320",fill:"none"}}):(0,t.jsx)(m.Plus,{className:"h-7 w-7"})]}),(0,t.jsx)("div",{className:`kazen-accordion ${o?"is-open":"is-closed"}`,"aria-hidden":!o,style:{"--kazen-item-count":Math.min(i.length||1,8)},children:(0,t.jsx)("div",{className:"kazen-items",children:i.length?i.map(e=>{let a=N(e);return(0,t.jsxs)("div",{className:"kazen-item",role:"button",tabIndex:0,onClick:()=>ep(e),onKeyDown:t=>{("Enter"===t.key||" "===t.key)&&(t.preventDefault(),ep(e))},children:[(0,t.jsxs)("button",{type:"button",className:"kazen-item-main min-w-0 text-left",onClick:()=>ep(e),children:[a?(0,t.jsx)("img",{src:a,alt:e.name,className:"kazen-item-image"}):(0,t.jsx)("span",{className:"kazen-item-image-empty",children:"No image"}),(0,t.jsxs)("span",{className:"min-w-0",children:[(0,t.jsx)("span",{className:"kazen-item-name block truncate",children:e.name}),(0,t.jsx)("span",{className:"kazen-item-description block line-clamp-2",children:e.description||"Prepared with seasonal intention."}),(0,t.jsx)("span",{className:"kazen-item-price block",children:g(e.price)})]})]}),(0,t.jsx)("button",{type:"button",className:"kazen-add","aria-label":`Add ${e.name}`,onClick:t=>{t.stopPropagation(),ek(e,1)},children:(0,t.jsx)(m.Plus,{className:"h-5 w-5"})})]},e.id)}):(0,t.jsx)("div",{className:"py-5 text-center text-sm",style:{color:"var(--kazen-muted)"},children:"No visible items in this category."})})})]},n||a)})}),(0,t.jsxs)("footer",{className:"pb-6 pt-14 text-center",children:[(0,t.jsx)("div",{style:{color:"var(--kazen-red)",fontSize:"1.7rem"},children:"✽"}),(0,t.jsx)("div",{className:"mt-3 text-[.64rem] uppercase tracking-[.34em]",style:{color:"var(--kazen-muted)"},children:"Thank you for dining with us"}),(0,t.jsx)("div",{className:"mt-2 text-sm tracking-[.28em]",style:{color:"var(--kazen-ink)"},children:"ありがとうございます"}),(0,t.jsx)("div",{className:"kazen-paymydine-footer-logo",children:(0,t.jsx)("img",{src:"/assets/media/uploads/PMD.png?v=1780008763",alt:"PayMyDine",className:"kazen-paymydine-footer-logo-image"})})]})]}),(0,t.jsxs)("nav",{className:"kazen-dock","aria-label":"Menu actions","data-kazen-table-order-active":Q.showTableOrder?"1":"0","data-pmd-kazen-v38-dock":"1",style:{gridTemplateColumns:Q.showTableOrder?"repeat(4, minmax(0, 1fr))":"repeat(3, minmax(0, 1fr))"},children:[(0,t.jsxs)("button",{type:"button",onClick:()=>{T("Request sent"),V(!1),D(!0)},children:[(0,t.jsx)(r.Bell,{className:"h-5 w-5"}),"Waiter"]}),(0,t.jsxs)("button",{type:"button",onClick:()=>{Y(!1),R(!0)},children:[(0,t.jsx)(d.MessageSquare,{className:"h-5 w-5"}),"Note"]}),Q.showTableOrder&&(0,t.jsxs)("button",{type:"button","aria-label":"Table Order",onClick:()=>{y("PMD_KAZEN_TABLE_ORDER")},children:[(0,t.jsx)(o.ClipboardList,{className:"h-5 w-5"}),"Table ",Q.tableOrderCount?`(${Q.tableOrderCount})`:""]}),(0,t.jsxs)("button",{type:"button","data-primary":"true",onClick:()=>y("PMD_KAZEN_CHECKOUT"),children:[(0,t.jsx)(c.ShoppingBag,{className:"h-5 w-5"}),"Checkout ",e.cart.count?`(${e.cart.count})`:""]})]}),E&&(0,t.jsx)(u,{item:E,images:function(e){if(!e)return[];let t=[],a=e=>{if(e){if(Array.isArray(e))return void e.forEach(a);t.push(e)}};a(e.image),a(e.image_url),a(e.thumb),a(e.thumbnail),a(e.images),a(e.gallery),a(e.additional_images),a(e.additionalImages),a(e.media);let r=new Set;return t.map(e=>v(e)).filter(e=>!(!e||r.has(e))&&(r.add(e),!0))}(E),price:g(E.price),quantity:_,onClose:()=>S(null),onDecrease:()=>C(e=>Math.max(1,e-1)),onIncrease:()=>C(e=>e+1),onAdd:()=>{E&&(ek(E,_),S(null))}}),!1,I&&H?(0,t.jsx)("div",{className:"kazen-solid-modal-overlay pmd-kazen-action-overlay pmd-kazen-action-toast-overlay",role:"status","aria-live":"polite","aria-label":"Waiter request sent",onClick:eu,children:(0,t.jsxs)("article",{className:"pmd-kazen-action-toast",onClick:e=>e.stopPropagation(),children:[(0,t.jsx)("span",{className:"pmd-kazen-action-toast-mark","aria-hidden":"true",children:"✓"}),(0,t.jsx)("span",{children:L})]})}):I?(0,t.jsx)(k,{title:"Call waiter",eyebrow:ec,onClose:eu,children:(0,t.jsxs)("div",{className:"pmd-kazen-action-form",children:[(0,t.jsx)("p",{className:"mt-4 leading-7",style:{color:"var(--kazen-muted)"},children:"Send a quiet request to the team for this table."}),(0,t.jsxs)("div",{className:"mt-5 grid grid-cols-2 gap-3",children:[(0,t.jsx)("button",{type:"button",className:"kazen-secondary",onClick:eu,children:"Cancel"}),(0,t.jsx)("button",{type:"button",className:"kazen-primary",onClick:()=>{let t,a=(t=String(e.tableNumber||ec||"table").trim().replace(/[^a-zA-Z0-9_-]+/g,"-")||"table",`pmd-kazen-waiter-cooldown:${t}`),r=Date.now();try{let e=Number(window.localStorage.getItem(a)||0),t=18e4-(r-e);if(e&&t>0){let e,a,r;T(`Waiter already notified. You can call again in ${(e=Math.max(1,Math.ceil(t/1e3)),a=Math.floor(e/60),r=String(e%60).padStart(2,"0"),`${a}:${r}`)}.`),V(!0);return}window.localStorage.setItem(a,String(r))}catch{}T("Request sent"),y("PMD_KAZEN_CALL_WAITER"),V(!0)},children:"Call"})]})]})}):null,K&&W?(0,t.jsx)("div",{className:"kazen-solid-modal-overlay pmd-kazen-action-overlay pmd-kazen-action-toast-overlay",role:"status","aria-live":"polite","aria-label":"Note sent",onClick:eh,children:(0,t.jsxs)("article",{className:"pmd-kazen-action-toast",onClick:e=>e.stopPropagation(),children:[(0,t.jsx)("span",{className:"pmd-kazen-action-toast-mark","aria-hidden":"true",children:"✓"}),(0,t.jsx)("span",{children:"Note sent"})]})}):K?(0,t.jsx)(k,{title:"Guest note",eyebrow:ec,onClose:eh,children:(0,t.jsxs)("div",{className:"pmd-kazen-action-form",children:[(0,t.jsx)("p",{className:"mt-4 text-sm",style:{color:"var(--kazen-muted)"},children:"Allergy, special request, timing, or anything the team should know."}),(0,t.jsx)("textarea",{value:G,onChange:e=>X(e.target.value),className:"kazen-field mt-5 min-h-32 resize-none",placeholder:"Write your note..."}),(0,t.jsxs)("div",{className:"mt-5 grid grid-cols-2 gap-3",children:[(0,t.jsx)("button",{type:"button",className:"kazen-secondary",onClick:eh,children:"Close"}),(0,t.jsx)("button",{type:"button",className:"kazen-primary",onClick:()=>{let e=G.trim();e&&(y("PMD_KAZEN_ADD_NOTE",{note:e}),X(""),Y(!0))},children:"Send"})]})]})}):null,O&&B?(0,t.jsx)("div",{className:"kazen-solid-modal-overlay pmd-kazen-action-overlay pmd-kazen-action-toast-overlay",role:"status","aria-live":"polite","aria-label":"Valet request sent",onClick:eb,children:(0,t.jsxs)("article",{className:"pmd-kazen-action-toast",onClick:e=>e.stopPropagation(),children:[(0,t.jsx)("span",{className:"pmd-kazen-action-toast-mark","aria-hidden":"true",children:"✓"}),(0,t.jsx)("span",{children:"Valet request sent"})]})}):O?(0,t.jsxs)(k,{title:"Valet",eyebrow:ec,onClose:eb,children:[(0,t.jsxs)("div",{className:"mt-5 space-y-3",children:[(0,t.jsx)("input",{className:"kazen-field",value:ee,onChange:e=>et(e.target.value),placeholder:"Name"}),(0,t.jsx)("input",{className:"kazen-field",value:ea,onChange:e=>er(e.target.value),placeholder:"License plate"}),(0,t.jsx)("input",{className:"kazen-field",value:en,onChange:e=>eo(e.target.value),placeholder:"Car model / color"})]}),(0,t.jsxs)("div",{className:"mt-5 grid grid-cols-2 gap-3",children:[(0,t.jsx)("button",{type:"button",className:"kazen-secondary",onClick:eb,children:"Close"}),(0,t.jsx)("button",{type:"button",className:"kazen-primary",onClick:()=>{y("PMD_KAZEN_GO_VALET",{values:{name:ee.trim()||"Guest",licensePlate:ea.trim()||"Not provided",carModel:en.trim()||"Not provided"}}),U(!0)},children:"Request"})]})]}):null]})}],74669)}]);