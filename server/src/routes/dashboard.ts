import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import dns from 'dns';

const dnsPromises = dns.promises;

const router = Router();
// New API endpoint
const DATA_API_URL = 'http://app.cmhwarmup.com:8366/api/all-data';
const API_KEY = 'CA7m6kgrkkaEnIcC8i95DCSFTTE7IOSBNIxRmkipN-s';

// Old API key logic (disabled for new endpoint)
// const KEY_URL = 'https://abdelgh9.pythonanywhere.com/api/debug/show-key';
// let cachedApiKey: string | null = null;
// async function getApiKey() { ... }

// Apply authentication to all dashboard routes
router.use(authenticateToken);

router.get('/all-data', async (req, res) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // Increased timeout to 25s

  try {
    // Get the API key (Using hardcoded key for new API)
    const apiKey = API_KEY;
    
    // Extract query parameters for filtering
    const { entities, date, hours, limit } = req.query;
    
    // Build query string for external API
    const queryParams = new URLSearchParams();
    if (entities) queryParams.append('entities', entities as string);
    if (date) queryParams.append('date', date as string);
    if (hours) queryParams.append('hours', hours as string);
    if (limit) queryParams.append('limit', limit as string);
    
    // Add the API key to the query parameters
    if (apiKey) {
      queryParams.append('api_key', apiKey);
    }
    
    const queryString = queryParams.toString();
    const apiUrl = queryString ? `${DATA_API_URL}?${queryString}` : DATA_API_URL;
    
    // Log the request (hiding the API key in logs for security)
    const logUrl = apiUrl.replace(/api_key=[^&]+/, 'api_key=***');
    console.log('🔄 Proxying filtered request to external API:', logUrl);
    
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error payload');
      console.error(`❌ External API error: ${response.status} ${response.statusText}`, errorText);
      return res.status(response.status).json({ 
        error: 'External API Error', 
        status: response.status,
        message: response.statusText,
        details: errorText.substring(0, 200)
      });
    }
    
    const data = await response.json();
    console.log('✅ Successfully fetched filtered data from external API');
    res.json(data);
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('🔴 Dashboard Proxy Exception:', error);
    
    const isTimeout = error.name === 'AbortError';
    res.status(isTimeout ? 504 : 500).json({ 
      error: isTimeout ? 'Gateway Timeout' : 'Proxy Connection Failed', 
      message: error.message,
      code: error.code || error.name
    });
  }
});

// DNS Lookup endpoint
router.post('/dns-lookup', async (req, res) => {
  try {
    const { domains } = req.body;
    
    if (!domains || !Array.isArray(domains)) {
      return res.status(400).json({ error: 'Invalid request. Expected an array of domains.' });
    }

    console.log(`🔍 DNS Lookup requested for ${domains.length} domains`);
    const results: Record<string, { a: string; aaaa: string }> = {};

    await Promise.all(
      domains.map(async (domain: string) => {
        const result = { a: 'N/A', aaaa: 'N/A' };
        const cleanDomain = domain.trim().toLowerCase();
        if (!cleanDomain) return;

        try {
          const aRecords = await dnsPromises.resolve4(cleanDomain);
          result.a = aRecords[0] || 'N/A';
        } catch (error) {
          try {
            const lookup = await dnsPromises.lookup(cleanDomain, { family: 4 });
            result.a = lookup.address || 'N/A';
          } catch (e) {
            // Ignore
          }
        }

        try {
          const aaaaRecords = await dnsPromises.resolve6(cleanDomain);
          result.aaaa = aaaaRecords[0] || 'N/A';
        } catch (error) {
          try {
            const lookup = await dnsPromises.lookup(cleanDomain, { family: 6 });
            result.aaaa = lookup.address || 'N/A';
          } catch (e) {
            // Ignore
          }
        }
        results[cleanDomain] = result;
      })
    );

    console.log('✅ DNS Lookup completed');
    res.json(results);
  } catch (error: any) {
    console.error('🔴 DNS Lookup Exception:', error);
    res.status(500).json({ 
      error: 'DNS Lookup Failed', 
      message: error.message 
    });
  }
});

export default router;

