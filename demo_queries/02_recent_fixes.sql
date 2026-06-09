-- 1. Changed all 'Pending' requests to 'Broadcast' so they show up on the driver console
UPDATE emergency_requests 
SET status = 'Broadcast' 
WHERE status = 'Pending';

-- 2. Inserted a test feedback for Trip 1 to verify the rating system
INSERT INTO Trip_Feedback (Trip_ID, Rating, Comments) 
VALUES ('1', 4, 'Nice trip')
ON CONFLICT (Trip_ID) DO UPDATE 
SET Rating = EXCLUDED.Rating, Comments = EXCLUDED.Comments;

-- 3. Note: The Billing seed script was created separately as seed_billing.mjs
