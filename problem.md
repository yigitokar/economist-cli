# Theorem B (Fréchet/Neyman Orthogonality for Debiased Moments)

**Setting.** Observations $W$ i.i.d., target $\theta\in\mathbb{R}$,
nuisance $\eta$ in some function class.\
Let $m(W;\theta,\eta)$ satisfy $\mathbb{E}[m(W;\theta_0,\eta_0)]=0$ and
identification $\partial_\theta \mathbb{E}[m(W;\theta_0,\eta_0)]\neq 0$.

**Claim.** If $$
\frac{\partial}{\partial r}\Big|_{r=0}\,\mathbb{E}\big[m\big(W;\theta_0,\eta_0 + r\,h\big)\big]=0
\quad \text{for all admissible directions } h,
$$ then the moment is **orthogonal** (a.k.a. Neyman-orthogonal) to
first-order perturbations of the nuisance. Consequently, a plug-in
estimator $\hat\theta$ that solves
$\mathbb{E}_n[m(W;\theta,\hat\eta)]\!=\!0$ is **first-order
insensitive** to $\hat\eta$'s estimation error, yielding
$\sqrt{n}$-consistency and asymptotic normality under high-level
regularity even when $\hat\eta$ is learned at slower rates.
