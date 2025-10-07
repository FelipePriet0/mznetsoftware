-- Clean demo/test data from applications table for CEO presentation
DELETE FROM applications_drafts;
DELETE FROM references_personal WHERE application_id IN (SELECT id FROM applications);
DELETE FROM spouse WHERE application_id IN (SELECT id FROM applications);
DELETE FROM household WHERE application_id IN (SELECT id FROM applications);
DELETE FROM employment WHERE application_id IN (SELECT id FROM applications);
DELETE FROM application_address WHERE application_id IN (SELECT id FROM applications);
DELETE FROM attachments WHERE application_id IN (SELECT id FROM applications);
DELETE FROM appointments WHERE application_id IN (SELECT id FROM applications);
DELETE FROM applications;
DELETE FROM customers;