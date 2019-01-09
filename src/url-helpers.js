'use strict';
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
