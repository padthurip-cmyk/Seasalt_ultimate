/**
 * SeaSalt Pickles - Products API
 * ===============================
 * Netlify Function for product operations.
 */

const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string (set in Netlify environment variables)
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
    // Allow CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        const client = await connectToDatabase();
        const db = client.db(DB_NAME);
        const collection = db.collection('products');
        
        const params = event.queryStringParameters || {};
        
        // GET - Retrieve products
        if (event.httpMethod === 'GET') {
            let query = {};
            let options = {};
            
            // Filter by ID
            if (params.id) {
                const product = await collection.findOne({ 
                    $or: [
                        { _id: new ObjectId(params.id) },
                        { id: params.id }
                    ]
                });
                return {
                    statusCode: product ? 200 : 404,
                    headers,
                    body: JSON.stringify({
                        success: !!product,
                        data: product
                    })
                };
            }
            
            // Filter by category
            if (params.category) {
                query.primaryCategory = params.category;
            }
            
            // Search
            if (params.search) {
                const searchRegex = new RegExp(params.search, 'i');
                query.$or = [
                    { name: searchRegex },
                    { description: searchRegex },
                    { primaryCategory: searchRegex },
                    { subCategory: searchRegex }
                ];
            }
            
            // Only active products for public API
            if (!params.includeInactive) {
                query.active = true;
            }
            
            // Pagination
            const page = parseInt(params.page) || 1;
            const limit = parseInt(params.limit) || 50;
            const skip = (page - 1) * limit;
            
            options.skip = skip;
            options.limit = limit;
            
            // Sort
            if (params.sort) {
                const [field, order] = params.sort.split(':');
                options.sort = { [field]: order === 'desc' ? -1 : 1 };
            } else {
                options.sort = { createdAt: -1 };
            }
            
            const products = await collection.find(query, options).toArray();
            const total = await collection.countDocuments(query);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: products,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                })
            };
        }
        
        // POST - Create product (admin only)
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            
            // Validate required fields
            const required = ['name', 'description', 'primaryCategory', 'variants'];
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
            
            // Create product
            const product = {
                ...body,
                id: body.id || `prod_${Date.now()}`,
                active: body.active !== false,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const result = await collection.insertOne(product);
            
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: { ...product, _id: result.insertedId }
                })
            };
        }
        
        // PUT - Update product
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            
            if (!body.id && !body._id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Product ID is required'
                    })
                };
            }
            
            const filter = body._id 
                ? { _id: new ObjectId(body._id) }
                : { id: body.id };
            
            const updateData = { ...body };
            delete updateData._id;
            delete updateData.id;
            updateData.updatedAt = new Date();
            
            const result = await collection.updateOne(filter, { $set: updateData });
            
            return {
                statusCode: result.matchedCount ? 200 : 404,
                headers,
                body: JSON.stringify({
                    success: !!result.matchedCount,
                    message: result.matchedCount ? 'Product updated' : 'Product not found'
                })
            };
        }
        
        // DELETE - Remove product
        if (event.httpMethod === 'DELETE') {
            if (!params.id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Product ID is required'
                    })
                };
            }
            
            const result = await collection.deleteOne({
                $or: [
                    { _id: new ObjectId(params.id) },
                    { id: params.id }
                ]
            });
            
            return {
                statusCode: result.deletedCount ? 200 : 404,
                headers,
                body: JSON.stringify({
                    success: !!result.deletedCount,
                    message: result.deletedCount ? 'Product deleted' : 'Product not found'
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
        console.error('Products API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};
