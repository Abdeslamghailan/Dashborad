import { Router } from 'express';

const router = Router();
const DATA_API_URL = 'https://abdelgh9.pythonanywhere.com/api/all-data';

router.get('/all-data', async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { entities, date, hours, limit } = req.query;
    
    // Build query string for external API
    const queryParams = new URLSearchParams();
    if (entities) queryParams.append('entities', entities as string);
    if (date) queryParams.append('date', date as string);
    if (hours) queryParams.append('hours', hours as string);
    if (limit) queryParams.append('limit', limit as string);
    
    const queryString = queryParams.toString();
    const apiUrl = queryString ? `${DATA_API_URL}?${queryString}` : DATA_API_URL;
    
    console.log('🔄 Proxying filtered request to external API:', apiUrl);
    console.log('📊 Filters:', { entities, date, hours, limit });
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`❌ External API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: 'External API Error', 
        status: response.status,
        message: response.statusText 
      });
    }
    
    const data = await response.json();
    console.log('✅ Successfully fetched filtered data from external API');
    console.log('📦 Records returned:', data.record_counts || 'unknown');
    res.json(data);
  } catch (error: any) {
    console.error('🔴 Dashboard Proxy Exception:', error);
    res.status(500).json({ 
      error: 'Proxy Connection Failed', 
      message: error.message 
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

    const dns = await import('dns/promises');
    const results: Record<string, string> = {};

    await Promise.all(
      domains.map(async (domain: string) => {
        try {
          const addresses = await dns.resolve4(domain);
          results[domain] = addresses[0] || 'N/A';
        } catch (error) {
          results[domain] = 'N/A';
        }
      })
    );

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
