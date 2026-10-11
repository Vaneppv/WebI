/**
 * <custom-tabs> — Web Component de tabs (Shadow DOM, slots, animaciones, responsive).
 *
 * Uso:
 *   <custom-tabs active="0">
 *     <div slot="tab">Tab 1</div>   <div slot="panel">Contenido 1</div>
 *     <div slot="tab">Tab 2</div>   <div slot="panel">Contenido 2</div>
 *   </custom-tabs>
 *
 * Atributos:  active (índice), visible ("false" oculta el componente)
 * Propiedades: active, visible, tabCount
 * Métodos:    selectTab(i), addTab({title, content, select}), removeTab(i), show(), hide()
 * Eventos:    tab-change {index, previous}, visibility-change {visible}
 *             (bubbles + composed)
 * CSS vars:   --tabs-accent, --tabs-text, --tabs-muted, --tabs-border, --tabs-duration
 */
(() => {
  const tpl = document.createElement('template');
  tpl.innerHTML = `
  <style>
    :host{
      display:block; container-type:inline-size;
      --tabs-accent:#4f46e5; --tabs-text:#1f2937; --tabs-muted:#6b7280;
      --tabs-border:#e5e7eb; --tabs-duration:.3s;
      color:var(--tabs-text);
    }
    .root{ transform-origin:top center; transition:opacity .25s ease, transform .25s ease; }
    .root.is-hiding{ opacity:0; transform:scale(.97) translateY(-6px); }
    .root.is-hidden{ display:none; }

    .tabs-header{
      position:relative; display:flex; overflow-x:auto; scrollbar-width:none;
      border-bottom:1px solid var(--tabs-border);
    }
    .tabs-header::-webkit-scrollbar{ display:none; }

    .tab-indicator{
      position:absolute; left:0; bottom:0; width:1px; height:3px; border-radius:3px 3px 0 0;
      background:var(--tabs-accent); transform-origin:left; transform:scaleX(0);
      transition:transform var(--tabs-duration) cubic-bezier(.4,0,.2,1); pointer-events:none;
    }

    ::slotted([slot="tab"]){
      flex:none; padding:.75rem 1.25rem; cursor:pointer; user-select:none; white-space:nowrap;
      color:var(--tabs-muted); font-weight:500; transition:color .2s; outline-offset:-2px;
    }
    ::slotted([slot="tab"]:hover){ color:var(--tabs-text); }
    ::slotted([slot="tab"][aria-selected="true"]){ color:var(--tabs-accent); }

    .panels-container{ position:relative; overflow-x:clip; }
    ::slotted([slot="panel"]){ display:none; padding:1.25rem .25rem; }
    ::slotted([slot="panel"][data-state="active"]){ display:block; }
    ::slotted([slot="panel"][data-state="enter"]){
      display:block; animation:in-next var(--tabs-duration) ease both;
    }
    ::slotted([slot="panel"][data-state="exit"]){
      display:block; position:absolute; top:0; left:0; right:0; pointer-events:none;
      animation:out-next var(--tabs-duration) ease both;
    }
    ::slotted([slot="panel"][data-state="enter"][data-dir="prev"]){ animation-name:in-prev; }
    ::slotted([slot="panel"][data-state="exit"][data-dir="prev"]){ animation-name:out-prev; }

    @keyframes in-next { from{opacity:0; transform:translateX(24px)}  to{opacity:1; transform:none} }
    @keyframes out-next{ from{opacity:1; transform:none} to{opacity:0; transform:translateX(-24px)} }
    @keyframes in-prev { from{opacity:0; transform:translateX(-24px)} to{opacity:1; transform:none} }
    @keyframes out-prev{ from{opacity:1; transform:none} to{opacity:0; transform:translateX(24px)} }

    /* Contenedor estrecho: barra deslizable con snap */
    @container (max-width:520px){
      .tabs-header{ scroll-snap-type:x mandatory; }
      ::slotted([slot="tab"]){ padding:.7rem 1rem; scroll-snap-align:center; }
    }
    @media (prefers-reduced-motion:reduce){
      *, ::slotted(*){ animation-duration:.01ms !important; transition-duration:.01ms !important; }
    }
  </style>
  <div class="root" part="root">
    <div class="tabs-header" part="header" role="tablist">
      <slot name="tab"></slot>
      <div class="tab-indicator" part="indicator"></div>
    </div>
    <div class="panels-container" part="panels"><slot name="panel"></slot></div>
  </div>`;

  let uid = 0;

  class CustomTabs extends HTMLElement {
    static get observedAttributes() { return ['active', 'visible']; }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).appendChild(tpl.content.cloneNode(true));
      const $ = (s) => this.shadowRoot.querySelector(s);
      this._root = $('.root');
      this._header = $('.tabs-header');
      this._indicator = $('.tab-indicator');
      this._tabSlot = $('slot[name="tab"]');
      this._panelSlot = $('slot[name="panel"]');

      this._id = `ct${++uid}`;
      this._tabs = [];
      this._panels = [];
      this._current = -1;
      this._pending = null;
      this._shown = true;
      this._ready = false;
      this._silent = false;

      this._onClick = (e) => {
        const tab = e.target.closest?.('[slot="tab"]');
        const i = this._tabs.indexOf(tab);
        if (i > -1) this.selectTab(i);
      };
      this._onKey = (e) => {
        const n = this._tabs.length, i = this._current;
        if (!n || !e.target.closest?.('[slot="tab"]')) return;
        const map = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
        if (!(e.key in map)) return;
        e.preventDefault();
        this.selectTab(map[e.key]);
        this._tabs[this._current]?.focus();
      };
      this._onSlot = () => this._sync();
      this._ro = new ResizeObserver(() => this._moveIndicator(false));
    }

    /* ---------- Ciclo de vida ---------- */
    connectedCallback() {
      this._header.addEventListener('click', this._onClick);
      this._header.addEventListener('keydown', this._onKey);
      this._tabSlot.addEventListener('slotchange', this._onSlot);
      this._panelSlot.addEventListener('slotchange', this._onSlot);
      this._ro.observe(this._header);
      this._sync();
      document.fonts?.ready.then(() => this._moveIndicator(false));
      requestAnimationFrame(() => { this._ready = true; });
    }

    disconnectedCallback() {
      this._header.removeEventListener('click', this._onClick);
      this._header.removeEventListener('keydown', this._onKey);
      this._tabSlot.removeEventListener('slotchange', this._onSlot);
      this._panelSlot.removeEventListener('slotchange', this._onSlot);
      this._ro.disconnect();
      clearTimeout(this._timer);
      clearTimeout(this._vt);
      this._ready = false;
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal || this._silent) return;
      if (name === 'active') this._activate(this._clamp(newVal));
      else if (name === 'visible') this._applyVisible(newVal !== 'false', this._ready);
    }

    /* ---------- API pública ---------- */
    get active() { return this._current; }
    set active(v) { this.selectTab(v); }
    get visible() { return this.getAttribute('visible') !== 'false'; }
    set visible(v) { this.setAttribute('visible', String(!!v)); }
    get tabCount() { return this._tabs.length; }

    selectTab(index) {
      const i = this._clamp(index);
      if (i < 0) return;
      if (String(i) !== this.getAttribute('active')) this.setAttribute('active', i);
      else this._activate(i);
    }

    addTab({ title = '', content = '', select = false } = {}) {
      const tab = document.createElement('div');
      tab.slot = 'tab';
      tab.append(title instanceof Node ? title : document.createTextNode(String(title)));
      const panel = document.createElement('div');
      panel.slot = 'panel';
      if (content instanceof Node) panel.append(content); else panel.innerHTML = content; // string = HTML
      this.append(tab, panel);
      this._sync();
      const index = this._tabs.length - 1;
      if (select) this.selectTab(index);
      return index;
    }

    removeTab(index) {
      const tab = this._tabs[index];
      if (!tab) return;
      this._finish();
      const cur = this._current;
      this._panels[index]?.remove();
      tab.remove();
      const left = this._tabs.length - 1;
      this._current = index < cur ? cur - 1 : Math.min(cur, left - 1);
      this._sync();
      if (index === cur && this._current > -1) {
        this._emit('tab-change', { index: this._current, previous: index });
      }
    }

    show() { this.visible = true; }
    hide() { this.visible = false; }

    /* ---------- Internos ---------- */
    _emit(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    _clamp(v) {
      const n = this._tabs.length;
      if (!n) return -1;
      const i = parseInt(v, 10);
      return Number.isNaN(i) ? 0 : Math.max(0, Math.min(n - 1, i));
    }

    _collect() {
      const kids = [...this.children];
      const tabs = kids.filter((c) => c.getAttribute('slot') === 'tab');
      const panels = kids.filter((c) => c.getAttribute('slot') === 'panel');
      const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
      const changed = !same(tabs, this._tabs) || !same(panels, this._panels);
      this._tabs = tabs;
      this._panels = panels;
      return changed;
    }

    _sync() {
      const changed = this._collect();
      if (!changed && this._current >= 0) return;
      this._finish();
      if (!this._tabs.length) { this._current = -1; return; }
      this._current = this._clamp(this._current >= 0 ? this._current : this.getAttribute('active'));
      if (String(this._current) !== this.getAttribute('active')) {
        this._silent = true;
        this.setAttribute('active', this._current);
        this._silent = false;
      }
      this._render(false);
      this._scrollToTab(false);
    }

    _updateTabs() {
      this._tabs.forEach((t, i) => {
        const p = this._panels[i];
        t.id ||= `${this._id}-tab-${i}`;
        t.setAttribute('role', 'tab');
        t.setAttribute('aria-selected', String(i === this._current));
        t.tabIndex = i === this._current ? 0 : -1;
        if (p) {
          p.id ||= `${this._id}-panel-${i}`;
          p.setAttribute('role', 'tabpanel');
          p.setAttribute('aria-labelledby', t.id);
          t.setAttribute('aria-controls', p.id);
        }
      });
    }

    _render(animateIndicator) {
      this._panels.forEach((p, i) => {
        delete p.dataset.dir;
        if (i === this._current) p.dataset.state = 'active'; else delete p.dataset.state;
      });
      this._updateTabs();
      this._moveIndicator(animateIndicator);
    }

    _activate(next) {
      if (next < 0 || next === this._current) return;
      this._finish(); // cierra cualquier animación en curso (clicks rápidos)
      const prev = this._current;
      this._current = next;
      const out = this._panels[prev], inn = this._panels[next];

      if (!(this._ready && this._shown && prev >= 0 && out && inn)) {
        this._render(false);
        this._scrollToTab(false);
        if (prev >= 0) this._emit('tab-change', { index: next, previous: prev });
        return;
      }

      const dir = next > prev ? 'next' : 'prev';
      out.dataset.dir = inn.dataset.dir = dir;
      out.dataset.state = 'exit';
      inn.dataset.state = 'enter';
      this._updateTabs();
      this._moveIndicator(true);
      this._scrollToTab(true);

      const p = (this._pending = { out, inn, prev, next });
      const done = () => { if (this._pending === p) this._finish(); };
      inn.addEventListener('animationend', done, { once: true });
      this._timer = setTimeout(done, 700); // red de seguridad
    }

    _finish() {
      const p = this._pending;
      if (!p) return;
      this._pending = null;
      clearTimeout(this._timer);
      p.out.removeAttribute('data-state');
      delete p.out.dataset.dir;
      p.inn.dataset.state = 'active';
      delete p.inn.dataset.dir;
      this._emit('tab-change', { index: p.next, previous: p.prev });
    }

    _tabLeft(tab) {
      return tab.getBoundingClientRect().left - this._header.getBoundingClientRect().left + this._header.scrollLeft;
    }

    _moveIndicator(animate) {
      const t = this._tabs[this._current], ind = this._indicator;
      if (!this._shown) return;
      if (!t) { ind.style.transform = 'scaleX(0)'; return; }
      ind.style.transition = animate ? '' : 'none';
      ind.style.transform = `translateX(${this._tabLeft(t)}px) scaleX(${t.getBoundingClientRect().width})`;
      if (!animate) { void ind.offsetWidth; ind.style.transition = ''; }
    }

    _scrollToTab(smooth) {
      const t = this._tabs[this._current], h = this._header;
      if (!t || !this._shown) return;
      h.scrollTo?.({
        left: this._tabLeft(t) - (h.clientWidth - t.offsetWidth) / 2,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }

    _applyVisible(visible, animate) {
      if (visible === this._shown) return;
      this._shown = visible;
      clearTimeout(this._vt);
      const r = this._root;
      if (visible) {
        r.classList.remove('is-hidden');
        if (animate) { r.classList.add('is-hiding'); void r.offsetHeight; } // reflow forzado
        r.classList.remove('is-hiding');
        this._moveIndicator(false);
        this._scrollToTab(false);
      } else if (!animate) {
        r.classList.add('is-hidden');
      } else {
        r.classList.add('is-hiding');
        const end = () => { if (!this._shown) r.classList.add('is-hidden'); };
        r.addEventListener('transitionend', (e) => { if (e.target === r) end(); }, { once: true });
        this._vt = setTimeout(end, 450);
      }
      if (this._ready) this._emit('visibility-change', { visible });
    }
  }

  if (!customElements.get('custom-tabs')) customElements.define('custom-tabs', CustomTabs);
})();
