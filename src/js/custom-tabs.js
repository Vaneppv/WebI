/**
 * <custom-tabs> — Web Component de pestañas (Shadow DOM, slots, animaciones).
 *
 * Permite declarar las pestañas por HTML o por JS, y es responsivo
 * (container queries + barra deslizable con snap). El contenido de cada
 * pestaña puede ser:
 *   - HTML plano:  <div slot="panel">...</div>
 *   - un componente: <custom-panel slot="panel">...</custom-panel>
 *
 * Desacoplamiento: este archivo NO importa custom-panel. Detecta el contrato
 * de filas por duck-typing (typeof panel.addRow === 'function'). Si el panel
 * lo cumple, delega; si no, maneja las filas el mismo (fallback).
 *
 * HTML:
 *   <custom-tabs active="0">
 *     <div slot="tab" data-tab-id="inicio">Inicio</div>
 *     <custom-panel slot="panel">...</custom-panel>
 *     <div slot="tab" data-tab-id="perfil">Perfil</div>
 *     <div slot="panel">...</div>
 *   </custom-tabs>
 *
 * JS:
 *   tabs.addTab({ title: 'Aulas', id: 'aulas', select: true });
 *   tabs.addRow('aulas', { elements: [{ type: 'span', text: 'Aula 101' }] });
 *   tabs.selectTab(1); tabs.selectTab('aulas');
 *
 * Atributos:   active (indice), visible ("false" oculta el componente)
 * Propiedades: active, activeId, visible, tabCount, tabs, panels
 * Metodos:     selectTab(key), addTab(opts), removeTab(key),
 *              addRow(key, config), addElement(key, rowIndex, spec),
 *              deleteRow(key, index), clearRow(key), rowCount(key),
 *              getRow(key, rowIndex), show(), hide()
 * Eventos:     tab-change {index, previous, id}, visibility-change {visible}
 * Tema:        --tabs-accent, --tabs-text, --tabs-muted, --tabs-border,
 *              --tabs-duration
 *
 * `key` acepta un indice o un id (data-tab-id).
 */

const TABS_HTML = `
  <style>
    :host {
      display: block;
      container-type: inline-size;
      --tabs-accent: #4f46e5;
      --tabs-text: #1f2937;
      --tabs-muted: #6b7280;
      --tabs-border: #e5e7eb;
      --tabs-duration: .3s;
      color: var(--tabs-text);
    }

    .root {
      transform-origin: top center;
      transition: opacity .25s ease, transform .25s ease;
    }
    .root.is-hiding { opacity: 0; transform: scale(.97) translateY(-6px); }
    .root.is-hidden { display: none; }

    .header {
      position: relative; display: flex; overflow-x: auto; scrollbar-width: none;
      border-bottom: 1px solid var(--tabs-border);
    }
    .header::-webkit-scrollbar { display: none; }

    .bar {
      position: absolute; left: 0; bottom: 0; width: 1px; height: 3px;
      border-radius: 3px 3px 0 0; background: var(--tabs-accent);
      transform-origin: left; transform: scaleX(0); pointer-events: none;
      transition: transform var(--tabs-duration) cubic-bezier(.4, 0, .2, 1);
    }

    ::slotted([slot="tab"]) {
      flex: none; padding: .75rem 1.25rem; cursor: pointer; user-select: none;
      white-space: nowrap; color: var(--tabs-muted); font-weight: 500;
      transition: color .2s; outline-offset: -2px;
    }
    ::slotted([slot="tab"]:hover) { color: var(--tabs-text); }
    ::slotted([slot="tab"][aria-selected="true"]) { color: var(--tabs-accent); }

    .panels { position: relative; overflow-x: clip; }
    ::slotted([slot="panel"]) { display: none; padding: 1.25rem .25rem; }
    ::slotted([slot="panel"][data-state="active"]) { display: block; }
    ::slotted([slot="panel"][data-state="enter"]) {
      display: block;
      animation: tab-in-next var(--tabs-duration) ease both;
    }
    ::slotted([slot="panel"][data-state="exit"]) {
      display: block; position: absolute; top: 0; left: 0; right: 0;
      pointer-events: none;
      animation: tab-out-next var(--tabs-duration) ease both;
    }
    ::slotted([slot="panel"][data-dir="prev"][data-state="enter"]) { animation-name: tab-in-prev; }
    ::slotted([slot="panel"][data-dir="prev"][data-state="exit"]) { animation-name: tab-out-prev; }

    @keyframes tab-in-next  { from { opacity: 0; transform: translateX(24px); }  to { opacity: 1; transform: none; } }
    @keyframes tab-out-next { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(-24px); } }
    @keyframes tab-in-prev  { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
    @keyframes tab-out-prev { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(24px); } }

    /* Contenedor estrecho: barra deslizable con snap */
    @container (max-width: 520px) {
      .header { scroll-snap-type: x mandatory; }
      ::slotted([slot="tab"]) { padding: .7rem 1rem; scroll-snap-align: center; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, ::slotted(*) {
        animation-duration: .01ms !important;
        transition-duration: .01ms !important;
      }
    }
  </style>
  <div class="root" part="root">
    <div class="header" part="header" role="tablist">
      <slot name="tab"></slot>
      <div class="bar" part="indicator"></div>
    </div>
    <div class="panels" part="panels"><slot name="panel"></slot></div>
  </div>`;

const PANEL_ATTR = 'data-tab-id';
let uid = 0;

class CustomTabs extends HTMLElement {
  static observedAttributes = ['active', 'visible'];

  #root;
  #header;
  #bar;
  #tabSlot;
  #panelSlot;
  #id = `ct${++uid}`;

  #tabs = [];
  #panels = [];
  #fallbackRows = new WeakMap();

  #current = -1;
  #pending = null;
  #timer = 0;
  #vt = 0;
  #shown = true;
  #ready = false;
  #silent = false;

  #onClick;
  #onKey;
  #onSlot;
  #ro;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = TABS_HTML;
    const $ = (s) => shadow.querySelector(s);
    this.#root = $('.root');
    this.#header = $('.header');
    this.#bar = $('.bar');
    this.#tabSlot = $('slot[name="tab"]');
    this.#panelSlot = $('slot[name="panel"]');

    this.#onClick = (e) => {
      const tab = this.#tabFromEvent(e);
      const i = tab ? this.#tabs.indexOf(tab) : -1;
      if (i > -1) this.selectTab(i);
    };
    this.#onKey = (e) => {
      const n = this.#tabs.length;
      if (!n || !this.#tabFromEvent(e)) return;
      const i = this.#current;
      const map = {
        ArrowRight: (i + 1) % n,
        ArrowLeft: (i - 1 + n) % n,
        Home: 0,
        End: n - 1,
      };
      if (!(e.key in map)) return;
      e.preventDefault();
      this.selectTab(map[e.key]);
      this.#tabs[this.#current]?.focus();
    };
    this.#onSlot = () => this.#sync();
  }

  /* ---------- Ciclo de vida ---------- */

  connectedCallback() {
    this.#header.addEventListener('click', this.#onClick);
    this.#header.addEventListener('keydown', this.#onKey);
    this.#tabSlot.addEventListener('slotchange', this.#onSlot);
    this.#panelSlot.addEventListener('slotchange', this.#onSlot);

    this.#ro = new ResizeObserver(() => this.#moveBar(false));
    this.#ro.observe(this.#header);

    this.#sync();
    document.fonts?.ready.then(() => this.#moveBar(false));

    requestAnimationFrame(() => {
      this.#ready = true;
      // Aparicion inicial animada del componente.
      if (this.#shown) {
        this.#root.classList.add('is-hiding');
        requestAnimationFrame(() => this.#root.classList.remove('is-hiding'));
      }
    });
  }

  disconnectedCallback() {
    this.#header.removeEventListener('click', this.#onClick);
    this.#header.removeEventListener('keydown', this.#onKey);
    this.#tabSlot.removeEventListener('slotchange', this.#onSlot);
    this.#panelSlot.removeEventListener('slotchange', this.#onSlot);
    this.#ro?.disconnect();
    clearTimeout(this.#timer);
    clearTimeout(this.#vt);
    this.#pending = null;
    this.#ready = false;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.#silent) return;
    if (name === 'active') {
      const i = this.#resolveIndex(newValue);
      if (i >= 0 && String(i) !== String(newValue)) {
        this.#silent = true;
        this.setAttribute('active', String(i));
        this.#silent = false;
      }
      this.#activate(i);
    } else if (name === 'visible') {
      this.#applyVisible(newValue !== 'false', this.#ready);
    }
  }

  /* ---------- API publica ---------- */

  /** Indice de la pestaña activa (-1 si no hay). */
  get active() { return this.#current; }
  set active(v) { this.selectTab(v); }

  /** id (data-tab-id) de la pestaña activa, o null. */
  get activeId() {
    return this.#tabs[this.#current]?.getAttribute(PANEL_ATTR) ?? null;
  }

  get visible() { return this.getAttribute('visible') !== 'false'; }
  set visible(v) { this.setAttribute('visible', String(!!v)); }

  get tabCount() { return this.#tabs.length; }
  get tabs() { return [...this.#tabs]; }
  get panels() { return [...this.#panels]; }

  /**
   * Activa una pestaña por indice o id.
   * @param {number | string} key
   */
  selectTab(key) {
    const i = this.#resolveIndex(key);
    if (i < 0) return;
    if (String(i) !== this.getAttribute('active')) this.setAttribute('active', String(i));
    else this.#activate(i);
  }

  /**
   * Agrega una pestaña (y su panel) al final.
   * @param {{title?: string | Node, content?: string | Node, rows?: object[],
   *          select?: boolean, id?: string}} [opts]
   * @returns {number} indice de la pestaña creada
   */
  addTab(opts = {}) {
    const { title = '', content = '', rows, select = false, id } = opts;

    const tab = document.createElement('div');
    tab.slot = 'tab';
    tab.append(title instanceof Node ? title : document.createTextNode(String(title)));
    if (id != null) tab.setAttribute(PANEL_ATTR, String(id));

    const panel = this.#createPanel();
    this.#fillPanel(panel, content);
    this.append(tab, panel);
    this.#sync();

    const index = this.#tabs.indexOf(tab);
    if (Array.isArray(rows)) rows.forEach((config) => this.addRow(index, config));
    if (select) this.selectTab(index);

    return index;
  }

  /**
   * Elimina una pestaña por indice o id.
   * @param {number | string} key
   */
  removeTab(key) {
    const i = this.#resolveIndex(key);
    const tab = this.#tabs[i];
    if (!tab) return;

    this.#finish();
    const previous = this.#current;
    this.#panels[i]?.remove();
    tab.remove();

    const left = this.#tabs.length - 1;
    this.#current = i < previous ? previous - 1 : Math.min(previous, left - 1);
    this.#sync();

    if (i === previous && this.#current > -1) {
      this.#emit('tab-change', { index: this.#current, previous, id: this.activeId });
    }
  }

  /**
   * Agrega una fila al panel de una pestaña. Delega en el panel si cumple el
   * contrato (addRow); si no, la maneja el mismo (fallback).
   * @param {number | string} key
   * @param {{elements?: object[], style?: object, class?: string}} config
   */
  addRow(key, config) {
    const panel = this.#panelOf(key);
    if (!panel) return this.#warn(key);

    if (this.#isRichPanel(panel)) {
      panel.addRow(config);
      return this;
    }

    const row = this.#buildRow(config);
    const rows = this.#fallbackRows.get(panel) ?? this.#fallbackRows.set(panel, []).get(panel);
    rows.push(row);
    panel.append(row);

    return this;
  }

  /**
   * Elimina una fila del panel de una pestaña.
   * @param {number | string} key
   * @param {number} index
   */
  deleteRow(key, index) {
    const panel = this.#panelOf(key);
    if (!panel) return this.#warn(key);

    if (this.#isRichPanel(panel)) {
      panel.deleteRow(index);
      return this;
    }

    const rows = this.#fallbackRows.get(panel) ?? [];
    const row = rows[index];
    if (row) {
      row.remove();
      rows.splice(index, 1);
    }

    return this;
  }

  /**
   * Vacia las filas del panel de una pestaña.
   * @param {number | string} key
   */
  clearRow(key) {
    const panel = this.#panelOf(key);
    if (!panel) return this.#warn(key);

    if (this.#isRichPanel(panel)) {
      panel.clearRow();
      return this;
    }

    for (const row of (this.#fallbackRows.get(panel) ?? []).splice(0)) row.remove();

    return this;
  }

  /**
   * Cantidad de filas del panel de una pestaña.
   * @param {number | string} key
   * @returns {number}
   */
  rowCount(key) {
    const panel = this.#panelOf(key);
    if (!panel) return 0;
    if (this.#isRichPanel(panel)) return panel.rowCount ?? 0;
    return (this.#fallbackRows.get(panel) ?? []).length;
  }

  /**
   * Agrega un elemento al final de una fila de una pestaña.
   * @param {number | string} key
   * @param {number} rowIndex
   * @param {object | Node} spec
   */
  addElement(key, rowIndex, spec) {
    const panel = this.#panelOf(key);
    if (!panel) return this.#warn(key);

    if (this.#isRichPanel(panel) && typeof panel.addElement === 'function') {
      panel.addElement(rowIndex, spec);
      return this;
    }

    const row = (this.#fallbackRows.get(panel) ?? [])[rowIndex];
    if (row) row.append(spec instanceof Node ? spec : this.#build(spec));

    return this;
  }

  /**
   * Devuelve el elemento de una fila (para ediciones avanzadas) o null.
   * @param {number | string} key
   * @param {number} rowIndex
   * @returns {HTMLElement | null}
   */
  getRow(key, rowIndex) {
    const panel = this.#panelOf(key);
    if (!panel) return null;
    if (this.#isRichPanel(panel) && typeof panel.getRow === 'function') {
      return panel.getRow(rowIndex);
    }
    return (this.#fallbackRows.get(panel) ?? [])[rowIndex] ?? null;
  }

  show() { this.visible = true; }
  hide() { this.visible = false; }

  /* ---------- Internos ---------- */

  #emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  /** Encuentra la pestaña dentro de la ruta compuesta del evento. */
  #tabFromEvent(e) {
    return e.composedPath().find(
      (n) => typeof n.getAttribute === 'function' && n.getAttribute('slot') === 'tab'
    ) ?? null;
  }

  #warn(key) {
    console.warn(`custom-tabs: no existe la pestaña "${key}".`);
    return this;
  }

  #isRichPanel(panel) {
    return typeof panel?.addRow === 'function';
  }

  #panelOf(key) {
    const i = this.#resolveIndex(key);
    return this.#panels[i] ?? null;
  }

  #resolveIndex(key) {
    const n = this.#tabs.length;
    if (!n) return -1;

    if (typeof key === 'string' && !/^\d+$/.test(key.trim())) {
      return this.#tabs.findIndex((t) => t.getAttribute(PANEL_ATTR) === key.trim());
    }

    const i = parseInt(key, 10);
    if (Number.isNaN(i)) return 0;
    return Math.max(0, Math.min(n - 1, i));
  }

  #createPanel() {
    const panel = customElements.get('custom-panel')
      ? document.createElement('custom-panel')
      : document.createElement('div');
    panel.slot = 'panel';
    return panel;
  }

  #fillPanel(panel, content) {
    if (content == null || content === '') return;
    if (content instanceof Node) panel.append(content);
    else panel.innerHTML = String(content); // string = HTML del autor
  }

  #buildRow({ elements = [], style, class: className } = {}) {
    const row = document.createElement('div');
    row.className = className ? `custom-tabs-row ${className}` : 'custom-tabs-row';
    if (style) Object.assign(row.style, style);

    for (const spec of elements) {
      if (spec instanceof Node) row.append(spec);
      else if (spec && typeof spec === 'object') row.append(this.#build(spec));
    }

    return row;
  }

  #build(spec) {
    const el = document.createElement(spec.type ?? 'div');
    if (spec.text != null) el.textContent = String(spec.text);
    if (spec.html != null) el.innerHTML = String(spec.html);
    if (spec.class) el.className = spec.class;
    if (spec.style) Object.assign(el.style, spec.style);

    if (spec.attrs) {
      for (const [name, value] of Object.entries(spec.attrs)) el.setAttribute(name, value);
    }
    if (spec.on) {
      for (const [event, handler] of Object.entries(spec.on)) {
        if (typeof handler === 'function') el.addEventListener(event, handler);
      }
    }
    for (const child of spec.children ?? []) {
      if (child instanceof Node) el.append(child);
      else if (child && typeof child === 'object') el.append(this.#build(child));
    }

    return el;
  }

  #collect() {
    const kids = [...this.children];
    const tabs = kids.filter((c) => c.getAttribute('slot') === 'tab');
    const panels = kids.filter((c) => c.getAttribute('slot') === 'panel');
    const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const changed = !same(tabs, this.#tabs) || !same(panels, this.#panels);
    this.#tabs = tabs;
    this.#panels = panels;
    return changed;
  }

  #sync() {
    const changed = this.#collect();
    if (!changed && this.#current >= 0) return;

    this.#finish();
    if (!this.#tabs.length) {
      this.#current = -1;
      return;
    }

    this.#current = this.#resolveIndex(this.#current >= 0 ? this.#current : this.getAttribute('active'));
    if (String(this.#current) !== this.getAttribute('active')) {
      this.#silent = true;
      this.setAttribute('active', String(this.#current));
      this.#silent = false;
    }

    this.#render(false);
    this.#scrollToTab(false);
  }

  #updateA11y() {
    this.#tabs.forEach((tab, i) => {
      const panel = this.#panels[i];
      tab.id ||= `${this.#id}-tab-${i}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(i === this.#current));
      tab.tabIndex = i === this.#current ? 0 : -1;

      if (panel) {
        panel.id ||= `${this.#id}-panel-${i}`;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tab.id);
        tab.setAttribute('aria-controls', panel.id);
      }
    });
  }

  #render(animateBar) {
    this.#panels.forEach((panel, i) => {
      if (i === this.#current) panel.dataset.state = 'active';
      else delete panel.dataset.state;
    });
    this.#updateA11y();
    this.#moveBar(animateBar);
  }

  #activate(next) {
    if (next < 0 || next === this.#current) return;

    this.#finish(); // cierra animaciones en curso (clics rapidos)
    const prev = this.#current;
    this.#current = next;
    const out = this.#panels[prev];
    const inn = this.#panels[next];

    if (!(this.#ready && this.#shown && prev >= 0 && out && inn)) {
      this.#render(false);
      this.#scrollToTab(false);
      if (prev >= 0) this.#emit('tab-change', { index: next, previous: prev, id: this.activeId });
      return;
    }

    const dir = next > prev ? 'next' : 'prev';
    out.dataset.dir = inn.dataset.dir = dir;
    out.dataset.state = 'exit';
    inn.dataset.state = 'enter';
    this.#updateA11y();
    this.#moveBar(true);
    this.#scrollToTab(true);

    const pending = { out, inn, prev, next };
    this.#pending = pending;
    const done = () => { if (this.#pending === pending) this.#finish(); };
    inn.addEventListener('animationend', (e) => { if (e.target === inn) done(); }, { once: true });
    this.#timer = setTimeout(done, 700); // red de seguridad
  }

  #finish() {
    const pending = this.#pending;
    if (!pending) return;

    this.#pending = null;
    clearTimeout(this.#timer);
    pending.out.removeAttribute('data-state');
    delete pending.out.dataset.dir;
    pending.inn.dataset.state = 'active';
    delete pending.inn.dataset.dir;
    this.#emit('tab-change', { index: pending.next, previous: pending.prev, id: this.activeId });
  }

  #tabLeft(tab) {
    return tab.getBoundingClientRect().left - this.#header.getBoundingClientRect().left + this.#header.scrollLeft;
  }

  #moveBar(animate) {
    if (!this.#shown) return;
    const tab = this.#tabs[this.#current];
    if (!tab) {
      this.#bar.style.transform = 'scaleX(0)';
      return;
    }
    this.#bar.style.transition = animate ? '' : 'none';
    this.#bar.style.transform = `translateX(${this.#tabLeft(tab)}px) scaleX(${tab.getBoundingClientRect().width})`;
    if (!animate) {
      void this.#bar.offsetWidth; // reflow para no animar el salto
      this.#bar.style.transition = '';
    }
  }

  #scrollToTab(smooth) {
    if (!this.#shown) return;
    const tab = this.#tabs[this.#current];
    if (!tab) return;
    this.#header.scrollTo?.({
      left: this.#tabLeft(tab) - (this.#header.clientWidth - tab.offsetWidth) / 2,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  #applyVisible(visible, animate) {
    if (visible === this.#shown) return;
    this.#shown = visible;
    clearTimeout(this.#vt);

    const root = this.#root;
    if (visible) {
      root.classList.remove('is-hidden');
      if (animate) {
        root.classList.add('is-hiding');
        void root.offsetHeight; // reflow forzado
      }
      root.classList.remove('is-hiding');
      this.#moveBar(false);
      this.#scrollToTab(false);
    } else if (!animate) {
      root.classList.add('is-hidden');
    } else {
      root.classList.add('is-hiding');
      const end = () => { if (!this.#shown) root.classList.add('is-hidden'); };
      root.addEventListener('transitionend', (e) => { if (e.target === root) end(); }, { once: true });
      this.#vt = setTimeout(end, 450);
    }

    if (this.#ready) this.#emit('visibility-change', { visible });
  }
}

if (!customElements.get('custom-tabs')) {
  customElements.define('custom-tabs', CustomTabs);
}

export { CustomTabs };
