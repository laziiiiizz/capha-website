-- Run this in Supabase SQL Editor after creating your project

-- Team Members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'founder'
    CHECK (category IN ('founder','co-founder','academic-director','advisor','ambassador-coordinator','ambassador')),
  bio TEXT DEFAULT '',
  email TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  booking_eligible BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  description TEXT DEFAULT '',
  zoom_link TEXT DEFAULT '',
  meeting_id TEXT DEFAULT '',
  type TEXT DEFAULT 'zoom' CHECK (type IN ('zoom','mentorship','other')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site content table (key-value for editable text)
CREATE TABLE IF NOT EXISTS site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section, key)
);

-- Resource career-path steps (editable per healthcare track)
CREATE TABLE IF NOT EXISTS resource_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track TEXT NOT NULL
    CHECK (track IN ('medicine','dentistry','optometry','pa','nursing','pharmacy','physicaltherapy','publichealth')),
  title TEXT NOT NULL DEFAULT '',
  detail TEXT DEFAULT '',
  link_label TEXT DEFAULT '',
  link_href TEXT DEFAULT '',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level security: public can read everything
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read team_members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Auth write team_members" ON team_members FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read events" ON events FOR SELECT USING (is_active = true);
CREATE POLICY "Auth write events" ON events FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read site_content" ON site_content FOR SELECT USING (true);
CREATE POLICY "Auth write site_content" ON site_content FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read resource_steps" ON resource_steps FOR SELECT USING (true);
CREATE POLICY "Auth write resource_steps" ON resource_steps FOR ALL USING (auth.role() = 'authenticated');

-- Storage bucket for team photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-photos', 'team-photos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Public read team-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'team-photos');

CREATE POLICY "Auth upload team-photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'team-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Auth delete team-photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'team-photos' AND auth.role() = 'authenticated');

-- Seed default site content
INSERT INTO site_content (section, key, value) VALUES
  ('hero', 'headline', 'Supporting Future Central Asian Healthcare Leaders'),
  ('hero', 'subtext', 'CAPHA is a student-led organization dedicated to supporting Central Asian students in the U.S. who aspire to careers in healthcare. Through mentorship, workshops, and leadership opportunities, we foster academic and professional growth.'),
  ('hero', 'member_count', '95'),
  ('hero', 'events_count', '20'),
  ('hero', 'universities_count', '8'),
  ('events', 'intro', 'Stay connected with CAPHA! Join our upcoming virtual events, workshops, and mentorship sessions to grow your pre-health journey.'),
  ('contact', 'email', 'capha0925@gmail.com'),
  ('contact', 'instagram', 'https://www.instagram.com/capha_25?igsh=MTh3aXE4dW82YnU4dw=='),
  ('contact', 'linkedin', 'https://www.linkedin.com/company/central-asian-pre-health-association'),
  ('hero', 'about_text', E'CAPHA — the Central Asian Pre-Health Association — was founded to fill a gap that too many Central Asian students face when pursuing healthcare in the United States: limited access to mentors who understand their background, their academic path, and the challenges of navigating a new system far from home.\n\nWe bring together pre-medical, pre-dental, pre-PA, pre-optometry, nursing, pharmacy, and public health students from universities across the country. Through monthly virtual workshops, healthcare professionals share their journeys and offer the kind of insight that comes only from experience. Our one-on-one mentorship program connects students directly with current healthcare students who have walked the same road.\n\nWe believe access to guidance should not depend on who you happen to know. CAPHA exists to change that — one student, one session, one community at a time.'),
  ('footer', 'copyright', 'Central Asian Pre-Health Association. All Rights Reserved.')
ON CONFLICT (section, key) DO NOTHING;

-- Seed initial events
INSERT INTO events (title, date, time, description, zoom_link, meeting_id, type) VALUES
  ('Zoom Sessions', 'March 7th', 'EST 11:00 AM',
   'Join our monthly Zoom sessions where healthcare professionals share their journeys and advice for aspiring students.',
   'https://syracuseuniversity.zoom.us/j/9663439551', '966 343 9551', 'zoom'),
  ('CAPHA Mentorship', 'Ongoing', 'One-on-One',
   'Receive one-on-one academic and career guidance from experienced healthcare students and professionals.',
   '', '', 'mentorship')
ON CONFLICT DO NOTHING;
