import URLTools from './urltools';
import Util from './util';
import SideBar from './sidebar';
import StatusBar from './statusbar';
import Cover from './cover';
import PageContent from './pagecontent';
import Chapter from './chapter';
import 'element-scroll-polyfill';
import Colors from './colors';

export default class InteractiveBook extends H5P.EventDispatcher {
  /**
   * @constructor
   * @param {object} params
   * @param {string} contentId
   * @param {object} extras
   */
  constructor(params, contentId, extras = {}) {
    super();

    this.params = Util.extend({
      showCoverPage: false,
      bookCover: {},
      chapters: [],
      behaviour: {
        defaultTableOfContents: true,
        progressIndicators: true,
        progressAuto: true,
        displaySummary: true
      },
      l10n: {
        read: 'Read',
        displayTOC: 'Display "Table of contents"',
        hideTOC: 'Hide "Table of contents"',
        nextPage: 'Next page',
        previousPage: 'Previous page',
        navigateToTop: 'Navigate to the top',
        fullscreen: 'Fullscreen',
        exitFullscreen: 'Exit fullscreen'
      },
      a11y: {
        progress: 'Page @page of @total.',
        menu: 'Toggle navigation menu'
      }
    }, params);

    // Filter out empty chapters
    this.params.chapters = this.params.chapters.filter(chapter => {
      return chapter?.content?.params?.contents?.length > 0;
    });

    if (!this.params.chapters.length) {
      this.params.chapters = [{
        chapterId: 1,
        content: {}
      }];
    }

    this.contentId = contentId;
    this.previousState = extras.previousState || {};

    this.validateFragments = this.validateFragments.bind(this);

    // Apply custom base color, TODO: custom function
    if (
      params?.behaviour?.baseColor &&
      !Colors.isBaseColor(params.behaviour.baseColor)
    ) {
      Colors.setBase(params.behaviour.baseColor);

      const style = document.createElement('style');
      if (style.styleSheet) {
        style.styleSheet.cssText = Colors.getCSS();
      }
      else {
        style.appendChild(document.createTextNode(Colors.getCSS()));
      }
      document.head.appendChild(style);
    }

    // Build chapters
    this.chapters = this.params.chapters.map((chapter, index) => {
      const newChapter = new Chapter({
        id: chapter.chapterId,
        content: chapter.content,
        contentId: this.contentId,
        previousState: Array.isArray(this.previousState.chapters) ?
          this.previousState.chapters[index] :
          {}
      });

      this.bubbleUp(newChapter.getInstance(), 'resize', this);

      return newChapter;
    });

    this.activeChapter = 0;
    this.newHandler = {};

    this.completed = false;

    this.l10n = this.params.l10n;
    this.$mainWrapper = null;
    this.currentRatio = null;

    this.smallSurface = 'h5p-interactive-book-small';
    this.mediumSurface = 'h5p-interactive-book-medium';
    this.largeSurface = 'h5p-interactive-book-large';

    this.isAnswerUpdated = false;

    /*
     * this.params.behaviour.enableSolutionsButton and this.params.behaviour.enableRetry
     * are used by H5P's question type contract.
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
     */
    this.params.behaviour.enableSolutionsButton = false;
    this.params.behaviour.enableRetry = false;

    /*
     * Establish all triggers
     */
    this.on('resize', this.resize, this);

    this.on('enterFullScreen', () => {
      this.isFullscreen = true;
      this.statusBarHeader.setFullScreen(true);
      this.statusBarFooter.setFullScreen(true);
      this.pageContent.updateFooter();
    });

    this.on('exitFullScreen', () => {
      this.isFullscreen = false;
      this.statusBarHeader.setFullScreen(false);
      this.statusBarFooter.setFullScreen(false);
      this.pageContent.updateFooter();
    });

    H5P.externalDispatcher.on('xAPI', (event) => {
      const actionVerbs = [
        'answered',
        'completed',
        'interacted',
        'attempted',
      ];
      const isActionVerb = actionVerbs.indexOf(event.getVerb()) > -1;
      // Some content types may send xAPI events when they are initialized,
      // so check that chapter is initialized before setting any section change
      const isInitialized = this.chapters.length;

      // TODO: What's this doing
      // if (isActionVerb && isInitialized) {
      //   this.setSectionStatusByID(this.subContentId || this.contentData.subContentId, this.activeChapter);
      // }
    });

    try {
      this.addHashListener(top);
    }
    catch (error) {
      if (error instanceof DOMException) {
        // Use iframe window to store book location hash
        this.addHashListener(window);
      }
      else {
        throw error;
      }
    }

    // Initialize the support components
    if (this.params.showCoverPage) {
      this.cover = new Cover(
        {
          coverData: this.params.bookCover,
          contentId: contentId,
          title: extras.metadata.title,
          l10n: {
            read: this.l10n.read
          }
        },
        {
          onClosed: (() => {
            this.handleCoverRemoved();
          })
        }
      );
    }

    const childContentData = {
      ...extras,
      parent: this,
    };
    this.pageContent = new PageContent(
      this.params,
      contentId,
      childContentData,
      this, {
        l10n: { markAsFinished: this.l10n.markAsFinished },
        behaviour: this.params.behaviour
      },
      {
        chapters: this.chapters
      },
      {
        onScrollToTop: () => {
          this.scrollToTop();
        }
      }
    );

    this.sideBar = new SideBar(this.params, contentId, extras.metadata.title, this,
      { chapters: this.chapters },
      {
        onMoved: ((params) => {
          this.moveTo(params);
        }),
        onResize: (() => {
          this.trigger('resize');
        })
      }
    );

    // Set progress (from previous state);
    this.chapters.forEach((chapter, index) => {
      this.setChapterRead(index, chapter.completed);
    });

    this.statusBarHeader = new StatusBar(
      {
        totalChapters: this.chapters.length,
        displayMenuToggleButton: true,
        displayFullScreenButton: true,
        styleClassName: 'h5p-interactive-book-status-header',
        l10n: {
          navigateToTop: this.params.l10n.navigateToTop,
          previousPage: this.params.l10n.previousPage,
          nextPage: this.params.l10n.nextPage,
          fullscreen: this.params.l10n.fullscreen,
          exitFullscreen: this.params.l10n.exitFullscreen
        },
        a11y: {
          menu: this.params.a11y.menu,
          progress: this.params.a11y.progress
        }
      },
      {
        onMoved: ((params) => {
          this.moveTo(params);
        }),
        onScrollToTop: (() => {
          this.scrollToTop();
        }),
        onToggleFullscreen: (() => {
          this.toggleFullScreen();
        }),
        onToggleMenu: (() => {
          this.toggleMenu();
        })
      }
    );

    this.statusBarFooter = new StatusBar(
      {
        totalChapters: this.chapters.length,
        displayToTopButton: true,
        displayFullScreenButton: true,
        styleClassName: 'h5p-interactive-book-status-footer',
        l10n: {
          navigateToTop: this.params.l10n.navigateToTop,
          previousPage: this.params.l10n.previousPage,
          nextPage: this.params.l10n.nextPage,
          fullscreen: this.params.l10n.fullscreen,
          exitFullscreen: this.params.l10n.exitFullscreen
        },
        a11y: {
          menu: this.params.a11y.menu,
          progress: this.params.a11y.progress
        }
      },
      {
        onMoved: ((params) => {
          this.moveTo(params);
        }),
        onScrollToTop: (() => {
          this.scrollToTop();
        }),
        onToggleFullscreen: (() => {
          this.toggleFullScreen();
        }),
        onToggleMenu: (() => {
          this.toggleMenu();
        })
      }
    );

    if (this.hasCover()) {
      this.hideAllElements(true);
    }
    else {
      this.setActivityStarted();
    }

    if (this.hasValidChapters()) {
      // Kickstart the statusbar
      const params = {
        chapterId: this.getCurrentChapterId() + 1,
        title: this.chapters[this.getCurrentChapterId()].getTitle()
      };

      this.statusBarHeader.update(params);
      this.statusBarFooter.update(params);
    }
  }

  /**
   * Attach library to wrapper
   * @param {jQuery} $wrapper
   */
  attach($wrapper) {
    this.$mainWrapper = $wrapper;

    // Needed to enable scrolling in fullscreen
    $wrapper.addClass('h5p-interactive-book h5p-scrollable-fullscreen');

    this.setWrapperClassFromRatio(this.$mainWrapper);
    if (this.cover) {
      this.displayCover($wrapper);
    }

    $wrapper.append(this.statusBarHeader.wrapper);

    const first = this.pageContent.container.firstChild;
    if (first) {
      this.pageContent.container.insertBefore(this.sideBar.container, first);
    }

    $wrapper.append(this.pageContent.container);
    $wrapper.append(this.statusBarFooter.wrapper);
    this.$wrapper = $wrapper;

    if (this.params.behaviour.defaultTableOfContents && !this.isSmallSurface()) {
      this.toggleMenu();
    }

    this.pageContent.updateFooter();
  }

  /**
   * Handle resizing of the content
   */
  resize() {
    if (!this.pageContent || !this.hasValidChapters() || !this.$mainWrapper) {
      return;
    }
    this.setWrapperClassFromRatio(this.$mainWrapper);
    const currentChapterId = this.getActiveChapter();
    const currentNode = this.pageContent.columnNodes[currentChapterId];

    // Only resize the visible column
    if (currentNode.offsetParent !== null) {

      // Prevent re-resizing if called by instance
      if (!this.bubblingUpwards) {
        this.pageContent.chapters[currentChapterId].instance.trigger('resize');
      }

      // Resize if necessary and not animating
      if (this.pageContent.content.style.height !== `${currentNode.offsetHeight}px` && !currentNode.classList.contains('h5p-interactive-book-animate')) {
        this.pageContent.content.style.height = `${currentNode.offsetHeight}px`;

        this.pageContent.updateFooter();

        // Add some slack time before resizing again.
        setTimeout(() => {
          this.trigger('resize');
        }, 10);
      }
    }
  }

  /**
   * Move to.
   * TODO: params
   */
  moveTo(params = {}) {
    if (params.direction && params.direction !== 'prev' && params.direction !== 'next') {
      return;
    }

    if (this.pageContent.columnNodes[this.getActiveChapter()].classList.contains('h5p-interactive-book-animate')) {
      return; // Busy
    }

    params.h5pbookid = this.contentId;

    if (params.direction) {
      if (
        this.activeChapter === 0 && params.direction === 'prev' ||
        this.activeChapter === this.chapters.length - 1 && params.direction === 'next'
      ) {
        return; // Nowhere to move to
      }

      if (params.direction === 'prev') {
        params.chapter = this.chapters[this.activeChapter - 1].getSubContentId();
      }
      else if (params.direction === 'next') {
        params.chapter = this.chapters[this.activeChapter + 1].getSubContentId();
      }

      delete params.section;
      delete params.content;
      delete params.headerNumber;
    }

    // Create the new hash
    params.newHash = URLTools.createFragmentsString(params);

    // Assert that the module itself is asking for a redirect
    params.redirectFromComponent = true;

    // TODO: What was this required for?
    if (this.getChapterId(params.chapter) === this.activeChapter) {
      const fragmentsEqual = URLTools.areFragmentsEqual(
        params,
        URLTools.extractFragmentsFromURL(this.validateFragments, this.hashWindow),
        ['h5pbookid', 'chapter', 'section', 'content', 'headerNumber']
      );

      if (fragmentsEqual) {
        // only trigger section redirect without changing hash
        this.pageContent.changeChapter(false, params);
        return;
      }
    }

    /*
     * Set final chapter read on entering automatically if it doesn't
     * contain tasks and if all other chapters have been completed
     */
    if (this.params.behaviour.progressAuto) {
      const id = this.getChapterId(params.chapter);
      if (this.isFinalChapterWithoutTask(id)) {
        this.setChapterRead(id);
      }
    }

    this.changeHash(params);

    if (params.toTop) {
      this.scrollToTop();
    }

    if (this.isMenuOpen() && this.isSmallSurface()) {
      this.toggleMenu();
    }
  }

  /**
   * Toggle menu.
   */
  toggleMenu() {
    this.pageContent.toggleNavigationMenu();

    // Update the menu button
    this.statusBarHeader.toggleMenu();

    // We need to resize the whole book since the interactions are getting
    // more width and those with a static ratio will increase their height.
    setTimeout(() => {
      this.trigger('resize');
    }, 150);
  }

  /**
   * Toggle fullscreen.
   */
  toggleFullScreen() {
    if (H5P.isFullscreen === true) {
      H5P.exitFullScreen();
    }
    else {
      H5P.fullScreen(this.$mainWrapper, this);
    }
  }

  /**
   * Scroll to top.
   */
  scrollToTop() {
    if (H5P.isFullscreen) {
      this.pageContent.scrollToTop();
    }
    else {
      this.statusBarHeader.scrollIntoView();
    }

    this.statusBarHeader.setFocusToMenuToggleButton();
  }

  /**
   * Change URL hash.
   * @params {object} params Parameters.
   */
  changeHash(params) {
    if (String(params.h5pbookid) !== String(this.contentId)) {
      return;
    }

    this.hashWindow.location.replace(params.newHash);
  }

  /**
   * Check if there's a cover.
   * @return {boolean} True, if there's a cover.
   */
  hasCover() {
    return this.cover?.container;
  }

  /**
   * Check if chapters has tasks
   * @param {Array} chapters
   * @return {boolean}
   */
  hasChaptersTasks(chapters) {
    // TODO: Use Column ...
    return chapters
      .filter(
        chapter => chapter.sections.filter(section => section.isTask === true).length > 0
      ).length > 0;
  }

  /**
   * Check if there are valid chapters.
   *
   * @return {boolean} True, if there are valid(not empty) chapters.
   */
  hasValidChapters() {
    return this.chapters.length > 0;
  }

  /**
   * Get number of active chapter.
   * @return {number} Number of active chapter.
   */
  getActiveChapter(getActualChapter = false) {
    return getActualChapter ?
      this.chapters[this.activeChapter] :
      this.activeChapter;
  }

  getCurrentChapterId() {
    return this.activeChapter;
  }

  /**
   * Set number of active chapter.
   * @param {number} chapterId Number of active chapter.
   */
  setActiveChapter(chapterId) {
    chapterId = parseInt(chapterId);
    if (!isNaN(chapterId)) {
      this.activeChapter = chapterId;
    }
  }

  /**
   * Validate fragments.
   * @param {object} fragments Fragments object from URL.
   * @return {boolean} True, if fragments are valid.
   */
  validateFragments(fragments) {
    return fragments.chapter &&
      String(fragments.h5pbookid) === String(this.contentId);
  }

  /**
   * Bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, event => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Check if menu is open
   * @return {boolean} True, if menu is open, else false.
   */
  isMenuOpen() {
    // TODO: Let sidebar keep status instead?
    return this.statusBarHeader.isMenuOpen();
  }

  /**
   * Detect if wrapper is a small surface
   * @return {*}
   */
  isSmallSurface() {
    return this.$mainWrapper?.hasClass(this.smallSurface) || false;
  }

  /**
   * Get the ratio of the wrapper
   * @return {number} Ratio.
   */
  getRatio() {
    return this.$mainWrapper.width() / parseFloat(this.$mainWrapper.css('font-size'));
  }

  /**
   * Add/remove classname based on the ratio
   * @param {jQuery} wrapper
   * @param {number} ratio
   */
  setWrapperClassFromRatio(wrapper, ratio = this.getRatio()) {
    if ( ratio === this.currentRatio) {
      return;
    }

    this.breakpoints().forEach(item => {
      if (item.shouldAdd(ratio)) {
        this.$mainWrapper.addClass(item.className);
      }
      else {
        this.$mainWrapper.removeClass(item.className);
      }
    });
    this.currentRatio = ratio;
  }

  /**
   * Check if the current chapter is read.
   * @returns {boolean} True, if current chapter was read.
   */
  isCurrentChapterRead() {
    return this.isChapterRead(this.chapters[this.activeChapter], this.params.behaviour.progressAuto);
  }

  /**
   * Checks if a chapter is read
   *
   * @param chapter
   * @param {boolean} autoProgress
   * @returns {boolean}
   */
  isChapterRead(chapter, autoProgress = this.params.behaviour.progressAuto) {
    return chapter.completed || (autoProgress && chapter.tasksLeft === 0);
  }

  /**
   * Check if chapter is final one, has no tasks and all other chapters are done.
   * @param {number} chapterId Chapter id.
   * @return {boolean} True, if final chapter without tasks and other chapters done.
   */
  isFinalChapterWithoutTask(chapterId) {
    return this.chapters[chapterId].maxTasks === 0 &&
      this.chapters.slice(0, chapterId).concat(this.chapters.slice(chapterId + 1))
        .every(chapter => chapter.tasksLeft === 0);
  }

  /**
   * Set the current chapter as completed.
   * @param {number} [chapterId] Chapter Id, defaults to current chapter.
   * @param {boolean} [read=true] True for chapter read, false for not read.
   */
  setChapterRead(chapterId = this.activeChapter, read = true) {
    this.handleChapterCompletion(chapterId, read);
    this.sideBar.updateChapterProgressIndicator(chapterId, read ? 'DONE' : this.hasChapterStartedTasks(this.chapters[chapterId]) ? 'STARTED' : 'BLANK');
  }

  /**
   * Checks if chapter has started on any of the sections
   * @param chapter
   * @return {boolean}
   */
  hasChapterStartedTasks(chapter) {
    return chapter.sections.filter(section => section.taskDone).length > 0;
  }

  /**
   * Get textual status for chapter
   * @param chapter
   * @param {boolean} progressAuto
   * @return {string}
   */
  getChapterStatus(chapter, progressAuto = this.params.behaviour.progressAuto) {
    let status = 'BLANK';

    if (this.isChapterRead(chapter, progressAuto)) {
      status = 'DONE';
    }
    else if (this.hasChapterStartedTasks(chapter)) {
      status = 'STARTED';
    }

    return status;
  }

  /**
   * Update statistics on the main chapter.
   * @param {number} chapterId Chapter Id.
   * @param {boolean} hasChangedChapter Indicate whether a chapter changed.
   */
  updateChapterProgress(chapterId, hasChangedChapter = false) {
    if (!this.params.behaviour.progressIndicators) {
      return;
    }

    const chapter = this.chapters[chapterId];
    let status;
    if (chapter.maxTasks) {
      status = this.getChapterStatus(chapter);
    }
    else {
      if (this.isChapterRead(chapter) && hasChangedChapter) {
        status = 'DONE';
      }
      else {
        status = 'BLANK';
      }
    }

    if (status === 'DONE') {
      this.handleChapterCompletion(chapterId);
    }

    this.sideBar.updateChapterProgressIndicator(chapterId, status);
  }

  /**
   * Get id of chapter.
   * @param {string} chapterUUID ChapterUUID.
   * @return {number} Chapter Id.
   */
  getChapterId(chapterUUID) {
    chapterUUID = chapterUUID.replace('h5p-interactive-book-chapter-', '');

    return this.chapters
      .map(chapter => chapter.instance.subContentId).indexOf(chapterUUID);
  }

  /**
   * Handle chapter completion, e.g. trigger xAPI statements
   * @param {number} chapterId Id of the chapter that was completed.
   * @param {boolean} [completed=true] True for completed, false for uncompleted.
   */
  handleChapterCompletion(chapterId, completed = true) {
    const chapter = this.chapters[chapterId];

    if (chapter.isSummary === true) {
      return;
    }

    if (!completed) {
      // Reset chapter and book completion.
      chapter.completed = false;
      this.completed = false;
      this.trigger('bookCompleted', {completed: this.completed});
      return;
    }

    // New chapter completed
    if (!chapter.completed) {
      chapter.completed = true;
      chapter.instance.triggerXAPIScored(chapter.instance.getScore(), chapter.instance.getMaxScore(), 'completed');
    }

    // All chapters completed
    if (!this.completed && this.chapters.filter(chapter => !chapter.isSummary).every(chapter => chapter.completed)) {
      this.completed = true;
      this.trigger('bookCompleted', {completed: this.completed});
    }
  }

  /**
   * Check if the content height exceeds the window.
   */
  shouldFooterBeHidden() {
    // Always show except for in fullscreen
    // Ideally we'd check on the top window size but we can't always get it.
    return this.isFullscreen;
  }

  /**
   * Get content container width.
   * @return {number} Container width or 0.
   */
  getContainerWidth() {
    return this.pageContent?.container?.offsetWidth || 0;
  }

  /**
   * Change the current active chapter.
   * @param {boolean} redirectOnLoad Is this a redirect which happens immediately?
   */
  changeChapter(redirectOnLoad) {
    this.pageContent.changeChapter(redirectOnLoad, this.newHandler);

    const params = {
      chapterId: this.getCurrentChapterId() + 1,
      title: this.chapters[this.getCurrentChapterId()].getTitle()
    };

    this.statusBarHeader.update(params);
    this.statusBarFooter.update(params);
    this.newHandler.redirectFromComponent = false;
  }

  /**
   * Get list of classname and conditions for when to add the classname to the content type
   * @return {[{className: string, shouldAdd: (function(*): boolean)}, {className: string, shouldAdd: (function(*): boolean|boolean)}, {className: string, shouldAdd: (function(*): boolean)}]}
   */
  breakpoints() {
    // TODO: Why is this not done with media queries?
    return [
      {
        'className': this.smallSurface,
        'shouldAdd': ratio => ratio < 43,
      },
      {
        'className': this.mediumSurface,
        'shouldAdd': ratio => ratio >= 43 && ratio < 60,
      },
      {
        'className': this.largeSurface,
        'shouldAdd': ratio => ratio >= 60,
      },
    ];
  }

  /**
   * Display book cover.
   * @param {HTMLElement} wrapper Wrapper.
   */
  displayCover(wrapper) {
    this.hideAllElements(true);
    wrapper.append(this.cover.container);
    wrapper.addClass('covered');
    this.cover.initMedia();
  }

  /**
   * Handle cover removed.
   */
  handleCoverRemoved() {
    this.$mainWrapper.get(0).classList.remove('covered');
    this.$mainWrapper.get(0).removeChild(this.cover.container);

    this.hideAllElements(false);

    this.trigger('resize');
    // This will happen also on retry, but that doesn't matter, since
    // setActivityStarted() checks if it has been run before
    this.setActivityStarted();

    // Focus header progress bar when cover is removed
    // TODO: Don't manipulate directly
    this.statusBarHeader.progressBar.progress.focus();
  }

  /**
   * Redirect chapter.
   *
   * @param {object} target Target data.
   * @param {string} target.h5pbookid Book id.
   * @param {string} target.chapter Chapter UUID.
   * @param {string} target.section Section UUID.
   */
  redirectChapter(target) {
    /**
     * If true, we already have information regarding redirect in newHandler
     * When using browser history, a convert is neccecary
     */
    if (!this.newHandler.redirectFromComponent) {

      // Assert that the handler actually is from this content type.
      if (target.h5pbookid && String(target.h5pbookid) === String(this.contentId)) {
        this.newHandler = target;
      /**
       * H5p-context switch on no newhash = history backwards
       * Redirect to first chapter
       */
      }
      else {
        this.newHandler = {
          chapter: `h5p-interactive-book-chapter-${this.chapters[0].instance.subContentId}`,
          h5pbookid: this.h5pbookid
        };
      }
    }

    this.changeChapter(false);
  }

  /**
   * Set a section progress indicator.
   * @param {string} sectionUUID UUID of target section.
   * @param {number} chapterId Number of targetchapter.
   */
  setSectionStatusByID(sectionUUID, chapterId) {
    this.chapters[chapterId].sections.forEach((section, index) => {
      const sectionInstance = section.instance;

      if (sectionInstance.subContentId === sectionUUID && !section.taskDone) {
        // Check if instance has given an answer
        section.taskDone = sectionInstance.getAnswerGiven ? sectionInstance.getAnswerGiven() : true;

        this.sideBar.setSectionMarker(chapterId, index);
        if (section.taskDone) {
          this.chapters[chapterId].tasksLeft -= 1;
        }
        this.updateChapterProgress(chapterId);
      }
    });
  }

  /**
   * Add listener for hash changes to specified window.
   * @param {HTMLElement} hashWindow Window to listen on.
   */
  addHashListener(hashWindow) {
    this.hashWindow = hashWindow;

    hashWindow.addEventListener('hashchange', () => {
      const payload = URLTools.extractFragmentsFromURL(this.validateFragments, this.hashWindow);
      if (payload.h5pbookid && String(payload.h5pbookid) === String(this.contentId)) {
        this.redirectChapter(payload);
      }
    });
  }

  /**
   * Hide all elements.
   * @param {boolean} hide True to hide elements.
   */
  // TODO: Replace by showAllElements/hideAllElements
  hideAllElements(hide) {
    const nodes = [
      this.statusBarHeader.wrapper,
      this.statusBarFooter.wrapper,
      this.pageContent.container
    ];

    if (hide) {
      nodes.forEach(node => {
        node.classList.add('h5p-content-hidden');
        node.classList.add('h5p-interactive-book-cover-present');
      });
    }
    else {
      nodes.forEach(node => {
        node.classList.remove('h5p-content-hidden');
        node.classList.remove('h5p-interactive-book-cover-present');
      });
    }
  }

  // TODO: Replace this custom implementation by trusting the "Column"

  /**
   * Check if result has been submitted or input has been given.
   * @return {boolean} True, if answer was given.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.chapters.reduce((accu, current) => {
      if (typeof current.instance.getAnswerGiven === 'function') {
        return accu && current.instance.getAnswerGiven();
      }
      return accu;
    }, true);
  }

  /**
   * Get latest score.
   * @return {number} Latest score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    if (this.chapters.length > 0) {
      return this.chapters.reduce((accu, current) => {
        if (typeof current.instance.getScore === 'function') {
          return accu + current.instance.getScore();
        }
        return accu;
      }, 0);
    }
    else if (this.previousState) {
      return this.previousState.score || 0;
    }

    return 0;
  }

  /**
   * Get maximum possible score.
   * @return {number} Score necessary for mastering.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    if (this.chapters.length > 0) {
      return this.chapters.reduce((accu, current) => {
        if (typeof current.instance.getMaxScore === 'function') {
          return accu + current.instance.getMaxScore();
        }
        return accu;
      }, 0);
    }
    else if (this.previousState) {
      return this.previousState.maxScore || 0;
    }

    return 0;
  }

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions() {
    this.chapters.forEach(chapter => {
      if (typeof chapter.instance.toggleReadSpeaker === 'function') {
        chapter.instance.toggleReadSpeaker(true);
      }
      if (typeof chapter.instance.showSolutions === 'function') {
        chapter.instance.showSolutions();
      }
      if (typeof chapter.instance.toggleReadSpeaker === 'function') {
        chapter.instance.toggleReadSpeaker(false);
      }
    });
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    if (this.hasValidChapters()) {
      this.chapters.forEach((chapter, index) => {
        if (!chapter.isInitialized || chapter.isSummary) {
          return;
        }
        if (typeof chapter.instance.resetTask === 'function') {
          chapter.instance.resetTask();
        }
        chapter.tasksLeft = chapter.maxTasks;
        chapter.sections.forEach(section => section.taskDone = false);
        this.setChapterRead(index, false);
      });

      // Force reset activity start time
      this.setActivityStarted(true);
      this.pageContent.resetChapters();
      this.sideBar.resetIndicators();

      this.moveTo({
        h5pbookid: this.contentId,
        chapter: this.chapters[0].getSubContentId(),
        section: 'top',
      });

      if ( this.hasCover()) {
        this.displayCover(this.$mainWrapper);
      }
      this.isAnswerUpdated = false;
    }
  }

  /**
   * Get xAPI data.
   * @return {object} xAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    const xAPIEvent = this.createXAPIEventTemplate('answered');
    this.addQuestionToXAPI(xAPIEvent);
    xAPIEvent.setScoredResult(this.getScore(),
      this.getMaxScore(),
      this,
      true,
      this.getScore() === this.getMaxScore()
    );

    return {
      statement: xAPIEvent.data.statement,
      children: this.getXAPIDataFromChildren(
        this.chapters.map(chapter => chapter.instance)
      )
    };
  }

  /**
   * Get xAPI data from sub content types.
   * @param {H5P.ContentType[]} instances H5P instances.
   * @return {object[]} xAPI data objects used to build a report.
   */
  getXAPIDataFromChildren(instances) {
    return instances
      .filter(instance => typeof instance.getXAPIData === 'function')
      .map(instance => instance.getXAPIData());
  }

  /**
   * Add question itself to the definition part of an xAPIEvent.
   * @param {H5P.XAPIEvent} xAPIEvent.
   */
  addQuestionToXAPI(xAPIEvent) {
    const definition = xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
    Object.assign(definition, this.getxAPIDefinition());
  }

  /**
   * Generate xAPI object definition used in xAPI statements.
   * @return {object} xAPI definition.
   */
  getxAPIDefinition() {
    return {
      interactionType: 'compound',
      type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
      description: {'en-US': ''}
    };
  }

  /**
   * Answer call to return the current state.
   * @return {object} Current state.
   */
  getCurrentState() {
    // Get relevant state information from non-summary chapters
    const chapters = this.chapters
      .filter(chapter => !chapter.isSummary)
      .map(chapter => ({
        completed: chapter.completed,
        sections: chapter.sections.map(section => ({taskDone: section.taskDone})),
        state: chapter.instance.getCurrentState()
      }));

    return {
      urlFragments: URLTools.extractFragmentsFromURL(this.validateFragments, this.hashWindow),
      chapters: chapters,
      score: this.getScore(),
      maxScore: this.getMaxScore()
    };
  }

  /**
   * Get context data.
   * Contract used for confusion report.
   * @return {object} Context data.
   */
  getContext() {
    if (!this.cover?.isHidden()) {
      return {};
    }

    return {
      type: 'page',
      value: (this.activeChapter + 1)
    };
  }
}
