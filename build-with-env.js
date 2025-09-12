#!/usr/bin/env node

/**
 * Build script that ensures environment variables are available during Vite build
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Starting build process with environment variables...');

// Check if required environment variables are available
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Make sure these variables are set in your Vercel project settings');
  process.exit(1);
}

console.log('✅ All required environment variables are available');

// Log environment variables (without exposing sensitive values)
console.log('📋 Environment variables:');
console.log(`   VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);

// Create a temporary .env.local file in the client directory for the build
const envContent = `# Temporary environment file for build
VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY}
VITE_SUPABASE_SECRET_KEY=${process.env.VITE_SUPABASE_SECRET_KEY || ''}
SUPABASE_PROJECT_ID=${process.env.SUPABASE_PROJECT_ID || ''}
NODE_ENV=production
`;

console.log('📝 Creating temporary environment file for build...');
fs.writeFileSync('client/.env.local', envContent);

try {
  // Run the build command
  console.log('🏗️  Running Vite build...');
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('✅ Build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} finally {
  // Clean up temporary environment file
  try {
    if (fs.existsSync('client/.env.local')) {
      fs.unlinkSync('client/.env.local');
      console.log('🧹 Cleaned up temporary environment file');
    }
  } catch (cleanupError) {
    console.warn('⚠️  Could not clean up temporary environment file:', cleanupError.message);
  }
}
