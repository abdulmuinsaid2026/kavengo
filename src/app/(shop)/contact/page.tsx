"use client";

import { useState } from "react";
import { Mail, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email || !formData.message) {
            toast.error("Please enter your email and message.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/forward", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    path: "/public/contact",
                    method: "POST",
                    body: formData,
                }),
            });

            if (res.ok) {
                setSubmitted(true);
                toast.success("Thank you! Your message has been sent to our art advisors.");
                setFormData({ name: "", email: "", subject: "", message: "" });
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || "Failed to send your message. Please try again.");
            }
        } catch {
            toast.error("An error occurred while sending your message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 py-12 md:py-20">
            <div className="responsive-container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[#c9a84c] mb-3 block">
                        Customer Concierge
                    </span>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-stone-900 mb-4">
                        Contact Us
                    </h1>
                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                        Have a question about our panoramic collections, custom framing, or international shipping?
                        Our art advisors are here to assist you.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Contact Info Cards */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200/80 space-y-6">
                            <h2 className="text-xl font-semibold text-stone-900 border-b border-stone-100 pb-4">
                                Get in Touch
                            </h2>

                            <div className="space-y-5 text-sm">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/50 flex items-center justify-center shrink-0 text-[#c9a84c]">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-stone-900">Email Inquiries</p>
                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                            <a href="mailto:info@kavengo.com" className="text-stone-600 hover:text-stone-900 transition-colors">
                                                info@kavengo.com
                                            </a>
                                            <a href="mailto:orders@kavengo.com" className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                                                orders@kavengo.com (Orders & Tracking)
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/50 flex items-center justify-center shrink-0 text-[#c9a84c]">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-stone-900">Advisory Hours</p>
                                        <p className="text-stone-600">Monday – Friday: 9:00 AM – 6:00 PM EST</p>
                                        <p className="text-xs text-stone-400 mt-0.5">Weekend inquiries answered within 24 hours</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/50 flex items-center justify-center shrink-0 text-[#c9a84c]">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-stone-900">Global Delivery</p>
                                        <p className="text-stone-600">Worldwide express delivery to USA, UK & Europe</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[oklch(0.42_0.02_55)] rounded-2xl p-6 text-white text-sm">
                            <p className="font-semibold text-amber-200 mb-1">Museum-Grade Guarantee</p>
                            <p className="text-white/70 text-xs leading-relaxed">
                                Every Kavengo artwork is printed with archival inks on 380gsm cotton canvas and carefully packed in reinforced timber packaging.
                            </p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-stone-200/80">
                            {submitted ? (
                                <div className="py-12 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-stone-900">Message Received</h3>
                                    <p className="text-stone-600 max-w-md mx-auto text-sm">
                                        Thank you for contacting Kavengo. An art advisor has been assigned to your request and will reach out shortly.
                                    </p>
                                    <Button
                                        onClick={() => setSubmitted(false)}
                                        variant="outline"
                                        className="mt-4"
                                    >
                                        Send Another Message
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <h2 className="text-xl font-semibold text-stone-900 border-b border-stone-100 pb-4">
                                        Send a Message
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                                                Your Name *
                                            </label>
                                            <Input
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. Eleanor Vance"
                                                className="h-11 rounded-xl"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                                                Email Address *
                                            </label>
                                            <Input
                                                required
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="eleanor@example.com"
                                                className="h-11 rounded-xl"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                                            Subject *
                                        </label>
                                        <Input
                                            required
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            placeholder="Inquiry regarding Panoramic Canvas Art / Custom Sizing"
                                            className="h-11 rounded-xl"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                                            Message *
                                        </label>
                                        <Textarea
                                            required
                                            rows={5}
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            placeholder="Tell us how we can help you with your interior design or order..."
                                            className="rounded-xl resize-none"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-[#c9a84c] hover:bg-[#b8960c] text-[oklch(0.16_0.02_55)] h-12 text-sm font-semibold tracking-wider uppercase rounded-xl transition-all shadow-sm"
                                    >
                                        {isSubmitting ? "Sending..." : (
                                            <span className="flex items-center gap-2">
                                                <Send className="w-4 h-4" /> Send Message
                                            </span>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
