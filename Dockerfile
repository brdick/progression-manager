# Dockerfile for Render.com deployment
# This is the PREFERRED deployment method for this application
# Uses nginx to serve static files with HTTP Basic Authentication

# Use nginx to serve static files
FROM nginx:alpine

# Install openssl for password generation
RUN apk add --no-cache openssl

# Copy setup script
COPY setup-auth.sh /tmp/setup-auth.sh

# Make script executable and run it
RUN chmod +x /tmp/setup-auth.sh && \
    cd /tmp && \
    ./setup-auth.sh && \
    mv .htpasswd /etc/nginx/.htpasswd && \
    echo "=============================================" && \
    echo "🔑 RENDER.COM AUTHENTICATION CREDENTIALS" && \
    echo "🔑 SAVE THESE CREDENTIALS IMMEDIATELY!" && \
    echo "=============================================" && \
    cat .auth_credentials && \
    echo "=============================================" && \
    echo "⚠️  IMPORTANT: Save the credentials above!" && \
    echo "   You will need them to access your site." && \
    echo "   Check Render build logs for these credentials." && \
    echo "=============================================" && \
    echo "🔍 Verifying setup..." && \
    test -f /etc/nginx/.htpasswd && echo "✅ .htpasswd file created" || echo "❌ .htpasswd file missing" && \
    rm -f setup-auth.sh .auth_credentials

# Copy static files to nginx html directory
COPY . /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove setup files from web directory
RUN rm -f /usr/share/nginx/html/setup-auth.sh /usr/share/nginx/html/setup-auth.ps1 /usr/share/nginx/html/.htpasswd

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
