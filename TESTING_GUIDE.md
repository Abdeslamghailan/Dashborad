# Quick Testing Guide

## 🧪 Testing the Filtered API

### Step 1: Test External API Directly

Open terminal and test the API endpoints:

```bash
# 1. Test health endpoint
curl https://abdelgh9.pythonanywhere.com/api/health

# 2. Test unfiltered (should return all data)
curl https://abdelgh9.pythonanywhere.com/api/all-data

# 3. Test with entity filter
curl "https://abdelgh9.pythonanywhere.com/api/all-data?entities=CMH5"

# 4. Test with date filter
curl "https://abdelgh9.pythonanywhere.com/api/all-data?date=2026-01-23"

# 5. Test with hours filter
curl "https://abdelgh9.pythonanywhere.com/api/all-data?hours=10,11,12"

# 6. Test with combined filters
curl "https://abdelgh9.pythonanywhere.com/api/all-data?entities=CMH5&date=2026-01-23&hours=10"

# 7. Test with limit (for quick testing)
curl "https://abdelgh9.pythonanywhere.com/api/all-data?limit=10"
```

**Expected Response:**
```json
{
  "status": "success",
  "data": { ... },
  "filters_applied": {
    "entities": ["CMH5"],
    "date": "2026-01-23",
    "hours": ["10"],
    "limit": null
  },
  "record_counts": {
    "spam_actions": 45,
    "inbox_actions": 23,
    "total": 88
  }
}
```

---

### Step 2: Test Frontend Integration

1. **Start the development server:**
   ```bash
   cd c:\Users\admin_1\Desktop\dashboard
   npm run dev
   ```

2. **Open browser DevTools:**
   - Press `F12`
   - Go to **Network** tab
   - Go to **Console** tab

3. **Test filter changes:**
   - Change **Entity** filter → Check Network tab for API call
   - Change **Date** filter → Check Network tab for API call
   - Change **Hours** filter → Check Network tab for API call

4. **Verify in Network tab:**
   - Look for request to `/api/dashboard/all-data`
   - Check **Query String Parameters**:
     ```
     entities: CMH5
     date: 2026-01-23
     hours: 10,11,12
     ```

5. **Verify in Console tab:**
   - Look for logs:
     ```
     🔍 Fetching filtered data: { entities: ['CMH5'], date: '2026-01-23', hours: ['10','11','12'] }
     ✅ Filters applied: { entities: 'CMH5', date: '2026-01-23', hours: '10,11,12' }
     📦 Records returned: { spam_actions: 45, inbox_actions: 23, total: 88 }
     ```

---

### Step 3: Performance Testing

**Test 1: Measure Unfiltered Request**
1. Clear all filters (click Reset button)
2. Open DevTools → Network tab
3. Refresh page
4. Find `/api/dashboard/all-data` request
5. Note: **Size** and **Time**

**Test 2: Measure Filtered Request**
1. Select specific entity, date, and hours
2. Wait for "Updating..." indicator
3. Check Network tab
4. Find `/api/dashboard/all-data?entities=...` request
5. Note: **Size** and **Time**

**Compare:**
- Unfiltered: ~88 MB, ~5-10 seconds
- Filtered: ~440 KB, ~0.5-1 second
- **Improvement: 99.5% less data, 10x faster!**

---

### Step 4: Debouncing Test

**Verify debouncing works:**

1. Open Console tab
2. Rapidly change filters multiple times (click different entities quickly)
3. Observe: Only ONE API call is made after you stop clicking
4. Look for log: `🔄 Filters changed, refetching data...`
5. Verify: 500ms delay before API call

**Without debouncing:** 10 clicks = 10 API calls ❌
**With debouncing:** 10 clicks = 1 API call ✅

---

## ✅ Checklist

### Backend API
- [ ] `/api/health` returns status
- [ ] `/api/all-data` works without filters
- [ ] `/api/all-data?entities=X` filters by entity
- [ ] `/api/all-data?date=X` filters by date
- [ ] `/api/all-data?hours=X` filters by hours
- [ ] Combined filters work
- [ ] Response includes `filters_applied`
- [ ] Response includes `record_counts`
- [ ] CORS is enabled (no CORS errors in browser)

### Frontend
- [ ] Page loads successfully
- [ ] Filters are visible and clickable
- [ ] Changing entity filter triggers refetch
- [ ] Changing date filter triggers refetch
- [ ] Changing hours filter triggers refetch
- [ ] "Updating..." indicator appears during refetch
- [ ] Debouncing works (rapid changes = single request)
- [ ] Data updates after filter change
- [ ] No errors in console
- [ ] Network tab shows filtered requests

### Performance
- [ ] Filtered requests are smaller than unfiltered
- [ ] Filtered requests are faster than unfiltered
- [ ] Page remains responsive during refetch
- [ ] No excessive API calls (debouncing works)

---

## 🐛 Common Issues

### Issue: CORS Error
**Symptom:** Browser console shows CORS error
**Solution:** 
1. Ensure `flask-cors` is installed: `pip install flask-cors --user`
2. Ensure `CORS(app)` is in `app.py`
3. Reload PythonAnywhere web app

### Issue: Filters Not Working
**Symptom:** API returns all data even with filters
**Solution:**
1. Check API URL in Network tab (should have query params)
2. Check backend logs for filter information
3. Verify `app_updated.py` is deployed

### Issue: No "Updating..." Indicator
**Symptom:** No visual feedback when filters change
**Solution:**
1. Check `isRefetching` state is being set
2. Verify `motion.div` is rendering
3. Check browser console for errors

### Issue: Too Many API Calls
**Symptom:** Multiple API calls when changing filters
**Solution:**
1. Verify debouncing is working (500ms timeout)
2. Check useEffect dependencies
3. Ensure cleanup function is called

---

## 📊 Expected Results

### Unfiltered Request
```
Request: GET /api/dashboard/all-data
Response Size: ~88 MB
Response Time: ~5-10 seconds
Records: ~100,000
```

### Filtered Request (1 entity, 1 date, 3 hours)
```
Request: GET /api/dashboard/all-data?entities=CMH5&date=2026-01-23&hours=10,11,12
Response Size: ~440 KB
Response Time: ~0.5-1 second
Records: ~500
Reduction: 99.5% less data
```

---

## 🎯 Success Criteria

✅ API responds to filtered requests
✅ Frontend sends correct filter parameters
✅ Data updates when filters change
✅ "Updating..." indicator shows during refetch
✅ Debouncing prevents excessive API calls
✅ Performance improvement is measurable
✅ No errors in console or network tab
✅ Backward compatibility maintained (works without filters)

---

## 📞 Need Help?

1. **Check browser console** for error messages
2. **Check Network tab** for failed requests
3. **Check backend logs** on PythonAnywhere
4. **Verify filter parameters** are being sent
5. **Test API directly** with curl/Postman
6. **Compare with documentation** in other files

---

**Happy Testing! 🚀**
