/* dsh-model-organizer smoke test.
 *
 * The plugin is a browser bundle with no build step, so this runs it headlessly:
 * a stub React with real hook slots and a tiny resolver (child components are
 * invoked, so the DragList rows are part of the resolved tree), a stub DOM, and a
 * fake host that records settings mutations and credential writes. It proves the
 * three seat registrations still happen, the organizer page renders its three
 * states, and its controls actually write:
 *
 *   - the provider rail and the model list are drag-ordered (the rows ARE the drag
 *     surface; there is no inline grip any more),
 *   - built-in routes are listed as read-only rows that hand the Models row back,
 *   - a model row is one line (dot + name + chips, no inline inputs, no footer Save), and
 *     a click opens the portaled details dialog,
 *   - the details dialog's Save writes models[] through ONE settings mutation, and an
 *     empty model id is refused on the dialog before any write,
 *   - the fetch picker adopts candidates through that same single write,
 *   - Base URL and protocol write their own fields,
 *   - the API key is written through the credentials service, never read back,
 *   - the footer panel keeps its header (and the way back) with < 2 providers.
 *
 *   node test/smoke.mjs        # or npm test
 *
 * Exit code is non-zero on the first failed expectation.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/* --------------------------- stub React --------------------------- */
const noop = () => {};
function createElement(type, props, ...children) {
  const p = Object.assign({}, props);
  if (children.length === 1) p.children = children[0];
  else if (children.length > 1) p.children = children;
  return { type, props: p, __el: true };
}
const hookSlots = new Map();      // path -> hook slots
const hookCursor = new Map();     // path -> next hook index (reset per render)
const effectSlots = new Map();    // path#index -> deps
const cleanups = [];

function slot(path, index, init) {
  const key = path + "#" + index;
  if (!hookSlots.has(key)) hookSlots.set(key, init());
  return hookSlots.get(key);
}
function runEffect(path, index, fn, deps) {
  const key = path + "#" + index;
  const previous = effectSlots.get(key);
  if (previous !== undefined) {
    if (deps === undefined) return;
    if (deps.length === previous.length && deps.every((value, at) => Object.is(value, previous[at]))) return;
  }
  effectSlots.set(key, deps === undefined ? null : deps);
  const cleanup = fn();
  if (typeof cleanup === "function") cleanups.push(cleanup);
}
let hookPath = "";
function hookIndex() { return hookCursor.get(hookPath) ?? 0; }
function bumpIndex() { hookCursor.set(hookPath, hookIndex() + 1); }
function withHooks(path, render) {
  hookCursor.set(path, 0);
  hookPath = path;
  return render();
}

const React = {
  createElement,
  Fragment: "Fragment",
  Component: class { constructor(props) { this.props = props; } setState() {} },
  useState(init) {
    const index = hookIndex(); bumpIndex();
    const owner = hookPath;   // the setter belongs to the component that asked for it
    const set = (value) => {
      const key = owner + "#" + index;
      hookSlots.set(key, typeof value === "function" ? value(hookSlots.get(key)) : value);
    };
    return [slot(owner, index, () => (typeof init === "function" ? init() : init)), set];
  },
  useRef(init) {
    const index = hookIndex(); bumpIndex();
    return slot(hookPath, index, () => ({ current: init === undefined ? null : init }));
  },
  useMemo(fn) { bumpIndex(); return fn(); },
  useCallback(fn) { bumpIndex(); return fn; },
  useEffect(fn, deps) { const index = hookIndex(); bumpIndex(); runEffect(hookPath, index, fn, deps); },
  useLayoutEffect(fn, deps) { const index = hookIndex(); bumpIndex(); runEffect(hookPath, index, fn, deps); },
  useSyncExternalStore(sub, get) { bumpIndex(); return get(); }
};

/* ----------------------------- stub DOM ---------------------------- */
function el(tag) {
  return {
    tagName: tag, children: [], style: {}, dataset: {}, hidden: false,
    setAttribute(k, v) { this[k] = v; },
    getAttribute(k) { return this[k]; },
    appendChild(child) { this.children.push(child); return child; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; }
  };
}
const store = new Map();
/* A resolved shipped stylesheet: the plugin's class resolution walks selectorText, so
   these four anchors + the optionCopy validation are what make it take the branch a
   real browser takes (shipped classes, no inline row styles). */
const SHEET_PREFIX = "wq12jW";
const sheetSelectors = ["triggerEffort", "optionCopy", "chevronOpen", "cellValue", "searchRow", "cell", "option", "modelName", "check"]
  .map((suffix) => "." + SHEET_PREFIX + "_" + suffix);
const fakeDocument = {
  body: el("body"), head: el("head"), createElement: el,
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
  styleSheets: [{ cssRules: sheetSelectors.map((selectorText) => ({ selectorText })) }],
  addEventListener() {}, removeEventListener() {}
};
const fakeWindow = {
  innerWidth: 1200, innerHeight: 800, __ModuleLoader__: null,
  addEventListener() {}, removeEventListener() {},
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); }
  }
};
globalThis.window = fakeWindow;
globalThis.document = fakeDocument;
/* Browser odds and ends the panel touches (it measures and mirrors its own DOM). */
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
/* Fired by hand in the tests: the settings nav does not exist until the panel opens, so
   the plugin's watcher is what keeps the spare row hidden. */
const observers = [];
globalThis.MutationObserver = class {
  constructor(cb) { this.cb = cb; this.disconnected = false; observers.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" });

/* ------------------------- load the bundle ------------------------- */
const entry = fileURLToPath(new URL("../lib/client.js", import.meta.url));
let factory = null;
fakeWindow.__ModuleLoader__ = { load(spec) { factory = spec.factory; } };
new Function(fs.readFileSync(entry, "utf8"))();
const plugin = factory((name) => {
  if (name === "react") return React;
  if (name === "react-dom") return { createPortal: (node) => node };
  throw new Error("module not available in this harness: " + name);
});

/* ---------------------------- fake host ---------------------------- */
let officialPriority = 0;   /* the shipped entry sits at 0 in this harness by default */
let snapshot;
const registrations = [];
const dictionaries = {};
const mutations = [];
const credentialWrites = [];
const credentialClears = [];
const discovered = [];
const directory = { describe: async (refs) => ({ ok: true, value: Object.fromEntries(refs.map((ref) => [ref, { configured: ref === "HCNSEC_API_KEY", writable: true }])) }) };
const storeFace = { subscribe: () => () => {}, getSnapshot: () => snapshot, ensure() {} };
const scope = {
  slots: {
    inject(name, cb) { return cb(); },
    register(opts, comp) { registrations.push({ opts, comp }); return () => {}; },
    /* The raw view (what the nav reads): both the shipped row and, while the takeover is
       off, our additive one. The winner per cell is what entriesOfSlot reports. */
    entries: () => [
      { options: { id: "general", order: 0, label: () => "通用设置" } },
      { options: { id: "models", order: 10, priority: officialPriority, label: () => "模型" } },
      { options: { id: "model-organizer", order: 11, label: () => "模型管理页" } },
      { options: { id: "plugins", order: 15, label: () => "内置插件" } }
    ],
    /* The shipped shell reads its nav rows from here; the plugin resolves the target's
       label through it so the switch matches in any language. */
    entriesOfSlot: (name) => (name === "settings.section" ? [{ options: { id: "models", order: 10, label: () => "模型" } }] : []),
    spec: () => undefined, getVersion: () => 1, subscribe: () => () => {}
  },
  configForms: { describe: () => storeFace },
  settingsScope: { describe: () => storeFace },
  remote: {
    /* The plugin wraps the namespace in its own mutate(ops, revision) face, so the
       host call is (namespace, ops, revision) — record it the same way. */
    settings: { mutate: async (ns, ops, revision) => { mutations.push({ ns, ops, revision }); return { ok: true }; } },
    credentials: {
      describe: directory.describe,
      set: async (ref, value) => { credentialWrites.push({ ref, value }); return { ok: true }; },
      unset: async (ref) => { credentialClears.push(ref); return { ok: true }; }
    },
    llm: {
      /* The shipped discovery face: catalog routes answer from the installed catalog,
         gateways over the wire; this fake returns one model the draft already holds and
         one it does not. */
      discoverModels: async (ns, request) => {
        discovered.push({ ns, request });
        return {
          ok: true,
          value: [
            { id: "DeepSeek-V4-Flash", contextWindow: 1000000, maxTokens: 384000, inputModalities: ["text", "image"] },
            { id: "brand-new-from-host", contextWindow: 128000, inputModalities: ["text", "image"] }
          ]
        };
      },
      listConfigurableProviders: async () => ({
        ok: true,
        value: [
          /* No settingsPath: a route the shipped catalog owns. The rail must list it
             read-only, because this page could never edit its settings. */
          { provider: "deepseek-official", displayName: "DeepSeek 官方", settingsNs: "", declared: true },
          { provider: "hcnsec", displayName: "hcnsec", settingsNs: "llm-pi-ai", settingsPath: ["providers", "hcnsec"], declared: true },
          { provider: "zhipu", displayName: "智谱", settingsNs: "llm-pi-ai", settingsPath: ["providers", "zhipu"], declared: false }
        ]
      })
    }
  },
  modelDirectories: { directoryFor: () => ({ store: scope.settingsScope.describe(), load: async () => {}, select: async () => ({ ok: true }) }) },
  sessions: { subagentAddress: () => undefined },
  logger: { warn: () => {}, info: () => {} }
};
const bind = (ns) => (key, params) => {
  const dict = dictionaries[ns] || {};
  let text = dict[key] === undefined ? key : dict[key];
  if (params) for (const name in params) text = text.replace("{" + name + "}", String(params[name]));
  return text;
};
const ctx = {
  effect(fn) { const dispose = fn(); return typeof dispose === "function" ? dispose : () => {}; },
  inject(names, cb) { cb(scope); },
  locale: { register(ns, dicts) { dictionaries[ns] = dicts.zh; return () => {}; }, bind, getSnapshot: () => ({ revision: 1 }) },
  logger: { warn: () => {}, info: () => {} }
};
plugin.apply(ctx);

/* ------------------------- tiny tree resolver ---------------------- */
function resolve(node, path) {
  if (node === null || node === undefined || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map((child, at) => resolve(child, path + ":" + at));
  if (!node.__el) return node;
  const children = node.props ? node.props.children : undefined;
  if (typeof node.type === "function") {
    /* Class components (the plugin's PanelBoundary) cannot be called as functions. */
    const isClass = typeof node.type.prototype === "object" && node.type.prototype !== null && typeof node.type.prototype.render === "function";
    const rendered = isClass
      ? new node.type(node.props || {}).render()
      : withHooks(path, () => node.type(node.props || {}));
    return resolve(rendered, path + "/");
  }
  const next = Object.assign({}, node.props);
  if (children !== undefined) next.children = resolve(children, path + "/c");
  return { __el: true, type: node.type, props: next };
}
function flattenText(node, out = []) {
  if (node === null || node === undefined || node === false || node === true) return out;
  if (typeof node === "string" || typeof node === "number") { out.push(String(node)); return out; }
  if (Array.isArray(node)) { node.forEach((child) => flattenText(child, out)); return out; }
  if (node.__el) flattenText(node.props ? node.props.children : null, out);
  return out;
}
function collect(node, predicate, out = []) {
  if (node === null || node === undefined || node === false) return out;
  if (Array.isArray(node)) { node.forEach((child) => collect(child, predicate, out)); return out; }
  if (node.__el) {
    if (predicate(node)) out.push(node);
    collect(node.props ? node.props.children : null, predicate, out);
  }
  return out;
}
const byAttr = (value) => (node) => node.props && node.props["data-mo"] === value;
function parentOf(node, predicate, current = null) {
  if (node === null || node === undefined || node === false) return undefined;
  if (Array.isArray(node)) {
    for (const child of node) { const hit = parentOf(child, predicate, current); if (hit !== undefined) return hit; }
    return undefined;
  }
  if (!node.__el) return undefined;
  if (predicate(node)) return current;
  const children = node.props ? node.props.children : null;
  return parentOf(children, predicate, node);
}

/* --------------------------- render helpers ------------------------ */
const section = () => registrations.filter((row) => row.opts.name === "settings.section").pop();
function render(overrides) {
  const props = Object.assign({ close: () => {} }, section().opts.inject(), overrides || {});
  const guarded = section().comp(props);
  return resolve(guarded.props.children, "page");
}
const tick = () => new Promise((done) => setTimeout(done, 0));

/* ------------------------------ fixtures --------------------------- */
const providerA = {
  displayName: "新疆幻城网安科技公益大模型安全网关", baseURL: "https://api.hcnsec.cn/v1", api: "openai-completions", apiKeyEnv: "HCNSEC_API_KEY",
  models: [
    { id: "DeepSeek-V4-Flash", contextWindow: 1000000, maxTokens: 384000, input: ["text", "image"], reasoningEfforts: { off: null, high: "high" } },
    { id: "glm-4.6", contextWindow: 200000, input: ["text"] }
  ]
};
const providerB = { displayName: "基元律动", baseURL: "https://tokenrhythm.studio/v1", api: "openai-completions", models: [] };

/* ------------------------------ checks ----------------------------- */
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const names = registrations.map((row) => row.opts.name).sort();
expect(registrations.length === 3, "expected 3 seat registrations, got " + names.join(","));
for (const name of ["conversation.input.model", "settings.models.footer", "settings.section"]) {
  expect(names.indexOf(name) !== -1, "seat is no longer registered: " + name);
}
/* Takeover is ON by default, and that is a REGISTRATION decision: the section entry uses
   the shipped id at a lower priority, which is what makes our component the winner for
   that cell. The shipped entry stays registered underneath. */
expect(section().opts.id === "models", "by default the section shadows the shipped id, got " + section().opts.id);
expect(section().opts.order === 10, "the shadow sits where the shipped page sits");
expect(section().opts.priority === -1, "a lower priority is what wins the cell");
expect(section().opts.label() === "模型管理页", "our label is the handle for hiding the spare nav cell, got " + String(section().opts.label()));

/* state: loading / empty / populated */
snapshot = undefined;
let tree = render();
expect(flattenText(tree).join(" ").indexOf("正在读取配置") !== -1, "loading state must render");

snapshot = { view: { writable: true, revision: 4, namespaces: [] } };
tree = render();
expect(flattenText(tree).join(" ").indexOf("还没有配置任何供应商") !== -1, "empty state must render");

const providerC = { displayName: "智谱", baseURL: "https://open.bigmodel.cn/api/paas/v4", api: "openai-completions", apiKeyEnv: "ZHIPU_API_KEY", models: [{ id: "glm-4.5", contextWindow: 128000, input: ["text"] }] };
snapshot = { view: { writable: true, revision: 4, namespaces: [{ ns: "llm-pi-ai", revision: 4, user: null, value: { providers: { hcnsec: providerA, jiyuan: providerB, zhipu: providerC } } }] } };
store.set("dsh-model-organizer.providerOrder", JSON.stringify(["hcnsec", "jiyuan", "zhipu"]));
/* No unmount simulation here: running the collected effect cleanups would flip the
   page's own liveness flags and the directory answer would be dropped. */
tree = render();
await tick();          // the provider directory answers on a microtask
tree = render();
let text = flattenText(tree).join(" ");
expect(text.indexOf("新疆幻城") !== -1, "provider rail must list the provider");
/* The capacities ride the row's own chip line now; the dialog below is where they are
   edited. Nothing inline spells them any more. */
const modelRowText = collect(tree, byAttr("page-model")).map((row) => flattenText(row).join(" "));
expect(modelRowText.some((line) => line.indexOf("1M") !== -1 && line.indexOf("↑384K") !== -1 && line.indexOf("图片") !== -1),
  "the first model row must spell context, max tokens and vision, got " + JSON.stringify(modelRowText));
expect(modelRowText.some((line) => line.indexOf("200K") !== -1), "the second model row must spell its context window");
expect(text.indexOf("Chat Completions") !== -1, "protocol must be spelled");
expect(text.indexOf("已配置") !== -1, "key status must render after describe resolves");

/* drag affordances: rail rows carry the HTML5 drag handlers, and the list keeps the
   shipped grab-cursor class the panel already relies on. */
const railRows = collect(tree, byAttr("page-provider"));
const officialRows = railRows.filter((row) => row.props["data-mo-official"] === "true");
const editableRows = railRows.filter((row) => row.props["data-mo-official"] !== "true");
expect(editableRows.length === 3, "rail must render one editable row per provider, got " + editableRows.length);
expect(officialRows.length === 1, "the built-in route must render as a read-only rail row, got " + officialRows.length);

/* Built-in routes are read-only: no input anywhere inside, not draggable, and a click
   hands the Models row back to the shipped page instead of pretending to edit it. */
const officialRow = officialRows[0];
expect(officialRow.props["data-mo-id"] === "deepseek-official",
  "the read-only row must carry its route id, got " + String(officialRow.props["data-mo-id"]));
expect(officialRow.props.role === "button", "the read-only row must still be a button");
expect(collect(officialRow, (node) => node.type === "input").length === 0,
  "the read-only row must not hold an input");
expect(officialRow.props.draggable !== true && typeof officialRow.props.onDragStart !== "function",
  "a built-in route must not be draggable: its order is the shipped one");
expect(String(officialRow.props.title).indexOf("官方模型页") !== -1, "the read-only row must say where it is edited");
const takeoverCalls = [];
const officialTree = render({ setTakeover: function (on) { takeoverCalls.push(on); } });
const clickedOfficial = collect(officialTree, (node) => node.props && node.props["data-mo"] === "page-provider" && node.props["data-mo-official"] === "true")[0];
expect(clickedOfficial !== undefined, "the read-only row must survive a render");
clickedOfficial.props.onClick();
expect(takeoverCalls.length === 1 && takeoverCalls[0] === false,
  "clicking a built-in route must hand the row back (setTakeover(false)), got " + JSON.stringify(takeoverCalls));
expect(collect(clickedOfficial, byAttr("page-provider-dot")).length === 0,
  "a read-only row keeps the shipped dot, not the plugin's enable dot");

const draggableRows = editableRows.filter((row) => row.props.draggable === true);
expect(draggableRows.length === 3, "every editable rail row must be draggable");
/* The regression that mattered: an inline cursor/background on a row beats the shipped
   :hover and the .dsh-mo-list .dsh-mo-head grab rule, so the panel's pointer feedback
   disappears. With a resolved sheet the rows must carry NO inline style at all. */
const inlineStyled = editableRows.filter((row) => row.props.style !== undefined);
expect(inlineStyled.length === 1, "only the current row may carry an inline marker (box-shadow), got " + inlineStyled.length);
expect(inlineStyled.every((row) => row.props.style.background === undefined && row.props.style.cursor === undefined),
  "row markers must not set an inline background or cursor");
expect(railRows.every((row) => typeof row.props.className === "string" && row.props.className.indexOf("dsh-mo-head") !== -1 && row.props.className.indexOf(SHEET_PREFIX + "_cell") !== -1),
  "rail rows must keep the shipped cell class together with dsh-mo-head");
expect(flattenText(tree).join(" ").indexOf("自定义供应商") !== -1, "hand-declared routes must group under 自定义供应商");
expect(flattenText(tree).join(" ").indexOf("官方目录") !== -1, "catalog routes must group under 官方目录");
expect(flattenText(tree).join(" ").indexOf("官方（内置）" ) !== -1, "built-in routes must group under 官方（内置）");
const railHandlers = editableRows.every((row) => typeof row.props.onDragStart === "function" && typeof row.props.onDrop === "function" && typeof row.props.onDragOver === "function");
expect(railHandlers, "editable rail rows must wire drag start/over/drop");
const grabLists = collect(tree, (node) => typeof node.props.className === "string" && node.props.className.split(/\s+/).indexOf("dsh-mo-list") !== -1);
expect(grabLists.length >= 2, "drag lists must keep the exact dsh-mo-list class (grab cursor / hover suppression), got " + grabLists.length);
/* A model row is ONE line now: the ROW is the drag surface (no inline grip) and it opens
   the details dialog. The inline editor and its footer Save are gone for good. */
expect(collect(tree, byAttr("page-model-handle")).length === 0, "the inline drag grip must be gone");
expect(collect(tree, byAttr("page-models-save")).length === 0, "the page footer must no longer carry a Save button");
for (const marker of ["page-model-id", "page-model-context", "page-model-max", "page-model-vision", "page-model-switch", "page-model-name"]) {
  expect(collect(tree, byAttr(marker)).length === 0, "the inline field must be gone: " + marker);
}
const modelRows = collect(tree, byAttr("page-model"));
expect(modelRows.length === 2, "one row per model — no inline editor and no duplicated list, got " + modelRows.length);
expect(modelRows.every((row) => row.props.role === "button" && row.props.draggable === true),
  "each model row must be a clickable, draggable button");
expect(modelRows.every((row) => typeof row.props.className === "string" && row.props.className.indexOf("dsh-mo-head") !== -1 && row.props.className.indexOf(SHEET_PREFIX + "_cell") !== -1),
  "model rows must keep the shipped cell class together with dsh-mo-head");
expect(modelRows.every((row) => row.props.style === undefined), "an enabled model row must not inline a background that would beat the hover rule");
expect(modelRows.every((row) => typeof row.props.onDragStart === "function" && typeof row.props.onDrop === "function" && typeof row.props.onDragOver === "function"),
  "each model row must wire drag start/over/drop");
expect(modelRows.every((row) => Array.isArray(row.props.children) && row.props.children.length === 3),
  "each model row must be one line: dot, name, chips");
expect(modelRows.every((row) => collect(row, (node) => node.type === "input").length === 0),
  "no input may live inside a model row");
const rowDots = collect(tree, byAttr("page-model-dot"));
expect(rowDots.length === 2 && rowDots.every((dot) => dot.props["data-mo-on"] === "true"),
  "each model row needs its enable dot, on by default, got " + JSON.stringify(rowDots.map((dot) => dot.props["data-mo-on"])));
const baseField = parentOf(tree, byAttr("page-base-url"));
expect(baseField !== undefined && baseField.props.style.flexDirection === "column", "detail fields must stack label above control");
const injected = fakeDocument.head.children.map((node) => node.textContent || "").join("\n");
expect(injected.indexOf(".dsh-mo-pagerow{display:flex;flex-direction:column;") !== -1, "the page-row class must carry the row layout");
for (const rule of [".dsh-mo-list .dsh-mo-head{cursor:grab;}", ".dsh-mo-pagerow:hover{", ".dsh-mo-head:hover{"]) {
  expect(injected.indexOf(rule) !== -1, "the injected sheet must keep " + rule);
}

/* the switches: plugin-only visibility, stored next to the provider order */
const editableRailRows = () => collect(tree, byAttr("page-provider")).filter((row) => row.props["data-mo-official"] !== "true");
let providerSwitch = collect(tree, byAttr("page-provider-switch"))[0];
expect(providerSwitch !== undefined && providerSwitch.props.role === "switch", "the route header needs a switch");
expect(providerSwitch.props["aria-checked"] === "true", "a route starts enabled");
expect(String(providerSwitch.props.title).indexOf("DSH 配置原样保留") !== -1, "the switch must state that the config is untouched: " + String(providerSwitch.props.title));
/* The editable row's dot IS the plugin's enable state now (it used to mean "configured"). */
expect(editableRailRows().every((row) => {
  const dot = collect(row, byAttr("page-provider-dot"))[0];
  return dot !== undefined && dot.props["data-mo-on"] === "true";
}), "an enabled route's dot must carry data-mo-on=true");
providerSwitch.props.onClick({ stopPropagation: function () {} });
tree = render();
providerSwitch = collect(tree, byAttr("page-provider-switch"))[0];
expect(providerSwitch.props["aria-checked"] === "false", "clicking must turn the route off");
expect(JSON.parse(store.get("dsh-model-organizer.hiddenProviders") || "{}").hcnsec === true, "the off route must persist in the plugin's own store");
expect(editableRailRows().some((row) => row.props.style && row.props.style.opacity === 0.5), "a disabled route must be dimmed in the rail");
expect(editableRailRows().some((row) => {
  const dot = collect(row, byAttr("page-provider-dot"))[0];
  return dot !== undefined && dot.props["data-mo-on"] === "false";
}), "the disabled route's dot must flip to data-mo-on=false");
providerSwitch.props.onClick({ stopPropagation: function () {} });
tree = render();
expect(JSON.parse(store.get("dsh-model-organizer.hiddenProviders") || "{}").hcnsec === undefined, "clicking again must clear the route flag");
expect(editableRailRows().every((row) => row.props.style === undefined || row.props.style.opacity === undefined), "the rail must undim");

/* A click on a model row opens the details dialog (portaled to body, so it rides the
   same resolved tree the harness walks). Every field lives there now. */
const modelRow = collect(tree, byAttr("page-model")).filter((row) => row.props["data-mo-id"] === "DeepSeek-V4-Flash")[0];
expect(modelRow !== undefined, "the model row must be clickable");
modelRow.props.onClick();
tree = render();
const dialogNodes = [];
collect(tree, (node) => node.props && typeof node.props["data-mo"] === "string" && node.props["data-mo"].indexOf("model-dialog") === 0, dialogNodes);
const dialogMarkers = dialogNodes.map((node) => node.props["data-mo"]);
expect(dialogMarkers[0] === "model-dialog" && dialogMarkers[1] === "model-dialog-card",
  "the dialog container must wrap its card, got " + dialogMarkers.slice(0, 3).join(","));
for (const marker of ["model-dialog", "model-dialog-card", "model-dialog-close", "model-dialog-id", "model-dialog-name",
  "model-dialog-context", "model-dialog-max", "model-dialog-text", "model-dialog-image", "model-dialog-reasoning-option",
  "model-dialog-level", "model-dialog-level-value", "model-dialog-level-add", "model-dialog-level-remove",
  "model-dialog-switch", "model-dialog-delete", "model-dialog-cancel", "model-dialog-save"]) {
  expect(dialogMarkers.indexOf(marker) !== -1, "the details dialog must render " + marker);
}
expect(dialogMarkers.filter((marker) => marker === "model-dialog-reasoning-option").length === 3,
  "the reasoning control must offer exactly three modes");
expect(collect(tree, byAttr("model-dialog-reasoning-option")).map((node) => node.props["data-mo-id"]).join(",") === "inherit,none,custom",
  "the reasoning options must be inherit, none, custom");
expect(collect(tree, byAttr("model-dialog-id"))[0].props.value === "DeepSeek-V4-Flash", "the dialog must load the row's id");
expect(collect(tree, byAttr("model-dialog-name"))[0].props.value === "", "an unnamed model must open with an empty display name");
expect(collect(tree, byAttr("model-dialog-context"))[0].props.value === "1M", "the dialog must spell the context window");
expect(collect(tree, byAttr("model-dialog-max"))[0].props.value === "384K", "the dialog must spell the max tokens");
expect(collect(tree, byAttr("model-dialog-id"))[0].props.style.boxSizing === "border-box", "the dialog's controls must use border-box");
const textBox = collect(tree, byAttr("model-dialog-text"))[0];
expect(textBox.props.type === "checkbox" && textBox.props.checked === true && textBox.props.disabled === true,
  "text input is always on and read-only in the dialog");
expect(collect(tree, byAttr("model-dialog-image"))[0].props.checked === true, "the vision checkbox must reflect the stored capabilities");
expect(collect(tree, byAttr("model-dialog-switch"))[0].props["data-mo-id"] === "DeepSeek-V4-Flash", "the dialog's enable switch belongs to its row");
expect(collect(tree, byAttr("model-dialog-delete")).length === 1, "editing an existing model offers delete");

/* The dialog's own enable switch rides the plugin's hidden list; the row dot follows. */
collect(tree, byAttr("model-dialog-switch"))[0].props.onClick({ stopPropagation: function () {} });
tree = render();
expect(JSON.parse(store.get("dsh-model-organizer.hiddenModels") || "{}")["hcnsec/DeepSeek-V4-Flash"] === true, "the off model must persist under provider/id");
expect(collect(tree, byAttr("page-model")).filter((row) => row.props["data-mo-id"] === "DeepSeek-V4-Flash").every((row) => row.props.style && row.props.style.opacity === 0.5),
  "a disabled model must be dimmed");
expect(collect(tree, byAttr("page-model-dot")).filter((dot) => dot.props["data-mo-on"] === "false").length === 1,
  "the disabled model's dot must flip to data-mo-on=false");
collect(tree, byAttr("model-dialog-switch"))[0].props.onClick({ stopPropagation: function () {} });
tree = render();
expect(JSON.parse(store.get("dsh-model-organizer.hiddenModels") || "{}")["hcnsec/DeepSeek-V4-Flash"] === undefined, "clicking again must clear the model flag");
expect(collect(tree, byAttr("page-model")).every((row) => row.props.style === undefined), "clicking again must undim the row");
expect(collect(tree, byAttr("model-dialog")).length === 1, "the dialog stays open while its switch is toggled");

/* 取消 changes nothing */
const beforeCancel = mutations.length;
collect(tree, byAttr("model-dialog-cancel"))[0].props.onClick();
tree = render();
expect(collect(tree, byAttr("model-dialog")).length === 0, "取消 must close the details dialog");
expect(mutations.length === beforeCancel, "取消 must not write");

/* Add model opens the (empty) details dialog in its new-model mode; Save is ONE mutate
   straight to the store — there is no page-level draft and no footer Save any more. */
await tick();
let addButton = collect(tree, byAttr("page-model-add"))[0];
expect(addButton !== undefined, "Add model button must exist");
addButton.props.onClick();
tree = render();
expect(collect(tree, byAttr("model-dialog")).length === 1, "Add model must open the details dialog");
expect(flattenText(collect(tree, byAttr("model-dialog-card"))[0]).join(" ").indexOf("添加模型") !== -1,
  "the new-model dialog must carry its own title");
expect(collect(tree, byAttr("model-dialog-id"))[0].props.value === "", "the new-model dialog must start empty");
expect(collect(tree, byAttr("model-dialog-delete")).length === 0, "a model that does not exist yet must not offer delete");

/* an empty id is refused on the dialog before any write */
const beforeEmpty = mutations.length;
collect(tree, byAttr("model-dialog-save"))[0].props.onClick();
await tick();
tree = render();
expect(mutations.length === beforeEmpty, "an empty model id must not reach the host");
expect(collect(tree, byAttr("model-dialog")).length === 1, "the refusal must keep the dialog open");
expect(flattenText(collect(tree, byAttr("model-dialog-error"))[0]).join(" ").indexOf("模型 ID 不能为空") !== -1,
  "the refusal must be explained on the dialog");

/* fill it in: id, display name, capacities, vision, and a custom reasoning level list */
collect(tree, byAttr("model-dialog-id"))[0].props.onChange({ target: { value: "brand-new" } });
tree = render();
collect(tree, byAttr("model-dialog-name"))[0].props.onChange({ target: { value: "全新模型" } });
tree = render();
collect(tree, byAttr("model-dialog-context"))[0].props.onChange({ target: { value: "64K" } });
tree = render();
collect(tree, byAttr("model-dialog-max"))[0].props.onChange({ target: { value: "8K" } });
tree = render();
collect(tree, byAttr("model-dialog-image"))[0].props.onChange({ target: { checked: true } });
tree = render();
expect(collect(tree, byAttr("model-dialog-name"))[0].props.value === "全新模型", "typing must reach the dialog row");
collect(tree, byAttr("model-dialog-reasoning-option")).filter((node) => node.props["data-mo-id"] === "custom")[0].props.onClick();
tree = render();
expect(collect(tree, byAttr("model-dialog-level")).length === 0, "a fresh custom mode starts with no level");
collect(tree, byAttr("model-dialog-level-add"))[0].props.onClick();
tree = render();
collect(tree, byAttr("model-dialog-level"))[0].props.onChange({ target: { value: "high" } });
tree = render();
collect(tree, byAttr("model-dialog-level-value"))[0].props.onChange({ target: { value: "high" } });
tree = render();

const beforeSave = mutations.length;
collect(tree, byAttr("model-dialog-save"))[0].props.onClick();
await tick();
tree = render();
const modelWrites = mutations.slice(beforeSave);
expect(modelWrites.length === 1, "Save must issue exactly ONE mutate, got " + modelWrites.length);
const modelWrite = modelWrites[0];
expect(modelWrite !== undefined, "Save model must write providers.<route>.models");
if (modelWrite) {
  expect(modelWrite.ns === "llm-pi-ai", "writes must target the llm-pi-ai namespace, got " + modelWrite.ns);
  expect(modelWrite.ops.length === 1 && modelWrite.ops[0].op === "set" && modelWrite.ops[0].path.join("/") === "providers/hcnsec/models",
    "the single op must set providers.<route>.models, got " + JSON.stringify(modelWrite.ops));
  const written = modelWrite.ops[0].value;
  expect(written.length === 3 && written[2].id === "brand-new", "the written array must carry the new model");
  expect(written[2].name === "全新模型", "the dialog's display name must be written, got " + JSON.stringify(written[2]));
  expect(written[2].input.join(",") === "text,image", "the vision checkbox must write image input");
  expect(written[2].contextWindow === 64000 && written[2].maxTokens === 8000, "the capacities must be parsed: " + JSON.stringify(written[2]));
  expect(JSON.stringify(written[2].reasoningEfforts) === JSON.stringify({ high: "high" }),
    "the custom level must be written: " + JSON.stringify(written[2].reasoningEfforts));
}
expect(collect(tree, byAttr("model-dialog")).length === 0, "a successful save must close the dialog");

/* "Fetch models" opens the picker; adopting is a WRITE, not a draft — the picked rows
   join the config immediately through the same single mutate. */
tree = render();
expect(collect(tree, byAttr("page-model-name")).length === 0, "the model row must not keep a separate name input");
const fetchButton = collect(tree, byAttr("page-models-fetch"))[0];
expect(fetchButton !== undefined, "the model list header needs a fetch action");
const modelIds = () => collect(tree, byAttr("page-model")).map((row) => row.props["data-mo-id"]);
const idsBeforeFetch = modelIds().join("|");
const writesBeforeFetch = mutations.length;
fetchButton.props.onClick();
await tick();
tree = render();
expect(collect(tree, byAttr("fetch-dialog")).length === 1, "fetch must open the picker dialog");
const dialogCard = collect(tree, (node) => node.props && node.props.role === "dialog")[0];
expect(dialogCard !== undefined, "the picker must render a dialog card");
expect(String(dialogCard.props.style.backdropFilter).indexOf("--dsw-menu-backdrop-filter") !== -1,
  "the dialog card must carry the panel's backdrop blur (frost), got " + String(dialogCard.props.style.backdropFilter));
expect(String(dialogCard.props.style.background).indexOf("color-mix") !== -1,
  "the dialog background must be mixed toward transparent, otherwise the token alone reads see-through");
let items = collect(tree, byAttr("fetch-item"));
expect(items.length === 1 && items[0].props["data-mo-id"] === "brand-new-from-host",
  "only models the list lacks are offered, got [" + items.map((item) => item.props["data-mo-id"]).join(",") + "]");
const boxOf = (item) => (Array.isArray(item.props.children) ? item.props.children[0] : item.props.children);
expect(boxOf(items[0]).props.checked === true, "candidates start checked");
expect(modelIds().join("|") === idsBeforeFetch && mutations.length === writesBeforeFetch, "opening the picker must not touch the list");
expect(flattenText(tree).join(" ").indexOf("选择要添加的模型") !== -1, "the dialog keeps the shipped wording");
expect(discovered.length === 1 && discovered[0].ns === "llm-pi-ai" && discovered[0].request.provider === "hcnsec"
  && discovered[0].request.baseURL === "https://api.hcnsec.cn/v1",
  "fetch must ask the host for the selected route: " + JSON.stringify(discovered[0] || null));

/* search filters the candidate list */
collect(tree, byAttr("fetch-search"))[0].props.onChange({ target: { value: "zzz" } });
tree = render();
expect(collect(tree, byAttr("fetch-item")).length === 0, "the search must filter the candidates");
expect(flattenText(tree).join(" ").indexOf("没有匹配的模型") !== -1, "an empty result must explain itself");
collect(tree, byAttr("fetch-search"))[0].props.onChange({ target: { value: "" } });
tree = render();
expect(collect(tree, byAttr("fetch-item")).length === 1, "clearing the search must restore the candidates");

/* 取消 changes nothing */
boxOf(collect(tree, byAttr("fetch-item"))[0]).props.onChange({ target: { checked: false } });
tree = render();
expect(boxOf(collect(tree, byAttr("fetch-item"))[0]).props.checked === false, "unchecking must stick");
collect(tree, byAttr("fetch-cancel"))[0].props.onClick();
tree = render();
expect(collect(tree, byAttr("fetch-dialog")).length === 0, "取消 must close the picker");
expect(modelIds().join("|") === idsBeforeFetch && mutations.length === writesBeforeFetch, "取消 must not write");

/* an unchecked candidate is never adopted */
collect(tree, byAttr("page-models-fetch"))[0].props.onClick();
await tick();
tree = render();
boxOf(collect(tree, byAttr("fetch-item"))[0]).props.onChange({ target: { checked: false } });
tree = render();
const writesBeforeAdopt = mutations.length;
collect(tree, byAttr("fetch-adopt"))[0].props.onClick();
await tick();
tree = render();
expect(mutations.length === writesBeforeAdopt, "an unchecked candidate must not be adopted");
expect(collect(tree, byAttr("fetch-dialog")).length === 0, "添加所选 must close the picker even when nothing is picked");

/* 添加所选 writes exactly the checked rows through ONE mutate */
collect(tree, byAttr("page-models-fetch"))[0].props.onClick();
await tick();
tree = render();
const writesBeforeAdopt2 = mutations.length;
collect(tree, byAttr("fetch-adopt"))[0].props.onClick();
await tick();
tree = render();
const adoptWrites = mutations.slice(writesBeforeAdopt2);
expect(adoptWrites.length === 1, "adopting must issue exactly ONE mutate, got " + adoptWrites.length);
if (adoptWrites.length === 1) {
  const adoptedOp = adoptWrites[0].ops[0];
  expect(adoptedOp.op === "set" && adoptedOp.path.join("/") === "providers/hcnsec/models",
    "the adopt write must set providers/<route>/models, got " + JSON.stringify(adoptWrites[0].ops));
  const adopted = adoptedOp.value;
  expect(adopted.some((model) => model.id === "brand-new-from-host"), "添加所选 must append the checked model");
  expect(adopted.filter((model) => model.id === "DeepSeek-V4-Flash").length === 1, "an already-listed model must not be duplicated");
  const incoming = adopted.filter((model) => model.id === "brand-new-from-host")[0];
  expect(incoming.contextWindow === 128000, "the discovered context window must be written: " + JSON.stringify(incoming));
  expect(Array.isArray(incoming.input) && incoming.input.indexOf("image") !== -1, "the discovered vision capability must be written");
}
expect(collect(tree, byAttr("fetch-dialog")).length === 0, "添加所选 must close the picker");

/* an empty id is still refused before any write — now on the dialog, and 取消 leaves the
   list exactly as it was. */
tree = render();
collect(tree, byAttr("page-model-add"))[0].props.onClick();
tree = render();
const before = mutations.length;
collect(tree, byAttr("model-dialog-save"))[0].props.onClick();
await tick();
tree = render();
expect(mutations.length === before, "an empty model id must not reach the host");
expect(flattenText(tree).join(" ").indexOf("模型 ID 不能为空") !== -1, "the refusal must be explained on the dialog");
expect(collect(tree, byAttr("model-dialog-error")).length === 1, "the dialog must show the error slot");
collect(tree, byAttr("model-dialog-cancel"))[0].props.onClick();
tree = render();
expect(collect(tree, byAttr("model-dialog")).length === 0 && mutations.length === before, "取消 must close the refused dialog without a write");

/* provider fields write their own paths */
tree = render();
const baseInput = collect(tree, byAttr("page-base-url"))[0];
baseInput.props.onChange({ target: { value: "https://api.example.com/v1" } });
tree = render();
collect(tree, byAttr("page-base-url"))[0].props.onBlur();
await tick();
expect(mutations.some((row) => row.ops[0].op === "set" && row.ops[0].path.join("/") === "providers/hcnsec/baseURL" && row.ops[0].value === "https://api.example.com/v1"),
  "Base URL must write providers.<route>.baseURL");

tree = render();
const apiOptions = collect(tree, byAttr("page-api-option"));
expect(apiOptions.length === 3, "the protocol control must offer the adapter's three protocols, got " + apiOptions.length);
expect(collect(tree, (node) => node.props && node.props["data-mo"] === "page-api" && node.type === "select").length === 0,
  "the protocol control must not be a native select — the platform paints that popup white-on-white in this theme");
expect(apiOptions.filter((node) => node.props["aria-checked"] === "true").length === 1, "exactly one protocol may be marked as current");
apiOptions.filter((node) => node.props["data-mo-id"] === "anthropic-messages")[0].props.onClick();
await tick();
expect(mutations.some((row) => row.ops[0].path.join("/") === "providers/hcnsec/api" && row.ops[0].value === "anthropic-messages"),
  "protocol must write providers.<route>.api");
/* width:100% plus padding and border overflowed the settings column (the screenshot's
   first red box) — every sized control must opt into border-box. */
const sizedControls = ["page-base-url", "page-api-key"].map((marker) => collect(tree, byAttr(marker))[0]).concat(apiOptions);
expect(sizedControls.every((node) => node !== undefined && node.props.style.boxSizing === "border-box"),
  "every sized control must use border-box, otherwise padding pushes it past its column");

/* the key goes to the credentials service only */
tree = render();
collect(tree, byAttr("page-api-key"))[0].props.onChange({ target: { value: "sk-test-value" } });
tree = render();
collect(tree, byAttr("page-key-save"))[0].props.onClick();
await tick();
expect(credentialWrites.length === 1 && credentialWrites[0].ref === "HCNSEC_API_KEY" && credentialWrites[0].value === "sk-test-value",
  "Save key must call credentials.set with the derived reference");

/* The switch semantics, pinned directly: this harness does not render the composer
   menu, so the pure filter the menu uses is exercised instead. */
const pickerFilter = plugin.__test && plugin.__test.visibleGroupsFor;
expect(typeof pickerFilter === "function", "the plugin must expose the picker filter for this check");
const groupsFixture = [
  { id: "hcnsec", models: [{ id: "a" }, { id: "b" }] },
  { id: "jiyuan", models: [{ id: "c" }] }
];
const afterSwitch = pickerFilter(groupsFixture, { provider: "hcnsec", id: "a" }, { providers: { jiyuan: true }, models: { "hcnsec/b": true } });
expect(afterSwitch.length === 1 && afterSwitch[0].id === "hcnsec", "a disabled route must leave the picker");
expect(afterSwitch[0].models.length === 1 && afterSwitch[0].models[0].id === "a", "a disabled model must leave the picker");
const keepsCurrent = pickerFilter(groupsFixture, { provider: "jiyuan", id: "c" }, { providers: { jiyuan: true }, models: {} });
expect(keepsCurrent.some((group) => group.id === "jiyuan" && group.models.some((model) => model.id === "c")),
  "the active model must never disappear underneath the selection, got [" + keepsCurrent.map((group) => group.id).join(",") + "]");
const allHidden = pickerFilter(groupsFixture, null, { providers: { hcnsec: true, jiyuan: true }, models: {} });
expect(allHidden.length === 2, "an all-disabled picker must fall back to the full list, never render empty");

/* the dashed add-provider affordance and its dialog */
tree = render();
const addProviderButton = collect(tree, byAttr("page-provider-add"))[0];
expect(addProviderButton !== undefined, "the rail needs the add-provider affordance");
expect(addProviderButton.props.style.borderStyle === "dashed", "the add affordance must be a dashed box, like the shipped page");
expect(flattenText(addProviderButton).join(" ").indexOf("添加模型提供商") !== -1, "the affordance must be labelled");
const opsBefore = mutations.length;
addProviderButton.props.onClick();
tree = render();
expect(collect(tree, byAttr("add-dialog")).length === 1, "clicking must open the create dialog");
collect(tree, byAttr("add-submit"))[0].props.onClick();
await tick();
tree = render();
expect(mutations.length === opsBefore, "an empty route must not reach the host");
expect(flattenText(tree).join(" ").indexOf("路由 ID 不能为空") !== -1, "the refusal must be explained");
collect(tree, byAttr("add-route"))[0].props.onChange({ target: { value: "hcnsec" } });
tree = render();
collect(tree, byAttr("add-submit"))[0].props.onClick();
await tick();
tree = render();
expect(mutations.length === opsBefore, "an existing route must not be overwritten");
expect(flattenText(tree).join(" ").indexOf("该路由已存在") !== -1, "the clash must be explained");
collect(tree, byAttr("add-route"))[0].props.onChange({ target: { value: "my-gateway" } });
tree = render();
collect(tree, byAttr("add-display-name"))[0].props.onChange({ target: { value: "我的网关" } });
tree = render();
collect(tree, byAttr("add-base-url"))[0].props.onChange({ target: { value: "https://gw.example.com/v1" } });
tree = render();
collect(tree, byAttr("add-api-option")).filter((node) => node.props["data-mo-id"] === "anthropic-messages")[0].props.onClick();
tree = render();
collect(tree, byAttr("add-key"))[0].props.onChange({ target: { value: "sk-gw" } });
tree = render();
collect(tree, byAttr("add-submit"))[0].props.onClick();
await tick();
tree = render();
const created = mutations[mutations.length - 1];
expect(created !== undefined && created.ops.length === 2, "creating a route with a key must be one mutate carrying both ops");
if (created !== undefined && created.ops.length === 2) {
  expect(created.ops[0].path.join("/") === "providers/my-gateway", "the profile must be written under its own route");
  expect(created.ops[0].value.api === "anthropic-messages" && created.ops[0].value.displayName === "我的网关" && created.ops[0].value.baseURL === "https://gw.example.com/v1",
    "the profile must carry exactly what was typed: " + JSON.stringify(created.ops[0].value));
  expect(created.ops[1].path.join("/") === "providers/my-gateway/apiKeyEnv" && created.ops[1].value === "MY_GATEWAY_API_KEY",
    "the key reference must be derived from the route: " + JSON.stringify(created.ops[1]));
}
expect(credentialWrites.some((row) => row.ref === "MY_GATEWAY_API_KEY" && row.value === "sk-gw"), "the secret must go to the credentials service");
expect(collect(tree, byAttr("add-dialog")).length === 0, "a successful create must close the dialog");

/* B3: crossing to the shipped Models page happens through the settings nav, because
   the shell keeps `openSection` private and its cells carry no id — only a label. */
tree = render();
const openOfficial = collect(tree, byAttr("page-open-official"))[0];
expect(openOfficial !== undefined, "the page needs a way across to the shipped Models page");
expect(flattenText(openOfficial).join(" ").indexOf("官方模型页") !== -1, "the cross-link must be labelled");
const titleRow = parentOf(tree, byAttr("page-open-official"));
expect(titleRow !== undefined && collect(titleRow, (node) => node.type === "h2").length === 1,
  "the page cross-link must sit in the title row, left, next to 模型管理页");
expect(openOfficial.props.style.borderRadius === 999, "the page cross-link must be the compact pill, not a full-size button");
/* a stand-in for the settings nav, used by the hiding invariants below */
const navParent = {};
const decoyParent = {};
const navCell = (label, owner) => {
  const node = el("button");
  node.textContent = label;
  node.parentElement = owner;
  return node;
};
const navCells = ["账号与余额", "通用设置", "模型", "模型管理页", "内置插件", "费用"].map((label) => navCell(label, navParent));
const decoyCells = ["A", "B", "C", "D"].map((label) => navCell(label, decoyParent));
fakeDocument.querySelectorAll = (selector) => (selector === "button" ? navCells.concat(decoyCells) : []);

/* the footer panel carries the way back; it is rendered here too, because the same
   mount registers it with the same face. */
const panelSeat = registrations.filter((row) => row.opts.name === "settings.models.footer")[0];
expect(panelSeat !== undefined, "the footer seat must be registered");
const panelTree = resolve(panelSeat.comp(Object.assign({}, panelSeat.opts.inject())), "panel");
const panelLink = collect(panelTree, byAttr("panel-open-organizer"))[0];
expect(panelLink !== undefined, "the footer panel needs a way across to the organizer page");
expect(panelLink.props.style.borderRadius === 999, "the panel link must be the compact pill, not a full-size button");
expect(typeof panelLink.props.onPointerDown === "function" && typeof panelLink.props.onPointerUp === "function",
  "the panel link must isolate pointer events, otherwise it drags the panel or collapses it");
const panelHead = collect(panelTree, (node) => typeof node.props.className === "string" && node.props.className.indexOf("dsh-mo-panelhead") !== -1)[0];
expect(panelHead !== undefined, "the panel head row must be present");
expect(panelHead !== undefined && collect(panelHead, byAttr("panel-open-organizer")).length === 1, "the panel link must sit inside the head row, right of the title");
panelLink.props.onClick({ stopPropagation: function () {} });
/* Its real job (taking the shipped row over) is asserted in the takeover block below. */
expect(flattenText(panelLink).join(" ").indexOf("模型管理页") !== -1,
  "the panel cross-link must carry the page's own name, got " + flattenText(panelLink).join(" "));
expect(typeof panelLink.props.onClick === "function", "the panel button must be wired");


/* Navigation IS the state now: the shipped page's panel button takes the Models row over,
   and this page's own button hands it back. No separate switch, and the replacement itself
   is a registration swap (see DEVELOPMENT.md, B2). */
tree = render();
expect(collect(tree, byAttr("page-takeover")).length === 0, "there must be no separate takeover switch");
expect(collect(tree, byAttr("page-open-official")).length === 1, "this page keeps exactly one button across");
const ownNavCell = () => navCells.filter((cell) => cell.textContent === "模型管理页")[0];
const shippedNavCell = () => navCells.filter((cell) => cell.textContent === "模型")[0];
/* taking the cell over: the very same registration, only its priority changes */
collect(panelTree, byAttr("panel-open-organizer"))[0].props.onClick({ stopPropagation: function () {} });
await tick();
tree = render();
let row = registrations.filter((entry) => entry.opts.name === "settings.section").pop();
expect(row.opts.id === "models" && row.opts.order === 10 && row.opts.priority === -1,
  "taking the row over must win the cell, got " + row.opts.id + "/" + row.opts.priority);
expect(store.get("dsh-model-organizer.takeover.v2") === undefined,
  "the takeover must NOT be persisted: every activation starts on this page");
ownNavCell().style.display = "";
observers.forEach((observer) => observer.cb());
expect(ownNavCell().style.display === "none", "our spare cell must be hidden — the menu shows one row only");
expect(shippedNavCell().style.display !== "none", "the visible row is the shipped cell: clicking it opens this page");
/* handing it back: only the priority moves, the menu must look identical */
collect(tree, byAttr("page-open-official"))[0].props.onClick();
await tick();
tree = render();
row = registrations.filter((entry) => entry.opts.name === "settings.section").pop();
expect(row.opts.id === "models" && row.opts.priority > 0,
  "handing the row back must only LOSE the cell, got " + row.opts.id + "/" + row.opts.priority);
expect(store.get("dsh-model-organizer.takeover.v2") === undefined, "handing back must not be persisted either");
expect(ownNavCell().style.display === "none", "the menu must look the same in both states: our cell stays hidden");
expect(shippedNavCell().style.display !== "none", "the shipped row must never be hidden");
/* React may reuse a node we hid for the shipped row (both rows carry the same key): the
   repair must notice the label changed and put it back — otherwise the shipped row stays
   invisible, which is the bug a screenshot caught. */
const reused = ownNavCell();
const freshOwn = navCell("模型管理页", navParent);
navCells.push(freshOwn);
reused.textContent = "模型";
observers.forEach((observer) => observer.cb());
expect(navCells.filter((cell) => cell.textContent === "模型").every((cell) => cell.style.display !== "none"),
  "a node reused for the shipped row must be restored, never left hidden");
expect(freshOwn.style.display === "none", "the freshly rendered spare cell must be hidden");
/* A fresh activation must start on THIS page, however the previous run ended: the flag is
   session-scoped, which is the whole point of shipping a plugin. */
/* Closing settings hands the row back to this plugin: the hand-back lasts ONE visit, so
   the next time settings opens the page is ours again — with nothing persisted. */
fakeDocument.querySelectorAll = () => [];
const beforeClose = registrations.filter((entry) => entry.opts.name === "settings.section").length;
observers.forEach((observer) => observer.cb());
await tick();
const afterClose = registrations.filter((entry) => entry.opts.name === "settings.section").length;
expect(afterClose === beforeClose + 1,
  "closing settings must re-take the row (exactly one new registration), got +" + (afterClose - beforeClose));
const retaken = registrations.filter((entry) => entry.opts.name === "settings.section").pop();
expect(retaken.opts.priority === officialPriority - 1,
  "the re-take must win the cell again, got " + retaken.opts.priority);
observers.forEach((observer) => observer.cb());
expect(registrations.filter((entry) => entry.opts.name === "settings.section").length === afterClose,
  "a second pass while still closed must not register again");
fakeDocument.querySelectorAll = (selector) => (selector === "button" ? navCells.concat(decoyCells) : []);

/* The footer panel keeps its HEAD even when there is nothing to sort: returning null for
   0–1 providers used to take the only way back to this page with it. */
snapshot = { view: { writable: true, revision: 9, namespaces: [{ ns: "llm-pi-ai", revision: 9, value: { providers: { solo: { displayName: "独苗网关", models: [] } } } }] } };
const lonelyPanel = resolve(panelSeat.comp(Object.assign({}, panelSeat.opts.inject())), "panel");
expect(collect(lonelyPanel, byAttr("panel")).length === 1, "the footer panel must render even with fewer than 2 providers");
expect(collect(lonelyPanel, byAttr("provider-row")).length === 0, "with nothing to sort the panel must not render a list");
const lonelyHead = collect(lonelyPanel, (node) => typeof node.props.className === "string" && node.props.className.indexOf("dsh-mo-panelhead") !== -1)[0];
expect(lonelyHead !== undefined, "the < 2 providers panel must keep its head row");
expect(lonelyHead !== undefined && collect(lonelyHead, byAttr("panel-open-organizer")).length === 1,
  "the head must keep the way back to the organizer page");
expect(flattenText(lonelyPanel).join(" ").indexOf("没有顺序需要调整") !== -1,
  "the empty panel must explain why there is no list, got " + flattenText(lonelyPanel).join(" "));
const lonelyLink = collect(lonelyPanel, byAttr("panel-open-organizer"))[0];
expect(lonelyLink !== undefined && typeof lonelyLink.props.onClick === "function", "the lonely panel's link must stay wired");
snapshot = { view: { writable: true, revision: 4, namespaces: [{ ns: "llm-pi-ai", revision: 4, user: null, value: { providers: { hcnsec: providerA, jiyuan: providerB, zhipu: providerC } } }] } };

officialPriority = -5;   /* the shipped entry may sit anywhere; ours must be relative */
const restarts = [];
const restartScope = Object.assign({}, scope, {
  slots: Object.assign({}, scope.slots, {
    register(opts, comp) { restarts.push({ opts, comp }); return () => {}; }
  })
});
plugin.apply({
  effect(fn) { const dispose = fn(); return typeof dispose === "function" ? dispose : () => {}; },
  inject(names, cb) { cb(restartScope); },
  locale: ctx.locale,
  logger: { warn() {}, info() {} }
});
const restartSection = restarts.filter((entry) => entry.opts.name === "settings.section").pop();
expect(restartSection !== undefined && restartSection.opts.priority === -6,
  "a fresh activation must win the cell RELATIVE to the shipped priority (-5 - 1), got "
    + (restartSection === undefined ? "none" : restartSection.opts.priority));
officialPriority = 0;
if (failures.length > 0) {
  console.error("FAIL\n - " + failures.join("\n - "));
  process.exitCode = 1;
} else {
  console.log("smoke: 3 seats, read-only official rows, single-line model rows + details dialog, single-mutate model writes, fetch picker, add-provider, panel head with <2 providers, priority handover, settings/credential writes verified");
}