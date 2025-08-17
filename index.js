import { writeFile } from "fs/promises";
import { exec } from "child_process";

const APP_VERSION = 3700;

function unpackZip(zipFile, outDir, password) {
  exec(`7z x ${zipFile} -o${outDir} -p${password} -y`, (err, stdout, stderr) => {
    if (err) console.error(stderr);
    else console.log(`Unpacked to: ${outDir}`);
  });
}

function generateTimestamp(queryParams) {
  const nowMillis = Date.now();
  let sumChars = 0;
  for (let i = 0; i < queryParams.length; i++) {
    sumChars += queryParams.charCodeAt(i);
  }
  return (nowMillis * 1000) + ((nowMillis + sumChars) % 1000);
}

async function generateHash(queryParams, timestamp) {
  const str = queryParams + "&" + timestamp;
  const salt = "ua.in.citybus.ukraine";

  const data = new TextEncoder().encode(salt + str);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);

  return Array.from(new Uint8Array(hashBuffer))
              .map(b => b.toString(16).padStart(2, "0"))
              .join("");
}

async function fetchWithParams(url, queryParams, requestMethod) {
  const timestamp = generateTimestamp(queryParams);
  const hash = await generateHash(queryParams, timestamp);

  const response = await fetch(url, {
            method: requestMethod,
            headers: {
                "App": "ukraine",
                "Timestamp": timestamp,
                "Hash": hash,
            },
        });
  
  return response;
}

async function fetchAndUnpackDb(dbName) {
    const queryParam = `v=${APP_VERSION}`;
    
    const url = dbName === "cities" ? 
    `http://citybus.in.ua/api/v1/ukraine/cities?${queryParam}`: 
    `http://citybus.in.ua/api/v1/${dbName}/db?${queryParam}`;

    const response = await fetchWithParams(url, queryParam, 'GET');
    
    const currentVersion = response.headers.get("current-version");

    if (response.status !== 200 || !currentVersion) {
      throw new Error(`Something went wrong: ${response.status}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(`${dbName}.zip`, buffer);
    console.log(`Writed ${dbName}.zip`);
    
    const password = String(`${dbName === "cities" ? 'ukraine' : dbName}/${currentVersion}`);

    unpackZip(`${dbName}.zip`, dbName, password)
}

function parseRoutes(routes) {
  let parsed = '';
  for (const route of routes) {
    if (parsed.length > 0) {
      parsed += '&';
    }
    parsed += `r[]=${route}`;
  }
  
  return parsed;
}

async function getBusPositions(apiUrl, city, routes) {
  const queryParams = `v=${APP_VERSION}&${parseRoutes(routes)}`;

  const url = `${apiUrl}${city}/update?${queryParams}`;

  console.log(url);

  const response = await fetchWithParams(url, queryParams, 'POST');
  return response.json();  
}

getBusPositions("http://city-bus-lviv.herokuapp.com/api/v1/", "cherkasy", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 47, 56]
).then(json => {
  for (const el of json) {
    console.log(el);
  }
});

