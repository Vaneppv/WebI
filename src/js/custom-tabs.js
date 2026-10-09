export class CustomTabs extends HTMLElement {
  static observedAttributes = ['active', 'visible'];
  #last;

  constructor() {
    super().attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; }
        .root.off { display: none; }
      </style>
      <div class="root">
        <div class="header"><slot name="tab"></slot></div>
        <div class="panels"><slot name="panel"></slot></div>
      </div>`;
    const $ = (s) => this.shadowRoot.querySelector(s);
    this.root = $('.root');
    this.header = $('.header');

    this.shadowRoot.addEventListener('slotchange', () => this.#render());
    this.header.addEventListener('click', (e) =>
      this.selectTab(this.tabs.indexOf(e.target.closest('[slot=tab]'))));
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