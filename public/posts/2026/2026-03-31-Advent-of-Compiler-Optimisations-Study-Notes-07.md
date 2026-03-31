---
tags: AoCO2025, Compiler, x86
---

## Study Notes: Division by a Constant, Advent of Compiler Optimisations 2025

These notes are based on the post [**Multiplying our way out of division**](https://xania.org/202512/07-division-again) and the YouTube video [**[AoCO 7/25] Division by a Constant**](https://www.youtube.com/watch?v=V9Pvv1tkocM&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=8) which are Day 7 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM` toolchain on `Ubuntu`.

Written by me and assisted by AI, proofread by me and assisted by AI. 

#### Development Environment
```bash
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ clang -v
Ubuntu clang version 18.1.8

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8

$ nvim --version
NVIM v0.11.5
```

## Introduction

To avoid floating-point overhead, the compiler optimizes unsigned division $N / D$ by multiplying $N$ by
a precomputed magic number $M$ and shifting the result right by $k$ bits. The logic follows this equation:

$$
\lfloor \frac{N}{D} \rfloor = \lfloor \frac{N \cdot M}{2^k} \rfloor
$$

The compiler's goal is to find a fixed-point approximation such that :

$$
\frac{1}{D} \approx \frac{M}{2^{k}}
$$

By rearranging the term $2^{k}$, we can derive the magic number $M$ follows this equation :

$$
M \approx \frac{2^k}{D} = \lceil \frac{2^k}{D} \rceil
$$ 

The shift $k$ must be large enough to provide sufficient precision, it follows this equation **[1]** :

$$
k = x + \lceil \log_2{D} \rceil,\ \text{x is the type size of N}
$$

Let's analyze the following example to understand how it works.

## Example : Division by 10

In this example, we analyze how the compiler handles unsigned division by 10. 

```bash
$ nvim main.c
```

```c
unsigned div10(unsigned x) {
  return x / 10u;
}
```

By disassembling the compiled object file, we can observe the magic number $M$ and the shift operation.

```bash
clang -O2 -c main.c; llvm-objdump -d --disassemble-symbols=div10 --x86-asm-syntax=att main.o
```

```
0000000000000040 <div10>:
    40: 89 f9            movl   %edi, %ecx
    42: b8 cd cc cc cc   movl   $0xcccccccd, %eax # Magic Number M = 0xCCCCCCCD
    47: 48 0f af c1      imulq  %rcx, %rax        # N * M
    4b: 48 c1 e8 23      shrq   $0x23, %rax       # Right shift by k = 35
    4f: c3               retq
```

Let's do the verification

Calculate $k$:

$$
\begin{aligned}
k &= x + \lceil \log_2{D} \rceil,\ \text{x is the type size of N} \\
  &= 32 + \lceil 3.32192809489 \rceil \\
  &= 32 + 4 \\
  &= 36
\end{aligned}
$$

Calculate $M$:
$$
\begin{aligned}
M \approx \frac{2^k}{D} &= \lceil \frac{2^k}{D} \rceil \\
                        &= \lceil \frac{2^{36}}{10} \rceil \\
                        &= \lceil \frac{68719476736}{10} \rceil \\
                        &= \lceil 6871947673.6 \rceil \\
                        &= 6871947674 \\
                        &= 19999999A
\end{aligned}
$$ 

Testing with $N = 100$: 

$$
\begin{aligned}
LHS &= \lfloor \frac{N}{D} \rfloor \\
    &= \lfloor \frac{100}{10} \rfloor \\
    &= \lfloor 10 \rfloor \\
    &= 10
\end{aligned}
$$

$$
\begin{aligned}
RHS &= \lfloor \frac{N \cdot M}{2^k} \rfloor \\
    &= \lfloor \frac{100 \cdot 19999999A}{2^{36}} \rfloor \\
    &= \lfloor \frac{687194767400}{2^{36}} \rfloor \\
    &= \lfloor 10.0000000006 \rfloor \\
    &= 10
\end{aligned}
$$

Since $LHS = RHS$, the compiler optimization successfully avoids floating-point instructions.

According to the disassembly results, the actual $k$ used by the compiler is `35`
instead of our calculation result `36`.
Similarly the magic number $M$ used by the compiler is `0xCCCCCCCD`
instead of our calculation result `19999999A`.

Since we know $35 < 36$ and $CCCCCCCD < 19999999A$, 
it is clear that while the formula provides a
theoretical upper bound that guarantees correctness, 
the compiler uses this bound as a starting point to find the minimal lower bound 
that satisfies the same accuracy calculation result.

## References
[1] https://en.wikipedia.org/wiki/Division_algorithm#Division_by_a_constant

