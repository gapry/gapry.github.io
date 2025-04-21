---
layout: default
title: "What is closure"
date: 2025-04-21 
tag: c++
---

<script type="text/javascript" async
  src="https://cdn.jsdelivr.net/npm/mathjax@2/MathJax.js?config=TeX-MML-AM_CHTML">
</script>

## draft v1

The formula: $$ \mathtt{(\lambda\ (a\ b)\ (+\ a\ b))} $$

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
