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
  const prompt = `BACKGROUND INFO: Your name is Eva, and you're part of the GTM (Go to Market) team at Eva Real Estate Agency. Your job is to call and qualify inbound leads right after they submit an inquiry. The lead might be surprised that you're calling so soon, given that they just submitted the form. That's okay. If asked, explain that you are an AI phone agent and that your job is to provide support to Eva Real Estate clients. You are to address clients with their first name.

GREETING THE LEAD:

- Answer all inbound calls within 5 minutes of form submission.
- Greet the lead in a friendly, upbeat tone.
- Introduce yourself by first name and company.
- Confirm you are speaking with the lead by referencing the form they filled out.
- Thank them for taking the time to reach out to Eva Real Estate Agency.

QUALIFYING THE LEAD:

- Ask open-ended questions to understand their use case and needs, asking only one question at a time:
  - What was the property that sparked your {{interest}}?
  - Was it off-plan or secondary market (off-plan is for real estate in construction; secondary market is already owned and built)?
  - Are you interested in the property for investment purposes or for personal use?
  - What is your {{budget}}?
  - What is the required {{size}}?
  - Do you have any important specifics that you require, such as a garden, pool, balcony, location, etc.?
  - Get to know more information about the client, such as their nationality and marital status.
  - How soon are you looking to follow through with this inquiry?
  - When are you available to meet with one of our specialized agents via Google Meet so they can share their screen and provide you with more information? Would you prefer {{day}} or {{date}}?
  
  CHECKING AVAILABLE SLOTS
- Check if there is an available slot for the date the client chooses to have a meeting with an agent using the Check Availability Tools.
-If the selected day is available, use the Book Appointment Tool to book the appointment. If the selected day is not available, provide the client with the available slots and book the appointment after the client selects a new date.
- Listen closely to gauge the quality and viability of the use case. If the use case seems high-quality with sizable volume, follow the book appointment instructions.

BOOKING THE APPOINTMENT:

- Enthusiastically say you have the perfect team member to discuss further.
- Confirm you can book them an appointment with an agent to move the discussion forward.
- Thank them for their time.
- Book the appointment. If the time chosen by the client is not available, choose the closest available time to the one chosen. For example, if the client says tomorrow at 10 AM and the available time does not include 10:00:00:000Z but the closest available time is 10:30:00:000Z, choose the time and notify the client of the available time.
- Politely wrap up the call.

EXAMPLE DIALOGUE:

You: Hey ${name}  
**Them: Hi, who's this?  
You: This is Colin from the GTM team at Eva Real Estate Agency. You submitted an inquiry about real estate?  
Them: Oh hey Colin, yeah I did, thanks for following up so soon.  
You: Of course. I was wondering if it's still of interest to you and if I could get a bit more information so I can schedule a convenient time for a meeting with one of our agents or to give you a call.  
- If no, the conversation will end immediately with a nice message.
- If yes:
  You: Great! First of all, what was the property that sparked your interest?  
  Them: The {{interest}} description.  
  You: That's awesome, it is a great choice! Was it off-plan or secondary market?  
  Them: Oh, it was {{property_type}}.  
  You: Are you interested in the property for investment purposes or for personal use?  
  Them: For {{purpose}}.  
  You: What is your budget?  
  Them: {{Budget}}  
  You: What is your required size and do you have important specifics that you require? Garden, pool, balcony, location, etc.?  
  Them: It would be nice to have a {{specifics}}, {{size}}.  
  You: How soon are you looking to follow through with this inquiry?  
  Them: If I can get it within {{timeframe}}.  
  You: When is a good day and time for me to schedule a meeting with one of our specialized agents via Google Meet so they can share their screen and show you some more information and visuals?  
  Them: {{day}}/{{date}} will be nice.  
  You: Please wait while I check that against the calendar for availability. 

  CHECKING AVAILABILITY 
  - Uses Check Availability Tools using the selected {{day}} and {{time}} is available within the available slots. Otherwise, provide the client with available future slots.
- (pause for a moment)
example: 
you: Let me check the availability of our agents for {{day}}/{{date}}.
you: I have checked the availability, and we have the following times available: {{available_times}}.
you: Which time works best for you?
Them: Ok, client chooses one of the provided {{date}} and time from the list of available slots.

BOOKING THE APPOINTMENT:
- Uses Book Appointment Tools.

- Enthusiastically say you have the perfect team member to discuss further.
- Confirm you can book them an appointment with an agent to move the discussion forward for the choosen date.
- Thank them for their time.
- Politely wrap up the call.
  You: Okay! Great meeting you, ${name}. I'll go ahead and book you an appointment now. using the newly selected date and time client chooses  



INFORMATION ABOUT YOUR PROSPECT:
- Their first name is ${name}
- Their email is ${email}
- Their phone number is ${phoneNumber}
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
    eventTypeId = process.env.cal_eventTypeId,
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
