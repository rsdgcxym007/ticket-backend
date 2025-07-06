# 🎫 Standing Tickets Database Persistence Test

## Issue Fixed
The problem was that `standingAdultQty`, `standingChildQty`, `standingTotal`, and `standingCommission` fields were being calculated correctly in the API response but were NOT being saved to the database.

## Root Cause
In the `createOrder` method, the standing ticket logic was being executed AFTER the order was already saved to the database. The fields were being set on the order object but not persisted.

## Solution Applied
1. **Moved standing ticket logic BEFORE saving**: The standing ticket calculations now happen before the order is created and saved.
2. **Updated order data preparation**: All standing ticket fields are now included in the `orderData` object before creating the order entity.
3. **Fixed field persistence**: The fields are now properly saved to the database on the initial save operation.
4. **Updated response mapping**: The `mapToOrderData` method now includes all standing ticket fields.
5. **Updated interface**: Added standing ticket fields to the `OrderData` interface.

## Changes Made

### 1. Order Service (`src/order/order.service.ts`)
- Moved standing ticket calculations before order creation
- Added standing ticket fields to `orderData` before saving
- Updated audit logging to include standing ticket information
- Fixed the `mapToOrderData` method to include standing ticket fields

### 2. Order Data Interface (`src/common/interfaces/index.ts`)
- Added `standingAdultQty?: number`
- Added `standingChildQty?: number`
- Added `standingTotal?: number`
- Added `standingCommission?: number`

## Test Case
```json
{
  "ticketType": "STANDING",
  "standingAdultQty": 2,
  "standingChildQty": 1,
  "showDate": "2023-12-01",
  "customerName": "John Doe",
  "customerPhone": "0812345678",
  "customerEmail": "john.doe@example.com",
  "paymentMethod": "CREDIT_CARD",
  "note": "ต้องการตั๋วใกล้เวที",
  "referrerCode": "FRESHYTOUR",
  "source": "OTHER"
}
```

## Expected Result
- `standingAdultQty`: 2 (saved to DB)
- `standingChildQty`: 1 (saved to DB)
- `standingTotal`: 4200 (2 × 1500 + 1 × 1200) (saved to DB)
- `standingCommission`: 800 (2 × 300 + 1 × 200) (saved to DB)
- `quantity`: 3 (2 + 1)
- `totalAmount`: 4200

## Verification Steps
1. Create a standing ticket order using the API
2. Check the API response - should show all calculated fields
3. Check the database directly - all standing ticket fields should be persisted
4. Verify the commission calculation is correct

## Commission Calculation
- Standing Adult: 300 baht per ticket
- Standing Child: 200 baht per ticket
- Total Commission: (2 × 300) + (1 × 200) = 600 + 200 = 800 baht

## Database Fields Now Persisted
- `standingAdultQty`: Number of adult standing tickets
- `standingChildQty`: Number of child standing tickets  
- `standingTotal`: Total amount for standing tickets
- `standingCommission`: Commission amount for standing tickets
- `quantity`: Total quantity (adult + child)
- `totalAmount`: Total order amount

All these fields are now properly saved to the database during order creation.
