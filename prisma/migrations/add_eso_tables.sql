-- ESOs table
CREATE TABLE IF NOT EXISTS esos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    lotOfOperation TEXT NOT NULL,
    isActive BOOLEAN DEFAULT true,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    esoId INTEGER NOT NULL,
    isActive BOOLEAN DEFAULT true,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (esoId) REFERENCES esos(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_esos_name ON esos(name);
CREATE INDEX IF NOT EXISTS idx_contacts_eso_id ON contacts(esoId);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);