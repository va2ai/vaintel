import { useState } from 'react';
import { addSubscriber } from '../firestore.js';

export function NewsletterHeroCTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.includes('@') || email.length < 5) return;
    setStatus('submitting');
    try {
      await addSubscriber(email);
      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return <div className="pub-hero-success">✓ You're subscribed to weekly updates!</div>;
  }

  return (
    <div className="pub-hero-cta-wrapper">
      <form className="pub-hero-form" onSubmit={handleSubmit}>
        <input
          className="pub-hero-input"
          type="email"
          placeholder="Enter your email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'submitting'}
          autoComplete="email"
        />
        <button className="pub-hero-btn" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      <div className="pub-hero-trust">
        High-signal VA updates. No spam.
      </div>
    </div>
  );
}

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!email.includes('@') || email.length < 5) {
      setStatus('error');
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      await addSubscriber(email);
      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <section className="pub-newsletter" id="newsletter">
      <div className="pub-newsletter__inner">
        <h2 className="pub-newsletter__headline">
          Stay ahead of VA changes that can affect claims, ratings, and appeals.
        </h2>
        <p className="pub-newsletter__subtext">
          Get plain-English updates on VA policy, case law, and strategy.
        </p>

        {status === 'success' ? (
          <div className="pub-newsletter__success">
            You're subscribed!
          </div>
        ) : (
          <form className="pub-newsletter__form" onSubmit={handleSubmit}>
            <input
              className="pub-newsletter__input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'submitting'}
              autoComplete="email"
            />
            <button
              className="pub-newsletter__btn"
              type="submit"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && errorMsg && (
          <div className="pub-newsletter__error">{errorMsg}</div>
        )}
      </div>
    </section>
  );
}
