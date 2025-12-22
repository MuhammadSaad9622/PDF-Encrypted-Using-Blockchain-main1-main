import Stripe from 'stripe';
import { invoiceService } from '../services/invoiceService.js';
import { userService } from '../services/userService.js';
import crypto from 'crypto';

// Initialize Stripe client lazily (on first use)
let stripeClient = null;

/**
 * Get or initialize Stripe client
 */
function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  // Check if secret key is available
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ STRIPE_SECRET_KEY not set. Stripe payment features will not work.');
    return null;
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    // Log key info (first and last 4 chars for security)
    const keyPreview = secretKey.length > 8 
      ? `${secretKey.substring(0, 8)}...${secretKey.substring(secretKey.length - 4)}`
      : '***';
    console.log(`✅ Stripe client initializing with key: ${keyPreview}`);
    
    // Determine environment from key prefix
    const environment = secretKey.startsWith('sk_live_') ? 'production' : 'test';
    console.log(`✅ Stripe environment: ${environment}`);
    
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
    
    console.log('✅ Stripe client initialized successfully');
    
    return stripeClient;
  } catch (error) {
    console.error('❌ Error initializing Stripe client:', error);
    return null;
  }
}

/**
 * Create Stripe payment intent for $10/month subscription
 */
export const createSubscriptionPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const amount = 10.00; // $10 per month
    const currency = 'usd';

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or initialize Stripe client
    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error('Stripe client could not be initialized. Please check STRIPE_SECRET_KEY in your environment variables.');
    }

    // Cancel any old pending invoices for this user (to prevent multiple pending invoices)
    try {
      const oldPendingInvoices = await invoiceService.find(
        { userId, status: 'Pending' },
        { sort: { createdAt: -1 } }
      );
      
      // Mark ALL old pending invoices as Failed (to prevent multiple pending invoices)
      // When creating a new payment attempt, cancel all previous pending attempts
      for (const oldInvoice of oldPendingInvoices) {
        await invoiceService.update(oldInvoice.id, {
          status: 'Failed'
        });
      }
    } catch (cleanupError) {
      console.error('Error cleaning up old pending invoices:', cleanupError);
      // Continue even if cleanup fails
    }

    // Create invoice
    const invoiceId = `INV-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const invoice = await invoiceService.create({
      invoiceId,
      invoiceNumber: invoiceId,
      userId,
      amount: amount,
      currency: currency.toUpperCase(),
      subscriptionPlan: 'basic',
      status: 'Pending',
      paymentMethod: 'stripe',
      description: 'Basic Subscription - 250MB File Upload Limit (Monthly)',
      subscriptionStartDate: null,
      subscriptionEndDate: null
    });

    // Create payment intent - explicitly only accept card payments (no redirects)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      payment_method_types: ['card'], // Explicitly only accept card payments
      metadata: {
        userId: userId.toString(),
        invoiceId: invoice.invoiceId,
        type: 'subscription'
      },
      description: `Subscription payment for invoice ${invoice.invoiceId}`
    });

    // Update invoice with Stripe payment intent ID
    await invoiceService.update(invoice.id, {
      stripePaymentIntentId: paymentIntent.id
    });

    res.status(200).json({
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      invoiceId: invoice.invoiceId,
      amount: amount,
      currency: currency
    });

  } catch (error) {
    console.error('Error creating subscription payment:', error);
    
    // Handle Stripe errors
    if (error.type === 'StripeAuthenticationError') {
      return res.status(401).json({ 
        error: 'Stripe authentication failed. Please verify your STRIPE_SECRET_KEY is correct.',
        details: error.message
      });
    }
    
    if (error.type === 'StripePermissionError') {
      return res.status(403).json({ 
        error: 'Stripe authorization failed. Please verify your API key has the required permissions.',
        details: error.message
      });
    }
    
    res.status(error.statusCode || 500).json({ 
      error: error.message || 'Failed to create payment request',
      details: error.type || 'Unknown error'
    });
  }
};

/**
 * Process Stripe payment after card tokenization
 */
export const processSubscriptionPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const { paymentIntentId, paymentMethodId, invoiceId } = req.body;

    if (!paymentIntentId || !paymentMethodId || !invoiceId) {
      return res.status(400).json({ 
        error: 'Payment Intent ID, Payment Method ID, and Invoice ID are required' 
      });
    }

    // Find invoice by invoiceId and userId
    const invoice = await invoiceService.findByInvoiceId(invoiceId);
    
    if (!invoice || invoice.userId !== userId || invoice.status !== 'Pending') {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get or initialize Stripe client
    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error('Stripe client could not be initialized. Please check STRIPE_SECRET_KEY in your environment variables.');
    }

    // Confirm the payment intent
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId
    });

    if (paymentIntent.status === 'succeeded') {
      // Update invoice
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
        
      await invoiceService.update(invoice.id, {
        status: 'Paid',
        stripePaymentId: paymentIntent.id,
        transactionHash: paymentIntent.id,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate
      });
      
      // Activate user subscription
        await userService.update(userId, {
          subscriptionStatus: 'active',
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate,
          fileSizeLimit: 250 * 1024 * 1024, // 250MB
        totalFileSizeUsed: 0,
          lastSubscriptionInvoiceId: invoice.invoiceId
        });

      res.status(200).json({
        success: true,
        payment: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          invoiceId: invoice.invoiceId
        },
        subscription: {
          status: 'active',
          fileSizeLimit: '250MB',
          startDate: startDate,
          endDate: endDate
        }
      });
    } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_payment_method') {
      // Payment requires additional action (e.g., 3D Secure)
      // Invoice stays as Pending until payment is confirmed or fails
      res.status(200).json({
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        payment: {
          id: paymentIntent.id,
          status: paymentIntent.status
        }
      });
    } else {
      // Payment failed - mark invoice as Failed
      const errorMessage = paymentIntent.last_payment_error?.message || 'Payment processing failed';
      
      // Update invoice status to Failed
      try {
        await invoiceService.update(invoice.id, {
          status: 'Failed',
          stripePaymentId: paymentIntent.id
        });
      } catch (updateError) {
        console.error('Error updating invoice status to Failed:', updateError);
        // Continue even if update fails
      }
      
      return res.status(400).json({
        success: false,
        error: errorMessage,
        errorCode: paymentIntent.last_payment_error?.code || 'PAYMENT_FAILED',
        payment: {
          id: paymentIntent.id,
          status: paymentIntent.status
        }
      });
    }

  } catch (error) {
    console.error('Error processing subscription payment:', error);
    
    // Try to update invoice status to Failed if we have the invoice
    try {
      if (req.body.invoiceId) {
        const invoice = await invoiceService.findByInvoiceId(req.body.invoiceId);
        if (invoice && invoice.status === 'Pending') {
          await invoiceService.update(invoice.id, {
            status: 'Failed'
          });
        }
      }
    } catch (updateError) {
      console.error('Error updating invoice status to Failed:', updateError);
      // Continue even if update fails
    }
    
    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: error.message || 'Card was declined',
        errorCode: error.code || 'card_declined',
        errorCategory: 'PAYMENT_METHOD_ERROR'
      });
    }
    
    res.status(error.statusCode || 500).json({ 
      success: false,
      error: error.message || 'Payment processing failed',
      errorCode: error.type || 'PAYMENT_ERROR'
    });
  }
};

/**
 * Handle Stripe webhooks
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;

  try {
    // Get Stripe client for webhook verification
    const stripe = getStripeClient();
    if (!stripe) {
      console.error('Stripe client not initialized for webhook verification');
      return res.status(500).json({ error: 'Stripe client not initialized' });
    }

    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set. Webhook signature verification skipped.');
      // In development, you might want to parse the event without verification
      event = req.body;
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }

    console.log('Received Stripe webhook:', event.type);

    // Handle payment intent succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      const invoice = await invoiceService.findByStripePaymentIntentId(paymentIntent.id);

      if (invoice && invoice.status !== 'Paid') {
          const startDate = new Date();
          const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
          
          await invoiceService.update(invoice.id, {
            status: 'Paid',
          stripePaymentId: paymentIntent.id,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate
          });
          
          // Activate user subscription
          const user = await userService.findById(invoice.userId);
          if (user) {
            await userService.update(invoice.userId, {
              subscriptionStatus: 'active',
              subscriptionStartDate: startDate,
              subscriptionEndDate: endDate,
              fileSizeLimit: 250 * 1024 * 1024,
              totalFileSizeUsed: 0,
              lastSubscriptionInvoiceId: invoice.invoiceId
            });
            console.log(`✅ Subscription activated for user ${user.email}`);
          }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      
      const invoice = await invoiceService.findByStripePaymentIntentId(paymentIntent.id);
          
      if (invoice && invoice.status !== 'Failed') {
        await invoiceService.update(invoice.id, {
          status: 'Failed',
          stripePaymentId: paymentIntent.id
        });
      }
    } else if (event.type === 'payment_intent.canceled') {
      const paymentIntent = event.data.object;
      
      const invoice = await invoiceService.findByStripePaymentIntentId(paymentIntent.id);
          
      if (invoice && invoice.status === 'Pending') {
        await invoiceService.update(invoice.id, {
          status: 'Failed',
          stripePaymentId: paymentIntent.id
        });
      }
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    
    if (error.type === 'StripeSignatureVerificationError') {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Get user subscription status
 */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.userId;
    
    const user = await userService.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const limitMB = (user.fileSizeLimit || 250 * 1024 * 1024) / (1024 * 1024);
    const usedMB = (user.totalFileSizeUsed || 0) / (1024 * 1024);
    const remainingMB = limitMB - usedMB;

    res.status(200).json({
      success: true,
      subscription: {
        status: user.subscriptionStatus,
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
        fileSizeLimit: {
          total: limitMB,
          used: parseFloat(usedMB.toFixed(2)),
          remaining: Math.max(0, parseFloat(remainingMB.toFixed(2))),
          unit: 'MB'
        }
      }
    });

  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
};

/**
 * Cancel current user's active subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.subscriptionStatus !== 'active') {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    // Import invoice service lazily (to avoid circular deps at startup)
    const { invoiceService } = await import('../services/invoiceService.js');

    // Find latest paid invoice for this user (most recent subscription)
    const invoices = await invoiceService.find(
      { userId, status: 'Paid' },
      { sort: { createdAt: -1 }, limit: 1 }
    );

    const latestInvoice = invoices && invoices.length > 0 ? invoices[0] : null;
    const now = new Date();

    if (latestInvoice) {
      await invoiceService.update(latestInvoice.id, {
        status: 'Cancelled',
        subscriptionEndDate: now
      });
    }

    // Update user subscription status
    await userService.update(userId, {
      subscriptionStatus: 'inactive',
      subscriptionEndDate: now
    });

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

/**
 * Verify card using Stripe Setup Intent (no charge)
 * This is used during signup to verify the card is valid without charging it
 */
export const verifyCard = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment Method ID is required' });
    }

    // Get or initialize Stripe client
    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error('Stripe client could not be initialized. Please check STRIPE_SECRET_KEY in your environment variables.');
    }

    // Create a Setup Intent to verify the card without charging it
    // Setup Intent is specifically designed for verifying payment methods
    const setupIntent = await stripe.setupIntents.create({
      payment_method: paymentMethodId,
      payment_method_types: ['card'], // Explicitly only accept card payments
      metadata: {
        type: 'card_verification'
      },
      description: 'Card verification - no charge'
    });

    // Confirm the Setup Intent to verify the payment method
    const confirmedSetupIntent = await stripe.setupIntents.confirm(setupIntent.id, {
      payment_method: paymentMethodId
    });

    // Check if setup intent succeeded
    if (confirmedSetupIntent.status === 'succeeded') {
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Card verified successfully. No charge was made to your card.'
      });
    } else if (confirmedSetupIntent.status === 'requires_action') {
      // Setup Intent requires 3D Secure authentication
      return res.status(200).json({
        success: false,
        verified: false,
        requiresAction: true,
        clientSecret: confirmedSetupIntent.client_secret,
        error: 'Card verification requires additional authentication. Please complete the verification process.',
        errorCode: 'REQUIRES_ACTION'
      });
    } else if (confirmedSetupIntent.status === 'requires_payment_method') {
      // Payment method is invalid
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'Card verification failed. Please check your card information and try again.',
        errorCode: 'INVALID_PAYMENT_METHOD'
      });
    } else {
      // Setup Intent failed
      const errorMessage = confirmedSetupIntent.last_setup_error?.message || 'Card verification failed. Please check your card information and try again.';
      return res.status(400).json({
        success: false,
        verified: false,
        error: errorMessage,
        errorCode: confirmedSetupIntent.last_setup_error?.code || 'CARD_DECLINED'
      });
    }

  } catch (error) {
    console.error('Error verifying card:', error);
    
    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        verified: false,
        error: error.message || 'Card verification failed. Please check your card information.',
        errorCode: error.code || 'CARD_DECLINED'
      });
    }
    
    res.status(error.statusCode || 500).json({
      success: false,
      verified: false,
      error: error.message || 'Card verification failed'
    });
  }
};

/**
 * Get Stripe configuration for frontend (publishable key)
 */
export const getStripeConfig = async (req, res) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      return res.status(500).json({ 
        error: 'Stripe configuration is missing. Please set STRIPE_PUBLISHABLE_KEY in environment variables.' 
      });
    }

    // Try to initialize client to verify it works
    const stripe = getStripeClient();
    const clientStatus = stripe ? 'initialized' : 'failed';

    res.status(200).json({
      success: true,
      config: {
        publishableKey,
        clientStatus
      }
    });

  } catch (error) {
    console.error('Error getting Stripe config:', error);
    res.status(500).json({ error: 'Failed to get Stripe configuration' });
  }
};
