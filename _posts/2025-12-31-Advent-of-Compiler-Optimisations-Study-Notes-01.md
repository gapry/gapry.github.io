---
layout: default
title: "Study Notes: Why xor eax, eax? "
date: 2026-01-01
tag: compiler
---

## Study Notes: Why xor eax, eax? 

These notes are based on the post [**Why xor eax, eax?**](https://xania.org/202512/01-xor-eax-eax), which is Day 1 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

#### Development Environment

{% highlight bash %}
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ gcc -v
gcc version 13.3.0

$ clang -v
Ubuntu clang version 18.1.8

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8
{% endhighlight %}

#### The different between `-O0`, `-O1`, and `-O2`

Basically, we know the compiler has the following stages. If we use the same code but choose different 
optimization levels, the final assembly code will be different.

{% highlight bash %}
                        [ FRONTEND ]         [ MIDDLE-END ]          [ BACKEND ]
                        .----------.         .------------.         .------------.
                        |  Lexer   |         |            |         |    Code    |
Source Code (*.c) --->  |    &     |  --->   |  Optimizer |  --->   |  Generator | ---> [ Assembly (*.s) ]
                        |  Parser  |         |            |         | (e.g. x86) |
                        '----------'         '------------'         '------------'       
{% endhighlight %}

For now, we use `main.c` as input (shown below), apply different optimization level, 
and use `llvm-objdump` to analyze the corresponding assembly code.

{% highlight bash %}
$ nvim main.c
{% endhighlight %}

```c
int main() {
  return 0;
}
```

###### Use `-O0` as optimization level

{% highlight bash %}
$ rm -f *.o; gcc -O0 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o
{% endhighlight %}

{% highlight bash %}
main.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <main>:
       0: f3 0f 1e fa                   endbr64
       4: 55                            pushq %rbp
       5: 48 89 e5                      movq  %rsp, %rbp
       8: b8 00 00 00 00                movl  $0x0, %eax
       d: 5d                            popq  %rbp
       e: c3                            retq
{% endhighlight %}

{% highlight bash %}
$ size main.o
{% endhighlight %}

{% highlight bash %}
text	   data	    bss	    dec	    hex	filename
 103	      0	      0	    103	     67	main.o
{% endhighlight %}

As `-O0`, the compiler generates a stack frame, leading to unnecessary instruction overhead. 

###### Use `-O1` as optimization level
{% highlight bash %}
$ rm -f *.o; gcc -O1 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o
{% endhighlight %}

{% highlight bash %}
main.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <main>:
       0: f3 0f 1e fa                   endbr64
       4: b8 00 00 00 00                movl  $0x0, %eax
       9: c3                            retq
{% endhighlight %}

{% highlight bash %}
$ size main.o
{% endhighlight %}

{% highlight bash %}
text	   data	    bss	    dec	    hex	filename
  90	      0	      0	     90	     5a	main.o
{% endhighlight %}

It reduces the output from six instructions to three by removing the stack frame setup. 

###### Use `-O2` as optimzing level
{% highlight bash %}
$ rm -f *.o; gcc -O2 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o
{% endhighlight %}

{% highlight bash %}
main.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <main>:
       0: f3 0f 1e fa                   endbr64
       4: 31 c0                         xorl  %eax, %eax
       6: c3                            retq
{% endhighlight %}

{% highlight bash %}
$ size main.o
{% endhighlight %}

{% highlight bash %}
text	   data	    bss	    dec	    hex	filename
  87	      0	      0	     87	     57	main.o
{% endhighlight %}

As you can see, `-02` and `-O1` are both produce three instructions. 
The only differences is that `-O2` changes from `movl` to `xorl`. 
The reason is the instructon size. `xorl %eax, %eax` only use two bytes,
making it smaller than the five bytes `movl  $0x0, %eax`.
Hence, you can see the total `.text` size reduces from 90 bytes to 87 bytes.

#### How about we change `gcc` to `clang`?
{% highlight bash %}
$ rm -f *.o; clang -O1 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o
{% endhighlight %}

{% highlight bash %}
rm -f *.o; clang -O1 -c main.c; llvm-objdump -d --x86-asm-syntax=att main.o

main.o: file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <main>:
       0: 31 c0                         xorl  %eax, %eax
       2: c3                            retq
{% endhighlight %}

You will find that the Clang's `-O1` output already use `xorl`, making it similar to GCC's `-O2`.
Additionally, it consists of only two instructions because Clang does not generate the `endbr64` instruction.

#### Why `eax`, not `rax` ?

{% highlight bash %}
$ nvim test2.c
{% endhighlight %}

```c
long get_zero_long() {
  return 0;
}
```

{% highlight bash %}
$ rm -f *.o; clang -O2 -c test2.c; llvm-objdump -d --x86-asm-syntax=att test2.o
{% endhighlight %}

{% highlight bash %}
test2.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <get_zero_long>:
       0: 31 c0                         xorl  %eax, %eax
       2: c3                            retq
{% endhighlight %}

As we know, the x86-64 calling converstion requires the return value to be stored in the 
64-bit `rax` register. However, we see that the compiler use the 32-bit `eax` register for the `xorl` instruction. 
The reason is that in x86-64, any operation that writes to a 32-bit register automatically zero-extends the result
into the upper 32 bits of the corresponding 64-bit register. 

#### Functon Arguments
{% highlight bash %}
$ nvim test3.c
{% endhighlight %}

```c
extern void fun(long arg1, 
                long arg2, 
                long arg3, 
                long arg4, 
                long arg5, 
                long arg6);

void test() {
  fun(0, 0, 0, 0, 0, 0);
}
```

{% highlight bash %}
$ rm -f *.o; clang -O2 -c test3.c; llvm-objdump -d --x86-asm-syntax=att test3.o
{% endhighlight %}

{% highlight bash %}
test3.o:  file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <test>:
       0: 31 ff                         xorl  %edi, %edi
       2: 31 f6                         xorl  %esi, %esi
       4: 31 d2                         xorl  %edx, %edx
       6: 31 c9                         xorl  %ecx, %ecx
       8: 45 31 c0                      xorl  %r8d, %r8d
       b: 45 31 c9                      xorl  %r9d, %r9d
       e: e9 00 00 00 00                jmp 0x13 <test+0x13>
{% endhighlight %}
