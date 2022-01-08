const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const databasePath = path.join(__dirname, "financePeer.db");

const app = express();

app.use(express.json());
app.use(cors());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(process.env.PORT || 3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const Authenticate = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
      SELECT * FROM user WHERE username = '${username}';
    `;
  const dbUser = await db.get(getUserQuery);
  if (dbUser === undefined) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const addUserQuery = `
      INSERT INTO user( username, password)
      VALUES(
          '${username}',
          '${hashedPassword}'
      );
    `;
    const dbResponse = await db.run(addUserQuery);
    response.send("New User Created");
  } else {
    response.status(400);
    response.send("username already exist");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      console.log(jwtToken);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

app.post("/posts/", async (req, res) => {
  const data = req.body;
  const emptyTheEntriesDataQuery = `DELETE FROM post;`;
  await db.run(emptyTheEntriesDataQuery);
  if (data.length === undefined) {
    res.status(400).json({ msg: "invalid file" });
  } else {
    data.map(async (eachItem) => {
      const addDataQuery = `INSERT INTO post( user_id,id, title, body) VALUES(${eachItem.user_id}, ${eachItem.id}, '${eachItem.title}', '${eachItem.body}')`;
      await db.run(addDataQuery);
    });
    res
      .status(200)
      .json({ msg: "data of the file is uploaded into database..." });
  }
});

app.get("/getPosts/", async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      post;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(statesArray);
});
