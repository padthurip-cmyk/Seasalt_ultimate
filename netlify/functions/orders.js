/**
 * SeaSalt Pickles - Orders API
 * =============================
 * Netlify Function for order management.
 */

const { MongoClient, ObjectId } = require('mongodb');

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

// Generate unique order ID
function generateOrderId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SSP${timestamp}${random}`;
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        const client = await connectToDatabase();
        const db = client.db(DB_NAME);
        const ordersCollection = db.collection('orders');
        const usersCollection = db.collection('users');
        const walletsCollection = db.collection('wallets');
        
        const params = event.queryStringParameters || {};
        
        // GET - Retrieve orders
        if (event.httpMethod === 'GET') {
            // Get single order by ID
            if (params.id) {
                const order = await ordersCollection.findOne({
                    $or: [
                        { _id: new ObjectId(params.id) },
                        { orderId: params.id }
                    ]
                });
                
                return {
                    statusCode: order ? 200 : 404,
                    headers,
                    body: JSON.stringify({
                        success: !!order,
                        data: order
                    })
                };
            }
            
            // Get orders by phone
            if (params.phone) {
                const phone = params.phone.startsWith('+91') ? params.phone : `+91${params.phone}`;
                const orders = await ordersCollection
                    .find({ 'user.phone': phone })
                    .sort({ createdAt: -1 })
                    .toArray();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        data: orders
                    })
                };
            }
            
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Phone number or order ID required'
                })
            };
        }
        
        // POST - Create new order
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            
            // Validate required fields
            const required = ['user', 'address', 'items', 'total'];
            for (const field of required) {
                if (!body[field]) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: `Missing required field: ${field}`
                        })
                    };
                }
            }
            
            // Validate items
            if (!Array.isArray(body.items) || body.items.length === 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Order must contain at least one item'
                    })
                };
            }
            
            // Process wallet discount if applicable
            if (body.walletDiscount > 0 && body.useWallet) {
                const phone = body.user.phone;
                const wallet = await walletsCollection.findOne({ phone });
                
                if (!wallet || wallet.balance < body.walletDiscount) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: 'Insufficient wallet balance'
                        })
                    };
                }
                
                // Deduct from wallet
                await walletsCollection.updateOne(
                    { phone },
                    {
                        $inc: { balance: -body.walletDiscount },
                        $push: {
                            transactions: {
                                type: 'debit',
                                amount: body.walletDiscount,
                                description: `Order payment`,
                                timestamp: new Date()
                            }
                        }
                    }
                );
            }
            
            // Create order
            const order = {
                orderId: generateOrderId(),
                user: body.user,
                address: body.address,
                items: body.items,
                subtotal: body.subtotal,
                deliveryCharge: body.deliveryCharge || 0,
                walletDiscount: body.walletDiscount || 0,
                total: body.total,
                paymentMethod: body.paymentMethod || 'online',
                paymentId: body.paymentId,
                status: 'pending',
                statusHistory: [
                    {
                        status: 'pending',
                        timestamp: new Date(),
                        note: 'Order placed'
                    }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const result = await ordersCollection.insertOne(order);
            
            // Update user's order count
            await usersCollection.updateOne(
                { phone: body.user.phone },
                {
                    $inc: { orderCount: 1 },
                    $set: { lastOrderAt: new Date() }
                },
                { upsert: true }
            );
            
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: { ...order, _id: result.insertedId }
                })
            };
        }
        
        // PUT - Update order status
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            
            if (!body.id && !body.orderId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Order ID is required'
                    })
                };
            }
            
            const filter = body._id 
                ? { _id: new ObjectId(body._id) }
                : { orderId: body.orderId || body.id };
            
            const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
            
            if (body.status && !validStatuses.includes(body.status)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                    })
                };
            }
            
            const updateData = {
                status: body.status,
                updatedAt: new Date()
            };
            
            // Add to status history
            const statusHistoryEntry = {
                status: body.status,
                timestamp: new Date(),
                note: body.note || `Status changed to ${body.status}`
            };
            
            const result = await ordersCollection.updateOne(
                filter,
                {
                    $set: updateData,
                    $push: { statusHistory: statusHistoryEntry }
                }
            );
            
            return {
                statusCode: result.matchedCount ? 200 : 404,
                headers,
                body: JSON.stringify({
                    success: !!result.matchedCount,
                    message: result.matchedCount ? 'Order updated' : 'Order not found'
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
        console.error('Orders API Error:', error);
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
