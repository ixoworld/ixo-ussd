-- Data Storage: Phone → Customer → Wallet (IXO Profile + Account) → Matrix Vault

-- 1. Phone details (independent - can exist without any other data)
CREATE TABLE IF NOT EXISTS phones (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(32) NOT NULL UNIQUE,
  first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
  number_of_visits INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Households (created only when needed for IXO Profile/Wallet)
CREATE TABLE IF NOT EXISTS households (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Customer details (needs phone, may have household)
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(10) NOT NULL UNIQUE, -- C21009802 format
  full_name VARCHAR(255),
  email VARCHAR(255),
  encrypted_pin TEXT,
  preferred_language VARCHAR(10) DEFAULT 'eng',
  date_added TIMESTAMP NOT NULL DEFAULT NOW(),
  last_completed_action TEXT,
  household_id INTEGER REFERENCES households(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Junction table for phone-customer relationships (many-to-many)
CREATE TABLE IF NOT EXISTS customer_phones (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  phone_id INTEGER NOT NULL REFERENCES phones(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, phone_id)
);

-- 4. IXO Profiles (Wallet part 1 - can be individual or household-based)
-- Individual: customer_id → ixo_profiles (direct)
-- Household: customer_id → household_id → ixo_profiles (shared)
CREATE TABLE IF NOT EXISTS ixo_profiles (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
  did TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Exactly one of customer_id or household_id must be set
  CONSTRAINT ixo_profiles_owner_check CHECK (
    (customer_id IS NOT NULL AND household_id IS NULL) OR
    (customer_id IS NULL AND household_id IS NOT NULL)
  )
);

-- 5. IXO Accounts (Wallet part 2 - many per IXO profile)
-- At least one account created with each IXO Profile
CREATE TABLE IF NOT EXISTS ixo_accounts (
  id SERIAL PRIMARY KEY,
  ixo_profile_id INTEGER NOT NULL REFERENCES ixo_profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  encrypted_mnemonic TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE, -- First account created is primary
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Matrix Vaults (secure storage - one per IXO profile)
CREATE TABLE IF NOT EXISTS matrix_vaults (
  id SERIAL PRIMARY KEY,
  ixo_profile_id INTEGER NOT NULL REFERENCES ixo_profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(ixo_profile_id) -- One vault per profile
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS  idx_phones_phone_number ON phones(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_phones_customer_id ON customer_phones(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_phones_phone_id ON customer_phones(phone_id);
CREATE INDEX IF NOT EXISTS idx_ixo_profiles_customer_id ON ixo_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_ixo_profiles_household_id ON ixo_profiles(household_id);
CREATE INDEX IF NOT EXISTS idx_ixo_profiles_did ON ixo_profiles(did);
CREATE INDEX IF NOT EXISTS idx_ixo_accounts_profile_id ON ixo_accounts(ixo_profile_id);
CREATE INDEX IF NOT EXISTS idx_ixo_accounts_address ON ixo_accounts(address);
CREATE INDEX IF NOT EXISTS idx_matrix_vaults_profile_id ON matrix_vaults(ixo_profile_id);

-- Display schema information for verification
SELECT 'phones' as table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'phones' AND table_schema = 'public'
UNION ALL
SELECT 'customers' as table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'customers' AND table_schema = 'public'
UNION ALL
SELECT 'customer_phones' as table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'customer_phones' AND table_schema = 'public'
UNION ALL
SELECT 'households' as table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'households' AND table_schema = 'public'
UNION ALL
SELECT 'ixo_profiles' as table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'ixo_profiles' AND table_schema = 'public'
UNION ALL
SELECT 'ixo_accounts' as table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'ixo_accounts' AND table_schema = 'public'
UNION ALL
SELECT 'matrix_vaults' as table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'matrix_vaults' AND table_schema = 'public'
ORDER BY table_name, column_name;
