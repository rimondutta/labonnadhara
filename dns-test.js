const dns = require("node:dns");

dns.resolveSrv("_mongodb._tcp.cluster0.uueipw9.mongodb.net", (err, records) => {
    console.log("Callback called");

    if (err) {
        console.error(err);
    } else {
        console.log(records);
    }
});