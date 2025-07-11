#!/bin/bash
# Build script for DigitalOcean App Platform
# Sets up authentication and cleans up sensitive files

set -e

echo "🚀 Starting build process..."

# Set up HTTP Basic Authentication
echo "🔐 Setting up HTTP Basic Authentication..."
if [ -f "setup-auth.sh" ]; then
    chmod +x setup-auth.sh
    ./setup-auth.sh
else
    echo "❌ setup-auth.sh not found!"
    exit 1
fi

# Display credentials for build logs (so you can see them in deployment)
echo ""
echo "=============================================="
echo "🔑 AUTHENTICATION CREDENTIALS (SAVE THESE!):"
echo "=============================================="
echo "🌐 Site URL: Your DigitalOcean App Platform URL"
if [ -f ".auth_credentials" ]; then
    echo "👤 Username: $(grep USERNAME .auth_credentials | cut -d= -f2)"
    echo "🔐 Password: $(grep PASSWORD .auth_credentials | cut -d= -f2)"
else
    echo "❌ Credentials file not found!"
    exit 1
fi
echo "=============================================="
echo "⚠️  IMPORTANT NOTES:"
echo "   • DigitalOcean provides HTTPS automatically"
echo "   • Save these credentials immediately"
echo "   • You'll need them to access your site"
echo "   • Authentication is handled at nginx level"
echo "=============================================="
echo ""

# Clean up setup files
echo "🗑️ Cleaning up setup files..."
rm -f setup-auth.sh setup-auth.ps1 .auth_credentials

echo "✅ Build process complete!"
echo "📝 The .htpasswd file has been created for authentication"
echo "🌐 Your site will require login with the credentials shown above"
