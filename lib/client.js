window.__ModuleLoader__.load({
  id: "dsh-model-organizer",
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

    const NS = "model-organizer";
    const PI_AI_NS = "llm-pi-ai";

    /* ------------------------------ dictionaries ------------------------------ */
    const zh = {
      "composer.title": "选择模型",
      "composer.none": "未选择模型",
      "composer.empty": "暂无可用模型",
      "composer.locked": "当前不可切换模型",
      "composer.count": "个模型",
      "composer.aria": "选择模型，当前 {model}",
      "composer.ariaEffort": "选择模型，当前 {model}，推理等级 {effort}",
      "composer.effort": "推理等级",
      "composer.effortDefault": "Default",
      "composer.effortEmpty": "当前模型未提供推理等级。",
      "composer.effortBack": "模型",
      "composer.refreshing": "正在刷新模型列表…",
      "order.title": "模型顺序",
      "order.hint": "拖动 ⠿ 调整，松手即保存",
      "order.saving": "保存中…",
      "order.saved": "已保存 ✓",
      "order.unsaved": "有未保存改动",
      "order.readonly": "当前环境不可写入该设置",
      "providers.title": "供应商与模型顺序",
      "providers.hint": "拖动行即可调整顺序",
      "providers.expand": "展开顺序面板",
      "providers.collapse": "收起顺序面板",
      "providers.saved": "已保存 ✓",
    };
    const en = {
      "composer.title": "Select model",
      "composer.none": "No model",
      "composer.empty": "No models available",
      "composer.locked": "Model switching unavailable",
      "composer.count": "models",
      "composer.aria": "Select model, currently {model}",
      "composer.ariaEffort": "Select model, currently {model}, reasoning effort {effort}",
      "composer.effort": "Effort",
      "composer.effortDefault": "Default",
      "composer.effortEmpty": "This model provides no reasoning effort levels.",
      "composer.effortBack": "Model",
      "composer.refreshing": "Refreshing model list…",
      "order.title": "Model order",
      "order.hint": "Drag ⠿ to reorder, then save",
      "order.saving": "Saving…",
      "order.saved": "Saved ✓",
      "order.unsaved": "Unsaved changes",
      "order.readonly": "This settings document is read-only here",
      "providers.title": "Provider and model order",
      "providers.hint": "Drag a row to reorder",
      "providers.expand": "Expand the order panel",
      "providers.collapse": "Collapse the order panel",
      "providers.saved": "Saved ✓",
    };

    /* --------------------------- official CSS classes -------------------------- */
    /* The shipped client-ui-model-selection bundle injects its CSS-module sheet and
       STILL loads (this plugin only shadows its seat), so reusing its class names
       reproduces the shipped look exactly. The hash is resolved from the live
       stylesheet so a dsh upgrade cannot silently drop the styling. */
    const CLASS_SUFFIXES = ["root", "trigger", "triggerLabel", "triggerEffort", "triggerIcon", "chevron", "chevronOpen",
      "menu", "status", "empty", "error", "warning", "retry", "groups", "group", "groupTitle",
      "option", "selected", "optionCopy", "modelName", "check", "cell", "cellLabel", "cellValue", "cellChevron"];

    /* Resolution is cached against the live sheet count so a late-injected sheet is
       still picked up, and a resolved prefix is VALIDATED against a second class
       only this module owns — an unrelated module shipping a `_trigger` rule must
       not win (the updater module does). */
    /* Bump on every deploy. The host serves the plugin bundle as
       `immutable, max-age=31536000` under a URL that does not change when a plugin's
       code changes, so a browser can keep running an old build until a hard reload.
       Kept OFF the UI (it is not user-facing): read it as
       `window.__dshModelOrganizerBuild` when a stale build is suspected. */
    const BUILD = "b23";

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
      officialClasses = out;
      return out;
    }

    /* The shipped sheet styles a static group heading; the collapsible variant needs
       a hover affordance and a chevron that flips. Injected once per document. */
    const OWN_STYLE_ID = "dsh-model-organizer-style";
    function ensureOwnStyles() {
      try {
        if (document.getElementById(OWN_STYLE_ID) !== null) return;
        const style = document.createElement("style");
        style.id = OWN_STYLE_ID;
        style.textContent = [
          ".dsh-mo-head{transition:background .12s ease;}",
          ".dsh-mo-head:hover{background:var(--dsw-alias-interactive-bg-hover);}",
          /* A drag leaves the source row FOCUSED in Chromium, and both the shipped
             \`option\` and this sheet paint a :focus-visible background — that is the grey
             block that used to stay behind after a drag. Rows are mouse-only
             (tabIndex -1), so they get no focus paint at all; the panel header stays
             keyboard-reachable and keeps its own. */
          ".dsh-mo-head:focus-visible{outline:none;}",
          ".dsh-mo-head.dsh-mo-head:focus-visible,.dsh-mo-model.dsh-mo-model:focus-visible,.dsh-mo-row.dsh-mo-row:focus-visible{background:transparent;}",
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
          ".dsh-mo-model::before{content:'';position:absolute;left:15px;top:50%;width:5px;height:5px;margin-top:-2.5px;border-radius:50%;background:var(--dsw-alias-label-tertiary);opacity:.5;}",
          ".dsh-mo-model[aria-checked='true']::before{background:var(--dsw-alias-label-primary);opacity:.9;}"
        ].join("");
        document.head.appendChild(style);
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
      if (P === null || typeof P[name] !== "function") return null;
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
      /* the shipped groupTitle is a plain heading; the clickable variant only adds
         layout + affordance so the visuals keep coming from the shipped sheet. */
      groupChevron: { color: "var(--dsw-alias-label-tertiary)", flex: "none", transition: "transform .12s" },
      measureStyle: { visibility: "hidden", left: 0, top: 0 },
      groupCount: { fontSize: 10, color: "var(--dsw-alias-label-tertiary)", flex: "none" },
      failure: { display: "flex", flexDirection: "column", gap: 2, padding: "5px 8px", fontSize: 11, color: "var(--dsw-alias-state-warn-label, #d29922)" },
      box: { marginTop: 8, padding: 8, border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 10, background: "var(--dsw-alias-bg-module-secondary, transparent)" },
      providerGroup: { display: "flex", flexDirection: "column" },

      /* Floating presentation: the panel sits in the corner of the Models page so
         provider/API configuration and reordering are visible at the same time. */
      floatPanel: {
        position: "fixed", right: 20, bottom: 20, zIndex: 900, width: 380, maxWidth: "calc(100vw - 40px)",
        display: "flex", flexDirection: "column", padding: 4,
        border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 14,
        background: "var(--dsw-specific-menu, var(--dsw-alias-bg-module, #222))",
        boxShadow: "0 10px 30px rgba(0,0,0,.34)", color: "var(--dsw-alias-label-primary)"
      },
      /* The shipped `cell` sets min-width:100%; the head must stay inside the panel. */
      panelHeadCell: { display: "flex", alignItems: "center", gap: 6, flex: "1 1 auto", minWidth: 0 },
      floatBody: { display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", maxHeight: "52vh", padding: "2px 4px 4px" },

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
      ok: { fontSize: 11, color: "var(--dsw-alias-state-success, #3fb950)" }
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
    function ProviderGroupedModelSelect(props) {
      const locked = props.locked;
      const available = props.available;
      const directory = props.directory;
      const load = props.load;
      const select = props.select;
      const t = props.t;

      const C = resolveOfficialClasses();
      ensureOwnStyles();
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
      const posState = useState(null);
      const menuPos = posState[0];
      const setMenuPos = posState[1];
      const paneState = useState("model");
      const pane = paneState[0];
      const setPane = paneState[1];
      const rootRef = useRef(null);
      const triggerRef = useRef(null);
      const menuRef = useRef(null);
      const idRef = useRef(null);
      if (idRef.current === null) idRef.current = "mo-" + Math.random().toString(36).slice(2, 9);

      const groups = (state && state.groups) || [];
      const failures = (state && state.failures) || [];
      const current = (state && state.current) || null;
      const busy = !!state && state.status === "selecting";
      const loading = !!state && state.status === "loading";

      /* Providers follow the plugin's own display preference (see below). Computed
         per render — not memoised — so a reorder made in Settings shows up here the
         next time the menu opens, without a page reload. */
      const groupsOrdered = (function () {
        const ids = [];
        const byId = {};
        for (let i = 0; i < groups.length; i++) { ids.push(groups[i].id); byId[groups[i].id] = groups[i]; }
        const ordered = applyProviderOrder(ids, readProviderOrder());
        const out = [];
        for (let i = 0; i < ordered.length; i++) if (byId[ordered[i]] !== undefined) out.push(byId[ordered[i]]);
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
            if (currentPane === "effort") return "model";
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
      }, [open, layoutKey]);

      if (available === false) return null;

      const disabled = !!locked;

      function toggle() {
        if (disabled) return;
        if (!open) {
          load();
          if (Object.keys(expanded).length === 0 && current !== null) {
            const seed = {};
            seed[current.provider] = true;
            setExpanded(seed);
          }
        }
        setOpen(!open);
      }

      function toggleGroup(id) {
        const next = {};
        for (const key in expanded) next[key] = expanded[key];
        next[id] = !next[id];
        setExpanded(next);
      }

      function pick(group, model) {
        const sameModel = current !== null && current.provider === group.id && current.model === model.id;
        let effort = model.reasoning ? model.reasoning.defaultEffort : undefined;
        if (sameModel && current.reasoningEffort !== undefined) effort = current.reasoningEffort;
        const selection = { provider: group.id, model: model.id };
        if (effort !== undefined) selection.reasoningEffort = effort;
        Promise.resolve(select(selection)).then(function (ok) { if (ok) setOpen(false); });
      }

      /* Same model, new effort — the shipped semantics: an unchanged level just
         closes, otherwise the whole selection is resubmitted. */
      function chooseEffort(effort) {
        if (current === null) return;
        if (effectiveEffort === effort) { setOpen(false); return; }
        const selection = { provider: current.provider, model: current.model };
        if (effort !== undefined) selection.reasoningEffort = effort;
        Promise.resolve(select(selection)).then(function (ok) { if (ok) setOpen(false); });
      }

      const label = currentInfo !== null ? currentInfo.model.name : (current === null ? t("composer.none") : current.provider + "/" + current.model);
      const triggerTitle = effortLabel === undefined ? label : label + " · " + effortLabel;
      const aria = (effortLabel === undefined ? t("composer.aria") : t("composer.ariaEffort"))
        .split("{model}").join(label)
        .split("{effort}").join(effortLabel === undefined ? "" : effortLabel);

      const chevronIcon = icon("IconChevronDownOutline14", {
        className: C !== null ? cx(C.chevron, open && C.chevronOpen) : undefined,
        style: C === null ? S.caret : undefined
      });
      const triggerChildren = [];
      const triggerGlyph = icon("IconDataOutline16", { key: "g", className: C !== null ? C.triggerIcon : undefined, size: 16 });
      if (triggerGlyph !== null) triggerChildren.push(triggerGlyph);
      triggerChildren.push(h("span", { key: "l", className: C !== null ? C.triggerLabel : undefined, style: C === null ? S.chipLabel : undefined }, label));
      if (effortLabel !== undefined) {
        triggerChildren.push(h("span", { key: "e", className: C !== null ? C.triggerEffort : undefined, style: C === null ? S.chipEffort : undefined }, effortLabel));
      }
      triggerChildren.push(chevronIcon !== null ? chevronIcon : h("span", { key: "c", style: S.caret }, open ? "▾" : "▴"));

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

      const rootBox = h("div", {
        ref: rootRef,
        className: C !== null ? C.root : undefined,
        style: C === null ? { minWidth: 0, position: "relative" } : undefined
      }, trigger);

      if (!open) return rootBox;

      const groupNodes = groupsOrdered.map(function (group) {
        const isOpen = expanded[group.id] === true;
        const headingId = idRef.current + "-" + group.id;
        /* A provider row reuses the shipped `cell` drill-in row (label + right-aligned
           value + chevron), so both menu levels are drawn by the shipped sheet. */
        const headChildren = [
          h("span", { key: "n", className: C !== null ? C.cellLabel : undefined, style: C === null ? undefined : undefined }, group.name || group.id),
          h("span", { key: "v", className: C !== null ? C.cellValue : undefined, style: C === null ? S.groupCount : undefined }, group.models.length + " " + t("composer.count"))
        ];
        const groupChevron = icon("IconChevronRightOutline14", {
          key: "i",
          className: C !== null ? cx(C.cellChevron, "dsh-mo-chev") : "dsh-mo-chev",
          style: C === null ? S.groupChevron : undefined
        });
        if (groupChevron !== null) headChildren.push(groupChevron);
        const head = h("button", {
          key: "h",
          type: "button",
          id: headingId,
          className: C !== null ? cx(C.cell, "dsh-mo-head") : "dsh-mo-head",
          style: C === null ? S.fallbackGroupTitle : undefined,
          "aria-expanded": isOpen,
          onClick: function () { toggleGroup(group.id); }
        }, headChildren);

        const items = !isOpen ? [] : group.models.map(function (model) {
          const selected = current !== null && current.provider === group.id && current.model === model.id;
          const check = selected ? icon("IconCheckOutline16", { key: "k" }) : null;
          return h("button", {
            key: model.id,
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
          className: C !== null ? C.group : S.fallbackGroup
        }, [head].concat(items));
      });

      const bodyChildren = [];
      if (loading) bodyChildren.push(h("div", { key: "s", className: C !== null ? C.status : undefined, style: C === null ? S.boxHint : undefined }, t("composer.refreshing")));

      if (pane === "effort") {
        /* Back row, styled as the shipped drill-in cell. */
        bodyChildren.push(h("button", {
          key: "back",
          type: "button",
          role: "menuitem",
          className: C !== null ? C.cell : undefined,
          style: C === null ? S.fallbackGroupTitle : undefined,
          onClick: function () { setPane("model"); }
        },
          h("span", { key: "l", className: C !== null ? C.cellLabel : undefined }, t("composer.effortBack")),
          h("span", { key: "v", className: C !== null ? C.cellValue : undefined }, label)
        ));
        if (effortChoices.length === 0) {
          bodyChildren.push(h("div", { key: "ee", className: C !== null ? C.empty : undefined, style: C === null ? S.menuEmpty : undefined }, t("composer.effortEmpty")));
        } else {
          bodyChildren.push(h("div", {
            key: "eg",
            className: C !== null ? cx(C.groups, "scrollable") : undefined,
            style: C === null ? S.fallbackGroups : undefined
          }, effortChoices.map(function (level) {
            const selected = effectiveEffort === level.effort;
            const check = selected ? icon("IconCheckOutline16", { key: "k" }) : null;
            return h("button", {
              key: level.key,
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
        if (failures.length > 0) {
          bodyChildren.push(h("div", { key: "w", className: C !== null ? C.warning : undefined, style: C === null ? S.failure : undefined },
            h("span", null, failures.map(function (f) { return f.name + ": " + f.message; }).join(" · "))));
        }
        if (groupsOrdered.length === 0) {
          if (!loading) bodyChildren.push(h("div", { key: "e", className: C !== null ? C.empty : undefined, style: C === null ? S.menuEmpty : undefined }, t("composer.empty")));
        } else {
          bodyChildren.push(h("div", {
            key: "g",
            className: C !== null ? cx(C.groups, "scrollable") : undefined,
            style: C === null ? S.fallbackGroups : undefined
          }, groupNodes));
        }
        /* The effort entry sits last, as a shipped drill-in cell, so the provider
           list stays the default view. */
        if (effortChoices.length > 0) {
          bodyChildren.push(h("button", {
            key: "eff",
            type: "button",
            role: "menuitem",
            className: C !== null ? cx(C.cell, "dsh-mo-head") : "dsh-mo-head",
            style: C === null ? S.fallbackGroupTitle : undefined,
            onClick: function () { setPane("effort"); }
          },
            h("span", { key: "l", className: C !== null ? C.cellLabel : undefined }, t("composer.effort")),
            h("span", { key: "v", className: C !== null ? C.cellValue : undefined }, effortLabel),
            icon("IconChevronRightOutline14", { key: "c", className: C !== null ? C.cellChevron : undefined }) 
          ));
        }
      }

      const menu = h("div", {
        ref: menuRef,
        id: idRef.current + "-menu",
        className: C !== null ? C.menu : undefined,
        style: C !== null
          ? (menuPos !== null ? menuPos : MEASURE_STYLE)
          : Object.assign({}, S.fallbackMenu, menuPos !== null ? menuPos : MEASURE_STYLE),
        role: "menu",
        "aria-label": t("composer.title"),
        "aria-busy": loading || busy
      }, bodyChildren);

      return h(React.Fragment, null, rootBox, ReactDOM.createPortal(menu, document.body));
    }

    /* ------------- B. one provider card's model order editor ------------------ */
    /* Owner props: { provider, configured, keyConfigured }. Injected: store, namespace, mutate, t. */
    function ProviderModelOrder(props) {
      const C = resolveOfficialClasses();
      ensureOwnStyles();
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
      const headChevron = icon("IconChevronRightOutline14", {
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

    const PANEL_STORAGE_KEY = "dsh-model-organizer.panelOpen";
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

    /* ALWAYS expanded on mount. A remembered collapse is indistinguishable from
       "the default is collapsed" the next time the page opens, which is not what
       this panel is for. */
    function readPanelOpen() {
      return true;
    }

    function writePanelOpen(open) {
      try { window.localStorage.setItem(PANEL_STORAGE_KEY, open ? "1" : "0"); } catch (e) {}
    }

    /* Stored order first, then everything else in document order. */
    function applyProviderOrder(ids, preferred) {
      if (preferred.length === 0) return ids;
      const rank = {};
      for (let i = 0; i < preferred.length; i++) rank[preferred[i]] = i;
      const known = [];
      const rest = [];
      for (let i = 0; i < ids.length; i++) {
        if (rank[ids[i]] === undefined) rest.push(ids[i]);
        else known.push(ids[i]);
      }
      known.sort(function (a, b) { return rank[a] - rank[b]; });
      return known.concat(rest);
    }

    function ProviderOrderPanel(props) {
      const C = resolveOfficialClasses();
      ensureOwnStyles();
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
      const panelState = useState(readPanelOpen);
      const panelOpen = panelState[0];
      const setPanelOpen = function (next) { writePanelOpen(next); panelState[1](next); };
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

      useLayoutEffect(function () {
        if (panelPos !== null || panelRef.current === null) return;
        const rect = panelRef.current.getBoundingClientRect();
        setPanelPos({ left: Math.round(rect.left), top: Math.round(rect.top) });
      }, [panelPos, panelOpen]);

      const ids = order === null ? baseIds : order;
      const idsKey = ids.join("|");
      const dirty = order !== null && order.join("|") !== sourceKey;

      /* Mirror the stored order onto the shipped provider cards (CSS `order` only —
         the DOM React rendered is never touched). The cards may be (re)rendered after
         this effect runs, which drops the inline styles, so it is applied again on the
         next frame and once more shortly after. */
      useEffect(function () {
        const list = idsKey.length === 0 ? [] : idsKey.split("|");
        applyCardOrder(display, list);
        const frame = requestAnimationFrame(function () { applyCardOrder(display, list); });
        const timer = setTimeout(function () { applyCardOrder(display, list); }, 400);
        return function () {
          cancelAnimationFrame(frame);
          clearTimeout(timer);
        };
      }, [sourceKey, idsKey]);

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
        h("span", { key: "l", className: C !== null ? C.cellLabel : undefined, style: C === null ? S.boxTitle : undefined }, t("providers.title"))
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
          const rowChevron = icon("IconChevronRightOutline14", {
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
      return h("div", { ref: panelRef, style: panelStyle },
        head,
        panelOpen ? h("div", { style: S.floatBody }, list) : null
      );
    }

    /* -------------------------------- helpers --------------------------------- */
    /* The Models page renders one <li> per provider inside its own <ul>. The host
       owns that order (the settings document cannot express it — verified), so the
       stored preference is applied as CSS `order` on a flex column: the DOM is left
       exactly as React rendered it, only the visual sequence changes. Cards that do
       not correspond to a settings provider (catalog-only rows) stay pinned first. */
    function applyCardOrder(providers, ids) {
      try {
        const names = [];
        for (const id in providers) {
          const dn = providers[id] ? providers[id].displayName : undefined;
          if (typeof dn === "string" && dn.length > 0) names.push([id, dn]);
        }
        if (names.length === 0) return;
        names.sort(function (a, b) { return b[1].length - a[1].length; });

        let list = null;
        let best = 0;
        const lists = document.querySelectorAll("ul");
        for (let i = 0; i < lists.length; i++) {
          const items = lists[i].children;
          let hits = 0;
          for (let j = 0; j < items.length; j++) {
            const text = items[j].textContent || "";
            for (let k = 0; k < names.length; k++) if (text.indexOf(names[k][1]) !== -1) { hits++; break; }
          }
          if (hits >= 2 && hits > best) { best = hits; list = lists[i]; }
        }
        if (list === null) return;

        list.style.display = "flex";
        list.style.flexDirection = "column";
        const rank = {};
        for (let i = 0; i < ids.length; i++) rank[ids[i]] = i;
        const items = list.children;
        for (let i = 0; i < items.length; i++) {
          const text = items[i].textContent || "";
          let matched;
          for (let k = 0; k < names.length; k++) if (text.indexOf(names[k][1]) !== -1) { matched = names[k][0]; break; }
          const r = matched === undefined ? undefined : rank[matched];
          items[i].style.order = String(r === undefined ? -1 : r);
        }
      } catch (e) {}
    }

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
                  return directory.select(selection).then(function () { return true; }, function () { return false; });
                },
                t: t
              };
            }
          }, ProviderGroupedModelSelect); });
        });
      });

      ctx.inject(["slots", "settingsScope", "remote", "remote.settings"], function (scope) {
        const mirror = scope.settingsScope.describe();
        mirror.ensure();
        const mutate = function (ops, revision) { return scope.remote.settings.mutate(PI_AI_NS, ops, revision); };

        const face = function () {
          return { store: mirror, namespace: PI_AI_NS, mutate: mutate, t: t };
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
            }, ProviderOrderPanel);
          });
        });
      });
    }

    module.exports = { name: "model-organizer", apply: apply, inject: inject };
    return module.exports;
  }
});
