import React, { useRef } from 'react';
import './Terms.css';

const Terms = () => {
  const sections = {
    intro: useRef(null),
    use: useRef(null),
    google: useRef(null),
    acceptable: useRef(null),
    ai: useRef(null),
    subscription: useRef(null),
    termination: useRef(null),
    liability: useRef(null),
    changes: useRef(null),
    contact: useRef(null)
  };

  const scrollToSection = (sectionRef) => {
    sectionRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="terms-container">
      <header className="terms-header">
        <h1 className="terms-title">Terms & Conditions</h1>
        <p className="terms-effective-date">Effective Date: April 26, 2025</p>
      </header>

      <div className="terms-layout">
        <nav className="terms-nav">
          <ul className="terms-nav-list">
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.intro)} className="terms-nav-link">
                Introduction
              </button>
            </li>
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.use)} className="terms-nav-link">
                1. Use of the Service
              </button>
            </li>
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.google)} className="terms-nav-link">
                2. Google Integration
              </button>
            </li>
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.acceptable)} className="terms-nav-link">
                3. Acceptable Use
              </button>
            </li>
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.ai)} className="terms-nav-link">
                4. AI Content
              </button>
            </li>
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.subscription)} className="terms-nav-link">
                5. Subscription & Billing
              </button>
            </li>
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.termination)} className="terms-nav-link">
                6. Termination
              </button>
            </li>
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.liability)} className="terms-nav-link">
                7. Limitation of Liability
              </button>
            </li>
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.changes)} className="terms-nav-link">
                8. Changes to Terms
              </button>
            </li>
            <li className="terms-nav-item">
              <button onClick={() => scrollToSection(sections.contact)} className="terms-nav-link">
                Contact Us
              </button>
            </li>
          </ul>
        </nav>

        <main className="terms-content">
          <section ref={sections.intro} className="terms-section">
            <p className="terms-section-text">
              By accessing or using MomentMail Services, you agree to be bound by these Terms & Conditions. Please read them carefully.
            </p>
          </section>

          <section ref={sections.use} className="terms-section">
            <h2 className="terms-section-title">1. Use of the Service</h2>
            <p className="terms-section-text">
              MomentMail allows you to send bulk emails using data from Google Sheets, select or create templates, and use AI to generate email content. You must:
            </p>
            <ul className="terms-list">
              <li className="terms-list-item">Be 13 years or older.</li>
              <li className="terms-list-item">Use your own Gmail account or a verified business account.</li>
              <li className="terms-list-item">Not engage in spam, phishing, or illegal bulk mailing activities.</li>
            </ul>
          </section>

          <section ref={sections.google} className="terms-section">
            <h2 className="terms-section-title">2. Google Integration</h2>
            <p className="terms-section-text">
              By authorizing MomentMail via Google OAuth, you allow access to your Google Sheets and Drive metadata, solely for importing contact data and generating campaigns. Your credentials are handled securely and are never stored.
            </p>
          </section>

          <section ref={sections.acceptable} className="terms-section">
            <h2 className="terms-section-title">3. Acceptable Use</h2>
            <p className="terms-section-text">
              You agree not to:
            </p>
            <ul className="terms-list">
              <li className="terms-list-item">Send spam or unsolicited commercial emails.</li>
              <li className="terms-list-item">Use MomentMail for phishing, fraud, or impersonation.</li>
              <li className="terms-list-item">Upload or send content that is unlawful, defamatory, obscene, or infringes on intellectual property.</li>
              <li className="terms-list-item">Attempt to bypass our rate limits or abuse our platform in any way.</li>
            </ul>
            <p className="terms-section-text">
              Violation may lead to immediate termination of service.
            </p>
          </section>

          <section ref={sections.ai} className="terms-section">
            <h2 className="terms-section-title">4. AI Content</h2>
            <p className="terms-section-text">
              You are responsible for reviewing any content generated by our AI assistant. We do not guarantee the accuracy or legality of AI-generated content.
            </p>
          </section>

          <section ref={sections.subscription} className="terms-section">
            <h2 className="terms-section-title">5. Subscription & Billing</h2>
            <p className="terms-section-text">
              MomentMail currently offers free access during its Beta phase. Future paid plans may be introduced with notice.
            </p>
          </section>

          <section ref={sections.termination} className="terms-section">
            <h2 className="terms-section-title">6. Termination</h2>
            <p className="terms-section-text">
              We reserve the right to suspend or terminate your access if you violate these Terms or for any other reason with notice.
            </p>
          </section>

          <section ref={sections.liability} className="terms-section">
            <h2 className="terms-section-title">7. Limitation of Liability</h2>
            <p className="terms-section-text">
              MomentMail is provided "as is" without warranties of any kind. We are not liable for any damages resulting from:
            </p>
            <ul className="terms-list">
              <li className="terms-list-item">Misuse of the service</li>
              <li className="terms-list-item">Data loss or breach</li>
              <li className="terms-list-item">Delays or errors in email delivery</li>
            </ul>
          </section>

          <section ref={sections.changes} className="terms-section">
            <h2 className="terms-section-title">8. Changes to Terms</h2>
            <p className="terms-section-text">
              We may modify these Terms anytime. Continued use constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section ref={sections.contact} className="terms-section">
            <h2 className="terms-section-title">Contact Us</h2>
            <p className="terms-section-text">
              For any legal questions, email: <a href="mailto:legal@momentmail.io" className="terms-link">aviral.khandelwal03@gmail.com</a>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Terms;