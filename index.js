const axios = require("axios");
const { Amplify } = require("aws-amplify");
const { signIn, fetchAuthSession } = require("aws-amplify/auth");

const EMAIL = process.env.ELDO_EMAIL;
const PASSWORD = process.env.ELDO_PASSWORD;

const BOT_KEY = process.env.ELDO_BOT_KEY;

const TG_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

Amplify.configure({
  Auth:{
    Cognito:{
      userPoolId:"us-east-2_MlnzCFgHk",
      userPoolClientId:"1956req5ro9drdtbf5i6kis4la"
    }
  }
});

async function sendTelegram(text){

await axios.post(
`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
{
chat_id:CHAT_ID,
text:text
});

}

async function getToken(){

console.log("LOGIN...");

await signIn({
username:EMAIL,
password:PASSWORD
});

const session=await fetchAuthSession();

const token=
session.tokens.idToken.toString();

console.log("TOKEN OK");

return token;
}

async function checkOrders(){

try{

const token=await getToken();

const res=await axios.get(
"https://www.eldorado.gg/api/orders/me/seller/orders",
{
headers:{
"User-Agent":BOT_KEY,
"Cookie":
`__Host-EldoradoIdToken=${token}`,
"Accept":"application/json"
}
}
);

const orders = (res.data.results || []).filter(
x => ![
"Canceled",
"Completed",
"Delivered"
].includes(x.state.state)
);

console.log(
"TOTAL:",
orders.length
);

await sendTelegram(
`Bot hidup ✅
Total order: ${orders.length}`
);
  for(const order of orders){

console.log(JSON.stringify(order,null,2))

await sendTelegram(
`🛒 ORDER MASUK

ID: ${order.id || "-"}

Status: ${order.state?.state || "-"}

DATA:
${JSON.stringify(order,null,2).slice(0,3000)}`
);

  }
}catch(err){

console.log("EMAIL:", process.env.ELDO_EMAIL)
console.log("PASSWORD ADA:", !!process.env.ELDO_PASSWORD)
console.log("PANJANG PW:", process.env.ELDO_PASSWORD?.length)

console.log("FULL ERROR:");

console.log(err);

console.log("MESSAGE:");
console.log(err.message);

console.log("NAME:");
console.log(err.name);
}
}

checkOrders();
