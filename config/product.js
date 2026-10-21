// config/product.js
// ─────────────────────────────────────────────────────────────
// All product details the AI sales bot is allowed to reference.
// Edit this file to change what the bot sells.
// The bot must ONLY use facts from this config — no inventing.
// ─────────────────────────────────────────────────────────────

const product = {
  name: "TaskFlow",
  tagline: "The smart project management platform that keeps your team in flow.",
  oneLiner:
    "TaskFlow is an AI-powered project management tool that helps teams plan, track, and deliver projects 3x faster with smart automation and real-time collaboration.",

  features: [
    {
      name: "Smart Task Automation",
      description:
        "Automatically assigns tasks, sets deadlines, and adjusts priorities based on team workload and project timelines.",
    },
    {
      name: "Real-Time Collaboration",
      description:
        "Live document editing, threaded comments, and instant notifications so your team stays aligned.",
    },
    {
      name: "AI Project Insights",
      description:
        "Get weekly AI-generated reports on project health, bottlenecks, and team productivity trends.",
    },
    {
      name: "Custom Workflows",
      description:
        "Build drag-and-drop workflows for any process — sprints, approvals, onboarding, bug tracking, and more.",
    },
    {
      name: "Integrations",
      description:
        "Connects with Slack, GitHub, Jira, Google Workspace, Microsoft Teams, and 50+ other tools.",
    },
    {
      name: "Time Tracking",
      description:
        "Built-in time tracking with automatic timesheets and billable-hours reports.",
    },
  ],

  pricingPlans: [
    {
      name: "Starter",
      price: "$9/user/month",
      annual: "$7/user/month (billed annually)",
      highlights: [
        "Up to 10 users",
        "5 projects",
        "Basic automation",
        "Email support",
      ],
      bestFor: "Small teams and freelancers",
    },
    {
      name: "Professional",
      price: "$19/user/month",
      annual: "$15/user/month (billed annually)",
      highlights: [
        "Unlimited users and projects",
        "Advanced automation and custom workflows",
        "AI project insights",
        "Priority support",
        "Integrations with Slack, GitHub, Jira",
        "Time tracking",
      ],
      bestFor: "Growing teams that need powerful project management",
      recommended: true,
    },
    {
      name: "Enterprise",
      price: "Custom pricing",
      annual: "Contact sales for volume discounts",
      highlights: [
        "Everything in Professional",
        "SSO and advanced security",
        "Dedicated account manager",
        "Custom integrations and API access",
        "SLA guarantee (99.9% uptime)",
        "On-premise deployment option",
      ],
      bestFor: "Large organizations with complex requirements",
    },
  ],

  freeTrial: {
    available: true,
    duration: "14 days",
    plan: "Professional",
    requiresCreditCard: false,
    description:
      "Start a free 14-day trial of the Professional plan. No credit card required. Cancel anytime.",
  },

  commonObjections: [
    {
      objection: "It's too expensive / We don't have the budget right now",
      response:
        "I understand budget is important. TaskFlow's Starter plan is just $9 per user per month, and the annual plan brings it down to $7. Plus, our customers typically save 10+ hours per week per team member — that's real ROI. And you can start with a free 14-day trial to see the value before committing.",
    },
    {
      objection: "We already use Jira / Asana / Monday / another tool",
      response:
        "That's great — many of our customers switched from those tools. TaskFlow integrates with Jira so you can migrate gradually. What teams love is our AI automation that reduces manual task management by 60%. Would you be open to a side-by-side comparison during a free trial?",
    },
    {
      objection: "I need to check with my manager / team / get approval",
      response:
        "Absolutely, I completely understand. I can send you a summary with pricing and ROI data that you can share with your team. Would it help if I also set up a quick demo call with your manager?",
    },
    {
      objection: "We're too small / don't need something this complex",
      response:
        "TaskFlow actually works great for small teams — our Starter plan is designed exactly for teams under 10 people. You only use the features you need, and our setup takes just 5 minutes. No complex configuration required.",
    },
    {
      objection: "Is our data secure?",
      response:
        "Security is our top priority. TaskFlow is SOC 2 Type II certified, uses end-to-end encryption, and stores data in AWS with daily backups. Enterprise customers also get SSO and on-premise deployment options.",
    },
    {
      objection: "I'm not interested / We don't need this",
      response:
        "I respect that. Could I ask what tools you're currently using for project management? Sometimes teams don't realize how much time they're spending on manual coordination.",
    },
  ],

  demoBooking: {
    available: true,
    description:
      "Book a personalized 30-minute demo with a product specialist.",
    url: "https://taskflow.example.com/book-demo",
    calendlyStyle:
      "Available Monday through Friday, 9 AM to 6 PM in your timezone.",
  },

  companyInfo: {
    founded: "2022",
    headquarters: "San Francisco, CA",
    customers: "5,000+ teams worldwide",
    support: "24/7 chat and email support, phone support on Professional and Enterprise",
  },
};

export default product;
