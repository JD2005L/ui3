# Motion Wall Debugging Guide

## Testing Motion Detection

Motion Wall includes debug logging to help troubleshoot motion detection issues.

### Quick Test Steps

1. **Open Browser Console** (Press F12, then go to Console tab)

2. **Activate Motion Wall**
   - Select a camera group in UI3
   - Click the Motion Wall button in the top bar

3. **Check Console Output**
   You should see messages like:
   ```
   Motion Wall: Activated for group 'Front Yard' with 4 cameras: ["FrontDoor", "Driveway", "Garage", "Porch"]
   Motion Wall: Motion detection checking every 1 second. Watch for 'camconfig response' messages...
   ```

4. **Wait for camconfig responses**
   Within 1-4 seconds, you should see messages showing what data Blue Iris returns:
   ```
   Motion Wall: camconfig response for FrontDoor: {camera: "FrontDoor", ...}
   ```

5. **Trigger motion on a camera** in Blue Iris and watch for:
   ```
   Motion Wall: Motion detected on camera: FrontDoor
   ```

6. **Stop motion** and watch for:
   ```
   Motion Wall: Motion ended on camera: FrontDoor
   ```

## If Motion Is Not Detected

### Step 1: Check What Data Is Available

Look at the "camconfig response" message in the console. Copy the entire object and check for fields that might indicate motion:

**Common field names to look for:**
- `isMotion`, `motion`, `Motion`
- `isTriggered`, `triggered`, `Triggered`
- `isRecording`, `recording`, `Recording`
- `status`, `state`, `camstatus`

**Example response:**
```javascript
Motion Wall: camconfig response for FrontDoor: {
  camera: "FrontDoor",
  optionValue: "FrontDoor",
  optionDisplay: "Front Door Camera",
  group: "FrontYard",
  // ... look for motion-related fields here
}
```

If you don't see any motion-related fields, the `camconfig` endpoint might not include real-time status.

### Step 2: Manual Testing

You can manually trigger motion for testing from the console:

```javascript
// Manually show a camera (simulating motion detected)
motionWallManager.TriggerMotion("FrontDoor");

// Manually hide a camera (simulating motion ended)
motionWallManager.EndMotion("FrontDoor");

// Get current state
motionWallManager.GetState();
```

Replace `"FrontDoor"` with your actual camera short name.

### Step 3: Check Camera Short Names

Camera short names are case-sensitive. Get the correct names from the console:
```javascript
// After activating Motion Wall, check the camera list
motionWallManager.GetState().cameraStates
```

This will show all camera IDs in the current group.

## Common Issues

### Issue: "camconfig response" never appears
**Cause:** API request is failing
**Solution:**
- Check browser Network tab for failed requests
- Verify you're logged in to Blue Iris
- Check if other UI3 features work (if not, session issue)

### Issue: camconfig returns data but no motion fields
**Cause:** The `camconfig` endpoint might be for configuration only
**Solution:** We may need to use a different API endpoint or approach

**If this happens:**
1. Copy one full "camconfig response" from console
2. Share it in the issue/discussion
3. We can identify the correct field names or switch to a different endpoint

### Issue: Motion is detected but camera doesn't appear
**Possible causes:**
- Camera is not in the selected group
- Stream URL is incorrect
- H.264/MJPEG stream is failing to load

**Check:**
1. Console for errors during stream loading
2. Browser Network tab for failed stream requests
3. Try changing stream type in settings (H.264 ↔ MJPEG)

### Issue: Camera appears but shows black screen
**Possible causes:**
- Stream URL format is wrong
- Camera name encoding issue
- Permission/authentication issue

**Check:**
1. Right-click on tile → Inspect Element
2. Check if video/img element has src attribute
3. Copy src URL and try opening in new tab
4. Check Network tab for stream request status

## Performance Notes

Motion Wall polls the `camconfig` endpoint for each camera every second. For large groups (10+ cameras), this creates:
- 10+ API requests per second
- Additional server load

If you notice performance issues:
1. Use smaller groups
2. Increase the poll interval (requires code edit)
3. Pin only cameras you want to monitor

## Alternative: Manual Mode

If automatic motion detection doesn't work, you can use Motion Wall in "manual mode":

1. Activate Motion Wall
2. Pin the cameras you want to watch
3. Use pinned cameras instead of motion detection

Pinned cameras will stay visible regardless of motion.

## Getting Help

When reporting motion detection issues, include:
1. **Console output** showing:
   - Activation message with camera list
   - At least one "camconfig response" message
   - Any error messages
2. **Blue Iris version**
3. **Browser and version**
4. **Description of what happened vs what you expected**

## Advanced: Modifying Motion Detection

If you need to modify which fields indicate motion, edit `ui3/ui3.js`:

Search for: `// Check for motion indicators in the response`

Around line 40880, you'll find the checks:
```javascript
if (response.data.isMotion === true || response.data.isMotion === 1 || response.data.isMotion === "1")
    hasMotion = true;
else if (response.data.isTriggered === true || ...)
    // etc.
```

Add additional conditions based on what fields your Blue Iris returns.

## Future Improvements

The current polling approach is a limitation. Ideal solutions would be:
1. Blue Iris WebSocket for real-time events
2. Server-Sent Events (SSE) for push notifications
3. A batch endpoint that returns status for all cameras at once
4. Integration with existing UI3 status block mechanism

If you have access to Blue Iris API documentation, please share!
