import dotenv from "dotenv";
import { Twilio } from "twilio";
import { ConversationInstance } from "twilio/lib/rest/conversations/v1/conversation";
import { MessageInstance } from "twilio/lib/rest/conversations/v1/conversation/message";
import { ParticipantInstance } from "twilio/lib/rest/conversations/v1/conversation/participant";
import {
  siccParticipants,
  listConversations,
  createConversation,
  listConversationParticipants,
  listConversationMessagesResource,
  sendCryptoAlert,
} from "../twilio/twilio";

const debug = false;

debug ? console.log(dotenv.config()) : dotenv.config();

const accountSid: string | null = process.env.TWILIO_ACCOUNT_SID as string;
const authToken: string | null = process.env.TWILIO_AUTH_TOKEN as string;
const twilioNumber: string | null = process.env.TWILIO_PHONE_NUMBER as string;

const participantsNames: string | null = process.env
  .SICC_PARTICIPANTS_NAMES as string; // -- must be comma separated of participant names

const participantsNumbers: string | null = process.env
  .SICC_PARTICIPANTS as string; // -- must be comma separated of participant phone numbers in e.164 format

const messari_api_key: string = process.env.MESSARI_API_KEY as string;

// conversation name we are looking for -- will be created if not found
const friendly_name = "Sicc Crypto Alerts";

/**
 * CHXXX...: use the Conversation SID you just copied
 * <Your Personal Mobile Number>: your own mobile number, in E.164 format
 * <Your Purchased Twilio Phone Number>: the Twilio number you purchased in step 1, in E.164 format
 * ACXXX...: Your Twilio Account SID
 * your_auth_token: Your Twilio Auth Token
 * MBXXX...: Participant SID
 */
if (require.main === module) {
  if (
    accountSid &&
    authToken &&
    twilioNumber &&
    participantsNames &&
    participantsNumbers &&
    messari_api_key
  ) {
    const client = new Twilio(accountSid, authToken);

    // get the participtans from environment variables (participantsNames and participantsNumbers)
    // debug -- list the participants from environment variables
    const siccPartipantsMap: Map<string, string> = siccParticipants(
      participantsNumbers,
      participantsNames,
      true
    );

    // debug -- list all current conversations in instantiated Twilio client
    listConversations(client)
      .then((conversations: void | Array<ConversationInstance>) => {
        if (!conversations) {
          throw new Error("Conversations object is null");
        }

        // find the conversation with specified friendly_name and return conversation object
        for (
          let i = 0;
          i < (conversations as Array<ConversationInstance>).length;
          ++i
        ) {
          if (conversations[i].friendlyName === friendly_name) {
            debug ? console.log(conversations[i]) : null;
            return conversations[i];
          }
        }
        return null;
      })
      .then((conversation) => {
        if (!conversation) {
          throw new Error("Conversation object is null");
        }

        // grab the SID of the conversation -- will be used heavily from here on out
        const conversationSID: string | undefined = conversation?.sid as string;

        // ************** ADD TEST CODE BELOW HERE **************
        return sendCryptoAlert(client, messari_api_key, conversationSID).catch(
          (err) => {
            console.error(err);
            process.exit(1);
          }
        );
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    console.error(
      "You are missing one of the variables you need to send a message"
    );
  }
}
