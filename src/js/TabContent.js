/**
 * TabContent — la pieza interior del componente.
 *
 * Responsabilidad unica: que hay dentro de un panel. No sabe que existen
 * pestañas, ni cuantas hay, ni cual esta activa. Recibe el panel ya
 * resuelto por inyeccion, y por eso su API no necesita un tabId.
 *
 * No usa innerHTML en ningun punto. Los nodos se construyen con
 * createElement y textContent, y el anidamiento se resuelve con
 * `children`, de forma recursiva.
 *
 *   new TabContent(panel).addRow({
 *     elements: [
 *       { type: 'span', text: 'Juan Perez', class: 'nombre' },
 *       { type: 'span', text: 'juan@email.com', class: 'correo' },
 *     ],
 *   });
 */

const HANDLER_ATTR = /^on/i;

const STYLES = `
  :host { display: block; }
  .tw-rows { display: flex; flex-direction: column; }
  .tw-row {
    display: flex;
    align-items: center;
    gap: var(--tw-row-gap, 12px);
    padding: var(--tw-row-padding, 12px 16px);
    color: var(--tw-row-color, inherit);
    font: var(--tw-row-font, inherit);
  }
  .tw-row + .tw-row { border-top: 1px solid var(--tw-row-border, rgba(0, 0, 0, .07)); }
  .tw-row--muted { opacity: .6; }
  .tw-empty { color: var(--tw-muted, #6b7280); font-style: italic; }
`;

export class TabContent {
  #panel;
  #rows;
  #items = [];

  /**
   * @param {HTMLElement} panel Panel ya existente. Se le adjunta su propio
   *   shadow root, de modo que los estilos de las filas no dependan del
   *   documento ni del shadow root del componente exterior.
   */
  constructor(panel) {
    if (!panel || panel.nodeType !== 1) {
      throw new TypeError('TabContent: se esperaba un elemento para el panel.');
    }

    this.#panel = panel;

    const shadow = panel.shadowRoot ?? panel.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLES;

    this.#rows = document.createElement('div');
    this.#rows.className = 'tw-rows';
    this.#rows.setAttribute('part', 'rows');

    shadow.append(style, this.#rows);
    this.#renderEmpty();
  }

  /** Numero de filas vivo. */
  get length() {
    return this.#items.length;
  }

  /**
   * Agrega una fila al final del panel.
   * @param {{elements?: object[], style?: object, class?: string}} config
   * @returns {this}
   */
  addRow({ elements = [], style, class: className } = {}) {
    const row = document.createElement('div');
    row.className = className ? `tw-row ${className}` : 'tw-row';

    if (style) Object.assign(row.style, style);

    for (const spec of elements) {
      if (spec && typeof spec === 'object') row.append(this.#build(spec));
    }

    this.#rows.append(row);
    this.#items.push(row);
    this.#renderEmpty();

    return this;
  }

  /**
   * Elimina una fila por indice.
   * @param {number} index
   * @returns {this}
   */
  deleteRow(index) {
    const row = this.#items[index];
    if (!row) return this;

    row.remove();
    this.#items.splice(index, 1);
    this.#renderEmpty();

    return this;
  }

  /**
   * Vacia el panel. Usa remove() y no innerHTML para que los listeners
   * registrados sobre las filas se liberen como corresponde.
   * @returns {this}
   */
  clearRow() {
    for (const row of this.#items.splice(0)) row.remove();
    this.#renderEmpty();

    return this;
  }

  /** @returns {this} */
  destroy() {
    return this.clearRow();
  }

  #renderEmpty() {
    const existing = this.#rows.querySelector('.tw-empty');
    if (existing) existing.remove();
    if (this.#items.length) return;

    const empty = document.createElement('p');
    empty.className = 'tw-empty';
    empty.textContent = 'Sin contenido.';
    this.#rows.append(empty);
  }

  /**
   * Construye un nodo desde su configuracion. Sin innerHTML: el texto va
   * por textContent y el anidamiento por `children`.
   * @param {object} spec
   * @returns {Node}
   */
  #build(spec) {
    const el = document.createElement(spec.type ?? 'div');

    if (spec.text != null) el.textContent = String(spec.text);
    if (spec.class) el.className = spec.class;
    if (spec.style) Object.assign(el.style, spec.style);

    if (spec.attrs) {
      for (const [name, value] of Object.entries(spec.attrs)) {
        if (HANDLER_ATTR.test(name)) {
          throw new TypeError(
            `TabContent: "${name}" es un handler y no puede ir en attrs. Usá la propiedad "on".`
          );
        }
        el.setAttribute(name, value);
      }
    }

    if (spec.on) {
      for (const [event, handler] of Object.entries(spec.on)) {
        if (typeof handler === 'function') el.addEventListener(event, handler);
      }
    }

    for (const child of spec.children ?? []) {
      if (child && typeof child === 'object') el.append(this.#build(child));
    }

    return el;
  }
}