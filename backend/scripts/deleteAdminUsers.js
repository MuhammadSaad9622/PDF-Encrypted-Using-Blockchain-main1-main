/**
 * Script to delete specific admin users
 * 
 * Usage: node backend/scripts/deleteAdminUsers.js
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// List of admin emails to delete
const adminEmailsToDelete = [
  'nomimirza0009@gmail.com',
  'kenui740@yahoo.com',
  'naanana12@outlook.com',
  'johndoe@example.com',
  'asgharalijpj7860@gmail.com',
  'unnonn27011@gmail.com'
];

const deleteAdminUser = async (email) => {
  try {
    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (findError || !user) {
      console.log(`   ⚠️  User not found: ${email}`);
      return { success: false, message: 'User not found' };
    }

    if (user.role !== 'admin') {
      console.log(`   ⚠️  User is not an admin: ${email}`);
      return { success: false, message: 'User is not an admin' };
    }

    const userId = user.id;

    // Delete related records
    console.log(`   📦 Deleting related records for ${email}...`);

    // 1. Delete invoices
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('user_id', userId);
      
      if (invoices && invoices.length > 0) {
        await supabase.from('invoices').delete().eq('user_id', userId);
        console.log(`      ✅ Deleted ${invoices.length} invoices`);
      }
    } catch (err) {
      console.log(`      ⚠️  Error deleting invoices: ${err.message}`);
    }

    // 2. Delete NFTs
    try {
      const { data: nfts } = await supabase
        .from('nfts')
        .select('id')
        .eq('user_id', userId);
      
      if (nfts && nfts.length > 0) {
        await supabase.from('nfts').delete().eq('user_id', userId);
        console.log(`      ✅ Deleted ${nfts.length} NFTs`);
      }
    } catch (err) {
      console.log(`      ⚠️  Error deleting NFTs: ${err.message}`);
    }

    // 3. Delete access codes created by this user
    try {
      const { data: accessCodes } = await supabase
        .from('access_codes')
        .select('id')
        .eq('created_by', userId);
      
      if (accessCodes && accessCodes.length > 0) {
        await supabase.from('access_codes').delete().eq('created_by', userId);
        console.log(`      ✅ Deleted ${accessCodes.length} access codes`);
      }
    } catch (err) {
      console.log(`      ⚠️  Error deleting access codes: ${err.message}`);
    }

    // 4. Update users that were referred by this user
    try {
      const { data: referredUsers } = await supabase
        .from('users')
        .select('id')
        .eq('referred_by', userId);
      
      if (referredUsers && referredUsers.length > 0) {
        await supabase
          .from('users')
          .update({ referred_by: null })
          .eq('referred_by', userId);
        console.log(`      ✅ Updated ${referredUsers.length} referral relationships`);
      }
    } catch (err) {
      console.log(`      ⚠️  Error updating referrals: ${err.message}`);
    }

    // 5. Delete the user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`   ✅ Successfully deleted admin: ${email}`);
    return { success: true, message: 'User deleted' };
  } catch (error) {
    console.error(`   ❌ Error deleting ${email}:`, error.message);
    return { success: false, message: error.message };
  }
};

const main = async () => {
  console.log('🚀 Starting admin user deletion...\n');
  console.log(`📋 Found ${adminEmailsToDelete.length} admin users to delete\n`);

  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  for (const email of adminEmailsToDelete) {
    console.log(`\n🔍 Processing: ${email}`);
    const result = await deleteAdminUser(email);
    
    if (result.success) {
      successCount++;
    } else if (result.message === 'User not found') {
      notFoundCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 DELETION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully deleted: ${successCount}`);
  console.log(`⚠️  Not found: ${notFoundCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));
  console.log('\n✅ Process complete!');

  process.exit(0);
};

main();

