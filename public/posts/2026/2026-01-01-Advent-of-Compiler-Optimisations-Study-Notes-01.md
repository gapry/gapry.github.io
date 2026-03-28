---
tags: compiler, x86
---

## Study Notes: Why xor eax, eax?, Advent of Compiler Optimisations 2025

These notes are based on the post [**Why xor eax, eax?**](https://xania.org/202512/01-xor-eax-eax), which is Day 1 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

#### Development Environment

```bash
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ gcc -v
gcc version 13.3.0

$ clang -v
Ubuntu clang version 18.1.8

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8

$ lldb -v
lldb version 18.1.8

$ nvim --version
NVIM v0.11.5

$ echo $SHELL
/usr/bin/fish
```

#### The difference between `-O0`, `-O1`, and `-O2`

Basically, we know the compiler has the following stages. If we use the same code but choose different 
optimization levels, the final assembly code will be different.

```text
                        [ FRONTEND ]         [ MIDDLE-END ]          [ BACKEND ]
                        .----------.         .------------.         .------------.
                        |  Lexer   |         |            |         |    Code    |
Source Code (*.c) --->  |    &     |  --->   |  Optimizer |  --->   |  Generator | ---> [ Assembly (*.s) ]
                        |  Parser  |         |            |         | (e.g. x86) |
                        '----------'         '------------'         '------------'       
```

For now, we use `main.c` as input (shown below), apply different optimization levels, 
and use `llvm-objdump` to analyze the corresponding assembly code.

```bash
$ nvim main.c
```

```c
int main() {
  return 0;
}
```

###### Use `-O0` as optimization level

```bash
$ rm -f (path filter *.o); gcc -O0 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o
```

```bash
main.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <main>:
       0: f3 0f 1e fa                   endbr64
       4: 55                            pushq %rbp
       5: 48 89 e5                      movq  %rsp, %rbp
       8: b8 00 00 00 00                movl  $0x0, %eax
       d: 5d                            popq  %rbp
       e: c3                            retq
```

```bash
$ size main.o
```

```bash
text	   data	    bss	    dec	    hex	filename
 103	      0	      0	    103	     67	main.o
```

As `-O0`, the compiler generates a stack frame, leading to unnecessary instruction overhead. 

###### Use `-O1` as optimization level
```
$ rm -f (path filter *.o); gcc -O1 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o
```

```bash
main.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <main>:
       0: f3 0f 1e fa                   endbr64
       4: b8 00 00 00 00                movl  $0x0, %eax
       9: c3                            retq
```

```bash
$ size main.o
```

```bash
text	   data	    bss	    dec	    hex	filename
  90	      0	      0	     90	     5a	main.o
```

It reduces the output from six instructions to three by removing the stack frame setup. 

###### Use `-O2` as optimization level
```bash
$ rm -f (path filter *.o); gcc -O2 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o
```

```bash
main.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <main>:
       0: f3 0f 1e fa                   endbr64
       4: 31 c0                         xorl  %eax, %eax
       6: c3                            retq
```

```bash
$ size main.o
```

```bash
text	   data	    bss	    dec	    hex	filename
  87	      0	      0	     87	     57	main.o
```

As you can see, `-O2` and `-O1` both produce three instructions. 
The only differences is that `-O2` changes from `movl` to `xorl`. 
The reason is the instruction size. `xorl %eax, %eax` only use two bytes,
making it smaller than the five bytes `movl  $0x0, %eax`.
Hence, you can see the total `.text` size reduces from 90 bytes to 87 bytes.

#### How about we change `gcc` to `clang`?
```bash
$ rm -f (path filter *.o); clang -O1 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o
```

```bash
rm -f (path filter *.o); clang -O1 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o

main.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <main>:
       0: 31 c0                         xorl  %eax, %eax
       2: c3                            retq
```

You will find that the Clang's `-O1` output already uses `xorl`, making it similar to GCC's `-O2`.
Additionally, it consists of only two instructions because Clang does not generate the `endbr64` instruction.

#### Why `eax`, not `rax` ?

```bash
$ nvim get_val.c
```

```c
long get_val() {
  return 0;
}
```

```bash
$ rm -f (path filter *.o); clang -O2 -c get_val.c; llvm-objdump -d --x86-asm-syntax=att get_val.o
```

```bash
get_val.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <get_val>:
       0: 31 c0                         xorl  %eax, %eax
       2: c3                            retq
```

As we know, the x86-64 calling convention requires the return value to be stored in the 
64-bit `rax` register. However, we see that the compiler uses the 32-bit `eax` register for the `xorl` instruction. 
The reason is that in x86-64, any operation that writes to a 32-bit register automatically zero-extends the result
into the upper 32 bits of the corresponding 64-bit register. 

Let's see an example for verifying Zero-Extension with LLDB

```bash
$ nvim main.c
```

```c
int main() {
  return 0;
}
```

```bash
$ rm -f (path filter *.out); clang -g -O2 -o app.out main.c; lldb app.out
```

```bash
(lldb) target create "app.out"
Current executable set to '/home/gapry/Workspaces/test/app.out' (x86_64).
(lldb) breakpoint set -n main
Breakpoint 1: where = app.out`main at main.c:2:3, address = 0x0000000000001130
(lldb) r
Process 409020 launched: '/home/gapry/Workspaces/test/app.out' (x86_64)
Process 409020 stopped
* thread #1, name = 'app.out', stop reason = breakpoint 1.1
    frame #0: 0x0000555555555130 app.out`main at main.c:2:3
   1   	int main() {
-> 2   	  return 0;
   3   	}
(lldb) register write rax 0xffffffffffffffff
(lldb) register read rax
     rax = 0xffffffffffffffff
(lldb) disassemble --pc
app.out`main:
->  0x555555555130 <+0>: xorl   %eax, %eax
    0x555555555132 <+2>: retq
    0x555555555133:      addb   %dh, %bl
(lldb) thread step-inst
Process 409020 stopped
* thread #1, name = 'app.out', stop reason = instruction step into
    frame #0: 0x0000555555555132 app.out`main at main.c:2:3
   1   	int main() {
-> 2   	  return 0;
   3   	}
(lldb) disassemble --pc
app.out`main:
->  0x555555555132 <+2>: retq
    0x555555555133:      addb   %dh, %bl
(lldb) register read rax
     rax = 0x0000000000000000
(lldb)
```

The LLDB output confirms that even though `xorl` only targets the lower 32 bits `%eax` register,
the hardware automatically cleared the entire 64-bit `%rax` register.

#### Caller/Callee Arguments
```bash
$ nvim main.c
```

```c
extern void g(long arg1, 
              long arg2, 
              long arg3, 
              long arg4, 
              long arg5, 
              long arg6);

void f() {
  g(0, 0, 0, 0, 0, 0);
}
```

```bash
$ rm -f (path filter *.o)
$ clang -O2 -c main.c
$ llvm-objdump -d --disassemble-symbols=f --x86-asm-syntax=att main.o
```

```bash
main.o:	file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <f>:
       0: 31 ff                        	xorl	%edi, %edi
       2: 31 f6                        	xorl	%esi, %esi
       4: 31 d2                        	xorl	%edx, %edx
       6: 31 c9                        	xorl	%ecx, %ecx
       8: 45 31 c0                     	xorl	%r8d, %r8d
       b: 45 31 c9                     	xorl	%r9d, %r9d
       e: e9 00 00 00 00               	jmp	0x13 <f+0x13>
```

According to the x86-64 System V ABI, the first six integer or pointer arguments are passed in
specific registers. To pass `0` to all of them, the compiler again uses the `xorl` optimization to
zero out each one:

| Argument | 64-bit Register | 32-bit Register |
| :---     | :---            | :---            |
| 1st      | `%rdi`          | `%edi`          |
| 2nd      | `%rsi`          | `%esi`          |
| 3rd      | `%rdx`          | `%edx`          |
| 4th      | `%rcx`          | `%ecx`          |
| 5th      | `%r8`           | `%r8d`          |
| 6th      | `%r9`           | `%r9d`          |

The `xorl` optimization does not only appear for return values, you will also see it frequently
when a caller prepares arguments for a callee. As with the previous example, zeroing the 32-bit
version of these registers automatically zero-extends to the full 64-bit register.   

## References
- [x64 architecture](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/x64-architecture)