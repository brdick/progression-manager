# PowerShell deployment script for Render.com
# This script helps with manual deployment tasks and validation

param(
    [string]$Action = ""
)

Write-Host "🚀 Progression Manager Deployment Script" -ForegroundColor Green
Write-Host "========================================"
Write-Host "Platform: Render.com FREE Tier" -ForegroundColor Cyan
Write-Host ""

# Check if doctl is installed
if (!(Get-Command doctl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ doctl CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
}

# Check if authenticated
try {
    doctl auth list | Out-Null
    Write-Host "✅ doctl CLI is ready" -ForegroundColor Green
} catch {
    Write-Host "❌ Not authenticated with DigitalOcean. Run 'doctl auth init' first." -ForegroundColor Red
    exit 1
}

# Function to create new app
function Create-App {
    Write-Host "📦 Creating new app on DigitalOcean App Platform..." -ForegroundColor Yellow
    if (Test-Path ".do/app.yaml") {
        doctl apps create --spec .do/app.yaml
        Write-Host "✅ App created successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ App spec file (.do/app.yaml) not found!" -ForegroundColor Red
        exit 1
    }
}

# Function to update existing app
function Update-App {
    Write-Host "🔄 Updating existing app..." -ForegroundColor Yellow
    $appId = Read-Host "Enter your app ID"
    if (Test-Path ".do/app.yaml") {
        doctl apps update $appId --spec .do/app.yaml
        Write-Host "✅ App updated successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ App spec file (.do/app.yaml) not found!" -ForegroundColor Red
        exit 1
    }
}

# Function to list apps
function List-Apps {
    Write-Host "📋 Your DigitalOcean apps:" -ForegroundColor Yellow
    doctl apps list
}

# Function to get app info
function Get-AppInfo {
    $appId = Read-Host "Enter your app ID"
    Write-Host "📊 App information:" -ForegroundColor Yellow
    doctl apps get $appId
}

# Function to view app logs
function View-Logs {
    $appId = Read-Host "Enter your app ID"
    Write-Host "📝 Recent app logs:" -ForegroundColor Yellow
    doctl apps logs $appId --follow
}

# Function to validate files
function Validate-Files {
    Write-Host "🔍 Validating project files..." -ForegroundColor Yellow
    
    # Check required files
    $requiredFiles = @("index.html", "css/main.css", ".do/app.yaml", "Dockerfile", "nginx.conf", "setup-auth.sh")
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Host "✅ $file found" -ForegroundColor Green
        } else {
            Write-Host "❌ $file missing" -ForegroundColor Red
        }
    }
    
    # Check JavaScript files for basic syntax
    Write-Host "🔍 Checking JavaScript syntax..." -ForegroundColor Yellow
    try {
        Get-ChildItem -Path "js/" -Filter "*.js" | ForEach-Object {
            node -c $_.FullName
        }
        Write-Host "✅ JavaScript syntax OK" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Some JavaScript files may have syntax issues" -ForegroundColor Yellow
    }
    
    # Check authentication setup
    Write-Host "🔍 Checking authentication setup..." -ForegroundColor Yellow
    if (Test-Path "setup-auth.sh") {
        Write-Host "✅ Authentication setup script found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Authentication setup script missing" -ForegroundColor Yellow
    }
    
    Write-Host "✅ Validation complete" -ForegroundColor Green
    Write-Host ""
    Write-Host "ℹ️  Note: This deployment includes HTTP Basic Authentication" -ForegroundColor Cyan
    Write-Host "   Your site will require login credentials after deployment" -ForegroundColor Cyan
    Write-Host "   Check build logs for the generated username/password" -ForegroundColor Cyan
}

# Handle command line parameter
if ($Action -ne "") {
    switch ($Action.ToLower()) {
        "create" { Create-App; return }
        "update" { Update-App; return }
        "list" { List-Apps; return }
        "info" { Get-AppInfo; return }
        "logs" { View-Logs; return }
        "validate" { Validate-Files; return }
        default { 
            Write-Host "❌ Invalid action. Available actions: create, update, list, info, logs, validate" -ForegroundColor Red
            exit 1
        }
    }
}

# Interactive menu
Write-Host ""
Write-Host "What would you like to do?"
Write-Host "1. Create new app"
Write-Host "2. Update existing app"
Write-Host "3. List my apps"
Write-Host "4. Get app information"
Write-Host "5. View app logs"
Write-Host "6. Validate project files"
Write-Host "7. Exit"
Write-Host ""

$choice = Read-Host "Choose an option (1-7)"

switch ($choice) {
    "1" { Create-App }
    "2" { Update-App }
    "3" { List-Apps }
    "4" { Get-AppInfo }
    "5" { View-Logs }
    "6" { Validate-Files }
    "7" { 
        Write-Host "👋 Goodbye!" -ForegroundColor Green
        exit 0
    }
    default { 
        Write-Host "❌ Invalid option. Please choose 1-7." -ForegroundColor Red
        exit 1
    }
}
