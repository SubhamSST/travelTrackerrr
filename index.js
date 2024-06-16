import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "p0stgrespassw0rd",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisited() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1;",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  console.log("hi" + countries);
  return countries;
}

async function checkVisited1() {
  const result = await db.query(
    "SELECT state_code FROM visited_states JOIN users ON users.id = user_id WHERE user_id = $1;",
    [currentUserId]
  );
  let states = [];
  result.rows.forEach((state) => {
    states.push(state.state_code);
  });
  console.log("hi" + states);
  return states;
}

async function getCurrentUser() {
  console.log("currentUserId:", currentUserId);
  const result = await db.query("SELECT * FROM users");
  console.log("Fetched users:", result.rows);
  const users = result.rows;
  const currentUser = users.find((user) => user.id == currentUserId);
  console.log("Current user:", currentUser);
  return currentUser;
}

async function getAllUsers() {
  const result = await db.query("SELECT * FROM users");
  return result.rows;
}

app.get("/", async (req, res) => {
  try {
    const countries = await checkVisited();
    const states = await checkVisited1();
    const users = await getAllUsers();
    const currentUser = await getCurrentUser();
    res.render("index.ejs", {
      countries: countries,
      states: states,
      total1: states.length,
      total: countries.length,
      users: users,
      color: currentUser ? currentUser.color : null,
    });
  } catch (error) {
    console.error("Error rendering index:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();
if(input){
  try {
    let result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    let result1 = await db.query(
      "SELECT state_code FROM states WHERE LOWER(state_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    if (result !== undefined && result.rows.length > 0) {
      const data = result.rows[0];
      const countryCode = data.country_code;
      try {
        await db.query(
          "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
          [countryCode, currentUserId]
        );
        res.redirect("/");
      } catch (err) {
        console.log(err);
      }
    }

    if (result1 !== undefined && result1.rows.length > 0) {
      const data = result1.rows[0];
      const stateCode = data.state_code;
      try {
        await db.query(
          "INSERT INTO visited_states (state_code, user_id) VALUES ($1, $2)",
          [stateCode, currentUserId]
        );
        res.redirect("/");
      } catch (err) {
        console.log(err);
      }
    }
  } catch (err) {
    console.log(err);
  }}
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/delete", async (req, res) => {
  try {
    const countries = await checkVisited();
    let lastCountry = countries[countries.length - 1];

    const result = await db.query(
      "DELETE FROM visited_countries WHERE country_code = $1",
      [lastCountry]
    );
    res.redirect('/');
  } catch (error) {
    console.error("Error deleting country:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.post("/delete1", async (req, res) => {
  try {
    const states = await checkVisited1();
    let lastState = states[states.length - 1];

    const result = await db.query(
      "DELETE FROM visited_states WHERE state_code = $1",
      [lastState]
    );
    res.redirect('/');
  } catch (error) {
    console.error("Error deleting state:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.post("/deleteUser", async (req, res) => {
  try {
    // Get the current user object
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      res.status(404).send("Current user not found");
      return;
    }

    console.log("Current user:", currentUser);

    // Fetch the visited countries for the current user
    const countries = await checkVisited();
    console.log('Visited countries:', countries);

    // Delete all visited countries for the current user
    const deleteCountriesResult = await db.query(
      "DELETE FROM visited_countries WHERE user_id = $1",
      [currentUser.id]
    );
    console.log(`Deleted ${deleteCountriesResult.rowCount} visited countries for user ${currentUser.id}`);

     // Delete all visited states for the current user
     const deleteStatesResult = await db.query(
      "DELETE FROM visited_states WHERE user_id = $1",
      [currentUser.id]
    );
    console.log(`Deleted ${deleteStatesResult.rowCount} visited states for user ${currentUser.id}`);

    // Delete the user from the database
    const deleteUserResult = await db.query(
      "DELETE FROM users WHERE id = $1",
      [currentUser.id]
    );
    console.log("Deleted user:", deleteUserResult);

    // Reset the current user ID to a default value or handle accordingly
    currentUserId = 1;

    // Redirect after deletion
    res.redirect('/');
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});


app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
