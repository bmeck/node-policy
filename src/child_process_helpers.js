'use strict';
const { spawn } = require('child_process');
/**
 * @param {string} cmd 
 * @param {string[]} args 
 * @returns {Promise<[number, Buffer, Buffer]>}
 */
function asyncSpawn(cmd, args = []) {
  return new Promise(async (f, r) => {
    const child = spawn(cmd, args, {stdio: 'pipe'});
    child.on('error', r);
    f(Promise.all([
      new Promise((f, r) => {
        child.on('exit', (code) => {
          f(code);
        });
      }),
      new Promise(f => {
        const bufs = [];
        let len = 0;
        child.stdout.on('data', d => {
          bufs.push(d);
          len += d.byteLength;
        });
        child.stdout.on('end', () => {
          f(Buffer.concat(bufs, len));
        });
      }),
      new Promise(f => {
        const bufs = [];
        let len = 0;
        child.stderr.on('data', d => {
          bufs.push(d);
          len += d.byteLength;
        });
        child.stderr.on('end', () => {
          f(Buffer.concat(bufs, len));
        });
      }),
    ]));
  });
};
exports.asyncSpawn = asyncSpawn;
