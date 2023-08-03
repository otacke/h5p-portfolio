import Util from '@services/util';
import '@styles/_cover.scss';

/**
 * @class
 * @param {object} params Parameters.
 * @param {object} callbacks Callbacks.
 */
export default class Cover {
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onClosed: (() => {})
    }, callbacks);

    // Container
    this.container = this.buildContainer();

    this.headerDOM = document.createElement('div');
    this.headerDOM.style.display = 'none';
    this.container.append(this.headerDOM);

    // Visual header
    if (params.coverData?.coverMedium?.params?.file) {
      this.visuals = this.buildVisualsElement(params.coverData.coverMedium);
      if (this.visuals) {
        this.container.appendChild(this.visuals);
      }
    }
    else {
      this.container.classList.add('h5p-cover-nographics');
    }

    // Title
    this.container.append(this.buildTitle(params.title));

    // Description text
    if (params.coverData?.coverDescription) {
      this.container.append(
        this.buildDescription(params.coverData.coverDescription)
      );
    }

    // Read button
    this.container.append(
      this.buildReadButton(this.params.dictionary.get('l10n.read'))
    );

    this.footerDOM = document.createElement('div');
    this.footerDOM.style.display = 'none';
    this.container.append(this.footerDOM);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Cover DOM.
   */
  getDOM() {
    return this.container;
  }

  /**
   * Create the top level element.
   * @returns {HTMLElement} Cover.
   */
  buildContainer() {
    const container = document.createElement('div');
    container.classList.add('h5p-portfolio-cover');
    return container;
  }

  /**
   * Create an element which contains both the cover image and a background bar.
   * @param {object} [params] Parameters.
   * @returns {HTMLElement} Visual stuff for cover.
   */
  buildVisualsElement(params = {}) {
    if (!params.params) {
      return null;
    }

    const visuals = document.createElement('div');
    visuals.classList.add('h5p-portfolio-cover-graphics');

    return visuals;
  }

  /**
   * Initialize Media.
   * The YouTube handler requires the video wrapper to be attached to the DOM
   * already.
   */
  initMedia() {
    if (this.params.coverData.showHeader && this.params.headerDOM) {
      this.container.replaceChild(this.params.headerDOM, this.headerDOM);
      this.headerDOM = this.params.headerDOM;
    }

    if (this.params.coverData.showFooter && this.params.footerDOM) {
      this.container.replaceChild(this.params.footerDOM, this.footerDOM);
      this.footerDOM = this.params.footerDOM;
    }

    if (
      !this.visuals ||
      !this.params.coverData?.coverMedium?.params?.file
    ) {
      return;
    }

    const coverMedium = this.params.coverData.coverMedium;

    // Preparation
    if ((coverMedium.library || '').split(' ')[0] === 'H5P.Video') {
      coverMedium.params.visuals.fit = false;
    }

    H5P.newRunnable(
      coverMedium,
      this.params.contentId,
      H5P.jQuery(this.visuals),
      false,
      { metadata: coverMedium.medatata }
    );

    // Postparation
    if ((coverMedium.library || '').split(' ')[0] === 'H5P.Image') {
      const image = this.visuals.querySelector('img') ||
        this.visuals.querySelector('.h5p-placeholder');
      image.style.height = 'auto';
      image.style.width = 'auto';
    }

    this.visuals.appendChild(this.buildCoverBar());
  }

  /**
   * Build element responsible for the bar behind medium.
   * @returns {HTMLElement} Horizontal bar in the background.
   */
  buildCoverBar() {
    const coverBar = document.createElement('div');
    coverBar.classList.add('h5p-portfolio-cover-bar');
    return coverBar;
  }

  /**
   * Build title.
   * @param {string} titleText Text for title element.
   * @returns {HTMLElement} Title element.
   */
  buildTitle(titleText) {
    const title = document.createElement('p');
    title.innerHTML = titleText;

    const titleWrapper = document.createElement('div');
    titleWrapper.classList.add('h5p-portfolio-cover-title');
    titleWrapper.appendChild(title);

    return titleWrapper;
  }

  /**
   * Build description.
   * @param {string} descriptionText Text for description element.
   * @returns {HTMLElement} Description element.
   */
  buildDescription(descriptionText) {
    if (!descriptionText) {
      return null;
    }

    const descriptionElement = document.createElement('div');
    descriptionElement.classList.add('h5p-portfolio-cover-description');
    descriptionElement.innerHTML = descriptionText;

    return descriptionElement;
  }

  /**
   * Build read button.
   * @param {string} buttonText Button text.
   * @returns {HTMLElement} Read button element.
   */
  buildReadButton(buttonText) {
    const button = document.createElement('button');
    button.innerHTML = buttonText;
    button.addEventListener('click', () => {
      this.remove();
    });

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('h5p-portfolio-cover-readbutton');
    buttonWrapper.appendChild(button);

    return buttonWrapper;
  }

  /**
   * Determine whether cover is hidden.
   * @returns {boolean} True, if cover is hidden.
   */
  isHidden() {
    return this.hidden || false;
  }

  /**
   * Remove cover.
   */
  remove() {
    this.hidden = true;
    this.callbacks.onClosed();
  }
}
