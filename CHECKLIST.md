# 🚀 Deployment Checklist

Use this checklist before deploying to ensure everything is set up correctly.

## ✅ Required Files Check

- [ ] `index.html` - Main application file
- [ ] `css/main.css` - Main stylesheet  
- [ ] `js/` directory - JavaScript files
- [ ] `.do/app.yaml` - DigitalOcean App Platform configuration
- [ ] `Dockerfile` - Container build instructions
- [ ] `nginx.conf` - Web server configuration
- [ ] `setup-auth.sh` - Authentication setup script
- [ ] `build.sh` - Build script (optional, but recommended)
- [ ] `package.json` - Project metadata

## ✅ Configuration Check

- [ ] Repository URL in `.do/app.yaml` matches your GitHub repo
- [ ] Branch name in `.do/app.yaml` is correct (usually `main`)
- [ ] All setup scripts are executable (`chmod +x setup-auth.sh build.sh`)

## ✅ Pre-Deployment Test

Run these commands locally to verify:

```bash
# Check required files exist
npm run validate

# Test authentication script
chmod +x setup-auth.sh
./setup-auth.sh
ls -la .htpasswd  # Should exist
cat .auth_credentials  # Should show username/password
rm -f .htpasswd .auth_credentials  # Clean up test files
```

## ✅ Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy with authentication"
   git push origin main
   ```

2. **Create App on DigitalOcean**
   - Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Select "GitHub" and connect your repository
   - Use "Import from App Spec" and upload `.do/app.yaml`

3. **Monitor Build**
   - Watch the build logs in DigitalOcean Console
   - Look for the prominent credentials section
   - Save username and password immediately

4. **Test Deployment**
   - Visit your app URL
   - Verify authentication dialog appears
   - Log in with generated credentials
   - Test that your app loads correctly

## ✅ Post-Deployment

- [ ] App loads successfully over HTTPS
- [ ] Authentication works correctly
- [ ] All static assets load properly
- [ ] Health check endpoint works: `https://your-app-url/health`
- [ ] Credentials are saved securely

## 🔧 Troubleshooting

If something goes wrong:

1. **Check build logs** for error messages
2. **Verify all files** are committed to your repository
3. **Test locally** using the validation commands above
4. **Re-deploy** if needed (triggers new password generation)

## 📱 Access Information

After successful deployment:

- **URL**: Provided by DigitalOcean (HTTPS automatically enabled)
- **Username**: admin (default)
- **Password**: Check build logs for randomly generated password
- **Health Check**: `https://your-app-url/health` (no auth required)
