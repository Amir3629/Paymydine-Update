module.exports=[59605,a=>{"use strict";a.s(["Toaster",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call Toaster() from the server but Toaster is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/components/ui/toaster.tsx <module evaluation>","Toaster")},8419,a=>{"use strict";a.s(["Toaster",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call Toaster() from the server but Toaster is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/components/ui/toaster.tsx","Toaster")},39771,a=>{"use strict";a.i(59605);var b=a.i(8419);a.n(b)},22194,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/frontend/app/clientLayout.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/app/clientLayout.tsx <module evaluation>","default")},54157,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/frontend/app/clientLayout.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/app/clientLayout.tsx","default")},74234,a=>{"use strict";a.i(22194);var b=a.i(54157);a.n(b)},5540,a=>{"use strict";a.s(["ThemeProvider",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call ThemeProvider() from the server but ThemeProvider is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/components/theme-provider.tsx <module evaluation>","ThemeProvider")},62712,a=>{"use strict";a.s(["ThemeProvider",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call ThemeProvider() from the server but ThemeProvider is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/components/theme-provider.tsx","ThemeProvider")},85537,a=>{"use strict";a.i(5540);var b=a.i(62712);a.n(b)},65403,a=>{"use strict";a.s(["FaviconSetter",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call FaviconSetter() from the server but FaviconSetter is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/components/favicon-setter.tsx <module evaluation>","FaviconSetter")},32095,a=>{"use strict";a.s(["FaviconSetter",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call FaviconSetter() from the server but FaviconSetter is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/components/favicon-setter.tsx","FaviconSetter")},37696,a=>{"use strict";a.i(65403);var b=a.i(32095);a.n(b)},53793,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/frontend/components/clean-light-customer-guard.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/components/clean-light-customer-guard.tsx <module evaluation>","default")},53041,a=>{"use strict";a.s(["default",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call the default export of [project]/frontend/components/clean-light-customer-guard.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/components/clean-light-customer-guard.tsx","default")},89052,a=>{"use strict";a.i(53793);var b=a.i(53041);a.n(b)},44210,a=>{"use strict";var b=a.i(18332);let c=(a,b)=>{if(0===a.length)return b.classGroupId;let d=a[0],e=b.nextPart.get(d),f=e?c(a.slice(1),e):void 0;if(f)return f;if(0===b.validators.length)return;let g=a.join("-");return b.validators.find(({validator:a})=>a(g))?.classGroupId},d=/^\[(.+)\]$/,e=(a,b,c,d)=>{a.forEach(a=>{if("string"==typeof a){(""===a?b:f(b,a)).classGroupId=c;return}"function"==typeof a?g(a)?e(a(d),b,c,d):b.validators.push({validator:a,classGroupId:c}):Object.entries(a).forEach(([a,g])=>{e(g,f(b,a),c,d)})})},f=(a,b)=>{let c=a;return b.split("-").forEach(a=>{c.nextPart.has(a)||c.nextPart.set(a,{nextPart:new Map,validators:[]}),c=c.nextPart.get(a)}),c},g=a=>a.isThemeGetter,h=(a,b)=>b?a.map(([a,c])=>[a,c.map(a=>"string"==typeof a?b+a:"object"==typeof a?Object.fromEntries(Object.entries(a).map(([a,c])=>[b+a,c])):a)]):a,i=a=>{if(a.length<=1)return a;let b=[],c=[];return a.forEach(a=>{"["===a[0]?(b.push(...c.sort(),a),c=[]):c.push(a)}),b.push(...c.sort()),b},j=/\s+/;function k(){let a,b,c=0,d="";for(;c<arguments.length;)(a=arguments[c++])&&(b=l(a))&&(d&&(d+=" "),d+=b);return d}let l=a=>{let b;if("string"==typeof a)return a;let c="";for(let d=0;d<a.length;d++)a[d]&&(b=l(a[d]))&&(c&&(c+=" "),c+=b);return c},m=a=>{let b=b=>b[a]||[];return b.isThemeGetter=!0,b},n=/^\[(?:([a-z-]+):)?(.+)\]$/i,o=/^\d+\/\d+$/,p=new Set(["px","full","screen"]),q=/^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,r=/\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,s=/^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,t=/^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,u=/^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,v=a=>x(a)||p.has(a)||o.test(a),w=a=>K(a,"length",L),x=a=>!!a&&!Number.isNaN(Number(a)),y=a=>K(a,"number",x),z=a=>!!a&&Number.isInteger(Number(a)),A=a=>a.endsWith("%")&&x(a.slice(0,-1)),B=a=>n.test(a),C=a=>q.test(a),D=new Set(["length","size","percentage"]),E=a=>K(a,D,M),F=a=>K(a,"position",M),G=new Set(["image","url"]),H=a=>K(a,G,O),I=a=>K(a,"",N),J=()=>!0,K=(a,b,c)=>{let d=n.exec(a);return!!d&&(d[1]?"string"==typeof b?d[1]===b:b.has(d[1]):c(d[2]))},L=a=>r.test(a)&&!s.test(a),M=()=>!1,N=a=>t.test(a),O=a=>u.test(a),P=function(a,...b){let f,g,l,m=function(i){let j;return g=(f={cache:(a=>{if(a<1)return{get:()=>void 0,set:()=>{}};let b=0,c=new Map,d=new Map,e=(e,f)=>{c.set(e,f),++b>a&&(b=0,d=c,c=new Map)};return{get(a){let b=c.get(a);return void 0!==b?b:void 0!==(b=d.get(a))?(e(a,b),b):void 0},set(a,b){c.has(a)?c.set(a,b):e(a,b)}}})((j=b.reduce((a,b)=>b(a),a())).cacheSize),parseClassName:(a=>{let{separator:b,experimentalParseClassName:c}=a,d=1===b.length,e=b[0],f=b.length,g=a=>{let c,g=[],h=0,i=0;for(let j=0;j<a.length;j++){let k=a[j];if(0===h){if(k===e&&(d||a.slice(j,j+f)===b)){g.push(a.slice(i,j)),i=j+f;continue}if("/"===k){c=j;continue}}"["===k?h++:"]"===k&&h--}let j=0===g.length?a:a.substring(i),k=j.startsWith("!"),l=k?j.substring(1):j;return{modifiers:g,hasImportantModifier:k,baseClassName:l,maybePostfixModifierPosition:c&&c>i?c-i:void 0}};return c?a=>c({className:a,parseClassName:g}):g})(j),...(a=>{let b=(a=>{let{theme:b,prefix:c}=a,d={nextPart:new Map,validators:[]};return h(Object.entries(a.classGroups),c).forEach(([a,c])=>{e(c,d,a,b)}),d})(a),{conflictingClassGroups:f,conflictingClassGroupModifiers:g}=a;return{getClassGroupId:a=>{let e=a.split("-");return""===e[0]&&1!==e.length&&e.shift(),c(e,b)||(a=>{if(d.test(a)){let b=d.exec(a)[1],c=b?.substring(0,b.indexOf(":"));if(c)return"arbitrary.."+c}})(a)},getConflictingClassGroupIds:(a,b)=>{let c=f[a]||[];return b&&g[a]?[...c,...g[a]]:c}}})(j)}).cache.get,l=f.cache.set,m=n,n(i)};function n(a){let b=g(a);if(b)return b;let c=((a,b)=>{let{parseClassName:c,getClassGroupId:d,getConflictingClassGroupIds:e}=b,f=[],g=a.trim().split(j),h="";for(let a=g.length-1;a>=0;a-=1){let b=g[a],{modifiers:j,hasImportantModifier:k,baseClassName:l,maybePostfixModifierPosition:m}=c(b),n=!!m,o=d(n?l.substring(0,m):l);if(!o){if(!n||!(o=d(l))){h=b+(h.length>0?" "+h:h);continue}n=!1}let p=i(j).join(":"),q=k?p+"!":p,r=q+o;if(f.includes(r))continue;f.push(r);let s=e(o,n);for(let a=0;a<s.length;++a){let b=s[a];f.push(q+b)}h=b+(h.length>0?" "+h:h)}return h})(a,f);return l(a,c),c}return function(){return m(k.apply(null,arguments))}}(()=>{let a=m("colors"),b=m("spacing"),c=m("blur"),d=m("brightness"),e=m("borderColor"),f=m("borderRadius"),g=m("borderSpacing"),h=m("borderWidth"),i=m("contrast"),j=m("grayscale"),k=m("hueRotate"),l=m("invert"),n=m("gap"),o=m("gradientColorStops"),p=m("gradientColorStopPositions"),q=m("inset"),r=m("margin"),s=m("opacity"),t=m("padding"),u=m("saturate"),D=m("scale"),G=m("sepia"),K=m("skew"),L=m("space"),M=m("translate"),N=()=>["auto","contain","none"],O=()=>["auto","hidden","clip","visible","scroll"],P=()=>["auto",B,b],Q=()=>[B,b],R=()=>["",v,w],S=()=>["auto",x,B],T=()=>["bottom","center","left","left-bottom","left-top","right","right-bottom","right-top","top"],U=()=>["solid","dashed","dotted","double","none"],V=()=>["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity"],W=()=>["start","end","center","between","around","evenly","stretch"],X=()=>["","0",B],Y=()=>["auto","avoid","all","avoid-page","page","left","right","column"],Z=()=>[x,B];return{cacheSize:500,separator:":",theme:{colors:[J],spacing:[v,w],blur:["none","",C,B],brightness:Z(),borderColor:[a],borderRadius:["none","","full",C,B],borderSpacing:Q(),borderWidth:R(),contrast:Z(),grayscale:X(),hueRotate:Z(),invert:X(),gap:Q(),gradientColorStops:[a],gradientColorStopPositions:[A,w],inset:P(),margin:P(),opacity:Z(),padding:Q(),saturate:Z(),scale:Z(),sepia:X(),skew:Z(),space:Q(),translate:Q()},classGroups:{aspect:[{aspect:["auto","square","video",B]}],container:["container"],columns:[{columns:[C]}],"break-after":[{"break-after":Y()}],"break-before":[{"break-before":Y()}],"break-inside":[{"break-inside":["auto","avoid","avoid-page","avoid-column"]}],"box-decoration":[{"box-decoration":["slice","clone"]}],box:[{box:["border","content"]}],display:["block","inline-block","inline","flex","inline-flex","table","inline-table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row-group","table-row","flow-root","grid","inline-grid","contents","list-item","hidden"],float:[{float:["right","left","none","start","end"]}],clear:[{clear:["left","right","both","none","start","end"]}],isolation:["isolate","isolation-auto"],"object-fit":[{object:["contain","cover","fill","none","scale-down"]}],"object-position":[{object:[...T(),B]}],overflow:[{overflow:O()}],"overflow-x":[{"overflow-x":O()}],"overflow-y":[{"overflow-y":O()}],overscroll:[{overscroll:N()}],"overscroll-x":[{"overscroll-x":N()}],"overscroll-y":[{"overscroll-y":N()}],position:["static","fixed","absolute","relative","sticky"],inset:[{inset:[q]}],"inset-x":[{"inset-x":[q]}],"inset-y":[{"inset-y":[q]}],start:[{start:[q]}],end:[{end:[q]}],top:[{top:[q]}],right:[{right:[q]}],bottom:[{bottom:[q]}],left:[{left:[q]}],visibility:["visible","invisible","collapse"],z:[{z:["auto",z,B]}],basis:[{basis:P()}],"flex-direction":[{flex:["row","row-reverse","col","col-reverse"]}],"flex-wrap":[{flex:["wrap","wrap-reverse","nowrap"]}],flex:[{flex:["1","auto","initial","none",B]}],grow:[{grow:X()}],shrink:[{shrink:X()}],order:[{order:["first","last","none",z,B]}],"grid-cols":[{"grid-cols":[J]}],"col-start-end":[{col:["auto",{span:["full",z,B]},B]}],"col-start":[{"col-start":S()}],"col-end":[{"col-end":S()}],"grid-rows":[{"grid-rows":[J]}],"row-start-end":[{row:["auto",{span:[z,B]},B]}],"row-start":[{"row-start":S()}],"row-end":[{"row-end":S()}],"grid-flow":[{"grid-flow":["row","col","dense","row-dense","col-dense"]}],"auto-cols":[{"auto-cols":["auto","min","max","fr",B]}],"auto-rows":[{"auto-rows":["auto","min","max","fr",B]}],gap:[{gap:[n]}],"gap-x":[{"gap-x":[n]}],"gap-y":[{"gap-y":[n]}],"justify-content":[{justify:["normal",...W()]}],"justify-items":[{"justify-items":["start","end","center","stretch"]}],"justify-self":[{"justify-self":["auto","start","end","center","stretch"]}],"align-content":[{content:["normal",...W(),"baseline"]}],"align-items":[{items:["start","end","center","baseline","stretch"]}],"align-self":[{self:["auto","start","end","center","stretch","baseline"]}],"place-content":[{"place-content":[...W(),"baseline"]}],"place-items":[{"place-items":["start","end","center","baseline","stretch"]}],"place-self":[{"place-self":["auto","start","end","center","stretch"]}],p:[{p:[t]}],px:[{px:[t]}],py:[{py:[t]}],ps:[{ps:[t]}],pe:[{pe:[t]}],pt:[{pt:[t]}],pr:[{pr:[t]}],pb:[{pb:[t]}],pl:[{pl:[t]}],m:[{m:[r]}],mx:[{mx:[r]}],my:[{my:[r]}],ms:[{ms:[r]}],me:[{me:[r]}],mt:[{mt:[r]}],mr:[{mr:[r]}],mb:[{mb:[r]}],ml:[{ml:[r]}],"space-x":[{"space-x":[L]}],"space-x-reverse":["space-x-reverse"],"space-y":[{"space-y":[L]}],"space-y-reverse":["space-y-reverse"],w:[{w:["auto","min","max","fit","svw","lvw","dvw",B,b]}],"min-w":[{"min-w":[B,b,"min","max","fit"]}],"max-w":[{"max-w":[B,b,"none","full","min","max","fit","prose",{screen:[C]},C]}],h:[{h:[B,b,"auto","min","max","fit","svh","lvh","dvh"]}],"min-h":[{"min-h":[B,b,"min","max","fit","svh","lvh","dvh"]}],"max-h":[{"max-h":[B,b,"min","max","fit","svh","lvh","dvh"]}],size:[{size:[B,b,"auto","min","max","fit"]}],"font-size":[{text:["base",C,w]}],"font-smoothing":["antialiased","subpixel-antialiased"],"font-style":["italic","not-italic"],"font-weight":[{font:["thin","extralight","light","normal","medium","semibold","bold","extrabold","black",y]}],"font-family":[{font:[J]}],"fvn-normal":["normal-nums"],"fvn-ordinal":["ordinal"],"fvn-slashed-zero":["slashed-zero"],"fvn-figure":["lining-nums","oldstyle-nums"],"fvn-spacing":["proportional-nums","tabular-nums"],"fvn-fraction":["diagonal-fractions","stacked-fractions"],tracking:[{tracking:["tighter","tight","normal","wide","wider","widest",B]}],"line-clamp":[{"line-clamp":["none",x,y]}],leading:[{leading:["none","tight","snug","normal","relaxed","loose",v,B]}],"list-image":[{"list-image":["none",B]}],"list-style-type":[{list:["none","disc","decimal",B]}],"list-style-position":[{list:["inside","outside"]}],"placeholder-color":[{placeholder:[a]}],"placeholder-opacity":[{"placeholder-opacity":[s]}],"text-alignment":[{text:["left","center","right","justify","start","end"]}],"text-color":[{text:[a]}],"text-opacity":[{"text-opacity":[s]}],"text-decoration":["underline","overline","line-through","no-underline"],"text-decoration-style":[{decoration:[...U(),"wavy"]}],"text-decoration-thickness":[{decoration:["auto","from-font",v,w]}],"underline-offset":[{"underline-offset":["auto",v,B]}],"text-decoration-color":[{decoration:[a]}],"text-transform":["uppercase","lowercase","capitalize","normal-case"],"text-overflow":["truncate","text-ellipsis","text-clip"],"text-wrap":[{text:["wrap","nowrap","balance","pretty"]}],indent:[{indent:Q()}],"vertical-align":[{align:["baseline","top","middle","bottom","text-top","text-bottom","sub","super",B]}],whitespace:[{whitespace:["normal","nowrap","pre","pre-line","pre-wrap","break-spaces"]}],break:[{break:["normal","words","all","keep"]}],hyphens:[{hyphens:["none","manual","auto"]}],content:[{content:["none",B]}],"bg-attachment":[{bg:["fixed","local","scroll"]}],"bg-clip":[{"bg-clip":["border","padding","content","text"]}],"bg-opacity":[{"bg-opacity":[s]}],"bg-origin":[{"bg-origin":["border","padding","content"]}],"bg-position":[{bg:[...T(),F]}],"bg-repeat":[{bg:["no-repeat",{repeat:["","x","y","round","space"]}]}],"bg-size":[{bg:["auto","cover","contain",E]}],"bg-image":[{bg:["none",{"gradient-to":["t","tr","r","br","b","bl","l","tl"]},H]}],"bg-color":[{bg:[a]}],"gradient-from-pos":[{from:[p]}],"gradient-via-pos":[{via:[p]}],"gradient-to-pos":[{to:[p]}],"gradient-from":[{from:[o]}],"gradient-via":[{via:[o]}],"gradient-to":[{to:[o]}],rounded:[{rounded:[f]}],"rounded-s":[{"rounded-s":[f]}],"rounded-e":[{"rounded-e":[f]}],"rounded-t":[{"rounded-t":[f]}],"rounded-r":[{"rounded-r":[f]}],"rounded-b":[{"rounded-b":[f]}],"rounded-l":[{"rounded-l":[f]}],"rounded-ss":[{"rounded-ss":[f]}],"rounded-se":[{"rounded-se":[f]}],"rounded-ee":[{"rounded-ee":[f]}],"rounded-es":[{"rounded-es":[f]}],"rounded-tl":[{"rounded-tl":[f]}],"rounded-tr":[{"rounded-tr":[f]}],"rounded-br":[{"rounded-br":[f]}],"rounded-bl":[{"rounded-bl":[f]}],"border-w":[{border:[h]}],"border-w-x":[{"border-x":[h]}],"border-w-y":[{"border-y":[h]}],"border-w-s":[{"border-s":[h]}],"border-w-e":[{"border-e":[h]}],"border-w-t":[{"border-t":[h]}],"border-w-r":[{"border-r":[h]}],"border-w-b":[{"border-b":[h]}],"border-w-l":[{"border-l":[h]}],"border-opacity":[{"border-opacity":[s]}],"border-style":[{border:[...U(),"hidden"]}],"divide-x":[{"divide-x":[h]}],"divide-x-reverse":["divide-x-reverse"],"divide-y":[{"divide-y":[h]}],"divide-y-reverse":["divide-y-reverse"],"divide-opacity":[{"divide-opacity":[s]}],"divide-style":[{divide:U()}],"border-color":[{border:[e]}],"border-color-x":[{"border-x":[e]}],"border-color-y":[{"border-y":[e]}],"border-color-s":[{"border-s":[e]}],"border-color-e":[{"border-e":[e]}],"border-color-t":[{"border-t":[e]}],"border-color-r":[{"border-r":[e]}],"border-color-b":[{"border-b":[e]}],"border-color-l":[{"border-l":[e]}],"divide-color":[{divide:[e]}],"outline-style":[{outline:["",...U()]}],"outline-offset":[{"outline-offset":[v,B]}],"outline-w":[{outline:[v,w]}],"outline-color":[{outline:[a]}],"ring-w":[{ring:R()}],"ring-w-inset":["ring-inset"],"ring-color":[{ring:[a]}],"ring-opacity":[{"ring-opacity":[s]}],"ring-offset-w":[{"ring-offset":[v,w]}],"ring-offset-color":[{"ring-offset":[a]}],shadow:[{shadow:["","inner","none",C,I]}],"shadow-color":[{shadow:[J]}],opacity:[{opacity:[s]}],"mix-blend":[{"mix-blend":[...V(),"plus-lighter","plus-darker"]}],"bg-blend":[{"bg-blend":V()}],filter:[{filter:["","none"]}],blur:[{blur:[c]}],brightness:[{brightness:[d]}],contrast:[{contrast:[i]}],"drop-shadow":[{"drop-shadow":["","none",C,B]}],grayscale:[{grayscale:[j]}],"hue-rotate":[{"hue-rotate":[k]}],invert:[{invert:[l]}],saturate:[{saturate:[u]}],sepia:[{sepia:[G]}],"backdrop-filter":[{"backdrop-filter":["","none"]}],"backdrop-blur":[{"backdrop-blur":[c]}],"backdrop-brightness":[{"backdrop-brightness":[d]}],"backdrop-contrast":[{"backdrop-contrast":[i]}],"backdrop-grayscale":[{"backdrop-grayscale":[j]}],"backdrop-hue-rotate":[{"backdrop-hue-rotate":[k]}],"backdrop-invert":[{"backdrop-invert":[l]}],"backdrop-opacity":[{"backdrop-opacity":[s]}],"backdrop-saturate":[{"backdrop-saturate":[u]}],"backdrop-sepia":[{"backdrop-sepia":[G]}],"border-collapse":[{border:["collapse","separate"]}],"border-spacing":[{"border-spacing":[g]}],"border-spacing-x":[{"border-spacing-x":[g]}],"border-spacing-y":[{"border-spacing-y":[g]}],"table-layout":[{table:["auto","fixed"]}],caption:[{caption:["top","bottom"]}],transition:[{transition:["none","all","","colors","opacity","shadow","transform",B]}],duration:[{duration:Z()}],ease:[{ease:["linear","in","out","in-out",B]}],delay:[{delay:Z()}],animate:[{animate:["none","spin","ping","pulse","bounce",B]}],transform:[{transform:["","gpu","none"]}],scale:[{scale:[D]}],"scale-x":[{"scale-x":[D]}],"scale-y":[{"scale-y":[D]}],rotate:[{rotate:[z,B]}],"translate-x":[{"translate-x":[M]}],"translate-y":[{"translate-y":[M]}],"skew-x":[{"skew-x":[K]}],"skew-y":[{"skew-y":[K]}],"transform-origin":[{origin:["center","top","top-right","right","bottom-right","bottom","bottom-left","left","top-left",B]}],accent:[{accent:["auto",a]}],appearance:[{appearance:["none","auto"]}],cursor:[{cursor:["auto","default","pointer","wait","text","move","help","not-allowed","none","context-menu","progress","cell","crosshair","vertical-text","alias","copy","no-drop","grab","grabbing","all-scroll","col-resize","row-resize","n-resize","e-resize","s-resize","w-resize","ne-resize","nw-resize","se-resize","sw-resize","ew-resize","ns-resize","nesw-resize","nwse-resize","zoom-in","zoom-out",B]}],"caret-color":[{caret:[a]}],"pointer-events":[{"pointer-events":["none","auto"]}],resize:[{resize:["none","y","x",""]}],"scroll-behavior":[{scroll:["auto","smooth"]}],"scroll-m":[{"scroll-m":Q()}],"scroll-mx":[{"scroll-mx":Q()}],"scroll-my":[{"scroll-my":Q()}],"scroll-ms":[{"scroll-ms":Q()}],"scroll-me":[{"scroll-me":Q()}],"scroll-mt":[{"scroll-mt":Q()}],"scroll-mr":[{"scroll-mr":Q()}],"scroll-mb":[{"scroll-mb":Q()}],"scroll-ml":[{"scroll-ml":Q()}],"scroll-p":[{"scroll-p":Q()}],"scroll-px":[{"scroll-px":Q()}],"scroll-py":[{"scroll-py":Q()}],"scroll-ps":[{"scroll-ps":Q()}],"scroll-pe":[{"scroll-pe":Q()}],"scroll-pt":[{"scroll-pt":Q()}],"scroll-pr":[{"scroll-pr":Q()}],"scroll-pb":[{"scroll-pb":Q()}],"scroll-pl":[{"scroll-pl":Q()}],"snap-align":[{snap:["start","end","center","align-none"]}],"snap-stop":[{snap:["normal","always"]}],"snap-type":[{snap:["none","x","y","both"]}],"snap-strictness":[{snap:["mandatory","proximity"]}],touch:[{touch:["auto","none","manipulation"]}],"touch-x":[{"touch-pan":["x","left","right"]}],"touch-y":[{"touch-pan":["y","up","down"]}],"touch-pz":["touch-pinch-zoom"],select:[{select:["none","text","all","auto"]}],"will-change":[{"will-change":["auto","scroll","contents","transform",B]}],fill:[{fill:[a,"none"]}],"stroke-w":[{stroke:[v,w,y]}],stroke:[{stroke:[a,"none"]}],sr:["sr-only","not-sr-only"],"forced-color-adjust":[{"forced-color-adjust":["auto","none"]}]},conflictingClassGroups:{overflow:["overflow-x","overflow-y"],overscroll:["overscroll-x","overscroll-y"],inset:["inset-x","inset-y","start","end","top","right","bottom","left"],"inset-x":["right","left"],"inset-y":["top","bottom"],flex:["basis","grow","shrink"],gap:["gap-x","gap-y"],p:["px","py","ps","pe","pt","pr","pb","pl"],px:["pr","pl"],py:["pt","pb"],m:["mx","my","ms","me","mt","mr","mb","ml"],mx:["mr","ml"],my:["mt","mb"],size:["w","h"],"font-size":["leading"],"fvn-normal":["fvn-ordinal","fvn-slashed-zero","fvn-figure","fvn-spacing","fvn-fraction"],"fvn-ordinal":["fvn-normal"],"fvn-slashed-zero":["fvn-normal"],"fvn-figure":["fvn-normal"],"fvn-spacing":["fvn-normal"],"fvn-fraction":["fvn-normal"],"line-clamp":["display","overflow"],rounded:["rounded-s","rounded-e","rounded-t","rounded-r","rounded-b","rounded-l","rounded-ss","rounded-se","rounded-ee","rounded-es","rounded-tl","rounded-tr","rounded-br","rounded-bl"],"rounded-s":["rounded-ss","rounded-es"],"rounded-e":["rounded-se","rounded-ee"],"rounded-t":["rounded-tl","rounded-tr"],"rounded-r":["rounded-tr","rounded-br"],"rounded-b":["rounded-br","rounded-bl"],"rounded-l":["rounded-tl","rounded-bl"],"border-spacing":["border-spacing-x","border-spacing-y"],"border-w":["border-w-s","border-w-e","border-w-t","border-w-r","border-w-b","border-w-l"],"border-w-x":["border-w-r","border-w-l"],"border-w-y":["border-w-t","border-w-b"],"border-color":["border-color-s","border-color-e","border-color-t","border-color-r","border-color-b","border-color-l"],"border-color-x":["border-color-r","border-color-l"],"border-color-y":["border-color-t","border-color-b"],"scroll-m":["scroll-mx","scroll-my","scroll-ms","scroll-me","scroll-mt","scroll-mr","scroll-mb","scroll-ml"],"scroll-mx":["scroll-mr","scroll-ml"],"scroll-my":["scroll-mt","scroll-mb"],"scroll-p":["scroll-px","scroll-py","scroll-ps","scroll-pe","scroll-pt","scroll-pr","scroll-pb","scroll-pl"],"scroll-px":["scroll-pr","scroll-pl"],"scroll-py":["scroll-pt","scroll-pb"],touch:["touch-x","touch-y","touch-pz"],"touch-x":["touch"],"touch-y":["touch"],"touch-pz":["touch"]},conflictingClassGroupModifiers:{"font-size":["leading"]}}});var Q=a.i(39771),R=a.i(74234),S=a.i(85537),T=a.i(37696),U=a.i(89052);a.s(["default",0,function({children:a}){return(0,b.jsxs)("html",{lang:"en",className:"theme-vars",suppressHydrationWarning:!0,children:[(0,b.jsxs)("head",{children:[(0,b.jsx)("link",{rel:"manifest",href:"/manifest.json"}),(0,b.jsx)("meta",{name:"theme-color",content:"#E7CBA9"}),(0,b.jsx)("script",{dangerouslySetInnerHTML:{__html:`(function(){try{
            var h=window.location.hostname.split(".");
            var tenant=(h.length>=3?h[0]:"default");
            var themeKey=tenant+":paymydine-theme";
            var ovKey=tenant+":paymydine-theme-overrides";
            var t=localStorage.getItem(themeKey);
            var useCachedTheme=!!(t && t !== "gold-luxury" && t !== "gold_luxury" && t !== "gold");
            if(useCachedTheme){
              document.documentElement.setAttribute("data-theme",t);
            }
            document.documentElement.removeAttribute("data-pmd-theme-resolved");
            var ov=null; try{ ov=JSON.parse(localStorage.getItem(ovKey)||"null"); }catch(e){}
            if(useCachedTheme && ov && typeof ov==="object"){
              var r=document.documentElement.style;
              if(ov.primary)   r.setProperty("--theme-primary",ov.primary);
              if(ov.secondary) r.setProperty("--theme-secondary",ov.secondary);
              if(ov.accent)    r.setProperty("--theme-accent",ov.accent);
              if(ov.background)r.setProperty("--theme-background",ov.background);
            }
          }catch(e){}})()`}}),(0,b.jsx)("style",{id:"theme-vars-inline",children:`
          /* Let CSS variables handle all backgrounds - no overrides */
          html, body { background: var(--theme-background); }
        `}),(0,b.jsx)("script",{dangerouslySetInnerHTML:{__html:`
            (function () {
              try {
                // PMD cart badge force fix removed: menu badge is now single-owner.

              // FOOD ITEM MODAL CARD FIX - Ensures modal cards have correct theme colors

              // PMD_SKIP_CHECKOUT_RUNTIME_STYLE_HELPERS_20260602
              // Old modal helpers repaint gold-luxury modal text to cornsilk/white.
              // Skip checkout/payment/split/order-status nodes so step changes do not blink white.
              function pmdSkipCheckoutRuntimeStyleNode(node) {
                try {
                  return !!(
                    node &&
                    node.closest &&
                    node.closest(
                      [
                        '[data-pmd-checkout-scroll="1"]',
                        '[data-pmd-gold-checkout-modal]',
                        '[data-pmd-checkout-modal]',
                        '[data-pmd-checkout-lockdown="1"]',
                        '[data-pmd-checkout-v3="1"]',
                        '[data-pmd-payment-adjustment-shell="1"]',
                        '[data-pmd-payment-real-panel]',
                        '[data-pmd-split-method-real]',
                        '[data-pmd-split-method-polished="1"]',
                        '[data-pmd-order-status-back="1"]',
                        '[data-pmd-custom-tip-shows-selected-amount="1"]'
                      ].join(',')
                    )
                  );
                } catch (e) {
                  return false;
                }
              }

              function fixModalCards() {
                const theme = document.documentElement.getAttribute('data-theme') || 'clean-light';
                const themeColors = {
                  'clean-light': { bg: '#FAFAFA', text: '#3B3B3B' },
                  'modern-dark': { bg: '#0A0E12', text: '#F8FAFC' },
                  'gold-luxury': { bg: '#0F0B05', text: '#FFF8DC' },
                  'organic_botanical_paper': { bg: '#FFF9EF', text: '#352F28' },
                  'vibrant-colors': { bg: '#e2ceb1', text: '#1E293B' },
                  'minimal': { bg: '#CFEBF7', text: '#1A202C' }
                };

                const colors = themeColors[theme] || themeColors['clean-light'];

                // Target modal card selectors
                const modalCardSelectors = [
                  '.surface.rounded-3xl.shadow-2xl',
                  '[class*="surface"][class*="rounded-3xl"]',
                  'div[class*="relative"][class*="surface"][class*="rounded"]'
                ];

                modalCardSelectors.forEach(selector => {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach(element => {
                    if (pmdSkipCheckoutRuntimeStyleNode(element)) return;
                    const rect = element.getBoundingClientRect();
                    // Make sure it's actually a modal card (not too small, not too big)
                    if (rect.width > 200 && rect.width < 600 && rect.height > 100 && rect.height < 500) {
                      element.style.setProperty('background-color', colors.bg, 'important');
                      element.style.setProperty('color', colors.text, 'important');
                      element.style.setProperty('opacity', '1', 'important');
                      element.style.setProperty('visibility', 'visible', 'important');

                      // Also fix text color for child elements
                      element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div').forEach(child => {
                        child.style.setProperty('color', colors.text, 'important');
                      });
                    }
                  });
                });

                // Keep backdrop blurry and dark
                const backdropSelectors = [
                  'div[class*="fixed"][class*="inset-0"][class*="z-50"][class*="flex"][class*="items-center"][class*="justify-center"]',
                  'div[class*="fixed"][class*="inset-0"][class*="z-50"]'
                ];

                backdropSelectors.forEach(selector => {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach(element => {
                    if (pmdSkipCheckoutRuntimeStyleNode(element)) return;
                    const rect = element.getBoundingClientRect();
                    // Make sure it's the backdrop (full screen size)
                    if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9) {
                      element.style.setProperty('background-color', 'rgba(0, 0, 0, 0.6)', 'important');
                      element.style.setProperty('backdrop-filter', 'blur(8px)', 'important');
                      element.style.setProperty('opacity', '1', 'important');
                    }
                  });
                });
              }

              // Run modal fix immediately and periodically
              fixModalCards();
              setInterval(fixModalCards, 1000);

              // MODAL INFO CARDS FIX - Ensures info cards have correct theme colors
              function fixModalInfoCards() {
                const theme = document.documentElement.getAttribute('data-theme') || 'clean-light';
                const themeColors = {
                  'clean-light': {
                    bg: 'rgba(255, 255, 255, 0.9)',
                    text: '#3B3B3B',
                    border: '#EDEDED'
                  },
                  'modern-dark': {
                    bg: 'rgba(30, 41, 59, 0.9)',
                    text: '#F8FAFC',
                    border: '#334155'
                  },
                  'gold-luxury': {
                    bg: 'rgba(26, 22, 18, 0.9)',
                    text: '#FFF8DC',
                    border: '#FFF8DC'
                  },
                  'organic_botanical_paper': {
                    bg: 'rgba(255, 249, 239, 0.95)',
                    text: '#352F28',
                    border: '#D8C9AC'
                  },
                  'vibrant-colors': {
                    bg: 'rgba(255, 255, 255, 0.95)',
                    text: '#1E293B',
                    border: '#E8E0D5'
                  },
                  'minimal': {
                    bg: 'rgba(255, 255, 255, 0.95)',
                    text: '#1A202C',
                    border: '#E2E8F0'
                  }
                };

                const colors = themeColors[theme] || themeColors['clean-light'];

                // Target info card selectors
                const infoCardSelectors = [
                  '[class*="bg-paydine-rose-beige/10"]',
                  '[class*="backdrop-blur-sm"][class*="rounded-2xl"]',
                  'div[class*="backdrop-blur-sm"][class*="rounded-2xl"][class*="p-4"]',
                  'div[class*="backdrop-blur"][class*="rounded-2xl"]'
                ];

                infoCardSelectors.forEach(selector => {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach(element => {
                    if (pmdSkipCheckoutRuntimeStyleNode(element)) return;
                    const rect = element.getBoundingClientRect();
                    // Make sure it's an info card (reasonable size for kcal/allergen cards)
                    if (rect.width > 80 && rect.width < 250 && rect.height > 60 && rect.height < 120) {
                      element.style.setProperty('background-color', colors.bg, 'important');
                      element.style.setProperty('color', colors.text, 'important');
                      element.style.setProperty('border-color', colors.border, 'important');
                      element.style.setProperty('opacity', '1', 'important');
                      element.style.setProperty('visibility', 'visible', 'important');
                      element.style.setProperty('backdrop-filter', 'blur(8px)', 'important');
                      element.style.setProperty('border', \`1px solid \${colors.border}\`, 'important');

                      // Also fix text color for ALL child elements
                      element.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', colors.text, 'important');
                      });
                    }
                  });
                });
              }

              // Run modal info cards fix immediately and periodically
              fixModalInfoCards();
              setInterval(fixModalInfoCards, 500); // Check every 500ms for faster response

              // WAITER AND NOTE MODALS FIX - Ensures waiter and note modals have correct theme colors
              function fixWaiterNoteModals() {
                const theme = document.documentElement.getAttribute('data-theme') || 'clean-light';
                const modalColors = {
                  'clean-light': { bg: '#FAFAFA', text: '#3B3B3B', border: '#EDEDED' },
                  'modern-dark': { bg: '#0A0E12', text: '#F8FAFC', border: '#334155' },
                  'gold-luxury': { bg: '#0F0B05', text: '#FFF8DC', border: '#FFF8DC' },
                  'organic_botanical_paper': { bg: '#FFF9EF', text: '#352F28', border: '#D8C9AC' },
                  'vibrant-colors': { bg: '#e2ceb1', text: '#1E293B', border: '#E8E0D5' },
                  'minimal': { bg: '#CFEBF7', text: '#1A202C', border: '#E2E8F0' }
                };

                const iconColors = {
                  'clean-light': { iconColor: '#E7CBA9', buttonBg: '#EFC7B1', buttonText: '#3B3B3B' },
                  'modern-dark': { iconColor: '#F0C6B1', buttonBg: '#E8B4A0', buttonText: '#0A0E12' },
                  'gold-luxury': { iconColor: '#FFD700', buttonBg: '#FFF8DC', buttonText: '#0F0B05' },
                  'organic_botanical_paper': { iconColor: '#737A55', buttonBg: '#737A55', buttonText: '#FFF9EF' },
                  'vibrant-colors': { iconColor: '#FF6B6B', buttonBg: '#6b5e4f', buttonText: '#1E293B' },
                  'minimal': { iconColor: '#2D3748', buttonBg: '#4A5568', buttonText: '#CFEBF7' }
                };

                const modalColor = modalColors[theme] || modalColors['clean-light'];
                const iconColor = iconColors[theme] || iconColors['clean-light'];

                // Target waiter and note modals (exclude food item modals)
                const modalSelectors = [
                  '.rounded-3xl.shadow-2xl:not(.surface)',
                  '.backdrop-blur-lg.rounded-3xl.shadow-2xl:not(.surface)',
                  'div[class*="rounded-3xl"][class*="shadow-2xl"]:not([class*="surface"])'
                ];

                modalSelectors.forEach(selector => {
                  const modals = document.querySelectorAll(selector);
                  modals.forEach(modal => {
                    if (pmdSkipCheckoutRuntimeStyleNode(modal)) return;
                    const rect = modal.getBoundingClientRect();
                    // Check if it's a waiter/note modal (reasonable size)
                    if (rect.width > 300 && rect.width < 600 && rect.height > 200 && rect.height < 500) {
                      // Fix modal background
                      modal.style.setProperty('background-color', modalColor.bg, 'important');
                      modal.style.setProperty('color', modalColor.text, 'important');
                      modal.style.setProperty('border', \`1px solid \${modalColor.border}\`, 'important');
                      modal.style.setProperty('opacity', '1', 'important');
                      modal.style.setProperty('visibility', 'visible', 'important');

                      // Fix icons (color only, no background)
                      const icons = modal.querySelectorAll('svg, i');
                      icons.forEach(icon => {
                        icon.style.setProperty('color', iconColor.iconColor, 'important');
                        icon.style.setProperty('fill', iconColor.iconColor, 'important');
                        icon.style.setProperty('stroke', iconColor.iconColor, 'important');
                        icon.style.setProperty('background-color', 'transparent', 'important');
                        icon.style.setProperty('background', 'transparent', 'important');
                        icon.style.setProperty('box-shadow', 'none', 'important');
                        icon.style.setProperty('border', 'none', 'important');
                      });

                      // Remove backgrounds from icon containers
                      const iconContainers = modal.querySelectorAll('div[class*="rounded-full"], div[class*="w-16"], div[class*="w-20"], div[class*="w-24"]');
                      iconContainers.forEach(container => {
                        container.style.setProperty('background-color', 'transparent', 'important');
                        container.style.setProperty('background', 'transparent', 'important');
                        container.style.setProperty('box-shadow', 'none', 'important');
                        container.style.setProperty('border', 'none', 'important');
                        container.style.setProperty('border-radius', '0', 'important');
                      });

                      // Fix buttons
                      const buttons = modal.querySelectorAll('button, [role="button"]');
                      buttons.forEach(button => {
                        const buttonRect = button.getBoundingClientRect();
                        if (buttonRect.width > 50 && buttonRect.width < 200 && buttonRect.height > 30 && buttonRect.height < 60) {
                          button.style.setProperty('background-color', iconColor.buttonBg, 'important');
                          button.style.setProperty('color', iconColor.buttonText, 'important');
                          button.style.setProperty('border', \`1px solid \${iconColor.buttonBg}\`, 'important');
                          button.style.setProperty('border-radius', '8px', 'important');
                          button.style.setProperty('padding', '8px 16px', 'important');
                          button.style.setProperty('font-weight', '500', 'important');
                        }
                      });
                    }
                  });
                });
              }

              // Run waiter and note modals fix immediately and periodically
              fixWaiterNoteModals();
              setInterval(fixWaiterNoteModals, 1000); // Check every second
              } catch (error) {
                console.warn("PMD layout modal runtime repair failed", error);
              }
            })();
          `}}),(0,b.jsx)("style",{id:"pmd-cart-badge-cache-bridge",dangerouslySetInnerHTML:{__html:`
html body span.cart-badge.pmd-v2-badge,
html body [data-pmd-menu-cart-badge="1"] {
  --pmd-v2-badge-bg: #b88940 !important;
  --pmd-v2-badge-text: #FFFFFF !important;
  --pmd-v2-badge-border: #b88940 !important;
  background: #b88940 !important;
  background-color: #b88940 !important;
  background-image: none !important;
  color: #FFFFFF !important;
  -webkit-text-fill-color: #FFFFFF !important;
  border-color: #b88940 !important;
  outline-color: #b88940 !important;
  text-shadow: none !important;
  filter: none !important;
}

html body span.cart-badge.pmd-v2-badge *,
html body [data-pmd-menu-cart-badge="1"] * {
  color: #FFFFFF !important;
  -webkit-text-fill-color: #FFFFFF !important;
  text-shadow: none !important;
  filter: none !important;
}
            `}}),(0,b.jsx)("script",{id:"pmd-organic-prepaint-bootstrap",dangerouslySetInnerHTML:{__html:`
              /* PMD_ORGANIC_PREPAINT_BOOTSTRAP_20260609 */
              (function () {
                try {
                  var host = window.location.hostname || "";
                  var sub = host.split(".")[0] || "";
                  var keys = [
                    sub + ":paymydine-theme",
                    "mimoza:paymydine-theme",
                    "paymydine-theme"
                  ];
                  var theme = "";
                  for (var i = 0; i < keys.length; i++) {
                    theme = window.localStorage.getItem(keys[i]) || theme;
                    if (theme) break;
                  }
                  if (theme === "organic_botanical_paper") {
                    document.documentElement.setAttribute("data-theme", "organic_botanical_paper");
                    document.documentElement.setAttribute("data-pmd-organic-botanical-active", "1");
                    document.documentElement.classList.add("pmd-organic-prepaint");
                  }
                } catch (error) {}
              })();
            `}})]}),(0,b.jsxs)("body",{className:"text-theme",children:[(0,b.jsx)(U.default,{}),(0,b.jsx)(T.FaviconSetter,{}),(0,b.jsx)(S.ThemeProvider,{children:(0,b.jsxs)(R.default,{className:function(...a){return P(function(){for(var a,b,c=0,d="",e=arguments.length;c<e;c++)(a=arguments[c])&&(b=function a(b){var c,d,e="";if("string"==typeof b||"number"==typeof b)e+=b;else if("object"==typeof b)if(Array.isArray(b)){var f=b.length;for(c=0;c<f;c++)b[c]&&(d=a(b[c]))&&(e&&(e+=" "),e+=d)}else for(d in b)b[d]&&(e&&(e+=" "),e+=d);return e}(a))&&(d&&(d+=" "),d+=b);return d}(a))}("min-h-screen font-sans antialiased"),children:[a,(0,b.jsx)(Q.Toaster,{})]})}),(0,b.jsx)("script",{id:"pmd-organic-checkout-runtime-bridge",dangerouslySetInnerHTML:{__html:`
(function () {
  if (window.__pmdOrganicCheckoutRuntimeBridge) return;
  window.__pmdOrganicCheckoutRuntimeBridge = true;

  var ORGANIC = {
    ink: "#2f3028",
    primary: "#78835c",
    primaryDark: "#667249",
    circle: "#78835c",
    paper: "#fffaf0",
    border: "#d9cdae",
    borderStrong: "#cdbf9c",
    disabledBg: "#d6dbc6",
    disabledText: "#6b7253",
    shadow: "0 10px 22px rgba(120, 131, 92, 0.22)",
    softShadow: "0 8px 18px rgba(94, 82, 55, 0.08)"
  };

  function isOrganic() {
    return document.documentElement.getAttribute("data-theme") === "organic_botanical_paper";
  }

  function visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    var s = window.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function important(el, styles) {
    Object.keys(styles).forEach(function (key) {
      el.style.setProperty(key, styles[key], "important");
    });
  }

  function setIconColor(btn, color) {
    var icons = btn.querySelectorAll("svg, svg *, i");
    icons.forEach(function (icon) {
      important(icon, {
        "color": color,
        "stroke": color
      });
    });
  }

  function setTextColor(btn, color) {
    important(btn, {
      "color": color,
      "-webkit-text-fill-color": color
    });

    btn.querySelectorAll("span, p, div, strong").forEach(function (child) {
      important(child, {
        "color": color,
        "-webkit-text-fill-color": color
      });
    });
  }

  function cleanButton(btn) {
    important(btn, {
      "border-radius": "9999px",
      "transform": "none",
      "transition": "background-color .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease",
      "-webkit-tap-highlight-color": "transparent"
    });
  }

  function primary(btn) {
    cleanButton(btn);
    important(btn, {
      "background": ORGANIC.primary,
      "background-image": "none",
      "border": "1px solid " + ORGANIC.primary,
      "box-shadow": ORGANIC.shadow,
      "font-weight": "800"
    });
    setTextColor(btn, ORGANIC.paper);
    setIconColor(btn, ORGANIC.paper);
  }

  function outline(btn) {
    cleanButton(btn);
    important(btn, {
      "background": "rgba(255, 250, 240, 0.78)",
      "background-image": "none",
      "border": "1px solid " + ORGANIC.borderStrong,
      "box-shadow": ORGANIC.softShadow,
      "font-weight": "800"
    });
    setTextColor(btn, ORGANIC.ink);
  }

  function circle(btn) {
    cleanButton(btn);
    important(btn, {
      "background": ORGANIC.circle,
      "background-image": "none",
      "border": "1px solid " + ORGANIC.circle,
      "box-shadow": "0 8px 18px rgba(79, 91, 59, 0.22)",
      "font-weight": "900"
    });
    setTextColor(btn, ORGANIC.paper);
    setIconColor(btn, ORGANIC.paper);
  }

  function disabled(btn) {
    cleanButton(btn);
    important(btn, {
      "background": ORGANIC.disabledBg,
      "background-image": "none",
      "border": "1px solid #c8ceb3",
      "box-shadow": "none",
      "opacity": "0.88",
      "font-weight": "800"
    });
    setTextColor(btn, ORGANIC.disabledText);
    setIconColor(btn, ORGANIC.disabledText);
  }

  function inputStyle(input) {
    important(input, {
      "border-radius": "9999px",
      "border": "1px solid " + ORGANIC.border,
      "background": "rgba(255, 250, 240, 0.72)",
      "color": ORGANIC.ink,
      "-webkit-text-fill-color": ORGANIC.ink,
      "box-shadow": "inset 0 1px 0 rgba(255,255,255,.6)"
    });
  }

  function findCheckoutRoots() {
    var roots = [];
    var selectors = [
      "[role='dialog']",
      "[aria-modal='true']",
      "[class*='fixed']",
      "[class*='checkout']",
      "[class*='payment']",
      "[class*='split']"
    ];

    document.querySelectorAll(selectors.join(",")).forEach(function (el) {
      if (!visible(el)) return;
      var txt = (el.innerText || "").toLowerCase();
      if (
        txt.indexOf("payment") !== -1 ||
        txt.indexOf("split bill") !== -1 ||
        txt.indexOf("order status") !== -1 ||
        txt.indexOf("pay in full") !== -1 ||
        txt.indexOf("review split") !== -1 ||
        txt.indexOf("send to kitchen") !== -1
      ) {
        roots.push(el);
      }
    });

    if (!roots.length) {
      var bodyTxt = (document.body.innerText || "").toLowerCase();
      if (
        bodyTxt.indexOf("payment") !== -1 ||
        bodyTxt.indexOf("split bill") !== -1 ||
        bodyTxt.indexOf("order status") !== -1
      ) {
        roots.push(document.body);
      }
    }

    return roots;
  }

  function classifyAndStyle(btn) {
    if (!visible(btn)) return;

    var rawText = (btn.innerText || btn.textContent || "");
    var text = rawText.replace(/\\s+/g, " ").trim().toLowerCase();
    var r = btn.getBoundingClientRect();

    var isDisabled =
      btn.disabled ||
      btn.getAttribute("aria-disabled") === "true" ||
      btn.className.toString().indexOf("disabled") !== -1;

    if (isDisabled) {
      disabled(btn);
      return;
    }

    var looksCircle =
      (text === "" || text === "+" || text === "-" || text === "−" || text.length <= 2) &&
      r.width <= 76 &&
      r.height <= 76;

    if (looksCircle) {
      circle(btn);
      return;
    }

    if (
      text.indexOf("pay") !== -1 ||
      text.indexOf("review split") !== -1 ||
      text.indexOf("send to kitchen") !== -1 ||
      text.indexOf("apply") !== -1 ||
      text.indexOf("split equally") !== -1 ||
      text.indexOf("pay in full") !== -1
    ) {
      primary(btn);
      return;
    }

    if (
      text.indexOf("split bill") !== -1 ||
      text.indexOf("continue ordering") !== -1 ||
      text.indexOf("by order") !== -1 ||
      text.indexOf("by shares") !== -1 ||
      text.indexOf("0%") !== -1 ||
      text.indexOf("5%") !== -1 ||
      text.indexOf("10%") !== -1 ||
      text.indexOf("custom") !== -1 ||
      text.indexOf("card") !== -1 ||
      text.indexOf("google") !== -1 ||
      text.indexOf("apple") !== -1 ||
      text.indexOf("wero") !== -1 ||
      text.indexOf("paypal") !== -1 ||
      text.indexOf("cash") !== -1
    ) {
      outline(btn);
      return;
    }

    outline(btn);
  }

  function applyOrganicCheckoutBridge() {
    if (!isOrganic()) return;

    var roots = findCheckoutRoots();

    roots.forEach(function (root) {
      root.querySelectorAll("button, [role='button']").forEach(classifyAndStyle);
      root.querySelectorAll("input, textarea, select").forEach(function (input) {
        if (visible(input)) inputStyle(input);
      });
    });
  }

  var raf = 0;
  function schedule() {
    if (raf) return;
    raf = window.requestAnimationFrame(function () {
      raf = 0;
      applyOrganicCheckoutBridge();
    });
  }

  window.addEventListener("load", schedule);
  document.addEventListener("click", function () {
    schedule();
    window.setTimeout(schedule, 80);
    window.setTimeout(schedule, 240);
  }, true);

  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-theme", "data-pmd-theme-resolved"]
  });

  schedule();
})();
            `}})]})]})},"metadata",0,{title:"PayMyDine - A Luxurious Dining Experience",description:"Order, pay, and enjoy your meal seamlessly.",generator:"v0.dev"}],44210)},77451,a=>{a.n(a.i(44210))}];

//# sourceMappingURL=frontend_0nd5m4k._.js.map