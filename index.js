const axios = require("axios");

const API_KEY = process.env.API_KEY;

async function test(){

try{

console.log("START");

const res = await axios.get(
"https://www.eldorado.gg/api/orders/me",
{
headers:{
"X-BOT-KEY":API_KEY,
"accept":"application/json"
}
}
);

console.log("SUCCESS");
console.log(res.data);

}catch(err){

console.log("STATUS:",
err.response?.status);

console.log("HEADERS:");
console.log(err.response?.headers);

console.log("DATA:");
console.log(err.response?.data);

}

}

test();
