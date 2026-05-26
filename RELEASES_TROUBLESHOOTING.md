# Releases Page Troubleshooting Guide

## Changes Made to Fix Release Page

### 1. Enhanced Error Logging in App.jsx
Added console logging to help debug API issues:
- Logs API response status
- Logs API response data
- Logs errors with detailed messages

### 2. Improved Error Display
When a release fails to load, the error page now shows:
- The error message
- The shortcode being requested
- The full API URL being called
- A "Go to Home" button for easy navigation

### 3. API Test Tool
Created `test_api.html` - a standalone test page to verify API functionality

## How to Test & Debug

### Step 1: Open the Test Page
Open `test_api.html` in your browser:
```
file:///c:/xampp/htdocs/leirad_artist/test_api.html
```

This will let you:
- Test if the API base URL is accessible
- Test fetching a release by shortcode
- Check CORS headers

### Step 2: Check Browser Console
When visiting a release page (e.g., `http://localhost:5173/?s=YOUR_SHORTCODE`):
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for:
   - `API Response Status:` - Shows HTTP status code
   - `API Response Data:` - Shows the JSON response
   - `API Error:` or `Fetch Error:` - Shows what went wrong

### Step 3: Common Issues & Solutions

#### Issue 1: "Release not found"
**Cause:** The shortcode doesn't exist in the database
**Solution:** 
- Check if the shortcode exists in your database
- Use the Admin panel to verify releases
- Try with a known valid shortcode

#### Issue 2: "Failed to load release from API"
**Cause:** Network error, CORS issue, or API endpoint unreachable
**Solutions:**
1. Verify API URL is correct: `https://blandolms.ccsblock2.com/backend/api`
2. Check if the server is running
3. Check CORS headers (use test_api.html)
4. Check network tab in browser dev tools

#### Issue 3: CORS Error
**Cause:** Server not sending proper CORS headers
**Solution:** 
The API already has CORS headers in `get_release.php`:
```php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
```

#### Issue 4: 404 Not Found
**Cause:** API endpoint doesn't exist on the server
**Solutions:**
1. Verify files are uploaded to the server
2. Check file path: `/backend/api/get_release.php`
3. Test direct URL: `https://blandolms.ccsblock2.com/backend/api/get_release.php?s=test`

### Step 4: Verify Database Has Releases

Run this SQL query to check existing releases:
```sql
SELECT id, shortcode, title, artist FROM releases;
```

### Step 5: Test with Valid Shortcode

Once you have a valid shortcode from the database:
1. Visit: `http://localhost:5173/?s=VALID_SHORTCODE`
2. Check console for logs
3. Verify the release loads correctly

## Files Modified

1. **frontend/src/App.jsx**
   - Added console logging for debugging
   - Enhanced error page with more details
   - Added "Go to Home" button on error

2. **test_api.html** (NEW)
   - Standalone API testing tool
   - Tests base URL, release fetching, and CORS

## Quick Checklist

- [ ] API server is running and accessible
- [ ] Database has releases with shortcodes
- [ ] CORS headers are properly set
- [ ] Frontend is using correct API_BASE_URL
- [ ] Shortcode in URL is valid and exists in database
- [ ] Browser console shows successful API response

## Need More Help?

If the issue persists:
1. Open `test_api.html` and run all tests
2. Check browser console for error messages
3. Verify the API URL in `frontend/.env` is correct
4. Check server logs for PHP errors
5. Verify database connection in `backend/core/db.php`
