/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
*/
import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {languageOptions: { globals: globals.node }},
  pluginJs.configs.recommended,
];