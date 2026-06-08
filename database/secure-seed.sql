DELETE FROM Staff_Users;
INSERT INTO Staff_Users (User_ID, Username, Password_Hash, Role)
VALUES 
  (1, 'admin', '$2b$10$WlbH1c/ao7sfkW6iSpx/3uBPsqaQN3ITp0sGGUnybm/UyWLruPXkS', 'Admin'),
  (2, 'dispatcher', '$2b$10$Mi1eOCDjkxxhjkAunjG3hOJC0L1QJdXmUOEKiOvBfUnDW.zHb7/Bu', 'Dispatcher');
