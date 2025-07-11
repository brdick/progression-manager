#!/bin/bash
# Deployment script for DigitalOcean App Platform
# This script helps with manual deployment tasks

set -e

echo "🚀 Progression Manager Deployment Script"
echo "========================================"

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl CLI is not installed. Please install it first:"
    echo "   https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if authenticated
if ! doctl auth list &> /dev/null; then
    echo "❌ Not authenticated with DigitalOcean. Run 'doctl auth init' first."
    exit 1
fi

echo "✅ doctl CLI is ready"

# Function to create new app
create_app() {
    echo "📦 Creating new app on DigitalOcean App Platform..."
    if [ -f ".do/app.yaml" ]; then
        doctl apps create --spec .do/app.yaml
        echo "✅ App created successfully!"
    else
        echo "❌ App spec file (.do/app.yaml) not found!"
        exit 1
    fi
}

# Function to update existing app
update_app() {
    echo "🔄 Updating existing app..."
    read -p "Enter your app ID: " app_id
    if [ -f ".do/app.yaml" ]; then
        doctl apps update $app_id --spec .do/app.yaml
        echo "✅ App updated successfully!"
    else
        echo "❌ App spec file (.do/app.yaml) not found!"
        exit 1
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
echo "1. Create new app"
echo "2. Update existing app"
echo "3. List my apps"
echo "4. Get app information"
echo "5. View app logs"
echo "6. Validate project files"
echo "7. Exit"
echo ""

read -p "Choose an option (1-7): " choice

case $choice in
    1)
        create_app
        ;;
    2)
        update_app
        ;;
    3)
        list_apps
        ;;
    4)
        get_app_info
        ;;
    5)
        view_logs
        ;;
    6)
        validate_files
        ;;
    7)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please choose 1-7."
        exit 1
        ;;
esac
