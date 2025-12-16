import pkg from 'square';
import { invoiceService } from '../services/invoiceService.js';
import { userService } from '../services/userService.js';
import crypto from 'crypto';

const { SquareClient, SquareEnvironment } = pkg;

// Initialize Square client lazily (on first use)
let squareClient = null;
let cachedLocationId = null; // Cache the validated location ID

/**
 * Get a valid location ID - either from env or by fetching available locations
 */
async function getValidLocationId(client) {
  // If we have a cached valid location ID, use it
  if (cachedLocationId) {
    return cachedLocationId;
  }

  const configuredLocationId = process.env.SQUARE_LOCATION_ID;
  
  // Try to fetch available locations
  try {
    const locationsResponse = await client.locations.list();
    
    if (locationsResponse.errors && locationsResponse.errors.length > 0) {
      console.warn('⚠️ Could not fetch locations:', locationsResponse.errors[0].detail);
      // Fall back to configured location ID
      return configuredLocationId;
    }

    const locations = locationsResponse.locations || [];
    
    if (locations.length === 0) {
      console.warn('⚠️ No locations found. Using configured location ID.');
      return configuredLocationId;
    }

    // Check if configured location ID is in the list
    const locationIds = locations.map(loc => loc.id);
    const isValidLocation = configuredLocationId && locationIds.includes(configuredLocationId);
    
    if (isValidLocation) {
      console.log(`✅ Using configured location ID: ${configuredLocationId}`);
      cachedLocationId = configuredLocationId;
      return configuredLocationId;
    } else {
      // Use the first available location
      const firstLocation = locations[0];
      console.warn(`⚠️ Configured location ID (${configuredLocationId}) is not accessible.`);
      console.warn(`✅ Using first available location: ${firstLocation.id} (${firstLocation.name || 'Unnamed'})`);
      cachedLocationId = firstLocation.id;
      return firstLocation.id;
    }
  } catch (error) {
    console.error('Error fetching locations:', error);
    // Fall back to configured location ID
    return configuredLocationId;
  }
}

/**
 * Get or initialize Square client
 */
function getSquareClient() {
  if (squareClient) {
    return squareClient;
  }

  // Check if access token is available
  if (!process.env.SQUARE_ACCESS_TOKEN) {
    console.warn('⚠️ SQUARE_ACCESS_TOKEN not set. Square payment features will not work.');
    return null;
  }

  try {
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const environment = process.env.SQUARE_ENVIRONMENT === 'production' 
      ? SquareEnvironment.Production 
      : SquareEnvironment.Sandbox;
    
    if (!accessToken) {
      console.warn('⚠️ SQUARE_ACCESS_TOKEN not set. Square payment features will not work.');
      return null;
    }
    
    // Log token info (first and last 4 chars for security)
    const tokenPreview = accessToken.length > 8 
      ? `${accessToken.substring(0, 4)}...${accessToken.substring(accessToken.length - 4)}`
      : '***';
    console.log(`✅ Square client initializing with token: ${tokenPreview}`);
    console.log(`✅ Square environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`);
    
    squareClient = new SquareClient({
      token: accessToken, // In SDK v42, it's 'token', not 'accessToken'
      environment: environment,
    });
    
    // Log client structure for debugging
    console.log('✅ Square client initialized successfully');
    
    // In Square SDK v42, APIs are accessed as getters: client.orders and client.payments
    try {
      // Try to access the APIs to verify they're available
      const testOrdersApi = squareClient.orders;
      const testPaymentsApi = squareClient.payments;
      
      if (testOrdersApi) {
        console.log('✅ Square orders API is available');
      } else {
        console.warn('⚠️ Square orders API is null/undefined');
      }
      
      if (testPaymentsApi) {
        console.log('✅ Square payments API is available');
      } else {
        console.warn('⚠️ Square payments API is null/undefined');
      }
    } catch (e) {
      console.warn('⚠️ Error accessing APIs:', e.message);
      // APIs might be lazy-loaded, so this is not necessarily an error
    }
    
    return squareClient;
  } catch (error) {
    console.error('❌ Error initializing Square client:', error);
    return null;
  }
}

/**
 * Create Square payment for $10/month subscription
 */
export const createSubscriptionPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const amount = 10.00; // $10 per month
    const currency = 'USD';

    const user = await userService.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or initialize Square client
    const client = getSquareClient();
    if (!client) {
      throw new Error('Square client could not be initialized. Please check SQUARE_ACCESS_TOKEN in your environment variables.');
    }

    // Create invoice
    const invoiceId = `INV-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const invoice = await invoiceService.create({
      invoiceId,
      invoiceNumber: invoiceId, // Use invoiceId as invoiceNumber to ensure uniqueness
      userId,
      amount: amount,
      currency: currency.toUpperCase(),
      subscriptionPlan: 'basic',
      status: 'Pending',
      paymentMethod: 'square',
      description: 'Basic Subscription - 250MB File Upload Limit (Monthly)',
      subscriptionStartDate: null, // Will be set after payment
      subscriptionEndDate: null
    });

    // Access Square Orders API
    // In Square SDK v42, APIs are accessed as getters: client.orders (not ordersApi)
    let ordersApi;
    try {
      ordersApi = client.orders; // Use .orders, not .ordersApi
    } catch (error) {
      console.error('Error accessing orders API:', error);
      throw new Error('Square Orders API is not accessible. Please check your Square SDK configuration.');
    }
    
    if (!ordersApi) {
      console.error('Square access token configured:', !!process.env.SQUARE_ACCESS_TOKEN);
      console.error('Square location ID configured:', !!process.env.SQUARE_LOCATION_ID);
      throw new Error('Square Orders API is not available. Please check your Square SDK version and ensure your access token has the correct permissions.');
    }
    
    // Get a valid location ID (automatically detects if configured one is invalid)
    const locationId = await getValidLocationId(client);
    
    if (!locationId) {
      throw new Error('No valid location ID found. Please set SQUARE_LOCATION_ID or ensure your access token has access to at least one location.');
    }
    
    const orderRequest = {
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId: locationId,
        lineItems: [{
          name: 'Basic Subscription - 250MB Upload Limit (Monthly)',
          quantity: '1',
          basePriceMoney: {
            amount: BigInt(Math.round(amount * 100)), // Square uses cents and expects bigint
            currency: currency.toUpperCase()
          }
        }],
        referenceId: invoice.invoiceId,
        metadata: {
          userId: userId.toString(),
          invoiceId: invoice.invoiceId,
          type: 'subscription'
        }
      }
    };

    // In Square SDK v42, the method is 'create', not 'createOrder'
    const response = await ordersApi.create(orderRequest);
    
    // Check for errors
    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].detail || 'Failed to create order');
    }
    
    if (!response.order) {
      throw new Error('Order was not created');
    }
    
    // Update invoice with Square order ID
    await invoiceService.update(invoice.id, {
      squareOrderId: response.order.id
    });

    res.status(200).json({
      success: true,
      orderId: response.order.id,
      invoiceId: invoice.invoiceId,
      amount: amount,
      currency: currency,
      paymentRequest: {
        orderId: response.order.id,
        locationId: locationId,
        applicationId: process.env.SQUARE_APPLICATION_ID
      }
    });

  } catch (error) {
    console.error('Error creating subscription payment:', error);
    
    // Handle Square API errors specifically (SDK v42 format)
    if (error.statusCode === 401) {
      console.error('❌ Authentication failed. Please check:');
      console.error('  1. SQUARE_ACCESS_TOKEN is correct');
      console.error('  2. Token matches the environment (sandbox vs production)');
      console.error('  3. Token has not expired');
      console.error('  4. Token has ORDERS_WRITE permission');
      return res.status(401).json({ 
        error: 'Square authentication failed. Please verify your SQUARE_ACCESS_TOKEN is correct and has the required permissions.',
        details: error.errors || error.body?.errors
      });
    }
    
    if (error.statusCode === 403) {
      // Clear cached location ID so we try to fetch a new one next time
      cachedLocationId = null;
      
      console.error('❌ Authorization failed. The access token does not have permission for the specified location.');
      console.error(`   Location ID used: ${process.env.SQUARE_LOCATION_ID}`);
      
      // Try to get available locations to suggest alternatives
      let availableLocations = [];
      try {
        const locationsResponse = await client.locations.list();
        if (locationsResponse.locations && locationsResponse.locations.length > 0) {
          availableLocations = locationsResponse.locations.map(loc => ({
            id: loc.id,
            name: loc.name || 'Unnamed'
          }));
          console.error(`   Available locations for your token: ${availableLocations.map(l => l.id).join(', ')}`);
        }
      } catch (locError) {
        console.error('   Could not fetch available locations:', locError.message);
      }
      
      console.error('   Please check:');
      console.error('  1. The SQUARE_LOCATION_ID matches a location your token has access to');
      console.error('  2. Your token has ORDERS_WRITE permission for this location');
      console.error('  3. Use the /api/payments/square/locations endpoint to see available locations');
      
      return res.status(403).json({ 
        error: `Not authorized to access orders with location_id=${process.env.SQUARE_LOCATION_ID}. Please verify your SQUARE_LOCATION_ID is correct and your access token has permission for this location.`,
        details: error.errors || error.body?.errors,
        suggestion: 'Use GET /api/payments/square/locations to see available locations for your token',
        availableLocations: availableLocations.length > 0 ? availableLocations : undefined
      });
    }
    
    // Extract error message from Square SDK v42 error format
    const errorMessage = error.errors?.[0]?.detail || error.body?.errors?.[0]?.detail || error.message || 'Failed to create payment request';
    res.status(error.statusCode || 500).json({ 
      error: errorMessage,
      details: error.errors || error.body?.errors || error.stack
    });
  }
};

/**
 * Process Square payment after card tokenization
 */
export const processSubscriptionPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const { sourceId, orderId, invoiceId, idempotencyKey } = req.body;

    if (!sourceId || !orderId || !invoiceId) {
      return res.status(400).json({ 
        error: 'Source ID, Order ID, and Invoice ID are required' 
      });
    }

    // Find invoice by invoiceId and userId
    const invoice = await invoiceService.findByInvoiceId(invoiceId);
    
    if (!invoice || invoice.userId !== userId || invoice.status !== 'Pending') {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get or initialize Square client
    const client = getSquareClient();
    if (!client) {
      throw new Error('Square client could not be initialized. Please check SQUARE_ACCESS_TOKEN in your environment variables.');
    }

    // Access Square Payments API
    // In Square SDK v42, APIs are accessed as getters: client.payments (not paymentsApi)
    let paymentsApi;
    try {
      paymentsApi = client.payments; // Use .payments, not .paymentsApi
    } catch (error) {
      console.error('Error accessing payments API:', error);
      throw new Error('Square Payments API is not accessible. Please check your Square SDK configuration.');
    }
    
    if (!paymentsApi) {
      console.error('Square Payments API is not available');
      throw new Error('Square Payments API is not available. Please verify your Square configuration.');
    }

    // Create payment
    const paymentRequest = {
      sourceId: sourceId,
      idempotencyKey: idempotencyKey || crypto.randomUUID(),
      amountMoney: {
        amount: BigInt(Math.round(invoice.amount * 100)), // Convert to cents and use bigint
        currency: invoice.currency
      },
      orderId: orderId,
      referenceId: invoice.invoiceId,
      note: `Subscription payment for invoice ${invoice.invoiceId}`,
      metadata: {
        userId: userId.toString(),
        invoiceId: invoice.invoiceId,
        type: 'subscription'
      }
    };

    // In Square SDK v42, the method is 'create', not 'createPayment'
    let response;
    try {
      response = await paymentsApi.create(paymentRequest);
    } catch (squareError) {
      // Square SDK v42 throws errors, but also may return errors in response
      console.error('Square payment creation error:', squareError);
      
      // Extract error details from Square error
      // Square SDK v42 can have errors in multiple places
      const squareErrors = squareError.errors || squareError.body?.errors || squareError.result?.errors || [];
      const errorCode = squareErrors[0]?.code || 'PAYMENT_FAILED';
      const errorDetail = squareErrors[0]?.detail || squareErrors[0]?.message || squareError.message || 'Payment processing failed';
      const errorCategory = squareErrors[0]?.category || 'API_ERROR';
      
      // Return structured error information
      return res.status(squareError.statusCode || 400).json({
        success: false,
        error: errorDetail,
        errorCode: errorCode,
        errorCategory: errorCategory,
        errors: squareErrors,
        payment: squareError.body?.payment || null
      });
    }

    // Check for errors in response (Square may return errors even on 200)
    if (response.errors && response.errors.length > 0) {
      const errorCode = response.errors[0]?.code || 'PAYMENT_FAILED';
      const errorDetail = response.errors[0]?.detail || 'Payment processing failed';
      const errorCategory = response.errors[0]?.category || 'API_ERROR';
      
      return res.status(400).json({
        success: false,
        error: errorDetail,
        errorCode: errorCode,
        errorCategory: errorCategory,
        errors: response.errors,
        payment: response.payment || null
      });
    }

    if (response.payment) {
      const paymentStatus = response.payment.status;
      
      // Check if payment failed
      if (paymentStatus === 'FAILED') {
        const errorCode = 'PAYMENT_FAILED';
        const errorDetail = 'Payment was declined by the payment processor';
        
        return res.status(400).json({
          success: false,
          error: errorDetail,
          errorCode: errorCode,
          errorCategory: 'PAYMENT_METHOD_ERROR',
          errors: response.errors || [],
          payment: response.payment
        });
      }
      
      // Update invoice
      const updateData = {
        status: paymentStatus === 'COMPLETED' ? 'Paid' : 'Pending',
        squarePaymentId: response.payment.id,
        transactionHash: response.payment.id
      };
      
      // Activate user subscription
      if (paymentStatus === 'COMPLETED') {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
        
        updateData.subscriptionStartDate = startDate;
        updateData.subscriptionEndDate = endDate;
        
        await userService.update(userId, {
          subscriptionStatus: 'active',
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate,
          fileSizeLimit: 250 * 1024 * 1024, // 250MB
          totalFileSizeUsed: 0, // Reset on new subscription
          lastSubscriptionInvoiceId: invoice.invoiceId
        });
      }
      
      await invoiceService.update(invoice.id, updateData);

      res.status(200).json({
        success: true,
        payment: {
          id: response.payment.id,
          status: paymentStatus,
          invoiceId: invoice.invoiceId
        },
        subscription: paymentStatus === 'COMPLETED' ? {
          status: 'active',
          fileSizeLimit: '250MB',
          startDate: invoice.subscriptionStartDate,
          endDate: invoice.subscriptionEndDate
        } : null
      });
    } else {
      throw new Error('Payment creation failed');
    }

  } catch (error) {
    console.error('Error processing subscription payment:', error);
    
    // Try to extract Square error details
    const squareErrors = error.errors || error.body?.errors || error.response?.errors || [];
    const errorCode = squareErrors[0]?.code || 'PAYMENT_ERROR';
    const errorDetail = squareErrors[0]?.detail || error.message || 'Payment processing failed';
    const errorCategory = squareErrors[0]?.category || 'API_ERROR';
    
    res.status(error.statusCode || 500).json({ 
      success: false,
      error: errorDetail,
      errorCode: errorCode,
      errorCategory: errorCategory,
      errors: squareErrors,
      details: error.stack
    });
  }
};

/**
 * Handle Square webhooks
 */
export const handleSquareWebhook = async (req, res) => {
  try {
    // Square sends signature in x-square-hmacsha256-signature header
    const signature = req.headers['x-square-hmacsha256-signature'] || req.headers['x-square-signature'];
    
    // Get raw body for signature verification
    // req.body is a Buffer when using express.raw()
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
    
    // Verify webhook signature if signature key is configured
    if (process.env.SQUARE_WEBHOOK_SIGNATURE_KEY && signature) {
      const hmac = crypto.createHmac('sha256', process.env.SQUARE_WEBHOOK_SIGNATURE_KEY);
      hmac.update(rawBody);
      const hash = hmac.digest('base64');

      if (hash !== signature) {
        console.error('Invalid webhook signature. Expected:', hash, 'Received:', signature);
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
      console.log('✅ Webhook signature verified');
    } else if (process.env.SQUARE_WEBHOOK_SIGNATURE_KEY && !signature) {
      console.warn('⚠️ Webhook signature key is set but no signature header found');
    }

    // Parse the body if it's a string
    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : req.body;
    console.log('Received Square webhook:', event.type);
    
    // Handle payment updated event
    if (event.type === 'payment.updated') {
      const payment = event.data?.object?.payment_updated;
      if (!payment) {
        console.error('Payment data not found in webhook');
        return res.status(400).json({ error: 'Payment data not found' });
      }

      const paymentId = payment.id;
      
      const invoice = await invoiceService.findBySquarePaymentId(paymentId);

      if (invoice && invoice.status !== 'Paid') {
        if (payment.status === 'COMPLETED') {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
          
          await invoiceService.update(invoice.id, {
            status: 'Paid',
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
          
        } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
          await invoiceService.update(invoice.id, {
            status: 'Failed'
          });
        }
      }
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error handling Square webhook:', error);
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
 * Get available Square locations for the access token
 */
export const getSquareLocations = async (req, res) => {
  try {
    const client = getSquareClient();
    if (!client) {
      return res.status(500).json({ 
        error: 'Square client is not initialized. Please check SQUARE_ACCESS_TOKEN in your environment variables.' 
      });
    }

    try {
      const response = await client.locations.list();
      
      if (response.errors && response.errors.length > 0) {
        return res.status(500).json({ 
          error: 'Failed to fetch locations',
          details: response.errors
        });
      }

      const locations = response.locations || [];
      
      res.status(200).json({
        success: true,
        locations: locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          status: loc.status,
          capabilities: loc.capabilities
        })),
        currentLocationId: process.env.SQUARE_LOCATION_ID,
        message: locations.length > 0 
          ? `Found ${locations.length} location(s). Use one of these IDs in your SQUARE_LOCATION_ID environment variable.`
          : 'No locations found. Please create a location in your Square dashboard first.'
      });
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ 
        error: 'Failed to fetch locations',
        details: error.errors || error.message
      });
    }
  } catch (error) {
    console.error('Error getting Square locations:', error);
    res.status(500).json({ error: 'Failed to get Square locations' });
  }
};

/**
 * Get Square configuration for frontend
 */
export const getSquareConfig = async (req, res) => {
  try {
    const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';
    const applicationId = process.env.SQUARE_APPLICATION_ID;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!applicationId || !locationId) {
      return res.status(500).json({ 
        error: 'Square configuration is missing. Please set SQUARE_APPLICATION_ID and SQUARE_LOCATION_ID in environment variables.' 
      });
    }

    // Try to initialize client to verify it works
    const client = getSquareClient();
    const clientStatus = client ? 'initialized' : 'failed';
    const hasOrdersApi = client && client.orders ? true : false;
    const hasPaymentsApi = client && client.payments ? true : false;
    
    // Get all property names for debugging
    const clientKeys = client ? Object.keys(client) : [];
    const apiKeys = client ? Object.keys(client).filter(key => key.toLowerCase().includes('api')) : [];

    res.status(200).json({
      success: true,
      config: {
        applicationId,
        locationId,
        environment,
        // Use production SDK URL for production, sandbox for sandbox
        sdkUrl: environment === 'production' 
          ? 'https://web.squarecdn.com/v1/square.js'
          : 'https://sandbox.web.squarecdn.com/v1/square.js',
        // Diagnostic info
        clientStatus,
        hasOrdersApi,
        hasPaymentsApi,
        clientKeys,
        apiKeys
      }
    });

  } catch (error) {
    console.error('Error getting Square config:', error);
    res.status(500).json({ error: 'Failed to get Square configuration' });
  }
};

