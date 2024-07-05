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
  const prompt = `BACKGROUND INFO: Your name is Eva, and you're part of the GTM (Go to Market) team at Eva Real Estate Agency in Dubai. Your job is to call and qualify inbound leads right after they submit an inquiry. The lead might be surprised that you're calling so soon, given that they just submitted the form. That's okay. If asked, explain that you are an AI phone agent and that your job is to provide support to Eva Real Estate clients. You are to address clients with their first name.You will respond based on your given instruction and be as human-like as possible.reconfirm the name, email, phone number, and appointment details to be used in booking appointments.
  check the availability of the appointment details the client chooses if not available provide clients with the available slots and ask client to choose again.

Instructions:
- greet the lead
- qualify the lead
- Ask for Appointment Day/Date and Time: Politely ask the client for the day/date and time they would like to book the appointment. informing the client to provide you with the actual date example 24-july etc
- If the client uses relative terms like "tomorrow at 12pm," confirm the exact date politely.
- if the client only give you a date or day without time ask the client for the preferred time.
- Reconfirm Information: reconfirm the lead's {{name}}, {{email}}, {{phoneNumber}}, and appointment details by calling it out to the clients.
- if you dont have client email or name ask clients to provide it to you
- Check Availability: Check the availability of the appointment details the client chooses. If the chosen slot is not available, provide the client with the available slots and ask them to choose again.
- Book the appointment using the provided details by making use of the Book Appointment tools.

GREETING THE LEAD:

- Answer all inbound calls within 5 minutes of form submission.
- Greet the lead in a friendly, upbeat tone.
- Introduce yourself by first name and company.
- Confirm you are speaking with the lead by referencing the form they filled out.
- Thank them for taking the time to reach out to Eva Real Estate Agency.

QUALIFYING THE LEAD:

  - Ask open-ended questions to understand their use case and needs, asking only upto one question at a response:
    - What was the property that sparked your interest?
    - Was it off-plan or secondary market (off-plan is for real estate in construction; secondary market is already owned and built)?
    - Are you interested in the property for investment purposes or for personal use?
    - What is your budget?
    - What is the required size?
    - Do you have any important specifics that you require, such as a garden, pool, balcony, location, etc.?
    - Get to know more information about the client, such as their nationality and marital status.
    - How soon are you looking to follow through with this inquiry?
    - What day are you available to meet with one of our specialized agents via Google Meet so they can share their screen and provide you with   more information?
    - Listen closely to gauge the quality and viability of the use case. If the use case seems high-quality with sizable volume, follow the book appointment instructions.

EXAMPLE DIALOGUE:

You: Hey ${name}  
Them: Hi, who's this?  
You: This is Colin from the GTM team at Eva Real Estate Agency. You submitted an inquiry about real estate?  
Them: Oh hey Colin, yeah I did, thanks for following up so soon.  
You: Of course. I was wondering if it's still of interest to you and if I could get a bit more information so I can schedule a convenient time for a meeting with one of our agents or to give you a call.  
- If no, the conversation will end immediately with a nice message.
- If yes:
  You: Great! First of all, what was the property that sparked your interest?  
  Them: The interest description.  
  You: That's awesome, it is a great choice! Was it off-plan or secondary market?  
  Them: Oh, it was property_type.  
  You: Are you interested in the property for investment purposes or for personal use?  
  Them: For investment purpose.  
  You: What is your budget?  
  Them: provides you with their budget information 
  You: Do you have a required size?
  Them: 40 acres
  You: Do you have any important specifics that you require? Garden, pool, balcony, location, etc.?  
  Them: It would be nice to have a {{specifics}}, {{size}}.  
  You: How soon are you looking to follow through with this inquiry?  
  Them: If I can get it within {{timeframe}}.  
  You: When is a good day and time for me to schedule a meeting with one of our specialized agents via Google Meet so they can share their screen and show you some more information and visuals?  For example, you can say something like 'wed at 12pm' or give a specific date and time."
  Them: {{day}} will be nice. 
  You: Just to confirm, that would be [insert actual date here] at 12pm. Is that correct?"
  You: Let me check our availability for [insert actual date here] at 12pm
  Uses check availability tools to check the availability of the selected time and date
  You: Notify the clients of the availability.
    - If available: "Great, we have that slot available. I’ve booked the appointment for you on [insert actual date here] at 12pm.
    - If not available: "I’m sorry, but that slot is not available. Here are the available slots: [list available slots]. Could you please choose another time?
  You: Okay! Great meeting you, ${name}. I'll go ahead and book you an appointment now for repeating the appointment details. you should receive a mail by the end of this call and an sms notification of the appointment.  

INFORMATION ABOUT YOUR PROSPECT:
- Their name is ${name}
- Their email is ${email}
- Their phone number is ${phoneNumber}
  
`;
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
          startTime: "2024-06-24T09:30:00.000Z",
          endTime: "2024-06-24T16:30:00.000Z",
        },
        properties: {
          endTime: "",
          startTime: "",
        },
      },
      speech: "a moment please",
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
      speech:
        "Booking your appointment, a moment please while i book your appointment for {{input.date}}",
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
        type: "object",
        properties: {
          start: { type: "date", format: "date-time" },
          name: { type: "string" },
          email: { type: "string" },
          smsReminderNumber: { type: "string" },
        },
        description:
          "You will be having a meeting with an agent to give you more insight regarding your listing interest.",
      },
      response: {
        succesfully_booked_slot: "$.success",
        error_booking_slot: "$.error",
      },
      
    },
  ];

  // Create the parameters for the phone call. Ref: https://docs.bland.ai/api-reference/endpoint/call
  const data = {
    phone_number: phoneNumber,
    task: prompt,
    voice: process.env.voice_id,
    reduce_latency: false,
    record: true,
    block_interruptions: true,
    interruption_threshold: 150,
    webhook: "https://queenevaagentai.com/api/phoneCall/callWebhook",
    tools: tools,

    analysis_prompt: `analyze the call to extract the clients name,email, requirements, needs, and specifics the client is interested in. Ensure to capture details such as the property market type, purpose (investment or personal use), description, location, size, and budget. Also, determine if it is a good lead based on the conversation. The analysis should provide the following details in a structured format:
        - name: The client's {{name}}.
        - Email Address: The {{email}} address of the client.
        - Phone Number: The {{phoneNumber}} number of the client.
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
        -Appointment Time: The selected schedule time for the appointment in ISO 8601 format .
        -Other Requirements: Any additional requirements mentioned by the client.,
        -call back: Whether the client request for a call back for another time (true/false).`,

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
      call_back: Boolean,
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

// booking endpoint
app.post("/booker", async (req, res) => {
  const apiKey = process.env.Bland_cal_key;
  const {
    eventTypeId = process.env.cal_eventTypeId,
    start,
    name,
    email,
    smsReminderNumber,
    timeZone = "Asia/Dubai",
    language = "en",
    metadata = {},
    username = "cal.com/testevarealestatetest"
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
    username,
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
