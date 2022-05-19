import URLTools from './urltools';
import Util from './util';

class PageContent extends H5P.EventDispatcher {
  /**
   * @constructor
   *
   * @param {object} config
   * @param {string} contentId
   * @param {object} contentData
   * @param {object} parent
   * @param {object} params
   */
  constructor(config, contentId, contentData, parent, params, foo, callbacks = {}) {
    super();

    this.parent = parent;
    this.behaviour = config.behaviour;

    this.callbacks = Util.extend({
      onScrollToTop: (() => {})
    }, callbacks);

    this.params = params;
    this.targetPage = {};
    this.targetPage.redirectFromComponent = false;

    this.columnNodes = [];
    this.chapters = foo.chapters;
    this.l10n = config.l10n;

    // Retrieve previous state
    this.previousState = (contentData.previousState && Object.keys(contentData.previousState).length > 0) ?
      contentData.previousState :
      null;

    if (parent.hasValidChapters()) {
      const startChapter = this.createColumns(config, contentId, contentData, foo);
      this.preloadChapter(startChapter);
    }

    this.content = this.createPageContent();

    this.container = document.createElement('div');
    this.container.classList.add('h5p-interactive-book-main');

    this.container.appendChild(this.content);
  }

  /**
   * Reset all the chapters
   */
  resetChapters() {
    if (this.behaviour.progressIndicators && !this.behaviour.progressAuto) {
      this.columnNodes.forEach(columnNode => {
        Array.from(columnNode.querySelectorAll('.h5p-interactive-book-status-progress-marker > input[type=checkbox]'))
          .forEach(element => element.checked = false);
      });
    }
  }

  /**
   * Create page content.
   * @return {HTMLElement} Page content.
   */
  createPageContent() {
    const content = document.createElement('div');
    content.classList.add('h5p-interactive-book-content');
    this.columnNodes.forEach(element => {
      content.appendChild(element);
    });

    this.setChapterOrder(this.parent.getActiveChapter());

    return content;
  }

  setChapterOrder(currentId) {
    if (currentId < 0 || currentId > this.columnNodes.length - 1) {
      return;
    }

    this.columnNodes.forEach((element, index) => {
      element.classList.remove('h5p-interactive-book-previous');
      element.classList.remove('h5p-interactive-book-current');
      element.classList.remove('h5p-interactive-book-next');

      if (index === currentId - 1) {
        // element.classList.add('h5p-interactive-book-previous');
      }
      else if (index === currentId) {
        element.classList.add('h5p-interactive-book-current');
      }
      else if (index === currentId + 1) {
        // element.classList.add('h5p-interactive-book-next');
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
    // Out of bound
    if (chapterIndex < 0 || chapterIndex > this.chapters.length - 1) {
      return;
    }

    const chapter = this.chapters[chapterIndex];
    if (!chapter.isInitialized) {
      const columnNode = this.columnNodes[chapterIndex];

      // Attach
      // TODO: What does this help actually? The really timeconsuming
      // thing is instantiating the content, isn't it?
      chapter.instance.attach(H5P.jQuery(columnNode));
      chapter.isInitialized = true;
    }
  }

  /**
   * Create Column instances.
   *
   * @param {object} config Parameters.
   * @param {number} contentId Content id.
   * @param {object} contentData Content data.
   * @return {number} start chapter
   */
  createColumns(config, contentId, contentData) {
    contentData = Object.assign({}, contentData);

    // Restore previous state
    const previousState = (contentData.previousState && Object.keys(contentData.previousState).length > 0) ?
      contentData.previousState :
      null;

    // TODO: App should prepare the data amd just pass what's needed
    let urlFragments = URLTools.extractFragmentsFromURL(this.parent.validateFragments, this.parent.hashWindow);
    if (Object.keys(urlFragments).length === 0 && contentData && previousState && previousState.urlFragments) {
      urlFragments = previousState.urlFragments;
    }

    // Go through all chapters and initialise them
    for (let i = 0; i < this.chapters.length; i++) {
      const columnNode = document.createElement('div');
      columnNode.classList.add('h5p-interactive-book-chapter');
      columnNode.id = `h5p-interactive-book-chapter-${this.chapters[i].subContentId}`;
      this.columnNodes.push(columnNode);
    }

    // First chapter should be visible, except if the URL of previous state says otherwise.
    if (urlFragments.chapter && urlFragments.h5pbookid === this.parent.contentId) {
      const chapterIndex = this.findChapterIndex(urlFragments.chapter);
      this.parent.setActiveChapter(chapterIndex);

      setTimeout(() => {
        this.redirectSection(urlFragments);
        if (this.parent.hasCover()) {
          this.parent.cover.remove();
        }
      }, 1000);

      return chapterIndex;
    }

    return 0;
  }

  /**
   * Find content by subContentId.
   * @param {string} subContentId SubContentId.
   * @return {object|null} Content element.
   */
  findContent(subContentId) {
    let content;

    this.chapters.forEach(chapter => {
      if (content) {
        return;
      }

      chapter.instance.getInstances().forEach(got => {
        if (content) {
          return;
        }
        content = got.findField(subContentId);
      });
    });

    return content || null;
  }

  /**
   * Redirect section.
   * @param {object} target Target.
   */
  redirectSection(target) {
    if (target.toTop) {
      this.callbacks.onScrollToTop();
      return;
    }

    let content = this.findContent(target.content);
    if (!content) {
      return;
    }

    // If header is specified, try to find headers
    let dom = content.dom;
    if (target.headerNumber !== null) {
      const headers = dom.querySelectorAll('h2, h3');
      if (headers[target.headerNumber]) {
        dom = headers[target.headerNumber];
      }
    }

    const focusHandler = document.createElement('div');
    focusHandler.setAttribute('tabindex', '-1');
    dom.parentNode.insertBefore(focusHandler, dom);
    focusHandler.focus();

    focusHandler.addEventListener('blur', () => {
      focusHandler.parentNode.removeChild(focusHandler);
    });

    this.targetPage.redirectFromComponent = false;
    setTimeout(() => {
      dom.scrollIntoView(true);
    }, 100);
  }

  /**
   * Find chapter index.
   *
   * @param {string} chapterUUID Chapter UUID.
   * @return {number} Chapter id.
   */
  findChapterIndex(chapterUUID) {
    let position = -1;
    this.columnNodes.forEach((element, index) => {
      if (position !== -1) {
        return; // Skip
      }
      if (element.id === chapterUUID) {
        position = index;
      }
    });

    return position;
  }

  /**
   * Change chapter.
   *
   * @param {boolean} redirectOnLoad True if should redirect on load.
   * @param {object} target Target.
   */
  changeChapter(redirectOnLoad, target) {
    if (this.columnNodes[this.parent.getActiveChapter()].classList.contains('h5p-interactive-book-animate')) {
      return;
    }

    this.targetPage = target;
    const chapterIdOld = this.parent.getActiveChapter();
    const chapterIdNew = this.parent.getChapterId(this.targetPage.chapter);
    const hasChangedChapter = chapterIdOld !== chapterIdNew;

    this.preloadChapter(chapterIdNew);

    if (chapterIdNew < this.columnNodes.length) {
      const oldChapter = this.columnNodes[chapterIdOld];
      const targetChapter = this.columnNodes[chapterIdNew];

      if (hasChangedChapter && !redirectOnLoad) {
        this.parent.setActiveChapter(chapterIdNew);

        const direction = (chapterIdOld < chapterIdNew) ? 'next' : 'previous';

        /*
         * Animation done by making the current and the target node
         * visible and then applying the correct translation in x-direction
         */
        targetChapter.classList.add(`h5p-interactive-book-${direction}`);

        targetChapter.classList.add('h5p-interactive-book-animate');
        oldChapter.classList.add('h5p-interactive-book-animate');

        // Start the animation
        setTimeout(() => {
          if (direction === 'previous') {
            oldChapter.classList.add('h5p-interactive-book-next');
          }
          else {
            oldChapter.classList.remove('h5p-interactive-book-current');
            oldChapter.classList.add('h5p-interactive-book-previous');
          }
          targetChapter.classList.remove(`h5p-interactive-book-${direction}`);
        }, 1);

        // End the animation
        setTimeout(() => {
          oldChapter.classList.remove('h5p-interactive-book-next');
          oldChapter.classList.remove('h5p-interactive-book-previous');

          oldChapter.classList.remove('h5p-interactive-book-current');
          targetChapter.classList.add('h5p-interactive-book-current');

          targetChapter.classList.remove('h5p-interactive-book-animate');
          oldChapter.classList.remove('h5p-interactive-book-animate');

          this.redirectSection(this.targetPage);

          this.parent.trigger('resize');
        }, 250);
      }
      else {
        if (this.parent.cover && !this.parent.cover.isHidden()) {
          // TODO: Check what this is ...
          this.parent.on('coverRemoved', () => {
            this.redirectSection(this.targetPage);
          });
        }
        else {
          this.redirectSection(this.targetPage);
        }
      }

      this.parent.sideBar.redirectHandler(chapterIdNew);
    }
  }

  /**
   * Update footer.
   */
  updateFooter() {
    if ( this.chapters.length === 0) {
      return;
    }
    const activeChapter = this.parent.getActiveChapter();
    const column = this.columnNodes[activeChapter];
    const moveFooterInsideContent = this.parent.shouldFooterBeHidden(column.clientHeight);

    // TODO: Let app take care of this

    // Move status bar footer to content in fullscreen
    const footerParent = this.parent.statusBarFooter.wrapper.parentNode;
    if (moveFooterInsideContent) {
      // Add status bar footer to page content
      if (footerParent !== this.content) {
        this.content.appendChild(this.parent.statusBarFooter.wrapper);
      }
    }
    else {
      // Re-attach to shared bottom of book when exiting fullscreen
      if (footerParent !== this.parent.$wrapper) {
        this.parent.$wrapper.append(this.parent.statusBarFooter.wrapper);
      }
    }
  }

  /**
   * Toggle the navigation menu.
   */
  toggleNavigationMenu() {
    this.container.classList.toggle('h5p-interactive-book-navigation-open');
  }

  /**
   * Scroll to top.
   */
  scrollToTop() {
    // TODO: Check of this is doing what it is supposed to do
    this.container.scrollBy(0, -this.container.scrollHeight);
  }
}

export default PageContent;
