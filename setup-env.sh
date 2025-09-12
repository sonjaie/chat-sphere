#!/bin/bash

# ChatSphere Environment Setup Script

echo "🚀 Setting up ChatSphere environment variables..."

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Create .env.local with actual values
echo "📝 Creating .env.local with your Supabase credentials..."
cat > .env.local << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://tnvkyuqobuzrgsumuxtc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc
VITE_SUPABASE_SECRET_KEY=sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69

# Project Information
SUPABASE_PROJECT_ID=tnvkyuqobuzrgsumuxtc

# Development
NODE_ENV=development
EOF

echo "✅ Environment file created successfully!"
echo ""
echo "📋 Your environment variables:"
echo "   VITE_SUPABASE_URL: https://tnvkyuqobuzrgsumuxtc.supabase.co"
echo "   VITE_SUPABASE_ANON_KEY: sb_publishable_lQ53WcucGUBSsHRx3_05rw_abBUC9yc"
echo "   VITE_SUPABASE_SECRET_KEY: sb_secret_Ab20oLCK4f2-PkJShWgKVw_Ws0dxK69"
echo "   SUPABASE_PROJECT_ID: tnvkyuqobuzrgsumuxtc"
echo ""
echo "🔧 Next steps:"
echo "   1. Review .env.local file"
echo "   2. Run 'npm run dev' to start development"
echo "   3. Set up GitHub Secrets (see ENVIRONMENT_SETUP.md)"
echo "   4. Configure Vercel environment variables"
echo ""
echo "📚 For detailed setup instructions, see ENVIRONMENT_SETUP.md"
