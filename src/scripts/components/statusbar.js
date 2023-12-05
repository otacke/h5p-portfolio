import Util from '@services/util.js';
import './statusbar.scss';

/**
 * @class
 * @param {object} params Parameters.
 * @param {object} callbacks Callbacks.
 */
export default class StatusBar {
  constructor(params, callbacks = {}) {
    this.params = params;
    this.callbacks = Util.extend({
      onMoved: (() => {}),
      onScrollToTop: (() => {}),
      onToggleMenu: (() => {}),
      onToggleFullscreen: (() => {})
    }, callbacks);

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.wrapper = document.createElement('nav');
    this.wrapper.classList.add(this.params.styleClassName);
    this.wrapper.setAttribute('tabindex', '-1');
    if (this.params.a11yLabel) {
      this.wrapper.setAttribute('aria-label', this.params.a11yLabel);
    }

    // Progressbar
    this.progressBar = this.buildProgressBar();
    this.wrapper.appendChild(this.progressBar.wrapper);

    const wrapperInfo = document.createElement('div');
    wrapperInfo.classList.add('h5p-portfolio-status');

    // Fullscreen button
    if (this.params.displayFullScreenButton && H5P.fullscreenSupported) {
      this.fullScreenButton = this.buildFullScreenButton();
      wrapperInfo.appendChild(this.fullScreenButton);
    }

    // Navigation buttons
    this.navigationButtons = this.buildNavigationButtons();
    wrapperInfo.appendChild(this.navigationButtons['next']);
    wrapperInfo.appendChild(this.navigationButtons['previous']);

    // Menu toggle button
    if (this.params.displayMenuToggleButton) {
      this.menuToggleButton = this.buildMenuToggleButton();
      wrapperInfo.appendChild(this.menuToggleButton);
    }

    // To top button
    if (this.params.displayToTopButton) {
      this.toTopButton = this.buildToTopButton();
      wrapperInfo.appendChild(this.toTopButton);
    }

    // Chapter title
    this.chapterTitle = this.buildChapterTitle();
    wrapperInfo.appendChild(this.chapterTitle.wrapper);

    // Progress indicator
    this.progressIndicator = this.buildProgressIndicator();
    wrapperInfo.appendChild(this.progressIndicator.wrapper);

    this.wrapper.appendChild(wrapperInfo);
  }

  /**
   * Add progress bar.
   * @returns {object} Progress bar elements.
   */
  buildProgressBar() {
    const progress = document.createElement('div');
    progress.classList.add('h5p-portfolio-status-progressbar-front');
    progress.setAttribute('tabindex', '-1');

    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-portfolio-status-progressbar-back');
    wrapper.appendChild(progress);

    return { wrapper: wrapper, progress: progress };
  }

  /**
   * Build menu toggle button.
   * @returns {HTMLElement} Menu toggle button.
   */
  buildMenuToggleButton() {
    const buttonWrapper = document.createElement('button');
    buttonWrapper.classList.add('h5p-portfolio-status-menu');
    buttonWrapper.classList.add('h5p-portfolio-status-button');
    buttonWrapper.setAttribute('aria-expanded', 'false');
    buttonWrapper.setAttribute('aria-controls', 'h5p-portfolio-navigation-menu');
    buttonWrapper.setAttribute(
      'aria-label',
      this.params.dictionary.get('a11y.openMainNavigation')
    );
    buttonWrapper.onclick = () => {
      this.callbacks.onToggleMenu();
    };

    const button = document.createElement('a');
    button.classList.add('icon-menu');
    buttonWrapper.appendChild(button);

    return buttonWrapper;
  }

  /**
   * Create button to scroll to top with.
   * @returns {HTMLElement} Button.
   */
  buildToTopButton() {
    const icon = document.createElement('div');
    icon.classList.add('icon-up');
    icon.classList.add('navigation-button');

    const button = document.createElement('button');
    button.classList.add('h5p-portfolio-status-to-top');
    button.classList.add('h5p-portfolio-status-button');
    button.classList.add('h5p-portfolio-status-arrow');
    button.setAttribute(
      'title', this.params.dictionary.get('l10n.navigateToTop')
    );
    button.setAttribute(
      'aria-label', this.params.dictionary.get('l10n.navigateToTop')
    );
    button.addEventListener('click', () => {
      this.callbacks.onScrollToTop();
    });

    button.appendChild(icon);

    return button;
  }

  /**
   * Create chapter title.
   * @returns {object} Chapter title elements.
   */
  buildChapterTitle() {
    const text = document.createElement('h1');
    text.classList.add('title');

    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-portfolio-status-chapter');
    wrapper.appendChild(text);

    return { wrapper: wrapper, text: text };
  }

  /**
   * Add a status-button which shows current and total chapters.
   * @returns {object} Progress elements.
   */
  buildProgressIndicator() {
    const current = document.createElement('span');
    current.classList.add('h5p-portfolio-status-progress-number');
    current.setAttribute('aria-hidden', 'true');

    const divider = document.createElement('span');
    divider.classList.add('h5p-portfolio-status-progress-divider');
    divider.innerHTML = ' / ';
    divider.setAttribute('aria-hidden', 'true');

    const total = document.createElement('span');
    total.classList.add('h5p-portfolio-status-progress-number');
    total.innerHTML = this.params.chapters.get().length;
    total.setAttribute('aria-hidden', 'true');

    const hiddenButRead = document.createElement('p');
    hiddenButRead.classList.add('hidden-but-read');

    const progressText = document.createElement('p');
    progressText.classList.add('h5p-portfolio-status-progress');
    progressText.appendChild(current);
    progressText.appendChild(divider);
    progressText.appendChild(total);
    progressText.appendChild(hiddenButRead);

    const wrapper = document.createElement('div');
    wrapper.appendChild(progressText);

    return {
      wrapper: wrapper,
      current: current,
      total: total,
      divider: divider,
      progressText: progressText,
      hiddenButRead: hiddenButRead
    };
  }

  /**
   * Create navigation buttons.
   * @returns {object} Navigation buttons.
   */
  buildNavigationButtons() {
    const buttons = {};

    buttons['previous'] = this.buildNavigationButton({
      icon: 'icon-previous',
      class: 'previous',
      label: this.params.dictionary.get('l10n.previousPage'),
      onClicked: (() => {
        this.callbacks.onMoved({
          h5pPortfolioDirection: 'prev',
          h5pPortfolioToTop: true
        });
      })
    });

    buttons['next'] = this.buildNavigationButton({
      icon: 'icon-next',
      class: 'next',
      label: this.params.dictionary.get('l10n.nextPage'),
      onClicked: (() => {
        this.callbacks.onMoved({
          h5pPortfolioDirection: 'next',
          h5pPortfolioToTop: true
        });
      })
    });

    return buttons;
  }

  /**
   * Create navigation button.
   * @param {object} params Parameters.
   * @param {function} params.onClicked Click handler.
   * @param {string} params.icon CSS class name for icon.
   * @param {string} params.label Label.
   * @returns {HTMLElement} Navigation button.
   */
  buildNavigationButton(params) {
    const button = document.createElement('button');
    button.classList.add('h5p-portfolio-status-arrow');
    button.classList.add('h5p-portfolio-status-button');
    if (params.class) {
      button.classList.add(params.class);
    }

    button.setAttribute('aria-label', params.label);
    button.addEventListener('click', () => {
      params.onClicked();
    });

    const icon = document.createElement('div');
    icon.classList.add('navigation-button');
    icon.classList.add(params.icon);
    icon.setAttribute('title', params.label);
    button.appendChild(icon);

    return button;
  }

  /**
   * Build fullscreen button.
   * @returns {HTMLElement} Fullscreen button.
   */
  buildFullScreenButton() {
    const fullScreenButton = document.createElement('button');
    fullScreenButton.classList.add('h5p-portfolio-status-fullscreen');
    fullScreenButton.classList.add('h5p-portfolio-status-button');
    fullScreenButton.classList.add('h5p-portfolio-enter-fullscreen');
    fullScreenButton.setAttribute(
      'title', this.params.dictionary.get('l10n.fullscreen')
    );
    fullScreenButton.setAttribute(
      'aria-label', this.params.dictionary.get('l10n.fullscreen')
    );
    fullScreenButton.addEventListener('click', () => {
      this.callbacks.onToggleFullscreen();
    });

    return fullScreenButton;
  }

  /**
   * Show.
   */
  show() {
    this.wrapper.classList.remove('h5p-content-hidden');
  }

  /**
   * Hide.
   */
  hide() {
    this.wrapper.classList.add('h5p-content-hidden');
  }

  /**
   * Update status bar.
   * @param {object} params Parameters.
   * @param {number} params.chapterId Chapter index + 1.
   * @param {string} params.title Chapter title.
   */
  update(params = {}) {
    this.updateProgressBar(params.chapterId);

    this.chapterTitle.text.innerHTML = params.title;
    this.chapterTitle.text.setAttribute('title', params.title);

    this.progressIndicator.current.innerHTML = params.chapterId;

    // Enable/disable navigation buttons depending on chapter
    this.setButtonStatus(
      'previous',
      { enabled: params.chapterId > 1 }
    );
    this.setButtonStatus(
      'next',
      { enabled: params.chapterId < this.params.chapters.get().length }
    );
  }

  /**
   * Update progress bar.
   * @param {number} chapterId Chapter index.
   */
  updateProgressBar(chapterId) {
    this.progressBar.progress.style.width =
      `${chapterId / this.params.chapters.get().length * 100}%`;

    const title = this.params.dictionary.get('a11y.progress')
      .replace('@page', chapterId)
      .replace('@total', this.params.chapters.get().length);

    this.progressBar.progress.title = title;
    this.progressIndicator.hiddenButRead.innerHTML = title;
  }

  /**
   * Focus progress on progress bar.
   */
  focusProgressBar() {
    this.progressBar.progress.focus();
  }

  /**
   * Set focus to menu toggle button.
   */
  setFocusToMenuToggleButton() {
    if (this.menuToggleButton) {
      this.menuToggleButton.focus();
    }
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   */
  enableButton(id) {
    if (!this.navigationButtons[id]) {
      return;
    }

    this.navigationButtons[id].removeAttribute('disabled');
    this.navigationButtons[id].classList.remove('disabled');
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id) {
    if (!this.navigationButtons[id]) {
      return;
    }

    this.navigationButtons[id].setAttribute('disabled', 'disabled');
    this.navigationButtons[id].classList.add('disabled');
  }

  /**
   * Set button state.
   * @param {string} id Button id.
   * @param {object} status Status.
   */
  setButtonStatus(id, status = {}) {
    if (status.enabled) {
      this.enableButton(id);
    }
    else {
      this.disableButton(id);
    }
  }

  /**
   * Set fullscreen state.
   * @param {boolean} state If true, enter fullscreen, else exit fullscreen.
   */
  setFullScreen(state) {
    if (typeof state !== 'boolean') {
      return;
    }

    if (!this.fullScreenButton) {
      return;
    }

    this.fullScreenButton.classList.toggle(
      'h5p-portfolio-enter-fullscreen', !state
    );
    this.fullScreenButton.classList.toggle(
      'h5p-portfolio-exit-fullscreen', state
    );

    if (state) {
      this.fullScreenButton.setAttribute(
        'title', this.params.dictionary.get('l10n.exitFullscreen')
      );
      this.fullScreenButton.setAttribute(
        'aria-label', this.params.dictionary.get('l10n.exitFullscreen')
      );
    }
    else {
      this.fullScreenButton.setAttribute(
        'title', this.params.dictionary.get('l10n.fullscreen')
      );
      this.fullScreenButton.setAttribute(
        'aria-label', this.params.dictionary.get('l10n.fullscreen')
      );
    }
  }

  /**
   * Scroll bar into View.
   */
  scrollIntoView() {
    this.wrapper.scrollIntoView(true);
  }

  /**
   * Toggle menu.
   * @param {boolean} [state] True for open, false for closed or toggle.
   * @returns {boolean} Resulting state.
   */
  toggleMenu(state) {
    if (!this.menuToggleButton) {
      return false;
    }

    if (typeof state !== 'boolean') {
      state = !this.isMenuOpen();
    }

    this.menuToggleButton.classList.toggle('h5p-portfolio-status-menu-active', state);
    this.menuToggleButton.setAttribute('aria-expanded', state);

    const ariaLabel = (state) ?
      this.params.dictionary.get('a11y.closeMainNavigation') :
      this.params.dictionary.get('a11y.openMainNavigation');
    this.menuToggleButton.setAttribute('aria-label', ariaLabel);

    return state;
  }

  /**
   * Check if menu is active/open.
   * @returns {boolean} True, if open, else false.
   */
  isMenuOpen() {
    if (!this.menuToggleButton) {
      return false;
    }

    return this.menuToggleButton.classList.contains('h5p-portfolio-status-menu-active');
  }

  /**
   * Get height.
   * @returns {number} Height.
   */
  getHeight() {
    return this.wrapper.getBoundingClientRect().height;
  }
}
