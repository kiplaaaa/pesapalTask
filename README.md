This is a RDBMS and is implemented in JavaScript. It supports table creation, CRUD operations, primary/unique keys, indexing, basic JOINs, and a simple REPL-style interface.

Features:-

1. Tables with column types: 
 INT and STRING supported
 Columns can be marked as PRIMARY or UNIQUE

2. CRUD operations:
 INSERT new rows
 SELECT with optional WHERE and JOIN
 UPDATE with optional WHERE
 DELETE with optional WHERE

3. Indexes:
Automatically created for PRIMARY and UNIQUE columns
Can query using SHOW INDEX FROM table_name

4. Joins
Basic INNER JOIN support
Column projection supported (select specific columns)

5. Interactive REPL
Run SQL queries directly in the browser

GETTING STARTED:
1. Clone the repo or copy index.html and db.js to your project folder.
 <Git clone 'repository link'>
2. Open index.html in your browser.
3. Use the text area to enter SQL commands and click Run.

SQL Supported syntax;

 1. CREATE TABLE users (id INT PRIMARY, Email STRING UNIQUE)
 2. INSERT INTO users VALUES (1, "giddy@gmail.com")
 3. SELECT * FROM users
      Output:
       ![alt text](<Screenshot (66).png>)
    SELECT Email FROM users;
    SELECT * FROM users WHERE id = 1;
    SELECT WITH JOIN:
     SELECT * FROM Table_1 JOIN Table_2 ON Table_1.id = Table_2.user_id;
 4. UPDATE users SET name = "Alice" WHERE id = 1;
 5. DELETE FROM users WHERE id = 1;
 6. SHOW INDEX FROM users;
   Output:
    ![alt text](<Screenshot (67).png>)

Example Workflow
Create tables
CREATE TABLE users (id INT PRIMARY, email STRING UNIQUE);
CREATE TABLE orders (id INT PRIMARY, user_id INT, product STRING);

Insert data
INSERT INTO users VALUES (1, "giddy@mail.com");
INSERT INTO users VALUES (2, "brenda@mail.com");
INSERT INTO orders VALUES (1, 1, "Book");
INSERT INTO orders VALUES (2, 1, "Pen");

Select with join
SELECT users.name, orders.product
FROM users JOIN orders ON users.id = orders.user_id;

Update a user
UPDATE users SET email = "g@gmail.com" WHERE id = 1;

Delete a user
DELETE FROM users WHERE id = 2;

Show indexes
SHOW INDEX FROM users;
![alt text](<Screenshot (68).png>)

Limitations:
 1. Only supports INT and STRING column types
 2. JOINs are basic inner joins only 
 3. Only one JOIN per SELECT query
 4. Column name collisions are possible during JOIN
 5. WHERE clauses only support = comparisons
 6. No support for LEFT JOIN, RIGHT JOIN, or complex logical operators yet