import { REGISTER } from './x86asm.js';

const SIZE = /(?:byte|word|dword|qword|tbyte|xmmword|ymmword|zmmword)/.source;

const mnemonic = (names, alias) => ({
  pattern: RegExp(`(^[ \\t]+)(?:${names})\\b(?:[ \\t]+${SIZE}\\b)?`, 'm'),
  lookbehind: true,
  alias,
});

const byte = (value, alias) => ({
  pattern: RegExp(`(^(?:..)*?)${value}`),
  lookbehind: true,
  alias,
});

export default function radare2(Prism) {
  Prism.languages.radare2 = {
    'r2-flag': {
      pattern: /;-- [^;\n]*/,
      alias: 'ansi-cyan',
    },
    'r2-flow-back': {
      pattern: /┌─*>|└─*<|╎/,
      alias: 'ansi-blue',
    },
    'r2-flow': {
      pattern: /[┌└│─├┤┬┴┼]+[<>]?/,
      alias: 'ansi-cyan',
    },
    'r2-function': {
      pattern: /^ \d+: \S+ \(.*\);$/m,
      inside: {
        'r2-function-name': {
          pattern: /(: )\S+/,
          lookbehind: true,
          alias: 'ansi-red',
        },
      },
    },
    'r2-reloc': /; RELOC [^;\n]*/,
    'r2-section': /; \[\d+\] .*/,
    'r2-variable': {
      pattern: /; (?:arg|var) .*/,
      inside: {
        'r2-variable-type': {
          pattern: /((?:arg|var) )[^@\n]+/,
          lookbehind: true,
          alias: 'ansi-blue',
        },
        'r2-variable-address': {
          pattern: /@ .+/,
          alias: 'ansi-cyan',
        },
      },
    },
    'r2-comment-variable': {
      pattern: /; (?:arg|var)\w+[^;\n]*/,
      alias: 'ansi-blue',
    },
    'r2-comment': {
      pattern: /;.*/,
      alias: 'ansi-red',
    },
    'r2-offset': {
      pattern: /0x[\da-f]{8,16}(?=[ \t]{2,}[\da-f]{2})/,
      alias: 'ansi-green',
    },
    'r2-bytes': {
      pattern: /(^[ \t]+)(?:[\da-f]{2})+\.?(?=[ \t])/m,
      lookbehind: true,
      inside: {
        'r2-byte-zero': byte('00', 'ansi-green'),
        'r2-byte-max': byte('ff', 'ansi-red'),
        'r2-byte-delete': byte('7f', 'ansi-cyan'),
        'r2-byte-text': byte('(?:[2-6][\\da-f]|7[\\da-e])', 'ansi-yellow'),
      },
    },
    'r2-jump': {
      pattern: /(^[ \t]+)(?:j[a-z]{1,4}|call)\b[^;\n]*/m,
      lookbehind: true,
      alias: 'ansi-green',
    },
    'r2-return': mnemonic('ret', 'ansi-red'),
    'r2-nop': mnemonic('nop', 'ansi-blue'),
    'r2-stack': mnemonic('push|pop', 'ansi-magenta'),
    'r2-math': mnemonic('add|adc|sub|sbb|i?mul|i?div|inc|dec|neg|and|x?or|not|sh[lr]|sa[lr]|ro[lr]|rc[lr]|cmp|test|(?:add|sub|mul|div)[sp][sd]', 'ansi-yellow'),
    'r2-local': {
      pattern: /\b(?:var|arg)_\w+\b/,
      alias: 'ansi-blue',
    },
    'r2-flag-name': {
      pattern: /\b(?:reloc|sym|obj|str|loc|fcn|section|method)\.[\w.:]+/,
      alias: 'ansi-cyan',
    },
    'r2-register': {
      pattern: REGISTER,
      alias: 'ansi-cyan',
    },
    'r2-size': {
      pattern: RegExp(`(,[ \\t]*)${SIZE}\\b`),
      lookbehind: true,
      alias: 'ansi-cyan',
    },
    'r2-number': {
      pattern: /\b(?:0x[\da-f]+|\d+)\b/,
      alias: 'ansi-yellow',
    },
  };
}

radare2.displayName = 'radare2';
radare2.aliases     = [];
