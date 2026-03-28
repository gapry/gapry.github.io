---
tags: compiler, arm
---

## Study Notes: ARM's barrel shifter tricks, Advent of Compiler Optimisations 2025

These notes are based on the post [**ARM's barrel shifter tricks**](https://xania.org/202512/05-barrel-shifting-with-arm) and the YouTube video [**[AoCO 5/25] Multiplying with a Constant**](https://www.youtube.com/watch?v=TZubUyr2UEY&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=6) which are Day 5 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

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

Following the Day 05 technical materials, I performed sequential tests for constant 

multiplication ranging from x multiplied by two to x multiplied by twenty on the AArch64 target. 

After evaluating the assembly output, 

I identified six distinct compiler optimization strategies that I would like to share with you.

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
$ rm -f (path filter *.o); clang -O2 -target aarch64-linux-gnu -c mul.c; llvm-objdump -d mul.o
```

```text
mul.o:  file format elf64-littleaarch64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 531f7800      lsl     w0, w0, #1
       4: d65f03c0      ret
```

ARM Instruction: `lsl <Rd>, <Rn>, #<shift>`

The compiler utilizes a Logical Shift Left (`lsl`) to perform multiplication by powers of two. 
Here, w0 is the destination (`Rd`), the original `w0` is the source (`Rn`), and `#1` is the immediate shift value. 
Shifting a register left by 1 bit is equivalent to multiplying by 2. 

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
$ rm -f (path filter *.o); clang -O2 -target aarch64-linux-gnu -c mul.c; llvm-objdump -d mul.o
```

```text
mul.o:  file format elf64-littleaarch64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 0b000400      add     w0, w0, w0, lsl #1
       4: d65f03c0      ret
```

ARM Instruction: `add <Rd>, <Rn>, <Rm>, lsl #<shift>`

AArch64 supports shifted-register operands within arithmetic instructions. 
This add instruction performs a left shift of 1 bit on the second source register (`Rm`) before addition. 
The operation represents the formula `w0 = w0 + (w0 << 1)`, which computes `x = x + x * 2`. 

## Case 03 : `x * 6`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 6;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -target aarch64-linux-gnu -c mul.c; llvm-objdump -d mul.o
```

```text
mul.o:  file format elf64-littleaarch64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 0b000408      add     w8, w0, w0, lsl #1
       4: 531f7900      lsl     w0, w8, #1
       8: d65f03c0      ret
```

ARM Instructions: 
- `add <Rd>, <Rn>, <Rm>, lsl #<shift>`
- `lsl <Rd>, <Rn>, #<shift>`

The multiplication of 6x is decomposed into two discrete stages. 
First, the compiler calculates `w8 = w0 + (w0 << 1) = w0 + 2 * w0 = 3 * w0`. 
Second, it calculates `w0 = (w8 << 1) = 2 * w8 = 2 * (3 * w0) = 6 * w0` 

## Case 04 : `x * 7`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 7;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -target aarch64-linux-gnu -c mul.c; llvm-objdump -d mul.o
```

```text
mul.o:  file format elf64-littleaarch64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 531d7008      lsl     w8, w0, #3
       4: 4b000100      sub     w0, w8, w0
       8: d65f03c0      ret
```

ARM Instructions: 
- `lsl <Rd>, <Rn>, #<shift>`
- `sub <Rd>, <Rn>, <Rm>`

The compiler implements a shift-and-subtract strategy for constants near powers of two. 
To compute `7x`, it first executes `w8 = w0 << 3 = 8 * w0` 
It then performs `w0 = w8 - w0 = 8 * w0 - w0 = 7 * w0`.

## Case 05 : `x * 11`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 11;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -target aarch64-linux-gnu -c mul.c; llvm-objdump -d mul.o
```

```text
mul.o:  file format elf64-littleaarch64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 52800168      mov     w8, #0xb                // =11
       4: 1b087c00      mul     w0, w0, w8
       8: d65f03c0      ret
```

ARM Instructions:
- `mov <Rd>, <Imm>`
- `mul <Rd>, <Rn>, <Rm>`

The compiler defaults to the `mul` instruction because decomposing the constant `11` cannot be achieved in only two instructions.

If the compiler were to adopt a manual shift-and-subtract strategy, 
the code generator would need to output three instructions:
```text
add w8, w0, w0, lsl 1    // w8 = x + 2x = 3x
lsl w8, w8, #2           // w8 = w8 << 2 = 3x << 2 = 3x * 4 = 12x
sub w0, w8, w0           // w0 = 12x - x = 11x
```
Obviously, this requires 3 instructions. By using mov followed by mul, 
the compiler achieves the same result in only 2 instructions. 

## Case 06 : `x * 14`

```bash
$ nvim mul.c
```

```c
int mul(int x) {
  return x * 14;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -target aarch64-linux-gnu -c mul.c; llvm-objdump -d mul.o
```

```text
mul.o:  file format elf64-littleaarch64

Disassembly of section .text:

0000000000000000 <mul>:
       0: 531c6c08      lsl     w8, w0, #4
       4: 4b000500      sub     w0, w8, w0, lsl #1
       8: d65f03c0      ret
```

ARM Instructions:
- `lsl <Rd>, <Rn>, #<shift>`
- `sub <Rd>, <Rn>, <Rm>, lsl #<shift>`

The computation of 14x demonstrates the flexibility of the sub instruction with shifted operands. 
The compiler first calculates `w8 = w0 << 4 = 16 * w0`. 
Subsequently, it performs `w0 = w8 - (w0 << 1) = w8 - w0 * 2 = 16 * w0 - 2 * w0 = 14 * w0`.

## YouTube Comment Insights

Since YouTube does not currently support generating direct permanent links to individual comments, 
I have reproduced the relevant technical insight below in its entirety to ensure both accuracy 
and proper attribution.

```text
@kruador 
@ciberman Yes, it means 'ARMv8'. That's not quite right because ARM Ltd enhanced the 32-bit
instruction set (which they now call A32) as well as adding the 64-bit instruction set (A64) in
version 8.

They also refer to 'AArch32' and 'AArch64' for extra confusion. I think 'AArch32' means 'the
architectural state of a 32-bit ARM processor' because you can use the alternative "Thumb"
instruction set (which ARM Ltd renamed to T32 with ARMv8, in their documentation at least) instead
of A32. The embedded ARM Cortex-M only support T32, not A32.

There is no equivalent of Thumb for AArch64 (no 'T64'), at least not as of yet (probably not
ever), so 'AArch64' and 'A64' are virtually interchangeable. And most people just say 'arm64'
because 'AArch64' is unpronounceable while 'A64' is too ambiguous.

@tlhIngan
ARMv8 was designed to be more streamlined for modern superscalar architectures so it jettisoned a
lot of ARM stuff that was responsible for causing pipeline stalls and dependencies in favor of
simpler instructions that can run faster. When AArch64 was being introduced I remember seeing the
ARM presentations on why the instruction set dumped a lot of it. It's why an ARMv8 core only beats
an ARMv7 core by about 10% in AArch32 mode but running the same code in AArch64 mode you can
achieve a 50+% speedup. Losing RSB for a two instruction LSB/SUB combination was deemed far
superior in simplifying ALU operations.

@kruador
I think RSB was only really useful for this kind of operation. If you're not doing a shift on one
of the operands, you can just swap which register is which. But the 32-bit ARM architecture only
supports the shift on operand 2, so you have to have an instruction that does say Rdest :=
operand2 - Rn instead of Rdest := Rm - operand2.

ARM1 didn't even have a multiply instruction. Adds, shifts and subtracts were the only options out
there. No room for a multiplier in only 25,000 transistors! So RSB was really helpful there.
However, these days there an abundance of transistors available: even the lowly ARM Cortex-M0 (a
32-bit ARMv6 architecture core that only supports the Thumb instruction set, and not all of that)
can be configured with a single-cycle multiplier.

The main issue wasn't simplifying the ALU operations, I don't think, but simply releasing bits to
be able to encode more different operations and more registers. AArch64 needs three bits more per
instruction for register mapping - one for the destination register and one for each source -
because it has twice as many registers as AArch32 (32 vs 16).
```

## References
1. https://developer.arm.com/documentation/dui0473/m/overview-of-the-arm-architecture/access-to-the-inline-barrel-shifter 
2. https://www.davespace.co.uk/arm/introduction-to-arm/barrel-shifter.html
3. https://www.d.umn.edu/~gshute/logic/barrel-shifter.html
4. https://community.element14.com/technologies/fpga-group/b/blog/posts/systemverilog-study-notes-barrel-shifter-rtl-combinational-circuit
