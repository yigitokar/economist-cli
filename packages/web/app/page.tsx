"use client";

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LineShadowText } from '@/components/line-shadow-text';
import Image from 'next/image';
import { ShimmerButton } from '@/components/shimmer-button';
import { ArrowRight, Menu, Copy, Check, Terminal, Users, Building, GraduationCap, ShieldCheck, FlaskConical, GitBranch, FileText, Search, Zap, Scale, Brain } from 'lucide-react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'industry' | 'government' | 'academia'>('industry');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const router = useRouter();

  const copyToClipboard = (text: string, commandId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(commandId);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistSubmitted(true);
  };

  const handleSignUp = () => {
    router.push('/sign-up');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-black z-0">
        {/* Flowing wave rays overlay */}
        <div className="absolute inset-0 w-full h-full">
          <svg
            className="absolute inset-0 w-full h-full object-cover"
            viewBox="0 0 1200 800"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
            style={{ minHeight: '100vh', minWidth: '100vw' }}
          >
            <defs>
              <radialGradient id="neonPulse1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                <stop offset="30%" stopColor="rgba(251,146,60,1)" />
                <stop offset="70%" stopColor="rgba(249,115,22,0.8)" />
                <stop offset="100%" stopColor="rgba(249,115,22,0)" />
              </radialGradient>
              <radialGradient id="neonPulse2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                <stop offset="25%" stopColor="rgba(251,146,60,0.9)" />
                <stop offset="60%" stopColor="rgba(234,88,12,0.7)" />
                <stop offset="100%" stopColor="rgba(234,88,12,0)" />
              </radialGradient>
              <radialGradient id="neonPulse3" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,1)" />
                <stop offset="35%" stopColor="rgba(251,146,60,1)" />
                <stop offset="75%" stopColor="rgba(234,88,12,0.6)" />
                <stop offset="100%" stopColor="rgba(234,88,12,0)" />
              </radialGradient>
              <radialGradient id="heroTextBg" cx="30%" cy="50%" r="70%">
                <stop offset="0%" stopColor="rgba(249,115,22,0.15)" />
                <stop offset="40%" stopColor="rgba(251,146,60,0.08)" />
                <stop offset="80%" stopColor="rgba(234,88,12,0.05)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <filter id="heroTextBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="12" result="blur" />
                <feTurbulence baseFrequency="0.7" numOctaves="4" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
                <feComponentTransfer in="monoNoise" result="alphaAdjustedNoise">
                  <feFuncA type="discrete" tableValues="0.03 0.06 0.09 0.12" />
                </feComponentTransfer>
                <feComposite in="blur" in2="alphaAdjustedNoise" operator="multiply" result="noisyBlur" />
                <feMerge>
                  <feMergeNode in="noisyBlur" />
                </feMerge>
              </filter>
              <linearGradient id="threadFade1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0,0,0,1)" />
                <stop offset="15%" stopColor="rgba(249,115,22,0.8)" />
                <stop offset="85%" stopColor="rgba(249,115,22,0.8)" />
                <stop offset="100%" stopColor="rgba(0,0,0,1)" />
              </linearGradient>
              <linearGradient id="threadFade2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0,0,0,1)" />
                <stop offset="12%" stopColor="rgba(251,146,60,0.7)" />
                <stop offset="88%" stopColor="rgba(251,146,60,0.7)" />
                <stop offset="100%" stopColor="rgba(0,0,0,1)" />
              </linearGradient>
              <linearGradient id="threadFade3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0,0,0,1)" />
                <stop offset="18%" stopColor="rgba(234,88,12,0.8)" />
                <stop offset="82%" stopColor="rgba(234,88,12,0.8)" />
                <stop offset="100%" stopColor="rgba(0,0,0,1)" />
              </linearGradient>
              <filter id="backgroundBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feTurbulence baseFrequency="0.9" numOctaves="3" result="noise" />
                <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
                <feComponentTransfer in="monoNoise" result="alphaAdjustedNoise">
                  <feFuncA type="discrete" tableValues="0.05 0.1 0.15 0.2" />
                </feComponentTransfer>
                <feComposite in="blur" in2="alphaAdjustedNoise" operator="multiply" result="noisyBlur" />
                <feMerge>
                  <feMergeNode in="noisyBlur" />
                </feMerge>
              </filter>
              <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g>
              <ellipse cx="300" cy="350" rx="400" ry="200" fill="url(#heroTextBg)" filter="url(#heroTextBlur)" opacity="0.6" />
              <ellipse cx="350" cy="320" rx="500" ry="250" fill="url(#heroTextBg)" filter="url(#heroTextBlur)" opacity="0.4" />
              <ellipse cx="400" cy="300" rx="600" ry="300" fill="url(#heroTextBg)" filter="url(#heroTextBlur)" opacity="0.2" />
              <path id="thread1" d="M50 720 Q200 590 350 540 Q500 490 650 520 Q800 550 950 460 Q1100 370 1200 340" stroke="url(#threadFade1)" strokeWidth="0.8" fill="none" opacity="0.8" />
              <circle r="2" fill="url(#neonPulse1)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="4s" repeatCount="indefinite"><mpath href="#thread1" /></animateMotion></circle>
              <path id="thread2" d="M80 730 Q250 620 400 570 Q550 520 700 550 Q850 580 1000 490 Q1150 400 1300 370" stroke="url(#threadFade2)" strokeWidth="1.5" fill="none" opacity="0.7" />
              <circle r="3" fill="url(#neonPulse2)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="5s" repeatCount="indefinite"><mpath href="#thread2" /></animateMotion></circle>
              <path id="thread3" d="M20 710 Q180 580 320 530 Q460 480 600 510 Q740 540 880 450 Q1020 360 1200 330" stroke="url(#threadFade3)" strokeWidth="1.2" fill="none" opacity="0.8" />
              <circle r="2.5" fill="url(#neonPulse1)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="4.5s" repeatCount="indefinite"><mpath href="#thread3" /></animateMotion></circle>
              <path id="thread4" d="M120 740 Q280 640 450 590 Q620 540 770 570 Q920 600 1070 510 Q1220 420 1350 390" stroke="url(#threadFade1)" strokeWidth="0.6" fill="none" opacity="0.6" />
              <circle r="1.5" fill="url(#neonPulse3)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="5.5s" repeatCount="indefinite"><mpath href="#thread4" /></animateMotion></circle>
              <path id="thread5" d="M60 725 Q220 600 380 550 Q540 500 680 530 Q820 560 960 470 Q1100 380 1280 350" stroke="url(#threadFade2)" strokeWidth="1.0" fill="none" opacity="0.7" />
              <circle r="2.2" fill="url(#neonPulse2)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="4.2s" repeatCount="indefinite"><mpath href="#thread5" /></animateMotion></circle>
              <path id="thread6" d="M150 735 Q300 660 480 610 Q660 560 800 590 Q940 620 1080 530 Q1220 440 1400 410" stroke="url(#threadFade3)" strokeWidth="1.3" fill="none" opacity="0.6" />
              <circle r="2.8" fill="url(#neonPulse1)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="5.2s" repeatCount="indefinite"><mpath href="#thread6" /></animateMotion></circle>
              <path id="thread7" d="M40 715 Q190 585 340 535 Q490 485 630 515 Q770 545 910 455 Q1050 365 1250 335" stroke="url(#threadFade1)" strokeWidth="0.9" fill="none" opacity="0.8" />
              <circle r="2" fill="url(#neonPulse3)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="4.8s" repeatCount="indefinite"><mpath href="#thread7" /></animateMotion></circle>
              <path id="thread8" d="M100 728 Q260 630 420 580 Q580 530 720 560 Q860 590 1000 500 Q1140 410 1320 380" stroke="url(#threadFade2)" strokeWidth="1.4" fill="none" opacity="0.7" />
              <circle r="3" fill="url(#neonPulse2)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="5.8s" repeatCount="indefinite"><mpath href="#thread8" /></animateMotion></circle>
              <path id="thread9" d="M30 722 Q170 595 310 545 Q450 495 590 525 Q730 555 870 465 Q1010 375 1180 345" stroke="url(#threadFade3)" strokeWidth="0.5" fill="none" opacity="0.6" />
              <circle r="1.2" fill="url(#neonPulse1)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="6s" repeatCount="indefinite"><mpath href="#thread9" /></animateMotion></circle>
              <path id="thread10" d="M90 732 Q240 625 390 575 Q540 525 680 555 Q820 585 960 495 Q1100 405 1300 375" stroke="url(#threadFade1)" strokeWidth="1.1" fill="none" opacity="0.8" />
              <circle r="2.5" fill="url(#neonPulse3)" opacity="1" filter="url(#neonGlow)"><animateMotion dur="4.3s" repeatCount="indefinite"><mpath href="#thread10" /></animateMotion></circle>
            </g>
          </svg>
        </div>
      </div>

      <style jsx>{`
        @keyframes flow { 0%, 100% { opacity: 0.3; stroke-dasharray: 0 100; stroke-dashoffset: 0; } 50% { opacity: 0.8; stroke-dasharray: 50 50; stroke-dashoffset: -25; } }
        @keyframes pulse1 { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes pulse2 { 0%, 100% { opacity: 0.3; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }
        @keyframes pulse3 { 0%, 100% { opacity: 0.5; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.3); } }
      `}</style>

      {/* Header Navigation */}
      <header className="fixed top-0 inset-x-0 z-30 bg-black/40 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-4 sm:px-6 py-4 lg:px-12">
        <div className="flex items-center space-x-2 pl-3 sm:pl-6 lg:pl-12">
          <div className="flex items-center space-x-2">
            <Terminal className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-orange-500" />
            <span className="text-white font-bold text-lg sm:text-xl lg:text-2xl">EconAgent</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
          <a href="#features" className="text-white/80 hover:text-white transition-colors text-sm lg:text-base">Features</a>
          <a href="#use-cases" className="text-white/80 hover:text-white transition-colors text-sm lg:text-base">Use cases</a>
          <a href="#install" className="text-white/80 hover:text-white transition-colors text-sm lg:text-base">Install</a>
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu className="w-6 h-6" />
          <span className="sr-only">Menu</span>
        </button>

        <ShimmerButton onClick={handleSignUp} className="hidden md:flex bg-orange-500 hover:bg-orange-600 text-white px-4 lg:px-6 py-2 rounded-xl text-sm lg:text-base font-medium shadow-lg">Sign up now</ShimmerButton>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-white/10 z-40">
          <nav className="flex flex-col space-y-4 px-6 py-6">
            <a href="#features" className="text-white/80 hover:text-white transition-colors">
              Features
            </a>
            <a href="#use-cases" className="text-white/80 hover:text-white transition-colors">
              Use cases
            </a>
            <a href="#install" className="text-white/80 hover:text-white transition-colors">
              Install
            </a>
            <a href="/sign-up" className="text-white/80 hover:text-white transition-colors">
              Sign up
            </a>
            <ShimmerButton onClick={handleSignUp} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-lg w-fit">
              Sign up now
            </ShimmerButton>
          </nav>
        </div>
      )}

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-start justify-start sm:justify-center min-h-[calc(100svh-88px)] sm:min-h-[calc(100vh-88px)] px-4 sm:px-6 lg:px-12 max-w-7xl pt-24 sm:pt-28 lg:pt-32 pl-6 sm:pl-12 lg:pl-20">
        <div className="grid gap-8 lg:grid-cols-2 items-center w-full lg:justify-items-end">
          <div className="max-w-2xl">
            <h1 className="text-white text-[clamp(1.75rem,6vw,4.5rem)] font-bold leading-tight mb-4 sm:mb-6 text-balance">
              From terminal to decision —
              <br />
              with{' '}
              <LineShadowText className="italic font-light" shadowColor="white">proof</LineShadowText>
            </h1>
            <p className="text-white/70 text-[clamp(1rem,2.5vw,1.5rem)] mb-6 sm:mb-8 max-w-2xl text-pretty">
              EconAgent runs economist-grade analyses with guardrails and provenance, then outputs a one-page
              decision memo and a reproducible bundle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button onClick={handleSignUp} className="group relative bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base md:text-xs lg:text-lg font-semibold flex items-center gap-2 backdrop-blur-sm border border-orange-400/30 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5">
                Sign up now
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 group-hover:-rotate-12 transition-transform duration-300" />
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
              <Button variant="ghost" className="text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-6 py-2.5 rounded-lg text-sm lg:text-lg">
                See example memo →
              </Button>
            </div>
          </div>
          <div className="relative w-full max-w-[640px] mx-auto lg:mx-0 lg:justify-self-end lg:translate-x-6 xl:translate-x-10 2xl:translate-x-16 aspect-[4/3] rounded-xl overflow-hidden">
            <Image
              src="/hero.png"
              alt="EconAgent demo screenshot"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 90vw, 640px"
            />
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need for economic analysis</h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">From data collection to policy recommendations, EconAgent handles the entire research pipeline</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Causal inference', description: 'DiD (including staggered adoption), RCTs, RD; pre-trend checks and clustered SEs out of the box.', icon: FlaskConical },
              { title: 'Power analysis', description: 'Detectable effect sizes, MDE curves, and sample size calculators for realistic designs.', icon: Zap },
              { title: 'Guardrails', description: 'Automatic balance, leakage, placebo, and pre-trend tests with clear flags and remedies.', icon: ShieldCheck },
              { title: 'Reproducible', description: 'Versioned runs with deterministic seeds, manifests, and data lineage for audits and papers.', icon: GitBranch },
              { title: 'Grounded answers', description: 'Built‑in web search and Google grounding so claims come with links and citations.', icon: Search },
              { title: 'Decision‑ready', description: 'One‑page memos with assumptions, caveats, confidence intervals, and next steps.', icon: FileText },
              { title: 'Proof Helper', description: 'Structure arguments, surface assumptions, and probe edge cases with counterexamples.', icon: Scale },
              { title: 'Deep Research', description: 'Long‑form investigations that synthesize sources with citations, summaries, and takeaways.', icon: Brain },
            ].map((feature, index) => (
              <div key={index} className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-black/50 transition-colors">
                <feature.icon className="w-5 h-5 text-orange-500 mb-3" />
                <h3 className="text-white font-semibold text-xl mb-2">{feature.title}</h3>
                <p className="text-white/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-white text-3xl lg:text-5xl font-bold text-center mb-16">Use cases</h2>
          <div className="flex justify-center mb-8">
            <div className="flex bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-1">
              {[
                { id: 'industry', label: 'Industry', icon: Building },
                { id: 'government', label: 'Government', icon: Users },
                { id: 'academia', label: 'Academia', icon: GraduationCap },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-md transition-colors ${
                    activeTab === (tab.id as any) ? 'bg-orange-500 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            {activeTab === 'industry' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <ul className="space-y-4 text-white/80">
                    <li>• A/B and holdout guardrails → faster, safer ship/no‑ship</li>
                    <li>• Pricing and elasticity → curves, thresholds, and sensitivity</li>
                    <li>• MMM and geo‑tests → defendable budgets and lift estimates</li>
                    <li>• Decision memos → assumptions, caveats, and next steps</li>
                  </ul>
                </div>
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                  <div className="text-orange-500 mb-2">Example:</div>
                  <div className="text-white/80 space-y-1">
                    <div># Design and run a DiD with guardrails</div>
                    <div>economist plan --spec free_shipping.yml</div>
                    <div>economist did --spec free_shipping.yml --require-pretrends --clusters region_id</div>
                    <div># Publish a one-page decision memo</div>
                    <div>economist memo --bundle runs/free_shipping_v3 --out memo.pdf</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'government' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <ul className="space-y-4 text-white/80">
                    <li>• Credible program evaluation (staggered adoption, DiD)</li>
                    <li>• FOIA-ready artifacts and reproducible audit trails</li>
                    <li>• Cost/benefit framing and evidence-ready memos for hearings</li>
                  </ul>
                </div>
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                  <div className="text-orange-500 mb-2">Example:</div>
                  <div className="text-white/80 space-y-1">
                    <div># Evaluate a staggered rollout with modern DiD</div>
                    <div>economist did --spec childcare_subsidy.yml --sun-abraham --clusters county_id</div>
                    <div># Package artifacts for audit and briefings</div>
                    <div>economist bundle --redact pii --policy internal-only</div>
                    <div>economist memo --bundle runs/childcare_subsidy --out hearing_memo.pdf</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'academia' && (
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <ul className="space-y-4 text-white/80">
                    <li>• Proof Helper: formal reasoning, edge-case checks, and counterexamples</li>
                    <li>• Literature reviews: multi-source synthesis, citations, and annotated bib</li>
                    <li>• PAPs, robustness batteries, OSF/DOI packaging</li>
                    <li>• Clean assignments and autograded labs</li>
                    <li>• Replications students can actually run</li>
                  </ul>
                </div>
                <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                  <div className="text-orange-500 mb-2">Examples:</div>
                  <div className="text-white/80 space-y-1">
                    <div>economist --prompt "Sketch a proof for theorem X; list assumptions and counterexamples"</div>
                    <div>economist --prompt "Literature review on policy Y; return 10 key papers with BibTeX"</div>
                    <div>economist --prompt "Generate a PAP outline and robustness battery for my RD design"</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Demo Strip */}
      <section id="install" className="relative z-10 px-4 sm:px-6 lg:px-12 py-20 bg-white/5 backdrop-blur-sm scroll-mt-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white text-3xl lg:text-5xl font-bold text-center mb-16">Install and Quick Start</h2>
          <p className="text-white/60 text-center -mt-12 mb-10">Requires Node.js 20+.</p>
          <div className="space-y-6">
            {[
              { id: 'try-now', title: 'Try immediately', command: 'npx @careresearch/econ-agent' },
              { id: 'install-global', title: 'Install globally', command: 'npm install -g @careresearch/econ-agent' },
              { id: 'local-clone', title: 'Local clone', command: `git clone https://github.com/yigitokar/economist-cli\ncd economist-cli\nnpm install && npm run build` },
              { id: 'quickstart', title: 'Quick Start', command: `# Open an interactive workspace in the current project\neconomist\n\n# Include extra folders when building context\neconomist --include-directories ../data --include-directories ../models\n\n# Run a one-off prompt without entering the UI\neconomist --prompt "Design a DSGE calibration workflow for the attached data"\n\n# Manage installed MCP servers\neconomist mcp list` },
            ].map((demo) => (
              <div key={demo.id} className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                  <span className="text-white/80 text-sm font-medium">{demo.title}</span>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(demo.command, demo.id)} className="text-white/60 hover:text-white">
                    {copiedCommand === demo.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="p-4 font-mono text-sm text-white/80 whitespace-pre-wrap">{demo.command}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-12 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-8">
            <h2 className="text-white text-2xl lg:text-3xl font-bold text-center mb-4">Get early access</h2>
            <p className="text-white/70 text-center mb-8">Join the waitlist for the CLI beta. We'll invite cohorts in waves.</p>
            {!waitlistSubmitted ? (
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input type="email" placeholder="Email*" required className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-orange-500" />
                  <select className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500">
                    <option value="">Role</option>
                    <option value="economist">Economist</option>
                    <option value="ds">Data Scientist</option>
                    <option value="pm">Product Manager</option>
                    <option value="policy">Policy Analyst</option>
                    <option value="professor">Professor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <select className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500">
                    <option value="">Segment</option>
                    <option value="industry">Industry</option>
                    <option value="government">Government</option>
                    <option value="academia">Academia</option>
                  </select>
                </div>
                <div className="pt-2"><Button type="button" onClick={handleSignUp} className="bg-orange-500 hover:bg-orange-600 text-white">Sign up now</Button></div>
              </form>
            ) : (
              <p className="text-white/70 text-center">Thank you for joining the waitlist!</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
