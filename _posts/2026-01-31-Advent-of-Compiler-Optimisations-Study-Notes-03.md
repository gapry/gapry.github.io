---
layout: default
title: "Study Notes: You can't fool the optimiser"
date: 2026-01-31
tag: compiler
---

## Study Notes: You can't fool the optimiser

These notes are based on the post [**You can't fool the optimiser**](https://xania.org/202512/03-more-adding-integers) and the YouTube video [**[AoCO 3/25] More Adding**](https://www.youtube.com/watch?v=wHg9lYPMvvE&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=4) which are Day 3 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM` toolchain on `Ubuntu`.

Written by me and assisted by AI, proofread by me and assisted by AI. 

## Development Environment
{% highlight bash %}
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

$ echo $SHELL
/usr/bin/fish

{% endhighlight %}

## Integer Addition
{% highlight bash %}
$ nvim add.c
{% endhighlight %}

```c
#include <stdio.h>

unsigned add(unsigned x, unsigned y) {
  return y <= 0 ? x : add(x + 1, y - 1);
}

int main(void) {
  unsigned a = 1;
  unsigned b = 10;
  unsigned r = add(a, b);
  printf("%d = %d\n", r, a + b);
  return 0;
}
```

## Unoptimized Analysis

{% highlight bash %}
$ rm -f (path filter *.out); clang -O0 -target aarch64-linux-gnu --sysroot=/usr/aarch64-linux-gnu -static add.c -o app.out; qemu-aarch64 ./app.out
11 = 11
{% endhighlight %}

{% highlight bash %}
$ llvm-objdump -d --disassemble-symbols=add app.out

app.out:        file format elf64-littleaarch64

Disassembly of section .text:

00000000004007f0 <add>:
  4007f0: d10083ff      sub     sp, sp, #0x20
  4007f4: a9017bfd      stp     x29, x30, [sp, #0x10]
  4007f8: 910043fd      add     x29, sp, #0x10
  4007fc: b81fc3a0      stur    w0, [x29, #-0x4]
  400800: b9000be1      str     w1, [sp, #0x8]
  400804: b9400be8      ldr     w8, [sp, #0x8]
  400808: 71000108      subs    w8, w8, #0x0
  40080c: 540000a8      b.hi    0x400820 <add+0x30>
  400810: 14000001      b       0x400814 <add+0x24>
  400814: b85fc3a0      ldur    w0, [x29, #-0x4]
  400818: b90007e0      str     w0, [sp, #0x4]
  40081c: 14000008      b       0x40083c <add+0x4c>
  400820: b85fc3a8      ldur    w8, [x29, #-0x4]
  400824: 11000500      add     w0, w8, #0x1
  400828: b9400be8      ldr     w8, [sp, #0x8]
  40082c: 71000501      subs    w1, w8, #0x1
  400830: 97fffff0      bl      0x4007f0 <add>
  400834: b90007e0      str     w0, [sp, #0x4]
  400838: 14000001      b       0x40083c <add+0x4c>
  40083c: b94007e0      ldr     w0, [sp, #0x4]
  400840: a9417bfd      ldp     x29, x30, [sp, #0x10]
  400844: 910083ff      add     sp, sp, #0x20
  400848: d65f03c0      ret
{% endhighlight %}

## Optimized Analysis

{% highlight bash %}
$ rm -f (path filter *.out); clang -O2 -target aarch64-linux-gnu --sysroot=/usr/aarch64-linux-gnu -static add.c -o app.out; qemu-aarch64 ./app.out
11 = 11
{% endhighlight %}

{% highlight bash %}
$ llvm-objdump -d --disassemble-symbols=add app.out

app.out:        file format elf64-littleaarch64

Disassembly of section .text:

00000000004007f0 <add>:
  4007f0: 0b000020      add     w0, w1, w0
  4007f4: d65f03c0      ret
{% endhighlight %}

## Tail Recursion