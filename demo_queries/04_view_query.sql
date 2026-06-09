-- Select from the materialized view for analytics
SELECT * FROM emergency_analytics_mv;

-- Select from the active dashboard view
SELECT * FROM active_dashboard_view LIMIT 10;
