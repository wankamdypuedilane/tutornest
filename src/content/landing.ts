// The landing page's words, kept apart from its layout: product people can
// edit them without touching components, and tests can check them.

export const hero = {
  eyebrow: "Northlight Learning",
  title: "Learn faster with a mentor who has done it before.",
  lead: "TutorNest connects people retraining into tech with experienced developers for one-to-one video sessions. Choose a mentor, book an evening slot in your own time zone, and keep track of your goals.",
};

export const steps = [
  { title: "Choose a mentor", text: "Filter by skill and language, and read what each mentor can help with." },
  { title: "Book a time that suits you", text: "Slots appear in your time zone. A mentor is never booked twice for the same hour." },
  { title: "Meet by video", text: "Join from the session page, with nothing to install. You get a reminder the day before." },
];

export const features = [
  { title: "Mentors who know the job market", text: "Working developers who have hired, reviewed and coached juniors." },
  { title: "Built for evenings and weekends", text: "Most mentors offer slots after work, when career changers are free." },
  { title: "Private by design", text: "Your contact details stay private. Mentors see your first name and your goals, nothing more." },
  { title: "Accessible on every device", text: "Keyboard and screen reader friendly, and comfortable on a phone." },
];

/** Facts about the programme, not testimonials: never publish invented quotes. */
export const facts = [
  { value: "120", label: "mentors in the Northlight network" },
  { value: "30 or 60 min", label: "one-to-one sessions" },
  { value: "Free", label: "for learners during the pilot" },
];

export const plans = [
  {
    name: "Learners",
    price: "Free",
    note: "during the 2026–2027 pilot",
    items: ["Unlimited mentor search", "Up to 4 sessions a month", "Goals and reminders"],
    cta: { label: "Create your account", href: "/sign-up" },
  },
  {
    name: "Organizations",
    price: "On request",
    note: "for schools and employers",
    items: ["Sessions for your learners", "Coordinator dashboard", "Usage reports"],
    cta: { label: "Contact Northlight", href: "mailto:partners@tutornest.example" },
  },
];

export const faq = [
  {
    question: "Do I need to install anything?",
    answer: "No. Sessions run in your browser. You only need a camera and a microphone.",
  },
  {
    question: "What if I cannot attend?",
    answer: "Cancel from your sessions page up to 24 hours before the start. The time becomes free for someone else.",
  },
  {
    question: "Who are the mentors?",
    answer: "Developers approved by the Northlight team, who volunteer or are paid by Northlight. Each profile lists their skills and languages.",
  },
  {
    question: "How do you use my data?",
    answer: "Only to run your sessions. We do not use advertising trackers, and our audience statistics use no cookies.",
  },
];
