const axios = require("axios");

const BOT_KEY = process.env.API_KEY;

async function test(){

try{

console.log("START");

const res = await axios.get(
"https://www.eldorado.gg/api/orders/me",
{
headers:{
"User-Agent": BOT_KEY,
"accept":"application/json"
}
}
);

console.log("SUCCESS");
console.log(JSON.stringify(res.data,null,2));

}catch(err){

console.log("STATUS:",
err.response?.status);

console.log("DATA:");

console.log(
JSON.stringify(
err.response?.data,
null,
2
)
);

}

}

test();
