'use strict';
/**
 * Forms a [Relative URL String](https://url.spec.whatwg.org/#relative-url-string)
 * string from a url's pathname to another url,
 * preserving the destination URL fragments,
 * and dropping the source fragments.
 * @link  RelativeURLString
 * @param {URL} fromURL
 * @param {URL} toURL
 * @returns {string}
 */
function relativeURLString(fromURL, toURL) {
  const toParts = toURL.pathname.split('/');
  const fromParts = fromURL.pathname.split('/');
  // gets to a directory
  // will drop trailing /
  // will drop trailing filename
  fromParts.pop();
  const minParts = Math.min(fromParts.length, toParts.length);
  let matching = 0;
  for (let i = 0; i < minParts; i++) {
    if (fromParts[i] === toParts[i]) {
      matching++;
    }
  }
  return `${[
    ...(
      fromParts.length === matching ?
        ['.'] :
        fromParts.map(() => '..')
    ),
    ...toParts.slice(matching),
  ].join('/')}${toURL.search}${toURL.hash}`;
}

module.exports = {
  relativeURLString,
};
