import Util from './../helpers/util';
import Chapters from './../services/chapters';

export default class PageContent {
  /**
   * @constructor
   * @param {object} config
   * @param {object} params
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onScrollToTop: (() => {}),
      onResized: (() => {}),
      onChapterChanged: (() => {})
    }, callbacks);

    this.currentChapterId = params.currentChapterId ?? 0;

    this.content = this.buildPageContent();
  }

  /**
   * Get DOM.
   * @return {HTMLElement} DOM.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Build page content.
   * @return {HTMLElement} Page content.
   */
  buildPageContent() {
    this.buildChapterDOMs();
    this.preloadChapter(this.currentChapterId);

    const content = document.createElement('div');
    content.classList.add('h5p-interactive-book-content');

    Chapters.get().forEach(chapter => {
      content.appendChild(chapter.dom);
    });

    this.setChapterOrder(this.currentChapterId);

    return content;
  }

  /**
   * Build Chapter DOMs.
   */
  buildChapterDOMs() {
    Chapters.get().forEach(chapter => {
      const columnNode = document.createElement('div');
      columnNode.classList.add('h5p-interactive-book-chapter');
      chapter.dom = columnNode;
    });
  }

  /**
   * Show.
   */
  show() {
    this.content.classList.remove('h5p-content-hidden');
  }

  /**
   * Hide.
   */
  hide() {
    this.content.classList.add('h5p-content-hidden');
  }

  /**
   * Set chapter order in DOM.
   * @param {number} currentId Current chapter's id.
   */
  setChapterOrder(currentId) {
    if (currentId < 0 || currentId > Chapters.get().length - 1) {
      return;
    }

    Chapters.get().forEach((chapter, index) => {
      chapter.dom.classList.remove('h5p-interactive-book-previous');
      chapter.dom.classList.remove('h5p-interactive-book-current');
      chapter.dom.classList.remove('h5p-interactive-book-next');

      if (index === currentId - 1) {
        // chapter.dom.classList.add('h5p-interactive-book-previous');
      }
      else if (index === currentId) {
        chapter.dom.classList.add('h5p-interactive-book-current');
      }
      else if (index === currentId + 1) {
        // chapter.dom.classList.add('h5p-interactive-book-next');
      }
    });
  }

  /**
   * Preload current chapter and the next one
   * @param {number} chapterIndex
   */
  preloadChapter(chapterIndex) {
    this.initializeChapter(chapterIndex);
    this.initializeChapter(chapterIndex + 1);
  }

  /**
   * Initialize chapter
   * @param {number} chapterIndex
   */
  initializeChapter(chapterIndex) {
    if (chapterIndex < 0 || chapterIndex > Chapters.get().length - 1) {
      return; // Out of bounds
    }

    // Instantiate and attach chapter contents
    const chapter = Chapters.get(chapterIndex);
    if (!chapter.isInitialized && chapter.instance) {
      chapter.instance.attach(H5P.jQuery(chapter.dom));
      chapter.isInitialized = true;
    }
  }

  /**
   * Get container height.
   * @return {number} Height.
   */
  getHeight() {
    return parseInt(this.content.style.height);
  }

  /**
   * Set container height.
   * @param {number} Height.
   */
  setHeight(height) {
    if (typeof height !== 'number') {
      return;
    }

    this.content.style.height = `${height}px`;
  }

  /**
   * Scroll to target.
   * @param {object} target Target.
   */
  scrollTo(target) {
    if (target.toTop) {
      this.callbacks.onScrollToTop();
      return;
    }

    let content = Chapters.findContent(target.content);
    if (!content) {
      return;
    }

    // If header is specified, try to find headers
    let dom = content.dom;
    if (target.header !== null) {
      const headers = dom.querySelectorAll('h2, h3');
      if (headers[target.header]) {
        dom = headers[target.header];
      }
    }

    // What's this doing? Setting focus to an arbitrary element
    // and the remove it once blur kicked in?
    const focusHandler = document.createElement('div');
    focusHandler.setAttribute('tabindex', '-1');
    dom.parentNode.insertBefore(focusHandler, dom);
    focusHandler.focus();

    focusHandler.addEventListener('blur', () => {
      focusHandler.parentNode.removeChild(focusHandler);
    });

    setTimeout(() => {
      dom.scrollIntoView(true);
    }, 100);
  }

  /**
   * Change chapter.
   * @param {object} target Target.
   */
  moveToChapter(target) {
    if (this.isAnimating()) {
      return; // Busy
    }

    const chapterIdFrom = this.currentChapterId;
    const chapterIdTo = Chapters.findChapterIndex(target.chapter);

    if (chapterIdFrom === chapterIdTo) {
      this.scrollTo(target);
      return;
    }

    this.currentChapterId = chapterIdTo;

    this.preloadChapter(this.currentChapterId);
    this.animateChapterTransition(chapterIdFrom, this.currentChapterId, target);

    this.callbacks.onChapterChanged(this.currentChapterId);
  }

  /**
   * Animate chapter transition.
   * @param {number} chapterIdFrom Chapter from.
   * @param {number} chapterIdTo Chapter to.
   * @param {object} [targetOnPage] Optional target in chapter to scroll to.
   */
  animateChapterTransition(chapterIdFrom, chapterIdTo, targetOnPage) {
    this.isAnimatingState = true;

    /*
     * Animation done by making the current and the target node
     * visible and then applying the correct translation in x-direction
     */
    const chapterFrom = Chapters.get(chapterIdFrom).getDOM();
    const chapterTo = Chapters.get(chapterIdTo).getDOM();
    const direction = (chapterIdFrom < chapterIdTo) ? 'next' : 'previous';

    chapterTo.classList.add(`h5p-interactive-book-${direction}`);

    chapterTo.classList.add('h5p-interactive-book-animate');
    chapterFrom.classList.add('h5p-interactive-book-animate');

    // Start the animation
    setTimeout(() => {
      if (direction === 'previous') {
        chapterFrom.classList.add('h5p-interactive-book-next');
      }
      else {
        chapterFrom.classList.remove('h5p-interactive-book-current');
        chapterFrom.classList.add('h5p-interactive-book-previous');
      }
      chapterTo.classList.remove(`h5p-interactive-book-${direction}`);
    }, 1);

    // End the animation
    setTimeout(() => {
      chapterFrom.classList.remove('h5p-interactive-book-next');
      chapterFrom.classList.remove('h5p-interactive-book-previous');
      chapterFrom.classList.remove('h5p-interactive-book-current');

      chapterTo.classList.add('h5p-interactive-book-current');

      chapterTo.classList.remove('h5p-interactive-book-animate');
      chapterFrom.classList.remove('h5p-interactive-book-animate');

      if (targetOnPage) {
        this.scrollTo(targetOnPage);
      }

      this.isAnimatingState = false;

      this.callbacks.onResized();
    }, 250);
  }

  /**
   * Determine whether page is animating.
   */
  isAnimating() {
    return this.isAnimatingState;
  }

  /**
   * Resize visible instance.
   */
  resize() {
    Chapters.get(this.currentChapterId).instance.trigger('resize');
  }
}
