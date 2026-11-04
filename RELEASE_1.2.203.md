# ZannyChat frontend release 1.2.203 / backend 1.2.52

## Delivery receipt privacy hardening

This release pairs the frontend source with backend migration `0054_delivery_receipt_visibility.sql`. Receipt visibility is narrowed: users can see their own receipt rows, while message senders can see recipients' delivery receipts for their messages. Other conversation participants no longer gain access to all receipt identities merely because they belong to the same conversation.

## Deployment order

1. Apply backend migration `0054_delivery_receipt_visibility.sql` to Supabase.
2. Deploy backend release 1.2.52 and frontend release 1.2.203.
3. Verify with three accounts in a group: sender can see delivery receipts for their own message; each recipient can see their own receipt; a third participant cannot enumerate receipts for another sender's message.

No live database migration or production deployment is performed by this source package.
