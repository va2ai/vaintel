import { useState } from 'react';
import { addSubscriber } from '../firestore.js';

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
          Stay informed on VA policy changes
        </h2>
        <p className="pub-newsletter__subtext">
          Weekly updates on claims strategy, court decisions, and policy changes.
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
