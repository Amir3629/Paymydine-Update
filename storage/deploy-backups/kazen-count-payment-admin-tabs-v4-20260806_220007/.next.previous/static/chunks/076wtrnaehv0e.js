(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,66298,(e,t,r)=>{},13519,(e,t,r)=>{var a=e.i(39057);e.r(66298);var o=e.r(30668),n=o&&"object"==typeof o&&"default"in o?o:{default:o},i=void 0!==a.default&&a.default.env&&!0,s=function(e){return"[object String]"===Object.prototype.toString.call(e)},l=function(){function e(e){var t=void 0===e?{}:e,r=t.name,a=void 0===r?"stylesheet":r,o=t.optimizeForSpeed,n=void 0===o?i:o;c(s(a),"`name` must be a string"),this._name=a,this._deletedRulePlaceholder="#"+a+"-deleted-rule____{}",c("boolean"==typeof n,"`optimizeForSpeed` must be a boolean"),this._optimizeForSpeed=n,this._serverSheet=void 0,this._tags=[],this._injected=!1,this._rulesCount=0;var l="u">typeof window&&document.querySelector('meta[property="csp-nonce"]');this._nonce=l?l.getAttribute("content"):null}var t,r=e.prototype;return r.setOptimizeForSpeed=function(e){c("boolean"==typeof e,"`setOptimizeForSpeed` accepts a boolean"),c(0===this._rulesCount,"optimizeForSpeed cannot be when rules have already been inserted"),this.flush(),this._optimizeForSpeed=e,this.inject()},r.isOptimizeForSpeed=function(){return this._optimizeForSpeed},r.inject=function(){var e=this;if(c(!this._injected,"sheet already injected"),this._injected=!0,"u">typeof window&&this._optimizeForSpeed){this._tags[0]=this.makeStyleTag(this._name),this._optimizeForSpeed="insertRule"in this.getSheet(),this._optimizeForSpeed||(i||console.warn("StyleSheet: optimizeForSpeed mode not supported falling back to standard mode."),this.flush(),this._injected=!0);return}this._serverSheet={cssRules:[],insertRule:function(t,r){return"number"==typeof r?e._serverSheet.cssRules[r]={cssText:t}:e._serverSheet.cssRules.push({cssText:t}),r},deleteRule:function(t){e._serverSheet.cssRules[t]=null}}},r.getSheetForTag=function(e){if(e.sheet)return e.sheet;for(var t=0;t<document.styleSheets.length;t++)if(document.styleSheets[t].ownerNode===e)return document.styleSheets[t]},r.getSheet=function(){return this.getSheetForTag(this._tags[this._tags.length-1])},r.insertRule=function(e,t){if(c(s(e),"`insertRule` accepts only strings"),"u"<typeof window)return"number"!=typeof t&&(t=this._serverSheet.cssRules.length),this._serverSheet.insertRule(e,t),this._rulesCount++;if(this._optimizeForSpeed){var r=this.getSheet();"number"!=typeof t&&(t=r.cssRules.length);try{r.insertRule(e,t)}catch(t){return i||console.warn("StyleSheet: illegal rule: \n\n"+e+"\n\nSee https://stackoverflow.com/q/20007992 for more info"),-1}}else{var a=this._tags[t];this._tags.push(this.makeStyleTag(this._name,e,a))}return this._rulesCount++},r.replaceRule=function(e,t){if(this._optimizeForSpeed||"u"<typeof window){var r="u">typeof window?this.getSheet():this._serverSheet;if(t.trim()||(t=this._deletedRulePlaceholder),!r.cssRules[e])return e;r.deleteRule(e);try{r.insertRule(t,e)}catch(a){i||console.warn("StyleSheet: illegal rule: \n\n"+t+"\n\nSee https://stackoverflow.com/q/20007992 for more info"),r.insertRule(this._deletedRulePlaceholder,e)}}else{var a=this._tags[e];c(a,"old rule at index `"+e+"` not found"),a.textContent=t}return e},r.deleteRule=function(e){if("u"<typeof window)return void this._serverSheet.deleteRule(e);if(this._optimizeForSpeed)this.replaceRule(e,"");else{var t=this._tags[e];c(t,"rule at index `"+e+"` not found"),t.parentNode.removeChild(t),this._tags[e]=null}},r.flush=function(){this._injected=!1,this._rulesCount=0,"u">typeof window?(this._tags.forEach(function(e){return e&&e.parentNode.removeChild(e)}),this._tags=[]):this._serverSheet.cssRules=[]},r.cssRules=function(){var e=this;return"u"<typeof window?this._serverSheet.cssRules:this._tags.reduce(function(t,r){return r?t=t.concat(Array.prototype.map.call(e.getSheetForTag(r).cssRules,function(t){return t.cssText===e._deletedRulePlaceholder?null:t})):t.push(null),t},[])},r.makeStyleTag=function(e,t,r){t&&c(s(t),"makeStyleTag accepts only strings as second parameter");var a=document.createElement("style");this._nonce&&a.setAttribute("nonce",this._nonce),a.type="text/css",a.setAttribute("data-"+e,""),t&&a.appendChild(document.createTextNode(t));var o=document.head||document.getElementsByTagName("head")[0];return r?o.insertBefore(a,r):o.appendChild(a),a},t=[{key:"length",get:function(){return this._rulesCount}}],function(e,t){for(var r=0;r<t.length;r++){var a=t[r];a.enumerable=a.enumerable||!1,a.configurable=!0,"value"in a&&(a.writable=!0),Object.defineProperty(e,a.key,a)}}(e.prototype,t),e}();function c(e,t){if(!e)throw Error("StyleSheet: "+t+".")}var d=function(e){for(var t=5381,r=e.length;r;)t=33*t^e.charCodeAt(--r);return t>>>0},m={};function p(e,t){if(!t)return"jsx-"+e;var r=String(t),a=e+r;return m[a]||(m[a]="jsx-"+d(e+"-"+r)),m[a]}function u(e,t){"u"<typeof window&&(t=t.replace(/\/style/gi,"\\/style"));var r=e+t;return m[r]||(m[r]=t.replace(/__jsx-style-dynamic-selector/g,e)),m[r]}var h=function(){function e(e){var t=void 0===e?{}:e,r=t.styleSheet,a=void 0===r?null:r,o=t.optimizeForSpeed,n=void 0!==o&&o;this._sheet=a||new l({name:"styled-jsx",optimizeForSpeed:n}),this._sheet.inject(),a&&"boolean"==typeof n&&(this._sheet.setOptimizeForSpeed(n),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed()),this._fromServer=void 0,this._indices={},this._instancesCounts={}}var t=e.prototype;return t.add=function(e){var t=this;void 0===this._optimizeForSpeed&&(this._optimizeForSpeed=Array.isArray(e.children),this._sheet.setOptimizeForSpeed(this._optimizeForSpeed),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed()),"u">typeof window&&!this._fromServer&&(this._fromServer=this.selectFromServer(),this._instancesCounts=Object.keys(this._fromServer).reduce(function(e,t){return e[t]=0,e},{}));var r=this.getIdAndRules(e),a=r.styleId,o=r.rules;if(a in this._instancesCounts){this._instancesCounts[a]+=1;return}var n=o.map(function(e){return t._sheet.insertRule(e)}).filter(function(e){return -1!==e});this._indices[a]=n,this._instancesCounts[a]=1},t.remove=function(e){var t=this,r=this.getIdAndRules(e).styleId;if(function(e,t){if(!e)throw Error("StyleSheetRegistry: "+t+".")}(r in this._instancesCounts,"styleId: `"+r+"` not found"),this._instancesCounts[r]-=1,this._instancesCounts[r]<1){var a=this._fromServer&&this._fromServer[r];a?(a.parentNode.removeChild(a),delete this._fromServer[r]):(this._indices[r].forEach(function(e){return t._sheet.deleteRule(e)}),delete this._indices[r]),delete this._instancesCounts[r]}},t.update=function(e,t){this.add(t),this.remove(e)},t.flush=function(){this._sheet.flush(),this._sheet.inject(),this._fromServer=void 0,this._indices={},this._instancesCounts={}},t.cssRules=function(){var e=this,t=this._fromServer?Object.keys(this._fromServer).map(function(t){return[t,e._fromServer[t]]}):[],r=this._sheet.cssRules();return t.concat(Object.keys(this._indices).map(function(t){return[t,e._indices[t].map(function(e){return r[e].cssText}).join(e._optimizeForSpeed?"":"\n")]}).filter(function(e){return!!e[1]}))},t.styles=function(e){var t,r;return t=this.cssRules(),void 0===(r=e)&&(r={}),t.map(function(e){var t=e[0],a=e[1];return n.default.createElement("style",{id:"__"+t,key:"__"+t,nonce:r.nonce?r.nonce:void 0,dangerouslySetInnerHTML:{__html:a}})})},t.getIdAndRules=function(e){var t=e.children,r=e.dynamic,a=e.id;if(r){var o=p(a,r);return{styleId:o,rules:Array.isArray(t)?t.map(function(e){return u(o,e)}):[u(o,t)]}}return{styleId:p(a),rules:Array.isArray(t)?t:[t]}},t.selectFromServer=function(){return Array.prototype.slice.call(document.querySelectorAll('[id^="__jsx-"]')).reduce(function(e,t){return e[t.id.slice(2)]=t,e},{})},e}(),f=o.createContext(null);function y(){return new h}function g(){return o.useContext(f)}f.displayName="StyleSheetContext";var b=n.default.useInsertionEffect||n.default.useLayoutEffect,k="u">typeof window?y():void 0;function v(e){var t=k||g();return t&&("u"<typeof window?t.add(e):b(function(){return t.add(e),function(){t.remove(e)}},[e.id,String(e.dynamic)])),null}v.dynamic=function(e){return e.map(function(e){return p(e[0],e[1])}).join(" ")},r.StyleRegistry=function(e){var t=e.registry,r=e.children,a=o.useContext(f),i=o.useState(function(){return a||t||y()})[0];return n.default.createElement(f.Provider,{value:i},r)},r.createStyleRegistry=y,r.style=v,r.useStyleRegistry=g},27197,(e,t,r)=>{t.exports=e.r(13519).style},96657,e=>{e.v({badge:"KazenBottomDock-module__g-C2hq__badge",button:"KazenBottomDock-module__g-C2hq__button",dock:"KazenBottomDock-module__g-C2hq__dock",icon:"KazenBottomDock-module__g-C2hq__icon",primary:"KazenBottomDock-module__g-C2hq__primary"})},57671,(e,t,r)=>{"use strict";t.exports="SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED"},91163,(e,t,r)=>{"use strict";var a=e.r(57671);function o(){}function n(){}n.resetWarningCache=o,t.exports=function(){function e(e,t,r,o,n,i){if(i!==a){var s=Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");throw s.name="Invariant Violation",s}}function t(){return e}e.isRequired=e;var r={array:e,bigint:e,bool:e,func:e,number:e,object:e,string:e,symbol:e,any:e,arrayOf:t,element:e,elementType:e,instanceOf:t,node:e,objectOf:t,oneOf:t,oneOfType:t,shape:t,exact:t,checkPropTypes:n,resetWarningCache:o};return r.PropTypes=r,r}},88575,(e,t,r)=>{t.exports=e.r(91163)()},46351,e=>{e.v({badge:"ModernGreenBottomDock-module__bGvAoG__badge",button:"ModernGreenBottomDock-module__bGvAoG__button",dock:"ModernGreenBottomDock-module__bGvAoG__dock",icon:"ModernGreenBottomDock-module__bGvAoG__icon",primary:"ModernGreenBottomDock-module__bGvAoG__primary"})},41990,e=>{e.v({badge:"OrganicBottomDock-module__mo23YG__badge",button:"OrganicBottomDock-module__mo23YG__button",dock:"OrganicBottomDock-module__mo23YG__dock",icon:"OrganicBottomDock-module__mo23YG__icon",primary:"OrganicBottomDock-module__mo23YG__primary"})},61932,e=>{e.v({badge:"GoldBottomDock-module__wdX1ma__badge",button:"GoldBottomDock-module__wdX1ma__button",dock:"GoldBottomDock-module__wdX1ma__dock",icon:"GoldBottomDock-module__wdX1ma__icon",primary:"GoldBottomDock-module__wdX1ma__primary"})},45978,e=>{"use strict";var t,r,a=e.i(39057),o=e.i(48277),n=e.i(30668),i=e.i(26464),s=e.i(70986);let l={chef_section_enabled:!1,bestseller_section_enabled:!1,show_card_badges:!0,show_modal_badges:!0,chef_label:"Chef’s Choice",bestseller_label:"Best Seller",max_chef_items:8,max_bestseller_items:8,badge_display_mode:"priority_only",badge_style:"corner_ribbon",badge_position:"image_top_left",show_badge_text_on_cards:!1,show_badge_text_in_modal:!0,section_placement:"hidden"},c=e=>!0===e||1===e||"1"===e,d=e=>{if(null==e||""===e)return null;let t=Number(e);return Number.isFinite(t)?t:null},m=e=>{let t=Array.isArray(e)?e:[],r=new Set,a=[];return t.forEach(e=>{let t=(e=>{if(!e)return"";let t=String(e).trim();return t?/^https?:\/\//i.test(t)||t.startsWith("/")?t:t.startsWith("assets/media/")?`/${t}`:t.startsWith("attachments/public/")||t.startsWith("uploads/")?`/assets/media/${t}`:/\.(png|jpe?g|webp|gif|svg)(\?|#)?$/i.test(t)?`/assets/media/uploads/${t}`:t:""})("string"==typeof e?e:e?.url||e?.image||e?.src||e?.image_path||e?.path||"");t&&!r.has(t)&&(r.add(t),a.push(t))}),a};async function p(){try{var e;let t,r,a,o,n,p,u=await i.apiClient.getMenu(),h=u?.data?.items??u?.data??[],f=(Array.isArray(h)?h:[]).map(e=>((e,t)=>{let r=e.image||"/placeholder.svg?width=200&height=200";if(r&&r.startsWith("/api/media/")){let e=s.EnvironmentConfig.getInstance().backendBaseUrl();r=`${e}${r}`}return{id:e.id,name:e.name,nameKey:void 0,description:e.description||"",descriptionKey:void 0,price:e.price,image:r,images:m(e.images),gallery:m(e.gallery),media:Array.isArray(e.media)?e.media:[],category:t||e.category_name||"Main Course",category_id:e.category_id,category_name:e.category_name,calories:d(e.calories??e.nutrition?.calories),protein:d(e.protein??e.nutrition?.protein),carbs:d(e.carbs??e.nutrition?.carbs),fat:d(e.fat??e.nutrition?.fat),sugar:d(e.sugar??e.nutrition?.sugar),serving_size:e.serving_size||e.nutrition?.serving_size||null,color:e.color||null,nutrition:e.nutrition||null,allergens:e.allergens||[],allergy_tags:e.allergy_tags||e.allergens||[],halal:c(e.halal),vegetarian:c(e.vegetarian),vegan:c(e.vegan),stock_qty:e.stock_qty,minimum_qty:e.minimum_qty||1,available:!1!==e.available&&(null===e.stock_qty||(e.stock_qty??0)>0),options:e.options||[],prep_time_minutes:Number(e.prep_time_minutes||15),is_chef_recommended:c(e.is_chef_recommended),is_bestseller:c(e.is_bestseller),bestseller_source:e.bestseller_source||null,popularity_count:Number(e.popularity_count||0)}})(e,e.category_name))||[],y=await i.apiClient.getCategories(),g=(y?.data??[]).map(e=>e.category_name??e.name).filter(Boolean),b={};return f.forEach(e=>{let t=e.category;b[t]||(b[t]=[]),b[t].push(e)}),{categories:Object.values(b),menuItems:f,categoryNames:g,isFrontendConfigured:u?.data?.is_frontend_configured!==!1,menuHighlightSettings:(t=(e=u?.data?.menu_highlight_settings)&&"object"==typeof e?e:{},r=(e,r)=>{for(let r of e){let e=t[r];if(null!=e&&""!==e)return e}return r},a=(e,t)=>{let a=r(e,t);if("boolean"==typeof a)return a;let o=String(a).trim().toLowerCase();return!!["1","true","yes","on","enabled"].includes(o)||!["0","false","no","off","disabled"].includes(o)&&t},o=(e,t)=>{let a=Number(r(e,t));return Number.isFinite(a)?Math.max(1,Math.min(24,Math.round(a))):t},n=(e,t)=>String(r(e,t)??"").trim()||t,p=(e,t,r)=>{let a=n(e,t);return r.includes(a)?a:t},{chef_section_enabled:a(["enable_chef_recommendations_section","chef_section_enabled"],!1),bestseller_section_enabled:a(["enable_best_sellers_section","bestseller_section_enabled"],!1),show_card_badges:a(["show_badges_on_cards","show_card_badges"],!0),show_modal_badges:a(["show_badges_in_modal","show_modal_badges"],!0),chef_label:n(["chef_recommendation_label","chef_label"],l.chef_label),bestseller_label:n(["best_seller_label","bestseller_label"],l.bestseller_label),max_chef_items:o(["max_chef_recommendation_items","max_chef_items"],8),max_bestseller_items:o(["max_best_seller_items","max_bestseller_items"],8),badge_display_mode:p(["badge_display_mode"],"priority_only",["priority_only","show_all"]),badge_style:p(["badge_style"],"corner_ribbon",["minimal_circle","corner_ribbon","soft_pill","luxury_label"]),badge_position:p(["badge_position"],"image_top_left",["image_top_left","image_top_right","title_inline","hidden"]),show_badge_text_on_cards:a(["show_badge_text_on_cards"],!1),show_badge_text_in_modal:a(["show_badge_text_in_modal"],!0),section_placement:p(["section_placement"],"hidden",["top","after_categories","hidden"])}),menuCacheVersion:String(u?.data?.menu_cache_version||"default")}}catch(e){return console.error("Failed to fetch menu data from API:",e),{categories:[],menuItems:[],categoryNames:[],isFrontendConfigured:!0,menuHighlightSettings:l,menuCacheVersion:"fallback"}}}let u=[],h=[];var f=e.i(20627),y=e.i(61228),g=e.i(73381),b=e.i(54235);function k(){let e=(0,b.useCmsStore)(e=>e.taxSettings),t=(0,b.useCmsStore)(e=>e.loadVATSettings),r=(0,b.useCmsStore)(e=>e.loadTaxSettings);return{taxSettings:e,loadVATSettings:t,loadTaxSettings:r,updateVATSettings:(0,b.useCmsStore)(e=>e.updateVATSettings),updateTaxSettings:(0,b.useCmsStore)(e=>e.updateTaxSettings)}}function v(){return b.useCmsStore.getState().taxSettings}var x=e.i(63088),z=e.i(85498),C=e.i(96086);function w(e,t){let r=(Array.isArray(e?.order_totals)?e.order_totals:[]).find(e=>String(e?.code||"").toLowerCase()===t.toLowerCase()),a=Number(r?.value??0);return Number.isFinite(a)?a:0}function S(e,t=0){let r=(Array.isArray(e?.order_totals)?e.order_totals:[]).find(e=>"tax"===String(e?.code||"").toLowerCase()),a=String(r?.title||"").match(/([0-9]+(?:\.[0-9]+)?)\s*%/),o=a?Number(a[1]):Number(t||0);return Number.isFinite(o)?o:0}function _(e){let t=Math.max(2,Math.min(10,e)),r=Math.floor(100/t),a=100-r*t;return Array.from({length:t},(e,t)=>r+(0===t?a:0))}function E(e){let t=Number(e);return Number.isFinite(t)&&t>0?t:null}function N(e){return["cancelled","canceled","void","voided","refunded","removed"].includes(String(e?.status??e?.order_status??e?.item_status??e?.state??e?.void_status??"").trim().toLowerCase())||e?.cancelled===!0||e?.canceled===!0||e?.is_cancelled===!0||e?.is_canceled===!0||e?.is_void===!0||e?.voided===!0}function I(e){let t=Math.max(1,Number(e?.quantity||1)),r=Number(e?.price??e?.unit_price);if(Number.isFinite(r))return r;let a=Number(e?.subtotal??e?.total);return Number.isFinite(a)?a/t:0}function T(e=[]){let t=new Map;return e.forEach((e,r)=>{let a;if(N(e))return;let o=Math.max(1,Number(e?.quantity||1)),n=I(e),i=String(e?.name||`Item ${r+1}`),s=(a=e?.options??e?.modifiers??e?.selected_options??null)?"string"==typeof a?a:Array.isArray(a)?JSON.stringify(a.map(e=>"object"==typeof e?Object.keys(e).sort().reduce((t,r)=>({...t,[r]:e[r]}),{}):e)):"object"==typeof a?JSON.stringify(Object.keys(a).sort().reduce((e,t)=>({...e,[t]:a[t]}),{})):String(a):"",l=`${e?.menu_id||e?.order_menu_id||e?.id||i}|${i}|${s}`,c=t.get(l);c?(c.quantity+=o,c.subtotal+=n*o):t.set(l,{...e,name:i,quantity:o,price:n,subtotal:n*o,optionsKey:s})}),Array.from(t.values())}function A(e){if(null==e)return null;let t=String(e).trim();return t&&"undefined"!==t&&"null"!==t?t:null}function j(e,t){return{table_id:A(e?.table_id),table_no:A(e?.table_no),qr:A(e?.qr_code)||A(t)}}function P(e){return!!(A(e?.table_id)||A(e?.table_no)||A(e?.qr))}function B(e){if(!e?.success||!e.status)return!1;let t=String(e?.status||"").toLowerCase(),r=String(e?.paymentStatus||e?.payment_status||e?.totals?.paymentStatus||"").toLowerCase(),a=Number(e?.remainingAmount??e?.remaining_amount??e?.totals?.remainingAmount??e?.totals?.remaining_amount??NaN);return!("empty"===t||["paid","completed","complete","delivered","cancelled","canceled"].includes(t)||["paid","settled"].includes(r)||Number.isFinite(a)&&a<=0&&"draft"!==t)}function R(e,t=0){let r=Number(e);return Number.isFinite(r)?r:t}function O(...e){for(let t of e){let e=R(t,0);if(e>0)return e}return 0}function L(e,t,r=0){let a=e.totals||{subtotal:0,tax:0,total:0,orderTotal:0,settledAmount:0,remainingAmount:0},o=e.order_id??e.orderId??null,n=Array.isArray(e.items)?e.items.filter(e=>!N(e)):[],i=n.reduce((e,t)=>{let r=Math.max(1,R(t?.quantity??t?.qty,1)),a=O(t?.subtotal,t?.line_total,t?.total);return a>0?e+a:e+R(t?.price??t?.unit_price??t?.menu_price,0)*r},0),s=O(a.orderTotal,a.total,e.total,i),l=O(a.total,e.total,s),c=R(a.settledAmount??e.settlement?.settledAmount,0),d=O(a.remainingAmount,e.settlement?.remainingAmount,l-c,s-c,l);return{orderId:o,order_id:o,orderNumber:e.orderNumber??e.order_id??e.orderId??null,status:e.status||"submitted_unpaid",paymentStatus:"paid"===e.status?"paid":e.paymentStatus||e.settlement?.settlementStatus||"unpaid",tableId:e.table_id||t?.table_id||null,tableNumber:e.table_no||t?.table_no||t?.table_id||null,subtotal:O(a.subtotal,w(e,"subtotal"),i),vatAmount:R(a.tax??w(e,"tax"),0),vatPercentage:S(e,r),total:l,orderTotal:s,settledAmount:c,remainingAmount:d,settlementStatus:e.settlement?.settlementStatus||e.paymentStatus||"unpaid",settlement_status:e.settlement?.settlementStatus||e.paymentStatus||"unpaid",submittedItems:n,payment:e.payment||"qr_pay_later"}}var D=e.i(22459);function U(e,t){let r="number"==typeof e?e:0,a=t?.currency??"EUR",o=t?.locale??"en-IE";try{return new Intl.NumberFormat(o,{style:"currency",currency:a,minimumFractionDigits:2,maximumFractionDigits:2}).format(r)}catch{return`€${r.toFixed(2)}`}}function M({item:e,onSelect:t,onAdd:r}){return(0,o.jsxs)("article",{className:"rounded-3xl border border-[#ded3bd] bg-[#fffaf0] p-4 text-[#343529]",children:[(0,o.jsxs)("button",{type:"button",className:"text-left",onClick:()=>t?.(e),children:[(0,o.jsx)("h3",{className:"text-lg font-semibold",children:e?.name||"Menu item"}),(0,o.jsx)("p",{className:"mt-1 text-sm text-[#716f5e]",children:e?.description||e?.category||"Freshly prepared."})]}),(0,o.jsxs)("div",{className:"mt-4 flex items-center justify-between",children:[(0,o.jsx)("strong",{children:U(Number(e?.price||0))}),(0,o.jsx)("button",{type:"button",className:"rounded-full bg-[#b88940] px-4 py-2 text-sm font-bold text-white",onClick:r,children:"Add"})]})]})}let F=(0,n.createContext)(null);function V({actions:e,children:t}){return(0,o.jsx)(F.Provider,{value:e,children:t})}function K(e){return String(e?.id??e?.menu_id??e?.menuId??"")}function q(e){return String(e?.name??e?.menu_name??e?.title??"Menu item")}function H(e){let t=[],r=e=>{if(!e)return;if(Array.isArray(e))return void e.forEach(r);let a=(!e?"":"string"==typeof e?e:String(e?.url??e?.path??e?.image_path??e?.image??e?.src??e?.thumb??e?.thumbnail??"")).trim();a&&t.push(a)};return r(e?.image),r(e?.image_url),r(e?.imageUrl),r(e?.image_path),r(e?.imagePath),r(e?.thumb),r(e?.thumbnail),r(e?.primary_image),r(e?.primaryImage),r(e?.images),r(e?.gallery),r(e?.additional_images),r(e?.additionalImages),r(e?.media),Array.from(new Set(t))}function G(e){let t=e?.item??e,r=Number(e?.quantity??1);return{id:K(t),name:q(t),unitPrice:Number(t?.price||0),quantity:Number.isFinite(r)&&r>0?r:1,imageUrl:H(t)[0]||""}}function $(e){let t=String(e||"").trim().toLowerCase().replace(/[_\s-]+/g,"-");return["tabs","tab","tabbed","classic","normal","list","flat","category-tabs","categories-top","top-categories","category-tabs-full-item-list"].includes(t)?"tabs":["accordion","accordions","collapsed","expandable","category-accordion"].includes(t)?"accordion":""}function W({src:e,sourceItems:t,cartItems:r,totalItems:a,totalPrice:i,lastInteractedItem:s,categories:l,restaurantName:c,logoUrl:d,tableNumber:m,menuLayout:p="accordion",onAddItem:u,onOpenItem:h,onCheckout:f,onCallWaiter:y,onOpenNote:g,onOpenValet:b,onTableOrder:k,showTableOrder:v=!1,showValet:x=!0,tableOrderCount:z=0,children:C}){let w=(0,n.useRef)(""),[S,_]=(0,n.useState)($(p)||"accordion");return(0,n.useEffect)(()=>{let e=$(p);e&&_(e)},[p]),(0,n.useEffect)(()=>{let e=!1;return(async()=>{for(let t of[`/simple-theme?ts=${Date.now()}`])try{let r=await fetch(t,{credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}});if(!r.ok)continue;let a=await r.json(),o=function(e){let t=["kazen_menu_layout","kazenMenuLayout","menu_layout","menuLayout","food_display_style","foodDisplayStyle","category_display","categoryDisplay"];for(let r of[e,e?.data,e?.settings,e?.theme,e?.theme?.data,e?.theme?.settings,e?.frontend_theme,e?.frontendTheme,e?.attributes,e?.values])if(r&&"object"==typeof r)for(let e of t){let t=$(r?.[e]);if(t)return t}return""}(a);if(console.info("PMD_KAZEN_MENU_LAYOUT_VALUE",o||null,t),console.info("PMD_KAZEN_MENU_LAYOUT_FROM_API",{endpoint:t,nextLayout:o||null,hasKazenMenuLayout:!!(a?.kazen_menu_layout||a?.data?.kazen_menu_layout||a?.settings?.kazen_menu_layout||a?.theme?.settings?.kazen_menu_layout)}),o&&!e){_(o),window.__PMD_KAZEN_MENU_LAYOUT=o,window.dispatchEvent(new Event("PMD_KAZEN_FORCE_SYNC"));return}}catch{}})(),()=>{e=!0}},[]),(0,n.useEffect)(()=>{let e=!1,t=e=>{let t=String(e||"").trim();if(!t||"undefined"===t||"null"===t||t.startsWith("data:"))return"";if(/^https?:\/\//i.test(t))return t;let r=t.replace(/^\/+/,""),a=r.split("/").filter(Boolean).pop()||r;return r.startsWith("assets/media/uploads/")||r.startsWith("assets/media/attachments/")?`/${r}`:r.startsWith("uploads/")?`/assets/media/${r}`:r.startsWith("storage/")||r.includes("/")?`/${r}`:`/assets/media/uploads/${a}`},r=e=>{for(let r of[e?.site_logo_url,e?.logo_url,e?.site_logo,e?.logo,e?.restaurant_logo,e?.restaurantLogoUrl,e?.merchant_logo,e?.business_logo,e?.brand_logo,e?.data?.site_logo_url,e?.data?.logo_url,e?.data?.site_logo,e?.data?.logo,e?.data?.restaurant_logo,e?.data?.restaurantLogoUrl,e?.data?.merchant_logo,e?.data?.business_logo,e?.data?.brand_logo,e?.settings?.site_logo_url,e?.settings?.logo_url,e?.settings?.site_logo,e?.settings?.logo,e?.merchant?.site_logo_url,e?.merchant?.logo_url,e?.merchant?.site_logo,e?.merchant?.logo]){let e=t(r);if(e)return e}return""};return(async()=>{for(let t of[`/settings?ts=${Date.now()}`,`/api/v1/settings-wrapped?ts=${Date.now()}`,`/api/settings?ts=${Date.now()}`])try{let a=await fetch(t,{credentials:"omit",cache:"no-store",headers:{Accept:"application/json"}});if(!a.ok)continue;let o=await a.json(),n=r(o);if(n){w.current=n,window.__PMD_EFFECTIVE_LOGO_URL=n,window.__PMD_LOGO_URL=n,e||window.dispatchEvent(new Event("PMD_KAZEN_FORCE_SYNC"));return}}catch{}})(),()=>{e=!0}},[]),(0,n.useEffect)(()=>{let e=()=>{let e=document.getElementById("pmd-kazen-japanese-frame");if(!e?.contentWindow)return;let o=s?.item||r?.[r.length-1]?.item||null,n=String(c||window.__PMD_RESTAURANT_NAME||window.__PMD_BUSINESS_NAME||"Kazen"),p=e=>{let t=String(e||"").trim();if(!t||"undefined"===t||"null"===t||t.startsWith("data:"))return"";if(/^https?:\/\//i.test(t))return t;let r=t.replace(/^\/+/,""),a=r.split("/").filter(Boolean).pop()||r;return r.startsWith("assets/media/uploads/")||r.startsWith("assets/media/attachments/")?`/${r}`:r.startsWith("uploads/")?`/assets/media/${r}`:r.startsWith("storage/")||r.includes("/")?`/${r}`:`/assets/media/uploads/${a}`},u=String(p(d)||w.current||p(window.__PMD_EFFECTIVE_LOGO_URL)||p(window.__PMD_LOGO_URL)||""),h=e=>{let t=String(e||"").trim();return!t||/delivery/i.test(t)?"":t.match(/\d+/)?.[0]||""},f=window.location.pathname.match(/table[-/](\d+)/i)?.[1]||window.location.search.match(/table_id=(\d+)/i)?.[1]||"",y=h(m)||h(window.__PMD_DISPLAY_TABLE_NUMBER)||h(window.__PMD_TABLE_NUMBER)||f||null;e.contentWindow.postMessage({type:"PMD_KAZEN_SYNC",showTableOrder:!!v,showValet:!!x,tableOrderCount:Number(z||0),restaurantName:n,logoUrl:u,effectiveLogoUrl:u,tableNumber:y,displayTableNumber:y,menuLayout:S,kazen_menu_layout:S,categories:l,items:t.map(e=>({id:K(e),name:q(e),description:String(e?.description??e?.menu_description??""),price:Number(e?.price||0),category:String(e?.category||e?.category_name||"Menu"),image:H(e)[0]||"",images:H(e),gallery:Array.isArray(e?.gallery)?e.gallery:[],additional_images:Array.isArray(e?.additional_images)?e.additional_images:[],is_bestseller:!!e?.is_bestseller,is_recommended:!!(e?.is_recommended||e?.is_featured||e?.is_popular||e?.is_chef_recommended)})),cart:{count:a,total:i,lastItemName:o?q(o):"",lastItemPrice:o?Number(o?.price||0):0,lines:Array.isArray(r)?r.map(G):[]}},window.location.origin)},o=()=>e(),n=e=>{let r=String(e||"");return t.find(e=>K(e)===r)},p=t=>{if(t.origin!==window.location.origin)return;let r=t.data;if(!r||"object"!=typeof r)return;let a=String(r.type||"");if("PMD_KAZEN_READY"===a)return void e();if("PMD_KAZEN_ADD_ITEM"===a){let t=n(r.itemId);t&&u(t,Math.max(1,Number(r.quantity||1))),window.setTimeout(e,100);return}if("PMD_KAZEN_OPEN_ITEM"===a){let e=n(r.itemId);e&&h(e);return}if("PMD_KAZEN_CHECKOUT"===a)return void f();if("PMD_KAZEN_CALL_WAITER"===a)return void y();if("PMD_KAZEN_ADD_NOTE"===a)return void g(String(r.note||""));if("PMD_KAZEN_TABLE_ORDER"===a||"pmd:table-order"===a)return void k?.();if("PMD_KAZEN_GO_VALET"===a){if(!x)return;b(r.values||{});return}};e();let C=[window.setTimeout(e,250),window.setTimeout(e,900),window.setTimeout(e,1600)];return window.addEventListener("message",p),window.addEventListener("PMD_KAZEN_FORCE_SYNC",o),()=>{C.forEach(e=>window.clearTimeout(e)),window.removeEventListener("message",p),window.removeEventListener("PMD_KAZEN_FORCE_SYNC",o)}},[t,r,a,i,s,l,c,d,m,S,u,h,f,y,g,b,k,v,x,z]),(0,o.jsxs)("div",{"data-pmd-kazen-theme":"1",className:"pmd-customer-page page--menu relative min-h-screen w-full",style:{background:"#f7f3ec",color:"#1f1f1d"},children:[(0,o.jsx)("iframe",{id:"pmd-kazen-japanese-frame",title:"Kazen Japanese Minimal Menu",src:e,className:"block h-screen w-full border-0",style:{width:"100%",height:"100dvh",minHeight:"100vh",border:0,display:"block",background:"#f7f3ec"}}),C]})}var Y=e.i(27197),Q=e.i(216),X=e.i(35884);let Z=(0,X.default)("Clock3",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16.5 12",key:"1aq6pp"}]]);var J=e.i(17296);let ee=(0,X.default)("Earth",[["path",{d:"M21.54 15H17a2 2 0 0 0-2 2v4.54",key:"1djwo0"}],["path",{d:"M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",key:"1tzkfa"}],["path",{d:"M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05",key:"14pb5j"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]),et=(0,X.default)("Instagram",[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"5",ry:"5",key:"2e1cvw"}],["path",{d:"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",key:"9exkf1"}],["line",{x1:"17.5",x2:"17.51",y1:"6.5",y2:"6.5",key:"r4j83e"}]]),er=(0,X.default)("Link2",[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]]);var ea=e.i(76053);let eo=(0,X.default)("QrCode",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]),en=(0,X.default)("Star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]),ei=(0,X.default)("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]),es=new Set(["card","apple_pay","google_pay","wero","paypal","cod"]);function el(e){return String(e||"").trim().toLowerCase()||null}function ec(e,t){let r=el(t);return r&&(e||[]).find(e=>el(e.code)===r)||null}function ed(e){let t=el(e);return!!(t&&es.has(t))}let em=e=>{let t=Number(e??0);return U(Number.isFinite(t)?t:0)},ep=e=>Math.max(1,Number(e?.quantity||e?.qty||1)),eu=(e,t="Item")=>String(e?.__pmdDisplayName||e?.name||e?.item?.name||e?.menu_name||e?.item_name||t),eh=e=>{let t=Number(e?.__pmdDisplaySubtotal??e?.subtotal??e?.total??e?.amount);if(Number.isFinite(t)&&t>0)return t;let r=Number(e?.price??e?.unit_price??e?.item?.price??0);return Number.isFinite(r)?r*ep(e):0};function ef({variant:e="secondary",children:t,className:r="",type:a="button",...n}){let i="primary"===e?"primary":"secondary";return(0,o.jsx)("button",{...n,type:a,"data-kzco-button":i,className:["kzco-btn","kzco-btn-action",`kzco-btn-${i}`,r].filter(Boolean).join(" "),children:t})}function ey({variant:e="secondary",children:t,className:r="",type:a="button",...n}){let i="primary"===e?"primary":"secondary";return(0,o.jsx)("button",{...n,type:a,"data-kzco-button":i,className:["kzco-btn","kzco-btn-square",`kzco-btn-${i}`,r].filter(Boolean).join(" "),children:t})}function eg({title:e,eyebrow:t,onBack:r}){return(0,o.jsxs)("header",{className:"kzco-head",children:[(0,o.jsxs)("div",{className:"kzco-title-wrap",children:[t?(0,o.jsx)("span",{className:"kzco-eyebrow",children:t}):null,(0,o.jsx)("h2",{children:e})]}),(0,o.jsx)(ey,{"aria-label":"Close",onClick:r,className:"kzco-close",children:(0,o.jsxs)("svg",{width:"24",height:"24",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.9",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:[(0,o.jsx)("path",{d:"M18 6 6 18"}),(0,o.jsx)("path",{d:"m6 6 12 12"})]})})]})}function eb({children:e,columns:t=1}){return(0,o.jsx)("div",{className:`kzco-actions kzco-actions-${t}`,children:e})}function ek({children:e,className:t=""}){return(0,o.jsx)("section",{className:["kzco-card",t].filter(Boolean).join(" "),children:e})}function ev({label:e,value:t,strong:r=!1}){return(0,o.jsxs)("div",{className:r?"kzco-line kzco-line-strong":"kzco-line",children:[(0,o.jsx)("span",{children:e}),(0,o.jsx)("strong",{children:em(t)})]})}function ex({items:e}){let t=Array.isArray(e)?e:[];return 0===t.length?(0,o.jsx)("p",{className:"kzco-muted",children:"No items yet"}):(0,o.jsx)("div",{className:"kzco-list kzco-items-list","aria-label":"Order items",children:t.map((e,t)=>(0,o.jsxs)("div",{className:"kzco-cart-line",children:[(0,o.jsxs)("span",{children:[ep(e),"x ",eu(e,`Item ${t+1}`)]}),(0,o.jsx)("strong",{children:em(eh(e))})]},`${eu(e)}-${t}`))})}function ez({splitMethod:e,chooseSplitMethod:t}){let r=[["equal","Split equally"],["items",(0,o.jsxs)(o.Fragment,{children:["By order",(0,o.jsx)("br",{}),"items"]})],["shares","By shares"]];return(0,o.jsx)("div",{className:"kzco-tabs",role:"tablist","aria-label":"Split method",children:r.map(([r,a])=>(0,o.jsx)(ef,{variant:"secondary","data-kzco-active":e===r?"1":"0","aria-pressed":e===r,onClick:()=>t?.(r),className:"kzco-btn-segment",children:a},r))})}function eC({splitGuestCount:e=2,addSplitGuest:t,removeSplitGuest:r}){return(0,o.jsxs)("div",{className:"kzco-stepper","data-kzco-control":"people-stepper",children:[(0,o.jsx)(ey,{"aria-label":"Remove guest",disabled:e<=2,onClick:r,className:"kzco-stepper-btn",children:(0,o.jsx)("span",{"aria-hidden":"true",children:"−"})}),(0,o.jsx)("strong",{"aria-label":`${e} people`,children:e}),(0,o.jsx)(ey,{variant:"primary","aria-label":"Add guest",disabled:e>=10,onClick:t,className:"kzco-stepper-btn",children:(0,o.jsx)("span",{"aria-hidden":"true",children:"＋"})})]})}function ew({guests:e=[]}){return Array.isArray(e)&&0!==e.length?(0,o.jsx)("div",{className:"kzco-chip-row",children:e.map((e,t)=>(0,o.jsxs)("span",{className:"kzco-chip",children:[(0,o.jsx)("b",{children:e.avatar||e.name?.slice(0,1)||t+1}),e.name]},`${e.name}-${t}`))}):null}function eS({code:e,label:t}){let r=String(e||"").toLowerCase(),a=String(t||e||"Payment").replace(/[_-]+/g," ");return"card"===r||"stripe"===r||"credit_card"===r?(0,o.jsxs)("span",{className:"kzco-paymark kzco-paymark-card","aria-hidden":"true",children:[(0,o.jsxs)("svg",{viewBox:"0 0 24 24",role:"img",focusable:"false",children:[(0,o.jsx)("rect",{x:"3.5",y:"5.5",width:"17",height:"13",rx:"1.5"}),(0,o.jsx)("path",{d:"M3.5 9h17"}),(0,o.jsx)("path",{d:"M7 15h4.2"})]}),(0,o.jsx)("span",{className:"kzco-paymark-label",children:"Card"})]}):"apple_pay"===r||"applepay"===r?(0,o.jsxs)("span",{className:"kzco-paymark kzco-paymark-apple","aria-hidden":"true",children:[(0,o.jsx)("span",{className:"kzco-paymark-symbol",children:""}),(0,o.jsx)("span",{className:"kzco-paymark-label",children:"Pay"})]}):"google_pay"===r||"googlepay"===r||"gpay"===r?(0,o.jsxs)("span",{className:"kzco-paymark kzco-paymark-google","aria-hidden":"true",children:[(0,o.jsx)("span",{className:"kzco-paymark-g",children:"G"}),(0,o.jsx)("span",{className:"kzco-paymark-label",children:"Pay"})]}):"wero"===r?(0,o.jsx)("span",{className:"kzco-paymark kzco-paymark-wero","aria-hidden":"true",children:(0,o.jsx)("span",{className:"kzco-paymark-label",children:"wero"})}):"paypal"===r||"pay_pal"===r?(0,o.jsxs)("span",{className:"kzco-paymark kzco-paymark-paypal","aria-hidden":"true",children:[(0,o.jsx)("span",{className:"kzco-paymark-p",children:"P"}),(0,o.jsx)("span",{className:"kzco-paymark-label",children:"PayPal"})]}):"cod"===r||"cash"===r||"cash_on_delivery"===r?(0,o.jsx)("span",{className:"kzco-paymark kzco-paymark-cash","aria-hidden":"true",children:(0,o.jsxs)("svg",{viewBox:"0 0 24 24",role:"img",focusable:"false",children:[(0,o.jsx)("path",{d:"M4 8.5h16v9H4z"}),(0,o.jsx)("circle",{cx:"12",cy:"13",r:"2.2"}),(0,o.jsx)("path",{d:"M7 13h1.2M15.8 13H17"}),(0,o.jsx)("path",{d:"M6.5 6.5h15v8"})]})}):(0,o.jsx)("span",{className:"kzco-paymark kzco-paymark-text","aria-hidden":"true",children:(0,o.jsx)("span",{className:"kzco-paymark-label",children:a})})}function e_({loadingPayments:e,visiblePaymentMethods:t,selectedPaymentMethod:r,onPaymentMethodSelect:a,canShowPaymentMethods:n=!0,onBackToReview:i}){let s=Array.isArray(t)?t:[];return(0,o.jsxs)("section",{className:"kzco-section kzco-payment-methods",children:[(0,o.jsx)("h3",{className:"kzco-section-title",children:"Payment Methods"}),e?(0,o.jsx)("p",{className:"kzco-muted",children:"Loading payment methods..."}):0===s.length?(0,o.jsx)("p",{className:"kzco-muted",children:"No payment methods available"}):(0,o.jsxs)(o.Fragment,{children:[!n&&(0,o.jsxs)("div",{className:"kzco-payment-blocked-clean",children:[(0,o.jsx)("strong",{children:"Send to kitchen first"}),(0,o.jsx)("p",{children:"Your selected items are still only in the table draft. Please confirm and send the table order to the kitchen first. Payment starts after the backend creates a real order ID."}),(0,o.jsx)("button",{type:"button","data-kzco-button":"secondary",className:"kzco-btn kzco-btn-action kzco-btn-secondary",onClick:()=>i?.(),children:"Back to table order"})]}),(0,o.jsx)("div",{className:"kzco-method-grid",children:s.map(e=>{let t=String(e.code||""),n=r===e.code;return(0,o.jsx)("button",{type:"button","aria-label":e.name||t,"aria-pressed":n,"data-kzco-active":n?"1":"0",className:"kzco-btn kzco-btn-tile kzco-btn-secondary kzco-method-tile",onClick:()=>a?.(t),children:(0,o.jsx)(eS,{code:t,label:e.name||t})},t)})})]})]})}function eE(e){let t=e.target;t&&"INPUT"===t.tagName&&"number"===t.type&&"0"===t.value&&t.select()}function eN(e){let t=e.target;if(!t||"INPUT"!==t.tagName||"number"!==t.type)return;let r=function(e){let t=String(e??"").trim();if(""===t)return"";if("."===t)return"0.";if(t.startsWith("."))return`0${t}`;let r=t.replace(/^0+(?=\d)/,"");return""===r?"0":r}(t.value);r!==t.value&&(t.value=r)}function eI(e,t){return(Math.max(0,Number(e||0))*Math.max(0,Number(t||0))/100).toFixed(2)}function eT(e){var t;let r,{checkoutStep:a,onClose:i,hasPersonalItems:s,personalItems:l=[],tableDraft:c,tableDraftItems:d=[],tableDraftTotal:m=0,submittedSnapshot:p,submittedItems:u=[],estimatedMinutes:h=15,subtotal:f=0,finalTotal:y=0,paymentBaseAmount:g=0,paymentSubtotalAmount:b=0,paymentVatAmount:k=0,paymentVatPercentage:v=0,paymentPayableTotal:x=0,paymentTipAmount:z=0,paymentCouponDiscount:C=0,paidTipAmount:w=0,paidCouponDiscount:S=0,paidAmountTotal:_=0,submittedBaseTotal:E=0,paymentTipPercentage:N,paymentCustomTip:I,tipPercentages:T=[5,10],tipEnabled:A,couponCode:j,setCouponCode:P,appliedCoupon:B,couponError:R,couponLoading:O,setCouponError:L,setCouponLoading:D,validateCoupon:U,onApplyCoupon:M,onRemoveCoupon:F,removeCoupon:V,visiblePaymentMethods:K=[],loadingPayments:q,selectedPaymentMethod:H,onPaymentMethodSelect:G,renderPaymentForm:$,renderPaymentButton:W,handleConfirmMyItems:X,handleSubmitTableDraft:es,setCheckoutStep:el,startSplitFlow:ec,chooseSplitMethod:ep,goToSplitReview:ey,canConfirmSplitMethod:eS=!0,splitGuestCount:eT=2,addSplitGuest:eA,removeSplitGuest:ej,splitMethod:eP="equal",splitGuestProfiles:eB=[],equalSplitPeople:eR=[],activeSplitPeople:eO=[],selectedSplitPersonId:eL,setSelectedSplitPersonId:eD,selectedSplitPerson:eU,splitSourceItems:eM=[],itemAssignments:eF={},setItemAssignments:eV,sharePercents:eK=[],setSharePercents:eq,sharePercentTotal:eH=0,splitGrandTotal:eG=0,updatePaymentTipPercentage:e$,updatePaymentCustomTip:eW,onPaymentLinks:eY,onQrShare:eQ,reviewRating:eX=0,setReviewRating:eZ,reviewComment:eJ="",setReviewComment:e0,reviewSubmitStatus:e1="idle",setReviewSubmitStatus:e2,reviewSubmitMessage:e5,canSubmitReview:e3=!1,handleSubmitReview:e4,merchantSettings:e8,activeReviewSharePlatforms:e6=[],handleDownloadBusinessInvoice:e9,invoiceDownloadStatus:e7,invoiceDownloadMessage:te,isDarkTheme:tt}=e,tr=(t=!!tt,n.default.useMemo(()=>{if(t)return"dark";let e=e=>"dark"===String(e||"").toLowerCase();try{let t=new URLSearchParams(window.location.search);if(e(t.get("mode")))return"dark"}catch{}try{if(e(window.localStorage.getItem("pmd-kazen-japanese-mode")))return"dark"}catch{}try{if(e(document.documentElement.getAttribute("data-pmd-kazen-mode"))||e(document.body?.getAttribute("data-pmd-kazen-mode"))||document.documentElement.classList.contains("dark")||document.body?.classList.contains("dark"))return"dark"}catch{}try{for(let t of Array.from(document.querySelectorAll("iframe")))try{let r=t.contentDocument,a=t.contentWindow?.location?.href||"";if(!r||!(a.includes("/themes/kazen-japanese")||r.querySelector(".kazen-page, .kazen-shell")))continue;if(e(r.documentElement.getAttribute("data-pmd-kazen-mode"))||e(r.body?.getAttribute("data-pmd-kazen-mode"))||r.documentElement.classList.contains("dark")||r.body?.classList.contains("dark"))return"dark"}catch{}}catch{}return"light"},[t])),ta=(...e)=>{for(let t of e)if(Array.isArray(t)&&t.length>0)return t;return[]},to=Number(p?.remainingAmount??p?.orderTotal??p?.total??m??y??0),tn=Math.max(0,Number(E||p?.submittedBaseTotal||p?.baseTotal||p?.itemTotal||to||y||0)),ti=Math.max(0,Number(w||p?.paidTipAmount||0)),ts=Math.max(0,Number(S||p?.paidCouponDiscount||0)),tl=Math.max(0,Number(_||p?.paidTotal||p?.paid_total||x||Math.max(0,tn+ti-ts))),tc=Math.max(0,Number(k||p?.paidVatAmount||p?.vatAmount||0)),td="success"===e1,tm=ta(u,p?.submittedItems,p?.items,p?.orderItems,d,l),tp=ta(eM,tm,d,l),tu=Array.isArray(eB)?eB:[],th=Array.isArray(eR)?eR:[],tf=Array.isArray(eO)?eO:[],ty=eU?`${eU.name}'s share`:"Order total",tg=(...e)=>{for(let t of e){let e=Number(t);if(Number.isFinite(e)&&e>0)return e}return 0},tb=tg(eU?.total,g,x,to,m,y,p?.remainingAmount,p?.orderTotal,p?.total),tk=tg(x,Math.max(0,tb+Number(z||0)-Number(C||0)),tb),tv=tb>0?Math.max(0,Number(v||19)):0,tx=Number(k||0)>0?Number(k||0):tv>0&&tb>0?tb*tv/(100+tv):0,tz=Number(b||0)>0?Number(b||0):tx>0?Math.max(0,tb-tx):tb,tC=p?.order_id||p?.orderId||p?.id||null,tw=!!tC,[tS,t_]=n.default.useState(!1);n.default.useEffect(()=>{if("submitted"!==a)return void t_(!1);t_(!1);let e=window.setTimeout(()=>{t_(!0)},650);return()=>window.clearTimeout(e)},[a,h,tC]);let tE=async()=>{let e=String(j||"").trim().toUpperCase();if(console.info("PMD_KAZEN_COUPON_APPLY_CLICK",{code:e,paymentBaseAmount:g,pmdKazenPaymentGross:tb,pmdKazenPayableTotal:tk,hasValidateCoupon:"function"==typeof U,hasOnApplyCoupon:"function"==typeof M,selectedSplitPersonId:eL||null}),e){if(eU)return void L?.("Coupon validation for split payments is coming soon.");if("function"==typeof U){D?.(!0),L?.(null);try{let t=Number(g||tb||tk||to||y||0),r=await U(e,t);if(console.info("PMD_KAZEN_COUPON_RESULT",r),!r?.success)return void L?.(r?.message||"Invalid coupon code.");P?.("")}catch(e){console.error("PMD_KAZEN_COUPON_ERROR",e),L?.("Coupon validation failed.")}finally{D?.(!1)}return}if("function"==typeof M)return void await M();L?.("Coupon validation is unavailable.")}},tN="Checkout",tI=null;if("review"===a&&s)tN="My order",tI=(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(ex,{items:l}),(0,o.jsx)("div",{className:"kzco-total-box kzco-final-total",children:(0,o.jsx)(ev,{label:"Total",value:y,strong:!0})}),(0,o.jsxs)(eb,{columns:2,children:[(0,o.jsx)(ef,{variant:"secondary",onClick:i,children:"Continue ordering"}),(0,o.jsx)(ef,{variant:"primary",onClick:X,children:"Confirm"})]})]});else if("review"===a&&c)tN="Table order",tI=(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(ex,{items:d}),(0,o.jsx)("div",{className:"kzco-total-box kzco-final-total",children:(0,o.jsx)(ev,{label:"Order total",value:m,strong:!0})}),(0,o.jsxs)(eb,{columns:2,children:[(0,o.jsx)(ef,{variant:"secondary",onClick:i,children:"Continue ordering"}),(0,o.jsx)(ef,{variant:"primary",onClick:es,children:"Send to kitchen"})]})]});else if("submitted"===a)tN="We received your order.",r=void 0,tI=(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)("div",{className:"kzco-status-copy kzco-status-copy-hero","aria-live":"polite",children:(0,o.jsx)("span",{className:"kzco-status-pulse","data-kzco-show-time":tS?"1":"0","aria-label":tS?`Estimated preparation time ${h} minutes`:"Order confirmed",children:tS?(0,o.jsxs)("em",{className:"kzco-status-time",children:[(0,o.jsx)(Z,{className:"kzco-status-clock h-4 w-4","aria-hidden":"true"}),(0,o.jsx)("strong",{children:h}),(0,o.jsx)("span",{children:"min"})]},"prep-time"):(0,o.jsx)(Q.Check,{className:"kzco-status-check h-5 w-5","aria-hidden":"true"},"check")})}),(0,o.jsxs)("section",{className:"kzco-summary",children:[(0,o.jsx)("h3",{className:"kzco-section-title",children:"Order Summary"}),(0,o.jsx)(ex,{items:tm})]}),(0,o.jsx)("div",{className:"kzco-total-box kzco-final-total",children:(0,o.jsx)(ev,{label:"Order total",value:to,strong:!0})}),(0,o.jsxs)(eb,{children:[(0,o.jsx)(ef,{variant:"primary",onClick:()=>el?.("payment"),children:"Pay in full"}),(0,o.jsxs)(ef,{variant:"secondary",onClick:()=>ec?.("equal"),children:[(0,o.jsx)(ei,{className:"h-4 w-4"})," Split bill"]}),(0,o.jsx)(ef,{variant:"secondary",onClick:i,children:"Continue ordering"})]})]});else if("paid"===a){tN="Payment confirmed.",r=void 0;let e=Number(p?.orderId??p?.order_id??p?.id??0),t=Number(h||0)>0&&(p?.showCustomerEta??!0)!==!1;tI=(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)("div",{className:"kzco-paid-time-wrap","aria-label":t?`Estimated preparation time ${h} minutes`:"Paid",children:t?(0,o.jsxs)("em",{className:"kzco-status-time kzco-paid-time",children:[(0,o.jsx)(Z,{className:"kzco-status-clock h-4 w-4","aria-hidden":"true"}),(0,o.jsx)("strong",{children:h}),(0,o.jsx)("span",{children:"min"})]}):(0,o.jsxs)("em",{className:"kzco-status-time kzco-paid-time",children:[(0,o.jsx)(Q.Check,{className:"kzco-status-clock h-4 w-4","aria-hidden":"true"}),(0,o.jsx)("strong",{children:"Paid"})]})}),(0,o.jsxs)("section",{className:"kzco-summary kzco-paid-summary",children:[(0,o.jsx)("h3",{className:"kzco-section-title",children:"Order Summary"}),(0,o.jsx)(ex,{items:tm})]}),(0,o.jsxs)("div",{className:"kzco-total-box kzco-paid-total-box kzco-final-total",children:[e>0?(0,o.jsxs)("div",{className:"kzco-line",children:[(0,o.jsx)("span",{children:"Order number"}),(0,o.jsxs)("strong",{children:["#",e]})]}):null,(0,o.jsx)(ev,{label:"Items subtotal (incl. VAT)",value:tn}),tc>0?(0,o.jsx)(ev,{label:"Included VAT",value:tc}):null,ti>0?(0,o.jsx)(ev,{label:"Tip",value:ti}):null,ts>0?(0,o.jsxs)("div",{className:"kzco-line kzco-discount",children:[(0,o.jsx)("span",{children:"Coupon"}),(0,o.jsxs)("strong",{children:["-",em(ts)]})]}):null,(0,o.jsx)(ev,{label:"Amount paid",value:tl,strong:!0})]}),(0,o.jsxs)("section",{className:"kzco-card kzco-review-card","aria-label":"Visit feedback",children:[(0,o.jsxs)("div",{className:"kzco-review-head",children:[(0,o.jsx)("span",{children:(0,o.jsx)(ea.MessageSquare,{className:"h-4 w-4"})}),(0,o.jsxs)("div",{children:[(0,o.jsx)("h3",{children:"How was your visit?"}),(0,o.jsx)("p",{children:"A quick note helps the restaurant improve."})]})]}),(0,o.jsx)("div",{className:"kzco-stars","aria-label":"Restaurant rating",children:[1,2,3,4,5].map(e=>{let t=Number(eX||0)>=e;return(0,o.jsx)("button",{type:"button","aria-label":`${e} star${e>1?"s":""}`,"data-kzco-active":t?"1":"0",disabled:td,onClick:()=>{td||(eZ?.(e),"loading"!==e1&&e2?.("idle"))},children:(0,o.jsx)(en,{className:"h-5 w-5"})},e)})}),(0,o.jsx)("textarea",{value:String(eJ||""),disabled:td,readOnly:td,onChange:e=>{td||(e0?.(e.target.value),"loading"!==e1&&e2?.("idle"))},placeholder:"Optional comment for the restaurant",className:"kzco-field kzco-review-textarea"}),(0,o.jsx)(ef,{variant:"primary",disabled:!e3||"loading"===e1||"success"===e1,onClick:e4,className:"kzco-review-submit",children:"loading"===e1?"Submitting":"success"===e1?"Review submitted":"Submit feedback"}),e5?(0,o.jsx)("p",{className:"error"===e1?"kzco-review-message kzco-review-error":"kzco-review-message",children:e5}):null,"success"===e1&&e8?.reviewSocial?.sharePromptEnabled&&Array.isArray(e6)&&e6.length>0?(0,o.jsxs)("div",{className:"kzco-review-share",children:[(0,o.jsx)("p",{children:"Share publicly?"}),(0,o.jsx)("div",{children:e6.map(({id:e,label:t,icon:r})=>{let a=String(e||"").toLowerCase(),n="instagram"===a?et:"website"===a?ee:"reviews"===a?ea.MessageSquare:"trustpilot"===a||"google"===a?en:r||er;return(0,o.jsxs)("a",{href:e8.reviewSocial.platforms[e].url,target:"_blank",rel:"noopener noreferrer","aria-label":t,title:t,children:[(0,o.jsx)(n,{className:"h-4 w-4"}),(0,o.jsx)("span",{children:t})]},e)})})]}):null]}),(0,o.jsxs)("div",{className:"kzco-powered-by","aria-label":"Powered by PayMyDine",children:[(0,o.jsx)("span",{children:"Powered by"}),(0,o.jsx)("img",{src:"/assets/media/uploads/Paymydinelogo.png",alt:"PayMyDine",loading:"lazy"})]}),(0,o.jsx)(eb,{children:(0,o.jsx)(ef,{variant:"secondary",onClick:i,children:"Back to menu"})})]})}else"payment"===a?(tN="Payment",r="Ready to pay",tI=(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(ek,{className:"kzco-payment-hero",children:(0,o.jsxs)("div",{className:"kzco-payment-intro",children:[(0,o.jsx)("span",{children:(0,o.jsx)(J.CreditCard,{className:"h-5 w-5"})}),(0,o.jsxs)("div",{children:[(0,o.jsx)("strong",{children:ty}),(0,o.jsx)("p",{children:em(x)})]})]})}),(0,o.jsxs)(ek,{children:[(0,o.jsx)(ev,{label:eU?"Share amount":"Items total",value:tz}),tx>0&&(0,o.jsx)(ev,{label:tv>0?`VAT included (${tv.toFixed(0)}%)`:"VAT included",value:tx}),z>0&&(0,o.jsx)(ev,{label:"Tip",value:z}),C>0&&(0,o.jsxs)("div",{className:"kzco-line kzco-discount",children:[(0,o.jsx)("span",{children:"Coupon"}),(0,o.jsxs)("strong",{children:["-",em(C)]})]}),(0,o.jsx)(ev,{label:"Payable total",value:tk,strong:!0})]}),A&&(0,o.jsxs)("section",{className:"kzco-section",children:[(0,o.jsx)("h3",{className:"kzco-section-title",children:"Add tip"}),(0,o.jsxs)("div",{className:"kzco-tip-grid",children:[Array.from(new Set([0,5,10,...Array.isArray(T)?T:[]].map(e=>Number(e||0)))).filter(e=>Number.isFinite(e)&&e>=0).sort((e,t)=>e-t).map(e=>{let t=Number(eI(tb,e)),r=Number(I||0),a=Number.isFinite(r)&&Math.abs(r)>.005?.005>Math.abs(r-t):Number(N||0)===e;return(0,o.jsxs)(ef,{variant:"secondary","data-kzco-active":a?"1":"0",onClick:()=>{let t=eI(tb,e);console.info("PMD_KAZEN_TIP_PRESET_CLICK",{percentage:e,baseAmount:tb,tipAmount:t}),e$?.(e),eW?.(t)},className:"kzco-tip-preset",children:[e,"%"]},e)}),(0,o.jsxs)("div",{className:"kzco-tip-custom-wrap",children:[(0,o.jsx)("span",{"aria-hidden":"true",children:"€"}),(0,o.jsx)("input",{type:"text",inputMode:"decimal",value:I??"","data-pmd-kazen-tip-custom-input-v36":"1",onChange:e=>{let t,r;e$?.(void 0),eW?.(-1===(r=(t=String(e.target.value||"").replace(",",".").replace(/[^0-9.]/g,"")).indexOf("."))?t:t.slice(0,r+1)+t.slice(r+1).replace(/\./g,""))},placeholder:"Custom",className:"kzco-field","aria-label":"Custom tip amount in euro"})]})]})]}),(0,o.jsxs)("section",{className:"kzco-section",children:[!B||eU?(0,o.jsxs)("div",{className:"kzco-coupon-row",children:[(0,o.jsx)("input",{type:"text",value:j||"",onChange:e=>P?.(e.target.value.toUpperCase()),placeholder:"Coupon code",disabled:O,className:"kzco-field"}),(0,o.jsx)(ef,{variant:"secondary",disabled:O||!String(j||"").trim(),onClick:e=>{e.preventDefault(),e.stopPropagation(),tE()},className:"kzco-apply",children:O?"Checking":"Apply"})]}):(0,o.jsxs)("div",{className:"kzco-applied-coupon",children:[(0,o.jsxs)("span",{children:[B.name||"Coupon"," ",B.code?`(${B.code})`:""]}),(0,o.jsx)(ef,{variant:"secondary",onClick:e=>{e.preventDefault(),e.stopPropagation(),console.info("PMD_KAZEN_COUPON_REMOVE_CLICK",{hasRemoveCoupon:"function"==typeof V,hasOnRemoveCoupon:"function"==typeof F,appliedCouponCode:B?.code||null});try{"function"==typeof V?V():"function"==typeof F&&F()}finally{P?.(""),L?.(null),D?.(!1)}},children:"Remove"})]}),R&&(0,o.jsx)("p",{className:"kzco-error",children:R})]}),(0,o.jsx)(e_,{loadingPayments:q,visiblePaymentMethods:K,selectedPaymentMethod:H,onPaymentMethodSelect:G,canShowPaymentMethods:tw,onBackToReview:()=>el?.("review")}),ed(H)&&(0,o.jsx)("section",{className:"kzco-section kzco-payment-detail",children:$?.()}),(0,o.jsx)("div",{className:"kzco-payment-action",children:W?.()})]})):"split"===a||"split-items"===a||"split-shares"===a?(tN="",r=`Share ${em(eG)}`,tI=(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(ez,{splitMethod:eP,chooseSplitMethod:ep}),(0,o.jsxs)("div",{className:"kzco-people-inline","data-kzco-people-inline":"1",children:[(0,o.jsx)(eC,{splitGuestCount:eT,addSplitGuest:eA,removeSplitGuest:ej}),(0,o.jsx)(ew,{guests:tu})]}),"equal"===eP&&(0,o.jsx)("div",{className:"kzco-list",children:th.map((e,t)=>(0,o.jsxs)("div",{className:"kzco-cart-line",children:[(0,o.jsx)("span",{children:e.name}),(0,o.jsx)("strong",{children:em(e.total)})]},e.id||t))}),"items"===eP&&(0,o.jsxs)(ek,{children:[(0,o.jsx)("p",{className:"kzco-muted",children:"Tap an item to assign it to guests."}),(0,o.jsx)("div",{className:"kzco-list",children:(tp||[]).map((e,t)=>{let r=String(e?.key??e?.id??`${eu(e)}-${t}`),a=eF?.[r],n=null==a?"Unassigned":tu[a]?.name||`Guest ${Number(a)+1}`;return(0,o.jsxs)("button",{type:"button",className:"kzco-btn kzco-btn-list kzco-btn-secondary kzco-assign-row",onClick:()=>eV?.(e=>{let t=e?.[r],a=null==t?0:t>=eT-1?null:Number(t)+1;return{...e||{},[r]:a}}),children:[(0,o.jsx)("span",{children:eu(e)}),(0,o.jsx)("strong",{children:em(eh(e))}),(0,o.jsx)("em",{children:n})]},r)})})]}),"shares"===eP&&(0,o.jsxs)(ek,{children:[(0,o.jsx)("div",{className:100===eH?"kzco-share-total":"kzco-share-total kzco-share-total-bad",children:100===eH?"100% ready":eH<100?`${100-eH}% remaining`:`Over by ${eH-100}%`}),(0,o.jsx)("div",{className:"kzco-list",children:(eK||[]).slice(0,eT).map((e,t)=>(0,o.jsxs)("div",{className:"kzco-share-row",children:[(0,o.jsx)("span",{children:tu[t]?.name||`Guest ${t+1}`}),(0,o.jsx)("input",{type:"number",min:0,max:100,step:1,value:Math.round(Number(e||0)),onChange:e=>{let r=Math.max(0,Math.min(100,Number(e.target.value||0)));eq?.(e=>(e||[]).map((e,a)=>a===t?r:e))},className:"kzco-field kzco-share-input"}),(0,o.jsx)("strong",{children:"%"})]},t))})]}),(0,o.jsx)(ef,{variant:"primary",disabled:!eS,onClick:ey,children:"Review split"})]})):"split-review"===a&&(tN="Review split",r="Choose payer",tI=(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)("div",{className:"kzco-list",children:tf.map(e=>{let t=eL===e.id;return(0,o.jsxs)(ek,{className:t?"kzco-person-selected":"",children:[(0,o.jsxs)("div",{className:"kzco-person-head",children:[(0,o.jsxs)("span",{children:[(0,o.jsx)("b",{children:e.avatar||e.name?.slice(0,1)}),e.name]}),(0,o.jsx)("em",{children:e.status||"Pending"})]}),(0,o.jsx)(ev,{label:"Total",value:Number(e.total||0),strong:!0}),t?(0,o.jsx)(ef,{variant:"primary",onClick:()=>el?.("payment"),children:"Pay my share"}):(0,o.jsx)(ef,{variant:"secondary",onClick:()=>eD?.(e.id),children:"Select payer"})]},e.id)})}),(0,o.jsxs)(eb,{columns:2,children:[(0,o.jsxs)(ef,{variant:"secondary",onClick:eY,children:[(0,o.jsx)(er,{className:"h-4 w-4"})," Link"]}),(0,o.jsxs)(ef,{variant:"secondary",onClick:eQ,children:[(0,o.jsx)(eo,{className:"h-4 w-4"})," QR"]})]})]}));return(0,o.jsxs)("div",{"data-kzco-root":"1",onFocusCapture:eE,onInputCapture:eN,"data-kzco-step":a,"data-kzco-can-pay":tw?"1":"0","data-kzco-mode":tr,"data-pmd-checkout-theme":"kazen_japanese",role:"dialog","aria-modal":"true",className:"jsx-20474dde3d810de2 kzco-overlay",children:[(0,o.jsx)("div",{"data-kzco-panel":"1",className:"jsx-20474dde3d810de2 kzco-panel",children:(0,o.jsxs)("div",{className:"jsx-20474dde3d810de2 kzco-content",children:[(0,o.jsx)(eg,{title:tN,eyebrow:r,onBack:()=>{"payment"===a?el?.(eU?"split-review":"submitted"):"split-review"===a||"split-items"===a||"split-shares"===a?el?.("split"):"split"===a?el?.("submitted"):i?.()}}),(0,o.jsx)("main",{"data-kzco-step":a,className:"jsx-20474dde3d810de2 kzco-body",children:tI},a)]})}),(0,o.jsx)("style",{children:`
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

      `}),(0,o.jsx)(Y.default,{id:"b65c8d856d6b206f",children:'html body .pmd-kazen-checkout-waiter,html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese]{--kz-primary-bg:#b85d59;--kz-primary-bg-hover:#c86460;--kz-primary-text:#fffaf3;--kz-primary-border:#8f37338f;--kz-secondary-bg:#ffffff6b;--kz-secondary-bg-hover:#ffffff9e;--kz-secondary-text:#242320;--kz-secondary-border:#24232038;--kz-close-bg:#ffffff6b;--kz-close-text:#242320;--kz-close-border:#24232038;--kz-disabled-bg:#b85d5929;--kz-disabled-text:#b85d59c7;--kz-disabled-border:#b85d596b}html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode=dark],html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese][data-pmd-kazen-checkout-mode=dark]{--kz-primary-bg:#b85d59;--kz-primary-bg-hover:#c86460;--kz-primary-text:#fffaf3;--kz-primary-border:#df685db8;--kz-secondary-bg:#080604e0;--kz-secondary-bg-hover:#f6e8c814;--kz-secondary-text:#f6e8c8;--kz-secondary-border:#c6a45d5c;--kz-close-bg:#f6e8c80e;--kz-close-text:#f6e8c8;--kz-close-border:#c6a45d4d;--kz-disabled-bg:#b85d5947;--kz-disabled-text:#fffaf3ad;--kz-disabled-border:#df685d57}html body .pmd-kazen-checkout-waiter button,html body .pmd-kazen-checkout-waiter [role=button],html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese] button,html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese] [role=button]{box-shadow:none!important;text-shadow:none!important;outline-offset:3px!important;letter-spacing:.12em!important;text-transform:uppercase!important;appearance:none!important;border-radius:0!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif!important;font-weight:850!important;transition:background-color .18s,border-color .18s,color .18s,transform .18s!important}html body .pmd-kazen-checkout-waiter button:focus,html body .pmd-kazen-checkout-waiter button:focus-visible{outline:2px solid #b85d596b!important}html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close,html body .pmd-kazen-checkout-waiter .kazen-solid-close,html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean{background:var(--kz-close-bg)!important;width:48px!important;min-width:48px!important;height:48px!important;min-height:48px!important;color:var(--kz-close-text)!important;-webkit-text-fill-color:var(--kz-close-text)!important;border:1px solid var(--kz-close-border)!important;justify-content:center!important;align-items:center!important;padding:0!important;display:inline-flex!important}html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close svg,html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close svg *,html body .pmd-kazen-checkout-waiter .kazen-solid-close svg,html body .pmd-kazen-checkout-waiter .kazen-solid-close svg *{color:var(--kz-close-text)!important;stroke:currentColor!important;fill:none!important}html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=primary],html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-primary,html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-action-primary-clean,html body .pmd-kazen-checkout-waiter .pmd-themed-button[data-pmd-themed-button=primary],html body .pmd-kazen-checkout-waiter [data-pmd-stripe-native-button="1"],html body .pmd-kazen-checkout-waiter button[type=submit]{background:var(--kz-primary-bg)!important;background-color:var(--kz-primary-bg)!important;min-height:48px!important;color:var(--kz-primary-text)!important;-webkit-text-fill-color:var(--kz-primary-text)!important;border:1px solid var(--kz-primary-border)!important;justify-content:center!important;align-items:center!important;gap:.55rem!important;padding:.82rem 1rem!important;display:inline-flex!important}html body .pmd-kazen-checkout-waiter button:has(.lucide-lock){background:var(--kz-primary-bg)!important;background-color:var(--kz-primary-bg)!important;min-height:48px!important;color:var(--kz-primary-text)!important;-webkit-text-fill-color:var(--kz-primary-text)!important;border:1px solid var(--kz-primary-border)!important;justify-content:center!important;align-items:center!important;gap:.55rem!important;padding:.82rem 1rem!important;display:inline-flex!important}html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=primary]:not(:disabled):not([aria-disabled=true]):hover,html body .pmd-kazen-checkout-waiter .pmd-themed-button[data-pmd-themed-button=primary]:not(:disabled):hover,html body .pmd-kazen-checkout-waiter [data-pmd-stripe-native-button="1"]:not(:disabled):hover{background:var(--kz-primary-bg-hover)!important;background-color:var(--kz-primary-bg-hover)!important;transform:translateY(-1px)!important}html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=secondary],html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-secondary,html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-action-secondary-clean,html body .pmd-kazen-checkout-waiter .kazen-secondary,html body .pmd-kazen-checkout-waiter .pmd-kazen-tab,html body .pmd-kazen-checkout-waiter .pmd-kazen-tab-active,html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary,html body .pmd-kazen-checkout-waiter .pmd-kazen-split-stepper-btn,html body .pmd-kazen-checkout-waiter .pmd-kazen-assign-row,html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile,html body .pmd-kazen-checkout-waiter .pmd-kazen-method,html body .pmd-kazen-checkout-waiter .pmd-kazen-apply{background:var(--kz-secondary-bg)!important;background-color:var(--kz-secondary-bg)!important;min-height:48px!important;color:var(--kz-secondary-text)!important;-webkit-text-fill-color:var(--kz-secondary-text)!important;border:1px solid var(--kz-secondary-border)!important;justify-content:center!important;align-items:center!important;gap:.55rem!important;padding:.82rem 1rem!important;display:inline-flex!important}html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=secondary]:not(:disabled):not([aria-disabled=true]):hover,html body .pmd-kazen-checkout-waiter .pmd-kazen-tab:not(:disabled):hover,html body .pmd-kazen-checkout-waiter .pmd-kazen-split-stepper-btn:not(:disabled):hover,html body .pmd-kazen-checkout-waiter .pmd-kazen-assign-row:not(:disabled):hover,html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile:not(:disabled):hover,html body .pmd-kazen-checkout-waiter .pmd-kazen-method:not(:disabled):hover{background:var(--kz-secondary-bg-hover)!important;background-color:var(--kz-secondary-bg-hover)!important;transform:translateY(-1px)!important}html body .pmd-kazen-checkout-waiter .pmd-kazen-tab-active{background:var(--kz-secondary-bg)!important;background-color:var(--kz-secondary-bg)!important;color:var(--kz-secondary-text)!important;-webkit-text-fill-color:var(--kz-secondary-text)!important;border:1px solid var(--kz-primary-bg)!important;box-shadow:inset 0 -2px 0 var(--kz-primary-bg)!important}html body .pmd-kazen-checkout-waiter button:disabled,html body .pmd-kazen-checkout-waiter button[disabled],html body .pmd-kazen-checkout-waiter [aria-disabled=true],html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button=primary]:disabled,html body .pmd-kazen-checkout-waiter .pmd-themed-button:disabled,html body .pmd-kazen-checkout-waiter [data-pmd-stripe-native-button="1"]:disabled{opacity:1!important;cursor:not-allowed!important;pointer-events:none!important;background:var(--kz-disabled-bg)!important;background-color:var(--kz-disabled-bg)!important;color:var(--kz-disabled-text)!important;-webkit-text-fill-color:var(--kz-disabled-text)!important;border:1px solid var(--kz-disabled-border)!important;filter:none!important;transform:none!important}html body .pmd-kazen-checkout-waiter button svg,html body .pmd-kazen-checkout-waiter button svg *,html body .pmd-kazen-checkout-waiter [role=button] svg,html body .pmd-kazen-checkout-waiter [role=button] svg *{color:currentColor!important;stroke:currentColor!important;fill:none!important}html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile img,html body .pmd-kazen-checkout-waiter .pmd-kazen-method img{object-fit:contain!important;max-width:72px!important;max-height:34px!important}'}),(0,o.jsx)(Y.default,{id:"aa41fae69953022d",children:'html body .kzco-shell,html body .kzco-overlay,html body .kzco-card,html body .pmd-kazen-checkout-waiter,html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese]{--kzco-primary-bg:#b85d59;--kzco-primary-hover:#c86460;--kzco-primary-text:#fffaf3;--kzco-primary-border:#8f373394;--kzco-secondary-bg:#ffffff6b;--kzco-secondary-hover:#ffffff9e;--kzco-secondary-text:#242320;--kzco-secondary-border:#2423203d;--kzco-close-bg:#ffffff6b;--kzco-close-text:#242320;--kzco-close-border:#2423203d;--kzco-disabled-bg:#b85d5924;--kzco-disabled-text:#b85d59d1;--kzco-disabled-border:#b85d597a}html body .kzco-shell[data-kzco-mode=dark],html body .kzco-overlay[data-kzco-mode=dark],html body .kzco-card[data-kzco-mode=dark],html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode=dark],html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme=kazen_japanese][data-pmd-kazen-checkout-mode=dark]{--kzco-primary-bg:#b85d59;--kzco-primary-hover:#c86460;--kzco-primary-text:#fffaf3;--kzco-primary-border:#df685db8;--kzco-secondary-bg:#080604e0;--kzco-secondary-hover:#f6e8c814;--kzco-secondary-text:#f6e8c8;--kzco-secondary-border:#c6a45d61;--kzco-close-bg:#f6e8c80e;--kzco-close-text:#f6e8c8;--kzco-close-border:#c6a45d52;--kzco-disabled-bg:#b85d5942;--kzco-disabled-text:#fffaf3b8;--kzco-disabled-border:#df685d66}html body button.kzco-btn,html body .kzco-btn,html body button[data-kzco-button],html body button[data-pmd-kazen-button],html body .pmd-themed-button,html body [data-pmd-stripe-native-button="1"]{min-height:48px!important;box-shadow:none!important;text-shadow:none!important;letter-spacing:.12em!important;text-transform:uppercase!important;text-align:center!important;appearance:none!important;background-image:none!important;border-radius:0!important;justify-content:center!important;align-items:center!important;gap:.55rem!important;padding:.82rem 1rem!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans,Ubuntu,Cantarell,Helvetica Neue,sans-serif!important;font-size:.82rem!important;font-weight:850!important;line-height:1.08!important;transition:background-color .18s,border-color .18s,color .18s,transform .18s!important;display:inline-flex!important}html body button.kzco-btn-primary,html body .kzco-btn-primary,html body button[data-kzco-button=primary],html body button[data-pmd-kazen-button=primary],html body .pmd-themed-button[data-pmd-themed-button=primary],html body [data-pmd-stripe-native-button="1"],html body button[type=submit][data-pmd-themed-button=primary]{background:var(--kzco-primary-bg)!important;background-color:var(--kzco-primary-bg)!important;color:var(--kzco-primary-text)!important;-webkit-text-fill-color:var(--kzco-primary-text)!important;border:1px solid var(--kzco-primary-border)!important}html body button:has(.lucide-lock){background:var(--kzco-primary-bg)!important;background-color:var(--kzco-primary-bg)!important;color:var(--kzco-primary-text)!important;-webkit-text-fill-color:var(--kzco-primary-text)!important;border:1px solid var(--kzco-primary-border)!important}html body button.kzco-btn-primary:not(:disabled):not([aria-disabled=true]):hover,html body button[data-kzco-button=primary]:not(:disabled):not([aria-disabled=true]):hover,html body button[data-pmd-kazen-button=primary]:not(:disabled):not([aria-disabled=true]):hover,html body .pmd-themed-button[data-pmd-themed-button=primary]:not(:disabled):hover,html body [data-pmd-stripe-native-button="1"]:not(:disabled):hover{background:var(--kzco-primary-hover)!important;background-color:var(--kzco-primary-hover)!important;color:var(--kzco-primary-text)!important;-webkit-text-fill-color:var(--kzco-primary-text)!important;transform:translateY(-1px)!important}html body button.kzco-btn-secondary,html body .kzco-btn-secondary,html body button[data-kzco-button=secondary],html body button[data-pmd-kazen-button=secondary],html body .kzco-tab,html body button.kzco-tab,html body .kzco-btn-tab,html body .kzco-choice,html body .kzco-method,html body .kzco-assign-row,html body .kzco-stepper-btn,html body .pmd-payment-method-tile,html body .pmd-kazen-method,html body .pmd-kazen-tab,html body .pmd-kazen-split-stepper-btn,html body .pmd-kazen-assign-row{background:var(--kzco-secondary-bg)!important;background-color:var(--kzco-secondary-bg)!important;color:var(--kzco-secondary-text)!important;-webkit-text-fill-color:var(--kzco-secondary-text)!important;border:1px solid var(--kzco-secondary-border)!important}html body button.kzco-btn-secondary:not(:disabled):hover,html body button[data-kzco-button=secondary]:not(:disabled):hover,html body .kzco-tab:not(:disabled):hover,html body .kzco-method:not(:disabled):hover,html body .kzco-assign-row:not(:disabled):hover,html body .kzco-stepper-btn:not(:disabled):hover,html body .pmd-payment-method-tile:not(:disabled):hover{background:var(--kzco-secondary-hover)!important;background-color:var(--kzco-secondary-hover)!important;transform:translateY(-1px)!important}html body .kzco-tab-active,html body .pmd-kazen-tab-active{background:var(--kzco-secondary-bg)!important;background-color:var(--kzco-secondary-bg)!important;color:var(--kzco-secondary-text)!important;-webkit-text-fill-color:var(--kzco-secondary-text)!important;border:1px solid var(--kzco-primary-bg)!important;box-shadow:inset 0 -2px 0 var(--kzco-primary-bg)!important}html body .kzco-close,html body button.kzco-close,html body .kzco-btn-close,html body .pmd-kazen-action-close,html body .kazen-solid-close,html body .pmd-kazen-checkout-close-clean{background:var(--kzco-close-bg)!important;background-color:var(--kzco-close-bg)!important;width:48px!important;min-width:48px!important;max-width:48px!important;height:48px!important;min-height:48px!important;max-height:48px!important;color:var(--kzco-close-text)!important;-webkit-text-fill-color:var(--kzco-close-text)!important;border:1px solid var(--kzco-close-border)!important;padding:0!important}html body .kzco-close svg,html body .kzco-close svg *,html body .pmd-kazen-action-close svg,html body .pmd-kazen-action-close svg *,html body button.kzco-btn svg,html body button.kzco-btn svg *,html body button[data-kzco-button] svg,html body button[data-kzco-button] svg *{color:currentColor!important;stroke:currentColor!important;fill:none!important}html body button.kzco-btn:disabled,html body button[data-kzco-button]:disabled,html body button[data-pmd-kazen-button]:disabled,html body button[disabled].kzco-btn,html body .pmd-themed-button:disabled,html body [data-pmd-stripe-native-button="1"]:disabled{opacity:1!important;cursor:not-allowed!important;pointer-events:none!important;background:var(--kzco-disabled-bg)!important;background-color:var(--kzco-disabled-bg)!important;color:var(--kzco-disabled-text)!important;-webkit-text-fill-color:var(--kzco-disabled-text)!important;border:1px solid var(--kzco-disabled-border)!important;filter:none!important;transform:none!important}'}),(0,o.jsx)("style",{"data-pmd-kazen-stripe-form-final-polish":"1",children:`
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

      `})]})}e.i(96657);var eA=e.i(35691),ej=e.i(33189),eP=e.i(75918),eB=e.i(99738);let eR={"--theme-surface":"#fffaf0","--theme-border":"#ded2ba","--theme-text-primary":"#343529","--theme-text-secondary":"#746f61","--theme-text-muted":"#8a826f","--theme-primary":"#747d55","--theme-accent":"#747d55","--pmd-paper-soft":"#fffaf0","--pmd-paper":"#f6efe2","--pmd-line":"#ded2ba","--pmd-ink":"#343529","--pmd-muted":"#746f61","--pmd-primary":"#747d55","--pmd-primary-dark":"#5f6746","--pmd-accent":"#b88940",backgroundColor:"#fffaf0",backgroundImage:"linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0)",backgroundSize:"100% 100%, 16px 16px",backgroundRepeat:"no-repeat, repeat",border:"1px solid #ded2ba",color:"#343529",boxShadow:"0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72)"},eO={backgroundColor:"#fffaf0",color:"#343529",borderBottom:"1px solid rgba(222,210,186,.86)",boxShadow:"inset 0 1px 0 rgba(255,255,255,.72)"},eL={backgroundColor:"#f6efe2",backgroundImage:"radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0)",backgroundSize:"16px 16px",color:"#343529"},eD={background:"#747d55",backgroundColor:"#747d55",color:"#fffaf0",WebkitTextFillColor:"#fffaf0",textShadow:"none",border:"1px solid #747d55",boxShadow:"0 12px 24px rgba(95,103,70,.2)"};function eU(){return(0,o.jsx)("style",{"data-pmd-organic-checkout-component-style":"1",dangerouslySetInnerHTML:{__html:`
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
        `}})}let eM=["split","split-items","split-shares","split-review"];function eF(e){return eM.includes(e)}function eV(){return"submitted"}var eK=e.i(56298),eq=e.i(50772),eH=e.i(53899),eG=e.i(8812),e$=e.i(21216),eW=n,eY=e.i(43533);function eQ(e,t){if("function"==typeof e)return e(t);null!=e&&(e.current=t)}class eX extends eW.Component{getSnapshotBeforeUpdate(e){let t=this.props.childRef.current;if((0,e$.isHTMLElement)(t)&&e.isPresent&&!this.props.isPresent&&!1!==this.props.pop){let e=t.offsetParent,r=(0,e$.isHTMLElement)(e)&&e.offsetWidth||0,a=(0,e$.isHTMLElement)(e)&&e.offsetHeight||0,o=getComputedStyle(t),n=this.props.sizeRef.current;n.height=parseFloat(o.height),n.width=parseFloat(o.width),n.top=t.offsetTop,n.left=t.offsetLeft,n.right=r-n.width-n.left,n.bottom=a-n.height-n.top}return null}componentDidUpdate(){}render(){return this.props.children}}function eZ({children:e,isPresent:t,anchorX:r,anchorY:a,root:i,pop:s}){let l=(0,eW.useId)(),c=(0,eW.useRef)(null),d=(0,eW.useRef)({width:0,height:0,top:0,left:0,right:0,bottom:0}),{nonce:m}=(0,eW.useContext)(eY.MotionConfigContext),p=function(...e){return n.useCallback(function(...e){return t=>{let r=!1,a=e.map(e=>{let a=eQ(e,t);return r||"function"!=typeof a||(r=!0),a});if(r)return()=>{for(let t=0;t<a.length;t++){let r=a[t];"function"==typeof r?r():eQ(e[t],null)}}}}(...e),e)}(c,e.props?.ref??e?.ref);return(0,eW.useInsertionEffect)(()=>{let{width:e,height:o,top:n,left:p,right:u,bottom:h}=d.current;if(t||!1===s||!c.current||!e||!o)return;let f="left"===r?`left: ${p}`:`right: ${u}`,y="bottom"===a?`bottom: ${h}`:`top: ${n}`;c.current.dataset.motionPopId=l;let g=document.createElement("style");m&&(g.nonce=m);let b=i??document.head;return b.appendChild(g),g.sheet&&g.sheet.insertRule(`
          [data-motion-pop-id="${l}"] {
            position: absolute !important;
            width: ${e}px !important;
            height: ${o}px !important;
            ${f}px !important;
            ${y}px !important;
          }
        `),()=>{c.current?.removeAttribute("data-motion-pop-id"),b.contains(g)&&b.removeChild(g)}},[t]),(0,o.jsx)(eX,{isPresent:t,childRef:c,sizeRef:d,pop:s,children:!1===s?e:eW.cloneElement(e,{ref:p})})}let eJ=({children:e,initial:t,isPresent:r,onExitComplete:a,custom:i,presenceAffectsLayout:s,mode:l,anchorX:c,anchorY:d,root:m})=>{let p=(0,eq.useConstant)(e0),u=(0,n.useId)(),h=!0,f=(0,n.useMemo)(()=>(h=!1,{id:u,initial:t,isPresent:r,custom:i,onExitComplete:e=>{for(let t of(p.set(e,!0),p.values()))if(!t)return;a&&a()},register:e=>(p.set(e,!1),()=>p.delete(e))}),[r,p,a]);return s&&h&&(f={...f}),(0,n.useMemo)(()=>{p.forEach((e,t)=>p.set(t,!1))},[r]),n.useEffect(()=>{r||p.size||!a||a()},[r]),e=(0,o.jsx)(eZ,{pop:"popLayout"===l,isPresent:r,anchorX:c,anchorY:d,root:m,children:e}),(0,o.jsx)(eG.PresenceContext.Provider,{value:f,children:e})};function e0(){return new Map}var e1=e.i(3363);let e2=e=>e.key||"";function e5(e){let t=[];return n.Children.forEach(e,e=>{(0,n.isValidElement)(e)&&t.push(e)}),t}let e3=({children:e,custom:t,initial:r=!0,onExitComplete:a,presenceAffectsLayout:i=!0,mode:s="sync",propagate:l=!1,anchorX:c="left",anchorY:d="top",root:m})=>{let[p,u]=(0,e1.usePresence)(l),h=(0,n.useMemo)(()=>e5(e),[e]),f=l&&!p?[]:h.map(e2),y=(0,n.useRef)(!0),g=(0,n.useRef)(h),b=(0,eq.useConstant)(()=>new Map),k=(0,n.useRef)(new Set),[v,x]=(0,n.useState)(h),[z,C]=(0,n.useState)(h);(0,eH.useIsomorphicLayoutEffect)(()=>{y.current=!1,g.current=h;for(let e=0;e<z.length;e++){let t=e2(z[e]);f.includes(t)?(b.delete(t),k.current.delete(t)):!0!==b.get(t)&&b.set(t,!1)}},[z,f.length,f.join("-")]);let w=[];if(h!==v){let e=[...h];for(let t=0;t<z.length;t++){let r=z[t],a=e2(r);f.includes(a)||(e.splice(t,0,r),w.push(r))}return"wait"===s&&w.length&&(e=w),C(e5(e)),x(h),null}let{forceRender:S}=(0,n.useContext)(eK.LayoutGroupContext);return(0,o.jsx)(o.Fragment,{children:z.map(e=>{let n=e2(e),v=(!l||!!p)&&(h===z||f.includes(n));return(0,o.jsx)(eJ,{isPresent:v,initial:(!y.current||!!r)&&void 0,custom:t,presenceAffectsLayout:i,mode:s,root:m,onExitComplete:v?void 0:()=>{if(k.current.has(n)||!b.has(n))return;k.current.add(n),b.set(n,!0);let e=!0;b.forEach(t=>{t||(e=!1)}),e&&(S?.(),C(g.current),l&&u?.(),a&&a())},anchorX:c,anchorY:d,children:e},n)})})};var e4=e.i(22638);function e8({cartItem:e,addToCart:t,t:r,onOptionsChange:a,optionKey:i,unitLabel:s}){let l,c,d,[m,p]=(0,n.useState)(!1),[u,h]=(0,n.useState)({}),f=e.item.options||[],y=i||String(e.item.id),g=e.item.nameKey?r(e.item.nameKey):e.item.name,b=s||`${e.quantity}x ${g}`,k=(e,t)=>{let r={...u,[e]:t};h(r),a&&a(y,r)};return(0,o.jsxs)("div",{className:"pmd-checkout-item-card border border-paydine-champagne/20 rounded-2xl overflow-hidden",children:[(0,o.jsxs)("div",{className:"pmd-checkout-item-row flex justify-between items-center text-xs p-2",children:[(0,o.jsx)("span",{className:"text-paydine-elegant-gray min-w-[120px]",children:b}),(0,o.jsxs)("div",{className:"flex items-center gap-2",children:[(0,o.jsx)("button",{onClick:r=>{r.stopPropagation(),t(e.item,-1)},className:"quantity-btn pmd-v2-action-circle w-5 h-5 flex items-center justify-center transition-colors",children:(0,o.jsx)("span",{"data-pmd-force-qty-symbol":"minus","aria-hidden":"true",style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",fontWeight:900,fontSize:"22px",lineHeight:1,display:"inline-flex",alignItems:"center",justifyContent:"center",transform:"translateY(-1px)"},children:"−"})}),(0,o.jsx)("span",{className:"pmd-checkout-item-price text-paydine-elegant-gray font-semibold min-w-[48px] text-center",children:U((l=v(),d=(c=e=>l.enabled&&l.percentage>0&&0===l.menuPrice?e*(1+l.percentage/100):e)(e.item.price||0)*e.quantity,Object.values(u).forEach(t=>{f.forEach(r=>{let a=r.values.find(e=>e.id.toString()===t);a&&(d+=c(a.price)*e.quantity)})}),d))}),(0,o.jsx)("button",{onClick:r=>{r.stopPropagation(),t(e.item,1)},className:"quantity-btn pmd-v2-action-circle w-5 h-5 flex items-center justify-center transition-colors",children:(0,o.jsx)("span",{"data-pmd-force-qty-symbol":"plus","aria-hidden":"true",style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",fontWeight:900,fontSize:"22px",lineHeight:1,display:"inline-flex",alignItems:"center",justifyContent:"center",transform:"translateY(-1px)"},children:"+"})})]})]}),f.length>0&&(0,o.jsxs)("div",{className:"border-t border-paydine-champagne/10",children:[(0,o.jsxs)("button",{type:"button","data-pmd-customize-options-btn":"1",onClick:()=>p(!m),className:"w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",style:{background:"rgba(255, 255, 255, 0.62)",backgroundColor:"rgba(255, 255, 255, 0.62)",borderColor:"rgba(216, 185, 130, 0.45)",color:"#374151",WebkitTextFillColor:"#374151",boxShadow:"none",textShadow:"none"},children:[(0,o.jsx)("span",{children:"Customize Options"}),(0,o.jsx)(e4.ChevronDown,{className:`w-3 h-3 transition-transform duration-200 ${m?"rotate-180":""}`,style:{color:"#374151",stroke:"#374151"}})]}),m&&(0,o.jsx)(eA.motion.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},transition:{duration:.28},className:"overflow-hidden",children:(0,o.jsx)("div",{className:"p-2 space-y-3 bg-paydine-rose-beige/5",children:f.map(e=>(0,o.jsxs)("div",{children:[(0,o.jsxs)("h4",{className:"text-xs font-medium text-paydine-elegant-gray mb-1",children:[e.name," ",e.required&&"*"]}),(0,o.jsx)("div",{className:"space-y-1",children:e.values.map(t=>{var r;let a;return(0,o.jsxs)("label",{className:"flex items-center gap-2 text-xs cursor-pointer",children:[(0,o.jsx)("input",{type:"radio"===e.display_type?"radio":"checkbox",name:`${e.name}-${y}`,value:t.id.toString(),checked:u[e.name]===t.id.toString(),onChange:()=>{if("radio"===e.display_type)k(e.name,t.id.toString());else{let r=u[e.name];k(e.name,r===t.id.toString()?"":t.id.toString())}},className:"w-3 h-3 pmd-customer-price"}),(0,o.jsx)("span",{className:"text-paydine-elegant-gray",children:t.value}),t.price>0&&(a=v(),(0,o.jsxs)("span",{className:"pmd-customer-price font-medium",children:["+",U((r=t.price,a.enabled&&a.percentage>0&&0===a.menuPrice?r*(1+a.percentage/100):r))]}))]},t.id)})})]},e.id))})})]})]})}function e6(e){let{checkoutStep:t,tableDraft:r,isSubmittedTableDraftForStatus:a,hasPersonalItems:n,preferPersonalReview:i,submitDraftLoading:s,draftLoading:l,handleSubmitTableDraft:c,onClose:d,setSubmittedSnapshot:m,tableInfo:p,taxSettings:u,setCheckoutStep:h,modalSecondaryBtn:f,orderContextLabel:y,orderContextValue:g,isTableContext:b,personalReviewItems:k,addToCart:v,t:x,handleOptionsChange:z,vatLabels:C,subtotal:_,taxAmount:E,tipAmount:N,appliedCoupon:I,couponDiscount:A,finalTotal:j,isLoading:P,allItems:B,handleConfirmMyItems:R,modalPrimaryBtn:O,modalPrimaryBtnStyle:D}=e;return(0,o.jsx)(o.Fragment,{children:(0,o.jsxs)(e3,{mode:"wait",initial:!1,children:["review"===t&&r?.success&&r.status&&"empty"!==r.status&&!a&&!n&&!i&&(0,o.jsxs)(eA.motion.div,{layout:!0,initial:{opacity:1},animate:{opacity:1},exit:{opacity:0},transition:{duration:.16,ease:"easeOut"},className:"surface-sub rounded-2xl p-4 space-y-4",style:{background:"var(--theme-surface)",color:"var(--theme-text-primary)"},children:[(0,o.jsx)("div",{className:"pmd-checkout-list-scroll space-y-3 max-h-64 overflow-y-auto pr-1",children:(r.groups&&r.groups.length>0?r.groups:[{guest_session_id:null,items:r.items||[],subtotal:r.totals?.subtotal||0}]).map((e,t)=>(0,o.jsxs)("div",{className:"rounded-2xl border p-3",style:{borderColor:"var(--theme-border)"},children:[(r.groups||[]).length>1&&(0,o.jsxs)("div",{className:"mb-2 flex items-center justify-between text-xs font-semibold",children:[(0,o.jsx)("span",{children:e.guest_session_id?`Guest ${t+1}`:"Table"}),(0,o.jsx)("span",{children:U(Number(e.subtotal||0))})]}),(0,o.jsx)("div",{className:"space-y-1",children:T(e.items||[]).map((e,t)=>(0,o.jsxs)(eA.motion.div,{layout:!0,initial:{opacity:0,y:4},animate:{opacity:1,y:0},exit:{opacity:0,y:-4},transition:{duration:.16,ease:"easeOut"},className:"pmd-checkout-item-row pmd-table-order-item-row flex items-center justify-between gap-3 text-sm",children:[(0,o.jsxs)("span",{className:"truncate font-medium",children:[Number(e.quantity||1),"x ",String(e.name||`Item ${t+1}`)]}),(0,o.jsx)("span",{className:"font-semibold",children:U(Number(e.subtotal??Number(e.price||0)*Number(e.quantity||1)))})]},`${e.id||e.order_menu_id||e.menu_id||e.name}-${t}`))})]},`${e.guest_session_id||"table"}-${t}`))}),(0,o.jsxs)("div",{className:"pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs",style:{borderColor:"var(--theme-border)",background:"transparent",backgroundColor:"transparent",boxShadow:"none"},children:[(0,o.jsx)("span",{className:"muted",children:y}),(0,o.jsx)("span",{className:"font-semibold",children:g})]}),b&&(0,o.jsx)("p",{className:"pmd-checkout-helper-text text-xs muted",children:"Shared table order"}),Number(r.totals?.tax??w(r,"tax")??0)>0&&(0,o.jsxs)("div",{className:"space-y-1 border-t pt-3 text-sm",style:{borderColor:"var(--theme-border)"},children:[(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"muted",children:"Subtotal"}),(0,o.jsx)("span",{className:"font-semibold",children:U(Number(r.totals?.subtotal??w(r,"subtotal")??0))})]}),(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsxs)("span",{className:"muted",children:["VAT ",S(r,u?.percentage||0),"%"]}),(0,o.jsx)("span",{className:"font-semibold",children:U(Number(r.totals?.tax??w(r,"tax")??0))})]})]}),(0,o.jsxs)("div",{className:"flex items-center justify-between border-t pt-3 text-sm",style:{borderColor:"var(--theme-border)"},children:[(0,o.jsx)("span",{className:"font-semibold",children:"Order Total"}),(0,o.jsx)("span",{className:"text-base font-bold",children:U(Number(r.totals?.orderTotal||r.totals?.total||0))})]}),"draft"===r.status?(0,o.jsx)("div",{className:"space-y-3","data-pmd-clean-table-actions":"1",children:(0,o.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[(0,o.jsx)(eA.motion.button,{type:"button",disabled:s||l||0>=Number(r.totals?.total||0),onClick:c,whileHover:{y:s?0:-1},whileTap:{scale:s?1:.985},"aria-label":"Send order to kitchen","data-pmd-clean-send-kitchen":"1",className:"min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70",style:{background:"#062F2A",backgroundColor:"#062F2A",backgroundImage:"none",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",border:"1px solid #062F2A",boxShadow:"0 10px 22px rgba(0, 0, 0, 0.24)",textShadow:"none"},children:(0,o.jsx)("span",{style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",textShadow:"none",whiteSpace:"nowrap"},children:s?"Sending...":"Send to kitchen"})}),(0,o.jsx)(eA.motion.button,{type:"button",onClick:d,whileHover:{y:-1},whileTap:{scale:.985},"data-pmd-clean-continue-ordering":"1",className:"min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent",children:"Continue ordering"})]})}):r.order_id?(0,o.jsx)("button",{type:"button",onClick:()=>{m(L(r,p,u?.percentage||0)),h(eV())},className:f,children:"View order status"}):null]},"table-order-draft"),"review"===t&&n&&(0,o.jsxs)(eA.motion.div,{initial:{opacity:1},animate:{opacity:1},exit:{opacity:0},transition:{duration:0},className:"space-y-4",children:[(0,o.jsx)("div",{className:"pmd-checkout-flat-section rounded-2xl p-3 space-y-3",children:(0,o.jsx)("div",{className:"pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1",children:k.map((e,t)=>(0,o.jsx)(e8,{cartItem:e,optionKey:String(e.__pmdOptionKey||e.item.id),unitLabel:e.__pmdUnitLabel,addToCart:v,t:x,onOptionsChange:z},String(e.__pmdOptionKey||`${e.item.id}-${t}`)))})}),"review"===t&&n&&(0,o.jsxs)("div",{className:"pmd-checkout-flat-section rounded-2xl p-3 space-y-1",children:[(0,o.jsxs)("div",{className:"flex justify-between text-xs",children:[(0,o.jsx)("span",{children:C.subtotal}),(0,o.jsx)("span",{className:"font-semibold",children:U(_)})]}),u.enabled&&u.percentage>0&&1===u.menuPrice&&(0,o.jsxs)("div",{className:"flex justify-between text-xs",children:[(0,o.jsxs)("span",{children:[x("tax")," ",u.percentage,"%"]}),(0,o.jsx)("span",{className:"font-semibold",children:U(E)})]}),N>0&&(0,o.jsxs)("div",{className:"flex justify-between text-xs",children:[(0,o.jsx)("span",{children:x("tip")}),(0,o.jsx)("span",{className:"font-semibold",children:U(N)})]}),I&&A>0&&(0,o.jsxs)("div",{className:"flex justify-between text-xs text-green-600 dark:text-green-400",children:[(0,o.jsxs)("span",{children:[x("coupon")||"Coupon"," (",I.code,")"]}),(0,o.jsxs)("span",{className:"font-semibold",children:["-",U(A)]})]}),(0,o.jsxs)("div",{className:"flex justify-between items-center divider pt-2 mt-2",children:[(0,o.jsx)("span",{className:"text-base",children:C.total}),(0,o.jsx)("span",{className:"text-base font-bold",children:U(j)})]})]}),"review"===t&&n&&(0,o.jsxs)("div",{className:"mt-3 space-y-3",children:[(0,o.jsxs)("div",{className:"pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs",style:{borderColor:"var(--theme-border)",background:"transparent",backgroundColor:"transparent",boxShadow:"none"},children:[(0,o.jsx)("span",{className:"muted",children:y}),(0,o.jsx)("span",{className:"font-semibold",children:g})]}),(0,o.jsxs)("div",{className:"grid grid-cols-1 gap-3 sm:grid-cols-2",children:[(0,o.jsx)("button",{type:"button","data-pmd-review-submit":"true","aria-label":"Confirm items",disabled:P||0===B.length,onClick:R,className:O,style:D,children:P?"Confirming...":"Confirm"}),(0,o.jsx)("button",{type:"button","data-pmd-review-continue":"true",onClick:d,className:f,children:"Continue ordering"})]})]})]},"personal-cart-review")]})})}var e9=e.i(22368),e7=e.i(3333);function te({as:e="section",variant:t="default",className:r,...a}){return(0,o.jsx)(e,{"data-pmd-themed-card":t,className:(0,eB.cn)("pmd-themed-card",r),...a})}let tt=n.default.forwardRef(({variant:e="secondary",fullWidth:t=!1,className:r,type:a="button",...n},i)=>(0,o.jsx)("button",{ref:i,type:a,"data-pmd-themed-button":e,className:(0,eB.cn)("pmd-themed-button",t&&"pmd-themed-button-full",r),...n}));tt.displayName="ThemedButton";let tr=n.default.forwardRef(({fieldSize:e="md",className:t,...r},a)=>(0,o.jsx)("input",{ref:a,"data-pmd-themed-input":e,className:(0,eB.cn)("pmd-themed-input h-12 w-full rounded-xl border bg-transparent px-4 outline-none",t),...r}));tr.displayName="ThemedInput";let ta=n.default.forwardRef(({selected:e=!1,label:t,children:r,className:a,type:n="button",...i},s)=>(0,o.jsx)("button",{ref:s,type:n,"aria-label":t,"aria-pressed":e,"data-pmd-payment-method-tile":"1","data-pmd-selected":e?"1":"0",className:(0,eB.cn)("pmd-payment-method-tile inline-flex h-14 w-20 items-center justify-center rounded-xl border p-2",a),...i,children:r}));function to({variant:e="default",className:t,...r}){return(0,o.jsx)(te,{as:"div",variant:e,"data-pmd-checkout-step-card":"1",className:(0,eB.cn)("pmd-checkout-step-card rounded-2xl p-3",t),...r})}function tn({className:e,...t}){return(0,o.jsx)(te,{as:"div",variant:"subtle","data-pmd-checkout-summary-card":"1",className:(0,eB.cn)("pmd-checkout-summary-card rounded-2xl p-3",e),...t})}function ti({className:e,...t}){return(0,o.jsx)(te,{as:"div",variant:"status","data-pmd-order-status-card-shell":"1",className:(0,eB.cn)("pmd-order-status-card rounded-2xl p-3",e),...t})}function ts({className:e,...t}){return(0,o.jsx)(to,{variant:"subtle","data-pmd-split-bill-panel":"1",className:(0,eB.cn)("pmd-split-bill-panel space-y-3",e),...t})}ta.displayName="PaymentMethodTile";let tl=n.default.forwardRef(({selected:e=!1,className:t,type:r="button",...a},n)=>(0,o.jsx)("button",{ref:n,type:r,"data-pmd-split-method-button":"1","data-pmd-selected":e?"1":"0",className:(0,eB.cn)("pmd-split-method-button inline-flex items-center justify-center border px-3 py-1.5 text-xs font-semibold",t),...a}));function tc({className:e,...t}){return(0,o.jsx)("div",{"data-pmd-tip-coupon-panel":"1",className:(0,eB.cn)("pmd-tip-coupon-panel space-y-2",e),...t})}function td({className:e,...t}){return(0,o.jsx)(to,{variant:"default","data-pmd-payment-card-frame":"1",className:(0,eB.cn)("pmd-payment-card-frame space-y-3",e),...t})}function tm({tone:e="default",className:t,...r}){return(0,o.jsx)("div",{"data-pmd-checkout-icon-frame":e,className:(0,eB.cn)("pmd-checkout-theme-icon inline-flex h-10 w-10 shrink-0 items-center justify-center",t),...r})}function tp(e){let{checkoutStep:t,splitGrandTotal:r,splitMethod:a,chooseSplitMethod:n,splitGuestCount:i,suggestedSplitGuestCount:s,removeSplitGuest:l,addSplitGuest:c,splitGuestProfiles:d,equalSplitPeople:m,unassignedSplitItems:p,splitSourceItems:u,itemAssignments:h,setItemAssignments:f,splitGuestNames:y,sharePercents:g,setSharePercents:b,getSplitGuestAvatar:k,sharePercentTotal:v,canConfirmSplitMethod:x,goToSplitReview:z,activeSplitPeople:C,selectedSplitPersonId:w,setCheckoutStep:S,setSelectedSplitPersonId:_,toast:E,modalSecondaryBtn:N}=e,I=Array.isArray(C)?C.filter(e=>"paid"===String(e?.status||"").toLowerCase()).length:0,T=Array.isArray(C)&&C.length>0?C.length:Number(i||0),A=T>0?Math.min(100,Math.max(0,Math.round(I/T*100))):0;return(0,o.jsx)(o.Fragment,{children:eF(t)&&(0,o.jsxs)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-4",children:[(0,o.jsxs)(ts,{className:"pmd-checkout-flat-section rounded-3xl",children:[(0,o.jsx)("div",{className:"flex items-center justify-between gap-3",children:(0,o.jsxs)("p",{className:"text-xs muted",children:["Share ",U(r)," your way."]})}),(0,o.jsx)("div",{className:"grid grid-cols-3 gap-1.5",children:[["equal","Split equally"],["items","By order items"],["shares","By shares"]].map(([e,t])=>(0,o.jsx)("button",{"data-pmd-split-method-real":e,"data-pmd-active":a===e?"1":"0","data-pmd-split-method-polished":"1",type:"button",onClick:()=>n(e),className:(0,eB.cn)("group rounded-full border px-2 py-1.5 text-[11px] font-semibold transition-colors duration-150 focus:outline-none",a===e?"text-white":""),style:{boxShadow:"none",outline:"none"},children:(0,o.jsx)("span",{"data-pmd-split-label":"1",className:"inline-block transition-transform duration-150 ease-out",style:{willChange:"transform"},children:"By order items"===t?(0,o.jsxs)(o.Fragment,{children:["By order",(0,o.jsx)("br",{}),"items"]}):t})},e))})]}),"split-review"!==t&&(0,o.jsxs)("div",{className:"pmd-checkout-flat-section rounded-3xl p-3 space-y-3",children:[(0,o.jsx)("div",{className:"flex flex-wrap items-center justify-between gap-2",children:(0,o.jsx)("div",{className:"flex min-w-0 flex-1 items-start justify-between gap-3",children:(0,o.jsxs)("div",{className:"min-w-0",children:[(0,o.jsx)("span",{className:"text-sm font-semibold",children:"People"}),(0,o.jsxs)("div",{className:"mt-1 flex flex-wrap items-center gap-2",children:[(0,o.jsxs)("p",{className:"text-[11px] muted",children:["Split across ",i," guests",s>2?` \xb7 ${s} detected`:"","."]}),(0,o.jsxs)("div",{"data-pmd-split-guest-stepper":"1",className:"inline-flex shrink-0 items-center gap-1 rounded-full",children:[(0,o.jsx)("button",{type:"button","data-pmd-split-guest-count-control":"remove","aria-label":"Remove guest",disabled:i<=2,onClick:l,className:"inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35",style:{background:"#062F2A",color:"#FFFFFF"},children:(0,o.jsx)(e9.Minus,{className:"h-3.5 w-3.5",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}})}),(0,o.jsx)("span",{className:"min-w-5 text-center text-sm font-semibold",style:{color:"var(--theme-text-primary)"},"aria-label":`${i} guests`,children:i}),(0,o.jsx)("button",{type:"button","data-pmd-split-guest-count-control":"add","aria-label":"Add guest",disabled:i>=10,onClick:c,className:"inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35",style:{background:"#062F2A",color:"#FFFFFF"},children:(0,o.jsx)(e7.Plus,{className:"h-3.5 w-3.5",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}})})]})]})]})})}),(0,o.jsx)("div",{className:"flex gap-1.5 overflow-x-auto pb-1",children:d.map((e,t)=>(0,o.jsxs)("span",{className:"inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold",style:{borderColor:"color-mix(in srgb, #b88940 32%, var(--theme-border) 68%)",background:"color-mix(in srgb, #b88940 9%, var(--theme-surface) 91%)",color:"#062F2A"},children:[(0,o.jsx)("span",{className:"inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]",style:{background:"color-mix(in srgb, #b88940 24%, var(--theme-surface) 76%)"},children:e.avatar}),e.name]},`${e.name}-${t}`))}),"equal"===a&&(0,o.jsxs)("div",{className:"space-y-2",children:[m.map((e,t)=>(0,o.jsxs)("div",{className:"flex items-center justify-between rounded-2xl border p-3",style:{borderColor:"var(--theme-border)",background:"var(--theme-surface)"},children:[(0,o.jsxs)("div",{className:"flex min-w-0 items-center gap-2",children:[(0,o.jsx)("span",{className:"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",style:{background:"color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)",color:"#062F2A",border:"1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)"},children:e.avatar}),(0,o.jsxs)("span",{className:"truncate text-sm font-medium",children:[e.name,0===t?" (rounding)":""]})]}),(0,o.jsx)("span",{className:"shrink-0 font-semibold",children:U(e.total)})]},e.id)),(0,o.jsx)("p",{className:"rounded-full px-3 py-2 text-[11px] muted",style:{background:"color-mix(in srgb, #b88940 12%, var(--theme-surface) 88%)"},children:"Odd cents go to the first payer so totals match exactly."})]}),"items"===a&&(0,o.jsxs)("div",{className:"space-y-3",children:[(0,o.jsxs)("div",{className:"flex items-center justify-between text-xs",children:[(0,o.jsx)("span",{className:"muted",children:"Tap items to assign guests."}),(0,o.jsxs)("span",{className:(0,eB.cn)("rounded-full px-2 py-1 font-semibold",p>0?"text-red-700":""),style:{background:p>0?"#FEE2E2":"color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)"},children:[p," unassigned"]})]}),(0,o.jsx)("div",{className:"space-y-2 max-h-64 overflow-y-auto",children:u.map(e=>{let t=h[e.key],r=null==t?"Unassigned":y[t];return(0,o.jsxs)("button",{type:"button",className:"flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left shadow-sm",style:{border:"1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)",background:"var(--theme-surface)"},onClick:()=>f(r=>({...r,[e.key]:null==t?0:t>=i-1?null:t+1})),children:[(0,o.jsx)("span",{className:"truncate text-sm font-medium",children:e.name}),(0,o.jsxs)("span",{className:"shrink-0 text-right text-xs",children:[(0,o.jsx)("span",{className:"font-semibold",children:U(e.amount)}),(0,o.jsx)("br",{}),(0,o.jsx)("span",{className:null==t?"text-red-700":"muted",children:r})]})]},e.key)})})]}),"shares"===a&&(0,o.jsxs)("div",{className:"space-y-3",children:[g.slice(0,i).map((e,t)=>(0,o.jsxs)("div",{className:"rounded-2xl p-3 shadow-sm",style:{border:"1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)",background:"var(--theme-surface)"},children:[(0,o.jsxs)("div",{className:"mb-2 flex flex-wrap items-center justify-between gap-2 text-sm",children:[(0,o.jsxs)("span",{className:"flex min-w-0 items-center gap-2 font-medium",children:[(0,o.jsx)("span",{className:"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",style:{background:"color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)",color:"#062F2A",border:"1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)"},children:k(t)}),(0,o.jsx)("span",{className:"truncate",children:y[t]})]}),(0,o.jsxs)("div",{"data-pmd-share-edit-group":"1",className:"flex shrink-0 items-center gap-1.5",children:[(0,o.jsxs)("label",{className:"sr-only",htmlFor:`share-percent-${t}`,children:["Share percentage for ",y[t]]}),(0,o.jsxs)("div",{className:"relative",children:[(0,o.jsx)("input",{id:`share-percent-${t}`,type:"number",min:0,max:100,step:1,value:Math.round(Number(e||0)),onChange:e=>{let r=Math.max(0,Math.min(100,Number(e.target.value||0)));b(e=>e.map((e,a)=>a===t?r:e))},className:"pmd-share-manual-input pmd-share-percent-input",inputMode:"decimal"}),(0,o.jsx)("span",{className:"pmd-share-input-suffix",children:"%"})]}),(0,o.jsx)("span",{className:"pmd-share-dot",children:"·"}),(0,o.jsxs)("label",{className:"sr-only",htmlFor:`share-amount-${t}`,children:["Share amount for ",y[t]]}),(0,o.jsxs)("div",{className:"relative",children:[(0,o.jsx)("span",{className:"pmd-share-input-prefix",children:"€"}),(0,o.jsx)("input",{id:`share-amount-${t}`,type:"number",min:0,max:Math.max(0,Number(r||0)),step:.01,value:(r*(Number(e||0)/100)).toFixed(2),onChange:e=>{let a=Math.max(0,Number(e.target.value||0)),o=Number(r||0)>0?Math.max(0,Math.min(100,a/Number(r||0)*100)):0;b(e=>e.map((e,r)=>r===t?Math.round(o):e))},className:"pmd-share-manual-input pmd-share-amount-input",inputMode:"decimal"})]})]})]}),(0,o.jsx)("input",{type:"range",min:"0",max:"100",step:"1",value:e,onChange:e=>b(r=>r.map((r,a)=>a===t?Number(e.target.value):r)),className:"pmd-split-slider w-full"})]},t)),(0,o.jsx)("div",{className:"flex justify-center",children:(0,o.jsx)("span",{className:(0,eB.cn)("rounded-full px-3 py-1.5 text-xs font-semibold",100===v?"":"text-red-700"),style:{background:100===v?"color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)":"#FEF2F2",border:`1px solid ${100===v?"color-mix(in srgb, #062F2A 18%, var(--theme-border) 82%)":"#FCA5A5"}`},children:100===v?"100% ready":v<100?`${100-v}% remaining`:`Over by ${v-100}%`})})]}),(0,o.jsx)(tt,{type:"button",disabled:!x,onClick:z,variant:"primary",fullWidth:!0,className:(0,eB.cn)(!x&&"cursor-not-allowed"),children:"Review split"})]}),"split-review"===t&&(0,o.jsxs)("div",{className:"space-y-3",children:[(0,o.jsxs)("div",{"data-pmd-split-progress":"1",className:"rounded-3xl border p-3 text-xs shadow-sm",style:{borderColor:"var(--theme-border)",background:"var(--theme-surface)",color:"var(--theme-text-primary)"},children:[(0,o.jsxs)("div",{className:"flex items-center justify-between gap-3",children:[(0,o.jsx)("span",{className:"font-semibold",children:"Split progress"}),(0,o.jsxs)("span",{className:"muted",children:[I," of ",T," paid"]})]}),(0,o.jsx)("div",{className:"mt-2 h-2 overflow-hidden rounded-full",style:{background:"color-mix(in srgb, var(--theme-border) 55%, transparent)"},children:(0,o.jsx)("div",{className:"h-full rounded-full",style:{width:`${A}%`,background:"#062F2A"}})}),I>0&&I<T&&(0,o.jsx)("p",{className:"mt-2 muted",children:"If one guest leaves this payment flow, the remaining balance stays visible on the table order and staff can collect it from the QR checkout."})]}),C.map(e=>(0,o.jsxs)("div",{className:"rounded-3xl p-3 space-y-2 shadow-sm",style:{border:`1px solid ${w===e.id?"#b88940":"color-mix(in srgb, var(--theme-border) 70%, transparent)"}`,background:"var(--theme-surface)"},children:[(0,o.jsxs)("div",{className:"flex items-center justify-between gap-2",children:[(0,o.jsxs)("div",{className:"flex min-w-0 items-center gap-2",children:[(0,o.jsx)("span",{className:"inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",style:{background:"color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)",color:"#062F2A",border:"1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)"},children:e.avatar}),(0,o.jsx)("h4",{className:"truncate font-semibold",children:e.name})]}),(0,o.jsx)("span",{className:"shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold",style:{background:"Paid"===e.status?"#DCFCE7":"color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)",color:"Paid"===e.status?"#166534":"#5A3512"},children:e.status})]}),(0,o.jsxs)("div",{className:"space-y-1 text-xs muted",children:[e.items.map((t,r)=>(0,o.jsxs)("div",{className:"flex justify-between gap-2",children:[(0,o.jsx)("span",{className:"truncate",children:t.name}),(0,o.jsx)("span",{children:U(t.amount)})]},`${e.id}-${r}`)),e.tax>0&&(0,o.jsxs)("div",{className:"flex justify-between",children:[(0,o.jsx)("span",{children:"Proportional service/tax"}),(0,o.jsx)("span",{children:U(e.tax)})]})]}),(0,o.jsxs)("div",{className:"flex items-center justify-between border-t pt-2",style:{borderColor:"var(--theme-border)"},children:[(0,o.jsx)("span",{className:"font-semibold",children:"Total"}),(0,o.jsx)("span",{className:"font-bold",children:U(e.total)})]}),w===e.id?(0,o.jsx)(tt,{type:"button",onClick:()=>S("payment"),variant:"primary",fullWidth:!0,children:"Pay my share"}):(0,o.jsx)(tt,{type:"button",onClick:()=>_(e.id),variant:"secondary",fullWidth:!0,children:"Select payer"})]},e.id)),(0,o.jsxs)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:[(0,o.jsxs)("button",{type:"button",onClick:()=>E({title:"Payment links ready",description:"Share links can be generated by the payment API when multi-device checkout is enabled."}),className:N,children:[(0,o.jsx)(er,{className:"h-4 w-4"})," Send payment link to others"]}),(0,o.jsxs)("button",{type:"button",onClick:()=>E({title:"QR share",description:"Ask guests to scan the table QR to pay their own share."}),className:N,children:[(0,o.jsx)(eo,{className:"h-4 w-4"})," Show QR/share link"]})]})]})]})})}tl.displayName="SplitMethodButton";let tu=(0,X.default)("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);var th=e.i(53402);function tf(e){let t,{checkoutStep:r,submittedSnapshot:a,estimatedMinutes:n,taxSettings:i,paidTipAmount:s,paidCouponDiscount:l,submittedBaseTotal:c,appliedCoupon:d,paidAmountTotal:m,orderStatusTotal:p,submittedContextLabel:u,submittedContextValue:h,vatLabels:f,setIsSplitting:y,setSelectedSplitPersonId:g,setCheckoutStep:b,modalPrimaryBtnStyle:k,startSplitFlow:v,onOpenOrderUpdate:x,initialSubmittedOrder:z,onClose:C,modalSecondaryBtn:w,reviewRating:S,setReviewRating:_,reviewSubmitStatus:E,setReviewSubmitStatus:N,reviewComment:I,setReviewComment:A,canSubmitReview:j,handleSubmitReview:P,reviewSubmitMessage:B,merchantSettings:R,activeReviewSharePlatforms:O,handleDownloadBusinessInvoice:L,invoiceDownloadStatus:D,invoiceDownloadMessage:M}=e;return(0,o.jsx)(o.Fragment,{children:("submitted"===r||"paid"===r)&&a&&(0,o.jsx)(eA.motion.div,{"data-pmd-order-status-card":"1",className:"relative mt-7 space-y-3",children:(0,o.jsxs)(ti,{className:"pt-7 space-y-3",children:[(a?.showCustomerEta??!0)&&(0,o.jsx)("div",{"data-pmd-floating-eta-circle":"1",className:"absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full","aria-label":`Estimated time ${n} minutes`,style:{width:"4.45rem",height:"4.45rem",background:"#062F2A",backgroundColor:"#062F2A",border:"2px solid #b88940",boxShadow:"0 16px 34px rgba(6, 47, 42, 0.24)",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"},children:(0,o.jsxs)("div",{className:"flex flex-col items-center justify-center leading-none",children:[(0,o.jsx)("span",{className:"font-extrabold tracking-tight",style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",fontSize:"1.45rem",lineHeight:1},children:Math.max(1,Math.round(Number(n)||0))}),(0,o.jsx)("span",{className:"mt-1 text-[10px] font-bold uppercase tracking-[0.14em]",style:{color:"rgba(255,255,255,0.92)",WebkitTextFillColor:"rgba(255,255,255,0.92)"},children:"mins"})]})}),(0,o.jsxs)("div",{className:"flex items-center gap-3",children:[(0,o.jsx)(tm,{"data-pmd-order-received-icon":"1",className:"pmd-order-received-icon rounded-full",children:(0,o.jsx)(Q.Check,{className:"h-5 w-5",strokeWidth:3})}),(0,o.jsxs)("div",{className:"flex-1",children:[(0,o.jsx)("div",{className:"flex items-center justify-between gap-2",children:(0,o.jsx)("p",{className:"pmd-checkout-status-title text-base font-semibold",children:"paid"===r?"Payment confirmed":"We received your order"})}),"paid"===r&&(0,o.jsx)("p",{className:"text-xs muted",children:"Your order is confirmed and being prepared."})]})]}),(0,o.jsxs)("div",{className:"pmd-checkout-total-card surface-sub rounded-2xl p-3 space-y-2 text-sm",style:{background:"var(--theme-surface)",color:"var(--theme-text-primary)",border:"1px solid var(--theme-border)"},children:[a?.orderId&&(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"muted font-medium",children:"Order Number:"}),(0,o.jsxs)("span",{className:"text-right font-semibold text-[15px]",children:["M-",(t=String(a.orderId??"").trim())?((t.replace(/\D+/g,"")||t.replace(/[^a-zA-Z0-9]+/g,"")).slice(-4)||t.slice(-4)).padStart(4,"0").toUpperCase():"----",(0,o.jsxs)("span",{className:"block text-[10px] font-medium opacity-60",children:["ref ",String(a.orderId)]})]})]}),Number(a?.vatAmount??0)>0&&(0,o.jsxs)(o.Fragment,{children:[(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"muted font-medium",children:"Subtotal:"}),(0,o.jsx)("span",{className:"font-semibold text-[15px]",children:U(Number(a?.subtotal??0))})]}),(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsxs)("span",{className:"muted font-medium",children:["VAT ",Number(a?.vatPercentage??i?.percentage??0),"%:"]}),(0,o.jsx)("span",{className:"font-semibold text-[15px]",children:U(Number(a?.vatAmount??0))})]})]}),(s>0||l>0)&&(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"muted font-medium",children:"Items total:"}),(0,o.jsx)("span",{className:"font-semibold text-[15px]",children:U(c||Number(a?.total??0))})]}),s>0&&(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"muted font-medium",children:"Tip:"}),(0,o.jsx)("span",{className:"font-semibold text-[15px]",children:U(s)})]}),l>0&&(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsxs)("span",{className:"muted font-medium",children:["Coupon ",String(a?.paidCouponCode||d?.code||"")?`(${String(a?.paidCouponCode||d?.code)})`:"",":"]}),(0,o.jsxs)("span",{className:"font-semibold text-[15px]",style:{color:"#166534"},children:["-",U(l)]})]}),(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"muted font-medium",children:"paid"===r&&(s>0||l>0)?"Amount paid:":"Order Total:"}),(0,o.jsx)("span",{className:"font-semibold text-[15px]",children:U("paid"===r&&(s>0||l>0)?m:p)})]}),(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsxs)("span",{className:"muted font-medium",children:[u,":"]}),(0,o.jsx)("span",{className:"font-semibold text-[15px]",children:h})]}),f.includedNote&&(0,o.jsxs)("div",{className:"flex items-center justify-between pt-1 text-xs opacity-75",children:[(0,o.jsx)("span",{className:"muted font-medium",children:"VAT:"}),(0,o.jsx)("span",{className:"font-medium",children:f.includedNote})]})]}),(0,o.jsxs)("div",{className:"pmd-checkout-flat-section rounded-2xl p-3",children:[(0,o.jsx)("h3",{className:"mb-2 text-sm font-semibold",children:f.summary}),(0,o.jsx)("div",{className:"pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1",children:T(a?.submittedItems||[]).map((e,t)=>(0,o.jsxs)(eA.motion.div,{layout:!0,initial:{opacity:0,y:4},animate:{opacity:1,y:0},exit:{opacity:0,y:-4},transition:{duration:.16,ease:"easeOut"},className:"pmd-checkout-item-row flex items-center justify-between gap-3 text-sm",children:[(0,o.jsxs)("span",{className:"truncate font-medium",children:[Number(e?.quantity||1),"x ",String(e?.name||`Item ${t+1}`)]}),(0,o.jsx)("span",{className:"font-semibold text-[15px]",children:U(Number(e?.subtotal??Number(e?.price||0)*Number(e?.quantity||1)))})]},`${e?.menu_id||e?.order_menu_id||e?.name||t}-${t}`))})]}),"paid"!==r&&(0,o.jsxs)("div",{className:"space-y-3",children:["submitted"===r&&(0,o.jsx)("div",{className:"space-y-3",children:(0,o.jsxs)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:[(0,o.jsxs)(eA.motion.button,{type:"button",whileHover:{x:2},whileTap:{scale:.985},onClick:()=>{y(!1),g(null),b("payment")},className:"group flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-md transition",style:k,children:["Pay in full ",(0,o.jsx)(tu,{className:"h-4 w-4 transition-transform group-hover:translate-x-0.5",style:{color:"#FFFFFF",stroke:"#FFFFFF"}})]}),(0,o.jsxs)(eA.motion.button,{type:"button",whileHover:{x:2},whileTap:{scale:.985},"data-pmd-split-bill-stable":"1",onClick:()=>v("equal"),className:"pmd-split-bill-stable-button group flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",style:{border:"1.5px solid #D8B982",borderColor:"#D8B982",color:"#10201D",WebkitTextFillColor:"#10201D",background:"rgba(255, 255, 255, 0.74)",backgroundColor:"rgba(255, 255, 255, 0.74)",backgroundImage:"none",boxShadow:"0 8px 18px rgba(17, 24, 39, 0.04)",textShadow:"none",opacity:1,transition:"none"},children:[(0,o.jsx)(ei,{className:"h-4 w-4 transition-transform group-hover:translate-x-0.5",style:{color:"#b88940",stroke:"#b88940"}})," Split bill"]})]})}),(0,o.jsx)("button",{type:"button",onClick:()=>{x?.(a||z||null),C()},className:w,children:"Continue ordering"})]}),"paid"===r&&(0,o.jsxs)("div",{className:"pmd-order-complete-content space-y-3",children:[(0,o.jsxs)("div",{className:"rounded-2xl border p-3 space-y-3",style:{borderColor:"var(--theme-border)",background:"var(--theme-surface)"},children:[(0,o.jsxs)("div",{className:"flex items-center gap-2",children:[(0,o.jsx)(ea.MessageSquare,{className:"h-4 w-4",style:{color:"#b88940"}}),(0,o.jsx)("h3",{className:"text-sm font-semibold",children:"Rate your visit"})]}),(0,o.jsx)("p",{className:"text-xs muted",children:"Thank you — a quick note for the restaurant."}),(0,o.jsx)("div",{className:"flex gap-1","aria-label":"Restaurant rating",children:[1,2,3,4,5].map(e=>(0,o.jsx)("button",{type:"button","aria-label":`${e} star${e>1?"s":""}`,onClick:()=>{_(e),"loading"!==E&&N("idle")},className:"rounded-full p-1",children:(0,o.jsx)(en,{className:"h-6 w-6",style:{color:"#b88940",fill:S>=e?"#b88940":"transparent"}})},e))}),(0,o.jsx)(th.Textarea,{value:I,onChange:e=>{A(e.target.value),"loading"!==E&&N("idle")},placeholder:"Optional comment for the restaurant",className:"min-h-[78px] rounded-2xl"}),(0,o.jsx)("button",{type:"button","data-pmd-submit-review":"1",disabled:!j||"loading"===E||"success"===E,onClick:P,className:"min-h-11 w-full rounded-full px-4 py-2 text-sm font-semibold transition",style:{border:"1px solid #062F2A",background:j&&"success"!==E?"#062F2A":"rgba(6, 47, 42, 0.18)",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",boxShadow:j?"0 14px 28px rgba(0, 0, 0, 0.24)":"none",opacity:j&&"success"!==E?1:.72},children:"loading"===E?"Submitting...":"success"===E?"Review submitted":"Submit review"}),B&&(0,o.jsx)("p",{className:"text-xs",style:{color:"error"===E?"#B42318":"#166534"},children:B}),"success"===E&&R.reviewSocial?.sharePromptEnabled&&O.length>0&&(0,o.jsxs)("div",{className:"rounded-2xl border p-3",style:{borderColor:"rgba(216, 185, 130, 0.42)",background:"rgba(255, 249, 239, 0.78)"},children:[(0,o.jsx)("p",{className:"mb-2 text-xs font-semibold",style:{color:"#10201D"},children:"Would you like to share your review publicly?"}),(0,o.jsx)("div",{className:"flex flex-wrap gap-2",children:O.map(({id:e,label:t,icon:r})=>(0,o.jsxs)("a",{href:R.reviewSocial.platforms[e].url,target:"_blank",rel:"noopener noreferrer",className:"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",style:{borderColor:"rgba(6, 47, 42, 0.18)",color:"#062F2A",background:"rgba(255,255,255,0.72)"},children:[(0,o.jsx)(r,{className:"h-3.5 w-3.5"})," ",t]},e))})]})]}),(0,o.jsx)("div",{className:"flex justify-center",children:(0,o.jsx)("button",{type:"button",onClick:L,disabled:"loading"===D,className:"min-h-10 w-full max-w-[280px] rounded-full border px-4 py-2 text-xs font-semibold",style:{borderColor:"color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)",color:"#062F2A",background:"transparent",opacity:"loading"===D?.72:1},children:"loading"===D?"Preparing invoice...":"Download business invoice"})}),M&&(0,o.jsx)("p",{className:"text-center text-xs",style:{color:"#B42318"},children:M}),(0,o.jsx)("div",{className:"flex justify-center pt-1",children:(0,o.jsx)("img",{src:"/assets/media/uploads/Paymydinelogo.png",alt:"PayMyDine",className:"max-h-7 max-w-[120px] opacity-70"})}),(0,o.jsx)("button",{type:"button",onClick:C,className:w,children:"Back to menu"})]})]})})})}let ty=new Set(["cod","card","paypal","stripe","google_pay","apple_pay","wero","square","authorizenetaim","sumup","worldline"]),tg=new Set(["google_pay","apple_pay","cod","stripe","square","authorizenetaim"]),tb=(a.default.env.NEXT_PUBLIC_STATIC_ORIGIN||"").replace(/\/+$/,"");function tk(e){return tb?`${tb}${e}`:e}let tv={card_payment:"card",paypal_express:"paypal",paypalexpress:"paypal",sum_up:"sumup",sumup:"sumup",wero_pay:"wero"};function tx(e){let t=e??"",r=tv[t.trim().toLowerCase()]??t.trim().toLowerCase();if(!ty.has(r))return tk("/images/payments/default.svg");if("sumup"===r){let e,t,r,a;return t=((e=document.documentElement).getAttribute("data-theme")||"").toLowerCase(),r=(e.className||"").toLowerCase(),a=(getComputedStyle(e).getPropertyValue("--theme-background")||"").trim().toLowerCase(),tk(r.includes("dark")||t.includes("dark")||t.includes("luxury")||"#0f0b05"===a||a.includes("15, 11, 5")?"/images/payments/sumup_dark.svg":"/images/payments/sumup.svg")}if("wero"===r)return tk("/images/payments/wero.svg");let a=tg.has(r)?"png":"svg";return tk(`/images/payments/${r}.${a}`)}function tz(e){let{checkoutStep:t,selectedSplitPerson:r,pendingSummary:a,orderContextLabel:n,orderContextValue:i,paymentVatAmount:s,paymentSubtotalAmount:l,paymentVatPercentage:c,paymentBaseAmount:d,paymentTipAmount:m,paymentCouponDiscount:p,paymentPayableTotal:u,tipSettings:h,paymentTipPercentage:f,paymentCustomTip:y,updatePaymentTipPercentage:g,customTip:b,tipAmount:k,updatePaymentCustomTip:v,appliedCoupon:x,couponCode:z,setCouponCode:C,setCouponError:w,couponError:S,couponLoading:_,setCouponLoading:E,validateCoupon:N,removeCoupon:I,selectedPaymentMethod:T,loadingPayments:A,visiblePaymentMethods:j,handlePaymentMethodSelect:P,stripePromise:B,stripeConfig:R,selectedMethod:O,isDarkTheme:L,renderPaymentForm:D,t:M,toast:F}=e;return(0,o.jsx)(o.Fragment,{children:"payment"===t&&(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.18,ease:"easeOut"},className:"space-y-3",children:(0,o.jsxs)(td,{className:"pmd-checkout-payment-card surface-sub",children:[(0,o.jsxs)("div",{"data-pmd-payment-header-copy-row":"1",className:"flex items-center gap-3 rounded-2xl p-4",style:{background:"var(--theme-surface)",color:"var(--theme-text-primary)",border:"1px solid var(--theme-border)"},children:[(0,o.jsx)(tm,{"data-pmd-payment-header-icon":"1",className:"rounded-full",children:(0,o.jsx)(J.CreditCard,{className:"h-5 w-5"})}),(0,o.jsx)("p",{className:"text-sm font-semibold leading-snug",style:{color:"var(--theme-text-muted)",WebkitTextFillColor:"var(--theme-text-muted)"},children:"Ready to pay?"})]}),r&&(0,o.jsxs)(to,{variant:"subtle",className:"flex items-center justify-between p-3",children:[(0,o.jsxs)("div",{className:"flex items-center space-x-2",children:[(0,o.jsx)("span",{className:"pmd-checkout-avatar-frame inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",children:r.avatar}),(0,o.jsxs)("span",{className:"text-xs font-semibold",children:[r.name,"'s share"]})]}),(0,o.jsx)("span",{className:"text-sm font-bold",children:U(r.total)})]})]})},"payment-card-header"),a&&(0,o.jsxs)("div",{className:"pmd-checkout-flat-section rounded-2xl p-3 text-xs",children:[(0,o.jsxs)("div",{className:"flex justify-between",children:[(0,o.jsx)("span",{className:"muted",children:"Total"}),(0,o.jsx)("span",{className:"font-semibold",children:U(a?.orderTotal||0)})]}),(0,o.jsxs)("div",{className:"flex justify-between",children:[(0,o.jsx)("span",{className:"muted",children:"Already paid"}),(0,o.jsx)("span",{className:"font-semibold",children:U(a?.settledAmount||0)})]}),(0,o.jsxs)("div",{className:"flex justify-between mt-1",children:[(0,o.jsx)("span",{className:"muted",children:"Remaining"}),(0,o.jsx)("span",{className:"font-semibold",children:U(a?.remainingAmount||0)})]})]}),(0,o.jsx)(eA.motion.div,{className:"space-y-3",children:(0,o.jsxs)(tn,{className:"pmd-checkout-total-card space-y-3",children:[(0,o.jsxs)("div",{className:"pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs",style:{borderColor:"var(--theme-border)",background:"transparent",backgroundColor:"transparent",boxShadow:"none"},children:[(0,o.jsx)("span",{className:"muted",children:n}),(0,o.jsx)("span",{className:"font-semibold",children:i})]}),(0,o.jsxs)("div",{className:"space-y-1 text-sm",children:[s>0&&!r&&(0,o.jsxs)(o.Fragment,{children:[(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"muted",children:"Subtotal"}),(0,o.jsx)("span",{className:"font-semibold",children:U(l)})]}),(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsxs)("span",{className:"muted",children:["VAT ",c,"%"]}),(0,o.jsx)("span",{className:"font-semibold",children:U(s)})]})]}),(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"muted",children:r?"Share amount":"Items total"}),(0,o.jsx)("span",{className:"font-semibold",children:U(d)})]}),m>0&&(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"muted",children:"Tip"}),(0,o.jsx)("span",{className:"font-semibold",children:U(m)})]}),p>0&&x&&(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsxs)("span",{className:"muted",children:["Coupon ",x.code?`(${x.code})`:""]}),(0,o.jsxs)("span",{className:"font-semibold",style:{color:"#166534"},children:["-",U(p)]})]}),(0,o.jsxs)("div",{className:"flex items-center justify-between border-t pt-2",style:{borderColor:"var(--theme-border)"},children:[(0,o.jsx)("span",{className:"font-semibold",children:"Payable total"}),(0,o.jsx)("span",{className:"text-base font-bold",style:{color:"#b88940"},children:U(u)})]})]}),h.enabled&&(0,o.jsxs)(tc,{"data-pmd-payment-real-panel":"tip-coupon",children:[(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("span",{className:"text-xs font-semibold",children:r?`${r.name}'s tip`:"Add tip"}),m>0&&(0,o.jsx)("span",{className:"text-xs font-semibold",style:{color:"#b88940"},children:U(m)})]}),(0,o.jsxs)("div",{className:"flex flex-wrap gap-2",children:[(h.percentages||[]).map(e=>(0,o.jsxs)(tl,{selected:f===e&&!y,onClick:()=>g(e),children:[e,"%"]},e)),(0,o.jsxs)("div",{className:"relative min-w-[96px] flex-1",children:[(0,o.jsx)("span",{className:"absolute left-3 top-1/2 -translate-y-1/2 text-xs muted",children:"€"}),(0,o.jsx)(tr,{"data-pmd-custom-tip-shows-selected-amount":"1",step:"0.01",value:b||(Number(k)>0?Number(k).toFixed(2):""),type:"number",min:"0",onChange:e=>v(e.target.value),placeholder:"Custom",className:"h-9 w-full pl-7 pr-3 text-xs font-semibold"})]})]})]}),(0,o.jsxs)(tc,{children:[!x||r?(0,o.jsxs)("div",{className:"flex gap-2",children:[(0,o.jsx)(tr,{type:"text",value:z,onChange:e=>{C(e.target.value.toUpperCase()),w(null)},placeholder:"Coupon code",className:"h-9 min-w-0 flex-1 px-3 text-xs font-semibold",disabled:_}),(0,o.jsx)(tt,{type:"button",disabled:_||!z.trim(),onClick:async()=>{if(z.trim()){if(r)return void w("Coupon validation for split payments is coming soon.");E(!0),w(null);try{let e=await N(z.trim(),d);e.success?(C(""),F({title:"Coupon applied",description:"Your coupon was added to this payment."})):w(e.message||"Coupon will be checked at payment.")}catch{w("Coupon validation coming soon.")}finally{E(!1)}}},className:"h-9 px-4 text-xs font-semibold disabled:opacity-50",variant:"secondary",children:_?"Checking...":"Apply"})]}):(0,o.jsxs)("div",{className:"flex items-center justify-between gap-2 rounded-full px-3 py-2 text-xs",style:{background:"color-mix(in srgb, #062F2A 10%, var(--theme-surface) 90%)"},children:[(0,o.jsxs)("span",{className:"font-semibold",children:[x.name||"Coupon"," ",x.code?`(${x.code})`:""]}),(0,o.jsx)("button",{type:"button",onClick:()=>{I(),C(""),w(null)},className:"rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",style:{borderColor:"color-mix(in srgb, #b88940 45%, var(--theme-border) 55%)",color:"#062F2A",background:"var(--theme-surface)"},children:"Remove"})]}),S&&(0,o.jsx)("p",{className:"text-xs text-red-700",children:S})]})]})}),(0,o.jsx)(e3,{initial:!1,mode:"wait",children:"payment"===t?(0,o.jsx)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 pt-2",children:(0,o.jsxs)(td,{className:"pmd-checkout-payment-methods-card",children:[(0,o.jsx)("h3",{className:"text-center text-sm",children:M("paymentMethods")}),(0,o.jsx)("div",{className:"flex justify-center items-center gap-3 flex-wrap",children:A?(0,o.jsx)("div",{className:"text-sm muted",children:"Loading payment methods..."}):0===j.length?(0,o.jsx)("div",{className:"text-sm muted",children:"No payment methods available"}):j.map(e=>(0,o.jsx)(eA.motion.div,{children:(0,o.jsx)(ta,{label:e.name,selected:T===e.code,onClick:()=>{try{window.__PMD_WALLET_POST&&window.__PMD_WALLET_POST({level:"info",message:"PMD_PAYMENT_METHOD_CLICK",data:{clickedCode:e.code,clickedName:e.name,selectedPaymentMethodBefore:T??null,selectedMethodBefore:O?{code:O.code,name:O.name}:null,stripePromise:!!B,stripeConfig:R?{currency:R?.currency||null,countryCode:R?.countryCode||null,applePayEnabled:R?.applePayEnabled??null,googlePayEnabled:R?.googlePayEnabled??null}:null,ua:"u">typeof navigator?navigator.userAgent:null}})}catch{}P(e.code)},children:"card"===e.code?(0,o.jsx)("img",{src:L?"/images/payments/card-dark.svg":"/images/payments/card-light.svg",alt:e.name,width:40,height:22,className:"object-contain"}):(0,o.jsx)("img",{src:"paypal"===e.code?"/images/payments/paypal.png":"google_pay"===e.code?"/images/payments/google_pay.png":tx(e.code),alt:e.name,width:"wero"===e.code?50:"cod"===e.code||"paypal"===e.code?30:"apple_pay"===e.code||"google_pay"===e.code?50:42,height:"wero"===e.code?29:"apple_pay"===e.code||"google_pay"===e.code?28:24,className:"object-contain"})})},e.code))}),ed(T)&&(0,o.jsx)("div",{"data-pmd-payment-selected-detail":"1",className:"pmd-checkout-payment-detail pt-2",children:D()})]})},"payment-methods"):null})]})})}function tC(e){let{isKazenJapaneseCheckoutVisual:t,isModernGreenCheckoutVisual:r,isOrganicCheckoutVisual:a,checkoutVisualTheme:n,modalPrimaryBtn:i,modalPrimaryBtnStyle:s,modalSecondaryBtn:l,iconBackBtn:c,modalTitle:d,checkoutStep:m,setCheckoutStep:p,selectedSplitPersonId:u,onClose:h,tableDraft:f,tableInfo:y,taxSettings:g,isSubmittedTableDraftForStatus:b,hasPersonalItems:k,preferPersonalReview:v,orderContextLabel:x,orderContextValue:z,isTableContext:C,submitDraftLoading:w,draftLoading:S,handleSubmitTableDraft:_,setSubmittedSnapshot:E,personalReviewItems:N,addToCart:I,t:T,handleOptionsChange:A,vatLabels:j,subtotal:P,taxAmount:B,tipAmount:R,appliedCoupon:O,couponDiscount:L,finalTotal:D,isLoading:U,allItems:M,handleConfirmMyItems:F,setIsSplitting:V,splitGrandTotal:K,splitMethod:q,startSplitFlow:H,chooseSplitMethod:G,splitGuestCount:$,suggestedSplitGuestCount:W,removeSplitGuest:Y,addSplitGuest:Q,splitGuestProfiles:X,equalSplitPeople:Z,getSplitGuestAvatar:J,splitGuestNames:ee,unassignedSplitItems:et,splitSourceItems:er,itemAssignments:ea,setItemAssignments:eo,sharePercents:en,setSharePercents:ei,sharePercentTotal:es,canConfirmSplitMethod:el,goToSplitReview:ec,activeSplitPeople:ed,setSelectedSplitPersonId:em,toast:ep,submittedSnapshot:eu,estimatedMinutes:eh,paidTipAmount:ef,paidCouponDiscount:ey,paidAmountTotal:eg,orderStatusTotal:eb,submittedBaseTotal:ek,submittedContextLabel:ev,submittedContextValue:ex,initialSubmittedOrder:ez,existingOrderId:eC,onOpenOrderUpdate:ew,reviewRating:eS,setReviewRating:e_,reviewSubmitStatus:eE,setReviewSubmitStatus:eN,reviewComment:eI,setReviewComment:eT,canSubmitReview:eD,handleSubmitReview:eM,reviewSubmitMessage:eV,merchantSettings:eK,activeReviewSharePlatforms:eq,handleDownloadBusinessInvoice:eH,invoiceDownloadStatus:eG,invoiceDownloadMessage:e$,selectedSplitPerson:eW,pendingSummary:eY,paymentVatAmount:eQ,paymentSubtotalAmount:eX,paymentVatPercentage:eZ,paymentBaseAmount:eJ,paymentTipAmount:e0,paymentCouponDiscount:e1,paymentPayableTotal:e2,tipSettings:e5,paymentTipPercentage:e3,paymentCustomTip:e4,updatePaymentTipPercentage:e8,customTip:e9,updatePaymentCustomTip:e7,couponCode:te,setCouponCode:tt,setCouponError:tr,couponError:ta,couponLoading:to,setCouponLoading:tn,validateCoupon:ti,removeCoupon:ts,selectedPaymentMethod:tl,loadingPayments:tc,visiblePaymentMethods:td,handlePaymentMethodSelect:tm,stripePromise:tu,stripeConfig:th,selectedMethod:ty,isDarkTheme:tg,renderPaymentForm:tb,payableTotal:tk}=e;return(0,o.jsxs)("div",{"data-pmd-kazen-checkout-overlay":t?"1":void 0,className:(0,eB.cn)("fixed inset-0 z-50 flex items-center justify-center",r?"bg-transparent backdrop-blur-md":"bg-black/30"),children:[a&&(0,o.jsx)(eU,{}),(0,o.jsxs)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},"data-testid":"pmd-checkout-modal","data-pmd-checkout-theme-root":"1","data-pmd-checkout-theme":n,"data-pmd-checkout-design-system":"1","data-pmd-checkout-visual-theme":n,"data-pmd-checkout-kazen-skin":t?"1":void 0,className:"pmd-checkout-modal w-full max-w-md surface rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]",style:a?eR:void 0,children:[(0,o.jsxs)("div",{className:"p-4 pb-2 surface-sub flex justify-between items-center rounded-2xl",style:a?eO:void 0,children:[(0,o.jsx)(eP.Button,{"data-pmd-order-status-back":"1",variant:"ghost",size:"sm",onClick:()=>{var e;let t=(e=!!u,"payment"===m?e?"split-review":"submitted":eF(m)?"submitted":null);t?p(t):h()},className:c,style:{background:"#062F2A",backgroundColor:"#062F2A",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",borderColor:"#062F2A",outlineColor:"#062F2A",textDecoration:"none"},children:(0,o.jsx)(ej.ArrowLeft,{className:"h-5 w-5",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}})}),(0,o.jsx)("h2",{className:"pmd-checkout-modal-title",children:d}),(0,o.jsx)("div",{className:"w-8"})," "]}),(0,o.jsxs)("div",{"data-testid":"pmd-checkout-scroll","data-pmd-checkout-scroll":"1",className:"pmd-checkout-body p-4 pb-8 space-y-4 overflow-y-auto flex-1",style:a?eL:void 0,children:[(0,o.jsx)(e6,{checkoutStep:m,tableDraft:f,isSubmittedTableDraftForStatus:b,hasPersonalItems:k,preferPersonalReview:v,submitDraftLoading:w,draftLoading:S,handleSubmitTableDraft:_,onClose:h,setSubmittedSnapshot:E,tableInfo:y,taxSettings:g,setCheckoutStep:p,modalSecondaryBtn:l,orderContextLabel:x,orderContextValue:z,isTableContext:C,personalReviewItems:N,addToCart:I,t:T,handleOptionsChange:A,vatLabels:j,subtotal:P,taxAmount:B,tipAmount:R,appliedCoupon:O,couponDiscount:L,finalTotal:D,isLoading:U,allItems:M,handleConfirmMyItems:F,modalPrimaryBtn:i,modalPrimaryBtnStyle:s}),(0,o.jsx)(tp,{checkoutStep:m,splitGrandTotal:K,splitMethod:q,chooseSplitMethod:G,splitGuestCount:$,suggestedSplitGuestCount:W,removeSplitGuest:Y,addSplitGuest:Q,splitGuestProfiles:X,equalSplitPeople:Z,unassignedSplitItems:et,splitSourceItems:er,itemAssignments:ea,setItemAssignments:eo,splitGuestNames:ee,sharePercents:en,setSharePercents:ei,getSplitGuestAvatar:J,sharePercentTotal:es,canConfirmSplitMethod:el,goToSplitReview:ec,activeSplitPeople:ed,selectedSplitPersonId:u,setCheckoutStep:p,setSelectedSplitPersonId:em,toast:ep,modalSecondaryBtn:l}),(0,o.jsx)(tf,{checkoutStep:m,submittedSnapshot:eu,estimatedMinutes:eh,taxSettings:g,paidTipAmount:ef,paidCouponDiscount:ey,submittedBaseTotal:ek,appliedCoupon:O,paidAmountTotal:eg,orderStatusTotal:eb,submittedContextLabel:ev,submittedContextValue:ex,vatLabels:j,setIsSplitting:V,setSelectedSplitPersonId:em,setCheckoutStep:p,modalPrimaryBtnStyle:s,startSplitFlow:H,onOpenOrderUpdate:ew,initialSubmittedOrder:ez,onClose:h,modalSecondaryBtn:l,reviewRating:eS,setReviewRating:e_,reviewSubmitStatus:eE,setReviewSubmitStatus:eN,reviewComment:eI,setReviewComment:eT,canSubmitReview:eD,handleSubmitReview:eM,reviewSubmitMessage:eV,merchantSettings:eK,activeReviewSharePlatforms:eq,handleDownloadBusinessInvoice:eH,invoiceDownloadStatus:eG,invoiceDownloadMessage:e$}),(0,o.jsx)(tz,{checkoutStep:m,selectedSplitPerson:eW,pendingSummary:eY,orderContextLabel:x,orderContextValue:z,paymentVatAmount:eQ,paymentSubtotalAmount:eX,paymentVatPercentage:eZ,paymentBaseAmount:eJ,paymentTipAmount:e0,paymentCouponDiscount:e1,paymentPayableTotal:e2,tipSettings:e5,paymentTipPercentage:e3,paymentCustomTip:e4,updatePaymentTipPercentage:e8,customTip:e9,tipAmount:R,updatePaymentCustomTip:e7,appliedCoupon:O,couponCode:te,setCouponCode:tt,setCouponError:tr,couponError:ta,couponLoading:to,setCouponLoading:tn,validateCoupon:ti,removeCoupon:ts,selectedPaymentMethod:tl,loadingPayments:tc,visiblePaymentMethods:td,handlePaymentMethodSelect:tm,stripePromise:tu,stripeConfig:th,selectedMethod:ty,isDarkTheme:tg,renderPaymentForm:tb,t:T,toast:ep})]})]})]})}var tw=e.i(93561);let tS=(e,t="Item")=>String(e?.__pmdDisplayName||e?.name||e?.item?.name||e?.menu_name||e?.item_name||t),t_=e=>Math.max(1,Number(e?.quantity||e?.qty||1));function tE({className:e="",style:t,children:r,...a}){return(0,o.jsx)("button",{...a,"data-pmd-mg-unified-button":"primary","data-pmd-no-observer-action":"modern-green-unified-primary","data-pmd-render-safe-action":"modern-green-unified-primary",style:{height:"3.5rem",minHeight:"3.5rem",width:"100%",borderRadius:"9999px",border:"1px solid rgba(51, 158, 111, .42)",background:"linear-gradient(180deg, rgba(3, 48, 36, .98), rgba(2, 32, 24, .98))",color:"#f5fff8",fontSize:"1rem",fontWeight:760,letterSpacing:"-0.012em",boxShadow:"inset 0 1px 0 rgba(151,255,204,.045), 0 12px 26px rgba(0,0,0,.22)",...t},className:`flex items-center justify-center px-5 py-3 transition disabled:opacity-50 ${e}`,children:(0,o.jsx)("span",{style:{color:"#f5fff8",WebkitTextFillColor:"#f5fff8",opacity:1,fontWeight:760},children:r})})}function tN({className:e="",style:t,children:r,...a}){return(0,o.jsx)("button",{...a,"data-pmd-mg-unified-button":"secondary","data-pmd-no-observer-action":"modern-green-unified-secondary","data-pmd-render-safe-action":"modern-green-unified-secondary",style:{height:"3.5rem",minHeight:"3.5rem",width:"100%",borderRadius:"9999px",border:"1px solid rgba(51, 158, 111, .38)",background:"linear-gradient(180deg, rgba(1, 15, 10, .99), rgba(0, 8, 5, .99))",color:"#edfdf4",fontSize:"1rem",fontWeight:720,letterSpacing:"-0.012em",boxShadow:"inset 0 1px 0 rgba(151,255,204,.035)",opacity:1,...t},className:`flex items-center justify-center px-5 py-3 transition hover:brightness-110 disabled:opacity-50 ${e}`,children:(0,o.jsx)("span",{style:{color:"#edfdf4",WebkitTextFillColor:"#edfdf4",opacity:1,fontWeight:720},children:r})})}function tI({children:e,className:t=""}){return(0,o.jsx)("section",{"data-pmd-mg-unified-card":"1",className:`rounded-[26px] border p-4 backdrop-blur-xl ${t}`,style:{background:"linear-gradient(180deg, rgba(1, 15, 10, .985), rgba(0, 8, 5, .985))",borderColor:"rgba(38, 128, 88, .48)",color:"#f5fff8",boxShadow:"0 0 0 1px rgba(13, 80, 52, .24), 0 24px 64px rgba(0,0,0,.52)"},children:e})}function tT({splitMethod:e,chooseSplitMethod:t}){return(0,o.jsx)("div",{className:"grid grid-cols-3 gap-2",children:[["equal","Split equally"],["items","By order items"],["shares","By shares"]].map(([r,a])=>(0,o.jsx)("button",{type:"button",onClick:()=>t(r),className:`rounded-full border px-2 py-2 text-[11px] font-extrabold transition ${e===r?"border-[#31c98b] bg-[#31c98b] text-[#02110c]":"border-[#31c98b]/25 bg-transparent text-[#dfffee]"}`,children:a},r))})}function tA({splitGuestCount:e,addSplitGuest:t,removeSplitGuest:r}){return(0,o.jsxs)("div",{className:"flex items-center justify-between rounded-3xl border border-[#31c98b]/16 bg-[#04130f]/70 px-3 py-2",children:[(0,o.jsx)("span",{className:"text-sm font-bold text-[#f4fff8]",children:"People"}),(0,o.jsxs)("div",{className:"flex items-center gap-3",children:[(0,o.jsx)("button",{type:"button","aria-label":"Remove guest",disabled:e<=2,onClick:r,className:"flex h-8 w-8 items-center justify-center rounded-full bg-[#0c3d2d] text-[#f4fff8] disabled:opacity-35",children:(0,o.jsx)(e9.Minus,{className:"h-4 w-4"})}),(0,o.jsx)("span",{className:"min-w-6 text-center text-base font-black text-[#f4fff8]",children:e}),(0,o.jsx)("button",{type:"button","aria-label":"Add guest",disabled:e>=10,onClick:t,className:"flex h-8 w-8 items-center justify-center rounded-full bg-[#0c3d2d] text-[#f4fff8] disabled:opacity-35",children:(0,o.jsx)(e7.Plus,{className:"h-4 w-4"})})]})]})}function tj(e){let{checkoutStep:t,onClose:r,hasPersonalItems:a,personalItems:n,tableDraft:i,tableDraftItems:s,tableDraftTotal:l,submittedSnapshot:c,submittedItems:d,estimatedMinutes:m,subtotal:p,finalTotal:u,paymentBaseAmount:h,paymentPayableTotal:f,paymentTipAmount:y,paymentCouponDiscount:g,paymentTipPercentage:b,paymentCustomTip:k,tipPercentages:v,tipEnabled:x,couponCode:z,setCouponCode:C,appliedCoupon:w,couponError:S,couponLoading:_,onApplyCoupon:E,onRemoveCoupon:N,visiblePaymentMethods:I,loadingPayments:T,selectedPaymentMethod:A,onPaymentMethodSelect:j,renderPaymentForm:P,renderPaymentButton:B,handleConfirmMyItems:R,handleSubmitTableDraft:O,setCheckoutStep:L,startSplitFlow:D,chooseSplitMethod:M,goToSplitReview:F,splitGuestCount:V,addSplitGuest:K,removeSplitGuest:q,splitMethod:H,splitGuestProfiles:G,equalSplitPeople:$=[],activeSplitPeople:W,selectedSplitPersonId:Y,setSelectedSplitPersonId:Q,selectedSplitPerson:X,splitSourceItems:Z,itemAssignments:ee,setItemAssignments:et,sharePercents:ea,setSharePercents:en,sharePercentTotal:ei,canConfirmSplitMethod:es,splitGrandTotal:el,updatePaymentTipPercentage:ec,updatePaymentCustomTip:em,onPaymentLinks:ep,onQrShare:eu,isDarkTheme:eh}=e,ef=Number(c?.remainingAmount??c?.orderTotal??c?.total??l??u??0),ey=Array.isArray($)?$:[],eg=e=>(0,o.jsx)("div",{className:"space-y-2",children:e.map((e,t)=>(0,o.jsxs)("div",{className:"flex items-center justify-between gap-3 rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 px-3 py-2",children:[(0,o.jsxs)("span",{className:"min-w-0 truncate text-sm font-semibold text-[#f4fff8]",children:[t_(e),"x ",tS(e,`Item ${t+1}`)]}),(0,o.jsx)("span",{className:"shrink-0 text-sm font-black text-[#31c98b]",children:U((e=>{let t=t_(e),r=Number(e?.__pmdDisplaySubtotal??e?.subtotal??e?.total??e?.amount);if(Number.isFinite(r)&&r>0)return r;let a=Number(e?.price??e?.unit_price??e?.item?.price??0);return Number.isFinite(a)?a*t:0})(e))})]},`${tS(e)}-${t}`))}),eb=null;return"review"===t&&a?eb=(0,o.jsxs)(tI,{className:"space-y-4",children:[(0,o.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"My Order"}),eg(n),(0,o.jsxs)("div",{className:"space-y-2 border-t border-[#31c98b]/14 pt-3",children:[(0,o.jsxs)("div",{className:"flex justify-between text-sm text-[#c9f6df]",children:[(0,o.jsx)("span",{children:"Subtotal"}),(0,o.jsx)("span",{children:U(p)})]}),(0,o.jsxs)("div",{className:"flex justify-between text-base font-black text-[#f4fff8]",children:[(0,o.jsx)("span",{children:"Total"}),(0,o.jsx)("span",{className:"text-[#31c98b]",children:U(u)})]})]}),(0,o.jsxs)("div",{className:"space-y-2",children:[(0,o.jsx)(tE,{onClick:R,children:"Confirm"}),(0,o.jsx)(tN,{onClick:r,children:"Continue ordering"})]})]}):"review"===t&&i?eb=(0,o.jsxs)(tI,{className:"space-y-4",children:[(0,o.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"Table Order"}),eg(s),(0,o.jsxs)("div",{className:"flex justify-between border-t border-[#31c98b]/14 pt-3 text-base font-black text-[#f4fff8]",children:[(0,o.jsx)("span",{children:"Order Total"}),(0,o.jsx)("span",{className:"text-[#31c98b]",children:U(l)})]}),(0,o.jsxs)("div",{className:"space-y-2",children:[(0,o.jsx)(tE,{onClick:O,children:"Send to kitchen"}),(0,o.jsx)(tN,{onClick:r,children:"Continue ordering"})]})]}):"submitted"===t?eb=(0,o.jsxs)(tI,{className:"space-y-4 pt-8 text-center",children:[(0,o.jsxs)("div",{className:"mx-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border border-[#31c98b]/35 bg-[#31c98b]/14 text-[#f4fff8]",children:[(0,o.jsx)("span",{className:"text-2xl font-black",children:m}),(0,o.jsx)("span",{className:"text-[10px] font-bold uppercase tracking-wide",children:"min"})]}),(0,o.jsxs)("div",{children:[(0,o.jsx)(tw.CheckCircle,{className:"mx-auto mb-2 h-7 w-7 text-[#31c98b]"}),(0,o.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"We received your order"})]}),(0,o.jsxs)("div",{className:"flex justify-between rounded-2xl border border-[#31c98b]/14 bg-[#04130f]/58 px-3 py-2 text-base font-black text-[#f4fff8]",children:[(0,o.jsx)("span",{children:"Order Total"}),(0,o.jsx)("span",{className:"text-[#31c98b]",children:U(ef)})]}),eg(d),(0,o.jsxs)("div",{className:"space-y-2",children:[(0,o.jsx)(tE,{onClick:()=>L("payment"),children:"Pay in full"}),(0,o.jsx)(tN,{onClick:()=>D("equal"),children:"Split bill"}),(0,o.jsx)(tN,{onClick:r,children:"Continue ordering"})]})]}):"payment"===t?eb=(0,o.jsxs)("div",{className:"space-y-3",children:[(0,o.jsxs)(tI,{className:"space-y-3",children:[(0,o.jsxs)("div",{className:"flex items-center gap-3",children:[(0,o.jsx)("div",{className:"flex h-11 w-11 items-center justify-center rounded-full bg-[#31c98b] text-[#02110c]",children:(0,o.jsx)(J.CreditCard,{className:"h-5 w-5"})}),(0,o.jsxs)("div",{children:[(0,o.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"Payment"}),(0,o.jsx)("p",{className:"text-sm font-semibold text-[#bdebd2]",children:"Ready to pay?"})]})]}),X&&(0,o.jsxs)("div",{className:"flex justify-between rounded-2xl border border-[#31c98b]/14 bg-[#04130f]/58 px-3 py-2 text-sm font-bold text-[#f4fff8]",children:[(0,o.jsxs)("span",{children:[X.name,"'s share"]}),(0,o.jsx)("span",{children:U(X.total)})]}),(0,o.jsxs)("div",{className:"space-y-2 rounded-3xl border border-[#31c98b]/14 bg-[#04130f]/58 p-3",children:[(0,o.jsxs)("div",{className:"flex justify-between text-sm text-[#c9f6df]",children:[(0,o.jsx)("span",{children:X?"Share amount":"Items total"}),(0,o.jsx)("span",{children:U(h)})]}),y>0&&(0,o.jsxs)("div",{className:"flex justify-between text-sm text-[#c9f6df]",children:[(0,o.jsx)("span",{children:"Tip"}),(0,o.jsx)("span",{children:U(y)})]}),g>0&&(0,o.jsxs)("div",{className:"flex justify-between text-sm text-[#8ff0bd]",children:[(0,o.jsx)("span",{children:"Coupon"}),(0,o.jsxs)("span",{children:["-",U(g)]})]}),(0,o.jsxs)("div",{className:"flex justify-between border-t border-[#31c98b]/14 pt-2 text-base font-black text-[#f4fff8]",children:[(0,o.jsx)("span",{children:"Payable total"}),(0,o.jsx)("span",{className:"text-[#31c98b]",children:U(f)})]})]}),x&&(0,o.jsxs)("div",{className:"space-y-2",children:[(0,o.jsxs)("div",{className:"flex justify-between text-xs font-bold text-[#f4fff8]",children:[(0,o.jsx)("span",{children:X?`${X.name}'s tip`:"Add tip"}),y>0&&(0,o.jsx)("span",{className:"text-[#31c98b]",children:U(y)})]}),(0,o.jsxs)("div",{className:"flex flex-wrap gap-2",children:[[0,...v.filter(e=>0!==e)].map(e=>(0,o.jsxs)("button",{type:"button",onClick:()=>ec(e),className:`rounded-full border px-3 py-1.5 text-xs font-black ${b===e&&!k?"border-[#31c98b] bg-[#31c98b] text-[#02110c]":"border-[#31c98b]/25 bg-transparent text-[#e7fff3]"}`,children:[e,"%"]},e)),(0,o.jsx)("input",{type:"number",min:"0",step:"0.01",value:k,onChange:e=>em(e.target.value),placeholder:"Custom",className:"h-9 min-w-[96px] flex-1 rounded-full border border-[#31c98b]/25 bg-[#04130f]/70 px-3 text-xs font-bold text-[#f4fff8] outline-none placeholder:text-[#92c7ac]"})]})]}),(0,o.jsxs)("div",{className:"space-y-2",children:[!w||X?(0,o.jsxs)("div",{className:"flex gap-2",children:[(0,o.jsx)("input",{type:"text",value:z,onChange:e=>C(e.target.value.toUpperCase()),placeholder:"Coupon code",disabled:_,className:"h-10 min-w-0 flex-1 rounded-full border border-[#31c98b]/25 bg-[#04130f]/70 px-3 text-xs font-bold text-[#f4fff8] outline-none placeholder:text-[#92c7ac]"}),(0,o.jsx)("button",{type:"button",disabled:_||!z.trim(),onClick:E,className:"rounded-full border border-[#31c98b]/40 px-4 text-xs font-black text-[#e7fff3] disabled:opacity-50",children:_?"Checking...":"Apply"})]}):(0,o.jsxs)("div",{className:"flex items-center justify-between rounded-full border border-[#31c98b]/18 bg-[#31c98b]/10 px-3 py-2 text-xs font-bold text-[#f4fff8]",children:[(0,o.jsxs)("span",{children:[w.name||"Coupon"," ",w.code?`(${w.code})`:""]}),(0,o.jsx)("button",{type:"button",onClick:N,className:"rounded-full border border-[#31c98b]/35 px-3 py-1 text-[#e7fff3]",children:"Remove"})]}),S&&(0,o.jsx)("p",{className:"text-xs font-semibold text-[#ffb4a8]",children:S})]})]}),(0,o.jsxs)(tI,{className:"space-y-3",children:[(0,o.jsx)("h3",{className:"text-center text-sm font-black text-[#f4fff8]",children:"Payment methods"}),(0,o.jsx)("div",{className:"flex flex-wrap items-center justify-center gap-3",children:T?(0,o.jsx)("p",{className:"text-sm text-[#bdebd2]",children:"Loading payment methods..."}):0===I.length?(0,o.jsx)("p",{className:"text-sm text-[#bdebd2]",children:"No payment methods available"}):I.map(e=>{let t,r={width:"wero"===(t=e.code)||"apple_pay"===t||"google_pay"===t?50:"cod"===t||"paypal"===t?30:42,height:"wero"===t?29:"apple_pay"===t||"google_pay"===t?28:24};return(0,o.jsx)("button",{type:"button",onClick:()=>j(e.code),className:`flex h-14 w-20 items-center justify-center rounded-2xl border ${A===e.code?"border-[#31c98b] bg-[#31c98b]/16":"border-[#31c98b]/18 bg-[#04130f]/70"}`,children:(0,o.jsx)("img",{src:"card"===e.code?eh?"/images/payments/card-dark.svg":"/images/payments/card-light.svg":"paypal"===e.code?"/images/payments/paypal.png":"google_pay"===e.code?"/images/payments/google_pay.png":tx(e.code),alt:e.name,width:r.width,height:r.height,className:"object-contain"})},e.code)})}),ed(A)&&(0,o.jsx)("div",{className:"pt-2",children:P()}),B()]})]}):"split"===t||"split-items"===t||"split-shares"===t?eb=(0,o.jsxs)(tI,{className:"space-y-4",children:[(0,o.jsxs)("div",{children:[(0,o.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"split-items"===t?"Assign items":"split-shares"===t?"Set shares":"Split Bill"}),(0,o.jsxs)("p",{className:"text-sm font-semibold text-[#bdebd2]",children:["Share ",U(el)," your way."]})]}),(0,o.jsx)(tT,{splitMethod:H,chooseSplitMethod:M}),(0,o.jsx)(tA,{splitGuestCount:V,addSplitGuest:K,removeSplitGuest:q}),(0,o.jsx)("div",{className:"flex gap-2 overflow-x-auto pb-1",children:G.map((e,t)=>(0,o.jsxs)("span",{className:"inline-flex shrink-0 items-center gap-1 rounded-full border border-[#31c98b]/20 bg-[#31c98b]/10 px-2 py-1 text-[11px] font-bold text-[#e7fff3]",children:[(0,o.jsx)("span",{children:e.avatar}),e.name]},`${e.name}-${t}`))}),"equal"===H&&(0,o.jsx)("div",{className:"grid gap-2",children:ey.map(e=>(0,o.jsxs)("div",{className:"flex justify-between rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 px-3 py-2 text-sm font-bold text-[#f4fff8]",children:[(0,o.jsx)("span",{children:e.name}),(0,o.jsx)("span",{className:"text-[#31c98b]",children:U(e.total)})]},e.id))}),"items"===H&&(0,o.jsx)("div",{className:"space-y-2",children:Z.map(e=>{let t=ee[e.key],r=null!=t;return(0,o.jsxs)("button",{type:"button",onClick:()=>et(r=>({...r,[e.key]:null==t?0:t>=V-1?null:t+1})),className:"flex w-full items-center justify-between gap-3 rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 px-3 py-2 text-left",children:[(0,o.jsx)("span",{className:"min-w-0 truncate text-sm font-bold text-[#f4fff8]",children:e.name}),(0,o.jsx)("span",{className:"text-sm font-black text-[#31c98b]",children:U(e.amount)}),(0,o.jsx)("span",{className:`rounded-full px-2 py-1 text-[10px] font-black ${r?"bg-[#31c98b] text-[#02110c]":"border border-[#31c98b]/30 text-[#e7fff3]"}`,children:r?G[t]?.name||"Assigned":"Unassigned"})]},e.key)})}),"shares"===H&&(0,o.jsxs)("div",{className:"space-y-3",children:[ea.slice(0,V).map((e,t)=>(0,o.jsxs)("div",{className:"rounded-2xl border border-[#31c98b]/12 bg-[#04130f]/58 p-3",children:[(0,o.jsxs)("div",{className:"mb-2 flex items-center justify-between text-sm font-bold text-[#f4fff8]",children:[(0,o.jsx)("span",{children:G[t]?.name||`Guest ${t+1}`}),(0,o.jsx)("span",{className:"text-[#31c98b]",children:U(el*(Number(e||0)/100))})]}),(0,o.jsxs)("div",{className:"flex items-center gap-2",children:[(0,o.jsx)("input",{type:"number",min:"0",max:"100",value:e,onChange:e=>en(r=>r.map((r,a)=>a===t?Number(e.target.value):r)),className:"h-9 w-20 rounded-full border border-[#31c98b]/25 bg-[#04130f]/70 px-3 text-xs font-bold text-[#f4fff8]"}),(0,o.jsx)("input",{type:"range",min:"0",max:"100",step:"1",value:e,onChange:e=>en(r=>r.map((r,a)=>a===t?Number(e.target.value):r)),className:"flex-1 accent-[#31c98b]"})]})]},t)),(0,o.jsx)("div",{className:`mx-auto w-fit rounded-full px-3 py-1.5 text-xs font-black ${100===ei?"bg-[#31c98b] text-[#02110c]":"border border-[#ffb4a8]/50 text-[#ffb4a8]"}`,children:100===ei?"100% ready":ei<100?`${100-ei}% remaining`:`Over by ${ei-100}%`})]}),(0,o.jsx)(tE,{disabled:!es,onClick:F,children:"Review split"})]}):"split-review"===t&&(eb=(0,o.jsxs)(tI,{className:"space-y-4",children:[(0,o.jsxs)("div",{children:[(0,o.jsx)("h2",{className:"text-2xl font-black text-[#f4fff8]",children:"Review split"}),(0,o.jsx)("p",{className:"text-sm font-semibold text-[#bdebd2]",children:"Choose a payer and continue to payment."})]}),W.map(e=>(0,o.jsxs)("div",{className:`space-y-2 rounded-3xl border p-3 ${Y===e.id?"border-[#31c98b] bg-[#31c98b]/12":"border-[#31c98b]/14 bg-[#04130f]/58"}`,children:[(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsxs)("div",{className:"flex items-center gap-2",children:[(0,o.jsx)("span",{className:"flex h-8 w-8 items-center justify-center rounded-full bg-[#31c98b]/20 text-sm font-black text-[#f4fff8]",children:e.avatar}),(0,o.jsx)("span",{className:"font-black text-[#f4fff8]",children:e.name})]}),(0,o.jsx)("span",{className:"rounded-full border border-[#31c98b]/20 px-2 py-1 text-[11px] font-bold text-[#dfffee]",children:e.status})]}),(0,o.jsxs)("div",{className:"space-y-1 text-xs text-[#c9f6df]",children:[e.items.map((t,r)=>(0,o.jsxs)("div",{className:"flex justify-between gap-2",children:[(0,o.jsx)("span",{className:"truncate",children:t.name}),(0,o.jsx)("span",{children:U(t.amount)})]},`${e.id}-${r}`)),e.tax>0&&(0,o.jsxs)("div",{className:"flex justify-between",children:[(0,o.jsx)("span",{children:"Proportional service/tax"}),(0,o.jsx)("span",{children:U(e.tax)})]})]}),(0,o.jsxs)("div",{className:"flex justify-between border-t border-[#31c98b]/14 pt-2 text-sm font-black text-[#f4fff8]",children:[(0,o.jsx)("span",{children:"Total"}),(0,o.jsx)("span",{className:"text-[#31c98b]",children:U(e.total)})]}),Y===e.id?(0,o.jsx)(tE,{onClick:()=>L("payment"),children:"Pay my share"}):(0,o.jsx)(tN,{onClick:()=>Q(e.id),children:"Select payer"})]},e.id)),(0,o.jsxs)("div",{className:"grid grid-cols-1 gap-2 sm:grid-cols-2",children:[(0,o.jsxs)(tN,{onClick:ep,className:"flex items-center justify-center gap-2",children:[(0,o.jsx)(er,{className:"h-4 w-4"})," Send payment link to others"]}),(0,o.jsxs)(tN,{onClick:eu,className:"flex items-center justify-center gap-2",children:[(0,o.jsx)(eo,{className:"h-4 w-4"})," Show QR/share link"]})]})]})),(0,o.jsxs)("div",{"data-pmd-checkout-theme-root":"1","data-pmd-checkout-theme":"modern_green","data-pmd-modern-green-checkout-shell":"1",className:"fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md",style:{background:"radial-gradient(circle at 82% 8%, rgba(6,62,43,.26) 0%, rgba(2,26,17,.13) 24%, rgba(0,4,3,.94) 54%, rgba(0,0,0,.98) 100%)"},children:[(0,o.jsx)("style",{children:`
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
        `}),(0,o.jsxs)("div",{className:"relative max-h-[90vh] w-full max-w-md overflow-y-auto",children:[(0,o.jsx)("button",{type:"button",onClick:r,className:"absolute right-3 top-3 z-20 rounded-full border border-[#31c98b]/30 bg-[#04130f]/90 px-3 py-1 text-xs font-bold text-[#e7fff3] shadow-[0_10px_24px_rgba(0,0,0,.25)]",children:"Close"}),eb]})]})}function tP(e){if(!e?.isOpen)return null;let t=function(e){let{isOpen:t,isKazenJapaneseCheckoutVisual:r,isModernGreenCheckoutVisual:a,checkoutStep:n,onClose:i,hasPersonalItems:s,preferPersonalReview:l,modernGreenPersonalItems:c,tableDraft:d,modernGreenTableDraftItems:m,modernGreenTableDraftTotal:p,submittedSnapshot:u,modernGreenSubmittedItems:h,estimatedMinutes:f,subtotal:y,finalTotal:g,payableTotal:b,paymentBaseAmount:k,paymentPayableTotal:v,paymentTipAmount:x,paymentCouponDiscount:z,paidTipAmount:C,paidCouponDiscount:w,paidAmountTotal:S,submittedBaseTotal:_,paymentTipPercentage:E,paymentCustomTip:N,tipSettings:I,couponCode:T,setCouponCode:A,setCouponError:j,appliedCoupon:P,couponError:B,couponLoading:R,setCouponLoading:O,validateCoupon:L,removeCoupon:D,handleModernGreenApplyCoupon:U,handleModernGreenRemoveCoupon:M,visiblePaymentMethods:F,loadingPayments:V,selectedPaymentMethod:K,handlePaymentMethodSelect:q,renderPaymentForm:H,renderPaymentButton:G,handleConfirmMyItems:$,handleSubmitTableDraft:W,handlePayment:Y,setCheckoutStep:Q,startSplitFlow:X,chooseSplitMethod:Z,goToSplitReview:J,splitGuestCount:ee,addSplitGuest:et,removeSplitGuest:er,splitMethod:ea,splitGuestProfiles:eo,equalSplitPeople:en,activeSplitPeople:ei,selectedSplitPersonId:es,setSelectedSplitPersonId:el,selectedSplitPerson:ec,splitSourceItems:ed,itemAssignments:em,setItemAssignments:ep,sharePercents:eu,setSharePercents:eh,sharePercentTotal:ef,canConfirmSplitMethod:ey,splitGrandTotal:eg,updatePaymentTipPercentage:eb,updatePaymentCustomTip:ek,toast:ev,reviewRating:ex,setReviewRating:ez,reviewComment:eC,setReviewComment:ew,reviewSubmitStatus:eS,setReviewSubmitStatus:e_,reviewSubmitMessage:eE,canSubmitReview:eN,handleSubmitReview:eI,merchantSettings:eA,activeReviewSharePlatforms:ej,handleDownloadBusinessInvoice:eP,invoiceDownloadStatus:eB,invoiceDownloadMessage:eR,isDarkTheme:eO}=e;return t?r?(0,o.jsx)(eT,{checkoutStep:n,onClose:i,hasPersonalItems:s||l,personalItems:c,tableDraft:d,tableDraftItems:m,tableDraftTotal:p,submittedSnapshot:u,submittedItems:h,estimatedMinutes:f,subtotal:y,finalTotal:g,payableTotal:b,paymentBaseAmount:k,paymentPayableTotal:v,paymentTipAmount:x,paymentCouponDiscount:z,paidTipAmount:C,paidCouponDiscount:w,paidAmountTotal:S,submittedBaseTotal:_,paymentTipPercentage:E,paymentCustomTip:N,tipPercentages:I.percentages||[5,10],tipEnabled:!!I.enabled,couponCode:T,setCouponCode:e=>{A(e),j(null)},appliedCoupon:P,couponError:B,couponLoading:R,setCouponError:j,setCouponLoading:O,validateCoupon:L,onApplyCoupon:U,onRemoveCoupon:M,removeCoupon:D,visiblePaymentMethods:F,loadingPayments:V,selectedPaymentMethod:K,onPaymentMethodSelect:q,renderPaymentForm:H,renderPaymentButton:G,handleConfirmMyItems:$,handleSubmitTableDraft:W,handlePayment:Y,setCheckoutStep:Q,startSplitFlow:X,chooseSplitMethod:Z,goToSplitReview:J,splitGuestCount:ee,addSplitGuest:et,removeSplitGuest:er,splitMethod:ea,splitGuestProfiles:eo,equalSplitPeople:en||[],activeSplitPeople:ei,selectedSplitPersonId:es,setSelectedSplitPersonId:el,selectedSplitPerson:ec,splitSourceItems:ed,itemAssignments:em,setItemAssignments:ep,sharePercents:eu,setSharePercents:eh,sharePercentTotal:ef,canConfirmSplitMethod:ey,splitGrandTotal:eg,updatePaymentTipPercentage:eb,updatePaymentCustomTip:ek,onPaymentLinks:()=>ev({title:"Payment links ready",description:"Share links can be generated by the payment API when multi-device checkout is enabled."}),onQrShare:()=>ev({title:"QR share",description:"Ask guests to scan the table QR to pay their own share."}),reviewRating:ex,setReviewRating:ez,reviewComment:eC,setReviewComment:ew,reviewSubmitStatus:eS,setReviewSubmitStatus:e_,reviewSubmitMessage:eE,canSubmitReview:eN,handleSubmitReview:eI,merchantSettings:eA,activeReviewSharePlatforms:ej,handleDownloadBusinessInvoice:eP,invoiceDownloadStatus:eB,invoiceDownloadMessage:eR,isDarkTheme:eO}):a?(0,o.jsx)(tj,{checkoutStep:n,onClose:i,hasPersonalItems:s||l,personalItems:c,tableDraft:d,tableDraftItems:m,tableDraftTotal:p,submittedSnapshot:u,submittedItems:h,estimatedMinutes:f,subtotal:y,finalTotal:g,payableTotal:b,paymentBaseAmount:k,paymentPayableTotal:v,paymentTipAmount:x,paymentCouponDiscount:z,paymentTipPercentage:E,paymentCustomTip:N,tipPercentages:I.percentages||[5,10],tipEnabled:!!I.enabled,couponCode:T,setCouponCode:e=>{A(e),j(null)},appliedCoupon:P,couponError:B,couponLoading:R,onApplyCoupon:U,onRemoveCoupon:M,visiblePaymentMethods:F,loadingPayments:V,selectedPaymentMethod:K,onPaymentMethodSelect:q,renderPaymentForm:H,renderPaymentButton:G,handleConfirmMyItems:$,handleSubmitTableDraft:W,handlePayment:Y,setCheckoutStep:Q,startSplitFlow:X,chooseSplitMethod:Z,goToSplitReview:J,splitGuestCount:ee,addSplitGuest:et,removeSplitGuest:er,splitMethod:ea,splitGuestProfiles:eo,equalSplitPeople:en||[],activeSplitPeople:ei,selectedSplitPersonId:es,setSelectedSplitPersonId:el,selectedSplitPerson:ec,splitSourceItems:ed,itemAssignments:em,setItemAssignments:ep,sharePercents:eu,setSharePercents:eh,sharePercentTotal:ef,canConfirmSplitMethod:ey,splitGrandTotal:eg,updatePaymentTipPercentage:eb,updatePaymentCustomTip:ek,onPaymentLinks:()=>ev({title:"Payment links ready",description:"Share links can be generated by the payment API when multi-device checkout is enabled."}),onQrShare:()=>ev({title:"QR share",description:"Ask guests to scan the table QR to pay their own share."}),isDarkTheme:eO}):null:null}(e);return t||(0,o.jsx)(tC,{...e})}(r9=at||(at={})).INITIAL="initial",r9.PENDING="pending",r9.REJECTED="rejected",r9.RESOLVED="resolved",(r7=ar||(ar={})).LOADING_STATUS="setLoadingStatus",r7.RESET_OPTIONS="resetOptions",r7.SET_BRAINTREE_INSTANCE="braintreeInstance",(ae=aa||(aa={})).NUMBER="number",ae.CVV="cvv",ae.EXPIRATION_DATE="expirationDate",ae.EXPIRATION_MONTH="expirationMonth",ae.EXPIRATION_YEAR="expirationYear",ae.POSTAL_CODE="postalCode";var tB=function(e,t){return(tB=Object.setPrototypeOf||({__proto__:[]})instanceof Array&&function(e,t){e.__proto__=t}||function(e,t){for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r])})(e,t)},tR=function(){return(tR=Object.assign||function(e){for(var t,r=1,a=arguments.length;r<a;r++)for(var o in t=arguments[r])Object.prototype.hasOwnProperty.call(t,o)&&(e[o]=t[o]);return e}).apply(this,arguments)};function tO(e,t){var r={};for(var a in e)Object.prototype.hasOwnProperty.call(e,a)&&0>t.indexOf(a)&&(r[a]=e[a]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols)for(var o=0,a=Object.getOwnPropertySymbols(e);o<a.length;o++)0>t.indexOf(a[o])&&Object.prototype.propertyIsEnumerable.call(e,a[o])&&(r[a[o]]=e[a[o]]);return r}function tL(e,t,r){if(r||2==arguments.length)for(var a,o=0,n=t.length;o<n;o++)!a&&o in t||(a||(a=Array.prototype.slice.call(t,0,o)),a[o]=t[o]);return e.concat(a||Array.prototype.slice.call(t))}"function"==typeof SuppressedError&&SuppressedError;var tD="data-react-paypal-script-id",tU="react-paypal-js",tM="dataNamespace",tF="dataSdkIntegrationSource",tV="paypal";function tK(e){return void 0===e&&(e=tV),window[e]}function tq(e){var t=e.reactComponentName,r=e.sdkComponentKey,a=e.sdkRequestedComponents,o=void 0===a?"":a,n=e.sdkDataNamespace,i=r.charAt(0).toUpperCase().concat(r.substring(1)),s="Unable to render <".concat(t," /> because window.").concat(void 0===n?tV:n,".").concat(i," is undefined."),l="string"==typeof o?o:o.join(",");if(!l.includes(r)){var c=[l,r].filter(Boolean).join();s+="\nTo fix the issue, add '".concat(r,"' to the list of components passed to the parent PayPalScriptProvider:")+"\n`<PayPalScriptProvider options={{ components: '".concat(c,"'}}>`.")}return s}function tH(e){e[tD];var t=tO(e,[tD+""]);return"react-paypal-js-".concat(function(e){for(var t="",r=0;r<e.length;r++){var a=e[r].charCodeAt(0)*r;e[r+1]&&(a+=e[r+1].charCodeAt(0)*(r-1)),t+=String.fromCharCode(97+Math.abs(a)%26)}return t}(JSON.stringify(t)))}function tG(e,t){var r,a,o,n;switch(t.type){case ar.LOADING_STATUS:if("object"==typeof t.value)return tR(tR({},e),{loadingStatus:t.value.state,loadingStatusErrorMessage:t.value.message});return tR(tR({},e),{loadingStatus:t.value});case ar.RESET_OPTIONS:return o=e.options[tD],(null==(n=self.document.querySelector("script[".concat(tD,'="').concat(o,'"]')))?void 0:n.parentNode)&&n.parentNode.removeChild(n),tR(tR({},e),{loadingStatus:at.PENDING,options:tR(tR(((r={})[tF]=tU,r),t.value),((a={})[tD]="".concat(tH(t.value)),a))});case ar.SET_BRAINTREE_INSTANCE:return tR(tR({},e),{braintreePayPalCheckoutInstance:t.value});default:return e}}var t$=(0,n.createContext)(null);function tW(){var e=function(e){if("function"==typeof(null==e?void 0:e.dispatch)&&0!==e.dispatch.length)return e;throw Error("usePayPalScriptReducer must be used within a PayPalScriptProvider")}((0,n.useContext)(t$));return[tR(tR({},e),{isInitial:e.loadingStatus===at.INITIAL,isPending:e.loadingStatus===at.PENDING,isResolved:e.loadingStatus===at.RESOLVED,isRejected:e.loadingStatus===at.REJECTED}),e.dispatch]}(0,n.createContext)({});var tY=function(e){if("function"!=typeof e&&null!==e)throw TypeError("Class extends value "+String(e)+" is not a constructor or null");function t(){this.constructor=r}function r(t){var r=e.call(this,t)||this;return r.state={hasError:!1},r}return tB(r,e),r.prototype=null===e?Object.create(e):(t.prototype=e.prototype,new t),r.getDerivedStateFromError=function(){return{hasError:!0}},r.prototype.componentDidCatch=function(e,t){console.error("Error in PayPalButtons component:",e,t),"function"==typeof this.props.onError&&this.props.onError({message:e.message,name:e.name,stack:e.stack,componentStack:t.componentStack})},r.prototype.render=function(){return this.state.hasError?null:this.props.children},r}(n.Component),tQ=function(e){var t,r,a=e.className,o=e.disabled,i=void 0!==o&&o,s=e.children,l=e.forceReRender,c=tO(e,["className","disabled","children","forceReRender"]),d="".concat(void 0===a?"":a," ").concat(i?"paypal-buttons-disabled":"").trim(),m=(0,n.useRef)(null),p=(0,n.useRef)(null),u=((t=(0,n.useRef)(new Proxy({},{get:function(e,t,r){return"function"==typeof e[t]?function(){for(var r=[],a=0;a<arguments.length;a++)r[a]=arguments[a];return e[t].apply(e,r)}:Reflect.get(e,t,r)}}))).current=Object.assign(t.current,c),t.current),h=tW()[0],f=h.isResolved,y=h.options,g=(0,n.useState)(null),b=g[0],k=g[1],v=(0,n.useState)(!0),x=v[0],z=v[1],C=(0,n.useState)(null)[1];function w(){null!==p.current&&p.current.close().catch(function(){})}return(null==(r=p.current)?void 0:r.updateProps)&&p.current.updateProps({message:c.message}),(0,n.useEffect)(function(){if(!1===f)return w;var e=tK(y.dataNamespace);if(void 0===e||void 0===e.Buttons)return C(function(){throw Error(tq({reactComponentName:tX.displayName,sdkComponentKey:"buttons",sdkRequestedComponents:y.components,sdkDataNamespace:y[tM]}))}),w;try{p.current=e.Buttons(tR(tR({},u),{onInit:function(e,t){k(t),"function"==typeof c.onInit&&c.onInit(e,t)}}))}catch(e){return C(function(){throw Error("Failed to render <PayPalButtons /> component. Failed to initialize:  ".concat(e))})}return!1===p.current.isEligible()?z(!1):m.current&&p.current.render(m.current).catch(function(e){null!==m.current&&0!==m.current.children.length&&C(function(){throw Error("Failed to render <PayPalButtons /> component. ".concat(e))})}),w},tL(tL([f],void 0===l?[]:l,!0),[c.fundingSource],!1)),(0,n.useEffect)(function(){null!==b&&(!0===i?b.disable().catch(function(){}):b.enable().catch(function(){}))},[i,b]),n.default.createElement(n.default.Fragment,null,x?n.default.createElement("div",{ref:m,style:i?{opacity:.38}:{},className:d}):s)};tQ.displayName="PayPalButtons";var tX=function(e){return n.default.createElement(tY,{onError:e.onError},n.default.createElement(tQ,tR({},e)))};function tZ(e,t){void 0===t&&(t={});var r=document.createElement("script");return r.src=e,Object.keys(t).forEach(function(e){r.setAttribute(e,t[e]),"data-csp-nonce"===e&&r.setAttribute("nonce",t["data-csp-nonce"])}),r}tX.displayName="PayPalButtons","function"==typeof SuppressedError&&SuppressedError;function tJ(e,t){if("object"!=typeof e||null===e)throw Error("Expected an options object.");var r=e.environment;if(r&&"production"!==r&&"sandbox"!==r)throw Error('The `environment` option must be either "production" or "sandbox".');if(void 0!==t&&"function"!=typeof t)throw Error("Expected PromisePonyfill to be a function.")}var t0=function(e){var t=e.className,r=e.children,a=tO(e,["className","children"]),o=tW()[0],i=o.isResolved,s=o.options,l=(0,n.useRef)(null),c=(0,n.useState)(!0),d=c[0],m=c[1],p=(0,n.useState)(null)[1],u=function(e){var t=l.current;if(!t||!e.isEligible())return m(!1);t.firstChild&&t.removeChild(t.firstChild),e.render(t).catch(function(e){null!==t&&0!==t.children.length&&p(function(){throw Error("Failed to render <PayPalMarks /> component. ".concat(e))})})};return(0,n.useEffect)(function(){if(!1!==i){var e=tK(s[tM]);if(void 0===e||void 0===e.Marks)return p(function(){throw Error(tq({reactComponentName:t0.displayName,sdkComponentKey:"marks",sdkRequestedComponents:s.components,sdkDataNamespace:s[tM]}))});u(e.Marks(tR({},a)))}},[i,a.fundingSource]),n.default.createElement(n.default.Fragment,null,d?n.default.createElement("div",{ref:l,className:void 0===t?"":t}):r)};t0.displayName="PayPalMarks";var t1=function(e){var t=e.className,r=e.forceReRender,a=tO(e,["className","forceReRender"]),o=tW()[0],i=o.isResolved,s=o.options,l=(0,n.useRef)(null),c=(0,n.useRef)(null),d=(0,n.useState)(null)[1];return(0,n.useEffect)(function(){if(!1!==i){var e=tK(s[tM]);if(void 0===e||void 0===e.Messages)return d(function(){throw Error(tq({reactComponentName:t1.displayName,sdkComponentKey:"messages",sdkRequestedComponents:s.components,sdkDataNamespace:s[tM]}))});c.current=e.Messages(tR({},a)),c.current.render(l.current).catch(function(e){null!==l.current&&0!==l.current.children.length&&d(function(){throw Error("Failed to render <PayPalMessages /> component. ".concat(e))})})}},tL([i],void 0===r?[]:r,!0)),n.default.createElement("div",{ref:l,className:void 0===t?"":t})};t1.displayName="PayPalMessages";var t2=function(e){var t,r=e.options,a=void 0===r?{clientId:"test"}:r,o=e.children,i=e.deferLoading,s=void 0!==i&&i,l=(0,n.useReducer)(tG,{options:tR(tR({},a),((t={}).dataJsSdkLibrary=tU,t[tF]=tU,t[tD]="".concat(tH(a)),t)),loadingStatus:s?at.INITIAL:at.PENDING}),c=l[0],d=l[1];return(0,n.useEffect)(function(){if(!1===s&&c.loadingStatus===at.INITIAL)return d({type:ar.LOADING_STATUS,value:at.PENDING});if(c.loadingStatus===at.PENDING){var e=!0;return(function(e,t){if(void 0===t&&(t=Promise),tJ(e,t),"u"<typeof document)return t.resolve(null);var r,a,o,n,i,s,l,c,d,m,p=(n=Object.prototype.hasOwnProperty.call(e,"sdkBaseUrl")?e.sdkBaseUrl:void 0,i=e.environment,e.sdkBaseUrl,s=function(e,t){var r={};for(var a in e)Object.prototype.hasOwnProperty.call(e,a)&&0>t.indexOf(a)&&(r[a]=e[a]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols)for(var o=0,a=Object.getOwnPropertySymbols(e);o<a.length;o++)0>t.indexOf(a[o])&&Object.prototype.propertyIsEnumerable.call(e,a[o])&&(r[a[o]]=e[a[o]]);return r}(e,["environment","sdkBaseUrl"]),l=n||("sandbox"===i?"https://www.sandbox.paypal.com/sdk/js":"https://www.paypal.com/sdk/js"),d=(c=Object.keys(s).filter(function(e){return void 0!==s[e]&&null!==s[e]&&""!==s[e]}).reduce(function(e,t){var r=s[t].toString();return"data"===(t=t.replace(/[A-Z]+(?![a-z])|[A-Z]/g,function(e,t){return(t?"-":"")+e.toLowerCase()})).substring(0,4)||"crossorigin"===t?e.attributes[t]=r:e.queryParams[t]=r,e},{queryParams:{},attributes:{}})).queryParams,m=c.attributes,d["merchant-id"]&&-1!==d["merchant-id"].indexOf(",")&&(m["data-merchant-id"]=d["merchant-id"],d["merchant-id"]="*"),{url:"".concat(l,"?").concat((a="",Object.keys(r=d).forEach(function(e){0!==a.length&&(a+="&"),a+=e+"="+r[e]}),a)),attributes:m}),u=p.url,h=p.attributes,f=h["data-namespace"]||"paypal",y=(o=f,window[o]);return(h["data-js-sdk-library"]||(h["data-js-sdk-library"]="paypal-js"),function(e,t){var r=document.querySelector('script[src="'.concat(e,'"]'));if(null===r)return null;var a=tZ(e,t),o=r.cloneNode();if(delete o.dataset.uidAuto,Object.keys(o.dataset).length!==Object.keys(a.dataset).length)return null;var n=!0;return Object.keys(o.dataset).forEach(function(e){o.dataset[e]!==a.dataset[e]&&(n=!1)}),n?r:null}(u,h)&&y)?t.resolve(y):(function(e,t){void 0===t&&(t=Promise),tJ(e,t);var r=e.url,a=e.attributes;if("string"!=typeof r||0===r.length)throw Error("Invalid url.");if(void 0!==a&&"object"!=typeof a)throw Error("Expected attributes to be an object.");return new t(function(e,t){var o,n,i,s,l,c;if("u"<typeof document)return e();n=(o={url:r,attributes:a,onSuccess:function(){return e()},onError:function(){return t(Error('The script "'.concat(r,'" failed to load. Check the HTTP status code and response body in DevTools to learn more.')))}}).url,i=o.attributes,s=o.onSuccess,l=o.onError,(c=tZ(n,i)).onerror=l,c.onload=s,document.head.insertBefore(c,document.head.firstElementChild)})})({url:u,attributes:h},t).then(function(){var e,t=(e=f,window[e]);if(t)return t;throw Error("The window.".concat(f," global variable is not available."))})})(c.options).then(function(){e&&d({type:ar.LOADING_STATUS,value:at.RESOLVED})}).catch(function(t){console.error("".concat("Failed to load the PayPal JS SDK script."," ").concat(t)),e&&d({type:ar.LOADING_STATUS,value:{state:at.REJECTED,message:String(t)}})}),function(){e=!1}}},[c.options,s,c.loadingStatus]),n.default.createElement(t$.Provider,{value:tR(tR({},c),{dispatch:d})},o)};function t5(){}(0,n.createContext)({cardFieldsForm:null,fields:{},registerField:t5,unregisterField:t5});var t3=e.i(88575);function t4(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),r.push.apply(r,a)}return r}function t8(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?t4(Object(r),!0).forEach(function(t){t9(e,t,r[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):t4(Object(r)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))})}return e}function t6(e){return(t6="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function t9(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function t7(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var r,a,o=e&&("u">typeof Symbol&&e[Symbol.iterator]||e["@@iterator"]);if(null!=o){var n=[],i=!0,s=!1;try{for(o=o.call(e);!(i=(r=o.next()).done)&&(n.push(r.value),!t||n.length!==t);i=!0);}catch(e){s=!0,a=e}finally{try{i||null==o.return||o.return()}finally{if(s)throw a}}return n}}(e,t)||function(e,t){if(e){if("string"==typeof e)return re(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);if("Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r)return Array.from(e);if("Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))return re(e,t)}}(e,t)||function(){throw TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function re(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,a=Array(t);r<t;r++)a[r]=e[r];return a}var rt=function(e,t,r){var a=!!r,o=n.default.useRef(r);n.default.useEffect(function(){o.current=r},[r]),n.default.useEffect(function(){if(!a||!e)return function(){};var r=function(){o.current&&o.current.apply(o,arguments)};return e.on(t,r),function(){e.off(t,r)}},[a,t,e,o])},rr=function(e){var t=n.default.useRef(e);return n.default.useEffect(function(){t.current=e},[e]),t.current},ra=function(e){return null!==e&&"object"===t6(e)},ro="[object Object]",rn=function e(t,r){if(!ra(t)||!ra(r))return t===r;var a=Array.isArray(t);if(a!==Array.isArray(r))return!1;var o=Object.prototype.toString.call(t)===ro;if(o!==(Object.prototype.toString.call(r)===ro))return!1;if(!o&&!a)return t===r;var n=Object.keys(t),i=Object.keys(r);if(n.length!==i.length)return!1;for(var s={},l=0;l<n.length;l+=1)s[n[l]]=!0;for(var c=0;c<i.length;c+=1)s[i[c]]=!0;var d=Object.keys(s);return d.length===n.length&&d.every(function(a){return e(t[a],r[a])})},ri=function(e,t,r){return ra(e)?Object.keys(e).reduce(function(a,o){var n=!ra(t)||!rn(e[o],t[o]);return r.includes(o)?(n&&console.warn("Unsupported prop change: options.".concat(o," is not a mutable property.")),a):n?t8(t8({},a||{}),{},t9({},o,e[o])):a},null):null},rs="Invalid prop `stripe` supplied to `Elements`. We recommend using the `loadStripe` utility from `@stripe/stripe-js`. See https://stripe.com/docs/stripe-js/react#elements-props-stripe for details.",rl=function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:rs;if(null===e||ra(e)&&"function"==typeof e.elements&&"function"==typeof e.createToken&&"function"==typeof e.createPaymentMethod&&"function"==typeof e.confirmCardPayment)return e;throw Error(t)},rc=function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:rs;if(ra(e)&&"function"==typeof e.then)return{tag:"async",stripePromise:Promise.resolve(e).then(function(e){return rl(e,t)})};var r=rl(e,t);return null===r?{tag:"empty"}:{tag:"sync",stripe:r}},rd=function(e){e&&e._registerWrapper&&e.registerAppInfo&&(e._registerWrapper({name:"react-stripe-js",version:"5.6.1"}),e.registerAppInfo({name:"react-stripe-js",version:"5.6.1",url:"https://stripe.com/docs/stripe-js/react"}))},rm=n.default.createContext(null);rm.displayName="ElementsContext";var rp=function(e,t){if(!e)throw Error("Could not find Elements context; You need to wrap the part of your app that ".concat(t," in an <Elements> provider."));return e},ru=function(e){var t=e.stripe,r=e.options,a=e.children,o=n.default.useMemo(function(){return rc(t)},[t]),i=t7(n.default.useState(function(){return{stripe:"sync"===o.tag?o.stripe:null,elements:"sync"===o.tag?o.stripe.elements(r):null}}),2),s=i[0],l=i[1];n.default.useEffect(function(){var e=!0,t=function(e){l(function(t){return t.stripe?t:{stripe:e,elements:e.elements(r)}})};return"async"!==o.tag||s.stripe?"sync"!==o.tag||s.stripe||t(o.stripe):o.stripePromise.then(function(r){r&&e&&t(r)}),function(){e=!1}},[o,s,r]);var c=rr(t);n.default.useEffect(function(){null!==c&&c!==t&&console.warn("Unsupported prop change on Elements: You cannot change the `stripe` prop after setting it.")},[c,t]);var d=rr(r);return n.default.useEffect(function(){if(s.elements){var e=ri(r,d,["clientSecret","fonts"]);e&&s.elements.update(e)}},[r,d,s.elements]),n.default.useEffect(function(){rd(s.stripe)},[s.stripe]),n.default.createElement(rm.Provider,{value:s},a)};ru.propTypes={stripe:t3.default.any,options:t3.default.object};var rh=function(){var e;return(e="calls useElements()",rp(n.default.useContext(rm),e)).elements};t3.default.func.isRequired;var rf=n.default.createContext(null);rf.displayName="CheckoutContext",t3.default.any,t3.default.shape({clientSecret:t3.default.oneOfType([t3.default.string,t3.default.instanceOf(Promise)]).isRequired,elementsOptions:t3.default.object}).isRequired;var ry=function(e){var t=n.default.useContext(rf),r=n.default.useContext(rm);if(!t)return rp(r,e);if(!r)return t;throw Error("You cannot wrap the part of your app that ".concat(e," in both <CheckoutProvider> and <Elements> providers."))},rg=["mode"],rb=function(e,t){var r="".concat(e.charAt(0).toUpperCase()+e.slice(1),"Element"),a=t?function(e){ry("mounts <".concat(r,">"));var t=e.id,a=e.className;return n.default.createElement("div",{id:t,className:a})}:function(t){var a,o=t.id,i=t.className,s=t.options,l=void 0===s?{}:s,c=t.onBlur,d=t.onFocus,m=t.onReady,p=t.onChange,u=t.onEscape,h=t.onClick,f=t.onLoadError,y=t.onLoaderStart,g=t.onNetworksChange,b=t.onConfirm,k=t.onCancel,v=t.onShippingAddressChange,x=t.onShippingRateChange,z=t.onSavedPaymentMethodRemove,C=t.onSavedPaymentMethodUpdate,w=ry("mounts <".concat(r,">")),S="elements"in w?w.elements:null,_="checkoutState"in w?w.checkoutState:null,E=(null==_?void 0:_.type)==="success"||(null==_?void 0:_.type)==="loading"?_.sdk:null,N=t7(n.default.useState(null),2),I=N[0],T=N[1],A=n.default.useRef(null),j=n.default.useRef(null);rt(I,"blur",c),rt(I,"focus",d),rt(I,"escape",u),rt(I,"click",h),rt(I,"loaderror",f),rt(I,"loaderstart",y),rt(I,"networkschange",g),rt(I,"confirm",b),rt(I,"cancel",k),rt(I,"shippingaddresschange",v),rt(I,"shippingratechange",x),rt(I,"savedpaymentmethodremove",z),rt(I,"savedpaymentmethodupdate",C),rt(I,"change",p),m&&(a="expressCheckout"===e?m:function(){m(I)}),rt(I,"ready",a),n.default.useLayoutEffect(function(){if(null===A.current&&null!==j.current&&(S||E)){var t=null;if(E)switch(e){case"paymentForm":t=E.createPaymentFormElement(l);break;case"payment":t=E.createPaymentElement(l);break;case"address":if("mode"in l){var a=l.mode,o=function(e,t){if(null==e)return{};var r,a,o=function(e,t){if(null==e)return{};var r,a,o={},n=Object.keys(e);for(a=0;a<n.length;a++)r=n[a],t.indexOf(r)>=0||(o[r]=e[r]);return o}(e,t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);for(a=0;a<n.length;a++)r=n[a],!(t.indexOf(r)>=0)&&Object.prototype.propertyIsEnumerable.call(e,r)&&(o[r]=e[r])}return o}(l,rg);if("shipping"===a)t=E.createShippingAddressElement(o);else if("billing"===a)t=E.createBillingAddressElement(o);else throw Error("Invalid options.mode. mode must be 'billing' or 'shipping'.")}else throw Error("You must supply options.mode. mode must be 'billing' or 'shipping'.");break;case"expressCheckout":t=E.createExpressCheckoutElement(l);break;case"currencySelector":t=E.createCurrencySelectorElement();break;case"taxId":t=E.createTaxIdElement(l);break;default:throw Error("Invalid Element type ".concat(r,". You must use either the <PaymentElement />, <AddressElement options={{mode: 'shipping'}} />, <AddressElement options={{mode: 'billing'}} />, or <ExpressCheckoutElement />."))}else S&&(t=S.create(e,l));A.current=t,T(t),t&&t.mount(j.current)}},[S,E,l]);var P=rr(l);return n.default.useEffect(function(){if(A.current){var e=ri(l,P,["paymentRequest"]);e&&"update"in A.current&&A.current.update(e)}},[l,P]),n.default.useLayoutEffect(function(){return function(){if(A.current&&"function"==typeof A.current.destroy)try{A.current.destroy(),A.current=null}catch(e){}}},[]),n.default.createElement("div",{id:o,className:i,ref:j})};return a.propTypes={id:t3.default.string,className:t3.default.string,onChange:t3.default.func,onBlur:t3.default.func,onFocus:t3.default.func,onReady:t3.default.func,onEscape:t3.default.func,onClick:t3.default.func,onLoadError:t3.default.func,onLoaderStart:t3.default.func,onNetworksChange:t3.default.func,onConfirm:t3.default.func,onCancel:t3.default.func,onShippingAddressChange:t3.default.func,onShippingRateChange:t3.default.func,onSavedPaymentMethodRemove:t3.default.func,onSavedPaymentMethodUpdate:t3.default.func,options:t3.default.object},a.displayName=r,a.__elementType=e,a},rk="u"<typeof window;n.default.createContext(null).displayName="EmbeddedCheckoutProviderContext";var rv=function(){return ry("calls useStripe()").stripe};rb("auBankAccount",rk);var rx=rb("card",rk);rb("cardNumber",rk),rb("cardExpiry",rk),rb("cardCvc",rk),rb("iban",rk),rb("payment",rk),rb("expressCheckout",rk);var rz=rb("paymentRequestButton",rk);rb("linkAuthentication",rk),rb("address",rk),rb("shippingAddress",rk),rb("paymentMethodMessaging",rk),rb("taxId",rk);var rC=e.i(30756);let rw=(0,X.default)("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);var rS=e.i(42350);function r_({paymentData:e,onPaymentComplete:t,onPaymentError:r,className:a,footerSlot:i}){let s=rv(),l=rh(),[c,d]=(0,n.useState)(!1),[m,p]=(0,n.useState)(null),[u,h]=(0,n.useState)({cardholderName:"",email:"",phone:""}),f=(0,n.useRef)(!1),y=(0,n.useRef)(null),g=(0,n.useRef)(!1),[b,k]=(0,n.useState)(!1),[v,x]=(0,n.useState)(!1),[z,C]=(0,n.useState)(!1),[w,S]=(0,n.useState)(!1),_=(0,n.useMemo)(()=>{try{let e=document.querySelector('[data-pmd-checkout-theme-root="1"]')?.getAttribute("data-pmd-checkout-theme");if("kazen_japanese"===e||"kazen-japanese"===e)return{text:"#242320",muted:"rgba(36, 35, 32, 0.52)"};if("gold-luxury"===e)return{text:"#FFF8DC",muted:"rgba(255, 248, 220, 0.58)"};if("modern_green"===e||"modern-green"===e)return{text:"#F5FFF8",muted:"#92c7ac"};return{text:"var(--pmd-checkout-input-fg, #111827)",muted:"var(--pmd-checkout-card-muted, #6B7280)"}}catch{return{text:"var(--pmd-checkout-input-fg, #111827)",muted:"var(--pmd-checkout-card-muted, #6B7280)"}}},[]),E=(0,n.useMemo)(()=>({style:{base:{fontSize:"16px",color:_.text,iconColor:_.text,"::placeholder":{color:_.muted}},invalid:{color:"#EF4444",iconColor:"#EF4444"}}}),[_]),N=!!(s&&l&&b&&v&&z&&!c&&!f.current);(0,n.useEffect)(()=>{try{let e=document.querySelector('[data-pmd-checkout-theme-root="1"]')?.getAttribute("data-pmd-checkout-theme"),t="kazen_japanese"===e||"kazen-japanese"===e||!!document.querySelector('.kzco-overlay[data-kzco-root="1"]')||!!document.querySelector('[data-pmd-checkout-kazen-skin="1"]');S(t)}catch{S(!1)}return()=>{g.current=!1}},[]),(0,n.useEffect)(()=>{let e=y.current;e&&!("u"<typeof document)&&e.closest('[data-pmd-checkout-theme="kazen_japanese"], [data-pmd-checkout-theme="kazen-japanese"], .kzco-overlay')&&e.querySelectorAll("#cardholderName, #email, #phone").forEach(e=>{e.setAttribute("data-pmd-kazen-billing-field","1"),e.style.setProperty("border-radius","0px","important"),e.style.setProperty("-webkit-border-radius","0px","important"),e.style.setProperty("background","rgba(255, 251, 243, .78)","important"),e.style.setProperty("background-color","rgba(255, 251, 243, .78)","important"),e.style.setProperty("border","1px solid rgba(36, 35, 32, .24)","important"),e.style.setProperty("box-shadow","none","important"),e.style.setProperty("outline","none","important")})});let I=async a=>{if(a.preventDefault(),f.current||c)return;if(p(null),!s||!l){let e="Secure card payment is still loading. Please wait a moment and try again.";p(e),r(e);return}let o=l.getElement(rx);if(!o||!v||!g.current){let e="Secure card field is not ready yet. Please wait a moment and try again.";p(e),r(e);return}f.current=!0,d(!0);try{let r=Number(e?.amount||0),a=String(e?.currency||"EUR").toUpperCase();if(!r||r<=0)throw Error("Invalid payment amount");let n=await fetch("/api/v1/payments/stripe/create-intent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:r,currency:a,restaurantId:String(e?.restaurantId||"1"),tableNumber:e?.tableNumber??null,cartId:e?.cartId??null,userId:e?.userId??null,items:Array.isArray(e?.items)?e?.items:[],customerInfo:e?.customerInfo||{}})}),i=await n.json().catch(()=>({}));if(!n.ok||!i?.clientSecret)throw Error(i?.error||"Failed to create Stripe payment intent");let l=String(u.cardholderName||"").trim()||String(e?.customerInfo?.name||"").trim()||"Customer",c=String(u.email||"").trim()||void 0,d=String(u.phone||"").trim()||void 0,{error:m,paymentIntent:p}=await s.confirmCardPayment(i.clientSecret,{payment_method:{card:o,billing_details:{name:l,email:c,phone:d}}});if(m)throw Error(m.message||"Stripe payment confirmation failed");let h=String(p?.status||"");if(!p||!["succeeded","processing","requires_capture"].includes(h))throw Error(`Unexpected Stripe payment status: ${h||"unknown"}`);t({success:!0,transactionId:String(p.id),paymentMethod:"stripe"})}catch(t){let e="string"==typeof t?.message?t.message:"Stripe payment failed";p(e),r(e)}finally{f.current=!1,d(!1)}};return(0,o.jsxs)("form",{"data-pmd-stripe-form":"1","data-pmd-stripe-kazen-form":w?"1":void 0,onSubmit:I,className:(0,eB.cn)("space-y-4 bg-transparent w-full",a),children:[(0,o.jsx)("style",{"data-pmd-kazen-stripe-native-form-style":"1",dangerouslySetInnerHTML:{__html:`
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
          `}}),(0,o.jsxs)("div",{className:"space-y-3",children:[(0,o.jsxs)("div",{children:[(0,o.jsx)(rC.Label,{htmlFor:"cardholderName",className:"pmd-themed-label text-sm font-medium",children:"Cardholder Name"}),(0,o.jsx)(tr,{id:"cardholderName",type:"text",placeholder:"John Doe",value:u.cardholderName,onChange:e=>h(t=>({...t,cardholderName:e.target.value})),className:"mt-1 pmd-kazen-stripe-billing-input","data-pmd-kazen-billing-field":"1"})]}),(0,o.jsxs)("div",{children:[(0,o.jsx)(rC.Label,{htmlFor:"email",className:"pmd-themed-label text-sm font-medium",children:"Email Address"}),(0,o.jsx)(tr,{id:"email",type:"email",placeholder:"john@example.com",value:u.email,onChange:e=>h(t=>({...t,email:e.target.value})),className:"mt-1 pmd-kazen-stripe-billing-input","data-pmd-kazen-billing-field":"1"})]}),(0,o.jsxs)("div",{children:[(0,o.jsx)(rC.Label,{htmlFor:"phone",className:"pmd-themed-label text-sm font-medium",children:"Phone Number (Optional)"}),(0,o.jsx)(tr,{id:"phone",type:"tel",placeholder:"+1 (555) 123-4567",value:u.phone,onChange:e=>h(t=>({...t,phone:e.target.value})),className:"mt-1 pmd-kazen-stripe-billing-input","data-pmd-kazen-billing-field":"1"})]}),(0,o.jsxs)("div",{children:[(0,o.jsx)(rC.Label,{className:"pmd-themed-label text-sm font-medium",children:"Card Information"}),(0,o.jsx)("div",{className:"pmd-stripe-card-frame mt-1",children:(0,o.jsx)(rx,{options:E,onReady:()=>{g.current=!0,k(!0),x(!0),p(null)},onChange:e=>{C(!!e?.complete),p(e.error?e.error.message:null)}})}),m&&(0,o.jsxs)("div",{className:"flex items-center gap-2 mt-2 text-red-600 text-sm",children:[(0,o.jsx)(rS.AlertCircle,{className:"h-4 w-4"}),m]})]})]}),i?(0,o.jsx)("div",{className:"pt-3 pb-2 flex items-center gap-2",children:i}):null,(0,o.jsx)(tt,{type:"submit",disabled:!N,"data-pmd-stripe-native-button":"1",variant:"primary",fullWidth:!0,children:c?(0,o.jsxs)("span",{className:"flex w-full items-center justify-center gap-2",children:[(0,o.jsx)("span",{className:"h-4 w-4 animate-spin rounded-full border-2 border-current/35 border-t-current"}),(0,o.jsx)("span",{children:"Processing..."})]}):(0,o.jsxs)("span",{className:"flex w-full items-center justify-center gap-2",children:[(0,o.jsx)(rw,{className:"h-4 w-4 flex-none"}),(0,o.jsx)("span",{children:"Pay"})]})})]})}var rE=e.i(78113);function rN(e,t){if(!({}).hasOwnProperty.call(e,t))throw TypeError("attempted to use private field on non-instance");return e}var rI=0;function rT(e){return"__private_"+rI+++"_"+e}function rA(){return(rA=Object.assign.bind()).apply(null,arguments)}class rj{constructor(e,t){this.formattedValue=void 0,this.cursorIndex=void 0,this.formattedValue=e,this.cursorIndex=t}}class rP{applyMask(e,t,r){let a=[],o=t.split("");e?function e(t,r,a,o,n){t+r<n.length&&t<o.length&&("9"===o[t]&&Number(n[t+r])>-1&&" "!==n[t+r]||"*"===o[t]||n[t+r]===o[t]?a.push(n[t+r]):"9"!==o[t]&&"*"!==o[t]?(a.push(o[t]),r--):(n.splice(t+r,1),t--),e(t+1,r,a,o,n))}(0,0,a,e.split("").filter(e=>!["{","}"].includes(e)),o):a.push(...o),t=a.join("");let n=1;if(r){let e=r.split("");for(let t=0,r=a.length;t<r;t++)if(a[t]!==e[t]){n=t+1;break}}return t.substring(0,t.length-1)===r&&(n=t.length+1),new rj(t,n)}getMaxLengthBasedOnMask(e){var t,r;if(!e)return -1;let a=null!=(t=null==(r=e.match(/[{}]/g))?void 0:r.length)?t:0;return e.length-1-a}removeMask(e,t){var r;if(!e)return(t||"").trim();let a=[],o=null!=(r=null==t?void 0:t.split(""))?r:[],n=-1,i=!1;for(let t of e.split("")){if(n++,["{","}"].includes(t)){n--,i="{"===t;continue}let e=o[n];i&&e&&a.push(e)}return a.join("").trim()}}function rB(e){return e.replace(/[^\d\w]+/g,"").toUpperCase()}let rR={EmailAddress:class{constructor(e){this.json=void 0,this.type=void 0,this.errorMessageId=void 0,this.json=e,this.type=e.type,this.errorMessageId=e.type}validate(e){return new RegExp(/^[^@.]+(\.[^@.]+)*@([^@.]+\.)*[^@.]+\.[^@.][^@.]+$/i).test(e)}validateValue(e,t){let r=e.getUnmaskedValue(t);return!!r&&this.validate(r)}},TermsAndConditions:class{constructor(e){this.json=void 0,this.type=void 0,this.errorMessageId=void 0,this.json=e,this.type=e.type,this.errorMessageId=e.type}validate(e){return[!0,"true"].includes(e)}validateValue(e,t){let r=e.getUnmaskedValue(t);return!!r&&this.validate(r)}},ExpirationDate:class{constructor(e){this.json=void 0,this.type=void 0,this.errorMessageId=void 0,this.json=e,this.type=e.type,this.errorMessageId=e.type}validate(e){var t;if(t=e=e.replace(/\D/g,""),!/\d{4}|\d{6}$/g.test(t)||![4,6].includes(e.length))return!1;let r=Number(e.substring(0,2))-1,a=Number(4===e.length?`20${e.substring(2,4)}`:e.substring(2,6)),o=new Date(a,r,1);if(o.getMonth()!==r||o.getFullYear()!==a)return!1;let n=new Date,i=new Date(n.getFullYear(),n.getMonth(),1),s=new Date(n.getFullYear()+25,11,1);return o>=i&&o<=s}validateValue(e,t){let r=e.getUnmaskedValue(t);return!!r&&this.validate(r)}},FixedList:class{constructor(e){this.json=void 0,this.type=void 0,this.errorMessageId=void 0,this.allowedValues=void 0,this.json=e,this.type=e.type,this.errorMessageId=e.type,this.allowedValues=e.attributes.allowedValues}validate(e){return this.allowedValues.includes(e)}validateValue(e,t){let r=e.getUnmaskedValue(t);return!!r&&this.validate(r)}},Length:class{constructor(e){this.json=void 0,this.type=void 0,this.errorMessageId=void 0,this.minLength=void 0,this.maxLength=void 0,this.json=e,this.type=e.type,this.errorMessageId=e.type,this.minLength=e.attributes.minLength,this.maxLength=e.attributes.maxLength}validate(e){return this.minLength<=e.length&&e.length<=this.maxLength}validateValue(e,t){let r=e.getUnmaskedValue(t);return r?this.validate(r):0===this.minLength}},Luhn:class{constructor(e){this.json=void 0,this.type=void 0,this.errorMessageId=void 0,this.json=e,this.type=e.type,this.errorMessageId=e.type}validate(e){let t=0,r=[[0,2,4,6,8,1,3,5,7,9],[0,1,2,3,4,5,6,7,8,9]];return e.replace(/\D+/g,"").replace(/\d/g,(e,a,o)=>(t+=r[o.length-a&1][parseInt(e,10)],"")),t%10==0&&t>0}validateValue(e,t){let r=e.getUnmaskedValue(t);return!!r&&this.validate(r)}},Range:class{constructor(e){this.json=void 0,this.type=void 0,this.errorMessageId=void 0,this.minValue=void 0,this.maxValue=void 0,this.json=e,this.type=e.type,this.errorMessageId=e.type,this.minValue=e.attributes.minValue,this.maxValue=e.attributes.maxValue}validate(e){let t="number"==typeof e?e:parseInt(e);return!isNaN(t)&&this.minValue<=t&&t<=this.maxValue}validateValue(e,t){let r=e.getUnmaskedValue(t);return!!r&&this.validate(r)}},RegularExpression:class{constructor(e){this.json=void 0,this.type=void 0,this.errorMessageId=void 0,this.regularExpression=void 0,this.json=e,this.type=e.type,this.errorMessageId=e.type,this.regularExpression=e.attributes.regularExpression}validate(e){return new RegExp(this.regularExpression).test(e)}validateValue(e,t){let r=e.getUnmaskedValue(t);return!!r&&this.validate(r)}},Iban:class{constructor(e){this.json=void 0,this.type=void 0,this.errorMessageId=void 0,this.json=e,this.type=e.type,this.errorMessageId=e.type}validate(e){if(!("string"==typeof e&&/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(rB(e))))return!1;let t=rB(e).replace(/(^.{4})(.*)/,"$2$1").replace(/[A-Z]/g,e=>(e.charCodeAt(0)-55).toString());for(;t.length>2;){let e=t.slice(0,9);t=parseInt(e,10)%97+t.slice(e.length)}return parseInt(t,10)%97==1}validateValue(e,t){let r=e.getUnmaskedValue(t);return!!r&&this.validate(r)}}};class rO{makeValidator(e){var t;let r=rR[(t=e.type).charAt(0).toUpperCase()+t.slice(1)];return r?new r(e):(console.warn("no validator for ",r),null)}}class rL{constructor(e){this.isRequired=void 0,this.validationRules=void 0,this.validationRuleByType=void 0,this.isRequired=e.isRequired,this.validationRules=[],this.validationRuleByType={},function(e,t,r){if(!e.validators)return;let a=new rO;for(let[o,n]of Object.entries(e.validators)){let e=a.makeValidator({type:o,attributes:n});e&&(t.push(e),r[e.type]=e)}}(e,this.validationRules,this.validationRuleByType)}}class rD{constructor(e){this.displayName=void 0,this.value=void 0,this.displayName=e.displayName,this.value=e.value}}class rU{constructor(e){this.json=void 0,this.type=void 0,this.valueMapping=void 0,this.json=e,this.type=e.type,this.valueMapping=[],function(e,t){if(e.valueMapping)for(let r of e.valueMapping)t.push(new rD(r))}(e,this.valueMapping)}}class rM{constructor(e){this.image=void 0,this.label=void 0,this.image=e.image,this.label=e.label}}class rF{constructor(e){this.json=void 0,this.displayOrder=void 0,this.formElement=void 0,this.label=void 0,this.mask=void 0,this.obfuscate=void 0,this.placeholderLabel=void 0,this.preferredInputType=void 0,this.tooltip=void 0,this.alwaysShow=void 0,this.wildcardMask=void 0,this.json=e,this.displayOrder=e.displayOrder,this.formElement=e.formElement?new rU(e.formElement):void 0,this.label=e.label,this.mask=e.mask,this.obfuscate=e.obfuscate,this.placeholderLabel=e.placeholderLabel,this.preferredInputType=e.preferredInputType,this.tooltip=e.tooltip?new rM(e.tooltip):void 0,this.alwaysShow=e.alwaysShow,this.wildcardMask=e.mask?e.mask.replace(/9/g,"*"):""}}var rV=rT("_errorCodes");class rK{constructor(e){this.json=void 0,Object.defineProperty(this,rV,{writable:!0,value:void 0}),this.displayHints=void 0,this.id=void 0,this.type=void 0,this.dataRestrictions=void 0,this.json=e,rN(this,rV)[rV]=[],this.id=e.id,this.type=e.type,this.dataRestrictions=new rL(e.dataRestrictions),this.displayHints=e.displayHints?new rF(e.displayHints):void 0}getErrorCodes(e){return e&&(rN(this,rV)[rV]=[],this.isValid(e)),rN(this,rV)[rV]}isValid(e){let t=this.dataRestrictions.validationRules,r=!1,a=this.applyMask(e);for(let o of(e=this.removeMask(a.formattedValue),t))o.validate(e)||(r=!0,rN(this,rV)[rV].push(o.errorMessageId));return!r}applyMask(e,t){var r;return(new rP).applyMask(null==(r=this.displayHints)?void 0:r.mask,e,t)}applyWildcardMask(e,t){var r;return(new rP).applyMask(null==(r=this.displayHints)?void 0:r.wildcardMask,e,t)}removeMask(e){var t;return(new rP).removeMask(null==(t=this.displayHints)?void 0:t.mask,e)}}class rq{constructor(e){this.json=void 0,this.attributeKey=void 0,this.mask=void 0,this.wildcardMask=void 0,this.json=e,this.attributeKey=e.attributeKey,this.mask=e.mask,this.wildcardMask=e.mask?e.mask.replace(/9/g,"*"):""}}class rH{constructor(e){this.json=void 0,this.logo=void 0,this.labelTemplate=void 0,this.labelTemplateElementByAttributeKey=void 0,this.json=e,this.logo=e.logo,this.labelTemplate=[],this.labelTemplateElementByAttributeKey={},function(e,t,r){if(e.labelTemplate)for(let a of e.labelTemplate){let e=new rq(a);t.push(e),r[e.attributeKey]=e}}(e,this.labelTemplate,this.labelTemplateElementByAttributeKey)}}class rG{constructor(e){this.json=void 0,this.key=void 0,this.value=void 0,this.status=void 0,this.mustWriteReason=void 0,this.json=e,this.key=e.key,this.value=e.value,this.status=e.status,this.mustWriteReason=e.mustWriteReason}}class r${constructor(e){this.json=void 0,this.attributes=void 0,this.attributeByKey=void 0,this.displayHints=void 0,this.id=void 0,this.paymentProductId=void 0,this.json=e,this.attributes=[],this.attributeByKey={},this.displayHints=new rH(e.displayHints),this.id=e.id,this.paymentProductId=e.paymentProductId,function(e,t,r){if(e.attributes)for(let a of e.attributes){let e=new rG(a);t.push(e),r[e.key]=e}}(e,this.attributes,this.attributeByKey)}getLabel(){return this.getMaskedValueByAttributeKey("alias")}getMaskedValueByAttributeKey(e){var t,r;let a=null==(t=this.attributeByKey[e])?void 0:t.value,o=null==(r=this.displayHints.labelTemplateElementByAttributeKey[e])?void 0:r.wildcardMask;if(void 0!==a&&void 0!==o)return(new rP).applyMask(o,a)}}class rW{constructor(e){this.json=void 0,this.displayOrder=void 0,this.label=void 0,this.logo=void 0,this.json=e,this.displayOrder=e.displayOrder,this.label=e.label,this.logo=e.logo}}class rY{constructor(e){this.json=void 0,this.networks=void 0,this.json=e,this.networks=e.networks}}class rQ{constructor(e){this.json=void 0,this.networks=void 0,this.gateway=void 0,this.json=e,this.networks=e.networks,this.gateway=e.gateway}}class rX{constructor(e){if(this.json=void 0,this.accountsOnFile=void 0,this.accountOnFileById=void 0,this.allowsRecurring=void 0,this.allowsTokenization=void 0,this.displayHints=void 0,this.displayHintsList=void 0,this.id=void 0,this.maxAmount=void 0,this.minAmount=void 0,this.paymentMethod=void 0,this.mobileIntegrationLevel=void 0,this.usesRedirectionTo3rdParty=void 0,this.paymentProduct302SpecificData=void 0,this.paymentProduct320SpecificData=void 0,this.json=e,this.json.type="product",this.accountsOnFile=[],this.accountOnFileById={},this.allowsRecurring=e.allowsRecurring,this.allowsTokenization=e.allowsTokenization,this.displayHints=new rW(e.displayHints),this.displayHintsList=[],this.id=e.id,this.maxAmount=e.maxAmount,this.minAmount=e.minAmount,this.paymentMethod=e.paymentMethod,this.mobileIntegrationLevel=e.mobileIntegrationLevel,this.usesRedirectionTo3rdParty=e.usesRedirectionTo3rdParty,e.paymentProduct302SpecificData&&(this.paymentProduct302SpecificData=new rY(e.paymentProduct302SpecificData)),e.paymentProduct320SpecificData&&(this.paymentProduct320SpecificData=new rQ(e.paymentProduct320SpecificData)),e.displayHintsList)for(const t of e.displayHintsList)this.displayHintsList.push(new rW(t));!function(e,t,r){if(e.accountsOnFile)for(let a of e.accountsOnFile){let e=new r$(a);t.push(e),r[e.id]=e}}(e,this.accountsOnFile,this.accountOnFileById)}copy(){return new rX(JSON.parse(JSON.stringify(this.json)))}}class rZ extends rX{constructor(e){super(e),this.json=void 0,this.paymentProductFields=void 0,this.paymentProductFieldById=void 0,this.json=e,this.paymentProductFields=[],this.paymentProductFieldById={},function(e,t,r){if(e.fields)for(let a of e.fields){let e=new rK(a);t.push(e),r[e.id]=e}}(e,this.paymentProductFields,this.paymentProductFieldById)}}class rJ{constructor(e){this.basicPaymentItems=void 0,this.basicPaymentItemById=void 0,this.accountsOnFile=void 0,this.accountOnFileById=void 0,this.basicPaymentItems=[],this.basicPaymentItemById={},this.accountsOnFile=[],this.accountOnFileById={},function(e,{basicPaymentItems:t,basicPaymentItemById:r,accountsOnFile:a,accountOnFileById:o}){for(let n of(t.push(...e.basicPaymentProducts.map(e=>e.copy())),e.basicPaymentProducts))if(r[n.id]=n,n.accountsOnFile)for(let e of n.accountsOnFile)a.push(e),o[e.id]=e}(e,this)}}class r0{constructor(e){this.json=void 0,this.basicPaymentProducts=void 0,this.basicPaymentProductById=void 0,this.basicPaymentProductByAccountOnFileId=void 0,this.accountsOnFile=void 0,this.accountOnFileById=void 0,this.json=e,this.basicPaymentProducts=[],this.basicPaymentProductById={},this.basicPaymentProductByAccountOnFileId={},this.accountsOnFile=[],this.accountOnFileById={},function(e,t,r,a,o,n){if(e.paymentProducts)for(let i of e.paymentProducts){let e=new rX(i);if(t.push(e),a[e.id]=e,e.accountsOnFile)for(let t of e.accountsOnFile)r.push(t),o[t.id]=t,n[t.id]=e}}(e,this.basicPaymentProducts,this.accountsOnFile,this.basicPaymentProductById,this.accountOnFileById,this.basicPaymentProductByAccountOnFileId)}}var r1={options:{usePureJavaScript:!1}},r2="u">typeof globalThis?globalThis:"u">typeof window?window:e.g;function r5(e){var t={exports:{}};return e(t,t.exports),t.exports}var r3={},r4={};r3.encode=function(e,t,r){if("string"!=typeof t)throw TypeError('"alphabet" must be a string.');if(void 0!==r&&"number"!=typeof r)throw TypeError('"maxline" must be a number.');var a="";if(e instanceof Uint8Array){var o=0,n=t.length,i=t.charAt(0),s=[0];for(o=0;o<e.length;++o){for(var l=0,c=e[o];l<s.length;++l)s[l]=(c+=s[l]<<8)%n,c=c/n|0;for(;c>0;)s.push(c%n),c=c/n|0}for(o=0;0===e[o]&&o<e.length-1;++o)a+=i;for(o=s.length-1;o>=0;--o)a+=t[s[o]]}else a=function(e,t){var r=0,a=t.length,o=t.charAt(0),n=[0];for(r=0;r<e.length();++r){for(var i=0,s=e.at(r);i<n.length;++i)n[i]=(s+=n[i]<<8)%a,s=s/a|0;for(;s>0;)n.push(s%a),s=s/a|0}var l="";for(r=0;0===e.at(r)&&r<e.length()-1;++r)l+=o;for(r=n.length-1;r>=0;--r)l+=t[n[r]];return l}(e,t);if(r){var d=RegExp(".{1,"+r+"}","g");a=a.match(d).join("\r\n")}return a},r3.decode=function(e,t){if("string"!=typeof e)throw TypeError('"input" must be a string.');if("string"!=typeof t)throw TypeError('"alphabet" must be a string.');var r=r4[t];if(!r){r=r4[t]=[];for(var a=0;a<t.length;++a)r[t.charCodeAt(a)]=a}e=e.replace(/\s/g,"");var o=t.length,n=t.charAt(0),i=[0];for(a=0;a<e.length;a++){var s=r[e.charCodeAt(a)];if(void 0===s)return;for(var l=0,c=s;l<i.length;++l)i[l]=255&(c+=i[l]*o),c>>=8;for(;c>0;)i.push(255&c),c>>=8}for(var d=0;e[d]===n&&d<e.length-1;++d)i.push(0);return void 0!==rE.Buffer?rE.Buffer.from(i.reverse()):new Uint8Array(i.reverse())},r5(function(e){var t=e.exports=r1.util=r1.util||{};function r(e){if(8!==e&&16!==e&&24!==e&&32!==e)throw Error("Only 8, 16, 24, or 32 bits supported: "+e)}function o(e){if(this.data="",this.read=0,"string"==typeof e)this.data=e;else if(t.isArrayBuffer(e)||t.isArrayBufferView(e))if(void 0!==rE.Buffer&&e instanceof rE.Buffer)this.data=e.toString("binary");else{var r=new Uint8Array(e);try{this.data=String.fromCharCode.apply(null,r)}catch(e){for(var a=0;a<r.length;++a)this.putByte(r[a])}}else(e instanceof o||"object"==typeof e&&"string"==typeof e.data&&"number"==typeof e.read)&&(this.data=e.data,this.read=e.read);this._constructedStringLength=0}!function(){if("function"==typeof setImmediate)return t.setImmediate=function(){return setImmediate.apply(void 0,arguments)},t.nextTick=function(e){return setImmediate(e)};if(t.setImmediate=function(e){setTimeout(e,0)},"u">typeof window&&"function"==typeof window.postMessage){var e="forge.setImmediate",r=[];t.setImmediate=function(t){r.push(t),1===r.length&&window.postMessage(e,"*")},window.addEventListener("message",function(t){if(t.source===window&&t.data===e){t.stopPropagation();var a=r.slice();r.length=0,a.forEach(function(e){e()})}},!0)}if("u">typeof MutationObserver){var a=Date.now(),o=!0,n=document.createElement("div");r=[],new MutationObserver(function(){var e=r.slice();r.length=0,e.forEach(function(e){e()})}).observe(n,{attributes:!0});var i=t.setImmediate;t.setImmediate=function(e){Date.now()-a>15?(a=Date.now(),i(e)):(r.push(e),1===r.length&&n.setAttribute("a",o=!o))}}t.nextTick=t.setImmediate}(),t.isNodejs=void 0!==a.default&&a.default.versions&&a.default.versions.node,t.globalScope=t.isNodejs?r2:"u"<typeof self?window:self,t.isArray=Array.isArray||function(e){return"[object Array]"===Object.prototype.toString.call(e)},t.isArrayBuffer=function(e){return"u">typeof ArrayBuffer&&e instanceof ArrayBuffer},t.isArrayBufferView=function(e){return e&&t.isArrayBuffer(e.buffer)&&void 0!==e.byteLength},t.ByteBuffer=o,t.ByteStringBuffer=o,t.ByteStringBuffer.prototype._optimizeConstructedString=function(e){this._constructedStringLength+=e,this._constructedStringLength>4096&&(this.data.substr(0,1),this._constructedStringLength=0)},t.ByteStringBuffer.prototype.length=function(){return this.data.length-this.read},t.ByteStringBuffer.prototype.isEmpty=function(){return 0>=this.length()},t.ByteStringBuffer.prototype.putByte=function(e){return this.putBytes(String.fromCharCode(e))},t.ByteStringBuffer.prototype.fillWithByte=function(e,t){e=String.fromCharCode(e);for(var r=this.data;t>0;)1&t&&(r+=e),(t>>>=1)>0&&(e+=e);return this.data=r,this._optimizeConstructedString(t),this},t.ByteStringBuffer.prototype.putBytes=function(e){return this.data+=e,this._optimizeConstructedString(e.length),this},t.ByteStringBuffer.prototype.putString=function(e){return this.putBytes(t.encodeUtf8(e))},t.ByteStringBuffer.prototype.putInt16=function(e){return this.putBytes(String.fromCharCode(e>>8&255)+String.fromCharCode(255&e))},t.ByteStringBuffer.prototype.putInt24=function(e){return this.putBytes(String.fromCharCode(e>>16&255)+String.fromCharCode(e>>8&255)+String.fromCharCode(255&e))},t.ByteStringBuffer.prototype.putInt32=function(e){return this.putBytes(String.fromCharCode(e>>24&255)+String.fromCharCode(e>>16&255)+String.fromCharCode(e>>8&255)+String.fromCharCode(255&e))},t.ByteStringBuffer.prototype.putInt16Le=function(e){return this.putBytes(String.fromCharCode(255&e)+String.fromCharCode(e>>8&255))},t.ByteStringBuffer.prototype.putInt24Le=function(e){return this.putBytes(String.fromCharCode(255&e)+String.fromCharCode(e>>8&255)+String.fromCharCode(e>>16&255))},t.ByteStringBuffer.prototype.putInt32Le=function(e){return this.putBytes(String.fromCharCode(255&e)+String.fromCharCode(e>>8&255)+String.fromCharCode(e>>16&255)+String.fromCharCode(e>>24&255))},t.ByteStringBuffer.prototype.putInt=function(e,t){r(t);var a="";do t-=8,a+=String.fromCharCode(e>>t&255);while(t>0)return this.putBytes(a)},t.ByteStringBuffer.prototype.putSignedInt=function(e,t){return e<0&&(e+=2<<t-1),this.putInt(e,t)},t.ByteStringBuffer.prototype.putBuffer=function(e){return this.putBytes(e.getBytes())},t.ByteStringBuffer.prototype.getByte=function(){return this.data.charCodeAt(this.read++)},t.ByteStringBuffer.prototype.getInt16=function(){var e=this.data.charCodeAt(this.read)<<8^this.data.charCodeAt(this.read+1);return this.read+=2,e},t.ByteStringBuffer.prototype.getInt24=function(){var e=this.data.charCodeAt(this.read)<<16^this.data.charCodeAt(this.read+1)<<8^this.data.charCodeAt(this.read+2);return this.read+=3,e},t.ByteStringBuffer.prototype.getInt32=function(){var e=this.data.charCodeAt(this.read)<<24^this.data.charCodeAt(this.read+1)<<16^this.data.charCodeAt(this.read+2)<<8^this.data.charCodeAt(this.read+3);return this.read+=4,e},t.ByteStringBuffer.prototype.getInt16Le=function(){var e=this.data.charCodeAt(this.read)^this.data.charCodeAt(this.read+1)<<8;return this.read+=2,e},t.ByteStringBuffer.prototype.getInt24Le=function(){var e=this.data.charCodeAt(this.read)^this.data.charCodeAt(this.read+1)<<8^this.data.charCodeAt(this.read+2)<<16;return this.read+=3,e},t.ByteStringBuffer.prototype.getInt32Le=function(){var e=this.data.charCodeAt(this.read)^this.data.charCodeAt(this.read+1)<<8^this.data.charCodeAt(this.read+2)<<16^this.data.charCodeAt(this.read+3)<<24;return this.read+=4,e},t.ByteStringBuffer.prototype.getInt=function(e){r(e);var t=0;do t=(t<<8)+this.data.charCodeAt(this.read++),e-=8;while(e>0)return t},t.ByteStringBuffer.prototype.getSignedInt=function(e){var t=this.getInt(e),r=2<<e-2;return t>=r&&(t-=r<<1),t},t.ByteStringBuffer.prototype.getBytes=function(e){var t;return e?(e=Math.min(this.length(),e),t=this.data.slice(this.read,this.read+e),this.read+=e):0===e?t="":(t=0===this.read?this.data:this.data.slice(this.read),this.clear()),t},t.ByteStringBuffer.prototype.bytes=function(e){return void 0===e?this.data.slice(this.read):this.data.slice(this.read,this.read+e)},t.ByteStringBuffer.prototype.at=function(e){return this.data.charCodeAt(this.read+e)},t.ByteStringBuffer.prototype.setAt=function(e,t){return this.data=this.data.substr(0,this.read+e)+String.fromCharCode(t)+this.data.substr(this.read+e+1),this},t.ByteStringBuffer.prototype.last=function(){return this.data.charCodeAt(this.data.length-1)},t.ByteStringBuffer.prototype.copy=function(){var e=t.createBuffer(this.data);return e.read=this.read,e},t.ByteStringBuffer.prototype.compact=function(){return this.read>0&&(this.data=this.data.slice(this.read),this.read=0),this},t.ByteStringBuffer.prototype.clear=function(){return this.data="",this.read=0,this},t.ByteStringBuffer.prototype.truncate=function(e){var t=Math.max(0,this.length()-e);return this.data=this.data.substr(this.read,t),this.read=0,this},t.ByteStringBuffer.prototype.toHex=function(){for(var e="",t=this.read;t<this.data.length;++t){var r=this.data.charCodeAt(t);r<16&&(e+="0"),e+=r.toString(16)}return e},t.ByteStringBuffer.prototype.toString=function(){return t.decodeUtf8(this.bytes())},t.DataBuffer=function(e,r){this.read=(r=r||{}).readOffset||0,this.growSize=r.growSize||1024;var a=t.isArrayBuffer(e),o=t.isArrayBufferView(e);a||o?(this.data=a?new DataView(e):new DataView(e.buffer,e.byteOffset,e.byteLength),this.write="writeOffset"in r?r.writeOffset:this.data.byteLength):(this.data=new DataView(new ArrayBuffer(0)),this.write=0,null!=e&&this.putBytes(e),"writeOffset"in r&&(this.write=r.writeOffset))},t.DataBuffer.prototype.length=function(){return this.write-this.read},t.DataBuffer.prototype.isEmpty=function(){return 0>=this.length()},t.DataBuffer.prototype.accommodate=function(e,t){if(this.length()>=e)return this;t=Math.max(t||this.growSize,e);var r=new Uint8Array(this.data.buffer,this.data.byteOffset,this.data.byteLength),a=new Uint8Array(this.length()+t);return a.set(r),this.data=new DataView(a.buffer),this},t.DataBuffer.prototype.putByte=function(e){return this.accommodate(1),this.data.setUint8(this.write++,e),this},t.DataBuffer.prototype.fillWithByte=function(e,t){this.accommodate(t);for(var r=0;r<t;++r)this.data.setUint8(e);return this},t.DataBuffer.prototype.putBytes=function(e,r){if(t.isArrayBufferView(e)){var a,o=(n=new Uint8Array(e.buffer,e.byteOffset,e.byteLength)).byteLength-n.byteOffset;return this.accommodate(o),new Uint8Array(this.data.buffer,this.write).set(n),this.write+=o,this}if(t.isArrayBuffer(e)){var n=new Uint8Array(e);return this.accommodate(n.byteLength),new Uint8Array(this.data.buffer).set(n,this.write),this.write+=n.byteLength,this}if(e instanceof t.DataBuffer||"object"==typeof e&&"number"==typeof e.read&&"number"==typeof e.write&&t.isArrayBufferView(e.data))return n=new Uint8Array(e.data.byteLength,e.read,e.length()),this.accommodate(n.byteLength),new Uint8Array(e.data.byteLength,this.write).set(n),this.write+=n.byteLength,this;if(e instanceof t.ByteStringBuffer&&(e=e.data,r="binary"),r=r||"binary","string"==typeof e){if("hex"===r)return this.accommodate(Math.ceil(e.length/2)),a=new Uint8Array(this.data.buffer,this.write),this.write+=t.binary.hex.decode(e,a,this.write),this;if("base64"===r)return this.accommodate(3*Math.ceil(e.length/4)),a=new Uint8Array(this.data.buffer,this.write),this.write+=t.binary.base64.decode(e,a,this.write),this;if("utf8"===r&&(e=t.encodeUtf8(e),r="binary"),"binary"===r||"raw"===r)return this.accommodate(e.length),a=new Uint8Array(this.data.buffer,this.write),this.write+=t.binary.raw.decode(a),this;if("utf16"===r)return this.accommodate(2*e.length),a=new Uint16Array(this.data.buffer,this.write),this.write+=t.text.utf16.encode(a),this;throw Error("Invalid encoding: "+r)}throw Error("Invalid parameter: "+e)},t.DataBuffer.prototype.putBuffer=function(e){return this.putBytes(e),e.clear(),this},t.DataBuffer.prototype.putString=function(e){return this.putBytes(e,"utf16")},t.DataBuffer.prototype.putInt16=function(e){return this.accommodate(2),this.data.setInt16(this.write,e),this.write+=2,this},t.DataBuffer.prototype.putInt24=function(e){return this.accommodate(3),this.data.setInt16(this.write,e>>8&65535),this.data.setInt8(this.write,e>>16&255),this.write+=3,this},t.DataBuffer.prototype.putInt32=function(e){return this.accommodate(4),this.data.setInt32(this.write,e),this.write+=4,this},t.DataBuffer.prototype.putInt16Le=function(e){return this.accommodate(2),this.data.setInt16(this.write,e,!0),this.write+=2,this},t.DataBuffer.prototype.putInt24Le=function(e){return this.accommodate(3),this.data.setInt8(this.write,e>>16&255),this.data.setInt16(this.write,e>>8&65535,!0),this.write+=3,this},t.DataBuffer.prototype.putInt32Le=function(e){return this.accommodate(4),this.data.setInt32(this.write,e,!0),this.write+=4,this},t.DataBuffer.prototype.putInt=function(e,t){r(t),this.accommodate(t/8);do t-=8,this.data.setInt8(this.write++,e>>t&255);while(t>0)return this},t.DataBuffer.prototype.putSignedInt=function(e,t){return r(t),this.accommodate(t/8),e<0&&(e+=2<<t-1),this.putInt(e,t)},t.DataBuffer.prototype.getByte=function(){return this.data.getInt8(this.read++)},t.DataBuffer.prototype.getInt16=function(){var e=this.data.getInt16(this.read);return this.read+=2,e},t.DataBuffer.prototype.getInt24=function(){var e=this.data.getInt16(this.read)<<8^this.data.getInt8(this.read+2);return this.read+=3,e},t.DataBuffer.prototype.getInt32=function(){var e=this.data.getInt32(this.read);return this.read+=4,e},t.DataBuffer.prototype.getInt16Le=function(){var e=this.data.getInt16(this.read,!0);return this.read+=2,e},t.DataBuffer.prototype.getInt24Le=function(){var e=this.data.getInt8(this.read)^this.data.getInt16(this.read+1,!0)<<8;return this.read+=3,e},t.DataBuffer.prototype.getInt32Le=function(){var e=this.data.getInt32(this.read,!0);return this.read+=4,e},t.DataBuffer.prototype.getInt=function(e){r(e);var t=0;do t=(t<<8)+this.data.getInt8(this.read++),e-=8;while(e>0)return t},t.DataBuffer.prototype.getSignedInt=function(e){var t=this.getInt(e),r=2<<e-2;return t>=r&&(t-=r<<1),t},t.DataBuffer.prototype.getBytes=function(e){var t;return e?(e=Math.min(this.length(),e),t=this.data.slice(this.read,this.read+e),this.read+=e):0===e?t="":(t=0===this.read?this.data:this.data.slice(this.read),this.clear()),t},t.DataBuffer.prototype.bytes=function(e){return void 0===e?this.data.slice(this.read):this.data.slice(this.read,this.read+e)},t.DataBuffer.prototype.at=function(e){return this.data.getUint8(this.read+e)},t.DataBuffer.prototype.setAt=function(e,t){return this.data.setUint8(e,t),this},t.DataBuffer.prototype.last=function(){return this.data.getUint8(this.write-1)},t.DataBuffer.prototype.copy=function(){return new t.DataBuffer(this)},t.DataBuffer.prototype.compact=function(){if(this.read>0){var e=new Uint8Array(this.data.buffer,this.read),t=new Uint8Array(e.byteLength);t.set(e),this.data=new DataView(t),this.write-=this.read,this.read=0}return this},t.DataBuffer.prototype.clear=function(){return this.data=new DataView(new ArrayBuffer(0)),this.read=this.write=0,this},t.DataBuffer.prototype.truncate=function(e){return this.write=Math.max(0,this.length()-e),this.read=Math.min(this.read,this.write),this},t.DataBuffer.prototype.toHex=function(){for(var e="",t=this.read;t<this.data.byteLength;++t){var r=this.data.getUint8(t);r<16&&(e+="0"),e+=r.toString(16)}return e},t.DataBuffer.prototype.toString=function(e){var r=new Uint8Array(this.data,this.read,this.length());if("binary"===(e=e||"utf8")||"raw"===e)return t.binary.raw.encode(r);if("hex"===e)return t.binary.hex.encode(r);if("base64"===e)return t.binary.base64.encode(r);if("utf8"===e)return t.text.utf8.decode(r);if("utf16"===e)return t.text.utf16.decode(r);throw Error("Invalid encoding: "+e)},t.createBuffer=function(e,r){return r=r||"raw",void 0!==e&&"utf8"===r&&(e=t.encodeUtf8(e)),new t.ByteBuffer(e)},t.fillString=function(e,t){for(var r="";t>0;)1&t&&(r+=e),(t>>>=1)>0&&(e+=e);return r},t.xorBytes=function(e,t,r){for(var a="",o="",n="",i=0,s=0;r>0;--r,++i)o=e.charCodeAt(i)^t.charCodeAt(i),s>=10&&(a+=n,n="",s=0),n+=String.fromCharCode(o),++s;return a+n},t.hexToBytes=function(e){var t="",r=0;for(!0&e.length&&(r=1,t+=String.fromCharCode(parseInt(e[0],16)));r<e.length;r+=2)t+=String.fromCharCode(parseInt(e.substr(r,2),16));return t},t.bytesToHex=function(e){return t.createBuffer(e).toHex()},t.int32ToBytes=function(e){return String.fromCharCode(e>>24&255)+String.fromCharCode(e>>16&255)+String.fromCharCode(e>>8&255)+String.fromCharCode(255&e)};var n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",i=[62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,64,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51],s="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";t.encode64=function(e,t){for(var r,a,o,i="",s="",l=0;l<e.length;)r=e.charCodeAt(l++),a=e.charCodeAt(l++),o=e.charCodeAt(l++),i+=n.charAt(r>>2),i+=n.charAt((3&r)<<4|a>>4),isNaN(a)?i+="==":(i+=n.charAt((15&a)<<2|o>>6),i+=isNaN(o)?"=":n.charAt(63&o)),t&&i.length>t&&(s+=i.substr(0,t)+"\r\n",i=i.substr(t));return s+i},t.decode64=function(e){e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");for(var t,r,a,o,n="",s=0;s<e.length;)t=i[e.charCodeAt(s++)-43],r=i[e.charCodeAt(s++)-43],a=i[e.charCodeAt(s++)-43],o=i[e.charCodeAt(s++)-43],n+=String.fromCharCode(t<<2|r>>4),64!==a&&(n+=String.fromCharCode((15&r)<<4|a>>2),64!==o&&(n+=String.fromCharCode((3&a)<<6|o)));return n},t.encodeUtf8=function(e){return unescape(encodeURIComponent(e))},t.decodeUtf8=function(e){return decodeURIComponent(escape(e))},t.binary={raw:{},hex:{},base64:{},base58:{},baseN:{encode:r3.encode,decode:r3.decode}},t.binary.raw.encode=function(e){return String.fromCharCode.apply(null,e)},t.binary.raw.decode=function(e,t,r){var a=t;a||(a=new Uint8Array(e.length));for(var o=r=r||0,n=0;n<e.length;++n)a[o++]=e.charCodeAt(n);return t?o-r:a},t.binary.hex.encode=t.bytesToHex,t.binary.hex.decode=function(e,t,r){var a=t;a||(a=new Uint8Array(Math.ceil(e.length/2)));var o=0,n=r=r||0;for(1&e.length&&(o=1,a[n++]=parseInt(e[0],16));o<e.length;o+=2)a[n++]=parseInt(e.substr(o,2),16);return t?n-r:a},t.binary.base64.encode=function(e,t){for(var r,a,o,i="",s="",l=0;l<e.byteLength;)r=e[l++],a=e[l++],o=e[l++],i+=n.charAt(r>>2),i+=n.charAt((3&r)<<4|a>>4),isNaN(a)?i+="==":(i+=n.charAt((15&a)<<2|o>>6),i+=isNaN(o)?"=":n.charAt(63&o)),t&&i.length>t&&(s+=i.substr(0,t)+"\r\n",i=i.substr(t));return s+i},t.binary.base64.decode=function(e,t,r){var a,o,n,s,l=t;l||(l=new Uint8Array(3*Math.ceil(e.length/4))),e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");for(var c=0,d=r=r||0;c<e.length;)a=i[e.charCodeAt(c++)-43],o=i[e.charCodeAt(c++)-43],n=i[e.charCodeAt(c++)-43],s=i[e.charCodeAt(c++)-43],l[d++]=a<<2|o>>4,64!==n&&(l[d++]=(15&o)<<4|n>>2,64!==s&&(l[d++]=(3&n)<<6|s));return t?d-r:l.subarray(0,d)},t.binary.base58.encode=function(e,r){return t.binary.baseN.encode(e,s,r)},t.binary.base58.decode=function(e,r){return t.binary.baseN.decode(e,s,r)},t.text={utf8:{},utf16:{}},t.text.utf8.encode=function(e,r,a){e=t.encodeUtf8(e);var o=r;o||(o=new Uint8Array(e.length));for(var n=a=a||0,i=0;i<e.length;++i)o[n++]=e.charCodeAt(i);return r?n-a:o},t.text.utf8.decode=function(e){return t.decodeUtf8(String.fromCharCode.apply(null,e))},t.text.utf16.encode=function(e,t,r){var a=t;a||(a=new Uint8Array(2*e.length));for(var o=new Uint16Array(a.buffer),n=r=r||0,i=r,s=0;s<e.length;++s)o[i++]=e.charCodeAt(s),n+=2;return t?n-r:a},t.text.utf16.decode=function(e){return String.fromCharCode.apply(null,new Uint16Array(e.buffer))},t.deflate=function(e,r,a){if(r=t.decode64(e.deflate(t.encode64(r)).rval),a){var o=2;32&r.charCodeAt(1)&&(o=6),r=r.substring(o,r.length-4)}return r},t.inflate=function(e,r,a){var o=e.inflate(t.encode64(r)).rval;return null===o?null:t.decode64(o)};var l=function(e,r,a){if(!e)throw Error("WebStorage not available.");if(null===a?o=e.removeItem(r):(a=t.encode64(JSON.stringify(a)),o=e.setItem(r,a)),void 0!==o&&!0!==o.rval){var o,n=Error(o.error.message);throw n.id=o.error.id,n.name=o.error.name,n}},c=function(e,r){if(!e)throw Error("WebStorage not available.");var a=e.getItem(r);if(e.init)if(null===a.rval){if(a.error){var o=Error(a.error.message);throw o.id=a.error.id,o.name=a.error.name,o}a=null}else a=a.rval;return null!==a&&(a=JSON.parse(t.decode64(a))),a},d=function(e,t,r,a){var o=c(e,t);null===o&&(o={}),o[r]=a,l(e,t,o)},m=function(e,t,r){var a=c(e,t);return null!==a&&(a=r in a?a[r]:null),a},p=function(e,t,r){var a=c(e,t);if(null!==a&&r in a){delete a[r];var o=!0;for(var n in a){o=!1;break}o&&(a=null),l(e,t,a)}},u=function(e,t){l(e,t,null)},h=function(e,t,r){var a,o=null;void 0===r&&(r=["web","flash"]);var n=!1,i=null;for(var s in r){a=r[s];try{if("flash"===a||"both"===a){if(null===t[0])throw Error("Flash local storage not available.");o=e.apply(this,t),n="flash"===a}"web"!==a&&"both"!==a||(t[0]=localStorage,o=e.apply(this,t),n=!0)}catch(e){i=e}if(n)break}if(!n)throw i;return o};t.setItem=function(e,t,r,a,o){h(d,arguments,o)},t.getItem=function(e,t,r,a){return h(m,arguments,a)},t.removeItem=function(e,t,r,a){h(p,arguments,a)},t.clearItems=function(e,t,r){h(u,arguments,r)},t.isEmpty=function(e){for(var t in e)if(e.hasOwnProperty(t))return!1;return!0},t.format=function(e){for(var t,r,a=/%./g,o=0,n=[],i=0;t=a.exec(e);){(r=e.substring(i,a.lastIndex-2)).length>0&&n.push(r),i=a.lastIndex;var s=t[0][1];switch(s){case"s":case"o":n.push(o<arguments.length?arguments[1+o++]:"<?>");break;case"%":n.push("%");break;default:n.push("<%"+s+"?>")}}return n.push(e.substring(i)),n.join("")},t.formatNumber=function(e,t,r,a){var o=e,n=isNaN(t=Math.abs(t))?2:t,i=void 0===a?".":a,s=o<0?"-":"",l=parseInt(o=Math.abs(+o||0).toFixed(n),10)+"",c=l.length>3?l.length%3:0;return s+(c?l.substr(0,c)+i:"")+l.substr(c).replace(/(\d{3})(?=\d)/g,"$1"+i)+(n?(void 0===r?",":r)+Math.abs(o-l).toFixed(n).slice(2):"")},t.formatSize=function(e){return e>=0x40000000?t.formatNumber(e/0x40000000,2,".","")+" GiB":e>=1048576?t.formatNumber(e/1048576,2,".","")+" MiB":e>=1024?t.formatNumber(e/1024,0)+" KiB":t.formatNumber(e,0)+" bytes"},t.bytesFromIP=function(e){return -1!==e.indexOf(".")?t.bytesFromIPv4(e):-1!==e.indexOf(":")?t.bytesFromIPv6(e):null},t.bytesFromIPv4=function(e){if(4!==(e=e.split(".")).length)return null;for(var r=t.createBuffer(),a=0;a<e.length;++a){var o=parseInt(e[a],10);if(isNaN(o))return null;r.putByte(o)}return r.getBytes()},t.bytesFromIPv6=function(e){for(var r=0,a=2*(8-(e=e.split(":").filter(function(e){return 0===e.length&&++r,!0})).length+r),o=t.createBuffer(),n=0;n<8;++n)if(e[n]&&0!==e[n].length){var i=t.hexToBytes(e[n]);i.length<2&&o.putByte(0),o.putBytes(i)}else o.fillWithByte(0,a),a=0;return o.getBytes()},t.bytesToIP=function(e){return 4===e.length?t.bytesToIPv4(e):16===e.length?t.bytesToIPv6(e):null},t.bytesToIPv4=function(e){if(4!==e.length)return null;for(var t=[],r=0;r<e.length;++r)t.push(e.charCodeAt(r));return t.join(".")},t.bytesToIPv6=function(e){if(16!==e.length)return null;for(var r=[],a=[],o=0,n=0;n<e.length;n+=2){for(var i=t.bytesToHex(e[n]+e[n+1]);"0"===i[0]&&"0"!==i;)i=i.substr(1);if("0"===i){var s=a[a.length-1],l=r.length;s&&l===s.end+1?(s.end=l,s.end-s.start>a[o].end-a[o].start&&(o=a.length-1)):a.push({start:l,end:l})}r.push(i)}if(a.length>0){var c=a[o];c.end-c.start>0&&(r.splice(c.start,c.end-c.start+1,""),0===c.start&&r.unshift(""),7===c.end&&r.push(""))}return r.join(":")},t.estimateCores=function(e,r){if("function"==typeof e&&(r=e,e={}),e=e||{},"cores"in t&&!e.update)return r(null,t.cores);if("u">typeof navigator&&"hardwareConcurrency"in navigator&&navigator.hardwareConcurrency>0)return t.cores=navigator.hardwareConcurrency,r(null,t.cores);if("u"<typeof Worker)return t.cores=1,r(null,t.cores);if("u"<typeof Blob)return t.cores=2,r(null,t.cores);var a=URL.createObjectURL(new Blob(["(",(function(){self.addEventListener("message",function(e){var t=Date.now();self.postMessage({st:t,et:t+4})})}).toString(),")()"],{type:"application/javascript"}));!function e(o,n,i){if(0===n)return t.cores=Math.max(1,Math.floor(o.reduce(function(e,t){return e+t},0)/o.length)),URL.revokeObjectURL(a),r(null,t.cores);!function(e,t){for(var r=[],o=[],n=0;n<e;++n){var i=new Worker(a);i.addEventListener("message",function(a){if(o.push(a.data),o.length===e){for(var n=0;n<e;++n)r[n].terminate();t(0,o)}}),r.push(i)}for(n=0;n<e;++n)r[n].postMessage(n)}(i,function(t,r){o.push(function(e,t){for(var r=[],a=0;a<e;++a)for(var o=t[a],n=r[a]=[],i=0;i<e;++i)if(a!==i){var s=t[i];(o.st>s.st&&o.st<s.et||s.st>o.st&&s.st<o.et)&&n.push(i)}return r.reduce(function(e,t){return Math.max(e,t.length)},0)}(i,r)),e(o,n-1,i)})}([],5,16)}}),r1.cipher=r1.cipher||{},r1.cipher.algorithms=r1.cipher.algorithms||{},r1.cipher.createCipher=function(e,t){var r=e;if("string"==typeof r&&(r=r1.cipher.getAlgorithm(r))&&(r=r()),!r)throw Error("Unsupported algorithm: "+e);return new r1.cipher.BlockCipher({algorithm:r,key:t,decrypt:!1})},r1.cipher.createDecipher=function(e,t){var r=e;if("string"==typeof r&&(r=r1.cipher.getAlgorithm(r))&&(r=r()),!r)throw Error("Unsupported algorithm: "+e);return new r1.cipher.BlockCipher({algorithm:r,key:t,decrypt:!0})},r1.cipher.registerAlgorithm=function(e,t){e=e.toUpperCase(),r1.cipher.algorithms[e]=t},r1.cipher.getAlgorithm=function(e){return(e=e.toUpperCase())in r1.cipher.algorithms?r1.cipher.algorithms[e]:null};var r8=r1.cipher.BlockCipher=function(e){this.algorithm=e.algorithm,this.mode=this.algorithm.mode,this.blockSize=this.mode.blockSize,this._finish=!1,this._input=null,this.output=null,this._op=e.decrypt?this.mode.decrypt:this.mode.encrypt,this._decrypt=e.decrypt,this.algorithm.initialize(e)};function r6(e,t){r1.cipher.registerAlgorithm(e,function(){return new r1.aes.Algorithm(e,t)})}r8.prototype.start=function(e){var t={};for(var r in e=e||{})t[r]=e[r];t.decrypt=this._decrypt,this._finish=!1,this._input=r1.util.createBuffer(),this.output=e.output||r1.util.createBuffer(),this.mode.start(t)},r8.prototype.update=function(e){for(e&&this._input.putBuffer(e);!this._op.call(this.mode,this._input,this.output,this._finish)&&!this._finish;);this._input.compact()},r8.prototype.finish=function(e){e&&("ECB"===this.mode.name||"CBC"===this.mode.name)&&(this.mode.pad=function(t){return e(this.blockSize,t,!1)},this.mode.unpad=function(t){return e(this.blockSize,t,!0)});var t={};return t.decrypt=this._decrypt,t.overflow=this._input.length()%this.blockSize,!(!this._decrypt&&this.mode.pad&&!this.mode.pad(this._input,t)||(this._finish=!0,this.update(),this._decrypt&&this.mode.unpad&&!this.mode.unpad(this.output,t)||this.mode.afterFinish&&!this.mode.afterFinish(this.output,t)))},r5(function(e){r1.cipher=r1.cipher||{};var t=e.exports=r1.cipher.modes=r1.cipher.modes||{};function r(e,t){if("string"==typeof e&&(e=r1.util.createBuffer(e)),r1.util.isArray(e)&&e.length>4){var r=e;e=r1.util.createBuffer();for(var a=0;a<r.length;++a)e.putByte(r[a])}if(e.length()<t)throw Error("Invalid IV length; got "+e.length()+" bytes and expected "+t+" bytes.");if(!r1.util.isArray(e)){var o=[],n=t/4;for(a=0;a<n;++a)o.push(e.getInt32());e=o}return e}function a(e){e[e.length-1]=e[e.length-1]+1|0}function o(e){return[e/0x100000000|0,0|e]}t.ecb=function(e){e=e||{},this.name="ECB",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._ints=this.blockSize/4,this._inBlock=Array(this._ints),this._outBlock=Array(this._ints)},t.ecb.prototype.start=function(e){},t.ecb.prototype.encrypt=function(e,t,r){if(e.length()<this.blockSize&&!(r&&e.length()>0))return!0;for(var a=0;a<this._ints;++a)this._inBlock[a]=e.getInt32();for(this.cipher.encrypt(this._inBlock,this._outBlock),a=0;a<this._ints;++a)t.putInt32(this._outBlock[a])},t.ecb.prototype.decrypt=function(e,t,r){if(e.length()<this.blockSize&&!(r&&e.length()>0))return!0;for(var a=0;a<this._ints;++a)this._inBlock[a]=e.getInt32();for(this.cipher.decrypt(this._inBlock,this._outBlock),a=0;a<this._ints;++a)t.putInt32(this._outBlock[a])},t.ecb.prototype.pad=function(e,t){var r=e.length()===this.blockSize?this.blockSize:this.blockSize-e.length();return e.fillWithByte(r,r),!0},t.ecb.prototype.unpad=function(e,t){if(t.overflow>0)return!1;var r=e.length(),a=e.at(r-1);return!(a>this.blockSize<<2||(e.truncate(a),0))},t.cbc=function(e){e=e||{},this.name="CBC",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._ints=this.blockSize/4,this._inBlock=Array(this._ints),this._outBlock=Array(this._ints)},t.cbc.prototype.start=function(e){if(null===e.iv){if(!this._prev)throw Error("Invalid IV parameter.");this._iv=this._prev.slice(0)}else{if(!("iv"in e))throw Error("Invalid IV parameter.");this._iv=r(e.iv,this.blockSize),this._prev=this._iv.slice(0)}},t.cbc.prototype.encrypt=function(e,t,r){if(e.length()<this.blockSize&&!(r&&e.length()>0))return!0;for(var a=0;a<this._ints;++a)this._inBlock[a]=this._prev[a]^e.getInt32();for(this.cipher.encrypt(this._inBlock,this._outBlock),a=0;a<this._ints;++a)t.putInt32(this._outBlock[a]);this._prev=this._outBlock},t.cbc.prototype.decrypt=function(e,t,r){if(e.length()<this.blockSize&&!(r&&e.length()>0))return!0;for(var a=0;a<this._ints;++a)this._inBlock[a]=e.getInt32();for(this.cipher.decrypt(this._inBlock,this._outBlock),a=0;a<this._ints;++a)t.putInt32(this._prev[a]^this._outBlock[a]);this._prev=this._inBlock.slice(0)},t.cbc.prototype.pad=function(e,t){var r=e.length()===this.blockSize?this.blockSize:this.blockSize-e.length();return e.fillWithByte(r,r),!0},t.cbc.prototype.unpad=function(e,t){if(t.overflow>0)return!1;var r=e.length(),a=e.at(r-1);return!(a>this.blockSize<<2||(e.truncate(a),0))},t.cfb=function(e){e=e||{},this.name="CFB",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._ints=this.blockSize/4,this._inBlock=null,this._outBlock=Array(this._ints),this._partialBlock=Array(this._ints),this._partialOutput=r1.util.createBuffer(),this._partialBytes=0},t.cfb.prototype.start=function(e){if(!("iv"in e))throw Error("Invalid IV parameter.");this._iv=r(e.iv,this.blockSize),this._inBlock=this._iv.slice(0),this._partialBytes=0},t.cfb.prototype.encrypt=function(e,t,r){var a=e.length();if(0===a)return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&a>=this.blockSize)for(var o=0;o<this._ints;++o)this._inBlock[o]=e.getInt32()^this._outBlock[o],t.putInt32(this._inBlock[o]);else{var n=(this.blockSize-a)%this.blockSize;for(n>0&&(n=this.blockSize-n),this._partialOutput.clear(),o=0;o<this._ints;++o)this._partialBlock[o]=e.getInt32()^this._outBlock[o],this._partialOutput.putInt32(this._partialBlock[o]);if(n>0)e.read-=this.blockSize;else for(o=0;o<this._ints;++o)this._inBlock[o]=this._partialBlock[o];if(this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),n>0&&!r)return t.putBytes(this._partialOutput.getBytes(n-this._partialBytes)),this._partialBytes=n,!0;t.putBytes(this._partialOutput.getBytes(a-this._partialBytes)),this._partialBytes=0}},t.cfb.prototype.decrypt=function(e,t,r){var a=e.length();if(0===a)return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&a>=this.blockSize)for(var o=0;o<this._ints;++o)this._inBlock[o]=e.getInt32(),t.putInt32(this._inBlock[o]^this._outBlock[o]);else{var n=(this.blockSize-a)%this.blockSize;for(n>0&&(n=this.blockSize-n),this._partialOutput.clear(),o=0;o<this._ints;++o)this._partialBlock[o]=e.getInt32(),this._partialOutput.putInt32(this._partialBlock[o]^this._outBlock[o]);if(n>0)e.read-=this.blockSize;else for(o=0;o<this._ints;++o)this._inBlock[o]=this._partialBlock[o];if(this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),n>0&&!r)return t.putBytes(this._partialOutput.getBytes(n-this._partialBytes)),this._partialBytes=n,!0;t.putBytes(this._partialOutput.getBytes(a-this._partialBytes)),this._partialBytes=0}},t.ofb=function(e){e=e||{},this.name="OFB",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._ints=this.blockSize/4,this._inBlock=null,this._outBlock=Array(this._ints),this._partialOutput=r1.util.createBuffer(),this._partialBytes=0},t.ofb.prototype.start=function(e){if(!("iv"in e))throw Error("Invalid IV parameter.");this._iv=r(e.iv,this.blockSize),this._inBlock=this._iv.slice(0),this._partialBytes=0},t.ofb.prototype.encrypt=function(e,t,r){var a=e.length();if(0===e.length())return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&a>=this.blockSize)for(var o=0;o<this._ints;++o)t.putInt32(e.getInt32()^this._outBlock[o]),this._inBlock[o]=this._outBlock[o];else{var n=(this.blockSize-a)%this.blockSize;for(n>0&&(n=this.blockSize-n),this._partialOutput.clear(),o=0;o<this._ints;++o)this._partialOutput.putInt32(e.getInt32()^this._outBlock[o]);if(n>0)e.read-=this.blockSize;else for(o=0;o<this._ints;++o)this._inBlock[o]=this._outBlock[o];if(this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),n>0&&!r)return t.putBytes(this._partialOutput.getBytes(n-this._partialBytes)),this._partialBytes=n,!0;t.putBytes(this._partialOutput.getBytes(a-this._partialBytes)),this._partialBytes=0}},t.ofb.prototype.decrypt=t.ofb.prototype.encrypt,t.ctr=function(e){e=e||{},this.name="CTR",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._ints=this.blockSize/4,this._inBlock=null,this._outBlock=Array(this._ints),this._partialOutput=r1.util.createBuffer(),this._partialBytes=0},t.ctr.prototype.start=function(e){if(!("iv"in e))throw Error("Invalid IV parameter.");this._iv=r(e.iv,this.blockSize),this._inBlock=this._iv.slice(0),this._partialBytes=0},t.ctr.prototype.encrypt=function(e,t,r){var o=e.length();if(0===o)return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&o>=this.blockSize)for(var n=0;n<this._ints;++n)t.putInt32(e.getInt32()^this._outBlock[n]);else{var i=(this.blockSize-o)%this.blockSize;for(i>0&&(i=this.blockSize-i),this._partialOutput.clear(),n=0;n<this._ints;++n)this._partialOutput.putInt32(e.getInt32()^this._outBlock[n]);if(i>0&&(e.read-=this.blockSize),this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),i>0&&!r)return t.putBytes(this._partialOutput.getBytes(i-this._partialBytes)),this._partialBytes=i,!0;t.putBytes(this._partialOutput.getBytes(o-this._partialBytes)),this._partialBytes=0}a(this._inBlock)},t.ctr.prototype.decrypt=t.ctr.prototype.encrypt,t.gcm=function(e){e=e||{},this.name="GCM",this.cipher=e.cipher,this.blockSize=e.blockSize||16,this._ints=this.blockSize/4,this._inBlock=Array(this._ints),this._outBlock=Array(this._ints),this._partialOutput=r1.util.createBuffer(),this._partialBytes=0,this._R=0xe1000000},t.gcm.prototype.start=function(e){if(!("iv"in e))throw Error("Invalid IV parameter.");var t,r=r1.util.createBuffer(e.iv);if(this._cipherLength=0,t="additionalData"in e?r1.util.createBuffer(e.additionalData):r1.util.createBuffer(),this._tagLength="tagLength"in e?e.tagLength:128,this._tag=null,e.decrypt&&(this._tag=r1.util.createBuffer(e.tag).getBytes(),this._tag.length!==this._tagLength/8))throw Error("Authentication tag does not match tag length.");this._hashBlock=Array(this._ints),this.tag=null,this._hashSubkey=Array(this._ints),this.cipher.encrypt([0,0,0,0],this._hashSubkey),this.componentBits=4,this._m=this.generateHashTable(this._hashSubkey,this.componentBits);var n=r.length();if(12===n)this._j0=[r.getInt32(),r.getInt32(),r.getInt32(),1];else{for(this._j0=[0,0,0,0];r.length()>0;)this._j0=this.ghash(this._hashSubkey,this._j0,[r.getInt32(),r.getInt32(),r.getInt32(),r.getInt32()]);this._j0=this.ghash(this._hashSubkey,this._j0,[0,0].concat(o(8*n)))}this._inBlock=this._j0.slice(0),a(this._inBlock),this._partialBytes=0,t=r1.util.createBuffer(t),this._aDataLength=o(8*t.length());var i=t.length()%this.blockSize;for(i&&t.fillWithByte(0,this.blockSize-i),this._s=[0,0,0,0];t.length()>0;)this._s=this.ghash(this._hashSubkey,this._s,[t.getInt32(),t.getInt32(),t.getInt32(),t.getInt32()])},t.gcm.prototype.encrypt=function(e,t,r){var o=e.length();if(0===o)return!0;if(this.cipher.encrypt(this._inBlock,this._outBlock),0===this._partialBytes&&o>=this.blockSize){for(var n=0;n<this._ints;++n)t.putInt32(this._outBlock[n]^=e.getInt32());this._cipherLength+=this.blockSize}else{var i=(this.blockSize-o)%this.blockSize;for(i>0&&(i=this.blockSize-i),this._partialOutput.clear(),n=0;n<this._ints;++n)this._partialOutput.putInt32(e.getInt32()^this._outBlock[n]);if(i<=0||r){if(r){var s=o%this.blockSize;this._cipherLength+=s,this._partialOutput.truncate(this.blockSize-s)}else this._cipherLength+=this.blockSize;for(n=0;n<this._ints;++n)this._outBlock[n]=this._partialOutput.getInt32();this._partialOutput.read-=this.blockSize}if(this._partialBytes>0&&this._partialOutput.getBytes(this._partialBytes),i>0&&!r)return e.read-=this.blockSize,t.putBytes(this._partialOutput.getBytes(i-this._partialBytes)),this._partialBytes=i,!0;t.putBytes(this._partialOutput.getBytes(o-this._partialBytes)),this._partialBytes=0}this._s=this.ghash(this._hashSubkey,this._s,this._outBlock),a(this._inBlock)},t.gcm.prototype.decrypt=function(e,t,r){var o=e.length();if(o<this.blockSize&&!(r&&o>0))return!0;this.cipher.encrypt(this._inBlock,this._outBlock),a(this._inBlock),this._hashBlock[0]=e.getInt32(),this._hashBlock[1]=e.getInt32(),this._hashBlock[2]=e.getInt32(),this._hashBlock[3]=e.getInt32(),this._s=this.ghash(this._hashSubkey,this._s,this._hashBlock);for(var n=0;n<this._ints;++n)t.putInt32(this._outBlock[n]^this._hashBlock[n]);this._cipherLength+=o<this.blockSize?o%this.blockSize:this.blockSize},t.gcm.prototype.afterFinish=function(e,t){var r=!0;t.decrypt&&t.overflow&&e.truncate(this.blockSize-t.overflow),this.tag=r1.util.createBuffer();var a=this._aDataLength.concat(o(8*this._cipherLength));this._s=this.ghash(this._hashSubkey,this._s,a);var n=[];this.cipher.encrypt(this._j0,n);for(var i=0;i<this._ints;++i)this.tag.putInt32(this._s[i]^n[i]);return this.tag.truncate(this.tag.length()%(this._tagLength/8)),t.decrypt&&this.tag.bytes()!==this._tag&&(r=!1),r},t.gcm.prototype.multiply=function(e,t){for(var r=[0,0,0,0],a=t.slice(0),o=0;o<128;++o)e[o/32|0]&1<<31-o%32&&(r[0]^=a[0],r[1]^=a[1],r[2]^=a[2],r[3]^=a[3]),this.pow(a,a);return r},t.gcm.prototype.pow=function(e,t){for(var r=1&e[3],a=3;a>0;--a)t[a]=e[a]>>>1|(1&e[a-1])<<31;t[0]=e[0]>>>1,r&&(t[0]^=this._R)},t.gcm.prototype.tableMultiply=function(e){for(var t=[0,0,0,0],r=0;r<32;++r){var a=this._m[r][e[r/8|0]>>>4*(7-r%8)&15];t[0]^=a[0],t[1]^=a[1],t[2]^=a[2],t[3]^=a[3]}return t},t.gcm.prototype.ghash=function(e,t,r){return t[0]^=r[0],t[1]^=r[1],t[2]^=r[2],t[3]^=r[3],this.tableMultiply(t)},t.gcm.prototype.generateHashTable=function(e,t){for(var r=8/t,a=4*r,o=16*r,n=Array(o),i=0;i<o;++i){var s=[0,0,0,0];s[i/a|0]=1<<t-1<<(a-1-i%a)*t,n[i]=this.generateSubHashTable(this.multiply(s,e),t)}return n},t.gcm.prototype.generateSubHashTable=function(e,t){var r=1<<t,a=r>>>1,o=Array(r);o[a]=e.slice(0);for(var n=a>>>1;n>0;)this.pow(o[2*n],o[n]=[]),n>>=1;for(n=2;n<a;){for(var i=1;i<n;++i){var s=o[n],l=o[i];o[n+i]=[s[0]^l[0],s[1]^l[1],s[2]^l[2],s[3]^l[3]]}n*=2}for(o[0]=[0,0,0,0],n=a+1;n<r;++n){var c=o[n^a];o[n]=[e[0]^c[0],e[1]^c[1],e[2]^c[2],e[3]^c[3]]}return o}}),r1.aes=r1.aes||{},r1.aes.startEncrypting=function(e,t,r,a){var o=au({key:e,output:r,decrypt:!1,mode:a});return o.start(t),o},r1.aes.createEncryptionCipher=function(e,t){return au({key:e,output:null,decrypt:!1,mode:t})},r1.aes.startDecrypting=function(e,t,r,a){var o=au({key:e,output:r,decrypt:!0,mode:a});return o.start(t),o},r1.aes.createDecryptionCipher=function(e,t){return au({key:e,output:null,decrypt:!0,mode:t})},r1.aes.Algorithm=function(e,t){ac||ad();var r=this;r.name=e,r.mode=new t({blockSize:16,cipher:{encrypt:function(e,t){return ap(r._w,e,t,!1)},decrypt:function(e,t){return ap(r._w,e,t,!0)}}}),r._init=!1},r1.aes.Algorithm.prototype.initialize=function(e){if(!this._init){var t,r=e.key;if("string"!=typeof r||16!==r.length&&24!==r.length&&32!==r.length){if(r1.util.isArray(r)&&(16===r.length||24===r.length||32===r.length)){t=r,r=r1.util.createBuffer();for(var a=0;a<t.length;++a)r.putByte(t[a])}}else r=r1.util.createBuffer(r);if(!r1.util.isArray(r)){t=r,r=[];var o=t.length();if(16===o||24===o||32===o)for(o>>>=2,a=0;a<o;++a)r.push(t.getInt32())}if(!r1.util.isArray(r)||4!==r.length&&6!==r.length&&8!==r.length)throw Error("Invalid key parameter.");var n=-1!==["CFB","OFB","CTR","GCM"].indexOf(this.mode.name);this._w=am(r,e.decrypt&&!n),this._init=!0}},r1.aes._expandKey=function(e,t){return ac||ad(),am(e,t)},r1.aes._updateBlock=ap,r6("AES-ECB",r1.cipher.modes.ecb),r6("AES-CBC",r1.cipher.modes.cbc),r6("AES-CFB",r1.cipher.modes.cfb),r6("AES-OFB",r1.cipher.modes.ofb),r6("AES-CTR",r1.cipher.modes.ctr),r6("AES-GCM",r1.cipher.modes.gcm);var r9,r7,ae,at,ar,aa,ao,an,ai,as,al,ac=!1;function ad(){ac=!0,ai=[0,1,2,4,8,16,32,64,128,27,54];for(var e=Array(256),t=0;t<128;++t)e[t]=t<<1,e[t+128]=t+128<<1^283;for(ao=Array(256),an=Array(256),as=[,,,,],al=[,,,,],t=0;t<4;++t)as[t]=Array(256),al[t]=Array(256);var r,a,o,n,i,s,l,c=0,d=0;for(t=0;t<256;++t){ao[c]=n=(n=d^d<<1^d<<2^d<<3^d<<4)>>8^255&n^99,an[n]=c,s=(i=e[n])<<24^n<<16^n<<8^n^i,l=((r=e[c])^(a=e[r])^(o=e[a]))<<24^(c^o)<<16^(c^a^o)<<8^c^r^o;for(var m=0;m<4;++m)as[m][c]=s,al[m][n]=l,s=s<<24|s>>>8,l=l<<24|l>>>8;0===c?c=d=1:(c=r^e[e[e[r^o]]],d^=e[e[d]])}}function am(e,t){for(var r,a=e.slice(0),o=1,n=a.length,i=4*(n+6+1),s=n;s<i;++s)r=a[s-1],s%n==0?(r=ao[r>>>16&255]<<24^ao[r>>>8&255]<<16^ao[255&r]<<8^ao[r>>>24]^ai[o]<<24,o++):n>6&&s%n==4&&(r=ao[r>>>24]<<24^ao[r>>>16&255]<<16^ao[r>>>8&255]<<8^ao[255&r]),a[s]=a[s-n]^r;if(t){for(var l,c=al[0],d=al[1],m=al[2],p=al[3],u=a.slice(0),h=(s=0,(i=a.length)-4);s<i;s+=4,h-=4)if(0===s||s===i-4)u[s]=a[h],u[s+1]=a[h+3],u[s+2]=a[h+2],u[s+3]=a[h+1];else for(var f=0;f<4;++f)u[s+(3&-f)]=c[ao[(l=a[h+f])>>>24]]^d[ao[l>>>16&255]]^m[ao[l>>>8&255]]^p[ao[255&l]];a=u}return a}function ap(e,t,r,a){var o,n,i,s,l,c,d,m,p,u,h,f,y=e.length/4-1;a?(o=al[0],n=al[1],i=al[2],s=al[3],l=an):(o=as[0],n=as[1],i=as[2],s=as[3],l=ao),c=t[0]^e[0],d=t[a?3:1]^e[1],m=t[2]^e[2],p=t[a?1:3]^e[3];for(var g=3,b=1;b<y;++b)u=o[c>>>24]^n[d>>>16&255]^i[m>>>8&255]^s[255&p]^e[++g],h=o[d>>>24]^n[m>>>16&255]^i[p>>>8&255]^s[255&c]^e[++g],f=o[m>>>24]^n[p>>>16&255]^i[c>>>8&255]^s[255&d]^e[++g],p=o[p>>>24]^n[c>>>16&255]^i[d>>>8&255]^s[255&m]^e[++g],c=u,d=h,m=f;r[0]=l[c>>>24]<<24^l[d>>>16&255]<<16^l[m>>>8&255]<<8^l[255&p]^e[++g],r[a?3:1]=l[d>>>24]<<24^l[m>>>16&255]<<16^l[p>>>8&255]<<8^l[255&c]^e[++g],r[2]=l[m>>>24]<<24^l[p>>>16&255]<<16^l[c>>>8&255]<<8^l[255&d]^e[++g],r[a?1:3]=l[p>>>24]<<24^l[c>>>16&255]<<16^l[d>>>8&255]<<8^l[255&m]^e[++g]}function au(e){var t,r="AES-"+((e=e||{}).mode||"CBC").toUpperCase(),a=(t=e.decrypt?r1.cipher.createDecipher(r,e.key):r1.cipher.createCipher(r,e.key)).start;return t.start=function(e,r){var o=null;r instanceof r1.util.ByteBuffer&&(o=r,r={}),(r=r||{}).output=o,r.iv=e,a.call(t,r)},t}function ah(e,t){r1.cipher.registerAlgorithm(e,function(){return new r1.des.Algorithm(e,t)})}r5(function(e){r1.pki=r1.pki||{};var t=e.exports=r1.pki.oids=r1.oids=r1.oids||{};function r(e,r){t[e]=r,t[r]=e}r("1.2.840.113549.1.1.1","rsaEncryption"),r("1.2.840.113549.1.1.4","md5WithRSAEncryption"),r("1.2.840.113549.1.1.5","sha1WithRSAEncryption"),r("1.2.840.113549.1.1.7","RSAES-OAEP"),r("1.2.840.113549.1.1.8","mgf1"),r("1.2.840.113549.1.1.9","pSpecified"),r("1.2.840.113549.1.1.10","RSASSA-PSS"),r("1.2.840.113549.1.1.11","sha256WithRSAEncryption"),r("1.2.840.113549.1.1.12","sha384WithRSAEncryption"),r("1.2.840.113549.1.1.13","sha512WithRSAEncryption"),r("1.3.101.112","EdDSA25519"),r("1.2.840.10040.4.3","dsa-with-sha1"),r("1.3.14.3.2.7","desCBC"),r("1.3.14.3.2.26","sha1"),r("1.3.14.3.2.29","sha1WithRSASignature"),r("2.16.840.1.101.3.4.2.1","sha256"),r("2.16.840.1.101.3.4.2.2","sha384"),r("2.16.840.1.101.3.4.2.3","sha512"),r("2.16.840.1.101.3.4.2.4","sha224"),r("2.16.840.1.101.3.4.2.5","sha512-224"),r("2.16.840.1.101.3.4.2.6","sha512-256"),r("1.2.840.113549.2.2","md2"),r("1.2.840.113549.2.5","md5"),r("1.2.840.113549.1.7.1","data"),r("1.2.840.113549.1.7.2","signedData"),r("1.2.840.113549.1.7.3","envelopedData"),r("1.2.840.113549.1.7.4","signedAndEnvelopedData"),r("1.2.840.113549.1.7.5","digestedData"),r("1.2.840.113549.1.7.6","encryptedData"),r("1.2.840.113549.1.9.1","emailAddress"),r("1.2.840.113549.1.9.2","unstructuredName"),r("1.2.840.113549.1.9.3","contentType"),r("1.2.840.113549.1.9.4","messageDigest"),r("1.2.840.113549.1.9.5","signingTime"),r("1.2.840.113549.1.9.6","counterSignature"),r("1.2.840.113549.1.9.7","challengePassword"),r("1.2.840.113549.1.9.8","unstructuredAddress"),r("1.2.840.113549.1.9.14","extensionRequest"),r("1.2.840.113549.1.9.20","friendlyName"),r("1.2.840.113549.1.9.21","localKeyId"),r("1.2.840.113549.1.9.22.1","x509Certificate"),r("1.2.840.113549.1.12.10.1.1","keyBag"),r("1.2.840.113549.1.12.10.1.2","pkcs8ShroudedKeyBag"),r("1.2.840.113549.1.12.10.1.3","certBag"),r("1.2.840.113549.1.12.10.1.4","crlBag"),r("1.2.840.113549.1.12.10.1.5","secretBag"),r("1.2.840.113549.1.12.10.1.6","safeContentsBag"),r("1.2.840.113549.1.5.13","pkcs5PBES2"),r("1.2.840.113549.1.5.12","pkcs5PBKDF2"),r("1.2.840.113549.1.12.1.1","pbeWithSHAAnd128BitRC4"),r("1.2.840.113549.1.12.1.2","pbeWithSHAAnd40BitRC4"),r("1.2.840.113549.1.12.1.3","pbeWithSHAAnd3-KeyTripleDES-CBC"),r("1.2.840.113549.1.12.1.4","pbeWithSHAAnd2-KeyTripleDES-CBC"),r("1.2.840.113549.1.12.1.5","pbeWithSHAAnd128BitRC2-CBC"),r("1.2.840.113549.1.12.1.6","pbewithSHAAnd40BitRC2-CBC"),r("1.2.840.113549.2.7","hmacWithSHA1"),r("1.2.840.113549.2.8","hmacWithSHA224"),r("1.2.840.113549.2.9","hmacWithSHA256"),r("1.2.840.113549.2.10","hmacWithSHA384"),r("1.2.840.113549.2.11","hmacWithSHA512"),r("1.2.840.113549.3.7","des-EDE3-CBC"),r("2.16.840.1.101.3.4.1.2","aes128-CBC"),r("2.16.840.1.101.3.4.1.22","aes192-CBC"),r("2.16.840.1.101.3.4.1.42","aes256-CBC"),r("2.5.4.3","commonName"),r("2.5.4.4","surname"),r("2.5.4.5","serialNumber"),r("2.5.4.6","countryName"),r("2.5.4.7","localityName"),r("2.5.4.8","stateOrProvinceName"),r("2.5.4.9","streetAddress"),r("2.5.4.10","organizationName"),r("2.5.4.11","organizationalUnitName"),r("2.5.4.12","title"),r("2.5.4.13","description"),r("2.5.4.15","businessCategory"),r("2.5.4.17","postalCode"),r("2.5.4.42","givenName"),r("1.3.6.1.4.1.311.60.2.1.2","jurisdictionOfIncorporationStateOrProvinceName"),r("1.3.6.1.4.1.311.60.2.1.3","jurisdictionOfIncorporationCountryName"),r("2.16.840.1.113730.1.1","nsCertType"),r("2.16.840.1.113730.1.13","nsComment"),t["2.5.29.1"]="authorityKeyIdentifier",t["2.5.29.2"]="keyAttributes",t["2.5.29.3"]="certificatePolicies",t["2.5.29.4"]="keyUsageRestriction",t["2.5.29.5"]="policyMapping",t["2.5.29.6"]="subtreesConstraint",t["2.5.29.7"]="subjectAltName",t["2.5.29.8"]="issuerAltName",t["2.5.29.9"]="subjectDirectoryAttributes",t["2.5.29.10"]="basicConstraints",t["2.5.29.11"]="nameConstraints",t["2.5.29.12"]="policyConstraints",t["2.5.29.13"]="basicConstraints",r("2.5.29.14","subjectKeyIdentifier"),r("2.5.29.15","keyUsage"),t["2.5.29.16"]="privateKeyUsagePeriod",r("2.5.29.17","subjectAltName"),r("2.5.29.18","issuerAltName"),r("2.5.29.19","basicConstraints"),t["2.5.29.20"]="cRLNumber",t["2.5.29.21"]="cRLReason",t["2.5.29.22"]="expirationDate",t["2.5.29.23"]="instructionCode",t["2.5.29.24"]="invalidityDate",t["2.5.29.25"]="cRLDistributionPoints",t["2.5.29.26"]="issuingDistributionPoint",t["2.5.29.27"]="deltaCRLIndicator",t["2.5.29.28"]="issuingDistributionPoint",t["2.5.29.29"]="certificateIssuer",t["2.5.29.30"]="nameConstraints",r("2.5.29.31","cRLDistributionPoints"),r("2.5.29.32","certificatePolicies"),t["2.5.29.33"]="policyMappings",t["2.5.29.34"]="policyConstraints",r("2.5.29.35","authorityKeyIdentifier"),t["2.5.29.36"]="policyConstraints",r("2.5.29.37","extKeyUsage"),t["2.5.29.46"]="freshestCRL",t["2.5.29.54"]="inhibitAnyPolicy",r("1.3.6.1.4.1.11129.2.4.2","timestampList"),r("1.3.6.1.5.5.7.1.1","authorityInfoAccess"),r("1.3.6.1.5.5.7.3.1","serverAuth"),r("1.3.6.1.5.5.7.3.2","clientAuth"),r("1.3.6.1.5.5.7.3.3","codeSigning"),r("1.3.6.1.5.5.7.3.4","emailProtection"),r("1.3.6.1.5.5.7.3.8","timeStamping")}),r5(function(e){var t=e.exports=r1.asn1=r1.asn1||{};function r(e,t,r){if(r>t){var a=Error("Too few bytes to parse DER.");throw a.available=e.length(),a.remaining=t,a.requested=r,a}}t.Class={UNIVERSAL:0,APPLICATION:64,CONTEXT_SPECIFIC:128,PRIVATE:192},t.Type={NONE:0,BOOLEAN:1,INTEGER:2,BITSTRING:3,OCTETSTRING:4,NULL:5,OID:6,ODESC:7,EXTERNAL:8,REAL:9,ENUMERATED:10,EMBEDDED:11,UTF8:12,ROID:13,SEQUENCE:16,SET:17,PRINTABLESTRING:19,IA5STRING:22,UTCTIME:23,GENERALIZEDTIME:24,BMPSTRING:30},t.create=function(e,r,a,o,n){if(r1.util.isArray(o)){for(var i=[],s=0;s<o.length;++s)void 0!==o[s]&&i.push(o[s]);o=i}var l={tagClass:e,type:r,constructed:a,composed:a||r1.util.isArray(o),value:o};return n&&"bitStringContents"in n&&(l.bitStringContents=n.bitStringContents,l.original=t.copy(l)),l},t.copy=function(e,r){var a;if(r1.util.isArray(e)){a=[];for(var o=0;o<e.length;++o)a.push(t.copy(e[o],r));return a}return"string"==typeof e?e:(a={tagClass:e.tagClass,type:e.type,constructed:e.constructed,composed:e.composed,value:t.copy(e.value,r)},r&&!r.excludeBitStringContents&&(a.bitStringContents=e.bitStringContents),a)},t.equals=function(e,r,a){if(r1.util.isArray(e)){if(!r1.util.isArray(r)||e.length!==r.length)return!1;for(var o=0;o<e.length;++o)if(!t.equals(e[o],r[o]))return!1;return!0}if(typeof e!=typeof r)return!1;if("string"==typeof e)return e===r;var n=e.tagClass===r.tagClass&&e.type===r.type&&e.constructed===r.constructed&&e.composed===r.composed&&t.equals(e.value,r.value);return a&&a.includeBitStringContents&&(n=n&&e.bitStringContents===r.bitStringContents),n},t.getBerValueLength=function(e){var t=e.getByte();if(128!==t)return 128&t?e.getInt((127&t)<<3):t},t.fromDer=function(e,a){void 0===a&&(a={strict:!0,parseAllBytes:!0,decodeBitStrings:!0}),"boolean"==typeof a&&(a={strict:a,parseAllBytes:!0,decodeBitStrings:!0}),"strict"in a||(a.strict=!0),"parseAllBytes"in a||(a.parseAllBytes=!0),"decodeBitStrings"in a||(a.decodeBitStrings=!0),"string"==typeof e&&(e=r1.util.createBuffer(e));var o=e.length(),n=function e(a,o,n,i){r(a,o,2);var s=a.getByte();o--;var l,c,d=192&s,m=31&s,p=a.length(),u=function(e,t){var a,o=e.getByte();if(t--,128!==o){if(128&o){var n=127&o;r(e,t,n),a=e.getInt(n<<3)}else a=o;if(a<0)throw Error("Negative length: "+a);return a}}(a,o);if(o-=p-a.length(),void 0!==u&&u>o){if(i.strict){var h=Error("Too few bytes to read ASN.1 value.");throw h.available=a.length(),h.remaining=o,h.requested=u,h}u=o}var f=!(32&~s);if(f)if(l=[],void 0===u)for(;;){if(r(a,o,2),a.bytes(2)===String.fromCharCode(0,0)){a.getBytes(2),o-=2;break}p=a.length(),l.push(e(a,o,n+1,i)),o-=p-a.length()}else for(;u>0;)p=a.length(),l.push(e(a,u,n+1,i)),o-=p-a.length(),u-=p-a.length();if(void 0===l&&d===t.Class.UNIVERSAL&&m===t.Type.BITSTRING&&(c=a.bytes(u)),void 0===l&&i.decodeBitStrings&&d===t.Class.UNIVERSAL&&m===t.Type.BITSTRING&&u>1){var y=a.read,g=o,b=0;if(m===t.Type.BITSTRING&&(r(a,o,1),b=a.getByte(),o--),0===b)try{p=a.length();var k=e(a,o,n+1,{strict:!0,decodeBitStrings:!0}),v=p-a.length();o-=v,m==t.Type.BITSTRING&&v++;var x=k.tagClass;v!==u||x!==t.Class.UNIVERSAL&&x!==t.Class.CONTEXT_SPECIFIC||(l=[k])}catch(e){}void 0===l&&(a.read=y,o=g)}if(void 0===l){if(void 0===u){if(i.strict)throw Error("Non-constructed ASN.1 object of indefinite length.");u=o}if(m===t.Type.BMPSTRING)for(l="";u>0;u-=2)r(a,o,2),l+=String.fromCharCode(a.getInt16()),o-=2;else l=a.getBytes(u),o-=u}return t.create(d,m,f,l,void 0===c?null:{bitStringContents:c})}(e,e.length(),0,a);if(a.parseAllBytes&&0!==e.length()){var i=Error("Unparsed DER bytes remain after ASN.1 parsing.");throw i.byteCount=o,i.remaining=e.length(),i}return n},t.toDer=function(e){var r=r1.util.createBuffer(),a=e.tagClass|e.type,o=r1.util.createBuffer(),n=!1;if("bitStringContents"in e&&(n=!0,e.original&&(n=t.equals(e,e.original))),n)o.putBytes(e.bitStringContents);else if(e.composed){e.constructed?a|=32:o.putByte(0);for(var i=0;i<e.value.length;++i)void 0!==e.value[i]&&o.putBuffer(t.toDer(e.value[i]))}else if(e.type===t.Type.BMPSTRING)for(i=0;i<e.value.length;++i)o.putInt16(e.value.charCodeAt(i));else!(e.type===t.Type.INTEGER&&e.value.length>1)||(0!==e.value.charCodeAt(0)||128&e.value.charCodeAt(1))&&(255!==e.value.charCodeAt(0)||128&~e.value.charCodeAt(1))?o.putBytes(e.value):o.putBytes(e.value.substr(1));if(r.putByte(a),127>=o.length())r.putByte(127&o.length());else{var s=o.length(),l="";do l+=String.fromCharCode(255&s),s>>>=8;while(s>0)for(r.putByte(128|l.length),i=l.length-1;i>=0;--i)r.putByte(l.charCodeAt(i))}return r.putBuffer(o),r},t.oidToDer=function(e){var t,r,a,o,n=e.split("."),i=r1.util.createBuffer();i.putByte(40*parseInt(n[0],10)+parseInt(n[1],10));for(var s=2;s<n.length;++s){t=!0,r=[],a=parseInt(n[s],10);do o=127&a,a>>>=7,t||(o|=128),r.push(o),t=!1;while(a>0)for(var l=r.length-1;l>=0;--l)i.putByte(r[l])}return i},t.derToOid=function(e){"string"==typeof e&&(e=r1.util.createBuffer(e));var t,r=e.getByte();t=Math.floor(r/40)+"."+r%40;for(var a=0;e.length()>0;)a<<=7,128&(r=e.getByte())?a+=127&r:(t+="."+(a+r),a=0);return t},t.utcTimeToDate=function(e){var t=new Date,r=parseInt(e.substr(0,2),10);r=r>=50?1900+r:2e3+r;var a=parseInt(e.substr(2,2),10)-1,o=parseInt(e.substr(4,2),10),n=parseInt(e.substr(6,2),10),i=parseInt(e.substr(8,2),10),s=0;if(e.length>11){var l=e.charAt(10),c=10;"+"!==l&&"-"!==l&&(s=parseInt(e.substr(10,2),10),c+=2)}if(t.setUTCFullYear(r,a,o),t.setUTCHours(n,i,s,0),c&&("+"===(l=e.charAt(c))||"-"===l)){var d=60*parseInt(e.substr(c+1,2),10)+parseInt(e.substr(c+4,2),10);d*=6e4,t.setTime("+"===l?t-d:+t+d)}return t},t.generalizedTimeToDate=function(e){var t=new Date,r=parseInt(e.substr(0,4),10),a=parseInt(e.substr(4,2),10)-1,o=parseInt(e.substr(6,2),10),n=parseInt(e.substr(8,2),10),i=parseInt(e.substr(10,2),10),s=parseInt(e.substr(12,2),10),l=0,c=0,d=!1;"Z"===e.charAt(e.length-1)&&(d=!0);var m=e.length-5,p=e.charAt(m);return"+"!==p&&"-"!==p||(c=(60*parseInt(e.substr(m+1,2),10)+parseInt(e.substr(m+4,2),10))*6e4,"+"===p&&(c*=-1),d=!0),"."===e.charAt(14)&&(l=1e3*parseFloat(e.substr(14),10)),d?(t.setUTCFullYear(r,a,o),t.setUTCHours(n,i,s,l),t.setTime(+t+c)):(t.setFullYear(r,a,o),t.setHours(n,i,s,l)),t},t.dateToUtcTime=function(e){if("string"==typeof e)return e;var t="",r=[];r.push((""+e.getUTCFullYear()).substr(2)),r.push(""+(e.getUTCMonth()+1)),r.push(""+e.getUTCDate()),r.push(""+e.getUTCHours()),r.push(""+e.getUTCMinutes()),r.push(""+e.getUTCSeconds());for(var a=0;a<r.length;++a)r[a].length<2&&(t+="0"),t+=r[a];return t+"Z"},t.dateToGeneralizedTime=function(e){if("string"==typeof e)return e;var t="",r=[];r.push(""+e.getUTCFullYear()),r.push(""+(e.getUTCMonth()+1)),r.push(""+e.getUTCDate()),r.push(""+e.getUTCHours()),r.push(""+e.getUTCMinutes()),r.push(""+e.getUTCSeconds());for(var a=0;a<r.length;++a)r[a].length<2&&(t+="0"),t+=r[a];return t+"Z"},t.integerToDer=function(e){var t=r1.util.createBuffer();if(e>=-128&&e<128)return t.putSignedInt(e,8);if(e>=-32768&&e<32768)return t.putSignedInt(e,16);if(e>=-8388608&&e<8388608)return t.putSignedInt(e,24);if(e>=-0x80000000&&e<0x80000000)return t.putSignedInt(e,32);var r=Error("Integer too large; max is 32-bits.");throw r.integer=e,r},t.derToInteger=function(e){"string"==typeof e&&(e=r1.util.createBuffer(e));var t=8*e.length();if(t>32)throw Error("Integer too large; max is 32-bits.");return e.getSignedInt(t)},t.validate=function(e,r,a,o){var n=!1;if(e.tagClass!==r.tagClass&&void 0!==r.tagClass||e.type!==r.type&&void 0!==r.type)o&&(e.tagClass!==r.tagClass&&o.push("["+r.name+'] Expected tag class "'+r.tagClass+'", got "'+e.tagClass+'"'),e.type!==r.type&&o.push("["+r.name+'] Expected type "'+r.type+'", got "'+e.type+'"'));else if(e.constructed===r.constructed||void 0===r.constructed){if(n=!0,r.value&&r1.util.isArray(r.value))for(var i=0,s=0;n&&s<r.value.length;++s)n=r.value[s].optional||!1,e.value[i]&&((n=t.validate(e.value[i],r.value[s],a,o))?++i:r.value[s].optional&&(n=!0)),!n&&o&&o.push("["+r.name+'] Tag class "'+r.tagClass+'", type "'+r.type+'" expected value length "'+r.value.length+'", got "'+e.value.length+'"');if(n&&a&&(r.capture&&(a[r.capture]=e.value),r.captureAsn1&&(a[r.captureAsn1]=e),r.captureBitStringContents&&"bitStringContents"in e&&(a[r.captureBitStringContents]=e.bitStringContents),r.captureBitStringValue&&"bitStringContents"in e))if(e.bitStringContents.length<2)a[r.captureBitStringValue]="";else{if(0!==e.bitStringContents.charCodeAt(0))throw Error("captureBitStringValue only supported for zero unused bits");a[r.captureBitStringValue]=e.bitStringContents.slice(1)}}else o&&o.push("["+r.name+'] Expected constructed "'+r.constructed+'", got "'+e.constructed+'"');return n};var a=/[^\\u0000-\\u00ff]/;t.prettyPrint=function(e,r,o){var n="";o=o||2,(r=r||0)>0&&(n+="\n");for(var i="",s=0;s<r*o;++s)i+=" ";switch(n+=i+"Tag: ",e.tagClass){case t.Class.UNIVERSAL:n+="Universal:";break;case t.Class.APPLICATION:n+="Application:";break;case t.Class.CONTEXT_SPECIFIC:n+="Context-Specific:";break;case t.Class.PRIVATE:n+="Private:"}if(e.tagClass===t.Class.UNIVERSAL)switch(n+=e.type,e.type){case t.Type.NONE:n+=" (None)";break;case t.Type.BOOLEAN:n+=" (Boolean)";break;case t.Type.INTEGER:n+=" (Integer)";break;case t.Type.BITSTRING:n+=" (Bit string)";break;case t.Type.OCTETSTRING:n+=" (Octet string)";break;case t.Type.NULL:n+=" (Null)";break;case t.Type.OID:n+=" (Object Identifier)";break;case t.Type.ODESC:n+=" (Object Descriptor)";break;case t.Type.EXTERNAL:n+=" (External or Instance of)";break;case t.Type.REAL:n+=" (Real)";break;case t.Type.ENUMERATED:n+=" (Enumerated)";break;case t.Type.EMBEDDED:n+=" (Embedded PDV)";break;case t.Type.UTF8:n+=" (UTF8)";break;case t.Type.ROID:n+=" (Relative Object Identifier)";break;case t.Type.SEQUENCE:n+=" (Sequence)";break;case t.Type.SET:n+=" (Set)";break;case t.Type.PRINTABLESTRING:n+=" (Printable String)";break;case t.Type.IA5String:n+=" (IA5String (ASCII))";break;case t.Type.UTCTIME:n+=" (UTC time)";break;case t.Type.GENERALIZEDTIME:n+=" (Generalized time)";break;case t.Type.BMPSTRING:n+=" (BMP String)"}else n+=e.type;if(n+="\n",n+=i+"Constructed: "+e.constructed+"\n",e.composed){var l=0,c="";for(s=0;s<e.value.length;++s)void 0!==e.value[s]&&(l+=1,c+=t.prettyPrint(e.value[s],r+1,o),s+1<e.value.length&&(c+=","));n+=i+"Sub values: "+l+c}else{if(n+=i+"Value: ",e.type===t.Type.OID){var d=t.derToOid(e.value);n+=d,r1.pki&&r1.pki.oids&&d in r1.pki.oids&&(n+=" ("+r1.pki.oids[d]+") ")}if(e.type===t.Type.INTEGER)try{n+=t.derToInteger(e.value)}catch(t){n+="0x"+r1.util.bytesToHex(e.value)}else if(e.type===t.Type.BITSTRING){if(n+=e.value.length>1?"0x"+r1.util.bytesToHex(e.value.slice(1)):"(none)",e.value.length>0){var m=e.value.charCodeAt(0);1==m?n+=" (1 unused bit shown)":m>1&&(n+=" ("+m+" unused bits shown)")}}else if(e.type===t.Type.OCTETSTRING)a.test(e.value)||(n+="("+e.value+") "),n+="0x"+r1.util.bytesToHex(e.value);else if(e.type===t.Type.UTF8)try{n+=r1.util.decodeUtf8(e.value)}catch(t){if("URI malformed"!==t.message)throw t;n+="0x"+r1.util.bytesToHex(e.value)+" (malformed UTF8)"}else e.type===t.Type.PRINTABLESTRING||e.type===t.Type.IA5String?n+=e.value:a.test(e.value)?n+="0x"+r1.util.bytesToHex(e.value):n+=0===e.value.length?"[null]":e.value}return n}}),r1.md=r1.md||{},r1.md.algorithms=r1.md.algorithms||{},r5(function(e){(e.exports=r1.hmac=r1.hmac||{}).create=function(){var e=null,t=null,r=null,a=null,o={start:function(o,n){if(null!==o)if("string"==typeof o){if(!((o=o.toLowerCase())in r1.md.algorithms))throw Error('Unknown hash algorithm "'+o+'"');t=r1.md.algorithms[o].create()}else t=o;if(null===n)n=e;else{if("string"==typeof n)n=r1.util.createBuffer(n);else if(r1.util.isArray(n)){var i=n;n=r1.util.createBuffer();for(var s=0;s<i.length;++s)n.putByte(i[s])}var l=n.length();for(l>t.blockLength&&(t.start(),t.update(n.bytes()),n=t.digest()),r=r1.util.createBuffer(),a=r1.util.createBuffer(),l=n.length(),s=0;s<l;++s)i=n.at(s),r.putByte(54^i),a.putByte(92^i);if(l<t.blockLength)for(i=t.blockLength-l,s=0;s<i;++s)r.putByte(54),a.putByte(92);e=n,r=r.bytes(),a=a.bytes()}t.start(),t.update(r)},update:function(e){t.update(e)},getMac:function(){var e=t.digest().bytes();return t.start(),t.update(a),t.update(e),t.digest()}};return o.digest=o.getMac,o}}),r5(function(e){var t=e.exports=r1.md5=r1.md5||{};r1.md.md5=r1.md.algorithms.md5=t,t.create=function(){i||function(){r=String.fromCharCode(128)+r1.util.fillString("\0",64),a=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,1,6,11,0,5,10,15,4,9,14,3,8,13,2,7,12,5,8,11,14,1,4,7,10,13,0,3,6,9,12,15,2,0,7,14,5,12,3,10,1,8,15,6,13,4,11,2,9],o=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21],n=Array(64);for(var e=0;e<64;++e)n[e]=Math.floor(0x100000000*Math.abs(Math.sin(e+1)));i=!0}();var e=null,t=r1.util.createBuffer(),l=Array(16),c={algorithm:"md5",blockLength:64,digestLength:16,messageLength:0,fullMessageLength:null,messageLengthSize:8,start:function(){c.messageLength=0,c.fullMessageLength=c.messageLength64=[];for(var r=c.messageLengthSize/4,a=0;a<r;++a)c.fullMessageLength.push(0);return t=r1.util.createBuffer(),e={h0:0x67452301,h1:0xefcdab89,h2:0x98badcfe,h3:0x10325476},c}};return c.start(),c.update=function(r,a){"utf8"===a&&(r=r1.util.encodeUtf8(r));var o=r.length;c.messageLength+=o,o=[o/0x100000000>>>0,o>>>0];for(var n=c.fullMessageLength.length-1;n>=0;--n)c.fullMessageLength[n]+=o[1],o[1]=o[0]+(c.fullMessageLength[n]/0x100000000>>>0),c.fullMessageLength[n]=c.fullMessageLength[n]>>>0,o[0]=o[1]/0x100000000>>>0;return t.putBytes(r),s(e,l,t),(t.read>2048||0===t.length())&&t.compact(),c},c.digest=function(){var a=r1.util.createBuffer();a.putBytes(t.bytes()),a.putBytes(r.substr(0,c.blockLength-(c.fullMessageLength[c.fullMessageLength.length-1]+c.messageLengthSize&c.blockLength-1)));for(var o,n=0,i=c.fullMessageLength.length-1;i>=0;--i)n=(o=8*c.fullMessageLength[i]+n)/0x100000000>>>0,a.putInt32Le(o>>>0);var d={h0:e.h0,h1:e.h1,h2:e.h2,h3:e.h3};s(d,l,a);var m=r1.util.createBuffer();return m.putInt32Le(d.h0),m.putInt32Le(d.h1),m.putInt32Le(d.h2),m.putInt32Le(d.h3),m},c};var r=null,a=null,o=null,n=null,i=!1;function s(e,t,r){for(var i,s,l,c,d,m,p,u=r.length();u>=64;){for(s=e.h0,l=e.h1,c=e.h2,d=e.h3,p=0;p<16;++p)t[p]=r.getInt32Le(),i=s+(d^l&(c^d))+n[p]+t[p],s=d,d=c,c=l,l+=i<<(m=o[p])|i>>>32-m;for(;p<32;++p)i=s+(c^d&(l^c))+n[p]+t[a[p]],s=d,d=c,c=l,l+=i<<(m=o[p])|i>>>32-m;for(;p<48;++p)i=s+(l^c^d)+n[p]+t[a[p]],s=d,d=c,c=l,l+=i<<(m=o[p])|i>>>32-m;for(;p<64;++p)i=s+(c^(l|~d))+n[p]+t[a[p]],s=d,d=c,c=l,l+=i<<(m=o[p])|i>>>32-m;e.h0=e.h0+s|0,e.h1=e.h1+l|0,e.h2=e.h2+c|0,e.h3=e.h3+d|0,u-=64}}}),r5(function(e){var t=e.exports=r1.pem=r1.pem||{};function r(e){for(var t=e.name+": ",r=[],a=function(e,t){return" "+t},o=0;o<e.values.length;++o)r.push(e.values[o].replace(/^(\S+\r\n)/,a));t+=r.join(",")+"\r\n";var n=0,i=-1;for(o=0;o<t.length;++o,++n)if(n>65&&-1!==i){var s=t[i];","===s?(++i,t=t.substr(0,i)+"\r\n "+t.substr(i)):t=t.substr(0,i)+"\r\n"+s+t.substr(i+1),n=o-i-1,i=-1,++o}else" "!==t[o]&&"	"!==t[o]&&","!==t[o]||(i=o);return t}t.encode=function(e,t){t=t||{};var a,o="-----BEGIN "+e.type+"-----\r\n";if(e.procType&&(o+=r(a={name:"Proc-Type",values:[String(e.procType.version),e.procType.type]})),e.contentDomain&&(o+=r(a={name:"Content-Domain",values:[e.contentDomain]})),e.dekInfo&&(a={name:"DEK-Info",values:[e.dekInfo.algorithm]},e.dekInfo.parameters&&a.values.push(e.dekInfo.parameters),o+=r(a)),e.headers)for(var n=0;n<e.headers.length;++n)o+=r(e.headers[n]);return e.procType&&(o+="\r\n"),(o+=r1.util.encode64(e.body,t.maxline||64)+"\r\n")+"-----END "+e.type+"-----\r\n"},t.decode=function(e){for(var t,r=[],a=/\s*-----BEGIN ([A-Z0-9- ]+)-----\r?\n?([\x21-\x7e\s]+?(?:\r?\n\r?\n))?([:A-Za-z0-9+\/=\s]+?)-----END \1-----/g,o=/([\x21-\x7e]+):\s*([\x21-\x7e\s^:]+)/,n=/\r?\n/;t=a.exec(e);){var i=t[1];"NEW CERTIFICATE REQUEST"===i&&(i="CERTIFICATE REQUEST");var s={type:i,procType:null,contentDomain:null,dekInfo:null,headers:[],body:r1.util.decode64(t[3])};if(r.push(s),t[2]){for(var l=t[2].split(n),c=0;t&&c<l.length;){for(var d=l[c].replace(/\s+$/,""),m=c+1;m<l.length;++m){var p=l[m];if(!/\s/.test(p[0]))break;d+=p,c=m}if(t=d.match(o)){for(var u={name:t[1],values:[]},h=t[2].split(","),f=0;f<h.length;++f)u.values.push(h[f].replace(/^\s+/,""));if(s.procType)if(s.contentDomain||"Content-Domain"!==u.name)if(s.dekInfo||"DEK-Info"!==u.name)s.headers.push(u);else{if(0===u.values.length)throw Error('Invalid PEM formatted message. The "DEK-Info" header must have at least one subfield.');s.dekInfo={algorithm:h[0],parameters:h[1]||null}}else s.contentDomain=h[0]||"";else{if("Proc-Type"!==u.name)throw Error('Invalid PEM formatted message. The first encapsulated header must be "Proc-Type".');if(2!==u.values.length)throw Error('Invalid PEM formatted message. The "Proc-Type" header must have two subfields.');s.procType={version:h[0],type:h[1]}}}++c}if("ENCRYPTED"===s.procType&&!s.dekInfo)throw Error('Invalid PEM formatted message. The "DEK-Info" header must be present if "Proc-Type" is "ENCRYPTED".')}}if(0===r.length)throw Error("Invalid PEM formatted message.");return r}}),r1.des=r1.des||{},r1.des.startEncrypting=function(e,t,r,a){var o=aw({key:e,output:r,decrypt:!1,mode:a||(null===t?"ECB":"CBC")});return o.start(t),o},r1.des.createEncryptionCipher=function(e,t){return aw({key:e,output:null,decrypt:!1,mode:t})},r1.des.startDecrypting=function(e,t,r,a){var o=aw({key:e,output:r,decrypt:!0,mode:a||(null===t?"ECB":"CBC")});return o.start(t),o},r1.des.createDecryptionCipher=function(e,t){return aw({key:e,output:null,decrypt:!0,mode:t})},r1.des.Algorithm=function(e,t){var r=this;r.name=e,r.mode=new t({blockSize:8,cipher:{encrypt:function(e,t){return aC(r._keys,e,t,!1)},decrypt:function(e,t){return aC(r._keys,e,t,!0)}}}),r._init=!1},r1.des.Algorithm.prototype.initialize=function(e){if(!this._init){var t=r1.util.createBuffer(e.key);if(0===this.name.indexOf("3DES")&&24!==t.length())throw Error("Invalid Triple-DES key size: "+8*t.length());this._keys=function(e){for(var t,r=[0,4,0x20000000,0x20000004,65536,65540,0x20010000,0x20010004,512,516,0x20000200,0x20000204,66048,66052,0x20010200,0x20010204],a=[0,1,1048576,1048577,0x4000000,0x4000001,0x4100000,0x4100001,256,257,1048832,1048833,0x4000100,0x4000101,0x4100100,0x4100101],o=[0,8,2048,2056,0x1000000,0x1000008,0x1000800,0x1000808,0,8,2048,2056,0x1000000,0x1000008,0x1000800,0x1000808],n=[0,2097152,0x8000000,0x8200000,8192,2105344,0x8002000,0x8202000,131072,2228224,0x8020000,0x8220000,139264,2236416,0x8022000,0x8222000],i=[0,262144,16,262160,0,262144,16,262160,4096,266240,4112,266256,4096,266240,4112,266256],s=[0,1024,32,1056,0,1024,32,1056,0x2000000,0x2000400,0x2000020,0x2000420,0x2000000,0x2000400,0x2000020,0x2000420],l=[0,0x10000000,524288,0x10080000,2,0x10000002,524290,0x10080002,0,0x10000000,524288,0x10080000,2,0x10000002,524290,0x10080002],c=[0,65536,2048,67584,0x20000000,0x20010000,0x20000800,0x20010800,131072,196608,133120,198656,0x20020000,0x20030000,0x20020800,0x20030800],d=[0,262144,0,262144,2,262146,2,262146,0x2000000,0x2040000,0x2000000,0x2040000,0x2000002,0x2040002,0x2000002,0x2040002],m=[0,0x10000000,8,0x10000008,0,0x10000000,8,0x10000008,1024,0x10000400,1032,0x10000408,1024,0x10000400,1032,0x10000408],p=[0,32,0,32,1048576,1048608,1048576,1048608,8192,8224,8192,8224,1056768,1056800,1056768,1056800],u=[0,0x1000000,512,0x1000200,2097152,0x1200000,2097664,0x1200200,0x4000000,0x5000000,0x4000200,0x5000200,0x4200000,0x5200000,0x4200200,0x5200200],h=[0,4096,0x8000000,0x8001000,524288,528384,0x8080000,0x8081000,16,4112,0x8000010,0x8001010,524304,528400,0x8080010,0x8081010],f=[0,4,256,260,0,4,256,260,1,5,257,261,1,5,257,261],y=e.length()>8?3:1,g=[],b=[0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0],k=0,v=0;v<y;v++){var x=e.getInt32(),z=e.getInt32();x^=(t=0xf0f0f0f&(x>>>4^z))<<4,x^=t=65535&((z^=t)>>>-16^x),x^=(t=0x33333333&(x>>>2^(z^=t<<-16)))<<2,x^=t=65535&((z^=t)>>>-16^x),x^=(t=0x55555555&(x>>>1^(z^=t<<-16)))<<1,x^=t=0xff00ff&((z^=t)>>>8^x),t=(x^=(t=0x55555555&(x>>>1^(z^=t<<8)))<<1)<<8|(z^=t)>>>20&240,x=z<<24|z<<8&0xff0000|z>>>8&65280|z>>>24&240,z=t;for(var C=0;C<b.length;++C){b[C]?(x=x<<2|x>>>26,z=z<<2|z>>>26):(x=x<<1|x>>>27,z=z<<1|z>>>27);var w=r[(x&=-15)>>>28]|a[x>>>24&15]|o[x>>>20&15]|n[x>>>16&15]|i[x>>>12&15]|s[x>>>8&15]|l[x>>>4&15],S=c[(z&=-15)>>>28]|d[z>>>24&15]|m[z>>>20&15]|p[z>>>16&15]|u[z>>>12&15]|h[z>>>8&15]|f[z>>>4&15];g[k++]=w^(t=65535&(S>>>16^w)),g[k++]=S^t<<16}}return g}(t),this._init=!0}},ah("DES-ECB",r1.cipher.modes.ecb),ah("DES-CBC",r1.cipher.modes.cbc),ah("DES-CFB",r1.cipher.modes.cfb),ah("DES-OFB",r1.cipher.modes.ofb),ah("DES-CTR",r1.cipher.modes.ctr),ah("3DES-ECB",r1.cipher.modes.ecb),ah("3DES-CBC",r1.cipher.modes.cbc),ah("3DES-CFB",r1.cipher.modes.cfb),ah("3DES-OFB",r1.cipher.modes.ofb),ah("3DES-CTR",r1.cipher.modes.ctr);var af=[0x1010400,0,65536,0x1010404,0x1010004,66564,4,65536,1024,0x1010400,0x1010404,1024,0x1000404,0x1010004,0x1000000,4,1028,0x1000400,0x1000400,66560,66560,0x1010000,0x1010000,0x1000404,65540,0x1000004,0x1000004,65540,0,1028,66564,0x1000000,65536,0x1010404,4,0x1010000,0x1010400,0x1000000,0x1000000,1024,0x1010004,65536,66560,0x1000004,1024,4,0x1000404,66564,0x1010404,65540,0x1010000,0x1000404,0x1000004,1028,66564,0x1010400,1028,0x1000400,0x1000400,0,65540,66560,0,0x1010004],ay=[-0x7fef7fe0,-0x7fff8000,32768,1081376,1048576,32,-0x7fefffe0,-0x7fff7fe0,-0x7fffffe0,-0x7fef7fe0,-0x7fef8000,-0x80000000,-0x7fff8000,1048576,32,-0x7fefffe0,1081344,1048608,-0x7fff7fe0,0,-0x80000000,32768,1081376,-0x7ff00000,1048608,-0x7fffffe0,0,1081344,32800,-0x7fef8000,-0x7ff00000,32800,0,1081376,-0x7fefffe0,1048576,-0x7fff7fe0,-0x7ff00000,-0x7fef8000,32768,-0x7ff00000,-0x7fff8000,32,-0x7fef7fe0,1081376,32,32768,-0x80000000,32800,-0x7fef8000,1048576,-0x7fffffe0,1048608,-0x7fff7fe0,-0x7fffffe0,1048608,1081344,0,-0x7fff8000,32800,-0x80000000,-0x7fefffe0,-0x7fef7fe0,1081344],ag=[520,0x8020200,0,0x8020008,0x8000200,0,131592,0x8000200,131080,0x8000008,0x8000008,131072,0x8020208,131080,0x8020000,520,0x8000000,8,0x8020200,512,131584,0x8020000,0x8020008,131592,0x8000208,131584,131072,0x8000208,8,0x8020208,512,0x8000000,0x8020200,0x8000000,131080,520,131072,0x8020200,0x8000200,0,512,131080,0x8020208,0x8000200,0x8000008,512,0,0x8020008,0x8000208,131072,0x8000000,0x8020208,8,131592,131584,0x8000008,0x8020000,0x8000208,520,0x8020000,131592,8,0x8020008,131584],ab=[8396801,8321,8321,128,8396928,8388737,8388609,8193,0,8396800,8396800,8396929,129,0,8388736,8388609,1,8192,8388608,8396801,128,8388608,8193,8320,8388737,1,8320,8388736,8192,8396928,8396929,129,8388736,8388609,8396800,8396929,129,0,0,8396800,8320,8388736,8388737,1,8396801,8321,8321,128,8396929,129,1,8192,8388609,8193,8396928,8388737,8193,8320,8388608,8396801,128,8388608,8192,8396928],ak=[256,0x2080100,0x2080000,0x42000100,524288,256,0x40000000,0x2080000,0x40080100,524288,0x2000100,0x40080100,0x42000100,0x42080000,524544,0x40000000,0x2000000,0x40080000,0x40080000,0,0x40000100,0x42080100,0x42080100,0x2000100,0x42080000,0x40000100,0,0x42000000,0x2080100,0x2000000,0x42000000,524544,524288,0x42000100,256,0x2000000,0x40000000,0x2080000,0x42000100,0x40080100,0x2000100,0x40000000,0x42080000,0x2080100,0x40080100,256,0x2000000,0x42080000,0x42080100,524544,0x42000000,0x42080100,0x2080000,0,0x40080000,0x42000000,524544,0x2000100,0x40000100,524288,0,0x40080000,0x2080100,0x40000100],av=[0x20000010,0x20400000,16384,0x20404010,0x20400000,16,0x20404010,4194304,0x20004000,4210704,4194304,0x20000010,4194320,0x20004000,0x20000000,16400,0,4194320,0x20004010,16384,4210688,0x20004010,16,0x20400010,0x20400010,0,4210704,0x20404000,16400,4210688,0x20404000,0x20000000,0x20004000,16,0x20400010,4210688,0x20404010,4194304,16400,0x20000010,4194304,0x20004000,0x20000000,16400,0x20000010,0x20404010,4210688,0x20400000,4210704,0x20404000,0,0x20400010,16,16384,0x20400000,4210704,16384,4194320,0x20004010,0,0x20404000,0x20000000,4194320,0x20004010],ax=[2097152,0x4200002,0x4000802,0,2048,0x4000802,2099202,0x4200800,0x4200802,2097152,0,0x4000002,2,0x4000000,0x4200002,2050,0x4000800,2099202,2097154,0x4000800,0x4000002,0x4200000,0x4200800,2097154,0x4200000,2048,2050,0x4200802,2099200,2,0x4000000,2099200,0x4000000,2099200,2097152,0x4000802,0x4000802,0x4200002,0x4200002,2,2097154,0x4000000,0x4000800,2097152,0x4200800,2050,2099202,0x4200800,2050,0x4000002,0x4200802,0x4200000,2099200,0,2,0x4200802,0,2099202,0x4200000,2048,0x4000002,0x4000800,2048,2097154],az=[0x10001040,4096,262144,0x10041040,0x10000000,0x10001040,64,0x10000000,262208,0x10040000,0x10041040,266240,0x10041000,266304,4096,64,0x10040000,0x10000040,0x10001000,4160,266240,262208,0x10040040,0x10041000,4160,0,0,0x10040040,0x10000040,0x10001000,266304,262144,266304,262144,0x10041000,4096,64,0x10040040,4096,266304,0x10001000,64,0x10000040,0x10040000,0x10040040,0x10000000,262144,0x10001040,0,0x10041040,262208,0x10000040,0x10040000,0x10001000,0x10001040,0,0x10041040,266240,266240,4160,4160,262208,0x10000000,0x10041000];function aC(e,t,r,a){var o,n,i=32===e.length?3:9;o=3===i?a?[30,-2,-2]:[0,32,2]:a?[94,62,-2,32,64,2,30,-2,-2]:[0,32,2,62,30,-2,64,96,2];var s=t[0],l=t[1];s^=(n=0xf0f0f0f&(s>>>4^l))<<4,s^=(n=65535&(s>>>16^(l^=n)))<<16,s^=n=0x33333333&((l^=n)>>>2^s),s^=n=0xff00ff&((l^=n<<2)>>>8^s),s=(s^=(n=0x55555555&(s>>>1^(l^=n<<8)))<<1)<<1|s>>>31,l=(l^=n)<<1|l>>>31;for(var c=0;c<i;c+=3){for(var d=o[c+1],m=o[c+2],p=o[c];p!=d;p+=m){var u=l^e[p],h=(l>>>4|l<<28)^e[p+1];n=s,s=l,l=n^(ay[u>>>24&63]|ab[u>>>16&63]|av[u>>>8&63]|az[63&u]|af[h>>>24&63]|ag[h>>>16&63]|ak[h>>>8&63]|ax[63&h])}n=s,s=l,l=n}l=l>>>1|l<<31,l^=n=0x55555555&((s=s>>>1|s<<31)>>>1^l),l^=(n=0xff00ff&(l>>>8^(s^=n<<1)))<<8,l^=(n=0x33333333&(l>>>2^(s^=n)))<<2,l^=n=65535&((s^=n)>>>16^l),l^=n=0xf0f0f0f&((s^=n<<16)>>>4^l),r[0]=s^=n<<4,r[1]=l}function aw(e){var t,r="DES-"+((e=e||{}).mode||"CBC").toUpperCase(),a=(t=e.decrypt?r1.cipher.createDecipher(r,e.key):r1.cipher.createCipher(r,e.key)).start;return t.start=function(e,r){var o=null;r instanceof r1.util.ByteBuffer&&(o=r,r={}),(r=r||{}).output=o,r.iv=e,a.call(t,r)},t}var aS,a_={__proto__:null,default:{}},aE=r1.pkcs5=r1.pkcs5||{};r1.util.isNodejs&&!r1.options.usePureJavaScript&&(aS=a_),r1.pbkdf2=aE.pbkdf2=function(e,t,r,a,o,n){if("function"==typeof o&&(n=o,o=null),r1.util.isNodejs&&!r1.options.usePureJavaScript&&aS.pbkdf2&&(null===o||"object"!=typeof o)&&(aS.pbkdf2Sync.length>4||!o||"sha1"===o))return"string"!=typeof o&&(o="sha1"),e=rE.Buffer.from(e,"binary"),t=rE.Buffer.from(t,"binary"),n?4===aS.pbkdf2Sync.length?aS.pbkdf2(e,t,r,a,function(e,t){if(e)return n(e);n(null,t.toString("binary"))}):aS.pbkdf2(e,t,r,a,o,function(e,t){if(e)return n(e);n(null,t.toString("binary"))}):4===aS.pbkdf2Sync.length?aS.pbkdf2Sync(e,t,r,a).toString("binary"):aS.pbkdf2Sync(e,t,r,a,o).toString("binary");if(null==o&&(o="sha1"),"string"==typeof o){if(!(o in r1.md.algorithms))throw Error("Unknown hash algorithm: "+o);o=r1.md[o].create()}var i=o.digestLength;if(a>0xffffffff*i){var s=Error("Derived key is too long.");if(n)return n(s);throw s}var l=Math.ceil(a/i),c=a-(l-1)*i,d=r1.hmac.create();d.start(o,e);var m,p,u,h="";if(!n){for(var f=1;f<=l;++f){d.start(null,null),d.update(t),d.update(r1.util.int32ToBytes(f)),m=u=d.digest().getBytes();for(var y=2;y<=r;++y)d.start(null,null),d.update(u),p=d.digest().getBytes(),m=r1.util.xorBytes(m,p,i),u=p;h+=f<l?m:m.substr(0,c)}return h}f=1,function e(){if(f>l)return n(null,h);d.start(null,null),d.update(t),d.update(r1.util.int32ToBytes(f)),m=u=d.digest().getBytes(),y=2,function t(){if(y<=r)return d.start(null,null),d.update(u),p=d.digest().getBytes(),m=r1.util.xorBytes(m,p,i),u=p,++y,r1.util.setImmediate(t);h+=f<l?m:m.substr(0,c),++f,e()}()}()},r5(function(e){var t=e.exports=r1.sha256=r1.sha256||{};r1.md.sha256=r1.md.algorithms.sha256=t,t.create=function(){a||(r=String.fromCharCode(128)+r1.util.fillString("\0",64),o=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0xfc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x6ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2],a=!0);var e=null,t=r1.util.createBuffer(),i=Array(64),s={algorithm:"sha256",blockLength:64,digestLength:32,messageLength:0,fullMessageLength:null,messageLengthSize:8,start:function(){s.messageLength=0,s.fullMessageLength=s.messageLength64=[];for(var r=s.messageLengthSize/4,a=0;a<r;++a)s.fullMessageLength.push(0);return t=r1.util.createBuffer(),e={h0:0x6a09e667,h1:0xbb67ae85,h2:0x3c6ef372,h3:0xa54ff53a,h4:0x510e527f,h5:0x9b05688c,h6:0x1f83d9ab,h7:0x5be0cd19},s}};return s.start(),s.update=function(r,a){"utf8"===a&&(r=r1.util.encodeUtf8(r));var o=r.length;s.messageLength+=o,o=[o/0x100000000>>>0,o>>>0];for(var l=s.fullMessageLength.length-1;l>=0;--l)s.fullMessageLength[l]+=o[1],o[1]=o[0]+(s.fullMessageLength[l]/0x100000000>>>0),s.fullMessageLength[l]=s.fullMessageLength[l]>>>0,o[0]=o[1]/0x100000000>>>0;return t.putBytes(r),n(e,i,t),(t.read>2048||0===t.length())&&t.compact(),s},s.digest=function(){var a,o=r1.util.createBuffer();o.putBytes(t.bytes()),o.putBytes(r.substr(0,s.blockLength-(s.fullMessageLength[s.fullMessageLength.length-1]+s.messageLengthSize&s.blockLength-1)));for(var l=8*s.fullMessageLength[0],c=0;c<s.fullMessageLength.length-1;++c)o.putInt32((l+=(a=8*s.fullMessageLength[c+1])/0x100000000>>>0)>>>0),l=a>>>0;o.putInt32(l);var d={h0:e.h0,h1:e.h1,h2:e.h2,h3:e.h3,h4:e.h4,h5:e.h5,h6:e.h6,h7:e.h7};n(d,i,o);var m=r1.util.createBuffer();return m.putInt32(d.h0),m.putInt32(d.h1),m.putInt32(d.h2),m.putInt32(d.h3),m.putInt32(d.h4),m.putInt32(d.h5),m.putInt32(d.h6),m.putInt32(d.h7),m},s};var r=null,a=!1,o=null;function n(e,t,r){for(var a,n,i,s,l,c,d,m,p,u,h,f,y=r.length();y>=64;){for(s=0;s<16;++s)t[s]=r.getInt32();for(;s<64;++s)t[s]=(a=((a=t[s-2])>>>17|a<<15)^(a>>>19|a<<13)^a>>>10)+t[s-7]+(n=((n=t[s-15])>>>7|n<<25)^(n>>>18|n<<14)^n>>>3)+t[s-16]|0;for(l=e.h0,c=e.h1,d=e.h2,m=e.h3,p=e.h4,u=e.h5,h=e.h6,f=e.h7,s=0;s<64;++s)i=l&c|d&(l^c),a=f+((p>>>6|p<<26)^(p>>>11|p<<21)^(p>>>25|p<<7))+(h^p&(u^h))+o[s]+t[s],f=h,h=u,u=p,p=m+a>>>0,m=d,d=c,c=l,l=a+(n=((l>>>2|l<<30)^(l>>>13|l<<19)^(l>>>22|l<<10))+i)>>>0;e.h0=e.h0+l|0,e.h1=e.h1+c|0,e.h2=e.h2+d|0,e.h3=e.h3+m|0,e.h4=e.h4+p|0,e.h5=e.h5+u|0,e.h6=e.h6+h|0,e.h7=e.h7+f|0,y-=64}}}),r5(function(e){var t=null;!r1.util.isNodejs||r1.options.usePureJavaScript||a.default.versions["node-webkit"]||(t=a_),(e.exports=r1.prng=r1.prng||{}).create=function(e){for(var r={plugin:e,key:null,seed:null,time:null,reseeds:0,generated:0,keyBytes:""},a=e.md,o=Array(32),n=0;n<32;++n)o[n]=a.create();function i(){r.reseeds=0xffffffff===r.reseeds?0:r.reseeds+1;var e=r.plugin.md.create();e.update(r.keyBytes);for(var t=1,a=0;a<32;++a)r.reseeds%t==0&&(e.update(r.pools[a].digest().getBytes()),r.pools[a].start()),t<<=1;r.keyBytes=e.digest().getBytes(),e.start(),e.update(r.keyBytes);var o=e.digest().getBytes();r.key=r.plugin.formatKey(r.keyBytes),r.seed=r.plugin.formatSeed(o),r.generated=0}function s(e){var t=null,r=r1.util.globalScope,a=r.crypto||r.msCrypto;a&&a.getRandomValues&&(t=function(e){return a.getRandomValues(e)});var o=r1.util.createBuffer();if(t)for(;o.length()<e;){var n=new Uint32Array(Math.floor(Math.max(1,Math.min(e-o.length(),65536)/4)));try{t(n);for(var i=0;i<n.length;++i)o.putInt32(n[i])}catch(e){if(!("u">typeof QuotaExceededError&&e instanceof QuotaExceededError))throw e}}if(o.length()<e)for(var s,l,c,d=Math.floor(65536*Math.random());o.length()<e;)for(d=0|(l=(0x7fffffff&(l=16807*(65535&d)+((32767&(s=16807*(d>>16)))<<16)+(s>>15)))+(l>>31)),i=0;i<3;++i)c=d>>>(i<<3)^Math.floor(256*Math.random()),o.putByte(255&c);return o.getBytes(e)}return r.pools=o,r.pool=0,r.generate=function(e,t){if(!t)return r.generateSync(e);var a=r.plugin.cipher,o=r.plugin.increment,n=r.plugin.formatKey,s=r.plugin.formatSeed,l=r1.util.createBuffer();r.key=null,function c(d){if(d)return t(d);if(l.length()>=e)return t(null,l.getBytes(e));if(r.generated>1048575&&(r.key=null),null===r.key)return r1.util.nextTick(function(){!function(e){if(r.pools[0].messageLength>=32)return i(),e();r.seedFile(32-r.pools[0].messageLength<<5,function(t,a){if(t)return e(t);r.collect(a),i(),e()})}(c)});var m=a(r.key,r.seed);r.generated+=m.length,l.putBytes(m),r.key=n(a(r.key,o(r.seed))),r.seed=s(a(r.key,r.seed)),r1.util.setImmediate(c)}()},r.generateSync=function(e){var t=r.plugin.cipher,a=r.plugin.increment,o=r.plugin.formatKey,n=r.plugin.formatSeed;r.key=null;for(var s=r1.util.createBuffer();s.length()<e;){r.generated>1048575&&(r.key=null),null===r.key&&function(){if(r.pools[0].messageLength>=32)return i();r.collect(r.seedFileSync(32-r.pools[0].messageLength<<5)),i()}();var l=t(r.key,r.seed);r.generated+=l.length,s.putBytes(l),r.key=o(t(r.key,a(r.seed))),r.seed=n(t(r.key,r.seed))}return s.getBytes(e)},t?(r.seedFile=function(e,r){t.randomBytes(e,function(e,t){if(e)return r(e);r(null,t.toString())})},r.seedFileSync=function(e){return t.randomBytes(e).toString()}):(r.seedFile=function(e,t){try{t(null,s(e))}catch(e){t(e)}},r.seedFileSync=s),r.collect=function(e){for(var t=e.length,a=0;a<t;++a)r.pools[r.pool].update(e.substr(a,1)),r.pool=31===r.pool?0:r.pool+1},r.collectInt=function(e,t){for(var a="",o=0;o<t;o+=8)a+=String.fromCharCode(e>>o&255);r.collect(a)},r.registerWorker=function(e){e===self?r.seedFile=function(e,t){self.addEventListener("message",function e(r){var a=r.data;a.forge&&a.forge.prng&&(self.removeEventListener("message",e),t(a.forge.prng.err,a.forge.prng.bytes))}),self.postMessage({forge:{prng:{needed:e}}})}:e.addEventListener("message",function(t){var a=t.data;a.forge&&a.forge.prng&&r.seedFile(a.forge.prng.needed,function(t,r){e.postMessage({forge:{prng:{err:t,bytes:r}}})})})},r}}),r5(function(e){r1.random&&r1.random.getBytes?e.exports=r1.random:function(t){var r={},a=[,,,,],o=r1.util.createBuffer();function n(){var e=r1.prng.create(r);return e.getBytes=function(t,r){return e.generate(t,r)},e.getBytesSync=function(t){return e.generate(t)},e}r.formatKey=function(e){var t=r1.util.createBuffer(e);return(e=[,,,,])[0]=t.getInt32(),e[1]=t.getInt32(),e[2]=t.getInt32(),e[3]=t.getInt32(),r1.aes._expandKey(e,!1)},r.formatSeed=function(e){var t=r1.util.createBuffer(e);return(e=[,,,,])[0]=t.getInt32(),e[1]=t.getInt32(),e[2]=t.getInt32(),e[3]=t.getInt32(),e},r.cipher=function(e,t){return r1.aes._updateBlock(e,t,a,!1),o.putInt32(a[0]),o.putInt32(a[1]),o.putInt32(a[2]),o.putInt32(a[3]),o.getBytes()},r.increment=function(e){return++e[3],e},r.md=r1.md.sha256;var i=n(),s=null,l=r1.util.globalScope,c=l.crypto||l.msCrypto;if(c&&c.getRandomValues&&(s=function(e){return c.getRandomValues(e)}),!r1.util.isNodejs&&!s){if(i.collectInt(+new Date,32),"u">typeof navigator){var d="";for(var m in navigator)try{"string"==typeof navigator[m]&&(d+=navigator[m])}catch(e){}i.collect(d),d=null}t&&(t().mousemove(function(e){i.collectInt(e.clientX,16),i.collectInt(e.clientY,16)}),t().keypress(function(e){i.collectInt(e.charCode,8)}))}if(r1.random)for(var m in i)r1.random[m]=i[m];else r1.random=i;r1.random.createInstance=n,e.exports=r1.random}("u">typeof jQuery?jQuery:null)});var aN=[217,120,249,196,25,221,181,237,40,233,253,121,74,160,216,157,198,126,55,131,43,118,83,142,98,76,100,136,68,139,251,162,23,154,89,245,135,179,79,19,97,69,109,141,9,129,125,50,189,143,64,235,134,183,123,11,240,149,33,34,92,107,78,130,84,214,101,147,206,96,178,28,115,86,192,20,167,140,241,220,18,117,202,31,59,190,228,209,66,61,212,48,163,60,182,38,111,191,14,218,70,105,7,87,39,242,29,155,188,148,67,3,248,17,199,246,144,239,62,231,6,195,213,47,200,102,30,215,8,232,234,222,128,82,238,247,132,170,114,172,53,77,106,42,150,26,210,113,90,21,73,116,75,159,208,94,4,24,164,236,194,224,65,110,15,81,203,204,36,145,175,80,161,244,112,57,153,124,58,133,35,184,180,122,252,2,54,91,37,85,151,49,45,93,250,152,227,138,146,174,5,223,41,16,103,108,186,201,211,0,230,207,225,158,168,44,99,22,1,63,88,226,137,169,13,56,52,27,171,51,255,176,187,72,12,95,185,177,205,46,197,243,219,71,229,165,156,119,10,166,32,104,254,127,193,173],aI=[1,2,3,5];r1.rc2=r1.rc2||{},r1.rc2.expandKey=function(e,t){"string"==typeof e&&(e=r1.util.createBuffer(e)),t=t||128;var r,a=e,o=e.length(),n=t,i=Math.ceil(n/8);for(r=o;r<128;r++)a.putByte(aN[a.at(r-1)+a.at(r-o)&255]);for(a.setAt(128-i,aN[a.at(128-i)&255>>(7&n)]),r=127-i;r>=0;r--)a.setAt(r,aN[a.at(r+1)^a.at(r+i)]);return a};var aT,aA=function(e,t,r){var a,o,n,i,s=!1,l=null,c=null,d=null,m=[];for(e=r1.rc2.expandKey(e,t),n=0;n<64;n++)m.push(e.getInt16Le());r?(a=function(e){for(n=0;n<4;n++){var t,r;e[n]+=m[i]+(e[(n+3)%4]&e[(n+2)%4])+(~e[(n+3)%4]&e[(n+1)%4]),e[n]=(t=e[n])<<(r=aI[n])&65535|(65535&t)>>16-r,i++}},o=function(e){for(n=0;n<4;n++)e[n]+=m[63&e[(n+3)%4]]}):(a=function(e){for(n=3;n>=0;n--){var t,r;e[n]=(65535&(t=e[n]))>>(r=aI[n])|t<<16-r&65535,e[n]-=m[i]+(e[(n+3)%4]&e[(n+2)%4])+(~e[(n+3)%4]&e[(n+1)%4]),i--}},o=function(e){for(n=3;n>=0;n--)e[n]-=m[63&e[(n+3)%4]]});var p=function(e){var t=[];for(n=0;n<4;n++){var a=l.getInt16Le();null!==d&&(r?a^=d.getInt16Le():d.putInt16Le(a)),t.push(65535&a)}i=63*!r;for(var o=0;o<e.length;o++)for(var s=0;s<e[o][0];s++)e[o][1](t);for(n=0;n<4;n++)null!==d&&(r?d.putInt16Le(t[n]):t[n]^=d.getInt16Le()),c.putInt16Le(t[n])},u=null;return u={start:function(e,t){e&&"string"==typeof e&&(e=r1.util.createBuffer(e)),s=!1,l=r1.util.createBuffer(),c=t||new r1.util.createBuffer,d=e,u.output=c},update:function(e){for(s||l.putBuffer(e);l.length()>=8;)p([[5,a],[1,o],[6,a],[1,o],[5,a]])},finish:function(e){var t=!0;if(r)if(e)t=e(8,l,!r);else{var a=8===l.length()?8:8-l.length();l.fillWithByte(a,a)}if(t&&(s=!0,u.update()),!r&&(t=0===l.length()))if(e)t=e(8,c,!r);else{var o=c.length(),n=c.at(o-1);n>o?t=!1:c.truncate(n)}return t}}};function aj(e,t,r){this.data=[],null!=e&&("number"==typeof e?this.fromNumber(e,t,r):this.fromString(e,null==t&&"string"!=typeof e?256:t))}function aP(){return new aj(null)}function aB(e,t,r,a,o,n){for(var i=16383&t,s=t>>14;--n>=0;){var l=16383&this.data[e],c=this.data[e++]>>14,d=s*l+c*i;o=((l=i*l+((16383&d)<<14)+r.data[a]+o)>>28)+(d>>14)+s*c,r.data[a++]=0xfffffff&l}return o}r1.rc2.startEncrypting=function(e,t,r){var a=r1.rc2.createEncryptionCipher(e,128);return a.start(t,r),a},r1.rc2.createEncryptionCipher=function(e,t){return aA(e,t,!0)},r1.rc2.startDecrypting=function(e,t,r){var a=r1.rc2.createDecryptionCipher(e,128);return a.start(t,r),a},r1.rc2.createDecryptionCipher=function(e,t){return aA(e,t,!1)},r1.jsbn=r1.jsbn||{},r1.jsbn.BigInteger=aj,"u"<typeof navigator?(aj.prototype.am=aB,aT=28):"Microsoft Internet Explorer"==navigator.appName?(aj.prototype.am=function(e,t,r,a,o,n){for(var i=32767&t,s=t>>15;--n>=0;){var l=32767&this.data[e],c=this.data[e++]>>15,d=s*l+c*i;o=((l=i*l+((32767&d)<<15)+r.data[a]+(0x3fffffff&o))>>>30)+(d>>>15)+s*c+(o>>>30),r.data[a++]=0x3fffffff&l}return o},aT=30):"Netscape"!=navigator.appName?(aj.prototype.am=function(e,t,r,a,o,n){for(;--n>=0;){var i=t*this.data[e++]+r.data[a]+o;o=Math.floor(i/0x4000000),r.data[a++]=0x3ffffff&i}return o},aT=26):(aj.prototype.am=aB,aT=28),aj.prototype.DB=aT,aj.prototype.DM=(1<<aT)-1,aj.prototype.DV=1<<aT,aj.prototype.FV=0x10000000000000,aj.prototype.F1=52-aT,aj.prototype.F2=2*aT-52;var aR,aO,aL=[];for(aR=48,aO=0;aO<=9;++aO)aL[aR++]=aO;for(aR=97,aO=10;aO<36;++aO)aL[aR++]=aO;for(aR=65,aO=10;aO<36;++aO)aL[aR++]=aO;function aD(e){return"0123456789abcdefghijklmnopqrstuvwxyz".charAt(e)}function aU(e,t){var r=aL[e.charCodeAt(t)];return null==r?-1:r}function aM(e){var t=aP();return t.fromInt(e),t}function aF(e){var t,r=1;return 0!=(t=e>>>16)&&(e=t,r+=16),0!=(t=e>>8)&&(e=t,r+=8),0!=(t=e>>4)&&(e=t,r+=4),0!=(t=e>>2)&&(e=t,r+=2),0!=(t=e>>1)&&(e=t,r+=1),r}function aV(e){this.m=e}function aK(e){this.m=e,this.mp=e.invDigit(),this.mpl=32767&this.mp,this.mph=this.mp>>15,this.um=(1<<e.DB-15)-1,this.mt2=2*e.t}function aq(e,t){return e&t}function aH(e,t){return e|t}function aG(e,t){return e^t}function a$(e,t){return e&~t}function aW(){}function aY(e){return e}function aQ(e){this.r2=aP(),this.q3=aP(),aj.ONE.dlShiftTo(2*e.t,this.r2),this.mu=this.r2.divide(e),this.m=e}aV.prototype.convert=function(e){return e.s<0||e.compareTo(this.m)>=0?e.mod(this.m):e},aV.prototype.revert=function(e){return e},aV.prototype.reduce=function(e){e.divRemTo(this.m,null,e)},aV.prototype.mulTo=function(e,t,r){e.multiplyTo(t,r),this.reduce(r)},aV.prototype.sqrTo=function(e,t){e.squareTo(t),this.reduce(t)},aK.prototype.convert=function(e){var t=aP();return e.abs().dlShiftTo(this.m.t,t),t.divRemTo(this.m,null,t),e.s<0&&t.compareTo(aj.ZERO)>0&&this.m.subTo(t,t),t},aK.prototype.revert=function(e){var t=aP();return e.copyTo(t),this.reduce(t),t},aK.prototype.reduce=function(e){for(;e.t<=this.mt2;)e.data[e.t++]=0;for(var t=0;t<this.m.t;++t){var r=32767&e.data[t],a=r*this.mpl+((r*this.mph+(e.data[t]>>15)*this.mpl&this.um)<<15)&e.DM;for(e.data[r=t+this.m.t]+=this.m.am(0,a,e,t,0,this.m.t);e.data[r]>=e.DV;)e.data[r]-=e.DV,e.data[++r]++}e.clamp(),e.drShiftTo(this.m.t,e),e.compareTo(this.m)>=0&&e.subTo(this.m,e)},aK.prototype.mulTo=function(e,t,r){e.multiplyTo(t,r),this.reduce(r)},aK.prototype.sqrTo=function(e,t){e.squareTo(t),this.reduce(t)},aj.prototype.copyTo=function(e){for(var t=this.t-1;t>=0;--t)e.data[t]=this.data[t];e.t=this.t,e.s=this.s},aj.prototype.fromInt=function(e){this.t=1,this.s=e<0?-1:0,e>0?this.data[0]=e:e<-1?this.data[0]=e+this.DV:this.t=0},aj.prototype.fromString=function(e,t){var r;if(16==t)r=4;else if(8==t)r=3;else if(256==t)r=8;else if(2==t)r=1;else if(32==t)r=5;else{if(4!=t)return void this.fromRadix(e,t);r=2}this.t=0,this.s=0;for(var a=e.length,o=!1,n=0;--a>=0;){var i=8==r?255&e[a]:aU(e,a);i<0?"-"==e.charAt(a)&&(o=!0):(o=!1,0==n?this.data[this.t++]=i:n+r>this.DB?(this.data[this.t-1]|=(i&(1<<this.DB-n)-1)<<n,this.data[this.t++]=i>>this.DB-n):this.data[this.t-1]|=i<<n,(n+=r)>=this.DB&&(n-=this.DB))}8==r&&128&e[0]&&(this.s=-1,n>0&&(this.data[this.t-1]|=(1<<this.DB-n)-1<<n)),this.clamp(),o&&aj.ZERO.subTo(this,this)},aj.prototype.clamp=function(){for(var e=this.s&this.DM;this.t>0&&this.data[this.t-1]==e;)--this.t},aj.prototype.dlShiftTo=function(e,t){var r;for(r=this.t-1;r>=0;--r)t.data[r+e]=this.data[r];for(r=e-1;r>=0;--r)t.data[r]=0;t.t=this.t+e,t.s=this.s},aj.prototype.drShiftTo=function(e,t){for(var r=e;r<this.t;++r)t.data[r-e]=this.data[r];t.t=Math.max(this.t-e,0),t.s=this.s},aj.prototype.lShiftTo=function(e,t){var r,a=e%this.DB,o=this.DB-a,n=(1<<o)-1,i=Math.floor(e/this.DB),s=this.s<<a&this.DM;for(r=this.t-1;r>=0;--r)t.data[r+i+1]=this.data[r]>>o|s,s=(this.data[r]&n)<<a;for(r=i-1;r>=0;--r)t.data[r]=0;t.data[i]=s,t.t=this.t+i+1,t.s=this.s,t.clamp()},aj.prototype.rShiftTo=function(e,t){t.s=this.s;var r=Math.floor(e/this.DB);if(r>=this.t)t.t=0;else{var a=e%this.DB,o=this.DB-a,n=(1<<a)-1;t.data[0]=this.data[r]>>a;for(var i=r+1;i<this.t;++i)t.data[i-r-1]|=(this.data[i]&n)<<o,t.data[i-r]=this.data[i]>>a;a>0&&(t.data[this.t-r-1]|=(this.s&n)<<o),t.t=this.t-r,t.clamp()}},aj.prototype.subTo=function(e,t){for(var r=0,a=0,o=Math.min(e.t,this.t);r<o;)a+=this.data[r]-e.data[r],t.data[r++]=a&this.DM,a>>=this.DB;if(e.t<this.t){for(a-=e.s;r<this.t;)a+=this.data[r],t.data[r++]=a&this.DM,a>>=this.DB;a+=this.s}else{for(a+=this.s;r<e.t;)a-=e.data[r],t.data[r++]=a&this.DM,a>>=this.DB;a-=e.s}t.s=a<0?-1:0,a<-1?t.data[r++]=this.DV+a:a>0&&(t.data[r++]=a),t.t=r,t.clamp()},aj.prototype.multiplyTo=function(e,t){var r=this.abs(),a=e.abs(),o=r.t;for(t.t=o+a.t;--o>=0;)t.data[o]=0;for(o=0;o<a.t;++o)t.data[o+r.t]=r.am(0,a.data[o],t,o,0,r.t);t.s=0,t.clamp(),this.s!=e.s&&aj.ZERO.subTo(t,t)},aj.prototype.squareTo=function(e){for(var t=this.abs(),r=e.t=2*t.t;--r>=0;)e.data[r]=0;for(r=0;r<t.t-1;++r){var a=t.am(r,t.data[r],e,2*r,0,1);(e.data[r+t.t]+=t.am(r+1,2*t.data[r],e,2*r+1,a,t.t-r-1))>=t.DV&&(e.data[r+t.t]-=t.DV,e.data[r+t.t+1]=1)}e.t>0&&(e.data[e.t-1]+=t.am(r,t.data[r],e,2*r,0,1)),e.s=0,e.clamp()},aj.prototype.divRemTo=function(e,t,r){var a=e.abs();if(!(a.t<=0)){var o=this.abs();if(o.t<a.t)return null!=t&&t.fromInt(0),void(null!=r&&this.copyTo(r));null==r&&(r=aP());var n=aP(),i=this.s,s=e.s,l=this.DB-aF(a.data[a.t-1]);l>0?(a.lShiftTo(l,n),o.lShiftTo(l,r)):(a.copyTo(n),o.copyTo(r));var c=n.t,d=n.data[c-1];if(0!=d){var m=d*(1<<this.F1)+(c>1?n.data[c-2]>>this.F2:0),p=this.FV/m,u=(1<<this.F1)/m,h=1<<this.F2,f=r.t,y=f-c,g=null==t?aP():t;for(n.dlShiftTo(y,g),r.compareTo(g)>=0&&(r.data[r.t++]=1,r.subTo(g,r)),aj.ONE.dlShiftTo(c,g),g.subTo(n,n);n.t<c;)n.data[n.t++]=0;for(;--y>=0;){var b=r.data[--f]==d?this.DM:Math.floor(r.data[f]*p+(r.data[f-1]+h)*u);if((r.data[f]+=n.am(0,b,r,y,0,c))<b)for(n.dlShiftTo(y,g),r.subTo(g,r);r.data[f]<--b;)r.subTo(g,r)}null!=t&&(r.drShiftTo(c,t),i!=s&&aj.ZERO.subTo(t,t)),r.t=c,r.clamp(),l>0&&r.rShiftTo(l,r),i<0&&aj.ZERO.subTo(r,r)}}},aj.prototype.invDigit=function(){if(this.t<1)return 0;var e=this.data[0];if(!(1&e))return 0;var t=3&e;return(t=(t=(t=(t=t*(2-(15&e)*t)&15)*(2-(255&e)*t)&255)*(2-((65535&e)*t&65535))&65535)*(2-e*t%this.DV)%this.DV)>0?this.DV-t:-t},aj.prototype.isEven=function(){return 0==(this.t>0?1&this.data[0]:this.s)},aj.prototype.exp=function(e,t){if(e>0xffffffff||e<1)return aj.ONE;var r=aP(),a=aP(),o=t.convert(this),n=aF(e)-1;for(o.copyTo(r);--n>=0;)if(t.sqrTo(r,a),(e&1<<n)>0)t.mulTo(a,o,r);else{var i=r;r=a,a=i}return t.revert(r)},aj.prototype.toString=function(e){if(this.s<0)return"-"+this.negate().toString(e);if(16==e)t=4;else if(8==e)t=3;else if(2==e)t=1;else if(32==e)t=5;else{if(4!=e)return this.toRadix(e);t=2}var t,r,a=(1<<t)-1,o=!1,n="",i=this.t,s=this.DB-i*this.DB%t;if(i-- >0)for(s<this.DB&&(r=this.data[i]>>s)>0&&(o=!0,n=aD(r));i>=0;)s<t?r=(this.data[i]&(1<<s)-1)<<t-s|this.data[--i]>>(s+=this.DB-t):(r=this.data[i]>>(s-=t)&a,s<=0&&(s+=this.DB,--i)),r>0&&(o=!0),o&&(n+=aD(r));return o?n:"0"},aj.prototype.negate=function(){var e=aP();return aj.ZERO.subTo(this,e),e},aj.prototype.abs=function(){return this.s<0?this.negate():this},aj.prototype.compareTo=function(e){var t=this.s-e.s;if(0!=t)return t;var r=this.t;if(0!=(t=r-e.t))return this.s<0?-t:t;for(;--r>=0;)if(0!=(t=this.data[r]-e.data[r]))return t;return 0},aj.prototype.bitLength=function(){return this.t<=0?0:this.DB*(this.t-1)+aF(this.data[this.t-1]^this.s&this.DM)},aj.prototype.mod=function(e){var t=aP();return this.abs().divRemTo(e,null,t),this.s<0&&t.compareTo(aj.ZERO)>0&&e.subTo(t,t),t},aj.prototype.modPowInt=function(e,t){var r;return r=e<256||t.isEven()?new aV(t):new aK(t),this.exp(e,r)},aj.ZERO=aM(0),aj.ONE=aM(1),aW.prototype.convert=aY,aW.prototype.revert=aY,aW.prototype.mulTo=function(e,t,r){e.multiplyTo(t,r)},aW.prototype.sqrTo=function(e,t){e.squareTo(t)},aQ.prototype.convert=function(e){if(e.s<0||e.t>2*this.m.t)return e.mod(this.m);if(0>e.compareTo(this.m))return e;var t=aP();return e.copyTo(t),this.reduce(t),t},aQ.prototype.revert=function(e){return e},aQ.prototype.reduce=function(e){for(e.drShiftTo(this.m.t-1,this.r2),e.t>this.m.t+1&&(e.t=this.m.t+1,e.clamp()),this.mu.multiplyUpperTo(this.r2,this.m.t+1,this.q3),this.m.multiplyLowerTo(this.q3,this.m.t+1,this.r2);0>e.compareTo(this.r2);)e.dAddOffset(1,this.m.t+1);for(e.subTo(this.r2,e);e.compareTo(this.m)>=0;)e.subTo(this.m,e)},aQ.prototype.mulTo=function(e,t,r){e.multiplyTo(t,r),this.reduce(r)},aQ.prototype.sqrTo=function(e,t){e.squareTo(t),this.reduce(t)};var aX=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509],aZ=0x4000000/aX[aX.length-1];if(aj.prototype.chunkSize=function(e){return Math.floor(Math.LN2*this.DB/Math.log(e))},aj.prototype.toRadix=function(e){if(null==e&&(e=10),0==this.signum()||e<2||e>36)return"0";var t=this.chunkSize(e),r=Math.pow(e,t),a=aM(r),o=aP(),n=aP(),i="";for(this.divRemTo(a,o,n);o.signum()>0;)i=(r+n.intValue()).toString(e).substr(1)+i,o.divRemTo(a,o,n);return n.intValue().toString(e)+i},aj.prototype.fromRadix=function(e,t){this.fromInt(0),null==t&&(t=10);for(var r=this.chunkSize(t),a=Math.pow(t,r),o=!1,n=0,i=0,s=0;s<e.length;++s){var l=aU(e,s);l<0?"-"==e.charAt(s)&&0==this.signum()&&(o=!0):(i=t*i+l,++n>=r&&(this.dMultiply(a),this.dAddOffset(i,0),n=0,i=0))}n>0&&(this.dMultiply(Math.pow(t,n)),this.dAddOffset(i,0)),o&&aj.ZERO.subTo(this,this)},aj.prototype.fromNumber=function(e,t,r){if("number"==typeof t)if(e<2)this.fromInt(1);else for(this.fromNumber(e,r),this.testBit(e-1)||this.bitwiseTo(aj.ONE.shiftLeft(e-1),aH,this),this.isEven()&&this.dAddOffset(1,0);!this.isProbablePrime(t);)this.dAddOffset(2,0),this.bitLength()>e&&this.subTo(aj.ONE.shiftLeft(e-1),this);else{var a=[],o=7&e;a.length=1+(e>>3),t.nextBytes(a),o>0?a[0]&=(1<<o)-1:a[0]=0,this.fromString(a,256)}},aj.prototype.bitwiseTo=function(e,t,r){var a,o,n=Math.min(e.t,this.t);for(a=0;a<n;++a)r.data[a]=t(this.data[a],e.data[a]);if(e.t<this.t){for(o=e.s&this.DM,a=n;a<this.t;++a)r.data[a]=t(this.data[a],o);r.t=this.t}else{for(o=this.s&this.DM,a=n;a<e.t;++a)r.data[a]=t(o,e.data[a]);r.t=e.t}r.s=t(this.s,e.s),r.clamp()},aj.prototype.changeBit=function(e,t){var r=aj.ONE.shiftLeft(e);return this.bitwiseTo(r,t,r),r},aj.prototype.addTo=function(e,t){for(var r=0,a=0,o=Math.min(e.t,this.t);r<o;)a+=this.data[r]+e.data[r],t.data[r++]=a&this.DM,a>>=this.DB;if(e.t<this.t){for(a+=e.s;r<this.t;)a+=this.data[r],t.data[r++]=a&this.DM,a>>=this.DB;a+=this.s}else{for(a+=this.s;r<e.t;)a+=e.data[r],t.data[r++]=a&this.DM,a>>=this.DB;a+=e.s}t.s=a<0?-1:0,a>0?t.data[r++]=a:a<-1&&(t.data[r++]=this.DV+a),t.t=r,t.clamp()},aj.prototype.dMultiply=function(e){this.data[this.t]=this.am(0,e-1,this,0,0,this.t),++this.t,this.clamp()},aj.prototype.dAddOffset=function(e,t){if(0!=e){for(;this.t<=t;)this.data[this.t++]=0;for(this.data[t]+=e;this.data[t]>=this.DV;)this.data[t]-=this.DV,++t>=this.t&&(this.data[this.t++]=0),++this.data[t]}},aj.prototype.multiplyLowerTo=function(e,t,r){var a,o=Math.min(this.t+e.t,t);for(r.s=0,r.t=o;o>0;)r.data[--o]=0;for(a=r.t-this.t;o<a;++o)r.data[o+this.t]=this.am(0,e.data[o],r,o,0,this.t);for(a=Math.min(e.t,t);o<a;++o)this.am(0,e.data[o],r,o,0,t-o);r.clamp()},aj.prototype.multiplyUpperTo=function(e,t,r){--t;var a=r.t=this.t+e.t-t;for(r.s=0;--a>=0;)r.data[a]=0;for(a=Math.max(t-this.t,0);a<e.t;++a)r.data[this.t+a-t]=this.am(t-a,e.data[a],r,0,0,this.t+a-t);r.clamp(),r.drShiftTo(1,r)},aj.prototype.modInt=function(e){if(e<=0)return 0;var t=this.DV%e,r=this.s<0?e-1:0;if(this.t>0)if(0==t)r=this.data[0]%e;else for(var a=this.t-1;a>=0;--a)r=(t*r+this.data[a])%e;return r},aj.prototype.millerRabin=function(e){var t=this.subtract(aj.ONE),r=t.getLowestSetBit();if(r<=0)return!1;for(var a,o=t.shiftRight(r),n={nextBytes:function(e){for(var t=0;t<e.length;++t)e[t]=Math.floor(256*Math.random())}},i=0;i<e;++i){do a=new aj(this.bitLength(),n);while(0>=a.compareTo(aj.ONE)||a.compareTo(t)>=0)var s=a.modPow(o,this);if(0!=s.compareTo(aj.ONE)&&0!=s.compareTo(t)){for(var l=1;l++<r&&0!=s.compareTo(t);)if(0==(s=s.modPowInt(2,this)).compareTo(aj.ONE))return!1;if(0!=s.compareTo(t))return!1}}return!0},aj.prototype.clone=function(){var e=aP();return this.copyTo(e),e},aj.prototype.intValue=function(){if(this.s<0){if(1==this.t)return this.data[0]-this.DV;if(0==this.t)return -1}else{if(1==this.t)return this.data[0];if(0==this.t)return 0}return(this.data[1]&(1<<32-this.DB)-1)<<this.DB|this.data[0]},aj.prototype.byteValue=function(){return 0==this.t?this.s:this.data[0]<<24>>24},aj.prototype.shortValue=function(){return 0==this.t?this.s:this.data[0]<<16>>16},aj.prototype.signum=function(){return this.s<0?-1:this.t<=0||1==this.t&&this.data[0]<=0?0:1},aj.prototype.toByteArray=function(){var e=this.t,t=[];t[0]=this.s;var r,a=this.DB-e*this.DB%8,o=0;if(e-- >0)for(a<this.DB&&(r=this.data[e]>>a)!=(this.s&this.DM)>>a&&(t[o++]=r|this.s<<this.DB-a);e>=0;)a<8?r=(this.data[e]&(1<<a)-1)<<8-a|this.data[--e]>>(a+=this.DB-8):(r=this.data[e]>>(a-=8)&255,a<=0&&(a+=this.DB,--e)),128&r&&(r|=-256),0==o&&(128&this.s)!=(128&r)&&++o,(o>0||r!=this.s)&&(t[o++]=r);return t},aj.prototype.equals=function(e){return 0==this.compareTo(e)},aj.prototype.min=function(e){return 0>this.compareTo(e)?this:e},aj.prototype.max=function(e){return this.compareTo(e)>0?this:e},aj.prototype.and=function(e){var t=aP();return this.bitwiseTo(e,aq,t),t},aj.prototype.or=function(e){var t=aP();return this.bitwiseTo(e,aH,t),t},aj.prototype.xor=function(e){var t=aP();return this.bitwiseTo(e,aG,t),t},aj.prototype.andNot=function(e){var t=aP();return this.bitwiseTo(e,a$,t),t},aj.prototype.not=function(){for(var e=aP(),t=0;t<this.t;++t)e.data[t]=this.DM&~this.data[t];return e.t=this.t,e.s=~this.s,e},aj.prototype.shiftLeft=function(e){var t=aP();return e<0?this.rShiftTo(-e,t):this.lShiftTo(e,t),t},aj.prototype.shiftRight=function(e){var t=aP();return e<0?this.lShiftTo(-e,t):this.rShiftTo(e,t),t},aj.prototype.getLowestSetBit=function(){for(var e=0;e<this.t;++e)if(0!=this.data[e])return e*this.DB+function(e){if(0==e)return -1;var t=0;return 65535&e||(e>>=16,t+=16),255&e||(e>>=8,t+=8),15&e||(e>>=4,t+=4),3&e||(e>>=2,t+=2),1&e||++t,t}(this.data[e]);return this.s<0?this.t*this.DB:-1},aj.prototype.bitCount=function(){for(var e=0,t=this.s&this.DM,r=0;r<this.t;++r)e+=function(e){for(var t=0;0!=e;)e&=e-1,++t;return t}(this.data[r]^t);return e},aj.prototype.testBit=function(e){var t=Math.floor(e/this.DB);return t>=this.t?0!=this.s:!!(this.data[t]&1<<e%this.DB)},aj.prototype.setBit=function(e){return this.changeBit(e,aH)},aj.prototype.clearBit=function(e){return this.changeBit(e,a$)},aj.prototype.flipBit=function(e){return this.changeBit(e,aG)},aj.prototype.add=function(e){var t=aP();return this.addTo(e,t),t},aj.prototype.subtract=function(e){var t=aP();return this.subTo(e,t),t},aj.prototype.multiply=function(e){var t=aP();return this.multiplyTo(e,t),t},aj.prototype.divide=function(e){var t=aP();return this.divRemTo(e,t,null),t},aj.prototype.remainder=function(e){var t=aP();return this.divRemTo(e,null,t),t},aj.prototype.divideAndRemainder=function(e){var t=aP(),r=aP();return this.divRemTo(e,t,r),[t,r]},aj.prototype.modPow=function(e,t){var r,a,o=e.bitLength(),n=aM(1);if(o<=0)return n;r=o<18?1:o<48?3:o<144?4:o<768?5:6,a=o<8?new aV(t):t.isEven()?new aQ(t):new aK(t);var i=[],s=3,l=r-1,c=(1<<r)-1;if(i[1]=a.convert(this),r>1){var d=aP();for(a.sqrTo(i[1],d);s<=c;)i[s]=aP(),a.mulTo(d,i[s-2],i[s]),s+=2}var m,p,u=e.t-1,h=!0,f=aP();for(o=aF(e.data[u])-1;u>=0;){for(o>=l?m=e.data[u]>>o-l&c:(m=(e.data[u]&(1<<o+1)-1)<<l-o,u>0&&(m|=e.data[u-1]>>this.DB+o-l)),s=r;!(1&m);)m>>=1,--s;if((o-=s)<0&&(o+=this.DB,--u),h)i[m].copyTo(n),h=!1;else{for(;s>1;)a.sqrTo(n,f),a.sqrTo(f,n),s-=2;s>0?a.sqrTo(n,f):(p=n,n=f,f=p),a.mulTo(f,i[m],n)}for(;u>=0&&!(e.data[u]&1<<o);)a.sqrTo(n,f),p=n,n=f,f=p,--o<0&&(o=this.DB-1,--u)}return a.revert(n)},aj.prototype.modInverse=function(e){var t=e.isEven();if(this.isEven()&&t||0==e.signum())return aj.ZERO;for(var r=e.clone(),a=this.clone(),o=aM(1),n=aM(0),i=aM(0),s=aM(1);0!=r.signum();){for(;r.isEven();)r.rShiftTo(1,r),t?(o.isEven()&&n.isEven()||(o.addTo(this,o),n.subTo(e,n)),o.rShiftTo(1,o)):n.isEven()||n.subTo(e,n),n.rShiftTo(1,n);for(;a.isEven();)a.rShiftTo(1,a),t?(i.isEven()&&s.isEven()||(i.addTo(this,i),s.subTo(e,s)),i.rShiftTo(1,i)):s.isEven()||s.subTo(e,s),s.rShiftTo(1,s);r.compareTo(a)>=0?(r.subTo(a,r),t&&o.subTo(i,o),n.subTo(s,n)):(a.subTo(r,a),t&&i.subTo(o,i),s.subTo(n,s))}return 0!=a.compareTo(aj.ONE)?aj.ZERO:s.compareTo(e)>=0?s.subtract(e):0>s.signum()?(s.addTo(e,s),0>s.signum()?s.add(e):s):s},aj.prototype.pow=function(e){return this.exp(e,new aW)},aj.prototype.gcd=function(e){var t=this.s<0?this.negate():this.clone(),r=e.s<0?e.negate():e.clone();if(0>t.compareTo(r)){var a=t;t=r,r=a}var o=t.getLowestSetBit(),n=r.getLowestSetBit();if(n<0)return t;for(o<n&&(n=o),n>0&&(t.rShiftTo(n,t),r.rShiftTo(n,r));t.signum()>0;)(o=t.getLowestSetBit())>0&&t.rShiftTo(o,t),(o=r.getLowestSetBit())>0&&r.rShiftTo(o,r),t.compareTo(r)>=0?(t.subTo(r,t),t.rShiftTo(1,t)):(r.subTo(t,r),r.rShiftTo(1,r));return n>0&&r.lShiftTo(n,r),r},aj.prototype.isProbablePrime=function(e){var t,r=this.abs();if(1==r.t&&r.data[0]<=aX[aX.length-1]){for(t=0;t<aX.length;++t)if(r.data[0]==aX[t])return!0;return!1}if(r.isEven())return!1;for(t=1;t<aX.length;){for(var a=aX[t],o=t+1;o<aX.length&&a<aZ;)a*=aX[o++];for(a=r.modInt(a);t<o;)if(a%aX[t++]==0)return!1}return r.millerRabin(e)},r5(function(e){var t=e.exports=r1.sha1=r1.sha1||{};r1.md.sha1=r1.md.algorithms.sha1=t,t.create=function(){a||(r=String.fromCharCode(128)+r1.util.fillString("\0",64),a=!0);var e=null,t=r1.util.createBuffer(),n=Array(80),i={algorithm:"sha1",blockLength:64,digestLength:20,messageLength:0,fullMessageLength:null,messageLengthSize:8,start:function(){i.messageLength=0,i.fullMessageLength=i.messageLength64=[];for(var r=i.messageLengthSize/4,a=0;a<r;++a)i.fullMessageLength.push(0);return t=r1.util.createBuffer(),e={h0:0x67452301,h1:0xefcdab89,h2:0x98badcfe,h3:0x10325476,h4:0xc3d2e1f0},i}};return i.start(),i.update=function(r,a){"utf8"===a&&(r=r1.util.encodeUtf8(r));var s=r.length;i.messageLength+=s,s=[s/0x100000000>>>0,s>>>0];for(var l=i.fullMessageLength.length-1;l>=0;--l)i.fullMessageLength[l]+=s[1],s[1]=s[0]+(i.fullMessageLength[l]/0x100000000>>>0),i.fullMessageLength[l]=i.fullMessageLength[l]>>>0,s[0]=s[1]/0x100000000>>>0;return t.putBytes(r),o(e,n,t),(t.read>2048||0===t.length())&&t.compact(),i},i.digest=function(){var a,s=r1.util.createBuffer();s.putBytes(t.bytes()),s.putBytes(r.substr(0,i.blockLength-(i.fullMessageLength[i.fullMessageLength.length-1]+i.messageLengthSize&i.blockLength-1)));for(var l=8*i.fullMessageLength[0],c=0;c<i.fullMessageLength.length-1;++c)s.putInt32((l+=(a=8*i.fullMessageLength[c+1])/0x100000000>>>0)>>>0),l=a>>>0;s.putInt32(l);var d={h0:e.h0,h1:e.h1,h2:e.h2,h3:e.h3,h4:e.h4};o(d,n,s);var m=r1.util.createBuffer();return m.putInt32(d.h0),m.putInt32(d.h1),m.putInt32(d.h2),m.putInt32(d.h3),m.putInt32(d.h4),m},i};var r=null,a=!1;function o(e,t,r){for(var a,o,n,i,s,l,c,d=r.length();d>=64;){for(o=e.h0,n=e.h1,i=e.h2,s=e.h3,l=e.h4,c=0;c<16;++c)a=r.getInt32(),t[c]=a,a=(o<<5|o>>>27)+(s^n&(i^s))+l+0x5a827999+a,l=s,s=i,i=(n<<30|n>>>2)>>>0,n=o,o=a;for(;c<20;++c)t[c]=a=(a=t[c-3]^t[c-8]^t[c-14]^t[c-16])<<1|a>>>31,a=(o<<5|o>>>27)+(s^n&(i^s))+l+0x5a827999+a,l=s,s=i,i=(n<<30|n>>>2)>>>0,n=o,o=a;for(;c<32;++c)t[c]=a=(a=t[c-3]^t[c-8]^t[c-14]^t[c-16])<<1|a>>>31,a=(o<<5|o>>>27)+(n^i^s)+l+0x6ed9eba1+a,l=s,s=i,i=(n<<30|n>>>2)>>>0,n=o,o=a;for(;c<40;++c)t[c]=a=(a=t[c-6]^t[c-16]^t[c-28]^t[c-32])<<2|a>>>30,a=(o<<5|o>>>27)+(n^i^s)+l+0x6ed9eba1+a,l=s,s=i,i=(n<<30|n>>>2)>>>0,n=o,o=a;for(;c<60;++c)t[c]=a=(a=t[c-6]^t[c-16]^t[c-28]^t[c-32])<<2|a>>>30,a=(o<<5|o>>>27)+(n&i|s&(n^i))+l+0x8f1bbcdc+a,l=s,s=i,i=(n<<30|n>>>2)>>>0,n=o,o=a;for(;c<80;++c)t[c]=a=(a=t[c-6]^t[c-16]^t[c-28]^t[c-32])<<2|a>>>30,a=(o<<5|o>>>27)+(n^i^s)+l+0xca62c1d6+a,l=s,s=i,i=(n<<30|n>>>2)>>>0,n=o,o=a;e.h0=e.h0+o|0,e.h1=e.h1+n|0,e.h2=e.h2+i|0,e.h3=e.h3+s|0,e.h4=e.h4+l|0,d-=64}}}),r5(function(e){var t=e.exports=r1.pkcs1=r1.pkcs1||{};function r(e,t,r){r||(r=r1.md.sha1.create());for(var a="",o=Math.ceil(t/r.digestLength),n=0;n<o;++n){var i=String.fromCharCode(n>>24&255,n>>16&255,n>>8&255,255&n);r.start(),r.update(e+i),a+=r.digest().getBytes()}return a.substring(0,t)}t.encode_rsa_oaep=function(e,t,a){"string"==typeof a?(o=a,n=arguments[3]||void 0,i=arguments[4]||void 0):a&&(o=a.label||void 0,n=a.seed||void 0,i=a.md||void 0,a.mgf1&&a.mgf1.md&&(s=a.mgf1.md)),i?i.start():i=r1.md.sha1.create(),s||(s=i);var o,n,i,s,l,c=Math.ceil(e.n.bitLength()/8),d=c-2*i.digestLength-2;if(t.length>d)throw(l=Error("RSAES-OAEP input message length is too long.")).length=t.length,l.maxLength=d,l;o||(o=""),i.update(o,"raw");for(var m=i.digest(),p="",u=d-t.length,h=0;h<u;h++)p+="\0";var f=m.getBytes()+p+"\x01"+t;if(n){if(n.length!==i.digestLength)throw(l=Error("Invalid RSAES-OAEP seed. The seed length must match the digest length.")).seedLength=n.length,l.digestLength=i.digestLength,l}else n=r1.random.getBytes(i.digestLength);var y=r(n,c-i.digestLength-1,s),g=r1.util.xorBytes(f,y,f.length),b=r(g,i.digestLength,s);return"\0"+r1.util.xorBytes(n,b,n.length)+g},t.decode_rsa_oaep=function(e,t,a){"string"==typeof a?(o=a,n=arguments[3]||void 0):a&&(o=a.label||void 0,n=a.md||void 0,a.mgf1&&a.mgf1.md&&(i=a.mgf1.md));var o,n,i,s=Math.ceil(e.n.bitLength()/8);if(t.length!==s)throw(y=Error("RSAES-OAEP encoded message length is invalid.")).length=t.length,y.expectedLength=s,y;if(void 0===n?n=r1.md.sha1.create():n.start(),i||(i=n),s<2*n.digestLength+2)throw Error("RSAES-OAEP key is too short for the hash function.");o||(o=""),n.update(o,"raw");for(var l=n.digest().getBytes(),c=t.charAt(0),d=t.substring(1,n.digestLength+1),m=t.substring(1+n.digestLength),p=r(m,n.digestLength,i),u=r(r1.util.xorBytes(d,p,d.length),s-n.digestLength-1,i),h=r1.util.xorBytes(m,u,m.length),f=h.substring(0,n.digestLength),y="\0"!==c,g=0;g<n.digestLength;++g)y|=l.charAt(g)!==f.charAt(g);for(var b=1,k=n.digestLength,v=n.digestLength;v<h.length;v++){var x=h.charCodeAt(v);y|=x&65534*!!b,k+=b&=1&x^1}if(y||1!==h.charCodeAt(k))throw Error("Invalid RSAES-OAEP padding.");return h.substring(k+1)}}),r5(function(e){!function(){if(r1.prime)e.exports=r1.prime;else{var t=e.exports=r1.prime=r1.prime||{},r=r1.jsbn.BigInteger,a=[6,4,2,4,2,4,6,2],o=new r(null);o.fromInt(30);var n=function(e,t){return e|t};t.generateProbablePrime=function(e,t,a){"function"==typeof t&&(a=t,t={});var o,n,l,c=(t=t||{}).algorithm||"PRIMEINC";"string"==typeof c&&(c={name:c}),c.options=c.options||{};var d=t.prng||r1.random;if("PRIMEINC"===c.name)return o={nextBytes:function(e){for(var t=d.getBytesSync(e.length),r=0;r<e.length;++r)e[r]=t.charCodeAt(r)}},n=c.options,l=a,"workers"in n?function(e,t,a,o){if("u"<typeof Worker)return i(e,t,a,o);var n=s(e,t),l=a.workers,c=a.workLoad||100,d=30*c/8,m=a.workerScript||"forge/prime.worker.js";if(-1===l)return r1.util.estimateCores(function(e,t){e&&(t=2),l=t-1,p()});function p(){l=Math.max(1,l);for(var a=[],i=0;i<l;++i)a[i]=new Worker(m);for(i=0;i<l;++i)a[i].addEventListener("message",u);var p=!1;function u(i){if(!p){var l=i.data;if(l.found){for(var m=0;m<a.length;++m)a[m].terminate();return p=!0,o(null,new r(l.prime,16))}n.bitLength()>e&&(n=s(e,t));var u=n.toString(16);i.target.postMessage({hex:u,workLoad:c}),n.dAddOffset(d,0)}}}p()}(e,o,n,l):i(e,o,n,l);throw Error("Invalid prime generation algorithm: "+c.name)}}function i(e,t,r,o){var n,i=s(e,t),l=(n=i.bitLength())<=100?27:n<=150?18:n<=200?15:n<=250?12:n<=300?9:n<=350?8:n<=400?7:n<=500?6:n<=600?5:n<=800?4:n<=1250?3:2;"millerRabinTests"in r&&(l=r.millerRabinTests);var c=10;"maxBlockTime"in r&&(c=r.maxBlockTime),function e(t,r,o,n,i,l,c){var d=+new Date;do{if(t.bitLength()>r&&(t=s(r,o)),t.isProbablePrime(i))return c(null,t);t.dAddOffset(a[n++%8],0)}while(l<0||new Date-d<l)r1.util.setImmediate(function(){e(t,r,o,n,i,l,c)})}(i,e,t,0,l,c,o)}function s(e,t){var a=new r(e,t),i=e-1;return a.testBit(i)||a.bitwiseTo(r.ONE.shiftLeft(i),n,a),a.dAddOffset(31-a.mod(o).byteValue(),0),a}}()}),void 0===aJ)var aJ=r1.jsbn.BigInteger;var a0=r1.util.isNodejs?a_:null,a1=r1.asn1,a2=r1.util;r1.pki=r1.pki||{},r1.pki.rsa=r1.rsa=r1.rsa||{};var a5=r1.pki,a3=[6,4,2,4,2,4,6,2],a4={name:"PrivateKeyInfo",tagClass:a1.Class.UNIVERSAL,type:a1.Type.SEQUENCE,constructed:!0,value:[{name:"PrivateKeyInfo.version",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyVersion"},{name:"PrivateKeyInfo.privateKeyAlgorithm",tagClass:a1.Class.UNIVERSAL,type:a1.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:a1.Class.UNIVERSAL,type:a1.Type.OID,constructed:!1,capture:"privateKeyOid"}]},{name:"PrivateKeyInfo",tagClass:a1.Class.UNIVERSAL,type:a1.Type.OCTETSTRING,constructed:!1,capture:"privateKey"}]},a8={name:"RSAPrivateKey",tagClass:a1.Class.UNIVERSAL,type:a1.Type.SEQUENCE,constructed:!0,value:[{name:"RSAPrivateKey.version",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyVersion"},{name:"RSAPrivateKey.modulus",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyModulus"},{name:"RSAPrivateKey.publicExponent",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyPublicExponent"},{name:"RSAPrivateKey.privateExponent",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyPrivateExponent"},{name:"RSAPrivateKey.prime1",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyPrime1"},{name:"RSAPrivateKey.prime2",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyPrime2"},{name:"RSAPrivateKey.exponent1",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyExponent1"},{name:"RSAPrivateKey.exponent2",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyExponent2"},{name:"RSAPrivateKey.coefficient",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"privateKeyCoefficient"}]},a6={name:"RSAPublicKey",tagClass:a1.Class.UNIVERSAL,type:a1.Type.SEQUENCE,constructed:!0,value:[{name:"RSAPublicKey.modulus",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"publicKeyModulus"},{name:"RSAPublicKey.exponent",tagClass:a1.Class.UNIVERSAL,type:a1.Type.INTEGER,constructed:!1,capture:"publicKeyExponent"}]},a9=r1.pki.rsa.publicKeyValidator={name:"SubjectPublicKeyInfo",tagClass:a1.Class.UNIVERSAL,type:a1.Type.SEQUENCE,constructed:!0,captureAsn1:"subjectPublicKeyInfo",value:[{name:"SubjectPublicKeyInfo.AlgorithmIdentifier",tagClass:a1.Class.UNIVERSAL,type:a1.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:a1.Class.UNIVERSAL,type:a1.Type.OID,constructed:!1,capture:"publicKeyOid"}]},{name:"SubjectPublicKeyInfo.subjectPublicKey",tagClass:a1.Class.UNIVERSAL,type:a1.Type.BITSTRING,constructed:!1,value:[{name:"SubjectPublicKeyInfo.subjectPublicKey.RSAPublicKey",tagClass:a1.Class.UNIVERSAL,type:a1.Type.SEQUENCE,constructed:!0,optional:!0,captureAsn1:"rsaPublicKey"}]}]},a7={name:"DigestInfo",tagClass:a1.Class.UNIVERSAL,type:a1.Type.SEQUENCE,constructed:!0,value:[{name:"DigestInfo.DigestAlgorithm",tagClass:a1.Class.UNIVERSAL,type:a1.Type.SEQUENCE,constructed:!0,value:[{name:"DigestInfo.DigestAlgorithm.algorithmIdentifier",tagClass:a1.Class.UNIVERSAL,type:a1.Type.OID,constructed:!1,capture:"algorithmIdentifier"},{name:"DigestInfo.DigestAlgorithm.parameters",tagClass:a1.Class.UNIVERSAL,type:a1.Type.NULL,capture:"parameters",optional:!0,constructed:!1}]},{name:"DigestInfo.digest",tagClass:a1.Class.UNIVERSAL,type:a1.Type.OCTETSTRING,constructed:!1,capture:"digest"}]},oe=function(e){if(!(e.algorithm in a5.oids)){var t=Error("Unknown message digest algorithm.");throw t.algorithm=e.algorithm,t}var r=a1.oidToDer(a5.oids[e.algorithm]).getBytes(),a=a1.create(a1.Class.UNIVERSAL,a1.Type.SEQUENCE,!0,[]),o=a1.create(a1.Class.UNIVERSAL,a1.Type.SEQUENCE,!0,[]);o.value.push(a1.create(a1.Class.UNIVERSAL,a1.Type.OID,!1,r)),o.value.push(a1.create(a1.Class.UNIVERSAL,a1.Type.NULL,!1,""));var n=a1.create(a1.Class.UNIVERSAL,a1.Type.OCTETSTRING,!1,e.digest().getBytes());return a.value.push(o),a.value.push(n),a1.toDer(a).getBytes()},ot=function(e,t,r){if(r)return e.modPow(t.e,t.n);if(!t.p||!t.q)return e.modPow(t.d,t.n);t.dP||(t.dP=t.d.mod(t.p.subtract(aJ.ONE))),t.dQ||(t.dQ=t.d.mod(t.q.subtract(aJ.ONE))),t.qInv||(t.qInv=t.q.modInverse(t.p));do a=new aJ(r1.util.bytesToHex(r1.random.getBytes(t.n.bitLength()/8)),16);while(a.compareTo(t.n)>=0||!a.gcd(t.n).equals(aJ.ONE))for(var a,o=(e=e.multiply(a.modPow(t.e,t.n)).mod(t.n)).mod(t.p).modPow(t.dP,t.p),n=e.mod(t.q).modPow(t.dQ,t.q);0>o.compareTo(n);)o=o.add(t.p);return o.subtract(n).multiply(t.qInv).mod(t.p).multiply(t.q).add(n).multiply(a.modInverse(t.n)).mod(t.n)};function or(e,t,r){var a=r1.util.createBuffer(),o=Math.ceil(t.n.bitLength()/8);if(e.length>o-11){var n=Error("Message is too long for PKCS#1 v1.5 padding.");throw n.length=e.length,n.max=o-11,n}a.putByte(0),a.putByte(r);var i,s=o-3-e.length;if(0===r||1===r){i=255*(0!==r);for(var l=0;l<s;++l)a.putByte(i)}else for(;s>0;){var c=0,d=r1.random.getBytes(s);for(l=0;l<s;++l)0===(i=d.charCodeAt(l))?++c:a.putByte(i);s=c}return a.putByte(0),a.putBytes(e),a}function oa(e,t,r,a){var o=Math.ceil(t.n.bitLength()/8),n=r1.util.createBuffer(e),i=n.getByte(),s=n.getByte();if(0!==i||r&&0!==s&&1!==s||!r&&2!=s||r&&0===s&&void 0===a)throw Error("Encryption block is invalid.");var l=0;if(0===s){l=o-3-a;for(var c=0;c<l;++c)if(0!==n.getByte())throw Error("Encryption block is invalid.")}else if(1===s)for(l=0;n.length()>1;){if(255!==n.getByte()){--n.read;break}++l}else if(2===s)for(l=0;n.length()>1;){if(0===n.getByte()){--n.read;break}++l}if(0!==n.getByte()||l!==o-3-n.length())throw Error("Encryption block is invalid.");return n.getBytes()}function oo(e){var t=e.toString(16);t[0]>="8"&&(t="00"+t);var r=r1.util.hexToBytes(t);return!(r.length>1)||(0!==r.charCodeAt(0)||128&r.charCodeAt(1))&&(255!==r.charCodeAt(0)||128&~r.charCodeAt(1))?r:r.substr(1)}function on(e){return r1.util.isNodejs&&"function"==typeof a0[e]}function oi(e){return void 0!==a2.globalScope&&"object"==typeof a2.globalScope.crypto&&"object"==typeof a2.globalScope.crypto.subtle&&"function"==typeof a2.globalScope.crypto.subtle[e]}function os(e){return void 0!==a2.globalScope&&"object"==typeof a2.globalScope.msCrypto&&"object"==typeof a2.globalScope.msCrypto.subtle&&"function"==typeof a2.globalScope.msCrypto.subtle[e]}function ol(e){for(var t=r1.util.hexToBytes(e.toString(16)),r=new Uint8Array(t.length),a=0;a<t.length;++a)r[a]=t.charCodeAt(a);return r}a5.rsa.encrypt=function(e,t,r){var a,o=r,n=Math.ceil(t.n.bitLength()/8);!1!==r&&!0!==r?(o=2===r,a=or(e,t,r)):(a=r1.util.createBuffer()).putBytes(e);for(var i=new aJ(a.toHex(),16),s=ot(i,t,o).toString(16),l=r1.util.createBuffer(),c=n-Math.ceil(s.length/2);c>0;)l.putByte(0),--c;return l.putBytes(r1.util.hexToBytes(s)),l.getBytes()},a5.rsa.decrypt=function(e,t,r,a){var o=Math.ceil(t.n.bitLength()/8);if(e.length!==o){var n=Error("Encrypted message length is invalid.");throw n.length=e.length,n.expected=o,n}var i=new aJ(r1.util.createBuffer(e).toHex(),16);if(i.compareTo(t.n)>=0)throw Error("Encrypted message is invalid.");for(var s=ot(i,t,r).toString(16),l=r1.util.createBuffer(),c=o-Math.ceil(s.length/2);c>0;)l.putByte(0),--c;return l.putBytes(r1.util.hexToBytes(s)),!1!==a?oa(l.getBytes(),t,r):l.getBytes()},a5.rsa.createKeyPairGenerationState=function(e,t,r){"string"==typeof e&&(e=parseInt(e,10)),e=e||2048;var a,o=(r=r||{}).prng||r1.random,n=r.algorithm||"PRIMEINC";if("PRIMEINC"!==n)throw Error("Invalid key generation algorithm: "+n);return(a={algorithm:n,state:0,bits:e,rng:{nextBytes:function(e){for(var t=o.getBytesSync(e.length),r=0;r<e.length;++r)e[r]=t.charCodeAt(r)}},eInt:t||65537,e:new aJ(null),p:null,q:null,qBits:e>>1,pBits:e-(e>>1),pqState:0,num:null,keys:null}).e.fromInt(a.eInt),a},a5.rsa.stepKeyPairGenerationState=function(e,t){"algorithm"in e||(e.algorithm="PRIMEINC");var r=new aJ(null);r.fromInt(30);for(var a,o=0,n=function(e,t){return e|t},i=+new Date,s=0;null===e.keys&&(t<=0||s<t);){if(0===e.state){var l,c=null===e.p?e.pBits:e.qBits,d=c-1;0===e.pqState?(e.num=new aJ(c,e.rng),e.num.testBit(d)||e.num.bitwiseTo(aJ.ONE.shiftLeft(d),n,e.num),e.num.dAddOffset(31-e.num.mod(r).byteValue(),0),o=0,++e.pqState):1===e.pqState?e.num.bitLength()>c?e.pqState=0:e.num.isProbablePrime((l=e.num.bitLength())<=100?27:l<=150?18:l<=200?15:l<=250?12:l<=300?9:l<=350?8:l<=400?7:l<=500?6:l<=600?5:l<=800?4:l<=1250?3:2)?++e.pqState:e.num.dAddOffset(a3[o++%8],0):2===e.pqState?e.pqState=3*(0===e.num.subtract(aJ.ONE).gcd(e.e).compareTo(aJ.ONE)):3===e.pqState&&(e.pqState=0,null===e.p?e.p=e.num:e.q=e.num,null!==e.p&&null!==e.q&&++e.state,e.num=null)}else if(1===e.state)0>e.p.compareTo(e.q)&&(e.num=e.p,e.p=e.q,e.q=e.num),++e.state;else if(2===e.state)e.p1=e.p.subtract(aJ.ONE),e.q1=e.q.subtract(aJ.ONE),e.phi=e.p1.multiply(e.q1),++e.state;else if(3===e.state)0===e.phi.gcd(e.e).compareTo(aJ.ONE)?++e.state:(e.p=null,e.q=null,e.state=0);else if(4===e.state)e.n=e.p.multiply(e.q),e.n.bitLength()===e.bits?++e.state:(e.q=null,e.state=0);else if(5===e.state){var m=e.e.modInverse(e.phi);e.keys={privateKey:a5.rsa.setPrivateKey(e.n,e.e,m,e.p,e.q,m.mod(e.p1),m.mod(e.q1),e.q.modInverse(e.p)),publicKey:a5.rsa.setPublicKey(e.n,e.e)}}s+=(a=+new Date)-i,i=a}return null!==e.keys},a5.rsa.generateKeyPair=function(e,t,r,a){if(1==arguments.length?"object"==typeof e?(r=e,e=void 0):"function"==typeof e&&(a=e,e=void 0):2==arguments.length?"number"==typeof e?"function"==typeof t?(a=t,t=void 0):"number"!=typeof t&&(r=t,t=void 0):(r=e,a=t,e=void 0,t=void 0):3==arguments.length&&("number"==typeof t?"function"==typeof r&&(a=r,r=void 0):(a=r,r=t,t=void 0)),r=r||{},void 0===e&&(e=r.bits||2048),void 0===t&&(t=r.e||65537),!r.prng&&e>=256&&e<=16384&&(65537===t||3===t)){if(a){if(on("generateKeyPair"))return a0.generateKeyPair("rsa",{modulusLength:e,publicExponent:t,publicKeyEncoding:{type:"spki",format:"pem"},privateKeyEncoding:{type:"pkcs8",format:"pem"}},function(e,t,r){if(e)return a(e);a(null,{privateKey:a5.privateKeyFromPem(r),publicKey:a5.publicKeyFromPem(t)})});if(oi("generateKey")&&oi("exportKey"))return a2.globalScope.crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:e,publicExponent:ol(t),hash:{name:"SHA-256"}},!0,["sign","verify"]).then(function(e){return a2.globalScope.crypto.subtle.exportKey("pkcs8",e.privateKey)}).then(void 0,function(e){a(e)}).then(function(e){if(e){var t=a5.privateKeyFromAsn1(a1.fromDer(r1.util.createBuffer(e)));a(null,{privateKey:t,publicKey:a5.setRsaPublicKey(t.n,t.e)})}});if(os("generateKey")&&os("exportKey")){var o=a2.globalScope.msCrypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:e,publicExponent:ol(t),hash:{name:"SHA-256"}},!0,["sign","verify"]);return o.oncomplete=function(e){var t=a2.globalScope.msCrypto.subtle.exportKey("pkcs8",e.target.result.privateKey);t.oncomplete=function(e){var t=a5.privateKeyFromAsn1(a1.fromDer(r1.util.createBuffer(e.target.result)));a(null,{privateKey:t,publicKey:a5.setRsaPublicKey(t.n,t.e)})},t.onerror=function(e){a(e)}},void(o.onerror=function(e){a(e)})}}else if(on("generateKeyPairSync")){var n=a0.generateKeyPairSync("rsa",{modulusLength:e,publicExponent:t,publicKeyEncoding:{type:"spki",format:"pem"},privateKeyEncoding:{type:"pkcs8",format:"pem"}});return{privateKey:a5.privateKeyFromPem(n.privateKey),publicKey:a5.publicKeyFromPem(n.publicKey)}}}var i=a5.rsa.createKeyPairGenerationState(e,t,r);if(!a)return a5.rsa.stepKeyPairGenerationState(i,0),i.keys;var s=r,l=a;"function"==typeof s&&(l=s,s={});var c={algorithm:{name:(s=s||{}).algorithm||"PRIMEINC",options:{workers:s.workers||2,workLoad:s.workLoad||100,workerScript:s.workerScript}}};function d(){m(i.pBits,function(e,t){return e?l(e):(i.p=t,null!==i.q?p(e,i.q):void m(i.qBits,p))})}function m(e,t){r1.prime.generateProbablePrime(e,c,t)}function p(e,t){if(e)return l(e);if(i.q=t,0>i.p.compareTo(i.q)){var r=i.p;i.p=i.q,i.q=r}if(0!==i.p.subtract(aJ.ONE).gcd(i.e).compareTo(aJ.ONE))return i.p=null,void d();if(0!==i.q.subtract(aJ.ONE).gcd(i.e).compareTo(aJ.ONE))return i.q=null,void m(i.qBits,p);if(i.p1=i.p.subtract(aJ.ONE),i.q1=i.q.subtract(aJ.ONE),i.phi=i.p1.multiply(i.q1),0!==i.phi.gcd(i.e).compareTo(aJ.ONE))return i.p=i.q=null,void d();if(i.n=i.p.multiply(i.q),i.n.bitLength()!==i.bits)return i.q=null,void m(i.qBits,p);var a=i.e.modInverse(i.phi);i.keys={privateKey:a5.rsa.setPrivateKey(i.n,i.e,a,i.p,i.q,a.mod(i.p1),a.mod(i.q1),i.q.modInverse(i.p)),publicKey:a5.rsa.setPublicKey(i.n,i.e)},l(null,i.keys)}"prng"in s&&(c.prng=s.prng),d()},a5.setRsaPublicKey=a5.rsa.setPublicKey=function(e,t){var r={n:e,e:t,encrypt:function(e,t,a){if("string"==typeof t?t=t.toUpperCase():void 0===t&&(t="RSAES-PKCS1-V1_5"),"RSAES-PKCS1-V1_5"===t)t={encode:function(e,t,r){return or(e,t,2).getBytes()}};else if("RSA-OAEP"===t||"RSAES-OAEP"===t)t={encode:function(e,t){return r1.pkcs1.encode_rsa_oaep(t,e,a)}};else if(-1!==["RAW","NONE","NULL",null].indexOf(t))t={encode:function(e){return e}};else if("string"==typeof t)throw Error('Unsupported encryption scheme: "'+t+'".');var o=t.encode(e,r,!0);return a5.rsa.encrypt(o,r,!0)},verify:function(e,t,a,o){"string"==typeof a?a=a.toUpperCase():void 0===a&&(a="RSASSA-PKCS1-V1_5"),void 0===o&&(o={_parseAllDigestBytes:!0}),"_parseAllDigestBytes"in o||(o._parseAllDigestBytes=!0),"RSASSA-PKCS1-V1_5"===a?a={verify:function(e,t){t=oa(t,r,!0);var a=a1.fromDer(t,{parseAllBytes:o._parseAllDigestBytes}),n={},i=[];if(!a1.validate(a,a7,n,i))throw(s=Error("ASN.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value.")).errors=i,s;var s,l=a1.derToOid(n.algorithmIdentifier);if(l!==r1.oids.md2&&l!==r1.oids.md5&&l!==r1.oids.sha1&&l!==r1.oids.sha224&&l!==r1.oids.sha256&&l!==r1.oids.sha384&&l!==r1.oids.sha512&&l!==r1.oids["sha512-224"]&&l!==r1.oids["sha512-256"])throw(s=Error("Unknown RSASSA-PKCS1-v1_5 DigestAlgorithm identifier.")).oid=l,s;if((l===r1.oids.md2||l===r1.oids.md5)&&!("parameters"in n))throw Error("ASN.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value. Missing algorithm identifer NULL parameters.");return e===n.digest}}:"NONE"!==a&&"NULL"!==a&&null!==a||(a={verify:function(e,t){return e===oa(t,r,!0)}});var n=a5.rsa.decrypt(t,r,!0,!1);return a.verify(e,n,r.n.bitLength())}};return r},a5.setRsaPrivateKey=a5.rsa.setPrivateKey=function(e,t,r,a,o,n,i,s){var l={n:e,e:t,d:r,p:a,q:o,dP:n,dQ:i,qInv:s,decrypt:function(e,t,r){"string"==typeof t?t=t.toUpperCase():void 0===t&&(t="RSAES-PKCS1-V1_5");var a=a5.rsa.decrypt(e,l,!1,!1);if("RSAES-PKCS1-V1_5"===t)t={decode:oa};else if("RSA-OAEP"===t||"RSAES-OAEP"===t)t={decode:function(e,t){return r1.pkcs1.decode_rsa_oaep(t,e,r)}};else{if(-1===["RAW","NONE","NULL",null].indexOf(t))throw Error('Unsupported encryption scheme: "'+t+'".');t={decode:function(e){return e}}}return t.decode(a,l,!1)},sign:function(e,t){var r=!1;"string"==typeof t&&(t=t.toUpperCase()),void 0===t||"RSASSA-PKCS1-V1_5"===t?(t={encode:oe},r=1):"NONE"!==t&&"NULL"!==t&&null!==t||(t={encode:function(){return e}},r=1);var a=t.encode(e,l.n.bitLength());return a5.rsa.encrypt(a,l,r)}};return l},a5.wrapRsaPrivateKey=function(e){return a1.create(a1.Class.UNIVERSAL,a1.Type.SEQUENCE,!0,[a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,a1.integerToDer(0).getBytes()),a1.create(a1.Class.UNIVERSAL,a1.Type.SEQUENCE,!0,[a1.create(a1.Class.UNIVERSAL,a1.Type.OID,!1,a1.oidToDer(a5.oids.rsaEncryption).getBytes()),a1.create(a1.Class.UNIVERSAL,a1.Type.NULL,!1,"")]),a1.create(a1.Class.UNIVERSAL,a1.Type.OCTETSTRING,!1,a1.toDer(e).getBytes())])},a5.privateKeyFromAsn1=function(e){var t,r,a,o,n,i,s,l,c={},d=[];if(a1.validate(e,a4,c,d)&&(e=a1.fromDer(r1.util.createBuffer(c.privateKey))),!a1.validate(e,a8,c={},d=[])){var m=Error("Cannot read private key. ASN.1 object does not contain an RSAPrivateKey.");throw m.errors=d,m}return t=r1.util.createBuffer(c.privateKeyModulus).toHex(),r=r1.util.createBuffer(c.privateKeyPublicExponent).toHex(),a=r1.util.createBuffer(c.privateKeyPrivateExponent).toHex(),o=r1.util.createBuffer(c.privateKeyPrime1).toHex(),n=r1.util.createBuffer(c.privateKeyPrime2).toHex(),i=r1.util.createBuffer(c.privateKeyExponent1).toHex(),s=r1.util.createBuffer(c.privateKeyExponent2).toHex(),l=r1.util.createBuffer(c.privateKeyCoefficient).toHex(),a5.setRsaPrivateKey(new aJ(t,16),new aJ(r,16),new aJ(a,16),new aJ(o,16),new aJ(n,16),new aJ(i,16),new aJ(s,16),new aJ(l,16))},a5.privateKeyToAsn1=a5.privateKeyToRSAPrivateKey=function(e){return a1.create(a1.Class.UNIVERSAL,a1.Type.SEQUENCE,!0,[a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,a1.integerToDer(0).getBytes()),a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.n)),a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.e)),a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.d)),a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.p)),a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.q)),a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.dP)),a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.dQ)),a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.qInv))])},a5.publicKeyFromAsn1=function(e){var t={},r=[];if(a1.validate(e,a9,t,r)){var a,o=a1.derToOid(t.publicKeyOid);if(o!==a5.oids.rsaEncryption)throw(a=Error("Cannot read public key. Unknown OID.")).oid=o,a;e=t.rsaPublicKey}if(!a1.validate(e,a6,t,r=[]))throw(a=Error("Cannot read public key. ASN.1 object does not contain an RSAPublicKey.")).errors=r,a;var n=r1.util.createBuffer(t.publicKeyModulus).toHex(),i=r1.util.createBuffer(t.publicKeyExponent).toHex();return a5.setRsaPublicKey(new aJ(n,16),new aJ(i,16))},a5.publicKeyToAsn1=a5.publicKeyToSubjectPublicKeyInfo=function(e){return a1.create(a1.Class.UNIVERSAL,a1.Type.SEQUENCE,!0,[a1.create(a1.Class.UNIVERSAL,a1.Type.SEQUENCE,!0,[a1.create(a1.Class.UNIVERSAL,a1.Type.OID,!1,a1.oidToDer(a5.oids.rsaEncryption).getBytes()),a1.create(a1.Class.UNIVERSAL,a1.Type.NULL,!1,"")]),a1.create(a1.Class.UNIVERSAL,a1.Type.BITSTRING,!1,[a5.publicKeyToRSAPublicKey(e)])])},a5.publicKeyToRSAPublicKey=function(e){return a1.create(a1.Class.UNIVERSAL,a1.Type.SEQUENCE,!0,[a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.n)),a1.create(a1.Class.UNIVERSAL,a1.Type.INTEGER,!1,oo(e.e))])};var oc=r1.asn1,od=r1.pki=r1.pki||{};od.pbe=r1.pbe=r1.pbe||{};var om=od.oids,op={name:"EncryptedPrivateKeyInfo",tagClass:oc.Class.UNIVERSAL,type:oc.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedPrivateKeyInfo.encryptionAlgorithm",tagClass:oc.Class.UNIVERSAL,type:oc.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:oc.Class.UNIVERSAL,type:oc.Type.OID,constructed:!1,capture:"encryptionOid"},{name:"AlgorithmIdentifier.parameters",tagClass:oc.Class.UNIVERSAL,type:oc.Type.SEQUENCE,constructed:!0,captureAsn1:"encryptionParams"}]},{name:"EncryptedPrivateKeyInfo.encryptedData",tagClass:oc.Class.UNIVERSAL,type:oc.Type.OCTETSTRING,constructed:!1,capture:"encryptedData"}]},ou={name:"PBES2Algorithms",tagClass:oc.Class.UNIVERSAL,type:oc.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.keyDerivationFunc",tagClass:oc.Class.UNIVERSAL,type:oc.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.keyDerivationFunc.oid",tagClass:oc.Class.UNIVERSAL,type:oc.Type.OID,constructed:!1,capture:"kdfOid"},{name:"PBES2Algorithms.params",tagClass:oc.Class.UNIVERSAL,type:oc.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.params.salt",tagClass:oc.Class.UNIVERSAL,type:oc.Type.OCTETSTRING,constructed:!1,capture:"kdfSalt"},{name:"PBES2Algorithms.params.iterationCount",tagClass:oc.Class.UNIVERSAL,type:oc.Type.INTEGER,constructed:!1,capture:"kdfIterationCount"},{name:"PBES2Algorithms.params.keyLength",tagClass:oc.Class.UNIVERSAL,type:oc.Type.INTEGER,constructed:!1,optional:!0,capture:"keyLength"},{name:"PBES2Algorithms.params.prf",tagClass:oc.Class.UNIVERSAL,type:oc.Type.SEQUENCE,constructed:!0,optional:!0,value:[{name:"PBES2Algorithms.params.prf.algorithm",tagClass:oc.Class.UNIVERSAL,type:oc.Type.OID,constructed:!1,capture:"prfOid"}]}]}]},{name:"PBES2Algorithms.encryptionScheme",tagClass:oc.Class.UNIVERSAL,type:oc.Type.SEQUENCE,constructed:!0,value:[{name:"PBES2Algorithms.encryptionScheme.oid",tagClass:oc.Class.UNIVERSAL,type:oc.Type.OID,constructed:!1,capture:"encOid"},{name:"PBES2Algorithms.encryptionScheme.iv",tagClass:oc.Class.UNIVERSAL,type:oc.Type.OCTETSTRING,constructed:!1,capture:"encIv"}]}]},oh={name:"pkcs-12PbeParams",tagClass:oc.Class.UNIVERSAL,type:oc.Type.SEQUENCE,constructed:!0,value:[{name:"pkcs-12PbeParams.salt",tagClass:oc.Class.UNIVERSAL,type:oc.Type.OCTETSTRING,constructed:!1,capture:"salt"},{name:"pkcs-12PbeParams.iterations",tagClass:oc.Class.UNIVERSAL,type:oc.Type.INTEGER,constructed:!1,capture:"iterations"}]};function of(e,t){return e.start().update(t).digest().getBytes()}function oy(e){var t;if(e){if(!(t=od.oids[oc.derToOid(e)])){var r=Error("Unsupported PRF OID.");throw r.oid=e,r.supported=["hmacWithSHA1","hmacWithSHA224","hmacWithSHA256","hmacWithSHA384","hmacWithSHA512"],r}}else t="hmacWithSHA1";return og(t)}function og(e){var t=r1.md;switch(e){case"hmacWithSHA224":t=r1.md.sha512;case"hmacWithSHA1":case"hmacWithSHA256":case"hmacWithSHA384":case"hmacWithSHA512":e=e.substr(8).toLowerCase();break;default:var r=Error("Unsupported PRF algorithm.");throw r.algorithm=e,r.supported=["hmacWithSHA1","hmacWithSHA224","hmacWithSHA256","hmacWithSHA384","hmacWithSHA512"],r}if(!t||!(e in t))throw Error("Unknown hash algorithm: "+e);return t[e].create()}od.encryptPrivateKeyInfo=function(e,t,r){(r=r||{}).saltSize=r.saltSize||8,r.count=r.count||2048,r.algorithm=r.algorithm||"aes128",r.prfAlgorithm=r.prfAlgorithm||"sha1";var a,o,n,i=r1.random.getBytesSync(r.saltSize),s=r.count,l=oc.integerToDer(s);if(0===r.algorithm.indexOf("aes")||"des"===r.algorithm){switch(r.algorithm){case"aes128":a=16,m=16,p=om["aes128-CBC"],u=r1.aes.createEncryptionCipher;break;case"aes192":a=24,m=16,p=om["aes192-CBC"],u=r1.aes.createEncryptionCipher;break;case"aes256":a=32,m=16,p=om["aes256-CBC"],u=r1.aes.createEncryptionCipher;break;case"des":a=8,m=8,p=om.desCBC,u=r1.des.createEncryptionCipher;break;default:throw(k=Error("Cannot encrypt private key. Unknown encryption algorithm.")).algorithm=r.algorithm,k}var c,d,m,p,u,h="hmacWith"+r.prfAlgorithm.toUpperCase(),f=og(h),y=r1.pkcs5.pbkdf2(t,i,s,a,f),g=r1.random.getBytesSync(m);(v=u(y)).start(g),v.update(oc.toDer(e)),v.finish(),n=v.output.getBytes();var b=(c=a,d=oc.create(oc.Class.UNIVERSAL,oc.Type.SEQUENCE,!0,[oc.create(oc.Class.UNIVERSAL,oc.Type.OCTETSTRING,!1,i),oc.create(oc.Class.UNIVERSAL,oc.Type.INTEGER,!1,l.getBytes())]),"hmacWithSHA1"!==h&&d.value.push(oc.create(oc.Class.UNIVERSAL,oc.Type.INTEGER,!1,r1.util.hexToBytes(c.toString(16))),oc.create(oc.Class.UNIVERSAL,oc.Type.SEQUENCE,!0,[oc.create(oc.Class.UNIVERSAL,oc.Type.OID,!1,oc.oidToDer(od.oids[h]).getBytes()),oc.create(oc.Class.UNIVERSAL,oc.Type.NULL,!1,"")])),d);o=oc.create(oc.Class.UNIVERSAL,oc.Type.SEQUENCE,!0,[oc.create(oc.Class.UNIVERSAL,oc.Type.OID,!1,oc.oidToDer(om.pkcs5PBES2).getBytes()),oc.create(oc.Class.UNIVERSAL,oc.Type.SEQUENCE,!0,[oc.create(oc.Class.UNIVERSAL,oc.Type.SEQUENCE,!0,[oc.create(oc.Class.UNIVERSAL,oc.Type.OID,!1,oc.oidToDer(om.pkcs5PBKDF2).getBytes()),b]),oc.create(oc.Class.UNIVERSAL,oc.Type.SEQUENCE,!0,[oc.create(oc.Class.UNIVERSAL,oc.Type.OID,!1,oc.oidToDer(p).getBytes()),oc.create(oc.Class.UNIVERSAL,oc.Type.OCTETSTRING,!1,g)])])])}else{if("3des"!==r.algorithm)throw(k=Error("Cannot encrypt private key. Unknown encryption algorithm.")).algorithm=r.algorithm,k;a=24;var k,v,x=new r1.util.ByteBuffer(i);y=od.pbe.generatePkcs12Key(t,x,1,s,a),g=od.pbe.generatePkcs12Key(t,x,2,s,a),(v=r1.des.createEncryptionCipher(y)).start(g),v.update(oc.toDer(e)),v.finish(),n=v.output.getBytes(),o=oc.create(oc.Class.UNIVERSAL,oc.Type.SEQUENCE,!0,[oc.create(oc.Class.UNIVERSAL,oc.Type.OID,!1,oc.oidToDer(om["pbeWithSHAAnd3-KeyTripleDES-CBC"]).getBytes()),oc.create(oc.Class.UNIVERSAL,oc.Type.SEQUENCE,!0,[oc.create(oc.Class.UNIVERSAL,oc.Type.OCTETSTRING,!1,i),oc.create(oc.Class.UNIVERSAL,oc.Type.INTEGER,!1,l.getBytes())])])}return oc.create(oc.Class.UNIVERSAL,oc.Type.SEQUENCE,!0,[o,oc.create(oc.Class.UNIVERSAL,oc.Type.OCTETSTRING,!1,n)])},od.decryptPrivateKeyInfo=function(e,t){var r=null,a={},o=[];if(!oc.validate(e,op,a,o)){var n=Error("Cannot read encrypted private key. ASN.1 object is not a supported EncryptedPrivateKeyInfo.");throw n.errors=o,n}var i=oc.derToOid(a.encryptionOid),s=od.pbe.getCipher(i,a.encryptionParams,t),l=r1.util.createBuffer(a.encryptedData);return s.update(l),s.finish()&&(r=oc.fromDer(s.output)),r},od.encryptedPrivateKeyToPem=function(e,t){var r={type:"ENCRYPTED PRIVATE KEY",body:oc.toDer(e).getBytes()};return r1.pem.encode(r,{maxline:t})},od.encryptedPrivateKeyFromPem=function(e){var t=r1.pem.decode(e)[0];if("ENCRYPTED PRIVATE KEY"!==t.type){var r=Error('Could not convert encrypted private key from PEM; PEM header type is "ENCRYPTED PRIVATE KEY".');throw r.headerType=t.type,r}if(t.procType&&"ENCRYPTED"===t.procType.type)throw Error("Could not convert encrypted private key from PEM; PEM is encrypted.");return oc.fromDer(t.body)},od.encryptRsaPrivateKey=function(e,t,r){if(!(r=r||{}).legacy){var a,o,n,i,s=od.wrapRsaPrivateKey(od.privateKeyToAsn1(e));return s=od.encryptPrivateKeyInfo(s,t,r),od.encryptedPrivateKeyToPem(s)}switch(r.algorithm){case"aes128":a="AES-128-CBC",n=16,o=r1.random.getBytesSync(16),i=r1.aes.createEncryptionCipher;break;case"aes192":a="AES-192-CBC",n=24,o=r1.random.getBytesSync(16),i=r1.aes.createEncryptionCipher;break;case"aes256":a="AES-256-CBC",n=32,o=r1.random.getBytesSync(16),i=r1.aes.createEncryptionCipher;break;case"3des":a="DES-EDE3-CBC",n=24,o=r1.random.getBytesSync(8),i=r1.des.createEncryptionCipher;break;case"des":a="DES-CBC",n=8,o=r1.random.getBytesSync(8),i=r1.des.createEncryptionCipher;break;default:var l=Error('Could not encrypt RSA private key; unsupported encryption algorithm "'+r.algorithm+'".');throw l.algorithm=r.algorithm,l}var c=i(r1.pbe.opensslDeriveBytes(t,o.substr(0,8),n));c.start(o),c.update(oc.toDer(od.privateKeyToAsn1(e))),c.finish();var d={type:"RSA PRIVATE KEY",procType:{version:"4",type:"ENCRYPTED"},dekInfo:{algorithm:a,parameters:r1.util.bytesToHex(o).toUpperCase()},body:c.output.getBytes()};return r1.pem.encode(d)},od.decryptRsaPrivateKey=function(e,t){var r=null,a=r1.pem.decode(e)[0];if("ENCRYPTED PRIVATE KEY"!==a.type&&"PRIVATE KEY"!==a.type&&"RSA PRIVATE KEY"!==a.type)throw(i=Error('Could not convert private key from PEM; PEM header type is not "ENCRYPTED PRIVATE KEY", "PRIVATE KEY", or "RSA PRIVATE KEY".')).headerType=i,i;if(a.procType&&"ENCRYPTED"===a.procType.type){switch(a.dekInfo.algorithm){case"DES-CBC":o=8,n=r1.des.createDecryptionCipher;break;case"DES-EDE3-CBC":o=24,n=r1.des.createDecryptionCipher;break;case"AES-128-CBC":o=16,n=r1.aes.createDecryptionCipher;break;case"AES-192-CBC":o=24,n=r1.aes.createDecryptionCipher;break;case"AES-256-CBC":o=32,n=r1.aes.createDecryptionCipher;break;case"RC2-40-CBC":o=5,n=function(e){return r1.rc2.createDecryptionCipher(e,40)};break;case"RC2-64-CBC":o=8,n=function(e){return r1.rc2.createDecryptionCipher(e,64)};break;case"RC2-128-CBC":o=16,n=function(e){return r1.rc2.createDecryptionCipher(e,128)};break;default:throw(i=Error('Could not decrypt private key; unsupported encryption algorithm "'+a.dekInfo.algorithm+'".')).algorithm=a.dekInfo.algorithm,i}var o,n,i,s=r1.util.hexToBytes(a.dekInfo.parameters),l=n(r1.pbe.opensslDeriveBytes(t,s.substr(0,8),o));if(l.start(s),l.update(r1.util.createBuffer(a.body)),!l.finish())return r;r=l.output.getBytes()}else r=a.body;return null!==(r="ENCRYPTED PRIVATE KEY"===a.type?od.decryptPrivateKeyInfo(oc.fromDer(r),t):oc.fromDer(r))&&(r=od.privateKeyFromAsn1(r)),r},od.pbe.generatePkcs12Key=function(e,t,r,a,o,n){if(null==n){if(!("sha1"in r1.md))throw Error('"sha1" hash algorithm unavailable.');n=r1.md.sha1.create()}var i,s,l=n.digestLength,c=n.blockLength,d=new r1.util.ByteBuffer,m=new r1.util.ByteBuffer;if(null!=e){for(s=0;s<e.length;s++)m.putInt16(e.charCodeAt(s));m.putInt16(0)}var p=m.length(),u=t.length(),h=new r1.util.ByteBuffer;h.fillWithByte(r,c);var f=c*Math.ceil(u/c),y=new r1.util.ByteBuffer;for(s=0;s<f;s++)y.putByte(t.at(s%u));var g=c*Math.ceil(p/c),b=new r1.util.ByteBuffer;for(s=0;s<g;s++)b.putByte(m.at(s%p));var k=y;k.putBuffer(b);for(var v=Math.ceil(o/l),x=1;x<=v;x++){var z=new r1.util.ByteBuffer;z.putBytes(h.bytes()),z.putBytes(k.bytes());for(var C=0;C<a;C++)n.start(),n.update(z.getBytes()),z=n.digest();var w=new r1.util.ByteBuffer;for(s=0;s<c;s++)w.putByte(z.at(s%l));var S=Math.ceil(u/c)+Math.ceil(p/c),_=new r1.util.ByteBuffer;for(i=0;i<S;i++){var E=new r1.util.ByteBuffer(k.getBytes(c)),N=511;for(s=w.length()-1;s>=0;s--)N>>=8,N+=w.at(s)+E.at(s),E.setAt(s,255&N);_.putBuffer(E)}k=_,d.putBuffer(z)}return d.truncate(d.length()-o),d},od.pbe.getCipher=function(e,t,r){switch(e){case od.oids.pkcs5PBES2:return od.pbe.getCipherForPBES2(e,t,r);case od.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:case od.oids["pbewithSHAAnd40BitRC2-CBC"]:return od.pbe.getCipherForPKCS12PBE(e,t,r);default:var a=Error("Cannot read encrypted PBE data block. Unsupported OID.");throw a.oid=e,a.supportedOids=["pkcs5PBES2","pbeWithSHAAnd3-KeyTripleDES-CBC","pbewithSHAAnd40BitRC2-CBC"],a}},od.pbe.getCipherForPBES2=function(e,t,r){var a,o={},n=[];if(!oc.validate(t,ou,o,n))throw(a=Error("Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.")).errors=n,a;if((e=oc.derToOid(o.kdfOid))!==od.oids.pkcs5PBKDF2)throw(a=Error("Cannot read encrypted private key. Unsupported key derivation function OID.")).oid=e,a.supportedOids=["pkcs5PBKDF2"],a;if((e=oc.derToOid(o.encOid))!==od.oids["aes128-CBC"]&&e!==od.oids["aes192-CBC"]&&e!==od.oids["aes256-CBC"]&&e!==od.oids["des-EDE3-CBC"]&&e!==od.oids.desCBC)throw(a=Error("Cannot read encrypted private key. Unsupported encryption scheme OID.")).oid=e,a.supportedOids=["aes128-CBC","aes192-CBC","aes256-CBC","des-EDE3-CBC","desCBC"],a;var i,s,l=o.kdfSalt,c=r1.util.createBuffer(o.kdfIterationCount);switch(c=c.getInt(c.length()<<3),od.oids[e]){case"aes128-CBC":i=16,s=r1.aes.createDecryptionCipher;break;case"aes192-CBC":i=24,s=r1.aes.createDecryptionCipher;break;case"aes256-CBC":i=32,s=r1.aes.createDecryptionCipher;break;case"des-EDE3-CBC":i=24,s=r1.des.createDecryptionCipher;break;case"desCBC":i=8,s=r1.des.createDecryptionCipher}var d=oy(o.prfOid),m=r1.pkcs5.pbkdf2(r,l,c,i,d),p=o.encIv,u=s(m);return u.start(p),u},od.pbe.getCipherForPKCS12PBE=function(e,t,r){var a,o={},n=[];if(!oc.validate(t,oh,o,n))throw(a=Error("Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.")).errors=n,a;var i,s,l,c=r1.util.createBuffer(o.salt),d=r1.util.createBuffer(o.iterations);switch(d=d.getInt(d.length()<<3),e){case od.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:i=24,s=8,l=r1.des.startDecrypting;break;case od.oids["pbewithSHAAnd40BitRC2-CBC"]:i=5,s=8,l=function(e,t){var r=r1.rc2.createDecryptionCipher(e,40);return r.start(t,null),r};break;default:throw(a=Error("Cannot read PKCS #12 PBE data block. Unsupported OID.")).oid=e,a}var m=oy(o.prfOid),p=od.pbe.generatePkcs12Key(r,c,1,d,i,m);return m.start(),l(p,od.pbe.generatePkcs12Key(r,c,2,d,s,m))},od.pbe.opensslDeriveBytes=function(e,t,r,a){if(null==a){if(!("md5"in r1.md))throw Error('"md5" hash algorithm unavailable.');a=r1.md.md5.create()}null===t&&(t="");for(var o=[of(a,e+t)],n=16,i=1;n<r;++i,n+=16)o.push(of(a,o[i-1]+e+t));return o.join("").substr(0,r)},r5(function(e){var t=r1.asn1,r=e.exports=r1.pkcs7asn1=r1.pkcs7asn1||{};r1.pkcs7=r1.pkcs7||{},r1.pkcs7.asn1=r;var a={name:"ContentInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"ContentInfo.ContentType",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"contentType"},{name:"ContentInfo.content",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,captureAsn1:"content"}]};r.contentInfoValidator=a;var o={name:"EncryptedContentInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedContentInfo.contentType",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"contentType"},{name:"EncryptedContentInfo.contentEncryptionAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedContentInfo.contentEncryptionAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"encAlgorithm"},{name:"EncryptedContentInfo.contentEncryptionAlgorithm.parameter",tagClass:t.Class.UNIVERSAL,captureAsn1:"encParameter"}]},{name:"EncryptedContentInfo.encryptedContent",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,capture:"encryptedContent",captureAsn1:"encryptedContentAsn1"}]};r.envelopedDataValidator={name:"EnvelopedData",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"EnvelopedData.Version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"},{name:"EnvelopedData.RecipientInfos",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0,captureAsn1:"recipientInfos"}].concat(o)},r.encryptedDataValidator={name:"EncryptedData",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"EncryptedData.Version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"}].concat(o)},r.signedDataValidator={name:"SignedData",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"SignedData.Version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"},{name:"SignedData.DigestAlgorithms",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0,captureAsn1:"digestAlgorithms"},a,{name:"SignedData.Certificates",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,optional:!0,captureAsn1:"certificates"},{name:"SignedData.CertificateRevocationLists",tagClass:t.Class.CONTEXT_SPECIFIC,type:1,optional:!0,captureAsn1:"crls"},{name:"SignedData.SignerInfos",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,capture:"signerInfos",optional:!0,value:[{name:"SignerInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"SignerInfo.version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1},{name:"SignerInfo.issuerAndSerialNumber",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"SignerInfo.issuerAndSerialNumber.issuer",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"issuer"},{name:"SignerInfo.issuerAndSerialNumber.serialNumber",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"serial"}]},{name:"SignerInfo.digestAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"SignerInfo.digestAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"digestAlgorithm"},{name:"SignerInfo.digestAlgorithm.parameter",tagClass:t.Class.UNIVERSAL,constructed:!1,captureAsn1:"digestParameter",optional:!0}]},{name:"SignerInfo.authenticatedAttributes",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,capture:"authenticatedAttributes"},{name:"SignerInfo.digestEncryptionAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,capture:"signatureAlgorithm"},{name:"SignerInfo.encryptedDigest",tagClass:t.Class.UNIVERSAL,type:t.Type.OCTETSTRING,constructed:!1,capture:"signature"},{name:"SignerInfo.unauthenticatedAttributes",tagClass:t.Class.CONTEXT_SPECIFIC,type:1,constructed:!0,optional:!0,capture:"unauthenticatedAttributes"}]}]}]},r.recipientInfoValidator={name:"RecipientInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"RecipientInfo.version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"},{name:"RecipientInfo.issuerAndSerial",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"RecipientInfo.issuerAndSerial.issuer",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"issuer"},{name:"RecipientInfo.issuerAndSerial.serialNumber",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"serial"}]},{name:"RecipientInfo.keyEncryptionAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"RecipientInfo.keyEncryptionAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"encAlgorithm"},{name:"RecipientInfo.keyEncryptionAlgorithm.parameter",tagClass:t.Class.UNIVERSAL,constructed:!1,captureAsn1:"encParameter",optional:!0}]},{name:"RecipientInfo.encryptedKey",tagClass:t.Class.UNIVERSAL,type:t.Type.OCTETSTRING,constructed:!1,capture:"encKey"}]}}),r5(function(e){r1.mgf=r1.mgf||{},(e.exports=r1.mgf.mgf1=r1.mgf1=r1.mgf1||{}).create=function(e){return{generate:function(t,r){for(var a=new r1.util.ByteBuffer,o=Math.ceil(r/e.digestLength),n=0;n<o;n++){var i=new r1.util.ByteBuffer;i.putInt32(n),e.start(),e.update(t+i.getBytes()),a.putBuffer(e.digest())}return a.truncate(a.length()-r),a.getBytes()}}}}),r1.mgf=r1.mgf||{},r1.mgf.mgf1=r1.mgf1,r5(function(e){(e.exports=r1.pss=r1.pss||{}).create=function(e){3==arguments.length&&(e={md:arguments[0],mgf:arguments[1],saltLength:arguments[2]});var t,r=e.md,a=e.mgf,o=r.digestLength,n=e.salt||null;if("string"==typeof n&&(n=r1.util.createBuffer(n)),"saltLength"in e)t=e.saltLength;else{if(null===n)throw Error("Salt length not specified or specific salt not given.");t=n.length()}if(null!==n&&n.length()!==t)throw Error("Given salt length does not match length of given salt.");var i=e.prng||r1.random;return{encode:function(e,s){var l,c,d=s-1,m=Math.ceil(d/8),p=e.digest().getBytes();if(m<o+t+2)throw Error("Message is too long to encrypt.");c=null===n?i.getBytesSync(t):n.bytes();var u=new r1.util.ByteBuffer;u.fillWithByte(0,8),u.putBytes(p),u.putBytes(c),r.start(),r.update(u.getBytes());var h=r.digest().getBytes(),f=new r1.util.ByteBuffer;f.fillWithByte(0,m-t-o-2),f.putByte(1),f.putBytes(c);var y=f.getBytes(),g=m-o-1,b=a.generate(h,g),k="";for(l=0;l<g;l++)k+=String.fromCharCode(y.charCodeAt(l)^b.charCodeAt(l));return(k=String.fromCharCode(k.charCodeAt(0)&~(65280>>8*m-d&255))+k.substr(1))+h+String.fromCharCode(188)},verify:function(e,n,i){var s,l=i-1,c=Math.ceil(l/8);if(n=n.substr(-c),c<o+t+2)throw Error("Inconsistent parameters to PSS signature verification.");if(188!==n.charCodeAt(c-1))throw Error("Encoded message does not end in 0xBC.");var d=c-o-1,m=n.substr(0,d),p=n.substr(d,o),u=65280>>8*c-l&255;if(0!=(m.charCodeAt(0)&u))throw Error("Bits beyond keysize not zero as expected.");var h=a.generate(p,d),f="";for(s=0;s<d;s++)f+=String.fromCharCode(m.charCodeAt(s)^h.charCodeAt(s));f=String.fromCharCode(f.charCodeAt(0)&~u)+f.substr(1);var y=c-o-t-2;for(s=0;s<y;s++)if(0!==f.charCodeAt(s))throw Error("Leftmost octets not zero as expected");if(1!==f.charCodeAt(y))throw Error("Inconsistent PSS signature, 0x01 marker not found");var g=f.substr(-t),b=new r1.util.ByteBuffer;return b.fillWithByte(0,8),b.putBytes(e),b.putBytes(g),r.start(),r.update(b.getBytes()),p===r.digest().getBytes()}}}}),r5(function(e){var t=r1.asn1,r=e.exports=r1.pki=r1.pki||{},a=r.oids,o={};o.CN=a.commonName,o.commonName="CN",o.C=a.countryName,o.countryName="C",o.L=a.localityName,o.localityName="L",o.ST=a.stateOrProvinceName,o.stateOrProvinceName="ST",o.O=a.organizationName,o.organizationName="O",o.OU=a.organizationalUnitName,o.organizationalUnitName="OU",o.E=a.emailAddress,o.emailAddress="E";var n=r1.pki.rsa.publicKeyValidator,i={name:"Certificate",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.TBSCertificate",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"tbsCertificate",value:[{name:"Certificate.TBSCertificate.version",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,value:[{name:"Certificate.TBSCertificate.version.integer",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"certVersion"}]},{name:"Certificate.TBSCertificate.serialNumber",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"certSerialNumber"},{name:"Certificate.TBSCertificate.signature",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.TBSCertificate.signature.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"certinfoSignatureOid"},{name:"Certificate.TBSCertificate.signature.parameters",tagClass:t.Class.UNIVERSAL,optional:!0,captureAsn1:"certinfoSignatureParams"}]},{name:"Certificate.TBSCertificate.issuer",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"certIssuer"},{name:"Certificate.TBSCertificate.validity",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.TBSCertificate.validity.notBefore (utc)",tagClass:t.Class.UNIVERSAL,type:t.Type.UTCTIME,constructed:!1,optional:!0,capture:"certValidity1UTCTime"},{name:"Certificate.TBSCertificate.validity.notBefore (generalized)",tagClass:t.Class.UNIVERSAL,type:t.Type.GENERALIZEDTIME,constructed:!1,optional:!0,capture:"certValidity2GeneralizedTime"},{name:"Certificate.TBSCertificate.validity.notAfter (utc)",tagClass:t.Class.UNIVERSAL,type:t.Type.UTCTIME,constructed:!1,optional:!0,capture:"certValidity3UTCTime"},{name:"Certificate.TBSCertificate.validity.notAfter (generalized)",tagClass:t.Class.UNIVERSAL,type:t.Type.GENERALIZEDTIME,constructed:!1,optional:!0,capture:"certValidity4GeneralizedTime"}]},{name:"Certificate.TBSCertificate.subject",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"certSubject"},n,{name:"Certificate.TBSCertificate.issuerUniqueID",tagClass:t.Class.CONTEXT_SPECIFIC,type:1,constructed:!0,optional:!0,value:[{name:"Certificate.TBSCertificate.issuerUniqueID.id",tagClass:t.Class.UNIVERSAL,type:t.Type.BITSTRING,constructed:!1,captureBitStringValue:"certIssuerUniqueId"}]},{name:"Certificate.TBSCertificate.subjectUniqueID",tagClass:t.Class.CONTEXT_SPECIFIC,type:2,constructed:!0,optional:!0,value:[{name:"Certificate.TBSCertificate.subjectUniqueID.id",tagClass:t.Class.UNIVERSAL,type:t.Type.BITSTRING,constructed:!1,captureBitStringValue:"certSubjectUniqueId"}]},{name:"Certificate.TBSCertificate.extensions",tagClass:t.Class.CONTEXT_SPECIFIC,type:3,constructed:!0,captureAsn1:"certExtensions",optional:!0}]},{name:"Certificate.signatureAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Certificate.signatureAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"certSignatureOid"},{name:"Certificate.TBSCertificate.signature.parameters",tagClass:t.Class.UNIVERSAL,optional:!0,captureAsn1:"certSignatureParams"}]},{name:"Certificate.signatureValue",tagClass:t.Class.UNIVERSAL,type:t.Type.BITSTRING,constructed:!1,captureBitStringValue:"certSignature"}]},s={name:"rsapss",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"rsapss.hashAlgorithm",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,value:[{name:"rsapss.hashAlgorithm.AlgorithmIdentifier",tagClass:t.Class.UNIVERSAL,type:t.Class.SEQUENCE,constructed:!0,optional:!0,value:[{name:"rsapss.hashAlgorithm.AlgorithmIdentifier.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"hashOid"}]}]},{name:"rsapss.maskGenAlgorithm",tagClass:t.Class.CONTEXT_SPECIFIC,type:1,constructed:!0,value:[{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier",tagClass:t.Class.UNIVERSAL,type:t.Class.SEQUENCE,constructed:!0,optional:!0,value:[{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"maskGenOid"},{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier.params",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"rsapss.maskGenAlgorithm.AlgorithmIdentifier.params.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"maskGenHashOid"}]}]}]},{name:"rsapss.saltLength",tagClass:t.Class.CONTEXT_SPECIFIC,type:2,optional:!0,value:[{name:"rsapss.saltLength.saltLength",tagClass:t.Class.UNIVERSAL,type:t.Class.INTEGER,constructed:!1,capture:"saltLength"}]},{name:"rsapss.trailerField",tagClass:t.Class.CONTEXT_SPECIFIC,type:3,optional:!0,value:[{name:"rsapss.trailer.trailer",tagClass:t.Class.UNIVERSAL,type:t.Class.INTEGER,constructed:!1,capture:"trailer"}]}]},l={name:"CertificationRequest",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"csr",value:[{name:"CertificationRequestInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"certificationRequestInfo",value:[{name:"CertificationRequestInfo.integer",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"certificationRequestInfoVersion"},{name:"CertificationRequestInfo.subject",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,captureAsn1:"certificationRequestInfoSubject"},n,{name:"CertificationRequestInfo.attributes",tagClass:t.Class.CONTEXT_SPECIFIC,type:0,constructed:!0,optional:!0,capture:"certificationRequestInfoAttributes",value:[{name:"CertificationRequestInfo.attributes",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"CertificationRequestInfo.attributes.type",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1},{name:"CertificationRequestInfo.attributes.value",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0}]}]}]},{name:"CertificationRequest.signatureAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"CertificationRequest.signatureAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"csrSignatureOid"},{name:"CertificationRequest.signatureAlgorithm.parameters",tagClass:t.Class.UNIVERSAL,optional:!0,captureAsn1:"csrSignatureParams"}]},{name:"CertificationRequest.signature",tagClass:t.Class.UNIVERSAL,type:t.Type.BITSTRING,constructed:!1,captureBitStringValue:"csrSignature"}]};function c(e,t){"string"==typeof t&&(t={shortName:t});for(var r,a=null,o=0;null===a&&o<e.attributes.length;++o)r=e.attributes[o],(t.type&&t.type===r.type||t.name&&t.name===r.name||t.shortName&&t.shortName===r.shortName)&&(a=r);return a}r.RDNAttributesAsArray=function(e,r){for(var n,i,s,l=[],c=0;c<e.value.length;++c){n=e.value[c];for(var d=0;d<n.value.length;++d)(s={}).type=t.derToOid((i=n.value[d]).value[0].value),s.value=i.value[1].value,s.valueTagClass=i.value[1].type,s.type in a&&(s.name=a[s.type],s.name in o&&(s.shortName=o[s.name])),r&&(r.update(s.type),r.update(s.value)),l.push(s)}return l},r.CRIAttributesAsArray=function(e){for(var n=[],i=0;i<e.length;++i)for(var s=e[i],l=t.derToOid(s.value[0].value),c=s.value[1].value,d=0;d<c.length;++d){var m={};if(m.type=l,m.value=c[d].value,m.valueTagClass=c[d].type,m.type in a&&(m.name=a[m.type],m.name in o&&(m.shortName=o[m.name])),m.type===a.extensionRequest){m.extensions=[];for(var p=0;p<m.value.length;++p)m.extensions.push(r.certificateExtensionFromAsn1(m.value[p]))}n.push(m)}return n};var d=function(e,r,o){var n={};if(e!==a["RSASSA-PSS"])return n;o&&(n={hash:{algorithmOid:a.sha1},mgf:{algorithmOid:a.mgf1,hash:{algorithmOid:a.sha1}},saltLength:20});var i={},l=[];if(!t.validate(r,s,i,l)){var c=Error("Cannot read RSASSA-PSS parameter block.");throw c.errors=l,c}return void 0!==i.hashOid&&(n.hash=n.hash||{},n.hash.algorithmOid=t.derToOid(i.hashOid)),void 0!==i.maskGenOid&&(n.mgf=n.mgf||{},n.mgf.algorithmOid=t.derToOid(i.maskGenOid),n.mgf.hash=n.mgf.hash||{},n.mgf.hash.algorithmOid=t.derToOid(i.maskGenHashOid)),void 0!==i.saltLength&&(n.saltLength=i.saltLength.charCodeAt(0)),n},m=function(e){switch(a[e.signatureOid]){case"sha1WithRSAEncryption":case"sha1WithRSASignature":return r1.md.sha1.create();case"md5WithRSAEncryption":return r1.md.md5.create();case"sha256WithRSAEncryption":case"RSASSA-PSS":return r1.md.sha256.create();case"sha384WithRSAEncryption":return r1.md.sha384.create();case"sha512WithRSAEncryption":return r1.md.sha512.create();default:var t=Error("Could not compute "+e.type+" digest. Unknown signature OID.");throw t.signatureOid=e.signatureOid,t}},p=function(e){var t,r,o,n,i=e.certificate;switch(i.signatureOid){case a.sha1WithRSAEncryption:case a.sha1WithRSASignature:break;case a["RSASSA-PSS"]:if(void 0===(t=a[i.signatureParameters.mgf.hash.algorithmOid])||void 0===r1.md[t])throw(o=Error("Unsupported MGF hash function.")).oid=i.signatureParameters.mgf.hash.algorithmOid,o.name=t,o;if(void 0===(r=a[i.signatureParameters.mgf.algorithmOid])||void 0===r1.mgf[r])throw(o=Error("Unsupported MGF function.")).oid=i.signatureParameters.mgf.algorithmOid,o.name=r,o;if(r=r1.mgf[r].create(r1.md[t].create()),void 0===(t=a[i.signatureParameters.hash.algorithmOid])||void 0===r1.md[t])throw(o=Error("Unsupported RSASSA-PSS hash function.")).oid=i.signatureParameters.hash.algorithmOid,o.name=t,o;n=r1.pss.create(r1.md[t].create(),r,i.signatureParameters.saltLength)}return i.publicKey.verify(e.md.digest().getBytes(),e.signature,n)};function u(e){for(var r,a,o=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]),n=e.attributes,i=0;i<n.length;++i){var s=(r=n[i]).value,l=t.Type.PRINTABLESTRING;"valueTagClass"in r&&(l=r.valueTagClass)===t.Type.UTF8&&(s=r1.util.encodeUtf8(s)),a=t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.type).getBytes()),t.create(t.Class.UNIVERSAL,l,!1,s)])]),o.value.push(a)}return o}function h(e){for(var n,i=0;i<e.length;++i){if(void 0===(n=e[i]).name&&(n.type&&n.type in r.oids?n.name=r.oids[n.type]:n.shortName&&n.shortName in o&&(n.name=r.oids[o[n.shortName]])),void 0===n.type){if(!n.name||!(n.name in r.oids))throw(s=Error("Attribute type not specified.")).attribute=n,s;n.type=r.oids[n.name]}if(void 0===n.shortName&&n.name&&n.name in o&&(n.shortName=o[n.name]),n.type===a.extensionRequest&&(n.valueConstructed=!0,n.valueTagClass=t.Type.SEQUENCE,!n.value&&n.extensions)){n.value=[];for(var s,l=0;l<n.extensions.length;++l)n.value.push(r.certificateExtensionToAsn1(f(n.extensions[l])))}if(void 0===n.value)throw(s=Error("Attribute value not specified.")).attribute=n,s}}function f(e,o){if(o=o||{},void 0===e.name&&e.id&&e.id in r.oids&&(e.name=r.oids[e.id]),void 0===e.id){if(!e.name||!(e.name in r.oids))throw(n=Error("Extension ID not specified.")).extension=e,n;e.id=r.oids[e.name]}if(void 0!==e.value)return e;if("keyUsage"===e.name){var n,i=0,s=0,l=0;e.digitalSignature&&(s|=128,i=7),e.nonRepudiation&&(s|=64,i=6),e.keyEncipherment&&(s|=32,i=5),e.dataEncipherment&&(s|=16,i=4),e.keyAgreement&&(s|=8,i=3),e.keyCertSign&&(s|=4,i=2),e.cRLSign&&(s|=2,i=1),e.encipherOnly&&(s|=1,i=0),e.decipherOnly&&(l|=128,i=7);var c=String.fromCharCode(i);0!==l?c+=String.fromCharCode(s)+String.fromCharCode(l):0!==s&&(c+=String.fromCharCode(s)),e.value=t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,c)}else if("basicConstraints"===e.name)e.value=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]),e.cA&&e.value.value.push(t.create(t.Class.UNIVERSAL,t.Type.BOOLEAN,!1,String.fromCharCode(255))),"pathLenConstraint"in e&&e.value.value.push(t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(e.pathLenConstraint).getBytes()));else if("extKeyUsage"===e.name){e.value=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]);var d=e.value.value;for(var m in e)!0===e[m]&&(m in a?d.push(t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(a[m]).getBytes())):-1!==m.indexOf(".")&&d.push(t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(m).getBytes())))}else if("nsCertType"===e.name)i=0,s=0,e.client&&(s|=128,i=7),e.server&&(s|=64,i=6),e.email&&(s|=32,i=5),e.objsign&&(s|=16,i=4),e.reserved&&(s|=8,i=3),e.sslCA&&(s|=4,i=2),e.emailCA&&(s|=2,i=1),e.objCA&&(s|=1,i=0),c=String.fromCharCode(i),0!==s&&(c+=String.fromCharCode(s)),e.value=t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,c);else if("subjectAltName"===e.name||"issuerAltName"===e.name){e.value=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]);for(var p=0;p<e.altNames.length;++p){if(c=(b=e.altNames[p]).value,7===b.type&&b.ip){if(null===(c=r1.util.bytesFromIP(b.ip)))throw(n=Error('Extension "ip" value is not a valid IPv4 or IPv6 address.')).extension=e,n}else 8===b.type&&(c=t.oidToDer(b.oid?t.oidToDer(b.oid):c));e.value.value.push(t.create(t.Class.CONTEXT_SPECIFIC,b.type,!1,c))}}else if("nsComment"===e.name&&o.cert){if(!/^[\x00-\x7F]*$/.test(e.comment)||e.comment.length<1||e.comment.length>128)throw Error('Invalid "nsComment" content.');e.value=t.create(t.Class.UNIVERSAL,t.Type.IA5STRING,!1,e.comment)}else if("subjectKeyIdentifier"===e.name&&o.cert){var h=o.cert.generateSubjectKeyIdentifier();e.subjectKeyIdentifier=h.toHex(),e.value=t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,h.getBytes())}else if("authorityKeyIdentifier"===e.name&&o.cert){if(e.value=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]),d=e.value.value,e.keyIdentifier){var f=!0===e.keyIdentifier?o.cert.generateSubjectKeyIdentifier().getBytes():e.keyIdentifier;d.push(t.create(t.Class.CONTEXT_SPECIFIC,0,!1,f))}if(e.authorityCertIssuer){var y=[t.create(t.Class.CONTEXT_SPECIFIC,4,!0,[u(!0===e.authorityCertIssuer?o.cert.issuer:e.authorityCertIssuer)])];d.push(t.create(t.Class.CONTEXT_SPECIFIC,1,!0,y))}if(e.serialNumber){var g=r1.util.hexToBytes(!0===e.serialNumber?o.cert.serialNumber:e.serialNumber);d.push(t.create(t.Class.CONTEXT_SPECIFIC,2,!1,g))}}else if("cRLDistributionPoints"===e.name){e.value=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]),d=e.value.value;var b,k=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]),v=t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[]);for(p=0;p<e.altNames.length;++p){if(c=(b=e.altNames[p]).value,7===b.type&&b.ip){if(null===(c=r1.util.bytesFromIP(b.ip)))throw(n=Error('Extension "ip" value is not a valid IPv4 or IPv6 address.')).extension=e,n}else 8===b.type&&(c=t.oidToDer(b.oid?t.oidToDer(b.oid):c));v.value.push(t.create(t.Class.CONTEXT_SPECIFIC,b.type,!1,c))}k.value.push(t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[v])),d.push(k)}if(void 0===e.value)throw(n=Error("Extension value not specified.")).extension=e,n;return e}function y(e,r){if(e===a["RSASSA-PSS"]){var o=[];return void 0!==r.hash.algorithmOid&&o.push(t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.hash.algorithmOid).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")])])),void 0!==r.mgf.algorithmOid&&o.push(t.create(t.Class.CONTEXT_SPECIFIC,1,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.mgf.algorithmOid).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.mgf.hash.algorithmOid).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")])])])),void 0!==r.saltLength&&o.push(t.create(t.Class.CONTEXT_SPECIFIC,2,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(r.saltLength).getBytes())])),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,o)}return t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")}r.certificateFromPem=function(e,a,o){var n=r1.pem.decode(e)[0];if("CERTIFICATE"!==n.type&&"X509 CERTIFICATE"!==n.type&&"TRUSTED CERTIFICATE"!==n.type){var i=Error('Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".');throw i.headerType=n.type,i}if(n.procType&&"ENCRYPTED"===n.procType.type)throw Error("Could not convert certificate from PEM; PEM is encrypted.");var s=t.fromDer(n.body,o);return r.certificateFromAsn1(s,a)},r.certificateToPem=function(e,a){var o={type:"CERTIFICATE",body:t.toDer(r.certificateToAsn1(e)).getBytes()};return r1.pem.encode(o,{maxline:a})},r.publicKeyFromPem=function(e){var a=r1.pem.decode(e)[0];if("PUBLIC KEY"!==a.type&&"RSA PUBLIC KEY"!==a.type){var o=Error('Could not convert public key from PEM; PEM header type is not "PUBLIC KEY" or "RSA PUBLIC KEY".');throw o.headerType=a.type,o}if(a.procType&&"ENCRYPTED"===a.procType.type)throw Error("Could not convert public key from PEM; PEM is encrypted.");var n=t.fromDer(a.body);return r.publicKeyFromAsn1(n)},r.publicKeyToPem=function(e,a){var o={type:"PUBLIC KEY",body:t.toDer(r.publicKeyToAsn1(e)).getBytes()};return r1.pem.encode(o,{maxline:a})},r.publicKeyToRSAPublicKeyPem=function(e,a){var o={type:"RSA PUBLIC KEY",body:t.toDer(r.publicKeyToRSAPublicKey(e)).getBytes()};return r1.pem.encode(o,{maxline:a})},r.getPublicKeyFingerprint=function(e,a){var o,n=(a=a||{}).md||r1.md.sha1.create();switch(a.type||"RSAPublicKey"){case"RSAPublicKey":o=t.toDer(r.publicKeyToRSAPublicKey(e)).getBytes();break;case"SubjectPublicKeyInfo":o=t.toDer(r.publicKeyToAsn1(e)).getBytes();break;default:throw Error('Unknown fingerprint type "'+a.type+'".')}n.start(),n.update(o);var i=n.digest();if("hex"===a.encoding){var s=i.toHex();return a.delimiter?s.match(/.{2}/g).join(a.delimiter):s}if("binary"===a.encoding)return i.getBytes();if(a.encoding)throw Error('Unknown encoding "'+a.encoding+'".');return i},r.certificationRequestFromPem=function(e,a,o){var n=r1.pem.decode(e)[0];if("CERTIFICATE REQUEST"!==n.type){var i=Error('Could not convert certification request from PEM; PEM header type is not "CERTIFICATE REQUEST".');throw i.headerType=n.type,i}if(n.procType&&"ENCRYPTED"===n.procType.type)throw Error("Could not convert certification request from PEM; PEM is encrypted.");var s=t.fromDer(n.body,o);return r.certificationRequestFromAsn1(s,a)},r.certificationRequestToPem=function(e,a){var o={type:"CERTIFICATE REQUEST",body:t.toDer(r.certificationRequestToAsn1(e)).getBytes()};return r1.pem.encode(o,{maxline:a})},r.createCertificate=function(){var e={version:2,serialNumber:"00",signatureOid:null,signature:null,siginfo:{}};return e.siginfo.algorithmOid=null,e.validity={},e.validity.notBefore=new Date,e.validity.notAfter=new Date,e.issuer={},e.issuer.getField=function(t){return c(e.issuer,t)},e.issuer.addField=function(t){h([t]),e.issuer.attributes.push(t)},e.issuer.attributes=[],e.issuer.hash=null,e.subject={},e.subject.getField=function(t){return c(e.subject,t)},e.subject.addField=function(t){h([t]),e.subject.attributes.push(t)},e.subject.attributes=[],e.subject.hash=null,e.extensions=[],e.publicKey=null,e.md=null,e.setSubject=function(t,r){h(t),e.subject.attributes=t,delete e.subject.uniqueId,r&&(e.subject.uniqueId=r),e.subject.hash=null},e.setIssuer=function(t,r){h(t),e.issuer.attributes=t,delete e.issuer.uniqueId,r&&(e.issuer.uniqueId=r),e.issuer.hash=null},e.setExtensions=function(t){for(var r=0;r<t.length;++r)f(t[r],{cert:e});e.extensions=t},e.getExtension=function(t){"string"==typeof t&&(t={name:t});for(var r,a=null,o=0;null===a&&o<e.extensions.length;++o)r=e.extensions[o],(t.id&&r.id===t.id||t.name&&r.name===t.name)&&(a=r);return a},e.sign=function(o,n){e.md=n||r1.md.sha1.create();var i=a[e.md.algorithm+"WithRSAEncryption"];if(!i){var s=Error("Could not compute certificate digest. Unknown message digest algorithm OID.");throw s.algorithm=e.md.algorithm,s}e.signatureOid=e.siginfo.algorithmOid=i,e.tbsCertificate=r.getTBSCertificate(e);var l=t.toDer(e.tbsCertificate);e.md.update(l.getBytes()),e.signature=o.sign(e.md)},e.verify=function(a){var o=!1;if(!e.issued(a)){var n=a.issuer,i=e.subject,s=Error("The parent certificate did not issue the given child certificate; the child certificate's issuer does not match the parent's subject.");throw s.expectedIssuer=i.attributes,s.actualIssuer=n.attributes,s}var l=a.md;if(null===l){l=m({signatureOid:a.signatureOid,type:"certificate"});var c=a.tbsCertificate||r.getTBSCertificate(a),d=t.toDer(c);l.update(d.getBytes())}return null!==l&&(o=p({certificate:e,md:l,signature:a.signature})),o},e.isIssuer=function(t){var r,a,o=!1,n=e.issuer,i=t.subject;if(n.hash&&i.hash)o=n.hash===i.hash;else if(n.attributes.length===i.attributes.length){o=!0;for(var s=0;o&&s<n.attributes.length;++s)(r=n.attributes[s]).type===(a=i.attributes[s]).type&&r.value===a.value||(o=!1)}return o},e.issued=function(t){return t.isIssuer(e)},e.generateSubjectKeyIdentifier=function(){return r.getPublicKeyFingerprint(e.publicKey,{type:"RSAPublicKey"})},e.verifySubjectKeyIdentifier=function(){for(var t=a.subjectKeyIdentifier,r=0;r<e.extensions.length;++r){var o=e.extensions[r];if(o.id===t){var n=e.generateSubjectKeyIdentifier().getBytes();return r1.util.hexToBytes(o.subjectKeyIdentifier)===n}}return!1},e},r.certificateFromAsn1=function(e,a){var o={},n=[];if(!t.validate(e,i,o,n)){var s=Error("Cannot read X.509 certificate. ASN.1 object is not an X509v3 Certificate.");throw s.errors=n,s}if(t.derToOid(o.publicKeyOid)!==r.oids.rsaEncryption)throw Error("Cannot read public key. OID is not RSA.");var l=r.createCertificate();l.version=o.certVersion?o.certVersion.charCodeAt(0):0,l.serialNumber=r1.util.createBuffer(o.certSerialNumber).toHex(),l.signatureOid=r1.asn1.derToOid(o.certSignatureOid),l.signatureParameters=d(l.signatureOid,o.certSignatureParams,!0),l.siginfo.algorithmOid=r1.asn1.derToOid(o.certinfoSignatureOid),l.siginfo.parameters=d(l.siginfo.algorithmOid,o.certinfoSignatureParams,!1),l.signature=o.certSignature;var p=[];if(void 0!==o.certValidity1UTCTime&&p.push(t.utcTimeToDate(o.certValidity1UTCTime)),void 0!==o.certValidity2GeneralizedTime&&p.push(t.generalizedTimeToDate(o.certValidity2GeneralizedTime)),void 0!==o.certValidity3UTCTime&&p.push(t.utcTimeToDate(o.certValidity3UTCTime)),void 0!==o.certValidity4GeneralizedTime&&p.push(t.generalizedTimeToDate(o.certValidity4GeneralizedTime)),p.length>2)throw Error("Cannot read notBefore/notAfter validity times; more than two times were provided in the certificate.");if(p.length<2)throw Error("Cannot read notBefore/notAfter validity times; they were not provided as either UTCTime or GeneralizedTime.");if(l.validity.notBefore=p[0],l.validity.notAfter=p[1],l.tbsCertificate=o.tbsCertificate,a){l.md=m({signatureOid:l.signatureOid,type:"certificate"});var u=t.toDer(l.tbsCertificate);l.md.update(u.getBytes())}var f=r1.md.sha1.create(),y=t.toDer(o.certIssuer);f.update(y.getBytes()),l.issuer.getField=function(e){return c(l.issuer,e)},l.issuer.addField=function(e){h([e]),l.issuer.attributes.push(e)},l.issuer.attributes=r.RDNAttributesAsArray(o.certIssuer),o.certIssuerUniqueId&&(l.issuer.uniqueId=o.certIssuerUniqueId),l.issuer.hash=f.digest().toHex();var g=r1.md.sha1.create(),b=t.toDer(o.certSubject);return g.update(b.getBytes()),l.subject.getField=function(e){return c(l.subject,e)},l.subject.addField=function(e){h([e]),l.subject.attributes.push(e)},l.subject.attributes=r.RDNAttributesAsArray(o.certSubject),o.certSubjectUniqueId&&(l.subject.uniqueId=o.certSubjectUniqueId),l.subject.hash=g.digest().toHex(),l.extensions=o.certExtensions?r.certificateExtensionsFromAsn1(o.certExtensions):[],l.publicKey=r.publicKeyFromAsn1(o.subjectPublicKeyInfo),l},r.certificateExtensionsFromAsn1=function(e){for(var t=[],a=0;a<e.value.length;++a)for(var o=e.value[a],n=0;n<o.value.length;++n)t.push(r.certificateExtensionFromAsn1(o.value[n]));return t},r.certificateExtensionFromAsn1=function(e){var r,o={};if(o.id=t.derToOid(e.value[0].value),o.critical=!1,e.value[1].type===t.Type.BOOLEAN?(o.critical=0!==e.value[1].value.charCodeAt(0),o.value=e.value[2].value):o.value=e.value[1].value,o.id in a)if(o.name=a[o.id],"keyUsage"===o.name){var n=0,i=0;(s=t.fromDer(o.value)).value.length>1&&(n=s.value.charCodeAt(1),i=s.value.length>2?s.value.charCodeAt(2):0),o.digitalSignature=!(128&~n),o.nonRepudiation=!(64&~n),o.keyEncipherment=!(32&~n),o.dataEncipherment=!(16&~n),o.keyAgreement=!(8&~n),o.keyCertSign=!(4&~n),o.cRLSign=!(2&~n),o.encipherOnly=!(1&~n),o.decipherOnly=!(128&~i)}else if("basicConstraints"===o.name){var s=t.fromDer(o.value);o.cA=s.value.length>0&&s.value[0].type===t.Type.BOOLEAN&&0!==s.value[0].value.charCodeAt(0);var l=null;s.value.length>0&&s.value[0].type===t.Type.INTEGER?l=s.value[0].value:s.value.length>1&&(l=s.value[1].value),null!==l&&(o.pathLenConstraint=t.derToInteger(l))}else if("extKeyUsage"===o.name){s=t.fromDer(o.value);for(var c=0;c<s.value.length;++c){var d=t.derToOid(s.value[c].value);d in a?o[a[d]]=!0:o[d]=!0}}else if("nsCertType"===o.name)n=0,(s=t.fromDer(o.value)).value.length>1&&(n=s.value.charCodeAt(1)),o.client=!(128&~n),o.server=!(64&~n),o.email=!(32&~n),o.objsign=!(16&~n),o.reserved=!(8&~n),o.sslCA=!(4&~n),o.emailCA=!(2&~n),o.objCA=!(1&~n);else if("subjectAltName"===o.name||"issuerAltName"===o.name){o.altNames=[],s=t.fromDer(o.value);for(var m=0;m<s.value.length;++m){var p={type:(r=s.value[m]).type,value:r.value};switch(o.altNames.push(p),r.type){case 1:case 2:case 6:break;case 7:p.ip=r1.util.bytesToIP(r.value);break;case 8:p.oid=t.derToOid(r.value)}}}else"subjectKeyIdentifier"===o.name&&(s=t.fromDer(o.value),o.subjectKeyIdentifier=r1.util.bytesToHex(s.value));return o},r.certificationRequestFromAsn1=function(e,a){var o={},n=[];if(!t.validate(e,l,o,n)){var i=Error("Cannot read PKCS#10 certificate request. ASN.1 object is not a PKCS#10 CertificationRequest.");throw i.errors=n,i}if(t.derToOid(o.publicKeyOid)!==r.oids.rsaEncryption)throw Error("Cannot read public key. OID is not RSA.");var s=r.createCertificationRequest();if(s.version=o.csrVersion?o.csrVersion.charCodeAt(0):0,s.signatureOid=r1.asn1.derToOid(o.csrSignatureOid),s.signatureParameters=d(s.signatureOid,o.csrSignatureParams,!0),s.siginfo.algorithmOid=r1.asn1.derToOid(o.csrSignatureOid),s.siginfo.parameters=d(s.siginfo.algorithmOid,o.csrSignatureParams,!1),s.signature=o.csrSignature,s.certificationRequestInfo=o.certificationRequestInfo,a){s.md=m({signatureOid:s.signatureOid,type:"certification request"});var p=t.toDer(s.certificationRequestInfo);s.md.update(p.getBytes())}var u=r1.md.sha1.create();return s.subject.getField=function(e){return c(s.subject,e)},s.subject.addField=function(e){h([e]),s.subject.attributes.push(e)},s.subject.attributes=r.RDNAttributesAsArray(o.certificationRequestInfoSubject,u),s.subject.hash=u.digest().toHex(),s.publicKey=r.publicKeyFromAsn1(o.subjectPublicKeyInfo),s.getAttribute=function(e){return c(s,e)},s.addAttribute=function(e){h([e]),s.attributes.push(e)},s.attributes=r.CRIAttributesAsArray(o.certificationRequestInfoAttributes||[]),s},r.createCertificationRequest=function(){var e={version:0,signatureOid:null,signature:null,siginfo:{}};return e.siginfo.algorithmOid=null,e.subject={},e.subject.getField=function(t){return c(e.subject,t)},e.subject.addField=function(t){h([t]),e.subject.attributes.push(t)},e.subject.attributes=[],e.subject.hash=null,e.publicKey=null,e.attributes=[],e.getAttribute=function(t){return c(e,t)},e.addAttribute=function(t){h([t]),e.attributes.push(t)},e.md=null,e.setSubject=function(t){h(t),e.subject.attributes=t,e.subject.hash=null},e.setAttributes=function(t){h(t),e.attributes=t},e.sign=function(o,n){e.md=n||r1.md.sha1.create();var i=a[e.md.algorithm+"WithRSAEncryption"];if(!i){var s=Error("Could not compute certification request digest. Unknown message digest algorithm OID.");throw s.algorithm=e.md.algorithm,s}e.signatureOid=e.siginfo.algorithmOid=i,e.certificationRequestInfo=r.getCertificationRequestInfo(e);var l=t.toDer(e.certificationRequestInfo);e.md.update(l.getBytes()),e.signature=o.sign(e.md)},e.verify=function(){var a=!1,o=e.md;if(null===o){o=m({signatureOid:e.signatureOid,type:"certification request"});var n=e.certificationRequestInfo||r.getCertificationRequestInfo(e),i=t.toDer(n);o.update(i.getBytes())}return null!==o&&(a=p({certificate:e,md:o,signature:e.signature})),a},e};var g=new Date("1950-01-01T00:00:00Z"),b=new Date("2050-01-01T00:00:00Z");function k(e){return e>=g&&e<b?t.create(t.Class.UNIVERSAL,t.Type.UTCTIME,!1,t.dateToUtcTime(e)):t.create(t.Class.UNIVERSAL,t.Type.GENERALIZEDTIME,!1,t.dateToGeneralizedTime(e))}r.getTBSCertificate=function(e){var a=k(e.validity.notBefore),o=k(e.validity.notAfter),n=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(e.version).getBytes())]),t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,r1.util.hexToBytes(e.serialNumber)),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.siginfo.algorithmOid).getBytes()),y(e.siginfo.algorithmOid,e.siginfo.parameters)]),u(e.issuer),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[a,o]),u(e.subject),r.publicKeyToAsn1(e.publicKey)]);return e.issuer.uniqueId&&n.value.push(t.create(t.Class.CONTEXT_SPECIFIC,1,!0,[t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,"\0"+e.issuer.uniqueId)])),e.subject.uniqueId&&n.value.push(t.create(t.Class.CONTEXT_SPECIFIC,2,!0,[t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,"\0"+e.subject.uniqueId)])),e.extensions.length>0&&n.value.push(r.certificateExtensionsToAsn1(e.extensions)),n},r.getCertificationRequestInfo=function(e){return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(e.version).getBytes()),u(e.subject),r.publicKeyToAsn1(e.publicKey),function(e){var r=t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[]);if(0===e.attributes.length)return r;for(var a=e.attributes,o=0;o<a.length;++o){var n=a[o],i=n.value,s=t.Type.UTF8;"valueTagClass"in n&&(s=n.valueTagClass),s===t.Type.UTF8&&(i=r1.util.encodeUtf8(i));var l=!1;"valueConstructed"in n&&(l=n.valueConstructed);var c=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n.type).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[t.create(t.Class.UNIVERSAL,s,l,i)])]);r.value.push(c)}return r}(e)])},r.distinguishedNameToAsn1=function(e){return u(e)},r.certificateToAsn1=function(e){var a=e.tbsCertificate||r.getTBSCertificate(e);return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[a,t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.signatureOid).getBytes()),y(e.signatureOid,e.signatureParameters)]),t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,"\0"+e.signature)])},r.certificateExtensionsToAsn1=function(e){var a=t.create(t.Class.CONTEXT_SPECIFIC,3,!0,[]),o=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]);a.value.push(o);for(var n=0;n<e.length;++n)o.value.push(r.certificateExtensionToAsn1(e[n]));return a},r.certificateExtensionToAsn1=function(e){var r=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[]);r.value.push(t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.id).getBytes())),e.critical&&r.value.push(t.create(t.Class.UNIVERSAL,t.Type.BOOLEAN,!1,String.fromCharCode(255)));var a=e.value;return"string"!=typeof e.value&&(a=t.toDer(a).getBytes()),r.value.push(t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,a)),r},r.certificationRequestToAsn1=function(e){var a=e.certificationRequestInfo||r.getCertificationRequestInfo(e);return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[a,t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.signatureOid).getBytes()),y(e.signatureOid,e.signatureParameters)]),t.create(t.Class.UNIVERSAL,t.Type.BITSTRING,!1,"\0"+e.signature)])},r.createCaStore=function(e){var a={certs:{}};function o(e){return n(e),a.certs[e.hash]||null}function n(e){if(!e.hash){var t=r1.md.sha1.create();e.attributes=r.RDNAttributesAsArray(u(e),t),e.hash=t.digest().toHex()}}if(a.getIssuer=function(e){return o(e.issuer)},a.addCertificate=function(e){if("string"==typeof e&&(e=r1.pki.certificateFromPem(e)),n(e.subject),!a.hasCertificate(e))if(e.subject.hash in a.certs){var t=a.certs[e.subject.hash];r1.util.isArray(t)||(t=[t]),t.push(e),a.certs[e.subject.hash]=t}else a.certs[e.subject.hash]=e},a.hasCertificate=function(e){"string"==typeof e&&(e=r1.pki.certificateFromPem(e));var a=o(e.subject);if(!a)return!1;r1.util.isArray(a)||(a=[a]);for(var n=t.toDer(r.certificateToAsn1(e)).getBytes(),i=0;i<a.length;++i)if(n===t.toDer(r.certificateToAsn1(a[i])).getBytes())return!0;return!1},a.listAllCertificates=function(){var e=[];for(var t in a.certs)if(a.certs.hasOwnProperty(t)){var r=a.certs[t];if(r1.util.isArray(r))for(var o=0;o<r.length;++o)e.push(r[o]);else e.push(r)}return e},a.removeCertificate=function(e){if("string"==typeof e&&(e=r1.pki.certificateFromPem(e)),n(e.subject),!a.hasCertificate(e))return null;var i,s=o(e.subject);if(!r1.util.isArray(s))return i=a.certs[e.subject.hash],delete a.certs[e.subject.hash],i;for(var l=t.toDer(r.certificateToAsn1(e)).getBytes(),c=0;c<s.length;++c)l===t.toDer(r.certificateToAsn1(s[c])).getBytes()&&(i=s[c],s.splice(c,1));return 0===s.length&&delete a.certs[e.subject.hash],i},e)for(var i=0;i<e.length;++i)a.addCertificate(e[i]);return a},r.certificateError={bad_certificate:"forge.pki.BadCertificate",unsupported_certificate:"forge.pki.UnsupportedCertificate",certificate_revoked:"forge.pki.CertificateRevoked",certificate_expired:"forge.pki.CertificateExpired",certificate_unknown:"forge.pki.CertificateUnknown",unknown_ca:"forge.pki.UnknownCertificateAuthority"},r.verifyCertificateChain=function(e,t,a){"function"==typeof a&&(a={verify:a}),a=a||{};var o=(t=t.slice(0)).slice(0),n=a.validityCheckDate;void 0===n&&(n=new Date);var i=!0,s=null,l=0;do{var c=t.shift(),d=null,m=!1;if(n&&(n<c.validity.notBefore||n>c.validity.notAfter)&&(s={message:"Certificate is not valid yet or has expired.",error:r.certificateError.certificate_expired,notBefore:c.validity.notBefore,notAfter:c.validity.notAfter,now:n}),null===s){if(null===(d=t[0]||e.getIssuer(c))&&c.isIssuer(c)&&(m=!0,d=c),d){var p=d;r1.util.isArray(p)||(p=[p]);for(var u=!1;!u&&p.length>0;){d=p.shift();try{u=d.verify(c)}catch(e){}}u||(s={message:"Certificate signature is invalid.",error:r.certificateError.bad_certificate})}null!==s||d&&!m||e.hasCertificate(c)||(s={message:"Certificate is not trusted.",error:r.certificateError.unknown_ca})}if(null===s&&d&&!c.isIssuer(d)&&(s={message:"Certificate issuer is invalid.",error:r.certificateError.bad_certificate}),null===s)for(var h={keyUsage:!0,basicConstraints:!0},f=0;null===s&&f<c.extensions.length;++f){var y=c.extensions[f];!y.critical||y.name in h||(s={message:"Certificate has an unsupported critical extension.",error:r.certificateError.unsupported_certificate})}if(null===s&&(!i||0===t.length&&(!d||m))){var g=c.getExtension("basicConstraints"),b=c.getExtension("keyUsage");null!==b&&(b.keyCertSign&&null!==g||(s={message:"Certificate keyUsage or basicConstraints conflict or indicate that the certificate is not a CA. If the certificate is the only one in the chain or isn't the first then the certificate must be a valid CA.",error:r.certificateError.bad_certificate})),null!==s||null===g||g.cA||(s={message:"Certificate basicConstraints indicates the certificate is not a CA.",error:r.certificateError.bad_certificate}),null===s&&null!==b&&"pathLenConstraint"in g&&l-1>g.pathLenConstraint&&(s={message:"Certificate basicConstraints pathLenConstraint violated.",error:r.certificateError.bad_certificate})}var k=null===s||s.error,v=a.verify?a.verify(k,l,o):k;if(!0!==v)throw!0===k&&(s={message:"The application rejected the certificate.",error:r.certificateError.bad_certificate}),(v||0===v)&&("object"!=typeof v||r1.util.isArray(v)?"string"==typeof v&&(s.error=v):(v.message&&(s.message=v.message),v.error&&(s.error=v.error))),s;s=null,i=!1,++l}while(t.length>0)return!0}}),r5(function(e){var t=r1.asn1,r=r1.pki,a=e.exports=r1.pkcs12=r1.pkcs12||{},o={name:"ContentInfo",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"ContentInfo.contentType",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"contentType"},{name:"ContentInfo.content",tagClass:t.Class.CONTEXT_SPECIFIC,constructed:!0,captureAsn1:"content"}]},n={name:"PFX",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"PFX.version",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,capture:"version"},o,{name:"PFX.macData",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,optional:!0,captureAsn1:"mac",value:[{name:"PFX.macData.mac",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"PFX.macData.mac.digestAlgorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"PFX.macData.mac.digestAlgorithm.algorithm",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"macAlgorithm"},{name:"PFX.macData.mac.digestAlgorithm.parameters",tagClass:t.Class.UNIVERSAL,captureAsn1:"macAlgorithmParameters"}]},{name:"PFX.macData.mac.digest",tagClass:t.Class.UNIVERSAL,type:t.Type.OCTETSTRING,constructed:!1,capture:"macDigest"}]},{name:"PFX.macData.macSalt",tagClass:t.Class.UNIVERSAL,type:t.Type.OCTETSTRING,constructed:!1,capture:"macSalt"},{name:"PFX.macData.iterations",tagClass:t.Class.UNIVERSAL,type:t.Type.INTEGER,constructed:!1,optional:!0,capture:"macIterations"}]}]},i={name:"SafeBag",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"SafeBag.bagId",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"bagId"},{name:"SafeBag.bagValue",tagClass:t.Class.CONTEXT_SPECIFIC,constructed:!0,captureAsn1:"bagValue"},{name:"SafeBag.bagAttributes",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0,optional:!0,capture:"bagAttributes"}]},s={name:"Attribute",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"Attribute.attrId",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"oid"},{name:"Attribute.attrValues",tagClass:t.Class.UNIVERSAL,type:t.Type.SET,constructed:!0,capture:"values"}]},l={name:"CertBag",tagClass:t.Class.UNIVERSAL,type:t.Type.SEQUENCE,constructed:!0,value:[{name:"CertBag.certId",tagClass:t.Class.UNIVERSAL,type:t.Type.OID,constructed:!1,capture:"certId"},{name:"CertBag.certValue",tagClass:t.Class.CONTEXT_SPECIFIC,constructed:!0,value:[{name:"CertBag.certValue[0]",tagClass:t.Class.UNIVERSAL,type:t.Class.OCTETSTRING,constructed:!1,capture:"cert"}]}]};function c(e,t,r,a){for(var o=[],n=0;n<e.length;n++)for(var i=0;i<e[n].safeBags.length;i++){var s=e[n].safeBags[i];void 0!==a&&s.type!==a||(null!==t?void 0!==s.attributes[t]&&s.attributes[t].indexOf(r)>=0&&o.push(s):o.push(s))}return o}function d(e){if(e.composed||e.constructed){for(var t=r1.util.createBuffer(),r=0;r<e.value.length;++r)t.putBytes(e.value[r].value);e.composed=e.constructed=!1,e.value=t.getBytes()}return e}a.pkcs12FromAsn1=function(e,m,p){"string"==typeof m?(p=m,m=!0):void 0===m&&(m=!0);var u={};if(!t.validate(e,n,u,[]))throw(h=Error("Cannot read PKCS#12 PFX. ASN.1 object is not an PKCS#12 PFX.")).errors=h,h;var h,f={version:u.version.charCodeAt(0),safeContents:[],getBags:function(e){var t,r={};return"localKeyId"in e?t=e.localKeyId:"localKeyIdHex"in e&&(t=r1.util.hexToBytes(e.localKeyIdHex)),void 0===t&&!("friendlyName"in e)&&"bagType"in e&&(r[e.bagType]=c(f.safeContents,null,null,e.bagType)),void 0!==t&&(r.localKeyId=c(f.safeContents,"localKeyId",t,e.bagType)),"friendlyName"in e&&(r.friendlyName=c(f.safeContents,"friendlyName",e.friendlyName,e.bagType)),r},getBagsByFriendlyName:function(e,t){return c(f.safeContents,"friendlyName",e,t)},getBagsByLocalKeyId:function(e,t){return c(f.safeContents,"localKeyId",e,t)}};if(3!==u.version.charCodeAt(0))throw(h=Error("PKCS#12 PFX of version other than 3 not supported.")).version=u.version.charCodeAt(0),h;if(t.derToOid(u.contentType)!==r.oids.data)throw(h=Error("Only PKCS#12 PFX in password integrity mode supported.")).oid=t.derToOid(u.contentType),h;var y=u.content.value[0];if(y.tagClass!==t.Class.UNIVERSAL||y.type!==t.Type.OCTETSTRING)throw Error("PKCS#12 authSafe content data is not an OCTET STRING.");if(y=d(y),u.mac){var g=null,b=0,k=t.derToOid(u.macAlgorithm);switch(k){case r.oids.sha1:g=r1.md.sha1.create(),b=20;break;case r.oids.sha256:g=r1.md.sha256.create(),b=32;break;case r.oids.sha384:g=r1.md.sha384.create(),b=48;break;case r.oids.sha512:g=r1.md.sha512.create(),b=64;break;case r.oids.md5:g=r1.md.md5.create(),b=16}if(null===g)throw Error("PKCS#12 uses unsupported MAC algorithm: "+k);var v=new r1.util.ByteBuffer(u.macSalt),x="macIterations"in u?parseInt(r1.util.bytesToHex(u.macIterations),16):1,z=a.generateKey(p,v,3,x,b,g),C=r1.hmac.create();if(C.start(g,z),C.update(y.value),C.getMac().getBytes()!==u.macDigest)throw Error("PKCS#12 MAC could not be verified. Invalid password?")}return function(e,a,n,c){if((a=t.fromDer(a,n)).tagClass!==t.Class.UNIVERSAL||a.type!==t.Type.SEQUENCE||!0!==a.constructed)throw Error("PKCS#12 AuthenticatedSafe expected to be a SEQUENCE OF ContentInfo");for(var m=0;m<a.value.length;m++){var p,u={},h=[];if(!t.validate(a.value[m],o,u,h))throw(p=Error("Cannot read ContentInfo.")).errors=h,p;var f={encrypted:!1},y=null,g=u.content.value[0];switch(t.derToOid(u.contentType)){case r.oids.data:if(g.tagClass!==t.Class.UNIVERSAL||g.type!==t.Type.OCTETSTRING)throw Error("PKCS#12 SafeContents Data is not an OCTET STRING.");y=d(g).value;break;case r.oids.encryptedData:y=function(e,a){var o={},n=[];if(!t.validate(e,r1.pkcs7.asn1.encryptedDataValidator,o,n))throw(i=Error("Cannot read EncryptedContentInfo.")).errors=n,i;var i,s=t.derToOid(o.contentType);if(s!==r.oids.data)throw(i=Error("PKCS#12 EncryptedContentInfo ContentType is not Data.")).oid=s,i;s=t.derToOid(o.encAlgorithm);var l=r.pbe.getCipher(s,o.encParameter,a),c=d(o.encryptedContentAsn1),m=r1.util.createBuffer(c.value);if(l.update(m),!l.finish())throw Error("Failed to decrypt PKCS#12 SafeContents.");return l.output.getBytes()}(g,c),f.encrypted=!0;break;default:throw(p=Error("Unsupported PKCS#12 contentType.")).contentType=t.derToOid(u.contentType),p}f.safeBags=function(e,a,o){if(!a&&0===e.length)return[];if((e=t.fromDer(e,a)).tagClass!==t.Class.UNIVERSAL||e.type!==t.Type.SEQUENCE||!0!==e.constructed)throw Error("PKCS#12 SafeContents expected to be a SEQUENCE OF SafeBag.");for(var n=[],c=0;c<e.value.length;c++){var d,m={},p=[];if(!t.validate(e.value[c],i,m,p))throw(d=Error("Cannot read SafeBag.")).errors=p,d;var u,h,f={type:t.derToOid(m.bagId),attributes:function(e){var a={};if(void 0!==e)for(var o=0;o<e.length;++o){var n={},i=[];if(!t.validate(e[o],s,n,i)){var l=Error("Cannot read PKCS#12 BagAttribute.");throw l.errors=i,l}var c=t.derToOid(n.oid);if(void 0!==r.oids[c]){a[r.oids[c]]=[];for(var d=0;d<n.values.length;++d)a[r.oids[c]].push(n.values[d].value)}}return a}(m.bagAttributes)};n.push(f);var y=m.bagValue.value[0];switch(f.type){case r.oids.pkcs8ShroudedKeyBag:if(null===(y=r.decryptPrivateKeyInfo(y,o)))throw Error("Unable to decrypt PKCS#8 ShroudedKeyBag, wrong password?");case r.oids.keyBag:try{f.key=r.privateKeyFromAsn1(y)}catch(e){f.key=null,f.asn1=y}continue;case r.oids.certBag:u=l,h=function(){if(t.derToOid(m.certId)!==r.oids.x509Certificate){var e=Error("Unsupported certificate type, only X.509 supported.");throw e.oid=t.derToOid(m.certId),e}var o=t.fromDer(m.cert,a);try{f.cert=r.certificateFromAsn1(o,!0)}catch(e){f.cert=null,f.asn1=o}};break;default:throw(d=Error("Unsupported PKCS#12 SafeBag type.")).oid=f.type,d}if(void 0!==u&&!t.validate(y,u,m,p))throw(d=Error("Cannot read PKCS#12 "+u.name)).errors=p,d;h()}return n}(y,n,c),e.safeContents.push(f)}}(f,y.value,m,p),f},a.toPkcs12Asn1=function(e,o,n,i){(i=i||{}).saltSize=i.saltSize||8,i.count=i.count||2048,i.algorithm=i.algorithm||i.encAlgorithm||"aes128","useMac"in i||(i.useMac=!0),"localKeyId"in i||(i.localKeyId=null),"generateLocalKeyId"in i||(i.generateLocalKeyId=!0);var s,l=i.localKeyId;if(null!==l)l=r1.util.hexToBytes(l);else if(i.generateLocalKeyId)if(o){var c=r1.util.isArray(o)?o[0]:o;"string"==typeof c&&(c=r.certificateFromPem(c)),(_=r1.md.sha1.create()).update(t.toDer(r.certificateToAsn1(c)).getBytes()),l=_.digest().getBytes()}else l=r1.random.getBytes(20);var d=[];null!==l&&d.push(t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.localKeyId).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,l)])])),"friendlyName"in i&&d.push(t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.friendlyName).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[t.create(t.Class.UNIVERSAL,t.Type.BMPSTRING,!1,i.friendlyName)])])),d.length>0&&(s=t.create(t.Class.UNIVERSAL,t.Type.SET,!0,d));var m=[],p=[];null!==o&&(p=r1.util.isArray(o)?o:[o]);for(var u=[],h=0;h<p.length;++h){"string"==typeof(o=p[h])&&(o=r.certificateFromPem(o));var f=0===h?s:void 0,y=r.certificateToAsn1(o),g=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.certBag).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.x509Certificate).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,t.toDer(y).getBytes())])])]),f]);u.push(g)}if(u.length>0){var b=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,u),k=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.data).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,t.toDer(b).getBytes())])]);m.push(k)}var v=null;if(null!==e){var x=r.wrapRsaPrivateKey(r.privateKeyToAsn1(e));v=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,null===n?[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.keyBag).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[x]),s]:[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.pkcs8ShroudedKeyBag).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[r.encryptPrivateKeyInfo(x,n,i)]),s]);var z=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[v]),C=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.data).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,t.toDer(z).getBytes())])]);m.push(C)}var w,S=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,m);if(i.useMac){var _=r1.md.sha1.create(),E=new r1.util.ByteBuffer(r1.random.getBytes(i.saltSize)),N=i.count,I=(e=a.generateKey(n,E,3,N,20),r1.hmac.create());I.start(_,e),I.update(t.toDer(S).getBytes());var T=I.getMac();w=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.sha1).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")]),t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,T.getBytes())]),t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,E.getBytes()),t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(N).getBytes())])}return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(3).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.oids.data).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,t.toDer(S).getBytes())])]),w])},a.generateKey=r1.pbe.generatePkcs12Key}),r5(function(e){var t=r1.asn1,r=e.exports=r1.pki=r1.pki||{};r.pemToDer=function(e){var t=r1.pem.decode(e)[0];if(t.procType&&"ENCRYPTED"===t.procType.type)throw Error("Could not convert PEM to DER; PEM is encrypted.");return r1.util.createBuffer(t.body)},r.privateKeyFromPem=function(e){var a=r1.pem.decode(e)[0];if("PRIVATE KEY"!==a.type&&"RSA PRIVATE KEY"!==a.type){var o=Error('Could not convert private key from PEM; PEM header type is not "PRIVATE KEY" or "RSA PRIVATE KEY".');throw o.headerType=a.type,o}if(a.procType&&"ENCRYPTED"===a.procType.type)throw Error("Could not convert private key from PEM; PEM is encrypted.");var n=t.fromDer(a.body);return r.privateKeyFromAsn1(n)},r.privateKeyToPem=function(e,a){var o={type:"RSA PRIVATE KEY",body:t.toDer(r.privateKeyToAsn1(e)).getBytes()};return r1.pem.encode(o,{maxline:a})},r.privateKeyInfoToPem=function(e,r){var a={type:"PRIVATE KEY",body:t.toDer(e).getBytes()};return r1.pem.encode(a,{maxline:r})}});var ob=function(e,t,r,a){var o=r1.util.createBuffer(),n=e.length>>1,i=n+(1&e.length),s=e.substr(0,i),l=e.substr(n,i),c=r1.util.createBuffer(),d=r1.hmac.create();r=t+r;var m=Math.ceil(a/16),p=Math.ceil(a/20);d.start("MD5",s);var u=r1.util.createBuffer();c.putBytes(r);for(var h=0;h<m;++h)d.start(null,null),d.update(c.getBytes()),c.putBuffer(d.digest()),d.start(null,null),d.update(c.bytes()+r),u.putBuffer(d.digest());d.start("SHA1",l);var f=r1.util.createBuffer();for(c.clear(),c.putBytes(r),h=0;h<p;++h)d.start(null,null),d.update(c.getBytes()),c.putBuffer(d.digest()),d.start(null,null),d.update(c.bytes()+r),f.putBuffer(d.digest());return o.putBytes(r1.util.xorBytes(u.getBytes(),f.getBytes(),a)),o},ok=function(e,t,r){var a=!1;try{var o=e.deflate(t.fragment.getBytes());t.fragment=r1.util.createBuffer(o),t.length=o.length,a=!0}catch(e){}return a},ov=function(e,t,r){var a=!1;try{var o=e.inflate(t.fragment.getBytes());t.fragment=r1.util.createBuffer(o),t.length=o.length,a=!0}catch(e){}return a},ox=function(e,t){var r=0;switch(t){case 1:r=e.getByte();break;case 2:r=e.getInt16();break;case 3:r=e.getInt24();break;case 4:r=e.getInt32()}return r1.util.createBuffer(e.getBytes(r))},oz=function(e,t,r){e.putInt(r.length(),t<<3),e.putBuffer(r)},oC={Versions:{TLS_1_0:{major:3,minor:1},TLS_1_1:{major:3,minor:2},TLS_1_2:{major:3,minor:3}}};oC.SupportedVersions=[oC.Versions.TLS_1_1,oC.Versions.TLS_1_0],oC.Version=oC.SupportedVersions[0],oC.MaxFragment=15360,oC.ConnectionEnd={server:0,client:1},oC.PRFAlgorithm={tls_prf_sha256:0},oC.BulkCipherAlgorithm={none:null,rc4:0,des3:1,aes:2},oC.CipherType={stream:0,block:1,aead:2},oC.MACAlgorithm={none:null,hmac_md5:0,hmac_sha1:1,hmac_sha256:2,hmac_sha384:3,hmac_sha512:4},oC.CompressionMethod={none:0,deflate:1},oC.ContentType={change_cipher_spec:20,alert:21,handshake:22,application_data:23,heartbeat:24},oC.HandshakeType={hello_request:0,client_hello:1,server_hello:2,certificate:11,server_key_exchange:12,certificate_request:13,server_hello_done:14,certificate_verify:15,client_key_exchange:16,finished:20},oC.Alert={},oC.Alert.Level={warning:1,fatal:2},oC.Alert.Description={close_notify:0,unexpected_message:10,bad_record_mac:20,decryption_failed:21,record_overflow:22,decompression_failure:30,handshake_failure:40,bad_certificate:42,unsupported_certificate:43,certificate_revoked:44,certificate_expired:45,certificate_unknown:46,illegal_parameter:47,unknown_ca:48,access_denied:49,decode_error:50,decrypt_error:51,export_restriction:60,protocol_version:70,insufficient_security:71,internal_error:80,user_canceled:90,no_renegotiation:100},oC.HeartbeatMessageType={heartbeat_request:1,heartbeat_response:2},oC.CipherSuites={},oC.getCipherSuite=function(e){var t=null;for(var r in oC.CipherSuites){var a=oC.CipherSuites[r];if(a.id[0]===e.charCodeAt(0)&&a.id[1]===e.charCodeAt(1)){t=a;break}}return t},oC.handleUnexpected=function(e,t){(e.open||e.entity!==oC.ConnectionEnd.client)&&e.error(e,{message:"Unexpected message. Received TLS record out of order.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.unexpected_message}})},oC.handleHelloRequest=function(e,t,r){!e.handshaking&&e.handshakes>0&&(oC.queue(e,oC.createAlert(e,{level:oC.Alert.Level.warning,description:oC.Alert.Description.no_renegotiation})),oC.flush(e)),e.process()},oC.parseHelloMessage=function(e,t,r){var a=null,o=e.entity===oC.ConnectionEnd.client;if(r<38)e.error(e,{message:o?"Invalid ServerHello message. Message too short.":"Invalid ClientHello message. Message too short.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.illegal_parameter}});else{var n=t.fragment,i=n.length();if(a={version:{major:n.getByte(),minor:n.getByte()},random:r1.util.createBuffer(n.getBytes(32)),session_id:ox(n,1),extensions:[]},o?(a.cipher_suite=n.getBytes(2),a.compression_method=n.getByte()):(a.cipher_suites=ox(n,2),a.compression_methods=ox(n,1)),(i=r-(i-n.length()))>0){for(var s=ox(n,2);s.length()>0;)a.extensions.push({type:[s.getByte(),s.getByte()],data:ox(s,2)});if(!o)for(var l=0;l<a.extensions.length;++l){var c=a.extensions[l];if(0===c.type[0]&&0===c.type[1])for(var d=ox(c.data,2);d.length()>0&&0===d.getByte();)e.session.extensions.server_name.serverNameList.push(ox(d,2).getBytes())}}if(e.session.version&&(a.version.major!==e.session.version.major||a.version.minor!==e.session.version.minor))return e.error(e,{message:"TLS version change is disallowed during renegotiation.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.protocol_version}});if(o)e.session.cipherSuite=oC.getCipherSuite(a.cipher_suite);else for(var m=r1.util.createBuffer(a.cipher_suites.bytes());m.length()>0&&(e.session.cipherSuite=oC.getCipherSuite(m.getBytes(2)),null===e.session.cipherSuite););if(null===e.session.cipherSuite)return e.error(e,{message:"No cipher suites in common.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.handshake_failure},cipherSuite:r1.util.bytesToHex(a.cipher_suite)});e.session.compressionMethod=o?a.compression_method:oC.CompressionMethod.none}return a},oC.createSecurityParameters=function(e,t){var r=e.entity===oC.ConnectionEnd.client,a=t.random.bytes(),o=r?e.session.sp.client_random:a,n=r?a:oC.createRandom().getBytes();e.session.sp={entity:e.entity,prf_algorithm:oC.PRFAlgorithm.tls_prf_sha256,bulk_cipher_algorithm:null,cipher_type:null,enc_key_length:null,block_length:null,fixed_iv_length:null,record_iv_length:null,mac_algorithm:null,mac_length:null,mac_key_length:null,compression_algorithm:e.session.compressionMethod,pre_master_secret:null,master_secret:null,client_random:o,server_random:n}},oC.handleServerHello=function(e,t,r){var a=oC.parseHelloMessage(e,t,r);if(!e.fail){if(!(a.version.minor<=e.version.minor))return e.error(e,{message:"Incompatible TLS version.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.protocol_version}});e.version.minor=a.version.minor,e.session.version=e.version;var o=a.session_id.bytes();o.length>0&&o===e.session.id?(e.expect=oN,e.session.resuming=!0,e.session.sp.server_random=a.random.bytes()):(e.expect=ow,e.session.resuming=!1,oC.createSecurityParameters(e,a)),e.session.id=o,e.process()}},oC.handleClientHello=function(e,t,r){var a=oC.parseHelloMessage(e,t,r);if(!e.fail){var o=a.session_id.bytes(),n=null;if(e.sessionCache&&(null===(n=e.sessionCache.getSession(o))?o="":(n.version.major!==a.version.major||n.version.minor>a.version.minor)&&(n=null,o="")),0===o.length&&(o=r1.random.getBytes(32)),e.session.id=o,e.session.clientHelloVersion=a.version,e.session.sp={},n)e.version=e.session.version=n.version,e.session.sp=n.sp;else{for(var i,s=1;s<oC.SupportedVersions.length&&!((i=oC.SupportedVersions[s]).minor<=a.version.minor);++s);e.version={major:i.major,minor:i.minor},e.session.version=e.version}null!==n?(e.expect=oR,e.session.resuming=!0,e.session.sp.client_random=a.random.bytes()):(e.expect=!1!==e.verifyClient?oj:oP,e.session.resuming=!1,oC.createSecurityParameters(e,a)),e.open=!0,oC.queue(e,oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createServerHello(e)})),e.session.resuming?(oC.queue(e,oC.createRecord(e,{type:oC.ContentType.change_cipher_spec,data:oC.createChangeCipherSpec()})),e.state.pending=oC.createConnectionState(e),e.state.current.write=e.state.pending.write,oC.queue(e,oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createFinished(e)}))):(oC.queue(e,oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createCertificate(e)})),e.fail||(oC.queue(e,oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createServerKeyExchange(e)})),!1!==e.verifyClient&&oC.queue(e,oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createCertificateRequest(e)})),oC.queue(e,oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createServerHelloDone(e)})))),oC.flush(e),e.process()}},oC.handleCertificate=function(e,t,r){if(r<3)return e.error(e,{message:"Invalid Certificate message. Message too short.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.illegal_parameter}});var a,o,n={certificate_list:ox(t.fragment,3)},i=[];try{for(;n.certificate_list.length()>0;)a=ox(n.certificate_list,3),o=r1.asn1.fromDer(a),a=r1.pki.certificateFromAsn1(o,!0),i.push(a)}catch(t){return e.error(e,{message:"Could not parse certificate list.",cause:t,send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.bad_certificate}})}var s=e.entity===oC.ConnectionEnd.client;(s||!0===e.verifyClient)&&0===i.length?e.error(e,{message:s?"No server certificate provided.":"No client certificate provided.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.illegal_parameter}}):0===i.length?e.expect=s?oS:oP:(s?e.session.serverCertificate=i[0]:e.session.clientCertificate=i[0],oC.verifyCertificateChain(e,i)&&(e.expect=s?oS:oP)),e.process()},oC.handleServerKeyExchange=function(e,t,r){if(r>0)return e.error(e,{message:"Invalid key parameters. Only RSA is supported.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.unsupported_certificate}});e.expect=o_,e.process()},oC.handleClientKeyExchange=function(e,t,r){if(r<48)return e.error(e,{message:"Invalid key parameters. Only RSA is supported.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.unsupported_certificate}});var a={enc_pre_master_secret:ox(t.fragment,2).getBytes()},o=null;if(e.getPrivateKey)try{o=e.getPrivateKey(e,e.session.serverCertificate),o=r1.pki.privateKeyFromPem(o)}catch(t){e.error(e,{message:"Could not get private key.",cause:t,send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.internal_error}})}if(null===o)return e.error(e,{message:"No private key set.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.internal_error}});try{var n=e.session.sp;n.pre_master_secret=o.decrypt(a.enc_pre_master_secret);var i=e.session.clientHelloVersion;if(i.major!==n.pre_master_secret.charCodeAt(0)||i.minor!==n.pre_master_secret.charCodeAt(1))throw Error("TLS version rollback attack detected.")}catch(e){n.pre_master_secret=r1.random.getBytes(48)}e.expect=oR,null!==e.session.clientCertificate&&(e.expect=oB),e.process()},oC.handleCertificateRequest=function(e,t,r){if(r<3)return e.error(e,{message:"Invalid CertificateRequest. Message too short.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.illegal_parameter}});var a=t.fragment,o={certificate_types:ox(a,1),certificate_authorities:ox(a,2)};e.session.certificateRequest=o,e.expect=oE,e.process()},oC.handleCertificateVerify=function(e,t,r){if(r<2)return e.error(e,{message:"Invalid CertificateVerify. Message too short.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.illegal_parameter}});var a=t.fragment;a.read-=4;var o=a.bytes();a.read+=4;var n={signature:ox(a,2).getBytes()},i=r1.util.createBuffer();i.putBuffer(e.session.md5.digest()),i.putBuffer(e.session.sha1.digest()),i=i.getBytes();try{if(!e.session.clientCertificate.publicKey.verify(i,n.signature,"NONE"))throw Error("CertificateVerify signature does not match.");e.session.md5.update(o),e.session.sha1.update(o)}catch(t){return e.error(e,{message:"Bad signature in CertificateVerify.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.handshake_failure}})}e.expect=oR,e.process()},oC.handleServerHelloDone=function(e,t,r){if(r>0)return e.error(e,{message:"Invalid ServerHelloDone message. Invalid length.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.record_overflow}});if(null===e.serverCertificate){var a={message:"No server certificate provided. Not enough security.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.insufficient_security}},o=e.verify(e,a.alert.description,0,[]);if(!0!==o)return(o||0===o)&&("object"!=typeof o||r1.util.isArray(o)?"number"==typeof o&&(a.alert.description=o):(o.message&&(a.message=o.message),o.alert&&(a.alert.description=o.alert))),e.error(e,a)}null!==e.session.certificateRequest&&(t=oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createCertificate(e)}),oC.queue(e,t)),t=oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createClientKeyExchange(e)}),oC.queue(e,t),e.expect=oA;var n=function(e,t){null!==e.session.certificateRequest&&null!==e.session.clientCertificate&&oC.queue(e,oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createCertificateVerify(e,t)})),oC.queue(e,oC.createRecord(e,{type:oC.ContentType.change_cipher_spec,data:oC.createChangeCipherSpec()})),e.state.pending=oC.createConnectionState(e),e.state.current.write=e.state.pending.write,oC.queue(e,oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createFinished(e)})),e.expect=oN,oC.flush(e),e.process()};if(null===e.session.certificateRequest||null===e.session.clientCertificate)return n(e,null);oC.getClientSignature(e,n)},oC.handleChangeCipherSpec=function(e,t){if(1!==t.fragment.getByte())return e.error(e,{message:"Invalid ChangeCipherSpec message received.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.illegal_parameter}});var r=e.entity===oC.ConnectionEnd.client;(e.session.resuming&&r||!e.session.resuming&&!r)&&(e.state.pending=oC.createConnectionState(e)),e.state.current.read=e.state.pending.read,(!e.session.resuming&&r||e.session.resuming&&!r)&&(e.state.pending=null),e.expect=r?oI:oO,e.process()},oC.handleFinished=function(e,t,r){var a=t.fragment;a.read-=4;var o=a.bytes();a.read+=4;var n=t.fragment.getBytes();(a=r1.util.createBuffer()).putBuffer(e.session.md5.digest()),a.putBuffer(e.session.sha1.digest());var i=e.entity===oC.ConnectionEnd.client;if((a=ob(e.session.sp.master_secret,i?"server finished":"client finished",a.getBytes(),12)).getBytes()!==n)return e.error(e,{message:"Invalid verify_data in Finished message.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.decrypt_error}});e.session.md5.update(o),e.session.sha1.update(o),(e.session.resuming&&i||!e.session.resuming&&!i)&&(oC.queue(e,oC.createRecord(e,{type:oC.ContentType.change_cipher_spec,data:oC.createChangeCipherSpec()})),e.state.current.write=e.state.pending.write,e.state.pending=null,oC.queue(e,oC.createRecord(e,{type:oC.ContentType.handshake,data:oC.createFinished(e)}))),e.expect=i?oT:oL,e.handshaking=!1,++e.handshakes,e.peerCertificate=i?e.session.serverCertificate:e.session.clientCertificate,oC.flush(e),e.isConnected=!0,e.connected(e),e.process()},oC.handleAlert=function(e,t){var r,a=t.fragment,o={level:a.getByte(),description:a.getByte()};switch(o.description){case oC.Alert.Description.close_notify:r="Connection closed.";break;case oC.Alert.Description.unexpected_message:r="Unexpected message.";break;case oC.Alert.Description.bad_record_mac:r="Bad record MAC.";break;case oC.Alert.Description.decryption_failed:r="Decryption failed.";break;case oC.Alert.Description.record_overflow:r="Record overflow.";break;case oC.Alert.Description.decompression_failure:r="Decompression failed.";break;case oC.Alert.Description.handshake_failure:r="Handshake failure.";break;case oC.Alert.Description.bad_certificate:r="Bad certificate.";break;case oC.Alert.Description.unsupported_certificate:r="Unsupported certificate.";break;case oC.Alert.Description.certificate_revoked:r="Certificate revoked.";break;case oC.Alert.Description.certificate_expired:r="Certificate expired.";break;case oC.Alert.Description.certificate_unknown:r="Certificate unknown.";break;case oC.Alert.Description.illegal_parameter:r="Illegal parameter.";break;case oC.Alert.Description.unknown_ca:r="Unknown certificate authority.";break;case oC.Alert.Description.access_denied:r="Access denied.";break;case oC.Alert.Description.decode_error:r="Decode error.";break;case oC.Alert.Description.decrypt_error:r="Decrypt error.";break;case oC.Alert.Description.export_restriction:r="Export restriction.";break;case oC.Alert.Description.protocol_version:r="Unsupported protocol version.";break;case oC.Alert.Description.insufficient_security:r="Insufficient security.";break;case oC.Alert.Description.internal_error:r="Internal error.";break;case oC.Alert.Description.user_canceled:r="User canceled.";break;case oC.Alert.Description.no_renegotiation:r="Renegotiation not supported.";break;default:r="Unknown error."}if(o.description===oC.Alert.Description.close_notify)return e.close();e.error(e,{message:r,send:!1,origin:e.entity===oC.ConnectionEnd.client?"server":"client",alert:o}),e.process()},oC.handleHandshake=function(e,t){var r=t.fragment,a=r.getByte(),o=r.getInt24();if(o>r.length())return e.fragmented=t,t.fragment=r1.util.createBuffer(),r.read-=4,e.process();e.fragmented=null,r.read-=4;var n=r.bytes(o+4);r.read+=4,a in oX[e.entity][e.expect]?(e.entity!==oC.ConnectionEnd.server||e.open||e.fail||(e.handshaking=!0,e.session={version:null,extensions:{server_name:{serverNameList:[]}},cipherSuite:null,compressionMethod:null,serverCertificate:null,clientCertificate:null,md5:r1.md.md5.create(),sha1:r1.md.sha1.create()}),a!==oC.HandshakeType.hello_request&&a!==oC.HandshakeType.certificate_verify&&a!==oC.HandshakeType.finished&&(e.session.md5.update(n),e.session.sha1.update(n)),oX[e.entity][e.expect][a](e,t,o)):oC.handleUnexpected(e,t)},oC.handleApplicationData=function(e,t){e.data.putBuffer(t.fragment),e.dataReady(e),e.process()},oC.handleHeartbeat=function(e,t){var r=t.fragment,a=r.getByte(),o=r.getInt16(),n=r.getBytes(o);if(a===oC.HeartbeatMessageType.heartbeat_request){if(e.handshaking||o>n.length)return e.process();oC.queue(e,oC.createRecord(e,{type:oC.ContentType.heartbeat,data:oC.createHeartbeat(oC.HeartbeatMessageType.heartbeat_response,n)})),oC.flush(e)}else if(a===oC.HeartbeatMessageType.heartbeat_response){if(n!==e.expectedHeartbeatPayload)return e.process();e.heartbeatReceived&&e.heartbeatReceived(e,r1.util.createBuffer(n))}e.process()};var ow=1,oS=2,o_=3,oE=4,oN=5,oI=6,oT=7,oA=8,oj=1,oP=2,oB=3,oR=4,oO=5,oL=6,oD=oC.handleUnexpected,oU=oC.handleChangeCipherSpec,oM=oC.handleAlert,oF=oC.handleHandshake,oV=oC.handleApplicationData,oK=oC.handleHeartbeat,oq=[];oq[oC.ConnectionEnd.client]=[[oD,oM,oF,oD,oK],[oD,oM,oF,oD,oK],[oD,oM,oF,oD,oK],[oD,oM,oF,oD,oK],[oD,oM,oF,oD,oK],[oU,oM,oD,oD,oK],[oD,oM,oF,oD,oK],[oD,oM,oF,oV,oK],[oD,oM,oF,oD,oK]],oq[oC.ConnectionEnd.server]=[[oD,oM,oF,oD,oK],[oD,oM,oF,oD,oK],[oD,oM,oF,oD,oK],[oD,oM,oF,oD,oK],[oU,oM,oD,oD,oK],[oD,oM,oF,oD,oK],[oD,oM,oF,oV,oK],[oD,oM,oF,oD,oK]];var oH=oC.handleHelloRequest,oG=oC.handleCertificate,o$=oC.handleServerKeyExchange,oW=oC.handleCertificateRequest,oY=oC.handleServerHelloDone,oQ=oC.handleFinished,oX=[];oX[oC.ConnectionEnd.client]=[[oD,oD,oC.handleServerHello,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD],[oH,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oG,o$,oW,oY,oD,oD,oD,oD,oD,oD],[oH,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,o$,oW,oY,oD,oD,oD,oD,oD,oD],[oH,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oW,oY,oD,oD,oD,oD,oD,oD],[oH,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oY,oD,oD,oD,oD,oD,oD],[oH,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD],[oH,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oQ],[oH,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD],[oH,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD]],oX[oC.ConnectionEnd.server]=[[oD,oC.handleClientHello,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD],[oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oG,oD,oD,oD,oD,oD,oD,oD,oD,oD],[oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oC.handleClientKeyExchange,oD,oD,oD,oD],[oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oC.handleCertificateVerify,oD,oD,oD,oD,oD],[oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD],[oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oQ],[oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD],[oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD,oD]],oC.generateKeys=function(e,t){var r=t.client_random+t.server_random;e.session.resuming||(t.master_secret=ob(t.pre_master_secret,"master secret",r,48).bytes(),t.pre_master_secret=null);var a=2*t.mac_key_length+2*t.enc_key_length,o=e.version.major===oC.Versions.TLS_1_0.major&&e.version.minor===oC.Versions.TLS_1_0.minor;o&&(a+=2*t.fixed_iv_length);var n=ob(t.master_secret,"key expansion",r=t.server_random+t.client_random,a),i={client_write_MAC_key:n.getBytes(t.mac_key_length),server_write_MAC_key:n.getBytes(t.mac_key_length),client_write_key:n.getBytes(t.enc_key_length),server_write_key:n.getBytes(t.enc_key_length)};return o&&(i.client_write_IV=n.getBytes(t.fixed_iv_length),i.server_write_IV=n.getBytes(t.fixed_iv_length)),i},oC.createConnectionState=function(e){var t=e.entity===oC.ConnectionEnd.client,r=function(){var e={sequenceNumber:[0,0],macKey:null,macLength:0,macFunction:null,cipherState:null,cipherFunction:function(e){return!0},compressionState:null,compressFunction:function(e){return!0},updateSequenceNumber:function(){0xffffffff===e.sequenceNumber[1]?(e.sequenceNumber[1]=0,++e.sequenceNumber[0]):++e.sequenceNumber[1]}};return e},a={read:r(),write:r()};if(a.read.update=function(e,t){return a.read.cipherFunction(t,a.read)?a.read.compressFunction(e,t,a.read)||e.error(e,{message:"Could not decompress record.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.decompression_failure}}):e.error(e,{message:"Could not decrypt record or bad MAC.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.bad_record_mac}}),!e.fail},a.write.update=function(e,t){return a.write.compressFunction(e,t,a.write)?a.write.cipherFunction(t,a.write)||e.error(e,{message:"Could not encrypt record.",send:!1,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.internal_error}}):e.error(e,{message:"Could not compress record.",send:!1,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.internal_error}}),!e.fail},e.session){var o=e.session.sp;switch(e.session.cipherSuite.initSecurityParameters(o),o.keys=oC.generateKeys(e,o),a.read.macKey=t?o.keys.server_write_MAC_key:o.keys.client_write_MAC_key,a.write.macKey=t?o.keys.client_write_MAC_key:o.keys.server_write_MAC_key,e.session.cipherSuite.initConnectionState(a,e,o),o.compression_algorithm){case oC.CompressionMethod.none:break;case oC.CompressionMethod.deflate:a.read.compressFunction=ov,a.write.compressFunction=ok;break;default:throw Error("Unsupported compression algorithm.")}}return a},oC.createRandom=function(){var e=new Date,t=+e+6e4*e.getTimezoneOffset(),r=r1.util.createBuffer();return r.putInt32(t),r.putBytes(r1.random.getBytes(28)),r},oC.createRecord=function(e,t){return t.data?{type:t.type,version:{major:e.version.major,minor:e.version.minor},length:t.data.length(),fragment:t.data}:null},oC.createAlert=function(e,t){var r=r1.util.createBuffer();return r.putByte(t.level),r.putByte(t.description),oC.createRecord(e,{type:oC.ContentType.alert,data:r})},oC.createClientHello=function(e){e.session.clientHelloVersion={major:e.version.major,minor:e.version.minor};for(var t=r1.util.createBuffer(),r=0;r<e.cipherSuites.length;++r){var a=e.cipherSuites[r];t.putByte(a.id[0]),t.putByte(a.id[1])}var o=t.length(),n=r1.util.createBuffer();n.putByte(oC.CompressionMethod.none);var i=n.length(),s=r1.util.createBuffer();if(e.virtualHost){var l=r1.util.createBuffer();l.putByte(0),l.putByte(0);var c=r1.util.createBuffer();c.putByte(0),oz(c,2,r1.util.createBuffer(e.virtualHost));var d=r1.util.createBuffer();oz(d,2,c),oz(l,2,d),s.putBuffer(l)}var m=s.length();m>0&&(m+=2);var p=e.session.id,u=p.length+1+2+4+28+2+o+1+i+m,h=r1.util.createBuffer();return h.putByte(oC.HandshakeType.client_hello),h.putInt24(u),h.putByte(e.version.major),h.putByte(e.version.minor),h.putBytes(e.session.sp.client_random),oz(h,1,r1.util.createBuffer(p)),oz(h,2,t),oz(h,1,n),m>0&&oz(h,2,s),h},oC.createServerHello=function(e){var t=e.session.id,r=t.length+1+2+4+28+2+1,a=r1.util.createBuffer();return a.putByte(oC.HandshakeType.server_hello),a.putInt24(r),a.putByte(e.version.major),a.putByte(e.version.minor),a.putBytes(e.session.sp.server_random),oz(a,1,r1.util.createBuffer(t)),a.putByte(e.session.cipherSuite.id[0]),a.putByte(e.session.cipherSuite.id[1]),a.putByte(e.session.compressionMethod),a},oC.createCertificate=function(e){var t=e.entity===oC.ConnectionEnd.client,r=null;e.getCertificate&&(r=e.getCertificate(e,t?e.session.certificateRequest:e.session.extensions.server_name.serverNameList));var a=r1.util.createBuffer();if(null!==r)try{r1.util.isArray(r)||(r=[r]);for(var o=null,n=0;n<r.length;++n){var i=r1.pem.decode(r[n])[0];if("CERTIFICATE"!==i.type&&"X509 CERTIFICATE"!==i.type&&"TRUSTED CERTIFICATE"!==i.type){var s=Error('Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".');throw s.headerType=i.type,s}if(i.procType&&"ENCRYPTED"===i.procType.type)throw Error("Could not convert certificate from PEM; PEM is encrypted.");var l=r1.util.createBuffer(i.body);null===o&&(o=r1.asn1.fromDer(l.bytes(),!1));var c=r1.util.createBuffer();oz(c,3,l),a.putBuffer(c)}r=r1.pki.certificateFromAsn1(o),t?e.session.clientCertificate=r:e.session.serverCertificate=r}catch(t){return e.error(e,{message:"Could not send certificate list.",cause:t,send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.bad_certificate}})}var d=3+a.length(),m=r1.util.createBuffer();return m.putByte(oC.HandshakeType.certificate),m.putInt24(d),oz(m,3,a),m},oC.createClientKeyExchange=function(e){var t=r1.util.createBuffer();t.putByte(e.session.clientHelloVersion.major),t.putByte(e.session.clientHelloVersion.minor),t.putBytes(r1.random.getBytes(46));var r=e.session.sp;r.pre_master_secret=t.getBytes();var a=(t=e.session.serverCertificate.publicKey.encrypt(r.pre_master_secret)).length+2,o=r1.util.createBuffer();return o.putByte(oC.HandshakeType.client_key_exchange),o.putInt24(a),o.putInt16(t.length),o.putBytes(t),o},oC.createServerKeyExchange=function(e){return r1.util.createBuffer()},oC.getClientSignature=function(e,t){var r=r1.util.createBuffer();r.putBuffer(e.session.md5.digest()),r.putBuffer(e.session.sha1.digest()),r=r.getBytes(),e.getSignature=e.getSignature||function(e,t,r){var a=null;if(e.getPrivateKey)try{a=e.getPrivateKey(e,e.session.clientCertificate),a=r1.pki.privateKeyFromPem(a)}catch(t){e.error(e,{message:"Could not get private key.",cause:t,send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.internal_error}})}null===a?e.error(e,{message:"No private key set.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.internal_error}}):t=a.sign(t,null),r(e,t)},e.getSignature(e,r,t)},oC.createCertificateVerify=function(e,t){var r=t.length+2,a=r1.util.createBuffer();return a.putByte(oC.HandshakeType.certificate_verify),a.putInt24(r),a.putInt16(t.length),a.putBytes(t),a},oC.createCertificateRequest=function(e){var t=r1.util.createBuffer();t.putByte(1);var r=r1.util.createBuffer();for(var a in e.caStore.certs){var o=r1.pki.distinguishedNameToAsn1(e.caStore.certs[a].subject),n=r1.asn1.toDer(o);r.putInt16(n.length()),r.putBuffer(n)}var i=1+t.length()+2+r.length(),s=r1.util.createBuffer();return s.putByte(oC.HandshakeType.certificate_request),s.putInt24(i),oz(s,1,t),oz(s,2,r),s},oC.createServerHelloDone=function(e){var t=r1.util.createBuffer();return t.putByte(oC.HandshakeType.server_hello_done),t.putInt24(0),t},oC.createChangeCipherSpec=function(){var e=r1.util.createBuffer();return e.putByte(1),e},oC.createFinished=function(e){var t=r1.util.createBuffer();t.putBuffer(e.session.md5.digest()),t.putBuffer(e.session.sha1.digest()),t=ob(e.session.sp.master_secret,e.entity===oC.ConnectionEnd.client?"client finished":"server finished",t.getBytes(),12);var r=r1.util.createBuffer();return r.putByte(oC.HandshakeType.finished),r.putInt24(t.length()),r.putBuffer(t),r},oC.createHeartbeat=function(e,t,r){void 0===r&&(r=t.length);var a=r1.util.createBuffer();a.putByte(e),a.putInt16(r),a.putBytes(t);var o=Math.max(16,a.length()-r-3);return a.putBytes(r1.random.getBytes(o)),a},oC.queue=function(e,t){if(t&&(0!==t.fragment.length()||t.type!==oC.ContentType.handshake&&t.type!==oC.ContentType.alert&&t.type!==oC.ContentType.change_cipher_spec)){if(t.type===oC.ContentType.handshake){var r,a=t.fragment.bytes();e.session.md5.update(a),e.session.sha1.update(a),a=null}if(t.fragment.length()<=oC.MaxFragment)r=[t];else{r=[];for(var o=t.fragment.bytes();o.length>oC.MaxFragment;)r.push(oC.createRecord(e,{type:t.type,data:r1.util.createBuffer(o.slice(0,oC.MaxFragment))})),o=o.slice(oC.MaxFragment);o.length>0&&r.push(oC.createRecord(e,{type:t.type,data:r1.util.createBuffer(o)}))}for(var n=0;n<r.length&&!e.fail;++n){var i=r[n];e.state.current.write.update(e,i)&&e.records.push(i)}}},oC.flush=function(e){for(var t=0;t<e.records.length;++t){var r=e.records[t];e.tlsData.putByte(r.type),e.tlsData.putByte(r.version.major),e.tlsData.putByte(r.version.minor),e.tlsData.putInt16(r.fragment.length()),e.tlsData.putBuffer(e.records[t].fragment)}return e.records=[],e.tlsDataReady(e)};var oZ=function(e){switch(e){case!0:return!0;case r1.pki.certificateError.bad_certificate:return oC.Alert.Description.bad_certificate;case r1.pki.certificateError.unsupported_certificate:return oC.Alert.Description.unsupported_certificate;case r1.pki.certificateError.certificate_revoked:return oC.Alert.Description.certificate_revoked;case r1.pki.certificateError.certificate_expired:return oC.Alert.Description.certificate_expired;case r1.pki.certificateError.certificate_unknown:return oC.Alert.Description.certificate_unknown;case r1.pki.certificateError.unknown_ca:return oC.Alert.Description.unknown_ca;default:return oC.Alert.Description.bad_certificate}};for(var oJ in oC.verifyCertificateChain=function(e,t){try{var r={};for(var a in e.verifyOptions)r[a]=e.verifyOptions[a];r.verify=function(t,r,a){oZ(t);var o=e.verify(e,t,r,a);if(!0!==o){if("object"==typeof o&&!r1.util.isArray(o)){var n=Error("The application rejected the certificate.");throw n.send=!0,n.alert={level:oC.Alert.Level.fatal,description:oC.Alert.Description.bad_certificate},o.message&&(n.message=o.message),o.alert&&(n.alert.description=o.alert),n}o!==t&&(o=function(e){switch(e){case!0:return!0;case oC.Alert.Description.bad_certificate:return r1.pki.certificateError.bad_certificate;case oC.Alert.Description.unsupported_certificate:return r1.pki.certificateError.unsupported_certificate;case oC.Alert.Description.certificate_revoked:return r1.pki.certificateError.certificate_revoked;case oC.Alert.Description.certificate_expired:return r1.pki.certificateError.certificate_expired;case oC.Alert.Description.certificate_unknown:return r1.pki.certificateError.certificate_unknown;case oC.Alert.Description.unknown_ca:return r1.pki.certificateError.unknown_ca;default:return r1.pki.certificateError.bad_certificate}}(o))}return o},r1.pki.verifyCertificateChain(e.caStore,t,r)}catch(t){var o=t;("object"!=typeof o||r1.util.isArray(o))&&(o={send:!0,alert:{level:oC.Alert.Level.fatal,description:oZ(t)}}),"send"in o||(o.send=!0),"alert"in o||(o.alert={level:oC.Alert.Level.fatal,description:oZ(o.error)}),e.error(e,o)}return!e.fail},oC.createSessionCache=function(e,t){var r=null;if(e&&e.getSession&&e.setSession&&e.order)r=e;else{for(var a in(r={}).cache=e||{},r.capacity=Math.max(t||100,1),r.order=[],e)r.order.length<=t?r.order.push(a):delete e[a];r.getSession=function(e){var t=null,a=null;if(e?a=r1.util.bytesToHex(e):r.order.length>0&&(a=r.order[0]),null!==a&&a in r.cache){for(var o in t=r.cache[a],delete r.cache[a],r.order)if(r.order[o]===a){r.order.splice(o,1);break}}return t},r.setSession=function(e,t){if(r.order.length===r.capacity){var a=r.order.shift();delete r.cache[a]}a=r1.util.bytesToHex(e),r.order.push(a),r.cache[a]=t}}return r},oC.createConnection=function(e){var t=e.caStore?r1.util.isArray(e.caStore)?r1.pki.createCaStore(e.caStore):e.caStore:r1.pki.createCaStore(),r=e.cipherSuites||null;if(null===r)for(var a in r=[],oC.CipherSuites)r.push(oC.CipherSuites[a]);var o=e.server?oC.ConnectionEnd.server:oC.ConnectionEnd.client,n=e.sessionCache?oC.createSessionCache(e.sessionCache):null,i={version:{major:oC.Version.major,minor:oC.Version.minor},entity:o,sessionId:e.sessionId,caStore:t,sessionCache:n,cipherSuites:r,connected:e.connected,virtualHost:e.virtualHost||null,verifyClient:e.verifyClient||!1,verify:e.verify||function(e,t,r,a){return t},verifyOptions:e.verifyOptions||{},getCertificate:e.getCertificate||null,getPrivateKey:e.getPrivateKey||null,getSignature:e.getSignature||null,input:r1.util.createBuffer(),tlsData:r1.util.createBuffer(),data:r1.util.createBuffer(),tlsDataReady:e.tlsDataReady,dataReady:e.dataReady,heartbeatReceived:e.heartbeatReceived,closed:e.closed,error:function(t,r){r.origin=r.origin||(t.entity===oC.ConnectionEnd.client?"client":"server"),r.send&&(oC.queue(t,oC.createAlert(t,r.alert)),oC.flush(t));var a=!1!==r.fatal;a&&(t.fail=!0),e.error(t,r),a&&t.close(!1)},deflate:e.deflate||null,inflate:e.inflate||null,reset:function(e){i.version={major:oC.Version.major,minor:oC.Version.minor},i.record=null,i.session=null,i.peerCertificate=null,i.state={pending:null,current:null},i.expect=0,i.fragmented=null,i.records=[],i.open=!1,i.handshakes=0,i.handshaking=!1,i.isConnected=!1,i.fail=!(e||void 0===e),i.input.clear(),i.tlsData.clear(),i.data.clear(),i.state.current=oC.createConnectionState(i)}};return i.reset(),i.handshake=function(e){if(i.entity!==oC.ConnectionEnd.client)i.error(i,{message:"Cannot initiate handshake as a server.",fatal:!1});else if(i.handshaking)i.error(i,{message:"Handshake already in progress.",fatal:!1});else{i.fail&&!i.open&&0===i.handshakes&&(i.fail=!1),i.handshaking=!0;var t=null;(e=e||"").length>0&&(i.sessionCache&&(t=i.sessionCache.getSession(e)),null===t&&(e="")),0===e.length&&i.sessionCache&&null!==(t=i.sessionCache.getSession())&&(e=t.id),i.session={id:e,version:null,cipherSuite:null,compressionMethod:null,serverCertificate:null,certificateRequest:null,clientCertificate:null,sp:{},md5:r1.md.md5.create(),sha1:r1.md.sha1.create()},t&&(i.version=t.version,i.session.sp=t.sp),i.session.sp.client_random=oC.createRandom().getBytes(),i.open=!0,oC.queue(i,oC.createRecord(i,{type:oC.ContentType.handshake,data:oC.createClientHello(i)})),oC.flush(i)}},i.process=function(e){var t,r,a,o,n,s,l,c,d=0;return e&&i.input.putBytes(e),i.fail||(null!==i.record&&i.record.ready&&i.record.fragment.isEmpty()&&(i.record=null),null===i.record&&(d=function(e){var t=0,r=e.input,a=r.length();if(a<5)t=5-a;else{e.record={type:r.getByte(),version:{major:r.getByte(),minor:r.getByte()},length:r.getInt16(),fragment:r1.util.createBuffer(),ready:!1};var o=e.record.version.major===e.version.major;o&&e.session&&e.session.version&&(o=e.record.version.minor===e.version.minor),o||e.error(e,{message:"Incompatible TLS version.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.protocol_version}})}return t}(i)),i.fail||null===i.record||i.record.ready||(r=0,(o=(a=(t=i).input).length())<t.record.length?r=t.record.length-o:(t.record.fragment.putBytes(a.getBytes(t.record.length)),a.compact(),t.state.current.read.update(t,t.record)&&(null!==t.fragmented&&(t.fragmented.type===t.record.type?(t.fragmented.fragment.putBuffer(t.record.fragment),t.record=t.fragmented):t.error(t,{message:"Invalid fragmented record.",send:!0,alert:{level:oC.Alert.Level.fatal,description:oC.Alert.Description.unexpected_message}})),t.record.ready=!0)),d=r),!i.fail&&null!==i.record&&i.record.ready&&(n=i,l=(s=i.record).type-oC.ContentType.change_cipher_spec,c=oq[n.entity][n.expect],l in c?c[l](n,s):oC.handleUnexpected(n,s))),d},i.prepare=function(e){return oC.queue(i,oC.createRecord(i,{type:oC.ContentType.application_data,data:r1.util.createBuffer(e)})),oC.flush(i)},i.prepareHeartbeatRequest=function(e,t){return e instanceof r1.util.ByteBuffer&&(e=e.bytes()),void 0===t&&(t=e.length),i.expectedHeartbeatPayload=e,oC.queue(i,oC.createRecord(i,{type:oC.ContentType.heartbeat,data:oC.createHeartbeat(oC.HeartbeatMessageType.heartbeat_request,e,t)})),oC.flush(i)},i.close=function(e){if(!i.fail&&i.sessionCache&&i.session){var t={id:i.session.id,version:i.session.version,sp:i.session.sp};t.sp.keys=null,i.sessionCache.setSession(t.id,t)}i.open&&(i.open=!1,i.input.clear(),(i.isConnected||i.handshaking)&&(i.isConnected=i.handshaking=!1,oC.queue(i,oC.createAlert(i,{level:oC.Alert.Level.warning,description:oC.Alert.Description.close_notify})),oC.flush(i)),i.closed(i)),i.reset(e)},i},r1.tls=r1.tls||{},oC)"function"!=typeof oC[oJ]&&(r1.tls[oJ]=oC[oJ]);r1.tls.prf_tls1=ob,r1.tls.hmac_sha1=function(e,t,r){var a=r1.hmac.create();a.start("SHA1",e);var o=r1.util.createBuffer();return o.putInt32(t[0]),o.putInt32(t[1]),o.putByte(r.type),o.putByte(r.version.major),o.putByte(r.version.minor),o.putInt16(r.length),o.putBytes(r.fragment.bytes()),a.update(o.getBytes()),a.digest().getBytes()},r1.tls.createSessionCache=oC.createSessionCache,r1.tls.createConnection=oC.createConnection,r5(function(e){var t=e.exports=r1.tls;function r(e,r,o){var n=r.entity===r1.tls.ConnectionEnd.client;e.read.cipherState={init:!1,cipher:r1.cipher.createDecipher("AES-CBC",n?o.keys.server_write_key:o.keys.client_write_key),iv:n?o.keys.server_write_IV:o.keys.client_write_IV},e.write.cipherState={init:!1,cipher:r1.cipher.createCipher("AES-CBC",n?o.keys.client_write_key:o.keys.server_write_key),iv:n?o.keys.client_write_IV:o.keys.server_write_IV},e.read.cipherFunction=i,e.write.cipherFunction=a,e.read.macLength=e.write.macLength=o.mac_length,e.read.macFunction=e.write.macFunction=t.hmac_sha1}function a(e,r){var a,n=!1,i=r.macFunction(r.macKey,r.sequenceNumber,e);e.fragment.putBytes(i),r.updateSequenceNumber(),a=e.version.minor===t.Versions.TLS_1_0.minor?r.cipherState.init?null:r.cipherState.iv:r1.random.getBytesSync(16),r.cipherState.init=!0;var s=r.cipherState.cipher;return s.start({iv:a}),e.version.minor>=t.Versions.TLS_1_1.minor&&s.output.putBytes(a),s.update(e.fragment),s.finish(o)&&(e.fragment=s.output,e.length=e.fragment.length(),n=!0),n}function o(e,t,r){if(!r){var a=e-t.length()%e;t.fillWithByte(a-1,a)}return!0}function n(e,t,r){var a=!0;if(r){for(var o=t.length(),n=t.last(),i=o-1-n;i<o-1;++i)a=a&&t.at(i)==n;a&&t.truncate(n+1)}return a}function i(e,r){var a,o,i,s,l=!1;s=e.version.minor===t.Versions.TLS_1_0.minor?r.cipherState.init?null:r.cipherState.iv:e.fragment.getBytes(16),r.cipherState.init=!0;var c=r.cipherState.cipher;c.start({iv:s}),c.update(e.fragment),l=c.finish(n);var d=r.macLength,m=r1.random.getBytesSync(d),p=c.output.length();p>=d?(e.fragment=c.output.getBytes(p-d),m=c.output.getBytes(d)):e.fragment=c.output.getBytes(),e.fragment=r1.util.createBuffer(e.fragment),e.length=e.fragment.length();var u=r.macFunction(r.macKey,r.sequenceNumber,e);return r.updateSequenceNumber(),a=r.macKey,o=m,(i=r1.hmac.create()).start("SHA1",a),i.update(o),o=i.digest().getBytes(),i.start(null,null),i.update(u),l=o===i.digest().getBytes()&&l}t.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA={id:[0,47],name:"TLS_RSA_WITH_AES_128_CBC_SHA",initSecurityParameters:function(e){e.bulk_cipher_algorithm=t.BulkCipherAlgorithm.aes,e.cipher_type=t.CipherType.block,e.enc_key_length=16,e.block_length=16,e.fixed_iv_length=16,e.record_iv_length=16,e.mac_algorithm=t.MACAlgorithm.hmac_sha1,e.mac_length=20,e.mac_key_length=20},initConnectionState:r},t.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA={id:[0,53],name:"TLS_RSA_WITH_AES_256_CBC_SHA",initSecurityParameters:function(e){e.bulk_cipher_algorithm=t.BulkCipherAlgorithm.aes,e.cipher_type=t.CipherType.block,e.enc_key_length=32,e.block_length=16,e.fixed_iv_length=16,e.record_iv_length=16,e.mac_algorithm=t.MACAlgorithm.hmac_sha1,e.mac_length=20,e.mac_key_length=20},initConnectionState:r}}),r5(function(e){var t=e.exports=r1.sha512=r1.sha512||{};r1.md.sha512=r1.md.algorithms.sha512=t;var r=r1.sha384=r1.sha512.sha384=r1.sha512.sha384||{};r.create=function(){return t.create("SHA-384")},r1.md.sha384=r1.md.algorithms.sha384=r,r1.sha512.sha256=r1.sha512.sha256||{create:function(){return t.create("SHA-512/256")}},r1.md["sha512/256"]=r1.md.algorithms["sha512/256"]=r1.sha512.sha256,r1.sha512.sha224=r1.sha512.sha224||{create:function(){return t.create("SHA-512/224")}},r1.md["sha512/224"]=r1.md.algorithms["sha512/224"]=r1.sha512.sha224,t.create=function(e){if(o||(a=String.fromCharCode(128)+r1.util.fillString("\0",128),n=[[0x428a2f98,0xd728ae22],[0x71374491,0x23ef65cd],[0xb5c0fbcf,0xec4d3b2f],[0xe9b5dba5,0x8189dbbc],[0x3956c25b,0xf348b538],[0x59f111f1,0xb605d019],[0x923f82a4,0xaf194f9b],[0xab1c5ed5,0xda6d8118],[0xd807aa98,0xa3030242],[0x12835b01,0x45706fbe],[0x243185be,0x4ee4b28c],[0x550c7dc3,0xd5ffb4e2],[0x72be5d74,0xf27b896f],[0x80deb1fe,0x3b1696b1],[0x9bdc06a7,0x25c71235],[0xc19bf174,0xcf692694],[0xe49b69c1,0x9ef14ad2],[0xefbe4786,0x384f25e3],[0xfc19dc6,0x8b8cd5b5],[0x240ca1cc,0x77ac9c65],[0x2de92c6f,0x592b0275],[0x4a7484aa,0x6ea6e483],[0x5cb0a9dc,0xbd41fbd4],[0x76f988da,0x831153b5],[0x983e5152,0xee66dfab],[0xa831c66d,0x2db43210],[0xb00327c8,0x98fb213f],[0xbf597fc7,0xbeef0ee4],[0xc6e00bf3,0x3da88fc2],[0xd5a79147,0x930aa725],[0x6ca6351,0xe003826f],[0x14292967,0xa0e6e70],[0x27b70a85,0x46d22ffc],[0x2e1b2138,0x5c26c926],[0x4d2c6dfc,0x5ac42aed],[0x53380d13,0x9d95b3df],[0x650a7354,0x8baf63de],[0x766a0abb,0x3c77b2a8],[0x81c2c92e,0x47edaee6],[0x92722c85,0x1482353b],[0xa2bfe8a1,0x4cf10364],[0xa81a664b,0xbc423001],[0xc24b8b70,0xd0f89791],[0xc76c51a3,0x654be30],[0xd192e819,0xd6ef5218],[0xd6990624,0x5565a910],[0xf40e3585,0x5771202a],[0x106aa070,0x32bbd1b8],[0x19a4c116,0xb8d2d0c8],[0x1e376c08,0x5141ab53],[0x2748774c,0xdf8eeb99],[0x34b0bcb5,0xe19b48a8],[0x391c0cb3,0xc5c95a63],[0x4ed8aa4a,0xe3418acb],[0x5b9cca4f,0x7763e373],[0x682e6ff3,0xd6b2b8a3],[0x748f82ee,0x5defb2fc],[0x78a5636f,0x43172f60],[0x84c87814,0xa1f0ab72],[0x8cc70208,0x1a6439ec],[0x90befffa,0x23631e28],[0xa4506ceb,0xde82bde9],[0xbef9a3f7,0xb2c67915],[0xc67178f2,0xe372532b],[0xca273ece,0xea26619c],[0xd186b8c7,0x21c0c207],[0xeada7dd6,0xcde0eb1e],[0xf57d4f7f,0xee6ed178],[0x6f067aa,0x72176fba],[0xa637dc5,0xa2c898a6],[0x113f9804,0xbef90dae],[0x1b710b35,0x131c471b],[0x28db77f5,0x23047d84],[0x32caab7b,0x40c72493],[0x3c9ebe0a,0x15c9bebc],[0x431d67c4,0x9c100d4c],[0x4cc5d4be,0xcb3e42b6],[0x597f299c,0xfc657e2a],[0x5fcb6fab,0x3ad6faec],[0x6c44198c,0x4a475817]],(i={})["SHA-512"]=[[0x6a09e667,0xf3bcc908],[0xbb67ae85,0x84caa73b],[0x3c6ef372,0xfe94f82b],[0xa54ff53a,0x5f1d36f1],[0x510e527f,0xade682d1],[0x9b05688c,0x2b3e6c1f],[0x1f83d9ab,0xfb41bd6b],[0x5be0cd19,0x137e2179]],i["SHA-384"]=[[0xcbbb9d5d,0xc1059ed8],[0x629a292a,0x367cd507],[0x9159015a,0x3070dd17],[0x152fecd8,0xf70e5939],[0x67332667,0xffc00b31],[0x8eb44a87,0x68581511],[0xdb0c2e0d,0x64f98fa7],[0x47b5481d,0xbefa4fa4]],i["SHA-512/256"]=[[0x22312194,0xfc2bf72c],[0x9f555fa3,0xc84c64c2],[0x2393b86b,0x6f53b151],[0x96387719,0x5940eabd],[0x96283ee2,0xa88effe3],[0xbe5e1e25,0x53863992],[0x2b0199fc,0x2c85b8aa],[0xeb72ddc,0x81c52ca2]],i["SHA-512/224"]=[[0x8c3d37c8,0x19544da2],[0x73e19966,0x89dcd4d6],[0x1dfab7ae,0x32ff9c82],[0x679dd514,0x582f9fcf],[0xf6d2b69,0x7bd44da8],[0x77e36f73,0x4c48942],[0x3f9d85a8,0x6a1d36c8],[0x1112e6ad,0x91d692a1]],o=!0),void 0===e&&(e="SHA-512"),!(e in i))throw Error("Invalid SHA-512 algorithm: "+e);for(var t=i[e],r=null,l=r1.util.createBuffer(),c=Array(80),d=0;d<80;++d)c[d]=[,,];var m=64;switch(e){case"SHA-384":m=48;break;case"SHA-512/256":m=32;break;case"SHA-512/224":m=28}var p={algorithm:e.replace("-","").toLowerCase(),blockLength:128,digestLength:m,messageLength:0,fullMessageLength:null,messageLengthSize:16,start:function(){p.messageLength=0,p.fullMessageLength=p.messageLength128=[];for(var e=p.messageLengthSize/4,a=0;a<e;++a)p.fullMessageLength.push(0);for(l=r1.util.createBuffer(),r=Array(t.length),a=0;a<t.length;++a)r[a]=t[a].slice(0);return p}};return p.start(),p.update=function(e,t){"utf8"===t&&(e=r1.util.encodeUtf8(e));var a=e.length;p.messageLength+=a,a=[a/0x100000000>>>0,a>>>0];for(var o=p.fullMessageLength.length-1;o>=0;--o)p.fullMessageLength[o]+=a[1],a[1]=a[0]+(p.fullMessageLength[o]/0x100000000>>>0),p.fullMessageLength[o]=p.fullMessageLength[o]>>>0,a[0]=a[1]/0x100000000>>>0;return l.putBytes(e),s(r,c,l),(l.read>2048||0===l.length())&&l.compact(),p},p.digest=function(){var t,o=r1.util.createBuffer();o.putBytes(l.bytes()),o.putBytes(a.substr(0,p.blockLength-(p.fullMessageLength[p.fullMessageLength.length-1]+p.messageLengthSize&p.blockLength-1)));for(var n=8*p.fullMessageLength[0],i=0;i<p.fullMessageLength.length-1;++i)o.putInt32((n+=(t=8*p.fullMessageLength[i+1])/0x100000000>>>0)>>>0),n=t>>>0;o.putInt32(n);var d=Array(r.length);for(i=0;i<r.length;++i)d[i]=r[i].slice(0);s(d,c,o);var m,u=r1.util.createBuffer();for(m="SHA-512"===e?d.length:"SHA-384"===e?d.length-2:d.length-4,i=0;i<m;++i)u.putInt32(d[i][0]),i===m-1&&"SHA-512/224"===e||u.putInt32(d[i][1]);return u},p};var a=null,o=!1,n=null,i=null;function s(e,t,r){for(var a,o,i,s,l,c,d,m,p,u,h,f,y,g,b,k,v,x,z,C,w,S,_,E,N,I,T,A=r.length();A>=128;){for(w=0;w<16;++w)t[w][0]=r.getInt32()>>>0,t[w][1]=r.getInt32()>>>0;for(;w<80;++w)o=(((S=(E=t[w-2])[0])<<13|(_=E[1])>>>19)^(_<<3|S>>>29)^(S<<26|_>>>6))>>>0,t[w][0]=(a=((S>>>19|_<<13)^(_>>>29|S<<3)^S>>>6)>>>0)+(N=t[w-7])[0]+(i=(((S=(I=t[w-15])[0])>>>1|(_=I[1])<<31)^(S>>>8|_<<24)^S>>>7)>>>0)+(T=t[w-16])[0]+((_=o+N[1]+(s=((S<<31|_>>>1)^(S<<24|_>>>8)^(S<<25|_>>>7))>>>0)+T[1])/0x100000000>>>0)>>>0,t[w][1]=_>>>0;for(l=e[0][0],c=e[0][1],d=e[1][0],m=e[1][1],p=e[2][0],u=e[2][1],h=e[3][0],f=e[3][1],y=e[4][0],g=e[4][1],b=e[5][0],k=e[5][1],v=e[6][0],x=e[6][1],z=e[7][0],C=e[7][1],w=0;w<80;++w)a=z+(((y>>>14|g<<18)^(y>>>18|g<<14)^(g>>>9|y<<23))>>>0)+((v^y&(b^v))>>>0)+n[w][0]+t[w][0]+((_=C+(((y<<18|g>>>14)^(y<<14|g>>>18)^(g<<23|y>>>9))>>>0)+((x^g&(k^x))>>>0)+n[w][1]+t[w][1])/0x100000000>>>0)>>>0,o=_>>>0,i=(((l>>>28|c<<4)^(c>>>2|l<<30)^(c>>>7|l<<25))>>>0)+((l&d|p&(l^d))>>>0)+((_=(((l<<4|c>>>28)^(c<<30|l>>>2)^(c<<25|l>>>7))>>>0)+((c&m|u&(c^m))>>>0))/0x100000000>>>0)>>>0,s=_>>>0,z=v,C=x,v=b,x=k,b=y,k=g,y=h+a+((_=f+o)/0x100000000>>>0)>>>0,g=_>>>0,h=p,f=u,p=d,u=m,d=l,m=c,l=a+i+((_=o+s)/0x100000000>>>0)>>>0,c=_>>>0;e[0][0]=e[0][0]+l+((_=e[0][1]+c)/0x100000000>>>0)>>>0,e[0][1]=_>>>0,e[1][0]=e[1][0]+d+((_=e[1][1]+m)/0x100000000>>>0)>>>0,e[1][1]=_>>>0,e[2][0]=e[2][0]+p+((_=e[2][1]+u)/0x100000000>>>0)>>>0,e[2][1]=_>>>0,e[3][0]=e[3][0]+h+((_=e[3][1]+f)/0x100000000>>>0)>>>0,e[3][1]=_>>>0,e[4][0]=e[4][0]+y+((_=e[4][1]+g)/0x100000000>>>0)>>>0,e[4][1]=_>>>0,e[5][0]=e[5][0]+b+((_=e[5][1]+k)/0x100000000>>>0)>>>0,e[5][1]=_>>>0,e[6][0]=e[6][0]+v+((_=e[6][1]+x)/0x100000000>>>0)>>>0,e[6][1]=_>>>0,e[7][0]=e[7][0]+z+((_=e[7][1]+C)/0x100000000>>>0)>>>0,e[7][1]=_>>>0,A-=128}}});var o0=r1.asn1,o1={privateKeyValidator:{name:"PrivateKeyInfo",tagClass:o0.Class.UNIVERSAL,type:o0.Type.SEQUENCE,constructed:!0,value:[{name:"PrivateKeyInfo.version",tagClass:o0.Class.UNIVERSAL,type:o0.Type.INTEGER,constructed:!1,capture:"privateKeyVersion"},{name:"PrivateKeyInfo.privateKeyAlgorithm",tagClass:o0.Class.UNIVERSAL,type:o0.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:o0.Class.UNIVERSAL,type:o0.Type.OID,constructed:!1,capture:"privateKeyOid"}]},{name:"PrivateKeyInfo",tagClass:o0.Class.UNIVERSAL,type:o0.Type.OCTETSTRING,constructed:!1,capture:"privateKey"}]},publicKeyValidator:{name:"SubjectPublicKeyInfo",tagClass:o0.Class.UNIVERSAL,type:o0.Type.SEQUENCE,constructed:!0,captureAsn1:"subjectPublicKeyInfo",value:[{name:"SubjectPublicKeyInfo.AlgorithmIdentifier",tagClass:o0.Class.UNIVERSAL,type:o0.Type.SEQUENCE,constructed:!0,value:[{name:"AlgorithmIdentifier.algorithm",tagClass:o0.Class.UNIVERSAL,type:o0.Type.OID,constructed:!1,capture:"publicKeyOid"}]},{tagClass:o0.Class.UNIVERSAL,type:o0.Type.BITSTRING,constructed:!1,composed:!0,captureBitStringValue:"ed25519PublicKey"}]}},o2=o1.publicKeyValidator,o5=o1.privateKeyValidator,o3=r1.util.ByteBuffer,o4=void 0===rE.Buffer?Uint8Array:rE.Buffer;r1.pki=r1.pki||{},r1.pki.ed25519=r1.ed25519=r1.ed25519||{};var o8=r1.ed25519;function o6(e){var t=e.message;if(t instanceof Uint8Array||t instanceof o4)return t;var r=e.encoding;if(void 0===t){if(!e.md)throw TypeError('"options.message" or "options.md" not specified.');t=e.md.digest().getBytes(),r="binary"}if("string"==typeof t&&!r)throw TypeError('"options.encoding" must be "binary" or "utf8".');if("string"==typeof t){if(void 0!==rE.Buffer)return rE.Buffer.from(t,r);t=new o3(t,r)}else if(!(t instanceof o3))throw TypeError('"options.message" must be a node.js Buffer, a Uint8Array, a forge ByteBuffer, or a string with "options.encoding" specifying its encoding.');for(var a=new o4(t.length()),o=0;o<a.length;++o)a[o]=t.at(o);return a}o8.constants={},o8.constants.PUBLIC_KEY_BYTE_LENGTH=32,o8.constants.PRIVATE_KEY_BYTE_LENGTH=64,o8.constants.SEED_BYTE_LENGTH=32,o8.constants.SIGN_BYTE_LENGTH=64,o8.constants.HASH_BYTE_LENGTH=64,o8.generateKeyPair=function(e){var t=(e=e||{}).seed;if(void 0===t)t=r1.random.getBytesSync(o8.constants.SEED_BYTE_LENGTH);else if("string"==typeof t){if(t.length!==o8.constants.SEED_BYTE_LENGTH)throw TypeError('"seed" must be '+o8.constants.SEED_BYTE_LENGTH+" bytes in length.")}else if(!(t instanceof Uint8Array))throw TypeError('"seed" must be a node.js Buffer, Uint8Array, or a binary string.');t=o6({message:t,encoding:"binary"});for(var r=new o4(o8.constants.PUBLIC_KEY_BYTE_LENGTH),a=new o4(o8.constants.PRIVATE_KEY_BYTE_LENGTH),o=0;o<32;++o)a[o]=t[o];return function(e,t){var r,a=[nx(),nx(),nx(),nx()],o=ni(t,32);for(o[0]&=248,o[31]&=127,o[31]|=64,ng(a,o),nm(e,a),r=0;r<32;++r)t[r+32]=e[r]}(r,a),{publicKey:r,privateKey:a}},o8.privateKeyFromAsn1=function(e){var t={},r=[];if(!r1.asn1.validate(e,o5,t,r)){var a=Error("Invalid Key.");throw a.errors=r,a}var o=r1.asn1.derToOid(t.privateKeyOid),n=r1.oids.EdDSA25519;if(o!==n)throw Error('Invalid OID "'+o+'"; OID must be "'+n+'".');return{privateKeyBytes:o6({message:r1.asn1.fromDer(t.privateKey).value,encoding:"binary"})}},o8.publicKeyFromAsn1=function(e){var t={},r=[];if(!r1.asn1.validate(e,o2,t,r)){var a=Error("Invalid Key.");throw a.errors=r,a}var o=r1.asn1.derToOid(t.publicKeyOid),n=r1.oids.EdDSA25519;if(o!==n)throw Error('Invalid OID "'+o+'"; OID must be "'+n+'".');var i=t.ed25519PublicKey;if(i.length!==o8.constants.PUBLIC_KEY_BYTE_LENGTH)throw Error("Key length is invalid.");return o6({message:i,encoding:"binary"})},o8.publicKeyFromPrivateKey=function(e){var t=o6({message:(e=e||{}).privateKey,encoding:"binary"});if(t.length!==o8.constants.PRIVATE_KEY_BYTE_LENGTH)throw TypeError('"options.privateKey" must have a byte length of '+o8.constants.PRIVATE_KEY_BYTE_LENGTH);for(var r=new o4(o8.constants.PUBLIC_KEY_BYTE_LENGTH),a=0;a<r.length;++a)r[a]=t[32+a];return r},o8.sign=function(e){var t=o6(e=e||{}),r=o6({message:e.privateKey,encoding:"binary"});if(r.length===o8.constants.SEED_BYTE_LENGTH)r=o8.generateKeyPair({seed:r}).privateKey;else if(r.length!==o8.constants.PRIVATE_KEY_BYTE_LENGTH)throw TypeError('"options.privateKey" must have a byte length of '+o8.constants.SEED_BYTE_LENGTH+" or "+o8.constants.PRIVATE_KEY_BYTE_LENGTH);var a=new o4(o8.constants.SIGN_BYTE_LENGTH+t.length);!function(e,t,r,a){var o,n,i=new Float64Array(64),s=[nx(),nx(),nx(),nx()],l=ni(a,32);for(l[0]&=248,l[31]&=127,l[31]|=64,o=0;o<r;++o)e[64+o]=t[o];for(o=0;o<32;++o)e[32+o]=l[32+o];var c=ni(e.subarray(32),r+32);for(nl(c),ng(s,c),nm(e,s),o=32;o<64;++o)e[o]=a[o];var d=ni(e,r+64);for(nl(d),o=32;o<64;++o)i[o]=0;for(o=0;o<32;++o)i[o]=c[o];for(o=0;o<32;++o)for(n=0;n<32;n++)i[o+n]+=d[o]*l[n];ns(e.subarray(32),i)}(a,t,t.length,r);for(var o=new o4(o8.constants.SIGN_BYTE_LENGTH),n=0;n<o.length;++n)o[n]=a[n];return o},o8.verify=function(e){var t=o6(e=e||{});if(void 0===e.signature)throw TypeError('"options.signature" must be a node.js Buffer, a Uint8Array, a forge ByteBuffer, or a binary string.');var r=o6({message:e.signature,encoding:"binary"});if(r.length!==o8.constants.SIGN_BYTE_LENGTH)throw TypeError('"options.signature" must have a byte length of '+o8.constants.SIGN_BYTE_LENGTH);var a=o6({message:e.publicKey,encoding:"binary"});if(a.length!==o8.constants.PUBLIC_KEY_BYTE_LENGTH)throw TypeError('"options.publicKey" must have a byte length of '+o8.constants.PUBLIC_KEY_BYTE_LENGTH);var o,n=new o4(o8.constants.SIGN_BYTE_LENGTH+t.length),i=new o4(o8.constants.SIGN_BYTE_LENGTH+t.length);for(o=0;o<o8.constants.SIGN_BYTE_LENGTH;++o)n[o]=r[o];for(o=0;o<t.length;++o)n[o+o8.constants.SIGN_BYTE_LENGTH]=t[o];return function(e,t,r,a){var o,n,i,s,l,c,d,m,p,u,h,f,y,g=new o4(32),b=[nx(),nx(),nx(),nx()],k=[nx(),nx(),nx(),nx()];if(r<64)return -1;if(c=nx(),d=nx(),m=nx(),p=nx(),u=nx(),h=nx(),f=nx(),nb(k[2],o7),function(e,t){var r;for(r=0;r<16;++r)e[r]=t[2*r]+(t[2*r+1]<<8);e[15]&=32767}(k[1],a),nw(m,o=k[1],o),nw(p,m,ne),nC(m,m,k[2]),nz(p,k[2],p),nw(u,n=p,n),nw(h,i=u,i),nw(f,h,u),nw(c,f,m),nw(c,c,p),function(e,t){var r,a,o=nx();for(a=0;a<16;++a)o[a]=t[a];for(a=250;a>=0;--a){nw(o,r=o,r),1!==a&&nw(o,o,t)}for(a=0;a<16;++a)e[a]=o[a]}(c,c),nw(c,c,m),nw(c,c,p),nw(c,c,p),nw(k[0],c,p),nw(d,s=k[0],s),nw(d,d,p),nu(d,m)&&nw(k[0],k[0],nn),nw(d,l=k[0],l),nw(d,d,p),nu(d,m)?-1:(nf(k[0])===a[31]>>7&&nC(k[0],o9,k[0]),nw(k[3],k[0],k[1]),0))return -1;for(y=0;y<r;++y)e[y]=t[y];for(y=0;y<32;++y)e[y+32]=a[y];var v=ni(e,r);if(nl(v),ny(b,k,v),ng(k,t.subarray(32)),nc(b,k),nm(g,b),r-=64,nh(t,0,g,0)){for(y=0;y<r;++y)e[y]=0;return -1}for(y=0;y<r;++y)e[y]=t[y+64];return r}(i,n,n.length,a)>=0};var o9=nx(),o7=nx([1]),ne=nx([30883,4953,19914,30187,55467,16705,2637,112,59544,30585,16505,36039,65139,11119,27886,20995]),nt=nx([61785,9906,39828,60374,45398,33411,5274,224,53552,61171,33010,6542,64743,22239,55772,9222]),nr=nx([54554,36645,11616,51542,42930,38181,51040,26924,56412,64982,57905,49316,21502,52590,14035,8553]),na=nx([26200,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214,26214]),no=new Float64Array([237,211,245,92,26,99,18,88,214,156,247,162,222,249,222,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16]),nn=nx([41136,18958,6951,50414,58488,44335,6150,12099,55207,15867,153,11085,57099,20417,9344,11139]);function ni(e,t){var r=r1.md.sha512.create(),a=new o3(e);r.update(a.getBytes(t),"binary");var o=r.digest().getBytes();if(void 0!==rE.Buffer)return rE.Buffer.from(o,"binary");for(var n=new o4(o8.constants.HASH_BYTE_LENGTH),i=0;i<64;++i)n[i]=o.charCodeAt(i);return n}function ns(e,t){var r,a,o,n;for(a=63;a>=32;--a){for(r=0,o=a-32,n=a-12;o<n;++o)t[o]+=r-16*t[a]*no[o-(a-32)],t[o]-=256*(r=t[o]+128>>8);t[o]+=r,t[a]=0}for(r=0,o=0;o<32;++o)t[o]+=r-(t[31]>>4)*no[o],r=t[o]>>8,t[o]&=255;for(o=0;o<32;++o)t[o]-=r*no[o];for(a=0;a<32;++a)t[a+1]+=t[a]>>8,e[a]=255&t[a]}function nl(e){for(var t=new Float64Array(64),r=0;r<64;++r)t[r]=e[r],e[r]=0;ns(e,t)}function nc(e,t){var r=nx(),a=nx(),o=nx(),n=nx(),i=nx(),s=nx(),l=nx(),c=nx(),d=nx();nC(r,e[1],e[0]),nC(d,t[1],t[0]),nw(r,r,d),nz(a,e[0],e[1]),nz(d,t[0],t[1]),nw(a,a,d),nw(o,e[3],t[3]),nw(o,o,nt),nw(n,e[2],t[2]),nz(n,n,n),nC(i,a,r),nC(s,n,o),nz(l,n,o),nz(c,a,r),nw(e[0],i,s),nw(e[1],c,l),nw(e[2],l,s),nw(e[3],i,c)}function nd(e,t,r){for(var a=0;a<4;++a)nv(e[a],t[a],r)}function nm(e,t){var r=nx(),a=nx(),o=nx();!function(e,t){var r,a,o=nx();for(a=0;a<16;++a)o[a]=t[a];for(a=253;a>=0;--a){nw(o,r=o,r),2!==a&&4!==a&&nw(o,o,t)}for(a=0;a<16;++a)e[a]=o[a]}(o,t[2]),nw(r,t[0],o),nw(a,t[1],o),np(e,a),e[31]^=nf(r)<<7}function np(e,t){var r,a,o,n=nx(),i=nx();for(r=0;r<16;++r)i[r]=t[r];for(nk(i),nk(i),nk(i),a=0;a<2;++a){for(n[0]=i[0]-65517,r=1;r<15;++r)n[r]=i[r]-65535-(n[r-1]>>16&1),n[r-1]&=65535;n[15]=i[15]-32767-(n[14]>>16&1),o=n[15]>>16&1,n[14]&=65535,nv(i,n,1-o)}for(r=0;r<16;r++)e[2*r]=255&i[r],e[2*r+1]=i[r]>>8}function nu(e,t){var r=new o4(32),a=new o4(32);return np(r,e),np(a,t),nh(r,0,a,0)}function nh(e,t,r,a){var o,n=0;for(o=0;o<32;++o)n|=e[t+o]^r[a+o];return(1&n-1>>>8)-1}function nf(e){var t=new o4(32);return np(t,e),1&t[0]}function ny(e,t,r){var a,o;for(nb(e[0],o9),nb(e[1],o7),nb(e[2],o7),nb(e[3],o9),o=255;o>=0;--o)nd(e,t,a=r[o/8|0]>>(7&o)&1),nc(t,e),nc(e,e),nd(e,t,a)}function ng(e,t){var r=[nx(),nx(),nx(),nx()];nb(r[0],nr),nb(r[1],na),nb(r[2],o7),nw(r[3],nr,na),ny(e,r,t)}function nb(e,t){var r;for(r=0;r<16;r++)e[r]=0|t[r]}function nk(e){var t,r,a=1;for(t=0;t<16;++t)a=Math.floor((r=e[t]+a+65535)/65536),e[t]=r-65536*a;e[0]+=a-1+37*(a-1)}function nv(e,t,r){for(var a,o=~(r-1),n=0;n<16;++n)e[n]^=a=o&(e[n]^t[n]),t[n]^=a}function nx(e){var t,r=new Float64Array(16);if(e)for(t=0;t<e.length;++t)r[t]=e[t];return r}function nz(e,t,r){for(var a=0;a<16;++a)e[a]=t[a]+r[a]}function nC(e,t,r){for(var a=0;a<16;++a)e[a]=t[a]-r[a]}function nw(e,t,r){var a,o,n=0,i=0,s=0,l=0,c=0,d=0,m=0,p=0,u=0,h=0,f=0,y=0,g=0,b=0,k=0,v=0,x=0,z=0,C=0,w=0,S=0,_=0,E=0,N=0,I=0,T=0,A=0,j=0,P=0,B=0,R=0,O=r[0],L=r[1],D=r[2],U=r[3],M=r[4],F=r[5],V=r[6],K=r[7],q=r[8],H=r[9],G=r[10],$=r[11],W=r[12],Y=r[13],Q=r[14],X=r[15];n+=(a=t[0])*O,i+=a*L,s+=a*D,l+=a*U,c+=a*M,d+=a*F,m+=a*V,p+=a*K,u+=a*q,h+=a*H,f+=a*G,y+=a*$,g+=a*W,b+=a*Y,k+=a*Q,v+=a*X,i+=(a=t[1])*O,s+=a*L,l+=a*D,c+=a*U,d+=a*M,m+=a*F,p+=a*V,u+=a*K,h+=a*q,f+=a*H,y+=a*G,g+=a*$,b+=a*W,k+=a*Y,v+=a*Q,x+=a*X,s+=(a=t[2])*O,l+=a*L,c+=a*D,d+=a*U,m+=a*M,p+=a*F,u+=a*V,h+=a*K,f+=a*q,y+=a*H,g+=a*G,b+=a*$,k+=a*W,v+=a*Y,x+=a*Q,z+=a*X,l+=(a=t[3])*O,c+=a*L,d+=a*D,m+=a*U,p+=a*M,u+=a*F,h+=a*V,f+=a*K,y+=a*q,g+=a*H,b+=a*G,k+=a*$,v+=a*W,x+=a*Y,z+=a*Q,C+=a*X,c+=(a=t[4])*O,d+=a*L,m+=a*D,p+=a*U,u+=a*M,h+=a*F,f+=a*V,y+=a*K,g+=a*q,b+=a*H,k+=a*G,v+=a*$,x+=a*W,z+=a*Y,C+=a*Q,w+=a*X,d+=(a=t[5])*O,m+=a*L,p+=a*D,u+=a*U,h+=a*M,f+=a*F,y+=a*V,g+=a*K,b+=a*q,k+=a*H,v+=a*G,x+=a*$,z+=a*W,C+=a*Y,w+=a*Q,S+=a*X,m+=(a=t[6])*O,p+=a*L,u+=a*D,h+=a*U,f+=a*M,y+=a*F,g+=a*V,b+=a*K,k+=a*q,v+=a*H,x+=a*G,z+=a*$,C+=a*W,w+=a*Y,S+=a*Q,_+=a*X,p+=(a=t[7])*O,u+=a*L,h+=a*D,f+=a*U,y+=a*M,g+=a*F,b+=a*V,k+=a*K,v+=a*q,x+=a*H,z+=a*G,C+=a*$,w+=a*W,S+=a*Y,_+=a*Q,E+=a*X,u+=(a=t[8])*O,h+=a*L,f+=a*D,y+=a*U,g+=a*M,b+=a*F,k+=a*V,v+=a*K,x+=a*q,z+=a*H,C+=a*G,w+=a*$,S+=a*W,_+=a*Y,E+=a*Q,N+=a*X,h+=(a=t[9])*O,f+=a*L,y+=a*D,g+=a*U,b+=a*M,k+=a*F,v+=a*V,x+=a*K,z+=a*q,C+=a*H,w+=a*G,S+=a*$,_+=a*W,E+=a*Y,N+=a*Q,I+=a*X,f+=(a=t[10])*O,y+=a*L,g+=a*D,b+=a*U,k+=a*M,v+=a*F,x+=a*V,z+=a*K,C+=a*q,w+=a*H,S+=a*G,_+=a*$,E+=a*W,N+=a*Y,I+=a*Q,T+=a*X,y+=(a=t[11])*O,g+=a*L,b+=a*D,k+=a*U,v+=a*M,x+=a*F,z+=a*V,C+=a*K,w+=a*q,S+=a*H,_+=a*G,E+=a*$,N+=a*W,I+=a*Y,T+=a*Q,A+=a*X,g+=(a=t[12])*O,b+=a*L,k+=a*D,v+=a*U,x+=a*M,z+=a*F,C+=a*V,w+=a*K,S+=a*q,_+=a*H,E+=a*G,N+=a*$,I+=a*W,T+=a*Y,A+=a*Q,j+=a*X,b+=(a=t[13])*O,k+=a*L,v+=a*D,x+=a*U,z+=a*M,C+=a*F,w+=a*V,S+=a*K,_+=a*q,E+=a*H,N+=a*G,I+=a*$,T+=a*W,A+=a*Y,j+=a*Q,P+=a*X,k+=(a=t[14])*O,v+=a*L,x+=a*D,z+=a*U,C+=a*M,w+=a*F,S+=a*V,_+=a*K,E+=a*q,N+=a*H,I+=a*G,T+=a*$,A+=a*W,j+=a*Y,P+=a*Q,B+=a*X,v+=(a=t[15])*O,i+=38*(z+=a*D),s+=38*(C+=a*U),l+=38*(w+=a*M),c+=38*(S+=a*F),d+=38*(_+=a*V),m+=38*(E+=a*K),p+=38*(N+=a*q),u+=38*(I+=a*H),h+=38*(T+=a*G),f+=38*(A+=a*$),y+=38*(j+=a*W),g+=38*(P+=a*Y),b+=38*(B+=a*Q),k+=38*(R+=a*X),n=(a=(n+=38*(x+=a*L))+(o=1)+65535)-65536*(o=Math.floor(a/65536)),i=(a=i+o+65535)-65536*(o=Math.floor(a/65536)),s=(a=s+o+65535)-65536*(o=Math.floor(a/65536)),l=(a=l+o+65535)-65536*(o=Math.floor(a/65536)),c=(a=c+o+65535)-65536*(o=Math.floor(a/65536)),d=(a=d+o+65535)-65536*(o=Math.floor(a/65536)),m=(a=m+o+65535)-65536*(o=Math.floor(a/65536)),p=(a=p+o+65535)-65536*(o=Math.floor(a/65536)),u=(a=u+o+65535)-65536*(o=Math.floor(a/65536)),h=(a=h+o+65535)-65536*(o=Math.floor(a/65536)),f=(a=f+o+65535)-65536*(o=Math.floor(a/65536)),y=(a=y+o+65535)-65536*(o=Math.floor(a/65536)),g=(a=g+o+65535)-65536*(o=Math.floor(a/65536)),b=(a=b+o+65535)-65536*(o=Math.floor(a/65536)),k=(a=k+o+65535)-65536*(o=Math.floor(a/65536)),v=(a=v+o+65535)-65536*(o=Math.floor(a/65536)),n=(a=(n+=o-1+37*(o-1))+(o=1)+65535)-65536*(o=Math.floor(a/65536)),i=(a=i+o+65535)-65536*(o=Math.floor(a/65536)),s=(a=s+o+65535)-65536*(o=Math.floor(a/65536)),l=(a=l+o+65535)-65536*(o=Math.floor(a/65536)),c=(a=c+o+65535)-65536*(o=Math.floor(a/65536)),d=(a=d+o+65535)-65536*(o=Math.floor(a/65536)),m=(a=m+o+65535)-65536*(o=Math.floor(a/65536)),p=(a=p+o+65535)-65536*(o=Math.floor(a/65536)),u=(a=u+o+65535)-65536*(o=Math.floor(a/65536)),h=(a=h+o+65535)-65536*(o=Math.floor(a/65536)),f=(a=f+o+65535)-65536*(o=Math.floor(a/65536)),y=(a=y+o+65535)-65536*(o=Math.floor(a/65536)),g=(a=g+o+65535)-65536*(o=Math.floor(a/65536)),b=(a=b+o+65535)-65536*(o=Math.floor(a/65536)),k=(a=k+o+65535)-65536*(o=Math.floor(a/65536)),v=(a=v+o+65535)-65536*(o=Math.floor(a/65536)),e[0]=n+=o-1+37*(o-1),e[1]=i,e[2]=s,e[3]=l,e[4]=c,e[5]=d,e[6]=m,e[7]=p,e[8]=u,e[9]=h,e[10]=f,e[11]=y,e[12]=g,e[13]=b,e[14]=k,e[15]=v}r1.kem=r1.kem||{};var nS=r1.jsbn.BigInteger;function n_(e,t,r,a){e.generate=function(e,o){for(var n=new r1.util.ByteBuffer,i=Math.ceil(o/a)+r,s=new r1.util.ByteBuffer,l=r;l<i;++l){s.putInt32(l),t.start(),t.update(e+s.getBytes());var c=t.digest();n.putBytes(c.getBytes(a))}return n.truncate(n.length()-o),n.getBytes()}}r1.kem.rsa={},r1.kem.rsa.create=function(e,t){var r=(t=t||{}).prng||r1.random;return{encrypt:function(t,a){var o,n=Math.ceil(t.n.bitLength()/8);do o=new nS(r1.util.bytesToHex(r.getBytesSync(n)),16).mod(t.n);while(0>=o.compareTo(nS.ONE))var i=n-(o=r1.util.hexToBytes(o.toString(16))).length;return i>0&&(o=r1.util.fillString("\0",i)+o),{encapsulation:t.encrypt(o,"NONE"),key:e.generate(o,a)}},decrypt:function(t,r,a){var o=t.decrypt(r,"NONE");return e.generate(o,a)}}},r1.kem.kdf1=function(e,t){n_(this,e,0,t||e.digestLength)},r1.kem.kdf2=function(e,t){n_(this,e,1,t||e.digestLength)},r1.log=r1.log||{},r1.log.levels=["none","error","warning","info","debug","verbose","max"];var nE={},nN=[],nI=null;r1.log.LEVEL_LOCKED=2,r1.log.NO_LEVEL_CHECK=4,r1.log.INTERPOLATE=8;for(var nT=0;nT<r1.log.levels.length;++nT){var nA=r1.log.levels[nT];nE[nA]={index:nT,name:nA.toUpperCase()}}r1.log.logMessage=function(e){for(var t=nE[e.level].index,r=0;r<nN.length;++r){var a=nN[r];a.flags&r1.log.NO_LEVEL_CHECK?a.f(e):t<=nE[a.level].index&&a.f(a,e)}},r1.log.prepareStandard=function(e){"standard"in e||(e.standard=nE[e.level].name+" ["+e.category+"] "+e.message)},r1.log.prepareFull=function(e){if(!("full"in e)){var t=[e.message];t=t.concat([]),e.full=r1.util.format.apply(this,t)}},r1.log.prepareStandardFull=function(e){"standardFull"in e||(r1.log.prepareStandard(e),e.standardFull=e.standard)};var nj=["error","warning","info","debug","verbose"];for(nT=0;nT<nj.length;++nT)!function(e){r1.log[e]=function(t,r){var a=Array.prototype.slice.call(arguments).slice(2),o={timestamp:new Date,level:e,category:t,message:r,arguments:a};r1.log.logMessage(o)}}(nj[nT]);if(r1.log.makeLogger=function(e){var t={flags:0,f:e};return r1.log.setLevel(t,"none"),t},r1.log.setLevel=function(e,t){var r=!1;if(e&&!(e.flags&r1.log.LEVEL_LOCKED)){for(var a=0;a<r1.log.levels.length;++a)if(t==r1.log.levels[a]){e.level=t,r=!0;break}}return r},r1.log.lock=function(e,t){void 0===t||t?e.flags|=r1.log.LEVEL_LOCKED:e.flags&=~r1.log.LEVEL_LOCKED},r1.log.addLogger=function(e){nN.push(e)},"u">typeof console&&"log"in console){if(console.error&&console.warn&&console.info&&console.debug){var nP={error:console.error,warning:console.warn,info:console.info,debug:console.debug,verbose:console.debug},nB=function(e,t){r1.log.prepareStandard(t);var r=nP[t.level],a=[t.standard];a=a.concat(t.arguments.slice()),r.apply(console,a)};t=r1.log.makeLogger(nB)}else nB=function(e,t){r1.log.prepareStandardFull(t),console.log(t.standardFull)},t=r1.log.makeLogger(nB);r1.log.setLevel(t,"debug"),r1.log.addLogger(t),nI=t}else console={log:function(){}};if(null!==nI&&"u">typeof window&&window.location){var nR=new URL(window.location.href).searchParams;nR.has("console.level")&&r1.log.setLevel(nI,nR.get("console.level").slice(-1)[0]),nR.has("console.lock")&&"true"==nR.get("console.lock").slice(-1)[0]&&r1.log.lock(nI)}r1.log.consoleLogger=nI,r5(function(e){var t=r1.asn1,r=e.exports=r1.pkcs7=r1.pkcs7||{};function a(e){var r;if(e.type===r1.pki.oids.contentType)r=t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.value).getBytes());else if(e.type===r1.pki.oids.messageDigest)r=t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,e.value.bytes());else if(e.type===r1.pki.oids.signingTime){var a=new Date("1950-01-01T00:00:00Z"),o=new Date("2050-01-01T00:00:00Z"),n=e.value;if("string"==typeof n){var i=Date.parse(n);n=isNaN(i)?13===n.length?t.utcTimeToDate(n):t.generalizedTimeToDate(n):new Date(i)}r=n>=a&&n<o?t.create(t.Class.UNIVERSAL,t.Type.UTCTIME,!1,t.dateToUtcTime(n)):t.create(t.Class.UNIVERSAL,t.Type.GENERALIZEDTIME,!1,t.dateToGeneralizedTime(n))}return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.type).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[r])])}function o(e,r,a){var o={};if(!t.validate(r,a,o,[])){var n=Error("Cannot read PKCS#7 message. ASN.1 object is not a supported PKCS#7 message.");throw n.errors=n,n}if(t.derToOid(o.contentType)!==r1.pki.oids.data)throw Error("Unsupported PKCS#7 message. Only wrapped ContentType Data supported.");if(o.encryptedContent){var i="";if(r1.util.isArray(o.encryptedContent))for(var s=0;s<o.encryptedContent.length;++s){if(o.encryptedContent[s].type!==t.Type.OCTETSTRING)throw Error("Malformed PKCS#7 message, expecting encrypted content constructed of only OCTET STRING objects.");i+=o.encryptedContent[s].value}else i=o.encryptedContent;e.encryptedContent={algorithm:t.derToOid(o.encAlgorithm),parameter:r1.util.createBuffer(o.encParameter.value),content:r1.util.createBuffer(i)}}if(o.content){if(i="",r1.util.isArray(o.content))for(s=0;s<o.content.length;++s){if(o.content[s].type!==t.Type.OCTETSTRING)throw Error("Malformed PKCS#7 message, expecting content constructed of only OCTET STRING objects.");i+=o.content[s].value}else i=o.content;e.content=r1.util.createBuffer(i)}return e.version=o.version.charCodeAt(0),e.rawCapture=o,o}function n(e){if(void 0===e.encryptedContent.key)throw Error("Symmetric key not available.");if(void 0===e.content){var t;switch(e.encryptedContent.algorithm){case r1.pki.oids["aes128-CBC"]:case r1.pki.oids["aes192-CBC"]:case r1.pki.oids["aes256-CBC"]:t=r1.aes.createDecryptionCipher(e.encryptedContent.key);break;case r1.pki.oids.desCBC:case r1.pki.oids["des-EDE3-CBC"]:t=r1.des.createDecryptionCipher(e.encryptedContent.key);break;default:throw Error("Unsupported symmetric cipher, OID "+e.encryptedContent.algorithm)}if(t.start(e.encryptedContent.parameter),t.update(e.encryptedContent.content),!t.finish())throw Error("Symmetric decryption failed.");e.content=t.output}}r.messageFromPem=function(e){var a=r1.pem.decode(e)[0];if("PKCS7"!==a.type){var o=Error('Could not convert PKCS#7 message from PEM; PEM header type is not "PKCS#7".');throw o.headerType=a.type,o}if(a.procType&&"ENCRYPTED"===a.procType.type)throw Error("Could not convert PKCS#7 message from PEM; PEM is encrypted.");var n=t.fromDer(a.body);return r.messageFromAsn1(n)},r.messageToPem=function(e,r){var a={type:"PKCS7",body:t.toDer(e.toAsn1()).getBytes()};return r1.pem.encode(a,{maxline:r})},r.messageFromAsn1=function(e){var a={},o=[];if(!t.validate(e,r.asn1.contentInfoValidator,a,o)){var n=Error("Cannot read PKCS#7 message. ASN.1 object is not an PKCS#7 ContentInfo.");throw n.errors=o,n}var i,s=t.derToOid(a.contentType);switch(s){case r1.pki.oids.envelopedData:i=r.createEnvelopedData();break;case r1.pki.oids.encryptedData:i=r.createEncryptedData();break;case r1.pki.oids.signedData:i=r.createSignedData();break;default:throw Error("Cannot read PKCS#7 message. ContentType with OID "+s+" is not (yet) supported.")}return i.fromAsn1(a.content.value[0]),i},r.createSignedData=function(){var e=null;return e={type:r1.pki.oids.signedData,version:1,certificates:[],crls:[],signers:[],digestAlgorithmIdentifiers:[],contentInfo:null,signerInfos:[],fromAsn1:function(t){if(o(e,t,r.asn1.signedDataValidator),e.certificates=[],e.crls=[],e.digestAlgorithmIdentifiers=[],e.contentInfo=null,e.signerInfos=[],e.rawCapture.certificates)for(var a=e.rawCapture.certificates.value,n=0;n<a.length;++n)e.certificates.push(r1.pki.certificateFromAsn1(a[n]))},toAsn1:function(){e.contentInfo||e.sign();for(var r=[],a=0;a<e.certificates.length;++a)r.push(r1.pki.certificateToAsn1(e.certificates[a]));var o=[],n=t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(e.version).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,e.digestAlgorithmIdentifiers),e.contentInfo])]);return r.length>0&&n.value[0].value.push(t.create(t.Class.CONTEXT_SPECIFIC,0,!0,r)),o.length>0&&n.value[0].value.push(t.create(t.Class.CONTEXT_SPECIFIC,1,!0,o)),n.value[0].value.push(t.create(t.Class.UNIVERSAL,t.Type.SET,!0,e.signerInfos)),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.type).getBytes()),n])},addSigner:function(t){var r=t.issuer,a=t.serialNumber;if(t.certificate){var o=t.certificate;"string"==typeof o&&(o=r1.pki.certificateFromPem(o)),r=o.issuer.attributes,a=o.serialNumber}var n=t.key;if(!n)throw Error("Could not add PKCS#7 signer; no private key specified.");"string"==typeof n&&(n=r1.pki.privateKeyFromPem(n));var i=t.digestAlgorithm||r1.pki.oids.sha1;switch(i){case r1.pki.oids.sha1:case r1.pki.oids.sha256:case r1.pki.oids.sha384:case r1.pki.oids.sha512:case r1.pki.oids.md5:break;default:throw Error("Could not add PKCS#7 signer; unknown message digest algorithm: "+i)}var s=t.authenticatedAttributes||[];if(s.length>0){for(var l=!1,c=!1,d=0;d<s.length;++d){var m=s[d];if(l||m.type!==r1.pki.oids.contentType){if(c||m.type!==r1.pki.oids.messageDigest);else if(c=!0,l)break}else if(l=!0,c)break}if(!l||!c)throw Error("Invalid signer.authenticatedAttributes. If signer.authenticatedAttributes is specified, then it must contain at least two attributes, PKCS #9 content-type and PKCS #9 message-digest.")}e.signers.push({key:n,version:1,issuer:r,serialNumber:a,digestAlgorithm:i,signatureAlgorithm:r1.pki.oids.rsaEncryption,signature:null,authenticatedAttributes:s,unauthenticatedAttributes:[]})},sign:function(r){var o;r=r||{},("object"!=typeof e.content||null===e.contentInfo)&&(e.contentInfo=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r1.pki.oids.data).getBytes())]),"content"in e&&(e.content instanceof r1.util.ByteBuffer?o=e.content.bytes():"string"==typeof e.content&&(o=r1.util.encodeUtf8(e.content)),r.detached?e.detachedContent=t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,o):e.contentInfo.value.push(t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,o)])))),0!==e.signers.length&&function(r){if(!(o=e.detachedContent?e.detachedContent:(o=e.contentInfo.value[1]).value[0]))throw Error("Could not sign PKCS#7 message; there is no content to sign.");var o,n=t.derToOid(e.contentInfo.value[0].value),i=t.toDer(o);for(var s in i.getByte(),t.getBerValueLength(i),i=i.getBytes(),r)r[s].start().update(i);for(var l=new Date,c=0;c<e.signers.length;++c){var d=e.signers[c];if(0===d.authenticatedAttributes.length){if(n!==r1.pki.oids.data)throw Error("Invalid signer; authenticatedAttributes must be present when the ContentInfo content type is not PKCS#7 Data.")}else{d.authenticatedAttributesAsn1=t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[]);for(var m=t.create(t.Class.UNIVERSAL,t.Type.SET,!0,[]),p=0;p<d.authenticatedAttributes.length;++p){var u=d.authenticatedAttributes[p];u.type===r1.pki.oids.messageDigest?u.value=r[d.digestAlgorithm].digest():u.type===r1.pki.oids.signingTime&&(u.value||(u.value=l)),m.value.push(a(u)),d.authenticatedAttributesAsn1.value.push(a(u))}i=t.toDer(m).getBytes(),d.md.start().update(i)}d.signature=d.key.sign(d.md,"RSASSA-PKCS1-V1_5")}e.signerInfos=function(e){for(var r=[],o=0;o<e.length;++o)r.push(function(e){var r=t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(e.version).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[r1.pki.distinguishedNameToAsn1({attributes:e.issuer}),t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,r1.util.hexToBytes(e.serialNumber))]),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.digestAlgorithm).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")])]);if(e.authenticatedAttributesAsn1&&r.value.push(e.authenticatedAttributesAsn1),r.value.push(t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.signatureAlgorithm).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")])),r.value.push(t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,e.signature)),e.unauthenticatedAttributes.length>0){for(var o=t.create(t.Class.CONTEXT_SPECIFIC,1,!0,[]),n=0;n<e.unauthenticatedAttributes.length;++n)o.values.push(a(e.unauthenticatedAttributes[n]));r.value.push(o)}return r}(e[o]));return r}(e.signers)}(function(){for(var r={},a=0;a<e.signers.length;++a){var o=e.signers[a];(n=o.digestAlgorithm)in r||(r[n]=r1.md[r1.pki.oids[n]].create()),o.md=0===o.authenticatedAttributes.length?r[n]:r1.md[r1.pki.oids[n]].create()}for(var n in e.digestAlgorithmIdentifiers=[],r)e.digestAlgorithmIdentifiers.push(t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(n).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")]));return r}())},verify:function(){throw Error("PKCS#7 signature verification not yet implemented.")},addCertificate:function(t){"string"==typeof t&&(t=r1.pki.certificateFromPem(t)),e.certificates.push(t)},addCertificateRevokationList:function(e){throw Error("PKCS#7 CRL support not yet implemented.")}}},r.createEncryptedData=function(){var e=null;return e={type:r1.pki.oids.encryptedData,version:0,encryptedContent:{algorithm:r1.pki.oids["aes256-CBC"]},fromAsn1:function(t){o(e,t,r.asn1.encryptedDataValidator)},decrypt:function(t){void 0!==t&&(e.encryptedContent.key=t),n(e)}}},r.createEnvelopedData=function(){var e=null;return e={type:r1.pki.oids.envelopedData,version:0,recipients:[],encryptedContent:{algorithm:r1.pki.oids["aes256-CBC"]},fromAsn1:function(a){var n=o(e,a,r.asn1.envelopedDataValidator);e.recipients=function(e){for(var a=[],o=0;o<e.length;++o)a.push(function(e){var a={},o=[];if(!t.validate(e,r.asn1.recipientInfoValidator,a,o)){var n=Error("Cannot read PKCS#7 RecipientInfo. ASN.1 object is not an PKCS#7 RecipientInfo.");throw n.errors=o,n}return{version:a.version.charCodeAt(0),issuer:r1.pki.RDNAttributesAsArray(a.issuer),serialNumber:r1.util.createBuffer(a.serial).toHex(),encryptedContent:{algorithm:t.derToOid(a.encAlgorithm),parameter:a.encParameter?a.encParameter.value:void 0,content:a.encKey}}}(e[o]));return a}(n.recipientInfos.value)},toAsn1:function(){var r;return t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(e.type).getBytes()),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer(e.version).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SET,!0,function(e){for(var r,a=[],o=0;o<e.length;++o)a.push(t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,t.integerToDer((r=e[o]).version).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[r1.pki.distinguishedNameToAsn1({attributes:r.issuer}),t.create(t.Class.UNIVERSAL,t.Type.INTEGER,!1,r1.util.hexToBytes(r.serialNumber))]),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.encryptedContent.algorithm).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.NULL,!1,"")]),t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,r.encryptedContent.content)]));return a}(e.recipients)),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,(r=e.encryptedContent,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r1.pki.oids.data).getBytes()),t.create(t.Class.UNIVERSAL,t.Type.SEQUENCE,!0,[t.create(t.Class.UNIVERSAL,t.Type.OID,!1,t.oidToDer(r.algorithm).getBytes()),r.parameter?t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,r.parameter.getBytes()):void 0]),t.create(t.Class.CONTEXT_SPECIFIC,0,!0,[t.create(t.Class.UNIVERSAL,t.Type.OCTETSTRING,!1,r.content.getBytes())])]))])])])},findRecipient:function(t){for(var r=t.issuer.attributes,a=0;a<e.recipients.length;++a){var o=e.recipients[a],n=o.issuer;if(o.serialNumber===t.serialNumber&&n.length===r.length){for(var i=!0,s=0;s<r.length;++s)if(n[s].type!==r[s].type||n[s].value!==r[s].value){i=!1;break}if(i)return o}}return null},decrypt:function(t,r){if(void 0===e.encryptedContent.key&&void 0!==t&&void 0!==r)switch(t.encryptedContent.algorithm){case r1.pki.oids.rsaEncryption:case r1.pki.oids.desCBC:var a=r.decrypt(t.encryptedContent.content);e.encryptedContent.key=r1.util.createBuffer(a);break;default:throw Error("Unsupported asymmetric cipher, OID "+t.encryptedContent.algorithm)}n(e)},addRecipient:function(t){e.recipients.push({version:0,issuer:t.issuer.attributes,serialNumber:t.serialNumber,encryptedContent:{algorithm:r1.pki.oids.rsaEncryption,key:t.publicKey}})},encrypt:function(t,r){if(void 0===e.encryptedContent.content){switch(t=t||e.encryptedContent.key,r=r||e.encryptedContent.algorithm){case r1.pki.oids["aes128-CBC"]:a=16,o=16,n=r1.aes.createEncryptionCipher;break;case r1.pki.oids["aes192-CBC"]:a=24,o=16,n=r1.aes.createEncryptionCipher;break;case r1.pki.oids["aes256-CBC"]:a=32,o=16,n=r1.aes.createEncryptionCipher;break;case r1.pki.oids["des-EDE3-CBC"]:a=24,o=8,n=r1.des.createEncryptionCipher;break;default:throw Error("Unsupported symmetric cipher, OID "+r)}if(void 0===t)t=r1.util.createBuffer(r1.random.getBytes(a));else if(t.length()!=a)throw Error("Symmetric key has wrong length; got "+t.length()+" bytes, expected "+a+".");e.encryptedContent.algorithm=r,e.encryptedContent.key=t,e.encryptedContent.parameter=r1.util.createBuffer(r1.random.getBytes(o));var a,o,n,i=n(t);if(i.start(e.encryptedContent.parameter.copy()),i.update(e.content),!i.finish())throw Error("Symmetric encryption failed.");e.encryptedContent.content=i.output}for(var s=0;s<e.recipients.length;++s){var l=e.recipients[s];if(void 0===l.encryptedContent.content){if(l.encryptedContent.algorithm!==r1.pki.oids.rsaEncryption)throw Error("Unsupported asymmetric cipher, OID "+l.encryptedContent.algorithm);l.encryptedContent.content=l.encryptedContent.key.encrypt(e.encryptedContent.key.data)}}}}}}),r5(function(e){var t=e.exports=r1.ssh=r1.ssh||{};function r(e,t){var r=t.toString(16);r[0]>="8"&&(r="00"+r);var a=r1.util.hexToBytes(r);e.putInt32(a.length),e.putBytes(a)}function a(e,t){e.putInt32(t.length),e.putString(t)}function o(){for(var e=r1.md.sha1.create(),t=arguments.length,r=0;r<t;++r)e.update(arguments[r]);return e.digest()}t.privateKeyToPutty=function(e,t,n){var i="ssh-rsa",s=""===(t=t||"")?"none":"aes256-cbc",l="PuTTY-User-Key-File-2: "+i+"\r\n";l+="Encryption: "+s+"\r\n",l+="Comment: "+(n=n||"")+"\r\n";var c=r1.util.createBuffer();a(c,i),r(c,e.e),r(c,e.n);var d=r1.util.encode64(c.bytes(),64),m=Math.floor(d.length/66)+1;l+="Public-Lines: "+m+"\r\n",l+=d;var p,u=r1.util.createBuffer();if(r(u,e.d),r(u,e.p),r(u,e.q),r(u,e.qInv),t){var h=u.length()+16-1;h-=h%16;var f=o(u.bytes());f.truncate(f.length()-h+u.length()),u.putBuffer(f);var y=r1.util.createBuffer();y.putBuffer(o("\0\0\0\0",t)),y.putBuffer(o("\0\0\0\x01",t));var g=r1.aes.createEncryptionCipher(y.truncate(8),"CBC");g.start(r1.util.createBuffer().fillWithByte(0,16)),g.update(u.copy()),g.finish();var b=g.output;b.truncate(16),p=r1.util.encode64(b.bytes(),64)}else p=r1.util.encode64(u.bytes(),64);l+="\r\nPrivate-Lines: "+(m=Math.floor(p.length/66)+1)+"\r\n",l+=p;var k=o("putty-private-key-file-mac-key",t),v=r1.util.createBuffer();a(v,i),a(v,s),a(v,n),v.putInt32(c.length()),v.putBuffer(c),v.putInt32(u.length()),v.putBuffer(u);var x=r1.hmac.create();return x.start("sha1",k),x.update(v.bytes()),l+"\r\nPrivate-MAC: "+x.digest().toHex()+"\r\n"},t.publicKeyToOpenSSH=function(e,t){var o="ssh-rsa";t=t||"";var n=r1.util.createBuffer();return a(n,o),r(n,e.e),r(n,e.n),o+" "+r1.util.encode64(n.bytes())+" "+t},t.privateKeyToOpenSSH=function(e,t){return t?r1.pki.encryptRsaPrivateKey(e,t,{legacy:!0,algorithm:"aes128"}):r1.pki.privateKeyToPem(e)},t.getPublicKeyFingerprint=function(e,t){var o=(t=t||{}).md||r1.md.md5.create(),n=r1.util.createBuffer();a(n,"ssh-rsa"),r(n,e.e),r(n,e.n),o.start(),o.update(n.getBytes());var i=o.digest();if("hex"===t.encoding){var s=i.toHex();return t.delimiter?s.match(/.{2}/g).join(t.delimiter):s}if("binary"===t.encoding)return i.getBytes();if(t.encoding)throw Error('Unknown encoding "'+t.encoding+'".');return i}});let nO={applePayPaymentProductId:302,paymentProductsThatAreNotSupportedInThisBrowser:[],paymentProductsThatAreNotSupportedBySDK:[117,5700,5772,5784],isSupportedPaymentProductInBrowser(e){return!this.paymentProductsThatAreNotSupportedInThisBrowser.includes(e)},isSupportedPaymentProductBySdk(e){return!this.paymentProductsThatAreNotSupportedBySDK.includes(e)},getMetadata(){var e;let t=null==(e=document.GC)?void 0:e.rppEnabledPage;return{screenSize:`${window.innerWidth}x${window.innerHeight}`,platformIdentifier:"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0",sdkIdentifier:(t?"rpp-":"")+"JavaScriptClientSDK/v3.6.2",sdkCreator:"OnlinePayments"}},collectDeviceInformation:()=>({timezoneOffsetUtcMinutes:(new Date).getTimezoneOffset(),locale:window.navigator.language,browserData:{javaScriptEnabled:!0,colorDepth:screen.colorDepth,screenHeight:screen.height,screenWidth:screen.width,innerHeight:window.innerHeight,innerWidth:window.innerWidth}}),filterOutProductsThatAreNotSupportedInThisBrowser(e){e.paymentProducts&&(e.paymentProducts=e.paymentProducts.filter(({id:e})=>this.isSupportedPaymentProductInBrowser(e)))},filterOutProductsThatAreNotSupportedBySdk(e){e.paymentProducts&&(e.paymentProducts=e.paymentProducts.filter(({id:e})=>this.isSupportedPaymentProductBySdk(e)))},url:{segmentsToPath:e=>e.map(e=>e.replace(/^\/+|\/+$/g,"")).join("/"),objectToQueryString(e){let t=new URLSearchParams;for(let r of Object.keys(e)){let a=e[r];a&&t.set(r,a.toString())}return t.toString()},urlWithQueryString(e,t){let r=new URL(e);return r.search=this.objectToQueryString(t),r.href}}};function nL(e){return(e=(e=(e=r1.util.encode64(e)).split("=")[0]).replace(/\+/g,"-")).replace(/\//g,"_")}class nD{encrypt(e,t){var r;let a,o,n,i,s,l,c,d,m,p=JSON.stringify(e),u=nL(JSON.stringify({alg:"RSA-OAEP",enc:"A256CBC-HS512",kid:t.keyId})),h=r1.random.getBytesSync(64),f=nL((r=t.publicKey,a=r1.util.decode64(r),o=r1.util.createBuffer(a,"raw"),n=r1.asn1.fromDer(o),r1.pki.publicKeyFromAsn1(n)).encrypt(h,"RSA-OAEP")),y=h.substring(0,32),g=h.substring(32),b=r1.random.getBytesSync(16),k=nL(b),v=((i=r1.cipher.createCipher("AES-CBC",g)).start({iv:b}),i.update(r1.util.createBuffer(p,"utf8")),i.finish(),i.output.bytes()),x=nL(v),z=(s=8*r1.util.createBuffer(u).length(),(l=r1.util.createBuffer()).putInt32(0),l.putInt32(s),l.bytes()),C=((c=r1.util.createBuffer()).putBytes(u),c.putBytes(b),c.putBytes(v),c.putBytes(z),d=c.bytes(),(m=r1.hmac.create()).start("sha512",y),m.update(d),m.digest().bytes());return`${u}.${f}.${k}.${x}.${nL(C.substring(0,C.length/2))}`}}class nU extends Error{constructor(e,t=[]){super(e),this.errors=void 0,this.errors=t}}var nM=rT("publicKeyResponsePromise"),nF=rT("clientSessionId"),nV=rT("createEncryptedConsumerInputFromTokenRequest"),nK=rT("createEncryptedConsumerInput");class nq{constructor(e,t){Object.defineProperty(this,nK,{value:nG}),Object.defineProperty(this,nV,{value:nH}),Object.defineProperty(this,nM,{writable:!0,value:void 0}),Object.defineProperty(this,nF,{writable:!0,value:void 0}),rN(this,nM)[nM]=e,rN(this,nF)[nF]=t}async encrypt(e){if(!e.isValid())throw new nU("Error encrypting payment request: the payment request is not valid.",e.getErrorMessageIds());let t=await rN(this,nM)[nM];return(new nD).encrypt(rN(this,nK)[nK](e,rN(this,nF)[nF]),t)}async encryptTokenRequest(e){let t=await rN(this,nM)[nM],r=new nD,a=rN(this,nV)[nV](e,rN(this,nF)[nF]);return r.encrypt(a,t)}}function nH(e,t){let r=e.getValues();if(!e.getPaymentProductId())throw new nU("Error encrypting credit card token request: the payment product ID not set.",["paymentProductId"]);return{clientSessionId:t,nonce:r1.util.bytesToHex(r1.random.getBytesSync(16)),paymentProductId:e.getPaymentProductId(),collectedDeviceInformation:nO.collectDeviceInformation(),paymentValues:Object.keys(r).map(e=>({key:e,value:r[e]}))}}function nG(e,t){let r=e.getUnmaskedValues(),a={clientSessionId:t,nonce:r1.util.bytesToHex(r1.random.getBytesSync(16)),paymentProductId:e.getPaymentProductId(),tokenize:e.getTokenize(),collectedDeviceInformation:nO.collectDeviceInformation(),paymentValues:Object.keys(r).map(e=>({key:e,value:r[e]}))},o=e.getAccountOnFile();return o&&(a.accountOnFileId=o.id),a}var n$=rT("sanitizeClientApiUrl");class nW{constructor(e){Object.defineProperty(this,n$,{value:nY}),this.clientSessionId=void 0,this.customerId=void 0,this.clientApiUrl=void 0,this.assetUrl=void 0;const t=rA({},e);[["clientSessionID","clientSessionId"],["assetsBaseUrl","assetUrl"],["apiBaseUrl","clientApiUrl"]].forEach(([e,r])=>{if(!t[r]&&t[e])t[r]=t[e];else{if(t[e])throw Error(`You cannot use both the ${r} and the ${e} properties. Please use the ${r} only.`);if(!t[r])throw Error(`The SessionDetails parameter '${r}' is mandatory.`)}}),this.clientSessionId=t.clientSessionId,this.customerId=t.customerId,this.clientApiUrl=t.clientApiUrl,this.assetUrl=t.assetUrl;try{this.clientApiUrl=rN(this,n$)[n$](this.clientApiUrl)}catch(e){throw Error(`A valid URL is required for the 'clientApiUrl', you provided '${this.clientApiUrl}'`)}}}function nY(e){let t=new URL(e),r=t.pathname.split("/").filter(Boolean);if(r.length||r.push("client"),r.length>1||"client"!==r[0])throw Error(`The path is unexpected, you supplied: '${t.pathname}'. It should be empty or /client'.`);return t.pathname=r.join("/"),t.href}class nQ{isApplePayAvailable(){return Object.hasOwn(window,"ApplePaySession")&&ApplePaySession.canMakePayments()}}let nX=["headers"],nZ={"Content-Type":"application/json",Accept:"text/javascript, application/json, text/html, application/xml, text/xml, */*"};async function nJ({ok:e,status:t},r){return e||304===t||0===t&&!!r}async function n0(e,t){let{headers:r}=t,a=function(e,t){if(null==e)return{};var r={};for(var a in e)if(({}).hasOwnProperty.call(e,a)){if(-1!==t.indexOf(a))continue;r[a]=e[a]}return r}(t,nX),o=await fetch(e,rA({},a,{headers:r?rA({},nZ,r):nZ})),n=await async function(e){return(e.headers.get("content-type")||"").includes("application/json")?e.json():e.text()}(o);return{status:o.status,success:await nJ(o,n),data:n}}let n1=async(e,t={})=>n0(e,rA({method:"GET"},t)),n2=async(e,t={})=>n0(e,rA({method:"POST"},t));class n5{constructor(e,t){this.status=void 0,this.json=void 0,this.countryCode=void 0,this.paymentProductId=void 0,this.isAllowedInContext=void 0,this.coBrands=void 0,this.status=e,this.json=t,t&&(this.json=t,this.countryCode=this.json.countryCode,this.paymentProductId=this.json.paymentProductId,this.isAllowedInContext=this.json.isAllowedInContext,this.coBrands=this.json.coBrands)}}class n3{constructor(e){this.json=void 0,this.keyId=void 0,this.publicKey=void 0,this.json=e,this.keyId=e.keyId,this.publicKey=e.publicKey}}class n4 extends Error{constructor(e,t){super(t),this.response=void 0,this.status=void 0,this.response=e,this.status=e.status}}var n8=rT("cache"),n6=rT("applePay"),n9=rT("sessionConfiguration"),n7=rT("createCacheKeyFromContext"),ie=rT("getRequestHeaders"),it=rT("cleanJSON"),ir=rT("sortProducts"),ia=rT("filterApplePay"),io=rT("getBasePath"),ii=rT("getUrlFromContext"),is=rT("isPartialCard"),il=rT("getCacheKeySuffix"),ic=rT("getCardSource");class id{constructor(e,t){Object.defineProperty(this,ic,{value:ix}),Object.defineProperty(this,il,{value:iv}),Object.defineProperty(this,is,{value:ik}),Object.defineProperty(this,ii,{value:ib}),Object.defineProperty(this,io,{value:ig}),Object.defineProperty(this,ia,{value:iy}),Object.defineProperty(this,ir,{value:ih}),Object.defineProperty(this,it,{value:iu}),Object.defineProperty(this,ie,{value:ip}),Object.defineProperty(this,n7,{value:im}),this.providedPaymentProduct=void 0,Object.defineProperty(this,n8,{writable:!0,value:void 0}),Object.defineProperty(this,n6,{writable:!0,value:void 0}),Object.defineProperty(this,n9,{writable:!0,value:void 0}),this.providedPaymentProduct=t,rN(this,n9)[n9]=e,rN(this,n8)[n8]=new Map,rN(this,n6)[n6]=new nQ,this.providedPaymentProduct&&(this.providedPaymentProduct=this.transformPaymentProductJSON(this.providedPaymentProduct))}async getBasicPaymentProducts(e){let t=rN(this,n7)[n7]({context:e,prefix:"getPaymentProducts"});if(rN(this,n8)[n8].has(t))return rN(this,n8)[n8].get(t);let r=rN(this,ii)[ii]({path:"products",apiVersion:"v1",context:e,useCacheBuster:!0,queryParams:{hide:"fields"}}),a=await n1(r,{headers:rN(this,ie)[ie]()});if(!a.success)throw new n4(a,"failed to retrieve Basic Payment Products");let o=rN(this,ir)[ir](a.data);if(nO.filterOutProductsThatAreNotSupportedInThisBrowser(o),nO.filterOutProductsThatAreNotSupportedBySdk(o),0===o.paymentProducts.length)throw new n4(a,"No payment products available");return rN(this,n8)[n8].set(t,o),rN(this,ia)[ia](o),o}async getPaymentProduct(e,t){var r;if(!nO.isSupportedPaymentProductInBrowser(e)||!nO.isSupportedPaymentProductBySdk(e))throw new n4({status:404,success:!1,data:{errorId:"48b78d2d-1b35-4f8b-92cb-57cc2638e901",errors:[{code:"1007",propertyName:"productId",message:"UNKNOWN_PRODUCT_ID",httpStatusCode:404}]}},"Product not found or not available.");let a=rN(this,n7)[n7]({context:t,prefix:`getPaymentProduct-${e}`});if((null==(r=this.providedPaymentProduct)?void 0:r.id)===e)return rN(this,n8)[n8].has(a)||rN(this,n8)[n8].set(a,this.providedPaymentProduct),this.providedPaymentProduct;if(rN(this,n8)[n8].has(a))return rN(this,n8)[n8].get(a);let o=rN(this,ii)[ii]({path:`products/${e}`,apiVersion:"v1",context:t,useCacheBuster:!0}),n=await n1(o,{headers:rN(this,ie)[ie]()});if(!n.success)throw new n4(n,`Failed to retrieve Payment Product ${e}`);let i=this.transformPaymentProductJSON(n.data);return rN(this,n8)[n8].set(a,i),rN(this,ia)[ia](i),i}async getPaymentProductIdByCreditCardNumber(e,t){let r=`getPaymentProductIdByCreditCardNumber-${e}`;if(rN(this,n8)[n8].has(r))return rN(this,n8)[n8].get(r);if(e.length<6)throw new n4({status:400,success:!1,data:new n5("NOT_ENOUGH_DIGITS")},"Not enough digits in the credit card number. Minimum 6 digits required.");let a=rN(this,io)[io]("services/getIINdetails","v1"),o=this.convertContextToIinDetailsContext(e,t),n=await n2(a,{headers:rN(this,ie)[ie](),body:JSON.stringify(o)});if(!n.success)throw new n4(n);let i=n.data;if(Object.hasOwn(i,"isAllowedInContext")){let e=new n5(!1!==i.isAllowedInContext?"SUPPORTED":"EXISTING_BUT_NOT_ALLOWED",i);return rN(this,n8)[n8].set(r,e),e}try{let e=await this.getPaymentProduct(i.paymentProductId,t),a=new n5(e?"SUPPORTED":"UNSUPPORTED",i);return rN(this,n8)[n8].set(r,a),a}catch(e){throw new n4({status:400,success:!1,data:new n5("UNKNOWN",n.data)})}}convertContextToIinDetailsContext(e,t){return{bin:e,paymentContext:t}}async getPublicKey(){let e="publicKey";if(rN(this,n8)[n8].has(e))return rN(this,n8)[n8].get(e);let t=rN(this,io)[io]("/crypto/publickey","v1"),r=await n1(t,{headers:rN(this,ie)[ie]()});if(!r.success)throw new n4(r);let a=new n3(r.data);return rN(this,n8)[n8].set(e,a),a}async getPaymentProductNetworks(e,t){let r=rN(this,n7)[n7]({prefix:`paymentProductNetworks-${e}`,context:t});if(rN(this,n8)[n8].has(r))return rN(this,n8)[n8].get(r);let a=rN(this,ii)[ii]({path:`products/${e}/networks`,apiVersion:"v1",context:t}),o=await n1(a,{headers:rN(this,ie)[ie]()});if(!o.success)throw new n4(o);return rN(this,n8)[n8].set(r,o.data),o.data}transformPaymentProductJSON(e){return rN(this,it)[it](e)}async getSurchargeCalculation(e,t){let r=rN(this,il)[il](t),a=`getSurchargeCalculation-${e.amount}-${e.currencyCode}-${r}`;if(rN(this,n8)[n8].has(a))return rN(this,n8)[n8].get(a);let o=rN(this,ic)[ic](t),n=rN(this,io)[io]("services/surchargeCalculation","v1"),i=await n2(n,{headers:rN(this,ie)[ie](),body:JSON.stringify({cardSource:o,amountOfMoney:e})});if(!i.success)throw new n4(i);return rN(this,n8)[n8].set(a,i.data),i.data}async getCurrencyConversionQuote(e,t){let r=rN(this,il)[il](t),a=`getCurrencyConversionQuote-${e.amount}-${e.currencyCode}-${r}`;if(rN(this,n8)[n8].has(a))return rN(this,n8)[n8].get(a);let o=rN(this,ic)[ic](t),n=rN(this,io)[io]("services/dccrate","v2"),i=await n2(n,{headers:rN(this,ie)[ie](),body:JSON.stringify({cardSource:o,transaction:{amount:e}})});if(!i.success)throw new n4(i);return rN(this,n8)[n8].set(a,i.data),i.data}}function im({prefix:e,suffix:t,context:r}){let{countryCode:a,isRecurring:o,amountOfMoney:{amount:n,currencyCode:i}}=r;return`${e}-${[n,a,o,i,t].filter(Boolean).join("_")}`}function ip(){let e=nO.getMetadata();return{"X-GCS-ClientMetaInfo":window.btoa(JSON.stringify(e)),Authorization:`GCS v1Client:${rN(this,n9)[n9].clientSessionId}`}}function iu(e){if(!e.fields)return e;let t=new Map([["expirydate","tel"],["string","text"],["numericstring","tel"],["integer","number"],["expirationDate","tel"]]);for(let c of e.fields){var r,a,o,n,i,s,l;c.type=null!=(r=c.displayHints)&&r.obfuscate?"password":null!=(a=t.get(c.type))?a:"text",null!=c.validators||(c.validators=[]),c.validators.push(...Object.keys(null!=(o=c.dataRestrictions.validators)?o:{})),"list"===(null==(n=c.displayHints)||null==(n=n.formElement)?void 0:n.type)&&(c.displayHints.formElement.list=!0),"expiryDate"===c.id&&("list"===(null==(s=c.displayHints)?void 0:s.formElement.type)&&(c.displayHints.formElement.type="string",c.displayHints.formElement.list=!1),!c.displayHints||null!=(l=c.displayHints)&&l.mask||(c.displayHints.mask="{{99}}/{{99}}")),"cardNumber"!==c.id||!c.displayHints||null!=(i=c.displayHints)&&i.mask||(c.displayHints.mask="2"===e.id?"{{9999}} {{999999}} {{99999}}":"{{9999}} {{9999}} {{9999}} {{9999}}")}return e.fields.sort((e,t)=>{var r,a;let o=null==(r=e.displayHints)?void 0:r.displayOrder,n=null==(a=t.displayHints)?void 0:a.displayOrder;return void 0===o||void 0===n?0:o<n?-1:1}),e}function ih(e){return e.paymentProducts.sort((e,t)=>{let[r,a]=[e,t].map(({displayHintsList:e})=>{var t;return null==e||null==(t=e[0])?void 0:t.displayOrder});return void 0===r||void 0===a?0:r-a}),e}function iy(e){rN(this,n6)[n6].isApplePayAvailable()||(nO.paymentProductsThatAreNotSupportedInThisBrowser.push(nO.applePayPaymentProductId),nO.filterOutProductsThatAreNotSupportedInThisBrowser(e))}function ig(e,t){let{clientApiUrl:r,customerId:a}=rN(this,n9)[n9];return nO.url.segmentsToPath([r,t,a,e])}function ib({path:e,apiVersion:t,context:r,queryParams:a={},useCacheBuster:o=!1}){var n;return nO.url.urlWithQueryString(rN(this,io)[io](e,t),rA({countryCode:r.countryCode,isRecurring:null==(n=r.isRecurring)?void 0:n.toString()},r.amountOfMoney.amount?{amount:r.amountOfMoney.amount.toString()}:{},{currencyCode:r.amountOfMoney.currencyCode,cacheBust:o?(new Date).getTime().toString():void 0},a))}function ik(e){return"object"==typeof e}function iv(e){return rN(this,is)[is](e)?e.partialCreditCardNumber:e}function ix(e){return rN(this,is)[is](e)?{card:{cardNumber:e.partialCreditCardNumber,paymentProductId:e.paymentProductId}}:{token:e}}var iz=rT("sessionConfiguration"),iC=rT("c2sCommunicator"),iw=rT("paymentProduct"),iS=rT("paymentContext"),i_=rT("_formatPartialCreditCardNumber");class iE{constructor(e,t){Object.defineProperty(this,i_,{value:iN}),Object.defineProperty(this,iz,{writable:!0,value:void 0}),Object.defineProperty(this,iC,{writable:!0,value:void 0}),Object.defineProperty(this,iw,{writable:!0,value:void 0}),Object.defineProperty(this,iS,{writable:!0,value:void 0}),rN(this,iz)[iz]=new nW(e),rN(this,iC)[iC]=new id(rN(this,iz)[iz],t)}async getBasicPaymentProducts(e){let t=await rN(this,iC)[iC].getBasicPaymentProducts(e);return rN(this,iS)[iS]=e,new r0(t)}async getBasicPaymentItems(e){return new rJ(await this.getBasicPaymentProducts(e))}async getPaymentProduct(e,t){let r=rN(this,iS)[iS]||t;if(!r)throw Error("PaymentContext is not provided");try{let t=await rN(this,iC)[iC].getPaymentProduct(e,r);return rN(this,iw)[iw]=new rZ(t),rN(this,iw)[iw]}catch(e){throw rN(this,iw)[iw]=void 0,e}}async getIinDetails(e,t){let r=rN(this,iS)[iS]||t;if(!r)throw Error("PaymentContext is not provided");return rN(this,iC)[iC].getPaymentProductIdByCreditCardNumber(rN(this,i_)[i_](e),r)}async getPublicKey(){return rN(this,iC)[iC].getPublicKey()}async getPaymentProductNetworks(e,t){let r=await rN(this,iC)[iC].getPaymentProductNetworks(e,t);return rN(this,iS)[iS]=t,r}getEncryptor(){return new nq(rN(this,iC)[iC].getPublicKey(),rN(this,iz)[iz].clientSessionId)}async getSurchargeCalculation(e,t){return rN(this,iC)[iC].getSurchargeCalculation(e,t)}async getCurrencyConversionQuote(e,t){return rN(this,iC)[iC].getCurrencyConversionQuote(e,t)}}function iN(e){var t;return(t=e.replace(/\s/g,"")).substring(0,t.length>=8?8:6)}var iI=rT("fieldValues"),iT=rT("paymentProduct"),iA=rT("accountOnFile"),ij=rT("tokenize");class iP{constructor(){Object.defineProperty(this,iI,{writable:!0,value:void 0}),Object.defineProperty(this,iT,{writable:!0,value:void 0}),Object.defineProperty(this,iA,{writable:!0,value:void 0}),Object.defineProperty(this,ij,{writable:!0,value:void 0}),rN(this,iI)[iI]=new Map,rN(this,ij)[ij]=!1}setValue(e,t){rN(this,iI)[iI].set(e,t)}setValues(e){for(let[t,r]of Object.entries(e))this.setValue(t,r)}setTokenize(e){rN(this,ij)[ij]=e}getTokenize(){return rN(this,ij)[ij]}getErrorMessageIds(){return Array.from(rN(this,iI)[iI].entries()).flatMap(([e,t])=>{var r;let a=null==(r=rN(this,iT)[iT])?void 0:r.paymentProductFieldById[e];return null==a?void 0:a.getErrorCodes(t)}).filter(Boolean)}getValue(e){return rN(this,iI)[iI].get(e)}getValues(){return Object.fromEntries(rN(this,iI)[iI].entries())}getMaskedValue(e){var t;let r=this.getValue(e);if(void 0===r)return r;let a=null==(t=rN(this,iT)[iT])?void 0:t.paymentProductFieldById[e];return a?a.applyMask(r).formattedValue:void 0}getMaskedValues(){return Object.fromEntries(Array.from(rN(this,iI)[iI]).map(([e])=>[e,this.getMaskedValue(e)]))}getUnmaskedValue(e){var t,r;let a=this.getValue(e);if(void 0===a)return a;let o=null==(t=rN(this,iT)[iT])?void 0:t.paymentProductFieldById[e];return o?o.removeMask(null==(r=o.applyMask(a))?void 0:r.formattedValue):void 0}getUnmaskedValues(){return Object.fromEntries(Array.from(rN(this,iI)[iI]).map(([e])=>[e,this.getUnmaskedValue(e)]))}setPaymentProduct(e){"group"!==e.type&&(rN(this,iT)[iT]=e)}getPaymentProduct(){return rN(this,iT)[iT]}setAccountOnFile(e){e&&(e.attributes.forEach(({key:e})=>rN(this,iI)[iI].delete(e)),rN(this,iA)[iA]=e)}getAccountOnFile(){return rN(this,iA)[iA]}getPaymentProductId(){var e;return null==(e=rN(this,iT)[iT])?void 0:e.id}isValid(){let e=this.getPaymentProduct();if(!e)return!1;if(!e.paymentProductFields.length)return!0;if(this.getErrorMessageIds().length)return!1;let t=this.getAccountOnFile();return e.paymentProductFields.reduce((r,a)=>a.dataRestrictions.isRequired?r&&!(!this.getValue(a.id)&&!(r=>{if((null==t?void 0:t.paymentProductId)!==e.id)return!1;let a=null==t?void 0:t.attributeByKey[r];return!!a&&"MUST_WRITE"!==a.status})(a.id)):r&&!0,!0)}}var iB=e.i(68209);let iR=new Map,iO=new Map;function iL({paymentData:e,onPaymentComplete:t,onPaymentError:r,className:a,countryCode:i="DE",currency:s="EUR"}){let l=(0,n.useRef)(!1),c=(0,n.useRef)(r),d=(0,n.useRef)(null),[m,p]=(0,n.useState)(!0),[u,h]=(0,n.useState)(!1),[f,y]=(0,n.useState)(null),[g,b]=(0,n.useState)(null),[k,v]=(0,n.useState)(null),[x,z]=(0,n.useState)({cardholderName:"",email:"",phone:"",cardNumber:"",expiryDate:"",cvv:""}),[C,w]=(0,n.useState)({}),S=Math.round(100*Number(e?.amount||0)),_=(0,n.useMemo)(()=>!!(x.cardholderName.trim()&&x.email.trim()&&x.cardNumber.trim()&&x.expiryDate.trim()&&x.cvv.trim()&&Object.values(C).every(e=>!e)),[C,x]),E=String(s||"EUR").toUpperCase(),N=e=>String(e??"").replace(/\D/g,""),I=e=>String(e??"").replace(/\D/g,""),T=e=>String(e??"").replace(/\D/g,"").slice(0,4),A=e=>{let t=t=>{try{if("function"==typeof e?.getValue)return e.getValue(t)}catch{}try{return e?.[t]}catch{}},r=null;try{let t=e?.validate?.();r=t&&"object"==typeof t?{isValid:t.isValid,errorCount:Array.isArray(t.errors)?t.errors.length:void 0,errors:t.errors??void 0}:t}catch(e){r={threw:!0,message:String(e?.message||e)}}return{cardNumber:t("cardNumber"),expiryDate:t("expiryDate"),cvv:t("cvv"),cardholderName:t("cardholderName"),securityCode:t("securityCode"),expiryMonth:t("expiryMonth"),expiryYear:t("expiryYear"),keys:(()=>{try{return Object.keys(e||{})}catch{return[]}})(),validation:r}},j=(e,t)=>{try{if("function"==typeof e?.getField)return e.getField(t)}catch{}return e?.paymentProductFieldById?.[t]?e.paymentProductFieldById[t]:Array.isArray(e?.paymentProductFields)&&e.paymentProductFields.find(e=>e?.id===t)||null},P=(e,t)=>{if(!Array.isArray(e)||0===e.length)return"";let r=e?.[0]?.errorMessage||e?.[0]?.message||e?.[0]?.id;return"string"==typeof r&&r.trim()?r:t},B=e=>{if(!k)return;let t=N(e.cardNumber);String(e.expiryDate??"").replace(/\D/g,"").slice(0,4);let r=T(e.expiryDate),a=I(e.cvv),o=j(k,"cardNumber"),n=j(k,"expiryDate"),i=j(k,"cvv")||j(k,"securityCode"),s=o?.validate?.(t),l=n?.validate?.(r),c=i?.validate?.(a);w({cardNumber:P(s,"Invalid card number"),expiryDate:P(l,"Invalid expiry date"),cvv:P(c,"Invalid CVV")})},R=(e,t)=>{let r=String(t??"");if("cardNumber"===e)r=r.replace(/\D/g,"").slice(0,19).replace(/(.{4})/g,"$1 ").trim();else if("expiryDate"===e){let e=r.replace(/\D/g,"").slice(0,4);r=e.length>2?e.slice(0,2)+"/"+e.slice(2):e}else"cvv"===e&&(r=r.replace(/\D/g,"").slice(0,4));z(t=>{let a={...t,[e]:r};return B(a),a})};(0,n.useEffect)(()=>{c.current=r},[r]),(0,n.useEffect)(()=>{let t=!0,r=`${i}:${E}:${S}`;return(async()=>{try{if(d.current===r)return;d.current=r,p(!0),y(null);let a=iO.get(r);if(a){if(!t)return;b(a.sdk),v(a.paymentProduct);return}let o=iR.get(r),n=o??(async()=>{let t=await fetch("/api/v1/payments/worldline/inline/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:Number(e?.amount||0),currency:E})}),r=await t.json().catch(()=>({}));if(!t.ok||!r?.success||!r?.session)throw Error(r?.error||"Failed to initialize Worldline inline session");let a=r.session;window.__pmdWorldlineSessionData=a;let o=null;try{o=new iE({clientSessionId:a.clientSessionId,customerId:a.customerId,clientApiUrl:a.clientApiUrl,assetUrl:a.assetUrl,appIdentifier:"PayMyDine-Checkout"})}catch{o=new iE(a.clientSessionId,a.customerId,a.clientApiUrl,a.assetUrl,{environment:a.environment||"TEST",appIdentifier:"PayMyDine-Checkout"})}console.info("[WorldlineInlineCardForm] Session initialized");try{window.__pmdWorldlineSdkDebug={constructorName:o?.constructor?.name??null,ownKeys:Object.keys(o||{}),hasGetPaymentRequest:"function"==typeof o?.getPaymentRequest,hasGetEncryptor:"function"==typeof o?.getEncryptor,hasEncryptPaymentRequest:"function"==typeof o?.encryptPaymentRequest,hasPreparePaymentRequest:"function"==typeof o?.preparePaymentRequest,hasGetPaymentProduct:"function"==typeof o?.getPaymentProduct,protoKeys:Object.getOwnPropertyNames(Object.getPrototypeOf(o||{}))}}catch{}let n={countryCode:i,amountOfMoney:{amount:S,currencyCode:E},isRecurring:!1},s=null;try{s=await o.getPaymentProduct({productId:1,paymentContext:n})}catch{s=await o.getPaymentProduct(1,n)}try{window.__pmdWorldlineProductDebug={id:s?.id??null,constructorName:s?.constructor?.name??null,ownKeys:Object.keys(s||{}),hasCreatePaymentRequest:"function"==typeof s?.createPaymentRequest,hasGetField:"function"==typeof s?.getField,fieldIds:Array.isArray(s?.paymentProductFields)?s.paymentProductFields.map(e=>e?.id):[]}}catch{}return{sdk:o,paymentProduct:s}})();o||iR.set(r,n);let s=await n;if(iO.set(r,s),iR.delete(r),!t)return;b(s.sdk),v(s.paymentProduct);try{let e=s.paymentProduct,t=Array.isArray(e?.paymentProductFields)?e.paymentProductFields.map(e=>({id:e?.id,type:e?.type,dataType:e?.dataType,preferredInputType:e?.displayHints?.preferredInputType,obfuscate:e?.displayHints?.obfuscate})):[];console.info("[WorldlineInlineCardForm] PRODUCT DEBUG",{productId:e?.id,fields:t,hasCreatePaymentRequest:"function"==typeof e?.createPaymentRequest,hasGetField:"function"==typeof e?.getField})}catch(e){console.warn("[WorldlineInlineCardForm] PRODUCT DEBUG failed",e)}B(x)}catch(a){if(iR.delete(r),iO.delete(r),l.current||(console.error("[WorldlineInlineCardForm][session-init]",a),l.current=!0),!t)return;let e="Could not initialize secure card payment.";y(e),c.current(e)}finally{t&&p(!1)}})(),()=>{t=!1}},[S,i,E]);let O=async r=>{if(r.preventDefault(),!g||!k){let e="Worldline SDK not ready";y(e),c.current(e);return}let a=[],o=null,n=null,i=null,l=null;try{let r;h(!0),y(null);let c=N(x.cardNumber),d=String(x.expiryDate??""),m=T(d),p=I(x.cvv),u=String(x.cardholderName??"").trim();if(c.length<12)throw Error("Card number is incomplete");if(4!==m.length)throw Error("Expiry date must be MM/YY");if(p.length<3)throw Error("CVV is incomplete");if(!u)throw Error("Cardholder name is required");let f=(e,t,r)=>{let a={fieldId:t,value:r,ok:!1,errors:[]};if(!r)return a;try{"function"==typeof e?.setValue?(e.setValue(t,r),a.ok=!0):a.errors.push("setValue is unavailable")}catch(e){a.errors.push(String(e?.message||e))}return a},b=(e,t)=>{try{if("function"==typeof e?.getValue)return e.getValue(t)}catch{}try{return e?.[t]}catch{}},v=async e=>{if("function"==typeof g?.encryptPaymentRequest)return await g.encryptPaymentRequest(e);if("function"==typeof g?.preparePaymentRequest)return await g.preparePaymentRequest(e);if("function"==typeof g?.getEncryptor){let t=g.getEncryptor();if("function"==typeof t?.encrypt)return await t.encrypt(e)}throw Error("No supported Worldline encryption method found")};for(let e of((r=[]).push({name:"new PaymentRequest()+setPaymentProduct(paymentProduct)",build:()=>{let e=new iP;try{"function"==typeof e?.setPaymentProduct&&e.setPaymentProduct(k)}catch{}return e}}),r).filter(e=>"function"==typeof e?.build)){let t={strategy:e.name,buildOk:!1,setResults:null,requestValuesAfterSet:null,encryptOk:!1,encryptError:null},r=null;try{if(!(r=e.build())){t.encryptError="builder returned null",a.push(t);continue}t.buildOk=!0,t.setResults={cardNumber:f(r,"cardNumber",c),expiryDate:f(r,"expiryDate",m),cvv:f(r,"cvv",p),cardholderName:f(r,"cardholderName",u)},t.requestValuesAfterSet={cardNumber:b(r,"cardNumber"),expiryDate:b(r,"expiryDate"),cvv:b(r,"cvv"),cardholderName:b(r,"cardholderName")};let s=await v(r);t.encryptOk=!0,o=e.name,n=r,i=s,l=t.requestValuesAfterSet,a.push(t);break}catch(e){t.encryptError=String(e?.message||e);try{t.encryptErrorValidationErrors=e?.validationErrors??null}catch{}try{t.validationProbeAfterError=A(r)}catch{}a.push(t)}}console.info("[WorldlineInlineCardForm] CONSTRUCTOR ATTEMPTS",a);try{let e="function"==typeof n?.validate?n.validate():null;console.info("[WorldlineInlineCardForm] FINAL REQUEST VALIDATION",{chosenStrategy:o,requestValuesAfterSet:l,validateResult:e,probe:A(n)})}catch(e){console.warn("[WorldlineInlineCardForm] FINAL REQUEST VALIDATION failed",e)}if(!n||!i)throw Error("All PaymentRequest construction strategies failed");let z="string"==typeof i?(()=>{try{return JSON.parse(i)}catch{return{encryptedCustomerInput:i}}})():i,C=z?.encryptedCustomerInput??z?.encryptedFields??z?.payload?.encryptedCustomerInput??z?.paymentRequest?.encryptedCustomerInput??n?.encryptedCustomerInput??"",w=z?.encodedClientMetaInfo??z?.payload?.encodedClientMetaInfo??z?.paymentRequest?.encodedClientMetaInfo??n?.encodedClientMetaInfo??"";if(!C||"string"!=typeof C)throw Error("Worldline encryption failed: encrypted customer payload is missing");console.info("[WorldlineInlineCardForm] CREATE PAYMENT PAYLOAD",{url:"/api/v1/payments/worldline/inline/create-payment",amount:Number(e?.amount||0),currency:String(s||"EUR").toUpperCase(),paymentProductId:Number(k?.id||1),encryptedCustomerInputPreview:C?String(C).slice(0,16)+"…":null,hasEncodedClientMetaInfo:!!w});let S=await fetch("/api/v1/payments/worldline/inline/create-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:Number(e?.amount||0),currency:String(s||"EUR").toUpperCase(),paymentProductId:Number(k?.id||1),encryptedCustomerInput:C,encodedClientMetaInfo:w,cardholderName:x.cardholderName,email:x.email,phone:x.phone})}),_=await S.json().catch(()=>({}));if(!S.ok||!_?.success||!_?.payment_id)throw Error(_?.error||"Worldline inline payment failed");let E=await fetch("/api/v1/payments/worldline/inline/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payment_id:String(_.payment_id)})}),j=await E.json().catch(()=>({}));if(!E.ok||!j?.success||!j?.is_paid)throw Error("Worldline payment is not finalized yet");t({success:!0,transactionId:String(j.payment_id||_.payment_id),paymentMethod:"worldline"})}catch(m){let e="string"==typeof m?.message?m.message:"",t=String(x.expiryDate??""),r=T(t),n=r.length>=4?`${r.slice(0,2)}/${r.slice(2,4)}`:t,i=Array.isArray(k?.paymentProductFields)?k.paymentProductFields.map(e=>String(e?.id??"")).filter(Boolean):"function"==typeof k?.getFields?k.getFields().map(e=>String(e?.id??"")).filter(Boolean):Object.keys(k?.paymentProductFieldById||{}),s={rawError:e,paymentProductId:Number(k?.id||0),sdkDebug:(()=>{try{return window.__pmdWorldlineSdkDebug??null}catch(e){return{threw:!0,message:String(e?.message||e)}}})(),sessionDataDebug:(()=>{try{let e=window.__pmdWorldlineSessionData;if(!e)return null;return{keys:Object.keys(e||{}),clientSessionIdPresent:!!e?.clientSessionId,customerIdPresent:!!e?.customerId,clientApiUrl:e?.clientApiUrl??null,assetUrl:e?.assetUrl??null,environment:e?.environment??null}}catch(e){return{threw:!0,message:String(e?.message||e)}}})(),paymentProductDebug:(()=>{try{return window.__pmdWorldlineProductDebug??null}catch(e){return{threw:!0,message:String(e?.message||e)}}})(),availableFieldIds:i,sentValues:{cardNumber:String(x.cardNumber??""),expiryDate:t,expiryDigits:r,expiryMasked:n,cvv:String(x.cvv??""),cardholderName:String(x.cardholderName??""),email:String(x.email??"")},chosenStrategy:o,requestValuesAfterSet:l,constructorAttempts:a},d=(e||"Payment could not be completed. Please check your details and try again.")+"\n\nDEBUG:\n"+JSON.stringify(s,null,2);y(d),c.current(d)}finally{h(!1)}};return(0,o.jsxs)("form",{onSubmit:O,className:(0,eB.cn)("space-y-4",a),children:[(0,o.jsxs)("div",{className:"space-y-2",children:[(0,o.jsx)(rC.Label,{htmlFor:"wlCardNumber",children:"Card number"}),(0,o.jsx)(iB.Input,{id:"wlCardNumber",value:x.cardNumber,onChange:e=>R("cardNumber",e.target.value),required:!0,autoComplete:"cc-number",className:"h-11 rounded-xl text-[15px]"}),C.cardNumber?(0,o.jsx)("p",{className:"text-xs text-red-500",children:C.cardNumber}):null]}),(0,o.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[(0,o.jsxs)("div",{className:"space-y-2",children:[(0,o.jsx)(rC.Label,{htmlFor:"wlExpiry",children:"Expiry (MMYY)"}),(0,o.jsx)(iB.Input,{id:"wlExpiry",value:x.expiryDate,onChange:e=>R("expiryDate",e.target.value),required:!0,autoComplete:"off",className:"h-11 rounded-xl"}),C.expiryDate?(0,o.jsx)("p",{className:"text-xs text-red-500",children:C.expiryDate}):null]}),(0,o.jsxs)("div",{className:"space-y-2",children:[(0,o.jsx)(rC.Label,{htmlFor:"wlCvv",children:"CVV"}),(0,o.jsx)(iB.Input,{id:"wlCvv",value:x.cvv,onChange:e=>R("cvv",e.target.value),required:!0,autoComplete:"cc-csc",className:"h-11 rounded-xl"}),C.cvv?(0,o.jsx)("p",{className:"text-xs text-red-500",children:C.cvv}):null]})]}),(0,o.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:[(0,o.jsxs)("div",{className:"space-y-2",children:[(0,o.jsx)(rC.Label,{htmlFor:"wlCardholder",children:"Cardholder name"}),(0,o.jsx)(iB.Input,{id:"wlCardholder",value:x.cardholderName,onChange:e=>R("cardholderName",e.target.value),required:!0,className:"h-11 rounded-xl"})]}),(0,o.jsxs)("div",{className:"space-y-2",children:[(0,o.jsx)(rC.Label,{htmlFor:"wlEmail",children:"Email"}),(0,o.jsx)(iB.Input,{id:"wlEmail",type:"email",value:x.email,onChange:e=>R("email",e.target.value),required:!0,className:"h-11 rounded-xl"})]})]}),f&&(0,o.jsx)("pre",{className:"text-xs text-red-500 whitespace-pre-wrap break-all rounded-xl p-3 bg-red-50 border border-red-200 overflow-auto",children:f}),(0,o.jsxs)("button",{type:"submit",disabled:m||u||!g||!k||!_,className:"relative w-full min-w-full max-w-full h-[54px] rounded-2xl border-0 overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed",style:{background:"transparent",boxShadow:"none"},children:[(0,o.jsx)("span",{"aria-hidden":"true",style:{position:"absolute",inset:0,zIndex:0,borderRadius:"9999px",background:"linear-gradient(135deg, #063F2F 0%, #062F2A 100%)",boxShadow:"0 8px 22px rgba(6, 47, 42, 0.24)",pointerEvents:"none"}}),(0,o.jsx)("span",{style:{position:"relative",zIndex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",color:"#FFFFFF",fontSize:"16px",fontWeight:700,width:"100%"},children:u?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)("span",{className:"animate-spin",style:{width:"16px",height:"16px",border:"2px solid rgba(255,255,255,0.35)",borderTopColor:"#FFFFFF",borderRadius:"9999px"}}),(0,o.jsx)("span",{children:"Processing..."})]}):m?(0,o.jsx)("span",{children:"Initializing..."}):(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(rw,{className:"h-4 w-4"}),(0,o.jsx)("span",{children:"Pay"})]})})]})]})}function iD({paymentData:e,onPaymentComplete:t,onPaymentError:r,className:a,paypalFundingSource:i="paypal"}){let[{isPending:s}]=tW(),[l,c]=(0,n.useState)(!1),d=async()=>{try{let t=await fetch("/api/v1/payments/paypal/create-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}),r=await t.json().catch(()=>({}));console.log("[PMD][PayPalForm][createOrder] =>",r);let a=r?.orderID||r?.orderId||r?.id||r?.paypal?.id;if(!t.ok||!r?.success||!a)throw Error(r?.error||"Failed to create PayPal order");return a}catch(e){throw r(e?.message||"Failed to create PayPal order"),e}},m=async a=>{c(!0);try{let o=await fetch("/api/v1/payments/paypal/capture-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderID:a?.orderID||a?.orderId,orderId:a?.orderID||a?.orderId,paymentData:e})}),n=await o.json().catch(()=>({}));console.log("[PMD][PayPalForm][onApprove] =>",n),o.ok&&n?.success?t({success:!0,transactionId:n.transactionId||n.captureID||n.orderID||a?.orderID,paymentMethod:"paypal"}):r(n?.error||"Payment failed")}catch(e){r(e?.message||"Payment failed")}finally{c(!1)}};return s?(0,o.jsxs)("div",{className:(0,eB.cn)("flex items-center justify-center p-8",a),children:[(0,o.jsx)("div",{className:"w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"}),(0,o.jsx)("span",{className:"ml-2",children:"Loading PayPal..."})]}):(0,o.jsxs)("div",{className:"jsx-2c259872ef1009f9 "+((0,eB.cn)("space-y-4 bg-transparent w-full",a)||""),children:[(0,o.jsx)("div",{className:"jsx-2c259872ef1009f9 text-center",children:(0,o.jsx)("p",{className:"jsx-2c259872ef1009f9 text-sm text-gray-600 mb-4"})}),(0,o.jsx)("div",{className:"jsx-2c259872ef1009f9 paypal-clean-wrap",children:(0,o.jsx)(tX,{fundingSource:i,createOrder:d,onApprove:m,onError:e=>{r(e?.message||"PayPal payment failed")},disabled:l,style:{layout:"vertical",color:"blue",shape:"pill",label:"paypal",tagline:!1,height:45,borderRadius:14}})}),(0,o.jsx)(Y.default,{id:"2c259872ef1009f9",children:".paypal-clean-wrap.jsx-2c259872ef1009f9{border-radius:12px;margin:0;padding:0;line-height:0;overflow:hidden;background:0 0!important}.paypal-clean-wrap.jsx-2c259872ef1009f9 div,.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-buttons,.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-button-container,.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-button-row,.paypal-clean-wrap.jsx-2c259872ef1009f9 iframe{background:0 0!important}.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-button-container{border-radius:12px!important;min-width:100%!important;max-width:100%!important;overflow:hidden!important}.paypal-clean-wrap.jsx-2c259872ef1009f9 .paypal-button-row{border-radius:12px!important;overflow:hidden!important}.paypal-clean-wrap.jsx-2c259872ef1009f9 iframe{border-radius:12px!important;display:block!important}"})]})}function iU(e){let[t,r]=(0,n.useState)(!1),[a,i]=(0,n.useState)(null),s=(0,n.useRef)(!1);return(0,n.useEffect)(()=>{s.current||(s.current=!0,(async()=>{try{r(!0),i(null),console.info("SUMUP_HOSTED_CHECKOUT_REDIRECT",{stage:"init"});let t={amount:e.amount,currency:e.currency,order_id:e.orderId??null,order_type:e.orderType??"guest",description:e.description??"PayMyDine SumUp hosted checkout",return_url:e.successUrl??`${window.location.origin}/payment/sumup/complete`,cancel_url:e.cancelUrl??`${window.location.origin}/menu`},a=await fetch("/api/v1/payments/card/create-session",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(t)}),o=await a.json().catch(()=>null);if(!a.ok||!o?.success)throw Error(o?.message||o?.error||`HTTP ${a.status}`);let n=String(o?.redirect_url||o?.hosted_checkout_url||o?.checkout_url||"").trim(),s=String(o?.checkout_id||"").trim();if(s&&localStorage.setItem("pmd_sumup_pending_checkout",JSON.stringify({checkout_id:s,return_to:`${window.location.pathname}${window.location.search}`,created_at:Date.now()})),!n)throw Error("No hosted checkout URL returned from SumUp");console.info("SUMUP_HOSTED_CHECKOUT_REDIRECT",{stage:"redirect",checkout_id:s||null,has_redirect_url:!0}),window.location.href=n}catch(e){console.error("SUMUP_HOSTED_CHECKOUT_REDIRECT",{stage:"error",message:e?.message||String(e)}),i(e?.message||"Unable to start SumUp hosted checkout")}finally{r(!1)}})())},[e.amount,e.cancelUrl,e.currency,e.description,e.orderId,e.orderType,e.successUrl]),(0,o.jsxs)("div",{"data-pmd-sumup-hosted-checkout":"1",className:`w-full rounded-xl border p-3 ${e.className??""}`,style:{borderColor:"var(--theme-border)",background:"rgba(255,255,255,0.04)"},children:[(0,o.jsx)("div",{className:"text-sm font-semibold",children:"Secure card payment"}),(0,o.jsx)("div",{className:"text-xs opacity-80",children:"Redirecting to secure SumUp checkout…"}),t&&(0,o.jsx)("div",{className:"text-xs mt-2 opacity-70",children:"Preparing secure checkout…"}),a?(0,o.jsx)("div",{className:"mt-2 rounded-lg px-3 py-2 text-sm",style:{background:"rgba(255,0,0,0.08)",color:"#ff6b6b"},children:a}):null]})}function iM({methodName:e,stripeConfigError:t,stripePromise:r,cardEnabled:a,paymentData:n,onPaymentSuccess:i,onPaymentError:s}){return(0,o.jsxs)("div",{className:"space-y-3 overflow-hidden",children:[(0,o.jsx)("div",{className:"mb-4",children:(0,o.jsx)("span",{className:"font-semibold text-paydine-elegant-gray",children:e||"Card Payment"})}),t&&(0,o.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3",children:(0,o.jsx)("p",{className:"text-xs text-red-300",children:t})}),!t&&!r&&(0,o.jsx)("div",{className:"py-2 text-xs text-paydine-elegant-gray/70",children:"Loading Stripe..."}),a&&r&&(0,o.jsx)(ru,{stripe:r,children:(0,o.jsx)(r_,{paymentData:n,onPaymentComplete:e=>{e?.success&&e?.transactionId&&i(e.transactionId)},onPaymentError:s})}),!a&&(0,o.jsx)("div",{className:"rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800",children:(0,o.jsxs)("span",{className:"inline-flex items-center gap-2",children:[(0,o.jsx)(rS.AlertCircle,{className:"h-4 w-4"}),"Stripe card checkout is not enabled for this restaurant."]})})]})}function iF(e){if(!e||"object"!=typeof e)return e;let t=e=>String(e||"").trim().replace(/-/g,"_").toLowerCase(),r=t(e.admin_theme),a=t(e.data?.admin_theme),o=t(e.frontend_theme),n=t(e.data?.frontend_theme);return("kazen_japanese"===r||"kazen_japanese"===a||"kazen_japanese"===o||"kazen_japanese"===n)&&(e.admin_theme="kazen_japanese",e.frontend_theme="kazen_japanese",e.theme_id="kazen_japanese",e.data&&"object"==typeof e.data&&(e.data.admin_theme="kazen_japanese",e.data.frontend_theme="kazen_japanese",e.data.theme_id="kazen_japanese")),e}function iV(t){let r=rv(),a=rh();try{window.__PMD_WALLET_POST&&window.__PMD_WALLET_POST({level:"info",message:"PMD_WALLET_COMPONENT_MOUNT",data:{method:t.method,amount:t.amount,currency:t.currency,countryCode:t.countryCode||null,hasStripe:!!r,hasElements:!!a,restaurantId:t.restaurantId,cartId:t.cartId??null,userId:t.userId??null,tableNumber:t.tableNumber??null,itemsLen:Array.isArray(t.items)?t.items.length:null}})}catch{}let[n,i]=e.r(30668).useState(!1),[s,l]=e.r(30668).useState(null),[c,d]=e.r(30668).useState(!1),[m,p]=e.r(30668).useState("");if(e.r(30668).useEffect(()=>{let e=!1;return async function(){try{if(!r)return;let a=(t.currency||"eur").toLowerCase(),o=t.countryCode||"DE";iV._paymentRequest=null;let n=r.paymentRequest({country:o,currency:a,total:{label:"apple_pay"===t.method?"Apple Pay":"Google Pay",amount:Math.round(100*Number(t.amount||0))},requestPayerName:!0,requestPayerEmail:!0}),s=await n.canMakePayment();try{window.__PMD_WALLET_POST&&window.__PMD_WALLET_POST({level:"info",message:"PMD_CAN_MAKE_PAYMENT_RESULT",data:{method:t.method,result:s}})}catch{}if(e)return;if(l(!!s),i(!0),!s){try{window.__PMD_WALLET_POST&&window.__PMD_WALLET_POST({level:"warn",message:"PMD_WALLET_NOT_SUPPORTED",data:{method:t.method}})}catch{}p("apple_pay"===t.method?"Apple Pay is not available on this browser/device (or wallet is not configured). Please try Safari on iPhone with Apple Pay enabled.":"Google Pay is not available on this browser/device (or wallet is not configured). Please try Chrome with Google Pay enabled.");return}n.on("paymentmethod",async e=>{try{window.__PMD_WALLET_POST&&window.__PMD_WALLET_POST({level:"info",message:"PMD_PAYMENTMETHOD_EVENT",data:{method:t.method,paymentMethodId:e?.paymentMethod?.id||null,payerName:e?.payerName||null,payerEmail:e?.payerEmail||null}})}catch{}try{d(!0);let a=await fetch("/api/v1/payments/stripe/create-intent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:t.amount,currency:(t.currency||"eur").toLowerCase(),preferredMethod:t.method,restaurantId:String(t.restaurantId),cartId:t.cartId?String(t.cartId):null,userId:t.userId?String(t.userId):null,items:t.items||[],customerInfo:t.customerInfo||{},tableNumber:t.tableNumber||null})}),o=await a.json();if(iF(o),!a.ok||!o?.clientSecret)throw Error(o?.error||"Failed to create payment intent");let{paymentIntent:n,error:i}=await r.confirmCardPayment(o.clientSecret,{payment_method:e.paymentMethod.id},{handleActions:!0});if(i)throw e.complete("fail"),Error(i.message||"Wallet payment failed");if(e.complete("success"),n?.status==="succeeded")t.onSuccess(n.id);else throw Error("Unexpected PI status: "+(n?.status||"unknown"))}catch(e){try{window.__PMD_WALLET_POST&&window.__PMD_WALLET_POST({level:"error",message:"PMD_WALLET_ONERROR",data:{method:t.method,message:e?.message||String(e)}})}catch{}}finally{d(!1)}}),iV._paymentRequest=n}catch(r){if(e)return;l(!1),i(!0);try{window.__PMD_WALLET_POST&&window.__PMD_WALLET_POST({level:"warn",message:"PMD_WALLET_NOT_SUPPORTED",data:{method:t.method}})}catch{}p(r?.message||String(r))}}(),()=>{e=!0}},[r,t.currency,t.countryCode,t.amount]),!n)return(0,o.jsx)("div",{className:"py-2 text-xs text-gray-500",children:"Loading wallet…"});if(!s)return(0,o.jsx)("div",{className:"rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800",children:m||"Wallet not supported here."});let u=String((t.currency||"eur").toLowerCase())+"-"+String(t.countryCode||"DE")+"-"+String(t.amount),h=iV._paymentRequest;return(0,o.jsxs)("div",{className:"space-y-3",children:[(0,o.jsx)("div",{className:"rounded-xl overflow-hidden",children:(0,o.jsx)(rz,{options:{paymentRequest:h,style:{paymentRequestButton:{type:(t.method,"default"),theme:"dark",height:"44px"}}}},u)}),c&&(0,o.jsx)("div",{className:"text-xs text-gray-500",children:"Processing…"})]})}function iK(e){let{selectedPaymentMethod:t,selectedMethod:r,stripePromise:a,stripeConfig:i,stripeConfigError:s,hasUnsubmittedPaymentDraft:l,checkoutStep:c,setCheckoutStep:d,selectedProviderCode:m,handleBackToMethods:p,paypalConfigLoading:u,effectivePayPalClientId:h,effectivePayPalCurrency:f,resolveSubmittedPaymentAmount:y,itemsToPay:g,stripeResolvedRestaurantId:b,paymentFormData:k,stripeResolvedTableNumber:v,handlePayment:x,toast:z,merchantSettings:C,payableTotal:w,providerInlineError:S,isLoading:_,startHostedRedirectCheckout:E,stripePaymentData:N,finalTotal:I,modalPrimaryBtnStyle:T,cashCollectionConfirmed:A,setCashCollectionConfirmed:j}=e;try{window.__PMD_WALLET_POST&&window.__PMD_WALLET_POST({level:"info",message:"PMD_RENDER_PAYMENT_FORM_STATE",data:{selectedPaymentMethod:t,selectedMethod:r?{code:r.code,name:r.name}:null,stripePromise:!!a,hasStripeConfig:!!i,stripeCurrency:i?.currency||null,stripeCountryCode:i?.countryCode||null}})}catch{}let P=n.default.useRef(null),B=n.default.useCallback((e,t)=>{let r=String(t||"Payment failed. Please try again.").trim(),a=`${e}:${r}`,o=Date.now(),n=P.current;n&&n.key===a&&o-n.at<3500||(P.current={key:a,at:o},z({title:e,description:r,variant:"destructive"}))},[z]);if(!r)return null;if("payment"===c&&l())return(0,o.jsxs)("div",{className:"rounded-2xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-900",children:[(0,o.jsx)("div",{className:"font-semibold",children:"Submit order first"}),(0,o.jsx)("div",{className:"mt-1",children:"Please send the table order to the kitchen first. Payment starts only after the backend creates a real order ID."}),(0,o.jsx)(eP.Button,{type:"button",onClick:()=>d("review"),className:"mt-3 w-full rounded-xl bg-amber-700 text-white hover:bg-amber-800",children:"Back to order review"})]});switch(r.code){case"card":if("paypal"===m)return(0,o.jsxs)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,o.jsxs)("div",{className:"flex items-center gap-2 mb-4",children:[(0,o.jsx)(eP.Button,{variant:"ghost",size:"sm",onClick:p,className:"p-2 h-9 w-9 pmd-v2-action-circle",children:(0,o.jsx)(ej.ArrowLeft,{className:"h-4 w-4"})}),(0,o.jsxs)("div",{className:"flex items-center gap-2",children:[(0,o.jsx)(J.CreditCard,{className:"h-5 w-5 text-paydine-elegant-gray"}),(0,o.jsx)("span",{className:"font-semibold text-paydine-elegant-gray",children:"Card (via PayPal)"})]})]}),u?(0,o.jsx)("div",{className:"rounded-xl p-4 border text-sm text-gray-600",children:"Loading PayPal..."}):h?(0,o.jsx)(t2,{options:{clientId:h,currency:f,intent:"capture",components:"buttons",disableFunding:"sepa"},children:(0,o.jsx)(iD,{paypalFundingSource:"card",paymentData:{amount:y(),payment_method:"card",currency:f.toLowerCase(),items:g.map(e=>({id:String(e.item.id),name:e.item.name,price:e.price,quantity:e.quantity||1,restaurantId:b})),customerInfo:{name:k?.cardholderName||"",email:k?.email||"",phone:k?.phone||""},restaurantId:b,tableNumber:v},onPaymentComplete:e=>{e?.success&&e?.transactionId&&x(e.transactionId)},onPaymentError:e=>{B("Payment Failed",e)}})}):(0,o.jsx)("div",{className:"rounded-xl p-4 border text-sm text-gray-600",children:"PayPal card checkout is not configured for this restaurant."})]});if(m&&"stripe"!==m){if("worldline"===m)return(0,o.jsxs)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,o.jsx)("div",{className:"mb-2",children:(0,o.jsx)("span",{className:"font-semibold text-paydine-elegant-gray",children:"Worldline card payment"})}),(0,o.jsx)(iL,{paymentData:{amount:y(),payment_method:"card",currency:C?.currency||"EUR",items:g.map(e=>({id:String(e.item.id),name:e.item.name,price:e.price,quantity:e.quantity||1,restaurantId:b})),customerInfo:{name:k?.cardholderName||"",email:k?.email||"",phone:k?.phone||""},restaurantId:b,tableNumber:v},currency:C?.currency||"EUR",countryCode:i?.countryCode||"DE",onPaymentComplete:e=>{e?.success&&e?.transactionId&&x(e.transactionId)},onPaymentError:e=>{B("Worldline Payment Failed",e)}})]});if("sumup"===m){let e=`${window.location.origin}/payment/sumup/complete`,t=window.location.href;return(0,o.jsxs)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,o.jsx)(iU,{amount:w,currency:C?.currency||"EUR",description:"PayMyDine SumUp checkout",successUrl:e,cancelUrl:t,className:"w-full"}),S&&(0,o.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:S})]})}return(0,o.jsxs)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,o.jsx)("div",{className:"mb-2",children:(0,o.jsx)("span",{className:"font-semibold text-paydine-elegant-gray",children:r?.name||"Card Payment"})}),(0,o.jsx)("div",{className:"rounded-xl border p-3 text-sm text-paydine-elegant-gray/80",children:"vr_payment"===m?"You will be redirected to a secure VR Payment checkout page.":`Your card details will be completed in a secure embedded ${m.toUpperCase()} frame.`}),(0,o.jsx)(eP.Button,{type:"button",onClick:E,disabled:_,className:"w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl",children:_?"Opening secure form...":`Pay with ${"vr_payment"===m?"VR Payment":m.toUpperCase()}`}),S&&(0,o.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:S})]})}return(0,o.jsx)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},children:(0,o.jsx)(iM,{methodName:r?.name,stripeConfigError:s,stripePromise:a,cardEnabled:i?.methods?.card!==!1,paymentData:N,onPaymentSuccess:x,onPaymentError:e=>{B("Payment Failed",e)}})});case"paypal":return(0,o.jsx)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:"vr_payment"===m?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)("div",{className:"rounded-xl border p-3 text-sm text-paydine-elegant-gray/80",children:"You will be redirected to a secure VR Payment PayPal checkout page."}),(0,o.jsx)(eP.Button,{type:"button",onClick:E,disabled:_,className:"w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl",children:_?"Opening PayPal...":"Pay with PayPal"}),S&&(0,o.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:S})]}):u?(0,o.jsx)("div",{className:"rounded-xl p-4 border text-sm text-gray-600",children:"Loading PayPal..."}):h?(0,o.jsx)(t2,{options:{clientId:h,currency:f,intent:"capture",components:"buttons",disableFunding:"card,sepa"},children:(0,o.jsx)(iD,{paypalFundingSource:"paypal",paymentData:{amount:y(),payment_method:"paypal",currency:f.toLowerCase(),items:g.map(e=>({id:String(e.item.id),name:e.item.name,price:e.price,quantity:e.quantity||1,restaurantId:b})),customerInfo:{name:k?.cardholderName||"",email:k?.email||"",phone:k?.phone||""},restaurantId:b,tableNumber:v},onPaymentComplete:e=>{e?.success&&e?.transactionId&&x(e.transactionId)},onPaymentError:e=>{z({title:"Payment Failed",description:e,variant:"destructive"})}})}):(0,o.jsx)("div",{className:"rounded-xl p-4 border text-sm text-gray-600",children:"PayPal is not configured for this restaurant."})});case"apple_pay":case"google_pay":if(!t)return null;return(0,o.jsx)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:"vr_payment"===m?(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)("div",{className:"rounded-xl border p-3 text-sm text-paydine-elegant-gray/80",children:"You will be redirected to a secure VR Payment checkout page."}),(0,o.jsx)(eP.Button,{type:"button",onClick:E,disabled:_,className:"w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl",children:_?"Opening wallet...":`Pay with ${"apple_pay"===t?"Apple Pay":"Google Pay"}`}),S&&(0,o.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:S})]}):i?.methods?.[t]?a?(0,o.jsx)(ru,{stripe:a,children:(0,o.jsx)(iV,{method:t,amount:w,currency:i?.currency||C?.currency||"EUR",countryCode:i?.countryCode||"DE",restaurantId:b||"1",cartId:N?.cartId||null,userId:N?.userId||null,items:N?.items||[],customerInfo:N?.customerInfo||{},tableNumber:N?.tableNumber||null,onSuccess:e=>{x(e)},onError:e=>{z({title:"Payment Failed",description:e,variant:"destructive"})}})}):(0,o.jsx)("div",{className:"rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800",children:"Stripe is still loading. Please wait a few seconds and try again."}):(0,o.jsx)("div",{className:"rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800",children:"apple_pay"===t?"Apple Pay is not enabled for this restaurant.":"Google Pay is not enabled for this restaurant."})});case"wero":return(0,o.jsxs)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:[(0,o.jsx)("div",{className:"rounded-xl border p-3 text-sm text-paydine-elegant-gray/80",children:"worldline"===m?"You will be redirected to a secure Wero checkout powered by Worldline.":"vr_payment"===m?"You will be redirected to a secure Wero checkout powered by VR Payment.":"You will be redirected to a secure Wero checkout powered by Stripe."}),(0,o.jsx)(eP.Button,{type:"button",onClick:E,disabled:_,className:"w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl",children:_?"Opening Wero...":"Pay with Wero"}),S&&(0,o.jsx)("div",{className:"rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200",children:S})]});case"cod":return(0,o.jsx)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"space-y-3 overflow-hidden",children:(0,o.jsxs)("div",{className:"space-y-3",children:[(0,o.jsxs)("div",{className:"bg-gray-50 rounded-xl p-4",children:[(0,o.jsx)("div",{className:"text-sm font-medium text-paydine-elegant-gray mb-2",children:"Total due"}),(0,o.jsx)("div",{className:"text-lg font-bold text-paydine-elegant-gray",children:U("payment"===c?w:I)})]}),(0,o.jsx)(eP.Button,{type:"button",disabled:_,onClick:async()=>{j(!0),await x(void 0,{method_code:"cod",provider_code:null})},className:"w-full",style:T,children:_?"Submitting...":"Confirm cash payment"}),A&&(0,o.jsx)("div",{className:"rounded-xl border p-3 text-sm",style:{borderColor:"var(--theme-border)",color:"var(--theme-text-primary)",background:"var(--theme-surface)"},children:"Please have the exact amount ready when the waiter comes to collect payment."})]})});default:return null}}function iq(e){let{selectedMethod:t,checkoutStep:r,payableTotal:a,finalTotal:n,selectedPaymentMethod:i,handlePayment:s,isLoading:l,paymentFormData:c}=e;return!t||["card","wero","paypal"].includes(t.code)||"apple_pay"===i||"google_pay"===i||"wero"===i?null:(0,o.jsx)(tt,{type:"button",onClick:s,disabled:l||!(()=>{switch(t.code){case"card":case"apple_pay":case"google_pay":case"cod":return!0;case"paypal":return c.email;default:return!1}})(),variant:"primary",fullWidth:!0,children:l?(0,o.jsxs)("div",{className:"flex items-center gap-2",children:[(0,o.jsx)("div",{className:"w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"}),"Processing..."]}):(0,o.jsxs)("div",{className:"flex items-center gap-2",children:[(0,o.jsx)(rw,{className:"h-4 w-4"}),(()=>{switch(t.code){case"card":return`Pay ${U("payment"===r?a:n)}`;case"paypal":return"Pay with PayPal";case"apple_pay":case"google_pay":return`Pay with ${t.name}`;case"cod":return"Confirm Cash Payment";default:return"Pay"}})()]})})}let iH=[{name:"Luna",avatar:"L"},{name:"Milo",avatar:"M"},{name:"Zara",avatar:"Z"},{name:"Leo",avatar:"L"},{name:"Nova",avatar:"N"},{name:"Coco",avatar:"C"},{name:"Rio",avatar:"R"},{name:"Nala",avatar:"N"},{name:"Oscar",avatar:"O"},{name:"Bella",avatar:"B"}];function iG(){return window.location.host}function i$(e){let t=new URLSearchParams(window.location.search),r=t?.get("table")||t?.get("table_id")||t?.get("table_no"),a=window.location.pathname.match(/\/table\/(\d+)/)?.[1]??null;return String(e?.table_id||e?.table_no||r||a||"delivery")}function iW(){let e="pmd_guest_session_id",t=localStorage.getItem(e);return t||(t=`g_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,localStorage.setItem(e,t)),t}function iY(e){let t=Number(e||0);return!Number.isFinite(t)||t<=0?null:Number(t.toFixed(2))}async function iQ({selectedMethod:e,resolveSubmittedPaymentAmount:t,setProviderInlineError:r,toast:a,checkoutStep:o,pendingSummary:n,resolveSubmittedPaymentOrderId:s,hasUnsubmittedPaymentDraft:l,setSelectedPaymentMethod:c,setIsLoading:d,ensureGuestSession:m,tableInfo:p,merchantSettings:u,paymentFormData:h,itemsToPay:f}){if(!e||!["card","wero","paypal","apple_pay","google_pay"].includes(e.code))return;if(!(t()>0)){r("Order total is still updating. Please reopen My Order."),a({title:"Order total unavailable",description:"Order total is still updating. Please reopen My Order.",variant:"destructive"});return}let y="payment"!==o||n?null:s();if("payment"===o&&!n&&!y&&l()){r("Please submit the table order first, then start payment."),a({title:"Submit order first",description:"Please submit the table order first, then start payment.",variant:"destructive"});return}r(null),d(!0);let g=!1;try{let r=null,a="payment"!==o||n?null:s();a&&(r=await i.apiClient.startExistingOrderPayment({order_id:Number(a),payment_method:String(e.code),provider:String(e?.provider_code||""),guest_session_id:m(),table_id:p?.table_id?String(p.table_id):null,table_no:p?.table_no?String(p.table_no):null,source:"menu_existing_submitted"}));let l=String(e?.provider_code||"").toLowerCase(),c="wero"===e.code?"worldline"===l?"worldline":"vr_payment"===l?"vr_payment":"stripe":l||"unknown",d=`PMD-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,y=`${window.location.origin}${window.location.pathname}${window.location.search?`${window.location.search}&`:"?"}payment_return_provider=${encodeURIComponent("worldline"===c?"worldline":"vr_payment"===c?"vr_payment":"wero")}`,b=window.location.href,k="vr_payment"===c?({card:"/api/v1/payments/vr-payment/card/create-session",paypal:"/api/v1/payments/vr-payment/paypal/create-session",wero:"/api/v1/payments/vr-payment/wero/create-session",apple_pay:"/api/v1/payments/vr-payment/apple-pay/create-session",google_pay:"/api/v1/payments/vr-payment/google-pay/create-session"})[e.code]||"/api/v1/payments/vr-payment/card/create-session":"wero"===e.code?"worldline"===l?"/api/v1/payments/worldline/wero/create-session":"/api/v1/payments/wero/create-session":"/api/v1/payments/card/create-session";console.info("[PMD_CHECKOUT_FLOW_TRACE]",{selected_method:e.code,backend_selected_provider:c,endpoint:k,flow_mode:"primary"});let v=await fetch(k,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:Number(r?.amount||t()),currency:String(r?.currency||u?.currency||"EUR"),return_url:y,cancel_url:b,customer_email:h.email||"",merchant_reference:d,order_id:a?Number(a):void 0,items:f.map(e=>({id:String(e.item.id),name:e.item.name,quantity:Number(e.quantity||1),price:Number(e.price||0)}))})}),x=await v.text(),z=null;try{z=x?JSON.parse(x):null}catch{z=null}if(!v.ok||!z?.success||!z?.redirect_url){let r="worldline"===c?"Worldline":"vr_payment"===c?"VR Payment":"sumup"===c?"SumUp":"square"===c?"Square":"Stripe",a=String(z?.resolved_error_code||z?.error_code||"").toLowerCase(),o=["worldline_invalid_credentials_or_entitlement","worldline_session_unavailable"].includes(a),n=!!z?.allow_fallback||o,i=z?.error||(x&&x.length<1e3?x:"")||`${r} checkout failed with HTTP ${v.status}`;if("wero"===e.code&&(z?.error_code==="wero_not_supported"||z?.error_code==="wero_unavailable"))throw g=!0,Error("Wero is currently unavailable. Please choose another payment method.");if("wero"===e.code){if("worldline"===c&&n){let e=y.includes("payment_return_provider=")?y.replace(/payment_return_provider=[^&]*/i,"payment_return_provider=wero"):`${y}${y.includes("?")?"&":"?"}payment_return_provider=wero`,r=await fetch("/api/v1/payments/wero/create-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:t(),currency:u?.currency||"EUR",return_url:e,cancel_url:b,customer_email:h.email||"",fallback_method:"ideal",fallback_from_worldline:!0,items:f.map(e=>({id:String(e.item.id),name:e.item.name,quantity:Number(e.quantity||1),price:Number(e.price||0)}))})}),o=await r.text(),n=null;try{n=o?JSON.parse(o):null}catch{n=null}if(r.ok&&n?.success&&n?.redirect_url){console.info("[PMD_CHECKOUT_FLOW_TRACE]",{selected_method:"wero",original_provider:"worldline",backend_selected_provider:String(n?.provider||"stripe"),fallback_provider:String(n?.fallback_provider||"stripe"),fallback_method:String(n?.fallback_method||"ideal"),resolved_error_code:a,endpoint:"/api/v1/payments/wero/create-session",flow_mode:"fallback",redirect_url_type:typeof n?.redirect_url,has_session_id:!!n?.session_id}),n?.session_id&&localStorage.setItem("pmd_wero_pending_checkout",JSON.stringify({session_id:String(n.session_id),method_code:"wero",provider_code:"stripe",created_at:Date.now()})),window.location.href=String(n.redirect_url);return}}throw Error(`${r} Wero error${a?` (${a})`:""}: ${i}`)}throw Error(i||"Unable to start hosted checkout")}"worldline"===c&&z?.hosted_checkout_id&&localStorage.setItem("pmd_worldline_pending_checkout",JSON.stringify({hosted_checkout_id:String(z.hosted_checkout_id),method_code:e.code,provider_code:c,created_at:Date.now()})),"sumup"===c&&z?.checkout_id&&localStorage.setItem("pmd_sumup_pending_checkout",JSON.stringify({checkout_id:String(z.checkout_id),created_at:Date.now()})),"square"===c&&z?.payment_link_id&&localStorage.setItem("pmd_square_pending_checkout",JSON.stringify({payment_link_id:String(z.payment_link_id),order_id:z?.order_id?String(z.order_id):null,created_at:Date.now()})),"stripe"===c&&z?.session_id&&localStorage.setItem("pmd_wero_pending_checkout",JSON.stringify({session_id:String(z.session_id),method_code:e.code,provider_code:c,created_at:Date.now()})),"vr_payment"===c&&z?.session_id&&localStorage.setItem("pmd_vr_payment_pending_checkout",JSON.stringify({session_id:String(z.session_id),merchant_reference:d,method_code:e.code,provider_code:"vr_payment",created_at:Date.now()})),console.info("[PMD_CHECKOUT_FLOW_TRACE]",{selected_method:e.code,backend_selected_provider:String(z?.provider||c),endpoint:k,flow_mode:z?.fallback?"fallback":"primary",redirect_url_type:typeof z?.redirect_url,has_session_id:!!z?.session_id,has_hosted_checkout_id:!!z?.hosted_checkout_id}),window.location.href=z.redirect_url}catch(e){g&&c(null),d(!1),r(e instanceof Error?e.message:"Unable to start checkout"),a({title:"Payment Failed",description:e instanceof Error?e.message:"Unable to start checkout",variant:"destructive"})}}async function iX({stripePaymentIntentId:e,forcedPaymentContext:t,selectedPaymentMethod:r,visiblePaymentMethods:a,toast:o,setIsLoading:n,tableInfo:s,itemsToPay:l,paymentFormData:c,tableDraft:d,selectedOptions:m,checkoutStep:p,payableTotal:u,finalTotal:h,paymentTipAmount:f,tipAmount:y,selectedSplitPersonId:g,appliedCoupon:b,paymentCouponDiscount:k,couponDiscount:v,ensureGuestSession:x,hasUnsubmittedPaymentDraft:z,initialSubmittedOrder:C,resolveSubmittedPaymentOrderId:w,resolveSubmittedPaymentAmount:S,pmdLatestSubmittedPaymentOrderIdRef:_,submittedSnapshot:N,existingOrderId:I,pendingSummary:T,resetPaymentAdjustmentsAfterSuccess:A,setCheckoutStep:j,t:P,selectedSplitPerson:B,isSplitting:R,splitMethod:O,splitSourceItems:L,itemAssignments:D,pmdSubmittedItemsSubtotal:U,paymentPayableTotal:M,markOpenOrderAsPaid:F,setPaidSplitPeople:V,taxSettings:K,subtotal:q,taxAmount:H,merchantSettings:G,estimatedMinutes:$,onOpenOrderUpdate:W,clearCart:Y,setSubmittedSnapshot:Q,getTenantKey:X,getTableKey:Z,buildOpenOrderStorageKeys:J}){let ee=t?.method_code||r,et=a.find(e=>e.code===ee),er="cod"===ee?null:t?.provider_code||et?.provider_code||null,ea="stripe"===er&&("card"===ee||"apple_pay"===ee||"google_pay"===ee||"wero"===ee);if(ea&&!e)return void o({title:"Payment Failed",description:"Stripe payment confirmation is missing. Please try again.",variant:"destructive"});n(!0);try{let t=s?.is_codier||!1,r=window.location.pathname.match(/\/table\/(\d+)/)?.[1]??null,a=new URLSearchParams(window.location.search).get("table")||new URLSearchParams(window.location.search).get("table_id")||new URLSearchParams(window.location.search).get("table_no")||null,et=s?.table_id??r??a??null,en=null==et||""===String(et).trim()||Number.isNaN(Number(et))?null:Number(et),ei=s?.table_name&&""!==String(s.table_name).trim()?String(s.table_name):en?`Table ${en}`:"Delivery",es=Number(s?.location_id||1),el=l.map((e,t)=>{let r=Number(e?.item?.id??e?.item?.menu_id??0),a=Number(e?.quantity||1),o=Number(e?.price??e?.item?.price??0),n=String(e?.item?.name??e?.item?.title??"").trim();return{menu_id:Number.isFinite(r)?r:0,name:""!==n?n:`Item ${t+1}`,quantity:Number.isFinite(a)&&a>0?a:1,price:Number.isFinite(o)&&o>=0?o:0,special_instructions:"",options:Object.fromEntries(Object.entries(m[String(e?.optionKey||e?.item?.id)]||{}).map(([e,t])=>[String(e),String(t??"")]).filter(([,e])=>""!==e))}}),ec="payment"===p&&!!g,ed=ec?0:Number(k||0),em=ec?null:b?.code?String(b.code):null,ep={table_id:t?"cashier":null!=en?String(en):null,table_name:String(t?"Cashier":ei),location_id:es,is_codier:!!t,items:el,customer_name:String(t?"Cashier Customer":`${ei} Customer`),customer_phone:String(c.phone||""),customer_email:String(c.email||""),payment_method:"cod"===ee?"cash":"paypal"===ee?"paypal":"card",payment_method_raw:ee||void 0,payment_provider:er||void 0,payment_reference:e?String(e):void 0,stripe_payment_intent_id:ea&&e?String(e):void 0,total_amount:Number("payment"===p?u:h),tip_amount:Number("payment"===p?f:y),coupon_code:"payment"===p?em:b?.code?String(b.code):null,coupon_discount:Number("payment"===p?ed:v),guest_session_id:x(),special_instructions:""},eu=z()||C?.paymentStatus==="paid"?null:C;eu?.orderId&&(ep.existing_order_id=Number(eu.orderId),ep.append_to_order=!0);let eh=w();if(console.info("PMD_PAYMENT_ORDER_ID_RESOLVED",{paymentOrderIdCandidate:eh,latestRef:_.current,submittedSnapshotOrderId:N?.orderId||N?.order_id||null,tableDraftOrderId:d?.order_id||d?.orderId||null,existingOrderId:I}),"payment"===p&&!eh){n(!1),o({title:"Order not found",description:"Please send the table order to the kitchen first.",variant:"destructive"});return}let ef="qr_pay_later"===String(d?.payment||N?.payment||"").toLowerCase(),ey=!!("payment"===p&&eh&&(T||ef));if("payment"===p&&eh&&!ey)try{let t=await i.apiClient.startExistingOrderPayment({order_id:Number(eh),payment_method:String(ee||"card"),provider:er||void 0,guest_session_id:x(),table_id:s?.table_id?String(s.table_id):null,table_no:s?.table_no?String(s.table_no):null,source:"menu_existing_submitted"});if("cod"===String(ee||"")){n(!1),o({title:"Cash collection requested",description:t?.message||"Staff will collect payment shortly."});return}if(ea){if(!e)throw Error("Stripe payment confirmation is missing");await i.apiClient.finalizeExistingOrderPayment({order_id:Number(eh),payment_intent_id:String(e),payment_method:String(ee||"card"),provider:er||"stripe"})}g?V(e=>({...e,[g]:!0})):(F(eh,{tipAmount:f,couponDiscount:ed,paidTotal:M,couponCode:em}),A()),j("paid"),n(!1),o({title:P("paymentSuccessful"),description:`Order #${eh} paid successfully!`});return}catch(e){n(!1),o({title:"Payment unavailable",description:"Payment could not be started. Please ask staff or try again.",variant:"destructive"});return}let eg=(()=>{for(let e of[M,u]){let t=Number(e);if(Number.isFinite(t)&&t>=0)return Math.round(100*t)/100}return 0})();if(ey&&eh){let t=ep.payment_method,r=g&&"items"===O?L.reduce((e,t)=>{let r=Number(String(g).replace("guest-",""));if(D[t.key]!==r)return e;let a=Number(t.orderMenuId||0);if(!a)return e;let o=e.find(e=>e.order_menu_id===a);return o?o.quantity+=1:e.push({order_menu_id:a,quantity:1}),e},[]):void 0,a="payment"===p?S():B?.total?Number(B.total.toFixed(2)):R?null:E(T?.remainingAmount)??E(N?.total)??null;console.info("PMD_PAYMENT_AMOUNT_RESOLVED",{order_id:eh,amount:eg,payableTotal:u,paymentPayableTotal:M,submittedSnapshotTotal:N?.total??null,submittedSnapshotRemaining:N?.remainingAmount??null,tableDraftTotal:d?.totals?.total??null,submittedItemsSubtotal:U()});let l=e=>{let t=Number(e);return Number.isFinite(t)?Math.round(100*t)/100:0},c=(()=>{for(let e of[l(U()),T?.remainingAmount,N?.remainingAmount,d?.totals?.remainingAmount,a,N?.total,d?.totals?.total]){let t=l(e);if(t>0)return t}return 0})(),m=l(Math.max(0,Number(f||0))),h=l(Math.min(Math.max(0,Number(ed||0)),c+m)),y=l(Math.max(0,c+m-h)),b={payment_method:String(t),payment_reference:e?String(e):null,amount:y>0?y:void 0,tip_amount:m,coupon_discount:h,coupon_code:"payment"===p?em:null,selected_items:r,table_id:s?.table_id?String(s.table_id):null,table_no:s?.table_no?String(s.table_no):null,qr:s?.qr_code?String(s.qr_code):null};console.info("PMD_PAY_EXISTING_AMOUNT_V42",{order_id:eh,base_amount:c,tip_amount:m,coupon_discount:h,charge_amount:y,old_item_amount:a}),console.info("PMD_PAY_EXISTING_PAYLOAD",{order_id:eh,...b});let k=await i.apiClient.payExistingQrOrder(eh,b);if(k?.success){n(!1),o({title:P("paymentSuccessful"),description:`Order #${eh} paid successfully!`});let e=String(eh);localStorage.setItem("lastOrderId",e);let t=`${window.location.pathname}${window.location.search}`,r=new URLSearchParams;r.set("order_id",e),r.set("return_url",t),g?V(e=>({...e,[g]:!0})):(F(eh,{tipAmount:f,couponDiscount:ed,paidTotal:M,couponCode:em}),A()),j("paid");return}}let eb=await i.apiClient.submitOrder(ep);if(eb.success){var eo;n(!1),o({title:P("paymentSuccessful"),description:`Order #${eb.order_id} submitted successfully!`});let e=eb.order_id?String(eb.order_id):"";e&&localStorage.setItem("lastOrderId",e);let t=`${window.location.pathname}${window.location.search}`,r=new URLSearchParams;e&&r.set("order_id",e),r.set("return_url",t);try{let e=x(),t=X(),r=Z(),a=J().sessionKey,o=eb.order_id?String(eb.order_id):"",n=Array.isArray(eb?.order_totals)?eb.order_totals:[],i=e=>{let t=n.find(t=>String(t?.code||"")===e),r=Number(t?.value??0);return Number.isFinite(r)?r:0},l=Array.isArray(eb?.items)?eb.items:[],c=l.length>0?l.map(e=>({id:Number(e?.menu_id||e?.id||0),name:String(e?.name||"Item"),quantity:Number(e?.quantity||0),price:Number(e?.price||0),subtotal:Number(e?.subtotal||Number(e?.quantity||0)*Number(e?.price||0))})):el,d=eb?.settlement||{},m=Number(eb?.order_total??eb?.total??0),p={guestSessionId:e,tenant:t,tableKey:r,tableNumber:s?.table_no||s?.table_id||null,orderId:o||null,status:"submitted",paymentStatus:"unpaid",subtotal:Number(i("subtotal")||q||0),vatAmount:Number(i("tax")||H||0),vatPercentage:Number(K?.percentage||0),total:Number(m>0?m:h||0),orderTotal:Number(m>0?m:h||0),settledAmount:Number(d?.settledAmount||0),remainingAmount:Number(d?.remainingAmount??(m>0?m:h||0)),settlementStatus:String(d?.settlementStatus||"unpaid"),etaMinutes:Number(eb?.eta_minutes??eb?.estimated_prep_minutes??$),showCustomerEta:!!(eb?.show_customer_eta??!0),currency:String(G?.currency||"EUR"),submittedItems:c,createdAt:Date.now()};localStorage.setItem(a,JSON.stringify(p)),Q(p),W?.(p)}catch{}Y(),"payment"===p&&(F(e||N?.orderId||null,{tipAmount:f,couponDiscount:ed,paidTotal:M,couponCode:em}),A()),j((eo=p,"payment"===eo?"paid":eV()));return}throw Error("Order submission failed")}catch(a){n(!1),console.error("Order submission error:",a);let e=a instanceof Error&&/given data was invalid|unprocessable|amount|selected items amount mismatch/i.test(a.message)?"Payment could not be started. Please ask staff or try again.":null,t=a?.details,r=t?Object.values(t).flat().find(Boolean):null;o({title:"Order Failed",description:e||r||(a instanceof Error?a.message:"Failed to submit order. Please try again."),variant:"destructive"})}}function iZ(e){return(iZ="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}var iJ="clover",i0="https://js.stripe.com",i1="".concat(i0,"/").concat(iJ,"/stripe.js"),i2=/^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/,i5=/^https:\/\/js\.stripe\.com\/(v3|[a-z]+)\/stripe\.js(\?.*)?$/,i3=function(){for(var e=document.querySelectorAll('script[src^="'.concat(i0,'"]')),t=0;t<e.length;t++){var r,a=e[t];if(r=a.src,i2.test(r)||i5.test(r))return a}return null},i4=function(e){var t=e&&!e.advancedFraudSignals?"?advancedFraudSignals=false":"",r=document.createElement("script");r.src="".concat(i1).concat(t);var a=document.head||document.body;if(!a)throw Error("Expected document.body not to be null. Stripe.js requires a <body> element.");return a.appendChild(r),r},i8=function(e,t){e&&e._registerWrapper&&e._registerWrapper({name:"stripe-js",version:"8.11.0",startTime:t})},i6=null,i9=null,i7=null,se=function(e,t,r){if(null===e)return null;var a,o=t[0];if("string"!=typeof o)throw Error("Expected publishable key to be of type string, got type ".concat(iZ(o)," instead."));var n=o.match(/^pk_test/),i=3===(a=e.version)?"v3":a;n&&i!==iJ&&console.warn("Stripe.js@".concat(i," was loaded on the page, but @stripe/stripe-js@").concat("8.11.0"," expected Stripe.js@").concat(iJ,". This may result in unexpected behavior. For more information, see https://docs.stripe.com/sdks/stripejs-versioning"));var s=e.apply(void 0,t);return i8(s,r),s},st=!1,sr=function(){return r||(r=(null!==i6?i6:(i6=new Promise(function(e,t){if("u"<typeof window||"u"<typeof document)return void e(null);if(window.Stripe,window.Stripe)return void e(window.Stripe);try{var r,a=i3();a?a&&null!==i7&&null!==i9&&(a.removeEventListener("load",i7),a.removeEventListener("error",i9),null==(r=a.parentNode)||r.removeChild(a),a=i4(null)):a=i4(null),i7=function(){window.Stripe?e(window.Stripe):t(Error("Stripe.js not available"))},i9=function(e){t(Error("Failed to load Stripe.js",{cause:e}))},a.addEventListener("load",i7),a.addEventListener("error",i9)}catch(e){t(e);return}})).catch(function(e){return i6=null,Promise.reject(e)})).catch(function(e){return r=null,Promise.reject(e)}))};Promise.resolve().then(function(){return sr()}).catch(function(e){st||console.warn(e)});var sa=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];st=!0;var a=Date.now();return sr().then(function(e){return se(e,t,a)})};function so(e,t){return e instanceof Error?e.message:t}function sn(e,t){return String(e||"").trim()||`Guest ${t+1}`}function si(e,t){return e[t]?.avatar||String(t+1)}function ss(e,t,r){return r?Number.parseFloat(String(r))||0:Number(e||0)*(Number(t||0)/100)}function sl({isOpen:e,onClose:t,items:r,tableInfo:a,existingOrderId:s,pendingSummary:l,initialSubmittedOrder:c,initialCheckoutStep:d,preferPersonalReview:m=!1,onOpenOrderUpdate:p,onCartPricingUpdate:u,checkoutVisualTheme:h="neutral"}){var y;let v,{toast:C}=(0,z.useToast)(),{t:S}=(0,f.useLanguageStore)(),{tipSettings:A}={tipSettings:(0,b.useCmsStore)(e=>e.tipSettings),updateTipSettings:(0,b.useCmsStore)(e=>e.updateTipSettings)},{taxSettings:P,loadVATSettings:B}=k(),{merchantSettings:R}=(0,g.usePaymentSettingsStore)(),{appliedCoupon:O,validateCoupon:D,removeCoupon:U}=(v=(0,b.useCmsStore)(e=>e.appliedCoupon),{appliedCoupon:v,validateCoupon:(0,b.useCmsStore)(e=>e.validateCoupon),removeCoupon:(0,b.useCmsStore)(e=>e.removeCoupon)}),{clearCart:M,addToCart:F}=(0,x.useCartStore)(),[V,K]=(0,n.useState)(!1),{isSplitting:q,setIsSplitting:H,selectedItems:G,splitMethod:$,setSplitMethod:W,splitGuestCount:Y,setSplitGuestCount:Q,itemAssignments:X,setItemAssignments:Z,sharePercents:J,setSharePercents:ee,selectedSplitPersonId:et,setSelectedSplitPersonId:ei,paidSplitPeople:ed,setPaidSplitPeople:em}=function(){let[e,t]=(0,n.useState)(!1),r=(0,n.useRef)({}).current,[a,o]=(0,n.useState)("equal"),[i,s]=(0,n.useState)(2),[l,c]=(0,n.useState)({}),[d,m]=(0,n.useState)([50,50]),[p,u]=(0,n.useState)(null),[h,f]=(0,n.useState)({});return{isSplitting:e,setIsSplitting:t,selectedItems:r,splitMethod:a,setSplitMethod:o,splitGuestCount:i,setSplitGuestCount:s,itemAssignments:l,setItemAssignments:c,sharePercents:d,setSharePercents:m,selectedSplitPersonId:p,setSelectedSplitPersonId:u,paidSplitPeople:h,setPaidSplitPeople:f}}(),{selectedOptions:ep,handleOptionsChange:eu,adjustPriceForVAT:eh,personalReviewItems:ef,allItemInstances:ey,itemsToPay:eg,subtotal:eb,taxAmount:ek}=function({allItems:e,taxSettings:t,t:r,isSplitting:a,selectedItems:o,onCartPricingUpdate:i}){let[s,l]=(0,n.useState)({}),c=(0,n.useCallback)(e=>t.enabled&&t.percentage>0&&0===t.menuPrice?e*(1+t.percentage/100):e,[t.enabled,t.percentage,t.menuPrice]),d=(0,n.useCallback)((e,t)=>{l(r=>({...r,[String(e)]:t}))},[]),m=(0,n.useMemo)(()=>e.flatMap((e,t)=>{let a=Math.max(1,Number(e.quantity||1)),o=Array.isArray(e.item?.options)&&e.item.options.length>0,n=String(e.item?.id||`item-${t}`),i=e.item.nameKey?r(e.item.nameKey):e.item.name;return o?a<=1?[{...e,quantity:1,__pmdOptionKey:`${n}-${t}-0`,__pmdUnitLabel:"",__pmdSourceQuantity:a}]:Array.from({length:a},(r,o)=>({...e,quantity:1,__pmdOptionKey:`${n}-${t}-${o}`,__pmdUnitLabel:`${i} \xb7 Item ${o+1}`,__pmdSourceQuantity:a})):[{...e,__pmdOptionKey:n,__pmdUnitLabel:"",__pmdSourceQuantity:a}]}),[e,r]),p=(0,n.useMemo)(()=>e.flatMap((e,t)=>Array.from({length:e.quantity}).map((r,a)=>({cartIndex:t,item:e.item,price:e.item.price||0,key:`${e.item.id}-${t}-${a}`,quantity:1,orderMenuId:Number(e.item.__order_menu_id||0)||void 0,menuId:Number(e.item.__menu_id||e.item.id||0)||void 0}))),[e]),u=(0,n.useMemo)(()=>a?Object.values(o):m.map(e=>({item:e.item,price:c(e.item.price||0),quantity:Number(e.quantity||1),optionKey:String(e.__pmdOptionKey||e.item.id)})),[a,o,m,c]),h=(0,n.useMemo)(()=>u.reduce((t,r)=>{let a=Number(r.price||0)*Number(r.quantity||1),o=s[String(r.optionKey||r.item.id)]||{};if(Object.keys(o).length>0){let t=e.find(e=>e.item.id===r.item.id);t&&t.item.options&&Object.values(o).forEach(e=>{t.item.options.forEach(t=>{let o=t.values.find(t=>t.id.toString()===e);o&&(a+=c(o.price)*Number(r.quantity||1))})})}return t+a},0),[u,s,e,c]),f=(0,n.useMemo)(()=>t.enabled&&0!==Number(t.percentage||0)&&0!==t.menuPrice?h*(Number(t.percentage||0)/100):0,[h,t.enabled,t.percentage,t.menuPrice]);return(0,n.useEffect)(()=>{i&&(Array.isArray(e)&&0!==e.length?i({items:m.map(e=>{let t=s[String(e.__pmdOptionKey||e.item.id)]||{},a=[];Object.entries(t).forEach(([t,r])=>{let o=(e.item.options||[]).find(e=>String(e.name)===String(t)),n=o?.values?.find(e=>String(e.id)===String(r));n&&a.push({name:String(n.value||n.name||""),price:Number(c(Number(n.price||0)))})});let o=e.item.nameKey?r(e.item.nameKey):e.item.name,n=a.map(e=>e.name).filter(Boolean).join(", "),i=n?`${o} — ${n}`:String(e.__pmdUnitLabel||o),l=Number(c(e.item.price||0))+a.reduce((e,t)=>e+Number(t.price||0),0),d=Number(e.quantity||1);return{...e,quantity:d,__pmdDisplayName:i,__pmdDisplayUnitPrice:l,__pmdDisplaySubtotal:l*d}}),subtotal:h,tax:f,total:h+f}):i(null))},[e,m,s,h,f,i,r,t.enabled,t.percentage,t.menuPrice,c]),{selectedOptions:s,handleOptionsChange:d,adjustPriceForVAT:c,personalReviewItems:m,allItemInstances:p,itemsToPay:u,subtotal:h,taxAmount:f}}({allItems:r,taxSettings:P,t:S,isSplitting:q,selectedItems:G,onCartPricingUpdate:u}),[ev,ex]=(0,n.useState)(null),{loadingPayments:ez,visiblePaymentMethods:eC,stripeConfig:ew,stripeConfigError:eS,stripePromise:e_,paypalConfigLoading:eE,effectivePayPalClientId:eN,effectivePayPalCurrency:eI}=function({selectedPaymentMethod:e,setSelectedPaymentMethod:t,merchantCurrency:r}){let[a,o]=(0,n.useState)(null),[s,l]=(0,n.useState)(!1),[c,d]=(0,n.useState)([]),[m,p]=(0,n.useState)(!0),[u,h]=(0,n.useState)(null),[f,y]=(0,n.useState)(null),g=(0,n.useMemo)(()=>(c||[]).filter(e=>es.has(el(e.code)||"")),[c]),b=(0,n.useMemo)(()=>new Map((g||[]).map(e=>[el(e.code)||e.code,e])),[g]),k=(0,n.useMemo)(()=>u?.publishableKey?sa(u.publishableKey):null,[u?.publishableKey]),v=a?.enabled&&a?.clientId?a.clientId:"",x=String(a?.currency||r||"EUR").toUpperCase();return(0,n.useEffect)(()=>{e&&(ec(g,e)||t(null))},[e,g,t]),(0,n.useEffect)(()=>{var t;if(!((t=e?b.get(e):null)&&("apple_pay"===t.code||"google_pay"===t.code||"card"===t.code&&"stripe"===t.provider_code)))return;let r=!1;return fetch("/api/v1/payments/stripe/config").then(e=>e.json()).then(e=>{r||(e?.success&&e.publishableKey?(h({publishableKey:e.publishableKey,mode:e.mode||"test",currency:e.currency||"EUR",countryCode:e.countryCode||"DE",methods:{card:!!e?.methods?.card,apple_pay:!!e?.methods?.apple_pay,google_pay:!!e?.methods?.google_pay}}),y(null)):(h(null),y(e?.error||"Stripe is not configured")))}).catch(()=>{r||y("Failed to load Stripe configuration")}),()=>{r=!0}},[e,b]),(0,n.useEffect)(()=>{new i.ApiClient().getPaymentMethods().then(d).finally(()=>p(!1))},[]),(0,n.useEffect)(()=>{let e=!1;return l(!0),fetch("/api/v1/payments/config-public").then(e=>e.json()).then(t=>{e||o({enabled:!!t?.paypalEnabled,clientId:t?.paypalClientId||"",currency:t?.currency||"EUR"})}).catch(()=>{e||o({enabled:!1,clientId:"",currency:"EUR"})}).finally(()=>{e||l(!1)}),()=>{e=!0}},[]),{paymentMethods:c,loadingPayments:m,visiblePaymentMethods:g,methodByCode:b,stripeConfig:u,stripeConfigError:f,stripePromise:k,paypalPublicConfig:a,paypalConfigLoading:s,effectivePayPalClientId:v,effectivePayPalCurrency:x}}({selectedPaymentMethod:ev,setSelectedPaymentMethod:ex,merchantCurrency:R?.currency}),{cashCollectionConfirmed:eT,setCashCollectionConfirmed:eA,providerInlineError:ej,setProviderInlineError:eP,isDarkTheme:eB,setIsDarkTheme:eR,paymentFormData:eO,setPaymentFormData:eL,checkoutStep:eU,setCheckoutStep:eM,submittedSnapshot:eK,setSubmittedSnapshot:eq,pmdLatestSubmittedPaymentOrderIdRef:eH}=function({existingOrderId:e,initialCheckoutStep:t,initialSubmittedOrder:r}){let[a,o]=(0,n.useState)(!1),[i,s]=(0,n.useState)(null),[l,c]=(0,n.useState)(!1),[d,m]=(0,n.useState)({email:"",phone:""}),p="number"==typeof e?e:"string"==typeof e&&e.trim().length>0&&Number.isFinite(Number(e))?Number(e):null,[u,h]=(0,n.useState)(t||(p?"submitted":"review")),[f,y]=(0,n.useState)(r||null);return{cashCollectionConfirmed:a,setCashCollectionConfirmed:o,providerInlineError:i,setProviderInlineError:s,isDarkTheme:l,setIsDarkTheme:c,paymentFormData:d,setPaymentFormData:m,checkoutStep:u,setCheckoutStep:h,submittedSnapshot:f,setSubmittedSnapshot:y,pmdLatestSubmittedPaymentOrderIdRef:(0,n.useRef)(null)}}({existingOrderId:s,initialCheckoutStep:d,initialSubmittedOrder:c}),eG="organic_botanical_paper"===h,e$="kazen_japanese"===h;(0,n.useEffect)(()=>{if(!e||!c||!["submitted","split","split-items","split-shares","split-review","payment"].includes(eU))return;let t=String(c?.orderId??c?.order_id??""),r=String(eK?.orderId??eK?.order_id??""),a=Array.isArray(c?.submittedItems)?c.submittedItems:Array.isArray(c?.items)?c.items:[],o=Array.isArray(eK?.submittedItems)?eK.submittedItems:Array.isArray(eK?.items)?eK.items:[],n=a.map(e=>`${e?.order_menu_id||e?.menu_id||e?.id||e?.name}:${e?.quantity||1}:${e?.subtotal??e?.price??0}`).join("|"),i=o.map(e=>`${e?.order_menu_id||e?.menu_id||e?.id||e?.name}:${e?.quantity||1}:${e?.subtotal??e?.price??0}`).join("|"),s=Number(c?.remainingAmount??c?.orderTotal??c?.total??0),l=Number(eK?.remainingAmount??eK?.orderTotal??eK?.total??0);(t!==r||n!==i||Math.abs(s-l)>.004)&&eq(e=>({...e||{},...c,submittedItems:a,updatedAt:c?.updatedAt||new Date().toISOString()}))},[e,c,eU,eK?.orderId,eK?.order_id,eK?.submittedItems,eK?.items,eK?.remainingAmount,eK?.orderTotal,eK?.total,eq]);let{tableDraft:eW,setTableDraft:eY,draftLoading:eQ,refreshTableDraft:eX,submitDraftLoading:eZ,confirmTableDraftItemsAction:eJ,submitTableDraftAction:e0}=function({isOpen:e,tableInfo:t,taxPercentage:r,getGuestSessionId:a,setSubmittedSnapshot:o}){let[s,l]=(0,n.useState)(null),[c,d]=(0,n.useState)(!1),m=(0,n.useMemo)(()=>j(t,new URLSearchParams(window.location.search).get("qr")),[t?.table_id,t?.table_no,t?.qr_code]),p=(0,n.useCallback)(async()=>{if(!m.table_id&&!m.table_no&&!m.qr)return null;d(!0);try{let e=await i.apiClient.getTableOrderDraft(m);if(e?.success&&(l(e),console.info("PMD_TABLE_DRAFT_LOADED",{status:e.status,draft_id:e.draft_id??null,order_id:e.order_id??null}),e.order_id&&e.status&&"draft"!==e.status&&"empty"!==e.status)){let a=L(e,t,r);o(e=>{let t=Number(e?.orderId||e?.order_id||0),r=Number(a.orderId||0);return e&&t===r?{...e,...a}:a}),console.info("PMD_TABLE_ORDER_PAYMENT_READY",{order_id:e.order_id,status:e.status})}return e}finally{d(!1)}},[m,t,r,o]),{isSubmittingDraft:u,confirmTableDraftItems:h,submitTableDraft:f}=function({context:e,getGuestSessionId:t,refreshDraft:r}){let[a,o]=(0,n.useState)(!1),[s,l]=(0,n.useState)(!1),[c,d]=(0,n.useState)(null),m=(0,n.useRef)(null),p=(0,n.useRef)(null),u=(0,n.useCallback)(async(a,n={})=>{if(m.current)return m.current;let s=(async()=>{o(!0),d(null);try{let o=await i.apiClient.confirmTableDraftItems({...e||{},guest_session_id:t(),items:a});return n.refreshAfterConfirm&&await r?.(),o}catch(e){throw d(so(e,"Failed to confirm table items")),e}finally{m.current=null,o(!1)}})();return m.current=s,s},[e,t,r]);return{isConfirmingDraftItems:a,isSubmittingDraft:s,tableOrderActionError:c,confirmTableDraftItems:u,submitTableDraft:(0,n.useCallback)(async(a={})=>{if(p.current)return p.current;let o=(async()=>{l(!0),d(null);try{return await i.apiClient.submitTableDraft({...e||{},draft_id:a.draftId??null,guest_session_id:t()})}catch(e){throw d(so(e,"Failed to submit table order")),a.refreshOnError&&await r?.(),e}finally{p.current=null,l(!1)}})();return p.current=o,o},[e,t,r])}}({context:m,getGuestSessionId:a,refreshDraft:p});return(0,n.useEffect)(()=>{if(!e)return;p();let t=window.setInterval(()=>{p()},12e3),r=()=>{p()};return window.addEventListener("focus",r),()=>{window.clearInterval(t),window.removeEventListener("focus",r)}},[e,p]),{tableDraft:s,setTableDraft:l,draftLoading:c,refreshTableDraft:p,submitDraftLoading:u,confirmTableDraftItemsAction:h,submitTableDraftAction:f}}({isOpen:e,tableInfo:a,taxPercentage:P?.percentage||0,getGuestSessionId:()=>iW(),setSubmittedSnapshot:eq}),e1=r.length>0,e2=()=>iG(),e5=()=>i$(a),e3=()=>iW(),e4=()=>{let e,t,r;return e=iG(),t=i$(a),r=iW(),{sessionKey:`pmd_open_order:${e}:${t}:${r}`,legacyKey:`pmd_open_order:${e}:${t}`,guestSessionId:r,tenant:e,tableKey:t}},{tipPercentage:e8,setTipPercentage:e6,customTip:e9,setCustomTip:e7,splitPaymentTips:te,setSplitPaymentTips:tt,couponCode:tr,setCouponCode:ta,couponLoading:to,setCouponLoading:tn,couponError:ti,setCouponError:ts,submittedBaseTotal:tl,tipAmount:tc,couponDiscount:td,finalTotal:tm,orderStatusTotal:tp,vatLabels:tu}=function({submittedSnapshot:e,pendingSummary:t,checkoutStep:r,subtotal:a,taxAmount:o,appliedCoupon:i,taxSettings:s}){let[l,c]=(0,n.useState)(0),[d,m]=(0,n.useState)(""),[p,u]=(0,n.useState)({}),[h,f]=(0,n.useState)(""),[y,g]=(0,n.useState)(!1),[b,k]=(0,n.useState)(null),v=(0,n.useMemo)(()=>Number(e?.remainingAmount??e?.total??e?.orderTotal??t?.remainingAmount??0),[e?.remainingAmount,e?.total,e?.orderTotal,t?.remainingAmount]),x=v>0&&"review"!==r,z=x?v:a,C=ss(z,l,d),w=x?v:a,S=(0,n.useMemo)(()=>(function(e,t){if(!e)return 0;let r=Math.max(0,Number(t||0));if(r<=0)return 0;let a=Number(e.min_total??e.minimum_total??e.minimumOrderTotal??0);if(Number.isFinite(a)&&a>0&&r<a)return 0;let o=(...e)=>{for(let t of e){let e=Number(t);if(Number.isFinite(e)&&e>0)return e}return 0},n=String(e.type||"").trim().toLowerCase(),i=o(e.discountAmount,e.discount_amount,e.coupon_discount);if(i>0)return Math.min(i,r);let s=o(e.amount,"f"===n||n.includes("fixed")||n.includes("amount")||n.includes("flat")?e.discount:null,"f"===n||n.includes("fixed")||n.includes("amount")||n.includes("flat")?e.value:null);if(s>0)return Math.min(s,r);let l=o(e.discount_value,e.percent,e.percentage,e.discount_percent,e.discountPercentage,"p"===n||n.includes("percent")?e.discount:null,"p"===n||n.includes("percent")?e.value:null);if(l>0)return Math.min(r,l/100*r);let c=o(e.discount,e.value);return c?c<=100?Math.min(r,c/100*r):Math.min(c,r):0})(i,w),[i,w]),_=Math.max(0,Number(a||0)+Number(o||0)+Number(C||0)-Number(S||0)),E=Math.max(0,v>0?v:Number(a||0)+Number(o||0));return{tipPercentage:l,setTipPercentage:c,customTip:d,setCustomTip:m,splitPaymentTips:p,setSplitPaymentTips:u,couponCode:h,setCouponCode:f,couponLoading:y,setCouponLoading:g,couponError:b,setCouponError:k,submittedBaseTotal:v,isOrderStatusFlow:x,tipBaseAmount:z,tipAmount:C,couponBaseAmount:w,couponDiscount:S,finalTotal:_,orderStatusTotal:E,vatLabels:(0,n.useMemo)(()=>{if(!s.enabled||s.percentage<=0)return{summary:"Order Summary",subtotal:"Subtotal",total:"Total",includedNote:""};if(0===s.menuPrice){let e=Number.isInteger(s.percentage)?String(s.percentage):String(Number(s.percentage.toFixed(2)));return{summary:"Order Summary",subtotal:`Subtotal (incl. ${e}% VAT)`,total:"Total",includedNote:`prices incl. ${e}% VAT`}}return{summary:"Order Summary",subtotal:"Subtotal",total:"Total",includedNote:""}},[s.enabled,s.percentage,s.menuPrice])}}({submittedSnapshot:eK,pendingSummary:l,checkoutStep:eU,subtotal:eb,taxAmount:ek,appliedCoupon:O,taxSettings:P}),{splitGuestProfiles:th,splitGuestNames:tf,getSplitGuestAvatar:ty,suggestedSplitGuestCount:tg,addSplitGuest:tb,removeSplitGuest:tk,splitSourceItems:tv,splitGrandTotal:tx,equalSplitPeople:tz,activeSplitPeople:tC,selectedSplitPerson:tw,unassignedSplitItems:tS,sharePercentTotal:t_,canConfirmSplitMethod:tE,startSplitFlow:tN,chooseSplitMethod:tI,goToSplitReview:tT}=function({isSplitting:e,setIsSplitting:t,splitMethod:r,setSplitMethod:a,splitGuestCount:o,setSplitGuestCount:i,itemAssignments:s,setItemAssignments:l,sharePercents:c,setSharePercents:d,selectedSplitPersonId:m,setSelectedSplitPersonId:p,paidSplitPeople:u,tableDraft:h,submittedSnapshot:f,allItemInstances:y,t:g,adjustPriceForVAT:b,taxSettings:k,submittedBaseTotal:v,orderStatusTotal:x,finalTotal:z,couponDiscount:C,setSelectedPaymentMethod:w,setCheckoutStep:S}){var E,N,A,j,P,B;let R,O,L,D=(0,n.useMemo)(()=>Array.from({length:o},(e,t)=>iH[t]||{name:`Guest ${t+1}`,avatar:String(t+1)}),[o]),U=(0,n.useMemo)(()=>D.map(e=>e.name),[D]),M=(0,n.useMemo)(()=>{let e=Array.isArray(h?.groups)?h.groups.filter(e=>Array.isArray(e?.items)&&e.items.length>0).length:0,t=new Set;(Array.isArray(f?.submittedItems)?f.submittedItems:Array.isArray(f?.items)?f.items:Array.isArray(f?.orderItems)?f.orderItems:[]).forEach(e=>{let r=String(e?.guest_session_id||e?.guestSessionId||e?.submitted_by||"").trim();r&&t.add(r)});let r=t.size;return Math.max(2,Math.min(10,e||r||2))},[h?.groups,f?.submittedItems,f?.items,f?.orderItems]);(0,n.useEffect)(()=>{d(e=>{var t;let r;return t=_(o),(r=Array.from({length:o},(t,r)=>e[r]??0)).every(e=>0===e)?t:r}),l(e=>Object.fromEntries(Object.entries(e).map(([e,t])=>[e,"number"==typeof t&&t>=o?null:t??null])))},[o,d,l]);let F=(0,n.useMemo)(()=>{let e=T(Array.isArray(f?.submittedItems)?f.submittedItems:Array.isArray(f?.items)?f.items:Array.isArray(f?.orderItems)?f.orderItems:[]);return e.length>0?e.flatMap((e,t)=>{let r=Math.max(1,Number(e?.quantity||1)),a=I(e);return Array.from({length:r},(r,o)=>({key:`submitted-${e?.order_menu_id||e?.menu_id||e?.id||t}-${o}`,name:String(e?.name||`Item ${t+1}`),amount:Number.isFinite(a)?a:0,orderMenuId:Number(e?.order_menu_id||e?.id||0)||void 0}))}):y.map((e,t)=>({key:e.key,name:e.item.nameKey?g(e.item.nameKey):e.item.name||`Item ${t+1}`,amount:Number(b(e.price||0)),orderMenuId:e.orderMenuId}))},[f?.submittedItems,f?.items,f?.orderItems,y,g,b,k.enabled,k.percentage,k.menuPrice]),V=(0,n.useMemo)(()=>F.reduce((e,t)=>e+Number(t.amount||0),0),[F]),K=(0,n.useMemo)(()=>{let e=Number(f?.remainingAmount??f?.orderTotal??f?.total??0);return v>0&&Number(x)>0?Number(x):Number(z)>0?Number(z):e>0?e:V},[v,x,z,V,f?.remainingAmount,f?.orderTotal,f?.total]),q=Math.max(0,K-V),H=(0,n.useMemo)(()=>(function(e){let{splitGrandTotal:t,splitGuestCount:r,splitGuestNames:a,splitGuestProfiles:o,splitSubtotal:n,splitExtraAmount:i,paidSplitPeople:s,selectedSplitPersonId:l}=e,c=Math.round(100*t),d=Math.floor(c/r),m=c-d*r;return Array.from({length:r},(e,c)=>{let p=(d+(0===c?m:0))/100,u=t>0?p/t:1/r,h=`guest-${c}`;return{id:h,name:sn(a[c],c),avatar:si(o,c),subtotal:n*u,tax:i*u,tip:0,discount:0,total:p,items:[{name:"Equal share",amount:p}],status:s[h]?"Paid":l===h?"Ready to pay":"Pending"}})})({splitGrandTotal:K,splitGuestCount:o,splitGuestNames:U,splitGuestProfiles:D,splitSubtotal:V,splitExtraAmount:q,paidSplitPeople:u,selectedSplitPersonId:m}),[K,o,U,D,V,q,u,m]),G=(0,n.useMemo)(()=>(function(e){let{splitGuestCount:t,splitSourceItems:r,itemAssignments:a,splitSubtotal:o,splitExtraAmount:n,couponDiscount:i,splitGuestNames:s,splitGuestProfiles:l,paidSplitPeople:c,selectedSplitPersonId:d}=e;return Array.from({length:t},(e,m)=>{let p=r.filter(e=>a[e.key]===m).map(e=>({name:e.name,amount:e.amount,quantity:1}));return function(e){let{index:t,personSubtotal:r,items:a,splitSubtotal:o,splitExtraAmount:n,splitGuestCount:i,couponDiscount:s,splitGuestNames:l,splitGuestProfiles:c,paidSplitPeople:d,selectedSplitPersonId:m,percent:p}=e,u=o>0?r/o:i>0?1/i:0,h=n*u,f=s>0?s*u:0,y=Math.max(0,r+h-f),g=`guest-${t}`;return{id:g,name:sn(l[t],t),avatar:si(c,t),subtotal:r,tax:h,tip:0,discount:f,total:y,items:a,status:d[g]?"Paid":m===g?"Ready to pay":"Pending",percent:p}}({index:m,personSubtotal:p.reduce((e,t)=>e+t.amount,0),items:p,splitSubtotal:o,splitExtraAmount:n,splitGuestCount:t,couponDiscount:i,splitGuestNames:s,splitGuestProfiles:l,paidSplitPeople:c,selectedSplitPersonId:d})})})({splitGuestCount:o,splitSourceItems:F,itemAssignments:s,splitSubtotal:V,splitExtraAmount:q,couponDiscount:C,splitGuestNames:U,splitGuestProfiles:D,paidSplitPeople:u,selectedSplitPersonId:m}),[o,F,s,V,q,C,U,D,u,m]),$=(0,n.useMemo)(()=>(function(e){let{splitGuestCount:t,sharePercents:r,splitGrandTotal:a,splitSubtotal:o,splitExtraAmount:n,splitGuestNames:i,splitGuestProfiles:s,paidSplitPeople:l,selectedSplitPersonId:c}=e;return Array.from({length:t},(e,t)=>{let d=Number(r[t]||0),m=d/100*a,p=a>0?m/a:0,u=`guest-${t}`;return{id:u,name:sn(i[t],t),avatar:si(s,t),subtotal:o*p,tax:n*p,tip:0,discount:0,total:m,items:[{name:`${d}% share`,amount:m}],status:l[u]?"Paid":c===u?"Ready to pay":"Pending",percent:d}})})({splitGuestCount:o,sharePercents:c,splitGrandTotal:K,splitSubtotal:V,splitExtraAmount:q,splitGuestNames:U,splitGuestProfiles:D,paidSplitPeople:u,selectedSplitPersonId:m}),[o,c,K,V,q,U,D,u,m]),W="items"===(E={splitMethod:r,equalSplitPeople:H,itemSplitPeople:G,shareSplitPeople:$}).splitMethod?E.itemSplitPeople:"shares"===E.splitMethod?E.shareSplitPeople:E.equalSplitPeople,Y=m&&W.find(e=>e.id===m)||null,{unassignedSplitItems:Q,sharePercentTotal:X,canConfirmSplitMethod:Z}=(A=(N={splitMethod:r,splitSourceItems:F,itemAssignments:s,sharePercents:c,splitGuestCount:o}).splitSourceItems,j=N.itemAssignments,R=A.filter(e=>void 0===j[e.key]||null===j[e.key]).length,P=N.sharePercents,B=N.splitGuestCount,O=P.slice(0,B).reduce((e,t)=>e+Number(t||0),0),L="items"===N.splitMethod?0===R:"shares"!==N.splitMethod||100===O,{unassignedSplitItems:R,sharePercentTotal:O,canConfirmSplitMethod:L}),J=(o=r)=>{e||m||(i(M),d(_(M))),t(!0),a(o),w(null),p(null),S("items"===o?"split-items":"shares"===o?"split-shares":"split")};return{splitGuestProfiles:D,splitGuestNames:U,getSplitGuestAvatar:e=>si(D,e),suggestedSplitGuestCount:M,addSplitGuest:()=>{let e=Math.min(10,o+1);i(e),d(_(e))},removeSplitGuest:()=>{let e=Math.max(2,o-1);i(e),d(_(e))},splitSourceItems:F,splitSubtotal:V,splitGrandTotal:K,splitExtraAmount:q,equalSplitPeople:H,itemSplitPeople:G,shareSplitPeople:$,activeSplitPeople:W,selectedSplitPerson:Y,unassignedSplitItems:Q,sharePercentTotal:X,canConfirmSplitMethod:Z,startSplitFlow:J,chooseSplitMethod:e=>{a(e),J(e)},goToSplitReview:()=>{Z&&(t(!0),p(e=>e||W[0]?.id||null),S("split-review"))}}}({isSplitting:q,setIsSplitting:H,splitMethod:$,setSplitMethod:W,splitGuestCount:Y,setSplitGuestCount:Q,itemAssignments:X,setItemAssignments:Z,sharePercents:J,setSharePercents:ee,selectedSplitPersonId:et,setSelectedSplitPersonId:ei,paidSplitPeople:ed,tableDraft:eW,submittedSnapshot:eK,allItemInstances:ey,t:S,adjustPriceForVAT:eh,taxSettings:P,submittedBaseTotal:tl,orderStatusTotal:tp,finalTotal:tm,couponDiscount:td,setSelectedPaymentMethod:ex,setCheckoutStep:eM}),{paymentTipPercentage:tA,paymentCustomTip:tj,paymentBaseAmount:tB,paymentTipAmount:tR,paymentCouponDiscount:tO,paymentPayableTotal:tL,paymentSubtotalAmount:tD,paymentVatAmount:tU,paymentVatPercentage:tM,paidTipAmount:tF,paidCouponDiscount:tV,paidAmountTotal:tK,updatePaymentTipPercentage:tq,updatePaymentCustomTip:tH,payableTotal:tG,estimatedMinutes:t$}=function({selectedSplitPersonId:e,selectedSplitPerson:t,splitPaymentTips:r,setSplitPaymentTips:a,tipPercentage:o,setTipPercentage:i,customTip:s,setCustomTip:l,submittedBaseTotal:c,finalTotal:d,couponDiscount:m,submittedSnapshot:p,taxSettings:u,checkoutStep:h,tipAmount:f,orderStatusTotal:y,itemsToPay:g}){var b;let k,v,x,z,C,w=e&&r[e]||{percentage:0,custom:""},S=t?w.percentage:o,_=t?w.custom:s,{paymentBaseAmount:I,paymentTipAmount:T,paymentCouponDiscount:A,paymentPayableTotal:j,paymentSubtotalAmount:P,paymentVatAmount:B,paymentVatPercentage:R}=(b={selectedSplitPerson:t,submittedBaseTotal:c,finalTotal:d,paymentCustomTip:_,paymentTipPercentage:S,couponDiscount:m,submittedSnapshot:p,taxPercentage:u?.percentage??0},v=ss(k=b.selectedSplitPerson?.total&&b.selectedSplitPerson.total>0?b.selectedSplitPerson.total:b.submittedBaseTotal>0?b.submittedBaseTotal:b.finalTotal,b.paymentTipPercentage,b.paymentCustomTip),z=Math.max(0,k+v-(x=b.selectedSplitPerson?0:b.couponDiscount)),C=b.selectedSplitPerson?Number(b.selectedSplitPerson.subtotal||0):Number(b.submittedSnapshot?.subtotal||0),{paymentBaseAmount:k,paymentTipAmount:v,paymentCouponDiscount:x,paymentPayableTotal:z,paymentSubtotalAmount:C,paymentVatAmount:b.selectedSplitPerson?Number(b.selectedSplitPerson.tax||0):Number(b.submittedSnapshot?.vatAmount||0),paymentVatPercentage:Number(b.submittedSnapshot?.vatPercentage??b.taxPercentage??0)}),{paidTipAmount:O,paidCouponDiscount:L,paidAmountTotal:D}=function(e){if("paid"!==e.checkoutStep)return{paidTipAmount:e.paymentTipAmount,paidCouponDiscount:e.paymentCouponDiscount,paidAmountTotal:e.paymentPayableTotal};let t=Number(e.submittedSnapshot?.paidTipAmount??e.paymentTipAmount??e.tipAmount??0),r=Number(e.submittedSnapshot?.paidCouponDiscount??e.paymentCouponDiscount??e.couponDiscount??0);return{paidTipAmount:t,paidCouponDiscount:r,paidAmountTotal:Number(e.submittedSnapshot?.paidTotal??Math.max(0,e.orderStatusTotal+t-r))}}({checkoutStep:h,submittedSnapshot:p,paymentTipAmount:T,tipAmount:f,paymentCouponDiscount:A,couponDiscount:m,orderStatusTotal:y,paymentPayableTotal:j}),U=(0,n.useMemo)(()=>{var e;let t,r;return t=E((e={checkoutStep:h,paymentPayableTotal:j,orderStatusTotal:y,finalTotal:d}).finalTotal),r=E(e.orderStatusTotal),"payment"===e.checkoutStep?e.paymentPayableTotal:r??t??0},[h,j,y,d]);return{paymentTipPercentage:S,paymentCustomTip:_,paymentBaseAmount:I,paymentTipAmount:T,paymentCouponDiscount:A,paymentPayableTotal:j,paymentSubtotalAmount:P,paymentVatAmount:B,paymentVatPercentage:R,paidTipAmount:O,paidCouponDiscount:L,paidAmountTotal:D,updatePaymentTipPercentage:t=>{e?a(r=>({...r,[e]:{percentage:t,custom:""}})):(i(t),l(""))},updatePaymentCustomTip:t=>{e?a(r=>({...r,[e]:{percentage:0,custom:t}})):(l(t),i(0))},payableTotal:U,estimatedMinutes:(0,n.useMemo)(()=>{let e,t,r=Number(p?.etaMinutes||p?.estimated_prep_minutes||0);return r>0?r:(t=(e=(p?.submittedItems||g||[]).filter(e=>!N(e)).map(e=>({quantity:Math.max(1,Number(e?.quantity||1)),prep:Math.max(0,Number(e?.prep_time_minutes??e?.item?.prep_time_minutes??15)||15)}))).reduce((e,t)=>e+t.quantity,0),Math.max(10,Math.min(90,Math.round(e.reduce((e,t)=>Math.max(e,t.prep),15)+Math.min(15,Math.max(0,(t-1)*2))))))},[p?.submittedItems,p?.etaMinutes,p?.estimated_prep_minutes,g])}}({selectedSplitPersonId:et,selectedSplitPerson:tw,splitPaymentTips:te,setSplitPaymentTips:tt,tipPercentage:e8,setTipPercentage:e6,customTip:e9,setCustomTip:e7,submittedBaseTotal:tl,finalTotal:tm,couponDiscount:td,submittedSnapshot:eK,taxSettings:P,checkoutStep:eU,tipAmount:tc,orderStatusTotal:tp,itemsToPay:eg}),tW=()=>{U(),ta(""),ts(null),e6(0),e7("")};O&&O.code&&O.code,y=eK&&eK.orderId&&eK.orderId;let{modalPrimaryBtn:tY,modalPrimaryBtnStyle:tQ,modalSecondaryBtn:tX,iconBackBtn:tZ}=function({isKazenJapaneseCheckoutVisual:e,isOrganicCheckoutVisual:t}){return{modalPrimaryBtn:e?"min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden":"min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed",modalPrimaryBtnStyle:e?{background:"#17120e",color:"#f8f0df",WebkitTextFillColor:"#f8f0df",textShadow:"none",border:"1px solid rgba(125, 92, 48, .68)",borderRadius:0,boxShadow:"none"}:t?eD:{background:"#062F2A",color:"#FFFFFF",textShadow:"none",border:"1px solid #062F2A"},modalSecondaryBtn:e?"min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition border border-[rgba(125,92,48,.68)] text-[#17120e] bg-[#fbf7ee] inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden":"min-h-10 w-full rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--theme-surface)] active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent inline-flex items-center justify-center gap-2",iconBackBtn:"h-9 w-9 rounded-full border border-[#062F2A] bg-[#062F2A] text-white hover:bg-[#021F1C] hover:text-white pmd-v2-action-circle hover:opacity-90"}}({isKazenJapaneseCheckoutVisual:e$,isOrganicCheckoutVisual:eG}),{handleConfirmMyItems:tJ,handleSubmitTableDraft:t0,markOpenOrderAsPaid:t1}=function({tableDraft:e,setTableDraft:t,tableInfo:r,taxSettings:a,selectedOptions:o,personalReviewItems:n,adjustPriceForVAT:i,toast:s,setIsLoading:l,confirmTableDraftItemsAction:c,submitTableDraftAction:d,refreshTableDraft:m,clearCart:p,setSubmittedSnapshot:u,pmdLatestSubmittedPaymentOrderIdRef:h,buildOpenOrderStorageKeys:f,getTenantKey:y,getTableKey:g,ensureGuestSession:b,setCheckoutStep:k,onOpenOrderUpdate:v}){let x=()=>n.map(e=>{let t=Number(e.item?.id||e.item?.menu_id||0),r=String(e.item?.name||e.item?.title||"Item"),a=Number(e.quantity||1),n=o[String(e.__pmdOptionKey||e.item?.id)]||{},s=Array.isArray(e.item?.options)?e.item.options:[],l=Object.entries(n).map(([e,t])=>{let r=s.find(t=>String(t?.name||"")===String(e)||String(t?.id||"")===String(e)),a=(Array.isArray(r?.values)?r.values:[]).find(e=>String(e?.id)===String(t));return r&&a?{group:String(r?.name||e),option_id:String(r?.id||""),option_value_id:String(a?.id||t),value:String(a?.value||a?.name||t),price:Number(i(Number(a?.price||0)))}:null}).filter(Boolean),c=l.map(e=>e.value).filter(Boolean).join(", "),d=Number(i(e.item.price||0)),m=l.reduce((e,t)=>e+Number(t.price||0),0),p=Number((d+m).toFixed(4)),u=Number((p*a).toFixed(4));return{menu_id:t,name:c?`${r} — ${c}`:r,base_name:r,quantity:a,price:p,base_price:Number(d.toFixed(4)),option_total:Number((m*a).toFixed(4)),subtotal:u,options:Object.fromEntries(l.map(e=>[e.group,e.option_value_id])),option_details:l,option_summary:c}}).filter(e=>e.menu_id>0&&e.quantity>0),z=async()=>{let e=x();if(0===e.length)return void s({title:"No items selected",description:"Add items to your personal cart before confirming.",variant:"destructive"});l(!0);try{let r=await c(e);t(r),u(null),p(),console.info("PMD_TABLE_DRAFT_CONFIRMED_ITEMS",{draft_id:r.draft_id??null,count:e.length}),s({title:"Items confirmed",description:"Your items were added to the table order. Submit the table order when everyone is ready."}),await m(),v?.(r)}catch(e){s({title:"Could not confirm items",description:e instanceof Error?e.message:"Please try again.",variant:"destructive"})}finally{l(!1)}};return{buildPersonalDraftItems:x,handleConfirmMyItems:z,handleSubmitTableDraft:async()=>{if(e?.draft_id||e?.status==="draft")try{let o=await d({draftId:e?.draft_id??null,refreshOnError:!0}),n=Number(o?.order_id||o?.orderId||0);if(Number.isFinite(n)&&n>0){h.current=n;try{sessionStorage.setItem("pmd:latest-submitted-payment-order-id",String(n)),localStorage.setItem("pmd:latest-submitted-payment-order-id",String(n))}catch{}}t(o),p();let i=L(o,r,a?.percentage||0);try{let{sessionKey:e,legacyKey:t}=f();localStorage.removeItem(t),localStorage.setItem(e,JSON.stringify({...i,tenant:y(),tableKey:g(),guestSessionId:b()}))}catch{}console.info("PMD_SUBMITTED_ORDER_SNAPSHOT_NORMALIZED",{order_id:i.orderId,total:i.total,remainingAmount:i.remainingAmount,itemCount:Array.isArray(i.submittedItems)?i.submittedItems.length:0}),u(i),k(eV()),console.info("PMD_TABLE_DRAFT_SUBMITTED",{draft_id:e?.draft_id??null,order_id:o.order_id??null}),s({title:"Table order submitted",description:"The table order was sent to the kitchen. Payment is now available."}),v?.(i)}catch(e){s({title:"Could not submit table order",description:e instanceof Error?e.message:"Please refresh and try again.",variant:"destructive"})}},markOpenOrderAsPaid:(e,t)=>{try{let r=f().sessionKey,a=localStorage.getItem(r);if(!a)return;let o=JSON.parse(a);if(e&&o?.orderId&&String(o.orderId)!==String(e))return;o.paymentStatus="paid",o.status="paid",o.paidAt=Date.now(),t&&(o.paidTipAmount=Number(t.tipAmount||0),o.paidCouponDiscount=Number(t.couponDiscount||0),o.paidTotal=Number(t.paidTotal||0),o.paidCouponCode=t.couponCode||null),u(e=>e?{...e,paymentStatus:"paid",status:"paid",paidAt:o.paidAt,paidTipAmount:o.paidTipAmount,paidCouponDiscount:o.paidCouponDiscount,paidTotal:o.paidTotal,paidCouponCode:o.paidCouponCode}:o),localStorage.setItem(r,JSON.stringify(o)),v?.(o)}catch{}}}}({tableDraft:eW,setTableDraft:eY,tableInfo:a,taxSettings:P,selectedOptions:ep,personalReviewItems:ef,adjustPriceForVAT:eh,toast:C,setIsLoading:K,confirmTableDraftItemsAction:eJ,submitTableDraftAction:e0,refreshTableDraft:eX,clearCart:M,setSubmittedSnapshot:eq,pmdLatestSubmittedPaymentOrderIdRef:eH,buildOpenOrderStorageKeys:e4,getTenantKey:e2,getTableKey:e5,ensureGuestSession:e3,setCheckoutStep:eM,onOpenOrderUpdate:p}),t2=()=>(function({tableDraft:e,submittedSnapshot:t,existingOrderId:r,latestRefOrderId:a}){let o=Number(e?.draft_id||0),n=Number.isFinite(o)&&o>0?o:null,i=Number(e?.order_id||e?.orderId||0),s=Number.isFinite(i)&&i>0?i:null;if(n&&!s)return null;let l=null;try{let e=sessionStorage.getItem("pmd:latest-submitted-payment-order-id")||localStorage.getItem("pmd:latest-submitted-payment-order-id")||"",t=Number(e||0);l=Number.isFinite(t)&&t>0?t:null}catch{}let c=Number(t?.orderId||t?.order_id||0),d=Number.isFinite(c)&&c>0?c:null,m=s||d||a||null,p=l&&(!m||l===m)?l:null,u=Number(r||0),h=Number.isFinite(u)&&u>0&&m&&u===m?u:null;for(let e of[m,s,d,a,p,h]){let t=Number(e||0);if(Number.isFinite(t)&&!(t<=0)&&(!n||t!==n||s===t))return t}return null})({tableDraft:eW,submittedSnapshot:eK,existingOrderId:s,latestRefOrderId:eH.current}),t5=()=>(function({tableDraft:e,submittedPaymentOrderId:t}){return!!(e?.draft_id&&!t)})({tableDraft:eW,submittedPaymentOrderId:t2()}),t3=()=>{let e;return e=((Array.isArray(eK?.submittedItems)&&eK.submittedItems.length>0?eK.submittedItems:Array.isArray(eW?.items)?eW.items:[])||[]).filter(e=>!N(e)).reduce((e,t)=>{let r=Number(t?.quantity||t?.qty||1),a=iY(t?.total)??iY(t?.line_total)??iY(t?.subtotal)??null;return null!==a?e+a:e+(iY(t?.price)??iY(t?.unit_price)??iY(t?.menu_price)??iY(t?.item?.price)??0)*(Number.isFinite(r)&&r>0?r:1)},0),iY(e)},t4=()=>(function({selectedSplitPersonId:e,selectedSplitPerson:t,paymentPayableTotal:r,submittedSnapshot:a,tableDraft:o,initialSubmittedOrder:n,pendingSummary:i,payableTotal:s,finalTotal:l,submittedItemsSubtotal:c}){let d=a||{},m=(o||{})?.totals||{},p=n||{},u=p?.totals||{};if(e&&t)return iY(t.total)??iY(r)??0;for(let e of[d.remainingAmount,d.orderTotal,d.total,m.remainingAmount,m.orderTotal,m.total,c,p.remainingAmount,p.orderTotal,p.total,u.remainingAmount,u.orderTotal,u.total,i?.remainingAmount,i?.orderTotal,i?.total,r,s,l]){let t=iY(e);if(null!==t)return t}return 0})({selectedSplitPersonId:et,selectedSplitPerson:tw,paymentPayableTotal:tL,submittedSnapshot:eK,tableDraft:eW,initialSubmittedOrder:c,pendingSummary:l,payableTotal:tG,finalTotal:tm,submittedItemsSubtotal:t3()}),t8=async(e,t)=>iX({stripePaymentIntentId:e,forcedPaymentContext:t,selectedPaymentMethod:ev,visiblePaymentMethods:eC,toast:C,setIsLoading:K,tableInfo:a,itemsToPay:eg,paymentFormData:eO,tableDraft:eW,selectedOptions:ep,checkoutStep:eU,payableTotal:tG,finalTotal:tm,paymentTipAmount:tR,tipAmount:tc,selectedSplitPersonId:et,appliedCoupon:O,paymentCouponDiscount:tO,couponDiscount:td,ensureGuestSession:e3,hasUnsubmittedPaymentDraft:t5,initialSubmittedOrder:c,resolveSubmittedPaymentOrderId:t2,resolveSubmittedPaymentAmount:t4,pmdLatestSubmittedPaymentOrderIdRef:eH,submittedSnapshot:eK,existingOrderId:s,pendingSummary:l,resetPaymentAdjustmentsAfterSuccess:tW,setCheckoutStep:eM,t:S,selectedSplitPerson:tw,isSplitting:q,splitMethod:$,splitSourceItems:tv,itemAssignments:X,pmdSubmittedItemsSubtotal:t3,paymentPayableTotal:tL,markOpenOrderAsPaid:t1,setPaidSplitPeople:em,taxSettings:P,subtotal:eb,taxAmount:ek,merchantSettings:R,estimatedMinutes:t$,onOpenOrderUpdate:p,clearCart:M,setSubmittedSnapshot:eq,getTenantKey:e2,getTableKey:e5,buildOpenOrderStorageKeys:e4}),t6=()=>{eP(null),ex(null),eA(!1)},{stripeResolvedTableNumber:t9,stripeResolvedRestaurantId:t7,selectedMethod:re,selectedProviderCode:rt,stripePaymentData:rr}=function({tableInfo:e,merchantSettings:t,stripeConfig:r,visiblePaymentMethods:a,selectedPaymentMethod:o,itemsToPay:n,paymentFormData:i,resolveSubmittedPaymentAmount:s}){let l=new URLSearchParams(window.location.search),c=window.location.pathname.match(/\/table\/(\d+)/)?.[1]??null,d=e?.table_id??l?.get("table")??l?.get("table_id")??l?.get("table_no")??c??null,m=e?.table_no??l?.get("table_no")??l?.get("table")??l?.get("table_id")??e?.table_id??c??null,p=null==m||""===String(m).trim()||Number.isNaN(Number(m))?null:Number(m),u=e?.table_name&&""!==String(e.table_name).trim()?String(e.table_name):p?`Table ${p}`:"Delivery",h=Number(e?.location_id||1),f=String(e?.location_id??e?.merchant_id??t?.accountId??"default"),y=ec(a,o),g=y?.provider_code||null,b={amount:s(),currency:r?.currency||t?.currency||"EUR",items:n.map(e=>({id:String(e.item.id),name:e.item.name,price:e.price,quantity:e.quantity||1,restaurantId:f})),customerInfo:{name:i.cardholderName||"",email:i.email||"",phone:i.phone||""},restaurantId:f,tableNumber:p||0};return{stripeResolvedTableIdRaw:d,stripeResolvedTableNumber:p,stripeResolvedTableName:u,stripeResolvedLocationId:h,stripeResolvedRestaurantId:f,selectedMethod:y,selectedProviderCode:g,stripePaymentData:b}}({tableInfo:a,merchantSettings:R,stripeConfig:ew,visiblePaymentMethods:eC,selectedPaymentMethod:ev,itemsToPay:eg,paymentFormData:eO,resolveSubmittedPaymentAmount:t4}),ra=()=>iQ({selectedMethod:re,resolveSubmittedPaymentAmount:t4,setProviderInlineError:eP,toast:C,checkoutStep:eU,pendingSummary:l,resolveSubmittedPaymentOrderId:t2,hasUnsubmittedPaymentDraft:t5,setSelectedPaymentMethod:ex,setIsLoading:K,ensureGuestSession:e3,tableInfo:a,merchantSettings:R,paymentFormData:eO,itemsToPay:eg});!function({handlePayment:e,setProviderInlineError:t,toast:r}){(0,n.useEffect)(()=>{(async()=>{let a=new URLSearchParams(window.location.search),o=a.get("payment_return_provider");if(!["worldline","sumup","square","wero","vr_payment"].includes(o||""))return;let n="worldline"===o?"pmd_worldline_pending_checkout":"sumup"===o?"pmd_sumup_pending_checkout":"square"===o?"pmd_square_pending_checkout":"vr_payment"===o?"pmd_vr_payment_pending_checkout":"pmd_wero_pending_checkout",i=localStorage.getItem(n);if(!i)return;let s=null;try{s=JSON.parse(i)}catch{return}let l="worldline"===o?{hosted_checkout_id:String(s?.hosted_checkout_id||"")}:"sumup"===o?{checkout_id:String(s?.checkout_id||a.get("checkout_id")||"")}:"square"===o?{payment_link_id:String(s?.payment_link_id||"")}:"vr_payment"===o?{session_id:String(s?.session_id||a.get("session_id")||""),transaction_id:String(a.get("transaction_id")||""),provider_reference:String(a.get("provider_reference")||""),merchant_reference:String(s?.merchant_reference||"")}:{session_id:String(s?.session_id||a.get("session_id")||"")};if(Object.values(l).some(e=>""!==String(e||"").trim()))try{let i=await fetch("worldline"===o?"/api/v1/payments/worldline/checkout-status":"sumup"===o?"/api/v1/payments/sumup/checkout-status":"square"===o?"/api/v1/payments/square/checkout-status":"vr_payment"===o?"/api/v1/payments/vr-payment/return-status":"/api/v1/payments/wero/checkout-status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)}),c=await i.json();if(iF(c),i.ok&&c?.success&&c?.is_paid){localStorage.removeItem(n);let t=String(l?.session_id||l?.transaction_id||l?.provider_reference||""),r=String(c?.payment_intent_id||c?.payment_id||c?.transaction_code||c?.order_id||t),i=s?.method_code?String(s.method_code):"wero"===o?"wero":"card",d=s?.provider_code?String(s.provider_code):String(c?.provider||("wero"===o?"stripe":o));await e(r,{method_code:i,provider_code:d}),a.delete("payment_return_provider");let m=`${window.location.pathname}${a.toString()?`?${a.toString()}`:""}`;window.history.replaceState({},"",m);return}if(i.ok&&c?.success&&c?.status==="pending")return void t("Your payment is still pending confirmation. Please refresh in a moment.");if(i.ok&&c?.success&&(c?.status==="cancelled"||c?.status==="expired")){localStorage.removeItem(n),t("Payment was cancelled. Please choose another method to continue.");return}r({title:"Payment Not Confirmed",description:`${o} payment is not confirmed yet. Please check your payment status and retry.`,variant:"destructive"})}catch{r({title:"Payment Verification Failed",description:`Could not verify ${o} payment status.`,variant:"destructive"})}})()},[])}({handlePayment:t8,setProviderInlineError:eP,toast:C});let{isTableContext:ro,orderContextLabel:rn,orderContextValue:ri,submittedContextLabel:rs,submittedContextValue:rl}=function({tableDraft:e,tableInfo:t,submittedSnapshot:r}){let a=e?.table_name||t?.table_name||(e?.table_no||t?.table_no?`Table ${e?.table_no||t?.table_no}`:"Delivery"),o=!!(t?.table_id||t?.table_no||e?.table_id||e?.table_no),n=o?a:"Delivery",i=r?.tableNumber||o?"Table":"Order type",s=r?.tableNumber?`Table ${r.tableNumber}`:n;return{tableDisplayName:a,isTableContext:o,orderContextLabel:o?"Table":"Order type",orderContextValue:n,submittedContextLabel:i,submittedContextValue:s}}({tableDraft:eW,tableInfo:a,submittedSnapshot:eK}),{reviewRating:rc,setReviewRating:rd,reviewComment:rm,setReviewComment:rp,reviewSubmitStatus:ru,setReviewSubmitStatus:rh,reviewSubmitMessage:rf,invoiceDownloadStatus:ry,invoiceDownloadMessage:rg,activeReviewSharePlatforms:rb,canSubmitReview:rk,handleSubmitReview:rv,handleDownloadBusinessInvoice:rx}=function({merchantSettings:e,submittedSnapshot:t,initialSubmittedOrder:r,existingOrderId:a}){let[o,s]=(0,n.useState)(0),[l,c]=(0,n.useState)(""),[d,m]=(0,n.useState)("idle"),[p,u]=(0,n.useState)(""),[h,f]=(0,n.useState)("idle"),[y,g]=(0,n.useState)(""),b=(0,n.useMemo)(()=>Number(t?.orderId||t?.order_id||r?.orderId||r?.order_id||a||0),[t,r,a]),k=b>0?`pmd-review-submitted:${b}`:"";(0,n.useEffect)(()=>{if(s(0),c(""),m("idle"),u(""),k)try{let e=window.localStorage.getItem(k);if(!e)return;let t=JSON.parse(e);s(Math.max(0,Number(t?.rating||0))),c(String(t?.comment||"")),m("success"),u("Thank you — your review was already sent for this order.")}catch{}},[k]);let v=(0,n.useMemo)(()=>[{id:"trustpilot",label:"Trustpilot",icon:en},{id:"instagram",label:"Instagram",icon:er},{id:"google",label:"Google Reviews",icon:eo},{id:"website",label:"Website",icon:er},{id:"reviews",label:"Reviews page",icon:ea.MessageSquare}].filter(({id:t})=>{let r=e?.reviewSocial?.platforms?.[t];return!!(r?.enabled&&r?.url)}),[e?.reviewSocial]),x="success"!==d&&(o>0||l.trim().length>0),z=async()=>{if(x&&"loading"!==d){m("loading"),u("");try{if(await i.apiClient.submitReview({order_id:b>0?b:null,rating:o,review:l.trim(),public_share_consent:null}),k&&1)try{window.localStorage.setItem(k,JSON.stringify({rating:o,comment:l.trim(),submittedAt:new Date().toISOString()}))}catch{}m("success"),u("Thank you — your review was sent to the restaurant.")}catch(t){let e=t instanceof Error?t.message:"Could not submit your review. Please try again.";if(/already submitted|already sent|one review/i.test(e)){if(k&&1)try{window.localStorage.setItem(k,JSON.stringify({rating:o,comment:l.trim(),submittedAt:new Date().toISOString()}))}catch{}m("success"),u("Thank you — a review has already been submitted for this order.");return}m("error"),u(e)}}},C=async()=>{let e=t?.orderId||t?.order_id||r?.orderId||a||null;if(!e||"loading"===h){f("error"),g("Order number is not available yet.");return}f("loading"),g("");try{let t=await i.apiClient.downloadBusinessInvoice(e),r=URL.createObjectURL(t),a=document.createElement("a");a.href=r,a.download=`business-invoice-${e}.pdf`,document.body.appendChild(a),a.click(),a.remove(),window.setTimeout(()=>URL.revokeObjectURL(r),1e3),f("idle")}catch(e){f("error"),g(e instanceof Error?e.message:"Could not download the business invoice.")}};return{reviewRating:o,setReviewRating:s,reviewComment:l,setReviewComment:c,reviewSubmitStatus:d,setReviewSubmitStatus:m,reviewSubmitMessage:p,invoiceDownloadStatus:h,invoiceDownloadMessage:y,activeReviewSharePlatforms:v,canSubmitReview:x,handleSubmitReview:z,handleDownloadBusinessInvoice:C}}({merchantSettings:R,submittedSnapshot:eK,initialSubmittedOrder:c,existingOrderId:s}),rz=!!(eW?.order_id||eW?.orderId||["submitted","submitted_unpaid","partially_paid","paid"].includes(String(eW?.status||"").toLowerCase())),rC=`${eU}:${e1?"personal":"shared"}:${rz?"status":"draft"}`;!function({isOpen:e,merchantSettings:t,setIsDarkTheme:r,paymentLoadVATSettings:a,initialCheckoutStep:o,existingOrderId:i,hasPersonalItems:s,preferPersonalReview:l,setCheckoutStep:c,initialSubmittedOrder:d,tableDraft:m,setSubmittedSnapshot:p,checkoutStep:u,checkoutListViewKey:h,isSubmittedTableDraftForStatus:f,tableInfo:y,taxSettings:g}){(0,n.useEffect)(()=>{window.__CMS_STORE__={merchantSettings:t}},[t]),(0,n.useEffect)(()=>{let e=()=>{r("modern-dark"===(document.documentElement.getAttribute("data-theme")||"clean-light"))};e();let t=new MutationObserver(t=>{t.forEach(t=>{"attributes"===t.type&&"data-theme"===t.attributeName&&e()})});return t.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme"]}),()=>t.disconnect()},[r]),(0,n.useEffect)(()=>{e&&c(e=>{var t,r;let a;return a=(t={initialCheckoutStep:o,existingOrderId:i,hasPersonalItems:s,preferPersonalReview:l,currentStep:e}).initialCheckoutStep&&!(t.existingOrderId&&"review"===t.initialCheckoutStep)?t.initialCheckoutStep:t.existingOrderId?"submitted":"review",!t.preferPersonalReview&&!t.hasPersonalItems&&("submitted"===(r=t.currentStep)||"payment"===r||"paid"===r||eF(r))&&"review"===a?t.currentStep:a})},[e,i,o,s,l,c]),(0,n.useEffect)(()=>{if(!d||m?.draft_id&&!m?.order_id&&!m?.orderId)return;let e=Number(m?.order_id||m?.orderId||0),t=Number(d?.orderId||d?.order_id||0);e>0&&t>0&&e!==t||p(r=>{let a=Number(r?.orderId||r?.order_id||0);return a>0&&e>0&&a===e&&t!==e?r:d})},[d,m?.draft_id,m?.order_id,m?.orderId,p]),(0,n.useEffect)(()=>{!m?.draft_id||m?.order_id||m?.orderId||p(null)},[m?.draft_id,m?.order_id,m?.orderId,p]),(0,n.useEffect)(()=>{a()},[a]),(0,n.useEffect)(()=>{if(e){var t;(t={hasPersonalItems:s,initialCheckoutStep:o,currentStep:u}).hasPersonalItems&&"review"===t.initialCheckoutStep&&"review"!==t.currentStep&&c("review")}},[e,s,o,u,c]),(0,n.useLayoutEffect)(()=>{let t,r;if(!e||"u"<typeof document)return;let a=()=>{let e=document.querySelector('[data-pmd-checkout-scroll="1"]');return!!e&&(e.setAttribute("data-pmd-step-freeze","1"),t=window.setTimeout(()=>{e.setAttribute("data-pmd-step-freeze","0"),e.removeAttribute("data-pmd-step-freeze")},850),!0)};return a()||(r=window.setTimeout(a,16)),()=>{t&&window.clearTimeout(t),r&&window.clearTimeout(r)}},[e,u]),(0,n.useLayoutEffect)(()=>{if(!e||"u"<typeof document)return;let t=()=>{let e=document.querySelector('[data-pmd-checkout-scroll="1"]');e&&(e.scrollTop=0),document.querySelectorAll(".pmd-checkout-list-scroll").forEach(e=>{e.scrollTop=0})};t();let r=window.requestAnimationFrame(t);return()=>window.cancelAnimationFrame(r)},[e,h]),(0,n.useEffect)(()=>{if(e&&"review"===u&&!s&&!l&&f){if(m){let e=L(m,y,g?.percentage||0);p(t=>{let r=Number(t?.orderId||t?.order_id||0),a=Number(e.orderId||0);return t&&r===a?{...t,...e}:e})}c(eV())}},[e,u,s,l,f,m,y?.table_no,y?.table_id,g?.percentage,c,p])}({isOpen:e,merchantSettings:R,setIsDarkTheme:eR,paymentLoadVATSettings:B,initialCheckoutStep:d,existingOrderId:s,hasPersonalItems:e1,preferPersonalReview:m,setCheckoutStep:eM,initialSubmittedOrder:c,tableDraft:eW,setSubmittedSnapshot:eq,checkoutStep:eU,checkoutListViewKey:rC,isSubmittedTableDraftForStatus:rz,tableInfo:a,taxSettings:P});let rw="review"===eU&&eW?.success&&eW.status&&"empty"!==eW.status&&!e1&&!m?"Table Order":({review:"My Order",submitted:"Order Status",split:"Split bill","split-items":"Assign items","split-shares":"Set shares","split-review":"Review split",payment:"Payment",paid:"Order complete"})[eU],{modernGreenTableDraftItems:rS,modernGreenTableDraftTotal:r_,modernGreenSubmittedItems:rE,modernGreenPersonalItems:rN}=function({tableDraft:e,submittedSnapshot:t,personalReviewItems:r,selectedOptions:a,adjustPriceForVAT:o,t:i}){let s=(0,n.useMemo)(()=>T(Array.isArray(e?.items)?e.items:[]),[e?.items]),l=(0,n.useMemo)(()=>Number(e?.totals?.total??e?.totals?.orderTotal??e?.total??w(e,"total")??w(e,"subtotal")??0),[e]);return{modernGreenTableDraftItems:s,modernGreenTableDraftTotal:l,modernGreenSubmittedItems:(0,n.useMemo)(()=>T(Array.isArray(t?.submittedItems)?t.submittedItems:[]),[t?.submittedItems]),modernGreenPersonalItems:(0,n.useMemo)(()=>r.map(e=>{let t=a[String(e.__pmdOptionKey||e.item.id)]||{},r=[];Object.entries(t).forEach(([t,a])=>{let n=(e.item.options||[]).find(e=>String(e.name)===String(t)),i=n?.values?.find(e=>String(e.id)===String(a));i&&r.push({name:String(i.value||i.name||""),price:Number(o(Number(i.price||0)))})});let n=e.item.nameKey?i(e.item.nameKey):e.item.name,s=r.map(e=>e.name).filter(Boolean).join(", "),l=s?`${n} — ${s}`:String(e.__pmdUnitLabel||n),c=Number(o(e.item.price||0))+r.reduce((e,t)=>e+Number(t.price||0),0),d=Number(e.quantity||1);return{...e,quantity:d,__pmdDisplayName:l,__pmdDisplaySubtotal:c*d}}),[r,a,o,i])}}({tableDraft:eW,submittedSnapshot:eK,personalReviewItems:ef,selectedOptions:ep,adjustPriceForVAT:eh,t:S});return(0,o.jsx)(tP,{isOpen:e,isKazenJapaneseCheckoutVisual:e$,isModernGreenCheckoutVisual:"modern_green"===h,isOrganicCheckoutVisual:eG,checkoutVisualTheme:h,modalPrimaryBtn:tY,modalPrimaryBtnStyle:tQ,modalSecondaryBtn:tX,iconBackBtn:tZ,modalTitle:rw,checkoutStep:eU,setCheckoutStep:eM,selectedSplitPersonId:et,onClose:t,tableDraft:eW,tableInfo:a,taxSettings:P,isSubmittedTableDraftForStatus:rz,hasPersonalItems:e1,preferPersonalReview:m,orderContextLabel:rn,orderContextValue:ri,isTableContext:ro,submitDraftLoading:eZ,draftLoading:eQ,handleSubmitTableDraft:t0,setSubmittedSnapshot:eq,personalReviewItems:ef,addToCart:F,t:S,handleOptionsChange:eu,vatLabels:tu,subtotal:eb,taxAmount:ek,tipAmount:tc,appliedCoupon:O,couponDiscount:td,finalTotal:tm,isLoading:V,allItems:r,handleConfirmMyItems:tJ,setIsSplitting:H,splitGrandTotal:tx,splitMethod:$,startSplitFlow:tN,chooseSplitMethod:tI,splitGuestCount:Y,suggestedSplitGuestCount:tg,removeSplitGuest:tk,addSplitGuest:tb,splitGuestProfiles:th,equalSplitPeople:tz,getSplitGuestAvatar:ty,splitGuestNames:tf,unassignedSplitItems:tS,splitSourceItems:tv,itemAssignments:X,setItemAssignments:Z,sharePercents:J,setSharePercents:ee,sharePercentTotal:t_,canConfirmSplitMethod:tE,goToSplitReview:tT,activeSplitPeople:tC,setSelectedSplitPersonId:ei,toast:C,submittedSnapshot:eK,estimatedMinutes:t$,paidTipAmount:tF,paidCouponDiscount:tV,paidAmountTotal:tK,orderStatusTotal:tp,submittedBaseTotal:tl,submittedContextLabel:rs,submittedContextValue:rl,initialSubmittedOrder:c,existingOrderId:s,onOpenOrderUpdate:p,reviewRating:rc,setReviewRating:rd,reviewSubmitStatus:ru,setReviewSubmitStatus:rh,reviewComment:rm,setReviewComment:rp,canSubmitReview:rk,handleSubmitReview:rv,reviewSubmitMessage:rf,merchantSettings:R,activeReviewSharePlatforms:rb,handleDownloadBusinessInvoice:rx,invoiceDownloadStatus:ry,invoiceDownloadMessage:rg,selectedSplitPerson:tw,pendingSummary:l,paymentVatAmount:tU,paymentSubtotalAmount:tD,paymentVatPercentage:tM,paymentBaseAmount:tB,paymentTipAmount:tR,paymentCouponDiscount:tO,paymentPayableTotal:tL,tipSettings:A,paymentTipPercentage:tA,paymentCustomTip:tj,updatePaymentTipPercentage:tq,customTip:e9,updatePaymentCustomTip:tH,couponCode:tr,setCouponCode:ta,setCouponError:ts,couponError:ti,couponLoading:to,setCouponLoading:tn,validateCoupon:D,removeCoupon:U,selectedPaymentMethod:ev,loadingPayments:ez,visiblePaymentMethods:eC,handlePaymentMethodSelect:e=>{if(eP(null),"card"===e)try{globalThis.__stripePreferred="card"}catch{}ex(e)},stripePromise:e_,stripeConfig:ew,selectedMethod:re,isDarkTheme:eB,renderPaymentForm:()=>(0,o.jsx)(iK,{selectedPaymentMethod:ev,selectedMethod:re,stripePromise:e_,stripeConfig:ew,stripeConfigError:eS,hasUnsubmittedPaymentDraft:t5,checkoutStep:eU,setCheckoutStep:eM,selectedProviderCode:rt,handleBackToMethods:t6,paypalConfigLoading:eE,effectivePayPalClientId:eN,effectivePayPalCurrency:eI,resolveSubmittedPaymentAmount:t4,itemsToPay:eg,stripeResolvedRestaurantId:t7,paymentFormData:eO,stripeResolvedTableNumber:t9,handlePayment:t8,toast:C,merchantSettings:R,payableTotal:tG,providerInlineError:ej,isLoading:V,startHostedRedirectCheckout:ra,stripePaymentData:rr,finalTotal:tm,modalPrimaryBtnStyle:tQ,cashCollectionConfirmed:eT,setCashCollectionConfirmed:eA}),renderPaymentButton:()=>(0,o.jsx)(iq,{selectedMethod:re,checkoutStep:eU,payableTotal:tG,finalTotal:tm,selectedPaymentMethod:ev,handlePayment:t8,isLoading:V,paymentFormData:eO}),handlePayment:t8,payableTotal:tG,modernGreenPersonalItems:rN,modernGreenTableDraftItems:rS,modernGreenTableDraftTotal:r_,modernGreenSubmittedItems:rE})}let sc=[];function sd(e){return String(e||"").trim().replace(/\s+/g," ").toLowerCase()}function sm(e){let t=Array.isArray(e)?e.map(e=>String(e||"").trim()).filter(Boolean):[],r=new Set(["omakase","sushi","grill"]),a=t.some(e=>{let t=sd(e);return t&&"all"!==t&&!r.has(t)}),o=new Set,n=[];return t.forEach(e=>{let t=String(e||"").trim(),i=sd(t);!i||o.has(i)||a&&r.has(i)||(o.add(i),n.push(t))}),n}function sp(e,t){let r=function e(t){if(null==t)return"";if("string"==typeof t||"number"==typeof t)return String(t||"").trim();if("object"==typeof t){let r=t.name??t.title??t.label??t.category??t.category_name??t.categoryName??t.menu_category??t.menuCategory??t.group??t.group_name??t.display_name??"";if(r&&"object"!=typeof r)return String(r).trim();if(r&&"object"==typeof r)return e(r)}return""}(t);if(!r||"[object Object]"===r)return;let a=sd(r);!a||e.some(e=>sd(e)===a)||e.push(r)}function su(e){let t=[];return Array.isArray(e)?e.forEach(e=>sp(t,e)):sp(t,e),t}function sh(e){let t=[];return Array.isArray(e)&&e.forEach(e=>{let r;(r=[],!e||"object"!=typeof e||([e.category,e.category_name,e.categoryName,e.menu_category,e.menuCategory,e.category_title,e.categoryTitle,e.group,e.group_name,e.department,e.section,e.menu?.category,e.menu?.category_name,e.meta?.category,e.metadata?.category].forEach(e=>{su(e).forEach(e=>sp(r,e))}),Array.isArray(e.categories)&&e.categories.forEach(e=>{su(e).forEach(e=>sp(r,e))})),r).forEach(e=>sp(t,e))}),t}function sf(e,t){let r=su(e),a=sh(Array.isArray(t)?t:[]),o=function(){let e=[],t=t=>{for(let r=0;r<t.length;r+=1){let a=t.key(r)||"";if(!/pmd-menu-cache|menu-cache|categories|paymydine|cms/i.test(a))continue;let o=t.getItem(a);if(o)try{let t=JSON.parse(o);[t?.categories,t?.categoryNames,t?.data?.categories,t?.data?.categoryNames,t?.state?.categories,t?.state?.categoryNames,t?.settings?.categories,t?.state?.settings?.categories].forEach(t=>{su(t).forEach(t=>sp(e,t))}),[t?.items,t?.menuItems,t?.products,t?.data?.items,t?.data?.menuItems,t?.data?.products,t?.state?.items,t?.state?.menuItems,t?.state?.products,t?.menu?.items,t?.menu?.menuItems].forEach(t=>{Array.isArray(t)&&sh(t).forEach(t=>sp(e,t))})}catch{}}};try{t(window.localStorage)}catch{}try{t(window.sessionStorage)}catch{}return e}(),n=[...r.length?r:a,...sc,...o,...a],i=new Set,s=[];return n.forEach(e=>{let t=String(e||"").trim(),r=sd(t);!r||i.has(r)||(i.add(r),s.push(t))}),(s.length>sc.length||r.length&&s.length===sc.length)&&(sc=sm(s)),sm(sc.length?sc:s)}function sy(e){let t=String(e||"").trim();if(!t||"undefined"===t||"null"===t)return"";if(/^https?:\/\//i.test(t))return t;let r=t.replace(/^\/+/,""),a=r.split("/").filter(Boolean).pop()||r;return r.startsWith("assets/media/uploads/")?`/${r}`:r.startsWith("/assets/media/uploads/")?r:r.startsWith("uploads/")?`/assets/media/${r}`:!r.includes("/")||r.startsWith("assets/media/")?`/assets/media/uploads/${a}`:`/${r}`}function sg(e){let{setSharedTableOrder:t,setLocalOpenOrder:r,setHasLocalOpenOrder:a}=e;return function(e){if(e?.status==="draft"||e?.draft_id)return void t(e);if(e?.paymentStatus==="paid"||e?.status==="paid"){let o=e?.orderId?e:{...e,orderId:e?.order_id};r(o),a(!!o?.orderId),t(e=>e?.order_id&&String(e.order_id)===String(o?.orderId)?{...e,status:"paid",paymentStatus:"paid"}:e);return}(e?.orderId||e?.order_id)&&(r(e?.orderId?e:{...e,orderId:e.order_id}),a(!0),t(e=>e?.draft_id?null:e))}}function sb(...e){let t=["valet_enabled","valetEnabled","enable_valet","enableValet","valet_parking_enabled","valetParkingEnabled","valet_service_enabled","valetServiceEnabled","pmd_valet_enabled","pmdValetEnabled","show_valet","showValet"],r=[...e.filter(Boolean)];for(;r.length>0;){let e=r.shift();if(e&&"object"==typeof e){for(let r of t)if(Object.prototype.hasOwnProperty.call(e,r)){let t=function(e){if(null==e)return null;if("boolean"==typeof e)return e;if("number"==typeof e){if(1===e)return!0;if(0===e)return!1}let t=String(e).trim().toLowerCase();return t&&"null"!==t&&"undefined"!==t?!!["1","true","yes","on","enabled","active","available"].includes(t)||!["0","false","no","off","disabled","inactive","unavailable"].includes(t)&&null:null}(e[r]);if(null!==t)return t}for(let t of["data","settings","config","features","services","restaurant","merchant","frontend","theme"])e[t]&&"object"==typeof e[t]&&r.push(e[t])}}return!0}let sk=(e,t)=>e instanceof Error?e.message:t;function sv(e){return["tabs","tab","tabbed","classic","normal","list","flat","category-tabs","categories-top","top-categories","category-tabs-full-item-list"].includes(String(e||"").trim().toLowerCase().replace(/[_\s-]+/g,"-"))?"tabs":"accordion"}function sx(e){let{apiMenuItems:t,menuItems:r,menuData:a,allCategories:n,tableInfo:i,displayTableNumber:s,tableIdString:l,cmsSettings:c,merchantSettings:d,taxSettings:m,items:p,totalItems:u,totalPrice:h,lastInteractedItem:f,restaurantDisplayName:y,themeMenuActions:g,addToCart:b,handleFirstAdd:k,toast:v,apiClient:x,handleItemSelect:z,handleCartClick:C,shouldShowTableOrderAction:w,setPaymentModalInitialStep:S,sharedTableOrder:_,setPaymentModalPreferPersonalReview:E,setPaymentModalOpen:N,tableOrderActionCount:I,isPaymentModalOpen:T,activeExistingOrderId:A,activePendingSummary:j,activeSubmittedOrder:P,paymentModalInitialStep:B,paymentModalPreferPersonalReview:R,setToolbarPricingSnapshot:O,setSharedTableOrder:L,setLocalOpenOrder:D,setHasLocalOpenOrder:U,normalizeModernGreenLogoUrl:M}=e,F=sg({setSharedTableOrder:L,setLocalOpenOrder:D,setHasLocalOpenOrder:U}),K=`/themes/kazen-japanese/?embedded=1&from=pmd&${window.location.search.replace(/^\?/,"")}`,q=t.length?t:r.length?r:a,H=sf(n,q),G=i?.table_no??i?.table_id??s??l??null,$=M([c?.effectiveLogoUrl,c?.logoUrl,c?.logo_url,c?.logo,c?.restaurantLogoUrl,c?.restaurant_logo,c?.site_logo,c?.header_logo,c?.frontend_logo,c?.business_logo,c?.brand_logo,c?.data?.effectiveLogoUrl,c?.data?.logoUrl,c?.data?.logo_url,c?.data?.logo,c?.data?.restaurant_logo,d?.effectiveLogoUrl,d?.logoUrl,d?.logo_url,d?.logo,d?.restaurantLogoUrl,d?.restaurant_logo,d?.site_logo,d?.header_logo,d?.frontend_logo,d?.business_logo,d?.brand_logo,d?.data?.effectiveLogoUrl,d?.data?.logoUrl,d?.data?.logo_url,d?.data?.logo,d?.data?.restaurant_logo].find(e=>String(e||"").trim())||""),Y=function(...e){let t=["kazen_menu_layout","kazenMenuLayout","menu_layout","menuLayout","food_display_style","foodDisplayStyle","category_display","categoryDisplay"];for(let r of e)if(r&&"object"==typeof r)for(let e of t){let t=r?.[e];if(null!=t&&String(t).trim())return sv(t);let a=r?.data?.[e];if(null!=a&&String(a).trim())return sv(a);let o=r?.settings?.[e];if(null!=o&&String(o).trim())return sv(o)}return"accordion"}(c,d,window.__PMD_THEME_SETTINGS,window.__PMD_ADMIN_THEME_SETTINGS),Q=sb(c,d,i),X=async()=>{let e=i?.table_id||i?.table_no||l||"delivery";try{await x.callWaiter(String(e),"."),v({title:"Waiter called",description:"The team has been notified."})}catch(e){v({title:"Waiter call failed",description:sk(e,"Failed to call waiter."),variant:"destructive"})}},Z=async(t="")=>{let r=i?.table_id||i?.table_no||l||"delivery",a=String(t||"").trim();if(!a)return void e.setNoteModalOpen?.(!0);try{await x.callTableNote(String(r),a,new Date().toISOString()),v({title:"Note sent",description:"Your note was sent to the team."})}catch(e){v({title:"Note failed",description:sk(e,"Failed to send note."),variant:"destructive"})}},J=async(e={})=>{let t=String(e?.name||"Guest").trim()||"Guest",r=String(e?.licensePlate||e?.license_plate||"").trim(),a=String(e?.carModel||e?.car_make||"Not provided").trim()||"Not provided";if(!r)return void v({title:"Valet ticket required",description:"Please enter your valet ticket number or license plate before requesting your car.",variant:"destructive"});try{await x.createValetRequest({name:t,license_plate:r,car_make:a,table_id:l||void 0,table_no:G?String(G):void 0,qr:i?.qr_code?String(i.qr_code):void 0}),v({title:"Valet requested",description:"Your valet request has been sent."})}catch(e){v({title:"Valet request failed",description:sk(e,"Failed to submit valet request."),variant:"destructive"})}};return(0,o.jsx)(V,{actions:g,children:(0,o.jsxs)(W,{src:K,sourceItems:q,cartItems:p,totalItems:u,totalPrice:h,lastInteractedItem:f,categories:H,restaurantName:y,logoUrl:$,tableNumber:G,menuLayout:Y,showValet:Q,onAddItem:(e,t=1)=>{let r={...e};m.enabled&&m.percentage>0&&0===m.menuPrice&&(r.price=Number(e.price||0)/(1+m.percentage/100),r.options&&(r.options=r.options.map(e=>({...e,values:(e.values||[]).map(e=>({...e,price:Number(e.price||0)/(1+m.percentage/100)}))}))));let a=p.find(t=>t.item.id===e.id)?.quantity||0;b(r,t),0===a&&k(e)},onOpenItem:e=>z(e),onCheckout:C,onCallWaiter:X,onOpenNote:Z,onOpenValet:J,onTableOrder:()=>{w&&(S(_?.status==="draft"?"review":_?.status==="paid"?"paid":"submitted"),E(!1),N(!0))},showTableOrder:w,tableOrderCount:I,children:[!1,(0,o.jsx)(sl,{isOpen:T,onClose:()=>{N(!1),E(!1)},items:p,tableInfo:i,existingOrderId:A,pendingSummary:j,initialSubmittedOrder:P,initialCheckoutStep:B,preferPersonalReview:R,checkoutVisualTheme:"kazen_japanese",onCartPricingUpdate:O,onOpenOrderUpdate:F})]})})}let sz=(e,t)=>e instanceof Error?e.message:t;function sC(e){return["tabs","tab","tabbed","classic","normal","list","flat","category-tabs","categories-top","top-categories","category-tabs-full-item-list"].includes(String(e||"").trim().toLowerCase().replace(/[_\s-]+/g,"-"))?"tabs":"accordion"}function sw(e){let{apiMenuItems:t=[],menuItems:r=[],menuData:a=[],allCategories:n=[],tableInfo:i,displayTableNumber:s,tableIdString:l,cmsSettings:c,merchantSettings:d,taxSettings:m,items:p=[],totalItems:u=0,totalPrice:h=0,lastInteractedItem:f,restaurantDisplayName:y,themeMenuActions:g,addToCart:b,handleFirstAdd:k,toast:v,apiClient:x,handleItemSelect:z,handleCartClick:C,shouldShowTableOrderAction:w,setPaymentModalInitialStep:S,sharedTableOrder:_,setPaymentModalPreferPersonalReview:E,setPaymentModalOpen:N,tableOrderActionCount:I,isPaymentModalOpen:T,activeExistingOrderId:A,activePendingSummary:j,activeSubmittedOrder:P,paymentModalInitialStep:B,paymentModalPreferPersonalReview:R,setToolbarPricingSnapshot:O,setSharedTableOrder:L,setLocalOpenOrder:D,setHasLocalOpenOrder:U}=e,M=sg({setSharedTableOrder:L,setLocalOpenOrder:D,setHasLocalOpenOrder:U}),F=`/themes/velvet-terracotta/?embedded=1&from=pmd&${window.location.search.replace(/^\?/,"")}`,K=t.length?t:r.length?r:a,q=sf(n,K),H=i?.table_no??i?.table_id??s??l??null,G=sy([c?.effectiveLogoUrl,c?.logoUrl,c?.logo_url,c?.logo,c?.restaurantLogoUrl,c?.restaurant_logo,c?.site_logo,c?.header_logo,c?.frontend_logo,c?.business_logo,c?.brand_logo,c?.data?.effectiveLogoUrl,c?.data?.logoUrl,c?.data?.logo_url,c?.data?.logo,c?.data?.restaurant_logo,d?.effectiveLogoUrl,d?.logoUrl,d?.logo_url,d?.logo,d?.restaurantLogoUrl,d?.restaurant_logo,d?.site_logo,d?.header_logo,d?.frontend_logo,d?.business_logo,d?.brand_logo,d?.data?.effectiveLogoUrl,d?.data?.logoUrl,d?.data?.logo_url,d?.data?.logo,d?.data?.restaurant_logo].find(e=>String(e||"").trim())||""),$=function(...e){let t=["kazen_menu_layout","kazenMenuLayout","menu_layout","menuLayout","food_display_style","foodDisplayStyle","category_display","categoryDisplay"];for(let r of e)if(r&&"object"==typeof r)for(let e of t){let t=r?.[e];if(null!=t&&String(t).trim())return sC(t);let a=r?.data?.[e];if(null!=a&&String(a).trim())return sC(a);let o=r?.settings?.[e];if(null!=o&&String(o).trim())return sC(o)}return"tabs"}(c,d,window.__PMD_THEME_SETTINGS,window.__PMD_ADMIN_THEME_SETTINGS),Y=sb(c,d,i),Q=async()=>{let e=i?.table_id||i?.table_no||l||"delivery";try{await x.callWaiter(String(e),"."),v({title:"Waiter called",description:"The team has been notified."})}catch(e){v({title:"Waiter call failed",description:sz(e,"Failed to call waiter."),variant:"destructive"})}},X=async(t="")=>{let r=i?.table_id||i?.table_no||l||"delivery",a=String(t||"").trim();if(!a)return void e.setNoteModalOpen?.(!0);try{await x.callTableNote(String(r),a,new Date().toISOString()),v({title:"Note sent",description:"Your note was sent to the team."})}catch(e){v({title:"Note failed",description:sz(e,"Failed to send note."),variant:"destructive"})}},Z=async(e={})=>{let t=String(e?.name||"Guest").trim()||"Guest",r=String(e?.licensePlate||e?.license_plate||"Not provided").trim()||"Not provided",a=String(e?.carModel||e?.car_make||"Not provided").trim()||"Not provided";try{await x.createValetRequest({name:t,license_plate:r,car_make:a,table_id:l||void 0,table_no:H?String(H):void 0,qr:i?.qr_code?String(i.qr_code):void 0}),v({title:"Valet requested",description:"Your valet request has been sent."})}catch(e){v({title:"Valet request failed",description:sz(e,"Failed to submit valet request."),variant:"destructive"})}};return(0,o.jsx)(V,{actions:g,children:(0,o.jsx)(W,{src:F,sourceItems:K,cartItems:p,totalItems:u,totalPrice:h,lastInteractedItem:f,categories:q,restaurantName:y,logoUrl:G,tableNumber:H,menuLayout:$,showValet:Y,onAddItem:(e,t=1)=>{let r={...e};m?.enabled&&m?.percentage>0&&m?.menuPrice===0&&(r.price=Number(e.price||0)/(1+m.percentage/100),r.options&&(r.options=r.options.map(e=>({...e,values:(e.values||[]).map(e=>({...e,price:Number(e.price||0)/(1+m.percentage/100)}))}))));let a=p.find(t=>t.item.id===e.id)?.quantity||0;b(r,t),0===a&&k(e)},onOpenItem:e=>z(e),onCheckout:C,onCallWaiter:Q,onOpenNote:X,onOpenValet:Z,onTableOrder:()=>{w&&(S(_?.status==="draft"?"review":_?.status==="paid"?"paid":"submitted"),E(!1),N(!0))},showTableOrder:w,tableOrderCount:I,children:(0,o.jsx)(sl,{isOpen:T,onClose:()=>{N(!1),E(!1)},items:p,tableInfo:i,existingOrderId:A,pendingSummary:j,initialSubmittedOrder:P,initialCheckoutStep:B,preferPersonalReview:R,checkoutVisualTheme:"kazen_japanese",onCartPricingUpdate:O,onOpenOrderUpdate:M})})})}let sS=(0,X.default)("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);var s_=e.i(68390),sE=e.i(94576),sN=e.i(44420),sI=e.i(57012),sT=e.i(98052);let sA=(0,X.default)("ShoppingCart",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]]);function sj({cartCount:e,totalPrice:t,showTableOrder:r,tableOrderCount:a,onCheckout:n,onCallWaiter:i,onOpenNote:s,onOpenValet:l,onTableOrder:c,onLanguage:d}){return(0,o.jsxs)("div",{className:"mg-actions","aria-label":"Modern Green actions",children:[(0,o.jsxs)("button",{type:"button",onClick:()=>void i(),children:[(0,o.jsx)(sE.Bell,{size:18})," Waiter"]}),(0,o.jsxs)("button",{type:"button",onClick:()=>void s(),children:[(0,o.jsx)(ea.MessageSquare,{size:18})," Note"]}),r&&(0,o.jsxs)("button",{type:"button",onClick:()=>void c?.(),children:[(0,o.jsx)(sI.ClipboardList,{size:18})," Table"," ",a?`(${a})`:""]}),(0,o.jsxs)("button",{type:"button",onClick:()=>void l(),children:[(0,o.jsx)(sN.Car,{size:18})," Valet"]}),d&&(0,o.jsxs)("button",{type:"button",onClick:()=>void d(),children:[(0,o.jsx)(sT.Languages,{size:18})," Language"]}),(0,o.jsxs)("button",{type:"button",className:"mg-checkout",onClick:n,children:[(0,o.jsx)(sA,{size:18})," ",e," · $",t.toFixed(2)]})]})}function sP(e){return String(e?.id??e?.menu_id??e?.menuId??"")}function sB(e){return String(e?.name??e?.menu_name??e?.title??"Menu item")}function sR(e){return String(e?.description??e?.menu_description??e?.desc??"")}function sO(e){return String(e?.category??e?.category_name??e?.categoryName??e?.menu_category_name??"Menu")}function sL(e){let t=Number(e?.price??e?.menu_price??e?.sale_price??0);return Number.isFinite(t)?t:0}function sD(e){let t=Array.isArray(e?.images)?e.images:[],r=Array.isArray(e?.media)?e.media:[];return String([e?.image,e?.image_url,e?.imageUrl,e?.thumb,e?.thumbnail,...t.map(e=>"string"==typeof e?e:e?.url||e?.path||e?.image_path||e?.src),...r.map(e=>e?.url||e?.path||e?.image_path||e?.src)].find(e=>"string"==typeof e&&e.trim())||"")}function sU(e){let[t,r]=(0,n.useState)(""),[a,i]=(0,n.useState)("All"),s=Array.isArray(e.sourceItems)?e.sourceItems:[],l=(0,n.useMemo)(()=>["All",...Array.from(new Set([...e.categories||[],...s.map(sO)].filter(Boolean)))],[e.categories,s]),c=(0,n.useMemo)(()=>s.filter(e=>{let r="All"===a||sO(e)===a,o=`${sB(e)} ${sR(e)} ${sO(e)}`.toLowerCase();return r&&o.includes(t.toLowerCase())}),[s,a,t]),d=c.filter(e=>e?.is_bestseller||e?.is_recommended||e?.is_featured||e?.is_popular||e?.is_chef_recommended).slice(0,4);return(0,o.jsxs)("div",{className:"pmd-theme-modern-green pmd-customer-page page--menu",children:[(0,o.jsx)("style",{children:`
        .pmd-theme-modern-green{min-height:100vh;color:#eefbf3;background:radial-gradient(circle at 85% 0%,rgba(25,118,84,.34),transparent 28%),linear-gradient(180deg,#031b12 0%,#020806 56%,#000 100%);padding:24px 16px 136px;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.pmd-theme-modern-green *{box-sizing:border-box}.pmd-theme-modern-green .mg-shell{max-width:1120px;margin:0 auto}.pmd-theme-modern-green .mg-hero{border:1px solid rgba(167,244,197,.18);background:linear-gradient(135deg,rgba(10,51,34,.94),rgba(2,15,10,.88));box-shadow:0 24px 80px rgba(0,0,0,.4);border-radius:32px;padding:24px;display:grid;gap:20px}.pmd-theme-modern-green .mg-logo{width:64px;height:64px;border-radius:22px;object-fit:cover;background:#effff5}.pmd-theme-modern-green h1{font-size:clamp(2rem,7vw,4.8rem);line-height:.92;margin:12px 0;color:#f8fff9;letter-spacing:-.06em}.pmd-theme-modern-green .mg-muted{color:#a7c7b5}.pmd-theme-modern-green .mg-search{display:flex;align-items:center;gap:10px;border:1px solid rgba(166,244,197,.2);background:rgba(255,255,255,.06);border-radius:999px;padding:12px 16px}.pmd-theme-modern-green .mg-search input{all:unset;width:100%;color:#fff}.pmd-theme-modern-green .mg-cats{display:flex;gap:10px;overflow:auto;padding:18px 2px}.pmd-theme-modern-green button{border:0;cursor:pointer}.pmd-theme-modern-green .mg-cat{white-space:nowrap;border-radius:999px;padding:10px 16px;background:rgba(255,255,255,.07);color:#dceee4;border:1px solid rgba(255,255,255,.08)}.pmd-theme-modern-green .mg-cat[data-active=true]{background:#82f0a8;color:#052414}.pmd-theme-modern-green .mg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.pmd-theme-modern-green .mg-card{overflow:hidden;border-radius:28px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);box-shadow:0 14px 40px rgba(0,0,0,.28)}.pmd-theme-modern-green .mg-img{height:170px;background:rgba(255,255,255,.05);position:relative}.pmd-theme-modern-green .mg-img img{object-fit:cover}.pmd-theme-modern-green .mg-card-body{padding:16px}.pmd-theme-modern-green .mg-card h3{margin:0 0 8px;font-size:1.1rem}.pmd-theme-modern-green .mg-card p{min-height:44px;margin:0 0 14px;color:#a7c7b5;font-size:.9rem}.pmd-theme-modern-green .mg-card-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.pmd-theme-modern-green .mg-add{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:#82f0a8;color:#052414;padding:10px 14px;font-weight:800}.pmd-theme-modern-green .mg-price{font-weight:900;color:#f5fff9}.pmd-theme-modern-green .mg-actions{position:fixed;left:50%;bottom:18px;z-index:40;transform:translateX(-50%);display:flex;gap:8px;max-width:min(980px,calc(100vw - 24px));overflow:auto;padding:10px;border-radius:999px;background:rgba(2,12,8,.88);border:1px solid rgba(130,240,168,.24);box-shadow:0 20px 60px rgba(0,0,0,.5);backdrop-filter:blur(18px)}.pmd-theme-modern-green .mg-actions button{display:flex;align-items:center;gap:6px;white-space:nowrap;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.08);color:#effff5}.pmd-theme-modern-green .mg-actions .mg-checkout{background:#82f0a8;color:#052414;font-weight:900}`}),(0,o.jsxs)("main",{className:"mg-shell",children:[(0,o.jsxs)("section",{className:"mg-hero",children:[(0,o.jsxs)("div",{children:[e.logoUrl?(0,o.jsx)("img",{className:"mg-logo",src:e.logoUrl,alt:""}):null,(0,o.jsxs)("p",{className:"mg-muted",children:["Table ",e.tableNumber||"Guest"]}),(0,o.jsx)("h1",{children:e.restaurantName}),(0,o.jsx)("p",{className:"mg-muted",children:"Fresh picks, live from the PayMyDine menu."})]}),(0,o.jsxs)("label",{className:"mg-search",children:[(0,o.jsx)(sS,{size:18}),(0,o.jsx)("input",{value:t,onChange:e=>r(e.target.value),placeholder:"Search dishes"})]})]}),(0,o.jsx)("nav",{className:"mg-cats","aria-label":"Menu categories",children:l.map(e=>(0,o.jsx)("button",{type:"button",className:"mg-cat","data-active":e===a,onClick:()=>i(e),children:e},e))}),d.length>0&&(0,o.jsxs)("p",{className:"mg-muted",children:[(0,o.jsx)(en,{size:16,style:{display:"inline"}})," Featured today"]}),(0,o.jsx)("section",{className:"mg-grid",children:c.map(t=>(0,o.jsxs)("article",{className:"mg-card",children:[(0,o.jsx)("button",{type:"button",className:"mg-img",onClick:()=>e.onOpenItem(t),children:sD(t)?(0,o.jsx)(s_.OptimizedImage,{src:sD(t),alt:sB(t),fill:!0}):null}),(0,o.jsxs)("div",{className:"mg-card-body",children:[(0,o.jsx)("h3",{children:sB(t)}),(0,o.jsx)("p",{children:sR(t)||sO(t)}),(0,o.jsxs)("div",{className:"mg-card-footer",children:[(0,o.jsx)("span",{className:"mg-price",children:U(sL(t))}),(0,o.jsxs)("button",{type:"button",className:"mg-add",onClick:()=>e.onAddItem(t,1),children:[(0,o.jsx)(e7.Plus,{size:16})," Add"]})]})]})]},sP(t)))})]}),(0,o.jsx)(sj,{cartCount:e.totalItems,totalPrice:e.totalPrice,showTableOrder:e.showTableOrder,tableOrderCount:e.tableOrderCount,onCheckout:e.onCheckout,onCallWaiter:e.onCallWaiter,onOpenNote:()=>e.onOpenNote(),onOpenValet:()=>e.onOpenValet(),onTableOrder:e.onTableOrder,onLanguage:e.onLanguage}),e.children]})}var sM=e.i(46351);function sF(e){let t=[{key:"waiter",label:"Waiter",icon:"🛎️",onClick:e.onCallWaiter},{key:"note",label:"Note",icon:"✎",onClick:e.onOpenNote},...e.showTableOrder?[{key:"table",label:"Table Order",icon:"☷",onClick:e.onOpenTableOrder,count:e.tableOrderCount}]:[],{key:"checkout",label:"Checkout",icon:"🧾",onClick:e.onOpenCheckout,count:e.cartCount,primary:!0}];return(0,o.jsx)("nav",{className:sM.default.dock,"data-theme":"modernGreen","aria-label":"Menu actions",children:t.map(e=>(0,o.jsxs)("button",{type:"button",className:`${sM.default.button} ${e.primary?sM.default.primary:""}`,onClick:()=>void e.onClick(),children:[(0,o.jsx)("span",{className:sM.default.icon,"aria-hidden":"true",children:e.icon}),(0,o.jsx)("span",{children:e.label}),Number(e.count||0)>0&&(0,o.jsx)("span",{className:sM.default.badge,children:e.count})]},e.key))})}let sV=(0,X.default)("Leaf",[["path",{d:"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",key:"nnexq3"}],["path",{d:"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",key:"mt58a7"}]]),sK=(0,X.default)("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]),sq=(0,X.default)("Sprout",[["path",{d:"M7 20h10",key:"e6iznv"}],["path",{d:"M10 20c5.5-2.5.8-6.4 3-10",key:"161w41"}],["path",{d:"M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z",key:"9gtqwd"}],["path",{d:"M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z",key:"bkxnd2"}]]);function sH({halal:e=!1,vegetarian:t=!1,vegan:r=!1,allergens:a=[],allergyTags:n=[],compact:i=!1,className:s}){let l=Array.from(new Set([...n||[],...a||[]].filter(Boolean))),c=[...e?[{key:"halal",label:"Halal",title:"Halal",icon:(0,o.jsx)("span",{"aria-hidden":"true",className:"font-[serif] text-[9px] font-bold leading-none tracking-tight",children:"حلال"}),compactClassName:"border-sky-200/80 bg-sky-50/95 text-sky-700",expandedClassName:"border-sky-200/80 bg-sky-50/95 text-sky-800",iconClassName:"bg-white/85 text-sky-700"}]:[],...t?[{key:"vegetarian",label:"Vegetarian",shortLabel:"Veg",title:"Vegetarian",icon:(0,o.jsx)(sV,{className:"h-3.5 w-3.5","aria-hidden":"true"}),compactClassName:"border-emerald-200/80 bg-emerald-50/95 text-emerald-700",expandedClassName:"border-emerald-200/80 bg-emerald-50/95 text-emerald-800",iconClassName:"bg-white/85 text-emerald-700"}]:[],...r?[{key:"vegan",label:"Vegan",title:"Vegan",icon:(0,o.jsx)(sq,{className:"h-3.5 w-3.5","aria-hidden":"true"}),compactClassName:"border-lime-200/80 bg-lime-50/95 text-lime-700",expandedClassName:"border-lime-200/80 bg-lime-50/95 text-lime-800",iconClassName:"bg-white/85 text-lime-700"}]:[],...l.length>0?[{key:"allergens",label:`Allergens: ${l.join(", ")}`,title:`Allergy warning: ${l.join(", ")}`,icon:(0,o.jsx)(sK,{className:"h-3.5 w-3.5","aria-hidden":"true"}),compactClassName:"border-amber-200/80 bg-amber-50/95 text-amber-700",expandedClassName:"border-amber-200/80 bg-amber-50/95 text-amber-900",iconClassName:"bg-white/85 text-amber-700"}]:[]];return 0===c.length?null:(0,o.jsx)("div",{className:(0,eB.cn)("flex flex-wrap items-center gap-1.5",s),role:"list","aria-label":"Food attributes and allergy warnings",children:c.map(e=>(0,o.jsxs)("span",{role:"listitem",tabIndex:0,className:(0,eB.cn)(i?"inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm ring-1 ring-white/70 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2":"inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-medium leading-none shadow-sm ring-1 ring-white/70 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",i?e.compactClassName:e.expandedClassName),"aria-label":e.title,title:e.title,children:[(0,o.jsx)("span",{className:(0,eB.cn)(i?"inline-flex items-center justify-center":"inline-flex h-6 w-6 items-center justify-center rounded-full",!i&&e.iconClassName),"aria-hidden":"true",children:e.icon}),!i&&(0,o.jsx)("span",{children:e.label})]},e.key))})}let sG=e=>{if(null==e||""===e)return null;let t=Number(e);return Number.isFinite(t)?t:null},s$=e=>{let t=sG(e);return null===t?null:`${Number.isInteger(t)?t:t.toFixed(1)}g`};function sW({calories:e,protein:t,carbs:r,fat:a,sugar:n,servingSize:i,compact:s=!1,className:l}){let c=sG(e),d=[{label:"Protein",value:s$(t)},{label:"Carbs",value:s$(r)},{label:"Fat",value:s$(a)},{label:"Sugar",value:s$(n)}].filter(e=>e.value);if(null===c&&0===d.length&&!i)return null;if(s)return(0,o.jsx)("div",{className:(0,eB.cn)("flex flex-wrap items-center gap-1.5",l),"aria-label":"Nutrition estimates",children:null!==c&&(0,o.jsxs)("span",{className:"inline-flex h-6 items-center rounded-full bg-black/5 px-2 text-[11px] font-medium text-neutral-700",title:"Estimated calories per serving","aria-label":`Estimated calories: ${c} kcal`,children:[c," kcal"]})});let m=[null!==c?`${c} kcal`:null,...d.map(e=>`${e.label} ${e.value}`)].filter(Boolean);return(0,o.jsxs)("div",{className:(0,eB.cn)("text-left text-sm text-neutral-700",l),children:[(0,o.jsxs)("p",{className:"leading-relaxed",children:[(0,o.jsx)("span",{className:"font-medium text-neutral-700",children:"Nutrition"}),m.length>0?` \xb7 ${m.join(" · ")}`:""]}),i?(0,o.jsxs)("p",{className:"mt-1 text-xs text-neutral-700",children:["Serving: ",i]}):null,(0,o.jsx)("p",{className:"mt-1 text-[10px] text-neutral-700",children:"Estimated values. Actual values may vary."})]})}let sY=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;function sQ({color:e,label:t="Menu item color",className:r}){let a="string"==typeof e&&sY.test(e.trim())?e.trim():null;return a?(0,o.jsx)("span",{className:(0,eB.cn)("inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/80 shadow-sm ring-1 ring-black/10",r),style:{backgroundColor:a},"aria-label":`${t}: ${a}`,title:`${t}: ${a}`,role:"img",children:(0,o.jsx)("span",{className:"sr-only",children:`${t}: ${a}`})}):null}var sX=e.i(69941);let sZ=/[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;function sJ(e){return!!e&&sZ.test(e)}function s0(e){return sJ(e)?"rtl":"ltr"}function s1(e){return sJ(e)?"text-right":"text-left"}function s2({item:e,settings:t=l}){if(!t.show_modal_badges)return null;let r=[];e.is_chef_recommended&&r.push({key:"chef",label:t.chef_label||"Chef’s Choice",icon:"👨‍🍳",className:"border-[#0F4D43]/35 bg-[#E6F2EF] text-[#0F4D43]"}),e.is_bestseller&&r.push({key:"best",label:t.bestseller_label||"Best Seller",icon:"🏆",className:"border-[#C7A45A]/45 bg-[#F7E8BD] text-[#704A10]"});let a="show_all"===t.badge_display_mode?r:r.slice(0,1);return a.length?(0,o.jsx)("div",{className:"mb-3 flex flex-wrap items-center justify-center gap-1.5","aria-label":"Menu item highlights",children:a.map(e=>(0,o.jsxs)("span",{className:`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.05em] shadow-sm ${e.className}`,"aria-label":e.label,title:e.label,children:[(0,o.jsx)("span",{"aria-hidden":"true",children:e.icon}),t.show_badge_text_in_modal&&(0,o.jsx)("span",{children:e.label})]},e.key))}):null}function s5({item:e,onClose:t,highlightSettings:r=l}){let{t:a}=(0,f.useLanguageStore)(),[s,c]=(0,n.useState)(0),[d,m]=(0,n.useState)(e),[p,u]=(0,n.useState)(!1),[h,y]=(0,n.useState)(!1);(0,n.useEffect)(()=>{y(!0)},[]),(0,n.useEffect)(()=>{if("u"<typeof document)return;let e=()=>v(document.documentElement.getAttribute("data-theme")||"gold-luxury");e();let t=new MutationObserver(e);return t.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme"]}),()=>t.disconnect()},[]),(0,n.useEffect)(()=>{e&&(u(!1),m(e),c(0))},[e]);let[g,b]=(0,n.useState)(!!e),[k,v]=(0,n.useState)("gold-luxury"),x=(0,n.useRef)(null);(0,n.useEffect)(()=>{if(e&&!p){x.current&&(window.clearTimeout(x.current),x.current=null),m(e),b(!0);return}return b(!1),x.current=window.setTimeout(()=>{m(null),c(0),x.current=null},320),()=>{x.current&&(window.clearTimeout(x.current),x.current=null)}},[e,p]);let z=d?a(d.nameKey)||d.name:"",C=d?a(d.descriptionKey)||d.description:"",w=(0,n.useMemo)(()=>{if(!d)return[];let e=e=>Array.isArray(e)?e.map(e=>"string"==typeof e?e:e?.url||e?.image||e?.src||e?.image_path||e?.path||"").filter(e=>"string"==typeof e&&e.trim().length>0):[],t=e(d.media);return Array.from(new Set([d.image,...e(d.images),...e(d.gallery),...e(d.additional_images),...e(d.additionalImages),...e(t)].filter(Boolean)))},[d]);(0,n.useEffect)(()=>{c(0)},[d?.id]),(0,n.useEffect)(()=>{d&&console.info("PMD_MODAL_GALLERY_IMAGES",{id:d?.id||d?.menu_id,name:d?.name,count:w.length,images:w})},[d,w]),(0,n.useEffect)(()=>{if(!g||!d||w.length<=1)return;let e=window.setInterval(()=>{c(e=>(e+1)%w.length)},5e3);return()=>window.clearInterval(e)},[g,d,w]),(0,n.useEffect)(()=>()=>{x.current&&window.clearTimeout(x.current)},[]);let S=!!(e&&d&&!p);(0,n.useEffect)(()=>{if(!S)return;let e=document.body.style.overflow,t=document.body.style.overscrollBehavior;return document.body.style.overflow="hidden",document.body.style.overscrollBehavior="none",()=>{document.body.style.overflow=e,document.body.style.overscrollBehavior=t}},[S]);let _=e=>{e?.stopPropagation?.(),p||(u(!0),x.current&&window.clearTimeout(x.current),x.current=window.setTimeout(()=>{t()},320))};return h&&d?(0,sX.createPortal)((0,o.jsx)(e3,{children:S&&(0,o.jsx)(eA.motion.div,{"data-pmd-food-modal-overlay":"true","data-pmd-overlay-fix":"no-scale-fullscreen",initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed -inset-8 z-[999999] flex h-[calc(100dvh+4rem)] min-h-[calc(100vh+4rem)] w-[calc(100vw+4rem)] max-w-none items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-lg overscroll-contain",onClick:_,style:{position:"fixed",inset:"-32px",width:"calc(100vw + 64px)",height:"calc(100dvh + 64px)",minHeight:"calc(100vh + 64px)",maxWidth:"none",transformOrigin:"center center"},transition:{duration:.35,ease:"easeOut"},children:(0,o.jsxs)(eA.motion.div,{initial:{scale:.95,opacity:0},animate:{scale:g?1:.97,y:8*!g,opacity:+!!g},exit:{scale:.97,y:8,opacity:0},transition:{duration:.48,ease:[.22,1,.36,1]},className:`relative surface pmd-v2-card w-full max-w-xl max-h-[90dvh] overflow-hidden ${"organic_botanical_paper"===k?"rounded-[2.35rem] border border-[#D8CBAF] shadow-[0_28px_80px_rgba(66,55,35,0.24)]":"rounded-3xl shadow-2xl"}`,style:"organic_botanical_paper"===k?{background:"radial-gradient(circle at 18% 8%, rgba(255,255,255,.9), transparent 34%), radial-gradient(circle at 85% 16%, rgba(184,134,75,.12), transparent 28%), #FFF9EF",color:"#352F28"}:void 0,onClick:e=>e.stopPropagation(),children:["organic_botanical_paper"===k&&(0,o.jsx)(sV,{className:"pointer-events-none absolute -right-4 top-16 z-0 h-24 w-24 rotate-12 text-[#737A55]/10"}),(0,o.jsxs)(eP.Button,{variant:"ghost",size:"sm",onClick:_,className:"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 pmd-v2-action-circle hover:opacity-90 absolute top-4 left-4 z-10",style:{background:"organic_botanical_paper"===k?"var(--theme-primary, #737A55)":"#062F2A",backgroundColor:"organic_botanical_paper"===k?"var(--theme-primary, #737A55)":"#062F2A",color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",borderColor:"organic_botanical_paper"===k?"var(--theme-primary, #737A55)":"#062F2A",outlineColor:"organic_botanical_paper"===k?"var(--theme-primary, #737A55)":"#062F2A",textDecoration:"none"},children:[(0,o.jsx)(ej.ArrowLeft,{className:"h-4 w-4 mr-1",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}}),"Back"]}),(0,o.jsxs)("div",{className:`relative z-10 overflow-y-auto overscroll-contain max-h-[90dvh] ${"organic_botanical_paper"===k?"bg-transparent p-5 sm:p-6":"p-6"}`,children:[(0,o.jsxs)("div",{className:`relative mb-6 mx-auto flex max-w-full items-center justify-center overflow-visible ${"organic_botanical_paper"===k?"border border-[#E1D4B9] bg-[#F3EBDD] shadow-inner":"bg-black/5"}`,style:{borderRadius:"0px"},"data-pmd-shared-item-gallery":"true",children:[(0,o.jsx)(e3,{mode:"wait",children:(0,o.jsx)(eA.motion.img,{src:(0,i.getMenuImageUrl)(w[s]||d.image)||"/placeholder.svg",alt:z,initial:{opacity:0,scale:.99},animate:{opacity:1,scale:1},exit:{opacity:0,scale:1.01},transition:{duration:.55,ease:"easeInOut"},className:"block max-w-full max-h-[42dvh] object-contain",style:{width:"auto",height:"auto",borderRadius:0}},`${d?.id}-${s}`)}),w.length>1&&(0,o.jsx)("div",{className:"absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1.5 shadow-lg backdrop-blur",children:w.map((e,t)=>(0,o.jsx)("button",{type:"button","aria-label":`Show image ${t+1}`,onClick:()=>c(t),className:`h-1.5 rounded-full transition-all ${t===s?"w-5 bg-[#0F4D43]":"w-1.5 bg-black/25"}`},`${e}-${t}`))})]}),(0,o.jsx)("h2",{dir:"auto",className:`font-serif text-3xl font-bold mb-3 text-center ${"organic_botanical_paper"===k?"text-[#352F28]":"pmd-v2-text"}`,children:z}),(0,o.jsx)(s2,{item:d,settings:r}),(0,o.jsxs)("div",{className:"mb-4 flex flex-wrap items-center justify-center gap-1.5",children:[(0,o.jsx)(sQ,{color:d?.color,label:`${z} color`}),(0,o.jsx)(sH,{halal:d?.halal,vegetarian:d?.vegetarian,vegan:d?.vegan,allergens:d?.allergens,allergyTags:d?.allergy_tags,className:"justify-center"})]}),(0,o.jsx)("p",{dir:s0(C),className:`${"organic_botanical_paper"===k?"text-[#7D7467]":"pmd-v2-text-muted"} text-lg leading-relaxed mb-4 ${s1(C)}`,children:C}),(0,o.jsx)(sW,{calories:d?.calories,protein:d?.protein,carbs:d?.carbs,fat:d?.fat,sugar:d?.sugar,servingSize:d?.serving_size})]})]})})}),document.body):null}let s3=(e,t)=>e instanceof Error?e.message:t;function s4(e){let{apiMenuItems:t,menuItems:r,menuData:a,allCategories:n,tableInfo:i,displayTableNumber:s,tableIdString:l,cmsSettings:c,merchantSettings:d,taxSettings:m,items:p,totalItems:u,totalPrice:h,lastInteractedItem:f,restaurantDisplayName:y,themeMenuActions:g,addToCart:b,handleFirstAdd:k,toast:v,apiClient:x,handleItemSelect:z,selectedItem:C,setSelectedItem:w,handleCartClick:S,shouldShowTableOrderAction:_,setPaymentModalInitialStep:E,sharedTableOrder:N,setPaymentModalPreferPersonalReview:I,setPaymentModalOpen:T,tableOrderActionCount:A,isPaymentModalOpen:j,activeExistingOrderId:P,activePendingSummary:B,activeSubmittedOrder:R,paymentModalInitialStep:O,paymentModalPreferPersonalReview:L,setToolbarPricingSnapshot:D,setSharedTableOrder:U,setLocalOpenOrder:M,setHasLocalOpenOrder:F,normalizeModernGreenLogoUrl:K}=e,q=sg({setSharedTableOrder:U,setLocalOpenOrder:M,setHasLocalOpenOrder:F}),H=t.length?t:r.length?r:a,G=i?.table_no??i?.table_id??s??l??null,$=K(c?.logoUrl||c?.logo||c?.logo_url||c?.site_logo||c?.restaurant_logo||d?.logoUrl||d?.logo||d?.logo_url||d?.site_logo||d?.restaurant_logo||""),W=async()=>{let e=l||"delivery";try{await x.callWaiter(String(e),"."),v({title:"Waiter called",description:l?"We are on the way!":"We received your assistance request."})}catch(e){v({title:"Waiter call failed",description:s3(e,"Failed to call waiter."),variant:"destructive"})}},Y=async(e="")=>{let t=String(e||"").trim();if(!t)return void v({title:"Note is empty",description:"Please write a note before sending it.",variant:"destructive"});let r=l||"delivery";try{await x.callTableNote(String(r),t,new Date().toISOString()),v({title:"Note sent",description:"Your note has been sent to the staff."})}catch(e){v({title:"Note failed",description:s3(e,"Failed to send note."),variant:"destructive"})}},Q=async(e={})=>{let t=String(e?.name||"Guest").trim()||"Guest",r=String(e?.licensePlate||e?.license_plate||"Not provided").trim()||"Not provided",a=String(e?.carModel||e?.car_make||"Not provided").trim()||"Not provided";try{await x.createValetRequest({name:t,license_plate:r,car_make:a,table_id:l||void 0,table_no:G?String(G):void 0,qr:i?.qr_code?String(i.qr_code):void 0}),v({title:"Valet requested",description:"Your valet request has been sent."})}catch(e){v({title:"Valet request failed",description:s3(e,"Failed to submit valet request."),variant:"destructive"})}};return(0,o.jsx)(V,{actions:g,children:(0,o.jsxs)(sU,{sourceItems:H,cartItems:p,totalItems:u,totalPrice:h,lastInteractedItem:f,categories:n,restaurantName:y,logoUrl:$,tableNumber:G,onAddItem:(e,t=1)=>{let r={...e};m.enabled&&m.percentage>0&&0===m.menuPrice&&(r.price=Number(r.price||0)/(1+m.percentage/100),r.options&&(r.options=r.options.map(e=>({...e,values:(e.values||[]).map(e=>({...e,price:Number(e.price||0)/(1+m.percentage/100)}))}))));for(let e=0;e<Math.max(1,Number(t||1));e+=1)b(r);k(e),v({title:"Added to order",description:String(e.name||"Item added")})},onOpenItem:e=>z(e),onCheckout:S,onCallWaiter:W,onOpenNote:Y,onOpenValet:Q,onTableOrder:()=>{_&&(E(N?.status==="draft"?"review":N?.status==="paid"?"paid":"submitted"),I(!1),T(!0))},showTableOrder:_,tableOrderCount:A,children:[(0,o.jsx)(sF,{...g}),(0,o.jsx)(s5,{item:C||null,onClose:()=>w?.(null)}),(0,o.jsx)(sl,{isOpen:j,onClose:()=>{T(!1),I(!1)},items:p,tableInfo:i,existingOrderId:P,pendingSummary:B,initialSubmittedOrder:R,initialCheckoutStep:O,preferPersonalReview:L,checkoutVisualTheme:"modern_green",onCartPricingUpdate:D,onOpenOrderUpdate:q})]})})}function s8({actions:e}){return(0,o.jsxs)("div",{className:"ob-actions","aria-label":"Organic Botanical actions",children:[(0,o.jsx)("button",{type:"button",onClick:e?.onWaiterClick,children:"Waiter"}),(0,o.jsx)("button",{type:"button",onClick:e?.onNoteClick,children:"Note"}),(0,o.jsx)("button",{type:"button",onClick:e?.onTableOrderClick,children:"Table"}),(0,o.jsx)("button",{type:"button",onClick:e?.onValetClick,children:"Valet"}),e?.onLanguageClick&&(0,o.jsx)("button",{type:"button",onClick:e.onLanguageClick,children:"Language"}),(0,o.jsxs)("button",{type:"button",className:"ob-checkout",onClick:e?.onCartClick,children:["Cart ",e?.cartCount?`(${e.cartCount})`:""]})]})}function s6({sourceItems:e,categories:t,restaurantName:r,tableNumber:a,actions:i,onAddItem:s,onOpenItem:l,children:c}){let[d,m]=(0,n.useState)("All"),[p,u]=(0,n.useState)(""),h=Array.isArray(e)?e:[],f=(0,n.useMemo)(()=>["All",...Array.from(new Set([...t||[],...h.map(sO)].filter(Boolean)))],[t,h]),y=(0,n.useMemo)(()=>h.filter(e=>{let t="All"===d||sO(e)===d,r=`${sB(e)} ${sR(e)} ${sO(e)}`.toLowerCase();return t&&r.includes(p.toLowerCase())}),[h,d,p]);return(0,o.jsxs)("div",{className:"pmd-theme-organic-botanical pmd-customer-page page--menu",children:[(0,o.jsx)("style",{children:'.pmd-theme-organic-botanical{min-height:100vh;background:#f6efe2;color:#343529;padding:22px 16px 138px;font-family:Georgia,ui-serif,serif}.pmd-theme-organic-botanical *{box-sizing:border-box}.pmd-theme-organic-botanical .ob-shell{max-width:1060px;margin:0 auto}.pmd-theme-organic-botanical .ob-hero{border:1px solid #ded3bd;background:linear-gradient(135deg,#fffaf0,#edf4de);border-radius:34px;padding:28px;box-shadow:0 18px 50px rgba(75,63,38,.12);position:relative;overflow:hidden}.pmd-theme-organic-botanical .ob-hero:after{content:"";position:absolute;right:-60px;top:-60px;width:180px;height:180px;border-radius:999px;background:rgba(108,138,88,.18)}.pmd-theme-organic-botanical .ob-eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#8b7a54;font:700 .72rem ui-sans-serif,system-ui}.pmd-theme-organic-botanical h1{font-size:clamp(2.4rem,8vw,5.2rem);line-height:.92;margin:12px 0;color:#2f3b25}.pmd-theme-organic-botanical .ob-muted{color:#716f5e}.pmd-theme-organic-botanical .ob-search{margin-top:18px;display:flex;align-items:center;gap:10px;border:1px solid #ded3bd;background:rgba(255,255,255,.72);border-radius:999px;padding:12px 16px;max-width:520px}.pmd-theme-organic-botanical .ob-search input{all:unset;width:100%;font-family:ui-sans-serif,system-ui;color:#343529}.pmd-theme-organic-botanical .ob-cats{display:flex;gap:10px;overflow:auto;padding:18px 2px}.pmd-theme-organic-botanical button{border:0;cursor:pointer}.pmd-theme-organic-botanical .ob-cat{white-space:nowrap;border-radius:999px;padding:10px 16px;background:#fffaf0;color:#5e6245;border:1px solid #ded3bd}.pmd-theme-organic-botanical .ob-cat[data-active=true]{background:#6f8b55;color:white}.pmd-theme-organic-botanical .ob-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.pmd-theme-organic-botanical .ob-card{overflow:hidden;border-radius:30px;background:#fffaf0;border:1px solid #ded3bd;box-shadow:0 14px 34px rgba(75,63,38,.1)}.pmd-theme-organic-botanical .ob-img{height:168px;width:100%;background:#ebe2cd;position:relative}.pmd-theme-organic-botanical .ob-img img{object-fit:cover}.pmd-theme-organic-botanical .ob-body{padding:16px}.pmd-theme-organic-botanical .ob-body h3{font-size:1.2rem;margin:0 0 8px;color:#343529}.pmd-theme-organic-botanical .ob-body p{min-height:44px;margin:0 0 14px;color:#716f5e;font-family:ui-sans-serif,system-ui;font-size:.9rem}.pmd-theme-organic-botanical .ob-footer{display:flex;justify-content:space-between;align-items:center;gap:12px}.pmd-theme-organic-botanical .ob-price{font-weight:900;color:#3e4d2c;font-family:ui-sans-serif,system-ui}.pmd-theme-organic-botanical .ob-add{display:flex;align-items:center;gap:8px;border-radius:999px;background:#b88940;color:white;padding:10px 14px;font-weight:800}.pmd-theme-organic-botanical .ob-actions{position:fixed;left:50%;bottom:18px;z-index:40;transform:translateX(-50%);display:flex;gap:8px;max-width:min(940px,calc(100vw - 24px));overflow:auto;padding:10px;border-radius:999px;background:rgba(255,250,240,.92);border:1px solid #ded3bd;box-shadow:0 18px 50px rgba(75,63,38,.2);backdrop-filter:blur(16px)}.pmd-theme-organic-botanical .ob-actions button{white-space:nowrap;border-radius:999px;padding:10px 14px;background:#ede3cf;color:#343529;font-family:ui-sans-serif,system-ui;font-weight:800}.pmd-theme-organic-botanical .ob-actions .ob-checkout{background:#6f8b55;color:white}'}),(0,o.jsxs)("main",{className:"ob-shell",children:[(0,o.jsxs)("section",{className:"ob-hero",children:[(0,o.jsxs)("p",{className:"ob-eyebrow",children:["Organic Botanical · Table ",a||"Guest"]}),(0,o.jsx)("h1",{children:r}),(0,o.jsx)("p",{className:"ob-muted",children:"A paper-inspired garden menu powered by live PayMyDine data."}),(0,o.jsxs)("label",{className:"ob-search",children:[(0,o.jsx)(sS,{size:18}),(0,o.jsx)("input",{value:p,onChange:e=>u(e.target.value),placeholder:"Search the garden menu"})]})]}),(0,o.jsx)("nav",{className:"ob-cats","aria-label":"Menu categories",children:f.map(e=>(0,o.jsx)("button",{className:"ob-cat","data-active":e===d,onClick:()=>m(e),type:"button",children:e},e))}),(0,o.jsx)("section",{className:"ob-grid",children:y.map(e=>(0,o.jsxs)("article",{className:"ob-card",children:[(0,o.jsx)("button",{type:"button",className:"ob-img",onClick:()=>l(e),children:sD(e)?(0,o.jsx)(s_.OptimizedImage,{src:sD(e),alt:sB(e),fill:!0}):null}),(0,o.jsxs)("div",{className:"ob-body",children:[(0,o.jsx)("h3",{children:sB(e)}),(0,o.jsx)("p",{children:sR(e)||sO(e)}),(0,o.jsxs)("div",{className:"ob-footer",children:[(0,o.jsx)("span",{className:"ob-price",children:U(sL(e))}),(0,o.jsxs)("button",{type:"button",className:"ob-add",onClick:()=>s(e,1),children:[(0,o.jsx)(e7.Plus,{size:16})," Add"]})]})]})]},sP(e)))})]}),(0,o.jsx)(s8,{actions:i}),c]})}var s9=e.i(41990);function s7(e){let t=[{key:"waiter",label:"Waiter",icon:"🛎️",onClick:e.onCallWaiter},{key:"note",label:"Note",icon:"✎",onClick:e.onOpenNote},...e.showTableOrder?[{key:"table",label:"Table Order",icon:"☷",onClick:e.onOpenTableOrder,count:e.tableOrderCount}]:[],{key:"checkout",label:"Checkout",icon:"🧾",onClick:e.onOpenCheckout,count:e.cartCount,primary:!0}];return(0,o.jsx)("nav",{className:s9.default.dock,"data-theme":"organic","aria-label":"Menu actions",children:t.map(e=>(0,o.jsxs)("button",{type:"button",className:`${s9.default.button} ${e.primary?s9.default.primary:""}`,onClick:()=>void e.onClick(),children:[(0,o.jsx)("span",{className:s9.default.icon,"aria-hidden":"true",children:e.icon}),(0,o.jsx)("span",{children:e.label}),Number(e.count||0)>0&&(0,o.jsx)("span",{className:s9.default.badge,children:e.count})]},e.key))})}let le=(0,X.default)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);var lt=e.i(26145),lr=e.i(81500),la=e.i(9166),lo=e.i(74327),ln=e.i(7950),li=e.i(40785),ls=e.i(34659),ll=e.i(86822),lc=e.i(17929),ld=e.i(11432),lm=e.i(46279),lp=e.i(706),lu=e.i(16935),lh=e.i(55159),lf="Dialog",[ly,lg]=(0,la.createContextScope)(lf),[lb,lk]=ly(lf),lv=e=>{let{__scopeDialog:t,children:r,open:a,defaultOpen:i,onOpenChange:s,modal:l=!0}=e,c=n.useRef(null),d=n.useRef(null),[m=!1,p]=(0,ln.useControllableState)({prop:a,defaultProp:i,onChange:s});return(0,o.jsx)(lb,{scope:t,triggerRef:c,contentRef:d,contentId:(0,lo.useId)(),titleId:(0,lo.useId)(),descriptionId:(0,lo.useId)(),open:m,onOpenChange:p,onOpenToggle:n.useCallback(()=>p(e=>!e),[p]),modal:l,children:r})};lv.displayName=lf;var lx="DialogTrigger";n.forwardRef((e,t)=>{let{__scopeDialog:r,...a}=e,n=lk(lx,r),i=(0,lr.useComposedRefs)(t,n.triggerRef);return(0,o.jsx)(ld.Primitive.button,{type:"button","aria-haspopup":"dialog","aria-expanded":n.open,"aria-controls":n.contentId,"data-state":lM(n.open),...a,ref:i,onClick:(0,lt.composeEventHandlers)(e.onClick,n.onOpenToggle)})}).displayName=lx;var lz="DialogPortal",[lC,lw]=ly(lz,{forceMount:void 0}),lS=e=>{let{__scopeDialog:t,forceMount:r,children:a,container:i}=e,s=lk(lz,t);return(0,o.jsx)(lC,{scope:t,forceMount:r,children:n.Children.map(a,e=>(0,o.jsx)(lc.Presence,{present:r||s.open,children:(0,o.jsx)(ll.Portal,{asChild:!0,container:i,children:e})}))})};lS.displayName=lz;var l_="DialogOverlay",lE=n.forwardRef((e,t)=>{let r=lw(l_,e.__scopeDialog),{forceMount:a=r.forceMount,...n}=e,i=lk(l_,e.__scopeDialog);return i.modal?(0,o.jsx)(lc.Presence,{present:a||i.open,children:(0,o.jsx)(lN,{...n,ref:t})}):null});lE.displayName=l_;var lN=n.forwardRef((e,t)=>{let{__scopeDialog:r,...a}=e,n=lk(l_,r);return(0,o.jsx)(lp.RemoveScroll,{as:lh.Slot,allowPinchZoom:!0,shards:[n.contentRef],children:(0,o.jsx)(ld.Primitive.div,{"data-state":lM(n.open),...a,ref:t,style:{pointerEvents:"auto",...a.style}})})}),lI="DialogContent",lT=n.forwardRef((e,t)=>{let r=lw(lI,e.__scopeDialog),{forceMount:a=r.forceMount,...n}=e,i=lk(lI,e.__scopeDialog);return(0,o.jsx)(lc.Presence,{present:a||i.open,children:i.modal?(0,o.jsx)(lA,{...n,ref:t}):(0,o.jsx)(lj,{...n,ref:t})})});lT.displayName=lI;var lA=n.forwardRef((e,t)=>{let r=lk(lI,e.__scopeDialog),a=n.useRef(null),i=(0,lr.useComposedRefs)(t,r.contentRef,a);return n.useEffect(()=>{let e=a.current;if(e)return(0,lu.hideOthers)(e)},[]),(0,o.jsx)(lP,{...e,ref:i,trapFocus:r.open,disableOutsidePointerEvents:!0,onCloseAutoFocus:(0,lt.composeEventHandlers)(e.onCloseAutoFocus,e=>{e.preventDefault(),r.triggerRef.current?.focus()}),onPointerDownOutside:(0,lt.composeEventHandlers)(e.onPointerDownOutside,e=>{let t=e.detail.originalEvent,r=0===t.button&&!0===t.ctrlKey;(2===t.button||r)&&e.preventDefault()}),onFocusOutside:(0,lt.composeEventHandlers)(e.onFocusOutside,e=>e.preventDefault())})}),lj=n.forwardRef((e,t)=>{let r=lk(lI,e.__scopeDialog),a=n.useRef(!1),i=n.useRef(!1);return(0,o.jsx)(lP,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,onCloseAutoFocus:t=>{e.onCloseAutoFocus?.(t),t.defaultPrevented||(a.current||r.triggerRef.current?.focus(),t.preventDefault()),a.current=!1,i.current=!1},onInteractOutside:t=>{e.onInteractOutside?.(t),t.defaultPrevented||(a.current=!0,"pointerdown"===t.detail.originalEvent.type&&(i.current=!0));let o=t.target;r.triggerRef.current?.contains(o)&&t.preventDefault(),"focusin"===t.detail.originalEvent.type&&i.current&&t.preventDefault()}})}),lP=n.forwardRef((e,t)=>{let{__scopeDialog:r,trapFocus:a,onOpenAutoFocus:i,onCloseAutoFocus:s,...l}=e,c=lk(lI,r),d=n.useRef(null),m=(0,lr.useComposedRefs)(t,d);return(0,lm.useFocusGuards)(),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(ls.FocusScope,{asChild:!0,loop:!0,trapped:a,onMountAutoFocus:i,onUnmountAutoFocus:s,children:(0,o.jsx)(li.DismissableLayer,{role:"dialog",id:c.contentId,"aria-describedby":c.descriptionId,"aria-labelledby":c.titleId,"data-state":lM(c.open),...l,ref:m,onDismiss:()=>c.onOpenChange(!1)})}),(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(lq,{titleId:c.titleId}),(0,o.jsx)(lH,{contentRef:d,descriptionId:c.descriptionId})]})]})}),lB="DialogTitle",lR=n.forwardRef((e,t)=>{let{__scopeDialog:r,...a}=e,n=lk(lB,r);return(0,o.jsx)(ld.Primitive.h2,{id:n.titleId,...a,ref:t})});lR.displayName=lB;var lO="DialogDescription",lL=n.forwardRef((e,t)=>{let{__scopeDialog:r,...a}=e,n=lk(lO,r);return(0,o.jsx)(ld.Primitive.p,{id:n.descriptionId,...a,ref:t})});lL.displayName=lO;var lD="DialogClose",lU=n.forwardRef((e,t)=>{let{__scopeDialog:r,...a}=e,n=lk(lD,r);return(0,o.jsx)(ld.Primitive.button,{type:"button",...a,ref:t,onClick:(0,lt.composeEventHandlers)(e.onClick,()=>n.onOpenChange(!1))})});function lM(e){return e?"open":"closed"}lU.displayName=lD;var lF="DialogTitleWarning",[lV,lK]=(0,la.createContext)(lF,{contentName:lI,titleName:lB,docsSlug:"dialog"}),lq=({titleId:e})=>{let t=lK(lF),r=`\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;return n.useEffect(()=>{e&&(document.getElementById(e)||console.error(r))},[r,e]),null},lH=({contentRef:e,descriptionId:t})=>{let r=lK("DialogDescriptionWarning"),a=`Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${r.contentName}}.`;return n.useEffect(()=>{let r=e.current?.getAttribute("aria-describedby");t&&r&&(document.getElementById(t)||console.warn(a))},[a,e,t]),null},lG=e.i(57838),l$=e.i(87635);let lW=n.forwardRef(({className:e,...t},r)=>(0,o.jsx)(lE,{className:(0,eB.cn)("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",e),...t,ref:r}));lW.displayName=lE.displayName;let lY=(0,lG.cva)("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",{variants:{side:{top:"inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",bottom:"inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",left:"inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",right:"inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"}},defaultVariants:{side:"right"}}),lQ=n.forwardRef(({side:e="right",className:t,children:r,...a},n)=>(0,o.jsxs)(lS,{children:[(0,o.jsx)(lW,{}),(0,o.jsxs)(lT,{ref:n,className:(0,eB.cn)(lY({side:e}),t),...a,children:[r,(0,o.jsxs)(lU,{className:"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",children:[(0,o.jsx)(l$.X,{className:"h-4 w-4"}),(0,o.jsx)("span",{className:"sr-only",children:"Close"})]})]})]}));lQ.displayName=lT.displayName;let lX=({className:e,...t})=>(0,o.jsx)("div",{className:(0,eB.cn)("flex flex-col space-y-2 text-center sm:text-left",e),...t});lX.displayName="SheetHeader";let lZ=({className:e,...t})=>(0,o.jsx)("div",{className:(0,eB.cn)("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",e),...t});lZ.displayName="SheetFooter";let lJ=n.forwardRef(({className:e,...t},r)=>(0,o.jsx)(lR,{ref:r,className:(0,eB.cn)("text-lg font-semibold text-foreground",e),...t}));function l0(){let{toast:e}=(0,z.useToast)(),{t}=(0,f.useLanguageStore)();(0,C.useRouter)();let{items:r,isCartOpen:a,toggleCart:n,updateQuantity:s,removeFromCart:l}=(0,x.useCartStore)(),c=r.reduce((e,t)=>e+t.item.price*t.quantity,0);return(0,o.jsx)(o.Fragment,{children:(0,o.jsx)(lv,{open:a,onOpenChange:n,children:(0,o.jsxs)(lQ,{className:"w-full max-w-md flex flex-col surface p-0",children:[(0,o.jsx)(lX,{className:"p-4 pb-2 surface-sub divider",children:(0,o.jsx)(lJ,{className:"font-serif text-3xl",children:t("yourOrder")})}),(0,o.jsx)(eA.motion.div,{className:"flex-grow overflow-y-auto p-4 space-y-2",layout:!0,transition:{type:"spring",stiffness:300,damping:30},children:0===r.length?(0,o.jsxs)("div",{className:"text-center muted pt-8 space-y-2",children:[(0,o.jsx)("p",{className:"text-lg",children:t("cartEmpty")}),(0,o.jsx)("p",{className:"text-sm",children:t("addItemsFromMenu")})]}):(0,o.jsx)(e3,{mode:"popLayout",children:r.map(({item:e,quantity:r})=>{let a=t(e.nameKey)||e.name;return(0,o.jsxs)(eA.motion.div,{layout:!0,initial:{opacity:0,y:20},animate:{opacity:1,y:0},exit:{opacity:0,x:-50,transition:{duration:.2}},className:"flex items-center space-x-3 p-3 surface-sub rounded-2xl",children:[(0,o.jsx)("div",{className:"relative w-14 h-14 flex-shrink-0",children:(0,o.jsx)(s_.OptimizedImage,{src:(0,i.getMenuImageUrl)(e.image)||"/placeholder.svg",alt:a,fill:!0,className:"object-contain rounded-xl"})}),(0,o.jsxs)("div",{className:"flex-grow",children:[(0,o.jsx)("h4",{className:"font-semibold",children:a}),(0,o.jsx)("p",{className:"text-sm font-medium",style:{color:"var(--theme-secondary)"},children:U(e.price)}),(0,o.jsxs)("div",{className:"inline-flex items-center mt-1 surface-sub rounded-full p-1 gap-2 w-auto",children:[(0,o.jsx)(eP.Button,{size:"icon",variant:"ghost",className:"h-7 w-7 rounded-full icon-btn",onClick:()=>s(e.id,r-1),children:(0,o.jsx)(e9.Minus,{className:"h-3 w-3"})}),(0,o.jsx)("span",{className:"w-6 text-center font-semibold text-sm",children:r}),(0,o.jsx)(eP.Button,{size:"icon",variant:"ghost",className:"h-7 w-7 rounded-full icon-btn",onClick:()=>s(e.id,r+1),children:(0,o.jsx)(e7.Plus,{className:"h-3 w-3"})})]})]}),(0,o.jsx)(eP.Button,{size:"icon",variant:"ghost",className:"text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full h-7 w-7",onClick:()=>l(e),children:(0,o.jsx)(le,{className:"h-3 w-3"})})]},e.id)})})}),r.length>0&&(0,o.jsx)(lZ,{className:"p-4 surface-sub divider mt-auto",children:(0,o.jsxs)("div",{className:"w-full space-y-3",children:[(0,o.jsxs)("div",{className:"flex justify-between font-bold text-2xl",children:[(0,o.jsx)("span",{children:t("total")}),(0,o.jsx)("span",{children:U(c)})]}),(0,o.jsx)(eP.Button,{className:"w-full font-bold text-lg py-4 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl",style:{background:"var(--theme-button)",color:"var(--theme-background)"},onClick:()=>{0===r.length?e({title:t("cartEmpty"),description:t("addItemsFromMenu"),variant:"destructive"}):n()},children:t("proceedToPayment")})]})})]})})})}function l1(e){let{apiMenuItems:t,menuItems:r,menuData:a,allCategories:n,restaurantDisplayName:i,displayTableNumber:s,themeMenuActions:l,taxSettings:c,addToCart:d,handleFirstAdd:m,toast:p,handleItemSelect:u,selectedItem:h,setSelectedItem:f,shouldHideCartSheet:y,isPaymentModalOpen:g,setPaymentModalOpen:b,setPaymentModalPreferPersonalReview:k,items:v,tableInfo:x,activeExistingOrderId:z,activePendingSummary:C,activeSubmittedOrder:w,paymentModalInitialStep:S,paymentModalPreferPersonalReview:_,setToolbarPricingSnapshot:E,setSharedTableOrder:N,setLocalOpenOrder:I,setHasLocalOpenOrder:T}=e,A=sg({setSharedTableOrder:N,setLocalOpenOrder:I,setHasLocalOpenOrder:T});return(0,o.jsx)(V,{actions:l,children:(0,o.jsxs)("div",{className:"pmd-customer-page page--menu relative min-h-screen w-full bg-[#f6efe2]",children:[(0,o.jsx)(s6,{sourceItems:t.length?t:r.length?r:a,categories:n,restaurantName:i,tableNumber:s,actions:l,onAddItem:(e,t=1)=>{let r={...e};c.enabled&&c.percentage>0&&0===c.menuPrice&&(r.price=Number(r.price||0)/(1+c.percentage/100),r.options&&(r.options=r.options.map(e=>({...e,values:(e.values||[]).map(e=>({...e,price:Number(e.price||0)/(1+c.percentage/100)}))}))));for(let e=0;e<Math.max(1,Number(t||1));e+=1)d(r);m(e),p({title:"Added to order",description:String(e.name||"Item added")})},onOpenItem:e=>u(e)}),(0,o.jsx)("div",{"data-pmd-organic-real-toolbar":"1",style:{"--theme-surface":"#f5fff8af0","--theme-border":"#ded3bd","--theme-text-primary":"#343529","--theme-text-secondary":"#716f5e","--theme-primary":"#b88940","--theme-accent":"#b88940","--pmd-v2-page-bg":"#f5fff8af0"},children:(0,o.jsx)(s7,{...l})}),!y&&(0,o.jsx)(l0,{}),(0,o.jsx)(s5,{item:h||null,onClose:()=>f?.(null)}),(0,o.jsx)(sl,{isOpen:g,onClose:()=>{b(!1),k(!1)},items:v,tableInfo:x,existingOrderId:z,pendingSummary:C,initialSubmittedOrder:w,initialCheckoutStep:S,preferPersonalReview:_,checkoutVisualTheme:"organic_botanical_paper",onCartPricingUpdate:E,onOpenOrderUpdate:A})]})})}lJ.displayName=lR.displayName,n.forwardRef(({className:e,...t},r)=>(0,o.jsx)(lL,{ref:r,className:(0,eB.cn)("text-sm text-muted-foreground",e),...t})).displayName=lL.displayName;var l2=e.i(51723);function l5({categories:e,selectedCategory:t,onSelectCategory:r}){let{t:a}=(0,f.useLanguageStore)(),i=(0,n.useRef)(null),[s,l]=(0,n.useState)(!1),[c,d]=(0,n.useState)(!1),m=()=>{if(!i.current)return;let{scrollLeft:e,scrollWidth:t,clientWidth:r}=i.current;l(e>0),d(e<t-r-1)},p=()=>{m()};return(0,n.useEffect)(()=>{m();let e=i.current;if(e)return e.addEventListener("scroll",p),()=>e.removeEventListener("scroll",p)},[e]),(0,o.jsx)("div",{className:"relative w-full mb-8",children:(0,o.jsx)("div",{ref:i,className:(0,eB.cn)("w-full overflow-x-auto scroll-smooth pb-2 no-scrollbar",s&&"mask-gradient-left",c&&"mask-gradient-right"),style:{scrollbarWidth:"none",msOverflowStyle:"none"},children:(0,o.jsx)("div",{className:"flex space-x-3 px-4 min-w-max",children:e.map(e=>(0,o.jsxs)("button",{onClick:()=>r(e),className:(0,eB.cn)("relative whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 category-tab",t===e?"is-active":"text-gray-500 hover:text-theme"),children:[t===e&&(0,o.jsx)(eA.motion.div,{layoutId:"category-underline",className:"absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full",style:{backgroundColor:"var(--theme-category-active)"},transition:{type:"spring",stiffness:300,damping:30}}),(0,o.jsx)("span",{className:"relative z-10",children:e})]},e))})})})}var l3=e.i(61932);function l4(e){let t=[{key:"waiter",label:"Waiter",icon:"🛎️",onClick:e.onCallWaiter},{key:"note",label:"Note",icon:"✎",onClick:e.onOpenNote},...e.showTableOrder?[{key:"table",label:"Table Order",icon:"☷",onClick:e.onOpenTableOrder,count:e.tableOrderCount}]:[],{key:"checkout",label:"Checkout",icon:"🧾",onClick:e.onOpenCheckout,count:e.cartCount,primary:!0}];return(0,o.jsx)("nav",{className:l3.default.dock,"data-theme":"gold","aria-label":"Menu actions",children:t.map(e=>(0,o.jsxs)("button",{type:"button",className:`${l3.default.button} ${e.primary?l3.default.primary:""}`,onClick:()=>void e.onClick(),children:[(0,o.jsx)("span",{className:l3.default.icon,"aria-hidden":"true",children:e.icon}),(0,o.jsx)("span",{children:e.label}),Number(e.count||0)>0&&(0,o.jsx)("span",{className:l3.default.badge,children:e.count})]},e.key))})}var l8=e.i(82372);let l6=(0,X.default)("Trophy",[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",key:"17hqa7"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",key:"lmptdp"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",key:"1nw9bq"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",key:"1np0yb"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z",key:"u46fv3"}]]);function l9({item:e,onSelect:t,onFirstAdd:r,prioritizeImage:a=!1,highlightSettings:n=l}){let i=(0,x.useCartStore)(e=>e.addToCart),{items:s}=(0,x.useCartStore)(),{t:c}=(0,f.useLanguageStore)(),d=s.find(t=>t.item.id===e.id),m=d?.quantity||0,p=e.nameKey&&c(e.nameKey)?c(e.nameKey):e.name,u=e.descriptionKey&&c(e.descriptionKey)?c(e.descriptionKey):e.description,h=(0,eB.truncateText)(u||"",66);return(0,o.jsxs)("div",{className:"flex items-center space-x-4 group cursor-pointer",onClick:()=>t(e),children:[(0,o.jsxs)("div",{className:"relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0",children:["title_inline"!==n.badge_position&&"hidden"!==n.badge_position&&(0,o.jsx)("div",{className:`absolute top-1 z-10 ${"image_top_right"===n.badge_position?"right-1":"left-1"}`,children:(0,o.jsx)(l7,{item:e,compact:!0,settings:n,placement:"card"})}),(0,o.jsx)(s_.OptimizedImage,{src:e.image||(Array.isArray(e.images)?e.images[0]:"")||"/placeholder.svg",alt:p,fill:!0,priority:a,className:"object-contain transition-transform duration-700 ease-in-out group-hover:scale-110"})]}),(0,o.jsxs)("div",{className:"flex-grow",children:[(0,o.jsxs)("div",{className:"flex flex-wrap items-center gap-2",children:[(0,o.jsx)("h3",{dir:s0(p),className:`text-lg font-bold text-paydine-elegant-gray ${s1(p)}`,children:p}),"title_inline"===n.badge_position&&(0,o.jsx)(l7,{item:e,compact:!0,settings:n,placement:"card"})]}),(0,o.jsxs)("div",{className:"mt-1 flex flex-wrap items-center gap-1.5",children:[(0,o.jsx)(sH,{halal:e.halal,vegetarian:e.vegetarian,vegan:e.vegan,allergens:e.allergens,allergyTags:e.allergy_tags,compact:!0}),(0,o.jsx)(sQ,{color:e.color,label:`${p} color`}),(0,o.jsx)(sW,{calories:e.calories,protein:e.protein,carbs:e.carbs,fat:e.fat,sugar:e.sugar,servingSize:e.serving_size,compact:!0})]}),(0,o.jsx)("p",{dir:s0(h),className:`text-sm text-gray-500 mt-1 line-clamp-2 ${s1(h)}`,children:h}),(0,o.jsxs)("div",{className:"flex justify-between items-center mt-2",children:[(0,o.jsx)("p",{className:"text-lg font-semibold menu-item-price",children:U(e.price||0)}),(0,o.jsxs)("div",{className:"relative flex items-center gap-2",children:[m>0&&(0,o.jsx)("button",{type:"button",className:"quantity-btn pmd-v2-action-circle w-10 h-10 font-bold text-lg",onClick:t=>{t.stopPropagation(),i(d?.item||e,-1)},"aria-label":"Remove one item",children:(0,o.jsx)(e9.Minus,{className:"h-5 w-5",style:{color:"#FFFFFF",stroke:"#FFFFFF",WebkitTextFillColor:"#FFFFFF"}})}),(0,o.jsxs)("button",{className:"quantity-btn pmd-v2-action-circle w-12 h-12 font-bold text-lg",onClick:t=>{t.stopPropagation();let a=v(),o={...e};a.enabled&&a.percentage>0&&0===a.menuPrice&&(o.price=e.price/(1+a.percentage/100),o.options&&(o.options=o.options.map(e=>({...e,values:e.values.map(e=>({...e,price:e.price/(1+a.percentage/100)}))})))),i(o),0===m&&r()},"aria-label":"Add to cart","data-testid":"pmd-menu-add-to-cart",children:[m>0?(0,o.jsx)("span",{className:"text-lg font-bold",children:m}):(0,o.jsx)("span",{"data-pmd-menu-plus-text":"1","aria-hidden":"true",style:{color:"#FFFFFF",WebkitTextFillColor:"#FFFFFF",fontWeight:900,fontSize:"28px",lineHeight:1,display:"inline-flex",alignItems:"center",justifyContent:"center",transform:"translateY(-1px)"},children:"+"}),(0,o.jsx)("span",{className:"sr-only",children:"Add to cart"})]})]})]})]})]})}function l7({item:e,compact:t=!1,settings:r=l,placement:a="card"}){if("card"===a&&(!r.show_card_badges||"hidden"===r.badge_position)||"modal"===a&&!r.show_modal_badges)return null;let n=[];e.is_chef_recommended&&n.push({key:"chef",label:r.chef_label||"Chef’s Choice",icon:(0,o.jsx)(l8.ChefHat,{className:t?"h-3.5 w-3.5":"h-4 w-4","aria-hidden":"true"}),tone:"emerald"}),e.is_bestseller&&n.push({key:"best",label:r.bestseller_label||"Best Seller",icon:(0,o.jsx)(l6,{className:t?"h-3.5 w-3.5":"h-4 w-4","aria-hidden":"true"}),tone:"gold"});let i="show_all"===r.badge_display_mode?n:n.slice(0,1);if(!i.length)return null;let s="modal"===a?r.show_badge_text_in_modal:r.show_badge_text_on_cards,c="modal"===a?"soft_pill":r.badge_style,d="minimal_circle"===c,m="corner_ribbon"===c&&"card"===a;return(0,o.jsx)("div",{className:`pmd-menu-recommendation-badges flex flex-wrap items-center gap-1 ${m?"max-w-[112px]":""}`,"aria-label":"Menu item highlights",children:i.map(e=>{let t;return(0,o.jsxs)("span",{className:(t="gold"===e.tone?"border-[#C7A45A]/45 bg-[#F7E8BD] text-[#704A10]":"border-[#0F4D43]/35 bg-[#E6F2EF] text-[#0F4D43]",d?`inline-flex h-8 w-8 items-center justify-center rounded-full border ${t} shadow-sm`:m?`inline-flex items-center gap-1 border ${t} px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] shadow-sm`:"luxury_label"===c?`inline-flex items-center gap-1.5 rounded-md border ${t} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-sm`:`inline-flex items-center gap-1.5 rounded-full border ${t} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] shadow-sm`),"aria-label":e.label,title:e.label,children:[e.icon,s&&!d&&(0,o.jsx)("span",{children:e.label})]},e.key)})})}function ce({title:e,subtitle:t,items:r,settings:a,onSelect:n,onFirstAdd:i,organic:s=!1,onOrganicAdd:l}){return r.length?(0,o.jsxs)("section",{className:s?"organic-highlight-section relative mb-9 px-4":"mb-8 px-4","aria-label":e,children:[(0,o.jsx)("div",{className:s?"mb-4 text-center":"mb-3 flex items-end justify-between gap-3",children:(0,o.jsxs)("div",{children:[s&&(0,o.jsxs)("div",{className:"mx-auto mb-2 flex w-fit items-center gap-2 text-[var(--organic-accent)]","aria-hidden":"true",children:[(0,o.jsx)("span",{className:"h-px w-8 bg-current"}),(0,o.jsx)("span",{className:"text-lg",children:"☘"}),(0,o.jsx)("span",{className:"h-px w-8 bg-current"})]}),(0,o.jsx)("h2",{className:s?"font-serif text-3xl uppercase tracking-[0.16em] text-[var(--organic-text)]":"font-serif text-2xl font-bold text-paydine-elegant-gray",children:e}),(0,o.jsx)("p",{className:s?"mt-1 font-serif text-sm text-[var(--organic-muted)]":"text-sm text-gray-500",children:t})]})}),(0,o.jsx)("div",{className:s?"flex gap-4 overflow-x-auto rounded-[2.4rem] border border-[#E5D8BF]/70 bg-[#FFF9EF]/42 p-3 pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] md:grid md:grid-cols-2 md:overflow-visible":"flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible",children:r.map((t,r)=>(0,o.jsx)("div",{className:"min-w-[82vw] md:min-w-0",children:s?(0,o.jsx)(M,{item:t,onSelect:n,onAdd:e=>l?l(t,e):i(t),highlightSettings:a}):(0,o.jsx)(l9,{item:t,onSelect:n,onFirstAdd:()=>i(t),prioritizeImage:r<2,highlightSettings:a})},`highlight-${e}-${t.id}`))})]}):null}function ct(){return(0,o.jsx)("div",{className:"flex items-center justify-center min-h-screen",children:(0,o.jsx)("div",{className:"w-8 h-8 border-4 border-paydine-champagne border-t-transparent rounded-full animate-spin"})})}let cr=(0,X.default)("HandPlatter",[["path",{d:"M12 3V2",key:"ar7q03"}],["path",{d:"M5 10a7.1 7.1 0 0 1 14 0",key:"1t9y3n"}],["path",{d:"M4 10h16",key:"img6z1"}],["path",{d:"M2 14h12a2 2 0 1 1 0 4h-2",key:"loyjft"}],["path",{d:"m15.4 17.4 3.2-2.8a2 2 0 0 1 2.8 2.9l-3.6 3.3c-.7.8-1.7 1.2-2.8 1.2h-4c-1.1 0-2.1-.4-2.8-1.2L5 18",key:"1rixiy"}],["path",{d:"M5 14v7H2",key:"3mujks"}]]),ca=(0,X.default)("NotebookPen",[["path",{d:"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4",key:"re6nr2"}],["path",{d:"M2 6h4",key:"aawbzj"}],["path",{d:"M2 10h4",key:"l0bgd4"}],["path",{d:"M2 14h4",key:"1gsvsf"}],["path",{d:"M2 18h4",key:"1bu2t1"}],["path",{d:"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z",key:"pqwjuv"}]]),co=({isOpen:e,onOpenChange:t,tableId:r,tableName:a})=>{let{t:s}=(0,f.useLanguageStore)(),{toast:l}=(0,z.useToast)(),[c,d]=(0,n.useState)("confirming"),[m,p]=(0,n.useState)(!1),u=async()=>{try{await i.apiClient.callWaiter(String(r||"delivery"),"."),l({title:"Waiter Called",description:r?"We are on the way!":"We received your assistance request."})}catch(e){throw l({title:"Error",description:e?.message||"Failed to call waiter",variant:"destructive"}),e}d("confirmed"),p(!0),await new Promise(e=>setTimeout(e,800)),await new Promise(e=>setTimeout(e,2e3)),p(!1),await new Promise(e=>setTimeout(e,300)),t(!1),d("confirming")},h=async()=>{d("closing"),await new Promise(e=>setTimeout(e,300)),t(!1),d("confirming")};return(0,o.jsx)(e3,{initial:!1,children:e&&(0,o.jsx)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.3},className:"fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm",children:(0,o.jsx)(eA.motion.div,{initial:{scale:.95,opacity:0,y:20},animate:{scale:"closing"===c?.95:1,opacity:+("closing"!==c),y:20*("closing"===c)},exit:{scale:.95,opacity:0,y:20},transition:{type:"spring",stiffness:300,damping:25},className:"bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden",children:(0,o.jsx)(e3,{initial:!1,mode:"wait",children:m?(0,o.jsxs)(eA.motion.div,{initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.9},transition:{duration:.3},className:"p-8 text-center",children:[(0,o.jsx)("div",{className:"mx-auto w-16 h-16 bg-paydine-rose-beige/50 rounded-full flex items-center justify-center mb-4",children:(0,o.jsx)(tw.CheckCircle,{className:"w-8 h-8 text-paydine-elegant-gray"})}),(0,o.jsx)("h3",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-2",children:s("waiterComing")})]},"success"):(0,o.jsxs)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"p-8",children:[(0,o.jsxs)("div",{className:"text-center mb-6",children:[(0,o.jsx)("div",{className:"mx-auto w-16 h-16 bg-paydine-rose-beige/50 hover:bg-paydine-champagne rounded-full flex items-center justify-center mb-4 transition-all duration-300",children:(0,o.jsx)(cr,{className:"w-8 h-8 text-paydine-elegant-gray"})}),(0,o.jsx)("h3",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-2",children:s("callWaiter")}),(0,o.jsx)("p",{className:"text-paydine-elegant-gray/80",children:s("callWaiterConfirm")})]}),(0,o.jsxs)("div",{className:"flex gap-3 justify-center",children:[(0,o.jsx)(eA.motion.button,{whileHover:{scale:1.02},whileTap:{scale:.98},onClick:h,className:"flex-1 py-3 px-6 rounded-xl bg-gray-100 text-paydine-elegant-gray font-medium hover:bg-gray-200 transition-colors",children:s("no")}),(0,o.jsx)(eA.motion.button,{whileHover:{scale:1.02},whileTap:{scale:.98},onClick:u,className:"flex-1 py-3 px-6 rounded-xl bg-paydine-rose-beige/50 hover:bg-paydine-champagne text-paydine-elegant-gray font-medium transition-all duration-300",children:s("yes")})]})]},"confirm")})})})})},cn=({isOpen:e,onOpenChange:t,note:r,setNote:a,onSend:i,tableId:s,tableName:l})=>{let{t:c}=(0,f.useLanguageStore)(),[d,m]=(0,n.useState)("editing"),[p,u]=(0,n.useState)(!1),h=async()=>{r.trim()&&(m("confirmed"),u(!0),await new Promise(e=>setTimeout(e,800)),await new Promise(e=>setTimeout(e,2e3)),u(!1),await new Promise(e=>setTimeout(e,300)),i(),t(!1),m("editing"))},y=async()=>{m("closing"),await new Promise(e=>setTimeout(e,300)),t(!1),m("editing")};return(0,o.jsx)(e3,{initial:!1,children:e&&(0,o.jsx)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.3},className:"fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm",children:(0,o.jsx)(eA.motion.div,{initial:{scale:.95,opacity:0,y:20},animate:{scale:"closing"===d?.95:1,opacity:+("closing"!==d),y:20*("closing"===d)},exit:{scale:.95,opacity:0,y:20},transition:{type:"spring",stiffness:300,damping:25},className:"bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden",children:(0,o.jsx)(e3,{initial:!1,mode:"wait",children:p?(0,o.jsxs)(eA.motion.div,{initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.9},transition:{duration:.3},className:"p-8 text-center",children:[(0,o.jsx)("div",{className:"mx-auto w-16 h-16 bg-paydine-rose-beige/50 rounded-full flex items-center justify-center mb-4",children:(0,o.jsx)(tw.CheckCircle,{className:"w-8 h-8 text-paydine-elegant-gray"})}),(0,o.jsx)("h3",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-2",children:c("messageReceived")})]},"success"):(0,o.jsxs)(eA.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"p-8",children:[(0,o.jsxs)("div",{className:"text-center mb-6",children:[(0,o.jsx)("div",{className:"mx-auto w-16 h-16 bg-paydine-rose-beige/50 hover:bg-paydine-champagne rounded-full flex items-center justify-center mb-4 transition-all duration-300",children:(0,o.jsx)(ca,{className:"w-8 h-8 text-paydine-elegant-gray"})}),(0,o.jsx)("h3",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-2",children:c("leaveNoteTitle")}),(0,o.jsx)("p",{className:"text-paydine-elegant-gray/80",children:c("leaveNoteDesc")})]}),(0,o.jsx)(th.Textarea,{placeholder:c("notePlaceholder"),value:r,onChange:e=>a(e.target.value),className:"bg-white border-paydine-champagne/30 rounded-xl min-h-[100px] w-full mb-4"}),(0,o.jsxs)("div",{className:"flex gap-3 justify-center",children:[(0,o.jsx)(eA.motion.button,{whileHover:{scale:1.02},whileTap:{scale:.98},onClick:y,className:"flex-1 py-3 px-6 rounded-xl bg-gray-100 text-paydine-elegant-gray font-medium hover:bg-gray-200 transition-colors",children:c("cancel")}),(0,o.jsx)(eA.motion.button,{whileHover:{scale:1.02},whileTap:{scale:.98},onClick:h,className:"flex-1 py-3 px-6 rounded-xl bg-paydine-rose-beige/50 hover:bg-paydine-champagne text-paydine-elegant-gray font-medium transition-all duration-300",children:c("sendNote")})]})]},"edit")})})})})};var ci=e.i(16506);function cs(){return(0,o.jsx)("div",{className:"min-h-[55vh] flex items-center justify-center px-4",children:(0,o.jsxs)("div",{className:"w-full max-w-xl rounded-3xl border border-white/30 bg-white/35 backdrop-blur-xl shadow-2xl p-8 text-center",children:[(0,o.jsx)("h2",{className:"text-2xl font-semibold text-paydine-elegant-gray mb-3",children:"Welcome to PayMyDine"}),(0,o.jsx)("p",{className:"text-sm md:text-base text-gray-700 mb-6",children:"Your restaurant frontend is ready. Set up your menu, categories, images, and restaurant details from the admin panel."}),(0,o.jsx)(ci.default,{href:"/admin",className:"inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold transition-opacity hover:opacity-90",style:{background:"var(--theme-button)",color:"var(--theme-background)"},children:"Set up your restaurant"})]})})}function cl(e){let{themeMenuActions:t,displayTableNumber:r,showVirtualHighlightSections:a,menuHighlightSettings:i,chefRecommendationItems:s,bestsellerItems:l,handleItemSelect:c,handleFirstAdd:d,allCategories:m,selectedCategory:p,setSelectedCategory:u,isFrontendConfigured:h,filteredItems:f,selectedItem:y,setSelectedItem:g,shouldHideCartSheet:b,isPaymentModalOpen:k,setPaymentModalOpen:v,setPaymentModalPreferPersonalReview:x,items:z,tableInfo:C,activeExistingOrderId:w,activePendingSummary:S,activeSubmittedOrder:_,paymentModalInitialStep:E,paymentModalPreferPersonalReview:N,setToolbarPricingSnapshot:I,setSharedTableOrder:T,setLocalOpenOrder:A,setHasLocalOpenOrder:j,isWaiterConfirmOpen:P,setWaiterConfirmOpen:B,tableIdString:R,tableName:O,isNoteModalOpen:L,setNoteModalOpen:D,note:U,setNote:M,handleSendNote:F}=e,K=sg({setSharedTableOrder:T,setLocalOpenOrder:A,setHasLocalOpenOrder:j});return(0,o.jsx)(V,{actions:t,children:(0,o.jsxs)("div",{className:"relative min-h-screen w-full bg-theme-background pb-32",children:[(0,o.jsx)("header",{className:"py-8",children:(0,o.jsx)("div",{className:"max-w-4xl mx-auto px-4",children:(0,o.jsx)(l2.Logo,{tableNumber:r})})}),(0,o.jsx)(n.Suspense,{fallback:(0,o.jsx)(ct,{}),children:(0,o.jsxs)("main",{className:"max-w-4xl mx-auto",children:[a&&"top"===i.section_placement&&(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(ce,{title:"Chef’s Recommendations",subtitle:"Hand-picked favorites from the kitchen.",items:s,settings:i,onSelect:c,onFirstAdd:d}),(0,o.jsx)(ce,{title:"Best Sellers",subtitle:"Popular picks from recent orders.",items:l,settings:i,onSelect:c,onFirstAdd:d})]}),(0,o.jsx)(l5,{categories:m,selectedCategory:p||"All",onSelectCategory:e=>{u(e||"All")}}),a&&"after_categories"===i.section_placement&&(0,o.jsxs)(o.Fragment,{children:[(0,o.jsx)(ce,{title:"Chef’s Recommendations",subtitle:"Hand-picked favorites from the kitchen.",items:s,settings:i,onSelect:c,onFirstAdd:d}),(0,o.jsx)(ce,{title:"Best Sellers",subtitle:"Popular picks from recent orders.",items:l,settings:i,onSelect:c,onFirstAdd:d})]}),(0,o.jsx)("section",{className:"w-full mb-12",children:h||0!==f.length?(0,o.jsx)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8 px-4",children:f.map((e,t)=>(0,o.jsx)(l9,{item:e,onSelect:c,onFirstAdd:()=>d(e),prioritizeImage:t<4,highlightSettings:i},e.id))}):(0,o.jsx)(cs,{})})]})}),(0,o.jsx)(l4,{...t}),!b&&(0,o.jsx)(l0,{}),(0,o.jsx)(s5,{item:y,onClose:()=>g(null),highlightSettings:i}),(0,o.jsx)(sl,{isOpen:k,onClose:()=>{v(!1),x(!1)},items:z,tableInfo:C,existingOrderId:w,pendingSummary:S,initialSubmittedOrder:_,initialCheckoutStep:E,preferPersonalReview:N,checkoutVisualTheme:"gold-luxury",onCartPricingUpdate:I,onOpenOrderUpdate:K}),(0,o.jsx)(co,{isOpen:P,onOpenChange:B,tableId:R,tableName:O}),(0,o.jsx)(cn,{isOpen:L,onOpenChange:D,note:U,setNote:M,onSend:F,tableId:R,tableName:O})]})})}let cc="/assets/media/uploads/PMDD.png?v=1780008763";function cd({visible:e}){return e?(0,o.jsxs)("div",{className:"pmd-menu-theme-footer-logo","data-pmd-menu-footer-logo":"1","aria-label":"PayMyDine",children:[(0,o.jsxs)("picture",{children:[(0,o.jsx)("source",{srcSet:cc,media:"(prefers-color-scheme: dark)"}),(0,o.jsx)("img",{src:"/assets/media/uploads/PMD.png?v=1780008763",alt:"PayMyDine",loading:"lazy",decoding:"async"})]}),(0,o.jsx)("img",{src:cc,alt:"","aria-hidden":"true",loading:"lazy",decoding:"async",className:"pmd-menu-theme-footer-logo-dark"})]}):null}function cm(e){let{isKazenJapaneseTheme:t,isModernGreenTheme:r,isOrganicBotanicalTheme:a,shouldShowPayMyDineFooterLogo:n,apiMenuItems:i,menuItems:s,menuData:l,allCategories:c,tableInfo:d,displayTableNumber:m,tableIdString:p,cmsSettings:u,merchantSettings:h,taxSettings:f,items:y,totalItems:g,totalPrice:b,lastInteractedItem:k,restaurantDisplayName:v,themeMenuActions:x,addToCart:z,handleFirstAdd:C,toast:w,apiClient:S,handleItemSelect:_,handleCartClick:E,shouldShowTableOrderAction:N,setPaymentModalInitialStep:I,sharedTableOrder:T,setPaymentModalPreferPersonalReview:A,setPaymentModalOpen:j,tableOrderActionCount:P,isPaymentModalOpen:B,activeExistingOrderId:R,activePendingSummary:O,activeSubmittedOrder:L,paymentModalInitialStep:D,paymentModalPreferPersonalReview:U,setToolbarPricingSnapshot:M,setSharedTableOrder:F,setLocalOpenOrder:V,setHasLocalOpenOrder:K,setNoteModalOpen:q,showVirtualHighlightSections:H,menuHighlightSettings:G,chefRecommendationItems:$,bestsellerItems:W,selectedCategory:Y,setSelectedCategory:Q,isFrontendConfigured:X,filteredItems:Z,selectedItem:J,setSelectedItem:ee,shouldHideCartSheet:et,isWaiterConfirmOpen:er,setWaiterConfirmOpen:ea,tableName:eo,isNoteModalOpen:en,note:ei,setNote:es,handleSendNote:el}=e,ec=e=>(0,o.jsxs)(o.Fragment,{children:[e,(0,o.jsx)(cd,{visible:n})]}),ed=String(e?.cmsSettings?.theme_configuration||e?.cmsSettings?.theme_id||e?.cmsSettings?.frontend_theme||e?.merchantSettings?.theme_configuration||e?.merchantSettings?.theme_id||e?.merchantSettings?.frontend_theme||"").trim().toLowerCase().replace(/[\s-]+/g,"_");if(e?.isVelvetTerracottaTheme||"velvet_terracotta"===ed)return ec((0,o.jsx)(sw,{...e}));let em=(()=>{try{return JSON.stringify(e||{}).toLowerCase()}catch{return""}})();return ec(String(e?.selectedFrontendTheme??e?.frontendTheme??e?.themeId??e?.theme?.id??e?.theme?.canonicalId??e?.theme?.theme_id??e?.settings?.frontend_theme??e?.settings?.theme_configuration??e?.settings?.data?.frontend_theme??e?.settings?.data?.theme_configuration??"").toLowerCase().replace(/[\s-]+/g,"_").includes("velvet")||em.includes("velvet_terracotta")||em.includes("velvet-terracotta")?(0,o.jsx)(sw,{...e}):t?(0,o.jsx)(sx,{apiMenuItems:i,menuItems:s,menuData:l,allCategories:c,tableInfo:d,displayTableNumber:m,tableIdString:p,cmsSettings:u,merchantSettings:h,taxSettings:f,items:y,totalItems:g,totalPrice:b,lastInteractedItem:k,restaurantDisplayName:v,themeMenuActions:x,addToCart:z,handleFirstAdd:C,toast:w,apiClient:S,handleItemSelect:_,selectedItem:J,setSelectedItem:ee,handleCartClick:E,shouldShowTableOrderAction:N,setPaymentModalInitialStep:I,sharedTableOrder:T,setPaymentModalPreferPersonalReview:A,setPaymentModalOpen:j,tableOrderActionCount:P,isPaymentModalOpen:B,activeExistingOrderId:R,activePendingSummary:O,activeSubmittedOrder:L,paymentModalInitialStep:D,paymentModalPreferPersonalReview:U,setToolbarPricingSnapshot:M,setSharedTableOrder:F,setLocalOpenOrder:V,setHasLocalOpenOrder:K,normalizeModernGreenLogoUrl:sy,setNoteModalOpen:q}):r?(0,o.jsx)(s4,{apiMenuItems:i,menuItems:s,menuData:l,allCategories:c,tableInfo:d,displayTableNumber:m,tableIdString:p,cmsSettings:u,merchantSettings:h,taxSettings:f,items:y,totalItems:g,totalPrice:b,lastInteractedItem:k,restaurantDisplayName:v,themeMenuActions:x,addToCart:z,handleFirstAdd:C,toast:w,apiClient:S,handleItemSelect:_,selectedItem:J,setSelectedItem:ee,handleCartClick:E,shouldShowTableOrderAction:N,setPaymentModalInitialStep:I,sharedTableOrder:T,setPaymentModalPreferPersonalReview:A,setPaymentModalOpen:j,tableOrderActionCount:P,isPaymentModalOpen:B,activeExistingOrderId:R,activePendingSummary:O,activeSubmittedOrder:L,paymentModalInitialStep:D,paymentModalPreferPersonalReview:U,setToolbarPricingSnapshot:M,setSharedTableOrder:F,setLocalOpenOrder:V,setHasLocalOpenOrder:K,normalizeModernGreenLogoUrl:sy}):a?(0,o.jsx)(l1,{apiMenuItems:i,menuItems:s,menuData:l,allCategories:c,restaurantDisplayName:v,displayTableNumber:m,themeMenuActions:x,taxSettings:f,addToCart:z,handleFirstAdd:C,toast:w,handleItemSelect:_,selectedItem:J,setSelectedItem:ee,shouldHideCartSheet:et,isPaymentModalOpen:B,setPaymentModalOpen:j,setPaymentModalPreferPersonalReview:A,items:y,tableInfo:d,activeExistingOrderId:R,activePendingSummary:O,activeSubmittedOrder:L,paymentModalInitialStep:D,paymentModalPreferPersonalReview:U,setToolbarPricingSnapshot:M,setSharedTableOrder:F,setLocalOpenOrder:V,setHasLocalOpenOrder:K}):(0,o.jsx)(cl,{themeMenuActions:x,displayTableNumber:m,showVirtualHighlightSections:H,menuHighlightSettings:G,chefRecommendationItems:$,bestsellerItems:W,handleItemSelect:_,handleFirstAdd:C,allCategories:c,selectedCategory:Y,setSelectedCategory:Q,isFrontendConfigured:X,filteredItems:Z,selectedItem:J,setSelectedItem:ee,shouldHideCartSheet:et,isPaymentModalOpen:B,setPaymentModalOpen:j,setPaymentModalPreferPersonalReview:A,items:y,tableInfo:d,activeExistingOrderId:R,activePendingSummary:O,activeSubmittedOrder:L,paymentModalInitialStep:D,paymentModalPreferPersonalReview:U,setToolbarPricingSnapshot:M,setSharedTableOrder:F,setLocalOpenOrder:V,setHasLocalOpenOrder:K,isWaiterConfirmOpen:er,setWaiterConfirmOpen:ea,tableIdString:p,tableName:eo,isNoteModalOpen:en,setNoteModalOpen:q,note:ei,setNote:es,handleSendNote:el}))}function cp(e){let t=String(e||"").trim();return t&&"undefined"!==t&&"null"!==t&&/^[A-Za-z0-9_-]{1,64}$/.test(t)?t:null}function cu(){let e=(0,C.useSearchParams)(),[t,r]=(0,n.useState)(!1),[a,s]=(0,n.useState)(0),[c,d]=(0,n.useState)("All"),[m,b]=(0,n.useState)(null),[v,w]=(0,n.useState)(null),[S,_]=(0,n.useState)(!0),[E,I]=(0,n.useState)(!0),[T,A]=(0,n.useState)([]),[R,O]=(0,n.useState)(l),[U,M]=(0,n.useState)([]),{menuItems:F,settings:V}=(0,y.useCmsConfigStore)(),{taxSettings:K,loadVATSettings:q}=k(),{merchantSettings:H}=(0,g.usePaymentSettingsStore)(),{items:G,toggleCart:$,addToCart:W,setTableInfo:Y,clearTableContext:Q,clearCart:X}=(0,x.useCartStore)(),{isPaymentModalOpen:Z,setPaymentModalOpen:J,paymentModalInitialStep:ee,setPaymentModalInitialStep:et,paymentModalPreferPersonalReview:er,setPaymentModalPreferPersonalReview:ea,setToolbarPricingSnapshot:eo,totalItems:en,totalPrice:ei}=function({items:e,taxSettings:t}){let r,a,o,i=function(){let[e,t]=(0,n.useState)(!1),[r,a]=(0,n.useState)("review"),[o,i]=(0,n.useState)(!1);return(0,n.useEffect)(()=>{if("u"<typeof document)return;let e=e=>{let t=e.target,r=t?.closest?.("button");if(!r)return;let o=(r.textContent||"").replace(/\s+/g," ").trim().toLowerCase(),n=(r.getAttribute("aria-label")||"").toLowerCase(),s=n.includes("table order")||o.includes("table order");!s&&(n.includes("checkout")||o.includes("checkout"))&&(i(!0),a("review")),s&&(i(!1),a("review"))};return document.addEventListener("click",e,!0),()=>document.removeEventListener("click",e,!0)},[]),{isPaymentModalOpen:e,setPaymentModalOpen:t,paymentModalInitialStep:r,setPaymentModalInitialStep:a,paymentModalPreferPersonalReview:o,setPaymentModalPreferPersonalReview:i}}(),[s,l]=(0,n.useState)(null),c=(r=e.reduce((e,t)=>e+Number(t.quantity||0),0),a=e.reduce((e,t)=>e+Number(t.item.price||0)*Number(t.quantity||0),0),o=t.enabled&&Number(t.percentage||0)>0&&1===t.menuPrice?a*(Number(t.percentage||0)/100):0,{totalItems:r,subtotal:a,tax:o,total:a+o}),d=c.totalItems,m=c.subtotal,p=c.tax,u=s?.total??m+p;return(0,n.useEffect)(()=>{0===e.length&&s&&l(null)},[e.length,s]),{...i,toolbarPricingSnapshot:s,setToolbarPricingSnapshot:l,totalItems:d,totalPrice:u}}({items:G,taxSettings:K}),{themeId:es,isResolved:el}=function(){let[e,t]=(0,n.useState)({themeId:null,isResolved:!1});return(0,n.useEffect)(()=>{if("u"<typeof document)return;let e=()=>{let e=document.documentElement.getAttribute("data-theme"),r=e?(0,D.normalizeThemeId)(e):null;t({themeId:r,isResolved:"1"===document.documentElement.getAttribute("data-pmd-theme-resolved")||"organic_botanical_paper"===r})};e();let r=new MutationObserver(e);return r.observe(document.documentElement,{attributes:!0,attributeFilter:["data-theme","data-pmd-theme-resolved"]}),()=>r.disconnect()},[]),e}(),[ec,ed]=(0,n.useState)(!1),{isOrganicBotanicalTheme:em,isModernGreenTheme:ep,isKazenJapaneseTheme:eu,isVelvetTerracottaTheme:eh}=(0,n.useMemo)(()=>{let e=(0,D.normalizeThemeId)(es);return{isOrganicBotanicalTheme:"organic_botanical_paper"===e,isModernGreenTheme:"modern_green"===e||ec,isKazenJapaneseTheme:"kazen_japanese"===e,isVelvetTerracottaTheme:"velvet_terracotta"===e}},[es,ec]),ef=!el&&!ec,{t:ey,language:eg}=(0,f.useLanguageStore)(),{toast:eb}=(0,z.useToast)(),[ek,ev]=(0,n.useState)(!1),[ex,ez]=(0,n.useState)(!1),[eC,ew]=(0,n.useState)(""),[eS,e_]=(0,n.useState)(null),[eE,eN]=(0,n.useState)(null),[eI,eT]=(0,n.useState)(null),[eA,ej]=(0,n.useState)(!1),[eP,eB]=(0,n.useState)(null),{sharedTableOrderQr:eR,sharedTableOrderContext:eO,tableIdString:eL,tableName:eD,displayTableNumber:eU}=function({searchParams:e,tableInfo:t,setTableInfoState:r}){let a=e?.get("qr")||null,o=e?.get("table_no")??null,i=e?.get("table_id")??null,s=!o&&!i,l=e?.get("qr")??null;(0,n.useEffect)(()=>{s&&r(null)},[s,r]),t?.table_no;let c=String(t?.table_id??i??null??"").trim(),d=t?.table_name??void 0,m=t?.table_no??o??t?.table_id??i??null,p=(0,n.useMemo)(()=>j(t,a),[t?.table_id,t?.table_no,t?.qr_code,a]);return{sharedTableOrderQr:a,sharedTableOrderContext:p,spQr:l,tableIdString:c,tableName:d,displayTableNumber:m,isRootDeliveryMode:s}}({searchParams:e,tableInfo:eS,setTableInfoState:e_}),eM=n.default.useMemo(()=>{let e=String(eL||eU||eS?.table_id||eS?.table_no||"delivery").trim()||"delivery";return`pmd-note-draft:${e}`},[eL,eU,eS?.table_id,eS?.table_no]);(0,n.useEffect)(()=>{try{let e=localStorage.getItem(eM);e&&!eC&&ew(e)}catch{}},[eM]),(0,n.useEffect)(()=>{try{let e=String(eC||"");e.trim()?localStorage.setItem(eM,e):localStorage.removeItem(eM)}catch{}},[eC,eM]);let{tableDraft:eF,setTableDraft:eV}=function({context:e,enabled:t=!0,pollIntervalMs:r=0,refreshOnFocus:a=!1,keepEmptyDrafts:o=!1}){let[s,l]=(0,n.useState)(null),[c,d]=(0,n.useState)(!1),[m,p]=(0,n.useState)(null),u=(0,n.useCallback)(async()=>{if(!t||!P(e))return l(null),null;d(!0),p(null);try{let t=await i.apiClient.getTableOrderDraft(e);return o||B(t)?l(t):l(null),t}catch(e){return p(e instanceof Error?e.message:"Failed to fetch table order draft"),null}finally{d(!1)}},[e,t,o]),h=(0,n.useCallback)(()=>{l(null),p(null),d(!1)},[]);return(0,n.useEffect)(()=>{if(!t||!P(e))return void h();let o=!1,n=async()=>{o||await u()};n();let i=r>0?window.setInterval(n,r):null,s=()=>{n()};return a&&window.addEventListener("focus",s),()=>{o=!0,i&&window.clearInterval(i),a&&window.removeEventListener("focus",s)}},[e,t,r,u,a,h]),{tableDraft:s,isDraftLoading:c,draftError:m,refreshDraft:u,resetDraft:h,setTableDraft:l}}({context:eO,enabled:!!(eS?.table_id||eS?.table_no),pollIntervalMs:12e3}),eK=(0,n.useRef)(null),{hasDraftTableOrderWithoutRealOrder:eq,activeExistingOrderId:eH,activePendingSummary:eG,activeSubmittedOrder:e$,shouldHideCartSheet:eW,shouldShowTableOrderAction:eY,tableOrderActionCount:eQ}=function({sharedTableOrder:e,tableInfo:t,existingOrderId:r,setExistingOrderId:a,pendingSettlementSummary:o,setPendingSettlementSummary:i,localOpenOrder:s,setLocalOpenOrder:l,hasLocalOpenOrder:c,setHasLocalOpenOrder:d,paymentModalInitialStep:m,items:p}){let u=s?.paymentStatus==="paid"||s?.status==="paid",h=!!(B(e)&&e?.draft_id&&!e?.order_id&&!e?.orderId),f=h||u&&"review"===m?null:r,y=h||u&&"review"===m&&p.length>0?null:s;(0,n.useEffect)(()=>{if(B(e)){if(e?.draft_id&&!e?.order_id&&!e?.orderId){a(null),i(null),l(null),d(!1);return}e.order_id&&(a(Number(e.order_id)),i({orderTotal:Number(e.totals?.orderTotal||e.totals?.total||0),settledAmount:Number(e.totals?.settledAmount||0),remainingAmount:Number(e.totals?.remainingAmount||e.totals?.total||0)}),l(r=>{let a=L(e,t,0);return r&&String(r?.orderId||"")===String(e.order_id||"")?{...r,...a}:a}),d(!0))}},[e,t?.table_id,t?.table_no]),(0,n.useEffect)(()=>{if(r)try{let e=x.useCartStore.getState();e?.isCartOpen===!0&&x.useCartStore.setState({isCartOpen:!1})}catch(e){console.error("[PMD] close side cart for pending QR failed",e)}},[r]);let g=String(s?.status||"").toLowerCase(),b=String(s?.paymentStatus||s?.payment_status||"").toLowerCase(),k=Number(s?.remainingAmount??s?.remaining_amount??s?.totals?.remainingAmount??NaN),v=Number(s?.orderTotal??s?.total??s?.subtotal??0),z=!!(c&&s&&!["paid","completed","complete","delivered","cancelled","canceled"].includes(g)&&!["paid","settled"].includes(b)&&(Number.isFinite(k)&&k>0||!Number.isFinite(k)&&v>0));return{hasDraftTableOrderWithoutRealOrder:h,activeExistingOrderId:f,activePendingSummary:h||u&&"review"===m?null:o,activeSubmittedOrder:y,shouldHideCartSheet:!!f,shouldShowTableOrderAction:B(e)||z,tableOrderActionCount:Number(Number(e?.items?.filter(e=>!N(e)).reduce((e,t)=>e+Number(t?.quantity||1),0)||0)||(z?s?.submittedItems?.reduce?.((e,t)=>e+Number(t?.quantity||1),0):0)||0)}}({sharedTableOrder:eF,tableInfo:eS,existingOrderId:eE,setExistingOrderId:eN,pendingSettlementSummary:eI,setPendingSettlementSummary:eT,localOpenOrder:eP,setLocalOpenOrder:eB,hasLocalOpenOrder:eA,setHasLocalOpenOrder:ej,paymentModalInitialStep:ee,items:G}),eX=function({isModernGreenTheme:e,isOrganicBotanicalTheme:t}){return e||t}({isModernGreenTheme:ep,isOrganicBotanicalTheme:em}),eZ=sb(V,H,eS);n.default.useEffect(()=>{let e=!1;return async function(){try{let t=await fetch(`/simple-theme?forceModernGreen=${Date.now()}`,{headers:{Accept:"application/json"},cache:"no-store"}),r=await t.json(),a=iF(r),o=a?.data?.theme_id||a?.theme_id||a?.frontend_theme||a?.admin_theme||"",n=(0,D.normalizeThemeId)(String(o||""));e||ed("modern_green"===n)}catch{e||ed(!1)}}(),()=>{e=!0}},[ed]),function({searchParams:e,apiMenuItems:t,selectedCategory:r,setSelectedCategory:a,setIsLoading:o,setIsFrontendConfigured:s,setApiMenuItems:c,setMenuHighlightSettings:d,setDynamicCategories:m,setTableInfoState:f,setTableInfo:y,clearCart:g,setPaymentModalOpen:b,setExistingOrderId:k,setPendingSettlementSummary:v,setLocalOpenOrder:z,setHasLocalOpenOrder:C,hydratedPendingOrderRef:w,existingOrderId:S,loadVATSettings:_}){(0,n.useEffect)(()=>{a("All")},[a]),(0,n.useEffect)(()=>{t.length>0&&a("All")},[t.length,a]),(0,n.useEffect)(()=>{_()},[_]),(0,n.useEffect)(()=>{!async function(){try{o(!0),console.log("Loading menu data...");let t=`pmd-menu-cache:${window.location.host}:${window.location.pathname}?${window.location.search}`;if(t)try{let e=localStorage.getItem(t);if(e){let t=JSON.parse(e);t?.timestamp&&Date.now()-Number(t.timestamp)<3e5?(c(Array.isArray(t.items)?t.items:[]),m(Array.isArray(t.categories)?t.categories:[]),t.menuHighlightSettings&&d({...l,...t.menuHighlightSettings}),console.info("PMD_MENU_CACHE_HIT")):console.info("PMD_MENU_CACHE_MISS")}else console.info("PMD_MENU_CACHE_MISS")}catch{console.info("PMD_MENU_CACHE_MISS")}let r=cp(e.get("table_id")),a=cp(e.get("table_no")),n=cp(e.get("table")),u=e.get("qr"),h=e.get("table_no")||e.get("table_id")||e.get("table"),_=a||r||n;if(h&&!_&&console.warn("[PMD] Ignoring malformed table parameter",{rawTableParam:h}),_)try{let e=await i.apiClient.getTableInfo(_,u||void 0,!!a);if(e.success){let t={table_id:String(e.data.table_id??_),table_name:String(e.data.table_name??""),location_id:Number(e.data.location_id??1),qr_code:e.data.qr_code??null,table_no:null!=e.data.table_no?Number(e.data.table_no):void 0};f(t),y(t);let r=await i.apiClient.getPendingQrOrderByTable(String(e.data.table_id),{tableNo:e.data?.table_no??a??null,qr:u||null});if(r?.success&&r.data?.order_id){let t=Number(r.data.order_id);if(k(t),v({orderTotal:Number(r.data.order_total||0),settledAmount:Number(r.data.settled_amount||0),remainingAmount:Number(r.data.remaining_amount||0)}),z({orderId:t,status:"submitted_unpaid",paymentStatus:"unpaid",tableNumber:e.data?.table_no??a??null,total:Number(r.data.order_total||0),orderTotal:Number(r.data.order_total||0),settledAmount:Number(r.data.settled_amount||0),remainingAmount:Number(r.data.remaining_amount||0),submittedItems:r.data.items||[],payment:"qr_pay_later"}),C(!0),w.current!==t){w.current=t;try{let e=x.useCartStore.getState();e?.isCartOpen===!0&&x.useCartStore.setState({isCartOpen:!1})}catch(e){console.error("[PMD] close drawer after table order sync failed",e)}}}else{let t=null!==w.current||null!==S;if(k(null),v(null),w.current=null,t){console.info("[PMD QR fallback] No pending QR order, restoring normal menu flow",{table_id:e?.data?.table_id??null,table_no:e?.data?.table_no??null}),g();try{let e=x.useCartStore.getState();e?.isCartOpen===!0&&x.useCartStore.setState({isCartOpen:!1})}catch(e){console.error("[PMD QR fallback] close drawer failed",e)}b(!1)}}}}catch(e){console.error("Failed to fetch table info:",e)}let E=await p();c(E.menuItems),m(E.categoryNames),s(E.isFrontendConfigured??!0),d(E.menuHighlightSettings||l),t&&(localStorage.setItem(t,JSON.stringify({categories:E.categoryNames,items:E.menuItems,timestamp:Date.now(),menuHighlightSettings:E.menuHighlightSettings,menuCacheVersion:E.menuCacheVersion})),console.info("PMD_MENU_CACHE_REFRESHED"))}catch(e){console.error("Failed to load menu data:",e),c(h),m(u),a("All")}finally{o(!1)}}()},[e,y,g,b])}({searchParams:e,apiMenuItems:T,selectedCategory:c,setSelectedCategory:d,setIsLoading:_,setIsFrontendConfigured:I,setApiMenuItems:A,setMenuHighlightSettings:O,setDynamicCategories:M,setTableInfoState:e_,setTableInfo:Y,clearCart:X,setPaymentModalOpen:J,setExistingOrderId:eN,setPendingSettlementSummary:eT,setLocalOpenOrder:eB,setHasLocalOpenOrder:ej,hydratedPendingOrderRef:eK,existingOrderId:eE,loadVATSettings:q});let{allCategories:eJ,filteredItems:e0,highlightSourceItems:e1,chefRecommendationItems:e2,bestsellerItems:e5,showVirtualHighlightSections:e3}=function(e){let{apiMenuItems:t,taxSettings:r,menuData:a,menuItems:o,dynamicCategories:i,selectedCategory:s,menuHighlightSettings:l}=e,c=(0,n.useMemo)(()=>["All",...i],[i]),d=e=>r.enabled&&Number(r.percentage||0)>0&&0===Number(r.menuPrice||0)?e*(1+Number(r.percentage||0)/100):e,m=(0,n.useMemo)(()=>{let e=(t.length?t:o.length?o:a).map(e=>({...e,price:d(e.price),options:e.options?.map(e=>({...e,values:e.values.map(e=>({...e,price:d(e.price)}))}))})),r=s||"All";return"All"===r?e:e.filter(e=>e.category===r)},[t,o,s,r.enabled,r.percentage,r.menuPrice]),p=(0,n.useMemo)(()=>(t.length?t:o.length?o:a).map(e=>({...e,price:d(e.price),options:e.options?.map(e=>({...e,values:e.values.map(e=>({...e,price:d(e.price)}))}))})),[t,o,r.enabled,r.percentage,r.menuPrice]),u=(0,n.useMemo)(()=>l.chef_section_enabled&&"hidden"!==l.section_placement?p.filter(e=>!!e.is_chef_recommended).slice(0,l.max_chef_items):[],[p,l]),h=(0,n.useMemo)(()=>l.bestseller_section_enabled&&"hidden"!==l.section_placement?p.filter(e=>!!e.is_bestseller).slice(0,l.max_bestseller_items):[],[p,l]);return{allCategories:c,filteredItems:m,highlightSourceItems:p,chefRecommendationItems:u,bestsellerItems:h,showVirtualHighlightSections:"All"===(s||"All")&&"hidden"!==l.section_placement}}({apiMenuItems:T,taxSettings:K,menuData:h,menuItems:F,dynamicCategories:U,selectedCategory:c,menuHighlightSettings:R}),e4=n.default.useCallback(e=>{w(x.useCartStore.getState().items.find(t=>t.item.id===e.id)||{item:e,quantity:1})},[]),e8=()=>ez(!0),e6=()=>ev(!0),e9=()=>{G.length>0&&(et("review"),J(!0))},e7=function({addToCart:e,handleFirstAdd:t,handleCartClick:r,setPaymentModalInitialStep:a,setPaymentModalOpen:o,sharedTableOrder:i,handleWaiterClick:s,handleNoteClick:l,tableIdString:c,totalItems:d,tableOrderActionCount:m,shouldShowTableOrderAction:p,displayTableNumber:u,language:h,showValet:f=!0}){return(0,n.useMemo)(()=>({onAddItem:(r,a=1)=>{e(r,a),t(r)},onOpenCheckout:r,onOpenTableOrder:()=>{a(i?.status==="draft"?"review":i?.status==="paid"?"paid":"submitted"),o(!0)},onCallWaiter:s,onOpenNote:l,onOpenValet:()=>{if(!f)return;let e=window.location.search||"";c?window.location.href=`/table/${c}/valet${e}`:window.location.href=`/valet${e}`},cartCount:d,tableOrderCount:m,showTableOrder:p,showValet:f,tableNumber:u,currentLocale:h,language:h}),[e,t,r,a,o,i?.status,s,l,c,d,m,p,u,h,f])}({addToCart:W,handleFirstAdd:e4,handleCartClick:e9,setPaymentModalInitialStep:et,setPaymentModalOpen:J,sharedTableOrder:eF,handleWaiterClick:e8,handleNoteClick:e6,tableIdString:eL,totalItems:en,tableOrderActionCount:eQ,shouldShowTableOrderAction:eY,displayTableNumber:eU,language:eg,showValet:eZ}),te=async()=>{let e=(eC??"").trim();if(!e)return void eb({title:"Error",description:"Please enter a note before sending.",variant:"destructive"});if(e.length>1e3)return void eb({title:"Error",description:"Note is too long. Please keep it under 1000 characters.",variant:"destructive"});let t=eL||"delivery";try{await i.apiClient.callTableNote(String(t),e,new Date().toISOString());try{localStorage.removeItem(eM)}catch{}ew(""),ev(!1),eb({title:"Note Sent",description:"Your note has been sent to the staff!"})}catch(e){console.error("Failed to send note:",e),eb({title:"Note Failed",description:`Failed to send note: ${e instanceof Error?e.message:"Unknown error"}`,variant:"destructive"})}};if((0,n.useEffect)(()=>{r(!0)},[]),!function(e){let{tableInfo:t,searchParams:r,existingOrderId:a,setExistingOrderId:o,hasDraftTableOrderWithoutRealOrder:i,setHasLocalOpenOrder:s,setLocalOpenOrder:l}=e;(0,n.useEffect)(()=>{if(i){o(null),s(!1),l(null);return}let e=window.location.host,n=String(t?.table_id||t?.table_no||r?.get("table")||r?.get("table_id")||r?.get("table_no")||(window.location.pathname.match(/\/table\/(\d+)/)?.[1]??"delivery")),c=localStorage.getItem("pmd_guest_session_id")||`g_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;localStorage.setItem("pmd_guest_session_id",c);let d=`pmd_open_order:${e}:${n}:${c}`,m=`pmd_open_order:${e}:${n}`;try{let t=localStorage.getItem(d),r=!1;if(!t){let a=localStorage.getItem(m);if(a)try{let o=JSON.parse(a),i=Number(o?.orderId||0)>0&&Number(o?.total||0)>0,s=o?.paymentStatus==="paid"||o?.status==="paid",l=o?.tenant!=null&&String(o.tenant)!==e,p=o?.tableKey!=null&&String(o.tableKey)!==n;if(!i||s||l||p)localStorage.removeItem(m);else{let a={...o,guestSessionId:c,tenant:e,tableKey:n};localStorage.setItem(d,JSON.stringify(a)),localStorage.removeItem(m),t=JSON.stringify(a),r=!0}}catch{}}if(!t){s(!1),l(null);return}let i=JSON.parse(t),p=i&&"object"==typeof i&&Number(i?.total||0)>0&&Number(i?.orderId||0)>0,u=String(i?.guestSessionId||"")===c&&String(i?.tenant||"")===e&&String(i?.tableKey||"")===n;if(!p||!r&&!u){localStorage.removeItem(d),s(!1),l(null);return}s(!!i?.orderId),l(i),!a&&i?.orderId&&o(Number(i.orderId))}catch{s(!1),l(null)}},[t,r,a,i])}({tableInfo:eS,searchParams:e,existingOrderId:eE,setExistingOrderId:eN,hasDraftTableOrderWithoutRealOrder:eq,setHasLocalOpenOrder:ej,setLocalOpenOrder:eB}),(0,n.useEffect)(()=>{let e=String(eS?.table_id||"").trim();if(!e)return;let t=!1,r=async()=>{try{let r=await i.apiClient.getPendingQrOrderByTable(e,{tableNo:eS?.table_no??eS?.tableNo??null,qr:eS?.qr_code??eR??null});if(t||!r?.success||!r.data?.order_id)return;let a=Number(r.data.order_id),o=Number(r.data.order_total||0),n=Number(r.data.settled_amount||0),s=Number(r.data.remaining_amount||o||0),l=Array.isArray(r.data.items)?r.data.items:[];eN(a),eT({orderTotal:o,settledAmount:n,remainingAmount:s}),eB(e=>({...e||{},orderId:a,status:"submitted_unpaid",paymentStatus:s<=0?"paid":n>0?"partial":"unpaid",tableNumber:eS?.table_no??null,total:o,orderTotal:o,settledAmount:n,remainingAmount:s,submittedItems:l,payment:"qr_pay_later",updatedAt:new Date().toISOString()})),ej(!0)}catch(e){}};r();let a=window.setInterval(r,5e3),o=()=>{r()};return window.addEventListener("focus",o),()=>{t=!0,window.clearInterval(a),window.removeEventListener("focus",o)}},[eS?.table_id,eS?.table_no,eS?.qr_code,eR,eN,ej,eB,eT]),!function(e){let{enabled:t,tableIdString:r,shouldShowTableOrderAction:a,sharedTableOrder:o,handleWaiterClick:i,handleNoteClick:s,handleCartClick:l,setPaymentModalInitialStep:c,setPaymentModalOpen:d,addToCart:m,handleFirstAdd:p,toast:u}=e;(0,n.useLayoutEffect)(()=>{if("u"<typeof document)return;let e="data-pmd-organic-botanical-active";if(!t){document.body.removeAttribute(e),document.documentElement.removeAttribute(e);return}return document.body.setAttribute(e,"1"),document.documentElement.setAttribute(e,"1"),()=>{document.body.removeAttribute(e),document.documentElement.removeAttribute(e)}},[t]),n.default.useEffect(()=>{if(t)return window.addEventListener("message",e),()=>window.removeEventListener("message",e);function e(e){if(e.origin!==window.location.origin)return;let t=e.data||{},n=String(t.type||"");if("pmd:call-waiter"===n)return void i();if("pmd:add-note"===n)return void s();if("pmd:checkout"===n)return void l();if("pmd:table-order"===n){if(!a)return;c(o?.status==="draft"?"review":o?.status==="paid"?"paid":"submitted"),d(!0);return}if("pmd:add-item"===n&&t.item){let e=t.item,r=Math.max(1,Number(t.quantity||1));for(let t=0;t<r;t++)m(e);p(e),u({title:"Added to order",description:String(e.name||"Item added")});return}if("pmd:open-valet"===n){let e=window.location.search||"";r?window.location.href=`/table/${r}/valet${e}`:window.location.href=`/valet${e}`}}},[t,r,a,o?.status,i,s,l,c,d,m,p,u]),n.default.useEffect(()=>{if(!t||"u"<typeof document)return;let e=0;function r(t){let r=t.target,n=r?.closest?.("[data-pmd-organic-dock-action]");if(!n)return;let m=Date.now();if(m-e<350)return;e=m,t.preventDefault(),t.stopPropagation(),t.stopImmediatePropagation?.();let p=String(n.getAttribute("data-pmd-organic-dock-action")||"");console.info("PMD_ORGANIC_DOCK_CLICK",p),function(e){if("waiter"===e)return i();if("note"===e)return s();if("checkout"===e)return l();if("table-order"===e){if(!a)return;c(o?.status==="draft"?"review":o?.status==="paid"?"paid":"submitted"),d(!0)}}(p)}return document.addEventListener("pointerdown",r,!0),document.addEventListener("click",r,!0),()=>{document.removeEventListener("pointerdown",r,!0),document.removeEventListener("click",r,!0)}},[t,a,o?.status,i,s,l,c,d]),n.default.useEffect(()=>{if("u">typeof document)return t?(document.body.setAttribute("data-pmd-organic-botanical-active","1"),document.documentElement.setAttribute("data-pmd-organic-botanical-active","1")):(document.body.removeAttribute("data-pmd-organic-botanical-active"),document.documentElement.removeAttribute("data-pmd-organic-botanical-active")),()=>{document.body.removeAttribute("data-pmd-organic-botanical-active"),document.documentElement.removeAttribute("data-pmd-organic-botanical-active")}},[t])}({enabled:em,tableIdString:eL,shouldShowTableOrderAction:eY,sharedTableOrder:eF,handleWaiterClick:e8,handleNoteClick:e6,handleCartClick:e9,setPaymentModalInitialStep:et,setPaymentModalOpen:J,addToCart:W,handleFirstAdd:e4,toast:eb}),!t)return(0,o.jsx)(ct,{});let tt=H?.businessName||V?.appName||"PayMyDine";if(ef||S&&0===T.length&&0===F.length)return(0,o.jsx)("div",{className:"pmd-customer-page page--menu relative min-h-screen w-full","data-pmd-theme-loading":"1","data-pmd-menu-loading-skeleton":"1",style:{background:"#fbf8f2",color:"#343529"},children:(0,o.jsxs)("div",{className:"mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-5 py-6 sm:px-8",children:[(0,o.jsxs)("div",{className:"flex items-center justify-between",children:[(0,o.jsx)("div",{className:"h-10 w-32 animate-pulse rounded-full bg-black/10"}),(0,o.jsx)("div",{className:"h-9 w-24 animate-pulse rounded-full bg-black/10"})]}),(0,o.jsx)("div",{className:"h-44 animate-pulse rounded-[2rem] bg-black/10"}),(0,o.jsx)("div",{className:"flex gap-3 overflow-hidden",children:[0,1,2,3].map(e=>(0,o.jsx)("div",{className:"h-10 min-w-28 animate-pulse rounded-full bg-black/10"},e))}),(0,o.jsx)("div",{className:"grid gap-4 sm:grid-cols-2 lg:grid-cols-3",children:[0,1,2,3,4,5].map(e=>(0,o.jsx)("div",{className:"h-48 animate-pulse rounded-[1.6rem] bg-black/10"},e))})]})});let tr=!!(eL||eU||eS?.table_id||eS?.table_no||e.get("table")||e.get("table_id")||e.get("table_no")||e.get("qr"));return S||tr||"/menu"!==window.location.pathname.replace(/\/+$/,"")?(0,o.jsx)(cm,{isKazenJapaneseTheme:eu,isVelvetTerracottaTheme:eh,isModernGreenTheme:ep,isOrganicBotanicalTheme:em,shouldShowPayMyDineFooterLogo:eX,apiMenuItems:T,menuItems:F,menuData:h,allCategories:eJ,tableInfo:eS,displayTableNumber:eU,tableIdString:eL,cmsSettings:V,merchantSettings:H,taxSettings:K,items:G,totalItems:en,totalPrice:ei,lastInteractedItem:v,restaurantDisplayName:tt,themeMenuActions:e7,addToCart:W,handleFirstAdd:e4,toast:eb,apiClient:i.apiClient,handleItemSelect:e=>{b(e);let t=G.find(t=>t.item.id===e.id);t&&w(t)},handleCartClick:e9,shouldShowTableOrderAction:eY,setPaymentModalInitialStep:et,sharedTableOrder:eF,setPaymentModalPreferPersonalReview:ea,setPaymentModalOpen:J,tableOrderActionCount:eQ,isPaymentModalOpen:Z,activeExistingOrderId:eH,activePendingSummary:eG,activeSubmittedOrder:e$,paymentModalInitialStep:ee,paymentModalPreferPersonalReview:er,setToolbarPricingSnapshot:eo,setSharedTableOrder:eV,setLocalOpenOrder:eB,setHasLocalOpenOrder:ej,setNoteModalOpen:ev,showVirtualHighlightSections:e3,menuHighlightSettings:R,chefRecommendationItems:e2,bestsellerItems:e5,selectedCategory:c,setSelectedCategory:d,isFrontendConfigured:E,filteredItems:e0,selectedItem:m,setSelectedItem:b,shouldHideCartSheet:eW,isWaiterConfirmOpen:ex,setWaiterConfirmOpen:ez,tableName:eD,isNoteModalOpen:ek,note:eC,setNote:ew,handleSendNote:te,showValet:eZ}):(0,o.jsx)("div",{className:"flex min-h-screen items-center justify-center bg-[#fbf8f2] px-6 text-center text-[#242320]",children:(0,o.jsxs)("div",{className:"max-w-md rounded-3xl border border-[#d8b982] bg-white/85 p-6 shadow-sm",children:[(0,o.jsx)("h1",{className:"text-xl font-bold",children:"Oops, we could not find your table."}),(0,o.jsx)("p",{className:"mt-3 text-sm leading-6 text-[#6b6258]",children:"Please scan the QR code on your table again, or ask a member of staff for help."})]})})}e.s(["default",0,function(){return(0,o.jsx)("div",{className:"pmd-customer-page page--menu","data-pmd-customer-page":"menu",children:(0,o.jsx)(n.Suspense,{fallback:(0,o.jsx)("div",{children:"Loading..."}),children:(0,o.jsx)(cu,{})})})}],45978)}]);