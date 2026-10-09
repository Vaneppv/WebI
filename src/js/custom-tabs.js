export class CustomTabs extends HTMLElement {
  constructor() {
    super().attachShadow({ mode: 'open' }).innerHTML = `
      <style>:host { display: block; }</style>
      <div class="header"><slot name="tab"></slot></div>
      <div class="panels"><slot name="panel"></slot></div>
    `;
  }
}

customElements.define('custom-tabs', CustomTabs);