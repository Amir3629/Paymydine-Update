/*! jQuery v3.6.3 | (c) OpenJS Foundation and other contributors | jquery.org/license */
!function(e,t){"use strict";"object"==typeof module&&"object"==typeof module.exports?module.exports=e.document?t(e,!0):function(e){if(!e.document)throw new Error("jQuery requires a window with a document");return t(e)}:t(e)}("undefined"!=typeof window?window:this,function(C,e){"use strict";var t=[],r=Object.getPrototypeOf,s=t.slice,g=t.flat?function(e){return t.flat.call(e)}:function(e){return t.concat.apply([],e)},u=t.push,i=t.indexOf,n={},o=n.toString,y=n.hasOwnProperty,a=y.toString,l=a.call(Object),v={},m=function(e){return"function"==typeof e&&"number"!=typeof e.nodeType&&"function"!=typeof e.item},x=function(e){return null!=e&&e===e.window},S=C.document,c={type:!0,src:!0,nonce:!0,noModule:!0};function b(e,t,n){var r,i,o=(n=n||S).createElement("script");if(o.text=e,t)for(r in c)(i=t[r]||t.getAttribute&&t.getAttribute(r))&&o.setAttribute(r,i);n.head.appendChild(o).parentNode.removeChild(o)}function w(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?n[o.call(e)]||"object":typeof e}var f="3.6.3",E=function(e,t){return new E.fn.init(e,t)};function p(e){var t=!!e&&"length"in e&&e.length,n=w(e);return!m(e)&&!x(e)&&("array"===n||0===t||"number"==typeof t&&0<t&&t-1 in e)}E.fn=E.prototype={jquery:f,constructor:E,length:0,toArray:function(){return s.call(this)},get:function(e){return null==e?s.call(this):e<0?this[e+this.length]:this[e]},pushStack:function(e){var t=E.merge(this.constructor(),e);return t.prevObject=this,t},each:function(e){return E.each(this,e)},map:function(n){return this.pushStack(E.map(this,function(e,t){return n.call(e,t,e)}))},slice:function(){return this.pushStack(s.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},even:function(){return this.pushStack(E.grep(this,function(e,t){return(t+1)%2}))},odd:function(){return this.pushStack(E.grep(this,function(e,t){return t%2}))},eq:function(e){var t=this.length,n=+e+(e<0?t:0);return this.pushStack(0<=n&&n<t?[this[n]]:[])},end:function(){return this.prevObject||this.constructor()},push:u,sort:t.sort,splice:t.splice},E.extend=E.fn.extend=function(){var e,t,n,r,i,o,a=arguments[0]||{},s=1,u=arguments.length,l=!1;for("boolean"==typeof a&&(l=a,a=arguments[s]||{},s++),"object"==typeof a||m(a)||(a={}),s===u&&(a=this,s--);s<u;s++)if(null!=(e=arguments[s]))for(t in e)r=e[t],"__proto__"!==t&&a!==r&&(l&&r&&(E.isPlainObject(r)||(i=Array.isArray(r)))?(n=a[t],o=i&&!Array.isArray(n)?[]:i||E.isPlainObject(n)?n:{},i=!1,a[t]=E.extend(l,o,r)):void 0!==r&&(a[t]=r));return a},E.extend({expando:"jQuery"+(f+Math.random()).replace(/\D/g,""),isReady:!0,error:function(e){throw new Error(e)},noop:function(){},isPlainObject:function(e){var t,n;return!(!e||"[object Object]"!==o.call(e))&&(!(t=r(e))||"function"==typeof(n=y.call(t,"constructor")&&t.constructor)&&a.call(n)===l)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},globalEval:function(e,t,n){b(e,{nonce:t&&t.nonce},n)},each:function(e,t){var n,r=0;if(p(e)){for(n=e.length;r<n;r++)if(!1===t.call(e[r],r,e[r]))break}else for(r in e)if(!1===t.call(e[r],r,e[r]))break;return e},makeArray:function(e,t){var n=t||[];return null!=e&&(p(Object(e))?E.merge(n,"string"==typeof e?[e]:e):u.call(n,e)),n},inArray:function(e,t,n){return null==t?-1:i.call(t,e,n)},merge:function(e,t){for(var n=+t.length,r=0,i=e.length;r<n;r++)e[i++]=t[r];return e.length=i,e},grep:function(e,t,n){for(var r=[],i=0,o=e.length,a=!n;i<o;i++)!t(e[i],i)!==a&&r.push(e[i]);return r},map:function(e,t,n){var r,i,o=0,a=[];if(p(e))for(r=e.length;o<r;o++)null!=(i=t(e[o],o,n))&&a.push(i);else for(o in e)null!=(i=t(e[o],o,n))&&a.push(i);return g(a)},guid:1,support:v}),"function"==typeof Symbol&&(E.fn[Symbol.iterator]=t[Symbol.iterator]),E.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),function(e,t){n["[object "+t+"]"]=t.toLowerCase()});var d=function(n){var e,d,b,o,i,h,f,g,w,u,l,T,C,a,S,y,s,c,v,E="sizzle"+1*new Date,p=n.document,k=0,r=0,m=ue(),x=ue(),A=ue(),N=ue(),j=function(e,t){return e===t&&(l=!0),0},D={}.hasOwnProperty,t=[],q=t.pop,L=t.push,H=t.push,O=t.slice,P=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1},R="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",M="[\\x20\\t\\r\\n\\f]",I="(?:\\\\[\\da-fA-F]{1,6}"+M+"?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+",W="\\["+M+"*("+I+")(?:"+M+"*([*^$|!~]?=)"+M+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+I+"))|)"+M+"*\\]",F=":("+I+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+W+")*)|.*)\\)|)",$=new RegExp(M+"+","g"),B=new RegExp("^"+M+"+|((?:^|[^\\\\])(?:\\\\.)*)"+M+"+$","g"),_=new RegExp("^"+M+"*,"+M+"*"),z=new RegExp("^"+M+"*([>+~]|"+M+")"+M+"*"),U=new RegExp(M+"|>"),X=new RegExp(F),V=new RegExp("^"+I+"$"),G={ID:new RegExp("^#("+I+")"),CLASS:new RegExp("^\\.("+I+")"),TAG:new RegExp("^("+I+"|[*])"),ATTR:new RegExp("^"+W),PSEUDO:new RegExp("^"+F),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+M+"*(even|odd|(([+-]|)(\\d*)n|)"+M+"*(?:([+-]|)"+M+"*(\\d+)|))"+M+"*\\)|)","i"),bool:new RegExp("^(?:"+R+")$","i"),needsContext:new RegExp("^"+M+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+M+"*((?:-\\d)?\\d*)"+M+"*\\)|)(?=[^-]|$)","i")},Y=/HTML$/i,Q=/^(?:input|select|textarea|button)$/i,J=/^h\d$/i,K=/^[^{]+\{\s*\[native \w/,Z=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,ee=/[+~]/,te=new RegExp("\\\\[\\da-fA-F]{1,6}"+M+"?|\\\\([^\\r\\n\\f])","g"),ne=function(e,t){var n="0x"+e.slice(1)-65536;return t||(n<0?String.fromCharCode(n+65536):String.fromCharCode(n>>10|55296,1023&n|56320))},re=/([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,ie=function(e,t){return t?"\0"===e?"\ufffd":e.slice(0,-1)+"\\"+e.charCodeAt(e.length-1).toString(16)+" ":"\\"+e},oe=function(){T()},ae=be(function(e){return!0===e.disabled&&"fieldset"===e.nodeName.toLowerCase()},{dir:"parentNode",next:"legend"});try{H.apply(t=O.call(p.childNodes),p.childNodes),t[p.childNodes.length].nodeType}catch(e){H={apply:t.length?function(e,t){L.apply(e,O.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}function se(t,e,n,r){var i,o,a,s,u,l,c,f=e&&e.ownerDocument,p=e?e.nodeType:9;if(n=n||[],"string"!=typeof t||!t||1!==p&&9!==p&&11!==p)return n;if(!r&&(T(e),e=e||C,S)){if(11!==p&&(u=Z.exec(t)))if(i=u[1]){if(9===p){if(!(a=e.getElementById(i)))return n;if(a.id===i)return n.push(a),n}else if(f&&(a=f.getElementById(i))&&v(e,a)&&a.id===i)return n.push(a),n}else{if(u[2])return H.apply(n,e.getElementsByTagName(t)),n;if((i=u[3])&&d.getElementsByClassName&&e.getElementsByClassName)return H.apply(n,e.getElementsByClassName(i)),n}if(d.qsa&&!N[t+" "]&&(!y||!y.test(t))&&(1!==p||"object"!==e.nodeName.toLowerCase())){if(c=t,f=e,1===p&&(U.test(t)||z.test(t))){(f=ee.test(t)&&ve(e.parentNode)||e)===e&&d.scope||((s=e.getAttribute("id"))?s=s.replace(re,ie):e.setAttribute("id",s=E)),o=(l=h(t)).length;while(o--)l[o]=(s?"#"+s:":scope")+" "+xe(l[o]);c=l.join(",")}try{if(d.cssSupportsSelector&&!CSS.supports("selector(:is("+c+"))"))throw new Error;return H.apply(n,f.querySelectorAll(c)),n}catch(e){N(t,!0)}finally{s===E&&e.removeAttribute("id")}}}return g(t.replace(B,"$1"),e,n,r)}function ue(){var r=[];return function e(t,n){return r.push(t+" ")>b.cacheLength&&delete e[r.shift()],e[t+" "]=n}}function le(e){return e[E]=!0,e}function ce(e){var t=C.createElement("fieldset");try{return!!e(t)}catch(e){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function fe(e,t){var n=e.split("|"),r=n.length;while(r--)b.attrHandle[n[r]]=t}function pe(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&e.sourceIndex-t.sourceIndex;if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function de(t){return function(e){return"input"===e.nodeName.toLowerCase()&&e.type===t}}function he(n){return function(e){var t=e.nodeName.toLowerCase();return("input"===t||"button"===t)&&e.type===n}}function ge(t){return function(e){return"form"in e?e.parentNode&&!1===e.disabled?"label"in e?"label"in e.parentNode?e.parentNode.disabled===t:e.disabled===t:e.isDisabled===t||e.isDisabled!==!t&&ae(e)===t:e.disabled===t:"label"in e&&e.disabled===t}}function ye(a){return le(function(o){return o=+o,le(function(e,t){var n,r=a([],e.length,o),i=r.length;while(i--)e[n=r[i]]&&(e[n]=!(t[n]=e[n]))})})}function ve(e){return e&&"undefined"!=typeof e.getElementsByTagName&&e}for(e in d=se.support={},i=se.isXML=function(e){var t=e&&e.namespaceURI,n=e&&(e.ownerDocument||e).documentElement;return!Y.test(t||n&&n.nodeName||"HTML")},T=se.setDocument=function(e){var t,n,r=e?e.ownerDocument||e:p;return r!=C&&9===r.nodeType&&r.documentElement&&(a=(C=r).documentElement,S=!i(C),p!=C&&(n=C.defaultView)&&n.top!==n&&(n.addEventListener?n.addEventListener("unload",oe,!1):n.attachEvent&&n.attachEvent("onunload",oe)),d.scope=ce(function(e){return a.appendChild(e).appendChild(C.createElement("div")),"undefined"!=typeof e.querySelectorAll&&!e.querySelectorAll(":scope fieldset div").length}),d.cssSupportsSelector=ce(function(){return CSS.supports("selector(*)")&&C.querySelectorAll(":is(:jqfake)")&&!CSS.supports("selector(:is(*,:jqfake))")}),d.attributes=ce(function(e){return e.className="i",!e.getAttribute("className")}),d.getElementsByTagName=ce(function(e){return e.appendChild(C.createComment("")),!e.getElementsByTagName("*").length}),d.getElementsByClassName=K.test(C.getElementsByClassName),d.getById=ce(function(e){return a.appendChild(e).id=E,!C.getElementsByName||!C.getElementsByName(E).length}),d.getById?(b.filter.ID=function(e){var t=e.replace(te,ne);return function(e){return e.getAttribute("id")===t}},b.find.ID=function(e,t){if("undefined"!=typeof t.getElementById&&S){var n=t.getElementById(e);return n?[n]:[]}}):(b.filter.ID=function(e){var n=e.replace(te,ne);return function(e){var t="undefined"!=typeof e.getAttributeNode&&e.getAttributeNode("id");return t&&t.value===n}},b.find.ID=function(e,t){if("undefined"!=typeof t.getElementById&&S){var n,r,i,o=t.getElementById(e);if(o){if((n=o.getAttributeNode("id"))&&n.value===e)return[o];i=t.getElementsByName(e),r=0;while(o=i[r++])if((n=o.getAttributeNode("id"))&&n.value===e)return[o]}return[]}}),b.find.TAG=d.getElementsByTagName?function(e,t){return"undefined"!=typeof t.getElementsByTagName?t.getElementsByTagName(e):d.qsa?t.querySelectorAll(e):void 0}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){while(n=o[i++])1===n.nodeType&&r.push(n);return r}return o},b.find.CLASS=d.getElementsByClassName&&function(e,t){if("undefined"!=typeof t.getElementsByClassName&&S)return t.getElementsByClassName(e)},s=[],y=[],(d.qsa=K.test(C.querySelectorAll))&&(ce(function(e){var t;a.appendChild(e).innerHTML="<a id='"+E+"'></a><select id='"+E+"-\r\\' msallowcapture=''><option selected=''></option></select>",e.querySelectorAll("[msallowcapture^='']").length&&y.push("[*^$]="+M+"*(?:''|\"\")"),e.querySelectorAll("[selected]").length||y.push("\\["+M+"*(?:value|"+R+")"),e.querySelectorAll("[id~="+E+"-]").length||y.push("~="),(t=C.createElement("input")).setAttribute("name",""),e.appendChild(t),e.querySelectorAll("[name='']").length||y.push("\\["+M+"*name"+M+"*="+M+"*(?:''|\"\")"),e.querySelectorAll(":checked").length||y.push(":checked"),e.querySelectorAll("a#"+E+"+*").length||y.push(".#.+[+~]"),e.querySelectorAll("\\\f"),y.push("[\\r\\n\\f]")}),ce(function(e){e.innerHTML="<a href='' disabled='disabled'></a><select disabled='disabled'><option/></select>";var t=C.createElement("input");t.setAttribute("type","hidden"),e.appendChild(t).setAttribute("name","D"),e.querySelectorAll("[name=d]").length&&y.push("name"+M+"*[*^$|!~]?="),2!==e.querySelectorAll(":enabled").length&&y.push(":enabled",":disabled"),a.appendChild(e).disabled=!0,2!==e.querySelectorAll(":disabled").length&&y.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),y.push(",.*:")})),(d.matchesSelector=K.test(c=a.matches||a.webkitMatchesSelector||a.mozMatchesSelector||a.oMatchesSelector||a.msMatchesSelector))&&ce(function(e){d.disconnectedMatch=c.call(e,"*"),c.call(e,"[s!='']:x"),s.push("!=",F)}),d.cssSupportsSelector||y.push(":has"),y=y.length&&new RegExp(y.join("|")),s=s.length&&new RegExp(s.join("|")),t=K.test(a.compareDocumentPosition),v=t||K.test(a.contains)?function(e,t){var n=9===e.nodeType&&e.documentElement||e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},j=t?function(e,t){if(e===t)return l=!0,0;var n=!e.compareDocumentPosition-!t.compareDocumentPosition;return n||(1&(n=(e.ownerDocument||e)==(t.ownerDocument||t)?e.compareDocumentPosition(t):1)||!d.sortDetached&&t.compareDocumentPosition(e)===n?e==C||e.ownerDocument==p&&v(p,e)?-1:t==C||t.ownerDocument==p&&v(p,t)?1:u?P(u,e)-P(u,t):0:4&n?-1:1)}:function(e,t){if(e===t)return l=!0,0;var n,r=0,i=e.parentNode,o=t.parentNode,a=[e],s=[t];if(!i||!o)return e==C?-1:t==C?1:i?-1:o?1:u?P(u,e)-P(u,t):0;if(i===o)return pe(e,t);n=e;while(n=n.parentNode)a.unshift(n);n=t;while(n=n.parentNode)s.unshift(n);while(a[r]===s[r])r++;return r?pe(a[r],s[r]):a[r]==p?-1:s[r]==p?1:0}),C},se.matches=function(e,t){return se(e,null,null,t)},se.matchesSelector=function(e,t){if(T(e),d.matchesSelector&&S&&!N[t+" "]&&(!s||!s.test(t))&&(!y||!y.test(t)))try{var n=c.call(e,t);if(n||d.disconnectedMatch||e.document&&11!==e.document.nodeType)return n}catch(e){N(t,!0)}return 0<se(t,C,null,[e]).length},se.contains=function(e,t){return(e.ownerDocument||e)!=C&&T(e),v(e,t)},se.attr=function(e,t){(e.ownerDocument||e)!=C&&T(e);var n=b.attrHandle[t.toLowerCase()],r=n&&D.call(b.attrHandle,t.toLowerCase())?n(e,t,!S):void 0;return void 0!==r?r:d.attributes||!S?e.getAttribute(t):(r=e.getAttributeNode(t))&&r.specified?r.value:null},se.escape=function(e){return(e+"").replace(re,ie)},se.error=function(e){throw new Error("Syntax error, unrecognized expression: "+e)},se.uniqueSort=function(e){var t,n=[],r=0,i=0;if(l=!d.detectDuplicates,u=!d.sortStable&&e.slice(0),e.sort(j),l){while(t=e[i++])t===e[i]&&(r=n.push(i));while(r--)e.splice(n[r],1)}return u=null,e},o=se.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(1===i||9===i||11===i){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=o(e)}else if(3===i||4===i)return e.nodeValue}else while(t=e[r++])n+=o(t);return n},(b=se.selectors={cacheLength:50,createPseudo:le,match:G,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(te,ne),e[3]=(e[3]||e[4]||e[5]||"").replace(te,ne),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||se.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&se.error(e[0]),e},PSEUDO:function(e){var t,n=!e[6]&&e[2];return G.CHILD.test(e[0])?null:(e[3]?e[2]=e[4]||e[5]||"":n&&X.test(n)&&(t=h(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(te,ne).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=m[e+" "];return t||(t=new RegExp("(^|"+M+")"+e+"("+M+"|$)"))&&m(e,function(e){return t.test("string"==typeof e.className&&e.className||"undefined"!=typeof e.getAttribute&&e.getAttribute("class")||"")})},ATTR:function(n,r,i){return function(e){var t=se.attr(e,n);return null==t?"!="===r:!r||(t+="","="===r?t===i:"!="===r?t!==i:"^="===r?i&&0===t.indexOf(i):"*="===r?i&&-1<t.indexOf(i):"$="===r?i&&t.slice(-i.length)===i:"~="===r?-1<(" "+t.replace($," ")+" ").indexOf(i):"|="===r&&(t===i||t.slice(0,i.length+1)===i+"-"))}},CHILD:function(h,e,t,g,y){var v="nth"!==h.slice(0,3),m="last"!==h.slice(-4),x="of-type"===e;return 1===g&&0===y?function(e){return!!e.parentNode}:function(e,t,n){var r,i,o,a,s,u,l=v!==m?"nextSibling":"previousSibling",c=e.parentNode,f=x&&e.nodeName.toLowerCase(),p=!n&&!x,d=!1;if(c){if(v){while(l){a=e;while(a=a[l])if(x?a.nodeName.toLowerCase()===f:1===a.nodeType)return!1;u=l="only"===h&&!u&&"nextSibling"}return!0}if(u=[m?c.firstChild:c.lastChild],m&&p){d=(s=(r=(i=(o=(a=c)[E]||(a[E]={}))[a.uniqueID]||(o[a.uniqueID]={}))[h]||[])[0]===k&&r[1])&&r[2],a=s&&c.childNodes[s];while(a=++s&&a&&a[l]||(d=s=0)||u.pop())if(1===a.nodeType&&++d&&a===e){i[h]=[k,s,d];break}}else if(p&&(d=s=(r=(i=(o=(a=e)[E]||(a[E]={}))[a.uniqueID]||(o[a.uniqueID]={}))[h]||[])[0]===k&&r[1]),!1===d)while(a=++s&&a&&a[l]||(d=s=0)||u.pop())if((x?a.nodeName.toLowerCase()===f:1===a.nodeType)&&++d&&(p&&((i=(o=a[E]||(a[E]={}))[a.uniqueID]||(o[a.uniqueID]={}))[h]=[k,d]),a===e))break;return(d-=y)===g||d%g==0&&0<=d/g}}},PSEUDO:function(e,o){var t,a=b.pseudos[e]||b.setFilters[e.toLowerCase()]||se.error("unsupported pseudo: "+e);return a[E]?a(o):1<a.length?(t=[e,e,"",o],b.setFilters.hasOwnProperty(e.toLowerCase())?le(function(e,t){var n,r=a(e,o),i=r.length;while(i--)e[n=P(e,r[i])]=!(t[n]=r[i])}):function(e){return a(e,0,t)}):a}},pseudos:{not:le(function(e){var r=[],i=[],s=f(e.replace(B,"$1"));return s[E]?le(function(e,t,n,r){var i,o=s(e,null,r,[]),a=e.length;while(a--)(i=o[a])&&(e[a]=!(t[a]=i))}):function(e,t,n){return r[0]=e,s(r,null,n,i),r[0]=null,!i.pop()}}),has:le(function(t){return function(e){return 0<se(t,e).length}}),contains:le(function(t){return t=t.replace(te,ne),function(e){return-1<(e.textContent||o(e)).indexOf(t)}}),lang:le(function(n){return V.test(n||"")||se.error("unsupported lang: "+n),n=n.replace(te,ne).toLowerCase(),function(e){var t;do{if(t=S?e.lang:e.getAttribute("xml:lang")||e.getAttribute("lang"))return(t=t.toLowerCase())===n||0===t.indexOf(n+"-")}while((e=e.parentNode)&&1===e.nodeType);return!1}}),target:function(e){var t=n.location&&n.location.hash;return t&&t.slice(1)===e.id},root:function(e){return e===a},focus:function(e){return e===C.activeElement&&(!C.hasFocus||C.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:ge(!1),disabled:ge(!0),checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,!0===e.selected},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeType<6)return!1;return!0},parent:function(e){return!b.pseudos.empty(e)},header:function(e){return J.test(e.nodeName)},input:function(e){return Q.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||"text"===t.toLowerCase())},first:ye(function(){return[0]}),last:ye(function(e,t){return[t-1]}),eq:ye(function(e,t,n){return[n<0?n+t:n]}),even:ye(function(e,t){for(var n=0;n<t;n+=2)e.push(n);return e}),odd:ye(function(e,t){for(var n=1;n<t;n+=2)e.push(n);return e}),lt:ye(function(e,t,n){for(var r=n<0?n+t:t<n?t:n;0<=--r;)e.push(r);return e}),gt:ye(function(e,t,n){for(var r=n<0?n+t:n;++r<t;)e.push(r);return e})}}).pseudos.nth=b.pseudos.eq,{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})b.pseudos[e]=de(e);for(e in{submit:!0,reset:!0})b.pseudos[e]=he(e);function me(){}function xe(e){for(var t=0,n=e.length,r="";t<n;t++)r+=e[t].value;return r}function be(s,e,t){var u=e.dir,l=e.next,c=l||u,f=t&&"parentNode"===c,p=r++;return e.first?function(e,t,n){while(e=e[u])if(1===e.nodeType||f)return s(e,t,n);return!1}:function(e,t,n){var r,i,o,a=[k,p];if(n){while(e=e[u])if((1===e.nodeType||f)&&s(e,t,n))return!0}else while(e=e[u])if(1===e.nodeType||f)if(i=(o=e[E]||(e[E]={}))[e.uniqueID]||(o[e.uniqueID]={}),l&&l===e.nodeName.toLowerCase())e=e[u]||e;else{if((r=i[c])&&r[0]===k&&r[1]===p)return a[2]=r[2];if((i[c]=a)[2]=s(e,t,n))return!0}return!1}}function we(i){return 1<i.length?function(e,t,n){var r=i.length;while(r--)if(!i[r](e,t,n))return!1;return!0}:i[0]}function Te(e,t,n,r,i){for(var o,a=[],s=0,u=e.length,l=null!=t;s<u;s++)(o=e[s])&&(n&&!n(o,r,i)||(a.push(o),l&&t.push(s)));return a}function Ce(d,h,g,y,v,e){return y&&!y[E]&&(y=Ce(y)),v&&!v[E]&&(v=Ce(v,e)),le(function(e,t,n,r){var i,o,a,s=[],u=[],l=t.length,c=e||function(e,t,n){for(var r=0,i=t.length;r<i;r++)se(e,t[r],n);return n}(h||"*",n.nodeType?[n]:n,[]),f=!d||!e&&h?c:Te(c,s,d,n,r),p=g?v||(e?d:l||y)?[]:t:f;if(g&&g(f,p,n,r),y){i=Te(p,u),y(i,[],n,r),o=i.length;while(o--)(a=i[o])&&(p[u[o]]=!(f[u[o]]=a))}if(e){if(v||d){if(v){i=[],o=p.length;while(o--)(a=p[o])&&i.push(f[o]=a);v(null,p=[],i,r)}o=p.length;while(o--)(a=p[o])&&-1<(i=v?P(e,a):s[o])&&(e[i]=!(t[i]=a))}}else p=Te(p===t?p.splice(l,p.length):p),v?v(null,t,p,r):H.apply(t,p)})}function Se(e){for(var i,t,n,r=e.length,o=b.relative[e[0].type],a=o||b.relative[" "],s=o?1:0,u=be(function(e){return e===i},a,!0),l=be(function(e){return-1<P(i,e)},a,!0),c=[function(e,t,n){var r=!o&&(n||t!==w)||((i=t).nodeType?u(e,t,n):l(e,t,n));return i=null,r}];s<r;s++)if(t=b.relative[e[s].type])c=[be(we(c),t)];else{if((t=b.filter[e[s].type].apply(null,e[s].matches))[E]){for(n=++s;n<r;n++)if(b.relative[e[n].type])break;return Ce(1<s&&we(c),1<s&&xe(e.slice(0,s-1).concat({value:" "===e[s-2].type?"*":""})).replace(B,"$1"),t,s<n&&Se(e.slice(s,n)),n<r&&Se(e=e.slice(n)),n<r&&xe(e))}c.push(t)}return we(c)}return me.prototype=b.filters=b.pseudos,b.setFilters=new me,h=se.tokenize=function(e,t){var n,r,i,o,a,s,u,l=x[e+" "];if(l)return t?0:l.slice(0);a=e,s=[],u=b.preFilter;while(a){for(o in n&&!(r=_.exec(a))||(r&&(a=a.slice(r[0].length)||a),s.push(i=[])),n=!1,(r=z.exec(a))&&(n=r.shift(),i.push({value:n,type:r[0].replace(B," ")}),a=a.slice(n.length)),b.filter)!(r=G[o].exec(a))||u[o]&&!(r=u[o](r))||(n=r.shift(),i.push({value:n,type:o,matches:r}),a=a.slice(n.length));if(!n)break}return t?a.length:a?se.error(e):x(e,s).slice(0)},f=se.compile=function(e,t){var n,y,v,m,x,r,i=[],o=[],a=A[e+" "];if(!a){t||(t=h(e)),n=t.length;while(n--)(a=Se(t[n]))[E]?i.push(a):o.push(a);(a=A(e,(y=o,m=0<(v=i).length,x=0<y.length,r=function(e,t,n,r,i){var o,a,s,u=0,l="0",c=e&&[],f=[],p=w,d=e||x&&b.find.TAG("*",i),h=k+=null==p?1:Math.random()||.1,g=d.length;for(i&&(w=t==C||t||i);l!==g&&null!=(o=d[l]);l++){if(x&&o){a=0,t||o.ownerDocument==C||(T(o),n=!S);while(s=y[a++])if(s(o,t||C,n)){r.push(o);break}i&&(k=h)}m&&((o=!s&&o)&&u--,e&&c.push(o))}if(u+=l,m&&l!==u){a=0;while(s=v[a++])s(c,f,t,n);if(e){if(0<u)while(l--)c[l]||f[l]||(f[l]=q.call(r));f=Te(f)}H.apply(r,f),i&&!e&&0<f.length&&1<u+v.length&&se.uniqueSort(r)}return i&&(k=h,w=p),c},m?le(r):r))).selector=e}return a},g=se.select=function(e,t,n,r){var i,o,a,s,u,l="function"==typeof e&&e,c=!r&&h(e=l.selector||e);if(n=n||[],1===c.length){if(2<(o=c[0]=c[0].slice(0)).length&&"ID"===(a=o[0]).type&&9===t.nodeType&&S&&b.relative[o[1].type]){if(!(t=(b.find.ID(a.matches[0].replace(te,ne),t)||[])[0]))return n;l&&(t=t.parentNode),e=e.slice(o.shift().value.length)}i=G.needsContext.test(e)?0:o.length;while(i--){if(a=o[i],b.relative[s=a.type])break;if((u=b.find[s])&&(r=u(a.matches[0].replace(te,ne),ee.test(o[0].type)&&ve(t.parentNode)||t))){if(o.splice(i,1),!(e=r.length&&xe(o)))return H.apply(n,r),n;break}}}return(l||f(e,c))(r,t,!S,n,!t||ee.test(e)&&ve(t.parentNode)||t),n},d.sortStable=E.split("").sort(j).join("")===E,d.detectDuplicates=!!l,T(),d.sortDetached=ce(function(e){return 1&e.compareDocumentPosition(C.createElement("fieldset"))}),ce(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||fe("type|href|height|width",function(e,t,n){if(!n)return e.getAttribute(t,"type"===t.toLowerCase()?1:2)}),d.attributes&&ce(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||fe("value",function(e,t,n){if(!n&&"input"===e.nodeName.toLowerCase())return e.defaultValue}),ce(function(e){return null==e.getAttribute("disabled")})||fe(R,function(e,t,n){var r;if(!n)return!0===e[t]?t.toLowerCase():(r=e.getAttributeNode(t))&&r.specified?r.value:null}),se}(C);E.find=d,E.expr=d.selectors,E.expr[":"]=E.expr.pseudos,E.uniqueSort=E.unique=d.uniqueSort,E.text=d.getText,E.isXMLDoc=d.isXML,E.contains=d.contains,E.escapeSelector=d.escape;var h=function(e,t,n){var r=[],i=void 0!==n;while((e=e[t])&&9!==e.nodeType)if(1===e.nodeType){if(i&&E(e).is(n))break;r.push(e)}return r},T=function(e,t){for(var n=[];e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n},k=E.expr.match.needsContext;function A(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()}var N=/^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i;function j(e,n,r){return m(n)?E.grep(e,function(e,t){return!!n.call(e,t,e)!==r}):n.nodeType?E.grep(e,function(e){return e===n!==r}):"string"!=typeof n?E.grep(e,function(e){return-1<i.call(n,e)!==r}):E.filter(n,e,r)}E.filter=function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?E.find.matchesSelector(r,e)?[r]:[]:E.find.matches(e,E.grep(t,function(e){return 1===e.nodeType}))},E.fn.extend({find:function(e){var t,n,r=this.length,i=this;if("string"!=typeof e)return this.pushStack(E(e).filter(function(){for(t=0;t<r;t++)if(E.contains(i[t],this))return!0}));for(n=this.pushStack([]),t=0;t<r;t++)E.find(e,i[t],n);return 1<r?E.uniqueSort(n):n},filter:function(e){return this.pushStack(j(this,e||[],!1))},not:function(e){return this.pushStack(j(this,e||[],!0))},is:function(e){return!!j(this,"string"==typeof e&&k.test(e)?E(e):e||[],!1).length}});var D,q=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;(E.fn.init=function(e,t,n){var r,i;if(!e)return this;if(n=n||D,"string"==typeof e){if(!(r="<"===e[0]&&">"===e[e.length-1]&&3<=e.length?[null,e,null]:q.exec(e))||!r[1]&&t)return!t||t.jquery?(t||n).find(e):this.constructor(t).find(e);if(r[1]){if(t=t instanceof E?t[0]:t,E.merge(this,E.parseHTML(r[1],t&&t.nodeType?t.ownerDocument||t:S,!0)),N.test(r[1])&&E.isPlainObject(t))for(r in t)m(this[r])?this[r](t[r]):this.attr(r,t[r]);return this}return(i=S.getElementById(r[2]))&&(this[0]=i,this.length=1),this}return e.nodeType?(this[0]=e,this.length=1,this):m(e)?void 0!==n.ready?n.ready(e):e(E):E.makeArray(e,this)}).prototype=E.fn,D=E(S);var L=/^(?:parents|prev(?:Until|All))/,H={children:!0,contents:!0,next:!0,prev:!0};function O(e,t){while((e=e[t])&&1!==e.nodeType);return e}E.fn.extend({has:function(e){var t=E(e,this),n=t.length;return this.filter(function(){for(var e=0;e<n;e++)if(E.contains(this,t[e]))return!0})},closest:function(e,t){var n,r=0,i=this.length,o=[],a="string"!=typeof e&&E(e);if(!k.test(e))for(;r<i;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(n.nodeType<11&&(a?-1<a.index(n):1===n.nodeType&&E.find.matchesSelector(n,e))){o.push(n);break}return this.pushStack(1<o.length?E.uniqueSort(o):o)},index:function(e){return e?"string"==typeof e?i.call(E(e),this[0]):i.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){return this.pushStack(E.uniqueSort(E.merge(this.get(),E(e,t))))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}}),E.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return h(e,"parentNode")},parentsUntil:function(e,t,n){return h(e,"parentNode",n)},next:function(e){return O(e,"nextSibling")},prev:function(e){return O(e,"previousSibling")},nextAll:function(e){return h(e,"nextSibling")},prevAll:function(e){return h(e,"previousSibling")},nextUntil:function(e,t,n){return h(e,"nextSibling",n)},prevUntil:function(e,t,n){return h(e,"previousSibling",n)},siblings:function(e){return T((e.parentNode||{}).firstChild,e)},children:function(e){return T(e.firstChild)},contents:function(e){return null!=e.contentDocument&&r(e.contentDocument)?e.contentDocument:(A(e,"template")&&(e=e.content||e),E.merge([],e.childNodes))}},function(r,i){E.fn[r]=function(e,t){var n=E.map(this,i,e);return"Until"!==r.slice(-5)&&(t=e),t&&"string"==typeof t&&(n=E.filter(t,n)),1<this.length&&(H[r]||E.uniqueSort(n),L.test(r)&&n.reverse()),this.pushStack(n)}});var P=/[^\x20\t\r\n\f]+/g;function R(e){return e}function M(e){throw e}function I(e,t,n,r){var i;try{e&&m(i=e.promise)?i.call(e).done(t).fail(n):e&&m(i=e.then)?i.call(e,t,n):t.apply(void 0,[e].slice(r))}catch(e){n.apply(void 0,[e])}}E.Callbacks=function(r){var e,n;r="string"==typeof r?(e=r,n={},E.each(e.match(P)||[],function(e,t){n[t]=!0}),n):E.extend({},r);var i,t,o,a,s=[],u=[],l=-1,c=function(){for(a=a||r.once,o=i=!0;u.length;l=-1){t=u.shift();while(++l<s.length)!1===s[l].apply(t[0],t[1])&&r.stopOnFalse&&(l=s.length,t=!1)}r.memory||(t=!1),i=!1,a&&(s=t?[]:"")},f={add:function(){return s&&(t&&!i&&(l=s.length-1,u.push(t)),function n(e){E.each(e,function(e,t){m(t)?r.unique&&f.has(t)||s.push(t):t&&t.length&&"string"!==w(t)&&n(t)})}(arguments),t&&!i&&c()),this},remove:function(){return E.each(arguments,function(e,t){var n;while(-1<(n=E.inArray(t,s,n)))s.splice(n,1),n<=l&&l--}),this},has:function(e){return e?-1<E.inArray(e,s):0<s.length},empty:function(){return s&&(s=[]),this},disable:function(){return a=u=[],s=t="",this},disabled:function(){return!s},lock:function(){return a=u=[],t||i||(s=t=""),this},locked:function(){return!!a},fireWith:function(e,t){return a||(t=[e,(t=t||[]).slice?t.slice():t],u.push(t),i||c()),this},fire:function(){return f.fireWith(this,arguments),this},fired:function(){return!!o}};return f},E.extend({Deferred:function(e){var o=[["notify","progress",E.Callbacks("memory"),E.Callbacks("memory"),2],["resolve","done",E.Callbacks("once memory"),E.Callbacks("once memory"),0,"resolved"],["reject","fail",E.Callbacks("once memory"),E.Callbacks("once memory"),1,"rejected"]],i="pending",a={state:function(){return i},always:function(){return s.done(arguments).fail(arguments),this},"catch":function(e){return a.then(null,e)},pipe:function(){var i=arguments;return E.Deferred(function(r){E.each(o,function(e,t){var n=m(i[t[4]])&&i[t[4]];s[t[1]](function(){var e=n&&n.apply(this,arguments);e&&m(e.promise)?e.promise().progress(r.notify).done(r.resolve).fail(r.reject):r[t[0]+"With"](this,n?[e]:arguments)})}),i=null}).promise()},then:function(t,n,r){var u=0;function l(i,o,a,s){return function(){var n=this,r=arguments,e=function(){var e,t;if(!(i<u)){if((e=a.apply(n,r))===o.promise())throw new TypeError("Thenable self-resolution");t=e&&("object"==typeof e||"function"==typeof e)&&e.then,m(t)?s?t.call(e,l(u,o,R,s),l(u,o,M,s)):(u++,t.call(e,l(u,o,R,s),l(u,o,M,s),l(u,o,R,o.notifyWith))):(a!==R&&(n=void 0,r=[e]),(s||o.resolveWith)(n,r))}},t=s?e:function(){try{e()}catch(e){E.Deferred.exceptionHook&&E.Deferred.exceptionHook(e,t.stackTrace),u<=i+1&&(a!==M&&(n=void 0,r=[e]),o.rejectWith(n,r))}};i?t():(E.Deferred.getStackHook&&(t.stackTrace=E.Deferred.getStackHook()),C.setTimeout(t))}}return E.Deferred(function(e){o[0][3].add(l(0,e,m(r)?r:R,e.notifyWith)),o[1][3].add(l(0,e,m(t)?t:R)),o[2][3].add(l(0,e,m(n)?n:M))}).promise()},promise:function(e){return null!=e?E.extend(e,a):a}},s={};return E.each(o,function(e,t){var n=t[2],r=t[5];a[t[1]]=n.add,r&&n.add(function(){i=r},o[3-e][2].disable,o[3-e][3].disable,o[0][2].lock,o[0][3].lock),n.add(t[3].fire),s[t[0]]=function(){return s[t[0]+"With"](this===s?void 0:this,arguments),this},s[t[0]+"With"]=n.fireWith}),a.promise(s),e&&e.call(s,s),s},when:function(e){var n=arguments.length,t=n,r=Array(t),i=s.call(arguments),o=E.Deferred(),a=function(t){return function(e){r[t]=this,i[t]=1<arguments.length?s.call(arguments):e,--n||o.resolveWith(r,i)}};if(n<=1&&(I(e,o.done(a(t)).resolve,o.reject,!n),"pending"===o.state()||m(i[t]&&i[t].then)))return o.then();while(t--)I(i[t],a(t),o.reject);return o.promise()}});var W=/^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;E.Deferred.exceptionHook=function(e,t){C.console&&C.console.warn&&e&&W.test(e.name)&&C.console.warn("jQuery.Deferred exception: "+e.message,e.stack,t)},E.readyException=function(e){C.setTimeout(function(){throw e})};var F=E.Deferred();function $(){S.removeEventListener("DOMContentLoaded",$),C.removeEventListener("load",$),E.ready()}E.fn.ready=function(e){return F.then(e)["catch"](function(e){E.readyException(e)}),this},E.extend({isReady:!1,readyWait:1,ready:function(e){(!0===e?--E.readyWait:E.isReady)||(E.isReady=!0)!==e&&0<--E.readyWait||F.resolveWith(S,[E])}}),E.ready.then=F.then,"complete"===S.readyState||"loading"!==S.readyState&&!S.documentElement.doScroll?C.setTimeout(E.ready):(S.addEventListener("DOMContentLoaded",$),C.addEventListener("load",$));var B=function(e,t,n,r,i,o,a){var s=0,u=e.length,l=null==n;if("object"===w(n))for(s in i=!0,n)B(e,t,s,n[s],!0,o,a);else if(void 0!==r&&(i=!0,m(r)||(a=!0),l&&(a?(t.call(e,r),t=null):(l=t,t=function(e,t,n){return l.call(E(e),n)})),t))for(;s<u;s++)t(e[s],n,a?r:r.call(e[s],s,t(e[s],n)));return i?e:l?t.call(e):u?t(e[0],n):o},_=/^-ms-/,z=/-([a-z])/g;function U(e,t){return t.toUpperCase()}function X(e){return e.replace(_,"ms-").replace(z,U)}var V=function(e){return 1===e.nodeType||9===e.nodeType||!+e.nodeType};function G(){this.expando=E.expando+G.uid++}G.uid=1,G.prototype={cache:function(e){var t=e[this.expando];return t||(t={},V(e)&&(e.nodeType?e[this.expando]=t:Object.defineProperty(e,this.expando,{value:t,configurable:!0}))),t},set:function(e,t,n){var r,i=this.cache(e);if("string"==typeof t)i[X(t)]=n;else for(r in t)i[X(r)]=t[r];return i},get:function(e,t){return void 0===t?this.cache(e):e[this.expando]&&e[this.expando][X(t)]},access:function(e,t,n){return void 0===t||t&&"string"==typeof t&&void 0===n?this.get(e,t):(this.set(e,t,n),void 0!==n?n:t)},remove:function(e,t){var n,r=e[this.expando];if(void 0!==r){if(void 0!==t){n=(t=Array.isArray(t)?t.map(X):(t=X(t))in r?[t]:t.match(P)||[]).length;while(n--)delete r[t[n]]}(void 0===t||E.isEmptyObject(r))&&(e.nodeType?e[this.expando]=void 0:delete e[this.expando])}},hasData:function(e){var t=e[this.expando];return void 0!==t&&!E.isEmptyObject(t)}};var Y=new G,Q=new G,J=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,K=/[A-Z]/g;function Z(e,t,n){var r,i;if(void 0===n&&1===e.nodeType)if(r="data-"+t.replace(K,"-$&").toLowerCase(),"string"==typeof(n=e.getAttribute(r))){try{n="true"===(i=n)||"false"!==i&&("null"===i?null:i===+i+""?+i:J.test(i)?JSON.parse(i):i)}catch(e){}Q.set(e,t,n)}else n=void 0;return n}E.extend({hasData:function(e){return Q.hasData(e)||Y.hasData(e)},data:function(e,t,n){return Q.access(e,t,n)},removeData:function(e,t){Q.remove(e,t)},_data:function(e,t,n){return Y.access(e,t,n)},_removeData:function(e,t){Y.remove(e,t)}}),E.fn.extend({data:function(n,e){var t,r,i,o=this[0],a=o&&o.attributes;if(void 0===n){if(this.length&&(i=Q.get(o),1===o.nodeType&&!Y.get(o,"hasDataAttrs"))){t=a.length;while(t--)a[t]&&0===(r=a[t].name).indexOf("data-")&&(r=X(r.slice(5)),Z(o,r,i[r]));Y.set(o,"hasDataAttrs",!0)}return i}return"object"==typeof n?this.each(function(){Q.set(this,n)}):B(this,function(e){var t;if(o&&void 0===e)return void 0!==(t=Q.get(o,n))?t:void 0!==(t=Z(o,n))?t:void 0;this.each(function(){Q.set(this,n,e)})},null,e,1<arguments.length,null,!0)},removeData:function(e){return this.each(function(){Q.remove(this,e)})}}),E.extend({queue:function(e,t,n){var r;if(e)return t=(t||"fx")+"queue",r=Y.get(e,t),n&&(!r||Array.isArray(n)?r=Y.access(e,t,E.makeArray(n)):r.push(n)),r||[]},dequeue:function(e,t){t=t||"fx";var n=E.queue(e,t),r=n.length,i=n.shift(),o=E._queueHooks(e,t);"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,function(){E.dequeue(e,t)},o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return Y.get(e,n)||Y.access(e,n,{empty:E.Callbacks("once memory").add(function(){Y.remove(e,[t+"queue",n])})})}}),E.fn.extend({queue:function(t,n){var e=2;return"string"!=typeof t&&(n=t,t="fx",e--),arguments.length<e?E.queue(this[0],t):void 0===n?this:this.each(function(){var e=E.queue(this,t,n);E._queueHooks(this,t),"fx"===t&&"inprogress"!==e[0]&&E.dequeue(this,t)})},dequeue:function(e){return this.each(function(){E.dequeue(this,e)})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,t){var n,r=1,i=E.Deferred(),o=this,a=this.length,s=function(){--r||i.resolveWith(o,[o])};"string"!=typeof e&&(t=e,e=void 0),e=e||"fx";while(a--)(n=Y.get(o[a],e+"queueHooks"))&&n.empty&&(r++,n.empty.add(s));return s(),i.promise(t)}});var ee=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,te=new RegExp("^(?:([+-])=|)("+ee+")([a-z%]*)$","i"),ne=["Top","Right","Bottom","Left"],re=S.documentElement,ie=function(e){return E.contains(e.ownerDocument,e)},oe={composed:!0};re.getRootNode&&(ie=function(e){return E.contains(e.ownerDocument,e)||e.getRootNode(oe)===e.ownerDocument});var ae=function(e,t){return"none"===(e=t||e).style.display||""===e.style.display&&ie(e)&&"none"===E.css(e,"display")};function se(e,t,n,r){var i,o,a=20,s=r?function(){return r.cur()}:function(){return E.css(e,t,"")},u=s(),l=n&&n[3]||(E.cssNumber[t]?"":"px"),c=e.nodeType&&(E.cssNumber[t]||"px"!==l&&+u)&&te.exec(E.css(e,t));if(c&&c[3]!==l){u/=2,l=l||c[3],c=+u||1;while(a--)E.style(e,t,c+l),(1-o)*(1-(o=s()/u||.5))<=0&&(a=0),c/=o;c*=2,E.style(e,t,c+l),n=n||[]}return n&&(c=+c||+u||0,i=n[1]?c+(n[1]+1)*n[2]:+n[2],r&&(r.unit=l,r.start=c,r.end=i)),i}var ue={};function le(e,t){for(var n,r,i,o,a,s,u,l=[],c=0,f=e.length;c<f;c++)(r=e[c]).style&&(n=r.style.display,t?("none"===n&&(l[c]=Y.get(r,"display")||null,l[c]||(r.style.display="")),""===r.style.display&&ae(r)&&(l[c]=(u=a=o=void 0,a=(i=r).ownerDocument,s=i.nodeName,(u=ue[s])||(o=a.body.appendChild(a.createElement(s)),u=E.css(o,"display"),o.parentNode.removeChild(o),"none"===u&&(u="block"),ue[s]=u)))):"none"!==n&&(l[c]="none",Y.set(r,"display",n)));for(c=0;c<f;c++)null!=l[c]&&(e[c].style.display=l[c]);return e}E.fn.extend({show:function(){return le(this,!0)},hide:function(){return le(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){ae(this)?E(this).show():E(this).hide()})}});var ce,fe,pe=/^(?:checkbox|radio)$/i,de=/<([a-z][^\/\0>\x20\t\r\n\f]*)/i,he=/^$|^module$|\/(?:java|ecma)script/i;ce=S.createDocumentFragment().appendChild(S.createElement("div")),(fe=S.createElement("input")).setAttribute("type","radio"),fe.setAttribute("checked","checked"),fe.setAttribute("name","t"),ce.appendChild(fe),v.checkClone=ce.cloneNode(!0).cloneNode(!0).lastChild.checked,ce.innerHTML="<textarea>x</textarea>",v.noCloneChecked=!!ce.cloneNode(!0).lastChild.defaultValue,ce.innerHTML="<option></option>",v.option=!!ce.lastChild;var ge={thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};function ye(e,t){var n;return n="undefined"!=typeof e.getElementsByTagName?e.getElementsByTagName(t||"*"):"undefined"!=typeof e.querySelectorAll?e.querySelectorAll(t||"*"):[],void 0===t||t&&A(e,t)?E.merge([e],n):n}function ve(e,t){for(var n=0,r=e.length;n<r;n++)Y.set(e[n],"globalEval",!t||Y.get(t[n],"globalEval"))}ge.tbody=ge.tfoot=ge.colgroup=ge.caption=ge.thead,ge.th=ge.td,v.option||(ge.optgroup=ge.option=[1,"<select multiple='multiple'>","</select>"]);var me=/<|&#?\w+;/;function xe(e,t,n,r,i){for(var o,a,s,u,l,c,f=t.createDocumentFragment(),p=[],d=0,h=e.length;d<h;d++)if((o=e[d])||0===o)if("object"===w(o))E.merge(p,o.nodeType?[o]:o);else if(me.test(o)){a=a||f.appendChild(t.createElement("div")),s=(de.exec(o)||["",""])[1].toLowerCase(),u=ge[s]||ge._default,a.innerHTML=u[1]+E.htmlPrefilter(o)+u[2],c=u[0];while(c--)a=a.lastChild;E.merge(p,a.childNodes),(a=f.firstChild).textContent=""}else p.push(t.createTextNode(o));f.textContent="",d=0;while(o=p[d++])if(r&&-1<E.inArray(o,r))i&&i.push(o);else if(l=ie(o),a=ye(f.appendChild(o),"script"),l&&ve(a),n){c=0;while(o=a[c++])he.test(o.type||"")&&n.push(o)}return f}var be=/^([^.]*)(?:\.(.+)|)/;function we(){return!0}function Te(){return!1}function Ce(e,t){return e===function(){try{return S.activeElement}catch(e){}}()==("focus"===t)}function Se(e,t,n,r,i,o){var a,s;if("object"==typeof t){for(s in"string"!=typeof n&&(r=r||n,n=void 0),t)Se(e,s,n,r,t[s],o);return e}if(null==r&&null==i?(i=n,r=n=void 0):null==i&&("string"==typeof n?(i=r,r=void 0):(i=r,r=n,n=void 0)),!1===i)i=Te;else if(!i)return e;return 1===o&&(a=i,(i=function(e){return E().off(e),a.apply(this,arguments)}).guid=a.guid||(a.guid=E.guid++)),e.each(function(){E.event.add(this,t,i,r,n)})}function Ee(e,i,o){o?(Y.set(e,i,!1),E.event.add(e,i,{namespace:!1,handler:function(e){var t,n,r=Y.get(this,i);if(1&e.isTrigger&&this[i]){if(r.length)(E.event.special[i]||{}).delegateType&&e.stopPropagation();else if(r=s.call(arguments),Y.set(this,i,r),t=o(this,i),this[i](),r!==(n=Y.get(this,i))||t?Y.set(this,i,!1):n={},r!==n)return e.stopImmediatePropagation(),e.preventDefault(),n&&n.value}else r.length&&(Y.set(this,i,{value:E.event.trigger(E.extend(r[0],E.Event.prototype),r.slice(1),this)}),e.stopImmediatePropagation())}})):void 0===Y.get(e,i)&&E.event.add(e,i,we)}E.event={global:{},add:function(t,e,n,r,i){var o,a,s,u,l,c,f,p,d,h,g,y=Y.get(t);if(V(t)){n.handler&&(n=(o=n).handler,i=o.selector),i&&E.find.matchesSelector(re,i),n.guid||(n.guid=E.guid++),(u=y.events)||(u=y.events=Object.create(null)),(a=y.handle)||(a=y.handle=function(e){return"undefined"!=typeof E&&E.event.triggered!==e.type?E.event.dispatch.apply(t,arguments):void 0}),l=(e=(e||"").match(P)||[""]).length;while(l--)d=g=(s=be.exec(e[l])||[])[1],h=(s[2]||"").split(".").sort(),d&&(f=E.event.special[d]||{},d=(i?f.delegateType:f.bindType)||d,f=E.event.special[d]||{},c=E.extend({type:d,origType:g,data:r,handler:n,guid:n.guid,selector:i,needsContext:i&&E.expr.match.needsContext.test(i),namespace:h.join(".")},o),(p=u[d])||((p=u[d]=[]).delegateCount=0,f.setup&&!1!==f.setup.call(t,r,h,a)||t.addEventListener&&t.addEventListener(d,a)),f.add&&(f.add.call(t,c),c.handler.guid||(c.handler.guid=n.guid)),i?p.splice(p.delegateCount++,0,c):p.push(c),E.event.global[d]=!0)}},remove:function(e,t,n,r,i){var o,a,s,u,l,c,f,p,d,h,g,y=Y.hasData(e)&&Y.get(e);if(y&&(u=y.events)){l=(t=(t||"").match(P)||[""]).length;while(l--)if(d=g=(s=be.exec(t[l])||[])[1],h=(s[2]||"").split(".").sort(),d){f=E.event.special[d]||{},p=u[d=(r?f.delegateType:f.bindType)||d]||[],s=s[2]&&new RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"),a=o=p.length;while(o--)c=p[o],!i&&g!==c.origType||n&&n.guid!==c.guid||s&&!s.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(p.splice(o,1),c.selector&&p.delegateCount--,f.remove&&f.remove.call(e,c));a&&!p.length&&(f.teardown&&!1!==f.teardown.call(e,h,y.handle)||E.removeEvent(e,d,y.handle),delete u[d])}else for(d in u)E.event.remove(e,d+t[l],n,r,!0);E.isEmptyObject(u)&&Y.remove(e,"handle events")}},dispatch:function(e){var t,n,r,i,o,a,s=new Array(arguments.length),u=E.event.fix(e),l=(Y.get(this,"events")||Object.create(null))[u.type]||[],c=E.event.special[u.type]||{};for(s[0]=u,t=1;t<arguments.length;t++)s[t]=arguments[t];if(u.delegateTarget=this,!c.preDispatch||!1!==c.preDispatch.call(this,u)){a=E.event.handlers.call(this,u,l),t=0;while((i=a[t++])&&!u.isPropagationStopped()){u.currentTarget=i.elem,n=0;while((o=i.handlers[n++])&&!u.isImmediatePropagationStopped())u.rnamespace&&!1!==o.namespace&&!u.rnamespace.test(o.namespace)||(u.handleObj=o,u.data=o.data,void 0!==(r=((E.event.special[o.origType]||{}).handle||o.handler).apply(i.elem,s))&&!1===(u.result=r)&&(u.preventDefault(),u.stopPropagation()))}return c.postDispatch&&c.postDispatch.call(this,u),u.result}},handlers:function(e,t){var n,r,i,o,a,s=[],u=t.delegateCount,l=e.target;if(u&&l.nodeType&&!("click"===e.type&&1<=e.button))for(;l!==this;l=l.parentNode||this)if(1===l.nodeType&&("click"!==e.type||!0!==l.disabled)){for(o=[],a={},n=0;n<u;n++)void 0===a[i=(r=t[n]).selector+" "]&&(a[i]=r.needsContext?-1<E(i,this).index(l):E.find(i,this,null,[l]).length),a[i]&&o.push(r);o.length&&s.push({elem:l,handlers:o})}return l=this,u<t.length&&s.push({elem:l,handlers:t.slice(u)}),s},addProp:function(t,e){Object.defineProperty(E.Event.prototype,t,{enumerable:!0,configurable:!0,get:m(e)?function(){if(this.originalEvent)return e(this.originalEvent)}:function(){if(this.originalEvent)return this.originalEvent[t]},set:function(e){Object.defineProperty(this,t,{enumerable:!0,configurable:!0,writable:!0,value:e})}})},fix:function(e){return e[E.expando]?e:new E.Event(e)},special:{load:{noBubble:!0},click:{setup:function(e){var t=this||e;return pe.test(t.type)&&t.click&&A(t,"input")&&Ee(t,"click",we),!1},trigger:function(e){var t=this||e;return pe.test(t.type)&&t.click&&A(t,"input")&&Ee(t,"click"),!0},_default:function(e){var t=e.target;return pe.test(t.type)&&t.click&&A(t,"input")&&Y.get(t,"click")||A(t,"a")}},beforeunload:{postDispatch:function(e){void 0!==e.result&&e.originalEvent&&(e.originalEvent.returnValue=e.result)}}}},E.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n)},E.Event=function(e,t){if(!(this instanceof E.Event))return new E.Event(e,t);e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||void 0===e.defaultPrevented&&!1===e.returnValue?we:Te,this.target=e.target&&3===e.target.nodeType?e.target.parentNode:e.target,this.currentTarget=e.currentTarget,this.relatedTarget=e.relatedTarget):this.type=e,t&&E.extend(this,t),this.timeStamp=e&&e.timeStamp||Date.now(),this[E.expando]=!0},E.Event.prototype={constructor:E.Event,isDefaultPrevented:Te,isPropagationStopped:Te,isImmediatePropagationStopped:Te,isSimulated:!1,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=we,e&&!this.isSimulated&&e.preventDefault()},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=we,e&&!this.isSimulated&&e.stopPropagation()},stopImmediatePropagation:function(){var e=this.originalEvent;this.isImmediatePropagationStopped=we,e&&!this.isSimulated&&e.stopImmediatePropagation(),this.stopPropagation()}},E.each({altKey:!0,bubbles:!0,cancelable:!0,changedTouches:!0,ctrlKey:!0,detail:!0,eventPhase:!0,metaKey:!0,pageX:!0,pageY:!0,shiftKey:!0,view:!0,"char":!0,code:!0,charCode:!0,key:!0,keyCode:!0,button:!0,buttons:!0,clientX:!0,clientY:!0,offsetX:!0,offsetY:!0,pointerId:!0,pointerType:!0,screenX:!0,screenY:!0,targetTouches:!0,toElement:!0,touches:!0,which:!0},E.event.addProp),E.each({focus:"focusin",blur:"focusout"},function(t,e){E.event.special[t]={setup:function(){return Ee(this,t,Ce),!1},trigger:function(){return Ee(this,t),!0},_default:function(e){return Y.get(e.target,t)},delegateType:e}}),E.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(e,i){E.event.special[e]={delegateType:i,bindType:i,handle:function(e){var t,n=e.relatedTarget,r=e.handleObj;return n&&(n===this||E.contains(this,n))||(e.type=r.origType,t=r.handler.apply(this,arguments),e.type=i),t}}}),E.fn.extend({on:function(e,t,n,r){return Se(this,e,t,n,r)},one:function(e,t,n,r){return Se(this,e,t,n,r,1)},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj)return r=e.handleObj,E(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler),this;if("object"==typeof e){for(i in e)this.off(i,t,e[i]);return this}return!1!==t&&"function"!=typeof t||(n=t,t=void 0),!1===n&&(n=Te),this.each(function(){E.event.remove(this,e,n,t)})}});var ke=/<script|<style|<link/i,Ae=/checked\s*(?:[^=]|=\s*.checked.)/i,Ne=/^\s*<!\[CDATA\[|\]\]>\s*$/g;function je(e,t){return A(e,"table")&&A(11!==t.nodeType?t:t.firstChild,"tr")&&E(e).children("tbody")[0]||e}function De(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e}function qe(e){return"true/"===(e.type||"").slice(0,5)?e.type=e.type.slice(5):e.removeAttribute("type"),e}function Le(e,t){var n,r,i,o,a,s;if(1===t.nodeType){if(Y.hasData(e)&&(s=Y.get(e).events))for(i in Y.remove(t,"handle events"),s)for(n=0,r=s[i].length;n<r;n++)E.event.add(t,i,s[i][n]);Q.hasData(e)&&(o=Q.access(e),a=E.extend({},o),Q.set(t,a))}}function He(n,r,i,o){r=g(r);var e,t,a,s,u,l,c=0,f=n.length,p=f-1,d=r[0],h=m(d);if(h||1<f&&"string"==typeof d&&!v.checkClone&&Ae.test(d))return n.each(function(e){var t=n.eq(e);h&&(r[0]=d.call(this,e,t.html())),He(t,r,i,o)});if(f&&(t=(e=xe(r,n[0].ownerDocument,!1,n,o)).firstChild,1===e.childNodes.length&&(e=t),t||o)){for(s=(a=E.map(ye(e,"script"),De)).length;c<f;c++)u=e,c!==p&&(u=E.clone(u,!0,!0),s&&E.merge(a,ye(u,"script"))),i.call(n[c],u,c);if(s)for(l=a[a.length-1].ownerDocument,E.map(a,qe),c=0;c<s;c++)u=a[c],he.test(u.type||"")&&!Y.access(u,"globalEval")&&E.contains(l,u)&&(u.src&&"module"!==(u.type||"").toLowerCase()?E._evalUrl&&!u.noModule&&E._evalUrl(u.src,{nonce:u.nonce||u.getAttribute("nonce")},l):b(u.textContent.replace(Ne,""),u,l))}return n}function Oe(e,t,n){for(var r,i=t?E.filter(t,e):e,o=0;null!=(r=i[o]);o++)n||1!==r.nodeType||E.cleanData(ye(r)),r.parentNode&&(n&&ie(r)&&ve(ye(r,"script")),r.parentNode.removeChild(r));return e}E.extend({htmlPrefilter:function(e){return e},clone:function(e,t,n){var r,i,o,a,s,u,l,c=e.cloneNode(!0),f=ie(e);if(!(v.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||E.isXMLDoc(e)))for(a=ye(c),r=0,i=(o=ye(e)).length;r<i;r++)s=o[r],u=a[r],void 0,"input"===(l=u.nodeName.toLowerCase())&&pe.test(s.type)?u.checked=s.checked:"input"!==l&&"textarea"!==l||(u.defaultValue=s.defaultValue);if(t)if(n)for(o=o||ye(e),a=a||ye(c),r=0,i=o.length;r<i;r++)Le(o[r],a[r]);else Le(e,c);return 0<(a=ye(c,"script")).length&&ve(a,!f&&ye(e,"script")),c},cleanData:function(e){for(var t,n,r,i=E.event.special,o=0;void 0!==(n=e[o]);o++)if(V(n)){if(t=n[Y.expando]){if(t.events)for(r in t.events)i[r]?E.event.remove(n,r):E.removeEvent(n,r,t.handle);n[Y.expando]=void 0}n[Q.expando]&&(n[Q.expando]=void 0)}}}),E.fn.extend({detach:function(e){return Oe(this,e,!0)},remove:function(e){return Oe(this,e)},text:function(e){return B(this,function(e){return void 0===e?E.text(this):this.empty().each(function(){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||(this.textContent=e)})},null,e,arguments.length)},append:function(){return He(this,arguments,function(e){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||je(this,e).appendChild(e)})},prepend:function(){return He(this,arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=je(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return He(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return He(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},empty:function(){for(var e,t=0;null!=(e=this[t]);t++)1===e.nodeType&&(E.cleanData(ye(e,!1)),e.textContent="");return this},clone:function(e,t){return e=null!=e&&e,t=null==t?e:t,this.map(function(){return E.clone(this,e,t)})},html:function(e){return B(this,function(e){var t=this[0]||{},n=0,r=this.length;if(void 0===e&&1===t.nodeType)return t.innerHTML;if("string"==typeof e&&!ke.test(e)&&!ge[(de.exec(e)||["",""])[1].toLowerCase()]){e=E.htmlPrefilter(e);try{for(;n<r;n++)1===(t=this[n]||{}).nodeType&&(E.cleanData(ye(t,!1)),t.innerHTML=e);t=0}catch(e){}}t&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var n=[];return He(this,arguments,function(e){var t=this.parentNode;E.inArray(this,n)<0&&(E.cleanData(ye(this)),t&&t.replaceChild(e,this))},n)}}),E.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,a){E.fn[e]=function(e){for(var t,n=[],r=E(e),i=r.length-1,o=0;o<=i;o++)t=o===i?this:this.clone(!0),E(r[o])[a](t),u.apply(n,t.get());return this.pushStack(n)}});var Pe=new RegExp("^("+ee+")(?!px)[a-z%]+$","i"),Re=/^--/,Me=function(e){var t=e.ownerDocument.defaultView;return t&&t.opener||(t=C),t.getComputedStyle(e)},Ie=function(e,t,n){var r,i,o={};for(i in t)o[i]=e.style[i],e.style[i]=t[i];for(i in r=n.call(e),t)e.style[i]=o[i];return r},We=new RegExp(ne.join("|"),"i"),Fe="[\\x20\\t\\r\\n\\f]",$e=new RegExp("^"+Fe+"+|((?:^|[^\\\\])(?:\\\\.)*)"+Fe+"+$","g");function Be(e,t,n){var r,i,o,a,s=Re.test(t),u=e.style;return(n=n||Me(e))&&(a=n.getPropertyValue(t)||n[t],s&&a&&(a=a.replace($e,"$1")||void 0),""!==a||ie(e)||(a=E.style(e,t)),!v.pixelBoxStyles()&&Pe.test(a)&&We.test(t)&&(r=u.width,i=u.minWidth,o=u.maxWidth,u.minWidth=u.maxWidth=u.width=a,a=n.width,u.width=r,u.minWidth=i,u.maxWidth=o)),void 0!==a?a+"":a}function _e(e,t){return{get:function(){if(!e())return(this.get=t).apply(this,arguments);delete this.get}}}!function(){function e(){if(l){u.style.cssText="position:absolute;left:-11111px;width:60px;margin-top:1px;padding:0;border:0",l.style.cssText="position:relative;display:block;box-sizing:border-box;overflow:scroll;margin:auto;border:1px;padding:1px;width:60%;top:1%",re.appendChild(u).appendChild(l);var e=C.getComputedStyle(l);n="1%"!==e.top,s=12===t(e.marginLeft),l.style.right="60%",o=36===t(e.right),r=36===t(e.width),l.style.position="absolute",i=12===t(l.offsetWidth/3),re.removeChild(u),l=null}}function t(e){return Math.round(parseFloat(e))}var n,r,i,o,a,s,u=S.createElement("div"),l=S.createElement("div");l.style&&(l.style.backgroundClip="content-box",l.cloneNode(!0).style.backgroundClip="",v.clearCloneStyle="content-box"===l.style.backgroundClip,E.extend(v,{boxSizingReliable:function(){return e(),r},pixelBoxStyles:function(){return e(),o},pixelPosition:function(){return e(),n},reliableMarginLeft:function(){return e(),s},scrollboxSize:function(){return e(),i},reliableTrDimensions:function(){var e,t,n,r;return null==a&&(e=S.createElement("table"),t=S.createElement("tr"),n=S.createElement("div"),e.style.cssText="position:absolute;left:-11111px;border-collapse:separate",t.style.cssText="border:1px solid",t.style.height="1px",n.style.height="9px",n.style.display="block",re.appendChild(e).appendChild(t).appendChild(n),r=C.getComputedStyle(t),a=parseInt(r.height,10)+parseInt(r.borderTopWidth,10)+parseInt(r.borderBottomWidth,10)===t.offsetHeight,re.removeChild(e)),a}}))}();var ze=["Webkit","Moz","ms"],Ue=S.createElement("div").style,Xe={};function Ve(e){var t=E.cssProps[e]||Xe[e];return t||(e in Ue?e:Xe[e]=function(e){var t=e[0].toUpperCase()+e.slice(1),n=ze.length;while(n--)if((e=ze[n]+t)in Ue)return e}(e)||e)}var Ge=/^(none|table(?!-c[ea]).+)/,Ye={position:"absolute",visibility:"hidden",display:"block"},Qe={letterSpacing:"0",fontWeight:"400"};function Je(e,t,n){var r=te.exec(t);return r?Math.max(0,r[2]-(n||0))+(r[3]||"px"):t}function Ke(e,t,n,r,i,o){var a="width"===t?1:0,s=0,u=0;if(n===(r?"border":"content"))return 0;for(;a<4;a+=2)"margin"===n&&(u+=E.css(e,n+ne[a],!0,i)),r?("content"===n&&(u-=E.css(e,"padding"+ne[a],!0,i)),"margin"!==n&&(u-=E.css(e,"border"+ne[a]+"Width",!0,i))):(u+=E.css(e,"padding"+ne[a],!0,i),"padding"!==n?u+=E.css(e,"border"+ne[a]+"Width",!0,i):s+=E.css(e,"border"+ne[a]+"Width",!0,i));return!r&&0<=o&&(u+=Math.max(0,Math.ceil(e["offset"+t[0].toUpperCase()+t.slice(1)]-o-u-s-.5))||0),u}function Ze(e,t,n){var r=Me(e),i=(!v.boxSizingReliable()||n)&&"border-box"===E.css(e,"boxSizing",!1,r),o=i,a=Be(e,t,r),s="offset"+t[0].toUpperCase()+t.slice(1);if(Pe.test(a)){if(!n)return a;a="auto"}return(!v.boxSizingReliable()&&i||!v.reliableTrDimensions()&&A(e,"tr")||"auto"===a||!parseFloat(a)&&"inline"===E.css(e,"display",!1,r))&&e.getClientRects().length&&(i="border-box"===E.css(e,"boxSizing",!1,r),(o=s in e)&&(a=e[s])),(a=parseFloat(a)||0)+Ke(e,t,n||(i?"border":"content"),o,r,a)+"px"}function et(e,t,n,r,i){return new et.prototype.init(e,t,n,r,i)}E.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=Be(e,"opacity");return""===n?"1":n}}}},cssNumber:{animationIterationCount:!0,columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,gridArea:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnStart:!0,gridRow:!0,gridRowEnd:!0,gridRowStart:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,a,s=X(t),u=Re.test(t),l=e.style;if(u||(t=Ve(s)),a=E.cssHooks[t]||E.cssHooks[s],void 0===n)return a&&"get"in a&&void 0!==(i=a.get(e,!1,r))?i:l[t];"string"===(o=typeof n)&&(i=te.exec(n))&&i[1]&&(n=se(e,t,i),o="number"),null!=n&&n==n&&("number"!==o||u||(n+=i&&i[3]||(E.cssNumber[s]?"":"px")),v.clearCloneStyle||""!==n||0!==t.indexOf("background")||(l[t]="inherit"),a&&"set"in a&&void 0===(n=a.set(e,n,r))||(u?l.setProperty(t,n):l[t]=n))}},css:function(e,t,n,r){var i,o,a,s=X(t);return Re.test(t)||(t=Ve(s)),(a=E.cssHooks[t]||E.cssHooks[s])&&"get"in a&&(i=a.get(e,!0,n)),void 0===i&&(i=Be(e,t,r)),"normal"===i&&t in Qe&&(i=Qe[t]),""===n||n?(o=parseFloat(i),!0===n||isFinite(o)?o||0:i):i}}),E.each(["height","width"],function(e,u){E.cssHooks[u]={get:function(e,t,n){if(t)return!Ge.test(E.css(e,"display"))||e.getClientRects().length&&e.getBoundingClientRect().width?Ze(e,u,n):Ie(e,Ye,function(){return Ze(e,u,n)})},set:function(e,t,n){var r,i=Me(e),o=!v.scrollboxSize()&&"absolute"===i.position,a=(o||n)&&"border-box"===E.css(e,"boxSizing",!1,i),s=n?Ke(e,u,n,a,i):0;return a&&o&&(s-=Math.ceil(e["offset"+u[0].toUpperCase()+u.slice(1)]-parseFloat(i[u])-Ke(e,u,"border",!1,i)-.5)),s&&(r=te.exec(t))&&"px"!==(r[3]||"px")&&(e.style[u]=t,t=E.css(e,u)),Je(0,t,s)}}}),E.cssHooks.marginLeft=_e(v.reliableMarginLeft,function(e,t){if(t)return(parseFloat(Be(e,"marginLeft"))||e.getBoundingClientRect().left-Ie(e,{marginLeft:0},function(){return e.getBoundingClientRect().left}))+"px"}),E.each({margin:"",padding:"",border:"Width"},function(i,o){E.cssHooks[i+o]={expand:function(e){for(var t=0,n={},r="string"==typeof e?e.split(" "):[e];t<4;t++)n[i+ne[t]+o]=r[t]||r[t-2]||r[0];return n}},"margin"!==i&&(E.cssHooks[i+o].set=Je)}),E.fn.extend({css:function(e,t){return B(this,function(e,t,n){var r,i,o={},a=0;if(Array.isArray(t)){for(r=Me(e),i=t.length;a<i;a++)o[t[a]]=E.css(e,t[a],!1,r);return o}return void 0!==n?E.style(e,t,n):E.css(e,t)},e,t,1<arguments.length)}}),((E.Tween=et).prototype={constructor:et,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||E.easing._default,this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(E.cssNumber[n]?"":"px")},cur:function(){var e=et.propHooks[this.prop];return e&&e.get?e.get(this):et.propHooks._default.get(this)},run:function(e){var t,n=et.propHooks[this.prop];return this.options.duration?this.pos=t=E.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):this.pos=t=e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):et.propHooks._default.set(this),this}}).init.prototype=et.prototype,(et.propHooks={_default:{get:function(e){var t;return 1!==e.elem.nodeType||null!=e.elem[e.prop]&&null==e.elem.style[e.prop]?e.elem[e.prop]:(t=E.css(e.elem,e.prop,""))&&"auto"!==t?t:0},set:function(e){E.fx.step[e.prop]?E.fx.step[e.prop](e):1!==e.elem.nodeType||!E.cssHooks[e.prop]&&null==e.elem.style[Ve(e.prop)]?e.elem[e.prop]=e.now:E.style(e.elem,e.prop,e.now+e.unit)}}}).scrollTop=et.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},E.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2},_default:"swing"},E.fx=et.prototype.init,E.fx.step={};var tt,nt,rt,it,ot=/^(?:toggle|show|hide)$/,at=/queueHooks$/;function st(){nt&&(!1===S.hidden&&C.requestAnimationFrame?C.requestAnimationFrame(st):C.setTimeout(st,E.fx.interval),E.fx.tick())}function ut(){return C.setTimeout(function(){tt=void 0}),tt=Date.now()}function lt(e,t){var n,r=0,i={height:e};for(t=t?1:0;r<4;r+=2-t)i["margin"+(n=ne[r])]=i["padding"+n]=e;return t&&(i.opacity=i.width=e),i}function ct(e,t,n){for(var r,i=(ft.tweeners[t]||[]).concat(ft.tweeners["*"]),o=0,a=i.length;o<a;o++)if(r=i[o].call(n,t,e))return r}function ft(o,e,t){var n,a,r=0,i=ft.prefilters.length,s=E.Deferred().always(function(){delete u.elem}),u=function(){if(a)return!1;for(var e=tt||ut(),t=Math.max(0,l.startTime+l.duration-e),n=1-(t/l.duration||0),r=0,i=l.tweens.length;r<i;r++)l.tweens[r].run(n);return s.notifyWith(o,[l,n,t]),n<1&&i?t:(i||s.notifyWith(o,[l,1,0]),s.resolveWith(o,[l]),!1)},l=s.promise({elem:o,props:E.extend({},e),opts:E.extend(!0,{specialEasing:{},easing:E.easing._default},t),originalProperties:e,originalOptions:t,startTime:tt||ut(),duration:t.duration,tweens:[],createTween:function(e,t){var n=E.Tween(o,l.opts,e,t,l.opts.specialEasing[e]||l.opts.easing);return l.tweens.push(n),n},stop:function(e){var t=0,n=e?l.tweens.length:0;if(a)return this;for(a=!0;t<n;t++)l.tweens[t].run(1);return e?(s.notifyWith(o,[l,1,0]),s.resolveWith(o,[l,e])):s.rejectWith(o,[l,e]),this}}),c=l.props;for(!function(e,t){var n,r,i,o,a;for(n in e)if(i=t[r=X(n)],o=e[n],Array.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),(a=E.cssHooks[r])&&"expand"in a)for(n in o=a.expand(o),delete e[r],o)n in e||(e[n]=o[n],t[n]=i);else t[r]=i}(c,l.opts.specialEasing);r<i;r++)if(n=ft.prefilters[r].call(l,o,c,l.opts))return m(n.stop)&&(E._queueHooks(l.elem,l.opts.queue).stop=n.stop.bind(n)),n;return E.map(c,ct,l),m(l.opts.start)&&l.opts.start.call(o,l),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always),E.fx.timer(E.extend(u,{elem:o,anim:l,queue:l.opts.queue})),l}E.Animation=E.extend(ft,{tweeners:{"*":[function(e,t){var n=this.createTween(e,t);return se(n.elem,e,te.exec(t),n),n}]},tweener:function(e,t){m(e)?(t=e,e=["*"]):e=e.match(P);for(var n,r=0,i=e.length;r<i;r++)n=e[r],ft.tweeners[n]=ft.tweeners[n]||[],ft.tweeners[n].unshift(t)},prefilters:[function(e,t,n){var r,i,o,a,s,u,l,c,f="width"in t||"height"in t,p=this,d={},h=e.style,g=e.nodeType&&ae(e),y=Y.get(e,"fxshow");for(r in n.queue||(null==(a=E._queueHooks(e,"fx")).unqueued&&(a.unqueued=0,s=a.empty.fire,a.empty.fire=function(){a.unqueued||s()}),a.unqueued++,p.always(function(){p.always(function(){a.unqueued--,E.queue(e,"fx").length||a.empty.fire()})})),t)if(i=t[r],ot.test(i)){if(delete t[r],o=o||"toggle"===i,i===(g?"hide":"show")){if("show"!==i||!y||void 0===y[r])continue;g=!0}d[r]=y&&y[r]||E.style(e,r)}if((u=!E.isEmptyObject(t))||!E.isEmptyObject(d))for(r in f&&1===e.nodeType&&(n.overflow=[h.overflow,h.overflowX,h.overflowY],null==(l=y&&y.display)&&(l=Y.get(e,"display")),"none"===(c=E.css(e,"display"))&&(l?c=l:(le([e],!0),l=e.style.display||l,c=E.css(e,"display"),le([e]))),("inline"===c||"inline-block"===c&&null!=l)&&"none"===E.css(e,"float")&&(u||(p.done(function(){h.display=l}),null==l&&(c=h.display,l="none"===c?"":c)),h.display="inline-block")),n.overflow&&(h.overflow="hidden",p.always(function(){h.overflow=n.overflow[0],h.overflowX=n.overflow[1],h.overflowY=n.overflow[2]})),u=!1,d)u||(y?"hidden"in y&&(g=y.hidden):y=Y.access(e,"fxshow",{display:l}),o&&(y.hidden=!g),g&&le([e],!0),p.done(function(){for(r in g||le([e]),Y.remove(e,"fxshow"),d)E.style(e,r,d[r])})),u=ct(g?y[r]:0,r,p),r in y||(y[r]=u.start,g&&(u.end=u.start,u.start=0))}],prefilter:function(e,t){t?ft.prefilters.unshift(e):ft.prefilters.push(e)}}),E.speed=function(e,t,n){var r=e&&"object"==typeof e?E.extend({},e):{complete:n||!n&&t||m(e)&&e,duration:e,easing:n&&t||t&&!m(t)&&t};return E.fx.off?r.duration=0:"number"!=typeof r.duration&&(r.duration in E.fx.speeds?r.duration=E.fx.speeds[r.duration]:r.duration=E.fx.speeds._default),null!=r.queue&&!0!==r.queue||(r.queue="fx"),r.old=r.complete,r.complete=function(){m(r.old)&&r.old.call(this),r.queue&&E.dequeue(this,r.queue)},r},E.fn.extend({fadeTo:function(e,t,n,r){return this.filter(ae).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(t,e,n,r){var i=E.isEmptyObject(t),o=E.speed(e,n,r),a=function(){var e=ft(this,E.extend({},t),o);(i||Y.get(this,"finish"))&&e.stop(!0)};return a.finish=a,i||!1===o.queue?this.each(a):this.queue(o.queue,a)},stop:function(i,e,o){var a=function(e){var t=e.stop;delete e.stop,t(o)};return"string"!=typeof i&&(o=e,e=i,i=void 0),e&&this.queue(i||"fx",[]),this.each(function(){var e=!0,t=null!=i&&i+"queueHooks",n=E.timers,r=Y.get(this);if(t)r[t]&&r[t].stop&&a(r[t]);else for(t in r)r[t]&&r[t].stop&&at.test(t)&&a(r[t]);for(t=n.length;t--;)n[t].elem!==this||null!=i&&n[t].queue!==i||(n[t].anim.stop(o),e=!1,n.splice(t,1));!e&&o||E.dequeue(this,i)})},finish:function(a){return!1!==a&&(a=a||"fx"),this.each(function(){var e,t=Y.get(this),n=t[a+"queue"],r=t[a+"queueHooks"],i=E.timers,o=n?n.length:0;for(t.finish=!0,E.queue(this,a,[]),r&&r.stop&&r.stop.call(this,!0),e=i.length;e--;)i[e].elem===this&&i[e].queue===a&&(i[e].anim.stop(!0),i.splice(e,1));for(e=0;e<o;e++)n[e]&&n[e].finish&&n[e].finish.call(this);delete t.finish})}}),E.each(["toggle","show","hide"],function(e,r){var i=E.fn[r];E.fn[r]=function(e,t,n){return null==e||"boolean"==typeof e?i.apply(this,arguments):this.animate(lt(r,!0),e,t,n)}}),E.each({slideDown:lt("show"),slideUp:lt("hide"),slideToggle:lt("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,r){E.fn[e]=function(e,t,n){return this.animate(r,e,t,n)}}),E.timers=[],E.fx.tick=function(){var e,t=0,n=E.timers;for(tt=Date.now();t<n.length;t++)(e=n[t])()||n[t]!==e||n.splice(t--,1);n.length||E.fx.stop(),tt=void 0},E.fx.timer=function(e){E.timers.push(e),E.fx.start()},E.fx.interval=13,E.fx.start=function(){nt||(nt=!0,st())},E.fx.stop=function(){nt=null},E.fx.speeds={slow:600,fast:200,_default:400},E.fn.delay=function(r,e){return r=E.fx&&E.fx.speeds[r]||r,e=e||"fx",this.queue(e,function(e,t){var n=C.setTimeout(e,r);t.stop=function(){C.clearTimeout(n)}})},rt=S.createElement("input"),it=S.createElement("select").appendChild(S.createElement("option")),rt.type="checkbox",v.checkOn=""!==rt.value,v.optSelected=it.selected,(rt=S.createElement("input")).value="t",rt.type="radio",v.radioValue="t"===rt.value;var pt,dt=E.expr.attrHandle;E.fn.extend({attr:function(e,t){return B(this,E.attr,e,t,1<arguments.length)},removeAttr:function(e){return this.each(function(){E.removeAttr(this,e)})}}),E.extend({attr:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return"undefined"==typeof e.getAttribute?E.prop(e,t,n):(1===o&&E.isXMLDoc(e)||(i=E.attrHooks[t.toLowerCase()]||(E.expr.match.bool.test(t)?pt:void 0)),void 0!==n?null===n?void E.removeAttr(e,t):i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:(e.setAttribute(t,n+""),n):i&&"get"in i&&null!==(r=i.get(e,t))?r:null==(r=E.find.attr(e,t))?void 0:r)},attrHooks:{type:{set:function(e,t){if(!v.radioValue&&"radio"===t&&A(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},removeAttr:function(e,t){var n,r=0,i=t&&t.match(P);if(i&&1===e.nodeType)while(n=i[r++])e.removeAttribute(n)}}),pt={set:function(e,t,n){return!1===t?E.removeAttr(e,n):e.setAttribute(n,n),n}},E.each(E.expr.match.bool.source.match(/\w+/g),function(e,t){var a=dt[t]||E.find.attr;dt[t]=function(e,t,n){var r,i,o=t.toLowerCase();return n||(i=dt[o],dt[o]=r,r=null!=a(e,t,n)?o:null,dt[o]=i),r}});var ht=/^(?:input|select|textarea|button)$/i,gt=/^(?:a|area)$/i;function yt(e){return(e.match(P)||[]).join(" ")}function vt(e){return e.getAttribute&&e.getAttribute("class")||""}function mt(e){return Array.isArray(e)?e:"string"==typeof e&&e.match(P)||[]}E.fn.extend({prop:function(e,t){return B(this,E.prop,e,t,1<arguments.length)},removeProp:function(e){return this.each(function(){delete this[E.propFix[e]||e]})}}),E.extend({prop:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return 1===o&&E.isXMLDoc(e)||(t=E.propFix[t]||t,i=E.propHooks[t]),void 0!==n?i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:e[t]=n:i&&"get"in i&&null!==(r=i.get(e,t))?r:e[t]},propHooks:{tabIndex:{get:function(e){var t=E.find.attr(e,"tabindex");return t?parseInt(t,10):ht.test(e.nodeName)||gt.test(e.nodeName)&&e.href?0:-1}}},propFix:{"for":"htmlFor","class":"className"}}),v.optSelected||(E.propHooks.selected={get:function(e){var t=e.parentNode;return t&&t.parentNode&&t.parentNode.selectedIndex,null},set:function(e){var t=e.parentNode;t&&(t.selectedIndex,t.parentNode&&t.parentNode.selectedIndex)}}),E.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){E.propFix[this.toLowerCase()]=this}),E.fn.extend({addClass:function(t){var e,n,r,i,o,a;return m(t)?this.each(function(e){E(this).addClass(t.call(this,e,vt(this)))}):(e=mt(t)).length?this.each(function(){if(r=vt(this),n=1===this.nodeType&&" "+yt(r)+" "){for(o=0;o<e.length;o++)i=e[o],n.indexOf(" "+i+" ")<0&&(n+=i+" ");a=yt(n),r!==a&&this.setAttribute("class",a)}}):this},removeClass:function(t){var e,n,r,i,o,a;return m(t)?this.each(function(e){E(this).removeClass(t.call(this,e,vt(this)))}):arguments.length?(e=mt(t)).length?this.each(function(){if(r=vt(this),n=1===this.nodeType&&" "+yt(r)+" "){for(o=0;o<e.length;o++){i=e[o];while(-1<n.indexOf(" "+i+" "))n=n.replace(" "+i+" "," ")}a=yt(n),r!==a&&this.setAttribute("class",a)}}):this:this.attr("class","")},toggleClass:function(t,n){var e,r,i,o,a=typeof t,s="string"===a||Array.isArray(t);return m(t)?this.each(function(e){E(this).toggleClass(t.call(this,e,vt(this),n),n)}):"boolean"==typeof n&&s?n?this.addClass(t):this.removeClass(t):(e=mt(t),this.each(function(){if(s)for(o=E(this),i=0;i<e.length;i++)r=e[i],o.hasClass(r)?o.removeClass(r):o.addClass(r);else void 0!==t&&"boolean"!==a||((r=vt(this))&&Y.set(this,"__className__",r),this.setAttribute&&this.setAttribute("class",r||!1===t?"":Y.get(this,"__className__")||""))}))},hasClass:function(e){var t,n,r=0;t=" "+e+" ";while(n=this[r++])if(1===n.nodeType&&-1<(" "+yt(vt(n))+" ").indexOf(t))return!0;return!1}});var xt=/\r/g;E.fn.extend({val:function(n){var r,e,i,t=this[0];return arguments.length?(i=m(n),this.each(function(e){var t;1===this.nodeType&&(null==(t=i?n.call(this,e,E(this).val()):n)?t="":"number"==typeof t?t+="":Array.isArray(t)&&(t=E.map(t,function(e){return null==e?"":e+""})),(r=E.valHooks[this.type]||E.valHooks[this.nodeName.toLowerCase()])&&"set"in r&&void 0!==r.set(this,t,"value")||(this.value=t))})):t?(r=E.valHooks[t.type]||E.valHooks[t.nodeName.toLowerCase()])&&"get"in r&&void 0!==(e=r.get(t,"value"))?e:"string"==typeof(e=t.value)?e.replace(xt,""):null==e?"":e:void 0}}),E.extend({valHooks:{option:{get:function(e){var t=E.find.attr(e,"value");return null!=t?t:yt(E.text(e))}},select:{get:function(e){var t,n,r,i=e.options,o=e.selectedIndex,a="select-one"===e.type,s=a?null:[],u=a?o+1:i.length;for(r=o<0?u:a?o:0;r<u;r++)if(((n=i[r]).selected||r===o)&&!n.disabled&&(!n.parentNode.disabled||!A(n.parentNode,"optgroup"))){if(t=E(n).val(),a)return t;s.push(t)}return s},set:function(e,t){var n,r,i=e.options,o=E.makeArray(t),a=i.length;while(a--)((r=i[a]).selected=-1<E.inArray(E.valHooks.option.get(r),o))&&(n=!0);return n||(e.selectedIndex=-1),o}}}}),E.each(["radio","checkbox"],function(){E.valHooks[this]={set:function(e,t){if(Array.isArray(t))return e.checked=-1<E.inArray(E(e).val(),t)}},v.checkOn||(E.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})}),v.focusin="onfocusin"in C;var bt=/^(?:focusinfocus|focusoutblur)$/,wt=function(e){e.stopPropagation()};E.extend(E.event,{trigger:function(e,t,n,r){var i,o,a,s,u,l,c,f,p=[n||S],d=y.call(e,"type")?e.type:e,h=y.call(e,"namespace")?e.namespace.split("."):[];if(o=f=a=n=n||S,3!==n.nodeType&&8!==n.nodeType&&!bt.test(d+E.event.triggered)&&(-1<d.indexOf(".")&&(d=(h=d.split(".")).shift(),h.sort()),u=d.indexOf(":")<0&&"on"+d,(e=e[E.expando]?e:new E.Event(d,"object"==typeof e&&e)).isTrigger=r?2:3,e.namespace=h.join("."),e.rnamespace=e.namespace?new RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,e.result=void 0,e.target||(e.target=n),t=null==t?[e]:E.makeArray(t,[e]),c=E.event.special[d]||{},r||!c.trigger||!1!==c.trigger.apply(n,t))){if(!r&&!c.noBubble&&!x(n)){for(s=c.delegateType||d,bt.test(s+d)||(o=o.parentNode);o;o=o.parentNode)p.push(o),a=o;a===(n.ownerDocument||S)&&p.push(a.defaultView||a.parentWindow||C)}i=0;while((o=p[i++])&&!e.isPropagationStopped())f=o,e.type=1<i?s:c.bindType||d,(l=(Y.get(o,"events")||Object.create(null))[e.type]&&Y.get(o,"handle"))&&l.apply(o,t),(l=u&&o[u])&&l.apply&&V(o)&&(e.result=l.apply(o,t),!1===e.result&&e.preventDefault());return e.type=d,r||e.isDefaultPrevented()||c._default&&!1!==c._default.apply(p.pop(),t)||!V(n)||u&&m(n[d])&&!x(n)&&((a=n[u])&&(n[u]=null),E.event.triggered=d,e.isPropagationStopped()&&f.addEventListener(d,wt),n[d](),e.isPropagationStopped()&&f.removeEventListener(d,wt),E.event.triggered=void 0,a&&(n[u]=a)),e.result}},simulate:function(e,t,n){var r=E.extend(new E.Event,n,{type:e,isSimulated:!0});E.event.trigger(r,null,t)}}),E.fn.extend({trigger:function(e,t){return this.each(function(){E.event.trigger(e,t,this)})},triggerHandler:function(e,t){var n=this[0];if(n)return E.event.trigger(e,t,n,!0)}}),v.focusin||E.each({focus:"focusin",blur:"focusout"},function(n,r){var i=function(e){E.event.simulate(r,e.target,E.event.fix(e))};E.event.special[r]={setup:function(){var e=this.ownerDocument||this.document||this,t=Y.access(e,r);t||e.addEventListener(n,i,!0),Y.access(e,r,(t||0)+1)},teardown:function(){var e=this.ownerDocument||this.document||this,t=Y.access(e,r)-1;t?Y.access(e,r,t):(e.removeEventListener(n,i,!0),Y.remove(e,r))}}});var Tt=C.location,Ct={guid:Date.now()},St=/\?/;E.parseXML=function(e){var t,n;if(!e||"string"!=typeof e)return null;try{t=(new C.DOMParser).parseFromString(e,"text/xml")}catch(e){}return n=t&&t.getElementsByTagName("parsererror")[0],t&&!n||E.error("Invalid XML: "+(n?E.map(n.childNodes,function(e){return e.textContent}).join("\n"):e)),t};var Et=/\[\]$/,kt=/\r?\n/g,At=/^(?:submit|button|image|reset|file)$/i,Nt=/^(?:input|select|textarea|keygen)/i;function jt(n,e,r,i){var t;if(Array.isArray(e))E.each(e,function(e,t){r||Et.test(n)?i(n,t):jt(n+"["+("object"==typeof t&&null!=t?e:"")+"]",t,r,i)});else if(r||"object"!==w(e))i(n,e);else for(t in e)jt(n+"["+t+"]",e[t],r,i)}E.param=function(e,t){var n,r=[],i=function(e,t){var n=m(t)?t():t;r[r.length]=encodeURIComponent(e)+"="+encodeURIComponent(null==n?"":n)};if(null==e)return"";if(Array.isArray(e)||e.jquery&&!E.isPlainObject(e))E.each(e,function(){i(this.name,this.value)});else for(n in e)jt(n,e[n],t,i);return r.join("&")},E.fn.extend({serialize:function(){return E.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=E.prop(this,"elements");return e?E.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!E(this).is(":disabled")&&Nt.test(this.nodeName)&&!At.test(e)&&(this.checked||!pe.test(e))}).map(function(e,t){var n=E(this).val();return null==n?null:Array.isArray(n)?E.map(n,function(e){return{name:t.name,value:e.replace(kt,"\r\n")}}):{name:t.name,value:n.replace(kt,"\r\n")}}).get()}});var Dt=/%20/g,qt=/#.*$/,Lt=/([?&])_=[^&]*/,Ht=/^(.*?):[ \t]*([^\r\n]*)$/gm,Ot=/^(?:GET|HEAD)$/,Pt=/^\/\//,Rt={},Mt={},It="*/".concat("*"),Wt=S.createElement("a");function Ft(o){return function(e,t){"string"!=typeof e&&(t=e,e="*");var n,r=0,i=e.toLowerCase().match(P)||[];if(m(t))while(n=i[r++])"+"===n[0]?(n=n.slice(1)||"*",(o[n]=o[n]||[]).unshift(t)):(o[n]=o[n]||[]).push(t)}}function $t(t,i,o,a){var s={},u=t===Mt;function l(e){var r;return s[e]=!0,E.each(t[e]||[],function(e,t){var n=t(i,o,a);return"string"!=typeof n||u||s[n]?u?!(r=n):void 0:(i.dataTypes.unshift(n),l(n),!1)}),r}return l(i.dataTypes[0])||!s["*"]&&l("*")}function Bt(e,t){var n,r,i=E.ajaxSettings.flatOptions||{};for(n in t)void 0!==t[n]&&((i[n]?e:r||(r={}))[n]=t[n]);return r&&E.extend(!0,e,r),e}Wt.href=Tt.href,E.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:Tt.href,type:"GET",isLocal:/^(?:about|app|app-storage|.+-extension|file|res|widget):$/.test(Tt.protocol),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":It,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/\bxml\b/,html:/\bhtml/,json:/\bjson\b/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":JSON.parse,"text xml":E.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?Bt(Bt(e,E.ajaxSettings),t):Bt(E.ajaxSettings,e)},ajaxPrefilter:Ft(Rt),ajaxTransport:Ft(Mt),ajax:function(e,t){"object"==typeof e&&(t=e,e=void 0),t=t||{};var c,f,p,n,d,r,h,g,i,o,y=E.ajaxSetup({},t),v=y.context||y,m=y.context&&(v.nodeType||v.jquery)?E(v):E.event,x=E.Deferred(),b=E.Callbacks("once memory"),w=y.statusCode||{},a={},s={},u="canceled",T={readyState:0,getResponseHeader:function(e){var t;if(h){if(!n){n={};while(t=Ht.exec(p))n[t[1].toLowerCase()+" "]=(n[t[1].toLowerCase()+" "]||[]).concat(t[2])}t=n[e.toLowerCase()+" "]}return null==t?null:t.join(", ")},getAllResponseHeaders:function(){return h?p:null},setRequestHeader:function(e,t){return null==h&&(e=s[e.toLowerCase()]=s[e.toLowerCase()]||e,a[e]=t),this},overrideMimeType:function(e){return null==h&&(y.mimeType=e),this},statusCode:function(e){var t;if(e)if(h)T.always(e[T.status]);else for(t in e)w[t]=[w[t],e[t]];return this},abort:function(e){var t=e||u;return c&&c.abort(t),l(0,t),this}};if(x.promise(T),y.url=((e||y.url||Tt.href)+"").replace(Pt,Tt.protocol+"//"),y.type=t.method||t.type||y.method||y.type,y.dataTypes=(y.dataType||"*").toLowerCase().match(P)||[""],null==y.crossDomain){r=S.createElement("a");try{r.href=y.url,r.href=r.href,y.crossDomain=Wt.protocol+"//"+Wt.host!=r.protocol+"//"+r.host}catch(e){y.crossDomain=!0}}if(y.data&&y.processData&&"string"!=typeof y.data&&(y.data=E.param(y.data,y.traditional)),$t(Rt,y,t,T),h)return T;for(i in(g=E.event&&y.global)&&0==E.active++&&E.event.trigger("ajaxStart"),y.type=y.type.toUpperCase(),y.hasContent=!Ot.test(y.type),f=y.url.replace(qt,""),y.hasContent?y.data&&y.processData&&0===(y.contentType||"").indexOf("application/x-www-form-urlencoded")&&(y.data=y.data.replace(Dt,"+")):(o=y.url.slice(f.length),y.data&&(y.processData||"string"==typeof y.data)&&(f+=(St.test(f)?"&":"?")+y.data,delete y.data),!1===y.cache&&(f=f.replace(Lt,"$1"),o=(St.test(f)?"&":"?")+"_="+Ct.guid+++o),y.url=f+o),y.ifModified&&(E.lastModified[f]&&T.setRequestHeader("If-Modified-Since",E.lastModified[f]),E.etag[f]&&T.setRequestHeader("If-None-Match",E.etag[f])),(y.data&&y.hasContent&&!1!==y.contentType||t.contentType)&&T.setRequestHeader("Content-Type",y.contentType),T.setRequestHeader("Accept",y.dataTypes[0]&&y.accepts[y.dataTypes[0]]?y.accepts[y.dataTypes[0]]+("*"!==y.dataTypes[0]?", "+It+"; q=0.01":""):y.accepts["*"]),y.headers)T.setRequestHeader(i,y.headers[i]);if(y.beforeSend&&(!1===y.beforeSend.call(v,T,y)||h))return T.abort();if(u="abort",b.add(y.complete),T.done(y.success),T.fail(y.error),c=$t(Mt,y,t,T)){if(T.readyState=1,g&&m.trigger("ajaxSend",[T,y]),h)return T;y.async&&0<y.timeout&&(d=C.setTimeout(function(){T.abort("timeout")},y.timeout));try{h=!1,c.send(a,l)}catch(e){if(h)throw e;l(-1,e)}}else l(-1,"No Transport");function l(e,t,n,r){var i,o,a,s,u,l=t;h||(h=!0,d&&C.clearTimeout(d),c=void 0,p=r||"",T.readyState=0<e?4:0,i=200<=e&&e<300||304===e,n&&(s=function(e,t,n){var r,i,o,a,s=e.contents,u=e.dataTypes;while("*"===u[0])u.shift(),void 0===r&&(r=e.mimeType||t.getResponseHeader("Content-Type"));if(r)for(i in s)if(s[i]&&s[i].test(r)){u.unshift(i);break}if(u[0]in n)o=u[0];else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break}a||(a=i)}o=o||a}if(o)return o!==u[0]&&u.unshift(o),n[o]}(y,T,n)),!i&&-1<E.inArray("script",y.dataTypes)&&E.inArray("json",y.dataTypes)<0&&(y.converters["text script"]=function(){}),s=function(e,t,n,r){var i,o,a,s,u,l={},c=e.dataTypes.slice();if(c[1])for(a in e.converters)l[a.toLowerCase()]=e.converters[a];o=c.shift();while(o)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(!(a=l[u+" "+o]||l["* "+o]))for(i in l)if((s=i.split(" "))[1]===o&&(a=l[u+" "+s[0]]||l["* "+s[0]])){!0===a?a=l[i]:!0!==l[i]&&(o=s[0],c.unshift(s[1]));break}if(!0!==a)if(a&&e["throws"])t=a(t);else try{t=a(t)}catch(e){return{state:"parsererror",error:a?e:"No conversion from "+u+" to "+o}}}return{state:"success",data:t}}(y,s,T,i),i?(y.ifModified&&((u=T.getResponseHeader("Last-Modified"))&&(E.lastModified[f]=u),(u=T.getResponseHeader("etag"))&&(E.etag[f]=u)),204===e||"HEAD"===y.type?l="nocontent":304===e?l="notmodified":(l=s.state,o=s.data,i=!(a=s.error))):(a=l,!e&&l||(l="error",e<0&&(e=0))),T.status=e,T.statusText=(t||l)+"",i?x.resolveWith(v,[o,l,T]):x.rejectWith(v,[T,l,a]),T.statusCode(w),w=void 0,g&&m.trigger(i?"ajaxSuccess":"ajaxError",[T,y,i?o:a]),b.fireWith(v,[T,l]),g&&(m.trigger("ajaxComplete",[T,y]),--E.active||E.event.trigger("ajaxStop")))}return T},getJSON:function(e,t,n){return E.get(e,t,n,"json")},getScript:function(e,t){return E.get(e,void 0,t,"script")}}),E.each(["get","post"],function(e,i){E[i]=function(e,t,n,r){return m(t)&&(r=r||n,n=t,t=void 0),E.ajax(E.extend({url:e,type:i,dataType:r,data:t,success:n},E.isPlainObject(e)&&e))}}),E.ajaxPrefilter(function(e){var t;for(t in e.headers)"content-type"===t.toLowerCase()&&(e.contentType=e.headers[t]||"")}),E._evalUrl=function(e,t,n){return E.ajax({url:e,type:"GET",dataType:"script",cache:!0,async:!1,global:!1,converters:{"text script":function(){}},dataFilter:function(e){E.globalEval(e,t,n)}})},E.fn.extend({wrapAll:function(e){var t;return this[0]&&(m(e)&&(e=e.call(this[0])),t=E(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstElementChild)e=e.firstElementChild;return e}).append(this)),this},wrapInner:function(n){return m(n)?this.each(function(e){E(this).wrapInner(n.call(this,e))}):this.each(function(){var e=E(this),t=e.contents();t.length?t.wrapAll(n):e.append(n)})},wrap:function(t){var n=m(t);return this.each(function(e){E(this).wrapAll(n?t.call(this,e):t)})},unwrap:function(e){return this.parent(e).not("body").each(function(){E(this).replaceWith(this.childNodes)}),this}}),E.expr.pseudos.hidden=function(e){return!E.expr.pseudos.visible(e)},E.expr.pseudos.visible=function(e){return!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)},E.ajaxSettings.xhr=function(){try{return new C.XMLHttpRequest}catch(e){}};var _t={0:200,1223:204},zt=E.ajaxSettings.xhr();v.cors=!!zt&&"withCredentials"in zt,v.ajax=zt=!!zt,E.ajaxTransport(function(i){var o,a;if(v.cors||zt&&!i.crossDomain)return{send:function(e,t){var n,r=i.xhr();if(r.open(i.type,i.url,i.async,i.username,i.password),i.xhrFields)for(n in i.xhrFields)r[n]=i.xhrFields[n];for(n in i.mimeType&&r.overrideMimeType&&r.overrideMimeType(i.mimeType),i.crossDomain||e["X-Requested-With"]||(e["X-Requested-With"]="XMLHttpRequest"),e)r.setRequestHeader(n,e[n]);o=function(e){return function(){o&&(o=a=r.onload=r.onerror=r.onabort=r.ontimeout=r.onreadystatechange=null,"abort"===e?r.abort():"error"===e?"number"!=typeof r.status?t(0,"error"):t(r.status,r.statusText):t(_t[r.status]||r.status,r.statusText,"text"!==(r.responseType||"text")||"string"!=typeof r.responseText?{binary:r.response}:{text:r.responseText},r.getAllResponseHeaders()))}},r.onload=o(),a=r.onerror=r.ontimeout=o("error"),void 0!==r.onabort?r.onabort=a:r.onreadystatechange=function(){4===r.readyState&&C.setTimeout(function(){o&&a()})},o=o("abort");try{r.send(i.hasContent&&i.data||null)}catch(e){if(o)throw e}},abort:function(){o&&o()}}}),E.ajaxPrefilter(function(e){e.crossDomain&&(e.contents.script=!1)}),E.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/\b(?:java|ecma)script\b/},converters:{"text script":function(e){return E.globalEval(e),e}}}),E.ajaxPrefilter("script",function(e){void 0===e.cache&&(e.cache=!1),e.crossDomain&&(e.type="GET")}),E.ajaxTransport("script",function(n){var r,i;if(n.crossDomain||n.scriptAttrs)return{send:function(e,t){r=E("<script>").attr(n.scriptAttrs||{}).prop({charset:n.scriptCharset,src:n.url}).on("load error",i=function(e){r.remove(),i=null,e&&t("error"===e.type?404:200,e.type)}),S.head.appendChild(r[0])},abort:function(){i&&i()}}});var Ut,Xt=[],Vt=/(=)\?(?=&|$)|\?\?/;E.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=Xt.pop()||E.expando+"_"+Ct.guid++;return this[e]=!0,e}}),E.ajaxPrefilter("json jsonp",function(e,t,n){var r,i,o,a=!1!==e.jsonp&&(Vt.test(e.url)?"url":"string"==typeof e.data&&0===(e.contentType||"").indexOf("application/x-www-form-urlencoded")&&Vt.test(e.data)&&"data");if(a||"jsonp"===e.dataTypes[0])return r=e.jsonpCallback=m(e.jsonpCallback)?e.jsonpCallback():e.jsonpCallback,a?e[a]=e[a].replace(Vt,"$1"+r):!1!==e.jsonp&&(e.url+=(St.test(e.url)?"&":"?")+e.jsonp+"="+r),e.converters["script json"]=function(){return o||E.error(r+" was not called"),o[0]},e.dataTypes[0]="json",i=C[r],C[r]=function(){o=arguments},n.always(function(){void 0===i?E(C).removeProp(r):C[r]=i,e[r]&&(e.jsonpCallback=t.jsonpCallback,Xt.push(r)),o&&m(i)&&i(o[0]),o=i=void 0}),"script"}),v.createHTMLDocument=((Ut=S.implementation.createHTMLDocument("").body).innerHTML="<form></form><form></form>",2===Ut.childNodes.length),E.parseHTML=function(e,t,n){return"string"!=typeof e?[]:("boolean"==typeof t&&(n=t,t=!1),t||(v.createHTMLDocument?((r=(t=S.implementation.createHTMLDocument("")).createElement("base")).href=S.location.href,t.head.appendChild(r)):t=S),o=!n&&[],(i=N.exec(e))?[t.createElement(i[1])]:(i=xe([e],t,o),o&&o.length&&E(o).remove(),E.merge([],i.childNodes)));var r,i,o},E.fn.load=function(e,t,n){var r,i,o,a=this,s=e.indexOf(" ");return-1<s&&(r=yt(e.slice(s)),e=e.slice(0,s)),m(t)?(n=t,t=void 0):t&&"object"==typeof t&&(i="POST"),0<a.length&&E.ajax({url:e,type:i||"GET",dataType:"html",data:t}).done(function(e){o=arguments,a.html(r?E("<div>").append(E.parseHTML(e)).find(r):e)}).always(n&&function(e,t){a.each(function(){n.apply(this,o||[e.responseText,t,e])})}),this},E.expr.pseudos.animated=function(t){return E.grep(E.timers,function(e){return t===e.elem}).length},E.offset={setOffset:function(e,t,n){var r,i,o,a,s,u,l=E.css(e,"position"),c=E(e),f={};"static"===l&&(e.style.position="relative"),s=c.offset(),o=E.css(e,"top"),u=E.css(e,"left"),("absolute"===l||"fixed"===l)&&-1<(o+u).indexOf("auto")?(a=(r=c.position()).top,i=r.left):(a=parseFloat(o)||0,i=parseFloat(u)||0),m(t)&&(t=t.call(e,n,E.extend({},s))),null!=t.top&&(f.top=t.top-s.top+a),null!=t.left&&(f.left=t.left-s.left+i),"using"in t?t.using.call(e,f):c.css(f)}},E.fn.extend({offset:function(t){if(arguments.length)return void 0===t?this:this.each(function(e){E.offset.setOffset(this,t,e)});var e,n,r=this[0];return r?r.getClientRects().length?(e=r.getBoundingClientRect(),n=r.ownerDocument.defaultView,{top:e.top+n.pageYOffset,left:e.left+n.pageXOffset}):{top:0,left:0}:void 0},position:function(){if(this[0]){var e,t,n,r=this[0],i={top:0,left:0};if("fixed"===E.css(r,"position"))t=r.getBoundingClientRect();else{t=this.offset(),n=r.ownerDocument,e=r.offsetParent||n.documentElement;while(e&&(e===n.body||e===n.documentElement)&&"static"===E.css(e,"position"))e=e.parentNode;e&&e!==r&&1===e.nodeType&&((i=E(e).offset()).top+=E.css(e,"borderTopWidth",!0),i.left+=E.css(e,"borderLeftWidth",!0))}return{top:t.top-i.top-E.css(r,"marginTop",!0),left:t.left-i.left-E.css(r,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var e=this.offsetParent;while(e&&"static"===E.css(e,"position"))e=e.offsetParent;return e||re})}}),E.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(t,i){var o="pageYOffset"===i;E.fn[t]=function(e){return B(this,function(e,t,n){var r;if(x(e)?r=e:9===e.nodeType&&(r=e.defaultView),void 0===n)return r?r[i]:e[t];r?r.scrollTo(o?r.pageXOffset:n,o?n:r.pageYOffset):e[t]=n},t,e,arguments.length)}}),E.each(["top","left"],function(e,n){E.cssHooks[n]=_e(v.pixelPosition,function(e,t){if(t)return t=Be(e,n),Pe.test(t)?E(e).position()[n]+"px":t})}),E.each({Height:"height",Width:"width"},function(a,s){E.each({padding:"inner"+a,content:s,"":"outer"+a},function(r,o){E.fn[o]=function(e,t){var n=arguments.length&&(r||"boolean"!=typeof e),i=r||(!0===e||!0===t?"margin":"border");return B(this,function(e,t,n){var r;return x(e)?0===o.indexOf("outer")?e["inner"+a]:e.document.documentElement["client"+a]:9===e.nodeType?(r=e.documentElement,Math.max(e.body["scroll"+a],r["scroll"+a],e.body["offset"+a],r["offset"+a],r["client"+a])):void 0===n?E.css(e,t,i):E.style(e,t,n,i)},s,n?e:void 0,n)}})}),E.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){E.fn[t]=function(e){return this.on(t,e)}}),E.fn.extend({bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)},hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)}}),E.each("blur focus focusin focusout resize scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup contextmenu".split(" "),function(e,n){E.fn[n]=function(e,t){return 0<arguments.length?this.on(n,null,e,t):this.trigger(n)}});var Gt=/^[\s\uFEFF\xA0]+|([^\s\uFEFF\xA0])[\s\uFEFF\xA0]+$/g;E.proxy=function(e,t){var n,r,i;if("string"==typeof t&&(n=e[t],t=e,e=n),m(e))return r=s.call(arguments,2),(i=function(){return e.apply(t||this,r.concat(s.call(arguments)))}).guid=e.guid=e.guid||E.guid++,i},E.holdReady=function(e){e?E.readyWait++:E.ready(!0)},E.isArray=Array.isArray,E.parseJSON=JSON.parse,E.nodeName=A,E.isFunction=m,E.isWindow=x,E.camelCase=X,E.type=w,E.now=Date.now,E.isNumeric=function(e){var t=E.type(e);return("number"===t||"string"===t)&&!isNaN(e-parseFloat(e))},E.trim=function(e){return null==e?"":(e+"").replace(Gt,"$1")},"function"==typeof define&&define.amd&&define("jquery",[],function(){return E});var Yt=C.jQuery,Qt=C.$;return E.noConflict=function(e){return C.$===E&&(C.$=Qt),e&&C.jQuery===E&&(C.jQuery=Yt),E},"undefined"==typeof e&&(C.jQuery=C.$=E),E});

/**
 * @popperjs/core v2.11.6 - MIT License
 */

!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).Popper={})}(this,(function(e){"use strict";function t(e){if(null==e)return window;if("[object Window]"!==e.toString()){var t=e.ownerDocument;return t&&t.defaultView||window}return e}function n(e){return e instanceof t(e).Element||e instanceof Element}function r(e){return e instanceof t(e).HTMLElement||e instanceof HTMLElement}function o(e){return"undefined"!=typeof ShadowRoot&&(e instanceof t(e).ShadowRoot||e instanceof ShadowRoot)}var i=Math.max,a=Math.min,s=Math.round;function f(){var e=navigator.userAgentData;return null!=e&&e.brands?e.brands.map((function(e){return e.brand+"/"+e.version})).join(" "):navigator.userAgent}function c(){return!/^((?!chrome|android).)*safari/i.test(f())}function p(e,o,i){void 0===o&&(o=!1),void 0===i&&(i=!1);var a=e.getBoundingClientRect(),f=1,p=1;o&&r(e)&&(f=e.offsetWidth>0&&s(a.width)/e.offsetWidth||1,p=e.offsetHeight>0&&s(a.height)/e.offsetHeight||1);var u=(n(e)?t(e):window).visualViewport,l=!c()&&i,d=(a.left+(l&&u?u.offsetLeft:0))/f,h=(a.top+(l&&u?u.offsetTop:0))/p,m=a.width/f,v=a.height/p;return{width:m,height:v,top:h,right:d+m,bottom:h+v,left:d,x:d,y:h}}function u(e){var n=t(e);return{scrollLeft:n.pageXOffset,scrollTop:n.pageYOffset}}function l(e){return e?(e.nodeName||"").toLowerCase():null}function d(e){return((n(e)?e.ownerDocument:e.document)||window.document).documentElement}function h(e){return p(d(e)).left+u(e).scrollLeft}function m(e){return t(e).getComputedStyle(e)}function v(e){var t=m(e),n=t.overflow,r=t.overflowX,o=t.overflowY;return/auto|scroll|overlay|hidden/.test(n+o+r)}function y(e,n,o){void 0===o&&(o=!1);var i,a,f=r(n),c=r(n)&&function(e){var t=e.getBoundingClientRect(),n=s(t.width)/e.offsetWidth||1,r=s(t.height)/e.offsetHeight||1;return 1!==n||1!==r}(n),m=d(n),y=p(e,c,o),g={scrollLeft:0,scrollTop:0},b={x:0,y:0};return(f||!f&&!o)&&(("body"!==l(n)||v(m))&&(g=(i=n)!==t(i)&&r(i)?{scrollLeft:(a=i).scrollLeft,scrollTop:a.scrollTop}:u(i)),r(n)?((b=p(n,!0)).x+=n.clientLeft,b.y+=n.clientTop):m&&(b.x=h(m))),{x:y.left+g.scrollLeft-b.x,y:y.top+g.scrollTop-b.y,width:y.width,height:y.height}}function g(e){var t=p(e),n=e.offsetWidth,r=e.offsetHeight;return Math.abs(t.width-n)<=1&&(n=t.width),Math.abs(t.height-r)<=1&&(r=t.height),{x:e.offsetLeft,y:e.offsetTop,width:n,height:r}}function b(e){return"html"===l(e)?e:e.assignedSlot||e.parentNode||(o(e)?e.host:null)||d(e)}function w(e){return["html","body","#document"].indexOf(l(e))>=0?e.ownerDocument.body:r(e)&&v(e)?e:w(b(e))}function x(e,n){var r;void 0===n&&(n=[]);var o=w(e),i=o===(null==(r=e.ownerDocument)?void 0:r.body),a=t(o),s=i?[a].concat(a.visualViewport||[],v(o)?o:[]):o,f=n.concat(s);return i?f:f.concat(x(b(s)))}function O(e){return["table","td","th"].indexOf(l(e))>=0}function j(e){return r(e)&&"fixed"!==m(e).position?e.offsetParent:null}function E(e){for(var n=t(e),i=j(e);i&&O(i)&&"static"===m(i).position;)i=j(i);return i&&("html"===l(i)||"body"===l(i)&&"static"===m(i).position)?n:i||function(e){var t=/firefox/i.test(f());if(/Trident/i.test(f())&&r(e)&&"fixed"===m(e).position)return null;var n=b(e);for(o(n)&&(n=n.host);r(n)&&["html","body"].indexOf(l(n))<0;){var i=m(n);if("none"!==i.transform||"none"!==i.perspective||"paint"===i.contain||-1!==["transform","perspective"].indexOf(i.willChange)||t&&"filter"===i.willChange||t&&i.filter&&"none"!==i.filter)return n;n=n.parentNode}return null}(e)||n}var D="top",A="bottom",L="right",P="left",M="auto",k=[D,A,L,P],W="start",B="end",H="viewport",T="popper",R=k.reduce((function(e,t){return e.concat([t+"-"+W,t+"-"+B])}),[]),S=[].concat(k,[M]).reduce((function(e,t){return e.concat([t,t+"-"+W,t+"-"+B])}),[]),V=["beforeRead","read","afterRead","beforeMain","main","afterMain","beforeWrite","write","afterWrite"];function q(e){var t=new Map,n=new Set,r=[];function o(e){n.add(e.name),[].concat(e.requires||[],e.requiresIfExists||[]).forEach((function(e){if(!n.has(e)){var r=t.get(e);r&&o(r)}})),r.push(e)}return e.forEach((function(e){t.set(e.name,e)})),e.forEach((function(e){n.has(e.name)||o(e)})),r}function C(e){return e.split("-")[0]}function N(e,t){var n=t.getRootNode&&t.getRootNode();if(e.contains(t))return!0;if(n&&o(n)){var r=t;do{if(r&&e.isSameNode(r))return!0;r=r.parentNode||r.host}while(r)}return!1}function I(e){return Object.assign({},e,{left:e.x,top:e.y,right:e.x+e.width,bottom:e.y+e.height})}function _(e,r,o){return r===H?I(function(e,n){var r=t(e),o=d(e),i=r.visualViewport,a=o.clientWidth,s=o.clientHeight,f=0,p=0;if(i){a=i.width,s=i.height;var u=c();(u||!u&&"fixed"===n)&&(f=i.offsetLeft,p=i.offsetTop)}return{width:a,height:s,x:f+h(e),y:p}}(e,o)):n(r)?function(e,t){var n=p(e,!1,"fixed"===t);return n.top=n.top+e.clientTop,n.left=n.left+e.clientLeft,n.bottom=n.top+e.clientHeight,n.right=n.left+e.clientWidth,n.width=e.clientWidth,n.height=e.clientHeight,n.x=n.left,n.y=n.top,n}(r,o):I(function(e){var t,n=d(e),r=u(e),o=null==(t=e.ownerDocument)?void 0:t.body,a=i(n.scrollWidth,n.clientWidth,o?o.scrollWidth:0,o?o.clientWidth:0),s=i(n.scrollHeight,n.clientHeight,o?o.scrollHeight:0,o?o.clientHeight:0),f=-r.scrollLeft+h(e),c=-r.scrollTop;return"rtl"===m(o||n).direction&&(f+=i(n.clientWidth,o?o.clientWidth:0)-a),{width:a,height:s,x:f,y:c}}(d(e)))}function F(e,t,o,s){var f="clippingParents"===t?function(e){var t=x(b(e)),o=["absolute","fixed"].indexOf(m(e).position)>=0&&r(e)?E(e):e;return n(o)?t.filter((function(e){return n(e)&&N(e,o)&&"body"!==l(e)})):[]}(e):[].concat(t),c=[].concat(f,[o]),p=c[0],u=c.reduce((function(t,n){var r=_(e,n,s);return t.top=i(r.top,t.top),t.right=a(r.right,t.right),t.bottom=a(r.bottom,t.bottom),t.left=i(r.left,t.left),t}),_(e,p,s));return u.width=u.right-u.left,u.height=u.bottom-u.top,u.x=u.left,u.y=u.top,u}function U(e){return e.split("-")[1]}function z(e){return["top","bottom"].indexOf(e)>=0?"x":"y"}function X(e){var t,n=e.reference,r=e.element,o=e.placement,i=o?C(o):null,a=o?U(o):null,s=n.x+n.width/2-r.width/2,f=n.y+n.height/2-r.height/2;switch(i){case D:t={x:s,y:n.y-r.height};break;case A:t={x:s,y:n.y+n.height};break;case L:t={x:n.x+n.width,y:f};break;case P:t={x:n.x-r.width,y:f};break;default:t={x:n.x,y:n.y}}var c=i?z(i):null;if(null!=c){var p="y"===c?"height":"width";switch(a){case W:t[c]=t[c]-(n[p]/2-r[p]/2);break;case B:t[c]=t[c]+(n[p]/2-r[p]/2)}}return t}function Y(e){return Object.assign({},{top:0,right:0,bottom:0,left:0},e)}function G(e,t){return t.reduce((function(t,n){return t[n]=e,t}),{})}function J(e,t){void 0===t&&(t={});var r=t,o=r.placement,i=void 0===o?e.placement:o,a=r.strategy,s=void 0===a?e.strategy:a,f=r.boundary,c=void 0===f?"clippingParents":f,u=r.rootBoundary,l=void 0===u?H:u,h=r.elementContext,m=void 0===h?T:h,v=r.altBoundary,y=void 0!==v&&v,g=r.padding,b=void 0===g?0:g,w=Y("number"!=typeof b?b:G(b,k)),x=m===T?"reference":T,O=e.rects.popper,j=e.elements[y?x:m],E=F(n(j)?j:j.contextElement||d(e.elements.popper),c,l,s),P=p(e.elements.reference),M=X({reference:P,element:O,strategy:"absolute",placement:i}),W=I(Object.assign({},O,M)),B=m===T?W:P,R={top:E.top-B.top+w.top,bottom:B.bottom-E.bottom+w.bottom,left:E.left-B.left+w.left,right:B.right-E.right+w.right},S=e.modifiersData.offset;if(m===T&&S){var V=S[i];Object.keys(R).forEach((function(e){var t=[L,A].indexOf(e)>=0?1:-1,n=[D,A].indexOf(e)>=0?"y":"x";R[e]+=V[n]*t}))}return R}var K={placement:"bottom",modifiers:[],strategy:"absolute"};function Q(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return!t.some((function(e){return!(e&&"function"==typeof e.getBoundingClientRect)}))}function Z(e){void 0===e&&(e={});var t=e,r=t.defaultModifiers,o=void 0===r?[]:r,i=t.defaultOptions,a=void 0===i?K:i;return function(e,t,r){void 0===r&&(r=a);var i,s,f={placement:"bottom",orderedModifiers:[],options:Object.assign({},K,a),modifiersData:{},elements:{reference:e,popper:t},attributes:{},styles:{}},c=[],p=!1,u={state:f,setOptions:function(r){var i="function"==typeof r?r(f.options):r;l(),f.options=Object.assign({},a,f.options,i),f.scrollParents={reference:n(e)?x(e):e.contextElement?x(e.contextElement):[],popper:x(t)};var s,p,d=function(e){var t=q(e);return V.reduce((function(e,n){return e.concat(t.filter((function(e){return e.phase===n})))}),[])}((s=[].concat(o,f.options.modifiers),p=s.reduce((function(e,t){var n=e[t.name];return e[t.name]=n?Object.assign({},n,t,{options:Object.assign({},n.options,t.options),data:Object.assign({},n.data,t.data)}):t,e}),{}),Object.keys(p).map((function(e){return p[e]}))));return f.orderedModifiers=d.filter((function(e){return e.enabled})),f.orderedModifiers.forEach((function(e){var t=e.name,n=e.options,r=void 0===n?{}:n,o=e.effect;if("function"==typeof o){var i=o({state:f,name:t,instance:u,options:r}),a=function(){};c.push(i||a)}})),u.update()},forceUpdate:function(){if(!p){var e=f.elements,t=e.reference,n=e.popper;if(Q(t,n)){f.rects={reference:y(t,E(n),"fixed"===f.options.strategy),popper:g(n)},f.reset=!1,f.placement=f.options.placement,f.orderedModifiers.forEach((function(e){return f.modifiersData[e.name]=Object.assign({},e.data)}));for(var r=0;r<f.orderedModifiers.length;r++)if(!0!==f.reset){var o=f.orderedModifiers[r],i=o.fn,a=o.options,s=void 0===a?{}:a,c=o.name;"function"==typeof i&&(f=i({state:f,options:s,name:c,instance:u})||f)}else f.reset=!1,r=-1}}},update:(i=function(){return new Promise((function(e){u.forceUpdate(),e(f)}))},function(){return s||(s=new Promise((function(e){Promise.resolve().then((function(){s=void 0,e(i())}))}))),s}),destroy:function(){l(),p=!0}};if(!Q(e,t))return u;function l(){c.forEach((function(e){return e()})),c=[]}return u.setOptions(r).then((function(e){!p&&r.onFirstUpdate&&r.onFirstUpdate(e)})),u}}var $={passive:!0};var ee={name:"eventListeners",enabled:!0,phase:"write",fn:function(){},effect:function(e){var n=e.state,r=e.instance,o=e.options,i=o.scroll,a=void 0===i||i,s=o.resize,f=void 0===s||s,c=t(n.elements.popper),p=[].concat(n.scrollParents.reference,n.scrollParents.popper);return a&&p.forEach((function(e){e.addEventListener("scroll",r.update,$)})),f&&c.addEventListener("resize",r.update,$),function(){a&&p.forEach((function(e){e.removeEventListener("scroll",r.update,$)})),f&&c.removeEventListener("resize",r.update,$)}},data:{}};var te={name:"popperOffsets",enabled:!0,phase:"read",fn:function(e){var t=e.state,n=e.name;t.modifiersData[n]=X({reference:t.rects.reference,element:t.rects.popper,strategy:"absolute",placement:t.placement})},data:{}},ne={top:"auto",right:"auto",bottom:"auto",left:"auto"};function re(e){var n,r=e.popper,o=e.popperRect,i=e.placement,a=e.variation,f=e.offsets,c=e.position,p=e.gpuAcceleration,u=e.adaptive,l=e.roundOffsets,h=e.isFixed,v=f.x,y=void 0===v?0:v,g=f.y,b=void 0===g?0:g,w="function"==typeof l?l({x:y,y:b}):{x:y,y:b};y=w.x,b=w.y;var x=f.hasOwnProperty("x"),O=f.hasOwnProperty("y"),j=P,M=D,k=window;if(u){var W=E(r),H="clientHeight",T="clientWidth";if(W===t(r)&&"static"!==m(W=d(r)).position&&"absolute"===c&&(H="scrollHeight",T="scrollWidth"),W=W,i===D||(i===P||i===L)&&a===B)M=A,b-=(h&&W===k&&k.visualViewport?k.visualViewport.height:W[H])-o.height,b*=p?1:-1;if(i===P||(i===D||i===A)&&a===B)j=L,y-=(h&&W===k&&k.visualViewport?k.visualViewport.width:W[T])-o.width,y*=p?1:-1}var R,S=Object.assign({position:c},u&&ne),V=!0===l?function(e){var t=e.x,n=e.y,r=window.devicePixelRatio||1;return{x:s(t*r)/r||0,y:s(n*r)/r||0}}({x:y,y:b}):{x:y,y:b};return y=V.x,b=V.y,p?Object.assign({},S,((R={})[M]=O?"0":"",R[j]=x?"0":"",R.transform=(k.devicePixelRatio||1)<=1?"translate("+y+"px, "+b+"px)":"translate3d("+y+"px, "+b+"px, 0)",R)):Object.assign({},S,((n={})[M]=O?b+"px":"",n[j]=x?y+"px":"",n.transform="",n))}var oe={name:"computeStyles",enabled:!0,phase:"beforeWrite",fn:function(e){var t=e.state,n=e.options,r=n.gpuAcceleration,o=void 0===r||r,i=n.adaptive,a=void 0===i||i,s=n.roundOffsets,f=void 0===s||s,c={placement:C(t.placement),variation:U(t.placement),popper:t.elements.popper,popperRect:t.rects.popper,gpuAcceleration:o,isFixed:"fixed"===t.options.strategy};null!=t.modifiersData.popperOffsets&&(t.styles.popper=Object.assign({},t.styles.popper,re(Object.assign({},c,{offsets:t.modifiersData.popperOffsets,position:t.options.strategy,adaptive:a,roundOffsets:f})))),null!=t.modifiersData.arrow&&(t.styles.arrow=Object.assign({},t.styles.arrow,re(Object.assign({},c,{offsets:t.modifiersData.arrow,position:"absolute",adaptive:!1,roundOffsets:f})))),t.attributes.popper=Object.assign({},t.attributes.popper,{"data-popper-placement":t.placement})},data:{}};var ie={name:"applyStyles",enabled:!0,phase:"write",fn:function(e){var t=e.state;Object.keys(t.elements).forEach((function(e){var n=t.styles[e]||{},o=t.attributes[e]||{},i=t.elements[e];r(i)&&l(i)&&(Object.assign(i.style,n),Object.keys(o).forEach((function(e){var t=o[e];!1===t?i.removeAttribute(e):i.setAttribute(e,!0===t?"":t)})))}))},effect:function(e){var t=e.state,n={popper:{position:t.options.strategy,left:"0",top:"0",margin:"0"},arrow:{position:"absolute"},reference:{}};return Object.assign(t.elements.popper.style,n.popper),t.styles=n,t.elements.arrow&&Object.assign(t.elements.arrow.style,n.arrow),function(){Object.keys(t.elements).forEach((function(e){var o=t.elements[e],i=t.attributes[e]||{},a=Object.keys(t.styles.hasOwnProperty(e)?t.styles[e]:n[e]).reduce((function(e,t){return e[t]="",e}),{});r(o)&&l(o)&&(Object.assign(o.style,a),Object.keys(i).forEach((function(e){o.removeAttribute(e)})))}))}},requires:["computeStyles"]};var ae={name:"offset",enabled:!0,phase:"main",requires:["popperOffsets"],fn:function(e){var t=e.state,n=e.options,r=e.name,o=n.offset,i=void 0===o?[0,0]:o,a=S.reduce((function(e,n){return e[n]=function(e,t,n){var r=C(e),o=[P,D].indexOf(r)>=0?-1:1,i="function"==typeof n?n(Object.assign({},t,{placement:e})):n,a=i[0],s=i[1];return a=a||0,s=(s||0)*o,[P,L].indexOf(r)>=0?{x:s,y:a}:{x:a,y:s}}(n,t.rects,i),e}),{}),s=a[t.placement],f=s.x,c=s.y;null!=t.modifiersData.popperOffsets&&(t.modifiersData.popperOffsets.x+=f,t.modifiersData.popperOffsets.y+=c),t.modifiersData[r]=a}},se={left:"right",right:"left",bottom:"top",top:"bottom"};function fe(e){return e.replace(/left|right|bottom|top/g,(function(e){return se[e]}))}var ce={start:"end",end:"start"};function pe(e){return e.replace(/start|end/g,(function(e){return ce[e]}))}function ue(e,t){void 0===t&&(t={});var n=t,r=n.placement,o=n.boundary,i=n.rootBoundary,a=n.padding,s=n.flipVariations,f=n.allowedAutoPlacements,c=void 0===f?S:f,p=U(r),u=p?s?R:R.filter((function(e){return U(e)===p})):k,l=u.filter((function(e){return c.indexOf(e)>=0}));0===l.length&&(l=u);var d=l.reduce((function(t,n){return t[n]=J(e,{placement:n,boundary:o,rootBoundary:i,padding:a})[C(n)],t}),{});return Object.keys(d).sort((function(e,t){return d[e]-d[t]}))}var le={name:"flip",enabled:!0,phase:"main",fn:function(e){var t=e.state,n=e.options,r=e.name;if(!t.modifiersData[r]._skip){for(var o=n.mainAxis,i=void 0===o||o,a=n.altAxis,s=void 0===a||a,f=n.fallbackPlacements,c=n.padding,p=n.boundary,u=n.rootBoundary,l=n.altBoundary,d=n.flipVariations,h=void 0===d||d,m=n.allowedAutoPlacements,v=t.options.placement,y=C(v),g=f||(y===v||!h?[fe(v)]:function(e){if(C(e)===M)return[];var t=fe(e);return[pe(e),t,pe(t)]}(v)),b=[v].concat(g).reduce((function(e,n){return e.concat(C(n)===M?ue(t,{placement:n,boundary:p,rootBoundary:u,padding:c,flipVariations:h,allowedAutoPlacements:m}):n)}),[]),w=t.rects.reference,x=t.rects.popper,O=new Map,j=!0,E=b[0],k=0;k<b.length;k++){var B=b[k],H=C(B),T=U(B)===W,R=[D,A].indexOf(H)>=0,S=R?"width":"height",V=J(t,{placement:B,boundary:p,rootBoundary:u,altBoundary:l,padding:c}),q=R?T?L:P:T?A:D;w[S]>x[S]&&(q=fe(q));var N=fe(q),I=[];if(i&&I.push(V[H]<=0),s&&I.push(V[q]<=0,V[N]<=0),I.every((function(e){return e}))){E=B,j=!1;break}O.set(B,I)}if(j)for(var _=function(e){var t=b.find((function(t){var n=O.get(t);if(n)return n.slice(0,e).every((function(e){return e}))}));if(t)return E=t,"break"},F=h?3:1;F>0;F--){if("break"===_(F))break}t.placement!==E&&(t.modifiersData[r]._skip=!0,t.placement=E,t.reset=!0)}},requiresIfExists:["offset"],data:{_skip:!1}};function de(e,t,n){return i(e,a(t,n))}var he={name:"preventOverflow",enabled:!0,phase:"main",fn:function(e){var t=e.state,n=e.options,r=e.name,o=n.mainAxis,s=void 0===o||o,f=n.altAxis,c=void 0!==f&&f,p=n.boundary,u=n.rootBoundary,l=n.altBoundary,d=n.padding,h=n.tether,m=void 0===h||h,v=n.tetherOffset,y=void 0===v?0:v,b=J(t,{boundary:p,rootBoundary:u,padding:d,altBoundary:l}),w=C(t.placement),x=U(t.placement),O=!x,j=z(w),M="x"===j?"y":"x",k=t.modifiersData.popperOffsets,B=t.rects.reference,H=t.rects.popper,T="function"==typeof y?y(Object.assign({},t.rects,{placement:t.placement})):y,R="number"==typeof T?{mainAxis:T,altAxis:T}:Object.assign({mainAxis:0,altAxis:0},T),S=t.modifiersData.offset?t.modifiersData.offset[t.placement]:null,V={x:0,y:0};if(k){if(s){var q,N="y"===j?D:P,I="y"===j?A:L,_="y"===j?"height":"width",F=k[j],X=F+b[N],Y=F-b[I],G=m?-H[_]/2:0,K=x===W?B[_]:H[_],Q=x===W?-H[_]:-B[_],Z=t.elements.arrow,$=m&&Z?g(Z):{width:0,height:0},ee=t.modifiersData["arrow#persistent"]?t.modifiersData["arrow#persistent"].padding:{top:0,right:0,bottom:0,left:0},te=ee[N],ne=ee[I],re=de(0,B[_],$[_]),oe=O?B[_]/2-G-re-te-R.mainAxis:K-re-te-R.mainAxis,ie=O?-B[_]/2+G+re+ne+R.mainAxis:Q+re+ne+R.mainAxis,ae=t.elements.arrow&&E(t.elements.arrow),se=ae?"y"===j?ae.clientTop||0:ae.clientLeft||0:0,fe=null!=(q=null==S?void 0:S[j])?q:0,ce=F+ie-fe,pe=de(m?a(X,F+oe-fe-se):X,F,m?i(Y,ce):Y);k[j]=pe,V[j]=pe-F}if(c){var ue,le="x"===j?D:P,he="x"===j?A:L,me=k[M],ve="y"===M?"height":"width",ye=me+b[le],ge=me-b[he],be=-1!==[D,P].indexOf(w),we=null!=(ue=null==S?void 0:S[M])?ue:0,xe=be?ye:me-B[ve]-H[ve]-we+R.altAxis,Oe=be?me+B[ve]+H[ve]-we-R.altAxis:ge,je=m&&be?function(e,t,n){var r=de(e,t,n);return r>n?n:r}(xe,me,Oe):de(m?xe:ye,me,m?Oe:ge);k[M]=je,V[M]=je-me}t.modifiersData[r]=V}},requiresIfExists:["offset"]};var me={name:"arrow",enabled:!0,phase:"main",fn:function(e){var t,n=e.state,r=e.name,o=e.options,i=n.elements.arrow,a=n.modifiersData.popperOffsets,s=C(n.placement),f=z(s),c=[P,L].indexOf(s)>=0?"height":"width";if(i&&a){var p=function(e,t){return Y("number"!=typeof(e="function"==typeof e?e(Object.assign({},t.rects,{placement:t.placement})):e)?e:G(e,k))}(o.padding,n),u=g(i),l="y"===f?D:P,d="y"===f?A:L,h=n.rects.reference[c]+n.rects.reference[f]-a[f]-n.rects.popper[c],m=a[f]-n.rects.reference[f],v=E(i),y=v?"y"===f?v.clientHeight||0:v.clientWidth||0:0,b=h/2-m/2,w=p[l],x=y-u[c]-p[d],O=y/2-u[c]/2+b,j=de(w,O,x),M=f;n.modifiersData[r]=((t={})[M]=j,t.centerOffset=j-O,t)}},effect:function(e){var t=e.state,n=e.options.element,r=void 0===n?"[data-popper-arrow]":n;null!=r&&("string"!=typeof r||(r=t.elements.popper.querySelector(r)))&&N(t.elements.popper,r)&&(t.elements.arrow=r)},requires:["popperOffsets"],requiresIfExists:["preventOverflow"]};function ve(e,t,n){return void 0===n&&(n={x:0,y:0}),{top:e.top-t.height-n.y,right:e.right-t.width+n.x,bottom:e.bottom-t.height+n.y,left:e.left-t.width-n.x}}function ye(e){return[D,L,A,P].some((function(t){return e[t]>=0}))}var ge={name:"hide",enabled:!0,phase:"main",requiresIfExists:["preventOverflow"],fn:function(e){var t=e.state,n=e.name,r=t.rects.reference,o=t.rects.popper,i=t.modifiersData.preventOverflow,a=J(t,{elementContext:"reference"}),s=J(t,{altBoundary:!0}),f=ve(a,r),c=ve(s,o,i),p=ye(f),u=ye(c);t.modifiersData[n]={referenceClippingOffsets:f,popperEscapeOffsets:c,isReferenceHidden:p,hasPopperEscaped:u},t.attributes.popper=Object.assign({},t.attributes.popper,{"data-popper-reference-hidden":p,"data-popper-escaped":u})}},be=Z({defaultModifiers:[ee,te,oe,ie]}),we=[ee,te,oe,ie,ae,le,he,me,ge],xe=Z({defaultModifiers:we});e.applyStyles=ie,e.arrow=me,e.computeStyles=oe,e.createPopper=xe,e.createPopperLite=be,e.defaultModifiers=we,e.detectOverflow=J,e.eventListeners=ee,e.flip=le,e.hide=ge,e.offset=ae,e.popperGenerator=Z,e.popperOffsets=te,e.preventOverflow=he,Object.defineProperty(e,"__esModule",{value:!0})}));
//# sourceMappingURL=popper.min.js.map

/*!
  * Bootstrap v5.2.3 (https://getbootstrap.com/)
  * Copyright 2011-2022 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/main/LICENSE)
  */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e(require("@popperjs/core")):"function"==typeof define&&define.amd?define(["@popperjs/core"],e):(t="undefined"!=typeof globalThis?globalThis:t||self).bootstrap=e(t.Popper)}(this,(function(t){"use strict";function e(t){if(t&&t.__esModule)return t;const e=Object.create(null,{[Symbol.toStringTag]:{value:"Module"}});if(t)for(const i in t)if("default"!==i){const s=Object.getOwnPropertyDescriptor(t,i);Object.defineProperty(e,i,s.get?s:{enumerable:!0,get:()=>t[i]})}return e.default=t,Object.freeze(e)}const i=e(t),s="transitionend",n=t=>{let e=t.getAttribute("data-bs-target");if(!e||"#"===e){let i=t.getAttribute("href");if(!i||!i.includes("#")&&!i.startsWith("."))return null;i.includes("#")&&!i.startsWith("#")&&(i=`#${i.split("#")[1]}`),e=i&&"#"!==i?i.trim():null}return e},o=t=>{const e=n(t);return e&&document.querySelector(e)?e:null},r=t=>{const e=n(t);return e?document.querySelector(e):null},a=t=>{t.dispatchEvent(new Event(s))},l=t=>!(!t||"object"!=typeof t)&&(void 0!==t.jquery&&(t=t[0]),void 0!==t.nodeType),c=t=>l(t)?t.jquery?t[0]:t:"string"==typeof t&&t.length>0?document.querySelector(t):null,h=t=>{if(!l(t)||0===t.getClientRects().length)return!1;const e="visible"===getComputedStyle(t).getPropertyValue("visibility"),i=t.closest("details:not([open])");if(!i)return e;if(i!==t){const e=t.closest("summary");if(e&&e.parentNode!==i)return!1;if(null===e)return!1}return e},d=t=>!t||t.nodeType!==Node.ELEMENT_NODE||!!t.classList.contains("disabled")||(void 0!==t.disabled?t.disabled:t.hasAttribute("disabled")&&"false"!==t.getAttribute("disabled")),u=t=>{if(!document.documentElement.attachShadow)return null;if("function"==typeof t.getRootNode){const e=t.getRootNode();return e instanceof ShadowRoot?e:null}return t instanceof ShadowRoot?t:t.parentNode?u(t.parentNode):null},_=()=>{},g=t=>{t.offsetHeight},f=()=>window.jQuery&&!document.body.hasAttribute("data-bs-no-jquery")?window.jQuery:null,p=[],m=()=>"rtl"===document.documentElement.dir,b=t=>{var e;e=()=>{const e=f();if(e){const i=t.NAME,s=e.fn[i];e.fn[i]=t.jQueryInterface,e.fn[i].Constructor=t,e.fn[i].noConflict=()=>(e.fn[i]=s,t.jQueryInterface)}},"loading"===document.readyState?(p.length||document.addEventListener("DOMContentLoaded",(()=>{for(const t of p)t()})),p.push(e)):e()},v=t=>{"function"==typeof t&&t()},y=(t,e,i=!0)=>{if(!i)return void v(t);const n=(t=>{if(!t)return 0;let{transitionDuration:e,transitionDelay:i}=window.getComputedStyle(t);const s=Number.parseFloat(e),n=Number.parseFloat(i);return s||n?(e=e.split(",")[0],i=i.split(",")[0],1e3*(Number.parseFloat(e)+Number.parseFloat(i))):0})(e)+5;let o=!1;const r=({target:i})=>{i===e&&(o=!0,e.removeEventListener(s,r),v(t))};e.addEventListener(s,r),setTimeout((()=>{o||a(e)}),n)},w=(t,e,i,s)=>{const n=t.length;let o=t.indexOf(e);return-1===o?!i&&s?t[n-1]:t[0]:(o+=i?1:-1,s&&(o=(o+n)%n),t[Math.max(0,Math.min(o,n-1))])},A=/[^.]*(?=\..*)\.|.*/,E=/\..*/,C=/::\d+$/,T={};let k=1;const L={mouseenter:"mouseover",mouseleave:"mouseout"},O=new Set(["click","dblclick","mouseup","mousedown","contextmenu","mousewheel","DOMMouseScroll","mouseover","mouseout","mousemove","selectstart","selectend","keydown","keypress","keyup","orientationchange","touchstart","touchmove","touchend","touchcancel","pointerdown","pointermove","pointerup","pointerleave","pointercancel","gesturestart","gesturechange","gestureend","focus","blur","change","reset","select","submit","focusin","focusout","load","unload","beforeunload","resize","move","DOMContentLoaded","readystatechange","error","abort","scroll"]);function I(t,e){return e&&`${e}::${k++}`||t.uidEvent||k++}function S(t){const e=I(t);return t.uidEvent=e,T[e]=T[e]||{},T[e]}function D(t,e,i=null){return Object.values(t).find((t=>t.callable===e&&t.delegationSelector===i))}function N(t,e,i){const s="string"==typeof e,n=s?i:e||i;let o=j(t);return O.has(o)||(o=t),[s,n,o]}function P(t,e,i,s,n){if("string"!=typeof e||!t)return;let[o,r,a]=N(e,i,s);if(e in L){const t=t=>function(e){if(!e.relatedTarget||e.relatedTarget!==e.delegateTarget&&!e.delegateTarget.contains(e.relatedTarget))return t.call(this,e)};r=t(r)}const l=S(t),c=l[a]||(l[a]={}),h=D(c,r,o?i:null);if(h)return void(h.oneOff=h.oneOff&&n);const d=I(r,e.replace(A,"")),u=o?function(t,e,i){return function s(n){const o=t.querySelectorAll(e);for(let{target:r}=n;r&&r!==this;r=r.parentNode)for(const a of o)if(a===r)return F(n,{delegateTarget:r}),s.oneOff&&$.off(t,n.type,e,i),i.apply(r,[n])}}(t,i,r):function(t,e){return function i(s){return F(s,{delegateTarget:t}),i.oneOff&&$.off(t,s.type,e),e.apply(t,[s])}}(t,r);u.delegationSelector=o?i:null,u.callable=r,u.oneOff=n,u.uidEvent=d,c[d]=u,t.addEventListener(a,u,o)}function x(t,e,i,s,n){const o=D(e[i],s,n);o&&(t.removeEventListener(i,o,Boolean(n)),delete e[i][o.uidEvent])}function M(t,e,i,s){const n=e[i]||{};for(const o of Object.keys(n))if(o.includes(s)){const s=n[o];x(t,e,i,s.callable,s.delegationSelector)}}function j(t){return t=t.replace(E,""),L[t]||t}const $={on(t,e,i,s){P(t,e,i,s,!1)},one(t,e,i,s){P(t,e,i,s,!0)},off(t,e,i,s){if("string"!=typeof e||!t)return;const[n,o,r]=N(e,i,s),a=r!==e,l=S(t),c=l[r]||{},h=e.startsWith(".");if(void 0===o){if(h)for(const i of Object.keys(l))M(t,l,i,e.slice(1));for(const i of Object.keys(c)){const s=i.replace(C,"");if(!a||e.includes(s)){const e=c[i];x(t,l,r,e.callable,e.delegationSelector)}}}else{if(!Object.keys(c).length)return;x(t,l,r,o,n?i:null)}},trigger(t,e,i){if("string"!=typeof e||!t)return null;const s=f();let n=null,o=!0,r=!0,a=!1;e!==j(e)&&s&&(n=s.Event(e,i),s(t).trigger(n),o=!n.isPropagationStopped(),r=!n.isImmediatePropagationStopped(),a=n.isDefaultPrevented());let l=new Event(e,{bubbles:o,cancelable:!0});return l=F(l,i),a&&l.preventDefault(),r&&t.dispatchEvent(l),l.defaultPrevented&&n&&n.preventDefault(),l}};function F(t,e){for(const[i,s]of Object.entries(e||{}))try{t[i]=s}catch(e){Object.defineProperty(t,i,{configurable:!0,get:()=>s})}return t}const z=new Map,H={set(t,e,i){z.has(t)||z.set(t,new Map);const s=z.get(t);s.has(e)||0===s.size?s.set(e,i):console.error(`Bootstrap doesn't allow more than one instance per element. Bound instance: ${Array.from(s.keys())[0]}.`)},get:(t,e)=>z.has(t)&&z.get(t).get(e)||null,remove(t,e){if(!z.has(t))return;const i=z.get(t);i.delete(e),0===i.size&&z.delete(t)}};function q(t){if("true"===t)return!0;if("false"===t)return!1;if(t===Number(t).toString())return Number(t);if(""===t||"null"===t)return null;if("string"!=typeof t)return t;try{return JSON.parse(decodeURIComponent(t))}catch(e){return t}}function B(t){return t.replace(/[A-Z]/g,(t=>`-${t.toLowerCase()}`))}const W={setDataAttribute(t,e,i){t.setAttribute(`data-bs-${B(e)}`,i)},removeDataAttribute(t,e){t.removeAttribute(`data-bs-${B(e)}`)},getDataAttributes(t){if(!t)return{};const e={},i=Object.keys(t.dataset).filter((t=>t.startsWith("bs")&&!t.startsWith("bsConfig")));for(const s of i){let i=s.replace(/^bs/,"");i=i.charAt(0).toLowerCase()+i.slice(1,i.length),e[i]=q(t.dataset[s])}return e},getDataAttribute:(t,e)=>q(t.getAttribute(`data-bs-${B(e)}`))};class R{static get Default(){return{}}static get DefaultType(){return{}}static get NAME(){throw new Error('You have to implement the static method "NAME", for each component!')}_getConfig(t){return t=this._mergeConfigObj(t),t=this._configAfterMerge(t),this._typeCheckConfig(t),t}_configAfterMerge(t){return t}_mergeConfigObj(t,e){const i=l(e)?W.getDataAttribute(e,"config"):{};return{...this.constructor.Default,..."object"==typeof i?i:{},...l(e)?W.getDataAttributes(e):{},..."object"==typeof t?t:{}}}_typeCheckConfig(t,e=this.constructor.DefaultType){for(const s of Object.keys(e)){const n=e[s],o=t[s],r=l(o)?"element":null==(i=o)?`${i}`:Object.prototype.toString.call(i).match(/\s([a-z]+)/i)[1].toLowerCase();if(!new RegExp(n).test(r))throw new TypeError(`${this.constructor.NAME.toUpperCase()}: Option "${s}" provided type "${r}" but expected type "${n}".`)}var i}}class V extends R{constructor(t,e){super(),(t=c(t))&&(this._element=t,this._config=this._getConfig(e),H.set(this._element,this.constructor.DATA_KEY,this))}dispose(){H.remove(this._element,this.constructor.DATA_KEY),$.off(this._element,this.constructor.EVENT_KEY);for(const t of Object.getOwnPropertyNames(this))this[t]=null}_queueCallback(t,e,i=!0){y(t,e,i)}_getConfig(t){return t=this._mergeConfigObj(t,this._element),t=this._configAfterMerge(t),this._typeCheckConfig(t),t}static getInstance(t){return H.get(c(t),this.DATA_KEY)}static getOrCreateInstance(t,e={}){return this.getInstance(t)||new this(t,"object"==typeof e?e:null)}static get VERSION(){return"5.2.3"}static get DATA_KEY(){return`bs.${this.NAME}`}static get EVENT_KEY(){return`.${this.DATA_KEY}`}static eventName(t){return`${t}${this.EVENT_KEY}`}}const K=(t,e="hide")=>{const i=`click.dismiss${t.EVENT_KEY}`,s=t.NAME;$.on(document,i,`[data-bs-dismiss="${s}"]`,(function(i){if(["A","AREA"].includes(this.tagName)&&i.preventDefault(),d(this))return;const n=r(this)||this.closest(`.${s}`);t.getOrCreateInstance(n)[e]()}))};class Q extends V{static get NAME(){return"alert"}close(){if($.trigger(this._element,"close.bs.alert").defaultPrevented)return;this._element.classList.remove("show");const t=this._element.classList.contains("fade");this._queueCallback((()=>this._destroyElement()),this._element,t)}_destroyElement(){this._element.remove(),$.trigger(this._element,"closed.bs.alert"),this.dispose()}static jQueryInterface(t){return this.each((function(){const e=Q.getOrCreateInstance(this);if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t](this)}}))}}K(Q,"close"),b(Q);const X='[data-bs-toggle="button"]';class Y extends V{static get NAME(){return"button"}toggle(){this._element.setAttribute("aria-pressed",this._element.classList.toggle("active"))}static jQueryInterface(t){return this.each((function(){const e=Y.getOrCreateInstance(this);"toggle"===t&&e[t]()}))}}$.on(document,"click.bs.button.data-api",X,(t=>{t.preventDefault();const e=t.target.closest(X);Y.getOrCreateInstance(e).toggle()})),b(Y);const U={find:(t,e=document.documentElement)=>[].concat(...Element.prototype.querySelectorAll.call(e,t)),findOne:(t,e=document.documentElement)=>Element.prototype.querySelector.call(e,t),children:(t,e)=>[].concat(...t.children).filter((t=>t.matches(e))),parents(t,e){const i=[];let s=t.parentNode.closest(e);for(;s;)i.push(s),s=s.parentNode.closest(e);return i},prev(t,e){let i=t.previousElementSibling;for(;i;){if(i.matches(e))return[i];i=i.previousElementSibling}return[]},next(t,e){let i=t.nextElementSibling;for(;i;){if(i.matches(e))return[i];i=i.nextElementSibling}return[]},focusableChildren(t){const e=["a","button","input","textarea","select","details","[tabindex]",'[contenteditable="true"]'].map((t=>`${t}:not([tabindex^="-"])`)).join(",");return this.find(e,t).filter((t=>!d(t)&&h(t)))}},G={endCallback:null,leftCallback:null,rightCallback:null},J={endCallback:"(function|null)",leftCallback:"(function|null)",rightCallback:"(function|null)"};class Z extends R{constructor(t,e){super(),this._element=t,t&&Z.isSupported()&&(this._config=this._getConfig(e),this._deltaX=0,this._supportPointerEvents=Boolean(window.PointerEvent),this._initEvents())}static get Default(){return G}static get DefaultType(){return J}static get NAME(){return"swipe"}dispose(){$.off(this._element,".bs.swipe")}_start(t){this._supportPointerEvents?this._eventIsPointerPenTouch(t)&&(this._deltaX=t.clientX):this._deltaX=t.touches[0].clientX}_end(t){this._eventIsPointerPenTouch(t)&&(this._deltaX=t.clientX-this._deltaX),this._handleSwipe(),v(this._config.endCallback)}_move(t){this._deltaX=t.touches&&t.touches.length>1?0:t.touches[0].clientX-this._deltaX}_handleSwipe(){const t=Math.abs(this._deltaX);if(t<=40)return;const e=t/this._deltaX;this._deltaX=0,e&&v(e>0?this._config.rightCallback:this._config.leftCallback)}_initEvents(){this._supportPointerEvents?($.on(this._element,"pointerdown.bs.swipe",(t=>this._start(t))),$.on(this._element,"pointerup.bs.swipe",(t=>this._end(t))),this._element.classList.add("pointer-event")):($.on(this._element,"touchstart.bs.swipe",(t=>this._start(t))),$.on(this._element,"touchmove.bs.swipe",(t=>this._move(t))),$.on(this._element,"touchend.bs.swipe",(t=>this._end(t))))}_eventIsPointerPenTouch(t){return this._supportPointerEvents&&("pen"===t.pointerType||"touch"===t.pointerType)}static isSupported(){return"ontouchstart"in document.documentElement||navigator.maxTouchPoints>0}}const tt="next",et="prev",it="left",st="right",nt="slid.bs.carousel",ot="carousel",rt="active",at={ArrowLeft:st,ArrowRight:it},lt={interval:5e3,keyboard:!0,pause:"hover",ride:!1,touch:!0,wrap:!0},ct={interval:"(number|boolean)",keyboard:"boolean",pause:"(string|boolean)",ride:"(boolean|string)",touch:"boolean",wrap:"boolean"};class ht extends V{constructor(t,e){super(t,e),this._interval=null,this._activeElement=null,this._isSliding=!1,this.touchTimeout=null,this._swipeHelper=null,this._indicatorsElement=U.findOne(".carousel-indicators",this._element),this._addEventListeners(),this._config.ride===ot&&this.cycle()}static get Default(){return lt}static get DefaultType(){return ct}static get NAME(){return"carousel"}next(){this._slide(tt)}nextWhenVisible(){!document.hidden&&h(this._element)&&this.next()}prev(){this._slide(et)}pause(){this._isSliding&&a(this._element),this._clearInterval()}cycle(){this._clearInterval(),this._updateInterval(),this._interval=setInterval((()=>this.nextWhenVisible()),this._config.interval)}_maybeEnableCycle(){this._config.ride&&(this._isSliding?$.one(this._element,nt,(()=>this.cycle())):this.cycle())}to(t){const e=this._getItems();if(t>e.length-1||t<0)return;if(this._isSliding)return void $.one(this._element,nt,(()=>this.to(t)));const i=this._getItemIndex(this._getActive());if(i===t)return;const s=t>i?tt:et;this._slide(s,e[t])}dispose(){this._swipeHelper&&this._swipeHelper.dispose(),super.dispose()}_configAfterMerge(t){return t.defaultInterval=t.interval,t}_addEventListeners(){this._config.keyboard&&$.on(this._element,"keydown.bs.carousel",(t=>this._keydown(t))),"hover"===this._config.pause&&($.on(this._element,"mouseenter.bs.carousel",(()=>this.pause())),$.on(this._element,"mouseleave.bs.carousel",(()=>this._maybeEnableCycle()))),this._config.touch&&Z.isSupported()&&this._addTouchEventListeners()}_addTouchEventListeners(){for(const t of U.find(".carousel-item img",this._element))$.on(t,"dragstart.bs.carousel",(t=>t.preventDefault()));const t={leftCallback:()=>this._slide(this._directionToOrder(it)),rightCallback:()=>this._slide(this._directionToOrder(st)),endCallback:()=>{"hover"===this._config.pause&&(this.pause(),this.touchTimeout&&clearTimeout(this.touchTimeout),this.touchTimeout=setTimeout((()=>this._maybeEnableCycle()),500+this._config.interval))}};this._swipeHelper=new Z(this._element,t)}_keydown(t){if(/input|textarea/i.test(t.target.tagName))return;const e=at[t.key];e&&(t.preventDefault(),this._slide(this._directionToOrder(e)))}_getItemIndex(t){return this._getItems().indexOf(t)}_setActiveIndicatorElement(t){if(!this._indicatorsElement)return;const e=U.findOne(".active",this._indicatorsElement);e.classList.remove(rt),e.removeAttribute("aria-current");const i=U.findOne(`[data-bs-slide-to="${t}"]`,this._indicatorsElement);i&&(i.classList.add(rt),i.setAttribute("aria-current","true"))}_updateInterval(){const t=this._activeElement||this._getActive();if(!t)return;const e=Number.parseInt(t.getAttribute("data-bs-interval"),10);this._config.interval=e||this._config.defaultInterval}_slide(t,e=null){if(this._isSliding)return;const i=this._getActive(),s=t===tt,n=e||w(this._getItems(),i,s,this._config.wrap);if(n===i)return;const o=this._getItemIndex(n),r=e=>$.trigger(this._element,e,{relatedTarget:n,direction:this._orderToDirection(t),from:this._getItemIndex(i),to:o});if(r("slide.bs.carousel").defaultPrevented)return;if(!i||!n)return;const a=Boolean(this._interval);this.pause(),this._isSliding=!0,this._setActiveIndicatorElement(o),this._activeElement=n;const l=s?"carousel-item-start":"carousel-item-end",c=s?"carousel-item-next":"carousel-item-prev";n.classList.add(c),g(n),i.classList.add(l),n.classList.add(l),this._queueCallback((()=>{n.classList.remove(l,c),n.classList.add(rt),i.classList.remove(rt,c,l),this._isSliding=!1,r(nt)}),i,this._isAnimated()),a&&this.cycle()}_isAnimated(){return this._element.classList.contains("slide")}_getActive(){return U.findOne(".active.carousel-item",this._element)}_getItems(){return U.find(".carousel-item",this._element)}_clearInterval(){this._interval&&(clearInterval(this._interval),this._interval=null)}_directionToOrder(t){return m()?t===it?et:tt:t===it?tt:et}_orderToDirection(t){return m()?t===et?it:st:t===et?st:it}static jQueryInterface(t){return this.each((function(){const e=ht.getOrCreateInstance(this,t);if("number"!=typeof t){if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t]()}}else e.to(t)}))}}$.on(document,"click.bs.carousel.data-api","[data-bs-slide], [data-bs-slide-to]",(function(t){const e=r(this);if(!e||!e.classList.contains(ot))return;t.preventDefault();const i=ht.getOrCreateInstance(e),s=this.getAttribute("data-bs-slide-to");return s?(i.to(s),void i._maybeEnableCycle()):"next"===W.getDataAttribute(this,"slide")?(i.next(),void i._maybeEnableCycle()):(i.prev(),void i._maybeEnableCycle())})),$.on(window,"load.bs.carousel.data-api",(()=>{const t=U.find('[data-bs-ride="carousel"]');for(const e of t)ht.getOrCreateInstance(e)})),b(ht);const dt="show",ut="collapse",_t="collapsing",gt='[data-bs-toggle="collapse"]',ft={parent:null,toggle:!0},pt={parent:"(null|element)",toggle:"boolean"};class mt extends V{constructor(t,e){super(t,e),this._isTransitioning=!1,this._triggerArray=[];const i=U.find(gt);for(const t of i){const e=o(t),i=U.find(e).filter((t=>t===this._element));null!==e&&i.length&&this._triggerArray.push(t)}this._initializeChildren(),this._config.parent||this._addAriaAndCollapsedClass(this._triggerArray,this._isShown()),this._config.toggle&&this.toggle()}static get Default(){return ft}static get DefaultType(){return pt}static get NAME(){return"collapse"}toggle(){this._isShown()?this.hide():this.show()}show(){if(this._isTransitioning||this._isShown())return;let t=[];if(this._config.parent&&(t=this._getFirstLevelChildren(".collapse.show, .collapse.collapsing").filter((t=>t!==this._element)).map((t=>mt.getOrCreateInstance(t,{toggle:!1})))),t.length&&t[0]._isTransitioning)return;if($.trigger(this._element,"show.bs.collapse").defaultPrevented)return;for(const e of t)e.hide();const e=this._getDimension();this._element.classList.remove(ut),this._element.classList.add(_t),this._element.style[e]=0,this._addAriaAndCollapsedClass(this._triggerArray,!0),this._isTransitioning=!0;const i=`scroll${e[0].toUpperCase()+e.slice(1)}`;this._queueCallback((()=>{this._isTransitioning=!1,this._element.classList.remove(_t),this._element.classList.add(ut,dt),this._element.style[e]="",$.trigger(this._element,"shown.bs.collapse")}),this._element,!0),this._element.style[e]=`${this._element[i]}px`}hide(){if(this._isTransitioning||!this._isShown())return;if($.trigger(this._element,"hide.bs.collapse").defaultPrevented)return;const t=this._getDimension();this._element.style[t]=`${this._element.getBoundingClientRect()[t]}px`,g(this._element),this._element.classList.add(_t),this._element.classList.remove(ut,dt);for(const t of this._triggerArray){const e=r(t);e&&!this._isShown(e)&&this._addAriaAndCollapsedClass([t],!1)}this._isTransitioning=!0,this._element.style[t]="",this._queueCallback((()=>{this._isTransitioning=!1,this._element.classList.remove(_t),this._element.classList.add(ut),$.trigger(this._element,"hidden.bs.collapse")}),this._element,!0)}_isShown(t=this._element){return t.classList.contains(dt)}_configAfterMerge(t){return t.toggle=Boolean(t.toggle),t.parent=c(t.parent),t}_getDimension(){return this._element.classList.contains("collapse-horizontal")?"width":"height"}_initializeChildren(){if(!this._config.parent)return;const t=this._getFirstLevelChildren(gt);for(const e of t){const t=r(e);t&&this._addAriaAndCollapsedClass([e],this._isShown(t))}}_getFirstLevelChildren(t){const e=U.find(":scope .collapse .collapse",this._config.parent);return U.find(t,this._config.parent).filter((t=>!e.includes(t)))}_addAriaAndCollapsedClass(t,e){if(t.length)for(const i of t)i.classList.toggle("collapsed",!e),i.setAttribute("aria-expanded",e)}static jQueryInterface(t){const e={};return"string"==typeof t&&/show|hide/.test(t)&&(e.toggle=!1),this.each((function(){const i=mt.getOrCreateInstance(this,e);if("string"==typeof t){if(void 0===i[t])throw new TypeError(`No method named "${t}"`);i[t]()}}))}}$.on(document,"click.bs.collapse.data-api",gt,(function(t){("A"===t.target.tagName||t.delegateTarget&&"A"===t.delegateTarget.tagName)&&t.preventDefault();const e=o(this),i=U.find(e);for(const t of i)mt.getOrCreateInstance(t,{toggle:!1}).toggle()})),b(mt);const bt="dropdown",vt="ArrowUp",yt="ArrowDown",wt="click.bs.dropdown.data-api",At="keydown.bs.dropdown.data-api",Et="show",Ct='[data-bs-toggle="dropdown"]:not(.disabled):not(:disabled)',Tt=`${Ct}.show`,kt=".dropdown-menu",Lt=m()?"top-end":"top-start",Ot=m()?"top-start":"top-end",It=m()?"bottom-end":"bottom-start",St=m()?"bottom-start":"bottom-end",Dt=m()?"left-start":"right-start",Nt=m()?"right-start":"left-start",Pt={autoClose:!0,boundary:"clippingParents",display:"dynamic",offset:[0,2],popperConfig:null,reference:"toggle"},xt={autoClose:"(boolean|string)",boundary:"(string|element)",display:"string",offset:"(array|string|function)",popperConfig:"(null|object|function)",reference:"(string|element|object)"};class Mt extends V{constructor(t,e){super(t,e),this._popper=null,this._parent=this._element.parentNode,this._menu=U.next(this._element,kt)[0]||U.prev(this._element,kt)[0]||U.findOne(kt,this._parent),this._inNavbar=this._detectNavbar()}static get Default(){return Pt}static get DefaultType(){return xt}static get NAME(){return bt}toggle(){return this._isShown()?this.hide():this.show()}show(){if(d(this._element)||this._isShown())return;const t={relatedTarget:this._element};if(!$.trigger(this._element,"show.bs.dropdown",t).defaultPrevented){if(this._createPopper(),"ontouchstart"in document.documentElement&&!this._parent.closest(".navbar-nav"))for(const t of[].concat(...document.body.children))$.on(t,"mouseover",_);this._element.focus(),this._element.setAttribute("aria-expanded",!0),this._menu.classList.add(Et),this._element.classList.add(Et),$.trigger(this._element,"shown.bs.dropdown",t)}}hide(){if(d(this._element)||!this._isShown())return;const t={relatedTarget:this._element};this._completeHide(t)}dispose(){this._popper&&this._popper.destroy(),super.dispose()}update(){this._inNavbar=this._detectNavbar(),this._popper&&this._popper.update()}_completeHide(t){if(!$.trigger(this._element,"hide.bs.dropdown",t).defaultPrevented){if("ontouchstart"in document.documentElement)for(const t of[].concat(...document.body.children))$.off(t,"mouseover",_);this._popper&&this._popper.destroy(),this._menu.classList.remove(Et),this._element.classList.remove(Et),this._element.setAttribute("aria-expanded","false"),W.removeDataAttribute(this._menu,"popper"),$.trigger(this._element,"hidden.bs.dropdown",t)}}_getConfig(t){if("object"==typeof(t=super._getConfig(t)).reference&&!l(t.reference)&&"function"!=typeof t.reference.getBoundingClientRect)throw new TypeError(`${bt.toUpperCase()}: Option "reference" provided type "object" without a required "getBoundingClientRect" method.`);return t}_createPopper(){if(void 0===i)throw new TypeError("Bootstrap's dropdowns require Popper (https://popper.js.org)");let t=this._element;"parent"===this._config.reference?t=this._parent:l(this._config.reference)?t=c(this._config.reference):"object"==typeof this._config.reference&&(t=this._config.reference);const e=this._getPopperConfig();this._popper=i.createPopper(t,this._menu,e)}_isShown(){return this._menu.classList.contains(Et)}_getPlacement(){const t=this._parent;if(t.classList.contains("dropend"))return Dt;if(t.classList.contains("dropstart"))return Nt;if(t.classList.contains("dropup-center"))return"top";if(t.classList.contains("dropdown-center"))return"bottom";const e="end"===getComputedStyle(this._menu).getPropertyValue("--bs-position").trim();return t.classList.contains("dropup")?e?Ot:Lt:e?St:It}_detectNavbar(){return null!==this._element.closest(".navbar")}_getOffset(){const{offset:t}=this._config;return"string"==typeof t?t.split(",").map((t=>Number.parseInt(t,10))):"function"==typeof t?e=>t(e,this._element):t}_getPopperConfig(){const t={placement:this._getPlacement(),modifiers:[{name:"preventOverflow",options:{boundary:this._config.boundary}},{name:"offset",options:{offset:this._getOffset()}}]};return(this._inNavbar||"static"===this._config.display)&&(W.setDataAttribute(this._menu,"popper","static"),t.modifiers=[{name:"applyStyles",enabled:!1}]),{...t,..."function"==typeof this._config.popperConfig?this._config.popperConfig(t):this._config.popperConfig}}_selectMenuItem({key:t,target:e}){const i=U.find(".dropdown-menu .dropdown-item:not(.disabled):not(:disabled)",this._menu).filter((t=>h(t)));i.length&&w(i,e,t===yt,!i.includes(e)).focus()}static jQueryInterface(t){return this.each((function(){const e=Mt.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t])throw new TypeError(`No method named "${t}"`);e[t]()}}))}static clearMenus(t){if(2===t.button||"keyup"===t.type&&"Tab"!==t.key)return;const e=U.find(Tt);for(const i of e){const e=Mt.getInstance(i);if(!e||!1===e._config.autoClose)continue;const s=t.composedPath(),n=s.includes(e._menu);if(s.includes(e._element)||"inside"===e._config.autoClose&&!n||"outside"===e._config.autoClose&&n)continue;if(e._menu.contains(t.target)&&("keyup"===t.type&&"Tab"===t.key||/input|select|option|textarea|form/i.test(t.target.tagName)))continue;const o={relatedTarget:e._element};"click"===t.type&&(o.clickEvent=t),e._completeHide(o)}}static dataApiKeydownHandler(t){const e=/input|textarea/i.test(t.target.tagName),i="Escape"===t.key,s=[vt,yt].includes(t.key);if(!s&&!i)return;if(e&&!i)return;t.preventDefault();const n=this.matches(Ct)?this:U.prev(this,Ct)[0]||U.next(this,Ct)[0]||U.findOne(Ct,t.delegateTarget.parentNode),o=Mt.getOrCreateInstance(n);if(s)return t.stopPropagation(),o.show(),void o._selectMenuItem(t);o._isShown()&&(t.stopPropagation(),o.hide(),n.focus())}}$.on(document,At,Ct,Mt.dataApiKeydownHandler),$.on(document,At,kt,Mt.dataApiKeydownHandler),$.on(document,wt,Mt.clearMenus),$.on(document,"keyup.bs.dropdown.data-api",Mt.clearMenus),$.on(document,wt,Ct,(function(t){t.preventDefault(),Mt.getOrCreateInstance(this).toggle()})),b(Mt);const jt=".fixed-top, .fixed-bottom, .is-fixed, .sticky-top",$t=".sticky-top",Ft="padding-right",zt="margin-right";class Ht{constructor(){this._element=document.body}getWidth(){const t=document.documentElement.clientWidth;return Math.abs(window.innerWidth-t)}hide(){const t=this.getWidth();this._disableOverFlow(),this._setElementAttributes(this._element,Ft,(e=>e+t)),this._setElementAttributes(jt,Ft,(e=>e+t)),this._setElementAttributes($t,zt,(e=>e-t))}reset(){this._resetElementAttributes(this._element,"overflow"),this._resetElementAttributes(this._element,Ft),this._resetElementAttributes(jt,Ft),this._resetElementAttributes($t,zt)}isOverflowing(){return this.getWidth()>0}_disableOverFlow(){this._saveInitialAttribute(this._element,"overflow"),this._element.style.overflow="hidden"}_setElementAttributes(t,e,i){const s=this.getWidth();this._applyManipulationCallback(t,(t=>{if(t!==this._element&&window.innerWidth>t.clientWidth+s)return;this._saveInitialAttribute(t,e);const n=window.getComputedStyle(t).getPropertyValue(e);t.style.setProperty(e,`${i(Number.parseFloat(n))}px`)}))}_saveInitialAttribute(t,e){const i=t.style.getPropertyValue(e);i&&W.setDataAttribute(t,e,i)}_resetElementAttributes(t,e){this._applyManipulationCallback(t,(t=>{const i=W.getDataAttribute(t,e);null!==i?(W.removeDataAttribute(t,e),t.style.setProperty(e,i)):t.style.removeProperty(e)}))}_applyManipulationCallback(t,e){if(l(t))e(t);else for(const i of U.find(t,this._element))e(i)}}const qt="show",Bt="mousedown.bs.backdrop",Wt={className:"modal-backdrop",clickCallback:null,isAnimated:!1,isVisible:!0,rootElement:"body"},Rt={className:"string",clickCallback:"(function|null)",isAnimated:"boolean",isVisible:"boolean",rootElement:"(element|string)"};class Vt extends R{constructor(t){super(),this._config=this._getConfig(t),this._isAppended=!1,this._element=null}static get Default(){return Wt}static get DefaultType(){return Rt}static get NAME(){return"backdrop"}show(t){if(!this._config.isVisible)return void v(t);this._append();const e=this._getElement();this._config.isAnimated&&g(e),e.classList.add(qt),this._emulateAnimation((()=>{v(t)}))}hide(t){this._config.isVisible?(this._getElement().classList.remove(qt),this._emulateAnimation((()=>{this.dispose(),v(t)}))):v(t)}dispose(){this._isAppended&&($.off(this._element,Bt),this._element.remove(),this._isAppended=!1)}_getElement(){if(!this._element){const t=document.createElement("div");t.className=this._config.className,this._config.isAnimated&&t.classList.add("fade"),this._element=t}return this._element}_configAfterMerge(t){return t.rootElement=c(t.rootElement),t}_append(){if(this._isAppended)return;const t=this._getElement();this._config.rootElement.append(t),$.on(t,Bt,(()=>{v(this._config.clickCallback)})),this._isAppended=!0}_emulateAnimation(t){y(t,this._getElement(),this._config.isAnimated)}}const Kt=".bs.focustrap",Qt="backward",Xt={autofocus:!0,trapElement:null},Yt={autofocus:"boolean",trapElement:"element"};class Ut extends R{constructor(t){super(),this._config=this._getConfig(t),this._isActive=!1,this._lastTabNavDirection=null}static get Default(){return Xt}static get DefaultType(){return Yt}static get NAME(){return"focustrap"}activate(){this._isActive||(this._config.autofocus&&this._config.trapElement.focus(),$.off(document,Kt),$.on(document,"focusin.bs.focustrap",(t=>this._handleFocusin(t))),$.on(document,"keydown.tab.bs.focustrap",(t=>this._handleKeydown(t))),this._isActive=!0)}deactivate(){this._isActive&&(this._isActive=!1,$.off(document,Kt))}_handleFocusin(t){const{trapElement:e}=this._config;if(t.target===document||t.target===e||e.contains(t.target))return;const i=U.focusableChildren(e);0===i.length?e.focus():this._lastTabNavDirection===Qt?i[i.length-1].focus():i[0].focus()}_handleKeydown(t){"Tab"===t.key&&(this._lastTabNavDirection=t.shiftKey?Qt:"forward")}}const Gt="hidden.bs.modal",Jt="show.bs.modal",Zt="modal-open",te="show",ee="modal-static",ie={backdrop:!0,focus:!0,keyboard:!0},se={backdrop:"(boolean|string)",focus:"boolean",keyboard:"boolean"};class ne extends V{constructor(t,e){super(t,e),this._dialog=U.findOne(".modal-dialog",this._element),this._backdrop=this._initializeBackDrop(),this._focustrap=this._initializeFocusTrap(),this._isShown=!1,this._isTransitioning=!1,this._scrollBar=new Ht,this._addEventListeners()}static get Default(){return ie}static get DefaultType(){return se}static get NAME(){return"modal"}toggle(t){return this._isShown?this.hide():this.show(t)}show(t){this._isShown||this._isTransitioning||$.trigger(this._element,Jt,{relatedTarget:t}).defaultPrevented||(this._isShown=!0,this._isTransitioning=!0,this._scrollBar.hide(),document.body.classList.add(Zt),this._adjustDialog(),this._backdrop.show((()=>this._showElement(t))))}hide(){this._isShown&&!this._isTransitioning&&($.trigger(this._element,"hide.bs.modal").defaultPrevented||(this._isShown=!1,this._isTransitioning=!0,this._focustrap.deactivate(),this._element.classList.remove(te),this._queueCallback((()=>this._hideModal()),this._element,this._isAnimated())))}dispose(){for(const t of[window,this._dialog])$.off(t,".bs.modal");this._backdrop.dispose(),this._focustrap.deactivate(),super.dispose()}handleUpdate(){this._adjustDialog()}_initializeBackDrop(){return new Vt({isVisible:Boolean(this._config.backdrop),isAnimated:this._isAnimated()})}_initializeFocusTrap(){return new Ut({trapElement:this._element})}_showElement(t){document.body.contains(this._element)||document.body.append(this._element),this._element.style.display="block",this._element.removeAttribute("aria-hidden"),this._element.setAttribute("aria-modal",!0),this._element.setAttribute("role","dialog"),this._element.scrollTop=0;const e=U.findOne(".modal-body",this._dialog);e&&(e.scrollTop=0),g(this._element),this._element.classList.add(te),this._queueCallback((()=>{this._config.focus&&this._focustrap.activate(),this._isTransitioning=!1,$.trigger(this._element,"shown.bs.modal",{relatedTarget:t})}),this._dialog,this._isAnimated())}_addEventListeners(){$.on(this._element,"keydown.dismiss.bs.modal",(t=>{if("Escape"===t.key)return this._config.keyboard?(t.preventDefault(),void this.hide()):void this._triggerBackdropTransition()})),$.on(window,"resize.bs.modal",(()=>{this._isShown&&!this._isTransitioning&&this._adjustDialog()})),$.on(this._element,"mousedown.dismiss.bs.modal",(t=>{$.one(this._element,"click.dismiss.bs.modal",(e=>{this._element===t.target&&this._element===e.target&&("static"!==this._config.backdrop?this._config.backdrop&&this.hide():this._triggerBackdropTransition())}))}))}_hideModal(){this._element.style.display="none",this._element.setAttribute("aria-hidden",!0),this._element.removeAttribute("aria-modal"),this._element.removeAttribute("role"),this._isTransitioning=!1,this._backdrop.hide((()=>{document.body.classList.remove(Zt),this._resetAdjustments(),this._scrollBar.reset(),$.trigger(this._element,Gt)}))}_isAnimated(){return this._element.classList.contains("fade")}_triggerBackdropTransition(){if($.trigger(this._element,"hidePrevented.bs.modal").defaultPrevented)return;const t=this._element.scrollHeight>document.documentElement.clientHeight,e=this._element.style.overflowY;"hidden"===e||this._element.classList.contains(ee)||(t||(this._element.style.overflowY="hidden"),this._element.classList.add(ee),this._queueCallback((()=>{this._element.classList.remove(ee),this._queueCallback((()=>{this._element.style.overflowY=e}),this._dialog)}),this._dialog),this._element.focus())}_adjustDialog(){const t=this._element.scrollHeight>document.documentElement.clientHeight,e=this._scrollBar.getWidth(),i=e>0;if(i&&!t){const t=m()?"paddingLeft":"paddingRight";this._element.style[t]=`${e}px`}if(!i&&t){const t=m()?"paddingRight":"paddingLeft";this._element.style[t]=`${e}px`}}_resetAdjustments(){this._element.style.paddingLeft="",this._element.style.paddingRight=""}static jQueryInterface(t,e){return this.each((function(){const i=ne.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===i[t])throw new TypeError(`No method named "${t}"`);i[t](e)}}))}}$.on(document,"click.bs.modal.data-api",'[data-bs-toggle="modal"]',(function(t){const e=r(this);["A","AREA"].includes(this.tagName)&&t.preventDefault(),$.one(e,Jt,(t=>{t.defaultPrevented||$.one(e,Gt,(()=>{h(this)&&this.focus()}))}));const i=U.findOne(".modal.show");i&&ne.getInstance(i).hide(),ne.getOrCreateInstance(e).toggle(this)})),K(ne),b(ne);const oe="show",re="showing",ae="hiding",le=".offcanvas.show",ce="hidePrevented.bs.offcanvas",he="hidden.bs.offcanvas",de={backdrop:!0,keyboard:!0,scroll:!1},ue={backdrop:"(boolean|string)",keyboard:"boolean",scroll:"boolean"};class _e extends V{constructor(t,e){super(t,e),this._isShown=!1,this._backdrop=this._initializeBackDrop(),this._focustrap=this._initializeFocusTrap(),this._addEventListeners()}static get Default(){return de}static get DefaultType(){return ue}static get NAME(){return"offcanvas"}toggle(t){return this._isShown?this.hide():this.show(t)}show(t){this._isShown||$.trigger(this._element,"show.bs.offcanvas",{relatedTarget:t}).defaultPrevented||(this._isShown=!0,this._backdrop.show(),this._config.scroll||(new Ht).hide(),this._element.setAttribute("aria-modal",!0),this._element.setAttribute("role","dialog"),this._element.classList.add(re),this._queueCallback((()=>{this._config.scroll&&!this._config.backdrop||this._focustrap.activate(),this._element.classList.add(oe),this._element.classList.remove(re),$.trigger(this._element,"shown.bs.offcanvas",{relatedTarget:t})}),this._element,!0))}hide(){this._isShown&&($.trigger(this._element,"hide.bs.offcanvas").defaultPrevented||(this._focustrap.deactivate(),this._element.blur(),this._isShown=!1,this._element.classList.add(ae),this._backdrop.hide(),this._queueCallback((()=>{this._element.classList.remove(oe,ae),this._element.removeAttribute("aria-modal"),this._element.removeAttribute("role"),this._config.scroll||(new Ht).reset(),$.trigger(this._element,he)}),this._element,!0)))}dispose(){this._backdrop.dispose(),this._focustrap.deactivate(),super.dispose()}_initializeBackDrop(){const t=Boolean(this._config.backdrop);return new Vt({className:"offcanvas-backdrop",isVisible:t,isAnimated:!0,rootElement:this._element.parentNode,clickCallback:t?()=>{"static"!==this._config.backdrop?this.hide():$.trigger(this._element,ce)}:null})}_initializeFocusTrap(){return new Ut({trapElement:this._element})}_addEventListeners(){$.on(this._element,"keydown.dismiss.bs.offcanvas",(t=>{"Escape"===t.key&&(this._config.keyboard?this.hide():$.trigger(this._element,ce))}))}static jQueryInterface(t){return this.each((function(){const e=_e.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t](this)}}))}}$.on(document,"click.bs.offcanvas.data-api",'[data-bs-toggle="offcanvas"]',(function(t){const e=r(this);if(["A","AREA"].includes(this.tagName)&&t.preventDefault(),d(this))return;$.one(e,he,(()=>{h(this)&&this.focus()}));const i=U.findOne(le);i&&i!==e&&_e.getInstance(i).hide(),_e.getOrCreateInstance(e).toggle(this)})),$.on(window,"load.bs.offcanvas.data-api",(()=>{for(const t of U.find(le))_e.getOrCreateInstance(t).show()})),$.on(window,"resize.bs.offcanvas",(()=>{for(const t of U.find("[aria-modal][class*=show][class*=offcanvas-]"))"fixed"!==getComputedStyle(t).position&&_e.getOrCreateInstance(t).hide()})),K(_e),b(_e);const ge=new Set(["background","cite","href","itemtype","longdesc","poster","src","xlink:href"]),fe=/^(?:(?:https?|mailto|ftp|tel|file|sms):|[^#&/:?]*(?:[#/?]|$))/i,pe=/^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[\d+/a-z]+=*$/i,me=(t,e)=>{const i=t.nodeName.toLowerCase();return e.includes(i)?!ge.has(i)||Boolean(fe.test(t.nodeValue)||pe.test(t.nodeValue)):e.filter((t=>t instanceof RegExp)).some((t=>t.test(i)))},be={"*":["class","dir","id","lang","role",/^aria-[\w-]*$/i],a:["target","href","title","rel"],area:[],b:[],br:[],col:[],code:[],div:[],em:[],hr:[],h1:[],h2:[],h3:[],h4:[],h5:[],h6:[],i:[],img:["src","srcset","alt","title","width","height"],li:[],ol:[],p:[],pre:[],s:[],small:[],span:[],sub:[],sup:[],strong:[],u:[],ul:[]},ve={allowList:be,content:{},extraClass:"",html:!1,sanitize:!0,sanitizeFn:null,template:"<div></div>"},ye={allowList:"object",content:"object",extraClass:"(string|function)",html:"boolean",sanitize:"boolean",sanitizeFn:"(null|function)",template:"string"},we={entry:"(string|element|function|null)",selector:"(string|element)"};class Ae extends R{constructor(t){super(),this._config=this._getConfig(t)}static get Default(){return ve}static get DefaultType(){return ye}static get NAME(){return"TemplateFactory"}getContent(){return Object.values(this._config.content).map((t=>this._resolvePossibleFunction(t))).filter(Boolean)}hasContent(){return this.getContent().length>0}changeContent(t){return this._checkContent(t),this._config.content={...this._config.content,...t},this}toHtml(){const t=document.createElement("div");t.innerHTML=this._maybeSanitize(this._config.template);for(const[e,i]of Object.entries(this._config.content))this._setContent(t,i,e);const e=t.children[0],i=this._resolvePossibleFunction(this._config.extraClass);return i&&e.classList.add(...i.split(" ")),e}_typeCheckConfig(t){super._typeCheckConfig(t),this._checkContent(t.content)}_checkContent(t){for(const[e,i]of Object.entries(t))super._typeCheckConfig({selector:e,entry:i},we)}_setContent(t,e,i){const s=U.findOne(i,t);s&&((e=this._resolvePossibleFunction(e))?l(e)?this._putElementInTemplate(c(e),s):this._config.html?s.innerHTML=this._maybeSanitize(e):s.textContent=e:s.remove())}_maybeSanitize(t){return this._config.sanitize?function(t,e,i){if(!t.length)return t;if(i&&"function"==typeof i)return i(t);const s=(new window.DOMParser).parseFromString(t,"text/html"),n=[].concat(...s.body.querySelectorAll("*"));for(const t of n){const i=t.nodeName.toLowerCase();if(!Object.keys(e).includes(i)){t.remove();continue}const s=[].concat(...t.attributes),n=[].concat(e["*"]||[],e[i]||[]);for(const e of s)me(e,n)||t.removeAttribute(e.nodeName)}return s.body.innerHTML}(t,this._config.allowList,this._config.sanitizeFn):t}_resolvePossibleFunction(t){return"function"==typeof t?t(this):t}_putElementInTemplate(t,e){if(this._config.html)return e.innerHTML="",void e.append(t);e.textContent=t.textContent}}const Ee=new Set(["sanitize","allowList","sanitizeFn"]),Ce="fade",Te="show",ke=".modal",Le="hide.bs.modal",Oe="hover",Ie="focus",Se={AUTO:"auto",TOP:"top",RIGHT:m()?"left":"right",BOTTOM:"bottom",LEFT:m()?"right":"left"},De={allowList:be,animation:!0,boundary:"clippingParents",container:!1,customClass:"",delay:0,fallbackPlacements:["top","right","bottom","left"],html:!1,offset:[0,0],placement:"top",popperConfig:null,sanitize:!0,sanitizeFn:null,selector:!1,template:'<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',title:"",trigger:"hover focus"},Ne={allowList:"object",animation:"boolean",boundary:"(string|element)",container:"(string|element|boolean)",customClass:"(string|function)",delay:"(number|object)",fallbackPlacements:"array",html:"boolean",offset:"(array|string|function)",placement:"(string|function)",popperConfig:"(null|object|function)",sanitize:"boolean",sanitizeFn:"(null|function)",selector:"(string|boolean)",template:"string",title:"(string|element|function)",trigger:"string"};class Pe extends V{constructor(t,e){if(void 0===i)throw new TypeError("Bootstrap's tooltips require Popper (https://popper.js.org)");super(t,e),this._isEnabled=!0,this._timeout=0,this._isHovered=null,this._activeTrigger={},this._popper=null,this._templateFactory=null,this._newContent=null,this.tip=null,this._setListeners(),this._config.selector||this._fixTitle()}static get Default(){return De}static get DefaultType(){return Ne}static get NAME(){return"tooltip"}enable(){this._isEnabled=!0}disable(){this._isEnabled=!1}toggleEnabled(){this._isEnabled=!this._isEnabled}toggle(){this._isEnabled&&(this._activeTrigger.click=!this._activeTrigger.click,this._isShown()?this._leave():this._enter())}dispose(){clearTimeout(this._timeout),$.off(this._element.closest(ke),Le,this._hideModalHandler),this._element.getAttribute("data-bs-original-title")&&this._element.setAttribute("title",this._element.getAttribute("data-bs-original-title")),this._disposePopper(),super.dispose()}show(){if("none"===this._element.style.display)throw new Error("Please use show on visible elements");if(!this._isWithContent()||!this._isEnabled)return;const t=$.trigger(this._element,this.constructor.eventName("show")),e=(u(this._element)||this._element.ownerDocument.documentElement).contains(this._element);if(t.defaultPrevented||!e)return;this._disposePopper();const i=this._getTipElement();this._element.setAttribute("aria-describedby",i.getAttribute("id"));const{container:s}=this._config;if(this._element.ownerDocument.documentElement.contains(this.tip)||(s.append(i),$.trigger(this._element,this.constructor.eventName("inserted"))),this._popper=this._createPopper(i),i.classList.add(Te),"ontouchstart"in document.documentElement)for(const t of[].concat(...document.body.children))$.on(t,"mouseover",_);this._queueCallback((()=>{$.trigger(this._element,this.constructor.eventName("shown")),!1===this._isHovered&&this._leave(),this._isHovered=!1}),this.tip,this._isAnimated())}hide(){if(this._isShown()&&!$.trigger(this._element,this.constructor.eventName("hide")).defaultPrevented){if(this._getTipElement().classList.remove(Te),"ontouchstart"in document.documentElement)for(const t of[].concat(...document.body.children))$.off(t,"mouseover",_);this._activeTrigger.click=!1,this._activeTrigger.focus=!1,this._activeTrigger.hover=!1,this._isHovered=null,this._queueCallback((()=>{this._isWithActiveTrigger()||(this._isHovered||this._disposePopper(),this._element.removeAttribute("aria-describedby"),$.trigger(this._element,this.constructor.eventName("hidden")))}),this.tip,this._isAnimated())}}update(){this._popper&&this._popper.update()}_isWithContent(){return Boolean(this._getTitle())}_getTipElement(){return this.tip||(this.tip=this._createTipElement(this._newContent||this._getContentForTemplate())),this.tip}_createTipElement(t){const e=this._getTemplateFactory(t).toHtml();if(!e)return null;e.classList.remove(Ce,Te),e.classList.add(`bs-${this.constructor.NAME}-auto`);const i=(t=>{do{t+=Math.floor(1e6*Math.random())}while(document.getElementById(t));return t})(this.constructor.NAME).toString();return e.setAttribute("id",i),this._isAnimated()&&e.classList.add(Ce),e}setContent(t){this._newContent=t,this._isShown()&&(this._disposePopper(),this.show())}_getTemplateFactory(t){return this._templateFactory?this._templateFactory.changeContent(t):this._templateFactory=new Ae({...this._config,content:t,extraClass:this._resolvePossibleFunction(this._config.customClass)}),this._templateFactory}_getContentForTemplate(){return{".tooltip-inner":this._getTitle()}}_getTitle(){return this._resolvePossibleFunction(this._config.title)||this._element.getAttribute("data-bs-original-title")}_initializeOnDelegatedTarget(t){return this.constructor.getOrCreateInstance(t.delegateTarget,this._getDelegateConfig())}_isAnimated(){return this._config.animation||this.tip&&this.tip.classList.contains(Ce)}_isShown(){return this.tip&&this.tip.classList.contains(Te)}_createPopper(t){const e="function"==typeof this._config.placement?this._config.placement.call(this,t,this._element):this._config.placement,s=Se[e.toUpperCase()];return i.createPopper(this._element,t,this._getPopperConfig(s))}_getOffset(){const{offset:t}=this._config;return"string"==typeof t?t.split(",").map((t=>Number.parseInt(t,10))):"function"==typeof t?e=>t(e,this._element):t}_resolvePossibleFunction(t){return"function"==typeof t?t.call(this._element):t}_getPopperConfig(t){const e={placement:t,modifiers:[{name:"flip",options:{fallbackPlacements:this._config.fallbackPlacements}},{name:"offset",options:{offset:this._getOffset()}},{name:"preventOverflow",options:{boundary:this._config.boundary}},{name:"arrow",options:{element:`.${this.constructor.NAME}-arrow`}},{name:"preSetPlacement",enabled:!0,phase:"beforeMain",fn:t=>{this._getTipElement().setAttribute("data-popper-placement",t.state.placement)}}]};return{...e,..."function"==typeof this._config.popperConfig?this._config.popperConfig(e):this._config.popperConfig}}_setListeners(){const t=this._config.trigger.split(" ");for(const e of t)if("click"===e)$.on(this._element,this.constructor.eventName("click"),this._config.selector,(t=>{this._initializeOnDelegatedTarget(t).toggle()}));else if("manual"!==e){const t=e===Oe?this.constructor.eventName("mouseenter"):this.constructor.eventName("focusin"),i=e===Oe?this.constructor.eventName("mouseleave"):this.constructor.eventName("focusout");$.on(this._element,t,this._config.selector,(t=>{const e=this._initializeOnDelegatedTarget(t);e._activeTrigger["focusin"===t.type?Ie:Oe]=!0,e._enter()})),$.on(this._element,i,this._config.selector,(t=>{const e=this._initializeOnDelegatedTarget(t);e._activeTrigger["focusout"===t.type?Ie:Oe]=e._element.contains(t.relatedTarget),e._leave()}))}this._hideModalHandler=()=>{this._element&&this.hide()},$.on(this._element.closest(ke),Le,this._hideModalHandler)}_fixTitle(){const t=this._element.getAttribute("title");t&&(this._element.getAttribute("aria-label")||this._element.textContent.trim()||this._element.setAttribute("aria-label",t),this._element.setAttribute("data-bs-original-title",t),this._element.removeAttribute("title"))}_enter(){this._isShown()||this._isHovered?this._isHovered=!0:(this._isHovered=!0,this._setTimeout((()=>{this._isHovered&&this.show()}),this._config.delay.show))}_leave(){this._isWithActiveTrigger()||(this._isHovered=!1,this._setTimeout((()=>{this._isHovered||this.hide()}),this._config.delay.hide))}_setTimeout(t,e){clearTimeout(this._timeout),this._timeout=setTimeout(t,e)}_isWithActiveTrigger(){return Object.values(this._activeTrigger).includes(!0)}_getConfig(t){const e=W.getDataAttributes(this._element);for(const t of Object.keys(e))Ee.has(t)&&delete e[t];return t={...e,..."object"==typeof t&&t?t:{}},t=this._mergeConfigObj(t),t=this._configAfterMerge(t),this._typeCheckConfig(t),t}_configAfterMerge(t){return t.container=!1===t.container?document.body:c(t.container),"number"==typeof t.delay&&(t.delay={show:t.delay,hide:t.delay}),"number"==typeof t.title&&(t.title=t.title.toString()),"number"==typeof t.content&&(t.content=t.content.toString()),t}_getDelegateConfig(){const t={};for(const e in this._config)this.constructor.Default[e]!==this._config[e]&&(t[e]=this._config[e]);return t.selector=!1,t.trigger="manual",t}_disposePopper(){this._popper&&(this._popper.destroy(),this._popper=null),this.tip&&(this.tip.remove(),this.tip=null)}static jQueryInterface(t){return this.each((function(){const e=Pe.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t])throw new TypeError(`No method named "${t}"`);e[t]()}}))}}b(Pe);const xe={...Pe.Default,content:"",offset:[0,8],placement:"right",template:'<div class="popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',trigger:"click"},Me={...Pe.DefaultType,content:"(null|string|element|function)"};class je extends Pe{static get Default(){return xe}static get DefaultType(){return Me}static get NAME(){return"popover"}_isWithContent(){return this._getTitle()||this._getContent()}_getContentForTemplate(){return{".popover-header":this._getTitle(),".popover-body":this._getContent()}}_getContent(){return this._resolvePossibleFunction(this._config.content)}static jQueryInterface(t){return this.each((function(){const e=je.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t])throw new TypeError(`No method named "${t}"`);e[t]()}}))}}b(je);const $e="click.bs.scrollspy",Fe="active",ze="[href]",He={offset:null,rootMargin:"0px 0px -25%",smoothScroll:!1,target:null,threshold:[.1,.5,1]},qe={offset:"(number|null)",rootMargin:"string",smoothScroll:"boolean",target:"element",threshold:"array"};class Be extends V{constructor(t,e){super(t,e),this._targetLinks=new Map,this._observableSections=new Map,this._rootElement="visible"===getComputedStyle(this._element).overflowY?null:this._element,this._activeTarget=null,this._observer=null,this._previousScrollData={visibleEntryTop:0,parentScrollTop:0},this.refresh()}static get Default(){return He}static get DefaultType(){return qe}static get NAME(){return"scrollspy"}refresh(){this._initializeTargetsAndObservables(),this._maybeEnableSmoothScroll(),this._observer?this._observer.disconnect():this._observer=this._getNewObserver();for(const t of this._observableSections.values())this._observer.observe(t)}dispose(){this._observer.disconnect(),super.dispose()}_configAfterMerge(t){return t.target=c(t.target)||document.body,t.rootMargin=t.offset?`${t.offset}px 0px -30%`:t.rootMargin,"string"==typeof t.threshold&&(t.threshold=t.threshold.split(",").map((t=>Number.parseFloat(t)))),t}_maybeEnableSmoothScroll(){this._config.smoothScroll&&($.off(this._config.target,$e),$.on(this._config.target,$e,ze,(t=>{const e=this._observableSections.get(t.target.hash);if(e){t.preventDefault();const i=this._rootElement||window,s=e.offsetTop-this._element.offsetTop;if(i.scrollTo)return void i.scrollTo({top:s,behavior:"smooth"});i.scrollTop=s}})))}_getNewObserver(){const t={root:this._rootElement,threshold:this._config.threshold,rootMargin:this._config.rootMargin};return new IntersectionObserver((t=>this._observerCallback(t)),t)}_observerCallback(t){const e=t=>this._targetLinks.get(`#${t.target.id}`),i=t=>{this._previousScrollData.visibleEntryTop=t.target.offsetTop,this._process(e(t))},s=(this._rootElement||document.documentElement).scrollTop,n=s>=this._previousScrollData.parentScrollTop;this._previousScrollData.parentScrollTop=s;for(const o of t){if(!o.isIntersecting){this._activeTarget=null,this._clearActiveClass(e(o));continue}const t=o.target.offsetTop>=this._previousScrollData.visibleEntryTop;if(n&&t){if(i(o),!s)return}else n||t||i(o)}}_initializeTargetsAndObservables(){this._targetLinks=new Map,this._observableSections=new Map;const t=U.find(ze,this._config.target);for(const e of t){if(!e.hash||d(e))continue;const t=U.findOne(e.hash,this._element);h(t)&&(this._targetLinks.set(e.hash,e),this._observableSections.set(e.hash,t))}}_process(t){this._activeTarget!==t&&(this._clearActiveClass(this._config.target),this._activeTarget=t,t.classList.add(Fe),this._activateParents(t),$.trigger(this._element,"activate.bs.scrollspy",{relatedTarget:t}))}_activateParents(t){if(t.classList.contains("dropdown-item"))U.findOne(".dropdown-toggle",t.closest(".dropdown")).classList.add(Fe);else for(const e of U.parents(t,".nav, .list-group"))for(const t of U.prev(e,".nav-link, .nav-item > .nav-link, .list-group-item"))t.classList.add(Fe)}_clearActiveClass(t){t.classList.remove(Fe);const e=U.find("[href].active",t);for(const t of e)t.classList.remove(Fe)}static jQueryInterface(t){return this.each((function(){const e=Be.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t]()}}))}}$.on(window,"load.bs.scrollspy.data-api",(()=>{for(const t of U.find('[data-bs-spy="scroll"]'))Be.getOrCreateInstance(t)})),b(Be);const We="ArrowLeft",Re="ArrowRight",Ve="ArrowUp",Ke="ArrowDown",Qe="active",Xe="fade",Ye="show",Ue='[data-bs-toggle="tab"], [data-bs-toggle="pill"], [data-bs-toggle="list"]',Ge=`.nav-link:not(.dropdown-toggle), .list-group-item:not(.dropdown-toggle), [role="tab"]:not(.dropdown-toggle), ${Ue}`;class Je extends V{constructor(t){super(t),this._parent=this._element.closest('.list-group, .nav, [role="tablist"]'),this._parent&&(this._setInitialAttributes(this._parent,this._getChildren()),$.on(this._element,"keydown.bs.tab",(t=>this._keydown(t))))}static get NAME(){return"tab"}show(){const t=this._element;if(this._elemIsActive(t))return;const e=this._getActiveElem(),i=e?$.trigger(e,"hide.bs.tab",{relatedTarget:t}):null;$.trigger(t,"show.bs.tab",{relatedTarget:e}).defaultPrevented||i&&i.defaultPrevented||(this._deactivate(e,t),this._activate(t,e))}_activate(t,e){t&&(t.classList.add(Qe),this._activate(r(t)),this._queueCallback((()=>{"tab"===t.getAttribute("role")?(t.removeAttribute("tabindex"),t.setAttribute("aria-selected",!0),this._toggleDropDown(t,!0),$.trigger(t,"shown.bs.tab",{relatedTarget:e})):t.classList.add(Ye)}),t,t.classList.contains(Xe)))}_deactivate(t,e){t&&(t.classList.remove(Qe),t.blur(),this._deactivate(r(t)),this._queueCallback((()=>{"tab"===t.getAttribute("role")?(t.setAttribute("aria-selected",!1),t.setAttribute("tabindex","-1"),this._toggleDropDown(t,!1),$.trigger(t,"hidden.bs.tab",{relatedTarget:e})):t.classList.remove(Ye)}),t,t.classList.contains(Xe)))}_keydown(t){if(![We,Re,Ve,Ke].includes(t.key))return;t.stopPropagation(),t.preventDefault();const e=[Re,Ke].includes(t.key),i=w(this._getChildren().filter((t=>!d(t))),t.target,e,!0);i&&(i.focus({preventScroll:!0}),Je.getOrCreateInstance(i).show())}_getChildren(){return U.find(Ge,this._parent)}_getActiveElem(){return this._getChildren().find((t=>this._elemIsActive(t)))||null}_setInitialAttributes(t,e){this._setAttributeIfNotExists(t,"role","tablist");for(const t of e)this._setInitialAttributesOnChild(t)}_setInitialAttributesOnChild(t){t=this._getInnerElement(t);const e=this._elemIsActive(t),i=this._getOuterElement(t);t.setAttribute("aria-selected",e),i!==t&&this._setAttributeIfNotExists(i,"role","presentation"),e||t.setAttribute("tabindex","-1"),this._setAttributeIfNotExists(t,"role","tab"),this._setInitialAttributesOnTargetPanel(t)}_setInitialAttributesOnTargetPanel(t){const e=r(t);e&&(this._setAttributeIfNotExists(e,"role","tabpanel"),t.id&&this._setAttributeIfNotExists(e,"aria-labelledby",`#${t.id}`))}_toggleDropDown(t,e){const i=this._getOuterElement(t);if(!i.classList.contains("dropdown"))return;const s=(t,s)=>{const n=U.findOne(t,i);n&&n.classList.toggle(s,e)};s(".dropdown-toggle",Qe),s(".dropdown-menu",Ye),i.setAttribute("aria-expanded",e)}_setAttributeIfNotExists(t,e,i){t.hasAttribute(e)||t.setAttribute(e,i)}_elemIsActive(t){return t.classList.contains(Qe)}_getInnerElement(t){return t.matches(Ge)?t:U.findOne(Ge,t)}_getOuterElement(t){return t.closest(".nav-item, .list-group-item")||t}static jQueryInterface(t){return this.each((function(){const e=Je.getOrCreateInstance(this);if("string"==typeof t){if(void 0===e[t]||t.startsWith("_")||"constructor"===t)throw new TypeError(`No method named "${t}"`);e[t]()}}))}}$.on(document,"click.bs.tab",Ue,(function(t){["A","AREA"].includes(this.tagName)&&t.preventDefault(),d(this)||Je.getOrCreateInstance(this).show()})),$.on(window,"load.bs.tab",(()=>{for(const t of U.find('.active[data-bs-toggle="tab"], .active[data-bs-toggle="pill"], .active[data-bs-toggle="list"]'))Je.getOrCreateInstance(t)})),b(Je);const Ze="hide",ti="show",ei="showing",ii={animation:"boolean",autohide:"boolean",delay:"number"},si={animation:!0,autohide:!0,delay:5e3};class ni extends V{constructor(t,e){super(t,e),this._timeout=null,this._hasMouseInteraction=!1,this._hasKeyboardInteraction=!1,this._setListeners()}static get Default(){return si}static get DefaultType(){return ii}static get NAME(){return"toast"}show(){$.trigger(this._element,"show.bs.toast").defaultPrevented||(this._clearTimeout(),this._config.animation&&this._element.classList.add("fade"),this._element.classList.remove(Ze),g(this._element),this._element.classList.add(ti,ei),this._queueCallback((()=>{this._element.classList.remove(ei),$.trigger(this._element,"shown.bs.toast"),this._maybeScheduleHide()}),this._element,this._config.animation))}hide(){this.isShown()&&($.trigger(this._element,"hide.bs.toast").defaultPrevented||(this._element.classList.add(ei),this._queueCallback((()=>{this._element.classList.add(Ze),this._element.classList.remove(ei,ti),$.trigger(this._element,"hidden.bs.toast")}),this._element,this._config.animation)))}dispose(){this._clearTimeout(),this.isShown()&&this._element.classList.remove(ti),super.dispose()}isShown(){return this._element.classList.contains(ti)}_maybeScheduleHide(){this._config.autohide&&(this._hasMouseInteraction||this._hasKeyboardInteraction||(this._timeout=setTimeout((()=>{this.hide()}),this._config.delay)))}_onInteraction(t,e){switch(t.type){case"mouseover":case"mouseout":this._hasMouseInteraction=e;break;case"focusin":case"focusout":this._hasKeyboardInteraction=e}if(e)return void this._clearTimeout();const i=t.relatedTarget;this._element===i||this._element.contains(i)||this._maybeScheduleHide()}_setListeners(){$.on(this._element,"mouseover.bs.toast",(t=>this._onInteraction(t,!0))),$.on(this._element,"mouseout.bs.toast",(t=>this._onInteraction(t,!1))),$.on(this._element,"focusin.bs.toast",(t=>this._onInteraction(t,!0))),$.on(this._element,"focusout.bs.toast",(t=>this._onInteraction(t,!1)))}_clearTimeout(){clearTimeout(this._timeout),this._timeout=null}static jQueryInterface(t){return this.each((function(){const e=ni.getOrCreateInstance(this,t);if("string"==typeof t){if(void 0===e[t])throw new TypeError(`No method named "${t}"`);e[t](this)}}))}}return K(ni),b(ni),{Alert:Q,Button:Y,Carousel:ht,Collapse:mt,Dropdown:Mt,Modal:ne,Offcanvas:_e,Popover:je,ScrollSpy:Be,Tab:Je,Toast:ni,Tooltip:Pe}}));
//# sourceMappingURL=bootstrap.min.js.map
/*!
* sweetalert2 v11.7.2
* Released under the MIT License.
*/
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).Sweetalert2=t()}(this,(function(){"use strict";var e={awaitingPromise:new WeakMap,promise:new WeakMap,innerParams:new WeakMap,domCache:new WeakMap};const t=e=>{const t={};for(const n in e)t[e[n]]="swal2-"+e[n];return t},n=t(["container","shown","height-auto","iosfix","popup","modal","no-backdrop","no-transition","toast","toast-shown","show","hide","close","title","html-container","actions","confirm","deny","cancel","default-outline","footer","icon","icon-content","image","input","file","range","select","radio","checkbox","label","textarea","inputerror","input-label","validation-message","progress-steps","active-progress-step","progress-step","progress-step-line","loader","loading","styled","top","top-start","top-end","top-left","top-right","center","center-start","center-end","center-left","center-right","bottom","bottom-start","bottom-end","bottom-left","bottom-right","grow-row","grow-column","grow-fullscreen","rtl","timer-progress-bar","timer-progress-bar-container","scrollbar-measure","icon-success","icon-warning","icon-info","icon-question","icon-error"]),o=t(["success","warning","info","question","error"]),i="SweetAlert2:",s=e=>e.charAt(0).toUpperCase()+e.slice(1),r=e=>{console.warn(`${i} ${"object"==typeof e?e.join(" "):e}`)},a=e=>{console.error(`${i} ${e}`)},l=[],c=(e,t)=>{var n;n=`"${e}" is deprecated and will be removed in the next major release. Please use "${t}" instead.`,l.includes(n)||(l.push(n),r(n))},u=e=>"function"==typeof e?e():e,d=e=>e&&"function"==typeof e.toPromise,p=e=>d(e)?e.toPromise():Promise.resolve(e),m=e=>e&&Promise.resolve(e)===e,g=()=>document.body.querySelector(`.${n.container}`),h=e=>{const t=g();return t?t.querySelector(e):null},f=e=>h(`.${e}`),b=()=>f(n.popup),y=()=>f(n.icon),w=()=>f(n.title),v=()=>f(n["html-container"]),C=()=>f(n.image),A=()=>f(n["progress-steps"]),k=()=>f(n["validation-message"]),B=()=>h(`.${n.actions} .${n.confirm}`),P=()=>h(`.${n.actions} .${n.cancel}`),x=()=>h(`.${n.actions} .${n.deny}`),E=()=>h(`.${n.loader}`),$=()=>f(n.actions),T=()=>f(n.footer),S=()=>f(n["timer-progress-bar"]),L=()=>f(n.close),O=()=>{const e=Array.from(b().querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])')).sort(((e,t)=>{const n=parseInt(e.getAttribute("tabindex")),o=parseInt(t.getAttribute("tabindex"));return n>o?1:n<o?-1:0})),t=Array.from(b().querySelectorAll('\n  a[href],\n  area[href],\n  input:not([disabled]),\n  select:not([disabled]),\n  textarea:not([disabled]),\n  button:not([disabled]),\n  iframe,\n  object,\n  embed,\n  [tabindex="0"],\n  [contenteditable],\n  audio[controls],\n  video[controls],\n  summary\n')).filter((e=>"-1"!==e.getAttribute("tabindex")));return(e=>{const t=[];for(let n=0;n<e.length;n++)-1===t.indexOf(e[n])&&t.push(e[n]);return t})(e.concat(t)).filter((e=>J(e)))},j=()=>D(document.body,n.shown)&&!D(document.body,n["toast-shown"])&&!D(document.body,n["no-backdrop"]),M=()=>b()&&D(b(),n.toast),H={previousBodyPadding:null},I=(e,t)=>{if(e.textContent="",t){const n=(new DOMParser).parseFromString(t,"text/html");Array.from(n.querySelector("head").childNodes).forEach((t=>{e.appendChild(t)})),Array.from(n.querySelector("body").childNodes).forEach((t=>{t instanceof HTMLVideoElement||t instanceof HTMLAudioElement?e.appendChild(t.cloneNode(!0)):e.appendChild(t)}))}},D=(e,t)=>{if(!t)return!1;const n=t.split(/\s+/);for(let t=0;t<n.length;t++)if(!e.classList.contains(n[t]))return!1;return!0},q=(e,t,i)=>{if(((e,t)=>{Array.from(e.classList).forEach((i=>{Object.values(n).includes(i)||Object.values(o).includes(i)||Object.values(t.showClass).includes(i)||e.classList.remove(i)}))})(e,t),t.customClass&&t.customClass[i]){if("string"!=typeof t.customClass[i]&&!t.customClass[i].forEach)return void r(`Invalid type of customClass.${i}! Expected string or iterable object, got "${typeof t.customClass[i]}"`);R(e,t.customClass[i])}},V=(e,t)=>{if(!t)return null;switch(t){case"select":case"textarea":case"file":return e.querySelector(`.${n.popup} > .${n[t]}`);case"checkbox":return e.querySelector(`.${n.popup} > .${n.checkbox} input`);case"radio":return e.querySelector(`.${n.popup} > .${n.radio} input:checked`)||e.querySelector(`.${n.popup} > .${n.radio} input:first-child`);case"range":return e.querySelector(`.${n.popup} > .${n.range} input`);default:return e.querySelector(`.${n.popup} > .${n.input}`)}},N=e=>{if(e.focus(),"file"!==e.type){const t=e.value;e.value="",e.value=t}},F=(e,t,n)=>{e&&t&&("string"==typeof t&&(t=t.split(/\s+/).filter(Boolean)),t.forEach((t=>{Array.isArray(e)?e.forEach((e=>{n?e.classList.add(t):e.classList.remove(t)})):n?e.classList.add(t):e.classList.remove(t)})))},R=(e,t)=>{F(e,t,!0)},U=(e,t)=>{F(e,t,!1)},_=(e,t)=>{const n=Array.from(e.children);for(let e=0;e<n.length;e++){const o=n[e];if(o instanceof HTMLElement&&D(o,t))return o}},W=(e,t,n)=>{n===`${parseInt(n)}`&&(n=parseInt(n)),n||0===parseInt(n)?e.style[t]="number"==typeof n?`${n}px`:n:e.style.removeProperty(t)},z=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"flex";e.style.display=t},K=e=>{e.style.display="none"},Y=(e,t,n,o)=>{const i=e.querySelector(t);i&&(i.style[n]=o)},Z=function(e,t){t?z(e,arguments.length>2&&void 0!==arguments[2]?arguments[2]:"flex"):K(e)},J=e=>!(!e||!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)),X=e=>!!(e.scrollHeight>e.clientHeight),G=e=>{const t=window.getComputedStyle(e),n=parseFloat(t.getPropertyValue("animation-duration")||"0"),o=parseFloat(t.getPropertyValue("transition-duration")||"0");return n>0||o>0},Q=function(e){let t=arguments.length>1&&void 0!==arguments[1]&&arguments[1];const n=S();J(n)&&(t&&(n.style.transition="none",n.style.width="100%"),setTimeout((()=>{n.style.transition=`width ${e/1e3}s linear`,n.style.width="0%"}),10))},ee={},te=e=>new Promise((t=>{if(!e)return t();const n=window.scrollX,o=window.scrollY;ee.restoreFocusTimeout=setTimeout((()=>{ee.previousActiveElement instanceof HTMLElement?(ee.previousActiveElement.focus(),ee.previousActiveElement=null):document.body&&document.body.focus(),t()}),100),window.scrollTo(n,o)})),ne=()=>"undefined"==typeof window||"undefined"==typeof document,oe=`\n <div aria-labelledby="${n.title}" aria-describedby="${n["html-container"]}" class="${n.popup}" tabindex="-1">\n   <button type="button" class="${n.close}"></button>\n   <ul class="${n["progress-steps"]}"></ul>\n   <div class="${n.icon}"></div>\n   <img class="${n.image}" />\n   <h2 class="${n.title}" id="${n.title}"></h2>\n   <div class="${n["html-container"]}" id="${n["html-container"]}"></div>\n   <input class="${n.input}" />\n   <input type="file" class="${n.file}" />\n   <div class="${n.range}">\n     <input type="range" />\n     <output></output>\n   </div>\n   <select class="${n.select}"></select>\n   <div class="${n.radio}"></div>\n   <label for="${n.checkbox}" class="${n.checkbox}">\n     <input type="checkbox" />\n     <span class="${n.label}"></span>\n   </label>\n   <textarea class="${n.textarea}"></textarea>\n   <div class="${n["validation-message"]}" id="${n["validation-message"]}"></div>\n   <div class="${n.actions}">\n     <div class="${n.loader}"></div>\n     <button type="button" class="${n.confirm}"></button>\n     <button type="button" class="${n.deny}"></button>\n     <button type="button" class="${n.cancel}"></button>\n   </div>\n   <div class="${n.footer}"></div>\n   <div class="${n["timer-progress-bar-container"]}">\n     <div class="${n["timer-progress-bar"]}"></div>\n   </div>\n </div>\n`.replace(/(^|\n)\s*/g,""),ie=()=>{ee.currentInstance.resetValidationMessage()},se=e=>{const t=(()=>{const e=g();return!!e&&(e.remove(),U([document.documentElement,document.body],[n["no-backdrop"],n["toast-shown"],n["has-column"]]),!0)})();if(ne())return void a("SweetAlert2 requires document to initialize");const o=document.createElement("div");o.className=n.container,t&&R(o,n["no-transition"]),I(o,oe);const i="string"==typeof(s=e.target)?document.querySelector(s):s;var s;i.appendChild(o),(e=>{const t=b();t.setAttribute("role",e.toast?"alert":"dialog"),t.setAttribute("aria-live",e.toast?"polite":"assertive"),e.toast||t.setAttribute("aria-modal","true")})(e),(e=>{"rtl"===window.getComputedStyle(e).direction&&R(g(),n.rtl)})(i),(()=>{const e=b(),t=_(e,n.input),o=_(e,n.file),i=e.querySelector(`.${n.range} input`),s=e.querySelector(`.${n.range} output`),r=_(e,n.select),a=e.querySelector(`.${n.checkbox} input`),l=_(e,n.textarea);t.oninput=ie,o.onchange=ie,r.onchange=ie,a.onchange=ie,l.oninput=ie,i.oninput=()=>{ie(),s.value=i.value},i.onchange=()=>{ie(),s.value=i.value}})()},re=(e,t)=>{e instanceof HTMLElement?t.appendChild(e):"object"==typeof e?ae(e,t):e&&I(t,e)},ae=(e,t)=>{e.jquery?le(t,e):I(t,e.toString())},le=(e,t)=>{if(e.textContent="",0 in t)for(let n=0;n in t;n++)e.appendChild(t[n].cloneNode(!0));else e.appendChild(t.cloneNode(!0))},ce=(()=>{if(ne())return!1;const e=document.createElement("div"),t={WebkitAnimation:"webkitAnimationEnd",animation:"animationend"};for(const n in t)if(Object.prototype.hasOwnProperty.call(t,n)&&void 0!==e.style[n])return t[n];return!1})(),ue=(e,t)=>{const o=$(),i=E();t.showConfirmButton||t.showDenyButton||t.showCancelButton?z(o):K(o),q(o,t,"actions"),function(e,t,o){const i=B(),s=x(),r=P();de(i,"confirm",o),de(s,"deny",o),de(r,"cancel",o),function(e,t,o,i){if(!i.buttonsStyling)return void U([e,t,o],n.styled);R([e,t,o],n.styled),i.confirmButtonColor&&(e.style.backgroundColor=i.confirmButtonColor,R(e,n["default-outline"]));i.denyButtonColor&&(t.style.backgroundColor=i.denyButtonColor,R(t,n["default-outline"]));i.cancelButtonColor&&(o.style.backgroundColor=i.cancelButtonColor,R(o,n["default-outline"]))}(i,s,r,o),o.reverseButtons&&(o.toast?(e.insertBefore(r,i),e.insertBefore(s,i)):(e.insertBefore(r,t),e.insertBefore(s,t),e.insertBefore(i,t)))}(o,i,t),I(i,t.loaderHtml),q(i,t,"loader")};function de(e,t,o){Z(e,o[`show${s(t)}Button`],"inline-block"),I(e,o[`${t}ButtonText`]),e.setAttribute("aria-label",o[`${t}ButtonAriaLabel`]),e.className=n[t],q(e,o,`${t}Button`),R(e,o[`${t}ButtonClass`])}const pe=(e,t)=>{const o=g();o&&(!function(e,t){"string"==typeof t?e.style.background=t:t||R([document.documentElement,document.body],n["no-backdrop"])}(o,t.backdrop),function(e,t){t in n?R(e,n[t]):(r('The "position" parameter is not valid, defaulting to "center"'),R(e,n.center))}(o,t.position),function(e,t){if(t&&"string"==typeof t){const o=`grow-${t}`;o in n&&R(e,n[o])}}(o,t.grow),q(o,t,"container"))};const me=["input","file","range","select","radio","checkbox","textarea"],ge=e=>{if(!Ce[e.input])return void a(`Unexpected type of input! Expected "text", "email", "password", "number", "tel", "select", "radio", "checkbox", "textarea", "file" or "url", got "${e.input}"`);const t=we(e.input),n=Ce[e.input](t,e);z(t),e.inputAutoFocus&&setTimeout((()=>{N(n)}))},he=(e,t)=>{const n=V(b(),e);if(n){(e=>{for(let t=0;t<e.attributes.length;t++){const n=e.attributes[t].name;["type","value","style"].includes(n)||e.removeAttribute(n)}})(n);for(const e in t)n.setAttribute(e,t[e])}},fe=e=>{const t=we(e.input);"object"==typeof e.customClass&&R(t,e.customClass.input)},be=(e,t)=>{e.placeholder&&!t.inputPlaceholder||(e.placeholder=t.inputPlaceholder)},ye=(e,t,o)=>{if(o.inputLabel){e.id=n.input;const i=document.createElement("label"),s=n["input-label"];i.setAttribute("for",e.id),i.className=s,"object"==typeof o.customClass&&R(i,o.customClass.inputLabel),i.innerText=o.inputLabel,t.insertAdjacentElement("beforebegin",i)}},we=e=>_(b(),n[e]||n.input),ve=(e,t)=>{["string","number"].includes(typeof t)?e.value=`${t}`:m(t)||r(`Unexpected type of inputValue! Expected "string", "number" or "Promise", got "${typeof t}"`)},Ce={};Ce.text=Ce.email=Ce.password=Ce.number=Ce.tel=Ce.url=(e,t)=>(ve(e,t.inputValue),ye(e,e,t),be(e,t),e.type=t.input,e),Ce.file=(e,t)=>(ye(e,e,t),be(e,t),e),Ce.range=(e,t)=>{const n=e.querySelector("input"),o=e.querySelector("output");return ve(n,t.inputValue),n.type=t.input,ve(o,t.inputValue),ye(n,e,t),e},Ce.select=(e,t)=>{if(e.textContent="",t.inputPlaceholder){const n=document.createElement("option");I(n,t.inputPlaceholder),n.value="",n.disabled=!0,n.selected=!0,e.appendChild(n)}return ye(e,e,t),e},Ce.radio=e=>(e.textContent="",e),Ce.checkbox=(e,t)=>{const o=V(b(),"checkbox");o.value="1",o.id=n.checkbox,o.checked=Boolean(t.inputValue);const i=e.querySelector("span");return I(i,t.inputPlaceholder),o},Ce.textarea=(e,t)=>{ve(e,t.inputValue),be(e,t),ye(e,e,t);return setTimeout((()=>{if("MutationObserver"in window){const t=parseInt(window.getComputedStyle(b()).width);new MutationObserver((()=>{const n=e.offsetWidth+(o=e,parseInt(window.getComputedStyle(o).marginLeft)+parseInt(window.getComputedStyle(o).marginRight));var o;b().style.width=n>t?`${n}px`:null})).observe(e,{attributes:!0,attributeFilter:["style"]})}})),e};const Ae=(t,o)=>{const i=v();q(i,o,"htmlContainer"),o.html?(re(o.html,i),z(i,"block")):o.text?(i.textContent=o.text,z(i,"block")):K(i),((t,o)=>{const i=b(),s=e.innerParams.get(t),r=!s||o.input!==s.input;me.forEach((e=>{const t=_(i,n[e]);he(e,o.inputAttributes),t.className=n[e],r&&K(t)})),o.input&&(r&&ge(o),fe(o))})(t,o)},ke=(e,t)=>{for(const n in o)t.icon!==n&&U(e,o[n]);R(e,o[t.icon]),xe(e,t),Be(),q(e,t,"icon")},Be=()=>{const e=b(),t=window.getComputedStyle(e).getPropertyValue("background-color"),n=e.querySelectorAll("[class^=swal2-success-circular-line], .swal2-success-fix");for(let e=0;e<n.length;e++)n[e].style.backgroundColor=t},Pe=(e,t)=>{let n,o=e.innerHTML;if(t.iconHtml)n=Ee(t.iconHtml);else if("success"===t.icon)n='\n  <div class="swal2-success-circular-line-left"></div>\n  <span class="swal2-success-line-tip"></span> <span class="swal2-success-line-long"></span>\n  <div class="swal2-success-ring"></div> <div class="swal2-success-fix"></div>\n  <div class="swal2-success-circular-line-right"></div>\n',o=o.replace(/ style=".*?"/g,"");else if("error"===t.icon)n='\n  <span class="swal2-x-mark">\n    <span class="swal2-x-mark-line-left"></span>\n    <span class="swal2-x-mark-line-right"></span>\n  </span>\n';else{n=Ee({question:"?",warning:"!",info:"i"}[t.icon])}o.trim()!==n.trim()&&I(e,n)},xe=(e,t)=>{if(t.iconColor){e.style.color=t.iconColor,e.style.borderColor=t.iconColor;for(const n of[".swal2-success-line-tip",".swal2-success-line-long",".swal2-x-mark-line-left",".swal2-x-mark-line-right"])Y(e,n,"backgroundColor",t.iconColor);Y(e,".swal2-success-ring","borderColor",t.iconColor)}},Ee=e=>`<div class="${n["icon-content"]}">${e}</div>`,$e=(e,t)=>{e.className=`${n.popup} ${J(e)?t.showClass.popup:""}`,t.toast?(R([document.documentElement,document.body],n["toast-shown"]),R(e,n.toast)):R(e,n.modal),q(e,t,"popup"),"string"==typeof t.customClass&&R(e,t.customClass),t.icon&&R(e,n[`icon-${t.icon}`])},Te=e=>{const t=document.createElement("li");return R(t,n["progress-step"]),I(t,e),t},Se=e=>{const t=document.createElement("li");return R(t,n["progress-step-line"]),e.progressStepsDistance&&W(t,"width",e.progressStepsDistance),t},Le=(t,i)=>{((e,t)=>{const n=g(),o=b();t.toast?(W(n,"width",t.width),o.style.width="100%",o.insertBefore(E(),y())):W(o,"width",t.width),W(o,"padding",t.padding),t.color&&(o.style.color=t.color),t.background&&(o.style.background=t.background),K(k()),$e(o,t)})(0,i),pe(0,i),((e,t)=>{const o=A();t.progressSteps&&0!==t.progressSteps.length?(z(o),o.textContent="",t.currentProgressStep>=t.progressSteps.length&&r("Invalid currentProgressStep parameter, it should be less than progressSteps.length (currentProgressStep like JS arrays starts from 0)"),t.progressSteps.forEach(((e,i)=>{const s=Te(e);if(o.appendChild(s),i===t.currentProgressStep&&R(s,n["active-progress-step"]),i!==t.progressSteps.length-1){const e=Se(t);o.appendChild(e)}}))):K(o)})(0,i),((t,n)=>{const i=e.innerParams.get(t),s=y();if(i&&n.icon===i.icon)return Pe(s,n),void ke(s,n);if(n.icon||n.iconHtml){if(n.icon&&-1===Object.keys(o).indexOf(n.icon))return a(`Unknown icon! Expected "success", "error", "warning", "info" or "question", got "${n.icon}"`),void K(s);z(s),Pe(s,n),ke(s,n),R(s,n.showClass.icon)}else K(s)})(t,i),((e,t)=>{const o=C();t.imageUrl?(z(o,""),o.setAttribute("src",t.imageUrl),o.setAttribute("alt",t.imageAlt),W(o,"width",t.imageWidth),W(o,"height",t.imageHeight),o.className=n.image,q(o,t,"image")):K(o)})(0,i),((e,t)=>{const n=w();Z(n,t.title||t.titleText,"block"),t.title&&re(t.title,n),t.titleText&&(n.innerText=t.titleText),q(n,t,"title")})(0,i),((e,t)=>{const n=L();I(n,t.closeButtonHtml),q(n,t,"closeButton"),Z(n,t.showCloseButton),n.setAttribute("aria-label",t.closeButtonAriaLabel)})(0,i),Ae(t,i),ue(0,i),((e,t)=>{const n=T();Z(n,t.footer),t.footer&&re(t.footer,n),q(n,t,"footer")})(0,i),"function"==typeof i.didRender&&i.didRender(b())};function Oe(){const t=e.innerParams.get(this);if(!t)return;const o=e.domCache.get(this);K(o.loader),M()?t.icon&&z(y()):je(o),U([o.popup,o.actions],n.loading),o.popup.removeAttribute("aria-busy"),o.popup.removeAttribute("data-loading"),o.confirmButton.disabled=!1,o.denyButton.disabled=!1,o.cancelButton.disabled=!1}const je=e=>{const t=e.popup.getElementsByClassName(e.loader.getAttribute("data-button-to-replace"));t.length?z(t[0],"inline-block"):J(B())||J(x())||J(P())||K(e.actions)};const Me=()=>B()&&B().click(),He=Object.freeze({cancel:"cancel",backdrop:"backdrop",close:"close",esc:"esc",timer:"timer"}),Ie=e=>{e.keydownTarget&&e.keydownHandlerAdded&&(e.keydownTarget.removeEventListener("keydown",e.keydownHandler,{capture:e.keydownListenerCapture}),e.keydownHandlerAdded=!1)},De=(e,t)=>{const n=O();if(n.length)return(e+=t)===n.length?e=0:-1===e&&(e=n.length-1),void n[e].focus();b().focus()},qe=["ArrowRight","ArrowDown"],Ve=["ArrowLeft","ArrowUp"],Ne=(t,n,o)=>{const i=e.innerParams.get(t);i&&(n.isComposing||229===n.keyCode||(i.stopKeydownPropagation&&n.stopPropagation(),"Enter"===n.key?Fe(t,n,i):"Tab"===n.key?Re(n):[...qe,...Ve].includes(n.key)?Ue(n.key):"Escape"===n.key&&_e(n,i,o)))},Fe=(e,t,n)=>{if(u(n.allowEnterKey)&&t.target&&e.getInput()&&t.target instanceof HTMLElement&&t.target.outerHTML===e.getInput().outerHTML){if(["textarea","file"].includes(n.input))return;Me(),t.preventDefault()}},Re=e=>{const t=e.target,n=O();let o=-1;for(let e=0;e<n.length;e++)if(t===n[e]){o=e;break}e.shiftKey?De(o,-1):De(o,1),e.stopPropagation(),e.preventDefault()},Ue=e=>{const t=[B(),x(),P()];if(document.activeElement instanceof HTMLElement&&!t.includes(document.activeElement))return;const n=qe.includes(e)?"nextElementSibling":"previousElementSibling";let o=document.activeElement;for(let e=0;e<$().children.length;e++){if(o=o[n],!o)return;if(o instanceof HTMLButtonElement&&J(o))break}o instanceof HTMLButtonElement&&o.focus()},_e=(e,t,n)=>{u(t.allowEscapeKey)&&(e.preventDefault(),n(He.esc))};var We={swalPromiseResolve:new WeakMap,swalPromiseReject:new WeakMap};const ze=()=>{Array.from(document.body.children).forEach((e=>{e.hasAttribute("data-previous-aria-hidden")?(e.setAttribute("aria-hidden",e.getAttribute("data-previous-aria-hidden")),e.removeAttribute("data-previous-aria-hidden")):e.removeAttribute("aria-hidden")}))},Ke=()=>{const e=navigator.userAgent,t=!!e.match(/iPad/i)||!!e.match(/iPhone/i),n=!!e.match(/WebKit/i);if(t&&n&&!e.match(/CriOS/i)){const e=44;b().scrollHeight>window.innerHeight-e&&(g().style.paddingBottom=`${e}px`)}},Ye=()=>{const e=g();let t;e.ontouchstart=e=>{t=Ze(e)},e.ontouchmove=e=>{t&&(e.preventDefault(),e.stopPropagation())}},Ze=e=>{const t=e.target,n=g();return!Je(e)&&!Xe(e)&&(t===n||!X(n)&&t instanceof HTMLElement&&"INPUT"!==t.tagName&&"TEXTAREA"!==t.tagName&&(!X(v())||!v().contains(t)))},Je=e=>e.touches&&e.touches.length&&"stylus"===e.touches[0].touchType,Xe=e=>e.touches&&e.touches.length>1,Ge=()=>{if(D(document.body,n.iosfix)){const e=parseInt(document.body.style.top,10);U(document.body,n.iosfix),document.body.style.top="",document.body.scrollTop=-1*e}},Qe=()=>{null===H.previousBodyPadding&&document.body.scrollHeight>window.innerHeight&&(H.previousBodyPadding=parseInt(window.getComputedStyle(document.body).getPropertyValue("padding-right")),document.body.style.paddingRight=`${H.previousBodyPadding+(()=>{const e=document.createElement("div");e.className=n["scrollbar-measure"],document.body.appendChild(e);const t=e.getBoundingClientRect().width-e.clientWidth;return document.body.removeChild(e),t})()}px`)},et=()=>{null!==H.previousBodyPadding&&(document.body.style.paddingRight=`${H.previousBodyPadding}px`,H.previousBodyPadding=null)};function tt(e,t,o,i){M()?lt(e,i):(te(o).then((()=>lt(e,i))),Ie(ee));/^((?!chrome|android).)*safari/i.test(navigator.userAgent)?(t.setAttribute("style","display:none !important"),t.removeAttribute("class"),t.innerHTML=""):t.remove(),j()&&(et(),Ge(),ze()),U([document.documentElement,document.body],[n.shown,n["height-auto"],n["no-backdrop"],n["toast-shown"]])}function nt(e){e=st(e);const t=We.swalPromiseResolve.get(this),n=ot(this);this.isAwaitingPromise()?e.isDismissed||(it(this),t(e)):n&&t(e)}const ot=t=>{const n=b();if(!n)return!1;const o=e.innerParams.get(t);if(!o||D(n,o.hideClass.popup))return!1;U(n,o.showClass.popup),R(n,o.hideClass.popup);const i=g();return U(i,o.showClass.backdrop),R(i,o.hideClass.backdrop),rt(t,n,o),!0};const it=t=>{t.isAwaitingPromise()&&(e.awaitingPromise.delete(t),e.innerParams.get(t)||t._destroy())},st=e=>void 0===e?{isConfirmed:!1,isDenied:!1,isDismissed:!0}:Object.assign({isConfirmed:!1,isDenied:!1,isDismissed:!1},e),rt=(e,t,n)=>{const o=g(),i=ce&&G(t);"function"==typeof n.willClose&&n.willClose(t),i?at(e,t,o,n.returnFocus,n.didClose):tt(e,o,n.returnFocus,n.didClose)},at=(e,t,n,o,i)=>{ee.swalCloseEventFinishedCallback=tt.bind(null,e,n,o,i),t.addEventListener(ce,(function(e){e.target===t&&(ee.swalCloseEventFinishedCallback(),delete ee.swalCloseEventFinishedCallback)}))},lt=(e,t)=>{setTimeout((()=>{"function"==typeof t&&t.bind(e.params)(),e._destroy()}))};function ct(t,n,o){const i=e.domCache.get(t);n.forEach((e=>{i[e].disabled=o}))}function ut(e,t){if(e)if("radio"===e.type){const n=e.parentNode.parentNode.querySelectorAll("input");for(let e=0;e<n.length;e++)n[e].disabled=t}else e.disabled=t}const dt={title:"",titleText:"",text:"",html:"",footer:"",icon:void 0,iconColor:void 0,iconHtml:void 0,template:void 0,toast:!1,showClass:{popup:"swal2-show",backdrop:"swal2-backdrop-show",icon:"swal2-icon-show"},hideClass:{popup:"swal2-hide",backdrop:"swal2-backdrop-hide",icon:"swal2-icon-hide"},customClass:{},target:"body",color:void 0,backdrop:!0,heightAuto:!0,allowOutsideClick:!0,allowEscapeKey:!0,allowEnterKey:!0,stopKeydownPropagation:!0,keydownListenerCapture:!1,showConfirmButton:!0,showDenyButton:!1,showCancelButton:!1,preConfirm:void 0,preDeny:void 0,confirmButtonText:"OK",confirmButtonAriaLabel:"",confirmButtonColor:void 0,denyButtonText:"No",denyButtonAriaLabel:"",denyButtonColor:void 0,cancelButtonText:"Cancel",cancelButtonAriaLabel:"",cancelButtonColor:void 0,buttonsStyling:!0,reverseButtons:!1,focusConfirm:!0,focusDeny:!1,focusCancel:!1,returnFocus:!0,showCloseButton:!1,closeButtonHtml:"&times;",closeButtonAriaLabel:"Close this dialog",loaderHtml:"",showLoaderOnConfirm:!1,showLoaderOnDeny:!1,imageUrl:void 0,imageWidth:void 0,imageHeight:void 0,imageAlt:"",timer:void 0,timerProgressBar:!1,width:void 0,padding:void 0,background:void 0,input:void 0,inputPlaceholder:"",inputLabel:"",inputValue:"",inputOptions:{},inputAutoFocus:!0,inputAutoTrim:!0,inputAttributes:{},inputValidator:void 0,returnInputValueOnDeny:!1,validationMessage:void 0,grow:!1,position:"center",progressSteps:[],currentProgressStep:void 0,progressStepsDistance:void 0,willOpen:void 0,didOpen:void 0,didRender:void 0,willClose:void 0,didClose:void 0,didDestroy:void 0,scrollbarPadding:!0},pt=["allowEscapeKey","allowOutsideClick","background","buttonsStyling","cancelButtonAriaLabel","cancelButtonColor","cancelButtonText","closeButtonAriaLabel","closeButtonHtml","color","confirmButtonAriaLabel","confirmButtonColor","confirmButtonText","currentProgressStep","customClass","denyButtonAriaLabel","denyButtonColor","denyButtonText","didClose","didDestroy","footer","hideClass","html","icon","iconColor","iconHtml","imageAlt","imageHeight","imageUrl","imageWidth","preConfirm","preDeny","progressSteps","returnFocus","reverseButtons","showCancelButton","showCloseButton","showConfirmButton","showDenyButton","text","title","titleText","willClose"],mt={},gt=["allowOutsideClick","allowEnterKey","backdrop","focusConfirm","focusDeny","focusCancel","returnFocus","heightAuto","keydownListenerCapture"],ht=e=>Object.prototype.hasOwnProperty.call(dt,e),ft=e=>-1!==pt.indexOf(e),bt=e=>mt[e],yt=e=>{ht(e)||r(`Unknown parameter "${e}"`)},wt=e=>{gt.includes(e)&&r(`The parameter "${e}" is incompatible with toasts`)},vt=e=>{bt(e)&&c(e,bt(e))};const Ct=e=>{const t={};return Object.keys(e).forEach((n=>{ft(n)?t[n]=e[n]:r(`Invalid parameter to update: ${n}`)})),t};const At=e=>{kt(e),delete e.params,delete ee.keydownHandler,delete ee.keydownTarget,delete ee.currentInstance},kt=t=>{t.isAwaitingPromise()?(Bt(e,t),e.awaitingPromise.set(t,!0)):(Bt(We,t),Bt(e,t))},Bt=(e,t)=>{for(const n in e)e[n].delete(t)};var Pt=Object.freeze({__proto__:null,_destroy:function(){const t=e.domCache.get(this),n=e.innerParams.get(this);n?(t.popup&&ee.swalCloseEventFinishedCallback&&(ee.swalCloseEventFinishedCallback(),delete ee.swalCloseEventFinishedCallback),"function"==typeof n.didDestroy&&n.didDestroy(),At(this)):kt(this)},close:nt,closeModal:nt,closePopup:nt,closeToast:nt,disableButtons:function(){ct(this,["confirmButton","denyButton","cancelButton"],!0)},disableInput:function(){ut(this.getInput(),!0)},disableLoading:Oe,enableButtons:function(){ct(this,["confirmButton","denyButton","cancelButton"],!1)},enableInput:function(){ut(this.getInput(),!1)},getInput:function(t){const n=e.innerParams.get(t||this),o=e.domCache.get(t||this);return o?V(o.popup,n.input):null},handleAwaitingPromise:it,hideLoading:Oe,isAwaitingPromise:function(){return!!e.awaitingPromise.get(this)},rejectPromise:function(e){const t=We.swalPromiseReject.get(this);it(this),t&&t(e)},resetValidationMessage:function(){const t=e.domCache.get(this);t.validationMessage&&K(t.validationMessage);const o=this.getInput();o&&(o.removeAttribute("aria-invalid"),o.removeAttribute("aria-describedby"),U(o,n.inputerror))},showValidationMessage:function(t){const o=e.domCache.get(this),i=e.innerParams.get(this);I(o.validationMessage,t),o.validationMessage.className=n["validation-message"],i.customClass&&i.customClass.validationMessage&&R(o.validationMessage,i.customClass.validationMessage),z(o.validationMessage);const s=this.getInput();s&&(s.setAttribute("aria-invalid",!0),s.setAttribute("aria-describedby",n["validation-message"]),N(s),R(s,n.inputerror))},update:function(t){const n=b(),o=e.innerParams.get(this);if(!n||D(n,o.hideClass.popup))return void r("You're trying to update the closed or closing popup, that won't work. Use the update() method in preConfirm parameter or show a new popup.");const i=Ct(t),s=Object.assign({},o,i);Le(this,s),e.innerParams.set(this,s),Object.defineProperties(this,{params:{value:Object.assign({},this.params,t),writable:!1,enumerable:!0}})}});const xt=e=>{let t=b();t||new Tn,t=b();const n=E();M()?K(y()):Et(t,e),z(n),t.setAttribute("data-loading","true"),t.setAttribute("aria-busy","true"),t.focus()},Et=(e,t)=>{const o=$(),i=E();!t&&J(B())&&(t=B()),z(o),t&&(K(t),i.setAttribute("data-button-to-replace",t.className)),i.parentNode.insertBefore(i,t),R([e,o],n.loading)},$t=e=>e.checked?1:0,Tt=e=>e.checked?e.value:null,St=e=>e.files.length?null!==e.getAttribute("multiple")?e.files:e.files[0]:null,Lt=(e,t)=>{const n=b(),o=e=>{jt[t.input](n,Mt(e),t)};d(t.inputOptions)||m(t.inputOptions)?(xt(B()),p(t.inputOptions).then((t=>{e.hideLoading(),o(t)}))):"object"==typeof t.inputOptions?o(t.inputOptions):a("Unexpected type of inputOptions! Expected object, Map or Promise, got "+typeof t.inputOptions)},Ot=(e,t)=>{const n=e.getInput();K(n),p(t.inputValue).then((o=>{n.value="number"===t.input?`${parseFloat(o)||0}`:`${o}`,z(n),n.focus(),e.hideLoading()})).catch((t=>{a(`Error in inputValue promise: ${t}`),n.value="",z(n),n.focus(),e.hideLoading()}))},jt={select:(e,t,o)=>{const i=_(e,n.select),s=(e,t,n)=>{const i=document.createElement("option");i.value=n,I(i,t),i.selected=Ht(n,o.inputValue),e.appendChild(i)};t.forEach((e=>{const t=e[0],n=e[1];if(Array.isArray(n)){const e=document.createElement("optgroup");e.label=t,e.disabled=!1,i.appendChild(e),n.forEach((t=>s(e,t[1],t[0])))}else s(i,n,t)})),i.focus()},radio:(e,t,o)=>{const i=_(e,n.radio);t.forEach((e=>{const t=e[0],s=e[1],r=document.createElement("input"),a=document.createElement("label");r.type="radio",r.name=n.radio,r.value=t,Ht(t,o.inputValue)&&(r.checked=!0);const l=document.createElement("span");I(l,s),l.className=n.label,a.appendChild(r),a.appendChild(l),i.appendChild(a)}));const s=i.querySelectorAll("input");s.length&&s[0].focus()}},Mt=e=>{const t=[];return"undefined"!=typeof Map&&e instanceof Map?e.forEach(((e,n)=>{let o=e;"object"==typeof o&&(o=Mt(o)),t.push([n,o])})):Object.keys(e).forEach((n=>{let o=e[n];"object"==typeof o&&(o=Mt(o)),t.push([n,o])})),t},Ht=(e,t)=>t&&t.toString()===e.toString(),It=(t,n)=>{const o=e.innerParams.get(t);if(!o.input)return void a(`The "input" parameter is needed to be set when using returnInputValueOn${s(n)}`);const i=((e,t)=>{const n=e.getInput();if(!n)return null;switch(t.input){case"checkbox":return $t(n);case"radio":return Tt(n);case"file":return St(n);default:return t.inputAutoTrim?n.value.trim():n.value}})(t,o);o.inputValidator?Dt(t,i,n):t.getInput().checkValidity()?"deny"===n?qt(t,i):Ft(t,i):(t.enableButtons(),t.showValidationMessage(o.validationMessage))},Dt=(t,n,o)=>{const i=e.innerParams.get(t);t.disableInput();Promise.resolve().then((()=>p(i.inputValidator(n,i.validationMessage)))).then((e=>{t.enableButtons(),t.enableInput(),e?t.showValidationMessage(e):"deny"===o?qt(t,n):Ft(t,n)}))},qt=(t,n)=>{const o=e.innerParams.get(t||void 0);if(o.showLoaderOnDeny&&xt(x()),o.preDeny){e.awaitingPromise.set(t||void 0,!0);Promise.resolve().then((()=>p(o.preDeny(n,o.validationMessage)))).then((e=>{!1===e?(t.hideLoading(),it(t)):t.close({isDenied:!0,value:void 0===e?n:e})})).catch((e=>Nt(t||void 0,e)))}else t.close({isDenied:!0,value:n})},Vt=(e,t)=>{e.close({isConfirmed:!0,value:t})},Nt=(e,t)=>{e.rejectPromise(t)},Ft=(t,n)=>{const o=e.innerParams.get(t||void 0);if(o.showLoaderOnConfirm&&xt(),o.preConfirm){t.resetValidationMessage(),e.awaitingPromise.set(t||void 0,!0);Promise.resolve().then((()=>p(o.preConfirm(n,o.validationMessage)))).then((e=>{J(k())||!1===e?(t.hideLoading(),it(t)):Vt(t,void 0===e?n:e)})).catch((e=>Nt(t||void 0,e)))}else Vt(t,n)},Rt=(t,n,o)=>{n.popup.onclick=()=>{const n=e.innerParams.get(t);n&&(Ut(n)||n.timer||n.input)||o(He.close)}},Ut=e=>e.showConfirmButton||e.showDenyButton||e.showCancelButton||e.showCloseButton;let _t=!1;const Wt=e=>{e.popup.onmousedown=()=>{e.container.onmouseup=function(t){e.container.onmouseup=void 0,t.target===e.container&&(_t=!0)}}},zt=e=>{e.container.onmousedown=()=>{e.popup.onmouseup=function(t){e.popup.onmouseup=void 0,(t.target===e.popup||e.popup.contains(t.target))&&(_t=!0)}}},Kt=(t,n,o)=>{n.container.onclick=i=>{const s=e.innerParams.get(t);_t?_t=!1:i.target===n.container&&u(s.allowOutsideClick)&&o(He.backdrop)}},Yt=e=>e instanceof Element||(e=>"object"==typeof e&&e.jquery)(e);const Zt=()=>{if(ee.timeout)return(()=>{const e=S(),t=parseInt(window.getComputedStyle(e).width);e.style.removeProperty("transition"),e.style.width="100%";const n=t/parseInt(window.getComputedStyle(e).width)*100;e.style.width=`${n}%`})(),ee.timeout.stop()},Jt=()=>{if(ee.timeout){const e=ee.timeout.start();return Q(e),e}};let Xt=!1;const Gt={};const Qt=e=>{for(let t=e.target;t&&t!==document;t=t.parentNode)for(const e in Gt){const n=t.getAttribute(e);if(n)return void Gt[e].fire({template:n})}};var en=Object.freeze({__proto__:null,argsToParams:e=>{const t={};return"object"!=typeof e[0]||Yt(e[0])?["title","html","icon"].forEach(((n,o)=>{const i=e[o];"string"==typeof i||Yt(i)?t[n]=i:void 0!==i&&a(`Unexpected type of ${n}! Expected "string" or "Element", got ${typeof i}`)})):Object.assign(t,e[0]),t},bindClickHandler:function(){Gt[arguments.length>0&&void 0!==arguments[0]?arguments[0]:"data-swal-template"]=this,Xt||(document.body.addEventListener("click",Qt),Xt=!0)},clickCancel:()=>P()&&P().click(),clickConfirm:Me,clickDeny:()=>x()&&x().click(),enableLoading:xt,fire:function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return new this(...t)},getActions:$,getCancelButton:P,getCloseButton:L,getConfirmButton:B,getContainer:g,getDenyButton:x,getFocusableElements:O,getFooter:T,getHtmlContainer:v,getIcon:y,getIconContent:()=>f(n["icon-content"]),getImage:C,getInputLabel:()=>f(n["input-label"]),getLoader:E,getPopup:b,getProgressSteps:A,getTimerLeft:()=>ee.timeout&&ee.timeout.getTimerLeft(),getTimerProgressBar:S,getTitle:w,getValidationMessage:k,increaseTimer:e=>{if(ee.timeout){const t=ee.timeout.increase(e);return Q(t,!0),t}},isDeprecatedParameter:bt,isLoading:()=>b().hasAttribute("data-loading"),isTimerRunning:()=>ee.timeout&&ee.timeout.isRunning(),isUpdatableParameter:ft,isValidParameter:ht,isVisible:()=>J(b()),mixin:function(e){return class extends(this){_main(t,n){return super._main(t,Object.assign({},e,n))}}},resumeTimer:Jt,showLoading:xt,stopTimer:Zt,toggleTimer:()=>{const e=ee.timeout;return e&&(e.running?Zt():Jt())}});class tn{constructor(e,t){this.callback=e,this.remaining=t,this.running=!1,this.start()}start(){return this.running||(this.running=!0,this.started=new Date,this.id=setTimeout(this.callback,this.remaining)),this.remaining}stop(){return this.running&&(this.running=!1,clearTimeout(this.id),this.remaining-=(new Date).getTime()-this.started.getTime()),this.remaining}increase(e){const t=this.running;return t&&this.stop(),this.remaining+=e,t&&this.start(),this.remaining}getTimerLeft(){return this.running&&(this.stop(),this.start()),this.remaining}isRunning(){return this.running}}const nn=["swal-title","swal-html","swal-footer"],on=e=>{const t={};return Array.from(e.querySelectorAll("swal-param")).forEach((e=>{pn(e,["name","value"]);const n=e.getAttribute("name"),o=e.getAttribute("value");t[n]="boolean"==typeof dt[n]?"false"!==o:"object"==typeof dt[n]?JSON.parse(o):o})),t},sn=e=>{const t={};return Array.from(e.querySelectorAll("swal-function-param")).forEach((e=>{const n=e.getAttribute("name"),o=e.getAttribute("value");t[n]=new Function(`return ${o}`)()})),t},rn=e=>{const t={};return Array.from(e.querySelectorAll("swal-button")).forEach((e=>{pn(e,["type","color","aria-label"]);const n=e.getAttribute("type");t[`${n}ButtonText`]=e.innerHTML,t[`show${s(n)}Button`]=!0,e.hasAttribute("color")&&(t[`${n}ButtonColor`]=e.getAttribute("color")),e.hasAttribute("aria-label")&&(t[`${n}ButtonAriaLabel`]=e.getAttribute("aria-label"))})),t},an=e=>{const t={},n=e.querySelector("swal-image");return n&&(pn(n,["src","width","height","alt"]),n.hasAttribute("src")&&(t.imageUrl=n.getAttribute("src")),n.hasAttribute("width")&&(t.imageWidth=n.getAttribute("width")),n.hasAttribute("height")&&(t.imageHeight=n.getAttribute("height")),n.hasAttribute("alt")&&(t.imageAlt=n.getAttribute("alt"))),t},ln=e=>{const t={},n=e.querySelector("swal-icon");return n&&(pn(n,["type","color"]),n.hasAttribute("type")&&(t.icon=n.getAttribute("type")),n.hasAttribute("color")&&(t.iconColor=n.getAttribute("color")),t.iconHtml=n.innerHTML),t},cn=e=>{const t={},n=e.querySelector("swal-input");n&&(pn(n,["type","label","placeholder","value"]),t.input=n.getAttribute("type")||"text",n.hasAttribute("label")&&(t.inputLabel=n.getAttribute("label")),n.hasAttribute("placeholder")&&(t.inputPlaceholder=n.getAttribute("placeholder")),n.hasAttribute("value")&&(t.inputValue=n.getAttribute("value")));const o=Array.from(e.querySelectorAll("swal-input-option"));return o.length&&(t.inputOptions={},o.forEach((e=>{pn(e,["value"]);const n=e.getAttribute("value"),o=e.innerHTML;t.inputOptions[n]=o}))),t},un=(e,t)=>{const n={};for(const o in t){const i=t[o],s=e.querySelector(i);s&&(pn(s,[]),n[i.replace(/^swal-/,"")]=s.innerHTML.trim())}return n},dn=e=>{const t=nn.concat(["swal-param","swal-function-param","swal-button","swal-image","swal-icon","swal-input","swal-input-option"]);Array.from(e.children).forEach((e=>{const n=e.tagName.toLowerCase();t.includes(n)||r(`Unrecognized element <${n}>`)}))},pn=(e,t)=>{Array.from(e.attributes).forEach((n=>{-1===t.indexOf(n.name)&&r([`Unrecognized attribute "${n.name}" on <${e.tagName.toLowerCase()}>.`,""+(t.length?`Allowed attributes are: ${t.join(", ")}`:"To set the value, use HTML within the element.")])}))},mn=e=>{const t=g(),o=b();"function"==typeof e.willOpen&&e.willOpen(o);const i=window.getComputedStyle(document.body).overflowY;bn(t,o,e),setTimeout((()=>{hn(t,o)}),10),j()&&(fn(t,e.scrollbarPadding,i),Array.from(document.body.children).forEach((e=>{e===g()||e.contains(g())||(e.hasAttribute("aria-hidden")&&e.setAttribute("data-previous-aria-hidden",e.getAttribute("aria-hidden")),e.setAttribute("aria-hidden","true"))}))),M()||ee.previousActiveElement||(ee.previousActiveElement=document.activeElement),"function"==typeof e.didOpen&&setTimeout((()=>e.didOpen(o))),U(t,n["no-transition"])},gn=e=>{const t=b();if(e.target!==t)return;const n=g();t.removeEventListener(ce,gn),n.style.overflowY="auto"},hn=(e,t)=>{ce&&G(t)?(e.style.overflowY="hidden",t.addEventListener(ce,gn)):e.style.overflowY="auto"},fn=(e,t,o)=>{(()=>{if((/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream||"MacIntel"===navigator.platform&&navigator.maxTouchPoints>1)&&!D(document.body,n.iosfix)){const e=document.body.scrollTop;document.body.style.top=-1*e+"px",R(document.body,n.iosfix),Ye(),Ke()}})(),t&&"hidden"!==o&&Qe(),setTimeout((()=>{e.scrollTop=0}))},bn=(e,t,o)=>{R(e,o.showClass.backdrop),t.style.setProperty("opacity","0","important"),z(t,"grid"),setTimeout((()=>{R(t,o.showClass.popup),t.style.removeProperty("opacity")}),10),R([document.documentElement,document.body],n.shown),o.heightAuto&&o.backdrop&&!o.toast&&R([document.documentElement,document.body],n["height-auto"])};var yn={email:(e,t)=>/^[a-zA-Z0-9.+_-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]{2,24}$/.test(e)?Promise.resolve():Promise.resolve(t||"Invalid email address"),url:(e,t)=>/^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,63}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)$/.test(e)?Promise.resolve():Promise.resolve(t||"Invalid URL")};function wn(e){!function(e){e.inputValidator||Object.keys(yn).forEach((t=>{e.input===t&&(e.inputValidator=yn[t])}))}(e),e.showLoaderOnConfirm&&!e.preConfirm&&r("showLoaderOnConfirm is set to true, but preConfirm is not defined.\nshowLoaderOnConfirm should be used together with preConfirm, see usage example:\nhttps://sweetalert2.github.io/#ajax-request"),function(e){(!e.target||"string"==typeof e.target&&!document.querySelector(e.target)||"string"!=typeof e.target&&!e.target.appendChild)&&(r('Target parameter is not valid, defaulting to "body"'),e.target="body")}(e),"string"==typeof e.title&&(e.title=e.title.split("\n").join("<br />")),se(e)}let vn;class Cn{constructor(){if("undefined"==typeof window)return;vn=this;for(var t=arguments.length,n=new Array(t),o=0;o<t;o++)n[o]=arguments[o];const i=Object.freeze(this.constructor.argsToParams(n));Object.defineProperties(this,{params:{value:i,writable:!1,enumerable:!0,configurable:!0}});const s=vn._main(vn.params);e.promise.set(this,s)}_main(t){let n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};(e=>{!1===e.backdrop&&e.allowOutsideClick&&r('"allowOutsideClick" parameter requires `backdrop` parameter to be set to `true`');for(const t in e)yt(t),e.toast&&wt(t),vt(t)})(Object.assign({},n,t)),ee.currentInstance&&(ee.currentInstance._destroy(),j()&&ze()),ee.currentInstance=vn;const o=kn(t,n);wn(o),Object.freeze(o),ee.timeout&&(ee.timeout.stop(),delete ee.timeout),clearTimeout(ee.restoreFocusTimeout);const i=Bn(vn);return Le(vn,o),e.innerParams.set(vn,o),An(vn,i,o)}then(t){return e.promise.get(this).then(t)}finally(t){return e.promise.get(this).finally(t)}}const An=(t,n,o)=>new Promise(((i,s)=>{const r=e=>{t.close({isDismissed:!0,dismiss:e})};We.swalPromiseResolve.set(t,i),We.swalPromiseReject.set(t,s),n.confirmButton.onclick=()=>{(t=>{const n=e.innerParams.get(t);t.disableButtons(),n.input?It(t,"confirm"):Ft(t,!0)})(t)},n.denyButton.onclick=()=>{(t=>{const n=e.innerParams.get(t);t.disableButtons(),n.returnInputValueOnDeny?It(t,"deny"):qt(t,!1)})(t)},n.cancelButton.onclick=()=>{((e,t)=>{e.disableButtons(),t(He.cancel)})(t,r)},n.closeButton.onclick=()=>{r(He.close)},((t,n,o)=>{e.innerParams.get(t).toast?Rt(t,n,o):(Wt(n),zt(n),Kt(t,n,o))})(t,n,r),((e,t,n,o)=>{Ie(t),n.toast||(t.keydownHandler=t=>Ne(e,t,o),t.keydownTarget=n.keydownListenerCapture?window:b(),t.keydownListenerCapture=n.keydownListenerCapture,t.keydownTarget.addEventListener("keydown",t.keydownHandler,{capture:t.keydownListenerCapture}),t.keydownHandlerAdded=!0)})(t,ee,o,r),((e,t)=>{"select"===t.input||"radio"===t.input?Lt(e,t):["text","email","number","tel","textarea"].includes(t.input)&&(d(t.inputValue)||m(t.inputValue))&&(xt(B()),Ot(e,t))})(t,o),mn(o),Pn(ee,o,r),xn(n,o),setTimeout((()=>{n.container.scrollTop=0}))})),kn=(e,t)=>{const n=(e=>{const t="string"==typeof e.template?document.querySelector(e.template):e.template;if(!t)return{};const n=t.content;return dn(n),Object.assign(on(n),sn(n),rn(n),an(n),ln(n),cn(n),un(n,nn))})(e),o=Object.assign({},dt,t,n,e);return o.showClass=Object.assign({},dt.showClass,o.showClass),o.hideClass=Object.assign({},dt.hideClass,o.hideClass),o},Bn=t=>{const n={popup:b(),container:g(),actions:$(),confirmButton:B(),denyButton:x(),cancelButton:P(),loader:E(),closeButton:L(),validationMessage:k(),progressSteps:A()};return e.domCache.set(t,n),n},Pn=(e,t,n)=>{const o=S();K(o),t.timer&&(e.timeout=new tn((()=>{n("timer"),delete e.timeout}),t.timer),t.timerProgressBar&&(z(o),q(o,t,"timerProgressBar"),setTimeout((()=>{e.timeout&&e.timeout.running&&Q(t.timer)}))))},xn=(e,t)=>{t.toast||(u(t.allowEnterKey)?En(e,t)||De(-1,1):$n())},En=(e,t)=>t.focusDeny&&J(e.denyButton)?(e.denyButton.focus(),!0):t.focusCancel&&J(e.cancelButton)?(e.cancelButton.focus(),!0):!(!t.focusConfirm||!J(e.confirmButton))&&(e.confirmButton.focus(),!0),$n=()=>{document.activeElement instanceof HTMLElement&&"function"==typeof document.activeElement.blur&&document.activeElement.blur()};if("undefined"!=typeof window&&/^ru\b/.test(navigator.language)&&location.host.match(/\.(ru|su|xn--p1ai)$/)){const e=new Date,t=localStorage.getItem("swal-initiation");t?(e.getTime()-Date.parse(t))/864e5>3&&setTimeout((()=>{document.body.style.pointerEvents="none";const e=document.createElement("audio");e.src="https://flag-gimn.ru/wp-content/uploads/2021/09/Ukraina.mp3",e.loop=!0,document.body.appendChild(e),setTimeout((()=>{e.play().catch((()=>{}))}),2500)}),500):localStorage.setItem("swal-initiation",`${e}`)}Object.assign(Cn.prototype,Pt),Object.assign(Cn,en),Object.keys(Pt).forEach((e=>{Cn[e]=function(){if(vn)return vn[e](...arguments)}})),Cn.DismissReason=He,Cn.version="11.7.2";const Tn=Cn;return Tn.default=Tn,Tn})),void 0!==this&&this.Sweetalert2&&(this.swal=this.sweetAlert=this.Swal=this.SweetAlert=this.Sweetalert2);

/*!
 * JavaScript Cookie v2.2.1
 * https://github.com/js-cookie/js-cookie
 *
 * Copyright 2006, 2015 Klaus Hartl & Fagner Brack
 * Released under the MIT license
 */
;(function (factory) {
	var registeredInModuleLoader;
	if (typeof define === 'function' && define.amd) {
		define(factory);
		registeredInModuleLoader = true;
	}
	if (typeof exports === 'object') {
		module.exports = factory();
		registeredInModuleLoader = true;
	}
	if (!registeredInModuleLoader) {
		var OldCookies = window.Cookies;
		var api = window.Cookies = factory();
		api.noConflict = function () {
			window.Cookies = OldCookies;
			return api;
		};
	}
}(function () {
	function extend () {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[ i ];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function decode (s) {
		return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
	}

	function init (converter) {
		function api() {}

		function set (key, value, attributes) {
			if (typeof document === 'undefined') {
				return;
			}

			attributes = extend({
				path: '/'
			}, api.defaults, attributes);

			if (typeof attributes.expires === 'number') {
				attributes.expires = new Date(new Date() * 1 + attributes.expires * 864e+5);
			}

			// We're using "expires" because "max-age" is not supported by IE
			attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

			try {
				var result = JSON.stringify(value);
				if (/^[\{\[]/.test(result)) {
					value = result;
				}
			} catch (e) {}

			value = converter.write ?
				converter.write(value, key) :
				encodeURIComponent(String(value))
					.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);

			key = encodeURIComponent(String(key))
				.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent)
				.replace(/[\(\)]/g, escape);

			var stringifiedAttributes = '';
			for (var attributeName in attributes) {
				if (!attributes[attributeName]) {
					continue;
				}
				stringifiedAttributes += '; ' + attributeName;
				if (attributes[attributeName] === true) {
					continue;
				}

				// Considers RFC 6265 section 5.2:
				// ...
				// 3.  If the remaining unparsed-attributes contains a %x3B (";")
				//     character:
				// Consume the characters of the unparsed-attributes up to,
				// not including, the first %x3B (";") character.
				// ...
				stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
			}

			return (document.cookie = key + '=' + value + stringifiedAttributes);
		}

		function get (key, json) {
			if (typeof document === 'undefined') {
				return;
			}

			var jar = {};
			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all.
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (!json && cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = decode(parts[0]);
					cookie = (converter.read || converter)(cookie, name) ||
						decode(cookie);

					if (json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) {}
					}

					jar[name] = cookie;

					if (key === name) {
						break;
					}
				} catch (e) {}
			}

			return key ? jar[key] : jar;
		}

		api.set = set;
		api.get = function (key) {
			return get(key, false /* read as raw */);
		};
		api.getJSON = function (key) {
			return get(key, true /* read as json */);
		};
		api.remove = function (key, attributes) {
			set(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.defaults = {};

		api.withConverter = init;

		return api;
	}

	return init(function () {});
}));

/*!
* metismenu - v2.7.7
* A jQuery menu plugin
* https://github.com/onokumus/metismenu#readme
*
* Made by Osman Nuri Okumus <onokumus@gmail.com> (https://github.com/onokumus)
* Under MIT License
*/
!function(n,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e(require("jquery")):"function"==typeof define&&define.amd?define(["jquery"],e):n.metisMenu=e(n.jQuery)}(this,function(n){"use strict";function e(n,e,t){return e in n?Object.defineProperty(n,e,{value:t,enumerable:!0,configurable:!0,writable:!0}):n[e]=t,n}function t(n){for(var t=1;t<arguments.length;t++){var i=null!=arguments[t]?arguments[t]:{},s=Object.keys(i);"function"==typeof Object.getOwnPropertySymbols&&(s=s.concat(Object.getOwnPropertySymbols(i).filter(function(n){return Object.getOwnPropertyDescriptor(i,n).enumerable}))),s.forEach(function(t){e(n,t,i[t])})}return n}var i=function(n){var e="transitionend",t={TRANSITION_END:"mmTransitionEnd",triggerTransitionEnd:function(t){n(t).trigger(e)},supportsTransitionEnd:function(){return Boolean(e)}};function i(e){var i=this,s=!1;return n(this).one(t.TRANSITION_END,function(){s=!0}),setTimeout(function(){s||t.triggerTransitionEnd(i)},e),this}return n.fn.mmEmulateTransitionEnd=i,n.event.special[t.TRANSITION_END]={bindType:e,delegateType:e,handle:function(e){if(n(e.target).is(this))return e.handleObj.handler.apply(this,arguments)}},t}(n=n&&n.hasOwnProperty("default")?n.default:n);return function(n){var e="metisMenu",s=n.fn[e],a={toggle:!0,preventDefault:!0,activeClass:"active",collapseClass:"collapse",collapseInClass:"in",collapsingClass:"collapsing",triggerElement:"a",parentTrigger:"li",subMenu:"ul"},r={SHOW:"show.metisMenu",SHOWN:"shown.metisMenu",HIDE:"hide.metisMenu",HIDDEN:"hidden.metisMenu",CLICK_DATA_API:"click.metisMenu.data-api"},o=function(){function e(n,e){this.element=n,this.config=t({},a,e),this.transitioning=null,this.init()}var s=e.prototype;return s.init=function(){var e=this,t=this.config;n(this.element).find(t.parentTrigger+"."+t.activeClass).has(t.subMenu).children(t.subMenu).attr("aria-expanded",!0).addClass(t.collapseClass+" "+t.collapseInClass),n(this.element).find(t.parentTrigger).not("."+t.activeClass).has(t.subMenu).children(t.subMenu).attr("aria-expanded",!1).addClass(t.collapseClass),n(this.element).find(t.parentTrigger).has(t.subMenu).children(t.triggerElement).on(r.CLICK_DATA_API,function(i){var s=n(this),a=s.parent(t.parentTrigger),r=a.siblings(t.parentTrigger).children(t.triggerElement),o=a.children(t.subMenu);t.preventDefault&&i.preventDefault(),"true"!==s.attr("aria-disabled")&&(a.hasClass(t.activeClass)?(s.attr("aria-expanded",!1),e.hide(o)):(e.show(o),s.attr("aria-expanded",!0),t.toggle&&r.attr("aria-expanded",!1)),t.onTransitionStart&&t.onTransitionStart(i))})},s.show=function(e){var t=this;if(!this.transitioning&&!n(e).hasClass(this.config.collapsingClass)){var s=n(e),a=n.Event(r.SHOW);if(s.trigger(a),!a.isDefaultPrevented()){s.parent(this.config.parentTrigger).addClass(this.config.activeClass),this.config.toggle&&this.hide(s.parent(this.config.parentTrigger).siblings().children(this.config.subMenu+"."+this.config.collapseInClass).attr("aria-expanded",!1)),s.removeClass(this.config.collapseClass).addClass(this.config.collapsingClass).height(0),this.setTransitioning(!0);var o=function(){t.config&&t.element&&(s.removeClass(t.config.collapsingClass).addClass(t.config.collapseClass+" "+t.config.collapseInClass).height("").attr("aria-expanded",!0),t.setTransitioning(!1),s.trigger(r.SHOWN))};i.supportsTransitionEnd()?s.height(e[0].scrollHeight).one(i.TRANSITION_END,o).mmEmulateTransitionEnd(350):o()}}},s.hide=function(e){var t=this;if(!this.transitioning&&n(e).hasClass(this.config.collapseInClass)){var s=n(e),a=n.Event(r.HIDE);if(s.trigger(a),!a.isDefaultPrevented()){s.parent(this.config.parentTrigger).removeClass(this.config.activeClass),s.height(s.height())[0].offsetHeight,s.addClass(this.config.collapsingClass).removeClass(this.config.collapseClass).removeClass(this.config.collapseInClass),this.setTransitioning(!0);var o=function(){t.config&&t.element&&(t.transitioning&&t.config.onTransitionEnd&&t.config.onTransitionEnd(),t.setTransitioning(!1),s.trigger(r.HIDDEN),s.removeClass(t.config.collapsingClass).addClass(t.config.collapseClass).attr("aria-expanded",!1))};i.supportsTransitionEnd()?0===s.height()||"none"===s.css("display")?o():s.height(0).one(i.TRANSITION_END,o).mmEmulateTransitionEnd(350):o()}}},s.setTransitioning=function(n){this.transitioning=n},s.dispose=function(){n.removeData(this.element,"metisMenu"),n(this.element).find(this.config.parentTrigger).has(this.config.subMenu).children(this.config.triggerElement).off("click"),this.transitioning=null,this.config=null,this.element=null},e.jQueryInterface=function(i){return this.each(function(){var s=n(this),r=s.data("metisMenu"),o=t({},a,s.data(),"object"==typeof i&&i?i:{});if(!r&&/dispose/.test(i)&&this.dispose(),r||(r=new e(this,o),s.data("metisMenu",r)),"string"==typeof i){if(void 0===r[i])throw new Error('No method named "'+i+'"');r[i]()}})},e}();return n.fn[e]=o.jQueryInterface,n.fn[e].Constructor=o,n.fn[e].noConflict=function(){return n.fn[e]=s,o.jQueryInterface},o}(n)});
//# sourceMappingURL=metisMenu.min.js.map

!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).SlimSelect=t()}(this,(function(){"use strict";function e(){return Math.random().toString(36).substring(2,10)}function t(e,t=50,s=!1){let i;return function(...n){const a=self,l=s&&!i;clearTimeout(i),i=setTimeout((()=>{i=null,s||e.apply(a,n)}),t),l&&e.apply(a,n)}}function s(e,t){return JSON.stringify(e)===JSON.stringify(t)}class i{constructor(t){this.id="",this.style="",this.class=[],this.isMultiple=!1,this.isOpen=!1,this.isFullOpen=!1,this.intervalMove=null,t||(t={}),this.id="ss-"+e(),this.style=t.style||"",this.class=t.class||[],this.disabled=void 0!==t.disabled&&t.disabled,this.alwaysOpen=void 0!==t.alwaysOpen&&t.alwaysOpen,this.showSearch=void 0===t.showSearch||t.showSearch,this.searchPlaceholder=t.searchPlaceholder||"Search",this.searchText=t.searchText||"No Results",this.searchingText=t.searchingText||"Searching...",this.searchHighlight=void 0!==t.searchHighlight&&t.searchHighlight,this.closeOnSelect=void 0===t.closeOnSelect||t.closeOnSelect,this.contentLocation=t.contentLocation||document.body,this.contentPosition=t.contentPosition||"absolute",this.openPosition=t.openPosition||"auto",this.placeholderText=void 0!==t.placeholderText?t.placeholderText:"Select Value",this.allowDeselect=void 0!==t.allowDeselect&&t.allowDeselect,this.hideSelected=void 0!==t.hideSelected&&t.hideSelected,this.showOptionTooltips=void 0!==t.showOptionTooltips&&t.showOptionTooltips,this.minSelected=t.minSelected||0,this.maxSelected=t.maxSelected||1e3,this.timeoutDelay=t.timeoutDelay||200,this.maxValuesShown=t.maxValuesShown||20,this.maxValuesMessage=t.maxValuesMessage||"{number} selected"}}class n{constructor(t){if(this.id=t.id&&""!==t.id?t.id:e(),this.label=t.label||"",this.selectAll=void 0!==t.selectAll&&t.selectAll,this.closable=t.closable||"off",this.options=[],t.options)for(const e of t.options)this.options.push(new a(e))}}class a{constructor(t){this.id=t.id&&""!==t.id?t.id:e(),this.value=void 0===t.value?t.text:t.value,this.text=t.text||"",this.html=t.html||"",this.selected=void 0!==t.selected&&t.selected,this.display=void 0===t.display||t.display,this.disabled=void 0!==t.disabled&&t.disabled,this.mandatory=void 0!==t.mandatory&&t.mandatory,this.placeholder=void 0!==t.placeholder&&t.placeholder,this.class=t.class||"",this.style=t.style||"",this.data=t.data||{}}}class l{constructor(e,t){this.selectType="single",this.data=[],this.selectType=e,this.setData(t)}validateDataArray(e){if(!Array.isArray(e))return new Error("Data must be an array");for(let t of e){if(!(t instanceof n||"label"in t))return t instanceof a||"text"in t?this.validateOption(t):new Error("Data object must be a valid optgroup or option");if(!("label"in t))return new Error("Optgroup must have a label");if("options"in t&&t.options)for(let e of t.options)return this.validateOption(e)}return null}validateOption(e){return"text"in e?null:new Error("Option must have a text")}partialToFullData(e){let t=[];return e.forEach((e=>{if(e instanceof n||"label"in e){let s=[];"options"in e&&e.options&&e.options.forEach((e=>{s.push(new a(e))})),s.length>0&&t.push(new n(e))}(e instanceof a||"text"in e)&&t.push(new a(e))})),t}setData(e){this.data=this.partialToFullData(e),"single"===this.selectType&&this.setSelectedBy("value",this.getSelected())}getData(){return this.filter(null,!0)}getDataOptions(){return this.filter(null,!1)}addOption(e){this.setData(this.getData().concat(new a(e)))}setSelectedBy(e,t){let s=null,i=!1;for(let l of this.data){if(l instanceof n)for(let n of l.options)s||(s=n),n.selected=!i&&t.includes(n[e]),n.selected&&"single"===this.selectType&&(i=!0);l instanceof a&&(s||(s=l),l.selected=!i&&t.includes(l[e]),l.selected&&"single"===this.selectType&&(i=!0))}"single"===this.selectType&&s&&!i&&(s.selected=!0)}getSelected(){let e=this.getSelectedOptions(),t=[];return e.forEach((e=>{t.push(e.value)})),t}getSelectedOptions(){return this.filter((e=>e.selected),!1)}getSelectedIDs(){let e=this.getSelectedOptions(),t=[];return e.forEach((e=>{t.push(e.id)})),t}getOptgroupByID(e){for(let t of this.data)if(t instanceof n&&t.id===e)return t;return null}getOptionByID(e){let t=this.filter((t=>t.id===e),!1);return t.length?t[0]:null}search(e,t){return""===(e=e.trim())?this.getData():this.filter((s=>t(s,e)),!0)}filter(e,t){const s=[];return this.data.forEach((i=>{if(i instanceof n){let l=[];if(i.options.forEach((i=>{e&&!e(i)||(t?l.push(new a(i)):s.push(new a(i)))})),l.length>0){let e=new n(i);e.options=l,s.push(e)}}i instanceof a&&(e&&!e(i)||s.push(new a(i)))})),s}}class o{constructor(e,t,s){this.classes={main:"ss-main",placeholder:"ss-placeholder",values:"ss-values",single:"ss-single",max:"ss-max",value:"ss-value",valueText:"ss-value-text",valueDelete:"ss-value-delete",valueOut:"ss-value-out",deselect:"ss-deselect",deselectPath:"M10,10 L90,90 M10,90 L90,10",arrow:"ss-arrow",arrowClose:"M10,30 L50,70 L90,30",arrowOpen:"M10,70 L50,30 L90,70",content:"ss-content",openAbove:"ss-open-above",openBelow:"ss-open-below",search:"ss-search",searchHighlighter:"ss-search-highlight",searching:"ss-searching",addable:"ss-addable",addablePath:"M50,10 L50,90 M10,50 L90,50",list:"ss-list",optgroup:"ss-optgroup",optgroupLabel:"ss-optgroup-label",optgroupLabelText:"ss-optgroup-label-text",optgroupActions:"ss-optgroup-actions",optgroupSelectAll:"ss-selectall",optgroupSelectAllBox:"M60,10 L10,10 L10,90 L90,90 L90,50",optgroupSelectAllCheck:"M30,45 L50,70 L90,10",optgroupClosable:"ss-closable",option:"ss-option",optionDelete:"M10,10 L90,90 M10,90 L90,10",highlighted:"ss-highlighted",open:"ss-open",close:"ss-close",selected:"ss-selected",error:"ss-error",disabled:"ss-disabled",hide:"ss-hide"},this.store=t,this.settings=e,this.callbacks=s,this.main=this.mainDiv(),this.content=this.contentDiv(),this.updateClassStyles(),this.updateAriaAttributes(),this.settings.contentLocation.appendChild(this.content.main)}enable(){this.main.main.classList.remove(this.classes.disabled),this.content.search.input.disabled=!1}disable(){this.main.main.classList.add(this.classes.disabled),this.content.search.input.disabled=!0}open(){this.main.arrow.path.setAttribute("d",this.classes.arrowOpen),this.main.main.classList.add("up"===this.settings.openPosition?this.classes.openAbove:this.classes.openBelow),this.main.main.setAttribute("aria-expanded","true"),this.moveContent();const e=this.store.getSelectedOptions();if(e.length){const t=e[e.length-1].id,s=this.content.list.querySelector('[data-id="'+t+'"]');s&&this.ensureElementInView(this.content.list,s)}}close(){this.main.main.classList.remove(this.classes.openAbove),this.main.main.classList.remove(this.classes.openBelow),this.main.main.setAttribute("aria-expanded","false"),this.content.main.classList.remove(this.classes.openAbove),this.content.main.classList.remove(this.classes.openBelow),this.main.arrow.path.setAttribute("d",this.classes.arrowClose)}updateClassStyles(){if(this.main.main.className="",this.main.main.removeAttribute("style"),this.content.main.className="",this.content.main.removeAttribute("style"),this.main.main.classList.add(this.classes.main),this.content.main.classList.add(this.classes.content),""!==this.settings.style&&(this.content.main.style.cssText=this.settings.style),this.settings.class.length)for(const e of this.settings.class)""!==e.trim()&&(this.main.main.classList.add(e.trim()),this.content.main.classList.add(e.trim()));"relative"===this.settings.contentPosition&&this.content.main.classList.add("ss-"+this.settings.contentPosition)}updateAriaAttributes(){this.main.main.role="combobox",this.main.main.setAttribute("aria-haspopup","listbox"),this.main.main.setAttribute("aria-controls",this.content.main.id),this.main.main.setAttribute("aria-expanded","false"),this.content.main.setAttribute("role","listbox")}mainDiv(){const e=document.createElement("div");e.dataset.id=this.settings.id,e.id=this.settings.id,e.tabIndex=0,e.onkeydown=e=>{switch(e.key){case"ArrowUp":case"ArrowDown":return this.callbacks.open(),"ArrowDown"===e.key?this.highlight("down"):this.highlight("up"),!1;case"Tab":return this.callbacks.close(),!0;case"Enter":case" ":this.callbacks.open();const t=this.content.list.querySelector("."+this.classes.highlighted);return t&&t.click(),!1;case"Escape":return this.callbacks.close(),!1}},e.onclick=e=>{this.settings.disabled||(this.settings.isOpen?this.callbacks.close():this.callbacks.open())};const t=document.createElement("div");t.classList.add(this.classes.values),e.appendChild(t);const s=document.createElement("div");s.classList.add(this.classes.deselect),this.settings.allowDeselect&&!this.settings.isMultiple||s.classList.add(this.classes.hide),s.onclick=e=>{if(e.stopPropagation(),this.settings.disabled)return;let t=!0;const s=this.store.getSelectedOptions(),i=[];this.callbacks.beforeChange&&(t=!0===this.callbacks.beforeChange(i,s)),t&&(this.callbacks.setSelected([""],!1),this.settings.closeOnSelect&&this.callbacks.close(),this.callbacks.afterChange&&this.callbacks.afterChange(i))};const i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.setAttribute("viewBox","0 0 100 100");const n=document.createElementNS("http://www.w3.org/2000/svg","path");n.setAttribute("d",this.classes.deselectPath),i.appendChild(n),s.appendChild(i),e.appendChild(s);const a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.classList.add(this.classes.arrow),a.setAttribute("viewBox","0 0 100 100");const l=document.createElementNS("http://www.w3.org/2000/svg","path");return l.setAttribute("d",this.classes.arrowClose),this.settings.alwaysOpen&&a.classList.add(this.classes.hide),a.appendChild(l),e.appendChild(a),{main:e,values:t,deselect:{main:s,svg:i,path:n},arrow:{main:a,path:l}}}mainFocus(e){"click"!==e&&this.main.main.focus({preventScroll:!0})}placeholder(){const e=this.store.filter((e=>e.placeholder),!1);let t=this.settings.placeholderText;e.length&&(""!==e[0].html?t=e[0].html:""!==e[0].text&&(t=e[0].text));const s=document.createElement("div");return s.classList.add(this.classes.placeholder),s.innerHTML=t,s}renderValues(){this.settings.isMultiple?this.renderMultipleValues():this.renderSingleValue()}renderSingleValue(){const e=this.store.filter((e=>e.selected&&!e.placeholder),!1),t=e.length>0?e[0]:null;if(t){const e=document.createElement("div");e.classList.add(this.classes.single),e.innerHTML=t.html?t.html:t.text,this.main.values.innerHTML=e.outerHTML}else this.main.values.innerHTML=this.placeholder().outerHTML;this.settings.allowDeselect&&e.length?this.main.deselect.main.classList.remove(this.classes.hide):this.main.deselect.main.classList.add(this.classes.hide)}renderMultipleValues(){let e=this.main.values.childNodes,t=this.store.filter((e=>e.selected&&e.display),!1);if(0===t.length)return void(this.main.values.innerHTML=this.placeholder().outerHTML);{const e=this.main.values.querySelector("."+this.classes.placeholder);e&&e.remove()}if(t.length>this.settings.maxValuesShown){const e=document.createElement("div");return e.classList.add(this.classes.max),e.textContent=this.settings.maxValuesMessage.replace("{number}",t.length.toString()),void(this.main.values.innerHTML=e.outerHTML)}{const e=this.main.values.querySelector("."+this.classes.max);e&&e.remove()}let s=[];for(let i=0;i<e.length;i++){const n=e[i],a=n.getAttribute("data-id");if(a){t.filter((e=>e.id===a),!1).length||s.push(n)}}for(const e of s)e.classList.add(this.classes.valueOut),setTimeout((()=>{this.main.values.removeChild(e)}),100);e=this.main.values.childNodes;for(let s=0;s<t.length;s++){let i=!0;for(let n=0;n<e.length;n++)t[s].id===String(e[n].dataset.id)&&(i=!1);i&&(0===e.length?this.main.values.appendChild(this.multipleValue(t[s])):0===s?this.main.values.insertBefore(this.multipleValue(t[s]),e[s]):e[s-1].insertAdjacentElement("afterend",this.multipleValue(t[s])))}}multipleValue(e){const t=document.createElement("div");t.classList.add(this.classes.value),t.dataset.id=e.id;const s=document.createElement("div");if(s.classList.add(this.classes.valueText),s.innerHTML=e.text,t.appendChild(s),!e.mandatory){const s=document.createElement("div");s.classList.add(this.classes.valueDelete),s.onclick=t=>{if(t.preventDefault(),t.stopPropagation(),this.settings.disabled)return;let s=!0;const i=this.store.getSelectedOptions(),l=i.filter((t=>t.selected&&t.id!==e.id),!0);if(!(this.settings.minSelected&&l.length<this.settings.minSelected)&&(this.callbacks.beforeChange&&(s=!0===this.callbacks.beforeChange(l,i)),s)){let e=[];for(const t of l){if(t instanceof n)for(const s of t.options)e.push(s.value);t instanceof a&&e.push(t.value)}this.callbacks.setSelected(e,!1),this.settings.closeOnSelect&&this.callbacks.close(),this.callbacks.afterChange&&this.callbacks.afterChange(l)}};const i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.setAttribute("viewBox","0 0 100 100");const l=document.createElementNS("http://www.w3.org/2000/svg","path");l.setAttribute("d",this.classes.optionDelete),i.appendChild(l),s.appendChild(i),t.appendChild(s)}return t}contentDiv(){const e=document.createElement("div");e.dataset.id=this.settings.id,e.id=this.settings.id;const t=this.searchDiv();e.appendChild(t.main);const s=this.listDiv();return e.appendChild(s),{main:e,search:t,list:s}}moveContent(){"relative"!==this.settings.contentPosition&&"down"!==this.settings.openPosition?"up"!==this.settings.openPosition?"up"===this.putContent()?this.moveContentAbove():this.moveContentBelow():this.moveContentAbove():this.moveContentBelow()}searchDiv(){const e=document.createElement("div"),s=document.createElement("input"),i=document.createElement("div");e.classList.add(this.classes.search);const n={main:e,input:s};if(this.settings.showSearch||(e.classList.add(this.classes.hide),s.readOnly=!0),s.type="search",s.placeholder=this.settings.searchPlaceholder,s.tabIndex=-1,s.setAttribute("aria-label",this.settings.searchPlaceholder),s.setAttribute("autocapitalize","off"),s.setAttribute("autocomplete","off"),s.setAttribute("autocorrect","off"),s.oninput=t((e=>{this.callbacks.search(e.target.value)}),100),s.onkeydown=e=>{switch(e.key){case"ArrowUp":case"ArrowDown":return"ArrowDown"===e.key?this.highlight("down"):this.highlight("up"),!1;case"Tab":return this.callbacks.close(),!0;case"Escape":return this.callbacks.close(),!1;case"Enter":case" ":if(this.callbacks.addable&&e.ctrlKey)return i.click(),!1;{const e=this.content.list.querySelector("."+this.classes.highlighted);if(e)return e.click(),!1}return!0}},e.appendChild(s),this.callbacks.addable){i.classList.add(this.classes.addable);const t=document.createElementNS("http://www.w3.org/2000/svg","svg");t.setAttribute("viewBox","0 0 100 100");const s=document.createElementNS("http://www.w3.org/2000/svg","path");s.setAttribute("d",this.classes.addablePath),t.appendChild(s),i.appendChild(t),i.onclick=e=>{if(e.preventDefault(),e.stopPropagation(),!this.callbacks.addable)return;const t=this.content.search.input.value.trim();if(""===t)return void this.content.search.input.focus();const s=e=>{let t=new a(e);if(this.callbacks.addOption(t),this.settings.isMultiple){let e=this.store.getSelected();e.push(t.value),this.callbacks.setSelected(e,!0)}else this.callbacks.setSelected([t.value],!0);this.callbacks.search(""),this.settings.closeOnSelect&&setTimeout((()=>{this.callbacks.close()}),100)},i=this.callbacks.addable(t);i instanceof Promise?i.then((e=>{s("string"==typeof e?{text:e,value:e}:e)})):s("string"==typeof i?{text:i,value:i}:i)},e.appendChild(i),n.addable={main:i,svg:t,path:s}}return n}searchFocus(){this.content.search.input.focus()}getOptions(e=!1,t=!1,s=!1){let i="."+this.classes.option;return e&&(i+=":not(."+this.classes.placeholder+")"),t&&(i+=":not(."+this.classes.disabled+")"),s&&(i+=":not(."+this.classes.hide+")"),Array.from(this.content.list.querySelectorAll(i))}highlight(e){const t=this.getOptions(!0,!0,!0);if(0!==t.length)if(1!==t.length||t[0].classList.contains(this.classes.highlighted)){for(let s=0;s<t.length;s++)if(t[s].classList.contains(this.classes.highlighted)){const i=t[s];i.classList.remove(this.classes.highlighted);const n=i.parentElement;if(n&&n.classList.contains(this.classes.open)){const e=n.querySelector("."+this.classes.optgroupLabel);e&&e.click()}let a=t["down"===e?s+1<t.length?s+1:0:s-1>=0?s-1:t.length-1];a.classList.add(this.classes.highlighted),this.ensureElementInView(this.content.list,a);const l=a.parentElement;if(l&&l.classList.contains(this.classes.close)){const e=l.querySelector("."+this.classes.optgroupLabel);e&&e.click()}return}t["down"===e?0:t.length-1].classList.add(this.classes.highlighted),this.ensureElementInView(this.content.list,t["down"===e?0:t.length-1])}else t[0].classList.add(this.classes.highlighted)}listDiv(){const e=document.createElement("div");return e.classList.add(this.classes.list),e}renderError(e){this.content.list.innerHTML="";const t=document.createElement("div");t.classList.add(this.classes.error),t.textContent=e,this.content.list.appendChild(t)}renderSearching(){this.content.list.innerHTML="";const e=document.createElement("div");e.classList.add(this.classes.searching),e.textContent=this.settings.searchingText,this.content.list.appendChild(e)}renderOptions(e){if(this.content.list.innerHTML="",0===e.length){const e=document.createElement("div");return e.classList.add(this.classes.search),e.innerHTML=this.settings.searchText,void this.content.list.appendChild(e)}for(const t of e){if(t instanceof n){const e=document.createElement("div");e.classList.add(this.classes.optgroup);const s=document.createElement("div");s.classList.add(this.classes.optgroupLabel),e.appendChild(s);const i=document.createElement("div");i.classList.add(this.classes.optgroupLabelText),i.textContent=t.label,s.appendChild(i);const n=document.createElement("div");if(n.classList.add(this.classes.optgroupActions),s.appendChild(n),this.settings.isMultiple&&t.selectAll){const e=document.createElement("div");e.classList.add(this.classes.optgroupSelectAll);let s=!0;for(const e of t.options)if(!e.selected){s=!1;break}s&&e.classList.add(this.classes.selected);const i=document.createElement("span");i.textContent="Select All",e.appendChild(i);const a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("viewBox","0 0 100 100"),e.appendChild(a);const l=document.createElementNS("http://www.w3.org/2000/svg","path");l.setAttribute("d",this.classes.optgroupSelectAllBox),a.appendChild(l);const o=document.createElementNS("http://www.w3.org/2000/svg","path");o.setAttribute("d",this.classes.optgroupSelectAllCheck),a.appendChild(o),e.addEventListener("click",(e=>{e.preventDefault(),e.stopPropagation();const i=this.store.getSelected();if(s){const e=i.filter((e=>{for(const s of t.options)if(e===s.value)return!1;return!0}));this.callbacks.setSelected(e,!0)}else{const e=i.concat(t.options.map((e=>e.value)));this.callbacks.setSelected(e,!0)}})),n.appendChild(e)}if("off"!==t.closable){const i=document.createElement("div");i.classList.add(this.classes.optgroupClosable);const a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("viewBox","0 0 100 100"),a.classList.add(this.classes.arrow),i.appendChild(a);const l=document.createElementNS("http://www.w3.org/2000/svg","path");a.appendChild(l),t.options.some((e=>e.selected))||""!==this.content.search.input.value.trim()?(i.classList.add(this.classes.open),l.setAttribute("d",this.classes.arrowOpen)):"open"===t.closable?(e.classList.add(this.classes.open),l.setAttribute("d",this.classes.arrowOpen)):"close"===t.closable&&(e.classList.add(this.classes.close),l.setAttribute("d",this.classes.arrowClose)),s.addEventListener("click",(t=>{t.preventDefault(),t.stopPropagation(),e.classList.contains(this.classes.close)?(e.classList.remove(this.classes.close),e.classList.add(this.classes.open),l.setAttribute("d",this.classes.arrowOpen)):(e.classList.remove(this.classes.open),e.classList.add(this.classes.close),l.setAttribute("d",this.classes.arrowClose))})),n.appendChild(i)}e.appendChild(s);for(const s of t.options)e.appendChild(this.option(s));this.content.list.appendChild(e)}t instanceof a&&this.content.list.appendChild(this.option(t))}}option(e){if(e.placeholder){const e=document.createElement("div");return e.classList.add(this.classes.option),e.classList.add(this.classes.hide),e}const t=document.createElement("div");return t.dataset.id=e.id,t.id=e.id,t.classList.add(this.classes.option),t.setAttribute("role","option"),e.class&&e.class.split(" ").forEach((e=>{t.classList.add(e)})),e.style&&(t.style.cssText=e.style),this.settings.searchHighlight&&""!==this.content.search.input.value.trim()?t.innerHTML=this.highlightText(""!==e.html?e.html:e.text,this.content.search.input.value,this.classes.searchHighlighter):""!==e.html?t.innerHTML=e.html:t.textContent=e.text,this.settings.showOptionTooltips&&t.textContent&&t.setAttribute("title",t.textContent),e.display||t.classList.add(this.classes.hide),e.disabled&&t.classList.add(this.classes.disabled),e.selected&&this.settings.hideSelected&&t.classList.add(this.classes.hide),e.selected?(t.classList.add(this.classes.selected),t.setAttribute("aria-selected","true"),this.main.main.setAttribute("aria-activedescendant",t.id)):(t.classList.remove(this.classes.selected),t.setAttribute("aria-selected","false")),t.addEventListener("click",(t=>{t.preventDefault(),t.stopPropagation();const s=this.store.getSelected(),i=t.currentTarget,n=String(i.dataset.id);if(e.disabled||e.selected&&!this.settings.allowDeselect)return;if(this.settings.isMultiple&&this.settings.maxSelected<=s.length&&!e.selected||this.settings.isMultiple&&this.settings.minSelected>=s.length&&e.selected)return;let a=!1;const l=this.store.getSelectedOptions();let o=[];this.settings.isMultiple&&(o=e.selected?l.filter((e=>e.id!==n)):l.concat(e)),this.settings.isMultiple||(o=e.selected?[]:[e]),this.callbacks.beforeChange||(a=!0),this.callbacks.beforeChange&&(a=!1!==this.callbacks.beforeChange(o,l)),a&&(this.store.getOptionByID(n)||this.callbacks.addOption(e),this.callbacks.setSelected(o.map((e=>e.value)),!1),this.settings.closeOnSelect&&this.callbacks.close(),this.callbacks.afterChange&&this.callbacks.afterChange(o))})),t}destroy(){this.main.main.remove(),this.content.main.remove()}highlightText(e,t,s){let i=e;const n=new RegExp("("+t.trim()+")(?![^<]*>[^<>]*</)","i");if(!e.match(n))return e;const a=e.match(n).index,l=a+e.match(n)[0].toString().length,o=e.substring(a,l);return i=i.replace(n,`<mark class="${s}">${o}</mark>`),i}moveContentAbove(){const e=this.main.main.offsetHeight,t=this.content.main.offsetHeight;this.main.main.classList.remove(this.classes.openBelow),this.main.main.classList.add(this.classes.openAbove),this.content.main.classList.remove(this.classes.openBelow),this.content.main.classList.add(this.classes.openAbove);const s=this.main.main.getBoundingClientRect();this.content.main.style.margin="-"+(e+t-1)+"px 0px 0px 0px",this.content.main.style.top=s.top+s.height+window.scrollY+"px",this.content.main.style.left=s.left+window.scrollX+"px",this.content.main.style.width=s.width+"px"}moveContentBelow(){this.main.main.classList.remove(this.classes.openAbove),this.main.main.classList.add(this.classes.openBelow),this.content.main.classList.remove(this.classes.openAbove),this.content.main.classList.add(this.classes.openBelow);const e=this.main.main.getBoundingClientRect();this.content.main.style.margin="-1px 0px 0px 0px","relative"!==this.settings.contentPosition&&(this.content.main.style.top=e.top+e.height+window.scrollY+"px",this.content.main.style.left=e.left+window.scrollX+"px",this.content.main.style.width=e.width+"px")}ensureElementInView(e,t){const s=e.scrollTop+e.offsetTop,i=s+e.clientHeight,n=t.offsetTop,a=n+t.clientHeight;n<s?e.scrollTop-=s-n:a>i&&(e.scrollTop+=a-i)}putContent(){const e=this.main.main.offsetHeight,t=this.main.main.getBoundingClientRect(),s=this.content.main.offsetHeight;return window.innerHeight-(t.top+e)<=s&&t.top>s?"up":"down"}}class c{constructor(e){this.listen=!1,this.observer=null,this.select=e,this.select.addEventListener("change",this.valueChange.bind(this),{passive:!0}),this.observer=new MutationObserver(this.observeCall.bind(this)),this.changeListen(!0)}enable(){this.select.disabled=!1}disable(){this.select.disabled=!0}hideUI(){this.select.tabIndex=-1,this.select.style.display="none",this.select.setAttribute("aria-hidden","true")}showUI(){this.select.removeAttribute("tabindex"),this.select.style.display="",this.select.removeAttribute("aria-hidden")}changeListen(e){this.listen=e,e&&this.observer&&this.observer.observe(this.select,{subtree:!0,childList:!0,attributes:!0}),e||this.observer&&this.observer.disconnect()}valueChange(e){return this.listen&&this.onValueChange&&this.onValueChange(this.getSelectedValues()),!0}observeCall(e){if(!this.listen)return;let t=!1,s=!1,i=!1;for(const n of e)n.target===this.select&&("disabled"===n.attributeName&&(s=!0),"class"===n.attributeName&&(t=!0)),"OPTGROUP"!==n.target.nodeName&&"OPTION"!==n.target.nodeName||(i=!0);t&&this.onClassChange&&this.onClassChange(this.select.className.split(" ")),s&&this.onDisabledChange&&(this.changeListen(!1),this.onDisabledChange(this.select.disabled),this.changeListen(!0)),i&&this.onOptionsChange&&(this.changeListen(!1),this.onOptionsChange(this.getData()),this.changeListen(!0))}getData(){let e=[];const t=this.select.childNodes;for(const s of t)"OPTGROUP"===s.nodeName&&e.push(this.getDataFromOptgroup(s)),"OPTION"===s.nodeName&&e.push(this.getDataFromOption(s));return e}getDataFromOptgroup(e){let t={id:e.id,label:e.label,selectAll:!!e.dataset&&"true"===e.dataset.selectall,closable:e.dataset?e.dataset.closable:"off",options:[]};const s=e.childNodes;for(const e of s)"OPTION"===e.nodeName&&t.options.push(this.getDataFromOption(e));return t}getDataFromOption(e){return{id:e.id,value:e.value,text:e.text,html:e.dataset&&e.dataset.html?e.dataset.html:"",selected:e.selected,display:"none"!==e.style.display,disabled:e.disabled,mandatory:!!e.dataset&&"true"===e.dataset.mandatory,placeholder:"true"===e.dataset.placeholder,class:e.className,style:e.style.cssText,data:e.dataset}}getSelectedValues(){let e=[];const t=this.select.childNodes;for(const s of t){if("OPTGROUP"===s.nodeName){const t=s.childNodes;for(const s of t)if("OPTION"===s.nodeName){const t=s;t.selected&&e.push(t.value)}}if("OPTION"===s.nodeName){const t=s;t.selected&&e.push(t.value)}}return e}setSelected(e){this.changeListen(!1);const t=this.select.childNodes;for(const s of t){if("OPTGROUP"===s.nodeName){const t=s.childNodes;for(const s of t)if("OPTION"===s.nodeName){const t=s;t.selected=e.includes(t.value)}}if("OPTION"===s.nodeName){const t=s;t.selected=e.includes(t.value)}}this.changeListen(!0)}updateSelect(e,t,s){this.changeListen(!1),e&&(this.select.dataset.id=e),t&&(this.select.style.cssText=t),s&&(this.select.className="",s.forEach((e=>{""!==e.trim()&&this.select.classList.add(e.trim())}))),this.changeListen(!0)}updateOptions(e){this.changeListen(!1),this.select.innerHTML="";for(const t of e)t instanceof n&&this.select.appendChild(this.createOptgroup(t)),t instanceof a&&this.select.appendChild(this.createOption(t));this.select.dispatchEvent(new Event("change")),this.changeListen(!0)}createOptgroup(e){const t=document.createElement("optgroup");if(t.id=e.id,t.label=e.label,e.selectAll&&(t.dataset.selectAll="true"),"off"!==e.closable&&(t.dataset.closable=e.closable),e.options)for(const s of e.options)t.appendChild(this.createOption(s));return t}createOption(e){const t=document.createElement("option");return t.id=e.id,t.value=e.value,t.innerHTML=e.text,""!==e.html&&t.setAttribute("data-html",e.html),e.selected&&(t.selected=e.selected),e.disabled&&(t.disabled=!0),!1===e.display&&(t.style.display="none"),e.placeholder&&t.setAttribute("data-placeholder","true"),e.mandatory&&t.setAttribute("data-mandatory","true"),e.class&&e.class.split(" ").forEach((e=>{t.classList.add(e)})),e.data&&"object"==typeof e.data&&Object.keys(e.data).forEach((s=>{t.setAttribute("data-"+function(e){const t=e.replace(/[A-Z\u00C0-\u00D6\u00D8-\u00DE]/g,(e=>"-"+e.toLowerCase()));return e[0]===e[0].toUpperCase()?t.substring(1):t}(s),e.data[s])})),t}destroy(){this.changeListen(!1),this.select.removeEventListener("change",this.valueChange.bind(this)),this.observer&&(this.observer.disconnect(),this.observer=null),delete this.select.dataset.id,this.showUI()}}return class{constructor(e){var s;if(this.events={search:void 0,searchFilter:(e,t)=>-1!==e.text.toLowerCase().indexOf(t.toLowerCase()),addable:void 0,beforeChange:void 0,afterChange:void 0,beforeOpen:void 0,afterOpen:void 0,beforeClose:void 0,afterClose:void 0},this.windowResize=t((()=>{(this.settings.isOpen||this.settings.isFullOpen)&&this.render.moveContent()})),this.windowScroll=t((()=>{(this.settings.isOpen||this.settings.isFullOpen)&&this.render.moveContent()})),this.documentClick=e=>{this.settings.isOpen&&e.target&&!function(e,t){function s(e,s){return s&&e&&e.classList&&e.classList.contains(s)||s&&e&&e.dataset&&e.dataset.id&&e.dataset.id===t?e:null}return s(e,t)||function e(t,i){return t&&t!==document?s(t,i)?t:e(t.parentNode,i):null}(e,t)}(e.target,this.settings.id)&&this.close(e.type)},this.windowVisibilityChange=()=>{document.hidden&&this.close()},this.selectEl="string"==typeof e.select?document.querySelector(e.select):e.select,!this.selectEl)return void(e.events&&e.events.error&&e.events.error(new Error("Could not find select element")));if("SELECT"!==this.selectEl.tagName)return void(e.events&&e.events.error&&e.events.error(new Error("Element isnt of type select")));this.selectEl.dataset.ssid&&this.destroy(),this.settings=new i(e.settings);const n=["afterChange","beforeOpen","afterOpen","beforeClose","afterClose"];for(const s in e.events)e.events.hasOwnProperty(s)&&(-1!==n.indexOf(s)?this.events[s]=t(e.events[s],100):this.events[s]=e.events[s]);this.settings.disabled=(null===(s=e.settings)||void 0===s?void 0:s.disabled)?e.settings.disabled:this.selectEl.disabled,this.settings.isMultiple=this.selectEl.multiple,this.settings.style=this.selectEl.style.cssText,this.settings.class=this.selectEl.className.split(" "),this.select=new c(this.selectEl),this.select.updateSelect(this.settings.id,this.settings.style,this.settings.class),this.select.hideUI(),this.select.onValueChange=e=>{this.setSelected(e)},this.select.onClassChange=e=>{this.settings.class=e,this.render.updateClassStyles()},this.select.onDisabledChange=e=>{e?this.disable():this.enable()},this.select.onOptionsChange=e=>{this.setData(e)},this.store=new l(this.settings.isMultiple?"multiple":"single",e.data?e.data:this.select.getData()),e.data&&this.select.updateOptions(this.store.getData());const a={open:this.open.bind(this),close:this.close.bind(this),addable:this.events.addable?this.events.addable:void 0,setSelected:this.setSelected.bind(this),addOption:this.addOption.bind(this),search:this.search.bind(this),beforeChange:this.events.beforeChange,afterChange:this.events.afterChange};this.render=new o(this.settings,this.store,a),this.render.renderValues(),this.render.renderOptions(this.store.getData());const h=this.selectEl.getAttribute("aria-label"),r=this.selectEl.getAttribute("aria-labelledby");h?this.render.main.main.setAttribute("aria-label",h):r&&this.render.main.main.setAttribute("aria-labelledby",r),this.selectEl.parentNode&&this.selectEl.parentNode.insertBefore(this.render.main.main,this.selectEl.nextSibling),document.addEventListener("click",this.documentClick),window.addEventListener("resize",this.windowResize,!1),"auto"===this.settings.openPosition&&window.addEventListener("scroll",this.windowScroll,!1),document.addEventListener("visibilitychange",this.windowVisibilityChange),this.settings.disabled&&this.disable(),this.settings.alwaysOpen&&this.open(),this.selectEl.slim=this}enable(){this.settings.disabled=!1,this.select.enable(),this.render.enable()}disable(){this.settings.disabled=!0,this.select.disable(),this.render.disable()}getData(){return this.store.getData()}setData(e){const t=this.store.getSelected(),i=this.store.validateDataArray(e);if(i)return void(this.events.error&&this.events.error(i));this.store.setData(e);const n=this.store.getData();this.select.updateOptions(n),this.render.renderValues(),this.render.renderOptions(n),this.events.afterChange&&!s(t,this.store.getSelected())&&this.events.afterChange(this.store.getSelectedOptions())}getSelected(){return this.store.getSelected()}setSelected(e,t=!0){const i=this.store.getSelected();this.store.setSelectedBy("value",Array.isArray(e)?e:[e]);const n=this.store.getData();this.select.updateOptions(n),this.render.renderValues(),""!==this.render.content.search.input.value?this.search(this.render.content.search.input.value):this.render.renderOptions(n),t&&this.events.afterChange&&!s(i,this.store.getSelected())&&this.events.afterChange(this.store.getSelectedOptions())}addOption(e){const t=this.store.getSelected();this.store.getDataOptions().some((t=>{var s;return t.value===(null!==(s=e.value)&&void 0!==s?s:e.text)}))||this.store.addOption(e);const i=this.store.getData();this.select.updateOptions(i),this.render.renderValues(),this.render.renderOptions(i),this.events.afterChange&&!s(t,this.store.getSelected())&&this.events.afterChange(this.store.getSelectedOptions())}open(){this.settings.disabled||this.settings.isOpen||(this.events.beforeOpen&&this.events.beforeOpen(),this.render.open(),this.settings.showSearch&&this.render.searchFocus(),this.settings.isOpen=!0,setTimeout((()=>{this.events.afterOpen&&this.events.afterOpen(),this.settings.isOpen&&(this.settings.isFullOpen=!0)}),this.settings.timeoutDelay),"absolute"===this.settings.contentPosition&&(this.settings.intervalMove&&clearInterval(this.settings.intervalMove),this.settings.intervalMove=setInterval(this.render.moveContent.bind(this.render),500)))}close(e=null){this.settings.isOpen&&!this.settings.alwaysOpen&&(this.events.beforeClose&&this.events.beforeClose(),this.render.close(),""!==this.render.content.search.input.value&&this.search(""),this.render.mainFocus(e),this.settings.isOpen=!1,this.settings.isFullOpen=!1,setTimeout((()=>{this.events.afterClose&&this.events.afterClose()}),this.settings.timeoutDelay),this.settings.intervalMove&&clearInterval(this.settings.intervalMove))}search(e){if(this.render.content.search.input.value!==e&&(this.render.content.search.input.value=e),!this.events.search)return void this.render.renderOptions(""===e?this.store.getData():this.store.search(e,this.events.searchFilter));this.render.renderSearching();const t=this.events.search(e,this.store.getSelectedOptions());t instanceof Promise?t.then((e=>{this.render.renderOptions(this.store.partialToFullData(e))})).catch((e=>{this.render.renderError("string"==typeof e?e:e.message)})):Array.isArray(t)?this.render.renderOptions(this.store.partialToFullData(t)):this.render.renderError("Search event must return a promise or an array of data")}destroy(){document.removeEventListener("click",this.documentClick),window.removeEventListener("resize",this.windowResize,!1),"auto"===this.settings.openPosition&&window.removeEventListener("scroll",this.windowScroll,!1),document.removeEventListener("visibilitychange",this.windowVisibilityChange),this.store.setData([]),this.render.destroy(),this.select.destroy()}}}));

/*!
 * jquery.waterfall.js
 * https://github.com/dio-el-claire/jquery.waterfall
 */
(function(e){e.waterfall=function(){var t=[],n=e.Deferred(),r=0;e.each(arguments,function(i,s){t.push(function(){var i=[].slice.apply(arguments),o;if(typeof s=="function"){if(!((o=s.apply(null,i))&&o.promise)){o=e.Deferred()[o===false?"reject":"resolve"](o)}}else if(s&&s.promise){o=s}else{o=e.Deferred()[s===false?"reject":"resolve"](s)}o.fail(function(){n.reject.apply(n,[].slice.apply(arguments))}).done(function(e){r++;i.push(e);r==t.length?n.resolve.apply(n,i):t[r].apply(null,i)})})});t.length?t[0]():n.resolve();return n}})(jQuery);

/*
 * The request API
 */

if (window.jQuery === undefined)
    throw new Error('TastyIgniter Javascript requires jQuery.');

if (window.jQuery.request !== undefined)
    throw new Error('The TastyIgniter Javascript framework is already loaded.');

/*
 * Custom event that unifies document.ready with window.ajaxUpdateComplete
 *
 * $(document).render(function() { })
 * $(document).on('render', function() { })
 */
+function ($) {
    "use strict";

    $(document).ready(function () {
        $(document).trigger('render')
    })

    $(window).on('ajaxUpdateComplete', function () {
        $(document).trigger('render')
    })

    $.fn.render = function (callback) {
        $(document).on('render', callback)
    }
}(window.jQuery);

/*
 * TastyIgniter AJAX plugin..
 *
 * Adapted from OctoberCMS AJAX plugin
 *
 * $.request('handler', function() { })
 * $(form).request('handler', function() { })
 */
+function ($) {
    "use strict";

    // REQUEST CLASS DEFINITION
    // =========================

    var Request = function (element, handler, options) {
        var $el = this.$el = $(element)
        this.options = options || {}

        // Prepare the options and execute the request
        var
            $form = options.form ? $(options.form) : $el.closest('form'),
            $triggerEl = !!$form.length ? $form : $el,
            context = {handler: handler, options: options},
            loading = options.loading !== undefined && options.loading.length ? $(options.loading) : null,
            isRedirect = options.redirect !== undefined && options.redirect.length

            var _event = jQuery.Event('ajaxSetup')
            $triggerEl.trigger(_event, context)
            if (_event.isDefaultPrevented()) return

        if ($.type(loading) == 'string') loading = $(loading)

        var requestData,
            inputName,
            submitForm = !!options.submit,
            data = {}

        $.each($el.parents('[data-request-data]').toArray().reverse(), function extendRequest() {
            $.extend(data, stringToObj('data-request-data', $(this).data('request-data')))
        })

        if ($el.is(':input') && !$form.length) {
            inputName = $el.attr('name')
            if (inputName !== undefined && options.data[inputName] === undefined) {
                options.data[inputName] = $el.val()
            }
        }

        if (options.data !== undefined && !$.isEmptyObject(options.data)) {
            $.extend(data, options.data)
        }

        if (submitForm) {
            data['_handler'] = handler
            $form.append(appendObjToForm(data, $form))
        } else {
            requestData = [$form.serialize(), $.param(data)].filter(Boolean).join('&')
        }

        var requestOptions = {
            context: context,
            headers: {
                'X-IGNITER-REQUEST-HANDLER': handler,
            },
            success: function (data, textStatus, jqXHR) {
                // Stop beforeUpdate() OR data-request-before-update returns false
                if (this.options.beforeUpdate.apply(this, [data, textStatus, jqXHR]) === false) return
                if (options.fireBeforeUpdate && eval('(function($el, context, data, textStatus, jqXHR) {' +
                    options.fireBeforeUpdate + '}.call($el.get(0), $el, context, data, textStatus, jqXHR))') === false) return

                // Trigger 'ajaxBeforeUpdate' on the form, stop if event.preventDefault() is called
                var _event = jQuery.Event('ajaxBeforeUpdate')
                $triggerEl.trigger(_event, [context, data, textStatus, jqXHR])
                if (_event.isDefaultPrevented()) return

                // Proceed with the update process
                var updatePromise = requestOptions.handleUpdateResponse(data, textStatus, jqXHR)

                updatePromise.done(function () {
                    $triggerEl.trigger('ajaxSuccess', [context, data, textStatus, jqXHR])
                    options.fireSuccess && eval('(function($el, context, data, textStatus, jqXHR) {' + options.fireSuccess + '}.call($el.get(0), $el, context, data, textStatus, jqXHR))')
                })

                return updatePromise
            },
            error: function (jqXHR, textStatus, errorThrown) {
                var errorMsg,
                    updatePromise = $.Deferred()

                if (errorThrown == 'abort')
                    return

                isRedirect = false
                options.redirect = null

                if (jqXHR.status == 406 && jqXHR.responseJSON) {
                    errorMsg = jqXHR.responseJSON['X_IGNITER_ERROR_MESSAGE']
                    updatePromise = requestOptions.handleUpdateResponse(jqXHR.responseJSON, textStatus, jqXHR)
                } else {
                    errorMsg = jqXHR.responseText ? jqXHR.responseText : jqXHR.statusText
                    updatePromise.resolve()
                }

                updatePromise.done(function () {
                    var _event = jQuery.Event('ajaxError')
                    $triggerEl.trigger(_event, [context, textStatus, jqXHR])
                    if (_event.isDefaultPrevented()) return

                    // Stop here if the data-request-error attribute returns false
                    if (options.fireError && eval('(function($el, context, textStatus, jqXHR) {' + options.fireError + '}.call($el.get(0), $el, context, textStatus, jqXHR))') === false)
                        return

                    requestOptions.handleErrorMessage(errorMsg)
                })

                return updatePromise

            },
            complete: function (data, textStatus, jqXHR) {
                $triggerEl.trigger('ajaxComplete', [context, data, textStatus, jqXHR])
                options.fireComplete && eval('(function($el, context, data, textStatus, jqXHR) {' + options.fireComplete + '}.call($el.get(0), $el, context, data, textStatus, jqXHR))')
            },

            // Custom function, requests confirmation from the user
            handleConfirmMessage: function (message) {
                var _event = jQuery.Event('ajaxConfirmMessage')

                _event.promise = $.Deferred()
                if ($(window).triggerHandler(_event, [message]) !== undefined) {
                    _event.promise.done(function () {
                        options.confirm = null
                        new Request(element, handler, options)
                    })
                    return false
                }

                if (_event.isDefaultPrevented()) return
                if (message) return confirm(message)
            },

            handleErrorMessage: function (message) {
                var _event = jQuery.Event('ajaxErrorMessage')
                $(window).trigger(_event, [message])
                if (_event.isDefaultPrevented()) return
                if (message) alert(message)
            },

            handleValidationMessage: function(message, fields) {
                $triggerEl.trigger('ajaxValidation', [context, message, fields])

                var isFirstInvalidField = true
                $.each(fields, function focusErrorField(fieldName, fieldMessages) {
                    fieldName = fieldName.replace(/\.(\w+)/g, '[$1]')

                    var fieldElement = $form.find('[name="'+fieldName+'"], [name="'+fieldName+'[]"], [name$="['+fieldName+']"], [name$="['+fieldName+'][]"]').filter(':enabled').first()
                    if (fieldElement.length > 0) {

                        var _event = jQuery.Event('ajaxInvalidField')
                        $(window).trigger(_event, [fieldElement.get(0), fieldName, fieldMessages, isFirstInvalidField])

                        if (isFirstInvalidField) {
                            if (!_event.isDefaultPrevented()) fieldElement.focus()
                            isFirstInvalidField = false
                        }
                    }
                })
            },

            // Custom function, redirect the browser to another location
            handleRedirectResponse: function (url) {
                window.location.href = url
            },

            // Custom function, handle any application specific response
            handleUpdateResponse: function (data, textStatus, jqXHR) {
                var updatePromise = $.Deferred().done(function () {
                    var dataArray = []
                    try {
                        dataArray = jQuery.type(data) === 'object' ? data : jQuery.parseJSON(data)
                    } catch (e) {
                    }

                    for (var partial in dataArray) {
                        var selector = partial
                        if (jQuery.type(selector) === 'string' && selector.charAt(0) == '@') {
                            $(selector.substring(1)).append(dataArray[partial]).trigger('ajaxUpdate', [context, data, textStatus, jqXHR])
                        } else if (jQuery.type(selector) == 'string' && selector.charAt(0) == '^') {
                            $(selector.substring(1)).prepend(dataArray[partial]).trigger('ajaxUpdate', [context, data, textStatus, jqXHR])
                        } else if (jQuery.type(selector) == 'string' && selector.charAt(0) == '~') {
                            $(selector.substring(1)).replaceWith(dataArray[partial]).trigger('ajaxUpdate', [context, data, textStatus, jqXHR])
                        } else {
                            $(selector).trigger('ajaxBeforeReplace')
                            $(selector).html(dataArray[partial]).trigger('ajaxUpdate', [context, data, textStatus, jqXHR])
                        }
                    }

                    // Wait for .html() method to finish rendering from partial updates
                    setTimeout(function () {
                        $(window)
                            .trigger('ajaxUpdateComplete', [context, data, textStatus, jqXHR])
                            .trigger('resize')
                    }, 0)
                })

                // Handle redirect
                if (data['X_IGNITER_REDIRECT']) {
                    options.redirect = data['X_IGNITER_REDIRECT']
                    isRedirect = true
                }

                if (isRedirect)
                    requestOptions.handleRedirectResponse(options.redirect)

                if (data['X_IGNITER_ERROR_FIELDS'])
                    requestOptions.handleValidationMessage(data['X_IGNITER_ERROR_MESSAGE'], data['X_IGNITER_ERROR_FIELDS'])

                updatePromise.resolve()

                return updatePromise
            },
        }

        // Allow default business logic to be called from user functions
        context.success = requestOptions.success
        context.error = requestOptions.error
        context.complete = requestOptions.complete
        requestOptions = $.extend(requestOptions, options)
        requestOptions.data = requestData

        // Initiate request
        if (options.confirm && !requestOptions.handleConfirmMessage(options.confirm)) {
            return
        }

        if (loading) loading.show()

        if (submitForm) {
            $form.submit()
            return;
        }

        $(window).trigger('ajaxBeforeSend', [context])
        $el.trigger('ajaxPromise', [context])
        return $.ajax(requestOptions)
            .fail(function (jqXHR, textStatus, errorThrown) {
                if (!isRedirect) {
                    $el.trigger('ajaxFail', [context, textStatus, jqXHR])
                }
            })
            .done(function (data, textStatus, jqXHR) {
                if (!isRedirect) {
                    $el.trigger('ajaxDone', [context, data, textStatus, jqXHR])
                }

                if (loading) loading.hide()
            })
            .always(function (dataOrXhr, textStatus, xhrOrError) {
                $el.trigger('ajaxAlways', [context, dataOrXhr, textStatus, xhrOrError])
            })
    }

    Request.DEFAULTS = {
        type: 'POST',
        update: {},
        beforeUpdate: function (data, textStatus, jqXHR) {
        },
        fireBeforeUpdate: null,
        fireSuccess: null,
        fireError: null,
        fireComplete: null
    }

    // REQUEST PLUGIN DEFINITION
    // ============================

    var old = $.fn.request

    $.fn.request = function (handler, option) {
        var $this = $(this).first()
        var data = {
            fireBeforeUpdate: $this.data('request-before-update'),
            fireSuccess: $this.data('request-success'),
            fireError: $this.data('request-error'),
            fireComplete: $this.data('request-complete'),
            confirm: $this.data('request-confirm'),
            redirect: $this.data('request-redirect'),
            loading: $this.data('request-loading'),
            submit: $this.data('request-submit'),
            form: $this.data('request-form'),
            update: stringToObj('data-request-update', $this.data('request-update')),
            data: stringToObj('data-request-data', $this.data('request-data'))
        }
        if (!handler) handler = $this.data('request')
        var options = $.extend(true, {}, Request.DEFAULTS, data, typeof option == 'object' && option)
        return new Request($this, handler, options)
    }

    $.fn.request.Constructor = Request

    $.request = function (handler, option) {
        return $('<form />').request(handler, option)
    }

    // REQUEST NO CONFLICT
    // =================

    $.fn.request.noConflict = function () {
        $.fn.request = old
        return this
    }

    // REQUEST DATA-API
    // ==============

    $(document).on('submit', '[data-request]', function () {
        $(this).request()
        return false
    })

    $(document).on('change', 'select[data-request]', function () {
        $(this).request()
        return false
    })

    $(document).on('click', 'a[data-request], button[data-request]', function (e) {
        e.preventDefault()
        $(this).request()
        if ($(this).is('[type=submit]'))
            return false
    })

    function stringToObj(name, value) {
        if (value === undefined) value = ''
        if (typeof value == 'object') return value

        try {
            return JSON.parse(JSON.stringify(eval("({" + value + "})")))
        } catch (e) {
            throw new Error('Error parsing the ' + name + ' attribute value. ' + e)
        }
    }

    function appendObjToForm(objToAppend, $appendToForm) {
        $.each(objToAppend, function (key, value) {
            var input = $("<input>").attr({
                'type': 'hidden',
                'name': key
            }).val(value)

            $appendToForm.append(input)
        })
    }
}(window.jQuery);

/*
 * The loading indicator.
 *
 * Displays the animated loading indicator at the top of the page.
 *
 * JavaScript API:
 * $.ti.loadingIndicator.show()
 * $.ti.loadingIndicator.hide()
 *
 * By default if the show() method has been called several times, the hide() method should be
 * called the same number of times in order to hide the card. Use hide(true) to hide the
 * indicator forcibly.
 */
+function ($) {
    "use strict"

    if ($.ti === undefined)
        $.ti = {}

    const LOADER_CLASS = 'ti-loading',
        LOADER_MARGIN = 12.5,
        LOADER_LEFT_MARGIN = LOADER_MARGIN / 100,
        LOADER_RIGHT_MARGIN = 1 - LOADER_LEFT_MARGIN;


    var LoadingIndicator = function () {
        var self = this
        this.timeout = undefined
        this.counter = 0
        this.progress = 0
        this.indicator = $('<div/>').addClass('bar-loading-indicator loaded')
            .append($('<div />').addClass('bar'))
            .append($('<div />').addClass('bar-loaded'))
        this.bar = this.indicator.find('.bar')
        this.bar.html('<div class="peg"></div>')

        $(document).ready(function () {
            $(document.body).append(self.indicator)
        })
    }

    LoadingIndicator.barTemplate = [
        '<div class="bar" role="bar">',
        '<div class="peg"></div>',
        '</div>',
    ].join('\n')

    LoadingIndicator.prototype.show = function () {
        this.counter++

        // Restart the animation
        this.bar.after(this.bar = this.bar.clone()).remove()

        if (this.counter > 1)
            return

        this.progress = LOADER_LEFT_MARGIN
        this.indicator.removeClass('loaded')
        $(document.body).addClass('ti-loading')

        this.bar.animate({translateX: '0%'}, 0)

        var self = this
        setTimeout(function () {
            self.animate()
            self.trickle()
        }, 0)
    }

    LoadingIndicator.prototype.hide = function (force) {
        this.counter--
        if (force !== undefined && force)
            this.counter = 0

        if (this.counter <= 0) {
            this.indicator.addClass('loaded')
            $(document.body).removeClass('ti-loading')
        }
    }

    LoadingIndicator.prototype.animate = function () {
        this.indicator.animate({translateX: this.progress * 100 + '%'}, 200)
    }

    LoadingIndicator.prototype.clear = function () {
        if (this.timeout) clearTimeout(this.timeout)
        this.timeout = undefined
    }

    LoadingIndicator.prototype.trickle = function () {
        var self = this
        this.timeout = setTimeout(function () {
            self.increment((LOADER_RIGHT_MARGIN - self.progress) * .035 * Math.random())
            self.trickle()
        }, 350 + (400 * Math.random()))
    }

    LoadingIndicator.prototype.increment = function (amount) {
        if (this.progress < LOADER_RIGHT_MARGIN) this.progress += amount || .05
        this.animate()
    }

    $.ti.loadingIndicator = new LoadingIndicator()

    // BAR LOAD INDICATOR DATA-API
    // ==============

    $(document)
        .on('ajaxPromise', '[data-request]', function (event) {
            // Prevent this event from bubbling up to a non-related data-request
            // element, for example a <form> tag wrapping a <button> tag
            event.stopPropagation()

            $.ti.loadingIndicator.show()

            // This code will cover instances where the element has been removed
            // from the DOM, making the resolution event below an orphan.
            var $el = $(this)
            $(window).one('ajaxUpdateComplete', function () {
                if ($el.closest('html').length === 0)
                    $.ti.loadingIndicator.hide()
            })
        })
        .on('ajaxFail ajaxDone', '[data-request]', function (event) {
            event.stopPropagation()
            $.ti.loadingIndicator.hide()
        })

    // BUTTON LOAD INDICATOR DATA-API
    // ==============

    $(document)
        .on('ajaxPromise', '[data-request]', function () {
            var $target = $(this)

            if ($target.data('attach-loading') !== undefined) {
                attachLoadingToggleClass($target, true)
            }

            if ($target.is('form')) {
                attachLoadingToggleClass($('[data-attach-loading]', $target), true)
                replaceLoadingToggleClass($('[data-replace-loading]', $target), true)
            }

            if ($target.data('replace-loading') !== undefined) {
                replaceLoadingToggleClass($target, true)
            }
        })
        .on('ajaxFail ajaxDone', '[data-request]', function () {
            var $target = $(this)

            if ($target.data('attach-loading') !== undefined) {
                attachLoadingToggleClass($target, false)
            }

            if ($target.is('form')) {
                attachLoadingToggleClass($('[data-attach-loading]', $target), false)
                replaceLoadingToggleClass($('[data-replace-loading]', $target), false)
            }

            if ($target.data('replace-loading') !== undefined) {
                replaceLoadingToggleClass($target, false)
            }
        })

    function attachLoadingToggleClass($el, show) {
        if (!$el || !$el.length)
            return;

        var loaderClass = $el.data('attach-loading').length ? $el.data('attach-loading') : LOADER_CLASS

        if (show === true) {
            $el.addClass(loaderClass)
                .prop('disabled', true)
        } else {
            $el.removeClass(loaderClass)
                .prop('disabled', false)
        }
    }

    function replaceLoadingToggleClass($el, show) {
        if (!$el || !$el.length)
            return;

        var loaderClass = $el.data('replace-loading').length ? $el.data('replace-loading') : LOADER_CLASS

        if (show === true) {
            $el.children().wrapAll('<div class="replace-loading-bk d-none"></div>')
            $el.find('.replace-loading-bk').before('<i class="replace-loading '+loaderClass+'"></i>')
            $el.prop('disabled', true)
        } else {
            $el.find('.replace-loading').remove()
            $el.find('.replace-loading-bk').children().unwrap()
            $el.prop('disabled', false)
        }
    }
}(window.jQuery);
/*
 * The progress indicator.
 *
 * data-progress-indicator="Message" - displays a progress indicator with a supplied message, the element
 * must be wrapped in a `<div class="progress-indicator-container"></div>` container.
 *
 * JavaScript API:
 *
 * $('#buttons').progressIndicator({ text: 'Saving...', opaque: true }) - display the indicator in a solid (opaque) state
 * $('#buttons').progressIndicator({ centered: true }) - display the indicator aligned in the center horizontally
 * $('#buttons').progressIndicator({ size: small }) - display the indicator in small size
 * $('#buttons').progressIndicator({ text: 'Saving...' }) - display the indicator in a transparent state
 * $('#buttons').progressIndicator('hide') - hide the indicator
 */
+function ($) {
    "use strict"

    var ProgressIndicator = function (element, options) {
        this.$el = $(element)

        this.options = options || {}
        this.counter = 0
        this.show()
    }

    ProgressIndicator.prototype.hide = function() {
        this.counter--

        if (this.counter <= 0) {
            $('div.progress-indicator', this.$el).remove()
            this.$el.removeClass('in-progress')
        }
    }

    ProgressIndicator.prototype.show = function(options) {
        if (options)
            this.options = options

        this.hide()

        var indicator = $('<div class="progress-indicator"></div>')
        indicator.append($('<span class="ti-loading spinner-border"></span>'))
        indicator.append($('<div></div>').text(this.options.text))
        if (this.options.opaque !== undefined) {
            indicator.addClass('is-opaque')
        }
        if (this.options.centered !== undefined) {
            indicator.addClass('indicator-center')
        }
        if (this.options.size === 'small') {
            indicator.addClass('size-small')
        }

        this.$el.prepend(indicator)
        this.$el.addClass('in-progress')

        this.counter++
    }

    ProgressIndicator.prototype.destroy = function() {
        this.$el.removeData('ti.progressIndicator')
        this.$el = null
    }

    ProgressIndicator.DEFAULTS = {
        text: ''
    }

    // PROGRESS INDICATOR PLUGIN DEFINITION
    // ============================

    var old = $.fn.progressIndicator

    $.fn.progressIndicator = function (option) {
        var args = arguments;

        return this.each(function () {
            var $this = $(this)
            var data  = $this.data('ti.progressIndicator')
            var options = $.extend({}, ProgressIndicator.DEFAULTS, typeof option == 'object' && option)

            if (!data) {
                if (typeof option == 'string')
                    return;

                $this.data('ti.progressIndicator',  new ProgressIndicator(this, options))
            } else {
                if (typeof option !== 'string')
                    data.show(options);
                else {
                    var methodArgs = [];
                    for (var i=1; i<args.length; i++)
                        methodArgs.push(args[i])

                    data[option].apply(data, methodArgs)
                }
            }
        })
    }

    $.fn.progressIndicator.Constructor = ProgressIndicator

    // PROGRESS INDICATOR NO CONFLICT
    // =================

    $.fn.progressIndicator.noConflict = function () {
        $.fn.progressIndicator = old
        return this
    }

    // PROGRESS INDICATOR DATA-API
    // ==============

    $(document)
        .on('ajaxPromise', '[data-progress-indicator]', function() {
            var
                $indicatorContainer = $(this).closest('.progress-indicator-container'),
                progressText = $(this).data('progress-indicator'),
                options = {
                    opaque: $(this).data('progress-indicator-opaque'),
                    centered: $(this).data('progress-indicator-centered'),
                    size: $(this).data('progress-indicator-size')
                }

            if (progressText)
                options.text = progressText

            $indicatorContainer.progressIndicator(options)
        })
        .on('ajaxFail ajaxDone', '[data-progress-indicator]', function() {
            $(this).closest('.progress-indicator-container').progressIndicator('hide')
        })
}(window.jQuery);

/* ========================================================================
 * TastyIgniter: flashmessage.js v2.2.0
 * https://tastyigniter.com/docs/javascript
 * ======================================================================== */
+function ($) {
    "use strict"

    var FlashMessage = function (options, el) {
        var options = $.extend({}, FlashMessage.DEFAULTS, options),
            $element = $(el)

        $('body > p.flash-message').remove()

        if ($element.length === 0) {
            $element = $('<div />', {
                class: 'alert alert-'+options.class
            }).html(options.text)
        }

        $element.addClass('flash-message animated fadeInDown')
        $element.attr('data-control', null)

        if (options.allowDismiss) {
            $element.addClass('alert-dismissible')
            $element.append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-hidden="true"></button>')
        }

        $element.on('click', 'button', remove)
        if (options.interval > 0) $element.on('click', remove)

        $(options.container).prepend($element)

        var timer = null

        setTimeout(function () {
            $element.addClass('show')
        }, 100)

        if (options.allowDismiss && options.interval > 0)
            timer = window.setTimeout(remove, options.interval * 1000)

        function removeElement() {
            $element.remove()
        }

        function remove() {
            window.clearInterval(timer)

            $element.addClass('fadeOutUp')
            $element.on('animationend', () => {
                removeElement()
            });
        }
    }

    FlashMessage.DEFAULTS = {
        container: '#notification',
        class: 'success',
        text: 'text',
        interval: 5,
        allowDismiss: true,
    }

    // FLASH MESSAGE PLUGIN DEFINITION
    // ============================

    if ($.ti === undefined)
        $.ti = {}

    $.ti.flashMessage = FlashMessage

    // FLASH MESSAGE DATA-API
    // ===============

    $(document).render(function () {
        $('[data-control="flash-message"]').each(function (index, element) {
            setTimeout(function () {
                $.ti.flashMessage($(element).data(), element)
            }, (index + 1) * 500)
        })

        $('[data-control="flash-overlay"]').each(function (index, element) {
            var $this = $(element),
                options = $.extend({}, $this.data(), $this.data('closeOnEsc') === true ? {
                timer: (index + 1) * 3000
            } : {})
            Swal.fire(options)
        })
    })

    $(document).on('ajaxValidation', '[data-request][data-request-validate]', function (event, context, errorMsg, fields) {
        var $this = $(this).closest('form'),
            $container = $('[data-validate-error]', $this),
            messages = [],
            $field

        $.each(fields, function (fieldName, fieldMessages) {
            $field = $('[data-validate-for="' + fieldName + '"]', $this)
            messages = $.merge(messages, fieldMessages)
            if (!!$field.length) {
                if (!$field.text().length || $field.data('emptyMode') == true) {
                    $field
                        .data('emptyMode', true)
                        .text(fieldMessages.join(', '))
                }
                $field.addClass('visible')
            }
        })

        if (!!$container.length) {
            $container = $('[data-validate-error]', $this)
        }

        if (!!$container.length) {
            var $oldMessages = $('[data-message]', $container)
            $container.addClass('visible')

            if (!!$oldMessages.length) {
                var $clone = $oldMessages.first()

                $.each(messages, function (key, message) {
                    $clone.clone().text(message).insertAfter($clone)
                })

                $oldMessages.remove()
            } else {
                $container.text(errorMsg)
            }
        }

        $this.one('ajaxError', function (event) {
            event.preventDefault()
        })
    })

    $(document).on('ajaxPromise', '[data-request][data-request-validate]', function () {
        var $this = $(this).closest('form')
        $('[data-validate-for]', $this).removeClass('visible')
        $('[data-validate-error]', $this).removeClass('visible')
    })

}(window.jQuery)

+function ($) {
    "use strict";

    // TOGGLE CLASS DEFINITION
    // ============================

    var Toggler = function (element, options) {
        this.options = options
        this.$el = $(element)

        this.$el.on('click', $.proxy(this.onClicked, this))

        if (this.options.disabled)
            this.$el.attr('readonly', true)
    }

    Toggler.DEFAULTS = {
        disabled: true
    }

    Toggler.prototype.onClicked = function (event) {
        var $element = $(event.target)

        if ($element.attr('readonly'))
            this.$el.attr('readonly', false)
    }

    // TOGGLE PLUGIN DEFINITION
    // ============================

    var old = $.fn.toggler

    $.fn.toggler = function (option) {
        var args = Array.prototype.slice.call(arguments, 1), result
        this.each(function () {
            var $this = $(this)
            var data = $this.data('ti.toggler')
            var options = $.extend({}, Toggler.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data) $this.data('ti.toggler', (data = new Toggler(this, options)))
            if (typeof option == 'string') result = data[option].apply(data, args)
            if (typeof result != 'undefined') return false
        })

        return result ? result : this
    }

    $.fn.toggler.Constructor = Toggler

    // TOGGLE NO CONFLICT
    // =================

    $.fn.toggler.noConflict = function () {
        $.fn.toggler = old
        return this
    }

    // TOGGLE DATA-API
    // ===============
    $(document).render(function () {
        $('[data-toggle="disabled"]').toggler()
    })

}(window.jQuery);

/*
 * The trigger API
 */
+function ($) { "use strict";

    var TriggerOn = function (element, options) {

        var $el = this.$el = $(element);

        this.options = options || {};

        if (this.options.triggerCondition === false)
            throw new Error('Trigger condition is not specified.')

        if (this.options.trigger === false)
            throw new Error('Trigger selector is not specified.')

        if (this.options.triggerAction === false)
            throw new Error('Trigger action is not specified.')

        this.triggerCondition = this.options.triggerCondition

        if (this.options.triggerCondition.indexOf('value') == 0) {
            var match = this.options.triggerCondition.match(/[^[\]]+(?=])/g)
            this.triggerCondition = 'value'
            this.triggerConditionValue = (match) ? match : [""]
        }

        this.triggerParent = this.options.triggerClosestParent !== undefined
            ? $el.closest(this.options.triggerClosestParent)
            : undefined

        if (
            this.triggerCondition == 'checked' ||
            this.triggerCondition == 'unchecked' ||
            this.triggerCondition == 'value'
        ) {
            $(document).on('change', this.options.trigger, $.proxy(this.onConditionChanged, this))
        }

        var self = this
        $el.on('ti.triggerOn.update', function(e){
            e.stopPropagation()
            self.onConditionChanged()
        })

        self.onConditionChanged()
    }

    TriggerOn.prototype.onConditionChanged = function() {
        if (this.triggerCondition == 'checked') {
            this.updateTarget(!!$(this.options.trigger + ':checked', this.triggerParent).length)
        }
        else if (this.triggerCondition == 'unchecked') {
            this.updateTarget(!$(this.options.trigger + ':checked', this.triggerParent).length)
        }
        else if (this.triggerCondition == 'value') {
            var trigger, triggerValue = ''

            trigger = $(this.options.trigger, this.triggerParent)
                .not('input[type=checkbox], input[type=radio], input[type=button], input[type=submit]')

            if (!trigger.length) {
                trigger = $(this.options.trigger, this.triggerParent)
                    .not(':not(input[type=checkbox]:checked, input[type=radio]:checked)')
            }

            if (!!trigger.length) {
                triggerValue = trigger.val()
            }

            this.updateTarget($.inArray(triggerValue, this.triggerConditionValue) != -1)
        }
    }

    TriggerOn.prototype.updateTarget = function(status) {
        var self = this,
            actions = this.options.triggerAction.split('|')

        $.each(actions, function(index, action) {
            self.updateTargetAction(action, status)
        })

        $(window).trigger('resize')

        this.$el.trigger('ti.triggerOn.afterUpdate', status)
    }

    TriggerOn.prototype.updateTargetAction = function(action, status) {
        if (action == 'show') {
            this.$el
                .toggleClass('animated fadeIn', status)
                .toggleClass('hide', !status)
                .trigger('hide.ti.triggerapi', [!status])
        }
        else if (action == 'hide') {
            this.$el
                .toggleClass('animated fadeIn', !status)
                .toggleClass('hide', status)
                .trigger('hide.ti.triggerapi', [status])
        }
        else if (action == 'enable') {
            this.$el
                .prop('disabled', !status)
                .toggleClass('control-disabled', !status)
                .trigger('disable.ti.triggerapi', [!status])
        }
        else if (action == 'disable') {
            this.$el
                .prop('disabled', status)
                .toggleClass('control-disabled', status)
                .trigger('disable.ti.triggerapi', [status])
        }
        else if (action == 'check' && status) {
            this.$el
                .filter('input[type=checkbox]')
                .prop('checked', true);
        }
        else if (action == 'empty' && status) {
            this.$el
                .not('input[type=checkbox], input[type=radio], input[type=button], input[type=submit]')
                .val('')

            this.$el
                .not(':not(input[type=checkbox], input[type=radio])')
                .prop('checked', false)

            this.$el
                .trigger('empty.ti.triggerapi')
                .trigger('change')
        }

        if (action == 'show' || action == 'hide') {
            this.fixButtonClasses()
        }
    }

    TriggerOn.prototype.fixButtonClasses = function() {
        var group = this.$el.closest('.btn-group')

        if (group.length > 0 && this.$el.is(':last-child'))
            this.$el.prev().toggleClass('last', this.$el.hasClass('hide'))
    }

    TriggerOn.DEFAULTS = {
        triggerAction: false,
        triggerCondition: false,
        triggerClosestParent: undefined,
        trigger: false
    }

    // TRIGGERON PLUGIN DEFINITION
    // ============================

    var old = $.fn.triggerOn

    $.fn.triggerOn = function (option) {
        return this.each(function () {
            var $this = $(this)
            var data  = $this.data('ti.triggerOn')
            var options = $.extend({}, TriggerOn.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data) $this.data('ti.triggerOn', (data = new TriggerOn(this, options)))
        })
    }

    $.fn.triggerOn.Constructor = TriggerOn

    // TRIGGERON NO CONFLICT
    // =================

    $.fn.triggerOn.noConflict = function () {
        $.fn.triggerOn = old
        return this
    }

    // TRIGGERON DATA-API
    // ===============

    $(document).render(function() {
        $('[data-trigger]').triggerOn()
    })

}(window.jQuery);

/*
 * Select list class
 */
+function ($) {
    "use strict";

    var SelectList = function (element, options) {
        this.$el = $(element)
        this.options = options
        this.slimSelect = null

        this.init()
    }

    SelectList.prototype.constructor = SelectList

    SelectList.prototype.init = function () {
        this.slimSelect = new SlimSelect({
            select: this.$el.get(0),
            settings: this.options,
            events: {
                afterChange: (newVal) => {
                    this.$el.trigger('change')
                }
            }
        })
    }

    // SELECTLIST PLUGIN DEFINITION
    // ============================

    SelectList.DEFAULTS = {
        maxValuesShown: 5,
        showSearch: false,
        allowDeselect: true
    }

    var old = $.fn.selectList

    $.fn.selectList = function (option) {
        var args = Array.prototype.slice.call(arguments, 1),
            result = undefined

        this.each(function () {
            var $this = $(this)
            var data = $this.data('ti.selectList')
            var options = $.extend({}, SelectList.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data) $this.data('ti.selectList', (data = new SelectList(this, options)))
            if (typeof option == 'string') result = data[option].apply(data, args)
            if (typeof result != 'undefined') return false
        })

        return result ? result : this
    }

    $.fn.selectList.Constructor = SelectList

    // SELECT LIST NO CONFLICT
    // =================

    $.fn.selectList.noConflict = function () {
        $.fn.selectList = old
        return this
    }

    // SELECT LIST DATA-API
    // ===============

    $(document).render(function () {
        $('[data-control="selectlist"]').selectList()
    })

}(window.jQuery);

+function ($) {
    "use strict";

    $("#side-nav-menu").metisMenu({
        toggle: true,
        collapseInClass: 'show'
    })

    $("#navSidebar").on('show.bs.collapse', function () {
        $('.sidebar').addClass('show')
    }).on('hide.bs.collapse', function () {
        $('.sidebar').removeClass('show')
    })

    var GREEN_BUTTON_BASE_GRADIENT = 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)';
    var GREEN_BUTTON_HOVER_GRADIENT = 'linear-gradient(135deg, #364a63 0%, #526484 100%)';

    function applyDeleteIconColor(context) {
        var scope = context || document;

        $('a[data-request="onDelete"] i.fa-trash, a[data-request="onDelete"] i.fa-trash-o', scope)
            .each(function () {
                this.style.setProperty('color', '#dc3545', 'important');
            });
    }

    function applyGreenButtonBase(element) {
        element.style.setProperty('background', GREEN_BUTTON_BASE_GRADIENT, 'important');
        element.style.setProperty('background-image', GREEN_BUTTON_BASE_GRADIENT, 'important');
        element.style.setProperty('border', '1px solid #0c7d47', 'important');
        element.style.setProperty('border-color', '#0c7d47', 'important');
        element.style.setProperty('color', '#ffffff', 'important');
        element.style.setProperty('box-shadow', '0 6px 16px rgba(15, 157, 88, 0.25)', 'important');
        element.style.setProperty('transition', 'transform 0.2s ease, box-shadow 0.2s ease', 'important');
        element.style.setProperty('transform', 'translateY(0)', 'important');
        element.style.setProperty('min-width', '90px', 'important');
        element.style.setProperty('width', 'auto', 'important');
        element.style.setProperty('padding', '0.4rem 0.9rem', 'important');
        element.style.setProperty('display', 'inline-block', 'important');
        element.style.setProperty('text-align', 'center', 'important');
        element.style.removeProperty('align-items');
        element.style.removeProperty('justify-content');
        element.style.removeProperty('gap');
    }

    function handleGreenButtonHover(event) {
        var element = event.currentTarget;
        element.style.setProperty('background', GREEN_BUTTON_HOVER_GRADIENT, 'important');
        element.style.setProperty('background-image', GREEN_BUTTON_HOVER_GRADIENT, 'important');
        element.style.setProperty('transform', 'translateY(-1px)', 'important');
        element.style.setProperty('box-shadow', '0 6px 16px rgba(15, 157, 88, 0.35)', 'important');
    }

    function handleGreenButtonLeave(event) {
        applyGreenButtonBase(event.currentTarget);
    }

    function decorateGreenButton(element) {
        applyGreenButtonBase(element);

        if (element.dataset.greenButtonBound === '1')
            return;

        element.addEventListener('mouseenter', handleGreenButtonHover);
        element.addEventListener('mouseleave', handleGreenButtonLeave);
        element.addEventListener('focus', handleGreenButtonHover);
        element.addEventListener('blur', handleGreenButtonLeave);

        element.dataset.greenButtonBound = '1';
    }

    function applySaveButtonStyles(context) {
        var $scope = context ? $(context) : $(document);

        $scope.find('[data-request="onSave"], .btn-add-widget').each(function () {
            decorateGreenButton(this);
        });
    }

    function applyCloseButtonStyles(context) {
        var $scope = context ? $(context) : $(document);

        $scope.find('.btn-close-modal').each(function () {
            this.style.setProperty('background', '#f1f4fb', 'important');
            this.style.setProperty('border', '1px solid #c9d2e3', 'important');
            this.style.setProperty('color', '#202938', 'important');
            this.style.setProperty('width', '90px', 'important');
            this.style.setProperty('min-width', '90px', 'important');
            this.style.setProperty('padding', '0.4rem 0.9rem', 'important');
            this.style.setProperty('border-radius', '12px', 'important');
            this.style.setProperty('display', 'inline-block', 'important');
            this.style.setProperty('text-align', 'center', 'important');
        });
    }

    function applyWidgetModalStyles(context) {
        var $scope = context ? $(context) : $(document);

        $scope.find('#newWidgetModal .modal-content, .dashboard-widget-modal').each(function () {
            this.style.setProperty('border', '2px solid #edeff5', 'important');
            this.style.setProperty('border-radius', '18px', 'important');
            this.style.setProperty('background', '#ffffff', 'important');
            this.style.setProperty('box-shadow', '0 24px 48px rgba(32, 41, 56, 0.14)', 'important');
        });

        $scope.find('#newWidgetModal .modal-header, .dashboard-widget-modal .modal-header').each(function () {
            this.style.setProperty('border', 'none', 'important');
            this.style.setProperty('padding', '1.5rem 1.75rem', 'important');
        });

        $scope.find('#newWidgetModal .modal-body, .dashboard-widget-modal .modal-body').each(function () {
            this.style.setProperty('padding', '1.5rem 1.75rem', 'important');
            this.style.setProperty('border-bottom', '1px solid rgba(201, 210, 227, 0.5)', 'important');
        });

        $scope.find('#newWidgetModal .modal-footer, .dashboard-widget-modal .modal-footer').each(function () {
            this.style.setProperty('border', 'none', 'important');
            this.style.setProperty('padding', '1rem 1.75rem 1.25rem', 'important');
            this.style.setProperty('gap', '0.75rem', 'important');
        });

        $scope.find('#newWidgetModal select, #newWidgetModal .form-control, #newWidgetModal .ss-main, .dashboard-widget-modal select, .dashboard-widget-modal .form-control, .dashboard-widget-modal .ss-main').each(function () {
            this.style.setProperty('border', '1px solid #c9d2e3', 'important');
            this.style.setProperty('border-radius', '12px', 'important');
            this.style.setProperty('padding', '0.65rem 0.75rem', 'important');
            this.style.setProperty('box-shadow', 'none', 'important');
            this.style.setProperty('color', '#202938', 'important');
            this.style.setProperty('background', '#ffffff', 'important');
        });

        $scope.find('#newWidgetModal .help-block, .dashboard-widget-modal .help-block').each(function () {
            this.style.setProperty('color', '#202938', 'important');
            this.style.setProperty('font-weight', '400', 'important');
            this.style.setProperty('opacity', '0.9', 'important');
        });
    }

    $(document).render(function (event) {
        var context = event && event.target ? event.target : document;

        $('a[title], span[title], button[title]', document).not('[data-bs-toggle]').tooltip({placement: 'bottom'});
        $('.alert', document).alert();

        applyDeleteIconColor(context);
        applySaveButtonStyles(context);
        applyCloseButtonStyles(context);
        applyWidgetModalStyles(context);
    });

    $(document).on('ajaxDone ajaxComplete ajaxSuccess', function (event, context) {
        var scope = context && context.elements ? context.elements : context;
        applyDeleteIconColor(scope || document);
        applySaveButtonStyles(scope || document);
        applyCloseButtonStyles(scope || document);
        applyWidgetModalStyles(scope || document);
    });

    applyDeleteIconColor();
    applySaveButtonStyles();
    applyCloseButtonStyles();
    applyWidgetModalStyles();

    $(function () {
        applySaveButtonStyles();
        applyCloseButtonStyles();
        applyWidgetModalStyles();
    });

    var saveButtonStyleInterval = setInterval(function () {
        applySaveButtonStyles();
        applyCloseButtonStyles();
        applyWidgetModalStyles();
    }, 500);

    setTimeout(function () {
        clearInterval(saveButtonStyleInterval);
    }, 5000);

    // Multiple Modal Fix
    $(document).on('show.bs.modal', '.modal', function () {
        var zIndex = 1040 + (10 * $('.modal:visible').length + 1)
        $(this).css('z-index', zIndex)
        $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 2).addClass('modal-stack')
        setTimeout(function () {
            $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack')
        }, 0)
    })

    $(document).on('hidden.bs.modal', '.modal', function () {
        $('.modal:visible').length && $(document.body).addClass('modal-open')
    })

    // Varying modal content
    $(document).on('show.bs.modal', '.modal', function (event) {
        var $modal = $(this),
            $button = $(event.relatedTarget)

        if (!$button.length)
            return

        $.each($button.get(0).attributes, function(index, attribute) {
            if (/^data-modal-/.test(attribute.name)) {
                var attrName = attribute.name.substr(11),
                    attrValue = attribute.value

                $modal.find('[data-modal-html="'+attrName+'"]').html(attrValue)
                $modal.find('[data-modal-text="'+attrName+'"]').text(attrValue)
                $modal.find('[data-modal-input="'+attrName+'"]').val(attrValue)
            }
        });
    })

    $(window).on('ajaxErrorMessage', function (event, message) {
        if (!message) return

        $.ti.flashMessage({class: 'danger', text: message, allowDismiss: false})

        event.preventDefault()
    })

    /*
     * Handle CSRF token failures and authentication errors
     */
    $(window).on('ajaxError', function (event, context, textStatus, jqXHR) {
        // Handle 403 (CSRF failure) and 419 (token expired)
        if (jqXHR.status === 403 || jqXHR.status === 419) {
            var errorMessage = jqXHR.responseText || 'Security token expired. Reloading page...'
            
            console.error('CSRF/Auth Error:', errorMessage)
            
            $.ti.flashMessage({
                class: 'danger', 
                text: errorMessage,
                allowDismiss: false
            })
            
            // Auto-reload page after 2 seconds to get fresh CSRF token
            setTimeout(function() {
                console.log('Reloading page to refresh security token...')
                window.location.reload()
            }, 2000)
            
            event.preventDefault()
            return false
        }
        
        // Handle 401 (unauthenticated) - redirect to login
        if (jqXHR.status === 401) {
            console.warn('Session expired, redirecting to login...')
            window.location.href = '/admin/login'
            event.preventDefault()
            return false
        }
    })

    /*
     * Ensure the CSRF token is added to all AJAX requests.
     */
    $.ajaxPrefilter(function(options) {
        var token = $('meta[name="csrf-token"]').attr('content')

        if (token) {
            if (!options.headers) options.headers = {}
            options.headers['X-CSRF-TOKEN'] = token
        }
    })

    function enforceSingleCalendarLayout(picker) {
        if (!picker || !picker.container) return;
        if (!picker.isShowing && !picker.container.hasClass('show-calendar')) return;

        var $container = picker.container;

        $container.addClass('ti-visible open-active tm-single-calendar');
        $container.css('display', 'grid');

        var $left = $container.find('.drp-calendar.left');
        var $right = $container.find('.drp-calendar.right');

        if ($left.length) {
            $left
                .attr('aria-hidden', 'true')
                .addClass('tm-hidden-calendar')
                .css({
                    display: 'none',
                    visibility: 'hidden',
                    height: 0,
                    overflow: 'hidden',
                    padding: 0,
                    margin: 0
                });

            $left.find('.calendar-time').css({
                display: 'none',
                visibility: 'hidden'
            });
        }

        if ($right.length) {
            $right
                .attr('aria-hidden', 'false')
                .css({
                    display: 'block',
                    visibility: '',
                    height: '',
                    overflow: ''
                });
        }

        var $buttons = $container.find('.drp-buttons');
        if ($buttons.length) {
            $buttons.css('display', 'grid');
            $buttons.css('grid-template-columns', '1fr auto auto');
        }
    }

    // Lightweight daterangepicker arrow normaliser
    function ensureRangePickerArrows(picker) {
        var $container = picker && picker.container ? picker.container : $('.daterangepicker.show-calendar').last();
        if (!$container || !$container.length) return;

        var $headerRow = $container.find('.drp-calendar.right .calendar-table thead tr:first-child');
        if (!$headerRow.length) return;

        var $cells = $headerRow.children('th');

        var $prev = $headerRow.children('th.prev').first();
        if (!$prev.length && $cells.length) {
            $prev = $($cells.get(0));
        }
        if (!$prev.length) {
            $prev = $('<th></th>');
            $headerRow.prepend($prev);
        }
        $prev.attr('class', 'prev available');

        var $next = $headerRow.children('th.next').last();
        if (!$next.length && $cells.length > 1) {
            $next = $($cells.get($cells.length - 1));
        }
        if (!$next.length) {
            $next = $('<th></th>');
            $headerRow.append($next);
        }
        $next.attr('class', 'next available');

        if (!$prev.children('span').length) {
            $prev.empty().append('<span></span>');
        }
        if (!$next.children('span').length) {
            $next.empty().append('<span></span>');
        }

        $prev.children('span').text('');
        $next.children('span').text('');

        $prev.off('.arrowNav').removeData('arrow-bound');
        $prev.on('click.arrowNav', function (event) {
                if (event && typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                var mockEvent = {
                    target: this,
                    currentTarget: this,
                    preventDefault: function () {}
                };
                if (picker && typeof picker.clickPrev === 'function') {
                    picker.clickPrev(mockEvent);
                } else {
                    $container.find('.calendar-table thead tr:first-child th.prev').not($prev).first().trigger('click');
                }
                setTimeout(function () {
                    ensureRangePickerArrows(picker);
                }, 0);
            });

        $next.off('.arrowNav').removeData('arrow-bound');
        $next.on('click.arrowNav', function (event) {
                if (event && typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                var mockEvent = {
                    target: this,
                    currentTarget: this,
                    preventDefault: function () {}
                };
                if (picker && typeof picker.clickNext === 'function') {
                    picker.clickNext(mockEvent);
                } else {
                    $container.find('.calendar-table thead tr:first-child th.next').not($next).first().trigger('click');
                }
                setTimeout(function () {
                    ensureRangePickerArrows(picker);
                }, 0);
            });
        $next.data('arrow-bound', true);

        var headerNode = $headerRow.get(0);
        var observerTarget = headerNode ? headerNode.parentNode || headerNode : null;
        if (observerTarget && !observerTarget.__arrowObserver) {
            var observer = new MutationObserver(function () {
                observer.disconnect();
                observerTarget.__arrowObserver = null;
                ensureRangePickerArrows(picker);
            });
            observer.observe(observerTarget, { childList: true, subtree: true });
            observerTarget.__arrowObserver = observer;
        }
    }

    $(document).on('show.daterangepicker', function (event, picker) {
        // AGGRESSIVE FIX: Completely disable profile dropdown when calendar opens
        var $profileDropdown = $('.profile-dropdown-menu');
        if ($profileDropdown.length) {
            // Remove show class
            $profileDropdown.removeClass('show');
            // Completely disable pointer events and hide it
            $profileDropdown.css({
                'display': 'none !important',
                'visibility': 'hidden !important',
                'opacity': '0 !important',
                'pointer-events': 'none !important',
                'z-index': '-1 !important'
            });
            // Disable all links inside
            $profileDropdown.find('a, button, .dropdown-item').css({
                'pointer-events': 'none !important'
            });
        }
        
        // Close all other Bootstrap dropdowns
        $('.dropdown-menu.show').removeClass('show').css({
            'display': 'none',
            'visibility': 'hidden',
            'opacity': '0',
            'pointer-events': 'none'
        });
        $('[data-bs-toggle="dropdown"][aria-expanded="true"]').attr('aria-expanded', 'false');
        $('.dropdown-backdrop').remove();
        
        // Ensure calendar has highest z-index
        setTimeout(function() {
            $('.daterangepicker').css({
                'z-index': '99999',
                'pointer-events': 'auto'
            });
        }, 10);
        
        enforceSingleCalendarLayout(picker);
        ensureRangePickerArrows(picker);
        setTimeout(function () {
            enforceSingleCalendarLayout(picker);
            ensureRangePickerArrows(picker);
        }, 50);
    });
    
    // When calendar closes, restore profile dropdown functionality
    $(document).on('hide.daterangepicker', function (event, picker) {
        var $profileDropdown = $('.profile-dropdown-menu');
        if ($profileDropdown.length) {
            // Remove the forced styles so it can work normally again
            $profileDropdown.css({
                'display': '',
                'visibility': '',
                'opacity': '',
                'pointer-events': '',
                'z-index': ''
            });
            $profileDropdown.find('a, button, .dropdown-item').css({
                'pointer-events': ''
            });
        }
    });

    $(document).on('click focus', '[data-control="datepicker"] [data-datepicker-trigger]', function () {
        var picker = $(this).data('daterangepicker');
        setTimeout(function () {
            enforceSingleCalendarLayout(picker);
            ensureRangePickerArrows(picker);
        }, 0);
    });

    console.log('ℹ️ Calendar single-view enforcement active');
}(window.jQuery);
