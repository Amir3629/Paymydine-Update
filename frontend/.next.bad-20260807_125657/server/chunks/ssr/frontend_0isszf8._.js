module.exports=[16937,(a,b,c)=>{},6664,(a,b,c)=>{a.r(16937);var d=a.r(45056),e=d&&"object"==typeof d&&"default"in d?d:{default:d},f="u">typeof process&&process.env&&!0,g=function(a){return"[object String]"===Object.prototype.toString.call(a)},h=function(){function a(a){var b=void 0===a?{}:a,c=b.name,d=void 0===c?"stylesheet":c,e=b.optimizeForSpeed,h=void 0===e?f:e;i(g(d),"`name` must be a string"),this._name=d,this._deletedRulePlaceholder="#"+d+"-deleted-rule____{}",i("boolean"==typeof h,"`optimizeForSpeed` must be a boolean"),this._optimizeForSpeed=h,this._serverSheet=void 0,this._tags=[],this._injected=!1,this._rulesCount=0,this._nonce=null}var b,c=a.prototype;return c.setOptimizeForSpeed=function(a){i("boolean"==typeof a,"`setOptimizeForSpeed` accepts a boolean"),i(0===this._rulesCount,"optimizeForSpeed cannot be when rules have already been inserted"),this.flush(),this._optimizeForSpeed=a,this.inject()},c.isOptimizeForSpeed=function(){return this._optimizeForSpeed},c.inject=function(){var a=this;i(!this._injected,"sheet already injected"),this._injected=!0,this._serverSheet={cssRules:[],insertRule:function(b,c){return"number"==typeof c?a._serverSheet.cssRules[c]={cssText:b}:a._serverSheet.cssRules.push({cssText:b}),c},deleteRule:function(b){a._serverSheet.cssRules[b]=null}}},c.getSheetForTag=function(a){if(a.sheet)return a.sheet;for(var b=0;b<document.styleSheets.length;b++)if(document.styleSheets[b].ownerNode===a)return document.styleSheets[b]},c.getSheet=function(){return this.getSheetForTag(this._tags[this._tags.length-1])},c.insertRule=function(a,b){return i(g(a),"`insertRule` accepts only strings"),"number"!=typeof b&&(b=this._serverSheet.cssRules.length),this._serverSheet.insertRule(a,b),this._rulesCount++},c.replaceRule=function(a,b){this._optimizeForSpeed;var c=this._serverSheet;if(b.trim()||(b=this._deletedRulePlaceholder),!c.cssRules[a])return a;c.deleteRule(a);try{c.insertRule(b,a)}catch(d){f||console.warn("StyleSheet: illegal rule: \n\n"+b+"\n\nSee https://stackoverflow.com/q/20007992 for more info"),c.insertRule(this._deletedRulePlaceholder,a)}return a},c.deleteRule=function(a){this._serverSheet.deleteRule(a)},c.flush=function(){this._injected=!1,this._rulesCount=0,this._serverSheet.cssRules=[]},c.cssRules=function(){return this._serverSheet.cssRules},c.makeStyleTag=function(a,b,c){b&&i(g(b),"makeStyleTag accepts only strings as second parameter");var d=document.createElement("style");this._nonce&&d.setAttribute("nonce",this._nonce),d.type="text/css",d.setAttribute("data-"+a,""),b&&d.appendChild(document.createTextNode(b));var e=document.head||document.getElementsByTagName("head")[0];return c?e.insertBefore(d,c):e.appendChild(d),d},b=[{key:"length",get:function(){return this._rulesCount}}],function(a,b){for(var c=0;c<b.length;c++){var d=b[c];d.enumerable=d.enumerable||!1,d.configurable=!0,"value"in d&&(d.writable=!0),Object.defineProperty(a,d.key,d)}}(a.prototype,b),a}();function i(a,b){if(!a)throw Error("StyleSheet: "+b+".")}var j=function(a){for(var b=5381,c=a.length;c;)b=33*b^a.charCodeAt(--c);return b>>>0},k={};function l(a,b){if(!b)return"jsx-"+a;var c=String(b),d=a+c;return k[d]||(k[d]="jsx-"+j(a+"-"+c)),k[d]}function m(a,b){var c=a+(b=b.replace(/\/style/gi,"\\/style"));return k[c]||(k[c]=b.replace(/__jsx-style-dynamic-selector/g,a)),k[c]}var n=function(){function a(a){var b=void 0===a?{}:a,c=b.styleSheet,d=void 0===c?null:c,e=b.optimizeForSpeed,f=void 0!==e&&e;this._sheet=d||new h({name:"styled-jsx",optimizeForSpeed:f}),this._sheet.inject(),d&&"boolean"==typeof f&&(this._sheet.setOptimizeForSpeed(f),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed()),this._fromServer=void 0,this._indices={},this._instancesCounts={}}var b=a.prototype;return b.add=function(a){var b=this;void 0===this._optimizeForSpeed&&(this._optimizeForSpeed=Array.isArray(a.children),this._sheet.setOptimizeForSpeed(this._optimizeForSpeed),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed());var c=this.getIdAndRules(a),d=c.styleId,e=c.rules;if(d in this._instancesCounts){this._instancesCounts[d]+=1;return}var f=e.map(function(a){return b._sheet.insertRule(a)}).filter(function(a){return -1!==a});this._indices[d]=f,this._instancesCounts[d]=1},b.remove=function(a){var b=this,c=this.getIdAndRules(a).styleId;if(function(a,b){if(!a)throw Error("StyleSheetRegistry: "+b+".")}(c in this._instancesCounts,"styleId: `"+c+"` not found"),this._instancesCounts[c]-=1,this._instancesCounts[c]<1){var d=this._fromServer&&this._fromServer[c];d?(d.parentNode.removeChild(d),delete this._fromServer[c]):(this._indices[c].forEach(function(a){return b._sheet.deleteRule(a)}),delete this._indices[c]),delete this._instancesCounts[c]}},b.update=function(a,b){this.add(b),this.remove(a)},b.flush=function(){this._sheet.flush(),this._sheet.inject(),this._fromServer=void 0,this._indices={},this._instancesCounts={}},b.cssRules=function(){var a=this,b=this._fromServer?Object.keys(this._fromServer).map(function(b){return[b,a._fromServer[b]]}):[],c=this._sheet.cssRules();return b.concat(Object.keys(this._indices).map(function(b){return[b,a._indices[b].map(function(a){return c[a].cssText}).join(a._optimizeForSpeed?"":"\n")]}).filter(function(a){return!!a[1]}))},b.styles=function(a){var b,c;return b=this.cssRules(),void 0===(c=a)&&(c={}),b.map(function(a){var b=a[0],d=a[1];return e.default.createElement("style",{id:"__"+b,key:"__"+b,nonce:c.nonce?c.nonce:void 0,dangerouslySetInnerHTML:{__html:d}})})},b.getIdAndRules=function(a){var b=a.children,c=a.dynamic,d=a.id;if(c){var e=l(d,c);return{styleId:e,rules:Array.isArray(b)?b.map(function(a){return m(e,a)}):[m(e,b)]}}return{styleId:l(d),rules:Array.isArray(b)?b:[b]}},b.selectFromServer=function(){return Array.prototype.slice.call(document.querySelectorAll('[id^="__jsx-"]')).reduce(function(a,b){return a[b.id.slice(2)]=b,a},{})},a}(),o=d.createContext(null);function p(){return new n}function q(){return d.useContext(o)}function r(a){var b=q();return b&&b.add(a),null}o.displayName="StyleSheetContext",e.default.useInsertionEffect||e.default.useLayoutEffect,r.dynamic=function(a){return a.map(function(a){return l(a[0],a[1])}).join(" ")},c.StyleRegistry=function(a){var b=a.registry,c=a.children,f=d.useContext(o),g=d.useState(function(){return f||b||p()})[0];return e.default.createElement(o.Provider,{value:g},c)},c.createStyleRegistry=p,c.style=r,c.useStyleRegistry=q},96438,(a,b,c)=>{b.exports=a.r(6664).style},52549,a=>{a.v({badge:"KazenBottomDock-module__g-C2hq__badge",button:"KazenBottomDock-module__g-C2hq__button",dock:"KazenBottomDock-module__g-C2hq__dock",icon:"KazenBottomDock-module__g-C2hq__icon",primary:"KazenBottomDock-module__g-C2hq__primary"})},4669,(a,b,c)=>{"use strict";b.exports="SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED"},91815,(a,b,c)=>{"use strict";var d=a.r(4669);function e(){}function f(){}f.resetWarningCache=e,b.exports=function(){function a(a,b,c,e,f,g){if(g!==d){var h=Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");throw h.name="Invariant Violation",h}}function b(){return a}a.isRequired=a;var c={array:a,bigint:a,bool:a,func:a,number:a,object:a,string:a,symbol:a,any:a,arrayOf:b,element:a,elementType:a,instanceOf:b,node:a,objectOf:b,oneOf:b,oneOfType:b,shape:b,exact:b,checkPropTypes:f,resetWarningCache:e};return c.PropTypes=c,c}},65593,(a,b,c)=>{b.exports=a.r(91815)()},50355,a=>{a.v({badge:"ModernGreenBottomDock-module__bGvAoG__badge",button:"ModernGreenBottomDock-module__bGvAoG__button",dock:"ModernGreenBottomDock-module__bGvAoG__dock",icon:"ModernGreenBottomDock-module__bGvAoG__icon",primary:"ModernGreenBottomDock-module__bGvAoG__primary"})},43707,a=>{a.v({badge:"OrganicBottomDock-module__mo23YG__badge",button:"OrganicBottomDock-module__mo23YG__button",dock:"OrganicBottomDock-module__mo23YG__dock",icon:"OrganicBottomDock-module__mo23YG__icon",primary:"OrganicBottomDock-module__mo23YG__primary"})},48120,a=>{a.v({badge:"GoldBottomDock-module__wdX1ma__badge",button:"GoldBottomDock-module__wdX1ma__button",dock:"GoldBottomDock-module__wdX1ma__dock",icon:"GoldBottomDock-module__wdX1ma__icon",primary:"GoldBottomDock-module__wdX1ma__primary"})},22224,a=>{"use strict";var b,c,d=a.i(57850),e=a.i(45056),f=a.i(97814),g=a.i(6304);let h={chef_section_enabled:!1,bestseller_section_enabled:!1,show_card_badges:!0,show_modal_badges:!0,chef_label:"Chef’s Choice",bestseller_label:"Best Seller",max_chef_items:8,max_bestseller_items:8,badge_display_mode:"priority_only",badge_style:"corner_ribbon",badge_position:"image_top_left",show_badge_text_on_cards:!1,show_badge_text_in_modal:!0,section_placement:"hidden"},i=a=>!0===a||1===a||"1"===a,j=a=>{if(null==a||""===a)return null;let b=Number(a);return Number.isFinite(b)?b:null},k=a=>{let b=Array.isArray(a)?a:[],c=new Set,d=[];return b.forEach(a=>{let b=(a=>{if(!a)return"";let b=String(a).trim();return b?/^https?:\/\//i.test(b)||b.startsWith("/")?b:b.startsWith("assets/media/")?`/${b}`:b.startsWith("attachments/public/")||b.startsWith("uploads/")?`/assets/media/${b}`:/\.(png|jpe?g|webp|gif|svg)(\?|#)?$/i.test(b)?`/assets/media/uploads/${b}`:b:""})("string"==typeof a?a:a?.url||a?.image||a?.src||a?.image_path||a?.path||"");b&&!c.has(b)&&(c.add(b),d.push(b))}),d};async function l(){try{var a;let b,c,d,e,l,m,n=await f.apiClient.getMenu(),o=n?.data?.items??n?.data??[],p=(Array.isArray(o)?o:[]).map(a=>((a,b)=>{let c=a.image||"/placeholder.svg?width=200&height=200";if(c&&c.startsWith("/api/media/")){let a=g.EnvironmentConfig.getInstance().backendBaseUrl();c=`${a}${c}`}return{id:a.id,name:a.name,nameKey:void 0,description:a.description||"",descriptionKey:void 0,price:a.price,image:c,images:k(a.images),gallery:k(a.gallery),media:Array.isArray(a.media)?a.media:[],category:b||a.category_name||"Main Course",category_id:a.category_id,category_name:a.category_name,calories:j(a.calories??a.nutrition?.calories),protein:j(a.protein??a.nutrition?.protein),carbs:j(a.carbs??a.nutrition?.carbs),fat:j(a.fat??a.nutrition?.fat),sugar:j(a.sugar??a.nutrition?.sugar),serving_size:a.serving_size||a.nutrition?.serving_size||null,color:a.color||null,nutrition:a.nutrition||null,allergens:a.allergens||[],allergy_tags:a.allergy_tags||a.allergens||[],halal:i(a.halal),vegetarian:i(a.vegetarian),vegan:i(a.vegan),stock_qty:a.stock_qty,minimum_qty:a.minimum_qty||1,available:!1!==a.available&&(null===a.stock_qty||(a.stock_qty??0)>0),options:a.options||[],prep_time_minutes:Number(a.prep_time_minutes||15),is_chef_recommended:i(a.is_chef_recommended),is_bestseller:i(a.is_bestseller),bestseller_source:a.bestseller_source||null,popularity_count:Number(a.popularity_count||0)}})(a,a.category_name))||[],q=await f.apiClient.getCategories(),r=(q?.data??[]).map(a=>a.category_name??a.name).filter(Boolean),s={};return p.forEach(a=>{let b=a.category;s[b]||(s[b]=[]),s[b].push(a)}),{categories:Object.values(s),menuItems:p,categoryNames:r,isFrontendConfigured:n?.data?.is_frontend_configured!==!1,menuHighlightSettings:(b=(a=n?.data?.menu_highlight_settings)&&"object"==typeof a?a:{},c=(a,c)=>{for(let c of a){let a=b[c];if(null!=a&&""!==a)return a}return c},d=(a,b)=>{let d=c(a,b);if("boolean"==typeof d)return d;let e=String(d).trim().toLowerCase();return!!["1","true","yes","on","enabled"].includes(e)||!["0","false","no","off","disabled"].includes(e)&&b},e=(a,b)=>{let d=Number(c(a,b));return Number.isFinite(d)?Math.max(1,Math.min(24,Math.round(d))):b},l=(a,b)=>String(c(a,b)??"").trim()||b,m=(a,b,c)=>{let d=l(a,b);return c.includes(d)?d:b},{chef_section_enabled:d(["enable_chef_recommendations_section","chef_section_enabled"],!1),bestseller_section_enabled:d(["enable_best_sellers_section","bestseller_section_enabled"],!1),show_card_badges:d(["show_badges_on_cards","show_card_badges"],!0),show_modal_badges:d(["show_badges_in_modal","show_modal_badges"],!0),chef_label:l(["chef_recommendation_label","chef_label"],h.chef_label),bestseller_label:l(["best_seller_label","bestseller_label"],h.bestseller_label),max_chef_items:e(["max_chef_recommendation_items","max_chef_items"],8),max_bestseller_items:e(["max_best_seller_items","max_bestseller_items"],8),badge_display_mode:m(["badge_display_mode"],"priority_only",["priority_only","show_all"]),badge_style:m(["badge_style"],"corner_ribbon",["minimal_circle","corner_ribbon","soft_pill","luxury_label"]),badge_position:m(["badge_position"],"image_top_left",["image_top_left","image_top_right","title_inline","hidden"]),show_badge_text_on_cards:d(["show_badge_text_on_cards"],!1),show_badge_text_in_modal:d(["show_badge_text_in_modal"],!0),section_placement:m(["section_placement"],"hidden",["top","after_categories","hidden"])}),menuCacheVersion:String(n?.data?.menu_cache_version||"default")}}catch(a){return console.error("Failed to fetch menu data from API:",a),{categories:[],menuItems:[],categoryNames:[],isFrontendConfigured:!0,menuHighlightSettings:h,menuCacheVersion:"fallback"}}}let m=[],n=[];var o=a.i(31324),p=a.i(79199),q=a.i(51961),r=a.i(84753);function s(){let a=(0,r.useCmsStore)(a=>a.taxSettings),b=(0,r.useCmsStore)(a=>a.loadVATSettings),c=(0,r.useCmsStore)(a=>a.loadTaxSettings);return{taxSettings:a,loadVATSettings:b,loadTaxSettings:c,updateVATSettings:(0,r.useCmsStore)(a=>a.updateVATSettings),updateTaxSettings:(0,r.useCmsStore)(a=>a.updateTaxSettings)}}function t(){return r.useCmsStore.getState().taxSettings}var u=a.i(70438),v=a.i(91560),w=a.i(93609);function x(a,b){let c=(Array.isArray(a?.order_totals)?a.order_totals:[]).find(a=>String(a?.code||"").toLowerCase()===b.toLowerCase()),d=Number(c?.value??0);return Number.isFinite(d)?d:0}function y(a,b=0){let c=(Array.isArray(a?.order_totals)?a.order_totals:[]).find(a=>"tax"===String(a?.code||"").toLowerCase()),d=String(c?.title||"").match(/([0-9]+(?:\.[0-9]+)?)\s*%/),e=d?Number(d[1]):Number(b||0);return Number.isFinite(e)?e:0}function z(a){let b=Math.max(2,Math.min(10,a)),c=Math.floor(100/b),d=100-c*b;return Array.from({length:b},(a,b)=>c+(0===b?d:0))}function A(a){let b=Number(a);return Number.isFinite(b)&&b>0?b:null}function B(a){return["cancelled","canceled","void","voided","refunded","removed"].includes(String(a?.status??a?.order_status??a?.item_status??a?.state??a?.void_status??"").trim().toLowerCase())||a?.cancelled===!0||a?.canceled===!0||a?.is_cancelled===!0||a?.is_canceled===!0||a?.is_void===!0||a?.voided===!0}function C(a){let b=Math.max(1,Number(a?.quantity||1)),c=Number(a?.price??a?.unit_price);if(Number.isFinite(c))return c;let d=Number(a?.subtotal??a?.total);return Number.isFinite(d)?d/b:0}function D(a=[]){let b=new Map;return a.forEach((a,c)=>{let d;if(B(a))return;let e=Math.max(1,Number(a?.quantity||1)),f=C(a),g=String(a?.name||`Item ${c+1}`),h=(d=a?.options??a?.modifiers??a?.selected_options??null)?"string"==typeof d?d:Array.isArray(d)?JSON.stringify(d.map(a=>"object"==typeof a?Object.keys(a).sort().reduce((b,c)=>({...b,[c]:a[c]}),{}):a)):"object"==typeof d?JSON.stringify(Object.keys(d).sort().reduce((a,b)=>({...a,[b]:d[b]}),{})):String(d):"",i=`${a?.menu_id||a?.order_menu_id||a?.id||g}|${g}|${h}`,j=b.get(i);j?(j.quantity+=e,j.subtotal+=f*e):b.set(i,{...a,name:g,quantity:e,price:f,subtotal:f*e,optionsKey:h})}),Array.from(b.values())}function E(a){if(null==a)return null;let b=String(a).trim();return b&&"undefined"!==b&&"null"!==b?b:null}function F(a,b){return{table_id:E(a?.table_id),table_no:E(a?.table_no),qr:E(a?.qr_code)||E(b)}}function G(a){return!!(E(a?.table_id)||E(a?.table_no)||E(a?.qr))}function H(a){if(!a?.success||!a.status)return!1;let b=String(a?.status||"").toLowerCase(),c=String(a?.paymentStatus||a?.payment_status||a?.totals?.paymentStatus||"").toLowerCase(),d=Number(a?.remainingAmount??a?.remaining_amount??a?.totals?.remainingAmount??a?.totals?.remaining_amount??NaN);return!("empty"===b||["paid","completed","complete","delivered","cancelled","canceled"].includes(b)||["paid","settled"].includes(c)||Number.isFinite(d)&&d<=0&&"draft"!==b)}function I(a,b=0){let c=Number(a);return Number.isFinite(c)?c:b}function J(...a){for(let b of a){let a=I(b,0);if(a>0)return a}return 0}function K(a,b,c=0){let d=a.totals||{subtotal:0,tax:0,total:0,orderTotal:0,settledAmount:0,remainingAmount:0},e=a.order_id??a.orderId??null,f=Array.isArray(a.items)?a.items.filter(a=>!B(a)):[],g=f.reduce((a,b)=>{let c=Math.max(1,I(b?.quantity??b?.qty,1)),d=J(b?.subtotal,b?.line_total,b?.total);return d>0?a+d:a+I(b?.price??b?.unit_price??b?.menu_price,0)*c},0),h=J(d.orderTotal,d.total,a.total,g),i=J(d.total,a.total,h),j=I(d.settledAmount??a.settlement?.settledAmount,0),k=J(d.remainingAmount,a.settlement?.remainingAmount,i-j,h-j,i);return{orderId:e,order_id:e,orderNumber:a.orderNumber??a.order_id??a.orderId??null,status:a.status||"submitted_unpaid",paymentStatus:"paid"===a.status?"paid":a.paymentStatus||a.settlement?.settlementStatus||"unpaid",tableId:a.table_id||b?.table_id||null,tableNumber:a.table_no||b?.table_no||b?.table_id||null,subtotal:J(d.subtotal,x(a,"subtotal"),g),vatAmount:I(d.tax??x(a,"tax"),0),vatPercentage:y(a,c),total:i,orderTotal:h,settledAmount:j,remainingAmount:k,settlementStatus:a.settlement?.settlementStatus||a.paymentStatus||"unpaid",settlement_status:a.settlement?.settlementStatus||a.paymentStatus||"unpaid",submittedItems:f,payment:a.payment||"qr_pay_later"}}var L=a.i(25107);function M(a,b){let c="number"==typeof a?a:0,d=b?.currency??"EUR",e=b?.locale??"en-IE";try{return new Intl.NumberFormat(e,{style:"currency",currency:d,minimumFractionDigits:2,maximumFractionDigits:2}).format(c)}catch{return`€${c.toFixed(2)}`}}function N({item:a,onSelect:b,onAdd:c}){return(0,d.jsxs)("article",{className:"rounded-3xl border border-[#ded3bd] bg-[#fffaf0] p-4 text-[#343529]",children:[(0,d.jsxs)("button",{type:"button",className:"text-left",onClick:()=>b?.(a),children:[(0,d.jsx)("h3",{className:"text-lg font-semibold",children:a?.name||"Menu item"}),(0,d.jsx)("p",{className:"mt-1 text-sm text-[#716f5e]",children:a?.description||a?.category||"Freshly prepared."})]}),(0,d.jsxs)("div",{className:"mt-4 flex items-center justify-between",children:[(0,d.jsx)("strong",{children:M(Number(a?.price||0))}),(0,d.jsx)("button",{type:"button",className:"rounded-full bg-[#b88940] px-4 py-2 text-sm font-bold text-white",onClick:c,children:"Add"})]})]})}let O=(0,e.createContext)(null);function P({actions:a,children:b}){return(0,d.jsx)(O.Provider,{value:a,children:b})}function Q(a){let b=String(a||"").trim().toLowerCase().replace(/[_\s-]+/g,"-");return["tabs","tab","tabbed","classic","normal","list","flat","category-tabs","categories-top","top-categories","category-tabs-full-item-list"].includes(b)?"tabs":["accordion","accordions","collapsed","expandable","category-accordion"].includes(b)?"accordion":""}function R({src:a,sourceItems:b,cartItems:c,totalItems:f,totalPrice:g,lastInteractedItem:h,categories:i,restaurantName:j,logoUrl:k,tableNumber:l,menuLayout:m="accordion",onAddItem:n,onOpenItem:o,onCheckout:p,onCallWaiter:q,onOpenNote:r,onOpenValet:s,onTableOrder:t,showTableOrder:u=!1,showValet:v=!0,tableOrderCount:w=0,children:x}){(0,e.useRef)("");let[y,z]=(0,e.useState)(Q(m)||"accordion");return(0,e.useEffect)(()=>{let a=Q(m);a&&z(a)},[m]),(0,e.useEffect)(()=>{},[]),(0,e.useEffect)(()=>{},[]),(0,e.useEffect)(()=>{},[b,c,f,g,h,i,j,k,l,y,n,o,p,q,r,s,t,u,v,w]),(0,d.jsxs)("div",{"data-pmd-kazen-theme":"1",className:"pmd-customer-page page--menu relative min-h-screen w-full",style:{background:"#f7f3ec",color:"#1f1f1d"},children:[(0,d.jsx)("iframe",{id:"pmd-kazen-japanese-frame",title:"Kazen Japanese Minimal Menu",src:a,className:"block h-screen w-full border-0",style:{width:"100%",height:"100dvh",minHeight:"100vh",border:0,display:"block",background:"#f7f3ec"}}),x]})}var S=a.i(96438),T=a.i(76252),U=a.i(31261);let V=(0,U.default)("Clock3",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16.5 12",key:"1aq6pp"}]]);var W=a.i(72481);let X=(0,U.default)("Earth",[["path",{d:"M21.54 15H17a2 2 0 0 0-2 2v4.54",key:"1djwo0"}],["path",{d:"M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",key:"1tzkfa"}],["path",{d:"M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05",key:"14pb5j"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]),Y=(0,U.default)("Instagram",[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"5",ry:"5",key:"2e1cvw"}],["path",{d:"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",key:"9exkf1"}],["line",{x1:"17.5",x2:"17.51",y1:"6.5",y2:"6.5",key:"r4j83e"}]]),Z=(0,U.default)("Link2",[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]]);var $=a.i(61185);let _=(0,U.default)("QrCode",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]),aa=(0,U.default)("Star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]),ab=(0,U.default)("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]),ac=new Set(["card","apple_pay","google_pay","wero","paypal","cod"]);function ad(a){return String(a||"").trim().toLowerCase()||null}function ae(a,b){let c=ad(b);return c&&(a||[]).find(a=>ad(a.code)===c)||null}function af(a){let b=ad(a);return!!(b&&ac.has(b))}let ag=a=>{let b=Number(a??0);return M(Number.isFinite(b)?b:0)},ah=a=>Math.max(1,Number(a?.quantity||a?.qty||1)),ai=(a,b="Item")=>String(a?.__pmdDisplayName||a?.name||a?.item?.name||a?.menu_name||a?.item_name||b),aj=a=>{let b=Number(a?.__pmdDisplaySubtotal??a?.subtotal??a?.total??a?.amount);if(Number.isFinite(b)&&b>0)return b;let c=Number(a?.price??a?.unit_price??a?.item?.price??0);return Number.isFinite(c)?c*ah(a):0};function ak({variant:a="secondary",children:b,className:c="",type:e="button",...f}){let g="primary"===a?"primary":"secondary";return(0,d.jsx)("button",{...f,type:e,"data-kzco-button":g,className:["kzco-btn","kzco-btn-action",`kzco-btn-${g}`,c].filter(Boolean).join(" "),children:b})}function al({variant:a="secondary",children:b,className:c="",type:e="button",...f}){let g="primary"===a?"primary":"secondary";return(0,d.jsx)("button",{...f,type:e,"data-kzco-button":g,className:["kzco-btn","kzco-btn-square",`kzco-btn-${g}`,c].filter(Boolean).join(" "),children:b})}function am({title:a,eyebrow:b,onBack:c}){return(0,d.jsxs)("header",{className:"kzco-head",children:[(0,d.jsxs)("div",{className:"kzco-title-wrap",children:[b?(0,d.jsx)("span",{className:"kzco-eyebrow",children:b}):null,(0,d.jsx)("h2",{children:a})]}),(0,d.jsx)(al,{"aria-label":"Close",onClick:c,className:"kzco-close",children:(0,d.jsxs)("svg",{width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.9",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[(0,d.jsx)("path",{d:"M18 6 6 18"}),(0,d.jsx)("path",{d:"m6 6 12 12"})]})})]})}function an({children:a,columns:b=1}){return(0,d.jsx)("div",{className:`kzco-actions kzco-actions-${b}`,children:a})}function ao({children:a,className:b=""}){return(0,d.jsx)("section",{className:["kzco-card",b].filter(Boolean).join(" "),children:a})}function ap({label:a,value:b,strong:c=!1}){return(0,d.jsxs)("div",{className:c?"kzco-line kzco-line-strong":"kzco-line",children:[(0,d.jsx)("span",{children:a}),(0,d.jsx)("strong",{children:ag(b)})]})}function aq({items:a}){let b=Array.isArray(a)?a:[];return 0===b.length?(0,d.jsx)("p",{className:"kzco-muted",children:"No items yet"}):(0,d.jsx)("div",{className:"kzco-list kzco-items-list","aria-label":"Order items",children:b.map((a,b)=>(0,d.jsxs)("div",{className:"kzco-cart-line",children:[(0,d.jsxs)("span",{children:[ah(a),"x ",ai(a,`Item ${b+1}`)]}),(0,d.jsx)("strong",{children:ag(aj(a))})]},`${ai(a)}-${b}`))})}function ar({splitMethod:a,chooseSplitMethod:b}){let c=[["equal","Split equally"],["items",(0,d.jsxs)(d.Fragment,{children:["By order",(0,d.jsx)("br",{}),"items"]})],["shares","By shares"]];return(0,d.jsx)("div",{className:"kzco-tabs",role:"tablist","aria-label":"Split method",children:c.map(([c,e])=>(0,d.jsx)(ak,{variant:"secondary","data-kzco-active":a===c?"1":"0","aria-pressed":a===c,onClick:()=>b?.(c),className:"kzco-btn-segment",children:e},c))})}function as({splitGuestCount:a=2,addSplitGuest:b,removeSplitGuest:c}){return(0,d.jsxs)("div",{className:"kzco-stepper","data-kzco-control":"people-stepper",children:[(0,d.jsx)(al,{"aria-label":"Remove guest",disabled:a<=2,onClick:c,className:"kzco-stepper-btn",children:(0,d.jsx)("span",{"aria-hidden":"true",children:"−"})}),(0,d.jsx)("strong",{"aria-label":`${a} people`,children:a}),(0,d.jsx)(al,{variant:"primary","aria-label":"Add guest",disabled:a>=10,onClick:b,className:"kzco-stepper-btn",children:(0,d.jsx)("span",{"aria-hidden":"true",children:"＋"})})]})}function at({guests:a=[]}){return Array.isArray(a)&&0!==a.length?(0,d.jsx)("div",{className:"kzco-chip-row",children:a.map((a,b)=>(0,d.jsxs)("span",{className:"kzco-chip",children:[(0,d.jsx)("b",{children:a.avatar||a.name?.slice(0,1)||b+1}),a.name]},`${a.name}-${b}`))}):null}function au({code:a,label:b}){let c=String(a||"").toLowerCase(),e=String(b||a||"Payment").replace(/[_-]+/g," ");return"card"===c||"stripe"===c||"credit_card"===c?(0,d.jsxs)("span",{className:"kzco-paymark kzco-paymark-card","aria-hidden":"true",children:[(0,d.jsxs)("svg",{viewBox:"0 0 24 24",role:"img",focusable:"false",children:[(0,d.jsx)("rect",{x:"3.5",y:"5.5",width:"17",height:"13",rx:"1.5"}),(0,d.jsx)("path",{d:"M3.5 9h17"}),(0,d.jsx)("path",{d:"M7 15h4.2"})]}),(0,d.jsx)("span",{className:"kzco-paymark-label",children:"Card"})]}):"apple_pay"===c||"applepay"===c?(0,d.jsxs)("span",{className:"kzco-paymark kzco-paymark-apple","aria-hidden":"true",children:[(0,d.jsx)("span",{className:"kzco-paymark-symbol",children:""}),(0,d.jsx)("span",{className:"kzco-paymark-label",children:"Pay"})]}):"google_pay"===c||"googlepay"===c||"gpay"===c?(0,d.jsxs)("span",{className:"kzco-paymark kzco-paymark-google","aria-hidden":"true",children:[(0,d.jsx)("span",{className:"kzco-paymark-g",children:"G"}),(0,d.jsx)("span",{className:"kzco-paymark-label",children:"Pay"})]}):"wero"===c?(0,d.jsx)("span",{className:"kzco-paymark kzco-paymark-wero","aria-hidden":"true",children:(0,d.jsx)("span",{className:"kzco-paymark-label",children:"wero"})}):"paypal"===c||"pay_pal"===c?(0,d.jsxs)("span",{className:"kzco-paymark kzco-paymark-paypal","aria-hidden":"true",children:[(0,d.jsx)("span",{className:"kzco-paymark-p",children:"P"}),(0,d.jsx)("span",{className:"kzco-paymark-label",children:"PayPal"})]}):"cod"===c||"cash"===c||"cash_on_delivery"===c?(0,d.jsx)("span",{className:"kzco-paymark kzco-paymark-cash","aria-hidden":"true",children:(0,d.jsxs)("svg",{viewBox:"0 0 24 24",role:"img",focusable:"false",children:[(0,d.jsx)("path",{d:"M4 8.5h16v9H4z"}),(0,d.jsx)("circle",{cx:"12",cy:"13",r:"2.2"}),(0,d.jsx)("path",{d:"M7 13h1.2M15.8 13H17"}),(0,d.jsx)("path",{d:"M6.5 6.5h15v8"})]})}):(0,d.jsx)("span",{className:"kzco-paymark kzco-paymark-text","aria-hidden":"true",children:(0,d.jsx)("span",{className:"kzco-paymark-label",children:e})})}function av({loadingPayments:a,visiblePaymentMethods:b,selectedPaymentMethod:c,onPaymentMethodSelect:e,canShowPaymentMethods:f=!0,onBackToReview:g}){let h=Array.isArray(b)?b:[];return(0,d.jsxs)("section",{className:"kzco-section kzco-payment-methods",children:[(0,d.jsx)("h3",{className:"kzco-section-title",children:"Payment Methods"}),a?(0,d.jsx)("p",{className:"kzco-muted",children:"Loading payment methods..."}):0===h.length?(0,d.jsx)("p",{className:"kzco-muted",children:"No payment methods available"}):(0,d.jsxs)(d.Fragment,{children:[!f&&(0,d.jsxs)("div",{className:"kzco-payment-blocked-clean",children:[(0,d.jsx)("strong",{children:"Send to kitchen first"}),(0,d.jsx)("p",{children:"Your selected items are still only in the table draft. Please confirm and send the table order to the kitchen first. Payment starts after the backend creates a real order ID."}),(0,d.jsx)("button",{type:"button","data-kzco-button":"secondary",className:"kzco-btn kzco-btn-action kzco-btn-secondary",onClick:()=>g?.(),children:"Back to table order"})]}),(0,d.jsx)("div",{className:"kzco-method-grid",children:h.map(a=>{let b=String(a.code||""),f=c===a.code;return(0,d.jsx)("button",{type:"button","aria-label":a.name||b,"aria-pressed":f,"data-kzco-active":f?"1":"0",className:"kzco-btn kzco-btn-tile kzco-btn-secondary kzco-method-tile",onClick:()=>e?.(b),children:(0,d.jsx)(au,{code:b,label:a.name||b})},b)})})]})]})}function aw(a){let b=a.target;b&&"INPUT"===b.tagName&&"number"===b.type&&"0"===b.value&&b.select()}function ax(a){let b=a.target;if(!b||"INPUT"!==b.tagName||"number"!==b.type)return;let c=function(a){let b=String(a??"").trim();if(""===b)return"";if("."===b)return"0.";if(b.startsWith("."))return`0${b}`;let c=b.replace(/^0+(?=\d)/,"");return""===c?"0":c}(b.value);c!==b.value&&(b.value=c)}function ay(a,b){return(Math.max(0,Number(a||0))*Math.max(0,Number(b||0))/100).toFixed(2)}function az(a){var b;let c,{checkoutStep:f,onClose:g,hasPersonalItems:h,personalItems:i=[],tableDraft:j,tableDraftItems:k=[],tableDraftTotal:l=0,submittedSnapshot:m,submittedItems:n=[],estimatedMinutes:o=15,subtotal:p=0,finalTotal:q=0,paymentBaseAmount:r=0,paymentSubtotalAmount:s=0,paymentVatAmount:t=0,paymentVatPercentage:u=0,paymentPayableTotal:v=0,paymentTipAmount:w=0,paymentCouponDiscount:x=0,paidTipAmount:y=0,paidCouponDiscount:z=0,paidAmountTotal:A=0,submittedBaseTotal:B=0,paymentTipPercentage:C,paymentCustomTip:D,tipPercentages:E=[5,10],tipEnabled:F,couponCode:G,setCouponCode:H,appliedCoupon:I,couponError:J,couponLoading:K,setCouponError:L,setCouponLoading:M,validateCoupon:N,onApplyCoupon:O,onRemoveCoupon:P,removeCoupon:Q,visiblePaymentMethods:R=[],loadingPayments:U,selectedPaymentMethod:ac,onPaymentMethodSelect:ad,renderPaymentForm:ae,renderPaymentButton:ah,handleConfirmMyItems:al,handleSubmitTableDraft:au,setCheckoutStep:az,startSplitFlow:aA,chooseSplitMethod:aB,goToSplitReview:aC,canConfirmSplitMethod:aD=!0,splitGuestCount:aE=2,addSplitGuest:aF,removeSplitGuest:aG,splitMethod:aH="equal",splitGuestProfiles:aI=[],equalSplitPeople:aJ=[],activeSplitPeople:aK=[],selectedSplitPersonId:aL,setSelectedSplitPersonId:aM,selectedSplitPerson:aN,splitSourceItems:aO=[],itemAssignments:aP={},setItemAssignments:aQ,sharePercents:aR=[],setSharePercents:aS,sharePercentTotal:aT=0,splitGrandTotal:aU=0,updatePaymentTipPercentage:aV,updatePaymentCustomTip:aW,onPaymentLinks:aX,onQrShare:aY,reviewRating:aZ=0,setReviewRating:a$,reviewComment:a_="",setReviewComment:a0,reviewSubmitStatus:a1="idle",setReviewSubmitStatus:a2,reviewSubmitMessage:a3,canSubmitReview:a4=!1,handleSubmitReview:a5,merchantSettings:a6,activeReviewSharePlatforms:a7=[],handleDownloadBusinessInvoice:a8,invoiceDownloadStatus:a9,invoiceDownloadMessage:ba,isDarkTheme:bb}=a,bc=(b=!!bb,e.default.useMemo(()=>b?"dark":"light",[b])),bd=(...a)=>{for(let b of a)if(Array.isArray(b)&&b.length>0)return b;return[]},be=Number(m?.remainingAmount??m?.orderTotal??m?.total??l??q??0),bf=Math.max(0,Number(B||m?.submittedBaseTotal||m?.baseTotal||m?.itemTotal||be||q||0)),bg=Math.max(0,Number(y||m?.paidTipAmount||0)),bh=Math.max(0,Number(z||m?.paidCouponDiscount||0)),bi=Math.max(0,Number(A||m?.paidTotal||m?.paid_total||v||Math.max(0,bf+bg-bh))),bj=Math.max(0,Number(t||m?.paidVatAmount||m?.vatAmount||0)),bk="success"===a1,bl=bd(n,m?.submittedItems,m?.items,m?.orderItems,k,i),bm=bd(aO,bl,k,i),bn=Array.isArray(aI)?aI:[],bo=Array.isArray(aJ)?aJ:[],bp=Array.isArray(aK)?aK:[],bq=aN?`${aN.name}'s share`:"Order total",br=(...a)=>{for(let b of a){let a=Number(b);if(Number.isFinite(a)&&a>0)return a}return 0},bs=br(aN?.total,r,v,be,l,q,m?.remainingAmount,m?.orderTotal,m?.total),bt=br(v,Math.max(0,bs+Number(w||0)-Number(x||0)),bs),bu=bs>0?Math.max(0,Number(u||19)):0,bv=Number(t||0)>0?Number(t||0):bu>0&&bs>0?bs*bu/(100+bu):0,bw=Number(s||0)>0?Number(s||0):bv>0?Math.max(0,bs-bv):bs,bx=m?.order_id||m?.orderId||m?.id||null,by=!!bx,[bz,bA]=e.default.useState(!1);e.default.useEffect(()=>{if("submitted"!==f)return void bA(!1);bA(!1);let a=window.setTimeout(()=>{bA(!0)},650);return()=>window.clearTimeout(a)},[f,o,bx]);let bB=async()=>{let a=String(G||"").trim().toUpperCase();if(console.info("PMD_KAZEN_COUPON_APPLY_CLICK",{code:a,paymentBaseAmount:r,pmdKazenPaymentGross:bs,pmdKazenPayableTotal:bt,hasValidateCoupon:"function"==typeof N,hasOnApplyCoupon:"function"==typeof O,selectedSplitPersonId:aL||null}),a){if(aN)return void L?.("Coupon validation for split payments is coming soon.");if("function"==typeof N){M?.(!0),L?.(null);try{let b=Number(r||bs||bt||be||q||0),c=await N(a,b);if(console.info("PMD_KAZEN_COUPON_RESULT",c),!c?.success)return void L?.(c?.message||"Invalid coupon code.");H?.("")}catch(a){console.error("PMD_KAZEN_COUPON_ERROR",a),L?.("Coupon validation failed.")}finally{M?.(!1)}return}if("function"==typeof O)return void await O();L?.("Coupon validation is unavailable.")}},bC="Checkout",bD=null;if("review"===f&&h)bC="My order",bD=(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(aq,{items:i}),(0,d.jsx)("div",{className:"kzco-total-box kzco-final-total",children:(0,d.jsx)(ap,{label:"Total",value:q,strong:!0})}),(0,d.jsxs)(an,{columns:2,children:[(0,d.jsx)(ak,{variant:"secondary",onClick:g,children:"Continue ordering"}),(0,d.jsx)(ak,{variant:"primary",onClick:al,children:"Confirm"})]})]});else if("review"===f&&j)bC="Table order",bD=(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(aq,{items:k}),(0,d.jsx)("div",{className:"kzco-total-box kzco-final-total",children:(0,d.jsx)(ap,{label:"Order total",value:l,strong:!0})}),(0,d.jsxs)(an,{columns:2,children:[(0,d.jsx)(ak,{variant:"secondary",onClick:g,children:"Continue ordering"}),(0,d.jsx)(ak,{variant:"primary",onClick:au,children:"Send to kitchen"})]})]});else if("submitted"===f)bC="We received your order.",c=void 0,bD=(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"kzco-status-copy kzco-status-copy-hero","aria-live":"polite",children:(0,d.jsx)("span",{className:"kzco-status-pulse","data-kzco-show-time":bz?"1":"0","aria-label":bz?`Estimated preparation time ${o} minutes`:"Order confirmed",children:bz?(0,d.jsxs)("em",{className:"kzco-status-time",children:[(0,d.jsx)(V,{className:"kzco-status-clock h-4 w-4","aria-hidden":"true"}),(0,d.jsx)("strong",{children:o}),(0,d.jsx)("span",{children:"min"})]},"prep-time"):(0,d.jsx)(T.Check,{className:"kzco-status-check h-5 w-5","aria-hidden":"true"},"check")})}),(0,d.jsxs)("section",{className:"kzco-summary",children:[(0,d.jsx)("h3",{className:"kzco-section-title",children:"Order Summary"}),(0,d.jsx)(aq,{items:bl})]}),(0,d.jsx)("div",{className:"kzco-total-box kzco-final-total",children:(0,d.jsx)(ap,{label:"Order total",value:be,strong:!0})}),(0,d.jsxs)(an,{children:[(0,d.jsx)(ak,{variant:"primary",onClick:()=>az?.("payment"),children:"Pay in full"}),(0,d.jsxs)(ak,{variant:"secondary",onClick:()=>aA?.("equal"),children:[(0,d.jsx)(ab,{className:"h-4 w-4"})," Split bill"]}),(0,d.jsx)(ak,{variant:"secondary",onClick:g,children:"Continue ordering"})]})]});else if("paid"===f){bC="Payment confirmed.",c=void 0;let a=Number(m?.orderId??m?.order_id??m?.id??0),b=Number(o||0)>0&&(m?.showCustomerEta??!0)!==!1;bD=(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"kzco-paid-time-wrap","aria-label":b?`Estimated preparation time ${o} minutes`:"Paid",children:b?(0,d.jsxs)("em",{className:"kzco-status-time kzco-paid-time",children:[(0,d.jsx)(V,{className:"kzco-status-clock h-4 w-4","aria-hidden":"true"}),(0,d.jsx)("strong",{children:o}),(0,d.jsx)("span",{children:"min"})]}):(0,d.jsxs)("em",{className:"kzco-status-time kzco-paid-time",children:[(0,d.jsx)(T.Check,{className:"kzco-status-clock h-4 w-4","aria-hidden":"true"}),(0,d.jsx)("strong",{children:"Paid"})]})}),(0,d.jsxs)("section",{className:"kzco-summary kzco-paid-summary",children:[(0,d.jsx)("h3",{className:"kzco-section-title",children:"Order Summary"}),(0,d.jsx)(aq,{items:bl})]}),(0,d.jsxs)("div",{className:"kzco-total-box kzco-paid-total-box kzco-final-total",children:[a>0?(0,d.jsxs)("div",{className:"kzco-line",children:[(0,d.jsx)("span",{children:"Order number"}),(0,d.jsxs)("strong",{children:["#",a]})]}):null,(0,d.jsx)(ap,{label:"Items subtotal (incl. VAT)",value:bf}),bj>0?(0,d.jsx)(ap,{label:"Included VAT",value:bj}):null,bg>0?(0,d.jsx)(ap,{label:"Tip",value:bg}):null,bh>0?(0,d.jsxs)("div",{className:"kzco-line kzco-discount",children:[(0,d.jsx)("span",{children:"Coupon"}),(0,d.jsxs)("strong",{children:["-",ag(bh)]})]}):null,(0,d.jsx)(ap,{label:"Amount paid",value:bi,strong:!0})]}),(0,d.jsxs)("section",{className:"kzco-card kzco-review-card","aria-label":"Visit feedback",children:[(0,d.jsxs)("div",{className:"kzco-review-head",children:[(0,d.jsx)("span",{children:(0,d.jsx)($.MessageSquare,{className:"h-4 w-4"})}),(0,d.jsxs)("div",{children:[(0,d.jsx)("h3",{children:"How was your visit?"}),(0,d.jsx)("p",{children:"A quick note helps the restaurant improve."})]})]}),(0,d.jsx)("div",{className:"kzco-stars","aria-label":"Restaurant rating",children:[1,2,3,4,5].map(a=>{let b=Number(aZ||0)>=a;return(0,d.jsx)("button",{type:"button","aria-label":`${a} star${a>1?"s":""}`,"data-kzco-active":b?"1":"0",disabled:bk,onClick:()=>{bk||(a$?.(a),"loading"!==a1&&a2?.("idle"))},children:(0,d.jsx)(aa,{className:"h-5 w-5"})},a)})}),(0,d.jsx)("textarea",{value:String(a_||""),disabled:bk,readOnly:bk,onChange:a=>{bk||(a0?.(a.target.value),"loading"!==a1&&a2?.("idle"))},placeholder:"Optional comment for the restaurant",className:"kzco-field kzco-review-textarea"}),(0,d.jsx)(ak,{variant:"primary",disabled:!a4||"loading"===a1||"success"===a1,onClick:a5,className:"kzco-review-submit",children:"loading"===a1?"Submitting":"success"===a1?"Review submitted":"Submit feedback"}),a3?(0,d.jsx)("p",{className:"error"===a1?"kzco-review-message kzco-review-error":"kzco-review-message",children:a3}):null,"success"===a1&&a6?.reviewSocial?.sharePromptEnabled&&Array.isArray(a7)&&a7.length>0?(0,d.jsxs)("div",{className:"kzco-review-share",children:[(0,d.jsx)("p",{children:"Share publicly?"}),(0,d.jsx)("div",{children:a7.map(({id:a,label:b,icon:c})=>{let e=String(a||"").toLowerCase(),f="instagram"===e?Y:"website"===e?X:"reviews"===e?$.MessageSquare:"trustpilot"===e||"google"===e?aa:c||Z;return(0,d.jsxs)("a",{href:a6.reviewSocial.platforms[a].url,target:"_blank",rel:"noopener noreferrer","aria-label":b,title:b,children:[(0,d.jsx)(f,{className:"h-4 w-4"}),(0,d.jsx)("span",{children:b})]},a)})})]}):null]}),(0,d.jsxs)("div",{className:"kzco-powered-by","aria-label":"Powered by PayMyDine",children:[(0,d.jsx)("span",{children:"Powered by"}),(0,d.jsx)("img",{src:"/assets/media/uploads/Paymydinelogo.png",alt:"PayMyDine",loading:"lazy"})]}),(0,d.jsx)(an,{children:(0,d.jsx)(ak,{variant:"secondary",onClick:g,children:"Back to menu"})})]})}else"payment"===f?(bC="Payment",c="Ready to pay",bD=(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(ao,{className:"kzco-payment-hero",children:(0,d.jsxs)("div",{className:"kzco-payment-intro",children:[(0,d.jsx)("span",{children:(0,d.jsx)(W.CreditCard,{className:"h-5 w-5"})}),(0,d.jsxs)("div",{children:[(0,d.jsx)("strong",{children:bq}),(0,d.jsx)("p",{children:ag(v)})]})]})}),(0,d.jsxs)(ao,{children:[(0,d.jsx)(ap,{label:aN?"Share amount":"Items total",value:bw}),bv>0&&(0,d.jsx)(ap,{label:bu>0?`VAT included (${bu.toFixed(0)}%)`:"VAT included",value:bv}),w>0&&(0,d.jsx)(ap,{label:"Tip",value:w}),x>0&&(0,d.jsxs)("div",{className:"kzco-line kzco-discount",children:[(0,d.jsx)("span",{children:"Coupon"}),(0,d.jsxs)("strong",{children:["-",ag(x)]})]}),(0,d.jsx)(ap,{label:"Payable total",value:bt,strong:!0})]}),F&&(0,d.jsxs)("section",{className:"kzco-section",children:[(0,d.jsx)("h3",{className:"kzco-section-title",children:"Add tip"}),(0,d.jsxs)("div",{className:"kzco-tip-grid",children:[Array.from(new Set([0,5,10,...Array.isArray(E)?E:[]].map(a=>Number(a||0)))).filter(a=>Number.isFinite(a)&&a>=0).sort((a,b)=>a-b).map(a=>{let b=Number(ay(bs,a)),c=Number(D||0),e=Number.isFinite(c)&&Math.abs(c)>.005?.005>Math.abs(c-b):Number(C||0)===a;return(0,d.jsxs)(ak,{variant:"secondary","data-kzco-active":e?"1":"0",onClick:()=>{let b=ay(bs,a);console.info("PMD_KAZEN_TIP_PRESET_CLICK",{percentage:a,baseAmount:bs,tipAmount:b}),aV?.(a),aW?.(b)},className:"kzco-tip-preset",children:[a,"%"]},a)}),(0,d.jsxs)("div",{className:"kzco-tip-custom-wrap",children:[(0,d.jsx)("span",{"aria-hidden":"true",children:"€"}),(0,d.jsx)("input",{type:"text",inputMode:"decimal",value:D??"","data-pmd-kazen-tip-custom-input-v36":"1",onChange:a=>{let b,c;aV?.(void 0),aW?.(-1===(c=(b=String(a.target.value||"").replace(",",".").replace(/[^0-9.]/g,"")).indexOf("."))?b:b.slice(0,c+1)+b.slice(c+1).replace(/\./g,""))},placeholder:"Custom",className:"kzco-field","aria-label":"Custom tip amount in euro"})]})]})]}),(0,d.jsxs)("section",{className:"kzco-section",children:[!I||aN?(0,d.jsxs)("div",{className:"kzco-coupon-row",children:[(0,d.jsx)("input",{type:"text",value:G||"",onChange:a=>H?.(a.target.value.toUpperCase()),placeholder:"Coupon code",disabled:K,className:"kzco-field"}),(0,d.jsx)(ak,{variant:"secondary",disabled:K||!String(G||"").trim(),onClick:a=>{a.preventDefault(),a.stopPropagation(),bB()},className:"kzco-apply",children:K?"Checking":"Apply"})]}):(0,d.jsxs)("div",{className:"kzco-applied-coupon",children:[(0,d.jsxs)("span",{children:[I.name||"Coupon"," ",I.code?`(${I.code})`:""]}),(0,d.jsx)(ak,{variant:"secondary",onClick:a=>{a.preventDefault(),a.stopPropagation(),console.info("PMD_KAZEN_COUPON_REMOVE_CLICK",{hasRemoveCoupon:"function"==typeof Q,hasOnRemoveCoupon:"function"==typeof P,appliedCouponCode:I?.code||null});try{"function"==typeof Q?Q():"function"==typeof P&&P()}finally{H?.(""),L?.(null),M?.(!1)}},children:"Remove"})]}),J&&(0,d.jsx)("p",{className:"kzco-error",children:J})]}),(0,d.jsx)(av,{loadingPayments:U,visiblePaymentMethods:R,selectedPaymentMethod:ac,onPaymentMethodSelect:ad,canShowPaymentMethods:by,onBackToReview:()=>az?.("review")}),af(ac)&&(0,d.jsx)("section",{className:"kzco-section kzco-payment-detail",children:ae?.()}),(0,d.jsx)("div",{className:"kzco-payment-action",children:ah?.()})]})):"split"===f||"split-items"===f||"split-shares"===f?(bC="",c=`Share ${ag(aU)}`,bD=(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(ar,{splitMethod:aH,chooseSplitMethod:aB}),(0,d.jsxs)("div",{className:"kzco-people-inline","data-kzco-people-inline":"1",children:[(0,d.jsx)(as,{splitGuestCount:aE,addSplitGuest:aF,removeSplitGuest:aG}),(0,d.jsx)(at,{guests:bn})]}),"equal"===aH&&(0,d.jsx)("div",{className:"kzco-list",children:bo.map((a,b)=>(0,d.jsxs)("div",{className:"kzco-cart-line",children:[(0,d.jsx)("span",{children:a.name}),(0,d.jsx)("strong",{children:ag(a.total)})]},a.id||b))}),"items"===aH&&(0,d.jsxs)(ao,{children:[(0,d.jsx)("p",{className:"kzco-muted",children:"Tap an item to assign it to guests."}),(0,d.jsx)("div",{className:"kzco-list",children:(bm||[]).map((a,b)=>{let c=String(a?.key??a?.id??`${ai(a)}-${b}`),e=aP?.[c],f=null==e?"Unassigned":bn[e]?.name||`Guest ${Number(e)+1}`;return(0,d.jsxs)("button",{type:"button",className:"kzco-btn kzco-btn-list kzco-btn-secondary kzco-assign-row",onClick:()=>aQ?.(a=>{let b=a?.[c],d=null==b?0:b>=aE-1?null:Number(b)+1;return{...a||{},[c]:d}}),children:[(0,d.jsx)("span",{children:ai(a)}),(0,d.jsx)("strong",{children:ag(aj(a))}),(0,d.jsx)("em",{children:f})]},c)})})]}),"shares"===aH&&(0,d.jsxs)(ao,{children:[(0,d.jsx)("div",{className:100===aT?"kzco-share-total":"kzco-share-total kzco-share-total-bad",children:100===aT?"100% ready":aT<100?`${100-aT}% remaining`:`Over by ${aT-100}%`}),(0,d.jsx)("div",{className:"kzco-list",children:(aR||[]).slice(0,aE).map((a,b)=>(0,d.jsxs)("div",{className:"kzco-share-row",children:[(0,d.jsx)("span",{children:bn[b]?.name||`Guest ${b+1}`}),(0,d.jsx)("input",{type:"number",min:0,max:100,step:1,value:Math.round(Number(a||0)),onChange:a=>{let c=Math.max(0,Math.min(100,Number(a.target.value||0)));aS?.(a=>(a||[]).map((a,d)=>d===b?c:a))},className:"kzco-field kzco-share-input"}),(0,d.jsx)("strong",{children:"%"})]},b))})]}),(0,d.jsx)(ak,{variant:"primary",disabled:!aD,onClick:aC,children:"Review split"})]})):"split-review"===f&&(bC="Review split",c="Choose payer",bD=(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"kzco-list",children:bp.map(a=>{let b=aL===a.id;return(0,d.jsxs)(ao,{className:b?"kzco-person-selected":"",children:[(0,d.jsxs)("div",{className:"kzco-person-head",children:[(0,d.jsxs)("span",{children:[(0,d.jsx)("b",{children:a.avatar||a.name?.slice(0,1)}),a.name]}),(0,d.jsx)("em",{children:a.status||"Pending"})]}),(0,d.jsx)(ap,{label:"Total",value:Number(a.total||0),strong:!0}),b?(0,d.jsx)(ak,{variant:"primary",onClick:()=>az?.("payment"),children:"Pay my share"}):(0,d.jsx)(ak,{variant:"secondary",onClick:()=>aM?.(a.id),children:"Select payer"})]},a.id)})}),(0,d.jsxs)(an,{columns:2,children:[(0,d.jsxs)(ak,{variant:"secondary",onClick:aX,children:[(0,d.jsx)(Z,{className:"h-4 w-4"})," Link"]}),(0,d.jsxs)(ak,{variant:"secondary",onClick:aY,children:[(0,d.jsx)(_,{className:"h-4 w-4"})," QR"]})]})]}));return(0,d.jsxs)("div",{"data-kzco-root":"1",onFocusCapture:aw,onInputCapture:ax,"data-kzco-step":f,"data-kzco-can-pay":by?"1":"0","data-kzco-mode":bc,"data-pmd-checkout-theme":"kazen_japanese",role:"dialog","aria-modal":"true",className:"jsx-20474dde3d810de2 kzco-overlay",children:[(0,d.jsx)("div",{"data-kzco-panel":"1",className:"jsx-20474dde3d810de2 kzco-panel",children:(0,d.jsxs)("div",{className:"jsx-20474dde3d810de2 kzco-content",children:[(0,d.jsx)(am,{title:bC,eyebrow:c,onBack:()=>{"payment"===f?az?.(aN?"split-review":"submitted"):"split-review"===f||"split-items"===f||"split-shares"===f?az?.("split"):"split"===f?az?.("submitted"):g?.()}}),(0,d.jsx)("main",{"data-kzco-step":f,className:"jsx-20474dde3d810de2 kzco-body",children:bD},f)]})}),(0,d.jsx)("style",{children:`
        /* PMD_KAZEN_V30_CLEAN_CHECKOUT_REWRITE_20260618
           Isolated checkout UI. No old pmd-kazen checkout classes are used here.
           Button contract:
           - primary = red action buttons
           - secondary = cancel/continue/split/link/QR/tabs/tile/list buttons
           - square = close/stepper buttons
        */

        html body .kzco-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999999 !important;
          display: grid !important;
          place-items: center !important;
          padding: 1rem !important;
          background: rgba(36, 32, 28, .42) !important;
          color: #242320 !important;
          box-sizing: border-box !important;
          isolation: isolate !important;
        }

        html body .kzco-overlay,
        html body .kzco-overlay * {
          box-sizing: border-box !important;
          text-shadow: none !important;
        }

        html body .kzco-overlay {
          --kzco-panel-bg: #fbf8f2;
          --kzco-panel-text: #242320;
          --kzco-panel-muted: #77716a;
          --kzco-panel-border: rgba(35, 34, 31, .24);
          --kzco-panel-line: rgba(35, 34, 31, .12);
          --kzco-card-bg: rgba(255, 255, 255, .38);
          --kzco-card-border: rgba(36, 35, 32, .14);
          --kzco-accent: #b85d59;
          --kzco-accent-hover: #c86460;
          --kzco-accent-text: #fffaf3;
          --kzco-accent-border: rgba(143, 55, 51, .56);
          --kzco-accent-border-hover: rgba(143, 55, 51, .72);
          --kzco-secondary-bg: rgba(255, 255, 255, .44);
          --kzco-secondary-bg-hover: rgba(255, 255, 255, .64);
          --kzco-secondary-text: #242320;
          --kzco-secondary-border: rgba(36, 35, 32, .22);
          --kzco-secondary-border-hover: rgba(36, 35, 32, .36);
          --kzco-price: #b85d59;
          --kzco-action-height: 48px;
          --kzco-square: 48px;
        }

        html body .kzco-overlay[data-kzco-mode="dark"] {
          background: rgba(0, 0, 0, .72) !important;
          --kzco-panel-bg: linear-gradient(144deg, rgba(18, 12, 8, .96), rgba(5, 3, 2, .985) 58%, rgba(55, 19, 14, .86));
          --kzco-panel-text: #f6e8c8;
          --kzco-panel-muted: rgba(246, 232, 200, .70);
          --kzco-panel-border: rgba(198, 164, 93, .42);
          --kzco-panel-line: rgba(198, 164, 93, .22);
          --kzco-card-bg: rgba(8, 6, 4, .62);
          --kzco-card-border: rgba(198, 164, 93, .28);
          --kzco-secondary-bg: rgba(8, 6, 4, .88);
          --kzco-secondary-bg-hover: rgba(246, 232, 200, .08);
          --kzco-secondary-text: #f6e8c8;
          --kzco-secondary-border: rgba(198, 164, 93, .36);
          --kzco-secondary-border-hover: rgba(198, 164, 93, .54);
          --kzco-price: #ec8a82;
          --kzco-accent-border: rgba(223, 104, 93, .72);
          --kzco-accent-border-hover: rgba(223, 104, 93, .88);
        }

        html body .kzco-panel {
          width: min(100%, 430px) !important;
          max-height: min(88dvh, 740px) !important;
          overflow: auto !important;
          border-radius: 0 !important;
          border: 1px solid var(--kzco-panel-border) !important;
          background: var(--kzco-panel-bg) !important;
          color: var(--kzco-panel-text) !important;
          box-shadow: 0 28px 78px rgba(36, 30, 24, .34) !important;
        }

        html body .kzco-content {
          position: relative !important;
          display: flex !important;
          min-height: 100% !important;
          flex-direction: column !important;
          background: transparent !important;
        }

        html body .kzco-head {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 1rem !important;
          padding: 1.35rem 1.45rem 1.05rem !important;
          border-bottom: 1px solid var(--kzco-panel-line) !important;
        }

        html body .kzco-title-wrap {
          min-width: 0 !important;
        }

        html body .kzco-eyebrow {
          display: block !important;
          margin-bottom: .12rem !important;
          color: var(--kzco-panel-text) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .86rem !important;
          font-weight: 520 !important;
          letter-spacing: .01em !important;
          text-transform: none !important;
        }

        html body .kzco-head h2 {
          margin: 0 !important;
          color: var(--kzco-panel-text) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: clamp(2.6rem, 9vw, 4.2rem) !important;
          font-weight: 900 !important;
          line-height: .88 !important;
          letter-spacing: .075em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-body {
          display: grid !important;
          gap: 1rem !important;
          padding: 1.25rem 1.45rem 1.45rem !important;
        }

        html body .kzco-btn {
          border-radius: 0 !important;
          box-shadow: none !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          background-image: none !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          opacity: 1 !important;
          filter: none !important;
          transform: none !important;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease !important;
          cursor: pointer !important;
        }

        html body .kzco-btn-action {
          width: 100% !important;
          min-height: var(--kzco-action-height) !important;
          height: var(--kzco-action-height) !important;
          padding: .82rem 1rem !important;
        }

        html body .kzco-btn-square {
          width: var(--kzco-square) !important;
          height: var(--kzco-square) !important;
          min-width: var(--kzco-square) !important;
          min-height: var(--kzco-square) !important;
          max-width: var(--kzco-square) !important;
          max-height: var(--kzco-square) !important;
          padding: 0 !important;
        }

        html body .kzco-btn-primary {
          background: var(--kzco-accent) !important;
          background-color: var(--kzco-accent) !important;
          color: var(--kzco-accent-text) !important;
          -webkit-text-fill-color: var(--kzco-accent-text) !important;
          border: 1px solid var(--kzco-accent-border) !important;
        }

        html body .kzco-btn-primary:not(:disabled):not([aria-disabled="true"]):hover {
          background: var(--kzco-accent-hover) !important;
          background-color: var(--kzco-accent-hover) !important;
          border-color: var(--kzco-accent-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .kzco-btn-secondary {
          background: var(--kzco-secondary-bg) !important;
          background-color: var(--kzco-secondary-bg) !important;
          color: var(--kzco-secondary-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-text) !important;
          border: 1px solid var(--kzco-secondary-border) !important;
        }

        html body .kzco-btn-secondary:not(:disabled):not([aria-disabled="true"]):hover,
        html body .kzco-btn-secondary[data-kzco-active="1"] {
          background: var(--kzco-secondary-bg-hover) !important;
          background-color: var(--kzco-secondary-bg-hover) !important;
          color: var(--kzco-secondary-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-text) !important;
          border-color: var(--kzco-secondary-border-hover) !important;
        }

        html body .kzco-btn-secondary:not(:disabled):not([aria-disabled="true"]):hover {
          transform: translateY(-1px) !important;
        }

        html body .kzco-btn:disabled,
        html body .kzco-btn[aria-disabled="true"] {
          cursor: not-allowed !important;
          opacity: .56 !important;
          transform: none !important;
        }

        html body .kzco-btn :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
        }

        html body .kzco-actions {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: .72rem !important;
          width: 100% !important;
        }

        html body .kzco-actions-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        html body .kzco-actions-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        html body .kzco-line,
        html body .kzco-cart-line {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 1rem !important;
          color: var(--kzco-panel-text) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
        }

        html body .kzco-line strong,
        html body .kzco-cart-line strong {
          color: var(--kzco-price) !important;
          -webkit-text-fill-color: var(--kzco-price) !important;
          font-weight: 900 !important;
        }

        html body .kzco-line-strong {
          padding-top: .8rem !important;
          border-top: 1px solid var(--kzco-panel-line) !important;
          font-size: 1.08rem !important;
        }

        html body .kzco-list,
        html body .kzco-items-list,
        html body .kzco-summary {
          display: grid !important;
          gap: .78rem !important;
        }

        html body .kzco-total-box,
        html body .kzco-card,
        html body .kzco-section {
          display: grid !important;
          gap: .78rem !important;
        }

        html body .kzco-card,
        html body .kzco-total-box {
          padding: 1rem !important;
          border: 1px solid var(--kzco-card-border) !important;
          background: var(--kzco-card-bg) !important;
        }

        html body .kzco-section-title {
          margin: 0 !important;
          color: var(--kzco-panel-text) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 1.28rem !important;
          font-weight: 900 !important;
          letter-spacing: .02em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-muted,
        html body .kzco-error {
          margin: 0 !important;
          color: var(--kzco-panel-muted) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .95rem !important;
          font-weight: 620 !important;
        }

        html body .kzco-error {
          color: var(--kzco-accent) !important;
        }

        html body .kzco-status-copy,
        html body .kzco-payment-intro,
        html body .kzco-person-head {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 1rem !important;
        }

        html body .kzco-status-copy {
          justify-content: flex-start !important;
        }

        html body .kzco-status-copy > span,
        html body .kzco-payment-intro > span {
          display: inline-flex !important;
          width: 48px !important;
          height: 48px !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid var(--kzco-accent-border) !important;
          color: var(--kzco-accent) !important;
        }

        html body .kzco-status-copy p,
        html body .kzco-payment-intro p {
          margin: 0 !important;
          color: var(--kzco-price) !important;
          font-weight: 900 !important;
        }

        html body .kzco-payment-intro strong {
          color: var(--kzco-panel-text) !important;
          font-weight: 900 !important;
        }

        html body .kzco-tabs,
        html body .kzco-tip-grid,
        html body .kzco-method-grid {
          display: grid !important;
          gap: .65rem !important;
        }

        html body .kzco-tabs {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        html body .kzco-btn-segment {
          min-height: 58px !important;
          height: 58px !important;
          white-space: normal !important;
        }

        html body .kzco-stepper {
          display: grid !important;
          grid-template-columns: 48px 1fr 48px !important;
          align-items: stretch !important;
          min-height: 48px !important;
          border: 1px solid var(--kzco-secondary-border) !important;
          background: var(--kzco-card-bg) !important;
        }

        html body .kzco-stepper > strong {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: var(--kzco-panel-text) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .96rem !important;
          font-weight: 850 !important;
        }

        html body .kzco-chip-row {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: .55rem !important;
        }

        html body .kzco-chip {
          display: inline-flex !important;
          align-items: center !important;
          gap: .45rem !important;
          min-height: 40px !important;
          padding: .55rem .7rem !important;
          border: 1px solid var(--kzco-secondary-border) !important;
          background: var(--kzco-secondary-bg) !important;
          color: var(--kzco-secondary-text) !important;
          font-weight: 760 !important;
        }

        html body .kzco-chip b,
        html body .kzco-person-head b {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 24px !important;
          height: 24px !important;
          margin-right: .45rem !important;
          background: var(--kzco-secondary-bg-hover) !important;
          color: var(--kzco-secondary-text) !important;
        }

        html body .kzco-assign-row {
          width: 100% !important;
          min-height: 48px !important;
          padding: .85rem 1rem !important;
          display: grid !important;
          grid-template-columns: 1fr auto auto !important;
          gap: .8rem !important;
          align-items: center !important;
          text-align: left !important;
        }

        html body .kzco-assign-row span,
        html body .kzco-assign-row strong,
        html body .kzco-assign-row em {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          font-style: normal !important;
          white-space: nowrap !important;
        }

        html body .kzco-share-total {
          color: var(--kzco-panel-text) !important;
          font-weight: 900 !important;
        }

        html body .kzco-share-total-bad {
          color: var(--kzco-accent) !important;
        }

        html body .kzco-share-row,
        html body .kzco-coupon-row,
        html body .kzco-applied-coupon {
          display: grid !important;
          grid-template-columns: 1fr auto auto !important;
          align-items: center !important;
          gap: .7rem !important;
        }

        html body .kzco-coupon-row {
          grid-template-columns: 1fr auto !important;
        }

        html body .kzco-field {
          min-height: 48px !important;
          width: 100% !important;
          border-radius: 0 !important;
          border: 1px solid var(--kzco-secondary-border) !important;
          background: var(--kzco-card-bg) !important;
          color: var(--kzco-panel-text) !important;
          -webkit-text-fill-color: var(--kzco-panel-text) !important;
          padding: .82rem .95rem !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .92rem !important;
          font-weight: 750 !important;
          outline: none !important;
        }

        html body .kzco-method-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        html body .kzco-method-tile {
          width: 100% !important;
          min-height: 60px !important;
          height: 60px !important;
          padding: .6rem !important;
        }

        html body .kzco-method-tile[data-kzco-active="1"] {
          border-color: var(--kzco-accent-border) !important;
          outline: 1px solid var(--kzco-accent-border) !important;
          outline-offset: -2px !important;
        }

        html body .kzco-method-tile img {
          display: block !important;
          max-width: 100% !important;
          height: auto !important;
          object-fit: contain !important;
        }

        html body .kzco-person-selected {
          border-color: var(--kzco-accent-border) !important;
        }

        html body .kzco-person-head span,
        html body .kzco-person-head em {
          color: var(--kzco-panel-text) !important;
          font-style: normal !important;
          font-weight: 760 !important;
        }

        html body .kzco-person-head em {
          color: var(--kzco-price) !important;
        }

        /* External payment/cash/stripe buttons rendered by existing payment system become Type 1 red. */
        html body .kzco-payment-action :is(button, [role="button"], input[type="submit"]),
        html body .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]) {
          width: 100% !important;
          min-height: var(--kzco-action-height) !important;
          height: var(--kzco-action-height) !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: var(--kzco-accent) !important;
          background-color: var(--kzco-accent) !important;
          color: var(--kzco-accent-text) !important;
          -webkit-text-fill-color: var(--kzco-accent-text) !important;
          border: 1px solid var(--kzco-accent-border) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          padding: .82rem 1rem !important;
          opacity: 1 !important;
          filter: none !important;
          transform: none !important;
        }

        html body .kzco-payment-action :is(button, [role="button"], input[type="submit"]):not(:disabled):hover,
        html body .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]):not(:disabled):hover {
          background: var(--kzco-accent-hover) !important;
          background-color: var(--kzco-accent-hover) !important;
          border-color: var(--kzco-accent-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .kzco-payment-action :is(button, [role="button"], input[type="submit"]):disabled,
        html body .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]):disabled {
          opacity: .56 !important;
          cursor: not-allowed !important;
        }

        html body .kzco-payment-action :is(button, [role="button"], input[type="submit"]) :is(svg, svg *, span),
        html body .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]) :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay {
            padding: .75rem !important;
          }

          html body .kzco-panel {
            width: min(100%, 430px) !important;
            max-height: 90dvh !important;
          }

          html body .kzco-head {
            padding: 1.05rem 1rem .9rem !important;
          }

          html body .kzco-body {
            padding: 1rem !important;
          }

          html body .kzco-head h2 {
            font-size: clamp(2.35rem, 12vw, 3.6rem) !important;
          }

          html body .kzco-actions-2,
          html body .kzco-actions-3 {
            grid-template-columns: 1fr !important;
          }

          html body .kzco-tabs {
            grid-template-columns: 1fr !important;
          }

          html body .kzco-method-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          html body .kzco-assign-row {
            grid-template-columns: 1fr !important;
            text-align: center !important;
          }
        }


        /* PMD_KAZEN_V33_ACTIVE_V30_BUTTON_CONTRACT_20260618
           FINAL ACTIVE FIX:
           This is inserted inside the real V30 style tag.
           V31/V32 were present in source but not rendered in browser.
           Do not rely on kzco-accent for primary background; force concrete values.
        */

        html body .kzco-overlay[data-kzco-root="1"] {
          --kzco-action-height: 48px !important;
          --kzco-square: 48px !important;

          --kzco-primary-real-bg: #b85d59 !important;
          --kzco-primary-real-bg-hover: #c86460 !important;
          --kzco-primary-real-text: #fffaf3 !important;
          --kzco-primary-real-border: rgba(143, 55, 51, .58) !important;

          --kzco-secondary-real-bg: rgba(255, 255, 255, .44) !important;
          --kzco-secondary-real-bg-hover: rgba(255, 255, 255, .64) !important;
          --kzco-secondary-real-text: #242320 !important;
          --kzco-secondary-real-border: rgba(36, 35, 32, .24) !important;

          --kzco-close-real-bg: rgba(255, 255, 255, .44) !important;
          --kzco-close-real-text: #242320 !important;
          --kzco-close-real-border: rgba(36, 35, 32, .24) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] {
          --kzco-secondary-real-bg: rgba(8, 6, 4, .88) !important;
          --kzco-secondary-real-bg-hover: rgba(246, 232, 200, .08) !important;
          --kzco-secondary-real-text: #f6e8c8 !important;
          --kzco-secondary-real-border: rgba(198, 164, 93, .38) !important;

          --kzco-close-real-bg: rgba(246, 232, 200, .055) !important;
          --kzco-close-real-text: #f6e8c8 !important;
          --kzco-close-real-border: rgba(198, 164, 93, .32) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn,
          button[data-kzco-button],
          .pmd-themed-button,
          [data-pmd-stripe-native-button="1"]
        ) {
          min-height: var(--kzco-action-height) !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          padding: .82rem 1rem !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          filter: none !important;
          transform: none !important;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease !important;
        }

        /* TYPE 1: red actions */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn-primary,
          button[data-kzco-button="primary"],
          .pmd-themed-button[data-pmd-themed-button="primary"],
          [data-pmd-stripe-native-button="1"]
        ),
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action :is(button, [role="button"], input[type="submit"]),
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"]) {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .58) !important;
          opacity: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn-primary,
          button[data-kzco-button="primary"],
          .pmd-themed-button[data-pmd-themed-button="primary"],
          [data-pmd-stripe-native-button="1"]
        ):not(:disabled):not([aria-disabled="true"]):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action :is(button, [role="button"], input[type="submit"]):not(:disabled):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"]):not(:disabled):hover {
          background: #c86460 !important;
          background-color: #c86460 !important;
          background-image: linear-gradient(#c86460, #c86460) !important;
          border-color: rgba(143, 55, 51, .72) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          transform: translateY(-1px) !important;
        }

        /* TYPE 2: secondary actions + split tabs */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn-secondary,
          button[data-kzco-button="secondary"],
          .kzco-tab,
          .kzco-method-tile
        ) {
          background: var(--kzco-secondary-real-bg) !important;
          background-color: var(--kzco-secondary-real-bg) !important;
          background-image: linear-gradient(var(--kzco-secondary-real-bg), var(--kzco-secondary-real-bg)) !important;
          color: var(--kzco-secondary-real-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-real-text) !important;
          border: 1px solid var(--kzco-secondary-real-border) !important;
          opacity: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn-secondary,
          button[data-kzco-button="secondary"],
          .kzco-tab,
          .kzco-method-tile
        ):not(:disabled):not([aria-disabled="true"]):hover,
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-tab, .kzco-method-tile)[data-kzco-active="1"] {
          background: var(--kzco-secondary-real-bg-hover) !important;
          background-color: var(--kzco-secondary-real-bg-hover) !important;
          background-image: linear-gradient(var(--kzco-secondary-real-bg-hover), var(--kzco-secondary-real-bg-hover)) !important;
          border-color: var(--kzco-secondary-real-border) !important;
          color: var(--kzco-secondary-real-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-real-text) !important;
          transform: translateY(-1px) !important;
        }

        /* Square controls: close / plus / minus */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-square, .kzco-close, .kzco-stepper-btn) {
          width: var(--kzco-square) !important;
          height: var(--kzco-square) !important;
          min-width: var(--kzco-square) !important;
          min-height: var(--kzco-square) !important;
          max-width: var(--kzco-square) !important;
          max-height: var(--kzco-square) !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-close, .kzco-btn-square:not(.kzco-btn-primary)) {
          background: var(--kzco-close-real-bg) !important;
          background-color: var(--kzco-close-real-bg) !important;
          background-image: linear-gradient(var(--kzco-close-real-bg), var(--kzco-close-real-bg)) !important;
          color: var(--kzco-close-real-text) !important;
          -webkit-text-fill-color: var(--kzco-close-real-text) !important;
          border: 1px solid var(--kzco-close-real-border) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper-btn.kzco-btn-primary {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .58) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn, button[data-kzco-button], .kzco-close, .kzco-stepper-btn) :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        /* Disabled stays readable, never invisible white */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-primary, button[data-kzco-button="primary"], .pmd-themed-button[data-pmd-themed-button="primary"], [data-pmd-stripe-native-button="1"]):disabled,
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-primary, button[data-kzco-button="primary"], .pmd-themed-button[data-pmd-themed-button="primary"], [data-pmd-stripe-native-button="1"])[aria-disabled="true"] {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .58) !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-secondary, button[data-kzco-button="secondary"], .kzco-tab, .kzco-method-tile):disabled,
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-secondary, button[data-kzco-button="secondary"], .kzco-tab, .kzco-method-tile)[aria-disabled="true"] {
          opacity: .58 !important;
          cursor: not-allowed !important;
        }



        /* PMD_KAZEN_V35_TITLE_SIZE_POLISH_20260618
           Slightly reduce giant Kazen checkout titles so PAYMENT / ORDER STATUS
           no longer crowd the close button.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          gap: 1.15rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          min-width: 0 !important;
          max-width: calc(100% - 5.9rem) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2 {
          font-size: clamp(3.75rem, 11.8vw, 6.35rem) !important;
          line-height: .86 !important;
          letter-spacing: .115em !important;
          max-width: 100% !important;
          overflow-wrap: normal !important;
          word-break: normal !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2 {
            font-size: clamp(3.05rem, 17vw, 4.9rem) !important;
            letter-spacing: .095em !important;
          }
        }



        /* PMD_KAZEN_V36_MUCH_SMALLER_TITLES_20260618
           Strong override: previous title clamp was still too large.
           Keep the Kazen feeling, but stop the title from dominating the card.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          gap: 1rem !important;
          align-items: start !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          padding-right: .25rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
          font-size: clamp(2.45rem, 7.2vw, 4.35rem) !important;
          line-height: .92 !important;
          letter-spacing: .075em !important;
          max-width: 100% !important;
          margin: 0 !important;
          overflow: visible !important;
          overflow-wrap: normal !important;
          word-break: normal !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: clamp(2.05rem, 10.5vw, 3.15rem) !important;
            line-height: .96 !important;
            letter-spacing: .055em !important;
          }
        }

        @media (max-width: 390px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: clamp(1.85rem, 9.5vw, 2.75rem) !important;
            letter-spacing: .045em !important;
          }
        }



        /* PMD_KAZEN_V37_STANDARD_SMALL_TITLES_20260618
           FINAL: normal readable app title size, not huge poster title.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          gap: .9rem !important;
          align-items: start !important;
          padding-top: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          padding-right: .5rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
          font-size: 2.15rem !important;
          line-height: 1.08 !important;
          letter-spacing: .075em !important;
          max-width: 100% !important;
          margin: 0 !important;
          overflow: visible !important;
          overflow-wrap: normal !important;
          word-break: normal !important;
          white-space: normal !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-eyebrow {
          font-size: .92rem !important;
          line-height: 1.2 !important;
          margin-bottom: .35rem !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: 1.9rem !important;
            line-height: 1.08 !important;
            letter-spacing: .06em !important;
          }
        }

        @media (max-width: 390px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: 1.7rem !important;
            letter-spacing: .045em !important;
          }
        }



        /* PMD_KAZEN_V39_HEADER_DOWN_REMOVE_SUMMARY_FRAMES_20260618
           Move checkout title area a bit lower and remove unnecessary frames
           around display-only summary/total boxes. Keep frames on real inputs,
           buttons, coupon field, and payment method tiles.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          padding-top: 2.05rem !important;
          padding-bottom: 1.2rem !important;
          padding-left: 1.45rem !important;
          padding-right: 1.45rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-eyebrow {
          margin-bottom: .42rem !important;
        }

        /* Remove decorative frames from display-only total/summary blocks */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-hero,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:not(.kzco-person-selected):not(:has(.kzco-field)):not(:has(.kzco-btn)):not(:has(.kzco-method-grid)):not(:has(.kzco-share-row)) {
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: .15rem 0 !important;
        }

        /* Payment summary card has only lines, so keep it clean too */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:has(.kzco-line):not(:has(.kzco-field)):not(:has(.kzco-btn)):not(:has(.kzco-method-grid)) {
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: .1rem 0 !important;
        }

        /* Remove random inner divider lines from totals */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box .kzco-line-strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:has(.kzco-line):not(:has(.kzco-field)):not(:has(.kzco-btn)) .kzco-line-strong {
          border-top: 0 !important;
          padding-top: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box .kzco-line,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:has(.kzco-line):not(:has(.kzco-field)):not(:has(.kzco-btn)) .kzco-line {
          padding-top: .35rem !important;
          padding-bottom: .35rem !important;
        }

        /* Keep these framed because they are real controls */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-share-input {
          box-shadow: none !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
            padding-top: 1.65rem !important;
            padding-bottom: 1.05rem !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        }



        /* PMD_KAZEN_V40_VISUAL_CLEANUP_COLORS_TITLES_PAYMENT_20260618
           Normalize Kazen checkout:
           - body text/title/items/prices are ink, not red
           - red is reserved for primary action buttons and small accent states
           - titles are standard modal size
           - payment duplicate hero frame is hidden
           - display-only total frames stay removed
        */

        html body .kzco-overlay[data-kzco-root="1"] {
          --kzco-ink-clean: #242320;
          --kzco-muted-clean: rgba(36, 35, 32, .66);
          --kzco-title-clean: #242320;
          --kzco-accent-clean: #b85d59;
          color: var(--kzco-ink-clean) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] {
          --kzco-ink-clean: #f6e8c8;
          --kzco-muted-clean: rgba(246, 232, 200, .68);
          --kzco-title-clean: #f6e8c8;
          --kzco-accent-clean: #c86460;
          color: var(--kzco-ink-clean) !important;
        }

        /* Titles: standard size, not poster-size */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          align-items: start !important;
          gap: .9rem !important;
          padding-top: 1.65rem !important;
          padding-bottom: 1rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          max-width: 100% !important;
          min-width: 0 !important;
          padding-right: .5rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
          color: var(--kzco-title-clean) !important;
          -webkit-text-fill-color: var(--kzco-title-clean) !important;
          font-size: 1.95rem !important;
          line-height: 1.08 !important;
          letter-spacing: .07em !important;
          margin: 0 !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-eyebrow {
          color: var(--kzco-ink-clean) !important;
          -webkit-text-fill-color: var(--kzco-ink-clean) !important;
          font-size: .88rem !important;
          line-height: 1.2 !important;
          margin-bottom: .28rem !important;
        }

        /* Main content text: ink, not red */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-body,
          .kzco-body *,
          .kzco-card,
          .kzco-card *,
          .kzco-total-box,
          .kzco-total-box *,
          .kzco-line,
          .kzco-line *,
          .kzco-section-title,
          .kzco-summary,
          .kzco-summary *,
          .kzco-item,
          .kzco-item *,
          .kzco-item-row,
          .kzco-item-row *,
          .kzco-list,
          .kzco-list *,
          .kzco-order-row,
          .kzco-order-row *
        ) {
          color: var(--kzco-ink-clean) !important;
          -webkit-text-fill-color: var(--kzco-ink-clean) !important;
        }

        /* Softer secondary/helper text */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-muted,
          .kzco-help,
          .kzco-context,
          .kzco-small,
          .kzco-caption
        ) {
          color: var(--kzco-muted-clean) !important;
          -webkit-text-fill-color: var(--kzco-muted-clean) !important;
        }

        /* Section headings can keep a subtle Kazen accent, but not every item/price */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-section-title, .kzco-heading) {
          color: var(--kzco-ink-clean) !important;
          -webkit-text-fill-color: var(--kzco-ink-clean) !important;
        }

        /* Keep status accent readable */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-message,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-success-message {
          color: var(--kzco-accent-clean) !important;
          -webkit-text-fill-color: var(--kzco-accent-clean) !important;
        }

        /* Hide duplicated payment hero: it repeats Order total at the top */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-hero {
          display: none !important;
        }

        /* Keep display-only summaries frameless */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:has(.kzco-line):not(:has(.kzco-field)):not(:has(.kzco-btn)):not(:has(.kzco-method-grid)) {
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: .1rem 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-line-strong {
          border-top: 0 !important;
          padding-top: .2rem !important;
        }

        /* Buttons must keep their own colors */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-primary, button[data-kzco-button="primary"]) {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border-color: rgba(143, 55, 51, .58) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-secondary, button[data-kzco-button="secondary"]) {
          color: var(--kzco-ink-clean) !important;
          -webkit-text-fill-color: var(--kzco-ink-clean) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-primary, .kzco-btn-primary *, button[data-kzco-button="primary"], button[data-kzco-button="primary"] *) {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
        }

        /* Inputs and method tiles keep frames */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-field, .kzco-method-tile, .kzco-share-input) {
          border-width: 1px !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: 1.72rem !important;
            letter-spacing: .055em !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
            padding-top: 1.35rem !important;
          }
        }



        /* PMD_KAZEN_V41_FLOW_UI_CLEANUP_20260618
           Flow UI polish:
           - no ORDER STATUS poster title
           - received/timer hero in body with one-time slow pulse
           - split uses Share amount as title
           - compact people stepper
           - sharp input corners
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
          font-size: 1.58rem !important;
          line-height: 1.12 !important;
          letter-spacing: .055em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-title-wrap {
          display: block !important;
          max-width: calc(100% - 4.5rem) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-title-wrap h2 {
          display: block !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: clamp(1.35rem, 5.2vw, 1.95rem) !important;
          line-height: 1.08 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
          overflow-wrap: normal !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-head {
          grid-template-columns: minmax(0, 1fr) 48px !important;
          min-height: 4.25rem !important;
          padding-top: 1.15rem !important;
          padding-bottom: 1rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-copy-hero {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin-top: .45rem !important;
          margin-bottom: 1.15rem !important;
          min-height: 2.95rem !important;
          text-align: center !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-pulse {
          position: relative !important;
          width: auto !important;
          min-width: 3.25rem !important;
          height: 2.6rem !important;
          min-height: 2.6rem !important;
          padding: 0 .35rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          background: transparent !important;
          color: #b85d59 !important;
          transform-origin: center !important;
          overflow: visible !important;
          transition: min-width .42s cubic-bezier(.2, .9, .2, 1), color .36s ease !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-pulse[data-kzco-show-time="1"] {
          min-width: 5.45rem !important;
          color: rgba(36, 35, 32, .9) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-check {
          width: 1.45rem !important;
          height: 1.45rem !important;
          stroke: currentColor !important;
          animation: kzco-status-check-in .46s cubic-bezier(.2, .9, .2, 1) 1 both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time {
          display: inline-flex !important;
          align-items: baseline !important;
          justify-content: center !important;
          gap: .34rem !important;
          min-width: 0 !important;
          height: auto !important;
          margin: 0 !important;
          padding: .12rem .2rem .22rem !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          font-style: normal !important;
          line-height: 1 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          animation: kzco-status-time-reveal .5s cubic-bezier(.2, .9, .2, 1) 1 both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-clock {
          width: .9rem !important;
          height: .9rem !important;
          flex: 0 0 auto !important;
          color: #b85d59 !important;
          stroke: currentColor !important;
          stroke-width: 2.25 !important;
          -webkit-text-fill-color: #b85d59 !important;
          transform: translateY(.05rem) !important;
          opacity: .9 !important;
          animation: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time strong {
          display: inline-block !important;
          font-size: 1.7rem !important;
          font-weight: 950 !important;
          letter-spacing: -.025em !important;
          line-height: .9 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time span {
          display: inline-block !important;
          transform: translateY(-.02rem) !important;
          font-size: .72rem !important;
          font-weight: 900 !important;
          letter-spacing: .105em !important;
          line-height: 1 !important;
          text-transform: uppercase !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-status-pulse {
          color: #ec8a82 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-status-pulse[data-kzco-show-time="1"] {
          color: rgba(246, 232, 200, .95) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-status-time {
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: rgba(246, 232, 200, .95) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .95) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-status-time strong {
          color: rgba(246, 232, 200, .98) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .98) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-status-clock,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-status-time span {
          color: #ec8a82 !important;
          -webkit-text-fill-color: #ec8a82 !important;
        }

        @keyframes kzco-status-check-in {
          0% { opacity: 0; transform: scale(.82); }
          58% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes kzco-status-time-reveal {
          0% { opacity: 0; transform: translateY(5px); filter: blur(1px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        /* Split steps: hide empty h2 and make Share amount the visual title */
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-items"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-shares"] .kzco-title-wrap h2 {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split"] .kzco-eyebrow,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-items"] .kzco-eyebrow,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-shares"] .kzco-eyebrow {
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 1.85rem !important;
          font-weight: 800 !important;
          line-height: 1.05 !important;
          letter-spacing: .055em !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          margin: 0 !important;
        }

        /* People stepper: compact like item quantity stepper */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] {
          display: inline-grid !important;
          grid-template-columns: 34px minmax(86px, 1fr) 34px !important;
          width: min(190px, 100%) !important;
          height: 36px !important;
          min-height: 36px !important;
          align-items: center !important;
          overflow: hidden !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          background: rgba(255, 252, 246, .68) !important;
          margin-block: .35rem .65rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] .kzco-stepper-btn,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] .kzco-btn-square {
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          min-height: 34px !important;
          max-width: 34px !important;
          max-height: 34px !important;
          padding: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border: 0 !important;
          font-size: 1.22rem !important;
          font-weight: 800 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] .kzco-stepper-btn:last-child {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] strong {
          height: 34px !important;
          min-height: 34px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: .92rem !important;
          font-weight: 850 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          background: rgba(255, 255, 255, .32) !important;
          border-inline: 1px solid rgba(36, 35, 32, .16) !important;
        }

        /* Inputs: sharp corners */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] input.kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] textarea.kzco-field {
          border-radius: 0 !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: 1.38rem !important;
          }

          html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split"] .kzco-eyebrow,
          html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-items"] .kzco-eyebrow,
          html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-shares"] .kzco-eyebrow {
            font-size: 1.55rem !important;
          }
        }



        /* PMD_KAZEN_V43_NATIVE_PAY_BUTTON_DIRECT_FIX_20260618
           renderPaymentButton() returns .pmd-themed-button, not kzco-btn.
           Force it to the same Kazen primary button contract.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button.pmd-themed-button,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-themed-button="primary"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-stripe-native-button="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button.pmd-themed-button,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-themed-button="primary"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-stripe-native-button="1"] {
          width: 100% !important;
          min-height: 48px !important;
          height: 48px !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          filter: none !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border: 1px solid rgba(143, 55, 51, .62) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          opacity: 1 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          line-height: 1 !important;
          padding: .82rem 1rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button.pmd-themed-button *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-themed-button="primary"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-stripe-native-button="1"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button.pmd-themed-button *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-themed-button="primary"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-stripe-native-button="1"] * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button.pmd-themed-button:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-themed-button="primary"]:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-stripe-native-button="1"]:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button.pmd-themed-button:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-themed-button="primary"]:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-stripe-native-button="1"]:disabled {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .62) !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button.pmd-themed-button:not(:disabled):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-themed-button="primary"]:not(:disabled):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-stripe-native-button="1"]:not(:disabled):hover {
          background: #c86460 !important;
          background-color: #c86460 !important;
          background-image: linear-gradient(#c86460, #c86460) !important;
          transform: translateY(-1px) !important;
        }

        /* Stripe/payment form inputs also sharp, no rounded default */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail input,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail .kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-coupon-row input.kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tip-grid input.kzco-field {
          border-radius: 0 !important;
        }



        /* PMD_KAZEN_V44_PAY_BUTTON_ABSOLUTE_FINAL_20260618
           Last override for shared/native payment renderer.
        */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-payment-action, .kzco-payment-detail) :is(
          button.pmd-themed-button,
          button[data-pmd-themed-button],
          button[data-pmd-stripe-native-button],
          button[type="submit"]
        ) {
          width: 100% !important;
          height: 48px !important;
          min-height: 48px !important;
          border-radius: 0 !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border: 1px solid rgba(143, 55, 51, .62) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          box-shadow: none !important;
          filter: none !important;
          opacity: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-payment-action, .kzco-payment-detail) :is(
          button.pmd-themed-button,
          button[data-pmd-themed-button],
          button[data-pmd-stripe-native-button],
          button[type="submit"]
        ) * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-payment-action, .kzco-payment-detail) :is(
          button.pmd-themed-button,
          button[data-pmd-themed-button],
          button[data-pmd-stripe-native-button],
          button[type="submit"]
        ):disabled {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
        }



        /* PMD_KAZEN_V46C_PAYMENT_GUARD_CSS_SAFE_20260618
           Hide payment methods/fields until backend has created a real order_id.
           Make payment method logos compact and unframed when visible.
        */

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="0"] .kzco-method-grid,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="0"] .kzco-payment-detail,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="0"] .kzco-payment-action,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="0"] .kzco-section-title:has(+ .kzco-method-grid) {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="1"] .kzco-payment-blocked-clean {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-blocked-clean {
          margin-top: 1rem !important;
          padding: .9rem 0 0 !important;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-blocked-clean strong {
          display: block !important;
          font-size: 1rem !important;
          font-weight: 850 !important;
          margin-bottom: .35rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-blocked-clean p {
          margin: 0 0 .9rem !important;
          font-size: .9rem !important;
          line-height: 1.45 !important;
          color: rgba(36, 35, 32, .72) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .72) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .5rem !important;
          margin-bottom: .95rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile {
          min-height: 48px !important;
          height: 48px !important;
          padding: .25rem .35rem !important;
          border: 0 !important;
          outline: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          filter: none !important;
          opacity: .74 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile[data-kzco-active="1"] {
          opacity: 1 !important;
          border-bottom: 2px solid #b85d59 !important;
          background: rgba(184, 93, 89, .035) !important;
          background-color: rgba(184, 93, 89, .035) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile:hover {
          opacity: 1 !important;
          background: rgba(36, 35, 32, .035) !important;
          background-color: rgba(36, 35, 32, .035) !important;
          transform: translateY(-1px) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile img {
          max-width: 64px !important;
          max-height: 26px !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
        }



        /* PMD_KAZEN_V47_SPLIT_TABS_FIXED_20260618
           Keep Split / By order / By shares tabs stable in all split states.
           Selected tab gets a clear secondary active effect.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .58rem !important;
          align-items: stretch !important;
          width: 100% !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          height: 58px !important;
          min-height: 58px !important;
          padding: .5rem .3rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          line-height: 1.05 !important;
          border-radius: 0 !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          background: rgba(255, 255, 255, .42) !important;
          background-color: rgba(255, 255, 255, .42) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          box-shadow: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-label {
          display: grid !important;
          grid-template-rows: auto auto !important;
          gap: .12rem !important;
          align-items: center !important;
          justify-items: center !important;
          width: 100% !important;
          max-width: 100% !important;
          text-align: center !important;
          line-height: 1.02 !important;
          font-size: .82rem !important;
          font-weight: 900 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
          white-space: normal !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-label span {
          display: block !important;
          width: 100% !important;
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
        }

        /* Fallback for tabs still using plain text */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment:not(:has(.kzco-segment-label)),
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab:not(:has(.kzco-segment-label)) {
          font-size: .8rem !important;
          letter-spacing: .12em !important;
          line-height: 1.05 !important;
          text-wrap: balance !important;
        }

        /* Active selected split way */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment[aria-pressed="true"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab[aria-pressed="true"] {
          border: 1px solid rgba(184, 93, 89, .72) !important;
          background: rgba(184, 93, 89, .085) !important;
          background-color: rgba(184, 93, 89, .085) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          box-shadow: inset 0 -2px 0 #b85d59 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment[data-kzco-active="1"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab[data-kzco-active="1"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment[data-kzco-active="1"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment[aria-pressed="true"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab[aria-pressed="true"] * {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment:not([data-kzco-active="1"]):not([aria-pressed="true"]):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab:not([data-kzco-active="1"]):not([aria-pressed="true"]):hover {
          border-color: rgba(36, 35, 32, .32) !important;
          background: rgba(255, 255, 255, .62) !important;
          background-color: rgba(255, 255, 255, .62) !important;
          transform: translateY(-1px) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-tab,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-segment {
          border-color: rgba(246, 232, 200, .22) !important;
          background: rgba(8, 6, 4, .72) !important;
          background-color: rgba(8, 6, 4, .72) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs {
            gap: .42rem !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tab {
            height: 54px !important;
            min-height: 54px !important;
            padding-inline: .18rem !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-label {
            font-size: .72rem !important;
            letter-spacing: .105em !important;
          }
        }



        /* PMD_KAZEN_V48_SPLIT_TABS_CHIPS_POLISH_20260618
           Real final split tab fix:
           Force stable two-line labels with nth-child pseudo-content,
           so BY SHARES can never collapse into one line.
           Also polish people chips row.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .52rem !important;
          align-items: stretch !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          flex: 1 1 0 !important;
          height: 56px !important;
          min-height: 56px !important;
          padding: .42rem .18rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          overflow: hidden !important;
          white-space: normal !important;
          border-radius: 0 !important;
          font-size: 0 !important;
          letter-spacing: 0 !important;
          line-height: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment > *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment > *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab > *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab > * {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab::before {
          display: block !important;
          white-space: pre-line !important;
          text-align: center !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .74rem !important;
          font-weight: 900 !important;
          line-height: 1.08 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(1)::before {
          content: "SPLIT\\A EQUALLY" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(2)::before {
          content: "BY ORDER\\A ITEMS" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(3)::before {
          content: "BY\\A SHARES" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > :is(.kzco-btn-segment, .kzco-tab)[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > :is(.kzco-btn-segment, .kzco-tab)[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > :is(.kzco-btn-segment, .kzco-tab)[aria-pressed="true"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > :is(.kzco-btn-segment, .kzco-tab)[aria-pressed="true"] {
          border-color: rgba(184, 93, 89, .8) !important;
          background: rgba(184, 93, 89, .095) !important;
          background-color: rgba(184, 93, 89, .095) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          box-shadow: inset 0 -2px 0 #b85d59 !important;
        }

        /* People/guest chips: sit compactly to the right of the stepper and wrap nicely */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-people-row,
          .kzco-guest-row,
          .kzco-guests-row,
          .kzco-person-row,
          .kzco-people-list,
          .kzco-guests-list,
          .kzco-person-list,
          .kzco-payer-list,
          .kzco-split-people,
          .kzco-people-chips,
          .kzco-guest-chips,
          .kzco-person-chips
        ) {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: .45rem .55rem !important;
          margin-top: .65rem !important;
          margin-left: min(205px, 42%) !important;
          min-height: 38px !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-person-chip,
          .kzco-guest-chip,
          .kzco-payer-chip,
          .kzco-person-pill,
          .kzco-guest-pill,
          .kzco-payer-pill
        ),
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-people-row,
          .kzco-guest-row,
          .kzco-guests-row,
          .kzco-person-row,
          .kzco-people-list,
          .kzco-guests-list,
          .kzco-person-list,
          .kzco-payer-list,
          .kzco-split-people,
          .kzco-people-chips,
          .kzco-guest-chips,
          .kzco-person-chips
        ) > button {
          animation: kzco-person-chip-in .24s ease-out both !important;
          transition: transform .18s ease, opacity .18s ease, border-color .18s ease, background-color .18s ease !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-person-chip,
          .kzco-guest-chip,
          .kzco-payer-chip,
          .kzco-person-pill,
          .kzco-guest-pill,
          .kzco-payer-pill
        ):hover,
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-people-row,
          .kzco-guest-row,
          .kzco-guests-row,
          .kzco-person-row,
          .kzco-people-list,
          .kzco-guests-list,
          .kzco-person-list,
          .kzco-payer-list,
          .kzco-split-people,
          .kzco-people-chips,
          .kzco-guest-chips,
          .kzco-person-chips
        ) > button:hover {
          transform: translateY(-1px) !important;
        }

        @keyframes kzco-person-chip-in {
          from { opacity: 0; transform: translateY(5px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs {
            gap: .36rem !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab {
            height: 52px !important;
            min-height: 52px !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment::before,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment::before,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab::before,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab::before {
            font-size: .66rem !important;
            letter-spacing: .09em !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] :is(
            .kzco-people-row,
            .kzco-guest-row,
            .kzco-guests-row,
            .kzco-person-row,
            .kzco-people-list,
            .kzco-guests-list,
            .kzco-person-list,
            .kzco-payer-list,
            .kzco-split-people,
            .kzco-people-chips,
            .kzco-guest-chips,
            .kzco-person-chips
          ) {
            margin-left: 0 !important;
            margin-top: .55rem !important;
          }
        }



        /* PMD_KAZEN_V49_REAL_SPLIT_TABS_CHIPS_FIX_20260618
           Fix V48 escaped newline issue and force guest chips beside stepper.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab {
          font-size: 0 !important;
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          overflow: hidden !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab::before {
          display: block !important;
          white-space: pre-line !important;
          text-align: center !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .74rem !important;
          font-weight: 900 !important;
          line-height: 1.08 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(1)::before {
          content: "SPLIT\\A EQUALLY" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(2)::before {
          content: "BY ORDER\\A ITEMS" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(3)::before {
          content: "BY\\A SHARES" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > :is(.kzco-btn-segment, .kzco-tab)[data-kzco-active="1"]::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > :is(.kzco-btn-segment, .kzco-tab)[data-kzco-active="1"]::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > :is(.kzco-btn-segment, .kzco-tab)[aria-pressed="true"]::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > :is(.kzco-btn-segment, .kzco-tab)[aria-pressed="true"]::before {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        /* Put people chips beside the stepper, not below with empty gap */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] {
          float: left !important;
          margin: 0 .75rem .72rem 0 !important;
          width: 190px !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] + * {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: .45rem .55rem !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
          min-height: 38px !important;
          animation: kzco-person-chip-row-in .22s ease-out both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] + * > * {
          animation: kzco-person-chip-in .24s ease-out both !important;
          transition: transform .18s ease, opacity .18s ease, border-color .18s ease, background-color .18s ease !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] + * > *:hover {
          transform: translateY(-1px) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-assignment-panel,
          .kzco-assignment-box,
          .kzco-items-assignment,
          .kzco-share-box,
          .kzco-share-grid,
          .kzco-ready-box,
          .kzco-split-ready,
          .kzco-review-actions
        ) {
          clear: both !important;
        }

        @keyframes kzco-person-chip-row-in {
          from { opacity: .72; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 620px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] {
            float: none !important;
            width: 190px !important;
            margin: 0 0 .55rem 0 !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] + * {
            width: 100% !important;
          }
        }



        /* PMD_KAZEN_V50_PEOPLE_INLINE_PAYMENT_SCOPE_20260618
           Stepper + people chips are now a real JSX row, not guessed by float.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline {
          display: grid !important;
          grid-template-columns: 190px minmax(0, 1fr) !important;
          align-items: start !important;
          gap: .55rem .7rem !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] {
          float: none !important;
          width: 190px !important;
          max-width: 190px !important;
          min-width: 190px !important;
          height: 36px !important;
          min-height: 36px !important;
          margin: 0 !important;
          grid-template-columns: 36px minmax(0, 1fr) 36px !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] .kzco-stepper-btn,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] .kzco-btn-square {
          width: 36px !important;
          height: 36px !important;
          min-width: 36px !important;
          min-height: 36px !important;
          max-width: 36px !important;
          max-height: 36px !important;
          padding: 0 !important;
          font-size: 1.35rem !important;
          line-height: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] strong {
          height: 36px !important;
          min-height: 36px !important;
          font-size: .92rem !important;
          white-space: nowrap !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip-row {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          align-content: flex-start !important;
          gap: .42rem .5rem !important;
          width: 100% !important;
          max-width: 100% !important;
          min-height: 36px !important;
          margin: 0 !important;
          padding: 0 !important;
          animation: kzco-person-chip-row-in .22s ease-out both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip {
          min-height: 36px !important;
          height: 36px !important;
          padding: .42rem .58rem !important;
          font-size: .88rem !important;
          line-height: 1 !important;
          animation: kzco-person-chip-in .24s ease-out both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip b {
          width: 24px !important;
          height: 24px !important;
          min-width: 24px !important;
          margin-right: .36rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline + :is(.kzco-card, .kzco-list, section, button) {
          clear: both !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline {
            grid-template-columns: 1fr !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] {
            width: 190px !important;
            max-width: 190px !important;
          }
        }



        /* PMD_KAZEN_V51_COMPACT_STEPPER_WIDE_CHIPS_20260618
           Make split people control the same small size as item quantity stepper.
           This gives the guest chips enough horizontal space beside it.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline {
          display: grid !important;
          grid-template-columns: 106px minmax(0, 1fr) !important;
          align-items: start !important;
          gap: .55rem .72rem !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] {
          width: 106px !important;
          min-width: 106px !important;
          max-width: 106px !important;
          height: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          grid-template-columns: 34px 38px 34px !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          margin: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] .kzco-stepper-btn,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] .kzco-btn-square {
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          min-height: 34px !important;
          max-width: 34px !important;
          max-height: 34px !important;
          padding: 0 !important;
          font-size: 1.38rem !important;
          line-height: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] strong {
          width: 38px !important;
          min-width: 38px !important;
          height: 34px !important;
          min-height: 34px !important;
          font-size: .95rem !important;
          font-weight: 850 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip-row {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          align-content: flex-start !important;
          gap: .42rem .46rem !important;
          min-height: 36px !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip {
          flex: 0 0 auto !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
          height: 36px !important;
          min-height: 36px !important;
          padding: .38rem .52rem !important;
          gap: .36rem !important;
          font-size: .84rem !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          animation: kzco-person-chip-in .24s ease-out both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip b {
          width: 24px !important;
          height: 24px !important;
          min-width: 24px !important;
          margin-right: .26rem !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline {
            grid-template-columns: 106px minmax(0, 1fr) !important;
          }
        }



        /* PMD_KAZEN_V52_HIDE_GUEST_INITIAL_ICONS_20260618
           Remove the ugly initial-letter boxes inside split guest chips.
           Keep chips clean: Luna / Milo / Zara without fake icons.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip b,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-chip-row .kzco-chip b {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-chip-row .kzco-chip {
          min-width: auto !important;
          height: 36px !important;
          min-height: 36px !important;
          padding: .42rem .74rem !important;
          gap: 0 !important;
          justify-content: center !important;
          font-size: .88rem !important;
          font-weight: 820 !important;
          letter-spacing: .01em !important;
          white-space: nowrap !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip:hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-chip-row .kzco-chip:hover {
          border-color: rgba(184, 93, 89, .38) !important;
          background: rgba(184, 93, 89, .035) !important;
          transform: translateY(-1px) !important;
        }



        /* PMD_KAZEN_V54_CLOSE_ALWAYS_RIGHT_20260619
           Lock the close button to the right side on every checkout card,
           even when the title is hidden or empty.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          direction: ltr !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          grid-template-areas: "title close" !important;
          align-items: start !important;
          gap: 1rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          grid-area: title !important;
          grid-column: 1 !important;
          min-width: 0 !important;
          justify-self: start !important;
          text-align: left !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-close {
          grid-area: close !important;
          grid-column: 2 !important;
          justify-self: end !important;
          align-self: start !important;
          margin-left: auto !important;
          margin-right: 0 !important;
          inset-inline-start: auto !important;
          inset-inline-end: 0 !important;
          order: 99 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head > .kzco-close:first-child {
          grid-column: 2 !important;
          justify-self: end !important;
          margin-left: auto !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head > .kzco-title-wrap:empty,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2:empty {
          display: block !important;
          min-height: 1px !important;
        }

      `}),(0,d.jsx)(S.default,{id:"b65c8d856d6b206f",children:'html body .pmd-kazen-checkout-waiter,html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese]{--kz-primary-bg:#b85d59;--kz-primary-bg-hover:#c86460;--kz-primary-text:#fffaf3;--kz-primary-border:#8f37338f;--kz-secondary-bg:#ffffff6b;--kz-secondary-bg-hover:#ffffff9e;--kz-secondary-text:#242320;--kz-secondary-border:#24232038;--kz-close-bg:#ffffff6b;--kz-close-text:#242320;--kz-close-border:#24232038;--kz-disabled-bg:#b85d5929;--kz-disabled-text:#b85d59c7;--kz-disabled-border:#b85d596b}html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode=dark],html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese][data-pmd-kazen-checkout-mode=dark]{--kz-primary-bg:#b85d59;--kz-primary-bg-hover:#c86460;--kz-primary-text:#fffaf3;--kz-primary-border:#df685db8;--kz-secondary-bg:#080604e0;--kz-secondary-bg-hover:#f6e8c814;--kz-secondary-text:#f6e8c8;--kz-secondary-border:#c6a45d5c;--kz-close-bg:#f6e8c80e;--kz-close-text:#f6e8c8;--kz-close-border:#c6a45d4d;--kz-disabled-bg:#b85d5947;--kz-disabled-text:#fffaf3ad;--kz-disabled-border:#df685d57}html body .pmd-kazen-checkout-waiter button,html body .pmd-kazen-checkout-waiter [role=button],html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese] button,html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese] [role=button]{box-shadow:none!important;text-shadow:none!important;outline-offset:3px!important;letter-spacing:.12em!important;text-transform:uppercase!important;appearance:none!important;border-radius:0!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif!important;font-weight:850!important;transition:background-color .18s,border-color .18s,color .18s,transform .18s!important}html body .pmd-kazen-checkout-waiter button:focus,html body .pmd-kazen-checkout-waiter button:focus-visible{outline:2px solid #b85d596b!important}html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close,html body .pmd-kazen-checkout-waiter .kazen-solid-close,html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean{background:var(--kz-close-bg)!important;width:48px!important;min-width:48px!important;height:48px!important;min-height:48px!important;color:var(--kz-close-text)!important;-webkit-text-fill-color:var(--kz-close-text)!important;border:1px solid var(--kz-close-border)!important;justify-content:center!important;align-items:center!important;padding:0!important;display:inline-flex!important}html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close svg,html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close svg *,html body .pmd-kazen-checkout-waiter .kazen-solid-close svg,html body .pmd-kazen-checkout-waiter .kazen-solid-close svg *{color:var(--kz-close-text)!important;stroke:currentColor!important;fill:none!important}html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=primary],html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-primary,html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-action-primary-clean,html body .pmd-kazen-checkout-waiter .pmd-themed-button[data-pmd-themed-button=primary],html body .pmd-kazen-checkout-waiter [data-pmd-stripe-native-button="1"],html body .pmd-kazen-checkout-waiter button[type=submit]{background:var(--kz-primary-bg)!important;background-color:var(--kz-primary-bg)!important;min-height:48px!important;color:var(--kz-primary-text)!important;-webkit-text-fill-color:var(--kz-primary-text)!important;border:1px solid var(--kz-primary-border)!important;justify-content:center!important;align-items:center!important;gap:.55rem!important;padding:.82rem 1rem!important;display:inline-flex!important}html body .pmd-kazen-checkout-waiter button:has(.lucide-lock){background:var(--kz-primary-bg)!important;background-color:var(--kz-primary-bg)!important;min-height:48px!important;color:var(--kz-primary-text)!important;-webkit-text-fill-color:var(--kz-primary-text)!important;border:1px solid var(--kz-primary-border)!important;justify-content:center!important;align-items:center!important;gap:.55rem!important;padding:.82rem 1rem!important;display:inline-flex!important}html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=primary]:not(:disabled):not([aria-disabled=true]):hover,html body .pmd-kazen-checkout-waiter .pmd-themed-button[data-pmd-themed-button=primary]:not(:disabled):hover,html body .pmd-kazen-checkout-waiter [data-pmd-stripe-native-button="1"]:not(:disabled):hover{background:var(--kz-primary-bg-hover)!important;background-color:var(--kz-primary-bg-hover)!important;transform:translateY(-1px)!important}html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=secondary],html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-secondary,html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-action-secondary-clean,html body .pmd-kazen-checkout-waiter .kazen-secondary,html body .pmd-kazen-checkout-waiter .pmd-kazen-tab,html body .pmd-kazen-checkout-waiter .pmd-kazen-tab-active,html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary,html body .pmd-kazen-checkout-waiter .pmd-kazen-split-stepper-btn,html body .pmd-kazen-checkout-waiter .pmd-kazen-assign-row,html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile,html body .pmd-kazen-checkout-waiter .pmd-kazen-method,html body .pmd-kazen-checkout-waiter .pmd-kazen-apply{background:var(--kz-secondary-bg)!important;background-color:var(--kz-secondary-bg)!important;min-height:48px!important;color:var(--kz-secondary-text)!important;-webkit-text-fill-color:var(--kz-secondary-text)!important;border:1px solid var(--kz-secondary-border)!important;justify-content:center!important;align-items:center!important;gap:.55rem!important;padding:.82rem 1rem!important;display:inline-flex!important}html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=secondary]:not(:disabled):not([aria-disabled=true]):hover,html body .pmd-kazen-checkout-waiter .pmd-kazen-tab:not(:disabled):hover,html body .pmd-kazen-checkout-waiter .pmd-kazen-split-stepper-btn:not(:disabled):hover,html body .pmd-kazen-checkout-waiter .pmd-kazen-assign-row:not(:disabled):hover,html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile:not(:disabled):hover,html body .pmd-kazen-checkout-waiter .pmd-kazen-method:not(:disabled):hover{background:var(--kz-secondary-bg-hover)!important;background-color:var(--kz-secondary-bg-hover)!important;transform:translateY(-1px)!important}html body .pmd-kazen-checkout-waiter .pmd-kazen-tab-active{background:var(--kz-secondary-bg)!important;background-color:var(--kz-secondary-bg)!important;color:var(--kz-secondary-text)!important;-webkit-text-fill-color:var(--kz-secondary-text)!important;border:1px solid var(--kz-primary-bg)!important;box-shadow:inset 0 -2px 0 var(--kz-primary-bg)!important}html body .pmd-kazen-checkout-waiter button:disabled,html body .pmd-kazen-checkout-waiter button[disabled],html body .pmd-kazen-checkout-waiter [aria-disabled=true],html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=primary]:disabled,html body .pmd-kazen-checkout-waiter .pmd-themed-button:disabled,html body .pmd-kazen-checkout-waiter [data-pmd-stripe-native-button="1"]:disabled{opacity:1!important;cursor:not-allowed!important;pointer-events:none!important;background:var(--kz-disabled-bg)!important;background-color:var(--kz-disabled-bg)!important;color:var(--kz-disabled-text)!important;-webkit-text-fill-color:var(--kz-disabled-text)!important;border:1px solid var(--kz-disabled-border)!important;filter:none!important;transform:none!important}html body .pmd-kazen-checkout-waiter button svg,html body .pmd-kazen-checkout-waiter button svg *,html body .pmd-kazen-checkout-waiter [role=button] svg,html body .pmd-kazen-checkout-waiter [role=button] svg *{color:currentColor!important;stroke:currentColor!important;fill:none!important}html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile img,html body .pmd-kazen-checkout-waiter .pmd-kazen-method img{object-fit:contain!important;max-width:72px!important;max-height:34px!important}'}),(0,d.jsx)(S.default,{id:"aa41fae69953022d",children:'html body .kzco-shell,html body .kzco-overlay,html body .kzco-card,html body .pmd-kazen-checkout-waiter,html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese]{--kzco-primary-bg:#b85d59;--kzco-primary-hover:#c86460;--kzco-primary-text:#fffaf3;--kzco-primary-border:#8f373394;--kzco-secondary-bg:#ffffff6b;--kzco-secondary-hover:#ffffff9e;--kzco-secondary-text:#242320;--kzco-secondary-border:#2423203d;--kzco-close-bg:#ffffff6b;--kzco-close-text:#242320;--kzco-close-border:#2423203d;--kzco-disabled-bg:#b85d5924;--kzco-disabled-text:#b85d59d1;--kzco-disabled-border:#b85d597a}html body .kzco-shell[data-kzco-mode=dark],html body .kzco-overlay[data-kzco-mode=dark],html body .kzco-card[data-kzco-mode=dark],html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode=dark],html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese][data-pmd-kazen-checkout-mode=dark]{--kzco-primary-bg:#b85d59;--kzco-primary-hover:#c86460;--kzco-primary-text:#fffaf3;--kzco-primary-border:#df685db8;--kzco-secondary-bg:#080604e0;--kzco-secondary-hover:#f6e8c814;--kzco-secondary-text:#f6e8c8;--kzco-secondary-border:#c6a45d61;--kzco-close-bg:#f6e8c80e;--kzco-close-text:#f6e8c8;--kzco-close-border:#c6a45d52;--kzco-disabled-bg:#b85d5942;--kzco-disabled-text:#fffaf3b8;--kzco-disabled-border:#df685d66}html body button.kzco-btn,html body .kzco-btn,html body button[data-kzco-button],html body button[data-pmd-kazen-button],html body .pmd-themed-button,html body [data-pmd-stripe-native-button="1"]{min-height:48px!important;box-shadow:none!important;text-shadow:none!important;letter-spacing:.12em!important;text-transform:uppercase!important;text-align:center!important;appearance:none!important;background-image:none!important;border-radius:0!important;justify-content:center!important;align-items:center!important;gap:.55rem!important;padding:.82rem 1rem!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif!important;font-size:.82rem!important;font-weight:850!important;line-height:1.08!important;transition:background-color .18s,border-color .18s,color .18s,transform .18s!important;display:inline-flex!important}html body button.kzco-btn-primary,html body .kzco-btn-primary,html body button[data-kzco-button=primary],html body button[data-pmd-kazen-button=primary],html body .pmd-themed-button[data-pmd-themed-button=primary],html body [data-pmd-stripe-native-button="1"],html body button[type=submit][data-pmd-themed-button=primary]{background:var(--kzco-primary-bg)!important;background-color:var(--kzco-primary-bg)!important;color:var(--kzco-primary-text)!important;-webkit-text-fill-color:var(--kzco-primary-text)!important;border:1px solid var(--kzco-primary-border)!important}html body button:has(.lucide-lock){background:var(--kzco-primary-bg)!important;background-color:var(--kzco-primary-bg)!important;color:var(--kzco-primary-text)!important;-webkit-text-fill-color:var(--kzco-primary-text)!important;border:1px solid var(--kzco-primary-border)!important}html body button.kzco-btn-primary:not(:disabled):not([aria-disabled=true]):hover,html body button[data-kzco-button=primary]:not(:disabled):not([aria-disabled=true]):hover,html body button[data-pmd-kazen-button=primary]:not(:disabled):not([aria-disabled=true]):hover,html body .pmd-themed-button[data-pmd-themed-button=primary]:not(:disabled):hover,html body [data-pmd-stripe-native-button="1"]:not(:disabled):hover{background:var(--kzco-primary-hover)!important;background-color:var(--kzco-primary-hover)!important;color:var(--kzco-primary-text)!important;-webkit-text-fill-color:var(--kzco-primary-text)!important;transform:translateY(-1px)!important}html body button.kzco-btn-secondary,html body .kzco-btn-secondary,html body button[data-kzco-button=secondary],html body button[data-pmd-kazen-button=secondary],html body .kzco-tab,html body button.kzco-tab,html body .kzco-btn-tab,html body .kzco-choice,html body .kzco-method,html body .kzco-assign-row,html body .kzco-stepper-btn,html body .pmd-payment-method-tile,html body .pmd-kazen-method,html body .pmd-kazen-tab,html body .pmd-kazen-split-stepper-btn,html body .pmd-kazen-assign-row{background:var(--kzco-secondary-bg)!important;background-color:var(--kzco-secondary-bg)!important;color:var(--kzco-secondary-text)!important;-webkit-text-fill-color:var(--kzco-secondary-text)!important;border:1px solid var(--kzco-secondary-border)!important}html body button.kzco-btn-secondary:not(:disabled):hover,html body button[data-kzco-button=secondary]:not(:disabled):hover,html body .kzco-tab:not(:disabled):hover,html body .kzco-method:not(:disabled):hover,html body .kzco-assign-row:not(:disabled):hover,html body .kzco-stepper-btn:not(:disabled):hover,html body .pmd-payment-method-tile:not(:disabled):hover{background:var(--kzco-secondary-hover)!important;background-color:var(--kzco-secondary-hover)!important;transform:translateY(-1px)!important}html body .kzco-tab-active,html body .pmd-kazen-tab-active{background:var(--kzco-secondary-bg)!important;background-color:var(--kzco-secondary-bg)!important;color:var(--kzco-secondary-text)!important;-webkit-text-fill-color:var(--kzco-secondary-text)!important;border:1px solid var(--kzco-primary-bg)!important;box-shadow:inset 0 -2px 0 var(--kzco-primary-bg)!important}html body .kzco-close,html body button.kzco-close,html body .kzco-btn-close,html body .pmd-kazen-action-close,html body .kazen-solid-close,html body .pmd-kazen-checkout-close-clean{background:var(--kzco-close-bg)!important;background-color:var(--kzco-close-bg)!important;width:48px!important;min-width:48px!important;max-width:48px!important;height:48px!important;min-height:48px!important;max-height:48px!important;color:var(--kzco-close-text)!important;-webkit-text-fill-color:var(--kzco-close-text)!important;border:1px solid var(--kzco-close-border)!important;padding:0!important}html body .kzco-close svg,html body .kzco-close svg *,html body .pmd-kazen-action-close svg,html body .pmd-kazen-action-close svg *,html body button.kzco-btn svg,html body button.kzco-btn svg *,html body button[data-kzco-button] svg,html body button[data-kzco-button] svg *{color:currentColor!important;stroke:currentColor!important;fill:none!important}html body button.kzco-btn:disabled,html body button[data-kzco-button]:disabled,html body button[data-pmd-kazen-button]:disabled,html body button[disabled].kzco-btn,html body .pmd-themed-button:disabled,html body [data-pmd-stripe-native-button="1"]:disabled{opacity:1!important;cursor:not-allowed!important;pointer-events:none!important;background:var(--kzco-disabled-bg)!important;background-color:var(--kzco-disabled-bg)!important;color:var(--kzco-disabled-text)!important;-webkit-text-fill-color:var(--kzco-disabled-text)!important;border:1px solid var(--kzco-disabled-border)!important;filter:none!important;transform:none!important}'}),(0,d.jsx)("style",{"data-pmd-kazen-stripe-form-final-polish":"1",children:`
        /* PMD_KAZEN_STRIPE_FORM_FINAL_POLISH_20260620
           This style is rendered only by the Kazen checkout shell. Keep it broad
           inside the shell so it wins over shared Stripe/ThemedInput styles. */
        html body form[data-pmd-stripe-form="1"] input.pmd-themed-input,
        html body form[data-pmd-stripe-form="1"] input[data-pmd-themed-input] {
          height: 54px !important;
          min-height: 54px !important;
          width: 100% !important;
          border-radius: 0 !important;
          background: rgba(255, 251, 243, .74) !important;
          background-color: rgba(255, 251, 243, .74) !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          box-shadow: none !important;
          outline: none !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: 1rem !important;
          font-weight: 720 !important;
          letter-spacing: -.015em !important;
          padding: 0 16px !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease !important;
        }

        html body form[data-pmd-stripe-form="1"] input.pmd-themed-input::placeholder,
        html body form[data-pmd-stripe-form="1"] input[data-pmd-themed-input]::placeholder {
          color: rgba(36, 35, 32, .52) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .52) !important;
        }

        html body form[data-pmd-stripe-form="1"] input.pmd-themed-input:focus,
        html body form[data-pmd-stripe-form="1"] input[data-pmd-themed-input]:focus {
          border-color: rgba(184, 93, 89, .72) !important;
          background: rgba(255, 250, 242, .92) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .72) !important;
        }

        html body form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame {
          height: 54px !important;
          min-height: 54px !important;
          border-radius: 0 !important;
          background: rgba(255, 251, 243, .74) !important;
          background-color: rgba(255, 251, 243, .74) !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          box-shadow: none !important;
          padding: 0 14px !important;
          display: flex !important;
          align-items: center !important;
          transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease !important;
        }

        html body form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame:focus-within {
          border-color: rgba(184, 93, 89, .72) !important;
          background: rgba(255, 250, 242, .92) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .72) !important;
        }

        html body form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame .StripeElement,
        html body form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame .__PrivateStripeElement {
          width: 100% !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        html body form[data-pmd-stripe-form="1"] button[data-pmd-stripe-native-button="1"],
        html body form[data-pmd-stripe-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"],
        html body form[data-pmd-stripe-form="1"] button[type="submit"] {
          width: 100% !important;
          height: 54px !important;
          min-height: 54px !important;
          border-radius: 0 !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border: 1px solid rgba(143, 55, 51, .68) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          box-shadow: none !important;
          filter: none !important;
          opacity: 1 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .14em !important;
          line-height: 1 !important;
          text-transform: uppercase !important;
          padding: .86rem 1rem !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease !important;
        }

        html body form[data-pmd-stripe-form="1"] button[data-pmd-stripe-native-button="1"] *,
        html body form[data-pmd-stripe-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"] *,
        html body form[data-pmd-stripe-form="1"] button[type="submit"] * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        html body form[data-pmd-stripe-form="1"] button[data-pmd-stripe-native-button="1"]:not(:disabled):hover,
        html body form[data-pmd-stripe-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"]:not(:disabled):hover,
        html body form[data-pmd-stripe-form="1"] button[type="submit"]:not(:disabled):hover {
          background: #c86460 !important;
          background-color: #c86460 !important;
          background-image: linear-gradient(#c86460, #c86460) !important;
          border-color: rgba(143, 55, 51, .78) !important;
          transform: translateY(-1px) !important;
        }

        html body form[data-pmd-stripe-form="1"] button[data-pmd-stripe-native-button="1"]:disabled,
        html body form[data-pmd-stripe-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"]:disabled,
        html body form[data-pmd-stripe-form="1"] button[type="submit"]:disabled {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border-color: rgba(143, 55, 51, .68) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          transform: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] form[data-pmd-stripe-form="1"] input.pmd-themed-input,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] form[data-pmd-stripe-form="1"] input[data-pmd-themed-input],
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame {
          background: rgba(246, 232, 200, .055) !important;
          background-color: rgba(246, 232, 200, .055) !important;
          border-color: rgba(198, 164, 93, .36) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] form[data-pmd-stripe-form="1"] input.pmd-themed-input::placeholder,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] form[data-pmd-stripe-form="1"] input[data-pmd-themed-input]::placeholder {
          color: rgba(244, 231, 200, .60) !important;
          -webkit-text-fill-color: rgba(244, 231, 200, .60) !important;
        }

        /* PMD_KAZEN_ORDER_FLOW_SUMMARY_STYLE_V1 */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-final-total {
          margin-top: .2rem !important;
          padding-top: 1rem !important;
          border-top: 1px solid var(--kzco-panel-line) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-summary {
          padding-bottom: .35rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars button:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-textarea:disabled {
          cursor: default !important;
          opacity: .78 !important;
        }

        /* PMD_KAZEN_PAID_CONFIRMATION_CARD_V3
           Real post-payment confirmation card for Kazen checkout.
           Keeps the same sharp Japanese visual language and supports dark mode.
        */
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-title-wrap,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-title-wrap h2 {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-head {
          grid-template-columns: 1fr 48px !important;
          min-height: 4.25rem !important;
          padding-top: 1.15rem !important;
          padding-bottom: .75rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-body {
          gap: .95rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-hero {
          margin-bottom: .55rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-note {
          margin: -.35rem 0 .1rem !important;
          font-size: .92rem !important;
          line-height: 1.45 !important;
          color: rgba(36, 35, 32, .72) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .72) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paid-note {
          color: rgba(246, 232, 200, .76) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .76) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-total-box {
          margin-top: .05rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-powered-by {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .5rem !important;
          padding-top: .2rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-powered-by span {
          font-size: .68rem !important;
          font-weight: 700 !important;
          letter-spacing: .10em !important;
          text-transform: uppercase !important;
          color: rgba(36, 35, 32, .56) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .56) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-powered-by span {
          color: rgba(246, 232, 200, .54) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .54) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-powered-by img {
          display: block !important;
          max-width: 118px !important;
          max-height: 22px !important;
          object-fit: contain !important;
          opacity: .78 !important;
        }



        /* PMD_KAZEN_PAID_FEEDBACK_V4
           Paid-state feedback card aligned with the Kazen sharp premium style.
        */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-card {
          display: grid !important;
          gap: .85rem !important;
          padding: 1rem !important;
          background: rgba(255, 255, 255, .34) !important;
          border: 1px solid rgba(36, 35, 32, .14) !important;
          border-radius: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head {
          display: flex !important;
          align-items: flex-start !important;
          gap: .75rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head > span {
          width: 34px !important;
          height: 34px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid rgba(184, 93, 89, .38) !important;
          color: #b85d59 !important;
          flex: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head h3 {
          margin: 0 !important;
          color: var(--kzco-panel-text) !important;
          font-size: .98rem !important;
          font-weight: 850 !important;
          letter-spacing: .02em !important;
          line-height: 1.1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head p {
          margin: .2rem 0 0 !important;
          color: var(--kzco-panel-muted) !important;
          font-size: .78rem !important;
          line-height: 1.35 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars {
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          gap: .45rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars button {
          height: 42px !important;
          border-radius: 0 !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          background: rgba(255, 255, 255, .44) !important;
          color: rgba(36, 35, 32, .42) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          transition: border-color .18s ease, background .18s ease, color .18s ease !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars button[data-kzco-active="1"] {
          border-color: rgba(184, 93, 89, .50) !important;
          background: rgba(184, 93, 89, .10) !important;
          color: #b85d59 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars button[data-kzco-active="1"] svg {
          fill: currentColor !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-textarea {
          width: 100% !important;
          min-height: 82px !important;
          resize: vertical !important;
          border-radius: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-submit {
          min-height: 44px !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-message {
          margin: 0 !important;
          font-size: .76rem !important;
          font-weight: 650 !important;
          color: #166534 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-error {
          color: #b42318 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share {
          border: 1px solid rgba(184, 93, 89, .18) !important;
          padding: .75rem !important;
          display: grid !important;
          gap: .5rem !important;
          background: rgba(255, 255, 255, .28) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share p {
          margin: 0 !important;
          font-size: .76rem !important;
          font-weight: 800 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share div {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: .45rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share a {
          display: inline-flex !important;
          align-items: center !important;
          gap: .35rem !important;
          border: 1px solid rgba(36, 35, 32, .16) !important;
          padding: .42rem .62rem !important;
          color: var(--kzco-panel-text) !important;
          text-decoration: none !important;
          font-size: .72rem !important;
          font-weight: 800 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-review-card,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-review-share {
          background: rgba(8, 6, 4, .54) !important;
          border-color: rgba(198, 164, 93, .26) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-stars button {
          background: rgba(8, 6, 4, .58) !important;
          border-color: rgba(198, 164, 93, .24) !important;
          color: rgba(246, 232, 200, .38) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-stars button[data-kzco-active="1"] {
          border-color: rgba(236, 138, 130, .56) !important;
          background: rgba(184, 93, 89, .18) !important;
          color: #ec8a82 !important;
        }



        /* PMD_KAZEN_PAID_FEEDBACK_POLISH_V5
           Remove heavy frames from paid feedback and use compact icon-only public share links.
        */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-card {
          padding: .85rem 0 .1rem !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          gap: .78rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head {
          gap: .62rem !important;
          align-items: center !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head > span {
          width: 28px !important;
          height: 28px !important;
          border: 0 !important;
          background: transparent !important;
          color: #b85d59 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head h3 {
          font-size: .98rem !important;
          letter-spacing: .01em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head p {
          font-size: .76rem !important;
          margin-top: .15rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars {
          display: flex !important;
          justify-content: center !important;
          gap: .36rem !important;
          padding: .1rem 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars button {
          width: 42px !important;
          height: 42px !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: rgba(36, 35, 32, .42) !important;
          padding: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars button svg {
          width: 24px !important;
          height: 24px !important;
          transition: transform .18s ease, color .18s ease, fill .18s ease !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars button[data-kzco-active="1"] {
          color: #b85d59 !important;
          background: transparent !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stars button[data-kzco-active="1"] svg {
          fill: currentColor !important;
          transform: translateY(-1px) scale(1.04) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-textarea {
          min-height: 76px !important;
          padding: .85rem .95rem !important;
          border-radius: 0 !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          background: rgba(255, 255, 255, .28) !important;
          box-shadow: none !important;
          font-size: .9rem !important;
          line-height: 1.35 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-submit {
          min-height: 44px !important;
          margin-top: .05rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share {
          border: 0 !important;
          background: transparent !important;
          padding: .2rem 0 0 !important;
          gap: .52rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share p {
          text-align: center !important;
          color: var(--kzco-panel-muted) !important;
          letter-spacing: .06em !important;
          text-transform: uppercase !important;
          font-size: .64rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share div {
          justify-content: center !important;
          gap: .5rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share a {
          width: 42px !important;
          height: 42px !important;
          padding: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          background: rgba(255, 255, 255, .32) !important;
          color: var(--kzco-panel-text) !important;
          font-size: 0 !important;
          line-height: 0 !important;
          text-decoration: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share a svg {
          width: 19px !important;
          height: 19px !important;
          stroke: currentColor !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-share a span {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-review-card {
          background: transparent !important;
          border: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-review-head > span,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-stars button[data-kzco-active="1"] {
          color: #ec8a82 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-stars button {
          color: rgba(246, 232, 200, .40) !important;
          background: transparent !important;
          border: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-review-textarea {
          border-color: rgba(198, 164, 93, .30) !important;
          background: rgba(8, 6, 4, .46) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-review-share a {
          border-color: rgba(198, 164, 93, .30) !important;
          background: rgba(8, 6, 4, .48) !important;
          color: #f6e8c8 !important;
        }



        /* PMD_KAZEN_PAID_HEADER_TIMER_V6
           Paid card: title belongs in header; ETA timer matches the order-received timer style.
        */
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-title-wrap,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-title-wrap h2 {
          display: block !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-head {
          min-height: auto !important;
          padding: 1.35rem 1.45rem 1.15rem !important;
          align-items: flex-start !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-head h2 {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: clamp(2.05rem, 7.2vw, 3.15rem) !important;
          font-weight: 900 !important;
          line-height: .94 !important;
          letter-spacing: -.055em !important;
          text-transform: none !important;
          max-width: 12rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-body {
          padding-top: 1.05rem !important;
          gap: .92rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time-wrap {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin: .25rem 0 .55rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .42rem !important;
          font-style: normal !important;
          color: rgba(36, 35, 32, .86) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .86) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time svg {
          width: 1.05rem !important;
          height: 1.05rem !important;
          stroke: currentColor !important;
          opacity: .82 !important;
          flex: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time strong {
          font-size: 1.72rem !important;
          font-weight: 900 !important;
          line-height: .92 !important;
          letter-spacing: -.04em !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time span {
          font-size: .82rem !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          transform: translateY(.08rem) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-note {
          margin-top: -.15rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paid-time {
          color: rgba(246, 232, 200, .82) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .82) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paid-time strong {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paid-time span {
          color: #ec8a82 !important;
          -webkit-text-fill-color: #ec8a82 !important;
        }



        /* PMD_KAZEN_PAID_COMPACT_ROBOTO_V7
           Compact paid confirmation and Roboto typography in isolated Kazen checkout.
        */
        html body .kzco-overlay[data-kzco-root="1"],
        html body .kzco-overlay[data-kzco-root="1"] *:not(svg):not(path):not(circle):not(polyline):not(line):not(rect):not(polygon) {
          font-family: "Roboto", Arial, Helvetica, sans-serif !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-note {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-head {
          padding: 1.12rem 1.35rem .95rem !important;
          min-height: auto !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-head h2 {
          font-size: clamp(1.95rem, 6.3vw, 2.72rem) !important;
          line-height: .98 !important;
          letter-spacing: -.045em !important;
          max-width: 13.8rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-body {
          padding-top: .82rem !important;
          gap: .78rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time-wrap {
          margin: .08rem 0 .32rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-total-box {
          margin-top: .05rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-card {
          padding-top: .45rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-powered-by {
          padding-top: .05rem !important;
        }


        /* PMD_KAZEN_INLINE_PAYMENT_ICONS_V1
           Fast, no-network payment method marks. Replaces PNG/SVG image requests.
           Light/dark mode is handled by currentColor and theme variables.
        */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile {
          overflow: hidden !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-width: 2.75rem !important;
          height: 2rem !important;
          color: #242320 !important;
          -webkit-text-fill-color: currentColor !important;
          line-height: 1 !important;
          user-select: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark svg {
          display: block !important;
          width: 4.2rem !important;
          height: 2.55rem !important;
          fill: none !important;
          stroke: currentColor !important;
          stroke-width: 3.2 !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-card svg {
          color: #32445f !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-apple {
          gap: .18rem !important;
          font-size: 2.05rem !important;
          font-weight: 800 !important;
          letter-spacing: -.07em !important;
          color: #050505 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-apple-symbol {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Symbol", sans-serif !important;
          font-size: 2.18rem !important;
          transform: translateY(-.02rem) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-google {
          gap: .25rem !important;
          font-size: 1.92rem !important;
          font-weight: 600 !important;
          letter-spacing: -.04em !important;
          color: #69707d !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-google-g {
          width: 1.85rem !important;
          height: 1.85rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          background:
            conic-gradient(from -35deg, #4285f4 0 25%, #34a853 0 45%, #fbbc05 0 68%, #ea4335 0 83%, #4285f4 0 100%) !important;
          color: #ffffff !important;
          font-weight: 900 !important;
          font-size: 1.32rem !important;
          letter-spacing: -.12em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-google-g i {
          font-style: normal !important;
          -webkit-text-fill-color: #fff !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-wero {
          font-size: 1.88rem !important;
          font-weight: 950 !important;
          letter-spacing: -.12em !important;
          color: #141414 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-wero b {
          font-weight: 950 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-wero b:first-child {
          color: #111111 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-wero b:last-child {
          color: #202020 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-paypal {
          gap: .35rem !important;
          color: #173a87 !important;
          font-size: 1.25rem !important;
          font-weight: 850 !important;
          letter-spacing: -.05em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-paypal span {
          width: 1.95rem !important;
          height: 1.95rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: linear-gradient(135deg, #1f4aa8, #179bd7) !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
          border-radius: .18rem !important;
          transform: skew(-7deg) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-cash svg {
          color: #1b1b1b !important;
          width: 4rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-text {
          max-width: 100% !important;
          font-size: .88rem !important;
          font-weight: 900 !important;
          letter-spacing: .06em !important;
          text-transform: uppercase !important;
          color: #242320 !important;
          text-align: center !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: currentColor !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-card svg,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-cash svg,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-wero,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-wero b,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-text {
          color: #f6e8c8 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-apple {
          color: #ffffff !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-google {
          color: rgba(246, 232, 200, .74) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-paypal {
          color: #8fc6ff !important;
        }



        /* PMD_KAZEN_INLINE_PAYMENT_ICONS_V3
           Compact premium payment method marks. Overrides the earlier oversized v1 safely.
        */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .55rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile {
          min-height: 3.25rem !important;
          height: 3.25rem !important;
          padding: .35rem .45rem !important;
          overflow: hidden !important;
          background: rgba(255, 255, 255, .38) !important;
          border-color: rgba(36, 35, 32, .20) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile[data-kzco-active="1"] {
          border-color: rgba(184, 93, 89, .78) !important;
          background: rgba(184, 93, 89, .065) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .70) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile .kzco-paymark {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 1.45rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .34rem !important;
          color: #242320 !important;
          -webkit-text-fill-color: currentColor !important;
          line-height: 1 !important;
          transform: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile .kzco-paymark svg {
          width: 1.34rem !important;
          height: 1.34rem !important;
          display: block !important;
          fill: none !important;
          stroke: currentColor !important;
          stroke-width: 1.75 !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
          flex: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile .kzco-paymark-label {
          display: inline-block !important;
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
          white-space: nowrap !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-symbol {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Symbol", sans-serif !important;
          font-size: 1.06rem !important;
          font-weight: 800 !important;
          line-height: .9 !important;
          color: #050505 !important;
          -webkit-text-fill-color: #050505 !important;
          transform: translateY(-.035rem) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-apple .kzco-paymark-label {
          font-size: .96rem !important;
          font-weight: 900 !important;
          letter-spacing: -.04em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-g {
          width: 1.08rem !important;
          height: 1.08rem !important;
          border-radius: 50% !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex: none !important;
          background:
            conic-gradient(from -35deg, #4285f4 0 25%, #34a853 0 45%, #fbbc05 0 68%, #ea4335 0 83%, #4285f4 0 100%) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          font-size: .72rem !important;
          font-weight: 950 !important;
          letter-spacing: -.12em !important;
          padding-right: .05rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-google .kzco-paymark-label {
          color: #69707d !important;
          -webkit-text-fill-color: #69707d !important;
          font-size: .95rem !important;
          font-weight: 800 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-card {
          color: #2f3d52 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-wero .kzco-paymark-label {
          font-size: .98rem !important;
          font-weight: 950 !important;
          letter-spacing: -.07em !important;
          text-transform: lowercase !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-p {
          width: 1.08rem !important;
          height: 1.34rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: .14rem !important;
          background: linear-gradient(135deg, #1f4aa8, #179bd7) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          font-weight: 950 !important;
          font-size: .82rem !important;
          transform: skew(-6deg) !important;
          flex: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-paypal .kzco-paymark-label {
          color: #173a87 !important;
          -webkit-text-fill-color: #173a87 !important;
          font-size: .82rem !important;
          font-weight: 900 !important;
          letter-spacing: -.045em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-cash {
          color: #242320 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-cash svg {
          width: 1.62rem !important;
          height: 1.62rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-text .kzco-paymark-label {
          font-size: .70rem !important;
          font-weight: 900 !important;
          letter-spacing: .05em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-method-tile {
          background: rgba(8, 6, 4, .44) !important;
          border-color: rgba(198, 164, 93, .28) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-method-tile[data-kzco-active="1"] {
          border-color: rgba(236, 138, 130, .78) !important;
          background: rgba(184, 93, 89, .14) !important;
          box-shadow: inset 0 -2px 0 rgba(236, 138, 130, .72) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-method-tile .kzco-paymark,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-card,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-cash,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-wero .kzco-paymark-label,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-text .kzco-paymark-label {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-symbol,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-apple .kzco-paymark-label {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-google .kzco-paymark-label {
          color: rgba(246, 232, 200, .74) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .74) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-paypal .kzco-paymark-label {
          color: #8fc6ff !important;
          -webkit-text-fill-color: #8fc6ff !important;
        }



        /* PMD_KAZEN_PAYMENT_ICONS_PREMIUM_V4_FINAL
           Final compact premium payment marks. Fixes old v1 PayPal span override.
           No image requests. Works in light and dark mode.
        */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .55rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile {
          height: 3.05rem !important;
          min-height: 3.05rem !important;
          padding: .25rem .4rem !important;
          background: rgba(255, 255, 255, .34) !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          box-shadow: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile[data-kzco-active="1"] {
          border-color: rgba(184, 93, 89, .82) !important;
          background: rgba(184, 93, 89, .055) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .78) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile .kzco-paymark {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: 100% !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .32rem !important;
          color: #252321 !important;
          -webkit-text-fill-color: currentColor !important;
          line-height: 1 !important;
          transform: none !important;
          overflow: hidden !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile .kzco-paymark svg {
          width: 1.18rem !important;
          height: 1.18rem !important;
          min-width: 1.18rem !important;
          display: block !important;
          fill: none !important;
          stroke: currentColor !important;
          stroke-width: 1.75 !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
          flex: 0 0 auto !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile .kzco-paymark-label {
          display: inline !important;
          width: auto !important;
          height: auto !important;
          min-width: 0 !important;
          max-width: calc(100% - 1.45rem) !important;
          padding: 0 !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          transform: none !important;
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          font-size: .78rem !important;
          font-weight: 850 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          line-height: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-symbol {
          width: auto !important;
          height: auto !important;
          background: transparent !important;
          border-radius: 0 !important;
          transform: translateY(-.03rem) !important;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Symbol", sans-serif !important;
          font-size: 1.05rem !important;
          font-weight: 800 !important;
          color: #050505 !important;
          -webkit-text-fill-color: #050505 !important;
          line-height: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-apple .kzco-paymark-label {
          font-size: .88rem !important;
          font-weight: 900 !important;
          letter-spacing: -.04em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-g {
          width: 1.02rem !important;
          height: 1.02rem !important;
          min-width: 1.02rem !important;
          padding: 0 !important;
          border-radius: 50% !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex: 0 0 auto !important;
          background:
            conic-gradient(from -35deg, #4285f4 0 25%, #34a853 0 45%, #fbbc05 0 68%, #ea4335 0 83%, #4285f4 0 100%) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          font-size: .68rem !important;
          font-weight: 950 !important;
          letter-spacing: -.12em !important;
          line-height: 1 !important;
          transform: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-google .kzco-paymark-label {
          color: #69707d !important;
          -webkit-text-fill-color: #69707d !important;
          font-size: .86rem !important;
          font-weight: 800 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-card {
          color: #2f3d52 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-card .kzco-paymark-label {
          font-size: .78rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-wero .kzco-paymark-label {
          max-width: 100% !important;
          font-size: .9rem !important;
          font-weight: 950 !important;
          letter-spacing: -.065em !important;
          text-transform: lowercase !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile .kzco-paymark-paypal {
          gap: .28rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile .kzco-paymark-paypal .kzco-paymark-p {
          width: 1.02rem !important;
          height: 1.25rem !important;
          min-width: 1.02rem !important;
          padding: 0 !important;
          margin: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          border-radius: .13rem !important;
          background: linear-gradient(135deg, #1f4aa8, #179bd7) !important;
          box-shadow: none !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
          font-size: .78rem !important;
          line-height: 1 !important;
          letter-spacing: -.05em !important;
          transform: skew(-6deg) !important;
          flex: 0 0 auto !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile .kzco-paymark-paypal .kzco-paymark-label {
          width: auto !important;
          height: auto !important;
          min-width: 0 !important;
          max-width: 3.2rem !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          transform: none !important;
          color: #173a87 !important;
          -webkit-text-fill-color: #173a87 !important;
          font-size: .78rem !important;
          font-weight: 900 !important;
          letter-spacing: -.045em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-cash {
          color: #242320 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-cash svg {
          width: 1.35rem !important;
          height: 1.35rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-text .kzco-paymark-label {
          max-width: 100% !important;
          font-size: .66rem !important;
          font-weight: 900 !important;
          letter-spacing: .045em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-method-tile {
          background: rgba(8, 6, 4, .44) !important;
          border-color: rgba(198, 164, 93, .28) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-method-tile[data-kzco-active="1"] {
          border-color: rgba(236, 138, 130, .78) !important;
          background: rgba(184, 93, 89, .14) !important;
          box-shadow: inset 0 -2px 0 rgba(236, 138, 130, .72) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-method-tile .kzco-paymark,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-card,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-cash,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-wero .kzco-paymark-label,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-text .kzco-paymark-label {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-symbol,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-apple .kzco-paymark-label {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-google .kzco-paymark-label {
          color: rgba(246, 232, 200, .74) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .74) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-paymark-paypal .kzco-paymark-label {
          color: #8fc6ff !important;
          -webkit-text-fill-color: #8fc6ff !important;
        }



        /* PMD_KAZEN_CHECKOUT_TYPOGRAPHY_SYSTEM_V1
           Checkout typography scale. Keeps every checkout card consistent.
           Main modal title = large; section titles/buttons = uppercase;
           labels/body/details = readable; numbers/prices = tabular.
        */
        html body .kzco-overlay[data-kzco-root="1"],
        html body .kzco-overlay[data-kzco-root="1"] * {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head h2 {
          font-size: var(--pmd-text-modal-title, clamp(2rem, 6.6vw, 3rem)) !important;
          line-height: .96 !important;
          font-weight: 900 !important;
          letter-spacing: -.055em !important;
          text-transform: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-eyebrow,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-pill,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-chip,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-meta {
          font-size: var(--pmd-text-caption, .76rem) !important;
          line-height: 1.1 !important;
          font-weight: 800 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-section-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-summary h3,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-methods h3,
        html body .kzco-overlay[data-kzco-root="1"] h3.kzco-section-title {
          font-size: var(--pmd-text-section-title, .94rem) !important;
          line-height: 1.12 !important;
          font-weight: 900 !important;
          letter-spacing: .035em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-line span,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box span,
        html body .kzco-overlay[data-kzco-root="1"] label,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-label {
          font-size: var(--pmd-text-label, .88rem) !important;
          line-height: 1.25 !important;
          font-weight: 800 !important;
          letter-spacing: -.012em !important;
          text-transform: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-line strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-item-price,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-price,
        html body .kzco-overlay[data-kzco-root="1"] [data-kzco-money] {
          font-size: var(--pmd-text-price, 1rem) !important;
          line-height: 1.1 !important;
          font-weight: 850 !important;
          letter-spacing: -.02em !important;
          font-variant-numeric: tabular-nums !important;
          font-feature-settings: "tnum" 1, "kern" 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-item-name,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head h3,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-copy-hero p {
          font-size: var(--pmd-text-card-title, 1rem) !important;
          line-height: 1.18 !important;
          font-weight: 850 !important;
          letter-spacing: -.018em !important;
          text-transform: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] p,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-muted,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-copy,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head p,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-note {
          font-size: var(--pmd-text-body, .94rem) !important;
          line-height: 1.46 !important;
          font-weight: 450 !important;
          letter-spacing: -.01em !important;
          text-transform: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn,
        html body .kzco-overlay[data-kzco-root="1"] button[data-kzco-button],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-apply,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-submit {
          font-size: var(--pmd-text-button, .80rem) !important;
          line-height: 1.12 !important;
          font-weight: 850 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] input,
        html body .kzco-overlay[data-kzco-root="1"] textarea,
        html body .kzco-overlay[data-kzco-root="1"] select {
          font-size: .94rem !important;
          line-height: 1.35 !important;
          font-weight: 550 !important;
          letter-spacing: -.012em !important;
          text-transform: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time {
          font-variant-numeric: tabular-nums !important;
          font-feature-settings: "tnum" 1, "kern" 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time strong {
          font-size: 1.72rem !important;
          line-height: .92 !important;
          font-weight: 900 !important;
          letter-spacing: -.04em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time span,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time span {
          font-size: .82rem !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-label {
          font-size: .78rem !important;
          font-weight: 850 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
        }


        /* PMD_KAZEN_CHECKOUT_TITLE_SYSTEM_V2
           Final checkout title hierarchy across every Kazen checkout step.

           Rules:
           1. Modal/card header titles are the only BIG typography.
              They are uppercase, same weight, same tracking, same scale.
           2. Section titles are uppercase but small and consistent.
           3. Body labels are sentence case and readable.
           4. Prices/order numbers use tabular numbers and the same size.
           5. Buttons are uppercase with the same letter spacing everywhere.
        */

        html body .kzco-overlay[data-kzco-root="1"] {
          --kzco-title-size: clamp(2.05rem, 6.2vw, 2.72rem);
          --kzco-section-size: .94rem;
          --kzco-card-title-size: 1rem;
          --kzco-body-size: .92rem;
          --kzco-label-size: .88rem;
          --kzco-button-size: .80rem;
          --kzco-number-size: 1rem;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          min-height: auto !important;
          align-items: flex-start !important;
          padding-top: 1.28rem !important;
          padding-bottom: 1.02rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          display: block !important;
          min-width: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head h2,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2 {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--kzco-title-size) !important;
          line-height: .94 !important;
          font-weight: 900 !important;
          letter-spacing: -.055em !important;
          text-transform: uppercase !important;
          max-width: 15.5rem !important;
          margin: 0 !important;
          color: var(--kzco-panel-text) !important;
          -webkit-text-fill-color: var(--kzco-panel-text) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-eyebrow {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: .70rem !important;
          line-height: 1 !important;
          font-weight: 850 !important;
          letter-spacing: .16em !important;
          text-transform: uppercase !important;
          margin: 0 0 .34rem !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        /* Submitted card intentionally uses its body success layout, so keep its header minimal. */
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-title-wrap,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-title-wrap h2 {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-head {
          grid-template-columns: 1fr 48px !important;
          min-height: 4.25rem !important;
          padding-top: 1.15rem !important;
          padding-bottom: .75rem !important;
        }

        /* Paid card keeps the same header title scale, but a little wider for two words. */
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-head h2 {
          max-width: 17rem !important;
        }

        /* Section titles: every mini-heading across review/payment/split/feedback. */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-section-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-summary h3,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-methods h3,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-card h3,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head h3,
        html body .kzco-overlay[data-kzco-root="1"] h3 {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--kzco-section-size) !important;
          line-height: 1.12 !important;
          font-weight: 900 !important;
          letter-spacing: .035em !important;
          text-transform: uppercase !important;
          margin-top: 0 !important;
          color: var(--kzco-panel-text) !important;
          -webkit-text-fill-color: var(--kzco-panel-text) !important;
        }

        /* Review/feedback question is a card title, not a section label. */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head h3 {
          font-size: var(--kzco-card-title-size) !important;
          line-height: 1.15 !important;
          letter-spacing: -.018em !important;
          text-transform: none !important;
        }

        /* Food/item names and status titles. */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-item-name,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-copy-hero p,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-text-block p {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--kzco-card-title-size) !important;
          line-height: 1.16 !important;
          font-weight: 850 !important;
          letter-spacing: -.018em !important;
          text-transform: none !important;
          color: var(--kzco-panel-text) !important;
          -webkit-text-fill-color: var(--kzco-panel-text) !important;
        }

        /* Normal copy/details: never uppercase. */
        html body .kzco-overlay[data-kzco-root="1"] p,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-muted,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-copy,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head p,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-note,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-helper,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-note {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--kzco-body-size) !important;
          line-height: 1.44 !important;
          font-weight: 450 !important;
          letter-spacing: -.01em !important;
          text-transform: none !important;
        }

        /* Row labels, totals labels, form labels. */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-line span,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box span,
        html body .kzco-overlay[data-kzco-root="1"] label,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-label {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--kzco-label-size) !important;
          line-height: 1.18 !important;
          font-weight: 800 !important;
          letter-spacing: -.012em !important;
          text-transform: none !important;
          color: var(--kzco-panel-text) !important;
          -webkit-text-fill-color: var(--kzco-panel-text) !important;
        }

        /* Numbers/prices/order IDs. */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-line strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-item-price,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-price,
        html body .kzco-overlay[data-kzco-root="1"] [data-kzco-money] {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--kzco-number-size) !important;
          line-height: 1.1 !important;
          font-weight: 850 !important;
          letter-spacing: -.02em !important;
          font-variant-numeric: tabular-nums !important;
          font-feature-settings: "tnum" 1, "kern" 1 !important;
          color: var(--kzco-panel-text) !important;
          -webkit-text-fill-color: var(--kzco-panel-text) !important;
        }

        /* Buttons/tabs/chips: always uppercase and same visual rhythm. */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn,
        html body .kzco-overlay[data-kzco-root="1"] button[data-kzco-button],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-apply,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-submit,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-chip {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--kzco-button-size) !important;
          line-height: 1.08 !important;
          font-weight: 850 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        /* Inputs stay readable, never uppercase. */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] input,
        html body .kzco-overlay[data-kzco-root="1"] textarea,
        html body .kzco-overlay[data-kzco-root="1"] select {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: .94rem !important;
          line-height: 1.35 !important;
          font-weight: 550 !important;
          letter-spacing: -.012em !important;
          text-transform: none !important;
        }

        /* ETA timer is special and must match every state that uses it. */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .42rem !important;
          font-style: normal !important;
          font-variant-numeric: tabular-nums !important;
          font-feature-settings: "tnum" 1, "kern" 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time strong {
          font-size: 1.72rem !important;
          line-height: .92 !important;
          font-weight: 900 !important;
          letter-spacing: -.04em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time span,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time span {
          font-size: .82rem !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-paymark-label {
          font-size: .78rem !important;
          font-weight: 850 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
        }

        /* Mobile tightening: prevent huge header titles from feeling different per card. */
        @media (max-width: 390px) {
          html body .kzco-overlay[data-kzco-root="1"] {
            --kzco-title-size: clamp(1.92rem, 7.4vw, 2.35rem);
            --kzco-section-size: .90rem;
            --kzco-card-title-size: .96rem;
            --kzco-body-size: .88rem;
            --kzco-label-size: .84rem;
            --kzco-button-size: .76rem;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-head h2,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2 {
            max-width: 13.7rem !important;
          }

          html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-head h2 {
            max-width: 14.8rem !important;
          }
        }


        /* PMD_KAZEN_CHECKOUT_TYPOGRAPHY_DOWNSCALE_V3
           Downscale Kazen checkout typography after v2.
           Goal: same hierarchy, less oversized on waiter/note/checkout/payment/split cards.
        */
        html body .kzco-overlay[data-kzco-root="1"] {
          --kzco-title-size: clamp(1.68rem, 5.15vw, 2.22rem);
          --kzco-section-size: .88rem;
          --kzco-card-title-size: .94rem;
          --kzco-body-size: .88rem;
          --kzco-label-size: .84rem;
          --kzco-button-size: .75rem;
          --kzco-number-size: .94rem;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          padding-top: 1.12rem !important;
          padding-bottom: .88rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head h2,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2 {
          font-size: var(--kzco-title-size) !important;
          line-height: .96 !important;
          letter-spacing: -.045em !important;
          max-width: 14.2rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="paid"] .kzco-head h2 {
          max-width: 15.1rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-eyebrow {
          font-size: .66rem !important;
          letter-spacing: .15em !important;
          margin-bottom: .28rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-section-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-summary h3,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-methods h3,
        html body .kzco-overlay[data-kzco-root="1"] h3 {
          font-size: var(--kzco-section-size) !important;
          line-height: 1.12 !important;
          letter-spacing: .032em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head h3,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-item-name,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-copy-hero p,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-text-block p {
          font-size: var(--kzco-card-title-size) !important;
          line-height: 1.16 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] p,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-muted,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-copy,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-head p,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-helper,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-note {
          font-size: var(--kzco-body-size) !important;
          line-height: 1.42 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-line span,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box span,
        html body .kzco-overlay[data-kzco-root="1"] label,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-label {
          font-size: var(--kzco-label-size) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-line strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-item-price,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-price,
        html body .kzco-overlay[data-kzco-root="1"] [data-kzco-money] {
          font-size: var(--kzco-number-size) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn,
        html body .kzco-overlay[data-kzco-root="1"] button[data-kzco-button],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-apply,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-review-submit,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-chip {
          font-size: var(--kzco-button-size) !important;
          letter-spacing: .12em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] input,
        html body .kzco-overlay[data-kzco-root="1"] textarea,
        html body .kzco-overlay[data-kzco-root="1"] select {
          font-size: .88rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time strong {
          font-size: 1.48rem !important;
          letter-spacing: -.035em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time span,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-paid-time span {
          font-size: .74rem !important;
          letter-spacing: .12em !important;
        }

        @media (max-width: 390px) {
          html body .kzco-overlay[data-kzco-root="1"] {
            --kzco-title-size: clamp(1.58rem, 6.25vw, 2rem);
            --kzco-section-size: .84rem;
            --kzco-card-title-size: .90rem;
            --kzco-body-size: .84rem;
            --kzco-label-size: .80rem;
            --kzco-button-size: .72rem;
            --kzco-number-size: .90rem;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-head h2,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2 {
            max-width: 12.7rem !important;
          }
        }


        /* PMD_KAZEN_SUBMITTED_TITLE_VISIBLE_V4
           Fix submitted/order-received card title being hidden by previous title-system CSS.
           Header should show: "We received your order." and timer stays below the divider.
        */
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-title-wrap,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-panel:has(main[data-kzco-step="submitted"]) .kzco-title-wrap,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-panel:has(main[data-kzco-step="submitted"]) .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-content:has(main[data-kzco-step="submitted"]) .kzco-title-wrap,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-content:has(main[data-kzco-step="submitted"]) .kzco-title-wrap h2 {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-head,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-panel:has(main[data-kzco-step="submitted"]) .kzco-head,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-content:has(main[data-kzco-step="submitted"]) .kzco-head {
          min-height: auto !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          align-items: flex-start !important;
          padding: 1.12rem 1.32rem .92rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-head h2,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-panel:has(main[data-kzco-step="submitted"]) .kzco-head h2,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-content:has(main[data-kzco-step="submitted"]) .kzco-head h2 {
          font-size: clamp(1.62rem, 5vw, 2.08rem) !important;
          line-height: .98 !important;
          font-weight: 900 !important;
          letter-spacing: -.045em !important;
          text-transform: none !important;
          max-width: 13.4rem !important;
          margin: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] main[data-kzco-step="submitted"].kzco-body {
          padding-top: 1.18rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] main[data-kzco-step="submitted"] .kzco-status-copy-hero {
          margin-top: .15rem !important;
          margin-bottom: 1.05rem !important;
        }

        @media (max-width: 390px) {
          html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-head h2,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-panel:has(main[data-kzco-step="submitted"]) .kzco-head h2,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-content:has(main[data-kzco-step="submitted"]) .kzco-head h2 {
            font-size: clamp(1.48rem, 6vw, 1.9rem) !important;
            max-width: 12rem !important;
          }
        }


        /* PMD_KAZEN_TIP_BUTTONS_EURO_V2
           Tip buttons must always be visible: 0%, 5%, 10%.
           Clicking a preset writes the calculated EUR amount into the custom field.
        */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tip-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .55rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-tip-grid .kzco-tip-preset {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 3rem !important;
          height: 3rem !important;
          width: 100% !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          color: var(--kzco-panel-text) !important;
          -webkit-text-fill-color: var(--kzco-panel-text) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-tip-grid .kzco-tip-preset[data-kzco-active="1"] {
          border-color: rgba(184, 93, 89, .84) !important;
          background: rgba(184, 93, 89, .075) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .76) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-tip-custom-wrap {
          grid-column: 1 / -1 !important;
          display: grid !important;
          grid-template-columns: 2.35rem minmax(0, 1fr) !important;
          align-items: stretch !important;
          min-height: 3rem !important;
          border: 1px solid rgba(36, 35, 32, .20) !important;
          background: rgba(255, 255, 255, .30) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-tip-custom-wrap > span {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-right: 1px solid rgba(36, 35, 32, .16) !important;
          color: rgba(36, 35, 32, .58) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .58) !important;
          font-weight: 850 !important;
          font-size: .88rem !important;
          font-variant-numeric: tabular-nums !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-tip-custom-wrap input.kzco-field {
          border: 0 !important;
          height: 100% !important;
          min-height: 3rem !important;
          padding-left: .85rem !important;
          background: transparent !important;
          border-radius: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-tip-custom-wrap {
          border-color: rgba(198, 164, 93, .28) !important;
          background: rgba(8, 6, 4, .38) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-tip-custom-wrap > span {
          border-right-color: rgba(198, 164, 93, .22) !important;
          color: rgba(246, 232, 200, .64) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .64) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-tip-grid .kzco-tip-preset[data-kzco-active="1"] {
          border-color: rgba(236, 138, 130, .78) !important;
          background: rgba(184, 93, 89, .16) !important;
          box-shadow: inset 0 -2px 0 rgba(236, 138, 130, .72) !important;
        }

      `})]})}a.i(52549);var aA=a.i(50813),aB=a.i(21900),aC=a.i(91939),aD=a.i(13916);let aE={"--theme-surface":"#fffaf0","--theme-border":"#ded2ba","--theme-text-primary":"#343529","--theme-text-secondary":"#746f61","--theme-text-muted":"#8a826f","--theme-primary":"#747d55","--theme-accent":"#747d55","--pmd-paper-soft":"#fffaf0","--pmd-paper":"#f6efe2","--pmd-line":"#ded2ba","--pmd-ink":"#343529","--pmd-muted":"#746f61","--pmd-primary":"#747d55","--pmd-primary-dark":"#5f6746","--pmd-accent":"#b88940",backgroundColor:"#fffaf0",backgroundImage:"linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0)",backgroundSize:"100% 100%, 16px 16px",backgroundRepeat:"no-repeat, repeat",border:"1px solid #ded2ba",color:"#343529",boxShadow:"0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72)"},aF={backgroundColor:"#fffaf0",color:"#343529",borderBottom:"1px solid rgba(222,210,186,.86)",boxShadow:"inset 0 1px 0 rgba(255,255,255,.72)"},aG={backgroundColor:"#f6efe2",backgroundImage:"radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0)",backgroundSize:"16px 16px",color:"#343529"},aH={background:"#747d55",backgroundColor:"#747d55",color:"#fffaf0",WebkitTextFillColor:"#fffaf0",textShadow:"none",border:"1px solid #747d55",boxShadow:"0 12px 24px rgba(95,103,70,.2)"};function aI(){return(0,d.jsx)("style",{"data-pmd-organic-checkout-component-style":"1",dangerouslySetInnerHTML:{__html:`
          [data-pmd-checkout-visual-theme="organic_botanical_paper"].pmd-checkout-modal {
            background-color: #fffaf0 !important;
            background-image:
              linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,0)),
              radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0) !important;
            background-size: 100% 100%, 16px 16px !important;
            background-repeat: no-repeat, repeat !important;
            border: 1px solid #ded2ba !important;
            color: #343529 !important;
            box-shadow: 0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72) !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-modal-title {
            color: #343529 !important;
            letter-spacing: .015em;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-body {
            background-color: #f6efe2 !important;
            background-image: radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0) !important;
            background-size: 16px 16px !important;
            color: #343529 !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-flat-section,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-item-card,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-total-card,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-payment-card,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-meta-row,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .surface-sub {
            background-color: #fffaf0 !important;
            background-image: radial-gradient(circle at 1px 1px, rgba(116,125,85,.055) 1px, transparent 0) !important;
            background-size: 16px 16px !important;
            border-color: #ded2ba !important;
            color: #343529 !important;
            box-shadow: 0 10px 24px rgba(60,53,41,.06) !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-total-card::before,
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-flat-section::before {
            content: "";
            display: block;
            width: 44px;
            height: 1px;
            margin: 0 auto .55rem;
            background: linear-gradient(90deg, transparent, rgba(116,125,85,.45), transparent);
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-checkout-item-row {
            color: #343529 !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] button[data-pmd-organic-action="primary"],
          [data-pmd-checkout-visual-theme="organic_botanical_paper"] button:not([data-pmd-show-bill-toggle])[style*="#062F2A"] {
            background: #747d55 !important;
            background-color: #747d55 !important;
            border-color: #747d55 !important;
            color: #fffaf0 !important;
            -webkit-text-fill-color: #fffaf0 !important;
          }

          [data-pmd-checkout-visual-theme="organic_botanical_paper"] .pmd-split-slider {
            accent-color: #747d55 !important;
          }
        `}})}let aJ=["split","split-items","split-shares","split-review"];function aK(a){return aJ.includes(a)}function aL(){return"submitted"}var aM=a.i(37556),aN=a.i(40680);let aO=e.useEffect;var aP=a.i(11351),aQ=a.i(70770),aR=e,aS=a.i(53955);function aT(a,b){if("function"==typeof a)return a(b);null!=a&&(a.current=b)}class aU extends aR.Component{getSnapshotBeforeUpdate(a){let b=this.props.childRef.current;if((0,aQ.isHTMLElement)(b)&&a.isPresent&&!this.props.isPresent&&!1!==this.props.pop){let a=b.offsetParent,c=(0,aQ.isHTMLElement)(a)&&a.offsetWidth||0,d=(0,aQ.isHTMLElement)(a)&&a.offsetHeight||0,e=getComputedStyle(b),f=this.props.sizeRef.current;f.height=parseFloat(e.height),f.width=parseFloat(e.width),f.top=b.offsetTop,f.left=b.offsetLeft,f.right=c-f.width-f.left,f.bottom=d-f.height-f.top}return null}componentDidUpdate(){}render(){return this.props.children}}function aV({children:a,isPresent:b,anchorX:c,anchorY:f,root:g,pop:h}){let i=(0,aR.useId)(),j=(0,aR.useRef)(null),k=(0,aR.useRef)({width:0,height:0,top:0,left:0,right:0,bottom:0}),{nonce:l}=(0,aR.useContext)(aS.MotionConfigContext),m=function(...a){return e.useCallback(function(...a){return b=>{let c=!1,d=a.map(a=>{let d=aT(a,b);return c||"function"!=typeof d||(c=!0),d});if(c)return()=>{for(let b=0;b<d.length;b++){let c=d[b];"function"==typeof c?c():aT(a[b],null)}}}}(...a),a)}(j,a.props?.ref??a?.ref);return(0,aR.useInsertionEffect)(()=>{let{width:a,height:d,top:e,left:m,right:n,bottom:o}=k.current;if(b||!1===h||!j.current||!a||!d)return;let p="left"===c?`left: ${m}`:`right: ${n}`,q="bottom"===f?`bottom: ${o}`:`top: ${e}`;j.current.dataset.motionPopId=i;let r=document.createElement("style");l&&(r.nonce=l);let s=g??document.head;return s.appendChild(r),r.sheet&&r.sheet.insertRule(`
          [data-motion-pop-id="${i}"] {
            position: absolute !important;
            width: ${a}px !important;
            height: ${d}px !important;
            ${p}px !important;
            ${q}px !important;
          }
        `),()=>{j.current?.removeAttribute("data-motion-pop-id"),s.contains(r)&&s.removeChild(r)}},[b]),(0,d.jsx)(aU,{isPresent:b,childRef:j,sizeRef:k,pop:h,children:!1===h?a:aR.cloneElement(a,{ref:m})})}let aW=({children:a,initial:b,isPresent:c,onExitComplete:f,custom:g,presenceAffectsLayout:h,mode:i,anchorX:j,anchorY:k,root:l})=>{let m=(0,aN.useConstant)(aX),n=(0,e.useId)(),o=!0,p=(0,e.useMemo)(()=>(o=!1,{id:n,initial:b,isPresent:c,custom:g,onExitComplete:a=>{for(let b of(m.set(a,!0),m.values()))if(!b)return;f&&f()},register:a=>(m.set(a,!1),()=>m.delete(a))}),[c,m,f]);return h&&o&&(p={...p}),(0,e.useMemo)(()=>{m.forEach((a,b)=>m.set(b,!1))},[c]),e.useEffect(()=>{c||m.size||!f||f()},[c]),a=(0,d.jsx)(aV,{pop:"popLayout"===i,isPresent:c,anchorX:j,anchorY:k,root:l,children:a}),(0,d.jsx)(aP.PresenceContext.Provider,{value:p,children:a})};function aX(){return new Map}var aY=a.i(11518);let aZ=a=>a.key||"";function a$(a){let b=[];return e.Children.forEach(a,a=>{(0,e.isValidElement)(a)&&b.push(a)}),b}let a_=({children:a,custom:b,initial:c=!0,onExitComplete:f,presenceAffectsLayout:g=!0,mode:h="sync",propagate:i=!1,anchorX:j="left",anchorY:k="top",root:l})=>{let[m,n]=(0,aY.usePresence)(i),o=(0,e.useMemo)(()=>a$(a),[a]),p=i&&!m?[]:o.map(aZ),q=(0,e.useRef)(!0),r=(0,e.useRef)(o),s=(0,aN.useConstant)(()=>new Map),t=(0,e.useRef)(new Set),[u,v]=(0,e.useState)(o),[w,x]=(0,e.useState)(o);aO(()=>{q.current=!1,r.current=o;for(let a=0;a<w.length;a++){let b=aZ(w[a]);p.includes(b)?(s.delete(b),t.current.delete(b)):!0!==s.get(b)&&s.set(b,!1)}},[w,p.length,p.join("-")]);let y=[];if(o!==u){let a=[...o];for(let b=0;b<w.length;b++){let c=w[b],d=aZ(c);p.includes(d)||(a.splice(b,0,c),y.push(c))}return"wait"===h&&y.length&&(a=y),x(a$(a)),v(o),null}let{forceRender:z}=(0,e.useContext)(aM.LayoutGroupContext);return(0,d.jsx)(d.Fragment,{children:w.map(a=>{let e=aZ(a),u=(!i||!!m)&&(o===w||p.includes(e));return(0,d.jsx)(aW,{isPresent:u,initial:(!q.current||!!c)&&void 0,custom:b,presenceAffectsLayout:g,mode:h,root:l,onExitComplete:u?void 0:()=>{if(t.current.has(e)||!s.has(e))return;t.current.add(e),s.set(e,!0);let a=!0;s.forEach(b=>{b||(a=!1)}),a&&(z?.(),x(r.current),i&&n?.(),f&&f())},anchorX:j,anchorY:k,children:a},e)})})};var a0=a.i(34376);function a1({cartItem:a,addToCart:b,t:c,onOptionsChange:f,optionKey:g,unitLabel:h}){let i,j,k,[l,m]=(0,e.useState)(!1),[n,o]=(0,e.useState)({}),p=a.item.options||[],q=g||String(a.item.id),r=a.item.nameKey?c(a.item.nameKey):a.item.name,s=h||`${a.quantity}x ${r}`,u=(a,b)=>{let c={...n,[a]:b};o(c),f&&f(q,c)};return(0,d.jsxs)("div",{className:"pmd-checkout-item-card border border-paydine-champagne/20 rounded-2xl overflow-hidden",children:[(0,d.jsxs)("div",{className:"pmd-checkout-item-row flex justify-between items-center text-xs p-2",children:[(0,d.jsx)("span",{className:"text-paydine-elegant-gray min-w-[120px]",children:s}),(0,d.jsxs)("div",{className:"flex items-center gap-2",children:[(0,d.jsx)("button",{onClick:c=>{c.stopPropagation(),b(a.item,-1)},className:"quantity-btn pmd-v2-action-circle w-5 h-5 flex items-center justify-center transition-colors",children:(0,d.jsx)("span",{"data-pmd-force-qty-symbol":"minus","aria-hidden":"true",style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",fontWeight:900,fontSize:"22px",lineHeight:1,display:"inline-flex",alignItems:"center",justifyContent:"center",transform:"translateY(-1px)"},children:"−"})}),(0,d.jsx)("span",{className:"pmd-checkout-item-price text-paydine-elegant-gray font-semibold min-w-[48px] text-center",children:M((i=t(),k=(j=a=>i.enabled&&i.percentage>0&&0===i.menuPrice?a*(1+i.percentage/100):a)(a.item.price||0)*a.quantity,Object.values(n).forEach(b=>{p.forEach(c=>{let d=c.values.find(a=>a.id.toString()===b);d&&(k+=j(d.price)*a.quantity)})}),k))}),(0,d.jsx)("button",{onClick:c=>{c.stopPropagation(),b(a.item,1)},className:"quantity-btn pmd-v2-action-circle w-5 h-5 flex items-center justify-center transition-colors",children:(0,d.jsx)("span",{"data-pmd-force-qty-symbol":"plus","aria-hidden":"true",style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",fontWeight:900,fontSize:"22px",lineHeight:1,display:"inline-flex",alignItems:"center",justifyContent:"center",transform:"translateY(-1px)"},children:"+"})})]})]}),p.length>0&&(0,d.jsxs)("div",{className:"border-t border-paydine-champagne/10",children:[(0,d.jsxs)("button",{type:"button","data-pmd-customize-options-btn":"1",onClick:()=>m(!l),className:"w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",style:{background:"rgba(255, 255, 255, 0.62)",backgroundColor:"rgba(255, 255, 255, 0.62)",borderColor:"rgba(216, 185, 130, 0.45)",color:"#374151",WebkitTextFillColor:"#374151",boxShadow:"none",textShadow:"none"},children:[(0,d.jsx)("span",{children:"Customize Options"}),(0,d.jsx)(a0.ChevronDown,{className:`w-3 h-3 transition-transform duration-200 ${l?"rotate-180":""}`,style:{color:"#374151",stroke:"#374151"}})]}),l&&(0,d.jsx)(aA.motion.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},transition:{duration:.28},className:"overflow-hidden",children:(0,d.jsx)("div",{className:"p-2 space-y-3 bg-paydine-rose-beige/5",children:p.map(a=>(0,d.jsxs)("div",{children:[(0,d.jsxs)("h4",{className:"text-xs font-medium text-paydine-elegant-gray mb-1",children:[a.name," ",a.required&&"*"]}),(0,d.jsx)("div",{className:"space-y-1",children:a.values.map(b=>{var c;let e;return(0,d.jsxs)("label",{className:"flex items-center gap-2 text-xs cursor-pointer",children:[(0,d.jsx)("input",{type:"radio"===a.display_type?"radio":"checkbox",name:`${a.name}-${q}`,value:b.id.toString(),checked:n[a.name]===b.id.toString(),onChange:()=>{if("radio"===a.display_type)u(a.name,b.id.toString());else{let c=n[a.name];u(a.name,c===b.id.toString()?"":b.id.toString())}},className:"w-3 h-3 pmd-customer-price"}),(0,d.jsx)("span",{className:"text-paydine-elegant-gray",children:b.value}),b.price>0&&(e=t(),(0,d.jsxs)("span",{className:"pmd-customer-price font-medium",children:["+",M((c=b.price,e.enabled&&e.percentage>0&&0===e.menuPrice?c*(1+e.percentage/100):c))]}))]},b.id)})})]},a.id))})})]})]})}function a2(a){let{checkoutStep:b,tableDraft:c,isSubmittedTableDraftForStatus:e,hasPersonalItems:f,preferPersonalReview:g,submitDraftLoading:h,draftLoading:i,handleSubmitTableDraft:j,onClose:k,setSubmittedSnapshot:l,tableInfo:m,taxSettings:n,setCheckoutStep:o,modalSecondaryBtn:p,orderContextLabel:q,orderContextValue:r,isTableContext:s,personalReviewItems:t,addToCart:u,t:v,handleOptionsChange:w,vatLabels:z,subtotal:A,taxAmount:B,tipAmount:C,appliedCoupon:E,couponDiscount:F,finalTotal:G,isLoading:H,allItems:I,handleConfirmMyItems:J,modalPrimaryBtn:L,modalPrimaryBtnStyle:N}=a;return(0,d.jsx)(d.Fragment,{children:(0,d.jsxs)(a_,{mode:"wait",initial:!1,children:["review"===b&&c?.success&&c.status&&"empty"!==c.status&&!e&&!f&&!g&&(0,d.jsxs)(aA.motion.div,{layout:!0,initial:{opacity:1},animate:{opacity:1},exit:{opacity:0},transition:{duration:.16,ease:"easeOut"},className:"surface-sub rounded-2xl p-4 space-y-4",style:{background:"var(--theme-surface)",color:"var(--theme-text-primary)"},children:[(0,d.jsx)("div",{className:"pmd-checkout-list-scroll space-y-3 max-h-64 overflow-y-auto pr-1",children:(c.groups&&c.groups.length>0?c.groups:[{guest_session_id:null,items:c.items||[],subtotal:c.totals?.subtotal||0}]).map((a,b)=>(0,d.jsxs)("div",{className:"rounded-2xl border p-3",style:{borderColor:"var(--theme-border)"},children:[(c.groups||[]).length>1&&(0,d.jsxs)("div",{className:"mb-2 flex items-center justify-between text-xs font-semibold",children:[(0,d.jsx)("span",{children:a.guest_session_id?`Guest ${b+1}`:"Table"}),(0,d.jsx)("span",{children:M(Number(a.subtotal||0))})]}),(0,d.jsx)("div",{className:"space-y-1",children:D(a.items||[]).map((a,b)=>(0,d.jsxs)(aA.motion.div,{layout:!0,initial:{opacity:0,y:4},animate:{opacity:1,y:0},exit:{opacity:0,y:-4},transition:{duration:.16,ease:"easeOut"},className:"pmd-checkout-item-row pmd-table-order-item-row flex items-center justify-between gap-3 text-sm",children:[(0,d.jsxs)("span",{className:"truncate font-medium",children:[Number(a.quantity||1),"x ",String(a.name||`Item ${b+1}`)]}),(0,d.jsx)("span",{className:"font-semibold",children:M(Number(a.subtotal??Number(a.price||0)*Number(a.quantity||1)))})]},`${a.id||a.order_menu_id||a.menu_id||a.name}-${b}`))})]},`${a.guest_session_id||"table"}-${b}`))}),(0,d.jsxs)("div",{className:"pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs",style:{borderColor:"var(--theme-border)",background:"transparent",backgroundColor:"transparent",boxShadow:"none"},children:[(0,d.jsx)("span",{className:"muted",children:q}),(0,d.jsx)("span",{className:"font-semibold",children:r})]}),s&&(0,d.jsx)("p",{className:"pmd-checkout-helper-text text-xs muted",children:"Shared table order"}),Number(c.totals?.tax??x(c,"tax")??0)>0&&(0,d.jsxs)("div",{className:"space-y-1 border-t pt-3 text-sm",style:{borderColor:"var(--theme-border)"},children:[(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"muted",children:"Subtotal"}),(0,d.jsx)("span",{className:"font-semibold",children:M(Number(c.totals?.subtotal??x(c,"subtotal")??0))})]}),(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsxs)("span",{className:"muted",children:["VAT ",y(c,n?.percentage||0),"%"]}),(0,d.jsx)("span",{className:"font-semibold",children:M(Number(c.totals?.tax??x(c,"tax")??0))})]})]}),(0,d.jsxs)("div",{className:"flex items-center justify-between border-t pt-3 text-sm",style:{borderColor:"var(--theme-border)"},children:[(0,d.jsx)("span",{className:"font-semibold",children:"Order Total"}),(0,d.jsx)("span",{className:"text-base font-bold",children:M(Number(c.totals?.orderTotal||c.totals?.total||0))})]}),"draft"===c.status?(0,d.jsx)("div",{className:"space-y-3","data-pmd-clean-table-actions":"1",children:(0,d.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[(0,d.jsx)(aA.motion.button,{type:"button",disabled:h||i||0>=Number(c.totals?.total||0),onClick:j,whileHover:{y:h?0:-1},whileTap:{scale:h?1:.985},"aria-label":"Send order to kitchen","data-pmd-clean-send-kitchen":"1",className:"min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70",style:{background:"#062F2A",backgroundColor:"#062F2A",backgroundImage:"none",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",border:"1px solid #062F2A",boxShadow:"0 10px 22px rgba(0, 0, 0, 0.24)",textShadow:"none"},children:(0,d.jsx)("span",{style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",textShadow:"none",whiteSpace:"nowrap"},children:h?"Sending...":"Send to kitchen"})}),(0,d.jsx)(aA.motion.button,{type:"button",onClick:k,whileHover:{y:-1},whileTap:{scale:.985},"data-pmd-clean-continue-ordering":"1",className:"min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent",children:"Continue ordering"})]})}):c.order_id?(0,d.jsx)("button",{type:"button",onClick:()=>{l(K(c,m,n?.percentage||0)),o(aL())},className:p,children:"View order status"}):null]},"table-order-draft"),"review"===b&&f&&(0,d.jsxs)(aA.motion.div,{initial:{opacity:1},animate:{opacity:1},exit:{opacity:0},transition:{duration:0},className:"space-y-4",children:[(0,d.jsx)("div",{className:"pmd-checkout-flat-section rounded-2xl p-3 space-y-3",children:(0,d.jsx)("div",{className:"pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1",children:t.map((a,b)=>(0,d.jsx)(a1,{cartItem:a,optionKey:String(a.__pmdOptionKey||a.item.id),unitLabel:a.__pmdUnitLabel,addToCart:u,t:v,onOptionsChange:w},String(a.__pmdOptionKey||`${a.item.id}-${b}`)))})}),"review"===b&&f&&(0,d.jsxs)("div",{className:"pmd-checkout-flat-section rounded-2xl p-3 space-y-1",children:[(0,d.jsxs)("div",{className:"flex justify-between text-xs",children:[(0,d.jsx)("span",{children:z.subtotal}),(0,d.jsx)("span",{className:"font-semibold",children:M(A)})]}),n.enabled&&n.percentage>0&&1===n.menuPrice&&(0,d.jsxs)("div",{className:"flex justify-between text-xs",children:[(0,d.jsxs)("span",{children:[v("tax")," ",n.percentage,"%"]}),(0,d.jsx)("span",{className:"font-semibold",children:M(B)})]}),C>0&&(0,d.jsxs)("div",{className:"flex justify-between text-xs",children:[(0,d.jsx)("span",{children:v("tip")}),(0,d.jsx)("span",{className:"font-semibold",children:M(C)})]}),E&&F>0&&(0,d.jsxs)("div",{className:"flex justify-between text-xs text-green-600 dark:text-green-400",children:[(0,d.jsxs)("span",{children:[v("coupon")||"Coupon"," (",E.code,")"]}),(0,d.jsxs)("span",{className:"font-semibold",children:["-",M(F)]})]}),(0,d.jsxs)("div",{className:"flex justify-between items-center divider pt-2 mt-2",children:[(0,d.jsx)("span",{className:"text-base",children:z.total}),(0,d.jsx)("span",{className:"text-base font-bold",children:M(G)})]})]}),"review"===b&&f&&(0,d.jsxs)("div",{className:"mt-3 space-y-3",children:[(0,d.jsxs)("div",{className:"pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs",style:{borderColor:"var(--theme-border)",background:"transparent",backgroundColor:"transparent",boxShadow:"none"},children:[(0,d.jsx)("span",{className:"muted",children:q}),(0,d.jsx)("span",{className:"font-semibold",children:r})]}),(0,d.jsxs)("div",{className:"grid grid-cols-1 gap-3 sm:grid-cols-2",children:[(0,d.jsx)("button",{type:"button","data-pmd-review-submit":"true","aria-label":"Confirm items",disabled:H||0===I.length,onClick:J,className:L,style:N,children:H?"Confirming...":"Confirm"}),(0,d.jsx)("button",{type:"button","data-pmd-review-continue":"true",onClick:k,className:p,children:"Continue ordering"})]})]})]},"personal-cart-review")]})})}var a3=a.i(58317),a4=a.i(59996);function a5({as:a="section",variant:b="default",className:c,...e}){return(0,d.jsx)(a,{"data-pmd-themed-card":b,className:(0,aD.cn)("pmd-themed-card",c),...e})}let a6=e.default.forwardRef(({variant:a="secondary",fullWidth:b=!1,className:c,type:e="button",...f},g)=>(0,d.jsx)("button",{ref:g,type:e,"data-pmd-themed-button":a,className:(0,aD.cn)("pmd-themed-button",b&&"pmd-themed-button-full",c),...f}));a6.displayName="ThemedButton";let a7=e.default.forwardRef(({fieldSize:a="md",className:b,...c},e)=>(0,d.jsx)("input",{ref:e,"data-pmd-themed-input":a,className:(0,aD.cn)("pmd-themed-input h-12 w-full rounded-xl border bg-transparent px-4 outline-none",b),...c}));a7.displayName="ThemedInput";let a8=e.default.forwardRef(({selected:a=!1,label:b,children:c,className:e,type:f="button",...g},h)=>(0,d.jsx)("button",{ref:h,type:f,"aria-label":b,"aria-pressed":a,"data-pmd-payment-method-tile":"1","data-pmd-selected":a?"1":"0",className:(0,aD.cn)("pmd-payment-method-tile inline-flex h-14 w-20 items-center justify-center rounded-xl border p-2",e),...g,children:c}));function a9({variant:a="default",className:b,...c}){return(0,d.jsx)(a5,{as:"div",variant:a,"data-pmd-checkout-step-card":"1",className:(0,aD.cn)("pmd-checkout-step-card rounded-2xl p-3",b),...c})}function ba({className:a,...b}){return(0,d.jsx)(a5,{as:"div",variant:"subtle","data-pmd-checkout-summary-card":"1",className:(0,aD.cn)("pmd-checkout-summary-card rounded-2xl p-3",a),...b})}function bb({className:a,...b}){return(0,d.jsx)(a5,{as:"div",variant:"status","data-pmd-order-status-card-shell":"1",className:(0,aD.cn)("pmd-order-status-card rounded-2xl p-3",a),...b})}function bc({className:a,...b}){return(0,d.jsx)(a9,{variant:"subtle","data-pmd-split-bill-panel":"1",className:(0,aD.cn)("pmd-split-bill-panel space-y-3",a),...b})}a8.displayName="PaymentMethodTile";let bd=e.default.forwardRef(({selected:a=!1,className:b,type:c="button",...e},f)=>(0,d.jsx)("button",{ref:f,type:c,"data-pmd-split-method-button":"1","data-pmd-selected":a?"1":"0",className:(0,aD.cn)("pmd-split-method-button inline-flex items-center justify-center border px-3 py-1.5 text-xs font-semibold",b),...e}));function be({className:a,...b}){return(0,d.jsx)("div",{"data-pmd-tip-coupon-panel":"1",className:(0,aD.cn)("pmd-tip-coupon-panel space-y-2",a),...b})}function bf({className:a,...b}){return(0,d.jsx)(a9,{variant:"default","data-pmd-payment-card-frame":"1",className:(0,aD.cn)("pmd-payment-card-frame space-y-3",a),...b})}function bg({tone:a="default",className:b,...c}){return(0,d.jsx)("div",{"data-pmd-checkout-icon-frame":a,className:(0,aD.cn)("pmd-checkout-theme-icon inline-flex h-10 w-10 shrink-0 items-center justify-center",b),...c})}function bh(a){let{checkoutStep:b,splitGrandTotal:c,splitMethod:e,chooseSplitMethod:f,splitGuestCount:g,suggestedSplitGuestCount:h,removeSplitGuest:i,addSplitGuest:j,splitGuestProfiles:k,equalSplitPeople:l,unassignedSplitItems:m,splitSourceItems:n,itemAssignments:o,setItemAssignments:p,splitGuestNames:q,sharePercents:r,setSharePercents:s,getSplitGuestAvatar:t,sharePercentTotal:u,canConfirmSplitMethod:v,goToSplitReview:w,activeSplitPeople:x,selectedSplitPersonId:y,setCheckoutStep:z,setSelectedSplitPersonId:A,toast:B,modalSecondaryBtn:C}=a,D=Array.isArray(x)?x.filter(a=>"paid"===String(a?.status||"").toLowerCase()).length:0,E=Array.isArray(x)&&x.length>0?x.length:Number(g||0),F=E>0?Math.min(100,Math.max(0,Math.round(D/E*100))):0;return(0,d.jsx)(d.Fragment,{children:aK(b)&&(0,d.jsxs)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-4",children:[(0,d.jsxs)(bc,{className:"pmd-checkout-flat-section rounded-3xl",children:[(0,d.jsx)("div",{className:"flex items-center justify-between gap-3",children:(0,d.jsxs)("p",{className:"text-xs muted",children:["Share ",M(c)," your way."]})}),(0,d.jsx)("div",{className:"grid grid-cols-3 gap-1.5",children:[["equal","Split equally"],["items","By order items"],["shares","By shares"]].map(([a,b])=>(0,d.jsx)("button",{"data-pmd-split-method-real":a,"data-pmd-active":e===a?"1":"0","data-pmd-split-method-polished":"1",type:"button",onClick:()=>f(a),className:(0,aD.cn)("group rounded-full border px-2 py-1.5 text-[11px] font-semibold transition-colors duration-150 focus:outline-none",e===a?"text-white":""),style:{boxShadow:"none",outline:"none"},children:(0,d.jsx)("span",{"data-pmd-split-label":"1",className:"inline-block transition-transform duration-150 ease-out",style:{willChange:"transform"},children:"By order items"===b?(0,d.jsxs)(d.Fragment,{children:["By order",(0,d.jsx)("br",{}),"items"]}):b})},a))})]}),"split-review"!==b&&(0,d.jsxs)("div",{className:"pmd-checkout-flat-section rounded-3xl p-3 space-y-3",children:[(0,d.jsx)("div",{className:"flex flex-wrap items-center justify-between gap-2",children:(0,d.jsx)("div",{className:"flex min-w-0 flex-1 items-start justify-between gap-3",children:(0,d.jsxs)("div",{className:"min-w-0",children:[(0,d.jsx)("span",{className:"text-sm font-semibold",children:"People"}),(0,d.jsxs)("div",{className:"mt-1 flex flex-wrap items-center gap-2",children:[(0,d.jsxs)("p",{className:"text-[11px] muted",children:["Split across ",g," guests",h>2?` \xb7 ${h} detected`:"","."]}),(0,d.jsxs)("div",{"data-pmd-split-guest-stepper":"1",className:"inline-flex shrink-0 items-center gap-1 rounded-full",children:[(0,d.jsx)("button",{type:"button","data-pmd-split-guest-count-control":"remove","aria-label":"Remove guest",disabled:g<=2,onClick:i,className:"inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35",style:{background:"#062F2A",color:"#FFFFFF"},children:(0,d.jsx)(a3.Minus,{className:"h-3.5 w-3.5",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}})}),(0,d.jsx)("span",{className:"min-w-5 text-center text-sm font-semibold",style:{color:"var(--theme-text-primary)"},"aria-label":`${g} guests`,children:g}),(0,d.jsx)("button",{type:"button","data-pmd-split-guest-count-control":"add","aria-label":"Add guest",disabled:g>=10,onClick:j,className:"inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35",style:{background:"#062F2A",color:"#FFFFFF"},children:(0,d.jsx)(a4.Plus,{className:"h-3.5 w-3.5",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}})})]})]})]})})}),(0,d.jsx)("div",{className:"flex gap-1.5 overflow-x-auto pb-1",children:k.map((a,b)=>(0,d.jsxs)("span",{className:"inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold",style:{borderColor:"color-mix(in srgb, #b88940 32%, var(--theme-border) 68%)",background:"color-mix(in srgb, #b88940 9%, var(--theme-surface) 91%)",color:"#062F2A"},children:[(0,d.jsx)("span",{className:"inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]",style:{background:"color-mix(in srgb, #b88940 24%, var(--theme-surface) 76%)"},children:a.avatar}),a.name]},`${a.name}-${b}`))}),"equal"===e&&(0,d.jsxs)("div",{className:"space-y-2",children:[l.map((a,b)=>(0,d.jsxs)("div",{className:"flex items-center justify-between rounded-2xl border p-3",style:{borderColor:"var(--theme-border)",background:"var(--theme-surface)"},children:[(0,d.jsxs)("div",{className:"flex min-w-0 items-center gap-2",children:[(0,d.jsx)("span",{className:"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",style:{background:"color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)",color:"#062F2A",border:"1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)"},children:a.avatar}),(0,d.jsxs)("span",{className:"truncate text-sm font-medium",children:[a.name,0===b?" (rounding)":""]})]}),(0,d.jsx)("span",{className:"shrink-0 font-semibold",children:M(a.total)})]},a.id)),(0,d.jsx)("p",{className:"rounded-full px-3 py-2 text-[11px] muted",style:{background:"color-mix(in srgb, #b88940 12%, var(--theme-surface) 88%)"},children:"Odd cents go to the first payer so totals match exactly."})]}),"items"===e&&(0,d.jsxs)("div",{className:"space-y-3",children:[(0,d.jsxs)("div",{className:"flex items-center justify-between text-xs",children:[(0,d.jsx)("span",{className:"muted",children:"Tap items to assign guests."}),(0,d.jsxs)("span",{className:(0,aD.cn)("rounded-full px-2 py-1 font-semibold",m>0?"text-red-700":""),style:{background:m>0?"#FEE2E2":"color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)"},children:[m," unassigned"]})]}),(0,d.jsx)("div",{className:"space-y-2 max-h-64 overflow-y-auto",children:n.map(a=>{let b=o[a.key],c=null==b?"Unassigned":q[b];return(0,d.jsxs)("button",{type:"button",className:"flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left shadow-sm",style:{border:"1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)",background:"var(--theme-surface)"},onClick:()=>p(c=>({...c,[a.key]:null==b?0:b>=g-1?null:b+1})),children:[(0,d.jsx)("span",{className:"truncate text-sm font-medium",children:a.name}),(0,d.jsxs)("span",{className:"shrink-0 text-right text-xs",children:[(0,d.jsx)("span",{className:"font-semibold",children:M(a.amount)}),(0,d.jsx)("br",{}),(0,d.jsx)("span",{className:null==b?"text-red-700":"muted",children:c})]})]},a.key)})})]}),"shares"===e&&(0,d.jsxs)("div",{className:"space-y-3",children:[r.slice(0,g).map((a,b)=>(0,d.jsxs)("div",{className:"rounded-2xl p-3 shadow-sm",style:{border:"1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)",background:"var(--theme-surface)"},children:[(0,d.jsxs)("div",{className:"mb-2 flex flex-wrap items-center justify-between gap-2 text-sm",children:[(0,d.jsxs)("span",{className:"flex min-w-0 items-center gap-2 font-medium",children:[(0,d.jsx)("span",{className:"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",style:{background:"color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)",color:"#062F2A",border:"1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)"},children:t(b)}),(0,d.jsx)("span",{className:"truncate",children:q[b]})]}),(0,d.jsxs)("div",{"data-pmd-share-edit-group":"1",className:"flex shrink-0 items-center gap-1.5",children:[(0,d.jsxs)("label",{className:"sr-only",htmlFor:`share-percent-${b}`,children:["Share percentage for ",q[b]]}),(0,d.jsxs)("div",{className:"relative",children:[(0,d.jsx)("input",{id:`share-percent-${b}`,type:"number",min:0,max:100,step:1,value:Math.round(Number(a||0)),onChange:a=>{let c=Math.max(0,Math.min(100,Number(a.target.value||0)));s(a=>a.map((a,d)=>d===b?c:a))},className:"pmd-share-manual-input pmd-share-percent-input",inputMode:"decimal"}),(0,d.jsx)("span",{className:"pmd-share-input-suffix",children:"%"})]}),(0,d.jsx)("span",{className:"pmd-share-dot",children:"·"}),(0,d.jsxs)("label",{className:"sr-only",htmlFor:`share-amount-${b}`,children:["Share amount for ",q[b]]}),(0,d.jsxs)("div",{className:"relative",children:[(0,d.jsx)("span",{className:"pmd-share-input-prefix",children:"€"}),(0,d.jsx)("input",{id:`share-amount-${b}`,type:"number",min:0,max:Math.max(0,Number(c||0)),step:.01,value:(c*(Number(a||0)/100)).toFixed(2),onChange:a=>{let d=Math.max(0,Number(a.target.value||0)),e=Number(c||0)>0?Math.max(0,Math.min(100,d/Number(c||0)*100)):0;s(a=>a.map((a,c)=>c===b?Math.round(e):a))},className:"pmd-share-manual-input pmd-share-amount-input",inputMode:"decimal"})]})]})]}),(0,d.jsx)("input",{type:"range",min:"0",max:"100",step:"1",value:a,onChange:a=>s(c=>c.map((c,d)=>d===b?Number(a.target.value):c)),className:"pmd-split-slider w-full"})]},b)),(0,d.jsx)("div",{className:"flex justify-center",children:(0,d.jsx)("span",{className:(0,aD.cn)("rounded-full px-3 py-1.5 text-xs font-semibold",100===u?"":"text-red-700"),style:{background:100===u?"color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)":"#FEF2F2",border:`1px solid ${100===u?"color-mix(in srgb, #062F2A 18%, var(--theme-border) 82%)":"#FCA5A5"}`},children:100===u?"100% ready":u<100?`${100-u}% remaining`:`Over by ${u-100}%`})})]}),(0,d.jsx)(a6,{type:"button",disabled:!v,onClick:w,variant:"primary",fullWidth:!0,className:(0,aD.cn)(!v&&"cursor-not-allowed"),children:"Review split"})]}),"split-review"===b&&(0,d.jsxs)("div",{className:"space-y-3",children:[(0,d.jsxs)("div",{"data-pmd-split-progress":"1",className:"rounded-3xl border p-3 text-xs shadow-sm",style:{borderColor:"var(--theme-border)",background:"var(--theme-surface)",color:"var(--theme-text-primary)"},children:[(0,d.jsxs)("div",{className:"flex items-center justify-between gap-3",children:[(0,d.jsx)("span",{className:"font-semibold",children:"Split progress"}),(0,d.jsxs)("span",{className:"muted",children:[D," of ",E," paid"]})]}),(0,d.jsx)("div",{className:"mt-2 h-2 overflow-hidden rounded-full",style:{background:"color-mix(in srgb, var(--theme-border) 55%, transparent)"},children:(0,d.jsx)("div",{className:"h-full rounded-full",style:{width:`${F}%`,background:"#062F2A"}})}),D>0&&D<E&&(0,d.jsx)("p",{className:"mt-2 muted",children:"If one guest leaves this payment flow, the remaining balance stays visible on the table order and staff can collect it from the QR checkout."})]}),x.map(a=>(0,d.jsxs)("div",{className:"rounded-3xl p-3 space-y-2 shadow-sm",style:{border:`1px solid ${y===a.id?"#b88940":"color-mix(in srgb, var(--theme-border) 70%, transparent)"}`,background:"var(--theme-surface)"},children:[(0,d.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,d.jsxs)("div",{className:"flex min-w-0 items-center gap-2",children:[(0,d.jsx)("span",{className:"inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",style:{background:"color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)",color:"#062F2A",border:"1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)"},children:a.avatar}),(0,d.jsx)("h4",{className:"truncate font-semibold",children:a.name})]}),(0,d.jsx)("span",{className:"shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold",style:{background:"Paid"===a.status?"#DCFCE7":"color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)",color:"Paid"===a.status?"#166534":"#5A3512"},children:a.status})]}),(0,d.jsxs)("div",{className:"space-y-1 text-xs muted",children:[a.items.map((b,c)=>(0,d.jsxs)("div",{className:"flex justify-between gap-2",children:[(0,d.jsx)("span",{className:"truncate",children:b.name}),(0,d.jsx)("span",{children:M(b.amount)})]},`${a.id}-${c}`)),a.tax>0&&(0,d.jsxs)("div",{className:"flex justify-between",children:[(0,d.jsx)("span",{children:"Proportional service/tax"}),(0,d.jsx)("span",{children:M(a.tax)})]})]}),(0,d.jsxs)("div",{className:"flex items-center justify-between border-t pt-2",style:{borderColor:"var(--theme-border)"},children:[(0,d.jsx)("span",{className:"font-semibold",children:"Total"}),(0,d.jsx)("span",{className:"font-bold",children:M(a.total)})]}),y===a.id?(0,d.jsx)(a6,{type:"button",onClick:()=>z("payment"),variant:"primary",fullWidth:!0,children:"Pay my share"}):(0,d.jsx)(a6,{type:"button",onClick:()=>A(a.id),variant:"secondary",fullWidth:!0,children:"Select payer"})]},a.id)),(0,d.jsxs)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:[(0,d.jsxs)("button",{type:"button",onClick:()=>B({title:"Payment links ready",description:"Share links can be generated by the payment API when multi-device checkout is enabled."}),className:C,children:[(0,d.jsx)(Z,{className:"h-4 w-4"})," Send payment link to others"]}),(0,d.jsxs)("button",{type:"button",onClick:()=>B({title:"QR share",description:"Ask guests to scan the table QR to pay their own share."}),className:C,children:[(0,d.jsx)(_,{className:"h-4 w-4"})," Show QR/share link"]})]})]})]})})}bd.displayName="SplitMethodButton";let bi=(0,U.default)("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);var bj=a.i(80094);function bk(a){let b,{checkoutStep:c,submittedSnapshot:e,estimatedMinutes:f,taxSettings:g,paidTipAmount:h,paidCouponDiscount:i,submittedBaseTotal:j,appliedCoupon:k,paidAmountTotal:l,orderStatusTotal:m,submittedContextLabel:n,submittedContextValue:o,vatLabels:p,setIsSplitting:q,setSelectedSplitPersonId:r,setCheckoutStep:s,modalPrimaryBtnStyle:t,startSplitFlow:u,onOpenOrderUpdate:v,initialSubmittedOrder:w,onClose:x,modalSecondaryBtn:y,reviewRating:z,setReviewRating:A,reviewSubmitStatus:B,setReviewSubmitStatus:C,reviewComment:E,setReviewComment:F,canSubmitReview:G,handleSubmitReview:H,reviewSubmitMessage:I,merchantSettings:J,activeReviewSharePlatforms:K,handleDownloadBusinessInvoice:L,invoiceDownloadStatus:N,invoiceDownloadMessage:O}=a;return(0,d.jsx)(d.Fragment,{children:("submitted"===c||"paid"===c)&&e&&(0,d.jsx)(aA.motion.div,{"data-pmd-order-status-card":"1",className:"relative mt-7 space-y-3",children:(0,d.jsxs)(bb,{className:"pt-7 space-y-3",children:[(e?.showCustomerEta??!0)&&(0,d.jsx)("div",{"data-pmd-floating-eta-circle":"1",className:"absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full","aria-label":`Estimated time ${f} minutes`,style:{width:"4.45rem",height:"4.45rem",background:"#062F2A",backgroundColor:"#062F2A",border:"2px solid #b88940",boxShadow:"0 16px 34px rgba(6, 47, 42, 0.24)",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"},children:(0,d.jsxs)("div",{className:"flex flex-col items-center justify-center leading-none",children:[(0,d.jsx)("span",{className:"font-extrabold tracking-tight",style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",fontSize:"1.45rem",lineHeight:1},children:Math.max(1,Math.round(Number(f)||0))}),(0,d.jsx)("span",{className:"mt-1 text-[10px] font-bold uppercase tracking-[0.14em]",style:{color:"rgba(255,255,255,0.92)",WebkitTextFillColor:"rgba(255,255,255,0.92)"},children:"mins"})]})}),(0,d.jsxs)("div",{className:"flex items-center gap-3",children:[(0,d.jsx)(bg,{"data-pmd-order-received-icon":"1",className:"pmd-order-received-icon rounded-full",children:(0,d.jsx)(T.Check,{className:"h-5 w-5",strokeWidth:3})}),(0,d.jsxs)("div",{className:"flex-1",children:[(0,d.jsx)("div",{className:"flex items-center justify-between gap-2",children:(0,d.jsx)("p",{className:"pmd-checkout-status-title text-base font-semibold",children:"paid"===c?"Payment confirmed":"We received your order"})}),"paid"===c&&(0,d.jsx)("p",{className:"text-xs muted",children:"Your order is confirmed and being prepared."})]})]}),(0,d.jsxs)("div",{className:"pmd-checkout-total-card surface-sub rounded-2xl p-3 space-y-2 text-sm",style:{background:"var(--theme-surface)",color:"var(--theme-text-primary)",border:"1px solid var(--theme-border)"},children:[e?.orderId&&(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"muted font-medium",children:"Order Number:"}),(0,d.jsxs)("span",{className:"text-right font-semibold text-[15px]",children:["M-",(b=String(e.orderId??"").trim())?((b.replace(/\D+/g,"")||b.replace(/[^a-zA-Z0-9]+/g,"")).slice(-4)||b.slice(-4)).padStart(4,"0").toUpperCase():"----",(0,d.jsxs)("span",{className:"block text-[10px] font-medium opacity-60",children:["ref ",String(e.orderId)]})]})]}),Number(e?.vatAmount??0)>0&&(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"muted font-medium",children:"Subtotal:"}),(0,d.jsx)("span",{className:"font-semibold text-[15px]",children:M(Number(e?.subtotal??0))})]}),(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsxs)("span",{className:"muted font-medium",children:["VAT ",Number(e?.vatPercentage??g?.percentage??0),"%:"]}),(0,d.jsx)("span",{className:"font-semibold text-[15px]",children:M(Number(e?.vatAmount??0))})]})]}),(h>0||i>0)&&(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"muted font-medium",children:"Items total:"}),(0,d.jsx)("span",{className:"font-semibold text-[15px]",children:M(j||Number(e?.total??0))})]}),h>0&&(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"muted font-medium",children:"Tip:"}),(0,d.jsx)("span",{className:"font-semibold text-[15px]",children:M(h)})]}),i>0&&(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsxs)("span",{className:"muted font-medium",children:["Coupon ",String(e?.paidCouponCode||k?.code||"")?`(${String(e?.paidCouponCode||k?.code)})`:"",":"]}),(0,d.jsxs)("span",{className:"font-semibold text-[15px]",style:{color:"#166534"},children:["-",M(i)]})]}),(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"muted font-medium",children:"paid"===c&&(h>0||i>0)?"Amount paid:":"Order Total:"}),(0,d.jsx)("span",{className:"font-semibold text-[15px]",children:M("paid"===c&&(h>0||i>0)?l:m)})]}),(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsxs)("span",{className:"muted font-medium",children:[n,":"]}),(0,d.jsx)("span",{className:"font-semibold text-[15px]",children:o})]}),p.includedNote&&(0,d.jsxs)("div",{className:"flex items-center justify-between pt-1 text-xs opacity-75",children:[(0,d.jsx)("span",{className:"muted font-medium",children:"VAT:"}),(0,d.jsx)("span",{className:"font-medium",children:p.includedNote})]})]}),(0,d.jsxs)("div",{className:"pmd-checkout-flat-section rounded-2xl p-3",children:[(0,d.jsx)("h3",{className:"mb-2 text-sm font-semibold",children:p.summary}),(0,d.jsx)("div",{className:"pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1",children:D(e?.submittedItems||[]).map((a,b)=>(0,d.jsxs)(aA.motion.div,{layout:!0,initial:{opacity:0,y:4},animate:{opacity:1,y:0},exit:{opacity:0,y:-4},transition:{duration:.16,ease:"easeOut"},className:"pmd-checkout-item-row flex items-center justify-between gap-3 text-sm",children:[(0,d.jsxs)("span",{className:"truncate font-medium",children:[Number(a?.quantity||1),"x ",String(a?.name||`Item ${b+1}`)]}),(0,d.jsx)("span",{className:"font-semibold text-[15px]",children:M(Number(a?.subtotal??Number(a?.price||0)*Number(a?.quantity||1)))})]},`${a?.menu_id||a?.order_menu_id||a?.name||b}-${b}`))})]}),"paid"!==c&&(0,d.jsxs)("div",{className:"space-y-3",children:["submitted"===c&&(0,d.jsx)("div",{className:"space-y-3",children:(0,d.jsxs)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:[(0,d.jsxs)(aA.motion.button,{type:"button",whileHover:{x:2},whileTap:{scale:.985},onClick:()=>{q(!1),r(null),s("payment")},className:"group flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-md transition",style:t,children:["Pay in full ",(0,d.jsx)(bi,{className:"h-4 w-4 transition-transform group-hover:translate-x-0.5",style:{color:"#FFFFFF",stroke:"#FFFFFF"}})]}),(0,d.jsxs)(aA.motion.button,{type:"button",whileHover:{x:2},whileTap:{scale:.985},"data-pmd-split-bill-stable":"1",onClick:()=>u("equal"),className:"pmd-split-bill-stable-button group flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",style:{border:"1.5px solid #D8B982",borderColor:"#D8B982",color:"#10201D",WebkitTextFillColor:"#10201D",background:"rgba(255, 255, 255, 0.74)",backgroundColor:"rgba(255, 255, 255, 0.74)",backgroundImage:"none",boxShadow:"0 8px 18px rgba(17, 24, 39, 0.04)",textShadow:"none",opacity:1,transition:"none"},children:[(0,d.jsx)(ab,{className:"h-4 w-4 transition-transform group-hover:translate-x-0.5",style:{color:"#b88940",stroke:"#b88940"}})," Split bill"]})]})}),(0,d.jsx)("button",{type:"button",onClick:()=>{v?.(e||w||null),x()},className:y,children:"Continue ordering"})]}),"paid"===c&&(0,d.jsxs)("div",{className:"pmd-order-complete-content space-y-3",children:[(0,d.jsxs)("div",{className:"rounded-2xl border p-3 space-y-3",style:{borderColor:"var(--theme-border)",background:"var(--theme-surface)"},children:[(0,d.jsxs)("div",{className:"flex items-center gap-2",children:[(0,d.jsx)($.MessageSquare,{className:"h-4 w-4",style:{color:"#b88940"}}),(0,d.jsx)("h3",{className:"text-sm font-semibold",children:"Rate your visit"})]}),(0,d.jsx)("p",{className:"text-xs muted",children:"Thank you — a quick note for the restaurant."}),(0,d.jsx)("div",{className:"flex gap-1","aria-label":"Restaurant rating",children:[1,2,3,4,5].map(a=>(0,d.jsx)("button",{type:"button","aria-label":`${a} star${a>1?"s":""}`,onClick:()=>{A(a),"loading"!==B&&C("idle")},className:"rounded-full p-1",children:(0,d.jsx)(aa,{className:"h-6 w-6",style:{color:"#b88940",fill:z>=a?"#b88940":"transparent"}})},a))}),(0,d.jsx)(bj.Textarea,{value:E,onChange:a=>{F(a.target.value),"loading"!==B&&C("idle")},placeholder:"Optional comment for the restaurant",className:"min-h-[78px] rounded-2xl"}),(0,d.jsx)("button",{type:"button","data-pmd-submit-review":"1",disabled:!G||"loading"===B||"success"===B,onClick:H,className:"min-h-11 w-full rounded-full px-4 py-2 text-sm font-semibold transition",style:{border:"1px solid #062F2A",background:G&&"success"!==B?"#062F2A":"rgba(6, 47, 42, 0.18)",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",boxShadow:G?"0 14px 28px rgba(0, 0, 0, 0.24)":"none",opacity:G&&"success"!==B?1:.72},children:"loading"===B?"Submitting...":"success"===B?"Review submitted":"Submit review"}),I&&(0,d.jsx)("p",{className:"text-xs",style:{color:"error"===B?"#B42318":"#166534"},children:I}),"success"===B&&J.reviewSocial?.sharePromptEnabled&&K.length>0&&(0,d.jsxs)("div",{className:"rounded-2xl border p-3",style:{borderColor:"rgba(216, 185, 130, 0.42)",background:"rgba(255, 249, 239, 0.78)"},children:[(0,d.jsx)("p",{className:"mb-2 text-xs font-semibold",style:{color:"#10201D"},children:"Would you like to share your review publicly?"}),(0,d.jsx)("div",{className:"flex flex-wrap gap-2",children:K.map(({id:a,label:b,icon:c})=>(0,d.jsxs)("a",{href:J.reviewSocial.platforms[a].url,target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",style:{borderColor:"rgba(6, 47, 42, 0.18)",color:"#062F2A",background:"rgba(255,255,255,0.72)"},children:[(0,d.jsx)(c,{className:"h-3.5 w-3.5"})," ",b]},a))})]})]}),(0,d.jsx)("div",{className:"flex justify-center",children:(0,d.jsx)("button",{type:"button",onClick:L,disabled:"loading"===N,className:"min-h-10 w-full max-w-[280px] rounded-full border px-4 py-2 text-xs font-semibold",style:{borderColor:"color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)",color:"#062F2A",background:"transparent",opacity:"loading"===N?.72:1},children:"loading"===N?"Preparing invoice...":"Download business invoice"})}),O&&(0,d.jsx)("p",{className:"text-center text-xs",style:{color:"#B42318"},children:O}),(0,d.jsx)("div",{className:"flex justify-center pt-1",children:(0,d.jsx)("img",{src:"/assets/media/uploads/Paymydinelogo.png",alt:"PayMyDine",className:"max-h-7 max-w-[120px] opacity-70"})}),(0,d.jsx)("button",{type:"button",onClick:x,className:y,children:"Back to menu"})]})]})})})}let bl=new Set(["cod","card","paypal","stripe","google_pay","apple_pay","wero","square","authorizenetaim","sumup","worldline"]),bm=new Set(["google_pay","apple_pay","cod","stripe","square","authorizenetaim"]),bn=(process.env.NEXT_PUBLIC_STATIC_ORIGIN||"").replace(/\/+$/,"");function bo(a){return bn?`${bn}${a}`:a}let bp={card_payment:"card",paypal_express:"paypal",paypalexpress:"paypal",sum_up:"sumup",sumup:"sumup",wero_pay:"wero"};function bq(a){let b=a??"",c=bp[b.trim().toLowerCase()]??b.trim().toLowerCase();if(!bl.has(c))return bo("/images/payments/default.svg");if("sumup"===c)return bo("/images/payments/sumup.svg");if("wero"===c)return bo("/images/payments/wero.svg");let d=bm.has(c)?"png":"svg";return bo(`/images/payments/${c}.${d}`)}function br(a){let{checkoutStep:b,selectedSplitPerson:c,pendingSummary:e,orderContextLabel:f,orderContextValue:g,paymentVatAmount:h,paymentSubtotalAmount:i,paymentVatPercentage:j,paymentBaseAmount:k,paymentTipAmount:l,paymentCouponDiscount:m,paymentPayableTotal:n,tipSettings:o,paymentTipPercentage:p,paymentCustomTip:q,updatePaymentTipPercentage:r,customTip:s,tipAmount:t,updatePaymentCustomTip:u,appliedCoupon:v,couponCode:w,setCouponCode:x,setCouponError:y,couponError:z,couponLoading:A,setCouponLoading:B,validateCoupon:C,removeCoupon:D,selectedPaymentMethod:E,loadingPayments:F,visiblePaymentMethods:G,handlePaymentMethodSelect:H,stripePromise:I,stripeConfig:J,selectedMethod:K,isDarkTheme:L,renderPaymentForm:N,t:O,toast:P}=a;return(0,d.jsx)(d.Fragment,{children:"payment"===b&&(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.18,ease:"easeOut"},className:"space-y-3",children:(0,d.jsxs)(bf,{className:"pmd-checkout-payment-card surface-sub",children:[(0,d.jsxs)("div",{"data-pmd-payment-header-copy-row":"1",className:"flex items-center gap-3 rounded-2xl p-4",style:{background:"var(--theme-surface)",color:"var(--theme-text-primary)",border:"1px solid var(--theme-border)"},children:[(0,d.jsx)(bg,{"data-pmd-payment-header-icon":"1",className:"rounded-full",children:(0,d.jsx)(W.CreditCard,{className:"h-5 w-5"})}),(0,d.jsx)("p",{className:"text-sm font-semibold leading-snug",style:{color:"var(--theme-text-muted)",WebkitTextFillColor:"var(--theme-text-muted)"},children:"Ready to pay?"})]}),c&&(0,d.jsxs)(a9,{variant:"subtle",className:"flex items-center justify-between p-3",children:[(0,d.jsxs)("div",{className:"flex items-center space-x-2",children:[(0,d.jsx)("span",{className:"pmd-checkout-avatar-frame inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",children:c.avatar}),(0,d.jsxs)("span",{className:"text-xs font-semibold",children:[c.name,"'s share"]})]}),(0,d.jsx)("span",{className:"text-sm font-bold",children:M(c.total)})]})]})},"payment-card-header"),e&&(0,d.jsxs)("div",{className:"pmd-checkout-flat-section rounded-2xl p-3 text-xs",children:[(0,d.jsxs)("div",{className:"flex justify-between",children:[(0,d.jsx)("span",{className:"muted",children:"Total"}),(0,d.jsx)("span",{className:"font-semibold",children:M(e?.orderTotal||0)})]}),(0,d.jsxs)("div",{className:"flex justify-between",children:[(0,d.jsx)("span",{className:"muted",children:"Already paid"}),(0,d.jsx)("span",{className:"font-semibold",children:M(e?.settledAmount||0)})]}),(0,d.jsxs)("div",{className:"flex justify-between mt-1",children:[(0,d.jsx)("span",{className:"muted",children:"Remaining"}),(0,d.jsx)("span",{className:"font-semibold",children:M(e?.remainingAmount||0)})]})]}),(0,d.jsx)(aA.motion.div,{className:"space-y-3",children:(0,d.jsxs)(ba,{className:"pmd-checkout-total-card space-y-3",children:[(0,d.jsxs)("div",{className:"pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs",style:{borderColor:"var(--theme-border)",background:"transparent",backgroundColor:"transparent",boxShadow:"none"},children:[(0,d.jsx)("span",{className:"muted",children:f}),(0,d.jsx)("span",{className:"font-semibold",children:g})]}),(0,d.jsxs)("div",{className:"space-y-1 text-sm",children:[h>0&&!c&&(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"muted",children:"Subtotal"}),(0,d.jsx)("span",{className:"font-semibold",children:M(i)})]}),(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsxs)("span",{className:"muted",children:["VAT ",j,"%"]}),(0,d.jsx)("span",{className:"font-semibold",children:M(h)})]})]}),(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"muted",children:c?"Share amount":"Items total"}),(0,d.jsx)("span",{className:"font-semibold",children:M(k)})]}),l>0&&(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"muted",children:"Tip"}),(0,d.jsx)("span",{className:"font-semibold",children:M(l)})]}),m>0&&v&&(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsxs)("span",{className:"muted",children:["Coupon ",v.code?`(${v.code})`:""]}),(0,d.jsxs)("span",{className:"font-semibold",style:{color:"#166534"},children:["-",M(m)]})]}),(0,d.jsxs)("div",{className:"flex items-center justify-between border-t pt-2",style:{borderColor:"var(--theme-border)"},children:[(0,d.jsx)("span",{className:"font-semibold",children:"Payable total"}),(0,d.jsx)("span",{className:"text-base font-bold",style:{color:"#b88940"},children:M(n)})]})]}),o.enabled&&(0,d.jsxs)(be,{"data-pmd-payment-real-panel":"tip-coupon",children:[(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("span",{className:"text-xs font-semibold",children:c?`${c.name}'s tip`:"Add tip"}),l>0&&(0,d.jsx)("span",{className:"text-xs font-semibold",style:{color:"#b88940"},children:M(l)})]}),(0,d.jsxs)("div",{className:"flex flex-wrap gap-2",children:[(o.percentages||[]).map(a=>(0,d.jsxs)(bd,{selected:p===a&&!q,onClick:()=>r(a),children:[a,"%"]},a)),(0,d.jsxs)("div",{className:"relative min-w-[96px] flex-1",children:[(0,d.jsx)("span",{className:"absolute left-3 top-1/2 -translate-y-1/2 text-xs muted",children:"€"}),(0,d.jsx)(a7,{"data-pmd-custom-tip-shows-selected-amount":"1",step:"0.01",value:s||(Number(t)>0?Number(t).toFixed(2):""),type:"number",min:"0",onChange:a=>u(a.target.value),placeholder:"Custom",className:"h-9 w-full pl-7 pr-3 text-xs font-semibold"})]})]})]}),(0,d.jsxs)(be,{children:[!v||c?(0,d.jsxs)("div",{className:"flex gap-2",children:[(0,d.jsx)(a7,{type:"text",value:w,onChange:a=>{x(a.target.value.toUpperCase()),y(null)},placeholder:"Coupon code",className:"h-9 min-w-0 flex-1 px-3 text-xs font-semibold",disabled:A}),(0,d.jsx)(a6,{type:"button",disabled:A||!w.trim(),onClick:async()=>{if(w.trim()){if(c)return void y("Coupon validation for split payments is coming soon.");B(!0),y(null);try{let a=await C(w.trim(),k);a.success?(x(""),P({title:"Coupon applied",description:"Your coupon was added to this payment."})):y(a.message||"Coupon will be checked at payment.")}catch{y("Coupon validation coming soon.")}finally{B(!1)}}},className:"h-9 px-4 text-xs font-semibold disabled:opacity-50",variant:"secondary",children:A?"Checking...":"Apply"})]}):(0,d.jsxs)("div",{className:"flex items-center justify-between gap-2 rounded-full px-3 py-2 text-xs",style:{background:"color-mix(in srgb, #062F2A 10%, var(--theme-surface) 90%)"},children:[(0,d.jsxs)("span",{className:"font-semibold",children:[v.name||"Coupon"," ",v.code?`(${v.code})`:""]}),(0,d.jsx)("button",{type:"button",onClick:()=>{D(),x(""),y(null)},className:"rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",style:{borderColor:"color-mix(in srgb, #b88940 45%, var(--theme-border) 55%)",color:"#062F2A",background:"var(--theme-surface)"},children:"Remove"})]}),z&&(0,d.jsx)("p",{className:"text-xs text-red-700",children:z})]})]})}),(0,d.jsx)(a_,{initial:!1,mode:"wait",children:"payment"===b?(0,d.jsx)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 pt-2",children:(0,d.jsxs)(bf,{className:"pmd-checkout-payment-methods-card",children:[(0,d.jsx)("h3",{className:"text-center text-sm",children:O("paymentMethods")}),(0,d.jsx)("div",{className:"flex justify-center items-center gap-3 flex-wrap",children:F?(0,d.jsx)("div",{className:"text-sm muted",children:"Loading payment methods..."}):0===G.length?(0,d.jsx)("div",{className:"text-sm muted",children:"No payment methods available"}):G.map(a=>(0,d.jsx)(aA.motion.div,{children:(0,d.jsx)(a8,{label:a.name,selected:E===a.code,onClick:()=>{H(a.code)},children:"card"===a.code?(0,d.jsx)("img",{src:L?"/images/payments/card-dark.svg":"/images/payments/card-light.svg",alt:a.name,width:40,height:22,className:"object-contain"}):(0,d.jsx)("img",{src:"paypal"===a.code?"/images/payments/paypal.png":"google_pay"===a.code?"/images/payments/google_pay.png":bq(a.code),alt:a.name,width:"wero"===a.code?50:"cod"===a.code||"paypal"===a.code?30:"apple_pay"===a.code||"google_pay"===a.code?50:42,height:"wero"===a.code?29:"apple_pay"===a.code||"google_pay"===a.code?28:24,className:"object-contain"})})},a.code))}),af(E)&&(0,d.jsx)("div",{"data-pmd-payment-selected-detail":"1",className:"pmd-checkout-payment-detail pt-2",children:N()})]})},"payment-methods"):null})]})})}function bs(a){let{isKazenJapaneseCheckoutVisual:b,isModernGreenCheckoutVisual:c,isOrganicCheckoutVisual:e,checkoutVisualTheme:f,modalPrimaryBtn:g,modalPrimaryBtnStyle:h,modalSecondaryBtn:i,iconBackBtn:j,modalTitle:k,checkoutStep:l,setCheckoutStep:m,selectedSplitPersonId:n,onClose:o,tableDraft:p,tableInfo:q,taxSettings:r,isSubmittedTableDraftForStatus:s,hasPersonalItems:t,preferPersonalReview:u,orderContextLabel:v,orderContextValue:w,isTableContext:x,submitDraftLoading:y,draftLoading:z,handleSubmitTableDraft:A,setSubmittedSnapshot:B,personalReviewItems:C,addToCart:D,t:E,handleOptionsChange:F,vatLabels:G,subtotal:H,taxAmount:I,tipAmount:J,appliedCoupon:K,couponDiscount:L,finalTotal:M,isLoading:N,allItems:O,handleConfirmMyItems:P,setIsSplitting:Q,splitGrandTotal:R,splitMethod:S,startSplitFlow:T,chooseSplitMethod:U,splitGuestCount:V,suggestedSplitGuestCount:W,removeSplitGuest:X,addSplitGuest:Y,splitGuestProfiles:Z,equalSplitPeople:$,getSplitGuestAvatar:_,splitGuestNames:aa,unassignedSplitItems:ab,splitSourceItems:ac,itemAssignments:ad,setItemAssignments:ae,sharePercents:af,setSharePercents:ag,sharePercentTotal:ah,canConfirmSplitMethod:ai,goToSplitReview:aj,activeSplitPeople:ak,setSelectedSplitPersonId:al,toast:am,submittedSnapshot:an,estimatedMinutes:ao,paidTipAmount:ap,paidCouponDiscount:aq,paidAmountTotal:ar,orderStatusTotal:as,submittedBaseTotal:at,submittedContextLabel:au,submittedContextValue:av,initialSubmittedOrder:aw,existingOrderId:ax,onOpenOrderUpdate:ay,reviewRating:az,setReviewRating:aH,reviewSubmitStatus:aJ,setReviewSubmitStatus:aL,reviewComment:aM,setReviewComment:aN,canSubmitReview:aO,handleSubmitReview:aP,reviewSubmitMessage:aQ,merchantSettings:aR,activeReviewSharePlatforms:aS,handleDownloadBusinessInvoice:aT,invoiceDownloadStatus:aU,invoiceDownloadMessage:aV,selectedSplitPerson:aW,pendingSummary:aX,paymentVatAmount:aY,paymentSubtotalAmount:aZ,paymentVatPercentage:a$,paymentBaseAmount:a_,paymentTipAmount:a0,paymentCouponDiscount:a1,paymentPayableTotal:a3,tipSettings:a4,paymentTipPercentage:a5,paymentCustomTip:a6,updatePaymentTipPercentage:a7,customTip:a8,updatePaymentCustomTip:a9,couponCode:ba,setCouponCode:bb,setCouponError:bc,couponError:bd,couponLoading:be,setCouponLoading:bf,validateCoupon:bg,removeCoupon:bi,selectedPaymentMethod:bj,loadingPayments:bl,visiblePaymentMethods:bm,handlePaymentMethodSelect:bn,stripePromise:bo,stripeConfig:bp,selectedMethod:bq,isDarkTheme:bs,renderPaymentForm:bt,payableTotal:bu}=a;return(0,d.jsxs)("div",{"data-pmd-kazen-checkout-overlay":b?"1":void 0,className:(0,aD.cn)("fixed inset-0 z-50 flex items-center justify-center",c?"bg-transparent backdrop-blur-md":"bg-black/30"),children:[e&&(0,d.jsx)(aI,{}),(0,d.jsxs)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},"data-testid":"pmd-checkout-modal","data-pmd-checkout-theme-root":"1","data-pmd-checkout-theme":f,"data-pmd-checkout-design-system":"1","data-pmd-checkout-visual-theme":f,"data-pmd-checkout-kazen-skin":b?"1":void 0,className:"pmd-checkout-modal w-full max-w-md surface rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]",style:e?aE:void 0,children:[(0,d.jsxs)("div",{className:"p-4 pb-2 surface-sub flex justify-between items-center rounded-2xl",style:e?aF:void 0,children:[(0,d.jsx)(aC.Button,{"data-pmd-order-status-back":"1",variant:"ghost",size:"sm",onClick:()=>{var a;let b=(a=!!n,"payment"===l?a?"split-review":"submitted":aK(l)?"submitted":null);b?m(b):o()},className:j,style:{background:"#062F2A",backgroundColor:"#062F2A",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",borderColor:"#062F2A",outlineColor:"#062F2A",textDecoration:"none"},children:(0,d.jsx)(aB.ArrowLeft,{className:"h-5 w-5",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}})}),(0,d.jsx)("h2",{className:"pmd-checkout-modal-title",children:k}),(0,d.jsx)("div",{className:"w-8"})," "]}),(0,d.jsxs)("div",{"data-testid":"pmd-checkout-scroll","data-pmd-checkout-scroll":"1",className:"pmd-checkout-body p-4 pb-8 space-y-4 overflow-y-auto flex-1",style:e?aG:void 0,children:[(0,d.jsx)(a2,{checkoutStep:l,tableDraft:p,isSubmittedTableDraftForStatus:s,hasPersonalItems:t,preferPersonalReview:u,submitDraftLoading:y,draftLoading:z,handleSubmitTableDraft:A,onClose:o,setSubmittedSnapshot:B,tableInfo:q,taxSettings:r,setCheckoutStep:m,modalSecondaryBtn:i,orderContextLabel:v,orderContextValue:w,isTableContext:x,personalReviewItems:C,addToCart:D,t:E,handleOptionsChange:F,vatLabels:G,subtotal:H,taxAmount:I,tipAmount:J,appliedCoupon:K,couponDiscount:L,finalTotal:M,isLoading:N,allItems:O,handleConfirmMyItems:P,modalPrimaryBtn:g,modalPrimaryBtnStyle:h}),(0,d.jsx)(bh,{checkoutStep:l,splitGrandTotal:R,splitMethod:S,chooseSplitMethod:U,splitGuestCount:V,suggestedSplitGuestCount:W,removeSplitGuest:X,addSplitGuest:Y,splitGuestProfiles:Z,equalSplitPeople:$,unassignedSplitItems:ab,splitSourceItems:ac,itemAssignments:ad,setItemAssignments:ae,splitGuestNames:aa,sharePercents:af,setSharePercents:ag,getSplitGuestAvatar:_,sharePercentTotal:ah,canConfirmSplitMethod:ai,goToSplitReview:aj,activeSplitPeople:ak,selectedSplitPersonId:n,setCheckoutStep:m,setSelectedSplitPersonId:al,toast:am,modalSecondaryBtn:i}),(0,d.jsx)(bk,{checkoutStep:l,submittedSnapshot:an,estimatedMinutes:ao,taxSettings:r,paidTipAmount:ap,paidCouponDiscount:aq,submittedBaseTotal:at,appliedCoupon:K,paidAmountTotal:ar,orderStatusTotal:as,submittedContextLabel:au,submittedContextValue:av,vatLabels:G,setIsSplitting:Q,setSelectedSplitPersonId:al,setCheckoutStep:m,modalPrimaryBtnStyle:h,startSplitFlow:T,onOpenOrderUpdate:ay,initialSubmittedOrder:aw,onClose:o,modalSecondaryBtn:i,reviewRating:az,setReviewRating:aH,reviewSubmitStatus:aJ,setReviewSubmitStatus:aL,reviewComment:aM,setReviewComment:aN,canSubmitReview:aO,handleSubmitReview:aP,reviewSubmitMessage:aQ,merchantSettings:aR,activeReviewSharePlatforms:aS,handleDownloadBusinessInvoice:aT,invoiceDownloadStatus:aU,invoiceDownloadMessage:aV}),(0,d.jsx)(br,{checkoutStep:l,selectedSplitPerson:aW,pendingSummary:aX,orderContextLabel:v,orderContextValue:w,paymentVatAmount:aY,paymentSubtotalAmount:aZ,paymentVatPercentage:a$,paymentBaseAmount:a_,paymentTipAmount:a0,paymentCouponDiscount:a1,paymentPayableTotal:a3,tipSettings:a4,paymentTipPercentage:a5,paymentCustomTip:a6,updatePaymentTipPercentage:a7,customTip:a8,tipAmount:J,updatePaymentCustomTip:a9,appliedCoupon:K,couponCode:ba,setCouponCode:bb,setCouponError:bc,couponError:bd,couponLoading:be,setCouponLoading:bf,validateCoupon:bg,removeCoupon:bi,selectedPaymentMethod:bj,loadingPayments:bl,visiblePaymentMethods:bm,handlePaymentMethodSelect:bn,stripePromise:bo,stripeConfig:bp,selectedMethod:bq,isDarkTheme:bs,renderPaymentForm:bt,t:E,toast:am})]})]})]})}var bt=a.i(65718);let bu=(a,b="Item")=>String(a?.__pmdDisplayName||a?.name||a?.item?.name||a?.menu_name||a?.item_name||b),bv=a=>Math.max(1,Number(a?.quantity||a?.qty||1));function bw({className:a="",style:b,children:c,...e}){return(0,d.jsx)("button",{...e,"data-pmd-mg-unified-button":"primary","data-pmd-no-observer-action":"modern-green-unified-primary","data-pmd-render-safe-action":"modern-green-unified-primary",style:{height:"3.5rem",minHeight:"3.5rem",width:"100%",borderRadius:"9999px",border:"1px solid rgba(51, 158, 111, .42)",background:"linear-gradient(180deg, rgba(3, 48, 36, .98), rgba(2, 32, 24, .98))",color:"#f5fff8",fontSize:"1rem",fontWeight:760,letterSpacing:"-0.012em",boxShadow:"inset 0 1px 0 rgba(151,255,204,.045), 0 12px 26px rgba(0,0,0,.22)",...b},className:`flex items-center justify-center px-5 py-3 transition disabled:opacity-50 ${a}`,children:(0,d.jsx)("span",{style:{color:"#f5fff8",WebkitTextFillColor:"#f5fff8",opacity:1,fontWeight:760},children:c})})}function bx({className:a="",style:b,children:c,...e}){return(0,d.jsx)("button",{...e,"data-pmd-mg-unified-button":"secondary","data-pmd-no-observer-action":"modern-green-unified-secondary","data-pmd-render-safe-action":"modern-green-unified-secondary",style:{height:"3.5rem",minHeight:"3.5rem",width:"100%",borderRadius:"9999px",border:"1px solid rgba(51, 158, 111, .38)",background:"linear-gradient(180deg, rgba(1, 15, 10, .99), rgba(0, 8, 5, .99))",color:"#edfdf4",fontSize:"1rem",fontWeight:720,letterSpacing:"-0.012em",boxShadow:"inset 0 1px 0 rgba(151,255,204,.035)",opacity:1,...b},className:`flex items-center justify-center px-5 py-3 transition hover:brightness-110 disabled:opacity-50 ${a}`,children:(0,d.jsx)("span",{style:{color:"#edfdf4",WebkitTextFillColor:"#edfdf4",opacity:1,fontWeight:720},children:c})})}function by({children:a,className:b=""}){return(0,d.jsx)("section",{"data-pmd-mg-unified-card":"1",className:`rounded-[26px] border p-4 backdrop-blur-xl ${b}`,style:{background:"linear-gradient(180deg, rgba(1, 15, 10, .985), rgba(0, 8, 5, .985))",borderColor:"rgba(38, 128, 88, .48)",color:"#f5fff8",boxShadow:"0 0 0 1px rgba(13, 80, 52, .24), 0 24px 64px rgba(0,0,0,.52)"},children:a})}function bz({splitMethod:a,chooseSplitMethod:b}){return(0,d.jsx)("div",{className:"grid grid-cols-3 gap-2",children:[["equal","Split equally"],["items","By order items"],["shares","By shares"]].map(([c,e])=>(0,d.jsx)("button",{type:"button",onClick:()=>b(c),className:`rounded-full border px-2 py-2 text-[11px] font-extrabold transition ${a===c?"border-[#31c98b] bg-[#31c98b] text-[#02110c]":"border-[#31c98b]/25 bg-transparent text-[#dfffee]"}`,children:e},c))})}function bA({splitGuestCount:a,addSplitGuest:b,removeSplitGuest:c}){return(0,d.jsxs)("div",{className:"flex items-center justify-between rounded-3xl border border-[#31c98b]/16 bg-[#04130f]/70 px-3 py-2",children:[(0,d.jsx)("span",{className:"text-sm font-bold text-[#f4fff8]",children:"People"}),(0,d.jsxs)("div",{className:"flex items-center gap-3",children:[(0,d.jsx)("button",{type:"button","aria-label":"Remove guest",disabled:a<=2,onClick:c,className:"flex h-8 w-8 items-center justify-center rounded-full bg-[#0c3d2d] text-[#f4fff8] disabled:opacity-35",children:(0,d.jsx)(a3.Minus,{className:"h-4 w-4"})}),(0,d.jsx)("span",{className:"min-w-6 text-center text-base font-black text-[#f4fff8]",children:a}),(0,d.jsx)("button",{type:"button","aria-label":"Add guest",disabled:a>=10,onClick:b,className:"flex h-8 w-8 items-center justify-center rounded-full bg-[#0c3d2d] text-[#f4fff8] disabled:opacity-35",children:(0,d.jsx)(a4.Plus,{className:"h-4 w-4"})})]})]})}function bB(a){let{checkoutStep:b,onClose:c,hasPersonalItems:e,personalItems:f,tableDraft:g,tableDraftItems:h,tableDraftTotal:i,submittedSnapshot:j,submittedItems:k,estimatedMinutes:l,subtotal:m,finalTotal:n,paymentBaseAmount:o,paymentPayableTotal:p,paymentTipAmount:q,paymentCouponDiscount:r,paymentTipPercentage:s,paymentCustomTip:t,tipPercentages:u,tipEnabled:v,couponCode:w,setCouponCode:x,appliedCoupon:y,couponError:z,couponLoading:A,onApplyCoupon:B,onRemoveCoupon:C,visiblePaymentMethods:D,loadingPayments:E,selectedPaymentMethod:F,onPaymentMethodSelect:G,renderPaymentForm:H,renderPaymentButton:I,handleConfirmMyItems:J,handleSubmitTableDraft:K,setCheckoutStep:L,startSplitFlow:N,chooseSplitMethod:O,goToSplitReview:P,splitGuestCount:Q,addSplitGuest:R,removeSplitGuest:S,splitMethod:T,splitGuestProfiles:U,equalSplitPeople:V=[],activeSplitPeople:X,selectedSplitPersonId:Y,setSelectedSplitPersonId:$,selectedSplitPerson:aa,splitSourceItems:ab,itemAssignments:ac,setItemAssignments:ad,sharePercents:ae,setSharePercents:ag,sharePercentTotal:ah,canConfirmSplitMethod:ai,splitGrandTotal:aj,updatePaymentTipPercentage:ak,updatePaymentCustomTip:al,onPaymentLinks:am,onQrShare:an,isDarkTheme:ao}=a,ap=Number(j?.remainingAmount??j?.orderTotal??j?.total??i??n??0),aq=Array.isArray(V)?V:[],ar=a=>(0,d.jsx)("div",{className:"space-y-2",children:a.map((a,b)=>(0,d.jsxs)("div",{className:"flex items-center justify-between gap-3 rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 px-3 py-2",children:[(0,d.jsxs)("span",{className:"min-w-0 truncate text-sm font-semibold text-[#f4fff8]",children:[bv(a),"x ",bu(a,`Item ${b+1}`)]}),(0,d.jsx)("span",{className:"shrink-0 text-sm font-black text-[#31c98b]",children:M((a=>{let b=bv(a),c=Number(a?.__pmdDisplaySubtotal??a?.subtotal??a?.total??a?.amount);if(Number.isFinite(c)&&c>0)return c;let d=Number(a?.price??a?.unit_price??a?.item?.price??0);return Number.isFinite(d)?d*b:0})(a))})]},`${bu(a)}-${b}`))}),as=null;return"review"===b&&e?as=(0,d.jsxs)(by,{className:"space-y-4",children:[(0,d.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"My Order"}),ar(f),(0,d.jsxs)("div",{className:"space-y-2 border-t border-[#31c98b]/14 pt-3",children:[(0,d.jsxs)("div",{className:"flex justify-between text-sm text-[#c9f6df]",children:[(0,d.jsx)("span",{children:"Subtotal"}),(0,d.jsx)("span",{children:M(m)})]}),(0,d.jsxs)("div",{className:"flex justify-between text-base font-black text-[#f4fff8]",children:[(0,d.jsx)("span",{children:"Total"}),(0,d.jsx)("span",{className:"text-[#31c98b]",children:M(n)})]})]}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(bw,{onClick:J,children:"Confirm"}),(0,d.jsx)(bx,{onClick:c,children:"Continue ordering"})]})]}):"review"===b&&g?as=(0,d.jsxs)(by,{className:"space-y-4",children:[(0,d.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"Table Order"}),ar(h),(0,d.jsxs)("div",{className:"flex justify-between border-t border-[#31c98b]/14 pt-3 text-base font-black text-[#f4fff8]",children:[(0,d.jsx)("span",{children:"Order Total"}),(0,d.jsx)("span",{className:"text-[#31c98b]",children:M(i)})]}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(bw,{onClick:K,children:"Send to kitchen"}),(0,d.jsx)(bx,{onClick:c,children:"Continue ordering"})]})]}):"submitted"===b?as=(0,d.jsxs)(by,{className:"space-y-4 pt-8 text-center",children:[(0,d.jsxs)("div",{className:"mx-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border border-[#31c98b]/35 bg-[#31c98b]/14 text-[#f4fff8]",children:[(0,d.jsx)("span",{className:"text-2xl font-black",children:l}),(0,d.jsx)("span",{className:"text-[10px] font-bold uppercase tracking-wide",children:"min"})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)(bt.CheckCircle,{className:"mx-auto mb-2 h-7 w-7 text-[#31c98b]"}),(0,d.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"We received your order"})]}),(0,d.jsxs)("div",{className:"flex justify-between rounded-2xl border border-[#31c98b]/14 bg-[#04130f]/58 px-3 py-2 text-base font-black text-[#f4fff8]",children:[(0,d.jsx)("span",{children:"Order Total"}),(0,d.jsx)("span",{className:"text-[#31c98b]",children:M(ap)})]}),ar(k),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(bw,{onClick:()=>L("payment"),children:"Pay in full"}),(0,d.jsx)(bx,{onClick:()=>N("equal"),children:"Split bill"}),(0,d.jsx)(bx,{onClick:c,children:"Continue ordering"})]})]}):"payment"===b?as=(0,d.jsxs)("div",{className:"space-y-3",children:[(0,d.jsxs)(by,{className:"space-y-3",children:[(0,d.jsxs)("div",{className:"flex items-center gap-3",children:[(0,d.jsx)("div",{className:"flex h-11 w-11 items-center justify-center rounded-full bg-[#31c98b] text-[#02110c]",children:(0,d.jsx)(W.CreditCard,{className:"h-5 w-5"})}),(0,d.jsxs)("div",{children:[(0,d.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"Payment"}),(0,d.jsx)("p",{className:"text-sm font-semibold text-[#bdebd2]",children:"Ready to pay?"})]})]}),aa&&(0,d.jsxs)("div",{className:"flex justify-between rounded-2xl border border-[#31c98b]/14 bg-[#04130f]/58 px-3 py-2 text-sm font-bold text-[#f4fff8]",children:[(0,d.jsxs)("span",{children:[aa.name,"'s share"]}),(0,d.jsx)("span",{children:M(aa.total)})]}),(0,d.jsxs)("div",{className:"space-y-2 rounded-3xl border border-[#31c98b]/14 bg-[#04130f]/58 p-3",children:[(0,d.jsxs)("div",{className:"flex justify-between text-sm text-[#c9f6df]",children:[(0,d.jsx)("span",{children:aa?"Share amount":"Items total"}),(0,d.jsx)("span",{children:M(o)})]}),q>0&&(0,d.jsxs)("div",{className:"flex justify-between text-sm text-[#c9f6df]",children:[(0,d.jsx)("span",{children:"Tip"}),(0,d.jsx)("span",{children:M(q)})]}),r>0&&(0,d.jsxs)("div",{className:"flex justify-between text-sm text-[#8ff0bd]",children:[(0,d.jsx)("span",{children:"Coupon"}),(0,d.jsxs)("span",{children:["-",M(r)]})]}),(0,d.jsxs)("div",{className:"flex justify-between border-t border-[#31c98b]/14 pt-2 text-base font-black text-[#f4fff8]",children:[(0,d.jsx)("span",{children:"Payable total"}),(0,d.jsx)("span",{className:"text-[#31c98b]",children:M(p)})]})]}),v&&(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsxs)("div",{className:"flex justify-between text-xs font-bold text-[#f4fff8]",children:[(0,d.jsx)("span",{children:aa?`${aa.name}'s tip`:"Add tip"}),q>0&&(0,d.jsx)("span",{className:"text-[#31c98b]",children:M(q)})]}),(0,d.jsxs)("div",{className:"flex flex-wrap gap-2",children:[[0,...u.filter(a=>0!==a)].map(a=>(0,d.jsxs)("button",{type:"button",onClick:()=>ak(a),className:`rounded-full border px-3 py-1.5 text-xs font-black ${s===a&&!t?"border-[#31c98b] bg-[#31c98b] text-[#02110c]":"border-[#31c98b]/25 bg-transparent text-[#e7fff3]"}`,children:[a,"%"]},a)),(0,d.jsx)("input",{type:"number",min:"0",step:"0.01",value:t,onChange:a=>al(a.target.value),placeholder:"Custom",className:"h-9 min-w-[96px] flex-1 rounded-full border border-[#31c98b]/25 bg-[#04130f]/70 px-3 text-xs font-bold text-[#f4fff8] outline-none placeholder:text-[#92c7ac]"})]})]}),(0,d.jsxs)("div",{className:"space-y-2",children:[!y||aa?(0,d.jsxs)("div",{className:"flex gap-2",children:[(0,d.jsx)("input",{type:"text",value:w,onChange:a=>x(a.target.value.toUpperCase()),placeholder:"Coupon code",disabled:A,className:"h-10 min-w-0 flex-1 rounded-full border border-[#31c98b]/25 bg-[#04130f]/70 px-3 text-xs font-bold text-[#f4fff8] outline-none placeholder:text-[#92c7ac]"}),(0,d.jsx)("button",{type:"button",disabled:A||!w.trim(),onClick:B,className:"rounded-full border border-[#31c98b]/40 px-4 text-xs font-black text-[#e7fff3] disabled:opacity-50",children:A?"Checking...":"Apply"})]}):(0,d.jsxs)("div",{className:"flex items-center justify-between rounded-full border border-[#31c98b]/18 bg-[#31c98b]/10 px-3 py-2 text-xs font-bold text-[#f4fff8]",children:[(0,d.jsxs)("span",{children:[y.name||"Coupon"," ",y.code?`(${y.code})`:""]}),(0,d.jsx)("button",{type:"button",onClick:C,className:"rounded-full border border-[#31c98b]/35 px-3 py-1 text-[#e7fff3]",children:"Remove"})]}),z&&(0,d.jsx)("p",{className:"text-xs font-semibold text-[#ffb4a8]",children:z})]})]}),(0,d.jsxs)(by,{className:"space-y-3",children:[(0,d.jsx)("h3",{className:"text-center text-sm font-black text-[#f4fff8]",children:"Payment methods"}),(0,d.jsx)("div",{className:"flex flex-wrap items-center justify-center gap-3",children:E?(0,d.jsx)("p",{className:"text-sm text-[#bdebd2]",children:"Loading payment methods..."}):0===D.length?(0,d.jsx)("p",{className:"text-sm text-[#bdebd2]",children:"No payment methods available"}):D.map(a=>{let b,c={width:"wero"===(b=a.code)||"apple_pay"===b||"google_pay"===b?50:"cod"===b||"paypal"===b?30:42,height:"wero"===b?29:"apple_pay"===b||"google_pay"===b?28:24};return(0,d.jsx)("button",{type:"button",onClick:()=>G(a.code),className:`flex h-14 w-20 items-center justify-center rounded-2xl border ${F===a.code?"border-[#31c98b] bg-[#31c98b]/16":"border-[#31c98b]/18 bg-[#04130f]/70"}`,children:(0,d.jsx)("img",{src:"card"===a.code?ao?"/images/payments/card-dark.svg":"/images/payments/card-light.svg":"paypal"===a.code?"/images/payments/paypal.png":"google_pay"===a.code?"/images/payments/google_pay.png":bq(a.code),alt:a.name,width:c.width,height:c.height,className:"object-contain"})},a.code)})}),af(F)&&(0,d.jsx)("div",{className:"pt-2",children:H()}),I()]})]}):"split"===b||"split-items"===b||"split-shares"===b?as=(0,d.jsxs)(by,{className:"space-y-4",children:[(0,d.jsxs)("div",{children:[(0,d.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"split-items"===b?"Assign items":"split-shares"===b?"Set shares":"Split Bill"}),(0,d.jsxs)("p",{className:"text-sm font-semibold text-[#bdebd2]",children:["Share ",M(aj)," your way."]})]}),(0,d.jsx)(bz,{splitMethod:T,chooseSplitMethod:O}),(0,d.jsx)(bA,{splitGuestCount:Q,addSplitGuest:R,removeSplitGuest:S}),(0,d.jsx)("div",{className:"flex gap-2 overflow-x-auto pb-1",children:U.map((a,b)=>(0,d.jsxs)("span",{className:"inline-flex shrink-0 items-center gap-1 rounded-full border border-[#31c98b]/20 bg-[#31c98b]/10 px-2 py-1 text-[11px] font-bold text-[#e7fff3]",children:[(0,d.jsx)("span",{children:a.avatar}),a.name]},`${a.name}-${b}`))}),"equal"===T&&(0,d.jsx)("div",{className:"grid gap-2",children:aq.map(a=>(0,d.jsxs)("div",{className:"flex justify-between rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 px-3 py-2 text-sm font-bold text-[#f4fff8]",children:[(0,d.jsx)("span",{children:a.name}),(0,d.jsx)("span",{className:"text-[#31c98b]",children:M(a.total)})]},a.id))}),"items"===T&&(0,d.jsx)("div",{className:"space-y-2",children:ab.map(a=>{let b=ac[a.key],c=null!=b;return(0,d.jsxs)("button",{type:"button",onClick:()=>ad(c=>({...c,[a.key]:null==b?0:b>=Q-1?null:b+1})),className:"flex w-full items-center justify-between gap-3 rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 px-3 py-2 text-left",children:[(0,d.jsx)("span",{className:"min-w-0 truncate text-sm font-bold text-[#f4fff8]",children:a.name}),(0,d.jsx)("span",{className:"text-sm font-black text-[#31c98b]",children:M(a.amount)}),(0,d.jsx)("span",{className:`rounded-full px-2 py-1 text-[10px] font-black ${c?"bg-[#31c98b] text-[#02110c]":"border border-[#31c98b]/30 text-[#e7fff3]"}`,children:c?U[b]?.name||"Assigned":"Unassigned"})]},a.key)})}),"shares"===T&&(0,d.jsxs)("div",{className:"space-y-3",children:[ae.slice(0,Q).map((a,b)=>(0,d.jsxs)("div",{className:"rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 p-3",children:[(0,d.jsxs)("div",{className:"mb-2 flex items-center justify-between text-sm font-bold text-[#f4fff8]",children:[(0,d.jsx)("span",{children:U[b]?.name||`Guest ${b+1}`}),(0,d.jsx)("span",{className:"text-[#31c98b]",children:M(aj*(Number(a||0)/100))})]}),(0,d.jsxs)("div",{className:"flex items-center gap-2",children:[(0,d.jsx)("input",{type:"number",min:"0",max:"100",value:a,onChange:a=>ag(c=>c.map((c,d)=>d===b?Number(a.target.value):c)),className:"h-9 w-20 rounded-full border border-[#31c98b]/25 bg-[#04130f]/70 px-3 text-xs font-bold text-[#f4fff8]"}),(0,d.jsx)("input",{type:"range",min:"0",max:"100",step:"1",value:a,onChange:a=>ag(c=>c.map((c,d)=>d===b?Number(a.target.value):c)),className:"flex-1 accent-[#31c98b]"})]})]},b)),(0,d.jsx)("div",{className:`mx-auto w-fit rounded-full px-3 py-1.5 text-xs font-black ${100===ah?"bg-[#31c98b] text-[#02110c]":"border border-[#ffb4a8]/50 text-[#ffb4a8]"}`,children:100===ah?"100% ready":ah<100?`${100-ah}% remaining`:`Over by ${ah-100}%`})]}),(0,d.jsx)(bw,{disabled:!ai,onClick:P,children:"Review split"})]}):"split-review"===b&&(as=(0,d.jsxs)(by,{className:"space-y-4",children:[(0,d.jsxs)("div",{children:[(0,d.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"Review split"}),(0,d.jsx)("p",{className:"text-sm font-semibold text-[#bdebd2]",children:"Choose a payer and continue to payment."})]}),X.map(a=>(0,d.jsxs)("div",{className:`space-y-2 rounded-3xl border p-3 ${Y===a.id?"border-[#31c98b] bg-[#31c98b]/12":"border-[#31c98b]/14 bg-[#04130f]/58"}`,children:[(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsxs)("div",{className:"flex items-center gap-2",children:[(0,d.jsx)("span",{className:"flex h-8 w-8 items-center justify-center rounded-full bg-[#31c98b]/20 text-sm font-black text-[#f4fff8]",children:a.avatar}),(0,d.jsx)("span",{className:"font-black text-[#f4fff8]",children:a.name})]}),(0,d.jsx)("span",{className:"rounded-full border border-[#31c98b]/20 px-2 py-1 text-[11px] font-bold text-[#dfffee]",children:a.status})]}),(0,d.jsxs)("div",{className:"space-y-1 text-xs text-[#c9f6df]",children:[a.items.map((b,c)=>(0,d.jsxs)("div",{className:"flex justify-between gap-2",children:[(0,d.jsx)("span",{className:"truncate",children:b.name}),(0,d.jsx)("span",{children:M(b.amount)})]},`${a.id}-${c}`)),a.tax>0&&(0,d.jsxs)("div",{className:"flex justify-between",children:[(0,d.jsx)("span",{children:"Proportional service/tax"}),(0,d.jsx)("span",{children:M(a.tax)})]})]}),(0,d.jsxs)("div",{className:"flex justify-between border-t border-[#31c98b]/14 pt-2 text-sm font-black text-[#f4fff8]",children:[(0,d.jsx)("span",{children:"Total"}),(0,d.jsx)("span",{className:"text-[#31c98b]",children:M(a.total)})]}),Y===a.id?(0,d.jsx)(bw,{onClick:()=>L("payment"),children:"Pay my share"}):(0,d.jsx)(bx,{onClick:()=>$(a.id),children:"Select payer"})]},a.id)),(0,d.jsxs)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:[(0,d.jsxs)(bx,{onClick:am,className:"flex items-center justify-center gap-2",children:[(0,d.jsx)(Z,{className:"h-4 w-4"})," Send payment link to others"]}),(0,d.jsxs)(bx,{onClick:an,className:"flex items-center justify-center gap-2",children:[(0,d.jsx)(_,{className:"h-4 w-4"})," Show QR/share link"]})]})]})),(0,d.jsxs)("div",{"data-pmd-checkout-theme-root":"1","data-pmd-checkout-theme":"modern_green","data-pmd-modern-green-checkout-shell":"1",className:"fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md",style:{background:"radial-gradient(circle at 82% 8%, rgba(6,62,43,.26) 0%, rgba(2,26,17,.13) 24%, rgba(0,4,3,.94) 54%, rgba(0,0,0,.98) 100%)"},children:[(0,d.jsx)("style",{children:`
          [data-pmd-modern-green-checkout-shell="1"] {
            --mg-bg: #000000;
            --mg-surface: linear-gradient(180deg, rgba(1,15,10,.985), rgba(0,8,5,.985));
            --mg-surface-2: linear-gradient(180deg, rgba(2,20,14,.94), rgba(1,12,8,.94));
            --mg-border: rgba(38,128,88,.48);
            --mg-border-soft: rgba(38,128,88,.34);
            --mg-primary: linear-gradient(180deg, rgba(3,48,36,.98), rgba(2,32,24,.98));
            --mg-secondary: linear-gradient(180deg, rgba(1,15,10,.99), rgba(0,8,5,.99));
            --mg-text: #f5fff8;
            --mg-muted: #c8f2dc;
            --mg-accent: #5fd49e;
          }

          [data-pmd-modern-green-checkout-shell="1"],
          [data-pmd-modern-green-checkout-shell="1"] * {
            font-family: inherit !important;
            text-shadow: none !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-unified-card="1"],
          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-card="1"],
          [data-pmd-modern-green-checkout-shell="1"] section {
            background: var(--mg-surface) !important;
            border-color: var(--mg-border) !important;
            color: var(--mg-text) !important;
            box-shadow: 0 0 0 1px rgba(13,80,52,.24), 0 24px 64px rgba(0,0,0,.52) !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] h2 {
            color: var(--mg-text) !important;
            -webkit-text-fill-color: var(--mg-text) !important;
            font-size: 1.75rem !important;
            line-height: 1.08 !important;
            letter-spacing: -0.035em !important;
            font-weight: 800 !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] p,
          [data-pmd-modern-green-checkout-shell="1"] span,
          [data-pmd-modern-green-checkout-shell="1"] label,
          [data-pmd-modern-green-checkout-shell="1"] div {
            color: var(--mg-text) !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] .rounded-2xl,
          [data-pmd-modern-green-checkout-shell="1"] .rounded-3xl {
            background: var(--mg-surface-2) !important;
            border-color: var(--mg-border-soft) !important;
            color: var(--mg-text) !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-unified-button="primary"],
          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-unified-button="secondary"],
          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-runtime-button="primary"],
          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-runtime-button="secondary"] {
            color: var(--mg-text) !important;
            -webkit-text-fill-color: var(--mg-text) !important;
            opacity: 1 !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-unified-button="primary"],
          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-runtime-button="primary"] {
            background: var(--mg-primary) !important;
            border-color: rgba(51,158,111,.42) !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-unified-button="secondary"],
          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-runtime-button="secondary"] {
            background: var(--mg-secondary) !important;
            border-color: rgba(51,158,111,.38) !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-unified-button="primary"] *,
          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-unified-button="secondary"] *,
          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-runtime-button="primary"] *,
          [data-pmd-modern-green-checkout-shell="1"] [data-pmd-mg-runtime-button="secondary"] * {
            color: var(--mg-text) !important;
            -webkit-text-fill-color: var(--mg-text) !important;
            opacity: 1 !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] [class*="text-[#31c98b]"] {
            color: var(--mg-accent) !important;
            -webkit-text-fill-color: var(--mg-accent) !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] .border-t {
            border-color: rgba(38,128,88,.38) !important;
          }

          [data-pmd-modern-green-checkout-shell="1"] input {
            background: #010b07 !important;
            border-color: rgba(38,128,88,.44) !important;
            color: var(--mg-text) !important;
            -webkit-text-fill-color: var(--mg-text) !important;
          }
        `}),(0,d.jsxs)("div",{className:"relative max-h-[90vh] w-full max-w-md overflow-y-auto",children:[(0,d.jsx)("button",{type:"button",onClick:c,className:"absolute right-3 top-3 z-20 rounded-full border border-[#31c98b]/30 bg-[#04130f]/90 px-3 py-1 text-xs font-bold text-[#e7fff3] shadow-[0_10px_24px_rgba(0,0,0,.25)]",children:"Close"}),as]})]})}function bC(a){if(!a?.isOpen)return null;let b=function(a){let{isOpen:b,isKazenJapaneseCheckoutVisual:c,isModernGreenCheckoutVisual:e,checkoutStep:f,onClose:g,hasPersonalItems:h,preferPersonalReview:i,modernGreenPersonalItems:j,tableDraft:k,modernGreenTableDraftItems:l,modernGreenTableDraftTotal:m,submittedSnapshot:n,modernGreenSubmittedItems:o,estimatedMinutes:p,subtotal:q,finalTotal:r,payableTotal:s,paymentBaseAmount:t,paymentPayableTotal:u,paymentTipAmount:v,paymentCouponDiscount:w,paidTipAmount:x,paidCouponDiscount:y,paidAmountTotal:z,submittedBaseTotal:A,paymentTipPercentage:B,paymentCustomTip:C,tipSettings:D,couponCode:E,setCouponCode:F,setCouponError:G,appliedCoupon:H,couponError:I,couponLoading:J,setCouponLoading:K,validateCoupon:L,removeCoupon:M,handleModernGreenApplyCoupon:N,handleModernGreenRemoveCoupon:O,visiblePaymentMethods:P,loadingPayments:Q,selectedPaymentMethod:R,handlePaymentMethodSelect:S,renderPaymentForm:T,renderPaymentButton:U,handleConfirmMyItems:V,handleSubmitTableDraft:W,handlePayment:X,setCheckoutStep:Y,startSplitFlow:Z,chooseSplitMethod:$,goToSplitReview:_,splitGuestCount:aa,addSplitGuest:ab,removeSplitGuest:ac,splitMethod:ad,splitGuestProfiles:ae,equalSplitPeople:af,activeSplitPeople:ag,selectedSplitPersonId:ah,setSelectedSplitPersonId:ai,selectedSplitPerson:aj,splitSourceItems:ak,itemAssignments:al,setItemAssignments:am,sharePercents:an,setSharePercents:ao,sharePercentTotal:ap,canConfirmSplitMethod:aq,splitGrandTotal:ar,updatePaymentTipPercentage:as,updatePaymentCustomTip:at,toast:au,reviewRating:av,setReviewRating:aw,reviewComment:ax,setReviewComment:ay,reviewSubmitStatus:aA,setReviewSubmitStatus:aB,reviewSubmitMessage:aC,canSubmitReview:aD,handleSubmitReview:aE,merchantSettings:aF,activeReviewSharePlatforms:aG,handleDownloadBusinessInvoice:aH,invoiceDownloadStatus:aI,invoiceDownloadMessage:aJ,isDarkTheme:aK}=a;return b?c?(0,d.jsx)(az,{checkoutStep:f,onClose:g,hasPersonalItems:h||i,personalItems:j,tableDraft:k,tableDraftItems:l,tableDraftTotal:m,submittedSnapshot:n,submittedItems:o,estimatedMinutes:p,subtotal:q,finalTotal:r,payableTotal:s,paymentBaseAmount:t,paymentPayableTotal:u,paymentTipAmount:v,paymentCouponDiscount:w,paidTipAmount:x,paidCouponDiscount:y,paidAmountTotal:z,submittedBaseTotal:A,paymentTipPercentage:B,paymentCustomTip:C,tipPercentages:D.percentages||[5,10],tipEnabled:!!D.enabled,couponCode:E,setCouponCode:a=>{F(a),G(null)},appliedCoupon:H,couponError:I,couponLoading:J,setCouponError:G,setCouponLoading:K,validateCoupon:L,onApplyCoupon:N,onRemoveCoupon:O,removeCoupon:M,visiblePaymentMethods:P,loadingPayments:Q,selectedPaymentMethod:R,onPaymentMethodSelect:S,renderPaymentForm:T,renderPaymentButton:U,handleConfirmMyItems:V,handleSubmitTableDraft:W,handlePayment:X,setCheckoutStep:Y,startSplitFlow:Z,chooseSplitMethod:$,goToSplitReview:_,splitGuestCount:aa,addSplitGuest:ab,removeSplitGuest:ac,splitMethod:ad,splitGuestProfiles:ae,equalSplitPeople:af||[],activeSplitPeople:ag,selectedSplitPersonId:ah,setSelectedSplitPersonId:ai,selectedSplitPerson:aj,splitSourceItems:ak,itemAssignments:al,setItemAssignments:am,sharePercents:an,setSharePercents:ao,sharePercentTotal:ap,canConfirmSplitMethod:aq,splitGrandTotal:ar,updatePaymentTipPercentage:as,updatePaymentCustomTip:at,onPaymentLinks:()=>au({title:"Payment links ready",description:"Share links can be generated by the payment API when multi-device checkout is enabled."}),onQrShare:()=>au({title:"QR share",description:"Ask guests to scan the table QR to pay their own share."}),reviewRating:av,setReviewRating:aw,reviewComment:ax,setReviewComment:ay,reviewSubmitStatus:aA,setReviewSubmitStatus:aB,reviewSubmitMessage:aC,canSubmitReview:aD,handleSubmitReview:aE,merchantSettings:aF,activeReviewSharePlatforms:aG,handleDownloadBusinessInvoice:aH,invoiceDownloadStatus:aI,invoiceDownloadMessage:aJ,isDarkTheme:aK}):e?(0,d.jsx)(bB,{checkoutStep:f,onClose:g,hasPersonalItems:h||i,personalItems:j,tableDraft:k,tableDraftItems:l,tableDraftTotal:m,submittedSnapshot:n,submittedItems:o,estimatedMinutes:p,subtotal:q,finalTotal:r,payableTotal:s,paymentBaseAmount:t,paymentPayableTotal:u,paymentTipAmount:v,paymentCouponDiscount:w,paymentTipPercentage:B,paymentCustomTip:C,tipPercentages:D.percentages||[5,10],tipEnabled:!!D.enabled,couponCode:E,setCouponCode:a=>{F(a),G(null)},appliedCoupon:H,couponError:I,couponLoading:J,onApplyCoupon:N,onRemoveCoupon:O,visiblePaymentMethods:P,loadingPayments:Q,selectedPaymentMethod:R,onPaymentMethodSelect:S,renderPaymentForm:T,renderPaymentButton:U,handleConfirmMyItems:V,handleSubmitTableDraft:W,handlePayment:X,setCheckoutStep:Y,startSplitFlow:Z,chooseSplitMethod:$,goToSplitReview:_,splitGuestCount:aa,addSplitGuest:ab,removeSplitGuest:ac,splitMethod:ad,splitGuestProfiles:ae,equalSplitPeople:af||[],activeSplitPeople:ag,selectedSplitPersonId:ah,setSelectedSplitPersonId:ai,selectedSplitPerson:aj,splitSourceItems:ak,itemAssignments:al,setItemAssignments:am,sharePercents:an,setSharePercents:ao,sharePercentTotal:ap,canConfirmSplitMethod:aq,splitGrandTotal:ar,updatePaymentTipPercentage:as,updatePaymentCustomTip:at,onPaymentLinks:()=>au({title:"Payment links ready",description:"Share links can be generated by the payment API when multi-device checkout is enabled."}),onQrShare:()=>au({title:"QR share",description:"Ask guests to scan the table QR to pay their own share."}),isDarkTheme:aK}):null:null}(a);return b||(0,d.jsx)(bs,{...a})}(cG=cJ||(cJ={})).INITIAL="initial",cG.PENDING="pending",cG.REJECTED="rejected",cG.RESOLVED="resolved",(cH=cK||(cK={})).LOADING_STATUS="setLoadingStatus",cH.RESET_OPTIONS="resetOptions",cH.SET_BRAINTREE_INSTANCE="braintreeInstance",(cI=cL||(cL={})).NUMBER="number",cI.CVV="cvv",cI.EXPIRATION_DATE="expirationDate",cI.EXPIRATION_MONTH="expirationMonth",cI.EXPIRATION_YEAR="expirationYear",cI.POSTAL_CODE="postalCode";var bD=function(a,b){return(bD=Object.setPrototypeOf||({__proto__:[]})instanceof Array&&function(a,b){a.__proto__=b}||function(a,b){for(var c in b)Object.prototype.hasOwnProperty.call(b,c)&&(a[c]=b[c])})(a,b)},bE=function(){return(bE=Object.assign||function(a){for(var b,c=1,d=arguments.length;c<d;c++)for(var e in b=arguments[c])Object.prototype.hasOwnProperty.call(b,e)&&(a[e]=b[e]);return a}).apply(this,arguments)};function bF(a,b){var c={};for(var d in a)Object.prototype.hasOwnProperty.call(a,d)&&0>b.indexOf(d)&&(c[d]=a[d]);if(null!=a&&"function"==typeof Object.getOwnPropertySymbols)for(var e=0,d=Object.getOwnPropertySymbols(a);e<d.length;e++)0>b.indexOf(d[e])&&Object.prototype.propertyIsEnumerable.call(a,d[e])&&(c[d[e]]=a[d[e]]);return c}function bG(a,b,c){if(c||2==arguments.length)for(var d,e=0,f=b.length;e<f;e++)!d&&e in b||(d||(d=Array.prototype.slice.call(b,0,e)),d[e]=b[e]);return a.concat(d||Array.prototype.slice.call(b))}"function"==typeof SuppressedError&&SuppressedError;var bH="data-react-paypal-script-id",bI="react-paypal-js",bJ="dataNamespace",bK="dataSdkIntegrationSource",bL="paypal";function bM(a){return void 0===a&&(a=bL),window[a]}function bN(a){var b=a.reactComponentName,c=a.sdkComponentKey,d=a.sdkRequestedComponents,e=void 0===d?"":d,f=a.sdkDataNamespace,g=c.charAt(0).toUpperCase().concat(c.substring(1)),h="Unable to render <".concat(b," /> because window.").concat(void 0===f?bL:f,".").concat(g," is undefined."),i="string"==typeof e?e:e.join(",");if(!i.includes(c)){var j=[i,c].filter(Boolean).join();h+="\nTo fix the issue, add '".concat(c,"' to the list of components passed to the parent PayPalScriptProvider:")+"\n`<PayPalScriptProvider options={{ components: '".concat(j,"'}}>`.")}return h}function bO(a){a[bH];var b=bF(a,[bH+""]);return"react-paypal-js-".concat(function(a){for(var b="",c=0;c<a.length;c++){var d=a[c].charCodeAt(0)*c;a[c+1]&&(d+=a[c+1].charCodeAt(0)*(c-1)),b+=String.fromCharCode(97+Math.abs(d)%26)}return b}(JSON.stringify(b)))}function bP(a,b){var c,d,e,f;switch(b.type){case cK.LOADING_STATUS:if("object"==typeof b.value)return bE(bE({},a),{loadingStatus:b.value.state,loadingStatusErrorMessage:b.value.message});return bE(bE({},a),{loadingStatus:b.value});case cK.RESET_OPTIONS:return e=a.options[bH],(null==(f=self.document.querySelector("script[".concat(bH,'="').concat(e,'"]')))?void 0:f.parentNode)&&f.parentNode.removeChild(f),bE(bE({},a),{loadingStatus:cJ.PENDING,options:bE(bE(((c={})[bK]=bI,c),b.value),((d={})[bH]="".concat(bO(b.value)),d))});case cK.SET_BRAINTREE_INSTANCE:return bE(bE({},a),{braintreePayPalCheckoutInstance:b.value});default:return a}}var bQ=(0,e.createContext)(null);function bR(){var a=function(a){if("function"==typeof(null==a?void 0:a.dispatch)&&0!==a.dispatch.length)return a;throw Error("usePayPalScriptReducer must be used within a PayPalScriptProvider")}((0,e.useContext)(bQ));return[bE(bE({},a),{isInitial:a.loadingStatus===cJ.INITIAL,isPending:a.loadingStatus===cJ.PENDING,isResolved:a.loadingStatus===cJ.RESOLVED,isRejected:a.loadingStatus===cJ.REJECTED}),a.dispatch]}(0,e.createContext)({});var bS=function(a){if("function"!=typeof a&&null!==a)throw TypeError("Class extends value "+String(a)+" is not a constructor or null");function b(){this.constructor=c}function c(b){var c=a.call(this,b)||this;return c.state={hasError:!1},c}return bD(c,a),c.prototype=null===a?Object.create(a):(b.prototype=a.prototype,new b),c.getDerivedStateFromError=function(){return{hasError:!0}},c.prototype.componentDidCatch=function(a,b){console.error("Error in PayPalButtons component:",a,b),"function"==typeof this.props.onError&&this.props.onError({message:a.message,name:a.name,stack:a.stack,componentStack:b.componentStack})},c.prototype.render=function(){return this.state.hasError?null:this.props.children},c}(e.Component),bT=function(a){var b,c,d=a.className,f=a.disabled,g=void 0!==f&&f,h=a.children,i=a.forceReRender,j=bF(a,["className","disabled","children","forceReRender"]),k="".concat(void 0===d?"":d," ").concat(g?"paypal-buttons-disabled":"").trim(),l=(0,e.useRef)(null),m=(0,e.useRef)(null),n=((b=(0,e.useRef)(new Proxy({},{get:function(a,b,c){return"function"==typeof a[b]?function(){for(var c=[],d=0;d<arguments.length;d++)c[d]=arguments[d];return a[b].apply(a,c)}:Reflect.get(a,b,c)}}))).current=Object.assign(b.current,j),b.current),o=bR()[0],p=o.isResolved,q=o.options,r=(0,e.useState)(null),s=r[0],t=r[1],u=(0,e.useState)(!0),v=u[0],w=u[1],x=(0,e.useState)(null)[1];function y(){null!==m.current&&m.current.close().catch(function(){})}return(null==(c=m.current)?void 0:c.updateProps)&&m.current.updateProps({message:j.message}),(0,e.useEffect)(function(){if(!1===p)return y;var a=bM(q.dataNamespace);if(void 0===a||void 0===a.Buttons)return x(function(){throw Error(bN({reactComponentName:bU.displayName,sdkComponentKey:"buttons",sdkRequestedComponents:q.components,sdkDataNamespace:q[bJ]}))}),y;try{m.current=a.Buttons(bE(bE({},n),{onInit:function(a,b){t(b),"function"==typeof j.onInit&&j.onInit(a,b)}}))}catch(a){return x(function(){throw Error("Failed to render <PayPalButtons /> component. Failed to initialize:  ".concat(a))})}return!1===m.current.isEligible()?w(!1):l.current&&m.current.render(l.current).catch(function(a){null!==l.current&&0!==l.current.children.length&&x(function(){throw Error("Failed to render <PayPalButtons /> component. ".concat(a))})}),y},bG(bG([p],void 0===i?[]:i,!0),[j.fundingSource],!1)),(0,e.useEffect)(function(){null!==s&&(!0===g?s.disable().catch(function(){}):s.enable().catch(function(){}))},[g,s]),e.default.createElement(e.default.Fragment,null,v?e.default.createElement("div",{ref:l,style:g?{opacity:.38}:{},className:k}):h)};bT.displayName="PayPalButtons";var bU=function(a){return e.default.createElement(bS,{onError:a.onError},e.default.createElement(bT,bE({},a)))};function bV(a,b){void 0===b&&(b={});var c=document.createElement("script");return c.src=a,Object.keys(b).forEach(function(a){c.setAttribute(a,b[a]),"data-csp-nonce"===a&&c.setAttribute("nonce",b["data-csp-nonce"])}),c}bU.displayName="PayPalButtons","function"==typeof SuppressedError&&SuppressedError;function bW(a,b){if("object"!=typeof a||null===a)throw Error("Expected an options object.");var c=a.environment;if(c&&"production"!==c&&"sandbox"!==c)throw Error('The `environment` option must be either "production" or "sandbox".');if(void 0!==b&&"function"!=typeof b)throw Error("Expected PromisePonyfill to be a function.")}var bX=function(a){var b=a.className,c=a.children,d=bF(a,["className","children"]),f=bR()[0],g=f.isResolved,h=f.options,i=(0,e.useRef)(null),j=(0,e.useState)(!0),k=j[0],l=j[1],m=(0,e.useState)(null)[1],n=function(a){var b=i.current;if(!b||!a.isEligible())return l(!1);b.firstChild&&b.removeChild(b.firstChild),a.render(b).catch(function(a){null!==b&&0!==b.children.length&&m(function(){throw Error("Failed to render <PayPalMarks /> component. ".concat(a))})})};return(0,e.useEffect)(function(){if(!1!==g){var a=bM(h[bJ]);if(void 0===a||void 0===a.Marks)return m(function(){throw Error(bN({reactComponentName:bX.displayName,sdkComponentKey:"marks",sdkRequestedComponents:h.components,sdkDataNamespace:h[bJ]}))});n(a.Marks(bE({},d)))}},[g,d.fundingSource]),e.default.createElement(e.default.Fragment,null,k?e.default.createElement("div",{ref:i,className:void 0===b?"":b}):c)};bX.displayName="PayPalMarks";var bY=function(a){var b=a.className,c=a.forceReRender,d=bF(a,["className","forceReRender"]),f=bR()[0],g=f.isResolved,h=f.options,i=(0,e.useRef)(null),j=(0,e.useRef)(null),k=(0,e.useState)(null)[1];return(0,e.useEffect)(function(){if(!1!==g){var a=bM(h[bJ]);if(void 0===a||void 0===a.Messages)return k(function(){throw Error(bN({reactComponentName:bY.displayName,sdkComponentKey:"messages",sdkRequestedComponents:h.components,sdkDataNamespace:h[bJ]}))});j.current=a.Messages(bE({},d)),j.current.render(i.current).catch(function(a){null!==i.current&&0!==i.current.children.length&&k(function(){throw Error("Failed to render <PayPalMessages /> component. ".concat(a))})})}},bG([g],void 0===c?[]:c,!0)),e.default.createElement("div",{ref:i,className:void 0===b?"":b})};bY.displayName="PayPalMessages";var bZ=function(a){var b,c=a.options,d=void 0===c?{clientId:"test"}:c,f=a.children,g=a.deferLoading,h=void 0!==g&&g,i=(0,e.useReducer)(bP,{options:bE(bE({},d),((b={}).dataJsSdkLibrary=bI,b[bK]=bI,b[bH]="".concat(bO(d)),b)),loadingStatus:h?cJ.INITIAL:cJ.PENDING}),j=i[0],k=i[1];return(0,e.useEffect)(function(){if(!1===h&&j.loadingStatus===cJ.INITIAL)return k({type:cK.LOADING_STATUS,value:cJ.PENDING});if(j.loadingStatus===cJ.PENDING){var a=!0;return(function(a,b){if(void 0===b&&(b=Promise),bW(a,b),"u"<typeof document)return b.resolve(null);var c,d,e,f,g,h,i,j,k,l,m=(f=Object.prototype.hasOwnProperty.call(a,"sdkBaseUrl")?a.sdkBaseUrl:void 0,g=a.environment,a.sdkBaseUrl,h=function(a,b){var c={};for(var d in a)Object.prototype.hasOwnProperty.call(a,d)&&0>b.indexOf(d)&&(c[d]=a[d]);if(null!=a&&"function"==typeof Object.getOwnPropertySymbols)for(var e=0,d=Object.getOwnPropertySymbols(a);e<d.length;e++)0>b.indexOf(d[e])&&Object.prototype.propertyIsEnumerable.call(a,d[e])&&(c[d[e]]=a[d[e]]);return c}(a,["environment","sdkBaseUrl"]),i=f||("sandbox"===g?"https://www.sandbox.paypal.com/sdk/js":"https://www.paypal.com/sdk/js"),k=(j=Object.keys(h).filter(function(a){return void 0!==h[a]&&null!==h[a]&&""!==h[a]}).reduce(function(a,b){var c=h[b].toString();return"data"===(b=b.replace(/[A-Z]+(?![a-z])|[A-Z]/g,function(a,b){return(b?"-":"")+a.toLowerCase()})).substring(0,4)||"crossorigin"===b?a.attributes[b]=c:a.queryParams[b]=c,a},{queryParams:{},attributes:{}})).queryParams,l=j.attributes,k["merchant-id"]&&-1!==k["merchant-id"].indexOf(",")&&(l["data-merchant-id"]=k["merchant-id"],k["merchant-id"]="*"),{url:"".concat(i,"?").concat((d="",Object.keys(c=k).forEach(function(a){0!==d.length&&(d+="&"),d+=a+"="+c[a]}),d)),attributes:l}),n=m.url,o=m.attributes,p=o["data-namespace"]||"paypal",q=(e=p,window[e]);return(o["data-js-sdk-library"]||(o["data-js-sdk-library"]="paypal-js"),function(a,b){var c=document.querySelector('script[src="'.concat(a,'"]'));if(null===c)return null;var d=bV(a,b),e=c.cloneNode();if(delete e.dataset.uidAuto,Object.keys(e.dataset).length!==Object.keys(d.dataset).length)return null;var f=!0;return Object.keys(e.dataset).forEach(function(a){e.dataset[a]!==d.dataset[a]&&(f=!1)}),f?c:null}(n,o)&&q)?b.resolve(q):(function(a,b){void 0===b&&(b=Promise),bW(a,b);var c=a.url,d=a.attributes;if("string"!=typeof c||0===c.length)throw Error("Invalid url.");if(void 0!==d&&"object"!=typeof d)throw Error("Expected attributes to be an object.");return new b(function(a,b){var e,f,g,h,i,j;if("u"<typeof document)return a();f=(e={url:c,attributes:d,onSuccess:function(){return a()},onError:function(){return b(Error('The script "'.concat(c,'" failed to load. Check the HTTP status code and response body in DevTools to learn more.')))}}).url,g=e.attributes,h=e.onSuccess,i=e.onError,(j=bV(f,g)).onerror=i,j.onload=h,document.head.insertBefore(j,document.head.firstElementChild)})})({url:n,attributes:o},b).then(function(){var a,b=(a=p,window[a]);if(b)return b;throw Error("The window.".concat(p," global variable is not available."))})})(j.options).then(function(){a&&k({type:cK.LOADING_STATUS,value:cJ.RESOLVED})}).catch(function(b){console.error("".concat("Failed to load the PayPal JS SDK script."," ").concat(b)),a&&k({type:cK.LOADING_STATUS,value:{state:cJ.REJECTED,message:String(b)}})}),function(){a=!1}}},[j.options,h,j.loadingStatus]),e.default.createElement(bQ.Provider,{value:bE(bE({},j),{dispatch:k})},f)};function b$(){}(0,e.createContext)({cardFieldsForm:null,fields:{},registerField:b$,unregisterField:b$});var b_=a.i(65593);function b0(a,b){var c=Object.keys(a);if(Object.getOwnPropertySymbols){var d=Object.getOwnPropertySymbols(a);b&&(d=d.filter(function(b){return Object.getOwnPropertyDescriptor(a,b).enumerable})),c.push.apply(c,d)}return c}function b1(a){for(var b=1;b<arguments.length;b++){var c=null!=arguments[b]?arguments[b]:{};b%2?b0(Object(c),!0).forEach(function(b){b3(a,b,c[b])}):Object.getOwnPropertyDescriptors?Object.defineProperties(a,Object.getOwnPropertyDescriptors(c)):b0(Object(c)).forEach(function(b){Object.defineProperty(a,b,Object.getOwnPropertyDescriptor(c,b))})}return a}function b2(a){return(b2="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(a){return typeof a}:function(a){return a&&"function"==typeof Symbol&&a.constructor===Symbol&&a!==Symbol.prototype?"symbol":typeof a})(a)}function b3(a,b,c){return b in a?Object.defineProperty(a,b,{value:c,enumerable:!0,configurable:!0,writable:!0}):a[b]=c,a}function b4(a,b){return function(a){if(Array.isArray(a))return a}(a)||function(a,b){var c,d,e=a&&("u">typeof Symbol&&a[Symbol.iterator]||a["@@iterator"]);if(null!=e){var f=[],g=!0,h=!1;try{for(e=e.call(a);!(g=(c=e.next()).done)&&(f.push(c.value),!b||f.length!==b);g=!0);}catch(a){h=!0,d=a}finally{try{g||null==e.return||e.return()}finally{if(h)throw d}}return f}}(a,b)||function(a,b){if(a){if("string"==typeof a)return b5(a,b);var c=Object.prototype.toString.call(a).slice(8,-1);if("Object"===c&&a.constructor&&(c=a.constructor.name),"Map"===c||"Set"===c)return Array.from(a);if("Arguments"===c||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(c))return b5(a,b)}}(a,b)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function b5(a,b){(null==b||b>a.length)&&(b=a.length);for(var c=0,d=Array(b);c<b;c++)d[c]=a[c];return d}var b6=function(a,b,c){var d=!!c,f=e.default.useRef(c);e.default.useEffect(function(){f.current=c},[c]),e.default.useEffect(function(){if(!d||!a)return function(){};var c=function(){f.current&&f.current.apply(f,arguments)};return a.on(b,c),function(){a.off(b,c)}},[d,b,a,f])},b7=function(a){var b=e.default.useRef(a);return e.default.useEffect(function(){b.current=a},[a]),b.current},b8=function(a){return null!==a&&"object"===b2(a)},b9="[object Object]",ca=function a(b,c){if(!b8(b)||!b8(c))return b===c;var d=Array.isArray(b);if(d!==Array.isArray(c))return!1;var e=Object.prototype.toString.call(b)===b9;if(e!==(Object.prototype.toString.call(c)===b9))return!1;if(!e&&!d)return b===c;var f=Object.keys(b),g=Object.keys(c);if(f.length!==g.length)return!1;for(var h={},i=0;i<f.length;i+=1)h[f[i]]=!0;for(var j=0;j<g.length;j+=1)h[g[j]]=!0;var k=Object.keys(h);return k.length===f.length&&k.every(function(d){return a(b[d],c[d])})},cb=function(a,b,c){return b8(a)?Object.keys(a).reduce(function(d,e){var f=!b8(b)||!ca(a[e],b[e]);return c.includes(e)?(f&&console.warn("Unsupported prop change: options.".concat(e," is not a mutable property.")),d):f?b1(b1({},d||{}),{},b3({},e,a[e])):d},null):null},cc="Invalid prop `stripe` supplied to `Elements`. We recommend using the `loadStripe` utility from `@stripe/stripe-js`. See https://stripe.com/docs/stripe-js/react#elements-props-stripe for details.",cd=function(a){var b=arguments.length>1&&void 0!==arguments[1]?arguments[1]:cc;if(null===a||b8(a)&&"function"==typeof a.elements&&"function"==typeof a.createToken&&"function"==typeof a.createPaymentMethod&&"function"==typeof a.confirmCardPayment)return a;throw Error(b)},ce=function(a){var b=arguments.length>1&&void 0!==arguments[1]?arguments[1]:cc;if(b8(a)&&"function"==typeof a.then)return{tag:"async",stripePromise:Promise.resolve(a).then(function(a){return cd(a,b)})};var c=cd(a,b);return null===c?{tag:"empty"}:{tag:"sync",stripe:c}},cf=function(a){a&&a._registerWrapper&&a.registerAppInfo&&(a._registerWrapper({name:"react-stripe-js",version:"5.6.1"}),a.registerAppInfo({name:"react-stripe-js",version:"5.6.1",url:"https://stripe.com/docs/stripe-js/react"}))},cg=e.default.createContext(null);cg.displayName="ElementsContext";var ch=function(a,b){if(!a)throw Error("Could not find Elements context; You need to wrap the part of your app that ".concat(b," in an <Elements> provider."));return a},ci=function(a){var b=a.stripe,c=a.options,d=a.children,f=e.default.useMemo(function(){return ce(b)},[b]),g=b4(e.default.useState(function(){return{stripe:"sync"===f.tag?f.stripe:null,elements:"sync"===f.tag?f.stripe.elements(c):null}}),2),h=g[0],i=g[1];e.default.useEffect(function(){var a=!0,b=function(a){i(function(b){return b.stripe?b:{stripe:a,elements:a.elements(c)}})};return"async"!==f.tag||h.stripe?"sync"!==f.tag||h.stripe||b(f.stripe):f.stripePromise.then(function(c){c&&a&&b(c)}),function(){a=!1}},[f,h,c]);var j=b7(b);e.default.useEffect(function(){null!==j&&j!==b&&console.warn("Unsupported prop change on Elements: You cannot change the `stripe` prop after setting it.")},[j,b]);var k=b7(c);return e.default.useEffect(function(){if(h.elements){var a=cb(c,k,["clientSecret","fonts"]);a&&h.elements.update(a)}},[c,k,h.elements]),e.default.useEffect(function(){cf(h.stripe)},[h.stripe]),e.default.createElement(cg.Provider,{value:h},d)};ci.propTypes={stripe:b_.default.any,options:b_.default.object};var cj=function(){var a;return(a="calls useElements()",ch(e.default.useContext(cg),a)).elements};b_.default.func.isRequired;var ck=e.default.createContext(null);ck.displayName="CheckoutContext",b_.default.any,b_.default.shape({clientSecret:b_.default.oneOfType([b_.default.string,b_.default.instanceOf(Promise)]).isRequired,elementsOptions:b_.default.object}).isRequired;var cl=function(a){var b=e.default.useContext(ck),c=e.default.useContext(cg);if(!b)return ch(c,a);if(!c)return b;throw Error("You cannot wrap the part of your app that ".concat(a," in both <CheckoutProvider> and <Elements> providers."))},cm=["mode"],cn=function(a,b){var c="".concat(a.charAt(0).toUpperCase()+a.slice(1),"Element"),d=b?function(a){cl("mounts <".concat(c,">"));var b=a.id,d=a.className;return e.default.createElement("div",{id:b,className:d})}:function(b){var d,f=b.id,g=b.className,h=b.options,i=void 0===h?{}:h,j=b.onBlur,k=b.onFocus,l=b.onReady,m=b.onChange,n=b.onEscape,o=b.onClick,p=b.onLoadError,q=b.onLoaderStart,r=b.onNetworksChange,s=b.onConfirm,t=b.onCancel,u=b.onShippingAddressChange,v=b.onShippingRateChange,w=b.onSavedPaymentMethodRemove,x=b.onSavedPaymentMethodUpdate,y=cl("mounts <".concat(c,">")),z="elements"in y?y.elements:null,A="checkoutState"in y?y.checkoutState:null,B=(null==A?void 0:A.type)==="success"||(null==A?void 0:A.type)==="loading"?A.sdk:null,C=b4(e.default.useState(null),2),D=C[0],E=C[1],F=e.default.useRef(null),G=e.default.useRef(null);b6(D,"blur",j),b6(D,"focus",k),b6(D,"escape",n),b6(D,"click",o),b6(D,"loaderror",p),b6(D,"loaderstart",q),b6(D,"networkschange",r),b6(D,"confirm",s),b6(D,"cancel",t),b6(D,"shippingaddresschange",u),b6(D,"shippingratechange",v),b6(D,"savedpaymentmethodremove",w),b6(D,"savedpaymentmethodupdate",x),b6(D,"change",m),l&&(d="expressCheckout"===a?l:function(){l(D)}),b6(D,"ready",d),e.default.useLayoutEffect(function(){if(null===F.current&&null!==G.current&&(z||B)){var b=null;if(B)switch(a){case"paymentForm":b=B.createPaymentFormElement(i);break;case"payment":b=B.createPaymentElement(i);break;case"address":if("mode"in i){var d=i.mode,e=function(a,b){if(null==a)return{};var c,d,e=function(a,b){if(null==a)return{};var c,d,e={},f=Object.keys(a);for(d=0;d<f.length;d++)c=f[d],b.indexOf(c)>=0||(e[c]=a[c]);return e}(a,b);if(Object.getOwnPropertySymbols){var f=Object.getOwnPropertySymbols(a);for(d=0;d<f.length;d++)c=f[d],!(b.indexOf(c)>=0)&&Object.prototype.propertyIsEnumerable.call(a,c)&&(e[c]=a[c])}return e}(i,cm);if("shipping"===d)b=B.createShippingAddressElement(e);else if("billing"===d)b=B.createBillingAddressElement(e);else throw Error("Invalid options.mode. mode must be 'billing' or 'shipping'.")}else throw Error("You must supply options.mode. mode must be 'billing' or 'shipping'.");break;case"expressCheckout":b=B.createExpressCheckoutElement(i);break;case"currencySelector":b=B.createCurrencySelectorElement();break;case"taxId":b=B.createTaxIdElement(i);break;default:throw Error("Invalid Element type ".concat(c,". You must use either the <PaymentElement />, <AddressElement options={{mode: 'shipping'}} />, <AddressElement options={{mode: 'billing'}} />, or <ExpressCheckoutElement />."))}else z&&(b=z.create(a,i));F.current=b,E(b),b&&b.mount(G.current)}},[z,B,i]);var H=b7(i);return e.default.useEffect(function(){if(F.current){var a=cb(i,H,["paymentRequest"]);a&&"update"in F.current&&F.current.update(a)}},[i,H]),e.default.useLayoutEffect(function(){return function(){if(F.current&&"function"==typeof F.current.destroy)try{F.current.destroy(),F.current=null}catch(a){}}},[]),e.default.createElement("div",{id:f,className:g,ref:G})};return d.propTypes={id:b_.default.string,className:b_.default.string,onChange:b_.default.func,onBlur:b_.default.func,onFocus:b_.default.func,onReady:b_.default.func,onEscape:b_.default.func,onClick:b_.default.func,onLoadError:b_.default.func,onLoaderStart:b_.default.func,onNetworksChange:b_.default.func,onConfirm:b_.default.func,onCancel:b_.default.func,onShippingAddressChange:b_.default.func,onShippingRateChange:b_.default.func,onSavedPaymentMethodRemove:b_.default.func,onSavedPaymentMethodUpdate:b_.default.func,options:b_.default.object},d.displayName=c,d.__elementType=a,d},co=e.default.createContext(null);co.displayName="EmbeddedCheckoutProviderContext";var cp=function(){return cl("calls useStripe()").stripe};cn("auBankAccount",!0);var cq=cn("card",!0);cn("cardNumber",!0),cn("cardExpiry",!0),cn("cardCvc",!0),cn("iban",!0),cn("payment",!0),cn("expressCheckout",!0);var cr=cn("paymentRequestButton",!0);cn("linkAuthentication",!0),cn("address",!0),cn("shippingAddress",!0),cn("paymentMethodMessaging",!0),cn("taxId",!0);var cs=a.i(38793);let ct=(0,U.default)("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);var cu=a.i(79373);function cv({paymentData:a,onPaymentComplete:b,onPaymentError:c,className:f,footerSlot:g}){let h=cp(),i=cj(),[j,k]=(0,e.useState)(!1),[l,m]=(0,e.useState)(null),[n,o]=(0,e.useState)({cardholderName:"",email:"",phone:""}),p=(0,e.useRef)(!1),q=(0,e.useRef)(null),r=(0,e.useRef)(!1),[s,t]=(0,e.useState)(!1),[u,v]=(0,e.useState)(!1),[w,x]=(0,e.useState)(!1),[y,z]=(0,e.useState)(!1),A=(0,e.useMemo)(()=>({text:"#111827",muted:"#6B7280"}),[]),B=(0,e.useMemo)(()=>({style:{base:{fontSize:"16px",color:A.text,iconColor:A.text,"::placeholder":{color:A.muted}},invalid:{color:"#EF4444",iconColor:"#EF4444"}}}),[A]),C=!!(h&&i&&s&&u&&w&&!j&&!p.current);(0,e.useEffect)(()=>{try{let a=document.querySelector('[data-pmd-checkout-theme-root="1"]')?.getAttribute("data-pmd-checkout-theme"),b="kazen_japanese"===a||"kazen-japanese"===a||!!document.querySelector('.kzco-overlay[data-kzco-root="1"]')||!!document.querySelector('[data-pmd-checkout-kazen-skin="1"]');z(b)}catch{z(!1)}return()=>{r.current=!1}},[]),(0,e.useEffect)(()=>{let a=q.current;a&&!("u"<typeof document)&&a.closest('[data-pmd-checkout-theme="kazen_japanese"], [data-pmd-checkout-theme="kazen-japanese"], .kzco-overlay')&&a.querySelectorAll("#cardholderName, #email, #phone").forEach(a=>{a.setAttribute("data-pmd-kazen-billing-field","1"),a.style.setProperty("border-radius","0px","important"),a.style.setProperty("-webkit-border-radius","0px","important"),a.style.setProperty("background","rgba(255, 251, 243, .78)","important"),a.style.setProperty("background-color","rgba(255, 251, 243, .78)","important"),a.style.setProperty("border","1px solid rgba(36, 35, 32, .24)","important"),a.style.setProperty("box-shadow","none","important"),a.style.setProperty("outline","none","important")})});let D=async d=>{if(d.preventDefault(),p.current||j)return;if(m(null),!h||!i){let a="Secure card payment is still loading. Please wait a moment and try again.";m(a),c(a);return}let e=i.getElement(cq);if(!e||!u||!r.current){let a="Secure card field is not ready yet. Please wait a moment and try again.";m(a),c(a);return}p.current=!0,k(!0);try{let c=Number(a?.amount||0),d=String(a?.currency||"EUR").toUpperCase();if(!c||c<=0)throw Error("Invalid payment amount");let f=await fetch("/api/v1/payments/stripe/create-intent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:c,currency:d,restaurantId:String(a?.restaurantId||"1"),tableNumber:a?.tableNumber??null,cartId:a?.cartId??null,userId:a?.userId??null,items:Array.isArray(a?.items)?a?.items:[],customerInfo:a?.customerInfo||{}})}),g=await f.json().catch(()=>({}));if(!f.ok||!g?.clientSecret)throw Error(g?.error||"Failed to create Stripe payment intent");let i=String(n.cardholderName||"").trim()||String(a?.customerInfo?.name||"").trim()||"Customer",j=String(n.email||"").trim()||void 0,k=String(n.phone||"").trim()||void 0,{error:l,paymentIntent:m}=await h.confirmCardPayment(g.clientSecret,{payment_method:{card:e,billing_details:{name:i,email:j,phone:k}}});if(l)throw Error(l.message||"Stripe payment confirmation failed");let o=String(m?.status||"");if(!m||!["succeeded","processing","requires_capture"].includes(o))throw Error(`Unexpected Stripe payment status: ${o||"unknown"}`);b({success:!0,transactionId:String(m.id),paymentMethod:"stripe"})}catch(b){let a="string"==typeof b?.message?b.message:"Stripe payment failed";m(a),c(a)}finally{p.current=!1,k(!1)}};return(0,d.jsxs)("form",{"data-pmd-stripe-form":"1","data-pmd-stripe-kazen-form":y?"1":void 0,onSubmit:D,className:(0,aD.cn)("space-y-4 bg-transparent w-full",f),children:[(0,d.jsx)("style",{"data-pmd-kazen-stripe-native-form-style":"1",dangerouslySetInnerHTML:{__html:`
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] {
              --pmd-kazen-card-red: #b85d59;
              --pmd-kazen-card-red-border: rgba(143, 55, 51, .68);
              --pmd-kazen-card-ink: #242320;
              --pmd-kazen-card-muted: rgba(36, 35, 32, .56);
              --pmd-kazen-card-field-bg: rgba(255, 251, 243, .72);
              --pmd-kazen-card-field-border: rgba(36, 35, 32, .22);
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] label,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-themed-label {
              color: var(--pmd-kazen-card-ink) !important;
              -webkit-text-fill-color: var(--pmd-kazen-card-ink) !important;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
              font-size: .86rem !important;
              font-weight: 800 !important;
              letter-spacing: -.02em !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input.pmd-themed-input,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input[data-pmd-themed-input],
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame {
              height: 52px !important;
              min-height: 52px !important;
              width: 100% !important;
              border-radius: 0 !important;
              background: var(--pmd-kazen-card-field-bg) !important;
              background-color: var(--pmd-kazen-card-field-bg) !important;
              border: 1px solid var(--pmd-kazen-card-field-border) !important;
              box-shadow: none !important;
              outline: none !important;
              color: var(--pmd-kazen-card-ink) !important;
              -webkit-text-fill-color: var(--pmd-kazen-card-ink) !important;
              font-size: 1rem !important;
              font-weight: 700 !important;
              letter-spacing: -.015em !important;
              transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input.pmd-themed-input,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input[data-pmd-themed-input] {
              padding: 0 16px !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame {
              display: flex !important;
              align-items: center !important;
              padding: 0 14px !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame .StripeElement,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame .__PrivateStripeElement {
              width: 100% !important;
              min-height: 22px !important;
              border: 0 !important;
              border-radius: 0 !important;
              background: transparent !important;
              box-shadow: none !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input.pmd-themed-input::placeholder,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input[data-pmd-themed-input]::placeholder {
              color: var(--pmd-kazen-card-muted) !important;
              -webkit-text-fill-color: var(--pmd-kazen-card-muted) !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input.pmd-themed-input:focus,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input[data-pmd-themed-input]:focus,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame:focus-within {
              border-color: rgba(184, 93, 89, .72) !important;
              background: rgba(255, 250, 242, .92) !important;
              box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .72) !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[data-pmd-stripe-native-button="1"],
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"],
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[type="submit"] {
              width: 100% !important;
              height: 52px !important;
              min-height: 52px !important;
              border-radius: 0 !important;
              background: var(--pmd-kazen-card-red) !important;
              background-color: var(--pmd-kazen-card-red) !important;
              background-image: none !important;
              border: 1px solid var(--pmd-kazen-card-red-border) !important;
              color: #fffaf3 !important;
              -webkit-text-fill-color: #fffaf3 !important;
              box-shadow: none !important;
              filter: none !important;
              opacity: 1 !important;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
              font-size: .82rem !important;
              font-weight: 850 !important;
              letter-spacing: .14em !important;
              line-height: 1 !important;
              text-transform: uppercase !important;
              padding: .86rem 1rem !important;
              transition: background-color .16s ease, border-color .16s ease, transform .16s ease !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[data-pmd-stripe-native-button="1"] *,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"] *,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[type="submit"] * {
              color: #fffaf3 !important;
              -webkit-text-fill-color: #fffaf3 !important;
              stroke: currentColor !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[data-pmd-stripe-native-button="1"]:not(:disabled):hover,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"]:not(:disabled):hover,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[type="submit"]:not(:disabled):hover {
              background: #c86460 !important;
              background-color: #c86460 !important;
              transform: translateY(-1px) !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[data-pmd-stripe-native-button="1"]:disabled,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"]:disabled,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[type="submit"]:disabled {
              background: var(--pmd-kazen-card-red) !important;
              background-color: var(--pmd-kazen-card-red) !important;
              background-image: none !important;
              border-color: var(--pmd-kazen-card-red-border) !important;
              color: #fffaf3 !important;
              -webkit-text-fill-color: #fffaf3 !important;
              opacity: .58 !important;
              cursor: not-allowed !important;
              transform: none !important;
            }

            html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"],
            html[data-pmd-kazen-mode="dark"] body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"],
            body[data-pmd-kazen-mode="dark"] form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] {
              --pmd-kazen-card-ink: #f4e7c8;
              --pmd-kazen-card-muted: rgba(244, 231, 200, .60);
              --pmd-kazen-card-field-bg: rgba(246, 232, 200, .055);
              --pmd-kazen-card-field-border: rgba(198, 164, 93, .36);
            }
          `}}),(0,d.jsxs)("div",{className:"space-y-3",children:[(0,d.jsxs)("div",{children:[(0,d.jsx)(cs.Label,{htmlFor:"cardholderName",className:"pmd-themed-label text-sm font-medium",children:"Cardholder Name"}),(0,d.jsx)(a7,{id:"cardholderName",type:"text",placeholder:"John Doe",value:n.cardholderName,onChange:a=>o(b=>({...b,cardholderName:a.target.value})),className:"mt-1 pmd-kazen-stripe-billing-input","data-pmd-kazen-billing-field":"1"})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)(cs.Label,{htmlFor:"email",className:"pmd-themed-label text-sm font-medium",children:"Email Address"}),(0,d.jsx)(a7,{id:"email",type:"email",placeholder:"john@example.com",value:n.email,onChange:a=>o(b=>({...b,email:a.target.value})),className:"mt-1 pmd-kazen-stripe-billing-input","data-pmd-kazen-billing-field":"1"})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)(cs.Label,{htmlFor:"phone",className:"pmd-themed-label text-sm font-medium",children:"Phone Number (Optional)"}),(0,d.jsx)(a7,{id:"phone",type:"tel",placeholder:"+1 (555) 123-4567",value:n.phone,onChange:a=>o(b=>({...b,phone:a.target.value})),className:"mt-1 pmd-kazen-stripe-billing-input","data-pmd-kazen-billing-field":"1"})]}),(0,d.jsxs)("div",{children:[(0,d.jsx)(cs.Label,{className:"pmd-themed-label text-sm font-medium",children:"Card Information"}),(0,d.jsx)("div",{className:"pmd-stripe-card-frame mt-1",children:(0,d.jsx)(cq,{options:B,onReady:()=>{r.current=!0,t(!0),v(!0),m(null)},onChange:a=>{x(!!a?.complete),m(a.error?a.error.message:null)}})}),l&&(0,d.jsxs)("div",{className:"flex items-center gap-2 mt-2 text-red-600 text-sm",children:[(0,d.jsx)(cu.AlertCircle,{className:"h-4 w-4"}),l]})]})]}),g?(0,d.jsx)("div",{className:"pt-3 pb-2 flex items-center gap-2",children:g}):null,(0,d.jsx)(a6,{type:"submit",disabled:!C,"data-pmd-stripe-native-button":"1",variant:"primary",fullWidth:!0,children:j?(0,d.jsxs)("span",{className:"flex w-full items-center justify-center gap-2",children:[(0,d.jsx)("span",{className:"h-4 w-4 animate-spin rounded-full border-2 border-current/35 border-t-current"}),(0,d.jsx)("span",{children:"Processing..."})]}):(0,d.jsxs)("span",{className:"flex w-full items-center justify-center gap-2",children:[(0,d.jsx)(ct,{className:"h-4 w-4 flex-none"}),(0,d.jsx)("span",{children:"Pay"})]})})]})}function cw(a,b){if(!({}).hasOwnProperty.call(a,b))throw TypeError("attempted to use private field on non-instance");return a}var cx=0;function cy(a){return"__private_"+cx+++"_"+a}var cz={options:{usePureJavaScript:!1}},cA="u">typeof globalThis?globalThis:a.g;function cB(a){var b={exports:{}};return a(b,b.exports),b.exports}var cC={},cD={};cC.encode=function(a,b,c){if("string"!=typeof b)throw TypeError('"alphabet" must be a string.');if(void 0!==c&&"number"!=typeof c)throw TypeError('"maxline" must be a number.');var d="";if(a instanceof Uint8Array){var e=0,f=b.length,g=b.charAt(0),h=[0];for(e=0;e<a.length;++e){for(var i=0,j=a[e];i<h.length;++i)h[i]=(j+=h[i]<<8)%f,j=j/f|0;for(;j>0;)h.push(j%f),j=j/f|0}for(e=0;0===a[e]&&e<a.length-1;++e)d+=g;for(e=h.length-1;e>=0;--e)d+=b[h[e]]}else d=function(a,b){var c=0,d=b.length,e=b.charAt(0),f=[0];for(c=0;c<a.length();++c){for(var g=0,h=a.at(c);g<f.length;++g)f[g]=(h+=f[g]<<8)%d,h=h/d|0;for(;h>0;)f.push(h%d),h=h/d|0}var i="";for(c=0;0===a.at(c)&&c<a.length()-1;++c)i+=e;for(c=f.length-1;c>=0;--c)i+=b[f[c]];return i}(a,b);if(c){var k=RegExp(".{1,"+c+"}","g");d=d.match(k).join("\r\n")}return d},cC.decode=function(a,b){if("string"!=typeof a)throw TypeError('"input" must be a string.');if("string"!=typeof b)throw TypeError('"alphabet" must be a string.');var c=cD[b];if(!c){c=cD[b]=[];for(var d=0;d<b.length;++d)c[b.charCodeAt(d)]=d}a=a.replace(/\s/g,"");var e=b.length,f=b.charAt(0),g=[0];for(d=0;d<a.length;d++){var h=c[a.charCodeAt(d)];if(void 0===h)return;for(var i=0,j=h;i<g.length;++i)g[i]=255&(j+=g[i]*e),j>>=8;for(;j>0;)g.push(255&j),j>>=8}for(var k=0;a[k]===f&&k<a.length-1;++k)g.push(0);return"u">typeof Buffer?Buffer.from(g.reverse()):new Uint8Array(g.reverse())},cB(function(a){var b=a.exports=cz.util=cz.util||{};function c(a){if(8!==a&&16!==a&&24!==a&&32!==a)throw Error("Only 8, 16, 24, or 32 bits supported: "+a)}function d(a){if(this.data="",this.read=0,"string"==typeof a)this.data=a;else if(b.isArrayBuffer(a)||b.isArrayBufferView(a))if("u">typeof Buffer&&a instanceof Buffer)this.data=a.toString("binary");else{var c=new Uint8Array(a);try{this.data=String.fromCharCode.apply(null,c)}catch(a){for(var e=0;e<c.length;++e)this.putByte(c[e])}}else(a instanceof d||"object"==typeof a&&"string"==typeof a.data&&"number"==typeof a.read)&&(this.data=a.data,this.read=a.read);this._constructedStringLength=0}!function(){if("u">typeof process&&process.nextTick&&1)return b.nextTick=process.nextTick,b.setImmediate="function"==typeof setImmediate?setImmediate:b.nextTick;if("function"==typeof setImmediate)return b.setImmediate=function(){return setImmediate.apply(void 0,arguments)},b.nextTick=function(a){return setImmediate(a)};if(b.setImmediate=function(a){setTimeout(a,0)},"u">typeof MutationObserver){var a,c=Date.now(),d=!0,e=document.createElement("div");a=[],new MutationObserver(function(){var b=a.slice();a.length=0,b.forEach(function(a){a()})}).observe(e,{attributes:!0});var f=b.setImmediate;b.setImmediate=function(b){Date.now()-c>15?(c=Date.now(),f(b)):(a.push(b),1===a.length&&e.setAttribute("a",d=!d))}}b.nextTick=b.setImmediate}(),b.isNodejs="u">typeof process&&process.versions&&process.versions.node,b.globalScope=b.isNodejs?cA:"u"<typeof self?window:self,b.isArray=Array.isArray||function(a){return"[object Array]"===Object.prototype.toString.call(a)},b.isArrayBuffer=function(a){return"u">typeof ArrayBuffer&&a instanceof ArrayBuffer},b.isArrayBufferView=function(a){return a&&b.isArrayBuffer(a.buffer)&&void 0!==a.byteLength},b.ByteBuffer=d,b.ByteStringBuffer=d,b.ByteStringBuffer.prototype._optimizeConstructedString=function(a){this._constructedStringLength+=a,this._constructedStringLength>4096&&(this.data.substr(0,1),this._constructedStringLength=0)},b.ByteStringBuffer.prototype.length=function(){return this.data.length-this.read},b.ByteStringBuffer.prototype.isEmpty=function(){return 0>=this.length()},b.ByteStringBuffer.prototype.putByte=function(a){return this.putBytes(String.fromCharCode(a))},b.ByteStringBuffer.prototype.fillWithByte=function(a,b){a=String.fromCharCode(a);for(var c=this.data;b>0;)1&b&&(c+=a),(b>>>=1)>0&&(a+=a);return this.data=c,this._optimizeConstructedString(b),this},b.ByteStringBuffer.prototype.putBytes=function(a){return this.data+=a,this._optimizeConstructedString(a.length),this},b.ByteStringBuffer.prototype.putString=function(a){return this.putBytes(b.encodeUtf8(a))},b.ByteStringBuffer.prototype.putInt16=function(a){return this.putBytes(String.fromCharCode(a>>8&255)+String.fromCharCode(255&a))},b.ByteStringBuffer.prototype.putInt24=function(a){return this.putBytes(String.fromCharCode(a>>16&255)+String.fromCharCode(a>>8&255)+String.fromCharCode(255&a))},b.ByteStringBuffer.prototype.putInt32=function(a){return this.putBytes(String.fromCharCode(a>>24&255)+String.fromCharCode(a>>16&255)+String.fromCharCode(a>>8&255)+String.fromCharCode(255&a))},b.ByteStringBuffer.prototype.putInt16Le=function(a){return this.putBytes(String.fromCharCode(255&a)+String.fromCharCode(a>>8&255))},b.ByteStringBuffer.prototype.putInt24Le=function(a){return this.putBytes(String.fromCharCode(255&a)+String.fromCharCode(a>>8&255)+String.fromCharCode(a>>16&255))},b.ByteStringBuffer.prototype.putInt32Le=function(a){return this.putBytes(String.fromCharCode(255&a)+String.fromCharCode(a>>8&255)+String.fromCharCode(a>>16&255)+String.fromCharCode(a>>24&255))},b.ByteStringBuffer.prototype.putInt=function(a,b){c(b);var d="";do b-=8,d+=String.fromCharCode(a>>b&255);while(b>0)return this.putBytes(d)},b.ByteStringBuffer.prototype.putSignedInt=function(a,b){return a<0&&(a+=2<<b-1),this.putInt(a,b)},b.ByteStringBuffer.prototype.putBuffer=function(a){return this.putBytes(a.getBytes())},b.ByteStringBuffer.prototype.getByte=function(){return this.data.charCodeAt(this.read++)},b.ByteStringBuffer.prototype.getInt16=function(){var a=this.data.charCodeAt(this.read)<<8^this.data.charCodeAt(this.read+1);return this.read+=2,a},b.ByteStringBuffer.prototype.getInt24=function(){var a=this.data.charCodeAt(this.read)<<16^this.data.charCodeAt(this.read+1)<<8^this.data.charCodeAt(this.read+2);return this.read+=3,a},b.ByteStringBuffer.prototype.getInt32=function(){var a=this.data.charCodeAt(this.read)<<24^this.data.charCodeAt(this.read+1)<<16^this.data.charCodeAt(this.read+2)<<8^this.data.charCodeAt(this.read+3);return this.read+=4,a},b.ByteStringBuffer.prototype.getInt16Le=function(){var a=this.data.charCodeAt(this.read)^this.data.charCodeAt(this.read+1)<<8;return this.read+=2,a},b.ByteStringBuffer.prototype.getInt24Le=function(){var a=this.data.charCodeAt(this.read)^this.data.charCodeAt(this.read+1)<<8^this.data.charCodeAt(this.read+2)<<16;return this.read+=3,a},b.ByteStringBuffer.prototype.getInt32Le=function(){var a=this.data.charCodeAt(this.read)^this.data.charCodeAt(this.read+1)<<8^this.data.charCodeAt(this.read+2)<<16^this.data.charCodeAt(this.read+3)<<24;return this.read+=4,a},b.ByteStringBuffer.prototype.getInt=function(a){c(a);var b=0;do b=(b<<8)+this.data.charCodeAt(this.read++),a-=8;while(a>0)return b},b.ByteStringBuffer.prototype.getSignedInt=function(a){var b=this.getInt(a),c=2<<a-2;return b>=c&&(b-=c<<1),b},b.ByteStringBuffer.prototype.getBytes=function(a){var b;return a?(a=Math.min(this.length(),a),b=this.data.slice(this.read,this.read+a),this.read+=a):0===a?b="":(b=0===this.read?this.data:this.data.slice(this.read),this.clear()),b},b.ByteStringBuffer.prototype.bytes=function(a){return void 0===a?this.data.slice(this.read):this.data.slice(this.read,this.read+a)},b.ByteStringBuffer.prototype.at=function(a){return this.data.charCodeAt(this.read+a)},b.ByteStringBuffer.prototype.setAt=function(a,b){return this.data=this.data.substr(0,this.read+a)+String.fromCharCode(b)+this.data.substr(this.read+a+1),this},b.ByteStringBuffer.prototype.last=function(){return this.data.charCodeAt(this.data.length-1)},b.ByteStringBuffer.prototype.copy=function(){var a=b.createBuffer(this.data);return a.read=this.read,a},b.ByteStringBuffer.prototype.compact=function(){return this.read>0&&(this.data=this.data.slice(this.read),this.read=0),this},b.ByteStringBuffer.prototype.clear=function(){return this.data="",this.read=0,this},b.ByteStringBuffer.prototype.truncate=function(a){var b=Math.max(0,this.length()-a);return this.data=this.data.substr(this.read,b),this.read=0,this},b.ByteStringBuffer.prototype.toHex=function(){for(var a="",b=this.read;b<this.data.length;++b){var c=this.data.charCodeAt(b);c<16&&(a+="0"),a+=c.toString(16)}return a},b.ByteStringBuffer.prototype.toString=function(){return b.decodeUtf8(this.bytes())},b.DataBuffer=function(a,c){this.read=(c=c||{}).readOffset||0,this.growSize=c.growSize||1024;var d=b.isArrayBuffer(a),e=b.isArrayBufferView(a);d||e?(this.data=d?new DataView(a):new DataView(a.buffer,a.byteOffset,a.byteLength),this.write="writeOffset"in c?c.writeOffset:this.data.byteLength):(this.data=new DataView(new ArrayBuffer(0)),this.write=0,null!=a&&this.putBytes(a),"writeOffset"in c&&(this.write=c.writeOffset))},b.DataBuffer.prototype.length=function(){return this.write-this.read},b.DataBuffer.prototype.isEmpty=function(){return 0>=this.length()},b.DataBuffer.prototype.accommodate=function(a,b){if(this.length()>=a)return this;b=Math.max(b||this.growSize,a);var c=new Uint8Array(this.data.buffer,this.data.byteOffset,this.data.byteLength),d=new Uint8Array(this.length()+b);return d.set(c),this.data=new DataView(d.buffer),this},b.DataBuffer.prototype.putByte=function(a){return this.accommodate(1),this.data.setUint8(this.write++,a),this},b.DataBuffer.prototype.fillWithByte=function(a,b){this.accommodate(b);for(var c=0;c<b;++c)this.data.setUint8(a);return this},b.DataBuffer.prototype.putBytes=function(a,c){if(b.isArrayBufferView(a)){var d,e=(f=new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).byteLength-f.byteOffset;return this.accommodate(e),new Uint8Array(this.data.buffer,this.write).set(f),this.write+=e,this}if(b.isArrayBuffer(a)){var f=new Uint8Array(a);return this.accommodate(f.byteLength),new Uint8Array(this.data.buffer).set(f,this.write),this.write+=f.byteLength,this}if(a instanceof b.DataBuffer||"object"==typeof a&&"number"==typeof a.read&&"number"==typeof a.write&&b.isArrayBufferView(a.data))return f=new Uint8Array(a.data.byteLength,a.read,a.length()),this.accommodate(f.byteLength),new Uint8Array(a.data.byteLength,this.write).set(f),this.write+=f.byteLength,this;if(a instanceof b.ByteStringBuffer&&(a=a.data,c="binary"),c=c||"binary","string"==typeof a){if("hex"===c)return this.accommodate(Math.ceil(a.length/2)),d=new Uint8Array(this.data.buffer,this.write),this.write+=b.binary.hex.decode(a,d,this.write),this;if("base64"===c)return this.accommodate(3*Math.ceil(a.length/4)),d=new Uint8Array(this.data.buffer,this.write),this.write+=b.binary.base64.decode(a,d,this.write),this;if("utf8"===c&&(a=b.encodeUtf8(a),c="binary"),"binary"===c||"raw"===c)return this.accommodate(a.length),d=new Uint8Array(this.data.buffer,this.write),this.write+=b.binary.raw.decode(d),this;if("utf16"===c)return this.accommodate(2*a.length),d=new Uint16Array(this.data.buffer,this.write),this.write+=b.text.utf16.encode(d),this;throw Error("Invalid encoding: "+c)}throw Error("Invalid parameter: "+a)},b.DataBuffer.prototype.putBuffer=function(a){return this.putBytes(a),a.clear(),this},b.DataBuffer.prototype.putString=function(a){return this.putBytes(a,"utf16")},b.DataBuffer.prototype.putInt16=function(a){return this.accommodate(2),this.data.setInt16(this.write,a),this.write+=2,this},b.DataBuffer.prototype.putInt24=function(a){return this.accommodate(3),this.data.setInt16(this.write,a>>8&65535),this.data.setInt8(this.write,a>>16&255),this.write+=3,this},b.DataBuffer.prototype.putInt32=function(a){return this.accommodate(4),this.data.setInt32(this.write,a),this.write+=4,this},b.DataBuffer.prototype.putInt16Le=function(a){return this.accommodate(2),this.data.setInt16(this.write,a,!0),this.write+=2,this},b.DataBuffer.prototype.putInt24Le=function(a){return this.accommodate(3),this.data.setInt8(this.write,a>>16&255),this.data.setInt16(this.write,a>>8&65535,!0),this.write+=3,this},b.DataBuffer.prototype.putInt32Le=function(a){return this.accommodate(4),this.data.setInt32(this.write,a,!0),this.write+=4,this},b.DataBuffer.prototype.putInt=function(a,b){c(b),this.accommodate(b/8);do b-=8,this.data.setInt8(this.write++,a>>b&255);while(b>0)return this},b.DataBuffer.prototype.putSignedInt=function(a,b){return c(b),this.accommodate(b/8),a<0&&(a+=2<<b-1),this.putInt(a,b)},b.DataBuffer.prototype.getByte=function(){return this.data.getInt8(this.read++)},b.DataBuffer.prototype.getInt16=function(){var a=this.data.getInt16(this.read);return this.read+=2,a},b.DataBuffer.prototype.getInt24=function(){var a=this.data.getInt16(this.read)<<8^this.data.getInt8(this.read+2);return this.read+=3,a},b.DataBuffer.prototype.getInt32=function(){var a=this.data.getInt32(this.read);return this.read+=4,a},b.DataBuffer.prototype.getInt16Le=function(){var a=this.data.getInt16(this.read,!0);return this.read+=2,a},b.DataBuffer.prototype.getInt24Le=function(){var a=this.data.getInt8(this.read)^this.data.getInt16(this.read+1,!0)<<8;return this.read+=3,a},b.DataBuffer.prototype.getInt32Le=function(){var a=this.data.getInt32(this.read,!0);return this.read+=4,a},b.DataBuffer.prototype.getInt=function(a){c(a);var b=0;do b=(b<<8)+this.data.getInt8(this.read++),a-=8;while(a>0)return b},b.DataBuffer.prototype.getSignedInt=function(a){var b=this.getInt(a),c=2<<a-2;return b>=c&&(b-=c<<1),b},b.DataBuffer.prototype.getBytes=function(a){var b;return a?(a=Math.min(this.length(),a),b=this.data.slice(this.read,this.read+a),this.read+=a):0===a?b="":(b=0===this.read?this.data:this.data.slice(this.read),this.clear()),b},b.DataBuffer.prototype.bytes=function(a){return void 0===a?this.data.slice(this.read):this.data.slice(this.read,this.read+a)},b.DataBuffer.prototype.at=function(a){return this.data.getUint8(this.read+a)},b.DataBuffer.prototype.setAt=function(a,b){return this.data.setUint8(a,b),this},b.DataBuffer.prototype.last=function(){return this.data.getUint8(this.write-1)},b.DataBuffer.prototype.copy=function(){return new b.DataBuffer(this)},b.DataBuffer.prototype.compact=function(){if(this.read>0){var a=new Uint8Array(this.data.buffer,this.read),b=new Uint8Array(a.byteLength);b.set(a),this.data=new DataView(b),this.write-=this.read,this.read=0}return this},b.DataBuffer.prototype.clear=function(){return this.data=new DataView(new ArrayBuffer(0)),this.read=this.write=0,this},b.DataBuffer.prototype.truncate=function(a){return this.write=Math.max(0,this.length()-a),this.read=Math.min(this.read,this.write),this},b.DataBuffer.prototype.toHex=function(){for(var a="",b=this.read;b<this.data.byteLength;++b){var c=this.data.getUint8(b);c<16&&(a+="0"),a+=c.toString(16)}return a},b.DataBuffer.prototype.toString=function(a){var c=new Uint8Array(this.data,this.read,this.length());if("binary"===(a=a||"utf8")||"raw"===a)return b.binary.raw.encode(c);if("hex"===a)return b.binary.hex.encode(c);if("base64"===a)return b.binary.base64.encode(c);if("utf8"===a)return b.text.utf8.decode(c);if("utf16"===a)return b.text.utf16.decode(c);throw Error("Invalid encoding: "+a)},b.createBuffer=function(a,c){return c=c||"raw",void 0!==a&&"utf8"===c&&(a=b.encodeUtf8(a)),new b.ByteBuffer(a)},b.fillString=function(a,b){for(var c="";b>0;)1&b&&(c+=a),(b>>>=1)>0&&(a+=a);return c},b.xorBytes=function(a,b,c){for(var d="",e="",f="",g=0,h=0;c>0;--c,++g)e=a.charCodeAt(g)^b.charCodeAt(g),h>=10&&(d+=f,f="",h=0),f+=String.fromCharCode(e),++h;return d+f},b.hexToBytes=function(a){var b="",c=0;for(!0&a.length&&(c=1,b+=String.fromCharCode(parseInt(a[0],16)));c<a.length;c+=2)b+=String.fromCharCode(parseInt(a.substr(c,2),16));return b},b.bytesToHex=function(a){return b.createBuffer(a).toHex()},b.int32ToBytes=function(a){return String.fromCharCode(a>>24&255)+String.fromCharCode(a>>16&255)+String.fromCharCode(a>>8&255)+String.fromCharCode(255&a)};var e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",f=[62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,64,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51],g="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";b.encode64=function(a,b){for(var c,d,f,g="",h="",i=0;i<a.length;)c=a.charCodeAt(i++),d=a.charCodeAt(i++),f=a.charCodeAt(i++),g+=e.charAt(c>>2),g+=e.charAt((3&c)<<4|d>>4),isNaN(d)?g+="==":(g+=e.charAt((15&d)<<2|f>>6),g+=isNaN(f)?"=":e.charAt(63&f)),b&&g.length>b&&(h+=g.substr(0,b)+"\r\n",g=g.substr(b));return h+g},b.decode64=function(a){a=a.replace(/[^A-Za-z0-9\+\/\=]/g,"");for(var b,c,d,e,g="",h=0;h<a.length;)b=f[a.charCodeAt(h++)-43],c=f[a.charCodeAt(h++)-43],d=f[a.charCodeAt(h++)-43],e=f[a.charCodeAt(h++)-43],g+=String.fromCharCode(b<<2|c>>4),64!==d&&(g+=String.fromCharCode((15&c)<<4|d>>2),64!==e&&(g+=String.fromCharCode((3&d)<<6|e)));return g},b.encodeUtf8=function(a){return unescape(encodeURIComponent(a))},b.decodeUtf8=function(a){return decodeURIComponent(escape(a))},b.binary={raw:{},hex:{},base64:{},base58:{},baseN:{encode:cC.encode,decode:cC.decode}},b.binary.raw.encode=function(a){return String.fromCharCode.apply(null,a)},b.binary.raw.decode=function(a,b,c){var d=b;d||(d=new Uint8Array(a.length));for(var e=c=c||0,f=0;f<a.length;++f)d[e++]=a.charCodeAt(f);return b?e-c:d},b.binary.hex.encode=b.bytesToHex,b.binary.hex.decode=function(a,b,c){var d=b;d||(d=new Uint8Array(Math.ceil(a.length/2)));var e=0,f=c=c||0;for(1&a.length&&(e=1,d[f++]=parseInt(a[0],16));e<a.length;e+=2)d[f++]=parseInt(a.substr(e,2),16);return b?f-c:d},b.binary.base64.encode=function(a,b){for(var c,d,f,g="",h="",i=0;i<a.byteLength;)c=a[i++],d=a[i++],f=a[i++],g+=e.charAt(c>>2),g+=e.charAt((3&c)<<4|d>>4),isNaN(d)?g+="==":(g+=e.charAt((15&d)<<2|f>>6),g+=isNaN(f)?"=":e.charAt(63&f)),b&&g.length>b&&(h+=g.substr(0,b)+"\r\n",g=g.substr(b));return h+g},b.binary.base64.decode=function(a,b,c){var d,e,g,h,i=b;i||(i=new Uint8Array(3*Math.ceil(a.length/4))),a=a.replace(/[^A-Za-z0-9\+\/\=]/g,"");for(var j=0,k=c=c||0;j<a.length;)d=f[a.charCodeAt(j++)-43],e=f[a.charCodeAt(j++)-43],g=f[a.charCodeAt(j++)-43],h=f[a.charCodeAt(j++)-43],i[k++]=d<<2|e>>4,64!==g&&(i[k++]=(15&e)<<4|g>>2,64!==h&&(i[k++]=(3&g)<<6|h));return b?k-c:i.subarray(0,k)},b.binary.base58.encode=function(a,c){return b.binary.baseN.encode(a,g,c)},b.binary.base58.decode=function(a,c){return b.binary.baseN.decode(a,g,c)},b.text={utf8:{},utf16:{}},b.text.utf8.encode=function(a,c,d){a=b.encodeUtf8(a);var e=c;e||(e=new Uint8Array(a.length));for(var f=d=d||0,g=0;g<a.length;++g)e[f++]=a.charCodeAt(g);return c?f-d:e},b.text.utf8.decode=function(a){return b.decodeUtf8(String.fromCharCode.apply(null,a))},b.text.utf16.encode=function(a,b,c){var d=b;d||(d=new Uint8Array(2*a.length));for(var e=new Uint16Array(d.buffer),f=c=c||0,g=c,h=0;h<a.length;++h)e[g++]=a.charCodeAt(h),f+=2;return b?f-c:d},b.text.utf16.decode=function(a){return String.fromCharCode.apply(null,new Uint16Array(a.buffer))},b.deflate=function(a,c,d){if(c=b.decode64(a.deflate(b.encode64(c)).rval),d){var e=2;32&c.charCodeAt(1)&&(e=6),c=c.substring(e,c.length-4)}return c},b.inflate=function(a,c,d){var e=a.inflate(b.encode64(c)).rval;return null===e?null:b.decode64(e)};var h=function(a,c,d){if(!a)throw Error("WebStorage not available.");if(null===d?e=a.removeItem(c):(d=b.encode64(JSON.stringify(d)),e=a.setItem(c,d)),void 0!==e&&!0!==e.rval){var e,f=Error(e.error.message);throw f.id=e.error.id,f.name=e.error.name,f}},i=function(a,c){if(!a)throw Error("WebStorage not available.");var d=a.getItem(c);if(a.init)if(null===d.rval){if(d.error){var e=Error(d.error.message);throw e.id=d.error.id,e.name=d.error.name,e}d=null}else d=d.rval;return null!==d&&(d=JSON.parse(b.decode64(d))),d},j=function(a,b,c,d){var e=i(a,b);null===e&&(e={}),e[c]=d,h(a,b,e)},k=function(a,b,c){var d=i(a,b);return null!==d&&(d=c in d?d[c]:null),d},l=function(a,b,c){var d=i(a,b);if(null!==d&&c in d){delete d[c];var e=!0;for(var f in d){e=!1;break}e&&(d=null),h(a,b,d)}},m=function(a,b){h(a,b,null)},n=function(a,b,c){var d,e=null;void 0===c&&(c=["web","flash"]);var f=!1,g=null;for(var h in c){d=c[h];try{if("flash"===d||"both"===d){if(null===b[0])throw Error("Flash local storage not available.");e=a.apply(this,b),f="flash"===d}"web"!==d&&"both"!==d||(b[0]=localStorage,e=a.apply(this,b),f=!0)}catch(a){g=a}if(f)break}if(!f)throw g;return e};b.setItem=function(a,b,c,d,e){n(j,arguments,e)},b.getItem=function(a,b,c,d){return n(k,arguments,d)},b.removeItem=function(a,b,c,d){n(l,arguments,d)},b.clearItems=function(a,b,c){n(m,arguments,c)},b.isEmpty=function(a){for(var b in a)if(a.hasOwnProperty(b))return!1;return!0},b.format=function(a){for(var b,c,d=/%./g,e=0,f=[],g=0;b=d.exec(a);){(c=a.substring(g,d.lastIndex-2)).length>0&&f.push(c),g=d.lastIndex;var h=b[0][1];switch(h){case"s":case"o":f.push(e<arguments.length?arguments[1+e++]:"<?>");break;case"%":f.push("%");break;default:f.push("<%"+h+"?>")}}return f.push(a.substring(g)),f.join("")},b.formatNumber=function(a,b,c,d){var e=a,f=isNaN(b=Math.abs(b))?2:b,g=void 0===d?".":d,h=e<0?"-":"",i=parseInt(e=Math.abs(+e||0).toFixed(f),10)+"",j=i.length>3?i.length%3:0;return h+(j?i.substr(0,j)+g:"")+i.substr(j).replace(/(\d{3})(?=\d)/g,"$1"+g)+(f?(void 0===c?",":c)+Math.abs(e-i).toFixed(f).slice(2):"")},b.formatSize=function(a){return a>=0x40000000?b.formatNumber(a/0x40000000,2,".","")+" GiB":a>=1048576?b.formatNumber(a/1048576,2,".","")+" MiB":a>=1024?b.formatNumber(a/1024,0)+" KiB":b.formatNumber(a,0)+" bytes"},b.bytesFromIP=function(a){return -1!==a.indexOf(".")?b.bytesFromIPv4(a):-1!==a.indexOf(":")?b.bytesFromIPv6(a):null},b.bytesFromIPv4=function(a){if(4!==(a=a.split(".")).length)return null;for(var c=b.createBuffer(),d=0;d<a.length;++d){var e=parseInt(a[d],10);if(isNaN(e))return null;c.putByte(e)}return c.getBytes()},b.bytesFromIPv6=function(a){for(var c=0,d=2*(8-(a=a.split(":").filter(function(a){return 0===a.length&&++c,!0})).length+c),e=b.createBuffer(),f=0;f<8;++f)if(a[f]&&0!==a[f].length){var g=b.hexToBytes(a[f]);g.length<2&&e.putByte(0),e.putBytes(g)}else e.fillWithByte(0,d),d=0;return e.getBytes()},b.bytesToIP=function(a){return 4===a.length?b.bytesToIPv4(a):16===a.length?b.bytesToIPv6(a):null},b.bytesToIPv4=function(a){if(4!==a.length)return null;for(var b=[],c=0;c<a.length;++c)b.push(a.charCodeAt(c));return b.join(".")},b.bytesToIPv6=function(a){if(16!==a.length)return null;for(var c=[],d=[],e=0,f=0;f<a.length;f+=2){for(var g=b.bytesToHex(a[f]+a[f+1]);"0"===g[0]&&"0"!==g;)g=g.substr(1);if("0"===g){var h=d[d.length-1],i=c.length;h&&i===h.end+1?(h.end=i,h.end-h.start>d[e].end-d[e].start&&(e=d.length-1)):d.push({start:i,end:i})}c.push(g)}if(d.length>0){var j=d[e];j.end-j.start>0&&(c.splice(j.start,j.end-j.start+1,""),0===j.start&&c.unshift(""),7===j.end&&c.push(""))}return c.join(":")},b.estimateCores=function(a,c){if("function"==typeof a&&(c=a,a={}),a=a||{},"cores"in b&&!a.update)return c(null,b.cores);if("u">typeof navigator&&"hardwareConcurrency"in navigator&&navigator.hardwareConcurrency>0)return b.cores=navigator.hardwareConcurrency,c(null,b.cores);if("u"<typeof Worker)return b.cores=1,c(null,b.cores);if("u"<typeof Blob)return b.cores=2,c(null,b.cores);var d=URL.createObjectURL(new Blob(["(",(function(){self.addEventListener("message",function(a){var b=Date.now();self.postMessage({st:b,et:b+4})})}).toString(),")()"],{type:"application/javascript"}));!function a(e,f,g){if(0===f)return b.cores=Math.max(1,Math.floor(e.reduce(function(a,b){return a+b},0)/e.length)),URL.revokeObjectURL(d),c(null,b.cores);!function(a,b){for(var c=[],e=[],f=0;f<a;++f){var g=new Worker(d);g.addEventListener("message",function(d){if(e.push(d.data),e.length===a){for(var f=0;f<a;++f)c[f].terminate();b(0,e)}}),c.push(g)}for(f=0;f<a;++f)c[f].postMessage(f)}(g,function(b,c){e.push(function(a,b){for(var c=[],d=0;d<a;++d)for(var e=b[d],f=c[d]=[],g=0;g<a;++g)if(d!==g){var h=b[g];(e.st>h.st&&e.st<h.et||h.st>e.st&&h.st<e.et)&&f.push(g)}return c.reduce(function(a,b){return Math.max(a,b.length)},0)}(g,c)),a(e,f-1,g)})}([],5,16)}}),cz.cipher=cz.cipher||{},cz.cipher.algorithms=cz.cipher.algorithms||{},cz.cipher.createCipher=function(a,b){var c=a;if("string"==typeof c&&(c=cz.cipher.getAlgorithm(c))&&(c=c()),!c)throw Error("Unsupported algorithm: "+a);return new cz.cipher.BlockCipher({algorithm:c,key:b,decrypt:!1})},cz.cipher.createDecipher=function(a,b){var c=a;if("string"==typeof c&&(c=cz.cipher.getAlgorithm(c))&&(c=c()),!c)throw Error("Unsupported algorithm: "+a);return new cz.cipher.BlockCipher({algorithm:c,key:b,decrypt:!0})},cz.cipher.registerAlgorithm=function(a,b){a=a.toUpperCase(),cz.cipher.algorithms[a]=b},cz.cipher.getAlgorithm=function(a){return(a=a.toUpperCase())in cz.cipher.algorithms?cz.cipher.algorithms[a]:null};var cE=cz.cipher.BlockCipher=function(a){this.algorithm=a.algorithm,this.mode=this.algorithm.mode,this.blockSize=this.mode.blockSize,this._finish=!1,this._input=null,this.output=null,this._op=a.decrypt?this.mode.decrypt:this.mode.encrypt,this._decrypt=a.decrypt,this.algorithm.initialize(a)};function cF(a,b){cz.cipher.registerAlgorithm(a,function(){return new cz.aes.Algorithm(a,b)})}cE.prototype.start=function(a){var b={};for(var c in a=a||{})b[c]=a[c];b.decrypt=this._decrypt,this._finish=!1,this._input=cz.util.createBuffer(),this.output=a.output||cz.util.createBuffer(),this.mode.start(b)},cE.prototype.update=function(a){for(a&&this._input.putBuffer(a);!this._op.call(this.mode,this._input,this.output,this._finish)&&!this._finish;);this._input.compact()},cE.prototype.finish=function(a){a&&("ECB"===this.mode.name||"CBC"===this.mode.name)&&(this.mode.pad=function(b){return a(this.blockSize,b,!1)},this.mode.unpad=function(b){return a(this.blockSize,b,!0)});var b={};return b.decrypt=this._decrypt,b.overflow=this._input.length()%this.blockSize,!(!this._decrypt&&this.mode.pad&&!this.mode.pad(this._input,b)||(this._finish=!0,this.update(),this._decrypt&&this.mode.unpad&&!this.mode.unpad(this.output,b)||this.mode.afterFinish&&!this.mode.afterFinish(this.output,b)))},cB(function(a){cz.cipher=cz.cipher||{};var b=a.exports=cz.cipher.modes=cz.cipher.modes||{};function c(a,b){if("string"==typeof a&&(a=cz.util.createBuffer(a)),cz.util.isArray(a)&&a.length>4){var c=a;a=cz.util.createBuffer();for(var d=0;d<c.length;++d)a.putByte(c[d])}if(a.length()<b)throw Error("Invalid IV length; got "+a.length()+" bytes and expected "+b+" bytes.");if(!cz.util.isArray(a)){var e=[],f=b/4;for(d=0;d<f;++d)e.push(a.getInt32());a=e}return a}function d(a){a[a.length-1]=a[a.length-1]+1|0}function e(a){return[a/0x100000000|0,0|a]}b.ecb=function(a){a=a||{},this.name="ECB",this.cipher=a.cipher,this.blockSize=a.blockSize||16,this._ints=this.blockSize/4,this._inBlock=Array(this._ints),this._outBlock=Array(this._ints)},b.ecb.prototype.start=function(a){},b.ecb.prototype.encrypt=function(a,b,c){if(a.length()<this.blockSize&&!(c&&a.length()>0))return!0;for(var d=0;d<this._ints;++d)this._inBlock[d]=a.getInt32();for(this.cipher.encrypt(this._inBlock,this._outBlock),d=0;d<this._ints;++d)b.putInt32(this._outBlock[d])},b.ecb.prototype.decrypt=function(a,b,c){if(a.length()<this.blockSize&&!(c&&a.length()>0))return!0;for(var d=0;d<this._ints;++d)this._inBlock[d]=a.getInt32();for(this.cipher.decrypt(this._inBlock,this._outBlock),d=0;d<this._ints;++d)b.putInt32(this._outBlock[d])},b.ecb.prototype.pad=function(a,b){var c=a.length()===this.blockSize?this.blockSize:this.blockSize-a.length();return a.fillWithByte(c,c),!0},b.ecb.prototype.unpad=function(a,b){if(b.overflow>0)return!1;var c=a.length(),d=a.at(c-1);return!(d>this.blockSize<<2||(a.truncate(d),0))},b.cbc=function(a){a=a||{},this.name="CBC",this.cipher=a.cipher,this.blockSize=a.blockSize||16,this._ints=this.blockSize/4,this._inBlock=Array(this._ints),this._outBlock=Array(this._ints)},b.cbc.prototype.start=function(a){if(null===a.iv){if(!this._prev)throw Error("Invalid IV parameter.");this._iv=this._prev.slice(0)}else{if(!("iv"in a))throw Error("Invalid IV parameter.");this._iv=c(a.iv,this.blockSize),this._prev=this._iv.slice(0)}},b.cbc.prototype.encrypt=function(a,b,c){if(a.length()<this.blockSize&&!(c&&a.length()>0))return!0;for(var d=0;d<this._ints;++d)this._inBlock[d]=this._prev[d]^a.getInt32();for(this.cipher.encrypt(this._inBlock,this._outBlock),d=0;d<this._ints;++d)b.putInt32(this._outBlock[d]);this._prev=this._outBlock},b.cbc.prototype.decrypt=function(a,b,c){if(a.length()<this.blockSize&&!(c&&a.length()>0))return!0;for(var d=0;d<this._ints;++d)this._inBlock[d]=a.getInt32();for(this.cipher.decrypt(this._inBlock,this._outBlock),d=0;d<this._ints;++d)b.putInt32(this._prev[d]^this._outBlock[d]);this._prev=this._inBlock.slice(0)},b.cbc.prototype.pad=function(a,b){var c=a.length()===this.blockSize?this.blockSize:this.blockSize-a.length();return a.fillWithByte(c,c),!0},b.cbc.prototype.unpad=function(a,b){if(b.overflow>0)return!1;var c=a.length(),d=a.at(c-1);return!(d>this.blockSize<<2||(a.truncate(d),0))},b.cfb=function(a){a=a||{},this.name="CFB",this.cipher=a.cipher,this.blockSize=a.blockSize||16,this._ints=this.blockSize/4,this._inBlock=null,this._outBlock=Array(this._ints),this._partialBlock=Array(this._ints),this._partialOutput=cz.util.createBuffer(),this._partialBytes=0},b.cfb.prototype.start=function(a){if(!("iv"in a))throw Error("Invalid IV parameter.");this._iv=c(a.iv,this.blockSize),this._inBlock=this._iv.slice(0),this._partialBytes=0},b.cfb.prototype.encrypt=function(a,b,c){var d=a.length();if(0===d)return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&d>=this.blockSize)for(var e=0;e<this._ints;++e)this._inBlock[e]=a.getInt32()^this._outBlock[e],b.putInt32(this._inBlock[e]);else{var f=(this.blockSize-d)%this.blockSize;for(f>0&&(f=this.blockSize-f),this._partialOutput.clear(),e=0;e<this._ints;++e)this._partialBlock[e]=a.getInt32()^this._outBlock[e],this._partialOutput.putInt32(this._partialBlock[e]);if(f>0)a.read-=this.blockSize;else for(e=0;e<this._ints;++e)this._inBlock[e]=this._partialBlock[e];if(this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),f>0&&!c)return b.putBytes(this._partialOutput.getBytes(f-this._partialBytes)),this._partialBytes=f,!0;b.putBytes(this._partialOutput.getBytes(d-this._partialBytes)),this._partialBytes=0}},b.cfb.prototype.decrypt=function(a,b,c){var d=a.length();if(0===d)return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&d>=this.blockSize)for(var e=0;e<this._ints;++e)this._inBlock[e]=a.getInt32(),b.putInt32(this._inBlock[e]^this._outBlock[e]);else{var f=(this.blockSize-d)%this.blockSize;for(f>0&&(f=this.blockSize-f),this._partialOutput.clear(),e=0;e<this._ints;++e)this._partialBlock[e]=a.getInt32(),this._partialOutput.putInt32(this._partialBlock[e]^this._outBlock[e]);if(f>0)a.read-=this.blockSize;else for(e=0;e<this._ints;++e)this._inBlock[e]=this._partialBlock[e];if(this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),f>0&&!c)return b.putBytes(this._partialOutput.getBytes(f-this._partialBytes)),this._partialBytes=f,!0;b.putBytes(this._partialOutput.getBytes(d-this._partialBytes)),this._partialBytes=0}},b.ofb=function(a){a=a||{},this.name="OFB",this.cipher=a.cipher,this.blockSize=a.blockSize||16,this._ints=this.blockSize/4,this._inBlock=null,this._outBlock=Array(this._ints),this._partialOutput=cz.util.createBuffer(),this._partialBytes=0},b.ofb.prototype.start=function(a){if(!("iv"in a))throw Error("Invalid IV parameter.");this._iv=c(a.iv,this.blockSize),this._inBlock=this._iv.slice(0),this._partialBytes=0},b.ofb.prototype.encrypt=function(a,b,c){var d=a.length();if(0===a.length())return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&d>=this.blockSize)for(var e=0;e<this._ints;++e)b.putInt32(a.getInt32()^this._outBlock[e]),this._inBlock[e]=this._outBlock[e];else{var f=(this.blockSize-d)%this.blockSize;for(f>0&&(f=this.blockSize-f),this._partialOutput.clear(),e=0;e<this._ints;++e)this._partialOutput.putInt32(a.getInt32()^this._outBlock[e]);if(f>0)a.read-=this.blockSize;else for(e=0;e<this._ints;++e)this._inBlock[e]=this._outBlock[e];if(this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),f>0&&!c)return b.putBytes(this._partialOutput.getBytes(f-this._partialBytes)),this._partialBytes=f,!0;b.putBytes(this._partialOutput.getBytes(d-this._partialBytes)),this._partialBytes=0}},b.ofb.prototype.decrypt=b.ofb.prototype.encrypt,b.ctr=function(a){a=a||{},this.name="CTR",this.cipher=a.cipher,this.blockSize=a.blockSize||16,this._ints=this.blockSize/4,this._inBlock=null,this._outBlock=Array(this._ints),this._partialOutput=cz.util.createBuffer(),this._partialBytes=0},b.ctr.prototype.start=function(a){if(!("iv"in a))throw Error("Invalid IV parameter.");this._iv=c(a.iv,this.blockSize),this._inBlock=this._iv.slice(0),this._partialBytes=0},b.ctr.prototype.encrypt=function(a,b,c){var e=a.length();if(0===e)return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&e>=this.blockSize)for(var f=0;f<this._ints;++f)b.putInt32(a.getInt32()^this._outBlock[f]);else{var g=(this.blockSize-e)%this.blockSize;for(g>0&&(g=this.blockSize-g),this._partialOutput.clear(),f=0;f<this._ints;++f)this._partialOutput.putInt32(a.getInt32()^this._outBlock[f]);if(g>0&&(a.read-=this.blockSize),this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),g>0&&!c)return b.putBytes(this._partialOutput.getBytes(g-this._partialBytes)),this._partialBytes=g,!0;b.putBytes(this._partialOutput.getBytes(e-this._partialBytes)),this._partialBytes=0}d(this._inBlock)},b.ctr.prototype.decrypt=b.ctr.prototype.encrypt,b.gcm=function(a){a=a||{},this.name="GCM",this.cipher=a.cipher,this.blockSize=a.blockSize||16,this._ints=this.blockSize/4,this._inBlock=Array(this._ints),this._outBlock=Array(this._ints),this._partialOutput=cz.util.createBuffer(),this._partialBytes=0,this._R=0xe1000000},b.gcm.prototype.start=function(a){if(!("iv"in a))throw Error("Invalid IV parameter.");var b,c=cz.util.createBuffer(a.iv);if(this._cipherLength=0,b="additionalData"in a?cz.util.createBuffer(a.additionalData):cz.util.createBuffer(),this._tagLength="tagLength"in a?a.tagLength:128,this._tag=null,a.decrypt&&(this._tag=cz.util.createBuffer(a.tag).getBytes(),this._tag.length!==this._tagLength/8))throw Error("Authentication tag does not match tag length.");this._hashBlock=Array(this._ints),this.tag=null,this._hashSubkey=Array(this._ints),this.cipher.encrypt([0,0,0,0],this._hashSubkey),this.componentBits=4,this._m=this.generateHashTable(this._hashSubkey,this.componentBits);var f=c.length();if(12===f)this._j0=[c.getInt32(),c.getInt32(),c.getInt32(),1];else{for(this._j0=[0,0,0,0];c.length()>0;)this._j0=this.ghash(this._hashSubkey,this._j0,[c.getInt32(),c.getInt32(),c.getInt32(),c.getInt32()]);this._j0=this.ghash(this._hashSubkey,this._j0,[0,0].concat(e(8*f)))}this._inBlock=this._j0.slice(0),d(this._inBlock),this._partialBytes=0,b=cz.util.createBuffer(b),this._aDataLength=e(8*b.length());var g=b.length()%this.blockSize;for(g&&b.fillWithByte(0,this.blockSize-g),this._s=[0,0,0,0];b.length()>0;)this._s=this.ghash(this._hashSubkey,this._s,[b.getInt32(),b.getInt32(),b.getInt32(),b.getInt32()])},b.gcm.prototype.encrypt=function(a,b,c){var e=a.length();if(0===e)return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&e>=this.blockSize){for(var f=0;f<this._ints;++f)b.putInt32(this._outBlock[f]^=a.getInt32());this._cipherLength+=this.blockSize}else{var g=(this.blockSize-e)%this.blockSize;for(g>0&&(g=this.blockSize-g),this._partialOutput.clear(),f=0;f<this._ints;++f)this._partialOutput.putInt32(a.getInt32()^this._outBlock[f]);if(g<=0||c){if(c){var h=e%this.blockSize;this._cipherLength+=h,this._partialOutput.truncate(this.blockSize-h)}else this._cipherLength+=this.blockSize;for(f=0;f<this._ints;++f)this._outBlock[f]=this._partialOutput.getInt32();this._partialOutput.read-=this.blockSize}if(this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),g>0&&!c)return a.read-=this.blockSize,b.putBytes(this._partialOutput.getBytes(g-this._partialBytes)),this._partialBytes=g,!0;b.putBytes(this._partialOutput.getBytes(e-this._partialBytes)),this._partialBytes=0}this._s=this.ghash(this._hashSubkey,this._s,this._outBlock),d(this._inBlock)},b.gcm.prototype.decrypt=function(a,b,c){var e=a.length();if(e<this.blockSize&&!(c&&e>0))return!0;this.cipher.encrypt(this._inBlock,this._outBlock),d(this._inBlock),this._hashBlock[0]=a.getInt32(),this._hashBlock[1]=a.getInt32(),this._hashBlock[2]=a.getInt32(),this._hashBlock[3]=a.getInt32(),this._s=this.ghash(this._hashSubkey,this._s,this._hashBlock);for(var f=0;f<this._ints;++f)b.putInt32(this._outBlock[f]^this._hashBlock[f]);this._cipherLength+=e<this.blockSize?e%this.blockSize:this.blockSize},b.gcm.prototype.afterFinish=function(a,b){var c=!0;b.decrypt&&b.overflow&&a.truncate(this.blockSize-b.overflow),this.tag=cz.util.createBuffer();var d=this._aDataLength.concat(e(8*this._cipherLength));this._s=this.ghash(this._hashSubkey,this._s,d);var f=[];this.cipher.encrypt(this._j0,f);for(var g=0;g<this._ints;++g)this.tag.putInt32(this._s[g]^f[g]);return this.tag.truncate(this.tag.length()%(this._tagLength/8)),b.decrypt&&this.tag.bytes()!==this._tag&&(c=!1),c},b.gcm.prototype.multiply=function(a,b){for(var c=[0,0,0,0],d=b.slice(0),e=0;e<128;++e)a[e/32|0]&1<<31-e%32&&(c[0]^=d[0],c[1]^=d[1],c[2]^=d[2],c[3]^=d[3]),this.pow(d,d);return c},b.gcm.prototype.pow=function(a,b){for(var c=1&a[3],d=3;d>0;--d)b[d]=a[d]>>>1|(1&a[d-1])<<31;b[0]=a[0]>>>1,c&&(b[0]^=this._R)},b.gcm.prototype.tableMultiply=function(a){for(var b=[0,0,0,0],c=0;c<32;++c){var d=this._m[c][a[c/8|0]>>>4*(7-c%8)&15];b[0]^=d[0],b[1]^=d[1],b[2]^=d[2],b[3]^=d[3]}return b},b.gcm.prototype.ghash=function(a,b,c){return b[0]^=c[0],b[1]^=c[1],b[2]^=c[2],b[3]^=c[3],this.tableMultiply(b)},b.gcm.prototype.generateHashTable=function(a,b){for(var c=8/b,d=4*c,e=16*c,f=Array(e),g=0;g<e;++g){var h=[0,0,0,0];h[g/d|0]=1<<b-1<<(d-1-g%d)*b,f[g]=this.generateSubHashTable(this.multiply(h,a),b)}return f},b.gcm.prototype.generateSubHashTable=function(a,b){var c=1<<b,d=c>>>1,e=Array(c);e[d]=a.slice(0);for(var f=d>>>1;f>0;)this.pow(e[2*f],e[f]=[]),f>>=1;for(f=2;f<d;){for(var g=1;g<f;++g){var h=e[f],i=e[g];e[f+g]=[h[0]^i[0],h[1]^i[1],h[2]^i[2],h[3]^i[3]]}f*=2}for(e[0]=[0,0,0,0],f=d+1;f<c;++f){var j=e[f^d];e[f]=[a[0]^j[0],a[1]^j[1],a[2]^j[2],a[3]^j[3]]}return e}}),cz.aes=cz.aes||{},cz.aes.startEncrypting=function(a,b,c,d){var e=cV({key:a,output:c,decrypt:!1,mode:d});return e.start(b),e},cz.aes.createEncryptionCipher=function(a,b){return cV({key:a,output:null,decrypt:!1,mode:b})},cz.aes.startDecrypting=function(a,b,c,d){var e=cV({key:a,output:c,decrypt:!0,mode:d});return e.start(b),e},cz.aes.createDecryptionCipher=function(a,b){return cV({key:a,output:null,decrypt:!0,mode:b})},cz.aes.Algorithm=function(a,b){cR||cS();var c=this;c.name=a,c.mode=new b({blockSize:16,cipher:{encrypt:function(a,b){return cU(c._w,a,b,!1)},decrypt:function(a,b){return cU(c._w,a,b,!0)}}}),c._init=!1},cz.aes.Algorithm.prototype.initialize=function(a){if(!this._init){var b,c=a.key;if("string"!=typeof c||16!==c.length&&24!==c.length&&32!==c.length){if(cz.util.isArray(c)&&(16===c.length||24===c.length||32===c.length)){b=c,c=cz.util.createBuffer();for(var d=0;d<b.length;++d)c.putByte(b[d])}}else c=cz.util.createBuffer(c);if(!cz.util.isArray(c)){b=c,c=[];var e=b.length();if(16===e||24===e||32===e)for(e>>>=2,d=0;d<e;++d)c.push(b.getInt32())}if(!cz.util.isArray(c)||4!==c.length&&6!==c.length&&8!==c.length)throw Error("Invalid key parameter.");var f=-1!==["CFB","OFB","CTR","GCM"].indexOf(this.mode.name);this._w=cT(c,a.decrypt&&!f),this._init=!0}},cz.aes._expandKey=function(a,b){return cR||cS(),cT(a,b)},cz.aes._updateBlock=cU,cF("AES-ECB",cz.cipher.modes.ecb),cF("AES-CBC",cz.cipher.modes.cbc),cF("AES-CFB",cz.cipher.modes.cfb),cF("AES-OFB",cz.cipher.modes.ofb),cF("AES-CTR",cz.cipher.modes.ctr),cF("AES-GCM",cz.cipher.modes.gcm);var cG,cH,cI,cJ,cK,cL,cM,cN,cO,cP,cQ,cR=!1;function cS(){cR=!0,cO=[0,1,2,4,8,16,32,64,128,27,54];for(var a=Array(256),b=0;b<128;++b)a[b]=b<<1,a[b+128]=b+128<<1^283;for(cM=Array(256),cN=Array(256),cP=[,,,,],cQ=[,,,,],b=0;b<4;++b)cP[b]=Array(256),cQ[b]=Array(256);var c,d,e,f,g,h,i,j=0,k=0;for(b=0;b<256;++b){cM[j]=f=(f=k^k<<1^k<<2^k<<3^k<<4)>>8^255&f^99,cN[f]=j,h=(g=a[f])<<24^f<<16^f<<8^f^g,i=((c=a[j])^(d=a[c])^(e=a[d]))<<24^(j^e)<<16^(j^d^e)<<8^j^c^e;for(var l=0;l<4;++l)cP[l][j]=h,cQ[l][f]=i,h=h<<24|h>>>8,i=i<<24|i>>>8;0===j?j=k=1:(j=c^a[a[a[c^e]]],k^=a[a[k]])}}function cT(a,b){for(var c,d=a.slice(0),e=1,f=d.length,g=4*(f+6+1),h=f;h<g;++h)c=d[h-1],h%f==0?(c=cM[c>>>16&255]<<24^cM[c>>>8&255]<<16^cM[255&c]<<8^cM[c>>>24]^cO[e]<<24,e++):f>6&&h%f==4&&(c=cM[c>>>24]<<24^cM[c>>>16&255]<<16^cM[c>>>8&255]<<8^cM[255&c]),d[h]=d[h-f]^c;if(b){for(var i,j=cQ[0],k=cQ[1],l=cQ[2],m=cQ[3],n=d.slice(0),o=(h=0,(g=d.length)-4);h<g;h+=4,o-=4)if(0===h||h===g-4)n[h]=d[o],n[h+1]=d[o+3],n[h+2]=d[o+2],n[h+3]=d[o+1];else for(var p=0;p<4;++p)n[h+(3&-p)]=j[cM[(i=d[o+p])>>>24]]^k[cM[i>>>16&255]]^l[cM[i>>>8&255]]^m[cM[255&i]];d=n}return d}function cU(a,b,c,d){var e,f,g,h,i,j,k,l,m,n,o,p,q=a.length/4-1;d?(e=cQ[0],f=cQ[1],g=cQ[2],h=cQ[3],i=cN):(e=cP[0],f=cP[1],g=cP[2],h=cP[3],i=cM),j=b[0]^a[0],k=b[d?3:1]^a[1],l=b[2]^a[2],m=b[d?1:3]^a[3];for(var r=3,s=1;s<q;++s)n=e[j>>>24]^f[k>>>16&255]^g[l>>>8&255]^h[255&m]^a[++r],o=e[k>>>24]^f[l>>>16&255]^g[m>>>8&255]^h[255&j]^a[++r],p=e[l>>>24]^f[m>>>16&255]^g[j>>>8&255]^h[255&k]^a[++r],m=e[m>>>24]^f[j>>>16&255]^g[k>>>8&255]^h[255&l]^a[++r],j=n,k=o,l=p;c[0]=i[j>>>24]<<24^i[k>>>16&255]<<16^i[l>>>8&255]<<8^i[255&m]^a[++r],c[d?3:1]=i[k>>>24]<<24^i[l>>>16&255]<<16^i[m>>>8&255]<<8^i[255&j]^a[++r],c[2]=i[l>>>24]<<24^i[m>>>16&255]<<16^i[j>>>8&255]<<8^i[255&k]^a[++r],c[d?1:3]=i[m>>>24]<<24^i[j>>>16&255]<<16^i[k>>>8&255]<<8^i[255&l]^a[++r]}function cV(a){var b,c="AES-"+((a=a||{}).mode||"CBC").toUpperCase(),d=(b=a.decrypt?cz.cipher.createDecipher(c,a.key):cz.cipher.createCipher(c,a.key)).start;return b.start=function(a,c){var e=null;c instanceof cz.util.ByteBuffer&&(e=c,c={}),(c=c||{}).output=e,c.iv=a,d.call(b,c)},b}function cW(a,b){cz.cipher.registerAlgorithm(a,function(){return new cz.des.Algorithm(a,b)})}cB(function(a){cz.pki=cz.pki||{};var b=a.exports=cz.pki.oids=cz.oids=cz.oids||{};function c(a,c){b[a]=c,b[c]=a}c("1.2.840.113549.1.1.1","rsaEncryption"),c("1.2.840.113549.1.1.4","md5WithRSAEncryption"),c("1.2.840.113549.1.1.5","sha1WithRSAEncryption"),c("1.2.840.113549.1.1.7","RSAES-OAEP"),c("1.2.840.113549.1.1.8","mgf1"),c("1.2.840.113549.1.1.9","pSpecified"),c("1.2.840.113549.1.1.10","RSASSA-PSS"),c("1.2.840.113549.1.1.11","sha256WithRSAEncryption"),c("1.2.840.113549.1.1.12","sha384WithRSAEncryption"),c("1.2.840.113549.1.1.13","sha512WithRSAEncryption"),c("1.3.101.112","EdDSA25519"),c("1.2.840.10040.4.3","dsa-with-sha1"),c("1.3.14.3.2.7","desCBC"),c("1.3.14.3.2.26","sha1"),c("1.3.14.3.2.29","sha1WithRSASignature"),c("2.16.840.1.101.3.4.2.1","sha256"),c("2.16.840.1.101.3.4.2.2","sha384"),c("2.16.840.1.101.3.4.2.3","sha512"),c("2.16.840.1.101.3.4.2.4","sha224"),c("2.16.840.1.101.3.4.2.5","sha512-224"),c("2.16.840.1.101.3.4.2.6","sha512-256"),c("1.2.840.113549.2.2","md2"),c("1.2.840.113549.2.5","md5"),c("1.2.840.113549.1.7.1","data"),c("1.2.840.113549.1.7.2","signedData"),c("1.2.840.113549.1.7.3","envelopedData"),c("1.2.840.113549.1.7.4","signedAndEnvelopedData"),c("1.2.840.113549.1.7.5","digestedData"),c("1.2.840.113549.1.7.6","encryptedData"),c("1.2.840.113549.1.9.1","emailAddress"),c("1.2.840.113549.1.9.2","unstructuredName"),c("1.2.840.113549.1.9.3","contentType"),c("1.2.840.113549.1.9.4","messageDigest"),c("1.2.840.113549.1.9.5","signingTime"),c("1.2.840.113549.1.9.6","counterSignature"),c("1.2.840.113549.1.9.7","challengePassword"),c("1.2.840.113549.1.9.8","unstructuredAddress"),c("1.2.840.113549.1.9.14","extensionRequest"),c("1.2.840.113549.1.9.20","friendlyName"),c("1.2.840.113549.1.9.21","localKeyId"),c("1.2.840.113549.1.9.22.1","x509Certificate"),c("1.2.840.113549.1.12.10.1.1","keyBag"),c("1.2.840.113549.1.12.10.1.2","pkcs8ShroudedKeyBag"),c("1.2.840.113549.1.12.10.1.3","certBag"),c("1.2.840.113549.1.12.10.1.4","crlBag"),c("1.2.840.113549.1.12.10.1.5","secretBag"),c("1.2.840.113549.1.12.10.1.6","safeContentsBag"),c("1.2.840.113549.1.5.13","pkcs5PBES2"),c("1.2.840.113549.1.5.12","pkcs5PBKDF2"),c("1.2.840.113549.1.12.1.1","pbeWithSHAAnd128BitRC4"),c("1.2.840.113549.1.12.1.2","pbeWithSHAAnd40BitRC4"),c("1.2.840.113549.1.12.1.3","pbeWithSHAAnd3-KeyTripleDES-CBC"),c("1.2.840.113549.1.12.1.4","pbeWithSHAAnd2-KeyTripleDES-CBC"),c("1.2.840.113549.1.12.1.5","pbeWithSHAAnd128BitRC2-CBC"),c("1.2.840.113549.1.12.1.6","pbewithSHAAnd40BitRC2-CBC"),c("1.2.840.113549.2.7","hmacWithSHA1"),c("1.2.840.113549.2.8","hmacWithSHA224"),c("1.2.840.113549.2.9","hmacWithSHA256"),c("1.2.840.113549.2.10","hmacWithSHA384"),c("1.2.840.113549.2.11","hmacWithSHA512"),c("1.2.840.113549.3.7","des-EDE3-CBC"),c("2.16.840.1.101.3.4.1.2","aes128-CBC"),c("2.16.840.1.101.3.4.1.22","aes192-CBC"),c("2.16.840.1.101.3.4.1.42","aes256-CBC"),c("2.5.4.3","commonName"),c("2.5.4.4","surname"),c("2.5.4.5","serialNumber"),c("2.5.4.6","countryName"),c("2.5.4.7","localityName"),c("2.5.4.8","stateOrProvinceName"),c("2.5.4.9","streetAddress"),c("2.5.4.10","organizationName"),c("2.5.4.11","organizationalUnitName"),c("2.5.4.12","title"),c("2.5.4.13","description"),c("2.5.4.15","businessCategory"),c("2.5.4.17","postalCode"),c("2.5.4.42","givenName"),c("1.3.6.1.4.1.311.60.2.1.2","jurisdictionOfIncorporationStateOrProvinceName"),c("1.3.6.1.4.1.311.60.2.1.3","jurisdictionOfIncorporationCountryName"),c("2.16.840.1.113730.1.1","nsCertType"),c("2.16.840.1.113730.1.13","nsComment"),b["2.5.29.1"]="authorityKeyIdentifier",b["2.5.29.2"]="keyAttributes",b["2.5.29.3"]="certificatePolicies",b["2.5.29.4"]="keyUsageRestriction",b["2.5.29.5"]="policyMapping",b["2.5.29.6"]="subtreesConstraint",b["2.5.29.7"]="subjectAltName",b["2.5.29.8"]="issuerAltName",b["2.5.29.9"]="subjectDirectoryAttributes",b["2.5.29.10"]="basicConstraints",b["2.5.29.11"]="nameConstraints",b["2.5.29.12"]="policyConstraints",b["2.5.29.13"]="basicConstraints",c("2.5.29.14","subjectKeyIdentifier"),c("2.5.29.15","keyUsage"),b["2.5.29.16"]="privateKeyUsagePeriod",c("2.5.29.17","subjectAltName"),c("2.5.29.18","issuerAltName"),c("2.5.29.19","basicConstraints"),b["2.5.29.20"]="cRLNumber",b["2.5.29.21"]="cRLReason",b["2.5.29.22"]="expirationDate",b["2.5.29.23"]="instructionCode",b["2.5.29.24"]="invalidityDate",b["2.5.29.25"]="cRLDistributionPoints",b["2.5.29.26"]="issuingDistributionPoint",b["2.5.29.27"]="deltaCRLIndicator",b["2.5.29.28"]="issuingDistributionPoint",b["2.5.29.29"]="certificateIssuer",b["2.5.29.30"]="nameConstraints",c("2.5.29.31","cRLDistributionPoints"),c("2.5.29.32","certificatePolicies"),b["2.5.29.33"]="policyMappings",b["2.5.29.34"]="policyConstraints",c("2.5.29.35","authorityKeyIdentifier"),b["2.5.29.36"]="policyConstraints",c("2.5.29.37","extKeyUsage"),b["2.5.29.46"]="freshestCRL",b["2.5.29.54"]="inhibitAnyPolicy",c("1.3.6.1.4.1.11129.2.4.2","timestampList"),c("1.3.6.1.5.5.7.1.1","authorityInfoAccess"),c("1.3.6.1.5.5.7.3.1","serverAuth"),c("1.3.6.1.5.5.7.3.2","clientAuth"),c("1.3.6.1.5.5.7.3.3","codeSigning"),c("1.3.6.1.5.5.7.3.4","emailProtection"),c("1.3.6.1.5.5.7.3.8","timeStamping")}),cB(function(a){var b=a.exports=cz.asn1=cz.asn1||{};function c(a,b,c){if(c>b){var d=Error("Too few bytes to parse DER.");throw d.available=a.length(),d.remaining=b,d.requested=c,d}}b.Class={UNIVERSAL:0,APPLICATION:64,CONTEXT_SPECIFIC:128,PRIVATE:192},b.Type={NONE:0,BOOLEAN:1,INTEGER:2,BITSTRING:3,OCTETSTRING:4,NULL:5,OID:6,ODESC:7,EXTERNAL:8,REAL:9,ENUMERATED:10,EMBEDDED:11,UTF8:12,ROID:13,SEQUENCE:16,SET:17,PRINTABLESTRING:19,IA5STRING:22,UTCTIME:23,GENERALIZEDTIME:24,BMPSTRING:30},b.create=function(a,c,d,e,f){if(cz.util.isArray(e)){for(var g=[],h=0;h<e.length;++h)void 0!==e[h]&&g.push(e[h]);e=g}var i={tagClass:a,type:c,constructed:d,composed:d||cz.util.isArray(e),value:e};return f&&"bitStringContents"in f&&(i.bitStringContents=f.bitStringContents,i.original=b.copy(i)),i},b.copy=function(a,c){var d;if(cz.util.isArray(a)){d=[];for(var e=0;e<a.length;++e)d.push(b.copy(a[e],c));return d}return"string"==typeof a?a:(d={tagClass:a.tagClass,type:a.type,constructed:a.constructed,composed:a.composed,value:b.copy(a.value,c)},c&&!c.excludeBitStringContents&&(d.bitStringContents=a.bitStringContents),d)},b.equals=function(a,c,d){if(cz.util.isArray(a)){if(!cz.util.isArray(c)||a.length!==c.length)return!1;for(var e=0;e<a.length;++e)if(!b.equals(a[e],c[e]))return!1;return!0}if(typeof a!=typeof c)return!1;if("string"==typeof a)return a===c;var f=a.tagClass===c.tagClass&&a.type===c.type&&a.constructed===c.constructed&&a.composed===c.composed&&b.equals(a.value,c.value);return d&&d.includeBitStringContents&&(f=f&&a.bitStringContents===c.bitStringContents),f},b.getBerValueLength=function(a){var b=a.getByte();if(128!==b)return 128&b?a.getInt((127&b)<<3):b},b.fromDer=function(a,d){void 0===d&&(d={strict:!0,parseAllBytes:!0,decodeBitStrings:!0}),"boolean"==typeof d&&(d={strict:d,parseAllBytes:!0,decodeBitStrings:!0}),"strict"in d||(d.strict=!0),"parseAllBytes"in d||(d.parseAllBytes=!0),"decodeBitStrings"in d||(d.decodeBitStrings=!0),"string"==typeof a&&(a=cz.util.createBuffer(a));var e=a.length(),f=function a(d,e,f,g){c(d,e,2);var h=d.getByte();e--;var i,j,k=192&h,l=31&h,m=d.length(),n=function(a,b){var d,e=a.getByte();if(b--,128!==e){if(128&e){var f=127&e;c(a,b,f),d=a.getInt(f<<3)}else d=e;if(d<0)throw Error("Negative length: "+d);return d}}(d,e);if(e-=m-d.length(),void 0!==n&&n>e){if(g.strict){var o=Error("Too few bytes to read ASN.1 value.");throw o.available=d.length(),o.remaining=e,o.requested=n,o}n=e}var p=!(32&~h);if(p)if(i=[],void 0===n)for(;;){if(c(d,e,2),d.bytes(2)===String.fromCharCode(0,0)){d.getBytes(2),e-=2;break}m=d.length(),i.push(a(d,e,f+1,g)),e-=m-d.length()}else for(;n>0;)m=d.length(),i.push(a(d,n,f+1,g)),e-=m-d.length(),n-=m-d.length();if(void 0===i&&k===b.Class.UNIVERSAL&&l===b.Type.BITSTRING&&(j=d.bytes(n)),void 0===i&&g.decodeBitStrings&&k===b.Class.UNIVERSAL&&l===b.Type.BITSTRING&&n>1){var q=d.read,r=e,s=0;if(l===b.Type.BITSTRING&&(c(d,e,1),s=d.getByte(),e--),0===s)try{m=d.length();var t=a(d,e,f+1,{strict:!0,decodeBitStrings:!0}),u=m-d.length();e-=u,l==b.Type.BITSTRING&&u++;var v=t.tagClass;u!==n||v!==b.Class.UNIVERSAL&&v!==b.Class.CONTEXT_SPECIFIC||(i=[t])}catch(a){}void 0===i&&(d.read=q,e=r)}if(void 0===i){if(void 0===n){if(g.strict)throw Error("Non-constructed ASN.1 object of indefinite length.");n=e}if(l===b.Type.BMPSTRING)for(i="";n>0;n-=2)c(d,e,2),i+=String.fromCharCode(d.getInt16()),e-=2;else i=d.getBytes(n),e-=n}return b.create(k,l,p,i,void 0===j?null:{bitStringContents:j})}(a,a.length(),0,d);if(d.parseAllBytes&&0!==a.length()){var g=Error("Unparsed DER bytes remain after ASN.1 parsing.");throw g.byteCount=e,g.remaining=a.length(),g}return f},b.toDer=function(a){var c=cz.util.createBuffer(),d=a.tagClass|a.type,e=cz.util.createBuffer(),f=!1;if("bitStringContents"in a&&(f=!0,a.original&&(f=b.equals(a,a.original))),f)e.putBytes(a.bitStringContents);else if(a.composed){a.constructed?d|=32:e.putByte(0);for(var g=0;g<a.value.length;++g)void 0!==a.value[g]&&e.putBuffer(b.toDer(a.value[g]))}else if(a.type===b.Type.BMPSTRING)for(g=0;g<a.value.length;++g)e.putInt16(a.value.charCodeAt(g));else!(a.type===b.Type.INTEGER&&a.value.length>1)||(0!==a.value.charCodeAt(0)||128&a.value.charCodeAt(1))&&(255!==a.value.charCodeAt(0)||128&~a.value.charCodeAt(1))?e.putBytes(a.value):e.putBytes(a.value.substr(1));if(c.putByte(d),127>=e.length())c.putByte(127&e.length());else{var h=e.length(),i="";do i+=String.fromCharCode(255&h),h>>>=8;while(h>0)for(c.putByte(128|i.length),g=i.length-1;g>=0;--g)c.putByte(i.charCodeAt(g))}return c.putBuffer(e),c},b.oidToDer=function(a){var b,c,d,e,f=a.split("."),g=cz.util.createBuffer();g.putByte(40*parseInt(f[0],10)+parseInt(f[1],10));for(var h=2;h<f.length;++h){b=!0,c=[],d=parseInt(f[h],10);do e=127&d,d>>>=7,b||(e|=128),c.push(e),b=!1;while(d>0)for(var i=c.length-1;i>=0;--i)g.putByte(c[i])}return g},b.derToOid=function(a){"string"==typeof a&&(a=cz.util.createBuffer(a));var b,c=a.getByte();b=Math.floor(c/40)+"."+c%40;for(var d=0;a.length()>0;)d<<=7,128&(c=a.getByte())?d+=127&c:(b+="."+(d+c),d=0);return b},b.utcTimeToDate=function(a){var b=new Date,c=parseInt(a.substr(0,2),10);c=c>=50?1900+c:2e3+c;var d=parseInt(a.substr(2,2),10)-1,e=parseInt(a.substr(4,2),10),f=parseInt(a.substr(6,2),10),g=parseInt(a.substr(8,2),10),h=0;if(a.length>11){var i=a.charAt(10),j=10;"+"!==i&&"-"!==i&&(h=parseInt(a.substr(10,2),10),j+=2)}if(b.setUTCFullYear(c,d,e),b.setUTCHours(f,g,h,0),j&&("+"===(i=a.charAt(j))||"-"===i)){var k=60*parseInt(a.substr(j+1,2),10)+parseInt(a.substr(j+4,2),10);k*=6e4,b.setTime("+"===i?b-k:+b+k)}return b},b.generalizedTimeToDate=function(a){var b=new Date,c=parseInt(a.substr(0,4),10),d=parseInt(a.substr(4,2),10)-1,e=parseInt(a.substr(6,2),10),f=parseInt(a.substr(8,2),10),g=parseInt(a.substr(10,2),10),h=parseInt(a.substr(12,2),10),i=0,j=0,k=!1;"Z"===a.charAt(a.length-1)&&(k=!0);var l=a.length-5,m=a.charAt(l);return"+"!==m&&"-"!==m||(j=(60*parseInt(a.substr(l+1,2),10)+parseInt(a.substr(l+4,2),10))*6e4,"+"===m&&(j*=-1),k=!0),"."===a.charAt(14)&&(i=1e3*parseFloat(a.substr(14),10)),k?(b.setUTCFullYear(c,d,e),b.setUTCHours(f,g,h,i),b.setTime(+b+j)):(b.setFullYear(c,d,e),b.setHours(f,g,h,i)),b},b.dateToUtcTime=function(a){if("string"==typeof a)return a;var b="",c=[];c.push((""+a.getUTCFullYear()).substr(2)),c.push(""+(a.getUTCMonth()+1)),c.push(""+a.getUTCDate()),c.push(""+a.getUTCHours()),c.push(""+a.getUTCMinutes()),c.push(""+a.getUTCSeconds());for(var d=0;d<c.length;++d)c[d].length<2&&(b+="0"),b+=c[d];return b+"Z"},b.dateToGeneralizedTime=function(a){if("string"==typeof a)return a;var b="",c=[];c.push(""+a.getUTCFullYear()),c.push(""+(a.getUTCMonth()+1)),c.push(""+a.getUTCDate()),c.push(""+a.getUTCHours()),c.push(""+a.getUTCMinutes()),c.push(""+a.getUTCSeconds());for(var d=0;d<c.length;++d)c[d].length<2&&(b+="0"),b+=c[d];return b+"Z"},b.integerToDer=function(a){var b=cz.util.createBuffer();if(a>=-128&&a<128)return b.putSignedInt(a,8);if(a>=-32768&&a<32768)return b.putSignedInt(a,16);if(a>=-8388608&&a<8388608)return b.putSignedInt(a,24);if(a>=-0x80000000&&a<0x80000000)return b.putSignedInt(a,32);var c=Error("Integer too large; max is 32-bits.");throw c.integer=a,c},b.derToInteger=function(a){"string"==typeof a&&(a=cz.util.createBuffer(a));var b=8*a.length();if(b>32)throw Error("Integer too large; max is 32-bits.");return a.getSignedInt(b)},b.validate=function(a,c,d,e){var f=!1;if(a.tagClass!==c.tagClass&&void 0!==c.tagClass||a.type!==c.type&&void 0!==c.type)e&&(a.tagClass!==c.tagClass&&e.push("["+c.name+'] Expected tag class "'+c.tagClass+'", got "'+a.tagClass+'"'),a.type!==c.type&&e.push("["+c.name+'] Expected type "'+c.type+'", got "'+a.type+'"'));else if(a.constructed===c.constructed||void 0===c.constructed){if(f=!0,c.value&&cz.util.isArray(c.value))for(var g=0,h=0;f&&h<c.value.length;++h)f=c.value[h].optional||!1,a.value[g]&&((f=b.validate(a.value[g],c.value[h],d,e))?++g:c.value[h].optional&&(f=!0)),!f&&e&&e.push("["+c.name+'] Tag class "'+c.tagClass+'", type "'+c.type+'" expected value length "'+c.value.length+'", got "'+a.value.length+'"');if(f&&d&&(c.capture&&(d[c.capture]=a.value),c.captureAsn1&&(d[c.captureAsn1]=a),c.captureBitStringContents&&"bitStringContents"in a&&(d[c.captureBitStringContents]=a.bitStringContents),c.captureBitStringValue&&"bitStringContents"in a))if(a.bitStringContents.length<2)d[c.captureBitStringValue]="";else{if(0!==a.bitStringContents.charCodeAt(0))throw Error("captureBitStringValue only supported for zero unused bits");d[c.captureBitStringValue]=a.bitStringContents.slice(1)}}else e&&e.push("["+c.name+'] Expected constructed "'+c.constructed+'", got "'+a.constructed+'"');return f};var d=/[^\\u0000-\\u00ff]/;b.prettyPrint=function(a,c,e){var f="";e=e||2,(c=c||0)>0&&(f+="\n");for(var g="",h=0;h<c*e;++h)g+=" ";switch(f+=g+"Tag: ",a.tagClass){case b.Class.UNIVERSAL:f+="Universal:";break;case b.Class.APPLICATION:f+="Application:";break;case b.Class.CONTEXT_SPECIFIC:f+="Context-Specific:";break;case b.Class.PRIVATE:f+="Private:"}if(a.tagClass===b.Class.UNIVERSAL)switch(f+=a.type,a.type){case b.Type.NONE:f+=" (None)";break;case b.Type.BOOLEAN:f+=" (Boolean)";break;case b.Type.INTEGER:f+=" (Integer)";break;case b.Type.BITSTRING:f+=" (Bit string)";break;case b.Type.OCTETSTRING:f+=" (Octet string)";break;case b.Type.NULL:f+=" (Null)";break;case b.Type.OID:f+=" (Object Identifier)";break;case b.Type.ODESC:f+=" (Object Descriptor)";break;case b.Type.EXTERNAL:f+=" (External or Instance of)";break;case b.Type.REAL:f+=" (Real)";break;case b.Type.ENUMERATED:f+=" (Enumerated)";break;case b.Type.EMBEDDED:f+=" (Embedded PDV)";break;case b.Type.UTF8:f+=" (UTF8)";break;case b.Type.ROID:f+=" (Relative Object Identifier)";break;case b.Type.SEQUENCE:f+=" (Sequence)";break;case b.Type.SET:f+=" (Set)";break;case b.Type.PRINTABLESTRING:f+=" (Printable String)";break;case b.Type.IA5String:f+=" (IA5String (ASCII))";break;case b.Type.UTCTIME:f+=" (UTC time)";break;case b.Type.GENERALIZEDTIME:f+=" (Generalized time)";break;case b.Type.BMPSTRING:f+=" (BMP String)"}else f+=a.type;if(f+="\n",f+=g+"Constructed: "+a.constructed+"\n",a.composed){var i=0,j="";for(h=0;h<a.value.length;++h)void 0!==a.value[h]&&(i+=1,j+=b.prettyPrint(a.value[h],c+1,e),h+1<a.value.length&&(j+=","));f+=g+"Sub values: "+i+j}else{if(f+=g+"Value: ",a.type===b.Type.OID){var k=b.derToOid(a.value);f+=k,cz.pki&&cz.pki.oids&&k in cz.pki.oids&&(f+=" ("+cz.pki.oids[k]+") ")}if(a.type===b.Type.INTEGER)try{f+=b.derToInteger(a.value)}catch(b){f+="0x"+cz.util.bytesToHex(a.value)}else if(a.type===b.Type.BITSTRING){if(f+=a.value.length>1?"0x"+cz.util.bytesToHex(a.value.slice(1)):"(none)",a.value.length>0){var l=a.value.charCodeAt(0);1==l?f+=" (1 unused bit shown)":l>1&&(f+=" ("+l+" unused bits shown)")}}else if(a.type===b.Type.OCTETSTRING)d.test(a.value)||(f+="("+a.value+") "),f+="0x"+cz.util.bytesToHex(a.value);else if(a.type===b.Type.UTF8)try{f+=cz.util.decodeUtf8(a.value)}catch(b){if("URI malformed"!==b.message)throw b;f+="0x"+cz.util.bytesToHex(a.value)+" (malformed UTF8)"}else a.type===b.Type.PRINTABLESTRING||a.type===b.Type.IA5String?f+=a.value:d.test(a.value)?f+="0x"+cz.util.bytesToHex(a.value):f+=0===a.value.length?"[null]":a.value}return f}}),cz.md=cz.md||{},cz.md.algorithms=cz.md.algorithms||{},cB(function(a){(a.exports=cz.hmac=cz.hmac||{}).create=function(){var a=null,b=null,c=null,d=null,e={start:function(e,f){if(null!==e)if("string"==typeof e){if(!((e=e.toLowerCase())in cz.md.algorithms))throw Error('Unknown hash algorithm "'+e+'"');b=cz.md.algorithms[e].create()}else b=e;if(null===f)f=a;else{if("string"==typeof f)f=cz.util.createBuffer(f);else if(cz.util.isArray(f)){var g=f;f=cz.util.createBuffer();for(var h=0;h<g.length;++h)f.putByte(g[h])}var i=f.length();for(i>b.blockLength&&(b.start(),b.update(f.bytes()),f=b.digest()),c=cz.util.createBuffer(),d=cz.util.createBuffer(),i=f.length(),h=0;h<i;++h)g=f.at(h),c.putByte(54^g),d.putByte(92^g);if(i<b.blockLength)for(g=b.blockLength-i,h=0;h<g;++h)c.putByte(54),d.putByte(92);a=f,c=c.bytes(),d=d.bytes()}b.start(),b.update(c)},update:function(a){b.update(a)},getMac:function(){var a=b.digest().bytes();return b.start(),b.update(d),b.update(a),b.digest()}};return e.digest=e.getMac,e}}),cB(function(a){var b=a.exports=cz.md5=cz.md5||{};cz.md.md5=cz.md.algorithms.md5=b,b.create=function(){g||function(){c=String.fromCharCode(128)+cz.util.fillString("\0",64),d=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,1,6,11,0,5,10,15,4,9,14,3,8,13,2,7,12,5,8,11,14,1,4,7,10,13,0,3,6,9,12,15,2,0,7,14,5,12,3,10,1,8,15,6,13,4,11,2,9],e=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21],f=Array(64);for(var a=0;a<64;++a)f[a]=Math.floor(0x100000000*Math.abs(Math.sin(a+1)));g=!0}();var a=null,b=cz.util.createBuffer(),i=Array(16),j={algorithm:"md5",blockLength:64,digestLength:16,messageLength:0,fullMessageLength:null,messageLengthSize:8,start:function(){j.messageLength=0,j.fullMessageLength=j.messageLength64=[];for(var c=j.messageLengthSize/4,d=0;d<c;++d)j.fullMessageLength.push(0);return b=cz.util.createBuffer(),a={h0:0x67452301,h1:0xefcdab89,h2:0x98badcfe,h3:0x10325476},j}};return j.start(),j.update=function(c,d){"utf8"===d&&(c=cz.util.encodeUtf8(c));var e=c.length;j.messageLength+=e,e=[e/0x100000000>>>0,e>>>0];for(var f=j.fullMessageLength.length-1;f>=0;--f)j.fullMessageLength[f]+=e[1],e[1]=e[0]+(j.fullMessageLength[f]/0x100000000>>>0),j.fullMessageLength[f]=j.fullMessageLength[f]>>>0,e[0]=e[1]/0x100000000>>>0;return b.putBytes(c),h(a,i,b),(b.read>2048||0===b.length())&&b.compact(),j},j.digest=function(){var d=cz.util.createBuffer();d.putBytes(b.bytes()),d.putBytes(c.substr(0,j.blockLength-(j.fullMessageLength[j.fullMessageLength.length-1]+j.messageLengthSize&j.blockLength-1)));for(var e,f=0,g=j.fullMessageLength.length-1;g>=0;--g)f=(e=8*j.fullMessageLength[g]+f)/0x100000000>>>0,d.putInt32Le(e>>>0);var k={h0:a.h0,h1:a.h1,h2:a.h2,h3:a.h3};h(k,i,d);var l=cz.util.createBuffer();return l.putInt32Le(k.h0),l.putInt32Le(k.h1),l.putInt32Le(k.h2),l.putInt32Le(k.h3),l},j};var c=null,d=null,e=null,f=null,g=!1;function h(a,b,c){for(var g,h,i,j,k,l,m,n=c.length();n>=64;){for(h=a.h0,i=a.h1,j=a.h2,k=a.h3,m=0;m<16;++m)b[m]=c.getInt32Le(),g=h+(k^i&(j^k))+f[m]+b[m],h=k,k=j,j=i,i+=g<<(l=e[m])|g>>>32-l;for(;m<32;++m)g=h+(j^k&(i^j))+f[m]+b[d[m]],h=k,k=j,j=i,i+=g<<(l=e[m])|g>>>32-l;for(;m<48;++m)g=h+(i^j^k)+f[m]+b[d[m]],h=k,k=j,j=i,i+=g<<(l=e[m])|g>>>32-l;for(;m<64;++m)g=h+(j^(i|~k))+f[m]+b[d[m]],h=k,k=j,j=i,i+=g<<(l=e[m])|g>>>32-l;a.h0=a.h0+h|0,a.h1=a.h1+i|0,a.h2=a.h2+j|0,a.h3=a.h3+k|0,n-=64}}}),cB(function(a){var b=a.exports=cz.pem=cz.pem||{};function c(a){for(var b=a.name+": ",c=[],d=function(a,b){return" "+b},e=0;e<a.values.length;++e)c.push(a.values[e].replace(/^(\S+\r\n)/,d));b+=c.join(",")+"\r\n";var f=0,g=-1;for(e=0;e<b.length;++e,++f)if(f>65&&-1!==g){var h=b[g];","===h?(++g,b=b.substr(0,g)+"\r\n "+b.substr(g)):b=b.substr(0,g)+"\r\n"+h+b.substr(g+1),f=e-g-1,g=-1,++e}else" "!==b[e]&&"	"!==b[e]&&","!==b[e]||(g=e);return b}b.encode=function(a,b){b=b||{};var d,e="-----BEGIN "+a.type+"-----\r\n";if(a.procType&&(e+=c(d={name:"Proc-Type",values:[String(a.procType.version),a.procType.type]})),a.contentDomain&&(e+=c(d={name:"Content-Domain",values:[a.contentDomain]})),a.dekInfo&&(d={name:"DEK-Info",values:[a.dekInfo.algorithm]},a.dekInfo.parameters&&d.values.push(a.dekInfo.parameters),e+=c(d)),a.headers)for(var f=0;f<a.headers.length;++f)e+=c(a.headers[f]);return a.procType&&(e+="\r\n"),(e+=cz.util.encode64(a.body,b.maxline||64)+"\r\n")+"-----END "+a.type+"-----\r\n"},b.decode=function(a){for(var b,c=[],d=/\s*-----BEGIN ([A-Z0-9- ]+)-----\r?\n?([\x21-\x7e\s]+?(?:\r?\n\r?\n))?([:A-Za-z0-9+\/=\s]+?)-----END \1-----/g,e=/([\x21-\x7e]+):\s*([\x21-\x7e\s^:]+)/,f=/\r?\n/;b=d.exec(a);){var g=b[1];"NEW CERTIFICATE REQUEST"===g&&(g="CERTIFICATE REQUEST");var h={type:g,procType:null,contentDomain:null,dekInfo:null,headers:[],body:cz.util.decode64(b[3])};if(c.push(h),b[2]){for(var i=b[2].split(f),j=0;b&&j<i.length;){for(var k=i[j].replace(/\s+$/,""),l=j+1;l<i.length;++l){var m=i[l];if(!/\s/.test(m[0]))break;k+=m,j=l}if(b=k.match(e)){for(var n={name:b[1],values:[]},o=b[2].split(","),p=0;p<o.length;++p)n.values.push(o[p].replace(/^\s+/,""));if(h.procType)if(h.contentDomain||"Content-Domain"!==n.name)if(h.dekInfo||"DEK-Info"!==n.name)h.headers.push(n);else{if(0===n.values.length)throw Error('Invalid PEM formatted message. The "DEK-Info" header must have at least one subfield.');h.dekInfo={algorithm:o[0],parameters:o[1]||null}}else h.contentDomain=o[0]||"";else{if("Proc-Type"!==n.name)throw Error('Invalid PEM formatted message. The first encapsulated header must be "Proc-Type".');if(2!==n.values.length)throw Error('Invalid PEM formatted message. The "Proc-Type" header must have two subfields.');h.procType={version:o[0],type:o[1]}}}++j}if("ENCRYPTED"===h.procType&&!h.dekInfo)throw Error('Invalid PEM formatted message. The "DEK-Info" header must be present if "Proc-Type" is "ENCRYPTED".')}}if(0===c.length)throw Error("Invalid PEM formatted message.");return c}}),cz.des=cz.des||{},cz.des.startEncrypting=function(a,b,c,d){var e=c4({key:a,output:c,decrypt:!1,mode:d||(null===b?"ECB":"CBC")});return e.start(b),e},cz.des.createEncryptionCipher=function(a,b){return c4({key:a,output:null,decrypt:!1,mode:b})},cz.des.startDecrypting=function(a,b,c,d){var e=c4({key:a,output:c,decrypt:!0,mode:d||(null===b?"ECB":"CBC")});return e.start(b),e},cz.des.createDecryptionCipher=function(a,b){return c4({key:a,output:null,decrypt:!0,mode:b})},cz.des.Algorithm=function(a,b){var c=this;c.name=a,c.mode=new b({blockSize:8,cipher:{encrypt:function(a,b){return c3(c._keys,a,b,!1)},decrypt:function(a,b){return c3(c._keys,a,b,!0)}}}),c._init=!1},cz.des.Algorithm.prototype.initialize=function(a){if(!this._init){var b=cz.util.createBuffer(a.key);if(0===this.name.indexOf("3DES")&&24!==b.length())throw Error("Invalid Triple-DES key size: "+8*b.length());this._keys=function(a){for(var b,c=[0,4,0x20000000,0x20000004,65536,65540,0x20010000,0x20010004,512,516,0x20000200,0x20000204,66048,66052,0x20010200,0x20010204],d=[0,1,1048576,1048577,0x4000000,0x4000001,0x4100000,0x4100001,256,257,1048832,1048833,0x4000100,0x4000101,0x4100100,0x4100101],e=[0,8,2048,2056,0x1000000,0x1000008,0x1000800,0x1000808,0,8,2048,2056,0x1000000,0x1000008,0x1000800,0x1000808],f=[0,2097152,0x8000000,0x8200000,8192,2105344,0x8002000,0x8202000,131072,2228224,0x8020000,0x8220000,139264,2236416,0x8022000,0x8222000],g=[0,262144,16,262160,0,262144,16,262160,4096,266240,4112,266256,4096,266240,4112,266256],h=[0,1024,32,1056,0,1024,32,1056,0x2000000,0x2000400,0x2000020,0x2000420,0x2000000,0x2000400,0x2000020,0x2000420],i=[0,0x10000000,524288,0x10080000,2,0x10000002,524290,0x10080002,0,0x10000000,524288,0x10080000,2,0x10000002,524290,0x10080002],j=[0,65536,2048,67584,0x20000000,0x20010000,0x20000800,0x20010800,131072,196608,133120,198656,0x20020000,0x20030000,0x20020800,0x20030800],k=[0,262144,0,262144,2,262146,2,262146,0x2000000,0x2040000,0x2000000,0x2040000,0x2000002,0x2040002,0x2000002,0x2040002],l=[0,0x10000000,8,0x10000008,0,0x10000000,8,0x10000008,1024,0x10000400,1032,0x10000408,1024,0x10000400,1032,0x10000408],m=[0,32,0,32,1048576,1048608,1048576,1048608,8192,8224,8192,8224,1056768,1056800,1056768,1056800],n=[0,0x1000000,512,0x1000200,2097152,0x1200000,2097664,0x1200200,0x4000000,0x5000000,0x4000200,0x5000200,0x4200000,0x5200000,0x4200200,0x5200200],o=[0,4096,0x8000000,0x8001000,524288,528384,0x8080000,0x8081000,16,4112,0x8000010,0x8001010,524304,528400,0x8080010,0x8081010],p=[0,4,256,260,0,4,256,260,1,5,257,261,1,5,257,261],q=a.length()>8?3:1,r=[],s=[0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0],t=0,u=0;u<q;u++){var v=a.getInt32(),w=a.getInt32();v^=(b=0xf0f0f0f&(v>>>4^w))<<4,v^=b=65535&((w^=b)>>>-16^v),v^=(b=0x33333333&(v>>>2^(w^=b<<-16)))<<2,v^=b=65535&((w^=b)>>>-16^v),v^=(b=0x55555555&(v>>>1^(w^=b<<-16)))<<1,v^=b=0xff00ff&((w^=b)>>>8^v),b=(v^=(b=0x55555555&(v>>>1^(w^=b<<8)))<<1)<<8|(w^=b)>>>20&240,v=w<<24|w<<8&0xff0000|w>>>8&65280|w>>>24&240,w=b;for(var x=0;x<s.length;++x){s[x]?(v=v<<2|v>>>26,w=w<<2|w>>>26):(v=v<<1|v>>>27,w=w<<1|w>>>27);var y=c[(v&=-15)>>>28]|d[v>>>24&15]|e[v>>>20&15]|f[v>>>16&15]|g[v>>>12&15]|h[v>>>8&15]|i[v>>>4&15],z=j[(w&=-15)>>>28]|k[w>>>24&15]|l[w>>>20&15]|m[w>>>16&15]|n[w>>>12&15]|o[w>>>8&15]|p[w>>>4&15];r[t++]=y^(b=65535&(z>>>16^y)),r[t++]=z^b<<16}}return r}(b),this._init=!0}},cW("DES-ECB",cz.cipher.modes.ecb),cW("DES-CBC",cz.cipher.modes.cbc),cW("DES-CFB",cz.cipher.modes.cfb),cW("DES-OFB",cz.cipher.modes.ofb),cW("DES-CTR",cz.cipher.modes.ctr),cW("3DES-ECB",cz.cipher.modes.ecb),cW("3DES-CBC",cz.cipher.modes.cbc),cW("3DES-CFB",cz.cipher.modes.cfb),cW("3DES-OFB",cz.cipher.modes.ofb),cW("3DES-CTR",cz.cipher.modes.ctr);var cX=[0x1010400,0,65536,0x1010404,0x1010004,66564,4,65536,1024,0x1010400,0x1010404,1024,0x1000404,0x1010004,0x1000000,4,1028,0x1000400,0x1000400,66560,66560,0x1010000,0x1010000,0x1000404,65540,0x1000004,0x1000004,65540,0,1028,66564,0x1000000,65536,0x1010404,4,0x1010000,0x1010400,0x1000000,0x1000000,1024,0x1010004,65536,66560,0x1000004,1024,4,0x1000404,66564,0x1010404,65540,0x1010000,0x1000404,0x1000004,1028,66564,0x1010400,1028,0x1000400,0x1000400,0,65540,66560,0,0x1010004],cY=[-0x7fef7fe0,-0x7fff8000,32768,1081376,1048576,32,-0x7fefffe0,-0x7fff7fe0,-0x7fffffe0,-0x7fef7fe0,-0x7fef8000,-0x80000000,-0x7fff8000,1048576,32,-0x7fefffe0,1081344,1048608,-0x7fff7fe0,0,-0x80000000,32768,1081376,-0x7ff00000,1048608,-0x7fffffe0,0,1081344,32800,-0x7fef8000,-0x7ff00000,32800,0,1081376,-0x7fefffe0,1048576,-0x7fff7fe0,-0x7ff00000,-0x7fef8000,32768,-0x7ff00000,-0x7fff8000,32,-0x7fef7fe0,1081376,32,32768,-0x80000000,32800,-0x7fef8000,1048576,-0x7fffffe0,1048608,-0x7fff7fe0,-0x7fffffe0,1048608,1081344,0,-0x7fff8000,32800,-0x80000000,-0x7fefffe0,-0x7fef7fe0,1081344],cZ=[520,0x8020200,0,0x8020008,0x8000200,0,131592,0x8000200,131080,0x8000008,0x8000008,131072,0x8020208,131080,0x8020000,520,0x8000000,8,0x8020200,512,131584,0x8020000,0x8020008,131592,0x8000208,131584,131072,0x8000208,8,0x8020208,512,0x8000000,0x8020200,0x8000000,131080,520,131072,0x8020200,0x8000200,0,512,131080,0x8020208,0x8000200,0x8000008,512,0,0x8020008,0x8000208,131072,0x8000000,0x8020208,8,131592,131584,0x8000008,0x8020000,0x8000208,520,0x8020000,131592,8,0x8020008,131584],c$=[8396801,8321,8321,128,8396928,8388737,8388609,8193,0,8396800,8396800,8396929,129,0,8388736,8388609,1,8192,8388608,8396801,128,8388608,8193,8320,8388737,1,8320,8388736,8192,8396928,8396929,129,8388736,8388609,8396800,8396929,129,0,0,8396800,8320,8388736,8388737,1,8396801,8321,8321,128,8396929,129,1,8192,8388609,8193,8396928,8388737,8193,8320,8388608,8396801,128,8388608,8192,8396928],c_=[256,0x2080100,0x2080000,0x42000100,524288,256,0x40000000,0x2080000,0x40080100,524288,0x2000100,0x40080100,0x42000100,0x42080000,524544,0x40000000,0x2000000,0x40080000,0x40080000,0,0x40000100,0x42080100,0x42080100,0x2000100,0x42080000,0x40000100,0,0x42000000,0x2080100,0x2000000,0x42000000,524544,524288,0x42000100,256,0x2000000,0x40000000,0x2080000,0x42000100,0x40080100,0x2000100,0x40000000,0x42080000,0x2080100,0x40080100,256,0x2000000,0x42080000,0x42080100,524544,0x42000000,0x42080100,0x2080000,0,0x40080000,0x42000000,524544,0x2000100,0x40000100,524288,0,0x40080000,0x2080100,0x40000100],c0=[0x20000010,0x20400000,16384,0x20404010,0x20400000,16,0x20404010,4194304,0x20004000,4210704,4194304,0x20000010,4194320,0x20004000,0x20000000,16400,0,4194320,0x20004010,16384,4210688,0x20004010,16,0x20400010,0x20400010,0,4210704,0x20404000,16400,4210688,0x20404000,0x20000000,0x20004000,16,0x20400010,4210688,0x20404010,4194304,16400,0x20000010,4194304,0x20004000,0x20000000,16400,0x20000010,0x20404010,4210688,0x20400000,4210704,0x20404000,0,0x20400010,16,16384,0x20400000,4210704,16384,4194320,0x20004010,0,0x20404000,0x20000000,4194320,0x20004010],c1=[2097152,0x4200002,0x4000802,0,2048,0x4000802,2099202,0x4200800,0x4200802,2097152,0,0x4000002,2,0x4000000,0x4200002,2050,0x4000800,2099202,2097154,0x4000800,0x4000002,0x4200000,0x4200800,2097154,0x4200000,2048,2050,0x4200802,2099200,2,0x4000000,2099200,0x4000000,2099200,2097152,0x4000802,0x4000802,0x4200002,0x4200002,2,2097154,0x4000000,0x4000800,2097152,0x4200800,2050,2099202,0x4200800,2050,0x4000002,0x4200802,0x4200000,2099200,0,2,0x4200802,0,2099202,0x4200000,2048,0x4000002,0x4000800,2048,2097154],c2=[0x10001040,4096,262144,0x10041040,0x10000000,0x10001040,64,0x10000000,262208,0x10040000,0x10041040,266240,0x10041000,266304,4096,64,0x10040000,0x10000040,0x10001000,4160,266240,262208,0x10040040,0x10041000,4160,0,0,0x10040040,0x10000040,0x10001000,266304,262144,266304,262144,0x10041000,4096,64,0x10040040,4096,266304,0x10001000,64,0x10000040,0x10040000,0x10040040,0x10000000,262144,0x10001040,0,0x10041040,262208,0x10000040,0x10040000,0x10001000,0x10001040,0,0x10041040,266240,266240,4160,4160,262208,0x10000000,0x10041000];function c3(a,b,c,d){var e,f,g=32===a.length?3:9;e=3===g?d?[30,-2,-2]:[0,32,2]:d?[94,62,-2,32,64,2,30,-2,-2]:[0,32,2,62,30,-2,64,96,2];var h=b[0],i=b[1];h^=(f=0xf0f0f0f&(h>>>4^i))<<4,h^=(f=65535&(h>>>16^(i^=f)))<<16,h^=f=0x33333333&((i^=f)>>>2^h),h^=f=0xff00ff&((i^=f<<2)>>>8^h),h=(h^=(f=0x55555555&(h>>>1^(i^=f<<8)))<<1)<<1|h>>>31,i=(i^=f)<<1|i>>>31;for(var j=0;j<g;j+=3){for(var k=e[j+1],l=e[j+2],m=e[j];m!=k;m+=l){var n=i^a[m],o=(i>>>4|i<<28)^a[m+1];f=h,h=i,i=f^(cY[n>>>24&63]|c$[n>>>16&63]|c0[n>>>8&63]|c2[63&n]|cX[o>>>24&63]|cZ[o>>>16&63]|c_[o>>>8&63]|c1[63&o])}f=h,h=i,i=f}i=i>>>1|i<<31,i^=f=0x55555555&((h=h>>>1|h<<31)>>>1^i),i^=(f=0xff00ff&(i>>>8^(h^=f<<1)))<<8,i^=(f=0x33333333&(i>>>2^(h^=f)))<<2,i^=f=65535&((h^=f)>>>16^i),i^=f=0xf0f0f0f&((h^=f<<16)>>>4^i),c[0]=h^=f<<4,c[1]=i}function c4(a){var b,c="DES-"+((a=a||{}).mode||"CBC").toUpperCase(),d=(b=a.decrypt?cz.cipher.createDecipher(c,a.key):cz.cipher.createCipher(c,a.key)).start;return b.start=function(a,c){var e=null;c instanceof cz.util.ByteBuffer&&(e=c,c={}),(c=c||{}).output=e,c.iv=a,d.call(b,c)},b}var c5,c6={__proto__:null,default:{}},c7=cz.pkcs5=cz.pkcs5||{};cz.util.isNodejs&&!cz.options.usePureJavaScript&&(c5=c6),cz.pbkdf2=c7.pbkdf2=function(a,b,c,d,e,f){if("function"==typeof e&&(f=e,e=null),cz.util.isNodejs&&!cz.options.usePureJavaScript&&c5.pbkdf2&&(null===e||"object"!=typeof e)&&(c5.pbkdf2Sync.length>4||!e||"sha1"===e))return"string"!=typeof e&&(e="sha1"),a=Buffer.from(a,"binary"),b=Buffer.from(b,"binary"),f?4===c5.pbkdf2Sync.length?c5.pbkdf2(a,b,c,d,function(a,b){if(a)return f(a);f(null,b.toString("binary"))}):c5.pbkdf2(a,b,c,d,e,function(a,b){if(a)return f(a);f(null,b.toString("binary"))}):4===c5.pbkdf2Sync.length?c5.pbkdf2Sync(a,b,c,d).toString("binary"):c5.pbkdf2Sync(a,b,c,d,e).toString("binary");if(null==e&&(e="sha1"),"string"==typeof e){if(!(e in cz.md.algorithms))throw Error("Unknown hash algorithm: "+e);e=cz.md[e].create()}var g=e.digestLength;if(d>0xffffffff*g){var h=Error("Derived key is too long.");if(f)return f(h);throw h}var i=Math.ceil(d/g),j=d-(i-1)*g,k=cz.hmac.create();k.start(e,a);var l,m,n,o="";if(!f){for(var p=1;p<=i;++p){k.start(null,null),k.update(b),k.update(cz.util.int32ToBytes(p)),l=n=k.digest().getBytes();for(var q=2;q<=c;++q)k.start(null,null),k.update(n),m=k.digest().getBytes(),l=cz.util.xorBytes(l,m,g),n=m;o+=p<i?l:l.substr(0,j)}return o}p=1,function a(){if(p>i)return f(null,o);k.start(null,null),k.update(b),k.update(cz.util.int32ToBytes(p)),l=n=k.digest().getBytes(),q=2,function b(){if(q<=c)return k.start(null,null),k.update(n),m=k.digest().getBytes(),l=cz.util.xorBytes(l,m,g),n=m,++q,cz.util.setImmediate(b);o+=p<i?l:l.substr(0,j),++p,a()}()}()},cB(function(a){var b=a.exports=cz.sha256=cz.sha256||{};cz.md.sha256=cz.md.algorithms.sha256=b,b.create=function(){d||(c=String.fromCharCode(128)+cz.util.fillString("\0",64),e=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0xfc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x6ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2],d=!0);var a=null,b=cz.util.createBuffer(),g=Array(64),h={algorithm:"sha256",blockLength:64,digestLength:32,messageLength:0,fullMessageLength:null,messageLengthSize:8,start:function(){h.messageLength=0,h.fullMessageLength=h.messageLength64=[];for(var c=h.messageLengthSize/4,d=0;d<c;++d)h.fullMessageLength.push(0);return b=cz.util.createBuffer(),a={h0:0x6a09e667,h1:0xbb67ae85,h2:0x3c6ef372,h3:0xa54ff53a,h4:0x510e527f,h5:0x9b05688c,h6:0x1f83d9ab,h7:0x5be0cd19},h}};return h.start(),h.update=function(c,d){"utf8"===d&&(c=cz.util.encodeUtf8(c));var e=c.length;h.messageLength+=e,e=[e/0x100000000>>>0,e>>>0];for(var i=h.fullMessageLength.length-1;i>=0;--i)h.fullMessageLength[i]+=e[1],e[1]=e[0]+(h.fullMessageLength[i]/0x100000000>>>0),h.fullMessageLength[i]=h.fullMessageLength[i]>>>0,e[0]=e[1]/0x100000000>>>0;return b.putBytes(c),f(a,g,b),(b.read>2048||0===b.length())&&b.compact(),h},h.digest=function(){var d,e=cz.util.createBuffer();e.putBytes(b.bytes()),e.putBytes(c.substr(0,h.blockLength-(h.fullMessageLength[h.fullMessageLength.length-1]+h.messageLengthSize&h.blockLength-1)));for(var i=8*h.fullMessageLength[0],j=0;j<h.fullMessageLength.length-1;++j)e.putInt32((i+=(d=8*h.fullMessageLength[j+1])/0x100000000>>>0)>>>0),i=d>>>0;e.putInt32(i);var k={h0:a.h0,h1:a.h1,h2:a.h2,h3:a.h3,h4:a.h4,h5:a.h5,h6:a.h6,h7:a.h7};f(k,g,e);var l=cz.util.createBuffer();return l.putInt32(k.h0),l.putInt32(k.h1),l.putInt32(k.h2),l.putInt32(k.h3),l.putInt32(k.h4),l.putInt32(k.h5),l.putInt32(k.h6),l.putInt32(k.h7),l},h};var c=null,d=!1,e=null;function f(a,b,c){for(var d,f,g,h,i,j,k,l,m,n,o,p,q=c.length();q>=64;){for(h=0;h<16;++h)b[h]=c.getInt32();for(;h<64;++h)b[h]=(d=((d=b[h-2])>>>17|d<<15)^(d>>>19|d<<13)^d>>>10)+b[h-7]+(f=((f=b[h-15])>>>7|f<<25)^(f>>>18|f<<14)^f>>>3)+b[h-16]|0;for(i=a.h0,j=a.h1,k=a.h2,l=a.h3,m=a.h4,n=a.h5,o=a.h6,p=a.h7,h=0;h<64;++h)g=i&j|k&(i^j),d=p+((m>>>6|m<<26)^(m>>>11|m<<21)^(m>>>25|m<<7))+(o^m&(n^o))+e[h]+b[h],p=o,o=n,n=m,m=l+d>>>0,l=k,k=j,j=i,i=d+(f=((i>>>2|i<<30)^(i>>>13|i<<19)^(i>>>22|i<<10))+g)>>>0;a.h0=a.h0+i|0,a.h1=a.h1+j|0,a.h2=a.h2+k|0,a.h3=a.h3+l|0,a.h4=a.h4+m|0,a.h5=a.h5+n|0,a.h6=a.h6+o|0,a.h7=a.h7+p|0,q-=64}}}),cB(function(a){var b=null;!cz.util.isNodejs||cz.options.usePureJavaScript||process.versions["node-webkit"]||(b=c6),(a.exports=cz.prng=cz.prng||{}).create=function(a){for(var c={plugin:a,key:null,seed:null,time:null,reseeds:0,generated:0,keyBytes:""},d=a.md,e=Array(32),f=0;f<32;++f)e[f]=d.create();function g(){c.reseeds=0xffffffff===c.reseeds?0:c.reseeds+1;var a=c.plugin.md.create();a.update(c.keyBytes);for(var b=1,d=0;d<32;++d)c.reseeds%b==0&&(a.update(c.pools[d].digest().getBytes()),c.pools[d].start()),b<<=1;c.keyBytes=a.digest().getBytes(),a.start(),a.update(c.keyBytes);var e=a.digest().getBytes();c.key=c.plugin.formatKey(c.keyBytes),c.seed=c.plugin.formatSeed(e),c.generated=0}function h(a){var b=null,c=cz.util.globalScope,d=c.crypto||c.msCrypto;d&&d.getRandomValues&&(b=function(a){return d.getRandomValues(a)});var e=cz.util.createBuffer();if(b)for(;e.length()<a;){var f=new Uint32Array(Math.floor(Math.max(1,Math.min(a-e.length(),65536)/4)));try{b(f);for(var g=0;g<f.length;++g)e.putInt32(f[g])}catch(a){if(!("u">typeof QuotaExceededError&&a instanceof QuotaExceededError))throw a}}if(e.length()<a)for(var h,i,j,k=Math.floor(65536*Math.random());e.length()<a;)for(k=0|(i=(0x7fffffff&(i=16807*(65535&k)+((32767&(h=16807*(k>>16)))<<16)+(h>>15)))+(i>>31)),g=0;g<3;++g)j=k>>>(g<<3)^Math.floor(256*Math.random()),e.putByte(255&j);return e.getBytes(a)}return c.pools=e,c.pool=0,c.generate=function(a,b){if(!b)return c.generateSync(a);var d=c.plugin.cipher,e=c.plugin.increment,f=c.plugin.formatKey,h=c.plugin.formatSeed,i=cz.util.createBuffer();c.key=null,function j(k){if(k)return b(k);if(i.length()>=a)return b(null,i.getBytes(a));if(c.generated>1048575&&(c.key=null),null===c.key)return cz.util.nextTick(function(){!function(a){if(c.pools[0].messageLength>=32)return g(),a();c.seedFile(32-c.pools[0].messageLength<<5,function(b,d){if(b)return a(b);c.collect(d),g(),a()})}(j)});var l=d(c.key,c.seed);c.generated+=l.length,i.putBytes(l),c.key=f(d(c.key,e(c.seed))),c.seed=h(d(c.key,c.seed)),cz.util.setImmediate(j)}()},c.generateSync=function(a){var b=c.plugin.cipher,d=c.plugin.increment,e=c.plugin.formatKey,f=c.plugin.formatSeed;c.key=null;for(var h=cz.util.createBuffer();h.length()<a;){c.generated>1048575&&(c.key=null),null===c.key&&function(){if(c.pools[0].messageLength>=32)return g();c.collect(c.seedFileSync(32-c.pools[0].messageLength<<5)),g()}();var i=b(c.key,c.seed);c.generated+=i.length,h.putBytes(i),c.key=e(b(c.key,d(c.seed))),c.seed=f(b(c.key,c.seed))}return h.getBytes(a)},b?(c.seedFile=function(a,c){b.randomBytes(a,function(a,b){if(a)return c(a);c(null,b.toString())})},c.seedFileSync=function(a){return b.randomBytes(a).toString()}):(c.seedFile=function(a,b){try{b(null,h(a))}catch(a){b(a)}},c.seedFileSync=h),c.collect=function(a){for(var b=a.length,d=0;d<b;++d)c.pools[c.pool].update(a.substr(d,1)),c.pool=31===c.pool?0:c.pool+1},c.collectInt=function(a,b){for(var d="",e=0;e<b;e+=8)d+=String.fromCharCode(a>>e&255);c.collect(d)},c.registerWorker=function(a){a===self?c.seedFile=function(a,b){self.addEventListener("message",function a(c){var d=c.data;d.forge&&d.forge.prng&&(self.removeEventListener("message",a),b(d.forge.prng.err,d.forge.prng.bytes))}),self.postMessage({forge:{prng:{needed:a}}})}:a.addEventListener("message",function(b){var d=b.data;d.forge&&d.forge.prng&&c.seedFile(d.forge.prng.needed,function(b,c){a.postMessage({forge:{prng:{err:b,bytes:c}}})})})},c}}),cB(function(a){cz.random&&cz.random.getBytes?a.exports=cz.random:function(b){var c={},d=[,,,,],e=cz.util.createBuffer();function f(){var a=cz.prng.create(c);return a.getBytes=function(b,c){return a.generate(b,c)},a.getBytesSync=function(b){return a.generate(b)},a}c.formatKey=function(a){var b=cz.util.createBuffer(a);return(a=[,,,,])[0]=b.getInt32(),a[1]=b.getInt32(),a[2]=b.getInt32(),a[3]=b.getInt32(),cz.aes._expandKey(a,!1)},c.formatSeed=function(a){var b=cz.util.createBuffer(a);return(a=[,,,,])[0]=b.getInt32(),a[1]=b.getInt32(),a[2]=b.getInt32(),a[3]=b.getInt32(),a},c.cipher=function(a,b){return cz.aes._updateBlock(a,b,d,!1),e.putInt32(d[0]),e.putInt32(d[1]),e.putInt32(d[2]),e.putInt32(d[3]),e.getBytes()},c.increment=function(a){return++a[3],a},c.md=cz.md.sha256;var g=f(),h=null,i=cz.util.globalScope,j=i.crypto||i.msCrypto;if(j&&j.getRandomValues&&(h=function(a){return j.getRandomValues(a)}),!cz.util.isNodejs&&!h){if(g.collectInt(+new Date,32),"u">typeof navigator){var k="";for(var l in navigator)try{"string"==typeof navigator[l]&&(k+=navigator[l])}catch(a){}g.collect(k),k=null}b&&(b().mousemove(function(a){g.collectInt(a.clientX,16),g.collectInt(a.clientY,16)}),b().keypress(function(a){g.collectInt(a.charCode,8)}))}if(cz.random)for(var l in g)cz.random[l]=g[l];else cz.random=g;cz.random.createInstance=f,a.exports=cz.random}("u">typeof jQuery?jQuery:null)});var c8=[217,120,249,196,25,221,181,237,40,233,253,121,74,160,216,157,198,126,55,131,43,118,83,142,98,76,100,136,68,139,251,162,23,154,89,245,135,179,79,19,97,69,109,141,9,129,125,50,189,143,64,235,134,183,123,11,240,149,33,34,92,107,78,130,84,214,101,147,206,96,178,28,115,86,192,20,167,140,241,220,18,117,202,31,59,190,228,209,66,61,212,48,163,60,182,38,111,191,14,218,70,105,7,87,39,242,29,155,188,148,67,3,248,17,199,246,144,239,62,231,6,195,213,47,200,102,30,215,8,232,234,222,128,82,238,247,132,170,114,172,53,77,106,42,150,26,210,113,90,21,73,116,75,159,208,94,4,24,164,236,194,224,65,110,15,81,203,204,36,145,175,80,161,244,112,57,153,124,58,133,35,184,180,122,252,2,54,91,37,85,151,49,45,93,250,152,227,138,146,174,5,223,41,16,103,108,186,201,211,0,230,207,225,158,168,44,99,22,1,63,88,226,137,169,13,56,52,27,171,51,255,176,187,72,12,95,185,177,205,46,197,243,219,71,229,165,156,119,10,166,32,104,254,127,193,173],c9=[1,2,3,5];cz.rc2=cz.rc2||{},cz.rc2.expandKey=function(a,b){"string"==typeof a&&(a=cz.util.createBuffer(a)),b=b||128;var c,d=a,e=a.length(),f=b,g=Math.ceil(f/8);for(c=e;c<128;c++)d.putByte(c8[d.at(c-1)+d.at(c-e)&255]);for(d.setAt(128-g,c8[d.at(128-g)&255>>(7&f)]),c=127-g;c>=0;c--)d.setAt(c,c8[d.at(c+1)^d.at(c+g)]);return d};var da,db=function(a,b,c){var d,e,f,g,h=!1,i=null,j=null,k=null,l=[];for(a=cz.rc2.expandKey(a,b),f=0;f<64;f++)l.push(a.getInt16Le());c?(d=function(a){for(f=0;f<4;f++){var b,c;a[f]+=l[g]+(a[(f+3)%4]&a[(f+2)%4])+(~a[(f+3)%4]&a[(f+1)%4]),a[f]=(b=a[f])<<(c=c9[f])&65535|(65535&b)>>16-c,g++}},e=function(a){for(f=0;f<4;f++)a[f]+=l[63&a[(f+3)%4]]}):(d=function(a){for(f=3;f>=0;f--){var b,c;a[f]=(65535&(b=a[f]))>>(c=c9[f])|b<<16-c&65535,a[f]-=l[g]+(a[(f+3)%4]&a[(f+2)%4])+(~a[(f+3)%4]&a[(f+1)%4]),g--}},e=function(a){for(f=3;f>=0;f--)a[f]-=l[63&a[(f+3)%4]]});var m=function(a){var b=[];for(f=0;f<4;f++){var d=i.getInt16Le();null!==k&&(c?d^=k.getInt16Le():k.putInt16Le(d)),b.push(65535&d)}g=63*!c;for(var e=0;e<a.length;e++)for(var h=0;h<a[e][0];h++)a[e][1](b);for(f=0;f<4;f++)null!==k&&(c?k.putInt16Le(b[f]):b[f]^=k.getInt16Le()),j.putInt16Le(b[f])},n=null;return n={start:function(a,b){a&&"string"==typeof a&&(a=cz.util.createBuffer(a)),h=!1,i=cz.util.createBuffer(),j=b||new cz.util.createBuffer,k=a,n.output=j},update:function(a){for(h||i.putBuffer(a);i.length()>=8;)m([[5,d],[1,e],[6,d],[1,e],[5,d]])},finish:function(a){var b=!0;if(c)if(a)b=a(8,i,!c);else{var d=8===i.length()?8:8-i.length();i.fillWithByte(d,d)}if(b&&(h=!0,n.update()),!c&&(b=0===i.length()))if(a)b=a(8,j,!c);else{var e=j.length(),f=j.at(e-1);f>e?b=!1:j.truncate(f)}return b}}};function dc(a,b,c){this.data=[],null!=a&&("number"==typeof a?this.fromNumber(a,b,c):this.fromString(a,null==b&&"string"!=typeof a?256:b))}function dd(){return new dc(null)}function de(a,b,c,d,e,f){for(var g=16383&b,h=b>>14;--f>=0;){var i=16383&this.data[a],j=this.data[a++]>>14,k=h*i+j*g;e=((i=g*i+((16383&k)<<14)+c.data[d]+e)>>28)+(k>>14)+h*j,c.data[d++]=0xfffffff&i}return e}cz.rc2.startEncrypting=function(a,b,c){var d=cz.rc2.createEncryptionCipher(a,128);return d.start(b,c),d},cz.rc2.createEncryptionCipher=function(a,b){return db(a,b,!0)},cz.rc2.startDecrypting=function(a,b,c){var d=cz.rc2.createDecryptionCipher(a,128);return d.start(b,c),d},cz.rc2.createDecryptionCipher=function(a,b){return db(a,b,!1)},cz.jsbn=cz.jsbn||{},cz.jsbn.BigInteger=dc,"u"<typeof navigator?(dc.prototype.am=de,da=28):"Microsoft Internet Explorer"==navigator.appName?(dc.prototype.am=function(a,b,c,d,e,f){for(var g=32767&b,h=b>>15;--f>=0;){var i=32767&this.data[a],j=this.data[a++]>>15,k=h*i+j*g;e=((i=g*i+((32767&k)<<15)+c.data[d]+(0x3fffffff&e))>>>30)+(k>>>15)+h*j+(e>>>30),c.data[d++]=0x3fffffff&i}return e},da=30):"Netscape"!=navigator.appName?(dc.prototype.am=function(a,b,c,d,e,f){for(;--f>=0;){var g=b*this.data[a++]+c.data[d]+e;e=Math.floor(g/0x4000000),c.data[d++]=0x3ffffff&g}return e},da=26):(dc.prototype.am=de,da=28),dc.prototype.DB=da,dc.prototype.DM=(1<<da)-1,dc.prototype.DV=1<<da,dc.prototype.FV=0x10000000000000,dc.prototype.F1=52-da,dc.prototype.F2=2*da-52;var df,dg,dh=[];for(df=48,dg=0;dg<=9;++dg)dh[df++]=dg;for(df=97,dg=10;dg<36;++dg)dh[df++]=dg;for(df=65,dg=10;dg<36;++dg)dh[df++]=dg;function di(a){return"0123456789abcdefghijklmnopqrstuvwxyz".charAt(a)}function dj(a,b){var c=dh[a.charCodeAt(b)];return null==c?-1:c}function dk(a){var b=dd();return b.fromInt(a),b}function dl(a){var b,c=1;return 0!=(b=a>>>16)&&(a=b,c+=16),0!=(b=a>>8)&&(a=b,c+=8),0!=(b=a>>4)&&(a=b,c+=4),0!=(b=a>>2)&&(a=b,c+=2),0!=(b=a>>1)&&(a=b,c+=1),c}function dm(a){this.m=a}function dn(a){this.m=a,this.mp=a.invDigit(),this.mpl=32767&this.mp,this.mph=this.mp>>15,this.um=(1<<a.DB-15)-1,this.mt2=2*a.t}function dp(a,b){return a&b}function dq(a,b){return a|b}function dr(a,b){return a^b}function ds(a,b){return a&~b}function dt(){}function du(a){return a}function dv(a){this.r2=dd(),this.q3=dd(),dc.ONE.dlShiftTo(2*a.t,this.r2),this.mu=this.r2.divide(a),this.m=a}dm.prototype.convert=function(a){return a.s<0||a.compareTo(this.m)>=0?a.mod(this.m):a},dm.prototype.revert=function(a){return a},dm.prototype.reduce=function(a){a.divRemTo(this.m,null,a)},dm.prototype.mulTo=function(a,b,c){a.multiplyTo(b,c),this.reduce(c)},dm.prototype.sqrTo=function(a,b){a.squareTo(b),this.reduce(b)},dn.prototype.convert=function(a){var b=dd();return a.abs().dlShiftTo(this.m.t,b),b.divRemTo(this.m,null,b),a.s<0&&b.compareTo(dc.ZERO)>0&&this.m.subTo(b,b),b},dn.prototype.revert=function(a){var b=dd();return a.copyTo(b),this.reduce(b),b},dn.prototype.reduce=function(a){for(;a.t<=this.mt2;)a.data[a.t++]=0;for(var b=0;b<this.m.t;++b){var c=32767&a.data[b],d=c*this.mpl+((c*this.mph+(a.data[b]>>15)*this.mpl&this.um)<<15)&a.DM;for(a.data[c=b+this.m.t]+=this.m.am(0,d,a,b,0,this.m.t);a.data[c]>=a.DV;)a.data[c]-=a.DV,a.data[++c]++}a.clamp(),a.drShiftTo(this.m.t,a),a.compareTo(this.m)>=0&&a.subTo(this.m,a)},dn.prototype.mulTo=function(a,b,c){a.multiplyTo(b,c),this.reduce(c)},dn.prototype.sqrTo=function(a,b){a.squareTo(b),this.reduce(b)},dc.prototype.copyTo=function(a){for(var b=this.t-1;b>=0;--b)a.data[b]=this.data[b];a.t=this.t,a.s=this.s},dc.prototype.fromInt=function(a){this.t=1,this.s=a<0?-1:0,a>0?this.data[0]=a:a<-1?this.data[0]=a+this.DV:this.t=0},dc.prototype.fromString=function(a,b){var c;if(16==b)c=4;else if(8==b)c=3;else if(256==b)c=8;else if(2==b)c=1;else if(32==b)c=5;else{if(4!=b)return void this.fromRadix(a,b);c=2}this.t=0,this.s=0;for(var d=a.length,e=!1,f=0;--d>=0;){var g=8==c?255&a[d]:dj(a,d);g<0?"-"==a.charAt(d)&&(e=!0):(e=!1,0==f?this.data[this.t++]=g:f+c>this.DB?(this.data[this.t-1]|=(g&(1<<this.DB-f)-1)<<f,this.data[this.t++]=g>>this.DB-f):this.data[this.t-1]|=g<<f,(f+=c)>=this.DB&&(f-=this.DB))}8==c&&128&a[0]&&(this.s=-1,f>0&&(this.data[this.t-1]|=(1<<this.DB-f)-1<<f)),this.clamp(),e&&dc.ZERO.subTo(this,this)},dc.prototype.clamp=function(){for(var a=this.s&this.DM;this.t>0&&this.data[this.t-1]==a;)--this.t},dc.prototype.dlShiftTo=function(a,b){var c;for(c=this.t-1;c>=0;--c)b.data[c+a]=this.data[c];for(c=a-1;c>=0;--c)b.data[c]=0;b.t=this.t+a,b.s=this.s},dc.prototype.drShiftTo=function(a,b){for(var c=a;c<this.t;++c)b.data[c-a]=this.data[c];b.t=Math.max(this.t-a,0),b.s=this.s},dc.prototype.lShiftTo=function(a,b){var c,d=a%this.DB,e=this.DB-d,f=(1<<e)-1,g=Math.floor(a/this.DB),h=this.s<<d&this.DM;for(c=this.t-1;c>=0;--c)b.data[c+g+1]=this.data[c]>>e|h,h=(this.data[c]&f)<<d;for(c=g-1;c>=0;--c)b.data[c]=0;b.data[g]=h,b.t=this.t+g+1,b.s=this.s,b.clamp()},dc.prototype.rShiftTo=function(a,b){b.s=this.s;var c=Math.floor(a/this.DB);if(c>=this.t)b.t=0;else{var d=a%this.DB,e=this.DB-d,f=(1<<d)-1;b.data[0]=this.data[c]>>d;for(var g=c+1;g<this.t;++g)b.data[g-c-1]|=(this.data[g]&f)<<e,b.data[g-c]=this.data[g]>>d;d>0&&(b.data[this.t-c-1]|=(this.s&f)<<e),b.t=this.t-c,b.clamp()}},dc.prototype.subTo=function(a,b){for(var c=0,d=0,e=Math.min(a.t,this.t);c<e;)d+=this.data[c]-a.data[c],b.data[c++]=d&this.DM,d>>=this.DB;if(a.t<this.t){for(d-=a.s;c<this.t;)d+=this.data[c],b.data[c++]=d&this.DM,d>>=this.DB;d+=this.s}else{for(d+=this.s;c<a.t;)d-=a.data[c],b.data[c++]=d&this.DM,d>>=this.DB;d-=a.s}b.s=d<0?-1:0,d<-1?b.data[c++]=this.DV+d:d>0&&(b.data[c++]=d),b.t=c,b.clamp()},dc.prototype.multiplyTo=function(a,b){var c=this.abs(),d=a.abs(),e=c.t;for(b.t=e+d.t;--e>=0;)b.data[e]=0;for(e=0;e<d.t;++e)b.data[e+c.t]=c.am(0,d.data[e],b,e,0,c.t);b.s=0,b.clamp(),this.s!=a.s&&dc.ZERO.subTo(b,b)},dc.prototype.squareTo=function(a){for(var b=this.abs(),c=a.t=2*b.t;--c>=0;)a.data[c]=0;for(c=0;c<b.t-1;++c){var d=b.am(c,b.data[c],a,2*c,0,1);(a.data[c+b.t]+=b.am(c+1,2*b.data[c],a,2*c+1,d,b.t-c-1))>=b.DV&&(a.data[c+b.t]-=b.DV,a.data[c+b.t+1]=1)}a.t>0&&(a.data[a.t-1]+=b.am(c,b.data[c],a,2*c,0,1)),a.s=0,a.clamp()},dc.prototype.divRemTo=function(a,b,c){var d=a.abs();if(!(d.t<=0)){var e=this.abs();if(e.t<d.t)return null!=b&&b.fromInt(0),void(null!=c&&this.copyTo(c));null==c&&(c=dd());var f=dd(),g=this.s,h=a.s,i=this.DB-dl(d.data[d.t-1]);i>0?(d.lShiftTo(i,f),e.lShiftTo(i,c)):(d.copyTo(f),e.copyTo(c));var j=f.t,k=f.data[j-1];if(0!=k){var l=k*(1<<this.F1)+(j>1?f.data[j-2]>>this.F2:0),m=this.FV/l,n=(1<<this.F1)/l,o=1<<this.F2,p=c.t,q=p-j,r=null==b?dd():b;for(f.dlShiftTo(q,r),c.compareTo(r)>=0&&(c.data[c.t++]=1,c.subTo(r,c)),dc.ONE.dlShiftTo(j,r),r.subTo(f,f);f.t<j;)f.data[f.t++]=0;for(;--q>=0;){var s=c.data[--p]==k?this.DM:Math.floor(c.data[p]*m+(c.data[p-1]+o)*n);if((c.data[p]+=f.am(0,s,c,q,0,j))<s)for(f.dlShiftTo(q,r),c.subTo(r,c);c.data[p]<--s;)c.subTo(r,c)}null!=b&&(c.drShiftTo(j,b),g!=h&&dc.ZERO.subTo(b,b)),c.t=j,c.clamp(),i>0&&c.rShiftTo(i,c),g<0&&dc.ZERO.subTo(c,c)}}},dc.prototype.invDigit=function(){if(this.t<1)return 0;var a=this.data[0];if(!(1&a))return 0;var b=3&a;return(b=(b=(b=(b=b*(2-(15&a)*b)&15)*(2-(255&a)*b)&255)*(2-((65535&a)*b&65535))&65535)*(2-a*b%this.DV)%this.DV)>0?this.DV-b:-b},dc.prototype.isEven=function(){return 0==(this.t>0?1&this.data[0]:this.s)},dc.prototype.exp=function(a,b){if(a>0xffffffff||a<1)return dc.ONE;var c=dd(),d=dd(),e=b.convert(this),f=dl(a)-1;for(e.copyTo(c);--f>=0;)if(b.sqrTo(c,d),(a&1<<f)>0)b.mulTo(d,e,c);else{var g=c;c=d,d=g}return b.revert(c)},dc.prototype.toString=function(a){if(this.s<0)return"-"+this.negate().toString(a);if(16==a)b=4;else if(8==a)b=3;else if(2==a)b=1;else if(32==a)b=5;else{if(4!=a)return this.toRadix(a);b=2}var b,c,d=(1<<b)-1,e=!1,f="",g=this.t,h=this.DB-g*this.DB%b;if(g-- >0)for(h<this.DB&&(c=this.data[g]>>h)>0&&(e=!0,f=di(c));g>=0;)h<b?c=(this.data[g]&(1<<h)-1)<<b-h|this.data[--g]>>(h+=this.DB-b):(c=this.data[g]>>(h-=b)&d,h<=0&&(h+=this.DB,--g)),c>0&&(e=!0),e&&(f+=di(c));return e?f:"0"},dc.prototype.negate=function(){var a=dd();return dc.ZERO.subTo(this,a),a},dc.prototype.abs=function(){return this.s<0?this.negate():this},dc.prototype.compareTo=function(a){var b=this.s-a.s;if(0!=b)return b;var c=this.t;if(0!=(b=c-a.t))return this.s<0?-b:b;for(;--c>=0;)if(0!=(b=this.data[c]-a.data[c]))return b;return 0},dc.prototype.bitLength=function(){return this.t<=0?0:this.DB*(this.t-1)+dl(this.data[this.t-1]^this.s&this.DM)},dc.prototype.mod=function(a){var b=dd();return this.abs().divRemTo(a,null,b),this.s<0&&b.compareTo(dc.ZERO)>0&&a.subTo(b,b),b},dc.prototype.modPowInt=function(a,b){var c;return c=a<256||b.isEven()?new dm(b):new dn(b),this.exp(a,c)},dc.ZERO=dk(0),dc.ONE=dk(1),dt.prototype.convert=du,dt.prototype.revert=du,dt.prototype.mulTo=function(a,b,c){a.multiplyTo(b,c)},dt.prototype.sqrTo=function(a,b){a.squareTo(b)},dv.prototype.convert=function(a){if(a.s<0||a.t>2*this.m.t)return a.mod(this.m);if(0>a.compareTo(this.m))return a;var b=dd();return a.copyTo(b),this.reduce(b),b},dv.prototype.revert=function(a){return a},dv.prototype.reduce=function(a){for(a.drShiftTo(this.m.t-1,this.r2),a.t>this.m.t+1&&(a.t=this.m.t+1,a.clamp()),this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3),this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);0>a.compareTo(this.r2);)a.dAddOffset(1,this.m.t+1);for(a.subTo(this.r2,a);a.compareTo(this.m)>=0;)a.subTo(this.m,a)},dv.prototype.mulTo=function(a,b,c){a.multiplyTo(b,c),this.reduce(c)},dv.prototype.sqrTo=function(a,b){a.squareTo(b),this.reduce(b)};var dw=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509],dx=0x4000000/dw[dw.length-1];if(dc.prototype.chunkSize=function(a){return Math.floor(Math.LN2*this.DB/Math.log(a))},dc.prototype.toRadix=function(a){if(null==a&&(a=10),0==this.signum()||a<2||a>36)return"0";var b=this.chunkSize(a),c=Math.pow(a,b),d=dk(c),e=dd(),f=dd(),g="";for(this.divRemTo(d,e,f);e.signum()>0;)g=(c+f.intValue()).toString(a).substr(1)+g,e.divRemTo(d,e,f);return f.intValue().toString(a)+g},dc.prototype.fromRadix=function(a,b){this.fromInt(0),null==b&&(b=10);for(var c=this.chunkSize(b),d=Math.pow(b,c),e=!1,f=0,g=0,h=0;h<a.length;++h){var i=dj(a,h);i<0?"-"==a.charAt(h)&&0==this.signum()&&(e=!0):(g=b*g+i,++f>=c&&(this.dMultiply(d),this.dAddOffset(g,0),f=0,g=0))}f>0&&(this.dMultiply(Math.pow(b,f)),this.dAddOffset(g,0)),e&&dc.ZERO.subTo(this,this)},dc.prototype.fromNumber=function(a,b,c){if("number"==typeof b)if(a<2)this.fromInt(1);else for(this.fromNumber(a,c),this.testBit(a-1)||this.bitwiseTo(dc.ONE.shiftLeft(a-1),dq,this),this.isEven()&&this.dAddOffset(1,0);!this.isProbablePrime(b);)this.dAddOffset(2,0),this.bitLength()>a&&this.subTo(dc.ONE.shiftLeft(a-1),this);else{var d=[],e=7&a;d.length=1+(a>>3),b.nextBytes(d),e>0?d[0]&=(1<<e)-1:d[0]=0,this.fromString(d,256)}},dc.prototype.bitwiseTo=function(a,b,c){var d,e,f=Math.min(a.t,this.t);for(d=0;d<f;++d)c.data[d]=b(this.data[d],a.data[d]);if(a.t<this.t){for(e=a.s&this.DM,d=f;d<this.t;++d)c.data[d]=b(this.data[d],e);c.t=this.t}else{for(e=this.s&this.DM,d=f;d<a.t;++d)c.data[d]=b(e,a.data[d]);c.t=a.t}c.s=b(this.s,a.s),c.clamp()},dc.prototype.changeBit=function(a,b){var c=dc.ONE.shiftLeft(a);return this.bitwiseTo(c,b,c),c},dc.prototype.addTo=function(a,b){for(var c=0,d=0,e=Math.min(a.t,this.t);c<e;)d+=this.data[c]+a.data[c],b.data[c++]=d&this.DM,d>>=this.DB;if(a.t<this.t){for(d+=a.s;c<this.t;)d+=this.data[c],b.data[c++]=d&this.DM,d>>=this.DB;d+=this.s}else{for(d+=this.s;c<a.t;)d+=a.data[c],b.data[c++]=d&this.DM,d>>=this.DB;d+=a.s}b.s=d<0?-1:0,d>0?b.data[c++]=d:d<-1&&(b.data[c++]=this.DV+d),b.t=c,b.clamp()},dc.prototype.dMultiply=function(a){this.data[this.t]=this.am(0,a-1,this,0,0,this.t),++this.t,this.clamp()},dc.prototype.dAddOffset=function(a,b){if(0!=a){for(;this.t<=b;)this.data[this.t++]=0;for(this.data[b]+=a;this.data[b]>=this.DV;)this.data[b]-=this.DV,++b>=this.t&&(this.data[this.t++]=0),++this.data[b]}},dc.prototype.multiplyLowerTo=function(a,b,c){var d,e=Math.min(this.t+a.t,b);for(c.s=0,c.t=e;e>0;)c.data[--e]=0;for(d=c.t-this.t;e<d;++e)c.data[e+this.t]=this.am(0,a.data[e],c,e,0,this.t);for(d=Math.min(a.t,b);e<d;++e)this.am(0,a.data[e],c,e,0,b-e);c.clamp()},dc.prototype.multiplyUpperTo=function(a,b,c){--b;var d=c.t=this.t+a.t-b;for(c.s=0;--d>=0;)c.data[d]=0;for(d=Math.max(b-this.t,0);d<a.t;++d)c.data[this.t+d-b]=this.am(b-d,a.data[d],c,0,0,this.t+d-b);c.clamp(),c.drShiftTo(1,c)},dc.prototype.modInt=function(a){if(a<=0)return 0;var b=this.DV%a,c=this.s<0?a-1:0;if(this.t>0)if(0==b)c=this.data[0]%a;else for(var d=this.t-1;d>=0;--d)c=(b*c+this.data[d])%a;return c},dc.prototype.millerRabin=function(a){var b=this.subtract(dc.ONE),c=b.getLowestSetBit();if(c<=0)return!1;for(var d,e=b.shiftRight(c),f={nextBytes:function(a){for(var b=0;b<a.length;++b)a[b]=Math.floor(256*Math.random())}},g=0;g<a;++g){do d=new dc(this.bitLength(),f);while(0>=d.compareTo(dc.ONE)||d.compareTo(b)>=0)var h=d.modPow(e,this);if(0!=h.compareTo(dc.ONE)&&0!=h.compareTo(b)){for(var i=1;i++<c&&0!=h.compareTo(b);)if(0==(h=h.modPowInt(2,this)).compareTo(dc.ONE))return!1;if(0!=h.compareTo(b))return!1}}return!0},dc.prototype.clone=function(){var a=dd();return this.copyTo(a),a},dc.prototype.intValue=function(){if(this.s<0){if(1==this.t)return this.data[0]-this.DV;if(0==this.t)return -1}else{if(1==this.t)return this.data[0];if(0==this.t)return 0}return(this.data[1]&(1<<32-this.DB)-1)<<this.DB|this.data[0]},dc.prototype.byteValue=function(){return 0==this.t?this.s:this.data[0]<<24>>24},dc.prototype.shortValue=function(){return 0==this.t?this.s:this.data[0]<<16>>16},dc.prototype.signum=function(){return this.s<0?-1:this.t<=0||1==this.t&&this.data[0]<=0?0:1},dc.prototype.toByteArray=function(){var a=this.t,b=[];b[0]=this.s;var c,d=this.DB-a*this.DB%8,e=0;if(a-- >0)for(d<this.DB&&(c=this.data[a]>>d)!=(this.s&this.DM)>>d&&(b[e++]=c|this.s<<this.DB-d);a>=0;)d<8?c=(this.data[a]&(1<<d)-1)<<8-d|this.data[--a]>>(d+=this.DB-8):(c=this.data[a]>>(d-=8)&255,d<=0&&(d+=this.DB,--a)),128&c&&(c|=-256),0==e&&(128&this.s)!=(128&c)&&++e,(e>0||c!=this.s)&&(b[e++]=c);return b},dc.prototype.equals=function(a){return 0==this.compareTo(a)},dc.prototype.min=function(a){return 0>this.compareTo(a)?this:a},dc.prototype.max=function(a){return this.compareTo(a)>0?this:a},dc.prototype.and=function(a){var b=dd();return this.bitwiseTo(a,dp,b),b},dc.prototype.or=function(a){var b=dd();return this.bitwiseTo(a,dq,b),b},dc.prototype.xor=function(a){var b=dd();return this.bitwiseTo(a,dr,b),b},dc.prototype.andNot=function(a){var b=dd();return this.bitwiseTo(a,ds,b),b},dc.prototype.not=function(){for(var a=dd(),b=0;b<this.t;++b)a.data[b]=this.DM&~this.data[b];return a.t=this.t,a.s=~this.s,a},dc.prototype.shiftLeft=function(a){var b=dd();return a<0?this.rShiftTo(-a,b):this.lShiftTo(a,b),b},dc.prototype.shiftRight=function(a){var b=dd();return a<0?this.lShiftTo(-a,b):this.rShiftTo(a,b),b},dc.prototype.getLowestSetBit=function(){for(var a=0;a<this.t;++a)if(0!=this.data[a])return a*this.DB+function(a){if(0==a)return -1;var b=0;return 65535&a||(a>>=16,b+=16),255&a||(a>>=8,b+=8),15&a||(a>>=4,b+=4),3&a||(a>>=2,b+=2),1&a||++b,b}(this.data[a]);return this.s<0?this.t*this.DB:-1},dc.prototype.bitCount=function(){for(var a=0,b=this.s&this.DM,c=0;c<this.t;++c)a+=function(a){for(var b=0;0!=a;)a&=a-1,++b;return b}(this.data[c]^b);return a},dc.prototype.testBit=function(a){var b=Math.floor(a/this.DB);return b>=this.t?0!=this.s:!!(this.data[b]&1<<a%this.DB)},dc.prototype.setBit=function(a){return this.changeBit(a,dq)},dc.prototype.clearBit=function(a){return this.changeBit(a,ds)},dc.prototype.flipBit=function(a){return this.changeBit(a,dr)},dc.prototype.add=function(a){var b=dd();return this.addTo(a,b),b},dc.prototype.subtract=function(a){var b=dd();return this.subTo(a,b),b},dc.prototype.multiply=function(a){var b=dd();return this.multiplyTo(a,b),b},dc.prototype.divide=function(a){var b=dd();return this.divRemTo(a,b,null),b},dc.prototype.remainder=function(a){var b=dd();return this.divRemTo(a,null,b),b},dc.prototype.divideAndRemainder=function(a){var b=dd(),c=dd();return this.divRemTo(a,b,c),[b,c]},dc.prototype.modPow=function(a,b){var c,d,e=a.bitLength(),f=dk(1);if(e<=0)return f;c=e<18?1:e<48?3:e<144?4:e<768?5:6,d=e<8?new dm(b):b.isEven()?new dv(b):new dn(b);var g=[],h=3,i=c-1,j=(1<<c)-1;if(g[1]=d.convert(this),c>1){var k=dd();for(d.sqrTo(g[1],k);h<=j;)g[h]=dd(),d.mulTo(k,g[h-2],g[h]),h+=2}var l,m,n=a.t-1,o=!0,p=dd();for(e=dl(a.data[n])-1;n>=0;){for(e>=i?l=a.data[n]>>e-i&j:(l=(a.data[n]&(1<<e+1)-1)<<i-e,n>0&&(l|=a.data[n-1]>>this.DB+e-i)),h=c;!(1&l);)l>>=1,--h;if((e-=h)<0&&(e+=this.DB,--n),o)g[l].copyTo(f),o=!1;else{for(;h>1;)d.sqrTo(f,p),d.sqrTo(p,f),h-=2;h>0?d.sqrTo(f,p):(m=f,f=p,p=m),d.mulTo(p,g[l],f)}for(;n>=0&&!(a.data[n]&1<<e);)d.sqrTo(f,p),m=f,f=p,p=m,--e<0&&(e=this.DB-1,--n)}return d.revert(f)},dc.prototype.modInverse=function(a){var b=a.isEven();if(this.isEven()&&b||0==a.signum())return dc.ZERO;for(var c=a.clone(),d=this.clone(),e=dk(1),f=dk(0),g=dk(0),h=dk(1);0!=c.signum();){for(;c.isEven();)c.rShiftTo(1,c),b?(e.isEven()&&f.isEven()||(e.addTo(this,e),f.subTo(a,f)),e.rShiftTo(1,e)):f.isEven()||f.subTo(a,f),f.rShiftTo(1,f);for(;d.isEven();)d.rShiftTo(1,d),b?(g.isEven()&&h.isEven()||(g.addTo(this,g),h.subTo(a,h)),g.rShiftTo(1,g)):h.isEven()||h.subTo(a,h),h.rShiftTo(1,h);c.compareTo(d)>=0?(c.subTo(d,c),b&&e.subTo(g,e),f.subTo(h,f)):(d.subTo(c,d),b&&g.subTo(e,g),h.subTo(f,h))}return 0!=d.compareTo(dc.ONE)?dc.ZERO:h.compareTo(a)>=0?h.subtract(a):0>h.signum()?(h.addTo(a,h),0>h.signum()?h.add(a):h):h},dc.prototype.pow=function(a){return this.exp(a,new dt)},dc.prototype.gcd=function(a){var b=this.s<0?this.negate():this.clone(),c=a.s<0?a.negate():a.clone();if(0>b.compareTo(c)){var d=b;b=c,c=d}var e=b.getLowestSetBit(),f=c.getLowestSetBit();if(f<0)return b;for(e<f&&(f=e),f>0&&(b.rShiftTo(f,b),c.rShiftTo(f,c));b.signum()>0;)(e=b.getLowestSetBit())>0&&b.rShiftTo(e,b),(e=c.getLowestSetBit())>0&&c.rShiftTo(e,c),b.compareTo(c)>=0?(b.subTo(c,b),b.rShiftTo(1,b)):(c.subTo(b,c),c.rShiftTo(1,c));return f>0&&c.lShiftTo(f,c),c},dc.prototype.isProbablePrime=function(a){var b,c=this.abs();if(1==c.t&&c.data[0]<=dw[dw.length-1]){for(b=0;b<dw.length;++b)if(c.data[0]==dw[b])return!0;return!1}if(c.isEven())return!1;for(b=1;b<dw.length;){for(var d=dw[b],e=b+1;e<dw.length&&d<dx;)d*=dw[e++];for(d=c.modInt(d);b<e;)if(d%dw[b++]==0)return!1}return c.millerRabin(a)},cB(function(a){var b=a.exports=cz.sha1=cz.sha1||{};cz.md.sha1=cz.md.algorithms.sha1=b,b.create=function(){d||(c=String.fromCharCode(128)+cz.util.fillString("\0",64),d=!0);var a=null,b=cz.util.createBuffer(),f=Array(80),g={algorithm:"sha1",blockLength:64,digestLength:20,messageLength:0,fullMessageLength:null,messageLengthSize:8,start:function(){g.messageLength=0,g.fullMessageLength=g.messageLength64=[];for(var c=g.messageLengthSize/4,d=0;d<c;++d)g.fullMessageLength.push(0);return b=cz.util.createBuffer(),a={h0:0x67452301,h1:0xefcdab89,h2:0x98badcfe,h3:0x10325476,h4:0xc3d2e1f0},g}};return g.start(),g.update=function(c,d){"utf8"===d&&(c=cz.util.encodeUtf8(c));var h=c.length;g.messageLength+=h,h=[h/0x100000000>>>0,h>>>0];for(var i=g.fullMessageLength.length-1;i>=0;--i)g.fullMessageLength[i]+=h[1],h[1]=h[0]+(g.fullMessageLength[i]/0x100000000>>>0),g.fullMessageLength[i]=g.fullMessageLength[i]>>>0,h[0]=h[1]/0x100000000>>>0;return b.putBytes(c),e(a,f,b),(b.read>2048||0===b.length())&&b.compact(),g},g.digest=function(){var d,h=cz.util.createBuffer();h.putBytes(b.bytes()),h.putBytes(c.substr(0,g.blockLength-(g.fullMessageLength[g.fullMessageLength.length-1]+g.messageLengthSize&g.blockLength-1)));for(var i=8*g.fullMessageLength[0],j=0;j<g.fullMessageLength.length-1;++j)h.putInt32((i+=(d=8*g.fullMessageLength[j+1])/0x100000000>>>0)>>>0),i=d>>>0;h.putInt32(i);var k={h0:a.h0,h1:a.h1,h2:a.h2,h3:a.h3,h4:a.h4};e(k,f,h);var l=cz.util.createBuffer();return l.putInt32(k.h0),l.putInt32(k.h1),l.putInt32(k.h2),l.putInt32(k.h3),l.putInt32(k.h4),l},g};var c=null,d=!1;function e(a,b,c){for(var d,e,f,g,h,i,j,k=c.length();k>=64;){for(e=a.h0,f=a.h1,g=a.h2,h=a.h3,i=a.h4,j=0;j<16;++j)d=c.getInt32(),b[j]=d,d=(e<<5|e>>>27)+(h^f&(g^h))+i+0x5a827999+d,i=h,h=g,g=(f<<30|f>>>2)>>>0,f=e,e=d;for(;j<20;++j)b[j]=d=(d=b[j-3]^b[j-8]^b[j-14]^b[j-16])<<1|d>>>31,d=(e<<5|e>>>27)+(h^f&(g^h))+i+0x5a827999+d,i=h,h=g,g=(f<<30|f>>>2)>>>0,f=e,e=d;for(;j<32;++j)b[j]=d=(d=b[j-3]^b[j-8]^b[j-14]^b[j-16])<<1|d>>>31,d=(e<<5|e>>>27)+(f^g^h)+i+0x6ed9eba1+d,i=h,h=g,g=(f<<30|f>>>2)>>>0,f=e,e=d;for(;j<40;++j)b[j]=d=(d=b[j-6]^b[j-16]^b[j-28]^b[j-32])<<2|d>>>30,d=(e<<5|e>>>27)+(f^g^h)+i+0x6ed9eba1+d,i=h,h=g,g=(f<<30|f>>>2)>>>0,f=e,e=d;for(;j<60;++j)b[j]=d=(d=b[j-6]^b[j-16]^b[j-28]^b[j-32])<<2|d>>>30,d=(e<<5|e>>>27)+(f&g|h&(f^g))+i+0x8f1bbcdc+d,i=h,h=g,g=(f<<30|f>>>2)>>>0,f=e,e=d;for(;j<80;++j)b[j]=d=(d=b[j-6]^b[j-16]^b[j-28]^b[j-32])<<2|d>>>30,d=(e<<5|e>>>27)+(f^g^h)+i+0xca62c1d6+d,i=h,h=g,g=(f<<30|f>>>2)>>>0,f=e,e=d;a.h0=a.h0+e|0,a.h1=a.h1+f|0,a.h2=a.h2+g|0,a.h3=a.h3+h|0,a.h4=a.h4+i|0,k-=64}}}),cB(function(a){var b=a.exports=cz.pkcs1=cz.pkcs1||{};function c(a,b,c){c||(c=cz.md.sha1.create());for(var d="",e=Math.ceil(b/c.digestLength),f=0;f<e;++f){var g=String.fromCharCode(f>>24&255,f>>16&255,f>>8&255,255&f);c.start(),c.update(a+g),d+=c.digest().getBytes()}return d.substring(0,b)}b.encode_rsa_oaep=function(a,b,d){"string"==typeof d?(e=d,f=arguments[3]||void 0,g=arguments[4]||void 0):d&&(e=d.label||void 0,f=d.seed||void 0,g=d.md||void 0,d.mgf1&&d.mgf1.md&&(h=d.mgf1.md)),g?g.start():g=cz.md.sha1.create(),h||(h=g);var e,f,g,h,i,j=Math.ceil(a.n.bitLength()/8),k=j-2*g.digestLength-2;if(b.length>k)throw(i=Error("RSAES-OAEP input message length is too long.")).length=b.length,i.maxLength=k,i;e||(e=""),g.update(e,"raw");for(var l=g.digest(),m="",n=k-b.length,o=0;o<n;o++)m+="\0";var p=l.getBytes()+m+"\x01"+b;if(f){if(f.length!==g.digestLength)throw(i=Error("Invalid RSAES-OAEP seed. The seed length must match the digest length.")).seedLength=f.length,i.digestLength=g.digestLength,i}else f=cz.random.getBytes(g.digestLength);var q=c(f,j-g.digestLength-1,h),r=cz.util.xorBytes(p,q,p.length),s=c(r,g.digestLength,h);return"\0"+cz.util.xorBytes(f,s,f.length)+r},b.decode_rsa_oaep=function(a,b,d){"string"==typeof d?(e=d,f=arguments[3]||void 0):d&&(e=d.label||void 0,f=d.md||void 0,d.mgf1&&d.mgf1.md&&(g=d.mgf1.md));var e,f,g,h=Math.ceil(a.n.bitLength()/8);if(b.length!==h)throw(q=Error("RSAES-OAEP encoded message length is invalid.")).length=b.length,q.expectedLength=h,q;if(void 0===f?f=cz.md.sha1.create():f.start(),g||(g=f),h<2*f.digestLength+2)throw Error("RSAES-OAEP key is too short for the hash function.");e||(e=""),f.update(e,"raw");for(var i=f.digest().getBytes(),j=b.charAt(0),k=b.substring(1,f.digestLength+1),l=b.substring(1+f.digestLength),m=c(l,f.digestLength,g),n=c(cz.util.xorBytes(k,m,k.length),h-f.digestLength-1,g),o=cz.util.xorBytes(l,n,l.length),p=o.substring(0,f.digestLength),q="\0"!==j,r=0;r<f.digestLength;++r)q|=i.charAt(r)!==p.charAt(r);for(var s=1,t=f.digestLength,u=f.digestLength;u<o.length;u++){var v=o.charCodeAt(u);q|=v&65534*!!s,t+=s&=1&v^1}if(q||1!==o.charCodeAt(t))throw Error("Invalid RSAES-OAEP padding.");return o.substring(t+1)}}),cB(function(a){!function(){if(cz.prime)a.exports=cz.prime;else{var b=a.exports=cz.prime=cz.prime||{},c=cz.jsbn.BigInteger,d=[6,4,2,4,2,4,6,2],e=new c(null);e.fromInt(30);var f=function(a,b){return a|b};b.generateProbablePrime=function(a,b,d){"function"==typeof b&&(d=b,b={});var e,f,i,j=(b=b||{}).algorithm||"PRIMEINC";"string"==typeof j&&(j={name:j}),j.options=j.options||{};var k=b.prng||cz.random;if("PRIMEINC"===j.name)return e={nextBytes:function(a){for(var b=k.getBytesSync(a.length),c=0;c<a.length;++c)a[c]=b.charCodeAt(c)}},f=j.options,i=d,"workers"in f?function(a,b,d,e){if("u"<typeof Worker)return g(a,b,d,e);var f=h(a,b),i=d.workers,j=d.workLoad||100,k=30*j/8,l=d.workerScript||"forge/prime.worker.js";if(-1===i)return cz.util.estimateCores(function(a,b){a&&(b=2),i=b-1,m()});function m(){i=Math.max(1,i);for(var d=[],g=0;g<i;++g)d[g]=new Worker(l);for(g=0;g<i;++g)d[g].addEventListener("message",n);var m=!1;function n(g){if(!m){var i=g.data;if(i.found){for(var l=0;l<d.length;++l)d[l].terminate();return m=!0,e(null,new c(i.prime,16))}f.bitLength()>a&&(f=h(a,b));var n=f.toString(16);g.target.postMessage({hex:n,workLoad:j}),f.dAddOffset(k,0)}}}m()}(a,e,f,i):g(a,e,f,i);throw Error("Invalid prime generation algorithm: "+j.name)}}function g(a,b,c,e){var f,g=h(a,b),i=(f=g.bitLength())<=100?27:f<=150?18:f<=200?15:f<=250?12:f<=300?9:f<=350?8:f<=400?7:f<=500?6:f<=600?5:f<=800?4:f<=1250?3:2;"millerRabinTests"in c&&(i=c.millerRabinTests);var j=10;"maxBlockTime"in c&&(j=c.maxBlockTime),function a(b,c,e,f,g,i,j){var k=+new Date;do{if(b.bitLength()>c&&(b=h(c,e)),b.isProbablePrime(g))return j(null,b);b.dAddOffset(d[f++%8],0)}while(i<0||new Date-k<i)cz.util.setImmediate(function(){a(b,c,e,f,g,i,j)})}(g,a,b,0,i,j,e)}function h(a,b){var d=new c(a,b),g=a-1;return d.testBit(g)||d.bitwiseTo(c.ONE.shiftLeft(g),f,d),d.dAddOffset(31-d.mod(e).byteValue(),0),d}}()}),void 0===dy)var dy=cz.jsbn.BigInteger;var dz=cz.util.isNodejs?c6:null,dA=cz.asn1,dB=cz.util;cz.pki=cz.pki||{},cz.pki.rsa=cz.rsa=cz.rsa||{};var dC=cz.pki,dD=[6,4,2,4,2,4,6,2],dE={name:"PrivateKeyInfo",tagClass:dA.Class.UNIVERSAL,type:dA.Type.SEQUENCE,constructed:!0,value:[{name:"PrivateKeyInfo.version",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyVersion"},{name:"PrivateKeyInfo.privateKeyAlgorithm",tagClass:dA.Class.UNIVERSAL,type:dA.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:dA.Class.UNIVERSAL,type:dA.Type.OID,constructed:!1,capture:"privateKeyOid"}]},{name:"PrivateKeyInfo",tagClass:dA.Class.UNIVERSAL,type:dA.Type.OCTETSTRING,constructed:!1,capture:"privateKey"}]},dF={name:"RSAPrivateKey",tagClass:dA.Class.UNIVERSAL,type:dA.Type.SEQUENCE,constructed:!0,value:[{name:"RSAPrivateKey.version",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyVersion"},{name:"RSAPrivateKey.modulus",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyModulus"},{name:"RSAPrivateKey.publicExponent",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyPublicExponent"},{name:"RSAPrivateKey.privateExponent",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyPrivateExponent"},{name:"RSAPrivateKey.prime1",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyPrime1"},{name:"RSAPrivateKey.prime2",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyPrime2"},{name:"RSAPrivateKey.exponent1",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyExponent1"},{name:"RSAPrivateKey.exponent2",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyExponent2"},{name:"RSAPrivateKey.coefficient",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"privateKeyCoefficient"}]},dG={name:"RSAPublicKey",tagClass:dA.Class.UNIVERSAL,type:dA.Type.SEQUENCE,constructed:!0,value:[{name:"RSAPublicKey.modulus",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"publicKeyModulus"},{name:"RSAPublicKey.exponent",tagClass:dA.Class.UNIVERSAL,type:dA.Type.INTEGER,constructed:!1,capture:"publicKeyExponent"}]},dH=cz.pki.rsa.publicKeyValidator={name:"SubjectPublicKeyInfo",tagClass:dA.Class.UNIVERSAL,type:dA.Type.SEQUENCE,constructed:!0,captureAsn1:"subjectPublicKeyInfo",value:[{name:"SubjectPublicKeyInfo.AlgorithmIdentifier",tagClass:dA.Class.UNIVERSAL,type:dA.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:dA.Class.UNIVERSAL,type:dA.Type.OID,constructed:!1,capture:"publicKeyOid"}]},{name:"SubjectPublicKeyInfo.subjectPublicKey",tagClass:dA.Class.UNIVERSAL,type:dA.Type.BITSTRING,constructed:!1,value:[{name:"SubjectPublicKeyInfo.subjectPublicKey.RSAPublicKey",tagClass:dA.Class.UNIVERSAL,type:dA.Type.SEQUENCE,constructed:!0,optional:!0,captureAsn1:"rsaPublicKey"}]}]},dI={name:"DigestInfo",tagClass:dA.Class.UNIVERSAL,type:dA.Type.SEQUENCE,constructed:!0,value:[{name:"DigestInfo.DigestAlgorithm",tagClass:dA.Class.UNIVERSAL,type:dA.Type.SEQUENCE,constructed:!0,value:[{name:"DigestInfo.DigestAlgorithm.algorithmIdentifier",tagClass:dA.Class.UNIVERSAL,type:dA.Type.OID,constructed:!1,capture:"algorithmIdentifier"},{name:"DigestInfo.DigestAlgorithm.parameters",tagClass:dA.Class.UNIVERSAL,type:dA.Type.NULL,capture:"parameters",optional:!0,constructed:!1}]},{name:"DigestInfo.digest",tagClass:dA.Class.UNIVERSAL,type:dA.Type.OCTETSTRING,constructed:!1,capture:"digest"}]},dJ=function(a){if(!(a.algorithm in dC.oids)){var b=Error("Unknown message digest algorithm.");throw b.algorithm=a.algorithm,b}var c=dA.oidToDer(dC.oids[a.algorithm]).getBytes(),d=dA.create(dA.Class.UNIVERSAL,dA.Type.SEQUENCE,!0,[]),e=dA.create(dA.Class.UNIVERSAL,dA.Type.SEQUENCE,!0,[]);e.value.push(dA.create(dA.Class.UNIVERSAL,dA.Type.OID,!1,c)),e.value.push(dA.create(dA.Class.UNIVERSAL,dA.Type.NULL,!1,""));var f=dA.create(dA.Class.UNIVERSAL,dA.Type.OCTETSTRING,!1,a.digest().getBytes());return d.value.push(e),d.value.push(f),dA.toDer(d).getBytes()},dK=function(a,b,c){if(c)return a.modPow(b.e,b.n);if(!b.p||!b.q)return a.modPow(b.d,b.n);b.dP||(b.dP=b.d.mod(b.p.subtract(dy.ONE))),b.dQ||(b.dQ=b.d.mod(b.q.subtract(dy.ONE))),b.qInv||(b.qInv=b.q.modInverse(b.p));do d=new dy(cz.util.bytesToHex(cz.random.getBytes(b.n.bitLength()/8)),16);while(d.compareTo(b.n)>=0||!d.gcd(b.n).equals(dy.ONE))for(var d,e=(a=a.multiply(d.modPow(b.e,b.n)).mod(b.n)).mod(b.p).modPow(b.dP,b.p),f=a.mod(b.q).modPow(b.dQ,b.q);0>e.compareTo(f);)e=e.add(b.p);return e.subtract(f).multiply(b.qInv).mod(b.p).multiply(b.q).add(f).multiply(d.modInverse(b.n)).mod(b.n)};function dL(a,b,c){var d=cz.util.createBuffer(),e=Math.ceil(b.n.bitLength()/8);if(a.length>e-11){var f=Error("Message is too long for PKCS#1 v1.5 padding.");throw f.length=a.length,f.max=e-11,f}d.putByte(0),d.putByte(c);var g,h=e-3-a.length;if(0===c||1===c){g=255*(0!==c);for(var i=0;i<h;++i)d.putByte(g)}else for(;h>0;){var j=0,k=cz.random.getBytes(h);for(i=0;i<h;++i)0===(g=k.charCodeAt(i))?++j:d.putByte(g);h=j}return d.putByte(0),d.putBytes(a),d}function dM(a,b,c,d){var e=Math.ceil(b.n.bitLength()/8),f=cz.util.createBuffer(a),g=f.getByte(),h=f.getByte();if(0!==g||c&&0!==h&&1!==h||!c&&2!=h||c&&0===h&&void 0===d)throw Error("Encryption block is invalid.");var i=0;if(0===h){i=e-3-d;for(var j=0;j<i;++j)if(0!==f.getByte())throw Error("Encryption block is invalid.")}else if(1===h)for(i=0;f.length()>1;){if(255!==f.getByte()){--f.read;break}++i}else if(2===h)for(i=0;f.length()>1;){if(0===f.getByte()){--f.read;break}++i}if(0!==f.getByte()||i!==e-3-f.length())throw Error("Encryption block is invalid.");return f.getBytes()}function dN(a){var b=a.toString(16);b[0]>="8"&&(b="00"+b);var c=cz.util.hexToBytes(b);return!(c.length>1)||(0!==c.charCodeAt(0)||128&c.charCodeAt(1))&&(255!==c.charCodeAt(0)||128&~c.charCodeAt(1))?c:c.substr(1)}function dO(a){return cz.util.isNodejs&&"function"==typeof dz[a]}function dP(a){return void 0!==dB.globalScope&&"object"==typeof dB.globalScope.crypto&&"object"==typeof dB.globalScope.crypto.subtle&&"function"==typeof dB.globalScope.crypto.subtle[a]}function dQ(a){return void 0!==dB.globalScope&&"object"==typeof dB.globalScope.msCrypto&&"object"==typeof dB.globalScope.msCrypto.subtle&&"function"==typeof dB.globalScope.msCrypto.subtle[a]}function dR(a){for(var b=cz.util.hexToBytes(a.toString(16)),c=new Uint8Array(b.length),d=0;d<b.length;++d)c[d]=b.charCodeAt(d);return c}dC.rsa.encrypt=function(a,b,c){var d,e=c,f=Math.ceil(b.n.bitLength()/8);!1!==c&&!0!==c?(e=2===c,d=dL(a,b,c)):(d=cz.util.createBuffer()).putBytes(a);for(var g=new dy(d.toHex(),16),h=dK(g,b,e).toString(16),i=cz.util.createBuffer(),j=f-Math.ceil(h.length/2);j>0;)i.putByte(0),--j;return i.putBytes(cz.util.hexToBytes(h)),i.getBytes()},dC.rsa.decrypt=function(a,b,c,d){var e=Math.ceil(b.n.bitLength()/8);if(a.length!==e){var f=Error("Encrypted message length is invalid.");throw f.length=a.length,f.expected=e,f}var g=new dy(cz.util.createBuffer(a).toHex(),16);if(g.compareTo(b.n)>=0)throw Error("Encrypted message is invalid.");for(var h=dK(g,b,c).toString(16),i=cz.util.createBuffer(),j=e-Math.ceil(h.length/2);j>0;)i.putByte(0),--j;return i.putBytes(cz.util.hexToBytes(h)),!1!==d?dM(i.getBytes(),b,c):i.getBytes()},dC.rsa.createKeyPairGenerationState=function(a,b,c){"string"==typeof a&&(a=parseInt(a,10)),a=a||2048;var d,e=(c=c||{}).prng||cz.random,f=c.algorithm||"PRIMEINC";if("PRIMEINC"!==f)throw Error("Invalid key generation algorithm: "+f);return(d={algorithm:f,state:0,bits:a,rng:{nextBytes:function(a){for(var b=e.getBytesSync(a.length),c=0;c<a.length;++c)a[c]=b.charCodeAt(c)}},eInt:b||65537,e:new dy(null),p:null,q:null,qBits:a>>1,pBits:a-(a>>1),pqState:0,num:null,keys:null}).e.fromInt(d.eInt),d},dC.rsa.stepKeyPairGenerationState=function(a,b){"algorithm"in a||(a.algorithm="PRIMEINC");var c=new dy(null);c.fromInt(30);for(var d,e=0,f=function(a,b){return a|b},g=+new Date,h=0;null===a.keys&&(b<=0||h<b);){if(0===a.state){var i,j=null===a.p?a.pBits:a.qBits,k=j-1;0===a.pqState?(a.num=new dy(j,a.rng),a.num.testBit(k)||a.num.bitwiseTo(dy.ONE.shiftLeft(k),f,a.num),a.num.dAddOffset(31-a.num.mod(c).byteValue(),0),e=0,++a.pqState):1===a.pqState?a.num.bitLength()>j?a.pqState=0:a.num.isProbablePrime((i=a.num.bitLength())<=100?27:i<=150?18:i<=200?15:i<=250?12:i<=300?9:i<=350?8:i<=400?7:i<=500?6:i<=600?5:i<=800?4:i<=1250?3:2)?++a.pqState:a.num.dAddOffset(dD[e++%8],0):2===a.pqState?a.pqState=3*(0===a.num.subtract(dy.ONE).gcd(a.e).compareTo(dy.ONE)):3===a.pqState&&(a.pqState=0,null===a.p?a.p=a.num:a.q=a.num,null!==a.p&&null!==a.q&&++a.state,a.num=null)}else if(1===a.state)0>a.p.compareTo(a.q)&&(a.num=a.p,a.p=a.q,a.q=a.num),++a.state;else if(2===a.state)a.p1=a.p.subtract(dy.ONE),a.q1=a.q.subtract(dy.ONE),a.phi=a.p1.multiply(a.q1),++a.state;else if(3===a.state)0===a.phi.gcd(a.e).compareTo(dy.ONE)?++a.state:(a.p=null,a.q=null,a.state=0);else if(4===a.state)a.n=a.p.multiply(a.q),a.n.bitLength()===a.bits?++a.state:(a.q=null,a.state=0);else if(5===a.state){var l=a.e.modInverse(a.phi);a.keys={privateKey:dC.rsa.setPrivateKey(a.n,a.e,l,a.p,a.q,l.mod(a.p1),l.mod(a.q1),a.q.modInverse(a.p)),publicKey:dC.rsa.setPublicKey(a.n,a.e)}}h+=(d=+new Date)-g,g=d}return null!==a.keys},dC.rsa.generateKeyPair=function(a,b,c,d){if(1==arguments.length?"object"==typeof a?(c=a,a=void 0):"function"==typeof a&&(d=a,a=void 0):2==arguments.length?"number"==typeof a?"function"==typeof b?(d=b,b=void 0):"number"!=typeof b&&(c=b,b=void 0):(c=a,d=b,a=void 0,b=void 0):3==arguments.length&&("number"==typeof b?"function"==typeof c&&(d=c,c=void 0):(d=c,c=b,b=void 0)),c=c||{},void 0===a&&(a=c.bits||2048),void 0===b&&(b=c.e||65537),!c.prng&&a>=256&&a<=16384&&(65537===b||3===b)){if(d){if(dO("generateKeyPair"))return dz.generateKeyPair("rsa",{modulusLength:a,publicExponent:b,publicKeyEncoding:{type:"spki",format:"pem"},privateKeyEncoding:{type:"pkcs8",format:"pem"}},function(a,b,c){if(a)return d(a);d(null,{privateKey:dC.privateKeyFromPem(c),publicKey:dC.publicKeyFromPem(b)})});if(dP("generateKey")&&dP("exportKey"))return dB.globalScope.crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:a,publicExponent:dR(b),hash:{name:"SHA-256"}},!0,["sign","verify"]).then(function(a){return dB.globalScope.crypto.subtle.exportKey("pkcs8",a.privateKey)}).then(void 0,function(a){d(a)}).then(function(a){if(a){var b=dC.privateKeyFromAsn1(dA.fromDer(cz.util.createBuffer(a)));d(null,{privateKey:b,publicKey:dC.setRsaPublicKey(b.n,b.e)})}});if(dQ("generateKey")&&dQ("exportKey")){var e=dB.globalScope.msCrypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:a,publicExponent:dR(b),hash:{name:"SHA-256"}},!0,["sign","verify"]);return e.oncomplete=function(a){var b=dB.globalScope.msCrypto.subtle.exportKey("pkcs8",a.target.result.privateKey);b.oncomplete=function(a){var b=dC.privateKeyFromAsn1(dA.fromDer(cz.util.createBuffer(a.target.result)));d(null,{privateKey:b,publicKey:dC.setRsaPublicKey(b.n,b.e)})},b.onerror=function(a){d(a)}},void(e.onerror=function(a){d(a)})}}else if(dO("generateKeyPairSync")){var f=dz.generateKeyPairSync("rsa",{modulusLength:a,publicExponent:b,publicKeyEncoding:{type:"spki",format:"pem"},privateKeyEncoding:{type:"pkcs8",format:"pem"}});return{privateKey:dC.privateKeyFromPem(f.privateKey),publicKey:dC.publicKeyFromPem(f.publicKey)}}}var g=dC.rsa.createKeyPairGenerationState(a,b,c);if(!d)return dC.rsa.stepKeyPairGenerationState(g,0),g.keys;var h=c,i=d;"function"==typeof h&&(i=h,h={});var j={algorithm:{name:(h=h||{}).algorithm||"PRIMEINC",options:{workers:h.workers||2,workLoad:h.workLoad||100,workerScript:h.workerScript}}};function k(){l(g.pBits,function(a,b){return a?i(a):(g.p=b,null!==g.q?m(a,g.q):void l(g.qBits,m))})}function l(a,b){cz.prime.generateProbablePrime(a,j,b)}function m(a,b){if(a)return i(a);if(g.q=b,0>g.p.compareTo(g.q)){var c=g.p;g.p=g.q,g.q=c}if(0!==g.p.subtract(dy.ONE).gcd(g.e).compareTo(dy.ONE))return g.p=null,void k();if(0!==g.q.subtract(dy.ONE).gcd(g.e).compareTo(dy.ONE))return g.q=null,void l(g.qBits,m);if(g.p1=g.p.subtract(dy.ONE),g.q1=g.q.subtract(dy.ONE),g.phi=g.p1.multiply(g.q1),0!==g.phi.gcd(g.e).compareTo(dy.ONE))return g.p=g.q=null,void k();if(g.n=g.p.multiply(g.q),g.n.bitLength()!==g.bits)return g.q=null,void l(g.qBits,m);var d=g.e.modInverse(g.phi);g.keys={privateKey:dC.rsa.setPrivateKey(g.n,g.e,d,g.p,g.q,d.mod(g.p1),d.mod(g.q1),g.q.modInverse(g.p)),publicKey:dC.rsa.setPublicKey(g.n,g.e)},i(null,g.keys)}"prng"in h&&(j.prng=h.prng),k()},dC.setRsaPublicKey=dC.rsa.setPublicKey=function(a,b){var c={n:a,e:b,encrypt:function(a,b,d){if("string"==typeof b?b=b.toUpperCase():void 0===b&&(b="RSAES-PKCS1-V1_5"),"RSAES-PKCS1-V1_5"===b)b={encode:function(a,b,c){return dL(a,b,2).getBytes()}};else if("RSA-OAEP"===b||"RSAES-OAEP"===b)b={encode:function(a,b){return cz.pkcs1.encode_rsa_oaep(b,a,d)}};else if(-1!==["RAW","NONE","NULL",null].indexOf(b))b={encode:function(a){return a}};else if("string"==typeof b)throw Error('Unsupported encryption scheme: "'+b+'".');var e=b.encode(a,c,!0);return dC.rsa.encrypt(e,c,!0)},verify:function(a,b,d,e){"string"==typeof d?d=d.toUpperCase():void 0===d&&(d="RSASSA-PKCS1-V1_5"),void 0===e&&(e={_parseAllDigestBytes:!0}),"_parseAllDigestBytes"in e||(e._parseAllDigestBytes=!0),"RSASSA-PKCS1-V1_5"===d?d={verify:function(a,b){b=dM(b,c,!0);var d=dA.fromDer(b,{parseAllBytes:e._parseAllDigestBytes}),f={},g=[];if(!dA.validate(d,dI,f,g))throw(h=Error("ASN.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value.")).errors=g,h;var h,i=dA.derToOid(f.algorithmIdentifier);if(i!==cz.oids.md2&&i!==cz.oids.md5&&i!==cz.oids.sha1&&i!==cz.oids.sha224&&i!==cz.oids.sha256&&i!==cz.oids.sha384&&i!==cz.oids.sha512&&i!==cz.oids["sha512-224"]&&i!==cz.oids["sha512-256"])throw(h=Error("Unknown RSASSA-PKCS1-v1_5 DigestAlgorithm identifier.")).oid=i,h;if((i===cz.oids.md2||i===cz.oids.md5)&&!("parameters"in f))throw Error("ASN.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value. Missing algorithm identifer NULL parameters.");return a===f.digest}}:"NONE"!==d&&"NULL"!==d&&null!==d||(d={verify:function(a,b){return a===dM(b,c,!0)}});var f=dC.rsa.decrypt(b,c,!0,!1);return d.verify(a,f,c.n.bitLength())}};return c},dC.setRsaPrivateKey=dC.rsa.setPrivateKey=function(a,b,c,d,e,f,g,h){var i={n:a,e:b,d:c,p:d,q:e,dP:f,dQ:g,qInv:h,decrypt:function(a,b,c){"string"==typeof b?b=b.toUpperCase():void 0===b&&(b="RSAES-PKCS1-V1_5");var d=dC.rsa.decrypt(a,i,!1,!1);if("RSAES-PKCS1-V1_5"===b)b={decode:dM};else if("RSA-OAEP"===b||"RSAES-OAEP"===b)b={decode:function(a,b){return cz.pkcs1.decode_rsa_oaep(b,a,c)}};else{if(-1===["RAW","NONE","NULL",null].indexOf(b))throw Error('Unsupported encryption scheme: "'+b+'".');b={decode:function(a){return a}}}return b.decode(d,i,!1)},sign:function(a,b){var c=!1;"string"==typeof b&&(b=b.toUpperCase()),void 0===b||"RSASSA-PKCS1-V1_5"===b?(b={encode:dJ},c=1):"NONE"!==b&&"NULL"!==b&&null!==b||(b={encode:function(){return a}},c=1);var d=b.encode(a,i.n.bitLength());return dC.rsa.encrypt(d,i,c)}};return i},dC.wrapRsaPrivateKey=function(a){return dA.create(dA.Class.UNIVERSAL,dA.Type.SEQUENCE,!0,[dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dA.integerToDer(0).getBytes()),dA.create(dA.Class.UNIVERSAL,dA.Type.SEQUENCE,!0,[dA.create(dA.Class.UNIVERSAL,dA.Type.OID,!1,dA.oidToDer(dC.oids.rsaEncryption).getBytes()),dA.create(dA.Class.UNIVERSAL,dA.Type.NULL,!1,"")]),dA.create(dA.Class.UNIVERSAL,dA.Type.OCTETSTRING,!1,dA.toDer(a).getBytes())])},dC.privateKeyFromAsn1=function(a){var b,c,d,e,f,g,h,i,j={},k=[];if(dA.validate(a,dE,j,k)&&(a=dA.fromDer(cz.util.createBuffer(j.privateKey))),!dA.validate(a,dF,j={},k=[])){var l=Error("Cannot read private key. ASN.1 object does not contain an RSAPrivateKey.");throw l.errors=k,l}return b=cz.util.createBuffer(j.privateKeyModulus).toHex(),c=cz.util.createBuffer(j.privateKeyPublicExponent).toHex(),d=cz.util.createBuffer(j.privateKeyPrivateExponent).toHex(),e=cz.util.createBuffer(j.privateKeyPrime1).toHex(),f=cz.util.createBuffer(j.privateKeyPrime2).toHex(),g=cz.util.createBuffer(j.privateKeyExponent1).toHex(),h=cz.util.createBuffer(j.privateKeyExponent2).toHex(),i=cz.util.createBuffer(j.privateKeyCoefficient).toHex(),dC.setRsaPrivateKey(new dy(b,16),new dy(c,16),new dy(d,16),new dy(e,16),new dy(f,16),new dy(g,16),new dy(h,16),new dy(i,16))},dC.privateKeyToAsn1=dC.privateKeyToRSAPrivateKey=function(a){return dA.create(dA.Class.UNIVERSAL,dA.Type.SEQUENCE,!0,[dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dA.integerToDer(0).getBytes()),dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.n)),dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.e)),dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.d)),dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.p)),dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.q)),dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.dP)),dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.dQ)),dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.qInv))])},dC.publicKeyFromAsn1=function(a){var b={},c=[];if(dA.validate(a,dH,b,c)){var d,e=dA.derToOid(b.publicKeyOid);if(e!==dC.oids.rsaEncryption)throw(d=Error("Cannot read public key. Unknown OID.")).oid=e,d;a=b.rsaPublicKey}if(!dA.validate(a,dG,b,c=[]))throw(d=Error("Cannot read public key. ASN.1 object does not contain an RSAPublicKey.")).errors=c,d;var f=cz.util.createBuffer(b.publicKeyModulus).toHex(),g=cz.util.createBuffer(b.publicKeyExponent).toHex();return dC.setRsaPublicKey(new dy(f,16),new dy(g,16))},dC.publicKeyToAsn1=dC.publicKeyToSubjectPublicKeyInfo=function(a){return dA.create(dA.Class.UNIVERSAL,dA.Type.SEQUENCE,!0,[dA.create(dA.Class.UNIVERSAL,dA.Type.SEQUENCE,!0,[dA.create(dA.Class.UNIVERSAL,dA.Type.OID,!1,dA.oidToDer(dC.oids.rsaEncryption).getBytes()),dA.create(dA.Class.UNIVERSAL,dA.Type.NULL,!1,"")]),dA.create(dA.Class.UNIVERSAL,dA.Type.BITSTRING,!1,[dC.publicKeyToRSAPublicKey(a)])])},dC.publicKeyToRSAPublicKey=function(a){return dA.create(dA.Class.UNIVERSAL,dA.Type.SEQUENCE,!0,[dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.n)),dA.create(dA.Class.UNIVERSAL,dA.Type.INTEGER,!1,dN(a.e))])};var dS=cz.asn1,dT=cz.pki=cz.pki||{};dT.pbe=cz.pbe=cz.pbe||{};var dU=dT.oids,dV={name:"EncryptedPrivateKeyInfo",tagClass:dS.Class.UNIVERSAL,type:dS.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedPrivateKeyInfo.encryptionAlgorithm",tagClass:dS.Class.UNIVERSAL,type:dS.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:dS.Class.UNIVERSAL,type:dS.Type.OID,constructed:!1,capture:"encryptionOid"},{name:"AlgorithmIdentifier.parameters",tagClass:dS.Class.UNIVERSAL,type:dS.Type.SEQUENCE,constructed:!0,captureAsn1:"encryptionParams"}]},{name:"EncryptedPrivateKeyInfo.encryptedData",tagClass:dS.Class.UNIVERSAL,type:dS.Type.OCTETSTRING,constructed:!1,capture:"encryptedData"}]},dW={name:"PBES2Algorithms",tagClass:dS.Class.UNIVERSAL,type:dS.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.keyDerivationFunc",tagClass:dS.Class.UNIVERSAL,type:dS.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.keyDerivationFunc.oid",tagClass:dS.Class.UNIVERSAL,type:dS.Type.OID,constructed:!1,capture:"kdfOid"},{name:"PBES2Algorithms.params",tagClass:dS.Class.UNIVERSAL,type:dS.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.params.salt",tagClass:dS.Class.UNIVERSAL,type:dS.Type.OCTETSTRING,constructed:!1,capture:"kdfSalt"},{name:"PBES2Algorithms.params.iterationCount",tagClass:dS.Class.UNIVERSAL,type:dS.Type.INTEGER,constructed:!1,capture:"kdfIterationCount"},{name:"PBES2Algorithms.params.keyLength",tagClass:dS.Class.UNIVERSAL,type:dS.Type.INTEGER,constructed:!1,optional:!0,capture:"keyLength"},{name:"PBES2Algorithms.params.prf",tagClass:dS.Class.UNIVERSAL,type:dS.Type.SEQUENCE,constructed:!0,optional:!0,value:[{name:"PBES2Algorithms.params.prf.algorithm",tagClass:dS.Class.UNIVERSAL,type:dS.Type.OID,constructed:!1,capture:"prfOid"}]}]}]},{name:"PBES2Algorithms.encryptionScheme",tagClass:dS.Class.UNIVERSAL,type:dS.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.encryptionScheme.oid",tagClass:dS.Class.UNIVERSAL,type:dS.Type.OID,constructed:!1,capture:"encOid"},{name:"PBES2Algorithms.encryptionScheme.iv",tagClass:dS.Class.UNIVERSAL,type:dS.Type.OCTETSTRING,constructed:!1,capture:"encIv"}]}]},dX={name:"pkcs-12PbeParams",tagClass:dS.Class.UNIVERSAL,type:dS.Type.SEQUENCE,constructed:!0,value:[{name:"pkcs-12PbeParams.salt",tagClass:dS.Class.UNIVERSAL,type:dS.Type.OCTETSTRING,constructed:!1,capture:"salt"},{name:"pkcs-12PbeParams.iterations",tagClass:dS.Class.UNIVERSAL,type:dS.Type.INTEGER,constructed:!1,capture:"iterations"}]};function dY(a,b){return a.start().update(b).digest().getBytes()}function dZ(a){var b;if(a){if(!(b=dT.oids[dS.derToOid(a)])){var c=Error("Unsupported PRF OID.");throw c.oid=a,c.supported=["hmacWithSHA1","hmacWithSHA224","hmacWithSHA256","hmacWithSHA384","hmacWithSHA512"],c}}else b="hmacWithSHA1";return d$(b)}function d$(a){var b=cz.md;switch(a){case"hmacWithSHA224":b=cz.md.sha512;case"hmacWithSHA1":case"hmacWithSHA256":case"hmacWithSHA384":case"hmacWithSHA512":a=a.substr(8).toLowerCase();break;default:var c=Error("Unsupported PRF algorithm.");throw c.algorithm=a,c.supported=["hmacWithSHA1","hmacWithSHA224","hmacWithSHA256","hmacWithSHA384","hmacWithSHA512"],c}if(!b||!(a in b))throw Error("Unknown hash algorithm: "+a);return b[a].create()}dT.encryptPrivateKeyInfo=function(a,b,c){(c=c||{}).saltSize=c.saltSize||8,c.count=c.count||2048,c.algorithm=c.algorithm||"aes128",c.prfAlgorithm=c.prfAlgorithm||"sha1";var d,e,f,g=cz.random.getBytesSync(c.saltSize),h=c.count,i=dS.integerToDer(h);if(0===c.algorithm.indexOf("aes")||"des"===c.algorithm){switch(c.algorithm){case"aes128":d=16,l=16,m=dU["aes128-CBC"],n=cz.aes.createEncryptionCipher;break;case"aes192":d=24,l=16,m=dU["aes192-CBC"],n=cz.aes.createEncryptionCipher;break;case"aes256":d=32,l=16,m=dU["aes256-CBC"],n=cz.aes.createEncryptionCipher;break;case"des":d=8,l=8,m=dU.desCBC,n=cz.des.createEncryptionCipher;break;default:throw(t=Error("Cannot encrypt private key. Unknown encryption algorithm.")).algorithm=c.algorithm,t}var j,k,l,m,n,o="hmacWith"+c.prfAlgorithm.toUpperCase(),p=d$(o),q=cz.pkcs5.pbkdf2(b,g,h,d,p),r=cz.random.getBytesSync(l);(u=n(q)).start(r),u.update(dS.toDer(a)),u.finish(),f=u.output.getBytes();var s=(j=d,k=dS.create(dS.Class.UNIVERSAL,dS.Type.SEQUENCE,!0,[dS.create(dS.Class.UNIVERSAL,dS.Type.OCTETSTRING,!1,g),dS.create(dS.Class.UNIVERSAL,dS.Type.INTEGER,!1,i.getBytes())]),"hmacWithSHA1"!==o&&k.value.push(dS.create(dS.Class.UNIVERSAL,dS.Type.INTEGER,!1,cz.util.hexToBytes(j.toString(16))),dS.create(dS.Class.UNIVERSAL,dS.Type.SEQUENCE,!0,[dS.create(dS.Class.UNIVERSAL,dS.Type.OID,!1,dS.oidToDer(dT.oids[o]).getBytes()),dS.create(dS.Class.UNIVERSAL,dS.Type.NULL,!1,"")])),k);e=dS.create(dS.Class.UNIVERSAL,dS.Type.SEQUENCE,!0,[dS.create(dS.Class.UNIVERSAL,dS.Type.OID,!1,dS.oidToDer(dU.pkcs5PBES2).getBytes()),dS.create(dS.Class.UNIVERSAL,dS.Type.SEQUENCE,!0,[dS.create(dS.Class.UNIVERSAL,dS.Type.SEQUENCE,!0,[dS.create(dS.Class.UNIVERSAL,dS.Type.OID,!1,dS.oidToDer(dU.pkcs5PBKDF2).getBytes()),s]),dS.create(dS.Class.UNIVERSAL,dS.Type.SEQUENCE,!0,[dS.create(dS.Class.UNIVERSAL,dS.Type.OID,!1,dS.oidToDer(m).getBytes()),dS.create(dS.Class.UNIVERSAL,dS.Type.OCTETSTRING,!1,r)])])])}else{if("3des"!==c.algorithm)throw(t=Error("Cannot encrypt private key. Unknown encryption algorithm.")).algorithm=c.algorithm,t;d=24;var t,u,v=new cz.util.ByteBuffer(g);q=dT.pbe.generatePkcs12Key(b,v,1,h,d),r=dT.pbe.generatePkcs12Key(b,v,2,h,d),(u=cz.des.createEncryptionCipher(q)).start(r),u.update(dS.toDer(a)),u.finish(),f=u.output.getBytes(),e=dS.create(dS.Class.UNIVERSAL,dS.Type.SEQUENCE,!0,[dS.create(dS.Class.UNIVERSAL,dS.Type.OID,!1,dS.oidToDer(dU["pbeWithSHAAnd3-KeyTripleDES-CBC"]).getBytes()),dS.create(dS.Class.UNIVERSAL,dS.Type.SEQUENCE,!0,[dS.create(dS.Class.UNIVERSAL,dS.Type.OCTETSTRING,!1,g),dS.create(dS.Class.UNIVERSAL,dS.Type.INTEGER,!1,i.getBytes())])])}return dS.create(dS.Class.UNIVERSAL,dS.Type.SEQUENCE,!0,[e,dS.create(dS.Class.UNIVERSAL,dS.Type.OCTETSTRING,!1,f)])},dT.decryptPrivateKeyInfo=function(a,b){var c=null,d={},e=[];if(!dS.validate(a,dV,d,e)){var f=Error("Cannot read encrypted private key. ASN.1 object is not a supported EncryptedPrivateKeyInfo.");throw f.errors=e,f}var g=dS.derToOid(d.encryptionOid),h=dT.pbe.getCipher(g,d.encryptionParams,b),i=cz.util.createBuffer(d.encryptedData);return h.update(i),h.finish()&&(c=dS.fromDer(h.output)),c},dT.encryptedPrivateKeyToPem=function(a,b){var c={type:"ENCRYPTED PRIVATE KEY",body:dS.toDer(a).getBytes()};return cz.pem.encode(c,{maxline:b})},dT.encryptedPrivateKeyFromPem=function(a){var b=cz.pem.decode(a)[0];if("ENCRYPTED PRIVATE KEY"!==b.type){var c=Error('Could not convert encrypted private key from PEM; PEM header type is "ENCRYPTED PRIVATE KEY".');throw c.headerType=b.type,c}if(b.procType&&"ENCRYPTED"===b.procType.type)throw Error("Could not convert encrypted private key from PEM; PEM is encrypted.");return dS.fromDer(b.body)},dT.encryptRsaPrivateKey=function(a,b,c){if(!(c=c||{}).legacy){var d,e,f,g,h=dT.wrapRsaPrivateKey(dT.privateKeyToAsn1(a));return h=dT.encryptPrivateKeyInfo(h,b,c),dT.encryptedPrivateKeyToPem(h)}switch(c.algorithm){case"aes128":d="AES-128-CBC",f=16,e=cz.random.getBytesSync(16),g=cz.aes.createEncryptionCipher;break;case"aes192":d="AES-192-CBC",f=24,e=cz.random.getBytesSync(16),g=cz.aes.createEncryptionCipher;break;case"aes256":d="AES-256-CBC",f=32,e=cz.random.getBytesSync(16),g=cz.aes.createEncryptionCipher;break;case"3des":d="DES-EDE3-CBC",f=24,e=cz.random.getBytesSync(8),g=cz.des.createEncryptionCipher;break;case"des":d="DES-CBC",f=8,e=cz.random.getBytesSync(8),g=cz.des.createEncryptionCipher;break;default:var i=Error('Could not encrypt RSA private key; unsupported encryption algorithm "'+c.algorithm+'".');throw i.algorithm=c.algorithm,i}var j=g(cz.pbe.opensslDeriveBytes(b,e.substr(0,8),f));j.start(e),j.update(dS.toDer(dT.privateKeyToAsn1(a))),j.finish();var k={type:"RSA PRIVATE KEY",procType:{version:"4",type:"ENCRYPTED"},dekInfo:{algorithm:d,parameters:cz.util.bytesToHex(e).toUpperCase()},body:j.output.getBytes()};return cz.pem.encode(k)},dT.decryptRsaPrivateKey=function(a,b){var c=null,d=cz.pem.decode(a)[0];if("ENCRYPTED PRIVATE KEY"!==d.type&&"PRIVATE KEY"!==d.type&&"RSA PRIVATE KEY"!==d.type)throw(g=Error('Could not convert private key from PEM; PEM header type is not "ENCRYPTED PRIVATE KEY", "PRIVATE KEY", or "RSA PRIVATE KEY".')).headerType=g,g;if(d.procType&&"ENCRYPTED"===d.procType.type){switch(d.dekInfo.algorithm){case"DES-CBC":e=8,f=cz.des.createDecryptionCipher;break;case"DES-EDE3-CBC":e=24,f=cz.des.createDecryptionCipher;break;case"AES-128-CBC":e=16,f=cz.aes.createDecryptionCipher;break;case"AES-192-CBC":e=24,f=cz.aes.createDecryptionCipher;break;case"AES-256-CBC":e=32,f=cz.aes.createDecryptionCipher;break;case"RC2-40-CBC":e=5,f=function(a){return cz.rc2.createDecryptionCipher(a,40)};break;case"RC2-64-CBC":e=8,f=function(a){return cz.rc2.createDecryptionCipher(a,64)};break;case"RC2-128-CBC":e=16,f=function(a){return cz.rc2.createDecryptionCipher(a,128)};break;default:throw(g=Error('Could not decrypt private key; unsupported encryption algorithm "'+d.dekInfo.algorithm+'".')).algorithm=d.dekInfo.algorithm,g}var e,f,g,h=cz.util.hexToBytes(d.dekInfo.parameters),i=f(cz.pbe.opensslDeriveBytes(b,h.substr(0,8),e));if(i.start(h),i.update(cz.util.createBuffer(d.body)),!i.finish())return c;c=i.output.getBytes()}else c=d.body;return null!==(c="ENCRYPTED PRIVATE KEY"===d.type?dT.decryptPrivateKeyInfo(dS.fromDer(c),b):dS.fromDer(c))&&(c=dT.privateKeyFromAsn1(c)),c},dT.pbe.generatePkcs12Key=function(a,b,c,d,e,f){if(null==f){if(!("sha1"in cz.md))throw Error('"sha1" hash algorithm unavailable.');f=cz.md.sha1.create()}var g,h,i=f.digestLength,j=f.blockLength,k=new cz.util.ByteBuffer,l=new cz.util.ByteBuffer;if(null!=a){for(h=0;h<a.length;h++)l.putInt16(a.charCodeAt(h));l.putInt16(0)}var m=l.length(),n=b.length(),o=new cz.util.ByteBuffer;o.fillWithByte(c,j);var p=j*Math.ceil(n/j),q=new cz.util.ByteBuffer;for(h=0;h<p;h++)q.putByte(b.at(h%n));var r=j*Math.ceil(m/j),s=new cz.util.ByteBuffer;for(h=0;h<r;h++)s.putByte(l.at(h%m));var t=q;t.putBuffer(s);for(var u=Math.ceil(e/i),v=1;v<=u;v++){var w=new cz.util.ByteBuffer;w.putBytes(o.bytes()),w.putBytes(t.bytes());for(var x=0;x<d;x++)f.start(),f.update(w.getBytes()),w=f.digest();var y=new cz.util.ByteBuffer;for(h=0;h<j;h++)y.putByte(w.at(h%i));var z=Math.ceil(n/j)+Math.ceil(m/j),A=new cz.util.ByteBuffer;for(g=0;g<z;g++){var B=new cz.util.ByteBuffer(t.getBytes(j)),C=511;for(h=y.length()-1;h>=0;h--)C>>=8,C+=y.at(h)+B.at(h),B.setAt(h,255&C);A.putBuffer(B)}t=A,k.putBuffer(w)}return k.truncate(k.length()-e),k},dT.pbe.getCipher=function(a,b,c){switch(a){case dT.oids.pkcs5PBES2:return dT.pbe.getCipherForPBES2(a,b,c);case dT.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:case dT.oids["pbewithSHAAnd40BitRC2-CBC"]:return dT.pbe.getCipherForPKCS12PBE(a,b,c);default:var d=Error("Cannot read encrypted PBE data block. Unsupported OID.");throw d.oid=a,d.supportedOids=["pkcs5PBES2","pbeWithSHAAnd3-KeyTripleDES-CBC","pbewithSHAAnd40BitRC2-CBC"],d}},dT.pbe.getCipherForPBES2=function(a,b,c){var d,e={},f=[];if(!dS.validate(b,dW,e,f))throw(d=Error("Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.")).errors=f,d;if((a=dS.derToOid(e.kdfOid))!==dT.oids.pkcs5PBKDF2)throw(d=Error("Cannot read encrypted private key. Unsupported key derivation function OID.")).oid=a,d.supportedOids=["pkcs5PBKDF2"],d;if((a=dS.derToOid(e.encOid))!==dT.oids["aes128-CBC"]&&a!==dT.oids["aes192-CBC"]&&a!==dT.oids["aes256-CBC"]&&a!==dT.oids["des-EDE3-CBC"]&&a!==dT.oids.desCBC)throw(d=Error("Cannot read encrypted private key. Unsupported encryption scheme OID.")).oid=a,d.supportedOids=["aes128-CBC","aes192-CBC","aes256-CBC","des-EDE3-CBC","desCBC"],d;var g,h,i=e.kdfSalt,j=cz.util.createBuffer(e.kdfIterationCount);switch(j=j.getInt(j.length()<<3),dT.oids[a]){case"aes128-CBC":g=16,h=cz.aes.createDecryptionCipher;break;case"aes192-CBC":g=24,h=cz.aes.createDecryptionCipher;break;case"aes256-CBC":g=32,h=cz.aes.createDecryptionCipher;break;case"des-EDE3-CBC":g=24,h=cz.des.createDecryptionCipher;break;case"desCBC":g=8,h=cz.des.createDecryptionCipher}var k=dZ(e.prfOid),l=cz.pkcs5.pbkdf2(c,i,j,g,k),m=e.encIv,n=h(l);return n.start(m),n},dT.pbe.getCipherForPKCS12PBE=function(a,b,c){var d,e={},f=[];if(!dS.validate(b,dX,e,f))throw(d=Error("Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.")).errors=f,d;var g,h,i,j=cz.util.createBuffer(e.salt),k=cz.util.createBuffer(e.iterations);switch(k=k.getInt(k.length()<<3),a){case dT.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:g=24,h=8,i=cz.des.startDecrypting;break;case dT.oids["pbewithSHAAnd40BitRC2-CBC"]:g=5,h=8,i=function(a,b){var c=cz.rc2.createDecryptionCipher(a,40);return c.start(b,null),c};break;default:throw(d=Error("Cannot read PKCS #12 PBE data block. Unsupported OID.")).oid=a,d}var l=dZ(e.prfOid),m=dT.pbe.generatePkcs12Key(c,j,1,k,g,l);return l.start(),i(m,dT.pbe.generatePkcs12Key(c,j,2,k,h,l))},dT.pbe.opensslDeriveBytes=function(a,b,c,d){if(null==d){if(!("md5"in cz.md))throw Error('"md5" hash algorithm unavailable.');d=cz.md.md5.create()}null===b&&(b="");for(var e=[dY(d,a+b)],f=16,g=1;f<c;++g,f+=16)e.push(dY(d,e[g-1]+a+b));return e.join("").substr(0,c)},cB(function(a){var b=cz.asn1,c=a.exports=cz.pkcs7asn1=cz.pkcs7asn1||{};cz.pkcs7=cz.pkcs7||{},cz.pkcs7.asn1=c;var d={name:"ContentInfo",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"ContentInfo.ContentType",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"contentType"},{name:"ContentInfo.content",tagClass:b.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,captureAsn1:"content"}]};c.contentInfoValidator=d;var e={name:"EncryptedContentInfo",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedContentInfo.contentType",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"contentType"},{name:"EncryptedContentInfo.contentEncryptionAlgorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedContentInfo.contentEncryptionAlgorithm.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"encAlgorithm"},{name:"EncryptedContentInfo.contentEncryptionAlgorithm.parameter",tagClass:b.Class.UNIVERSAL,captureAsn1:"encParameter"}]},{name:"EncryptedContentInfo.encryptedContent",tagClass:b.Class.CONTEXT_SPECIFIC,type:0,capture:"encryptedContent",captureAsn1:"encryptedContentAsn1"}]};c.envelopedDataValidator={name:"EnvelopedData",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"EnvelopedData.Version",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"version"},{name:"EnvelopedData.RecipientInfos",tagClass:b.Class.UNIVERSAL,type:b.Type.SET,constructed:!0,captureAsn1:"recipientInfos"}].concat(e)},c.encryptedDataValidator={name:"EncryptedData",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedData.Version",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"version"}].concat(e)},c.signedDataValidator={name:"SignedData",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"SignedData.Version",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"version"},{name:"SignedData.DigestAlgorithms",tagClass:b.Class.UNIVERSAL,type:b.Type.SET,constructed:!0,captureAsn1:"digestAlgorithms"},d,{name:"SignedData.Certificates",tagClass:b.Class.CONTEXT_SPECIFIC,type:0,optional:!0,captureAsn1:"certificates"},{name:"SignedData.CertificateRevocationLists",tagClass:b.Class.CONTEXT_SPECIFIC,type:1,optional:!0,captureAsn1:"crls"},{name:"SignedData.SignerInfos",tagClass:b.Class.UNIVERSAL,type:b.Type.SET,capture:"signerInfos",optional:!0,value:[{name:"SignerInfo",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"SignerInfo.version",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1},{name:"SignerInfo.issuerAndSerialNumber",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"SignerInfo.issuerAndSerialNumber.issuer",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,captureAsn1:"issuer"},{name:"SignerInfo.issuerAndSerialNumber.serialNumber",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"serial"}]},{name:"SignerInfo.digestAlgorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"SignerInfo.digestAlgorithm.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"digestAlgorithm"},{name:"SignerInfo.digestAlgorithm.parameter",tagClass:b.Class.UNIVERSAL,constructed:!1,captureAsn1:"digestParameter",optional:!0}]},{name:"SignerInfo.authenticatedAttributes",tagClass:b.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,capture:"authenticatedAttributes"},{name:"SignerInfo.digestEncryptionAlgorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,capture:"signatureAlgorithm"},{name:"SignerInfo.encryptedDigest",tagClass:b.Class.UNIVERSAL,type:b.Type.OCTETSTRING,constructed:!1,capture:"signature"},{name:"SignerInfo.unauthenticatedAttributes",tagClass:b.Class.CONTEXT_SPECIFIC,type:1,constructed:!0,optional:!0,capture:"unauthenticatedAttributes"}]}]}]},c.recipientInfoValidator={name:"RecipientInfo",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"RecipientInfo.version",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"version"},{name:"RecipientInfo.issuerAndSerial",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"RecipientInfo.issuerAndSerial.issuer",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,captureAsn1:"issuer"},{name:"RecipientInfo.issuerAndSerial.serialNumber",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"serial"}]},{name:"RecipientInfo.keyEncryptionAlgorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"RecipientInfo.keyEncryptionAlgorithm.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"encAlgorithm"},{name:"RecipientInfo.keyEncryptionAlgorithm.parameter",tagClass:b.Class.UNIVERSAL,constructed:!1,captureAsn1:"encParameter",optional:!0}]},{name:"RecipientInfo.encryptedKey",tagClass:b.Class.UNIVERSAL,type:b.Type.OCTETSTRING,constructed:!1,capture:"encKey"}]}}),cB(function(a){cz.mgf=cz.mgf||{},(a.exports=cz.mgf.mgf1=cz.mgf1=cz.mgf1||{}).create=function(a){return{generate:function(b,c){for(var d=new cz.util.ByteBuffer,e=Math.ceil(c/a.digestLength),f=0;f<e;f++){var g=new cz.util.ByteBuffer;g.putInt32(f),a.start(),a.update(b+g.getBytes()),d.putBuffer(a.digest())}return d.truncate(d.length()-c),d.getBytes()}}}}),cz.mgf=cz.mgf||{},cz.mgf.mgf1=cz.mgf1,cB(function(a){(a.exports=cz.pss=cz.pss||{}).create=function(a){3==arguments.length&&(a={md:arguments[0],mgf:arguments[1],saltLength:arguments[2]});var b,c=a.md,d=a.mgf,e=c.digestLength,f=a.salt||null;if("string"==typeof f&&(f=cz.util.createBuffer(f)),"saltLength"in a)b=a.saltLength;else{if(null===f)throw Error("Salt length not specified or specific salt not given.");b=f.length()}if(null!==f&&f.length()!==b)throw Error("Given salt length does not match length of given salt.");var g=a.prng||cz.random;return{encode:function(a,h){var i,j,k=h-1,l=Math.ceil(k/8),m=a.digest().getBytes();if(l<e+b+2)throw Error("Message is too long to encrypt.");j=null===f?g.getBytesSync(b):f.bytes();var n=new cz.util.ByteBuffer;n.fillWithByte(0,8),n.putBytes(m),n.putBytes(j),c.start(),c.update(n.getBytes());var o=c.digest().getBytes(),p=new cz.util.ByteBuffer;p.fillWithByte(0,l-b-e-2),p.putByte(1),p.putBytes(j);var q=p.getBytes(),r=l-e-1,s=d.generate(o,r),t="";for(i=0;i<r;i++)t+=String.fromCharCode(q.charCodeAt(i)^s.charCodeAt(i));return(t=String.fromCharCode(t.charCodeAt(0)&~(65280>>8*l-k&255))+t.substr(1))+o+String.fromCharCode(188)},verify:function(a,f,g){var h,i=g-1,j=Math.ceil(i/8);if(f=f.substr(-j),j<e+b+2)throw Error("Inconsistent parameters to PSS signature verification.");if(188!==f.charCodeAt(j-1))throw Error("Encoded message does not end in 0xBC.");var k=j-e-1,l=f.substr(0,k),m=f.substr(k,e),n=65280>>8*j-i&255;if(0!=(l.charCodeAt(0)&n))throw Error("Bits beyond keysize not zero as expected.");var o=d.generate(m,k),p="";for(h=0;h<k;h++)p+=String.fromCharCode(l.charCodeAt(h)^o.charCodeAt(h));p=String.fromCharCode(p.charCodeAt(0)&~n)+p.substr(1);var q=j-e-b-2;for(h=0;h<q;h++)if(0!==p.charCodeAt(h))throw Error("Leftmost octets not zero as expected");if(1!==p.charCodeAt(q))throw Error("Inconsistent PSS signature, 0x01 marker not found");var r=p.substr(-b),s=new cz.util.ByteBuffer;return s.fillWithByte(0,8),s.putBytes(a),s.putBytes(r),c.start(),c.update(s.getBytes()),m===c.digest().getBytes()}}}}),cB(function(a){var b=cz.asn1,c=a.exports=cz.pki=cz.pki||{},d=c.oids,e={};e.CN=d.commonName,e.commonName="CN",e.C=d.countryName,e.countryName="C",e.L=d.localityName,e.localityName="L",e.ST=d.stateOrProvinceName,e.stateOrProvinceName="ST",e.O=d.organizationName,e.organizationName="O",e.OU=d.organizationalUnitName,e.organizationalUnitName="OU",e.E=d.emailAddress,e.emailAddress="E";var f=cz.pki.rsa.publicKeyValidator,g={name:"Certificate",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.TBSCertificate",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,captureAsn1:"tbsCertificate",value:[{name:"Certificate.TBSCertificate.version",tagClass:b.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,value:[{name:"Certificate.TBSCertificate.version.integer",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"certVersion"}]},{name:"Certificate.TBSCertificate.serialNumber",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"certSerialNumber"},{name:"Certificate.TBSCertificate.signature",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.TBSCertificate.signature.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"certinfoSignatureOid"},{name:"Certificate.TBSCertificate.signature.parameters",tagClass:b.Class.UNIVERSAL,optional:!0,captureAsn1:"certinfoSignatureParams"}]},{name:"Certificate.TBSCertificate.issuer",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,captureAsn1:"certIssuer"},{name:"Certificate.TBSCertificate.validity",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.TBSCertificate.validity.notBefore (utc)",tagClass:b.Class.UNIVERSAL,type:b.Type.UTCTIME,constructed:!1,optional:!0,capture:"certValidity1UTCTime"},{name:"Certificate.TBSCertificate.validity.notBefore (generalized)",tagClass:b.Class.UNIVERSAL,type:b.Type.GENERALIZEDTIME,constructed:!1,optional:!0,capture:"certValidity2GeneralizedTime"},{name:"Certificate.TBSCertificate.validity.notAfter (utc)",tagClass:b.Class.UNIVERSAL,type:b.Type.UTCTIME,constructed:!1,optional:!0,capture:"certValidity3UTCTime"},{name:"Certificate.TBSCertificate.validity.notAfter (generalized)",tagClass:b.Class.UNIVERSAL,type:b.Type.GENERALIZEDTIME,constructed:!1,optional:!0,capture:"certValidity4GeneralizedTime"}]},{name:"Certificate.TBSCertificate.subject",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,captureAsn1:"certSubject"},f,{name:"Certificate.TBSCertificate.issuerUniqueID",tagClass:b.Class.CONTEXT_SPECIFIC,type:1,constructed:!0,optional:!0,value:[{name:"Certificate.TBSCertificate.issuerUniqueID.id",tagClass:b.Class.UNIVERSAL,type:b.Type.BITSTRING,constructed:!1,captureBitStringValue:"certIssuerUniqueId"}]},{name:"Certificate.TBSCertificate.subjectUniqueID",tagClass:b.Class.CONTEXT_SPECIFIC,type:2,constructed:!0,optional:!0,value:[{name:"Certificate.TBSCertificate.subjectUniqueID.id",tagClass:b.Class.UNIVERSAL,type:b.Type.BITSTRING,constructed:!1,captureBitStringValue:"certSubjectUniqueId"}]},{name:"Certificate.TBSCertificate.extensions",tagClass:b.Class.CONTEXT_SPECIFIC,type:3,constructed:!0,captureAsn1:"certExtensions",optional:!0}]},{name:"Certificate.signatureAlgorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.signatureAlgorithm.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"certSignatureOid"},{name:"Certificate.TBSCertificate.signature.parameters",tagClass:b.Class.UNIVERSAL,optional:!0,captureAsn1:"certSignatureParams"}]},{name:"Certificate.signatureValue",tagClass:b.Class.UNIVERSAL,type:b.Type.BITSTRING,constructed:!1,captureBitStringValue:"certSignature"}]},h={name:"rsapss",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"rsapss.hashAlgorithm",tagClass:b.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,value:[{name:"rsapss.hashAlgorithm.AlgorithmIdentifier",tagClass:b.Class.UNIVERSAL,type:b.Class.SEQUENCE,constructed:!0,optional:!0,value:[{name:"rsapss.hashAlgorithm.AlgorithmIdentifier.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"hashOid"}]}]},{name:"rsapss.maskGenAlgorithm",tagClass:b.Class.CONTEXT_SPECIFIC,type:1,constructed:!0,value:[{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier",tagClass:b.Class.UNIVERSAL,type:b.Class.SEQUENCE,constructed:!0,optional:!0,value:[{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"maskGenOid"},{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier.params",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier.params.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"maskGenHashOid"}]}]}]},{name:"rsapss.saltLength",tagClass:b.Class.CONTEXT_SPECIFIC,type:2,optional:!0,value:[{name:"rsapss.saltLength.saltLength",tagClass:b.Class.UNIVERSAL,type:b.Class.INTEGER,constructed:!1,capture:"saltLength"}]},{name:"rsapss.trailerField",tagClass:b.Class.CONTEXT_SPECIFIC,type:3,optional:!0,value:[{name:"rsapss.trailer.trailer",tagClass:b.Class.UNIVERSAL,type:b.Class.INTEGER,constructed:!1,capture:"trailer"}]}]},i={name:"CertificationRequest",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,captureAsn1:"csr",value:[{name:"CertificationRequestInfo",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,captureAsn1:"certificationRequestInfo",value:[{name:"CertificationRequestInfo.integer",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"certificationRequestInfoVersion"},{name:"CertificationRequestInfo.subject",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,captureAsn1:"certificationRequestInfoSubject"},f,{name:"CertificationRequestInfo.attributes",tagClass:b.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,capture:"certificationRequestInfoAttributes",value:[{name:"CertificationRequestInfo.attributes",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"CertificationRequestInfo.attributes.type",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1},{name:"CertificationRequestInfo.attributes.value",tagClass:b.Class.UNIVERSAL,type:b.Type.SET,constructed:!0}]}]}]},{name:"CertificationRequest.signatureAlgorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"CertificationRequest.signatureAlgorithm.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"csrSignatureOid"},{name:"CertificationRequest.signatureAlgorithm.parameters",tagClass:b.Class.UNIVERSAL,optional:!0,captureAsn1:"csrSignatureParams"}]},{name:"CertificationRequest.signature",tagClass:b.Class.UNIVERSAL,type:b.Type.BITSTRING,constructed:!1,captureBitStringValue:"csrSignature"}]};function j(a,b){"string"==typeof b&&(b={shortName:b});for(var c,d=null,e=0;null===d&&e<a.attributes.length;++e)c=a.attributes[e],(b.type&&b.type===c.type||b.name&&b.name===c.name||b.shortName&&b.shortName===c.shortName)&&(d=c);return d}c.RDNAttributesAsArray=function(a,c){for(var f,g,h,i=[],j=0;j<a.value.length;++j){f=a.value[j];for(var k=0;k<f.value.length;++k)(h={}).type=b.derToOid((g=f.value[k]).value[0].value),h.value=g.value[1].value,h.valueTagClass=g.value[1].type,h.type in d&&(h.name=d[h.type],h.name in e&&(h.shortName=e[h.name])),c&&(c.update(h.type),c.update(h.value)),i.push(h)}return i},c.CRIAttributesAsArray=function(a){for(var f=[],g=0;g<a.length;++g)for(var h=a[g],i=b.derToOid(h.value[0].value),j=h.value[1].value,k=0;k<j.length;++k){var l={};if(l.type=i,l.value=j[k].value,l.valueTagClass=j[k].type,l.type in d&&(l.name=d[l.type],l.name in e&&(l.shortName=e[l.name])),l.type===d.extensionRequest){l.extensions=[];for(var m=0;m<l.value.length;++m)l.extensions.push(c.certificateExtensionFromAsn1(l.value[m]))}f.push(l)}return f};var k=function(a,c,e){var f={};if(a!==d["RSASSA-PSS"])return f;e&&(f={hash:{algorithmOid:d.sha1},mgf:{algorithmOid:d.mgf1,hash:{algorithmOid:d.sha1}},saltLength:20});var g={},i=[];if(!b.validate(c,h,g,i)){var j=Error("Cannot read RSASSA-PSS parameter block.");throw j.errors=i,j}return void 0!==g.hashOid&&(f.hash=f.hash||{},f.hash.algorithmOid=b.derToOid(g.hashOid)),void 0!==g.maskGenOid&&(f.mgf=f.mgf||{},f.mgf.algorithmOid=b.derToOid(g.maskGenOid),f.mgf.hash=f.mgf.hash||{},f.mgf.hash.algorithmOid=b.derToOid(g.maskGenHashOid)),void 0!==g.saltLength&&(f.saltLength=g.saltLength.charCodeAt(0)),f},l=function(a){switch(d[a.signatureOid]){case"sha1WithRSAEncryption":case"sha1WithRSASignature":return cz.md.sha1.create();case"md5WithRSAEncryption":return cz.md.md5.create();case"sha256WithRSAEncryption":case"RSASSA-PSS":return cz.md.sha256.create();case"sha384WithRSAEncryption":return cz.md.sha384.create();case"sha512WithRSAEncryption":return cz.md.sha512.create();default:var b=Error("Could not compute "+a.type+" digest. Unknown signature OID.");throw b.signatureOid=a.signatureOid,b}},m=function(a){var b,c,e,f,g=a.certificate;switch(g.signatureOid){case d.sha1WithRSAEncryption:case d.sha1WithRSASignature:break;case d["RSASSA-PSS"]:if(void 0===(b=d[g.signatureParameters.mgf.hash.algorithmOid])||void 0===cz.md[b])throw(e=Error("Unsupported MGF hash function.")).oid=g.signatureParameters.mgf.hash.algorithmOid,e.name=b,e;if(void 0===(c=d[g.signatureParameters.mgf.algorithmOid])||void 0===cz.mgf[c])throw(e=Error("Unsupported MGF function.")).oid=g.signatureParameters.mgf.algorithmOid,e.name=c,e;if(c=cz.mgf[c].create(cz.md[b].create()),void 0===(b=d[g.signatureParameters.hash.algorithmOid])||void 0===cz.md[b])throw(e=Error("Unsupported RSASSA-PSS hash function.")).oid=g.signatureParameters.hash.algorithmOid,e.name=b,e;f=cz.pss.create(cz.md[b].create(),c,g.signatureParameters.saltLength)}return g.publicKey.verify(a.md.digest().getBytes(),a.signature,f)};function n(a){for(var c,d,e=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[]),f=a.attributes,g=0;g<f.length;++g){var h=(c=f[g]).value,i=b.Type.PRINTABLESTRING;"valueTagClass"in c&&(i=c.valueTagClass)===b.Type.UTF8&&(h=cz.util.encodeUtf8(h)),d=b.create(b.Class.UNIVERSAL,b.Type.SET,!0,[b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.type).getBytes()),b.create(b.Class.UNIVERSAL,i,!1,h)])]),e.value.push(d)}return e}function o(a){for(var f,g=0;g<a.length;++g){if(void 0===(f=a[g]).name&&(f.type&&f.type in c.oids?f.name=c.oids[f.type]:f.shortName&&f.shortName in e&&(f.name=c.oids[e[f.shortName]])),void 0===f.type){if(!f.name||!(f.name in c.oids))throw(h=Error("Attribute type not specified.")).attribute=f,h;f.type=c.oids[f.name]}if(void 0===f.shortName&&f.name&&f.name in e&&(f.shortName=e[f.name]),f.type===d.extensionRequest&&(f.valueConstructed=!0,f.valueTagClass=b.Type.SEQUENCE,!f.value&&f.extensions)){f.value=[];for(var h,i=0;i<f.extensions.length;++i)f.value.push(c.certificateExtensionToAsn1(p(f.extensions[i])))}if(void 0===f.value)throw(h=Error("Attribute value not specified.")).attribute=f,h}}function p(a,e){if(e=e||{},void 0===a.name&&a.id&&a.id in c.oids&&(a.name=c.oids[a.id]),void 0===a.id){if(!a.name||!(a.name in c.oids))throw(f=Error("Extension ID not specified.")).extension=a,f;a.id=c.oids[a.name]}if(void 0!==a.value)return a;if("keyUsage"===a.name){var f,g=0,h=0,i=0;a.digitalSignature&&(h|=128,g=7),a.nonRepudiation&&(h|=64,g=6),a.keyEncipherment&&(h|=32,g=5),a.dataEncipherment&&(h|=16,g=4),a.keyAgreement&&(h|=8,g=3),a.keyCertSign&&(h|=4,g=2),a.cRLSign&&(h|=2,g=1),a.encipherOnly&&(h|=1,g=0),a.decipherOnly&&(i|=128,g=7);var j=String.fromCharCode(g);0!==i?j+=String.fromCharCode(h)+String.fromCharCode(i):0!==h&&(j+=String.fromCharCode(h)),a.value=b.create(b.Class.UNIVERSAL,b.Type.BITSTRING,!1,j)}else if("basicConstraints"===a.name)a.value=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[]),a.cA&&a.value.value.push(b.create(b.Class.UNIVERSAL,b.Type.BOOLEAN,!1,String.fromCharCode(255))),"pathLenConstraint"in a&&a.value.value.push(b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer(a.pathLenConstraint).getBytes()));else if("extKeyUsage"===a.name){a.value=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[]);var k=a.value.value;for(var l in a)!0===a[l]&&(l in d?k.push(b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(d[l]).getBytes())):-1!==l.indexOf(".")&&k.push(b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(l).getBytes())))}else if("nsCertType"===a.name)g=0,h=0,a.client&&(h|=128,g=7),a.server&&(h|=64,g=6),a.email&&(h|=32,g=5),a.objsign&&(h|=16,g=4),a.reserved&&(h|=8,g=3),a.sslCA&&(h|=4,g=2),a.emailCA&&(h|=2,g=1),a.objCA&&(h|=1,g=0),j=String.fromCharCode(g),0!==h&&(j+=String.fromCharCode(h)),a.value=b.create(b.Class.UNIVERSAL,b.Type.BITSTRING,!1,j);else if("subjectAltName"===a.name||"issuerAltName"===a.name){a.value=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[]);for(var m=0;m<a.altNames.length;++m){if(j=(s=a.altNames[m]).value,7===s.type&&s.ip){if(null===(j=cz.util.bytesFromIP(s.ip)))throw(f=Error('Extension "ip" value is not a valid IPv4 or IPv6 address.')).extension=a,f}else 8===s.type&&(j=b.oidToDer(s.oid?b.oidToDer(s.oid):j));a.value.value.push(b.create(b.Class.CONTEXT_SPECIFIC,s.type,!1,j))}}else if("nsComment"===a.name&&e.cert){if(!/^[\x00-\x7F]*$/.test(a.comment)||a.comment.length<1||a.comment.length>128)throw Error('Invalid "nsComment" content.');a.value=b.create(b.Class.UNIVERSAL,b.Type.IA5STRING,!1,a.comment)}else if("subjectKeyIdentifier"===a.name&&e.cert){var o=e.cert.generateSubjectKeyIdentifier();a.subjectKeyIdentifier=o.toHex(),a.value=b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,o.getBytes())}else if("authorityKeyIdentifier"===a.name&&e.cert){if(a.value=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[]),k=a.value.value,a.keyIdentifier){var p=!0===a.keyIdentifier?e.cert.generateSubjectKeyIdentifier().getBytes():a.keyIdentifier;k.push(b.create(b.Class.CONTEXT_SPECIFIC,0,!1,p))}if(a.authorityCertIssuer){var q=[b.create(b.Class.CONTEXT_SPECIFIC,4,!0,[n(!0===a.authorityCertIssuer?e.cert.issuer:a.authorityCertIssuer)])];k.push(b.create(b.Class.CONTEXT_SPECIFIC,1,!0,q))}if(a.serialNumber){var r=cz.util.hexToBytes(!0===a.serialNumber?e.cert.serialNumber:a.serialNumber);k.push(b.create(b.Class.CONTEXT_SPECIFIC,2,!1,r))}}else if("cRLDistributionPoints"===a.name){a.value=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[]),k=a.value.value;var s,t=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[]),u=b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[]);for(m=0;m<a.altNames.length;++m){if(j=(s=a.altNames[m]).value,7===s.type&&s.ip){if(null===(j=cz.util.bytesFromIP(s.ip)))throw(f=Error('Extension "ip" value is not a valid IPv4 or IPv6 address.')).extension=a,f}else 8===s.type&&(j=b.oidToDer(s.oid?b.oidToDer(s.oid):j));u.value.push(b.create(b.Class.CONTEXT_SPECIFIC,s.type,!1,j))}t.value.push(b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[u])),k.push(t)}if(void 0===a.value)throw(f=Error("Extension value not specified.")).extension=a,f;return a}function q(a,c){if(a===d["RSASSA-PSS"]){var e=[];return void 0!==c.hash.algorithmOid&&e.push(b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.hash.algorithmOid).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.NULL,!1,"")])])),void 0!==c.mgf.algorithmOid&&e.push(b.create(b.Class.CONTEXT_SPECIFIC,1,!0,[b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.mgf.algorithmOid).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.mgf.hash.algorithmOid).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.NULL,!1,"")])])])),void 0!==c.saltLength&&e.push(b.create(b.Class.CONTEXT_SPECIFIC,2,!0,[b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer(c.saltLength).getBytes())])),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,e)}return b.create(b.Class.UNIVERSAL,b.Type.NULL,!1,"")}c.certificateFromPem=function(a,d,e){var f=cz.pem.decode(a)[0];if("CERTIFICATE"!==f.type&&"X509 CERTIFICATE"!==f.type&&"TRUSTED CERTIFICATE"!==f.type){var g=Error('Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".');throw g.headerType=f.type,g}if(f.procType&&"ENCRYPTED"===f.procType.type)throw Error("Could not convert certificate from PEM; PEM is encrypted.");var h=b.fromDer(f.body,e);return c.certificateFromAsn1(h,d)},c.certificateToPem=function(a,d){var e={type:"CERTIFICATE",body:b.toDer(c.certificateToAsn1(a)).getBytes()};return cz.pem.encode(e,{maxline:d})},c.publicKeyFromPem=function(a){var d=cz.pem.decode(a)[0];if("PUBLIC KEY"!==d.type&&"RSA PUBLIC KEY"!==d.type){var e=Error('Could not convert public key from PEM; PEM header type is not "PUBLIC KEY" or "RSA PUBLIC KEY".');throw e.headerType=d.type,e}if(d.procType&&"ENCRYPTED"===d.procType.type)throw Error("Could not convert public key from PEM; PEM is encrypted.");var f=b.fromDer(d.body);return c.publicKeyFromAsn1(f)},c.publicKeyToPem=function(a,d){var e={type:"PUBLIC KEY",body:b.toDer(c.publicKeyToAsn1(a)).getBytes()};return cz.pem.encode(e,{maxline:d})},c.publicKeyToRSAPublicKeyPem=function(a,d){var e={type:"RSA PUBLIC KEY",body:b.toDer(c.publicKeyToRSAPublicKey(a)).getBytes()};return cz.pem.encode(e,{maxline:d})},c.getPublicKeyFingerprint=function(a,d){var e,f=(d=d||{}).md||cz.md.sha1.create();switch(d.type||"RSAPublicKey"){case"RSAPublicKey":e=b.toDer(c.publicKeyToRSAPublicKey(a)).getBytes();break;case"SubjectPublicKeyInfo":e=b.toDer(c.publicKeyToAsn1(a)).getBytes();break;default:throw Error('Unknown fingerprint type "'+d.type+'".')}f.start(),f.update(e);var g=f.digest();if("hex"===d.encoding){var h=g.toHex();return d.delimiter?h.match(/.{2}/g).join(d.delimiter):h}if("binary"===d.encoding)return g.getBytes();if(d.encoding)throw Error('Unknown encoding "'+d.encoding+'".');return g},c.certificationRequestFromPem=function(a,d,e){var f=cz.pem.decode(a)[0];if("CERTIFICATE REQUEST"!==f.type){var g=Error('Could not convert certification request from PEM; PEM header type is not "CERTIFICATE REQUEST".');throw g.headerType=f.type,g}if(f.procType&&"ENCRYPTED"===f.procType.type)throw Error("Could not convert certification request from PEM; PEM is encrypted.");var h=b.fromDer(f.body,e);return c.certificationRequestFromAsn1(h,d)},c.certificationRequestToPem=function(a,d){var e={type:"CERTIFICATE REQUEST",body:b.toDer(c.certificationRequestToAsn1(a)).getBytes()};return cz.pem.encode(e,{maxline:d})},c.createCertificate=function(){var a={version:2,serialNumber:"00",signatureOid:null,signature:null,siginfo:{}};return a.siginfo.algorithmOid=null,a.validity={},a.validity.notBefore=new Date,a.validity.notAfter=new Date,a.issuer={},a.issuer.getField=function(b){return j(a.issuer,b)},a.issuer.addField=function(b){o([b]),a.issuer.attributes.push(b)},a.issuer.attributes=[],a.issuer.hash=null,a.subject={},a.subject.getField=function(b){return j(a.subject,b)},a.subject.addField=function(b){o([b]),a.subject.attributes.push(b)},a.subject.attributes=[],a.subject.hash=null,a.extensions=[],a.publicKey=null,a.md=null,a.setSubject=function(b,c){o(b),a.subject.attributes=b,delete a.subject.uniqueId,c&&(a.subject.uniqueId=c),a.subject.hash=null},a.setIssuer=function(b,c){o(b),a.issuer.attributes=b,delete a.issuer.uniqueId,c&&(a.issuer.uniqueId=c),a.issuer.hash=null},a.setExtensions=function(b){for(var c=0;c<b.length;++c)p(b[c],{cert:a});a.extensions=b},a.getExtension=function(b){"string"==typeof b&&(b={name:b});for(var c,d=null,e=0;null===d&&e<a.extensions.length;++e)c=a.extensions[e],(b.id&&c.id===b.id||b.name&&c.name===b.name)&&(d=c);return d},a.sign=function(e,f){a.md=f||cz.md.sha1.create();var g=d[a.md.algorithm+"WithRSAEncryption"];if(!g){var h=Error("Could not compute certificate digest. Unknown message digest algorithm OID.");throw h.algorithm=a.md.algorithm,h}a.signatureOid=a.siginfo.algorithmOid=g,a.tbsCertificate=c.getTBSCertificate(a);var i=b.toDer(a.tbsCertificate);a.md.update(i.getBytes()),a.signature=e.sign(a.md)},a.verify=function(d){var e=!1;if(!a.issued(d)){var f=d.issuer,g=a.subject,h=Error("The parent certificate did not issue the given child certificate; the child certificate's issuer does not match the parent's subject.");throw h.expectedIssuer=g.attributes,h.actualIssuer=f.attributes,h}var i=d.md;if(null===i){i=l({signatureOid:d.signatureOid,type:"certificate"});var j=d.tbsCertificate||c.getTBSCertificate(d),k=b.toDer(j);i.update(k.getBytes())}return null!==i&&(e=m({certificate:a,md:i,signature:d.signature})),e},a.isIssuer=function(b){var c,d,e=!1,f=a.issuer,g=b.subject;if(f.hash&&g.hash)e=f.hash===g.hash;else if(f.attributes.length===g.attributes.length){e=!0;for(var h=0;e&&h<f.attributes.length;++h)(c=f.attributes[h]).type===(d=g.attributes[h]).type&&c.value===d.value||(e=!1)}return e},a.issued=function(b){return b.isIssuer(a)},a.generateSubjectKeyIdentifier=function(){return c.getPublicKeyFingerprint(a.publicKey,{type:"RSAPublicKey"})},a.verifySubjectKeyIdentifier=function(){for(var b=d.subjectKeyIdentifier,c=0;c<a.extensions.length;++c){var e=a.extensions[c];if(e.id===b){var f=a.generateSubjectKeyIdentifier().getBytes();return cz.util.hexToBytes(e.subjectKeyIdentifier)===f}}return!1},a},c.certificateFromAsn1=function(a,d){var e={},f=[];if(!b.validate(a,g,e,f)){var h=Error("Cannot read X.509 certificate. ASN.1 object is not an X509v3 Certificate.");throw h.errors=f,h}if(b.derToOid(e.publicKeyOid)!==c.oids.rsaEncryption)throw Error("Cannot read public key. OID is not RSA.");var i=c.createCertificate();i.version=e.certVersion?e.certVersion.charCodeAt(0):0,i.serialNumber=cz.util.createBuffer(e.certSerialNumber).toHex(),i.signatureOid=cz.asn1.derToOid(e.certSignatureOid),i.signatureParameters=k(i.signatureOid,e.certSignatureParams,!0),i.siginfo.algorithmOid=cz.asn1.derToOid(e.certinfoSignatureOid),i.siginfo.parameters=k(i.siginfo.algorithmOid,e.certinfoSignatureParams,!1),i.signature=e.certSignature;var m=[];if(void 0!==e.certValidity1UTCTime&&m.push(b.utcTimeToDate(e.certValidity1UTCTime)),void 0!==e.certValidity2GeneralizedTime&&m.push(b.generalizedTimeToDate(e.certValidity2GeneralizedTime)),void 0!==e.certValidity3UTCTime&&m.push(b.utcTimeToDate(e.certValidity3UTCTime)),void 0!==e.certValidity4GeneralizedTime&&m.push(b.generalizedTimeToDate(e.certValidity4GeneralizedTime)),m.length>2)throw Error("Cannot read notBefore/notAfter validity times; more than two times were provided in the certificate.");if(m.length<2)throw Error("Cannot read notBefore/notAfter validity times; they were not provided as either UTCTime or GeneralizedTime.");if(i.validity.notBefore=m[0],i.validity.notAfter=m[1],i.tbsCertificate=e.tbsCertificate,d){i.md=l({signatureOid:i.signatureOid,type:"certificate"});var n=b.toDer(i.tbsCertificate);i.md.update(n.getBytes())}var p=cz.md.sha1.create(),q=b.toDer(e.certIssuer);p.update(q.getBytes()),i.issuer.getField=function(a){return j(i.issuer,a)},i.issuer.addField=function(a){o([a]),i.issuer.attributes.push(a)},i.issuer.attributes=c.RDNAttributesAsArray(e.certIssuer),e.certIssuerUniqueId&&(i.issuer.uniqueId=e.certIssuerUniqueId),i.issuer.hash=p.digest().toHex();var r=cz.md.sha1.create(),s=b.toDer(e.certSubject);return r.update(s.getBytes()),i.subject.getField=function(a){return j(i.subject,a)},i.subject.addField=function(a){o([a]),i.subject.attributes.push(a)},i.subject.attributes=c.RDNAttributesAsArray(e.certSubject),e.certSubjectUniqueId&&(i.subject.uniqueId=e.certSubjectUniqueId),i.subject.hash=r.digest().toHex(),i.extensions=e.certExtensions?c.certificateExtensionsFromAsn1(e.certExtensions):[],i.publicKey=c.publicKeyFromAsn1(e.subjectPublicKeyInfo),i},c.certificateExtensionsFromAsn1=function(a){for(var b=[],d=0;d<a.value.length;++d)for(var e=a.value[d],f=0;f<e.value.length;++f)b.push(c.certificateExtensionFromAsn1(e.value[f]));return b},c.certificateExtensionFromAsn1=function(a){var c,e={};if(e.id=b.derToOid(a.value[0].value),e.critical=!1,a.value[1].type===b.Type.BOOLEAN?(e.critical=0!==a.value[1].value.charCodeAt(0),e.value=a.value[2].value):e.value=a.value[1].value,e.id in d)if(e.name=d[e.id],"keyUsage"===e.name){var f=0,g=0;(h=b.fromDer(e.value)).value.length>1&&(f=h.value.charCodeAt(1),g=h.value.length>2?h.value.charCodeAt(2):0),e.digitalSignature=!(128&~f),e.nonRepudiation=!(64&~f),e.keyEncipherment=!(32&~f),e.dataEncipherment=!(16&~f),e.keyAgreement=!(8&~f),e.keyCertSign=!(4&~f),e.cRLSign=!(2&~f),e.encipherOnly=!(1&~f),e.decipherOnly=!(128&~g)}else if("basicConstraints"===e.name){var h=b.fromDer(e.value);e.cA=h.value.length>0&&h.value[0].type===b.Type.BOOLEAN&&0!==h.value[0].value.charCodeAt(0);var i=null;h.value.length>0&&h.value[0].type===b.Type.INTEGER?i=h.value[0].value:h.value.length>1&&(i=h.value[1].value),null!==i&&(e.pathLenConstraint=b.derToInteger(i))}else if("extKeyUsage"===e.name){h=b.fromDer(e.value);for(var j=0;j<h.value.length;++j){var k=b.derToOid(h.value[j].value);k in d?e[d[k]]=!0:e[k]=!0}}else if("nsCertType"===e.name)f=0,(h=b.fromDer(e.value)).value.length>1&&(f=h.value.charCodeAt(1)),e.client=!(128&~f),e.server=!(64&~f),e.email=!(32&~f),e.objsign=!(16&~f),e.reserved=!(8&~f),e.sslCA=!(4&~f),e.emailCA=!(2&~f),e.objCA=!(1&~f);else if("subjectAltName"===e.name||"issuerAltName"===e.name){e.altNames=[],h=b.fromDer(e.value);for(var l=0;l<h.value.length;++l){var m={type:(c=h.value[l]).type,value:c.value};switch(e.altNames.push(m),c.type){case 1:case 2:case 6:break;case 7:m.ip=cz.util.bytesToIP(c.value);break;case 8:m.oid=b.derToOid(c.value)}}}else"subjectKeyIdentifier"===e.name&&(h=b.fromDer(e.value),e.subjectKeyIdentifier=cz.util.bytesToHex(h.value));return e},c.certificationRequestFromAsn1=function(a,d){var e={},f=[];if(!b.validate(a,i,e,f)){var g=Error("Cannot read PKCS#10 certificate request. ASN.1 object is not a PKCS#10 CertificationRequest.");throw g.errors=f,g}if(b.derToOid(e.publicKeyOid)!==c.oids.rsaEncryption)throw Error("Cannot read public key. OID is not RSA.");var h=c.createCertificationRequest();if(h.version=e.csrVersion?e.csrVersion.charCodeAt(0):0,h.signatureOid=cz.asn1.derToOid(e.csrSignatureOid),h.signatureParameters=k(h.signatureOid,e.csrSignatureParams,!0),h.siginfo.algorithmOid=cz.asn1.derToOid(e.csrSignatureOid),h.siginfo.parameters=k(h.siginfo.algorithmOid,e.csrSignatureParams,!1),h.signature=e.csrSignature,h.certificationRequestInfo=e.certificationRequestInfo,d){h.md=l({signatureOid:h.signatureOid,type:"certification request"});var m=b.toDer(h.certificationRequestInfo);h.md.update(m.getBytes())}var n=cz.md.sha1.create();return h.subject.getField=function(a){return j(h.subject,a)},h.subject.addField=function(a){o([a]),h.subject.attributes.push(a)},h.subject.attributes=c.RDNAttributesAsArray(e.certificationRequestInfoSubject,n),h.subject.hash=n.digest().toHex(),h.publicKey=c.publicKeyFromAsn1(e.subjectPublicKeyInfo),h.getAttribute=function(a){return j(h,a)},h.addAttribute=function(a){o([a]),h.attributes.push(a)},h.attributes=c.CRIAttributesAsArray(e.certificationRequestInfoAttributes||[]),h},c.createCertificationRequest=function(){var a={version:0,signatureOid:null,signature:null,siginfo:{}};return a.siginfo.algorithmOid=null,a.subject={},a.subject.getField=function(b){return j(a.subject,b)},a.subject.addField=function(b){o([b]),a.subject.attributes.push(b)},a.subject.attributes=[],a.subject.hash=null,a.publicKey=null,a.attributes=[],a.getAttribute=function(b){return j(a,b)},a.addAttribute=function(b){o([b]),a.attributes.push(b)},a.md=null,a.setSubject=function(b){o(b),a.subject.attributes=b,a.subject.hash=null},a.setAttributes=function(b){o(b),a.attributes=b},a.sign=function(e,f){a.md=f||cz.md.sha1.create();var g=d[a.md.algorithm+"WithRSAEncryption"];if(!g){var h=Error("Could not compute certification request digest. Unknown message digest algorithm OID.");throw h.algorithm=a.md.algorithm,h}a.signatureOid=a.siginfo.algorithmOid=g,a.certificationRequestInfo=c.getCertificationRequestInfo(a);var i=b.toDer(a.certificationRequestInfo);a.md.update(i.getBytes()),a.signature=e.sign(a.md)},a.verify=function(){var d=!1,e=a.md;if(null===e){e=l({signatureOid:a.signatureOid,type:"certification request"});var f=a.certificationRequestInfo||c.getCertificationRequestInfo(a),g=b.toDer(f);e.update(g.getBytes())}return null!==e&&(d=m({certificate:a,md:e,signature:a.signature})),d},a};var r=new Date("1950-01-01T00:00:00Z"),s=new Date("2050-01-01T00:00:00Z");function t(a){return a>=r&&a<s?b.create(b.Class.UNIVERSAL,b.Type.UTCTIME,!1,b.dateToUtcTime(a)):b.create(b.Class.UNIVERSAL,b.Type.GENERALIZEDTIME,!1,b.dateToGeneralizedTime(a))}c.getTBSCertificate=function(a){var d=t(a.validity.notBefore),e=t(a.validity.notAfter),f=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer(a.version).getBytes())]),b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,cz.util.hexToBytes(a.serialNumber)),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.siginfo.algorithmOid).getBytes()),q(a.siginfo.algorithmOid,a.siginfo.parameters)]),n(a.issuer),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[d,e]),n(a.subject),c.publicKeyToAsn1(a.publicKey)]);return a.issuer.uniqueId&&f.value.push(b.create(b.Class.CONTEXT_SPECIFIC,1,!0,[b.create(b.Class.UNIVERSAL,b.Type.BITSTRING,!1,"\0"+a.issuer.uniqueId)])),a.subject.uniqueId&&f.value.push(b.create(b.Class.CONTEXT_SPECIFIC,2,!0,[b.create(b.Class.UNIVERSAL,b.Type.BITSTRING,!1,"\0"+a.subject.uniqueId)])),a.extensions.length>0&&f.value.push(c.certificateExtensionsToAsn1(a.extensions)),f},c.getCertificationRequestInfo=function(a){return b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer(a.version).getBytes()),n(a.subject),c.publicKeyToAsn1(a.publicKey),function(a){var c=b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[]);if(0===a.attributes.length)return c;for(var d=a.attributes,e=0;e<d.length;++e){var f=d[e],g=f.value,h=b.Type.UTF8;"valueTagClass"in f&&(h=f.valueTagClass),h===b.Type.UTF8&&(g=cz.util.encodeUtf8(g));var i=!1;"valueConstructed"in f&&(i=f.valueConstructed);var j=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(f.type).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SET,!0,[b.create(b.Class.UNIVERSAL,h,i,g)])]);c.value.push(j)}return c}(a)])},c.distinguishedNameToAsn1=function(a){return n(a)},c.certificateToAsn1=function(a){var d=a.tbsCertificate||c.getTBSCertificate(a);return b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[d,b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.signatureOid).getBytes()),q(a.signatureOid,a.signatureParameters)]),b.create(b.Class.UNIVERSAL,b.Type.BITSTRING,!1,"\0"+a.signature)])},c.certificateExtensionsToAsn1=function(a){var d=b.create(b.Class.CONTEXT_SPECIFIC,3,!0,[]),e=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[]);d.value.push(e);for(var f=0;f<a.length;++f)e.value.push(c.certificateExtensionToAsn1(a[f]));return d},c.certificateExtensionToAsn1=function(a){var c=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[]);c.value.push(b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.id).getBytes())),a.critical&&c.value.push(b.create(b.Class.UNIVERSAL,b.Type.BOOLEAN,!1,String.fromCharCode(255)));var d=a.value;return"string"!=typeof a.value&&(d=b.toDer(d).getBytes()),c.value.push(b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,d)),c},c.certificationRequestToAsn1=function(a){var d=a.certificationRequestInfo||c.getCertificationRequestInfo(a);return b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[d,b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.signatureOid).getBytes()),q(a.signatureOid,a.signatureParameters)]),b.create(b.Class.UNIVERSAL,b.Type.BITSTRING,!1,"\0"+a.signature)])},c.createCaStore=function(a){var d={certs:{}};function e(a){return f(a),d.certs[a.hash]||null}function f(a){if(!a.hash){var b=cz.md.sha1.create();a.attributes=c.RDNAttributesAsArray(n(a),b),a.hash=b.digest().toHex()}}if(d.getIssuer=function(a){return e(a.issuer)},d.addCertificate=function(a){if("string"==typeof a&&(a=cz.pki.certificateFromPem(a)),f(a.subject),!d.hasCertificate(a))if(a.subject.hash in d.certs){var b=d.certs[a.subject.hash];cz.util.isArray(b)||(b=[b]),b.push(a),d.certs[a.subject.hash]=b}else d.certs[a.subject.hash]=a},d.hasCertificate=function(a){"string"==typeof a&&(a=cz.pki.certificateFromPem(a));var d=e(a.subject);if(!d)return!1;cz.util.isArray(d)||(d=[d]);for(var f=b.toDer(c.certificateToAsn1(a)).getBytes(),g=0;g<d.length;++g)if(f===b.toDer(c.certificateToAsn1(d[g])).getBytes())return!0;return!1},d.listAllCertificates=function(){var a=[];for(var b in d.certs)if(d.certs.hasOwnProperty(b)){var c=d.certs[b];if(cz.util.isArray(c))for(var e=0;e<c.length;++e)a.push(c[e]);else a.push(c)}return a},d.removeCertificate=function(a){if("string"==typeof a&&(a=cz.pki.certificateFromPem(a)),f(a.subject),!d.hasCertificate(a))return null;var g,h=e(a.subject);if(!cz.util.isArray(h))return g=d.certs[a.subject.hash],delete d.certs[a.subject.hash],g;for(var i=b.toDer(c.certificateToAsn1(a)).getBytes(),j=0;j<h.length;++j)i===b.toDer(c.certificateToAsn1(h[j])).getBytes()&&(g=h[j],h.splice(j,1));return 0===h.length&&delete d.certs[a.subject.hash],g},a)for(var g=0;g<a.length;++g)d.addCertificate(a[g]);return d},c.certificateError={bad_certificate:"forge.pki.BadCertificate",unsupported_certificate:"forge.pki.UnsupportedCertificate",certificate_revoked:"forge.pki.CertificateRevoked",certificate_expired:"forge.pki.CertificateExpired",certificate_unknown:"forge.pki.CertificateUnknown",unknown_ca:"forge.pki.UnknownCertificateAuthority"},c.verifyCertificateChain=function(a,b,d){"function"==typeof d&&(d={verify:d}),d=d||{};var e=(b=b.slice(0)).slice(0),f=d.validityCheckDate;void 0===f&&(f=new Date);var g=!0,h=null,i=0;do{var j=b.shift(),k=null,l=!1;if(f&&(f<j.validity.notBefore||f>j.validity.notAfter)&&(h={message:"Certificate is not valid yet or has expired.",error:c.certificateError.certificate_expired,notBefore:j.validity.notBefore,notAfter:j.validity.notAfter,now:f}),null===h){if(null===(k=b[0]||a.getIssuer(j))&&j.isIssuer(j)&&(l=!0,k=j),k){var m=k;cz.util.isArray(m)||(m=[m]);for(var n=!1;!n&&m.length>0;){k=m.shift();try{n=k.verify(j)}catch(a){}}n||(h={message:"Certificate signature is invalid.",error:c.certificateError.bad_certificate})}null!==h||k&&!l||a.hasCertificate(j)||(h={message:"Certificate is not trusted.",error:c.certificateError.unknown_ca})}if(null===h&&k&&!j.isIssuer(k)&&(h={message:"Certificate issuer is invalid.",error:c.certificateError.bad_certificate}),null===h)for(var o={keyUsage:!0,basicConstraints:!0},p=0;null===h&&p<j.extensions.length;++p){var q=j.extensions[p];!q.critical||q.name in o||(h={message:"Certificate has an unsupported critical extension.",error:c.certificateError.unsupported_certificate})}if(null===h&&(!g||0===b.length&&(!k||l))){var r=j.getExtension("basicConstraints"),s=j.getExtension("keyUsage");null!==s&&(s.keyCertSign&&null!==r||(h={message:"Certificate keyUsage or basicConstraints conflict or indicate that the certificate is not a CA. If the certificate is the only one in the chain or isn't the first then the certificate must be a valid CA.",error:c.certificateError.bad_certificate})),null!==h||null===r||r.cA||(h={message:"Certificate basicConstraints indicates the certificate is not a CA.",error:c.certificateError.bad_certificate}),null===h&&null!==s&&"pathLenConstraint"in r&&i-1>r.pathLenConstraint&&(h={message:"Certificate basicConstraints pathLenConstraint violated.",error:c.certificateError.bad_certificate})}var t=null===h||h.error,u=d.verify?d.verify(t,i,e):t;if(!0!==u)throw!0===t&&(h={message:"The application rejected the certificate.",error:c.certificateError.bad_certificate}),(u||0===u)&&("object"!=typeof u||cz.util.isArray(u)?"string"==typeof u&&(h.error=u):(u.message&&(h.message=u.message),u.error&&(h.error=u.error))),h;h=null,g=!1,++i}while(b.length>0)return!0}}),cB(function(a){var b=cz.asn1,c=cz.pki,d=a.exports=cz.pkcs12=cz.pkcs12||{},e={name:"ContentInfo",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"ContentInfo.contentType",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"contentType"},{name:"ContentInfo.content",tagClass:b.Class.CONTEXT_SPECIFIC,constructed:!0,captureAsn1:"content"}]},f={name:"PFX",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"PFX.version",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,capture:"version"},e,{name:"PFX.macData",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,optional:!0,captureAsn1:"mac",value:[{name:"PFX.macData.mac",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"PFX.macData.mac.digestAlgorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"PFX.macData.mac.digestAlgorithm.algorithm",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"macAlgorithm"},{name:"PFX.macData.mac.digestAlgorithm.parameters",tagClass:b.Class.UNIVERSAL,captureAsn1:"macAlgorithmParameters"}]},{name:"PFX.macData.mac.digest",tagClass:b.Class.UNIVERSAL,type:b.Type.OCTETSTRING,constructed:!1,capture:"macDigest"}]},{name:"PFX.macData.macSalt",tagClass:b.Class.UNIVERSAL,type:b.Type.OCTETSTRING,constructed:!1,capture:"macSalt"},{name:"PFX.macData.iterations",tagClass:b.Class.UNIVERSAL,type:b.Type.INTEGER,constructed:!1,optional:!0,capture:"macIterations"}]}]},g={name:"SafeBag",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"SafeBag.bagId",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"bagId"},{name:"SafeBag.bagValue",tagClass:b.Class.CONTEXT_SPECIFIC,constructed:!0,captureAsn1:"bagValue"},{name:"SafeBag.bagAttributes",tagClass:b.Class.UNIVERSAL,type:b.Type.SET,constructed:!0,optional:!0,capture:"bagAttributes"}]},h={name:"Attribute",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"Attribute.attrId",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"oid"},{name:"Attribute.attrValues",tagClass:b.Class.UNIVERSAL,type:b.Type.SET,constructed:!0,capture:"values"}]},i={name:"CertBag",tagClass:b.Class.UNIVERSAL,type:b.Type.SEQUENCE,constructed:!0,value:[{name:"CertBag.certId",tagClass:b.Class.UNIVERSAL,type:b.Type.OID,constructed:!1,capture:"certId"},{name:"CertBag.certValue",tagClass:b.Class.CONTEXT_SPECIFIC,constructed:!0,value:[{name:"CertBag.certValue[0]",tagClass:b.Class.UNIVERSAL,type:b.Class.OCTETSTRING,constructed:!1,capture:"cert"}]}]};function j(a,b,c,d){for(var e=[],f=0;f<a.length;f++)for(var g=0;g<a[f].safeBags.length;g++){var h=a[f].safeBags[g];void 0!==d&&h.type!==d||(null!==b?void 0!==h.attributes[b]&&h.attributes[b].indexOf(c)>=0&&e.push(h):e.push(h))}return e}function k(a){if(a.composed||a.constructed){for(var b=cz.util.createBuffer(),c=0;c<a.value.length;++c)b.putBytes(a.value[c].value);a.composed=a.constructed=!1,a.value=b.getBytes()}return a}d.pkcs12FromAsn1=function(a,l,m){"string"==typeof l?(m=l,l=!0):void 0===l&&(l=!0);var n={};if(!b.validate(a,f,n,[]))throw(o=Error("Cannot read PKCS#12 PFX. ASN.1 object is not an PKCS#12 PFX.")).errors=o,o;var o,p={version:n.version.charCodeAt(0),safeContents:[],getBags:function(a){var b,c={};return"localKeyId"in a?b=a.localKeyId:"localKeyIdHex"in a&&(b=cz.util.hexToBytes(a.localKeyIdHex)),void 0===b&&!("friendlyName"in a)&&"bagType"in a&&(c[a.bagType]=j(p.safeContents,null,null,a.bagType)),void 0!==b&&(c.localKeyId=j(p.safeContents,"localKeyId",b,a.bagType)),"friendlyName"in a&&(c.friendlyName=j(p.safeContents,"friendlyName",a.friendlyName,a.bagType)),c},getBagsByFriendlyName:function(a,b){return j(p.safeContents,"friendlyName",a,b)},getBagsByLocalKeyId:function(a,b){return j(p.safeContents,"localKeyId",a,b)}};if(3!==n.version.charCodeAt(0))throw(o=Error("PKCS#12 PFX of version other than 3 not supported.")).version=n.version.charCodeAt(0),o;if(b.derToOid(n.contentType)!==c.oids.data)throw(o=Error("Only PKCS#12 PFX in password integrity mode supported.")).oid=b.derToOid(n.contentType),o;var q=n.content.value[0];if(q.tagClass!==b.Class.UNIVERSAL||q.type!==b.Type.OCTETSTRING)throw Error("PKCS#12 authSafe content data is not an OCTET STRING.");if(q=k(q),n.mac){var r=null,s=0,t=b.derToOid(n.macAlgorithm);switch(t){case c.oids.sha1:r=cz.md.sha1.create(),s=20;break;case c.oids.sha256:r=cz.md.sha256.create(),s=32;break;case c.oids.sha384:r=cz.md.sha384.create(),s=48;break;case c.oids.sha512:r=cz.md.sha512.create(),s=64;break;case c.oids.md5:r=cz.md.md5.create(),s=16}if(null===r)throw Error("PKCS#12 uses unsupported MAC algorithm: "+t);var u=new cz.util.ByteBuffer(n.macSalt),v="macIterations"in n?parseInt(cz.util.bytesToHex(n.macIterations),16):1,w=d.generateKey(m,u,3,v,s,r),x=cz.hmac.create();if(x.start(r,w),x.update(q.value),x.getMac().getBytes()!==n.macDigest)throw Error("PKCS#12 MAC could not be verified. Invalid password?")}return function(a,d,f,j){if((d=b.fromDer(d,f)).tagClass!==b.Class.UNIVERSAL||d.type!==b.Type.SEQUENCE||!0!==d.constructed)throw Error("PKCS#12 AuthenticatedSafe expected to be a SEQUENCE OF ContentInfo");for(var l=0;l<d.value.length;l++){var m,n={},o=[];if(!b.validate(d.value[l],e,n,o))throw(m=Error("Cannot read ContentInfo.")).errors=o,m;var p={encrypted:!1},q=null,r=n.content.value[0];switch(b.derToOid(n.contentType)){case c.oids.data:if(r.tagClass!==b.Class.UNIVERSAL||r.type!==b.Type.OCTETSTRING)throw Error("PKCS#12 SafeContents Data is not an OCTET STRING.");q=k(r).value;break;case c.oids.encryptedData:q=function(a,d){var e={},f=[];if(!b.validate(a,cz.pkcs7.asn1.encryptedDataValidator,e,f))throw(g=Error("Cannot read EncryptedContentInfo.")).errors=f,g;var g,h=b.derToOid(e.contentType);if(h!==c.oids.data)throw(g=Error("PKCS#12 EncryptedContentInfo ContentType is not Data.")).oid=h,g;h=b.derToOid(e.encAlgorithm);var i=c.pbe.getCipher(h,e.encParameter,d),j=k(e.encryptedContentAsn1),l=cz.util.createBuffer(j.value);if(i.update(l),!i.finish())throw Error("Failed to decrypt PKCS#12 SafeContents.");return i.output.getBytes()}(r,j),p.encrypted=!0;break;default:throw(m=Error("Unsupported PKCS#12 contentType.")).contentType=b.derToOid(n.contentType),m}p.safeBags=function(a,d,e){if(!d&&0===a.length)return[];if((a=b.fromDer(a,d)).tagClass!==b.Class.UNIVERSAL||a.type!==b.Type.SEQUENCE||!0!==a.constructed)throw Error("PKCS#12 SafeContents expected to be a SEQUENCE OF SafeBag.");for(var f=[],j=0;j<a.value.length;j++){var k,l={},m=[];if(!b.validate(a.value[j],g,l,m))throw(k=Error("Cannot read SafeBag.")).errors=m,k;var n,o,p={type:b.derToOid(l.bagId),attributes:function(a){var d={};if(void 0!==a)for(var e=0;e<a.length;++e){var f={},g=[];if(!b.validate(a[e],h,f,g)){var i=Error("Cannot read PKCS#12 BagAttribute.");throw i.errors=g,i}var j=b.derToOid(f.oid);if(void 0!==c.oids[j]){d[c.oids[j]]=[];for(var k=0;k<f.values.length;++k)d[c.oids[j]].push(f.values[k].value)}}return d}(l.bagAttributes)};f.push(p);var q=l.bagValue.value[0];switch(p.type){case c.oids.pkcs8ShroudedKeyBag:if(null===(q=c.decryptPrivateKeyInfo(q,e)))throw Error("Unable to decrypt PKCS#8 ShroudedKeyBag, wrong password?");case c.oids.keyBag:try{p.key=c.privateKeyFromAsn1(q)}catch(a){p.key=null,p.asn1=q}continue;case c.oids.certBag:n=i,o=function(){if(b.derToOid(l.certId)!==c.oids.x509Certificate){var a=Error("Unsupported certificate type, only X.509 supported.");throw a.oid=b.derToOid(l.certId),a}var e=b.fromDer(l.cert,d);try{p.cert=c.certificateFromAsn1(e,!0)}catch(a){p.cert=null,p.asn1=e}};break;default:throw(k=Error("Unsupported PKCS#12 SafeBag type.")).oid=p.type,k}if(void 0!==n&&!b.validate(q,n,l,m))throw(k=Error("Cannot read PKCS#12 "+n.name)).errors=m,k;o()}return f}(q,f,j),a.safeContents.push(p)}}(p,q.value,l,m),p},d.toPkcs12Asn1=function(a,e,f,g){(g=g||{}).saltSize=g.saltSize||8,g.count=g.count||2048,g.algorithm=g.algorithm||g.encAlgorithm||"aes128","useMac"in g||(g.useMac=!0),"localKeyId"in g||(g.localKeyId=null),"generateLocalKeyId"in g||(g.generateLocalKeyId=!0);var h,i=g.localKeyId;if(null!==i)i=cz.util.hexToBytes(i);else if(g.generateLocalKeyId)if(e){var j=cz.util.isArray(e)?e[0]:e;"string"==typeof j&&(j=c.certificateFromPem(j)),(A=cz.md.sha1.create()).update(b.toDer(c.certificateToAsn1(j)).getBytes()),i=A.digest().getBytes()}else i=cz.random.getBytes(20);var k=[];null!==i&&k.push(b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.localKeyId).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SET,!0,[b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,i)])])),"friendlyName"in g&&k.push(b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.friendlyName).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SET,!0,[b.create(b.Class.UNIVERSAL,b.Type.BMPSTRING,!1,g.friendlyName)])])),k.length>0&&(h=b.create(b.Class.UNIVERSAL,b.Type.SET,!0,k));var l=[],m=[];null!==e&&(m=cz.util.isArray(e)?e:[e]);for(var n=[],o=0;o<m.length;++o){"string"==typeof(e=m[o])&&(e=c.certificateFromPem(e));var p=0===o?h:void 0,q=c.certificateToAsn1(e),r=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.certBag).getBytes()),b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.x509Certificate).getBytes()),b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,b.toDer(q).getBytes())])])]),p]);n.push(r)}if(n.length>0){var s=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,n),t=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.data).getBytes()),b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,b.toDer(s).getBytes())])]);l.push(t)}var u=null;if(null!==a){var v=c.wrapRsaPrivateKey(c.privateKeyToAsn1(a));u=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,null===f?[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.keyBag).getBytes()),b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[v]),h]:[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.pkcs8ShroudedKeyBag).getBytes()),b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[c.encryptPrivateKeyInfo(v,f,g)]),h]);var w=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[u]),x=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.data).getBytes()),b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,b.toDer(w).getBytes())])]);l.push(x)}var y,z=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,l);if(g.useMac){var A=cz.md.sha1.create(),B=new cz.util.ByteBuffer(cz.random.getBytes(g.saltSize)),C=g.count,D=(a=d.generateKey(f,B,3,C,20),cz.hmac.create());D.start(A,a),D.update(b.toDer(z).getBytes());var E=D.getMac();y=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.sha1).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.NULL,!1,"")]),b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,E.getBytes())]),b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,B.getBytes()),b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer(C).getBytes())])}return b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer(3).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.oids.data).getBytes()),b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,b.toDer(z).getBytes())])]),y])},d.generateKey=cz.pbe.generatePkcs12Key}),cB(function(a){var b=cz.asn1,c=a.exports=cz.pki=cz.pki||{};c.pemToDer=function(a){var b=cz.pem.decode(a)[0];if(b.procType&&"ENCRYPTED"===b.procType.type)throw Error("Could not convert PEM to DER; PEM is encrypted.");return cz.util.createBuffer(b.body)},c.privateKeyFromPem=function(a){var d=cz.pem.decode(a)[0];if("PRIVATE KEY"!==d.type&&"RSA PRIVATE KEY"!==d.type){var e=Error('Could not convert private key from PEM; PEM header type is not "PRIVATE KEY" or "RSA PRIVATE KEY".');throw e.headerType=d.type,e}if(d.procType&&"ENCRYPTED"===d.procType.type)throw Error("Could not convert private key from PEM; PEM is encrypted.");var f=b.fromDer(d.body);return c.privateKeyFromAsn1(f)},c.privateKeyToPem=function(a,d){var e={type:"RSA PRIVATE KEY",body:b.toDer(c.privateKeyToAsn1(a)).getBytes()};return cz.pem.encode(e,{maxline:d})},c.privateKeyInfoToPem=function(a,c){var d={type:"PRIVATE KEY",body:b.toDer(a).getBytes()};return cz.pem.encode(d,{maxline:c})}});var d_=function(a,b,c,d){var e=cz.util.createBuffer(),f=a.length>>1,g=f+(1&a.length),h=a.substr(0,g),i=a.substr(f,g),j=cz.util.createBuffer(),k=cz.hmac.create();c=b+c;var l=Math.ceil(d/16),m=Math.ceil(d/20);k.start("MD5",h);var n=cz.util.createBuffer();j.putBytes(c);for(var o=0;o<l;++o)k.start(null,null),k.update(j.getBytes()),j.putBuffer(k.digest()),k.start(null,null),k.update(j.bytes()+c),n.putBuffer(k.digest());k.start("SHA1",i);var p=cz.util.createBuffer();for(j.clear(),j.putBytes(c),o=0;o<m;++o)k.start(null,null),k.update(j.getBytes()),j.putBuffer(k.digest()),k.start(null,null),k.update(j.bytes()+c),p.putBuffer(k.digest());return e.putBytes(cz.util.xorBytes(n.getBytes(),p.getBytes(),d)),e},d0=function(a,b,c){var d=!1;try{var e=a.deflate(b.fragment.getBytes());b.fragment=cz.util.createBuffer(e),b.length=e.length,d=!0}catch(a){}return d},d1=function(a,b,c){var d=!1;try{var e=a.inflate(b.fragment.getBytes());b.fragment=cz.util.createBuffer(e),b.length=e.length,d=!0}catch(a){}return d},d2=function(a,b){var c=0;switch(b){case 1:c=a.getByte();break;case 2:c=a.getInt16();break;case 3:c=a.getInt24();break;case 4:c=a.getInt32()}return cz.util.createBuffer(a.getBytes(c))},d3=function(a,b,c){a.putInt(c.length(),b<<3),a.putBuffer(c)},d4={Versions:{TLS_1_0:{major:3,minor:1},TLS_1_1:{major:3,minor:2},TLS_1_2:{major:3,minor:3}}};d4.SupportedVersions=[d4.Versions.TLS_1_1,d4.Versions.TLS_1_0],d4.Version=d4.SupportedVersions[0],d4.MaxFragment=15360,d4.ConnectionEnd={server:0,client:1},d4.PRFAlgorithm={tls_prf_sha256:0},d4.BulkCipherAlgorithm={none:null,rc4:0,des3:1,aes:2},d4.CipherType={stream:0,block:1,aead:2},d4.MACAlgorithm={none:null,hmac_md5:0,hmac_sha1:1,hmac_sha256:2,hmac_sha384:3,hmac_sha512:4},d4.CompressionMethod={none:0,deflate:1},d4.ContentType={change_cipher_spec:20,alert:21,handshake:22,application_data:23,heartbeat:24},d4.HandshakeType={hello_request:0,client_hello:1,server_hello:2,certificate:11,server_key_exchange:12,certificate_request:13,server_hello_done:14,certificate_verify:15,client_key_exchange:16,finished:20},d4.Alert={},d4.Alert.Level={warning:1,fatal:2},d4.Alert.Description={close_notify:0,unexpected_message:10,bad_record_mac:20,decryption_failed:21,record_overflow:22,decompression_failure:30,handshake_failure:40,bad_certificate:42,unsupported_certificate:43,certificate_revoked:44,certificate_expired:45,certificate_unknown:46,illegal_parameter:47,unknown_ca:48,access_denied:49,decode_error:50,decrypt_error:51,export_restriction:60,protocol_version:70,insufficient_security:71,internal_error:80,user_canceled:90,no_renegotiation:100},d4.HeartbeatMessageType={heartbeat_request:1,heartbeat_response:2},d4.CipherSuites={},d4.getCipherSuite=function(a){var b=null;for(var c in d4.CipherSuites){var d=d4.CipherSuites[c];if(d.id[0]===a.charCodeAt(0)&&d.id[1]===a.charCodeAt(1)){b=d;break}}return b},d4.handleUnexpected=function(a,b){(a.open||a.entity!==d4.ConnectionEnd.client)&&a.error(a,{message:"Unexpected message. Received TLS record out of order.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.unexpected_message}})},d4.handleHelloRequest=function(a,b,c){!a.handshaking&&a.handshakes>0&&(d4.queue(a,d4.createAlert(a,{level:d4.Alert.Level.warning,description:d4.Alert.Description.no_renegotiation})),d4.flush(a)),a.process()},d4.parseHelloMessage=function(a,b,c){var d=null,e=a.entity===d4.ConnectionEnd.client;if(c<38)a.error(a,{message:e?"Invalid ServerHello message. Message too short.":"Invalid ClientHello message. Message too short.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.illegal_parameter}});else{var f=b.fragment,g=f.length();if(d={version:{major:f.getByte(),minor:f.getByte()},random:cz.util.createBuffer(f.getBytes(32)),session_id:d2(f,1),extensions:[]},e?(d.cipher_suite=f.getBytes(2),d.compression_method=f.getByte()):(d.cipher_suites=d2(f,2),d.compression_methods=d2(f,1)),(g=c-(g-f.length()))>0){for(var h=d2(f,2);h.length()>0;)d.extensions.push({type:[h.getByte(),h.getByte()],data:d2(h,2)});if(!e)for(var i=0;i<d.extensions.length;++i){var j=d.extensions[i];if(0===j.type[0]&&0===j.type[1])for(var k=d2(j.data,2);k.length()>0&&0===k.getByte();)a.session.extensions.server_name.serverNameList.push(d2(k,2).getBytes())}}if(a.session.version&&(d.version.major!==a.session.version.major||d.version.minor!==a.session.version.minor))return a.error(a,{message:"TLS version change is disallowed during renegotiation.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.protocol_version}});if(e)a.session.cipherSuite=d4.getCipherSuite(d.cipher_suite);else for(var l=cz.util.createBuffer(d.cipher_suites.bytes());l.length()>0&&(a.session.cipherSuite=d4.getCipherSuite(l.getBytes(2)),null===a.session.cipherSuite););if(null===a.session.cipherSuite)return a.error(a,{message:"No cipher suites in common.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.handshake_failure},cipherSuite:cz.util.bytesToHex(d.cipher_suite)});a.session.compressionMethod=e?d.compression_method:d4.CompressionMethod.none}return d},d4.createSecurityParameters=function(a,b){var c=a.entity===d4.ConnectionEnd.client,d=b.random.bytes(),e=c?a.session.sp.client_random:d,f=c?d:d4.createRandom().getBytes();a.session.sp={entity:a.entity,prf_algorithm:d4.PRFAlgorithm.tls_prf_sha256,bulk_cipher_algorithm:null,cipher_type:null,enc_key_length:null,block_length:null,fixed_iv_length:null,record_iv_length:null,mac_algorithm:null,mac_length:null,mac_key_length:null,compression_algorithm:a.session.compressionMethod,pre_master_secret:null,master_secret:null,client_random:e,server_random:f}},d4.handleServerHello=function(a,b,c){var d=d4.parseHelloMessage(a,b,c);if(!a.fail){if(!(d.version.minor<=a.version.minor))return a.error(a,{message:"Incompatible TLS version.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.protocol_version}});a.version.minor=d.version.minor,a.session.version=a.version;var e=d.session_id.bytes();e.length>0&&e===a.session.id?(a.expect=d9,a.session.resuming=!0,a.session.sp.server_random=d.random.bytes()):(a.expect=d5,a.session.resuming=!1,d4.createSecurityParameters(a,d)),a.session.id=e,a.process()}},d4.handleClientHello=function(a,b,c){var d=d4.parseHelloMessage(a,b,c);if(!a.fail){var e=d.session_id.bytes(),f=null;if(a.sessionCache&&(null===(f=a.sessionCache.getSession(e))?e="":(f.version.major!==d.version.major||f.version.minor>d.version.minor)&&(f=null,e="")),0===e.length&&(e=cz.random.getBytes(32)),a.session.id=e,a.session.clientHelloVersion=d.version,a.session.sp={},f)a.version=a.session.version=f.version,a.session.sp=f.sp;else{for(var g,h=1;h<d4.SupportedVersions.length&&!((g=d4.SupportedVersions[h]).minor<=d.version.minor);++h);a.version={major:g.major,minor:g.minor},a.session.version=a.version}null!==f?(a.expect=eg,a.session.resuming=!0,a.session.sp.client_random=d.random.bytes()):(a.expect=!1!==a.verifyClient?ed:ee,a.session.resuming=!1,d4.createSecurityParameters(a,d)),a.open=!0,d4.queue(a,d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createServerHello(a)})),a.session.resuming?(d4.queue(a,d4.createRecord(a,{type:d4.ContentType.change_cipher_spec,data:d4.createChangeCipherSpec()})),a.state.pending=d4.createConnectionState(a),a.state.current.write=a.state.pending.write,d4.queue(a,d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createFinished(a)}))):(d4.queue(a,d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createCertificate(a)})),a.fail||(d4.queue(a,d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createServerKeyExchange(a)})),!1!==a.verifyClient&&d4.queue(a,d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createCertificateRequest(a)})),d4.queue(a,d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createServerHelloDone(a)})))),d4.flush(a),a.process()}},d4.handleCertificate=function(a,b,c){if(c<3)return a.error(a,{message:"Invalid Certificate message. Message too short.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.illegal_parameter}});var d,e,f={certificate_list:d2(b.fragment,3)},g=[];try{for(;f.certificate_list.length()>0;)d=d2(f.certificate_list,3),e=cz.asn1.fromDer(d),d=cz.pki.certificateFromAsn1(e,!0),g.push(d)}catch(b){return a.error(a,{message:"Could not parse certificate list.",cause:b,send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.bad_certificate}})}var h=a.entity===d4.ConnectionEnd.client;(h||!0===a.verifyClient)&&0===g.length?a.error(a,{message:h?"No server certificate provided.":"No client certificate provided.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.illegal_parameter}}):0===g.length?a.expect=h?d6:ee:(h?a.session.serverCertificate=g[0]:a.session.clientCertificate=g[0],d4.verifyCertificateChain(a,g)&&(a.expect=h?d6:ee)),a.process()},d4.handleServerKeyExchange=function(a,b,c){if(c>0)return a.error(a,{message:"Invalid key parameters. Only RSA is supported.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.unsupported_certificate}});a.expect=d7,a.process()},d4.handleClientKeyExchange=function(a,b,c){if(c<48)return a.error(a,{message:"Invalid key parameters. Only RSA is supported.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.unsupported_certificate}});var d={enc_pre_master_secret:d2(b.fragment,2).getBytes()},e=null;if(a.getPrivateKey)try{e=a.getPrivateKey(a,a.session.serverCertificate),e=cz.pki.privateKeyFromPem(e)}catch(b){a.error(a,{message:"Could not get private key.",cause:b,send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.internal_error}})}if(null===e)return a.error(a,{message:"No private key set.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.internal_error}});try{var f=a.session.sp;f.pre_master_secret=e.decrypt(d.enc_pre_master_secret);var g=a.session.clientHelloVersion;if(g.major!==f.pre_master_secret.charCodeAt(0)||g.minor!==f.pre_master_secret.charCodeAt(1))throw Error("TLS version rollback attack detected.")}catch(a){f.pre_master_secret=cz.random.getBytes(48)}a.expect=eg,null!==a.session.clientCertificate&&(a.expect=ef),a.process()},d4.handleCertificateRequest=function(a,b,c){if(c<3)return a.error(a,{message:"Invalid CertificateRequest. Message too short.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.illegal_parameter}});var d=b.fragment,e={certificate_types:d2(d,1),certificate_authorities:d2(d,2)};a.session.certificateRequest=e,a.expect=d8,a.process()},d4.handleCertificateVerify=function(a,b,c){if(c<2)return a.error(a,{message:"Invalid CertificateVerify. Message too short.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.illegal_parameter}});var d=b.fragment;d.read-=4;var e=d.bytes();d.read+=4;var f={signature:d2(d,2).getBytes()},g=cz.util.createBuffer();g.putBuffer(a.session.md5.digest()),g.putBuffer(a.session.sha1.digest()),g=g.getBytes();try{if(!a.session.clientCertificate.publicKey.verify(g,f.signature,"NONE"))throw Error("CertificateVerify signature does not match.");a.session.md5.update(e),a.session.sha1.update(e)}catch(b){return a.error(a,{message:"Bad signature in CertificateVerify.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.handshake_failure}})}a.expect=eg,a.process()},d4.handleServerHelloDone=function(a,b,c){if(c>0)return a.error(a,{message:"Invalid ServerHelloDone message. Invalid length.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.record_overflow}});if(null===a.serverCertificate){var d={message:"No server certificate provided. Not enough security.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.insufficient_security}},e=a.verify(a,d.alert.description,0,[]);if(!0!==e)return(e||0===e)&&("object"!=typeof e||cz.util.isArray(e)?"number"==typeof e&&(d.alert.description=e):(e.message&&(d.message=e.message),e.alert&&(d.alert.description=e.alert))),a.error(a,d)}null!==a.session.certificateRequest&&(b=d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createCertificate(a)}),d4.queue(a,b)),b=d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createClientKeyExchange(a)}),d4.queue(a,b),a.expect=ec;var f=function(a,b){null!==a.session.certificateRequest&&null!==a.session.clientCertificate&&d4.queue(a,d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createCertificateVerify(a,b)})),d4.queue(a,d4.createRecord(a,{type:d4.ContentType.change_cipher_spec,data:d4.createChangeCipherSpec()})),a.state.pending=d4.createConnectionState(a),a.state.current.write=a.state.pending.write,d4.queue(a,d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createFinished(a)})),a.expect=d9,d4.flush(a),a.process()};if(null===a.session.certificateRequest||null===a.session.clientCertificate)return f(a,null);d4.getClientSignature(a,f)},d4.handleChangeCipherSpec=function(a,b){if(1!==b.fragment.getByte())return a.error(a,{message:"Invalid ChangeCipherSpec message received.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.illegal_parameter}});var c=a.entity===d4.ConnectionEnd.client;(a.session.resuming&&c||!a.session.resuming&&!c)&&(a.state.pending=d4.createConnectionState(a)),a.state.current.read=a.state.pending.read,(!a.session.resuming&&c||a.session.resuming&&!c)&&(a.state.pending=null),a.expect=c?ea:eh,a.process()},d4.handleFinished=function(a,b,c){var d=b.fragment;d.read-=4;var e=d.bytes();d.read+=4;var f=b.fragment.getBytes();(d=cz.util.createBuffer()).putBuffer(a.session.md5.digest()),d.putBuffer(a.session.sha1.digest());var g=a.entity===d4.ConnectionEnd.client;if((d=d_(a.session.sp.master_secret,g?"server finished":"client finished",d.getBytes(),12)).getBytes()!==f)return a.error(a,{message:"Invalid verify_data in Finished message.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.decrypt_error}});a.session.md5.update(e),a.session.sha1.update(e),(a.session.resuming&&g||!a.session.resuming&&!g)&&(d4.queue(a,d4.createRecord(a,{type:d4.ContentType.change_cipher_spec,data:d4.createChangeCipherSpec()})),a.state.current.write=a.state.pending.write,a.state.pending=null,d4.queue(a,d4.createRecord(a,{type:d4.ContentType.handshake,data:d4.createFinished(a)}))),a.expect=g?eb:ei,a.handshaking=!1,++a.handshakes,a.peerCertificate=g?a.session.serverCertificate:a.session.clientCertificate,d4.flush(a),a.isConnected=!0,a.connected(a),a.process()},d4.handleAlert=function(a,b){var c,d=b.fragment,e={level:d.getByte(),description:d.getByte()};switch(e.description){case d4.Alert.Description.close_notify:c="Connection closed.";break;case d4.Alert.Description.unexpected_message:c="Unexpected message.";break;case d4.Alert.Description.bad_record_mac:c="Bad record MAC.";break;case d4.Alert.Description.decryption_failed:c="Decryption failed.";break;case d4.Alert.Description.record_overflow:c="Record overflow.";break;case d4.Alert.Description.decompression_failure:c="Decompression failed.";break;case d4.Alert.Description.handshake_failure:c="Handshake failure.";break;case d4.Alert.Description.bad_certificate:c="Bad certificate.";break;case d4.Alert.Description.unsupported_certificate:c="Unsupported certificate.";break;case d4.Alert.Description.certificate_revoked:c="Certificate revoked.";break;case d4.Alert.Description.certificate_expired:c="Certificate expired.";break;case d4.Alert.Description.certificate_unknown:c="Certificate unknown.";break;case d4.Alert.Description.illegal_parameter:c="Illegal parameter.";break;case d4.Alert.Description.unknown_ca:c="Unknown certificate authority.";break;case d4.Alert.Description.access_denied:c="Access denied.";break;case d4.Alert.Description.decode_error:c="Decode error.";break;case d4.Alert.Description.decrypt_error:c="Decrypt error.";break;case d4.Alert.Description.export_restriction:c="Export restriction.";break;case d4.Alert.Description.protocol_version:c="Unsupported protocol version.";break;case d4.Alert.Description.insufficient_security:c="Insufficient security.";break;case d4.Alert.Description.internal_error:c="Internal error.";break;case d4.Alert.Description.user_canceled:c="User canceled.";break;case d4.Alert.Description.no_renegotiation:c="Renegotiation not supported.";break;default:c="Unknown error."}if(e.description===d4.Alert.Description.close_notify)return a.close();a.error(a,{message:c,send:!1,origin:a.entity===d4.ConnectionEnd.client?"server":"client",alert:e}),a.process()},d4.handleHandshake=function(a,b){var c=b.fragment,d=c.getByte(),e=c.getInt24();if(e>c.length())return a.fragmented=b,b.fragment=cz.util.createBuffer(),c.read-=4,a.process();a.fragmented=null,c.read-=4;var f=c.bytes(e+4);c.read+=4,d in ew[a.entity][a.expect]?(a.entity!==d4.ConnectionEnd.server||a.open||a.fail||(a.handshaking=!0,a.session={version:null,extensions:{server_name:{serverNameList:[]}},cipherSuite:null,compressionMethod:null,serverCertificate:null,clientCertificate:null,md5:cz.md.md5.create(),sha1:cz.md.sha1.create()}),d!==d4.HandshakeType.hello_request&&d!==d4.HandshakeType.certificate_verify&&d!==d4.HandshakeType.finished&&(a.session.md5.update(f),a.session.sha1.update(f)),ew[a.entity][a.expect][d](a,b,e)):d4.handleUnexpected(a,b)},d4.handleApplicationData=function(a,b){a.data.putBuffer(b.fragment),a.dataReady(a),a.process()},d4.handleHeartbeat=function(a,b){var c=b.fragment,d=c.getByte(),e=c.getInt16(),f=c.getBytes(e);if(d===d4.HeartbeatMessageType.heartbeat_request){if(a.handshaking||e>f.length)return a.process();d4.queue(a,d4.createRecord(a,{type:d4.ContentType.heartbeat,data:d4.createHeartbeat(d4.HeartbeatMessageType.heartbeat_response,f)})),d4.flush(a)}else if(d===d4.HeartbeatMessageType.heartbeat_response){if(f!==a.expectedHeartbeatPayload)return a.process();a.heartbeatReceived&&a.heartbeatReceived(a,cz.util.createBuffer(f))}a.process()};var d5=1,d6=2,d7=3,d8=4,d9=5,ea=6,eb=7,ec=8,ed=1,ee=2,ef=3,eg=4,eh=5,ei=6,ej=d4.handleUnexpected,ek=d4.handleChangeCipherSpec,el=d4.handleAlert,em=d4.handleHandshake,en=d4.handleApplicationData,eo=d4.handleHeartbeat,ep=[];ep[d4.ConnectionEnd.client]=[[ej,el,em,ej,eo],[ej,el,em,ej,eo],[ej,el,em,ej,eo],[ej,el,em,ej,eo],[ej,el,em,ej,eo],[ek,el,ej,ej,eo],[ej,el,em,ej,eo],[ej,el,em,en,eo],[ej,el,em,ej,eo]],ep[d4.ConnectionEnd.server]=[[ej,el,em,ej,eo],[ej,el,em,ej,eo],[ej,el,em,ej,eo],[ej,el,em,ej,eo],[ek,el,ej,ej,eo],[ej,el,em,ej,eo],[ej,el,em,en,eo],[ej,el,em,ej,eo]];var eq=d4.handleHelloRequest,er=d4.handleCertificate,es=d4.handleServerKeyExchange,et=d4.handleCertificateRequest,eu=d4.handleServerHelloDone,ev=d4.handleFinished,ew=[];ew[d4.ConnectionEnd.client]=[[ej,ej,d4.handleServerHello,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej],[eq,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,er,es,et,eu,ej,ej,ej,ej,ej,ej],[eq,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,es,et,eu,ej,ej,ej,ej,ej,ej],[eq,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,et,eu,ej,ej,ej,ej,ej,ej],[eq,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,eu,ej,ej,ej,ej,ej,ej],[eq,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej],[eq,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ev],[eq,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej],[eq,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej]],ew[d4.ConnectionEnd.server]=[[ej,d4.handleClientHello,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej],[ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,er,ej,ej,ej,ej,ej,ej,ej,ej,ej],[ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,d4.handleClientKeyExchange,ej,ej,ej,ej],[ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,d4.handleCertificateVerify,ej,ej,ej,ej,ej],[ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej],[ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ev],[ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej],[ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej,ej]],d4.generateKeys=function(a,b){var c=b.client_random+b.server_random;a.session.resuming||(b.master_secret=d_(b.pre_master_secret,"master secret",c,48).bytes(),b.pre_master_secret=null);var d=2*b.mac_key_length+2*b.enc_key_length,e=a.version.major===d4.Versions.TLS_1_0.major&&a.version.minor===d4.Versions.TLS_1_0.minor;e&&(d+=2*b.fixed_iv_length);var f=d_(b.master_secret,"key expansion",c=b.server_random+b.client_random,d),g={client_write_MAC_key:f.getBytes(b.mac_key_length),server_write_MAC_key:f.getBytes(b.mac_key_length),client_write_key:f.getBytes(b.enc_key_length),server_write_key:f.getBytes(b.enc_key_length)};return e&&(g.client_write_IV=f.getBytes(b.fixed_iv_length),g.server_write_IV=f.getBytes(b.fixed_iv_length)),g},d4.createConnectionState=function(a){var b=a.entity===d4.ConnectionEnd.client,c=function(){var a={sequenceNumber:[0,0],macKey:null,macLength:0,macFunction:null,cipherState:null,cipherFunction:function(a){return!0},compressionState:null,compressFunction:function(a){return!0},updateSequenceNumber:function(){0xffffffff===a.sequenceNumber[1]?(a.sequenceNumber[1]=0,++a.sequenceNumber[0]):++a.sequenceNumber[1]}};return a},d={read:c(),write:c()};if(d.read.update=function(a,b){return d.read.cipherFunction(b,d.read)?d.read.compressFunction(a,b,d.read)||a.error(a,{message:"Could not decompress record.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.decompression_failure}}):a.error(a,{message:"Could not decrypt record or bad MAC.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.bad_record_mac}}),!a.fail},d.write.update=function(a,b){return d.write.compressFunction(a,b,d.write)?d.write.cipherFunction(b,d.write)||a.error(a,{message:"Could not encrypt record.",send:!1,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.internal_error}}):a.error(a,{message:"Could not compress record.",send:!1,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.internal_error}}),!a.fail},a.session){var e=a.session.sp;switch(a.session.cipherSuite.initSecurityParameters(e),e.keys=d4.generateKeys(a,e),d.read.macKey=b?e.keys.server_write_MAC_key:e.keys.client_write_MAC_key,d.write.macKey=b?e.keys.client_write_MAC_key:e.keys.server_write_MAC_key,a.session.cipherSuite.initConnectionState(d,a,e),e.compression_algorithm){case d4.CompressionMethod.none:break;case d4.CompressionMethod.deflate:d.read.compressFunction=d1,d.write.compressFunction=d0;break;default:throw Error("Unsupported compression algorithm.")}}return d},d4.createRandom=function(){var a=new Date,b=+a+6e4*a.getTimezoneOffset(),c=cz.util.createBuffer();return c.putInt32(b),c.putBytes(cz.random.getBytes(28)),c},d4.createRecord=function(a,b){return b.data?{type:b.type,version:{major:a.version.major,minor:a.version.minor},length:b.data.length(),fragment:b.data}:null},d4.createAlert=function(a,b){var c=cz.util.createBuffer();return c.putByte(b.level),c.putByte(b.description),d4.createRecord(a,{type:d4.ContentType.alert,data:c})},d4.createClientHello=function(a){a.session.clientHelloVersion={major:a.version.major,minor:a.version.minor};for(var b=cz.util.createBuffer(),c=0;c<a.cipherSuites.length;++c){var d=a.cipherSuites[c];b.putByte(d.id[0]),b.putByte(d.id[1])}var e=b.length(),f=cz.util.createBuffer();f.putByte(d4.CompressionMethod.none);var g=f.length(),h=cz.util.createBuffer();if(a.virtualHost){var i=cz.util.createBuffer();i.putByte(0),i.putByte(0);var j=cz.util.createBuffer();j.putByte(0),d3(j,2,cz.util.createBuffer(a.virtualHost));var k=cz.util.createBuffer();d3(k,2,j),d3(i,2,k),h.putBuffer(i)}var l=h.length();l>0&&(l+=2);var m=a.session.id,n=m.length+1+2+4+28+2+e+1+g+l,o=cz.util.createBuffer();return o.putByte(d4.HandshakeType.client_hello),o.putInt24(n),o.putByte(a.version.major),o.putByte(a.version.minor),o.putBytes(a.session.sp.client_random),d3(o,1,cz.util.createBuffer(m)),d3(o,2,b),d3(o,1,f),l>0&&d3(o,2,h),o},d4.createServerHello=function(a){var b=a.session.id,c=b.length+1+2+4+28+2+1,d=cz.util.createBuffer();return d.putByte(d4.HandshakeType.server_hello),d.putInt24(c),d.putByte(a.version.major),d.putByte(a.version.minor),d.putBytes(a.session.sp.server_random),d3(d,1,cz.util.createBuffer(b)),d.putByte(a.session.cipherSuite.id[0]),d.putByte(a.session.cipherSuite.id[1]),d.putByte(a.session.compressionMethod),d},d4.createCertificate=function(a){var b=a.entity===d4.ConnectionEnd.client,c=null;a.getCertificate&&(c=a.getCertificate(a,b?a.session.certificateRequest:a.session.extensions.server_name.serverNameList));var d=cz.util.createBuffer();if(null!==c)try{cz.util.isArray(c)||(c=[c]);for(var e=null,f=0;f<c.length;++f){var g=cz.pem.decode(c[f])[0];if("CERTIFICATE"!==g.type&&"X509 CERTIFICATE"!==g.type&&"TRUSTED CERTIFICATE"!==g.type){var h=Error('Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".');throw h.headerType=g.type,h}if(g.procType&&"ENCRYPTED"===g.procType.type)throw Error("Could not convert certificate from PEM; PEM is encrypted.");var i=cz.util.createBuffer(g.body);null===e&&(e=cz.asn1.fromDer(i.bytes(),!1));var j=cz.util.createBuffer();d3(j,3,i),d.putBuffer(j)}c=cz.pki.certificateFromAsn1(e),b?a.session.clientCertificate=c:a.session.serverCertificate=c}catch(b){return a.error(a,{message:"Could not send certificate list.",cause:b,send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.bad_certificate}})}var k=3+d.length(),l=cz.util.createBuffer();return l.putByte(d4.HandshakeType.certificate),l.putInt24(k),d3(l,3,d),l},d4.createClientKeyExchange=function(a){var b=cz.util.createBuffer();b.putByte(a.session.clientHelloVersion.major),b.putByte(a.session.clientHelloVersion.minor),b.putBytes(cz.random.getBytes(46));var c=a.session.sp;c.pre_master_secret=b.getBytes();var d=(b=a.session.serverCertificate.publicKey.encrypt(c.pre_master_secret)).length+2,e=cz.util.createBuffer();return e.putByte(d4.HandshakeType.client_key_exchange),e.putInt24(d),e.putInt16(b.length),e.putBytes(b),e},d4.createServerKeyExchange=function(a){return cz.util.createBuffer()},d4.getClientSignature=function(a,b){var c=cz.util.createBuffer();c.putBuffer(a.session.md5.digest()),c.putBuffer(a.session.sha1.digest()),c=c.getBytes(),a.getSignature=a.getSignature||function(a,b,c){var d=null;if(a.getPrivateKey)try{d=a.getPrivateKey(a,a.session.clientCertificate),d=cz.pki.privateKeyFromPem(d)}catch(b){a.error(a,{message:"Could not get private key.",cause:b,send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.internal_error}})}null===d?a.error(a,{message:"No private key set.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.internal_error}}):b=d.sign(b,null),c(a,b)},a.getSignature(a,c,b)},d4.createCertificateVerify=function(a,b){var c=b.length+2,d=cz.util.createBuffer();return d.putByte(d4.HandshakeType.certificate_verify),d.putInt24(c),d.putInt16(b.length),d.putBytes(b),d},d4.createCertificateRequest=function(a){var b=cz.util.createBuffer();b.putByte(1);var c=cz.util.createBuffer();for(var d in a.caStore.certs){var e=cz.pki.distinguishedNameToAsn1(a.caStore.certs[d].subject),f=cz.asn1.toDer(e);c.putInt16(f.length()),c.putBuffer(f)}var g=1+b.length()+2+c.length(),h=cz.util.createBuffer();return h.putByte(d4.HandshakeType.certificate_request),h.putInt24(g),d3(h,1,b),d3(h,2,c),h},d4.createServerHelloDone=function(a){var b=cz.util.createBuffer();return b.putByte(d4.HandshakeType.server_hello_done),b.putInt24(0),b},d4.createChangeCipherSpec=function(){var a=cz.util.createBuffer();return a.putByte(1),a},d4.createFinished=function(a){var b=cz.util.createBuffer();b.putBuffer(a.session.md5.digest()),b.putBuffer(a.session.sha1.digest()),b=d_(a.session.sp.master_secret,a.entity===d4.ConnectionEnd.client?"client finished":"server finished",b.getBytes(),12);var c=cz.util.createBuffer();return c.putByte(d4.HandshakeType.finished),c.putInt24(b.length()),c.putBuffer(b),c},d4.createHeartbeat=function(a,b,c){void 0===c&&(c=b.length);var d=cz.util.createBuffer();d.putByte(a),d.putInt16(c),d.putBytes(b);var e=Math.max(16,d.length()-c-3);return d.putBytes(cz.random.getBytes(e)),d},d4.queue=function(a,b){if(b&&(0!==b.fragment.length()||b.type!==d4.ContentType.handshake&&b.type!==d4.ContentType.alert&&b.type!==d4.ContentType.change_cipher_spec)){if(b.type===d4.ContentType.handshake){var c,d=b.fragment.bytes();a.session.md5.update(d),a.session.sha1.update(d),d=null}if(b.fragment.length()<=d4.MaxFragment)c=[b];else{c=[];for(var e=b.fragment.bytes();e.length>d4.MaxFragment;)c.push(d4.createRecord(a,{type:b.type,data:cz.util.createBuffer(e.slice(0,d4.MaxFragment))})),e=e.slice(d4.MaxFragment);e.length>0&&c.push(d4.createRecord(a,{type:b.type,data:cz.util.createBuffer(e)}))}for(var f=0;f<c.length&&!a.fail;++f){var g=c[f];a.state.current.write.update(a,g)&&a.records.push(g)}}},d4.flush=function(a){for(var b=0;b<a.records.length;++b){var c=a.records[b];a.tlsData.putByte(c.type),a.tlsData.putByte(c.version.major),a.tlsData.putByte(c.version.minor),a.tlsData.putInt16(c.fragment.length()),a.tlsData.putBuffer(a.records[b].fragment)}return a.records=[],a.tlsDataReady(a)};var ex=function(a){switch(a){case!0:return!0;case cz.pki.certificateError.bad_certificate:return d4.Alert.Description.bad_certificate;case cz.pki.certificateError.unsupported_certificate:return d4.Alert.Description.unsupported_certificate;case cz.pki.certificateError.certificate_revoked:return d4.Alert.Description.certificate_revoked;case cz.pki.certificateError.certificate_expired:return d4.Alert.Description.certificate_expired;case cz.pki.certificateError.certificate_unknown:return d4.Alert.Description.certificate_unknown;case cz.pki.certificateError.unknown_ca:return d4.Alert.Description.unknown_ca;default:return d4.Alert.Description.bad_certificate}};for(var ey in d4.verifyCertificateChain=function(a,b){try{var c={};for(var d in a.verifyOptions)c[d]=a.verifyOptions[d];c.verify=function(b,c,d){ex(b);var e=a.verify(a,b,c,d);if(!0!==e){if("object"==typeof e&&!cz.util.isArray(e)){var f=Error("The application rejected the certificate.");throw f.send=!0,f.alert={level:d4.Alert.Level.fatal,description:d4.Alert.Description.bad_certificate},e.message&&(f.message=e.message),e.alert&&(f.alert.description=e.alert),f}e!==b&&(e=function(a){switch(a){case!0:return!0;case d4.Alert.Description.bad_certificate:return cz.pki.certificateError.bad_certificate;case d4.Alert.Description.unsupported_certificate:return cz.pki.certificateError.unsupported_certificate;case d4.Alert.Description.certificate_revoked:return cz.pki.certificateError.certificate_revoked;case d4.Alert.Description.certificate_expired:return cz.pki.certificateError.certificate_expired;case d4.Alert.Description.certificate_unknown:return cz.pki.certificateError.certificate_unknown;case d4.Alert.Description.unknown_ca:return cz.pki.certificateError.unknown_ca;default:return cz.pki.certificateError.bad_certificate}}(e))}return e},cz.pki.verifyCertificateChain(a.caStore,b,c)}catch(b){var e=b;("object"!=typeof e||cz.util.isArray(e))&&(e={send:!0,alert:{level:d4.Alert.Level.fatal,description:ex(b)}}),"send"in e||(e.send=!0),"alert"in e||(e.alert={level:d4.Alert.Level.fatal,description:ex(e.error)}),a.error(a,e)}return!a.fail},d4.createSessionCache=function(a,b){var c=null;if(a&&a.getSession&&a.setSession&&a.order)c=a;else{for(var d in(c={}).cache=a||{},c.capacity=Math.max(b||100,1),c.order=[],a)c.order.length<=b?c.order.push(d):delete a[d];c.getSession=function(a){var b=null,d=null;if(a?d=cz.util.bytesToHex(a):c.order.length>0&&(d=c.order[0]),null!==d&&d in c.cache){for(var e in b=c.cache[d],delete c.cache[d],c.order)if(c.order[e]===d){c.order.splice(e,1);break}}return b},c.setSession=function(a,b){if(c.order.length===c.capacity){var d=c.order.shift();delete c.cache[d]}d=cz.util.bytesToHex(a),c.order.push(d),c.cache[d]=b}}return c},d4.createConnection=function(a){var b=a.caStore?cz.util.isArray(a.caStore)?cz.pki.createCaStore(a.caStore):a.caStore:cz.pki.createCaStore(),c=a.cipherSuites||null;if(null===c)for(var d in c=[],d4.CipherSuites)c.push(d4.CipherSuites[d]);var e=a.server?d4.ConnectionEnd.server:d4.ConnectionEnd.client,f=a.sessionCache?d4.createSessionCache(a.sessionCache):null,g={version:{major:d4.Version.major,minor:d4.Version.minor},entity:e,sessionId:a.sessionId,caStore:b,sessionCache:f,cipherSuites:c,connected:a.connected,virtualHost:a.virtualHost||null,verifyClient:a.verifyClient||!1,verify:a.verify||function(a,b,c,d){return b},verifyOptions:a.verifyOptions||{},getCertificate:a.getCertificate||null,getPrivateKey:a.getPrivateKey||null,getSignature:a.getSignature||null,input:cz.util.createBuffer(),tlsData:cz.util.createBuffer(),data:cz.util.createBuffer(),tlsDataReady:a.tlsDataReady,dataReady:a.dataReady,heartbeatReceived:a.heartbeatReceived,closed:a.closed,error:function(b,c){c.origin=c.origin||(b.entity===d4.ConnectionEnd.client?"client":"server"),c.send&&(d4.queue(b,d4.createAlert(b,c.alert)),d4.flush(b));var d=!1!==c.fatal;d&&(b.fail=!0),a.error(b,c),d&&b.close(!1)},deflate:a.deflate||null,inflate:a.inflate||null,reset:function(a){g.version={major:d4.Version.major,minor:d4.Version.minor},g.record=null,g.session=null,g.peerCertificate=null,g.state={pending:null,current:null},g.expect=0,g.fragmented=null,g.records=[],g.open=!1,g.handshakes=0,g.handshaking=!1,g.isConnected=!1,g.fail=!(a||void 0===a),g.input.clear(),g.tlsData.clear(),g.data.clear(),g.state.current=d4.createConnectionState(g)}};return g.reset(),g.handshake=function(a){if(g.entity!==d4.ConnectionEnd.client)g.error(g,{message:"Cannot initiate handshake as a server.",fatal:!1});else if(g.handshaking)g.error(g,{message:"Handshake already in progress.",fatal:!1});else{g.fail&&!g.open&&0===g.handshakes&&(g.fail=!1),g.handshaking=!0;var b=null;(a=a||"").length>0&&(g.sessionCache&&(b=g.sessionCache.getSession(a)),null===b&&(a="")),0===a.length&&g.sessionCache&&null!==(b=g.sessionCache.getSession())&&(a=b.id),g.session={id:a,version:null,cipherSuite:null,compressionMethod:null,serverCertificate:null,certificateRequest:null,clientCertificate:null,sp:{},md5:cz.md.md5.create(),sha1:cz.md.sha1.create()},b&&(g.version=b.version,g.session.sp=b.sp),g.session.sp.client_random=d4.createRandom().getBytes(),g.open=!0,d4.queue(g,d4.createRecord(g,{type:d4.ContentType.handshake,data:d4.createClientHello(g)})),d4.flush(g)}},g.process=function(a){var b,c,d,e,f,h,i,j,k=0;return a&&g.input.putBytes(a),g.fail||(null!==g.record&&g.record.ready&&g.record.fragment.isEmpty()&&(g.record=null),null===g.record&&(k=function(a){var b=0,c=a.input,d=c.length();if(d<5)b=5-d;else{a.record={type:c.getByte(),version:{major:c.getByte(),minor:c.getByte()},length:c.getInt16(),fragment:cz.util.createBuffer(),ready:!1};var e=a.record.version.major===a.version.major;e&&a.session&&a.session.version&&(e=a.record.version.minor===a.version.minor),e||a.error(a,{message:"Incompatible TLS version.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.protocol_version}})}return b}(g)),g.fail||null===g.record||g.record.ready||(c=0,(e=(d=(b=g).input).length())<b.record.length?c=b.record.length-e:(b.record.fragment.putBytes(d.getBytes(b.record.length)),d.compact(),b.state.current.read.update(b,b.record)&&(null!==b.fragmented&&(b.fragmented.type===b.record.type?(b.fragmented.fragment.putBuffer(b.record.fragment),b.record=b.fragmented):b.error(b,{message:"Invalid fragmented record.",send:!0,alert:{level:d4.Alert.Level.fatal,description:d4.Alert.Description.unexpected_message}})),b.record.ready=!0)),k=c),!g.fail&&null!==g.record&&g.record.ready&&(f=g,i=(h=g.record).type-d4.ContentType.change_cipher_spec,j=ep[f.entity][f.expect],i in j?j[i](f,h):d4.handleUnexpected(f,h))),k},g.prepare=function(a){return d4.queue(g,d4.createRecord(g,{type:d4.ContentType.application_data,data:cz.util.createBuffer(a)})),d4.flush(g)},g.prepareHeartbeatRequest=function(a,b){return a instanceof cz.util.ByteBuffer&&(a=a.bytes()),void 0===b&&(b=a.length),g.expectedHeartbeatPayload=a,d4.queue(g,d4.createRecord(g,{type:d4.ContentType.heartbeat,data:d4.createHeartbeat(d4.HeartbeatMessageType.heartbeat_request,a,b)})),d4.flush(g)},g.close=function(a){if(!g.fail&&g.sessionCache&&g.session){var b={id:g.session.id,version:g.session.version,sp:g.session.sp};b.sp.keys=null,g.sessionCache.setSession(b.id,b)}g.open&&(g.open=!1,g.input.clear(),(g.isConnected||g.handshaking)&&(g.isConnected=g.handshaking=!1,d4.queue(g,d4.createAlert(g,{level:d4.Alert.Level.warning,description:d4.Alert.Description.close_notify})),d4.flush(g)),g.closed(g)),g.reset(a)},g},cz.tls=cz.tls||{},d4)"function"!=typeof d4[ey]&&(cz.tls[ey]=d4[ey]);cz.tls.prf_tls1=d_,cz.tls.hmac_sha1=function(a,b,c){var d=cz.hmac.create();d.start("SHA1",a);var e=cz.util.createBuffer();return e.putInt32(b[0]),e.putInt32(b[1]),e.putByte(c.type),e.putByte(c.version.major),e.putByte(c.version.minor),e.putInt16(c.length),e.putBytes(c.fragment.bytes()),d.update(e.getBytes()),d.digest().getBytes()},cz.tls.createSessionCache=d4.createSessionCache,cz.tls.createConnection=d4.createConnection,cB(function(a){var b=a.exports=cz.tls;function c(a,c,e){var f=c.entity===cz.tls.ConnectionEnd.client;a.read.cipherState={init:!1,cipher:cz.cipher.createDecipher("AES-CBC",f?e.keys.server_write_key:e.keys.client_write_key),iv:f?e.keys.server_write_IV:e.keys.client_write_IV},a.write.cipherState={init:!1,cipher:cz.cipher.createCipher("AES-CBC",f?e.keys.client_write_key:e.keys.server_write_key),iv:f?e.keys.client_write_IV:e.keys.server_write_IV},a.read.cipherFunction=g,a.write.cipherFunction=d,a.read.macLength=a.write.macLength=e.mac_length,a.read.macFunction=a.write.macFunction=b.hmac_sha1}function d(a,c){var d,f=!1,g=c.macFunction(c.macKey,c.sequenceNumber,a);a.fragment.putBytes(g),c.updateSequenceNumber(),d=a.version.minor===b.Versions.TLS_1_0.minor?c.cipherState.init?null:c.cipherState.iv:cz.random.getBytesSync(16),c.cipherState.init=!0;var h=c.cipherState.cipher;return h.start({iv:d}),a.version.minor>=b.Versions.TLS_1_1.minor&&h.output.putBytes(d),h.update(a.fragment),h.finish(e)&&(a.fragment=h.output,a.length=a.fragment.length(),f=!0),f}function e(a,b,c){if(!c){var d=a-b.length()%a;b.fillWithByte(d-1,d)}return!0}function f(a,b,c){var d=!0;if(c){for(var e=b.length(),f=b.last(),g=e-1-f;g<e-1;++g)d=d&&b.at(g)==f;d&&b.truncate(f+1)}return d}function g(a,c){var d,e,g,h,i=!1;h=a.version.minor===b.Versions.TLS_1_0.minor?c.cipherState.init?null:c.cipherState.iv:a.fragment.getBytes(16),c.cipherState.init=!0;var j=c.cipherState.cipher;j.start({iv:h}),j.update(a.fragment),i=j.finish(f);var k=c.macLength,l=cz.random.getBytesSync(k),m=j.output.length();m>=k?(a.fragment=j.output.getBytes(m-k),l=j.output.getBytes(k)):a.fragment=j.output.getBytes(),a.fragment=cz.util.createBuffer(a.fragment),a.length=a.fragment.length();var n=c.macFunction(c.macKey,c.sequenceNumber,a);return c.updateSequenceNumber(),d=c.macKey,e=l,(g=cz.hmac.create()).start("SHA1",d),g.update(e),e=g.digest().getBytes(),g.start(null,null),g.update(n),i=e===g.digest().getBytes()&&i}b.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA={id:[0,47],name:"TLS_RSA_WITH_AES_128_CBC_SHA",initSecurityParameters:function(a){a.bulk_cipher_algorithm=b.BulkCipherAlgorithm.aes,a.cipher_type=b.CipherType.block,a.enc_key_length=16,a.block_length=16,a.fixed_iv_length=16,a.record_iv_length=16,a.mac_algorithm=b.MACAlgorithm.hmac_sha1,a.mac_length=20,a.mac_key_length=20},initConnectionState:c},b.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA={id:[0,53],name:"TLS_RSA_WITH_AES_256_CBC_SHA",initSecurityParameters:function(a){a.bulk_cipher_algorithm=b.BulkCipherAlgorithm.aes,a.cipher_type=b.CipherType.block,a.enc_key_length=32,a.block_length=16,a.fixed_iv_length=16,a.record_iv_length=16,a.mac_algorithm=b.MACAlgorithm.hmac_sha1,a.mac_length=20,a.mac_key_length=20},initConnectionState:c}}),cB(function(a){var b=a.exports=cz.sha512=cz.sha512||{};cz.md.sha512=cz.md.algorithms.sha512=b;var c=cz.sha384=cz.sha512.sha384=cz.sha512.sha384||{};c.create=function(){return b.create("SHA-384")},cz.md.sha384=cz.md.algorithms.sha384=c,cz.sha512.sha256=cz.sha512.sha256||{create:function(){return b.create("SHA-512/256")}},cz.md["sha512/256"]=cz.md.algorithms["sha512/256"]=cz.sha512.sha256,cz.sha512.sha224=cz.sha512.sha224||{create:function(){return b.create("SHA-512/224")}},cz.md["sha512/224"]=cz.md.algorithms["sha512/224"]=cz.sha512.sha224,b.create=function(a){if(e||(d=String.fromCharCode(128)+cz.util.fillString("\0",128),f=[[0x428a2f98,0xd728ae22],[0x71374491,0x23ef65cd],[0xb5c0fbcf,0xec4d3b2f],[0xe9b5dba5,0x8189dbbc],[0x3956c25b,0xf348b538],[0x59f111f1,0xb605d019],[0x923f82a4,0xaf194f9b],[0xab1c5ed5,0xda6d8118],[0xd807aa98,0xa3030242],[0x12835b01,0x45706fbe],[0x243185be,0x4ee4b28c],[0x550c7dc3,0xd5ffb4e2],[0x72be5d74,0xf27b896f],[0x80deb1fe,0x3b1696b1],[0x9bdc06a7,0x25c71235],[0xc19bf174,0xcf692694],[0xe49b69c1,0x9ef14ad2],[0xefbe4786,0x384f25e3],[0xfc19dc6,0x8b8cd5b5],[0x240ca1cc,0x77ac9c65],[0x2de92c6f,0x592b0275],[0x4a7484aa,0x6ea6e483],[0x5cb0a9dc,0xbd41fbd4],[0x76f988da,0x831153b5],[0x983e5152,0xee66dfab],[0xa831c66d,0x2db43210],[0xb00327c8,0x98fb213f],[0xbf597fc7,0xbeef0ee4],[0xc6e00bf3,0x3da88fc2],[0xd5a79147,0x930aa725],[0x6ca6351,0xe003826f],[0x14292967,0xa0e6e70],[0x27b70a85,0x46d22ffc],[0x2e1b2138,0x5c26c926],[0x4d2c6dfc,0x5ac42aed],[0x53380d13,0x9d95b3df],[0x650a7354,0x8baf63de],[0x766a0abb,0x3c77b2a8],[0x81c2c92e,0x47edaee6],[0x92722c85,0x1482353b],[0xa2bfe8a1,0x4cf10364],[0xa81a664b,0xbc423001],[0xc24b8b70,0xd0f89791],[0xc76c51a3,0x654be30],[0xd192e819,0xd6ef5218],[0xd6990624,0x5565a910],[0xf40e3585,0x5771202a],[0x106aa070,0x32bbd1b8],[0x19a4c116,0xb8d2d0c8],[0x1e376c08,0x5141ab53],[0x2748774c,0xdf8eeb99],[0x34b0bcb5,0xe19b48a8],[0x391c0cb3,0xc5c95a63],[0x4ed8aa4a,0xe3418acb],[0x5b9cca4f,0x7763e373],[0x682e6ff3,0xd6b2b8a3],[0x748f82ee,0x5defb2fc],[0x78a5636f,0x43172f60],[0x84c87814,0xa1f0ab72],[0x8cc70208,0x1a6439ec],[0x90befffa,0x23631e28],[0xa4506ceb,0xde82bde9],[0xbef9a3f7,0xb2c67915],[0xc67178f2,0xe372532b],[0xca273ece,0xea26619c],[0xd186b8c7,0x21c0c207],[0xeada7dd6,0xcde0eb1e],[0xf57d4f7f,0xee6ed178],[0x6f067aa,0x72176fba],[0xa637dc5,0xa2c898a6],[0x113f9804,0xbef90dae],[0x1b710b35,0x131c471b],[0x28db77f5,0x23047d84],[0x32caab7b,0x40c72493],[0x3c9ebe0a,0x15c9bebc],[0x431d67c4,0x9c100d4c],[0x4cc5d4be,0xcb3e42b6],[0x597f299c,0xfc657e2a],[0x5fcb6fab,0x3ad6faec],[0x6c44198c,0x4a475817]],(g={})["SHA-512"]=[[0x6a09e667,0xf3bcc908],[0xbb67ae85,0x84caa73b],[0x3c6ef372,0xfe94f82b],[0xa54ff53a,0x5f1d36f1],[0x510e527f,0xade682d1],[0x9b05688c,0x2b3e6c1f],[0x1f83d9ab,0xfb41bd6b],[0x5be0cd19,0x137e2179]],g["SHA-384"]=[[0xcbbb9d5d,0xc1059ed8],[0x629a292a,0x367cd507],[0x9159015a,0x3070dd17],[0x152fecd8,0xf70e5939],[0x67332667,0xffc00b31],[0x8eb44a87,0x68581511],[0xdb0c2e0d,0x64f98fa7],[0x47b5481d,0xbefa4fa4]],g["SHA-512/256"]=[[0x22312194,0xfc2bf72c],[0x9f555fa3,0xc84c64c2],[0x2393b86b,0x6f53b151],[0x96387719,0x5940eabd],[0x96283ee2,0xa88effe3],[0xbe5e1e25,0x53863992],[0x2b0199fc,0x2c85b8aa],[0xeb72ddc,0x81c52ca2]],g["SHA-512/224"]=[[0x8c3d37c8,0x19544da2],[0x73e19966,0x89dcd4d6],[0x1dfab7ae,0x32ff9c82],[0x679dd514,0x582f9fcf],[0xf6d2b69,0x7bd44da8],[0x77e36f73,0x4c48942],[0x3f9d85a8,0x6a1d36c8],[0x1112e6ad,0x91d692a1]],e=!0),void 0===a&&(a="SHA-512"),!(a in g))throw Error("Invalid SHA-512 algorithm: "+a);for(var b=g[a],c=null,i=cz.util.createBuffer(),j=Array(80),k=0;k<80;++k)j[k]=[,,];var l=64;switch(a){case"SHA-384":l=48;break;case"SHA-512/256":l=32;break;case"SHA-512/224":l=28}var m={algorithm:a.replace("-","").toLowerCase(),blockLength:128,digestLength:l,messageLength:0,fullMessageLength:null,messageLengthSize:16,start:function(){m.messageLength=0,m.fullMessageLength=m.messageLength128=[];for(var a=m.messageLengthSize/4,d=0;d<a;++d)m.fullMessageLength.push(0);for(i=cz.util.createBuffer(),c=Array(b.length),d=0;d<b.length;++d)c[d]=b[d].slice(0);return m}};return m.start(),m.update=function(a,b){"utf8"===b&&(a=cz.util.encodeUtf8(a));var d=a.length;m.messageLength+=d,d=[d/0x100000000>>>0,d>>>0];for(var e=m.fullMessageLength.length-1;e>=0;--e)m.fullMessageLength[e]+=d[1],d[1]=d[0]+(m.fullMessageLength[e]/0x100000000>>>0),m.fullMessageLength[e]=m.fullMessageLength[e]>>>0,d[0]=d[1]/0x100000000>>>0;return i.putBytes(a),h(c,j,i),(i.read>2048||0===i.length())&&i.compact(),m},m.digest=function(){var b,e=cz.util.createBuffer();e.putBytes(i.bytes()),e.putBytes(d.substr(0,m.blockLength-(m.fullMessageLength[m.fullMessageLength.length-1]+m.messageLengthSize&m.blockLength-1)));for(var f=8*m.fullMessageLength[0],g=0;g<m.fullMessageLength.length-1;++g)e.putInt32((f+=(b=8*m.fullMessageLength[g+1])/0x100000000>>>0)>>>0),f=b>>>0;e.putInt32(f);var k=Array(c.length);for(g=0;g<c.length;++g)k[g]=c[g].slice(0);h(k,j,e);var l,n=cz.util.createBuffer();for(l="SHA-512"===a?k.length:"SHA-384"===a?k.length-2:k.length-4,g=0;g<l;++g)n.putInt32(k[g][0]),g===l-1&&"SHA-512/224"===a||n.putInt32(k[g][1]);return n},m};var d=null,e=!1,f=null,g=null;function h(a,b,c){for(var d,e,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F=c.length();F>=128;){for(y=0;y<16;++y)b[y][0]=c.getInt32()>>>0,b[y][1]=c.getInt32()>>>0;for(;y<80;++y)e=(((z=(B=b[y-2])[0])<<13|(A=B[1])>>>19)^(A<<3|z>>>29)^(z<<26|A>>>6))>>>0,b[y][0]=(d=((z>>>19|A<<13)^(A>>>29|z<<3)^z>>>6)>>>0)+(C=b[y-7])[0]+(g=(((z=(D=b[y-15])[0])>>>1|(A=D[1])<<31)^(z>>>8|A<<24)^z>>>7)>>>0)+(E=b[y-16])[0]+((A=e+C[1]+(h=((z<<31|A>>>1)^(z<<24|A>>>8)^(z<<25|A>>>7))>>>0)+E[1])/0x100000000>>>0)>>>0,b[y][1]=A>>>0;for(i=a[0][0],j=a[0][1],k=a[1][0],l=a[1][1],m=a[2][0],n=a[2][1],o=a[3][0],p=a[3][1],q=a[4][0],r=a[4][1],s=a[5][0],t=a[5][1],u=a[6][0],v=a[6][1],w=a[7][0],x=a[7][1],y=0;y<80;++y)d=w+(((q>>>14|r<<18)^(q>>>18|r<<14)^(r>>>9|q<<23))>>>0)+((u^q&(s^u))>>>0)+f[y][0]+b[y][0]+((A=x+(((q<<18|r>>>14)^(q<<14|r>>>18)^(r<<23|q>>>9))>>>0)+((v^r&(t^v))>>>0)+f[y][1]+b[y][1])/0x100000000>>>0)>>>0,e=A>>>0,g=(((i>>>28|j<<4)^(j>>>2|i<<30)^(j>>>7|i<<25))>>>0)+((i&k|m&(i^k))>>>0)+((A=(((i<<4|j>>>28)^(j<<30|i>>>2)^(j<<25|i>>>7))>>>0)+((j&l|n&(j^l))>>>0))/0x100000000>>>0)>>>0,h=A>>>0,w=u,x=v,u=s,v=t,s=q,t=r,q=o+d+((A=p+e)/0x100000000>>>0)>>>0,r=A>>>0,o=m,p=n,m=k,n=l,k=i,l=j,i=d+g+((A=e+h)/0x100000000>>>0)>>>0,j=A>>>0;a[0][0]=a[0][0]+i+((A=a[0][1]+j)/0x100000000>>>0)>>>0,a[0][1]=A>>>0,a[1][0]=a[1][0]+k+((A=a[1][1]+l)/0x100000000>>>0)>>>0,a[1][1]=A>>>0,a[2][0]=a[2][0]+m+((A=a[2][1]+n)/0x100000000>>>0)>>>0,a[2][1]=A>>>0,a[3][0]=a[3][0]+o+((A=a[3][1]+p)/0x100000000>>>0)>>>0,a[3][1]=A>>>0,a[4][0]=a[4][0]+q+((A=a[4][1]+r)/0x100000000>>>0)>>>0,a[4][1]=A>>>0,a[5][0]=a[5][0]+s+((A=a[5][1]+t)/0x100000000>>>0)>>>0,a[5][1]=A>>>0,a[6][0]=a[6][0]+u+((A=a[6][1]+v)/0x100000000>>>0)>>>0,a[6][1]=A>>>0,a[7][0]=a[7][0]+w+((A=a[7][1]+x)/0x100000000>>>0)>>>0,a[7][1]=A>>>0,F-=128}}});var ez=cz.asn1,eA={privateKeyValidator:{name:"PrivateKeyInfo",tagClass:ez.Class.UNIVERSAL,type:ez.Type.SEQUENCE,constructed:!0,value:[{name:"PrivateKeyInfo.version",tagClass:ez.Class.UNIVERSAL,type:ez.Type.INTEGER,constructed:!1,capture:"privateKeyVersion"},{name:"PrivateKeyInfo.privateKeyAlgorithm",tagClass:ez.Class.UNIVERSAL,type:ez.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:ez.Class.UNIVERSAL,type:ez.Type.OID,constructed:!1,capture:"privateKeyOid"}]},{name:"PrivateKeyInfo",tagClass:ez.Class.UNIVERSAL,type:ez.Type.OCTETSTRING,constructed:!1,capture:"privateKey"}]},publicKeyValidator:{name:"SubjectPublicKeyInfo",tagClass:ez.Class.UNIVERSAL,type:ez.Type.SEQUENCE,constructed:!0,captureAsn1:"subjectPublicKeyInfo",value:[{name:"SubjectPublicKeyInfo.AlgorithmIdentifier",tagClass:ez.Class.UNIVERSAL,type:ez.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:ez.Class.UNIVERSAL,type:ez.Type.OID,constructed:!1,capture:"publicKeyOid"}]},{tagClass:ez.Class.UNIVERSAL,type:ez.Type.BITSTRING,constructed:!1,composed:!0,captureBitStringValue:"ed25519PublicKey"}]}},eB=eA.publicKeyValidator,eC=eA.privateKeyValidator,eD=cz.util.ByteBuffer,eE="u"<typeof Buffer?Uint8Array:Buffer;cz.pki=cz.pki||{},cz.pki.ed25519=cz.ed25519=cz.ed25519||{};var eF=cz.ed25519;function eG(a){var b=a.message;if(b instanceof Uint8Array||b instanceof eE)return b;var c=a.encoding;if(void 0===b){if(!a.md)throw TypeError('"options.message" or "options.md" not specified.');b=a.md.digest().getBytes(),c="binary"}if("string"==typeof b&&!c)throw TypeError('"options.encoding" must be "binary" or "utf8".');if("string"==typeof b){if("u">typeof Buffer)return Buffer.from(b,c);b=new eD(b,c)}else if(!(b instanceof eD))throw TypeError('"options.message" must be a node.js Buffer, a Uint8Array, a forge ByteBuffer, or a string with "options.encoding" specifying its encoding.');for(var d=new eE(b.length()),e=0;e<d.length;++e)d[e]=b.at(e);return d}eF.constants={},eF.constants.PUBLIC_KEY_BYTE_LENGTH=32,eF.constants.PRIVATE_KEY_BYTE_LENGTH=64,eF.constants.SEED_BYTE_LENGTH=32,eF.constants.SIGN_BYTE_LENGTH=64,eF.constants.HASH_BYTE_LENGTH=64,eF.generateKeyPair=function(a){var b=(a=a||{}).seed;if(void 0===b)b=cz.random.getBytesSync(eF.constants.SEED_BYTE_LENGTH);else if("string"==typeof b){if(b.length!==eF.constants.SEED_BYTE_LENGTH)throw TypeError('"seed" must be '+eF.constants.SEED_BYTE_LENGTH+" bytes in length.")}else if(!(b instanceof Uint8Array))throw TypeError('"seed" must be a node.js Buffer, Uint8Array, or a binary string.');b=eG({message:b,encoding:"binary"});for(var c=new eE(eF.constants.PUBLIC_KEY_BYTE_LENGTH),d=new eE(eF.constants.PRIVATE_KEY_BYTE_LENGTH),e=0;e<32;++e)d[e]=b[e];return function(a,b){var c,d=[e2(),e2(),e2(),e2()],e=eP(b,32);for(e[0]&=248,e[31]&=127,e[31]|=64,e$(d,e),eU(a,d),c=0;c<32;++c)b[c+32]=a[c]}(c,d),{publicKey:c,privateKey:d}},eF.privateKeyFromAsn1=function(a){var b={},c=[];if(!cz.asn1.validate(a,eC,b,c)){var d=Error("Invalid Key.");throw d.errors=c,d}var e=cz.asn1.derToOid(b.privateKeyOid),f=cz.oids.EdDSA25519;if(e!==f)throw Error('Invalid OID "'+e+'"; OID must be "'+f+'".');return{privateKeyBytes:eG({message:cz.asn1.fromDer(b.privateKey).value,encoding:"binary"})}},eF.publicKeyFromAsn1=function(a){var b={},c=[];if(!cz.asn1.validate(a,eB,b,c)){var d=Error("Invalid Key.");throw d.errors=c,d}var e=cz.asn1.derToOid(b.publicKeyOid),f=cz.oids.EdDSA25519;if(e!==f)throw Error('Invalid OID "'+e+'"; OID must be "'+f+'".');var g=b.ed25519PublicKey;if(g.length!==eF.constants.PUBLIC_KEY_BYTE_LENGTH)throw Error("Key length is invalid.");return eG({message:g,encoding:"binary"})},eF.publicKeyFromPrivateKey=function(a){var b=eG({message:(a=a||{}).privateKey,encoding:"binary"});if(b.length!==eF.constants.PRIVATE_KEY_BYTE_LENGTH)throw TypeError('"options.privateKey" must have a byte length of '+eF.constants.PRIVATE_KEY_BYTE_LENGTH);for(var c=new eE(eF.constants.PUBLIC_KEY_BYTE_LENGTH),d=0;d<c.length;++d)c[d]=b[32+d];return c},eF.sign=function(a){var b=eG(a=a||{}),c=eG({message:a.privateKey,encoding:"binary"});if(c.length===eF.constants.SEED_BYTE_LENGTH)c=eF.generateKeyPair({seed:c}).privateKey;else if(c.length!==eF.constants.PRIVATE_KEY_BYTE_LENGTH)throw TypeError('"options.privateKey" must have a byte length of '+eF.constants.SEED_BYTE_LENGTH+" or "+eF.constants.PRIVATE_KEY_BYTE_LENGTH);var d=new eE(eF.constants.SIGN_BYTE_LENGTH+b.length);!function(a,b,c,d){var e,f,g=new Float64Array(64),h=[e2(),e2(),e2(),e2()],i=eP(d,32);for(i[0]&=248,i[31]&=127,i[31]|=64,e=0;e<c;++e)a[64+e]=b[e];for(e=0;e<32;++e)a[32+e]=i[32+e];var j=eP(a.subarray(32),c+32);for(eR(j),e$(h,j),eU(a,h),e=32;e<64;++e)a[e]=d[e];var k=eP(a,c+64);for(eR(k),e=32;e<64;++e)g[e]=0;for(e=0;e<32;++e)g[e]=j[e];for(e=0;e<32;++e)for(f=0;f<32;f++)g[e+f]+=k[e]*i[f];eQ(a.subarray(32),g)}(d,b,b.length,c);for(var e=new eE(eF.constants.SIGN_BYTE_LENGTH),f=0;f<e.length;++f)e[f]=d[f];return e},eF.verify=function(a){var b=eG(a=a||{});if(void 0===a.signature)throw TypeError('"options.signature" must be a node.js Buffer, a Uint8Array, a forge ByteBuffer, or a binary string.');var c=eG({message:a.signature,encoding:"binary"});if(c.length!==eF.constants.SIGN_BYTE_LENGTH)throw TypeError('"options.signature" must have a byte length of '+eF.constants.SIGN_BYTE_LENGTH);var d=eG({message:a.publicKey,encoding:"binary"});if(d.length!==eF.constants.PUBLIC_KEY_BYTE_LENGTH)throw TypeError('"options.publicKey" must have a byte length of '+eF.constants.PUBLIC_KEY_BYTE_LENGTH);var e,f=new eE(eF.constants.SIGN_BYTE_LENGTH+b.length),g=new eE(eF.constants.SIGN_BYTE_LENGTH+b.length);for(e=0;e<eF.constants.SIGN_BYTE_LENGTH;++e)f[e]=c[e];for(e=0;e<b.length;++e)f[e+eF.constants.SIGN_BYTE_LENGTH]=b[e];return function(a,b,c,d){var e,f,g,h,i,j,k,l,m,n,o,p,q,r=new eE(32),s=[e2(),e2(),e2(),e2()],t=[e2(),e2(),e2(),e2()];if(c<64)return -1;if(j=e2(),k=e2(),l=e2(),m=e2(),n=e2(),o=e2(),p=e2(),e_(t[2],eI),function(a,b){var c;for(c=0;c<16;++c)a[c]=b[2*c]+(b[2*c+1]<<8);a[15]&=32767}(t[1],d),e5(l,e=t[1],e),e5(m,l,eJ),e4(l,l,t[2]),e3(m,t[2],m),e5(n,f=m,f),e5(o,g=n,g),e5(p,o,n),e5(j,p,l),e5(j,j,m),function(a,b){var c,d,e=e2();for(d=0;d<16;++d)e[d]=b[d];for(d=250;d>=0;--d){e5(e,c=e,c),1!==d&&e5(e,e,b)}for(d=0;d<16;++d)a[d]=e[d]}(j,j),e5(j,j,l),e5(j,j,m),e5(j,j,m),e5(t[0],j,m),e5(k,h=t[0],h),e5(k,k,m),eW(k,l)&&e5(t[0],t[0],eO),e5(k,i=t[0],i),e5(k,k,m),eW(k,l)?-1:(eY(t[0])===d[31]>>7&&e4(t[0],eH,t[0]),e5(t[3],t[0],t[1]),0))return -1;for(q=0;q<c;++q)a[q]=b[q];for(q=0;q<32;++q)a[q+32]=d[q];var u=eP(a,c);if(eR(u),eZ(s,t,u),e$(t,b.subarray(32)),eS(s,t),eU(r,s),c-=64,eX(b,0,r,0)){for(q=0;q<c;++q)a[q]=0;return -1}for(q=0;q<c;++q)a[q]=b[q+64];return c}(g,f,f.length,d)>=0};var eH=e2(),eI=e2([1]),eJ=e2([30883,4953,19914,30187,55467,16705,2637,112,59544,30585,16505,36039,65139,11119,27886,20995]),eK=e2([61785,9906,39828,60374,45398,33411,5274,224,53552,61171,33010,6542,64743,22239,55772,9222]),eL=e2([54554,36645,11616,51542,42930,38181,51040,26924,56412,64982,57905,49316,21502,52590,14035,8553]),eM=e2([26200,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214]),eN=new Float64Array([237,211,245,92,26,99,18,88,214,156,247,162,222,249,222,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16]),eO=e2([41136,18958,6951,50414,58488,44335,6150,12099,55207,15867,153,11085,57099,20417,9344,11139]);function eP(a,b){var c=cz.md.sha512.create(),d=new eD(a);c.update(d.getBytes(b),"binary");var e=c.digest().getBytes();if("u">typeof Buffer)return Buffer.from(e,"binary");for(var f=new eE(eF.constants.HASH_BYTE_LENGTH),g=0;g<64;++g)f[g]=e.charCodeAt(g);return f}function eQ(a,b){var c,d,e,f;for(d=63;d>=32;--d){for(c=0,e=d-32,f=d-12;e<f;++e)b[e]+=c-16*b[d]*eN[e-(d-32)],b[e]-=256*(c=b[e]+128>>8);b[e]+=c,b[d]=0}for(c=0,e=0;e<32;++e)b[e]+=c-(b[31]>>4)*eN[e],c=b[e]>>8,b[e]&=255;for(e=0;e<32;++e)b[e]-=c*eN[e];for(d=0;d<32;++d)b[d+1]+=b[d]>>8,a[d]=255&b[d]}function eR(a){for(var b=new Float64Array(64),c=0;c<64;++c)b[c]=a[c],a[c]=0;eQ(a,b)}function eS(a,b){var c=e2(),d=e2(),e=e2(),f=e2(),g=e2(),h=e2(),i=e2(),j=e2(),k=e2();e4(c,a[1],a[0]),e4(k,b[1],b[0]),e5(c,c,k),e3(d,a[0],a[1]),e3(k,b[0],b[1]),e5(d,d,k),e5(e,a[3],b[3]),e5(e,e,eK),e5(f,a[2],b[2]),e3(f,f,f),e4(g,d,c),e4(h,f,e),e3(i,f,e),e3(j,d,c),e5(a[0],g,h),e5(a[1],j,i),e5(a[2],i,h),e5(a[3],g,j)}function eT(a,b,c){for(var d=0;d<4;++d)e1(a[d],b[d],c)}function eU(a,b){var c=e2(),d=e2(),e=e2();!function(a,b){var c,d,e=e2();for(d=0;d<16;++d)e[d]=b[d];for(d=253;d>=0;--d){e5(e,c=e,c),2!==d&&4!==d&&e5(e,e,b)}for(d=0;d<16;++d)a[d]=e[d]}(e,b[2]),e5(c,b[0],e),e5(d,b[1],e),eV(a,d),a[31]^=eY(c)<<7}function eV(a,b){var c,d,e,f=e2(),g=e2();for(c=0;c<16;++c)g[c]=b[c];for(e0(g),e0(g),e0(g),d=0;d<2;++d){for(f[0]=g[0]-65517,c=1;c<15;++c)f[c]=g[c]-65535-(f[c-1]>>16&1),f[c-1]&=65535;f[15]=g[15]-32767-(f[14]>>16&1),e=f[15]>>16&1,f[14]&=65535,e1(g,f,1-e)}for(c=0;c<16;c++)a[2*c]=255&g[c],a[2*c+1]=g[c]>>8}function eW(a,b){var c=new eE(32),d=new eE(32);return eV(c,a),eV(d,b),eX(c,0,d,0)}function eX(a,b,c,d){var e,f=0;for(e=0;e<32;++e)f|=a[b+e]^c[d+e];return(1&f-1>>>8)-1}function eY(a){var b=new eE(32);return eV(b,a),1&b[0]}function eZ(a,b,c){var d,e;for(e_(a[0],eH),e_(a[1],eI),e_(a[2],eI),e_(a[3],eH),e=255;e>=0;--e)eT(a,b,d=c[e/8|0]>>(7&e)&1),eS(b,a),eS(a,a),eT(a,b,d)}function e$(a,b){var c=[e2(),e2(),e2(),e2()];e_(c[0],eL),e_(c[1],eM),e_(c[2],eI),e5(c[3],eL,eM),eZ(a,c,b)}function e_(a,b){var c;for(c=0;c<16;c++)a[c]=0|b[c]}function e0(a){var b,c,d=1;for(b=0;b<16;++b)d=Math.floor((c=a[b]+d+65535)/65536),a[b]=c-65536*d;a[0]+=d-1+37*(d-1)}function e1(a,b,c){for(var d,e=~(c-1),f=0;f<16;++f)a[f]^=d=e&(a[f]^b[f]),b[f]^=d}function e2(a){var b,c=new Float64Array(16);if(a)for(b=0;b<a.length;++b)c[b]=a[b];return c}function e3(a,b,c){for(var d=0;d<16;++d)a[d]=b[d]+c[d]}function e4(a,b,c){for(var d=0;d<16;++d)a[d]=b[d]-c[d]}function e5(a,b,c){var d,e,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=c[0],L=c[1],M=c[2],N=c[3],O=c[4],P=c[5],Q=c[6],R=c[7],S=c[8],T=c[9],U=c[10],V=c[11],W=c[12],X=c[13],Y=c[14],Z=c[15];f+=(d=b[0])*K,g+=d*L,h+=d*M,i+=d*N,j+=d*O,k+=d*P,l+=d*Q,m+=d*R,n+=d*S,o+=d*T,p+=d*U,q+=d*V,r+=d*W,s+=d*X,t+=d*Y,u+=d*Z,g+=(d=b[1])*K,h+=d*L,i+=d*M,j+=d*N,k+=d*O,l+=d*P,m+=d*Q,n+=d*R,o+=d*S,p+=d*T,q+=d*U,r+=d*V,s+=d*W,t+=d*X,u+=d*Y,v+=d*Z,h+=(d=b[2])*K,i+=d*L,j+=d*M,k+=d*N,l+=d*O,m+=d*P,n+=d*Q,o+=d*R,p+=d*S,q+=d*T,r+=d*U,s+=d*V,t+=d*W,u+=d*X,v+=d*Y,w+=d*Z,i+=(d=b[3])*K,j+=d*L,k+=d*M,l+=d*N,m+=d*O,n+=d*P,o+=d*Q,p+=d*R,q+=d*S,r+=d*T,s+=d*U,t+=d*V,u+=d*W,v+=d*X,w+=d*Y,x+=d*Z,j+=(d=b[4])*K,k+=d*L,l+=d*M,m+=d*N,n+=d*O,o+=d*P,p+=d*Q,q+=d*R,r+=d*S,s+=d*T,t+=d*U,u+=d*V,v+=d*W,w+=d*X,x+=d*Y,y+=d*Z,k+=(d=b[5])*K,l+=d*L,m+=d*M,n+=d*N,o+=d*O,p+=d*P,q+=d*Q,r+=d*R,s+=d*S,t+=d*T,u+=d*U,v+=d*V,w+=d*W,x+=d*X,y+=d*Y,z+=d*Z,l+=(d=b[6])*K,m+=d*L,n+=d*M,o+=d*N,p+=d*O,q+=d*P,r+=d*Q,s+=d*R,t+=d*S,u+=d*T,v+=d*U,w+=d*V,x+=d*W,y+=d*X,z+=d*Y,A+=d*Z,m+=(d=b[7])*K,n+=d*L,o+=d*M,p+=d*N,q+=d*O,r+=d*P,s+=d*Q,t+=d*R,u+=d*S,v+=d*T,w+=d*U,x+=d*V,y+=d*W,z+=d*X,A+=d*Y,B+=d*Z,n+=(d=b[8])*K,o+=d*L,p+=d*M,q+=d*N,r+=d*O,s+=d*P,t+=d*Q,u+=d*R,v+=d*S,w+=d*T,x+=d*U,y+=d*V,z+=d*W,A+=d*X,B+=d*Y,C+=d*Z,o+=(d=b[9])*K,p+=d*L,q+=d*M,r+=d*N,s+=d*O,t+=d*P,u+=d*Q,v+=d*R,w+=d*S,x+=d*T,y+=d*U,z+=d*V,A+=d*W,B+=d*X,C+=d*Y,D+=d*Z,p+=(d=b[10])*K,q+=d*L,r+=d*M,s+=d*N,t+=d*O,u+=d*P,v+=d*Q,w+=d*R,x+=d*S,y+=d*T,z+=d*U,A+=d*V,B+=d*W,C+=d*X,D+=d*Y,E+=d*Z,q+=(d=b[11])*K,r+=d*L,s+=d*M,t+=d*N,u+=d*O,v+=d*P,w+=d*Q,x+=d*R,y+=d*S,z+=d*T,A+=d*U,B+=d*V,C+=d*W,D+=d*X,E+=d*Y,F+=d*Z,r+=(d=b[12])*K,s+=d*L,t+=d*M,u+=d*N,v+=d*O,w+=d*P,x+=d*Q,y+=d*R,z+=d*S,A+=d*T,B+=d*U,C+=d*V,D+=d*W,E+=d*X,F+=d*Y,G+=d*Z,s+=(d=b[13])*K,t+=d*L,u+=d*M,v+=d*N,w+=d*O,x+=d*P,y+=d*Q,z+=d*R,A+=d*S,B+=d*T,C+=d*U,D+=d*V,E+=d*W,F+=d*X,G+=d*Y,H+=d*Z,t+=(d=b[14])*K,u+=d*L,v+=d*M,w+=d*N,x+=d*O,y+=d*P,z+=d*Q,A+=d*R,B+=d*S,C+=d*T,D+=d*U,E+=d*V,F+=d*W,G+=d*X,H+=d*Y,I+=d*Z,u+=(d=b[15])*K,g+=38*(w+=d*M),h+=38*(x+=d*N),i+=38*(y+=d*O),j+=38*(z+=d*P),k+=38*(A+=d*Q),l+=38*(B+=d*R),m+=38*(C+=d*S),n+=38*(D+=d*T),o+=38*(E+=d*U),p+=38*(F+=d*V),q+=38*(G+=d*W),r+=38*(H+=d*X),s+=38*(I+=d*Y),t+=38*(J+=d*Z),f=(d=(f+=38*(v+=d*L))+(e=1)+65535)-65536*(e=Math.floor(d/65536)),g=(d=g+e+65535)-65536*(e=Math.floor(d/65536)),h=(d=h+e+65535)-65536*(e=Math.floor(d/65536)),i=(d=i+e+65535)-65536*(e=Math.floor(d/65536)),j=(d=j+e+65535)-65536*(e=Math.floor(d/65536)),k=(d=k+e+65535)-65536*(e=Math.floor(d/65536)),l=(d=l+e+65535)-65536*(e=Math.floor(d/65536)),m=(d=m+e+65535)-65536*(e=Math.floor(d/65536)),n=(d=n+e+65535)-65536*(e=Math.floor(d/65536)),o=(d=o+e+65535)-65536*(e=Math.floor(d/65536)),p=(d=p+e+65535)-65536*(e=Math.floor(d/65536)),q=(d=q+e+65535)-65536*(e=Math.floor(d/65536)),r=(d=r+e+65535)-65536*(e=Math.floor(d/65536)),s=(d=s+e+65535)-65536*(e=Math.floor(d/65536)),t=(d=t+e+65535)-65536*(e=Math.floor(d/65536)),u=(d=u+e+65535)-65536*(e=Math.floor(d/65536)),f=(d=(f+=e-1+37*(e-1))+(e=1)+65535)-65536*(e=Math.floor(d/65536)),g=(d=g+e+65535)-65536*(e=Math.floor(d/65536)),h=(d=h+e+65535)-65536*(e=Math.floor(d/65536)),i=(d=i+e+65535)-65536*(e=Math.floor(d/65536)),j=(d=j+e+65535)-65536*(e=Math.floor(d/65536)),k=(d=k+e+65535)-65536*(e=Math.floor(d/65536)),l=(d=l+e+65535)-65536*(e=Math.floor(d/65536)),m=(d=m+e+65535)-65536*(e=Math.floor(d/65536)),n=(d=n+e+65535)-65536*(e=Math.floor(d/65536)),o=(d=o+e+65535)-65536*(e=Math.floor(d/65536)),p=(d=p+e+65535)-65536*(e=Math.floor(d/65536)),q=(d=q+e+65535)-65536*(e=Math.floor(d/65536)),r=(d=r+e+65535)-65536*(e=Math.floor(d/65536)),s=(d=s+e+65535)-65536*(e=Math.floor(d/65536)),t=(d=t+e+65535)-65536*(e=Math.floor(d/65536)),u=(d=u+e+65535)-65536*(e=Math.floor(d/65536)),a[0]=f+=e-1+37*(e-1),a[1]=g,a[2]=h,a[3]=i,a[4]=j,a[5]=k,a[6]=l,a[7]=m,a[8]=n,a[9]=o,a[10]=p,a[11]=q,a[12]=r,a[13]=s,a[14]=t,a[15]=u}cz.kem=cz.kem||{};var e6=cz.jsbn.BigInteger;function e7(a,b,c,d){a.generate=function(a,e){for(var f=new cz.util.ByteBuffer,g=Math.ceil(e/d)+c,h=new cz.util.ByteBuffer,i=c;i<g;++i){h.putInt32(i),b.start(),b.update(a+h.getBytes());var j=b.digest();f.putBytes(j.getBytes(d))}return f.truncate(f.length()-e),f.getBytes()}}cz.kem.rsa={},cz.kem.rsa.create=function(a,b){var c=(b=b||{}).prng||cz.random;return{encrypt:function(b,d){var e,f=Math.ceil(b.n.bitLength()/8);do e=new e6(cz.util.bytesToHex(c.getBytesSync(f)),16).mod(b.n);while(0>=e.compareTo(e6.ONE))var g=f-(e=cz.util.hexToBytes(e.toString(16))).length;return g>0&&(e=cz.util.fillString("\0",g)+e),{encapsulation:b.encrypt(e,"NONE"),key:a.generate(e,d)}},decrypt:function(b,c,d){var e=b.decrypt(c,"NONE");return a.generate(e,d)}}},cz.kem.kdf1=function(a,b){e7(this,a,0,b||a.digestLength)},cz.kem.kdf2=function(a,b){e7(this,a,1,b||a.digestLength)},cz.log=cz.log||{},cz.log.levels=["none","error","warning","info","debug","verbose","max"];var e8={},e9=[],fa=null;cz.log.LEVEL_LOCKED=2,cz.log.NO_LEVEL_CHECK=4,cz.log.INTERPOLATE=8;for(var fb=0;fb<cz.log.levels.length;++fb){var fc=cz.log.levels[fb];e8[fc]={index:fb,name:fc.toUpperCase()}}cz.log.logMessage=function(a){for(var b=e8[a.level].index,c=0;c<e9.length;++c){var d=e9[c];d.flags&cz.log.NO_LEVEL_CHECK?d.f(a):b<=e8[d.level].index&&d.f(d,a)}},cz.log.prepareStandard=function(a){"standard"in a||(a.standard=e8[a.level].name+" ["+a.category+"] "+a.message)},cz.log.prepareFull=function(a){if(!("full"in a)){var b=[a.message];b=b.concat([]),a.full=cz.util.format.apply(this,b)}},cz.log.prepareStandardFull=function(a){"standardFull"in a||(cz.log.prepareStandard(a),a.standardFull=a.standard)};var fd=["error","warning","info","debug","verbose"];for(fb=0;fb<fd.length;++fb)!function(a){cz.log[a]=function(b,c){var d=Array.prototype.slice.call(arguments).slice(2),e={timestamp:new Date,level:a,category:b,message:c,arguments:d};cz.log.logMessage(e)}}(fd[fb]);if(cz.log.makeLogger=function(a){var b={flags:0,f:a};return cz.log.setLevel(b,"none"),b},cz.log.setLevel=function(a,b){var c=!1;if(a&&!(a.flags&cz.log.LEVEL_LOCKED)){for(var d=0;d<cz.log.levels.length;++d)if(b==cz.log.levels[d]){a.level=b,c=!0;break}}return c},cz.log.lock=function(a,b){void 0===b||b?a.flags|=cz.log.LEVEL_LOCKED:a.flags&=~cz.log.LEVEL_LOCKED},cz.log.addLogger=function(a){e9.push(a)},"u">typeof console&&"log"in console){if(console.error&&console.warn&&console.info&&console.debug){var fe={error:console.error,warning:console.warn,info:console.info,debug:console.debug,verbose:console.debug},ff=function(a,b){cz.log.prepareStandard(b);var c=fe[b.level],d=[b.standard];d=d.concat(b.arguments.slice()),c.apply(console,d)};b=cz.log.makeLogger(ff)}else ff=function(a,b){cz.log.prepareStandardFull(b),console.log(b.standardFull)},b=cz.log.makeLogger(ff);cz.log.setLevel(b,"debug"),cz.log.addLogger(b),fa=b}else console={log:function(){}};cz.log.consoleLogger=fa,cB(function(a){var b=cz.asn1,c=a.exports=cz.pkcs7=cz.pkcs7||{};function d(a){var c;if(a.type===cz.pki.oids.contentType)c=b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.value).getBytes());else if(a.type===cz.pki.oids.messageDigest)c=b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,a.value.bytes());else if(a.type===cz.pki.oids.signingTime){var d=new Date("1950-01-01T00:00:00Z"),e=new Date("2050-01-01T00:00:00Z"),f=a.value;if("string"==typeof f){var g=Date.parse(f);f=isNaN(g)?13===f.length?b.utcTimeToDate(f):b.generalizedTimeToDate(f):new Date(g)}c=f>=d&&f<e?b.create(b.Class.UNIVERSAL,b.Type.UTCTIME,!1,b.dateToUtcTime(f)):b.create(b.Class.UNIVERSAL,b.Type.GENERALIZEDTIME,!1,b.dateToGeneralizedTime(f))}return b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.type).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SET,!0,[c])])}function e(a,c,d){var e={};if(!b.validate(c,d,e,[])){var f=Error("Cannot read PKCS#7 message. ASN.1 object is not a supported PKCS#7 message.");throw f.errors=f,f}if(b.derToOid(e.contentType)!==cz.pki.oids.data)throw Error("Unsupported PKCS#7 message. Only wrapped ContentType Data supported.");if(e.encryptedContent){var g="";if(cz.util.isArray(e.encryptedContent))for(var h=0;h<e.encryptedContent.length;++h){if(e.encryptedContent[h].type!==b.Type.OCTETSTRING)throw Error("Malformed PKCS#7 message, expecting encrypted content constructed of only OCTET STRING objects.");g+=e.encryptedContent[h].value}else g=e.encryptedContent;a.encryptedContent={algorithm:b.derToOid(e.encAlgorithm),parameter:cz.util.createBuffer(e.encParameter.value),content:cz.util.createBuffer(g)}}if(e.content){if(g="",cz.util.isArray(e.content))for(h=0;h<e.content.length;++h){if(e.content[h].type!==b.Type.OCTETSTRING)throw Error("Malformed PKCS#7 message, expecting content constructed of only OCTET STRING objects.");g+=e.content[h].value}else g=e.content;a.content=cz.util.createBuffer(g)}return a.version=e.version.charCodeAt(0),a.rawCapture=e,e}function f(a){if(void 0===a.encryptedContent.key)throw Error("Symmetric key not available.");if(void 0===a.content){var b;switch(a.encryptedContent.algorithm){case cz.pki.oids["aes128-CBC"]:case cz.pki.oids["aes192-CBC"]:case cz.pki.oids["aes256-CBC"]:b=cz.aes.createDecryptionCipher(a.encryptedContent.key);break;case cz.pki.oids.desCBC:case cz.pki.oids["des-EDE3-CBC"]:b=cz.des.createDecryptionCipher(a.encryptedContent.key);break;default:throw Error("Unsupported symmetric cipher, OID "+a.encryptedContent.algorithm)}if(b.start(a.encryptedContent.parameter),b.update(a.encryptedContent.content),!b.finish())throw Error("Symmetric decryption failed.");a.content=b.output}}c.messageFromPem=function(a){var d=cz.pem.decode(a)[0];if("PKCS7"!==d.type){var e=Error('Could not convert PKCS#7 message from PEM; PEM header type is not "PKCS#7".');throw e.headerType=d.type,e}if(d.procType&&"ENCRYPTED"===d.procType.type)throw Error("Could not convert PKCS#7 message from PEM; PEM is encrypted.");var f=b.fromDer(d.body);return c.messageFromAsn1(f)},c.messageToPem=function(a,c){var d={type:"PKCS7",body:b.toDer(a.toAsn1()).getBytes()};return cz.pem.encode(d,{maxline:c})},c.messageFromAsn1=function(a){var d={},e=[];if(!b.validate(a,c.asn1.contentInfoValidator,d,e)){var f=Error("Cannot read PKCS#7 message. ASN.1 object is not an PKCS#7 ContentInfo.");throw f.errors=e,f}var g,h=b.derToOid(d.contentType);switch(h){case cz.pki.oids.envelopedData:g=c.createEnvelopedData();break;case cz.pki.oids.encryptedData:g=c.createEncryptedData();break;case cz.pki.oids.signedData:g=c.createSignedData();break;default:throw Error("Cannot read PKCS#7 message. ContentType with OID "+h+" is not (yet) supported.")}return g.fromAsn1(d.content.value[0]),g},c.createSignedData=function(){var a=null;return a={type:cz.pki.oids.signedData,version:1,certificates:[],crls:[],signers:[],digestAlgorithmIdentifiers:[],contentInfo:null,signerInfos:[],fromAsn1:function(b){if(e(a,b,c.asn1.signedDataValidator),a.certificates=[],a.crls=[],a.digestAlgorithmIdentifiers=[],a.contentInfo=null,a.signerInfos=[],a.rawCapture.certificates)for(var d=a.rawCapture.certificates.value,f=0;f<d.length;++f)a.certificates.push(cz.pki.certificateFromAsn1(d[f]))},toAsn1:function(){a.contentInfo||a.sign();for(var c=[],d=0;d<a.certificates.length;++d)c.push(cz.pki.certificateToAsn1(a.certificates[d]));var e=[],f=b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer(a.version).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SET,!0,a.digestAlgorithmIdentifiers),a.contentInfo])]);return c.length>0&&f.value[0].value.push(b.create(b.Class.CONTEXT_SPECIFIC,0,!0,c)),e.length>0&&f.value[0].value.push(b.create(b.Class.CONTEXT_SPECIFIC,1,!0,e)),f.value[0].value.push(b.create(b.Class.UNIVERSAL,b.Type.SET,!0,a.signerInfos)),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.type).getBytes()),f])},addSigner:function(b){var c=b.issuer,d=b.serialNumber;if(b.certificate){var e=b.certificate;"string"==typeof e&&(e=cz.pki.certificateFromPem(e)),c=e.issuer.attributes,d=e.serialNumber}var f=b.key;if(!f)throw Error("Could not add PKCS#7 signer; no private key specified.");"string"==typeof f&&(f=cz.pki.privateKeyFromPem(f));var g=b.digestAlgorithm||cz.pki.oids.sha1;switch(g){case cz.pki.oids.sha1:case cz.pki.oids.sha256:case cz.pki.oids.sha384:case cz.pki.oids.sha512:case cz.pki.oids.md5:break;default:throw Error("Could not add PKCS#7 signer; unknown message digest algorithm: "+g)}var h=b.authenticatedAttributes||[];if(h.length>0){for(var i=!1,j=!1,k=0;k<h.length;++k){var l=h[k];if(i||l.type!==cz.pki.oids.contentType){if(j||l.type!==cz.pki.oids.messageDigest);else if(j=!0,i)break}else if(i=!0,j)break}if(!i||!j)throw Error("Invalid signer.authenticatedAttributes. If signer.authenticatedAttributes is specified, then it must contain at least two attributes, PKCS #9 content-type and PKCS #9 message-digest.")}a.signers.push({key:f,version:1,issuer:c,serialNumber:d,digestAlgorithm:g,signatureAlgorithm:cz.pki.oids.rsaEncryption,signature:null,authenticatedAttributes:h,unauthenticatedAttributes:[]})},sign:function(c){var e;c=c||{},("object"!=typeof a.content||null===a.contentInfo)&&(a.contentInfo=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(cz.pki.oids.data).getBytes())]),"content"in a&&(a.content instanceof cz.util.ByteBuffer?e=a.content.bytes():"string"==typeof a.content&&(e=cz.util.encodeUtf8(a.content)),c.detached?a.detachedContent=b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,e):a.contentInfo.value.push(b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,e)])))),0!==a.signers.length&&function(c){if(!(e=a.detachedContent?a.detachedContent:(e=a.contentInfo.value[1]).value[0]))throw Error("Could not sign PKCS#7 message; there is no content to sign.");var e,f=b.derToOid(a.contentInfo.value[0].value),g=b.toDer(e);for(var h in g.getByte(),b.getBerValueLength(g),g=g.getBytes(),c)c[h].start().update(g);for(var i=new Date,j=0;j<a.signers.length;++j){var k=a.signers[j];if(0===k.authenticatedAttributes.length){if(f!==cz.pki.oids.data)throw Error("Invalid signer; authenticatedAttributes must be present when the ContentInfo content type is not PKCS#7 Data.")}else{k.authenticatedAttributesAsn1=b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[]);for(var l=b.create(b.Class.UNIVERSAL,b.Type.SET,!0,[]),m=0;m<k.authenticatedAttributes.length;++m){var n=k.authenticatedAttributes[m];n.type===cz.pki.oids.messageDigest?n.value=c[k.digestAlgorithm].digest():n.type===cz.pki.oids.signingTime&&(n.value||(n.value=i)),l.value.push(d(n)),k.authenticatedAttributesAsn1.value.push(d(n))}g=b.toDer(l).getBytes(),k.md.start().update(g)}k.signature=k.key.sign(k.md,"RSASSA-PKCS1-V1_5")}a.signerInfos=function(a){for(var c=[],e=0;e<a.length;++e)c.push(function(a){var c=b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer(a.version).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[cz.pki.distinguishedNameToAsn1({attributes:a.issuer}),b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,cz.util.hexToBytes(a.serialNumber))]),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.digestAlgorithm).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.NULL,!1,"")])]);if(a.authenticatedAttributesAsn1&&c.value.push(a.authenticatedAttributesAsn1),c.value.push(b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.signatureAlgorithm).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.NULL,!1,"")])),c.value.push(b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,a.signature)),a.unauthenticatedAttributes.length>0){for(var e=b.create(b.Class.CONTEXT_SPECIFIC,1,!0,[]),f=0;f<a.unauthenticatedAttributes.length;++f)e.values.push(d(a.unauthenticatedAttributes[f]));c.value.push(e)}return c}(a[e]));return c}(a.signers)}(function(){for(var c={},d=0;d<a.signers.length;++d){var e=a.signers[d];(f=e.digestAlgorithm)in c||(c[f]=cz.md[cz.pki.oids[f]].create()),e.md=0===e.authenticatedAttributes.length?c[f]:cz.md[cz.pki.oids[f]].create()}for(var f in a.digestAlgorithmIdentifiers=[],c)a.digestAlgorithmIdentifiers.push(b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(f).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.NULL,!1,"")]));return c}())},verify:function(){throw Error("PKCS#7 signature verification not yet implemented.")},addCertificate:function(b){"string"==typeof b&&(b=cz.pki.certificateFromPem(b)),a.certificates.push(b)},addCertificateRevokationList:function(a){throw Error("PKCS#7 CRL support not yet implemented.")}}},c.createEncryptedData=function(){var a=null;return a={type:cz.pki.oids.encryptedData,version:0,encryptedContent:{algorithm:cz.pki.oids["aes256-CBC"]},fromAsn1:function(b){e(a,b,c.asn1.encryptedDataValidator)},decrypt:function(b){void 0!==b&&(a.encryptedContent.key=b),f(a)}}},c.createEnvelopedData=function(){var a=null;return a={type:cz.pki.oids.envelopedData,version:0,recipients:[],encryptedContent:{algorithm:cz.pki.oids["aes256-CBC"]},fromAsn1:function(d){var f=e(a,d,c.asn1.envelopedDataValidator);a.recipients=function(a){for(var d=[],e=0;e<a.length;++e)d.push(function(a){var d={},e=[];if(!b.validate(a,c.asn1.recipientInfoValidator,d,e)){var f=Error("Cannot read PKCS#7 RecipientInfo. ASN.1 object is not an PKCS#7 RecipientInfo.");throw f.errors=e,f}return{version:d.version.charCodeAt(0),issuer:cz.pki.RDNAttributesAsArray(d.issuer),serialNumber:cz.util.createBuffer(d.serial).toHex(),encryptedContent:{algorithm:b.derToOid(d.encAlgorithm),parameter:d.encParameter?d.encParameter.value:void 0,content:d.encKey}}}(a[e]));return d}(f.recipientInfos.value)},toAsn1:function(){var c;return b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(a.type).getBytes()),b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer(a.version).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SET,!0,function(a){for(var c,d=[],e=0;e<a.length;++e)d.push(b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,b.integerToDer((c=a[e]).version).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[cz.pki.distinguishedNameToAsn1({attributes:c.issuer}),b.create(b.Class.UNIVERSAL,b.Type.INTEGER,!1,cz.util.hexToBytes(c.serialNumber))]),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.encryptedContent.algorithm).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.NULL,!1,"")]),b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,c.encryptedContent.content)]));return d}(a.recipients)),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,(c=a.encryptedContent,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(cz.pki.oids.data).getBytes()),b.create(b.Class.UNIVERSAL,b.Type.SEQUENCE,!0,[b.create(b.Class.UNIVERSAL,b.Type.OID,!1,b.oidToDer(c.algorithm).getBytes()),c.parameter?b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,c.parameter.getBytes()):void 0]),b.create(b.Class.CONTEXT_SPECIFIC,0,!0,[b.create(b.Class.UNIVERSAL,b.Type.OCTETSTRING,!1,c.content.getBytes())])]))])])])},findRecipient:function(b){for(var c=b.issuer.attributes,d=0;d<a.recipients.length;++d){var e=a.recipients[d],f=e.issuer;if(e.serialNumber===b.serialNumber&&f.length===c.length){for(var g=!0,h=0;h<c.length;++h)if(f[h].type!==c[h].type||f[h].value!==c[h].value){g=!1;break}if(g)return e}}return null},decrypt:function(b,c){if(void 0===a.encryptedContent.key&&void 0!==b&&void 0!==c)switch(b.encryptedContent.algorithm){case cz.pki.oids.rsaEncryption:case cz.pki.oids.desCBC:var d=c.decrypt(b.encryptedContent.content);a.encryptedContent.key=cz.util.createBuffer(d);break;default:throw Error("Unsupported asymmetric cipher, OID "+b.encryptedContent.algorithm)}f(a)},addRecipient:function(b){a.recipients.push({version:0,issuer:b.issuer.attributes,serialNumber:b.serialNumber,encryptedContent:{algorithm:cz.pki.oids.rsaEncryption,key:b.publicKey}})},encrypt:function(b,c){if(void 0===a.encryptedContent.content){switch(b=b||a.encryptedContent.key,c=c||a.encryptedContent.algorithm){case cz.pki.oids["aes128-CBC"]:d=16,e=16,f=cz.aes.createEncryptionCipher;break;case cz.pki.oids["aes192-CBC"]:d=24,e=16,f=cz.aes.createEncryptionCipher;break;case cz.pki.oids["aes256-CBC"]:d=32,e=16,f=cz.aes.createEncryptionCipher;break;case cz.pki.oids["des-EDE3-CBC"]:d=24,e=8,f=cz.des.createEncryptionCipher;break;default:throw Error("Unsupported symmetric cipher, OID "+c)}if(void 0===b)b=cz.util.createBuffer(cz.random.getBytes(d));else if(b.length()!=d)throw Error("Symmetric key has wrong length; got "+b.length()+" bytes, expected "+d+".");a.encryptedContent.algorithm=c,a.encryptedContent.key=b,a.encryptedContent.parameter=cz.util.createBuffer(cz.random.getBytes(e));var d,e,f,g=f(b);if(g.start(a.encryptedContent.parameter.copy()),g.update(a.content),!g.finish())throw Error("Symmetric encryption failed.");a.encryptedContent.content=g.output}for(var h=0;h<a.recipients.length;++h){var i=a.recipients[h];if(void 0===i.encryptedContent.content){if(i.encryptedContent.algorithm!==cz.pki.oids.rsaEncryption)throw Error("Unsupported asymmetric cipher, OID "+i.encryptedContent.algorithm);i.encryptedContent.content=i.encryptedContent.key.encrypt(a.encryptedContent.key.data)}}}}}}),cB(function(a){var b=a.exports=cz.ssh=cz.ssh||{};function c(a,b){var c=b.toString(16);c[0]>="8"&&(c="00"+c);var d=cz.util.hexToBytes(c);a.putInt32(d.length),a.putBytes(d)}function d(a,b){a.putInt32(b.length),a.putString(b)}function e(){for(var a=cz.md.sha1.create(),b=arguments.length,c=0;c<b;++c)a.update(arguments[c]);return a.digest()}b.privateKeyToPutty=function(a,b,f){var g="ssh-rsa",h=""===(b=b||"")?"none":"aes256-cbc",i="PuTTY-User-Key-File-2: "+g+"\r\n";i+="Encryption: "+h+"\r\n",i+="Comment: "+(f=f||"")+"\r\n";var j=cz.util.createBuffer();d(j,g),c(j,a.e),c(j,a.n);var k=cz.util.encode64(j.bytes(),64),l=Math.floor(k.length/66)+1;i+="Public-Lines: "+l+"\r\n",i+=k;var m,n=cz.util.createBuffer();if(c(n,a.d),c(n,a.p),c(n,a.q),c(n,a.qInv),b){var o=n.length()+16-1;o-=o%16;var p=e(n.bytes());p.truncate(p.length()-o+n.length()),n.putBuffer(p);var q=cz.util.createBuffer();q.putBuffer(e("\0\0\0\0",b)),q.putBuffer(e("\0\0\0\x01",b));var r=cz.aes.createEncryptionCipher(q.truncate(8),"CBC");r.start(cz.util.createBuffer().fillWithByte(0,16)),r.update(n.copy()),r.finish();var s=r.output;s.truncate(16),m=cz.util.encode64(s.bytes(),64)}else m=cz.util.encode64(n.bytes(),64);i+="\r\nPrivate-Lines: "+(l=Math.floor(m.length/66)+1)+"\r\n",i+=m;var t=e("putty-private-key-file-mac-key",b),u=cz.util.createBuffer();d(u,g),d(u,h),d(u,f),u.putInt32(j.length()),u.putBuffer(j),u.putInt32(n.length()),u.putBuffer(n);var v=cz.hmac.create();return v.start("sha1",t),v.update(u.bytes()),i+"\r\nPrivate-MAC: "+v.digest().toHex()+"\r\n"},b.publicKeyToOpenSSH=function(a,b){var e="ssh-rsa";b=b||"";var f=cz.util.createBuffer();return d(f,e),c(f,a.e),c(f,a.n),e+" "+cz.util.encode64(f.bytes())+" "+b},b.privateKeyToOpenSSH=function(a,b){return b?cz.pki.encryptRsaPrivateKey(a,b,{legacy:!0,algorithm:"aes128"}):cz.pki.privateKeyToPem(a)},b.getPublicKeyFingerprint=function(a,b){var e=(b=b||{}).md||cz.md.md5.create(),f=cz.util.createBuffer();d(f,"ssh-rsa"),c(f,a.e),c(f,a.n),e.start(),e.update(f.getBytes());var g=e.digest();if("hex"===b.encoding){var h=g.toHex();return b.delimiter?h.match(/.{2}/g).join(b.delimiter):h}if("binary"===b.encoding)return g.getBytes();if(b.encoding)throw Error('Unknown encoding "'+b.encoding+'".');return g}});var fg=cy("fieldValues"),fh=cy("paymentProduct"),fi=cy("accountOnFile"),fj=cy("tokenize");class fk{constructor(){Object.defineProperty(this,fg,{writable:!0,value:void 0}),Object.defineProperty(this,fh,{writable:!0,value:void 0}),Object.defineProperty(this,fi,{writable:!0,value:void 0}),Object.defineProperty(this,fj,{writable:!0,value:void 0}),cw(this,fg)[fg]=new Map,cw(this,fj)[fj]=!1}setValue(a,b){cw(this,fg)[fg].set(a,b)}setValues(a){for(let[b,c]of Object.entries(a))this.setValue(b,c)}setTokenize(a){cw(this,fj)[fj]=a}getTokenize(){return cw(this,fj)[fj]}getErrorMessageIds(){return Array.from(cw(this,fg)[fg].entries()).flatMap(([a,b])=>{var c;let d=null==(c=cw(this,fh)[fh])?void 0:c.paymentProductFieldById[a];return null==d?void 0:d.getErrorCodes(b)}).filter(Boolean)}getValue(a){return cw(this,fg)[fg].get(a)}getValues(){return Object.fromEntries(cw(this,fg)[fg].entries())}getMaskedValue(a){var b;let c=this.getValue(a);if(void 0===c)return c;let d=null==(b=cw(this,fh)[fh])?void 0:b.paymentProductFieldById[a];return d?d.applyMask(c).formattedValue:void 0}getMaskedValues(){return Object.fromEntries(Array.from(cw(this,fg)[fg]).map(([a])=>[a,this.getMaskedValue(a)]))}getUnmaskedValue(a){var b,c;let d=this.getValue(a);if(void 0===d)return d;let e=null==(b=cw(this,fh)[fh])?void 0:b.paymentProductFieldById[a];return e?e.removeMask(null==(c=e.applyMask(d))?void 0:c.formattedValue):void 0}getUnmaskedValues(){return Object.fromEntries(Array.from(cw(this,fg)[fg]).map(([a])=>[a,this.getUnmaskedValue(a)]))}setPaymentProduct(a){"group"!==a.type&&(cw(this,fh)[fh]=a)}getPaymentProduct(){return cw(this,fh)[fh]}setAccountOnFile(a){a&&(a.attributes.forEach(({key:a})=>cw(this,fg)[fg].delete(a)),cw(this,fi)[fi]=a)}getAccountOnFile(){return cw(this,fi)[fi]}getPaymentProductId(){var a;return null==(a=cw(this,fh)[fh])?void 0:a.id}isValid(){let a=this.getPaymentProduct();if(!a)return!1;if(!a.paymentProductFields.length)return!0;if(this.getErrorMessageIds().length)return!1;let b=this.getAccountOnFile();return a.paymentProductFields.reduce((c,d)=>d.dataRestrictions.isRequired?c&&!(!this.getValue(d.id)&&!(c=>{if((null==b?void 0:b.paymentProductId)!==a.id)return!1;let d=null==b?void 0:b.attributeByKey[c];return!!d&&"MUST_WRITE"!==d.status})(d.id)):c&&!0,!0)}}var fl=a.i(93846);let fm=new Map,fn=new Map;function fo({paymentData:a,onPaymentComplete:b,onPaymentError:c,className:f,countryCode:g="DE",currency:h="EUR"}){let i=(0,e.useRef)(!1),j=(0,e.useRef)(c);(0,e.useRef)(null);let[k,l]=(0,e.useState)(!0),[m,n]=(0,e.useState)(!1),[o,p]=(0,e.useState)(null),[q,r]=(0,e.useState)(null),[s,t]=(0,e.useState)(null),[u,v]=(0,e.useState)({cardholderName:"",email:"",phone:"",cardNumber:"",expiryDate:"",cvv:""}),[w,x]=(0,e.useState)({}),y=Math.round(100*Number(a?.amount||0)),z=(0,e.useMemo)(()=>!!(u.cardholderName.trim()&&u.email.trim()&&u.cardNumber.trim()&&u.expiryDate.trim()&&u.cvv.trim()&&Object.values(w).every(a=>!a)),[w,u]),A=String(h||"EUR").toUpperCase(),B=a=>String(a??"").replace(/\D/g,""),C=a=>String(a??"").replace(/\D/g,""),D=a=>String(a??"").replace(/\D/g,"").slice(0,4),E=a=>{let b=b=>{try{if("function"==typeof a?.getValue)return a.getValue(b)}catch{}try{return a?.[b]}catch{}},c=null;try{let b=a?.validate?.();c=b&&"object"==typeof b?{isValid:b.isValid,errorCount:Array.isArray(b.errors)?b.errors.length:void 0,errors:b.errors??void 0}:b}catch(a){c={threw:!0,message:String(a?.message||a)}}return{cardNumber:b("cardNumber"),expiryDate:b("expiryDate"),cvv:b("cvv"),cardholderName:b("cardholderName"),securityCode:b("securityCode"),expiryMonth:b("expiryMonth"),expiryYear:b("expiryYear"),keys:(()=>{try{return Object.keys(a||{})}catch{return[]}})(),validation:c}},F=(a,b)=>{try{if("function"==typeof a?.getField)return a.getField(b)}catch{}return a?.paymentProductFieldById?.[b]?a.paymentProductFieldById[b]:Array.isArray(a?.paymentProductFields)&&a.paymentProductFields.find(a=>a?.id===b)||null},G=(a,b)=>{if(!Array.isArray(a)||0===a.length)return"";let c=a?.[0]?.errorMessage||a?.[0]?.message||a?.[0]?.id;return"string"==typeof c&&c.trim()?c:b},H=(a,b)=>{let c=String(b??"");if("cardNumber"===a)c=c.replace(/\D/g,"").slice(0,19).replace(/(.{4})/g,"$1 ").trim();else if("expiryDate"===a){let a=c.replace(/\D/g,"").slice(0,4);c=a.length>2?a.slice(0,2)+"/"+a.slice(2):a}else"cvv"===a&&(c=c.replace(/\D/g,"").slice(0,4));v(b=>{let d={...b,[a]:c};return(a=>{if(!s)return;let b=B(a.cardNumber);String(a.expiryDate??"").replace(/\D/g,"").slice(0,4);let c=D(a.expiryDate),d=C(a.cvv),e=F(s,"cardNumber"),f=F(s,"expiryDate"),g=F(s,"cvv")||F(s,"securityCode"),h=e?.validate?.(b),i=f?.validate?.(c),j=g?.validate?.(d);x({cardNumber:G(h,"Invalid card number"),expiryDate:G(i,"Invalid expiry date"),cvv:G(j,"Invalid CVV")})})(d),d})};(0,e.useEffect)(()=>{j.current=c},[c]),(0,e.useEffect)(()=>{let a=!0,b=`${g}:${A}:${y}`;return(async()=>{try{return}catch(d){if(fm.delete(b),fn.delete(b),i.current||(console.error("[WorldlineInlineCardForm][session-init]",d),i.current=!0),!a)return;let c="Could not initialize secure card payment.";p(c),j.current(c)}finally{a&&l(!1)}})(),()=>{a=!1}},[y,g,A]);let I=async c=>{if(c.preventDefault(),!q||!s){let a="Worldline SDK not ready";p(a),j.current(a);return}let d=[],e=null,f=null,g=null,i=null;try{let c;n(!0),p(null);let j=B(u.cardNumber),k=String(u.expiryDate??""),l=D(k),m=C(u.cvv),o=String(u.cardholderName??"").trim();if(j.length<12)throw Error("Card number is incomplete");if(4!==l.length)throw Error("Expiry date must be MM/YY");if(m.length<3)throw Error("CVV is incomplete");if(!o)throw Error("Cardholder name is required");let r=(a,b,c)=>{let d={fieldId:b,value:c,ok:!1,errors:[]};if(!c)return d;try{"function"==typeof a?.setValue?(a.setValue(b,c),d.ok=!0):d.errors.push("setValue is unavailable")}catch(a){d.errors.push(String(a?.message||a))}return d},t=(a,b)=>{try{if("function"==typeof a?.getValue)return a.getValue(b)}catch{}try{return a?.[b]}catch{}},v=async a=>{if("function"==typeof q?.encryptPaymentRequest)return await q.encryptPaymentRequest(a);if("function"==typeof q?.preparePaymentRequest)return await q.preparePaymentRequest(a);if("function"==typeof q?.getEncryptor){let b=q.getEncryptor();if("function"==typeof b?.encrypt)return await b.encrypt(a)}throw Error("No supported Worldline encryption method found")};for(let a of((c=[]).push({name:"new PaymentRequest()+setPaymentProduct(paymentProduct)",build:()=>{let a=new fk;try{"function"==typeof a?.setPaymentProduct&&a.setPaymentProduct(s)}catch{}return a}}),c).filter(a=>"function"==typeof a?.build)){let b={strategy:a.name,buildOk:!1,setResults:null,requestValuesAfterSet:null,encryptOk:!1,encryptError:null},c=null;try{if(!(c=a.build())){b.encryptError="builder returned null",d.push(b);continue}b.buildOk=!0,b.setResults={cardNumber:r(c,"cardNumber",j),expiryDate:r(c,"expiryDate",l),cvv:r(c,"cvv",m),cardholderName:r(c,"cardholderName",o)},b.requestValuesAfterSet={cardNumber:t(c,"cardNumber"),expiryDate:t(c,"expiryDate"),cvv:t(c,"cvv"),cardholderName:t(c,"cardholderName")};let h=await v(c);b.encryptOk=!0,e=a.name,f=c,g=h,i=b.requestValuesAfterSet,d.push(b);break}catch(a){b.encryptError=String(a?.message||a);try{b.encryptErrorValidationErrors=a?.validationErrors??null}catch{}try{b.validationProbeAfterError=E(c)}catch{}d.push(b)}}console.info("[WorldlineInlineCardForm] CONSTRUCTOR ATTEMPTS",d);try{let a="function"==typeof f?.validate?f.validate():null;console.info("[WorldlineInlineCardForm] FINAL REQUEST VALIDATION",{chosenStrategy:e,requestValuesAfterSet:i,validateResult:a,probe:E(f)})}catch(a){console.warn("[WorldlineInlineCardForm] FINAL REQUEST VALIDATION failed",a)}if(!f||!g)throw Error("All PaymentRequest construction strategies failed");let w="string"==typeof g?(()=>{try{return JSON.parse(g)}catch{return{encryptedCustomerInput:g}}})():g,x=w?.encryptedCustomerInput??w?.encryptedFields??w?.payload?.encryptedCustomerInput??w?.paymentRequest?.encryptedCustomerInput??f?.encryptedCustomerInput??"",y=w?.encodedClientMetaInfo??w?.payload?.encodedClientMetaInfo??w?.paymentRequest?.encodedClientMetaInfo??f?.encodedClientMetaInfo??"";if(!x||"string"!=typeof x)throw Error("Worldline encryption failed: encrypted customer payload is missing");console.info("[WorldlineInlineCardForm] CREATE PAYMENT PAYLOAD",{url:"/api/v1/payments/worldline/inline/create-payment",amount:Number(a?.amount||0),currency:String(h||"EUR").toUpperCase(),paymentProductId:Number(s?.id||1),encryptedCustomerInputPreview:x?String(x).slice(0,16)+"…":null,hasEncodedClientMetaInfo:!!y});let z=await fetch("/api/v1/payments/worldline/inline/create-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:Number(a?.amount||0),currency:String(h||"EUR").toUpperCase(),paymentProductId:Number(s?.id||1),encryptedCustomerInput:x,encodedClientMetaInfo:y,cardholderName:u.cardholderName,email:u.email,phone:u.phone})}),A=await z.json().catch(()=>({}));if(!z.ok||!A?.success||!A?.payment_id)throw Error(A?.error||"Worldline inline payment failed");let F=await fetch("/api/v1/payments/worldline/inline/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payment_id:String(A.payment_id)})}),G=await F.json().catch(()=>({}));if(!F.ok||!G?.success||!G?.is_paid)throw Error("Worldline payment is not finalized yet");b({success:!0,transactionId:String(G.payment_id||A.payment_id),paymentMethod:"worldline"})}catch(l){let a="string"==typeof l?.message?l.message:"",b=String(u.expiryDate??""),c=D(b),f=c.length>=4?`${c.slice(0,2)}/${c.slice(2,4)}`:b,g=Array.isArray(s?.paymentProductFields)?s.paymentProductFields.map(a=>String(a?.id??"")).filter(Boolean):"function"==typeof s?.getFields?s.getFields().map(a=>String(a?.id??"")).filter(Boolean):Object.keys(s?.paymentProductFieldById||{}),h={rawError:a,paymentProductId:Number(s?.id||0),sdkDebug:(()=>{try{return window.__pmdWorldlineSdkDebug??null}catch(a){return{threw:!0,message:String(a?.message||a)}}})(),sessionDataDebug:(()=>{try{let a=window.__pmdWorldlineSessionData;if(!a)return null;return{keys:Object.keys(a||{}),clientSessionIdPresent:!!a?.clientSessionId,customerIdPresent:!!a?.customerId,clientApiUrl:a?.clientApiUrl??null,assetUrl:a?.assetUrl??null,environment:a?.environment??null}}catch(a){return{threw:!0,message:String(a?.message||a)}}})(),paymentProductDebug:(()=>{try{return window.__pmdWorldlineProductDebug??null}catch(a){return{threw:!0,message:String(a?.message||a)}}})(),availableFieldIds:g,sentValues:{cardNumber:String(u.cardNumber??""),expiryDate:b,expiryDigits:c,expiryMasked:f,cvv:String(u.cvv??""),cardholderName:String(u.cardholderName??""),email:String(u.email??"")},chosenStrategy:e,requestValuesAfterSet:i,constructorAttempts:d},k=(a||"Payment could not be completed. Please check your details and try again.")+"\n\nDEBUG:\n"+JSON.stringify(h,null,2);p(k),j.current(k)}finally{n(!1)}};return(0,d.jsxs)("form",{onSubmit:I,className:(0,aD.cn)("space-y-4",f),children:[(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(cs.Label,{htmlFor:"wlCardNumber",children:"Card number"}),(0,d.jsx)(fl.Input,{id:"wlCardNumber",value:u.cardNumber,onChange:a=>H("cardNumber",a.target.value),required:!0,autoComplete:"cc-number",className:"h-11 rounded-xl text-[15px]"}),w.cardNumber?(0,d.jsx)("p",{className:"text-xs text-red-500",children:w.cardNumber}):null]}),(0,d.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(cs.Label,{htmlFor:"wlExpiry",children:"Expiry (MMYY)"}),(0,d.jsx)(fl.Input,{id:"wlExpiry",value:u.expiryDate,onChange:a=>H("expiryDate",a.target.value),required:!0,autoComplete:"off",className:"h-11 rounded-xl"}),w.expiryDate?(0,d.jsx)("p",{className:"text-xs text-red-500",children:w.expiryDate}):null]}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(cs.Label,{htmlFor:"wlCvv",children:"CVV"}),(0,d.jsx)(fl.Input,{id:"wlCvv",value:u.cvv,onChange:a=>H("cvv",a.target.value),required:!0,autoComplete:"cc-csc",className:"h-11 rounded-xl"}),w.cvv?(0,d.jsx)("p",{className:"text-xs text-red-500",children:w.cvv}):null]})]}),(0,d.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:[(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(cs.Label,{htmlFor:"wlCardholder",children:"Cardholder name"}),(0,d.jsx)(fl.Input,{id:"wlCardholder",value:u.cardholderName,onChange:a=>H("cardholderName",a.target.value),required:!0,className:"h-11 rounded-xl"})]}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(cs.Label,{htmlFor:"wlEmail",children:"Email"}),(0,d.jsx)(fl.Input,{id:"wlEmail",type:"email",value:u.email,onChange:a=>H("email",a.target.value),required:!0,className:"h-11 rounded-xl"})]})]}),o&&(0,d.jsx)("pre",{className:"text-xs text-red-500 whitespace-pre-wrap break-all rounded-xl p-3 bg-red-50 border border-red-200 overflow-auto",children:o}),(0,d.jsxs)("button",{type:"submit",disabled:k||m||!q||!s||!z,className:"relative w-full min-w-full max-w-full h-[54px] rounded-2xl border-0 overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed",style:{background:"transparent",boxShadow:"none"},children:[(0,d.jsx)("span",{"aria-hidden":"true",style:{position:"absolute",inset:0,zIndex:0,borderRadius:"9999px",background:"linear-gradient(135deg, #063F2F 0%, #062F2A 100%)",boxShadow:"0 8px 22px rgba(6, 47, 42, 0.24)",pointerEvents:"none"}}),(0,d.jsx)("span",{style:{position:"relative",zIndex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",color:"#FFFFFF",fontSize:"16px",fontWeight:700,width:"100%"},children:m?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("span",{className:"animate-spin",style:{width:"16px",height:"16px",border:"2px solid rgba(255,255,255,0.35)",borderTopColor:"#FFFFFF",borderRadius:"9999px"}}),(0,d.jsx)("span",{children:"Processing..."})]}):k?(0,d.jsx)("span",{children:"Initializing..."}):(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(ct,{className:"h-4 w-4"}),(0,d.jsx)("span",{children:"Pay"})]})})]})]})}function fp({paymentData:a,onPaymentComplete:b,onPaymentError:c,className:f,paypalFundingSource:g="paypal"}){let[{isPending:h}]=bR(),[i,j]=(0,e.useState)(!1),k=async()=>{try{let b=await fetch("/api/v1/payments/paypal/create-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}),c=await b.json().catch(()=>({}));console.log("[PMD][PayPalForm][createOrder] =>",c);let d=c?.orderID||c?.orderId||c?.id||c?.paypal?.id;if(!b.ok||!c?.success||!d)throw Error(c?.error||"Failed to create PayPal order");return d}catch(a){throw c(a?.message||"Failed to create PayPal order"),a}},l=async d=>{j(!0);try{let e=await fetch("/api/v1/payments/paypal/capture-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderID:d?.orderID||d?.orderId,orderId:d?.orderID||d?.orderId,paymentData:a})}),f=await e.json().catch(()=>({}));console.log("[PMD][PayPalForm][onApprove] =>",f),e.ok&&f?.success?b({success:!0,transactionId:f.transactionId||f.captureID||f.orderID||d?.orderID,paymentMethod:"paypal"}):c(f?.error||"Payment failed")}catch(a){c(a?.message||"Payment failed")}finally{j(!1)}};return h?(0,d.jsxs)("div",{className:(0,aD.cn)("flex items-center justify-center p-8",f),children:[(0,d.jsx)("div",{className:"w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"}),(0,d.jsx)("span",{className:"ml-2",children:"Loading PayPal..."})]}):(0,d.jsxs)("div",{className:"jsx-2c259872ef1009f9 "+((0,aD.cn)("space-y-4 bg-transparent w-full",f)||""),children:[(0,d.jsx)("div",{className:"jsx-2c259872ef1009f9 text-center",children:(0,d.jsx)("p",{className:"jsx-2c259872ef1009f9 text-sm text-gray-600 mb-4"})}),(0,d.jsx)("div",{className:"jsx-2c259872ef1009f9 paypal-clean-wrap",children:(0,d.jsx)(bU,{fundingSource:g,createOrder:k,onApprove:l,onError:a=>{c(a?.message||"PayPal payment failed")},disabled:i,style:{layout:"vertical",color:"blue",shape:"pill",label:"paypal",tagline:!1,height:45,borderRadius:14}})}),(0,d.jsx)(S.default,{id:"2c259872ef1009f9",children:".paypal-clean-wrap.jsx-2c259872ef1009f9{border-radius:12px;margin:0;padding:0;line-height:0;overflow:hidden;background:0 0!important}.paypal-clean-wrap.jsx-2c259872ef1009f9 div,.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-buttons,.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-button-container,.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-button-row,.paypal-clean-wrap.jsx-2c259872ef1009f9 iframe{background:0 0!important}.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-button-container{border-radius:12px!important;min-width:100%!important;max-width:100%!important;overflow:hidden!important}.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-button-row{border-radius:12px!important;overflow:hidden!important}.paypal-clean-wrap.jsx-2c259872ef1009f9 iframe{border-radius:12px!important;display:block!important}"})]})}function fq(a){let[b,c]=(0,e.useState)(!1),[f,g]=(0,e.useState)(null),h=(0,e.useRef)(!1);return(0,e.useEffect)(()=>{h.current||(h.current=!0,(async()=>{try{c(!0),g(null),console.info("SUMUP_HOSTED_CHECKOUT_REDIRECT",{stage:"init"});let b={amount:a.amount,currency:a.currency,order_id:a.orderId??null,order_type:a.orderType??"guest",description:a.description??"PayMyDine SumUp hosted checkout",return_url:a.successUrl??`${window.location.origin}/payment/sumup/complete`,cancel_url:a.cancelUrl??`${window.location.origin}/menu`},d=await fetch("/api/v1/payments/card/create-session",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(b)}),e=await d.json().catch(()=>null);if(!d.ok||!e?.success)throw Error(e?.message||e?.error||`HTTP ${d.status}`);let f=String(e?.redirect_url||e?.hosted_checkout_url||e?.checkout_url||"").trim(),h=String(e?.checkout_id||"").trim();if(!f)throw Error("No hosted checkout URL returned from SumUp");console.info("SUMUP_HOSTED_CHECKOUT_REDIRECT",{stage:"redirect",checkout_id:h||null,has_redirect_url:!0}),window.location.href=f}catch(a){console.error("SUMUP_HOSTED_CHECKOUT_REDIRECT",{stage:"error",message:a?.message||String(a)}),g(a?.message||"Unable to start SumUp hosted checkout")}finally{c(!1)}})())},[a.amount,a.cancelUrl,a.currency,a.description,a.orderId,a.orderType,a.successUrl]),(0,d.jsxs)("div",{"data-pmd-sumup-hosted-checkout":"1",className:`w-full rounded-xl border p-3 ${a.className??""}`,style:{borderColor:"var(--theme-border)",background:"rgba(255,255,255,0.04)"},children:[(0,d.jsx)("div",{className:"text-sm font-semibold",children:"Secure card payment"}),(0,d.jsx)("div",{className:"text-xs opacity-80",children:"Redirecting to secure SumUp checkout…"}),b&&(0,d.jsx)("div",{className:"text-xs mt-2 opacity-70",children:"Preparing secure checkout…"}),f?(0,d.jsx)("div",{className:"mt-2 rounded-lg px-3 py-2 text-sm",style:{background:"rgba(255,0,0,0.08)",color:"#ff6b6b"},children:f}):null]})}function fr({methodName:a,stripeConfigError:b,stripePromise:c,cardEnabled:e,paymentData:f,onPaymentSuccess:g,onPaymentError:h}){return(0,d.jsxs)("div",{className:"space-y-3 overflow-hidden",children:[(0,d.jsx)("div",{className:"mb-4",children:(0,d.jsx)("span",{className:"font-semibold text-paydine-elegant-gray",children:a||"Card Payment"})}),b&&(0,d.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3",children:(0,d.jsx)("p",{className:"text-xs text-red-300",children:b})}),!b&&!c&&(0,d.jsx)("div",{className:"py-2 text-xs text-paydine-elegant-gray/70",children:"Loading Stripe..."}),e&&c&&(0,d.jsx)(ci,{stripe:c,children:(0,d.jsx)(cv,{paymentData:f,onPaymentComplete:a=>{a?.success&&a?.transactionId&&g(a.transactionId)},onPaymentError:h})}),!e&&(0,d.jsx)("div",{className:"rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800",children:(0,d.jsxs)("span",{className:"inline-flex items-center gap-2",children:[(0,d.jsx)(cu.AlertCircle,{className:"h-4 w-4"}),"Stripe card checkout is not enabled for this restaurant."]})})]})}function fs(b){let c=cp();cj();let[e,f]=a.r(45056).useState(!1),[g,h]=a.r(45056).useState(null),[i,j]=a.r(45056).useState(!1),[k,l]=a.r(45056).useState("");if(a.r(45056).useEffect(()=>{let a=!1;return async function(){try{if(!c)return;let d=(b.currency||"eur").toLowerCase(),e=b.countryCode||"DE";fs._paymentRequest=null;let g=c.paymentRequest({country:e,currency:d,total:{label:"apple_pay"===b.method?"Apple Pay":"Google Pay",amount:Math.round(100*Number(b.amount||0))},requestPayerName:!0,requestPayerEmail:!0}),i=await g.canMakePayment();if(a)return;if(h(!!i),f(!0),!i)return void l("apple_pay"===b.method?"Apple Pay is not available on this browser/device (or wallet is not configured). Please try Safari on iPhone with Apple Pay enabled.":"Google Pay is not available on this browser/device (or wallet is not configured). Please try Chrome with Google Pay enabled.");g.on("paymentmethod",async a=>{try{j(!0);let d=await fetch("/api/v1/payments/stripe/create-intent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:b.amount,currency:(b.currency||"eur").toLowerCase(),preferredMethod:b.method,restaurantId:String(b.restaurantId),cartId:b.cartId?String(b.cartId):null,userId:b.userId?String(b.userId):null,items:b.items||[],customerInfo:b.customerInfo||{},tableNumber:b.tableNumber||null})}),e=await d.json();if(!function(a){if(!a||"object"!=typeof a)return;let b=a=>String(a||"").trim().replace(/-/g,"_").toLowerCase(),c=b(a.admin_theme),d=b(a.data?.admin_theme),e=b(a.frontend_theme),f=b(a.data?.frontend_theme);("kazen_japanese"===c||"kazen_japanese"===d||"kazen_japanese"===e||"kazen_japanese"===f)&&(a.admin_theme="kazen_japanese",a.frontend_theme="kazen_japanese",a.theme_id="kazen_japanese",a.data&&"object"==typeof a.data&&(a.data.admin_theme="kazen_japanese",a.data.frontend_theme="kazen_japanese",a.data.theme_id="kazen_japanese"))}(e),!d.ok||!e?.clientSecret)throw Error(e?.error||"Failed to create payment intent");let{paymentIntent:f,error:g}=await c.confirmCardPayment(e.clientSecret,{payment_method:a.paymentMethod.id},{handleActions:!0});if(g)throw a.complete("fail"),Error(g.message||"Wallet payment failed");if(a.complete("success"),f?.status==="succeeded")b.onSuccess(f.id);else throw Error("Unexpected PI status: "+(f?.status||"unknown"))}catch(a){}finally{j(!1)}}),fs._paymentRequest=g}catch(b){if(a)return;h(!1),f(!0),l(b?.message||String(b))}}(),()=>{a=!0}},[c,b.currency,b.countryCode,b.amount]),!e)return(0,d.jsx)("div",{className:"py-2 text-xs text-gray-500",children:"Loading wallet…"});if(!g)return(0,d.jsx)("div",{className:"rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800",children:k||"Wallet not supported here."});let m=String((b.currency||"eur").toLowerCase())+"-"+String(b.countryCode||"DE")+"-"+String(b.amount),n=fs._paymentRequest;return(0,d.jsxs)("div",{className:"space-y-3",children:[(0,d.jsx)("div",{className:"rounded-xl overflow-hidden",children:(0,d.jsx)(cr,{options:{paymentRequest:n,style:{paymentRequestButton:{type:(b.method,"default"),theme:"dark",height:"44px"}}}},m)}),i&&(0,d.jsx)("div",{className:"text-xs text-gray-500",children:"Processing…"})]})}function ft(a){let{selectedPaymentMethod:b,selectedMethod:c,stripePromise:f,stripeConfig:g,stripeConfigError:h,hasUnsubmittedPaymentDraft:i,checkoutStep:j,setCheckoutStep:k,selectedProviderCode:l,handleBackToMethods:m,paypalConfigLoading:n,effectivePayPalClientId:o,effectivePayPalCurrency:p,resolveSubmittedPaymentAmount:q,itemsToPay:r,stripeResolvedRestaurantId:s,paymentFormData:t,stripeResolvedTableNumber:u,handlePayment:v,toast:w,merchantSettings:x,payableTotal:y,providerInlineError:z,isLoading:A,startHostedRedirectCheckout:B,stripePaymentData:C,finalTotal:D,modalPrimaryBtnStyle:E,cashCollectionConfirmed:F,setCashCollectionConfirmed:G}=a,H=e.default.useRef(null),I=e.default.useCallback((a,b)=>{let c=String(b||"Payment failed. Please try again.").trim(),d=`${a}:${c}`,e=Date.now(),f=H.current;f&&f.key===d&&e-f.at<3500||(H.current={key:d,at:e},w({title:a,description:c,variant:"destructive"}))},[w]);if(!c)return null;if("payment"===j&&i())return(0,d.jsxs)("div",{className:"rounded-2xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-900",children:[(0,d.jsx)("div",{className:"font-semibold",children:"Submit order first"}),(0,d.jsx)("div",{className:"mt-1",children:"Please send the table order to the kitchen first. Payment starts only after the backend creates a real order ID."}),(0,d.jsx)(aC.Button,{type:"button",onClick:()=>k("review"),className:"mt-3 w-full rounded-xl bg-amber-700 text-white hover:bg-amber-800",children:"Back to order review"})]});switch(c.code){case"card":if("paypal"===l)return(0,d.jsxs)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,d.jsxs)("div",{className:"flex items-center gap-2 mb-4",children:[(0,d.jsx)(aC.Button,{variant:"ghost",size:"sm",onClick:m,className:"p-2 h-9 w-9 pmd-v2-action-circle",children:(0,d.jsx)(aB.ArrowLeft,{className:"h-4 w-4"})}),(0,d.jsxs)("div",{className:"flex items-center gap-2",children:[(0,d.jsx)(W.CreditCard,{className:"h-5 w-5 text-paydine-elegant-gray"}),(0,d.jsx)("span",{className:"font-semibold text-paydine-elegant-gray",children:"Card (via PayPal)"})]})]}),n?(0,d.jsx)("div",{className:"rounded-xl p-4 border text-sm text-gray-600",children:"Loading PayPal..."}):o?(0,d.jsx)(bZ,{options:{clientId:o,currency:p,intent:"capture",components:"buttons",disableFunding:"sepa"},children:(0,d.jsx)(fp,{paypalFundingSource:"card",paymentData:{amount:q(),payment_method:"card",currency:p.toLowerCase(),items:r.map(a=>({id:String(a.item.id),name:a.item.name,price:a.price,quantity:a.quantity||1,restaurantId:s})),customerInfo:{name:t?.cardholderName||"",email:t?.email||"",phone:t?.phone||""},restaurantId:s,tableNumber:u},onPaymentComplete:a=>{a?.success&&a?.transactionId&&v(a.transactionId)},onPaymentError:a=>{I("Payment Failed",a)}})}):(0,d.jsx)("div",{className:"rounded-xl p-4 border text-sm text-gray-600",children:"PayPal card checkout is not configured for this restaurant."})]});if(l&&"stripe"!==l){if("worldline"===l)return(0,d.jsxs)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,d.jsx)("div",{className:"mb-2",children:(0,d.jsx)("span",{className:"font-semibold text-paydine-elegant-gray",children:"Worldline card payment"})}),(0,d.jsx)(fo,{paymentData:{amount:q(),payment_method:"card",currency:x?.currency||"EUR",items:r.map(a=>({id:String(a.item.id),name:a.item.name,price:a.price,quantity:a.quantity||1,restaurantId:s})),customerInfo:{name:t?.cardholderName||"",email:t?.email||"",phone:t?.phone||""},restaurantId:s,tableNumber:u},currency:x?.currency||"EUR",countryCode:g?.countryCode||"DE",onPaymentComplete:a=>{a?.success&&a?.transactionId&&v(a.transactionId)},onPaymentError:a=>{I("Worldline Payment Failed",a)}})]});if("sumup"===l)return(0,d.jsxs)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,d.jsx)(fq,{amount:y,currency:x?.currency||"EUR",description:"PayMyDine SumUp checkout",successUrl:"/payment/sumup/complete",cancelUrl:"/menu",className:"w-full"}),z&&(0,d.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:z})]});return(0,d.jsxs)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,d.jsx)("div",{className:"mb-2",children:(0,d.jsx)("span",{className:"font-semibold text-paydine-elegant-gray",children:c?.name||"Card Payment"})}),(0,d.jsx)("div",{className:"rounded-xl border p-3 text-sm text-paydine-elegant-gray/80",children:"vr_payment"===l?"You will be redirected to a secure VR Payment checkout page.":`Your card details will be completed in a secure embedded ${l.toUpperCase()} frame.`}),(0,d.jsx)(aC.Button,{type:"button",onClick:B,disabled:A,className:"w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl",children:A?"Opening secure form...":`Pay with ${"vr_payment"===l?"VR Payment":l.toUpperCase()}`}),z&&(0,d.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:z})]})}return(0,d.jsx)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,d.jsx)(fr,{methodName:c?.name,stripeConfigError:h,stripePromise:f,cardEnabled:g?.methods?.card!==!1,paymentData:C,onPaymentSuccess:v,onPaymentError:a=>{I("Payment Failed",a)}})});case"paypal":return(0,d.jsx)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:"vr_payment"===l?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"rounded-xl border p-3 text-sm text-paydine-elegant-gray/80",children:"You will be redirected to a secure VR Payment PayPal checkout page."}),(0,d.jsx)(aC.Button,{type:"button",onClick:B,disabled:A,className:"w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl",children:A?"Opening PayPal...":"Pay with PayPal"}),z&&(0,d.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:z})]}):n?(0,d.jsx)("div",{className:"rounded-xl p-4 border text-sm text-gray-600",children:"Loading PayPal..."}):o?(0,d.jsx)(bZ,{options:{clientId:o,currency:p,intent:"capture",components:"buttons",disableFunding:"card,sepa"},children:(0,d.jsx)(fp,{paypalFundingSource:"paypal",paymentData:{amount:q(),payment_method:"paypal",currency:p.toLowerCase(),items:r.map(a=>({id:String(a.item.id),name:a.item.name,price:a.price,quantity:a.quantity||1,restaurantId:s})),customerInfo:{name:t?.cardholderName||"",email:t?.email||"",phone:t?.phone||""},restaurantId:s,tableNumber:u},onPaymentComplete:a=>{a?.success&&a?.transactionId&&v(a.transactionId)},onPaymentError:a=>{w({title:"Payment Failed",description:a,variant:"destructive"})}})}):(0,d.jsx)("div",{className:"rounded-xl p-4 border text-sm text-gray-600",children:"PayPal is not configured for this restaurant."})});case"apple_pay":case"google_pay":if(!b)return null;return(0,d.jsx)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:"vr_payment"===l?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{className:"rounded-xl border p-3 text-sm text-paydine-elegant-gray/80",children:"You will be redirected to a secure VR Payment checkout page."}),(0,d.jsx)(aC.Button,{type:"button",onClick:B,disabled:A,className:"w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl",children:A?"Opening wallet...":`Pay with ${"apple_pay"===b?"Apple Pay":"Google Pay"}`}),z&&(0,d.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:z})]}):g?.methods?.[b]?f?(0,d.jsx)(ci,{stripe:f,children:(0,d.jsx)(fs,{method:b,amount:y,currency:g?.currency||x?.currency||"EUR",countryCode:g?.countryCode||"DE",restaurantId:s||"1",cartId:C?.cartId||null,userId:C?.userId||null,items:C?.items||[],customerInfo:C?.customerInfo||{},tableNumber:C?.tableNumber||null,onSuccess:a=>{v(a)},onError:a=>{w({title:"Payment Failed",description:a,variant:"destructive"})}})}):(0,d.jsx)("div",{className:"rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800",children:"Stripe is still loading. Please wait a few seconds and try again."}):(0,d.jsx)("div",{className:"rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800",children:"apple_pay"===b?"Apple Pay is not enabled for this restaurant.":"Google Pay is not enabled for this restaurant."})});case"wero":return(0,d.jsxs)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,d.jsx)("div",{className:"rounded-xl border p-3 text-sm text-paydine-elegant-gray/80",children:"worldline"===l?"You will be redirected to a secure Wero checkout powered by Worldline.":"vr_payment"===l?"You will be redirected to a secure Wero checkout powered by VR Payment.":"You will be redirected to a secure Wero checkout powered by Stripe."}),(0,d.jsx)(aC.Button,{type:"button",onClick:B,disabled:A,className:"w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl",children:A?"Opening Wero...":"Pay with Wero"}),z&&(0,d.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:z})]});case"cod":return(0,d.jsx)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:(0,d.jsxs)("div",{className:"space-y-3",children:[(0,d.jsxs)("div",{className:"bg-gray-50 rounded-xl p-4",children:[(0,d.jsx)("div",{className:"text-sm font-medium text-paydine-elegant-gray mb-2",children:"Total due"}),(0,d.jsx)("div",{className:"text-lg font-bold text-paydine-elegant-gray",children:M("payment"===j?y:D)})]}),(0,d.jsx)(aC.Button,{type:"button",disabled:A,onClick:async()=>{G(!0),await v(void 0,{method_code:"cod",provider_code:null})},className:"w-full",style:E,children:A?"Submitting...":"Confirm cash payment"}),F&&(0,d.jsx)("div",{className:"rounded-xl border p-3 text-sm",style:{borderColor:"var(--theme-border)",color:"var(--theme-text-primary)",background:"var(--theme-surface)"},children:"Please have the exact amount ready when the waiter comes to collect payment."})]})});default:return null}}function fu(a){let{selectedMethod:b,checkoutStep:c,payableTotal:e,finalTotal:f,selectedPaymentMethod:g,handlePayment:h,isLoading:i,paymentFormData:j}=a;return!b||["card","wero","paypal"].includes(b.code)||"apple_pay"===g||"google_pay"===g||"wero"===g?null:(0,d.jsx)(a6,{type:"button",onClick:h,disabled:i||!(()=>{switch(b.code){case"card":case"apple_pay":case"google_pay":case"cod":return!0;case"paypal":return j.email;default:return!1}})(),variant:"primary",fullWidth:!0,children:i?(0,d.jsxs)("div",{className:"flex items-center gap-2",children:[(0,d.jsx)("div",{className:"w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"}),"Processing..."]}):(0,d.jsxs)("div",{className:"flex items-center gap-2",children:[(0,d.jsx)(ct,{className:"h-4 w-4"}),(()=>{switch(b.code){case"card":return`Pay ${M("payment"===c?e:f)}`;case"paypal":return"Pay with PayPal";case"apple_pay":case"google_pay":return`Pay with ${b.name}`;case"cod":return"Confirm Cash Payment";default:return"Pay"}})()]})})}let fv=[{name:"Luna",avatar:"L"},{name:"Milo",avatar:"M"},{name:"Zara",avatar:"Z"},{name:"Leo",avatar:"L"},{name:"Nova",avatar:"N"},{name:"Coco",avatar:"C"},{name:"Rio",avatar:"R"},{name:"Nala",avatar:"N"},{name:"Oscar",avatar:"O"},{name:"Bella",avatar:"B"}];function fw(a){return String(a?.table_id||a?.table_no||"delivery")}function fx(a){let b=Number(a||0);return!Number.isFinite(b)||b<=0?null:Number(b.toFixed(2))}async function fy({selectedMethod:a,resolveSubmittedPaymentAmount:b,setProviderInlineError:c,toast:d,checkoutStep:e,pendingSummary:g,resolveSubmittedPaymentOrderId:h,hasUnsubmittedPaymentDraft:i,setSelectedPaymentMethod:j,setIsLoading:k,ensureGuestSession:l,tableInfo:m,merchantSettings:n,paymentFormData:o,itemsToPay:p}){if(!a||!["card","wero","paypal","apple_pay","google_pay"].includes(a.code))return;if(!(b()>0)){c("Order total is still updating. Please reopen My Order."),d({title:"Order total unavailable",description:"Order total is still updating. Please reopen My Order.",variant:"destructive"});return}let q="payment"!==e||g?null:h();if("payment"===e&&!g&&!q&&i()){c("Please submit the table order first, then start payment."),d({title:"Submit order first",description:"Please submit the table order first, then start payment.",variant:"destructive"});return}c(null),k(!0);let r=!1;try{let c=null,d="payment"!==e||g?null:h();d&&(c=await f.apiClient.startExistingOrderPayment({order_id:Number(d),payment_method:String(a.code),provider:String(a?.provider_code||""),guest_session_id:l(),table_id:m?.table_id?String(m.table_id):null,table_no:m?.table_no?String(m.table_no):null,source:"menu_existing_submitted"}));let i=String(a?.provider_code||"").toLowerCase(),j="wero"===a.code?"worldline"===i?"worldline":"vr_payment"===i?"vr_payment":"stripe":i||"unknown",k=`PMD-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,q="/menu",s="/menu",t="vr_payment"===j?({card:"/api/v1/payments/vr-payment/card/create-session",paypal:"/api/v1/payments/vr-payment/paypal/create-session",wero:"/api/v1/payments/vr-payment/wero/create-session",apple_pay:"/api/v1/payments/vr-payment/apple-pay/create-session",google_pay:"/api/v1/payments/vr-payment/google-pay/create-session"})[a.code]||"/api/v1/payments/vr-payment/card/create-session":"wero"===a.code?"worldline"===i?"/api/v1/payments/worldline/wero/create-session":"/api/v1/payments/wero/create-session":"/api/v1/payments/card/create-session";console.info("[PMD_CHECKOUT_FLOW_TRACE]",{selected_method:a.code,backend_selected_provider:j,endpoint:t,flow_mode:"primary"});let u=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:Number(c?.amount||b()),currency:String(c?.currency||n?.currency||"EUR"),return_url:q,cancel_url:s,customer_email:o.email||"",merchant_reference:k,order_id:d?Number(d):void 0,items:p.map(a=>({id:String(a.item.id),name:a.item.name,quantity:Number(a.quantity||1),price:Number(a.price||0)}))})}),v=await u.text(),w=null;try{w=v?JSON.parse(v):null}catch{w=null}if(!u.ok||!w?.success||!w?.redirect_url){let c="worldline"===j?"Worldline":"vr_payment"===j?"VR Payment":"sumup"===j?"SumUp":"square"===j?"Square":"Stripe",d=String(w?.resolved_error_code||w?.error_code||"").toLowerCase(),e=["worldline_invalid_credentials_or_entitlement","worldline_session_unavailable"].includes(d),f=!!w?.allow_fallback||e,g=w?.error||(v&&v.length<1e3?v:"")||`${c} checkout failed with HTTP ${u.status}`;if("wero"===a.code&&(w?.error_code==="wero_not_supported"||w?.error_code==="wero_unavailable"))throw r=!0,Error("Wero is currently unavailable. Please choose another payment method.");if("wero"===a.code){if("worldline"===j&&f){let a=q.includes("payment_return_provider=")?q.replace(/payment_return_provider=[^&]*/i,"payment_return_provider=wero"):`${q}${q.includes("?")?"&":"?"}payment_return_provider=wero`,c=await fetch("/api/v1/payments/wero/create-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:b(),currency:n?.currency||"EUR",return_url:a,cancel_url:s,customer_email:o.email||"",fallback_method:"ideal",fallback_from_worldline:!0,items:p.map(a=>({id:String(a.item.id),name:a.item.name,quantity:Number(a.quantity||1),price:Number(a.price||0)}))})}),e=await c.text(),f=null;try{f=e?JSON.parse(e):null}catch{f=null}if(c.ok&&f?.success&&f?.redirect_url)return void console.info("[PMD_CHECKOUT_FLOW_TRACE]",{selected_method:"wero",original_provider:"worldline",backend_selected_provider:String(f?.provider||"stripe"),fallback_provider:String(f?.fallback_provider||"stripe"),fallback_method:String(f?.fallback_method||"ideal"),resolved_error_code:d,endpoint:"/api/v1/payments/wero/create-session",flow_mode:"fallback",redirect_url_type:typeof f?.redirect_url,has_session_id:!!f?.session_id})}throw Error(`${c} Wero error${d?` (${d})`:""}: ${g}`)}throw Error(g||"Unable to start hosted checkout")}}catch(a){r&&j(null),k(!1),c(a instanceof Error?a.message:"Unable to start checkout"),d({title:"Payment Failed",description:a instanceof Error?a.message:"Unable to start checkout",variant:"destructive"})}}async function fz({stripePaymentIntentId:a,forcedPaymentContext:b,selectedPaymentMethod:c,visiblePaymentMethods:d,toast:e,setIsLoading:g,tableInfo:h,itemsToPay:i,paymentFormData:j,tableDraft:k,selectedOptions:l,checkoutStep:m,payableTotal:n,finalTotal:o,paymentTipAmount:p,tipAmount:q,selectedSplitPersonId:r,appliedCoupon:s,paymentCouponDiscount:t,couponDiscount:u,ensureGuestSession:v,hasUnsubmittedPaymentDraft:w,initialSubmittedOrder:x,resolveSubmittedPaymentOrderId:y,resolveSubmittedPaymentAmount:z,pmdLatestSubmittedPaymentOrderIdRef:B,submittedSnapshot:C,existingOrderId:D,pendingSummary:E,resetPaymentAdjustmentsAfterSuccess:F,setCheckoutStep:G,t:H,selectedSplitPerson:I,isSplitting:J,splitMethod:K,splitSourceItems:L,itemAssignments:M,pmdSubmittedItemsSubtotal:N,paymentPayableTotal:O,markOpenOrderAsPaid:P,setPaidSplitPeople:Q,taxSettings:R,subtotal:S,taxAmount:T,merchantSettings:U,estimatedMinutes:V,onOpenOrderUpdate:W,clearCart:X,setSubmittedSnapshot:Y,getTenantKey:Z,getTableKey:$,buildOpenOrderStorageKeys:_}){let aa=b?.method_code||c,ab=d.find(a=>a.code===aa),ac="cod"===aa?null:b?.provider_code||ab?.provider_code||null,ad="stripe"===ac&&("card"===aa||"apple_pay"===aa||"google_pay"===aa||"wero"===aa);if(ad&&!a)return void e({title:"Payment Failed",description:"Stripe payment confirmation is missing. Please try again.",variant:"destructive"});g(!0);try{let b=h?.is_codier||!1,c=h?.table_id??null??null??null,d=null==c||""===String(c).trim()||Number.isNaN(Number(c))?null:Number(c),ab=h?.table_name&&""!==String(h.table_name).trim()?String(h.table_name):d?`Table ${d}`:"Delivery",af=Number(h?.location_id||1),ag=i.map((a,b)=>{let c=Number(a?.item?.id??a?.item?.menu_id??0),d=Number(a?.quantity||1),e=Number(a?.price??a?.item?.price??0),f=String(a?.item?.name??a?.item?.title??"").trim();return{menu_id:Number.isFinite(c)?c:0,name:""!==f?f:`Item ${b+1}`,quantity:Number.isFinite(d)&&d>0?d:1,price:Number.isFinite(e)&&e>=0?e:0,special_instructions:"",options:Object.fromEntries(Object.entries(l[String(a?.optionKey||a?.item?.id)]||{}).map(([a,b])=>[String(a),String(b??"")]).filter(([,a])=>""!==a))}}),ah="payment"===m&&!!r,ai=ah?0:Number(t||0),aj=ah?null:s?.code?String(s.code):null,ak={table_id:b?"cashier":null!=d?String(d):null,table_name:String(b?"Cashier":ab),location_id:af,is_codier:!!b,items:ag,customer_name:String(b?"Cashier Customer":`${ab} Customer`),customer_phone:String(j.phone||""),customer_email:String(j.email||""),payment_method:"cod"===aa?"cash":"paypal"===aa?"paypal":"card",payment_method_raw:aa||void 0,payment_provider:ac||void 0,payment_reference:a?String(a):void 0,stripe_payment_intent_id:ad&&a?String(a):void 0,total_amount:Number("payment"===m?n:o),tip_amount:Number("payment"===m?p:q),coupon_code:"payment"===m?aj:s?.code?String(s.code):null,coupon_discount:Number("payment"===m?ai:u),guest_session_id:v(),special_instructions:""},al=w()||x?.paymentStatus==="paid"?null:x;al?.orderId&&(ak.existing_order_id=Number(al.orderId),ak.append_to_order=!0);let am=y();if(console.info("PMD_PAYMENT_ORDER_ID_RESOLVED",{paymentOrderIdCandidate:am,latestRef:B.current,submittedSnapshotOrderId:C?.orderId||C?.order_id||null,tableDraftOrderId:k?.order_id||k?.orderId||null,existingOrderId:D}),"payment"===m&&!am){g(!1),e({title:"Order not found",description:"Please send the table order to the kitchen first.",variant:"destructive"});return}let an="qr_pay_later"===String(k?.payment||C?.payment||"").toLowerCase(),ao=!!("payment"===m&&am&&(E||an));if("payment"===m&&am&&!ao)try{let b=await f.apiClient.startExistingOrderPayment({order_id:Number(am),payment_method:String(aa||"card"),provider:ac||void 0,guest_session_id:v(),table_id:h?.table_id?String(h.table_id):null,table_no:h?.table_no?String(h.table_no):null,source:"menu_existing_submitted"});if("cod"===String(aa||"")){g(!1),e({title:"Cash collection requested",description:b?.message||"Staff will collect payment shortly."});return}if(ad){if(!a)throw Error("Stripe payment confirmation is missing");await f.apiClient.finalizeExistingOrderPayment({order_id:Number(am),payment_intent_id:String(a),payment_method:String(aa||"card"),provider:ac||"stripe"})}r?Q(a=>({...a,[r]:!0})):(P(am,{tipAmount:p,couponDiscount:ai,paidTotal:O,couponCode:aj}),F()),G("paid"),g(!1),e({title:H("paymentSuccessful"),description:`Order #${am} paid successfully!`});return}catch(a){g(!1),e({title:"Payment unavailable",description:"Payment could not be started. Please ask staff or try again.",variant:"destructive"});return}let ap=(()=>{for(let a of[O,n]){let b=Number(a);if(Number.isFinite(b)&&b>=0)return Math.round(100*b)/100}return 0})();if(ao&&am){let b=ak.payment_method,c=r&&"items"===K?L.reduce((a,b)=>{let c=Number(String(r).replace("guest-",""));if(M[b.key]!==c)return a;let d=Number(b.orderMenuId||0);if(!d)return a;let e=a.find(a=>a.order_menu_id===d);return e?e.quantity+=1:a.push({order_menu_id:d,quantity:1}),a},[]):void 0,d="payment"===m?z():I?.total?Number(I.total.toFixed(2)):J?null:A(E?.remainingAmount)??A(C?.total)??null;console.info("PMD_PAYMENT_AMOUNT_RESOLVED",{order_id:am,amount:ap,payableTotal:n,paymentPayableTotal:O,submittedSnapshotTotal:C?.total??null,submittedSnapshotRemaining:C?.remainingAmount??null,tableDraftTotal:k?.totals?.total??null,submittedItemsSubtotal:N()});let i=a=>{let b=Number(a);return Number.isFinite(b)?Math.round(100*b)/100:0},j=(()=>{for(let a of[i(N()),E?.remainingAmount,C?.remainingAmount,k?.totals?.remainingAmount,d,C?.total,k?.totals?.total]){let b=i(a);if(b>0)return b}return 0})(),l=i(Math.max(0,Number(p||0))),o=i(Math.min(Math.max(0,Number(ai||0)),j+l)),q=i(Math.max(0,j+l-o)),s={payment_method:String(b),payment_reference:a?String(a):null,amount:q>0?q:void 0,tip_amount:l,coupon_discount:o,coupon_code:"payment"===m?aj:null,selected_items:c,table_id:h?.table_id?String(h.table_id):null,table_no:h?.table_no?String(h.table_no):null,qr:h?.qr_code?String(h.qr_code):null};console.info("PMD_PAY_EXISTING_AMOUNT_V42",{order_id:am,base_amount:j,tip_amount:l,coupon_discount:o,charge_amount:q,old_item_amount:d}),console.info("PMD_PAY_EXISTING_PAYLOAD",{order_id:am,...s});let t=await f.apiClient.payExistingQrOrder(am,s);if(t?.success){g(!1),e({title:H("paymentSuccessful"),description:`Order #${am} paid successfully!`});let a=String(am);localStorage.setItem("lastOrderId",a);let b=new URLSearchParams;b.set("order_id",a),b.set("return_url","/menu"),r?Q(a=>({...a,[r]:!0})):(P(am,{tipAmount:p,couponDiscount:ai,paidTotal:O,couponCode:aj}),F()),G("paid");return}}let aq=await f.apiClient.submitOrder(ak);if(aq.success){var ae;g(!1),e({title:H("paymentSuccessful"),description:`Order #${aq.order_id} submitted successfully!`});let a=aq.order_id?String(aq.order_id):"";a&&localStorage.setItem("lastOrderId",a);let b=new URLSearchParams;a&&b.set("order_id",a),b.set("return_url","/menu");try{let a=v(),b=Z(),c=$(),d=_().sessionKey,e=aq.order_id?String(aq.order_id):"",f=Array.isArray(aq?.order_totals)?aq.order_totals:[],g=a=>{let b=f.find(b=>String(b?.code||"")===a),c=Number(b?.value??0);return Number.isFinite(c)?c:0},i=Array.isArray(aq?.items)?aq.items:[],j=i.length>0?i.map(a=>({id:Number(a?.menu_id||a?.id||0),name:String(a?.name||"Item"),quantity:Number(a?.quantity||0),price:Number(a?.price||0),subtotal:Number(a?.subtotal||Number(a?.quantity||0)*Number(a?.price||0))})):ag,k=aq?.settlement||{},l=Number(aq?.order_total??aq?.total??0),m={guestSessionId:a,tenant:b,tableKey:c,tableNumber:h?.table_no||h?.table_id||null,orderId:e||null,status:"submitted",paymentStatus:"unpaid",subtotal:Number(g("subtotal")||S||0),vatAmount:Number(g("tax")||T||0),vatPercentage:Number(R?.percentage||0),total:Number(l>0?l:o||0),orderTotal:Number(l>0?l:o||0),settledAmount:Number(k?.settledAmount||0),remainingAmount:Number(k?.remainingAmount??(l>0?l:o||0)),settlementStatus:String(k?.settlementStatus||"unpaid"),etaMinutes:Number(aq?.eta_minutes??aq?.estimated_prep_minutes??V),showCustomerEta:!!(aq?.show_customer_eta??!0),currency:String(U?.currency||"EUR"),submittedItems:j,createdAt:Date.now()};localStorage.setItem(d,JSON.stringify(m)),Y(m),W?.(m)}catch{}X(),"payment"===m&&(P(a||C?.orderId||null,{tipAmount:p,couponDiscount:ai,paidTotal:O,couponCode:aj}),F()),G((ae=m,"payment"===ae?"paid":aL()));return}throw Error("Order submission failed")}catch(d){g(!1),console.error("Order submission error:",d);let a=d instanceof Error&&/given data was invalid|unprocessable|amount|selected items amount mismatch/i.test(d.message)?"Payment could not be started. Please ask staff or try again.":null,b=d?.details,c=b?Object.values(b).flat().find(Boolean):null;e({title:"Order Failed",description:a||c||(d instanceof Error?d.message:"Failed to submit order. Please try again."),variant:"destructive"})}}function fA(a){return(fA="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(a){return typeof a}:function(a){return a&&"function"==typeof Symbol&&a.constructor===Symbol&&a!==Symbol.prototype?"symbol":typeof a})(a)}var fB="clover";"".concat("https://js.stripe.com","/").concat(fB,"/stripe.js");var fC=function(a,b){a&&a._registerWrapper&&a._registerWrapper({name:"stripe-js",version:"8.11.0",startTime:b})},fD=null,fE=function(a,b,c){if(null===a)return null;var d,e=b[0];if("string"!=typeof e)throw Error("Expected publishable key to be of type string, got type ".concat(fA(e)," instead."));var f=e.match(/^pk_test/),g=3===(d=a.version)?"v3":d;f&&g!==fB&&console.warn("Stripe.js@".concat(g," was loaded on the page, but @stripe/stripe-js@").concat("8.11.0"," expected Stripe.js@").concat(fB,". This may result in unexpected behavior. For more information, see https://docs.stripe.com/sdks/stripejs-versioning"));var h=a.apply(void 0,b);return fC(h,c),h},fF=!1,fG=function(){return c||(c=(null!==fD?fD:(fD=new Promise(function(a,b){a(null)})).catch(function(a){return fD=null,Promise.reject(a)})).catch(function(a){return c=null,Promise.reject(a)}))};Promise.resolve().then(function(){return fG()}).catch(function(a){fF||console.warn(a)});var fH=function(){for(var a=arguments.length,b=Array(a),c=0;c<a;c++)b[c]=arguments[c];fF=!0;var d=Date.now();return fG().then(function(a){return fE(a,b,d)})};function fI(a,b){return a instanceof Error?a.message:b}function fJ(a,b){return String(a||"").trim()||`Guest ${b+1}`}function fK(a,b){return a[b]?.avatar||String(b+1)}function fL(a,b,c){return c?Number.parseFloat(String(c))||0:Number(a||0)*(Number(b||0)/100)}function fM({isOpen:a,onClose:b,items:c,tableInfo:g,existingOrderId:h,pendingSummary:i,initialSubmittedOrder:j,initialCheckoutStep:k,preferPersonalReview:l=!1,onOpenOrderUpdate:m,onCartPricingUpdate:n,checkoutVisualTheme:p="neutral"}){var t;let w,{toast:y}=(0,v.useToast)(),{t:E}=(0,o.useLanguageStore)(),{tipSettings:G}={tipSettings:(0,r.useCmsStore)(a=>a.tipSettings),updateTipSettings:(0,r.useCmsStore)(a=>a.updateTipSettings)},{taxSettings:H,loadVATSettings:I}=s(),{merchantSettings:J}=(0,q.usePaymentSettingsStore)(),{appliedCoupon:L,validateCoupon:M,removeCoupon:N}=(w=(0,r.useCmsStore)(a=>a.appliedCoupon),{appliedCoupon:w,validateCoupon:(0,r.useCmsStore)(a=>a.validateCoupon),removeCoupon:(0,r.useCmsStore)(a=>a.removeCoupon)}),{clearCart:O,addToCart:P}=(0,u.useCartStore)(),[Q,R]=(0,e.useState)(!1),{isSplitting:S,setIsSplitting:T,selectedItems:U,splitMethod:V,setSplitMethod:W,splitGuestCount:X,setSplitGuestCount:Y,itemAssignments:ab,setItemAssignments:af,sharePercents:ag,setSharePercents:ah,selectedSplitPersonId:ai,setSelectedSplitPersonId:aj,paidSplitPeople:ak,setPaidSplitPeople:al}=function(){let[a,b]=(0,e.useState)(!1),c=(0,e.useRef)({}).current,[d,f]=(0,e.useState)("equal"),[g,h]=(0,e.useState)(2),[i,j]=(0,e.useState)({}),[k,l]=(0,e.useState)([50,50]),[m,n]=(0,e.useState)(null),[o,p]=(0,e.useState)({});return{isSplitting:a,setIsSplitting:b,selectedItems:c,splitMethod:d,setSplitMethod:f,splitGuestCount:g,setSplitGuestCount:h,itemAssignments:i,setItemAssignments:j,sharePercents:k,setSharePercents:l,selectedSplitPersonId:m,setSelectedSplitPersonId:n,paidSplitPeople:o,setPaidSplitPeople:p}}(),{selectedOptions:am,handleOptionsChange:an,adjustPriceForVAT:ao,personalReviewItems:ap,allItemInstances:aq,itemsToPay:ar,subtotal:as,taxAmount:at}=function({allItems:a,taxSettings:b,t:c,isSplitting:d,selectedItems:f,onCartPricingUpdate:g}){let[h,i]=(0,e.useState)({}),j=(0,e.useCallback)(a=>b.enabled&&b.percentage>0&&0===b.menuPrice?a*(1+b.percentage/100):a,[b.enabled,b.percentage,b.menuPrice]),k=(0,e.useCallback)((a,b)=>{i(c=>({...c,[String(a)]:b}))},[]),l=(0,e.useMemo)(()=>a.flatMap((a,b)=>{let d=Math.max(1,Number(a.quantity||1)),e=Array.isArray(a.item?.options)&&a.item.options.length>0,f=String(a.item?.id||`item-${b}`),g=a.item.nameKey?c(a.item.nameKey):a.item.name;return e?d<=1?[{...a,quantity:1,__pmdOptionKey:`${f}-${b}-0`,__pmdUnitLabel:"",__pmdSourceQuantity:d}]:Array.from({length:d},(c,e)=>({...a,quantity:1,__pmdOptionKey:`${f}-${b}-${e}`,__pmdUnitLabel:`${g} \xb7 Item ${e+1}`,__pmdSourceQuantity:d})):[{...a,__pmdOptionKey:f,__pmdUnitLabel:"",__pmdSourceQuantity:d}]}),[a,c]),m=(0,e.useMemo)(()=>a.flatMap((a,b)=>Array.from({length:a.quantity}).map((c,d)=>({cartIndex:b,item:a.item,price:a.item.price||0,key:`${a.item.id}-${b}-${d}`,quantity:1,orderMenuId:Number(a.item.__order_menu_id||0)||void 0,menuId:Number(a.item.__menu_id||a.item.id||0)||void 0}))),[a]),n=(0,e.useMemo)(()=>d?Object.values(f):l.map(a=>({item:a.item,price:j(a.item.price||0),quantity:Number(a.quantity||1),optionKey:String(a.__pmdOptionKey||a.item.id)})),[d,f,l,j]),o=(0,e.useMemo)(()=>n.reduce((b,c)=>{let d=Number(c.price||0)*Number(c.quantity||1),e=h[String(c.optionKey||c.item.id)]||{};if(Object.keys(e).length>0){let b=a.find(a=>a.item.id===c.item.id);b&&b.item.options&&Object.values(e).forEach(a=>{b.item.options.forEach(b=>{let e=b.values.find(b=>b.id.toString()===a);e&&(d+=j(e.price)*Number(c.quantity||1))})})}return b+d},0),[n,h,a,j]),p=(0,e.useMemo)(()=>b.enabled&&0!==Number(b.percentage||0)&&0!==b.menuPrice?o*(Number(b.percentage||0)/100):0,[o,b.enabled,b.percentage,b.menuPrice]);return(0,e.useEffect)(()=>{g&&(Array.isArray(a)&&0!==a.length?g({items:l.map(a=>{let b=h[String(a.__pmdOptionKey||a.item.id)]||{},d=[];Object.entries(b).forEach(([b,c])=>{let e=(a.item.options||[]).find(a=>String(a.name)===String(b)),f=e?.values?.find(a=>String(a.id)===String(c));f&&d.push({name:String(f.value||f.name||""),price:Number(j(Number(f.price||0)))})});let e=a.item.nameKey?c(a.item.nameKey):a.item.name,f=d.map(a=>a.name).filter(Boolean).join(", "),g=f?`${e} — ${f}`:String(a.__pmdUnitLabel||e),i=Number(j(a.item.price||0))+d.reduce((a,b)=>a+Number(b.price||0),0),k=Number(a.quantity||1);return{...a,quantity:k,__pmdDisplayName:g,__pmdDisplayUnitPrice:i,__pmdDisplaySubtotal:i*k}}),subtotal:o,tax:p,total:o+p}):g(null))},[a,l,h,o,p,g,c,b.enabled,b.percentage,b.menuPrice,j]),{selectedOptions:h,handleOptionsChange:k,adjustPriceForVAT:j,personalReviewItems:l,allItemInstances:m,itemsToPay:n,subtotal:o,taxAmount:p}}({allItems:c,taxSettings:H,t:E,isSplitting:S,selectedItems:U,onCartPricingUpdate:n}),[au,av]=(0,e.useState)(null),{loadingPayments:aw,visiblePaymentMethods:ax,stripeConfig:ay,stripeConfigError:az,stripePromise:aA,paypalConfigLoading:aB,effectivePayPalClientId:aC,effectivePayPalCurrency:aD}=function({selectedPaymentMethod:a,setSelectedPaymentMethod:b,merchantCurrency:c}){let[d,g]=(0,e.useState)(null),[h,i]=(0,e.useState)(!1),[j,k]=(0,e.useState)([]),[l,m]=(0,e.useState)(!0),[n,o]=(0,e.useState)(null),[p,q]=(0,e.useState)(null),r=(0,e.useMemo)(()=>(j||[]).filter(a=>ac.has(ad(a.code)||"")),[j]),s=(0,e.useMemo)(()=>new Map((r||[]).map(a=>[ad(a.code)||a.code,a])),[r]),t=(0,e.useMemo)(()=>n?.publishableKey?fH(n.publishableKey):null,[n?.publishableKey]),u=d?.enabled&&d?.clientId?d.clientId:"",v=String(d?.currency||c||"EUR").toUpperCase();return(0,e.useEffect)(()=>{a&&(ae(r,a)||b(null))},[a,r,b]),(0,e.useEffect)(()=>{var b;if(!((b=a?s.get(a):null)&&("apple_pay"===b.code||"google_pay"===b.code||"card"===b.code&&"stripe"===b.provider_code)))return;let c=!1;return fetch("/api/v1/payments/stripe/config").then(a=>a.json()).then(a=>{c||(a?.success&&a.publishableKey?(o({publishableKey:a.publishableKey,mode:a.mode||"test",currency:a.currency||"EUR",countryCode:a.countryCode||"DE",methods:{card:!!a?.methods?.card,apple_pay:!!a?.methods?.apple_pay,google_pay:!!a?.methods?.google_pay}}),q(null)):(o(null),q(a?.error||"Stripe is not configured")))}).catch(()=>{c||q("Failed to load Stripe configuration")}),()=>{c=!0}},[a,s]),(0,e.useEffect)(()=>{new f.ApiClient().getPaymentMethods().then(k).finally(()=>m(!1))},[]),(0,e.useEffect)(()=>{let a=!1;return i(!0),fetch("/api/v1/payments/config-public").then(a=>a.json()).then(b=>{a||g({enabled:!!b?.paypalEnabled,clientId:b?.paypalClientId||"",currency:b?.currency||"EUR"})}).catch(()=>{a||g({enabled:!1,clientId:"",currency:"EUR"})}).finally(()=>{a||i(!1)}),()=>{a=!0}},[]),{paymentMethods:j,loadingPayments:l,visiblePaymentMethods:r,methodByCode:s,stripeConfig:n,stripeConfigError:p,stripePromise:t,paypalPublicConfig:d,paypalConfigLoading:h,effectivePayPalClientId:u,effectivePayPalCurrency:v}}({selectedPaymentMethod:au,setSelectedPaymentMethod:av,merchantCurrency:J?.currency}),{cashCollectionConfirmed:aE,setCashCollectionConfirmed:aF,providerInlineError:aG,setProviderInlineError:aI,isDarkTheme:aJ,setIsDarkTheme:aM,paymentFormData:aN,setPaymentFormData:aO,checkoutStep:aP,setCheckoutStep:aQ,submittedSnapshot:aR,setSubmittedSnapshot:aS,pmdLatestSubmittedPaymentOrderIdRef:aT}=function({existingOrderId:a,initialCheckoutStep:b,initialSubmittedOrder:c}){let[d,f]=(0,e.useState)(!1),[g,h]=(0,e.useState)(null),[i,j]=(0,e.useState)(!1),[k,l]=(0,e.useState)({email:"",phone:""}),m="number"==typeof a?a:"string"==typeof a&&a.trim().length>0&&Number.isFinite(Number(a))?Number(a):null,[n,o]=(0,e.useState)(b||(m?"submitted":"review")),[p,q]=(0,e.useState)(c||null);return{cashCollectionConfirmed:d,setCashCollectionConfirmed:f,providerInlineError:g,setProviderInlineError:h,isDarkTheme:i,setIsDarkTheme:j,paymentFormData:k,setPaymentFormData:l,checkoutStep:n,setCheckoutStep:o,submittedSnapshot:p,setSubmittedSnapshot:q,pmdLatestSubmittedPaymentOrderIdRef:(0,e.useRef)(null)}}({existingOrderId:h,initialCheckoutStep:k,initialSubmittedOrder:j}),aU="organic_botanical_paper"===p,aV="kazen_japanese"===p;(0,e.useEffect)(()=>{if(!a||!j||!["submitted","split","split-items","split-shares","split-review","payment"].includes(aP))return;let b=String(j?.orderId??j?.order_id??""),c=String(aR?.orderId??aR?.order_id??""),d=Array.isArray(j?.submittedItems)?j.submittedItems:Array.isArray(j?.items)?j.items:[],e=Array.isArray(aR?.submittedItems)?aR.submittedItems:Array.isArray(aR?.items)?aR.items:[],f=d.map(a=>`${a?.order_menu_id||a?.menu_id||a?.id||a?.name}:${a?.quantity||1}:${a?.subtotal??a?.price??0}`).join("|"),g=e.map(a=>`${a?.order_menu_id||a?.menu_id||a?.id||a?.name}:${a?.quantity||1}:${a?.subtotal??a?.price??0}`).join("|"),h=Number(j?.remainingAmount??j?.orderTotal??j?.total??0),i=Number(aR?.remainingAmount??aR?.orderTotal??aR?.total??0);(b!==c||f!==g||Math.abs(h-i)>.004)&&aS(a=>({...a||{},...j,submittedItems:d,updatedAt:j?.updatedAt||new Date().toISOString()}))},[a,j,aP,aR?.orderId,aR?.order_id,aR?.submittedItems,aR?.items,aR?.remainingAmount,aR?.orderTotal,aR?.total,aS]);let{tableDraft:aW,setTableDraft:aX,draftLoading:aY,refreshTableDraft:aZ,submitDraftLoading:a$,confirmTableDraftItemsAction:a_,submitTableDraftAction:a0}=function({isOpen:a,tableInfo:b,taxPercentage:c,getGuestSessionId:d,setSubmittedSnapshot:g}){let[h,i]=(0,e.useState)(null),[j,k]=(0,e.useState)(!1),l=(0,e.useMemo)(()=>F(b,null),[b?.table_id,b?.table_no,b?.qr_code]),m=(0,e.useCallback)(async()=>{if(!l.table_id&&!l.table_no&&!l.qr)return null;k(!0);try{let a=await f.apiClient.getTableOrderDraft(l);if(a?.success&&(i(a),console.info("PMD_TABLE_DRAFT_LOADED",{status:a.status,draft_id:a.draft_id??null,order_id:a.order_id??null}),a.order_id&&a.status&&"draft"!==a.status&&"empty"!==a.status)){let d=K(a,b,c);g(a=>{let b=Number(a?.orderId||a?.order_id||0),c=Number(d.orderId||0);return a&&b===c?{...a,...d}:d}),console.info("PMD_TABLE_ORDER_PAYMENT_READY",{order_id:a.order_id,status:a.status})}return a}finally{k(!1)}},[l,b,c,g]),{isSubmittingDraft:n,confirmTableDraftItems:o,submitTableDraft:p}=function({context:a,getGuestSessionId:b,refreshDraft:c}){let[d,g]=(0,e.useState)(!1),[h,i]=(0,e.useState)(!1),[j,k]=(0,e.useState)(null),l=(0,e.useRef)(null),m=(0,e.useRef)(null),n=(0,e.useCallback)(async(d,e={})=>{if(l.current)return l.current;let h=(async()=>{g(!0),k(null);try{let g=await f.apiClient.confirmTableDraftItems({...a||{},guest_session_id:b(),items:d});return e.refreshAfterConfirm&&await c?.(),g}catch(a){throw k(fI(a,"Failed to confirm table items")),a}finally{l.current=null,g(!1)}})();return l.current=h,h},[a,b,c]);return{isConfirmingDraftItems:d,isSubmittingDraft:h,tableOrderActionError:j,confirmTableDraftItems:n,submitTableDraft:(0,e.useCallback)(async(d={})=>{if(m.current)return m.current;let e=(async()=>{i(!0),k(null);try{return await f.apiClient.submitTableDraft({...a||{},draft_id:d.draftId??null,guest_session_id:b()})}catch(a){throw k(fI(a,"Failed to submit table order")),d.refreshOnError&&await c?.(),a}finally{m.current=null,i(!1)}})();return m.current=e,e},[a,b,c])}}({context:l,getGuestSessionId:d,refreshDraft:m});return(0,e.useEffect)(()=>{if(!a)return;m();let b=window.setInterval(()=>{m()},12e3),c=()=>{m()};return window.addEventListener("focus",c),()=>{window.clearInterval(b),window.removeEventListener("focus",c)}},[a,m]),{tableDraft:h,setTableDraft:i,draftLoading:j,refreshTableDraft:m,submitDraftLoading:n,confirmTableDraftItemsAction:o,submitTableDraftAction:p}}({isOpen:a,tableInfo:g,taxPercentage:H?.percentage||0,getGuestSessionId:()=>"",setSubmittedSnapshot:aS}),a1=c.length>0,a2=()=>"tenant",a3=()=>fw(g),a4=()=>"",a5=()=>{let a,b;return a="tenant",b=fw(g),{sessionKey:`pmd_open_order:${a}:${b}:`,legacyKey:`pmd_open_order:${a}:${b}`,guestSessionId:"",tenant:a,tableKey:b}},{tipPercentage:a6,setTipPercentage:a7,customTip:a8,setCustomTip:a9,splitPaymentTips:ba,setSplitPaymentTips:bb,couponCode:bc,setCouponCode:bd,couponLoading:be,setCouponLoading:bf,couponError:bg,setCouponError:bh,submittedBaseTotal:bi,tipAmount:bj,couponDiscount:bk,finalTotal:bl,orderStatusTotal:bm,vatLabels:bn}=function({submittedSnapshot:a,pendingSummary:b,checkoutStep:c,subtotal:d,taxAmount:f,appliedCoupon:g,taxSettings:h}){let[i,j]=(0,e.useState)(0),[k,l]=(0,e.useState)(""),[m,n]=(0,e.useState)({}),[o,p]=(0,e.useState)(""),[q,r]=(0,e.useState)(!1),[s,t]=(0,e.useState)(null),u=(0,e.useMemo)(()=>Number(a?.remainingAmount??a?.total??a?.orderTotal??b?.remainingAmount??0),[a?.remainingAmount,a?.total,a?.orderTotal,b?.remainingAmount]),v=u>0&&"review"!==c,w=v?u:d,x=fL(w,i,k),y=v?u:d,z=(0,e.useMemo)(()=>(function(a,b){if(!a)return 0;let c=Math.max(0,Number(b||0));if(c<=0)return 0;let d=Number(a.min_total??a.minimum_total??a.minimumOrderTotal??0);if(Number.isFinite(d)&&d>0&&c<d)return 0;let e=(...a)=>{for(let b of a){let a=Number(b);if(Number.isFinite(a)&&a>0)return a}return 0},f=String(a.type||"").trim().toLowerCase(),g=e(a.discountAmount,a.discount_amount,a.coupon_discount);if(g>0)return Math.min(g,c);let h=e(a.amount,"f"===f||f.includes("fixed")||f.includes("amount")||f.includes("flat")?a.discount:null,"f"===f||f.includes("fixed")||f.includes("amount")||f.includes("flat")?a.value:null);if(h>0)return Math.min(h,c);let i=e(a.discount_value,a.percent,a.percentage,a.discount_percent,a.discountPercentage,"p"===f||f.includes("percent")?a.discount:null,"p"===f||f.includes("percent")?a.value:null);if(i>0)return Math.min(c,i/100*c);let j=e(a.discount,a.value);return j?j<=100?Math.min(c,j/100*c):Math.min(j,c):0})(g,y),[g,y]),A=Math.max(0,Number(d||0)+Number(f||0)+Number(x||0)-Number(z||0)),B=Math.max(0,u>0?u:Number(d||0)+Number(f||0));return{tipPercentage:i,setTipPercentage:j,customTip:k,setCustomTip:l,splitPaymentTips:m,setSplitPaymentTips:n,couponCode:o,setCouponCode:p,couponLoading:q,setCouponLoading:r,couponError:s,setCouponError:t,submittedBaseTotal:u,isOrderStatusFlow:v,tipBaseAmount:w,tipAmount:x,couponBaseAmount:y,couponDiscount:z,finalTotal:A,orderStatusTotal:B,vatLabels:(0,e.useMemo)(()=>{if(!h.enabled||h.percentage<=0)return{summary:"Order Summary",subtotal:"Subtotal",total:"Total",includedNote:""};if(0===h.menuPrice){let a=Number.isInteger(h.percentage)?String(h.percentage):String(Number(h.percentage.toFixed(2)));return{summary:"Order Summary",subtotal:`Subtotal (incl. ${a}% VAT)`,total:"Total",includedNote:`prices incl. ${a}% VAT`}}return{summary:"Order Summary",subtotal:"Subtotal",total:"Total",includedNote:""}},[h.enabled,h.percentage,h.menuPrice])}}({submittedSnapshot:aR,pendingSummary:i,checkoutStep:aP,subtotal:as,taxAmount:at,appliedCoupon:L,taxSettings:H}),{splitGuestProfiles:bo,splitGuestNames:bp,getSplitGuestAvatar:bq,suggestedSplitGuestCount:br,addSplitGuest:bs,removeSplitGuest:bt,splitSourceItems:bu,splitGrandTotal:bv,equalSplitPeople:bw,activeSplitPeople:bx,selectedSplitPerson:by,unassignedSplitItems:bz,sharePercentTotal:bA,canConfirmSplitMethod:bB,startSplitFlow:bD,chooseSplitMethod:bE,goToSplitReview:bF}=function({isSplitting:a,setIsSplitting:b,splitMethod:c,setSplitMethod:d,splitGuestCount:f,setSplitGuestCount:g,itemAssignments:h,setItemAssignments:i,sharePercents:j,setSharePercents:k,selectedSplitPersonId:l,setSelectedSplitPersonId:m,paidSplitPeople:n,tableDraft:o,submittedSnapshot:p,allItemInstances:q,t:r,adjustPriceForVAT:s,taxSettings:t,submittedBaseTotal:u,orderStatusTotal:v,finalTotal:w,couponDiscount:x,setSelectedPaymentMethod:y,setCheckoutStep:A}){var B,E,F,G,H,I;let J,K,L,M=(0,e.useMemo)(()=>Array.from({length:f},(a,b)=>fv[b]||{name:`Guest ${b+1}`,avatar:String(b+1)}),[f]),N=(0,e.useMemo)(()=>M.map(a=>a.name),[M]),O=(0,e.useMemo)(()=>{let a=Array.isArray(o?.groups)?o.groups.filter(a=>Array.isArray(a?.items)&&a.items.length>0).length:0,b=new Set;(Array.isArray(p?.submittedItems)?p.submittedItems:Array.isArray(p?.items)?p.items:Array.isArray(p?.orderItems)?p.orderItems:[]).forEach(a=>{let c=String(a?.guest_session_id||a?.guestSessionId||a?.submitted_by||"").trim();c&&b.add(c)});let c=b.size;return Math.max(2,Math.min(10,a||c||2))},[o?.groups,p?.submittedItems,p?.items,p?.orderItems]);(0,e.useEffect)(()=>{k(a=>{var b;let c;return b=z(f),(c=Array.from({length:f},(b,c)=>a[c]??0)).every(a=>0===a)?b:c}),i(a=>Object.fromEntries(Object.entries(a).map(([a,b])=>[a,"number"==typeof b&&b>=f?null:b??null])))},[f,k,i]);let P=(0,e.useMemo)(()=>{let a=D(Array.isArray(p?.submittedItems)?p.submittedItems:Array.isArray(p?.items)?p.items:Array.isArray(p?.orderItems)?p.orderItems:[]);return a.length>0?a.flatMap((a,b)=>{let c=Math.max(1,Number(a?.quantity||1)),d=C(a);return Array.from({length:c},(c,e)=>({key:`submitted-${a?.order_menu_id||a?.menu_id||a?.id||b}-${e}`,name:String(a?.name||`Item ${b+1}`),amount:Number.isFinite(d)?d:0,orderMenuId:Number(a?.order_menu_id||a?.id||0)||void 0}))}):q.map((a,b)=>({key:a.key,name:a.item.nameKey?r(a.item.nameKey):a.item.name||`Item ${b+1}`,amount:Number(s(a.price||0)),orderMenuId:a.orderMenuId}))},[p?.submittedItems,p?.items,p?.orderItems,q,r,s,t.enabled,t.percentage,t.menuPrice]),Q=(0,e.useMemo)(()=>P.reduce((a,b)=>a+Number(b.amount||0),0),[P]),R=(0,e.useMemo)(()=>{let a=Number(p?.remainingAmount??p?.orderTotal??p?.total??0);return u>0&&Number(v)>0?Number(v):Number(w)>0?Number(w):a>0?a:Q},[u,v,w,Q,p?.remainingAmount,p?.orderTotal,p?.total]),S=Math.max(0,R-Q),T=(0,e.useMemo)(()=>(function(a){let{splitGrandTotal:b,splitGuestCount:c,splitGuestNames:d,splitGuestProfiles:e,splitSubtotal:f,splitExtraAmount:g,paidSplitPeople:h,selectedSplitPersonId:i}=a,j=Math.round(100*b),k=Math.floor(j/c),l=j-k*c;return Array.from({length:c},(a,j)=>{let m=(k+(0===j?l:0))/100,n=b>0?m/b:1/c,o=`guest-${j}`;return{id:o,name:fJ(d[j],j),avatar:fK(e,j),subtotal:f*n,tax:g*n,tip:0,discount:0,total:m,items:[{name:"Equal share",amount:m}],status:h[o]?"Paid":i===o?"Ready to pay":"Pending"}})})({splitGrandTotal:R,splitGuestCount:f,splitGuestNames:N,splitGuestProfiles:M,splitSubtotal:Q,splitExtraAmount:S,paidSplitPeople:n,selectedSplitPersonId:l}),[R,f,N,M,Q,S,n,l]),U=(0,e.useMemo)(()=>(function(a){let{splitGuestCount:b,splitSourceItems:c,itemAssignments:d,splitSubtotal:e,splitExtraAmount:f,couponDiscount:g,splitGuestNames:h,splitGuestProfiles:i,paidSplitPeople:j,selectedSplitPersonId:k}=a;return Array.from({length:b},(a,l)=>{let m=c.filter(a=>d[a.key]===l).map(a=>({name:a.name,amount:a.amount,quantity:1}));return function(a){let{index:b,personSubtotal:c,items:d,splitSubtotal:e,splitExtraAmount:f,splitGuestCount:g,couponDiscount:h,splitGuestNames:i,splitGuestProfiles:j,paidSplitPeople:k,selectedSplitPersonId:l,percent:m}=a,n=e>0?c/e:g>0?1/g:0,o=f*n,p=h>0?h*n:0,q=Math.max(0,c+o-p),r=`guest-${b}`;return{id:r,name:fJ(i[b],b),avatar:fK(j,b),subtotal:c,tax:o,tip:0,discount:p,total:q,items:d,status:k[r]?"Paid":l===r?"Ready to pay":"Pending",percent:m}}({index:l,personSubtotal:m.reduce((a,b)=>a+b.amount,0),items:m,splitSubtotal:e,splitExtraAmount:f,splitGuestCount:b,couponDiscount:g,splitGuestNames:h,splitGuestProfiles:i,paidSplitPeople:j,selectedSplitPersonId:k})})})({splitGuestCount:f,splitSourceItems:P,itemAssignments:h,splitSubtotal:Q,splitExtraAmount:S,couponDiscount:x,splitGuestNames:N,splitGuestProfiles:M,paidSplitPeople:n,selectedSplitPersonId:l}),[f,P,h,Q,S,x,N,M,n,l]),V=(0,e.useMemo)(()=>(function(a){let{splitGuestCount:b,sharePercents:c,splitGrandTotal:d,splitSubtotal:e,splitExtraAmount:f,splitGuestNames:g,splitGuestProfiles:h,paidSplitPeople:i,selectedSplitPersonId:j}=a;return Array.from({length:b},(a,b)=>{let k=Number(c[b]||0),l=k/100*d,m=d>0?l/d:0,n=`guest-${b}`;return{id:n,name:fJ(g[b],b),avatar:fK(h,b),subtotal:e*m,tax:f*m,tip:0,discount:0,total:l,items:[{name:`${k}% share`,amount:l}],status:i[n]?"Paid":j===n?"Ready to pay":"Pending",percent:k}})})({splitGuestCount:f,sharePercents:j,splitGrandTotal:R,splitSubtotal:Q,splitExtraAmount:S,splitGuestNames:N,splitGuestProfiles:M,paidSplitPeople:n,selectedSplitPersonId:l}),[f,j,R,Q,S,N,M,n,l]),W="items"===(B={splitMethod:c,equalSplitPeople:T,itemSplitPeople:U,shareSplitPeople:V}).splitMethod?B.itemSplitPeople:"shares"===B.splitMethod?B.shareSplitPeople:B.equalSplitPeople,X=l&&W.find(a=>a.id===l)||null,{unassignedSplitItems:Y,sharePercentTotal:Z,canConfirmSplitMethod:$}=(F=(E={splitMethod:c,splitSourceItems:P,itemAssignments:h,sharePercents:j,splitGuestCount:f}).splitSourceItems,G=E.itemAssignments,J=F.filter(a=>void 0===G[a.key]||null===G[a.key]).length,H=E.sharePercents,I=E.splitGuestCount,K=H.slice(0,I).reduce((a,b)=>a+Number(b||0),0),L="items"===E.splitMethod?0===J:"shares"!==E.splitMethod||100===K,{unassignedSplitItems:J,sharePercentTotal:K,canConfirmSplitMethod:L}),_=(e=c)=>{a||l||(g(O),k(z(O))),b(!0),d(e),y(null),m(null),A("items"===e?"split-items":"shares"===e?"split-shares":"split")};return{splitGuestProfiles:M,splitGuestNames:N,getSplitGuestAvatar:a=>fK(M,a),suggestedSplitGuestCount:O,addSplitGuest:()=>{let a=Math.min(10,f+1);g(a),k(z(a))},removeSplitGuest:()=>{let a=Math.max(2,f-1);g(a),k(z(a))},splitSourceItems:P,splitSubtotal:Q,splitGrandTotal:R,splitExtraAmount:S,equalSplitPeople:T,itemSplitPeople:U,shareSplitPeople:V,activeSplitPeople:W,selectedSplitPerson:X,unassignedSplitItems:Y,sharePercentTotal:Z,canConfirmSplitMethod:$,startSplitFlow:_,chooseSplitMethod:a=>{d(a),_(a)},goToSplitReview:()=>{$&&(b(!0),m(a=>a||W[0]?.id||null),A("split-review"))}}}({isSplitting:S,setIsSplitting:T,splitMethod:V,setSplitMethod:W,splitGuestCount:X,setSplitGuestCount:Y,itemAssignments:ab,setItemAssignments:af,sharePercents:ag,setSharePercents:ah,selectedSplitPersonId:ai,setSelectedSplitPersonId:aj,paidSplitPeople:ak,tableDraft:aW,submittedSnapshot:aR,allItemInstances:aq,t:E,adjustPriceForVAT:ao,taxSettings:H,submittedBaseTotal:bi,orderStatusTotal:bm,finalTotal:bl,couponDiscount:bk,setSelectedPaymentMethod:av,setCheckoutStep:aQ}),{paymentTipPercentage:bG,paymentCustomTip:bH,paymentBaseAmount:bI,paymentTipAmount:bJ,paymentCouponDiscount:bK,paymentPayableTotal:bL,paymentSubtotalAmount:bM,paymentVatAmount:bN,paymentVatPercentage:bO,paidTipAmount:bP,paidCouponDiscount:bQ,paidAmountTotal:bR,updatePaymentTipPercentage:bS,updatePaymentCustomTip:bT,payableTotal:bU,estimatedMinutes:bV}=function({selectedSplitPersonId:a,selectedSplitPerson:b,splitPaymentTips:c,setSplitPaymentTips:d,tipPercentage:f,setTipPercentage:g,customTip:h,setCustomTip:i,submittedBaseTotal:j,finalTotal:k,couponDiscount:l,submittedSnapshot:m,taxSettings:n,checkoutStep:o,tipAmount:p,orderStatusTotal:q,itemsToPay:r}){var s;let t,u,v,w,x,y=a&&c[a]||{percentage:0,custom:""},z=b?y.percentage:f,C=b?y.custom:h,{paymentBaseAmount:D,paymentTipAmount:E,paymentCouponDiscount:F,paymentPayableTotal:G,paymentSubtotalAmount:H,paymentVatAmount:I,paymentVatPercentage:J}=(s={selectedSplitPerson:b,submittedBaseTotal:j,finalTotal:k,paymentCustomTip:C,paymentTipPercentage:z,couponDiscount:l,submittedSnapshot:m,taxPercentage:n?.percentage??0},u=fL(t=s.selectedSplitPerson?.total&&s.selectedSplitPerson.total>0?s.selectedSplitPerson.total:s.submittedBaseTotal>0?s.submittedBaseTotal:s.finalTotal,s.paymentTipPercentage,s.paymentCustomTip),w=Math.max(0,t+u-(v=s.selectedSplitPerson?0:s.couponDiscount)),x=s.selectedSplitPerson?Number(s.selectedSplitPerson.subtotal||0):Number(s.submittedSnapshot?.subtotal||0),{paymentBaseAmount:t,paymentTipAmount:u,paymentCouponDiscount:v,paymentPayableTotal:w,paymentSubtotalAmount:x,paymentVatAmount:s.selectedSplitPerson?Number(s.selectedSplitPerson.tax||0):Number(s.submittedSnapshot?.vatAmount||0),paymentVatPercentage:Number(s.submittedSnapshot?.vatPercentage??s.taxPercentage??0)}),{paidTipAmount:K,paidCouponDiscount:L,paidAmountTotal:M}=function(a){if("paid"!==a.checkoutStep)return{paidTipAmount:a.paymentTipAmount,paidCouponDiscount:a.paymentCouponDiscount,paidAmountTotal:a.paymentPayableTotal};let b=Number(a.submittedSnapshot?.paidTipAmount??a.paymentTipAmount??a.tipAmount??0),c=Number(a.submittedSnapshot?.paidCouponDiscount??a.paymentCouponDiscount??a.couponDiscount??0);return{paidTipAmount:b,paidCouponDiscount:c,paidAmountTotal:Number(a.submittedSnapshot?.paidTotal??Math.max(0,a.orderStatusTotal+b-c))}}({checkoutStep:o,submittedSnapshot:m,paymentTipAmount:E,tipAmount:p,paymentCouponDiscount:F,couponDiscount:l,orderStatusTotal:q,paymentPayableTotal:G}),N=(0,e.useMemo)(()=>{var a;let b,c;return b=A((a={checkoutStep:o,paymentPayableTotal:G,orderStatusTotal:q,finalTotal:k}).finalTotal),c=A(a.orderStatusTotal),"payment"===a.checkoutStep?a.paymentPayableTotal:c??b??0},[o,G,q,k]);return{paymentTipPercentage:z,paymentCustomTip:C,paymentBaseAmount:D,paymentTipAmount:E,paymentCouponDiscount:F,paymentPayableTotal:G,paymentSubtotalAmount:H,paymentVatAmount:I,paymentVatPercentage:J,paidTipAmount:K,paidCouponDiscount:L,paidAmountTotal:M,updatePaymentTipPercentage:b=>{a?d(c=>({...c,[a]:{percentage:b,custom:""}})):(g(b),i(""))},updatePaymentCustomTip:b=>{a?d(c=>({...c,[a]:{percentage:0,custom:b}})):(i(b),g(0))},payableTotal:N,estimatedMinutes:(0,e.useMemo)(()=>{let a,b,c=Number(m?.etaMinutes||m?.estimated_prep_minutes||0);return c>0?c:(b=(a=(m?.submittedItems||r||[]).filter(a=>!B(a)).map(a=>({quantity:Math.max(1,Number(a?.quantity||1)),prep:Math.max(0,Number(a?.prep_time_minutes??a?.item?.prep_time_minutes??15)||15)}))).reduce((a,b)=>a+b.quantity,0),Math.max(10,Math.min(90,Math.round(a.reduce((a,b)=>Math.max(a,b.prep),15)+Math.min(15,Math.max(0,(b-1)*2))))))},[m?.submittedItems,m?.etaMinutes,m?.estimated_prep_minutes,r])}}({selectedSplitPersonId:ai,selectedSplitPerson:by,splitPaymentTips:ba,setSplitPaymentTips:bb,tipPercentage:a6,setTipPercentage:a7,customTip:a8,setCustomTip:a9,submittedBaseTotal:bi,finalTotal:bl,couponDiscount:bk,submittedSnapshot:aR,taxSettings:H,checkoutStep:aP,tipAmount:bj,orderStatusTotal:bm,itemsToPay:ar}),bW=()=>{N(),bd(""),bh(null),a7(0),a9("")};L&&L.code&&L.code,t=aR&&aR.orderId&&aR.orderId;let{modalPrimaryBtn:bX,modalPrimaryBtnStyle:bY,modalSecondaryBtn:bZ,iconBackBtn:b$}=function({isKazenJapaneseCheckoutVisual:a,isOrganicCheckoutVisual:b}){return{modalPrimaryBtn:a?"min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden":"min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed",modalPrimaryBtnStyle:a?{background:"#17120e",color:"#f8f0df",WebkitTextFillColor:"#f8f0df",textShadow:"none",border:"1px solid rgba(125, 92, 48, .68)",borderRadius:0,boxShadow:"none"}:b?aH:{background:"#062F2A",color:"#FFFFFF",textShadow:"none",border:"1px solid #062F2A"},modalSecondaryBtn:a?"min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition border border-[rgba(125,92,48,.68)] text-[#17120e] bg-[#fbf7ee] inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden":"min-h-10 w-full rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--theme-surface)] active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent inline-flex items-center justify-center gap-2",iconBackBtn:"h-9 w-9 rounded-full border border-[#062F2A] bg-[#062F2A] text-white hover:bg-[#021F1C] hover:text-white pmd-v2-action-circle hover:opacity-90"}}({isKazenJapaneseCheckoutVisual:aV,isOrganicCheckoutVisual:aU}),{handleConfirmMyItems:b_,handleSubmitTableDraft:b0,markOpenOrderAsPaid:b1}=function({tableDraft:a,setTableDraft:b,tableInfo:c,taxSettings:d,selectedOptions:e,personalReviewItems:f,adjustPriceForVAT:g,toast:h,setIsLoading:i,confirmTableDraftItemsAction:j,submitTableDraftAction:k,refreshTableDraft:l,clearCart:m,setSubmittedSnapshot:n,pmdLatestSubmittedPaymentOrderIdRef:o,buildOpenOrderStorageKeys:p,getTenantKey:q,getTableKey:r,ensureGuestSession:s,setCheckoutStep:t,onOpenOrderUpdate:u}){let v=()=>f.map(a=>{let b=Number(a.item?.id||a.item?.menu_id||0),c=String(a.item?.name||a.item?.title||"Item"),d=Number(a.quantity||1),f=e[String(a.__pmdOptionKey||a.item?.id)]||{},h=Array.isArray(a.item?.options)?a.item.options:[],i=Object.entries(f).map(([a,b])=>{let c=h.find(b=>String(b?.name||"")===String(a)||String(b?.id||"")===String(a)),d=(Array.isArray(c?.values)?c.values:[]).find(a=>String(a?.id)===String(b));return c&&d?{group:String(c?.name||a),option_id:String(c?.id||""),option_value_id:String(d?.id||b),value:String(d?.value||d?.name||b),price:Number(g(Number(d?.price||0)))}:null}).filter(Boolean),j=i.map(a=>a.value).filter(Boolean).join(", "),k=Number(g(a.item.price||0)),l=i.reduce((a,b)=>a+Number(b.price||0),0),m=Number((k+l).toFixed(4)),n=Number((m*d).toFixed(4));return{menu_id:b,name:j?`${c} — ${j}`:c,base_name:c,quantity:d,price:m,base_price:Number(k.toFixed(4)),option_total:Number((l*d).toFixed(4)),subtotal:n,options:Object.fromEntries(i.map(a=>[a.group,a.option_value_id])),option_details:i,option_summary:j}}).filter(a=>a.menu_id>0&&a.quantity>0),w=async()=>{let a=v();if(0===a.length)return void h({title:"No items selected",description:"Add items to your personal cart before confirming.",variant:"destructive"});i(!0);try{let c=await j(a);b(c),n(null),m(),console.info("PMD_TABLE_DRAFT_CONFIRMED_ITEMS",{draft_id:c.draft_id??null,count:a.length}),h({title:"Items confirmed",description:"Your items were added to the table order. Submit the table order when everyone is ready."}),await l(),u?.(c)}catch(a){h({title:"Could not confirm items",description:a instanceof Error?a.message:"Please try again.",variant:"destructive"})}finally{i(!1)}};return{buildPersonalDraftItems:v,handleConfirmMyItems:w,handleSubmitTableDraft:async()=>{if(a?.draft_id||a?.status==="draft")try{let e=await k({draftId:a?.draft_id??null,refreshOnError:!0}),f=Number(e?.order_id||e?.orderId||0);if(Number.isFinite(f)&&f>0){o.current=f;try{sessionStorage.setItem("pmd:latest-submitted-payment-order-id",String(f)),localStorage.setItem("pmd:latest-submitted-payment-order-id",String(f))}catch{}}b(e),m();let g=K(e,c,d?.percentage||0);try{let{sessionKey:a,legacyKey:b}=p();localStorage.removeItem(b),localStorage.setItem(a,JSON.stringify({...g,tenant:q(),tableKey:r(),guestSessionId:s()}))}catch{}console.info("PMD_SUBMITTED_ORDER_SNAPSHOT_NORMALIZED",{order_id:g.orderId,total:g.total,remainingAmount:g.remainingAmount,itemCount:Array.isArray(g.submittedItems)?g.submittedItems.length:0}),n(g),t(aL()),console.info("PMD_TABLE_DRAFT_SUBMITTED",{draft_id:a?.draft_id??null,order_id:e.order_id??null}),h({title:"Table order submitted",description:"The table order was sent to the kitchen. Payment is now available."}),u?.(g)}catch(a){h({title:"Could not submit table order",description:a instanceof Error?a.message:"Please refresh and try again.",variant:"destructive"})}},markOpenOrderAsPaid:(a,b)=>{try{let c=p().sessionKey,d=localStorage.getItem(c);if(!d)return;let e=JSON.parse(d);if(a&&e?.orderId&&String(e.orderId)!==String(a))return;e.paymentStatus="paid",e.status="paid",e.paidAt=Date.now(),b&&(e.paidTipAmount=Number(b.tipAmount||0),e.paidCouponDiscount=Number(b.couponDiscount||0),e.paidTotal=Number(b.paidTotal||0),e.paidCouponCode=b.couponCode||null),n(a=>a?{...a,paymentStatus:"paid",status:"paid",paidAt:e.paidAt,paidTipAmount:e.paidTipAmount,paidCouponDiscount:e.paidCouponDiscount,paidTotal:e.paidTotal,paidCouponCode:e.paidCouponCode}:e),localStorage.setItem(c,JSON.stringify(e)),u?.(e)}catch{}}}}({tableDraft:aW,setTableDraft:aX,tableInfo:g,taxSettings:H,selectedOptions:am,personalReviewItems:ap,adjustPriceForVAT:ao,toast:y,setIsLoading:R,confirmTableDraftItemsAction:a_,submitTableDraftAction:a0,refreshTableDraft:aZ,clearCart:O,setSubmittedSnapshot:aS,pmdLatestSubmittedPaymentOrderIdRef:aT,buildOpenOrderStorageKeys:a5,getTenantKey:a2,getTableKey:a3,ensureGuestSession:a4,setCheckoutStep:aQ,onOpenOrderUpdate:m}),b2=()=>(function({tableDraft:a,submittedSnapshot:b,existingOrderId:c,latestRefOrderId:d}){let e=Number(a?.draft_id||0),f=Number.isFinite(e)&&e>0?e:null,g=Number(a?.order_id||a?.orderId||0),h=Number.isFinite(g)&&g>0?g:null;if(f&&!h)return null;let i=null;try{let a=Number(0);i=Number.isFinite(a)&&a>0?a:null}catch{}let j=Number(b?.orderId||b?.order_id||0),k=Number.isFinite(j)&&j>0?j:null,l=h||k||d||null,m=i&&(!l||i===l)?i:null,n=Number(c||0),o=Number.isFinite(n)&&n>0&&l&&n===l?n:null;for(let a of[l,h,k,d,m,o]){let b=Number(a||0);if(Number.isFinite(b)&&!(b<=0)&&(!f||b!==f||h===b))return b}return null})({tableDraft:aW,submittedSnapshot:aR,existingOrderId:h,latestRefOrderId:aT.current}),b3=()=>(function({tableDraft:a,submittedPaymentOrderId:b}){return!!(a?.draft_id&&!b)})({tableDraft:aW,submittedPaymentOrderId:b2()}),b4=()=>{let a;return a=((Array.isArray(aR?.submittedItems)&&aR.submittedItems.length>0?aR.submittedItems:Array.isArray(aW?.items)?aW.items:[])||[]).filter(a=>!B(a)).reduce((a,b)=>{let c=Number(b?.quantity||b?.qty||1),d=fx(b?.total)??fx(b?.line_total)??fx(b?.subtotal)??null;return null!==d?a+d:a+(fx(b?.price)??fx(b?.unit_price)??fx(b?.menu_price)??fx(b?.item?.price)??0)*(Number.isFinite(c)&&c>0?c:1)},0),fx(a)},b5=()=>(function({selectedSplitPersonId:a,selectedSplitPerson:b,paymentPayableTotal:c,submittedSnapshot:d,tableDraft:e,initialSubmittedOrder:f,pendingSummary:g,payableTotal:h,finalTotal:i,submittedItemsSubtotal:j}){let k=d||{},l=(e||{})?.totals||{},m=f||{},n=m?.totals||{};if(a&&b)return fx(b.total)??fx(c)??0;for(let a of[k.remainingAmount,k.orderTotal,k.total,l.remainingAmount,l.orderTotal,l.total,j,m.remainingAmount,m.orderTotal,m.total,n.remainingAmount,n.orderTotal,n.total,g?.remainingAmount,g?.orderTotal,g?.total,c,h,i]){let b=fx(a);if(null!==b)return b}return 0})({selectedSplitPersonId:ai,selectedSplitPerson:by,paymentPayableTotal:bL,submittedSnapshot:aR,tableDraft:aW,initialSubmittedOrder:j,pendingSummary:i,payableTotal:bU,finalTotal:bl,submittedItemsSubtotal:b4()}),b6=async(a,b)=>fz({stripePaymentIntentId:a,forcedPaymentContext:b,selectedPaymentMethod:au,visiblePaymentMethods:ax,toast:y,setIsLoading:R,tableInfo:g,itemsToPay:ar,paymentFormData:aN,tableDraft:aW,selectedOptions:am,checkoutStep:aP,payableTotal:bU,finalTotal:bl,paymentTipAmount:bJ,tipAmount:bj,selectedSplitPersonId:ai,appliedCoupon:L,paymentCouponDiscount:bK,couponDiscount:bk,ensureGuestSession:a4,hasUnsubmittedPaymentDraft:b3,initialSubmittedOrder:j,resolveSubmittedPaymentOrderId:b2,resolveSubmittedPaymentAmount:b5,pmdLatestSubmittedPaymentOrderIdRef:aT,submittedSnapshot:aR,existingOrderId:h,pendingSummary:i,resetPaymentAdjustmentsAfterSuccess:bW,setCheckoutStep:aQ,t:E,selectedSplitPerson:by,isSplitting:S,splitMethod:V,splitSourceItems:bu,itemAssignments:ab,pmdSubmittedItemsSubtotal:b4,paymentPayableTotal:bL,markOpenOrderAsPaid:b1,setPaidSplitPeople:al,taxSettings:H,subtotal:as,taxAmount:at,merchantSettings:J,estimatedMinutes:bV,onOpenOrderUpdate:m,clearCart:O,setSubmittedSnapshot:aS,getTenantKey:a2,getTableKey:a3,buildOpenOrderStorageKeys:a5}),b7=()=>{aI(null),av(null),aF(!1)},{stripeResolvedTableNumber:b8,stripeResolvedRestaurantId:b9,selectedMethod:ca,selectedProviderCode:cb,stripePaymentData:cc}=function({tableInfo:a,merchantSettings:b,stripeConfig:c,visiblePaymentMethods:d,selectedPaymentMethod:e,itemsToPay:f,paymentFormData:g,resolveSubmittedPaymentAmount:h}){let i=a?.table_id??void 0??void 0??void 0??null??null,j=a?.table_no??void 0??void 0??void 0??a?.table_id??null??null,k=null==j||""===String(j).trim()||Number.isNaN(Number(j))?null:Number(j),l=a?.table_name&&""!==String(a.table_name).trim()?String(a.table_name):k?`Table ${k}`:"Delivery",m=Number(a?.location_id||1),n=String(a?.location_id??a?.merchant_id??b?.accountId??"default"),o=ae(d,e),p=o?.provider_code||null,q={amount:h(),currency:c?.currency||b?.currency||"EUR",items:f.map(a=>({id:String(a.item.id),name:a.item.name,price:a.price,quantity:a.quantity||1,restaurantId:n})),customerInfo:{name:g.cardholderName||"",email:g.email||"",phone:g.phone||""},restaurantId:n,tableNumber:k||0};return{stripeResolvedTableIdRaw:i,stripeResolvedTableNumber:k,stripeResolvedTableName:l,stripeResolvedLocationId:m,stripeResolvedRestaurantId:n,selectedMethod:o,selectedProviderCode:p,stripePaymentData:q}}({tableInfo:g,merchantSettings:J,stripeConfig:ay,visiblePaymentMethods:ax,selectedPaymentMethod:au,itemsToPay:ar,paymentFormData:aN,resolveSubmittedPaymentAmount:b5}),cd=()=>fy({selectedMethod:ca,resolveSubmittedPaymentAmount:b5,setProviderInlineError:aI,toast:y,checkoutStep:aP,pendingSummary:i,resolveSubmittedPaymentOrderId:b2,hasUnsubmittedPaymentDraft:b3,setSelectedPaymentMethod:av,setIsLoading:R,ensureGuestSession:a4,tableInfo:g,merchantSettings:J,paymentFormData:aN,itemsToPay:ar});!function({handlePayment:a,setProviderInlineError:b,toast:c}){(0,e.useEffect)(()=>{},[])}({handlePayment:b6,setProviderInlineError:aI,toast:y});let{isTableContext:ce,orderContextLabel:cf,orderContextValue:cg,submittedContextLabel:ch,submittedContextValue:ci}=function({tableDraft:a,tableInfo:b,submittedSnapshot:c}){let d=a?.table_name||b?.table_name||(a?.table_no||b?.table_no?`Table ${a?.table_no||b?.table_no}`:"Delivery"),e=!!(b?.table_id||b?.table_no||a?.table_id||a?.table_no),f=e?d:"Delivery",g=c?.tableNumber||e?"Table":"Order type",h=c?.tableNumber?`Table ${c.tableNumber}`:f;return{tableDisplayName:d,isTableContext:e,orderContextLabel:e?"Table":"Order type",orderContextValue:f,submittedContextLabel:g,submittedContextValue:h}}({tableDraft:aW,tableInfo:g,submittedSnapshot:aR}),{reviewRating:cj,setReviewRating:ck,reviewComment:cl,setReviewComment:cm,reviewSubmitStatus:cn,setReviewSubmitStatus:co,reviewSubmitMessage:cp,invoiceDownloadStatus:cq,invoiceDownloadMessage:cr,activeReviewSharePlatforms:cs,canSubmitReview:ct,handleSubmitReview:cu,handleDownloadBusinessInvoice:cv}=function({merchantSettings:a,submittedSnapshot:b,initialSubmittedOrder:c,existingOrderId:d}){let[g,h]=(0,e.useState)(0),[i,j]=(0,e.useState)(""),[k,l]=(0,e.useState)("idle"),[m,n]=(0,e.useState)(""),[o,p]=(0,e.useState)("idle"),[q,r]=(0,e.useState)(""),s=(0,e.useMemo)(()=>Number(b?.orderId||b?.order_id||c?.orderId||c?.order_id||d||0),[b,c,d]),t=s>0?`pmd-review-submitted:${s}`:"";(0,e.useEffect)(()=>{h(0),j(""),l("idle"),n("")},[t]);let u=(0,e.useMemo)(()=>[{id:"trustpilot",label:"Trustpilot",icon:aa},{id:"instagram",label:"Instagram",icon:Z},{id:"google",label:"Google Reviews",icon:_},{id:"website",label:"Website",icon:Z},{id:"reviews",label:"Reviews page",icon:$.MessageSquare}].filter(({id:b})=>{let c=a?.reviewSocial?.platforms?.[b];return!!(c?.enabled&&c?.url)}),[a?.reviewSocial]),v="success"!==k&&(g>0||i.trim().length>0),w=async()=>{if(v&&"loading"!==k){l("loading"),n("");try{await f.apiClient.submitReview({order_id:s>0?s:null,rating:g,review:i.trim(),public_share_consent:null}),l("success"),n("Thank you — your review was sent to the restaurant.")}catch(b){let a=b instanceof Error?b.message:"Could not submit your review. Please try again.";if(/already submitted|already sent|one review/i.test(a)){l("success"),n("Thank you — a review has already been submitted for this order.");return}l("error"),n(a)}}},x=async()=>{let a=b?.orderId||b?.order_id||c?.orderId||d||null;if(!a||"loading"===o){p("error"),r("Order number is not available yet.");return}p("loading"),r("");try{let b=await f.apiClient.downloadBusinessInvoice(a),c=URL.createObjectURL(b),d=document.createElement("a");d.href=c,d.download=`business-invoice-${a}.pdf`,document.body.appendChild(d),d.click(),d.remove(),window.setTimeout(()=>URL.revokeObjectURL(c),1e3),p("idle")}catch(a){p("error"),r(a instanceof Error?a.message:"Could not download the business invoice.")}};return{reviewRating:g,setReviewRating:h,reviewComment:i,setReviewComment:j,reviewSubmitStatus:k,setReviewSubmitStatus:l,reviewSubmitMessage:m,invoiceDownloadStatus:o,invoiceDownloadMessage:q,activeReviewSharePlatforms:u,canSubmitReview:v,handleSubmitReview:w,handleDownloadBusinessInvoice:x}}({merchantSettings:J,submittedSnapshot:aR,initialSubmittedOrder:j,existingOrderId:h}),cw=!!(aW?.order_id||aW?.orderId||["submitted","submitted_unpaid","partially_paid","paid"].includes(String(aW?.status||"").toLowerCase())),cx=`${aP}:${a1?"personal":"shared"}:${cw?"status":"draft"}`;!function({isOpen:a,merchantSettings:b,setIsDarkTheme:c,paymentLoadVATSettings:d,initialCheckoutStep:f,existingOrderId:g,hasPersonalItems:h,preferPersonalReview:i,setCheckoutStep:j,initialSubmittedOrder:k,tableDraft:l,setSubmittedSnapshot:m,checkoutStep:n,checkoutListViewKey:o,isSubmittedTableDraftForStatus:p,tableInfo:q,taxSettings:r}){(0,e.useEffect)(()=>{},[b]),(0,e.useEffect)(()=>{let a=()=>{c("modern-dark"===(document.documentElement.getAttribute("data-theme")||"clean-light"))};a();let b=new MutationObserver(b=>{b.forEach(b=>{"attributes"===b.type&&"data-theme"===b.attributeName&&a()})});return b.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme"]}),()=>b.disconnect()},[c]),(0,e.useEffect)(()=>{a&&j(a=>{var b,c;let d;return d=(b={initialCheckoutStep:f,existingOrderId:g,hasPersonalItems:h,preferPersonalReview:i,currentStep:a}).initialCheckoutStep&&!(b.existingOrderId&&"review"===b.initialCheckoutStep)?b.initialCheckoutStep:b.existingOrderId?"submitted":"review",!b.preferPersonalReview&&!b.hasPersonalItems&&("submitted"===(c=b.currentStep)||"payment"===c||"paid"===c||aK(c))&&"review"===d?b.currentStep:d})},[a,g,f,h,i,j]),(0,e.useEffect)(()=>{if(!k||l?.draft_id&&!l?.order_id&&!l?.orderId)return;let a=Number(l?.order_id||l?.orderId||0),b=Number(k?.orderId||k?.order_id||0);a>0&&b>0&&a!==b||m(c=>{let d=Number(c?.orderId||c?.order_id||0);return d>0&&a>0&&d===a&&b!==a?c:k})},[k,l?.draft_id,l?.order_id,l?.orderId,m]),(0,e.useEffect)(()=>{!l?.draft_id||l?.order_id||l?.orderId||m(null)},[l?.draft_id,l?.order_id,l?.orderId,m]),(0,e.useEffect)(()=>{d()},[d]),(0,e.useEffect)(()=>{if(a){var b;(b={hasPersonalItems:h,initialCheckoutStep:f,currentStep:n}).hasPersonalItems&&"review"===b.initialCheckoutStep&&"review"!==b.currentStep&&j("review")}},[a,h,f,n,j]),(0,e.useLayoutEffect)(()=>{let b,c;if(!a||"u"<typeof document)return;let d=()=>{let a=document.querySelector('[data-pmd-checkout-scroll="1"]');return!!a&&(a.setAttribute("data-pmd-step-freeze","1"),b=window.setTimeout(()=>{a.setAttribute("data-pmd-step-freeze","0"),a.removeAttribute("data-pmd-step-freeze")},850),!0)};return d()||(c=window.setTimeout(d,16)),()=>{b&&window.clearTimeout(b),c&&window.clearTimeout(c)}},[a,n]),(0,e.useLayoutEffect)(()=>{},[a,o]),(0,e.useEffect)(()=>{if(a&&"review"===n&&!h&&!i&&p){if(l){let a=K(l,q,r?.percentage||0);m(b=>{let c=Number(b?.orderId||b?.order_id||0),d=Number(a.orderId||0);return b&&c===d?{...b,...a}:a})}j(aL())}},[a,n,h,i,p,l,q?.table_no,q?.table_id,r?.percentage,j,m])}({isOpen:a,merchantSettings:J,setIsDarkTheme:aM,paymentLoadVATSettings:I,initialCheckoutStep:k,existingOrderId:h,hasPersonalItems:a1,preferPersonalReview:l,setCheckoutStep:aQ,initialSubmittedOrder:j,tableDraft:aW,setSubmittedSnapshot:aS,checkoutStep:aP,checkoutListViewKey:cx,isSubmittedTableDraftForStatus:cw,tableInfo:g,taxSettings:H});let cy="review"===aP&&aW?.success&&aW.status&&"empty"!==aW.status&&!a1&&!l?"Table Order":({review:"My Order",submitted:"Order Status",split:"Split bill","split-items":"Assign items","split-shares":"Set shares","split-review":"Review split",payment:"Payment",paid:"Order complete"})[aP],{modernGreenTableDraftItems:cz,modernGreenTableDraftTotal:cA,modernGreenSubmittedItems:cB,modernGreenPersonalItems:cC}=function({tableDraft:a,submittedSnapshot:b,personalReviewItems:c,selectedOptions:d,adjustPriceForVAT:f,t:g}){let h=(0,e.useMemo)(()=>D(Array.isArray(a?.items)?a.items:[]),[a?.items]),i=(0,e.useMemo)(()=>Number(a?.totals?.total??a?.totals?.orderTotal??a?.total??x(a,"total")??x(a,"subtotal")??0),[a]);return{modernGreenTableDraftItems:h,modernGreenTableDraftTotal:i,modernGreenSubmittedItems:(0,e.useMemo)(()=>D(Array.isArray(b?.submittedItems)?b.submittedItems:[]),[b?.submittedItems]),modernGreenPersonalItems:(0,e.useMemo)(()=>c.map(a=>{let b=d[String(a.__pmdOptionKey||a.item.id)]||{},c=[];Object.entries(b).forEach(([b,d])=>{let e=(a.item.options||[]).find(a=>String(a.name)===String(b)),g=e?.values?.find(a=>String(a.id)===String(d));g&&c.push({name:String(g.value||g.name||""),price:Number(f(Number(g.price||0)))})});let e=a.item.nameKey?g(a.item.nameKey):a.item.name,h=c.map(a=>a.name).filter(Boolean).join(", "),i=h?`${e} — ${h}`:String(a.__pmdUnitLabel||e),j=Number(f(a.item.price||0))+c.reduce((a,b)=>a+Number(b.price||0),0),k=Number(a.quantity||1);return{...a,quantity:k,__pmdDisplayName:i,__pmdDisplaySubtotal:j*k}}),[c,d,f,g])}}({tableDraft:aW,submittedSnapshot:aR,personalReviewItems:ap,selectedOptions:am,adjustPriceForVAT:ao,t:E});return(0,d.jsx)(bC,{isOpen:a,isKazenJapaneseCheckoutVisual:aV,isModernGreenCheckoutVisual:"modern_green"===p,isOrganicCheckoutVisual:aU,checkoutVisualTheme:p,modalPrimaryBtn:bX,modalPrimaryBtnStyle:bY,modalSecondaryBtn:bZ,iconBackBtn:b$,modalTitle:cy,checkoutStep:aP,setCheckoutStep:aQ,selectedSplitPersonId:ai,onClose:b,tableDraft:aW,tableInfo:g,taxSettings:H,isSubmittedTableDraftForStatus:cw,hasPersonalItems:a1,preferPersonalReview:l,orderContextLabel:cf,orderContextValue:cg,isTableContext:ce,submitDraftLoading:a$,draftLoading:aY,handleSubmitTableDraft:b0,setSubmittedSnapshot:aS,personalReviewItems:ap,addToCart:P,t:E,handleOptionsChange:an,vatLabels:bn,subtotal:as,taxAmount:at,tipAmount:bj,appliedCoupon:L,couponDiscount:bk,finalTotal:bl,isLoading:Q,allItems:c,handleConfirmMyItems:b_,setIsSplitting:T,splitGrandTotal:bv,splitMethod:V,startSplitFlow:bD,chooseSplitMethod:bE,splitGuestCount:X,suggestedSplitGuestCount:br,removeSplitGuest:bt,addSplitGuest:bs,splitGuestProfiles:bo,equalSplitPeople:bw,getSplitGuestAvatar:bq,splitGuestNames:bp,unassignedSplitItems:bz,splitSourceItems:bu,itemAssignments:ab,setItemAssignments:af,sharePercents:ag,setSharePercents:ah,sharePercentTotal:bA,canConfirmSplitMethod:bB,goToSplitReview:bF,activeSplitPeople:bx,setSelectedSplitPersonId:aj,toast:y,submittedSnapshot:aR,estimatedMinutes:bV,paidTipAmount:bP,paidCouponDiscount:bQ,paidAmountTotal:bR,orderStatusTotal:bm,submittedBaseTotal:bi,submittedContextLabel:ch,submittedContextValue:ci,initialSubmittedOrder:j,existingOrderId:h,onOpenOrderUpdate:m,reviewRating:cj,setReviewRating:ck,reviewSubmitStatus:cn,setReviewSubmitStatus:co,reviewComment:cl,setReviewComment:cm,canSubmitReview:ct,handleSubmitReview:cu,reviewSubmitMessage:cp,merchantSettings:J,activeReviewSharePlatforms:cs,handleDownloadBusinessInvoice:cv,invoiceDownloadStatus:cq,invoiceDownloadMessage:cr,selectedSplitPerson:by,pendingSummary:i,paymentVatAmount:bN,paymentSubtotalAmount:bM,paymentVatPercentage:bO,paymentBaseAmount:bI,paymentTipAmount:bJ,paymentCouponDiscount:bK,paymentPayableTotal:bL,tipSettings:G,paymentTipPercentage:bG,paymentCustomTip:bH,updatePaymentTipPercentage:bS,customTip:a8,updatePaymentCustomTip:bT,couponCode:bc,setCouponCode:bd,setCouponError:bh,couponError:bg,couponLoading:be,setCouponLoading:bf,validateCoupon:M,removeCoupon:N,selectedPaymentMethod:au,loadingPayments:aw,visiblePaymentMethods:ax,handlePaymentMethodSelect:a=>{if(aI(null),"card"===a)try{globalThis.__stripePreferred="card"}catch{}av(a)},stripePromise:aA,stripeConfig:ay,selectedMethod:ca,isDarkTheme:aJ,renderPaymentForm:()=>(0,d.jsx)(ft,{selectedPaymentMethod:au,selectedMethod:ca,stripePromise:aA,stripeConfig:ay,stripeConfigError:az,hasUnsubmittedPaymentDraft:b3,checkoutStep:aP,setCheckoutStep:aQ,selectedProviderCode:cb,handleBackToMethods:b7,paypalConfigLoading:aB,effectivePayPalClientId:aC,effectivePayPalCurrency:aD,resolveSubmittedPaymentAmount:b5,itemsToPay:ar,stripeResolvedRestaurantId:b9,paymentFormData:aN,stripeResolvedTableNumber:b8,handlePayment:b6,toast:y,merchantSettings:J,payableTotal:bU,providerInlineError:aG,isLoading:Q,startHostedRedirectCheckout:cd,stripePaymentData:cc,finalTotal:bl,modalPrimaryBtnStyle:bY,cashCollectionConfirmed:aE,setCashCollectionConfirmed:aF}),renderPaymentButton:()=>(0,d.jsx)(fu,{selectedMethod:ca,checkoutStep:aP,payableTotal:bU,finalTotal:bl,selectedPaymentMethod:au,handlePayment:b6,isLoading:Q,paymentFormData:aN}),handlePayment:b6,payableTotal:bU,modernGreenPersonalItems:cC,modernGreenTableDraftItems:cz,modernGreenTableDraftTotal:cA,modernGreenSubmittedItems:cB})}let fN=[];function fO(a){return String(a||"").trim().replace(/\s+/g," ").toLowerCase()}function fP(a){let b=Array.isArray(a)?a.map(a=>String(a||"").trim()).filter(Boolean):[],c=new Set(["omakase","sushi","grill"]),d=b.some(a=>{let b=fO(a);return b&&"all"!==b&&!c.has(b)}),e=new Set,f=[];return b.forEach(a=>{let b=String(a||"").trim(),g=fO(b);!g||e.has(g)||d&&c.has(g)||(e.add(g),f.push(b))}),f}function fQ(a,b){let c=function a(b){if(null==b)return"";if("string"==typeof b||"number"==typeof b)return String(b||"").trim();if("object"==typeof b){let c=b.name??b.title??b.label??b.category??b.category_name??b.categoryName??b.menu_category??b.menuCategory??b.group??b.group_name??b.display_name??"";if(c&&"object"!=typeof c)return String(c).trim();if(c&&"object"==typeof c)return a(c)}return""}(b);if(!c||"[object Object]"===c)return;let d=fO(c);!d||a.some(a=>fO(a)===d)||a.push(c)}function fR(a){let b=[];return Array.isArray(a)?a.forEach(a=>fQ(b,a)):fQ(b,a),b}function fS(a,b){var c;let d,e=fR(a),f=(c=Array.isArray(b)?b:[],d=[],Array.isArray(c)&&c.forEach(a=>{let b;(b=[],!a||"object"!=typeof a||([a.category,a.category_name,a.categoryName,a.menu_category,a.menuCategory,a.category_title,a.categoryTitle,a.group,a.group_name,a.department,a.section,a.menu?.category,a.menu?.category_name,a.meta?.category,a.metadata?.category].forEach(a=>{fR(a).forEach(a=>fQ(b,a))}),Array.isArray(a.categories)&&a.categories.forEach(a=>{fR(a).forEach(a=>fQ(b,a))})),b).forEach(a=>fQ(d,a))}),d),g=[...e.length?e:f,...fN,...f],h=new Set,i=[];return g.forEach(a=>{let b=String(a||"").trim(),c=fO(b);!c||h.has(c)||(h.add(c),i.push(b))}),(i.length>fN.length||e.length&&i.length===fN.length)&&(fN=fP(i)),fP(fN.length?fN:i)}function fT(a){let b=String(a||"").trim();if(!b||"undefined"===b||"null"===b)return"";if(/^https?:\/\//i.test(b))return b;let c=b.replace(/^\/+/,""),d=c.split("/").filter(Boolean).pop()||c;return c.startsWith("assets/media/uploads/")?`/${c}`:c.startsWith("/assets/media/uploads/")?c:c.startsWith("uploads/")?`/assets/media/${c}`:!c.includes("/")||c.startsWith("assets/media/")?`/assets/media/uploads/${d}`:`/${c}`}function fU(a){let{setSharedTableOrder:b,setLocalOpenOrder:c,setHasLocalOpenOrder:d}=a;return function(a){if(a?.status==="draft"||a?.draft_id)return void b(a);if(a?.paymentStatus==="paid"||a?.status==="paid"){let e=a?.orderId?a:{...a,orderId:a?.order_id};c(e),d(!!e?.orderId),b(a=>a?.order_id&&String(a.order_id)===String(e?.orderId)?{...a,status:"paid",paymentStatus:"paid"}:a);return}(a?.orderId||a?.order_id)&&(c(a?.orderId?a:{...a,orderId:a.order_id}),d(!0),b(a=>a?.draft_id?null:a))}}function fV(...a){let b=["valet_enabled","valetEnabled","enable_valet","enableValet","valet_parking_enabled","valetParkingEnabled","valet_service_enabled","valetServiceEnabled","pmd_valet_enabled","pmdValetEnabled","show_valet","showValet"],c=[...a.filter(Boolean)];for(;c.length>0;){let a=c.shift();if(a&&"object"==typeof a){for(let c of b)if(Object.prototype.hasOwnProperty.call(a,c)){let b=function(a){if(null==a)return null;if("boolean"==typeof a)return a;if("number"==typeof a){if(1===a)return!0;if(0===a)return!1}let b=String(a).trim().toLowerCase();return b&&"null"!==b&&"undefined"!==b?!!["1","true","yes","on","enabled","active","available"].includes(b)||!["0","false","no","off","disabled","inactive","unavailable"].includes(b)&&null:null}(a[c]);if(null!==b)return b}for(let b of["data","settings","config","features","services","restaurant","merchant","frontend","theme"])a[b]&&"object"==typeof a[b]&&c.push(a[b])}}return!0}let fW=(a,b)=>a instanceof Error?a.message:b;function fX(a){return["tabs","tab","tabbed","classic","normal","list","flat","category-tabs","categories-top","top-categories","category-tabs-full-item-list"].includes(String(a||"").trim().toLowerCase().replace(/[_\s-]+/g,"-"))?"tabs":"accordion"}function fY(a){let{apiMenuItems:b,menuItems:c,menuData:e,allCategories:f,tableInfo:g,displayTableNumber:h,tableIdString:i,cmsSettings:j,merchantSettings:k,taxSettings:l,items:m,totalItems:n,totalPrice:o,lastInteractedItem:p,restaurantDisplayName:q,themeMenuActions:r,addToCart:s,handleFirstAdd:t,toast:u,apiClient:v,handleItemSelect:w,handleCartClick:x,shouldShowTableOrderAction:y,setPaymentModalInitialStep:z,sharedTableOrder:A,setPaymentModalPreferPersonalReview:B,setPaymentModalOpen:C,tableOrderActionCount:D,isPaymentModalOpen:E,activeExistingOrderId:F,activePendingSummary:G,activeSubmittedOrder:H,paymentModalInitialStep:I,paymentModalPreferPersonalReview:J,setToolbarPricingSnapshot:K,setSharedTableOrder:L,setLocalOpenOrder:M,setHasLocalOpenOrder:N,normalizeModernGreenLogoUrl:O}=a,Q=fU({setSharedTableOrder:L,setLocalOpenOrder:M,setHasLocalOpenOrder:N}),S=b.length?b:c.length?c:e,T=fS(f,S),U=g?.table_no??g?.table_id??h??i??null,V=O([j?.effectiveLogoUrl,j?.logoUrl,j?.logo_url,j?.logo,j?.restaurantLogoUrl,j?.restaurant_logo,j?.site_logo,j?.header_logo,j?.frontend_logo,j?.business_logo,j?.brand_logo,j?.data?.effectiveLogoUrl,j?.data?.logoUrl,j?.data?.logo_url,j?.data?.logo,j?.data?.restaurant_logo,k?.effectiveLogoUrl,k?.logoUrl,k?.logo_url,k?.logo,k?.restaurantLogoUrl,k?.restaurant_logo,k?.site_logo,k?.header_logo,k?.frontend_logo,k?.business_logo,k?.brand_logo,k?.data?.effectiveLogoUrl,k?.data?.logoUrl,k?.data?.logo_url,k?.data?.logo,k?.data?.restaurant_logo].find(a=>String(a||"").trim())||""),W=function(...a){let b=["kazen_menu_layout","kazenMenuLayout","menu_layout","menuLayout","food_display_style","foodDisplayStyle","category_display","categoryDisplay"];for(let c of a)if(c&&"object"==typeof c)for(let a of b){let b=c?.[a];if(null!=b&&String(b).trim())return fX(b);let d=c?.data?.[a];if(null!=d&&String(d).trim())return fX(d);let e=c?.settings?.[a];if(null!=e&&String(e).trim())return fX(e)}return"accordion"}(j,k,null,null),X=fV(j,k,g),Y=async()=>{let a=g?.table_id||g?.table_no||i||"delivery";try{await v.callWaiter(String(a),"."),u({title:"Waiter called",description:"The team has been notified."})}catch(a){u({title:"Waiter call failed",description:fW(a,"Failed to call waiter."),variant:"destructive"})}},Z=async(b="")=>{let c=g?.table_id||g?.table_no||i||"delivery",d=String(b||"").trim();if(!d)return void a.setNoteModalOpen?.(!0);try{await v.callTableNote(String(c),d,new Date().toISOString()),u({title:"Note sent",description:"Your note was sent to the team."})}catch(a){u({title:"Note failed",description:fW(a,"Failed to send note."),variant:"destructive"})}},$=async(a={})=>{let b=String(a?.name||"Guest").trim()||"Guest",c=String(a?.licensePlate||a?.license_plate||"").trim(),d=String(a?.carModel||a?.car_make||"Not provided").trim()||"Not provided";if(!c)return void u({title:"Valet ticket required",description:"Please enter your valet ticket number or license plate before requesting your car.",variant:"destructive"});try{await v.createValetRequest({name:b,license_plate:c,car_make:d,table_id:i||void 0,table_no:U?String(U):void 0,qr:g?.qr_code?String(g.qr_code):void 0}),u({title:"Valet requested",description:"Your valet request has been sent."})}catch(a){u({title:"Valet request failed",description:fW(a,"Failed to submit valet request."),variant:"destructive"})}};return(0,d.jsx)(P,{actions:r,children:(0,d.jsxs)(R,{src:"/themes/kazen-japanese/?embedded=1&from=pmd",sourceItems:S,cartItems:m,totalItems:n,totalPrice:o,lastInteractedItem:p,categories:T,restaurantName:q,logoUrl:V,tableNumber:U,menuLayout:W,showValet:X,onAddItem:(a,b=1)=>{let c={...a};l.enabled&&l.percentage>0&&0===l.menuPrice&&(c.price=Number(a.price||0)/(1+l.percentage/100),c.options&&(c.options=c.options.map(a=>({...a,values:(a.values||[]).map(a=>({...a,price:Number(a.price||0)/(1+l.percentage/100)}))}))));let d=m.find(b=>b.item.id===a.id)?.quantity||0;s(c,b),0===d&&t(a)},onOpenItem:a=>w(a),onCheckout:x,onCallWaiter:Y,onOpenNote:Z,onOpenValet:$,onTableOrder:()=>{y&&(z(A?.status==="draft"?"review":A?.status==="paid"?"paid":"submitted"),B(!1),C(!0))},showTableOrder:y,tableOrderCount:D,children:[!1,(0,d.jsx)(fM,{isOpen:E,onClose:()=>{C(!1),B(!1)},items:m,tableInfo:g,existingOrderId:F,pendingSummary:G,initialSubmittedOrder:H,initialCheckoutStep:I,preferPersonalReview:J,checkoutVisualTheme:"kazen_japanese",onCartPricingUpdate:K,onOpenOrderUpdate:Q})]})})}let fZ=(a,b)=>a instanceof Error?a.message:b;function f$(a){return["tabs","tab","tabbed","classic","normal","list","flat","category-tabs","categories-top","top-categories","category-tabs-full-item-list"].includes(String(a||"").trim().toLowerCase().replace(/[_\s-]+/g,"-"))?"tabs":"accordion"}function f_(a){let{apiMenuItems:b=[],menuItems:c=[],menuData:e=[],allCategories:f=[],tableInfo:g,displayTableNumber:h,tableIdString:i,cmsSettings:j,merchantSettings:k,taxSettings:l,items:m=[],totalItems:n=0,totalPrice:o=0,lastInteractedItem:p,restaurantDisplayName:q,themeMenuActions:r,addToCart:s,handleFirstAdd:t,toast:u,apiClient:v,handleItemSelect:w,handleCartClick:x,shouldShowTableOrderAction:y,setPaymentModalInitialStep:z,sharedTableOrder:A,setPaymentModalPreferPersonalReview:B,setPaymentModalOpen:C,tableOrderActionCount:D,isPaymentModalOpen:E,activeExistingOrderId:F,activePendingSummary:G,activeSubmittedOrder:H,paymentModalInitialStep:I,paymentModalPreferPersonalReview:J,setToolbarPricingSnapshot:K,setSharedTableOrder:L,setLocalOpenOrder:M,setHasLocalOpenOrder:N}=a,O=fU({setSharedTableOrder:L,setLocalOpenOrder:M,setHasLocalOpenOrder:N}),Q=b.length?b:c.length?c:e,S=fS(f,Q),T=g?.table_no??g?.table_id??h??i??null,U=fT([j?.effectiveLogoUrl,j?.logoUrl,j?.logo_url,j?.logo,j?.restaurantLogoUrl,j?.restaurant_logo,j?.site_logo,j?.header_logo,j?.frontend_logo,j?.business_logo,j?.brand_logo,j?.data?.effectiveLogoUrl,j?.data?.logoUrl,j?.data?.logo_url,j?.data?.logo,j?.data?.restaurant_logo,k?.effectiveLogoUrl,k?.logoUrl,k?.logo_url,k?.logo,k?.restaurantLogoUrl,k?.restaurant_logo,k?.site_logo,k?.header_logo,k?.frontend_logo,k?.business_logo,k?.brand_logo,k?.data?.effectiveLogoUrl,k?.data?.logoUrl,k?.data?.logo_url,k?.data?.logo,k?.data?.restaurant_logo].find(a=>String(a||"").trim())||""),V=function(...a){let b=["kazen_menu_layout","kazenMenuLayout","menu_layout","menuLayout","food_display_style","foodDisplayStyle","category_display","categoryDisplay"];for(let c of a)if(c&&"object"==typeof c)for(let a of b){let b=c?.[a];if(null!=b&&String(b).trim())return f$(b);let d=c?.data?.[a];if(null!=d&&String(d).trim())return f$(d);let e=c?.settings?.[a];if(null!=e&&String(e).trim())return f$(e)}return"tabs"}(j,k,null,null),W=fV(j,k,g),X=async()=>{let a=g?.table_id||g?.table_no||i||"delivery";try{await v.callWaiter(String(a),"."),u({title:"Waiter called",description:"The team has been notified."})}catch(a){u({title:"Waiter call failed",description:fZ(a,"Failed to call waiter."),variant:"destructive"})}},Y=async(b="")=>{let c=g?.table_id||g?.table_no||i||"delivery",d=String(b||"").trim();if(!d)return void a.setNoteModalOpen?.(!0);try{await v.callTableNote(String(c),d,new Date().toISOString()),u({title:"Note sent",description:"Your note was sent to the team."})}catch(a){u({title:"Note failed",description:fZ(a,"Failed to send note."),variant:"destructive"})}},Z=async(a={})=>{let b=String(a?.name||"Guest").trim()||"Guest",c=String(a?.licensePlate||a?.license_plate||"Not provided").trim()||"Not provided",d=String(a?.carModel||a?.car_make||"Not provided").trim()||"Not provided";try{await v.createValetRequest({name:b,license_plate:c,car_make:d,table_id:i||void 0,table_no:T?String(T):void 0,qr:g?.qr_code?String(g.qr_code):void 0}),u({title:"Valet requested",description:"Your valet request has been sent."})}catch(a){u({title:"Valet request failed",description:fZ(a,"Failed to submit valet request."),variant:"destructive"})}};return(0,d.jsx)(P,{actions:r,children:(0,d.jsx)(R,{src:"/themes/velvet-terracotta/?embedded=1&from=pmd",sourceItems:Q,cartItems:m,totalItems:n,totalPrice:o,lastInteractedItem:p,categories:S,restaurantName:q,logoUrl:U,tableNumber:T,menuLayout:V,showValet:W,onAddItem:(a,b=1)=>{let c={...a};l?.enabled&&l?.percentage>0&&l?.menuPrice===0&&(c.price=Number(a.price||0)/(1+l.percentage/100),c.options&&(c.options=c.options.map(a=>({...a,values:(a.values||[]).map(a=>({...a,price:Number(a.price||0)/(1+l.percentage/100)}))}))));let d=m.find(b=>b.item.id===a.id)?.quantity||0;s(c,b),0===d&&t(a)},onOpenItem:a=>w(a),onCheckout:x,onCallWaiter:X,onOpenNote:Y,onOpenValet:Z,onTableOrder:()=>{y&&(z(A?.status==="draft"?"review":A?.status==="paid"?"paid":"submitted"),B(!1),C(!0))},showTableOrder:y,tableOrderCount:D,children:(0,d.jsx)(fM,{isOpen:E,onClose:()=>{C(!1),B(!1)},items:m,tableInfo:g,existingOrderId:F,pendingSummary:G,initialSubmittedOrder:H,initialCheckoutStep:I,preferPersonalReview:J,checkoutVisualTheme:"kazen_japanese",onCartPricingUpdate:K,onOpenOrderUpdate:O})})})}let f0=(0,U.default)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);var f1=a.i(840),f2=a.i(95598),f3=a.i(75995),f4=a.i(80343),f5=a.i(93305);let f6=(0,U.default)("ShoppingCart",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]]);function f7({cartCount:a,totalPrice:b,showTableOrder:c,tableOrderCount:e,onCheckout:f,onCallWaiter:g,onOpenNote:h,onOpenValet:i,onTableOrder:j,onLanguage:k}){return(0,d.jsxs)("div",{className:"mg-actions","aria-label":"Modern Green actions",children:[(0,d.jsxs)("button",{type:"button",onClick:()=>void g(),children:[(0,d.jsx)(f2.Bell,{size:18})," Waiter"]}),(0,d.jsxs)("button",{type:"button",onClick:()=>void h(),children:[(0,d.jsx)($.MessageSquare,{size:18})," Note"]}),c&&(0,d.jsxs)("button",{type:"button",onClick:()=>void j?.(),children:[(0,d.jsx)(f4.ClipboardList,{size:18})," Table"," ",e?`(${e})`:""]}),(0,d.jsxs)("button",{type:"button",onClick:()=>void i(),children:[(0,d.jsx)(f3.Car,{size:18})," Valet"]}),k&&(0,d.jsxs)("button",{type:"button",onClick:()=>void k(),children:[(0,d.jsx)(f5.Languages,{size:18})," Language"]}),(0,d.jsxs)("button",{type:"button",className:"mg-checkout",onClick:f,children:[(0,d.jsx)(f6,{size:18})," ",a," · $",b.toFixed(2)]})]})}function f8(a){return String(a?.id??a?.menu_id??a?.menuId??"")}function f9(a){return String(a?.name??a?.menu_name??a?.title??"Menu item")}function ga(a){return String(a?.description??a?.menu_description??a?.desc??"")}function gb(a){return String(a?.category??a?.category_name??a?.categoryName??a?.menu_category_name??"Menu")}function gc(a){let b=Number(a?.price??a?.menu_price??a?.sale_price??0);return Number.isFinite(b)?b:0}function gd(a){let b=Array.isArray(a?.images)?a.images:[],c=Array.isArray(a?.media)?a.media:[];return String([a?.image,a?.image_url,a?.imageUrl,a?.thumb,a?.thumbnail,...b.map(a=>"string"==typeof a?a:a?.url||a?.path||a?.image_path||a?.src),...c.map(a=>a?.url||a?.path||a?.image_path||a?.src)].find(a=>"string"==typeof a&&a.trim())||"")}function ge(a){let[b,c]=(0,e.useState)(""),[f,g]=(0,e.useState)("All"),h=Array.isArray(a.sourceItems)?a.sourceItems:[],i=(0,e.useMemo)(()=>["All",...Array.from(new Set([...a.categories||[],...h.map(gb)].filter(Boolean)))],[a.categories,h]),j=(0,e.useMemo)(()=>h.filter(a=>{let c="All"===f||gb(a)===f,d=`${f9(a)} ${ga(a)} ${gb(a)}`.toLowerCase();return c&&d.includes(b.toLowerCase())}),[h,f,b]),k=j.filter(a=>a?.is_bestseller||a?.is_recommended||a?.is_featured||a?.is_popular||a?.is_chef_recommended).slice(0,4);return(0,d.jsxs)("div",{className:"pmd-theme-modern-green pmd-customer-page page--menu",children:[(0,d.jsx)("style",{children:`
        .pmd-theme-modern-green{min-height:100vh;color:#eefbf3;background:radial-gradient(circle at 85% 0%,rgba(25,118,84,.34),transparent 28%),linear-gradient(180deg,#031b12 0%,#020806 56%,#000 100%);padding:24px 16px 136px;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.pmd-theme-modern-green *{box-sizing:border-box}.pmd-theme-modern-green .mg-shell{max-width:1120px;margin:0 auto}.pmd-theme-modern-green .mg-hero{border:1px solid rgba(167,244,197,.18);background:linear-gradient(135deg,rgba(10,51,34,.94),rgba(2,15,10,.88));box-shadow:0 24px 80px rgba(0,0,0,.4);border-radius:32px;padding:24px;display:grid;gap:20px}.pmd-theme-modern-green .mg-logo{width:64px;height:64px;border-radius:22px;object-fit:cover;background:#effff5}.pmd-theme-modern-green h1{font-size:clamp(2rem,7vw,4.8rem);line-height:.92;margin:12px 0;color:#f8fff9;letter-spacing:-.06em}.pmd-theme-modern-green .mg-muted{color:#a7c7b5}.pmd-theme-modern-green .mg-search{display:flex;align-items:center;gap:10px;border:1px solid rgba(166,244,197,.2);background:rgba(255,255,255,.06);border-radius:999px;padding:12px 16px}.pmd-theme-modern-green .mg-search input{all:unset;width:100%;color:#fff}.pmd-theme-modern-green .mg-cats{display:flex;gap:10px;overflow:auto;padding:18px 2px}.pmd-theme-modern-green button{border:0;cursor:pointer}.pmd-theme-modern-green .mg-cat{white-space:nowrap;border-radius:999px;padding:10px 16px;background:rgba(255,255,255,.07);color:#dceee4;border:1px solid rgba(255,255,255,.08)}.pmd-theme-modern-green .mg-cat[data-active=true]{background:#82f0a8;color:#052414}.pmd-theme-modern-green .mg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.pmd-theme-modern-green .mg-card{overflow:hidden;border-radius:28px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);box-shadow:0 14px 40px rgba(0,0,0,.28)}.pmd-theme-modern-green .mg-img{height:170px;background:rgba(255,255,255,.05);position:relative}.pmd-theme-modern-green .mg-img img{object-fit:cover}.pmd-theme-modern-green .mg-card-body{padding:16px}.pmd-theme-modern-green .mg-card h3{margin:0 0 8px;font-size:1.1rem}.pmd-theme-modern-green .mg-card p{min-height:44px;margin:0 0 14px;color:#a7c7b5;font-size:.9rem}.pmd-theme-modern-green .mg-card-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.pmd-theme-modern-green .mg-add{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:#82f0a8;color:#052414;padding:10px 14px;font-weight:800}.pmd-theme-modern-green .mg-price{font-weight:900;color:#f5fff9}.pmd-theme-modern-green .mg-actions{position:fixed;left:50%;bottom:18px;z-index:40;transform:translateX(-50%);display:flex;gap:8px;max-width:min(980px,calc(100vw - 24px));overflow:auto;padding:10px;border-radius:999px;background:rgba(2,12,8,.88);border:1px solid rgba(130,240,168,.24);box-shadow:0 20px 60px rgba(0,0,0,.5);backdrop-filter:blur(18px)}.pmd-theme-modern-green .mg-actions button{display:flex;align-items:center;gap:6px;white-space:nowrap;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.08);color:#effff5}.pmd-theme-modern-green .mg-actions .mg-checkout{background:#82f0a8;color:#052414;font-weight:900}`}),(0,d.jsxs)("main",{className:"mg-shell",children:[(0,d.jsxs)("section",{className:"mg-hero",children:[(0,d.jsxs)("div",{children:[a.logoUrl?(0,d.jsx)("img",{className:"mg-logo",src:a.logoUrl,alt:""}):null,(0,d.jsxs)("p",{className:"mg-muted",children:["Table ",a.tableNumber||"Guest"]}),(0,d.jsx)("h1",{children:a.restaurantName}),(0,d.jsx)("p",{className:"mg-muted",children:"Fresh picks, live from the PayMyDine menu."})]}),(0,d.jsxs)("label",{className:"mg-search",children:[(0,d.jsx)(f0,{size:18}),(0,d.jsx)("input",{value:b,onChange:a=>c(a.target.value),placeholder:"Search dishes"})]})]}),(0,d.jsx)("nav",{className:"mg-cats","aria-label":"Menu categories",children:i.map(a=>(0,d.jsx)("button",{type:"button",className:"mg-cat","data-active":a===f,onClick:()=>g(a),children:a},a))}),k.length>0&&(0,d.jsxs)("p",{className:"mg-muted",children:[(0,d.jsx)(aa,{size:16,style:{display:"inline"}})," Featured today"]}),(0,d.jsx)("section",{className:"mg-grid",children:j.map(b=>(0,d.jsxs)("article",{className:"mg-card",children:[(0,d.jsx)("button",{type:"button",className:"mg-img",onClick:()=>a.onOpenItem(b),children:gd(b)?(0,d.jsx)(f1.OptimizedImage,{src:gd(b),alt:f9(b),fill:!0}):null}),(0,d.jsxs)("div",{className:"mg-card-body",children:[(0,d.jsx)("h3",{children:f9(b)}),(0,d.jsx)("p",{children:ga(b)||gb(b)}),(0,d.jsxs)("div",{className:"mg-card-footer",children:[(0,d.jsx)("span",{className:"mg-price",children:M(gc(b))}),(0,d.jsxs)("button",{type:"button",className:"mg-add",onClick:()=>a.onAddItem(b,1),children:[(0,d.jsx)(a4.Plus,{size:16})," Add"]})]})]})]},f8(b)))})]}),(0,d.jsx)(f7,{cartCount:a.totalItems,totalPrice:a.totalPrice,showTableOrder:a.showTableOrder,tableOrderCount:a.tableOrderCount,onCheckout:a.onCheckout,onCallWaiter:a.onCallWaiter,onOpenNote:()=>a.onOpenNote(),onOpenValet:()=>a.onOpenValet(),onTableOrder:a.onTableOrder,onLanguage:a.onLanguage}),a.children]})}var gf=a.i(50355);function gg(a){let b=[{key:"waiter",label:"Waiter",icon:"🛎️",onClick:a.onCallWaiter},{key:"note",label:"Note",icon:"✎",onClick:a.onOpenNote},...a.showTableOrder?[{key:"table",label:"Table Order",icon:"☷",onClick:a.onOpenTableOrder,count:a.tableOrderCount}]:[],{key:"checkout",label:"Checkout",icon:"🧾",onClick:a.onOpenCheckout,count:a.cartCount,primary:!0}];return(0,d.jsx)("nav",{className:gf.default.dock,"data-theme":"modernGreen","aria-label":"Menu actions",children:b.map(a=>(0,d.jsxs)("button",{type:"button",className:`${gf.default.button} ${a.primary?gf.default.primary:""}`,onClick:()=>void a.onClick(),children:[(0,d.jsx)("span",{className:gf.default.icon,"aria-hidden":"true",children:a.icon}),(0,d.jsx)("span",{children:a.label}),Number(a.count||0)>0&&(0,d.jsx)("span",{className:gf.default.badge,children:a.count})]},a.key))})}let gh=(0,U.default)("Leaf",[["path",{d:"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",key:"nnexq3"}],["path",{d:"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",key:"mt58a7"}]]),gi=(0,U.default)("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]),gj=(0,U.default)("Sprout",[["path",{d:"M7 20h10",key:"e6iznv"}],["path",{d:"M10 20c5.5-2.5.8-6.4 3-10",key:"161w41"}],["path",{d:"M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z",key:"9gtqwd"}],["path",{d:"M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z",key:"bkxnd2"}]]);function gk({halal:a=!1,vegetarian:b=!1,vegan:c=!1,allergens:e=[],allergyTags:f=[],compact:g=!1,className:h}){let i=Array.from(new Set([...f||[],...e||[]].filter(Boolean))),j=[...a?[{key:"halal",label:"Halal",title:"Halal",icon:(0,d.jsx)("span",{"aria-hidden":"true",className:"font-[serif] text-[9px] font-bold leading-none tracking-tight",children:"حلال"}),compactClassName:"border-sky-200/80 bg-sky-50/95 text-sky-700",expandedClassName:"border-sky-200/80 bg-sky-50/95 text-sky-800",iconClassName:"bg-white/85 text-sky-700"}]:[],...b?[{key:"vegetarian",label:"Vegetarian",shortLabel:"Veg",title:"Vegetarian",icon:(0,d.jsx)(gh,{className:"h-3.5 w-3.5","aria-hidden":"true"}),compactClassName:"border-emerald-200/80 bg-emerald-50/95 text-emerald-700",expandedClassName:"border-emerald-200/80 bg-emerald-50/95 text-emerald-800",iconClassName:"bg-white/85 text-emerald-700"}]:[],...c?[{key:"vegan",label:"Vegan",title:"Vegan",icon:(0,d.jsx)(gj,{className:"h-3.5 w-3.5","aria-hidden":"true"}),compactClassName:"border-lime-200/80 bg-lime-50/95 text-lime-700",expandedClassName:"border-lime-200/80 bg-lime-50/95 text-lime-800",iconClassName:"bg-white/85 text-lime-700"}]:[],...i.length>0?[{key:"allergens",label:`Allergens: ${i.join(", ")}`,title:`Allergy warning: ${i.join(", ")}`,icon:(0,d.jsx)(gi,{className:"h-3.5 w-3.5","aria-hidden":"true"}),compactClassName:"border-amber-200/80 bg-amber-50/95 text-amber-700",expandedClassName:"border-amber-200/80 bg-amber-50/95 text-amber-900",iconClassName:"bg-white/85 text-amber-700"}]:[]];return 0===j.length?null:(0,d.jsx)("div",{className:(0,aD.cn)("flex flex-wrap items-center gap-1.5",h),role:"list","aria-label":"Food attributes and allergy warnings",children:j.map(a=>(0,d.jsxs)("span",{role:"listitem",tabIndex:0,className:(0,aD.cn)(g?"inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm ring-1 ring-white/70 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2":"inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-medium leading-none shadow-sm ring-1 ring-white/70 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",g?a.compactClassName:a.expandedClassName),"aria-label":a.title,title:a.title,children:[(0,d.jsx)("span",{className:(0,aD.cn)(g?"inline-flex items-center justify-center":"inline-flex h-6 w-6 items-center justify-center rounded-full",!g&&a.iconClassName),"aria-hidden":"true",children:a.icon}),!g&&(0,d.jsx)("span",{children:a.label})]},a.key))})}let gl=a=>{if(null==a||""===a)return null;let b=Number(a);return Number.isFinite(b)?b:null},gm=a=>{let b=gl(a);return null===b?null:`${Number.isInteger(b)?b:b.toFixed(1)}g`};function gn({calories:a,protein:b,carbs:c,fat:e,sugar:f,servingSize:g,compact:h=!1,className:i}){let j=gl(a),k=[{label:"Protein",value:gm(b)},{label:"Carbs",value:gm(c)},{label:"Fat",value:gm(e)},{label:"Sugar",value:gm(f)}].filter(a=>a.value);if(null===j&&0===k.length&&!g)return null;if(h)return(0,d.jsx)("div",{className:(0,aD.cn)("flex flex-wrap items-center gap-1.5",i),"aria-label":"Nutrition estimates",children:null!==j&&(0,d.jsxs)("span",{className:"inline-flex h-6 items-center rounded-full bg-black/5 px-2 text-[11px] font-medium text-neutral-700",title:"Estimated calories per serving","aria-label":`Estimated calories: ${j} kcal`,children:[j," kcal"]})});let l=[null!==j?`${j} kcal`:null,...k.map(a=>`${a.label} ${a.value}`)].filter(Boolean);return(0,d.jsxs)("div",{className:(0,aD.cn)("text-left text-sm text-neutral-700",i),children:[(0,d.jsxs)("p",{className:"leading-relaxed",children:[(0,d.jsx)("span",{className:"font-medium text-neutral-700",children:"Nutrition"}),l.length>0?` \xb7 ${l.join(" · ")}`:""]}),g?(0,d.jsxs)("p",{className:"mt-1 text-xs text-neutral-700",children:["Serving: ",g]}):null,(0,d.jsx)("p",{className:"mt-1 text-[10px] text-neutral-700",children:"Estimated values. Actual values may vary."})]})}let go=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;function gp({color:a,label:b="Menu item color",className:c}){let e="string"==typeof a&&go.test(a.trim())?a.trim():null;return e?(0,d.jsx)("span",{className:(0,aD.cn)("inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/80 shadow-sm ring-1 ring-black/10",c),style:{backgroundColor:e},"aria-label":`${b}: ${e}`,title:`${b}: ${e}`,role:"img",children:(0,d.jsx)("span",{className:"sr-only",children:`${b}: ${e}`})}):null}var gq=a.i(97134);let gr=/[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;function gs(a){return!!a&&gr.test(a)}function gt(a){return gs(a)?"rtl":"ltr"}function gu(a){return gs(a)?"text-right":"text-left"}function gv({item:a,settings:b=h}){if(!b.show_modal_badges)return null;let c=[];a.is_chef_recommended&&c.push({key:"chef",label:b.chef_label||"Chef’s Choice",icon:"👨‍🍳",className:"border-[#0F4D43]/35 bg-[#E6F2EF] text-[#0F4D43]"}),a.is_bestseller&&c.push({key:"best",label:b.bestseller_label||"Best Seller",icon:"🏆",className:"border-[#C7A45A]/45 bg-[#F7E8BD] text-[#704A10]"});let e="show_all"===b.badge_display_mode?c:c.slice(0,1);return e.length?(0,d.jsx)("div",{className:"mb-3 flex flex-wrap items-center justify-center gap-1.5","aria-label":"Menu item highlights",children:e.map(a=>(0,d.jsxs)("span",{className:`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] shadow-sm ${a.className}`,"aria-label":a.label,title:a.label,children:[(0,d.jsx)("span",{"aria-hidden":"true",children:a.icon}),b.show_badge_text_in_modal&&(0,d.jsx)("span",{children:a.label})]},a.key))}):null}function gw({item:a,onClose:b,highlightSettings:c=h}){let{t:g}=(0,o.useLanguageStore)(),[i,j]=(0,e.useState)(0),[k,l]=(0,e.useState)(a),[m,n]=(0,e.useState)(!1),[p,q]=(0,e.useState)(!1);(0,e.useEffect)(()=>{q(!0)},[]),(0,e.useEffect)(()=>{if("u"<typeof document)return;let a=()=>u(document.documentElement.getAttribute("data-theme")||"gold-luxury");a();let b=new MutationObserver(a);return b.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme"]}),()=>b.disconnect()},[]),(0,e.useEffect)(()=>{a&&(n(!1),l(a),j(0))},[a]);let[r,s]=(0,e.useState)(!!a),[t,u]=(0,e.useState)("gold-luxury"),v=(0,e.useRef)(null);(0,e.useEffect)(()=>{if(a&&!m){v.current&&(window.clearTimeout(v.current),v.current=null),l(a),s(!0);return}return s(!1),v.current=window.setTimeout(()=>{l(null),j(0),v.current=null},320),()=>{v.current&&(window.clearTimeout(v.current),v.current=null)}},[a,m]);let w=k?g(k.nameKey)||k.name:"",x=k?g(k.descriptionKey)||k.description:"",y=(0,e.useMemo)(()=>{if(!k)return[];let a=a=>Array.isArray(a)?a.map(a=>"string"==typeof a?a:a?.url||a?.image||a?.src||a?.image_path||a?.path||"").filter(a=>"string"==typeof a&&a.trim().length>0):[],b=a(k.media);return Array.from(new Set([k.image,...a(k.images),...a(k.gallery),...a(k.additional_images),...a(k.additionalImages),...a(b)].filter(Boolean)))},[k]);(0,e.useEffect)(()=>{j(0)},[k?.id]),(0,e.useEffect)(()=>{k&&console.info("PMD_MODAL_GALLERY_IMAGES",{id:k?.id||k?.menu_id,name:k?.name,count:y.length,images:y})},[k,y]),(0,e.useEffect)(()=>{if(!r||!k||y.length<=1)return;let a=window.setInterval(()=>{j(a=>(a+1)%y.length)},5e3);return()=>window.clearInterval(a)},[r,k,y]),(0,e.useEffect)(()=>()=>{v.current&&window.clearTimeout(v.current)},[]);let z=!!(a&&k&&!m);(0,e.useEffect)(()=>{if(!z)return;let a=document.body.style.overflow,b=document.body.style.overscrollBehavior;return document.body.style.overflow="hidden",document.body.style.overscrollBehavior="none",()=>{document.body.style.overflow=a,document.body.style.overscrollBehavior=b}},[z]);let A=a=>{a?.stopPropagation?.(),m||(n(!0),v.current&&window.clearTimeout(v.current),v.current=window.setTimeout(()=>{b()},320))};return p&&k?(0,gq.createPortal)((0,d.jsx)(a_,{children:z&&(0,d.jsx)(aA.motion.div,{"data-pmd-food-modal-overlay":"true","data-pmd-overlay-fix":"no-scale-fullscreen",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed -inset-8 z-[999999] flex h-[calc(100dvh+4rem)] min-h-[calc(100vh+4rem)] w-[calc(100vw+4rem)] max-w-none items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-lg overscroll-contain",onClick:A,style:{position:"fixed",inset:"-32px",width:"calc(100vw + 64px)",height:"calc(100dvh + 64px)",minHeight:"calc(100vh + 64px)",maxWidth:"none",transformOrigin:"center center"},transition:{duration:.35,ease:"easeOut"},children:(0,d.jsxs)(aA.motion.div,{initial:{scale:.95,opacity:0},animate:{scale:r?1:.97,y:8*!r,opacity:+!!r},exit:{scale:.97,y:8,opacity:0},transition:{duration:.48,ease:[.22,1,.36,1]},className:`relative surface pmd-v2-card w-full max-w-xl max-h-[90dvh] overflow-hidden ${"organic_botanical_paper"===t?"rounded-[2.35rem] border border-[#D8CBAF] shadow-[0_28px_80px_rgba(66,55,35,0.24)]":"rounded-3xl shadow-2xl"}`,style:"organic_botanical_paper"===t?{background:"radial-gradient(circle at 18% 8%, rgba(255,255,255,.9), transparent 34%), radial-gradient(circle at 85% 16%, rgba(184,134,75,.12), transparent 28%), #FFF9EF",color:"#352F28"}:void 0,onClick:a=>a.stopPropagation(),children:["organic_botanical_paper"===t&&(0,d.jsx)(gh,{className:"pointer-events-none absolute -right-4 top-16 z-0 h-24 w-24 rotate-12 text-[#737A55]/10"}),(0,d.jsxs)(aC.Button,{variant:"ghost",size:"sm",onClick:A,className:"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 pmd-v2-action-circle hover:opacity-90 absolute top-4 left-4 z-10",style:{background:"organic_botanical_paper"===t?"var(--theme-primary, #737A55)":"#062F2A",backgroundColor:"organic_botanical_paper"===t?"var(--theme-primary, #737A55)":"#062F2A",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",borderColor:"organic_botanical_paper"===t?"var(--theme-primary, #737A55)":"#062F2A",outlineColor:"organic_botanical_paper"===t?"var(--theme-primary, #737A55)":"#062F2A",textDecoration:"none"},children:[(0,d.jsx)(aB.ArrowLeft,{className:"h-4 w-4 mr-1",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}}),"Back"]}),(0,d.jsxs)("div",{className:`relative z-10 overflow-y-auto overscroll-contain max-h-[90dvh] ${"organic_botanical_paper"===t?"bg-transparent p-5 sm:p-6":"p-6"}`,children:[(0,d.jsxs)("div",{className:`relative mb-6 mx-auto flex max-w-full items-center justify-center overflow-visible ${"organic_botanical_paper"===t?"border border-[#E1D4B9] bg-[#F3EBDD] shadow-inner":"bg-black/5"}`,style:{borderRadius:"0px"},"data-pmd-shared-item-gallery":"true",children:[(0,d.jsx)(a_,{mode:"wait",children:(0,d.jsx)(aA.motion.img,{src:(0,f.getMenuImageUrl)(y[i]||k.image)||"/placeholder.svg",alt:w,initial:{opacity:0,scale:.99},animate:{opacity:1,scale:1},exit:{opacity:0,scale:1.01},transition:{duration:.55,ease:"easeInOut"},className:"block max-w-full max-h-[42dvh] object-contain",style:{width:"auto",height:"auto",borderRadius:0}},`${k?.id}-${i}`)}),y.length>1&&(0,d.jsx)("div",{className:"absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1.5 shadow-lg backdrop-blur",children:y.map((a,b)=>(0,d.jsx)("button",{type:"button","aria-label":`Show image ${b+1}`,onClick:()=>j(b),className:`h-1.5 rounded-full transition-all ${b===i?"w-5 bg-[#0F4D43]":"w-1.5 bg-black/25"}`},`${a}-${b}`))})]}),(0,d.jsx)("h2",{dir:"auto",className:`font-serif text-3xl font-bold mb-3 text-center ${"organic_botanical_paper"===t?"text-[#352F28]":"pmd-v2-text"}`,children:w}),(0,d.jsx)(gv,{item:k,settings:c}),(0,d.jsxs)("div",{className:"mb-4 flex flex-wrap items-center justify-center gap-1.5",children:[(0,d.jsx)(gp,{color:k?.color,label:`${w} color`}),(0,d.jsx)(gk,{halal:k?.halal,vegetarian:k?.vegetarian,vegan:k?.vegan,allergens:k?.allergens,allergyTags:k?.allergy_tags,className:"justify-center"})]}),(0,d.jsx)("p",{dir:gt(x),className:`${"organic_botanical_paper"===t?"text-[#7D7467]":"pmd-v2-text-muted"} text-lg leading-relaxed mb-4 ${gu(x)}`,children:x}),(0,d.jsx)(gn,{calories:k?.calories,protein:k?.protein,carbs:k?.carbs,fat:k?.fat,sugar:k?.sugar,servingSize:k?.serving_size})]})]})})}),document.body):null}let gx=(a,b)=>a instanceof Error?a.message:b;function gy(a){let{apiMenuItems:b,menuItems:c,menuData:e,allCategories:f,tableInfo:g,displayTableNumber:h,tableIdString:i,cmsSettings:j,merchantSettings:k,taxSettings:l,items:m,totalItems:n,totalPrice:o,lastInteractedItem:p,restaurantDisplayName:q,themeMenuActions:r,addToCart:s,handleFirstAdd:t,toast:u,apiClient:v,handleItemSelect:w,selectedItem:x,setSelectedItem:y,handleCartClick:z,shouldShowTableOrderAction:A,setPaymentModalInitialStep:B,sharedTableOrder:C,setPaymentModalPreferPersonalReview:D,setPaymentModalOpen:E,tableOrderActionCount:F,isPaymentModalOpen:G,activeExistingOrderId:H,activePendingSummary:I,activeSubmittedOrder:J,paymentModalInitialStep:K,paymentModalPreferPersonalReview:L,setToolbarPricingSnapshot:M,setSharedTableOrder:N,setLocalOpenOrder:O,setHasLocalOpenOrder:Q,normalizeModernGreenLogoUrl:R}=a,S=fU({setSharedTableOrder:N,setLocalOpenOrder:O,setHasLocalOpenOrder:Q}),T=b.length?b:c.length?c:e,U=g?.table_no??g?.table_id??h??i??null,V=R(j?.logoUrl||j?.logo||j?.logo_url||j?.site_logo||j?.restaurant_logo||k?.logoUrl||k?.logo||k?.logo_url||k?.site_logo||k?.restaurant_logo||""),W=async()=>{let a=i||"delivery";try{await v.callWaiter(String(a),"."),u({title:"Waiter called",description:i?"We are on the way!":"We received your assistance request."})}catch(a){u({title:"Waiter call failed",description:gx(a,"Failed to call waiter."),variant:"destructive"})}},X=async(a="")=>{let b=String(a||"").trim();if(!b)return void u({title:"Note is empty",description:"Please write a note before sending it.",variant:"destructive"});let c=i||"delivery";try{await v.callTableNote(String(c),b,new Date().toISOString()),u({title:"Note sent",description:"Your note has been sent to the staff."})}catch(a){u({title:"Note failed",description:gx(a,"Failed to send note."),variant:"destructive"})}},Y=async(a={})=>{let b=String(a?.name||"Guest").trim()||"Guest",c=String(a?.licensePlate||a?.license_plate||"Not provided").trim()||"Not provided",d=String(a?.carModel||a?.car_make||"Not provided").trim()||"Not provided";try{await v.createValetRequest({name:b,license_plate:c,car_make:d,table_id:i||void 0,table_no:U?String(U):void 0,qr:g?.qr_code?String(g.qr_code):void 0}),u({title:"Valet requested",description:"Your valet request has been sent."})}catch(a){u({title:"Valet request failed",description:gx(a,"Failed to submit valet request."),variant:"destructive"})}};return(0,d.jsx)(P,{actions:r,children:(0,d.jsxs)(ge,{sourceItems:T,cartItems:m,totalItems:n,totalPrice:o,lastInteractedItem:p,categories:f,restaurantName:q,logoUrl:V,tableNumber:U,onAddItem:(a,b=1)=>{let c={...a};l.enabled&&l.percentage>0&&0===l.menuPrice&&(c.price=Number(c.price||0)/(1+l.percentage/100),c.options&&(c.options=c.options.map(a=>({...a,values:(a.values||[]).map(a=>({...a,price:Number(a.price||0)/(1+l.percentage/100)}))}))));for(let a=0;a<Math.max(1,Number(b||1));a+=1)s(c);t(a),u({title:"Added to order",description:String(a.name||"Item added")})},onOpenItem:a=>w(a),onCheckout:z,onCallWaiter:W,onOpenNote:X,onOpenValet:Y,onTableOrder:()=>{A&&(B(C?.status==="draft"?"review":C?.status==="paid"?"paid":"submitted"),D(!1),E(!0))},showTableOrder:A,tableOrderCount:F,children:[(0,d.jsx)(gg,{...r}),(0,d.jsx)(gw,{item:x||null,onClose:()=>y?.(null)}),(0,d.jsx)(fM,{isOpen:G,onClose:()=>{E(!1),D(!1)},items:m,tableInfo:g,existingOrderId:H,pendingSummary:I,initialSubmittedOrder:J,initialCheckoutStep:K,preferPersonalReview:L,checkoutVisualTheme:"modern_green",onCartPricingUpdate:M,onOpenOrderUpdate:S})]})})}function gz({actions:a}){return(0,d.jsxs)("div",{className:"ob-actions","aria-label":"Organic Botanical actions",children:[(0,d.jsx)("button",{type:"button",onClick:a?.onWaiterClick,children:"Waiter"}),(0,d.jsx)("button",{type:"button",onClick:a?.onNoteClick,children:"Note"}),(0,d.jsx)("button",{type:"button",onClick:a?.onTableOrderClick,children:"Table"}),(0,d.jsx)("button",{type:"button",onClick:a?.onValetClick,children:"Valet"}),a?.onLanguageClick&&(0,d.jsx)("button",{type:"button",onClick:a.onLanguageClick,children:"Language"}),(0,d.jsxs)("button",{type:"button",className:"ob-checkout",onClick:a?.onCartClick,children:["Cart ",a?.cartCount?`(${a.cartCount})`:""]})]})}function gA({sourceItems:a,categories:b,restaurantName:c,tableNumber:f,actions:g,onAddItem:h,onOpenItem:i,children:j}){let[k,l]=(0,e.useState)("All"),[m,n]=(0,e.useState)(""),o=Array.isArray(a)?a:[],p=(0,e.useMemo)(()=>["All",...Array.from(new Set([...b||[],...o.map(gb)].filter(Boolean)))],[b,o]),q=(0,e.useMemo)(()=>o.filter(a=>{let b="All"===k||gb(a)===k,c=`${f9(a)} ${ga(a)} ${gb(a)}`.toLowerCase();return b&&c.includes(m.toLowerCase())}),[o,k,m]);return(0,d.jsxs)("div",{className:"pmd-theme-organic-botanical pmd-customer-page page--menu",children:[(0,d.jsx)("style",{children:'.pmd-theme-organic-botanical{min-height:100vh;background:#f6efe2;color:#343529;padding:22px 16px 138px;font-family:Georgia,ui-serif,serif}.pmd-theme-organic-botanical *{box-sizing:border-box}.pmd-theme-organic-botanical .ob-shell{max-width:1060px;margin:0 auto}.pmd-theme-organic-botanical .ob-hero{border:1px solid #ded3bd;background:linear-gradient(135deg,#fffaf0,#edf4de);border-radius:34px;padding:28px;box-shadow:0 18px 50px rgba(75,63,38,.12);position:relative;overflow:hidden}.pmd-theme-organic-botanical .ob-hero:after{content:"";position:absolute;right:-60px;top:-60px;width:180px;height:180px;border-radius:999px;background:rgba(108,138,88,.18)}.pmd-theme-organic-botanical .ob-eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#8b7a54;font:700 .72rem ui-sans-serif,system-ui}.pmd-theme-organic-botanical h1{font-size:clamp(2.4rem,8vw,5.2rem);line-height:.92;margin:12px 0;color:#2f3b25}.pmd-theme-organic-botanical .ob-muted{color:#716f5e}.pmd-theme-organic-botanical .ob-search{margin-top:18px;display:flex;align-items:center;gap:10px;border:1px solid #ded3bd;background:rgba(255,255,255,.72);border-radius:999px;padding:12px 16px;max-width:520px}.pmd-theme-organic-botanical .ob-search input{all:unset;width:100%;font-family:ui-sans-serif,system-ui;color:#343529}.pmd-theme-organic-botanical .ob-cats{display:flex;gap:10px;overflow:auto;padding:18px 2px}.pmd-theme-organic-botanical button{border:0;cursor:pointer}.pmd-theme-organic-botanical .ob-cat{white-space:nowrap;border-radius:999px;padding:10px 16px;background:#fffaf0;color:#5e6245;border:1px solid #ded3bd}.pmd-theme-organic-botanical .ob-cat[data-active=true]{background:#6f8b55;color:white}.pmd-theme-organic-botanical .ob-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.pmd-theme-organic-botanical .ob-card{overflow:hidden;border-radius:30px;background:#fffaf0;border:1px solid #ded3bd;box-shadow:0 14px 34px rgba(75,63,38,.1)}.pmd-theme-organic-botanical .ob-img{height:168px;width:100%;background:#ebe2cd;position:relative}.pmd-theme-organic-botanical .ob-img img{object-fit:cover}.pmd-theme-organic-botanical .ob-body{padding:16px}.pmd-theme-organic-botanical .ob-body h3{font-size:1.2rem;margin:0 0 8px;color:#343529}.pmd-theme-organic-botanical .ob-body p{min-height:44px;margin:0 0 14px;color:#716f5e;font-family:ui-sans-serif,system-ui;font-size:.9rem}.pmd-theme-organic-botanical .ob-footer{display:flex;justify-content:space-between;align-items:center;gap:12px}.pmd-theme-organic-botanical .ob-price{font-weight:900;color:#3e4d2c;font-family:ui-sans-serif,system-ui}.pmd-theme-organic-botanical .ob-add{display:flex;align-items:center;gap:8px;border-radius:999px;background:#b88940;color:white;padding:10px 14px;font-weight:800}.pmd-theme-organic-botanical .ob-actions{position:fixed;left:50%;bottom:18px;z-index:40;transform:translateX(-50%);display:flex;gap:8px;max-width:min(940px,calc(100vw - 24px));overflow:auto;padding:10px;border-radius:999px;background:rgba(255,250,240,.92);border:1px solid #ded3bd;box-shadow:0 18px 50px rgba(75,63,38,.2);backdrop-filter:blur(16px)}.pmd-theme-organic-botanical .ob-actions button{white-space:nowrap;border-radius:999px;padding:10px 14px;background:#ede3cf;color:#343529;font-family:ui-sans-serif,system-ui;font-weight:800}.pmd-theme-organic-botanical .ob-actions .ob-checkout{background:#6f8b55;color:white}'}),(0,d.jsxs)("main",{className:"ob-shell",children:[(0,d.jsxs)("section",{className:"ob-hero",children:[(0,d.jsxs)("p",{className:"ob-eyebrow",children:["Organic Botanical · Table ",f||"Guest"]}),(0,d.jsx)("h1",{children:c}),(0,d.jsx)("p",{className:"ob-muted",children:"A paper-inspired garden menu powered by live PayMyDine data."}),(0,d.jsxs)("label",{className:"ob-search",children:[(0,d.jsx)(f0,{size:18}),(0,d.jsx)("input",{value:m,onChange:a=>n(a.target.value),placeholder:"Search the garden menu"})]})]}),(0,d.jsx)("nav",{className:"ob-cats","aria-label":"Menu categories",children:p.map(a=>(0,d.jsx)("button",{className:"ob-cat","data-active":a===k,onClick:()=>l(a),type:"button",children:a},a))}),(0,d.jsx)("section",{className:"ob-grid",children:q.map(a=>(0,d.jsxs)("article",{className:"ob-card",children:[(0,d.jsx)("button",{type:"button",className:"ob-img",onClick:()=>i(a),children:gd(a)?(0,d.jsx)(f1.OptimizedImage,{src:gd(a),alt:f9(a),fill:!0}):null}),(0,d.jsxs)("div",{className:"ob-body",children:[(0,d.jsx)("h3",{children:f9(a)}),(0,d.jsx)("p",{children:ga(a)||gb(a)}),(0,d.jsxs)("div",{className:"ob-footer",children:[(0,d.jsx)("span",{className:"ob-price",children:M(gc(a))}),(0,d.jsxs)("button",{type:"button",className:"ob-add",onClick:()=>h(a,1),children:[(0,d.jsx)(a4.Plus,{size:16})," Add"]})]})]})]},f8(a)))})]}),(0,d.jsx)(gz,{actions:g}),j]})}var gB=a.i(43707);function gC(a){let b=[{key:"waiter",label:"Waiter",icon:"🛎️",onClick:a.onCallWaiter},{key:"note",label:"Note",icon:"✎",onClick:a.onOpenNote},...a.showTableOrder?[{key:"table",label:"Table Order",icon:"☷",onClick:a.onOpenTableOrder,count:a.tableOrderCount}]:[],{key:"checkout",label:"Checkout",icon:"🧾",onClick:a.onOpenCheckout,count:a.cartCount,primary:!0}];return(0,d.jsx)("nav",{className:gB.default.dock,"data-theme":"organic","aria-label":"Menu actions",children:b.map(a=>(0,d.jsxs)("button",{type:"button",className:`${gB.default.button} ${a.primary?gB.default.primary:""}`,onClick:()=>void a.onClick(),children:[(0,d.jsx)("span",{className:gB.default.icon,"aria-hidden":"true",children:a.icon}),(0,d.jsx)("span",{children:a.label}),Number(a.count||0)>0&&(0,d.jsx)("span",{className:gB.default.badge,children:a.count})]},a.key))})}let gD=(0,U.default)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);var gE=a.i(33198),gF=a.i(37993),gG=a.i(9744),gH=a.i(9097),gI=a.i(73946),gJ=a.i(69728),gK=a.i(5720),gL=a.i(84504),gM=a.i(43317),gN=a.i(41298),gO=a.i(64513),gP=a.i(77440),gQ=a.i(3369),gR=a.i(6245),gS="Dialog",[gT,gU]=(0,gG.createContextScope)(gS),[gV,gW]=gT(gS),gX=a=>{let{__scopeDialog:b,children:c,open:f,defaultOpen:g,onOpenChange:h,modal:i=!0}=a,j=e.useRef(null),k=e.useRef(null),[l=!1,m]=(0,gI.useControllableState)({prop:f,defaultProp:g,onChange:h});return(0,d.jsx)(gV,{scope:b,triggerRef:j,contentRef:k,contentId:(0,gH.useId)(),titleId:(0,gH.useId)(),descriptionId:(0,gH.useId)(),open:l,onOpenChange:m,onOpenToggle:e.useCallback(()=>m(a=>!a),[m]),modal:i,children:c})};gX.displayName=gS;var gY="DialogTrigger";e.forwardRef((a,b)=>{let{__scopeDialog:c,...e}=a,f=gW(gY,c),g=(0,gF.useComposedRefs)(b,f.triggerRef);return(0,d.jsx)(gN.Primitive.button,{type:"button","aria-haspopup":"dialog","aria-expanded":f.open,"aria-controls":f.contentId,"data-state":hf(f.open),...e,ref:g,onClick:(0,gE.composeEventHandlers)(a.onClick,f.onOpenToggle)})}).displayName=gY;var gZ="DialogPortal",[g$,g_]=gT(gZ,{forceMount:void 0}),g0=a=>{let{__scopeDialog:b,forceMount:c,children:f,container:g}=a,h=gW(gZ,b);return(0,d.jsx)(g$,{scope:b,forceMount:c,children:e.Children.map(f,a=>(0,d.jsx)(gM.Presence,{present:c||h.open,children:(0,d.jsx)(gL.Portal,{asChild:!0,container:g,children:a})}))})};g0.displayName=gZ;var g1="DialogOverlay",g2=e.forwardRef((a,b)=>{let c=g_(g1,a.__scopeDialog),{forceMount:e=c.forceMount,...f}=a,g=gW(g1,a.__scopeDialog);return g.modal?(0,d.jsx)(gM.Presence,{present:e||g.open,children:(0,d.jsx)(g3,{...f,ref:b})}):null});g2.displayName=g1;var g3=e.forwardRef((a,b)=>{let{__scopeDialog:c,...e}=a,f=gW(g1,c);return(0,d.jsx)(gP.RemoveScroll,{as:gR.Slot,allowPinchZoom:!0,shards:[f.contentRef],children:(0,d.jsx)(gN.Primitive.div,{"data-state":hf(f.open),...e,ref:b,style:{pointerEvents:"auto",...e.style}})})}),g4="DialogContent",g5=e.forwardRef((a,b)=>{let c=g_(g4,a.__scopeDialog),{forceMount:e=c.forceMount,...f}=a,g=gW(g4,a.__scopeDialog);return(0,d.jsx)(gM.Presence,{present:e||g.open,children:g.modal?(0,d.jsx)(g6,{...f,ref:b}):(0,d.jsx)(g7,{...f,ref:b})})});g5.displayName=g4;var g6=e.forwardRef((a,b)=>{let c=gW(g4,a.__scopeDialog),f=e.useRef(null),g=(0,gF.useComposedRefs)(b,c.contentRef,f);return e.useEffect(()=>{let a=f.current;if(a)return(0,gQ.hideOthers)(a)},[]),(0,d.jsx)(g8,{...a,ref:g,trapFocus:c.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:(0,gE.composeEventHandlers)(a.onCloseAutoFocus,a=>{a.preventDefault(),c.triggerRef.current?.focus()}),onPointerDownOutside:(0,gE.composeEventHandlers)(a.onPointerDownOutside,a=>{let b=a.detail.originalEvent,c=0===b.button&&!0===b.ctrlKey;(2===b.button||c)&&a.preventDefault()}),onFocusOutside:(0,gE.composeEventHandlers)(a.onFocusOutside,a=>a.preventDefault())})}),g7=e.forwardRef((a,b)=>{let c=gW(g4,a.__scopeDialog),f=e.useRef(!1),g=e.useRef(!1);return(0,d.jsx)(g8,{...a,ref:b,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:b=>{a.onCloseAutoFocus?.(b),b.defaultPrevented||(f.current||c.triggerRef.current?.focus(),b.preventDefault()),f.current=!1,g.current=!1},onInteractOutside:b=>{a.onInteractOutside?.(b),b.defaultPrevented||(f.current=!0,"pointerdown"===b.detail.originalEvent.type&&(g.current=!0));let d=b.target;c.triggerRef.current?.contains(d)&&b.preventDefault(),"focusin"===b.detail.originalEvent.type&&g.current&&b.preventDefault()}})}),g8=e.forwardRef((a,b)=>{let{__scopeDialog:c,trapFocus:f,onOpenAutoFocus:g,onCloseAutoFocus:h,...i}=a,j=gW(g4,c),k=e.useRef(null),l=(0,gF.useComposedRefs)(b,k);return(0,gO.useFocusGuards)(),(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(gK.FocusScope,{asChild:!0,loop:!0,trapped:f,onMountAutoFocus:g,onUnmountAutoFocus:h,children:(0,d.jsx)(gJ.DismissableLayer,{role:"dialog",id:j.contentId,"aria-describedby":j.descriptionId,"aria-labelledby":j.titleId,"data-state":hf(j.open),...i,ref:l,onDismiss:()=>j.onOpenChange(!1)})}),(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(hj,{titleId:j.titleId}),(0,d.jsx)(hk,{contentRef:k,descriptionId:j.descriptionId})]})]})}),g9="DialogTitle",ha=e.forwardRef((a,b)=>{let{__scopeDialog:c,...e}=a,f=gW(g9,c);return(0,d.jsx)(gN.Primitive.h2,{id:f.titleId,...e,ref:b})});ha.displayName=g9;var hb="DialogDescription",hc=e.forwardRef((a,b)=>{let{__scopeDialog:c,...e}=a,f=gW(hb,c);return(0,d.jsx)(gN.Primitive.p,{id:f.descriptionId,...e,ref:b})});hc.displayName=hb;var hd="DialogClose",he=e.forwardRef((a,b)=>{let{__scopeDialog:c,...e}=a,f=gW(hd,c);return(0,d.jsx)(gN.Primitive.button,{type:"button",...e,ref:b,onClick:(0,gE.composeEventHandlers)(a.onClick,()=>f.onOpenChange(!1))})});function hf(a){return a?"open":"closed"}he.displayName=hd;var hg="DialogTitleWarning",[hh,hi]=(0,gG.createContext)(hg,{contentName:g4,titleName:g9,docsSlug:"dialog"}),hj=({titleId:a})=>{let b=hi(hg),c=`\`${b.contentName}\` requires a \`${b.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${b.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${b.docsSlug}`;return e.useEffect(()=>{a&&(document.getElementById(a)||console.error(c))},[c,a]),null},hk=({contentRef:a,descriptionId:b})=>{let c=hi("DialogDescriptionWarning"),d=`Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${c.contentName}}.`;return e.useEffect(()=>{let c=a.current?.getAttribute("aria-describedby");b&&c&&(document.getElementById(b)||console.warn(d))},[d,a,b]),null},hl=a.i(24891),hm=a.i(47802);let hn=e.forwardRef(({className:a,...b},c)=>(0,d.jsx)(g2,{className:(0,aD.cn)("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",a),...b,ref:c}));hn.displayName=g2.displayName;let ho=(0,hl.cva)("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",{variants:{side:{top:"inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",bottom:"inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",left:"inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",right:"inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"}},defaultVariants:{side:"right"}}),hp=e.forwardRef(({side:a="right",className:b,children:c,...e},f)=>(0,d.jsxs)(g0,{children:[(0,d.jsx)(hn,{}),(0,d.jsxs)(g5,{ref:f,className:(0,aD.cn)(ho({side:a}),b),...e,children:[c,(0,d.jsxs)(he,{className:"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",children:[(0,d.jsx)(hm.X,{className:"h-4 w-4"}),(0,d.jsx)("span",{className:"sr-only",children:"Close"})]})]})]}));hp.displayName=g5.displayName;let hq=({className:a,...b})=>(0,d.jsx)("div",{className:(0,aD.cn)("flex flex-col space-y-2 text-center sm:text-left",a),...b});hq.displayName="SheetHeader";let hr=({className:a,...b})=>(0,d.jsx)("div",{className:(0,aD.cn)("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",a),...b});hr.displayName="SheetFooter";let hs=e.forwardRef(({className:a,...b},c)=>(0,d.jsx)(ha,{ref:c,className:(0,aD.cn)("text-lg font-semibold text-foreground",a),...b}));function ht(){let{toast:a}=(0,v.useToast)(),{t:b}=(0,o.useLanguageStore)();(0,w.useRouter)();let{items:c,isCartOpen:e,toggleCart:g,updateQuantity:h,removeFromCart:i}=(0,u.useCartStore)(),j=c.reduce((a,b)=>a+b.item.price*b.quantity,0);return(0,d.jsx)(d.Fragment,{children:(0,d.jsx)(gX,{open:e,onOpenChange:g,children:(0,d.jsxs)(hp,{className:"w-full max-w-md flex flex-col surface p-0",children:[(0,d.jsx)(hq,{className:"p-4 pb-2 surface-sub divider",children:(0,d.jsx)(hs,{className:"font-serif text-3xl",children:b("yourOrder")})}),(0,d.jsx)(aA.motion.div,{className:"flex-grow overflow-y-auto p-4 space-y-2",layout:!0,transition:{type:"spring",stiffness:300,damping:30},children:0===c.length?(0,d.jsxs)("div",{className:"text-center muted pt-8 space-y-2",children:[(0,d.jsx)("p",{className:"text-lg",children:b("cartEmpty")}),(0,d.jsx)("p",{className:"text-sm",children:b("addItemsFromMenu")})]}):(0,d.jsx)(a_,{mode:"popLayout",children:c.map(({item:a,quantity:c})=>{let e=b(a.nameKey)||a.name;return(0,d.jsxs)(aA.motion.div,{layout:!0,initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,x:-50,transition:{duration:.2}},className:"flex items-center space-x-3 p-3 surface-sub rounded-2xl",children:[(0,d.jsx)("div",{className:"relative w-14 h-14 flex-shrink-0",children:(0,d.jsx)(f1.OptimizedImage,{src:(0,f.getMenuImageUrl)(a.image)||"/placeholder.svg",alt:e,fill:!0,className:"object-contain rounded-xl"})}),(0,d.jsxs)("div",{className:"flex-grow",children:[(0,d.jsx)("h4",{className:"font-semibold",children:e}),(0,d.jsx)("p",{className:"text-sm font-medium",style:{color:"var(--theme-secondary)"},children:M(a.price)}),(0,d.jsxs)("div",{className:"inline-flex items-center mt-1 surface-sub rounded-full p-1 gap-2 w-auto",children:[(0,d.jsx)(aC.Button,{size:"icon",variant:"ghost",className:"h-7 w-7 rounded-full icon-btn",onClick:()=>h(a.id,c-1),children:(0,d.jsx)(a3.Minus,{className:"h-3 w-3"})}),(0,d.jsx)("span",{className:"w-6 text-center font-semibold text-sm",children:c}),(0,d.jsx)(aC.Button,{size:"icon",variant:"ghost",className:"h-7 w-7 rounded-full icon-btn",onClick:()=>h(a.id,c+1),children:(0,d.jsx)(a4.Plus,{className:"h-3 w-3"})})]})]}),(0,d.jsx)(aC.Button,{size:"icon",variant:"ghost",className:"text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full h-7 w-7",onClick:()=>i(a),children:(0,d.jsx)(gD,{className:"h-3 w-3"})})]},a.id)})})}),c.length>0&&(0,d.jsx)(hr,{className:"p-4 surface-sub divider mt-auto",children:(0,d.jsxs)("div",{className:"w-full space-y-3",children:[(0,d.jsxs)("div",{className:"flex justify-between font-bold text-2xl",children:[(0,d.jsx)("span",{children:b("total")}),(0,d.jsx)("span",{children:M(j)})]}),(0,d.jsx)(aC.Button,{className:"w-full font-bold text-lg py-4 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl",style:{background:"var(--theme-button)",color:"var(--theme-background)"},onClick:()=>{0===c.length?a({title:b("cartEmpty"),description:b("addItemsFromMenu"),variant:"destructive"}):g()},children:b("proceedToPayment")})]})})]})})})}function hu(a){let{apiMenuItems:b,menuItems:c,menuData:e,allCategories:f,restaurantDisplayName:g,displayTableNumber:h,themeMenuActions:i,taxSettings:j,addToCart:k,handleFirstAdd:l,toast:m,handleItemSelect:n,selectedItem:o,setSelectedItem:p,shouldHideCartSheet:q,isPaymentModalOpen:r,setPaymentModalOpen:s,setPaymentModalPreferPersonalReview:t,items:u,tableInfo:v,activeExistingOrderId:w,activePendingSummary:x,activeSubmittedOrder:y,paymentModalInitialStep:z,paymentModalPreferPersonalReview:A,setToolbarPricingSnapshot:B,setSharedTableOrder:C,setLocalOpenOrder:D,setHasLocalOpenOrder:E}=a,F=fU({setSharedTableOrder:C,setLocalOpenOrder:D,setHasLocalOpenOrder:E});return(0,d.jsx)(P,{actions:i,children:(0,d.jsxs)("div",{className:"pmd-customer-page page--menu relative min-h-screen w-full bg-[#f6efe2]",children:[(0,d.jsx)(gA,{sourceItems:b.length?b:c.length?c:e,categories:f,restaurantName:g,tableNumber:h,actions:i,onAddItem:(a,b=1)=>{let c={...a};j.enabled&&j.percentage>0&&0===j.menuPrice&&(c.price=Number(c.price||0)/(1+j.percentage/100),c.options&&(c.options=c.options.map(a=>({...a,values:(a.values||[]).map(a=>({...a,price:Number(a.price||0)/(1+j.percentage/100)}))}))));for(let a=0;a<Math.max(1,Number(b||1));a+=1)k(c);l(a),m({title:"Added to order",description:String(a.name||"Item added")})},onOpenItem:a=>n(a)}),(0,d.jsx)("div",{"data-pmd-organic-real-toolbar":"1",style:{"--theme-surface":"#f5fff8af0","--theme-border":"#ded3bd","--theme-text-primary":"#343529","--theme-text-secondary":"#716f5e","--theme-primary":"#b88940","--theme-accent":"#b88940","--pmd-v2-page-bg":"#f5fff8af0"},children:(0,d.jsx)(gC,{...i})}),!q&&(0,d.jsx)(ht,{}),(0,d.jsx)(gw,{item:o||null,onClose:()=>p?.(null)}),(0,d.jsx)(fM,{isOpen:r,onClose:()=>{s(!1),t(!1)},items:u,tableInfo:v,existingOrderId:w,pendingSummary:x,initialSubmittedOrder:y,initialCheckoutStep:z,preferPersonalReview:A,checkoutVisualTheme:"organic_botanical_paper",onCartPricingUpdate:B,onOpenOrderUpdate:F})]})})}hs.displayName=ha.displayName,e.forwardRef(({className:a,...b},c)=>(0,d.jsx)(hc,{ref:c,className:(0,aD.cn)("text-sm text-muted-foreground",a),...b})).displayName=hc.displayName;var hv=a.i(99981);function hw({categories:a,selectedCategory:b,onSelectCategory:c}){let{t:f}=(0,o.useLanguageStore)(),g=(0,e.useRef)(null),[h,i]=(0,e.useState)(!1),[j,k]=(0,e.useState)(!1),l=()=>{if(!g.current)return;let{scrollLeft:a,scrollWidth:b,clientWidth:c}=g.current;i(a>0),k(a<b-c-1)},m=()=>{l()};return(0,e.useEffect)(()=>{l();let a=g.current;if(a)return a.addEventListener("scroll",m),()=>a.removeEventListener("scroll",m)},[a]),(0,d.jsx)("div",{className:"relative w-full mb-8",children:(0,d.jsx)("div",{ref:g,className:(0,aD.cn)("w-full overflow-x-auto scroll-smooth pb-2 no-scrollbar",h&&"mask-gradient-left",j&&"mask-gradient-right"),style:{scrollbarWidth:"none",msOverflowStyle:"none"},children:(0,d.jsx)("div",{className:"flex space-x-3 px-4 min-w-max",children:a.map(a=>(0,d.jsxs)("button",{onClick:()=>c(a),className:(0,aD.cn)("relative whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 category-tab",b===a?"is-active":"text-gray-500 hover:text-theme"),children:[b===a&&(0,d.jsx)(aA.motion.div,{layoutId:"category-underline",className:"absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full",style:{backgroundColor:"var(--theme-category-active)"},transition:{type:"spring",stiffness:300,damping:30}}),(0,d.jsx)("span",{className:"relative z-10",children:a})]},a))})})})}var hx=a.i(48120);function hy(a){let b=[{key:"waiter",label:"Waiter",icon:"🛎️",onClick:a.onCallWaiter},{key:"note",label:"Note",icon:"✎",onClick:a.onOpenNote},...a.showTableOrder?[{key:"table",label:"Table Order",icon:"☷",onClick:a.onOpenTableOrder,count:a.tableOrderCount}]:[],{key:"checkout",label:"Checkout",icon:"🧾",onClick:a.onOpenCheckout,count:a.cartCount,primary:!0}];return(0,d.jsx)("nav",{className:hx.default.dock,"data-theme":"gold","aria-label":"Menu actions",children:b.map(a=>(0,d.jsxs)("button",{type:"button",className:`${hx.default.button} ${a.primary?hx.default.primary:""}`,onClick:()=>void a.onClick(),children:[(0,d.jsx)("span",{className:hx.default.icon,"aria-hidden":"true",children:a.icon}),(0,d.jsx)("span",{children:a.label}),Number(a.count||0)>0&&(0,d.jsx)("span",{className:hx.default.badge,children:a.count})]},a.key))})}var hz=a.i(32158);let hA=(0,U.default)("Trophy",[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",key:"17hqa7"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",key:"lmptdp"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",key:"1nw9bq"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",key:"1np0yb"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z",key:"u46fv3"}]]);function hB({item:a,onSelect:b,onFirstAdd:c,prioritizeImage:e=!1,highlightSettings:f=h}){let g=(0,u.useCartStore)(a=>a.addToCart),{items:i}=(0,u.useCartStore)(),{t:j}=(0,o.useLanguageStore)(),k=i.find(b=>b.item.id===a.id),l=k?.quantity||0,m=a.nameKey&&j(a.nameKey)?j(a.nameKey):a.name,n=a.descriptionKey&&j(a.descriptionKey)?j(a.descriptionKey):a.description,p=(0,aD.truncateText)(n||"",66);return(0,d.jsxs)("div",{className:"flex items-center space-x-4 group cursor-pointer",onClick:()=>b(a),children:[(0,d.jsxs)("div",{className:"relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0",children:["title_inline"!==f.badge_position&&"hidden"!==f.badge_position&&(0,d.jsx)("div",{className:`absolute top-1 z-10 ${"image_top_right"===f.badge_position?"right-1":"left-1"}`,children:(0,d.jsx)(hC,{item:a,compact:!0,settings:f,placement:"card"})}),(0,d.jsx)(f1.OptimizedImage,{src:a.image||(Array.isArray(a.images)?a.images[0]:"")||"/placeholder.svg",alt:m,fill:!0,priority:e,className:"object-contain transition-transform duration-700 ease-in-out group-hover:scale-110"})]}),(0,d.jsxs)("div",{className:"flex-grow",children:[(0,d.jsxs)("div",{className:"flex flex-wrap items-center gap-2",children:[(0,d.jsx)("h3",{dir:gt(m),className:`text-lg font-bold text-paydine-elegant-gray ${gu(m)}`,children:m}),"title_inline"===f.badge_position&&(0,d.jsx)(hC,{item:a,compact:!0,settings:f,placement:"card"})]}),(0,d.jsxs)("div",{className:"mt-1 flex flex-wrap items-center gap-1.5",children:[(0,d.jsx)(gk,{halal:a.halal,vegetarian:a.vegetarian,vegan:a.vegan,allergens:a.allergens,allergyTags:a.allergy_tags,compact:!0}),(0,d.jsx)(gp,{color:a.color,label:`${m} color`}),(0,d.jsx)(gn,{calories:a.calories,protein:a.protein,carbs:a.carbs,fat:a.fat,sugar:a.sugar,servingSize:a.serving_size,compact:!0})]}),(0,d.jsx)("p",{dir:gt(p),className:`text-sm text-gray-500 mt-1 line-clamp-2 ${gu(p)}`,children:p}),(0,d.jsxs)("div",{className:"flex justify-between items-center mt-2",children:[(0,d.jsx)("p",{className:"text-lg font-semibold menu-item-price",children:M(a.price||0)}),(0,d.jsxs)("div",{className:"relative flex items-center gap-2",children:[l>0&&(0,d.jsx)("button",{type:"button",className:"quantity-btn pmd-v2-action-circle w-10 h-10 font-bold text-lg",onClick:b=>{b.stopPropagation(),g(k?.item||a,-1)},"aria-label":"Remove one item",children:(0,d.jsx)(a3.Minus,{className:"h-5 w-5",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}})}),(0,d.jsxs)("button",{className:"quantity-btn pmd-v2-action-circle w-12 h-12 font-bold text-lg",onClick:b=>{b.stopPropagation();let d=t(),e={...a};d.enabled&&d.percentage>0&&0===d.menuPrice&&(e.price=a.price/(1+d.percentage/100),e.options&&(e.options=e.options.map(a=>({...a,values:a.values.map(a=>({...a,price:a.price/(1+d.percentage/100)}))})))),g(e),0===l&&c()},"aria-label":"Add to cart","data-testid":"pmd-menu-add-to-cart",children:[l>0?(0,d.jsx)("span",{className:"text-lg font-bold",children:l}):(0,d.jsx)("span",{"data-pmd-menu-plus-text":"1","aria-hidden":"true",style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",fontWeight:900,fontSize:"28px",lineHeight:1,display:"inline-flex",alignItems:"center",justifyContent:"center",transform:"translateY(-1px)"},children:"+"}),(0,d.jsx)("span",{className:"sr-only",children:"Add to cart"})]})]})]})]})]})}function hC({item:a,compact:b=!1,settings:c=h,placement:e="card"}){if("card"===e&&(!c.show_card_badges||"hidden"===c.badge_position)||"modal"===e&&!c.show_modal_badges)return null;let f=[];a.is_chef_recommended&&f.push({key:"chef",label:c.chef_label||"Chef’s Choice",icon:(0,d.jsx)(hz.ChefHat,{className:b?"h-3.5 w-3.5":"h-4 w-4","aria-hidden":"true"}),tone:"emerald"}),a.is_bestseller&&f.push({key:"best",label:c.bestseller_label||"Best Seller",icon:(0,d.jsx)(hA,{className:b?"h-3.5 w-3.5":"h-4 w-4","aria-hidden":"true"}),tone:"gold"});let g="show_all"===c.badge_display_mode?f:f.slice(0,1);if(!g.length)return null;let i="modal"===e?c.show_badge_text_in_modal:c.show_badge_text_on_cards,j="modal"===e?"soft_pill":c.badge_style,k="minimal_circle"===j,l="corner_ribbon"===j&&"card"===e;return(0,d.jsx)("div",{className:`pmd-menu-recommendation-badges flex flex-wrap items-center gap-1 ${l?"max-w-[112px]":""}`,"aria-label":"Menu item highlights",children:g.map(a=>{let b;return(0,d.jsxs)("span",{className:(b="gold"===a.tone?"border-[#C7A45A]/45 bg-[#F7E8BD] text-[#704A10]":"border-[#0F4D43]/35 bg-[#E6F2EF] text-[#0F4D43]",k?`inline-flex h-8 w-8 items-center justify-center rounded-full border ${b} shadow-sm`:l?`inline-flex items-center gap-1 border ${b} px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] shadow-sm`:"luxury_label"===j?`inline-flex items-center gap-1.5 rounded-md border ${b} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-sm`:`inline-flex items-center gap-1.5 rounded-full border ${b} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] shadow-sm`),"aria-label":a.label,title:a.label,children:[a.icon,i&&!k&&(0,d.jsx)("span",{children:a.label})]},a.key)})})}function hD({title:a,subtitle:b,items:c,settings:e,onSelect:f,onFirstAdd:g,organic:h=!1,onOrganicAdd:i}){return c.length?(0,d.jsxs)("section",{className:h?"organic-highlight-section relative mb-9 px-4":"mb-8 px-4","aria-label":a,children:[(0,d.jsx)("div",{className:h?"mb-4 text-center":"mb-3 flex items-end justify-between gap-3",children:(0,d.jsxs)("div",{children:[h&&(0,d.jsxs)("div",{className:"mx-auto mb-2 flex w-fit items-center gap-2 text-[var(--organic-accent)]","aria-hidden":"true",children:[(0,d.jsx)("span",{className:"h-px w-8 bg-current"}),(0,d.jsx)("span",{className:"text-lg",children:"☘"}),(0,d.jsx)("span",{className:"h-px w-8 bg-current"})]}),(0,d.jsx)("h2",{className:h?"font-serif text-3xl uppercase tracking-[0.16em] text-[var(--organic-text)]":"font-serif text-2xl font-bold text-paydine-elegant-gray",children:a}),(0,d.jsx)("p",{className:h?"mt-1 font-serif text-sm text-[var(--organic-muted)]":"text-sm text-gray-500",children:b})]})}),(0,d.jsx)("div",{className:h?"flex gap-4 overflow-x-auto rounded-[2.4rem] border border-[#E5D8BF]/70 bg-[#FFF9EF]/42 p-3 pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] md:grid md:grid-cols-2 md:overflow-visible":"flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible",children:c.map((b,c)=>(0,d.jsx)("div",{className:"min-w-[82vw] md:min-w-0",children:h?(0,d.jsx)(N,{item:b,onSelect:f,onAdd:a=>i?i(b,a):g(b),highlightSettings:e}):(0,d.jsx)(hB,{item:b,onSelect:f,onFirstAdd:()=>g(b),prioritizeImage:c<2,highlightSettings:e})},`highlight-${a}-${b.id}`))})]}):null}function hE(){return(0,d.jsx)("div",{className:"flex items-center justify-center min-h-screen",children:(0,d.jsx)("div",{className:"w-8 h-8 border-4 border-paydine-champagne border-t-transparent rounded-full animate-spin"})})}let hF=(0,U.default)("HandPlatter",[["path",{d:"M12 3V2",key:"ar7q03"}],["path",{d:"M5 10a7.1 7.1 0 0 1 14 0",key:"1t9y3n"}],["path",{d:"M4 10h16",key:"img6z1"}],["path",{d:"M2 14h12a2 2 0 1 1 0 4h-2",key:"loyjft"}],["path",{d:"m15.4 17.4 3.2-2.8a2 2 0 0 1 2.8 2.9l-3.6 3.3c-.7.8-1.7 1.2-2.8 1.2h-4c-1.1 0-2.1-.4-2.8-1.2L5 18",key:"1rixiy"}],["path",{d:"M5 14v7H2",key:"3mujks"}]]),hG=(0,U.default)("NotebookPen",[["path",{d:"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4",key:"re6nr2"}],["path",{d:"M2 6h4",key:"aawbzj"}],["path",{d:"M2 10h4",key:"l0bgd4"}],["path",{d:"M2 14h4",key:"1gsvsf"}],["path",{d:"M2 18h4",key:"1bu2t1"}],["path",{d:"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z",key:"pqwjuv"}]]),hH=({isOpen:a,onOpenChange:b,tableId:c,tableName:g})=>{let{t:h}=(0,o.useLanguageStore)(),{toast:i}=(0,v.useToast)(),[j,k]=(0,e.useState)("confirming"),[l,m]=(0,e.useState)(!1),n=async()=>{try{await f.apiClient.callWaiter(String(c||"delivery"),"."),i({title:"Waiter Called",description:c?"We are on the way!":"We received your assistance request."})}catch(a){throw i({title:"Error",description:a?.message||"Failed to call waiter",variant:"destructive"}),a}k("confirmed"),m(!0),await new Promise(a=>setTimeout(a,800)),await new Promise(a=>setTimeout(a,2e3)),m(!1),await new Promise(a=>setTimeout(a,300)),b(!1),k("confirming")},p=async()=>{k("closing"),await new Promise(a=>setTimeout(a,300)),b(!1),k("confirming")};return(0,d.jsx)(a_,{initial:!1,children:a&&(0,d.jsx)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.3},className:"fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm",children:(0,d.jsx)(aA.motion.div,{initial:{scale:.95,opacity:0,y:20},animate:{scale:"closing"===j?.95:1,opacity:+("closing"!==j),y:20*("closing"===j)},exit:{scale:.95,opacity:0,y:20},transition:{type:"spring",stiffness:300,damping:25},className:"bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden",children:(0,d.jsx)(a_,{initial:!1,mode:"wait",children:l?(0,d.jsxs)(aA.motion.div,{initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.9},transition:{duration:.3},className:"p-8 text-center",children:[(0,d.jsx)("div",{className:"mx-auto w-16 h-16 bg-paydine-rose-beige/50 rounded-full flex items-center justify-center mb-4",children:(0,d.jsx)(bt.CheckCircle,{className:"w-8 h-8 text-paydine-elegant-gray"})}),(0,d.jsx)("h3",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-2",children:h("waiterComing")})]},"success"):(0,d.jsxs)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"p-8",children:[(0,d.jsxs)("div",{className:"text-center mb-6",children:[(0,d.jsx)("div",{className:"mx-auto w-16 h-16 bg-paydine-rose-beige/50 hover:bg-paydine-champagne rounded-full flex items-center justify-center mb-4 transition-all duration-300",children:(0,d.jsx)(hF,{className:"w-8 h-8 text-paydine-elegant-gray"})}),(0,d.jsx)("h3",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-2",children:h("callWaiter")}),(0,d.jsx)("p",{className:"text-paydine-elegant-gray/80",children:h("callWaiterConfirm")})]}),(0,d.jsxs)("div",{className:"flex gap-3 justify-center",children:[(0,d.jsx)(aA.motion.button,{whileHover:{scale:1.02},whileTap:{scale:.98},onClick:p,className:"flex-1 py-3 px-6 rounded-xl bg-gray-100 text-paydine-elegant-gray font-medium hover:bg-gray-200 transition-colors",children:h("no")}),(0,d.jsx)(aA.motion.button,{whileHover:{scale:1.02},whileTap:{scale:.98},onClick:n,className:"flex-1 py-3 px-6 rounded-xl bg-paydine-rose-beige/50 hover:bg-paydine-champagne text-paydine-elegant-gray font-medium transition-all duration-300",children:h("yes")})]})]},"confirm")})})})})},hI=({isOpen:a,onOpenChange:b,note:c,setNote:f,onSend:g,tableId:h,tableName:i})=>{let{t:j}=(0,o.useLanguageStore)(),[k,l]=(0,e.useState)("editing"),[m,n]=(0,e.useState)(!1),p=async()=>{c.trim()&&(l("confirmed"),n(!0),await new Promise(a=>setTimeout(a,800)),await new Promise(a=>setTimeout(a,2e3)),n(!1),await new Promise(a=>setTimeout(a,300)),g(),b(!1),l("editing"))},q=async()=>{l("closing"),await new Promise(a=>setTimeout(a,300)),b(!1),l("editing")};return(0,d.jsx)(a_,{initial:!1,children:a&&(0,d.jsx)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.3},className:"fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm",children:(0,d.jsx)(aA.motion.div,{initial:{scale:.95,opacity:0,y:20},animate:{scale:"closing"===k?.95:1,opacity:+("closing"!==k),y:20*("closing"===k)},exit:{scale:.95,opacity:0,y:20},transition:{type:"spring",stiffness:300,damping:25},className:"bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden",children:(0,d.jsx)(a_,{initial:!1,mode:"wait",children:m?(0,d.jsxs)(aA.motion.div,{initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.9},transition:{duration:.3},className:"p-8 text-center",children:[(0,d.jsx)("div",{className:"mx-auto w-16 h-16 bg-paydine-rose-beige/50 rounded-full flex items-center justify-center mb-4",children:(0,d.jsx)(bt.CheckCircle,{className:"w-8 h-8 text-paydine-elegant-gray"})}),(0,d.jsx)("h3",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-2",children:j("messageReceived")})]},"success"):(0,d.jsxs)(aA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"p-8",children:[(0,d.jsxs)("div",{className:"text-center mb-6",children:[(0,d.jsx)("div",{className:"mx-auto w-16 h-16 bg-paydine-rose-beige/50 hover:bg-paydine-champagne rounded-full flex items-center justify-center mb-4 transition-all duration-300",children:(0,d.jsx)(hG,{className:"w-8 h-8 text-paydine-elegant-gray"})}),(0,d.jsx)("h3",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-2",children:j("leaveNoteTitle")}),(0,d.jsx)("p",{className:"text-paydine-elegant-gray/80",children:j("leaveNoteDesc")})]}),(0,d.jsx)(bj.Textarea,{placeholder:j("notePlaceholder"),value:c,onChange:a=>f(a.target.value),className:"bg-white border-paydine-champagne/30 rounded-xl min-h-[100px] w-full mb-4"}),(0,d.jsxs)("div",{className:"flex gap-3 justify-center",children:[(0,d.jsx)(aA.motion.button,{whileHover:{scale:1.02},whileTap:{scale:.98},onClick:q,className:"flex-1 py-3 px-6 rounded-xl bg-gray-100 text-paydine-elegant-gray font-medium hover:bg-gray-200 transition-colors",children:j("cancel")}),(0,d.jsx)(aA.motion.button,{whileHover:{scale:1.02},whileTap:{scale:.98},onClick:p,className:"flex-1 py-3 px-6 rounded-xl bg-paydine-rose-beige/50 hover:bg-paydine-champagne text-paydine-elegant-gray font-medium transition-all duration-300",children:j("sendNote")})]})]},"edit")})})})})};var hJ=a.i(59843);function hK(){return(0,d.jsx)("div",{className:"min-h-[55vh] flex items-center justify-center px-4",children:(0,d.jsxs)("div",{className:"w-full max-w-xl rounded-3xl border border-white/30 bg-white/35 backdrop-blur-xl shadow-2xl p-8 text-center",children:[(0,d.jsx)("h2",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-3",children:"Welcome to PayMyDine"}),(0,d.jsx)("p",{className:"text-sm md:text-base text-gray-700 mb-6",children:"Your restaurant frontend is ready. Set up your menu, categories, images, and restaurant details from the admin panel."}),(0,d.jsx)(hJ.default,{href:"/admin",className:"inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold transition-opacity hover:opacity-90",style:{background:"var(--theme-button)",color:"var(--theme-background)"},children:"Set up your restaurant"})]})})}function hL(a){let{themeMenuActions:b,displayTableNumber:c,showVirtualHighlightSections:f,menuHighlightSettings:g,chefRecommendationItems:h,bestsellerItems:i,handleItemSelect:j,handleFirstAdd:k,allCategories:l,selectedCategory:m,setSelectedCategory:n,isFrontendConfigured:o,filteredItems:p,selectedItem:q,setSelectedItem:r,shouldHideCartSheet:s,isPaymentModalOpen:t,setPaymentModalOpen:u,setPaymentModalPreferPersonalReview:v,items:w,tableInfo:x,activeExistingOrderId:y,activePendingSummary:z,activeSubmittedOrder:A,paymentModalInitialStep:B,paymentModalPreferPersonalReview:C,setToolbarPricingSnapshot:D,setSharedTableOrder:E,setLocalOpenOrder:F,setHasLocalOpenOrder:G,isWaiterConfirmOpen:H,setWaiterConfirmOpen:I,tableIdString:J,tableName:K,isNoteModalOpen:L,setNoteModalOpen:M,note:N,setNote:O,handleSendNote:Q}=a,R=fU({setSharedTableOrder:E,setLocalOpenOrder:F,setHasLocalOpenOrder:G});return(0,d.jsx)(P,{actions:b,children:(0,d.jsxs)("div",{className:"relative min-h-screen w-full bg-theme-background pb-32",children:[(0,d.jsx)("header",{className:"py-8",children:(0,d.jsx)("div",{className:"max-w-4xl mx-auto px-4",children:(0,d.jsx)(hv.Logo,{tableNumber:c})})}),(0,d.jsx)(e.Suspense,{fallback:(0,d.jsx)(hE,{}),children:(0,d.jsxs)("main",{className:"max-w-4xl mx-auto",children:[f&&"top"===g.section_placement&&(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(hD,{title:"Chef’s Recommendations",subtitle:"Hand-picked favorites from the kitchen.",items:h,settings:g,onSelect:j,onFirstAdd:k}),(0,d.jsx)(hD,{title:"Best Sellers",subtitle:"Popular picks from recent orders.",items:i,settings:g,onSelect:j,onFirstAdd:k})]}),(0,d.jsx)(hw,{categories:l,selectedCategory:m||"All",onSelectCategory:a=>{n(a||"All")}}),f&&"after_categories"===g.section_placement&&(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(hD,{title:"Chef’s Recommendations",subtitle:"Hand-picked favorites from the kitchen.",items:h,settings:g,onSelect:j,onFirstAdd:k}),(0,d.jsx)(hD,{title:"Best Sellers",subtitle:"Popular picks from recent orders.",items:i,settings:g,onSelect:j,onFirstAdd:k})]}),(0,d.jsx)("section",{className:"w-full mb-12",children:o||0!==p.length?(0,d.jsx)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8 px-4",children:p.map((a,b)=>(0,d.jsx)(hB,{item:a,onSelect:j,onFirstAdd:()=>k(a),prioritizeImage:b<4,highlightSettings:g},a.id))}):(0,d.jsx)(hK,{})})]})}),(0,d.jsx)(hy,{...b}),!s&&(0,d.jsx)(ht,{}),(0,d.jsx)(gw,{item:q,onClose:()=>r(null),highlightSettings:g}),(0,d.jsx)(fM,{isOpen:t,onClose:()=>{u(!1),v(!1)},items:w,tableInfo:x,existingOrderId:y,pendingSummary:z,initialSubmittedOrder:A,initialCheckoutStep:B,preferPersonalReview:C,checkoutVisualTheme:"gold-luxury",onCartPricingUpdate:D,onOpenOrderUpdate:R}),(0,d.jsx)(hH,{isOpen:H,onOpenChange:I,tableId:J,tableName:K}),(0,d.jsx)(hI,{isOpen:L,onOpenChange:M,note:N,setNote:O,onSend:Q,tableId:J,tableName:K})]})})}let hM="/assets/media/uploads/PMDD.png?v=1780008763";function hN({visible:a}){return a?(0,d.jsxs)("div",{className:"pmd-menu-theme-footer-logo","data-pmd-menu-footer-logo":"1","aria-label":"PayMyDine",children:[(0,d.jsxs)("picture",{children:[(0,d.jsx)("source",{srcSet:hM,media:"(prefers-color-scheme: dark)"}),(0,d.jsx)("img",{src:"/assets/media/uploads/PMD.png?v=1780008763",alt:"PayMyDine",loading:"lazy",decoding:"async"})]}),(0,d.jsx)("img",{src:hM,alt:"","aria-hidden":"true",loading:"lazy",decoding:"async",className:"pmd-menu-theme-footer-logo-dark"})]}):null}function hO(a){let{isKazenJapaneseTheme:b,isModernGreenTheme:c,isOrganicBotanicalTheme:e,shouldShowPayMyDineFooterLogo:f,apiMenuItems:g,menuItems:h,menuData:i,allCategories:j,tableInfo:k,displayTableNumber:l,tableIdString:m,cmsSettings:n,merchantSettings:o,taxSettings:p,items:q,totalItems:r,totalPrice:s,lastInteractedItem:t,restaurantDisplayName:u,themeMenuActions:v,addToCart:w,handleFirstAdd:x,toast:y,apiClient:z,handleItemSelect:A,handleCartClick:B,shouldShowTableOrderAction:C,setPaymentModalInitialStep:D,sharedTableOrder:E,setPaymentModalPreferPersonalReview:F,setPaymentModalOpen:G,tableOrderActionCount:H,isPaymentModalOpen:I,activeExistingOrderId:J,activePendingSummary:K,activeSubmittedOrder:L,paymentModalInitialStep:M,paymentModalPreferPersonalReview:N,setToolbarPricingSnapshot:O,setSharedTableOrder:P,setLocalOpenOrder:Q,setHasLocalOpenOrder:R,setNoteModalOpen:S,showVirtualHighlightSections:T,menuHighlightSettings:U,chefRecommendationItems:V,bestsellerItems:W,selectedCategory:X,setSelectedCategory:Y,isFrontendConfigured:Z,filteredItems:$,selectedItem:_,setSelectedItem:aa,shouldHideCartSheet:ab,isWaiterConfirmOpen:ac,setWaiterConfirmOpen:ad,tableName:ae,isNoteModalOpen:af,note:ag,setNote:ah,handleSendNote:ai}=a,aj=a=>(0,d.jsxs)(d.Fragment,{children:[a,(0,d.jsx)(hN,{visible:f})]}),ak=String(a?.cmsSettings?.theme_configuration||a?.cmsSettings?.theme_id||a?.cmsSettings?.frontend_theme||a?.merchantSettings?.theme_configuration||a?.merchantSettings?.theme_id||a?.merchantSettings?.frontend_theme||"").trim().toLowerCase().replace(/[\s-]+/g,"_");if(a?.isVelvetTerracottaTheme||"velvet_terracotta"===ak)return aj((0,d.jsx)(f_,{...a}));let al=(()=>{try{return JSON.stringify(a||{}).toLowerCase()}catch{return""}})();return aj(String(a?.selectedFrontendTheme??a?.frontendTheme??a?.themeId??a?.theme?.id??a?.theme?.canonicalId??a?.theme?.theme_id??a?.settings?.frontend_theme??a?.settings?.theme_configuration??a?.settings?.data?.frontend_theme??a?.settings?.data?.theme_configuration??"").toLowerCase().replace(/[\s-]+/g,"_").includes("velvet")||al.includes("velvet_terracotta")||al.includes("velvet-terracotta")?(0,d.jsx)(f_,{...a}):b?(0,d.jsx)(fY,{apiMenuItems:g,menuItems:h,menuData:i,allCategories:j,tableInfo:k,displayTableNumber:l,tableIdString:m,cmsSettings:n,merchantSettings:o,taxSettings:p,items:q,totalItems:r,totalPrice:s,lastInteractedItem:t,restaurantDisplayName:u,themeMenuActions:v,addToCart:w,handleFirstAdd:x,toast:y,apiClient:z,handleItemSelect:A,selectedItem:_,setSelectedItem:aa,handleCartClick:B,shouldShowTableOrderAction:C,setPaymentModalInitialStep:D,sharedTableOrder:E,setPaymentModalPreferPersonalReview:F,setPaymentModalOpen:G,tableOrderActionCount:H,isPaymentModalOpen:I,activeExistingOrderId:J,activePendingSummary:K,activeSubmittedOrder:L,paymentModalInitialStep:M,paymentModalPreferPersonalReview:N,setToolbarPricingSnapshot:O,setSharedTableOrder:P,setLocalOpenOrder:Q,setHasLocalOpenOrder:R,normalizeModernGreenLogoUrl:fT,setNoteModalOpen:S}):c?(0,d.jsx)(gy,{apiMenuItems:g,menuItems:h,menuData:i,allCategories:j,tableInfo:k,displayTableNumber:l,tableIdString:m,cmsSettings:n,merchantSettings:o,taxSettings:p,items:q,totalItems:r,totalPrice:s,lastInteractedItem:t,restaurantDisplayName:u,themeMenuActions:v,addToCart:w,handleFirstAdd:x,toast:y,apiClient:z,handleItemSelect:A,selectedItem:_,setSelectedItem:aa,handleCartClick:B,shouldShowTableOrderAction:C,setPaymentModalInitialStep:D,sharedTableOrder:E,setPaymentModalPreferPersonalReview:F,setPaymentModalOpen:G,tableOrderActionCount:H,isPaymentModalOpen:I,activeExistingOrderId:J,activePendingSummary:K,activeSubmittedOrder:L,paymentModalInitialStep:M,paymentModalPreferPersonalReview:N,setToolbarPricingSnapshot:O,setSharedTableOrder:P,setLocalOpenOrder:Q,setHasLocalOpenOrder:R,normalizeModernGreenLogoUrl:fT}):e?(0,d.jsx)(hu,{apiMenuItems:g,menuItems:h,menuData:i,allCategories:j,restaurantDisplayName:u,displayTableNumber:l,themeMenuActions:v,taxSettings:p,addToCart:w,handleFirstAdd:x,toast:y,handleItemSelect:A,selectedItem:_,setSelectedItem:aa,shouldHideCartSheet:ab,isPaymentModalOpen:I,setPaymentModalOpen:G,setPaymentModalPreferPersonalReview:F,items:q,tableInfo:k,activeExistingOrderId:J,activePendingSummary:K,activeSubmittedOrder:L,paymentModalInitialStep:M,paymentModalPreferPersonalReview:N,setToolbarPricingSnapshot:O,setSharedTableOrder:P,setLocalOpenOrder:Q,setHasLocalOpenOrder:R}):(0,d.jsx)(hL,{themeMenuActions:v,displayTableNumber:l,showVirtualHighlightSections:T,menuHighlightSettings:U,chefRecommendationItems:V,bestsellerItems:W,handleItemSelect:A,handleFirstAdd:x,allCategories:j,selectedCategory:X,setSelectedCategory:Y,isFrontendConfigured:Z,filteredItems:$,selectedItem:_,setSelectedItem:aa,shouldHideCartSheet:ab,isPaymentModalOpen:I,setPaymentModalOpen:G,setPaymentModalPreferPersonalReview:F,items:q,tableInfo:k,activeExistingOrderId:J,activePendingSummary:K,activeSubmittedOrder:L,paymentModalInitialStep:M,paymentModalPreferPersonalReview:N,setToolbarPricingSnapshot:O,setSharedTableOrder:P,setLocalOpenOrder:Q,setHasLocalOpenOrder:R,isWaiterConfirmOpen:ac,setWaiterConfirmOpen:ad,tableIdString:m,tableName:ae,isNoteModalOpen:af,setNoteModalOpen:S,note:ag,setNote:ah,handleSendNote:ai}))}function hP(a){let b=String(a||"").trim();return b&&"undefined"!==b&&"null"!==b&&/^[A-Za-z0-9_-]{1,64}$/.test(b)?b:null}function hQ(){let a=(0,w.useSearchParams)(),[b,c]=(0,e.useState)(!1),[g,i]=(0,e.useState)(0),[j,k]=(0,e.useState)("All"),[r,t]=(0,e.useState)(null),[x,y]=(0,e.useState)(null),[z,A]=(0,e.useState)(!0),[C,D]=(0,e.useState)(!0),[E,I]=(0,e.useState)([]),[J,M]=(0,e.useState)(h),[N,O]=(0,e.useState)([]),{menuItems:P,settings:Q}=(0,p.useCmsConfigStore)(),{taxSettings:R,loadVATSettings:S}=s(),{merchantSettings:T}=(0,q.usePaymentSettingsStore)(),{items:U,toggleCart:V,addToCart:W,setTableInfo:X,clearTableContext:Y,clearCart:Z}=(0,u.useCartStore)(),{isPaymentModalOpen:$,setPaymentModalOpen:_,paymentModalInitialStep:aa,setPaymentModalInitialStep:ab,paymentModalPreferPersonalReview:ac,setPaymentModalPreferPersonalReview:ad,setToolbarPricingSnapshot:ae,totalItems:af,totalPrice:ag}=function({items:a,taxSettings:b}){let c,d,f,g=function(){let[a,b]=(0,e.useState)(!1),[c,d]=(0,e.useState)("review"),[f,g]=(0,e.useState)(!1);return(0,e.useEffect)(()=>{if("u"<typeof document)return;let a=a=>{let b=a.target,c=b?.closest?.("button");if(!c)return;let e=(c.textContent||"").replace(/\s+/g," ").trim().toLowerCase(),f=(c.getAttribute("aria-label")||"").toLowerCase(),h=f.includes("table order")||e.includes("table order");!h&&(f.includes("checkout")||e.includes("checkout"))&&(g(!0),d("review")),h&&(g(!1),d("review"))};return document.addEventListener("click",a,!0),()=>document.removeEventListener("click",a,!0)},[]),{isPaymentModalOpen:a,setPaymentModalOpen:b,paymentModalInitialStep:c,setPaymentModalInitialStep:d,paymentModalPreferPersonalReview:f,setPaymentModalPreferPersonalReview:g}}(),[h,i]=(0,e.useState)(null),j=(c=a.reduce((a,b)=>a+Number(b.quantity||0),0),d=a.reduce((a,b)=>a+Number(b.item.price||0)*Number(b.quantity||0),0),f=b.enabled&&Number(b.percentage||0)>0&&1===b.menuPrice?d*(Number(b.percentage||0)/100):0,{totalItems:c,subtotal:d,tax:f,total:d+f}),k=j.totalItems,l=j.subtotal,m=j.tax,n=h?.total??l+m;return(0,e.useEffect)(()=>{0===a.length&&h&&i(null)},[a.length,h]),{...g,toolbarPricingSnapshot:h,setToolbarPricingSnapshot:i,totalItems:k,totalPrice:n}}({items:U,taxSettings:R}),{themeId:ah,isResolved:ai}=function(){let[a,b]=(0,e.useState)({themeId:null,isResolved:!1});return(0,e.useEffect)(()=>{if("u"<typeof document)return;let a=()=>{let a=document.documentElement.getAttribute("data-theme"),c=a?(0,L.normalizeThemeId)(a):null;b({themeId:c,isResolved:"1"===document.documentElement.getAttribute("data-pmd-theme-resolved")||"organic_botanical_paper"===c})};a();let c=new MutationObserver(a);return c.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme","data-pmd-theme-resolved"]}),()=>c.disconnect()},[]),a}(),[aj,ak]=(0,e.useState)(!1),{isOrganicBotanicalTheme:al,isModernGreenTheme:am,isKazenJapaneseTheme:an,isVelvetTerracottaTheme:ao}=(0,e.useMemo)(()=>{let a=(0,L.normalizeThemeId)(ah);return{isOrganicBotanicalTheme:"organic_botanical_paper"===a,isModernGreenTheme:"modern_green"===a||aj,isKazenJapaneseTheme:"kazen_japanese"===a,isVelvetTerracottaTheme:"velvet_terracotta"===a}},[ah,aj]),ap=!ai&&!aj,{t:aq,language:ar}=(0,o.useLanguageStore)(),{toast:as}=(0,v.useToast)(),[at,au]=(0,e.useState)(!1),[av,aw]=(0,e.useState)(!1),[ax,ay]=(0,e.useState)(""),[az,aA]=(0,e.useState)(null),[aB,aC]=(0,e.useState)(null),[aD,aE]=(0,e.useState)(null),[aF,aG]=(0,e.useState)(!1),[aH,aI]=(0,e.useState)(null),{sharedTableOrderQr:aJ,sharedTableOrderContext:aK,tableIdString:aL,tableName:aM,displayTableNumber:aN}=function({searchParams:a,tableInfo:b,setTableInfoState:c}){let d=a?.get("qr")||null,f=a?.get("table_no")??null,g=a?.get("table_id")??null,h=!f&&!g,i=a?.get("qr")??null;(0,e.useEffect)(()=>{h&&c(null)},[h,c]),b?.table_no;let j=String(b?.table_id??g??null??"").trim(),k=b?.table_name??void 0,l=b?.table_no??f??b?.table_id??g??null,m=(0,e.useMemo)(()=>F(b,d),[b?.table_id,b?.table_no,b?.qr_code,d]);return{sharedTableOrderQr:d,sharedTableOrderContext:m,spQr:i,tableIdString:j,tableName:k,displayTableNumber:l,isRootDeliveryMode:h}}({searchParams:a,tableInfo:az,setTableInfoState:aA}),aO=e.default.useMemo(()=>{let a=String(aL||aN||az?.table_id||az?.table_no||"delivery").trim()||"delivery";return`pmd-note-draft:${a}`},[aL,aN,az?.table_id,az?.table_no]);(0,e.useEffect)(()=>{try{let a=localStorage.getItem(aO);a&&!ax&&ay(a)}catch{}},[aO]),(0,e.useEffect)(()=>{try{let a=String(ax||"");a.trim()?localStorage.setItem(aO,a):localStorage.removeItem(aO)}catch{}},[ax,aO]);let{tableDraft:aP,setTableDraft:aQ}=function({context:a,enabled:b=!0,pollIntervalMs:c=0,refreshOnFocus:d=!1,keepEmptyDrafts:g=!1}){let[h,i]=(0,e.useState)(null),[j,k]=(0,e.useState)(!1),[l,m]=(0,e.useState)(null),n=(0,e.useCallback)(async()=>{if(!b||!G(a))return i(null),null;k(!0),m(null);try{let b=await f.apiClient.getTableOrderDraft(a);return g||H(b)?i(b):i(null),b}catch(a){return m(a instanceof Error?a.message:"Failed to fetch table order draft"),null}finally{k(!1)}},[a,b,g]),o=(0,e.useCallback)(()=>{i(null),m(null),k(!1)},[]);return(0,e.useEffect)(()=>{if(!b||!G(a))return void o();let e=!1,f=async()=>{e||await n()};f();let g=c>0?window.setInterval(f,c):null,h=()=>{f()};return d&&window.addEventListener("focus",h),()=>{e=!0,g&&window.clearInterval(g),d&&window.removeEventListener("focus",h)}},[a,b,c,n,d,o]),{tableDraft:h,isDraftLoading:j,draftError:l,refreshDraft:n,resetDraft:o,setTableDraft:i}}({context:aK,enabled:!!(az?.table_id||az?.table_no),pollIntervalMs:12e3}),aR=(0,e.useRef)(null),{hasDraftTableOrderWithoutRealOrder:aS,activeExistingOrderId:aT,activePendingSummary:aU,activeSubmittedOrder:aV,shouldHideCartSheet:aW,shouldShowTableOrderAction:aX,tableOrderActionCount:aY}=function({sharedTableOrder:a,tableInfo:b,existingOrderId:c,setExistingOrderId:d,pendingSettlementSummary:f,setPendingSettlementSummary:g,localOpenOrder:h,setLocalOpenOrder:i,hasLocalOpenOrder:j,setHasLocalOpenOrder:k,paymentModalInitialStep:l,items:m}){let n=h?.paymentStatus==="paid"||h?.status==="paid",o=!!(H(a)&&a?.draft_id&&!a?.order_id&&!a?.orderId),p=o||n&&"review"===l?null:c,q=o||n&&"review"===l&&m.length>0?null:h;(0,e.useEffect)(()=>{if(H(a)){if(a?.draft_id&&!a?.order_id&&!a?.orderId){d(null),g(null),i(null),k(!1);return}a.order_id&&(d(Number(a.order_id)),g({orderTotal:Number(a.totals?.orderTotal||a.totals?.total||0),settledAmount:Number(a.totals?.settledAmount||0),remainingAmount:Number(a.totals?.remainingAmount||a.totals?.total||0)}),i(c=>{let d=K(a,b,0);return c&&String(c?.orderId||"")===String(a.order_id||"")?{...c,...d}:d}),k(!0))}},[a,b?.table_id,b?.table_no]),(0,e.useEffect)(()=>{if(c)try{let a=u.useCartStore.getState();a?.isCartOpen===!0&&u.useCartStore.setState({isCartOpen:!1})}catch(a){console.error("[PMD] close side cart for pending QR failed",a)}},[c]);let r=String(h?.status||"").toLowerCase(),s=String(h?.paymentStatus||h?.payment_status||"").toLowerCase(),t=Number(h?.remainingAmount??h?.remaining_amount??h?.totals?.remainingAmount??NaN),v=Number(h?.orderTotal??h?.total??h?.subtotal??0),w=!!(j&&h&&!["paid","completed","complete","delivered","cancelled","canceled"].includes(r)&&!["paid","settled"].includes(s)&&(Number.isFinite(t)&&t>0||!Number.isFinite(t)&&v>0));return{hasDraftTableOrderWithoutRealOrder:o,activeExistingOrderId:p,activePendingSummary:o||n&&"review"===l?null:f,activeSubmittedOrder:q,shouldHideCartSheet:!!p,shouldShowTableOrderAction:H(a)||w,tableOrderActionCount:Number(Number(a?.items?.filter(a=>!B(a)).reduce((a,b)=>a+Number(b?.quantity||1),0)||0)||(w?h?.submittedItems?.reduce?.((a,b)=>a+Number(b?.quantity||1),0):0)||0)}}({sharedTableOrder:aP,tableInfo:az,existingOrderId:aB,setExistingOrderId:aC,pendingSettlementSummary:aD,setPendingSettlementSummary:aE,localOpenOrder:aH,setLocalOpenOrder:aI,hasLocalOpenOrder:aF,setHasLocalOpenOrder:aG,paymentModalInitialStep:aa,items:U}),aZ=function({isModernGreenTheme:a,isOrganicBotanicalTheme:b}){return a||b}({isModernGreenTheme:am,isOrganicBotanicalTheme:al}),a$=fV(Q,T,az);e.default.useEffect(()=>{},[ak]),function({searchParams:a,apiMenuItems:b,selectedCategory:c,setSelectedCategory:d,setIsLoading:g,setIsFrontendConfigured:i,setApiMenuItems:j,setMenuHighlightSettings:k,setDynamicCategories:o,setTableInfoState:p,setTableInfo:q,clearCart:r,setPaymentModalOpen:s,setExistingOrderId:t,setPendingSettlementSummary:v,setLocalOpenOrder:w,setHasLocalOpenOrder:x,hydratedPendingOrderRef:y,existingOrderId:z,loadVATSettings:A}){(0,e.useEffect)(()=>{d("All")},[d]),(0,e.useEffect)(()=>{b.length>0&&d("All")},[b.length,d]),(0,e.useEffect)(()=>{A()},[A]),(0,e.useEffect)(()=>{!async function(){try{g(!0),console.log("Loading menu data...");let b=hP(a.get("table_id")),c=hP(a.get("table_no")),d=hP(a.get("table")),e=a.get("qr"),m=a.get("table_no")||a.get("table_id")||a.get("table"),n=c||b||d;if(m&&!n&&console.warn("[PMD] Ignoring malformed table parameter",{rawTableParam:m}),n)try{let a=await f.apiClient.getTableInfo(n,e||void 0,!!c);if(a.success){let b={table_id:String(a.data.table_id??n),table_name:String(a.data.table_name??""),location_id:Number(a.data.location_id??1),qr_code:a.data.qr_code??null,table_no:null!=a.data.table_no?Number(a.data.table_no):void 0};p(b),q(b);let d=await f.apiClient.getPendingQrOrderByTable(String(a.data.table_id),{tableNo:a.data?.table_no??c??null,qr:e||null});if(d?.success&&d.data?.order_id){let b=Number(d.data.order_id);if(t(b),v({orderTotal:Number(d.data.order_total||0),settledAmount:Number(d.data.settled_amount||0),remainingAmount:Number(d.data.remaining_amount||0)}),w({orderId:b,status:"submitted_unpaid",paymentStatus:"unpaid",tableNumber:a.data?.table_no??c??null,total:Number(d.data.order_total||0),orderTotal:Number(d.data.order_total||0),settledAmount:Number(d.data.settled_amount||0),remainingAmount:Number(d.data.remaining_amount||0),submittedItems:d.data.items||[],payment:"qr_pay_later"}),x(!0),y.current!==b){y.current=b;try{let a=u.useCartStore.getState();a?.isCartOpen===!0&&u.useCartStore.setState({isCartOpen:!1})}catch(a){console.error("[PMD] close drawer after table order sync failed",a)}}}else{let b=null!==y.current||null!==z;if(t(null),v(null),y.current=null,b){console.info("[PMD QR fallback] No pending QR order, restoring normal menu flow",{table_id:a?.data?.table_id??null,table_no:a?.data?.table_no??null}),r();try{let a=u.useCartStore.getState();a?.isCartOpen===!0&&u.useCartStore.setState({isCartOpen:!1})}catch(a){console.error("[PMD QR fallback] close drawer failed",a)}s(!1)}}}}catch(a){console.error("Failed to fetch table info:",a)}let A=await l();j(A.menuItems),o(A.categoryNames),i(A.isFrontendConfigured??!0),k(A.menuHighlightSettings||h)}catch(a){console.error("Failed to load menu data:",a),j(n),o(m),d("All")}finally{g(!1)}}()},[a,q,r,s])}({searchParams:a,apiMenuItems:E,selectedCategory:j,setSelectedCategory:k,setIsLoading:A,setIsFrontendConfigured:D,setApiMenuItems:I,setMenuHighlightSettings:M,setDynamicCategories:O,setTableInfoState:aA,setTableInfo:X,clearCart:Z,setPaymentModalOpen:_,setExistingOrderId:aC,setPendingSettlementSummary:aE,setLocalOpenOrder:aI,setHasLocalOpenOrder:aG,hydratedPendingOrderRef:aR,existingOrderId:aB,loadVATSettings:S});let{allCategories:a_,filteredItems:a0,highlightSourceItems:a1,chefRecommendationItems:a2,bestsellerItems:a3,showVirtualHighlightSections:a4}=function(a){let{apiMenuItems:b,taxSettings:c,menuData:d,menuItems:f,dynamicCategories:g,selectedCategory:h,menuHighlightSettings:i}=a,j=(0,e.useMemo)(()=>["All",...g],[g]),k=a=>c.enabled&&Number(c.percentage||0)>0&&0===Number(c.menuPrice||0)?a*(1+Number(c.percentage||0)/100):a,l=(0,e.useMemo)(()=>{let a=(b.length?b:f.length?f:d).map(a=>({...a,price:k(a.price),options:a.options?.map(a=>({...a,values:a.values.map(a=>({...a,price:k(a.price)}))}))})),c=h||"All";return"All"===c?a:a.filter(a=>a.category===c)},[b,f,h,c.enabled,c.percentage,c.menuPrice]),m=(0,e.useMemo)(()=>(b.length?b:f.length?f:d).map(a=>({...a,price:k(a.price),options:a.options?.map(a=>({...a,values:a.values.map(a=>({...a,price:k(a.price)}))}))})),[b,f,c.enabled,c.percentage,c.menuPrice]),n=(0,e.useMemo)(()=>i.chef_section_enabled&&"hidden"!==i.section_placement?m.filter(a=>!!a.is_chef_recommended).slice(0,i.max_chef_items):[],[m,i]),o=(0,e.useMemo)(()=>i.bestseller_section_enabled&&"hidden"!==i.section_placement?m.filter(a=>!!a.is_bestseller).slice(0,i.max_bestseller_items):[],[m,i]);return{allCategories:j,filteredItems:l,highlightSourceItems:m,chefRecommendationItems:n,bestsellerItems:o,showVirtualHighlightSections:"All"===(h||"All")&&"hidden"!==i.section_placement}}({apiMenuItems:E,taxSettings:R,menuData:n,menuItems:P,dynamicCategories:N,selectedCategory:j,menuHighlightSettings:J}),a5=e.default.useCallback(a=>{y(u.useCartStore.getState().items.find(b=>b.item.id===a.id)||{item:a,quantity:1})},[]),a6=()=>aw(!0),a7=()=>au(!0),a8=()=>{U.length>0&&(ab("review"),_(!0))},a9=function({addToCart:a,handleFirstAdd:b,handleCartClick:c,setPaymentModalInitialStep:d,setPaymentModalOpen:f,sharedTableOrder:g,handleWaiterClick:h,handleNoteClick:i,tableIdString:j,totalItems:k,tableOrderActionCount:l,shouldShowTableOrderAction:m,displayTableNumber:n,language:o,showValet:p=!0}){return(0,e.useMemo)(()=>({onAddItem:(c,d=1)=>{a(c,d),b(c)},onOpenCheckout:c,onOpenTableOrder:()=>{d(g?.status==="draft"?"review":g?.status==="paid"?"paid":"submitted"),f(!0)},onCallWaiter:h,onOpenNote:i,onOpenValet:()=>{p&&(j?window.location.href=`/table/${j}/valet`:window.location.href="/valet")},cartCount:k,tableOrderCount:l,showTableOrder:m,showValet:p,tableNumber:n,currentLocale:o,language:o}),[a,b,c,d,f,g?.status,h,i,j,k,l,m,n,o,p])}({addToCart:W,handleFirstAdd:a5,handleCartClick:a8,setPaymentModalInitialStep:ab,setPaymentModalOpen:_,sharedTableOrder:aP,handleWaiterClick:a6,handleNoteClick:a7,tableIdString:aL,totalItems:af,tableOrderActionCount:aY,shouldShowTableOrderAction:aX,displayTableNumber:aN,language:ar,showValet:a$}),ba=async()=>{let a=(ax??"").trim();if(!a)return void as({title:"Error",description:"Please enter a note before sending.",variant:"destructive"});if(a.length>1e3)return void as({title:"Error",description:"Note is too long. Please keep it under 1000 characters.",variant:"destructive"});let b=aL||"delivery";try{await f.apiClient.callTableNote(String(b),a,new Date().toISOString());try{localStorage.removeItem(aO)}catch{}ay(""),au(!1),as({title:"Note Sent",description:"Your note has been sent to the staff!"})}catch(a){console.error("Failed to send note:",a),as({title:"Note Failed",description:`Failed to send note: ${a instanceof Error?a.message:"Unknown error"}`,variant:"destructive"})}};if((0,e.useEffect)(()=>{c(!0)},[]),!function(a){let{tableInfo:b,searchParams:c,existingOrderId:d,setExistingOrderId:f,hasDraftTableOrderWithoutRealOrder:g,setHasLocalOpenOrder:h,setLocalOpenOrder:i}=a;(0,e.useEffect)(()=>{},[b,c,d,g])}({tableInfo:az,searchParams:a,existingOrderId:aB,setExistingOrderId:aC,hasDraftTableOrderWithoutRealOrder:aS,setHasLocalOpenOrder:aG,setLocalOpenOrder:aI}),(0,e.useEffect)(()=>{let a=String(az?.table_id||"").trim();if(!a)return;let b=!1,c=async()=>{try{let c=await f.apiClient.getPendingQrOrderByTable(a,{tableNo:az?.table_no??az?.tableNo??null,qr:az?.qr_code??aJ??null});if(b||!c?.success||!c.data?.order_id)return;let d=Number(c.data.order_id),e=Number(c.data.order_total||0),g=Number(c.data.settled_amount||0),h=Number(c.data.remaining_amount||e||0),i=Array.isArray(c.data.items)?c.data.items:[];aC(d),aE({orderTotal:e,settledAmount:g,remainingAmount:h}),aI(a=>({...a||{},orderId:d,status:"submitted_unpaid",paymentStatus:h<=0?"paid":g>0?"partial":"unpaid",tableNumber:az?.table_no??null,total:e,orderTotal:e,settledAmount:g,remainingAmount:h,submittedItems:i,payment:"qr_pay_later",updatedAt:new Date().toISOString()})),aG(!0)}catch(a){}};c();let d=window.setInterval(c,5e3),e=()=>{c()};return window.addEventListener("focus",e),()=>{b=!0,window.clearInterval(d),window.removeEventListener("focus",e)}},[az?.table_id,az?.table_no,az?.qr_code,aJ,aC,aG,aI,aE]),!function(a){let{enabled:b,tableIdString:c,shouldShowTableOrderAction:d,sharedTableOrder:f,handleWaiterClick:g,handleNoteClick:h,handleCartClick:i,setPaymentModalInitialStep:j,setPaymentModalOpen:k,addToCart:l,handleFirstAdd:m,toast:n}=a;(0,e.useLayoutEffect)(()=>{if("u"<typeof document)return;let a="data-pmd-organic-botanical-active";if(!b){document.body.removeAttribute(a),document.documentElement.removeAttribute(a);return}return document.body.setAttribute(a,"1"),document.documentElement.setAttribute(a,"1"),()=>{document.body.removeAttribute(a),document.documentElement.removeAttribute(a)}},[b]),e.default.useEffect(()=>{},[b,c,d,f?.status,g,h,i,j,k,l,m,n]),e.default.useEffect(()=>{if(!b||"u"<typeof document)return;let a=0;function c(b){let c=b.target,e=c?.closest?.("[data-pmd-organic-dock-action]");if(!e)return;let l=Date.now();if(l-a<350)return;a=l,b.preventDefault(),b.stopPropagation(),b.stopImmediatePropagation?.();let m=String(e.getAttribute("data-pmd-organic-dock-action")||"");console.info("PMD_ORGANIC_DOCK_CLICK",m),function(a){if("waiter"===a)return g();if("note"===a)return h();if("checkout"===a)return i();if("table-order"===a){if(!d)return;j(f?.status==="draft"?"review":f?.status==="paid"?"paid":"submitted"),k(!0)}}(m)}return document.addEventListener("pointerdown",c,!0),document.addEventListener("click",c,!0),()=>{document.removeEventListener("pointerdown",c,!0),document.removeEventListener("click",c,!0)}},[b,d,f?.status,g,h,i,j,k]),e.default.useEffect(()=>{if("u">typeof document)return b?(document.body.setAttribute("data-pmd-organic-botanical-active","1"),document.documentElement.setAttribute("data-pmd-organic-botanical-active","1")):(document.body.removeAttribute("data-pmd-organic-botanical-active"),document.documentElement.removeAttribute("data-pmd-organic-botanical-active")),()=>{document.body.removeAttribute("data-pmd-organic-botanical-active"),document.documentElement.removeAttribute("data-pmd-organic-botanical-active")}},[b])}({enabled:al,tableIdString:aL,shouldShowTableOrderAction:aX,sharedTableOrder:aP,handleWaiterClick:a6,handleNoteClick:a7,handleCartClick:a8,setPaymentModalInitialStep:ab,setPaymentModalOpen:_,addToCart:W,handleFirstAdd:a5,toast:as}),!b)return(0,d.jsx)(hE,{});let bb=T?.businessName||Q?.appName||"PayMyDine";return ap||z&&0===E.length&&0===P.length?(0,d.jsx)("div",{className:"pmd-customer-page page--menu relative min-h-screen w-full","data-pmd-theme-loading":"1","data-pmd-menu-loading-skeleton":"1",style:{background:"#fbf8f2",color:"#343529"},children:(0,d.jsxs)("div",{className:"mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-5 py-6 sm:px-8",children:[(0,d.jsxs)("div",{className:"flex items-center justify-between",children:[(0,d.jsx)("div",{className:"h-10 w-32 animate-pulse rounded-full bg-black/10"}),(0,d.jsx)("div",{className:"h-9 w-24 animate-pulse rounded-full bg-black/10"})]}),(0,d.jsx)("div",{className:"h-44 animate-pulse rounded-[2rem] bg-black/10"}),(0,d.jsx)("div",{className:"flex gap-3 overflow-hidden",children:[0,1,2,3].map(a=>(0,d.jsx)("div",{className:"h-10 min-w-28 animate-pulse rounded-full bg-black/10"},a))}),(0,d.jsx)("div",{className:"grid gap-4 sm:grid-cols-2 lg:grid-cols-3",children:[0,1,2,3,4,5].map(a=>(0,d.jsx)("div",{className:"h-48 animate-pulse rounded-[1.6rem] bg-black/10"},a))})]})}):(aL||aN||az?.table_id||az?.table_no||a.get("table")||a.get("table_id")||a.get("table_no")||a.get("qr"),(0,d.jsx)(hO,{isKazenJapaneseTheme:an,isVelvetTerracottaTheme:ao,isModernGreenTheme:am,isOrganicBotanicalTheme:al,shouldShowPayMyDineFooterLogo:aZ,apiMenuItems:E,menuItems:P,menuData:n,allCategories:a_,tableInfo:az,displayTableNumber:aN,tableIdString:aL,cmsSettings:Q,merchantSettings:T,taxSettings:R,items:U,totalItems:af,totalPrice:ag,lastInteractedItem:x,restaurantDisplayName:bb,themeMenuActions:a9,addToCart:W,handleFirstAdd:a5,toast:as,apiClient:f.apiClient,handleItemSelect:a=>{t(a);let b=U.find(b=>b.item.id===a.id);b&&y(b)},handleCartClick:a8,shouldShowTableOrderAction:aX,setPaymentModalInitialStep:ab,sharedTableOrder:aP,setPaymentModalPreferPersonalReview:ad,setPaymentModalOpen:_,tableOrderActionCount:aY,isPaymentModalOpen:$,activeExistingOrderId:aT,activePendingSummary:aU,activeSubmittedOrder:aV,paymentModalInitialStep:aa,paymentModalPreferPersonalReview:ac,setToolbarPricingSnapshot:ae,setSharedTableOrder:aQ,setLocalOpenOrder:aI,setHasLocalOpenOrder:aG,setNoteModalOpen:au,showVirtualHighlightSections:a4,menuHighlightSettings:J,chefRecommendationItems:a2,bestsellerItems:a3,selectedCategory:j,setSelectedCategory:k,isFrontendConfigured:C,filteredItems:a0,selectedItem:r,setSelectedItem:t,shouldHideCartSheet:aW,isWaiterConfirmOpen:av,setWaiterConfirmOpen:aw,tableName:aM,isNoteModalOpen:at,note:ax,setNote:ay,handleSendNote:ba,showValet:a$}))}a.s(["default",0,function(){return(0,d.jsx)("div",{className:"pmd-customer-page page--menu","data-pmd-customer-page":"menu",children:(0,d.jsx)(e.Suspense,{fallback:(0,d.jsx)("div",{children:"Loading..."}),children:(0,d.jsx)(hQ,{})})})}],22224)}];

//# sourceMappingURL=frontend_0isszf8._.js.map