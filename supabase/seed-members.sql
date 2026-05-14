-- Run this in Supabase SQL Editor to seed all current CAPHA members
-- Safe to run multiple times (ON CONFLICT DO NOTHING)

INSERT INTO team_members (name, role, category, bio, email, photo_url, calendly_url, display_order) VALUES

-- ── Leadership ──
('Sevara Abduvalieva', 'Founder', 'founder',
 'Senior at Syracuse University majoring in Biotechnology with a foundation in Chemistry. Involved in plant microbiology research and various leadership roles. Passionate about medicine through hands-on patient experiences.',
 'abduvalievas36@gmail.com', '/images/sevara_founder.jpg', '', 1),

('Nilufar Sobirova', 'Co-Founder', 'co-founder',
 'Senior at Syracuse University majoring in Biology. Through clinical and patient care experiences, developed a strong passion for dentistry. From Samarkand, Uzbekistan.',
 'nilufars184@gmail.com', '/images/Co-Founder.jpeg', '', 2),

('Shahina Alibekova', 'Co-Founder', 'co-founder',
 'Junior at Syracuse University studying Biotechnology and Neuroscience. Actively involved in mentorship programs, molecular cell biology research, and hospital patient care.',
 'shahina.alibekova@gmail.com', '/images/shahinaCoFounder.jpeg', '', 3),

('Khurshida Rakhmatova', 'Co-Founder', 'co-founder',
 'Freshman at Syracuse University majoring in Biology, pursuing dentistry. Originally from Samarkand, Uzbekistan. Passionate about continuous learning and community involvement.',
 'khurshidarakhmatova06@gmail.com', '/images/khurshida.jpg', '', 4),

('Anvarjon Nematov', 'Academic Director', 'academic-director',
 'Senior at Penn State University on the pre-medical track with research experience in organic chemistry. Plans to pursue dermatology.',
 'anvarnematov234@gmail.com', '/images/Academic_director.jpg', '', 5),

-- ── Advisors ──
('Malika Alamova', 'Pre-Med Advisor', 'advisor',
 'Second-year medical student at SUNY Downstate. From Samarkand, Uzbekistan. Passionate about advocating for patients and serving underserved communities.',
 'malika.alamova@downstate.edu', '/images/Program_coordinator.png', 'https://calendly.com/malika-alamova27/30min', 6),

('Sabina Alamova', 'Pre-PA Advisor', 'advisor',
 'First-year PA student at SUNY Downstate. From Samarkand, Uzbekistan. Passionate about cultural competence and emotional support in medicine.',
 'sabina.alamova@downstate.edu', '/images/Recruiting_chair.PNG', 'https://calendly.com/sabinaacaspa/30min', 7),

('Mokhinur Sobirova', 'Pre-Optometry Advisor', 'advisor',
 'First-year optometry student at Drexel University. Biology graduate from Syracuse University. Conducted research at Upstate Medical University and shadowed multiple physicians.',
 'ns3635@drexel.edu', '/images/Mokhinur_advisor.jpeg', 'https://calendly.com/mokhinursobirova/30min', 8),

('Sabrina Muradova', 'Pre-Dental Advisor', 'advisor',
 'First-year dental student at Temple University. From Samarkand, Uzbekistan. Drawn to dentistry for its blend of creative, hands-on work and patient care.',
 'tum91581@temple.edu', '/images/sabrina_predental.jpg', 'https://calendly.com/tum91581-temple/30min', 9),

-- ── Ambassadors ──
('Marjona Mirzaeva', 'Ambassador Coordinator', 'ambassador-coordinator',
 'Attending Macaulay Honors College at CUNY Hunter College. Pre-med, working in a pancreatic cancer research lab and volunteering in the ER.',
 '', '/images/ambassador_marjona.png', '', 10),

('Islom Khayitov', 'Ambassador', 'ambassador',
 'Ohio University, majoring in Biology. Pre-med, pursuing MD with a specialty in Cardiothoracic surgery. Enjoys hiking, skiing, and reading.',
 '', '/images/ambassador_islom.jpg', '', 11),

('Madina Narboeva', 'Ambassador', 'ambassador',
 'Junior at Thomas Jefferson University majoring in Biotechnology pre-med. EMT experience. Actively involved in neuroscience research.',
 '', '/images/madina_ambassador.png', '', 12),

('Mehribon Karimova', 'Ambassador', 'ambassador',
 'Freshman at Penn State University majoring in Nursing. Aspires to become a Nurse Practitioner. Passionate about community support.',
 'mehribon001@gmail.com', '/images/Meh_Ambassador.jpeg', '', 13),

('Ramziddin Mukhiddinov', 'Ambassador', 'ambassador',
 'Freshman at Syracuse University pursuing Biochemistry. Involved in neurodegenerative disease research. From Brooklyn, New York.',
 'ramziddinmukhiddinov1407@gmail.com', '/images/ramzi_ambassador.png', '', 14);
