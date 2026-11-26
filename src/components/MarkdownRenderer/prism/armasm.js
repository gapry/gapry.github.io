export default function armasm(Prism) {
  Prism.languages[armasm.displayName] = {
    'asm-comment': /(?:\/\/|;).*/,
    'asm-string': /"(?:\\.|[^"\\\n])*"/,
    'asm-symbol': /<[^<>\n]+>/,
    'asm-immediate': {
      pattern: /#-?(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i,
      alias: 'ansi-red',
    },
    'asm-register': {
      pattern: /\b(?:[wx](?:[12]?\d|30|zr)|w?sp|[vqdshb](?:[12]?\d|3[01])(?:\.\d*[bhsdq])?)\b(?!:)/,
      alias: 'ansi-cyan',
    },
    'asm-address': {
      pattern: /(^|[^\w+\-.#])0x[\da-f]+\b/i,
      lookbehind: true,
      alias: 'ansi-yellow',
    },
  };
}

armasm.displayName = 'armasm-objdump';
armasm.aliases     = [];
