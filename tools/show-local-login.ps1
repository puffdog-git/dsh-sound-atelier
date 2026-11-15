param([switch]$RevealPassword)
$ErrorActionPreference='Stop'
$ttsCredentialFile=Join-Path ([Environment]::GetFolderPath('UserProfile')) '.dsh/tts-runtimes/credentials/xinference-local.dpapi'
if(-not(Test-Path -LiteralPath $ttsCredentialFile)){throw 'No managed local account exists for this Windows user.'}
Add-Type -AssemblyName System.Security
$ttsProtectedBytes=[IO.File]::ReadAllBytes($ttsCredentialFile)
$ttsClearBytes=[Security.Cryptography.ProtectedData]::Unprotect($ttsProtectedBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$ttsAccount=[Text.Encoding]::UTF8.GetString($ttsClearBytes) | ConvertFrom-Json
Write-Output ('Local address: '+$ttsAccount.origin)
Write-Output ('Administrator: '+$ttsAccount.username)
if($RevealPassword){Write-Output ('Password: '+$ttsAccount.password)}else{Write-Output 'Add -RevealPassword to display the password in this local terminal.'}
# The API token is deliberately not displayed by this utility.
