import Util from './util';

/**
 * A component which helps in navigation
 * Constructor function.
 */
class SideBar extends H5P.EventDispatcher {
  constructor(config, contentId, mainTitle, parent, foo, callbacks = {}) {
    super();

    this.callbacks = Util.extend({
      onMoved: (() => {}),
      onResize: (() => {})
    }, callbacks);

    this.id = contentId;
    this.parent = parent;
    this.behaviour = config.behaviour;
    this.content = document.createElement('ul');
    this.content.classList.add('navigation-list');
    this.container = this.addSideBar();
    this.l10n = config.l10n;

    this.chapters = foo.chapters;
    this.chapterNodes = this.getChapterNodes();

    if (mainTitle) {
      this.titleElem = this.addMainTitle(mainTitle);
      this.container.appendChild(this.titleElem);
    }

    this.chapterNodes.forEach(element => {
      this.content.appendChild(element);
    });

    if (this.chapters.length > 20) {
      this.content.classList.add('large-navigation-list');
    }

    this.container.appendChild(this.content);

    this.addTransformListener();
    this.initializeNavigationControls();
  }

  initializeNavigationControls() {
    const keyCodes = Object.freeze({
      'UP': 38,
      'DOWN': 40,
    });

    this.chapterNodes.forEach((chapter, i) => {
      const chapterButton = chapter.querySelector('.h5p-interactive-book-navigation-chapter-button');
      chapterButton.addEventListener('keydown', (e) => {
        switch (e.keyCode) {
          case keyCodes.UP:
            this.setFocusToChapterItem(i, -1);
            e.preventDefault();
            break;

          case keyCodes.DOWN:
            this.setFocusToChapterItem(i, 1);
            e.preventDefault();
            break;
        }
      });

      const sections = chapter.querySelectorAll('.h5p-interactive-book-navigation-section');
      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex];
        const sectionButton = section.querySelector('.section-button');
        sectionButton.addEventListener('keydown', e => {
          switch (e.keyCode) {
            case keyCodes.UP:
              this.setFocusToSectionItem(i, sectionIndex, -1);
              e.preventDefault();
              break;

            case keyCodes.DOWN:
              this.setFocusToSectionItem(i, sectionIndex, 1);
              e.preventDefault();
              break;
          }
        });
      }
    });
  }

  setFocusToChapterItem(index, direction = 0) {
    let nextIndex = index + direction;
    if (nextIndex < 0) {
      nextIndex = this.chapterNodes.length - 1;
    }
    else if (nextIndex > this.chapterNodes.length - 1) {
      nextIndex = 0;
    }

    // Check if we should navigate to a section
    if (direction) {
      const chapterIndex = direction > 0 ? index : nextIndex;
      const chapter = this.chapterNodes[chapterIndex];
      if (!chapter.classList.contains('h5p-interactive-book-navigation-closed')) {
        const sections = chapter.querySelectorAll('.h5p-interactive-book-navigation-section');
        if (sections.length) {
          const sectionItemIndex = direction > 0 ? 0 : sections.length - 1;
          this.setFocusToSectionItem(chapterIndex, sectionItemIndex);
          return;
        }
      }
    }

    const nextChapter = this.chapterNodes[nextIndex];
    const chapterButton = nextChapter.querySelector('.h5p-interactive-book-navigation-chapter-button');
    this.setFocusToItem(chapterButton, nextIndex);
  }

  setFocusToSectionItem(chapterIndex, index, direction = 0) {
    const chapter = this.chapterNodes[chapterIndex];
    const sections = chapter.querySelectorAll('.h5p-interactive-book-navigation-section');

    // Navigate chapter if outside of section bounds
    const nextIndex = index + direction;
    if (nextIndex > sections.length - 1) {
      this.setFocusToChapterItem(chapterIndex + 1);
      return;
    }
    else  if (nextIndex < 0) {
      this.setFocusToChapterItem(chapterIndex);
      return;
    }

    const section = sections[nextIndex];
    const sectionButton = section.querySelector('.section-button');
    this.setFocusToItem(sectionButton, chapterIndex);
  }

  setFocusToItem(element, chapterIndex, skipFocusing = false) {
    // Remove focus from all other elements
    this.chapterNodes.forEach((chapter, index) => {
      const chapterButton = chapter.querySelector('.h5p-interactive-book-navigation-chapter-button');

      // Highlight current chapter
      if (index === chapterIndex) {
        chapterButton.classList.add('h5p-interactive-book-navigation-current');
      }
      else {
        chapterButton.classList.remove('h5p-interactive-book-navigation-current');
      }
      chapterButton.setAttribute('tabindex', '-1');

      const sections = chapter.querySelectorAll('.h5p-interactive-book-navigation-section');
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionButton = section.querySelector('.section-button');
        sectionButton.setAttribute('tabindex', '-1');

      }
    });

    element.setAttribute('tabindex', '0');
    this.focusedChapter = chapterIndex;
    if (!skipFocusing) {
      element.focus();
    }
  }

  /**
   * Get sidebar DOM.
   *
   * @return {HTMLElement} DOM for sidebar.
   */
  addSideBar() {
    const container = document.createElement('div');
    container.id = 'h5p-interactive-book-navigation-menu';
    container.classList.add('h5p-interactive-book-navigation');

    return container;
  }

  /**
   * Get main title.
   *
   * @param {string} title Title.
   * @return {HTMLElement} Title element.
   */
  addMainTitle(titleText) {
    const title = document.createElement('h2');
    title.classList.add('navigation-title');
    title.innerHTML = titleText;
    title.setAttribute('title', titleText);

    const titleWrapper = document.createElement('div');
    titleWrapper.classList.add('h5p-interactive-book-navigation-maintitle');
    titleWrapper.appendChild(title);

    return titleWrapper;
  }

  /**
   * Find sections in chapter.
   *
   * @param {object} columnData Column data.
   * @return {object[]} Sections data.
   */
  findSectionsInChapter(columnData) {
    const sectionsData = [];
    const sections = columnData.params.contents;
    for (let j = 0; j < sections.length; j++) {
      const content = sections[j].content;

      let title = '';
      switch (content.library.split(' ')[0]) {
        case 'H5P.Link':
          if (content.params.title) {
            title = content.params.title;
          }
          else {
            title = 'New link';
          }
          break;
        default:
          title = content.metadata.title;
      }

      sectionsData.push({
        title: title,
        id: content.subContentId ? `h5p-interactive-book-section-${content.subContentId}` : undefined
      });
    }

    return sectionsData;
  }

  /**
   * Find all chapters.
   * @param {object[]} columnsData Columns data.
   * @return {object[]} Chapters data.
   */
  findAllChapters(columnsData) {
    const chapters = [];
    for (let i = 0; i < columnsData.length; i++) {
      const sections = this.findSectionsInChapter(columnsData[i].content);
      const chapterTitle = columnsData[i].content.metadata.title;
      const id = `h5p-interactive-book-chapter-${columnsData[i].content.subContentId}`;
      chapters.push({
        sections: sections,
        title: chapterTitle,
        id: id
      });
    }

    return chapters;
  }

  /**
   * Toggle chapter menu.
   *
   * @param {HTMLElement} chapterNode Chapter.
   * @param {boolean} collapse If true, will collapse chapter.
   */
  toggleChapter(chapterNode, collapse) {
    collapse = (collapse !== undefined) ? collapse : !(chapterNode.classList.contains('h5p-interactive-book-navigation-closed'));

    const childNav = chapterNode.querySelector('.h5p-interactive-book-navigation-sectionlist');
    const arrow = chapterNode.getElementsByClassName('h5p-interactive-book-navigation-chapter-accordion')[0];
    const chapterButton = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button');
    chapterButton.setAttribute('aria-expanded', (!collapse).toString());

    if (collapse === true) {
      chapterNode.classList.add('h5p-interactive-book-navigation-closed');
      if (arrow) {
        arrow.classList.remove('icon-expanded');
        arrow.classList.add('icon-collapsed');
        if (childNav) {
          childNav.setAttribute('aria-hidden', true);
          childNav.setAttribute('tabindex', '-1');
        }
      }
    }
    else {
      chapterNode.classList.remove('h5p-interactive-book-navigation-closed');
      if (arrow) {
        arrow.classList.remove('icon-collapsed');
        arrow.classList.add('icon-expanded');
        if (childNav) {
          childNav.removeAttribute('aria-hidden');
          childNav.removeAttribute('tabindex');
        }
      }
    }
  }

  /**
   * Fires whenever a redirect is happening in parent
   * All chapters will be collapsed except for the active
   *
   * @param {number} chapterId The chapter that should stay open in the menu.
   */
  redirectHandler(chapterId) {
    this.chapterNodes.forEach((node, index) => {
      this.toggleChapter(node, index !== chapterId);
    });
    // Trigger resize after toggling all chapters
    this.callbacks.onResize();

    // Focus new chapter button if active chapter was closed
    if (chapterId !== this.focusedChapter) {
      const chapterButton = this.chapterNodes[chapterId].querySelector('.h5p-interactive-book-navigation-chapter-button');
      this.setFocusToItem(chapterButton, chapterId, true);
    }
  }

  /**
   * Reset indicators.
   */
  resetIndicators() {
    this.chapterNodes.forEach((node, index) => {
      // Reset chapter
      this.updateChapterProgressIndicator(index, 'BLANK');

      // Reset sections
      const sections = node.getElementsByClassName('h5p-interactive-book-navigation-section');
      for (let section of sections) {
        const icon = section.querySelector('.h5p-interactive-book-navigation-section-icon');
        if (icon) {
          icon.classList.remove('icon-question-answered');
          icon.classList.add('icon-chapter-blank');
        }
      }
    });
  }

  /**
   * Update the indicator on a specific chapter.
   *
   * @param {number} chapterId The chapter that should be updated.
   * @param {string} status Status.
   */
  updateChapterProgressIndicator(chapterId, status) {
    if (!this.behaviour.progressIndicators) {
      return;
    }

    const chapter = this.chapters[chapterId];
    if ( chapter.isSummary ) {
      return;
    }

    const progressIndicator = this.chapterNodes[chapterId]
      .getElementsByClassName('h5p-interactive-book-navigation-chapter-progress')[0];

    if (status === 'BLANK') {
      progressIndicator.classList.remove('icon-chapter-started');
      progressIndicator.classList.remove('icon-chapter-done');
      progressIndicator.classList.add('icon-chapter-blank');
    }
    else if (status === 'DONE') {
      progressIndicator.classList.remove('icon-chapter-blank');
      progressIndicator.classList.remove('icon-chapter-started');
      progressIndicator.classList.add('icon-chapter-done');
    }
    else if (status === 'STARTED') {
      progressIndicator.classList.remove('icon-chapter-blank');
      progressIndicator.classList.remove('icon-chapter-done');
      progressIndicator.classList.add('icon-chapter-started');
    }
  }

  /**
   * Set section marker.
   *
   * @param {number} chapterId Chapter Id.
   * @param {number} sectionId Section Id.
   */
  setSectionMarker(chapterId, sectionId) {
    const icon = this.chapterNodes[chapterId]
      .querySelector('.h5p-interactive-book-navigation-section-' + sectionId + ' .h5p-interactive-book-navigation-section-icon');

    if (icon) {
      icon.classList.remove('icon-chapter-blank');
      icon.classList.add('icon-question-answered');
    }
  }

  /**
   * Create chapter.
   *
   * @param {object} chapter Chapter data.
   * @param {number} chapterId Chapter Id.
   * @return {HTMLElement} Chapter node.
   */
  getNodesFromChapter(chapter, chapterId) {
    const chapterNode = document.createElement('li');
    chapterNode.classList.add('h5p-interactive-book-navigation-chapter');

    // TODO: Clean this up. Will require to receive chapter info from parent instead of building itself
    const chapterCollapseIcon = document.createElement('div');
    chapterCollapseIcon.classList.add('h5p-interactive-book-navigation-chapter-accordion');

    const chapterTitleText = document.createElement('div');
    chapterTitleText.classList.add('h5p-interactive-book-navigation-chapter-title-text');
    chapterTitleText.innerHTML = chapter.title;
    chapterTitleText.setAttribute('title', chapter.title);

    const chapterCompletionIcon = document.createElement('div');
    if (this.behaviour.progressIndicators) {
      chapterCompletionIcon.classList.add('icon-chapter-blank');
      chapterCompletionIcon.classList.add('h5p-interactive-book-navigation-chapter-progress');
    }

    const chapterNodeTitle = document.createElement('button');
    chapterNodeTitle.setAttribute('tabindex', chapterId === 0 ? '0' : '-1');
    chapterNodeTitle.classList.add('h5p-interactive-book-navigation-chapter-button');
    if (this.parent.activeChapter !== chapterId) {
      chapterCollapseIcon.classList.add('icon-collapsed');
      chapterNodeTitle.setAttribute('aria-expanded', 'false');
    }
    else {
      chapterCollapseIcon.classList.add('icon-expanded');
      chapterNodeTitle.setAttribute('aria-expanded', 'true');
    }
    chapterNodeTitle.setAttribute('aria-controls', sectionsDivId);
    chapterNodeTitle.onclick = (event) => {
      const accordion = event.currentTarget.querySelector('.h5p-interactive-book-navigation-chapter-accordion');

      const isExpandable = !accordion.classList.contains('hidden');
      const isExpanded = event.currentTarget.getAttribute('aria-expanded') === 'true';

      // Open chapter in main content
      if (this.isOpenOnMobile() || !isExpandable || !isExpanded) {
        this.callbacks.onMoved({
          chapter: this.chapters[chapterId].getSubContentId(),
          section: 0
        });
      }

      // Expand chapter in menu
      if (isExpandable) {
        this.toggleChapter(event.currentTarget.parentElement);
        this.callbacks.onResize();
      }
    };
    chapterNodeTitle.appendChild(chapterCollapseIcon);
    chapterNodeTitle.appendChild(chapterTitleText);
    chapterNodeTitle.appendChild(chapterCompletionIcon);

    chapterNode.appendChild(chapterNodeTitle);

    // Collapse all but current chapters in menu and highlight current
    if (this.parent.activeChapter === chapterId) {
      chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-button').classList.add('h5p-interactive-book-navigation-current');
    }
    else {
      this.toggleChapter(chapterNode, true);
    }

    const sectionsWrapper = document.createElement('ul');
    sectionsWrapper.classList.add('h5p-interactive-book-navigation-sectionlist');
    const sectionsDivId = 'h5p-interactive-book-sectionlist-' + chapterId;
    sectionsWrapper.id = sectionsDivId;

    const sectionLinks = [];
    // Add sections to the chapter

    const chap = this.chapters[chapterId];
    const sections = chap.getSections();

    sections.forEach((section, sectionIndex) => {
      section.getContents().forEach(content => {

        if (!Util.isTask(content.getInstance())) {
          // Check text content for headers
          const semantics = content.getSemantics();

          if (semantics.library.split(' ')[0] === 'H5P.AdvancedText') {
            const text = document.createElement('div');
            text.innerHTML = semantics.params.text;
            const headers = text.querySelectorAll('h2, h3');
            for (let j = 0; j < headers.length; j++) {
              const sectionNode = this.buildContentLink({
                id: sectionIndex,
                chapter: chap,
                section: section,
                content: content,
                header: j,
                title: headers[j].textContent
              });

              sectionLinks.push(sectionNode);
              sectionsWrapper.appendChild(sectionNode);
            }
          }
        }
        else {
          const sectionNode = this.buildContentLink({
            id: sectionIndex,
            chapter: chap,
            section: section,
            content: content
          });          sectionLinks.push(sectionNode);
          sectionsWrapper.appendChild(sectionNode);
        }
      });
    });

    // Don't show collapse arrow if there are no sections or on mobile
    if (sectionLinks.length === 0) {
      const arrowIconElement = chapterNode.querySelector('.h5p-interactive-book-navigation-chapter-accordion');
      if (arrowIconElement) {
        arrowIconElement.classList.add('hidden');
      }
    }

    chapterNode.appendChild(sectionsWrapper);

    return chapterNode;
  }

  buildContentLink(params = {}) {
    if (typeof params.id !== 'number' || !params.chapter) {
      return null;
    }

    // label
    const labelText = params.title || params.content?.getTitle() || params.section?.getTitle();
    const label = document.createElement('div');
    label.classList.add('h5p-interactive-book-navigation-section-title');
    label.setAttribute('title', labelText);
    label.innerHTML = labelText;

    // link
    const link = document.createElement('button');
    link.classList.add('section-button');
    link.setAttribute('tabindex', '-1');
    link.appendChild(label);
    link.onclick = (event) => {
      event.preventDefault();

      this.callbacks.onMoved({
        chapter: params.chapter.getSubContentId(),
        section: params.section?.getSubContentId(),
        content: params.content?.getSubContentId(),
        ...(params.header !== undefined && { headerNumber: params.header })
      });
    };

    // item node
    const item = document.createElement('li');
    item.classList.add('h5p-interactive-book-navigation-section');
    item.classList.add('h5p-interactive-book-navigation-section-' + params.id);
    item.appendChild(link);

    return item;
  }

  /**
   * Get chapter elements.
   *
   * @return {HTMLElement[]} Chapter elements.
   */
  getChapterNodes() {
    return this.chapters.map((chapter, index) => this.getNodesFromChapter(chapter, index));
  }

  /**
   * Detect whether navigation is open on a small surface(pc or mobile).
   * @return {boolean} True, if navigation is open on mobile view.
   */
  isOpenOnMobile() {
    return this.parent.isMenuOpen() && this.parent.isSmallSurface();
  }

  /**
   * Add transform listener.
   */
  addTransformListener() {
    this.container.addEventListener('transitionend', (event) => {
      // propertyName is used trigger once, not for every property that has transitionend
      if (event.propertyName === 'flex-basis') {
        this.callbacke.onResize();
      }
    });
  }
}
export default SideBar;
