# Clone of Request Bin

Hosted at http://142.93.151.31/ on a Digital Ocean VPS

### Infrastructure

- Nginx reverse proxy handles all incoming requests
- Mongo Database captures the event payloads
- Postgres Database captures the bin information and the event relational data


### Use

- Navigate to `/` for instructions
- GET `/bins` will show all current bins
- GET `/:bin_path` will return all event payloads sent to the `bin_path`

- POST `/bins` `{ name: 'test' }` will create a bin named `test` and return the path for that bin
- POST `/:bin_path` `{ payload: 'test' }` will save the payload to the MongoDB and associate the event ID with the corresponding bin in Postgres
