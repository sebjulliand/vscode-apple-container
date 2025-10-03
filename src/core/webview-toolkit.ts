import Crypto from "crypto";

export interface Attributes {
  id?: string
  class?: string
}

function renderAttributes(attributes?: Object) {
  return Object.entries(attributes || {})
    .filter(([key, value]) => value !== undefined)
    .map(([key, value]) => {
      switch (typeof value) {
        case "boolean": return value ? key : "";
        default: return `${key}="${value}"`;
      }
    })
    .join(" ");
}

function renderDataIndex(index: number) {
  return `data-index="${index}"`;
}

function renderDataClickable(action?: string) {
  return action ? `data-clickable="${action}"` : '';
}

function renderChangeListener(formId: string, onEvent: "input" | "change", doListen?: boolean) {
  return doListen ? `changeListener data-onevent="${onEvent}" data-relatedform="${formId}"` : doListen;
}

export namespace Split {
  export function render(left: string, right: string, attributes?: Attributes) {
    return /*html*/ `
    <div class="split left" ${renderAttributes(attributes)}>${left}</div>
    <div class="split right" ${renderAttributes(attributes)}>${right}</div>
    `;
  }
}

export namespace Tabs {
  export interface Tab {
    attributes?: Attributes
    count?: number
    title: string
    content: string
    selected?: boolean
  }

  export function render(...tabs: Tab[]): string {
    const selected = tabs.findIndex(tab => tab.selected);
    return /*html*/ `<vscode-tabs selected-index="${(selected && selected > 0 ? selected : 0)}">
      ${tabs.map(renderTab).join("\n")}
    </vscode-tabs>`;
  }

  function renderTab(tab: Tab) {
    return /*html*/ `<vscode-tab-header slot="header"${renderAttributes(tab.attributes)}>
      ${tab.title}
      ${tab.count !== undefined ? /*html*/ `<vscode-badge variant="counter" slot="content-after">${tab.count}</vscode-badge>` : ''}
    </vscode-tab-header>
    <vscode-tab-panel>${tab.content}</vscode-tab-panel>`;
  }
}

export namespace Table {
  export interface Layout<T> {
    attributes?: Attributes
    headerAttributes?: Attributes
    columns: Column<T>[]
    rowAttributes?: (rowContent: T) => Attributes
    rowAction?: string
  }

  export interface Column<T> {
    size?: string
    title: string
    attributes?: Attributes
    content: (rowContent: T) => string
    contentAttributes?: (rowContent: T) => Attributes
  }

  export function render<T>(table: Layout<T>, rows: T[]): string {
    return /*html*/ `<vscode-table ${renderAttributes(table.attributes)} ${renderColumnsAttribute(table)} zebra bordered-columns resizable>
      ${renderHeader(table)}
      <vscode-table-body slot="body">
        ${rows.map((row, index) => renderRow(table, row, index)).join("\n")}
      </vscode-table-body>
    </vscode-table>`;
  }

  function renderColumnsAttribute<T>(table: Layout<T>) {
    return `columns='[${table.columns.map(column => `"${column.size ? column.size : "auto"}"`).join(", ")}]'`;
  }

  function renderHeader<T>(table: Layout<T>) {
    return /*html*/ `<vscode-table-header ${renderAttributes(table.headerAttributes)} slot="header">
      ${table.columns.map(renderHeaderCells).join("\n")}
    </vscode-table-header>`;
  }

  function renderHeaderCells<T>(column: Column<T>) {
    return /*html*/ `<vscode-table-header-cell ${renderAttributes(column.attributes)}>${column.title}</vscode-table-header-cell>`;
  }

  function renderRow<T>(table: Layout<T>, row: T, index: number) {
    return /*html*/ `<vscode-table-row ${renderDataClickable(table.rowAction)} ${renderDataIndex(index)} ${renderAttributes(table.rowAttributes?.(row))}>
      ${table.columns.map(column => renderCell(column, row, table.rowAttributes?.(row))).join("\n")}
    </vscode-table-row>`;
  }

  function renderCell<T>(column: Column<T>, row: T, rowAttributes?: Attributes) {
    return /*html*/ `<vscode-table-cell ${renderAttributes(column.contentAttributes?.(row))}${renderAttributes(rowAttributes)}>${column.content(row) || ""}</vscode-table-cell>`;
  }
}

export namespace Collapsible {
  export function render(title: string, content: string, options?: { opened?: boolean, count?: number }) {
    return /*html*/ `<vscode-collapsible title="${title}"${options?.opened ? " open" : ""}>
      ${options?.count !== undefined ? /*html*/ `<vscode-badge variant="counter" slot="decorations">${options.count}</vscode-badge>` : ''}
      ${content}
    </vscode-collapsible>`;
  }
}

export namespace Tree {
  export interface ItemIcons {
    branch?: string;
    open?: string;
    leaf?: string;
  }

  interface TreeItemDefinition<T> {
    label: (item: T) => string;
    subItems?: <Y>(item: T) => TreeItemDefinition<Y>[];
    open?: (item: T) => boolean;
    selected?: (item: T) => boolean;
    focused?: (item: T) => boolean;
    icons?: (item: T) => ItemIcons
  }

  export interface SelectedItem {
    label: string;
    subItems?: SelectedItem[];
    open?: boolean;
    selected?: boolean;
    focused?: boolean;
    icons?: ItemIcons;
  }

  export function render<T>(definition: TreeItemDefinition<T>, items: T[], attributes?: Attributes) {
    attributes = computeId(attributes);

    const data = items.map((item, index) => ({
      label: definition.label(item),
      subItems: definition.subItems?.(item),
      open: definition.open?.(item),
      selected: definition.selected?.(item),
      focused: definition.focused?.(item),
      icons: definition.icons?.(item),
      value: String(index)
    }));

    return /*html*/ `<vscode-tree ${renderAttributes(attributes)} tabindex="0"></vscode-tree>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const tree = document.querySelector('#${attributes.id}');
        tree.data = ${JSON.stringify(data)};
        tree.addEventListener('vsc-tree-select', (event) => {
          sendWebviewListAction('tree-selection', Number(event.detail.value));
        });
      });
    </script>`;
  }
}

export namespace Button {
  interface ButtonDefinition {
    label: string
    action: string
    secondary?: boolean
    disabled?: boolean
    icon?: string
    iconAfter?: string
    focused?: boolean
  }

  export function render(button: ButtonDefinition, attributes?: Attributes) {
    attributes = computeId(attributes);
    return /*html*/ `<vscode-button ${renderAttributes(attributes)} ${button.disabled ? "disabled" : ""} ${button.secondary ? "secondary" : ""
      } ${button.icon ? `icon="${button.icon}"` : ""} ${button.iconAfter ? `icon-after="${button.iconAfter}"` : ""}>${button.label}</vscode-button>
    <script>
      document.getElementById('${attributes.id}').addEventListener('click', (e) => {
        sendWebviewAction("${button.action}");
      });
    </script>`;
  }
}

export namespace Form {
  interface FormDefinition {
    id: string
    class?: string
    elements: FormElement[],
    enterPressedAction?: string
    requiresValidInput?: boolean
    listenToChange?: boolean
  }

  export interface FormElement {
    id: string
    label: string
    description?: string
    render(formId: string, changeListener?: boolean): string
    raw?: boolean
  }

  function renderFormGroup(formId: string, element: FormElement, changeListener?: boolean) {
    return /* html */ `<vscode-form-group>
        <vscode-label for="${element.id}">${element.label}</vscode-label>
        ${element.render(formId, changeListener)}
        ${element.description ? /* html */ `<vscode-form-helper><p>${element.description}</p></vscode-form-helper>` : ''}
      </vscode-form-group>`;
  }

  export function collapsible(title: string, elements: FormElement[], options?: { opened?: boolean, showCount?: boolean }): FormElement {
    return {
      id: "", label: "", raw: true,
      render: (formId, changeListener) => Collapsible.render(title, elements.map(element => element.raw ? element.render(formId, changeListener) : renderFormGroup(formId, element, changeListener)).join(""), { opened: options?.opened, count: options?.showCount ? elements.length : undefined })
    };
  }

  /**
   * 
   * @returns nothing; mainly used in a ternary expression to render an empty string
   */
  export function empty(): FormElement {
    return {
      id: "", label: "", raw: true, render: () => ''
    };
  }

  export function link(label: string, href: string): FormElement {
    return {
      id: "", label: "", raw: true, render: () => /* html*/ `<a href="${href}">${label}</a>`
    };
  }

  export function separator(): FormElement {
    return {
      id: "", label: "", raw: true, render: () => /* html*/ `<hr />`
    };
  }

  export function section(level: 1 | 2 | 3 | 4 | 5 | 6, label: string, href?: string): FormElement {
    return {
      id: "", label: "", raw: true, render: () => /* html*/ href ? /* html*/ `<h${level}><a href="${href}">${label}</a></h${level}>` : /* html*/ `<h${level}>${label}</h${level}>`
    };
  }

  export function paragraph(content: string): FormElement {
    return {
      id: "", label: "", raw: true, render: () => /* html*/ `<p>${content}</p>`
    };
  }

  export function input(id: string, label: string, description?: string,
    attributes?: {
      type?: 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'month' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'time' | 'url' | 'week',
      placeholder?: string
      value?: string
      readonly?: boolean
      focused?: boolean
      min?: number
      max?: number
      maxLength?: number
      minLength?: number
      required?: boolean
      pattern?: string
    }): FormElement {

    if (attributes) {
      attributes.value = attributes.value || "";
    }

    return {
      id,
      label,
      description,
      render: (formId, change) => /* html */ `<vscode-textfield enter-input id="${id}" name="${id}" ${renderAttributes(attributes)} ${renderChangeListener(formId, "input", change)}></vscode-textfield>`
    };
  }

  export function textArea(id: string, label: string, description?: string,
    attributes?: {
      rows?: number
      value?: string
      readonly?: boolean
      focused?: boolean
      required?: boolean
      maxLength?: number
      minLength?: number
      raw?: boolean
    }): FormElement {

    if (attributes) {
      attributes.value = attributes.value || "";
    }

    return {
      id,
      label,
      description,
      raw: attributes?.raw,
      render: (formId, change?) => /* html */ `<vscode-textarea id="${id}" name="${id}" ${renderAttributes(attributes)} ${renderChangeListener(formId, "input", change)}></vscode-textarea>`
    };
  }

  export function checkbox(id: string, label: string, description?: string, attributes?: { checked?: boolean, disabled?: boolean }): FormElement {
    return {
      id,
      label,
      description,
      render: (formId, change?) => /* html */ `<vscode-checkbox id="${id}" name="${id}" value="${id}" ${renderAttributes(attributes)} ${renderChangeListener(formId, "change", change)}></vscode-checkbox>`
    };
  }

  export function radio(id: string, label: string, values: { label: string, value: string, checked?: boolean }[], description?: string, attributes?: { variant: 'horizontal' | 'vertical' }): FormElement {
    return {
      id,
      label,
      description,
      render: (formId, change?) => /* html */ `<vscode-radio-group ${renderAttributes(attributes)}>
        ${values.map(val => /* html */ `<vscode-radio id="${id}" name="${id}" value="${val.value}" ${val.checked ? "checked" : ""} ${renderChangeListener(formId, "change", change)}>${val.label}</vscode-radio>`).join("")}
      </vscode-radio-group>`
    };
  }

  export function select(id: string, label: string,
    items: {
      label?: string
      value: string
      description?: string
      disabled?: boolean
    }[],
    value?: string,
    description?: string,
    attributes?: {
      combobox?: boolean
      required?: boolean
      disabled?: boolean
    }): FormElement {
    return {
      id,
      label,
      description,
      render: (formId, change?) => /* html */ `<vscode-single-select id="${id}" name="${id}"${renderAttributes(attributes)} ${renderChangeListener(formId, "change", change)}>
        ${items.map(i => /* html */ `<vscode-option value="${i.value}" ${value !== undefined && i.value === value ? "selected" : ""} ${i.description ? `description="${i.description}"` : ""}>${i.label || i.value}</vscode-option>`).join("")}
      </vscode-single-select>`
    };
  }

  export function button(id: string, label: string, options?: { secondary?: boolean }, requiresValidInput?: boolean): FormElement {
    return {
      id: "",
      label: "",
      render: (formId) => /* html*/ `<vscode-button id="${id}" ${renderAttributes(options)}>${label}</vscode-button>
      <script>
        document.getElementById('${id}').addEventListener('click', () => {
          const form = document.querySelector('#${formId}');
          ${requiresValidInput ? `if(!document.querySelector(":invalid"))` : ''}
          sendWebviewFormAction("${id}", form);
        });
      </script>`
    };
  }

  export function render(form: FormDefinition) {
    return /* html */ `<vscode-form-container id="${form.id}" responsive="true" breakpoint="500" ${form.class ? `class="${form.class}"` : ``}>
      ${form.elements.map(element => element.raw ? element.render(form.id, form.listenToChange) : renderFormGroup(form.id, element, form.listenToChange)).join("")}
    </vscode-form-container>
      ${form.enterPressedAction ? /* html */ `<script>
        document.querySelectorAll("[enter-input]")?.forEach(input => {
          input.addEventListener('keyup', (event) => {
            event.preventDefault();
            if (event.keyCode === 13${form.requiresValidInput ? ' && !document.querySelector(":invalid")' : ''}) {
              const form = document.querySelector('#${form.id}');
              sendWebviewFormAction("${form.enterPressedAction}", form.data);
            }
          });
        });
    </script>` : ''}`;
  }
}

function computeId(attributes?: Attributes) {
  if (!attributes || !attributes?.id) {
    attributes = {
      ...{
        id: `vscodeelementid${Crypto.randomBytes(16).toString("hex")}`
      }, ...attributes
    };
  }

  return attributes;
}