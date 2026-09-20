/* eslint-disable react/no-unescaped-entities */
// app/(shop)/terms-and-conditions/page.tsx
import { Metadata } from "next";
import TableOfContents from "./TableOfContents";

export const metadata: Metadata = {
  title: "Terms & Conditions | KAVENGO",
  description:
    "Read the Terms and Conditions for using KAVENGO's frame and art print store. Understand our policies on orders, payments, shipping, returns, and more.",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: [
      "By accessing or placing an order on the KAVENGO website, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our website or services.",
      "These Terms and Conditions apply to all visitors, users, and customers of KAVENGO. We reserve the right to update or modify these terms at any time without prior notice. It is your responsibility to review these terms periodically.",
    ],
  },
  {
    title: "2. Products & Orders",
    content: [
      "All products listed on KAVENGO are subject to availability. We reserve the right to limit the quantity of any product we supply. Product descriptions, images, and pricing are subject to change at any time without notice.",
      "When you place an order, you are making an offer to purchase the product(s). KAVENGO reserves the right to accept or decline your order for any reason, including but not limited to product unavailability, pricing errors, or suspected fraudulent activity.",
      "For custom frame orders, all specifications (size, colour, material, finish) must be provided accurately at the time of placing the order. KAVENGO is not responsible for errors resulting from incorrect information provided by the customer.",
    ],
  },
  {
    title: "3. Pricing & Payment",
    content: [
      "All prices listed on KAVENGO are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. Shipping charges, if any, are calculated and displayed at checkout.",
      "We accept payments via credit/debit cards, UPI, net banking, and other available payment methods as listed at checkout. All transactions are processed securely through our payment gateway partners.",
      "In the event of a pricing error, KAVENGO reserves the right to cancel any orders placed at the incorrect price. Customers will be notified and offered a full refund in such cases.",
    ],
  },
  {
    title: "4. Shipping & Delivery",
    content: [
      "KAVENGO ships across India. Estimated delivery time is 2–7 business days depending on the delivery location. Delivery timelines are estimates and may be affected by factors beyond our control, including courier delays and public holidays.",
      "All frames are carefully packed with protective materials to prevent damage during transit. Once an order is dispatched, a tracking number will be shared via email or SMS.",
      "KAVENGO is not responsible for delays caused by the courier partner or incorrect shipping addresses provided by the customer. Please ensure your delivery address is accurate at the time of placing the order.",
    ],
  },
  {
    title: "5. Returns & Refunds",
    content: [
      "We offer a 7-day return policy from the date of delivery. To be eligible for a return, the item must be unused, in its original condition, and in the original packaging.",
      "Returns are accepted for the following reasons: damaged or defective product received, wrong product delivered, or significant variation from the product description. We do not accept returns for change of mind on custom or personalised frames.",
      "To initiate a return, please contact our support team with your order details and photos of the item. Once approved, the refund will be processed to your original payment method within 5–7 business days.",
    ],
  },
  {
    title: "6. Intellectual Property",
    content: [
      "All content on the KAVENGO website including text, images, logos, graphics, product designs, and other materials is the exclusive property of KAVENGO and is protected by applicable copyright and intellectual property laws.",
      "You may not reproduce, distribute, modify, or use any content from this website for commercial purposes without the prior written consent of KAVENGO.",
    ],
  },
  {
    title: "7. Privacy & Data",
    content: [
      "KAVENGO is committed to protecting your personal information. We collect and use your data solely for the purpose of processing orders, improving our services, and communicating with you about your orders.",
      "We do not sell, rent, or share your personal information with third parties for marketing purposes. Your data is handled in accordance with our Privacy Policy.",
      "By using our website, you consent to the collection and use of your personal information as described above.",
    ],
  },
  {
    title: "8. Limitation of Liability",
    content: [
      "KAVENGO shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of our website or products, even if KAVENGO has been advised of the possibility of such damages.",
      "Our total liability to you for any claim arising from your purchase shall not exceed the amount paid by you for the specific product(s) involved in the claim.",
    ],
  },
  {
    title: "9. Governing Law",
    content: [
      "These Terms and Conditions are governed by and construed in accordance with the laws of India. Any disputes arising from these terms or your use of KAVENGO's services shall be subject to the exclusive jurisdiction of the courts located in India.",
    ],
  },
  {
    title: "10. Contact Us",
    content: [
      "If you have any questions or concerns regarding these Terms and Conditions, please reach out to us via our Support page or email us at info@kavengo.com. We are happy to help you.",
    ],
  },
];

export default function TermsAndConditionsPage() {
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
            Terms & Conditions
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto leading-relaxed">
            Please read these terms carefully before using KAVENGO's website or
            placing an order. They govern your use of our services.
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
            Questions About Our Terms?
          </h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">
            We believe in transparency. If anything in these terms is unclear,
            our support team is always ready to assist you.
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
