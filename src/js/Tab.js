export class TabComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
        throw new Error(`No se encontró el contenedor: ${containerId}`);
    }

    this.navBar = document.createElement('div');
    this.navBar.classList.add('tab-nav');

    this.contentArea = document.createElement('div');
    this.contentArea.classList.add('tab-content-area');

    this.container.appendChild(this.navBar);
    this.container.appendChild(this.contentArea);

    this.tabs = {}; // Objeto para almacenar las pestañas y sus contenidos
    this.activeTabId = null; 
  }

  addOption({id, label}) {
    if (this.tabs[id]) {
      // Seria bueno hacer un toast para que avise que ya existe la pestaña y no se puede agregar
      return this;
    }

    const btn = document.createElement('button');
    btn.classList.add('btn-tab');
    btn.textContent = label;
    btn.dataset.tabId = id;
    btn.addEventListener('click', () => this.setActiveTab(id));
    this.navBar.appendChild(btn);

    const panel = document.createElement('div');
    panel.classList.add('tab-panel');
    panel.style.display = 'none';
    this.contentArea.appendChild(panel);

    this.tabs[id] = { id, label, button: btn, panel, rows: [] };

    if (this.activeTabId === null) {
      this.setActiveTab(id);
    }
    return this;
  }
  
  setActiveTab(id) {
    const tab = this.tabs[id];
    if (!tab) {
      return;
    }
    if (this.activeTabId && this.tabs[this.activeTabId]) {
      this.tabs[this.activeTabId].panel.style.display = 'none';
      this.tabs[this.activeTabId].button.classList.remove('btn-tab--active');
    }
    tab.panel.style.display = 'flex';
    tab.button.classList.add('btn-tab--active');
    this.activeTabId = id;
  }
}
