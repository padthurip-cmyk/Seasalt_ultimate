/**
 * SeaSalt Pickles - Categories API
 * ==================================
 * Netlify Function for category management.
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

// Default categories if none exist in DB
const defaultCategories = [
    {
        id: 'cat_veg_pickles',
        name: 'Vegetarian Pickles',
        icon: '🥒',
        subCategories: ['Mango', 'Tomato', 'Citrus', 'Herbal', 'Gongura', 'Chilli', 'Tamarind', 'Mixed'],
        order: 1
    },
    {
        id: 'cat_nonveg_pickles',
        name: 'Non Veg Pickles',
        icon: '🍗',
        subCategories: ['Chicken', 'Mutton', 'Seafood'],
        order: 2
    },
    {
        id: 'cat_masalas',
        name: 'Masalas & Karam Podis',
        icon: '🌶️',
        subCategories: ['Masalas', 'Karam Podis'],
        order: 3
    },
    {
        id: 'cat_sweets',
        name: 'Sweets & Snacks',
        icon: '🍬',
        subCategories: ['Laddus', 'Snacks'],
        order: 4
    },
    {
        id: 'cat_combos',
        name: 'Combos',
        icon: '🎁',
        subCategories: ['Value Packs'],
        order: 5
    }
];

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        const client = await connectToDatabase();
        const db = client.db(DB_NAME);
        const collection = db.collection('categories');
        
        // GET - Retrieve categories
        if (event.httpMethod === 'GET') {
            let categories = await collection.find({}).sort({ order: 1 }).toArray();
            
            // Return defaults if no categories exist
            if (categories.length === 0) {
                categories = defaultCategories;
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: categories
                })
            };
        }
        
        // POST - Create category
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            
            if (!body.name) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Category name is required'
                    })
                };
            }
            
            const category = {
                id: body.id || `cat_${Date.now()}`,
                name: body.name,
                icon: body.icon || '📦',
                subCategories: body.subCategories || [],
                order: body.order || 99,
                createdAt: new Date()
            };
            
            const result = await collection.insertOne(category);
            
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: { ...category, _id: result.insertedId }
                })
            };
        }
        
        // PUT - Update category
        if (event.httpMethod === 'PUT') {
            const body = JSON.parse(event.body);
            
            if (!body.id && !body._id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Category ID is required'
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
                    message: result.matchedCount ? 'Category updated' : 'Category not found'
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
        console.error('Categories API Error:', error);
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
