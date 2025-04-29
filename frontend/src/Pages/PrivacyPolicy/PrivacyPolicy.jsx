import { useRef } from 'react';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const sections = {
    intro: useRef(null),
    collection: useRef(null),
    use: useRef(null),
    sharing: useRef(null),
    security: useRef(null),
    google: useRef(null),
    rights: useRef(null),
    children: useRef(null),
    changes: useRef(null),
    contact: useRef(null)
  };

  const scrollToSection = (sectionRef) => {
    sectionRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="privacy-container">
      <header className="privacy-header">
        <h1 className="privacy-title"> Privacy Policy – MomentMail</h1>
        <p className="privacy-effective-date">Effective Date: April 26, 2025</p>
      </header>

      <div className="privacy-layout">
        <nav className="privacy-nav">
          <ul className="privacy-nav-list">
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.intro)} className="privacy-nav-link">
                Introduction
              </button>
            </li>
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.collection)} className="privacy-nav-link">
                1. Information We Collect
              </button>
            </li>
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.use)} className="privacy-nav-link">
                2. How We Use Your Information
              </button>
            </li>
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.sharing)} className="privacy-nav-link">
                3. How We Share Your Information
              </button>
            </li>
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.security)} className="privacy-nav-link">
                4. Data Security
              </button>
            </li>
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.google)} className="privacy-nav-link">
                5. Google API Limited Use
              </button>
            </li>
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.rights)} className="privacy-nav-link">
                6. Your Rights & Choices
              </button>
            </li>
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.children)} className="privacy-nav-link">
                7. Children's Privacy
              </button>
            </li>
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.changes)} className="privacy-nav-link">
                8. Changes to this Policy
              </button>
            </li>
            <li className="privacy-nav-item">
              <button onClick={() => scrollToSection(sections.contact)} className="privacy-nav-link">
                Contact Us
              </button>
            </li>
          </ul>
        </nav>

        <main className="privacy-content">
          <section ref={sections.intro} className="privacy-section">
            <p className="privacy-section-text">
              MomentMail is committed to protecting your privacy. This Privacy Policy outlines how we collect, use, and safeguard your personal information when you use our bulk email service.
            </p>
          </section>

          <section ref={sections.collection} className="privacy-section">
            <h2 className="privacy-section-title">1. Information We Collect</h2>
            <p className="privacy-section-text">
              We collect the following information to provide and improve our services:
            </p>
            <ul className="privacy-list">
              <li className="privacy-list-item"><strong>Google Account Data:</strong> Your email address, name, and access tokens when you authorize MomentMail via Google OAuth.</li>
              <li className="privacy-list-item"><strong>Google Sheets Metadata:</strong> Only metadata and content from selected Google Sheets (email addresses, names, etc.) you explicitly choose to use in your campaigns.</li>
              <li className="privacy-list-item"><strong>Campaign Data:</strong> Email templates, subject lines, and message body content.</li>
              <li className="privacy-list-item"><strong>Usage Data:</strong> Device information, IP address, browser type, pages visited, and interactions with our platform.</li>
              <li className="privacy-list-item"><strong>AI Input Data:</strong> Data you provide to our AI assistant for content generation.</li>
            </ul>
          </section>

          <section ref={sections.use} className="privacy-section">
            <h2 className="privacy-section-title">2. How We Use Your Information</h2>
            <ul className="privacy-list">
              <li className="privacy-list-item">To send personalized bulk emails via your Gmail account.</li>
              <li className="privacy-list-item">To allow you to import and manage email recipient data via Google Sheets.</li>
              <li className="privacy-list-item">To generate email content using our AI assistant.</li>
              <li className="privacy-list-item">To improve the user experience and troubleshoot issues.</li>
              <li className="privacy-list-item">To communicate with you (updates, support, product news).</li>
            </ul>
          </section>

          <section ref={sections.sharing} className="privacy-section">
            <h2 className="privacy-section-title">3. How We Share Your Information</h2>
            <p className="privacy-section-text">
              We do not sell or rent your data to third parties. Data is only shared with:
            </p>
            <ul className="privacy-list">
              <li className="privacy-list-item"><strong>Google APIs:</strong> To connect your Drive and Sheets securely.</li>
              <li className="privacy-list-item"><strong>Third-party service providers:</strong> For infrastructure, analytics, or customer support, bound by confidentiality agreements.</li>
              <li className="privacy-list-item"><strong>Legal Requirements:</strong> If required by law or court order.</li>
            </ul>
          </section>

          <section ref={sections.security} className="privacy-section">
            <h2 className="privacy-section-title">4. Data Security</h2>
            <p className="privacy-section-text">
              We use Google Cloud Platform services and follow industry best practices to protect your data. All communications are encrypted via HTTPS, and sensitive data is stored securely with access controls.
            </p>
          </section>

          <section ref={sections.google} className="privacy-section">
            <h2 className="privacy-section-title">5. Google API Limited Use Disclosure</h2>
            <p className="privacy-section-text">
              MomentMail's use of Google APIs complies with the Google API Services User Data Policy, including the Limited Use requirements. We only access the minimum data necessary to perform the requested tasks.
            </p>
          </section>

          <section ref={sections.rights} className="privacy-section">
            <h2 className="privacy-section-title">6. Your Rights & Choices</h2>
            <ul className="privacy-list">
              <li className="privacy-list-item">You can revoke Google access anytime via Google Account Permissions.</li>
              <li className="privacy-list-item">You can delete your MomentMail account by contacting us at <a href="mailto:privacy@momentmail.io" className="privacy-link">privacy@momentmail.io</a>.</li>
            </ul>
          </section>

          <section ref={sections.children} className="privacy-section">
            <h2 className="privacy-section-title">7. Children's Privacy</h2>
            <p className="privacy-section-text">
              MomentMail is not intended for users under 13. We do not knowingly collect data from children.
            </p>
          </section>

          <section ref={sections.changes} className="privacy-section">
            <h2 className="privacy-section-title">8. Changes to this Policy</h2>
            <p className="privacy-section-text">
              We may update this Privacy Policy periodically. We'll notify you via email or through the platform for any major changes.
            </p>
          </section>

          <section ref={sections.contact} className="privacy-section">
            <h2 className="privacy-section-title">Contact Us</h2>
            <p className="privacy-section-text">
              If you have questions, email us at <a href="mailto:privacy@momentmail.io" className="privacy-link">aviral.khandelwal03@gmail.com</a>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
