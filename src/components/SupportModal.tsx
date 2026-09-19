import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  FileQuestion,
  ChevronDown,
  ShieldCheck,
  Headphones,
  ExternalLink
} from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onShowToast: (msg: string) => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'ticket' | 'faq'>('chat');

  // Live Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Hello! 👋 Welcome to BlazeStore 24/7 Support. How can we help you today?',
      time: 'Just now',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Support Ticket Form State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Order Tracking');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How long does standard and express shipping take?',
      a: 'Standard shipping takes 2-4 business days. Express shipping arrives in 24-48 hours. Orders over $50 qualify for free standard shipping automatically.',
    },
    {
      q: 'What is BlazeStore\'s return and refund policy?',
      a: 'We offer a 30-day hassle-free return policy on all eligible unworn and sealed items. Refunds are credited back to your original payment method within 3-5 business days upon approval.',
    },
    {
      q: 'How do I apply coupon codes to my order?',
      a: 'Enter your coupon code (e.g. BLAZE10, SAVE20, SUMMER50) in the promo box inside the shopping cart or checkout screen and click Apply.',
    },
    {
      q: 'Are all products authentic and backed by warranty?',
      a: 'Yes, 100% of products sold on BlazeStore are directly sourced from verified brands and come with official manufacturer warranties.',
    },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessages((prev) => [...prev, { sender: 'user', text: userText, time: now }]);
    setInputMessage('');

    // Automated smart assistant replies
    setTimeout(() => {
      let botResponse = 'Thank you for reaching out! A dedicated support specialist is reviewing your inquiry. We typically reply in under 3 minutes.';
      const lower = userText.toLowerCase();

      if (lower.includes('order') || lower.includes('track') || lower.includes('where is')) {
        botResponse = 'You can track all active shipments in the "My Orders" tab on the left sidebar. Enter your Order ID for real-time GPS tracking!';
      } else if (lower.includes('refund') || lower.includes('return') || lower.includes('cancel')) {
        botResponse = 'Refunds can be requested within 30 days of delivery. Our support and store management team processes all returns promptly.';
      } else if (lower.includes('discount') || lower.includes('coupon') || lower.includes('promo') || lower.includes('code')) {
        botResponse = 'Use code BLAZE10 for 10% off your cart or SUMMER50 for seasonal mega deals on select fashion items!';
      } else if (lower.includes('shipping') || lower.includes('delivery')) {
        botResponse = 'All orders over $50 receive Free Express Shipping automatically at checkout!';
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 600);
  };

  const handleQuickQuestion = (q: string) => {
    setInputMessage(q);
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketEmail || !ticketMessage) return;

    setTicketSubmitted(true);
    onShowToast('Support ticket #BLZ-' + Math.floor(10000 + Math.random() * 90000) + ' created successfully! 🎫');
    setTimeout(() => {
      setTicketSubmitted(false);
      setTicketSubject('');
      setTicketEmail('');
      setTicketMessage('');
    }, 3000);
  };

  return (
    <div
      id="support-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="support-modal-container"
        className={`relative w-full max-w-2xl rounded-3xl border overflow-hidden shadow-2xl transition-all max-h-[90vh] flex flex-col ${
          isDarkMode ? 'bg-[#18181B] text-[#EDEDF2] border-[#27272A]' : 'bg-white text-[#1F1F23] border-[#EDEDF2]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EDEDF2] dark:border-[#27272A] bg-gradient-to-r from-[#7C6FE0]/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7C6FE0] text-white shadow-md shadow-[#7C6FE0]/25">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight">24/7 Customer Support Center</h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Online
                </span>
              </div>
              <p className="text-xs font-semibold text-[#8A8A94]">Instant assistance, order tracking & inquiries</p>
            </div>
          </div>

          <button
            id="support-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-[#8A8A94] hover:bg-black/5 dark:hover:bg-white/5 transition"
            aria-label="Close support center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Contact Bar */}
        <div className="px-6 py-3 border-b border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="tel:+2348078753111"
              onClick={() => onShowToast('Calling customer support: +234 807 875 3111')}
              className="flex items-center gap-1.5 font-bold text-[#7C6FE0] hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>+234 807 875 3111</span>
            </a>
            <a
              href="https://wa.me/2348078753111?text=Hello%20BlazeStore%20Support!%20I%20need%20assistance."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-bold text-[#25D366] hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp Support</span>
            </a>
            <a
              href="mailto:support@blazestore.com"
              onClick={() => onShowToast('Email copied: support@blazestore.com')}
              className="flex items-center gap-1.5 font-semibold text-[#52525B] dark:text-[#A1A1AA] hover:text-[#7C6FE0]"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>support@blazestore.com</span>
            </a>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[#8A8A94] font-medium">
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            <span>Avg. response: &lt; 2 mins</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#EDEDF2] dark:border-[#27272A] px-6">
          <button
            id="support-tab-chat"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'chat'
                ? 'border-[#7C6FE0] text-[#7C6FE0]'
                : 'border-transparent text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Live Chat Assistant</span>
          </button>

          <button
            id="support-tab-ticket"
            onClick={() => setActiveTab('ticket')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'ticket'
                ? 'border-[#7C6FE0] text-[#7C6FE0]'
                : 'border-transparent text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
            }`}
          >
            <FileQuestion className="h-4 w-4" />
            <span>Submit Ticket</span>
          </button>

          <button
            id="support-tab-faq"
            onClick={() => setActiveTab('faq')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'faq'
                ? 'border-[#7C6FE0] text-[#7C6FE0]'
                : 'border-transparent text-[#8A8A94] hover:text-[#1F1F23] dark:hover:text-white'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help & FAQs</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[380px]">
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium ${
                        msg.sender === 'user'
                          ? 'bg-[#7C6FE0] text-white rounded-br-none'
                          : 'bg-[#F1F5F9] dark:bg-[#27272A] text-[#1F1F23] dark:text-[#F8FAFC] rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-[#8A8A94] mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Quick suggestion chips */}
              <div className="pt-3 pb-2 flex flex-wrap gap-1.5">
                {[
                  'Where is my order?',
                  'How do I request a refund?',
                  'What promo codes are active?',
                  'What are the shipping fees?',
                ].map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(chip)}
                    className="rounded-full bg-black/5 dark:bg-white/5 border border-[#EDEDF2] dark:border-[#27272A] px-2.5 py-1 text-[11px] font-semibold text-[#52525B] dark:text-[#A1A1AA] hover:border-[#7C6FE0] hover:text-[#7C6FE0] transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="pt-2 flex gap-2">
                <input
                  type="text"
                  id="support-chat-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your question or issue here..."
                  className="flex-1 rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/30"
                />
                <button
                  type="submit"
                  id="support-chat-send-btn"
                  className="rounded-xl bg-[#7C6FE0] px-4 py-2.5 text-white hover:bg-[#6D60D6] transition flex items-center justify-center font-bold"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {activeTab === 'ticket' && (
            <div className="space-y-4">
              {ticketSubmitted ? (
                <div className="text-center py-10 space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="text-base font-extrabold">Support Ticket Received!</h4>
                  <p className="text-xs text-[#8A8A94] max-w-md mx-auto">
                    We have assigned ticket <strong>#BLZ-{Math.floor(10000 + Math.random() * 90000)}</strong> to our support tier. A confirmation and response has been dispatched to your email.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-bold text-[#8A8A94] block mb-1">Inquiry Topic / Category</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/30"
                    >
                      <option>Order Tracking & Delivery Status</option>
                      <option>Product Return & Refund Request</option>
                      <option>Payment & Billing Assistance</option>
                      <option>Defective / Damaged Item</option>
                      <option>Promotions & Coupon Inquiries</option>
                      <option>General Support</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#8A8A94] block mb-1">Your Email Address *</label>
                      <input
                        type="email"
                        required
                        value={ticketEmail}
                        onChange={(e) => setTicketEmail(e.target.value)}
                        placeholder="e.g. alex@example.com"
                        className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/30"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#8A8A94] block mb-1">Subject *</label>
                      <input
                        type="text"
                        required
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        placeholder="Brief summary of inquiry"
                        className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#8A8A94] block mb-1">Detailed Message / Description *</label>
                    <textarea
                      required
                      rows={4}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Please include any relevant order numbers or product details..."
                      className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#27272A] bg-white dark:bg-[#202024] p-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/30 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    id="support-ticket-submit-btn"
                    className="w-full rounded-xl bg-[#7C6FE0] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#6D60D6] transition"
                  >
                    Submit Support Ticket
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] overflow-hidden transition"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-3.5 text-left font-bold text-xs hover:text-[#7C6FE0] transition"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-[#8A8A94] transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#7C6FE0]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 text-xs text-[#52525B] dark:text-[#A1A1AA] leading-relaxed border-t border-[#EDEDF2] dark:border-[#27272A]/50 pt-2.5">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 border-t border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] flex items-center justify-between text-[11px] text-[#8A8A94]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#7C6FE0]" />
            <span>256-Bit SSL Encrypted Support Desk</span>
          </div>
          <span>BlazeStore Customer Protection Guarantee</span>
        </div>
      </div>
    </div>
  );
};
