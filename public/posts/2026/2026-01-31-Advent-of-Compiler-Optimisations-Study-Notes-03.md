---
tags: AoCO2025, Compiler, arm
---

## Study Notes: You can't fool the optimiser, Advent of Compiler Optimisations 2025

These notes are based on the post [**You can't fool the optimiser**](https://xania.org/202512/03-more-adding-integers) and the YouTube video [**[AoCO 3/25] More Adding**](https://www.youtube.com/watch?v=wHg9lYPMvvE&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=4) which are Day 3 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM` toolchain on `Ubuntu`.

Written by me and assisted by AI, proofread by me and assisted by AI. 

## Development Environment
```bash
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ clang -v
Ubuntu clang version 18.1.8

$ sudo apt install gcc-aarch64-linux-gnu libc6-dev-arm64-cross

$ aarch64-linux-gnu-gcc -v
COLLECT_GCC=aarch64-linux-gnu-gcc
gcc version 13.3.0 (Ubuntu 13.3.0-6ubuntu2~24.04)

$ qemu-aarch64 -version
qemu-aarch64 version 8.2.2 (Debian 1:8.2.2+ds-0ubuntu1.11)

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8

$ nvim --version
NVIM v0.11.5

$ echo $SHELL
/usr/bin/fish
```

## Recursion Integer Addition

We can observe the compiler's optimization by implementing addition through recursion, as shown in the following code:

```bash
$ nvim add.c
```

```c
#include <stdio.h>

unsigned add(unsigned x, unsigned y) {
  return y <= 0 ? x : add(x + 1, y - 1);
}

int main(void) {
  unsigned a = 1;
  unsigned b = 10;
  unsigned r = add(a, b);
  printf("%u = %u\n", r, a + b);
  return 0;
}
```

## Unoptimized Analysis

The following analysis examines the unoptimized assembly code generated with the `-O0` flag.

```bash
$ rm -f (path filter *.out)
$ clang -O0 -target aarch64-linux-gnu --sysroot=/usr/aarch64-linux-gnu -static add.c -o app.out
$ qemu-aarch64 ./app.out
11 = 11
```

```bash
$ llvm-objdump -d --disassemble-symbols=add app.out
```

```armasm
app.out:        file format elf64-littleaarch64

Disassembly of section .text:

00000000004007f0 <add>:
  4007f0: d10083ff    sub     sp, sp, #0x20         // Allocate 32 bytes on stack
  4007f4: a9017bfd    stp     x29, x30, [sp, #0x10] // Save Frame Pointer (x29) and Link Register (x30)
  4007f8: 910043fd    add     x29, sp, #0x10        // Set up new Frame Pointer
  4007fc: b81fc3a0    stur    w0, [x29, #-0x4]      // Store 'x' (w0) into stack
  400800: b9000be1    str     w1, [sp, #0x8]        // Store 'y' (w1) into stack
  400804: b9400be8    ldr     w8, [sp, #0x8]        // Load 'y' from stack into w8
  400808: 71000108    subs    w8, w8, #0x0          // Compare w8 (y) with 0
  40080c: 540000a8    b.hi    0x400820 <add+0x30>   // If y > 0, jump to recursive case (400820)
  400810: 14000001    b       0x400814 <add+0x24>   // Else, branch to base case logic
  400814: b85fc3a0    ldur    w0, [x29, #-0x4]      // [Base Case] Load 'x' into w0
  400818: b90007e0    str     w0, [sp, #0x4]        // Store 'x' as the potential return value
  40081c: 14000008    b       0x40083c <add+0x4c>   // Jump to epilogue (return)
  400820: b85fc3a8    ldur    w8, [x29, #-0x4]      // [Recursive Case] Load 'x' into w8
  400824: 11000500    add     w0, w8, #0x1          // w0 = x + 1 (Preparing 1st argument)
  400828: b9400be8    ldr     w8, [sp, #0x8]        // Load 'y' into w8
  40082c: 71000501    subs    w1, w8, #0x1          // w1 = y - 1 (Preparing 2nd argument)
  400830: 97fffff0    bl      0x4007f0 <add>        // Recursive call: add(x + 1, y - 1)
  400834: b90007e0    str     w0, [sp, #0x4]        // Store the recursive result onto stack
  400838: 14000001    b       0x40083c <add+0x4c>   // Jump to epilogue (return)
  40083c: b94007e0    ldr     w0, [sp, #0x4]        // Load the result from stack into w0
  400840: a9417bfd    ldp     x29, x30, [sp, #0x10] // Restore Frame Pointer and Link Register
  400844: 910083ff    add     sp, sp, #0x20         // Deallocate stack space
  400848: d65f03c0    ret                           // Return to caller
```

#### Part 01: Function Prologue
```armasm
4007f0: d10083ff      sub     sp, sp, #0x20           // Allocate 32 bytes on stack
4007f4: a9017bfd      stp     x29, x30, [sp, #0x10]   // Save Frame Pointer (x29) and Link Register (x30)
4007f8: 910043fd      add     x29, sp, #0x10          // Set up new Frame Pointer
```

Each recursive invocation initiates a Function Prologue to establish the execution context. 
The instruction `sub sp, sp, #0x20` performs Stack Allocation by decrementing the Stack Pointer (`SP`), reserving 32 bytes for the current Stack Frame.
The subsequent `stp` (Store Pair) instruction implements Context Saving, pushing the Frame Pointer (`X29`) and Link Register (`X30`) onto the stack to 
facilitate the Stack Unwinding process during the Function Epilogue.

```bash
| Higher Address |
|                |
+----------------+ <--- Previous SP
| Unused / Local | (16 bytes)
+----------------+ 
|  Link Register | (X30)
+----------------+ <--- X29 (New Frame Pointer)
|  Frame Pointer | (X29)
+----------------+ <--- SP  (Current Stack Pointer)
|                |
|  Lower Address |  
```

#### Part 02: Parameter Storage
```armasm
4007fc: b81fc3a0      stur    w0, [x29, #-0x4]        // Store 'x' (w0) into stack
400800: b9000be1      str     w1, [sp, #0x8]          // Store 'y' (w1) into stack
400804: b9400be8      ldr     w8, [sp, #0x8]          // Load 'y' from stack into w8
```

The input parameters `x` and `y` are stored from registers (`w0` and `w1`) into stack memory. 
Since it is at the `-O0` optimization level, 
an additional instruction is used to load `y` from stack memory back into a register (`w8`) for subsequent conditional evaluation.

#### Part 03: Branching
```armasm
400808: 71000108      subs    w8, w8, #0x0            // Compare w8 (y) with 0
40080c: 540000a8      b.hi    0x400820 <add+0x30>     // If y > 0, jump to recursive case (400820)
400810: 14000001      b       0x400814 <add+0x24>     // Else, branch to base case logic
```

The subs instruction performs an arithmetic subtraction to compare `y` (in `w8`) with `0`, 
updating the Condition Flags in the processor's state register. 
The `b.hi` (Branch if Higher) instruction then evaluates these flags: 
if `y > 0`, the Program Counter (`PC`) jumps to the Recursive Case; 
otherwise, it jumps to the Base Case.

#### Part 04: The Base Case: `y == 0`
```armasm
400814: b85fc3a0      ldur    w0, [x29, #-0x4]        // [Base Case] Load 'x' into w0
400818: b90007e0      str     w0, [sp, #0x4]          // Store 'x' as the potential return value
40081c: 14000008      b       0x40083c <add+0x4c>     // Jump to epilogue (return) (Part 06)
```

When the base case is met, the value of `x` is loaded into register `W0`. 
The compiler then executes a `store` operation from register `W0` to stack memory to preserve the 
return value.

#### Part 05: The Recursive Step: `add(x + 1, y - 1)`
```armasm
400820: b85fc3a8      ldur    w8, [x29, #-0x4]        // [Recursive Case] Load 'x' into w8
400824: 11000500      add     w0, w8, #0x1            // w0 = x + 1 (Preparing 1st argument)
400828: b9400be8      ldr     w8, [sp, #0x8]          // Load 'y' into w8
40082c: 71000501      subs    w1, w8, #0x1            // w1 = y - 1 (Preparing 2nd argument)
400830: 97fffff0      bl      0x4007f0 <add>          // Recursive call: add(x + 1, y - 1)
400834: b90007e0      str     w0, [sp, #0x4]          // Store the recursive result onto stack
400838: 14000001      b       0x40083c <add+0x4c>     // Jump to epilogue (return)
```

The compiler prepares the arguments for the recursive call by loading values from the stack into registers `w0` (`x + 1`) and `w1` (`y - 1`) according to the Procedure Call Standard. 
The `bl` (Branch with Link) instruction then executes the recursive call, redirecting the Control Flow back to the function start. 
Once the recursive call returns, the resulting value in `w0` is stored into stack memory before jumping to the epilogue.

#### Part 06: Function Epilogue
```armasm
40083c: b94007e0      ldr     w0, [sp, #0x4]          // Load the result from stack into w0
400840: a9417bfd      ldp     x29, x30, [sp, #0x10]   // Restore Frame Pointer and Link Register
400844: 910083ff      add     sp, sp, #0x20           // Deallocate stack space
400848: d65f03c0      ret                             // Return to caller
```

The function epilogue restores the caller's execution environment. 
The return value is loaded from stack memory into register `w0`. 
The `ldp` instruction performs a pair load to restore the frame pointer (`x29`) and link register (`x30`). 
Finally, the stack pointer (`sp`) is incremented by 32 bytes to perform stack deallocation before the ret instruction 
redirects the Control Flow back to the address stored in the link register.

## Optimized Analysis

The following analysis examines the optimized assembly code generated with the `-O2` flag.

```bash
$ rm -f (path filter *.out)
$ clang -O2 -target aarch64-linux-gnu --sysroot=/usr/aarch64-linux-gnu -static add.c -o app.out
$ qemu-aarch64 ./app.out
11 = 11
```

```bash
$ llvm-objdump -d --disassemble-symbols=add app.out
```

```armasm
app.out:        file format elf64-littleaarch64

Disassembly of section .text:

00000000004007f0 <add>:
  4007f0: 0b000020      add     w0, w1, w0
  4007f4: d65f03c0      ret
```

#### Recursion Call

In the unoptimized execution, each recursive call of `add(x + 1, y - 1)` triggers the function prologue, 
resulting in the allocation of a new activation record. 
This manifests as `O(n)` space complexity, as the stack grows linearly with the input value of `y`.

```bash
|   Higher Address   |
+--------------------+
|  add(1, 10) Frame  | (Initial Call: a = 1, b = 10)
+--------------------+
|  add(2, 9)  Frame  |
+--------------------+
|  add(3, 8)  Frame  |
+--------------------+
|  add(4, 7)  Frame  |
+--------------------+
|  add(5, 6)  Frame  |
+--------------------+
|  add(6, 5)  Frame  |
+--------------------+
|  add(7, 4)  Frame  |
+--------------------+
|  add(8, 3)  Frame  |
+--------------------+
|  add(9, 2)  Frame  |
+--------------------+
|  add(10, 1) Frame  |
+--------------------+
|  add(11, 0) Frame  | (Base Case: x = 11, returns x)
+--------------------+ <--- SP (Current Stack Pointer)
|   Lower Address    |
```

#### Tail Recursion Call

The `-O2` optimization level identifies the recursive call as a Tail Call. 
The compiler recognizes that the current stack frame can be reused, 
as no further operations are required after the callee returns. 
This reduces the space complexity from `O(n)` to `O(1)` and eliminates the overhead associated 
with stack frame allocation and deallocation.

```bash
|   Higher Address   |    |   Higher Address  |           |   Higher Address  |
+--------------------+    +-------------------+           +-------------------+ <-- Previous SP
|  add(1, 10) Frame  | -> |  add(2, 9) Frame  | -> ... -> |  add(11, 0) Frame |     (Reused for all steps)
+--------------------+    +-------------------+           +-------------------+ <-- SP 
|   Lower Address    |    |   Lower Address   |           |   Lower Address   |     (Static: Never moves)
```

#### Arithmetic Folding
While Tail Call Optimization handles the stack efficiency, Arithmetic Folding is an optimization technique 
where the compiler analyzes the symbolic behavior of a loop or recursion to replace it with a simplified mathematical expression.

#### Conclusion
Through Tail Call Optimization and Arithmetic Folding, 
the compiler optimizes the recursive logic by eliminating the stack-related and control-flow instructions (totaling 21 instructions) into a single `add` instruction. 
It effectively reduces the space complexity from `O(n)` to `O(1)` and minimizes the execution latency to a single instruction cycle.