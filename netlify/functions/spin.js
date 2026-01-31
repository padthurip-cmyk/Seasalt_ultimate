/**
 * SeaSalt Pickles - Spin Wheel API
 * ==================================
 * Netlify Function for spin wheel operations.
 * Handles eligibility checks and recording spin results.
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

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        const client = await connectToDatabase();
        const db = client.db(DB_NAME);
        const spinsCollection = db.collection('spins');
        const walletsCollection = db.collection('wallets');
        const configCollection = db.collection('config');
        
        const params = event.queryStringParameters || {};
        
        // GET - Check spin eligibility
        if (event.httpMethod === 'GET') {
            if (!params.phone) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Phone number is required'
                    })
                };
            }
            
            const phone = params.phone.startsWith('+91') ? params.phone : `+91${params.phone}`;
            
            // Check if spin wheel is enabled
            const config = await configCollection.findOne({ key: 'siteConfig' });
            const spinEnabled = config?.value?.spinWheelEnabled !== false;
            
            if (!spinEnabled) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        data: {
                            eligible: false,
                            reason: 'Spin wheel is currently disabled'
                        }
                    })
                };
            }
            
            // Check if user has already spun
            const existingSpin = await spinsCollection.findOne({ phone });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: {
                        eligible: !existingSpin,
                        hasSpun: !!existingSpin,
                        spinResult: existingSpin ? {
                            result: existingSpin.result,
                            amount: existingSpin.amount,
                            spunAt: existingSpin.createdAt
                        } : null
                    }
                })
            };
        }
        
        // POST - Record spin result
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            
            if (!body.phone || !body.result) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Phone and result are required'
                    })
                };
            }
            
            const phone = body.phone.startsWith('+91') ? body.phone : `+91${body.phone}`;
            const result = body.result; // 'win' or 'lose'
            const amount = body.amount || 0;
            
            // Check if already spun
            const existingSpin = await spinsCollection.findOne({ phone });
            if (existingSpin) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'User has already spun the wheel'
                    })
                };
            }
            
            // Record spin
            const spinRecord = {
                phone,
                result,
                amount,
                createdAt: new Date()
            };
            
            await spinsCollection.insertOne(spinRecord);
            
            // If won, credit wallet
            if (result === 'win' && amount > 0) {
                const transaction = {
                    id: `txn_spin_${Date.now()}`,
                    type: 'credit',
                    amount,
                    description: 'Spin Wheel Reward 🎉',
                    timestamp: new Date()
                };
                
                await walletsCollection.findOneAndUpdate(
                    { phone },
                    {
                        $inc: { balance: amount },
                        $push: { transactions: transaction },
                        $setOnInsert: { phone, createdAt: new Date() },
                        $set: { updatedAt: new Date() }
                    },
                    { upsert: true }
                );
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: {
                        recorded: true,
                        result,
                        amount
                    }
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
        console.error('Spin API Error:', error);
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
