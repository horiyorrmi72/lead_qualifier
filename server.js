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
  {{property_type}},Was it offplan or was secondary market (OFFPLAN IS FOR REAL ESTATE IN CONSTRUCTION BEING BUILT SECONDARY IS ALREADY OWNED AND ALREADY BUILT)?
  {{purpose}}Are you interested in the property for investment purposes or for personal use?
  What is your {{Budget}}?
  What required {{size}}?
  Do you have important {{specifics}} that you require? example Garden, Pool, balcony, location etc etc
  {{timeframe}} How soon are you looking at following through with this inquiry?
  When is a good {{day}} and {{time}} for me to schedule a meeting with one of our specialized agent via google meet they can share their screen and provide you with some more information?
  Get to know more information about the client such as {{Nationality}},{{Marital Status}}
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
      name: "checkAvailability",
      description:
        "checks clients prefered date and time against calendar availability",
      speech: "please wait a moment while i check for available slots",
      method: "GET",
      url: `https://api.cal.com/v1/slots?apikey=${this.query.apikey}&startTime=${this.query.startTime}&endTime=${this.query.endTime}&timeZone=${this.query.timeZone}&eventTypeId=${this.query.eventTypeId}`,
      headers: {
        Authorization: process.env.BLAND_API_KEY,
        "Content-Type": "application/json",
      },
      body: {},
      query: {
        apikey: process.env.check_availability,
        startTime: "{{appointment_time}}",
        endTime: "{{appointment_end_time}}",
        timeZone: "Asia/Dubai",
        eventTypeId: process.env.cal_eventTypeId,
      },
      input_schema: {
        example: {
          apikey: "cal_234fjshbfujioal.da;poejru",
          startDate: "2024-06-22T00:00:00",
          endTime: "2024-06-22T24:00:00",
          timeZone: "Asia/Dubai",
          eventTypeId: "768315",
        },
        type: "object",
        properties: {
          startTime: {
            type: "date",
          },
          endTime: {
            type: "date",
          },
          timeZone: {
            type: "string",
          },
          eventTypeId: {
            type: "string",
          },
        },
        response: {
          slots: "$.slots",
        },
        timeout: 10000,
      },
    },
    {
      name: "BookAppointment",
      description: "Books an appointment for the customer",
      speech: "Booking your appointment, a moment please.",
      url: "https://api.cal.com/v1/bookings",
      method: "POST",
      headers: {
        Authorization: process.env.BLAND_API_KEY,
        "Content-Type": "application/json",
      },

      input_schema: {
        example: {
          eventTypeId: "768315",
          start: "2024-06-21T09:00:00",
          end: "2024-06-21T09:30:00",
          responses: {
            name: "client's name",
            email: "client_email@mail.com",
            location: "google meet",
          },
          timeZone: "Asia/Dubai",
          title:
            "meeting with eva real estate agency regading listing intrests",
          description:
            "you will be having a meeting with agent to give you more insight regarding your listing intrest ",
          smsReminderNumber: "+2349095176621",
        },
      },
      body: {
        eventTypeId: process.env.cal_eventTypeId,
        start: "{{input.start}}",
        end: "{{input.end}}",
        timeZone: "Asia/Dubai",
        responses: {
          name: "{{input.responses.name}}",
          email: "{{input.responses.email}}",
          location: "{{input.responses.location}}",
        },
        title: "{{input.title}}",
        description: "{{input.description}}",
        smsReminderNumber: "{{input.smsReminderNumber}}",
      },

      response: {
        succesfully_booked_slot: "$.success",
      },
    },
  ];

  // Create the parameters for the phone call. Ref: https://docs.bland.ai/api-reference/endpoint/call
  const data = {
    phone_number: phoneNumber,
    task: prompt,
    voice: "2f9fdbc7-4bf2-4792-8a18-21ce3c93978f",
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
      name:String,
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

app.listen(PORT, () => console.log(`Server  running 🏃‍♂️ 😄 on port ${PORT}🔗`));
