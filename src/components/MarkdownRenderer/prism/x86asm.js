const NUMBER   = /(?:0x[\da-f]+|\d+)/.source;
export const REGISTER = /\bst\(\d\)|\b(?:[re]?(?:[abcd]x|[sd]i|[sb]p|ip)|[abcd][lh]|(?:[sd]i|[sb]p)l|r(?:[89]|1[0-5])[dwb]?|[c-gs]s|[xyz]mm(?:[12]?\d|3[01])|mm[0-7]|st|k[0-7]|[cd]r\d{1,2})\b/;

export default function x86asm(Prism) {
  Prism.languages.x86asm = {
    'asm-comment': /[#;].*/,
    'asm-string': /"(?:\\.|[^"\\\n])*"/,
    'asm-register-stack': {
      pattern: /%st\(\d\)/,
      alias: ['asm-register', 'ansi-cyan'],
    },
    'asm-prefix': /^[ \t]*[\da-f]+:(?:[ \t]+[\da-f]{2}(?=\s|$))+|^[\da-f]{8,16}(?=[ \t]+<)/m,
    'asm-symbol': /<[^<>\n]+>/,
    'asm-memory': [
      {
        pattern: RegExp(`(?:%\\w+:)?(?:-?${NUMBER}|[a-z_.][\\w.@+-]*)?\\([%,][^()\\n]*\\)`, 'i'),
        alias: 'ansi-green',
        inside: {
          'asm-register': {
            pattern: /%\w+/,
            alias: 'ansi-cyan',
          },
          'asm-immediate': {
            pattern: /(,)\d+(?=\))/,
            lookbehind: true,
            alias: 'ansi-red',
          },
        },
      },
      {
        pattern: /\[[^[\]\n]*\]/,
        alias: 'ansi-green',
        inside: {
          'asm-register': {
            pattern: REGISTER,
            alias: 'ansi-cyan',
          },
          'asm-immediate': {
            pattern: RegExp(`\\b${NUMBER}\\b(?!\\*)`, 'i'),
            alias: 'ansi-red',
          },
        },
      },
    ],
    'asm-address': {
      pattern: RegExp(`(\\b(?:j[a-z]{1,4}|call[a-z]?|loop[a-z]{0,2})[ \\t]+)${NUMBER}\\b`, 'i'),
      lookbehind: true,
      alias: 'ansi-yellow',
    },
    'asm-immediate': [
      {
        pattern: RegExp(`\\$-?${NUMBER}`, 'i'),
        alias: 'ansi-red',
      },
      {
        pattern: RegExp(`(^|[\\s,])-?${NUMBER}\\b(?![:\\w])`, 'i'),
        lookbehind: true,
        alias: 'ansi-red',
      },
    ],
    'asm-register': [
      {
        pattern: /%\w+/,
        alias: 'ansi-cyan',
      },
      {
        pattern: REGISTER,
        alias: 'ansi-cyan',
      },
    ],
  };
}

x86asm.displayName = 'x86asm';
x86asm.aliases     = [];
