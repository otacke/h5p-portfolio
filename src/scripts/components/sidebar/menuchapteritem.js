import Util from '@services/util';

export default class MenuChapterItem {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClicked: (() => {}),
      onKeyUp: (() => {}),
      onKeyDown: (() => {})
    }, callbacks);

    this.isExpandable = this.params.isExpandable;
    this.isExpandedValue = false;

    this.isHiddenValue = true;

    const hierarchyLevel = this.params.hierarchy.split('-').length;
    this.isContentLink = this.params.hierarchy.indexOf(':') !== -1;

    this.menuItem = document.createElement('li');
    this.menuItem.classList.add('h5p-portfolio-navigation-chapter');
    this.menuItem.classList.add('h5p-portfolio-navigation-closed');
    if (this.params.className) {
      this.menuItem.classList.add(this.params.className);
    }

    this.button = document.createElement('button');
    this.button.classList.add('h5p-portfolio-navigation-chapter-button');
    this.button.classList.add(`level-${hierarchyLevel}`);
    if (this.isContentLink) {
      this.button.classList.add('h5p-portfolio-navigation-chapter-content');
    }

    this.button.addEventListener('click', () => {
      this.callbacks.onClicked({
        hierarchy: this.params.hierarchy,
        target: this.params.target
      });
    });

    this.button.addEventListener('keydown', (event) => {
      if (event.code === 'ArrowUp') {
        event.preventDefault();
        this.callbacks.onKeyUp({ hierarchy: this.params.hierarchy });
      }
      else if (event.code === 'ArrowDown') {
        event.preventDefault();
        this.callbacks.onKeyDown({ hierarchy: this.params.hierarchy });
      }
    });

    this.expandIcon = document.createElement('div');
    this.expandIcon.classList.add('h5p-portfolio-navigation-chapter-accordion');
    this.expandIcon.classList.add(`level-${hierarchyLevel}`);

    this.button.appendChild(this.expandIcon);

    const label = document.createElement('div');
    label.classList.add('h5p-portfolio-navigation-chapter-title-text');
    label.title = params.title;
    label.innerHTML = params.title;

    this.button.appendChild(label);

    if (this.isExpandable) {
      this.collapse();
    }

    this.hide();

    this.menuItem.appendChild(this.button);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.menuItem;
  }

  /**
   * Add CSS class.
   * @param {string} className Class name.
   */
  addClass(className) {
    this.menuItem.classList.add(className);
  }

  /**
   * Remove CSS class.
   * @param {string} className Class name.
   */
  removeClass(className) {
    this.menuItem.classList.remove(className);
  }

  /**
   * Determine whether item is expanded.
   * @returns {boolean} True, if expanded, else false.
   */
  isExpanded() {
    return this.isExpandedValue;
  }

  /**
   * Determine whether item is hidden.
   * @returns {boolean} True, if hidden, else false.
   */
  isHidden() {
    return this.isHiddenValue;
  }

  /**
   * Collapse menu item.
   */
  collapse() {
    this.menuItem.classList.add('h5p-portfolio-navigation-closed');
    this.isExpandedValue = false;

    if (!this.isExpandable) {
      return;
    }

    this.expandIcon.classList.remove('icon-expanded');
    this.expandIcon.classList.add('icon-collapsed');

    this.button.setAttribute('aria-expanded', 'false');
  }

  /**
   * Expand menu item.
   */
  expand() {
    this.menuItem.classList.remove('h5p-portfolio-navigation-closed');
    this.isExpandedValue = true;

    if (!this.isExpandable) {
      return;
    }
    this.expandIcon.classList.remove('icon-collapsed');
    this.expandIcon.classList.add('icon-expanded');

    this.button.setAttribute('aria-expanded', 'true');
  }

  /**
   * Make item tabbable.
   */
  makeTabbable() {
    this.button.setAttribute('tabindex', '0');
  }

  /**
   * Make item untabbable.
   */
  makeUntabbable() {
    this.button.setAttribute('tabindex', '-1');
  }

  /**
   * Give focus to item.
   */
  focus() {
    this.button.focus();
  }

  /**
   * Activate item.
   */
  activate() {
    this.button.classList.add('h5p-portfolio-navigation-current');
  }

  /**
   * Deactivate item.
   */
  deactivate() {
    this.button.classList.remove('h5p-portfolio-navigation-current');
    this.makeUntabbable();
  }

  /**
   * Hide item.
   */
  hide() {
    this.menuItem.classList.add('display-none');
    this.isHiddenValue = true;
  }

  /**
   * Show item.
   */
  show() {
    this.menuItem.classList.remove('display-none');
    this.isHiddenValue = false;
  }
}
