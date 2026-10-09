export class CustomTabs extends HTMLElement {
  static observedAttributes = ['active'];

  constructor() {
    super().attachShadow({ mode: 'open' }).innerHTML = `
      <style>:host { display: block; }</style>
      <div class="header"><slot name="tab"></slot></div>
      <div class="panels"><slot name="panel"></slot></div>
    `;
    this.shadowRoot.addEventListener('slotchange', () => this.#sync());
  }

  connectedCallback() {
    this.#sync();
  }

  attributeChangedCallback() {
    this.#sync();
  }

  get tabs() { return [...this.querySelectorAll(':scope > [slot=tab]')]; }
  get panels() { return [...this.querySelectorAll(':scope > [slot=panel]')]; }

  #sync() {
    const { tabs, panels } = this;
    const active = +this.getAttribute('active') || 0;
    tabs.forEach((t, i) => t.setAttribute('aria-selected', i === active));
    panels.forEach((p, i) => (p.hidden = i !== active));
  }
}

customElements.define('custom-tabs', CustomTabs);