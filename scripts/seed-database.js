/**
 * SeaSalt Pickles - Database Seeding Script
 * ==========================================
 * Run this script to populate MongoDB with initial product data.
 * 
 * Usage: node scripts/seed-database.js
 * 
 * Environment Variables Required:
 * - MONGODB_URI: MongoDB connection string
 * - DB_NAME: Database name (default: seasalt_pickles)
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'seasalt_pickles';

async function seedDatabase() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI environment variable is required');
        console.log('\nSet it in your .env file or export it:');
        console.log('export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net"');
        process.exit(1);
    }
    
    console.log('🌱 Starting database seeding...\n');
    
    let client;
    
    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        client = await MongoClient.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        const db = client.db(DB_NAME);
        console.log(`✅ Connected to database: ${DB_NAME}\n`);
        
        // Load seed data
        console.log('📂 Loading seed data...');
        const seedDataPath = path.join(__dirname, '../data/products-seed.json');
        const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
        console.log(`   Found ${seedData.products.length} products`);
        console.log(`   Found ${seedData.categories.length} categories\n`);
        
        // Seed Products
        console.log('📦 Seeding products...');
        const productsCollection = db.collection('products');
        
        // Clear existing products (optional)
        await productsCollection.deleteMany({});
        
        // Insert products
        const productsToInsert = seedData.products.map(product => ({
            ...product,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        
        const productsResult = await productsCollection.insertMany(productsToInsert);
        console.log(`   ✅ Inserted ${productsResult.insertedCount} products\n`);
        
        // Seed Categories
        console.log('📁 Seeding categories...');
        const categoriesCollection = db.collection('categories');
        
        await categoriesCollection.deleteMany({});
        
        const categoriesResult = await categoriesCollection.insertMany(
            seedData.categories.map((cat, index) => ({
                ...cat,
                order: index + 1,
                createdAt: new Date()
            }))
        );
        console.log(`   ✅ Inserted ${categoriesResult.insertedCount} categories\n`);
        
        // Seed Site Config
        console.log('⚙️  Seeding site configuration...');
        const configCollection = db.collection('config');
        
        await configCollection.updateOne(
            { key: 'siteConfig' },
            {
                $set: {
                    key: 'siteConfig',
                    value: seedData.siteConfig,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
        console.log('   ✅ Site configuration saved\n');
        
        // Create indexes
        console.log('🔍 Creating indexes...');
        
        await productsCollection.createIndex({ id: 1 }, { unique: true });
        await productsCollection.createIndex({ primaryCategory: 1 });
        await productsCollection.createIndex({ active: 1 });
        await productsCollection.createIndex({ name: 'text', description: 'text' });
        
        await db.collection('orders').createIndex({ orderId: 1 }, { unique: true });
        await db.collection('orders').createIndex({ 'user.phone': 1 });
        await db.collection('orders').createIndex({ status: 1 });
        await db.collection('orders').createIndex({ createdAt: -1 });
        
        await db.collection('wallets').createIndex({ phone: 1 }, { unique: true });
        await db.collection('spins').createIndex({ phone: 1 }, { unique: true });
        await db.collection('users').createIndex({ phone: 1 }, { unique: true });
        
        console.log('   ✅ Indexes created\n');
        
        console.log('════════════════════════════════════════');
        console.log('🎉 Database seeding completed successfully!');
        console.log('════════════════════════════════════════\n');
        
        // Summary
        console.log('Summary:');
        console.log(`  • Products: ${productsResult.insertedCount}`);
        console.log(`  • Categories: ${categoriesResult.insertedCount}`);
        console.log(`  • Config: Updated`);
        console.log('\nYour database is ready! 🫙\n');
        
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('📡 Database connection closed');
        }
    }
}

// Run the seeder
seedDatabase();
