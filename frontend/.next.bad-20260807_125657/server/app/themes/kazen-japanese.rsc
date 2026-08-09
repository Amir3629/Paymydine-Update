1:"$Sreact.fragment"
c:I[75115,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"default",1]
:HL["/_next/static/chunks/3ie0ujekr_d50.css","style"]
:HL["/_next/static/chunks/07xeww4jmfvgi.css","style"]
:HL["/_next/static/chunks/1sygis812p6dn.css","style"]
:HL["/_next/static/chunks/34u0js8v19r8c.css","style"]
:HL["/_next/static/chunks/3uzs82tixo7ew.css","style"]
:HL["/_next/static/chunks/0hyg7gp-_u6tx.css","style"]
:HL["/_next/static/chunks/22fkexfor-0lx.css","style"]
2:T475,(function(){try{
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
          }catch(e){}})()3:T395b,
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
                      element.style.setProperty('border', `1px solid ${colors.border}`, 'important');

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
                      modal.style.setProperty('border', `1px solid ${modalColor.border}`, 'important');
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
                          button.style.setProperty('border', `1px solid ${iconColor.buttonBg}`, 'important');
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
          0:{"P":null,"c":["","themes","kazen-japanese"],"q":"","i":false,"f":[[["",{"children":["themes",{"children":["kazen-japanese",{"children":["__PAGE__",{}]}]}]},"$undefined","$undefined",16],[["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/3ie0ujekr_d50.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","link","1",{"rel":"stylesheet","href":"/_next/static/chunks/07xeww4jmfvgi.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","link","2",{"rel":"stylesheet","href":"/_next/static/chunks/1sygis812p6dn.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","link","3",{"rel":"stylesheet","href":"/_next/static/chunks/34u0js8v19r8c.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","link","4",{"rel":"stylesheet","href":"/_next/static/chunks/3uzs82tixo7ew.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","link","5",{"rel":"stylesheet","href":"/_next/static/chunks/0hyg7gp-_u6tx.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/1le7nldz4hlfr.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/0dn247mc1-6_g.js","async":true,"nonce":"$undefined"}],["$","script","script-2",{"src":"/_next/static/chunks/1pyi1oje6qgwq.js","async":true,"nonce":"$undefined"}],["$","script","script-3",{"src":"/_next/static/chunks/22ed3cee1rk_2.js","async":true,"nonce":"$undefined"}],["$","script","script-4",{"src":"/_next/static/chunks/0b2_kcnds313o.js","async":true,"nonce":"$undefined"}]],["$","html",null,{"lang":"en","className":"theme-vars","suppressHydrationWarning":true,"children":[["$","head",null,{"children":[["$","link",null,{"rel":"manifest","href":"/manifest.json"}],["$","meta",null,{"name":"theme-color","content":"#E7CBA9"}],["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$2"}}],["$","style",null,{"id":"theme-vars-inline","children":"\n          /* Let CSS variables handle all backgrounds - no overrides */\n          html, body { background: var(--theme-background); }\n        "}],["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$3"}}],"$L4","$L5"]}],"$L6"]}]]}],{"children":["$L7",{"children":["$L8",{"children":["$L9",{},null,false,null]},null,false,"$@a"]},null,false,"$@a"]},null,false,null],"$Lb",false]],"m":"$undefined","G":["$c",["$Ld","$Le","$Lf","$L10","$L11","$L12"]],"S":true,"h":null,"s":"$undefined","l":"$undefined","p":"$undefined","d":"$undefined","b":"gCjSc1BziDk4XkVWtt7fI"}
14:I[16442,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"default"]
15:I[41280,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"FaviconSetter"]
16:I[18936,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"ThemeProvider"]
17:I[91936,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"default"]
18:I[32035,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"default"]
19:I[91168,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"default"]
1a:I[16506,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js","/_next/static/chunks/3d16atk4cptpi.js"],""]
1b:I[72527,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"Toaster"]
1d:I[92155,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js","/_next/static/chunks/3rs2g4d11_5q0.js","/_next/static/chunks/2ijeod1mwy0j-.js"],"default"]
1e:I[64381,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"OutletBoundary"]
1f:"$Sreact.suspense"
22:I[64381,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"ViewportBoundary"]
24:I[64381,["/_next/static/chunks/1le7nldz4hlfr.js","/_next/static/chunks/0dn247mc1-6_g.js","/_next/static/chunks/1pyi1oje6qgwq.js","/_next/static/chunks/22ed3cee1rk_2.js","/_next/static/chunks/0b2_kcnds313o.js"],"MetadataBoundary"]
4:["$","style",null,{"id":"pmd-cart-badge-cache-bridge","dangerouslySetInnerHTML":{"__html":"\nhtml body span.cart-badge.pmd-v2-badge,\nhtml body [data-pmd-menu-cart-badge=\"1\"] {\n  --pmd-v2-badge-bg: #b88940 !important;\n  --pmd-v2-badge-text: #FFFFFF !important;\n  --pmd-v2-badge-border: #b88940 !important;\n  background: #b88940 !important;\n  background-color: #b88940 !important;\n  background-image: none !important;\n  color: #FFFFFF !important;\n  -webkit-text-fill-color: #FFFFFF !important;\n  border-color: #b88940 !important;\n  outline-color: #b88940 !important;\n  text-shadow: none !important;\n  filter: none !important;\n}\n\nhtml body span.cart-badge.pmd-v2-badge *,\nhtml body [data-pmd-menu-cart-badge=\"1\"] * {\n  color: #FFFFFF !important;\n  -webkit-text-fill-color: #FFFFFF !important;\n  text-shadow: none !important;\n  filter: none !important;\n}\n            "}}]
13:T42b,
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
            5:["$","script",null,{"id":"pmd-organic-prepaint-bootstrap","dangerouslySetInnerHTML":{"__html":"$13"}}]
1c:T1c4c,
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
    var text = rawText.replace(/\s+/g, " ").trim().toLowerCase();
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
            6:["$","body",null,{"className":"text-theme","children":[["$","$L14",null,{}],["$","$L15",null,{}],["$","$L16",null,{"children":["$","$L17",null,{"className":"min-h-screen font-sans antialiased","children":[["$","$L18",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L19",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":[["$","div",null,{"className":"flex flex-col items-center justify-center min-h-screen p-4","children":[["$","h2",null,{"className":"text-2xl font-bold mb-4","children":"Page Not Found"}],["$","p",null,{"className":"text-gray-600 mb-6","children":"Could not find requested resource"}],["$","$L1a",null,{"href":"/","className":"text-blue-600 hover:text-blue-800 underline","children":"Return Home"}]]}],[]],"forbidden":"$undefined","unauthorized":"$undefined"}],["$","$L1b",null,{}]]}]}],["$","script",null,{"id":"pmd-organic-checkout-runtime-bridge","dangerouslySetInnerHTML":{"__html":"$1c"}}]]}]
7:["$","$1","c",{"children":[null,["$","$L18",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L19",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
8:["$","$1","c",{"children":[null,["$","$L18",null,{"parallelRouterKey":"children","error":"$undefined","errorStyles":"$undefined","errorScripts":"$undefined","template":["$","$L19",null,{}],"templateStyles":"$undefined","templateScripts":"$undefined","notFound":"$undefined","forbidden":"$undefined","unauthorized":"$undefined"}]]}]
9:["$","$1","c",{"children":[["$","$L1d",null,{}],[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/22fkexfor-0lx.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}],["$","script","script-0",{"src":"/_next/static/chunks/3rs2g4d11_5q0.js","async":true,"nonce":"$undefined"}],["$","script","script-1",{"src":"/_next/static/chunks/2ijeod1mwy0j-.js","async":true,"nonce":"$undefined"}]],["$","$L1e",null,{"children":["$","$1f",null,{"name":"Next.MetadataOutlet","children":"$@20"}]}]]}]
21:[]
a:"$W21"
b:["$","$1","h",{"children":[null,["$","$L22",null,{"children":"$L23"}],["$","div",null,{"hidden":true,"children":["$","$L24",null,{"children":["$","$1f",null,{"name":"Next.Metadata","children":"$L25"}]}]}],null]}]
d:["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/3ie0ujekr_d50.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
e:["$","link","1",{"rel":"stylesheet","href":"/_next/static/chunks/07xeww4jmfvgi.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
f:["$","link","2",{"rel":"stylesheet","href":"/_next/static/chunks/1sygis812p6dn.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
10:["$","link","3",{"rel":"stylesheet","href":"/_next/static/chunks/34u0js8v19r8c.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
11:["$","link","4",{"rel":"stylesheet","href":"/_next/static/chunks/3uzs82tixo7ew.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
12:["$","link","5",{"rel":"stylesheet","href":"/_next/static/chunks/0hyg7gp-_u6tx.css","precedence":"next","crossOrigin":"$undefined","nonce":"$undefined"}]
23:[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1"}]]
20:null
25:[["$","title","0",{"children":"PayMyDine - A Luxurious Dining Experience"}],["$","meta","1",{"name":"description","content":"Order, pay, and enjoy your meal seamlessly."}],["$","meta","2",{"name":"generator","content":"v0.dev"}]]
