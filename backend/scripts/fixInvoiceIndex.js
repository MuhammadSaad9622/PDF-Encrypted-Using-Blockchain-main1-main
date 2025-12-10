import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-encryption';

async function fixInvoiceIndex() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const invoicesCollection = db.collection('invoices');

    // Get all invoices with null invoiceNumber
    const invoicesWithNull = await invoicesCollection.find({ invoiceNumber: null }).toArray();
    console.log(`Found ${invoicesWithNull.length} invoices with null invoiceNumber`);

    // Update them to use invoiceId as invoiceNumber
    let updatedCount = 0;
    for (const invoice of invoicesWithNull) {
      if (invoice.invoiceId) {
        await invoicesCollection.updateOne(
          { _id: invoice._id },
          { $set: { invoiceNumber: invoice.invoiceId } }
        );
        updatedCount++;
      }
    }
    console.log(`✅ Updated ${updatedCount} invoices with invoiceNumber`);

    // Try to drop the old index if it exists
    try {
      await invoicesCollection.dropIndex('invoiceNumber_1');
      console.log('✅ Dropped old invoiceNumber_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('Index invoiceNumber_1 does not exist, skipping drop');
      } else {
        console.error('Error dropping index:', error.message);
      }
    }

    // Create a new sparse index
    try {
      await invoicesCollection.createIndex(
        { invoiceNumber: 1 },
        { unique: true, sparse: true, name: 'invoiceNumber_1_sparse' }
      );
      console.log('✅ Created new sparse index on invoiceNumber');
    } catch (error) {
      console.error('Error creating index:', error.message);
    }

    console.log('✅ Invoice index fix completed');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing invoice index:', error);
    process.exit(1);
  }
}

fixInvoiceIndex();

