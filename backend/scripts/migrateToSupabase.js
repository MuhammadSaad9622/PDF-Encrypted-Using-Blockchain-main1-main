/**
 * Migration Script: MongoDB to Supabase
 * 
 * This script migrates all data from MongoDB to Supabase:
 * - Users (with ObjectId to UUID mapping)
 * - Access Codes (with userId references updated)
 * - NFTs (with userId references updated)
 * - Invoices (with userId references updated)
 * 
 * Usage:
 * 1. Make sure MongoDB is accessible and MONGODB_URI is set
 * 2. Make sure Supabase is configured (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
 * 3. Run: node backend/scripts/migrateToSupabase.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
// Try multiple paths to find .env file
dotenv.config();
if (!process.env.MONGODB_URI && !process.env.SUPABASE_URL) {
  // Try backend/.env if root .env doesn't exist
  dotenv.config({ path: './backend/.env' });
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in environment variables');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Import MongoDB models
import User from '../models/User.js';
import AccessCode from '../models/AccessCode.js';
import NFT from '../models/NFT.js';
import Invoice from '../models/Invoice.js';

// Map to store MongoDB ObjectId -> Supabase UUID
const userIdMap = new Map();

/**
 * Convert MongoDB document to Supabase user format
 */
const mapUserToSupabase = (user) => {
  return {
    email: user.email?.toLowerCase().trim() || '',
    password: user.password, // Keep existing hashed password
    wallet_address: user.walletAddress || null,
    name: user.name || '',
    profile_photo: user.profilePhoto || null,
    bio: user.bio || '',
    phone: user.phone || '',
    location: user.location || '',
    address: user.address || '',
    city: user.city || '',
    country: user.country || '',
    zip_code: user.zipCode || '',
    website: user.website || '',
    company: user.company || '',
    job_title: user.jobTitle || '',
    role: user.role || 'user',
    subscription_status: user.subscriptionStatus || 'inactive',
    subscription_start_date: user.subscriptionStartDate || null,
    subscription_end_date: user.subscriptionEndDate || null,
    total_file_size_used: user.totalFileSizeUsed || 0,
    file_size_limit: user.fileSizeLimit || 250 * 1024 * 1024,
    last_subscription_invoice_id: user.lastSubscriptionInvoiceId || null,
    access_code: user.accessCode || null,
    referral_code: user.referralCode || null,
    agreed_to_terms: user.agreedToTerms || false,
    agreed_to_privacy: user.agreedToPrivacy || false,
    agreed_to_early_adopter: user.agreedToEarlyAdopter || false,
    agreement_dates: user.agreementDates || {},
    profile_complete: user.profileComplete || false,
    state: user.state || '',
    province: user.province || '',
    admin_notes: user.adminNotes || '',
    admin_notes_updated_at: user.adminNotesUpdatedAt || null,
    admin_notes_last_read_at: user.adminNotesLastReadAt || null,
    is_suspended: user.isSuspended || false,
    suspended_at: user.suspendedAt || null,
    suspended_reason: user.suspendedReason || '',
    subscription_plan: user.subscriptionPlan || null,
    created_at: user.createdAt || new Date(),
    updated_at: user.updatedAt || new Date()
  };
};

/**
 * Migrate Users
 */
const migrateUsers = async () => {
  console.log('\n📦 Migrating Users...');
  
  try {
    const users = await User.find({}).sort({ createdAt: 1 });
    console.log(`   Found ${users.length} users in MongoDB`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        const mongoId = user._id.toString();
        
        // Check if user already exists in Supabase by email
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email.toLowerCase().trim())
          .single();

        if (existingUser) {
          // User already exists, map the ID
          userIdMap.set(mongoId, existingUser.id);
          console.log(`   ⏭️  Skipped existing user: ${user.email} (UUID: ${existingUser.id})`);
          skippedCount++;
          continue;
        }

        // Create user in Supabase
        const supabaseUser = mapUserToSupabase(user);
        const { data: newUser, error } = await supabase
          .from('users')
          .insert([supabaseUser])
          .select('id')
          .single();

        if (error) {
          if (error.code === '23505') {
            // Duplicate email, try to find existing
            const { data: existing } = await supabase
              .from('users')
              .select('id')
              .eq('email', user.email.toLowerCase().trim())
              .single();
            
            if (existing) {
              userIdMap.set(mongoId, existing.id);
              console.log(`   ⏭️  User already exists: ${user.email} (UUID: ${existing.id})`);
              skippedCount++;
              continue;
            }
          }
          throw error;
        }

        // Map MongoDB ObjectId to Supabase UUID
        userIdMap.set(mongoId, newUser.id);
        successCount++;
        console.log(`   ✅ Migrated user: ${user.email} (${mongoId} -> ${newUser.id})`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error migrating user ${user.email}:`, error.message);
      }
    }

    // Handle referredBy relationships
    console.log('\n   🔗 Updating referral relationships...');
    for (const user of users) {
      if (user.referredBy) {
        const mongoId = user._id.toString();
        const referredByMongoId = user.referredBy.toString();
        const supabaseUserId = userIdMap.get(mongoId);
        const referredBySupabaseId = userIdMap.get(referredByMongoId);

        if (supabaseUserId && referredBySupabaseId) {
          await supabase
            .from('users')
            .update({ referred_by: referredBySupabaseId })
            .eq('id', supabaseUserId);
        }
      }
    }

    console.log(`\n   ✅ Users migration complete: ${successCount} migrated, ${skippedCount} skipped, ${errorCount} errors`);
    return { successCount, skippedCount, errorCount };
  } catch (error) {
    console.error('❌ Error migrating users:', error);
    throw error;
  }
};

/**
 * Migrate Access Codes
 */
const migrateAccessCodes = async () => {
  console.log('\n📦 Migrating Access Codes...');
  
  try {
    const accessCodes = await AccessCode.find({}).sort({ createdAt: 1 });
    console.log(`   Found ${accessCodes.length} access codes in MongoDB`);

    let successCount = 0;
    let errorCount = 0;

    for (const code of accessCodes) {
      try {
        const supabaseCode = {
          code: code.code.toUpperCase().trim(),
          is_active: code.isActive !== undefined ? code.isActive : true,
          max_uses: code.maxUses || null,
          used_count: code.usedCount || 0,
          expires_at: code.expiresAt || null,
          created_by: code.createdBy ? userIdMap.get(code.createdBy.toString()) : null,
          description: code.description || '',
          subscription_plan: code.subscriptionPlan || null,
          subscription_duration: code.subscriptionDuration || null,
          created_at: code.createdAt || new Date(),
          updated_at: code.updatedAt || new Date()
        };

        const { error } = await supabase
          .from('access_codes')
          .insert([supabaseCode]);

        if (error) {
          if (error.code === '23505') {
            console.log(`   ⏭️  Access code already exists: ${code.code}`);
            continue;
          }
          throw error;
        }

        successCount++;
        console.log(`   ✅ Migrated access code: ${code.code}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error migrating access code ${code.code}:`, error.message);
      }
    }

    console.log(`\n   ✅ Access Codes migration complete: ${successCount} migrated, ${errorCount} errors`);
    return { successCount, errorCount };
  } catch (error) {
    console.error('❌ Error migrating access codes:', error);
    throw error;
  }
};

/**
 * Migrate NFTs
 */
const migrateNFTs = async () => {
  console.log('\n📦 Migrating NFTs...');
  
  try {
    const nfts = await NFT.find({}).sort({ createdAt: 1 });
    console.log(`   Found ${nfts.length} NFTs in MongoDB`);

    let successCount = 0;
    let errorCount = 0;

    for (const nft of nfts) {
      try {
        const supabaseNFT = {
          token_id: nft.tokenId,
          encryption_key: nft.encryptionKey,
          supabase_path: nft.supabasePath || null,
          supabase_url: nft.supabaseUrl || null,
          arweave_id: nft.arweaveId || null,
          arweave_url: nft.arweaveUrl || null,
          recipient_address: nft.recipientAddress,
          user_id: nft.userId ? userIdMap.get(nft.userId.toString()) : null,
          original_name: nft.originalName || null,
          file_size: nft.fileSize || 0,
          created_at: nft.createdAt || new Date(),
          updated_at: nft.updatedAt || new Date()
        };

        const { error } = await supabase
          .from('nfts')
          .insert([supabaseNFT]);

        if (error) {
          if (error.code === '23505') {
            console.log(`   ⏭️  NFT already exists: ${nft.tokenId}`);
            continue;
          }
          throw error;
        }

        successCount++;
        console.log(`   ✅ Migrated NFT: ${nft.tokenId}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error migrating NFT ${nft.tokenId}:`, error.message);
      }
    }

    console.log(`\n   ✅ NFTs migration complete: ${successCount} migrated, ${errorCount} errors`);
    return { successCount, errorCount };
  } catch (error) {
    console.error('❌ Error migrating NFTs:', error);
    throw error;
  }
};

/**
 * Migrate Invoices
 */
const migrateInvoices = async () => {
  console.log('\n📦 Migrating Invoices...');
  
  try {
    const invoices = await Invoice.find({}).sort({ createdAt: 1 });
    console.log(`   Found ${invoices.length} invoices in MongoDB`);

    let successCount = 0;
    let errorCount = 0;

    for (const invoice of invoices) {
      try {
        const supabaseInvoice = {
          invoice_id: invoice.invoiceId,
          invoice_number: invoice.invoiceNumber || null,
          user_id: userIdMap.get(invoice.userId.toString()),
          subscription_plan: invoice.subscriptionPlan || 'basic',
          amount: invoice.amount,
          currency: invoice.currency || 'USD',
          status: invoice.status || 'Pending',
          transaction_hash: invoice.transactionHash || null,
          payment_method: invoice.paymentMethod || 'blockchain',
          square_payment_id: invoice.squarePaymentId || null,
          square_order_id: invoice.squareOrderId || null,
          subscription_start_date: invoice.subscriptionStartDate || null,
          subscription_end_date: invoice.subscriptionEndDate || null,
          description: invoice.description || 'Platform Subscription',
          created_at: invoice.createdAt || new Date(),
          updated_at: invoice.updatedAt || new Date()
        };

        // Skip if user_id is not found
        if (!supabaseInvoice.user_id) {
          console.log(`   ⚠️  Skipping invoice ${invoice.invoiceId}: user not found in Supabase`);
          errorCount++;
          continue;
        }

        const { error } = await supabase
          .from('invoices')
          .insert([supabaseInvoice]);

        if (error) {
          if (error.code === '23505') {
            console.log(`   ⏭️  Invoice already exists: ${invoice.invoiceId}`);
            continue;
          }
          throw error;
        }

        successCount++;
        console.log(`   ✅ Migrated invoice: ${invoice.invoiceId}`);
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error migrating invoice ${invoice.invoiceId}:`, error.message);
      }
    }

    console.log(`\n   ✅ Invoices migration complete: ${successCount} migrated, ${errorCount} errors`);
    return { successCount, errorCount };
  } catch (error) {
    console.error('❌ Error migrating invoices:', error);
    throw error;
  }
};

/**
 * Main migration function
 */
const migrate = async () => {
  console.log('🚀 Starting MongoDB to Supabase Migration...\n');
  console.log('⚠️  Make sure you have:');
  console.log('   1. MongoDB connection (MONGODB_URI)');
  console.log('   2. Supabase connection (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  console.log('   3. All tables created in Supabase\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    });
    console.log('✅ Connected to MongoDB\n');

    // Test Supabase connection
    console.log('📡 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError && !testError.message.includes('relation') && !testError.message.includes('does not exist')) {
      throw new Error(`Supabase connection failed: ${testError.message}`);
    }
    console.log('✅ Supabase connection verified\n');

    // Run migrations in order (Users first, then others that reference users)
    const userStats = await migrateUsers();
    const accessCodeStats = await migrateAccessCodes();
    const nftStats = await migrateNFTs();
    const invoiceStats = await migrateInvoices();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Users:        ${userStats.successCount} migrated, ${userStats.skippedCount} skipped, ${userStats.errorCount} errors`);
    console.log(`Access Codes: ${accessCodeStats.successCount} migrated, ${accessCodeStats.errorCount} errors`);
    console.log(`NFTs:         ${nftStats.successCount} migrated, ${nftStats.errorCount} errors`);
    console.log(`Invoices:     ${invoiceStats.successCount} migrated, ${invoiceStats.errorCount} errors`);
    console.log('='.repeat(60));
    console.log('\n✅ Migration complete!');

    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run migration
migrate();

