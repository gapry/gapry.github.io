---
tags: compiler, x86
---

## Study Notes: Division, Advent of Compiler Optimisations 2025

These notes are based on the post [**Division**](https://xania.org/202512/06-dividing-to-conquer) and the YouTube video [**[AoCO 6/25] Integer Division**](https://www.youtube.com/watch?v=7Rtk0qOX9zs&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=7) which are Day 6 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

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

$ echo $SHELL
/usr/bin/fish
```

## x86 Signed Integer Division 

```bash
$ nvim div.c
```

```c
int div(int x) {
  return x / 512;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c div.c; llvm-objdump -d --x86-asm-syntax=att div.o
```

```text
div.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <div>:
       0: 8d 87 ff 01 00 00             leal    0x1ff(%rdi), %eax
       6: 85 ff                         testl   %edi, %edi
       8: 0f 49 c7                      cmovnsl %edi, %eax
       b: c1 f8 09                      sarl    $0x9, %eax
       e: c3                            retq
```

Instructions:
```text
- leal    <offset>(<base>), <Rd> ; <Rd>   = offset + base
- cmovnsl <Rs>, <Rd>             ; cmov   = conditional move
                                 ; ns     = Not Signed
                                 ; cmovns = Conditional Move if Not Sign
- sarl    <imm>, <Rd>            ; sar    = Shift Arithmetic Right
```

In C, signed integer division truncates toward zero. For example:
```c
#include <stdio.h>

int main(void) {
  printf("%d %d\n", 1 / 512, -1 / 512);
  return 0;
}
```

```bash
$ clang -o app.out main.c
$ ./app.out
$ 0 0
```

But replacing division with an arithmetic right shift does not produce the same result for negative numbers.

```c
#include <stdio.h>

int main(void) {
  printf("%d %d\n", 1 >> 9, -1 >> 9);
  return 0;
} 
```

```bash
$ clang -o app.out main.c
$ ./app.out
$ 0 -1
```

To resolve this problem, the compiler adds `2^n - 1` to the negative number.
In this case, n = 9, hence it is `2^9 - 1 = 512 - 1 = 511 = 0x1FF`

Why `2^n - 1` ? Let's consider `n = 9`

In binary, `2^9 - 1` creates the exactly 9 ones:

```text
  2^9 | 1 0 0 0 0 0 0 0 0 0
-   1 | 0 0 0 0 0 0 0 0 0 1
---------------------------
        0 1 1 1 1 1 1 1 1 1
```

It can help us to flip the bit of `x`. For example, `x = -1`
```text
Position | 32 (Sign Bit)           10                 1
         |  v                       v                 v
   Carry |  1 1 1 1 1 ... 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 
      -1 |  1 1 1 1 1 ... 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1  (0xFFFFFFFF)
   + 511 |  0 0 0 0 0 ... 0 0 0 0 0 1 1 1 1 1 1 1 1 1 1  (0x000001FF)
   ----- |-----------------------------------------------
     510 |  0 0 0 0 0 ... 0 0 0 0 0 1 1 1 1 1 1 1 1 1 0  (0x000001FE)
```

Hence, the compiler does `(-1 + 511) / 512 = 510 / 512 = 510 >> 9 = 0`, we get the correct result.

In summary, the compiler use the `cmovns` and `test` instructions to detect whether `x` is positive.
If `x` is a positive number, shift it. Otherwise, use `2^n - 1` to create an `n` one mask. 
Then we can use the shift operator to achieve the same result as we use the division operator.

## x86 Unsigned Integer Division 
```c
unsigned div(unsigned x) {
  return x / 512;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c div.c; llvm-objdump -d --x86-asm-syntax=att div.o
```

```text
div.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <div>:
       0: 89 f8                         movl    %edi, %eax
       2: c1 e8 09                      shrl    $0x9, %eax
       5: c3                            retq
```

Instruction: 
```text
shrl <imm>, <Rd> ; shr := Shift Right Logical, that is <Rd> = <Rd> >> <imm>
```

This case is easier than previous one. It only requires knowing what `shr` is.

You may also want to know the difference between `shr` and `sar`.

Here, I show an example to you.

| Original Dec | Original Binary | Operation | Result Binary |
| :----------- | :-------------- | :-------- | :------------ |
| 3            | 0b0011          | `shrl $2` | 0b0000        |
| 3            | 0b0011          | `sarl $2` | 0b0000        |
| -3           | 0b1101          | `shrl $2` | 0b0011        |
| -3           | 0b1101          | `sarl $2` | 0b1111        |

## Arm Signed Division (AArch64)
```bash
$ nvim div.c
```

```c
int div(int x) {
  return x / 512;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -target aarch64-linux-gnu -c div.c; llvm-objdump -d div.o
```

```text
div.o:  file format elf64-littleaarch64

Disassembly of section .text:

0000000000000000 <div>:
       0: 1107fc08      add     w8, w0, #0x1ff
       4: 7100001f      cmp     w0, #0x0
       8: 1a80b108      csel    w8, w8, w0, lt
       c: 13097d00      asr     w0, w8, #9
      10: d65f03c0      ret
```

The reason is the same as in the previous x86 case, we need to know why we need to use `0x1FF`.

Instructions:
```text
- add <Wd>, <Wn>, #imm          ; w8 = w0 + 0x1ff
- cmp <Wn>, #imm                ; Compares w0 with #0x0, and update the processor flags NZCV
- csel <Wd>, <Wn>, <Wm>, <cond> ; Conditional Select. 
                                ; If the condition lt (Less Than) is true, it selects w8; 
                                ; otherwise, it selects w0.
- asr <Wd>, <Wn>, #imm          : Arithmetic Shift Right, w0 = w8 >> 9
```

| Flag  | Name     | Bit | Description (when set to 1)                                 |
| :---  | :---     | :---| :---                                                        |
| **N** | Negative | 31  | The result of the operation was negative (MSB = 1).         |
| **Z** | Zero     | 30  | The result of the operation was exactly zero.               |
| **C** | Carry    | 29  | An unsigned overflow occurred (or a borrow in subtraction). |
| **V** | oVerflow | 28  | A signed overflow occurred (result exceeded signed range).  |

## Arm Unsigned Division (AArch64)
```bash
$ nvim div.c
```

```c
unsigned div(unsigned x) {
  return x / 512;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -target aarch64-linux-gnu -c div.c; llvm-objdump -d div.o
```

```text
div.o:  file format elf64-littleaarch64

Disassembly of section .text:

0000000000000000 <div>:
       0: 53097c00      lsr     w0, w0, #9
       4: d65f03c0      ret
```

Instruction: 
```text
lsr <Wd>, <Wn>, #imm ; Logical Shift Right, that is w0 = w0 >> 9.
```

## References
- https://developer.arm.com/documentation/ddi0601/latest/AArch64-Registers/NZCV--Condition-Flags
