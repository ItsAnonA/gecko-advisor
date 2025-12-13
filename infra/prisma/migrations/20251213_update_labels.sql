-- Migration to update existing scan labels from old format to new format
-- Old: 'Safe', 'Caution', 'High Risk'
-- New: 'Low Privacy Risk', 'Moderate Privacy Risk', 'High Privacy Risk'

UPDATE "Scan" SET label = 'Low Privacy Risk' WHERE label = 'Safe';
UPDATE "Scan" SET label = 'Moderate Privacy Risk' WHERE label = 'Caution';
UPDATE "Scan" SET label = 'High Privacy Risk' WHERE label = 'High Risk';
