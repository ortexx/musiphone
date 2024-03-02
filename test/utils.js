import { assert } from "chai";
import crypto from 'crypto';
import utils from '../src/utils.js';

export default function () {
  describe('utils', () => {
    describe('.isSongTitle()', () => {
      it('should return true', () => {
        assert.isTrue(utils.isPlaylistTitle('title'));
      }); 
      
      it('should return false', () => {
        assert.isFalse(utils.isPlaylistTitle({}), 'check an object');
        assert.isFalse(utils.isPlaylistTitle(0), 'check an integer');
        assert.isFalse(utils.isPlaylistTitle(crypto.randomBytes(1025).toString()), 'check too long');
      });
    });
  });
}