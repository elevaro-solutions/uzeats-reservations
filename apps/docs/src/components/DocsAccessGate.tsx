import React, { useEffect, useState } from 'react';
import {
  checkDocsAccessEmail,
  getStoredDocsEmail,
  requestDocsAccess,
  requestDocsAccessOtp,
  verifyDocsAccessOtp,
} from '../lib/api';
import styles from './DocsAccessGate.module.css';

type Step = 'email' | 'otp' | 'request' | 'done';

type Props = {
  onGranted: () => void;
};

export default function DocsAccessGate({ onGranted }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = getStoredDocsEmail();
    if (savedEmail) setEmail(savedEmail);
  }, []);

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const normalized = email.trim().toLowerCase();
    try {
      const status = await checkDocsAccessEmail(normalized);
      if (status.approved) {
        const result = await requestDocsAccessOtp(normalized);
        if (!result.success) {
          setError(result.message);
          return;
        }
        setStep('otp');
        setMessage(result.message);
        setOtp('');
      } else if (status.pending) {
        setStep('done');
        setMessage('Your access request is pending review. We will email you when approved.');
      } else {
        setStep('request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestDocsAccessOtp(email.trim().toLowerCase());
      if (!result.success) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await verifyDocsAccessOtp(email.trim().toLowerCase(), otp.trim());
      if (result.granted) {
        onGranted();
        return;
      }
      setError('Verification failed. Try again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestDocsAccess({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        company: company.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      setStep('done');
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <img src="/img/tablevera-icon.svg" alt="" width={40} height={40} />
          <div>
            <h1>Tablevera Docs</h1>
            <p>Internal documentation for developers, partners, and platform admins.</p>
          </div>
        </div>

        {step === 'email' && (
          <form onSubmit={handleEmailContinue} className={styles.form}>
            <label htmlFor="docs-email">Work email</label>
            <input
              id="docs-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <p className={styles.hint}>
              Enter the 6-digit code sent to <strong>{email}</strong>.
            </p>
            <label htmlFor="docs-otp">Verification code</label>
            <input
              id="docs-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
            />
            <button type="submit" disabled={loading || otp.length < 4}>
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={loading}
              onClick={handleResendOtp}
            >
              Resend code
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setStep('email');
                setOtp('');
                setMessage(null);
                setError(null);
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestAccess} className={styles.form}>
            <p className={styles.hint}>
              Request access for <strong>{email}</strong>. An admin will review your request.
            </p>
            <div className={styles.row}>
              <div>
                <label htmlFor="docs-first">First name</label>
                <input
                  id="docs-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="docs-last">Last name</label>
                <input
                  id="docs-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <label htmlFor="docs-company">Company</label>
            <input
              id="docs-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <label htmlFor="docs-reason">Why do you need access?</label>
            <textarea
              id="docs-reason"
              rows={4}
              minLength={10}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your role and what you need from the docs."
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting…' : 'Request access'}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setStep('email')}
            >
              Back
            </button>
          </form>
        )}

        {step === 'done' && message && (
          <div className={styles.success}>
            <p>{message}</p>
            <button type="button" className={styles.secondary} onClick={() => setStep('email')}>
              Start over
            </button>
          </div>
        )}

        {step === 'otp' && message && <p className={styles.note}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
