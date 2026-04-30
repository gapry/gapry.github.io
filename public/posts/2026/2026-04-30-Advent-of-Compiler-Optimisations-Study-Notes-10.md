---
tags: AoCO2025, Compiler, x86
---

## Study Notes: Unrolling loops, Advent of Compiler Optimisations 2025

These notes are based on the post [**Unrolling loops**](https://xania.org/202512/10-loop-unrolling) and the YouTube video [**[AoCO 10/25] Unrolling Loops**](https://www.youtube.com/watch?v=HvF3tF2efEA&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=11) which are Day 10 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM toolchain` on `Ubuntu`.

Written by me and assisted by AI, proofread by me and assisted by AI. 

## Development Environment
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

Let's do a quick introduction of `std::span` first.
It provides a uniform interface for contiguous sequences of objects like vectors, arrays, or raw C-style arrays.

```bash
$ cat main.cpp
```

```cpp
#include <span>
#include <vector>
#include <array>
#include <iostream>

template<typename T>
auto sum(T&& dataset) {
  std::span s{dataset};
  using U = typename decltype(s)::value_type;
  U total{};
  for (const auto& val : s) {
    total += val;
  }
  return total;
}

int main() {
  std::vector<int> xs = {1, 2, 3, 4, 5};
  std::array<float, 3> ys = {4.5f, 5.6f, 6.7f};
  double zs[] = {7.8, 8.9, 9.10, 10.11, 11.12};

  std::cout << sum(xs) << "\n";
  std::cout << sum(ys) << "\n";
  std::cout << sum(zs) << "\n";
  return 0;
}
```

```bash
$ rm -f *.out; clang++ -std=c++20 -o app.out main.cpp; ./app.out
15
16.8
47.03
```

## What is Loop unrolling

Loop unrolling can reduce the overhead by decreasing the number of iterations and branch instructions.

To force on loop unrolling, we will disable the SIMD by `-fno-vectorize -mno-sse -mno-avx` in the following example.

#### Part 01 : Standard Loop

It is the standard for-loop and corresponding assembly.

```bash
$ cat sum.cpp
```

```cpp
int sum(int data[8]) {
  int total = 0;
  for (int i = 0; i < 8; i++) {
    total += data[i];
  }
  return total;
}
```

```bash
$ clang++ -std=c++20 -O2 -fno-unroll-loops -fno-vectorize -mno-sse -mno-avx -c sum.cpp
```

```bash
$ llvm-objdump -d --disassemble-symbols=$(nm sum.o | awk '/sum/ {print $3}') --x86-asm-syntax=intel sum.o
```

```txt
sum.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <_Z3sumPi>:
       0: 31 c9                         xor     ecx, ecx
       2: 31 c0                         xor     eax, eax
       4: 66 66 66 2e 0f 1f 84 00 00 00 00 00   nop     word ptr cs:[rax + rax]
      10: 03 04 8f                      add     eax, dword ptr [rdi + 4*rcx]
      13: 48 ff c1                      inc     rcx
      16: 48 83 f9 08                   cmp     rcx, 0x8
      1a: 75 f4                         jne     0x10 <_Z3sumPi+0x10>
      1c: c3                            ret
```

#### Part 02 : Manual Unrolling

We can manually unroll the loop using the following way.

```bash
$ cat sum.cpp
```

```cpp
int sum(int data[8]) {
  int total = 0;
  total += data[0];
  total += data[1];
  total += data[2];
  total += data[3];
  total += data[4];
  total += data[5];
  total += data[6];
  total += data[7];
  return total;
}
```

```bash
$ clang++ -std=c++20 -O2 -fno-unroll-loops -fno-vectorize -mno-sse -mno-avx -c sum.cpp
```

```bash
$ llvm-objdump -d --disassemble-symbols=$(nm sum.o | awk '/sum/ {print $3}') --x86-asm-syntax=intel sum.o
```

```text
sum.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <_Z3sumPi>:
       0: 8b 47 04                      mov     eax, dword ptr [rdi + 0x4]
       3: 03 07                         add     eax, dword ptr [rdi]
       5: 03 47 08                      add     eax, dword ptr [rdi + 0x8]
       8: 03 47 0c                      add     eax, dword ptr [rdi + 0xc]
       b: 03 47 10                      add     eax, dword ptr [rdi + 0x10]
       e: 03 47 14                      add     eax, dword ptr [rdi + 0x14]
      11: 03 47 18                      add     eax, dword ptr [rdi + 0x18]
      14: 03 47 1c                      add     eax, dword ptr [rdi + 0x1c]
      17: c3                            ret
```

#### Part 03 : Use Compiler to do the Loop Unrolling

In previous examples, we use `-fno-unroll-loops` to disable the compiler from doing the loop unrolling.

For now, we enable it and see the output assembly is as same as the part02, which manually unrolled in C code.

```bash
$ cat sum.cpp
```

```cpp
int sum(int data[8]) {
  int total = 0;
  for (int i = 0; i < 8; i++) {
    total += data[i];
  }
  return total;
}
```

```bash
$ clang++ -std=c++20 -O2 -fno-vectorize -mno-sse -mno-avx -c sum.cpp
```

```bash
$ llvm-objdump -d --disassemble-symbols=$(nm sum.o | awk '/sum/ {print $3}') --x86-asm-syntax=intel sum.o
```

```text
sum.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <_Z3sumPi>:
       0: 8b 47 04                      mov     eax, dword ptr [rdi + 0x4]
       3: 03 07                         add     eax, dword ptr [rdi]
       5: 03 47 08                      add     eax, dword ptr [rdi + 0x8]
       8: 03 47 0c                      add     eax, dword ptr [rdi + 0xc]
       b: 03 47 10                      add     eax, dword ptr [rdi + 0x10]
       e: 03 47 14                      add     eax, dword ptr [rdi + 0x14]
      11: 03 47 18                      add     eax, dword ptr [rdi + 0x18]
      14: 03 47 1c                      add     eax, dword ptr [rdi + 0x1c]
      17: c3                            ret
```

## Case Study

We compare the `std::span<int>` and `std::span<int, 8>` in formal parameters to see how the compiler
performs  loop unrolling when the size is fixed at compile-time.

#### Case01 : `std::span<int>`

In this case, the span size is unknown hence the compiler generated the standard loop assembly code.

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

#### Case02 : `std::span<int, 8>`

In this case, the span size is defined hence the compiler can perform the loop unrolling.

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

## Conclusion
Use Radare2 to visualize the assembly with control flow. 
We can see the compiler does the optimization of loop unrolling 
to remove the branch instruction to reduce the overhead.
