---
layout: default
title: "Study Notes: Addressing the adding situation"
date: 2026-01-31
tag: compiler
---

## Study Notes: Addressing the adding situation

These notes are based on the post [**Addressing the adding situation**](https://xania.org/202512/02-adding-integers) and the YouTube video [**[AoCO 2/25] Adding Integers on x86 - just an ADD, right?**](https://www.youtube.com/watch?v=BOvg0sGJnes&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=3) which are Day 2 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

Written by me and assisted by AI, proofread by me and assisted by AI. Technical insights from the YouTube comment section have been cross-referenced and integrated into these notes.

#### Development Environment
{% highlight bash %}
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ clang -v
Ubuntu clang version 18.1.8

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8

$ lldb -v
lldb version 18.1.8

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

Because the hardware logic requires the destination regiter to overlap with one of the source operands,
the compiler cannot map `a = b + c` directly to a signle `add` instruction. To prevent overwriting the original 
value of `b` or `c` before the operation is executed, the compile need to use `mov` instruction to 
initialize the destination with one of the operands frist:

{% highlight bash %}
movl    -0x4(%rbp), %eax
addl    -0x8(%rbp), %eax
{% endhighlight %}

Hence, the compiler need to use two instructions to execute the addition at the -O0 level. 

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

At the -O2 level, the compiler maps the C logic return x + y directly into a single lea instruction. 
Because lea supports two source registers, the compiler can take two independent inputs (%rdi and %rsi) and 
store the result in an independent destination (%eax) without overwriting the original operands.
this allows the a = b + c logic to be executed in one step, 
eliminating the need for the extra mov instruction required at the -O0 level.

## YouTube Comment Insights

Since YouTube does not currently support generating direct permanent links to individual comments, 
I have reproduced the relevant technical insight below in its entirety to ensure both accuracy and proper attribution

{% highlight bash %}
@sulix314

LEA doesnt affect flags. While this is sometimes annoying (when you need to carry with ADC), 
it is often extremely useful because you can perform arithmetic without destroying the flag state 
needed for a subsequent conditional jump or another calculation.
{% endhighlight %}
