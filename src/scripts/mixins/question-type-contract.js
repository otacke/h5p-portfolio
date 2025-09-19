import Util from '@services/util';

/**
 * Mixin containing methods for H5P Question Type contract.
 */
export default class QuestionTypeContract {
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
      if (!chapter.isInitialized()) {
        return;
      }

      if (typeof chapter.instance.resetTask === 'function') {
        chapter.instance.resetTask();
      }
    });

    // Clean up previous state to avoid fallback in getCurrentState()
    for (const state in this.previousState) {
      delete this.previousState[state];
    }

    this.moveTo({
      h5pPortfolioId: this.contentId,
      h5pPortfolioChapter: this.chapters.get(0).getSubContentId(),
      h5pPortfolioToTop: true,
    });

    // Remove all portfolio query parameters
    this.changeURL();

    if (this.hasCover()) {
      this.displayCover(this.$mainWrapper);
    }

    this.isAnswerUpdated = false;

    // Force reset activity start time
    this.setActivityStarted(true);
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
      this.getScore() === this.getMaxScore(),
    );

    return {
      statement: xAPIEvent.data.statement,
      children: this.getXAPIDataFromChildren(
        this.chapters.get().map((chapter) => chapter.instance),
      ),
    };
  }

  /**
   * Answer call to return the current state.
   * @returns {object|undefined} Current state.
   */
  getCurrentState() {
    const chapterStates = this.chapters.getAll().map((chapter) => {
      return chapter?.instance?.getCurrentState() || {};
    });

    const isEmpty = H5P.isEmpty ?? Util.isEmpty;
    if (isEmpty(chapterStates)) {
      return;
    }

    return {
      chapterStates: this.chapters.getAll().map((chapter) => {
        return chapter?.instance?.getCurrentState() || {};
      }),
      currentChapterId: this.currentChapterId,
    };
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
      value: (this.currentChapterId + 1),
    };
  }
}
