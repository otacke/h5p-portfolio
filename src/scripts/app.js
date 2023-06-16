import Colors from '@services/colors';
import Chapters from '@services/chapters';
import Dictionary from '@services/dictionary';
import URLTools from '@services/urltools';
import Util from '@services/util';
import Cover from '@components/cover';
import StatusBar from '@components/statusbar';
import SideBar from '@components/sidebar';
import PageContent from '@components/pagecontent';
import SinglePlaceholder from '@components/single-placeholder/single-placeholder';

export default class Portfolio extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {string} contentId ContentId.
   * @param {object} [extras] Extra configuration, e.g. metadata.
   */
  constructor(params, contentId, extras = {}) {
    super();

    this.params = Util.extend({
      showCoverPage: false,
      hotspotNavigationGlobals: {
        hotspotNavigationImage: {},
        hotspotNavigationColor: 'rgba(255, 255, 255, .6)',
        showHotspotTitle: false
      },
      bookCover: {},
      showHeader: false,
      showFooter: false,
      portfolio: {
        chapters: [],
      },
      behaviour: {
        defaultTableOfContents: true,
        isPreview: false
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

    this.contentId = contentId;
    this.previousState = extras.previousState || {};

    this.isPreview = this.params.behaviour.isPreview;

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({
      l10n: this.params.l10n,
      a11y: this.params.a11y
    });

    this.colors = new Colors();

    // Will be called in static context
    this.validateFragments = this.validateFragments.bind(this);

    // Apply custom base color
    if (
      params?.behaviour?.baseColor &&
      !this.colors.isBaseColor(params.behaviour.baseColor) &&
      (!Portfolio.wasInstantiated[this.contentId] || this.isPreview)
    ) {
      this.colors.setBase(params.behaviour.baseColor);
      this.colors.addCustomCSSProperty(this.colors.getCSS());
    }

    if (!Portfolio.wasInstantiated[this.contentId] || this.isPreview) {
      // Apply hotspot color
      this.colors.addCustomCSSProperty(`:root{--color-hotspot-background:
        ${this.params.hotspotNavigationGlobals.hotspotNavigationColor}
      ;}`);
    }

    // Header
    const header = (
      !this.params.showHeader ||
      !this.params.headerPlaceholderGroup?.headerPlaceholder
    ) ?
      null :
      new SinglePlaceholder({
        params: this.params.headerPlaceholderGroup?.headerPlaceholder,
        contentId: this.contentId,
        context: this,
        classNames: ['h5p-portfolio-header'],
        previousState: {}
      });

    // Footer
    const footer = (
      !this.params.showFooter ||
      !this.params.footerPlaceholderGroup?.footerPlaceholder
    ) ?
      null :
      new SinglePlaceholder({
        params: this.params.footerPlaceholderGroup?.footerPlaceholder,
        contentId: this.contentId,
        context: this,
        classNames: ['h5p-portfolio-footer'],
        previousState: {}
      });

    this.chapters = new Chapters();
    this.chapters.setHeader(header);
    this.chapters.setFooter(footer);

    // Fill up chapter service
    this.chapters.fill(
      this.params.portfolio.chapters,
      this.contentId,
      { previousState : this.previousState?.chapterStates });

    this.chapters.get().forEach((chapter) => {
      this.bubbleUp(chapter.getInstance(), 'resize', this);
    });

    this.currentChapterId = this.previousState?.currentChapterId || 0;

    this.$mainWrapper = null;

    /*
     * this.params.behaviour.enableSolutionsButton and this.params.behaviour.enableRetry
     * are used by H5P's question type contract.
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
     */
    this.params.behaviour.enableSolutionsButton = false;
    this.params.behaviour.enableRetry = false;

    // Establish listeners
    this.on('resize', this.resize, this);

    this.on('enterFullScreen', () => {
      this.isFullscreen = true;
      this.statusBarHeader.setFullScreen(true);
      this.statusBarFooter.setFullScreen(true);
      this.updateFooter();
    });

    this.on('exitFullScreen', () => {
      this.isFullscreen = false;
      this.statusBarHeader.setFullScreen(false);
      this.statusBarFooter.setFullScreen(false);
      this.updateFooter();
    });

    /*
     * Bad check. Neither should H5PIntegration be queried directly nor
     * should there be custom code for a platform - but this code taken from
     * Interactive Book will trigger moodle's custom integration to redirect
     * the page otherwise and given that moodle doesn't usually allow open
     * course access, the link that is now missing may be semi-helpful only
     * anyway.
     */
    if (typeof H5PIntegration?.moodleComponent === 'undefined') {
      try {
        this.addHashListener(top);
      }
      catch (error) {
        if (error instanceof DOMException) {
          // Use iframe window to store book location hash
          this.addHashListener(window);
        }
        else {
          this.hasNoHashListener = true;
          throw error;
        }
      }
    }
    else {
      this.hasNoHashListener = true;
    }

    const showCover = this.params.showCoverPage &&
      typeof this.previousState.currentChapterId !== 'number';

    // Initialize the support components
    if (showCover) {
      this.cover = new Cover(
        {
          dictionary: this.dictionary,
          headerDOM: header?.getDOM(),
          coverData: this.params.bookCover,
          footerDOM: footer?.getDOM(),
          contentId: contentId,
          title: extras?.metadata?.title || ''
        },
        {
          onClosed: (() => {
            this.handleCoverRemoved();
          })
        }
      );
    }

    // Custom colors for chapters
    const hotspotColors = this.params.portfolio.chapters
      .map((chapter) => {
        if (
          !chapter.displayHotspotNavigation ||
          !chapter.hotspotNavigation?.useCustomHotspotColor
        ) {
          return null;
        }

        return chapter.hotspotNavigation?.customHotspotColor;
      });

    this.pageContent = new PageContent(
      {
        chapters: this.chapters,
        hotspotNavigationImage: this.params.hotspotNavigationGlobals.hotspotNavigationImage,
        contentId: this.contentId,
        hotspotColors: hotspotColors,
        isCovered: showCover,
        showHotspotTitles: this.params.hotspotNavigationGlobals.showHotspotTitles
      },
      {
        onScrollToTop: () => {
          this.scrollToTop();
        },
        onResized: (() => {
          this.trigger('resize');
        }),
        onChapterChanged: ((chapterId) => {
          this.handleChapterChanged(chapterId);
        }),
        onMoved: ((params) => {
          this.moveTo(params);
        }),
        isPreview: (() => {
          return this.isPreview || false;
        })
      }
    );

    this.sideBar = new SideBar(
      {
        chapters: this.chapters,
        mainTitle: extras?.metadata?.title
      },
      {
        onMoved: ((params) => {
          this.moveTo(params);
        }),
        onResized: (() => {
          this.trigger('resize');
        })
      }
    );

    this.statusBarHeader = new StatusBar(
      {
        dictionary: this.dictionary,
        chapters: this.chapters,
        displayMenuToggleButton: true,
        displayFullScreenButton: true,
        styleClassName: 'h5p-portfolio-status-header'
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
        dictionary: this.dictionary,
        chapters: this.chapters,
        displayToTopButton: true,
        displayFullScreenButton: true,
        styleClassName: 'h5p-portfolio-status-footer'
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

    // Kickstart the statusbar
    const statusUpdates = {
      chapterId: this.currentChapterId + 1,
      title: this.chapters.get(this.currentChapterId).getTitle()
    };

    this.statusBarHeader.update(statusUpdates);
    this.statusBarFooter.update(statusUpdates);

    this.contentArea = document.createElement('div');
    this.contentArea.classList.add('h5p-portfolio-main');

    if (this.hasCover()) {
      this.hideElements();
    }
    else {
      this.setActivityStarted();
    }

    Portfolio.wasInstantiated[this.contentId] = true;
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Wrapping element.
   */
  attach($wrapper) {
    this.$mainWrapper = $wrapper;

    // Needed to enable scrolling in fullscreen
    $wrapper.addClass('h5p-portfolio h5p-scrollable-fullscreen');

    if (this.cover) {
      this.displayCover($wrapper);
    }

    $wrapper.append(this.statusBarHeader.wrapper);

    this.contentArea.appendChild(this.sideBar.container);
    this.contentArea.appendChild(this.pageContent.getDOM());
    $wrapper.append(this.contentArea);
    $wrapper.append(this.statusBarFooter.wrapper);

    if (this.params.behaviour.defaultTableOfContents && !this.isSmallSurface()) {
      this.toggleMenu();
    }

    this.updateFooter();

    // Set start view.
    const currentChapter = this.chapters.get(this.currentChapterId);
    this.sideBar.handleClicked({
      hierarchy: currentChapter.getHierarchy(),
      target: {
        chapter: currentChapter.getSubContentId()
      }
    });

    setTimeout(() => {
      this.trigger('attached');
    }, 0);
  }

  /**
   * Handle resizing of the content
   */
  resize() {
    if (!this.pageContent || !this.chapters.get().length || !this.$mainWrapper) {
      return;
    }
    const currentNode = this.chapters.get(this.currentChapterId).getDOM();

    if (currentNode.offsetParent === null) {
      return; // Chapter is not visble.
    }

    // Prevent re-resizing if called by instance
    if (!this.bubblingUpwards) {
      this.pageContent.resize();
    }

    if (
      this.pageContent.getHeight() === currentNode.offsetHeight ||
      this.pageContent.isAnimating()
    ) {
      return; // Resize not necessary
    }

    this.pageContent.setHeight(currentNode.offsetHeight);

    this.updateFooter();
  }

  /**
   * Get cover DOM.
   * @returns {HTMLElement} Cover DOM.
   */
  getCoverDOM() {
    return this.cover?.getDOM();
  }

  /**
   * Move to.
   * @param {object} [params] Parameters.
   */
  moveTo(params = {}) {
    if (params.direction && params.direction !== 'prev' && params.direction !== 'next') {
      return; // Invalid
    }

    if (this.pageContent.isAnimating()) {
      return; // Busy
    }

    params.h5pPortfolioId = this.contentId;

    // Use shorthand
    if (!params.id && params.direction) {
      if (
        this.currentChapterId === 0 && params.direction === 'prev' ||
        this.currentChapterId === this.chapters.get().length - 1 && params.direction === 'next'
      ) {
        return; // Nowhere to move to
      }

      if (params.direction === 'prev') {
        params.chapter = this.chapters.get(this.currentChapterId - 1).getSubContentId();
      }
      else if (params.direction === 'next') {
        params.chapter = this.chapters.get(this.currentChapterId + 1).getSubContentId();
      }

      delete params.section;
      delete params.content;
      delete params.header;
    }
    else if (typeof params.id === 'number') {
      params.chapter = this.chapters.get(params.id).getSubContentId();
    }

    // Create the new hash
    params.newHash = URLTools.createFragmentsString(params);
    this.changeHash(params);

    if (params.toTop) {
      this.scrollToTop();
    }

    if (this.isMenuOpen() && this.isSmallSurface()) {
      this.toggleMenu();
    }
  }

  /**
   * Change the current active chapter.
   * @param {object} target Target.
   */
  moveToChapter(target) {
    this.pageContent.moveToChapter(target);

    const params = {
      chapterId: this.currentChapterId + 1,
      title: this.chapters.get(this.currentChapterId).getTitle()
    };

    this.statusBarHeader.update(params);
    this.statusBarFooter.update(params);
  }

  /**
   * Add listener for hash changes to specified window.
   * @param {HTMLElement} hashWindow Window to listen on.
   */
  addHashListener(hashWindow) {
    this.hashWindow = hashWindow;

    hashWindow.addEventListener('hashchange', () => {
      const payload = URLTools.extractFragmentsFromURL(this.validateFragments, this.hashWindow);
      if (payload.h5pPortfolioId && String(payload.h5pPortfolioId) === String(this.contentId)) {
        this.moveToChapter(payload);
      }
      else {
        this.moveToChapter({
          chapter: `h5p-portfolio-chapter-${this.chapters.get(0).instance.subContentId}`,
          h5pPortfolioId: this.h5pPortfolioId
        });
      }
    });
  }

  /**
   * Re-attach footer.
   */
  updateFooter() {
    if ( this.chapters.get().length === 0) {
      return;
    }

    const column = this.chapters.get(this.currentChapterId).getDOM();
    const moveFooterInsideContent = this.shouldFooterBeHidden(column.clientHeight);

    // Move status bar footer to content in fullscreen
    const footerParent = this.statusBarFooter.wrapper.parentNode;
    if (moveFooterInsideContent) {
      // Add status bar footer to page content
      if (footerParent !== this.pageContent.getDOM()) {
        this.pageContent.addFooter(this.statusBarFooter.wrapper);
      }
    }
    else {
      // Re-attach to shared bottom of book when exiting fullscreen
      if (footerParent !== this.$mainWrapper) {
        this.$mainWrapper.append(this.statusBarFooter.wrapper);
      }
    }
  }

  /**
   * Toggle menu.
   */
  toggleMenu() {
    this.contentArea.classList.toggle('h5p-portfolio-navigation-open');

    // Update the menu button
    this.statusBarHeader.toggleMenu();

    // We need to resize the whole book since the interactions are getting
    // more width and those with a static ratio will increase their height.
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.trigger('resize');

      setTimeout(() => {
        this.trigger('resize');
      }, 0); // Content may need to be resized after re-drawn
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
      this.contentArea.scrollBy(0, -this.contentArea.scrollHeight);
    }
    else {
      this.statusBarHeader.scrollIntoView();
    }
  }

  /**
   * Change URL hash.
   * @param {object} params Parameters.
   */
  changeHash(params) {
    if (String(params.h5pPortfolioId) !== String(this.contentId)) {
      return;
    }

    if (this.isPreview || this.hasNoHashListener) {
      // Don't change hash in preview but trigger moving to chapter
      this.moveToChapter(params);
      return;
    }

    this.hashWindow?.location?.replace(params.newHash);
  }

  /**
   * Check if there's a cover.
   * @returns {boolean} True, if there's a cover.
   */
  hasCover() {
    return this.cover?.container;
  }

  /**
   * Set number of active chapter.
   * @param {number} chapterId Number of active chapter.
   */
  handleChapterChanged(chapterId) {
    chapterId = parseInt(chapterId);
    if (!isNaN(chapterId)) {
      this.currentChapterId = chapterId;

      this.sideBar.setCurrentItem(this.chapters.get(chapterId).getHierarchy());
    }
  }

  /**
   * Validate fragments.
   * @param {object} fragments Fragments object from URL.
   * @returns {boolean} True, if fragments are valid.
   */
  validateFragments(fragments) {
    return fragments.chapter &&
      String(fragments.h5pPortfolioId) === String(this.contentId);
  }

  /**
   * Bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Check if menu is open.
   * @returns {boolean} True, if menu is open, else false.
   */
  isMenuOpen() {
    return this.statusBarHeader.isMenuOpen();
  }

  /**
   * Detect if wrapper is a small surface.
   * @returns {boolean} True, if wrapper is a small surface.
   */
  isSmallSurface() {
    return this.$mainWrapper?.hasClass(this.smallSurface) || false;
  }

  /**
   * Check if the content height exceeds the window.
   * @returns {boolean} True if footer should be hidden.
   */
  shouldFooterBeHidden() {
    // Always show except for in fullscreen
    // Ideally we'd check on the top window size but we can't always get it.
    return this.isFullscreen;
  }

  /**
   * Display book cover.
   * @param {HTMLElement} $wrapper Wrapper.
   */
  displayCover($wrapper) {
    this.hideElements();
    $wrapper.append(this.cover.container);
    $wrapper.addClass('covered');
    this.cover.initMedia();
  }

  /**
   * Handle cover removed.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.skipFocus] If true, skip setting focus.
   */
  handleCoverRemoved(params = {}) {
    this.$mainWrapper.get(0).classList.remove('covered');
    if (this.cover) {
      this.$mainWrapper.get(0).removeChild(this.cover.container);
    }

    this.pageContent.setCovered(false);
    this.showElements();

    this.chapters.getByIndex(this.currentChapterId).setHeader('original');
    this.chapters.getByIndex(this.currentChapterId).setFooter('original');

    this.trigger('resize');
    // This will happen also on retry, but that doesn't matter, since
    // setActivityStarted() checks if it has been run before
    this.setActivityStarted();

    // Focus header progress bar when cover is removed
    if (!params.skipFocus) {
      this.statusBarHeader.progressBar.progress.focus();
    }
  }

  /**
   * Show elements.
   */
  showElements() {
    this.statusBarHeader.show();
    this.contentArea.classList.remove('h5p-content-hidden');
    this.statusBarFooter.show();
  }

  /**
   * Hide elements.
   */
  hideElements() {
    this.statusBarHeader.hide();
    this.contentArea.classList.add('h5p-content-hidden');
    this.statusBarFooter.hide();
  }

  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.chapters.get().reduce((accu, current) => {
      if (typeof current.getInstance()?.getAnswerGiven === 'function') {
        return accu || current.getInstance().getAnswerGiven();
      }

      return accu;
    }, false);
  }

  /**
   * Get latest score.
   * @returns {number} Latest score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    if (this.chapters.get().length > 0) {
      return this.chapters.get().reduce((accu, current) => {
        if (typeof current.instance.getScore === 'function') {
          return accu + current.instance.getScore();
        }

        return accu;
      }, 0);
    }

    return 0;
  }

  /**
   * Get maximum possible score.
   * @returns {number} Score necessary for mastering.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    if (this.chapters.get().length > 0) {
      return this.chapters.get().reduce((accu, current) => {
        if (typeof current.instance.getMaxScore === 'function') {
          return accu + current.instance.getMaxScore();
        }
        return accu;
      }, 0);
    }

    return 0;
  }

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions() {
    this.chapters.get().forEach((chapter) => {
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
    if (!this.chapters.get().length) {
      return;
    }

    this.chapters.get().forEach((chapter) => {
      if (!chapter.isInitialized) {
        return;
      }
      if (typeof chapter.instance.resetTask === 'function') {
        chapter.instance.resetTask();
      }
    });

    // Force reset activity start time
    this.setActivityStarted(true);

    this.moveTo({
      h5pPortfolioId: this.contentId,
      chapter: this.chapters.get(0).getSubContentId(),
      toTop: true
    });

    if (this.hasCover()) {
      this.displayCover(this.$mainWrapper);
    }

    this.isAnswerUpdated = false;
  }

  /**
   * Get xAPI data.
   * @returns {object} xAPI statement.
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
        this.chapters.get().map((chapter) => chapter.instance)
      )
    };
  }

  /**
   * Get xAPI data from sub content types.
   * @param {H5P.ContentType[]} instances H5P instances.
   * @returns {object[]} xAPI data objects used to build a report.
   */
  getXAPIDataFromChildren(instances) {
    return instances
      .filter((instance) => typeof instance.getXAPIData === 'function')
      .map((instance) => instance.getXAPIData());
  }

  /**
   * Add question itself to the definition part of an xAPIEvent.
   * @param {H5P.XAPIEvent} xAPIEvent XAPI event.
   */
  addQuestionToXAPI(xAPIEvent) {
    const definition = xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
    Object.assign(definition, this.getxAPIDefinition());
  }

  /**
   * Generate xAPI object definition used in xAPI statements.
   * @returns {object} xAPI definition.
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
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      chapterStates: this.chapters.getAll().map((chapter) => {
        return chapter?.instance?.getCurrentState() || {};
      }),
      currentChapterId: this.currentChapterId
    };
  }

  /**
   * Get chapters' information.
   * @param {number} [chapterId] Optional id of specific chapter.
   * @returns {object[]|object} Chapter information.
   */
  getChaptersInformation(chapterId = null) {
    const info = this.chapters.getAll()
      .map((chapter) => ({
        hierarchy: chapter.hierarchy,
        title: chapter.title,
        placeholderDOMs: chapter.instance.getPlaceholderDOMs()
      }));

    return (chapterId !== null) ? info[chapterId] : info;
  }

  /**
   * Get context data.
   * Contract used for confusion report.
   * @returns {object} Context data.
   */
  getContext() {
    if (!this.cover?.isHidden()) {
      return {};
    }

    return {
      type: 'page',
      value: (this.currentChapterId + 1)
    };
  }
}

// Used to prevent to write base color styles again and again in editor preview
Portfolio.wasInstantiated = {};
