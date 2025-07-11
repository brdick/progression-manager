#!/bin/bash
# Deployment script for Render.com
# This script helps with manual deployment tasks and validation

set -e

echo "🚀 Progression Manager Deployment Script"
echo "========================================"
echo "Platform: Render.com FREE Tier"
echo ""

# Function to validate files
validate_files() {
    echo "🔍 Validating project files for Render deployment..."
    
    # Check required files
    required_files=("index.html" "css/main.css" "render.yaml" "Dockerfile" "nginx.conf" "setup-auth.sh")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            echo "✅ $file found"
        else
            echo "❌ $file missing"
        fi
    done
    
    # Check JavaScript files for basic syntax
    echo "🔍 Checking JavaScript syntax..."
    find js/ -name "*.js" -exec node -c {} \; 2>/dev/null && echo "✅ JavaScript syntax OK" || echo "⚠️  Some JavaScript files may have syntax issues"
    
    # Check authentication setup
    echo "🔍 Checking authentication setup..."
    if [ -x "setup-auth.sh" ]; then
        echo "✅ Authentication setup script is executable"
    else
        echo "⚠️  Authentication setup script may not be executable"
    fi
    
    # Check Render configuration
    if [ -f "render.yaml" ]; then
        echo "✅ Render configuration found"
    else
        echo "❌ render.yaml missing - required for Render deployment"
    fi
    
    echo "✅ Validation complete"
    echo ""
    echo "ℹ️  Note: This deployment uses Render.com FREE tier"
    echo "   • 750 hours/month (enough for always-on personal use)"
    echo "   • Automatic HTTPS with SSL certificates"
    echo "   • Server-side HTTP Basic Authentication"
    echo "   • Check Render build logs for generated credentials"
}

# Function to show deployment instructions
show_deployment_guide() {
    echo "📋 Render.com Deployment Instructions:"
    echo "======================================"
    echo ""
    echo "1. 🔗 Go to https://render.com and sign up (FREE)"
    echo "2. 🔌 Connect your GitHub account"
    echo "3. ➕ Create New Web Service"
    echo "4. 📂 Select this repository"
    echo "5. ⚙️  Configure service:"
    echo "   • Name: progression-manager"
    echo "   • Environment: Docker"
    echo "   • Plan: Free"
    echo "   • Branch: main"
    echo "   • Auto-Deploy: Yes"
    echo "6. 🚀 Deploy!"
    echo ""
    echo "🔑 After deployment:"
    echo "   • Check build logs for authentication credentials"
    echo "   • Look for section with username/password"
    echo "   • Save credentials to access your site"
    echo ""
    echo "📖 For detailed guide: see RENDER-DEPLOYMENT.md"
}

# Function to check repository status
check_repo() {
    echo "� Repository Status:"
    echo "===================="
    
    if git rev-parse --git-dir > /dev/null 2>&1; then
        echo "✅ Git repository detected"
        echo "📍 Current branch: $(git branch --show-current)"
        echo "🔄 Last commit: $(git log -1 --pretty=format:'%h - %s (%cr)')"
        
        if git diff --quiet; then
            echo "✅ Working directory clean"
        else
            echo "⚠️  Uncommitted changes detected"
            echo "   Consider committing changes before deployment"
        fi
        
        if git diff --quiet HEAD~1..HEAD; then
            echo "ℹ️  No new commits to deploy"
        else
            echo "✅ New commits ready for deployment"
        fi
    else
        echo "❌ Not a git repository"
    fi
}

# Function to test authentication locally
test_auth() {
    echo "🧪 Testing authentication setup locally..."
    
    if [ -f "setup-auth.sh" ]; then
        echo "🔐 Running authentication setup..."
        chmod +x setup-auth.sh
        ./setup-auth.sh
        
        if [ -f ".htpasswd" ]; then
            echo "✅ .htpasswd file created successfully"
            echo "📝 Generated credentials:"
            if [ -f ".auth_credentials" ]; then
                cat .auth_credentials
            fi
            echo ""
            echo "🧹 Cleaning up test files..."
            rm -f .htpasswd .auth_credentials
            echo "✅ Test complete"
        else
            echo "❌ Failed to create .htpasswd file"
        fi
    else
        echo "❌ setup-auth.sh not found"
    fi
}

# Function to list apps
list_apps() {
    echo "📋 Your DigitalOcean apps:"
    doctl apps list
}

# Function to get app info
get_app_info() {
    read -p "Enter your app ID: " app_id
    echo "📊 App information:"
    doctl apps get $app_id
}

# Function to view app logs
view_logs() {
    read -p "Enter your app ID: " app_id
    echo "📝 Recent app logs:"
    doctl apps logs $app_id --follow
}

# Function to validate files
validate_files() {
    echo "🔍 Validating project files..."
    
    # Check required files
    required_files=("index.html" "css/main.css" ".do/app.yaml" "Dockerfile" "nginx.conf" "setup-auth.sh")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            echo "✅ $file found"
        else
            echo "❌ $file missing"
        fi
    done
    
    # Check JavaScript files for basic syntax
    echo "🔍 Checking JavaScript syntax..."
    find js/ -name "*.js" -exec node -c {} \; 2>/dev/null && echo "✅ JavaScript syntax OK" || echo "⚠️  Some JavaScript files may have syntax issues"
    
    # Check authentication setup
    echo "🔍 Checking authentication setup..."
    if [ -x "setup-auth.sh" ]; then
        echo "✅ Authentication setup script is executable"
    else
        echo "⚠️  Authentication setup script may not be executable"
    fi
    
    echo "✅ Validation complete"
    echo ""
    echo "ℹ️  Note: This deployment includes HTTP Basic Authentication"
    echo "   Your site will require login credentials after deployment"
    echo "   Check build logs for the generated username/password"
}

# Main menu
echo ""
echo "What would you like to do?"
echo "1. Show deployment guide"
echo "2. Validate project files"
echo "3. Check repository status"
echo "4. Test authentication setup"
echo "5. Exit"
echo ""

read -p "Choose an option (1-5): " choice

case $choice in
    1)
        show_deployment_guide
        ;;
    2)
        validate_files
        ;;
    3)
        check_repo
        ;;
    4)
        test_auth
        ;;
    5)
        echo "👋 Goodbye!"
        echo "� Ready to deploy to Render.com!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please choose 1-5."
        exit 1
        ;;
esac
