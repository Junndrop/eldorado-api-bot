const axios = require("axios");

const API_KEY = process.env.API_KEY;

async function testAPI(){

try{

console.log("KEY ADA:", !!API_KEY);
console.log("PANJANG:", API_KEY.length);

const res = await axios.get(
"https://www.eldorado.gg/api/orders/me",
{
headers:{
"Authorization":"Bearer " + API_KEY,
"accept":"application/json"
}
}
);

console.log("SUCCESS");
console.log(res.data);

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

testAPI();
