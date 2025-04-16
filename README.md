
# SysQuote - Training Quote Management System

SysQuote is a comprehensive web application designed to streamline the process of creating, managing, and pricing training quotes for technical systems.

## Project Overview

SysQuote helps professionals create detailed training quotes by providing a structured workflow that includes:

- Machine selection and configuration
- Software selection and configuration
- Training topic organization
- Resource planning and allocation
- Cost calculation and quote generation

## Features

- **Quote Management**: Create, edit, and track quotes in a centralized dashboard
- **Geographic Areas**: Organize quotes by region with specific pricing models
- **Machine & Software Configuration**: Select from a library of machine types and software packages
- **Training Planning**: Plan training sessions with detailed topic breakdown
- **Resource Allocation**: Assign resources efficiently to optimize training delivery
- **Cost Calculation**: Automatically calculate costs based on selected components
- **PDF Export**: Generate professional quote documents for clients
- **User Management**: Multi-user system with role-based permissions
- **Dark Mode UI**: Eye-friendly interface optimized for extended use

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **State Management**: React Query, React Context
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router
- **Visualization**: Recharts, Gantt charts for planning
- **Development**: Vite, ESLint

## Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Step 3: Install dependencies
npm i

# Step 4: Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Project Structure

- `/src` - Application source code
  - `/components` - UI components
    - `/shared` - Reusable domain components
    - `/ui` - Base UI components
  - `/hooks` - Custom React hooks
  - `/pages` - Page components
  - `/integrations` - External service integrations
  - `/utils` - Utility functions
  - `/router` - Routing configuration
  - `/store` - State management

## Deployment

This project can be deployed through Lovable's built-in deployment system. Simply open [Lovable](https://lovable.dev/projects/463d6c01-da6a-441b-af7b-edc707867113) and click on Share -> Publish.

## Custom Domain Setup

To connect a domain, navigate to Project > Settings > Domains in Lovable and click Connect Domain.

## License

This project is proprietary and confidential. Unauthorized copying, transfer, or reproduction of the contents is strictly prohibited.

## Acknowledgments

- Powered by Andrea Parisi and Lovable
