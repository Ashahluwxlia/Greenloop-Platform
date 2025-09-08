# Microsoft SSO Setup Instructions

## Prerequisites
Your Microsoft SSO implementation is already complete in the code. You just need to configure the backend.

## 1. Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Configure:
   - **Name**: GreenLoop
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web - `https://hkevuwkpfkqfjiyhttva.supabase.co/auth/v1/callback`

## 2. Azure AD Configuration

1. In your app registration, go to "Authentication"
2. Add redirect URIs:
   - `https://hkevuwkpfkqfjiyhttva.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for development)

3. Go to "Certificates & secrets"
4. Create a new client secret
5. Copy the **Client ID** and **Client Secret**

## 3. Supabase Configuration

1. Go to your Supabase dashboard: https://hkevuwkpfkqfjiyhttva.supabase.co
2. Navigate to "Authentication" > "Providers"
3. Find "Azure" and click "Configure"
4. Enter:
   - **Azure Client ID**: From step 2
   - **Azure Client Secret**: From step 2
   - **Azure Tenant ID**: Your organization's tenant ID (e.g., `12345678-1234-1234-1234-123456789012`)
   - **Azure Tenant URL**: `https://login.microsoftonline.com/[YOUR-TENANT-ID]` 
     - **CRITICAL**: Replace `[YOUR-TENANT-ID]` with your actual tenant ID
     - **Example**: `https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012`
     - **DO NOT** use your domain name like `greenloop2degreesgmail.onmicrosoft.com`
   - **Use PKCE**: ✅ **ENABLE THIS** (Critical for security and preventing auth errors)
5. Save the configuration

## 4. Environment Variables

Ensure these are set in your Vercel project:
- `NEXT_PUBLIC_SUPABASE_URL`: https://hkevuwkpfkqfjiyhttva.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`: `http://localhost:3000/auth/callback`

## 5. Testing

1. Deploy your application
2. Try the "Continue with Microsoft 365" button
3. Users should be able to sign in with their Microsoft accounts
4. Profile data will be automatically populated from Azure AD

## User Experience

- **New OAuth Users**: Automatically get profiles created with Azure AD data
- **Existing Users**: Can link Microsoft accounts to existing profiles
- **Profile Data**: First name, last name, email automatically populated
- **Fallbacks**: Missing data gets sensible defaults

## Troubleshooting

### "Both auth code and code verifier should be non-empty" Error
This is a PKCE (Proof Key for Code Exchange) configuration error:

**Problem**: PKCE is not enabled in your Supabase Azure provider configuration
**Solution**: 
1. Go to Supabase Dashboard > Authentication > Providers > Azure
2. **Enable "Use PKCE"** checkbox - this is critical
3. Save the configuration
4. Clear browser cache and try again

### "Requested path is invalid" Error
This error occurs when the Azure Tenant URL is incorrectly configured in Supabase:

**Problem**: Azure Tenant URL field contains domain name instead of proper Microsoft endpoint
**Solution**: 
1. Go to Supabase Dashboard > Authentication > Providers > Azure
2. Update **Azure Tenant URL** to: `https://login.microsoftonline.com/[YOUR-TENANT-ID]`
3. **DO NOT** use: `greenloop2degreesgmail.onmicrosoft.com` or similar domain names
4. Use the actual GUID tenant ID from Azure Portal

### Finding Your Tenant ID
1. Go to Azure Portal > Azure Active Directory > Overview
2. Copy the "Tenant ID" (it's a GUID like `12345678-1234-1234-1234-123456789012`)
3. Use this in the Azure Tenant URL: `https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012`

### Other Common Issues
- Ensure redirect URIs match exactly in Azure and Supabase
- Check that the Azure app has proper permissions for user profile access
- Verify environment variables are correctly set in production
- Clear browser cache after configuration changes
