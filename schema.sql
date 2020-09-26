CREATE TABLE bins (
  id serial PRIMARY KEY,
  name text UNIQUE,
  path_name text
);
CREATE TABLE events (
  id serial PRIMARY KEY,
  bin_id integer NOT NULL REFERENCES bins (id),
  doc_id text
);