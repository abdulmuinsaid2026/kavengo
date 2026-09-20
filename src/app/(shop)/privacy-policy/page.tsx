/* eslint-disable react/no-unescaped-entities */
// app/(shop)/privacy-policy/page.tsx
import { Metadata } from "next";
import TableOfContents from "./TableOfContents";

export const metadata: Metadata = {
  title: "Privacy Policy | KAVENGO",
  description:
    "Read KAVENGO's Privacy Policy to understand how we collect, use, and protect your personal information when you shop with us.",
};

const sections = [
  {
    title: "1. Introduction",
    content: [
      "Welcome to KAVENGO. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase from us.",
      "Please read this policy carefully. If you disagree with its terms, please discontinue use of our website. We reserve the right to make changes to this policy at any time. We will notify you of changes by updating the 'Last Updated' date at the top of this page.",
    ],
  },
  {
    title: "2. Information We Collect",
    content: [
      "We collect information that you voluntarily provide to us when you register on our website, place an order, subscribe to our newsletter, or contact us. This includes: your name, email address, phone number, billing and shipping address, and payment information.",
      "We also automatically collect certain information when you visit our site, such as your IP address, browser type, operating system, referring URLs, and pages viewed. This helps us understand how our website is being used and improve your experience.",
      "If you connect with us via social media, we may receive basic account information such as your name and profile picture from those platforms.",
    ],
  },
  {
    title: "3. How We Use Your Information",
    content: [
      "We use the information we collect to process and fulfil your orders, send you order confirmations, updates, and tracking information, and communicate with you about your account or purchases.",
      "We may also use your information to send you promotional communications (e.g., newsletters, offers) if you have opted in. You can opt out at any time by clicking the 'Unsubscribe' link in any marketing email.",
      "Your information helps us improve our website, products, and services, prevent fraudulent transactions, and comply with applicable legal obligations.",
    ],
  },
  {
    title: "4. Sharing Your Information",
    content: [
      "We do not sell, trade, or rent your personal information to third parties for their marketing purposes. We may share your information with trusted third-party service providers who assist us in operating our website and conducting our business — such as payment processors, courier partners, and email service providers.",
      "These third parties are contractually obligated to keep your information confidential and use it only for the specific services they provide to us.",
      "We may also disclose your information where required by law, court order, or government authority.",
    ],
  },
  {
    title: "5. Cookies & Tracking",
    content: [
      "We use cookies and similar tracking technologies to enhance your experience on our website. Cookies are small data files stored on your device that help us remember your preferences, keep items in your cart, and analyse site traffic.",
      "You can choose to disable cookies in your browser settings. However, disabling cookies may affect the functionality of certain parts of our website, including the shopping cart and checkout process.",
    ],
  },
  {
    title: "6. Data Security",
    content: [
      "We implement appropriate technical and organisational security measures to protect your personal information from unauthorised access, use, alteration, or disclosure. All payment transactions are encrypted using SSL (Secure Socket Layer) technology.",
      "While we take every reasonable precaution to protect your information, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security, but we are committed to doing everything we can to protect your data.",
    ],
  },
  {
    title: "7. Data Retention",
    content: [
      "We retain your personal information for as long as necessary to fulfil the purposes outlined in this policy, unless a longer retention period is required or permitted by law. When your data is no longer needed, we will securely delete or anonymise it.",
    ],
  },
  {
    title: "8. Your Rights",
    content: [
      "You have the right to access, correct, or delete the personal information we hold about you. You may also object to or restrict certain processing of your data, or request that we transfer your data to another service provider.",
      "To exercise any of these rights, please contact us at info@kavengo.com. We will respond to your request within 30 days.",
    ],
  },
  {
    title: "9. Children's Privacy",
    content: [
      "Our website is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately and we will take steps to delete it.",
    ],
  },
  {
    title: "10. Contact Us",
    content: [
      "If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us at: info@kavengo.com. You may also reach us through our Support page. We are always happy to help.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white py-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="responsive-container relative text-center">
          <span className="inline-block bg-white text-gray-900 text-xs font-semibold uppercase tracking-widest px-4 py-1 rounded-full mb-6">
            Legal
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Privacy Policy
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto leading-relaxed">
            We value your trust. Here's how we collect, use, and protect your
            personal information at KAVENGO.
          </p>
          <p className="text-gray-400 text-sm mt-6">Last updated: March 2026</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="responsive-container">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sticky Sidebar TOC */}
            <aside className="lg:w-64 flex-shrink-0">
              <TableOfContents sections={sections} />
            </aside>

            {/* Sections */}
            <div className="flex-1 min-w-0">
              <div className="space-y-10">
                {sections.map((section, i) => (
                  <div
                    key={i}
                    id={`section-${i}`}
                    className="pb-10 border-b border-gray-100 last:border-0"
                  >
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                      {section.title}
                    </h2>
                    <div className="space-y-3">
                      {section.content.map((para, j) => (
                        <p
                          key={j}
                          className="text-gray-600 leading-relaxed text-[15px]"
                        >
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gray-900 text-white py-16">
        <div className="responsive-container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Questions About Your Privacy?
          </h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">
            Your data is safe with us. If you have any concerns, our support
            team is ready to assist you.
          </p>
          <a
            href="/support"
            className="inline-block bg-white text-gray-900 font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors duration-200"
          >
            Contact Support →
          </a>
        </div>
      </section>
    </div>
  );
}
