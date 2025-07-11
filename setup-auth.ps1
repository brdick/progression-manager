# PowerShell Authentication setup script
# This script generates a random password and sets up HTTP Basic Auth

Write-Host "🔐 Setting up HTTP Basic Authentication..." -ForegroundColor Green

# Generate a random password (20 characters)
$PASSWORD = -join ((65..90) + (97..122) + (48..57) + (33,35,36,37,38,42,43,45,61,63,64) | Get-Random -Count 20 | ForEach-Object {[char]$PSItem})
$USERNAME = "admin"

Write-Host "Generated credentials:" -ForegroundColor Yellow
Write-Host "Username: $USERNAME" -ForegroundColor Cyan
Write-Host "Password: $PASSWORD" -ForegroundColor Cyan

# Function to create htpasswd entry (APR1 hash)
function New-HtpasswdEntry {
    param(
        [string]$Username,
        [SecureString]$PlainPassword
    )
    
    # Convert SecureString to plain text for processing
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PlainPassword)
    $PlainTextPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    
    # Simple basic auth hash (for demonstration - in production, use proper APR1)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($PlainTextPassword)
    $hasher = [System.Security.Cryptography.SHA1]::Create()
    $hash = $hasher.ComputeHash($bytes)
    $hashString = [System.Convert]::ToBase64String($hash)
    
    # For basic compatibility, we'll use a simple format
    # In production, you might want to use a proper APR1 implementation
    return "${Username}:`$2y`$10`$$hashString"
}

# Create htpasswd entry
$htpasswdEntry = "${USERNAME}:" + [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($PASSWORD))

# Create .htpasswd file
$htpasswdEntry | Out-File -FilePath ".htpasswd" -Encoding ASCII

Write-Host "✅ Authentication setup complete!" -ForegroundColor Green
Write-Host "📝 Credentials saved to .htpasswd" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Save these credentials!" -ForegroundColor Red
Write-Host "Username: $USERNAME" -ForegroundColor Cyan
Write-Host "Password: $PASSWORD" -ForegroundColor Cyan
Write-Host ""

# Save credentials to a temporary file
"USERNAME=$USERNAME" | Out-File -FilePath ".auth_credentials" -Encoding ASCII
"PASSWORD=$PASSWORD" | Add-Content -Path ".auth_credentials" -Encoding ASCII

Write-Host "🗑️ Remember to delete .auth_credentials after noting the password!" -ForegroundColor Yellow
