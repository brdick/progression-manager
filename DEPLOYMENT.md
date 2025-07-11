# DigitalOcean App Platform Deployment Guide

This document explains how to deploy the Progression Manager application to DigitalOcean's App Platform with HTTP Basic Authentication.

## 🔐 Security Features

This deployment includes **HTTP Basic Authentication** that:
- Generates a random 20-character password during build
- Creates a username/password combo (default username: "admin")
- Protects the entire application with nginx-level authentication
- **Displays credentials prominently in build logs** for easy copying
- Automatically cleans up setup files after deployment
- **Works with HTTPS** - DigitalOcean App Platform provides SSL automatically

## 🚀 Automatic Build Process

**Yes, DigitalOcean App Platform automatically builds everything:**

1. **Triggers**: Builds automatically when you push to the `main` branch
2. **Docker Build**: Uses the included Dockerfile to build your container
3. **Authentication Setup**: Runs during the Docker build process
4. **Password Display**: Shows credentials prominently in build logs
5. **SSL/HTTPS**: DigitalOcean automatically provides SSL certificates
6. **Deployment**: Automatically deploys the built container

## 📋 Finding Your Password

**The password is displayed in multiple places:**

1. **Build Logs** (Primary method):
   - Go to your app in DigitalOcean Console
   - Click "Activity" tab
   - Look for the most recent build
   - Scroll through build logs for the credentials section:
   ```
   ==============================================
   🔑 AUTHENTICATION CREDENTIALS (SAVE THESE!):
   ==============================================
   🌐 Site URL: Your DigitalOcean App Platform URL
   👤 Username: admin
   🔐 Password: Xy9#mK2$nR8@pL4&qT7!
   ==============================================
   ```

2. **Runtime Logs** (Backup method):
   - In the same console, check "Runtime Logs"
   - The credentials are also shown there during startup

## Prerequisites

1. **DigitalOcean Account**: You need a DigitalOcean account
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **DigitalOcean CLI (Optional)**: For command-line deployment

## Deployment Methods

### Method 1: Using DigitalOcean Console (Recommended for first-time setup)

1. **Login to DigitalOcean**
   - Go to [DigitalOcean Console](https://cloud.digitalocean.com/)
   - Navigate to "App Platform" in the sidebar

2. **Create a New App**
   - Click "Create App"
   - Choose "GitHub" as your source
   - Connect your GitHub account if not already connected
   - Select your repository: `brdick/progression-manager`
   - Choose branch: `main`

3. **Configure App Settings**
   - App type: Select "Web Service" (not Static Site due to authentication)
   - Build Method: "Dockerfile"
   - HTTP Port: 80
   - The Dockerfile will handle nginx configuration and authentication setup

4. **Review and Deploy**
   - Choose your app name: `progression-manager`
   - Select region (closest to your users)
   - Review pricing (Basic XXS should be sufficient)
   - Click "Create Resources"

5. **⚠️ IMPORTANT: Save Your Login Credentials**
   - After deployment starts, immediately check the build logs
   - Look for the prominent section showing "AUTHENTICATION CREDENTIALS"
   - The credentials are displayed with clear formatting and emoji icons
   - Save both the username and password - you'll need them to access your site!
   - **Your site will be available over HTTPS** (DigitalOcean handles SSL automatically)

### Method 2: Using App Spec (`.do/app.yaml`)

1. **Use the included App Spec file**
   - The repository includes `.do/app.yaml` with pre-configured settings
   - In DigitalOcean Console, choose "Import from App Spec"
   - Upload or paste the contents of `.do/app.yaml`
   - ⚠️ **Important**: This uses Docker deployment for authentication support

2. **Update Repository Reference**
   - Ensure the GitHub repo reference in `app.yaml` matches your repository
   - Update branch name if different from `main`

3. **Check Build Logs for Credentials**
   - After deployment, the build logs will show your login credentials
   - Save these credentials immediately!

### Method 3: Using DigitalOcean CLI

1. **Install doctl**
   ```bash
   # macOS
   brew install doctl
   
   # Windows (using Chocolatey)
   choco install doctl
   
   # Linux
   snap install doctl
   ```

2. **Authenticate**
   ```bash
   doctl auth init
   ```

3. **Deploy using App Spec**
   ```bash
   doctl apps create --spec .do/app.yaml
   ```

## Environment Configuration

### Authentication System
The application includes HTTP Basic Authentication that:
- Automatically generates a secure random password during build
- Uses username "admin" by default
- Password is 20 characters long with mixed alphanumeric and special characters
- Credentials are displayed in build logs for you to save
- All setup files are automatically deleted after deployment

**To find your credentials:**
1. Go to your app in DigitalOcean Console
2. Click on "Activity" or "Runtime Logs"
3. Look for the build logs containing "AUTHENTICATION CREDENTIALS"
4. Save the username and password shown

### Custom Domain (Optional)
1. In DigitalOcean Console, go to your app
2. Navigate to "Settings" > "Domains"
3. Add your custom domain
4. Update your DNS records as instructed

### Environment Variables
This static site doesn't require environment variables, but if you need them:
1. Go to app settings in DigitalOcean Console
2. Navigate to "App-Level Environment Variables"
3. Add variables as needed

## Automatic Deployment

### GitHub Actions (Included)
- The repository includes `.github/workflows/deploy.yml`
- Automatic deployment on pushes to `main` branch
- Requires `DIGITALOCEAN_ACCESS_TOKEN` secret in GitHub

### Setting up GitHub Secret
1. In DigitalOcean, generate an API token:
   - Go to API > Tokens/Keys
   - Generate new token with read/write permissions
2. In GitHub repository settings:
   - Go to Settings > Secrets and Variables > Actions
   - Add new secret: `DIGITALOCEAN_ACCESS_TOKEN`
   - Paste your DigitalOcean API token

## Monitoring and Maintenance

### App Metrics
- Monitor performance in DigitalOcean Console
- Check deployment logs for any issues
- Monitor bandwidth usage

### Updates
- Push changes to your `main` branch
- App Platform will automatically rebuild and redeploy
- Check deployment status in the console

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all referenced files exist
   - Verify file paths are correct (case-sensitive)

2. **Can't Find Login Credentials**
   - Go to DigitalOcean Console → Your App → Activity tab
   - Click on the most recent build/deployment
   - Scroll through the build logs looking for the credentials section
   - The credentials are displayed with prominent borders and emojis
   - If you can't find them, trigger a new deployment to generate new ones

3. **404 Errors**
   - Ensure `index.html` exists in root
   - Check that error_document is set to `index.html` for SPA behavior

4. **Asset Loading Issues**
   - Verify relative paths in HTML/CSS/JS files
   - Check that all assets are committed to the repository

5. **Authentication Not Working**
   - Verify the `.htpasswd` file was created during build
   - Check nginx logs for authentication errors
   - Try clearing browser cache and cookies

### Getting Help
- DigitalOcean Documentation: https://docs.digitalocean.com/products/app-platform/
- Community Support: https://www.digitalocean.com/community/
- Contact Support through DigitalOcean Console

## Cost Optimization

- Static sites on App Platform are very cost-effective
- Consider using CDN for better global performance
- Monitor usage to optimize resource allocation

## Security Considerations

- The nginx configuration includes security headers
- All traffic is served over HTTPS by default
- No server-side processing reduces attack surface
