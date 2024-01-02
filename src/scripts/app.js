import Colors from '@services/colors.js';
import Chapters from '@services/chapters.js';
import Dictionary from '@services/dictionary.js';
import URLTools from '@services/urltools.js';
import Util from '@services/util.js';
import Cover from '@components/cover.js';
import StatusBar from '@components/statusbar.js';
import SideBar from '@components/sidebar/sidebar.js';
import PageContent from '@components/pagecontent/pagecontent.js';
import SinglePlaceholder from '@components/single-placeholder/single-placeholder.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';
import '@styles/h5p-portfolio.scss';

/*
 * TODO:
 * The content type is based on Interactive Book. The chapter DOM including
 * chapter transition and sizing. It is okay for Interactive Book, but now that
 * there can be a hotspots navigation, a header and a footer with different
 * needs, it's not. The pagecontent DOM should be refactored to not use absolute
 * positioning and heights set in CSS. Grid is a hot candidate, but this will
 * still involve a lot of work.
 */
export default class Portfolio extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {string} contentId ContentId.
   * @param {object} [extras] Extra configuration, e.g. metadata.
   */
  constructor(params, contentId, extras = {}) {
    super();

    Util.addMixins(
      Portfolio, [QuestionTypeContract, XAPI]
    );

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
        openMainNavigation: 'Open main navigation menu',
        closeMainNavigation: 'Close main navigation menu',
        topNavigation: 'Top navigation',
        bottomNavigation: 'Bottom navigation',
        mainNavigation: 'Main navigation',
        hotspotNavigation: 'Hotspot navigation',
        goTo: 'Go to @title',
        mainContent: 'Main content'
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

    this.chapters = new Chapters({
      dictionary: this.dictionary
    });
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
    if (typeof H5PIntegration?.moodleComponent !== 'undefined') {
      this.cannotHandleURL = true;
    }
    else {
      // Determine window context to get URL from
      try {
        this.contextWindow = top;
      }
      catch (error) {
        if (error instanceof DOMException) {
          // Use context window to store book location
          this.contextWindow = window;

          if (!this.contextWindow.location) {
            this.cannotHandleURL = true;
          }
        }
        else {
          this.cannotHandleURL = true;
        }
      }
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
        showHotspotTitles: this.params.hotspotNavigationGlobals.showHotspotTitles,
        dictionary: this.dictionary
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
        mainTitle: extras?.metadata?.title,
        a11yLabel: this.dictionary.get('a11y.mainNavigation')
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
        styleClassName: 'h5p-portfolio-status-header',
        a11yLabel: this.dictionary.get('a11y.topNavigation')
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
          const isMenuOpen = this.toggleMenu();
          if (isMenuOpen) {
            this.focusMenu();
          }
        })
      }
    );

    this.statusBarFooter = new StatusBar(
      {
        dictionary: this.dictionary,
        chapters: this.chapters,
        displayToTopButton: true,
        displayFullScreenButton: !this.params.behaviour.isPreview,
        styleClassName: 'h5p-portfolio-status-footer',
        a11yLabel: this.dictionary.get('a11y.bottomNavigation')
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
          const isMenuOpen = this.toggleMenu();
          if (isMenuOpen) {
            this.focusMenu();
          }
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

    const payload = (this.cannotHandleURL) ?
      URLTools.extractFragmentsFromURL(
        this.contextWindow,
        this.validateFragments
      ) :
      {};

    if (
      payload.h5pPortfolioId && String(payload.h5pPortfolioId) === String(this.contentId)
    ) {
      this.moveToChapter(payload);
    }
    else {
      this.moveToChapter({
        h5pPortfolioChapter: `h5p-portfolio-chapter-${this.chapters.get(0).instance.subContentId}`,
        h5pPortfolioId: this.contentId
      });
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
        h5pPortfolioChapter: currentChapter.getSubContentId()
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
      !H5P.isFullscreen &&
      (
        this.pageContent.getHeight() === currentNode.offsetHeight ||
        this.pageContent.isAnimating()
      )
    ) {
      return; // Resize not necessary
    }

    this.updateFooter();

    const currentChapter = this.chapters.getByIndex(this.currentChapterId);

    if (H5P.isFullscreen) {
      // The copy-move mechanism for headers doesn't suffice here
      const headerHeight = currentChapter.getDOM()
        .querySelector('.h5p-portfolio-header')
        ?.getBoundingClientRect().height ?? 0;

      const footerHeight = currentChapter.getDOM()
        .querySelector('.h5p-portfolio-footer')
        ?.getBoundingClientRect().height ?? 0;

      const extraContentHeight = currentChapter.getHotspotNavigationHeight() +
        headerHeight +
        footerHeight;

      if (extraContentHeight >= 0) {
        let minHeight = window.innerHeight -
          this.statusBarHeader.getHeight() -
          extraContentHeight -
          this.statusBarFooter.getHeight();

        // Yes, 19 is a magic number, some DOM offset that I am not paid to find
        if (minHeight - 19 > 0) {
          minHeight = Math.min(minHeight, extraContentHeight);

          currentChapter.setChapterContentMinHeight(minHeight - 19);
        }
      }
    }
    else {
      currentChapter.setChapterContentMinHeight('');
    }

    window.requestAnimationFrame(() => {
      if (this.pageContent.isAnimatingState) {
        return; // Prevent jumping up and down while animating
      }

      this.pageContent.setHeight(currentNode.offsetHeight);
    });
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
    if (
      params.h5pPortfolioDirection &&
      params.h5pPortfolioDirection !== 'prev' &&
      params.h5pPortfolioDirection !== 'next'
    ) {
      return; // Invalid
    }

    if (this.pageContent.isAnimating()) {
      return; // Busy
    }

    params.h5pPortfolioId = this.contentId;

    // Use shorthand
    if (!params.id && params.h5pPortfolioDirection) {
      if (
        this.currentChapterId === 0 &&
        params.h5pPortfolioDirection === 'prev' ||
        this.currentChapterId === this.chapters.get().length - 1 &&
        params.h5pPortfolioDirection === 'next'
      ) {
        return; // Nowhere to move to
      }

      if (params.h5pPortfolioDirection === 'prev') {
        params.h5pPortfolioChapter =
          this.chapters.get(this.currentChapterId - 1).getSubContentId();
      }
      else if (params.h5pPortfolioDirection === 'next') {
        params.h5pPortfolioChapter =
          this.chapters.get(this.currentChapterId + 1).getSubContentId();
      }

      delete params.h5pPortfolioSection;
      delete params.h5pPortfolioContentContent;
      delete params.header;
    }
    else if (typeof params.id === 'number') {
      params.h5pPortfolioChapter =
        this.chapters.get(params.id).getSubContentId();
    }

    if (String(params.h5pPortfolioId) === String(this.contentId)) {
      this.moveToChapter(params);
      this.changeURL(params);
    }

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
   * Set focus on menu.
   */
  focusMenu() {
    this.sideBar.focus();
  }

  /**
   * Toggle menu.
   * @returns {boolean} True, if menu is open, else false.
   */
  toggleMenu() {
    const isMenuOpen = this.contentArea.classList
      .toggle('h5p-portfolio-navigation-open');

    // Update the menu button
    this.statusBarHeader.toggleMenu(isMenuOpen);

    // We need to resize the whole book since the interactions are getting
    // more width and those with a static ratio will increase their height.
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.trigger('resize');

      setTimeout(() => {
        this.trigger('resize');
      }, 0); // Content may need to be resized after re-drawn
    }, 150);

    return isMenuOpen;
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

    this.resize();

    window.setTimeout(() => {
      this.trigger('resize');
    }, 250); // Browser may need time to exit full screen
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
   * Change URL in browser bar
   * @param {object} params Parameters.
   */
  changeURL(params = {}) {
    if (
      this.isPreview ||
      this.cannotHandleURL ||
      !this.contextWindow?.location
    ) {
      return; // Don't change URL
    }

    const origin = this.contextWindow.location.origin;
    const pathname = this.contextWindow.location.pathname;

    /*
     * InteractiveBook that was forked for Portfolio used the hash fragment to
     * store data as if it was search queries, leading to all kinds of issues.
     * That's why we cannot rely on location.hash alone but need to parse it for
     * the selector and also for the search queries.
     */
    let hashSelector =
      URLTools.getHashSelector(this.contextWindow.location.hash, '#');

    params = Object.keys(params)
      .filter((key) => key !== 'h5pPortfolioDirection')
      .reduce((result, key) => {
        return Object.assign(result, { [key]: params[key] });
      }, {});

    // Preserve all query params except for h5pPortfolio
    let queryParams = URLTools.parseURLQueryString(this.contextWindow.location.search);

    // Remove all queryParams with a key that starts with h5pPortfolio
    queryParams = Object.keys(queryParams)
      .filter((key) => !key.startsWith('h5pPortfolio'))
      .reduce((result, key) => {
        return Object.assign(result, { [key]: queryParams[key] });
      }, {});

    params = { ...queryParams, ...params };
    const search = URLTools.stringifyURLQueries(params, '?');

    const urlString =
      `${origin}${pathname}${search}${hashSelector}`;

    /*
     * First parameter is state object, not used here, 2nd is unused.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
     */
    this.contextWindow.history.pushState('', '', urlString);
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
   * Get chapters' information.
   * @param {number} [chapterId] Optional id of specific chapter.
   * @returns {object[]|object} Chapter information.
   */
  getChaptersInformation(chapterId = null) {
    const info = this.chapters.getAll()
      .map((chapter) => {
        const headerDOM = (chapter.headerDOM.style.display !== 'none') ?
          chapter.headerDOM :
          null;

        const footerDOM = (chapter.footerDOM.style.display !== 'none') ?
          chapter.footerDOM :
          null;

        const placeholderDOMs = [
          headerDOM,
          ...chapter.instance.getPlaceholderDOMs(),
          footerDOM
        ].filter((dom) => dom !== null);

        return {
          hierarchy: chapter.hierarchy,
          title: chapter.title,
          placeholderDOMs: placeholderDOMs
        };
      }
      );

    return (chapterId !== null) ? info[chapterId] : info;
  }
}

// Used to prevent to write base color styles again and again in editor preview
Portfolio.wasInstantiated = {};
