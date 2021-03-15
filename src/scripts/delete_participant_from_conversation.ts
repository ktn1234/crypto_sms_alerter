import dotenv from "dotenv";
import { Twilio } from "twilio";
import { ConversationInstance } from "twilio/lib/rest/conversations/v1/conversation";
import {
  siccParticipants,
  listConversations,
  removeParticipantFromConversation,
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

// conversation name we are looking for
const friendly_name = "Sicc Crypto Alerts";

/**
 * LIST THE PHONE NUMBERS TO REMOVE FROM HERE THAT ARE IN THE CONVERSATION
 */
const phoneNumbersToRemove: Array<string> = participantsNumbers.split(
  ","
) as Array<string>;

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

    // list the participants from environment variables
    const siccPartipantsMap: Map<string, string> = siccParticipants(
      participantsNumbers,
      participantsNames,
      true
    );

    listConversations(client)
      .then((conversations: void | Array<ConversationInstance>) => {
        if (!conversations) {
          throw new Error("Conversations object is null");
        }

        for (
          let i = 0;
          i < (conversations as Array<ConversationInstance>).length;
          ++i
        ) {
          if (conversations[i].friendlyName === friendly_name) {
            console.log(conversations[i]);
            return conversations[i];
          }
        }
        return null;
      })
      .then((conversation) => {
        if (!conversation) {
          throw new Error("Conversation object is null");
        }

        const conversationSID: string | undefined = conversation?.sid as string;

        // delete all the participants correlated with a phonenumber from the phoneNumbersToRemove array defined at the top
        const promises: Array<Promise<any>> = new Array<Promise<any>>();
        for (let i = 0; i < phoneNumbersToRemove.length; ++i) {
          promises.push(
            removeParticipantFromConversation(
              client,
              conversationSID,
              phoneNumbersToRemove[i]
            ).catch((err) => {
              console.error(err);
              process.exit(1);
            })
          );
        }

        return Promise.all(promises);
      })
      .then((_: Array<any>) => {
        console.log(
          "Participants have been deleted from the conversaion and the list updated."
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
