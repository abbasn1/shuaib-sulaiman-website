-- Removes the temporary HTTP extension used only for the Auth smoke-test attempt; production schema returns to its prior extension set.
drop extension if exists http cascade;
