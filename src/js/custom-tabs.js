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

  #render() {
    const { tabs, panels } = this;
    if (!tabs.length) return;
    const i = Math.min(this.active, tabs.length - 1);
    if (i !== this.active) return this.setAttribute('active', i); // clamp, re-renders

    tabs.forEach((t, n) => {
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-selected', n === i);
      t.tabIndex = n === i ? 0 : -1;
    });
    panels.forEach((p, n) => (p.hidden = n !== i));

    if (this.#last !== undefined && this.#last !== i)
      this.#emit('tab-change', { index: i, previous: this.#last });
    this.#last = i;
  }
}

customElements.define('custom-tabs', CustomTabs);