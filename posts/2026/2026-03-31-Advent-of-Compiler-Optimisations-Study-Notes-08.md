---
tags: AoCO2025, Compiler, x86
---

## Study Notes: Going loopy, Advent of Compiler Optimisations 2025

These notes are based on the post [**Going loopy**](https://xania.org/202512/08-going-loopy) and the YouTube video [**[AoCO 8/25] Simple Loops (aka birth of Compiler Explorer)**](https://www.youtube.com/watch?v=FB8Hgj3TpJM&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=9) which are Day 8 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM` toolchain on `Ubuntu`.

Written by me and assisted by AI, proofread by me and assisted by AI. 

#### Development Environment
```bash
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ g++ --version
g++ (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0

$ clang++ --version
Ubuntu clang version 18.1.8

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8

$ llvm-mca --version
Ubuntu LLVM version 18.1.8
```

## Introduction

In this post, we will analyze two cases: the Index-Based For-Loop and the Range-Base For-Loop.
We will use `g++` and `clang++` to compile the same code, then utilize `llvm-objdump` and 
`llvm-mca` to analyze their differences. Finally, we will compare their benchmark results.

## Case 01： Index-Based For-Loop

We use `__asm__` markers **[1]** to define a specific code region for `llvm-mca`,
allowing us to analyze the benchmark.

```bash
$ cat sum1.cpp
```

```cpp
#include <vector>

int sum1(const std::vector<int>& xs) {
  int total{};
  __asm__ volatile("# LLVM-MCA-BEGIN MyLoop");
  for(std::size_t i = 0; i < xs.size(); ++i) {
    total += xs[i];
  }
  __asm__ volatile("# LLVM-MCA-END");
  return total;
}
```

#### Use g++ to compile

```bash
$ g++ -O2 -c sum1.cpp
$ llvm-objdump -d --disassemble-symbols=$(nm sum1.o | awk '/sum1/ {print $3}') --x86-asm-syntax=att sum1.o
```

```x86asm
sum1.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <_Z4sum1RKSt6vectorIiSaIiEE>:
       0: f3 0f 1e fa                   endbr64
       4: 48 8b 47 08                   movq    0x8(%rdi), %rax
       8: 48 8b 0f                      movq    (%rdi), %rcx
       b: 48 89 c6                      movq    %rax, %rsi
       e: 48 29 ce                      subq    %rcx, %rsi
      11: 48 c1 fe 02                   sarq    $0x2, %rsi
      15: 48 39 c8                      cmpq    %rcx, %rax
      18: 74 16                         je      0x30 <_Z4sum1RKSt6vectorIiSaIiEE+0x30>
      1a: 31 c0                         xorl    %eax, %eax
      1c: 31 d2                         xorl    %edx, %edx
      1e: 66 90                         nop
      20: 03 14 81                      addl    (%rcx,%rax,4), %edx
      23: 48 83 c0 01                   addq    $0x1, %rax
      27: 48 39 f0                      cmpq    %rsi, %rax
      2a: 72 f4                         jb      0x20 <_Z4sum1RKSt6vectorIiSaIiEE+0x20>
      2c: 89 d0                         movl    %edx, %eax
      2e: c3                            retq
      2f: 90                            nop
      30: 31 d2                         xorl    %edx, %edx
      32: eb f8                         jmp     0x2c <_Z4sum1RKSt6vectorIiSaIiEE+0x2c>
```

```bash
$ g++ -O2 -S sum1.cpp -o sum1.s
$ llvm-mca -march=x86-64 -mcpu=x86-64 -timeline sum1.s
```

```bash
[0] Code Region - MyLoop

Iterations:        100
Instructions:      1300
Total Cycles:      362
Total uOps:        1400

Dispatch Width:    4
uOps Per Cycle:    3.87
IPC:               3.59
Block RThroughput: 3.5
```

#### Use clang++ to compile

```bash
$ clang++ -O2 -c sum1.cpp
$ llvm-objdump -d --disassemble-symbols=$(nm sum1.o | awk '/sum1/ {print $3}') --x86-asm-syntax=att sum1.o
```

```x86asm
sum1.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <_Z4sum1RKSt6vectorIiSaIiEE>:
       0: 48 8b 0f                      movq    (%rdi), %rcx
       3: 48 8b 47 08                   movq    0x8(%rdi), %rax
       7: 48 29 c8                      subq    %rcx, %rax
       a: 74 1b                         je      0x27 <_Z4sum1RKSt6vectorIiSaIiEE+0x27>
       c: 48 c1 f8 02                   sarq    $0x2, %rax
      10: 48 83 f8 01                   cmpq    $0x1, %rax
      14: 48 89 c2                      movq    %rax, %rdx
      17: 48 83 d2 00                   adcq    $0x0, %rdx
      1b: 48 83 f8 08                   cmpq    $0x8, %rax
      1f: 73 0a                         jae     0x2b <_Z4sum1RKSt6vectorIiSaIiEE+0x2b>
      21: 31 f6                         xorl    %esi, %esi
      23: 31 c0                         xorl    %eax, %eax
      25: eb 52                         jmp     0x79 <_Z4sum1RKSt6vectorIiSaIiEE+0x79>
      27: 31 c0                         xorl    %eax, %eax
      29: eb 4d                         jmp     0x78 <_Z4sum1RKSt6vectorIiSaIiEE+0x78>
      2b: 48 89 d6                      movq    %rdx, %rsi
      2e: 48 83 e6 f8                   andq    $-0x8, %rsi
      32: 66 0f ef c0                   pxor    %xmm0, %xmm0
      36: 31 c0                         xorl    %eax, %eax
      38: 66 0f ef c9                   pxor    %xmm1, %xmm1
      3c: 0f 1f 40 00                   nopl    (%rax)
      40: f3 0f 6f 14 81                movdqu  (%rcx,%rax,4), %xmm2
      45: 66 0f fe c2                   paddd   %xmm2, %xmm0
      49: f3 0f 6f 54 81 10             movdqu  0x10(%rcx,%rax,4), %xmm2
      4f: 66 0f fe ca                   paddd   %xmm2, %xmm1
      53: 48 83 c0 08                   addq    $0x8, %rax
      57: 48 39 c6                      cmpq    %rax, %rsi
      5a: 75 e4                         jne     0x40 <_Z4sum1RKSt6vectorIiSaIiEE+0x40>
      5c: 66 0f fe c8                   paddd   %xmm0, %xmm1
      60: 66 0f 70 c1 ee                pshufd  $0xee, %xmm1, %xmm0     # xmm0 = xmm1[2,3,2,3]
      65: 66 0f fe c1                   paddd   %xmm1, %xmm0
      69: 66 0f 70 c8 55                pshufd  $0x55, %xmm0, %xmm1     # xmm1 = xmm0[1,1,1,1]
      6e: 66 0f fe c8                   paddd   %xmm0, %xmm1
      72: 66 0f 7e c8                   movd    %xmm1, %eax
      76: eb 07                         jmp     0x7f <_Z4sum1RKSt6vectorIiSaIiEE+0x7f>
      78: c3                            retq
      79: 03 04 b1                      addl    (%rcx,%rsi,4), %eax
      7c: 48 ff c6                      incq    %rsi
      7f: 48 39 f2                      cmpq    %rsi, %rdx
      82: 75 f5                         jne     0x79 <_Z4sum1RKSt6vectorIiSaIiEE+0x79>
      84: eb f2                         jmp     0x78 <_Z4sum1RKSt6vectorIiSaIiEE+0x78>
```

```bash
$ clang++ -O2 -S sum1.cpp -o sum1.s
$ llvm-mca -march=x86-64 -mcpu=x86-64 -timeline sum1.s
```

```bash
[0] Code Region - MyLoop

Iterations:        100
Instructions:      3400
Total Cycles:      914
Total uOps:        3500

Dispatch Width:    4
uOps Per Cycle:    3.83
IPC:               3.72
Block RThroughput: 8.8
```

#### Benchmark Comparison
| Metric            | `clang++` (based) | `g++`     | $\Delta$    |
| :---------------- | :---------------: | :-------: | :----------:|
| Instructions      |         3400      |   1300    | -61.76%     |
| Total Cycles      |          914      |    362    | -60.39%     |
| Total uOps        |         3500      |   1400    | -60.00%     |
| IPC               |         3.72      |   3.59    | -3.49%      |
| uOps Per Cycle    |         3.83      |   3.87    | +1.04%      |
| Block RThroughput |          8.8      |    3.5    | -60.23%     |
| Dispatch Width    |           4       |     4     | 0.00%       |

Relative Difference $\Delta$ is calculated as:
$$
\Delta = \left( \frac{\text{Metric}_{\text{g++}} - \text{Metric}_{\text{clang++}}}
  {\text{Metric}_{\text{clang++}}} \right) \times 100\%
$$

##### Instructions
`clang++` generates `3400` instructions, `g++` generates only `1300`.
This means `g++` can produce an executable with a smaller code size.

##### Total Cycles
`clang++` consumes `914` cycles, `g++` requires only `362`.
This means `g++` completes the task 60.39% faster for this iteration count.

##### Total uOps (Micro-operations)
`clang++` produces `3500` uOps, g++ generates only `1400`, 
showing that `g++` places a significantly lighter load on the CPU execution engine.

##### IPC (Instructions Per Cycle)
`clang++` achieves `3.72` IPC, g++ achieves `3.59`,
indicating that `clang++` more effectively saturates the processor's pipeline per clock cycle.

##### Block RThroughput
`clang++` requires `8.8` cycles per block, `g++` only needs `3.5`,
proving that `g++` offers higher throughput

#### Conclusion
Although `clang++` demonstrates better IPC, 
`g++` is overall better in this case.

## Case 02: Range-based For-Loop

Again, We use `__asm__` markers **[1]** to define a specific code region for `llvm-mca`,
allowing us to analyze the benchmark.

```bash
$ cat sum2.cpp
```

```cpp
#include <vector>

int sum2(const std::vector<int>& xs) {
  int total{};
  __asm__ volatile("# LLVM-MCA-BEGIN MyLoop");
  for(const auto& e : xs) {
    total += e;
  }
  __asm__ volatile("# LLVM-MCA-END");
  return total;
}
```

#### Use g++ to compile

```bash
$ g++ -O2 -c sum2.cpp
$ llvm-objdump -d --disassemble-symbols=$(nm sum2.o | awk '/sum2/ {print $3}') --x86-asm-syntax=att sum2.o
```

```x86asm
sum2.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <_Z4sum2RKSt6vectorIiSaIiEE>:
       0: f3 0f 1e fa                   endbr64
       4: 48 8b 07                      movq    (%rdi), %rax
       7: 48 8b 4f 08                   movq    0x8(%rdi), %rcx
       b: 31 d2                         xorl    %edx, %edx
       d: 48 39 c1                      cmpq    %rax, %rcx
      10: 74 11                         je      0x23 <_Z4sum2RKSt6vectorIiSaIiEE+0x23>
      12: 66 0f 1f 44 00 00             nopw    (%rax,%rax)
      18: 03 10                         addl    (%rax), %edx
      1a: 48 83 c0 04                   addq    $0x4, %rax
      1e: 48 39 c8                      cmpq    %rcx, %rax
      21: 75 f5                         jne     0x18 <_Z4sum2RKSt6vectorIiSaIiEE+0x18>
      23: 89 d0                         movl    %edx, %eax
      25: c3                            retq
```

```bash
$ g++ -O2 -S sum2.cpp -o sum2.s
$ llvm-mca -march=x86-64 -mcpu=x86-64 -timeline sum2.s
```

```bash
[0] Code Region - MyLoop

Iterations:        100
Instructions:      900
Total Cycles:      261
Total uOps:        1000

Dispatch Width:    4
uOps Per Cycle:    3.83
IPC:               3.45
Block RThroughput: 2.5
```

#### Use clang++ to compile
```bash
$ clang++ -O2 -c sum2.cpp
$ llvm-objdump -d --disassemble-symbols=$(nm sum2.o | awk '/sum2/ {print $3}') --x86-asm-syntax=att sum2.o
```

```x86asm
sum2.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <_Z4sum2RKSt6vectorIiSaIiEE>:
       0: 4c 8b 07                      movq    (%rdi), %r8
       3: 48 8b 4f 08                   movq    0x8(%rdi), %rcx
       7: 49 39 c8                      cmpq    %rcx, %r8
       a: 74 17                         je      0x23 <_Z4sum2RKSt6vectorIiSaIiEE+0x23>
       c: 48 89 ce                      movq    %rcx, %rsi
       f: 4c 29 c6                      subq    %r8, %rsi
      12: 48 83 c6 fc                   addq    $-0x4, %rsi
      16: 31 c0                         xorl    %eax, %eax
      18: 48 83 fe 1c                   cmpq    $0x1c, %rsi
      1c: 73 08                         jae     0x26 <_Z4sum2RKSt6vectorIiSaIiEE+0x26>
      1e: 4c 89 c2                      movq    %r8, %rdx
      21: eb 6d                         jmp     0x90 <_Z4sum2RKSt6vectorIiSaIiEE+0x90>
      23: 31 c0                         xorl    %eax, %eax
      25: c3                            retq
      26: 48 c1 ee 02                   shrq    $0x2, %rsi
      2a: 48 ff c6                      incq    %rsi
      2d: 48 89 f7                      movq    %rsi, %rdi
      30: 48 83 e7 f8                   andq    $-0x8, %rdi
      34: 49 8d 14 b8                   leaq    (%r8,%rdi,4), %rdx
      38: 66 0f ef c0                   pxor    %xmm0, %xmm0
      3c: 31 c0                         xorl    %eax, %eax
      3e: 66 0f ef c9                   pxor    %xmm1, %xmm1
      42: 66 66 66 66 66 2e 0f 1f 84 00 00 00 00 00     nopw    %cs:(%rax,%rax)
      50: f3 41 0f 6f 14 80             movdqu  (%r8,%rax,4), %xmm2
      56: 66 0f fe c2                   paddd   %xmm2, %xmm0
      5a: f3 41 0f 6f 54 80 10          movdqu  0x10(%r8,%rax,4), %xmm2
      61: 66 0f fe ca                   paddd   %xmm2, %xmm1
      65: 48 83 c0 08                   addq    $0x8, %rax
      69: 48 39 c7                      cmpq    %rax, %rdi
      6c: 75 e2                         jne     0x50 <_Z4sum2RKSt6vectorIiSaIiEE+0x50>
      6e: 66 0f fe c8                   paddd   %xmm0, %xmm1
      72: 66 0f 70 c1 ee                pshufd  $0xee, %xmm1, %xmm0     # xmm0 = xmm1[2,3,2,3]
      77: 66 0f fe c1                   paddd   %xmm1, %xmm0
      7b: 66 0f 70 c8 55                pshufd  $0x55, %xmm0, %xmm1     # xmm1 = xmm0[1,1,1,1]
      80: 66 0f fe c8                   paddd   %xmm0, %xmm1
      84: 66 0f 7e c8                   movd    %xmm1, %eax
      88: 48 39 fe                      cmpq    %rdi, %rsi
      8b: 74 0e                         je      0x9b <_Z4sum2RKSt6vectorIiSaIiEE+0x9b>
      8d: 0f 1f 00                      nopl    (%rax)
      90: 03 02                         addl    (%rdx), %eax
      92: 48 83 c2 04                   addq    $0x4, %rdx
      96: 48 39 ca                      cmpq    %rcx, %rdx
      99: 75 f5                         jne     0x90 <_Z4sum2RKSt6vectorIiSaIiEE+0x90>
      9b: c3                            retq
```

```bash
$ clang++ -O2 -S sum2.cpp -o sum2.s
```

```bash
$ llvm-mca -march=x86-64 -mcpu=x86-64 -timeline sum2.s
```

```bash
sum2.s:67:3: error: found an invalid region end directive
        # LLVM-MCA-END
         ^
sum2.s:67:3: note: unable to find an active anonymous region
        # LLVM-MCA-END
```

```bash
$ grep -n "LLVM-MCA" sum2.s
10:     # LLVM-MCA-BEGIN
29:     # LLVM-MCA-END
67:     # LLVM-MCA-END
```

I have spent time trying to find the cause of the above error, but have not been able to identify it. 
I am therefore recording it here and will update this post if I find the reason later.

## References
[1] https://llvm.org/docs/CommandGuide/llvm-mca.html