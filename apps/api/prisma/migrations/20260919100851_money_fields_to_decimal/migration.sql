-- Convert money/rate fields from double precision (Float) to exact numeric (Decimal)

-- Course
ALTER TABLE "Course" ALTER COLUMN "price" TYPE numeric(10,2) USING "price"::numeric(10,2);
ALTER TABLE "Course" ALTER COLUMN "originalPrice" TYPE numeric(10,2) USING "originalPrice"::numeric(10,2);
ALTER TABLE "Course" ALTER COLUMN "priceUsd" TYPE numeric(10,2) USING "priceUsd"::numeric(10,2);
ALTER TABLE "Course" ALTER COLUMN "originalPriceUsd" TYPE numeric(10,2) USING "originalPriceUsd"::numeric(10,2);

-- Enrollment
ALTER TABLE "Enrollment" ALTER COLUMN "amountPaid" TYPE numeric(10,2) USING "amountPaid"::numeric(10,2);

-- RevenueLedger
ALTER TABLE "RevenueLedger" ALTER COLUMN "gross" TYPE numeric(10,2) USING "gross"::numeric(10,2);
ALTER TABLE "RevenueLedger" ALTER COLUMN "platformCut" TYPE numeric(10,2) USING "platformCut"::numeric(10,2);
ALTER TABLE "RevenueLedger" ALTER COLUMN "trainerShare" TYPE numeric(10,2) USING "trainerShare"::numeric(10,2);

-- Payout
ALTER TABLE "Payout" ALTER COLUMN "amount" TYPE numeric(10,2) USING "amount"::numeric(10,2);

-- Coupon
ALTER TABLE "Coupon" ALTER COLUMN "value" TYPE numeric(10,2) USING "value"::numeric(10,2);
ALTER TABLE "Coupon" ALTER COLUMN "minOrderAmount" TYPE numeric(10,2) USING "minOrderAmount"::numeric(10,2);

-- Order
ALTER TABLE "Order" ALTER COLUMN "subtotal" TYPE numeric(10,2) USING "subtotal"::numeric(10,2);
ALTER TABLE "Order" ALTER COLUMN "discountAmount" TYPE numeric(10,2) USING "discountAmount"::numeric(10,2);
ALTER TABLE "Order" ALTER COLUMN "gstPercent" TYPE numeric(10,4) USING "gstPercent"::numeric(10,4);
ALTER TABLE "Order" ALTER COLUMN "gstAmount" TYPE numeric(10,2) USING "gstAmount"::numeric(10,2);
ALTER TABLE "Order" ALTER COLUMN "totalAmount" TYPE numeric(10,2) USING "totalAmount"::numeric(10,2);

-- OrderItem
ALTER TABLE "OrderItem" ALTER COLUMN "priceAtPurchase" TYPE numeric(10,2) USING "priceAtPurchase"::numeric(10,2);

-- PaymentSettings
ALTER TABLE "PaymentSettings" ALTER COLUMN "gstPercent" TYPE numeric(10,4) USING "gstPercent"::numeric(10,4);
ALTER TABLE "PaymentSettings" ALTER COLUMN "gstPercentUsd" TYPE numeric(10,4) USING "gstPercentUsd"::numeric(10,4);
ALTER TABLE "PaymentSettings" ALTER COLUMN "usdRate" TYPE numeric(10,4) USING "usdRate"::numeric(10,4);

-- Lead
ALTER TABLE "Lead" ALTER COLUMN "budget" TYPE numeric(10,2) USING "budget"::numeric(10,2);

-- Project
ALTER TABLE "Project" ALTER COLUMN "price" TYPE numeric(10,2) USING "price"::numeric(10,2);
ALTER TABLE "Project" ALTER COLUMN "originalPrice" TYPE numeric(10,2) USING "originalPrice"::numeric(10,2);
ALTER TABLE "Project" ALTER COLUMN "priceUsd" TYPE numeric(10,2) USING "priceUsd"::numeric(10,2);
ALTER TABLE "Project" ALTER COLUMN "originalPriceUsd" TYPE numeric(10,2) USING "originalPriceUsd"::numeric(10,2);

-- SalesTarget
ALTER TABLE "SalesTarget" ALTER COLUMN "targetAmount" TYPE numeric(10,2) USING "targetAmount"::numeric(10,2);
ALTER TABLE "SalesTarget" ALTER COLUMN "currentAmount" TYPE numeric(10,2) USING "currentAmount"::numeric(10,2);

-- Invoice
ALTER TABLE "Invoice" ALTER COLUMN "subtotal" TYPE numeric(10,2) USING "subtotal"::numeric(10,2);
ALTER TABLE "Invoice" ALTER COLUMN "gstPercent" TYPE numeric(10,4) USING "gstPercent"::numeric(10,4);
ALTER TABLE "Invoice" ALTER COLUMN "gstAmount" TYPE numeric(10,2) USING "gstAmount"::numeric(10,2);
ALTER TABLE "Invoice" ALTER COLUMN "discountAmount" TYPE numeric(10,2) USING "discountAmount"::numeric(10,2);
ALTER TABLE "Invoice" ALTER COLUMN "totalAmount" TYPE numeric(10,2) USING "totalAmount"::numeric(10,2);

-- Refund
ALTER TABLE "Refund" ALTER COLUMN "amount" TYPE numeric(10,2) USING "amount"::numeric(10,2);
