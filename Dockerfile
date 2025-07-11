# Dockerfile for Render.com deployment
# This is the PREFERRED deployment method for this application
# Uses nginx to serve static files with HTTP Basic Authentication

# Use nginx to serve static files
FROM nginx:alpine

# Install openssl for password generation and create authentication
RUN apk add --no-cache openssl && \
    # Generate authentication credentials
    USERNAME="admin" && \
    PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-20) && \
    HTPASSWD_ENTRY=$(echo -n "$PASSWORD" | openssl passwd -apr1 -stdin) && \
    echo "$USERNAME:$HTPASSWD_ENTRY" > /etc/nginx/.htpasswd && \
    echo "=============================================" && \
    echo "🔑 RENDER.COM AUTHENTICATION CREDENTIALS" && \
    echo "🔑 SAVE THESE CREDENTIALS IMMEDIATELY!" && \
    echo "=============================================" && \
    echo "👤 Username: $USERNAME" && \
    echo "🔐 Password: $PASSWORD" && \
    echo "=============================================" && \
    echo "⚠️  IMPORTANT: Save the credentials above!" && \
    echo "   You will need them to access your site." && \
    echo "   Check Render build logs for these credentials." && \
    echo "=============================================" && \
    echo "🔍 Verifying setup..." && \
    test -f /etc/nginx/.htpasswd && echo "✅ .htpasswd file created" || echo "❌ .htpasswd file missing"

# Copy static files to nginx html directory
COPY . /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove any deployment files from web directory (except the .htpasswd which is in /etc/nginx/)
RUN rm -f /usr/share/nginx/html/setup-auth.sh /usr/share/nginx/html/setup-auth.ps1 /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/render.yaml /usr/share/nginx/html/.gitignore

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
