# Frisch–Waugh–Lovell (FWL) Theorem 

## Setup
Let $y\in\mathbb{R}^n$ and let the regressor matrix be partitioned as
$$
X=\big[\,X_1\ \ X_2\,\big],\qquad X_1\in\mathbb{R}^{n\times k_1},\ X_2\in\mathbb{R}^{n\times k_2},
$$
with $\operatorname{rank}(X_2)=k_2$ and $\operatorname{rank}(X)=k_1+k_2$ (full column rank; an intercept, if any, may be included in $X_2$).

Define the projection and residual-maker matrices for $X_2$:
$$
P_2 := X_2(X_2^\top X_2)^{-1}X_2^\top,\qquad M_2 := I_n - P_2.
$$

Let $\hat\beta=(\hat\beta_1^\top,\hat\beta_2^\top)^\top$ denote the OLS coefficients from the full regression of $y$ on $[X_1\ X_2]$.

## Statement 
1. **Coefficient formula (partialed-out form).**
   $$
   \boxed{\ \hat\beta_1 \;=\; (X_1^\top M_2 X_1)^{-1} X_1^\top M_2 y\ }.
   $$
