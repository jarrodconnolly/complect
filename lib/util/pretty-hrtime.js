/* Complect - Compiler for the Complect programming language
 *
 * Copyright © 2024 Jarrod Connolly
 * MIT License
 */
const units = [
  { name: 'ns', factor: 1n },
  { name: 'us', factor: 1000n },
  { name: 'ms', factor: 1000000n },
  { name: 'sec', factor: 1000000000n },
  { name: 'min', factor: 60000000000n },
  { name: 'hr', factor: 3600000000000n },
];

export function pretty(time) {
  for (let i = 0; i < units.length; i++) {
    const { name, factor } = units[i],
      scaledTime = time / factor;
    const maxVal = units[i + 1] && units[i + 1].factor / factor;
    const roundedTime = Number(scaledTime);
    // if time in cur unit is large enough to be the next unit, continue
    if (!maxVal || Math.abs(roundedTime) < maxVal) {
      return scaledTime.toString() + name;
    }
  }
}
