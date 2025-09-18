1. Summary

a. Verdict
I have found a complete solution. The multivariate Delta method holds under the stated assumptions: if $\sqrt{n}(\hat\theta_n - \theta_0) \xRightarrow{d} \mathcal{N}(0,\Sigma)$ with $\Sigma$ positive semidefinite and $g:\mathbb{R}^p \to \mathbb{R}^m$ is continuously differentiable at $\theta_0$ with Jacobian $G = Dg(\theta_0)$, then
$$
\sqrt{n}\,\big(g(\hat\theta_n) - g(\theta_0)\big) \xRightarrow{d} \mathcal{N}\big(0,\, G\,\Sigma\,G^\top\big).
$$

b. Method Sketch
- Perform a first-order Taylor expansion of $g$ at $\theta_0$ around $\hat\theta_n$ (or equivalently expand around $\theta_0$):
  $$
  g(\hat\theta_n) = g(\theta_0) + G\,(\hat\theta_n - \theta_0) + R_n,
  $$
  where the remainder satisfies $R_n = o(\|\hat\theta_n - \theta_0\|)$ as $\hat\theta_n \to \theta_0$.
- Use the given weak convergence of $\sqrt{n}(\hat\theta_n - \theta_0)$ and Slutsky's theorem. Specifically,
  - $G\,\sqrt{n}(\hat\theta_n - \theta_0) \xRightarrow{d} \mathcal{N}(0, G\Sigma G^\top)$.
  - $\sqrt{n}\,R_n = o_p(1)$ because $\|R_n\| = o(\|\hat\theta_n - \theta_0\|)$ and $\sqrt{n}\|\hat\theta_n - \theta_0\| = O_p(1)$.
- Conclude the claimed limit via Slutsky’s theorem.

Key lemmas:
- Multivariate Taylor expansion with remainder: for $\hat\theta$ near $\theta_0$,
  $$
  g(\hat\theta) = g(\theta_0) + G(\hat\theta - \theta_0) + R(\hat\theta),
  $$
  with $R(\hat\theta) = o(\|\hat\theta - \theta_0\|)$.
- If $\sqrt{n}(\hat\theta_n - \theta_0) \xRightarrow{d} Z \sim \mathcal{N}(0,\Sigma)$ and $\sqrt{n}R_n \xrightarrow{p} 0$, then
  $$
  \sqrt{n}\big(g(\hat\theta_n) - g(\theta_0)\big) \xRightarrow{d} \mathcal{N}(0, G\Sigma G^\top).
  $$

2. Detailed Solution

<<<BEGIN DETAILED SOLUTION>>>

Let $\hat\theta_n \in \mathbb{R}^p$ satisfy
$\sqrt{n}(\hat\theta_n - \theta_0) \xRightarrow{d} \mathcal{N}(0,\Sigma)$,
with $\Sigma$ positive semidefinite, and let $g:\mathbb{R}^p \to \mathbb{R}^m$ be continuously differentiable at $\theta_0$. Denote $G := Dg(\theta_0) \in \mathbb{R}^{m\times p}$.

1) Taylor expansion with remainder
Since $g$ is differentiable at $\theta_0$ with derivative $G$, there exists a remainder representation (mean value form or Fréchet differentiability) such that for $\hat\theta$ near $\theta_0$,
$$
g(\hat\theta) = g(\theta_0) + G(\hat\theta - \theta_0) + R(\hat\theta),
$$
where
$$
\lim_{\hat\theta \to \theta_0} \frac{\|R(\hat\theta)\|}{\|\hat\theta - \theta_0\|} = 0.
$$
Equivalently,
$$
R(\hat\theta) = o(\|\hat\theta - \theta_0\|).
$$

Applying this to $\hat\theta_n$ yields
$$
g(\hat\theta_n) = g(\theta_0) + G(\hat\theta_n - \theta_0) + R_n,
$$
with
$$
R_n := R(\hat\theta_n) = o\big(\hat\theta_n - \theta_0\big).
$$

2) Normalizing by $\sqrt{n}$
Subtract $g(\theta_0)$ and multiply by $\sqrt{n}$:
$$
\sqrt{n}\big(g(\hat\theta_n) - g(\theta_0)\big)
= G\,\sqrt{n}(\hat\theta_n - \theta_0) + \sqrt{n}\,R_n.
$$

3) Behavior of the linear term
By assumption,
$$
\sqrt{n}(\hat\theta_n - \theta_0) \xRightarrow{d} Z \sim \mathcal{N}(0,\Sigma),
$$
hence
$$
G\,\sqrt{n}(\hat\theta_n - \theta_0) \xRightarrow{d} GZ \sim \mathcal{N}(0,\, G\Sigma G^\top).
$$

4) Remainder term vanishes after scaling
From $R_n = o(\|\hat\theta_n - \theta_0\|)$ and the tightness of $\sqrt{n}(\hat\theta_n - \theta_0)$, we have
$$
\frac{\|R_n\|}{\|\hat\theta_n - \theta_0\|} \xrightarrow{p} 0.
$$
Since $\|\hat\theta_n - \theta_0\| = O_p(n^{-1/2})$ (because $\sqrt{n}(\hat\theta_n - \theta_0)$ is tight), it follows that
$$
\sqrt{n}\,\|R_n\| = \left(\frac{\|R_n\|}{\|\hat\theta_n - \theta_0\|}\right)\cdot \|\hat\theta_n - \theta_0\|\cdot \sqrt{n} = o_p(1).
$$
Therefore
$$
\sqrt{n}\,R_n \xrightarrow{p} 0.
$$

5) Conclusion by Slutsky
Thus
$$
\sqrt{n}\,\big(g(\hat\theta_n) - g(\theta_0)\big)
= G\,\sqrt{n}(\hat\theta_n - \theta_0) + \sqrt{n}\,R_n,
$$
where the first term converges in distribution to $\mathcal{N}(0, G\Sigma G^\top)$ and the second term converges in probability to $0$. By Slutsky’s theorem,
$$
\sqrt{n}\,\big(g(\hat\theta_n) - g(\theta_0)\big)
\xRightarrow{d} \mathcal{N}\big(0,\, G\,\Sigma\,G^\top\big).
$$

This completes the proof of the multivariate Delta method in the stated form. ∎

<<<END DETAILED SOLUTION>>>