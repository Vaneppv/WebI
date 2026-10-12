/**
 * Tabs — la fachada.
 *
 * Compone las dos piezas y las presenta como una sola. Quien la usa hace
 * new Tabs(root).addOption(...).addRow(...) y no necesita saber que hay
 * un TabChrome por un lado y un TabContent por otro.
 *
 * El tabId se mantiene en la superficie publica por compatibilidad con
 * la API anterior, aunque hacia adentro no hace falta: cada TabContent ya
 * tiene su panel inyectado y no sabe que id tiene.
 */

import { TabChrome } from './TabChrome.js';
import { TabContent } from './TabContent.js';

export class Tabs {
  #chrome;
  #contents = new Map();

  /**
   * @param {HTMLElement} root Contenedor.
   * @param {{accent?: string}} [options] Solo variables CSS: la
   *   estructura interna del componente queda intacta.
   */
  constructor(root, { accent } = {}) {
    this.#chrome = new TabChrome(root);

    if (accent) {
      this.#chrome.element.style.setProperty('--tabs-accent', accent);
    }
  }

  get tabIds() {
    return this.#chrome.tabIds;
  }

  get length() {
    return this.#chrome.length;
  }

  get activeId() {
    return this.#chrome.activeId;
  }

  /**
   * Agrega una pestaña y le inyecta su componente de contenido.
   * @param {{id: string, label: string}} option
   * @returns {this}
   */
  addOption({ id, label } = {}) {
    this.#chrome.addOption({ id, label });

    const panel = this.#chrome.getPanel(id);
    if (panel) this.#contents.set(id, new TabContent(panel));

    return this;
  }

  /**
   * Agrega una fila al panel indicado.
   * @param {string} tabId
   * @param {{elements?: object[], style?: object, class?: string}} config
   * @returns {this}
   */
  addRow(tabId, config = {}) {
    const content = this.#contents.get(tabId);

    if (!content) {
      console.warn(`Tabs: la pestaña "${tabId}" no existe.`);
      return this;
    }

    content.addRow(config);

    return this;
  }

  /**
   * Elimina una fila por indice.
   * @param {string} tabId
   * @param {number} index
   * @returns {this}
   */
  deleteRow(tabId, index) {
    this.#contents.get(tabId)?.deleteRow(index);

    return this;
  }

  /**
   * Vacia un panel.
   * @param {string} tabId
   * @returns {this}
   */
  clearRow(tabId) {
    this.#contents.get(tabId)?.clearRow();

    return this;
  }

  /**
   * Cantidad de filas de un panel.
   * @param {string} tabId
   * @returns {number}
   */
  rowCount(tabId) {
    return this.#contents.get(tabId)?.length ?? 0;
  }

  /**
   * Elimina una pestaña con su contenido.
   * @param {string} tabId
   * @returns {this}
   */
  removeOption(tabId) {
    this.#contents.get(tabId)?.destroy();
    this.#contents.delete(tabId);
    this.#chrome.removeOption(tabId);

    return this;
  }

  /**
   * @param {string} tabId
   * @returns {this}
   */
  selectTab(tabId) {
    this.#chrome.selectTab(tabId);

    return this;
  }

  /** @returns {this} */
  show() {
    this.#chrome.show();
    return this;
  }

  /** @returns {this} */
  hide() {
    this.#chrome.hide();
    return this;
  }

  /**
   * @param {string} type tab-change | visibility-change
   * @param {Function} handler
   * @returns {this}
   */
  on(type, handler) {
    this.#chrome.on(type, handler);

    return this;
  }
}

export { TabChrome } from './TabChrome.js';
export { TabContent } from './TabContent.js';