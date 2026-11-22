import connectDB from "../lib/db";
import "@/lib/models";
import { JobApplication } from "@/lib/models";
import type { JobStatus } from "@/lib/models/models.types";

const USER_ID = process.env.SEED_USER_ID || "6a4e4a0f96cec70ebf0c2bba";

const SAMPLE_JOBS = [
  // Wish List
  {
    company: "MU Company",
    position: "Software Developer",
    location: "San Francisco, CA",
    tags: ["React", "Tailwind", "High Pay"],
    description: "Build modern web applications using React and Tailwind CSS",
    jobUrl: "https://example.com/jobs/1",
    salary: "$120k - $150k",
  },
  {
    company: "Stripe",
    position: "Front End Developer",
    location: "Remote",
    tags: ["TypeScript", "React", "Next.js"],
    description: "Work on payment infrastructure frontend",
    jobUrl: "https://example.com/jobs/2",
    salary: "$130k - $160k",
  },
  {
    company: "Nutrishe",
    position: "QA Engineer",
    location: "New York, NY",
    tags: ["CIT", "Appium", "CI/CD"],
    description: "Ensure quality of mobile and web applications",
    jobUrl: "https://example.com/jobs/3",
    salary: "$90k - $110k",
  },
  // Applied
  {
    company: "LeaFood",
    position: "DevOps Engineer",
    location: "Austin, TX",
    tags: ["promQL", "Full-stack", "Docker"],
    description: "Manage infrastructure and deployment pipelines",
    jobUrl: "https://example.com/jobs/4",
    salary: "$110k - $140k",
  },
  {
    company: "Nomura",
    position: "Mobile Developer",
    location: "Tokyo, Japan",
    tags: ["React Native", "iOS", "Android"],
    description: "Develop cross-platform mobile banking applications",
    jobUrl: "https://example.com/jobs/5",
    salary: "¥8M - ¥12M",
  },
  {
    company: "Sinar Mas Land",
    position: "Full Stack Developer",
    location: "Jakarta, Indonesia",
    tags: ["Node.js", "React", "PostgreSQL"],
    description: "Build property management and smart city platforms",
    jobUrl: "https://example.com/jobs/6",
    salary: "IDR 15M - 25M",
  },
  {
    company: "Tokopedia",
    position: "Backend Engineer",
    location: "Jakarta, Indonesia",
    tags: ["Go", "gRPC", "Redis"],
    description: "High throughput e-commerce microservices",
    jobUrl: "https://example.com/jobs/7",
    salary: "IDR 20M - 35M",
  },
  // Interviewing
  {
    company: "Gojek",
    position: "Senior Frontend Engineer",
    location: "Jakarta, Indonesia",
    tags: ["React", "TypeScript", "Performance"],
    description: "Build consumer web apps for millions of users",
    jobUrl: "https://example.com/jobs/8",
    salary: "IDR 30M - 45M",
  },
  {
    company: "Grab",
    position: "Staff Software Engineer",
    location: "Singapore",
    tags: ["Distributed Systems", "Go", "Kafka"],
    description: "Lead architecture for payments and financial services",
    jobUrl: "https://example.com/jobs/9",
    salary: "SGD 10k - 15k",
  },
  {
    company: "Traveloka",
    position: "Engineering Manager",
    location: "Jakarta, Indonesia",
    tags: ["Leadership", "Cloud", "Architecture"],
    description: "Lead flight and accommodation booking squads",
    jobUrl: "https://example.com/jobs/10",
    salary: "IDR 40M - 60M",
  },
  // Offer
  {
    company: "Shopee",
    position: "Lead Software Engineer",
    location: "Singapore",
    tags: ["System Design", "Python", "Kubernetes"],
    description: "Lead search and recommendation engine team",
    jobUrl: "https://example.com/jobs/11",
    salary: "SGD 12k - 18k",
  },
  {
    company: "Bukalapak",
    position: "Principal Architect",
    location: "Jakarta, Indonesia",
    tags: ["Microservices", "Event-Driven", "Cloud"],
    description: "Enterprise technical strategy and architectural governance",
    jobUrl: "https://example.com/jobs/12",
    salary: "IDR 50M - 75M",
  },
  // Rejected
  {
    company: "Google",
    position: "Software Engineer III",
    location: "Mountain View, CA",
    tags: ["Algorithms", "C++", "Large Scale"],
    description: "Search ranking and quality infrastructure",
    jobUrl: "https://example.com/jobs/13",
    salary: "$180k - $240k",
  },
  {
    company: "Meta",
    position: "Production Engineer",
    location: "Menlo Park, CA",
    tags: ["Linux", "Python", "Reliability"],
    description: "Keep infrastructure and services reliable at massive scale",
    jobUrl: "https://example.com/jobs/14",
    salary: "$170k - $230k",
  },
  {
    company: "Netflix",
    position: "Senior Platform Engineer",
    location: "Los Gatos, CA",
    tags: ["Java", "AWS", "Chaos Engineering"],
    description: "Global video streaming cloud delivery pipeline",
    jobUrl: "https://example.com/jobs/15",
    salary: "$250k - $350k",
  },
];

async function seed() {
  if (!USER_ID) {
    console.error("❌ Error: SEED_USER_ID environment variable is required");
    console.log("Usage: SEED_USER_ID=your-user-id pnpm seed:jobs");
    process.exit(1);
  }

  try {
    console.log("🌱 Starting seed process...");
    console.log(`📋 Seeding data for user ID: ${USER_ID}`);

    await connectDB();
    console.log("✅ Connected to database");

    // Clear existing job applications for this user
    const deleteResult = await JobApplication.deleteMany({ userId: USER_ID });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing job applications`);

    // Distribute jobs across status categories
    const jobsByStatus: Record<JobStatus, typeof SAMPLE_JOBS> = {
      wishlist: SAMPLE_JOBS.slice(0, 3),
      applied: SAMPLE_JOBS.slice(3, 7),
      interviewing: SAMPLE_JOBS.slice(7, 10),
      offer: SAMPLE_JOBS.slice(10, 12),
      rejected: SAMPLE_JOBS.slice(12, 15),
      ghosted: [],
    };

    let totalCreated = 0;

    for (const [status, jobs] of Object.entries(jobsByStatus) as [JobStatus, typeof SAMPLE_JOBS][]) {
      for (let i = 0; i < jobs.length; i++) {
        const jobData = jobs[i];
        await JobApplication.create({
          company: jobData.company,
          position: jobData.position,
          location: jobData.location,
          tags: jobData.tags,
          description: jobData.description,
          jobUrl: jobData.jobUrl,
          salary: jobData.salary,
          userId: USER_ID,
          status,
          order: i,
          columnEnteredAt: new Date(),
          appliedDate: status === "applied" ? new Date() : undefined,
        });
        totalCreated++;
      }
      console.log(`✅ Added ${jobs.length} jobs to "${status}" status`);
    }

    console.log(`\n🎉 Seed completed successfully!`);
    console.log(`📊 Created ${totalCreated} job applications`);
    console.log(`👤 User ID: ${USER_ID}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
