# Generate a random 32-byte key and convert to Base64
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$randomBytes = New-Object byte[] 32
$rng.GetBytes($randomBytes)
$base64Key = [System.Convert]::ToBase64String($randomBytes)

# Display the generated key
Write-Host ""
Write-Host "Generated Base64 Key (32 bytes):" -ForegroundColor Green
Write-Host $base64Key -ForegroundColor Yellow
Write-Host ""

# Pause the script
Write-Host "Press any key to continue..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
