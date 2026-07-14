-- Production demo seed for the explicitly designated test account.
-- The transaction is deliberately single-use: it aborts before changing data
-- if either the target account or the dedicated demo website is unexpected.

BEGIN;

CREATE TEMP TABLE demo_scope AS
SELECT user_id, tenant_id
FROM "user"
WHERE lower(username) = 'test@test.com';

DO $$
BEGIN
  IF (SELECT count(*) FROM demo_scope) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one test@test.com user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM website w
    JOIN demo_scope s ON s.user_id = w.user_id
    WHERE w.name = 'Amami Docs Growth Demo' AND w.domain = 'docs.amami.dev'
  ) THEN
    RAISE EXCEPTION 'Amami Docs Growth Demo already exists for test@test.com';
  END IF;
END $$;

CREATE TEMP TABLE demo_site AS
WITH created AS (
  INSERT INTO website (
    website_id, tenant_id, user_id, created_by, name, domain, recorder_enabled, replay_config
  )
  SELECT
    gen_random_uuid(), tenant_id, user_id, user_id,
    'Amami Docs Growth Demo', 'docs.amami.dev', false, '{"maskAllInputs":true}'::jsonb
  FROM demo_scope
  RETURNING website_id
)
SELECT website_id FROM created;

CREATE TEMP TABLE demo_sessions AS
WITH day_counts AS (
  SELECT
    day::date AS day,
    ordinal AS day_index,
    75 + ordinal * 5 + floor(random() * 35)::int AS session_count
  FROM generate_series(current_date - 89, current_date, interval '1 day') WITH ORDINALITY g(day, ordinal)
)
SELECT
  gen_random_uuid() AS session_id,
  gen_random_uuid() AS visit_id,
  ds.website_id,
  dc.day + interval '8 hours' + random() * interval '12 hours' AS created_at,
  dc.day_index * 10000 + gs.n AS seq,
  CASE (dc.day_index * 10000 + gs.n) % 5
    WHEN 0 THEN 'Chrome' WHEN 1 THEN 'Safari' WHEN 2 THEN 'Firefox'
    WHEN 3 THEN 'Edge' ELSE 'Mobile Safari'
  END AS browser,
  CASE (dc.day_index * 10000 + gs.n) % 5
    WHEN 0 THEN 'Windows' WHEN 1 THEN 'Mac OS' WHEN 2 THEN 'iOS'
    WHEN 3 THEN 'Android' ELSE 'Linux'
  END AS os,
  CASE WHEN (dc.day_index * 10000 + gs.n) % 4 = 0 THEN 'mobile' ELSE 'desktop' END AS device,
  CASE WHEN (dc.day_index * 10000 + gs.n) % 4 = 0 THEN '390x844' ELSE '1440x900' END AS screen,
  CASE WHEN (dc.day_index * 10000 + gs.n) % 6 = 0 THEN 'zh-CN' ELSE 'en-US' END AS language,
  CASE (dc.day_index * 10000 + gs.n) % 8
    WHEN 0 THEN 'CN' WHEN 1 THEN 'US' WHEN 2 THEN 'GB' WHEN 3 THEN 'DE'
    WHEN 4 THEN 'SG' WHEN 5 THEN 'JP' WHEN 6 THEN 'CA' ELSE 'AU'
  END AS country,
  CASE (dc.day_index * 10000 + gs.n) % 8
    WHEN 0 THEN 'Shanghai' WHEN 1 THEN 'California' WHEN 2 THEN 'England' WHEN 3 THEN 'Berlin'
    WHEN 4 THEN 'Singapore' WHEN 5 THEN 'Tokyo' WHEN 6 THEN 'Ontario' ELSE 'New South Wales'
  END AS region,
  CASE (dc.day_index * 10000 + gs.n) % 8
    WHEN 0 THEN 'Shanghai' WHEN 1 THEN 'San Francisco' WHEN 2 THEN 'London' WHEN 3 THEN 'Berlin'
    WHEN 4 THEN 'Singapore' WHEN 5 THEN 'Tokyo' WHEN 6 THEN 'Toronto' ELSE 'Sydney'
  END AS city
FROM day_counts dc
CROSS JOIN LATERAL generate_series(1, dc.session_count) AS gs(n)
CROSS JOIN demo_site ds;

-- Keep the Realtime view populated during a customer demonstration.
INSERT INTO demo_sessions
SELECT
  gen_random_uuid(), gen_random_uuid(), website_id,
  now() - (gs.n * interval '47 seconds'), 900000 + gs.n,
  CASE gs.n % 3 WHEN 0 THEN 'Chrome' WHEN 1 THEN 'Safari' ELSE 'Mobile Safari' END,
  CASE gs.n % 3 WHEN 0 THEN 'Windows' WHEN 1 THEN 'Mac OS' ELSE 'iOS' END,
  CASE WHEN gs.n % 3 = 2 THEN 'mobile' ELSE 'desktop' END,
  CASE WHEN gs.n % 3 = 2 THEN '390x844' ELSE '1440x900' END,
  CASE WHEN gs.n % 4 = 0 THEN 'zh-CN' ELSE 'en-US' END,
  CASE gs.n % 4 WHEN 0 THEN 'CN' WHEN 1 THEN 'US' WHEN 2 THEN 'SG' ELSE 'GB' END,
  CASE gs.n % 4 WHEN 0 THEN 'Shanghai' WHEN 1 THEN 'California' WHEN 2 THEN 'Singapore' ELSE 'England' END,
  CASE gs.n % 4 WHEN 0 THEN 'Shanghai' WHEN 1 THEN 'San Francisco' WHEN 2 THEN 'Singapore' ELSE 'London' END
FROM demo_site CROSS JOIN generate_series(1, 30) AS gs(n);

INSERT INTO session (
  session_id, website_id, browser, os, device, screen, language, country, region, city, distinct_id, created_at
)
SELECT
  session_id, website_id, browser, os, device, screen, language, country, region, city,
  'docs-demo-' || lpad(seq::text, 7, '0'), created_at
FROM demo_sessions;

INSERT INTO session_data (
  session_data_id, website_id, session_id, data_key, string_value, number_value, date_value, data_type, created_at
)
SELECT gen_random_uuid(), website_id, session_id, 'visitor_type',
  CASE WHEN seq % 5 = 0 THEN 'returning' ELSE 'new' END, NULL::numeric, NULL::timestamptz, 1, created_at
FROM demo_sessions
UNION ALL
SELECT gen_random_uuid(), website_id, session_id, 'company_size',
  CASE seq % 4 WHEN 0 THEN '1-10' WHEN 1 THEN '11-50' WHEN 2 THEN '51-200' ELSE '200+' END,
  NULL::numeric, NULL::timestamptz, 1, created_at
FROM demo_sessions;

CREATE TEMP TABLE demo_pageviews AS
SELECT
  gen_random_uuid() AS event_id,
  s.website_id,
  s.session_id,
  s.visit_id,
  s.seq,
  p.page_no,
  CASE (s.seq + p.page_no) % 14
    WHEN 0 THEN '/' WHEN 1 THEN '/docs/getting-started' WHEN 2 THEN '/docs/installation'
    WHEN 3 THEN '/docs/tracking-script' WHEN 4 THEN '/docs/api-reference'
    WHEN 5 THEN '/docs/integrations' WHEN 6 THEN '/docs/ai-analysis'
    WHEN 7 THEN '/blog/introducing-amami' WHEN 8 THEN '/blog/privacy-first-analytics'
    WHEN 9 THEN '/pricing' WHEN 10 THEN '/features' WHEN 11 THEN '/changelog'
    WHEN 12 THEN '/docs/faq' ELSE '/contact'
  END AS url_path,
  s.created_at + (p.page_no * 40 + s.seq % 45) * interval '1 second' AS created_at,
  CASE (s.seq + p.page_no) % 14
    WHEN 0 THEN 'Amami Documentation' WHEN 1 THEN 'Getting Started | Amami Docs'
    WHEN 2 THEN 'Installation | Amami Docs' WHEN 3 THEN 'Tracking Script | Amami Docs'
    WHEN 4 THEN 'API Reference | Amami Docs' WHEN 5 THEN 'Integrations | Amami Docs'
    WHEN 6 THEN 'AI Analysis | Amami Docs' WHEN 7 THEN 'Introducing Amami'
    WHEN 8 THEN 'Privacy-First Analytics' WHEN 9 THEN 'Pricing | Amami'
    WHEN 10 THEN 'Features | Amami' WHEN 11 THEN 'Changelog | Amami'
    WHEN 12 THEN 'FAQ | Amami Docs' ELSE 'Contact | Amami'
  END AS page_title
FROM demo_sessions s
CROSS JOIN LATERAL generate_series(1, 1 + s.seq % 4) AS p(page_no);

INSERT INTO website_event (
  event_id, website_id, session_id, visit_id, created_at, url_path, url_query,
  referrer_domain, referrer_path, page_title, event_type, hostname,
  utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  gclid, fbclid, tag, lcp, inp, cls, fcp, ttfb
)
SELECT
  event_id, website_id, session_id, visit_id, created_at, url_path,
  CASE WHEN page_no = 1 AND seq % 5 = 0 THEN 'utm_source=google&utm_medium=organic' ELSE NULL END,
  CASE WHEN page_no = 1 THEN CASE seq % 7
    WHEN 0 THEN 'google.com' WHEN 1 THEN 'github.com' WHEN 2 THEN 'linkedin.com'
    WHEN 3 THEN 'news.ycombinator.com' WHEN 4 THEN 'twitter.com' WHEN 5 THEN 'producthunt.com' ELSE NULL END
  ELSE NULL END,
  CASE WHEN page_no = 1 THEN '/' ELSE NULL END, page_title, 1, 'docs.amami.dev',
  CASE WHEN page_no = 1 THEN CASE seq % 6 WHEN 0 THEN 'google' WHEN 1 THEN 'github' WHEN 2 THEN 'linkedin' WHEN 3 THEN 'newsletter' WHEN 4 THEN 'producthunt' ELSE NULL END ELSE NULL END,
  CASE WHEN page_no = 1 THEN CASE seq % 6 WHEN 0 THEN 'organic' WHEN 1 THEN 'referral' WHEN 2 THEN 'social' WHEN 3 THEN 'email' WHEN 4 THEN 'referral' ELSE NULL END ELSE NULL END,
  CASE WHEN page_no = 1 THEN CASE seq % 4 WHEN 0 THEN 'docs-growth-q3' WHEN 1 THEN 'developer-community' WHEN 2 THEN 'privacy-launch' ELSE NULL END ELSE NULL END,
  CASE WHEN page_no = 1 THEN CASE seq % 3 WHEN 0 THEN 'hero-banner' WHEN 1 THEN 'docs-cta' ELSE NULL END ELSE NULL END,
  CASE WHEN page_no = 1 AND seq % 6 = 0 THEN 'privacy analytics' ELSE NULL END,
  CASE WHEN page_no = 1 AND seq % 9 = 0 THEN 'demo-gclid-' || seq ELSE NULL END,
  CASE WHEN page_no = 1 AND seq % 11 = 0 THEN 'demo-fbclid-' || seq ELSE NULL END,
  CASE WHEN seq % 3 = 0 THEN 'docs' ELSE 'marketing' END,
  round((1200 + random() * 1800)::numeric, 1), round((70 + random() * 180)::numeric, 1),
  round((random() * 0.12)::numeric, 4), round((650 + random() * 900)::numeric, 1), round((120 + random() * 280)::numeric, 1)
FROM demo_pageviews;

CREATE TEMP TABLE demo_custom_events AS
SELECT gen_random_uuid() AS event_id, website_id, session_id, visit_id, created_at + interval '75 seconds' AS created_at,
  '/docs/getting-started' AS url_path, 'docs_search' AS event_name, seq
FROM demo_sessions WHERE seq % 5 = 0
UNION ALL
SELECT gen_random_uuid(), website_id, session_id, visit_id, created_at + interval '110 seconds',
  '/docs/getting-started', 'quickstart_download', seq FROM demo_sessions WHERE seq % 9 = 0
UNION ALL
SELECT gen_random_uuid(), website_id, session_id, visit_id, created_at + interval '145 seconds',
  '/pricing', 'signup_started', seq FROM demo_sessions WHERE seq % 13 = 0
UNION ALL
SELECT gen_random_uuid(), website_id, session_id, visit_id, created_at + interval '190 seconds',
  '/signup', 'signup_completed', seq FROM demo_sessions WHERE seq % 29 = 0
UNION ALL
SELECT gen_random_uuid(), website_id, session_id, visit_id, created_at + interval '155 seconds',
  '/contact', 'demo_requested', seq FROM demo_sessions WHERE seq % 37 = 0
UNION ALL
SELECT gen_random_uuid(), website_id, session_id, visit_id, created_at + interval '225 seconds',
  '/signup', 'purchase', seq FROM demo_sessions WHERE seq % 71 = 0;

INSERT INTO website_event (
  event_id, website_id, session_id, visit_id, created_at, url_path, page_title, event_type, event_name, hostname, tag
)
SELECT event_id, website_id, session_id, visit_id, created_at, url_path,
  CASE url_path WHEN '/pricing' THEN 'Pricing | Amami' WHEN '/signup' THEN 'Create your Amami account' WHEN '/contact' THEN 'Contact | Amami' ELSE 'Getting Started | Amami Docs' END,
  2, event_name, 'docs.amami.dev', 'conversion'
FROM demo_custom_events;

INSERT INTO event_data (
  event_data_id, website_id, website_event_id, data_key, string_value, number_value, date_value, data_type, created_at
)
SELECT gen_random_uuid(), website_id, event_id,
  CASE event_name WHEN 'docs_search' THEN 'search_term' WHEN 'quickstart_download' THEN 'asset' WHEN 'demo_requested' THEN 'company_size' WHEN 'purchase' THEN 'plan' ELSE 'plan' END,
  CASE event_name
    WHEN 'docs_search' THEN CASE seq % 4 WHEN 0 THEN 'installation' WHEN 1 THEN 'tracking script' WHEN 2 THEN 'api key' ELSE 'integrations' END
    WHEN 'quickstart_download' THEN 'amami-quickstart.pdf'
    WHEN 'demo_requested' THEN CASE seq % 4 WHEN 0 THEN '1-10' WHEN 1 THEN '11-50' WHEN 2 THEN '51-200' ELSE '200+' END
    WHEN 'purchase' THEN CASE WHEN seq % 3 = 0 THEN 'team' ELSE 'pro' END
    ELSE CASE WHEN seq % 3 = 0 THEN 'team' ELSE 'pro' END
  END,
  NULL::numeric, NULL::timestamptz, 1, created_at
FROM demo_custom_events
UNION ALL
SELECT gen_random_uuid(), website_id, event_id, 'revenue', NULL,
  CASE WHEN seq % 3 = 0 THEN 249 ELSE 49 END, NULL::timestamptz, 2, created_at
FROM demo_custom_events WHERE event_name = 'purchase';

INSERT INTO revenue (revenue_id, website_id, session_id, event_id, event_name, currency, revenue, created_at)
SELECT gen_random_uuid(), website_id, session_id, event_id, event_name, 'USD',
  CASE WHEN seq % 3 = 0 THEN 249 ELSE 49 END, created_at
FROM demo_custom_events WHERE event_name = 'purchase';

INSERT INTO heatmap_event (
  heatmap_event_id, website_id, session_id, visit_id, url_path, event_type,
  x, y, page_x, page_y, page_w, viewport_w, viewport_h, page_h, scroll_pct, created_at
)
SELECT gen_random_uuid(), website_id, session_id, visit_id, url_path,
  CASE WHEN point.n = 1 THEN 1 ELSE 2 END,
  80 + (seq * point.n) % 920, 90 + (seq * point.n) % 620,
  80 + (seq * point.n) % 920, 90 + (seq * point.n) % 1400,
  1440, 1440, 900, 2400, 5 + (seq * point.n) % 90, created_at + point.n * interval '4 seconds'
FROM demo_pageviews CROSS JOIN LATERAL generate_series(1, 3) AS point(n)
WHERE seq % 11 = 0 AND url_path IN ('/', '/docs/getting-started', '/pricing');

INSERT INTO segment (segment_id, website_id, type, name, parameters)
SELECT gen_random_uuid(), website_id, item.type, item.name, item.parameters
FROM demo_site
CROSS JOIN LATERAL (
  VALUES
    ('segment', 'High-intent documentation readers', '{"filters":[{"name":"urlPath","operator":"s","value":"/docs"}],"match":"all","dateRange":"90day"}'::jsonb),
    ('segment', 'Returning product evaluators', '{"filters":[{"name":"visitor_type","operator":"eq","value":"returning"},{"name":"urlPath","operator":"c","value":"/pricing"}],"match":"any","dateRange":"90day"}'::jsonb),
    ('cohort', 'Signup cohort', '{"filters":[{"name":"event","operator":"eq","value":"signup_completed"}],"match":"all","dateRange":"90day","action":{"type":"event","value":"signup_completed"}}'::jsonb),
    ('cohort', 'Docs activation cohort', '{"filters":[{"name":"event","operator":"eq","value":"quickstart_download"}],"match":"all","dateRange":"90day","action":{"type":"event","value":"quickstart_download"}}'::jsonb)
) AS item(type, name, parameters);

INSERT INTO report (report_id, user_id, website_id, type, name, description, parameters)
SELECT gen_random_uuid(), scope.user_id, site.website_id, item.type, item.name, item.description, item.parameters
FROM demo_scope scope CROSS JOIN demo_site site
CROSS JOIN LATERAL (
  VALUES
    ('goal', 'Completed signups', 'Track the primary product conversion.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date, 'type', 'event', 'value', 'signup_completed')),
    ('funnel', 'Docs to signup funnel', 'Show documentation-driven activation.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date, 'window', 1800, 'steps', jsonb_build_array(jsonb_build_object('type','path','value','/docs/getting-started'), jsonb_build_object('type','event','value','docs_search'), jsonb_build_object('type','event','value','signup_started'), jsonb_build_object('type','event','value','signup_completed')))),
    ('journey', 'Developer documentation journeys', 'Reveal common navigation paths through the docs.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date, 'steps', 5, 'startStep', '/docs/getting-started', 'eventType', 1)),
    ('retention', 'Documentation retention', 'Measure returning documentation users.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date, 'timezone', 'Asia/Shanghai')),
    ('performance', 'Docs Core Web Vitals', 'Monitor performance across the documentation site.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date, 'unit', 'day', 'timezone', 'Asia/Shanghai', 'metric', 'lcp')),
    ('revenue', 'Subscription revenue', 'Attribute paid plan revenue to documentation activity.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date, 'unit', 'day', 'timezone', 'Asia/Shanghai', 'currency', 'USD', 'compare', 'prev')),
    ('attribution', 'Signup attribution', 'Compare first-touch channels for completed signups.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date, 'model', 'first-click', 'type', 'event', 'step', 'signup_completed', 'currency', 'USD')),
    ('utm', 'Campaign performance', 'Compare docs-growth acquisition campaigns.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date)),
    ('breakdown', 'Audience and content breakdown', 'Compare top pages, countries, referrers and devices.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date, 'fields', jsonb_build_array('urlPath','country','referrerDomain','browser','device'))),
    ('heatmap', 'Getting started heatmap', 'Inspect click and scroll engagement on the onboarding page.', jsonb_build_object('startDate', current_date - 89, 'endDate', current_date, 'urlPath', '/docs/getting-started', 'mode', 'click'))
) AS item(type, name, description, parameters);

SELECT
  (SELECT website_id FROM demo_site) AS website_id,
  (SELECT count(*) FROM demo_sessions) AS sessions,
  (SELECT count(*) FROM demo_pageviews) + (SELECT count(*) FROM demo_custom_events) AS events,
  (SELECT count(*) FROM demo_custom_events WHERE event_name = 'purchase') AS purchases,
  (SELECT count(*) FROM heatmap_event h JOIN demo_site s ON s.website_id = h.website_id) AS heatmap_events,
  (SELECT count(*) FROM report r JOIN demo_site s ON s.website_id = r.website_id) AS reports,
  (SELECT count(*) FROM segment sg JOIN demo_site s ON s.website_id = sg.website_id) AS segments;

\if :{?dry_run}
ROLLBACK;
\else
COMMIT;
\endif
