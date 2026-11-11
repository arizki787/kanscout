# Kanscout

**Scout jobs and track applications with Kanscout** — An intuitive visual Kanban board designed for looking for jobs, organizing your job search, and tracking every application from discovery to offer.

---

## 📸 App Preview

| Organize Applications | Get Hired | Manage Boards |
| :---: | :---: | :---: |
| ![Organize Applications](./public/hero-images/hero1.jpg) | ![Get Hired](./public/hero-images/hero2.jpg) | ![Manage Boards](./public/hero-images/hero3.jpg) |

---

## ✨ Features

- 🔍 **Scout Opportunities**: Organize your job search seamlessly. Store target roles and customize Kanban columns for every stage of looking for a job.
- 📊 **All-in-One Dashboard**: Never lose track of a job application. View metrics including Total Applications, Active Interviews, Final Offers, and Rejection Rates at a glance.
- 📝 **Application Management**: Keep all notes, interview schedules, salary details, and application statuses organized in one central place.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) & [React 19](https://react.dev/)
- **Styling**: Tailwind CSS v4, Lucide Icons, Shadcn UI / Base UI
- **Database & ODM**: MongoDB & Mongoose
- **Authentication**: Better Auth

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22.13+
- pnpm 10.33.0
- MongoDB instance (local or MongoDB Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/kanscout.git
   cd kanscout
   ```

2. Install dependencies with pnpm:
   ```bash
   pnpm install
   ```

3. Configure Environment Variables (`.env.local`):
   ```env
   MONGODB_URI=your_mongodb_connection_string
   BETTER_AUTH_SECRET=your_auth_secret
   BETTER_AUTH_URL=http://localhost:3000
   BRAVE_SEARCH_API_KEY=your_brave_search_api_key
   AGNES_API_KEY=your_agnes_api_key
   GEMINI_API_KEY=your_gemini_api_key
   # Optional: GEMINI_MODEL=gemini-3.1-flash-lite
   ```

   `BRAVE_SEARCH_API_KEY` powers job discovery on the Agent page. Resume parsing
   and job match scoring use Gemini first, then fall back to the Agnes API hub
   (`AGNES_API_KEY`) with the `agnes-2.5-flash` model. Configure both AI keys for
   automatic failover.

4. (Optional) Seed sample data:
   ```bash
   pnpm seed:jobs
   ```

5. Run the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.
