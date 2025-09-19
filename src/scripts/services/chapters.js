import SinglePlaceholder from '@components/single-placeholder/single-placeholder.js';
import Chapter from '@models/chapter.js';

export default class Chapters {

  /**
   * @class
   */
  constructor() {
    this.chapters = [];
  }

  /**
   * Fill chapters with chapters.
   * @param {object} params Parameters.
   * @param {number} contentId ContentId.
   * @param {object} [extras] Extras.
   */
  fill(params = [], contentId, extras = {}) {
    this.chapters = this.build(
      this.sanitize(params),
      contentId,
      extras,
    );
  }

  /**
   * Convenience function to retrieve chapters.
   * Parameter undefined: all chapters.
   * Parameter number: get by index.
   * Parameter string: get by subContentId.
   * @param {undefined|string|number} param Parameter.
   * @returns {Chapter|Chapter[]} Chapter|this.
   */
  get(param) {
    if (typeof param === 'number') {
      return this.getByIndex(param);
    }
    else if (typeof param === 'string') {
      return this.getBySubcontentId(param);
    }
    else if (!param) {
      return this.getAll();
    }
    else {
      return null;
    }
  }

  /**
   * Get all chapters.
   * @returns {Chapter[]} this.
   */
  getAll() {
    return this.chapters || [];
  }

  /**
   * Get chapter by index.
   * @param {number} index Chapter index.
   * @returns {Chapter} Chapter.
   */
  getByIndex(index) {
    const length = this.chapters?.length;

    if (!length || index < 0 || index > length - 1) {
      return {}; // Nothing to offer
    }

    return this.chapters[index] || {};
  }

  /**
   * Get chapter by subContentId.
   * @param {string} subContentId SubContentId.
   * @returns {Chapter} Chapter.
   */
  getBySubcontentId(subContentId) {
    if (typeof subContentId !== 'string') {
      return {};
    }

    return this.chapters.find((chapter) => {
      return chapter.instance?.subContentId === subContentId;
    }) || {};
  }

  /**
   * Find content by subContentId.
   * @param {string} subContentId SubContentId.
   * @returns {object|null} Content element.
   */
  findContent(subContentId) {
    let content = null;

    this.get().forEach((chapter) => {
      if (content) {
        return; // Already found;
      }

      chapter.getInstance().getInstances().forEach((placeholder) => {
        if (content) {
          return; // already found
        }

        content = placeholder?.findField(subContentId) || null;
      });
    });

    return content;
  }

  /**
   * Find chapter index.
   * @param {string} subContentId Chapter subContentId.
   * @returns {number|null} Chapter index.
   */
  findChapterIndex(subContentId) {
    let position = null;

    this.get().forEach((chapter, index) => {
      if (position !== null) {
        return; // Already found
      }

      position = (chapter.getInstance().subContentId === subContentId) ?
        index :
        null;
    });

    return position;
  }

  /**
   * Set header.
   * @param {SinglePlaceholder} header Header.
   */
  setHeader(header) {
    this.header = header;
  }

  /**
   * Get header.
   * @returns {SinglePlaceholder} Header.
   */
  getHeader() {
    return this.header;
  }

  /**
   * Set footer.
   * @param {SinglePlaceholder} footer Footer.
   */
  setFooter(footer) {
    this.footer = footer;
  }

  /**
   * Get footer.
   * @returns {SinglePlaceholder} Footer.
   */
  getFooter() {
    return this.footer;
  }

  /**
   * Sanitize parameters.
   * @param {object[]} params Semantics parameters for chapters.
   * @returns {object} Sanitized parameters for chapters.
   */
  sanitize(params = []) {

    // Filter out invalid chapters
    params = params.filter((chapter) => {
      const validHierarchy = (new RegExp('^[1-9][0-9]*(-[1-9][0-9]*)*$'))
        .test(chapter.chapterHierarchy);

      return validHierarchy;
    });

    // Determine hierarchy depth
    const hierarchyDepth = params.reduce((length, chapter) => {
      return Math.max(length, chapter.chapterHierarchy.split('-').length);
    }, 1);

    // Sort by chapter hierarchy
    params = params.sort((chapterA, chapterB) => {
      // Fill hierarchy up with 0s for comparison
      const levelsA = chapterA.chapterHierarchy.split('-');
      while (levelsA.length < hierarchyDepth) {
        levelsA.push(0);
      }
      const levelsB = chapterB.chapterHierarchy.split('-');
      while (levelsB.length < hierarchyDepth) {
        levelsB.push(0);
      }

      // Compare level by level
      let result = 0;
      for (let i = 0; i < levelsA.length; i++) {
        if (parseInt(levelsA[i]) < parseInt(levelsB[i])) {
          result = -1;
          break;
        }
        else if (parseInt(levelsA[i]) > parseInt(levelsB[i])) {
          result = 1;
          break;
        }
      }

      return result;
    });

    // Add dummy chapter.
    if (!params.length) {
      params = [{
        id: 0,
        chapterHierarchy: '1',
        content: {},
      }];
    }

    return params;
  }

  /**
   * Build chapters.
   * @param {object[]} params Semantics parameters for chapters.
   * @param {number} contentId Content id.
   * @param {object} [extras] Extras.
   * @returns {Chapter[]} Sanitized parameters for chapters.
   */
  build(params = [], contentId, extras = {}) {
    return params.map((chapter, index) => {
      const newChapter = new Chapter({
        id: index,
        hierarchy: chapter.chapterHierarchy,
        header: this.header,
        footer: this.footer,
        content: chapter.content,
        contentId: contentId,
        displayHotspotNavigation: chapter.displayHotspotNavigation || false,
        displayHeader: chapter.displayHeader && this.header || false,
        displayFooter: chapter.displayFooter && this.footer || false,
        ...(chapter.providesHotspot && {
          hotspotNavigation: chapter.hotspotNavigation,
        }),
        previousState: Array.isArray(extras.previousState) ?
          extras.previousState[index] :
          {},
      });

      return newChapter;
    });
  }
}
