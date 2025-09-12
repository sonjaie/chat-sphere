#!/bin/bash

# ChatSphere Environment Setup Script

echo "🚀 Setting up ChatSphere environment variables..."

# Check if .env.local already exists in client directory
if [ -f "client/.env.local" ]; then
    echo "⚠️  client/.env.local already exists. Backing up to client/.env.local.backup"
    cp client/.env.local client/.env.local.backup
fi

# Create .env.local template in client directory (where Vite looks for it)
echo "📝 Creating client/.env.local template..."
cat > client/.env.local << 'EOF'
# Supabase Configuration
# Replace these with your actual Supabase project credentials
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SECRET_KEY=your_supabase_secret_key_here

# Project Information
SUPABASE_PROJECT_ID=your_project_id_here

# Development
NODE_ENV=development
EOF

echo "✅ Environment template created successfully!"
echo ""
echo "⚠️  IMPORTANT: You need to replace the placeholder values with your actual Supabase credentials:"
echo ""
echo "📋 Required environment variables:"
echo "   VITE_SUPABASE_URL: Your Supabase project URL"
echo "   VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key"
echo "   VITE_SUPABASE_SECRET_KEY: Your Supabase service role key"
echo "   SUPABASE_PROJECT_ID: Your Supabase project ID"
echo ""
echo "🔧 Next steps:"
echo "   1. Edit client/.env.local and replace placeholder values with your actual credentials"
echo "   2. Get your credentials from: https://app.supabase.com/project/YOUR_PROJECT/settings/api"
echo "   3. Run 'npm run dev' to start development"
echo "   4. Set up GitHub Secrets for CI/CD"
echo "   5. Configure Vercel environment variables for production"
echo ""
echo "🔒 Security Note: Never commit .env.local or any file containing real credentials!"
echo "📚 For detailed setup instructions, see ENVIRONMENT_SETUP.md"
