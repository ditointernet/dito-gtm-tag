const sendHttpRequest = require("sendHttpRequest");
const getAllEventData = require("getAllEventData");
const makeInteger = require("makeInteger");
const makeString = require("makeString");
const JSON = require("JSON");
const Promise = require("Promise");
const getRequestHeader = require("getRequestHeader");
const log = require("logToConsole");
const getContainerVersion = require("getContainerVersion");
const getCookieValues = require("getCookieValues");
const setCookie = require('setCookie');
const getType = require("getType");

const containerVersion = getContainerVersion();

const postHeaders = {
  "Content-Type": "application/json",
};

let eventData = getAllEventData();
let cookieOptions = {
  domain: "auto",
  path: "/",
  samesite: "Lax",
  secure: true,
  "max-age": 31536000, // 1 year
  httpOnly: true,
};

if (data.headers) {
  for (let key in data.headers) {
    postHeaders[data.headers[key].key] = data.headers[key].value;
  }
}

let requestOptions = {
  headers: postHeaders,
  method: "POST",
};

if (data.requestTimeout) {
  requestOptions.timeout = makeInteger(data.requestTimeout);
}

maybeGetDitoUserId()
  .then((userId) => {
    if (userId !== null) {
      eventData.dito_user_id = userId;
    }
  })
  .then(() =>
    sendHttpRequest(
      "https://ingest.dito.com.br/v2/events/gtm/" + data.platform,
      requestOptions,
      JSON.stringify(eventData)
    )
  )
  .then((response) => {
    if (response.statusCode == 201) {
      data.gtmOnSuccess();
    } else {
      data.gtmOnFailure();
    }
  });

function maybeGetDitoUserId() {
  return Promise.create((resolve, reject) => {
    const ditoUserId = getCookieValues("ditouid")[0];
    if (ditoUserId) return resolve(ditoUserId);

    userEmailHash()
      .then((userId) => {
        if (userId !== null) {
          eventData.send_identify = true;
          setCookie("ditouid", makeString(userId), cookieOptions);
        }

        resolve(userId);
      })
      .catch((e) => reject(e));
  });
}

function userEmailHash() {
  if (data.platform === "vtex") {
    if (data.emailHashAlgorithm === "sha256") {
      return promiseResolve(eventData.emailHash);
    } else if (data.emailHashAlgorithm === "sha1") {
      const email = vtexUserEmail();
      if (email === null) return promiseResolve(null);

      const input = makeString(email).trim().toLowerCase();

      return sendHttpRequest(
        "https://ingest.dito.com.br/v2/utils/sha1-sum",
        requestOptions,
        JSON.stringify({ input: input })
      )
        .then((response) => {
          if (response.statusCode !== 200) return null;

          const body = JSON.parse(response.body);
          return body.output;
        })
        .catch((e) => {
          return null;
        });
    }
  }

  return promiseResolve(null);
}

function vtexUserEmail() {
  if (getType(eventData.visitorContactInfo) === "string") {
    eventData.visitorContactInfo = eventData.visitorContactInfo.split(',');
  }

  if (getType(eventData.visitorContactInfo) !== "array") return null;

  if (eventData.visitorContactInfo.length === 0) return null;

  return eventData.visitorContactInfo[0];
}

function promiseResolve(arg) {
  return Promise.create((resolve, _reject) => {
    resolve(arg);
  });
}
