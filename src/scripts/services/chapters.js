import Chapter from './../models/chapter';

export default class Chapters {

  /**
   * Fill chapters with chapters.
   * @param {object} chapters Chapters.
   */
  static fill(params = [], contentId, extras = {}) {
    Chapters.chapters = Chapters.build(
      Chapters.sanitize(params),
      contentId,
      extras
    );
  }

  /**
   * Convenience function to retrieve chapters.
   * Parameter undefined: all chapters.
   * Parameter number: get by index.
   * Parameter string: get by subContentId.
   * @param {undefined|string|number} param Parameter.
   * @return {Chapter|Chapter[]} Chapter|Chapters.
   */
  static get(param) {
    if (typeof param === 'number') {
      return Chapters.getByIndex(param);
    }
    else if (typeof param === 'string') {
      return Chapters.getBySubcontentId(param);
    }
    else if (!param) {
      return Chapters.getAll();
    }
    else {
      return null;
    }
  }

  /**
   * Get all chapters.
   * @return {Chapter[]} Chapters.
   */
  static getAll() {
    return Chapters.chapters || [];
  }

  /**
   * Get chapter by index.
   * @param {number} index Chapter index.
   * @return {Chapter} Chapter.
   */
  static getByIndex(index) {
    const length = Chapters.chapters?.length;

    if (!length || index < 0 || index > length - 1) {
      return {}; // Nothing to offer
    }

    return Chapters.chapters[index] || {};
  }

  /**
   * Get chapter by subContentId.
   * @param {string} subContentId SubContentId.
   * @return {Chapter} Chapter.
   */
  static getBySubcontentId(subContentId) {
    if (typeof subContentId !== 'string') {
      return {};
    }

    return Chapters.chapters.find(chapter => {
      return chapter.instance?.subContentId === subContentId;
    }) || {};
  }

  /**
   * Find content by subContentId.
   * @param {string} subContentId SubContentId.
   * @return {object|null} Content element.
   */
  static findContent(subContentId) {
    let content = null;

    Chapters.get().forEach(chapter => {
      if (content) {
        return; // Already found;
      }

      chapter.getInstance().getInstances().forEach(placeholder => {
        if (content) {
          return; // already found
        }

        content = placeholder.findField(subContentId);
      });
    });

    return content;
  }

  /**
   * Find chapter index.
   * @param {string} subContentId Chapter subContentId.
   * @return {number|null} Chapter index.
   */
  static findChapterIndex(subContentId) {
    let position = null;

    Chapters.get().forEach((chapter, index) => {
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
   * Sanitize parameters.
   * @param {object[]} params Semantics parameters for chapters.
   * @return {object} Sanitized parameters for chapters.
   */
  static sanitize(params = []) {

    // Filter out invalid chapters
    params = params.filter(chapter => {
      const validHierarchy = (new RegExp('^[1-9][0-9]*(-[1-9][0-9]*)*$'))
        .test(chapter.chapterHierarchy);

      const hasPlaceholder = chapter?.content?.params?.contents?.length > 0;

      return validHierarchy && hasPlaceholder;
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
        if (levelsA[i] < levelsB[i]) {
          result = -1;
          break;
        }
        else if (levelsA[i] > levelsB[i]) {
          result = 1;
          break;
        }
      }

      return result;
    });

    // Add dummy chapter. TODO: parameters for Advanced Text
    if (!params.length) {
      params = [{
        id: 0,
        chapterHierarchy: '1',
        content: {}
      }];
    }

    return params;
  }

  /**
   * Build chapters.
   * @param {object[]} params Semantics parameters for chapters.
   * @return {Chapter[]} Sanitized parameters for chapters.
   */
  static build(params = [], contentId, extras = {}) {
    return params.map((chapter, index) => {
      const newChapter = new Chapter({
        id: index,
        hierarchy: chapter.chapterHierarchy,
        content: chapter.content,
        contentId: contentId,
        displayHotspotNavigation: chapter.displayHotspotNavigation || false,
        ...(chapter.providesHotspot && {hotspotNavigation: chapter.hotspotNavigation}),
        previousState: Array.isArray(extras.previousState.chapters) ?
          this.previousState.chapters[index] :
          {}
      });

      return newChapter;
    });
  }
}

Chapters.chapters = [];
