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
  Your name is Eva and you're part of the GTM (Go to market) team at Eva real estate agency. Your job is to call and qualify inbound leads right after they submit an inquiry. The lead might be suprised that you're calling so soon, given that they just submitted the form. That's okay. If asked, explain that you are an AI phone agent, and that your job is to provdide support to Eva real estate clients. you are to address clients with their first name.

  Greeting the Lead

  Answer all inbound calls within 5 minutes of form submission
  Greet the lead in a friendly, upbeat tone
  Introduce yourself by first name and company
  Confirm you are speaking with the lead by referencing the form they filled out
  Thank them for taking the time to reach out to Eva Real Estate Agency

  Qualifying the Lead

  Ask open-ended questions to understand their use case and needs and only ask upto a question at a response:
  What was the property that sparked your {{interest}}?
  {{property_type}},Was it offplan or secondary market (OFFPLAN IS FOR REAL ESTATE IN CONSTRUCTION BEING BUILT SECONDARY MARKET IS ALREADY OWNED AND ALREADY BUILT)?
  {{purpose}}Are you interested in the property for investment purposes or for personal use?
  What is your {{Budget}}?
  What required {{size}}?
  Do you have important {{specifics}} that you require? example Garden, Pool, balcony, location etc etc
  {{timeframe}} How soon are you looking at following through with this inquiry?
  When is a good {{day}} for me to schedule a meeting with one of our specialized agent via google meet they can share their screen and provide you with some more information?
  Get to know more information about the client such as {{Nationality}},{{Marital Status}}
  Listen closely to gauge the quality and viability of the use case
  If use case seems high-quality with sizable volume, follow the bookAppointment instructions
 

  Enthusiastically say you have the perfect team member to discuss further
  Confirm you can book them appointment with an agent to move the discussion forward
  Thank them for their time
  Book the appointment, in the absence of the time choosen by client choose the closet time to the time chosen example the client says tomorrow 10am and the available time does not include the 10:00:00:000Z but the closest available time is 10:30:00:000Z choose the time and notify the client of the available time.
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
  You: please wait while i check that against the calender for availability
  USES checkAvailability TOOLS using the selected {{day}} and {{time}} as the startTime against the whole day as the endTime. example if client choose Friday 21st of June 2024 1pm, startTime=2024-06-21T00:00:00, endTime=2024-06-21T24:00:00 now check if the client choosen timeframe is available within the available slots otherwise provide client with available future slots.
  Them: Ok, what are the slots available since that time is not available
  You: provide client with available future slots. 
  Them: Ok, example client choose 4pm from the list of the available slots
  You: Okay! Great meeting you ${name}, I'll go ahead and book you an appointment now
  USES Book Appointment TOOLS
 
  
  INFORMATION ABOUT YOUR PROSPECT:
  * Their name is ${name}
  * Their email is ${email}
  * Their phone number is ${phoneNumber}
  
  `;

  // After the phone agent qualifies the lead, they'll transfer to this phone number
  // const TRANSFER_PHONE_NUMBER = process.env.TRANSFER_PHONE_NUMBER;

  //create custom tools for the phone agent such as booking appointments and so on.
  const tools = [
    {
      name: "check availability",
      description: "check selected date and time if available on my calendar",
      url: "https://ai-crm.fastgenapp.com/availability",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      query: {},
      input_schema: {
        example: {
          endTime: "2024-06-24T16:30:00.000Z",
          startTime: "2024-06-24T09:30:00.000Z",
        },
        properties: {
          endTime: "",
          startTime: "",
        },
      },
      speech:
        "please wait a moment while i check if that date and time is available",
      body: {
        endTime: "{{input.endTime}}",
        startTime: "{{input.startTime}}",
      },
    },
    {
      name: "BookAppointment",
      description: "Books an appointment for the customer",
      speech: "Booking your appointment, a moment please.",
      url: "https://lead-qualifier-i0r3.onrender.com/booker",
      method: "POST",
      headers: {
        Authorization: process.env.BLAND_API_KEY,
        "Content-Type": "application/json",
      },
      body: {
        start: "{{input.start}}",
        name: "{{input.name}}",
        email: "{{input.email}}",
        smsReminderNumber: "{{input.smsReminderNumber}}",
      },
      query: {},
      input_schema: {
        example: {
          start: "2024-06-24T09:30:00.000Z",
          name: "ola",
          email: "ola@mail.com",
          smsReminderNumber: "+2349095176621",
        },
        properties: {
          start: { type: "string", format: "date-time" },
          name: { type: "string" },
          email: { type: "string" },
          smsReminderNumber: { type: "string" },
        },
        description:
          "You will be having a meeting with an agent to give you more insight regarding your listing interest.",
      },
      response: {
        succesfully_booked_slot: "$.success",
      },
      timeout: 123,
    },
  ];

  // Create the parameters for the phone call. Ref: https://docs.bland.ai/api-reference/endpoint/call
  const data = {
    phone_number: phoneNumber,
    task: prompt,
    voice: process.env.voice_id,
    reduce_latency: false,
    webhook: process.env.call_webhook,
    record: true,
    tools: tools,

    analysis_prompt: `analyze the call to extract the user requirements, needs, and specifics the client is interested in. Ensure to capture details such as the property market type, purpose (investment or personal use), description, location, size, and budget. Also, determine if it is a good lead based on the conversation. The analysis should provide the following details in a structured format:
        - name: The client's name.
        - Email Address: The email address of the client.
        - Property Market Type: The type of property market the client is interested in (off-plan, secondary market).
        - Property Description: A brief description of the property the client is looking for.
        - Property Location: The desired location of the property or where the perty that intrest the client is situated.
        - Property Purpose: The purpose of the property (e.g., investment, personal use).
        - Property Sizes: The preferred size(s) of the property.
        - Budget: The client's budget for the property.
        -IsLead: Whether the client is a potential lead (true/false).
        -Lead Quality Score: A numerical score representing the quality of the lead on a scale of 1 to 10.
        -User Has Booked Appointment: Whether the client has booked an appointment (true/false).
        -User Wants to Buy Property: Whether the client wants to buy a property (true/false).
        -User Wants to Sell Property: Whether the client wants to sell a property (true/false).
        -User Nationality: The nationality of the client.
        -Appointment Time: The scheduled time for the appointment, if any.
        -Other Requirements: Any additional requirements mentioned by the client.`,

    analysis_schema: {
      name: String,
      email_address: String,
      property_market_type: String,
      property_description: String,
      property_location: String,
      property_purpose: String,
      property_sizes: String,
      budget: String,
      isLead: Boolean,
      lead_quality_score: Number,
      user_has_booked_appointment: Boolean,
      user_wants_to_buy_property: Boolean,
      user_wants_to_sell_property: Boolean,
      user_nationality: String,
      appointment_time: String,
      other_requirements: String,
    },
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
      console.log(response);

      if (status) {
        const webookUrl = process.env.call_id_webhook_url;
        const webhookdata = {
          phoneNumber,
          call_id,
        };
        axios
          .post(webookUrl, webhookdata)
          .then((webhookresponse) => {
            console.log("webhookresponse: ⏩", webhookresponse.data);
          })
          .catch((webhookerror) => {
            console.log("webhookerror:", webhookerror);
          });

        console.log(status);
        res.status(200).send({
          message: "Phone call dispatched 💯",
          status: "success",
          realStatus: status,
          call_id,
        });
      } else {
        console.log(JSON.stringify(res));
        res.status(400).send({
          message: "Error 🔥 dispatching phone call",
          status: "error",
        });
      }
    })
    .catch((error) => {
      console.error("Error 🔥:", error);

      res.status(400).send({
        message: "Error 🔥 dispatching phone call",
        status: "error 🔥",
      });
    });
});


app.post("/booker", async (req, res) => {
  const apiKey = process.env.Bland_cal_key;
  const {
    eventTypeId = 768395,
    start,
    name,
    email,
    smsReminderNumber,
    timeZone = "Asia/Dubai",
    language = "en",
    metadata = {},
  } = req.body;

  // Validate the start field to ensure it's a proper ISO 8601 datetime string
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  if (!iso8601Regex.test(start)) {
    return res.status(400).json({
      message:
        "Invalid datetime format for 'start'. Expected ISO 8601 format (YYYY-MM-DDTHH:MM:SS.sssZ).",
    });
  }

  const data = {
    eventTypeId: parseInt(eventTypeId),
    start,
    responses: {
      name,
      email,
      smsReminderNumber: smsReminderNumber,
    },
    timeZone: timeZone,
    language,
    metadata,
  };

  try {
    const response = await axios.post(
      `https://api.cal.com/v1/bookings?apiKey=${apiKey}`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(
      "Error booking appointment:",
      error.response ? error.response.data : error.message
    );
    res.status(error.response ? error.response.status : 500).json({
      message: "Failed to book appointment",
      error: error.response ? error.response.data : error.message,
    });
  }
});


app.listen(PORT, () => console.log(`Server  running 🏃‍♂️ 😄 on port ${PORT}🔗`));
