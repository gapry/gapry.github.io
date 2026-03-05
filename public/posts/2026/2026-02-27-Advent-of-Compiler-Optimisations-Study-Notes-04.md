## Study Notes: Multiplying with a constant, Advent of Compiler Optimisations 2025

These notes are based on the post [**Multiplying with a constant**](https://xania.org/202512/04-multiplying-integers) and the YouTube video [**[AoCO 4/25] Multiplying with a Constant**](https://www.youtube.com/watch?v=1X88od0miHs&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=5) which are Day 4 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM` toolchain on `Ubuntu`.

Selected technical insights from the YouTube comment section are reproduced at the end of these notes to provide additional context.

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

$ echo $SHELL
/usr/bin/fish
```

## Introduction

After studying the Day 04 YouTube video and blog post, I conducted a series of sequential tests by multiplying `x` by every constant from `2` to `20`. 

By analyzing the assembly output for each case, I identified and selected 10 distinct compiler optimization strategies. 

These notes document specific patterns and filter out redundant results, highlighting unique compiler optimization strategies.

## Case 01 : `x * 2`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 2;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 8d 04 3f                      leal    (%rdi,%rdi), %eax
       3: c3                            retq
```

The compiler avoids the `imul` instruction in favor of the `shift`, `add`, and `lea` instructions for the following reasons:

- Constant multiplication can often be expressed using free address generation
- `lea` can compute `x + x * scale` without using ALU ports
- It may reduce dependency chains

Here, it uses the leal instruction to perform `x + x` in a single cycle. 

## Case 02: `x * 3`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 3;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 8d 04 7f                      leal    (%rdi,%rdi,2), %eax
       3: c3                            retq
```

It utilizes x86 the `lea` with **Base + (Index * Scale)** addressing to calculate `x + x * 2`

## Case 03: `x * 4`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 4;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 8d 04 bd 00 00 00 00          leal    (,%rdi,4), %eax
       7: c3                            retq
```

Using the `lea` instruction with a scale factor enables multiplication to be performed in a single instruction, 
eliminating the need for separate shift and multiply instructions.

## Case 04 : `x * 6`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 6;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 01 ff                         addl    %edi, %edi
       2: 8d 04 7f                      leal    (%rdi,%rdi,2), %eax
       5: c3                            retq
```

The compiler splits the multiplication `x * 6` into two distinct steps: first `x + x`, followed by `2x + (2x * 2)`. 

You might wonder why the compiler doesn't simply use a single instruction like `leal (%rdi,%rdi,6), %eax`.

The reason lies in the instruction encoding. 

The `leal` instruction calculates addresses using the formula **Base + (Index * Scale)**, where the scale factor is encoded at the bit level.

If we assume the scale field uses **2 bits** within the instruction encoding, there are only four possible binary combinations: `00`, `01`, `10`, and `11`. 

These bits correspond to the multipliers **1, 2, 4, and 8**. Because of this limitation, it is not possible for the hardware to represent a scale of `6`. 

Consequently, the compiler must break the operation into multiple valid steps to achieve the desired result.

## Case 05 : `x * 7`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 7;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 8d 04 fd 00 00 00 00          leal    (,%rdi,8), %eax
       7: 29 f8                         subl    %edi, %eax
       9: c3                            retq
```

The compiler uses **multiply and subtract** logic: It first scales `x` by 8 using leal and then subtracts the original `x`.

## Case 06 : `x * 11`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 11;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 8d 04 bf                      leal    (%rdi,%rdi,4), %eax
       3: 8d 04 47                      leal    (%rdi,%rax,2), %eax
       6: c3                            retq
```

The compiler splits the multiplication `x * 11` into two distinct steps: 
first `x + x * 4`, followed by `x + (5x * 2)`. 

## Case 07 : `x * 12`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 12;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: c1 e7 02                      shll    $0x2, %edi
       3: 8d 04 7f                      leal    (%rdi,%rdi,2), %eax
       6: c3                            retq
```

The compiler splits the multiplication `x * 12` into two distinct steps: 
first `x << 2`, followed by `4x + (4x * 2)`. 

## Case 08: `x * 14`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 14;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 89 f8                         movl    %edi, %eax
       2: 8d 0c 00                      leal    (%rax,%rax), %ecx
       5: c1 e0 04                      shll    $0x4, %eax
       8: 29 c8                         subl    %ecx, %eax
       a: c3                            retq
```

The compiler splits the multiplication `x * 14` into three distinct steps: 
1. calculates 2x and store it in ecx (`ecx = x + x`)
2. calculates 16x and store it in eax (`eax = 16 * x`)
3. calculates 14x by subtracting the two results (`eax - ecx = 16x - 2x = 14x`)

## Case 09: `x * 16`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 16;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 89 f8                         movl    %edi, %eax
       2: c1 e0 04                      shll    $0x4, %eax
       5: c3                            retq
```

According the x86-64 calling convention, the result must be returned in %eax. 
The compiler cannot simply generate a single `shll $0x4, %edi` instruction.
It need to generate an extra instruction to move the input value from `%edi` to `%eax` before the shift operation.

## Case 10: `x * 17`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 17;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c mul.c; llvm-objdump -d --x86-asm-syntax=att mul.o
```

```text
mul.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 89 f8                         movl    %edi, %eax
       2: c1 e0 04                      shll    $0x4, %eax
       5: 01 f8                         addl    %edi, %eax
       7: c3                            retq
```

Similar to case 09, we first need to move the input value from `%edi` to `%eax` to satisfy the calling convention. 
Then we get `16 * x`. Finally, we get `x + 16x`.

## YouTube Comment Insights

Since YouTube does not currently support generating direct permanent links to individual comments, 
I have reproduced the relevant technical insight below in its entirety to ensure both accuracy and proper attribution.

```text
@moregirl4585
Fact: on some architecture x*-3 is better expressed as x-(x<<2) and some better as -(x+x+x). Seems compilers don't work well for both case

@SLiV9
Do you know why for multiplying by 6, it uses an ADD for the second x2? Why not another LEA like for multiplying by 2?
|
|--> @nurmr
|    My suspicion is that address adder is "cheaper" to use than an ALU. 
|    Especially with more complex code which might have other operations pipelined and running on an ALU. 
|
|--> @HenryLoenwind 
     lea is faster than mov+add, but not faster than a "naked" add. 
     And even if the cpu cycles are the same in the end, 
     add reg,reg is a 2-byte instruction (like the xor we had on day 1).

@lpprogrammingllc 
It's worth noting the shifts-and-adds version might still be faster on modern CPUs due to instruction pipelining. 
Yes, the total work done is more than a single imul, but it can do each part in parallel, until the final add. 
However, it also requires more code, and more "slots" in the decoding/execution pipeline. 
Lots of modern machines have a 4-wide instruction frontend. 
So with the imul, one of them handles the imul, and 3 keep going on any other calculations they can. 
With the shifts-and-adds version, 3 get held up waiting on the shifts, to then issue the adds. 
Only one gets to work on anything else.  
The compiler assumes there will usually be other work to do, 
so aims for maximum throughput rather than prioritizing finishing the mult as soon as possible.

@lpprogrammingllc
The CPU execution backend may well execute shifts and adds. However between your code in memory and that backend is the instruction decoder, 
which uses the microcode to turn your single imul into whatever real micro instructions are required for the execution backend.

If I understand the implicit part of your comment correctly, 
you think there is no value in giving the instruction decoder the split-apart shift-and-add instructions because what the backend executes may be the same in either case. 
This is incorrect. The cyclic latency (the number of cycles from beginning decode to commit) in the imul instruction is the number of cycles required for the instruction decoder 
to issue microcode to the backend and for the backend to execute that microcode. Often the limiting factor is the frontend decode speed. 
If you can decrease the number of cycles spent by the frontend doing the decode, you can decrease the total cycles required, 
at the expense of more power use or less other work happening at the same time.
```

## References
[1] https://cs61.seas.harvard.edu/site/2018/Asm1/