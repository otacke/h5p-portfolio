import Util from './../util';
import Dictionary from './../dictionary';

/**
 * @constructor
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

    // Visual header
    if (params.coverData?.coverMedium) {
      this.visuals = this.buildVisualsElement(params.coverData.coverMedium);
      if (this.visuals) {
        this.container.appendChild(this.visuals);
      }
    }
    else {
      this.container.classList.add('h5p-cover-nographics');
    }

    // Title
    this.container.appendChild(this.BuildTitle(params.title));

    // Description text
    if (params.coverData?.coverDescription) {
      this.container.appendChild(this.buildDescription(params.coverData.coverDescription));
    }

    // Read button
    this.container.appendChild(this.buildReadButton(Dictionary.get('l10n.read')));
  }

  /**
   * Create the top level element.
   * @return {HTMLElement} Cover.
   */
  buildContainer() {
    const container = document.createElement('div');
    container.classList.add('h5p-interactive-book-cover');
    return container;
  }

  /**
   * Create an element which contains both the cover image and a background bar.
   * @param {HTMLElement} coverImage Image object.
   */
  buildVisualsElement(params = {}) {
    if (!params.params) {
      return null;
    }

    const visuals = document.createElement('div');
    visuals.classList.add('h5p-interactive-book-cover-graphics');

    return visuals;
  }

  /**
   * Initialize Media.
   * The YouTube handler requires the video wrapper to be attached to the DOM
   * already.
   */
  initMedia() {
    if (!this.visuals || !this.params.coverData?.coverMedium) {
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
   * @return {HTMLElement} Horizontal bar in the background.
   */
  buildCoverBar() {
    const coverBar = document.createElement('div');
    coverBar.classList.add('h5p-interactive-book-cover-bar');
    return coverBar;
  }

  /**
   * Build title.
   * @param {string} titleText Text for title element.
   * @return {HTMLElement} Title element.
   */
  BuildTitle(titleText) {
    const title = document.createElement('p');
    title.innerHTML = titleText;

    const titleWrapper = document.createElement('div');
    titleWrapper.classList.add('h5p-interactive-book-cover-title');
    titleWrapper.appendChild(title);

    return titleWrapper;
  }

  /**
   * Build description.
   * @param {string} descriptionText Text for description element.
   * @return {HTMLElement} Description element.
   */
  buildDescription(descriptionText) {
    if (!descriptionText) {
      return null;
    }

    const descriptionElement = document.createElement('div');
    descriptionElement.classList.add('h5p-interactive-book-cover-description');
    descriptionElement.innerHTML = descriptionText;

    return descriptionElement;
  }

  /**
   * Build read button.
   * @param {string} buttonText Button text.
   * @return {HTMLElement} Read button element.
   */
  buildReadButton(buttonText) {
    const button = document.createElement('button');
    button.innerHTML = buttonText;
    button.addEventListener('click', () => {
      this.remove();
    });

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('h5p-interactive-book-cover-readbutton');
    buttonWrapper.appendChild(button);

    return buttonWrapper;
  }

  /**
   * Determine whether cover is hidden.
   * @return {boolean} True, if cover is hidden.
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
