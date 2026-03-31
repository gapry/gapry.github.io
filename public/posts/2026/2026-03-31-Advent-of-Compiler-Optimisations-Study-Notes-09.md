---
tags: AoCO2025, Compiler, x86
---

## Study Notes: Induction variables and loops, Advent of Compiler Optimisations 2025

These notes are based on the post [**Induction variables and loops**](https://xania.org/202512/09-induction-variables) and the YouTube video [**[AoCO 9/25] More Loops: Induction Variables**](https://www.youtube.com/watch?v=vZk7Br6Vh1U&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=10) which are Day 9 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `GNU toolchain` and `LLVM toolchain` on `Ubuntu`.

Written by me and assisted by AI, proofread by me and assisted by AI. 

#### Development Environment
```bash
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ gcc -v
gcc version 13.3.0 (Ubuntu 13.3.0-6ubuntu2~24.04.1)

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8
```

## Introduction

This note introduces a loop optimization known as `Induction Variable Elimination` **[1]**.

The core concept is analogous to an `arithmetic sequence` **[2]**.

The closed-form expression $a_n = a_1 + (n - 1) d$ is mathematically equivalent to the 
recursive definition $a_{n + 1} = a_{n} + d$.

To verify whether a compiler performs induction variable optimization, we compare two implementations:

1. A loop using the formula $a_n = a_1 + (n - 1) d$
2. A loop using the formula $a_{n + 1} = a_{n} + d$

If the compiler successfully applies this optimization, 
the resulting disassembly for both implementations should be identical.

## Part 01: Closed-Form Expression

$$
a_n = a_1 + (n - 1) d
$$

```bash
$ cat main.c
```

```c
void sum(int* a, int n, int d) {
  int cache = a[0];
  for (int i = 0; i < n; ++i) {
    a[i] = cache + i * d;
  }
}
```

```bash
$ gcc -O2 -c main.c
$ llvm-objdump -d --disassemble-symbols=sum --x86-asm-syntax=att main.o
```

```x86asm
0000000000000000 <sum>:
 0: f3 0f 1e fa          endbr64 
 4: 8b 07                movl   (%rdi), %eax        ; Load a[0] into %eax outside the loop
 6: 85 f6                testl  %esi, %esi          ; Check if n <= 0
 8: 7e 1b                jle    0x25                ; If n <= 0, jump to return
 a: 48 63 f6             movslq %esi, %rsi          ; Sign-extend n to 64-bit for address calculation
 d: 48 8d 0c b7          leaq   (%rdi,%rsi,4), %rcx ; Calculate end address: a + (n * 4), store in %rcx
11: 0f 1f 80 00 00 00 00 nopl   (%rax)              ; Instruction alignment (no-op) for performance
; --- Loop Starts ---
18: 89 07                movl   %eax, (%rdi) ; Write current value to a[i]
1a: 48 83 c7 04          addq   $0x4, %rdi   ; Pointer Increment: Advance %rdi to the next int 
1e: 01 d0                addl   %edx, %eax   ; [Induction Variable] cache = cache + d
20: 48 39 cf             cmpq   %rcx, %rdi   ; Check if current pointer %rdi has reached end address %rcx
23: 75 f3                jne    0x18         ; If not equal, jump back to 0x18
; --- Loop Ends ---

25: c3                   retq
```

## Part 02 : Recursive Definition

$$
a_{n + 1} = a_{n} + d
$$

```bash
$ cat main.c
```

```c
void sum(int* a, int n, int d) {
  int cache = a[0];
  for (int i = 0; i < n; ++i) {
    a[i] = cache;
    cache += d;
  }
}
```

```bash
$ gcc -O2 -c main.c
$ llvm-objdump -d --disassemble-symbols=sum --x86-asm-syntax=att main.o
```

```x86asm
0000000000000000 <sum>:
 0: f3 0f 1e fa          endbr64
 4: 8b 07                movl    (%rdi), %eax        ; Load a[0] into %eax outside the loop
 6: 85 f6                testl   %esi, %esi          ; Check if n <= 0
 8: 7e 1b                jle     0x25 <sum+0x25>     ; If n <= 0, jump to return
 a: 48 63 f6             movslq  %esi, %rsi          ; Sign-extend n to 64-bit for address calculation
 d: 48 8d 0c b7          leaq    (%rdi,%rsi,4), %rcx ; Calculate end address: a + (n * 4), store in %rcx
11: 0f 1f 80 00 00 00 00 nopl    (%rax)              ; Instruction alignment (no-op) for performance
; --- Loop Starts ---
18: 89 07                movl    %eax, (%rdi)    ; Write current value to a[i]
1a: 48 83 c7 04          addq    $0x4, %rdi      ; Pointer Increment: Advance %rdi to the next int 
1e: 01 d0                addl    %edx, %eax      ; [Induction Variable] cache = cache + d
20: 48 39 cf             cmpq    %rcx, %rdi      ; Check if current pointer %rdi has reached end address %rcx
23: 75 f3                jne     0x18 <sum+0x18> ; If not equal, jump back to 0x18
; --- Loop Ends ---
25: c3                   retq
```

## Conclusion
The disassembly results for both implementations are identical.
This confirms that the compiler successfully performs Induction Variable Elimination.
It recognizes the linear relationship within the loop and optimizes 
the multiplication into an incremental addition.

## References
1. https://en.wikipedia.org/wiki/Induction_variable
2. https://en.wikipedia.org/wiki/Arithmetic_progression
