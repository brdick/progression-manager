#!/bin/bash
# Authentication setup script
# This script generates a random password and sets up HTTP Basic Auth

set -e

echo "🔐 Setting up HTTP Basic Authentication..."

# Generate a random password (20 characters, alphanumeric + special chars)
PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-20)
USERNAME="admin"

echo "Generated credentials:"
echo "Username: $USERNAME"
echo "Password: $PASSWORD"

# Create htpasswd entry using openssl (available in most environments)
HTPASSWD_ENTRY=$(echo -n "$PASSWORD" | openssl passwd -apr1 -stdin)

# Create .htpasswd file
echo "$USERNAME:$HTPASSWD_ENTRY" > .htpasswd

echo "✅ Authentication setup complete!"
echo "📝 Credentials saved to .htpasswd"
echo ""
echo "=============================================="
echo "🔑 AUTHENTICATION CREDENTIALS (SAVE THESE!):"
echo "=============================================="
echo "👤 Username: $USERNAME"
echo "🔐 Password: $PASSWORD"
echo "=============================================="
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   • Your site will be protected by HTTP Basic Auth"
echo "   • DigitalOcean provides HTTPS automatically"
echo "   • Save these credentials immediately"
echo "   • All visitors will need to enter these to access your site"
echo "=============================================="
echo ""

# Optionally save credentials to a temporary file that can be read during build
echo "USERNAME=$USERNAME" > .auth_credentials
echo "PASSWORD=$PASSWORD" >> .auth_credentials

echo "🗑️ Remember to delete .auth_credentials after noting the password!"
