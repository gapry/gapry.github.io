---
tags: AoCO2025, Compiler, x86
---

## Study Notes: Counting Bits, Advent of Compiler Optimisations 2025

These notes are based on the post [**Pop goes the...population count?**](https://xania.org/202512/11-pop-goes-the-weasel-er-count) and the YouTube video [**[AoCO 11/25] Counting Bits**](https://www.youtube.com/watch?v=Hu0vu1tpZnc&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=12) which are Day 11 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM toolchain` on `Ubuntu`.

Written by me and assisted by AI, proofread by me and assisted by AI. 

## Development Environment
```bash
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ clang --v
Ubuntu clang version 18.1.8 

$ gcc -v
gcc version 13.3.0 (Ubuntu 13.3.0-6ubuntu2~24.04.1)

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8
```

## Part 01

I compile the code with `-O2` only.

```bash
$ vim main.c
```

```c
#include <stdio.h>

int count_set_bits(unsigned int val) {
  unsigned int cnt = 0;

  while(val != 0) {
    cnt++;
    val &= val - 1;
  }
  return cnt;
}

int main(void) {
  unsigned int v = 10;
  unsigned int n = count_set_bits(v);
  printf("%d %d\n", v, n);
  return 0;
}
```

```bash
$ rm -f app.out && clang -O2 -o app.out main.c 
$ llvm-objdump -d --disassemble-symbols=count_set_bits --x86-asm-syntax=att app.out
```

```text
0000000000001140 <count_set_bits>:
    1140: 31 c0                         xorl    %eax, %eax
    1142: 85 ff                         testl   %edi, %edi
    1144: 74 15                         je      0x115b <count_set_bits+0x1b>
    1146: 66 2e 0f 1f 84 00 00 00 00 00 nopw    %cs:(%rax,%rax)
    1150: ff c0                         incl    %eax
    1152: 8d 4f ff                      leal    -0x1(%rdi), %ecx
    1155: 21 f9                         andl    %edi, %ecx
    1157: 89 cf                         movl    %ecx, %edi
    1159: 75 f5                         jne     0x1150 <count_set_bits+0x10>
    115b: c3                            retq
    115c: 0f 1f 40 00                   nopl    (%rax)
```

```bash
$ rm -f app.out && gcc -O2 -o app.out main.c
$ llvm-objdump -d --disassemble-symbols=count_set_bits --x86-asm-syntax=att app.out
```

```text
0000000000001180 <count_set_bits>:
    1180: f3 0f 1e fa                   endbr64
    1184: 31 c0                         xorl    %eax, %eax
    1186: 85 ff                         testl   %edi, %edi
    1188: 74 16                         je      0x11a0 <count_set_bits+0x20>
    118a: 66 0f 1f 44 00 00             nopw    (%rax,%rax)
    1190: 8d 57 ff                      leal    -0x1(%rdi), %edx
    1193: 83 c0 01                      addl    $0x1, %eax
    1196: 21 d7                         andl    %edx, %edi
    1198: 75 f6                         jne     0x1190 <count_set_bits+0x10>
    119a: c3                            retq
    119b: 0f 1f 44 00 00                nopl    (%rax,%rax)
    11a0: c3                            retq
```

As you can see, both `gcc` and `clang` at the `-O2` optimization level generate instructions for 
a loop with a conditional branch to implement bit counting.

## Part 02

I use `-O2` and `-mpopcnt` to optimize the code.

```bash
$ vim main.c
```

```c
#include <stdio.h>

int count_set_bits(unsigned int val) {
  unsigned int cnt = 0;

  while(val != 0) {
    cnt++;
    val &= val - 1;
  }
  return cnt;
}

int main(void) {
  unsigned int v = 10;
  unsigned int n = count_set_bits(v);
  printf("%d %d\n", v, n);
  return 0;
}
```

```bash
$ rm -f app.out && clang -O2 -mpopcnt -o app.out main.c
$ llvm-objdump -d --disassemble-symbols=count_set_bits --x86-asm-syntax=att app.out
```

```text
0000000000001140 <count_set_bits>:
    1140: f3 0f b8 c7                   popcntl %edi, %eax
    1144: c3                            retq
    1145: 66 66 2e 0f 1f 84 00 00 00 00 00      nopw    %cs:(%rax,%rax)
```

```bash
$ rm -f app.out && gcc -O2 -mpopcnt -o app.out main.c
$ llvm-objdump -d --disassemble-symbols=count_set_bits --x86-asm-syntax=att app.out
```

```text
0000000000001180 <count_set_bits>:
    1180: f3 0f 1e fa                   endbr64
    1184: 31 c0                         xorl    %eax, %eax
    1186: f3 0f b8 c7                   popcntl %edi, %eax
    118a: c3                            retq
```

As you can see, both `clang` and `gcc` can turn the entire loop into a single hardware instruction, 
eliminating the loop and branch entirely.

