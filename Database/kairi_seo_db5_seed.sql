-- -------------------------------------------------------------------------
-- PART 3: INITIALIZATION & SEED DATA
-- -------------------------------------------------------------------------

-- Seed initial master administrative profile (Default Password: adminPassword123)
INSERT INTO users (username, password_hash, full_name, user_role) 
VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin');

-- Seed target tenant websites registry
INSERT INTO domains (id, site_name, site_url) VALUES 
(1, 'Kairi Travels Main', 'kairitravels.com'),
(2, 'Kairi Tours', 'kairitours.com'),
(3, 'Rhino Tourist Camp', 'rhinotouristcamp.com'),
(4, 'Rhino Luxury Camp', 'rhinoluxurycamp.com'),
(5, 'Kairi Travels KE', 'kairi.co.ke');

-- Seed Data Set A: Green Book Phrases
INSERT INTO tenant_keywords (domain_id, book_category, keyword_phrase) VALUES
(1, 'green', '3 Days Masai Mara Safari'),
(1, 'green', 'Masai Mara Group Joining Safari'),
(1, 'green', 'Masai Mara Safari Package'),
(1, 'green', 'Budget Safari Kenya'),
(1, 'green', 'Mid-range and Luxury Safari Kenya'),
(1, 'green', 'Kenya Safari Holiday'),
(1, 'green', 'Luxury Kenya Safari Package'),
(1, 'green', 'Wildlife Safari Adventure'),
(1, 'green', 'Birdwatching Safari'),
(1, 'green', 'Masai Mara Great Migration'),

(2, 'green', '3-Days Masai Mara Safari'),
(2, 'green', '4-Days Masai Mara and L. Nakuru'),
(2, 'green', 'Great Wildebeest Migration Safari'),
(2, 'green', 'Luxury Masai Mara Safari'),
(2, 'green', 'Affordable Group Safari Kenya'),
(2, 'green', 'Family Safari Packages Kenya'),
(2, 'green', 'Kenya Big Five Safari Packages'),
(2, 'green', 'Affordable Masai Mara Safari Pkg'),
(2, 'green', 'Best Kenya Safari Packages'),
(2, 'green', 'East Africa Safari Tours'),

(5, 'green', '3 days Masai Mara Safari'),
(5, 'green', '4 days Masai Mara and L.Nakuru'),
(5, 'green', 'Great Wildebeest Migration safari kenya'),
(5, 'green', 'Luxury Masai Mara Safari'),
(5, 'green', 'Affordable Group Safari kenya'),
(5, 'green', 'Family Safari Packages Kenya'),
(5, 'green', 'Kenya Big Five Safari Packages'),
(5, 'green', 'Affordable Masai Mara Safari Packages'),
(5, 'green', 'Best Kenya Safari Packages'),
(5, 'green', 'East Africa Safari Tours');

-- Seed Data Set B: Black Book Phrases
INSERT INTO tenant_keywords (domain_id, book_category, keyword_phrase) VALUES
(3, 'black', 'Group Joining Masai Mara Accommodation'),
(3, 'black', 'Safari Camp Near Masai Mara'),
(3, 'black', 'Safari Budget Camp in Masai Mara'),
(3, 'black', '3-Day Budget Camping Safari'),
(3, 'black', 'Best Budget Camp in Masai Mara'),
(3, 'black', 'Spacious Safari Camps in Masai Mara'),
(3, 'black', 'Budget Accommodation in Masai Mara'),
(3, 'black', 'Masai Mara Budget Tented Camps'),
(3, 'black', 'Tented Camps Accommodation'),
(3, 'black', 'Where to stay in Masai Mara'),

(4, 'black', 'Group Joining Masai Mara Accommodation'),
(4, 'black', 'Safari Camp Near Masai Mara'),
(4, 'black', 'Safari Budget Camp in Masai Mara'),
(4, 'black', '3-Day Budget Camping Safari'),
(4, 'black', 'Best Safari Camp in Masai Mara'),
(4, 'black', 'Spacious Safari Camps in Masai Mara'),
(4, 'black', 'Budget Accommodation in Masai Mara'),
(4, 'black', 'Masai Mara Budget Tented Camps'),
(4, 'black', 'Tented Camps Accommodation'),
(4, 'black', 'Where to stay in Masai Mara');