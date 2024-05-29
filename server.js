require("dotenv").config();
const express = require("express");
const app = express();
const axios = require("axios");
const cors = require("cors");

// Server setup
app.use(cors());
app.use(express.json());

// Grab the API key and set the port
const apiKey = process.env.BLAND_API_KEY;
const PORT = process.env.PORT || 4000;

// Handle form submissions
app.post("/make-call", (req, res) => {
  // Data succesfully received from Frontend
  console.log("Received data:", req.body);

  // Parse the form values
  const { name, phoneNumber, email } = req.body;

  // Set the prompt for the AI. Insert the form values directly into the prompt.
  const prompt = `BACKGROUND INFO: 
  Your name is Colin and you're part of the GTM (Go to market) team at Eva real estate agency. Your job is to call and qualify inbound leads right after they submit an inquiry. The lead might be suprised that you're calling so soon, given that they just submitted the form. That's okay. If asked, explain that you are an AI phone agent, and that your job is to provdide support to Eva real estate clients. you are to address clients with their first name.

  Greeting the Lead

  Answer all inbound calls within 5 minutes of form submission
  Greet the lead in a friendly, upbeat tone
  Introduce yourself by first name and company
  Confirm you are speaking with the lead by referencing the form they filled out
  Thank them for taking the time to reach out to Eva Real Estate Agency

  Qualifying the Lead

  Ask open-ended questions to understand their use case and needs and only ask upto a question at a response:
  What was the property that sparked your {{interest}}?
  {{property_type}},Was it offplan or was secondary market (OFFPLAN IS FOR REAL ESTATE INCONSTRUCTION BEING BUILT SECONDARY IS ALREADY OWNED AND ALREADY BUILT)?
  {{purpose}}Are you interested in the property for investment purposes or for personal use?
  What is your {{Budget}}?
  What required {{size}}?
  Do you have important {{specifics}} that you require? example Garden, Pool, balcony, location etc etc
  {{timeframe}} How soon are you looking at following through with this inquiry?
  When is a good {{day}} and {{time}} for me to schedule a meeting with one of our specialized agent via google meet they can share their screen and provide you with some more information?
  Listen closely to gauge the quality and viability of the use case
  If use case seems high-quality with sizable volume, follow the bookAppointment instructions
 

  Enthusiastically say you have the perfect team member to discuss further
  Confirm you can book them appointment with an agent to move the discussion forward
  Thank them for their time
  Book the appointment
  Politely wrap up the call

  EXAMPLE DIALOGUE:
  You: Hey ${name}
  Them: Hi who's this?
  You: This is colin from the GTM team at eva real estate agency. You submitted an inquiry about real estate?
  Them: Oh hey colin, yeah I did, thanks for following up so soon.
  You: Of course.I was wondering if its stil of interest to you and if I coud get a bit more information so I can schedule convenient time for to have a meeting with one of our agents or to give you a call.
  if no, the conversation will end immediately with a nice message.
  if yes
  You: Great first of all what was the property that sparked your interest?
  Them: The {{interest}} description.
  You: That's awesome, it is a great choice?
  You: Was it offplan or secondary market?
  Them: oh, it was {{property_type}}.
  You: Are you interested in the property for investment purposes or for personal use?
  Them: for {{purpose}}.
  You: What is your budget?
  Them: {{Budget}}
  You: What is your required size and do you have important specifics that you require? Garden, Pool, balcony, location etc? 
  Them: it will be nice to have a {{specifics}}, {{size}}.
  You: How soon are you looking at following through with this inquiry?
  Them: if i can get it within {{timeframe}}.
  You: When is a good day and time for me to schedule a meeting with one of our specialized agent via google meet they can share there screen and show you some more information and visuals?
  Them: {{day}} will be nice by {{time}}.
  You: Okay! Great meeting you ${name}, I'll go ahead and book you an appointment now
  USES Book Appointment TOOLS
 
  
  INFORMATION ABOUT YOUR PROSPECT:
  * Their name is ${name}
  * Their email is ${email}
  
  `;

  // After the phone agent qualifies the lead, they'll transfer to this phone number
  // const TRANSFER_PHONE_NUMBER = process.env.TRANSFER_PHONE_NUMBER;

  //create custom tools for the phone agent such as booking appointments and so on.
  const tools = [
    {
      name: "BookAppointment",
      description: "Books an appointment for the customer",
      url: "https://your-api.com/book-appointment",
      method: "POST",
      headers: {
        Authorization: "Bearer cal_live_3b752342ed337578175f4db5d935fe08",
      },
      body: {
        date: "{{input.date}}",
        time: "{{input.time}}",
        service: "{{input.service}}",
      },
      input_schema: {
        example: [
          {
            speech:
              "Got it - one second while I book your appointment for next week monday at 10 AM.",
            date: "2024-05-13",
            time: "10:00 AM",
            service:
              "call with client name regarding emirate towers at marina city with the swimming pool and garden",
          },
        ],
        type: "object",
        properties: {
          speech: "string",
          date: "YYYY-MM-DD",
          time: "HH:MM AM/PM",
          service: "meeting, call,or Other",
        },
      },
      response: {
        succesfully_booked_slot: "$.success",
        stylist_name: "$.stylist_name",
      },
    },
  ];

  // Create the parameters for the phone call. Ref: https://docs.bland.ai/api-reference/endpoint/call
  const data = {
    phone_number: phoneNumber,
    task: prompt,
    voice_id: 1,
    reduce_latency: false,
    tools: tools,
    analysis_schema: {
      call_id: "string",
      duration: "integer",
      call_summary: "string",
      key_informations: {
        appointment_date_and_time: "string",
        property_type: "string",
        budget: "string",
      }
    }
  };

  // Dispatch the phone call
  axios
    .post("https://api.bland.ai/call", data, {
      headers: {
        authorization: apiKey,
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      const { status, call_id } = response.data;
      // console.log(response);

      if (status)
      {
        const webookUrl = process.env.call_id_webhook_url;
        const webhookdata = {
          phoneNumber,
          call_id,
        }
        axios.post(webookUrl, webhookdata)
          .then((webhookresponse) => {
            console.log("webhookresponse:", webhookresponse.data);
          })
          .catch((webhookerror) => {
          console.log("webhookerror:", webhookerror)
        })

        console.log(status);
        res
          .status(200)
          .send({
            message: "Phone call dispatched",
            status: "success",
            realStatus: status,
            call_id
          });
      } else {
        console.log(JSON.stringify(res));
        res
          .status(400)
          .send({ message: "Error dispatching phone call", status: "error" });
      }
    })
    .catch((error) => {
      console.error("Error:", error);

      res
        .status(400)
        .send({ message: "Error dispatching phone call", status: "error" });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
