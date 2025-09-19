import Util from '@services/util.js';
import HotspotNavigation from './hotspotnavigation/navigation.js';
import './pagecontent.scss';

/** @constant {number} SCROLL_INTO_VIEW_TIMEOUT_MS Timeout for scroll into view in ms. */
const SCROLL_INTO_VIEW_TIMEOUT_MS = 100;

/** @constant {number} ANIMATION_DURATION_TIMEOUT_MS Timeout for animation workaround in ms. */
const ANIMATION_DURATION_TIMEOUT_MS = 250;

/** @constant {number} ANIMATION_DELAY_MS Delay for animation in ms. */
const ANIMATION_DELAY_MS = 50;

export default class PageContent {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onScrollToTop: (() => {}),
      onResized: (() => {}),
      onChapterChanged: (() => {}),
      onMoved: (() => {}),
      isPreview: (() => {}),
    }, callbacks);

    this.currentChapterId = params.currentChapterId ?? 0;

    this.isCovered = params.isCovered || false;

    this.content = this.buildPageContent();

    // Workaround for H5P.Video with YouTube content. Needs to be attached.
    Util.callOnceVisible(this.content, () => {
      this.params.chapters.getByIndex(this.currentChapterId)?.setHeader?.('original');
      this.params.chapters.getByIndex(this.currentChapterId)?.setFooter?.('original');
    });
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.content;
  }

  /**
   * Build page content.
   * @returns {HTMLElement} Page content.
   */
  buildPageContent() {
    this.buildChapterDOMs();
    this.preloadChapter(this.currentChapterId);

    /*
     * Technically, this could be "main", but we have subcontent which could
     * use "main" as well, and there should only be one main landmark role per
     * document.
     */
    const content = document.createElement('region');
    content.classList.add('h5p-portfolio-content');
    content.setAttribute('aria-label', this.params.dictionary.get('a11y.mainContent'));

    this.params.chapters.get().forEach((chapter) => {
      content.appendChild(chapter.getDOM());
    });

    this.setChapterOrder(this.currentChapterId);

    return content;
  }

  /**
   * Build Chapter DOMs.
   */
  buildChapterDOMs() {
    this.params.chapters.get().forEach((chapter) => {
      chapter.setHotspotNavigation(new HotspotNavigation(
        {
          chapters: this.params.chapters,
          image: this.params.hotspotNavigationImage,
          hotspotColors: this.params.hotspotColors,
          contentId: this.params.contentId,
          showHotspotTitles: this.params.showHotspotTitles,
          dictionary: this.params.dictionary,
        },
        {
          onClicked: ((subContentId) => {
            this.callbacks.onMoved({
              h5pPortfolioChapter: subContentId,
              h5pPortfolioToTop: true,
            });
          }),
        },
      ));
    });
  }

  /**
   * Set covered.
   * @param {boolean} covered Covered state.
   */
  setCovered(covered) {
    if (typeof covered !== 'boolean') {
      return;
    }

    this.isCovered = covered;
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
    if (currentId < 0 || currentId > this.params.chapters.get().length - 1) {
      return;
    }

    this.params.chapters.get().forEach((chapter, index) => {
      chapter.toggleAnimationPosition('previous', false);
      chapter.toggleAnimationPosition('current', index === currentId);
      chapter.toggleAnimationPosition('next', false);
    });
  }

  /**
   * Preload current chapter and the next one
   * @param {number} chapterIndex Chapter index.
   */
  preloadChapter(chapterIndex) {
    this.initializeChapter(chapterIndex);
    this.initializeChapter(chapterIndex + 1);
  }

  /**
   * Initialize chapter.
   * @param {number} chapterIndex Chapter index.
   */
  initializeChapter(chapterIndex) {
    if (chapterIndex < 0 || chapterIndex > this.params.chapters.get().length - 1) {
      return; // Out of bounds
    }

    // Instantiate and attach chapter contents
    const chapter = this.params.chapters.get(chapterIndex);
    if (!chapter.isInitialized() && chapter.getInstance()) {
      chapter.setHeader('clone');
      chapter.getInstance().attach(H5P.jQuery(chapter.chapterDOM));
      chapter.setFooter('clone');
      chapter.setInitialized(true);
    }
  }

  /**
   * Get container height.
   * @returns {number} Height.
   */
  getHeight() {
    return parseInt(this.content.style.height);
  }

  /**
   * Set container height.
   * @param {number|null} height Height.
   */
  setHeight(height) {
    if (height === null) {
      this.content.style.height = '';
      return;
    }

    if (typeof height !== 'number') {
      return;
    }

    this.content.style.minHeight = `${height}px`;
  }

  /**
   * Scroll to target.
   * @param {object} target Target.
   */
  scrollTo(target) {
    if (target.h5pPortfolioToTop) {
      this.callbacks.onScrollToTop();
      return;
    }

    let content = this.params.chapters.findContent(target.h5pPortfolioContent);
    if (!content) {
      return;
    }

    // If dom is specified, try to find headers
    let dom = content.getDOM?.(); // For some reason, content doesn't have a getDOM function on moodle?!
    if (!dom) {
      return;
    }

    if (target.header) {
      const headers = dom.querySelectorAll('h2, h3');
      if (headers[target.header]) {
        dom = headers[target.header];
      }
    }

    if (!this.callbacks.isPreview()) { // Prevent jumping all around in preview
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
      }, SCROLL_INTO_VIEW_TIMEOUT_MS);
    }
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
    const chapterIdTo = this.params.chapters.findChapterIndex(target.h5pPortfolioChapter);

    if (typeof chapterIdFrom !== 'number' || typeof chapterIdTo !== 'number') {
      return;
    }

    if (chapterIdFrom === chapterIdTo) {
      this.scrollTo(target);
      return;
    }

    this.currentChapterId = chapterIdTo;

    this.preloadChapter(this.currentChapterId);
    this.animateChapterTransition(chapterIdFrom, this.currentChapterId, target, () => {
      if (!this.isCovered) {
        // Footer/Header DOM is put in correct chapter and old position gets clone
        this.params.chapters.getByIndex(chapterIdFrom)?.setHeader?.('clone');
        this.params.chapters.getByIndex(chapterIdFrom)?.setFooter?.('clone');
        this.params.chapters.getByIndex(chapterIdTo)?.setHeader?.('original');
        this.params.chapters.getByIndex(chapterIdTo)?.setFooter?.('original');
      }
    });

    this.callbacks.onChapterChanged(this.currentChapterId);
  }

  /**
   * Animate chapter transition.
   * @param {number} chapterIdFrom Chapter from.
   * @param {number} chapterIdTo Chapter to.
   * @param {object} [targetOnPage] Optional target in chapter to scroll to.
   * @param {function} [done] Callback when done.
   */
  animateChapterTransition(chapterIdFrom, chapterIdTo, targetOnPage, done) {
    if (typeof chapterIdFrom !== 'number' || typeof chapterIdTo !== 'number') {
      return;
    }

    this.isAnimatingState = true;

    /*
     * Animation done by making the current and the target node
     * visible and then applying the correct translation in x-direction
     */
    const chapterFrom = this.params.chapters.get(chapterIdFrom);
    const chapterTo = this.params.chapters.get(chapterIdTo);
    const direction = (chapterIdFrom < chapterIdTo) ? 'next' : 'previous';

    chapterTo.toggleAnimationPosition(direction, true);

    chapterTo.startAnimation();
    chapterFrom.startAnimation();

    // Start the animation
    setTimeout(() => {
      if (direction === 'previous') {
        chapterFrom.toggleAnimationPosition('next', true);
      }
      else {
        chapterFrom.toggleAnimationPosition('current', false);
        chapterFrom.toggleAnimationPosition('previous', true);
      }
      chapterTo.toggleAnimationPosition(direction, false);

      // End the animation
      setTimeout(() => {
        chapterFrom.toggleAnimationPosition('previous', false);

        this.params.chapters.getAll().forEach((chapter) => {
          chapter.toggleAnimationPosition('current', chapter === chapterTo);
        });
        chapterFrom.toggleAnimationPosition('next', false);

        chapterTo.stopAnimation();
        chapterFrom.stopAnimation();

        if (targetOnPage) {
          this.scrollTo(targetOnPage);
        }

        done?.();

        this.isAnimatingState = false;

        // Animation could be done already
        window.requestAnimationFrame(() => {
          this.callbacks.onResized();
        });

        // Ensure all animation has ended
        window.setTimeout(() => {
          this.callbacks.onResized();
        }, ANIMATION_DURATION_TIMEOUT_MS);
      }, ANIMATION_DURATION_TIMEOUT_MS);
    }, ANIMATION_DELAY_MS);
  }

  /**
   * Determine whether page is animating.
   * @returns {boolean} True, if is animating.
   */
  isAnimating() {
    return this.isAnimatingState;
  }

  /**
   * Resize visible instance.
   */
  resize() {
    if (typeof this.currentChapterId !== 'number') {
      return;
    }

    this.params.chapters.get(this.currentChapterId).instance.trigger('resize');
  }

  /**
   * Add footer.
   * @param {HTMLElement} footer Footer.
   */
  addFooter(footer) {
    this.content.appendChild(footer);
  }
}
