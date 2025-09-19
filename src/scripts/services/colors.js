import Color from 'color';
import '@styles/_color_overrides.scss';

/** @constant {number} CONTRAST_STEP_PERCENTAGE Steps in between contrasts as percent */
const CONTRAST_STEP_PERCENTAGE = 0.05;

/**
 * Color class.
 * @class
 */
export default class Colors {

  /**
   * @class
   */
  constructor() {
    // Relevant default colors defined in SCSS main class or derived from those
    this.colorBase = Colors.DEFAULT_COLOR_BASE;
    this.colorText = Colors.DEFAULT_COLOR_BG;
  }

  /**
   * Set new base color.
   * @param {string} color RGB color code in hex: #rrggbb.
   */
  setBase(color) {
    if (!color) {
      return;
    }

    this.colorBase = Color(color);

    // Get contrast color with highest contrast
    this.colorText = [
      Colors.DEFAULT_COLOR_BG,
      this.computeContrastColor(this.colorBase),
      this.computeContrastColor((this.colorBase), Colors.DEFAULT_COLOR_BG),
    ].map((color) => ({
      color: color,
      contrast: this.colorBase.contrast(color),
    })).reduce((result, current) => {
      return (current.contrast > result.contrast) ? current : result;
    }, { contrast: 0 }).color;
  }

  /**
   * Get color.
   * @param {Color} color Base color.
   * @param {object} [params] Parameters.
   * @param {number} [params.opacity] Opacity value assuming white background.
   * @returns {Color} Color with opacity figured in.
   */
  getColor(color, params = {}) {
    if (
      typeof params.opacity === 'string' &&
      /^([0-9]|[1-8][0-9]|9[0-9]|100)(\.\d+)?\s?%$/.test(params.opacity)
    ) {
       
      params.opacity = parseInt(params.opacity) / 100;
    }

    if (
      typeof params.opacity !== 'number' ||
      params.opacity < 0 ||
      params.opacity > 1
    ) {
      return color;
    }

    const rgbBackground = Color('#ffffff').rgb().array();

    return Color.rgb(
      color.rgb().array().map((value, index) => {
        return params.opacity * value + (1 - params.opacity) * rgbBackground[index];
      }),
    );
  }

  /**
   * Check whether color is default base color.
   * @param {string} color RGB color code in hex: #rrggbb.
   * @returns {boolean} True, if color is default base color, else false.
   */
  isBaseColor(color) {
    return Color(color).hex() === this.colorBase.hex();
  }

  /**
   * Compute contrast color to given color.
   * Tries to get contrast ratio of at least 4.5.
   * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-description
   * @param {Color} baseColor Color to compute contrast color for.
   * @param {Color} comparisonColor Color that the base color is compared to.
   * @returns {Color} Contrast color.
   */
  computeContrastColor(baseColor, comparisonColor) {
    comparisonColor = comparisonColor || baseColor;

    const luminance = comparisonColor.luminosity();

    let contrastColor;
    for (let diff = 0; diff <= 1; diff = diff + CONTRAST_STEP_PERCENTAGE) {
      contrastColor = Color.rgb(baseColor.rgb().array().map((value) => {
        // eslint-disable-next-line no-magic-numbers
        return value * ((luminance > 0.5) ? (1 - diff) : (1 + diff));
      }));

      const contrast = contrastColor.contrast(comparisonColor);
      if (contrast >= this.MINIMUM_ACCEPTABLE_CONTRAST) {
        break;
      }
    }

    return contrastColor;
  }

  /**
   * Get CSS override for content type.
   * @param {string} machineName content types machine name.
   * @returns {string} CSS override for content type.
   */
  getContentTypeCSS(machineName) {
    if (!this.COLOR_OVERRIDES[machineName]) {
      return '';
    }

    return this.COLOR_OVERRIDES[machineName].getCSS();
  }

  /**
   * Get CSS overrides.
   * Color values are set in SCSS including pseudo elements, so we need to
   * override CSS.
   * @returns {string} CSS overrides.
   */
  getCSS() {
    return `:root{
      --color-base: ${this.colorBase};
      --color-base-5: ${this.getColor(this.colorBase, { opacity: .05 })};
      --color-base-10: ${this.getColor(this.colorBase, { opacity: .1 })};
      --color-base-20: ${this.getColor(this.colorBase, { opacity: .2 })};
      --color-base-75: ${this.getColor(this.colorBase, { opacity: .75 })};
      --color-base-80: ${this.getColor(this.colorBase, { opacity: .80 })};
      --color-base-85: ${this.getColor(this.colorBase, { opacity: .85 })};
      --color-base-90: ${this.getColor(this.colorBase, { opacity: .9 })};
      --color-base-95: ${this.getColor(this.colorBase, { opacity: .95 })};
      --color-text: ${this.colorText};
      --color-contrast: ${this.computeContrastColor(this.colorBase, Colors.DEFAULT_COLOR_BG)};
    }`;
  }

  /**
   * Add custom CSS property.
   * @param {string} css CSS.
   */
  addCustomCSSProperty(css) {
    if (typeof css !== 'string') {
      return;
    }

    // Remove line breaks
    css = css.replace(/\n/g, '').replace(/\r/g, '');
    (css.match(/--.*?:.*?;/g) || []).forEach((match) => {
      const property = match.split(':')[0];
      const value = (match.split(':')[1].trim()).slice(0, -1);
      document.documentElement.style.setProperty(property, value);
    });
  }
}

/** @constant {string} Preferred default color as defined in SCSS */
Colors.DEFAULT_COLOR_BASE = Color('#1768c4');
Colors.DEFAULT_COLOR_BG = Color('#ffffff');

/**
 * Minimum acceptable contrast for normal font size, cmp. https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-procedure
 * @constant {number} MINIMUM_ACCEPTABLE_CONTRAST
 */
Colors.MINIMUM_ACCEPTABLE_CONTRAST = 4.5;


