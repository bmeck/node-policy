'use strict';
// Value of https://w3c.github.io/webappsec-subresource-integrity/#the-integrity-attribute
const { defineProperty, freeze, seal } = Object;

// Returns [{algorithm, value (in base64 string), options,}]
const WSP = '[\\x20\\x09]';
const VCHAR = '[\\x21-\\x7E]';
const HASH_ALGO = 'sha256|sha384|sha512';
// Base64
const HASH_VALUE = '[A-Za-z0-9+/]+[=]{0,2}';
const HASH_EXPRESSION = `(${HASH_ALGO})-(${HASH_VALUE})`;
const OPTION_EXPRESSION = `(${VCHAR}*)`;
const HASH_WITH_OPTIONS = `${HASH_EXPRESSION}(?:[?](${OPTION_EXPRESSION}))?`;
const SRI_PATTERN = new RegExp(`(${WSP}*)(?:${HASH_WITH_OPTIONS})`, 'g');
seal(SRI_PATTERN);
const ALL_WSP = new RegExp(`^${WSP}*$`);
seal(ALL_WSP);
const RegExp$exec = Function.call.bind(RegExp.prototype.exec);
const RegExp$test = Function.call.bind(RegExp.prototype.test);
const String$slice = Function.call.bind(String.prototype.slice);
const {
  Buffer: {
    from: Buffer_from
  }
} = require('buffer');
const parse = (str) => {
  SRI_PATTERN.lastIndex = 0;
  let prevIndex = 0;
  let match = RegExp$exec(SRI_PATTERN, str);
  const entries = [];
  while (match) {
    if (match.index !== prevIndex) {
      throw new SyntaxError(`${str} is not a valid integrity string`);
    }
    if (entries.length > 0) {
      if (match[1] === '') {
        throw new SyntaxError(`${str} is not a valid integrity string`);
      }
    }
    // Avoid setters being fired
    defineProperty(entries, entries.length, {
      enumerable: true,
      configurable: true,
      value: freeze({
        __proto__: null,
        algorithm: match[2],
        value: Buffer_from(match[3], 'base64'),
        options: match[4] === undefined ? null : match[4],
      })
    });
    prevIndex = prevIndex + match[0].length;
    match = RegExp$exec(SRI_PATTERN, str);
  }
  if (prevIndex !== str.length) {
    if (!RegExp$test(ALL_WSP, String$slice(str, prevIndex))) {
      throw new SyntaxError(`${str} is not a valid integrity string`);
    }
  }
  return entries;
};

module.exports = {
  parse,
};
