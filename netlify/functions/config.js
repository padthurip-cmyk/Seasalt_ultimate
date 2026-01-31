/**
 * SeaSalt Pickles - Config API
 * =============================
 * Netlify Function for site configuration.
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'seasalt_pickles';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }
    
    const client = await MongoClient.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    
    cachedClient = client;
    return client;
}

// Default site configuration
const defaultConfig = {
    spinWheelEnabled: true,
    spinWheelOdds: 30, // 1 in 30 chance
    rewards: [99, 299, 599],
    deliveryCharges: {
        standard: 50,
        freeAbove: 500
    },
    minOrderValue: 199,
    maxQuantityPerItem: 10,
    contactPhone: '+91-XXXXXXXXXX',
    contactEmail: 'support@seasaltpickles.com',
    socialLinks: {
        instagram: 'https://instagram.com/seasaltpickles',
        facebook: 'https://facebook.com/seasaltpickles',
        youtube: 'https://youtube.com/@seasaltpickles'
    }
};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        const client = await connectToDatabase();
        const db = client.db(DB_NAME);
        const collection = db.collection('config');
        
        // GET - Retrieve site configuration
        if (event.httpMethod === 'GET') {
            const config = await collection.findOne({ key: 'siteConfig' });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: config?.value || defaultConfig
                })
            };
        }
        
        // PUT - Update site configuration (admin only)
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            
            // Merge with existing config
            const existingConfig = await collection.findOne({ key: 'siteConfig' });
            const updatedConfig = {
                ...(existingConfig?.value || defaultConfig),
                ...body,
                updatedAt: new Date()
            };
            
            await collection.updateOne(
                { key: 'siteConfig' },
                {
                    $set: { value: updatedConfig },
                    $setOnInsert: { key: 'siteConfig', createdAt: new Date() }
                },
                { upsert: true }
            );
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: updatedConfig
                })
            };
        }
        
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Method not allowed'
            })
        };
        
    } catch (error) {
        console.error('Config API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Internal server error'
            })
        };
    }
};
