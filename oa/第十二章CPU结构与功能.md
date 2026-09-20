# Chapter 12 Exercises

## 1. True or False

RISC machines must use pipeline technology.

**Correct Answer: True**

**解析：**  
在本章教材语境中，RISC 机通常与流水线技术紧密结合。  
RISC 指令格式规整、指令长度较统一、寻址方式较少、操作较简单，这些特点非常适合流水线处理。  
通过流水线，可以让多条指令在取指、译码、执行、访存、写回等阶段重叠执行，从而提高指令吞吐率。  
因此本题判断为正确。

---

## 2. True or False

The main goal of RISC is to reduce the number of instructions.

**Correct Answer: False**

**解析：**  
RISC 的核心目标不是单纯减少“程序中的指令条数”，而是通过简化指令系统、规整指令格式、减少寻址方式、加强寄存器使用和优化流水线，使每条指令执行得更快、更容易并行。  

RISC 的思想是：  
复杂操作可以由多条简单指令组合完成，但每条简单指令执行速度快、控制逻辑简单、流水线效率高。  
所以 RISC 并不一定让程序总指令条数减少，有时反而会增加指令条数。  
因此该说法错误。

---

## 3. True or False

Early computer instructions were relatively simple, so RISC technology made computer architecture return to the level of early computers.

**Correct Answer: False**

**解析：**  
RISC 虽然强调“精简指令集”，但它并不是简单地退回到早期计算机水平。  
早期计算机指令简单，主要是因为硬件资源有限、体系结构尚不成熟。  
而 RISC 是在对程序执行特征、编译优化、流水线技术、寄存器组织等深入研究基础上形成的体系结构思想。  

RISC 的“简单”是为了提高执行效率、优化流水线和降低控制复杂度，而不是技术倒退。  
因此该说法错误。

---

## 4. True or False

The use of a large register file makes it unnecessary for RISC machines to use Cache organizations.

**Correct Answer: False**

**解析：**  
大寄存器组可以减少对主存的访问次数，因为更多临时变量、局部变量和参数可以保存在寄存器中。  
但是寄存器数量再多，也不可能完全替代 Cache。  

Cache 的作用是缓解 CPU 与主存之间的速度差异，保存近期可能访问的主存数据和指令副本。  
RISC 机虽然大量使用寄存器，但仍然需要 Cache 来提高指令访问和数据访问速度。  
因此“大寄存器组使 RISC 不再需要 Cache”是错误的。

---

## 5. True or False

Graph coloring is essentially a time-multiplexing technique that allocates physical registers to different symbolic register variables at different times.

**Correct Answer: True**

**解析：**  
图染色技术常用于编译器的寄存器分配。  
程序中的变量可以看作“符号寄存器变量”，如果两个变量的生命周期不重叠，它们就可以使用同一个物理寄存器。  

图染色的基本思想是：

- 把变量之间的冲突关系表示成图；
- 如果两个变量不能使用同一个寄存器，就在它们之间连边；
- 给图中的结点染色，每种颜色对应一个物理寄存器。

这样就可以在不同时间把同一个物理寄存器分配给不同变量，本质上体现了寄存器资源的分时复用。  
因此该说法正确。

---

## 6. Single Choice

Which of the following is not a main characteristic of RISC machines?

A. They all have a limited and simple instruction set.  
B. They use a large number of registers or optimize register usage through the compiler.  
C. They emphasize optimization of the instruction pipeline.  
D. The Cache capacity of RISC machines is relatively small.  

**Correct Answer: D**

**解析：**  
RISC 的主要特点包括：

- 指令系统精简，指令数量较少；
- 指令格式规整，寻址方式较少；
- 大多数指令可以在一个时钟周期内完成；
- 大量使用寄存器，减少访存次数；
- 强调编译优化；
- 适合流水线执行。

而 Cache 容量是否较小并不是 RISC 的主要特征。  
RISC 机同样需要 Cache 来解决 CPU 与主存速度不匹配的问题，Cache 容量大小取决于具体处理器设计，而不是 RISC 的本质特征。  
所以选 D。

---

## 7. Single Choice

Which of the following statements about instruction execution characteristics is incorrect?

A. Branch statements are used at a low frequency in high-level language programs.  
B. Procedure calls and returns are among the most time-consuming operations in typical high-level language programs.  
C. Scalar variables are accessed frequently in high-level language programs.  
D. Assignment statements occur with the highest frequency.  

**Correct Answer: A**

**解析：**  
RISC 设计的重要依据之一是对高级语言程序运行特征的统计分析。  
一般来说，高级语言程序中赋值语句出现频率很高，标量变量访问也很频繁；过程调用和返回虽然出现频率不一定最高，但往往开销较大。  

分支语句并不是低频操作。条件判断、循环控制、函数调用返回等都会引起控制流变化，因此转移类操作在程序中并不少见。  
所以 A“高级语言程序中判断语句使用频率较低”是不正确的。

---

## 8. Single Choice

Which of the following statements about RISC is correct?

A. A machine using pipeline technology must be a RISC machine.  
B. A RISC machine generally has a compiler with relatively powerful functions.  
C. In a RISC machine, all global variables should be placed in registers.  
D. A RISC machine must have a large number of physical registers.  

**Correct Answer: B**

**解析：**  
RISC 体系结构非常依赖编译器优化。  
由于 RISC 指令简单，很多复杂操作需要由编译器用多条简单指令组合实现，因此编译器需要承担更多优化任务，例如寄存器分配、指令调度、流水线相关优化等。  
所以 B 正确。

其他选项分析：

- A 错误：采用流水线技术的机器不一定是 RISC，CISC 处理器也可以使用流水线。
- C 错误：全局变量不可能全部放入寄存器，寄存器资源有限，而且全局变量可能需要长期保存在内存中。
- D 错误：RISC 通常倾向于使用较多寄存器，但“必须有大量物理寄存器”说法过于绝对。

因此选 B。

---

## 9. Single Choice

A register set with $N$ windows can contain variables of at most ( ) processes at the same time.

A. $N$  
B. $N+1$  
C. $N-1$  
D. $2N$  

**Correct Answer: C**

**解析：**  
RISC 中的寄存器窗口常用于加快过程调用和返回。  
相邻过程的寄存器窗口之间通常会有一部分重叠区域，用来传递参数和返回值。  

由于寄存器窗口之间存在重叠，并且还需要为当前过程和调用关系保留窗口，因此一个 $N$ 窗口的寄存器组通常最多只能同时容纳：

$$
N-1
$$

个过程的变量。  

所以选 C。

---

## 10. Single Choice

Which of the following statements about RISC is incorrect?

A. RISC generally adopts a microprogrammed controller.  
B. Most RISC instructions are completed within one clock cycle.  
C. RISC has fewer instructions and fewer instruction classes than CISC.  
D. RISC has fewer addressing modes than CISC.  

**Correct Answer: A**

**解析：**  
RISC 为了提高执行速度，通常采用**硬布线控制器**，而不是微程序控制器。  
硬布线控制速度快，适合简单、规整的 RISC 指令系统。  

微程序控制器更常见于复杂指令系统计算机 CISC，因为 CISC 指令复杂，用微程序实现控制逻辑更灵活。  

其他选项都是 RISC 的典型特点：

- 大多数指令尽量在一个时钟周期完成；
- 指令数量和指令种类比 CISC 少；
- 寻址方式比 CISC 少。

所以错误的是 A。

---

## 11. True or False

The addresses used by register sets are much shorter than Cache and memory addresses.

**Correct Answer: True**

**解析：**  
寄存器数量远少于 Cache 或主存中的存储单元数量，因此寄存器编号所需的位数很少。  
例如，如果 CPU 有 32 个寄存器，则寄存器编号只需要：

$$
\log_2 32 = 5
$$

位。  

而主存地址可能需要 32 位、64 位甚至更多。  
因此寄存器组所使用的地址，也就是寄存器编号，确实比 Cache 和内存地址短得多。  
该说法正确。

---

## 12. True or False

Almost all RISC instructions use simple register addressing.

**Correct Answer: True**

**解析：**  
RISC 的一个重要特点是大量使用寄存器操作。  
算术逻辑运算通常在寄存器之间进行，而不是直接对主存操作。  
访存一般只由专门的 Load/Store 指令完成。  

因此，RISC 中大量指令都会使用简单的寄存器寻址方式，这有利于：

- 缩短指令格式；
- 简化译码；
- 提高执行速度；
- 便于流水线设计。

所以该说法正确。

---

## 13. Single Choice

The instruction position after a branch instruction is called a ( ).

A. Delayed load  
B. Delayed file  
C. Delay slot  
D. Delayed register  

**Correct Answer: C**

**解析：**  
在某些流水线处理器中，转移指令执行后，转移目标地址并不能立即生效。  
为了充分利用这段延迟时间，处理器会规定转移指令后面的一个或多个指令位置仍然会被执行，这些位置称为**延迟槽**。

延迟槽常用于减少分支带来的流水线停顿。  
编译器可以尝试把对程序结果没有影响的有用指令放入延迟槽中执行，从而提高流水线效率。  
所以选 C。