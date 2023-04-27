export default class Title {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {string} params.titleText Title text.
   */
  constructor(params = {}) {
    this.params = params;

    this.params.titleText = this.params.titleText ?? '';

    this.content = document.createElement('div');
    this.content.classList.add('h5p-portfolio-navigation-maintitle');

    const title = document.createElement('h2');
    title.classList.add('navigation-title');
    title.innerHTML = params.titleText;
    title.setAttribute('title', params.titleText);

    this.content.appendChild(title);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.content;
  }
}
