---
layout: default
title: "What is closure"
date: 2025-03-28 
tag: c++
---

## draft v1

```scheme
(define add (lambda (a b) (+ a b)))
(display (add 1 2))
(newline)
```

```c++
#include <iostream>

int main(void) {
  auto add = [](int a, int b) {
    return a + b;
  };
  std::cout << add(1, 2) << "\n";
  return 0;
}
```
