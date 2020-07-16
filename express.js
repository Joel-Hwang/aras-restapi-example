var express = require("express"); //express 불러오기
var app = express(); //express 객체 생성
const dxf = require('dxf'); //dxf parser
var fs = require("fs");
var cors = require("cors");
var apiServer = "http://localhost/InnovatorServer/server/odata";
var authServer = "http://localhost/InnovatorServer/oauthserver/connect/token";
var request = require("request");
var session = require("express-session");
var bodyParser = require("body-parser");
const { get } = require("request");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: "@#@$MYSIGN#@$#$",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(cors());
app.use(express.static("view"));

app.locals.pretty = true; //개발자 도구로 볼 때 html 코드 인덴트 정리돼서 보임
app.get("/", function (req, res) {
  res.writeHead(200);
  res.end(fs.readFileSync(__dirname + "/view/index.html"));
});

app.listen(8080, function () {
  //서버 가동 8080 포트에 해당 앱 연결
  console.log("8080 connected");
});

app.get("/session", function (req, res) {
  res.send(req.session);
});

app.get("/main", function (req, res) {
  res.writeHead(200);
  res.end(fs.readFileSync(__dirname + "/view/main.html"));
});

app.get("/project", function (req, res) {
  res.writeHead(200);
  res.end(fs.readFileSync(__dirname + "/view/project.html"));
});

app.get("/cspart", function (req, res) {
  res.writeHead(200);
  res.end(fs.readFileSync(__dirname + "/view/cspart.html"));
});

app.get("/pcxbommanager", function (req, res) {
  res.writeHead(200);
  res.end(fs.readFileSync(__dirname + "/view/pcxbommanager.html"));
});

app.get("/pcxbomdetail", function (req, res) {
  res.writeHead(200);
  res.end(fs.readFileSync(__dirname + "/view/pcxbomdetail.html"));
});

app.get("/pst", function (req, res) {
  res.writeHead(200);
  res.end(fs.readFileSync(__dirname + "/view/pst.html"));
});

app.get("/pstdetail", function (req, res) {
  let contents = fs.readFileSync("C:\\Users\\cheol.hwang\\Downloads\\QVFGTM.DXF");
  let helper = new dxf.Helper(contents.toString());
  let parsedData = helper.parsed;
  
  res.send(parsedData.blocks);

});

app.get("/login", async function (req, res) {
  let token = await getToken(req.query.userid, req.query.userpassword);

  const options = {
    uri: apiServer + "/user",
    method: "GET",
    qs: {
      $filter: "login_name eq '" + req.query.userid + "'",
    },
    headers: {
      Authorization: "Bearer " + token,
    },
  };
  var result = await requestSync(options);
  let arasUser = JSON.parse(result);
  if (!arasUser.value) {
    res.status(500).end();
  } else if (arasUser.value.length === 1) {
    arasUser.value[0].password = req.query.userpassword;
    req.session.email = arasUser.value[0].email;
    req.session.keyed_name = arasUser.value[0].keyed_name;
    req.session.login_name = arasUser.value[0].login_name;
    req.session.password = arasUser.value[0].password;
    res.send({ status: 200 });
  } else {
    res.status(500).end();
  }
});

app.get("/retrieve/project", async function (req, res) {
  let token = await getToken(req.session.login_name, req.session.password);

  const options = {
    uri: apiServer + "/project",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  };
  var result = await requestSync(options);
  let projectData = JSON.parse(result);
  res.send(projectData);
});

app.get("/retrieve/cspart", async function (req, res) {
  let token = await getToken(req.session.login_name, req.session.password);

  const options = {
    uri: apiServer + "/cs part?$select=*",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  };
  var result = await requestSync(options);
  let data = JSON.parse(result);
  res.send(data);
});

app.get("/retrieve/pcxbommanager", async function (req, res) {
  let token = await getToken(req.session.login_name, req.session.password);

  const options = {
    uri: apiServer + "/pcx bom manager",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  };
  var result = await requestSync(options);
  let data = JSON.parse(result);
  res.send(data);
});

app.get("/retrieve/pcxbomdetail", async function (req, res) {
  let token = await getToken(req.session.login_name, req.session.password);

  const options = {
    uri: apiServer + "/pcx bom manager",
    method: "GET",
    qs: {
      $filter: "_pcm_bom_id eq '" + req.query.bomId + "'",
      $expand: "PCX BOM MANAGER PCX MART($expand=related_id)"
    },
    headers: {
      Authorization: "Bearer " + token,
    },
  };
  var result = await requestSync(options);
  let data = JSON.parse(result);
  res.send(data);
});


app.get("/download", async function (req, res) {
  let token = await getToken(req.session.login_name, req.session.password);


  const options = {
    uri: "http://localhost/InnovatorServer/server/odata/Document('E8717FDF0C7641DF94DCD90F5B082329')/Document File('ECD3EFCE16A74031B53106FA804EB2CD')/related_id/$value",
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  };
  var result = await requestSyncFile(options);
  //res.body = result.body;
  // res.send(result.body);
  fs.writeFile("./image.png", result.body, 'binary', function (err) {
    if (err) throw err;
  });

});



function requestSync(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (error, response, body) {
      resolve(body);
    });
  });
}

function requestSyncFile(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (error, response, body) {
      resolve(response);
    }).pipe(fs.createWriteStream('sample.png'));
  });
}

async function getToken(id, pw) {
  const options = {
    uri: authServer,
    method: "POST",
    json:true,
    form: {
      grant_type: "password",
      scope: "Innovator",
      client_id: "IOMApp",
      username: id,
      password: pw,
      database: "InnovatorSolutions",
    }
  };
  var result = await requestSync(options);
  return result.access_token;
}
