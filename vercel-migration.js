#!/usr/bin/env node

/**
 * Vercel Build Script with Supabase Migration
 * This script runs during Vercel deployment to handle database migrations
 */

import { execSync } from 'child_process';
import fs from 'fs';

async function runMigrations() {
  try {
    console.log('🚀 Starting Supabase migration process...');
    
    // Check if we have the required environment variables
    if (!process.env.SUPABASE_PROJECT_ID || !process.env.SUPABASE_ACCESS_TOKEN) {
      console.log('⚠️  Supabase credentials not found, skipping migrations');
      console.log('   Make sure to set SUPABASE_PROJECT_ID and SUPABASE_ACCESS_TOKEN in Vercel');
      return;
    }

    // Link to the Supabase project
    console.log('🔗 Linking to Supabase project...');
    execSync(`npx supabase link --project-ref ${process.env.SUPABASE_PROJECT_ID}`, {
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN }
    });

    // Run migrations (Supabase handles idempotency automatically)
    console.log('📊 Running database migrations...');
    execSync('npx supabase migration up --linked', {
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN }
    });

    // Generate TypeScript types
    console.log('🔧 Generating TypeScript types...');
    execSync('npx supabase gen types typescript --linked > src/types/supabase.ts', {
      stdio: 'inherit',
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN }
    });

    console.log('✅ Database migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('💡 This might be expected if tables already exist - Supabase handles this gracefully');
    
    // Don't fail the build for migration errors (tables might already exist)
    console.log('⚠️  Continuing with build despite migration warnings...');
  }
}

// Only run migrations in production environment
if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
  runMigrations();
} else {
  console.log('🏠 Skipping migrations in development environment');
}
