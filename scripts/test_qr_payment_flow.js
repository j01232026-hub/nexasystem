import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load env vars from parent directory
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} else {
  console.log('No .env file found at', envPath);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('=== Starting NEXA QR Payment Flow Test ===');

  // 1. Setup Test Data
  console.log('\n1. Fetching Test Data...');
  
  let { data: tenants } = await supabase.from('tenants').select('id').limit(1);
  let tenantId = tenants?.[0]?.id;
  
  if (!tenantId) {
    console.log('No tenant found, creating dummy tenant...');
    const { data: newTenant, error: tErr } = await supabase.from('tenants').insert({
      name: 'Test Salon',
      code: 'TEST01'
    }).select().single();
    if (tErr) throw tErr;
    tenantId = newTenant.id;
  }
  console.log('Tenant ID:', tenantId);

  let { data: staff } = await supabase.from('staff').select('id').eq('tenant_id', tenantId).limit(1);
  let operatorId = staff?.[0]?.id;
  
  if (!operatorId) {
    console.log('No staff found, creating dummy staff...');
    // Create auth user for staff
    const email = `staff_${Date.now()}@test.com`;
    const { data: { user }, error: uErr } = await supabase.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true
    });
    
    if (uErr) throw uErr;
    
    const { data: newStaff, error: sErr } = await supabase.from('staff').insert({
      tenant_id: tenantId,
      user_id: user.id,
      display_name: 'Test Staff',
      role: 'admin'
    }).select().single();
    
    if (sErr) throw sErr;
    operatorId = newStaff.id;
  }
  console.log('Operator ID:', operatorId);
  
  let { data: customers } = await supabase.from('customers').select('id').limit(1);
  let userId = customers?.[0]?.id;
  
  if (!userId) {
     console.log('No customer found, creating dummy customer...');
     const { data: newCustomer, error: cErr } = await supabase.from('customers').insert({
       name: 'Test Customer',
       phone: '0912345678',
       tenant_id: tenantId
     }).select().single();
     if (cErr) throw cErr;
     userId = newCustomer.id;
  }
  console.log('User ID:', userId);

  // 2. Initialize Wallet & Top-up
  console.log('\n2. Initializing Wallet & Top-up...');
  await supabase.rpc('initialize_wallet', { p_user_id: userId });

  // Add 1000 balance
  const topupAmount = 1000;
  const { data: balanceAfterTopup, error: topupError } = await supabase.rpc('process_fund_change', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_amount: topupAmount,
    p_type: 'TOPUP_CASH',
    p_description: 'Test Topup',
    p_operator_id: operatorId
  });

  if (topupError) throw topupError;
  console.log(`Top-up successful. New Balance: $${balanceAfterTopup}`);

  // 3. Generate Payment Token (C-side)
  console.log('\n3. Generating Payment Token...');
  const randomBytes = crypto.randomBytes(32);
  const tokenRaw = randomBytes.toString('hex'); // walletService uses hex string from Uint8Array
  
  // Hash it
  const encoder = new TextEncoder();
  const data = encoder.encode(tokenRaw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  console.log('Token Raw:', tokenRaw.substring(0, 10) + '...');
  console.log('Token Hash:', tokenHash.substring(0, 10) + '...');

  const { error: createError } = await supabase.rpc('create_payment_token', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_token_hash: tokenHash,
    p_expires_in_seconds: 60
  });

  if (createError) throw createError;
  console.log('Payment Token created in DB.');

  // 4. Consume Payment Token (B-side)
  console.log('\n4. Consuming Payment Token...');
  const paymentAmount = 100;
  
  // Re-hash logic (B-side receives raw token, hashes it to find in DB)
  // In our test script, we already have tokenHash, but let's verify logic consistency
  // walletService.processPaymentFromToken does hashing again.
  
  const { data: paymentResult, error: paymentError } = await supabase.rpc('consume_payment_token', {
    p_token_hash: tokenHash,
    p_amount: paymentAmount,
    p_operator_id: operatorId
  });

  if (paymentError) throw paymentError;
  console.log('Payment processed successfully!');
  console.log('Payment Result:', paymentResult);

  if (paymentResult.amount_paid !== paymentAmount) {
    throw new Error(`Amount mismatch. Expected ${paymentAmount}, got ${paymentResult.amount_paid}`);
  }

  // 5. Verify Final Balance
  console.log('\n5. Verifying Final Balance...');
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).single();
  console.log(`Final Balance in DB: $${wallet.balance}`);
  
  if (parseFloat(wallet.balance) !== parseFloat(balanceAfterTopup) - paymentAmount) {
     console.warn(`WARNING: Balance mismatch! Expected ${balanceAfterTopup - paymentAmount}, got ${wallet.balance}`);
  } else {
     console.log('Balance verification PASSED.');
  }

  // 6. Verify Token Consumption (Should fail if reused)
  console.log('\n6. Verifying Replay Protection...');
  const { error: replayProtectionError } = await supabase.rpc('consume_payment_token', {
    p_token_hash: tokenHash,
    p_amount: 50,
    p_operator_id: operatorId
  });

  if (replayProtectionError) {
    console.log('Replay protection PASSED. Error received as expected:', replayProtectionError.message);
  } else {
    console.error('Replay protection FAILED! Token was reused.');
  }

  console.log('\n6. Verifying Replay Protection...');
  const { error: replayError } = await supabase.rpc('consume_payment_token', {
    p_token_hash: tokenHash,
    p_amount: 50,
    p_operator_id: operatorId
  });

  if (replayError) {
    console.log('Replay protection PASSED. Error received as expected:', replayError.message);
  } else {
    console.error('Replay protection FAILED! Token was reused.');
    throw new Error('Replay protection FAILED!');
  }

  // 7. Verify Top-up Idempotency
  console.log('\n7. Verifying Top-up Idempotency...');
  const idempotencyTopupAmount = 500;
  
  // Create a new pending top-up order
  const { data: pendingOrder, error: createOrderError } = await supabase
    .from('topup_orders')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      amount: idempotencyTopupAmount,
      payment_method: 'cash',
      operator_id: operatorId,
      status: 'pending'
    })
    .select()
    .single();

  if (createOrderError) throw createOrderError;
  console.log(`Created pending top-up order: ${pendingOrder.id}`);

  // Get initial balance before idempotent top-up
  const { data: initialWalletBeforeIdempotentTopup } = await supabase.from('wallets').select('balance').eq('user_id', userId).single();
  const initialBalanceIdempotent = parseFloat(initialWalletBeforeIdempotentTopup.balance);
  console.log(`Initial balance before idempotent top-up: $${initialBalanceIdempotent}`);

  // Attempt to confirm the order multiple times
  console.log('Attempting to confirm the order multiple times...');
  const confirmPromises = [];
  const confirmAttempt = async (order, attemptNum) => {
    try {
      const { data, error } = await supabase.rpc('process_fund_change', {
        p_user_id: order.user_id,
        p_tenant_id: order.tenant_id,
        p_amount: order.amount,
        p_type: 'TOPUP_CASH',
        p_related_order_id: order.id, // Crucial for idempotency
        p_description: `Idempotent Test Topup ${attemptNum}`,
        p_operator_id: operatorId
      });
      if (error) return { error };
      return { data };
    } catch (err) {
      return { error: err };
    }
  };

  for (let i = 0; i < 3; i++) { // Simulate 3 attempts
    confirmPromises.push(confirmAttempt(pendingOrder, i + 1));
  }

  const confirmResults = await Promise.all(confirmPromises);
  console.log('Confirmation attempts completed.');

  // Verify final balance
  const { data: finalWalletAfterIdempotentTopup } = await supabase.from('wallets').select('balance').eq('user_id', userId).single();
  const finalBalanceIdempotent = parseFloat(finalWalletAfterIdempotentTopup.balance);
  console.log(`Final balance after idempotent top-up attempts: $${finalBalanceIdempotent}`);

  // Expected balance: initialBalanceIdempotent + idempotencyTopupAmount
  const expectedFinalBalanceIdempotent = initialBalanceIdempotent + idempotencyTopupAmount;

  if (finalBalanceIdempotent === expectedFinalBalanceIdempotent) {
    console.log('Idempotency Test PASSED. Balance is as expected.');
  } else {
    console.error(`Idempotency Test FAILED! Expected balance: $${expectedFinalBalanceIdempotent}, Actual: $${finalBalanceIdempotent}`);
    throw new Error('Idempotency Test Failed');
  }

  // Verify only one transaction ledger entry for this order
  const { data: ledgerEntries, error: ledgerError } = await supabase
    .from('transaction_ledger')
    .select('*')
    .eq('related_order_id', pendingOrder.id);

  if (ledgerError) throw ledgerError;

  if (ledgerEntries.length === 1) {
    console.log('Idempotency Test PASSED. Only one ledger entry found for the idempotent top-up order.');
  } else {
    console.error(`Idempotency Test FAILED! Expected 1 ledger entry, found ${ledgerEntries.length}`);
    throw new Error('Idempotency Test Failed: Multiple ledger entries');
  }

  console.log('\n=== Test Completed Successfully ===');
}

main().catch(err => {
  console.error('\n!!! Test Failed !!!');
  console.error(err);
  process.exit(1);
});
