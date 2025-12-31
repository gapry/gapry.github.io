---
layout: default
title: "The Day 01 Advent of Compiler Optimisations Study Notes"
date: 2025-12-31
tag: compiler
---

## The Day 01 Advent of Compiler Optimisations Study Notes

#### Why `xor`, not `mov` ?

{% highlight bash %}
$ nvim test.c
{% endhighlight %}

```c
int test() {
  return 0;
}
```

{% highlight bash %}
$ rm -f *.o; gcc -O0 -c test.c; llvm-objdump -d --x86-asm-syntax=att test.o
{% endhighlight %}

{% highlight bash %}
test.o:	file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <test>:
       0: f3 0f 1e fa                  	endbr64
       4: 55                           	pushq	%rbp
       5: 48 89 e5                     	movq	%rsp, %rbp
       8: b8 00 00 00 00               	movl	$0x0, %eax
       d: 5d                           	popq	%rbp
       e: c3                           	retq
{% endhighlight %}

{% highlight bash %}
$ rm -f *.o; gcc -O1 -c test.c; llvm-objdump -d --x86-asm-syntax=att test.o
{% endhighlight %}

{% highlight bash %}
test.o:	file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <test>:
       0: f3 0f 1e fa                  	endbr64
       4: b8 00 00 00 00               	movl	$0x0, %eax
       9: c3                           	retq
{% endhighlight %}

{% highlight bash %}
$ rm -f *.o; gcc -O2 -c test.c; llvm-objdump -d --x86-asm-syntax=att test.o
{% endhighlight %}

{% highlight bash %}
test.o:	file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <test>:
       0: f3 0f 1e fa                  	endbr64
       4: 31 c0                        	xorl	%eax, %eax
       6: c3 
{% endhighlight %}

{% highlight bash %}
$ rm -f *.o; clang -O0 -c test.c; llvm-objdump -d --x86-asm-syntax=att test.o
{% endhighlight %}

{% highlight bash %}
test.o:	file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <test>:
       0: 55                           	pushq	%rbp
       1: 48 89 e5                     	movq	%rsp, %rbp
       4: 31 c0                        	xorl	%eax, %eax
       6: 5d                           	popq	%rbp
       7: c3                           	retq
{% endhighlight %}

{% highlight bash %}
$ rm -f *.o; clang -O1 -c test.c; llvm-objdump -d --x86-asm-syntax=att test.o
{% endhighlight %}

{% highlight bash %}
rm -f *.o; clang -O1 -c test.c; llvm-objdump -d --x86-asm-syntax=att test.o

test.o:	file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <test>:
       0: 31 c0                        	xorl	%eax, %eax
       2: c3                           	retq
{% endhighlight %}

{% highlight bash %}
$ rm -f *.o; clang -O2 -c test.c; llvm-objdump -d --x86-asm-syntax=att test.o
{% endhighlight %}

{% highlight bash %}
test.o:	file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <test>:
       0: 31 c0                        	xorl	%eax, %eax
       2: c3                           	retq
{% endhighlight %}

{% highlight bash %}
$ nvim test2.c
{% endhighlight %}

#### Why `eax`, not `rax` ?

```c
long get_zero_long() {
  return 0;
}
```

{% highlight bash %}
$ rm -f *.o; clang -O2 -c test2.c; llvm-objdump -d --x86-asm-syntax=att test2.o
{% endhighlight %}

{% highlight bash %}
test2.o:	file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <get_zero_long>:
       0: 31 c0                        	xorl	%eax, %eax
       2: c3                           	retq
{% endhighlight %}

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
test3.o:	file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <test>:
       0: 31 ff                        	xorl	%edi, %edi
       2: 31 f6                        	xorl	%esi, %esi
       4: 31 d2                        	xorl	%edx, %edx
       6: 31 c9                        	xorl	%ecx, %ecx
       8: 45 31 c0                     	xorl	%r8d, %r8d
       b: 45 31 c9                     	xorl	%r9d, %r9d
       e: e9 00 00 00 00               	jmp	0x13 <test+0x13>
{% endhighlight %}