# Semantic Evaluation Web App

A Svelte web application for evaluating semantic descriptions of images by various vision models.

## Features

- **Image Evaluation Interface**: Compare original human annotations with vision model predictions
- **Randomized Presentation**: Image-model pairs are shuffled to prevent bias
- **Progress Tracking**: Visual progress bar and session management
- **Duplicate Prevention**: Avoids showing the same image-model pair multiple times
- **Responsive Design**: Works on desktop and mobile devices
- **Data Storage**: Results stored in Supabase database

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### 2. Supabase Database Setup

Create the following tables in your Supabase project:

```sql
-- Evaluations table
CREATE TABLE evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_url TEXT NOT NULL,
  original_contacts TEXT[] NOT NULL,
  model_contacts TEXT[] NOT NULL,
  model_raw_response TEXT NOT NULL
);

-- Evaluation sessions table
CREATE TABLE evaluation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  total_pairs INTEGER NOT NULL,
  completed_pairs INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (adjust as needed)
CREATE POLICY "Allow public read access" ON evaluations FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access" ON evaluation_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON evaluation_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON evaluation_sessions FOR UPDATE USING (true);
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

### 6. Build for Production

```bash
npm run build
```

## Deployment to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Set environment variables in Vercel dashboard
4. The app will be available at your Vercel URL

## Data Structure

The app processes vision model results with the following structure:

```typescript
interface EvaluationPair {
  imageId: string;
  modelName: string; // 'llama4_scout' or 'gemini'
  imageUrl: string;
  originalContacts: string[]; // Human annotations
  modelContacts: string[]; // Model predictions
  modelRawResponse: string;
}
```

## Usage

1. Users are shown an image with original human annotations
2. They see a vision model's description of the same image
3. They rate the model's accuracy on a scale of 1-10
4. Results are stored in Supabase
5. Progress is tracked to prevent duplicate evaluations

## Architecture

- **Frontend**: SvelteKit with TypeScript and Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **Image Storage**: AWS S3 (referenced via URLs)
# Contact-VLLM-Analysis
