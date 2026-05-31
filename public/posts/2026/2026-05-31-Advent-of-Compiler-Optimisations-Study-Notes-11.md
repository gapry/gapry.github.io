---
tags: AoCO2025, Compiler, x86
---

## Study Notes: Counting Bits, Advent of Compiler Optimisations 2025

These notes are based on the post [**Pop goes the...population count?**](https://xania.org/202512/11-pop-goes-the-weasel-er-count) and the YouTube video [**[AoCO 11/25] Counting Bits**](https://www.youtube.com/watch?v=Hu0vu1tpZnc&list=PL2HVqYf7If8cY4wLk7JUQ2f0JXY_xMQm2&index=12) which are Day 11 of the [Advent of Compiler Optimisations 2025](https://xania.org/AoCO2025-archive) Series by [Matt Godbolt](https://xania.org/MattGodbolt).

My notes focus on reproducing and verifying [Matt Godbolt](https://xania.org/MattGodbolt)'s teaching within a local development environment using `LLVM toolchain` on `Ubuntu`.

Written by me and assisted by AI, proofread by me and assisted by AI. 

## Development Environment
```bash
$ lsb_release -d
Description:	Ubuntu 24.04.3 LTS

$ clang++ --version
Ubuntu clang version 18.1.8 

$ llvm-objdump -v
Ubuntu LLVM version 18.1.8
```
