# Project Implementation

## Project Objectives and Scope
- Improve Admin Dashboard UI/UX, specifically focusing on the Sidebar and Login flow.
- Redesign and implement a comprehensive admin dashboard with professional-grade analytics visualization.
- Include interactive line charts, bar graphs, and pie charts (key performance metrics, user analytics, and business intelligence) using `recharts`.
- Modern UI/UX layout featuring a responsive grid system with card-based components.
- The Admin Login OTP step must be presented as a popup modal over the main login screen rather than replacing it entirely, maintaining context.
- The OTP modal must display an accurate real-time countdown timer to visualize expiration.
- The Admin Sidebar must be redesigned for a professional layout, ensuring correct arrangement, spacing, and visual hierarchy.

## Architectural Decisions and Design Rationale
- **Analytics Dashboard**: We will use `recharts` for the interactive visualizations (LineChart, BarChart, PieChart). Data will include total subscribers, releases, and generated mock analytics data (since deep tracking DB isn't present, we'll provide mock data payload from the API representing real-world user activity, streaming numbers, and traffic sources) to fulfill the visualization requirement.
- **Sidebar Refactoring**: Moving away from the default `@coreui/react` sidebar which might have conflicting styles, we will implement a custom, highly professional sidebar using inline styles and `lucide-react` icons. This ensures a cohesive look with the rest of the dark-themed admin interface.
- **OTP Modal**: We will update the `Login` component state management to overlay an OTP modal on top of the password form when `step === 'otp'`. The timer logic will be refined for accuracy.

## Technology Stack
- Frontend: React (Vite), React Router, Lucide React (Icons), Recharts (Data Visualization)
- Backend: PHP (PDO, MySQL)
- Styling: Inline CSS with CSS-in-JS patterns for dynamic theming (Dark Mode)

## Folder and Module Structure
- `frontend/src/Admin.jsx`: Contains the `Login`, `AdminLayout`, and individual admin views.

## Data Models and Relationships
- N/A for UI/UX changes.

## UI/UX Standards
- Enforce modern dark theme UI (#18181b, #27272a) with emerald green accents (#10b981).
- Maintain WCAG accessibility standards (contrast ratios, focus states).
- Sidebar: Fixed position, collapsible, with distinct hover states and active route highlighting.

## Security, Performance, Testing, and Deployment
- Ensure OTP timer correctly invalidates input upon expiration.
- Keep the UI responsive and performant.
- Removed debug `console.log` from production login responses. 
- **Note on Browser Warnings:** The `[Violation] Avoid using document.write()` and `Permissions policy violation: xr-spatial-tracking` warnings seen in the console originate from the Cloudflare Turnstile (`@marsidev/react-turnstile`) iframe (`normal?lang=auto:1`). These are harmless, third-party script internals managed by Cloudflare that do not break or affect the application's functionality.
