-- Zusätzliche Felder für die automatische Site-Generierung.
-- Im Supabase SQL Editor ausführen.

ALTER TABLE orders
  -- Strukturierte Speisekarte: [{ name, price, desc?, category? }]
  ADD COLUMN IF NOT EXISTS menu_items jsonb,
  -- Gewählter Stil für die automatisch generierten Texte
  ADD COLUMN IF NOT EXISTS tone text DEFAULT 'herzlich';
