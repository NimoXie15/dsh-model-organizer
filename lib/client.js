window.__ModuleLoader__.load({
  id: "@nimoxie/dsh-model-organizer",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;

    const React = require("react");
    const ReactDOM = require("react-dom");
    const h = React.createElement;
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useMemo = React.useMemo;
    const useRef = React.useRef;
    const useLayoutEffect = React.useLayoutEffect;
    const useSyncExternalStore = React.useSyncExternalStore;

    let P = null;
    try { P = require("@deepseek-ai/dsh-client-ui-primitives"); } catch (e) { P = null; }
    /* React.forwardRef components are OBJECTS (with a .render function), not
       functions — a typeof gate on them silently fails and every consumer
       falls back. Accept both shapes. */
    function isComponent(x) {
      return typeof x === "function" || (x !== null && typeof x === "object" && typeof x.render === "function");
    }
    /* The shipped menus draw their surface (translucent fill + backdrop blur +
       radius) through this primitive; the `_menu` class only adds geometry.
       Rendering our menu through it keeps the frost identical to the shipped
       look — inlining the menu token alone paints a translucent fill with NO
       blur, which reads as "see-through" instead of "frosted". */
    const MENU_SURFACE = P !== null && isComponent(P.MenuSurface) ? P.MenuSurface : null;
    /* Shared model-search ranking — the same primitive the shipped menu uses. */
    const RANK_BY_NAME = P !== null && typeof P.rankByName === "function" ? P.rankByName : null;

    const NS = "model-organizer";
    const PI_AI_NS = "llm-pi-ai";

    /* ------------------------------ dictionaries ------------------------------ */
    const zh = {
      "composer.title": "选择模型",
      "composer.menuModel": "模型",
      "composer.searchPlaceholder": "搜索模型…",
      "composer.searchClear": "清除搜索",
      "composer.searchEmpty": "没有匹配的模型。",
      "composer.selectFailed": "选择失败：{msg}",
      "composer.effortNone": "未配置",
      "composer.none": "未选择模型",
      "composer.empty": "暂无可用模型",
      "composer.locked": "当前不可切换模型",
      "composer.count": "个模型",
      "composer.aria": "选择模型，当前 {model}",
      "composer.ariaEffort": "选择模型，当前 {model}，推理等级 {effort}",
      "composer.effort": "推理等级",
      "composer.effortDefault": "Default",
      "composer.effortEmpty": "当前模型未提供推理等级。",
      "composer.refreshing": "正在刷新模型列表…",
      "order.title": "模型顺序",
      "order.hint": "拖动 ⠿ 调整，松手即保存",
      "order.saving": "保存中…",
      "order.saved": "已保存 ✓",
      "order.unsaved": "有未保存改动",
      "order.readonly": "当前环境不可写入该设置",
      "providers.title": "供应商与模型顺序",
      "providers.hint": "点击收起/展开，长按拖拽调整",
      "providers.expand": "展开顺序面板",
      "providers.collapse": "收起顺序面板",
      "providers.saved": "已保存 ✓",
      "nav": "模型管理页",
      "page.title": "模型管理页",
      "page.subtitle": "总览已配置的供应商与它们提供的模型。",
      "page.providers": "已配置的供应商",
      "page.catalog": "官方目录",
      "page.custom": "自定义供应商",
      "page.baseUrl": "API 地址",
      "page.api": "API 格式",
      "page.apiKey": "API 密钥",
      "page.keyUnset": "未配置",
      "page.models": "模型列表",
      "page.noModels": "该供应商还没有列出任何模型。",
      "page.empty": "还没有配置任何供应商。在官方「模型」页添加后，这里会列出来。",
      "page.loading": "正在读取配置…",
      "page.readonly": "当前设置不可写（只读环境）。",
      "page.vision": "视觉",
      "page.reasoning": "推理等级",
      "page.keySet": "已配置",
      "page.keyPlaceholder": "粘贴密钥后点「保存密钥」",
      "page.keySave": "保存密钥",
      "page.keyClear": "清除",
      "page.keyUnavailable": "当前环境不提供凭据服务，密钥请在官方「模型」页设置。",
      "page.addModel": "添加模型",
      "page.save": "保存",
      "page.saving": "保存中…",
      "page.saved": "已保存 ✓",
      "page.remove": "删除这一行",
      "page.show": "显示",
      "page.hide": "隐藏",
      "page.modelId": "模型 ID",
      "page.modelName": "显示名称",
      "page.modelContext": "上下文",
      "page.modelMax": "最大输出",
      "page.modelVision": "视觉",
      "page.modelsEmptyEdit": "还没有模型，点下面的「添加模型」。",
      "page.modelIdRequired": "模型 ID 不能为空。",
      "page.modelIdDuplicate": "模型 ID 不能重复。",
      "page.capacityInvalid": "容量要写正数，可以用 K / M 后缀（如 256K、1M）。",
      "page.modelsDirty": "有未保存的模型改动",
      "page.dragHint": "按住拖动排序",
      "page.fetchModels": "获取可用模型",
      "page.fetching": "获取中…",
      "page.fetchAdded": "已把选中的模型加进草稿，记得保存。",
      "page.fetchNone": "这个路由的模型都已经在列表里了。",
      "page.fetchTitle": "选择要添加的模型",
      "page.fetchDescription": "以下是模型提供商的可用模型，勾选要添加的模型。",
      "page.fetchSearch": "搜索模型",
      "page.fetchNoMatches": "没有匹配的模型。",
      "page.fetchEmpty": "该提供商没有列出任何模型。",
      "page.selectAll": "全选",
      "page.deselectAll": "取消全选",
      "page.cancel": "取消",
      "page.adopt": "添加所选",
      "page.switchOn": "已启用（点击停用）",
      "page.switchOff": "已停用（点击启用）",
      "page.switchHint": "开关只影响本插件的模型选择菜单：停用的供应商/模型不会再出现在聊天框的模型菜单里；DSH 配置原样保留。",
      "page.addProvider": "添加模型提供商",
      "page.newTitle": "添加模型提供商",
      "page.newDescription": "新建一条 `llm-pi-ai` 路由。路由 ID 是配置里的键，创建后可继续在右栏调整并补充模型。",
      "page.route": "路由 ID",
      "page.routeHint": "字母、数字、点、下划线、连字符；创建后不建议改名。",
      "page.routeRequired": "路由 ID 不能为空。",
      "page.routeInvalid": "路由 ID 只能包含字母、数字、点、下划线和连字符。",
      "page.routeTaken": "该路由已存在，请换一个 ID。",
      "page.displayNameOptional": "显示名称（可选）",
      "page.baseUrlOptional": "API 地址（可稍后填写）",
      "page.keyOptional": "API 密钥（可留空，稍后在右栏填写）",
      "page.openOfficial": "官方模型页",
      "page.openOfficialHint": "把「模型」这一行交还官方页（菜单不会变，仍然只有「模型」一行；随时可从官方页浮窗的「模型管理页」切回来）",
      "page.switchFailed": "没找到设置导航，请在左侧直接点「模型」页。",
      "panel.openOrganizer": "模型管理页",
      "panel.openOrganizerHint": "接替「模型」这一行：点菜单里的「模型」打开的就是本页（菜单看起来不变）",
      "page.create": "创建",
      "page.working": "处理中…",
      "page.createFailed": "创建失败。",
      "page.fetchUnavailable": "当前环境不提供模型发现服务，请在官方「模型」页获取。",
      "page.note": "顺序拖一下就能改；API 地址、协议、模型改动即时保存，密钥只写入凭据库、页面读不回明文。",
      "protocol.completions": "Chat Completions (/chat/completions)",
      "protocol.responses": "Responses (/responses)",
      "protocol.messages": "Anthropic Messages (/v1/messages)",
    };
    const en = {
      "composer.title": "Select model",
      "composer.menuModel": "Model",
      "composer.searchPlaceholder": "Search models…",
      "composer.searchClear": "Clear search",
      "composer.searchEmpty": "No matching models.",
      "composer.selectFailed": "Selection failed: {msg}",
      "composer.effortNone": "Not configured",
      "composer.none": "No model",
      "composer.empty": "No models available",
      "composer.locked": "Model switching unavailable",
      "composer.count": "models",
      "composer.aria": "Select model, currently {model}",
      "composer.ariaEffort": "Select model, currently {model}, reasoning effort {effort}",
      "composer.effort": "Effort",
      "composer.effortDefault": "Default",
      "composer.effortEmpty": "This model provides no reasoning effort levels.",
      "composer.refreshing": "Refreshing model list…",
      "order.title": "Model order",
      "order.hint": "Drag ⠿ to reorder, then save",
      "order.saving": "Saving…",
      "order.saved": "Saved ✓",
      "order.unsaved": "Unsaved changes",
      "order.readonly": "This settings document is read-only here",
      "providers.title": "Provider and model order",
      "providers.hint": "Click to collapse/expand, press and drag to reorder",
      "providers.expand": "Expand the order panel",
      "providers.collapse": "Collapse the order panel",
      "providers.saved": "Saved ✓",
      "nav": "Model manager",
      "page.title": "Model manager",
      "page.subtitle": "An overview of the configured providers and the models they serve.",
      "page.providers": "Configured providers",
      "page.catalog": "Catalog providers",
      "page.custom": "Custom providers",
      "page.baseUrl": "Base URL",
      "page.api": "API format",
      "page.apiKey": "API key",
      "page.keyUnset": "Not configured",
      "page.models": "Models",
      "page.noModels": "This provider lists no models yet.",
      "page.empty": "No providers are configured yet. Add one on the official Models page and it shows up here.",
      "page.loading": "Reading configuration…",
      "page.readonly": "This settings document is read-only here.",
      "page.vision": "vision",
      "page.reasoning": "reasoning",
      "page.keySet": "Configured",
      "page.keyPlaceholder": "Paste the key, then Save key",
      "page.keySave": "Save key",
      "page.keyClear": "Clear",
      "page.keyUnavailable": "No credential service in this build; set the key on the official Models page.",
      "page.addModel": "Add model",
      "page.save": "Save",
      "page.saving": "Saving…",
      "page.saved": "Saved ✓",
      "page.remove": "Remove this row",
      "page.show": "Show",
      "page.hide": "Hide",
      "page.modelId": "Model ID",
      "page.modelName": "Display name",
      "page.modelContext": "Context",
      "page.modelMax": "Max output",
      "page.modelVision": "vision",
      "page.modelsEmptyEdit": "No models yet — use Add model below.",
      "page.modelIdRequired": "A model ID cannot be empty.",
      "page.modelIdDuplicate": "Model IDs must be unique.",
      "page.capacityInvalid": "Capacities must be positive numbers, optionally with a K or M suffix.",
      "page.modelsDirty": "Unsaved model changes",
      "page.dragHint": "Drag to reorder",
      "page.fetchModels": "Fetch models",
      "page.fetching": "Fetching…",
      "page.fetchAdded": "The selected models were added to the draft — save to apply.",
      "page.fetchNone": "Every listed model is already in this route.",
      "page.fetchTitle": "Choose models to add",
      "page.fetchDescription": "These are the models this provider lists. Pick the ones to add.",
      "page.fetchSearch": "Search models",
      "page.fetchNoMatches": "No matching models.",
      "page.fetchEmpty": "This provider listed no models.",
      "page.selectAll": "Select all",
      "page.deselectAll": "Deselect all",
      "page.cancel": "Cancel",
      "page.adopt": "Add selected",
      "page.switchOn": "Enabled (click to disable)",
      "page.switchOff": "Disabled (click to enable)",
      "page.switchHint": "These switches only affect this plugin's pickers: a disabled route or model stops appearing in the composer's model menu. The DSH config is left untouched.",
      "page.addProvider": "Add model provider",
      "page.newTitle": "Add model provider",
      "page.newDescription": "Create a new `llm-pi-ai` route. The route ID is the config key; you can adjust it and add models on the right afterwards.",
      "page.route": "Route ID",
      "page.routeHint": "Letters, digits, dot, underscore, hyphen; renaming later is not recommended.",
      "page.routeRequired": "The route ID cannot be empty.",
      "page.routeInvalid": "A route ID may only contain letters, digits, dot, underscore and hyphen.",
      "page.routeTaken": "That route already exists — pick another ID.",
      "page.displayNameOptional": "Display name (optional)",
      "page.baseUrlOptional": "Base URL (can be filled in later)",
      "page.keyOptional": "API key (leave empty, fill it on the right later)",
      "page.openOfficial": "Official Models page",
      "page.openOfficialHint": "Hand the Models row back to the shipped page (the menu does not change; switch back any time from the panel)",
      "page.switchFailed": "The settings nav was not found — pick the Models page on the left.",
      "panel.openOrganizer": "Model manager",
      "panel.openOrganizerHint": "Take the Models row over: the menu entry opens this page instead (the menu itself does not change)",
      "page.create": "Create",
      "page.working": "Working…",
      "page.createFailed": "Creating the route failed.",
      "page.fetchUnavailable": "No model-discovery service in this build; use the official Models page.",
      "page.note": "Drag to reorder; API address, protocol, and model edits save immediately; the key is written to the credential store and never read back.",
      "protocol.completions": "Chat Completions (/chat/completions)",
      "protocol.responses": "Responses (/responses)",
      "protocol.messages": "Anthropic Messages (/v1/messages)",
    };

    /* --------------------------- official CSS classes -------------------------- */
    /* The shipped client-ui-model-selection bundle injects its CSS-module sheet and
       STILL loads (this plugin only shadows its seat), so reusing its class names
       reproduces the shipped look exactly. The hash is resolved from the live
       stylesheet so a dsh upgrade cannot silently drop the styling. A class the
       shipped sheet stops defining must be probed for at runtime (see
       `hasGroupSection`); `groupTitle` left the sheet in DSH 0.2.1-rc.2. */
    const CLASS_SUFFIXES = ["root", "trigger", "triggerLabel", "triggerEffort", "triggerIcon", "chevron", "chevronOpen",
      "menu", "status", "empty", "error", "warning", "retry", "groups", "group",
      "option", "selected", "optionCopy", "modelName", "check", "cell", "cellLabel", "cellValue", "cellChevron",
      "searchRow", "search", "searchWithQuery", "searchClear"];

    /* Resolution is cached against the live sheet count so a late-injected sheet is
       still picked up, and a resolved prefix is VALIDATED against a second class
       only this module owns — an unrelated module shipping a `_trigger` rule must
       not win (the updater module does). */
    /* Bump on every deploy. The host serves the plugin bundle as
       `immutable, max-age=31536000` under a URL that does not change when a plugin's
       code changes, so a browser can keep running an old build until a hard reload.
       Kept OFF the UI (it is not user-facing): read it as
       `window.__dshModelOrganizerBuild` when a stale build is suspected. */
    const BUILD = "b53";

    let officialClasses = null;
    let officialClassesSheets = -1;
    let officialClassesValidated = false;

    function sheetRules() {
      const out = [];
      let sheets;
      try { sheets = document.styleSheets; } catch (e) { return out; }
      for (let i = 0; i < sheets.length; i++) {
        let rules = null;
        try { rules = sheets[i].cssRules; } catch (e) { continue; }
        if (rules === null) continue;
        for (let j = 0; j < rules.length; j++) {
          const sel = rules[j].selectorText;
          if (typeof sel === "string") out.push(sel);
        }
      }
      return out;
    }

    function prefixIsValid(prefix, selectors) {
      const marker = "." + prefix + "_optionCopy";
      for (let i = 0; i < selectors.length; i++) if (selectors[i].indexOf(marker) !== -1) return true;
      return false;
    }

    function resolveOfficialClasses() {
      let sheetCount = 0;
      try { sheetCount = document.styleSheets.length; } catch (e) { sheetCount = 0; }
      if (officialClassesValidated && officialClassesSheets === sheetCount) return officialClasses;
      /* Anchored on classes only the model selector owns — a bare "_trigger" probe
         also matches unrelated modules (the updater module ships one too). */
      const ANCHORS = ["_triggerEffort", "_optionCopy", "_chevronOpen", "_cellValue"];
      const selectors = sheetRules();
      let prefix = null;
      for (let a = 0; a < ANCHORS.length && prefix === null; a++) {
        for (let i = 0; i < selectors.length && prefix === null; i++) {
          const at = selectors[i].indexOf(ANCHORS[a]);
          if (at === -1) continue;
          const found = /[.]([A-Za-z0-9_-]+)$/.exec(selectors[i].slice(0, at));
          if (found === null) continue;
          if (!prefixIsValid(found[1], selectors)) continue;
          prefix = found[1];
        }
      }
      officialClassesSheets = sheetCount;
      officialClassesValidated = true;
      if (prefix === null) { officialClasses = null; return null; }
      const out = {};
      for (let i = 0; i < CLASS_SUFFIXES.length; i++) out[CLASS_SUFFIXES[i]] = prefix + "_" + CLASS_SUFFIXES[i];
      /* The search row ships only in DSH 0.2.0-rc.2+; flag its presence so the
         composer renders the search box only where the official sheet can style
         it (rc.1's sheet has no search rules and would leave it unstyled). */
      const searchMarker = "." + prefix + "_searchRow";
      for (let i = 0; i < selectors.length; i++) {
        if (selectors[i].indexOf(searchMarker) !== -1) { out.hasSearchRow = true; break; }
      }
      /* 0.2.1-rc.2 dropped the per-group SECTION class while keeping `groups`
         (plural), so probe with a boundary: a bare `_group` match would also hit
         `_groups` and claim a class the sheet never defines. */
      const groupMarker = new RegExp("\\." + prefix + "_group(?![A-Za-z0-9_-])");
      out.hasGroupSection = false;
      for (let i = 0; i < selectors.length; i++) {
        if (groupMarker.test(selectors[i])) { out.hasGroupSection = true; break; }
      }
      officialClasses = out;
      return out;
    }

    /* The shipped sheet styles a static group heading; the collapsible variant needs
       a hover affordance and a chevron that flips. Injected once per document. */
    const OWN_STYLE_ID = "dsh-model-organizer-style";
    function ensureOwnStyles(C) {
      try {
        let style = document.getElementById(OWN_STYLE_ID);
        if (style === null) {
          style = document.createElement("style");
          style.id = OWN_STYLE_ID;
          document.head.appendChild(style);
        }
        const rules = [
          ".dsh-mo-head{transition:background .12s ease;}",
          ".dsh-mo-head:hover{background:var(--dsw-alias-interactive-bg-hover);}",
          /* A drag leaves the source row FOCUSED in Chromium, and both the shipped
             \`option\` and this sheet paint a :focus-visible background — that is the grey
             block that used to stay behind after a drag. That suppression must stay
             scoped to the settings drag lists (\.dsh-mo-list): the composer menu rows
             take keyboard focus now, and the walk is invisible without the paint. */
          ".dsh-mo-head:focus-visible{outline:none;background:var(--dsw-alias-interactive-bg-hover);}",
          ".dsh-mo-list .dsh-mo-head.dsh-mo-head:focus-visible,.dsh-mo-list .dsh-mo-model.dsh-mo-model:focus-visible,.dsh-mo-list .dsh-mo-row.dsh-mo-row:focus-visible{background:transparent;}",
          ".dsh-mo-panelhead.dsh-mo-panelhead:focus-visible{background:var(--dsw-alias-interactive-bg-hover);}",
          ".dsh-mo-chev{transition:transform .12s ease;}",
          ".dsh-mo-head[aria-expanded='true'] .dsh-mo-chev{transform:rotate(90deg);}",
          ".dsh-mo-row{border-width:1px;border-style:solid;border-color:transparent;}",
          /* No row may paint a hover tint while a drag owns the pointer. */
          ".dsh-mo-nohover.dsh-mo-nohover .dsh-mo-head:hover,.dsh-mo-nohover.dsh-mo-nohover .dsh-mo-row:hover,.dsh-mo-nohover.dsh-mo-nohover .dsh-mo-model:hover{background:transparent;}",

          /* The row IS the handle now: no grip glyph, the cursor says "drag me".
             Scoped to the settings panel's own list — the composer menu reuses the
             shipped cell/option classes together with dsh-mo-head / dsh-mo-model for
             rows that are NOT draggable, and those must keep the shipped cursor. */
          ".dsh-mo-list .dsh-mo-head{cursor:grab;}",
          ".dsh-mo-list .dsh-mo-model{cursor:grab;}",
          ".dsh-mo-list .dsh-mo-row{cursor:grab;}",
          ".dsh-mo-list .dsh-mo-head:active,.dsh-mo-list .dsh-mo-model:active{cursor:grabbing;}",
          /* The panel header is a drag handle, not a button: keep the cursor, drop the
             hover tint. Doubled selectors outrank the shipped `cell` :hover rule. */
          ".dsh-mo-panelhead.dsh-mo-panelhead{cursor:grab;}",
          ".dsh-mo-panelhead.dsh-mo-panelhead:hover{background:transparent;}",
          /* Page rows the shipped sheet has no class for (the editable model rows):
             same hover tint as the panel's rows, no cursor change — the grip does that. */
          ".dsh-mo-pagerow{display:flex;flex-direction:column;gap:5px;min-width:0;padding:6px 8px;border-radius:8px;background:var(--dsw-alias-interactive-bg, rgba(127,127,127,.06));transition:background .12s ease;}",
          ".dsh-mo-pagerow:hover{background:var(--dsw-alias-interactive-bg-hover);}",
          ".dsh-mo-grip{cursor:grab;}",
          ".dsh-mo-grip:active{cursor:grabbing;}",
          ".dsh-mo-nohover.dsh-mo-nohover .dsh-mo-pagerow:hover{background:var(--dsw-alias-interactive-bg, rgba(127,127,127,.06));}",
          ".dsh-mo-list{display:flex;flex-direction:column;gap:2px;margin-top:2px;}",
          ".dsh-mo-head{touch-action:none;user-select:none;-webkit-user-select:none;}",
          /* Borrowed from the sidebar rows: without -webkit-user-drag the browser treats
             a press-and-move over the row's TEXT as a NATIVE TEXT DRAG (the "release to
             search" ghost) instead of our reorder drag. It must NOT go on the row itself
             — that disables the row's own draggable behaviour — so it goes on the row's
             contents, leaving the row draggable. */
          ".dsh-mo-list .dsh-mo-head,.dsh-mo-list .dsh-mo-model,.dsh-mo-list .dsh-mo-row{user-select:none;-webkit-user-select:none;}",
          ".dsh-mo-list .dsh-mo-head *,.dsh-mo-list .dsh-mo-model *,.dsh-mo-list .dsh-mo-row *{-webkit-user-drag:none;user-select:none;-webkit-user-select:none;}",
          ".dsh-mo-panelhead,.dsh-mo-panelhead *{-webkit-user-drag:none;user-select:none;-webkit-user-select:none;}",
          ".dsh-mo-moving,.dsh-mo-moving:hover{cursor:grabbing;background:transparent;}",
          /* (the header's own arrow button is gone — the row toggles on click) */

          ".dsh-mo-model{padding-left:28px;position:relative;}",
          /* Permanent-but-unconfigured effort cell: caption tone (the search
             placeholder's token — dimmed is unreadably faint), not-allowed
             cursor, hover-proof (doubled selectors outrank the shipped rules). */
          ".dsh-mo-cell-disabled,.dsh-mo-cell-disabled.dsh-mo-cell-disabled{color:var(--dsw-alias-label-caption);cursor:not-allowed;}",
          ".dsh-mo-cell-disabled:hover,.dsh-mo-cell-disabled.dsh-mo-cell-disabled:hover{background:transparent;cursor:not-allowed;}",
          ".dsh-mo-model::before{content:'';position:absolute;left:15px;top:50%;width:5px;height:5px;margin-top:-2.5px;border-radius:50%;background:var(--dsw-alias-label-tertiary);opacity:.5;}",
          ".dsh-mo-model[aria-checked='true']::before{background:var(--dsw-alias-label-primary);opacity:.9;}"
        ];
        /* The shipped check alone is easy to miss: bold the selected row's name
           wherever the official sheet is in use. Settings rows carry no
           aria-checked, so the drag lists are untouched. */
        if (C !== null) {
          rules.push("." + C.option + "[aria-checked='true'] ." + C.modelName + "{font-weight:600}");
          /* cellValue paints its own color; fold it back to the dimmed cell's. */
          rules.push(".dsh-mo-cell-disabled ." + C.cellValue + "{color:inherit;}");
        }
        style.textContent = rules.join("");
      } catch (e) {}
    }

    function cx() {
      let out = "";
      for (let i = 0; i < arguments.length; i++) {
        const v = arguments[i];
        if (typeof v === "string" && v.length > 0) out = out.length === 0 ? v : out + " " + v;
      }
      return out;
    }

    function icon(name, props) {
      if (P === null || !isComponent(P[name])) return null;
      return h(P[name], props ? Object.assign({}, props) : {});
    }

    /* --------------------------------- styles --------------------------------- */
    const S = {
      chip: {
        display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 260,
        padding: "3px 8px", borderRadius: 8, cursor: "pointer", fontSize: 12, lineHeight: "18px",
        border: "1px solid var(--dsw-alias-border-l1)",
        background: "var(--dsw-alias-interactive-bg, rgba(127,127,127,.10))",
        color: "var(--dsw-alias-label-primary)"
      },
      chipDisabled: { opacity: 0.5, cursor: "not-allowed" },
      chipLabel: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      chipEffort: { color: "var(--dsw-alias-label-caption)", flexShrink: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
      caret: { fontSize: 9, color: "var(--dsw-alias-label-tertiary)" },
      menuEmpty: { padding: "10px 8px", fontSize: 12, color: "var(--dsw-alias-label-tertiary)" },
      /* fallbacks used only when the shipped stylesheet could not be located */
      fallbackMenu: {
        position: "fixed", zIndex: 1100, maxHeight: "min(360px, 100vh - 96px)", overflow: "hidden",
        display: "flex", flexDirection: "column", padding: 4,
        background: "var(--dsw-specific-menu, var(--dsw-alias-bg-module, #222))",
        color: "var(--dsw-alias-label-primary)", borderRadius: 20, boxShadow: "0 8px 28px rgba(0,0,0,.32)"
      },
      fallbackGroups: { overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 4 },
      fallbackGroup: { display: "flex", flexDirection: "column" },
      fallbackGroupTitle: {
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%",
        textAlign: "left", padding: "5px 8px 3px", border: "none", cursor: "pointer",
        background: "transparent", color: "var(--dsw-alias-label-tertiary)", fontSize: 12, fontWeight: 500
      },
      fallbackModel: {
        display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 38,
        textAlign: "left", padding: "6px 8px", border: "none", borderRadius: 10, cursor: "pointer",
        background: "transparent", color: "inherit"
      },
      fallbackCopy: { display: "flex", flexDirection: "column", flex: 1, minWidth: 0 },
      fallbackCheck: { flex: "0 0 18px", display: "grid", placeItems: "center" },
      /* The shipped sheet dropped the per-group heading and section classes in
         0.2.1-rc.2, so the header rides the shipped `cell` row plus our own
         dsh-mo-head, and the section falls back to fallbackGroup — which is a
         STYLE object, never a class name. */
      groupChevron: { color: "var(--dsw-alias-label-tertiary)", flex: "none", transition: "transform .12s" },
      measureStyle: { visibility: "hidden", left: 0, top: 0 },
      groupCount: { fontSize: 10, color: "var(--dsw-alias-label-tertiary)", flex: "none" },
      failure: { display: "flex", flexDirection: "column", gap: 2, padding: "5px 8px", fontSize: 11, color: "var(--dsw-alias-state-warn-label, #d29922)" },
      box: { marginTop: 8, padding: 8, border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 10, background: "var(--dsw-alias-bg-module-secondary, transparent)" },
      providerGroup: { display: "flex", flexDirection: "column" },

      /* Floating presentation: the panel sits in the corner of the Models page so
         provider/API configuration and reordering are visible at the same time. */
      floatPanel: {
        position: "fixed", right: 20, bottom: 20, zIndex: 10000, width: 380, maxWidth: "calc(100vw - 40px)",
        display: "flex", flexDirection: "column", padding: 4,
        border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 14,
        /* The theme's menu token is an OPAQUE colour (a color-mix), so using it as-is
           makes this panel a solid box and the blur below has nothing to show. Mixing
           it back toward transparent restores the frosted look in the theme's colour. */
        background: "color-mix(in srgb, var(--dsw-specific-menu, #26262a) 50%, transparent)",
        backdropFilter: "var(--dsw-menu-backdrop-filter, blur(28px) saturate(1.6))",
        boxShadow: "var(--dsw-elevation-prominent, 0 10px 30px rgba(0,0,0,.34))",
        color: "var(--dsw-alias-label-primary)"
      },
      /* The shipped `cell` sets min-width:100%; the head must stay inside the panel. */
      panelHeadCell: { display: "flex", alignItems: "center", gap: 6, flex: "1 1 auto", minWidth: 0 },
      floatBody: { display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", maxHeight: "52vh", padding: "2px 4px 4px" },
      /* The cross-link rides in the head row, next to the title; it isolates the pointer
         events so it neither drags the panel nor collapses it. */

      boxHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
      boxTitle: { fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-primary)" },
      boxHint: { fontSize: 10, color: "var(--dsw-alias-label-tertiary)" },
      list: { display: "flex", flexDirection: "column", gap: 2 },
      row: {
        display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 7,
        fontSize: 12, color: "var(--dsw-alias-label-secondary)", outline: "none",
        borderWidth: 1, borderStyle: "solid", borderColor: "transparent",
        background: "var(--dsw-alias-interactive-bg, rgba(127,127,127,.06))",
        transition: "background .12s ease, border-color .12s ease, opacity .12s ease, transform .12s ease",
        cursor: "grab"
      },
      /* Only border-color changes while dragging: keeping the border as longhands
         everywhere stops React from expanding the shorthand and then dropping
         border-color, which would fall back to currentColor and look like a
         highlight that never clears. */
      /* Only the drag affordances ride inline when the shipped classes are in use. */
      rowDraggingOnly: {
        opacity: 0.55, cursor: "grabbing", borderColor: "var(--dsw-alias-state-accent, #4f8cff)", transform: "scale(1.01)"
      },
      rowDragging: {
        opacity: 0.55, cursor: "grabbing",
        borderColor: "var(--dsw-alias-state-accent, #4f8cff)",
        background: "var(--dsw-alias-interactive-bg, rgba(79,140,255,.14))",
        transform: "scale(1.01)"
      },
      rowName: { flex: "1 1 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      /* Right-aligned "N models" count on a provider row (fallback styling only). */
      rowMeta: { flex: "none", fontSize: 10, color: "var(--dsw-alias-label-tertiary)" },
      dirty: { fontSize: 11, color: "var(--dsw-alias-state-warn-label, #d29922)" },
      ok: { fontSize: 11, color: "var(--dsw-alias-state-success, #3fb950)" },

      /* The organizer page (a `settings.section` entry): a two-column master/detail
         reading the same mirror the footer panel does. Read-only by design — the
         shipped page stays the editor, this one is the overview. */
      pageRoot: { display: "flex", flexDirection: "column", gap: 12, width: "100%", minWidth: 0, color: "var(--dsw-alias-label-primary)" },
      pageHead: { display: "flex", flexDirection: "column", gap: 3 },
      pageTitleRow: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
      /* Both cross-links are pills next to a title, so they must not look like the
         full-size action buttons in the body. */
      linkPill: {
        boxSizing: "border-box", flex: "none", padding: "1px 7px", borderRadius: 999, fontSize: 11,
        lineHeight: "16px", cursor: "pointer", color: "var(--dsw-alias-label-secondary)",
        background: "var(--dsw-alias-interactive-bg, rgba(127,127,127,.10))",
        borderWidth: 1, borderStyle: "solid", borderColor: "var(--dsw-alias-border-l1)"
      },
      switchLabel: {
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11,
        color: "var(--dsw-alias-label-secondary)", cursor: "pointer", userSelect: "none"
      },
      linkPillOn: {
        color: "var(--dsw-alias-label-primary)",
        background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.20))",
        borderColor: "var(--dsw-alias-state-accent, #4f8cff)"
      },
      pageTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: "var(--dsw-alias-label-primary)" },
      pageSubtitle: { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)" },
      pageGrid: { display: "grid", gridTemplateColumns: "minmax(170px, 210px) minmax(0, 1fr)", gap: 14, alignItems: "start" },
      pageList: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
      pageGroup: { fontSize: 11, fontWeight: 600, padding: "2px 8px 4px", color: "var(--dsw-alias-label-tertiary)" },
      /* The current provider is marked with an accent bar, never with an inline
         background: an inline background would beat the shipped :hover rule and the
         row would stop reacting to the pointer — the panel's rows had the same trap. */
      pageRowCurrent: { boxShadow: "inset 2px 0 0 0 var(--dsw-alias-state-accent, #4f8cff)" },
      pageDot: { flex: "0 0 6px", width: 6, height: 6, borderRadius: "50%", background: "var(--dsw-alias-state-success, #3fb950)" },
      pageDotMuted: { background: "var(--dsw-alias-label-tertiary)" },
      pageRowName: { flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      pageRowCount: { flex: "none", fontSize: 10, color: "var(--dsw-alias-label-tertiary)" },
      pageDetail: {
        display: "flex", flexDirection: "column", gap: 10, minWidth: 0, padding: 14,
        border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 12,
        background: "var(--dsw-alias-bg-module-secondary, transparent)"
      },
      pageDetailHead: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
      pageDetailTitle: { margin: 0, fontSize: 15, fontWeight: 600 },
      pageDetailRoute: { fontSize: 11, color: "var(--dsw-alias-label-tertiary)" },
      pageFacts: { display: "flex", flexDirection: "column", gap: 6 },
      pageFact: { display: "grid", gridTemplateColumns: "84px minmax(0, 1fr)", gap: 10, alignItems: "baseline", fontSize: 12 },
      pageFactLabel: { color: "var(--dsw-alias-label-tertiary)" },
      pageFactValue: { color: "var(--dsw-alias-label-secondary)", wordBreak: "break-all" },
      pageSectionHead: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
      pageSectionLabel: { fontSize: 12, fontWeight: 600 },
      pageHint: { fontSize: 10, color: "var(--dsw-alias-label-tertiary)" },
      pageEmpty: { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)" },
      pageModels: { display: "flex", flexDirection: "column", gap: 4 },
      pageModelRow: {
        display: "flex", alignItems: "center", gap: 8, minWidth: 0, padding: "5px 8px", borderRadius: 8,
        fontSize: 12, background: "var(--dsw-alias-interactive-bg, rgba(127,127,127,.06))"
      },
      pageModelId: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
      pageModelName: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--dsw-alias-label-tertiary)" },
      pageSpacer: { flex: "1 1 auto", minWidth: 0 },
      pageChip: { flex: "none", padding: "1px 6px", borderRadius: 6, fontSize: 10, border: "1px solid var(--dsw-alias-border-l1)", color: "var(--dsw-alias-label-tertiary)" },
      pageLoading: { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-tertiary)" },
      pageFooterHint: { margin: 0, fontSize: 10, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary)" },
      /* The fetch picker: portaled to document.body like the footer panel, because a
         fixed card inside the settings subtree is trapped in its stacking context. */
      pickBackdrop: {
        position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16, background: "rgba(0,0,0,.45)"
      },
      pickCard: {
        display: "flex", flexDirection: "column", gap: 10, width: "min(520px, 92vw)", maxHeight: "min(80vh, 640px)",
        padding: 16, borderRadius: 14, color: "var(--dsw-alias-label-primary)",
        /* Frost parity with the footer panel (S.floatPanel): the theme's menu token is
           an opaque color-mix, and with today's translucent theme value the token alone
           leaves the card see-through. Mix it back toward transparent and blur what sits
           behind it, exactly like the panel does. */
        background: "color-mix(in srgb, var(--dsw-specific-menu, #26262a) 50%, transparent)",
        backdropFilter: "var(--dsw-menu-backdrop-filter, blur(28px) saturate(1.6))",
        WebkitBackdropFilter: "var(--dsw-menu-backdrop-filter, blur(28px) saturate(1.6))",
        borderWidth: 1, borderStyle: "solid", borderColor: "var(--dsw-alias-border-l1)",
        boxShadow: "var(--dsw-elevation-prominent, 0 10px 30px rgba(0,0,0,.34))"
      },
      pickHead: { display: "flex", alignItems: "center", gap: 8 },
      pickTitle: { margin: 0, fontSize: 15, fontWeight: 600, flex: "1 1 auto" },
      pickDesc: { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)" },
      pickTools: { display: "flex", alignItems: "center", gap: 8 },
      pickList: { display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0, paddingRight: 2 },
      pickRow: { display: "flex", alignItems: "center", gap: 8, padding: "3px 6px", borderRadius: 7, cursor: "pointer", fontSize: 12 },
      pickId: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
      pickFoot: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 },
      /* Editable surface: one grid row per field so the label column stays aligned,
         and controls that inherit the theme instead of the browser defaults. */
      /* Label above control, full-width control: inside the settings column (~700px)
         a fixed label column squeezed every input and the rows ended up unreadable. */
      pageField: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0, fontSize: 12 },
      pageFieldLabel: { color: "var(--dsw-alias-label-tertiary)", fontSize: 12 },
      pageInput: {
        boxSizing: "border-box", minWidth: 0, padding: "4px 8px", borderRadius: 7, fontSize: 12,
        color: "var(--dsw-alias-label-primary)",
        background: "var(--dsw-alias-bg-module, rgba(127,127,127,.08))",
        borderWidth: 1, borderStyle: "solid", borderColor: "var(--dsw-alias-border-l1)",
        outline: "none"
      },
      pageInputWide: {
        boxSizing: "border-box", width: "100%", minWidth: 0, padding: "4px 8px", borderRadius: 7, fontSize: 12,
        color: "var(--dsw-alias-label-primary)",
        background: "var(--dsw-alias-bg-module, rgba(127,127,127,.08))",
        borderWidth: 1, borderStyle: "solid", borderColor: "var(--dsw-alias-border-l1)",
        outline: "none"
      },
      pageInputMono: { flex: "1 1 auto", minWidth: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
      pageModelTop: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 },
      pageModelFields: { display: "grid", gridTemplateColumns: "92px 92px auto", gap: 6, alignItems: "center", paddingLeft: 18 },
      /* A native <select> popup is painted by the platform: in this theme its list came
         out white-on-white. Three radio-style segments are painted by us, so the choice
         is legible whatever the platform does. */
      /* Drawn by us: a native checkbox in this theme is what the row already uses for
         "vision", but a switch reads as an on/off state at a glance. */
      switchTrack: {
        boxSizing: "border-box", flex: "none", width: 30, height: 17, padding: 2, borderRadius: 9,
        display: "inline-flex", alignItems: "center", justifyContent: "flex-start", cursor: "pointer",
        background: "var(--dsw-alias-interactive-bg, rgba(127,127,127,.25))",
        borderWidth: 1, borderStyle: "solid", borderColor: "var(--dsw-alias-border-l1)",
        transition: "background .12s ease, border-color .12s ease"
      },
      switchTrackOn: {
        background: "var(--dsw-alias-state-accent, #4f8cff)",
        borderColor: "var(--dsw-alias-state-accent, #4f8cff)",
        justifyContent: "flex-end"
      },
      switchKnob: { width: 11, height: 11, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.35)" },
      pageDim: { opacity: 0.5 },
      /* Same affordance as the shipped Models page: a dashed full-width box under the
         last row of the list. */
      pageAddButton: {
        boxSizing: "border-box", width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        fontSize: 12, cursor: "pointer", color: "var(--dsw-alias-label-tertiary)",
        background: "transparent",
        borderWidth: 1, borderStyle: "dashed", borderColor: "var(--dsw-alias-border-l1)"
      },
      pageError: { margin: 0, fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-state-error, #f85149)" },
      pageSegments: { display: "flex", gap: 6, minWidth: 0, flexWrap: "wrap" },
      pageSegment: {
        boxSizing: "border-box", flex: "1 1 auto", minWidth: 0, padding: "5px 8px", borderRadius: 7, fontSize: 12,
        cursor: "pointer", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        color: "var(--dsw-alias-label-secondary)",
        background: "var(--dsw-alias-interactive-bg, rgba(127,127,127,.10))",
        borderWidth: 1, borderStyle: "solid", borderColor: "var(--dsw-alias-border-l1)"
      },
      pageSegmentActive: {
        color: "var(--dsw-alias-label-primary)",
        background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.20))",
        borderColor: "var(--dsw-alias-state-accent, #4f8cff)"
      },
      pageSelect: {
        boxSizing: "border-box", padding: "4px 8px", borderRadius: 7, fontSize: 12,
        color: "var(--dsw-alias-label-primary)",
        background: "var(--dsw-alias-bg-module, rgba(127,127,127,.08))",
        borderWidth: 1, borderStyle: "solid", borderColor: "var(--dsw-alias-border-l1)"
      },
      pageButton: {
        boxSizing: "border-box", flex: "none", padding: "4px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer",
        color: "var(--dsw-alias-label-secondary)",
        background: "var(--dsw-alias-interactive-bg, rgba(127,127,127,.10))",
        borderWidth: 1, borderStyle: "solid", borderColor: "var(--dsw-alias-border-l1)"
      },
      pageButtonPrimary: {
        flex: "none", padding: "4px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer",
        color: "var(--dsw-alias-label-primary)",
        background: "var(--dsw-alias-state-accent, #4f8cff)",
        borderWidth: 1, borderStyle: "solid", borderColor: "transparent"
      },
      pageIconButton: {
        boxSizing: "border-box", flex: "none", width: 22, height: 22, lineHeight: "18px", padding: 0, borderRadius: 6, fontSize: 11,
        cursor: "pointer", color: "var(--dsw-alias-label-tertiary)", background: "transparent",
        borderWidth: 1, borderStyle: "solid", borderColor: "transparent"
      },
      pageKeyRow: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
      pageActions: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
      pageHandle: { flex: "none", color: "var(--dsw-alias-label-tertiary)", fontSize: 12, userSelect: "none" },
      pageCheckLabel: { flex: "none", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--dsw-alias-label-tertiary)", cursor: "pointer" },
    };

    /* --------------------------- drag reorder helper -------------------------- */
    /* Live preview: the list re-renders in the would-be order while dragging, so
       neighbouring rows visibly move out of the way before the drop lands. */
    const MEASURE_STYLE = S.measureStyle;

    function moved(ids, from, to) {
      const next = ids.slice();
      const item = next.splice(from, 1)[0];
      next.splice(to, 0, item);
      return next;
    }

    /* A transient status note. The timer is kept per instance so a second save cannot
       be cut short by the first save's timer, and nothing fires after unmount. */
    function useNote() {
      const state = useState(null);
      const timer = useRef(null);
      useEffect(function () {
        return function () {
          if (timer.current !== null) clearTimeout(timer.current);
        };
      }, []);
      const set = function (value, ttl) {
        if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; }
        state[1](value);
        if (value !== null && typeof ttl === "number") {
          timer.current = setTimeout(function () {
            timer.current = null;
            state[1](null);
          }, ttl);
        }
      };
      return [state[0], set];
    }

    function DragList(props) {
      const ids = props.ids;
      const render = props.render;
      const onCommit = props.onCommit;
      const disabled = props.disabled;
      const dragState = useState(null);
      const drag = dragState[0];
      const setDrag = dragState[1];
      /* The live value lives in a ref as well as in state: dragover fires many times
         per frame, and a handler reading the rendered state would compute from a
         stale list — that is what let the highlighted row drift away from the row
         actually being dragged. */
      const dragRef = useRef(null);
      const handled = useRef(false);
      /* While an HTML5 drag session runs, Chromium owns the pointer and stops
         updating :hover — so the row that was under the cursor when the press
         started keeps its hover tint, frozen at the position it was pressed at,
         while the dragged row travels with the pointer. Hover paint is therefore
         suppressed for the whole gesture (and until the pointer moves again, so a
         frozen tint can never survive the drop). The dragged row keeps its own
         accent border + opacity, so the feedback is not lost. */
      const lockState = useState(false);
      const hoverLocked = lockState[0];
      const setHoverLocked = lockState[1];

      useEffect(function () {
        if (!hoverLocked) return undefined;
        const release = function () { if (dragRef.current === null) setHoverLocked(false); };
        window.addEventListener("pointermove", release, true);
        window.addEventListener("mousemove", release, true);
        window.addEventListener("pointerdown", release, true);
        const timer = setTimeout(release, 400);
        return function () {
          window.removeEventListener("pointermove", release, true);
          window.removeEventListener("mousemove", release, true);
          window.removeEventListener("pointerdown", release, true);
          clearTimeout(timer);
        };
      }, [hoverLocked]);


      const shown = drag !== null ? drag.preview : ids;

      function put(next) {
        dragRef.current = next;
        setDrag(next);
      }

      /* Identity, not position: the dragged row is remembered by its id, so the
         highlight follows the row itself wherever the preview moves it. */
      function start(id, event) {
        if (disabled) return;
        handled.current = false;
        setHoverLocked(true);
        /* Chromium focuses the mousedown target; a native drag then keeps it focused
           for the rest of the gesture, which paints a focus background on the row. */
        try { if (event && event.currentTarget && event.currentTarget.blur) event.currentTarget.blur(); } catch (e) {}
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          try { event.dataTransfer.setData("text/plain", String(id)); } catch (e) {}
        }
        put({ id: id, preview: ids });
      }

      function over(rowId, event) {
        const current = dragRef.current;
        if (disabled || current === null) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        const list = current.preview;
        const from = list.indexOf(current.id);
        const index = list.indexOf(rowId);
        if (from < 0 || index < 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const below = event.clientY > rect.top + rect.height / 2;
        let to = below ? index + 1 : index;
        if (from < to) to -= 1;
        to = Math.max(0, Math.min(list.length - 1, to));
        if (to === from) return;
        put({ id: current.id, preview: moved(list, from, to) });
      }

      /* Safety net: if a drag ends without reaching our drop handler (dropped on the
         page background, cancelled, window blurred, source node re-rendered), the
         highlight must not stay behind. Bubble phase, so a real drop still commits
         first. */
      useEffect(function () {
        if (drag === null) return undefined;
        const clear = function () {
          dragRef.current = null;
          setDrag(null);
          handled.current = false;
        };
        window.addEventListener("dragend", clear);
        window.addEventListener("drop", clear);
        window.addEventListener("mouseup", clear);
        window.addEventListener("blur", clear);
        return function () {
          window.removeEventListener("dragend", clear);
          window.removeEventListener("drop", clear);
          window.removeEventListener("mouseup", clear);
          window.removeEventListener("blur", clear);
        };
      }, [drag === null]);

      function clearFocus(node) {
        try {
          if (node && typeof node.blur === "function") node.blur();
          const active = document.activeElement;
          if (active && typeof active.blur === "function" && active !== document.body) active.blur();
        } catch (e) {}
      }

      function drop(event) {
        const current = dragRef.current;
        if (current === null || handled.current) return;
        handled.current = true;
        event.preventDefault();
        put(null);
        clearFocus(event.currentTarget);
        onCommit(current.preview);
      }

      function end(event) {
        put(null);
        handled.current = false;
        clearFocus(event ? event.currentTarget : null);
      }

      return h("div", {
        className: hoverLocked ? "dsh-mo-list dsh-mo-nohover" : "dsh-mo-list",
        style: S.list,
        onDragEnd: end,
        onDrop: drop
      },
        shown.map(function (id, index) {
          const dragging = drag !== null && drag.id === id;
          return render(id, index, {
            draggable: !disabled,
            dragging: dragging,
            onDragStart: function (event) { start(id, event); },
            onDragOver: function (event) { over(id, event); },
            onDragEnd: end,
            onDrop: drop
          });
        })
      );
    }

    /* ---------------- A. composer model selector, grouped by provider ---------- */
    /* A drawn switch. The config has no enabled/disabled field, so this is the
       plugin's own visibility list, and the page says so in the tooltip. */
    function Switch(props) {
      const on = props.on === true;
      return h("button", {
        type: "button",
        role: "switch",
        "aria-checked": on ? "true" : "false",
        "data-mo": props.marker,
        "data-mo-id": props.id,
        disabled: props.disabled === true,
        title: props.title,
        onClick: function (event) { event.stopPropagation(); props.onToggle(on !== true); },
        style: on ? Object.assign({}, S.switchTrack, S.switchTrackOn) : S.switchTrack
      }, h("span", { style: S.switchKnob }));
    }

    function ProviderGroupedModelSelect(props) {
      const locked = props.locked;
      const available = props.available;
      const directory = props.directory;
      const load = props.load;
      const select = props.select;
      const t = props.t;

      const C = resolveOfficialClasses();
      ensureOwnStyles(C);
      const state = useSyncExternalStore(
        function (fn) { return directory.subscribe(fn); },
        function () { return directory.getSnapshot(); }
      );
      const openState = useState(false);
      const open = openState[0];
      const setOpen = openState[1];
      const expandedState = useState({});
      const expanded = expandedState[0];
      const setExpanded = expandedState[1];
      const queryState = useState("");
      const query = queryState[0];
      const setQuery = queryState[1];
      const searchRef = useRef(null);
      const toastState = useState(null);
      const toast = toastState[0];
      const setToast = toastState[1];
      const toastSeq = useRef(0);
      const posState = useState(null);
      const menuPos = posState[0];
      const setMenuPos = posState[1];
      const paneState = useState("root");
      const pane = paneState[0];
      const setPane = paneState[1];
      const rootRef = useRef(null);
      const triggerRef = useRef(null);
      const menuRef = useRef(null);
      const idRef = useRef(null);
      if (idRef.current === null) idRef.current = "mo-" + Math.random().toString(36).slice(2, 9);
      /* Row registry for the shipped keyboard walk (↑/↓ cycles the shown pane's
         rows). Refs are handed out during render, exactly like the shipped menu. */
      const itemRefs = useRef([]);
      const itemIndex = useRef(0);
      const itemRef = function () {
        const at = itemIndex.current++;
        return function (node) { itemRefs.current[at] = node; };
      };
      itemIndex.current = 0;
      itemRefs.current = [];

      const groups = (state && state.groups) || [];
      const failures = (state && state.failures) || [];
      const current = (state && state.current) || null;
      const busy = !!state && state.status === "selecting";
      const loading = !!state && state.status === "loading";

      /* Providers follow the plugin's own display preference (see below). Computed
         per render — not memoised — so a reorder made in Settings shows up here the
         next time the menu opens, without a page reload. */
      const visibleGroups = visibleGroupsFor(groups, current, {
        providers: readHidden(HIDDEN_PROVIDERS_KEY),
        models: readHidden(HIDDEN_MODELS_KEY)
      });

      const groupsOrdered = (function () {
        const ids = [];
        const byId = {};
        for (let i = 0; i < visibleGroups.length; i++) { ids.push(visibleGroups[i].id); byId[visibleGroups[i].id] = visibleGroups[i]; }
        const ordered = applyProviderOrder(ids, readProviderOrder(), true);
        const out = [];
        for (let i = 0; i < ordered.length; i++) if (byId[ordered[i]] !== undefined) out.push(byId[ordered[i]]);
        return out;
      })();

      /* Search, mirroring the shipped menu: offered only above four models and
         only where the official sheet ships the search styling (0.2.0-rc.2+).
         Matches rank through the shared rankByName, per group, empty groups
         dropping out; a query forces every group open. */
      const modelCount = (function () {
        let n = 0;
        for (let i = 0; i < groupsOrdered.length; i++) n += groupsOrdered[i].models.length;
        return n;
      })();
      const showSearch = C !== null && C.hasSearchRow === true && RANK_BY_NAME !== null
        && P !== null && isComponent(P.Input) && modelCount > 4;
      const searchQuery = showSearch ? query.trim() : "";
      const filteredGroups = (function () {
        if (searchQuery === "") return groupsOrdered;
        const out = [];
        for (let i = 0; i < groupsOrdered.length; i++) {
          const group = groupsOrdered[i];
          const models = RANK_BY_NAME(group.models, searchQuery);
          if (models.length === 0) continue;
          const copy = {};
          for (const key in group) copy[key] = group[key];
          copy.models = models;
          out.push(copy);
        }
        return out;
      })();

      const layoutKey = useMemo(function () {
        const parts = [];
        for (let i = 0; i < groupsOrdered.length; i++) parts.push(groupsOrdered[i].id + (expanded[groupsOrdered[i].id] === true ? "+" : "-"));
        return parts.join("|") + "|" + String(current === null ? "" : current.provider);
      }, [groupsOrdered, expanded, current]);

      useEffect(function () { load(); }, []);

      useEffect(function () {
        if (!open) return undefined;
        const onDown = function (event) {
          if (triggerRef.current && triggerRef.current.contains(event.target)) return;
          if (menuRef.current && menuRef.current.contains(event.target)) return;
          setOpen(false);
        };
        const onKey = function (event) {
          if (event.key !== "Escape") return;
          setPane(function (currentPane) {
            if (currentPane !== "root") return "root";
            setOpen(false);
            return currentPane;
          });
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return function () {
          document.removeEventListener("mousedown", onDown);
          document.removeEventListener("keydown", onKey);
        };
      }, [open]);

      /* Focus hand-off, mirroring the shipped menu: drilling hands focus to the
         pane's first enabled row, returning to the root pane hands it back to
         its first cell. A plain open/close does NOT move focus (it stays on the
         trigger, like the shipped menu). */
      const wasOpen = useRef(false);
      useEffect(function () {
        const navigating = wasOpen.current && open;
        wasOpen.current = open;
        if (!open || !navigating) return undefined;
        if (pane === "model" && searchRef.current !== null && searchRef.current.focus) {
          try { searchRef.current.focus(); } catch (e) {}
          return undefined;
        }
        const items = itemRefs.current.filter(function (node) {
          return node !== null && node !== undefined && node.disabled !== true;
        });
        if (items.length > 0) {
          try { items[0].focus(); } catch (e) {}
        }
        return undefined;
      }, [open, pane]);

      const currentInfo = useMemo(function () {
        if (current === null) return null;
        for (let i = 0; i < groups.length; i++) {
          const group = groups[i];
          if (group.id !== current.provider) continue;
          for (let j = 0; j < group.models.length; j++) {
            if (group.models[j].id === current.model) return { group: group, model: group.models[j] };
          }
        }
        return null;
      }, [groups, current]);

      /* Reasoning effort, mirroring the shipped ModelSelect: exact-model metadata
         comes from the Host, and the effective level is the session's explicit
         choice or the model's own default. */
      const reasoning = currentInfo !== null && currentInfo.model.reasoning ? currentInfo.model.reasoning : undefined;
      const effectiveEffort = current !== null && current.reasoningEffort !== undefined
        ? current.reasoningEffort
        : (reasoning !== undefined ? reasoning.defaultEffort : undefined);
      let effortLabel;
      if (reasoning !== undefined) {
        if (effectiveEffort === undefined) effortLabel = t("composer.effortDefault");
        else {
          const levels = reasoning.efforts || [];
          let found;
          for (let i = 0; i < levels.length; i++) if (levels[i].id === effectiveEffort) found = levels[i];
          effortLabel = found !== undefined ? found.name : effectiveEffort;
        }
      }
      const effortChoices = useMemo(function () {
        if (reasoning === undefined) return [];
        const out = [];
        if (reasoning.defaultEffort === undefined) out.push({ key: "provider-default", effort: undefined, label: t("composer.effortDefault") });
        const levels = reasoning.efforts || [];
        for (let i = 0; i < levels.length; i++) out.push({ key: "effort:" + levels[i].id, effort: levels[i].id, label: levels[i].name });
        return out;
      }, [reasoning, t]);

      /* Official placement: right-aligned above the trigger, clamped to the
         viewport, re-measured on scroll/resize (mirrors the shipped algorithm). */
      useLayoutEffect(function () {
        if (!open) { setMenuPos(null); return undefined; }
        const place = function () {
          const rect = triggerRef.current ? triggerRef.current.getBoundingClientRect() : undefined;
          if (rect === undefined) return;
          const MARGIN = 12;
          const lw = menuRef.current ? menuRef.current.offsetWidth : 0;
          const lh = menuRef.current ? menuRef.current.offsetHeight : 0;
          let x = rect.right - lw;
          let y = rect.top - 8 - lh;
          if (lw > 0) x = Math.min(Math.max(x, MARGIN), window.innerWidth - lw - MARGIN);
          if (lh > 0) y = Math.min(Math.max(y, MARGIN), window.innerHeight - lh - MARGIN);
          setMenuPos({ left: x, top: y });
        };
        place();
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return function () {
          window.removeEventListener("scroll", place, true);
          window.removeEventListener("resize", place);
        };
      }, [open, pane, searchQuery, layoutKey]);

      if (available === false) return null;

      const disabled = !!locked;

      function toggle() {
        if (disabled) return;
        if (!open) {
          load();
          setQuery("");
          setPane(current === null ? "model" : "root");
          if (Object.keys(expanded).length === 0 && current !== null) {
            const seed = {};
            seed[current.provider] = true;
            setExpanded(seed);
          }
        } else {
          setPane("root");
        }
        setOpen(!open);
      }

      function toggleGroup(id) {
        const next = {};
        for (const key in expanded) next[key] = expanded[key];
        next[id] = !next[id];
        setExpanded(next);
      }

      /* The shipped menu toasts a failed selection instead of closing; mirror
         that — a silent failure reads as "nothing happened / it jumped back". */
      function settleSelect(outcome) {
        if (outcome === true) { setOpen(false); return; }
        toastSeq.current += 1;
        const message = outcome && outcome.code !== undefined
          ? outcome.code + ": " + outcome.message
          : String(outcome === false || outcome === undefined ? "unknown error" : outcome);
        setToast({ seq: toastSeq.current, text: t("composer.selectFailed").split("{msg}").join(message) });
      }

      function pick(group, model) {
        const sameModel = current !== null && current.provider === group.id && current.model === model.id;
        let effort = model.reasoning ? model.reasoning.defaultEffort : undefined;
        if (sameModel && current.reasoningEffort !== undefined) effort = current.reasoningEffort;
        const selection = { provider: group.id, model: model.id };
        if (effort !== undefined) selection.reasoningEffort = effort;
        Promise.resolve(select(selection)).then(settleSelect);
      }

      /* Same model, new effort — the shipped semantics: an unchanged level just
         closes, otherwise the whole selection is resubmitted. */
      function chooseEffort(effort) {
        if (current === null) return;
        if (effectiveEffort === effort) { setOpen(false); return; }
        const selection = { provider: current.provider, model: current.model };
        if (effort !== undefined) selection.reasoningEffort = effort;
        Promise.resolve(select(selection)).then(settleSelect);
      }

      const label = currentInfo !== null ? currentInfo.model.name : (current === null ? t("composer.none") : current.provider + "/" + current.model);
      const triggerTitle = effortLabel === undefined ? label : label + " · " + effortLabel;
      const aria = (effortLabel === undefined ? t("composer.aria") : t("composer.ariaEffort"))
        .split("{model}").join(label)
        .split("{effort}").join(effortLabel === undefined ? "" : effortLabel);

      const chevronIcon = icon("IconChevronDownOutlineRegular", {
        className: C !== null ? cx(C.chevron, open && C.chevronOpen) : undefined,
        style: C === null ? S.caret : undefined
      });
      const triggerChildren = [];
      const triggerGlyph = icon("IconDataOutlineRegular", { key: "g", className: C !== null ? C.triggerIcon : undefined, size: 16 });
      if (triggerGlyph !== null) triggerChildren.push(triggerGlyph);
      triggerChildren.push(h("span", { key: "l", className: C !== null ? C.triggerLabel : undefined, style: C === null ? S.chipLabel : undefined }, label));
      if (effortLabel !== undefined) {
        triggerChildren.push(h("span", { key: "e", className: C !== null ? C.triggerEffort : undefined, style: C === null ? S.chipEffort : undefined }, effortLabel));
      }
      triggerChildren.push(
        busy && isComponent(P !== null ? P.StateDot : null)
          ? icon("StateDot", { key: "c", state: "ongoing" })
          : (chevronIcon !== null ? chevronIcon : h("span", { key: "c", style: S.caret }, open ? "▾" : "▴"))
      );

      const trigger = h("button", {
        ref: triggerRef,
        type: "button",
        className: C !== null ? C.trigger : undefined,
        style: C === null ? (disabled ? Object.assign({}, S.chip, S.chipDisabled) : S.chip) : undefined,
        disabled: disabled,
        title: disabled ? t("composer.locked") : triggerTitle,
        "aria-label": aria,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? idRef.current + "-menu" : undefined,
        onClick: toggle
      }, triggerChildren);

      /* Keyboard walk mirrors the shipped menu: ↑/↓ cycle the rows of the shown
         pane. (Escape is handled at document level above; Tab quirks are left to
         the browser.) */
      function onRootKeyDown(event) {
        if (!open) return;
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        const items = itemRefs.current.filter(function (node) {
          return node !== null && node !== undefined && node.disabled !== true;
        });
        if (items.length === 0) return;
        const active = items.indexOf(document.activeElement);
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = active === -1
          ? (step === 1 ? 0 : items.length - 1)
          : (active + step + items.length) % items.length;
        items[next].focus();
      }

      /* The portaled menu must stay a React CHILD of this wrapper: portals
         bubble synthetic events through the REACT tree, not the DOM tree, so
         onKeyDown on the wrapper catches keys pressed inside the menu — exactly
         how the shipped root div wraps trigger + portal. A sibling portal would
         leave the menu's rows keyboard-dead. */
      function rootDiv(children) {
        return h("div", {
          ref: rootRef,
          className: C !== null ? C.root : undefined,
          style: C === null ? { minWidth: 0, position: "relative" } : undefined,
          onKeyDown: onRootKeyDown
        }, children);
      }

      if (!open) return rootDiv(trigger);

      const groupNodes = filteredGroups.map(function (group) {
        /* A query forces every group open: the matches must be visible without
           hunting for collapse states; clearing restores the saved state. */
        const isOpen = searchQuery !== "" ? true : expanded[group.id] === true;
        const headingId = idRef.current + "-" + group.id;
        /* A provider row reuses the shipped `cell` drill-in row (label + right-aligned
           value + chevron), so both menu levels are drawn by the shipped sheet. */
        const headChildren = [
          h("span", { key: "n", className: C !== null ? C.cellLabel : undefined, style: C === null ? undefined : undefined }, group.name || group.id),
          h("span", { key: "v", className: C !== null ? C.cellValue : undefined, style: C === null ? S.groupCount : undefined }, group.models.length + " " + t("composer.count"))
        ];
        const groupChevron = icon("IconChevronRightOutlineRegular", {
          key: "i",
          className: C !== null ? cx(C.cellChevron, "dsh-mo-chev") : "dsh-mo-chev",
          style: C === null ? S.groupChevron : undefined
        });
        if (groupChevron !== null) headChildren.push(groupChevron);
        const head = h("button", {
          key: "h",
          ref: itemRef(),
          type: "button",
          id: headingId,
          className: C !== null ? cx(C.cell, "dsh-mo-head") : "dsh-mo-head",
          style: C === null ? S.fallbackGroupTitle : undefined,
          "aria-expanded": isOpen,
          onClick: function () { toggleGroup(group.id); }
        }, headChildren);

        const items = !isOpen ? [] : group.models.map(function (model) {
          const selected = current !== null && current.provider === group.id && current.model === model.id;
          const check = selected ? icon("IconCheckOutlineRegular", { key: "k" }) : null;
          return h("button", {
            key: model.id,
            ref: itemRef(),
            type: "button",
            role: "menuitemradio",
            "aria-checked": selected,
            className: C !== null ? cx(C.option, "dsh-mo-model", selected && C.selected) : "dsh-mo-model",
            style: C === null ? S.fallbackModel : undefined,
            title: model.name,
            disabled: busy,
            onClick: function () { pick(group, model); }
          },
            h("span", { className: C !== null ? C.optionCopy : undefined, style: C === null ? S.fallbackCopy : undefined },
              h("span", { className: C !== null ? C.modelName : undefined, style: C === null ? S.chipLabel : undefined }, model.name || model.id)),
            h("span", { className: C !== null ? C.check : undefined, style: C === null ? S.fallbackCheck : undefined }, check)
          );
        });

        return h("section", {
          key: group.id,
          role: "group",
          "aria-labelledby": headingId,
          className: C !== null && C.hasGroupSection === true ? C.group : undefined,
          style: C !== null && C.hasGroupSection === true ? undefined : S.fallbackGroup
        }, [head].concat(items));
      });

      /* Root pane = the shipped Model / Effort row pair; the "model" pane keeps
         OUR improvement (providers grouped, collapsible, in the saved order) on
         top of the shipped list styling; the "effort" pane is the shipped radio
         list. No back rows: the shipped menu returns with Escape (or Shift+Tab)
         and closes on pick or outside click, and so does this one. */
      const paneChildren = [];
      if (pane === "root") {
        paneChildren.push(h("button", {
          key: "model",
          ref: itemRef(),
          type: "button",
          role: "menuitem",
          className: C !== null ? C.cell : undefined,
          style: C === null ? S.fallbackGroupTitle : undefined,
          onClick: function () { setQuery(""); setPane("model"); }
        },
          h("span", { key: "l", className: C !== null ? C.cellLabel : undefined }, t("composer.menuModel")),
          h("span", { key: "v", className: C !== null ? C.cellValue : undefined }, label),
          icon("IconChevronRightOutlineRegular", { key: "c", className: C !== null ? C.cellChevron : undefined })
        ));
        /* The effort entry is PERMANENT (unlike the shipped conditional one):
           models without declared levels render it dimmed, unclickable and
           skipped by the keyboard walk, so the root pair never reflows. */
        const effortEnabled = reasoning !== undefined;
        paneChildren.push(h("button", {
          key: "effort",
          ref: itemRef(),
          type: "button",
          role: "menuitem",
          className: C !== null ? cx(C.cell, !effortEnabled && "dsh-mo-cell-disabled") : undefined,
          style: C === null ? S.fallbackGroupTitle : undefined,
          disabled: !effortEnabled,
          onClick: effortEnabled ? function () { setPane("effort"); } : undefined
        },
          h("span", { key: "l", className: C !== null ? C.cellLabel : undefined }, t("composer.effort")),
          h("span", { key: "v", className: C !== null ? C.cellValue : undefined }, effortEnabled ? effortLabel : t("composer.effortNone")),
          icon("IconChevronRightOutlineRegular", { key: "c", className: C !== null ? cx(C.cellChevron, !effortEnabled && "dsh-mo-cell-disabled") : undefined })
        ));
      } else if (pane === "effort") {
        if (effortChoices.length === 0) {
          paneChildren.push(h("div", { key: "ee", className: C !== null ? C.empty : undefined, style: C === null ? S.menuEmpty : undefined }, t("composer.effortEmpty")));
        } else {
          paneChildren.push(h("div", {
            key: "eg",
            className: C !== null ? cx(C.groups, "scrollable") : undefined,
            style: C === null ? S.fallbackGroups : undefined
          }, effortChoices.map(function (level) {
            const selected = effectiveEffort === level.effort;
            const check = selected ? icon("IconCheckOutlineRegular", { key: "k" }) : null;
            return h("button", {
              key: level.key,
              ref: itemRef(),
              type: "button",
              role: "menuitemradio",
              "aria-checked": selected,
              className: C !== null ? cx(C.option, selected && C.selected) : undefined,
              style: C === null ? S.fallbackModel : undefined,
              disabled: busy,
              onClick: function () { chooseEffort(level.effort); }
            },
              h("span", { className: C !== null ? C.optionCopy : undefined, style: C === null ? S.fallbackCopy : undefined },
                h("span", { className: C !== null ? C.modelName : undefined, style: C === null ? S.chipLabel : undefined }, level.label)),
              h("span", { className: C !== null ? C.check : undefined, style: C === null ? S.fallbackCheck : undefined }, check)
            );
          })));
        }
      } else {
        if (showSearch) {
          /* Pinned search row with the shipped styling: the Input primitive plus
             the search classes; the clear button only rides along with a query. */
          paneChildren.push(h("div", { key: "sr", className: C.searchRow },
            h(P.Input, {
              key: "in",
              ref: searchRef,
              className: cx(C.search, searchQuery !== "" && C.searchWithQuery),
              type: "text",
              role: "searchbox",
              "aria-label": t("composer.searchPlaceholder"),
              placeholder: t("composer.searchPlaceholder"),
              value: query,
              onChange: function (event) { setQuery(event.target.value); }
            }),
            searchQuery !== "" ? h("button", {
              key: "clr",
              type: "button",
              className: C.searchClear,
              "aria-label": t("composer.searchClear"),
              disabled: busy,
              onClick: function () {
                setQuery("");
                if (searchRef.current !== null && searchRef.current.focus) searchRef.current.focus();
              }
            }, icon("IconCloseFillRegular", {})) : null
          ));
        }
        if (loading) paneChildren.push(h("div", { key: "s", className: C !== null ? C.status : undefined, style: C === null ? S.boxHint : undefined }, t("composer.refreshing")));
        if (failures.length > 0) {
          paneChildren.push(h("div", { key: "w", className: C !== null ? C.warning : undefined, style: C === null ? S.failure : undefined },
            h("span", null, failures.map(function (f) { return f.name + ": " + f.message; }).join(" · "))));
        }
        if (filteredGroups.length === 0) {
          if (!loading) paneChildren.push(h("div", { key: "e", className: C !== null ? C.empty : undefined, style: C === null ? S.menuEmpty : undefined },
            searchQuery !== "" ? t("composer.searchEmpty") : t("composer.empty")));
        } else {
          paneChildren.push(h("div", {
            key: "g",
            className: C !== null ? cx(C.groups, "scrollable") : undefined,
            style: C === null ? S.fallbackGroups : undefined
          }, groupNodes));
        }
      }

      /* The shipped menus draw their surface through the MenuSurface primitive
         (translucent fill + backdrop blur + radius; the `_menu` class only adds
         geometry). Rendering through it is what makes the frost identical — a
         translucent fill without the blur reads as "see-through", not "frosted".
         Without the primitive, fall back to resolving the menu token from
         <body> and painting it inline (the pre-0.2 workaround). */
      const menuProps = {
        ref: menuRef,
        id: idRef.current + "-menu",
        className: C !== null ? C.menu : undefined,
        style: menuPos !== null ? menuPos : MEASURE_STYLE,
        role: "menu",
        "aria-label": t("composer.title"),
        "aria-busy": loading || busy
      };
      const menu = MENU_SURFACE !== null
        ? h(MENU_SURFACE, menuProps, paneChildren)
        : h("div", Object.assign({}, menuProps, {
            style: Object.assign({
              background: (function () {
                try {
                  const v = getComputedStyle(document.body).getPropertyValue("--dsw-specific-menu").trim();
                  if (v.length > 0) return v;
                } catch (e) {}
                return "#26262a";
              })(),
              /* Frost parity with MenuSurface even on this path: the theme's
                 blur token, with the shipped value as fallback. Without it a
                 fallback menu reads see-through next to the shipped ones. */
              backdropFilter: "var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%))",
              WebkitBackdropFilter: "var(--dsw-menu-backdrop-filter, blur(40px) saturate(150%))",
              borderRadius: "var(--dsw-radius-lg, 16px)"
            },
              C !== null ? (menuPos !== null ? menuPos : MEASURE_STYLE)
                : Object.assign({}, S.fallbackMenu, menuPos !== null ? menuPos : MEASURE_STYLE))
          }), paneChildren);

      const toastNode = toast !== null && P !== null && isComponent(P.Toast)
        ? h(P.Toast, {
            key: toast.seq,
            text: toast.text,
            icon: icon("IconWarningOutlineRegular", {}),
            anchor: rootRef.current !== null && rootRef.current.closest ? rootRef.current.closest("[data-composer-card]") : null,
            onDone: function () { setToast(null); }
          })
        : null;
      return rootDiv([trigger, ReactDOM.createPortal(menu, document.body), toastNode]);
    }

    /* ------------- B. one provider card's model order editor ------------------ */
    /* Owner props: { provider, configured, keyConfigured }. Injected: store, namespace, mutate, t. */
    function ProviderModelOrder(props) {
      const C = resolveOfficialClasses();
      ensureOwnStyles(C);
      const entry = props.provider;
      const store = props.store;
      const namespace = props.namespace;
      const mutate = props.mutate;
      const t = props.t;

      const snap = useSyncExternalStore(
        function (fn) { return store.subscribe(fn); },
        function () { return store.getSnapshot(); }
      );
      const view = snap ? snap.view : undefined;
      const writable = !!(view && view.writable);
      const nsView = namespaceView(view, namespace);
      const providerId = entry ? entry.provider : undefined;
      const layer = providerLayer(nsView);
      const resolved = (nsView && nsView.value && nsView.value.providers) || {};
      const row = providerId !== undefined ? (layer[providerId] || resolved[providerId]) : undefined;
      const models = (row && row.models) || [];
      const baseIds = models.map(function (m) { return m.id; });
      const sourceKey = baseIds.join("|");
      const byId = {};
      for (let i = 0; i < models.length; i++) byId[models[i].id] = models[i];

      const orderState = useState(null);
      const order = orderState[0];
      const setOrder = orderState[1];
      const savingState = useState(false);
      const saving = savingState[0];
      const setSaving = savingState[1];
      const notePair = useNote();
      const note = notePair[0];
      const setNote = notePair[1];
      const expandState = useState(false);
      const expanded = expandState[0];
      const setExpanded = expandState[1];

      useEffect(function () { setOrder(null); }, [providerId, sourceKey]);

      const ids = order === null ? baseIds : order;
      const dirty = order !== null && order.join("|") !== sourceKey;

      function commit(next) {
        if (next.join("|") === baseIds.join("|")) { setOrder(null); return; }
        setOrder(next);
        if (!writable || saving) return;
        setSaving(true);
        const basePath = entry && entry.settingsPath ? entry.settingsPath.slice() : ["providers", providerId];
        const path = basePath.concat(["models"]);
        const revision = nsView ? nsView.revision : undefined;
        let pending;
        try {
          pending = mutate([{ op: "set", path: path, value: next.map(function (id) { return byId[id]; }) }], revision);
        } catch (e) {
          setSaving(false);
          setNote(String((e && e.message) || e));
          setTimeout(function () { setNote(null); }, 4000);
          return;
        }
        Promise.resolve(pending).then(function (res) {
          setSaving(false);
          if (res && res.ok) { setOrder(null); setNote("ok"); }
          else setNote((res && res.error && res.error.message) || "save failed");
          setTimeout(function () { setNote(null); }, 2600);
        }, function (err) {
          setSaving(false);
          setNote(String((err && err.message) || err));
          setTimeout(function () { setNote(null); }, 2600);
        });
      }

      /* The embedded list also renders a lone model, so expanding a single-model
         provider shows what it holds instead of nothing. */
      const minModels = props.embedded === true ? 1 : 2;
      if (!entry || models.length < minModels) return null;

      /* Embedded mode: the footer panel owns the surrounding provider row and its
         expand state, so only the draggable model list is rendered here. */
      if (props.embedded === true) {
        return h(DragList, {
          ids: ids,
          disabled: !writable || saving,
          onCommit: commit,
          render: function (id, index, dragProps) {
            const model = byId[id];
            return h("div", {
              key: id,
              draggable: dragProps.draggable,
              "data-mo": "model-row",
              "data-mo-id": id,
              "data-mo-provider": String(providerId),
              tabIndex: -1,
              onDragStart: dragProps.onDragStart,
              onDragOver: dragProps.onDragOver,
              onDragEnd: dragProps.onDragEnd,
              onDrop: dragProps.onDrop,
              className: C !== null ? cx(C.option, "dsh-mo-model") : "dsh-mo-model",
              style: dragProps.dragging
                ? (C !== null ? S.rowDraggingOnly : Object.assign({}, S.row, S.rowDragging))
                : (C !== null ? undefined : S.row)
            },
              
              h("span", { key: "n", className: C !== null ? C.optionCopy : undefined, style: C === null ? { flex: "1 1 auto", minWidth: 0, display: "flex" } : undefined },
                h("span", { className: C !== null ? C.modelName : undefined, style: C === null ? S.rowName : undefined }, (model && (model.name || model.id)) || id))
            );
          }
        });
      }

      /* Header doubles as the collapse control, drawn by the shipped `cell` row.
         Status notes ride the header's right edge so the list never reflows. */
      const headChildren = [
        h("span", { key: "l", className: C !== null ? C.cellLabel : undefined, style: C === null ? S.boxTitle : undefined }, t("order.title")),
        h("span", { key: "v", className: C !== null ? C.cellValue : undefined, style: C === null ? S.boxHint : undefined }, saving ? t("order.saving") : t("order.hint"))
      ];
      const notes = [];
      if (!writable) notes.push(h("span", { key: "ro", style: S.dirty }, t("order.readonly")));
      if (dirty) notes.push(h("span", { key: "d", style: S.dirty }, t("order.unsaved")));
      if (note === "ok") notes.push(h("span", { key: "ok", style: S.ok }, t("order.saved")));
      else if (note !== null) notes.push(h("span", { key: "n", style: S.dirty }, note));
      for (let i = 0; i < notes.length; i++) headChildren.push(notes[i]);
      const headChevron = icon("IconChevronRightOutlineRegular", {
        key: "c",
        className: C !== null ? cx(C.cellChevron, "dsh-mo-chev") : "dsh-mo-chev",
        style: C === null ? S.groupChevron : undefined
      });
      if (headChevron !== null) headChildren.push(headChevron);

      const head = h("button", {
        type: "button",
        className: C !== null ? cx(C.cell, "dsh-mo-head") : "dsh-mo-head",
        style: C === null ? S.boxHead : undefined,
        "aria-expanded": expanded,
        onClick: function () { setExpanded(!expanded); }
      }, headChildren);

      const list = h(DragList, {
        ids: ids,
        disabled: !writable || saving,
        onCommit: commit,
        render: function (id, index, dragProps) {
          const model = byId[id];
          return h("div", {
            key: id,
            draggable: dragProps.draggable,
            "data-mo": "model-row",
            "data-mo-id": id,
            "data-mo-provider": String(providerId),
            tabIndex: -1,
            onDragStart: dragProps.onDragStart,
            onDragOver: dragProps.onDragOver,
            onDragEnd: dragProps.onDragEnd,
            onDrop: dragProps.onDrop,
            className: C !== null ? cx(C.option, "dsh-mo-row") : undefined,
            style: dragProps.dragging
              ? (C !== null ? S.rowDraggingOnly : Object.assign({}, S.row, S.rowDragging))
              : (C !== null ? undefined : S.row)
          },
            
            h("span", { key: "n", className: C !== null ? C.optionCopy : undefined, style: C === null ? undefined : { flex: "1 1 auto", minWidth: 0, display: "flex" } },
              h("span", { className: C !== null ? C.modelName : undefined, style: C === null ? S.rowName : undefined }, (model && (model.name || model.id)) || id))
          );
        }
      });

      return h("div", { style: S.box }, head, expanded ? list : null);
    }

    /* ------------- C. provider order panel (models page footer) --------------- */
    /* Provider order is a DISPLAY preference owned by this plugin: the settings
       document stores `providers` as a record whose key order the host normalises
       away (verified with both a whole-record `set` and an `unset`+`set` pair), so
       the order cannot live there. It is kept per browser and applied to the
       composer menu this plugin renders. */
    const ORDER_STORAGE_KEY = "dsh-model-organizer.providerOrder";

    function readProviderOrder() {
      try {
        const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
        if (raw === null) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const out = [];
        for (let i = 0; i < parsed.length; i++) if (typeof parsed[i] === "string") out.push(parsed[i]);
        return out;
      } catch (e) { return []; }
    }

    function writeProviderOrder(ids) {
      try { window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(ids)); } catch (e) {}
    }

    /* The page's switches. DSH's pi-ai schema has no enabled/disabled field, so a
       switch cannot be written into the config without lying about it; these sets are
       the plugin's own "keep it out of my pickers" list, stored next to the order. */
    const HIDDEN_PROVIDERS_KEY = "dsh-model-organizer.hiddenProviders";
    const HIDDEN_MODELS_KEY = "dsh-model-organizer.hiddenModels";

    function readHidden(key) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return {};
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        const out = {};
        for (const name in parsed) if (parsed[name] === true) out[name] = true;
        return out;
      } catch (e) { return {}; }
    }

    function writeHidden(key, map) {
      try {
        const out = {};
        for (const name in map) if (map[name] === true) out[name] = true;
        window.localStorage.setItem(key, JSON.stringify(out));
      } catch (e) {}
    }

    function hiddenModelKey(provider, id) { return providerKey(provider) + "/" + String(id); }

    /* Which routes/models the pickers show, given the settings page's switches. Pure on
       purpose: the composer menu is host-side, and this is the only honest way to pin
       "the switch actually removes the row from the picker".
       A hidden entry never disappears from underneath the ACTIVE selection, and a list
       that would come out empty falls back to the full one (an empty menu is worse than
       an unfiltered one). */
    function visibleGroupsFor(groups, current, hidden) {
      const hiddenProviders = (hidden && hidden.providers) || {};
      const hiddenModels = (hidden && hidden.models) || {};
      const currentProvider = current !== null && current !== undefined && typeof current.provider === "string" ? providerKey(current.provider) : null;
      const currentModel = current !== null && current !== undefined ? (current.id !== undefined ? current.id : current.model) : undefined;
      const out = [];
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const owner = providerKey(group.id);
        const holdsCurrent = currentProvider !== null && owner === currentProvider;
        if (hiddenProviders[owner] === true && !holdsCurrent) continue;
        const models = [];
        for (let k = 0; k < group.models.length; k++) {
          const model = group.models[k];
          if (hiddenModels[hiddenModelKey(group.id, model.id)] === true && !(holdsCurrent && model.id === currentModel)) continue;
          models.push(model);
        }
        if (models.length === 0) continue;
        const copy = {};
        for (const name in group) copy[name] = group[name];
        copy.models = models;
        out.push(copy);
      }
      return out.length === 0 ? groups : out;
    }

    const PANEL_POS_KEY = "dsh-model-organizer.panelPos";


    function readPanelPos() {
      try {
        const raw = window.localStorage.getItem(PANEL_POS_KEY);
        if (raw === null) return null;
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== "object") return null;
        if (typeof parsed.left !== "number" || typeof parsed.top !== "number") return null;
        return { left: parsed.left, top: parsed.top };
      } catch (e) { return null; }
    }

    function writePanelPos(pos) {
      try { window.localStorage.setItem(PANEL_POS_KEY, JSON.stringify(pos)); } catch (e) {}
    }


    /* Provider ids come from two different worlds: the Settings page states them plainly
       ("amd"), while the composer menu reads the host's model directory, whose ids may be
       route ids ("llm-pi-ai/amd"). Comparing the last path segment makes the two match. */
    function providerKey(id) {
      const text = String(id);
      const cut = text.lastIndexOf("/");
      return cut === -1 ? text : text.slice(cut + 1);
    }

    /* Stored order first, then everything else in document order — or the other way
       round when `unknownFirst` is set. The composer menu wants unknownFirst: an id no
       stored preference mentions is a provider this plugin does not manage (the shipped
       ones), and those belong on top, exactly like the Settings page pins its unlisted
       cards. */
    function applyProviderOrder(ids, preferred, unknownFirst) {
      if (preferred.length === 0) return ids;
      const rank = {};
      for (let i = 0; i < preferred.length; i++) rank[providerKey(preferred[i])] = i;
      const known = [];
      const rest = [];
      for (let i = 0; i < ids.length; i++) {
        if (rank[providerKey(ids[i])] === undefined) rest.push(ids[i]);
        else known.push(ids[i]);
      }
      known.sort(function (a, b) { return rank[providerKey(a)] - rank[providerKey(b)]; });
      return unknownFirst === true ? rest.concat(known) : known.concat(rest);
    }

    function cellText(node) { return (node.textContent || "").trim(); }

    /* The SHIPPED row's own label, from the RAW entries view (our shadow hides it from
       entriesOfSlot). Used only as a second anchor when deciding whether the settings
       panel is open: our own cell must never be the sole witness. */
    function shippedSectionLabel(slots, id, own) {
      try {
        const rows = slots.entries("settings.section");
        for (let i = 0; i < rows.length; i++) {
          const options = rows[i] && rows[i].options;
          if (options === undefined || options === null || options.id !== id) continue;
          if (typeof options.label !== "function") continue;
          const text = options.label();
          if (typeof text !== "string") continue;
          const trimmed = text.trim();
          if (trimmed !== "" && trimmed !== own) return trimmed;
        }
      } catch (e) {}
      return null;
    }

    /* The SHIPPED entry's priority for a cell. Winning it means being the first live entry
       in priority order — ascending — so `shipped - 1` wins it and `shipped + 1` hands it
       back. Hard-coding -1 would silently lose the default the day the shipped entry is not
       registered at 0 (which is exactly why the default has to be relative). */
    function shippedSectionPriority(slots, id, own) {
      let best = null;
      try {
        const rows = slots.entries("settings.section");
        for (let i = 0; i < rows.length; i++) {
          const options = rows[i] && rows[i].options;
          if (options === undefined || options === null || options.id !== id) continue;
          if (typeof options.label !== "function") continue;
          const text = options.label();
          if (typeof text === "string" && text.trim() === own) continue;   /* ours */
          const value = typeof options.priority === "number" ? options.priority : 0;
          if (best === null || value < best) best = value;
        }
      } catch (e) { return 0; }
      return best === null ? 0 : best;
    }

    /* The settings nav: the only sibling-button group holding BOTH labels. Shared by the
       cross-links and by the takeover, which hides our own spare row. */

    function navGroups() {
      const groups = new Map();
      try {
        if (typeof document === "undefined") return groups;
        const cells = document.querySelectorAll("button");
        for (let i = 0; i < cells.length; i++) {
          const parent = cells[i].parentElement;
          if (parent === undefined || parent === null) continue;
          const list = groups.get(parent);
          if (list === undefined) groups.set(parent, [cells[i]]);
          else list.push(cells[i]);
        }
      } catch (e) {}
      return groups;
    }

    /* Cells WE hid, with the value to put back. A list, not a single node: both rows of the
       shadowed id carry the same React key, so React may reuse a node we hid for the
       SHIPPED row — the repair is to notice the label changed and restore that node. */
    let hiddenNavCells = [];
    /* The watcher runs for the entry's whole lifetime: our spare cell stays hidden in BOTH
       states, so there is no "stop watching" state any more. */

    function showOwnNavCell() {
      for (let i = 0; i < hiddenNavCells.length; i++) {
        const entry = hiddenNavCells[i];
        try { entry.node.style.display = entry.display === "none" ? "" : entry.display; } catch (e) {}
      }
      hiddenNavCells = [];
    }

    /* One invariant while the shadow is in place: the ONLY hidden nav cell is the one
       carrying our label. Repairs both directions — a node React reused for the shipped
       row is put back, and a rebuilt cell of ours is hidden again. */
    /* The settings nav: the list holding our own label — or, when React reused that node
       for the shipped row (both rows carry the same key), the list still holding a node we
       hid. Without that second clue the reused node would stay hidden forever, which is
       exactly the "the shipped row disappeared" bug seen in the wild. */
    function navGroupFor(label) {
      let byLabel = null;
      let byHidden = null;
      navGroups().forEach(function (nodes) {
        if (nodes.length < 4) return;
        for (let i = 0; i < nodes.length; i++) {
          if (byLabel === null && cellText(nodes[i]) === label) byLabel = nodes;
          if (byHidden === null) {
            for (let k = 0; k < hiddenNavCells.length; k++) {
              if (hiddenNavCells[k].node === nodes[i]) { byHidden = nodes; break; }
            }
          }
        }
      });
      return byLabel === null ? byHidden : byLabel;
    }

    function hideOwnNavCell(label) {
      const group = navGroupFor(label);
      if (group === null) return false;
      const mine = [];
      for (let i = 0; i < group.length; i++) if (cellText(group[i]) === label) mine.push(group[i]);
      for (let i = hiddenNavCells.length - 1; i >= 0; i--) {
        const entry = hiddenNavCells[i];
        let stillOurs = false;
        for (let k = 0; k < mine.length; k++) if (mine[k] === entry.node) stillOurs = true;
        if (stillOurs) continue;
        try { entry.node.style.display = entry.display === "none" ? "" : entry.display; } catch (e) {}
        hiddenNavCells.splice(i, 1);
      }
      for (let i = 0; i < mine.length; i++) {
        if (mine[i].style.display === "none") continue;
        hiddenNavCells.push({ node: mine[i], display: mine[i].style.display });
        mine[i].style.display = "none";
      }
      return true;
    }

    let navObserver = null;

    /* The invariant, checked against the DOM rather than against what we did earlier:
       every cell carrying our label is hidden, and no other cell is. A node React reused
       for the shipped row breaks it, and so does a freshly rendered spare cell. */
    function ownNavCellHidden(label) {
      const group = navGroupFor(label);
      if (group === null) return false;
      let mine = 0;
      for (let i = 0; i < group.length; i++) {
        if (cellText(group[i]) === label) {
          if (group[i].style.display !== "none") return false;
          mine++;
        } else if (group[i].style.display === "none") {
          return false;
        }
      }
      return mine > 0;
    }

    /* The nav does not exist while the settings panel is closed, and React may rebuild the
       cells (both rows share the id, hence the same key), so one-shot hiding is not
       enough: re-apply on every relevant DOM change until the switch goes off. */
    function ensureOwnNavCellHidden(label) {
      if (ownNavCellHidden(label)) return true;
      return hideOwnNavCell(label);
    }

    /* Is the settings panel open? The nav only exists while it is, and it is recognised by
       containing a known section label — ours OR the shipped one, never ours alone (a
       re-render can drop our cell for a frame while React rebuilds it). */
    function settingsPanelOpen(slots, own) {
      const shipped = shippedSectionLabel(slots, "models", own);
      let open = false;
      navGroups().forEach(function (nodes) {
        if (open || nodes.length < 4) return;
        for (let i = 0; i < nodes.length; i++) {
          const text = cellText(nodes[i]);
          if (text === own || (shipped !== null && text === shipped)) { open = true; return; }
        }
      });
      return open;
    }

    let navWasOpen = false;

    /* Two jobs on every relevant DOM change:
       1. keep our spare cell hidden (the invariant);
       2. notice the panel CLOSING, and hand the row back to this plugin then — the
          hand-back is a decision for one visit, so re-opening settings shows this page
          again without any persistence. */
    function onNavChanged(label, slots, onClosed) {
      const open = settingsPanelOpen(slots, label);
      if (open) ensureOwnNavCellHidden(label);
      else if (navWasOpen === true && typeof onClosed === "function") onClosed();
      navWasOpen = open;
    }

    function watchOwnNavCell(label, slots, onClosed) {
      if (navObserver !== null) return;
      try {
        if (typeof MutationObserver !== "function" || typeof document === "undefined" || document.body === null) return;
        navObserver = new MutationObserver(function () { onNavChanged(label, slots, onClosed); });
        navObserver.observe(document.body, { childList: true, subtree: true });
      } catch (e) { navObserver = null; }
    }

    function unwatchOwnNavCell() {
      if (navObserver === null) return;
      try { navObserver.disconnect(); } catch (e) {}
      navObserver = null;
    }

    /* The ledger bump that follows a registration re-renders the nav, hence a frame. */
    function nextFrame(fn) {
      try {
        if (typeof requestAnimationFrame === "function") { requestAnimationFrame(fn); return; }
      } catch (e) {}
      try { setTimeout(fn, 0); } catch (e) {}
    }

    /* A seat entry that throws is silently abdicated, so "my panel is missing" and
       "my panel threw" look identical from the page. This boundary turns the throw
       into one visible line, so the failure can be reported instead of guessed. */
    class PanelBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { err: null };
      }
      static getDerivedStateFromError(err) {
        return { err: err };
      }
      render() {
        if (this.state.err !== null) {
          const message = String((this.state.err && this.state.err.message) || this.state.err);
          return h("div", {
            "data-mo": "panel-error",
            style: {
              margin: "8px 0", padding: "6px 10px", borderRadius: 8, fontSize: 12, lineHeight: "18px",
              whiteSpace: "pre-wrap",
              border: "1px solid var(--dsw-alias-state-error-primary, #f85149)",
              color: "var(--dsw-alias-state-error-primary, #f85149)"
            }
          }, "dsh-model-organizer 渲染失败：" + message);
        }
        return this.props.children;
      }
    }

    function ProviderOrderPanelGuarded(props) {
      return h(PanelBoundary, null, h(ProviderOrderPanel, props));
    }

    function ProviderGroupedModelSelectGuarded(props) {
      return h(PanelBoundary, null, h(ProviderGroupedModelSelect, props));
    }

    function ProviderOrderPanel(props) {
      const C = resolveOfficialClasses();
      ensureOwnStyles(C);
      const store = props.store;
      const namespace = props.namespace;
      const mutate = props.mutate;
      const t = props.t;

      const snap = useSyncExternalStore(
        function (fn) { return store.subscribe(fn); },
        function () { return store.getSnapshot(); }
      );
      const view = snap ? snap.view : undefined;
      const nsView = namespaceView(view, namespace);
      const display = orderLayer(nsView) || {};
      const documentIds = Object.keys(display);
      const storedState = useState(readProviderOrder);
      const stored = storedState[0];
      const setStored = storedState[1];
      const openState = useState({});
      const openMap = openState[0];
      const setOpenMap = openState[1];
      /* The panel always mounts expanded: a remembered collapse is
         indistinguishable from "collapsed by default" on the next page open. */
      const panelState = useState(true);
      const panelOpen = panelState[0];
      const setPanelOpen = panelState[1];
      const posState = useState(readPanelPos);
      const panelPos = posState[0];
      const setPanelPos = posState[1];
      const panelRef = useRef(null);
      const pressRef = useRef(null);
      const suppressClick = useRef(false);
      const movingState = useState(false);
      const moving = movingState[0];
      const setMoving = movingState[1];
      const baseIds = applyProviderOrder(documentIds, stored);
      const sourceKey = baseIds.join("|");

      const orderState = useState(null);
      const order = orderState[0];
      const setOrder = orderState[1];
      const savingState = useState(false);
      const saving = savingState[0];
      const setSaving = savingState[1];
      const notePair = useNote();
      const note = notePair[0];
      const setNote = notePair[1];

      useEffect(function () { setOrder(null); }, [sourceKey]);

      /* Mirror the saved order onto the settings page's provider cards: the
         shipped list is a flex column, so CSS `order` re-ranks it in place.
         Cards carry no provider identity in the DOM — match through the
         displayName text each card renders. */
      const seatRef = useRef(null);

      /* The seat may sit inside slot wrappers between it and the section — climb until a
         container actually holds the card list. */
      const seatCardList = function () {
        let el = seatRef.current;
        for (let hop = 0; hop < 6 && el !== null; hop++) {
          el = el.parentElement;
          if (el === null) return null;
          const list = el.querySelector("ul");
          if (list !== null) return list;
        }
        return null;
      };

      const mirrorCards = function () {
        try {
          const list = seatCardList();
          if (list === null) return;
          const byName = {};
          for (const id in display) {
            const profile = display[id] || {};
            const name = profile.displayName || id;
            if (byName[name] === undefined) byName[name] = id;
          }
          /* No usable identity mapping — leave the cards alone rather than
             pretending to reorder. */
          if (Object.keys(byName).length === 0) return;
          const rank = {};
          baseIds.forEach(function (id, index) { rank[id] = index + 1; });
          /* Configured providers take ranks 1..N. Anything else — the shipped DeepSeek
             card, the add-provider draft — keeps the default order 0, which sorts it
             ahead of the ranked cards. Clearing the inline value also drops whatever an
             earlier pass wrote there, so a card that used to be unranked and is ranked
             now (or the reverse) never keeps a stale position. */
          for (let i = 0; i < list.children.length; i++) {
            const li = list.children[i];
            const nameEl = li.querySelector ? li.querySelector('[class*="rowName"]') : null;
            const name = nameEl !== null ? nameEl.textContent : null;
            const id = name !== null && byName[name] !== undefined ? byName[name] : null;
            if (id !== null && rank[id] !== undefined) li.style.order = String(rank[id]);
            else li.style.order = "";
          }
        } catch (e) {}
      };

      useEffect(function () {
        mirrorCards();
        /* The card list is rendered asynchronously and React may replace the list node
           itself, so the observer watches the section wrapper that holds it — two levels
           above the seat, where the climb above finds the card list. That node exists
           from the first paint and survives the list being swapped out. Every pass
           re-resolves the list by climbing, mutations are coalesced to one pass per
           frame, and a frame plus one delayed pass cover the first paint, where the cards
           routinely do not exist yet. */
        const frame = requestAnimationFrame(function () { mirrorCards(); });
        const timer = setTimeout(function () { mirrorCards(); }, 300);
        const stop = function () { cancelAnimationFrame(frame); clearTimeout(timer); };
        const seat = seatRef.current;
        const section = seat !== null && seat.parentElement !== null ? seat.parentElement.parentElement : null;
        if (section === null || typeof MutationObserver !== "function") return stop;
        let queued = false;
        const observer = new MutationObserver(function () {
          if (queued) return;
          queued = true;
          requestAnimationFrame(function () { queued = false; mirrorCards(); });
        });
        observer.observe(section, { childList: true, subtree: true });
        return function () { observer.disconnect(); stop(); };
      }, [sourceKey, stored]);

      useLayoutEffect(function () {
        if (panelPos !== null || panelRef.current === null) return;
        const rect = panelRef.current.getBoundingClientRect();
        setPanelPos({ left: Math.round(rect.left), top: Math.round(rect.top) });
      }, [panelPos, panelOpen]);

      const ids = order === null ? baseIds : order;

      /* The shipped provider cards are left exactly as React renders them. Ordering used
         to be mirrored onto them with inline `order`; that is gone — this plugin adds a
         floating panel to the Models page and nothing else. */
      function commit(next) {
        if (next.join("|") === baseIds.join("|")) { setOrder(null); return; }
        writeProviderOrder(next);
        setStored(next);
        setOrder(null);
        setNote("ok");
        setTimeout(function () { setNote(null); }, 2200);
      }

      if (baseIds.length < 2) return null;

      const notes = [];
      if (note === "ok") notes.push(h("span", { key: "ok", style: S.ok }, t("providers.saved")));
      else if (note !== null) notes.push(h("span", { key: "n", style: S.dirty }, note));

      /* Same shipped-cell header as every other row in this page: the title, the
         hint, then any status note on the right edge. */
      const headChildren = [
        h("span", { key: "l", className: C !== null ? C.cellLabel : undefined, style: C === null ? S.boxTitle : undefined }, t("providers.title")),
        /* Sits right of the title, inside the head row. The head is both the collapse
           control and the drag surface, so every pointer event stops here. */
        h("button", {
          key: "link",
          "data-mo": "panel-open-organizer",
          type: "button",
          title: t("panel.openOrganizerHint"),
          onPointerDown: function (event) { event.stopPropagation(); },
          onPointerUp: function (event) { event.stopPropagation(); },
          /* One button, one meaning: going to this plugin's page IS taking the shipped
             row over — no separate switch, no second state to explain. */
          onClick: function (event) {
            event.stopPropagation();
            const shared = props.bridge;
            if (shared !== undefined && shared !== null && typeof shared.setTakeover === "function") shared.setTakeover(true);
          },
          style: S.linkPill
        }, t("panel.openOrganizer")),
      ];
      /* Status notes sit immediately after the title; the hint keeps the right edge. */
      for (let i = 0; i < notes.length; i++) headChildren.push(notes[i]);
      headChildren.push(h("span", { key: "v", className: C !== null ? C.cellValue : undefined, style: C === null ? S.boxHint : undefined }, t("providers.hint")));
      /* One row, two gestures — exactly like the rows below: a press that does not
         travel is a CLICK (toggle), a press that travels is a DRAG (move the panel).
         Arming on MOVEMENT only means a slow click still toggles; pinning the measured
         top-left on arming keeps the first movement from jumping. */
      function armMove(token) {
        if (token.armed) return;
        token.armed = true;
        setMoving(true);
        setPanelPos(token.base);
      }

      function moveDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        const rect = panelRef.current ? panelRef.current.getBoundingClientRect() : null;
        const base = rect === null ? { left: 0, top: 0 } : { left: rect.left, top: rect.top };
        const token = { armed: false, moved: false, base: base, start: { x: event.clientX, y: event.clientY } };
        pressRef.current = token;
        try { if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId); } catch (e) {}
        try { if (event.currentTarget.blur) event.currentTarget.blur(); } catch (e) {}
      }

      function moveMove(event) {
        const token = pressRef.current;
        if (token === null) return;
        if (!token.armed) {
          const travelled = Math.abs(event.clientX - token.start.x) + Math.abs(event.clientY - token.start.y);
          if (travelled <= 6) return;
          armMove(token);
        }
        event.preventDefault();
        token.moved = true;
        const width = panelRef.current ? panelRef.current.offsetWidth : 380;
        const height = panelRef.current ? panelRef.current.offsetHeight : 120;
        const left = Math.min(Math.max(token.base.left + (event.clientX - token.start.x), 4), Math.max(4, window.innerWidth - width - 4));
        const top = Math.min(Math.max(token.base.top + (event.clientY - token.start.y), 4), Math.max(4, window.innerHeight - height - 4));
        setPanelPos({ left: left, top: top });
      }

      function moveUp() {
        const token = pressRef.current;
        if (token === null) return;
        if (token.armed) {
          if (panelRef.current) {
            const rect = panelRef.current.getBoundingClientRect();
            writePanelPos({ left: Math.round(rect.left), top: Math.round(rect.top) });
          }
          /* The release after a move also emits a click; swallow exactly that one so
             dragging the panel never collapses it. */
          suppressClick.current = token.moved === true;
        } else {
          /* No travel and no hold: a plain click toggles. */
          setPanelOpen(!panelOpen);
        }
        setMoving(false);
        pressRef.current = null;
      }



      /* The whole header row is the collapse control (no separate arrow): hover,
         pointer cursor and keyboard activation all come from this one element. */
      const head = h("div", {
        role: "button",
        tabIndex: 0,
        className: cx(C !== null ? C.cell : undefined, "dsh-mo-head", "dsh-mo-panelhead", moving ? "dsh-mo-moving" : undefined),
        style: C !== null ? S.panelHeadCell : S.boxHead,
        title: panelOpen ? t("providers.collapse") : t("providers.expand"),
        onPointerDown: moveDown,
        onPointerMove: moveMove,
        onPointerUp: moveUp,
        onPointerCancel: moveUp,
        onClick: function (event) {
          if (suppressClick.current) { suppressClick.current = false; return; }
          if (event && event.stopPropagation) event.stopPropagation();
        },
        onKeyDown: function (event) {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setPanelOpen(!panelOpen);
        }
      }, headChildren);


      const list = h(DragList, {
        ids: ids,
        disabled: false,
        onCommit: commit,
        render: function (id, index, dragProps) {
          const profile = display[id] || {};
          const count = (profile.models || []).length;
          const isOpen = openMap[id] === true;
          const rowChildren = [
            
            h("span", { key: "n", className: C !== null ? C.cellLabel : undefined, style: C === null ? S.rowName : undefined }, profile.displayName || id),
            h("span", { key: "c", className: C !== null ? C.cellValue : undefined, style: C === null ? S.rowMeta : undefined }, count + " " + t("composer.count"))
          ];
          const rowChevron = icon("IconChevronRightOutlineRegular", {
            key: "v",
            className: C !== null ? cx(C.cellChevron, "dsh-mo-chev") : "dsh-mo-chev",
            style: C === null ? S.groupChevron : undefined
          });
          if (rowChevron !== null) rowChildren.push(rowChevron);

          const row = h("div", {
            key: "row",
            draggable: dragProps.draggable,
            "data-mo": "provider-row",
            "data-mo-id": id,
            tabIndex: -1,
            role: "button",
            "aria-expanded": isOpen,
            onDragStart: dragProps.onDragStart,
            onDragOver: dragProps.onDragOver,
            onDragEnd: dragProps.onDragEnd,
            onDrop: dragProps.onDrop,
            onClick: function () {
              const next = {};
              for (const key in openMap) next[key] = openMap[key];
              next[id] = !(next[id] === true);
              setOpenMap(next);
            },
            className: C !== null ? cx(C.cell, "dsh-mo-head") : "dsh-mo-head",
            style: dragProps.dragging
              ? (C !== null ? S.rowDraggingOnly : Object.assign({}, S.row, S.rowDragging))
              : (C === null ? S.row : undefined)
          }, rowChildren);

          if (!isOpen || count < 1) return h("div", { key: id, style: S.providerGroup }, row);
          return h("div", { key: id, style: S.providerGroup }, row,
            h(ProviderModelOrder, {
              key: "models",
              provider: { provider: id, settingsPath: ["providers", id], settingsNs: namespace },
              store: store,
              namespace: namespace,
              mutate: mutate,
              t: t,
              embedded: true
            })
          );
        }
      });

      /* The resting place is the bottom-right corner; pinning its measured top-left
         once keeps that spot while making the panel top-anchored, so collapsing
         raises the bottom edge instead of dragging the header down. */
      const panelStyle = panelPos === null
        ? S.floatPanel
        : Object.assign({}, S.floatPanel, { left: panelPos.left, top: panelPos.top, right: "auto", bottom: "auto" });
      /* Original layout (header first, list below) with a TOP-anchored panel: the
         header never moves and collapsing pulls the bottom edge up. */
      /* Portalled to <body>: the footer seat lives deep inside the settings page, so a
         fixed panel there is trapped in that subtree's stacking context and any other
         plugin's floating widget paints over it. At body level the z-index is global. */
      /* The hidden in-place marker rides the seat (right after the card list),
         giving the mirror a stable anchor into the settings DOM. */
      return h(React.Fragment, null,
        h("div", { ref: seatRef, hidden: true, "data-mo": "seat-marker" }),
        ReactDOM.createPortal(
          h("div", { ref: panelRef, style: panelStyle, "data-mo": "panel" },
            head,
            panelOpen ? h("div", { style: S.floatBody }, list) : null
          ),
          document.body
        )
      );
    }

    /* --------------------------- C: the organizer page --------------------------- */
    /* A real settings page (`settings.section`, kind list) placed right after the
       shipped Models page. It is the plugin's own surface: providers and their
       models are edited here, dragged into the saved order, and their API key is
       written through the credentials service. The shipped page is NOT shadowed —
       both entries stay reachable from the nav, so this stays additive. The key
       itself never comes back: the credentials service only moves values inward. */

    /* Capacity spelling for the model rows: 1000000 → "1M", 262144 → "256K". */
    function formatCapacity(value) {
      if (typeof value !== "number" || !isFinite(value) || value <= 0) return "";
      if (value >= 1000000) return Math.round(value / 100000) / 10 + "M";
      if (value >= 1000) return Math.round(value / 1000) + "K";
      return String(value);
    }

    /* The shipped editor accepts "256K"/"1M" (K = 1000, M = 1000000) — the same
       vocabulary its own capacity fields document. Anything else is an error. */
    function parseCapacity(text) {
      if (text === undefined || text === null) return undefined;
      const bare = String(text).trim();
      if (bare === "") return undefined;
      const match = /^([0-9]+(?:\.[0-9]+)?)\s*([KkMm])?$/.exec(bare);
      if (match === null) return NaN;
      const scale = match[2] === undefined ? 1 : (match[2].toLowerCase() === "k" ? 1000 : 1000000);
      const value = Math.round(Number(match[1]) * scale);
      return Number.isSafeInteger(value) && value > 0 ? value : NaN;
    }

    /* One profile field the page may read but never guesses. */
    function profileString(profile, key) {
      const value = profile === null || profile === undefined ? undefined : profile[key];
      return typeof value === "string" ? value : "";
    }

    /* The shipped editor spells one label per protocol; an unknown value keeps its
       raw wire spelling instead of inventing a name for it. */
    const API_LABEL_KEYS = {
      "openai-completions": "protocol.completions",
      "openai-responses": "protocol.responses",
      "anthropic-messages": "protocol.messages"
    };

    /* The protocol ids the adapter accepts, in its own preference order. */
    const PROTOCOL_IDS = ["openai-completions", "openai-responses", "anthropic-messages"];

    function apiLabel(api, t) {
      if (typeof api !== "string" || api.length === 0) return "";
      const key = API_LABEL_KEYS[api];
      return key === undefined ? api : t(key);
    }

    /* The segment shows the adapter name only; the endpoint stays visible in the hint
       under the row, so three segments fit the settings column. */
    function apiShort(api, t) {
      const label = apiLabel(api, t);
      const at = label.indexOf(" (");
      return at === -1 ? label : label.slice(0, at);
    }

    /* A route the page may write a key for: the shipped derivation, so a key this
       page stores is the key the shipped page would read back. */
    function deriveKeyRef(provider) {
      return String(provider).toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_API_KEY";
    }

    /* The dot is a reading aid, never a claim: a profile that names a credential or a
       base URL is configured enough to be worth trying. */
    function profileConfigured(profile) {
      return !!(profile && (profile.apiKeyEnv || profile.baseURL));
    }

    /* Draft rows keep what the user typed (text), and only the save step parses. */
    function modelDraftRows(models) {
      return (models || []).map(function (model) {
        return {
          id: typeof model.id === "string" ? model.id : "",
          context: model.contextWindow === undefined ? "" : formatCapacity(model.contextWindow),
          maxTokens: model.maxTokens === undefined ? "" : formatCapacity(model.maxTokens),
          vision: Array.isArray(model.input) && model.input.indexOf("image") !== -1
        };
      });
    }

    /* Draft rows back to wire models, or an error message when the draft is not
       writable (an empty or repeated id, a bad capacity). */
    function modelsFromDraft(rows, t) {
      const seen = {};
      const out = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const id = String(row.id || "").trim();
        if (id === "") return { error: t("page.modelIdRequired") };
        if (seen[id] === true) return { error: t("page.modelIdDuplicate") };
        seen[id] = true;
        const contextWindow = parseCapacity(row.context);
        const maxTokens = parseCapacity(row.maxTokens);
        if (Number.isNaN(contextWindow) || Number.isNaN(maxTokens)) return { error: t("page.capacityInvalid") };
        /* This page treats the id as the display name: nothing writes `name`, so the
           host falls back to the id and one input covers both. */
        const entry = { id: id, input: row.vision === true ? ["text", "image"] : ["text"] };
        if (contextWindow !== undefined) entry.contextWindow = contextWindow;
        if (maxTokens !== undefined) entry.maxTokens = maxTokens;
        out.push(entry);
      }
      return { models: out };
    }

    function ModelsPage(props) {
      const C = resolveOfficialClasses();
      ensureOwnStyles(C);
      const store = props.store;
      const namespace = props.namespace;
      const mutate = props.mutate;
      const bridge = props.bridge || {};
      const t = props.t;

      /* The third argument keeps this component renderable outside a live DOM (the
         plugin's smoke harness uses it); the browser never reads it. */
      const snap = useSyncExternalStore(
        function (fn) { return store.subscribe(fn); },
        function () { return store.getSnapshot(); },
        function () { return store.getSnapshot(); }
      );
      const view = snap ? snap.view : undefined;
      const writable = !!(view && view.writable);
      const nsView = namespaceView(view, namespace);
      const revision = nsView ? nsView.revision : undefined;
      const providers = orderLayer(nsView) || {};
      const providerIds = applyProviderOrder(Object.keys(providers), readProviderOrder());
      const sourceKey = providerIds.join("|");

      const pickState = useState(null);
      const picked = pickState[0];
      const setPicked = pickState[1];
      const orderState = useState(null);
      const order = orderState[0];
      const setOrder = orderState[1];
      const fieldState = useState(null);
      const field = fieldState[0];
      const setField = fieldState[1];
      const keyState = useState("");
      const keyDraft = keyState[0];
      const setKeyDraft = keyState[1];
      const keyShownState = useState(false);
      const keyShown = keyShownState[0];
      const setKeyShown = keyShownState[1];
      const keyFactsState = useState(null);
      const keyFacts = keyFactsState[0];
      const setKeyFacts = keyFactsState[1];
      const rowsState = useState(null);
      const rows = rowsState[0];
      const setRows = rowsState[1];
      const busyState = useState("");
      const busy = busyState[0];
      const setBusy = busyState[1];
      /* The fetch picker's own state — the provider selection above already owns
         `pickState`, so this one keeps a distinct name. */
      const fetchPickState = useState(null);
      const picker = fetchPickState[0];
      const setPicker = fetchPickState[1];
      const catalogState = useState(null);
      const catalogIds = catalogState[0];
      const setCatalogIds = catalogState[1];
      /* The switch lives in the mount layer: flipping it re-registers this section under
         a different id, so the component must not hold that state itself. */
      const takeover = props.takeover === true;
      const setTakeover = props.setTakeover;

      const addState = useState(null);
      const addDialog = addState[0];
      const setAdd = addState[1];
      const hiddenState = useState(function () {
        return { providers: readHidden(HIDDEN_PROVIDERS_KEY), models: readHidden(HIDDEN_MODELS_KEY) };
      });
      const hidden = hiddenState[0];
      const setHidden = hiddenState[1];

      function toggleHidden(kind, key) {
        const next = Object.assign({}, kind === "provider" ? hidden.providers : hidden.models);
        if (next[key] === true) delete next[key]; else next[key] = true;
        writeHidden(kind === "provider" ? HIDDEN_PROVIDERS_KEY : HIDDEN_MODELS_KEY, next);
        setHidden(kind === "provider" ? { providers: next, models: hidden.models } : { providers: hidden.providers, models: next });
      }
      const notePair = useNote();
      const note = notePair[0];
      const setNote = notePair[1];

      /* A provider removed in the shipped page must not leave this page pointing at a
         route the configuration no longer holds; the same reset drops every draft. */
      useEffect(function () {
        setPicked(null); setOrder(null); setField(null); setRows(null); setKeyDraft(""); setKeyFacts(null);
      }, [sourceKey]);

      const ids = order === null ? providerIds : order;
      const current = picked !== null && providers[picked] !== undefined ? picked : (ids.length > 0 ? ids[0] : null);
      const profile = current === null ? null : providers[current] || {};
      const storedModels = profile === null ? [] : profile.models || [];
      const draftRows = rows !== null ? rows : modelDraftRows(storedModels);
      const currentKeyRef = current === null ? "" : (profileString(profile, "apiKeyEnv") || deriveKeyRef(current));

      /* One credential read per selection: the service only answers whether a value
         exists and whether it may be written, never the value. */
      useEffect(function () {
        const credentials = bridge.credentials;
        if (credentials === undefined || credentials === null || current === null) { setKeyFacts(null); return; }
        let live = true;
        try {
          Promise.resolve(credentials.describe([currentKeyRef])).then(function (response) {
            if (!live) return;
            const described = response && response.ok ? response.value[currentKeyRef] : undefined;
            setKeyFacts(described && typeof described === "object" ? described : { configured: false });
          }, function () { if (live) setKeyFacts(null); });
        } catch (e) { setKeyFacts(null); }
        return function () { live = false; };
      }, [current, currentKeyRef, bridge.credentials]);

      /* Which rows the shipped catalog owns. The directory answers it; a build without
         that namespace simply keeps one ungrouped list. */
      useEffect(function () {
        const llm = bridge.llm;
        if (llm === undefined || llm === null) return undefined;
        let live = true;
        try {
          Promise.resolve(llm.listConfigurableProviders()).then(function (response) {
            if (!live) return;
            const rows = response && response.ok && Array.isArray(response.value) ? response.value : [];
            const next = {};
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              if (row && typeof row.provider === "string" && row.declared !== true) next[row.provider] = true;
            }
            setCatalogIds(next);
          }, function () {});
        } catch (e) {}
        return function () { live = false; };
      }, [bridge.llm]);

      if (view === undefined || view === null) {
        return h("section", { "data-mo": "page", "data-mo-build": BUILD, style: S.pageRoot },
          h("p", { style: S.pageLoading }, t("page.loading")));
      }

      /* Nothing configured: one message beats an empty master/detail pair. */
      if (ids.length === 0) {
        return h("section", { "data-mo": "page", "data-mo-build": BUILD, style: S.pageRoot },
          h("header", { style: S.pageHead },
            h("h2", { style: S.pageTitle }, t("page.title")),
            h("p", { style: S.pageSubtitle }, t("page.subtitle"))),
          h("p", { style: S.pageEmpty }, t("page.empty")));
      }

      /* ------------------------------- writes ------------------------------- */
      function writeProvider(patch, done) {
        if (!writable) { setNote(t("page.readonly")); return; }
        const ops = [];
        for (const key in patch) {
          const value = patch[key];
          ops.push(value === undefined || value === ""
            ? { op: "unset", path: ["providers", current, key] }
            : { op: "set", path: ["providers", current, key], value: value });
        }
        let pending;
        try { pending = mutate(ops, revision); } catch (e) { setNote(String((e && e.message) || e)); return; }
        setBusy("field");
        Promise.resolve(pending).then(function (result) {
          setBusy("");
          if (result && result.ok) { setNote("ok"); if (done !== undefined) done(); }
          else setNote((result && result.error && result.error.message) || "save failed");
        }, function (error) { setBusy(""); setNote(String((error && error.message) || error)); });
      }

      function saveField(key) {
        const next = field === null ? null : field[key];
        const before = profileString(profile, key);
        if (next === null || next === undefined || next === before) { setField(null); return; }
        writeProvider({ [key]: next }, function () { setField(null); });
      }

      function saveModels() {
        const built = modelsFromDraft(draftRows, t);
        if (built.error !== undefined) { setNote(built.error); return; }
        if (!writable) { setNote(t("page.readonly")); return; }
        let pending;
        try {
          pending = mutate([{ op: "set", path: ["providers", current, "models"], value: built.models }], revision);
        } catch (e) { setNote(String((e && e.message) || e)); return; }
        setBusy("models");
        Promise.resolve(pending).then(function (result) {
          setBusy("");
          if (result && result.ok) { setNote("ok"); setRows(null); }
          else setNote((result && result.error && result.error.message) || "save failed");
        }, function (error) { setBusy(""); setNote(String((error && error.message) || error)); });
      }

      /* The shipped discovery, reached exactly like the official page does. Candidates
         go into a picker (the official interaction): nothing touches the draft until
         「添加所选」, which is what keeps a wide listing from being a cleanup chore. */
      function fetchModels() {
        const llm = bridge.llm;
        if (llm === undefined || llm === null) { setNote(t("page.fetchUnavailable")); return; }
        const request = { provider: current };
        const baseURL = profileString(profile, "baseURL");
        const api = profileString(profile, "api");
        if (baseURL !== "") request.baseURL = baseURL;
        if (api !== "") request.api = api;
        setBusy("fetch");
        Promise.resolve(llm.discoverModels(namespace, request)).then(function (response) {
          setBusy("");
          if (!response || !response.ok) {
            setNote((response && response.error && response.error.message) || "fetch failed");
            return;
          }
          const found = Array.isArray(response.value) ? response.value : [];
          const known = {};
          for (let i = 0; i < draftRows.length; i++) known[String(draftRows[i].id).trim()] = true;
          const candidates = [];
          const picked = {};
          for (let i = 0; i < found.length; i++) {
            const model = found[i];
            if (model === null || typeof model !== "object") continue;
            const id = typeof model.id === "string" ? model.id.trim() : "";
            if (id === "" || known[id] === true) continue;
            known[id] = true;
            candidates.push({
              id: id,
              context: model.contextWindow === undefined ? "" : formatCapacity(model.contextWindow),
              maxTokens: model.maxTokens === undefined ? "" : formatCapacity(model.maxTokens),
              vision: Array.isArray(model.inputModalities) && model.inputModalities.indexOf("image") !== -1
            });
            picked[id] = true;
          }
          if (candidates.length === 0) { setNote(t("page.fetchNone")); return; }
          setPicker({ rows: candidates, picked: picked, query: "" });
        }, function (error) { setBusy(""); setNote(String((error && error.message) || error)); });
      }

      /* A brand-new route: the profile and the key reference go in ONE mutate (one
         revision, so a concurrent edit cannot land between them), the secret goes to the
         credentials service, and the page then selects what it just created. */
      function createProvider() {
        const route = addDialog.route.trim();
        if (route === "") { setAdd(Object.assign({}, addDialog, { error: t("page.routeRequired") })); return; }
        if (!/^[A-Za-z0-9._-]+$/.test(route)) { setAdd(Object.assign({}, addDialog, { error: t("page.routeInvalid") })); return; }
        if (providers[route] !== undefined) { setAdd(Object.assign({}, addDialog, { error: t("page.routeTaken") })); return; }
        const displayName = addDialog.displayName.trim();
        const baseURL = addDialog.baseURL.trim();
        const profile = { api: addDialog.api };
        if (displayName !== "") profile.displayName = displayName;
        if (baseURL !== "") profile.baseURL = baseURL;
        const secret = addDialog.key.trim();
        const ref = deriveKeyRef(route);
        const ops = [{ op: "set", path: ["providers", route], value: profile }];
        if (secret !== "") ops.push({ op: "set", path: ["providers", route, "apiKeyEnv"], value: ref });
        setBusy("create");
        const failed = function (error) {
          setBusy("");
          setAdd(Object.assign({}, addDialog, { error: String((error && error.message) || error || t("page.createFailed")) }));
        };
        Promise.resolve(mutate(ops, revision)).then(function (result) {
          if (!result || !result.ok) { failed((result && result.error && result.error.message) || t("page.createFailed")); return; }
          const done = function () { setBusy(""); setAdd(null); setPicked(route); setField(null); setRows(null); };
          if (secret === "" || bridge.credentials === null || bridge.credentials === undefined) { done(); return; }
          Promise.resolve(bridge.credentials.set(ref, secret)).then(done, function (error) {
            setBusy("");
            setAdd(Object.assign({}, addDialog, { error: String((error && error.message) || error) }));
          });
        }, failed);
      }

      function saveKey() {
        const credentials = bridge.credentials;
        const secret = keyDraft.trim();
        if (secret === "") { setNote(t("page.keyPlaceholder")); return; }
        if (credentials === undefined || credentials === null) { setNote(t("page.keyUnavailable")); return; }
        setBusy("key");
        Promise.resolve(credentials.set(currentKeyRef, secret)).then(function (response) {
          if (!response || !response.ok) {
            setBusy("");
            setNote((response && response.error && response.error.message) || "save failed");
            return;
          }
          setKeyDraft("");
          /* A route that names no credential would never resolve the value we just
             stored, so the first save also points the profile at that reference. */
          const named = profileString(profile, "apiKeyEnv");
          if (named === "" ) writeProvider({ apiKeyEnv: currentKeyRef }, function () { setBusy(""); setKeyFacts({ configured: true }); });
          else { setBusy(""); setNote("ok"); setKeyFacts({ configured: true }); }
        }, function (error) { setBusy(""); setNote(String((error && error.message) || error)); });
      }

      function clearKey() {
        const credentials = bridge.credentials;
        if (credentials === undefined || credentials === null) { setNote(t("page.keyUnavailable")); return; }
        setBusy("key");
        Promise.resolve(credentials.unset(currentKeyRef)).then(function (response) {
          setBusy("");
          if (response && response.ok) { setNote("ok"); setKeyFacts({ configured: false }); }
          else setNote((response && response.error && response.error.message) || "save failed");
        }, function (error) { setBusy(""); setNote(String((error && error.message) || error)); });
      }

      /* ------------------------------ rail rows ----------------------------- */
      function sectionOf(id) {
        if (catalogIds === null) return "all";
        return catalogIds[id] === true ? "catalog" : "custom";
      }
      const rail = h("aside", { style: S.pageList, "aria-label": t("page.providers") },
        h(DragList, {
          ids: ids,
          disabled: false,
          onCommit: function (next) {
            setOrder(null);
            writeProviderOrder(next);
          },
          render: function (id, index, dragProps) {
            const entry = providers[id] || {};
            const count = (entry.models || []).length;
            const active = id === current;
            const section = sectionOf(id);
            const opensSection = index === 0 || sectionOf(ids[index - 1]) !== section;
            const header = opensSection
              ? h("div", { key: "group", style: S.pageGroup }, t(section === "catalog" ? "page.catalog" : (section === "custom" ? "page.custom" : "page.providers")))
              : null;
            const row = h("div", {
              key: id,
              "data-mo": "page-provider",
              "data-mo-id": id,
              role: "button",
              tabIndex: 0,
              "aria-current": active ? "true" : undefined,
              title: entry.displayName || id,
              draggable: dragProps.draggable,
              onDragStart: dragProps.onDragStart,
              onDragOver: dragProps.onDragOver,
              onDragEnd: dragProps.onDragEnd,
              onDrop: dragProps.onDrop,
              onClick: function () { setPicked(id); setField(null); setRows(null); },
              onKeyDown: function (event) {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setPicked(id); setField(null); setRows(null);
              },
              className: C !== null ? cx(C.cell, "dsh-mo-head") : "dsh-mo-head",
              /* Shipped classes resolved → NO inline background/cursor at all, so the
                 sheet's :hover tint and .dsh-mo-list .dsh-mo-head grab cursor apply
                 (exactly what the footer panel does). Only the current row marks
                 itself, and only with a box-shadow. */
              style: dragProps.dragging
                ? (C !== null ? S.rowDraggingOnly : Object.assign({}, S.row, S.rowDragging))
                : (function () {
                    const off = hidden.providers[providerKey(id)] === true;
                    const mark = active ? S.pageRowCurrent : undefined;
                    if (C !== null) return off ? Object.assign({}, mark === undefined ? {} : mark, S.pageDim) : mark;
                    return Object.assign({}, S.row, mark === undefined ? {} : mark, off ? S.pageDim : {});
                  })()
            },
              h("span", { style: profileConfigured(entry) ? S.pageDot : Object.assign({}, S.pageDot, S.pageDotMuted) }),
              h("span", { style: S.pageRowName }, entry.displayName || id),
              h("span", { style: S.pageRowCount }, count + " " + t("composer.count"))
            );
            return h(React.Fragment, { key: id }, header, row);
          }
        }),
        h("button", {
          "data-mo": "page-provider-add",
          type: "button",
          disabled: !writable,
          title: t("page.addProvider"),
          onClick: function () {
            setAdd({ route: "", displayName: "", baseURL: "", api: apiChoices[0], key: "", error: "" });
          },
          style: S.pageAddButton
        }, "+ " + t("page.addProvider"))
      );

      /* ------------------------------ model rows ---------------------------- */
      function patchRow(index, patch) {
        setRows(draftRows.map(function (row, at) {
          return at === index ? Object.assign({}, row, patch) : row;
        }));
      }

      const modelList = h(DragList, {
        ids: draftRows.map(function (row, index) { return "row-" + String(index); }),
        disabled: false,
        onCommit: function (next) {
          const positions = next.map(function (key) { return Number(String(key).slice(4)); });
          setRows(positions.map(function (at) { return draftRows[at]; }));
        },
        render: function (key, index, dragProps) {
          const at = Number(String(key).slice(4));
          const row = draftRows[at];
          if (row === undefined) return null;
          return h("div", {
            key: key,
            "data-mo": "page-model",
            "data-mo-id": row.id,
            onDragOver: dragProps.onDragOver,
            onDrop: dragProps.onDrop,
            className: "dsh-mo-pagerow",
            style: dragProps.dragging
              ? S.rowDraggingOnly
              : (hidden.models[hiddenModelKey(current, row.id)] === true ? S.pageDim : undefined)
          },
            h("div", { key: "top", style: S.pageModelTop },
              h("span", {
                "data-mo": "page-model-handle",
                draggable: dragProps.draggable,
                onDragStart: dragProps.onDragStart,
                onDragEnd: dragProps.onDragEnd,
                title: t("page.dragHint"),
                className: "dsh-mo-grip",
                style: S.pageHandle
              }, "⠿"),
              h("input", {
                "data-mo": "page-model-id",
                value: row.id,
                placeholder: t("page.modelId"),
                spellCheck: false,
                onChange: function (event) { patchRow(at, { id: event.target.value }); },
                style: Object.assign({}, S.pageInput, S.pageInputMono)
              }),
              h("button", {
                "data-mo": "page-model-remove",
                type: "button",
                title: t("page.remove"),
                onClick: function () { setRows(draftRows.filter(function (item, position) { return position !== at; })); },
                style: S.pageIconButton
              }, "✕"),
              h(Switch, {
                marker: "page-model-switch",
                id: row.id,
                on: hidden.models[hiddenModelKey(current, row.id)] !== true,
                title: (hidden.models[hiddenModelKey(current, row.id)] !== true ? t("page.switchOn") : t("page.switchOff")) + " — " + t("page.switchHint"),
                onToggle: function () { toggleHidden("model", hiddenModelKey(current, row.id)); }
              })
            ),
            h("div", { key: "fields", style: S.pageModelFields },
              h("input", {
                "data-mo": "page-model-context",
                value: row.context,
                placeholder: t("page.modelContext"),
                onChange: function (event) { patchRow(at, { context: event.target.value }); },
                style: S.pageInput
              }),
              h("input", {
                "data-mo": "page-model-max",
                value: row.maxTokens,
                placeholder: t("page.modelMax"),
                onChange: function (event) { patchRow(at, { maxTokens: event.target.value }); },
                style: S.pageInput
              }),
              h("label", { style: S.pageCheckLabel, title: t("page.modelVision") },
                h("input", {
                  "data-mo": "page-model-vision",
                  type: "checkbox",
                  checked: row.vision === true,
                  onChange: function (event) { patchRow(at, { vision: event.target.checked }); }
                }),
                h("span", null, t("page.modelVision"))
              )
            )
          );
        }
      });

      /* ------------------------------- detail ------------------------------- */
      const apiValue = field !== null && field.api !== undefined ? field.api : profileString(profile, "api");
      const apiChoices = PROTOCOL_IDS.indexOf(apiValue) === -1 && apiValue !== "" ? PROTOCOL_IDS.concat([apiValue]) : PROTOCOL_IDS;
      const baseValue = field !== null && field.baseURL !== undefined ? field.baseURL : profileString(profile, "baseURL");
      const keyConfigured = keyFacts !== null && keyFacts.configured === true;
      const modelsDirty = rows !== null;

      const detail = h("section", { style: S.pageDetail, "data-mo": "page-detail" },
        h("div", { style: S.pageDetailHead },
          h("h3", { style: S.pageDetailTitle }, profile.displayName || current),
          h("span", { style: S.pageDetailRoute }, current),
          h("span", { style: S.pageSpacer }),
          h(Switch, {
            marker: "page-provider-switch",
            id: current,
            on: hidden.providers[providerKey(current)] !== true,
            title: (hidden.providers[providerKey(current)] !== true ? t("page.switchOn") : t("page.switchOff")) + " — " + t("page.switchHint"),
            onToggle: function () { toggleHidden("provider", providerKey(current)); }
          })),
        h("label", { style: S.pageField },
          h("span", { style: S.pageFieldLabel }, t("page.baseUrl")),
          h("input", {
            "data-mo": "page-base-url",
            value: baseValue,
            placeholder: "https://api.example.com/v1",
            spellCheck: false,
            disabled: !writable,
            onChange: function (event) {
              setField(Object.assign({}, field === null ? {} : field, { baseURL: event.target.value }));
            },
            onBlur: function () { saveField("baseURL"); },
            onKeyDown: function (event) { if (event.key === "Enter") saveField("baseURL"); },
            style: S.pageInputWide
          })),
        h("div", { style: S.pageField },
          h("span", { style: S.pageFieldLabel }, t("page.api")),
          h("div", {
            "data-mo": "page-api",
            role: "radiogroup",
            "aria-label": t("page.api"),
            style: S.pageSegments
          }, apiChoices.map(function (choice) {
            const active = choice === apiValue;
            return h("button", {
              key: choice,
              "data-mo": "page-api-option",
              "data-mo-id": choice,
              type: "button",
              role: "radio",
              "aria-checked": active ? "true" : "false",
              disabled: !writable,
              title: apiLabel(choice, t),
              onClick: function () {
                setField(Object.assign({}, field === null ? {} : field, { api: choice }));
                writeProvider({ api: choice }, function () { setField(null); });
              },
              style: active ? Object.assign({}, S.pageSegment, S.pageSegmentActive) : S.pageSegment
            }, apiShort(choice, t));
          })),
          h("span", { style: S.pageHint }, apiLabel(apiValue, t))),
        h("div", { style: S.pageField },
          h("span", { style: S.pageFieldLabel }, t("page.apiKey")),
          h("input", {
            "data-mo": "page-api-key",
            type: keyShown ? "text" : "password",
            value: keyDraft,
            placeholder: keyConfigured ? t("page.keySet") : t("page.keyPlaceholder"),
            disabled: !writable || bridge.credentials === null || bridge.credentials === undefined,
            onChange: function (event) { setKeyDraft(event.target.value); },
            onKeyDown: function (event) { if (event.key === "Enter") saveKey(); },
            style: S.pageInputWide
          }),
          h("div", { style: S.pageKeyRow },
            h("button", {
              "data-mo": "page-key-toggle",
              type: "button",
              onClick: function () { setKeyShown(!keyShown); },
              style: S.pageButton
            }, keyShown ? t("page.hide") : t("page.show")),
            h("button", {
              "data-mo": "page-key-save",
              type: "button",
              disabled: busy === "key",
              onClick: saveKey,
              style: S.pageButtonPrimary
            }, busy === "key" ? t("page.saving") : t("page.keySave")),
            keyConfigured ? h("button", {
              "data-mo": "page-key-clear",
              type: "button",
              disabled: busy === "key",
              onClick: clearKey,
              style: S.pageButton
            }, t("page.keyClear")) : null),
          h("span", { style: S.pageHint },
            bridge.credentials === null || bridge.credentials === undefined
              ? t("page.keyUnavailable")
              : (keyConfigured ? t("page.keySet") : t("page.keyUnset")) + " · " + currentKeyRef)),
        h("div", { style: S.pageSectionHead },
          h("span", { style: S.pageSectionLabel }, t("page.models")),
          h("span", { style: S.pageSpacer }),
          h("span", { style: S.pageHint }, modelsDirty ? t("page.modelsDirty") : ""),
          h("button", {
            "data-mo": "page-models-fetch",
            type: "button",
            disabled: !writable || busy === "fetch" || bridge.llm === null || bridge.llm === undefined,
            title: bridge.llm === null || bridge.llm === undefined ? t("page.fetchUnavailable") : t("page.fetchModels"),
            onClick: fetchModels,
            style: S.pageButton
          }, busy === "fetch" ? t("page.fetching") : t("page.fetchModels"))),
        draftRows.length === 0 ? h("p", { style: S.pageEmpty }, t("page.modelsEmptyEdit")) : modelList,
        h("div", { style: S.pageActions },
          h("button", {
            "data-mo": "page-model-add",
            type: "button",
            disabled: !writable,
            onClick: function () { setRows(draftRows.concat([{ id: "", name: "", context: "", maxTokens: "", vision: false }])); },
            style: S.pageButton
          }, "+ " + t("page.addModel")),
          h("span", { style: S.pageSpacer }),
          note !== null && note !== "ok" ? h("span", { style: S.dirty }, note) : null,
          note === "ok" ? h("span", { style: S.ok }, t("page.saved")) : null,
          h("button", {
            "data-mo": "page-models-save",
            type: "button",
            disabled: !writable || busy === "models" || !modelsDirty,
            onClick: saveModels,
            style: modelsDirty ? S.pageButtonPrimary : S.pageButton
          }, busy === "models" ? t("page.saving") : t("page.save")))
      );

      /* ------------------------- the fetch picker ------------------------- */
      let pickerNode = null;
      if (picker !== null) {
        const query = String(picker.query || "").trim().toLowerCase();
        const visible = query === "" ? picker.rows : picker.rows.filter(function (row) {
          return row.id.toLowerCase().indexOf(query) !== -1;
        });
        const allPicked = visible.length > 0 && visible.every(function (row) { return picker.picked[row.id] === true; });
        pickerNode = ReactDOM.createPortal(
          h("div", {
            "data-mo": "fetch-dialog",
            style: S.pickBackdrop,
            onMouseDown: function (event) { if (event.target === event.currentTarget) setPicker(null); }
          },
            h("div", { style: S.pickCard, role: "dialog", "aria-label": t("page.fetchTitle") },
              h("div", { style: S.pickHead },
                h("h3", { style: S.pickTitle }, t("page.fetchTitle")),
                h("button", {
                  "data-mo": "fetch-close",
                  type: "button",
                  title: t("page.cancel"),
                  onClick: function () { setPicker(null); },
                  style: S.pageIconButton
                }, "✕")),
              h("p", { style: S.pickDesc }, t("page.fetchDescription")),
              h("div", { style: S.pickTools },
                h("input", {
                  "data-mo": "fetch-search",
                  value: picker.query,
                  placeholder: t("page.fetchSearch"),
                  spellCheck: false,
                  onChange: function (event) { setPicker({ rows: picker.rows, picked: picker.picked, query: event.target.value }); },
                  style: S.pageInputWide
                }),
                h("button", {
                  "data-mo": "fetch-all",
                  type: "button",
                  onClick: function () {
                    const next = Object.assign({}, picker.picked);
                    for (let i = 0; i < visible.length; i++) next[visible[i].id] = allPicked ? undefined : true;
                    setPicker({ rows: picker.rows, picked: next, query: picker.query });
                  },
                  style: S.pageButton
                }, allPicked ? t("page.deselectAll") : t("page.selectAll"))),
              visible.length === 0
                ? h("p", { style: S.pageEmpty }, picker.rows.length === 0 ? t("page.fetchEmpty") : t("page.fetchNoMatches"))
                : h("div", { style: S.pickList }, visible.map(function (row) {
                    const chips = [];
                    if (row.context !== "") chips.push(h("span", { key: "c", style: S.pageChip }, row.context));
                    if (row.vision === true) chips.push(h("span", { key: "v", style: S.pageChip }, t("page.vision")));
                    return h("label", { key: row.id, style: S.pickRow, "data-mo": "fetch-item", "data-mo-id": row.id },
                      h("input", {
                        type: "checkbox",
                        checked: picker.picked[row.id] === true,
                        onChange: function (event) {
                          const next = Object.assign({}, picker.picked);
                          next[row.id] = event.target.checked ? true : undefined;
                          setPicker({ rows: picker.rows, picked: next, query: picker.query });
                        }
                      }),
                      h("span", { style: S.pickId }, row.id),
                      h("span", { style: S.pageSpacer }),
                      chips);
                  })),
              h("div", { style: S.pickFoot },
                h("button", {
                  "data-mo": "fetch-cancel",
                  type: "button",
                  onClick: function () { setPicker(null); },
                  style: S.pageButton
                }, t("page.cancel")),
                h("button", {
                  "data-mo": "fetch-adopt",
                  type: "button",
                  onClick: function () {
                    const chosen = picker.rows.filter(function (row) { return picker.picked[row.id] === true; });
                    setPicker(null);
                    if (chosen.length === 0) return;
                    setRows(draftRows.concat(chosen));
                    setNote(t("page.fetchAdded"));
                  },
                  style: S.pageButtonPrimary
                }, t("page.adopt"))))),
          document.body);
      }

      /* ------------------------ the add-provider dialog ------------------------ */
      let addNode = null;
      if (addDialog !== null) {
        const addApi = addDialog.api;
        addNode = ReactDOM.createPortal(
          h("div", {
            "data-mo": "add-dialog",
            style: S.pickBackdrop,
            onMouseDown: function (event) { if (event.target === event.currentTarget) setAdd(null); }
          },
            h("div", { style: S.pickCard, role: "dialog", "aria-label": t("page.newTitle") },
              h("div", { style: S.pickHead },
                h("h3", { style: S.pickTitle }, t("page.newTitle")),
                h("button", {
                  "data-mo": "add-close",
                  type: "button",
                  title: t("page.cancel"),
                  onClick: function () { setAdd(null); },
                  style: S.pageIconButton
                }, "✕")),
              h("p", { style: S.pickDesc }, t("page.newDescription")),
              h("label", { style: S.pageField },
                h("span", { style: S.pageFieldLabel }, t("page.route")),
                h("input", {
                  "data-mo": "add-route",
                  value: addDialog.route,
                  placeholder: "my-gateway",
                  spellCheck: false,
                  onChange: function (event) { setAdd(Object.assign({}, addDialog, { route: event.target.value, error: "" })); },
                  style: Object.assign({}, S.pageInputWide, S.pageInputMono)
                }),
                h("span", { style: S.pageHint }, t("page.routeHint"))),
              h("label", { style: S.pageField },
                h("span", { style: S.pageFieldLabel }, t("page.displayNameOptional")),
                h("input", {
                  "data-mo": "add-display-name",
                  value: addDialog.displayName,
                  spellCheck: false,
                  onChange: function (event) { setAdd(Object.assign({}, addDialog, { displayName: event.target.value, error: "" })); },
                  style: S.pageInputWide
                })),
              h("label", { style: S.pageField },
                h("span", { style: S.pageFieldLabel }, t("page.baseUrlOptional")),
                h("input", {
                  "data-mo": "add-base-url",
                  value: addDialog.baseURL,
                  placeholder: "https://api.example.com/v1",
                  spellCheck: false,
                  onChange: function (event) { setAdd(Object.assign({}, addDialog, { baseURL: event.target.value, error: "" })); },
                  style: S.pageInputWide
                })),
              h("div", { style: S.pageField },
                h("span", { style: S.pageFieldLabel }, t("page.api")),
                h("div", { "data-mo": "add-api", role: "radiogroup", "aria-label": t("page.api"), style: S.pageSegments },
                  apiChoices.map(function (choice) {
                    const active = choice === addApi;
                    return h("button", {
                      key: choice,
                      "data-mo": "add-api-option",
                      "data-mo-id": choice,
                      type: "button",
                      role: "radio",
                      "aria-checked": active ? "true" : "false",
                      title: apiLabel(choice, t),
                      onClick: function () { setAdd(Object.assign({}, addDialog, { api: choice, error: "" })); },
                      style: active ? Object.assign({}, S.pageSegment, S.pageSegmentActive) : S.pageSegment
                    }, apiShort(choice, t));
                  })),
                h("span", { style: S.pageHint }, apiLabel(addApi, t))),
              h("label", { style: S.pageField },
                h("span", { style: S.pageFieldLabel }, t("page.keyOptional")),
                h("input", {
                  "data-mo": "add-key",
                  type: "password",
                  value: addDialog.key,
                  onChange: function (event) { setAdd(Object.assign({}, addDialog, { key: event.target.value, error: "" })); },
                  onKeyDown: function (event) { if (event.key === "Enter") createProvider(); },
                  style: S.pageInputWide
                })),
              addDialog.error === "" ? null : h("p", { "data-mo": "add-error", style: S.pageError }, addDialog.error),
              h("div", { style: S.pickFoot },
                h("button", {
                  "data-mo": "add-cancel",
                  type: "button",
                  onClick: function () { setAdd(null); },
                  style: S.pageButton
                }, t("page.cancel")),
                h("button", {
                  "data-mo": "add-submit",
                  type: "button",
                  disabled: busy === "create",
                  onClick: createProvider,
                  style: S.pageButtonPrimary
                }, busy === "create" ? t("page.working") : t("page.create"))))),
          document.body);
      }

      return h("section", { "data-mo": "page", "data-mo-build": BUILD, style: S.pageRoot },
        h("header", { style: S.pageHead },
          h("div", { style: S.pageTitleRow },
            h("h2", { style: S.pageTitle }, t("page.title")),
            h("button", {
              "data-mo": "page-open-official",
              type: "button",
              title: t("page.openOfficialHint"),
              /* Going to the shipped page IS giving the row back: no separate switch, and
                 no second state to explain. */
              onClick: function () {
                /* Nothing to navigate: the cell is won or lost by registration priority, so
                   the menu row never moves. */
                if (typeof setTakeover === "function") setTakeover(false);
              },
              style: S.linkPill
            }, t("page.openOfficial"))),
          h("p", { style: S.pageSubtitle }, t("page.subtitle"))),
        h("div", { style: S.pageGrid }, rail, detail),
        h("p", { style: S.pageFooterHint }, t("page.note")),
        pickerNode,
        addNode
      );
    }

    function ModelsPageGuarded(props) {
      return h(PanelBoundary, null, h(ModelsPage, props));
    }

    /* -------------------------------- helpers --------------------------------- */

    function namespaceView(view, namespace) {
      if (!view || !view.namespaces) return null;
      for (let i = 0; i < view.namespaces.length; i++) {
        if (view.namespaces[i].ns === namespace) return view.namespaces[i];
      }
      return null;
    }

    /* The user layer carries the values to write back; the resolved value is the
       fallback for providers configured only by a lower layer. */
    function providerLayer(nsView) {
      if (!nsView) return null;
      return (nsView.user && nsView.user.providers) || (nsView.value && nsView.value.providers) || null;
    }

    /* The resolved value keeps the document's real key order; the user section is
       re-projected by the host and loses it, so ordering reads from `value`. */
    function orderLayer(nsView) {
      if (!nsView) return null;
      return (nsView.value && nsView.value.providers) || (nsView.user && nsView.user.providers) || null;
    }

    /* -------------------------------- plugin body ----------------------------- */
    /* The seat contract resolves its standard props (sessionId, useSession, …) through
       THIS plugin's own context, so every service those props read must be declared
       here — otherwise the entry throws during render and is silently abdicated. */
    const inject = ["locale", "slots", "sessions", "remote", "remote.session", "remote.settings"];

    /* Seat registration is isolated per seat: a future seat rename, a contract change,
       or another plugin taking the same single/keyed cell must not take the whole
       plugin down with it (a swallowed error here would also hide the cause, so it
       is reported through the client logger when one is available). */
    function guard(ctx, what, fn) {
      try {
        return fn();
      } catch (error) {
        const message = "dsh-model-organizer: could not register " + what + " — " + String((error && error.message) || error);
        try {
          if (ctx.logger && typeof ctx.logger.warn === "function") ctx.logger.warn(message);
          else console.warn(message);
        } catch (e) {}
        return function () {};
      }
    }

    function apply(ctx) {
      try { window.__dshModelOrganizerBuild = BUILD; } catch (e) {}
      /* A DOM marker proving this bundle actually applied, independent of any seat.
         Seat registration is silent by design (a throw abdicates the entry), so
         "is the new code even loaded?" is otherwise unanswerable from the page. */
      try {
        if (document.body !== null && document.querySelector('[data-mo="boot"]') === null) {
          const boot = document.createElement("div");
          boot.setAttribute("data-mo", "boot");
          boot.setAttribute("data-mo-build", BUILD);
          boot.hidden = true;
          document.body.appendChild(boot);
        }
      } catch (e) {}
      ctx.effect(function () { return ctx.locale.register(NS, { zh: zh, en: en }); }, "dsh-model-organizer: dictionaries");
      const t = ctx.locale.bind(NS);

      ctx.inject(["slots", "modelDirectories", "sessions"], function (scope) {
        const models = scope.modelDirectories;
        const sessions = scope.sessions;
        scope.slots.inject("conversation.input.model", function () {
          return guard(scope, "conversation.input.model", function () { return scope.slots.register({
            name: "conversation.input.model",
            locale: NS,
            priority: -1,
            inject: function () {
              const first = arguments.length > 0 ? arguments[0] : undefined;
              const id = first && typeof first === "object" ? first.sessionId : first;
              const directory = models.directoryFor(id);
              const available = sessions.subagentAddress(id) === undefined;
              return {
                available: available,
                directory: directory.store,
                load: function () { if (available) directory.load().catch(function () {}); },
                select: function (selection) {
                  if (!available) return Promise.resolve(false);
                  /* Failures resolve WITH their error (the directory folds remote
                     rejections into the result) so the menu can surface them —
                     the shipped menu toasts exactly this. */
                  return directory.select(selection).then(function (result) {
                    if (result && result.ok) return true;
                    return result && result.error ? result.error : false;
                  }, function (err) { return err; });
                },
                t: t
              };
            }
          }, ProviderGroupedModelSelectGuarded); });
        });
      });

      /* The settings mirror moved homes: DSH 0.1.7 exposes it as `configForms`
         (provided by ui-settings); 0.1.5/0.1.6 exposed the same object as
         `settingsScope`. A cordis `ctx.inject` whose service never appears simply
         never runs, so injecting only the old name made this whole seat vanish
         without a single error once DSH renamed it. Inject both names and mount
         once — whichever resolves first wins, the other stays dormant. */
      let orderPanelMounted = false;

      function mountOrderPanel(scope, mirror) {
        if (orderPanelMounted) return;
        orderPanelMounted = true;
        /* Mark that the service resolved and the panel is being mounted — this
           separates "the seat never rendered" from "the inject never fired". */
        try {
          if (document.body !== null && document.querySelector('[data-mo="panel-mounted"]') === null) {
            const mark = document.createElement("div");
            mark.setAttribute("data-mo", "panel-mounted");
            mark.hidden = true;
            document.body.appendChild(mark);
          }
        } catch (e) {}
        mirror.ensure();
        const mutate = function (ops, revision) { return scope.remote.settings.mutate(PI_AI_NS, ops, revision); };

        bridge.slots = scope.slots;
        const face = function () {
          return { store: mirror, namespace: PI_AI_NS, mutate: mutate, t: t, slots: scope.slots, bridge: bridge };
        };

        /* NOTE: `settings.models.provider-card` is deliberately NOT taken. The owner
           dispatches it keyed by the provider's settings namespace, and
           @linxin666/dsh-client-ui-model-capabilities already registers that exact
           key; a keyed cell holds ONE occupant, so registering here throws and
           silently suppresses their "模型能力" panel. This plugin stays in the
           footer seat it owns instead. */

        scope.slots.inject("settings.models.footer", function () {
          return guard(scope, "settings.models.footer", function () {
            return scope.slots.register({
              name: "settings.models.footer",
              id: "model-organizer-provider-order",
              order: 100,
              inject: face
            }, ProviderOrderPanelGuarded);
          });
        });
      }

      /* The organizer page registers from the SAME mirror the footer panel uses, and
         only once: the two `configForms`/`settingsScope` callbacks race, and a second
         entry would put a duplicate row in the nav (list seats key on id). The entry
         uses its OWN id — never "models" — so the shipped section keeps rendering. */
      /* Two more namespaces, requested separately: a build without them keeps the page
         mounted and reports the key as unavailable instead of losing the whole seat. */
      const bridge = { credentials: null, llm: null };
      ctx.inject(["slots", "remote.credentials"], function (scope) { bridge.credentials = scope.remote.credentials; });
      ctx.inject(["slots", "remote.llm"], function (scope) { bridge.llm = scope.remote.llm; });

      let modelsPageMounted = false;

      function mountModelsPage(scope, mirror) {
        if (modelsPageMounted) return;
        modelsPageMounted = true;
        mirror.ensure();
        try {
          if (document.body !== null && document.querySelector('[data-mo="page-mounted"]') === null) {
            const mark = document.createElement("div");
            mark.setAttribute("data-mo", "page-mounted");
            mark.hidden = true;
            document.body.appendChild(mark);
          }
        } catch (e) {}
        const mutate = function (ops, revision) { return scope.remote.settings.mutate(PI_AI_NS, ops, revision); };
        bridge.slots = scope.slots;
        let sectionDispose = null;

        /* ONE registration for the whole lifetime, always under the shipped id:
           - the nav reads the RAW entry list (no dedup), so it always holds our cell next
             to the shipped one. Our cell is kept hidden, so the settings menu always looks
             like the original single row — and that visible row carries the SHIPPED label,
             because it is the shipped cell;
           - WHO wins that cell is decided by priority: entries stay sorted ascending by
             priority and `entriesOfSlot` takes the first per id. So -1 wins it for this
             page ("taken over") and a huge number lets the shipped page win ("handed
             back") — with no unregistration, no id change and no navigation at all.
           That is what makes the two states indistinguishable in the menu. */
        function registerSection(on) {
          try {
            if (sectionDispose !== null) { sectionDispose(); sectionDispose = null; }
          } catch (e) {}
          const face = function () {
            return {
              store: mirror, namespace: PI_AI_NS, mutate: mutate, bridge: bridge, t: t,
              takeover: on === true, setTakeover: switchTo
            };
          };
          sectionDispose = guard(scope, "settings.section", function () {
            return scope.slots.register({
              name: "settings.section",
              id: "models",
              order: 10,
              /* One below the shipped entry wins the cell for this page; one above hands
                 it back. Relative, so the default survives whatever priority the shipped
                 entry was given. */
              priority: shippedSectionPriority(scope.slots, "models", t("nav")) + (on === true ? -1 : 1),
              label: function () { return t("nav"); },
              locale: NS,
              inject: face
            }, ModelsPageGuarded);
          });
        }

        /* Our cell stays hidden whichever page wins: the menu must never show two rows for
           one section, and the visible row (the shipped cell) is what opens the cell —
           whoever ends up winning it. */
        function paintOwnNavCell() {
          const slots = scope.slots;
          const onClosed = function () {
            /* Settings was closed: the next time it opens, the row is this page again. */
            if (bridge.takeover !== true) switchTo(true);
          };
          onNavChanged(t("nav"), slots, onClosed);
          nextFrame(function () { onNavChanged(t("nav"), slots, onClosed); });
          watchOwnNavCell(t("nav"), slots, onClosed);
        }

        function switchTo(on) {
          const next = on === true;
          bridge.takeover = next;
          registerSection(next);
          paintOwnNavCell();
        }

        bridge.setTakeover = switchTo;
        bridge.takeover = true;
        scope.slots.inject("settings.section", function () {
          registerSection(bridge.takeover);
          paintOwnNavCell();
          return function () {
            if (sectionDispose !== null) { sectionDispose(); sectionDispose = null; }
            unwatchOwnNavCell();
            showOwnNavCell();
          };
        });
      }

      ctx.inject(["slots", "configForms", "remote", "remote.settings"], function (scope) {
        const mirror = scope.configForms.describe();
        mountOrderPanel(scope, mirror);
        mountModelsPage(scope, mirror);
      });
      ctx.inject(["slots", "settingsScope", "remote", "remote.settings"], function (scope) {
        const mirror = scope.settingsScope.describe();
        mountOrderPanel(scope, mirror);
        mountModelsPage(scope, mirror);
      });
    }

    /* `__test` is a test seam only: the loader reads name/apply/inject and ignores it. */
    module.exports = { name: "model-organizer", apply: apply, inject: inject, __test: { visibleGroupsFor: visibleGroupsFor } };
    return module.exports;
  }
});
