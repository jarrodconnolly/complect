/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */
export class PreprocessingTokenType {
  static none = new PreprocessingTokenType('none');
  static identifier = new PreprocessingTokenType('identifier');
  static number = new PreprocessingTokenType('number');
  static string = new PreprocessingTokenType('string');
  static whitespace = new PreprocessingTokenType('whitespace');
  static linefeed = new PreprocessingTokenType('linefeed');
  static operator = new PreprocessingTokenType('operator');
  static eof = new PreprocessingTokenType('eof');
  static unknown = new PreprocessingTokenType('unknown');

  constructor(name) {
    this.name = name;
  }

  toString() {
    return this.name;
  }
}
