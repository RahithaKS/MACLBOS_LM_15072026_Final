import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { NetworkBackground } from '@/components/NetworkBackground';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ShieldCheck, Lock, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { setAuthUser } from '@/lib/auth';

interface AuthResponse {
  success: boolean;
  requiresOtp?: boolean;
  user?: {
    id: string;
    username: string;
    displayName: string;
    role: string;
  };
}

interface SsoConfigResponse {
  authMethod: 'otp' | 'microsoft_sso';
}

function extractDomain(email: string): string {
  const at = email.indexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).toLowerCase().trim();
}

const SSO_ERROR_MESSAGES: Record<string, string> = {
  not_registered: 'Your account is not registered for this domain. Please contact your administrator.',
  domain_mismatch: 'Your Microsoft account email does not match the expected domain.',
  microsoft_error: 'Microsoft returned an error. Please try again.',
  config_error: 'SSO is not configured correctly for this domain. Please contact your administrator.',
  invalid_state: 'Invalid SSO session state. Please try again.',
  missing_params: 'Incomplete SSO response from Microsoft. Please try again.',
  domain_not_found: 'Domain not found. Please contact your administrator.',
  server_error: 'A server error occurred during sign-in. Please try again.',
};

const CAROUSEL_SLIDES = [
  {
    text: 'Connect, analyze, and summarize financial reports, balance sheets, and audits—all in one secure workspace.',
  },
  {
    text: 'Ask questions in plain language and get instant answers from your financial data—no SQL, no exports.',
  },
  {
    text: 'Enterprise-grade security with Microsoft SSO, role-based access, and full audit logging built in.',
  },
];

export default function Welcome() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [email, setEmail] = useState('');
  const [detectedDomain, setDetectedDomain] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const { toast } = useToast();

  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setSlideIndex(i => (i + 1) % CAROUSEL_SLIDES.length);
        setFadeIn(true);
      }, 350);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Show SSO error if redirected back from failed SSO
  useEffect(() => {
    const params = new URLSearchParams(search);
    const ssoError = params.get('sso_error');
    if (ssoError) {
      toast({
        title: 'Sign in failed',
        description: SSO_ERROR_MESSAGES[ssoError] || 'An error occurred during Microsoft sign-in.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', '/');
    }
  }, [search]);

  // Update detected domain as user types email
  useEffect(() => {
    const domain = extractDomain(email);
    setDetectedDomain(domain);
  }, [email]);

  // Fetch SSO config for the detected domain (only when domain looks valid)
  const hasDomain = detectedDomain.length > 0 && detectedDomain.includes('.');
  const { data: ssoConfig, isLoading: ssoConfigLoading } = useQuery<SsoConfigResponse>({
    queryKey: ['/api/auth/sso/config', detectedDomain],
    queryFn: async () => {
      if (!detectedDomain) return { authMethod: 'otp' as const };
      const res = await fetch(`/api/auth/sso/config?domain=${encodeURIComponent(detectedDomain)}`);
      return res.json();
    },
    enabled: hasDomain,
    staleTime: 30_000,
  });

  const isSsoEnabled = ssoConfig?.authMethod === 'microsoft_sso';
  const isResolvingAuthMethod = hasDomain && ssoConfigLoading;

  const signInMutation = useMutation({
    mutationFn: async (data: { email: string; deviceToken?: string }) => {
      return await apiRequest<AuthResponse>('POST', '/api/auth/signin', data);
    },
    onSuccess: (data, variables) => {
      if (data.requiresOtp) {
        sessionStorage.setItem('otp_email', variables.email);
        toast({
          title: 'Verification required',
          description: 'We\'ve sent a verification code to your email.',
        });
        setLocation('/verify-otp');
      } else if (data.user) {
        setAuthUser(data.user);
        queryClient.clear();
        setLocation('/dashboard');
      }
    },
    onError: () => {
      toast({
        title: 'Sign in failed',
        description: 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    },
  });

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      const deviceToken = localStorage.getItem('device_token');
      signInMutation.mutate({ email, deviceToken: deviceToken || undefined });
    }
  };

  const handleMicrosoftSignIn = () => {
    if (!detectedDomain) return;
    window.location.href = `/api/auth/sso/microsoft/initiate?domain=${encodeURIComponent(detectedDomain)}`;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">

      {/* ── Left Panel ────────────────────────────────────────────────────── */}
      <div className="relative w-full lg:w-1/2 flex flex-col bg-white">

        {/* Teal accent line — ties left panel to the right panel colour */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#0d4a47] via-[#1a6b66] to-[#0d4a47]" />

        {/* Main centred content */}
        <div className="flex-1 flex items-center justify-center px-12 lg:px-16">
          <div className="w-full max-w-sm">

            {/* Logo block with bottom separator */}
            <div className="pb-6 mb-8 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <img
                  src="/Images - Logo/PNGs/120px.png"
                  alt="LedgerLM Logo"
                  className="h-9 w-9 flex-shrink-0"
                />
                <span className="text-xl font-bold text-foreground tracking-tight">LedgerLM</span>
              </div>
            </div>

            {/* Headline */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground leading-tight tracking-tight">
                Turn Financial Data<br />
                <span className="text-[#1a6b66]">into Clarity.</span>
              </h1>
            </div>

            {/* Form card */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Sign in
                </p>
                <p className="text-sm text-muted-foreground">
                  Enter your work email address to get started
                </p>
              </div>

              <form
                onSubmit={isSsoEnabled ? (e) => { e.preventDefault(); handleMicrosoftSignIn(); } : handleContinue}
                className="space-y-3"
              >
                <Input
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 text-sm bg-white border-gray-200 placeholder:text-gray-400"
                  required
                  autoFocus
                  data-testid="input-email"
                />

                {isSsoEnabled ? (
                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-medium flex items-center justify-center gap-3"
                    disabled={!email || isResolvingAuthMethod}
                    data-testid="button-microsoft-signin"
                  >
                    <MicrosoftIcon />
                    Continue with Microsoft
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-sm font-medium"
                    disabled={!email || signInMutation.isPending || isResolvingAuthMethod}
                    data-testid="button-signin"
                  >
                    {isResolvingAuthMethod ? 'Checking...' : signInMutation.isPending ? 'Sending code...' : 'Continue with email'}
                    {!isResolvingAuthMethod && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Footer — trust badges pinned to bottom */}
        <div className="px-12 lg:px-16 py-5 border-t border-gray-100">
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1a6b66]" />
              Enterprise Grade
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#1a6b66]" />
              End-to-End Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#1a6b66]" />
              ISO 27001
            </span>
          </div>
        </div>
      </div>

      {/* ── Right Panel ───────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <NetworkBackground theme="teal" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-14">
          <div className="max-w-md text-center">

            {/* Decorative quotation mark */}
            <div
              className="text-[120px] leading-none font-serif text-white/10 select-none mb-[-32px]"
              aria-hidden="true"
            >
              &ldquo;
            </div>

            {/* Carousel text */}
            <p
              className="text-xl text-white leading-relaxed transition-opacity duration-350"
              style={{ opacity: fadeIn ? 1 : 0 }}
            >
              {CAROUSEL_SLIDES[slideIndex].text}
            </p>

            {/* Animated pagination dots */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {CAROUSEL_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setFadeIn(false); setTimeout(() => { setSlideIndex(i); setFadeIn(true); }, 350); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === slideIndex
                      ? 'w-5 h-2 bg-white'
                      : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                  data-testid={`pagination-dot-${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
