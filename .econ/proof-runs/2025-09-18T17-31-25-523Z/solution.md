1. Summary

a. Verdict:

I have found a complete solution. The final answer is
\[
\hat\beta_1 \;=\; (X_1^\top M_2 X_1)^{-1} X_1^\top M_2 y,
\]
where $P_2 = X_2(X_2^\top X_2)^{-1}X_2^\top$ and $M_2 = I_n - P_2$.

b. Method Sketch:

Overall strategy: Derive the block normal equations for the full regression of $y$ on $X=[X_1\ X_2]$, solve the second block for $\hat\beta_2$ in terms of $\hat\beta_1$, substitute into the first block, and simplify to obtain a linear system in $\hat\beta_1$ with coefficient matrix $X_1^\top M_2 X_1$ and right-hand side $X_1^\top M_2 y$. Finally, show this coefficient matrix is invertible under the stated rank assumptions, giving the stated formula.

Key lemmas and precise statements used:

Lemma 1 (Projection and annihilator properties).
Let $P_2 = X_2(X_2^\top X_2)^{-1}X_2^\top$ and $M_2 = I_n - P_2$. Then
- $P_2^\top = P_2$ and $P_2^2 = P_2$ (so $P_2$ is the orthogonal projection onto $\operatorname{col}(X_2)$),
- $M_2^\top = M_2$ and $M_2^2 = M_2$,
- $P_2 X_2 = X_2$ and $M_2 X_2 = 0$.

Lemma 2 (Invertibility).
Under $\operatorname{rank}(X_2)=k_2$ and $\operatorname{rank}(X)=k_1+k_2$, the matrix $X_1^\top M_2 X_1$ is positive definite and hence invertible:
\[
v^\top (X_1^\top M_2 X_1) v = \|M_2 X_1 v\|_2^2 > 0 \quad\text{for all } v\in\mathbb{R}^{k_1}\setminus\{0\}.
\]

These lemmas justify rewriting the block Schur-complement expression as $X_1^\top M_2 X_1$ and guarantee its invertibility, yielding the stated explicit formula for $\hat\beta_1$.

2. Detailed Solution

Let $\hat\beta=(\hat\beta_1^\top,\hat\beta_2^\top)^\top$ be the ordinary least squares estimator from regressing $y\in\mathbb{R}^n$ on $X=[X_1\ X_2]$ with $X_1\in\mathbb{R}^{n\times k_1}$ and $X_2\in\mathbb{R}^{n\times k_2}$. The normal equations are
\[
X^\top X\,\hat\beta \;=\; X^\top y.
\]
Partitioning according to $X=[X_1\ X_2]$ and $\hat\beta=(\hat\beta_1^\top,\hat\beta_2^\top)^\top$ yields the block system
\[
\begin{pmatrix}
X_1^\top X_1 & X_1^\top X_2\\[6pt]
X_2^\top X_1 & X_2^\top X_2
\end{pmatrix}
\begin{pmatrix}\hat\beta_1\\[6pt]\hat\beta_2\end{pmatrix}
\;=\;
\begin{pmatrix}X_1^\top y\\[6pt]X_2^\top y\end{pmatrix}.
\]

Because $\operatorname{rank}(X_2)=k_2$, the Gram matrix $X_2^\top X_2$ is invertible. The second block row gives
\[
X_2^\top X_1\,\hat\beta_1 \;+\; X_2^\top X_2\,\hat\beta_2 \;=\; X_2^\top y,
\]
so
\[
\hat\beta_2 \;=\; (X_2^\top X_2)^{-1}\big( X_2^\top y - X_2^\top X_1\,\hat\beta_1\big).
\]
Substitute this expression for $\hat\beta_2$ into the first block row:
\[
X_1^\top X_1\,\hat\beta_1 \;+\; X_1^\top X_2\,\hat\beta_2 \;=\; X_1^\top y,
\]
which becomes
\[
X_1^\top X_1\,\hat\beta_1 \;+\; X_1^\top X_2\,(X_2^\top X_2)^{-1}\big( X_2^\top y - X_2^\top X_1\,\hat\beta_1\big)
\;=\; X_1^\top y.
\]
Rearrange to collect terms multiplied by $\hat\beta_1$:
\[
\Big( X_1^\top X_1 \;-\; X_1^\top X_2\,(X_2^\top X_2)^{-1} X_2^\top X_1\Big)\hat\beta_1
\;=\;
X_1^\top y \;-\; X_1^\top X_2\,(X_2^\top X_2)^{-1} X_2^\top y.
\]

Define the projection matrix onto $\operatorname{col}(X_2)$ by
\[
P_2 := X_2(X_2^\top X_2)^{-1}X_2^\top,
\]
and the residual-maker (annihilator) matrix by
\[
M_2 := I_n - P_2.
\]
From these definitions,
\[
X_1^\top X_2\,(X_2^\top X_2)^{-1} X_2^\top X_1 = X_1^\top P_2 X_1,
\qquad
X_1^\top X_2\,(X_2^\top X_2)^{-1} X_2^\top y = X_1^\top P_2 y,
\]
hence the previous equation is
\[
\big( X_1^\top X_1 - X_1^\top P_2 X_1 \big)\hat\beta_1 = X_1^\top y - X_1^\top P_2 y.
\]
Equivalently,
\[
X_1^\top (I_n - P_2) X_1\,\hat\beta_1 \;=\; X_1^\top (I_n - P_2) y,
\]
so
\[
X_1^\top M_2 X_1\,\hat\beta_1 \;=\; X_1^\top M_2 y.
\]

It remains to show $X_1^\top M_2 X_1$ is invertible. First note basic properties of $P_2$ and $M_2$:

- $P_2$ is symmetric and idempotent: $P_2^\top = P_2$ and $P_2^2 = P_2$; hence $M_2^\top = M_2$ and $M_2^2 = M_2$.
- $P_2$ projects onto $\operatorname{col}(X_2)$, so $P_2 X_2 = X_2$ and therefore $M_2 X_2 = 0$.

For any nonzero vector $v\in\mathbb{R}^{k_1}$,
\[
v^\top (X_1^\top M_2 X_1) v \;=\; (X_1 v)^\top M_2 (X_1 v) \;=\; \|M_2 X_1 v\|_2^2 \ge 0.
\]
If $\|M_2 X_1 v\|_2^2 = 0$ then $M_2 X_1 v = 0$, hence $X_1 v \in \operatorname{col}(X_2)$. Thus there exists $w\in\mathbb{R}^{k_2}$ with $X_1 v = X_2 w$, so
\[
X_1 v - X_2 w = 0.
\]
If $v\neq 0$ this is a nontrivial linear relation among the columns of $[X_1\ X_2]$. That contradicts the assumption $\operatorname{rank}(X)=k_1+k_2$. Therefore for all $v\neq 0$ we have $v^\top X_1^\top M_2 X_1 v > 0$, so $X_1^\top M_2 X_1$ is positive definite and hence invertible.

Multiplying both sides of $X_1^\top M_2 X_1\,\hat\beta_1 = X_1^\top M_2 y$ by the inverse yields
\[
\hat\beta_1 \;=\; (X_1^\top M_2 X_1)^{-1} X_1^\top M_2 y,
\]
which completes the proof.