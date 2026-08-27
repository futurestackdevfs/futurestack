import 'dotenv/config';
import { PrismaClient, SkillLevel, CourseStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const PROJECTS_SEED = [
  {
    name: 'Full-Stack E-Commerce Platform',
    image: null,
    techLabel: 'MERN Stack',
    tech: 'mern',
    category: 'Web Development',
    shortDesc: 'Build an Amazon-style storefront with product catalog, cart, checkout, and an admin dashboard.',
    overview: 'You will design and build a complete e-commerce application from scratch — a customer-facing storefront and an internal admin panel — backed by a real database and payment integration. Your trainer will pair with you to structure the codebase the way a production team would: clean folder architecture, reusable components, protected routes, and proper error handling throughout.',
    thumbGradient: 'linear-gradient(135deg,#0d1f3c,#0a2a1a)',
    level: 'INTERMEDIATE' as SkillLevel,
    badge: 'Intermediate',
    duration: '6 weeks',
    sessions: '8 sessions',
    seats: 6,
    price: 6999,
    originalPrice: 9999,
    stack: ['React', 'Node.js', 'MongoDB', 'Stripe API'],
    highlights: ['Product catalog with search, filters and categories', 'Cart, checkout and order management flow', 'Stripe-based payment integration', 'Admin dashboard for inventory and orders'],
    prereqs: ['Basic JavaScript and ES6 syntax', 'Familiarity with HTML/CSS', 'A code editor (VS Code recommended)'],
    includes: ['6 weeks of guided, self-paced build time', '8 one-to-one mentor sessions with your trainer', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: "E-commerce checkout flows are the single most business-critical piece of software at any online retailer — a slow cart or a broken payment step directly costs revenue. Companies like Flipkart, Myntra and Amazon invest entire teams in exactly the patterns you'll practice here.",
    tools: ['Node.js v18 LTS or newer', 'VS Code', 'MongoDB Atlas free-tier account', 'Stripe test-mode account', 'Git & GitHub account', 'Postman'],
    setupSteps: ['Install Node.js and verify with `node -v` (v18+ required).', 'Clone the starter repository your trainer shares on Day 1.', 'Run `npm install` in both the /client and /server folders.', 'Create a free MongoDB Atlas cluster and copy the connection string into a `.env` file.', 'Create a Stripe test account and add your publishable/secret test keys to `.env`.', 'Run `npm run dev` in /server and /client — the app opens at localhost:5173.'],
    curriculum: [
      { week: 'Week 1', title: 'Project setup & data modeling', desc: 'Set up the React + Node.js project, design MongoDB schemas for products, users and orders.' },
      { week: 'Week 2-3', title: 'Storefront & cart', desc: 'Build the product catalog, search/filter UI, and a persistent shopping cart.' },
      { week: 'Week 4', title: 'Checkout & payments', desc: 'Integrate Stripe for checkout, and handle order confirmation and emails.' },
      { week: 'Week 5-6', title: 'Admin panel & deployment', desc: 'Build the admin dashboard, add authentication, and deploy to production.' },
    ],
  },
  {
    name: 'Real Estate Listing & CRM',
    image: null,
    techLabel: 'Java / Spring Boot',
    tech: 'java',
    category: 'Web Development',
    shortDesc: 'A production-style property listing platform with search, filters, and a lead-tracking CRM for agents.',
    overview: 'This project mirrors what a real backend team building a property-tech product would ship: a listings service, a search/filter engine, and a lightweight CRM so agents can track leads through their pipeline.',
    thumbGradient: 'linear-gradient(135deg,#1a1006,#2e1a0d)',
    level: 'ADVANCED' as SkillLevel,
    badge: 'Advanced',
    duration: '8 weeks',
    sessions: '10 sessions',
    seats: 4,
    price: 8499,
    originalPrice: 11999,
    stack: ['Java', 'Spring Boot', 'MySQL', 'REST APIs'],
    highlights: ['Property listing service with advanced search & filters', 'Lead capture and pipeline tracking for agents', 'Role-based access for agents vs admins', 'Paginated, production-grade REST APIs'],
    prereqs: ['Basic Java syntax and OOP concepts', 'Understanding of relational databases', 'Some exposure to Spring Boot is a plus'],
    includes: ['8 weeks of guided, self-paced build time', '10 one-to-one mentor sessions', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: 'Every proptech company — from 99acres to Housing.com — runs on exactly this pattern: a searchable listings service paired with a CRM that keeps agents accountable for leads.',
    tools: ['JDK 17 or newer', 'IntelliJ IDEA (Community Edition is fine)', 'MySQL Workbench or DBeaver', 'Postman', 'Git & GitHub account', 'Maven'],
    setupSteps: ['Install JDK 17+ and verify with `java -version`.', 'Install IntelliJ IDEA and the Spring Boot plugin.', 'Clone the starter Spring Boot project from your trainer.', 'Install MySQL locally or use a free cloud instance.', 'Update `application.properties` with your database URL and credentials.', 'Run the app via `mvn spring-boot:run` or the IntelliJ Run button.'],
    curriculum: [
      { week: 'Week 1-2', title: 'Data modeling & core APIs', desc: 'Design the MySQL schema and build the core listings CRUD APIs.' },
      { week: 'Week 3-4', title: 'Search, filters & pagination', desc: 'Implement advanced search, filtering and pagination on the listings service.' },
      { week: 'Week 5-6', title: 'CRM & lead tracking', desc: 'Build the lead capture flow and agent pipeline dashboard.' },
      { week: 'Week 7-8', title: 'Auth, testing & deployment', desc: 'Add role-based auth, write unit tests, and deploy the application.' },
    ],
  },
  {
    name: 'Netflix-Style Streaming UI',
    image: null,
    techLabel: 'Frontend / React',
    tech: 'frontend',
    category: 'Web Development',
    shortDesc: 'Recreate a pixel-perfect, responsive streaming interface with carousels, modals, and smooth animations.',
    overview: 'A frontend-focused build where the goal is polish: pixel-accurate layouts, responsive breakpoints, accessible modals, and buttery animations. You will learn component architecture patterns used in production frontend teams.',
    thumbGradient: 'linear-gradient(135deg,#1a0d2e,#0d1a3a)',
    level: 'BEGINNER' as SkillLevel,
    badge: 'Beginner',
    duration: '4 weeks',
    sessions: '6 sessions',
    seats: 10,
    price: 4499,
    originalPrice: 6499,
    stack: ['React', 'Tailwind CSS', 'Framer Motion'],
    highlights: ['Responsive hero banner and content carousels', 'Animated modal for title details', 'Category rows with horizontal scroll & keyboard nav', 'Dark-mode-first, accessible UI'],
    prereqs: ['Comfortable with HTML, CSS and JavaScript', 'Basic familiarity with React components'],
    includes: ['4 weeks of guided, self-paced build time', '6 one-to-one mentor sessions', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: 'Streaming platforms live or die on interface polish — Netflix, Hotstar and Prime Video invest heavily in frontend engineers who obsess over animation timing, layout shift, and responsive behaviour.',
    tools: ['Node.js v18 LTS or newer', 'VS Code with the Tailwind CSS IntelliSense extension', 'Chrome DevTools (for responsive testing)', 'Git & GitHub account'],
    setupSteps: ['Install Node.js and verify with `node -v`.', 'Clone the starter Vite + React project from your trainer.', 'Run `npm install` to pull in React, Tailwind CSS and Framer Motion.', 'Run `npm run dev` and open the app at the local Vite URL.', 'Use Chrome DevTools device toolbar to test responsive breakpoints as you build.', 'Deploy your finished build to Vercel or Netlify.'],
    curriculum: [
      { week: 'Week 1', title: 'Layout & design system', desc: 'Set up the design tokens, typography and responsive grid.' },
      { week: 'Week 2', title: 'Carousels & content rows', desc: 'Build the scrollable content rows with keyboard and touch support.' },
      { week: 'Week 3', title: 'Animated detail modal', desc: 'Implement the title detail modal with Framer Motion transitions.' },
      { week: 'Week 4', title: 'Polish, accessibility & deploy', desc: 'Accessibility pass, performance tuning, and deployment.' },
    ],
  },
  {
    name: 'Food Delivery Backend System',
    image: null,
    techLabel: 'Node.js',
    tech: 'node',
    category: 'Web Development',
    shortDesc: 'Design a scalable backend for a food delivery app — orders, live tracking, and payment webhooks.',
    overview: 'You will build the backend systems that power a food-delivery app: order orchestration, real-time rider tracking over WebSockets, and payment webhook handling.',
    thumbGradient: 'linear-gradient(135deg,#0d1f18,#0d2e28)',
    level: 'INTERMEDIATE' as SkillLevel,
    badge: 'Intermediate',
    duration: '5 weeks',
    sessions: '7 sessions',
    seats: 8,
    price: 5999,
    originalPrice: 8499,
    stack: ['Node.js', 'Express', 'MongoDB', 'Socket.io'],
    highlights: ['Order lifecycle: placed → preparing → out for delivery → delivered', 'Real-time rider location updates via WebSockets', 'Idempotent payment webhook handling', 'Rate-limited, production-ready REST APIs'],
    prereqs: ['Working knowledge of JavaScript and Node.js', 'Basic understanding of REST APIs'],
    includes: ['5 weeks of guided, self-paced build time', '7 one-to-one mentor sessions', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: 'Food-delivery and quick-commerce companies run some of the highest-throughput backend systems in the country, and the exact problems in this project are what their backend teams solve daily.',
    tools: ['Node.js v18 LTS or newer', 'VS Code', 'MongoDB Atlas free-tier account', 'Postman (with WebSocket support enabled)', 'Git & GitHub account'],
    setupSteps: ['Install Node.js and verify with `node -v`.', 'Clone the starter Express + Socket.io project.', 'Run `npm install` to set up dependencies.', 'Create a MongoDB Atlas cluster and add the connection string to `.env`.', 'Use Postman\'s WebSocket client to test real-time order updates locally.', 'Simulate payment webhooks using the provided mock-payment script.'],
    curriculum: [
      { week: 'Week 1', title: 'Order service & data model', desc: 'Design the order lifecycle and build the core order APIs.' },
      { week: 'Week 2-3', title: 'Real-time tracking', desc: 'Implement WebSocket-based live rider location updates.' },
      { week: 'Week 4', title: 'Payments & webhooks', desc: 'Handle payment webhooks idempotently and reconcile order state.' },
      { week: 'Week 5', title: 'Testing, rate limiting & deploy', desc: 'Add rate limiting, write tests, and deploy the service.' },
    ],
  },
  {
    name: 'Personal Finance Analytics Dashboard',
    image: null,
    techLabel: 'Python',
    tech: 'python',
    category: 'Data Science',
    shortDesc: 'Build a dashboard that ingests bank statements and visualizes spending patterns and savings goals.',
    overview: 'A practical Python project where you will parse messy real-world bank statement exports, clean and categorize transactions, and build an interactive dashboard that visualizes spending patterns.',
    thumbGradient: 'linear-gradient(135deg,#1a1a0d,#0d1a2e)',
    level: 'BEGINNER' as SkillLevel,
    badge: 'Beginner',
    duration: '4 weeks',
    sessions: '6 sessions',
    seats: 9,
    price: 4999,
    originalPrice: 6999,
    stack: ['Python', 'Pandas', 'Flask', 'Plotly'],
    highlights: ['Statement parsing & automatic transaction categorization', 'Interactive spending trend charts', 'Savings goal tracking widget', 'Downloadable monthly summary reports'],
    prereqs: ['Basic Python syntax', 'Comfortable working with CSV/Excel data'],
    includes: ['4 weeks of guided, self-paced build time', '6 one-to-one mentor sessions', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: 'Fintech and personal-finance products all rely on the same core skill: turning messy, real-world statement data into something a normal person can actually understand and act on.',
    tools: ['Python 3.10+', 'VS Code with the Python extension', 'Jupyter Notebook (for exploration)', 'pip / virtualenv', 'Git & GitHub account'],
    setupSteps: ['Install Python 3.10+ and verify with `python --version`.', 'Create a virtual environment: `python -m venv venv` and activate it.', 'Install dependencies: `pip install pandas flask plotly`.', 'Use the sample bank-statement CSVs provided to start exploring in Jupyter.', 'Run the Flask app locally with `flask run` once your dashboard routes are ready.', 'Iterate on categorization rules with your trainer during weekly reviews.'],
    curriculum: [
      { week: 'Week 1', title: 'Data ingestion & cleaning', desc: 'Parse bank statement exports and clean the transaction data with Pandas.' },
      { week: 'Week 2', title: 'Categorization logic', desc: 'Build rule-based and keyword-based transaction categorization.' },
      { week: 'Week 3', title: 'Dashboard & visualizations', desc: 'Build the Flask app and Plotly charts for spending trends.' },
      { week: 'Week 4', title: 'Goals, reports & deploy', desc: 'Add savings goal tracking, exportable reports, and deploy.' },
    ],
  },
  {
    name: 'Credit Card Fraud Detection',
    image: null,
    techLabel: 'Data Science',
    tech: 'data',
    category: 'Data Science',
    shortDesc: 'Train and deploy a fraud-detection model on real-world transaction data with an evaluation dashboard.',
    overview: 'You will work with a real, highly imbalanced transaction dataset to build a fraud-detection model — handling class imbalance, feature engineering, model selection, and evaluation metrics that actually matter for fraud.',
    thumbGradient: 'linear-gradient(135deg,#0d0d2e,#1a0d2e)',
    level: 'ADVANCED' as SkillLevel,
    badge: 'Advanced',
    duration: '7 weeks',
    sessions: '9 sessions',
    seats: 5,
    price: 8999,
    originalPrice: 12499,
    stack: ['Python', 'Scikit-learn', 'XGBoost', 'Pandas'],
    highlights: ['Exploratory analysis on a real, imbalanced dataset', 'Feature engineering for fraud signals', 'XGBoost model with proper precision/recall evaluation', 'A review dashboard for flagged transactions'],
    prereqs: ['Python and basic statistics', 'Familiarity with Pandas and NumPy'],
    includes: ['7 weeks of guided, self-paced build time', '9 one-to-one mentor sessions', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: 'Every bank, card network and payments company runs fraud models in production, and the skill that separates a junior from a senior data scientist is exactly what this project drills.',
    tools: ['Python 3.10+', 'Jupyter Notebook or VS Code', 'scikit-learn, XGBoost, pandas (via pip)', 'Git & GitHub account'],
    setupSteps: ['Install Python 3.10+ and set up a virtual environment.', 'Install dependencies: `pip install scikit-learn xgboost pandas matplotlib`.', 'Download the provided (anonymized) transaction dataset.', 'Work through exploratory analysis and feature engineering in a notebook.', 'Train baseline and XGBoost models, comparing precision/recall, not just accuracy.', 'Wrap the final model behind a small Flask API for the review dashboard.'],
    curriculum: [
      { week: 'Week 1-2', title: 'EDA & feature engineering', desc: 'Explore the dataset, handle imbalance, and engineer fraud-relevant features.' },
      { week: 'Week 3-4', title: 'Model training & tuning', desc: 'Train and tune an XGBoost model, comparing against baseline classifiers.' },
      { week: 'Week 5', title: 'Evaluation & thresholds', desc: 'Evaluate with precision/recall curves and pick a business-appropriate threshold.' },
      { week: 'Week 6-7', title: 'Dashboard & deployment', desc: 'Build a review dashboard and deploy the model behind a simple API.' },
    ],
  },
  {
    name: 'AI Support Chatbot with LLMs',
    image: null,
    techLabel: 'AI / ML',
    tech: 'aiml',
    category: 'AI / ML',
    shortDesc: 'Build a retrieval-augmented chatbot that answers support queries using an LLM and a vector database.',
    overview: 'You will build a retrieval-augmented generation (RAG) chatbot — ingesting a knowledge base, chunking and embedding it into a vector database, and wiring it to an LLM so the bot answers grounded, accurate support queries.',
    thumbGradient: 'linear-gradient(135deg,#12142e,#2a0d2e)',
    level: 'ADVANCED' as SkillLevel,
    badge: 'Advanced',
    duration: '6 weeks',
    sessions: '8 sessions',
    seats: 6,
    price: 9499,
    originalPrice: 12999,
    stack: ['Python', 'LangChain', 'OpenAI API', 'Pinecone'],
    highlights: ['Document ingestion & chunking pipeline', 'Vector search over a knowledge base', 'LLM-powered chat with source citations', 'Basic guardrails against off-topic or unsafe queries'],
    prereqs: ['Python programming', 'Basic understanding of APIs', 'No prior ML experience required'],
    includes: ['6 weeks of guided, self-paced build time', '8 one-to-one mentor sessions', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: 'Nearly every SaaS company is now shipping an AI support or copilot feature, and retrieval-augmented generation (RAG) is the pattern behind almost all of them.',
    tools: ['Python 3.10+', 'An OpenAI API key (or compatible LLM provider)', 'Pinecone free-tier account', 'VS Code', 'Git & GitHub account'],
    setupSteps: ['Install Python 3.10+ and set up a virtual environment.', 'Install dependencies: `pip install langchain openai pinecone-client`.', 'Create a free Pinecone index for your vector database.', 'Add your OpenAI API key to a `.env` file (never commit this file).', 'Run the ingestion script to chunk and embed the sample knowledge base.', 'Start the chat server and test grounded answers with source citations.'],
    curriculum: [
      { week: 'Week 1', title: 'Knowledge base & embeddings', desc: 'Ingest documents, chunk them, and generate embeddings.' },
      { week: 'Week 2-3', title: 'Retrieval & prompt design', desc: 'Build the vector search retrieval pipeline and design grounded prompts.' },
      { week: 'Week 4', title: 'Chat interface & citations', desc: 'Build the chat UI and add source citations to answers.' },
      { week: 'Week 5-6', title: 'Guardrails & deployment', desc: 'Add basic safety guardrails and deploy the chatbot.' },
    ],
  },
  {
    name: 'CI/CD Pipeline for Microservices',
    image: null,
    techLabel: 'DevOps',
    tech: 'devops',
    category: 'DevOps',
    shortDesc: 'Containerize a microservices app and build an automated CI/CD pipeline with monitoring and rollbacks.',
    overview: 'Starting from an existing multi-service application, you will containerize each service, orchestrate them with Kubernetes, and build a full CI/CD pipeline — automated tests, builds, deployments, and safe rollbacks.',
    thumbGradient: 'linear-gradient(135deg,#0d1a2e,#1a0a0a)',
    level: 'ADVANCED' as SkillLevel,
    badge: 'Advanced',
    duration: '6 weeks',
    sessions: '8 sessions',
    seats: 5,
    price: 8999,
    originalPrice: 12499,
    stack: ['Docker', 'Kubernetes', 'Jenkins', 'Prometheus'],
    highlights: ['Dockerized microservices with multi-stage builds', 'Kubernetes deployment with health checks', 'Automated CI/CD pipeline with safe rollbacks', 'Monitoring dashboard with Prometheus & Grafana'],
    prereqs: ['Basic Linux command line', 'Understanding of what microservices are'],
    includes: ['6 weeks of guided, self-paced build time', '8 one-to-one mentor sessions', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: "No modern engineering org ships software without a CI/CD pipeline — it's the backbone of how companies like Amazon, Netflix and virtually every startup deploy safely, multiple times a day.",
    tools: ['Docker Desktop', 'A local or cloud Kubernetes cluster (minikube works well)', 'Jenkins (via Docker) or GitHub Actions', 'Prometheus & Grafana (via Docker Compose)', 'Git & GitHub account'],
    setupSteps: ['Install Docker Desktop and verify with `docker --version`.', 'Install minikube (or use a cloud sandbox) for a local Kubernetes cluster.', 'Clone the starter microservices repo and review the existing Dockerfiles.', 'Build and push images, then apply the provided Kubernetes manifests.', 'Set up the Jenkins pipeline (or GitHub Actions workflow) for build → test → deploy.', 'Bring up Prometheus & Grafana via Docker Compose and wire up basic dashboards.'],
    curriculum: [
      { week: 'Week 1-2', title: 'Containerization', desc: 'Write Dockerfiles and containerize each microservice.' },
      { week: 'Week 3-4', title: 'Kubernetes orchestration', desc: 'Deploy the services to Kubernetes with health checks and scaling.' },
      { week: 'Week 5', title: 'CI/CD pipeline', desc: 'Build the Jenkins pipeline for automated build, test and deploy.' },
      { week: 'Week 6', title: 'Monitoring & rollbacks', desc: 'Add Prometheus/Grafana monitoring and safe rollback strategies.' },
    ],
  },
  {
    name: 'Cloud-Native Inventory System',
    image: null,
    techLabel: 'Cloud (AWS)',
    tech: 'cloud',
    category: 'Cloud',
    shortDesc: 'Build a serverless inventory management system using managed AWS services end to end.',
    overview: 'A fully serverless build: you will design an inventory management system using AWS Lambda, DynamoDB, API Gateway and S3, learning to think in terms of managed services, event-driven triggers, and cost-efficient scaling.',
    thumbGradient: 'linear-gradient(135deg,#0d1a2e,#0a1a3a)',
    level: 'INTERMEDIATE' as SkillLevel,
    badge: 'Intermediate',
    duration: '5 weeks',
    sessions: '7 sessions',
    seats: 7,
    price: 7499,
    originalPrice: 9999,
    stack: ['AWS Lambda', 'DynamoDB', 'API Gateway', 'S3'],
    highlights: ['Serverless REST API with API Gateway & Lambda', 'DynamoDB data modeling for inventory & stock levels', 'S3-based bulk import/export of inventory data', 'Event-driven low-stock alerts'],
    prereqs: ['Basic programming knowledge (JavaScript or Python)', 'An AWS free-tier account'],
    includes: ['5 weeks of guided, self-paced build time', '7 one-to-one mentor sessions', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: 'Serverless is now the default choice for a huge range of production workloads because it removes server management entirely and scales automatically.',
    tools: ['An AWS free-tier account', 'AWS CLI configured locally', 'Node.js v18+ or Python 3.10+ (for Lambda functions)', 'VS Code with the AWS Toolkit extension', 'Git & GitHub account'],
    setupSteps: ['Create an AWS free-tier account and configure the AWS CLI with `aws configure`.', 'Install the Serverless Framework or AWS SAM CLI for local development.', 'Clone the starter project and review the provided infrastructure-as-code templates.', 'Deploy the base stack with `sam deploy` (or `serverless deploy`) to your own AWS account.', 'Test the API Gateway endpoints with Postman before wiring up the frontend.', 'Set a billing alarm in AWS so you stay comfortably within free-tier limits.'],
    curriculum: [
      { week: 'Week 1', title: 'Serverless architecture & setup', desc: 'Set up the AWS project and design the serverless architecture.' },
      { week: 'Week 2-3', title: 'Core inventory APIs', desc: 'Build Lambda functions and DynamoDB tables for inventory CRUD.' },
      { week: 'Week 4', title: 'Bulk import/export', desc: 'Add S3-based bulk import and export of inventory data.' },
      { week: 'Week 5', title: 'Alerts & deployment', desc: 'Add event-driven low-stock alerts and deploy via infrastructure-as-code.' },
    ],
  },
  {
    name: 'IoT Home Automation Dashboard',
    image: null,
    techLabel: 'IoT',
    tech: 'iot',
    category: 'Emerging Tech',
    shortDesc: 'Connect sensors and smart switches to a live dashboard for monitoring and controlling a smart home.',
    overview: 'You will wire up real (or simulated) sensors and smart switches, stream their data over MQTT, and build a live dashboard for monitoring and controlling a smart home setup — covering the full stack from embedded firmware basics to a responsive web dashboard.',
    thumbGradient: 'linear-gradient(135deg,#141a0d,#0d2e1a)',
    level: 'INTERMEDIATE' as SkillLevel,
    badge: 'Intermediate',
    duration: '5 weeks',
    sessions: '7 sessions',
    seats: 8,
    price: 6499,
    originalPrice: 8999,
    stack: ['Arduino', 'MQTT', 'Node.js', 'React'],
    highlights: ['Sensor data streaming over MQTT', 'Real-time dashboard for temperature, motion & switches', 'Remote control of smart switches from the dashboard', 'Historical data logging & charts'],
    prereqs: ['Basic programming knowledge', 'Curiosity about hardware — no prior embedded experience needed'],
    includes: ['5 weeks of guided, self-paced build time', '7 one-to-one mentor sessions', 'Code reviews against industry best practices', 'Starter repo, README and deployment guide', 'Project completion certificate'],
    industryUse: 'IoT is one of the fastest-growing areas across manufacturing, energy and consumer electronics, and the hardware-to-cloud pattern in this project is the exact architecture behind real smart-home and industrial-monitoring products.',
    tools: ['Arduino IDE (or simulated hardware via Wokwi)', 'An MQTT broker (Mosquitto, run locally or via a free cloud broker)', 'Node.js v18+', 'VS Code', 'Git & GitHub account'],
    setupSteps: ['Install the Arduino IDE, or set up a free Wokwi simulation if you don\'t have physical hardware.', 'Install and start a local Mosquitto MQTT broker (or use a free cloud broker like HiveMQ).', 'Flash the provided starter firmware to your board (or simulator) and confirm it publishes sample sensor data.', 'Install Node.js dependencies for the backend bridge service (`npm install`).', 'Run the backend service to subscribe to MQTT topics and forward data to the dashboard.', 'Start the React dashboard with `npm run dev` and confirm live sensor data appears.'],
    curriculum: [
      { week: 'Week 1', title: 'Hardware setup & firmware', desc: 'Set up sensors/switches and write basic firmware to publish data.' },
      { week: 'Week 2', title: 'MQTT & data pipeline', desc: 'Set up an MQTT broker and stream sensor data to the backend.' },
      { week: 'Week 3-4', title: 'Live dashboard', desc: 'Build the real-time React dashboard for monitoring and control.' },
      { week: 'Week 5', title: 'Logging & deployment', desc: 'Add historical data logging and deploy the full system.' },
    ],
  },
];

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  // ── PaymentSettings (existing) ──
  const existing = await prisma.paymentSettings.findFirst();
  if (existing) {
    console.log('PaymentSettings row exists (id=%s) — skipped.', existing.id);
  } else {
    await prisma.paymentSettings.create({
      data: { domesticEnabled: true, internationalEnabled: false },
    });
    console.log('PaymentSettings seeded: INR=on, USD=off.');
  }

  // ── Live Projects ──
  const existingCount = await prisma.project.count();
  if (existingCount > 0) {
    console.log('Projects already seeded (%d found) — skipped.', existingCount);
  } else {
    // Find first TRAINER user to assign as default trainer
    const trainer = await prisma.user.findFirst({
      where: { role: 'TRAINER' },
      select: { id: true },
    });
    const trainerId = trainer?.id ?? null;

    for (const p of PROJECTS_SEED) {
      const { curriculum, ...projectData } = p;
      const project = await prisma.project.create({
        data: {
          ...projectData,
          trainerId,
          status: 'ACTIVE' as CourseStatus,
        },
      });

      if (curriculum && curriculum.length > 0) {
        for (let i = 0; i < curriculum.length; i++) {
          const c = curriculum[i];
          const curriculumItem = await prisma.projectCurriculum.create({
            data: {
              projectId: project.id,
              week: c.week,
              title: c.title,
              desc: c.desc,
              order: i,
            },
          });

          // Create sample video records for each curriculum week
          const videoTitles = [
            `${c.title} - Part 1`,
            `${c.title} - Part 2`,
          ];
          await prisma.projectCurriculumVideo.createMany({
            data: videoTitles.map((title, vi) => ({
              curriculumId: curriculumItem.id,
              title,
              vdoCipherId: null,
              durationSeconds: 0,
              videoStatus: 'UPLOADING',
              order: vi,
            })),
          });
        }
      }

      console.log('  ✓ Project: %s', project.name);
    }

    console.log('Seeded %d live projects.', PROJECTS_SEED.length);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
