#include <iostream>

int main(void) {
  auto add = [](int a, int b) {
    return a + b;
  };
  std::cout << add(1, 2) << "\n";
  return 0;
}
