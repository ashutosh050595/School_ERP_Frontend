# EduNest Frontend — Next.js Dashboard

School Management System frontend for Sacred Heart School Koderma.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **Fonts:** Playfair Display + DM Sans
- **API:** Connected to https://school-erp-bay.vercel.app

## Getting Started

### Install dependencies
```bash
npm install
```

### Run locally
```bash
npm run dev
```
Open http://localhost:3000

### Login
- Email: `admin@sacredheartkoderma.org`
- Password: `School@029`

## Deploy to Vercel

1. Push this folder to a new GitHub repo (e.g. `School_ERP_Frontend`)
2. Go to vercel.com → New Project → Import that repo
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://school-erp-bay.vercel.app`
4. Deploy!

## Modules Included

| Module | Status |
|--------|--------|
| Login | ✅ Full UI |
| Dashboard (Stats + Charts) | ✅ Full UI |
| Students (List + Add + View) | ✅ Full UI |
| Attendance (Mark daily) | ✅ Full UI |
| Fees (Collect + Structures) | ✅ Full UI |
| Exams & Marks | ✅ Full UI |
| Library | 🔄 API Connected |
| Timetable | 🔄 API Connected |
| Transport | 🔄 API Connected |
| Payroll | 🔄 API Connected |
| Complaints | 🔄 API Connected |
| Staff & Users | 🔄 API Connected |
| Calendar | 🔄 API Connected |
| ID Cards | 🔄 API Connected |
| Notifications | 🔄 API Connected |
| Session & Years | 🔄 API Connected |
| Settings | 🔄 API Connected |

> Modules marked 🔄 have full API integration but simplified UI. Full UI coming in next version.

## Designed & Created by Ashutosh Kumar Gautam
