# Delta Method 
## Setup
Let $\{\hat\theta_n\}_{n\ge1}$ be a sequence of estimators for $\theta_0 \in \mathbb{R}^p$ such that
$$
\sqrt{n}\,\big(\hat\theta_n - \theta_0\big) \ \xRightarrow{d}\ \mathcal{N}\!\big(0,\ \Sigma\big),
$$
for some positive semidefinite $\Sigma \in \mathbb{R}^{p\times p}$.

Let $g:\mathbb{R}^p \to \mathbb{R}^m$ be continuously differentiable at $\theta_0$, and let $G := Dg(\theta_0) \in \mathbb{R}^{m\times p}$ denote the Jacobian (row $j$ is $\nabla g_j(\theta_0)^\top$).

## Statement (Multivariate Form)
Under the setup above,
$$
\sqrt{n}\,\Big(g(\hat\theta_n) - g(\theta_0)\Big) \ \xRightarrow{d}\ \mathcal{N}\!\big(0,\ G\,\Sigma\,G^\top\big).
$$
