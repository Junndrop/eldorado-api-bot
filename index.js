const axios = require("axios");

const API_KEY = process.env.API_KEY;

async function testAPI() {

    try {

        console.log("START TEST");

        const res = await axios.get(
            "https://www.eldorado.gg/api/orders/me",
            {
                headers:{
                    "X-API-KEY": API_KEY,
                    "accept":"application/json"
                }
            }
        );

        console.log("SUCCESS");
        console.log(res.data);

    } catch(err){

        console.log("ERROR");

        console.log(
            err.response?.status
        );

        console.log(
            err.response?.data || err.message
        );

    }

}

testAPI();
