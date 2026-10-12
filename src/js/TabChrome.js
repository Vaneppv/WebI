/**
 * TabChrome — la pieza exterior del componente.
 *
 * Responsabilidad unica: el cuadrado. La barra de navegacion, que panel
 * esta activo, la animacion, el teclado y la accesibilidad. No sabe que
 * existen filas ni que hay un TabContent adentro: solo expone el panel
 * para que la capa de arriba se lo inyecte.
 *
 * Envuelve el custom element <custom-tabs> en lugar de exponerlo. Asi el
 * consumidor depende de esta interfaz y no de la implementacion: si manana
 * el custom element cambia, la fachada no se entera.
 */

import './custom-tabs.js';

export class TabChrome {
  #root;
  #el;
  #order = [];
  #entries = new Map();

  /**
   * @param {HTMLElement} root Contenedor. Se recibe el elemento ya
   *   resuelto: el componente no busca nada por id en el documento.
   */
  constructor(root) {
    if (!root || root.nodeType !== 1) {
      throw new TypeError('TabChrome: se esperaba un elemento contenedor.');
    }

    this.#root = root;
    this.#el = document.createElement('custom-tabs');
    this.#el.setAttribute('active', '0');

    this.#root.append(this.#el);
  }

  /** Elemento contenedor. */
  get root() {
    return this.#root;
  }

  /** Custom element underlying. */
  get element() {
    return this.#el;
  }

  /** Ids de las pestañas, en orden. */
  get tabIds() {
    return [...this.#order];
  }

  get length() {
    return this.#order.length;
  }

  /** Id de la pestaña activa, o null si no hay ninguna. */
  get activeId() {
    const index = this.#el.active;
    return index >= 0 ? (this.#order[index] ?? null) : null;
  }

  /**
   * Agrega una pestaña con su panel vacio.
   * Los nodos se crean y se anexan directamente: no se pasa por addTab()
   * ni por innerHTML, para no abrir un sink de HTML.
   * @param {{id: string, label: string}} option
   * @returns {this}
   */
  addOption({ id, label } = {}) {
    if (id == null || label == null) {
      throw new TypeError('TabChrome: addOption necesita { id, label }.');
    }
    if (this.#entries.has(id)) return this;

    const tabEl = document.createElement('div');
    tabEl.slot = 'tab';
    tabEl.textContent = String(label);

    const panelEl = document.createElement('div');
    panelEl.slot = 'panel';

    this.#el.append(tabEl, panelEl);

    this.#entries.set(id, { id, label, tabEl, panelEl });
    this.#order.push(id);

    return this;
  }

  /**
   * Panel de una pestaña, para inyectarle un TabContent.
   * @param {string} id
   * @returns {HTMLElement | null}
   */
  getPanel(id) {
    return this.#entries.get(id)?.panelEl ?? null;
  }

  /**
   * Elimina una pestaña y su panel.
   * @param {string} id
   * @returns {this}
   */
  removeOption(id) {
    const entry = this.#entries.get(id);
    if (!entry) return this;

    entry.tabEl.remove();
    entry.panelEl.remove();

    this.#entries.delete(id);
    this.#order.splice(this.#order.indexOf(id), 1);

    return this;
  }

  /**
   * Activa una pestaña por id.
   * @param {string} id
   * @returns {this}
   */
  selectTab(id) {
    if (!this.#entries.has(id)) return this;

    // El reparto de slots se resuelve en una microtask. Si todavia no
    // ocurrio, el custom element todavia no ve las pestanas y la
    // seleccion se perderia en silencio.
    if (this.#el.tabCount === 0) {
      queueMicrotask(() => {
        const index = this.#order.indexOf(id);
        if (index >= 0) this.#el.selectTab(index);
      });
      return this;
    }

    this.#el.selectTab(this.#order.indexOf(id));

    return this;
  }

  /** @returns {this} */
  show() {
    this.#el.show();
    return this;
  }

  /** @returns {this} */
  hide() {
    this.#el.hide();
    return this;
  }

  /**
   * Escucha tab-change / visibility-change del custom element.
   * @param {string} type
   * @param {Function} handler
   * @returns {this}
   */
  on(type, handler) {
    this.#el.addEventListener(type, handler);
    return this;
  }
}