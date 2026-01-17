///TOKENS
function tokenize(input) {
  if (!input || !input.trim()) throw new Error("Empty SQL statement");

  return input
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/,/g, " , ")
    .replace(/;/g, "")
    .trim()
    .split(/\s+/)
    .map(t => t.replace(/^"|"$/g, ""));
}
//parser
function parse(tokens) {
  const cmd = tokens[0]?.toUpperCase();
  if (!cmd) throw new Error("Invalid SQL");

  switch (cmd) {
    case "CREATE": return parseCreate(tokens);
    case "INSERT": return parseInsert(tokens);
    case "SELECT": return parseSelect(tokens);
    case "UPDATE": return parseUpdate(tokens);
    case "DELETE": return parseDelete(tokens);
    case "SHOW": return parseShow(tokens);  // <- Add this line
    default:
      throw new Error(`Unsupported command: ${cmd}`);
  }
}

function parseShow(tokens) {
  if (tokens[1].toUpperCase() !== "INDEX") throw new Error("Expected INDEX");
  if (tokens[2].toUpperCase() !== "FROM") throw new Error("Expected FROM");
  const table = tokens[3];
  return { type: "SHOW_INDEX", table };
}

function parseCreate(tokens) {
  if (tokens[1] !== "TABLE") throw new Error("Expected TABLE");

  const table = tokens[2];
  const columns = [];
  let i = tokens.indexOf("(") + 1;

  while (tokens[i] !== ")") {
    const name = tokens[i++];
    const type = tokens[i++];

    let primary = false;
    let unique = false;

    while (tokens[i] && tokens[i] !== "," && tokens[i] !== ")") {
      if (tokens[i] === "PRIMARY") {
        primary = true;
        i++; // PRIMARY
      } else if (tokens[i] === "UNIQUE") {
        unique = true;
        i++;
      } else {
        // ⚠️ CRITICAL: move forward even if no modifier
        i++;
      }
    }

    columns.push({ name, type, primary, unique });

    if (tokens[i] === ",") i++;
  }

  return { type: "CREATE_TABLE", table, columns };
}


function parseInsert(tokens) {
  const table = tokens[2];
  const values = [];
  let i = tokens.indexOf("(") + 1;

  while (tokens[i] !== ")") {
    values.push(isNaN(tokens[i]) ? tokens[i] : Number(tokens[i]));
    i++;
    if (tokens[i] === ",") i++;
  }

  return { type: "INSERT", table, values };
}

function parseSelect(tokens) {
  const fromIdx = tokens.indexOf("FROM");
  if (fromIdx === -1) throw new Error("Missing FROM clause");

  const columns = tokens.slice(1, fromIdx);
  const table = tokens[fromIdx + 1];

  let where = null;
  let join = null;

  if (tokens.includes("JOIN")) {
    const j = tokens.indexOf("JOIN");
    join = {
      table: tokens[j + 1],
      left: tokens[j + 3].split("."),
      right: tokens[j + 5].split(".")
    };
  }

  if (tokens.includes("WHERE")) {
    const w = tokens.indexOf("WHERE");
    where = {
      column: tokens[w + 1],
      value: isNaN(tokens[w + 3]) ? tokens[w + 3] : Number(tokens[w + 3])
    };
  }

  return { type: "SELECT", table, columns, where, join };
}

function parseUpdate(tokens) {
  const table = tokens[1];
  const setIdx = tokens.indexOf("SET");
  if (setIdx === -1) throw new Error("Missing SET clause");

  const column = tokens[setIdx + 1];
  const value = isNaN(tokens[setIdx + 3])
    ? tokens[setIdx + 3]
    : Number(tokens[setIdx + 3]);

  let where = null;
  if (tokens.includes("WHERE")) {
    const w = tokens.indexOf("WHERE");
    where = {
      column: tokens[w + 1],
      value: Number(tokens[w + 3])
    };
  }

  return { type: "UPDATE", table, column, value, where };
}

function parseDelete(tokens) {
  const table = tokens[2];
  let where = null;

  if (tokens.includes("WHERE")) {
    const w = tokens.indexOf("WHERE");
    where = {
      column: tokens[w + 1],
      value: Number(tokens[w + 3])
    };
  }

  return { type: "DELETE", table, where };
}
//DATABASE
class Table {
  constructor(name, columns) {
    this.name = name;
    this.columns = columns;
    this.rows = [];
    this.indexes = {};

    columns.forEach(c => {
      if (c.primary || c.unique) {
        this.indexes[c.name] = new Map();
      }
    });
  }

  insert(values) {
    if (values.length !== this.columns.length) {
      throw new Error("Column count mismatch");
    }

    const row = {};
    this.columns.forEach((c, i) => (row[c.name] = values[i]));

    for (const col in this.indexes) {
      if (this.indexes[col].has(row[col])) {
        throw new Error(`Duplicate value for ${col}`);
      }
    }

    this.rows.push(row);

    for (const col in this.indexes) {
      this.indexes[col].set(row[col], row);
    }
  }
}

class Database {
  constructor() {
    this.tables = {};
    this.load();
  }

  load() {
    const data = JSON.parse(localStorage.getItem("mini-rdbms"));
    if (!data) return;

    for (const tableName in data) {
      const t = data[tableName];
      const table = new Table(t.name, t.columns);
      table.rows = t.rows;

      // rebuild indexes
      for (const col in table.indexes) {
        table.rows.forEach(row => {
          table.indexes[col].set(row[col], row);
        });
      }

      this.tables[tableName] = table;
    }
  }

  persist() {
    const plainTables = {};

    for (const name in this.tables) {
      const t = this.tables[name];
      plainTables[name] = {
        name: t.name,
        columns: t.columns,
        rows: t.rows
      };
    }

    localStorage.setItem("mini-rdbms", JSON.stringify(plainTables));
  }

  execute(sql) {
  const tokens = tokenize(sql);
  const ast = parse(tokens);

  let result;
  switch (ast.type) {
    case "CREATE_TABLE":
      if (this.tables[ast.table]) throw new Error("Table already exists");
      this.tables[ast.table] = new Table(ast.table, ast.columns);
      result = "OK";
      break;

    case "INSERT":
      this.requireTable(ast.table);
      this.tables[ast.table].insert(ast.values);
      result = "OK";
      break;

    case "SELECT":
      result = this.select(ast);
      break;

    case "UPDATE":
      result = this.update(ast);
      break;

    case "DELETE":
      result = this.delete(ast);
      break;

    case "SHOW_INDEX":  // <- New case
      this.requireTable(ast.table);
      const table = this.tables[ast.table];
      result = Object.keys(table.indexes).map(col => ({
        column: col,
        unique: table.columns.find(c => c.name === col).primary ||
                table.columns.find(c => c.name === col).unique
      }));
      break;

    default:
      throw new Error(`Unsupported AST type: ${ast.type}`);
  }

  this.persist();
  return result;
}


  requireTable(name) {
    if (!this.tables[name]) {
      throw new Error(`Table '${name}' does not exist`);
    }
  }

  select(ast) {
    let rows = [...this.tables[ast.table].rows];

    if (ast.where) {
      rows = rows.filter(r => r[ast.where.column] === ast.where.value);
    }

    if (ast.join) {
      const right = this.tables[ast.join.table].rows;
      rows = rows.flatMap(l =>
        right
          .filter(r => l[ast.join.left[1]] === r[ast.join.right[1]])
          .map(r => ({ ...l, ...r }))
      );
    }

    return rows;
  }

  update(ast) {
    this.tables[ast.table].rows.forEach(r => {
      if (!ast.where || r[ast.where.column] === ast.where.value) {
        r[ast.column] = ast.value;
      }
    });
    return "OK";
  }

  delete(ast) {
    this.tables[ast.table].rows =
      this.tables[ast.table].rows.filter(
        r => !ast.where || r[ast.where.column] !== ast.where.value
      );
    return "OK";
  }
}

window.db = new Database();
