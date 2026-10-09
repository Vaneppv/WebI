export class CustomTabs extends HTMLElement {
  static observedAttributes = ['active', 'visible'];
  #last;

  constructor() {
    super().attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; }
        .root.off { display: none; }
        .header { position: relative; display: flex; overflow-x: auto; scrollbar-width: none;
                  scroll-snap-type: x mandatory; border-bottom: 1px solid #e5e7eb; }
        .bar { position: absolute; left: 0; bottom: 0; width: 1px; height: 3px; transform-origin: left;
               background: var(--tabs-accent, #4f46e5); transition: transform .3s; }
        ::slotted([slot=tab]) { flex: none; padding: .75rem 1.25rem; cursor: pointer;
                                color: #6b7280; scroll-snap-align: center; }
        ::slotted([aria-selected=true]) { color: var(--tabs-accent, #4f46e5); }
        .panels { position: relative; overflow-x: clip; }
        ::slotted([slot=panel]) { padding: 1.25rem .25rem; }
        ::slotted([data-exit]) { position: absolute; top: 0; left: 0; right: 0; pointer-events: none; }
      </style>
      <div class="root">
        <div class="header"><slot name="tab"></slot><i class="bar"></i></div>
        <div class="panels"><slot name="panel"></slot></div>
      </div>`;
    const $ = (s) => this.shadowRoot.querySelector(s);
    this.root = $('.root'); this.header = $('.header'); this.bar = $('.bar');

    this.shadowRoot.addEventListener('slotchange', () => this.#render());
    this.header.addEventListener('click', (e) =>
      this.selectTab(this.tabs.indexOf(e.target.closest('[slot=tab]'))));
    this.header.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key], n = this.tabCount;
      if (d) { this.selectTab((this.active + d + n) % n); this.tabs[this.active].focus(); }
    });
  }

  attributeChangedCallback(name) {
    if (name === 'active') return this.#render();
    this.root.classList.toggle('off', !this.visible);
    this.#emit('visibility-change', { visible: this.visible });
  }

  get tabs() { return [...this.querySelectorAll(':scope > [slot=tab]')]; }
  get panels() { return [...this.querySelectorAll(':scope > [slot=panel]')]; }
  get tabCount() { return this.tabs.length; }
  get active() { return +this.getAttribute('active') || 0; }
  set active(i) { this.selectTab(i); }
  get visible() { return this.getAttribute('visible') !== 'false'; }
  set visible(v) { this.setAttribute('visible', !!v); }

  selectTab(i) { if (i >= 0 && i < this.tabCount) this.setAttribute('active', i); }
  show() { this.visible = true; }
  hide() { this.visible = false; }

  addTab({ title = '', content = '', select = false } = {}) {
    const tab = Object.assign(document.createElement('div'), { slot: 'tab' });
    const panel = Object.assign(document.createElement('div'), { slot: 'panel' });
    tab.append(title);
    typeof content === 'string' ? (panel.innerHTML = content) : panel.append(content);
    this.append(tab, panel);
    if (select) this.selectTab(this.tabCount - 1);
    return this.tabCount - 1;
  }

  removeTab(i) { this.tabs[i]?.remove(); this.panels[i]?.remove(); }

  #emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  #render(animate = true) {
    const { tabs, panels, header: h } = this;
    if (!tabs.length) return;
    const i = Math.min(this.active, tabs.length - 1);
    if (i !== this.active) return this.setAttribute('active', i); // clamp, re-renders

    const prev = this.#last, quick = !animate || prev === undefined;
    tabs.forEach((t, n) => {
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-selected', n === i);
      t.tabIndex = n === i ? 0 : -1;
    });
    const out = i !== prev && !quick ? panels[prev] : null;
    if (i !== prev) panels.forEach((p) => {
      p.getAnimations().forEach((a) => a.cancel());
      p.removeAttribute('data-exit');
    });
    out?.setAttribute('data-exit', '');
    panels.forEach((p, n) => (p.hidden = n !== i && !p.hasAttribute('data-exit')));

    const r = tabs[i].getBoundingClientRect(), hr = h.getBoundingClientRect();
    const x = r.left - hr.left + h.scrollLeft;
    this.bar.style.transition = quick ? 'none' : '';
    this.bar.style.transform = `translateX(${x}px) scaleX(${r.width})`;
    h.scrollTo({ left: x - (hr.width - r.width) / 2, behavior: quick ? 'auto' : 'smooth' });

    if (prev !== undefined && prev !== i) {
      const dx = i > prev ? 24 : -24, opts = { duration: 300, easing: 'ease' };
      if (out) {
        out.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dx}px)` }],
          { ...opts, fill: 'forwards' })
          .finished.then(() => { out.hidden = true; out.removeAttribute('data-exit'); }, () => {});
        panels[i]?.animate([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], opts);
      }
      this.#emit('tab-change', { index: i, previous: prev });
    }
    this.#last = i;
  }
}

customElements.define('custom-tabs', CustomTabs);