import Util from './../util';
import Dictionary from './../dictionary';

/**
 * @constructor
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
    this.wrapper = document.createElement('div');
    this.wrapper.classList.add(this.params.styleClassName);
    this.wrapper.setAttribute('tabindex', '-1');

    // Progressbar
    this.progressBar = this.buildProgressBar();
    this.wrapper.appendChild(this.progressBar.wrapper);

    const wrapperInfo = document.createElement('div');
    wrapperInfo.classList.add('h5p-interactive-book-status');

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

    // Navigation buttons
    this.navigationButtons = this.buildNavigationButtons();
    wrapperInfo.appendChild(this.navigationButtons['previous']);
    wrapperInfo.appendChild(this.navigationButtons['next']);

    // Fullscreen button
    if (this.params.displayFullScreenButton && H5P.fullscreenSupported) {
      this.fullScreenButton = this.buildFullScreenButton();
      wrapperInfo.appendChild(this.fullScreenButton);
    }

    this.wrapper.appendChild(wrapperInfo);
  }

  /**
   * Add progress bar.
   * @return {object} Progress bar elements.
   */
  buildProgressBar() {
    const progress = document.createElement('div');
    progress.classList.add('h5p-interactive-book-status-progressbar-front');
    progress.setAttribute('tabindex', '-1');

    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-interactive-book-status-progressbar-back');
    wrapper.appendChild(progress);

    return { wrapper: wrapper, progress: progress };
  }

  /**
   * Build menu toggle button.
   * @return {HTMLElement} Menu toggle button.
   */
  buildMenuToggleButton() {
    const buttonWrapper = document.createElement('button');
    buttonWrapper.classList.add('h5p-interactive-book-status-menu');
    buttonWrapper.classList.add('h5p-interactive-book-status-button');
    buttonWrapper.title = Dictionary.get('a11y.menu');
    buttonWrapper.setAttribute('aria-expanded', 'false');
    buttonWrapper.setAttribute('aria-controls', 'h5p-interactive-book-navigation-menu');
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
   * @return {HTMLElement} Button.
   */
  buildToTopButton() {
    const icon = document.createElement('div');
    icon.classList.add('icon-up');
    icon.classList.add('navigation-button');

    const button = document.createElement('button');
    button.classList.add('h5p-interactive-book-status-to-top');
    button.classList.add('h5p-interactive-book-status-button');
    button.classList.add('h5p-interactive-book-status-arrow');
    button.setAttribute('title', Dictionary.get('l10n.navigateToTop'));
    button.setAttribute('aria-label', Dictionary.get('l10n.navigateToTop'));
    button.addEventListener('click', () => {
      this.callbacks.onScrollToTop();
    });

    button.appendChild(icon);

    return button;
  }

  /**
   * Create chapter title.
   * @return {object} Chapter title elements.
   */
  buildChapterTitle() {
    const text = document.createElement('h1');
    text.classList.add('title');

    const wrapper = document.createElement('div');
    wrapper.classList.add('h5p-interactive-book-status-chapter');
    wrapper.appendChild(text);

    return { wrapper: wrapper, text: text };
  }

  /**
   * Add a status-button which shows current and total chapters.
   * @return {object} Progress elements.
   */
  buildProgressIndicator() {
    const current = document.createElement('span');
    current.classList.add('h5p-interactive-book-status-progress-number');
    current.setAttribute('aria-hidden', 'true');

    const divider = document.createElement('span');
    divider.classList.add('h5p-interactive-book-status-progress-divider');
    divider.innerHTML = ' / ';
    divider.setAttribute('aria-hidden', 'true');

    const total = document.createElement('span');
    total.classList.add('h5p-interactive-book-status-progress-number');
    total.innerHTML = this.params.totalChapters;
    total.setAttribute('aria-hidden', 'true');

    const hiddenButRead = document.createElement('p');
    hiddenButRead.classList.add('hidden-but-read');

    const progressText = document.createElement('p');
    progressText.classList.add('h5p-interactive-book-status-progress');
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
   * @return {object} Navigation buttons.
   */
  buildNavigationButtons() {
    const buttons = {};

    buttons['previous'] = this.buildNavigationButton({
      icon: 'icon-previous',
      label: Dictionary.get('l10n.previousPage'),
      onClicked: (() => {
        this.callbacks.onMoved({ direction: 'prev', toTop: true });
      })
    });

    buttons['next'] = this.buildNavigationButton({
      icon: 'icon-next',
      label: Dictionary.get('l10n.nextPage'),
      onClicked: (() => {
        this.callbacks.onMoved({ direction: 'next', toTop: true });
      })
    });

    return buttons;
  }

  /**
   * Create navigation button.
   * @param {object} params Parameters.
   * @param {function} onClicked Click handler.
   * @param {string} icon CSS class name for icon.
   * @param {string} label Label.
   * @return {HTMLElement} Navigation button.
   */
  buildNavigationButton(params) {
    const button = document.createElement('button');
    button.classList.add('h5p-interactive-book-status-arrow');
    button.classList.add('h5p-interactive-book-status-button');
    button.addEventListener('click', () => {
      params.onClicked();
    });

    const icon = document.createElement('div');
    icon.classList.add('navigation-button');
    icon.classList.add(params.icon);
    icon.setAttribute('title', params.label);
    icon.setAttribute('aria-label', params.label);
    button.appendChild(icon);

    return button;
  }

  /**
   * Build fullscreen button.
   * @return {HTMLElement} Fullscreen button.
   */
  buildFullScreenButton() {
    const fullScreenButton = document.createElement('button');
    fullScreenButton.classList.add('h5p-interactive-book-status-fullscreen');
    fullScreenButton.classList.add('h5p-interactive-book-status-button');
    fullScreenButton.classList.add('h5p-interactive-book-enter-fullscreen');
    fullScreenButton.setAttribute('title', Dictionary.get('l10n.fullscreen'));
    fullScreenButton.setAttribute('aria-label', Dictionary.get('l10n.fullscreen'));
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
      { enabled: params.chapterId < this.params.totalChapters }
    );
  }

  /**
   * Update progress bar.
   * @param {number} chapterId Chapter index.
   */
  updateProgressBar(chapterId) {
    this.progressBar.progress.style.width = `${chapterId / this.params.totalChapters * 100}%`;

    const title = Dictionary.get('a11y.progress')
      .replace('@page', chapterId)
      .replace('@total', this.params.totalChapters);

    this.progressBar.progress.title = title;
    this.progressIndicator.hiddenButRead.innerHTML = title;
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
   * @param {boolean} enabled If true, will enable button, else disable.
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

    this.fullScreenButton.classList.toggle('h5p-interactive-book-enter-fullscreen', !state);
    this.fullScreenButton.classList.toggle('h5p-interactive-book-exit-fullscreen', state);

    if (state) {
      this.fullScreenButton.setAttribute('title', Dictionary.get('l10n.exitFullscreen'));
      this.fullScreenButton.setAttribute('aria-label', Dictionary.get('l10n.exitFullscreen'));
    }
    else {
      this.fullScreenButton.setAttribute('title', Dictionary.get('l10n.fullscreen'));
      this.fullScreenButton.setAttribute('aria-label', Dictionary.get('l10n.fullscreen'));
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
   * @return {boolean} Resulting state.
   */
  toggleMenu(state) {
    if (!this.menuToggleButton) {
      return false;
    }

    if (typeof state !== 'boolean') {
      state = !this.isMenuOpen();
    }

    this.menuToggleButton.classList.toggle('h5p-interactive-book-status-menu-active', state);
    this.menuToggleButton.setAttribute('aria-expanded', state);

    return state;
  }

  /**
   * Check if menu is active/open.
   * @return {boolean} True, if open, else false.
   */
  isMenuOpen() {
    if (!this.menuToggleButton) {
      return false;
    }

    return this.menuToggleButton.classList.contains('h5p-interactive-book-status-menu-active');
  }
}
