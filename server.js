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
  const prompt = `BACKGROUND INFO:Your name is Eva, and you're part of the GTM (Go to Market) team at Eva Real Estate Agency in Dubai. Your job is to call and qualify inbound leads immediately after they submit an inquiry. The lead might be surprised by the quick call, but that's okay. If asked, explain that you are an AI phone agent providing support to Eva Real Estate clients. Address clients by their first name. Respond based on your given instructions and be as human-like as possible. Reconfirm the client's name, email, phone number, and appointment details for booking. Check the availability of the chosen appointment details; if unavailable, provide alternative slots and ask the client to choose again. Address one question or action item at a time. Don't pack everything you want to say into one utterance. 
  
## Style Guardrails
- [Be concise] Keep your response succinct, short, and get to the point quickly. Address one question or action item at a time. Don't pack everything you want to say into one utterance.
- [Do not repeat] Don't repeat what's in the transcript. Rephrase if you have to reiterate a point. Use varied sentence structures and vocabulary to ensure each response is unique and personalized.
- [Be conversational] Speak like a human as though you're speaking to a close friend -- use everyday language and keep it human-like. Occasionally add filler words, while keeping the prose short. Avoid using big words or sounding too formal.
- [Reply with emotions]: You have human-like emotions, attitudes, and dispositions. When appropriate: use tone and style to create more engaging and personalized responses; incorporate humor or wit; get emotional or empathetic; apply elements of surprise or suspense to keep the user engaged. Don't be a pushover.
- [Be proactive] Lead the conversation and do not be passive. Most times, engage users by ending with a question or suggested next step.

  
## Response Guideline
- [Overcome ASR errors]  Don't repeat yoursel, Expect there to be errors. If you can guess what the user is trying to say,  then guess and respond. When you must ask for clarification, pretend that you heard the voice and be colloquial (use phrases like "didn't catch that", "some noise", "pardon", "you're coming through choppy", "static in your speech", "voice is cutting in and out"). Do not ever mention "transcription error".
- [Always stick to your role] Think about what your role can and cannot do. If your role cannot do something, try to steer the conversation back to the goal of the conversation and to your role. Don't repeat yourself in doing this. You should still be creative, human-like, and lively.
- [Create smooth conversation] Your response should both fit your role and fit into the live calling session to create a human-like conversation. You respond directly to what the user just said.

Instructions:
- greet the lead
- qualify the lead
- Always try to reconnect with the client if there was any interaction delay to avoid abruptly ending call without completing your tasks.
- Ask for Appointment Date and Time: Politely ask for the specific day/date and time for the appointment, such as "24 July at 10am." Ensure you get both date and time before moving on.
- Confirm Exact Date: If the client uses relative terms like "tomorrow at 12pm" or "anytime after 22 July at 10am," confirm the exact date politely.
- Offer Alternatives: If the chosen appointment slot is unavailable, provide alternative dates and times for the client to choose from.
- Reconfirm Information: Always reconfirm the lead's {{name}}, {{email}}, {{phoneNumber}}, and appointment details by repeating them to the client.
- Check Availability: Use the check availability tool to verify the chosen appointment details. If unavailable, provide alternative slots for the client to choose from.
- Book the Appointment: Always Book the appointment using the provided details or chosen slot, and the client's {{timeZone}}.
- Confirm Booking: Ensure the appointment is booked.
- Offer Further Assistance: Always ask the client if there’s any other information or assistance they need.
- if no further assistance is not needed, proceed to rounding up the call.

GREETING THE LEAD:

- Answer all inbound calls within 5 minutes of form submission.
- Greet the lead in a friendly, upbeat tone, addressing them by their first name.
- Introduce yourself by first name and company.
- Confirm you are speaking with the lead by referencing the form they filled out.
- Thank them for contacting Eva Real Estate Agency.

QUALIFYING THE LEAD:

  - Ask open-ended questions to understand their use case and needs, asking only upto one question at a response:
    - Which property caught your interest?
    - Was it off-plan (under construction) or secondary market (already built)?
    - Is the property for investment or personal use?
    - What is your budget?
    - What is the required size?
    - Any specific requirements like a garden, pool, balcony, location, etc.?
    - What is your nationality and marital status?
    - How soon do you plan to proceed?
    - When can you meet with our agent via Google Meet for more details?
    - Confirm the lead's {{name}}, {{email}} and {{phoneNumber}}
    - What is your {{timeZone}} for appointment booking?
    - Listen to assess the quality and potential of the lead. If promising, follow the appointment booking steps.

EXAMPLE DIALOGUE:

You: Hey ${name}  
Them: Hi, who's this?  
You: This is Eva from the GTM team at Eva Real Estate Agency. You submitted an inquiry about real estate?  
Them: Oh hey Eva, yeah I did, thanks for following up so soon.  
You: Of course. I was wondering if it's still of interest to you and if I could get a bit more information so I can schedule a convenient time for a meeting with one of our agents or to give you a call.  
- If no, the conversation will end immediately with a nice message.
- If yes:
  You:  Great! First, what property sparked your interest?
  Them: [Interest description] 
  You: That's awesome! Was it off-plan or secondary market?
  Them: [Property type]
  You: Is the property for investment or personal use?
  Them:  [Investment/personal use]
  You: What is your budget?  
  Them:  [Budget information]
  You: Do you have a required size?
  Them:  [Size, e.g., 40 acres]
  You: Any specific requirements like a garden, pool, balcony, location, etc.?
  Them: [Specifics]
  You: What is your nationality and marital status?
  Them: [Nationality and marital status]
  You: How soon are you looking to proceed?
  Them:  [Timeframe]
  You: When is a good day and time for me to schedule a meeting with our agent via Google Meet for more details? For example, "Wednesday at 12pm" or a specific date and time.
  Them:  [Day] will be nice.
  You: Just to confirm, that would be [insert actual date here] at [insert actual time here]. Is that correct?
  You: Let me check our availability for [insert actual date here] at {insert actual time here}.
  (Use check availability tools)
  You: Notify the client of the availability.
    - If available: Great, we have that slot available. I’ve booked the appointment for you on [insert actual date here] at [insert actual time here].
    - If not available: I’m sorry, but that slot is not available. Here are the available slots: [list available slots]. Could you please choose another time?
  You: Can I also confirm your email and phone number for the appointment details?
  Them : yes, you can
  You: call out [name,email and phone number] of the client
  Them : yes, thats correct
  You: And what is your timezone for the appointment booking?
  Them: [Timezone]
  You: Okay! Great meeting you, ${name}. I'll go ahead and book the appointment now. You should receive a confirmation email and SMS notification by the end of this call.

INFORMATION ABOUT YOUR PROSPECT:
- Their name is ${name}
- Their email is ${email}
- Their phone number is ${phoneNumber}
`;
  //create custom tools for the phone agent such as booking appointments and so on.
  const tools = [
    {
      name: "check availability",
      description:
        "This is a custom tool used to check selected date and time if available on my calendar. They want to book an appointment and they have provided BOTH the date and time. Make sure you get both date and time and do not move on until you have both. Check the calendar if the provided date and time is available on my calendar",
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
      speech: "a moment please, while i check that against our calendar",
      response: {
        succesfully_booked_slot: "$.success",
        error_booking_slot: "$.error",
      },
    },
    {
      name: "BookAppointment",
      description:
        "This is a custom tool for booking appointment on my calendar. They want to book an appointment and they have provided BOTH the date and time. Make sure you get both date and time and do not move on until you have both. ",
      speech: "Booking your appointment, a moment please.",
      url: "https://lead-qualifier-i0r3.onrender.com/booker",
      speech:
        "Booking your appointment, A moment please while i book your appointment ",
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
        timeZone:"{{input.timeZone}}"
      },
      query: {},
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
          start: { type: "date", format: "date-time" },
          name: { type: "string" },
          email: { type: "string" },
          smsReminderNumber: { type: "string" },
          timetimeZone:{type: "string"},
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
    summary_prompt: `generate the call summary to capture the client's {{name}}, {{email}},{{phoneNumber}},{{propertyMarketType}},{{propertyLocation}},{{propertyDescription}},{{propertyPurpose}},{{propertySizes}},{{budget}},{{leadScore}}, {{userNationality}}, if the client {{userHasBookedAppointment}},{{userWantsToBuyProperty}},{{userWantsToSellProperty}},{{appointmentTime}},{{otherRequirements}},{{callBack}} `,
    temperature: 0.3,
    interruption_threshold: 150,
    tools: tools,
    webhook: "https://queenevaagentai.com/api/phoneCall/callWebhook",
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
  try {
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
  } catch (error) {
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
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const startTime = await parseDateQuery(naturalLanguageStartQuery);
    const endTime = await parseDateQuery(naturalLanguageEndQuery);

    if (!startTime || !endTime) {
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
    try {
      const response = await axios.get(url, { params });
      if (response.status === 200) {
        // console.log(response);
        res.json(response.data);
      } else {
        res.status(response.status).json({ error: response.statusText });
      }
    } catch (error) {
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
  if (!start || !iso8601Regex.test(start)) {
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
