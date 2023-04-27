import Util from '@services/util';
import Chapters from '@services/chapters';
import Chapter from '@models/chapter';
import Title from '@components/sidebar/title';
import MenuChapterItem from '@components/sidebar/menuchapteritem';
import '@styles/_navigationbar.scss';

/**
 * @class
 * @param {object} params Parameters.
 * @param {object} callbacks Callbacks.
 */
class SideBar extends H5P.EventDispatcher {
  constructor(params = {}, callbacks = {}) {
    super();

    this.callbacks = Util.extend({
      onMoved: (() => {}),
      onResized: (() => {})
    }, callbacks);

    this.container = document.createElement('div');
    this.container.classList.add('h5p-portfolio-navigation');
    if (params.mainTitle) {
      const title = new Title({ titleText: params.mainTitle });
      this.container.appendChild(title.getDOM());
    }

    this.content = document.createElement('ul');
    this.content.classList.add('navigation-list');

    // List of all hierarchy keys including content items
    this.hierarchyKeys = this.buildHierarchyKeys();

    /*
     * Using an array here that directly mirrors the structure on page
     * Could as well have been a tree structure, but it didn't feel necessary
     * here.
     */
    this.menuItems = this.buildMenuItems();
    this.menuItems.forEach((item) => {
      this.content.appendChild(item.instance.getDOM());
    });

    this.container.appendChild(this.content);

    // Show top level entries only
    this.menuItems.forEach((item) => {
      if (
        item.hierarchy.split('-').length === 1 &&
        item.hierarchy.indexOf(':') === -1
      ) {
        item.instance.show();
      }
    });
  }

  /**
   * Build menu items.
   * @returns {object[]} Menu items.
   */
  buildMenuItems() {
    const menuItems = [];

    Chapters.get().forEach((chapter) => {
      const hierarchy = chapter.getHierarchy();

      // MenuChapterItem parameters for chapter
      const chapterMenuItem = {
        title: chapter.getTitle(),
        hierarchy: hierarchy,
        isExpandable: this.hasChildren(hierarchy),
        target: {
          chapter: chapter.getSubContentId(),
          toTop: true
        }
      };

      // MenuChapterItem parameters for contents
      const contentMenuItems = this.extractContentItemTargets(chapter).map((target, index, all) => {
        const hierarchy = `${chapter.getHierarchy()}:${index}`;

        let className;
        if (index === 0) {
          className = 'h5p-portfolio-navigation-chapter-first';
        }
        else if (index === all.length - 1) {
          className = 'h5p-portfolio-navigation-chapter-last';
        }

        return {
          title: target.title,
          className: className,
          hierarchy: hierarchy,
          target: {
            chapter: target.chapter,
            section: target.section,
            content: target.content,
            header: target.header
          }
        };
      });

      /*
       * Build one menu item for each parameter
       * One could also have some "content" subcontent attached to
       * a chapter, but the structure felt easier this way.
       */
      [chapterMenuItem, ...contentMenuItems].forEach((param) => {
        const menuItem = new MenuChapterItem(
          param,
          {
            onClicked: ((params) => {
              this.handleClicked(params);
            }),
            onKeyUp: ((params) => {
              this.handleKeyNavigated(params, -1);
            }),
            onKeyDown: ((params) => {
              this.handleKeyNavigated(params, 1);
            })
          });

        menuItems.push({
          hierarchy: param.hierarchy,
          instance: menuItem
        });
      });
    });

    return menuItems;
  }

  /**
   * Extract targets of chapter content items.
   * @param {Chapter} chapter Chapter.
   * @returns {object[]} Targets of chapter content items.
   */
  extractContentItemTargets(chapter) {
    /*
     * Build target information for all task like instances and AdvancedText
     * headers of level 2 and 3.
     */
    return chapter.getSections().reduce((sectionItems, currentSection) => {
      const newSectionItems = currentSection.getContents()
        .reduce((contentItems, currentContent) => {
          const instance = currentContent.getInstance();

          let linkInfo = [];

          if (Util.isTask(instance)) {
            linkInfo = [{
              title: currentContent.getTitle(),
              chapter: chapter.getSubContentId(),
              section: currentSection.getSubContentId(),
              content: currentContent.getSubContentId()
            }];
          }
          else if (instance.libraryInfo?.machineName === 'H5P.AdvancedText') {
            const text = document.createElement('div');
            text.innerHTML = currentContent.getSemantics().params.text;
            linkInfo = Array.from(text.querySelectorAll('h2, h3'))
              .map((header, index) => {
                return {
                  title: header.textContent,
                  chapter: chapter.getSubContentId(),
                  section: currentSection.getSubContentId(),
                  content: currentContent.getSubContentId(),
                  header: index
                };
              });
          }

          return [...contentItems, ...linkInfo];
        }, []);

      return [...sectionItems, ...newSectionItems];
    }, []);
  }

  /**
   * Build list of all hierarchies.
   * @returns {string[]} List of all hierarchies.
   */
  buildHierarchyKeys() {
    return Chapters.get().reduce((all, chapter) => {
      const chapterHierarchy = chapter.getHierarchy();

      const chapterHierarchies = this.extractContentItemTargets(chapter)
        .reduce((hierarchies, target, index) => {
          return [...hierarchies, `${chapterHierarchy}:${index}`];
        }, [chapterHierarchy]);

      return [...all, ...chapterHierarchies];
    }, []);
  }

  /**
   * Determine whether a child is really the child of a parent.
   * @param {string} child Hierarchy to check for being child.
   * @param {string} parent Hierarchy to check for being parent.
   * @param {object} [params={}] Extra parameters.
   * @param {boolean} [params.directChild] If true, grandchildren... not child.
   * @returns {boolean} True, if (direct) child, else false.
   */
  isChild(child, parent, params = {}) {
    if (parent === child) {
      return false;
    }

    if (params.directChild) {
      if (child.indexOf(':') !== -1 && child.indexOf(`${parent}:`) !== 0) {
        return false; // Not a direct child content
      }
      if (
        child.indexOf(':') === -1 &&
        child.split('-').length !== parent.split('-').length + 1
      ) {
        return false; // Not a direct child chapter
      }
    }

    return (
      child.indexOf(parent) === 0 &&
      (child[parent.length] === '-' || child[parent.length] === ':')
    );
  }

  /**
   * Determine whether a hierarchy has children.
   * @param {object} hierarchy Hierarchy.
   * @returns {boolean} True if hierarchy has children.
   */
  hasChildren(hierarchy) {
    return this.hierarchyKeys.some((key) => this.isChild(key, hierarchy));
  }

  /**
   * Show hierarchy item including parents and direct children.
   * @param {string} hierarchy Hierarchy.
   */
  show(hierarchy) {
    this.menuItems.forEach((item) => {
      if (!item.instance.isHidden()) {
        return; // Already shown
      }

      if (hierarchy === item.hierarchy) {
        item.instance.show();
        return;
      }

      // Show all parents
      if (
        this.isChild(hierarchy, item.hierarchy)
      ) {
        item.instance.expand();
        this.show(item.hierarchy);
      }

      // Show direct children
      if (this.isChild(item.hierarchy, hierarchy, { directChild: true })) {
        item.instance.show();
      }
    });
  }

  /**
   * Hide all children of hierarchy item.
   * @param {string} hierarchy Hierarchy.
   */
  hideChildren(hierarchy) {
    this.menuItems.forEach((item) => {
      if (item.instance.isHidden()) {
        return; // Already hidden
      }

      if (this.isChild(item.hierarchy, hierarchy)) {
        item.instance.hide();
      }
    });
  }

  /**
   * Set currente item.
   * @param {string} hierarchy Hierarchy.
   * @param {params} [params={}] Parameters.
   * @param {boolean} [params.toggleSelected] If true, may collapse item.
   */
  setCurrentItem(hierarchy, params = {}) {
    this.menuItems.forEach((item) => {
      const instance = item.instance;

      if (item.hierarchy === hierarchy) {
        instance.makeTabbable();

        // Do not care about content items
        if (hierarchy.indexOf(':') === -1) {
          instance.activate();

          // Toggle expanded state
          if (params.toggleSelected && instance.isExpanded()) {
            instance.collapse();
            this.hideChildren(item.hierarchy);
          }
          else {
            instance.expand();
            this.show(item.hierarchy);
          }
        }
      }
      else {
        instance.makeUntabbable();

        // Collapse and hide everything that's not a child of clicked menu item
        if (!this.isChild(hierarchy, item.hierarchy)) {
          instance.collapse();
          this.hideChildren(item.hierarchy);
        }

        /*
         * If current menu item is direct parent of clicked content item,
         * activate current menu item
         */
        if (
          hierarchy.indexOf(':') !== -1 &&
          this.isChild(hierarchy, item.hierarchy, { directChild: true })
        ) {
          instance.activate();
        }
        else {
          instance.deactivate();
        }
      }
    });
  }

  /**
   * Handle click on menu item.
   * @param {object} params Parameters.
   */
  handleClicked(params) {
    // Set current item
    this.setCurrentItem(params.hierarchy, { toggleSelected: true });

    // Trigger moving to target
    if (params.target) {
      this.callbacks.onMoved(params.target);
    }
  }

  /**
   * Handle navigated with key.
   * @param {object} params Parameters.
   * @param {string} params.hierarchy Current hierarchy.
   * @param {number} diff -1 for up, 1 for down.
   */
  handleKeyNavigated(params, diff) {
    const index = this.menuItems.findIndex((item) => {
      return item.hierarchy === params.hierarchy;
    });

    // Loop over next/previous item until visible one found
    let currentIndex = index;
    let found = null;
    do {
      if (diff === 1 && currentIndex === this.menuItems.length - 1) {
        currentIndex = 0;
      }
      else if (diff === -1 && currentIndex === 0) {
        currentIndex = this.menuItems.length - 1;
      }
      else {
        currentIndex = currentIndex + diff;
      }

      if (
        !this.menuItems[currentIndex].instance.isHidden() ||
        currentIndex === index // Only item
      ) {
        found = this.menuItems[currentIndex];
      }
    } while (!found);

    // Make new item current one.
    if (currentIndex !== index) {
      this.menuItems[index].instance.makeUntabbable();
      found.instance.makeTabbable();
      found.instance.focus();
    }
  }
}
export default SideBar;
