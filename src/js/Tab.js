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

  // Estructura de los métodos que se hablaron en clase
  // addOption(config) {}
  // addRow(tabId, config) {}
  // ...
}