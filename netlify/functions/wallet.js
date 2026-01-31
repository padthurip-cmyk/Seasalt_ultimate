/**
 * SeaSalt Pickles - Wallet API
 * =============================
 * Netlify Function for wallet operations.
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
        const collection = db.collection('wallets');
        
        const params = event.queryStringParameters || {};
        
        // GET - Get wallet balance
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
            const wallet = await collection.findOne({ phone });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: {
                        phone,
                        balance: wallet?.balance || 0,
                        transactions: wallet?.transactions || []
                    }
                })
            };
        }
        
        // POST - Credit or debit wallet
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            
            if (!body.phone || !body.amount || !body.type) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Phone, amount, and type are required'
                    })
                };
            }
            
            const phone = body.phone.startsWith('+91') ? body.phone : `+91${body.phone}`;
            const amount = parseFloat(body.amount);
            const type = body.type; // 'credit' or 'debit'
            
            if (isNaN(amount) || amount <= 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Invalid amount'
                    })
                };
            }
            
            if (!['credit', 'debit'].includes(type)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Type must be credit or debit'
                    })
                };
            }
            
            // For debit, check balance
            if (type === 'debit') {
                const wallet = await collection.findOne({ phone });
                if (!wallet || wallet.balance < amount) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: 'Insufficient balance'
                        })
                    };
                }
            }
            
            const transaction = {
                id: `txn_${Date.now()}`,
                type,
                amount,
                description: body.description || (type === 'credit' ? 'Wallet credit' : 'Wallet debit'),
                timestamp: new Date()
            };
            
            const balanceChange = type === 'credit' ? amount : -amount;
            
            const result = await collection.findOneAndUpdate(
                { phone },
                {
                    $inc: { balance: balanceChange },
                    $push: { transactions: transaction },
                    $setOnInsert: { phone, createdAt: new Date() },
                    $set: { updatedAt: new Date() }
                },
                { upsert: true, returnDocument: 'after' }
            );
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: {
                        phone,
                        balance: result.value.balance,
                        transaction
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
        console.error('Wallet API Error:', error);
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
