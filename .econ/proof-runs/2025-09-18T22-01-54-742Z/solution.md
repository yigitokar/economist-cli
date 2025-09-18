1. Summary

a. Verdict: I have found a complete solution. The result holds:
$$
\sqrt{n}\,\Big(g(\hat\theta_n) - g(\theta_0)\Big) \xRightarrow{d} \mathcal{N}\big(0,\ G\,\Sigma\,G^\top\big),
$$
where \(G = Dg(\theta_0)\).

b. Method Sketch:
- Apply a first-order Taylor expansion of \(g\) at \(\theta_0\):
  \[
  g(\hat\theta_n) = g(\theta_0) + G\,(\hat\theta_n - \theta_0) + R_n,
  \]
  with remainder \(R_n\) satisfying \(R_n = o(\|\hat\theta_n - \theta_0\|)\) as \(\hat\theta_n \to \theta_0\) (follows from differentiability of \(g\) at \(\theta_0\)).
- Since \(\sqrt{n}(\hat\theta_n - \theta_0) \xRightarrow{d} \mathcal{N}(0,\Sigma)\), we have \(\hat\theta_n - \theta_0 = O_p(n^{-1/2})\).
- Therefore \(\sqrt{n} R_n = o_p(1)\) because
  \[
  \sqrt{n} R_n = \sqrt{n}\, o_p(\|\hat\theta_n - \theta_0\|) = o_p\big(\sqrt{n}\,\|\hat\theta_n - \theta_0\|\big) = o_p(1).
  \]
- Hence
  \[
  \sqrt{n}\big(g(\hat\theta_n) - g(\theta_0)\big)
  = G\,\sqrt{n}(\hat\theta_n - \theta_0) + o_p(1),
  \]
  and Slutsky’s theorem yields the claimed limit:
  \[
  \sqrt{n}\big(g(\hat\theta_n) - g(\theta_0)\big) \xRightarrow{d} \mathcal{N}\big(0,\, G\,\Sigma\,G^\top\big).
  \]

2. Detailed Solution

<<<BEGIN DETAILED SOLUTION>>>

Let \(\hat\theta_n\) be as in the setup, with
\[
\sqrt{n}\,(\hat\theta_n - \theta_0) \xRightarrow{d} \mathcal{N}(0,\Sigma),
\]
where \(\Sigma \succeq 0\).

Let \(g:\mathbb{R}^p \to \mathbb{R}^m\) be continuously differentiable at \(\theta_0\), and let \(G := Dg(\theta_0) \in \mathbb{R}^{m\times p}\) be the Jacobian at \(\theta_0\). By differentiability, there exists a remainder function \(R_n\) such that
\[
g(\hat\theta_n) = g(\theta_0) + G\,(\hat\theta_n - \theta_0) + R_n,
\]
and
\[
\frac{ \|R_n\| }{ \|\hat\theta_n - \theta_0\| } \xrightarrow{p} 0 \quad \text{as } \hat\theta_n \to \theta_0.
\]

Since \(\sqrt{n}(\hat\theta_n - \theta_0) \xRightarrow{d} \mathcal{N}(0,\Sigma)\), we have \(\hat\theta_n - \theta_0 = O_p(n^{-1/2})\); thus \(\|\hat\theta_n - \theta_0\| = O_p(n^{-1/2})\). The previous limit on the remainder implies
\[
\|R_n\| \;=\; o_p\big(\|\hat\theta_n - \theta_0\|\big) \;=\; o_p(n^{-1/2}).
\]
Consequently
\[
\sqrt{n}\,R_n = o_p(1).
\]

Now write
\[
\sqrt{n}\big(g(\hat\theta_n) - g(\theta_0)\big)
= \sqrt{n}\,G\,(\hat\theta_n - \theta_0) + \sqrt{n}\,R_n.
\]
The second term is \(o_p(1)\). The first term satisfies
\[
\sqrt{n}\,G\,(\hat\theta_n - \theta_0) \;=\; G\,\big(\sqrt{n}(\hat\theta_n - \theta_0)\big) \xRightarrow{d} \mathcal{N}\big(0,\, G\,\Sigma\,G^\top\big)
\]
by the continuous mapping theorem (since \(G\) is constant) and the given convergence of \(\sqrt{n}(\hat\theta_n - \theta_0)\).

Applying Slutsky’s theorem to the sum of a convergent random vector and a sequence that converges to 0 in probability, we obtain
\[
\sqrt{n}\,\big(g(\hat\theta_n) - g(\theta_0)\big) \xRightarrow{d} \mathcal{N}\big(0,\, G\,\Sigma\,G^\top\big).
\]

This completes the proof of the multivariate delta method under the stated hypotheses.

<<<END DETAILED SOLUTION>>>