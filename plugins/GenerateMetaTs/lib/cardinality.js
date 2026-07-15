/*globals define*/
/*eslint-env node, browser*/
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GenerateMetaTsCardinality = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function cardinalityFromMinMax(min, max) {
    var lo = min === undefined || min === null ? -1 : min;
    var hi = max === undefined || max === null ? -1 : max;

    if (lo === -1 && hi === -1) return undefined;
    if (lo === 0 && hi === -1) return "*";
    if (lo === 1 && hi === -1) return "+";
    if ((lo === 0 || lo === -1) && hi === 1) return "0..1";
    if (lo >= 0 && hi >= 0 && lo === hi) return String(lo);
    if (lo >= 0 && hi >= 0 && lo <= hi) return lo + ".." + hi;
    if (lo === -1 && hi >= 0) return "0.." + hi;
    return undefined;
  }

  return { cardinalityFromMinMax: cardinalityFromMinMax };
});
