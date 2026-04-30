---
tags: AoCO2025, Compiler, x86
---

## Study Notes: Unrolling loops, Advent of Compiler Optimisations 2025

These notes are based on the post [**Unrolling loops**](https://xania.org/202512/10-loop-unrolling) and the YouTube video [**[AoCO 10/25] Unrolling Loops**](https://www.youtube.com/watch?v=HvF3tF2efEA&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=11) which are Day 10 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM toolchain` on `Ubuntu`.

Written by me and assisted by AI, proofread by me and assisted by AI. 

#### Development Environment
```bash
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ clang++ --version
Ubuntu clang version 18.1.8 

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8

$ radare2 -v
radare2 5.5.0 0 @ linux-x86-64 git.5.5.0
```

## What is span

## What is Loop unrolling

## Case Study

#### Case01
```bash
$ cat sum.cpp
```

```cpp
#include <span>

int sum(std::span<int> dataset) {
  int total = 0;
  for(const auto& data : dataset) {
    total += data;
  }
  return total;
}
```

```bash
$ clang++ -std=c++20 -O2 -fno-vectorize -mno-sse -mno-avx -c sum.cpp
```

```bash
$ radare2 -q -e bin.cache=true -c "aa; pdf" sum.o
```

```text
            ;-- section..text:
            ;-- .text:
            ;-- reloc..text:
┌ 32: sym.sum_std::span_int__18446744073709551615ul__ (int64_t arg1, int64_t arg2);
│           ; arg int64_t arg1 @ rdi
│           ; arg int64_t arg2 @ rsi
│           0x08000040      4885f6         test rsi, rsi               ; RELOC 32 .text @ 0x08000040 - 0x80000d8 ; arg2 ; [02] -r-x section size 32 named .text
│       ┌─< 0x08000043      7418           je 0x800005d
│       │   0x08000045      48c1e602       shl rsi, 2                  ; arg2
│       │   0x08000049      31c9           xor ecx, ecx
│       │   0x0800004b      31c0           xor eax, eax
│       │   0x0800004d      0f1f00         nop dword [rax]
│      ┌──> 0x08000050      03040f         add eax, dword [rdi + rcx]  ; arg1
│      ╎│   0x08000053      4883c104       add rcx, 4
│      ╎│   0x08000057      4839ce         cmp rsi, rcx                ; arg2
│      └──< 0x0800005a      75f4           jne 0x8000050
│       │   0x0800005c      c3             ret
│       └─> 0x0800005d      31c0           xor eax, eax
└           0x0800005f      c3             ret
```

#### Case02
```bash
$ cat sum.cpp
```

```cpp
#include <span>

int sum(std::span<int, 8> dataset) {
  int total = 0;
  for(const auto& data : dataset) {
    total += data;
  }
  return total;
}
```

```bash
$ clang++ -std=c++20 -O2 -fno-vectorize -mno-sse -mno-avx -c sum.cpp
```

```bash
$ radare2 -q -e bin.cache=true -c "aa; pdf" sum.o
```

```text
            ;-- section..text:
            ;-- .text:
            ;-- reloc..text:
┌ 24: sym.sum_std::span_int__8ul__ (int64_t arg1);
│           ; arg int64_t arg1 @ rdi
│           0x08000040      8b4704         mov eax, dword [rdi + 4]    ; RELOC 32 .text @ 0x08000040 - 0x80000d0 ; arg1 ; [02] -r-x section size 24 named .text
│           0x08000043      0307           add eax, dword [rdi]        ; arg1
│           0x08000045      034708         add eax, dword [rdi + 8]    ; arg1
│           0x08000048      03470c         add eax, dword [rdi + 0xc]  ; arg1
│           0x0800004b      034710         add eax, dword [rdi + 0x10] ; arg1
│           0x0800004e      034714         add eax, dword [rdi + 0x14] ; arg1
│           0x08000051      034718         add eax, dword [rdi + 0x18] ; arg1
│           0x08000054      03471c         add eax, dword [rdi + 0x1c] ; arg1
└           0x08000057      c3             ret
```
