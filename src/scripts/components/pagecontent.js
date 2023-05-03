import Util from '@services/util';
import Chapters from '@services/chapters';
import HotspotNavigation from '@components/hotspotnavigation/navigation';
import '@styles/_pagecontent.scss';

export default class PageContent {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.callbacks = Util.extend({
      onScrollToTop: (() => {}),
      onResized: (() => {}),
      onChapterChanged: (() => {}),
      onMoved: (() => {}),
      isPreview: (() => {})
    }, callbacks);

    this.currentChapterId = params.currentChapterId ?? 0;

    this.isCovered = params.isCovered || false;

    this.content = this.buildPageContent();
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

    const content = document.createElement('div');
    content.classList.add('h5p-portfolio-content');

    Chapters.get().forEach((chapter) => {
      content.appendChild(chapter.getDOM());
    });

    this.setChapterOrder(this.currentChapterId);

    return content;
  }

  /**
   * Build Chapter DOMs.
   */
  buildChapterDOMs() {
    Chapters.get().forEach((chapter) => {
      chapter.setHotspotNavigation(new HotspotNavigation(
        {
          image: this.params.hotspotNavigationImage,
          hotspotColors: this.params.hotspotColors,
          contentId: this.params.contentId,
          showHotspotTitles: this.params.showHotspotTitles
        },
        {
          onClicked: ((subContentId) => {
            this.callbacks.onMoved({
              chapter: subContentId,
              toTop: true
            });
          })
        }
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
    if (currentId < 0 || currentId > Chapters.get().length - 1) {
      return;
    }

    Chapters.get().forEach((chapter, index) => {
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
    if (chapterIndex < 0 || chapterIndex > Chapters.get().length - 1) {
      return; // Out of bounds
    }

    // TODO: Clean up, don't access chapter directly

    // Instantiate and attach chapter contents
    const chapter = Chapters.get(chapterIndex);
    if (!chapter.isInitialized && chapter.instance) {
      chapter.setHeader('clone');
      chapter.instance.attach(H5P.jQuery(chapter.chapterDOM));
      chapter.setFooter('clone');
      chapter.isInitialized = true;
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
   * @param {number} height Height.
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
      }, 100);
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
    const chapterIdTo = Chapters.findChapterIndex(target.chapter);

    if (!this.isCovered) {
      // Footer/Header DOM is put in correct chapter and old position gets clone
      Chapters.getByIndex(chapterIdFrom)?.setHeader('clone');
      Chapters.getByIndex(chapterIdFrom)?.setFooter('clone');
      Chapters.getByIndex(chapterIdTo)?.setHeader('original');
      Chapters.getByIndex(chapterIdTo)?.setFooter('original');
    }

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
    if (typeof chapterIdFrom !== 'number' || typeof chapterIdTo !== 'number') {
      return;
    }

    this.isAnimatingState = true;

    /*
     * Animation done by making the current and the target node
     * visible and then applying the correct translation in x-direction
     */
    const chapterFrom = Chapters.get(chapterIdFrom);
    const chapterTo = Chapters.get(chapterIdTo);
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
        chapterFrom.toggleAnimationPosition('current', false);
        chapterFrom.toggleAnimationPosition('next', false);
        chapterTo.toggleAnimationPosition('current', true);

        chapterTo.stopAnimation();
        chapterFrom.stopAnimation();

        if (targetOnPage) {
          this.scrollTo(targetOnPage);
        }

        this.isAnimatingState = false;

        this.callbacks.onResized();
      }, 250);
    }, 50);
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

    Chapters.get(this.currentChapterId).instance.trigger('resize');
  }

  /**
   * Add footer.
   * @param {HTMLElement} footer Footer.
   */
  addFooter(footer) {
    this.content.appendChild(footer);
  }
}
