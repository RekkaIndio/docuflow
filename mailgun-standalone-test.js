const FormData = require("form-data");
const Mailgun = require("mailgun.js");
require("dotenv").config();

const mailgun = new Mailgun(FormData);


const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
  url: "https://api.eu.mailgun.net"
});

async function sendSimpleMessage() {
  try {
    const domain = process.env.MAILGUN_DOMAIN;
    const data = await mg.messages.create(domain, {
      from: `Mailgun Sandbox <postmaster@${domain}>`,
      to: ["Jamie Mason-Wright <jamie@dfai.co.uk>"],
      subject: "Hello Jamie Mason-Wright",
      text: "Congratulations Jamie Mason-Wright, you just sent an email with Mailgun! You are truly awesome!",
    });
    console.log(data);
  } catch (error) {
    console.log(error);
  }
}

sendSimpleMessage();
