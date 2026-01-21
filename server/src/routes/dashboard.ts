import { Router } from 'express';

const router = Router();
const DATA_API_URL = 'https://abdelgh9.pythonanywhere.com/api/all-data';

router.get('/all-data', async (req, res) => {
  try {
    console.log('🔄 Proxying request to external API:', DATA_API_URL);
    const response = await fetch(DATA_API_URL);
    
    if (!response.ok) {
      console.error(`❌ External API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: 'External API Error', 
        status: response.status,
        message: response.statusText 
      });
    }
    
    const data = await response.json();
    console.log('✅ Successfully fetched data from external API');
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
