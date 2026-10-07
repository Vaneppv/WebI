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

  addRow(tabId, { elements = [], style = {} }) {
    const tab = this.tabs[tabId];
    if (!tab) {
      console.warn(`Tab "${tabId}" not found`); // temporal
      return this;
    }

    const row = document.createElement('div');
    row.classList.add('tab-row');
    row.style.display = 'flex';
    Object.assign(row.style, style);

    for (const elConfig of elements) {
      const el = document.createElement(elConfig.type || 'div');
      
      if (elConfig.text) el.textContent = elConfig.text;
      if (elConfig.html) el.innerHTML = elConfig.html;
      if (elConfig.class) el.className = elConfig.class;
      if (elConfig.style) Object.assign(el.style, elConfig.style);
      if (elConfig.attrs) Object.entries(elConfig.attrs).forEach(([k, v]) => el.setAttribute(k, v));
      if (elConfig.on) Object.entries(elConfig.on).forEach(([event, handler]) => el.addEventListener(event, handler));

      row.appendChild(el);
    }

    tab.panel.appendChild(row);
    tab.rows.push(row);
    return this;
  }

  clearRow(tabId) {
    const tab = this.tabs[tabId];
    if (!tab) return this;
    tab.panel.innerHTML = '';
    tab.rows = [];
    return this;
  }

  deleteRow(tabId, index) {
    const tab = this.tabs[tabId];
    if (!tab || index < 0 || index >= tab.rows.length) return this;
    tab.rows[index].remove();
    tab.rows.splice(index, 1);
    return this;
  }

}

