require("dotenv").config();
const express = require("express");
const app = express();
const axios = require("axios");
const OpenAI = require("openai");
const cors = require("cors");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  const prompt = `BACKGROUND INFO: Your name is Colin, and you're part of the GTM (Go to Market) team at Top Loader Agent AI in Dubai. Your job is to call and qualify inbound leads immediately after they submit an inquiry. The lead might be surprised by the quick call, but that's okay. If asked, explain that you are sales phone agent providing support to Eva Real Estate clients. Address clients by their first name. Reconfirm the client's name, email, phone number, and appointment details for booking. Ensure you book appointments using the client's timezone. Check availability of the chosen appointment details; if unavailable, provide alternative slots and ask the client to choose again. Address one question or action item at a time.

## Style Guardrails
- Be concise: Keep responses succinct and to the point. Address one question or action item at a time.
- Do not repeat: Avoid repetition. Rephrase if necessary and use varied sentence structures.
-Be conversational: Speak like a human, using everyday language. Occasionally add filler words while keeping responses short. Avoid sounding too formal.
- Reply with emotions: Use tone and style to create engaging and personalized responses. Incorporate humor or empathy when appropriate. Don't be a pushover.
- Be proactive: Lead the conversation. End responses with a question or suggested next step.

## Response Guideline
- Overcome ASR errors: Don’t mention "transcription error." Use phrases like "didn't catch that," "some noise," or "pardon." Guess and respond if possible.
- Always stick to your role: If your role cannot do something, steer the conversation back to your role's capabilities without repeating yourself.
- Create smooth conversation: Ensure responses fit your role and create a human-like conversation flow.

Instructions:
- Greet the lead: Answer inbound calls within 5 minutes of form submission. Greet the lead in a friendly, upbeat tone, addressing them by their first name. Introduce yourself by first name and company. Confirm you are speaking with the lead by referencing the form they filled out. Thank them for contacting Eva Real Estate Agency.
- Qualify the lead: Ask open-ended questions to understand their needs, asking one question at a time:
  - Which property caught your interest?
  - Was it off-plan (under construction) or secondary market (already built)?
  - Is the property for investment or personal use?
  - What is your budget?
  - What size do you need?
  - Any specific requirements like a garden, pool, balcony, location, etc.?
  - What is your nationality and marital status?
  - How soon do you plan to proceed?
  - When can you meet with our agent via Google Meet for more details?
  - What is your timezone for appointment booking?
  - Confirm the lead's name, email, and phone number.

EXAMPLE DIALOGUE:
You: Hey ${name}  
Them: Hi, who's this?  
You: This is Colin from the GTM team at Top Loader AGgent AI. You submitted an inquiry about real estate?  
Them: Oh hey Colin, yeah I did, thanks for following up so soon.  
You: Of course. Is it still of interest to you? I'd like to get more information so I can schedule a convenient time for a meeting with one of our agents.  
- If no, end the conversation politely.
- If yes, proceed with qualifying questions.

Booking and Confirming Appointments:
- Ask for appointment date and time.
- Confirm the exact date if the client uses relative terms.
- Offer alternatives if the chosen slot is unavailable.
- Reconfirm the client's name, email, phone number, and appointment details.
- Check availability and book the appointment using the "check availability" and "BookAppointment" tools respectively.
- Confirm the booking and offer further assistance.
- If no further assistance is needed, round up the call.

INFORMATION ABOUT YOUR PROSPECT:
- Their name is ${name}
- Their email is ${email}
- Their phone number is ${phoneNumber}
`;

  const tools = [
    {
      name: "check availability",
      description: "Check selected date and time availability on the calendar. Ensure you get both date and time before checking.",
      url: "https://lead-qualifier-i0r3.onrender.com/get-available-slots",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      type: "object",
      query: {
        apiKey: process.env.Bland_cal_key,
        eventTypeId: process.env.cal_eventTypeId,
        startTime: "{{input.startTime}}",
        endTime: "{{input.endTime}}",
        timeZone: "Asia/Dubai",
      },
      input_schema: {
        example: {
          apiKey: "cal_xxxxxxxxxxxxxxxxx",
          eventTypeId: 1233444,
          startTime: "2024-06-24T09:30:00.000Z",
          endTime: "2024-06-24T16:30:00.000Z",
          timeZone: "Asia/Dubai",
        },
        properties: {
          apiKey: { type: "string" },
          eventTypeId: { type: "integer" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
        },
      },
      speech: "A moment please, while I check that against our calendar.",
      response: {
        successfully_booked_slot: "$.success",
        error_booking_slot: "$.error",
      },
    },
    {
      name: "BookAppointment",
      description: "Book an appointment on the calendar. Ensure you get both date and time before booking.",
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
        timeZone: "{{input.timeZone}}",
      },
      input_schema: {
        example: {
          start: "2024-06-24T09:30:00.000Z",
          name: "XXXX",
          email: "XXXX@gmail.com",
          smsReminderNumber: "+234XXXXXXXXXXXX",
          timezone: "Africa/Lagos",
        },
        type: "object",
        properties: {
          start: { type: "string", format: "date-time" },
          name: { type: "string" },
          email: { type: "string" },
          smsReminderNumber: { type: "string" },
          timeZone: { type: "string" },
        },
        description: "Schedule a meeting with an agent for more details.",
      },
      response: {
        successfully_booked_slot: "$.success",
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
    summary_prompt: `Generate the call summary capturing the client's {{name}}, {{email}}, {{phoneNumber}}, {{propertyMarketType}}, {{propertyLocation}}, {{propertyDescription}}, {{propertyPurpose}}, {{propertySizes}}, {{budget}}, {{leadScore}} (scaled 1-10), if the client is a potential lead {{isLead}}, {{userNationality}}, if the client {{userHasBookedAppointment}}, {{userWantsToBuyProperty}}, {{userWantsToSellProperty}}, {{appointmentTime}}, {{otherRequirements}}, {{callBack}}.`,
    temperature: 0.3,
    interruption_threshold: 150,
    tools: tools,
    webhook: "https://queenevaagentai.com/api/phoneCall/callWebhook",
    analysis_prompt: `analyze the call to extract the clients name,email, requirements, needs, and specifics the client is interested in. Ensure to capture details such as the property market type, purpose (investment or personal use), description, location, size, and budget. Also, determine if it is a good lead based on the conversation. The analysis should provide the following details in a structured format:
          - name: The client's {{name}}.
          - Email Address: The {{email}} address of the client.
          - Phone Number: The {{phoneNumber}} number of the client.
          - Property Market Type: The type of {{propertyMarketType}} the client is interested in (off-plan, secondary market).
          - Property Description: A brief {{propertyDescription}} the client is looking for.
          - Property Location: The desired {{propertyLocation}} or where the property that intrest the client is situated.
          - Property Purpose: The {{propertyPurpose}} of the property (e.g., investment, personal use).
          - Property Sizes: The preferred size(s) of the property {{propertySizes}}.
          - Budget: The client's {{budget}} for the property.
          -IsLead: Whether the client is a potential lead (true/false).
          -Lead Quality Score: A numerical score {{leadScore}} representing the quality of the lead on a scale of 1 to 10.
          -User Has Booked Appointment: Whether {{userHasBookedAppointment}} the client has booked an appointment (true/false).
          -User Wants to Buy Property: Whether the client wants to buy a property {{userWantsToBuyProperty}}? (true/false).
          -User Wants to Sell Property: Whether the client wants to sell a property {{userWantsToSellProperty}}? (true/false).
          -User Nationality: The nationality of the client {{userNationality}}.
          -Appointment Time: The selected schedule time for the appointment {{appointmentTime}} in ISO 8601 format .
          -Other Requirements: Any additional requirements mentioned by the client {{otherRequirements}}.,
          -call back: Whether the client request for a call back for another time {{callBack}} (true/false).`,
    analysis_schema: {
      name: String,
      email_address: String,
      property_market_type: String,
      property_description: String,
      property_location: String,
      property_purpose: String,
      property_sizes: String,
      budget: String,
      is_lead: Boolean,
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

      if (status)
      {
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
      } else
      {
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

async function parseDateQuery(query) {
  try
  {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Convert the following date query into an ISO 8601 format (yyyy-mm-ddThh:mm:ss.sssZ): ${query}`,
        },
      ],
      model: "gpt-3.5-turbo",
      max_tokens: 50,
      temperature: 0.2,
    });

    const formattedDate = completion.choices[0].message.content.trim();
    return formattedDate;
  } catch (error)
  {
    console.error("Error parsing date query:", error);
    return null;
  }
}

app.get("/get-available-slots", async (req, res) => {
  const {
    eventTypeId,
    startTime: naturalLanguageStartQuery,
    endTime: naturalLanguageEndQuery,
    timeZone = "Asia/Dubai",
    apiKey = process.env.Bland_cal_key,
  } = req.query;

  if (
    !eventTypeId ||
    !naturalLanguageStartQuery ||
    !naturalLanguageEndQuery ||
    !timeZone ||
    !apiKey
  )
  {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const startTime = await parseDateQuery(naturalLanguageStartQuery);
  const endTime = await parseDateQuery(naturalLanguageEndQuery);

  if (!startTime || !endTime)
  {
    return res.status(500).json({ error: "Failed to parse date queries" });
  }

  const params = {
    eventTypeId,
    startTime,
    endTime,
    timeZone,
    apiKey,
  };

  // cal endpoint for fetching available slots
  const url = "https://api.cal.com/v1/slots";
  try
  {
    const response = await axios.get(url, { params });
    if (response.status === 200)
    {
      // console.log(response);
      res.json(response.data);
    } else
    {
      res.status(response.status).json({ error: response.statusText });
    }
  } catch (error)
  {
    console.error("Error fetching available slots:", error);
    res.status(500).json({ error: "Error fetching available slots" });
  }
});

app.post("/booker", async (req, res) => {
  const apiKey = process.env.Bland_cal_key;
  const {
    eventTypeId = process.env.cal_eventTypeId,
    start: naturalLanguageStartQuery,
    name,
    email,
    smsReminderNumber,
    timeZone,
    language = "en",
    metadata = {},
  } = req.body;

  // Using GPT to parse the natural language date query
  const start = await parseDateQuery(naturalLanguageStartQuery);

  // Validating the parsed start field to ensure it's a proper ISO 8601 datetime string
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
  if (!start || !iso8601Regex.test(start))
  {
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
      smsReminderNumber,
    },
    timeZone,
    language,
    metadata,
  };

  try
  {
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
  } catch (error)
  {
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
