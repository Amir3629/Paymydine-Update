#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const QA_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(QA_ROOT, '..');
const OUT_ROOT = path.join(QA_ROOT, 'pmd-qa-results', 'admin-runtime-stabilization');

const TARGET_ROUTES = [
  '/admin/reservations',
  '/admin/orders',
  '/admin/coupons',
  '/admin/locations',
  '/admin/menus',
  '/admin/mealtimes',
  '/admin/tables',
  '/admin/themes',
  '/admin/settings',
  '/admin/dashboard2',
  '/admin/dashboard',
  '/admin/dashboardwaiternew'
];

const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor', 'storage', 'pmd-qa-results']);

function walk(dir) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(fullPath));
    else output.push(fullPath);
  }
  return output;
}

function relative(file) {
  return path.relative(REPO_ROOT, file).split(path.sep).join('/');
}

function routeSlug(route) {
  return route.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9_.-]+/gi, '-') || 'root';
}

const sourceFiles = walk(REPO_ROOT).filter((file) => /\.(php|blade\.php|js|css|ts|json|md|yml|yaml)$/i.test(file));
const cache = new Map();

function read(file) {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(file, 'utf8'));
  return cache.get(file);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function routeAliases(route) {
  const last = route.split('/').filter(Boolean).at(-1) || route;
  return unique([
    last,
    last.replace(/s$/, ''),
    route.replace('/admin/', '').replace(/[/-]/g, '_'),
    route.replace('/admin/', '').replace(/[/-]/g, '-')
  ]);
}

function findStaticEvidence(route) {
  const escaped = routeAliases(route).map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(escaped.join('|'), 'i');
  return sourceFiles.map(relative).filter((file) => pattern.test(file) || pattern.test(read(path.join(REPO_ROOT, file))));
}

function loadRuntimeAudits(route) {
  const dir = path.join(OUT_ROOT, 'routes', routeSlug(route));
  if (!fs.existsSync(dir)) return [];
  const audits = [];
  for (const viewport of fs.readdirSync(dir)) {
    const auditFile = path.join(dir, viewport, 'audit.json');
    if (!fs.existsSync(auditFile)) continue;
    const parsed = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
    audits.push(...(parsed.scenarios || []));
  }
  return audits;
}

function runtimeAuthorityEvidence(audits) {
  const finals = audits.map((audit) => audit.final).filter(Boolean);
  const transitions = audits.flatMap((audit) => audit.authorityTransitionTimeline || []);
  const finalRoots = finals.map((final) => final.largestVisible?.floor || final.largestVisible?.page).filter(Boolean);
  finalRoots.sort((a, b) => (b.rect?.area || 0) - (a.rect?.area || 0));

  return {
    loadedScripts: unique(finals.flatMap((final) => final.loadedScripts || [])),
    loadedStylesheets: unique(finals.flatMap((final) => final.loadedStylesheets || [])),
    dynamicallyInjectedAssets: unique(finals.flatMap((final) => [...(final.loadedScripts || []), ...(final.loadedStylesheets || [])])),
    versionLikeScripts: unique(finals.flatMap((final) => final.loadedScripts || []).filter((url) => /pmd-reservation-|[?&](v|ver|version)=|[.-]\d{6,}/i.test(url))),
    iframes: finals.flatMap((final) => final.iframes || []),
    floorRoots: finals.flatMap((final) => final.roots?.floor || []),
    sidebarRoots: finals.flatMap((final) => final.roots?.sidebar || []),
    duplicateRuntimeAuthorities: finals.flatMap((final) => [...(final.duplicateAssetUrls || []), ...(final.cacheVersionVariants || [])]),
    storageKeys: unique(finals.flatMap((final) => [...(final.storage?.localStorageKeys || []), ...(final.storage?.sessionStorageKeys || [])])),
    transitions,
    finalVisibleRoot: finalRoots[0] || null,
    sidebarWidthChanges: unique(audits.flatMap((audit) => audit.metrics?.sidebarWidthChanges || [])),
    pageOffsetChanges: unique(audits.flatMap((audit) => audit.metrics?.pageContentLeftOffsetChanges || []))
  };
}

function classifySource(staticFiles) {
  return {
    controllerCandidates: staticFiles.filter((file) => /controllers?\//i.test(file)),
    viewCandidates: staticFiles.filter((file) => /views?\/|\.blade\.php$/i.test(file)),
    globalLayoutCandidates: sourceFiles.map(relative).filter((file) => /layout|mainmenu|sidebar|nav/i.test(file) && /views?|layouts?|partials?/i.test(file)).slice(0, 80),
    routeSpecificCss: staticFiles.filter((file) => /\.css$/i.test(file)),
    routeSpecificJs: staticFiles.filter((file) => /\.js$/i.test(file)),
    inlineScriptFiles: staticFiles.filter((file) => /\.php$|\.blade\.php$/i.test(file) && /<script[\s>]/i.test(read(path.join(REPO_ROOT, file)))),
    timerFiles: staticFiles.filter((file) => /setTimeout|setInterval|requestAnimationFrame/i.test(read(path.join(REPO_ROOT, file)))),
    mutationObserverFiles: staticFiles.filter((file) => /new\s+MutationObserver|MutationObserver\(/i.test(read(path.join(REPO_ROOT, file)))),
    sidebarModifierFiles: staticFiles.filter((file) => /sidebar|side-nav|collapse|drawer/i.test(read(path.join(REPO_ROOT, file))))
  };
}

function mapRoute(route) {
  const staticFiles = findStaticEvidence(route);
  const runtimeAudits = loadRuntimeAudits(route);
  const source = classifySource(staticFiles);
  const runtime = runtimeAuthorityEvidence(runtimeAudits);
  const currentAuthorities = unique([
    ...source.controllerCandidates,
    ...source.viewCandidates,
    ...source.routeSpecificCss,
    ...source.routeSpecificJs,
    ...runtime.loadedScripts,
    ...runtime.loadedStylesheets
  ]);

  const finalVisibleAuthority = runtime.finalVisibleRoot
    ? `${runtime.finalVisibleRoot.tag}#${runtime.finalVisibleRoot.id || ''}.${runtime.finalVisibleRoot.classes || ''}`.slice(0, 240)
    : 'requires authenticated runtime audit';

  return {
    route,
    static: source,
    runtime: {
      ...runtime,
      pmdReservationAssets: route.includes('reservation') ? runtime.dynamicallyInjectedAssets.filter((asset) => /pmd-reservation-/i.test(asset)) : [],
      ownerDashboardMountingEvidence: route.includes('reservation') ? currentAuthorities.filter((item) => /owner|dashboardwaiter|dashboard|pos/i.test(item)) : []
    },
    consolidation: {
      feature: route.includes('reservation') ? 'reservations/floor runtime' : route.includes('dashboardwaiter') ? 'waiter dashboard/POS runtime' : 'admin runtime/layout',
      currentAuthorities,
      finalVisibleAuthority,
      hiddenDependency: currentAuthorities.filter((authority) => authority !== finalVisibleAuthority).slice(0, 12),
      safeReplacementNeeded: currentAuthorities.length > 1,
      safeToDisable: false,
      evidence: unique([
        ...staticFiles.slice(0, 10),
        ...runtime.loadedScripts.slice(0, 10),
        ...runtime.loadedStylesheets.slice(0, 10),
        ...runtime.transitions.slice(0, 10).map((transition) => `${transition.atMs}ms ${transition.authority}`)
      ]),
      risk: route.includes('reservation') || route.includes('dashboardwaiter') ? 'high' : 'medium'
    }
  };
}

function markdown(map) {
  const lines = ['# PMD Admin Runtime Ownership Map', '', 'Evidence-first static plus runtime ownership map. No UI fixes, anti-flicker gate, rewrites, or legacy removals are performed.', ''];
  for (const route of map.routes) {
    lines.push(`## ${route.route}`, '');
    lines.push(`- Controller candidates: ${route.static.controllerCandidates.join(', ') || 'not found'}`);
    lines.push(`- View candidates: ${route.static.viewCandidates.join(', ') || 'not found'}`);
    lines.push(`- Route-specific CSS: ${route.static.routeSpecificCss.join(', ') || 'not found'}`);
    lines.push(`- Route-specific JS: ${route.static.routeSpecificJs.join(', ') || 'not found'}`);
    lines.push(`- Inline script files: ${route.static.inlineScriptFiles.join(', ') || 'not found'}`);
    lines.push(`- Timers: ${route.static.timerFiles.join(', ') || 'not found'}`);
    lines.push(`- MutationObservers: ${route.static.mutationObserverFiles.join(', ') || 'not found'}`);
    lines.push(`- Runtime scripts: ${route.runtime.loadedScripts.slice(0, 12).join(', ') || 'requires authenticated audit'}`);
    lines.push(`- Runtime stylesheets: ${route.runtime.loadedStylesheets.slice(0, 12).join(', ') || 'requires authenticated audit'}`);
    lines.push(`- Iframes: ${route.runtime.iframes.length ? JSON.stringify(route.runtime.iframes.slice(0, 6)) : 'none observed / audit not run'}`);
    lines.push(`- Final visible authority: ${route.consolidation.finalVisibleAuthority}`);
    lines.push(`- Authority transitions: ${route.runtime.transitions.slice(0, 12).map((item) => `${item.atMs}ms ${item.authority}`).join(' → ') || 'requires authenticated audit'}`);
    lines.push('');
  }

  lines.push('## Proposed consolidation matrix', '');
  lines.push('| Route | Feature | Current authorities | Final visible authority | Hidden dependency | Safe replacement needed | Safe to disable | Evidence | Risk |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const route of map.routes) {
    lines.push(`| ${route.route} | ${route.consolidation.feature} | ${route.consolidation.currentAuthorities.slice(0, 8).join('<br>') || 'unknown'} | ${route.consolidation.finalVisibleAuthority} | ${route.consolidation.hiddenDependency.slice(0, 6).join('<br>') || 'unknown'} | ${route.consolidation.safeReplacementNeeded ? 'yes' : 'no'} | no | ${route.consolidation.evidence.slice(0, 8).join('<br>') || 'requires authenticated audit'} | ${route.consolidation.risk} |`);
  }
  return lines.join('\n');
}

function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const map = {
    generatedAt: new Date().toISOString(),
    routes: TARGET_ROUTES.map(mapRoute)
  };
  fs.writeFileSync(path.join(OUT_ROOT, 'ownership-map.json'), JSON.stringify(map, null, 2));
  fs.writeFileSync(path.join(OUT_ROOT, 'ownership-map.md'), markdown(map));
  console.log(`Wrote ${path.join(OUT_ROOT, 'ownership-map.json')}`);
  console.log(`Wrote ${path.join(OUT_ROOT, 'ownership-map.md')}`);
}

main();
