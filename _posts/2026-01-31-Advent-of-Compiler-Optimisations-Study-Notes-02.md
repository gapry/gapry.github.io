---
layout: default
title: "Study Notes: Addressing the adding situation"
date: 2026-01-31
tag: compiler
---

## Study Notes: Addressing the adding situation

These notes are based on the post [**Addressing the adding situation**](https://xania.org/202512/02-adding-integers) and the YouTube video [**[AoCO 2/25] Adding Integers on x86 - just an ADD, right?**](https://www.youtube.com/watch?v=BOvg0sGJnes&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=3) which are Day 2 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM` toolchain on `Ubuntu`.

Additionally, I have extended the discussion by implementing a manual Proof of Concept in assembly to demonstrate the equivalence of `add` vs `lea` instructions.

Selected technical insights from the YouTube comment section are reproduced at the end of these notes to provide additional context.

Written by me and assisted by AI, proofread by me and assisted by AI. 

#### Development Environment
{% highlight bash %}
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ clang -v
Ubuntu clang version 18.1.8

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8

$ echo $SHELL
/usr/bin/fish

{% endhighlight %}

## Integer Addition

To understand how `clang` translates `C` addition into `x86-64` machine instructions, we use the following implementation

{% highlight bash %}
$ nvim add.c
{% endhighlight %}

```c
int add(int x, int y) {
  return x + y;
}
```

## Unoptimized Analysis

{% highlight bash %}
$ rm -f (path filter *.o); clang -O0 -c add.c; llvm-objdump -d --x86-asm-syntax=att add.o
{% endhighlight %}

{% highlight bash %}
add.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <add>:
       0: 55                            pushq   %rbp
       1: 48 89 e5                      movq    %rsp, %rbp
       4: 89 7d fc                      movl    %edi, -0x4(%rbp)
       7: 89 75 f8                      movl    %esi, -0x8(%rbp)
       a: 8b 45 fc                      movl    -0x4(%rbp), %eax
       d: 03 45 f8                      addl    -0x8(%rbp), %eax
      10: 5d                            popq    %rbp
      11: c3                            retq
{% endhighlight %}

In C, the expression `a = b + c` allows for three distinct variables to execute the addition. 
However, the x86-64 ISA does not support a three-operand format for standard addition.
The format for the `add` instruction is `add source, destination`, which executes the operation
`destination = destination + source`.

Because the hardware logic requires the destination register to overlap with one of the source operands,
the compiler cannot translate `a = b + c` directly to a single `add` instruction. To prevent overwriting the original 
value of `b` or `c` before the operation is executed, the compiler needs to use `mov` instruction to 
initialize the destination with one of the operands first:

{% highlight gas %}
movl    -0x4(%rbp), %eax
addl    -0x8(%rbp), %eax
{% endhighlight %}

Hence, the compiler needs to use two instructions to execute the addition at the -O0 level. 

## Optimized Analysis
{% highlight bash %}
rm -f (path filter *.o); clang -O2 -c add.c; llvm-objdump -d --x86-asm-syntax=att add.o
{% endhighlight %}

{% highlight bash %}
add.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <add>:
       0: 8d 04 37                      leal    (%rdi,%rsi), %eax
       3: c3                            retq
{% endhighlight %}

At the `-O2` level, the compiler translates the `C` statement `return x + y;` directly into a single `lea` instruction. 
Because lea supports two source registers, the compiler can take two independent inputs (`%rdi` and `%rsi`) and 
store the result in an independent destination (`%eax`) without overwriting the original operands.
This allows the `a = b + c` logic to be executed in one step, 
eliminating the need for the extra mov instruction required at the `-O0` level.

## Proof of Concept
The following assembly code demonstrates these two approaches: 
one utilizing the `mov` + `add` instruction sequence, 
and the other employing a single `lea` instruction.

{% highlight bash %}
$ nvim add.s
{% endhighlight %}

```
.section .note.GNU-stack, "", @progbits

.section .rodata
  fmt: .string "Result: %d\n"

.section .text
  .globl main
  .extern printf

main:
  pushq   %rbp
  movq    %rsp, %rbp

  # --- Case A: Using mov + add ---
  movl    $1, %edx
  movl    $2, %ecx
  movl    %edx, %eax
  addl    %ecx, %eax

  # Print Result
  movq    fmt@GOTPCREL(%rip), %rdi
  movslq  %eax, %rsi
  movl    $0, %eax
  call    printf

  # --- Case B: Using lea ---
  movl    $1, %edx
  movl    $2, %ecx
  leal    (%edx, %ecx), %eax

  # Print Result
  movq    fmt@GOTPCREL(%rip), %rdi
  movslq  %eax, %rsi
  movl    $0, %eax
  call    printf

  movl    $0, %eax
  popq    %rbp
  retq
```

{% highlight bash %}
$ rm -f (path filter *.out); clang -o add.out add.s; ./add.out
Result: 3
Result: 3
{% endhighlight %}

As demonstrated, both approaches produce identical results, confirming that the single `lea` instruction is 
logically equivalent to the `a = b + c` mathematical operation.

## YouTube Comment Insights

Since YouTube does not currently support generating direct permanent links to individual comments, 
I have reproduced the relevant technical insight below in its entirety to ensure both accuracy and proper attribution.

{% highlight text %}
@sulix314
LEA doesn't affect flags. While this is sometimes annoying (when you need to carry with ADC), 
it is often extremely useful because you can perform arithmetic without destroying the flag state 
needed for a subsequent conditional jump or another calculation.

@incubus3827
In addition, LEA could run on the V-pipeline in the original Pentium, which often allowed performing some arithmetics + reshuffling registers 
for no additional cycles. A true gamechanger for software rasterizers.

@mytech6779 
I recall the LEA instruction also uses a dedicated module on the CPU with an independent execution pipeline, 
so the LEA operation can be concurrent with an ALU operation. 
I can't say the address module addition [in isolation] is faster or the same cycle count as the ALU, 
but being specialized I imagine the address module is somewhat simpler with fewer transistors 
(reducing area and heat some small amount).

{% endhighlight %}
