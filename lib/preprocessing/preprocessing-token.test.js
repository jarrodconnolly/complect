/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * GNU General Public License v3.0 (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
*/
import { describe, it } from "node:test";
import assert from "node:assert";
import { PreprocessingToken } from './preprocessing-token.js';
import { PreprocessingTokenType } from './preprocessing-token-type.js';

describe('PreprocessingToken', () => {
  it('default token', () => {
    const token = new PreprocessingToken();
    assert.strictEqual(token.type, PreprocessingTokenType.none);
    assert.strictEqual(token.value, '');
    assert.strictEqual(token.toString(), 'none ');
  });

  it('identifier', () => {
    const token = new PreprocessingToken();
    token.type = PreprocessingTokenType.identifier;
    token.append('t');
    token.append('e');
    token.append('s');
    token.append('t');

    assert.strictEqual(token.type, PreprocessingTokenType.identifier);
    assert.strictEqual(token.value, 'test');
    assert.strictEqual(token.toString(), 'identifier test');
  });
});